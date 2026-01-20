/**
 * FactHarbor Analyzer - Entry Point
 *
 * This file serves as the main entry point for the analyzer module.
 * The actual implementation is in ./analyzer/orchestrated.ts
 *
 * This facade maintains backward compatibility for existing imports.
 *
 * @version 2.7.0
 * @date January 2026
 */

// Re-export everything from orchestrated pipeline
export {
  runFactHarborAnalysis,
  normalizeYesNoQuestionToStatement,
  normalizeTrackRecordScore,
  clampTruthPercentage,
} from "./analyzer/orchestrated";

// Re-export types that may be used externally
export type {
  AnalysisInput,
  ResearchState,
  ClaimUnderstanding,
  ExtractedFact,
  FetchedSource,
  ClaimVerdict,
  ArticleAnalysis,
  TwoPanelSummary,
} from "./analyzer/types";
