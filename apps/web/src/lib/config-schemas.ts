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
  provider: z.enum(["auto", "google-cse", "serpapi"]),
  mode: z.enum(["standard", "grounded"]),
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
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enabled: true,
  provider: "auto",
  mode: "standard",
  maxResults: 10,
  maxSourcesPerIteration: 8,
  timeoutMs: 12000,
  dateRestrict: null,
  domainWhitelist: [],
  domainBlacklist: [],
  queryGeneration: {
    maxEntitiesPerClaim: 4,
    maxWordLength: 2,
    maxSearchTerms: 8,
    maxFallbackTerms: 6,
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

  // === LLM Text Analysis Feature Flags ===
  llmInputClassification: z.boolean().describe("Use LLM for input classification (replaces heuristics)"),
  llmEvidenceQuality: z.boolean().describe("Use LLM for evidence quality assessment"),

  llmContextSimilarity: z.boolean().optional().describe("Use LLM for AnalysisContext similarity analysis"),

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

  // NEW: Correctly-named key (PRIMARY)
  contextDedupThreshold: z.number().min(0).max(1).optional().describe("Threshold for AnalysisContext deduplication (0-1, lower = more contexts)"),

  // === Context Detection Settings ===
  // Correctly-named keys
  contextDetectionMethod: z
    .enum(["heuristic", "llm", "hybrid"])
    .optional()
    .describe("AnalysisContext detection method: heuristic (patterns only), llm (AI only), hybrid (patterns + AI)"),
  contextDetectionEnabled: z.boolean().optional().describe("Enable AnalysisContext detection (if false, use single general context)"),
  contextDetectionMinConfidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Minimum confidence threshold for LLM-detected AnalysisContexts (0-1)"),
  contextDetectionMaxContexts: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum number of AnalysisContexts to keep after detection"),
  contextDetectionCustomPatterns: z
    .array(
      z.object({
        id: z.string().regex(CONTEXT_PATTERN_ID_REGEX),
        name: z.string(),
        type: z.enum(["methodological", "legal", "scientific", "general", "regulatory", "temporal", "geographic"]),
        triggerPattern: z.string(),
        keywords: z.array(z.string()),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .optional()
    .describe("Custom AnalysisContext detection patterns (extends built-in)"),
  contextFactorHints: z
    .array(
      z.object({
        contextType: z.string(),
        evaluationCriteria: z.string(),
        factor: z.string(),
        category: z.string(),
      }),
    )
    .optional()
    .describe("Hints for LLM AnalysisContext-specific factor generation"),

  // === Context Prompt & Alignment Controls ===
  contextPromptSelectionEnabled: z.boolean().optional().describe("Enable targeted evidence selection for context refinement prompts"),
  contextPromptMaxEvidenceItems: z.number().int().min(8).max(80).optional().describe("Max evidence items included in context refinement prompts"),
  contextDedupEnabled: z.boolean().optional().describe("Enable AnalysisContext deduplication"),
  contextNameAlignmentEnabled: z.boolean().optional().describe("Enable AnalysisContext name alignment"),
  contextNameAlignmentThreshold: z.number().min(0).max(1).optional().describe("Threshold for AnalysisContext name alignment (0-1)"),
  evidenceScopeAlmostEqualThreshold: z.number().min(0).max(1).optional().describe("Threshold for EvidenceScope similarity (0-1)"),

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
    .describe("Max search queries generated during planning phase in monolithic-dynamic pipeline (default: 8)"),
  contextClaimsAnchorDivergenceThreshold: z.number().int().min(0).max(50).optional()
    .describe("Min divergence between context verdict and claims average to trigger anchoring (default: 15)"),
  contextClaimsAnchorClaimsWeight: z.number().min(0).max(1).optional()
    .describe("Blend weight of claims average when anchoring verdicts (default: 0.6)"),
  probativeDeduplicationThreshold: z.number().min(0.5).max(0.95).optional()
    .describe("Deduplication threshold used by deterministic probative filter (default: 0.75)"),

  // === Budget Controls ===
  // Note: maxTokensPerCall is a low-level safety limit for individual LLM calls.

  verdictBatchSize: z.number().int().min(1).max(20).optional()
    .describe("Max claims per verdict LLM call batch when full call fails (default: 5)"),
  maxIterationsPerContext: z.number().int().min(1).max(20).optional().describe("Max research iterations per AnalysisContext"),

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

  // === Pipeline Runtime Timeouts ===
  monolithicDynamicTimeoutMs: z.number().int().min(60000).max(600000).optional().describe(
    "Max runtime for monolithic dynamic pipeline (ms)"
  ),
  monolithicMaxEvidenceBeforeStop: z.number().int().min(5).max(20).optional().describe(
    "Max evidence items collected before stopping monolithic research (default: 8)"
  ),

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

  // === Pipeline Selection ===
  defaultPipelineVariant: z.enum(["orchestrated", "monolithic_dynamic"])
    .optional()
    .describe("Default pipeline variant for new jobs"),
}).transform((data) => {
  // Runtime migration warnings (no legacy field aliases in v3.1+)
  const warnings: string[] = [];

  if (data.llmProvider === undefined) {
    data.llmProvider = "anthropic";
  }

  if (data.maxTokensPerCall === undefined) {
    data.maxTokensPerCall = 100000;
  }

  if (data.contextPromptSelectionEnabled === undefined) {
    data.contextPromptSelectionEnabled = true;
  }
  if (data.contextPromptMaxEvidenceItems === undefined) {
    data.contextPromptMaxEvidenceItems = 40;
  }
  if (data.contextDedupEnabled === undefined) {
    data.contextDedupEnabled = true;
  }
  if (data.contextNameAlignmentEnabled === undefined) {
    data.contextNameAlignmentEnabled = true;
  }
  if (data.contextNameAlignmentThreshold === undefined) {
    data.contextNameAlignmentThreshold = 0.3;
  }
  if (data.evidenceScopeAlmostEqualThreshold === undefined) {
    data.evidenceScopeAlmostEqualThreshold = 0.7;
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
  if (data.monolithicDynamicTimeoutMs === undefined) {
    data.monolithicDynamicTimeoutMs = 150000;
  }
  if (data.monolithicMaxEvidenceBeforeStop === undefined) {
    data.monolithicMaxEvidenceBeforeStop = 8;
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

  if (warnings.length > 0) {
    console.warn(`[DEPRECATED] Pipeline config keys migrated: ${warnings.join(", ")}`);
  }

  return data;
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  // Model selection
  llmProvider: "anthropic",
  llmTiering: false, // v2.9.0: Default to off for backwards compatibility
  modelUnderstand: "claude-haiku-4-5-20251001",
  modelExtractEvidence: "claude-haiku-4-5-20251001",
  modelVerdict: "claude-opus-4-6",

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
  keyFactorHints: undefined,
  contextDedupThreshold: 0.70, // v2.11.1: was 0.85 - lowered to merge similar contexts more aggressively (cost optimization)

  // Context detection settings (NEW: Use new key names)
  contextDetectionMethod: "hybrid",
  contextDetectionEnabled: true,
  contextDetectionMinConfidence: 0.7,
  contextDetectionMaxContexts: 3, // v2.11.1: was 5 - reduced to limit context multiplication (cost optimization)
  contextDetectionCustomPatterns: undefined,
  contextFactorHints: undefined,
  contextPromptSelectionEnabled: true,
  contextPromptMaxEvidenceItems: 40,
  contextDedupEnabled: true,
  contextNameAlignmentEnabled: true,
  contextNameAlignmentThreshold: 0.3,
  evidenceScopeAlmostEqualThreshold: 0.7,
  understandMaxChars: 12000,
  understandLlmTimeoutMs: 600000,
  extractEvidenceLlmTimeoutMs: 300000,
  monolithicDynamicTimeoutMs: 150000,
  monolithicMaxEvidenceBeforeStop: 8,
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

  // Budget controls — v2.11.1: reduced from v2.8.2 highs for cost optimization
  verdictBatchSize: 5,
  maxIterationsPerContext: 3, // v2.11.1: was 5 - balance cost vs research depth
  maxTotalIterations: 10, // v2.11.1: was 20 - cap deep research loops
  maxTotalTokens: 500000, // v2.11.1: was 750000 - ~$1.50 max cost at Claude rates
  maxTokensPerCall: 100000,
  enforceBudgets: false,

  // Gap-driven research (Pipeline Phase 1)
  gapResearchEnabled: true,
  gapResearchMaxIterations: 2,
  gapResearchMaxQueries: 8,

  // Pipeline selection
  defaultPipelineVariant: "orchestrated",
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
  defaultScore: z.number().min(0).max(1).describe("Default score for unknown sources"),

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
  evalUseSearch: z.boolean().optional().describe("Enable web search for SR evaluation evidence"),
  evalSearchMaxResultsPerQuery: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Max search results per SR evaluation query"),
  evalMaxEvidenceItems: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Max evidence items collected per SR evaluation"),
  evalSearchDateRestrict: z
    .enum(["y", "m", "w"])
    .nullable()
    .optional()
    .describe("Date restrict for SR evaluation searches (y|m|w). Null uses search config."),
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
  defaultScore: 0.5,

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
  evalSearchMaxResultsPerQuery: 3,
  evalMaxEvidenceItems: 12,
  evalSearchDateRestrict: null,
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
    contestationWeights: z.object({
      established: z.number().min(0).max(1),
      disputed: z.number().min(0).max(1),
      opinion: z.number().min(0).max(1),
    }),
  }),

  sourceReliability: z.object({
    confidenceThreshold: z.number().min(0).max(1),
    consensusThreshold: z.number().min(0).max(1),
    defaultScore: z.number().min(0).max(1),
  }),

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

  evidenceFilter: z.object({
    minStatementLength: z.number().int().min(5).max(100),
    maxVaguePhraseCount: z.number().int().min(0).max(10),
    requireSourceExcerpt: z.boolean(),
    minExcerptLength: z.number().int().min(10).max(200),
    requireSourceUrl: z.boolean(),
  }).optional(),

  articleVerdictOverride: z.object({
    misleadingTarget: z.number().int().min(0).max(100),
    maxBlendStrength: z.number().min(0).max(1),
    centralRefutedRatioThreshold: z.number().min(0).max(1),
  }).optional(),

  claimDecomposition: z.object({
    minCoreClaimsPerContext: z.number().int().min(1).max(10),
    minTotalClaimsWithSingleCore: z.number().int().min(1).max(10),
    minDirectClaimsPerContext: z.number().int().min(1).max(10),
    supplementalRepromptMaxAttempts: z.number().int().min(0).max(5),
    shortSimpleInputMaxChars: z.number().int().min(20).max(200),
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
    contestationWeights: {
      established: 0.5,
      disputed: 0.7,
      opinion: 1.0,
    },
  },
  sourceReliability: {
    confidenceThreshold: 0.8,
    consensusThreshold: 0.2,
    defaultScore: 0.5,
  },
  qualityGates: {
    gate1OpinionThreshold: 0.7,
    gate1SpecificityThreshold: 0.3,
    gate1MinContentWords: 3,
    gate4MinSourcesHigh: 3,
    gate4MinSourcesMedium: 2,
    gate4QualityThresholdHigh: 0.7,
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
  mixedConfidenceThreshold: 60,
  evidenceFilter: {
    minStatementLength: 20,
    maxVaguePhraseCount: 2,
    requireSourceExcerpt: true,
    minExcerptLength: 30,
    requireSourceUrl: true,
  },
  articleVerdictOverride: {
    misleadingTarget: 35,
    maxBlendStrength: 0.8,
    centralRefutedRatioThreshold: 0.5,
  },
  claimDecomposition: {
    minCoreClaimsPerContext: 2,
    minTotalClaimsWithSingleCore: 3,
    minDirectClaimsPerContext: 2,
    supplementalRepromptMaxAttempts: 2,
    shortSimpleInputMaxChars: 60,
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
};

// ============================================================================
// PROMPT CONFIG SCHEMA (prompt.v1)
// ============================================================================

// Prompt frontmatter schema
const PromptFrontmatterSchema = z.object({
  version: z.string().regex(/^\d+\.\d+(\.\d+)?(-[\w]+)?$/),
  pipeline: z.enum([
    "orchestrated",
    "monolithic-dynamic",
    "source-reliability",
    "text-analysis",  // LLM text analysis prompts (input, evidence, context, verdict)
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
      const validPipelines = ["orchestrated", "monolithic-dynamic", "source-reliability", "text-analysis"];
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

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Config validation failed: ${errors.join(", ")}`);
  }

  return result.data as ConfigSchemaTypes[T];
}
