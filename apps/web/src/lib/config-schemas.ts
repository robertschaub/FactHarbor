/**
 * Configuration Schemas
 *
 * Zod schemas for validating and canonicalizing configuration content.
 * Supports schema version 3.0.0 (search/calc/pipeline/sr) and prompt.v1.
 *
 * @module config-schemas
 * @version 1.0.0
 */

import { z } from "zod";
import crypto from "crypto";
import type { LLMProviderType } from "./analyzer/types";

// ============================================================================
// TYPES
// ============================================================================

export type ConfigType = "prompt" | "search" | "calculation" | "pipeline" | "sr";
export type SchemaVersion = "prompt.v1" | "3.0.0";

// File-backed default schema versions (alpha). Used to validate apps/web/configs/*.default.json.
export const SCHEMA_VERSIONS = {
  pipeline: "3.0.0",
  search: "3.0.0",
  calculation: "3.0.0",
  sr: "3.0.0",
} as const;

/**
 * Valid config types for API validation.
 * Single source of truth - import this in API routes.
 */
export const VALID_CONFIG_TYPES = ["prompt", "search", "calculation", "pipeline", "sr"] as const;

/**
 * Check if a string is a valid config type
 */
export function isValidConfigType(type: string): type is ConfigType {
  return VALID_CONFIG_TYPES.includes(type as ConfigType);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// SEARCH CONFIG SCHEMA (3.0.0)
// ============================================================================

export const SearchConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["auto", "google-cse", "serpapi", "brave", "serper"]),
  mode: z.enum(["standard", "grounded"]),
  autoMode: z.enum(["accumulate", "first-success"]).default("accumulate")
    .describe("AUTO provider dispatch: 'accumulate' fills slots from multiple providers until maxResults; 'first-success' stops after first provider with results (default: accumulate)"),
  searchRelevanceMode: z.enum(["STRICT", "MODERATE", "RELAXED"]).optional().describe("Search relevance classification mode (default: MODERATE)"),
  maxResults: z.number().int().min(1).max(20),
  maxSourcesPerIteration: z.number().int().min(1).max(20),
  timeoutMs: z.number().int().min(1000).max(60000),
  dateRestrict: z.enum(["y", "m", "w"]).nullable(),
  domainWhitelist: z.array(z.string().regex(/^[a-z0-9.-]+$/i)).max(50),
  domainBlacklist: z.array(z.string().regex(/^[a-z0-9.-]+$/i)).max(50),

  // Query generation parameters
  queryGeneration: z.object({
    maxEntitiesPerClaim: z.number().int().min(1).max(20),
    maxWordLength: z.number().int().min(1).max(10),
    maxSearchTerms: z.number().int().min(1).max(20),
    maxFallbackTerms: z.number().int().min(1).max(15),
  }).optional(),

  // Search result caching
  cache: z.object({
    enabled: z.boolean().describe("Enable search result caching"),
    ttlDays: z.number().int().min(1).max(30).describe("Cache TTL in days"),
  }).optional().describe("Search cache settings"),

  // Multi-provider configuration
  providers: z.object({
    googleCse: z.object({
      enabled: z.boolean().describe("Enable Google CSE provider"),
      priority: z.number().int().min(1).max(10).describe("Provider priority (1=highest)"),
      dailyQuotaLimit: z.number().int().min(0).describe("Daily quota limit (0=unlimited) — Declared for future enforcement, not currently tracked"),
    }).optional(),
    serpapi: z.object({
      enabled: z.boolean().describe("Enable SerpAPI provider"),
      priority: z.number().int().min(1).max(10).describe("Provider priority (1=highest)"),
      dailyQuotaLimit: z.number().int().min(0).describe("Daily quota limit (0=unlimited) — Declared for future enforcement, not currently tracked"),
    }).optional(),
    brave: z.object({
      enabled: z.boolean().describe("Enable Brave Search API provider"),
      priority: z.number().int().min(1).max(10).describe("Provider priority (1=highest)"),
      dailyQuotaLimit: z.number().int().min(0).describe("Daily quota limit (0=unlimited) — Declared for future enforcement, not currently tracked"),
    }).optional(),
    serper: z.object({
      enabled: z.boolean().describe("Enable Serper API provider (queries Google index directly)"),
      priority: z.number().int().min(1).max(10).describe("Provider priority (1=highest)"),
      dailyQuotaLimit: z.number().int().min(0).describe("Daily quota limit (0=unlimited) — Declared for future enforcement, not currently tracked"),
    }).optional(),
    wikipedia: z.object({
      enabled: z.boolean().describe("Enable Wikipedia search provider (no API key required)"),
      priority: z.number().int().min(1).max(10).describe("Provider priority (1=highest)"),
      dailyQuotaLimit: z.number().int().min(0).describe("Daily quota limit (0=unlimited) — Declared for future enforcement, not currently tracked"),
      language: z.string().min(2).max(10).optional().describe("Wikipedia language subdomain (default: en)"),
    }).optional(),
    semanticScholar: z.object({
      enabled: z.boolean().describe("Enable Semantic Scholar academic paper search"),
      priority: z.number().int().min(1).max(10).describe("Provider priority (1=highest)"),
      dailyQuotaLimit: z.number().int().min(0).describe("Daily quota limit (0=unlimited) — Declared for future enforcement, not currently tracked"),
    }).optional(),
    googleFactCheck: z.object({
      enabled: z.boolean().describe("Enable Google Fact Check Tools API provider"),
      priority: z.number().int().min(1).max(10).describe("Provider priority (1=highest)"),
      dailyQuotaLimit: z.number().int().min(0).describe("Daily quota limit (0=unlimited) — Declared for future enforcement, not currently tracked"),
      languageCode: z.string().min(2).max(10).optional().describe("BCP-47 language code to filter fact-check reviews (e.g., 'en', 'de'). Unset returns all languages."),
    }).optional(),
  }).optional().describe("Provider-specific settings"),

  // Fact Check API pipeline integration (direct seeding, not just search)
  factCheckApi: z.object({
    enabled: z.boolean().describe("Enable fact-check API direct seeding in pipeline"),
    maxResultsPerClaim: z.number().int().min(1).max(10).describe("Max fact-check results per atomic claim"),
    maxAgeDays: z.number().int().min(1).max(3650).describe("Max age of fact-check reviews to include (days)"),
    fetchFullArticles: z.boolean().describe("Fetch full articles from fact-check URLs for richer evidence"),
  }).optional().describe("Google Fact Check Tools API pipeline integration settings"),

  // Circuit breaker for provider health tracking
  circuitBreaker: z.object({
    enabled: z.boolean().describe("Enable circuit breaker"),
    failureThreshold: z.number().int().min(1).max(10).describe("Consecutive failures before opening circuit"),
    resetTimeoutSec: z.number().int().min(10).max(3600).describe("Seconds before attempting retry"),
  }).optional().describe("Circuit breaker settings for provider health"),

  // Geo-awareness overrides (normally auto-detected from claim input in Pass 1)
  searchLanguageOverride: z.string().min(2).max(10).optional()
    .describe("BCP-47 language code override for search (e.g., 'de', 'en'). When set, overrides auto-detected language from claim input."),
  searchGeographyOverride: z.string().min(2).max(2).optional()
    .describe("ISO 3166-1 alpha-2 country code override for search (e.g., 'CH', 'US'). When set, overrides auto-inferred geography from claim input."),

  // Generic supplementary-provider orchestration policy
  supplementaryProviders: z.object({
    mode: z.enum(["fallback_only", "always_if_enabled"])
      .describe("When supplementary providers run: 'fallback_only' = only when primary providers return zero results (current behavior); 'always_if_enabled' = run bounded supplementary search even when primary search succeeded."),
    maxResultsPerProvider: z.number().int().min(1).max(10)
      .describe("Max results each supplementary provider may return per search call (default: 3). Keeps supplementary evidence bounded."),
  }).optional().describe("Controls when and how supplementary providers (Wikipedia, Semantic Scholar, Google Fact Check) participate in search."),

  // Supplementary English retrieval lane (Proposal 2 — multilingual output/search policy)
  supplementaryEnglishLane: z.object({
    enabled: z.boolean().describe("Enable English supplementary retrieval lane for non-English inputs. Coverage expansion only — never contrarian/balancing."),
    triggerMode: z.enum(["native_scarcity_only"]).describe("When to trigger: 'native_scarcity_only' = only when native-language results are below thresholds."),
    maxAdditionalQueriesPerClaim: z.number().int().min(0).max(3).describe("Max English queries to add per claim when triggered (default 1)."),
    minPrimaryEvidenceItems: z.number().int().min(0).max(20).describe("Minimum evidence items from primary lane before EN lane activates (default 2)."),
    applyInIterationTypes: z.array(z.enum(["main", "contradiction", "contrarian"])).describe("Iteration types where EN lane is allowed (default: ['main'])."),
  }).optional().describe("Experimental English supplementary retrieval for non-English inputs. Default off."),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enabled: true,
  provider: "auto",
  mode: "standard",
  autoMode: "accumulate",
  maxResults: 10,
  maxSourcesPerIteration: 8,
  timeoutMs: 12000,
  dateRestrict: null,
  domainWhitelist: [],
  domainBlacklist: [
    "facebook.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "instagram.com",
    "tiktok.com",
    "pinterest.com",
    "quora.com",
    "youtube.com",
  ],
  queryGeneration: {
    maxEntitiesPerClaim: 4,
    maxWordLength: 2,
    maxSearchTerms: 8,
    maxFallbackTerms: 6,
  },
  cache: {
    enabled: true,
    ttlDays: 7,
  },
  providers: {
    googleCse: {
      enabled: true,
      priority: 1,
      dailyQuotaLimit: 8000, // Leave buffer below 10k limit
    },
    serpapi: {
      enabled: false,
      priority: 2,
      dailyQuotaLimit: 0, // Unlimited (paid tier)
    },
    brave: {
      enabled: false,
      priority: 2,
      dailyQuotaLimit: 10000, // Adjust based on plan
    },
    serper: {
      enabled: true,
      priority: 2,
      dailyQuotaLimit: 0, // Paid per search
    },
    wikipedia: {
      enabled: true,
      priority: 3,
      dailyQuotaLimit: 0, // No API key needed, unlimited
      language: "en",
    },
    semanticScholar: {
      enabled: false,
      priority: 3,
      dailyQuotaLimit: 0, // Free tier: 1 RPS (enforced client-side)
    },
    googleFactCheck: {
      enabled: false,
      priority: 4,
      dailyQuotaLimit: 0, // Free tier: 10k/day
    },
  },
  factCheckApi: {
    enabled: false,
    maxResultsPerClaim: 5,
    maxAgeDays: 365,
    fetchFullArticles: true,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 3,
    resetTimeoutSec: 300, // 5 minutes
  },
  supplementaryProviders: {
    mode: "always_if_enabled", // Wikipedia is the bounded default-on supplementary provider
    maxResultsPerProvider: 3,
  },
  supplementaryEnglishLane: {
    enabled: false, // Default off — experimental
    triggerMode: "native_scarcity_only",
    maxAdditionalQueriesPerClaim: 1,
    minPrimaryEvidenceItems: 2,
    applyInIterationTypes: ["main"],
  },
};

// ============================================================================
// PIPELINE CONFIG SCHEMA (3.0.0)
// ============================================================================
// Tier 2 operational config for analysis pipeline settings.
// Hot-reloadable via Admin UI (defaults defined in code + UCM).

const CONTEXT_PATTERN_ID_REGEX = /^CTX_[A-Z_]+$/;

const TEMPORAL_PROMPT_TEXT_DEFAULTS = {
  temporalPromptContractTemplate:
    "## TEMPORAL AWARENESS CONTRACT (MANDATORY)\nCURRENT DATE: {{CURRENT_DATE_ISO}}\n- Treat your training knowledge as potentially stale for recent developments after your training snapshot.\n{{KNOWLEDGE_RULE}}\n{{RECENCY_RULE}}\n{{NO_FRESH_EVIDENCE_RULE}}\n{{RELATIVE_TIME_RULE}}",
  temporalPromptKnowledgeRuleAllowed:
    "- Background knowledge can support stable historical/process context, but current-status facts must defer to provided evidence.",
  temporalPromptKnowledgeRuleEvidenceOnly:
    "- Use evidence-only reasoning. Do not fill current-status gaps with background knowledge.",
  temporalPromptRecencyRuleSensitive:
    "- This topic is recency-sensitive. Any claim about current status requires cited web evidence anchored to dates.",
  temporalPromptRecencyRuleGeneral:
    "- If the claim is not explicitly time-sensitive, still avoid unsupported assumptions about the present.",
  temporalPromptNoFreshEvidenceRule:
    "- If current-status evidence is missing or stale, keep verdicts in UNVERIFIED (43-57%) instead of guessing.",
  temporalPromptRelativeTimeRule:
    '- Do not use unanchored relative-time statements ("currently", "recently", "today") unless backed by cited evidence.',
} as const;

