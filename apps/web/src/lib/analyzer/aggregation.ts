/**
 * Verdict aggregation utilities (weighted averages, etc.)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * v2.10: LLM-derived classification (contestation/harm) is used directly.
 *
 * @module analyzer/aggregation
 */


/**
 * Calculate claim weight based on centrality, confidence, harm potential, and contestation status.
 * Higher centrality claims with higher confidence have more influence on the overall verdict.
 *
 * Base Weight = centralityMultiplier × harmMultiplier × (confidence / 100)
 * where:
 *   centralityMultiplier: high=3.0, medium=2.0, low=1.0
 *   harmMultiplier: high=1.5, medium=1.0, low=1.0
 *
 * HIGH HARM POTENTIAL (v2.7.0):
 * - Death claims, injury claims, safety claims get 1.5x additional weight
 * - These are severe accusations that must be carefully verified
 * - Getting them wrong (either direction) causes significant real-world harm
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
 * - factualBasis "opinion"/"unknown" (no counter-evidence): full weight
 */
export function getClaimWeight(claim: {
  centrality?: "high" | "medium" | "low";
  confidence?: number;
  thesisRelevance?: "direct" | "tangential" | "irrelevant";
  harmPotential?: "high" | "medium" | "low";
  isContested?: boolean;
  factualBasis?: "established" | "disputed" | "opinion" | "unknown";
}): number {
  // Only direct claims contribute to the verdict
  if (claim.thesisRelevance && claim.thesisRelevance !== "direct") return 0;

  const centralityMultiplier =
    claim.centrality === "high"
      ? 3.0
      : claim.centrality === "medium"
        ? 2.0
        : 1.0;

  // v2.7.0: High harm potential claims (death, injury, safety) get extra weight
  // These are severe accusations that MUST be verified carefully
  const harmMultiplier = claim.harmPotential === "high" ? 1.5 : 1.0;

  const confidenceNormalized = (claim.confidence ?? 50) / 100;

  // Base weight with harm multiplier
  let weight = centralityMultiplier * harmMultiplier * confidenceNormalized;

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
    // "opinion", "unknown" = just "doubted", no real evidence → keep full weight
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
    harmPotential?: "high" | "medium" | "low";
    isCounterClaim?: boolean;
    isContested?: boolean;
    factualBasis?: "established" | "disputed" | "opinion" | "unknown";
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

// ============================================================================
// TANGENTIAL BASELESS CLAIM PRUNING (v2.8.6)
// ============================================================================

/**
 * Minimum fields required for claim pruning.
 */
interface PrunableClaimVerdict {
  thesisRelevance?: "direct" | "tangential" | "irrelevant";
  supportingEvidenceIds?: string[];
  supportingFactIds?: string[]; // Legacy field name (temporary)
  factualBasis?: "established" | "disputed" | "opinion" | "unknown";
  claimId?: string;
  claimText?: string;
}

/**
 * Minimum fields required for KeyFactor pruning.
 */
interface PrunableKeyFactor {
  supports?: "yes" | "no" | "neutral" | string;
  factualBasis?: "established" | "disputed" | "opinion" | "unknown" | string;
  factor?: string;
  explanation?: string;
}

/**
 * Minimum evidence threshold for tangential claims.
 * Claims with fewer supporting evidence items than this are considered "low evidence".
 */
const MIN_EVIDENCE_FOR_TANGENTIAL = 2;

interface PrunableFact {
  id: string;
  probativeValue?: "high" | "medium" | "low";
}

/**
 * Check if a claim has sufficient high-quality evidence.
 * Used to determine if tangential claims should be kept in the report.
 */
function hasSufficientQualityEvidence(
  claim: {
    supportingEvidenceIds?: string[];
    supportingFactIds?: string[];
    thesisRelevance?: "direct" | "tangential" | "irrelevant";
    claimText?: string;
    claimId?: string;
  },
  facts: PrunableFact[],
  minEvidenceForTangential: number,
): boolean {
  const supportingEvidenceIds =
    claim.supportingEvidenceIds && claim.supportingEvidenceIds.length > 0
      ? claim.supportingEvidenceIds
      : claim.supportingFactIds ?? [];
  const evidenceCount = supportingEvidenceIds.length;

  if (!claim.thesisRelevance || claim.thesisRelevance === "direct") {
    return true;
  }

  if (evidenceCount < minEvidenceForTangential) {
    return false;
  }

  const supportingFacts = facts.filter((f) => supportingEvidenceIds.includes(f.id));

  const hasQualityFact = supportingFacts.some(
    (f) => f.probativeValue === "high" || f.probativeValue === "medium",
  );

  if (!hasQualityFact) {
    console.log(
      `[Prune] Tangential claim has ${evidenceCount} evidence items but none are high-quality: ` +
      `"${(claim.claimText || claim.claimId || "unknown").substring(0, 60)}..."`,
    );
  }

  return hasQualityFact;
}

/**
 * Prune tangential claims that have no or very low supporting evidence.
 *
 * v2.8.6: Baseless tangential claims should be dropped entirely from the report,
 * not just weighted to 0%. This prevents cluttering the output with unsubstantiated
 * tangential observations (e.g., foreign government opinions on domestic proceedings).
 *
 * A claim is pruned if:
 * - thesisRelevance is "tangential" or "irrelevant" AND
 * - supportingFactIds is empty or below minimum threshold
 *
 * Direct claims are NEVER pruned (they are the core of the analysis).
 *
 * @param claims - Array of claim verdicts to filter
 * @returns Filtered array with baseless tangential claims removed
 */
export function pruneTangentialBaselessClaims<T extends PrunableClaimVerdict>(
  claims: T[],
  options: {
    facts?: PrunableFact[];
    minEvidenceForTangential?: number;
    requireQualityEvidence?: boolean;
  } = {},
): T[] {
  const minEvidence = Math.max(
    0,
    options.minEvidenceForTangential ?? MIN_EVIDENCE_FOR_TANGENTIAL,
  );
  const requireQuality = options.requireQualityEvidence ?? false;
  const facts = options.facts ?? [];

  return claims.filter(claim => {
    // Direct claims are never pruned
    if (!claim.thesisRelevance || claim.thesisRelevance === "direct") {
      return true;
    }

    // Tangential/irrelevant claims need sufficient evidence to be kept
    const supportingEvidenceIds =
      claim.supportingEvidenceIds && claim.supportingEvidenceIds.length > 0
        ? claim.supportingEvidenceIds
        : claim.supportingFactIds ?? [];
    const evidenceCount = supportingEvidenceIds.length;
    if (evidenceCount < minEvidence) {
      console.log(`[Prune] Dropping tangential claim with insufficient evidence: "${(claim.claimText || claim.claimId || "unknown").substring(0, 60)}..." (${evidenceCount} evidence items, min=${minEvidence})`);
      return false;
    }

    if (requireQuality && facts.length > 0) {
      return hasSufficientQualityEvidence(claim, facts, minEvidence);
    }

    if (requireQuality && facts.length === 0) {
      console.warn(
        `[Prune] Quality check enabled but no evidence items provided for claim: "${(claim.claimText || claim.claimId || "unknown").substring(0, 60)}..."`,
      );
      return true;
    }

    return true;
  });
}

/**
 * Prune KeyFactors that are opinion-based (no documented evidence).
 *
 * v2.8.6: Opinion-only factors (positive OR negative) should be dropped entirely.
 * Only factors with documented evidence contribute meaningful signal.
 *
 * A KeyFactor is pruned if:
 * - factualBasis is "opinion" or "unknown" (no documented evidence)
 *
 * Factors with documented evidence ("established" or "disputed") are kept.
 *
 * @param keyFactors - Array of KeyFactors to filter
 * @returns Filtered array with opinion-only factors removed
 */
export function pruneOpinionOnlyFactors<T extends PrunableKeyFactor>(keyFactors: T[]): T[] {
  return keyFactors.filter(kf => {
    // Keep factors with documented evidence
    if (kf.factualBasis === "established" || kf.factualBasis === "disputed") {
      return true;
    }

    // Drop opinion-only factors (no documented evidence)
    console.log(`[Prune] Dropping opinion-only factor: "${(kf.factor || kf.explanation || "unknown").substring(0, 60)}..." (supports: ${kf.supports || "unknown"}, factualBasis: ${kf.factualBasis || "unknown"})`);
    return false;
  });
}

/**
 * Monitor and optionally limit opinion-based factors in report.
 */
export function monitorOpinionAccumulation<T extends PrunableKeyFactor>(
  keyFactors: T[],
  options: {
    maxOpinionCount?: number;
    warningThresholdPercent?: number;
  } = {},
): T[] {
  const maxOpinionCount = options.maxOpinionCount ?? 0;
  const warningThresholdPercent = options.warningThresholdPercent ?? 70;

  const opinionFactors = keyFactors.filter(
    (kf) => kf.factualBasis === "opinion" || kf.factualBasis === "unknown",
  );
  const documentedFactors = keyFactors.filter(
    (kf) => kf.factualBasis === "established" || kf.factualBasis === "disputed",
  );

  const opinionCount = opinionFactors.length;
  const documentedCount = documentedFactors.length;
  const opinionRatio = keyFactors.length > 0
    ? Math.round((opinionCount / keyFactors.length) * 100)
    : 0;

  console.log(
    `[Opinion Monitor] KeyFactors: ${opinionCount} opinion, ${documentedCount} documented (${opinionRatio}% opinion-based)`,
  );

  if (warningThresholdPercent > 0 && opinionRatio > warningThresholdPercent && documentedCount > 0) {
    console.warn(
      `[Opinion Monitor] High opinion ratio: ${opinionRatio}% opinion-based (${opinionCount} opinion vs ${documentedCount} documented)`,
    );
  }

  if (documentedCount === 0 && opinionCount > 0) {
    console.warn(
      `[Opinion Monitor] All ${opinionCount} keyFactors are opinion-based. No documented evidence found.`,
    );
  }

  if (maxOpinionCount > 0 && opinionCount > maxOpinionCount) {
    console.warn(
      `[Opinion Monitor] Limiting opinion factors from ${opinionCount} to ${maxOpinionCount} (keeping all ${documentedCount} documented factors)`,
    );

    const sortedOpinions = [...opinionFactors].sort((a, b) => {
      if (a.supports === "yes" && b.supports !== "yes") return -1;
      if (b.supports === "yes" && a.supports !== "yes") return 1;
      return 0;
    });

    const limitedOpinions = sortedOpinions.slice(0, maxOpinionCount);
    return [...documentedFactors, ...limitedOpinions] as T[];
  }

  return keyFactors;
}
