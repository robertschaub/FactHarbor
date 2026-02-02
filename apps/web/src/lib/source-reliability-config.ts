/**
 * FactHarbor - Source Reliability Shared Configuration
 *
 * Centralized configuration for source reliability evaluation.
 * Used by: internal evaluator, admin API, analyzer pipeline.
 *
 * @module lib/source-reliability-config
 */

import { DEFAULT_SR_CONFIG, type SourceReliabilityConfig } from "./config-schemas";

// ============================================================================
// THRESHOLDS (unified across all consumers)
// ============================================================================

/**
 * Default confidence threshold for accepting a reliability score.
 * Scores below this threshold are treated as insufficient_data.
 * Unified to 0.8 across admin, pipeline, and evaluator.
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Default consensus threshold for multi-model evaluation.
 * If models disagree by more than this, consensus fails.
 * Raised from 0.15 to 0.20 to reduce failures from minor disagreements.
 */
export const DEFAULT_CONSENSUS_THRESHOLD = 0.20;

/**
 * Default score for unknown sources (neutral center of the scale).
 */
export const DEFAULT_UNKNOWN_SCORE = 0.5;

// ============================================================================
// SOURCE TYPE SCORE CAPS (REFERENCE ONLY - PROMPT IS AUTHORITATIVE)
// ============================================================================

/**
 * Expected score caps for source types.
 *
 * IMPORTANT (v2.8.3): These values are REFERENCE ONLY for validation warnings.
 * The authoritative source for caps is the source-reliability.prompt.md file.
 * Edit the prompt to change evaluation criteria - do NOT change these values.
 *
 * See: prompts/source-reliability.prompt.md section "SOURCE TYPE SCORE CAPS"
 */
export const SOURCE_TYPE_EXPECTED_CAPS: Record<string, number> = {
  propaganda_outlet: 0.14,      // highly_unreliable band
  known_disinformation: 0.14,   // highly_unreliable band
  state_controlled_media: 0.42, // leaning_unreliable band
  platform_ugc: 0.42,           // leaning_unreliable band
};

// ============================================================================
// RATING BANDS (REFERENCE ONLY - PROMPT IS AUTHORITATIVE)
// ============================================================================

/**
 * Rating band boundaries for reference and validation.
 *
 * IMPORTANT (v2.8.3): The authoritative source for rating bands is the
 * source-reliability.prompt.md file. These are kept for scoreToFactualRating()
 * to ensure score↔rating alignment after LLM evaluation.
 *
 * See: prompts/source-reliability.prompt.md section "RATING SCALE"
 */

export type FactualRating =
  | "highly_reliable"
  | "reliable"
  | "leaning_reliable"
  | "mixed"
  | "leaning_unreliable"
  | "unreliable"
  | "highly_unreliable"
  | "insufficient_data";

/**
 * Convert a numeric score to a factual rating.
 * Single source of truth for band mapping.
 */
export function scoreToFactualRating(score: number | null): FactualRating {
  if (score === null) return "insufficient_data";
  if (score >= 0.86) return "highly_reliable";
  if (score >= 0.72) return "reliable";
  if (score >= 0.58) return "leaning_reliable";
  if (score >= 0.43) return "mixed";
  if (score >= 0.29) return "leaning_unreliable";
  if (score >= 0.15) return "unreliable";
  return "highly_unreliable";
}

/**
 * Get the expected score range for a given rating.
 */
export function ratingToScoreRange(rating: FactualRating): { min: number; max: number } | null {
  switch (rating) {
    case "highly_reliable": return { min: 0.86, max: 1.00 };
    case "reliable": return { min: 0.72, max: 0.859 };
    case "leaning_reliable": return { min: 0.58, max: 0.719 };
    case "mixed": return { min: 0.43, max: 0.579 };
    case "leaning_unreliable": return { min: 0.29, max: 0.429 };
    case "unreliable": return { min: 0.15, max: 0.289 };
    case "highly_unreliable": return { min: 0.00, max: 0.149 };
    case "insufficient_data": return null;
    default: return null;
  }
}

// ============================================================================
// GROUNDING REQUIREMENTS
// ============================================================================

/**
 * Minimum unique evidence IDs required for non-null scores.
 * If fewer evidence IDs are cited, consider rejecting the score.
 */
export const MIN_EVIDENCE_IDS_FOR_SCORE = 1;

/**
 * Minimum foundedness score for accepting high-reliability scores.
 * High scores (>= 0.72) require stronger grounding.
 */
export const MIN_FOUNDEDNESS_FOR_HIGH_SCORES = 3;

/**
 * Foundedness threshold below which we require higher confidence.
 */
export const WEAK_FOUNDEDNESS_THRESHOLD = 2;

// ============================================================================
// ASYMMETRIC CONFIDENCE GATING
// ============================================================================

/**
 * Higher confidence required for high scores (skeptical default).
 * Accepting a high score should be harder than accepting a low score.
 * Tuned: lowered requirements for borderline ratings to allow more through.
 */
export const CONFIDENCE_REQUIREMENTS: Record<string, number> = {
  highly_reliable: 0.85,      // Need strong evidence for best rating
  reliable: 0.75,             // Lowered from 0.80 - consensus boost often lands ~79%
  leaning_reliable: 0.65,     // Lowered from 0.70 - allows consensus to pass more easily
  mixed: 0.55,                // Lowered from 0.65 - allows borderline sources
  leaning_unreliable: 0.50,   // Lowered from 0.55
  unreliable: 0.45,           // Lowered from 0.50
  highly_unreliable: 0.40,    // Lowered from 0.45
};

/**
 * Check if confidence meets the asymmetric requirement for a given rating.
 */
export function meetsConfidenceRequirement(rating: FactualRating, confidence: number): boolean {
  if (rating === "insufficient_data") return true; // Always allowed
  const required = CONFIDENCE_REQUIREMENTS[rating] ?? DEFAULT_CONFIDENCE_THRESHOLD;
  return confidence >= required;
}

// ============================================================================
// UNIFIED CONFIG GETTER
// ============================================================================

let currentSRConfig: SourceReliabilityConfig = DEFAULT_SR_CONFIG;

export function setSRConfig(config?: SourceReliabilityConfig): void {
  currentSRConfig = config ?? DEFAULT_SR_CONFIG;
}

/**
 * Get the complete SR configuration.
 * UCM is the source of truth (no env overrides).
 */
export function getSRConfig(): SourceReliabilityConfig {
  return currentSRConfig;
}
