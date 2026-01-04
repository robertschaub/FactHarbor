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

/**
 * Calculate truth percentage from LLM verdict + confidence
 * Returns 0-100% on symmetric scale
 */
export function calculateTruthPercentage(
  llmVerdict: string,
  llmConfidence: number,
): number {
  const conf = Math.max(0, Math.min(100, llmConfidence)) / 100;

  switch (llmVerdict) {
    case "WELL-SUPPORTED":
      return Math.round(72 + 28 * conf);

    case "PARTIALLY-SUPPORTED":
      return Math.round(50 + 35 * conf);

    case "UNCERTAIN":
      return Math.round(35 + 30 * conf);

    case "REFUTED":
    case "FALSE":
      return Math.round(28 * (1 - conf));

    default:
      return 50;
  }
}

/**
 * Calculate truth percentage for question answers
 */
export function calculateQuestionTruthPercentage(
  llmAnswer: string,
  llmConfidence: number,
): number {
  const conf = Math.max(0, Math.min(100, llmConfidence)) / 100;

  switch (llmAnswer) {
    case "YES":
      return Math.round(72 + 28 * conf);
    case "PARTIALLY":
      return Math.round(43 + 28 * conf);
    case "NO":
      return Math.round(28 * (1 - conf));
    case "INSUFFICIENT-EVIDENCE":
      return 50;
    default:
      return 50;
  }
}

/**
 * Calculate article truth percentage from LLM article verdict
 */
export function calculateArticleTruthPercentage(
  llmVerdict: string,
  llmConfidence: number,
): number {
  const conf = Math.max(0, Math.min(100, llmConfidence)) / 100;

  switch (llmVerdict) {
    case "CREDIBLE":
    case "TRUE":
      return Math.round(72 + 28 * conf);
    case "MOSTLY-CREDIBLE":
    case "MOSTLY-TRUE":
      return Math.round(58 + 27 * conf);
    case "MISLEADING":
      return Math.round(42 - 27 * conf);
    case "MOSTLY-FALSE":
    case "LEANING-FALSE":
      return Math.round(15 + 14 * (1 - conf));
    case "FALSE":
    case "REFUTED":
      return Math.round(14 * (1 - conf));
    default:
      return 50;
  }
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
  llmVerdict: string,
  confidence: number,
): ClaimVerdict7Point {
  const truthPct = calculateTruthPercentage(llmVerdict, confidence);
  return percentageToClaimVerdict(truthPct);
}

/**
 * Map confidence to question answer (for backward compatibility)
 */
export function calibrateQuestionAnswer(
  llmAnswer: string,
  confidence: number,
): QuestionAnswer7Point {
  const truthPct = calculateQuestionTruthPercentage(llmAnswer, confidence);
  return percentageToQuestionAnswer(truthPct);
}

/**
 * Map confidence to article verdict
 */
export function calibrateArticleVerdict(
  llmVerdict: string,
  confidence: number,
): ArticleVerdict7Point {
  if (
    llmVerdict === "FALSE" ||
    llmVerdict === "REFUTED"
  ) {
    if (confidence >= 95) return "FALSE";
    if (confidence >= 75) return "FALSE";
    if (confidence >= 55) return "MOSTLY-FALSE";
    return "UNVERIFIED";
  }

  if (llmVerdict === "MISLEADING") {
    if (confidence >= 75) return "MOSTLY-FALSE";
    if (confidence >= 55) return "LEANING-TRUE";
    return "UNVERIFIED";
  }

  if (llmVerdict === "MOSTLY-CREDIBLE") {
    if (confidence >= 75) return "MOSTLY-TRUE";
    return "LEANING-TRUE";
  }

  if (llmVerdict === "CREDIBLE") {
    if (confidence >= 95) return "TRUE";
    if (confidence >= 75) return "MOSTLY-TRUE";
    return "LEANING-TRUE";
  }

  if (confidence >= 95) return "TRUE";
  if (confidence >= 75) return "MOSTLY-TRUE";
  if (confidence >= 55) return "LEANING-TRUE";
  if (confidence >= 45) return "UNVERIFIED";
  if (confidence >= 25) return "MOSTLY-FALSE";
  if (confidence >= 5) return "FALSE";
  return "FALSE";
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
  verdict: string,
):
  | "green"
  | "light-green"
  | "yellow"
  | "orange"
  | "dark-orange"
  | "red"
  | "dark-red" {
  switch (verdict) {
    case "TRUE":
    case "YES":
      return "green";
    case "MOSTLY-TRUE":
    case "MOSTLY-YES":
      return "light-green";
    case "LEANING-TRUE":
    case "LEANING-YES":
      return "yellow";
    case "UNVERIFIED":
      return "orange";
    case "LEANING-FALSE":
    case "LEANING-NO":
      return "dark-orange";
    case "MOSTLY-FALSE":
    case "MOSTLY-NO":
      return "red";
    case "FALSE":
    case "NO":
      return "dark-red";
    default:
      return "orange";
  }
}

/**
 * Simple 3-color highlight (legacy)
 */
export function getHighlightColor(verdict: string): "green" | "yellow" | "red" {
  switch (verdict) {
    case "WELL-SUPPORTED":
    case "TRUE":
    case "MOSTLY-TRUE":
      return "green";
    case "UNCERTAIN":
    case "LEANING-TRUE":
    case "LEANING-FALSE":
    case "UNVERIFIED":
      return "yellow";
    case "REFUTED":
    case "MOSTLY-FALSE":
    case "FALSE":
    default:
      return "red";
  }
}
