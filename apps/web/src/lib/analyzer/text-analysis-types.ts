/**
 * Text Analysis Service Types
 *
 * Type definitions for the LLM-based text analysis service.
 * These types define the interface for all 4 analysis points:
 * 1. Input Classification + Claim Decomposition
 * 2. Evidence Quality Assessment
 * 3. Scope Similarity Analysis
 * 4. Verdict Validation
 *
 * @module analyzer/text-analysis-types
 * @version 1.0.0
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/** Analysis point identifiers (execution order) */
export type AnalysisPoint = "input" | "evidence" | "scope" | "verdict";

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

/** Parse configuration for retry/fallback behavior */
export interface ParseConfig {
  maxRetries: number;
  retryDelayMs: number;
  repairAttempt: boolean;
  fallbackToHeuristic: boolean;
}

/** Default parse configuration */
export const DEFAULT_PARSE_CONFIG: ParseConfig = {
  maxRetries: 2,
  retryDelayMs: 500,
  repairAttempt: true,
  fallbackToHeuristic: true,
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
// CALL 3: SCOPE SIMILARITY ANALYSIS
// ============================================================================

/** Phase bucket classification */
export type PhaseBucket = "production" | "usage" | "other";

/** A scope pair for similarity analysis */
export interface ScopePair {
  scopeA: string;
  scopeB: string;
  metadataA?: Record<string, unknown>;
  metadataB?: Record<string, unknown>;
}

/** Request for scope similarity analysis */
export interface ScopeSimilarityRequest {
  scopePairs: ScopePair[];
  contextList: string[];
}

/** Result for a single scope pair */
export interface ScopeSimilarityResult {
  scopeA: string;
  scopeB: string;
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
// SERVICE INTERFACE
// ============================================================================

/**
 * Text Analysis Service Interface
 *
 * Provides methods for all 4 analysis points. Implementations can be:
 * - HeuristicTextAnalysisService: Uses existing regex/heuristic functions
 * - LLMTextAnalysisService: Uses LLM calls with admin-editable prompts
 * - HybridTextAnalysisService: Uses LLM with heuristic fallback
 */
export interface ITextAnalysisService {
  /**
   * Call 1: Classify input and decompose into claims
   * Pipeline stage: UNDERSTAND
   */
  classifyInput(request: InputClassificationRequest): Promise<InputClassificationResult>;

  /**
   * Call 2: Assess evidence quality for filtering
   * Pipeline stage: EXTRACT_FACTS
   */
  assessEvidenceQuality(request: EvidenceQualityRequest): Promise<EvidenceQualityResult[]>;

  /**
   * Call 3: Analyze scope similarity for merging
   * Pipeline stage: SCOPE_REFINE
   */
  analyzeScopeSimilarity(request: ScopeSimilarityRequest): Promise<ScopeSimilarityResult[]>;

  /**
   * Call 4: Validate verdicts for inversion/harm/contestation
   * Pipeline stage: VERDICT
   */
  validateVerdicts(request: VerdictValidationRequest): Promise<VerdictValidationResult[]>;
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
  usedFallback: boolean;
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
