/**
 * Verdict aggregation utilities (weighted averages, etc.)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * @module analyzer/aggregation
 */

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
  factualBasis?: "established" | "disputed" | "alleged" | "opinion" | "unknown" | string;
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
    
    // Political/government/diplomatic sources
    const politicalSource = /(government|diplomatic|political|administration|official|state|foreign ministry|embassy|department of|secretary of|ministry of|envoy|ambassador)/i;
    const hasPoliticalSource = politicalSource.test(kf.contestedBy || "");
    
    // Check if contestation cites SPECIFIC documented evidence
    // Must include specific references: statute numbers, procedure names, documented violations, measurements, etc.
    const specificEvidence = /\b(data|measurement|study|record|document|report|investigation|standard|precedent|statute|regulation|evidence|violation|breach|procedure\s+\d+|article\s+\d+|section\s+\d+|protocol\s+\d+|rule\s+\d+|finding|determination|ruling|documentation)\b/i;
    const hasSpecificEvidence = specificEvidence.test(
      (kf.contestationReason || "") + " " + (kf.explanation || "")
    );
    
    // Downgrade political criticism without specific evidence to "opinion"
    // This keeps FULL weight (baseless doubt doesn't reduce verdict)
    if (hasPoliticalSource && 
        (kf.factualBasis === "established" || kf.factualBasis === "disputed") && 
        !hasSpecificEvidence) {
      return {
        ...kf,
        factualBasis: "opinion" as const,
        contestationReason: `Political criticism without documented counter-evidence: ${kf.contestationReason || kf.explanation || "general disagreement"}`
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
  const lowered = (text || "").toLowerCase();
  
  // Death/injury claims are ALWAYS high harm potential
  if (/\b(die[ds]?|death[s]?|dead|kill[eds]*|fatal|fatalit)/i.test(lowered)) return "high";
  if (/\b(injur[yies]*|harm[eds]*|damage[ds]*|victim[s]?)/i.test(lowered)) return "high";
  
  // Safety/health risk claims
  if (/\b(danger|unsafe|risk|threat|hazard)/i.test(lowered)) return "high";
  
  // Fraud/crime accusations
  if (/\b(fraud|crime|corrupt|illegal|stolen|theft)/i.test(lowered)) return "high";
  
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
 * 
 * @param claimText - The claim text being evaluated
 * @param reasoning - The LLM reasoning for the verdict (if available)
 * @returns Contestation detection result
 */
export function detectClaimContestation(claimText: string, reasoning?: string): ClaimContestationResult {
  const combined = `${claimText || ""} ${reasoning || ""}`.toLowerCase();
  
  // Check if there's any contestation signal
  const contestationSignals = /\b(disputed|contested|challenged|criticized|questioned|denied|rejected|opposed|controversy|contentious|debat)/i;
  const hasContestationSignal = contestationSignals.test(combined);
  
  if (!hasContestationSignal) {
    return { isContested: false, factualBasis: "unknown" };
  }
  
  // Detect political/diplomatic contestation (typically opinion-based)
  const politicalContestors = /(government|administration|official|diplomat|ambassador|ministry|state department|white house|kremlin|foreign (office|ministry)|political)/i;
  const hasPoliticalContestor = politicalContestors.test(combined);
  
  // Detect if there's specific documented evidence cited in the contestation
  const documentedEvidence = /\b(audit|study|report|investigation|finding|data|measurement|record|document|statistic|evidence shows|according to records|documented|violation of|breach of|article \d+|section \d+|regulation \d+)/i;
  const hasDocumentedEvidence = documentedEvidence.test(combined);
  
  // Determine factual basis
  let factualBasis: "established" | "disputed" | "opinion" | "unknown";
  let contestedBy: string | undefined;
  
  if (hasDocumentedEvidence) {
    // There's specific documented counter-evidence
    factualBasis = "established";
    contestedBy = "documented counter-evidence";
  } else if (hasPoliticalContestor) {
    // Political criticism without documented evidence = opinion (full weight)
    factualBasis = "opinion";
    contestedBy = "political/diplomatic sources";
  } else {
    // General contestation without clear evidence
    factualBasis = "disputed";
    contestedBy = "critics";
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
 * - factualBasis "opinion"/"alleged"/"unknown" (no counter-evidence): full weight
 */
export function getClaimWeight(claim: {
  centrality?: "high" | "medium" | "low";
  confidence?: number;
  thesisRelevance?: "direct" | "tangential" | "irrelevant";
  harmPotential?: "high" | "medium" | "low";
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
    harmPotential?: "high" | "medium" | "low";
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

