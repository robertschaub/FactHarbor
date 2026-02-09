/**
 * Error Classification
 *
 * Classifies pipeline errors to determine if they represent provider-level
 * failures (search/LLM outages, quota exhaustion) vs. input issues or timeouts.
 *
 * @module error-classification
 */

import type { ProviderType } from "./provider-health";
import { SearchProviderError } from "./web-search";

export type ErrorCategory = "provider_outage" | "rate_limit" | "input_error" | "timeout" | "unknown";

export type ClassifiedError = {
  category: ErrorCategory;
  provider: ProviderType | null;
  message: string;
  retriable: boolean;
  shouldCountAsProviderFailure: boolean;
};

/** Patterns indicating LLM provider rate limiting or outage */
const LLM_RATE_LIMIT_PATTERNS = [
  /status\s*(?:code\s*)?429/i,
  /status\s*(?:code\s*)?529/i,
  /status\s*(?:code\s*)?503/i,
  /rate\s*limit/i,
  /too\s*many\s*requests/i,
  /overloaded/i,
  /capacity/i,
  /quota/i,
];

const LLM_AUTH_PATTERNS = [
  /api\s*key/i,
  /authentication/i,
  /unauthorized/i,
  /invalid.*key/i,
  /status\s*(?:code\s*)?401/i,
  /status\s*(?:code\s*)?403/i,
];

const TIMEOUT_PATTERNS = [
  /timeout/i,
  /timed?\s*out/i,
  /AbortError/i,
  /ETIMEDOUT/i,
  /ECONNRESET/i,
];

/**
 * Classify an error to determine its category and whether it should
 * count against provider health.
 */
export function classifyError(error: unknown): ClassifiedError {
  // SearchProviderError — already classified by the search layer
  if (error instanceof SearchProviderError) {
    return {
      category: error.status === 429 ? "rate_limit" : "provider_outage",
      provider: "search",
      message: error.message,
      retriable: false,
      shouldCountAsProviderFailure: error.fatal,
    };
  }

  // Also handle SearchProviderError by shape (cross-module safety)
  if (isSearchProviderErrorShape(error)) {
    const e = error as any;
    return {
      category: e.status === 429 ? "rate_limit" : "provider_outage",
      provider: "search",
      message: e.message || String(error),
      retriable: false,
      shouldCountAsProviderFailure: e.fatal === true,
    };
  }

  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  // Timeout errors — not a provider failure
  if (name === "TimeoutError" || name === "AbortError" || TIMEOUT_PATTERNS.some((p) => p.test(msg))) {
    return {
      category: "timeout",
      provider: null,
      message: msg,
      retriable: true,
      shouldCountAsProviderFailure: false,
    };
  }

  // LLM auth errors — provider outage (misconfiguration)
  if (LLM_AUTH_PATTERNS.some((p) => p.test(msg))) {
    return {
      category: "provider_outage",
      provider: "llm",
      message: msg,
      retriable: false,
      shouldCountAsProviderFailure: true,
    };
  }

  // LLM rate limit / capacity errors
  if (LLM_RATE_LIMIT_PATTERNS.some((p) => p.test(msg))) {
    return {
      category: "rate_limit",
      provider: "llm",
      message: msg,
      retriable: true,
      shouldCountAsProviderFailure: true,
    };
  }

  // Check for status code on error object (AI SDK pattern)
  const statusCode = (error as any)?.status ?? (error as any)?.statusCode;
  if (typeof statusCode === "number") {
    if (statusCode === 429 || statusCode === 529 || statusCode === 503) {
      return {
        category: "rate_limit",
        provider: "llm",
        message: msg,
        retriable: true,
        shouldCountAsProviderFailure: true,
      };
    }
    if (statusCode === 401 || statusCode === 403) {
      return {
        category: "provider_outage",
        provider: "llm",
        message: msg,
        retriable: false,
        shouldCountAsProviderFailure: true,
      };
    }
  }

  // Unknown / unclassified
  return {
    category: "unknown",
    provider: null,
    message: msg,
    retriable: false,
    shouldCountAsProviderFailure: false,
  };
}

/** Shape-check for SearchProviderError across module boundaries */
function isSearchProviderErrorShape(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as any;
  return (
    e.name === "SearchProviderError" &&
    typeof e.provider === "string" &&
    typeof e.fatal === "boolean"
  );
}
