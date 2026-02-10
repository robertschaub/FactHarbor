/**
 * Post-Verdict Grounding Check (M2 from Anti-Hallucination Strategy)
 *
 * Validates that verdict reasoning is grounded in cited evidence items.
 * Uses a heuristic approach (zero LLM cost): extracts key terms from
 * reasoning and checks if they appear in the cited evidence text.
 *
 * Returns a groundingRatio (0-1) used by confidence calibration (Layer 5).
 *
 * All functions are pure (no side effects, no LLM calls).
 *
 * @module analyzer/grounding-check
 */

import type { ClaimVerdict, EvidenceItem } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface GroundingCheckResult {
  /** Overall ratio of grounded claims across all verdicts (0-1) */
  groundingRatio: number;
  /** Per-verdict grounding details */
  verdictDetails: VerdictGroundingDetail[];
  /** Warning messages for ungrounded verdicts */
  warnings: string[];
}

export interface VerdictGroundingDetail {
  claimId: string;
  /** Number of key terms from reasoning found in cited evidence */
  groundedTermCount: number;
  /** Total number of key terms extracted from reasoning */
  totalTermCount: number;
  /** Per-verdict grounding ratio (0-1) */
  ratio: number;
  /** Whether this verdict has any cited evidence at all */
  hasCitedEvidence: boolean;
}

export interface GroundingPenaltyConfig {
  enabled: boolean;
  /** Grounding ratio below this triggers a penalty (default 0.5) */
  threshold: number;
  /** How aggressively to reduce confidence (default 0.3) */
  reductionFactor: number;
  /** Minimum grounding ratio before maximum penalty applies (default 0.1) */
  floorRatio: number;
}

export const DEFAULT_GROUNDING_PENALTY_CONFIG: GroundingPenaltyConfig = {
  enabled: true,
  threshold: 0.5,
  reductionFactor: 0.3,
  floorRatio: 0.1,
};

// ============================================================================
// TERM EXTRACTION
// ============================================================================

// Common stop words to ignore when extracting key terms
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "ought",
  "that", "this", "these", "those", "which", "who", "whom", "what",
  "where", "when", "how", "why", "not", "no", "nor", "but", "or",
  "and", "if", "then", "than", "too", "very", "just", "also", "so",
  "for", "from", "with", "about", "against", "between", "through",
  "during", "before", "after", "above", "below", "to", "of", "in",
  "on", "at", "by", "into", "out", "up", "down", "off", "over",
  "under", "again", "further", "once", "here", "there", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such",
  "only", "own", "same", "any", "its", "it", "they", "them", "their",
  "we", "our", "he", "she", "him", "her", "his", "you", "your",
  "evidence", "claim", "supports", "contradicts", "shows", "indicates",
  "suggests", "based", "according", "therefore", "however", "although",
  "while", "since", "because", "overall", "generally", "specifically",
  "verdict", "true", "false", "mixed", "unverified", "mostly",
]);

/**
 * Extract meaningful key terms from reasoning text.
 * Returns lowercased terms with stop words removed.
 */
export function extractKeyTerms(reasoning: string): string[] {
  if (!reasoning || reasoning.trim().length === 0) return [];

  // Tokenize: split on non-alphanumeric, filter short words and stop words
  const tokens = reasoning
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP_WORDS.has(t));

  // Deduplicate
  return [...new Set(tokens)];
}

// ============================================================================
// GROUNDING CHECK
// ============================================================================

/**
 * Build a searchable text corpus from the cited evidence items.
 */
function buildEvidenceCorpus(
  evidenceIds: string[],
  allEvidence: EvidenceItem[],
): string {
  const evidenceMap = new Map(allEvidence.map(e => [e.id, e]));
  const parts: string[] = [];

  for (const id of evidenceIds) {
    const item = evidenceMap.get(id);
    if (item) {
      parts.push(item.statement);
      if (item.sourceExcerpt) parts.push(item.sourceExcerpt);
    }
  }

  return parts.join(" ").toLowerCase();
}

