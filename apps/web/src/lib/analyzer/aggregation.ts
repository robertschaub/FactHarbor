/**
 * Verdict aggregation utilities (weighted averages, etc.)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * v2.9: Patterns are now configurable via UCM lexicon config.
 *
 * @module analyzer/aggregation
 */

import type { AggregationLexicon } from "../config-schemas";
import { getAggregationPatterns, matchesAnyPattern } from "./lexicon-utils";

// ============================================================================
// PATTERN CONFIGURATION
// ============================================================================
// DEPRECATED: Hardcoded patterns moved to UCM lexicon (aggregation-lexicon.v1)
// See: DEFAULT_AGGREGATION_LEXICON.contestation.*, harmPotential.*, etc.

/**
 * Module-level compiled patterns (cached, initialized with defaults)
 * Can be updated via setAggregationLexicon() for testing or config reload
 */
let _patterns = getAggregationPatterns();

/**
 * Set the lexicon for aggregation functions (useful for testing or config reload)
 */
export function setAggregationLexicon(lexicon?: AggregationLexicon): void {
  _patterns = getAggregationPatterns(lexicon);
}

/**
 * Get current patterns (for testing)
 */
export function getAggregationPatternsConfig() {
  return _patterns;
}

// ============================================================================
// CONTESTATION VALIDATION (v2.8)
// ============================================================================

/**
 * Minimum required fields for contestation validation.
 * Uses interface to allow compatibility with various KeyFactor implementations.
 */
interface ContestableKeyFactor {
  factor?: string;
  supports?: "yes" | "no" | "neutral" | string;
  explanation?: string;
  isContested?: boolean;
  contestedBy?: string;
  contestationReason?: string;
  factualBasis?: "established" | "disputed" | "opinion" | "unknown" | string;
}

/**
 * Validate and correct contestation classification for KeyFactors.
 * Downgrade political/government criticism without specific evidence from "established"/"disputed" to "opinion".
 * 
 * v2.8: Implements "doubted" vs "contested" distinction:
 * - DOUBTED (opinion): No documented counter-evidence → keeps FULL weight (1.0x)
 * - CONTESTED (disputed/established): Has documented counter-evidence → REDUCED weight (0.5x/0.3x)
 * 
 * This ensures baseless political criticism doesn't reduce verdict weight,
 * while documented counter-evidence appropriately reduces certainty.
 * 
 * @param keyFactors - Array of KeyFactors to validate
 * @returns Array of validated KeyFactors with corrected factualBasis where appropriate
 */
export function validateContestation<T extends ContestableKeyFactor>(keyFactors: T[]): T[] {
  return keyFactors.map(kf => {
    // Skip if already opinion or not contesting
    if (kf.factualBasis === "opinion" || kf.supports !== "no") return kf;
    
    // Skip if not claiming to have evidence-based contestation
    if (kf.factualBasis !== "established" && kf.factualBasis !== "disputed") return kf;
    
    // Check if contestation actually cites SPECIFIC documented evidence
    // The SOURCE doesn't matter - what matters is whether there's DOCUMENTED counter-evidence
    // Must include specific references: measurements, audits, reports, legal citations, etc.
    // v2.8.5: Added scientific/methodological terms for causal claim contestation
    // v2.9: Patterns now configurable via UCM lexicon (aggregation-lexicon.v1)

    const textToCheck = [
      kf.contestationReason || "",
      kf.explanation || "",
      kf.factor || ""
    ].join(" ");

    const hasDocumentedEvidence = matchesAnyPattern(textToCheck, _patterns.documentedEvidenceKeywords);
    
    // If claimed as "established"/"disputed" but no documented evidence found → downgrade to "opinion"
    // This ensures only REAL counter-evidence reduces verdict weight
    if (!hasDocumentedEvidence) {
      return {
        ...kf,
        factualBasis: "opinion" as const,
        contestationReason: `No documented counter-evidence cited: ${kf.contestationReason || kf.explanation || "general disagreement"}`
      } as T;
    }
    
    return kf;
  });
}

// ============================================================================
// HARM POTENTIAL DETECTION (v2.8)
// ============================================================================

/**
 * Detect high harm potential from claim text using heuristic patterns.
 * This is a safety net for when LLM fails to detect severe claims.
 *
 * v2.8: Shared implementation for consistent harm potential detection across pipelines.
 * v2.9: Patterns now configurable via UCM lexicon (aggregation-lexicon.v1)
 *
 * High harm claims include:
 * - Death/mortality claims
 * - Injury/harm claims
 * - Safety/health risk claims
 * - Fraud/crime accusations
 *
 * @param text - Claim text to analyze
 * @returns "high" | "medium" | "low"
 */
export function detectHarmPotential(text: string): "high" | "medium" | "low" {
  const textToCheck = text || "";

  // Death/injury claims are ALWAYS high harm potential (UCM: harmPotential.deathKeywords)
  if (matchesAnyPattern(textToCheck, _patterns.harmDeathKeywords)) return "high";
  if (matchesAnyPattern(textToCheck, _patterns.harmInjuryKeywords)) return "high";

  // Safety/health risk claims (UCM: harmPotential.safetyKeywords)
  if (matchesAnyPattern(textToCheck, _patterns.harmSafetyKeywords)) return "high";

  // Fraud/crime accusations (UCM: harmPotential.crimeKeywords)
  if (matchesAnyPattern(textToCheck, _patterns.harmCrimeKeywords)) return "high";

  return "medium";
}

