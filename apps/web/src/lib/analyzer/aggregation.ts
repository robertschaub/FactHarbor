/**
 * Verdict aggregation utilities (weighted averages, etc.)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * @module analyzer/aggregation
 */

/**
 * Calculate claim weight based on centrality, confidence, and contestation status.
 * Higher centrality claims with higher confidence have more influence on the overall verdict.
 *
 * Base Weight = centralityMultiplier × (confidence / 100)
 * where centralityMultiplier: high=3.0, medium=2.0, low=1.0
 *
 * CONTESTED vs DOUBTED (v2.6.33):
 * - "Doubted" = someone disputes the claim but has NO factual counter-evidence (just opinion)
 *   → These keep FULL weight (doubt alone doesn't reduce influence)
 * - "Contested" = someone disputes the claim WITH actual factual counter-evidence
 *   → These get REDUCED weight because the evidence base is genuinely uncertain
 *
 * Weight reduction for contested claims:
 * - factualBasis "established" (strong counter-evidence): 0.3x weight
 * - factualBasis "disputed" (some counter-evidence): 0.5x weight
 * - factualBasis "opinion"/"alleged"/"unknown" (no counter-evidence): full weight
 */
export function getClaimWeight(claim: {
  centrality?: "high" | "medium" | "low";
  confidence?: number;
  thesisRelevance?: "direct" | "tangential" | "irrelevant";
  isContested?: boolean;
  factualBasis?: "established" | "disputed" | "alleged" | "opinion" | "unknown";
}): number {
  // Only direct claims contribute to the verdict
  if (claim.thesisRelevance && claim.thesisRelevance !== "direct") return 0;

  const centralityMultiplier =
    claim.centrality === "high"
      ? 3.0
      : claim.centrality === "medium"
        ? 2.0
        : 1.0;
  const confidenceNormalized = (claim.confidence ?? 50) / 100;

  // Base weight
  let weight = centralityMultiplier * confidenceNormalized;

  // v2.6.33: Reduce weight for CONTESTED claims (those with actual counter-evidence)
  // "Doubted" claims (opinion-based, no counter-evidence) keep normal weight.
  // Only claims with FACTUAL counter-evidence get reduced weight.
  if (claim.isContested) {
    const basis = claim.factualBasis || "unknown";
    if (basis === "established") {
      // Strong factual counter-evidence exists - significantly reduce weight
      weight *= 0.3;
    } else if (basis === "disputed") {
      // Some factual counter-evidence exists - moderately reduce weight
      weight *= 0.5;
    }
    // "opinion", "alleged", "unknown" = just "doubted", no real evidence → keep full weight
  }

  return weight;
}

/**
 * Calculate weighted average of claim verdicts.
 * Central claims with high confidence have more influence than peripheral low-confidence claims.
 *
 * - Tangential claims (thesisRelevance="tangential") are excluded from the calculation.
 * - Counter-claims (isCounterClaim=true) have their verdicts INVERTED before aggregation.
 *   If a counter-claim is TRUE (85%), it means the OPPOSITE of the user's thesis is true,
 *   so it contributes as FALSE (15%) to the overall verdict.
 * - Contested claims WITH factual counter-evidence get reduced weight (v2.6.33)
 *
 * Formula: Σ(effectiveTruthPercentage × weight) / Σ(weight)
 */
export function calculateWeightedVerdictAverage(
  claims: Array<{
    truthPercentage: number;
    centrality?: "high" | "medium" | "low";
    confidence?: number;
    thesisRelevance?: "direct" | "tangential" | "irrelevant";
    isCounterClaim?: boolean;
    isContested?: boolean;
    factualBasis?: "established" | "disputed" | "alleged" | "opinion" | "unknown";
  }>,
): number {
  // Only direct claims contribute to the verdict
  const directClaims = claims.filter((c) => !c.thesisRelevance || c.thesisRelevance === "direct");
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