export const PipelineConfigSchema = z.object({
  // === Model Selection ===
  llmProvider: z.enum(["anthropic", "openai", "google", "mistral"]).optional().describe("Primary LLM provider for analysis"),
  llmTiering: z.boolean().describe("Enable tiered model selection for cost optimization"),
  modelUnderstand: z.string().min(1).describe("Model for UNDERSTAND phase (claim comprehension)"),
  modelExtractEvidence: z.string().min(1).describe("Model for EXTRACT_EVIDENCE phase"),
  modelVerdict: z.string().min(1).describe("Model for VERDICT phase (final verdicts)"),
  modelOpus: z.string().min(1).optional().describe("Model for OPUS debate tier (B-5b). Used when a debate role is set to 'opus'. Falls back to modelVerdict if not set."),

  // === LLM Text Analysis Feature Flags ===
  llmInputClassification: z.boolean().describe("Use LLM for input classification (replaces heuristics)"),
  llmEvidenceQuality: z.boolean().describe("Use LLM for evidence quality assessment"),

  llmContextSimilarity: z.boolean().optional().describe("Use LLM for context similarity analysis (orchestrated pipeline only)"),

  llmVerdictValidation: z.boolean().describe("Use LLM for verdict validation (inversion/harm detection)"),

  // === Heuristic Fallback Controls (Phase 4) ===
  allowQualityFallbacks: z.boolean().describe(
    "Allow heuristic fallbacks for quality-impacting tasks (verdict, evidence filtering) when LLM fails. " +
    "When false (default), LLM failures return errors for quality-impacting steps."
  ),
  allowNonQualityFallbacks: z.boolean().describe(
    "Allow heuristic fallbacks for non-quality-impacting tasks (input classification, recency hints). " +
    "Graceful degradation is safer for these tasks."
  ),
  heuristicCircuitBreakerThreshold: z.number().int().min(1).max(10).describe(
    "After N consecutive LLM failures, surface error to user instead of degrading"
  ),

  // === Analysis Behavior ===
  analysisMode: z.enum(["quick", "deep"]).describe("Analysis depth: quick (faster) or deep (more thorough)"),
  allowModelKnowledge: z.boolean().describe("Allow LLM to use training knowledge (not just web sources)"),
  deterministic: z.boolean().describe("Use temperature=0 for reproducible outputs"),
  understandTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for UNDERSTAND step claim extraction (default: 0.15). Lower = more deterministic, higher = more exploration of ambiguous interpretations."),
  understandMinClaimThreshold: z.number().int().min(1).max(20).optional()
    .describe("Minimum claims from initial decomposition before triggering enrichment pass (default: 4)"),
  keyFactorHints: z
    .array(
      z.object({
        evaluationCriteria: z.string(),
        factor: z.string(),
        category: z.string(),
      }),
    )
    .optional()
    .describe("Optional KeyFactor hints (evaluationCriteria, factor, category)"),

  // === LLM Limits & Gates ===
  understandMaxChars: z.number().int().min(1000).max(50000).optional().describe("Max characters sent to UNDERSTAND prompt"),
  understandLlmTimeoutMs: z.number().int().min(10000).max(1200000).optional().describe("Timeout for UNDERSTAND LLM calls (ms)"),
  extractEvidenceLlmTimeoutMs: z
    .number()
    .int()
    .min(10000)
    .max(1200000)
    .optional()
    .describe("Timeout for EXTRACT_EVIDENCE LLM calls (ms)"),
  probativeFilterEnabled: z.boolean().optional().describe("Enable probative value filtering"),
  provenanceValidationEnabled: z.boolean().optional().describe("Enable provenance validation gate"),
  pdfParseTimeoutMs: z.number().int().min(10000).max(300000).optional().describe("Timeout for PDF parsing (ms)"),

  // === Parallel Extraction ===
  parallelExtractionLimit: z.number().int().min(1).max(10).optional()
    .describe("Max concurrent evidence extraction calls (1-10). Lower values reduce rate limiting risk. Consider provider-specific limits."),

  // === Pipeline Thresholds ===
  evidenceSimilarityThreshold: z.number().min(0.2).max(0.8).optional()
    .describe("Similarity threshold for matching evidence to claims (0.2-0.8). Default: 0.4"),
  temporalConfidenceThreshold: z.number().min(0.3).max(0.9).optional()
    .describe("Min confidence for temporalContext to affect recency filters (0.3-0.9). Default: 0.6"),
  recencyWindowMonths: z.number().int().min(1).max(24).optional()
    .describe("Recency window in months for time-sensitive evidence checks (default: 6)"),
  recencyConfidencePenalty: z.number().int().min(0).max(50).optional()
    .describe("Confidence penalty (percentage points) when time-sensitive claims lack recent evidence (default: 20)"),
  recencyGraduatedPenalty: z.boolean().optional()
    .describe("Enable graduated recency penalty (default: true). When true, penalty scales with staleness, topic volatility, and evidence volume instead of flat binary application."),
  confidenceCalibration: z.object({
    enabled: z.boolean().default(true),
    densityAnchor: z.object({
      enabled: z.boolean().default(true),
      minConfidenceBase: z.number().int().min(5).max(30).default(15),
      minConfidenceMax: z.number().int().min(30).max(85).default(75),
      sourceCountThreshold: z.number().int().min(1).max(10).default(3),
    }).default({}),
    bandSnapping: z.object({
      enabled: z.boolean().default(true),
      strength: z.number().min(0).max(1).default(0.5),
      customBands: z.array(z.object({
        min: z.number().int(),
        max: z.number().int(),
        snapTo: z.number().int(),
      })).optional(),
    }).default({}),
    verdictCoupling: z.object({
      enabled: z.boolean().default(true),
      strongVerdictThreshold: z.number().int().min(60).max(80).default(70),
      minConfidenceStrong: z.number().int().min(30).max(70).default(50),
      minConfidenceNeutral: z.number().int().min(10).max(40).default(25),
    }).default({}),
    contextConsistency: z.object({
      enabled: z.boolean().default(true),
      maxConfidenceSpread: z.number().int().min(10).max(50).default(25),
      reductionFactor: z.number().min(0).max(1).default(0.5),
    }).default({}),
  }).optional()
    .describe("Confidence calibration system: multi-layer deterministic post-processing to reduce confidence instability"),
  minConfidenceFloor: z.number().int().min(0).max(50).optional()
    .describe("Minimum confidence floor for successful verdicts — prevents confidence from reaching 0 (default: 10)"),
  lowSourceThreshold: z.number().int().min(1).max(10).optional()
    .describe("Source count at or below which low-source confidence penalty applies (default: 2)"),
  lowSourceConfidencePenalty: z.number().int().min(0).max(50).optional()
    .describe("Confidence penalty (percentage points) when unique source count is at or below lowSourceThreshold (default: 15)"),
  recencyCueTerms: z.array(z.string().min(1)).max(50).optional()
    .describe("Configurable recency cue terms for time-sensitive detection (default: empty)"),
  // UCM-managed templates for temporal-awareness prompt injection (used in verdict prompts).
  temporalPromptContractTemplate: z.string().min(1).max(4000).optional()
    .describe("Template for temporal awareness contract injected into verdict prompts"),
  temporalPromptKnowledgeRuleAllowed: z.string().min(1).max(1000).optional()
    .describe("Rule text when model knowledge is allowed"),
  temporalPromptKnowledgeRuleEvidenceOnly: z.string().min(1).max(1000).optional()
    .describe("Rule text when model knowledge is disallowed"),
  temporalPromptRecencyRuleSensitive: z.string().min(1).max(1000).optional()
    .describe("Rule text when claim is recency-sensitive"),
  temporalPromptRecencyRuleGeneral: z.string().min(1).max(1000).optional()
    .describe("Rule text when claim is not recency-sensitive"),
  temporalPromptNoFreshEvidenceRule: z.string().min(1).max(1000).optional()
    .describe("Rule text for missing/stale current evidence"),
  temporalPromptRelativeTimeRule: z.string().min(1).max(1000).optional()
    .describe("Rule text for relative-time language constraints"),
  searchRelevanceLlmMode: z.enum(["off", "auto", "on"]).optional()
    .describe("LLM relevance classification mode: off | auto | on (default: auto)"),
  searchRelevanceLlmMaxCalls: z.number().int().min(0).max(10).optional()
    .describe("Max LLM relevance classifications per analysis (default: 3)"),
  searchAdaptiveFallbackMinCandidates: z.number().int().min(0).max(20).optional()
    .describe("Min relevant candidates before adaptive fallback broadens constraints and search (default: 5, 0 disables)"),
  searchAdaptiveFallbackMaxQueries: z.number().int().min(0).max(5).optional()
    .describe("Max additional broad fallback queries when adaptive fallback triggers (default: 2)"),
  searchMaxResultsCriticism: z.number().int().min(1).max(20).optional()
    .describe("Max search results for criticism/counterevidence queries (default: 8)"),
  searchRetryBeforeFallback: z.boolean().optional()
    .describe("Retry original queries with modified terms before triggering adaptive fallback (default: true)"),
  planningMaxSearchQueries: z.number().int().min(3).max(12).optional()
    .describe("Max search queries generated during planning phase (default: 8)"),
  contextClaimsAnchorDivergenceThreshold: z.number().int().min(0).max(50).optional()
    .describe("Min divergence between context verdict and claims average to trigger anchoring (default: 15)"),
  contextClaimsAnchorClaimsWeight: z.number().min(0).max(1).optional()
    .describe("Blend weight of claims average when anchoring verdicts (default: 0.6)"),
  probativeDeduplicationThreshold: z.number().min(0.5).max(0.95).optional()
    .describe("Deduplication threshold used by deterministic probative filter (default: 0.75)"),
  foreignJurisdictionRelevanceCap: z.number().min(0).max(1).optional()
    .describe("Max relevance score for foreign-reaction sources (default: 0.35, below the 0.4 pass threshold)"),
  relevanceTopNFetch: z.number().int().min(1).max(20).optional()
    .describe("Max sources fetched per search iteration after relevance classification (default: 5)"),
  applicabilityFilterEnabled: z.boolean().optional()
    .describe("Enable post-extraction applicability assessment to filter foreign-jurisdiction evidence (default: true)"),
  evidenceWeightingEnabled: z.boolean().optional()
    .describe("Enable legacy SR-based evidence weighting that adjusts truth% and confidence based on source track-record scores (default: false — replaced by Stage 4.5 SR calibration)"),
  sourceReliabilityCalibrationEnabled: z.boolean().optional()
    .describe("Enable Stage 4.5 source-reliability calibration after raw verdict generation (default: false)"),
  sourceReliabilityCalibrationMode: z.enum(["off", "confidence_only", "bounded_truth_and_confidence"]).optional()
    .describe("Stage 4.5 source-reliability calibration mode (default: off)"),
  sourceReliabilityCalibrationStrength: z.enum(["budget", "standard", "premium"]).optional()
    .describe("Model strength for Stage 4.5 source-reliability calibration (default: budget)"),

  // === Budget Controls ===
  // Note: maxTokensPerCall is a low-level safety limit for individual LLM calls.

  verdictBatchSize: z.number().int().min(1).max(20).optional()
    .describe("Max claims per verdict LLM call batch when full call fails (default: 5)"),
  maxIterationsPerContext: z.number().int().min(1).max(20).optional().describe("DEPRECATED: Max research iterations per context (not enforced in ClaimBoundary pipeline)"),

  maxTotalIterations: z.number().int().min(1).max(50).describe("Max total iterations across all contexts"),
  maxTotalTokens: z.number().int().min(10000).max(2000000).describe("Max tokens per analysis"),
  maxTokensPerCall: z.number().int().min(1000).max(500000).optional().describe("Max tokens per LLM call"),
  enforceBudgets: z.boolean().describe("Hard enforce budget limits (false = soft limits for important claims)"),

  // === Gap-Driven Research (Pipeline Phase 1) ===
  gapResearchEnabled: z.boolean().optional()
    .describe("Enable gap-driven research to fill evidence gaps for HIGH centrality claims"),
  gapResearchMaxIterations: z.number().int().min(1).max(10).optional()
    .describe("Max gap research iterations after main research completes"),
  gapResearchMaxQueries: z.number().int().min(1).max(20).optional()
    .describe("Max total queries issued during gap research (separate from main research budget)"),

  // === Claim Filtering Enhancements ===
  thesisRelevanceValidationEnabled: z.boolean().optional()
    .describe("Enable validation of thesis relevance classifications"),
  thesisRelevanceLowConfidenceThreshold: z.number().int().min(0).max(100).optional()
    .describe("Threshold for flagging low-confidence relevance classifications (default: 70)"),
  thesisRelevanceAutoDowngradeThreshold: z.number().int().min(0).max(100).optional()
    .describe("Threshold for auto-downgrading 'direct' to 'tangential' (default: 60)"),

  minEvidenceForTangential: z.number().int().min(0).max(10).optional()
    .describe("Minimum supporting evidence items required for tangential claims to appear in report (default: 2)"),
  tangentialEvidenceQualityCheckEnabled: z.boolean().optional()
    .describe("Require at least one high/medium probative evidence item for tangential claims (default: false)"),

  maxOpinionFactors: z.number().int().min(0).max(20).optional()
    .describe("Maximum opinion-based keyFactors to include in report (0 = unlimited, monitor only)"),
  opinionAccumulationWarningThreshold: z.number().int().min(0).max(100).optional()
    .describe("Warn if opinion-based keyFactors exceed this percentage (default: 70)"),

  // === ClaimBoundary Pipeline Parameters ===
  // Stage 1: Claim Extraction
  centralityThreshold: z.enum(["high", "medium"]).optional()
    .describe("Minimum centrality to keep a claim in ClaimBoundary pipeline (default: medium)"),
  claimSpecificityMinimum: z.number().min(0).max(1).optional()
    .describe("Minimum specificity score for Gate 1 pass in ClaimBoundary pipeline (default: 0.6)"),
  maxAtomicClaims: z.number().int().min(2).max(30).optional()
    .describe("Absolute maximum claims after centrality filter (default: 5). Effective max is f(input length) capped by this value."),
  maxAtomicClaimsBase: z.number().int().min(1).max(10).optional()
    .describe("Minimum atomic claims for any input length (default: 3). Formula: min(maxAtomicClaims, base + floor(inputChars / charsPerClaim))"),
  atomicClaimsInputCharsPerClaim: z.number().int().min(100).max(5000).optional()
    .describe("Input characters per additional atomic claim above base (default: 500)"),
  claimAtomicityLevel: z.number().int().min(1).max(5).optional()
    .describe("Claim granularity: 1=very relaxed (broad), 3=moderate (default), 5=very strict (granular)"),
  preliminarySearchQueriesPerClaim: z.number().int().min(1).max(5).optional()
    .describe("Search queries per claim in Stage 1 preliminary search (default: 2)"),
  preliminaryMaxSources: z.number().int().min(1).max(10).optional()
    .describe("Max sources to fetch in Stage 1 preliminary search (default: 5)"),
  claimAnnotationMode: z.enum(["off", "verifiability", "verifiability_and_misleadingness"]).optional()
    .describe("Claim annotation mode: off (default), verifiability (adds verifiability field at Stage 1), verifiability_and_misleadingness (adds both)"),
  explanationQualityMode: z.enum(["off", "structural", "rubric"]).optional()
    .describe("Explanation quality check mode: off (default), structural (Tier 1 deterministic checks), rubric (Tier 1 + Tier 2 LLM rubric via configured provider — cost depends on llmProvider setting)"),
  tigerScoreMode: z.enum(["off", "on"]).optional()
    .describe("Holistic TIGERScore evaluation mode: off (default) | on (performs a final holistic quality pass cross-referencing input, evidence, and assessment)"),
  tigerScoreTier: z.enum(["haiku", "sonnet", "opus"]).optional()
    .describe("LEGACY — use tigerScoreStrength instead. Accepted for backward compatibility; normalized to tigerScoreStrength during parsing."),
  tigerScoreStrength: z.enum(["budget", "standard", "premium"]).optional()
    .describe("Model strength for Stage 6 TIGERScore evaluation (default: standard)"),
  tigerScoreTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for Stage 6 TIGERScore evaluation (default: 0.1)"),
  gate1GroundingRetryThreshold: z.number().min(0).max(1).optional()
    .describe("If >X% of claims fail Gate 1, trigger retry loop (default: 0.5)"),

  // === Research Depth (UCM-1) ===
  maxResearchIterations: z.number().int().min(1).max(10).optional()
    .describe("Max research loop iterations. Quick default: 4, deep default: 5."),
  maxSourcesPerIteration: z.number().int().min(1).max(20).optional()
    .describe("Max sources fetched per research iteration (default: 8)."),
  maxTotalSources: z.number().int().min(5).max(100).optional()
    .describe("Max total sources across all iterations. Quick default: 24, deep default: 30."),
  articleMaxChars: z.number().int().min(1000).max(50000).optional()
    .describe("Max characters extracted from article-type inputs (default: 4000 quick, 8000 deep)."),
  minEvidenceItemsRequired: z.number().int().min(1).max(50).optional()
    .describe("Min evidence items required before analysis can proceed. Quick default: 6, deep default: 12."),
  minCategories: z.number().int().min(1).max(10).optional()
    .describe("Min distinct evidence categories required (default: 2)."),

  // === Pipeline-Stage LLM Temperatures (UCM-3) ===
  extractEvidenceTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for evidence extraction LLM calls (default: 0.1)."),
  queryGenerationTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for search query generation (default: 0.2)."),
  relevanceClassificationTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for relevance classification (default: 0.1)."),
  narrativeGenerationTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for narrative/aggregation generation (default: 0.2)."),
  groundingCheckTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for grounding check LLM calls (default: 0.1)."),
  claimContractValidationTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for claim contract validation (default: 0.1)."),
  gate1ValidationTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for Gate 1 claim validation (default: 0.1)."),
  scopeNormalizationTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for scope normalization (default: 0.0)."),
  srCalibrationTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for source reliability calibration (default: 0.1)."),
  advocateTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for advocate verdict generation (default: 0.0)."),

  // Stage 2: Research
  claimSufficiencyThreshold: z.number().int().min(1).max(10).optional()
    .describe("Min evidence items per claim before considering it sufficient (default: 3)"),
  relevanceFloor: z.number().min(0.1).max(0.9).optional()
    .describe("Minimum relevance score (0-1) for a search result to be considered for extraction (default: 0.4)"),
  sourceFetchTimeoutMs: z.number().int().min(1000).max(60000).optional()
    .describe("Timeout in milliseconds for fetching an individual source URL (default: 20000)"),
  minEvidenceContentLength: z.number().int().min(10).max(1000).optional()
    .describe("Minimum character length for fetched source text to be considered usable (default: 100)"),
  fetchSameDomainDelayMs: z.number().int().min(0).max(5000).optional()
    .describe("Stagger delay in milliseconds between same-domain requests within a fetch batch. Reduces fetch-collapse risk when multiple sources share a domain. 0 disables staggering. Default: 500."),
  fetchDomainSkipThreshold: z.number().int().min(0).max(10).optional()
    .describe("After this many consecutive 401/403 failures from the same domain within a fetchSources() call, best-effort skip later same-domain URLs. 0 disables. Default: 2."),
  researchMaxQueriesPerIteration: z.number().int().min(1).max(5).optional()
    .describe("Maximum number of search queries generated per research iteration (default: 3)"),
  sourceExtractionMaxLength: z.number().int().min(1000).max(50000).optional()
    .describe("Maximum characters extracted from an individual source for evidence processing (default: 15000)"),
  maxEvidenceItemsPerSource: z.number().int().min(1).max(50).optional()
    .describe("Maximum evidence items retained per source URL after extraction. Prevents a single verbose source from flooding the evidence pool. Keeps highest probativeValue first. Default: 5. Set to 50 to effectively disable."),
  iterationRetryDelayMs: z.number().int().min(0).max(10000).optional()
    .describe("Delay in milliseconds between retries for transient fetch failures (default: 2000)"),
  sufficiencyMinMainIterations: z.number().int().min(0).max(10).optional()
    .describe("Min main loop iterations that must complete before sufficiency check can fire (default: 1). Prevents seeded preliminary evidence from short-circuiting real Stage 2 research."),
  sufficiencyMinResearchedIterationsPerClaim: z.number().int().min(0).max(5).optional()
    .describe("Per-claim floor: each claim must receive at least this many targeted research iterations before seeded evidence can make it sufficient (default: 1). Prevents heavily-seeded claims from exiting Stage 2 with zero targeted research."),
  contradictionReservedIterations: z.number().int().min(0).max(5).optional()
    .describe("Iterations reserved for contradiction search in ClaimBoundary pipeline (default: 2)"),
  contradictionReservedQueries: z.number().int().min(0).max(10).optional()
    .describe("Query budget reserved per claim for contradiction search (default: 2). Main loop stops when remaining budget equals this value, ensuring contradiction has queries to spend."),
  researchTimeBudgetMs: z.number().int().min(60000).max(3600000).optional()
    .describe("Wall-clock time budget for Stage 2 research loop in ms (default: 600000 = 10 min)"),
  researchZeroYieldBreakThreshold: z.number().int().min(1).max(5).optional()
    .describe("Consecutive zero-yield iterations before breaking research loop (default: 2)"),
  queryStrategyMode: z.enum(["legacy", "pro_con"]).optional()
    .describe("Stage 2 query strategy mode: legacy or pro_con (default: legacy)"),
  perClaimQueryBudget: z.number().int().min(1).max(20).optional()
    .describe("Shared Stage 2 query budget per claim across all query sources (default: 8)"),
  diversityAwareSufficiency: z.boolean().optional()
    .describe("When true, Stage 2 sufficiency also requires source-type/domain diversity (matching D5 thresholds from CalcConfig). Claims with enough items but insufficient diversity will trigger additional research iterations. Default: false (experimental)."),
  preliminaryEvidenceLlmRemapEnabled: z.boolean().optional()
    .describe("When true, unresolved seeded preliminary evidence items (those with semantic slug claim IDs that failed numeric remap) are sent to a single batched Haiku call to determine correct AC_* claim mappings before Stage 2 seeding. Only fires when >1 final claims exist. Fail-open. Default: false."),

  // Stage 3: Clustering
  maxClaimBoundaries: z.number().int().min(2).max(10).optional()
    .describe("Safety cap on boundary count (post-validation merge trigger, not prompt target) (default: 6)"),
  boundaryCoherenceMinimum: z.number().min(0).max(1).optional()
    .describe("Minimum internalCoherence; below this, boundary is flagged (default: 0.3)"),
  boundaryClusteringTemperature: z.number().min(0).max(1).optional()
    .describe("Temperature for Stage 3 boundary clustering (default: 0.05). Lower values reduce structural variance."),
  scopeNormalizationEnabled: z.boolean().optional()
    .describe("Enable LLM-based scope equivalence detection before boundary clustering (default: true). Merges semantically identical EvidenceScopes that differ only in wording."),
  scopeNormalizationMinScopes: z.number().int().min(2).optional()
    .describe("Minimum number of unique scopes to trigger LLM normalization (default: 5). Below this, skip the LLM call."),
  boundaryEvidenceConcentrationWarningThreshold: z.number().min(0.5).max(1).optional()
    .describe("Emit an informational Stage 3 warning when one ClaimAssessmentBoundary exceeds this share of assigned evidence items (default: 0.8)."),

  // Stage 4: Verdict
  selfConsistencyMode: z.enum(["full", "disabled"]).optional()
    .describe("Self-consistency check mode for ClaimBoundary verdicts (default: full)"),
  selfConsistencyTemperature: z.number().min(0.1).max(0.7).optional()
    .describe("Temperature for self-consistency re-runs (floor 0.1, ceiling 0.7) (default: 0.4)"),
  challengerTemperature: z.number().min(0.1).max(0.7).optional()
    .describe("Temperature for adversarial challenger (floor 0.1, ceiling 0.7) (default: 0.3)"),
  calibrationInverseGateAction: z.enum(["warn", "fail"]).optional()
    .describe("Gate action for inverse consistency violations in calibration (default: warn). warn: report only; fail: block diagnosticGatePassed."),
  verdictGroundingPolicy: z.enum(["disabled", "safe_downgrade"]).optional()
    .describe("Integrity policy for grounding failures in verdict validation (default: disabled). " +
      "safe_downgrade forces truthPercentage=50 and caps confidence at 24 on failure — disabled pre-release " +
      "because the grounding check produces false positives that degrade report quality. See UCM_Defaults_Alignment.md."),
  verdictDirectionPolicy: z.enum(["disabled", "retry_once_then_safe_downgrade"]).optional()
    .describe("Integrity policy for direction failures in verdict validation (default: disabled). " +
      "Disabled for same reason as verdictGroundingPolicy — safe_downgrade degrades verdicts on false positives."),
  // === Canonical debate role configuration ===
  debateRoles: z.object({
    advocate: z.object({
      provider: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
      strength: z.enum(["budget", "standard", "premium"]).optional(),
    }).optional(),
    selfConsistency: z.object({
      provider: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
      strength: z.enum(["budget", "standard", "premium"]).optional(),
    }).optional(),
    challenger: z.object({
      provider: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
      strength: z.enum(["budget", "standard", "premium"]).optional(),
    }).optional(),
    reconciler: z.object({
      provider: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
      strength: z.enum(["budget", "standard", "premium"]).optional(),
    }).optional(),
    validation: z.object({
      provider: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
      strength: z.enum(["budget", "standard", "premium"]).optional(),
    }).optional(),
  }).optional()
    .describe("Per-role LLM configuration for cross-provider debate. Each role specifies a provider (vendor) and strength (capability class: budget/standard/premium). Canonical config shape — supersedes debateModelTiers/debateModelProviders."),
  // === Legacy debate role fields (read-compat only — normalized into debateRoles during parsing) ===
  debateModelTiers: z.object({
    advocate: z.enum(["haiku", "sonnet", "opus"]).optional(),
    selfConsistency: z.enum(["haiku", "sonnet", "opus"]).optional(),
    challenger: z.enum(["haiku", "sonnet", "opus"]).optional(),
    reconciler: z.enum(["haiku", "sonnet", "opus"]).optional(),
    validation: z.enum(["haiku", "sonnet", "opus"]).optional(),
  }).optional()
    .describe("LEGACY — use debateRoles instead. Accepted for backward compatibility; normalized into debateRoles during parsing."),
  debateModelProviders: z.object({
    advocate: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
    selfConsistency: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
    challenger: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
    reconciler: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
    validation: z.enum(["anthropic", "openai", "google", "mistral"]).optional(),
  }).optional()
    .describe("LEGACY — use debateRoles instead. Accepted for backward compatibility; normalized into debateRoles during parsing."),
  openaiTpmGuardEnabled: z.boolean().optional()
    .describe("Enable OpenAI TPM guard for Stage 4 debate calls (default: true)."),
  openaiTpmGuardInputTokenThreshold: z.number().int().min(1000).max(200000).optional()
    .describe("Approximate input-token threshold for pre-call OpenAI TPM fallback (default: 24000)."),
  openaiTpmGuardFallbackModel: z.string().min(1).optional()
    .describe("Fallback OpenAI model used by TPM guard (default: gpt-4.1-mini)."),

}).transform((data) => {
  // Runtime migration warnings (no legacy field aliases in v3.1+)
  const warnings: string[] = [];

  if (data.llmProvider === undefined) {
    data.llmProvider = "anthropic";
  }

  if (data.maxTokensPerCall === undefined) {
    data.maxTokensPerCall = 100000;
  }
  if (data.understandMaxChars === undefined) {
    data.understandMaxChars = 12000;
  }
  if (data.understandLlmTimeoutMs === undefined) {
    data.understandLlmTimeoutMs = 600000;
  }
  if (data.extractEvidenceLlmTimeoutMs === undefined) {
    data.extractEvidenceLlmTimeoutMs = 300000;
  }
  if (data.thesisRelevanceValidationEnabled === undefined) {
    data.thesisRelevanceValidationEnabled = true;
  }
  if (data.thesisRelevanceLowConfidenceThreshold === undefined) {
    data.thesisRelevanceLowConfidenceThreshold = 70;
  }
  if (data.thesisRelevanceAutoDowngradeThreshold === undefined) {
    data.thesisRelevanceAutoDowngradeThreshold = 60;
  }
  if (data.minEvidenceForTangential === undefined) {
    data.minEvidenceForTangential = 2;
  }
  if (data.tangentialEvidenceQualityCheckEnabled === undefined) {
    data.tangentialEvidenceQualityCheckEnabled = false;
  }
  if (data.maxOpinionFactors === undefined) {
    data.maxOpinionFactors = 0;
  }
  if (data.opinionAccumulationWarningThreshold === undefined) {
    data.opinionAccumulationWarningThreshold = 70;
  }
  if (data.probativeFilterEnabled === undefined) {
    data.probativeFilterEnabled = true;
  }
  if (data.provenanceValidationEnabled === undefined) {
    data.provenanceValidationEnabled = true;
  }
  if (data.pdfParseTimeoutMs === undefined) {
    data.pdfParseTimeoutMs = 60000;
  }
  if (data.parallelExtractionLimit === undefined) {
    data.parallelExtractionLimit = 3; // Conservative default to avoid rate limiting
  }
  if (data.evidenceSimilarityThreshold === undefined) {
    data.evidenceSimilarityThreshold = 0.4;
  }
  if (data.temporalConfidenceThreshold === undefined) {
    data.temporalConfidenceThreshold = 0.6;
  }
  if (data.recencyWindowMonths === undefined) {
    data.recencyWindowMonths = 6;
  }
  if (data.recencyConfidencePenalty === undefined) {
    data.recencyConfidencePenalty = 20;
  }
  if (data.recencyGraduatedPenalty === undefined) {
    data.recencyGraduatedPenalty = true;
  }
  if (data.confidenceCalibration === undefined) {
    data.confidenceCalibration = {
      enabled: true,
      densityAnchor: { enabled: true, minConfidenceBase: 15, minConfidenceMax: 75, sourceCountThreshold: 3 },
      bandSnapping: { enabled: true, strength: 0.5 },
      verdictCoupling: { enabled: true, strongVerdictThreshold: 70, minConfidenceStrong: 50, minConfidenceNeutral: 25 },
      contextConsistency: { enabled: true, maxConfidenceSpread: 25, reductionFactor: 0.5 },
    };
  }
  if (data.minConfidenceFloor === undefined) {
    data.minConfidenceFloor = 10;
  }
  if (data.lowSourceThreshold === undefined) {
    data.lowSourceThreshold = 2;
  }
  if (data.lowSourceConfidencePenalty === undefined) {
    data.lowSourceConfidencePenalty = 15;
  }
  if (data.recencyCueTerms === undefined) {
    data.recencyCueTerms = [];
  }
  if (data.temporalPromptContractTemplate === undefined) {
    data.temporalPromptContractTemplate = TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptContractTemplate;
  }
  if (data.temporalPromptKnowledgeRuleAllowed === undefined) {
    data.temporalPromptKnowledgeRuleAllowed = TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptKnowledgeRuleAllowed;
  }
  if (data.temporalPromptKnowledgeRuleEvidenceOnly === undefined) {
    data.temporalPromptKnowledgeRuleEvidenceOnly = TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptKnowledgeRuleEvidenceOnly;
  }
  if (data.temporalPromptRecencyRuleSensitive === undefined) {
    data.temporalPromptRecencyRuleSensitive = TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptRecencyRuleSensitive;
  }
  if (data.temporalPromptRecencyRuleGeneral === undefined) {
    data.temporalPromptRecencyRuleGeneral = TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptRecencyRuleGeneral;
  }
  if (data.temporalPromptNoFreshEvidenceRule === undefined) {
    data.temporalPromptNoFreshEvidenceRule = TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptNoFreshEvidenceRule;
  }
  if (data.temporalPromptRelativeTimeRule === undefined) {
    data.temporalPromptRelativeTimeRule = TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptRelativeTimeRule;
  }
  if (data.searchRelevanceLlmMode === undefined) {
    data.searchRelevanceLlmMode = "auto";
  }
  if (data.searchRelevanceLlmMaxCalls === undefined) {
    data.searchRelevanceLlmMaxCalls = 3;
  }
  if (data.searchAdaptiveFallbackMinCandidates === undefined) {
    data.searchAdaptiveFallbackMinCandidates = 5;
  }
  if (data.searchAdaptiveFallbackMaxQueries === undefined) {
    data.searchAdaptiveFallbackMaxQueries = 2;
  }
  if (data.sourceReliabilityCalibrationEnabled === undefined) {
    data.sourceReliabilityCalibrationEnabled = false;
  }
  if (data.sourceReliabilityCalibrationMode === undefined) {
    data.sourceReliabilityCalibrationMode = "off";
  }
  if (data.sourceReliabilityCalibrationStrength === undefined) {
    data.sourceReliabilityCalibrationStrength = "budget";
  }
  if (data.searchMaxResultsCriticism === undefined) {
    data.searchMaxResultsCriticism = 8;
  }
  if (data.searchRetryBeforeFallback === undefined) {
    data.searchRetryBeforeFallback = true;
  }
  if (data.planningMaxSearchQueries === undefined) {
    data.planningMaxSearchQueries = 8;
  }
  if (data.contextClaimsAnchorDivergenceThreshold === undefined) {
    data.contextClaimsAnchorDivergenceThreshold = 15;
  }
  if (data.contextClaimsAnchorClaimsWeight === undefined) {
    data.contextClaimsAnchorClaimsWeight = 0.6;
  }
  if (data.probativeDeduplicationThreshold === undefined) {
    data.probativeDeduplicationThreshold = 0.75;
  }
  if (data.gapResearchEnabled === undefined) {
    data.gapResearchEnabled = true; // Enabled by default for Pipeline Phase 1
  }
  if (data.gapResearchMaxIterations === undefined) {
    data.gapResearchMaxIterations = 2;
  }
  if (data.gapResearchMaxQueries === undefined) {
    data.gapResearchMaxQueries = 8;
  }

  // ClaimBoundary Stage 1 defaults
  if (data.centralityThreshold === undefined) {
    data.centralityThreshold = "medium";
  }
  if (data.claimSpecificityMinimum === undefined) {
    data.claimSpecificityMinimum = 0.6;
  }
  if (data.maxAtomicClaims === undefined) {
    data.maxAtomicClaims = 5;
  }
  if (data.maxAtomicClaimsBase === undefined) {
    data.maxAtomicClaimsBase = 3;
  }
  if (data.atomicClaimsInputCharsPerClaim === undefined) {
    data.atomicClaimsInputCharsPerClaim = 500;
  }
  if (data.claimAtomicityLevel === undefined) {
    data.claimAtomicityLevel = 3;
  }
  if (data.preliminarySearchQueriesPerClaim === undefined) {
    data.preliminarySearchQueriesPerClaim = 2;
  }
  if (data.preliminaryMaxSources === undefined) {
    data.preliminaryMaxSources = 5;
  }
  if (data.gate1GroundingRetryThreshold === undefined) {
    data.gate1GroundingRetryThreshold = 0.5;
  }

  // ClaimBoundary Stage 2 defaults
  if (data.claimSufficiencyThreshold === undefined) {
    data.claimSufficiencyThreshold = 3;
  }
  if (data.sufficiencyMinMainIterations === undefined) {
    data.sufficiencyMinMainIterations = 1;
  }
  if (data.sufficiencyMinResearchedIterationsPerClaim === undefined) {
    data.sufficiencyMinResearchedIterationsPerClaim = 1;
  }
  if (data.contradictionReservedIterations === undefined) {
    data.contradictionReservedIterations = 1;
  }
  if (data.contradictionReservedQueries === undefined) {
    data.contradictionReservedQueries = 2;
  }
  if (data.researchTimeBudgetMs === undefined) {
    data.researchTimeBudgetMs = 10 * 60 * 1000; // 10 minutes
  }
  if (data.researchZeroYieldBreakThreshold === undefined) {
    data.researchZeroYieldBreakThreshold = 2;
  }
  if (data.claimAnnotationMode === undefined) {
    data.claimAnnotationMode = "verifiability_and_misleadingness";
  }
  if (data.tigerScoreMode === undefined) {
    data.tigerScoreMode = "off";
  }
  // tigerScoreTier → tigerScoreStrength normalization (legacy → canonical)
  if (data.tigerScoreStrength === undefined) {
    const LEGACY_MAP: Record<string, "budget" | "standard" | "premium"> = { haiku: "budget", sonnet: "standard", opus: "premium" };
    data.tigerScoreStrength = data.tigerScoreTier ? (LEGACY_MAP[data.tigerScoreTier] ?? "standard") : "standard";
  }
  // Strip legacy field after normalization — no runtime code reads it
  delete data.tigerScoreTier;
  if (data.tigerScoreTemperature === undefined) {
    data.tigerScoreTemperature = 0.1;
  }
  if (data.explanationQualityMode === undefined) {
    data.explanationQualityMode = "rubric";
  }
  if (data.queryStrategyMode === undefined) {
    data.queryStrategyMode = "pro_con";
  }
  if (data.perClaimQueryBudget === undefined) {
    data.perClaimQueryBudget = 8;
  }

  // ClaimBoundary Stage 3 defaults
  if (data.maxClaimBoundaries === undefined) {
    data.maxClaimBoundaries = 6;
  }
  if (data.boundaryCoherenceMinimum === undefined) {
    data.boundaryCoherenceMinimum = 0.3;
  }
  if (data.boundaryClusteringTemperature === undefined) {
    data.boundaryClusteringTemperature = 0.05;
  }
  if (data.scopeNormalizationEnabled === undefined) {
    data.scopeNormalizationEnabled = true;
  }
  if (data.scopeNormalizationMinScopes === undefined) {
    data.scopeNormalizationMinScopes = 5;
  }
  if (data.boundaryEvidenceConcentrationWarningThreshold === undefined) {
    data.boundaryEvidenceConcentrationWarningThreshold = 0.8;
  }

  // ClaimBoundary Stage 4 defaults
  if (data.selfConsistencyMode === undefined) {
    data.selfConsistencyMode = "full";
  }
  if (data.selfConsistencyTemperature === undefined) {
    data.selfConsistencyTemperature = 0.4; // Alpha optimization: matches DEFAULT_PIPELINE_CONFIG
  }
  if (data.challengerTemperature === undefined) {
    data.challengerTemperature = 0.3;
  }
  // === debateRoles canonical normalization ===
  // Merge legacy debateModelTiers + debateModelProviders into canonical debateRoles.
  // Canonical debateRoles fields win when both old and new are present.
  {
    const LEGACY_STRENGTH_MAP: Record<string, "budget" | "standard" | "premium"> = { haiku: "budget", sonnet: "standard", opus: "premium" };
    const inheritedProvider = data.llmProvider ?? "anthropic";
    const ROLE_KEYS = ["advocate", "selfConsistency", "challenger", "reconciler", "validation"] as const;
    const DEFAULT_STRENGTHS: Record<string, "budget" | "standard" | "premium"> = {
      advocate: "standard", selfConsistency: "standard", challenger: "standard", reconciler: "standard", validation: "budget",
    };
    const DEFAULT_PROVIDERS: Record<string, string> = {
      advocate: inheritedProvider, selfConsistency: inheritedProvider, challenger: "openai", reconciler: inheritedProvider, validation: inheritedProvider,
    };

    const legacyTiers = data.debateModelTiers;
    const legacyProviders = data.debateModelProviders;
    const canonical = data.debateRoles ?? {} as NonNullable<typeof data.debateRoles>;

    const merged: Record<string, { provider: "anthropic" | "openai" | "google" | "mistral"; strength: "budget" | "standard" | "premium" }> = {};
    for (const role of ROLE_KEYS) {
      const canonicalRole = canonical?.[role];
      // Strength: canonical wins > legacy tier mapped > default
      const strength = canonicalRole?.strength
        ?? (legacyTiers?.[role] ? LEGACY_STRENGTH_MAP[legacyTiers[role]!] ?? "standard" : undefined)
        ?? DEFAULT_STRENGTHS[role];
      // Provider: canonical wins > legacy provider > default
      const provider = canonicalRole?.provider
        ?? legacyProviders?.[role]
        ?? DEFAULT_PROVIDERS[role];
      merged[role] = { provider: provider as "anthropic" | "openai" | "google" | "mistral", strength };
    }
    data.debateRoles = merged as typeof data.debateRoles;
  }

  // Strip legacy fields after normalization — no runtime code reads them
  delete data.debateModelTiers;
  delete data.debateModelProviders;
  if (data.calibrationInverseGateAction === undefined) {
    data.calibrationInverseGateAction = "warn";
  }
  if (data.verdictGroundingPolicy === undefined) {
    data.verdictGroundingPolicy = "disabled";
  }
  if (data.verdictDirectionPolicy === undefined) {
    data.verdictDirectionPolicy = "retry_once_then_safe_downgrade";
  }
  if (data.openaiTpmGuardEnabled === undefined) {
    data.openaiTpmGuardEnabled = true;
  }
  if (data.openaiTpmGuardInputTokenThreshold === undefined) {
    data.openaiTpmGuardInputTokenThreshold = 24000;
  }
  if (data.openaiTpmGuardFallbackModel === undefined) {
    data.openaiTpmGuardFallbackModel = "gpt-4.1-mini";
  }

  if (warnings.length > 0) {
    console.warn(`[DEPRECATED] Pipeline config keys migrated: ${warnings.join(", ")}`);
  }

  return data;
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  // Model selection
  llmProvider: "anthropic",
  llmTiering: true,
  modelUnderstand: "budget",
  modelExtractEvidence: "budget",
  modelVerdict: "standard",
  modelOpus: "premium",

  // LLM text analysis (all enabled by default per v2.8.3)
  llmInputClassification: true,
  llmEvidenceQuality: true,
  llmContextSimilarity: true, // NEW: Use new key name
  llmVerdictValidation: true,

  // Heuristic fallback controls (Phase 4)
  allowQualityFallbacks: false, // Strict by default for quality-impacting tasks
  allowNonQualityFallbacks: true, // Graceful degradation for non-quality tasks
  heuristicCircuitBreakerThreshold: 3, // Surface error after 3 consecutive failures

  // Analysis behavior
  analysisMode: "quick", // v2.9.0: Default to quick mode for backwards compatibility
  allowModelKnowledge: false, // v2.9.0: Default to off for backwards compatibility
  deterministic: true,
  understandTemperature: 0.15,
  understandMinClaimThreshold: 4,
  keyFactorHints: undefined,
  understandMaxChars: 12000,
  understandLlmTimeoutMs: 600000,
  extractEvidenceLlmTimeoutMs: 300000,
  thesisRelevanceValidationEnabled: true,
  thesisRelevanceLowConfidenceThreshold: 70,
  thesisRelevanceAutoDowngradeThreshold: 60,
  minEvidenceForTangential: 2,
  tangentialEvidenceQualityCheckEnabled: false,
  maxOpinionFactors: 0,
  opinionAccumulationWarningThreshold: 70,
  probativeFilterEnabled: true,
  provenanceValidationEnabled: true,
  pdfParseTimeoutMs: 60000,
  parallelExtractionLimit: 3, // Conservative default; can increase for providers with higher rate limits

  // Pipeline thresholds
  evidenceSimilarityThreshold: 0.4,
  temporalConfidenceThreshold: 0.6,
  recencyWindowMonths: 6,
  recencyConfidencePenalty: 20,
  recencyGraduatedPenalty: true,
  confidenceCalibration: {
    enabled: true,
    densityAnchor: { enabled: true, minConfidenceBase: 15, minConfidenceMax: 75, sourceCountThreshold: 3 },
    bandSnapping: { enabled: true, strength: 0.5 },
    verdictCoupling: { enabled: true, strongVerdictThreshold: 70, minConfidenceStrong: 50, minConfidenceNeutral: 25 },
    contextConsistency: { enabled: true, maxConfidenceSpread: 25, reductionFactor: 0.5 },
  },
  minConfidenceFloor: 10,
  lowSourceThreshold: 2,
  lowSourceConfidencePenalty: 15,
  recencyCueTerms: [],
  temporalPromptContractTemplate: TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptContractTemplate,
  temporalPromptKnowledgeRuleAllowed: TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptKnowledgeRuleAllowed,
  temporalPromptKnowledgeRuleEvidenceOnly: TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptKnowledgeRuleEvidenceOnly,
  temporalPromptRecencyRuleSensitive: TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptRecencyRuleSensitive,
  temporalPromptRecencyRuleGeneral: TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptRecencyRuleGeneral,
  temporalPromptNoFreshEvidenceRule: TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptNoFreshEvidenceRule,
  temporalPromptRelativeTimeRule: TEMPORAL_PROMPT_TEXT_DEFAULTS.temporalPromptRelativeTimeRule,
  searchRelevanceLlmMode: "auto",
  searchRelevanceLlmMaxCalls: 3,
  searchAdaptiveFallbackMinCandidates: 5,
  searchAdaptiveFallbackMaxQueries: 2,
  searchMaxResultsCriticism: 8,
  searchRetryBeforeFallback: true,
  planningMaxSearchQueries: 8,
  contextClaimsAnchorDivergenceThreshold: 15,
  contextClaimsAnchorClaimsWeight: 0.6,
  probativeDeduplicationThreshold: 0.75,
  foreignJurisdictionRelevanceCap: 0.35,
  relevanceTopNFetch: 5,
  applicabilityFilterEnabled: true,
  evidenceWeightingEnabled: false,
  sourceReliabilityCalibrationEnabled: false,
  sourceReliabilityCalibrationMode: "off",
  sourceReliabilityCalibrationStrength: "budget",

  // Budget controls — v2.11.1: reduced from v2.8.2 highs for cost optimization
  verdictBatchSize: 5,
  maxIterationsPerContext: 3, // v2.11.1: was 5 - balance cost vs research depth
  maxTotalIterations: 10, // v2.11.1: was 20 - cap deep research loops
  maxTotalTokens: 1000000, // Alpha optimization: increased from 750k for deep runs
  maxTokensPerCall: 100000,
  enforceBudgets: false,
  claimAnnotationMode: "verifiability_and_misleadingness",
  tigerScoreMode: "off",
  tigerScoreStrength: "standard",
  tigerScoreTemperature: 0.1,
  explanationQualityMode: "rubric",
  selfConsistencyTemperature: 0.4,
  challengerTemperature: 0.3,
  // Canonical debate role configuration
  debateRoles: {
    advocate: { provider: "anthropic", strength: "standard" },
    selfConsistency: { provider: "anthropic", strength: "standard" },
    challenger: { provider: "openai", strength: "standard" },
    reconciler: { provider: "anthropic", strength: "standard" },
    validation: { provider: "anthropic", strength: "budget" },
  },
  calibrationInverseGateAction: "warn",
  verdictGroundingPolicy: "disabled",
  verdictDirectionPolicy: "retry_once_then_safe_downgrade",
  queryStrategyMode: "pro_con",
  perClaimQueryBudget: 8,
  boundaryClusteringTemperature: 0.05,

  // Gap-driven research (Pipeline Phase 1)
  gapResearchEnabled: true,
  gapResearchMaxIterations: 2,
  gapResearchMaxQueries: 8,

  // ClaimBoundary Stage 1 defaults
  centralityThreshold: "medium",
  claimSpecificityMinimum: 0.6,
  maxAtomicClaims: 5,
  maxAtomicClaimsBase: 3,
  atomicClaimsInputCharsPerClaim: 500,
  claimAtomicityLevel: 3,
  preliminarySearchQueriesPerClaim: 2,
  preliminaryMaxSources: 5,
  gate1GroundingRetryThreshold: 0.5,

  // Research Depth defaults (UCM-1) — "quick" mode values; deep mode uses analysisMode toggle
  maxResearchIterations: 4,
  maxSourcesPerIteration: 8,
  maxTotalSources: 24,
  articleMaxChars: 4000,
  minEvidenceItemsRequired: 6,
  minCategories: 2,

  // Pipeline-Stage LLM Temperature defaults (UCM-3)
  extractEvidenceTemperature: 0.1,
  queryGenerationTemperature: 0.2,
  relevanceClassificationTemperature: 0.1,
  narrativeGenerationTemperature: 0.2,
  groundingCheckTemperature: 0.1,
  claimContractValidationTemperature: 0.1,
  gate1ValidationTemperature: 0.1,
  scopeNormalizationTemperature: 0.0,
  srCalibrationTemperature: 0.1,
  advocateTemperature: 0.0,

  // ClaimBoundary Stage 2 defaults
  claimSufficiencyThreshold: 3,
  relevanceFloor: 0.4,
  sourceFetchTimeoutMs: 20000,
  minEvidenceContentLength: 100,
  fetchSameDomainDelayMs: 500,
  fetchDomainSkipThreshold: 2,
  researchMaxQueriesPerIteration: 3,
  sourceExtractionMaxLength: 15000,
  maxEvidenceItemsPerSource: 5,
  iterationRetryDelayMs: 2000,
  sufficiencyMinMainIterations: 1,
  sufficiencyMinResearchedIterationsPerClaim: 1,
  contradictionReservedIterations: 1,
  contradictionReservedQueries: 2,
  researchTimeBudgetMs: 10 * 60 * 1000,
  researchZeroYieldBreakThreshold: 2,
  diversityAwareSufficiency: true,
  preliminaryEvidenceLlmRemapEnabled: true,

  // ClaimBoundary Stage 3 defaults
  maxClaimBoundaries: 6,
  boundaryCoherenceMinimum: 0.3,
  scopeNormalizationEnabled: true,
  scopeNormalizationMinScopes: 5,
  boundaryEvidenceConcentrationWarningThreshold: 0.8,

  // ClaimBoundary Stage 4 defaults
  selfConsistencyMode: "full",

  openaiTpmGuardEnabled: true,
  openaiTpmGuardInputTokenThreshold: 24000,
  openaiTpmGuardFallbackModel: "gpt-4.1-mini",
};

// ============================================================================
// SOURCE RELIABILITY CONFIG SCHEMA (3.0.0)
// ============================================================================
// Tier 2 operational config for Source Reliability service.
// IMPORTANT: This config is kept SEPARATE for SR modularity (future extraction).
// See: Docs/REVIEWS/Unified_Configuration_Management_Plan.md - SR Modularity Architecture

export const SourceReliabilityConfigSchema = z.object({
  // === Core Settings ===
  enabled: z.boolean().describe("Enable source reliability scoring"),
  multiModel: z.boolean().describe("Use multi-model consensus (Claude + OpenAI)"),
  openaiModel: z.string().min(1).describe("OpenAI model for secondary evaluation"),

  // === Thresholds ===
  confidenceThreshold: z.number().min(0).max(1).describe("Minimum confidence to accept a score"),
  consensusThreshold: z.number().min(0).max(1).describe("Max score difference between models for consensus"),

  // === Cache Settings ===
  cacheTtlDays: z.number().int().min(1).max(365).describe("Cache TTL in days"),

  // === Filtering ===
  filterEnabled: z.boolean().describe("Skip evaluation for low-value domains"),
  skipPlatforms: z.array(z.string()).describe("Platform domains to skip (e.g., blogspot.com)"),
  skipTlds: z.array(z.string()).describe("TLDs to skip (e.g., xyz, top)"),

  // === Rate Limiting ===
  rateLimitPerIp: z.number().int().min(1).max(100).optional().describe("Max evaluations per IP per minute"),
  domainCooldownSec: z.number().int().min(0).max(3600).optional().describe("Cooldown between re-evaluating same domain"),

  // === Evaluation Search ===
  evalUseSearch: z.boolean().optional().describe("Enable web search for SR evaluation evidence (default: true)"),

  /**
   * SR-owned evaluation search settings.
   */
  evaluationSearch: z.object({
    provider: z.enum(["auto", "google-cse", "serpapi", "brave", "serper"]).default("auto"),
    maxResultsPerQuery: z.number().int().min(1).max(10).default(3),
    maxEvidenceItems: z.number().int().min(1).max(40).default(30).describe("Maximum evidence items collected before LLM relevance filtering"),
    dateRestrict: z.enum(["y", "m", "w"]).nullable().default(null),
    timeoutMs: z.number().int().min(5000).max(60000).default(15000),
    providers: z.object({
      googleCse: z.object({ enabled: z.boolean(), priority: z.number().int(), dailyQuotaLimit: z.number().int().optional() }).default({ enabled: true, priority: 1, dailyQuotaLimit: 0 }),
      serper: z.object({ enabled: z.boolean(), priority: z.number().int(), dailyQuotaLimit: z.number().int().optional() }).default({ enabled: true, priority: 2, dailyQuotaLimit: 0 }),
      serpapi: z.object({ enabled: z.boolean(), priority: z.number().int(), dailyQuotaLimit: z.number().int().optional() }).default({ enabled: true, priority: 3, dailyQuotaLimit: 0 }),
      brave: z.object({ enabled: z.boolean(), priority: z.number().int(), dailyQuotaLimit: z.number().int().optional() }).default({ enabled: true, priority: 4, dailyQuotaLimit: 0 }),
    }).default({}),
  }).optional().describe("SR-owned search settings for evaluation evidence collection"),

  // === Evidence Quality Assessment (SR-owned enrichment step) ===
  evidenceQualityAssessment: z.object({
    enabled: z.boolean().default(true).describe("Enable evidence quality enrichment before SR evaluation"),
    model: z.string().min(1).default("haiku").describe("Model alias or ID for SR evidence quality assessment"),
    timeoutMs: z.number().int().min(1000).max(30000).default(8000).describe("Timeout for SR evidence quality assessment call (ms)"),
    maxItemsPerAssessment: z.number().int().min(1).max(40).default(30).describe("Maximum evidence items sent to quality assessment (independent cap)"),
    minRemainingBudgetMs: z.number().int().min(0).max(120000).default(20000).describe("Skip quality assessment when remaining per-domain budget is below this threshold"),
  }).optional().describe("SR-owned evidence quality enrichment settings"),

  // === Performance & Reliability ===
  evalConcurrency: z.number().int().min(1).max(10).optional().describe("Max concurrent SR evaluations (default: 5)"),
  evalTimeoutMs: z.number().int().min(10000).max(300000).optional().describe("Timeout for individual SR evaluations (ms) (default: 90000)"),
  defaultConfidence: z.number().min(0).max(1).optional().describe("Default confidence for missing track records (default: 0.8)"),

});

export type SourceReliabilityConfig = z.infer<typeof SourceReliabilityConfigSchema>;

export const DEFAULT_SR_CONFIG: SourceReliabilityConfig = {
  // Core settings
  enabled: true,
  multiModel: true,
  openaiModel: "gpt-4.1-mini",

  // Thresholds
  confidenceThreshold: 0.8,
  consensusThreshold: 0.20,

  // Cache
  cacheTtlDays: 90,

  // Filtering
  filterEnabled: true,
  skipPlatforms: ["blogspot.", "wordpress.com", "medium.com", "substack.com"],
  skipTlds: ["xyz", "top", "club", "icu", "buzz", "tk", "ml", "ga", "cf", "gq"],

  // Rate limiting
  rateLimitPerIp: 10,
  domainCooldownSec: 60,

  // Evaluation search
  evalUseSearch: true,
  evaluationSearch: {
    provider: "auto",
    maxResultsPerQuery: 3,
    maxEvidenceItems: 30,
    dateRestrict: null,
    timeoutMs: 15000,
    providers: {
      googleCse: { enabled: true, priority: 1, dailyQuotaLimit: 0 },
      serper: { enabled: true, priority: 2, dailyQuotaLimit: 0 },
      serpapi: { enabled: true, priority: 3, dailyQuotaLimit: 0 },
      brave: { enabled: true, priority: 4, dailyQuotaLimit: 0 },
    },
  },
  evidenceQualityAssessment: {
    enabled: true,
    model: "haiku",
    timeoutMs: 8000,
    maxItemsPerAssessment: 30,
    minRemainingBudgetMs: 20000,
  },
  evalConcurrency: 5,
  evalTimeoutMs: 90000,
  defaultConfidence: 0.8,
};

// ============================================================================
// CALCULATION CONFIG SCHEMA (3.0.0)
// ============================================================================

// Helper: Integer tuple with min <= max validation
const IntRangeTuple = z
  .tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)])
  .refine(([min, max]) => min <= max, "Range min must be <= max");