/**
 * Check how well a verdict's reasoning is grounded in its cited evidence.
 *
 * For each claim verdict:
 * 1. Extract key terms from the reasoning text
 * 2. Build a corpus from the cited supportingEvidenceIds
 * 3. Count how many key terms appear in the evidence corpus
 * 4. Return ratio of grounded terms / total terms
 */
export function checkVerdictGrounding(
  claimVerdicts: ClaimVerdict[],
  allEvidence: EvidenceItem[],
): GroundingCheckResult {
  if (!claimVerdicts || claimVerdicts.length === 0) {
    return { groundingRatio: 1, verdictDetails: [], warnings: [] };
  }

  const verdictDetails: VerdictGroundingDetail[] = [];
  const warnings: string[] = [];
  let totalGroundedTerms = 0;
  let totalTerms = 0;

  for (const verdict of claimVerdicts) {
    const reasoning = verdict.reasoning || "";
    const evidenceIds = verdict.supportingEvidenceIds || [];
    const hasCitedEvidence = evidenceIds.length > 0;

    const keyTerms = extractKeyTerms(reasoning);

    if (keyTerms.length === 0) {
      // No meaningful terms to check — consider fully grounded (trivial reasoning)
      verdictDetails.push({
        claimId: verdict.claimId,
        groundedTermCount: 0,
        totalTermCount: 0,
        ratio: 1,
        hasCitedEvidence,
      });
      continue;
    }

    if (!hasCitedEvidence) {
      // No cited evidence but has reasoning — fully ungrounded
      verdictDetails.push({
        claimId: verdict.claimId,
        groundedTermCount: 0,
        totalTermCount: keyTerms.length,
        ratio: 0,
        hasCitedEvidence: false,
      });
      totalTerms += keyTerms.length;
      warnings.push(
        `Claim ${verdict.claimId}: reasoning has ${keyTerms.length} key terms but no cited evidence`,
      );
      continue;
    }

    // Build evidence corpus and check term presence
    const corpus = buildEvidenceCorpus(evidenceIds, allEvidence);
    let groundedCount = 0;

    for (const term of keyTerms) {
      if (corpus.includes(term)) {
        groundedCount++;
      }
    }

    const ratio = keyTerms.length > 0 ? groundedCount / keyTerms.length : 1;

    verdictDetails.push({
      claimId: verdict.claimId,
      groundedTermCount: groundedCount,
      totalTermCount: keyTerms.length,
      ratio,
      hasCitedEvidence: true,
    });

    totalGroundedTerms += groundedCount;
    totalTerms += keyTerms.length;

    if (ratio < 0.3) {
      warnings.push(
        `Claim ${verdict.claimId}: low grounding ratio ${(ratio * 100).toFixed(0)}% ` +
        `(${groundedCount}/${keyTerms.length} terms found in cited evidence)`,
      );
    }
  }

  const overallRatio = totalTerms > 0 ? totalGroundedTerms / totalTerms : 1;

  return {
    groundingRatio: overallRatio,
    verdictDetails,
    warnings,
  };
}

// ============================================================================
// LAYER 5: GROUNDING PENALTY (for confidence calibration)
// ============================================================================

/**
 * Apply grounding penalty to confidence.
 * If grounding ratio is below threshold, reduce confidence proportionally.
 *
 * Formula: penalty = (threshold - ratio) / (threshold - floorRatio) * reductionFactor * 100
 * The penalty is capped at reductionFactor * 100 percentage points.
 */
export function applyGroundingPenalty(
  confidence: number,
  groundingRatio: number,
  config: GroundingPenaltyConfig = DEFAULT_GROUNDING_PENALTY_CONFIG,
): { adjustedConfidence: number; penalty: number; applied: boolean } {
  if (!config.enabled || groundingRatio >= config.threshold) {
    return { adjustedConfidence: confidence, penalty: 0, applied: false };
  }

  const effectiveRatio = Math.max(config.floorRatio, groundingRatio);
  const shortfall = config.threshold - effectiveRatio;
  const range = config.threshold - config.floorRatio;
  const normalizedShortfall = range > 0 ? shortfall / range : 1;
  const penalty = Math.round(normalizedShortfall * config.reductionFactor * 100);
  const adjusted = Math.max(5, confidence - penalty);

  return { adjustedConfidence: adjusted, penalty, applied: true };
}
