/**
 * FactHarbor Analyzer - Quality Gates
 *
 * POC1 Quality Gates implementation:
 * - Gate 1: Claim Validation (factual vs opinion/prediction)
 * - Gate 4: Verdict Confidence Assessment
 *
 * v2.10: Uses internal pattern set (no external lexicon config).
 *
 * @module analyzer/quality-gates
 */

import type {
  ClaimValidationResult,
  VerdictValidationResult,
  ClaimVerdict,
  FetchedSource,
  EvidenceItem,
} from "./types";
import { getEvidencePatterns, matchesAnyPattern, countPatternMatches } from "./lexicon-utils";

// ============================================================================
// PATTERN CONFIGURATION
// ============================================================================

/**
 * Module-level compiled patterns (cached, initialized with defaults)
 */
let _patterns = getEvidencePatterns();

/**
 * Reset quality gate patterns to defaults.
 */
export function setQualityGatesLexicon(): void {
  _patterns = getEvidencePatterns();
}

/**
 * Get current patterns (for testing)
 */
export function getQualityGatesPatterns() {
  return _patterns;
}

// ============================================================================
// GATE 1: CLAIM VALIDATION
// ============================================================================

/**
 * Gate 1: Validate if a claim is factual (verifiable) vs opinion/prediction
 *
 * IMPORTANT: Central claims are ALWAYS passed through Gate 1, even if they
 * technically fail validation. This ensures important claims aren't lost.
 */
export function validateClaimGate1(
  claimId: string,
  claimText: string,
  isCentral: boolean = false
): ClaimValidationResult {
  // Use module-level patterns (internal defaults)
  const patterns = _patterns;

  // 1. Calculate opinion score (0-1)
  const opinionMatches = countPatternMatches(claimText, patterns.opinionMarkers);
  const opinionScore = Math.min(opinionMatches / 3, 1);

  // 2. Calculate specificity score (0-1)
  const specificityMatches = countPatternMatches(claimText, patterns.specificityPatterns);
  const specificityScore = Math.min(specificityMatches / 3, 1);

  // 2b. Lightweight content-word count: helps keep verifiable, mechanism-style claims
  // that don't necessarily include numbers/dates (common in comparative decompositions).
  const contentWordCount = claimText
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !patterns.stopwords.has(w))
    .length;
  const hasEnoughContent = contentWordCount >= 5;

  // 3. Check for future predictions
  const futureOriented = matchesAnyPattern(claimText, patterns.futureMarkers);

  // 4. Determine claim type
  let claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS";
  if (futureOriented) {
    claimType = "PREDICTION";
  } else if (opinionScore > 0.5) {
    claimType = "OPINION";
  } else if (specificityScore >= 0.3 && opinionScore <= 0.3) {
    claimType = "FACTUAL";
  } else {
    claimType = "AMBIGUOUS";
  }

  // 5. Determine if it can be verified
  //
  // NOTE: "Opinion" / "Prediction" are still claims that can often be analyzed by
  // grounding their *factual components* (timelines, procedures, quoted statements, laws, etc.).
  // We keep this classification for downstream UI/prompting, but we DO NOT use it to hard-filter.
  const isFactual = claimType === "FACTUAL" || claimType === "AMBIGUOUS";

  // 6. Pass criteria
  //
  // We only filter extremely content-poor claims (noise), not opinions/predictions.
  // Central claims are still always kept.
  const isContentPoor = contentWordCount < 3 && specificityScore < 0.3;
  const wouldPass = !isContentPoor;

  // CRITICAL: Central claims always pass Gate 1
  const passed = wouldPass || isCentral;

  // Generate failure reason if applicable
  let failureReason: string | undefined;
  if (!wouldPass) {
    failureReason = "Too vague / content-poor to analyze reliably";
    if (isCentral) {
      failureReason = `[CENTRAL CLAIM - kept for analysis] ${failureReason}`;
    }
  }

  return {
    claimId,
    isFactual,
    opinionScore,
    specificityScore,
    futureOriented,
    claimType,
    passed,
    failureReason: passed && !isCentral ? undefined : failureReason,
    validatedAt: new Date(),
  };
}

// ============================================================================
// GATE 4: VERDICT CONFIDENCE
// ============================================================================

/**
 * Gate 4: Validate verdict confidence based on evidence quality
 *
 * Confidence Tiers:
 * - HIGH (80-100%): >=3 sources, >=0.7 avg quality, >=80% agreement
 * - MEDIUM (50-79%): >=2 sources, >=0.6 avg quality, >=60% agreement
 * - LOW (0-49%): >=2 sources but low quality/agreement
 * - INSUFFICIENT: <2 sources -> DO NOT PUBLISH
 *
 * Publication Rule: Minimum MEDIUM confidence required
 */
