/**
 * FactHarbor Analyzer - Configuration
 *
 * This module contains all configuration constants and helpers.
 *
 * @module analyzer/config
 */

import * as fs from "fs";

// ============================================================================
// DEBUG LOGGING
// ============================================================================

const DEBUG_LOG_PATH = "c:\\DEV\\FactHarbor\\apps\\web\\debug-analyzer.log";

export function debugLog(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] ${message}`;
  if (data !== undefined) {
    logLine += ` | ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
  }
  logLine += "\n";

  try {
    fs.appendFileSync(DEBUG_LOG_PATH, logLine);
  } catch {
    // Silently ignore file write errors
  }

  console.log(logLine.trim());
}

export function clearDebugLog(): void {
  try {
    fs.writeFileSync(DEBUG_LOG_PATH, `=== FactHarbor Debug Log Started at ${new Date().toISOString()} ===\n`);
  } catch {
    // Silently ignore
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse comma-separated whitelist into array
 */
function parseWhitelist(whitelist: string | undefined): string[] | null {
  if (!whitelist) return null;
  return whitelist
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

/**
 * Parse optional KeyFactor hints from environment variable
 * Returns array of hint objects or null if not configured
 */
function parseKeyFactorHints(
  hintsJson: string | undefined,
): Array<{ question: string; factor: string; category: string }> | null {
  if (!hintsJson) return null;
  try {
    const parsed = JSON.parse(hintsJson);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (hint) =>
        typeof hint === "object" &&
        hint !== null &&
        typeof hint.question === "string" &&
        typeof hint.factor === "string" &&
        typeof hint.category === "string",
    ) as Array<{ question: string; factor: string; category: string }>;
  } catch {
    return null;
  }
}

/**
 * Detect which search provider is configured
 */
function detectSearchProvider(): string {
  if (process.env.FH_SEARCH_PROVIDER) {
    return process.env.FH_SEARCH_PROVIDER;
  }
  if (
    process.env.GOOGLE_CSE_API_KEY ||
    process.env.GOOGLE_SEARCH_API_KEY ||
    process.env.GOOGLE_API_KEY
  ) {
    return "Google Custom Search";
  }
  if (process.env.BING_API_KEY || process.env.AZURE_BING_KEY) {
    return "Bing Search";
  }
  if (
    process.env.SERPAPI_API_KEY ||
    process.env.SERPAPI_KEY ||
    process.env.SERP_API_KEY
  ) {
    return "SerpAPI";
  }
  if (process.env.TAVILY_API_KEY) {
    return "Tavily";
  }
  if (process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_KEY) {
    return "Brave Search";
  }
  if (process.env.SEARCH_PROVIDER) {
    return process.env.SEARCH_PROVIDER;
  }
  return "Web Search";
}

// ============================================================================
// MAIN CONFIGURATION
// ============================================================================

export const CONFIG = {
  schemaVersion: "2.6.22",
  deepModeEnabled:
    (process.env.FH_ANALYSIS_MODE ?? "quick").toLowerCase() === "deep",

  // Search configuration
  searchEnabled:
    (process.env.FH_SEARCH_ENABLED ?? "true").toLowerCase() === "true",
  searchProvider: detectSearchProvider(),
  searchDomainWhitelist: parseWhitelist(process.env.FH_SEARCH_DOMAIN_WHITELIST),

  // Search mode: "standard" (default) or "grounded" (uses Gemini's built-in Google Search)
  // Note: "grounded" mode only works when LLM_PROVIDER=gemini
  searchMode: (process.env.FH_SEARCH_MODE ?? "standard").toLowerCase() as "standard" | "grounded",

  // Optional date restriction for searches: "y" (year), "m" (month), "w" (week), or undefined
  searchDateRestrict: (process.env.FH_SEARCH_DATE_RESTRICT || undefined) as "y" | "m" | "w" | undefined,

  // Source reliability configuration
  sourceBundlePath: process.env.FH_SOURCE_BUNDLE_PATH || null,

  // Report configuration
  reportStyle: (process.env.FH_REPORT_STYLE ?? "standard").toLowerCase(),
  allowModelKnowledge:
    (process.env.FH_ALLOW_MODEL_KNOWLEDGE ?? "false").toLowerCase() === "true",

  // KeyFactors configuration
  // Optional hints for KeyFactors (suggestions only, not enforced)
  // Format: JSON array of objects with {question, factor, category}
  // Example: FH_KEYFACTOR_HINTS='[{"question":"Was due process followed?","factor":"Due Process","category":"procedural"}]'
  keyFactorHints: parseKeyFactorHints(process.env.FH_KEYFACTOR_HINTS),

  quick: {
    maxResearchIterations: 2,
    maxSourcesPerIteration: 3,
    maxTotalSources: 8,
    articleMaxChars: 4000,
    minFactsRequired: 6,
  },
  deep: {
    maxResearchIterations: 5,
    maxSourcesPerIteration: 4,
    maxTotalSources: 20,
    articleMaxChars: 8000,
    minFactsRequired: 12,
  },

  minCategories: 2,
  fetchTimeoutMs: 30000,
};

export function getActiveConfig() {
  return CONFIG.deepModeEnabled ? CONFIG.deep : CONFIG.quick;
}

export function getKnowledgeInstruction(): string {
  if (CONFIG.allowModelKnowledge) {
    return "You may use general background knowledge, but prioritize the provided facts and sources.";
  }
  return "Use ONLY the provided facts and sources. If information is missing, return a truth percentage in the UNVERIFIED range (43-57%). Do not add facts not present in the sources.";
}