// ============================================================================
// CLAIM-LEVEL CONTESTATION DETECTION (v2.8)
// ============================================================================

/**
 * Result of claim-level contestation detection.
 */
export interface ClaimContestationResult {
  isContested: boolean;
  factualBasis: "established" | "disputed" | "opinion" | "unknown";
  contestedBy?: string;
}

/**
 * Detect contestation at the claim level using heuristic patterns.
 * This is a simpler approach for pipelines that don't extract KeyFactors.
 *
 * v2.8: Implements "doubted" vs "contested" distinction at claim level:
 * - DOUBTED (opinion): Political criticism without documented evidence → FULL weight
 * - CONTESTED (disputed/established): Has documented counter-evidence → REDUCED weight
 * v2.9: Patterns now configurable via UCM lexicon (aggregation-lexicon.v1)
 *
 * @param claimText - The claim text being evaluated
 * @param reasoning - The LLM reasoning for the verdict (if available)
 * @returns Contestation detection result
 */
export function detectClaimContestation(claimText: string, reasoning?: string): ClaimContestationResult {
  const combined = `${claimText || ""} ${reasoning || ""}`;

  // Check if there's any contestation signal (using negativeClaimPatterns which include contestation signals)
  // Note: We use a simple inline check here since contestation signals overlap with negative claim patterns
  const contestationSignals = /\b(disputed|contested|challenged|criticized|questioned|denied|rejected|opposed|controversy|contentious|debat)/i;
  const hasContestationSignal = contestationSignals.test(combined);

  if (!hasContestationSignal) {
    return { isContested: false, factualBasis: "unknown" };
  }

  // v2.8.5: Detect if this is a causal claim that requires stronger evidence
  // Causal claims ("due to", "caused by", etc.) need proper causal evidence, not just temporal correlation
  // v2.9: Uses UCM lexicon (aggregation-lexicon.v1 contestation.causalClaimPatterns)
  const isCausalClaim = matchesAnyPattern(claimText || "", _patterns.causalClaimPatterns);

  // Evidence-based approach: the SOURCE doesn't matter, only whether there's DOCUMENTED counter-evidence
  // If no documented evidence → "opinion" (keeps full weight)
  // If documented evidence → "established" or "disputed" (reduces weight)
  // v2.9: Uses UCM lexicon (aggregation-lexicon.v1 contestation.documentedEvidenceKeywords)
  const hasDocumentedEvidence = matchesAnyPattern(combined, _patterns.documentedEvidenceKeywords);

  // v2.8.5: Methodology criticism for causal claims = "established" counter-evidence
  // When experts criticize the methodology used to establish causation, this is strong counter-evidence
  // v2.9: Uses UCM lexicon (aggregation-lexicon.v1 contestation.methodologyCriticismPatterns)
  const hasMethodologyCriticism = matchesAnyPattern(combined, _patterns.methodologyCriticismPatterns);
  
  // Determine factual basis purely on evidence, not source
  let factualBasis: "established" | "disputed" | "opinion" | "unknown";
  let contestedBy: string | undefined;
  
  if (hasDocumentedEvidence) {
    // There's specific documented counter-evidence
    factualBasis = "established";
    contestedBy = "documented counter-evidence";
  } else if (isCausalClaim && hasMethodologyCriticism) {
    // v2.8.5: For causal claims, methodology criticism is strong counter-evidence
    // because it directly challenges whether causation can be established
    factualBasis = "established";
    contestedBy = "methodology criticism (causal claim)";
  } else {
    // No documented evidence cited → opinion (keeps full weight)
    factualBasis = "opinion";
    contestedBy = "critics (no documented evidence)";
  }
  
  return {
    isContested: true,
    factualBasis,
    contestedBy
  };
}

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
  supportingFactIds?: string[];
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
    supportingFactIds?: string[];
    thesisRelevance?: "direct" | "tangential" | "irrelevant";
    claimText?: string;
    claimId?: string;
  },
  facts: PrunableFact[],
  minEvidenceForTangential: number,
): boolean {
  const evidenceCount = claim.supportingFactIds?.length ?? 0;

  if (!claim.thesisRelevance || claim.thesisRelevance === "direct") {
    return true;
  }

  if (evidenceCount < minEvidenceForTangential) {
    return false;
  }

  const supportingFacts = facts.filter((f) =>
    claim.supportingFactIds?.includes(f.id),
  );

  const hasQualityFact = supportingFacts.some(
    (f) => f.probativeValue === "high" || f.probativeValue === "medium",
  );

  if (!hasQualityFact) {
    console.log(
      `[Prune] Tangential claim has ${evidenceCount} facts but none are high-quality: ` +
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
    const evidenceCount = claim.supportingFactIds?.length ?? 0;
    if (evidenceCount < minEvidence) {
      console.log(`[Prune] Dropping tangential claim with insufficient evidence: "${(claim.claimText || claim.claimId || "unknown").substring(0, 60)}..." (${evidenceCount} evidence items, min=${minEvidence})`);
      return false;
    }

    if (requireQuality && facts.length > 0) {
      return hasSufficientQualityEvidence(claim, facts, minEvidence);
    }

    if (requireQuality && facts.length === 0) {
      console.warn(
        `[Prune] Quality check enabled but no facts provided for claim: "${(claim.claimText || claim.claimId || "unknown").substring(0, 60)}..."`,
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
