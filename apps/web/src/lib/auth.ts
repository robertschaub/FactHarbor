/**
 * Shared authentication utilities for Next.js API routes.
 *
 * Provides:
 * - getEnv: Safe environment variable reading
 * - secureCompare: Timing-safe string comparison
 * - checkAdminKey: Admin authentication check
 * - checkRunnerKey: Internal runner authentication check
 */

import { timingSafeEqual } from "node:crypto";

/**
 * Safely reads an environment variable, returning empty string if missing or whitespace-only.
 */
export function getEnv(name: string): string {
  const v = process.env[name];
  return v && v.trim() ? v : "";
}

/**
 * Timing-safe string comparison using crypto.timingSafeEqual.
 * Prevents timing attacks on secret comparison.
 *
 * Extracted from apps/web/src/app/api/fh/system-health/route.ts lines 15-26.
 */
export function secureCompare(expected: string, provided: string | null): boolean {
  if (provided === null) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  const maxLength = Math.max(expectedBuffer.length, providedBuffer.length);
  const expectedPadded = Buffer.alloc(maxLength);
  const providedPadded = Buffer.alloc(maxLength);
  expectedBuffer.copy(expectedPadded);
  providedBuffer.copy(providedPadded);
  const matched = timingSafeEqual(expectedPadded, providedPadded);
  return matched && expectedBuffer.length === providedBuffer.length;
}

/**
 * Checks admin authentication via x-admin-key header.
 *
 * In dev mode (no key set + NODE_ENV !== production): returns true
 * In production with no key: returns false
 * Otherwise: performs timing-safe comparison
 */
export function checkAdminKey(req: Request): boolean {
  const expectedKey = getEnv("FH_ADMIN_KEY");
  if (!expectedKey) {
    // Allow in development without key
    return process.env.NODE_ENV !== "production";
  }
  const got = req.headers.get("x-admin-key");
  return secureCompare(expectedKey, got);
}

/**
 * Checks runner authentication via x-runner-key header.
 *
 * In dev mode (no key set + NODE_ENV !== production): returns true
 * In production with no key: returns false
 * Otherwise: performs timing-safe comparison
 */
export function checkRunnerKey(req: Request): boolean {
  const expectedKey = getEnv("FH_INTERNAL_RUNNER_KEY");
  if (!expectedKey) {
    // In dev mode (no key), allow. In production, deny.
    return process.env.NODE_ENV !== "production";
  }
  const got = req.headers.get("x-runner-key");
  return secureCompare(expectedKey, got);
}
