/**
 * FactHarbor Analyzer - 7-Point Truth Scale
 *
 * SYMMETRIC 7-LEVEL SCALE (centered on 50%):
 *
 * | Range    | Verdict       | Score | Confidence |
 * |----------|---------------|-------|------------|
 * | 86-100%  | True          | +3    |            |
 * | 72-85%   | Mostly True   | +2    |            |
 * | 58-71%   | Leaning True  | +1    |            |
 * | 43-57%   | Mixed         |  0    | >= 60%     |
 * | 43-57%   | Unverified    |  0    | < 60%      |
 * | 29-42%   | Leaning False | -1    |            |
 * | 15-28%   | Mostly False  | -2    |            |
 * | 0-14%    | False         | -3    |            |
 *
 * Note: MIXED vs UNVERIFIED distinguished by confidence:
 * - MIXED: Evidence exists on both sides (high confidence in mixed state)
 * - UNVERIFIED: Insufficient evidence to judge (low confidence)
 *
 * @module analyzer/truth-scale
 */

import type { ClaimVerdict7Point, ArticleVerdict7Point } from "./types";

/**
 * Optional verdict band configuration for configurable thresholds.
 * When not provided, functions use default 7-point scale values.
 */
export interface VerdictBandConfig {
  TRUE: number;          // default 86
  MOSTLY_TRUE: number;   // default 72
  LEANING_TRUE: number;  // default 58
  MIXED: number;         // default 43
  LEANING_FALSE: number; // default 29
  MOSTLY_FALSE: number;  // default 15
}

const DEFAULT_BANDS: VerdictBandConfig = {
  TRUE: 86,
  MOSTLY_TRUE: 72,
  LEANING_TRUE: 58,
  MIXED: 43,
  LEANING_FALSE: 29,
  MOSTLY_FALSE: 15,
};

// ============================================================================
// PERCENTAGE CALCULATIONS
// ============================================================================

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 50;
  const normalized = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function truthFromBand(
  band: "strong" | "partial" | "uncertain" | "refuted",
  confidence: number,
): number {
  const conf = normalizePercentage(confidence) / 100;
  const b = DEFAULT_BANDS;
  const mtUpper = b.TRUE - 1;
  const mxMid = Math.floor((b.MIXED + b.LEANING_TRUE - 1) / 2);
  const lfMid = Math.floor((b.LEANING_FALSE + b.MIXED - 1) / 2);
  const ltMid = Math.ceil((b.LEANING_TRUE + b.MOSTLY_TRUE - 1) / 2);
  const mfUpper = b.LEANING_FALSE - 1;
  switch (band) {
    case "strong":
      return Math.round(b.MOSTLY_TRUE + (100 - b.MOSTLY_TRUE) * conf);
    case "partial":
      return Math.round(mxMid + (mtUpper - mxMid) * conf);
    case "uncertain":
      return Math.round(lfMid + (ltMid - lfMid) * conf);
    case "refuted":
      return Math.round(mfUpper * (1 - conf));
  }
}

/**
 * Calculate truth percentage from LLM verdict + confidence
 * Returns 0-100% on symmetric scale
 */
export function calculateTruthPercentage(
  verdictPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(verdictPercentage);
}


/**
 * Calculate article truth percentage from LLM article verdict
 */
export function calculateArticleTruthPercentage(
  verdictPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(verdictPercentage);
}


// ============================================================================
// PERCENTAGE TO VERDICT MAPPING
// ============================================================================

// Default confidence threshold to distinguish MIXED from UNVERIFIED
const DEFAULT_MIXED_CONFIDENCE_THRESHOLD = 60;

/**
 * Map truth percentage to 7-point claim verdict
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish MIXED from UNVERIFIED.
 * @param bands - Optional configurable band thresholds (from CalcConfig)
 * @param mixedConfidenceThreshold - Optional threshold for MIXED vs UNVERIFIED (from CalcConfig)
 */
export function percentageToClaimVerdict(
  truthPercentage: number,
  confidence?: number,
  bands?: VerdictBandConfig,
  mixedConfidenceThreshold?: number,
): ClaimVerdict7Point {
  const b = bands ?? DEFAULT_BANDS;
  const mct = mixedConfidenceThreshold ?? DEFAULT_MIXED_CONFIDENCE_THRESHOLD;
  if (truthPercentage >= b.TRUE) return "TRUE";
  if (truthPercentage >= b.MOSTLY_TRUE) return "MOSTLY-TRUE";
  if (truthPercentage >= b.LEANING_TRUE) return "LEANING-TRUE";
  if (truthPercentage >= b.MIXED) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= mct ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= b.LEANING_FALSE) return "LEANING-FALSE";
  if (truthPercentage >= b.MOSTLY_FALSE) return "MOSTLY-FALSE";
  return "FALSE";
}

