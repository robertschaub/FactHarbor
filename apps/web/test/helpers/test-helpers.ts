/**
 * Shared Test Helpers for Analyzer Tests
 *
 * This file contains utility functions used across multiple test files
 * to avoid code duplication and improve maintainability.
 *
 * @module analyzer/test-helpers
 */

import * as fs from "fs";

/**
 * Load environment variables from a .env file.
 * Only sets variables that are not already defined in process.env.
 *
 * @param filePath - Path to the .env file
 */
export function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}
