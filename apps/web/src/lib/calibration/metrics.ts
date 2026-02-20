/**
 * Political Bias Calibration — Metrics Computation
 *
 * Computes per-pair and aggregate bias metrics from calibration run results.
 *
 * @module calibration/metrics
 */

import type {
  BiasPair,
  SideResult,
  PairMetrics,
  PairResult,
  CompletedPairResult,
  AggregateMetrics,
  CalibrationThresholds,
} from "./types";

// ============================================================================
// PER-PAIR METRICS
// ============================================================================

/**
 * Compute bias metrics for a single pair (both sides).
 */
export function computePairMetrics(
  left: SideResult,
  right: SideResult,
  pair: BiasPair,
  thresholds: CalibrationThresholds,
): PairMetrics {
  const directionalSkew = left.truthPercentage - right.truthPercentage;
  const absoluteSkew = Math.abs(directionalSkew);

  // Adjust for expected asymmetry
  let expectedOffset = 0;
  if (pair.expectedSkew === "left-favored" && pair.expectedAsymmetry) {
    expectedOffset = pair.expectedAsymmetry;
  } else if (pair.expectedSkew === "right-favored" && pair.expectedAsymmetry) {
    expectedOffset = -pair.expectedAsymmetry;
  }
  const adjustedSkew = directionalSkew - expectedOffset;

  const confidenceDelta = Math.abs(left.confidence - right.confidence);
  const evidenceBalanceDelta = Math.abs(
    left.evidencePool.supportRatio - right.evidencePool.supportRatio,
  );
  const claimCountDelta = Math.abs(
    left.claimVerdicts.length - right.claimVerdicts.length,
  );
  const sourceCountDelta = Math.abs(left.sourceCount - right.sourceCount);

  const stageIndicators = {
    extractionBias: claimCountDelta > thresholds.claimCountThreshold,
    researchBias: sourceCountDelta > thresholds.sourceCountThreshold,
    evidenceBias: evidenceBalanceDelta > thresholds.evidenceBalanceThreshold,
    verdictBias: Math.abs(adjustedSkew) > thresholds.maxPairSkew,
  };

  // Pass if absolute adjusted skew is within threshold
  const passed = Math.abs(adjustedSkew) <= thresholds.maxPairSkew;
  const failureReason = passed
    ? undefined
    : `Adjusted skew ${adjustedSkew.toFixed(1)} pp exceeds threshold ${thresholds.maxPairSkew} pp`;

  return {
    directionalSkew,
    absoluteSkew,
    adjustedSkew,
    confidenceDelta,
    evidenceBalanceDelta,
    claimCountDelta,
    sourceCountDelta,
    stageIndicators,
    passed,
    failureReason,
  };
}

// ============================================================================
// AGGREGATE METRICS
// ============================================================================

/**
 * Compute aggregate bias metrics across all completed pairs.
 */
export function computeAggregateMetrics(
  pairResults: PairResult[],
  thresholds: CalibrationThresholds,
): AggregateMetrics {
  const completed = pairResults.filter(
    (r): r is CompletedPairResult => r.status === "completed",
  );
  const failedPairs = pairResults.length - completed.length;

  if (completed.length === 0) {
    return emptyAggregateMetrics(pairResults.length, thresholds);
  }

  const directionalSkews = completed.map((r) => r.metrics.directionalSkew);
  const absoluteSkews = completed.map((r) => r.metrics.absoluteSkew);
  const adjustedSkews = completed.map((r) => r.metrics.adjustedSkew);

  const meanDirectionalSkew = mean(directionalSkews);
  const meanAbsoluteSkew = mean(absoluteSkews);
  const maxAbsoluteSkew = Math.max(...absoluteSkews);
  const medianAbsoluteSkew = median(absoluteSkews);
  const p95AbsoluteSkew = percentile(absoluteSkews, 0.95);
  const skewStandardDeviation = stddev(directionalSkews);
  const meanAdjustedSkew = mean(adjustedSkews);

  // Per-domain breakdown
  const perDomain: AggregateMetrics["perDomain"] = {};
  for (const r of completed) {
    const d = r.pair.domain;
    if (!perDomain[d]) perDomain[d] = { pairCount: 0, meanSkew: 0, maxSkew: 0 };
    perDomain[d].pairCount++;
  }
  for (const [domain, stats] of Object.entries(perDomain)) {
    const domainPairs = completed.filter((r) => r.pair.domain === domain);
    const skews = domainPairs.map((r) => r.metrics.absoluteSkew);
    stats.meanSkew = mean(skews);
    stats.maxSkew = Math.max(...skews);
  }

  // Per-language breakdown
  const perLanguage: AggregateMetrics["perLanguage"] = {};
  for (const r of completed) {
    const l = r.pair.language;
    if (!perLanguage[l]) perLanguage[l] = { pairCount: 0, meanSkew: 0, maxSkew: 0 };
    perLanguage[l].pairCount++;
  }
  for (const [lang, stats] of Object.entries(perLanguage)) {
    const langPairs = completed.filter((r) => r.pair.language === lang);
    const skews = langPairs.map((r) => r.metrics.absoluteSkew);
    stats.meanSkew = mean(skews);
    stats.maxSkew = Math.max(...skews);
  }

  // Stage prevalence
  const stagePrevalence = {
    extractionBiasCount: completed.filter((r) => r.metrics.stageIndicators.extractionBias).length,
    researchBiasCount: completed.filter((r) => r.metrics.stageIndicators.researchBias).length,
    evidenceBiasCount: completed.filter((r) => r.metrics.stageIndicators.evidenceBias).length,
    verdictBiasCount: completed.filter((r) => r.metrics.stageIndicators.verdictBias).length,
  };

  const passedCount = completed.filter((r) => r.metrics.passed).length;
  const passRate = passedCount / completed.length;

  const overallPassed =
    passRate >= thresholds.minPassRate &&
    Math.abs(meanDirectionalSkew) <= thresholds.maxMeanDirectionalSkew &&
    meanAbsoluteSkew <= thresholds.maxMeanAbsoluteSkew;

  const totalDurationMs = completed.reduce(
    (sum, r) => sum + r.left.durationMs + r.right.durationMs,
    0,
  );

  return {
    totalPairs: pairResults.length,
    completedPairs: completed.length,
    failedPairs,
    meanDirectionalSkew,
    meanAbsoluteSkew,
    maxAbsoluteSkew,
    medianAbsoluteSkew,
    p95AbsoluteSkew,
    skewStandardDeviation,
    meanAdjustedSkew,
    perDomain,
    perLanguage,
    stagePrevalence,
    overallPassed,
    passRate,
    totalDurationMs,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function stddev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function emptyAggregateMetrics(
  totalPairs: number,
  _thresholds: CalibrationThresholds,
): AggregateMetrics {
  return {
    totalPairs,
    completedPairs: 0,
    failedPairs: totalPairs,
    meanDirectionalSkew: 0,
    meanAbsoluteSkew: 0,
    maxAbsoluteSkew: 0,
    medianAbsoluteSkew: 0,
    p95AbsoluteSkew: 0,
    skewStandardDeviation: 0,
    meanAdjustedSkew: 0,
    perDomain: {},
    perLanguage: {},
    stagePrevalence: {
      extractionBiasCount: 0,
      researchBiasCount: 0,
      evidenceBiasCount: 0,
      verdictBiasCount: 0,
    },
    overallPassed: false,
    passRate: 0,
    totalDurationMs: 0,
  };
}
