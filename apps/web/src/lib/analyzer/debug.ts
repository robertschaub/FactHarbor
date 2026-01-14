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

function findRepoRoot(startDir: string): string {
  // We want a stable repo-root-relative debug log path regardless of the runtime CWD.
  // In local dev, the Next.js dev server often runs with CWD=apps/web, while scripts/tests
  // may run with CWD=repo root. Using process.cwd() directly can accidentally point to
  // "apps/web/apps/web/debug-analyzer.log" and silently drop logs.
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    try {
      const hasAgents = fs.existsSync(path.join(dir, "AGENTS.md"));
      const hasSln = fs.existsSync(path.join(dir, "FactHarbor.sln"));
      // Use repo-root-specific markers (package.json exists in workspaces too).
      if (hasAgents || hasSln) return dir;
    } catch {
      // ignore
    }
    const parent = path.dirname(dir);
    if (!parent || parent === dir) break;
    dir = parent;
  }
  return startDir;
}

// Exposed for unit tests (no production usage).
export function __internalFindRepoRoot(startDir: string): string {
  return findRepoRoot(startDir);
}

// Write debug log to a stable location that's easy to find (repo-root relative).
// Additive override: FH_DEBUG_LOG_PATH can point elsewhere (e.g., custom paths).
const DEBUG_LOG_PATH =
  process.env.FH_DEBUG_LOG_PATH ||
  path.join(findRepoRoot(process.cwd()), "apps", "web", "debug-analyzer.log");

const DEBUG_LOG_FILE_ENABLED =
  (process.env.FH_DEBUG_LOG_FILE ?? "true").toLowerCase() === "true";

const DEBUG_LOG_CLEAR_ON_START =
  (process.env.FH_DEBUG_LOG_CLEAR_ON_START ?? "false").toLowerCase() === "true";

const DEBUG_LOG_MAX_DATA_CHARS = 8000;

// Agent debug logging - only runs on local development machine
const IS_LOCAL_DEV = process.env.NODE_ENV === "development" &&
  (process.env.HOSTNAME === "localhost" || !process.env.VERCEL);

// ============================================================================
// DEBUG LOGGING FUNCTIONS
// ============================================================================

/**
 * Log a message to the debug file and console
 */
export function debugLog(message: string, data?: any): void {
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
    fs.promises.appendFile(DEBUG_LOG_PATH, logLine).catch(() => {
      // Silently ignore file write errors
    });
  }

  // Also log to console
  console.log(logLine.trim());
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