// Verdict bands type
type VerdictBands = {
  true: [number, number];
  mostlyTrue: [number, number];
  leaningTrue: [number, number];
  mixed: [number, number];
  leaningFalse: [number, number];
  mostlyFalse: [number, number];
  false: [number, number];
};

// Centrality weights type
type CentralityWeights = {
  high: number;
  medium: number;
  low: number;
};

// Quality gates type
type QualityGates = {
  gate1OpinionThreshold: number;
  gate1SpecificityThreshold: number;
  gate1MinContentWords: number;
  gate4MinSourcesHigh: number;
  gate4MinSourcesMedium: number;
  gate4QualityThresholdHigh: number;
  gate4QualityThresholdMedium: number;
  gate4AgreementThresholdHigh: number;
  gate4AgreementThresholdMedium: number;
};

// Validators for calculation config
function validateBandsContiguous(bands: VerdictBands): boolean {
  const ordered: (keyof VerdictBands)[] = [
    "false",
    "mostlyFalse",
    "leaningFalse",
    "mixed",
    "leaningTrue",
    "mostlyTrue",
    "true",
  ];
  for (let i = 0; i < ordered.length - 1; i++) {
    const current = bands[ordered[i]];
    const next = bands[ordered[i + 1]];
    if (current[1] + 1 !== next[0]) return false;
  }
  return true;
}

