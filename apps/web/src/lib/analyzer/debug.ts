/**
 * Debug logging utilities for FactHarbor Analyzer
 * 
 * Provides file-based and console logging for debugging analysis runs.
 * Can be configured via environment variables.
 * 
 * @module analyzer/debug
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

const WEB_PACKAGE_NAME = "@factharbor/web";

function readPackageName(packageJsonPath: string): string | null {
  try {
    if (!fs.existsSync(packageJsonPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
      name?: unknown;
    };
    return typeof parsed.name === "string" ? parsed.name : null;
  } catch {
    return null;
  }
}

function isWebRoot(dir: string): boolean {
  return readPackageName(path.join(dir, "package.json")) === WEB_PACKAGE_NAME;
}

function findWebRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (isWebRoot(dir)) return dir;

    const nestedWebRoot = path.join(dir, "apps", "web");
    if (isWebRoot(nestedWebRoot)) return nestedWebRoot;

    const parent = path.dirname(dir);
    if (!parent || parent === dir) break;
    dir = parent;
  }
  return startDir;
}

// Exposed for unit tests (no production usage).
export function __internalFindWebRoot(startDir: string): string {
  return findWebRoot(startDir);
}

// Write debug log to a stable location that's easy to find (web-workspace relative).
// Additive override: FH_DEBUG_LOG_PATH can point elsewhere (e.g., custom paths).
const DEBUG_LOG_PATH =
  process.env.FH_DEBUG_LOG_PATH ||
  path.join(findWebRoot(process.cwd()), "debug-analyzer.log");

const DEBUG_LOG_FILE_ENABLED =
  (process.env.FH_DEBUG_LOG_FILE ?? "true").toLowerCase() === "true";

const DEBUG_LOG_CLEAR_ON_START =
  (process.env.FH_DEBUG_LOG_CLEAR_ON_START ?? "false").toLowerCase() === "true";

const DEBUG_LOG_MAX_DATA_CHARS = 8000;

// Rotate when the active file exceeds this size; keep N rolled backups.
// Default cap: 50 MB × (1 active + 2 backups) = ~150 MB total disk footprint.
const DEBUG_LOG_MAX_SIZE_BYTES =
  Number(process.env.FH_DEBUG_LOG_MAX_SIZE_BYTES) || 50 * 1024 * 1024;
const DEBUG_LOG_BACKUP_COUNT =
  Number(process.env.FH_DEBUG_LOG_BACKUP_COUNT) || 2;
const ROTATE_CHECK_INTERVAL_MS = 5_000;

let rotationInFlight = false;
let lastRotateCheck = 0;

async function rotateIfNeeded(): Promise<void> {
  if (rotationInFlight) return;
  const now = Date.now();
  if (now - lastRotateCheck < ROTATE_CHECK_INTERVAL_MS) return;
  lastRotateCheck = now;

  let size: number;
  try {
    size = (await fs.promises.stat(DEBUG_LOG_PATH)).size;
  } catch {
    return;
  }
  if (size < DEBUG_LOG_MAX_SIZE_BYTES) return;

  rotationInFlight = true;
  try {
    for (let i = DEBUG_LOG_BACKUP_COUNT; i >= 1; i--) {
      const src = i === 1 ? DEBUG_LOG_PATH : `${DEBUG_LOG_PATH}.${i - 1}`;
      const dst = `${DEBUG_LOG_PATH}.${i}`;
      if (i === DEBUG_LOG_BACKUP_COUNT) {
        try { await fs.promises.unlink(dst); } catch {}
      }
      try { await fs.promises.rename(src, dst); } catch {}
    }
  } finally {
    rotationInFlight = false;
  }
}

// Agent debug logging - only runs on local development machine
const IS_LOCAL_DEV = process.env.NODE_ENV === "development" &&
  (process.env.HOSTNAME === "localhost" || !process.env.VERCEL);

// ============================================================================
// DEBUG LOGGING FUNCTIONS
// ============================================================================

/**
 * Shared debug log writer.
 */
function writeDebugLog(
  message: string,
  data: any,
  options: { emitToConsole: boolean },
): void {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] ${message}`;
  
  if (data !== undefined) {
    let payload: string;
    try {
      payload =
        typeof data === "string"
          ? data
          : JSON.stringify(data, null, 2);
    } catch {
      payload = "[unserializable]";
    }
    if (payload.length > DEBUG_LOG_MAX_DATA_CHARS) {
      payload = payload.slice(0, DEBUG_LOG_MAX_DATA_CHARS) + "…[truncated]";
    }
    logLine += ` | ${payload}`;
  }
  logLine += "\n";

  // Write to file (append) - async to avoid blocking the Node event loop during long analyses
  if (DEBUG_LOG_FILE_ENABLED) {
    rotateIfNeeded()
      .then(() => fs.promises.appendFile(DEBUG_LOG_PATH, logLine))
      .catch(() => {
        // Silently ignore file write errors
      });
  }

  if (options.emitToConsole) {
    console.log(logLine.trim());
  }
}

/**
 * Log a message to the debug file and console.
 */
export function debugLog(message: string, data?: any): void {
  writeDebugLog(message, data, { emitToConsole: true });
}

/**
 * Log a message to the debug file only.
 */
export function debugLogFileOnly(message: string, data?: any): void {
  writeDebugLog(message, data, { emitToConsole: false });
}

/**
 * Clear the debug log file at startup
 */
export function clearDebugLog(): void {
  if (!DEBUG_LOG_FILE_ENABLED) return;
  if (!DEBUG_LOG_CLEAR_ON_START) return;
  
  fs.promises
    .writeFile(
      DEBUG_LOG_PATH,
      `=== FactHarbor Debug Log Started at ${new Date().toISOString()} ===\n`,
    )
    .catch(() => {
      // Silently ignore
    });
}

/**
 * Agent debug logging - sends logs to external debug server
 * Only runs on local development machine
 */
export function agentLog(location: string, message: string, data: any, hypothesisId: string): void {
  if (!IS_LOCAL_DEV) return;
  
  fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId
    })
  }).catch(() => {});
}
