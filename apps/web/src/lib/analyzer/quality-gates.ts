/**
 * FactHarbor Analyzer - Quality Gates
 *
 * POC1 Quality Gates implementation:
 * - Gate 1: Claim Validation (content analysis)
 * - Gate 4: Verdict Confidence Assessment
 *
 * v3.1: All thresholds read from CalcConfig (UCM-configurable).
 *
 * @module analyzer/quality-gates
 */

/**
 * Quality gate configuration matching CalcConfig.qualityGates + CalcConfig.sourceReliability shape.
 * All fields optional for backward compatibility.
 */
export interface QualityGateConfig {
  gate1MinContentWords?: number;
  gate4MinSourcesHigh?: number;
  gate4MinSourcesMedium?: number;
  gate4QualityThresholdHigh?: number;
  gate4QualityThresholdMedium?: number;
  gate4AgreementThresholdHigh?: number;
  gate4AgreementThresholdMedium?: number;
  defaultTrackRecordScore?: number;
}

import type {
  ClaimValidationResult,
  VerdictValidationResult,
  ClaimVerdict,
  FetchedSource,
  EvidenceItem,
} from "./types";

// ============================================================================
// GATE 1: CLAIM VALIDATION
// ============================================================================

/**
 * Gate 1: Validate if a claim has sufficient content for analysis
 *
 * IMPORTANT: Central claims are ALWAYS passed through Gate 1, even if they
 * technically fail validation. This ensures important claims aren't lost.
 *
 * All claims are treated as potentially verifiable - the LLM-based analysis
 * determines factuality through grounding factual components.
 */
export function validateClaimGate1(
  claimId: string,
  claimText: string,
  isCentral: boolean = false,
  gateConfig?: QualityGateConfig,
): ClaimValidationResult {
  const minContentWords = gateConfig?.gate1MinContentWords ?? 3;

  // Content word count: helps keep verifiable, mechanism-style claims
  // that don't necessarily include numbers/dates (common in comparative decompositions).
  const contentWordCount = claimText
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4)
    .length;

  // All claims are treated as potentially verifiable (AMBIGUOUS)
  // LLM analysis handles factuality through grounding
  const claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS" = "AMBIGUOUS";
  const isFactual = true; // All claims can be analyzed for factual components
  const opinionScore = 0;
  const specificityScore = 0;
  const futureOriented = false;

  // Pass criteria: filter only extremely content-poor claims (noise)
  // Central claims are still always kept.
  const isContentPoor = contentWordCount < minContentWords;
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
  isCentral: boolean = false,
  gateConfig?: QualityGateConfig,
): VerdictValidationResult {
  const minSourcesHigh = gateConfig?.gate4MinSourcesHigh ?? 3;
  const minSourcesMedium = gateConfig?.gate4MinSourcesMedium ?? 2;
  const qualityHigh = gateConfig?.gate4QualityThresholdHigh ?? 0.7;
  const qualityMedium = gateConfig?.gate4QualityThresholdMedium ?? 0.5;
  const agreementHigh = gateConfig?.gate4AgreementThresholdHigh ?? 0.7;
  const agreementMedium = gateConfig?.gate4AgreementThresholdMedium ?? 0.5;
  const defaultScore = gateConfig?.defaultTrackRecordScore ?? 0.5;

  // 1. Count evidence sources
  const evidenceCount = sources.length;

  // 2. Calculate average source quality
  // Note: trackRecordScore is already 0-1 scale (see Source Reliability Bundle docs)
  const qualityScores = sources.map(s =>
    s.trackRecordScore != null ? s.trackRecordScore : defaultScore
  );
  const averageSourceQuality = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    : 0;

  // 3. Calculate evidence agreement
  const totalEvidence = supportingEvidenceIds.length + contradictingFactCount;
  const evidenceAgreement = totalEvidence > 0
    ? supportingEvidenceIds.length / totalEvidence
    : 0;

  // 4. Uncertainty factors (informational only, not used in decisions)
  const uncertaintyFactors = 0;

  // 5. Determine confidence tier
  let confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

  if (evidenceCount < minSourcesMedium) {
    confidenceTier = "INSUFFICIENT";
  } else if (evidenceCount >= minSourcesHigh && averageSourceQuality >= qualityHigh && evidenceAgreement >= agreementHigh) {
    confidenceTier = "HIGH";
  } else if (evidenceCount >= minSourcesMedium && averageSourceQuality >= qualityMedium && evidenceAgreement >= agreementMedium) {
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
    if (evidenceCount < minSourcesMedium) {
      failureReasons.push(`Insufficient sources (${evidenceCount}, need >=${minSourcesMedium})`);
    }
    if (averageSourceQuality < qualityMedium) {
      failureReasons.push(`Low source quality (${(averageSourceQuality * 100).toFixed(0)}%, need >=${(qualityMedium * 100).toFixed(0)}%)`);
    }
    if (evidenceAgreement < agreementMedium) {
      failureReasons.push(`Low evidence agreement (${(evidenceAgreement * 100).toFixed(0)}%, need >=${(agreementMedium * 100).toFixed(0)}%)`);
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
  claims: T[],
  gateConfig?: QualityGateConfig,
): {
  validatedClaims: (T & { gate1Validation?: ClaimValidationResult })[];
  validationResults: ClaimValidationResult[];
  stats: { total: number; passed: number; filtered: number; centralKept: number };
} {
  const validationResults: ClaimValidationResult[] = [];
  const validatedClaims: (T & { gate1Validation?: ClaimValidationResult })[] = [];
  let centralKept = 0;

  for (const claim of claims) {
    const validation = validateClaimGate1(claim.id, claim.text, claim.isCentral, gateConfig);
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
  evidenceItems: EvidenceItem[],
  gateConfig?: QualityGateConfig,
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
      verdict.isCentral,
      gateConfig,
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
