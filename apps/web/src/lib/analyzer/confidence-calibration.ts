/**
 * Confidence Calibration System
 *
 * Multi-layer deterministic post-processing to reduce confidence instability.
 * Designed by Kimi k2.5 (Session 24), implemented by Claude Opus 4.6 (Session 25).
 *
 * Layers:
 *   1. Evidence Density Anchor — minimum confidence based on evidence quality/quantity
 *   2. Confidence Band Snapping — reduce run-to-run jitter via calibration bands
 *   3. Verdict-Confidence Coupling — enforce logical consistency between verdict and confidence
 *   4. Context Confidence Consistency — flag and penalize divergent context confidences
 *
 * All functions are pure (no side effects, no LLM calls).
 *
 * @module analyzer/confidence-calibration
 */

import type { EvidenceItem, FetchedSource, AnalysisContextAnswer } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface CalibrationAdjustment {
  type: "density_anchor" | "band_snapping" | "verdict_coupling" | "context_consistency";
  before: number;
  after: number;
  reason: string;
}

export interface CalibrationResult {
  calibratedConfidence: number;
  adjustments: CalibrationAdjustment[];
  warnings: string[];
}

export interface DensityAnchorConfig {
  enabled: boolean;
  minConfidenceBase: number;  // floor for sparse evidence (default 15)
  minConfidenceMax: number;   // ceiling for rich evidence (default 75)
  sourceCountThreshold: number; // sources at which density maxes out (default 3)
}

export interface BandSnappingConfig {
  enabled: boolean;
  strength: number; // 0 = no snapping, 1 = full snap (default 0.5)
  customBands?: Array<{ min: number; max: number; snapTo: number }>;
}

export interface VerdictCouplingConfig {
  enabled: boolean;
  strongVerdictThreshold: number; // e.g., 70 → verdicts >= 70 or <= 30 are "strong"
  minConfidenceStrong: number;    // min confidence for strong verdicts (default 50)
  minConfidenceNeutral: number;   // min confidence for neutral verdicts (default 25)
}

export interface ContextConsistencyConfig {
  enabled: boolean;
  maxConfidenceSpread: number;  // max allowed spread before penalty (default 25)
  reductionFactor: number;      // how aggressively to reduce (default 0.5)
}

export interface ConfidenceCalibrationConfig {
  enabled: boolean;
  densityAnchor: DensityAnchorConfig;
  bandSnapping: BandSnappingConfig;
  verdictCoupling: VerdictCouplingConfig;
  contextConsistency: ContextConsistencyConfig;
}

// ============================================================================
// DEFAULT CONFIDENCE BANDS
// ============================================================================

export const DEFAULT_CONFIDENCE_BANDS = [
  { min: 0, max: 15, snapTo: 10, label: "very_low" },
  { min: 15, max: 30, snapTo: 25, label: "low" },
  { min: 30, max: 45, snapTo: 40, label: "moderate_low" },
  { min: 45, max: 55, snapTo: 50, label: "neutral" },
  { min: 55, max: 70, snapTo: 60, label: "moderate_high" },
  { min: 70, max: 85, snapTo: 75, label: "high" },
  { min: 85, max: 101, snapTo: 90, label: "very_high" },
] as const;

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_CALIBRATION_CONFIG: ConfidenceCalibrationConfig = {
  enabled: true,
  densityAnchor: {
    enabled: true,
    minConfidenceBase: 15,
    minConfidenceMax: 75,
    sourceCountThreshold: 3,
  },
  bandSnapping: {
    enabled: true,
    strength: 0.5,
  },
  verdictCoupling: {
    enabled: true,
    strongVerdictThreshold: 70,
    minConfidenceStrong: 50,
    minConfidenceNeutral: 25,
  },
  contextConsistency: {
    enabled: true,
    maxConfidenceSpread: 25,
    reductionFactor: 0.5,
  },
};

// ============================================================================
// LAYER 1: EVIDENCE DENSITY ANCHOR
// ============================================================================

/**
 * Calculate evidence density score (0–1) based on three factors:
 *   - Unique source count (50% weight)
 *   - High-probative evidence ratio (30% weight)
 *   - Evidence diversity — directions covered (20% weight)
 */
export function calculateEvidenceDensityScore(
  evidenceItems: EvidenceItem[],
  sources: FetchedSource[],
  sourceCountThreshold: number,
): number {
  if (evidenceItems.length === 0) return 0;

  // Factor 1: Unique sources with successful fetches
  const uniqueSourceIds = new Set(evidenceItems.map(e => e.sourceId));
  const successfulSources = sources.filter(s => s.fetchSuccess);
  const relevantSourceCount = Math.min(uniqueSourceIds.size, successfulSources.length);
  const sourceScore = Math.min(1.0, relevantSourceCount / Math.max(1, sourceCountThreshold));

  // Factor 2: High-probative evidence ratio
  const highProbativeCount = evidenceItems.filter(
    e => e.probativeValue === "high",
  ).length;
  const qualityScore = highProbativeCount / evidenceItems.length;

  // Factor 3: Evidence diversity (directions covered)
  const directionsCovered = new Set(
    evidenceItems.map(e => e.claimDirection).filter(Boolean),
  ).size;
  // support + contradict = max diversity (2 directions)
  const diversityScore = Math.min(1.0, directionsCovered / 2);

  return (
    sourceScore * 0.50 +
    qualityScore * 0.30 +
    diversityScore * 0.20
  );
}

