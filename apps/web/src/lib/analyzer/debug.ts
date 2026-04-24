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
import { AsyncLocalStorage } from "node:async_hooks";

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

// Agent debug logging - only runs on local development machine
const IS_LOCAL_DEV = process.env.NODE_ENV === "development" &&
  (process.env.HOSTNAME === "localhost" || !process.env.VERCEL);

type DebugLogContext = {
  prefix: string;
};

const debugLogContextStorage = new AsyncLocalStorage<DebugLogContext>();

const WRAPPED_CONSOLE_MARKER = Symbol.for("factharbor.debug.consoleWrapped");
const WRAPPED_CONSOLE_METHODS = ["log", "info", "warn", "error"] as const;

function getCurrentDebugLogPrefix(): string {
  return debugLogContextStorage.getStore()?.prefix ?? "";
}

export function __internalGetCurrentDebugLogPrefix(): string {
  return getCurrentDebugLogPrefix();
}

export function __internalPrefixDebugMessage(message: string, prefix: string): string {
  if (!prefix) return message;
  return message
    .split(/\r?\n/)
    .map((line) => `${prefix} ${line}`)
    .join("\n");
}

function prefixConsoleArgs(args: unknown[], prefix: string): unknown[] {
  if (!prefix || args.length === 0) {
    return args;
  }

  const [first, ...rest] = args;
  if (typeof first === "string") {
    return [__internalPrefixDebugMessage(first, prefix), ...rest];
  }

  return [prefix, ...args];
}

function ensureConsoleWrapped(): void {
  const consoleWithMarker = console as Console & { [WRAPPED_CONSOLE_MARKER]?: boolean };
  if (consoleWithMarker[WRAPPED_CONSOLE_MARKER]) {
    return;
  }

  for (const method of WRAPPED_CONSOLE_METHODS) {
    const original = console[method].bind(console);
    console[method] = ((...args: unknown[]) => {
      const prefix = getCurrentDebugLogPrefix();
      original(...prefixConsoleArgs(args, prefix));
    }) as typeof console[typeof method];
  }

  consoleWithMarker[WRAPPED_CONSOLE_MARKER] = true;
}

export async function runWithDebugLogContext<T>(
  prefix: string,
  fn: () => Promise<T>,
): Promise<T> {
  ensureConsoleWrapped();
  return debugLogContextStorage.run({ prefix }, fn);
}

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
  const prefix = getCurrentDebugLogPrefix();
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

  const formattedLogLine = prefix ? __internalPrefixDebugMessage(logLine, prefix) : logLine;

  // Write to file (append) - async to avoid blocking the Node event loop during long analyses
  if (DEBUG_LOG_FILE_ENABLED) {
    fs.promises.appendFile(DEBUG_LOG_PATH, formattedLogLine).catch(() => {
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
