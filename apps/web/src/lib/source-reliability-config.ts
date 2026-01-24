/**
 * FactHarbor - Source Reliability Shared Configuration
 *
 * Centralized configuration for source reliability evaluation.
 * Used by: internal evaluator, admin API, analyzer pipeline.
 *
 * @module lib/source-reliability-config
 */

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
// SOURCE TYPE SCORE CAPS
// ============================================================================

/**
 * Hard ceiling scores based on source type classification.
 * These caps are enforced deterministically after LLM evaluation.
 *
 * Per Source_Reliability.md documentation:
 * - propaganda_outlet/known_disinformation: should land in 0.00-0.20 range
 * - state_controlled_media: default below mixed unless evidence shows independence
 * - platform_ugc: default below mixed unless evidence shows verification
 */
export const SOURCE_TYPE_CAPS: Record<string, number> = {
  propaganda_outlet: 0.14,      // highly_unreliable ceiling
  known_disinformation: 0.14,  // highly_unreliable ceiling
  state_controlled_media: 0.42, // leaning_unreliable ceiling
  platform_ugc: 0.42,           // leaning_unreliable ceiling
};

// ============================================================================
// RATING BAND MAPPING
// ============================================================================

/**
 * Rating band boundaries (score → factualRating).
 * Single source of truth for all score↔rating conversions.
 */
export const RATING_BANDS = [
  { min: 0.86, max: 1.00, rating: "highly_reliable" },
  { min: 0.72, max: 0.859, rating: "reliable" },
  { min: 0.58, max: 0.719, rating: "leaning_reliable" },
  { min: 0.43, max: 0.579, rating: "mixed" },
  { min: 0.29, max: 0.429, rating: "leaning_unreliable" },
  { min: 0.15, max: 0.289, rating: "unreliable" },
  { min: 0.00, max: 0.149, rating: "highly_unreliable" },
] as const;

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
  reliable: 0.80,             // Need good evidence
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

/**
 * Get the complete SR configuration with environment overrides.
 * Use this instead of reading env vars directly.
 */
export function getSRConfig() {
  return {
    enabled: process.env.FH_SR_ENABLED !== "false",
    multiModel: process.env.FH_SR_MULTI_MODEL !== "false",
    confidenceThreshold: parseFloat(
      process.env.FH_SR_CONFIDENCE_THRESHOLD || String(DEFAULT_CONFIDENCE_THRESHOLD)
    ),
    consensusThreshold: parseFloat(
      process.env.FH_SR_CONSENSUS_THRESHOLD || String(DEFAULT_CONSENSUS_THRESHOLD)
    ),
    defaultScore: parseFloat(
      process.env.FH_SR_DEFAULT_SCORE || String(DEFAULT_UNKNOWN_SCORE)
    ),
    cacheTtlDays: parseInt(process.env.FH_SR_CACHE_TTL_DAYS || "90", 10),
    filterEnabled: process.env.FH_SR_FILTER_ENABLED !== "false",
    rateLimitPerIp: parseInt(process.env.FH_SR_RATE_LIMIT_PER_IP || "10", 10),
    domainCooldownSec: parseInt(process.env.FH_SR_RATE_LIMIT_DOMAIN_COOLDOWN || "60", 10),
  };
}
