/**
 * Configuration Schemas
 *
 * Zod schemas for validating and canonicalizing configuration content.
 * Supports search.v1, calc.v1, and prompt.v1 config types.
 *
 * @module config-schemas
 * @version 1.0.0
 */

import { z } from "zod";
import crypto from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export type ConfigType = "prompt" | "search" | "calculation" | "pipeline" | "sr" | "evidence-lexicon" | "aggregation-lexicon";
export type SchemaVersion = "prompt.v1" | "search.v1" | "calc.v1" | "pipeline.v1" | "sr.v1" | "evidence-lexicon.v1" | "aggregation-lexicon.v1";

/**
 * Valid config types for API validation.
 * Single source of truth - import this in API routes.
 */
export const VALID_CONFIG_TYPES = ["prompt", "search", "calculation", "pipeline", "sr", "evidence-lexicon", "aggregation-lexicon"] as const;

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
// SEARCH CONFIG SCHEMA (search.v1)
// ============================================================================

export const SearchConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["auto", "google-cse", "serpapi"]),
  mode: z.enum(["standard", "grounded"]),
  maxResults: z.number().int().min(1).max(20),
  maxSourcesPerIteration: z.number().int().min(1).max(10),
  timeoutMs: z.number().int().min(1000).max(60000),
  dateRestrict: z.enum(["y", "m", "w"]).nullable(),
  domainWhitelist: z.array(z.string().regex(/^[a-z0-9.-]+$/i)).max(50),
  domainBlacklist: z.array(z.string().regex(/^[a-z0-9.-]+$/i)).max(50),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enabled: true,
  provider: "auto",
  mode: "standard",
  maxResults: 6,
  maxSourcesPerIteration: 4,
  timeoutMs: 12000,
  dateRestrict: null,
  domainWhitelist: [],
  domainBlacklist: [],
};

// ============================================================================
// PIPELINE CONFIG SCHEMA (pipeline.v1)
// ============================================================================
// Tier 2 operational config for analysis pipeline settings.
// Hot-reloadable via Admin UI, env vars used as fallback defaults.

