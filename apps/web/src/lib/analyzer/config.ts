/**
 * Configuration and constants for FactHarbor Analyzer
 *
 * Contains environment-based configuration, helper functions for parsing
 * config values, and utility functions for AnalysisContext handling.
 *
 * @module analyzer/config
 */

import { DEFAULT_PIPELINE_CONFIG, DEFAULT_SEARCH_CONFIG, type PipelineConfig } from "../config-schemas";

// ============================================================================
// CONFIGURATION PARSING HELPERS
// ============================================================================

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

export const CONFIG = {
  schemaVersion: "2.6.41",
  deepModeEnabled: DEFAULT_PIPELINE_CONFIG.analysisMode === "deep",
  // Reduce run-to-run drift by removing sampling noise and stabilizing selection.
  deterministic: DEFAULT_PIPELINE_CONFIG.deterministic,

  // Search configuration (FH_ prefixed for consistency)
  searchEnabled: DEFAULT_SEARCH_CONFIG.enabled,
  searchProvider: DEFAULT_SEARCH_CONFIG.provider,
  searchDomainWhitelist: DEFAULT_SEARCH_CONFIG.domainWhitelist,
  // Search mode: "standard" (default) or "grounded" (uses Gemini's built-in Google Search)
  // Note: "grounded" mode only works when llmProvider=google
  searchMode: DEFAULT_SEARCH_CONFIG.mode,
  // Optional global recency bias for search results.
  // If set to y|m|w, applies to ALL searches. If unset, date filtering is only applied when recency is detected.
  searchDateRestrict: DEFAULT_SEARCH_CONFIG.dateRestrict,

  // Source reliability configuration (v2.2 - UCM-managed)
  // Legacy: sourceBundlePath is no longer used - see source-reliability.ts

  // Report configuration
  reportStyle: "standard",
  allowModelKnowledge: DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,

  // KeyFactors configuration
  // Optional hints for KeyFactors (suggestions only, not enforced)
  // Format: JSON array of objects with {evaluationCriteria, factor, category}
  // Example: FH_KEYFACTOR_HINTS='[{"evaluationCriteria":"Was due process followed?","factor":"Due Process","category":"procedural"}]'
  keyFactorHints: DEFAULT_PIPELINE_CONFIG.keyFactorHints,

  quick: {
    maxResearchIterations: 4, // v2.8.2: was 2 - increased for better quality
    maxSourcesPerIteration: 4, // v2.8.2: was 3
    maxTotalSources: 12, // v2.8.2: was 8
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
 * Get analysis configuration from pipeline config, environment, or defaults
 *
 * Resolution order:
 * 1. Pipeline config (if provided)
 * 2. Environment variables
 * 3. Default values
 *
 * @param config - Optional pipeline config from unified config system
 */
export function getAnalyzerConfigValues(config?: PipelineConfig) {
  const effectiveConfig = config ?? DEFAULT_PIPELINE_CONFIG;
  const deepModeEnabled = effectiveConfig.analysisMode === "deep";
  const deterministic = effectiveConfig.deterministic;
  const allowModelKnowledge = effectiveConfig.allowModelKnowledge;
  const contextDedupThreshold =
    effectiveConfig.contextDedupThreshold ??
    DEFAULT_PIPELINE_CONFIG.contextDedupThreshold;

  return {
    schemaVersion: CONFIG.schemaVersion,
    deepModeEnabled,
    deterministic,
    searchEnabled: DEFAULT_SEARCH_CONFIG.enabled,
    searchProvider: DEFAULT_SEARCH_CONFIG.provider,
    searchDomainWhitelist: DEFAULT_SEARCH_CONFIG.domainWhitelist,
    searchMode: DEFAULT_SEARCH_CONFIG.mode,
    searchDateRestrict: DEFAULT_SEARCH_CONFIG.dateRestrict,
    reportStyle: CONFIG.reportStyle,
    allowModelKnowledge,
    keyFactorHints: effectiveConfig.keyFactorHints ?? DEFAULT_PIPELINE_CONFIG.keyFactorHints,
    contextDedupThreshold,
    quick: CONFIG.quick,
    deep: CONFIG.deep,
    minCategories: CONFIG.minCategories,
    fetchTimeoutMs: CONFIG.fetchTimeoutMs,
  };
}

/**
 * Get the active configuration based on analysis mode (quick vs deep)
 *
 * @param config - Optional pipeline config from unified config system
 */
export function getActiveConfig(config?: PipelineConfig) {
  const deepModeEnabled = (config ?? DEFAULT_PIPELINE_CONFIG).analysisMode === "deep";
  return deepModeEnabled ? CONFIG.deep : CONFIG.quick;
}

/**
 * Get temperature value for deterministic mode
 *
 * @param defaultTemp - Default temperature if not deterministic
 * @param config - Optional pipeline config from unified config system
 */
export function getDeterministicTemperature(
  defaultTemp: number,
  config?: PipelineConfig,
): number {
  const deterministic = config ? config.deterministic : DEFAULT_PIPELINE_CONFIG.deterministic;
  return deterministic ? 0 : defaultTemp;
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
 * Infer scope type label from AnalysisContext data
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

// ============================================================================
// FUNCTION ALIASES (Phase 1: Backward Compatibility)
// ============================================================================
// These aliases maintain backward compatibility while transitioning to
// correct terminology. "Scope" in these function names refers to
// AnalysisContext, NOT EvidenceScope. See types.ts:98-126 for definitions.

/** Primary name for inferring context type label */
export const inferContextTypeLabel = inferScopeTypeLabel;

/** Primary name for context type ranking (alias already existed) */
export const contextTypeRank = scopeTypeRank;

/**
 * Detect institution code from AnalysisContext data
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

/** Primary name for sanitizing context short answer */
export const sanitizeContextShortAnswer = sanitizeScopeShortAnswer;