function validateBandsComplete(bands: VerdictBands): boolean {
  return bands.false[0] === 0 && bands.true[1] === 100;
}

function validateCentralityMonotonic(weights: CentralityWeights): boolean {
  return weights.high >= weights.medium && weights.medium >= weights.low;
}

function validateGate4Hierarchy(gates: QualityGates): boolean {
  return (
    gates.gate4MinSourcesHigh >= gates.gate4MinSourcesMedium &&
    gates.gate4QualityThresholdHigh >= gates.gate4QualityThresholdMedium &&
    gates.gate4AgreementThresholdHigh >= gates.gate4AgreementThresholdMedium
  );
}

export const CalcConfigSchema = z.object({
  // verdictBands: System constant defined in truth-scale.ts — NOT configurable via UCM.
  // Accepted here as optional for backwards compatibility with existing config.db entries,
  // but the values are ignored at runtime.
  verdictBands: z
    .object({
      true: IntRangeTuple,
      mostlyTrue: IntRangeTuple,
      leaningTrue: IntRangeTuple,
      mixed: IntRangeTuple,
      leaningFalse: IntRangeTuple,
      mostlyFalse: IntRangeTuple,
      false: IntRangeTuple,
    })
    .refine(validateBandsContiguous, "Verdict bands must be contiguous")
    .refine(validateBandsComplete, "Bands must cover 0-100 completely")
    .optional(),

  aggregation: z.object({
    centralityWeights: z
      .object({
        high: z.number().min(1).max(10),
        medium: z.number().min(1).max(10),
        low: z.number().min(0.1).max(5),
      })
      .refine(
        validateCentralityMonotonic,
        "Centrality weights must be monotonic: high >= medium >= low",
      ),
    harmPotentialMultiplier: z.number().min(1).max(5),
    // ClaimBoundary Stage 5: 4-level harmPotentialMultipliers (replaces single scalar above for CB pipeline)
    harmPotentialMultipliers: z.object({
      critical: z.number().min(1).max(2),
      high: z.number().min(1).max(2),
      medium: z.number().min(0.8).max(1.2),
      low: z.number().min(0.8).max(1.2),
    }).optional(),
    // ClaimBoundary Stage 5: Triangulation (cross-boundary evidence agreement)
    triangulation: z.object({
      strongAgreementBoost: z.number().min(0).max(0.5),
      moderateAgreementBoost: z.number().min(0).max(0.2),
      singleBoundaryPenalty: z.number().min(-0.3).max(0),
      conflictedFlag: z.boolean(),
    }).optional(),
    // ClaimBoundary Stage 5: Derivative evidence weight reduction
    derivativeMultiplier: z.number().min(0).max(1).optional(),
    anchorClaimMultiplier: z.number().min(1).max(10).optional()
      .describe("Additional weight multiplier for direct claims that preserve a truth-condition-bearing modifier or anchor from the input."),
    articleAdjudication: z.object({
      enabled: z.boolean().describe("Enable LLM-led article adjudication on direction-conflict inputs (Option G). When disabled, baseline weighted average is always used."),
      maxDeviationFromBaseline: z.number().min(0).max(50).describe("Maximum deviation (percentage points) the LLM adjudication can move article truth from the baseline weighted average. Default 30."),
      borderlineMargin: z.number().min(0).max(25).describe("Claims within [50 - margin, 50 + margin] are treated as borderline and excluded from direction conflict detection. Default 10."),
    }).optional().describe("Article-level LLM adjudication configuration (Option G). Fires only when direct claims disagree in direction."),
    contestationWeights: z.object({
      established: z.number().min(0).max(1),
      disputed: z.number().min(0).max(1),
      opinion: z.number().min(0).max(1),
    }),
  }),

  sourceReliability: z.object({
    // Consumer fallback for unknown/unrated sources (SR module itself returns null).
    defaultScore: z.number().min(0).max(1).nullable()
      .describe("Fallback score for unknown sources. null = exclude unknown sources from weight calculation (recommended)."),
    // Deprecated (moved to SR config): accepted only for backward compatibility with older stored configs.
    confidenceThreshold: z.number().min(0).max(1).optional(),
    consensusThreshold: z.number().min(0).max(1).optional(),
  }),

  sourceReliabilityCalibration: z.object({
    truthDeltaMax: z.number().int().min(0).max(20),
    confidenceDeltaMax: z.number().int().min(0).max(30),
    maxSourcesPerSide: z.number().int().min(1).max(10),
    reasoningMaxChars: z.number().int().min(20).max(300),
    targetMaxInputTokens: z.number().int().min(500).max(4000),
    minKnownSourcesPerSide: z.number().int().min(0).max(5),
    unknownDominanceThreshold: z.number().min(0).max(1),
  }).optional(),

  qualityGates: z
    .object({
      gate1OpinionThreshold: z.number().min(0).max(1),
      gate1SpecificityThreshold: z.number().min(0).max(1),
      gate1MinContentWords: z.number().int().min(1).max(20),
      gate4MinSourcesHigh: z.number().int().min(1).max(10),
      gate4MinSourcesMedium: z.number().int().min(1).max(10),
      gate4QualityThresholdHigh: z.number().min(0).max(1),
      gate4QualityThresholdMedium: z.number().min(0).max(1),
      gate4AgreementThresholdHigh: z.number().min(0).max(1),
      gate4AgreementThresholdMedium: z.number().min(0).max(1),
    })
    .refine(
      validateGate4Hierarchy,
      "Gate 4 'High' thresholds must be >= 'Medium' thresholds",
    ),

  contestationPenalties: z
    .object({
      established: z.number().int().min(-50).max(0),
      disputed: z.number().int().min(-50).max(0),
    })
    .refine(
      (p) => p.established <= p.disputed,
      "Established penalty should be >= disputed (more severe)",
    ),

  deduplication: z.object({
    evidenceScopeThreshold: z.number().min(0).max(1),
    claimSimilarityThreshold: z.number().min(0).max(1),
    contextMergeThreshold: z.number().min(0).max(1),
  }),

  mixedConfidenceThreshold: z.number().int().min(0).max(100),

  /**
   * Deterministic safety net for verdict direction validation.
   * Maximum allowed difference (as ratio 0-1) between weighted evidence ratio
   * and verdict truth percentage before an integrity failure is enforced.
   * Default: 0.15 (15pp).
   */
  verdictIntegrityTolerance: z.number().min(0).max(0.5).optional(),
  /**
   * Lower bound for the "mixed evidence" range in direction plausibility Rule 2.
   * Verdicts in the mixed truth range (31-69%) pass the direction check if the
   * evidence ratio is within [floor, 1-floor]. Default: 0.3.
   */
  directionMixedEvidenceFloor: z.number().min(0.1).max(0.5).optional(),

  // ClaimBoundary Stage 5: probative value multipliers for claim influence weighting
  probativeValueWeights: z
    .object({
      high: z.number().min(0).max(2),
      medium: z.number().min(0).max(2),
      low: z.number().min(0).max(2),
    })
    .optional(),

  // ClaimBoundary Stage 4: Self-consistency spread thresholds (percentage points)
  selfConsistencySpreadThresholds: z.object({
    stable: z.number().int().min(0).max(20),
    moderate: z.number().int().min(0).max(30),
    unstable: z.number().int().min(0).max(50),
  }).optional(),

  verdictStage: z.object({
    spreadMultipliers: z.object({
      highlyStable: z.number().min(0.5).max(1.5),
      moderatelyStable: z.number().min(0.5).max(1.5),
      unstable: z.number().min(0.1).max(1.0),
      highlyUnstable: z.number().min(0.1).max(1.0),
    }),
    institutionalSourceTypes: z.array(z.string()).optional().describe("Source types routed to advocate (default: peer_reviewed_study, fact_check_report, etc.)"),
    generalSourceTypes: z.array(z.string()).optional().describe("Source types routed to challenger (default: news_primary, expert_statement, etc.)"),
  }).optional(),

  evidenceFilter: z.object({
    minStatementLength: z.number().int().min(5).max(100),
    maxVaguePhraseCount: z.number().int().min(0).max(10),
    requireSourceExcerpt: z.boolean(),
    minExcerptLength: z.number().int().min(10).max(200),
    requireSourceUrl: z.boolean(),
  }).optional(),

  claimDecomposition: z.object({
    minCoreClaimsPerContext: z.number().int().min(1).max(10),
    minTotalClaimsWithSingleCore: z.number().int().min(1).max(10),
    minDirectClaimsPerContext: z.number().int().min(1).max(10),
    supplementalRepromptMaxAttempts: z.number().int().min(0).max(5),
    shortSimpleInputMaxChars: z.number().int().min(20).max(200),
  }).optional(),

  claimContractValidation: z.object({
    enabled: z.boolean(),
    maxRetries: z.number().int().min(0).max(3),
  }).optional(),

  contextSimilarity: z.object({
    nameWeight: z.number().min(0).max(1),
    primaryMetadataWeight: z.number().min(0).max(1),
    assessedStatementWeight: z.number().min(0).max(1),
    subjectWeight: z.number().min(0).max(1),
    secondaryMetadataWeight: z.number().min(0).max(1),
    nearDuplicateAssessedThreshold: z.number().min(0).max(1),
    nearDuplicateForceScore: z.number().min(0).max(1),
    nearDuplicateSubjectGuardThreshold: z.number().min(0).max(1).optional(),
    nearDuplicateNameGuardThreshold: z.number().min(0).max(1).optional(),
    nearDuplicateMinNameSim: z.number().min(0).max(1).optional(),
    nearDuplicateMinPrimarySim: z.number().min(0).max(1).optional(),
    anchorRecoveryThreshold: z.number().min(0).max(1).optional(),
    fallbackEvidenceCapPercent: z.number().int().min(10).max(100).optional(),
  }).optional(),

  tangentialPruning: z.object({
    minEvidenceForTangential: z.number().int().min(0).max(10),
  }).optional(),

  claimClustering: z.object({
    jaccardSimilarityThreshold: z.number().min(0).max(1),
    duplicateWeightShare: z.number().min(0).max(1),
  }).optional(),

  fallback: z.object({
    step1RelaxInstitution: z.boolean(),
    step2RelevanceFloor: z.number().min(0).max(1),
    step3BroadEnabled: z.boolean(),
  }).optional(),

  provenanceValidation: z.object({
    minExcerptLength: z.number().int().min(10).max(100),
  }).optional(),

  riskTiers: z.object({
    highConfidenceThreshold: z.number().int().min(50).max(90),
    mediumConfidenceThreshold: z.number().int().min(20).max(70),
  }).optional(),

  contextRefinement: z.object({
    minAssignmentCoverage: z.number().min(0).max(1),
    maxEvidenceCeiling: z.number().int().min(5).max(20),
    oldToNewSimilarityThreshold: z.number().min(0).max(1),
  }).optional(),

  frameSignal: z.object({
    nameDistinctnessThreshold: z.number().min(0).max(1),
    assessedDistinctnessThreshold: z.number().min(0).max(1),
  }).optional(),

  processing: z.object({
    similarityBatchSize: z.number().int().min(1).max(100),
    maxEvidenceSelection: z.number().int().min(1).max(50),
    maxContextsPerClaim: z.number().int().min(1).max(20),
  }).optional(),

  groundingPenalty: z.object({
    /** Enable/disable grounding penalty for confidence calibration */
    enabled: z.boolean(),
    /** Grounding ratio below this triggers a penalty (0-1) */
    threshold: z.number().min(0).max(1),
    /** How aggressively to reduce confidence (0-1, applied as * 100 percentage points max) */
    reductionFactor: z.number().min(0).max(1),
    /** Minimum grounding ratio before maximum penalty applies (0-1) */
    floorRatio: z.number().min(0).max(1),
  }).optional(),

  /**
   * Minimum confidence required for high-harm claims before a definitive verdict
   * is issued. Claims with harmPotential "critical" or "high" that fall below this
   * threshold are downgraded to UNVERIFIED.
   *
   * Addresses C8 (advisory-only validation) from political bias analysis.
   * Default 50 — high-harm claims need at least 50% confidence for a definitive verdict.
   */
  highHarmMinConfidence: z.number().int().min(0).max(100).optional(),

  // === Recency Penalty Internals (UCM-4) ===
  recencyVolatilityMultipliers: z.object({
    week: z.number().min(0).max(2),
    month: z.number().min(0).max(2),
    year: z.number().min(0).max(2),
    none: z.number().min(0).max(2),
  }).optional().describe("Topic volatility multipliers for recency penalty calculation. Higher = more penalty for stale evidence."),
  recencyVolumeAttenuationBrackets: z.array(z.object({
    maxCount: z.number().int().min(0).max(1000),
    multiplier: z.number().min(0).max(2),
  })).optional().describe("Evidence volume attenuation brackets: [{maxCount, multiplier}]. Applied in order by maxCount ascending."),
  recencyVolumeAttenuationFallback: z.number().min(0).max(2).optional()
    .describe("Fallback volume attenuation multiplier when evidence count exceeds all bracket maxCount values (default: 0.5)."),

  // === Temporal Guard (UCM-5) ===
  temporalGuardConfidenceCeiling: z.number().int().min(10).max(100).optional()
    .describe("Confidence ceiling for recency-sensitive claims with ungrounded temporal status (default: 45)."),

  /**
   * Evidence pool balance skew threshold (0.0–1.0).
   * If the ratio of supporting/(supporting+contradicting) evidence exceeds this
   * threshold (or falls below 1-threshold), a warning is emitted.
   * Default 0.8 — warns when >80% of directional evidence points one way.
   * Set to 1.0 to disable.
   * Addresses C13 (evidence pool bias) from political bias analysis.
   */
  evidenceBalanceSkewThreshold: z.number().min(0.5).max(1).optional(),

  /**
   * Minimum directional evidence items (supporting + contradicting) required
   * before evidence balance skew detection activates.
   * Below this count, skew is statistically meaningless.
   * Default 3.
   */
  evidenceBalanceMinDirectional: z.number().int().min(1).max(20).optional(),

  /**
   * D5 Control 1: Evidence Sufficiency Gate — minimum evidence items per claim.
   * Claims with fewer mapped evidence items are set to UNVERIFIED (confidence 0).
   * Default 3.
   */
  evidenceSufficiencyMinItems: z.number().int().min(1).max(20).optional(),

  /**
   * D5 Control 1: Evidence Sufficiency Gate — minimum distinct source types per claim.
   * Claims with fewer distinct sourceType values in their evidence are set to UNVERIFIED (confidence 0).
   * Default 2.
   */
  evidenceSufficiencyMinSourceTypes: z.number().int().min(1).max(10).optional(),

  /**
   * D5 Control 1: Evidence Sufficiency Gate — minimum distinct normalized domains per claim.
   * Domain normalization rules:
   * - Parse hostname from sourceUrl
   * - Lowercase
   * - Strip leading "www."
   * Claims pass source-diversity sufficiency when EITHER sourceType diversity OR
   * normalized domain diversity meets threshold.
   * Default 3.
   */
  evidenceSufficiencyMinDistinctDomains: z.number().int().min(1).max(20).optional(),

  /**
   * D5 Control 1: authoritative directional sufficiency shortcut.
   * Minimum directional evidence items required before a claim may bypass
   * source-diversity thresholds using only authoritative same-direction evidence.
   * Default 2.
   */
  evidenceSufficiencyAuthoritativeDirectionalMinItems: z.number().int().min(1).max(10).optional(),

  /**
   * D5 Control 1: authoritative source types eligible for the directional
   * sufficiency shortcut. Default: government_report, legal_document.
   */
  evidenceSufficiencyAuthoritativeDirectionalSourceTypes: z.array(z.string()).min(1).max(10).optional(),

  /**
   * D5 Control 2: Evidence Partitioning — route institutional sources to advocate
   * and general sources to challenger for structural independence.
   * When enabled, advocate sees institutional evidence (peer_reviewed_study,
   * fact_check_report, government_report, legal_document, organization_report)
   * and challenger sees general evidence (news_primary, news_secondary,
   * expert_statement, other). Reconciler and validator always see full pool.
   * Falls back to full pool if either partition has <2 items.
   * Default: true.
   */
  evidencePartitioningEnabled: z.boolean().optional(),

  /**
   * D5 Control 3: Contrarian Retrieval — enabled flag.
   * When evidence pool imbalance is detected, trigger additional searches
   * seeking evidence in the underrepresented direction.
   * Default: true.
   */
  contrarianRetrievalEnabled: z.boolean().optional(),

  /**
   * D5 Control 3: Maximum contrarian queries generated per claim.
   * Controls the cost of the contrarian search pass.
   * Default: 2.
   */
  contrarianMaxQueriesPerClaim: z.number().int().min(0).max(4).optional(),

  /**
   * D5 Control 3: Runtime ceiling for contrarian retrieval as a percentage
   * of the total pipeline budget. Skip contrarian pass if approaching this limit.
   * Default: 15 (%).
   */
  contrarianRuntimeCeilingPct: z.number().min(5).max(50).optional(),

  /**
   * Harm levels that trigger the high-harm confidence floor.
   * Claims with harmPotential matching any of these levels AND confidence below
   * highHarmMinConfidence will be downgraded to UNVERIFIED.
   * Default: ["critical", "high"].
   */
  highHarmFloorLevels: z.array(z.enum(["critical", "high", "medium", "low"])).min(1).max(4).optional(),

  /**
   * Range reporting: compute and surface plausible truth% ranges from self-consistency
   * spread and optionally boundary variance.
   *
   * Addresses Action #6 (Stammbach/Ash) — verdict range reporting.
   */
  rangeReporting: z.object({
    /** Enable/disable range computation and surfacing. */
    enabled: z.boolean(),
    /** Range width (pp) above which a contested_verdict_range warning is emitted. */
    wideRangeThreshold: z.number().int().min(5).max(50),
    /**
     * Weight for boundary variance widening (0-1).
     * 0.0 = disabled (method A: spread-only). >0 = method B (spread + boundary variance).
     * Default 0.0 — enable after baseline calibration confirms widening improves results.
     */
    boundaryVarianceWeight: z.number().min(0).max(1),
  }).optional(),
});

