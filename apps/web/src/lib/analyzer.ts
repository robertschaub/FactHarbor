/**
 * FactHarbor Analyzer - Entry Point
 *
 * This file serves as the main entry point for the analyzer module.
 * The orchestrated pipeline has been replaced by the ClaimBoundary pipeline.
 *
 * @version 3.0.0
 * @date February 2026
 */

// Re-export validation utilities and types
export { assertValidTruthPercentage } from "./analyzer/types";
export type {
  AnalysisInput,
  ResearchState,
  ClaimUnderstanding,
  EvidenceItem,
  FetchedSource,
  ClaimVerdict,
  ArticleAnalysis,
  TwoPanelSummary,
} from "./analyzer/types";

// Re-export normalizeTrackRecordScore from source-reliability (was also exported from orchestrated)
export { normalizeTrackRecordScore } from "./analyzer/source-reliability";
