/**
 * Configuration and constants for FactHarbor Analyzer
 * 
 * Contains environment-based configuration, helper functions for parsing
 * config values, and utility functions for scope/proceeding handling.
 * 
 * @module analyzer/config
 */

// ============================================================================
// CONFIGURATION PARSING HELPERS
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
 * These are suggestions only - the LLM can use them but is not required to
 */
function parseKeyFactorHints(
  hintsJson: string | undefined,
): Array<{ evaluationCriteria: string; factor: string; category: string }> | null {
  if (!hintsJson) return null;
  try {
    const parsed = JSON.parse(hintsJson);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (hint) =>
        typeof hint === "object" &&
        hint !== null &&
        typeof hint.evaluationCriteria === "string" &&
        typeof hint.factor === "string" &&
        typeof hint.category === "string",
    ) as Array<{ evaluationCriteria: string; factor: string; category: string }>;
  } catch {
    return null;
  }
}

/**
 * Detect which search provider is configured (uses FH_ prefix first, then fallback)
 */
function detectSearchProvider(): string {
  // Check for explicit FH_ config first
  if (process.env.FH_SEARCH_PROVIDER) {
    return process.env.FH_SEARCH_PROVIDER;
  }
  // Check for Google Custom Search
  if (
    process.env.GOOGLE_CSE_API_KEY ||
    process.env.GOOGLE_SEARCH_API_KEY ||
    process.env.GOOGLE_API_KEY
  ) {
    return "Google Custom Search";
  }
  // Check for Bing
  if (process.env.BING_API_KEY || process.env.AZURE_BING_KEY) {
    return "Bing Search";
  }
  // Check for SerpAPI (check both variants)
  if (
    process.env.SERPAPI_API_KEY ||
    process.env.SERPAPI_KEY ||
    process.env.SERP_API_KEY
  ) {
    return "SerpAPI";
  }
  // Check for Tavily
  if (process.env.TAVILY_API_KEY) {
    return "Tavily";
  }
  // Check for Brave
  if (process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_KEY) {
    return "Brave Search";
  }
  // Legacy fallback
  if (process.env.SEARCH_PROVIDER) {
    return process.env.SEARCH_PROVIDER;
  }
  // Default
  return "Web Search";
}

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

export const CONFIG = {
  schemaVersion: "2.6.31",
  deepModeEnabled:
    (process.env.FH_ANALYSIS_MODE ?? "quick").toLowerCase() === "deep",
  // Reduce run-to-run drift by removing sampling noise and stabilizing selection.
  deterministic:
    (process.env.FH_DETERMINISTIC ?? "true").toLowerCase() === "true",

  // Search configuration (FH_ prefixed for consistency)
  searchEnabled:
    (process.env.FH_SEARCH_ENABLED ?? "true").toLowerCase() === "true",
  searchProvider: detectSearchProvider(),
  searchDomainWhitelist: parseWhitelist(process.env.FH_SEARCH_DOMAIN_WHITELIST),
  // Search mode: "standard" (default) or "grounded" (uses Gemini's built-in Google Search)
  // Note: "grounded" mode only works when LLM_PROVIDER=gemini
  searchMode: (process.env.FH_SEARCH_MODE ?? "standard").toLowerCase() as "standard" | "grounded",
  // Optional global recency bias for search results.
  // If set to y|m|w, applies to ALL searches. If unset, date filtering is only applied when recency is detected.
  searchDateRestrict: (() => {
    const v = (process.env.FH_SEARCH_DATE_RESTRICT ?? "").toLowerCase().trim();
    if (v === "y" || v === "m" || v === "w") return v as "y" | "m" | "w";
    return null;
  })(),

  // Source reliability configuration
  sourceBundlePath: process.env.FH_SOURCE_BUNDLE_PATH || null,

  // Report configuration
  reportStyle: (process.env.FH_REPORT_STYLE ?? "standard").toLowerCase(),
  allowModelKnowledge:
    (process.env.FH_ALLOW_MODEL_KNOWLEDGE ?? "false").toLowerCase() === "true",

  // KeyFactors configuration
  // Optional hints for KeyFactors (suggestions only, not enforced)
  // Format: JSON array of objects with {evaluationCriteria, factor, category}
  // Example: FH_KEYFACTOR_HINTS='[{"evaluationCriteria":"Was due process followed?","factor":"Due Process","category":"procedural"}]'
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
  fetchTimeoutMs: 30000, // 30 seconds for large PDFs
};

// ============================================================================
// CONFIGURATION ACCESSORS
// ============================================================================

/**
 * Get the active configuration based on analysis mode (quick vs deep)
 */
export function getActiveConfig() {
  return CONFIG.deepModeEnabled ? CONFIG.deep : CONFIG.quick;
}

/**
 * Get temperature value for deterministic mode
 */