export type CalcConfig = z.infer<typeof CalcConfigSchema>;

export const DEFAULT_CALC_CONFIG: CalcConfig = {
  // verdictBands: System constant in truth-scale.ts — removed from UCM config.
  aggregation: {
    centralityWeights: {
      high: 3.0,
      medium: 2.0,
      low: 1.0,
    },
    harmPotentialMultiplier: 1.5,
    // ClaimBoundary Stage 5: 4-level harm multipliers
    harmPotentialMultipliers: {
      critical: 1.5,
      high: 1.2,
      medium: 1.0,
      low: 1.0,
    },
    // ClaimBoundary Stage 5: Triangulation defaults
    triangulation: {
      strongAgreementBoost: 0.15,
      moderateAgreementBoost: 0.05,
      singleBoundaryPenalty: -0.10,
      conflictedFlag: true,
    },
    // ClaimBoundary Stage 5: Derivative evidence weight reduction
    derivativeMultiplier: 0.5,
    // ClaimBoundary Stage 5: Weight for direct anchor-preserving claims
    anchorClaimMultiplier: 2.5,
    // ClaimBoundary Stage 5: LLM article adjudication on direction conflict (Option G)
    articleAdjudication: {
      enabled: true,
      maxDeviationFromBaseline: 30,
      borderlineMargin: 10,
    },
    contestationWeights: {
      established: 0.5,
      disputed: 0.7,
      opinion: 1.0,
    },
  },
  sourceReliability: {
    // 0.5 = neutral weight for unknown sources (no directional pull).
    // Previously 0.45 which biased unknown toward below-average.
    // null would exclude unknowns entirely.
    defaultScore: 0.5,
  },
  sourceReliabilityCalibration: {
    truthDeltaMax: 5,
    confidenceDeltaMax: 15,
    maxSourcesPerSide: 5,
    reasoningMaxChars: 100,
    targetMaxInputTokens: 2000,
    minKnownSourcesPerSide: 1,
    unknownDominanceThreshold: 0.75,
  },
  qualityGates: {
    gate1OpinionThreshold: 0.7,
    gate1SpecificityThreshold: 0.3,
    gate1MinContentWords: 3,
    gate4MinSourcesHigh: 3,
    gate4MinSourcesMedium: 2,
    gate4QualityThresholdHigh: 0.75,
    gate4QualityThresholdMedium: 0.5,
    gate4AgreementThresholdHigh: 0.7,
    gate4AgreementThresholdMedium: 0.5,
  },
  contestationPenalties: {
    established: -12,
    disputed: -8,
  },
  deduplication: {
    evidenceScopeThreshold: 0.85,
    claimSimilarityThreshold: 0.85,
    contextMergeThreshold: 0.7,
  },
  mixedConfidenceThreshold: 45,
  verdictIntegrityTolerance: 0.15,
  directionMixedEvidenceFloor: 0.3,
  probativeValueWeights: {
    high: 1.0,
    medium: 0.9,
    low: 0.5,
  },
  // ClaimBoundary Stage 4: Self-consistency spread thresholds (in percentage points)
  selfConsistencySpreadThresholds: {
    stable: 5,
    moderate: 12,
    unstable: 20,
  },
  verdictStage: {
    spreadMultipliers: {
      highlyStable: 1.0,
      moderatelyStable: 0.9,
      unstable: 0.7,
      highlyUnstable: 0.4,
    },
    institutionalSourceTypes: [
      "peer_reviewed_study",
      "fact_check_report",
      "government_report",
      "legal_document",
      "organization_report",
    ],
    generalSourceTypes: [
      "news_primary",
      "news_secondary",
      "expert_statement",
      "other",
    ],
  },
  evidenceFilter: {
    minStatementLength: 20,
    maxVaguePhraseCount: 2,
    requireSourceExcerpt: true,
    minExcerptLength: 30,
    requireSourceUrl: true,
  },
  claimDecomposition: {
    minCoreClaimsPerContext: 2,
    minTotalClaimsWithSingleCore: 3,
    minDirectClaimsPerContext: 2,
    supplementalRepromptMaxAttempts: 2,
    shortSimpleInputMaxChars: 60,
  },
  claimContractValidation: {
    enabled: true,
    maxRetries: 1,
  },
  contextSimilarity: {
    nameWeight: 0.35,
    primaryMetadataWeight: 0.3,
    assessedStatementWeight: 0.2,
    subjectWeight: 0.1,
    secondaryMetadataWeight: 0.05,
    nearDuplicateAssessedThreshold: 0.85,
    nearDuplicateForceScore: 0.92,
    nearDuplicateSubjectGuardThreshold: 0.5,
    nearDuplicateNameGuardThreshold: 0.4,
    nearDuplicateMinNameSim: 0.25,
    nearDuplicateMinPrimarySim: 0.15,
    anchorRecoveryThreshold: 0.6,
    fallbackEvidenceCapPercent: 40,
  },
  tangentialPruning: {
    minEvidenceForTangential: 2,
  },
  claimClustering: {
    jaccardSimilarityThreshold: 0.6,
    duplicateWeightShare: 0.5,
  },
  fallback: {
    step1RelaxInstitution: true,
    step2RelevanceFloor: 0.4,
    step3BroadEnabled: true,
  },
  provenanceValidation: {
    minExcerptLength: 24,
  },
  riskTiers: {
    highConfidenceThreshold: 70,
    mediumConfidenceThreshold: 40,
  },
  contextRefinement: {
    minAssignmentCoverage: 0.7,
    maxEvidenceCeiling: 8,
    oldToNewSimilarityThreshold: 0.65,
  },
  frameSignal: {
    nameDistinctnessThreshold: 0.35,
    assessedDistinctnessThreshold: 0.45,
  },
  processing: {
    similarityBatchSize: 25,
    maxEvidenceSelection: 10,
    maxContextsPerClaim: 5,
  },
  groundingPenalty: {
    enabled: true,
    threshold: 0.5,
    reductionFactor: 0.3,
    floorRatio: 0.1,
  },
  highHarmMinConfidence: 50,
  // Recency Penalty Internals (UCM-4)
  recencyVolatilityMultipliers: {
    week: 1.0,
    month: 0.8,
    year: 0.4,
    none: 0.2,
  },
  recencyVolumeAttenuationBrackets: [
    { maxCount: 0, multiplier: 1.0 },
    { maxCount: 10, multiplier: 0.9 },
    { maxCount: 25, multiplier: 0.7 },
  ],
  recencyVolumeAttenuationFallback: 0.5,
  // Temporal Guard (UCM-5)
  temporalGuardConfidenceCeiling: 45,
  evidenceBalanceSkewThreshold: 0.8,
  evidenceBalanceMinDirectional: 3,
  evidenceSufficiencyMinItems: 3,
  evidenceSufficiencyMinSourceTypes: 2,
  evidenceSufficiencyMinDistinctDomains: 3,
  evidenceSufficiencyAuthoritativeDirectionalMinItems: 2,
  evidenceSufficiencyAuthoritativeDirectionalSourceTypes: ["government_report", "legal_document"],
  evidencePartitioningEnabled: true,
  contrarianRetrievalEnabled: true,
  contrarianMaxQueriesPerClaim: 2,
  contrarianRuntimeCeilingPct: 15,
  highHarmFloorLevels: ["critical", "high"],
};

