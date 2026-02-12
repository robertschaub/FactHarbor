/**
 * Text Analysis Service Types
 *
 * Type definitions for the LLM-based text analysis service.
 * These types define the interface for all 4 analysis points:
 * 1. Input Classification + Claim Decomposition
 * 2. Evidence Quality Assessment
 * 3. Context Similarity Analysis
 * 4. Verdict Validation
 *
 * @module analyzer/text-analysis-types
 * @version 1.0.0
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/** Analysis point identifiers (execution order) */
export type AnalysisPoint = "input" | "evidence" | "context" | "verdict";

/** Response metadata for telemetry */
export interface TextAnalysisMeta {
  version: string;
  analysisPoint: AnalysisPoint;
  promptHash: string;
  processingMs?: number;
}

/** Generic response envelope for all LLM text analysis calls */
export interface TextAnalysisResponse<T> {
  _meta: TextAnalysisMeta;
  result: T | null;
  error?: string;
}

/** Parse configuration for retry/repair behavior */
export interface ParseConfig {
  maxRetries: number;
  retryDelayMs: number;
  repairAttempt: boolean;
}

/** Default parse configuration */
export const DEFAULT_PARSE_CONFIG: ParseConfig = {
  maxRetries: 2,
  retryDelayMs: 500,
  repairAttempt: true,
};

// ============================================================================
// CALL 1: INPUT CLASSIFICATION + CLAIM DECOMPOSITION
// ============================================================================

/** Claim type classification */
export type ClaimType = "evaluative" | "factual" | "predictive" | "mixed";

/** Input complexity level */
export type Complexity = "simple" | "moderate" | "complex";

/** Role of a decomposed claim */
export type ClaimRole = "primary" | "supporting" | "context";

/** A single decomposed claim */
export interface DecomposedClaim {
  text: string;
  role: ClaimRole;
  standalone: boolean;
}

/** Request for input classification */
export interface InputClassificationRequest {
  inputText: string;
  pipeline: string;
}

/** Result of input classification */
export interface InputClassificationResult {
  isComparative: boolean;
  isCompound: boolean;
  claimType: ClaimType;
  complexity: Complexity;
  decomposedClaims: DecomposedClaim[];
  decompositionReasoning?: string;
}

// ============================================================================
// CALL 2: EVIDENCE QUALITY ASSESSMENT
// ============================================================================

/** Quality assessment levels */
export type QualityAssessment = "high" | "medium" | "low" | "filter";

/** Single evidence item for quality assessment (input format) */
export interface EvidenceItemInput {
  evidenceId: string;
  statement: string;
  excerpt?: string;
  sourceUrl?: string;
  category?: string;
}

/** Request for evidence quality assessment */
export interface EvidenceQualityRequest {
  evidenceItems: EvidenceItemInput[];
  thesisText: string;
}

/** Result for a single evidence item */
export interface EvidenceQualityResult {
  evidenceId: string;
  qualityAssessment: QualityAssessment;
  issues: string[];
  reasoning: string;
}

// ============================================================================
// CALL 3: CONTEXT SIMILARITY ANALYSIS
// ============================================================================
// Note: "Scope" in this section refers to AnalysisContext (top-level analytical frame),
// NOT EvidenceScope (per-evidence metadata). See types.ts:98-126 for definitions.

/** Phase bucket classification */
export type PhaseBucket = "production" | "usage" | "other";

/**
 * A context pair for similarity analysis.
 */
export interface ContextPair {
  contextA: string;
  contextB: string;
  metadataA?: Record<string, unknown>;
  metadataB?: Record<string, unknown>;
}

/** Request for context similarity analysis */
export interface ContextSimilarityRequest {
  contextPairs: ContextPair[];
  contextList: string[];
}

/**
 * Result for a single context pair.
 */
export interface ContextSimilarityResult {
  contextA: string;
  contextB: string;
  similarity: number;
  phaseBucketA: PhaseBucket;
  phaseBucketB: PhaseBucket;
  shouldMerge: boolean;
  canonicalName: string | null;
  reasoning: string;
}

