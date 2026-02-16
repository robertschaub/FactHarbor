/**
 * FactHarbor Analyzer - Module Index
 *
 * This is the main entry point for the modularized analyzer.
 * Re-exports all public types, functions, and the main analysis function.
 *
 * @module analyzer
 * @version 2.6.17
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Input types
  InputType,
  ClaimRole,
  AnalysisInput,

  // 7-point scale types
  ClaimVerdict7Point,
  ArticleVerdict7Point,

  // Quality gate types
  ClaimValidationResult,
  VerdictValidationResult,

  // Data types
  AnalysisContext,
  EvidenceScope,       // NEW v2.8: Evidence source methodology metadata
  SourceType,          // NEW v2.8: Source type classification for EvidenceScope
  KeyFactor,
  FactorAnalysis,
  AnalysisContextAnswer,
  SearchQuery,
  ResearchState,
  ClaimUnderstanding,
  ResearchIteration,
  EvidenceItem,        // NEW v2.8: Preferred name for evidence items
  FetchedSource,
  ClaimVerdict,
  ArticleAnalysis,
  TwoPanelSummary,
  PseudoscienceAnalysis,
  ResearchDecision,
} from "./types";

// ============================================================================
// CONFIG EXPORTS
// ============================================================================

export { CONFIG, getActiveConfig } from "./config";

// ============================================================================
// DEBUG EXPORTS
// ============================================================================

export { debugLog, clearDebugLog, agentLog } from "./debug";

// ============================================================================
// QUALITY GATE EXPORTS
// ============================================================================

export {
  validateClaimGate1,
  validateVerdictGate4,
  applyGate1ToClaims,
  applyGate4ToVerdicts,
} from "./quality-gates";

// ============================================================================
// TRUTH SCALE EXPORTS
// ============================================================================

export {
  calculateTruthPercentage,
  calculateArticleTruthPercentage,
  percentageToClaimVerdict,
  percentageToArticleVerdict,
  calibrateClaimVerdict,
  calibrateArticleVerdict,
  getVerdictColor,
  getHighlightColor7Point,
  getHighlightColor,
} from "./truth-scale";

// ============================================================================
// SOURCE RELIABILITY EXPORTS
// ============================================================================

export {
  // Core functions
  prefetchSourceReliability,
  getTrackRecordScore,
  getTrackRecordData,
  clearPrefetchedScores,

  // Verdict weighting
  applyEvidenceWeighting,
  calculateOverallCredibility,

  // Utility functions
  extractDomain,
  isImportantSource,
  normalizeTrackRecordScore,
  calculateEffectiveWeight,

  // Configuration
  SR_CONFIG,
  DEFAULT_UNKNOWN_SOURCE_SCORE,
} from "./source-reliability";

export type { PrefetchResult, CachedReliabilityData, SourceReliabilityData } from "./source-reliability";

// ============================================================================
// EVIDENCE FILTER EXPORTS (Phase 1.5 Layer 2)
// ============================================================================

export type { ProbativeFilterConfig, FilterStats } from "./evidence-filter";
export {
  filterByProbativeValue,
  calculateFalsePositiveRate,
  DEFAULT_FILTER_CONFIG,
} from "./evidence-filter";

// ============================================================================
// CONFIDENCE CALIBRATION EXPORTS (Session 25)
// ============================================================================

export type {
  CalibrationAdjustment,
  CalibrationResult,
  ConfidenceCalibrationConfig,
} from "./confidence-calibration";
export {
  calculateEvidenceDensityScore,
  snapConfidenceToBand,
  enforceVerdictConfidenceCoupling,
  checkContextConfidenceConsistency,
  calibrateConfidence,
  DEFAULT_CALIBRATION_CONFIG,
  DEFAULT_CONFIDENCE_BANDS,
} from "./confidence-calibration";

// ============================================================================
// LLM EXPORTS
// ============================================================================

export type { ModelInfo } from "./llm";
export { getModel, extractStructuredOutput, clampConfidence } from "./llm";

// ============================================================================
// EVIDENCE PROCESSOR MODULES (Phase 2a)
// ============================================================================

export { EvidenceDeduplicator, jaccardSimilarity } from "./evidence-deduplication";
export type { DeduplicationState } from "./evidence-deduplication";

export { EvidenceNormalizer } from "./evidence-normalization";
export type { RawEvidenceItem } from "./evidence-normalization";

export { RecencyAssessor } from "./evidence-recency";
export type { RecencyValidationResult, RecencyPenaltyResult } from "./evidence-recency";