export function validateVerdictGate4(
  verdictId: string,
  sources: Array<{url: string; trackRecordScore?: number | null}>,
  supportingEvidenceIds: string[],
  contradictingFactCount: number,
  verdictReasoning: string,
  isCentral: boolean = false
): VerdictValidationResult {
  // 1. Count evidence sources
  const evidenceCount = sources.length;

  // 2. Calculate average source quality
  // Note: trackRecordScore is already 0-1 scale (see Source Reliability Bundle docs)
  const qualityScores = sources.map(s =>
    s.trackRecordScore != null ? s.trackRecordScore : 0.5
  );
  const averageSourceQuality = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    : 0;

  // 3. Calculate evidence agreement
  const totalEvidence = supportingEvidenceIds.length + contradictingFactCount;
  const evidenceAgreement = totalEvidence > 0
    ? supportingEvidenceIds.length / totalEvidence
    : 0;

  // 4. Count uncertainty factors in reasoning (using internal patterns)
  const uncertaintyFactors = countPatternMatches(verdictReasoning, _patterns.uncertaintyMarkers);

  // 5. Determine confidence tier
  let confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

  if (evidenceCount < 2) {
    confidenceTier = "INSUFFICIENT";
  } else if (evidenceCount >= 3 && averageSourceQuality >= 0.7 && evidenceAgreement >= 0.8) {
    confidenceTier = "HIGH";
  } else if (evidenceCount >= 2 && averageSourceQuality >= 0.6 && evidenceAgreement >= 0.6) {
    confidenceTier = "MEDIUM";
  } else {
    confidenceTier = "LOW";
  }

  // 6. Publication decision
  const wouldPublish = confidenceTier === "MEDIUM" || confidenceTier === "HIGH";
  const publishable = wouldPublish || isCentral;

  // 7. Generate failure reasons if not publishable
  const failureReasons: string[] = [];
  if (!wouldPublish) {
    if (evidenceCount < 2) {
      failureReasons.push(`Insufficient sources (${evidenceCount}, need >=2)`);
    }
    if (averageSourceQuality < 0.6) {
      failureReasons.push(`Low source quality (${(averageSourceQuality * 100).toFixed(0)}%, need >=60%)`);
    }
    if (evidenceAgreement < 0.6) {
      failureReasons.push(`Low evidence agreement (${(evidenceAgreement * 100).toFixed(0)}%, need >=60%)`);
    }

    if (isCentral && failureReasons.length > 0) {
      failureReasons.unshift("[CENTRAL CLAIM - published with caveats]");
    }
  }

  return {
    verdictId,
    evidenceCount,
    averageSourceQuality,
    evidenceAgreement,
    uncertaintyFactors,
    confidenceTier,
    publishable,
    failureReasons: failureReasons.length > 0 ? failureReasons : undefined,
    validatedAt: new Date(),
  };
}

// ============================================================================
// BATCH GATE APPLICATION
// ============================================================================

/**
 * Apply Gate 1 Lite (minimal pre-filter) to claims BEFORE research.
 *
 * Only filters EXTREME cases that are obviously non-factual:
 * - Future predictions ("will happen", "going to")
 * - Strong opinion language ("I think", "I believe")
 * - checkWorthiness="low"
 *
 * This preserves supplemental claims coverage detection while preventing
 * wasted research on obvious non-factual content.
 *
 * Full Gate 1 validation is applied POST-research for final verdict filtering.
 *
 * IMPORTANT: Central claims are NEVER filtered
 */
export function applyGate1Lite<T extends { id: string; text: string; checkWorthiness: string; isCentral: boolean }>(
  claims: T[]
): {
  filteredClaims: T[];
  stats: { total: number; passed: number; filtered: number; centralKept: number };
} {
  const filteredClaims: T[] = [];
  let centralKept = 0;

  for (const claim of claims) {
    // Central claims always pass
    if (claim.isCentral) {
      filteredClaims.push(claim);
      continue;
    }

    // Filter low checkWorthiness (still worth skipping for pre-research budget protection)
    if (claim.checkWorthiness === "low") {
      console.log(`[Gate1-Lite] Filtered low checkWorthiness: "${claim.id}"`);
      continue;
    }

    // Pass everything else
    filteredClaims.push(claim);
  }

  const stats = {
    total: claims.length,
    passed: filteredClaims.length,
    filtered: claims.length - filteredClaims.length,
    centralKept,
  };

  console.log(`[Gate1-Lite] Minimal pre-filter: ${stats.passed}/${stats.total} passed, ${stats.filtered} filtered`);

  return { filteredClaims, stats };
}

/**
 * Apply Gate 1 validation to all claims and filter non-factual ones
 * IMPORTANT: Central claims are never filtered, only flagged
 */