export function percentageToArticleVerdict(
  truthPercentage: number,
  confidence?: number,
  bands?: VerdictBandConfig,
  mixedConfidenceThreshold?: number,
): ArticleVerdict7Point {
  const b = bands ?? DEFAULT_BANDS;
  const mct = mixedConfidenceThreshold ?? DEFAULT_MIXED_CONFIDENCE_THRESHOLD;
  if (truthPercentage >= b.TRUE) return "TRUE";
  if (truthPercentage >= b.MOSTLY_TRUE) return "MOSTLY-TRUE";
  if (truthPercentage >= b.LEANING_TRUE) return "LEANING-TRUE";
  if (truthPercentage >= b.MIXED) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= mct ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= b.LEANING_FALSE) return "LEANING-FALSE";
  if (truthPercentage >= b.MOSTLY_FALSE) return "MOSTLY-FALSE";
  return "FALSE";
}

// ============================================================================
// CALIBRATION FUNCTIONS (Legacy compatibility)
// ============================================================================

/**
 * Map confidence to claim verdict (for backward compatibility)
 * Now passes confidence to distinguish MIXED from UNVERIFIED
 */
export function calibrateClaimVerdict(
  truthPercentage: number,
  confidence: number,
): ClaimVerdict7Point {
  const truthPct = calculateTruthPercentage(truthPercentage, confidence);
  return percentageToClaimVerdict(truthPct, confidence);
}


/**
 * Map confidence to article verdict
 * Now passes confidence to distinguish MIXED from UNVERIFIED
 */
export function calibrateArticleVerdict(
  truthPercentage: number,
  confidence: number,
): ArticleVerdict7Point {
  const truthPct = calculateArticleTruthPercentage(truthPercentage, confidence);
  return percentageToArticleVerdict(truthPct, confidence);
}


// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Get color for 7-level verdict display
 */
export function getVerdictColor(verdict: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (verdict) {
    case "TRUE":
      return { bg: "#d4edda", text: "#155724", border: "#28a745" };
    case "MOSTLY-TRUE":
      return { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a" };
    case "LEANING-TRUE":
      return { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b" };
    case "MIXED":
      // Blue-ish color to indicate confident mix (distinct from UNVERIFIED)
      return { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3" };
    case "UNVERIFIED":
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" };
    case "LEANING-FALSE":
      return { bg: "#ffccbc", text: "#bf360c", border: "#ff5722" };
    case "MOSTLY-FALSE":
      return { bg: "#ffcdd2", text: "#c62828", border: "#f44336" };
    case "FALSE":
      return { bg: "#b71c1c", text: "#ffffff", border: "#b71c1c" };
    default:
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" };
  }
}

/**
 * Get highlight color class for 7-level scale
 */
export function getHighlightColor7Point(
  truthPercentage: number,
  bands?: VerdictBandConfig,
):
  | "green"
  | "light-green"
  | "yellow"
  | "orange"
  | "dark-orange"
  | "red"
  | "dark-red" {
  const b = bands ?? DEFAULT_BANDS;
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= b.TRUE) return "green";
  if (normalized >= b.MOSTLY_TRUE) return "light-green";
  if (normalized >= b.LEANING_TRUE) return "yellow";
  if (normalized >= b.MIXED) return "orange";
  if (normalized >= b.LEANING_FALSE) return "dark-orange";
  if (normalized >= b.MOSTLY_FALSE) return "red";
  return "dark-red";
}


/**
 * Simple 3-color highlight (legacy)
 */
export function getHighlightColor(truthPercentage: number, bands?: VerdictBandConfig): "green" | "yellow" | "red" {
  const b = bands ?? DEFAULT_BANDS;
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= b.MOSTLY_TRUE) return "green";
  if (normalized >= b.MIXED) return "yellow";
  return "red";
}


/**
 * Normalize 7-point highlight color to 3-color UI system
 * Maps: green, light-green -> green
 *       yellow, orange -> yellow
 *       dark-orange, red, dark-red -> red
 */
export function normalizeHighlightColor(
  color: "green" | "light-green" | "yellow" | "orange" | "dark-orange" | "red" | "dark-red"
): "green" | "yellow" | "red" {
  switch (color) {
    case "green":
    case "light-green":
      return "green";
    case "yellow":
    case "orange":
      return "yellow";
    case "dark-orange":
    case "red":
    case "dark-red":
      return "red";
    default:
      return "yellow";
  }
}