export const PipelineConfigSchema = z.object({
  // === Model Selection ===
  llmTiering: z.boolean().describe("Enable tiered model selection for cost optimization"),
  modelUnderstand: z.string().min(1).describe("Model for UNDERSTAND phase (claim comprehension)"),
  modelExtractFacts: z.string().min(1).describe("Model for EXTRACT_FACTS phase"),
  modelVerdict: z.string().min(1).describe("Model for VERDICT phase (final verdicts)"),

  // === LLM Text Analysis Feature Flags ===
  llmInputClassification: z.boolean().describe("Use LLM for input classification (replaces heuristics)"),
  llmEvidenceQuality: z.boolean().describe("Use LLM for evidence quality assessment"),

  // NEW: Correctly-named key (PRIMARY)
  llmContextSimilarity: z.boolean().optional().describe("Use LLM for AnalysisContext similarity analysis"),
  // DEPRECATED: Old key kept for backward compatibility
  /** @deprecated Use llmContextSimilarity instead - 'scope' here means AnalysisContext */
  llmScopeSimilarity: z.boolean().optional().describe("Use LLM for scope similarity analysis"),

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

  // NEW: Correctly-named key (PRIMARY)
  contextDedupThreshold: z.number().min(0).max(1).optional().describe("Threshold for AnalysisContext deduplication (0-1, lower = more contexts)"),
  // DEPRECATED: Old key kept for backward compatibility
  /** @deprecated Use contextDedupThreshold instead - 'scope' here means AnalysisContext */
  scopeDedupThreshold: z.number().min(0).max(1).optional().describe("Threshold for scope deduplication (lower = more scopes)"),

  // === Context Detection Settings ===
  // NEW: Correctly-named keys (PRIMARY)
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
        id: z.string().regex(/^SCOPE_[A-Z_]+$/),
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
        scopeType: z.string(),
        evaluationCriteria: z.string(),
        factor: z.string(),
        category: z.string(),
      }),
    )
    .optional()
    .describe("Hints for LLM AnalysisContext-specific factor generation"),

  // DEPRECATED: Old keys kept for backward compatibility
  /** @deprecated Use contextDetectionMethod instead - 'scope' here means AnalysisContext */
  scopeDetectionMethod: z
    .enum(["heuristic", "llm", "hybrid"])
    .optional()
    .describe("Scope detection method: heuristic (patterns only), llm (AI only), hybrid (patterns + AI)"),
  /** @deprecated Use contextDetectionEnabled instead - 'scope' here means AnalysisContext */
  scopeDetectionEnabled: z.boolean().optional().describe("Enable scope detection (if false, use single general scope)"),
  /** @deprecated Use contextDetectionMinConfidence instead - 'scope' here means AnalysisContext */
  scopeDetectionMinConfidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Minimum confidence threshold for LLM-detected scopes (0-1)"),
  scopeDetectionMaxContexts: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum number of contexts to detect per input"),
  /** @deprecated Use contextDetectionCustomPatterns instead - 'scope' here means AnalysisContext */
  scopeDetectionCustomPatterns: z
    .array(
      z.object({
        id: z.string().regex(/^SCOPE_[A-Z_]+$/),
        name: z.string(),
        type: z.enum(["methodological", "legal", "scientific", "general", "regulatory", "temporal", "geographic"]),
        triggerPattern: z.string(),
        keywords: z.array(z.string()),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .optional()
    .describe("Custom scope detection patterns (extends built-in)"),
  /** @deprecated Use contextFactorHints instead - 'scope' here means AnalysisContext */
  scopeFactorHints: z
    .array(
      z.object({
        scopeType: z.string(),
        evaluationCriteria: z.string(),
        factor: z.string(),
        category: z.string(),
      }),
    )
    .optional()
    .describe("Hints for LLM context-specific factor generation"),

  // === Budget Controls ===
  // Note: maxTokensPerCall is excluded from pipeline config - it's a low-level safety limit
  // that protects against individual LLM call failures and should remain an env var (FH_MAX_TOKENS_PER_CALL)

  // NEW: Correctly-named key (PRIMARY)
  maxIterationsPerContext: z.number().int().min(1).max(20).optional().describe("Max research iterations per AnalysisContext"),
  // DEPRECATED: Old key kept for backward compatibility
  /** @deprecated Use maxIterationsPerContext instead - 'scope' here means AnalysisContext */
  maxIterationsPerScope: z.number().int().min(1).max(20).optional().describe("Max research iterations per scope"),

  maxTotalIterations: z.number().int().min(1).max(50).describe("Max total iterations across all scopes"),
  maxTotalTokens: z.number().int().min(10000).max(2000000).describe("Max tokens per analysis"),
  enforceBudgets: z.boolean().describe("Hard enforce budget limits (false = soft limits for important claims)"),

  // === Pipeline Selection ===
  defaultPipelineVariant: z.enum(["orchestrated", "monolithic_canonical", "monolithic_dynamic"])
    .optional()
    .describe("Default pipeline variant for new jobs"),
}).transform((data) => {
  // Runtime migration: Copy old keys to new keys if new keys don't exist
  const warnings: string[] = [];

  // llmScopeSimilarity → llmContextSimilarity
  if (data.llmScopeSimilarity !== undefined && data.llmContextSimilarity === undefined) {
    data.llmContextSimilarity = data.llmScopeSimilarity;
    warnings.push("llmScopeSimilarity → llmContextSimilarity");
  }

  // scopeDedupThreshold → contextDedupThreshold
  if (data.scopeDedupThreshold !== undefined && data.contextDedupThreshold === undefined) {
    data.contextDedupThreshold = data.scopeDedupThreshold;
    warnings.push("scopeDedupThreshold → contextDedupThreshold");
  }

  // scopeDetectionMethod → contextDetectionMethod
  if (data.scopeDetectionMethod !== undefined && data.contextDetectionMethod === undefined) {
    data.contextDetectionMethod = data.scopeDetectionMethod;
    warnings.push("scopeDetectionMethod → contextDetectionMethod");
  }

  // scopeDetectionEnabled → contextDetectionEnabled
  if (data.scopeDetectionEnabled !== undefined && data.contextDetectionEnabled === undefined) {
    data.contextDetectionEnabled = data.scopeDetectionEnabled;
    warnings.push("scopeDetectionEnabled → contextDetectionEnabled");
  }

  // scopeDetectionMinConfidence → contextDetectionMinConfidence
  if (data.scopeDetectionMinConfidence !== undefined && data.contextDetectionMinConfidence === undefined) {
    data.contextDetectionMinConfidence = data.scopeDetectionMinConfidence;
    warnings.push("scopeDetectionMinConfidence → contextDetectionMinConfidence");
  }

  // scopeDetectionMaxContexts → contextDetectionMaxContexts
  if (data.scopeDetectionMaxContexts !== undefined && data.contextDetectionMaxContexts === undefined) {
    data.contextDetectionMaxContexts = data.scopeDetectionMaxContexts;
    warnings.push("scopeDetectionMaxContexts → contextDetectionMaxContexts");
  }

  // scopeDetectionCustomPatterns → contextDetectionCustomPatterns
  if (data.scopeDetectionCustomPatterns !== undefined && data.contextDetectionCustomPatterns === undefined) {
    data.contextDetectionCustomPatterns = data.scopeDetectionCustomPatterns;
    warnings.push("scopeDetectionCustomPatterns → contextDetectionCustomPatterns");
  }

  // scopeFactorHints → contextFactorHints
  if (data.scopeFactorHints !== undefined && data.contextFactorHints === undefined) {
    data.contextFactorHints = data.scopeFactorHints;
    warnings.push("scopeFactorHints → contextFactorHints");
  }

  // maxIterationsPerScope → maxIterationsPerContext
  if (data.maxIterationsPerScope !== undefined && data.maxIterationsPerContext === undefined) {
    data.maxIterationsPerContext = data.maxIterationsPerScope;
    warnings.push("maxIterationsPerScope → maxIterationsPerContext");
  }

  if (warnings.length > 0) {
    console.warn(`[DEPRECATED] Pipeline config keys migrated: ${warnings.join(", ")}`);
  }

  return data;
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  // Model selection
  llmTiering: false, // v2.9.0: Default to off for backwards compatibility
  modelUnderstand: "claude-3-5-haiku-20241022",
  modelExtractFacts: "claude-3-5-haiku-20241022",
  modelVerdict: "claude-sonnet-4-20250514",

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
  contextDedupThreshold: 0.85, // NEW: Use new key name (v2.9.0: Default to 0.85 per original config.ts:187)

  // Context detection settings (NEW: Use new key names)
  contextDetectionMethod: "heuristic",
  contextDetectionEnabled: true,
  contextDetectionMinConfidence: 0.7,
  contextDetectionMaxContexts: 5,
  contextDetectionCustomPatterns: undefined,
  contextFactorHints: undefined,

  // Budget controls
  maxIterationsPerContext: 5, // NEW: Use new key name
  maxTotalIterations: 20,
  maxTotalTokens: 750000,
  enforceBudgets: false,

  // Pipeline selection
  defaultPipelineVariant: "orchestrated",
};

// ============================================================================
// EVIDENCE LEXICON CONFIG SCHEMA (evidence-lexicon.v1)
// ============================================================================
// UCM-managed keyword lists for evidence filtering and quality gates.
// Pattern syntax: Use "re:" prefix for regex patterns, otherwise literal strings.
// All defaults must be generic (no brands, jurisdictions, or named entities).

export const EvidenceLexiconSchema = z.object({
  // === Evidence Filtering ===
  evidenceFilter: z.object({
    vaguePhrases: z.array(z.string()).describe(
      "Patterns indicating vague/hedged language (e.g., 're:some (say|believe)', 'reportedly')"
    ),
    citationPatterns: z.array(z.string()).describe(
      "Patterns indicating legal citations (e.g., 're:§\\s*\\d+', 're:article\\s+\\d+')"
    ),
    attributionPatterns: z.array(z.string()).describe(
      "Patterns indicating expert attribution (e.g., 're:(dr|prof)\\s+\\w+', 'according to')"
    ),
  }),

  // === Quality Gates (Gate 1) ===
  gate1: z.object({
    opinionMarkers: z.array(z.string()).describe(
      "Patterns indicating opinion/hedging (e.g., 're:i (think|believe)', 'probably', 'maybe')"
    ),
    futureMarkers: z.array(z.string()).describe(
      "Patterns indicating future predictions (e.g., 're:will (be|have)', 'going to', 'forecast')"
    ),
    specificityPatterns: z.array(z.string()).describe(
      "Patterns indicating concrete/verifiable claims (e.g., 're:\\d+%', 're:\\$\\d+', 'according to')"
    ),
    stopwords: z.array(z.string()).describe(
      "Common stopwords excluded from content word counting"
    ),
  }),

  // === Quality Gates (Gate 4) ===
  gate4: z.object({
    uncertaintyMarkers: z.array(z.string()).describe(
      "Patterns indicating verdict uncertainty (e.g., 'unclear', 're:insufficient (data|evidence)')"
    ),
  }),

  // === Provenance Validation ===
  provenanceValidation: z.object({
    minSourceExcerptLength: z.number().int().min(1).max(500).describe(
      "Minimum characters required for a valid sourceExcerpt"
    ),
    syntheticContentPatterns: z.array(z.string()).describe(
      "Patterns indicating synthetic/LLM-generated excerpts (not real source quotes)"
    ),
    invalidUrlPatterns: z.array(z.string()).describe(
      "Patterns indicating invalid or internal URLs (non-real sources)"
    ),
  }),
});

export type EvidenceLexicon = z.infer<typeof EvidenceLexiconSchema>;

export const DEFAULT_EVIDENCE_LEXICON: EvidenceLexicon = {
  evidenceFilter: {
    vaguePhrases: [
      "re:some (say|believe|argue|claim|think|suggest)",
      "re:many (people|experts|critics|scientists|researchers)",
      "re:it is (said|believed|argued|thought|claimed)",
      "re:opinions (vary|differ)",
      "the debate continues",
      "controversy exists",
      "allegedly",
      "reportedly",
      "purportedly",
      "supposedly",
      "re:it'?s unclear",
      "some argue",
      "according to some",
    ],
    citationPatterns: [
      "re:§\\s*\\d+",
      "re:(article|section|sec|para|paragraph)\\s+\\d+",
      "re:\\w+\\s+v\\.\\s+\\w+",
      "re:(no\\.|#)\\s*\\d+",
    ],
    attributionPatterns: [
      "re:(dr|prof|professor|mr|ms|mrs)\\.?\\s+\\w+",
      "re:\\w+\\s+\\w+\\s+(said|stated|explained|argued|claimed)",
      "re:according to\\s+\\w+",
    ],
  },
  gate1: {
    opinionMarkers: [
      "re:i (think|believe)",
      "re:in my (view|opinion)",
      "probably",
      "possibly",
      "perhaps",
      "maybe",
      "might",
      "could be",
      "seems to",
      "appears to",
      "looks like",
      "best",
      "worst",
      "should",
      "ought to",
      "beautiful",
      "terrible",
      "amazing",
      "wonderful",
      "horrible",
    ],
    futureMarkers: [
      "re:will (be|have|become|happen|occur|result)",
      "going to",
      "in the future",
      "re:by (\\d{4}|next year|next month)",
      "will likely",
      "predicted to",
      "forecast",
      "re:expected to (increase|decrease|grow|rise|fall)",
    ],
    specificityPatterns: [
      "re:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}",
      "re:(january|february|march|april|may|june|july|august|september|october|november|december)\\s+\\d+",
      "re:\\d+\\s*percent",
      "re:\\d+\\s*(million|billion|thousand)",
      "re:\\$\\s*\\d+",
      "re:(dr|prof|president|ceo|director)\\.?\\s+\\w+",
      "re:\\w+\\s+(university|institute|hospital|corporation|inc|ltd)",
      "re:(said|stated|announced|declared|confirmed)\\s+(that|in)",
      "re:at least \\d+",
      "according to",
      "re:(more|less|higher|lower|better|worse)\\s+.*\\s+than",
      "compared to",
      "re:versus|vs\\.?",
    ],
    stopwords: [
      "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
      "have", "has", "had", "been", "be", "being", "do", "does", "did",
      "will", "would", "could", "should", "may", "might", "must", "can",
      "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
      "into", "through", "during", "before", "after", "above", "below",
      "between", "under", "again", "further", "then", "once", "here",
      "there", "when", "where", "why", "how", "all", "each", "every",
      "both", "few", "more", "most", "other", "some", "such", "no",
      "nor", "not", "only", "own", "same", "so", "than", "too", "very",
      "just", "also", "now", "it", "its", "this", "that", "these", "those",
    ],
  },
  gate4: {
    uncertaintyMarkers: [
      "unclear",
      "re:not (certain|sure|definitive)",
      "limited evidence",
      "insufficient data",
      "re:conflicting (reports|evidence|sources)",
      "re:cannot (confirm|verify|determine)",
      "re:no (reliable|credible) sources",
      "may or may not",
    ],
  },
  provenanceValidation: {
    minSourceExcerptLength: 20,
    syntheticContentPatterns: [
      "re:^Based on (the|my|our) (information|analysis|available data)",
      "re:^According to (the|my|our) (analysis|findings)",
      "re:^The source (indicates|shows|suggests)",
      "re:^This suggests that",
      "re:^It appears that",
      "re:^I (found|discovered|learned) that",
      "re:^Here('s| is) what (I|we) found",
      "re:^The (information|data) shows",
    ],
    invalidUrlPatterns: [
      "re:^(about|chrome|data|javascript):",
      "re:^#",
      "re:^$",
      "re:localhost",
      "re:127\\.0\\.0\\.1",
      "re:\\.internal$",
    ],
  },
};

// ============================================================================
// AGGREGATION LEXICON CONFIG SCHEMA (aggregation-lexicon.v1)
// ============================================================================
// UCM-managed keyword lists for verdict aggregation, contestation, and harm detection.
// Pattern syntax: Use "re:" prefix for regex patterns, otherwise literal strings.

const ContextHeuristicsSchema = z.object({
  comparisonPatterns: z.array(z.string()).describe(
    "Patterns indicating comparative claims (e.g., more/less/versus)"
  ),
  efficiencyKeywords: z.array(z.string()).describe(
    "Patterns indicating efficiency/performance dimensions"
  ),
  legalFairnessPatterns: z.array(z.string()).describe(
    "Patterns indicating legal fairness claims"
  ),
  legalProcessKeywords: z.array(z.string()).describe(
    "Patterns indicating legal process context"
  ),
  internationalCuePatterns: z.array(z.string()).describe(
    "Patterns indicating international/external cues"
  ),
  envHealthPatterns: z.array(z.string()).describe(
    "Patterns indicating environment/health comparisons"
  ),
});

const ContextCanonicalizationSchema = z.object({
  predicateStarters: z.array(z.string()).describe(
    "Patterns indicating predicate starters in yes/no normalization"
  ),
  fillerWords: z.array(z.string()).describe(
    "Filler words removed during canonicalization"
  ),
  legalTerms: z.array(z.string()).describe(
    "Generic legal/institutional terms for entity extraction"
  ),
  jurisdictionIndicators: z.array(z.string()).describe(
    "Generic jurisdiction indicators for entity extraction"
  ),
});

export const AggregationLexiconSchema = z.object({
  // === Contestation Detection ===
  contestation: z.object({
    documentedEvidenceKeywords: z.array(z.string()).describe(
      "Keywords indicating documented/specific counter-evidence"
    ),
    causalClaimPatterns: z.array(z.string()).describe(
      "Patterns indicating causal claims requiring stronger evidence"
    ),
    methodologyCriticismPatterns: z.array(z.string()).describe(
      "Patterns indicating methodology criticism"
    ),
  }),

  // === Harm Potential Detection ===
  harmPotential: z.object({
    deathKeywords: z.array(z.string()).describe("Keywords related to death/mortality"),
    injuryKeywords: z.array(z.string()).describe("Keywords related to injury/harm"),
    safetyKeywords: z.array(z.string()).describe("Keywords related to safety/hazards"),
    crimeKeywords: z.array(z.string()).describe("Keywords related to fraud/crime"),
  }),

  // === Verdict Inversion Detection ===
  verdictCorrection: z.object({
    positiveClaimPatterns: z.array(z.string()).describe(
      "Patterns indicating positive/affirmative claims"
    ),
    negativeReasoningPatterns: z.array(z.string()).describe(
      "Patterns indicating negative reasoning contradicting positive claims"
    ),
    negativeClaimPatterns: z.array(z.string()).describe(
      "Patterns indicating negative claim assertions"
    ),
    positiveReasoningPatterns: z.array(z.string()).describe(
      "Patterns indicating positive reasoning contradicting negative claims"
    ),
  }),

  // === Counter-Claim Detection ===
  counterClaimDetection: z.object({
    evaluativeTermSynonyms: z.record(z.array(z.string())).describe(
      "Mapping of evaluative terms to their synonyms (e.g., fair: [just, equitable])"
    ),
    coreEvaluativeTerms: z.array(z.string()).describe(
      "Core evaluative terms for polarity detection"
    ),
    negativeFormMappings: z.record(z.string()).describe(
      "Mapping of negative forms to positive (e.g., unfair: fair)"
    ),
    supportingAspectPatterns: z.array(z.string()).describe(
      "Patterns detecting procedural/evidential support aspects"
    ),
    stopwords: z.array(z.string()).describe(
      "Stopwords for tokenization in counter-claim detection"
    ),
  }),

  // === Text Analysis Heuristics ===
  textAnalysisHeuristic: z.object({
    comparativeKeywords: z.array(z.string()).describe(
      "Keywords indicating comparative language"
    ),
    compoundIndicators: z.array(z.string()).describe(
      "Patterns indicating compound claims"
    ),
    predictiveKeywords: z.array(z.string()).describe(
      "Keywords indicating predictive claims"
    ),
    evaluativeKeywords: z.array(z.string()).describe(
      "Keywords indicating evaluative/opinion claims"
    ),
    productionPhaseKeywords: z.array(z.string()).describe(
      "Keywords indicating production/creation phase"
    ),
    usagePhaseKeywords: z.array(z.string()).describe(
      "Keywords indicating usage/operation phase"
    ),
    negativeIndicators: z.array(z.string()).describe(
      "Keywords indicating negative/contradicting assertions"
    ),
    positiveIndicators: z.array(z.string()).describe(
      "Keywords indicating positive/confirming assertions"
    ),
  }),

  // === Pseudoscience Detection ===
  pseudoscience: z.object({
    patterns: z.record(z.array(z.string())).describe(
      "Category → pattern lists for pseudoscience detection"
    ),
    brands: z.array(z.string()).describe(
      "Known pseudoscience product/brand patterns"
    ),
    debunkedIndicators: z.array(z.string()).describe(
      "Patterns indicating consensus debunking"
    ),
  }),

  // === AnalysisContext Detection Heuristics ===
  // NEW: Correctly-named section (PRIMARY)
  contextHeuristics: ContextHeuristicsSchema.optional().describe(
    "Heuristics for detecting AnalysisContexts (e.g., comparative, legal, environmental claims)"
  ),
  // DEPRECATED: Old section name kept for backward compatibility
  /** @deprecated Use contextHeuristics instead - 'scope' here means AnalysisContext */
  scopeHeuristics: ContextHeuristicsSchema.optional().describe(
    "Patterns indicating comparative claims (e.g., more/less/versus)"
  ),

  // === AnalysisContext Canonicalization Helpers ===
  // NEW: Correctly-named section (PRIMARY)
  contextCanonicalization: ContextCanonicalizationSchema.optional().describe(
    "Helpers for canonicalizing AnalysisContext names and extracting entities"
  ),
  // DEPRECATED: Old section name kept for backward compatibility
  /** @deprecated Use contextCanonicalization instead - 'scope' here means AnalysisContext */
  scopeCanonicalization: ContextCanonicalizationSchema.optional().describe(
    "Patterns indicating predicate starters in yes/no normalization"
  ),

  // === Recency & Procedural Topic Heuristics ===
  recencyHeuristics: z.object({
    recentKeywords: z.array(z.string()).describe(
      "Keywords indicating recency sensitivity"
    ),
    newsIndicatorKeywords: z.array(z.string()).describe(
      "Keywords indicating news-like topics"
    ),
  }),
  proceduralTopicHeuristics: z.object({
    proceduralKeywords: z.array(z.string()).describe(
      "Patterns indicating procedural/governance topics"
    ),
  }),
  externalReactionHeuristics: z.object({
    externalReactionPatterns: z.array(z.string()).describe(
      "Patterns indicating external reaction claims"
    ),
  }),
}).transform((data) => {
  // Runtime migration: Copy old sections to new sections if new sections don't exist
  const warnings: string[] = [];

  // scopeHeuristics → contextHeuristics
  if (data.scopeHeuristics && !data.contextHeuristics) {
    data.contextHeuristics = data.scopeHeuristics;
    warnings.push("scopeHeuristics → contextHeuristics");
  }

  // scopeCanonicalization → contextCanonicalization
  if (data.scopeCanonicalization && !data.contextCanonicalization) {
    data.contextCanonicalization = data.scopeCanonicalization;
    warnings.push("scopeCanonicalization → contextCanonicalization");
  }

  if (warnings.length > 0) {
    console.warn(`[DEPRECATED] Aggregation lexicon sections migrated: ${warnings.join(", ")}`);
  }

  return data;
});

export type AggregationLexicon = z.infer<typeof AggregationLexiconSchema>;

export const DEFAULT_AGGREGATION_LEXICON: AggregationLexicon = {
  contestation: {
    documentedEvidenceKeywords: [
      "data", "measurement", "study", "record", "document", "report",
      "investigation", "audit", "log", "dataset", "finding", "determination",
      "ruling", "documentation", "violation", "breach", "non-compliance",
      "procedure", "article", "section", "regulation", "statute",
      "methodology", "causation", "causality", "correlation", "unverified",
      "control group", "randomized", "peer-review", "replicated", "confound",
      "bias", "systematic", "meta-analysis", "does not prove", "no causal",
      "self-report", "passive surveillance", "adverse event", "safety signal",
    ],
    causalClaimPatterns: [
      "due to",
      "caused by",
      "because of",
      "result of",
      "linked to",
      "attributed to",
      "leads to",
      "responsible for",
      "re:(kills|died from|death from|died due to|died because)",
    ],
    methodologyCriticismPatterns: [
      "methodology",
      "causation",
      "causality",
      "correlation",
      "unverified",
      "does not prove",
      "no causal",
      "cannot establish",
      "cannot prove",
      "not evidence of",
      "insufficient evidence",
      "flawed",
      "misuse",
      "misinterpret",
    ],
  },
  harmPotential: {
    deathKeywords: ["re:(dies|death|dead|kills|fatal)"],
    injuryKeywords: ["re:(injur|harm|damage|victim)"],
    safetyKeywords: ["danger", "unsafe", "risk", "threat", "hazard"],
    crimeKeywords: ["fraud", "crime", "corrupt", "illegal", "stolen", "theft"],
  },
  verdictCorrection: {
    positiveClaimPatterns: [
      "re:(was|were|is|are)\\s+(a\\s+)?(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)",
      "re:(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)\\s+(response|action|decision|measure)",
      "re:(more|higher|better|superior|greater)\\s+(efficient|effective|accurate|reliable)",
      "re:(has|have|had)\\s+(higher|greater|better|more|superior)",
      "re:(has|have|had)\\s+(sufficient|adequate|strong|solid)\\s+(evidence|basis|support)",
      "re:(supports|justifies|warrants|establishes)\\s+(the\\s+)?(claim|assertion|conclusion)",
    ],
    negativeReasoningPatterns: [
      "re:was\\s+NOT\\s+(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)",
      "disproportionate",
      "unjustified",
      "unfair",
      "inappropriate",
      "unreasonable",
      "invalid",
      "incorrect",
      "improper",
      "re:violates\\s+(principles|norms|standards|law|rights)",
      "lacks factual basis",
      "re:(excessive|unwarranted|undue)\\s+(economic\\s+)?(punishment|pressure|retaliation)",
      "re:no\\s+(evidence|data|proof)\\s+(supports|shows|indicates|suggests)",
      "re:(lacks|lacking)\\s+(sufficient\\s+)?(evidence|basis|support|justification)",
      "insufficient",
      "inadequate",
      "re:does not\\s+(support|justify|warrant|establish)",
      "re:fails to\\s+(support|justify|demonstrate|establish|show)",
      "re:(contradicts|contradicted|contradicting)\\s+(the\\s+)?(claim|assertion|thesis)",
      "re:evidence\\s+(shows|indicates|suggests|demonstrates)\\s+(the\\s+)?opposite",
      "re:(contrary|opposite)\\s+to",
      "re:(refutes|refuted|disproves|disproved|negates|negated)",
      "biased",
      "partial",
      "conflicted",
      "re:(less|lower|worse|inferior|reduced)\\s+(efficient|effective|productive|performance)",
      "re:not\\s+(more|higher|better|superior)\\s+(efficient|effective)",
    ],
    negativeClaimPatterns: [
      "re:(has|have|had)\\s+(lower|less|worse|inferior|reduced)\\s+(efficiency|performance|effectiveness|accuracy)",
      "re:(less|lower|worse|inferior)\\s+(efficient|effective|accurate|reliable)\\s+(than|compared)",
      "re:(are|is|was|were)\\s+(less|lower|worse|inferior).*?(efficient|effective)",
    ],
    positiveReasoningPatterns: [
      "counter-evidence shows",
      "re:no evidence supports\\s+(the claim|that|this|it)",
      "re:(actually|in fact|evidence shows).*?(more|higher|better)\\s+(efficient|effective)",
      "re:use\\s+\\d+%.*?efficiently",
      "re:(contradicts|directly contradicts)\\s+(the\\s+)?claim",
    ],
  },
  counterClaimDetection: {
    evaluativeTermSynonyms: {
      fair: ["fair", "just", "equitable", "impartial", "unbiased"],
      proportionate: ["proportionate", "proportional", "appropriate", "reasonable", "fitting"],
      justified: ["justified", "warranted", "legitimate", "valid", "well-founded"],
      proper: ["proper", "correct", "appropriate", "due", "right"],
      lawful: ["lawful", "legal", "legitimate", "constitutional", "valid"],
      true: ["true", "accurate", "correct", "valid", "factual"],
      efficient: ["efficient", "effective", "productive", "optimal"],
    },
    coreEvaluativeTerms: [
      "proportionate", "justified", "fair", "efficient", "effective", "true", "valid",
    ],
    negativeFormMappings: {
      disproportionate: "proportionate",
      unjustified: "justified",
      unfair: "fair",
      inefficient: "efficient",
      ineffective: "effective",
      false: "true",
      untrue: "true",
      invalid: "valid",
    },
    supportingAspectPatterns: [
      "re:(due process|proper process|procedure|procedural).*?(follow|met|comply|observed)",
      "re:(evidence|evidentiary|proof).*?(proper|sufficient|adequate|considered|reviewed)",
      "re:(evidence|record|proof).*?(meets|met|satisfies|satisfied|complies|complied).*?legal standards",
      "re:(evidence|record|proof).*?(supports|supporting|corroborates).*?(charges|case|allegations)",
      "re:(based on|pursuant to|according to).*?(law|legal|statute|constitution)",
      "re:(law|legal|statute|constitution).*?(applied|followed|observed|respected|complied)",
      "re:compl(y|ies|ied|iant|iance).*?(law|legal|electoral|statute|constitution|standards)",
      "re:(charges|indictment|prosecution).*?(based on|supported by|grounded in).*?(law|evidence)",
      "re:(constitutional|legal).*?(jurisdiction|authority|basis|foundation)",
      "re:(sentence|penalty|punishment|fine).*?(proportionate|appropriate|justified|fair)",
      "re:(judicial|judge|court).*?(independence|impartial|unbiased|free from)",
    ],
    stopwords: [
      "the", "a", "an", "and", "or", "but", "of", "to", "in", "on",
      "for", "with", "at", "by", "from", "as", "into", "than", "over",
      "under", "using", "use", "is", "are", "was", "were", "be", "been", "being",
    ],
  },
  textAnalysisHeuristic: {
    comparativeKeywords: [
      "more", "less", "better", "worse", "higher", "lower", "fewer", "greater", "smaller",
    ],
    compoundIndicators: [
      "re:[;,]",
      "re:(and|or|but|while|which|that)",
    ],
    predictiveKeywords: [
      "will", "would", "shall", "going to", "predict", "forecast", "expect",
    ],
    evaluativeKeywords: [
      "best", "worst", "should", "must", "better", "worse", "good", "bad", "right", "wrong",
    ],
    productionPhaseKeywords: [
      "re:manufactur", "production", "factory", "assembly", "upstream", "mining", "extraction", "re:refin",
    ],
    usagePhaseKeywords: [
      "usage", "use", "operation", "driving", "consumption", "downstream", "running", "re:operat",
    ],
    negativeIndicators: [
      "false", "incorrect", "wrong", "refute", "disprove", "contradict", "not true", "unsupported",
    ],
    positiveIndicators: [
      "true", "correct", "accurate", "support", "confirm", "verify", "evidence shows",
    ],
  },
  pseudoscience: {
    patterns: {
      waterMemory: [
        "re:water\\s*memory",
        "re:information\\s*water",
        "re:informed\\s*water",
        "re:structured\\s*water",
        "re:hexagonal\\s*water",
        "re:water\\s*structur(e|ing)",
        "re:molecular\\s*(re)?structur",
        "re:water\\s*cluster",
        "re:energi[sz]ed\\s*water",
        "re:revitali[sz]ed\\s*water",
        "re:living\\s*water",
        "re:grander",
        "re:emoto",
      ],
      energyFields: [
        "re:life\\s*force",
        "re:vital\\s*energy",
        "re:bio[\\s-]*energy",
        "re:subtle\\s*energy",
        "re:energy\\s*field",
        "re:healing\\s*frequencies",
        "re:vibrational\\s*(healing|medicine|therapy)",
        "re:frequency\\s*(healing|therapy)",
        "re:chakra",
        "re:aura\\s*(reading|healing|cleansing)",
      ],
      quantumMisuse: [
        "re:quantum\\s*(healing|medicine|therapy|wellness)",
        "re:quantum\\s*consciousness",
        "re:quantum\\s*energy",
      ],
      homeopathy: [
        "re:homeopath",
        "re:potenti[sz]ation",
        "re:succussion",
        "re:dilution.*memory",
        "re:like\\s*cures\\s*like",
      ],
      detoxPseudo: [
        "re:detox\\s*(foot|ion|cleanse)",
        "re:toxin\\s*removal.*(?:crystal|magnet|ion)",
        "re:ionic\\s*cleanse",
      ],
      other: [
        "re:crystal\\s*(healing|therapy|energy)",
        "re:magnet\\s*therapy",
        "re:magnetic\\s*healing",
        "re:earthing\\s*(therapy|healing)",
        "re:grounding\\s*(therapy|healing|mat)",
        "re:orgone",
        "re:scalar\\s*(wave|energy)",
        "re:tachyon",
        "re:zero[\\s-]*point\\s*energy.*healing",
      ],
    },
    brands: [],
    debunkedIndicators: [
      "re:no\\s*(scientific\\s*)?(evidence|proof|basis)",
      "re:not\\s*(scientifically\\s*)?(proven|supported|verified)",
      "re:lacks?\\s*(scientific\\s*)?(evidence|proof|basis|foundation)",
      "re:contradict.*(?:physics|chemistry|biology|science)",
      "re:violates?\\s*(?:laws?\\s*of\\s*)?(?:physics|thermodynamics)",
      "re:pseudoscien",
      "re:debunked",
      "re:disproven",
      "re:no\\s*plausible\\s*mechanism",
      "re:implausible",
      "re:scientifically\\s*impossible",
    ],
  },
  contextHeuristics: {
    comparisonPatterns: [
      "re:\\b(more|less|better|worse|superior|inferior|higher|lower|greater|smaller)\\b.*\\bthan\\b",
      "re:\\bvs\\.?\\b",
      "re:\\bversus\\b",
    ],
    efficiencyKeywords: [
      "re:\\b(efficien\\w*|performance|impact|effect|output|consumption|energy|resource|cost|speed)\\b",
    ],
    legalFairnessPatterns: [
      "re:\\b(trial|judgment|proceeding|conviction|ruling|hearing|case)\\b.*\\b(fair|just|legal|law|proper|appropriate|legitimate|valid)\\b",
    ],
    legalProcessKeywords: [
      "re:\\b(trial|judgment|court|legal|law|procedure|process|due process|judicial)\\b",
    ],
    internationalCuePatterns: [
      "re:\\b(international|foreign|external|global|overseas|outside)\\b",
    ],
    envHealthPatterns: [
      "re:\\b(environment|health|safety|pollution|emission|contamination|toxicity|hazard)\\b",
    ],
  },
  contextCanonicalization: {
    predicateStarters: [
      "fair", "true", "false", "accurate", "correct", "legitimate", "legal",
      "valid", "based", "justified", "reasonable", "biased", "efficient",
      "effective", "successful", "proper", "appropriate", "proportionate",
      "consistent", "compliant", "constitutional", "lawful", "unlawful",
      "applied", "followed", "implemented", "enforced", "violated", "upheld",
      "overturned", "dismissed", "granted", "denied", "approved", "rejected",
      "cause", "causes", "caused", "increase", "increases", "increased",
      "decrease", "decreases", "decreased", "improve", "improves", "improved",
      "reduce", "reduces", "reduced", "prevent", "prevents", "prevented",
      "lead", "leads", "led", "result", "results", "resulted",
      "follow", "follows", "produce", "produces", "produced",
      "affect", "affects", "affected", "create", "creates", "created",
      "apply", "applies", "implement", "implements", "violate", "violates",
    ],
    fillerWords: [
      "really", "actually", "truly", "basically", "essentially", "simply",
      "just", "very", "quite", "rather",
    ],
    legalTerms: [
      "court", "trial", "judgment", "ruling", "verdict", "sentence",
      "conviction", "case", "proceeding", "tribunal", "commission",
      "appeal", "hearing", "indictment",
    ],
    jurisdictionIndicators: [
      "national", "federal", "supreme", "constitutional", "electoral",
      "regional", "state", "provincial", "municipal", "international",
    ],
  },
  recencyHeuristics: {
    recentKeywords: [
      "recent", "recently", "latest", "newest", "current", "now", "today",
      "this year", "this month", "last month", "last week", "yesterday",
      "announced", "released", "published", "unveiled", "revealed",
    ],
    newsIndicatorKeywords: [
      "trial", "verdict", "sentence", "sentenced", "ruling", "ruled", "convicted", "acquitted",
      "indicted", "charged", "plea", "appeal", "court", "judge", "judgment",
      "election", "elected", "voted", "vote", "poll", "campaign", "inauguration",
      "decision", "announced", "confirmed", "approved", "rejected", "signed",
      "investigation", "hearing", "testimony", "inquiry", "probe",
      "breaking", "update", "developing", "just", "new",
    ],
  },
  proceduralTopicHeuristics: {
    proceduralKeywords: [
      "re:\\b(phase|stage|episode|cycle|version|iteration|rollout|release)\\b",
      "re:\\b(process|procedure|protocol|standard|policy|framework)\\b",
      "re:\\b(review|audit|assessment|evaluation|investigation|probe)\\b",
      "re:\\b(committee|board|panel|commission|authority|agency)\\b",
      "re:\\b(conflict|impartial|independent|oversight|compliance)\\b",
      "re:\\b(trial|court|judge|ruling|verdict|sentence|conviction|acquittal)\\b",
      "re:\\b(lawsuit|litigation|prosecution|defendant|plaintiff)\\b",
      "re:\\b(due process|fair trial|impartial|jurisdiction)\\b",
      "re:\\b(electoral|election|ballot|vote|ineligibility)\\b",
      "re:\\b(investigation|indictment|charges|allegations)\\b",
      "re:\\b(supreme court|federal court|tribunal|justice)\\b",
      "re:\\b(constitutional|legislation|statute|law|legal)\\b",
      "re:\\b(regulatory|agency|commission|board|authority)\\b",
      "re:\\b(proceeding|hearing|testimony|evidence|witness)\\b",
    ],
  },
  externalReactionHeuristics: {
    externalReactionPatterns: [
      "re:\\b(in\\s+response\\s+to|as\\s+a\\s+response|retaliation\\s+for|retaliation\\s+against)\\b",
      "re:\\b(response|reaction|retaliation)\\s+(to|against|for)\\b",
      "re:\\b(condemned|denounced|criticized|protested)\\s+(the|this|that|against)\\b",
      "re:\\b(sanction|sanctions|embargo|embargoes)\\b.*\\b(imposed|impose|against|in\\s+response)\\b",
      "re:\\b(tariff|tariffs|duties|duty|restriction|restrictions)\\b.*\\b(imposed|impose|imposition|in\\s+response)\\b",
      "re:\\b(ban|bans|banned|boycott|boycotted)\\b.*\\b(imposed|in\\s+response|as\\s+a\\s+result)\\b",
      "re:\\b(proportionate|disproportionate|justified|unjustified)\\s+(response|reaction|measure|sanction|retaliation)\\b",
      "re:\\b(response|reaction|measure|sanction)\\b.*\\b(proportionate|disproportionate|justified|appropriate)\\b",
      "re:\\b(diplomatic|international)\\s+(response|reaction|pressure|intervention|condemnation)\\b",
      "re:\\b(foreign|external)\\s+(government|nation|country)\\b.*\\b(response|reaction|condemned|imposed)\\b",
    ],
  },
};

// ============================================================================
// SOURCE RELIABILITY CONFIG SCHEMA (sr.v1)
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
});

