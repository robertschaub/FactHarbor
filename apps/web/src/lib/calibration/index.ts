/**
 * Political Bias Calibration Harness — Public API
 *
 * @module calibration
 */

// Types
export type {
  BiasPair,
  BiasFixtures,
  SideResult,
  CalibrationWarning,
  FailureModeSideMetrics,
  PairMetrics,
  PairResult,
  AggregateMetrics,
  CalibrationRunResult,
  CalibrationThresholds,
  CalibrationComparisonResult,
} from "./types";

export { DEFAULT_CALIBRATION_THRESHOLDS } from "./types";

// Runner
export { runCalibration } from "./runner";
export type { RunOptions } from "./runner";

// Metrics
export { computePairMetrics, computeAggregateMetrics } from "./metrics";

// Report
export { generateCalibrationReport } from "./report-generator";

// Diff engine
export { compareCalibrationRuns } from "./diff-engine";
