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
  QuestionIntent,
  ClaimRole,
  AnalysisInput,

  // 7-point scale types
  ClaimVerdict7Point,
  QuestionAnswer7Point,
  ArticleVerdict7Point,

  // Quality gate types
  ClaimValidationResult,
  VerdictValidationResult,

  // Data types
  DistinctProceeding,
  KeyFactor,
  FactorAnalysis,
  ProceedingAnswer,
  SearchQuery,
  ResearchState,
  ClaimUnderstanding,
  ResearchIteration,
  ExtractedFact,
  FetchedSource,
  ClaimVerdict,
  QuestionAnswer,
  ArticleAnalysis,
  TwoPanelSummary,
  PseudoscienceAnalysis,
  ResearchDecision,
} from "./types";

// ============================================================================
// CONFIG EXPORTS
// ============================================================================

export { CONFIG, getActiveConfig, getKnowledgeInstruction, debugLog, clearDebugLog } from "./config";

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
  calculateQuestionTruthPercentage,
  calculateArticleTruthPercentage,
  percentageToClaimVerdict,
  percentageToQuestionAnswer,
  percentageToArticleVerdict,
  calibrateClaimVerdict,
  calibrateQuestionAnswer,
  calibrateArticleVerdict,
  getVerdictColor,
  getHighlightColor7Point,
  getHighlightColor,
} from "./truth-scale";

// ============================================================================
// PSEUDOSCIENCE EXPORTS
// ============================================================================

export {
  PSEUDOSCIENCE_PATTERNS,
  PSEUDOSCIENCE_BRANDS,
  DEBUNKED_INDICATORS,
  detectPseudoscience,
  escalatePseudoscienceVerdict,
  calculateArticleVerdictWithPseudoscience,
} from "./pseudoscience";

// ============================================================================
// SOURCE RELIABILITY EXPORTS
// ============================================================================

export {
  loadSourceBundle,
  getTrackRecordScore,
  applyEvidenceWeighting,
  calculateOverallCredibility,
} from "./source-reliability";

// ============================================================================
// LLM EXPORTS
// ============================================================================

export type { ModelInfo } from "./llm";
export { getModel, extractStructuredOutput, clampConfidence } from "./llm";