export type SourceReliabilityConfig = z.infer<typeof SourceReliabilityConfigSchema>;

export const DEFAULT_SR_CONFIG: SourceReliabilityConfig = {
  // Core settings
  enabled: true,
  multiModel: true,
  openaiModel: "gpt-4o-mini",

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
};

// ============================================================================
// CALCULATION CONFIG SCHEMA (calc.v1)
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
    .refine(validateBandsComplete, "Bands must cover 0-100 completely"),

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
});

export type CalcConfig = z.infer<typeof CalcConfigSchema>;

export const DEFAULT_CALC_CONFIG: CalcConfig = {
  verdictBands: {
    true: [86, 100],
    mostlyTrue: [72, 85],
    leaningTrue: [58, 71],
    mixed: [43, 57],
    leaningFalse: [29, 42],
    mostlyFalse: [15, 28],
    false: [0, 14],
  },
  aggregation: {
    centralityWeights: {
      high: 3.0,
      medium: 2.0,
      low: 1.0,
    },
    harmPotentialMultiplier: 1.5,
    contestationWeights: {
      established: 0.3,
      disputed: 0.5,
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
};

// ============================================================================
// PROMPT CONFIG SCHEMA (prompt.v1)
// ============================================================================

// Prompt frontmatter schema
const PromptFrontmatterSchema = z.object({
  version: z.string().regex(/^\d+\.\d+(\.\d+)?(-[\w]+)?$/),
  pipeline: z.enum([
    "orchestrated",
    "monolithic-canonical",
    "monolithic-dynamic",
    "source-reliability",
    "text-analysis",  // LLM text analysis prompts (input, evidence, scope, verdict)
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
      const validPipelines = ["orchestrated", "monolithic-canonical", "monolithic-dynamic", "source-reliability", "text-analysis"];
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

    // Validate against schema
    if (configType === "search" && schemaVersion === "search.v1") {
      const result = SearchConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "calculation" && schemaVersion === "calc.v1") {
      const result = CalcConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "pipeline" && schemaVersion === "pipeline.v1") {
      const result = PipelineConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "sr" && schemaVersion === "sr.v1") {
      const result = SourceReliabilityConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "evidence-lexicon" && schemaVersion === "evidence-lexicon.v1") {
      const result = EvidenceLexiconSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "aggregation-lexicon" && schemaVersion === "aggregation-lexicon.v1") {
      const result = AggregationLexiconSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else {
      errors.push(`Unknown schema version: ${schemaVersion}`);
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
      return "search.v1";
    case "calculation":
      return "calc.v1";
    case "pipeline":
      return "pipeline.v1";
    case "sr":
      return "sr.v1";
    case "evidence-lexicon":
      return "evidence-lexicon.v1";
    case "aggregation-lexicon":
      return "aggregation-lexicon.v1";
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
    case "evidence-lexicon":
      return canonicalizeJson(DEFAULT_EVIDENCE_LEXICON);
    case "aggregation-lexicon":
      return canonicalizeJson(DEFAULT_AGGREGATION_LEXICON);
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
  "evidence-lexicon": EvidenceLexicon;
  "aggregation-lexicon": AggregationLexicon;
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
    case "evidence-lexicon":
      return EvidenceLexiconSchema;
    case "aggregation-lexicon":
      return AggregationLexiconSchema;
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