// ============================================================================
// CALL 4: VERDICT VALIDATION
// ============================================================================

/** Verdict validation mode */
export type VerdictValidationMode = "full" | "harm_potential_only" | "contestation_only";

/** Claim polarity relative to thesis */
export type ClaimPolarity = "supports_thesis" | "opposes_thesis" | "neutral";

/** Harm potential level */
export type HarmPotential = "high" | "medium" | "low";

/** Factual basis for contestation */
export type FactualBasis = "established" | "disputed" | "opinion" | "unknown";

/** Contestation status */
export interface ContestationStatus {
  isContested: boolean;
  factualBasis: FactualBasis;
}

/** Single claim verdict for validation */
export interface ClaimVerdictInput {
  claimId: string;
  claimText: string;
  verdictPct?: number;
  reasoning?: string;
}

/** Request for verdict validation */
export interface VerdictValidationRequest {
  thesis: string;
  claimVerdicts: ClaimVerdictInput[];
  evidenceSummary?: string;
  mode: VerdictValidationMode;
}

/** Result for a single claim verdict */
export interface VerdictValidationResult {
  claimId: string;
  isInverted?: boolean;
  suggestedCorrection?: number | null;
  isCounterClaim?: boolean;
  polarity?: ClaimPolarity;
  harmPotential: HarmPotential;
  contestation: ContestationStatus;
  reasoning: string;
}

// ============================================================================
// CALL 5: COUNTER-CLAIM DETECTION
// ============================================================================

/** Single claim input for counter-claim detection */
export interface CounterClaimClaimInput {
  claimId: string;
  claimText: string;
  truthPercentage?: number;
  evidenceDirections?: { supporting: number; contradicting: number };
}

/** Request for counter-claim detection */
export interface CounterClaimRequest {
  thesis: string;
  claims: CounterClaimClaimInput[];
  verdictBands?: { LEANING_TRUE: number; MIXED: number };
}

/** Result for a single claim's counter-claim assessment */
export interface CounterClaimResult {
  claimId: string;
  isCounterClaim: boolean;
  reasoning: string;
}

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Text Analysis Service Interface
 *
 * Provides methods for all analysis points.
 * Implementations are LLM-based, using admin-editable prompts.
 */
export interface ITextAnalysisService {
  /**
   * Call 1: Classify input and decompose into claims
   * Pipeline stage: UNDERSTAND
   */
  classifyInput(request: InputClassificationRequest): Promise<InputClassificationResult>;

  /**
   * Call 2: Assess evidence quality for filtering
   * Pipeline stage: EXTRACT_EVIDENCE
   */
  assessEvidenceQuality(request: EvidenceQualityRequest): Promise<EvidenceQualityResult[]>;

  /**
   * Call 3: Analyze context similarity for merging
   * Pipeline stage: CONTEXT_REFINE
   */
  analyzeContextSimilarity(request: ContextSimilarityRequest): Promise<ContextSimilarityResult[]>;

  /**
   * Call 4: Validate verdicts for inversion/harm/contestation
   * Pipeline stage: VERDICT
   */
  validateVerdicts(request: VerdictValidationRequest): Promise<VerdictValidationResult[]>;

  /**
   * Call 5: Detect counter-claims (claims testing the opposite of the thesis)
   * Pipeline stage: VERDICT
   */
  detectCounterClaims(request: CounterClaimRequest): Promise<CounterClaimResult[]>;
}

// ============================================================================
// TELEMETRY TYPES
// ============================================================================

/** Metrics for text analysis operations */
export interface TextAnalysisMetrics {
  analysisPoint: AnalysisPoint;
  success: boolean;
  latencyMs: number;
  tokenCount?: {
    input: number;
    output: number;
  };
  retryCount: number;
  usedFallback?: boolean;
  error?: string;
}

/** Aggregated metrics for monitoring */
export interface TextAnalysisAggregateMetrics {
  accuracyVsHeuristic: number;
  latencyP50: number;
  latencyP95: number;
  costPerCall: number;
  fallbackRate: number;
  fallbackReasons: Map<string, number>;
}