// ============================================================================
// PROMPT CONFIG SCHEMA (prompt.v1)
// ============================================================================

// Prompt frontmatter schema
const PromptFrontmatterSchema = z.object({
  version: z.string().regex(/^\d+\.\d+(\.\d+)?(-[\w]+)?$/),
  pipeline: z.enum([
    "orchestrated",     // Legacy prompt profile (shared prompts still stored under this key)
    "source-reliability",
    "text-analysis",  // LLM text analysis prompts (input, evidence, context, verdict)
    "claimboundary",  // ClaimBoundary pipeline prompts (extraction, clustering, verdict, narrative)
  ]),
  description: z.string().optional(),
  lastModified: z.string().optional(),
  variables: z
    .array(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/))
    .optional(),
  requiredSections: z.array(z.string()).optional(),
});

export type PromptFrontmatter = z.infer<typeof PromptFrontmatterSchema>;

// ============================================================================
// PROMPT VALIDATION FUNCTIONS
// ============================================================================

function validateHasSections(content: string): boolean {
  // Allow either SNAKE_CASE format (## SECTION_NAME) or Title Case (## Section Name)
  return /^## [A-Z]/m.test(content);
}

function validateNoDuplicateSections(content: string): boolean {
  // Match any ## header that starts with uppercase
  const sections = content.match(/^## ([A-Z][^\r\n]+)/gm) || [];
  const names = sections.map((s) => s.replace(/^## /, "").trim().toUpperCase());
  return names.length === new Set(names).size;
}

function extractVariablesFromContent(content: string): string[] {
  const matches = content.match(/\$\{(\w+)\}/g) || [];
  return matches.map((v) => v.slice(2, -1));
}

/**
 * Validate prompt content (markdown with YAML frontmatter)
 *
 * LIMITATION: This uses a simple YAML parser that only supports inline syntax:
 *   variables: [foo, bar]
 * NOT multi-line block syntax:
 *   variables:
 *     - foo
 *     - bar
 *
 * For full prompt management, use /admin/config?type=prompt which has dedicated prompt tooling.
 * This validation is for basic structural checks only.
 */
export function validatePromptContent(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for frontmatter (handle both LF and CRLF line endings)
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatterMatch) {
    errors.push("Prompt must start with YAML frontmatter (--- block)");
    return { valid: false, errors, warnings };
  }

  // Basic frontmatter checks (without full YAML parsing)
  const frontmatterYaml = frontmatterMatch[1];

  // Check for required fields using regex (more robust than simple YAML parsing)
  if (!/^version:\s*.+$/m.test(frontmatterYaml)) {
    errors.push("Frontmatter must include 'version' field");
  }
  if (!/^pipeline:\s*.+$/m.test(frontmatterYaml)) {
    errors.push("Frontmatter must include 'pipeline' field");
  }

  // Check for multi-line YAML constructs that our simple parser can't handle
  if (/^  - /m.test(frontmatterYaml)) {
    warnings.push(
      "Frontmatter uses multi-line YAML arrays which cannot be fully validated here. " +
      "Use /admin/config?type=prompt for full prompt validation."
    );
  }

  // Check for sections in the body
  const body = content.slice(frontmatterMatch[0].length);
  if (!validateHasSections(body)) {
    errors.push("Prompt must contain at least one ## SECTION_NAME header");
  }

  if (!validateNoDuplicateSections(body)) {
    errors.push("Prompt contains duplicate section headers");
  }

  // Try to parse with simple YAML for basic validation (but don't fail on parse errors)
  try {
    const frontmatter = parseSimpleYaml(frontmatterYaml);

    // Validate version format if we got it
    const version = frontmatter.version;
    if (version && typeof version === "string") {
      if (!/^\d+\.\d+(\.\d+)?(-[\w]+)?$/.test(version)) {
        errors.push(`Invalid version format: ${version}. Expected: X.Y.Z or X.Y.Z-suffix`);
      }
    }

    // Validate pipeline value if we got it
    const pipeline = frontmatter.pipeline;
    if (pipeline && typeof pipeline === "string") {
      const validPipelines = ["orchestrated", "source-reliability", "text-analysis", "claimboundary", "input-policy-gate"];
      if (!validPipelines.includes(pipeline)) {
        errors.push(`Invalid pipeline: ${pipeline}. Valid: ${validPipelines.join(", ")}`);
      }
    }

    // Check variable usage only if we successfully parsed variables
    if (Array.isArray(frontmatter.variables)) {
      const declaredVars = new Set(frontmatter.variables as string[]);
      const usedVars = extractVariablesFromContent(body);

      // Used but not declared
      const undeclared = usedVars.filter((v) => !declaredVars.has(v));
      if (undeclared.length > 0) {
        errors.push(`Variables used but not declared: ${undeclared.join(", ")}`);
      }

      // Declared but not used (warning only)
      const unusedDeclared = [...declaredVars].filter((v) => !usedVars.includes(v));
      if (unusedDeclared.length > 0) {
        warnings.push(`Variables declared but not used: ${unusedDeclared.join(", ")}`);
      }
    }
  } catch {
    // Simple YAML parser failed - that's OK for complex frontmatter
    warnings.push("Could not fully parse frontmatter YAML. Use /admin/config?type=prompt for detailed validation.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Simple YAML parser for frontmatter (handles basic key: value pairs)
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value: unknown = trimmed.slice(colonIndex + 1).trim();

    // Handle arrays (simple case: [item1, item2])
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter((s) => s.length > 0);
    } else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    } else if (typeof value === "string" && !isNaN(Number(value))) {
      value = Number(value);
    } else if (typeof value === "string") {
      // Remove quotes
      value = value.replace(/^["']|["']$/g, "");
    }

    result[key] = value;
  }

  return result;
}

// ============================================================================
// SECRETS VALIDATION
// ============================================================================

const DENYLIST_PATTERNS = [
  /api[_-]?key/i,
  /secret[_-]?key/i,
  /access[_-]?token/i,
  /bearer[_-]?token/i,
  /password/i,
  /credential/i,
];

function getAllKeys(obj: object, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as object, fullKey));
    }
  }
  return keys;
}

