/**
 * FactHarbor Analyzer - 7-Point Truth Scale
 *
 * SYMMETRIC 7-LEVEL SCALE (centered on 50%):
 *
 * | Range    | Verdict       | Score |
 * |----------|---------------|-------|
 * | 86-100%  | True          | +3    |
 * | 72-85%   | Mostly True   | +2    |
 * | 58-71%   | Leaning True  | +1    |
 * | 43-57%   | Unverified    |  0    |
 * | 29-42%   | Leaning False | -1    |
 * | 15-28%   | Mostly False  | -2    |
 * | 0-14%    | False         | -3    |
 *
 * @module analyzer/truth-scale
 */

import type {
  ClaimVerdict7Point,
  QuestionAnswer7Point,
  ArticleVerdict7Point,
} from "./types";

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
  switch (band) {
    case "strong":
      return Math.round(72 + 28 * conf);
    case "partial":
      return Math.round(50 + 35 * conf);
    case "uncertain":
      return Math.round(35 + 30 * conf);
    case "refuted":
      return Math.round(28 * (1 - conf));
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
 * Calculate truth percentage for question answers
 */
export function calculateQuestionTruthPercentage(
  answerPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(answerPercentage);
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

/**
 * Map truth percentage to 7-point claim verdict
 */
export function percentageToClaimVerdict(truthPercentage: number): ClaimVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) return "UNVERIFIED";
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Map truth percentage to question answer
 */
export function percentageToQuestionAnswer(
  truthPercentage: number,
): QuestionAnswer7Point {
  if (truthPercentage >= 86) return "YES";
  if (truthPercentage >= 72) return "MOSTLY-YES";
  if (truthPercentage >= 58) return "LEANING-YES";
  if (truthPercentage >= 43) return "UNVERIFIED";
  if (truthPercentage >= 29) return "LEANING-NO";
  if (truthPercentage >= 15) return "MOSTLY-NO";
  return "NO";
}

/**
 * Map truth percentage to article verdict
 */
export function percentageToArticleVerdict(
  truthPercentage: number,
): ArticleVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) return "UNVERIFIED";
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

// ============================================================================
// CALIBRATION FUNCTIONS (Legacy compatibility)
// ============================================================================

/**
 * Map confidence to claim verdict (for backward compatibility)
 */
export function calibrateClaimVerdict(
  truthPercentage: number,
  confidence: number,
): ClaimVerdict7Point {
  const truthPct = calculateTruthPercentage(truthPercentage, confidence);
  return percentageToClaimVerdict(truthPct);
}


/**
 * Map confidence to question answer (for backward compatibility)
 */
export function calibrateQuestionAnswer(
  truthPercentage: number,
  confidence: number,
): QuestionAnswer7Point {
  const truthPct = calculateQuestionTruthPercentage(truthPercentage, confidence);
  return percentageToQuestionAnswer(truthPct);
}


/**
 * Map confidence to article verdict
 */
export function calibrateArticleVerdict(
  truthPercentage: number,
  confidence: number,
): ArticleVerdict7Point {
  const truthPct = calculateArticleTruthPercentage(truthPercentage, confidence);
  return percentageToArticleVerdict(truthPct);
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
    case "YES":
      return { bg: "#d4edda", text: "#155724", border: "#28a745" };
    case "MOSTLY-TRUE":
    case "MOSTLY-YES":
      return { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a" };
    case "LEANING-TRUE":
    case "LEANING-YES":
      return { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b" };
    case "UNVERIFIED":
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" };
    case "LEANING-FALSE":
    case "LEANING-NO":
      return { bg: "#ffccbc", text: "#bf360c", border: "#ff5722" };
    case "MOSTLY-FALSE":
    case "MOSTLY-NO":
      return { bg: "#ffcdd2", text: "#c62828", border: "#f44336" };
    case "FALSE":
    case "NO":
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
):
  | "green"
  | "light-green"
  | "yellow"
  | "orange"
  | "dark-orange"
  | "red"
  | "dark-red" {
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= 86) return "green";
  if (normalized >= 72) return "light-green";
  if (normalized >= 58) return "yellow";
  if (normalized >= 43) return "orange";
  if (normalized >= 29) return "dark-orange";
  if (normalized >= 15) return "red";
  return "dark-red";
}


/**
 * Simple 3-color highlight (legacy)
 */
export function getHighlightColor(truthPercentage: number): "green" | "yellow" | "red" {
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= 72) return "green";
  if (normalized >= 43) return "yellow";
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
