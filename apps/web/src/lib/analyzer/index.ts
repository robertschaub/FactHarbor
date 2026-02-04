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
  clampTruthPercentage,
  calculateEffectiveWeight,

  // Configuration
  SR_CONFIG,
  DEFAULT_UNKNOWN_SOURCE_SCORE,

  // Legacy (deprecated)
  loadSourceBundle,
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
// LLM EXPORTS
// ============================================================================

export type { ModelInfo } from "./llm";
export { getModel, extractStructuredOutput, clampConfidence } from "./llm";