export function getDeterministicTemperature(defaultTemp: number): number {
  return CONFIG.deterministic ? 0 : defaultTemp;
}

// ============================================================================
// SCOPE/PROCEEDING UTILITIES
// ============================================================================

/**
 * Extract parenthetical acronym from text, e.g., "(STF)" -> "STF"
 */
export function extractParenAcronym(text: string): string {
  const m = text.match(/\(([A-Z]{2,10})\)/);
  return m?.[1] ?? "";
}

/**
 * Extract all-caps token from text
 */
export function extractAllCapsToken(text: string): string {
  // Prefer explicit parenthetical acronyms, otherwise look for standalone ALLCAPS tokens.
  const paren = extractParenAcronym(text);
  if (paren) return paren;
  const m = text.match(/\b([A-Z]{2,6})\b/);
  return m?.[1] ?? "";
}

/**
 * Infer acronym from "X-to-Y" pattern, e.g., "Well-to-Wheel" -> "WTW"
 */
export function inferToAcronym(text: string): string {
  // Generic acronym inference for phrases like "Cradle-to-Grave", "Well-to-Wheel(s)", etc.
  // This is intentionally topic-agnostic: it just compresses "<A>-to-<B>" into "ATB".
  const m = String(text || "").match(/\b([A-Za-z]{3,})\s*-\s*to\s*-\s*([A-Za-z]{3,})\b/);
  if (!m) return "";
  const a = m[1]?.[0]?.toUpperCase() ?? "";
  const b = m[2]?.[0]?.toUpperCase() ?? "";
  return a && b ? `${a}T${b}` : "";
}

/**
 * Infer scope type label from proceeding data
 */
export function inferScopeTypeLabel(p: any): string {
  const hay = [
    p?.name,
    p?.shortName,
    p?.metadata?.court,
    p?.metadata?.institution,
    p?.subject,
    ...(Array.isArray(p?.metadata?.charges) ? p.metadata.charges : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(election|electoral|ballot|campaign|ineligib|tse)\b/.test(hay)) return "Electoral";
  if (/(criminal|prosecut|indict|investigat|police|coup|stf|supreme)\b/.test(hay))
    return "Criminal";
  if (/\bcivil\b/.test(hay)) return "Civil";
  if (/(regulator|administrat|agency|licens|compliance)\b/.test(hay)) return "Regulatory";
  if (/(wtw|ttw|wtt|lifecycle|lca|iso\s*\d|methodology)\b/i.test(hay)) return "Methodological";
  if (/(efficien|performance|measure|benchmark|comparison)\b/i.test(hay)) return "Analytical";
  return "General";
}

/**
 * Get rank for scope type (for stable ordering)
 */
export function scopeTypeRank(label: string): number {
  // Stable ordering across runs: legal scopes first, then analytical, then general.
  switch (label) {
    case "Electoral":
      return 1;
    case "Criminal":
      return 2;
    case "Civil":
      return 3;
    case "Regulatory":
      return 4;
    case "Methodological":
      return 5;
    case "Analytical":
      return 6;
    case "General":
      return 7;
    default:
      return 9;
  }
}

// Backward compatibility alias
export const contextTypeRank = scopeTypeRank;

/**
 * Detect institution code from proceeding data
 */
export function detectInstitutionCode(p: any): string {
  const fromCourt = extractAllCapsToken(String(p?.metadata?.court || ""));
  if (fromCourt) return fromCourt;
  const fromInstitution = extractAllCapsToken(String(p?.metadata?.institution || ""));
  if (fromInstitution) return fromInstitution;
  const fromShort = extractAllCapsToken(String(p?.shortName || ""));
  if (fromShort) return fromShort;
  const fromName = extractAllCapsToken(String(p?.name || ""));
  if (fromName) return fromName;
  const dms = Array.isArray(p?.metadata?.decisionMakers) ? p.metadata.decisionMakers : [];
  for (const dm of dms) {
    const code = extractAllCapsToken(String(dm?.affiliation || "")) || extractAllCapsToken(String(dm?.role || ""));
    if (code) return code;
  }
  return "";
}

/**
 * Sanitize scope short answer based on procedural status
 */
export function sanitizeScopeShortAnswer(shortAnswer: string, proceedingStatus: string): string {
  if (!shortAnswer) return shortAnswer;
  if ((proceedingStatus || "").toLowerCase() !== "unknown") return shortAnswer;

  let out = shortAnswer;
  // If we don't have an anchored procedural status, avoid asserting it in the narrative.
  out = out.replace(/\b(remains\s+ongoing)\b/gi, "status is unclear");
  out = out.replace(/\b(remains\s+in\s+progress)\b/gi, "status is unclear");
  out = out.replace(/\bongoing\b/gi, "unresolved");
  out = out.replace(/\bconcluded\b/gi, "reported concluded");
  out = out.replace(/\bpending\b/gi, "unresolved");
  return out;
}