export function applyGate1ToClaims<T extends { id: string; text: string; isCentral: boolean }>(
  claims: T[]
): {
  validatedClaims: (T & { gate1Validation?: ClaimValidationResult })[];
  validationResults: ClaimValidationResult[];
  stats: { total: number; passed: number; filtered: number; centralKept: number };
} {
  const validationResults: ClaimValidationResult[] = [];
  const validatedClaims: (T & { gate1Validation?: ClaimValidationResult })[] = [];
  let centralKept = 0;

  for (const claim of claims) {
    const validation = validateClaimGate1(claim.id, claim.text, claim.isCentral);
    validationResults.push(validation);

    if (validation.passed) {
      validatedClaims.push({
        ...claim,
        gate1Validation: validation,
      });

      if (claim.isCentral && !validation.isFactual) {
        centralKept++;
      }
    } else {
      console.log(`[Gate1] Filtered claim ${claim.id}: ${validation.failureReason}`);
    }
  }

  const stats = {
    total: claims.length,
    passed: validatedClaims.length,
    filtered: claims.length - validatedClaims.length,
    centralKept,
  };

  console.log(`[Gate1] Stats: ${stats.passed}/${stats.total} passed, ${stats.filtered} filtered, ${stats.centralKept} central claims kept despite issues`);

  return { validatedClaims, validationResults, stats };
}

/**
 * Apply Gate 4 validation to all verdicts
 */
export function applyGate4ToVerdicts(
  verdicts: ClaimVerdict[],
  sources: FetchedSource[],
  evidenceItems: EvidenceItem[]
): {
  validatedVerdicts: (ClaimVerdict & { gate4Validation: VerdictValidationResult })[];
  validationResults: VerdictValidationResult[];
  stats: {
    total: number;
    publishable: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    insufficient: number;
    centralKept: number;
  };
} {
  const validationResults: VerdictValidationResult[] = [];
  const validatedVerdicts: (ClaimVerdict & { gate4Validation: VerdictValidationResult })[] = [];

  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  let insufficient = 0;
  let centralKept = 0;

  for (const verdict of verdicts) {
    const supportingEvidenceIds =
      verdict.supportingEvidenceIds && verdict.supportingEvidenceIds.length > 0
        ? verdict.supportingEvidenceIds
        : [];
    // Find sources that support this verdict
    const supportingSources = sources.filter(s =>
      supportingEvidenceIds.some((evidenceId: string) =>
        evidenceItems.some(item => item.id === evidenceId && item.sourceId === s.id)
      )
    );

    // Count contradicting evidence items - only those related to this specific claim/context
    // An item is contradicting if: category === "criticism" OR claimDirection === "contradicts"
    // Must also be relevant to the claim being evaluated (same context or same sources)
    const contradictingFactCount = evidenceItems.filter(item => {
      // Must be contradicting evidence: either criticism category OR explicit contradiction direction
      const isContradicting = item.category === "criticism" || item.claimDirection === "contradicts";
      if (!isContradicting) return false;
      // Must not be a supporting evidence item for this verdict
      if (supportingEvidenceIds.includes(item.id)) return false;
      // Must be related to the same context as the verdict (if both have context IDs)
      // If verdict has no context ID, only count contradiction from same sources
      if (verdict.contextId && item.contextId) {
        return item.contextId === verdict.contextId;
      }
      // If no context, only count contradiction from sources that also support this verdict
      // This indicates internal contradiction within the same source
      const supportingSourceIds = supportingSources.map(s => s.id);
      return supportingSourceIds.includes(item.sourceId);
    }).length;

    const validation = validateVerdictGate4(
      verdict.claimId,
      supportingSources,
      supportingEvidenceIds,
      contradictingFactCount,
      verdict.reasoning,
      verdict.isCentral
    );

    validationResults.push(validation);

    // Track stats
    switch (validation.confidenceTier) {
      case "HIGH": highConfidence++; break;
      case "MEDIUM": mediumConfidence++; break;
      case "LOW": lowConfidence++; break;
      case "INSUFFICIENT": insufficient++; break;
    }

    if (verdict.isCentral && !validation.publishable) {
      centralKept++;
    }

    validatedVerdicts.push({
      ...verdict,
      gate4Validation: validation,
    });
  }

  const stats = {
    total: verdicts.length,
    publishable: validatedVerdicts.filter(v => v.gate4Validation.publishable).length,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    insufficient,
    centralKept,
  };

  console.log(`[Gate4] Stats: ${stats.publishable}/${stats.total} publishable, HIGH=${stats.highConfidence}, MED=${stats.mediumConfidence}, LOW=${stats.lowConfidence}, INSUFF=${stats.insufficient}`);

  return { validatedVerdicts, validationResults, stats };
}