/**
 * Calculate minimum confidence floor from evidence density.
 * Maps density score [0–1] → confidence range [minConfidenceBase–minConfidenceMax].
 */
export function calculateMinConfidenceFromDensity(
  densityScore: number,
  config: DensityAnchorConfig,
): number {
  const range = config.minConfidenceMax - config.minConfidenceBase;
  return Math.round(config.minConfidenceBase + densityScore * range);
}

// ============================================================================
// LAYER 2: CONFIDENCE BAND SNAPPING
// ============================================================================

/**
 * Find which band a raw confidence value falls into and return the snap target.
 */
export function snapConfidenceToBand(
  rawConfidence: number,
  config: BandSnappingConfig,
): number {
  const bands = config.customBands ?? DEFAULT_CONFIDENCE_BANDS;
  const normalizedConfidence = Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(100, rawConfidence))
    : 50;
  const lastBandIndex = bands.length - 1;
  const band = bands.find((candidateBand, index) => {
    if (index === lastBandIndex) {
      return normalizedConfidence >= candidateBand.min && normalizedConfidence <= candidateBand.max;
    }
    return normalizedConfidence >= candidateBand.min && normalizedConfidence < candidateBand.max;
  });
  return band ? band.snapTo : normalizedConfidence;
}

/**
 * Blend raw confidence with snapped value using configurable strength.
 * strength=0 → raw, strength=1 → fully snapped.
 */
export function blendWithSnap(
  rawConfidence: number,
  config: BandSnappingConfig,
): number {
  const snapped = snapConfidenceToBand(rawConfidence, config);
  return Math.round(
    rawConfidence * (1 - config.strength) + snapped * config.strength,
  );
}

// ============================================================================
// LAYER 3: VERDICT-CONFIDENCE COUPLING
// ============================================================================

/**
 * Enforce logical consistency between verdict truth percentage and confidence.
 * Strong verdicts (far from 50%) need reasonable confidence.
 * Neutral verdicts (near 50%) need at least minimal confidence.
 */
export function enforceVerdictConfidenceCoupling(
  verdict: number,
  confidence: number,
  config: VerdictCouplingConfig,
): number {
  const normalizedVerdict = Number.isFinite(verdict)
    ? Math.max(0, Math.min(100, verdict))
    : 50;
  const normalizedConfidence = Number.isFinite(confidence)
    ? Math.max(0, Math.min(100, confidence))
    : 50;

  const strongThresholdDistance = Math.max(1, Math.abs(config.strongVerdictThreshold - 50));
  const verdictDistanceFromNeutral = Math.abs(normalizedVerdict - 50);

  if (verdictDistanceFromNeutral >= strongThresholdDistance) {
    return Math.max(normalizedConfidence, config.minConfidenceStrong);
  }

  const isNeutralVerdict = normalizedVerdict >= 40 && normalizedVerdict <= 60;
  if (isNeutralVerdict && normalizedConfidence < config.minConfidenceNeutral) {
    return Math.max(normalizedConfidence, config.minConfidenceNeutral);
  }

  // Moderate verdicts (outside 40-60 but below strong threshold) get a linearly
  // interpolated floor to avoid a hard cliff around the strong verdict boundary.
  const neutralBoundaryDistance = 10; // 50±10 == [40, 60]
  if (
    verdictDistanceFromNeutral > neutralBoundaryDistance &&
    verdictDistanceFromNeutral < strongThresholdDistance
  ) {
    const interpolationSpan = Math.max(1, strongThresholdDistance - neutralBoundaryDistance);
    const interpolationRatio =
      (verdictDistanceFromNeutral - neutralBoundaryDistance) / interpolationSpan;
    const moderateFloor = Math.round(
      config.minConfidenceNeutral +
        (config.minConfidenceStrong - config.minConfidenceNeutral) * interpolationRatio,
    );
    return Math.max(normalizedConfidence, moderateFloor);
  }

  return normalizedConfidence;
}

// ============================================================================
// LAYER 4: CONTEXT CONFIDENCE CONSISTENCY
// ============================================================================

export interface ContextConsistencyResult {
  adjustedConfidence: number;
  warning?: string;
}

/**
 * Check if multiple context verdicts have wildly different confidences.
 * When spread exceeds threshold, reduce overall confidence proportionally.
 */
