/**
 * Shared utilities for search provider implementations.
 *
 * Keep this module narrow and obvious. Each helper does one thing.
 * Provider-specific behavior (response parsing, request construction,
 * date restriction mapping, result mapping) stays in the provider file.
 *
 * Created during WS-4 (search provider clone consolidation).
 */

import { WebSearchResult, SearchProviderError } from "./web-search";

/**
 * Validate that an API key env var is set and not a placeholder.
 * Returns the key if valid, null if missing or placeholder.
 *
 * Provider-specific behavior:
 * - Serper: pass { throwOnPlaceholder: true } (throws instead of returning null)
 * - Wikipedia: no API key needed — don't call this
 * - Semantic Scholar: key is optional — use warnIfMissingApiKey instead
 */
export function requireApiKey(
  providerName: string,
  envVarName: string,
  options?: { throwOnPlaceholder?: boolean },
): string | null {
  const key = process.env[envVarName];

  if (!key) {
    console.error(`[Search] ${providerName}: ❌ No API key configured (${envVarName} not set)`);
    return null;
  }

  if (key.includes("PASTE")) {
    if (options?.throwOnPlaceholder) {
      const message = `${providerName} API key contains placeholder text; configure a real ${envVarName} value`;
      console.error(`[Search] ${providerName}: ❌ ${message}`);
      throw new SearchProviderError(providerName, undefined, true, message);
    }
    console.error(`[Search] ${providerName}: ❌ API key contains placeholder text - please configure real value`);
    return null;
  }

  console.log(`[Search] ${providerName}: API key configured`);
  return key;
}

/**
 * Warn (don't fail) if an API key is missing.
 * For providers with optional keys (Semantic Scholar).
 */
export function warnIfMissingApiKey(providerName: string, envVarName: string): string | null {
  const key = process.env[envVarName];
  if (!key || key.includes("PASTE")) {
    console.warn(`[Search] ${providerName}: ⚠️ API key not configured. Using shared rate pool (may fail with 429).`);
    return null;
  }
  console.log(`[Search] ${providerName}: API key configured`);
  return key;
}

/**
 * Extract error body text from a failed HTTP response and log it.
 * Returns the body string (empty string if extraction fails).
 */
export async function extractErrorBody(providerName: string, response: Response): Promise<string> {
  let errorBody = "";
  try {
    errorBody = await response.text();
    console.error(`[Search] ${providerName}: Error response body:`, errorBody.substring(0, 500));
  } catch {
    // Ignore parse errors
  }
  return errorBody;
}

/**
 * Throw SearchProviderError if the HTTP status or error body indicates a quota/rate-limit failure.
 * Call after extractErrorBody.
 *
 * Always throws for 429 and 403. Additionally checks for provider-specific quota keywords
 * in the error body (case-insensitive).
 *
 * Does NOT handle provider-specific patterns (Serper 5xx, Wikipedia 5xx, FactCheck 400).
 * Those stay inline in the provider.
 */
export function classifyHttpError(
  providerName: string,
  status: number,
  errorBody: string,
  quotaKeywords?: string[],
): void {
  if (status === 429 || status === 403) {
    throw new SearchProviderError(
      providerName,
      status,
      true,
      `${providerName} HTTP ${status}: ${errorBody.substring(0, 200) || "rate limited"}`,
    );
  }
  if (quotaKeywords && quotaKeywords.length > 0) {
    const lower = errorBody.toLowerCase();
    if (quotaKeywords.some((kw) => lower.includes(kw))) {
      throw new SearchProviderError(
        providerName,
        status,
        true,
        `${providerName} HTTP ${status}: ${errorBody.substring(0, 200)}`,
      );
    }
  }
}

/**
 * Standard catch handler for search provider fetch errors.
 * Re-throws SearchProviderError (so callers can detect fatal provider failures).
 * Logs other errors and returns [].
 */
export function handleFetchError(
  providerName: string,
  timeoutMs: number,
  error: unknown,
): WebSearchResult[] {
  if (error instanceof SearchProviderError) {
    throw error;
  }
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(`[Search] ${providerName}: ❌ Fetch failed: ${errorMsg}`);
  if (error instanceof Error && error.name === "TimeoutError") {
    console.error(`[Search] ${providerName}: Request timed out after ${timeoutMs}ms`);
  }
  return [];
}
