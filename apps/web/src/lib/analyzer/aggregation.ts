/**
 * Verdict aggregation utilities (weighted averages, etc.)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * @module analyzer/aggregation
 */

/**
 * Calculate claim weight based on centrality and confidence.
 * Higher centrality claims with higher confidence have more influence on the overall verdict.
 *
 * Weight = centralityMultiplier × (confidence / 100)
 * where centralityMultiplier: high=3.0, medium=2.0, low=1.0
 */
export function getClaimWeight(claim: {
  centrality?: "high" | "medium" | "low";
  confidence?: number;
  thesisRelevance?: "direct" | "tangential";
}): number {
  // Tangential claims have zero weight - they don't contribute to the verdict
  if (claim.thesisRelevance === "tangential") return 0;

  const centralityMultiplier =
    claim.centrality === "high"
      ? 3.0
      : claim.centrality === "medium"
        ? 2.0
        : 1.0;
  const confidenceNormalized = (claim.confidence ?? 50) / 100;
  return centralityMultiplier * confidenceNormalized;
}

/**
 * Calculate weighted average of claim verdicts.
 * Central claims with high confidence have more influence than peripheral low-confidence claims.
 *
 * - Tangential claims (thesisRelevance="tangential") are excluded from the calculation.
 * - Counter-claims (isCounterClaim=true) have their verdicts INVERTED before aggregation.
 *   If a counter-claim is TRUE (85%), it means the OPPOSITE of the user's thesis is true,
 *   so it contributes as FALSE (15%) to the overall verdict.
 *
 * Formula: Σ(effectiveTruthPercentage × weight) / Σ(weight)
 */
export function calculateWeightedVerdictAverage(
  claims: Array<{
    truthPercentage: number;
    centrality?: "high" | "medium" | "low";
    confidence?: number;
    thesisRelevance?: "direct" | "tangential";
    isCounterClaim?: boolean;
  }>,
): number {
  // Filter out tangential claims - they don't contribute to the verdict
  const directClaims = claims.filter((c) => c.thesisRelevance !== "tangential");
  if (directClaims.length === 0) return 50;

  let totalWeightedTruth = 0;
  let totalWeight = 0;

  for (const claim of directClaims) {
    const weight = getClaimWeight(claim);
    // Counter-claims evaluate the opposite position - invert their contribution
    // If counter-claim is TRUE (85%), it means user's thesis is FALSE (15%)
    const effectiveTruthPct = claim.isCounterClaim
      ? 100 - claim.truthPercentage
      : claim.truthPercentage;
    totalWeightedTruth += effectiveTruthPct * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(totalWeightedTruth / totalWeight) : 50;
}