export function validateNoSecrets(content: object): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const key of getAllKeys(content)) {
    if (DENYLIST_PATTERNS.some((p) => p.test(key))) {
      errors.push(
        `Field '${key}' appears to be a secret - not allowed in DB config`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// CANONICALIZATION
// ============================================================================

/**
 * Deep sort object keys alphabetically
 */
function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }
  if (obj && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Canonicalize JSON config (search, calculation)
 */
export function canonicalizeJson(obj: object): string {
  return JSON.stringify(sortKeysDeep(obj), null, 2);
}

/**
 * Canonicalize markdown prompt
 * - Normalize line endings to \n
 * - Trim trailing whitespace per line
 * - Sort YAML keys in frontmatter
 * - Ensure single trailing newline
 */
/**
 * Canonicalize Markdown content for consistent hashing.
 *
 * IMPORTANT: This function strips trailing whitespace from each line.
 * This intentionally removes Markdown "hard line breaks" (two trailing spaces).
 * For LLM prompts, this is acceptable since:
 * - LLMs interpret newlines semantically, not via trailing spaces
 * - Trailing whitespace variations would cause hash differences for identical semantic content
 *
 * If standard Markdown hard breaks are needed in the future, use <br> tags instead.
 */
export function canonicalizeMarkdown(content: string): string {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Extract frontmatter
  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    const frontmatterYaml = frontmatterMatch[1];
    const body = normalized.slice(frontmatterMatch[0].length);

    // Check if frontmatter uses multi-line YAML (which we can't safely rewrite)
    const usesMultiLineYaml = /^  - /m.test(frontmatterYaml);

    if (!usesMultiLineYaml) {
      // Parse and re-serialize frontmatter with sorted keys (only for simple YAML)
      try {
        const parsed = parseSimpleYaml(frontmatterYaml);
        const sorted = sortKeysDeep(parsed) as Record<string, unknown>;
        const canonicalFrontmatter = Object.entries(sorted)
          .map(([k, v]) => {
            if (Array.isArray(v)) {
              return `${k}: [${v.map((i) => `"${i}"`).join(", ")}]`;
            }
            if (typeof v === "string") {
              return `${k}: "${v}"`;
            }
            return `${k}: ${v}`;
          })
          .join("\n");

        const canonicalBody = body
          .split("\n")
          .map((line) => line.trimEnd())
          .join("\n")
          .trimEnd();

        return `---\n${canonicalFrontmatter}\n---\n${canonicalBody}\n`;
      } catch {
        // Fall back to preserving frontmatter as-is
      }
    }

    // For complex YAML frontmatter, just normalize line endings and trailing whitespace
    // but preserve the original structure to avoid data loss
    const canonicalBody = body
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trimEnd();

    return `---\n${frontmatterYaml}\n---\n${canonicalBody}\n`;
  }

  // Simple canonicalization for non-frontmatter content
  return (
    normalized
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trimEnd() + "\n"
  );
}

/**
 * Canonicalize config content based on type
 */
export function canonicalizeContent(
  configType: ConfigType,
  content: string,
): string {
  if (configType === "prompt") {
    return canonicalizeMarkdown(content);
  }
  // JSON configs (search, calculation)
  const parsed = JSON.parse(content);
  return canonicalizeJson(parsed);
}

/**
 * Compute content hash (SHA-256)
 */
export function computeContentHash(canonicalizedContent: string): string {
  return crypto.createHash("sha256").update(canonicalizedContent).digest("hex");
}

// ============================================================================
// SCHEMA VALIDATION BY TYPE
// ============================================================================

/**
 * Validate config content based on type and schema version
 */
export function validateConfig(
  configType: ConfigType,
  content: string,
  schemaVersion: SchemaVersion,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (configType === "prompt") {
      return validatePromptContent(content);
    }

    // Parse JSON for search/calculation configs
    const parsed = JSON.parse(content);

    // Validate no secrets
    const secretCheck = validateNoSecrets(parsed);
    errors.push(...secretCheck.errors);
    warnings.push(...secretCheck.warnings);

    if (schemaVersion !== "3.0.0") {
      errors.push(`Unknown schema version: ${schemaVersion}`);
    } else if (configType === "search") {
      const result = SearchConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "calculation") {
      const result = CalcConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "pipeline") {
      const result = PipelineConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "sr") {
      const result = SourceReliabilityConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    }
  } catch (err) {
    errors.push(`Failed to parse content: ${err}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Get schema version for config type
 */
export function getSchemaVersion(configType: ConfigType): SchemaVersion {
  switch (configType) {
    case "prompt":
      return "prompt.v1";
    case "search":
    case "calculation":
    case "pipeline":
    case "sr":
      return "3.0.0";
  }
}

/**
 * Get default config for type
 */
export function getDefaultConfig(configType: ConfigType): string {
  switch (configType) {
    case "search":
      return canonicalizeJson(DEFAULT_SEARCH_CONFIG);
    case "calculation":
      return canonicalizeJson(DEFAULT_CALC_CONFIG);
    case "pipeline":
      return canonicalizeJson(DEFAULT_PIPELINE_CONFIG);
    case "sr":
      return canonicalizeJson(DEFAULT_SR_CONFIG);
    case "prompt":
      return ""; // No default prompt
  }
}

// ============================================================================
// TYPE-SAFE CONFIG ACCESS (Recommendation #24)
// ============================================================================

/**
 * Type mapping for config types to their schema types.
 * Used by getTypedConfig() for type-safe config access.
 */
export type ConfigSchemaTypes = {
  search: SearchConfig;
  calculation: CalcConfig;
  pipeline: PipelineConfig;
  sr: SourceReliabilityConfig;
  prompt: string;
};

/**
 * Get the Zod schema for a config type.
 */
export function getSchemaForType(configType: ConfigType): z.ZodType<unknown> | null {
  switch (configType) {
    case "search":
      return SearchConfigSchema;
    case "calculation":
      return CalcConfigSchema;
    case "pipeline":
      return PipelineConfigSchema;
    case "sr":
      return SourceReliabilityConfigSchema;
    case "prompt":
      return null; // Prompts are validated differently
  }
}

/**
 * Parse and validate config content with type safety.
 * Returns the validated config object or throws on validation failure.
 */
export function parseTypedConfig<T extends keyof ConfigSchemaTypes>(
  configType: T,
  content: string,
): ConfigSchemaTypes[T] {
  if (configType === "prompt") {
    return content as ConfigSchemaTypes[T];
  }

  const parsed = JSON.parse(content);
  const schema = getSchemaForType(configType);

  if (!schema) {
    throw new Error(`No schema for config type: ${configType}`);
  }

  // Merge stored config with current defaults so fields added after the config was
  // saved (e.g. new required fields) get their default values instead of failing validation.
  const defaultsJson = getDefaultConfig(configType as Exclude<ConfigType, "prompt">);
  const defaults = defaultsJson ? JSON.parse(defaultsJson) : {};
  const merged = { ...defaults, ...parsed };

  const result = schema.safeParse(merged);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Config validation failed: ${errors.join(", ")}`);
  }

  return result.data as ConfigSchemaTypes[T];
}