export function checkContextConfidenceConsistency(
  contextAnswers: AnalysisContextAnswer[],
  overallConfidence: number,
  config: ContextConsistencyConfig,
): ContextConsistencyResult {
  if (contextAnswers.length < 2) {
    return { adjustedConfidence: overallConfidence };
  }

  const confidences = contextAnswers.map(v => v.confidence);
  const maxConf = Math.max(...confidences);
  const minConf = Math.min(...confidences);
  const spread = maxConf - minConf;

  if (spread > config.maxConfidenceSpread) {
    const excess = spread - config.maxConfidenceSpread;
    const reduction = Math.round(excess * config.reductionFactor);
    return {
      adjustedConfidence: Math.max(10, overallConfidence - reduction),
      warning: `context_confidence_divergence: spread=${spread}pp (max allowed ${config.maxConfidenceSpread}pp)`,
    };
  }

  return { adjustedConfidence: overallConfidence };
}

// ============================================================================
// MASTER CALIBRATION FUNCTION
// ============================================================================

/**
 * Apply all calibration layers to a raw confidence value.
 * Layers are applied in order: density anchor → band snapping → verdict coupling → context consistency.
 *
 * @param rawConfidence - The raw confidence value from LLM verdict (0-100)
 * @param verdict - Truth percentage (0-100)
 * @param evidenceItems - All evidence items for this analysis
 * @param sources - All fetched sources
 * @param contextAnswers - Per-context verdict answers (for consistency check). Optional - Layer 4 is skipped if not provided or if < 2 contexts.
 * @param config - Calibration configuration
 * @returns CalibrationResult with calibrated confidence, adjustments log, and warnings
 */
export function calibrateConfidence(
  rawConfidence: number,
  verdict: number,
  evidenceItems: EvidenceItem[],
  sources: FetchedSource[],
  contextAnswers: AnalysisContextAnswer[] = [],
  config: ConfidenceCalibrationConfig,
): CalibrationResult {
  const normalizedRawConfidence = Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(100, rawConfidence))
    : 50;
  const normalizedVerdict = Number.isFinite(verdict)
    ? Math.max(0, Math.min(100, verdict))
    : 50;
  if (!config.enabled) {
    return {
      calibratedConfidence: normalizedRawConfidence,
      adjustments: [],
      warnings: [],
    };
  }

  const adjustments: CalibrationAdjustment[] = [];
  const warnings: string[] = [];
  let workingConfidence = normalizedRawConfidence;
  let densityFloor: number | null = null;

  // Layer 1: Evidence density anchor (minimum floor)
  if (config.densityAnchor.enabled) {
    const densityScore = calculateEvidenceDensityScore(
      evidenceItems,
      sources,
      config.densityAnchor.sourceCountThreshold,
    );
    const minFromDensity = calculateMinConfidenceFromDensity(densityScore, config.densityAnchor);
    densityFloor = minFromDensity;
    if (workingConfidence < minFromDensity) {
      adjustments.push({
        type: "density_anchor",
        before: workingConfidence,
        after: minFromDensity,
        reason: `Evidence density score ${densityScore.toFixed(2)} → min confidence ${minFromDensity}%`,
      });
      workingConfidence = minFromDensity;
    }
  }

  // Layer 2: Band snapping (jitter reduction)
  if (config.bandSnapping.enabled) {
    const blended = blendWithSnap(workingConfidence, config.bandSnapping);
    const floorAdjusted =
      densityFloor !== null ? Math.max(blended, densityFloor) : blended;
    if (blended !== workingConfidence) {
      adjustments.push({
        type: "band_snapping",
        before: workingConfidence,
        after: floorAdjusted,
        reason: `Snapped to calibration band (strength=${config.bandSnapping.strength})`,
      });
      workingConfidence = floorAdjusted;
    }
  }

  // Layer 3: Verdict-confidence coupling
  if (config.verdictCoupling.enabled) {
    const coupled = enforceVerdictConfidenceCoupling(
      verdict,
      workingConfidence,
      config.verdictCoupling,
    );
    if (coupled !== workingConfidence) {
      adjustments.push({
        type: "verdict_coupling",
        before: workingConfidence,
        after: coupled,
        reason: `Verdict ${normalizedVerdict}% requires min confidence ${coupled}%`,
      });
      workingConfidence = coupled;
    }
  }

  // Layer 4: Context consistency check
  if (config.contextConsistency.enabled && contextAnswers.length > 1) {
    const consistency = checkContextConfidenceConsistency(
      contextAnswers,
      workingConfidence,
      config.contextConsistency,
    );
    if (consistency.warning) {
      warnings.push(consistency.warning);
    }
    if (consistency.adjustedConfidence < workingConfidence) {
      adjustments.push({
        type: "context_consistency",
        before: workingConfidence,
        after: consistency.adjustedConfidence,
        reason: "Context confidence divergence detected",
      });
      workingConfidence = consistency.adjustedConfidence;
    }
  }

  // Final clamp to valid range
  workingConfidence = Math.max(5, Math.min(100, workingConfidence));

  return {
    calibratedConfidence: workingConfidence,
    adjustments,
    warnings,
  };
}
