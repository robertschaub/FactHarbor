/**
 * ClaimBoundary Pipeline — Aggregation Stage
 *
 * Stage 5 aggregates claim verdicts into the overall assessment, including
 * triangulation, derivative weighting, verdict narrative generation, quality
 * gates, explanation checks, and Stage 6 TIGER evaluation helpers.
 *
 * @module analyzer/aggregation-stage
 */

import { generateText, Output } from "ai";
import { z } from "zod";

import type {
  AdjudicationPath,
  ArticleAdjudication,
  CBClaimUnderstanding,
  CBClaimVerdict,
  CBResearchState,
  ClaimAssessmentBoundary,
  CoverageMatrix,
  EvidenceItem,
  ExplanationRubricScores,
  ExplanationStructuralFindings,
  Gate1Stats,
  Gate4Stats,
  OverallAssessment,
  QualityGates,
  TIGERScore,
  TriangulationScore,
  VerdictNarrative,
} from "./types";
import { INSUFFICIENT_CONFIDENCE_MAX } from "./types";
import type { CalcConfig, PipelineConfig } from "@/lib/config-schemas";
import { DEFAULT_CALC_CONFIG } from "@/lib/config-schemas";

import type { LLMCallFn } from "./verdict-stage";
import { percentageToArticleVerdict } from "./truth-scale";
import {
  getModelForTask,
  extractStructuredOutput,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
} from "./llm";
import { loadAndRenderSection } from "./prompt-loader";
import { loadPipelineConfig, loadCalcConfig } from "@/lib/config-loader";
import { recordLLMCall } from "./metrics-integration";

type NarrativeMethodologyHighlight = {
  label: string;
  count: number;
  origins: string[];
};

function normalizeNarrativeHighlightLabel(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length < 3) return null;
  return normalized;
}

function buildNarrativeMethodologyHighlights(
  boundaries: ClaimAssessmentBoundary[],
  evidence: EvidenceItem[],
): NarrativeMethodologyHighlight[] {
  const highlights = new Map<string, { label: string; count: number; origins: Set<string> }>();

  const addHighlight = (label: string | null, origin: string, weight = 1): void => {
    if (!label) return;
    const key = label.toLowerCase();
    const existing = highlights.get(key);
    if (existing) {
      existing.count += weight;
      existing.origins.add(origin);
      return;
    }
    highlights.set(key, {
      label,
      count: weight,
      origins: new Set([origin]),
    });
  };

  for (const boundary of boundaries) {
    const weight = Math.max(1, boundary.evidenceCount || 1);
    addHighlight(normalizeNarrativeHighlightLabel(boundary.name), "boundary_name", weight);
    addHighlight(normalizeNarrativeHighlightLabel(boundary.methodology), "boundary_methodology", weight);
  }

  for (const item of evidence) {
    addHighlight(normalizeNarrativeHighlightLabel(item.evidenceScope?.methodology), "evidence_methodology");
    addHighlight(normalizeNarrativeHighlightLabel(item.evidenceScope?.boundaries), "evidence_boundaries");
  }

  return Array.from(highlights.values())
    .map((entry) => ({
      label: entry.label,
      count: entry.count,
      origins: Array.from(entry.origins).sort(),
    }))
    .sort((a, b) => b.count - a.count || a.label.length - b.label.length)
    .slice(0, 8);
}

/**
 * Stage 5: Produce the overall assessment by weighted aggregation.
 */
export async function aggregateAssessment(
  claimVerdicts: CBClaimVerdict[],
  boundaries: ClaimAssessmentBoundary[],
  evidence: EvidenceItem[],
  coverageMatrix: CoverageMatrix,
  state: CBResearchState,
): Promise<OverallAssessment> {
  const [pipelineResult, calcResult] = await Promise.all([
    loadPipelineConfig("default", state.jobId),
    loadCalcConfig("default", state.jobId),
  ]);
  const pipelineConfig = pipelineResult.config;
  const calcConfig = calcResult.config;

  if (pipelineResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn("[Pipeline] UCM pipeline config load failed in aggregateAssessment — using hardcoded defaults.");
  }
  if (calcResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn("[Pipeline] UCM calc config load failed in aggregateAssessment — using hardcoded defaults.");
  }

  const claims = state.understanding?.atomicClaims ?? [];

  for (const verdict of claimVerdicts) {
    verdict.triangulationScore = computeTriangulationScore(
      verdict,
      coverageMatrix,
      calcConfig,
    );
  }

  const aggregation = calcConfig.aggregation ?? {
    centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
    harmPotentialMultiplier: 1.5,
    derivativeMultiplier: 0.5,
  };
  const harmMultipliers = calcConfig.aggregation?.harmPotentialMultipliers ?? {
    critical: 1.5,
    high: 1.2,
    medium: 1.0,
    low: 1.0,
  };
  const derivativeMultiplier = aggregation.derivativeMultiplier ?? 0.5;
  const anchorClaimMultiplier = aggregation.anchorClaimMultiplier ?? 2.5;
  const probativeValueWeights = calcConfig.probativeValueWeights ?? {
    high: 1.0,
    medium: 0.9,
    low: 0.5,
  };
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const anchorText = state.understanding?.contractValidationSummary?.truthConditionAnchor?.anchorText?.trim();
  const anchorTextLower = anchorText?.toLowerCase() ?? "";
  const reportedAnchorClaimIds = new Set(
    state.understanding?.contractValidationSummary?.truthConditionAnchor?.validPreservedIds
      ?? state.understanding?.contractValidationSummary?.truthConditionAnchor?.preservedInClaimIds
      ?? [],
  );
  const structuralAnchorClaimIds = new Set(
    claims
      .filter((claim) => anchorTextLower && claim.statement.toLowerCase().includes(anchorTextLower))
      .map((claim) => claim.id),
  );
  const anchorPreservedClaimIds = structuralAnchorClaimIds.size > 0
    ? structuralAnchorClaimIds
    : reportedAnchorClaimIds;

  const weightsData = claimVerdicts.map((verdict) => {
    const claim = claims.find((c) => c.id === verdict.claimId);
    const centrality = claim?.centrality ?? "low";
    const centralityWeight =
      aggregation.centralityWeights[centrality as keyof typeof aggregation.centralityWeights] ?? 1.0;

    const harmLevel = verdict.harmPotential ?? "medium";
    const harmWeight = harmMultipliers[harmLevel as keyof typeof harmMultipliers] ?? 1.0;
    const confidenceFactor = verdict.confidence / 100;
    const triangulationFactor = verdict.triangulationScore?.factor ?? 0;
    const derivativeFactor = computeDerivativeFactor(
      verdict,
      evidence,
      derivativeMultiplier,
    );
    const anchorFactor = anchorPreservedClaimIds.has(verdict.claimId)
      ? anchorClaimMultiplier
      : 1.0;

    const supportingEvidenceIds = verdict.supportingEvidenceIds ?? [];
    const probativeFactors = supportingEvidenceIds
      .map((id) => evidenceById.get(id))
      .filter((item): item is EvidenceItem => Boolean(item))
      .map((item) => {
        const level = item.probativeValue ?? "medium";
        return probativeValueWeights[level];
      });
    const probativeFactor =
      probativeFactors.length > 0
        ? probativeFactors.reduce((sum, value) => sum + value, 0) / probativeFactors.length
        : 1.0;

    const finalWeight =
      centralityWeight *
      harmWeight *
      confidenceFactor *
      (1 + triangulationFactor) *
      derivativeFactor *
      anchorFactor *
      probativeFactor;

    const isCounterClaim = claim?.claimDirection === "contradicts_thesis";
    const effectiveTruth = isCounterClaim
      ? 100 - verdict.truthPercentage
      : verdict.truthPercentage;

    const effectiveRange = verdict.truthPercentageRange
      ? isCounterClaim
        ? {
            min: Math.min(100 - verdict.truthPercentageRange.max, 100 - verdict.truthPercentageRange.min),
            max: Math.max(100 - verdict.truthPercentageRange.max, 100 - verdict.truthPercentageRange.min),
          }
        : {
            min: verdict.truthPercentageRange.min,
            max: verdict.truthPercentageRange.max,
          }
      : undefined;

    const thesisRelevance = claim?.thesisRelevance;
    if (thesisRelevance && thesisRelevance !== "direct") {
      return {
        truthPercentage: effectiveTruth,
        confidence: verdict.confidence,
        truthPercentageRange: effectiveRange,
        weight: 0,
      };
    }

    return {
      truthPercentage: effectiveTruth,
      confidence: verdict.confidence,
      truthPercentageRange: effectiveRange,
      weight: Math.max(0, finalWeight),
    };
  });

  const totalWeight = weightsData.reduce((sum, item) => sum + item.weight, 0);
  const weightedTruthPercentage =
    totalWeight > 0
      ? weightsData.reduce((sum, item) => sum + item.truthPercentage * item.weight, 0) / totalWeight
      : 50;
  const weightedConfidence =
    totalWeight > 0
      ? weightsData.reduce((sum, item) => sum + item.confidence * item.weight, 0) / totalWeight
      : 0;
  const hasIntegrityDowngrade = claimVerdicts.some(
    (verdict) => verdict.verdictReason === "verdict_integrity_failure",
  );
  const effectiveWeightedConfidence = hasIntegrityDowngrade
    ? Math.min(weightedConfidence, INSUFFICIENT_CONFIDENCE_MAX)
    : weightedConfidence;

  const mixedConfidenceThreshold = calcConfig.mixedConfidenceThreshold ?? DEFAULT_CALC_CONFIG.mixedConfidenceThreshold ?? 45;

  // ------------------------------------------------------------------
  // Baseline truth/confidence
  // ------------------------------------------------------------------
  const baselineTruth = weightedTruthPercentage;
  const baselineConfidence = effectiveWeightedConfidence;

  // ------------------------------------------------------------------
  // Direction conflict detection (Option G gate)
  // ------------------------------------------------------------------
  const adjudicationConfig = calcConfig.aggregation?.articleAdjudication;
  const adjudicationEnabled = adjudicationConfig?.enabled ?? false;
  const borderlineMargin = adjudicationConfig?.borderlineMargin ?? 10;
  const maxDeviation = adjudicationConfig?.maxDeviationFromBaseline ?? 30;

  const directClaimVerdicts = claimVerdicts.filter((v) => {
    const claim = claims.find((c) => c.id === v.claimId);
    return !claim?.thesisRelevance || claim.thesisRelevance === "direct";
  });

  const directionConflict = hasDirectionConflict(directClaimVerdicts, claims, borderlineMargin);

  // ------------------------------------------------------------------
  // Article adjudication (Option G): LLM adjudication on conflict path
  // ------------------------------------------------------------------
  let articleAdjudication: ArticleAdjudication | undefined;
  let finalTruthPercentage: number = baselineTruth;
  let finalConfidence: number = baselineConfidence;
  let adjudicationPathType: AdjudicationPath["path"] = directionConflict
    ? "baseline_fallback"    // conflict exists but adjudication not attempted or disabled
    : "baseline_same_direction";
  let guardsApplied: AdjudicationPath["guardsApplied"];

  if (adjudicationEnabled && directionConflict && claimVerdicts.length >= 2) {
    state.onEvent?.(`LLM call: article adjudication — ${getModelForTask("verdict", undefined, pipelineConfig).modelName}`, -1);
    const rawAdjudication = await assessArticleVerdict(
      claimVerdicts,
      claims,
      state.originalInput,
      baselineTruth,
      baselineConfidence,
      evidence,
      boundaries,
      pipelineConfig,
      state.understanding?.contractValidationSummary,
    );
    state.llmCalls++;

    if (rawAdjudication) {
      articleAdjudication = rawAdjudication;

      // Apply structural guards
      let guardedTruth = rawAdjudication.articleTruthPercentage;
      let guardedConfidence = rawAdjudication.articleConfidence;
      let deviationCapped = false;
      let confidenceCeiled = false;
      let integrityDowngraded = false;
      let boundsClamped = false;

      // Guard 1: Deviation cap
      const lower = baselineTruth - maxDeviation;
      const upper = baselineTruth + maxDeviation;
      if (guardedTruth < lower || guardedTruth > upper) {
        guardedTruth = Math.max(lower, Math.min(upper, guardedTruth));
        deviationCapped = true;
      }

      // Guard 2: Bounds clamping
      if (guardedTruth < 0 || guardedTruth > 100) {
        guardedTruth = Math.max(0, Math.min(100, guardedTruth));
        boundsClamped = true;
      }
      if (guardedConfidence < 0 || guardedConfidence > 100) {
        guardedConfidence = Math.max(0, Math.min(100, guardedConfidence));
        boundsClamped = true;
      }

      // Guard 3: Confidence ceiling — cannot exceed max individual claim confidence
      const maxClaimConfidence = Math.max(...claimVerdicts.map((v) => v.confidence));
      if (guardedConfidence > maxClaimConfidence) {
        guardedConfidence = maxClaimConfidence;
        confidenceCeiled = true;
      }

      // Guard 4: Integrity downgrade
      if (hasIntegrityDowngrade && guardedConfidence > INSUFFICIENT_CONFIDENCE_MAX) {
        guardedConfidence = INSUFFICIENT_CONFIDENCE_MAX;
        integrityDowngraded = true;
      }

      finalTruthPercentage = guardedTruth;
      finalConfidence = guardedConfidence;
      adjudicationPathType = "llm_adjudicated";
      guardsApplied = { deviationCapped, confidenceCeiled, integrityDowngraded, boundsClamped };
    } else {
      // LLM failure — fallback to baseline
      adjudicationPathType = "baseline_fallback";
    }
  }

  // Apply integrity downgrade to baseline path if needed
  if (adjudicationPathType === "baseline_same_direction" && hasIntegrityDowngrade) {
    finalConfidence = Math.min(finalConfidence, INSUFFICIENT_CONFIDENCE_MAX);
  }

  const preNarrativeTruth = finalTruthPercentage;
  const preNarrativeConfidence = finalConfidence;

  const verdictLabel = percentageToArticleVerdict(
    preNarrativeTruth,
    preNarrativeConfidence,
    undefined,
    mixedConfidenceThreshold,
  );

  // ------------------------------------------------------------------
  // Narrative generation (always explanatory — never adjudicatory)
  // ------------------------------------------------------------------
  let verdictNarrative: VerdictNarrative;
  try {
    state.onEvent?.(`LLM call: verdict narrative — ${getModelForTask("verdict", undefined, pipelineConfig).modelName}`, -1);
    verdictNarrative = await generateVerdictNarrative(
      preNarrativeTruth,
      verdictLabel,
      preNarrativeConfidence,
      claimVerdicts,
      boundaries,
      coverageMatrix,
      evidence,
      pipelineConfig,
      state.languageIntent?.reportLanguage,
    );
    state.llmCalls++;
  } catch (err) {
    console.warn("[Stage5] VerdictNarrative generation failed, using fallback:", err);
    verdictNarrative = {
      headline: `Analysis yields ${verdictLabel} verdict at ${Math.round(preNarrativeConfidence)}% confidence`,
      evidenceBaseSummary: `${evidence.length} evidence items from ${state.sources.length} sources across ${boundaries.length} perspective${boundaries.length !== 1 ? "s" : ""}`,
      keyFinding: `Weighted analysis of ${claimVerdicts.length} claims produces an overall truth assessment of ${Math.round(preNarrativeTruth)}%.`,
      limitations: "Automated analysis with limitations inherent to evidence availability and source coverage.",
    };
  }

  // Narrative is explanatory only — no truth adjustment for any path.
  // For same-direction unresolved-claim jobs, this means truth stays at the
  // baseline even when INSUFFICIENT claims exist. The confidence ceiling
  // is the correct uncertainty signal (accepted regression R3, 2026-04-09).
  const adjConf = verdictNarrative.adjustedConfidence;
  if (typeof adjConf === "number" && Number.isFinite(adjConf)) {
    finalConfidence = Math.min(adjConf, finalConfidence);
    finalConfidence = Math.max(0, Math.min(100, finalConfidence));
  }

  // ------------------------------------------------------------------
  // Adjudication path audit trail
  // ------------------------------------------------------------------
  const adjudicationPath: AdjudicationPath = {
    baselineAggregate: { truthPercentage: Math.round(baselineTruth), confidence: Math.round(baselineConfidence) },
    directionConflict,
    ...(articleAdjudication ? {
      llmAdjudication: {
        rawTruthPercentage: articleAdjudication.articleTruthPercentage,
        rawConfidence: articleAdjudication.articleConfidence,
        dominanceAssessment: articleAdjudication.dominanceAssessment,
        claimWeightRationale: articleAdjudication.claimWeightRationale,
        adjudicationReasoning: articleAdjudication.adjudicationReasoning,
        articleTruthRange: articleAdjudication.articleTruthRange,
      },
      guardsApplied,
    } : {}),
    finalAggregate: { truthPercentage: Math.round(finalTruthPercentage), confidence: Math.round(finalConfidence) },
    path: adjudicationPathType,
  };

  const finalVerdictLabel = percentageToArticleVerdict(
    finalTruthPercentage,
    finalConfidence,
    undefined,
    mixedConfidenceThreshold,
  );

  const qualityGates = buildQualityGates(
    state.understanding?.gate1Stats,
    claimVerdicts,
    evidence,
    state,
  );

  let overallRange: { min: number; max: number } | undefined;
  const claimsWithRange = claimVerdicts.filter((v) => v.truthPercentageRange);
  if (claimsWithRange.length > 0) {
    const totalW = weightsData.reduce((sum, item) => sum + item.weight, 0);
    if (totalW > 0) {
      let weightedMin = 0;
      let weightedMax = 0;
      for (let i = 0; i < weightsData.length; i++) {
        const v = weightsData[i];
        const w = weightsData[i]?.weight ?? 0;
        if (v.truthPercentageRange) {
          weightedMin += v.truthPercentageRange.min * w;
          weightedMax += v.truthPercentageRange.max * w;
        } else {
          weightedMin += v.truthPercentage * w;
          weightedMax += v.truthPercentage * w;
        }
      }
      overallRange = {
        min: Math.round((weightedMin / totalW) * 10) / 10,
        max: Math.round((weightedMax / totalW) * 10) / 10,
      };
    }
  }

  // Use LLM-provided range if available and on the adjudicated path,
  // but clamp it to the same deviation cap bounds that were applied to truth,
  // and normalize so min <= max.
  if (articleAdjudication?.articleTruthRange && adjudicationPathType === "llm_adjudicated") {
    const lower = baselineTruth - maxDeviation;
    const upper = baselineTruth + maxDeviation;
    let clampedMin = Math.max(0, Math.min(100, Math.max(lower, articleAdjudication.articleTruthRange.min)));
    let clampedMax = Math.max(0, Math.min(100, Math.min(upper, articleAdjudication.articleTruthRange.max)));
    // Normalize: if clamping or a malformed LLM response inverted the range, swap.
    if (clampedMin > clampedMax) {
      [clampedMin, clampedMax] = [clampedMax, clampedMin];
    }
    overallRange = { min: clampedMin, max: clampedMax };
  }

  return {
    truthPercentage: Math.round(finalTruthPercentage * 10) / 10,
    verdict: finalVerdictLabel,
    confidence: Math.round(finalConfidence * 10) / 10,
    verdictNarrative,
    hasMultipleBoundaries: boundaries.length > 1,
    claimBoundaries: boundaries,
    claimVerdicts,
    coverageMatrix,
    qualityGates,
    truthPercentageRange: overallRange,
    articleAdjudication,
    adjudicationPath,
  };
}

export function computeTriangulationScore(
  verdict: CBClaimVerdict,
  coverageMatrix: CoverageMatrix,
  calcConfig: CalcConfig,
): TriangulationScore {
  const triangulationConfig = calcConfig.aggregation?.triangulation ?? {
    strongAgreementBoost: 0.15,
    moderateAgreementBoost: 0.05,
    singleBoundaryPenalty: -0.10,
  };

  const boundaryIds = coverageMatrix.getBoundariesForClaim(verdict.claimId);
  const findings = verdict.boundaryFindings ?? [];

  let supporting = 0;
  let contradicting = 0;

  for (const bId of boundaryIds) {
    const finding = findings.find((f) => f.boundaryId === bId);
    if (!finding) continue;
    if (finding.evidenceDirection === "supports") supporting++;
    else if (finding.evidenceDirection === "contradicts") contradicting++;
  }

  const boundaryCount = boundaryIds.length;
  let level: TriangulationScore["level"];
  let factor: number;

  if (boundaryCount <= 1) {
    level = "weak";
    factor = triangulationConfig.singleBoundaryPenalty ?? -0.10;
  } else if (supporting >= 3) {
    level = "strong";
    factor = triangulationConfig.strongAgreementBoost ?? 0.15;
  } else if (supporting >= 2 && contradicting <= 1) {
    level = "moderate";
    factor = triangulationConfig.moderateAgreementBoost ?? 0.05;
  } else if (supporting > 0 && contradicting > 0 && Math.abs(supporting - contradicting) <= 1) {
    level = "conflicted";
    factor = 0;
  } else if (supporting > contradicting) {
    level = "moderate";
    factor = triangulationConfig.moderateAgreementBoost ?? 0.05;
  } else {
    level = "weak";
    factor = triangulationConfig.singleBoundaryPenalty ?? -0.10;
  }

  return { boundaryCount, supporting, contradicting, level, factor };
}

export function computeDerivativeFactor(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  derivativeMultiplier: number,
): number {
  const supportingIds = verdict.supportingEvidenceIds ?? [];
  if (supportingIds.length === 0) return 1.0;

  const supportingEvidence = supportingIds
    .map((id) => evidence.find((e) => e.id === id))
    .filter(Boolean) as EvidenceItem[];

  if (supportingEvidence.length === 0) return 1.0;

  const derivativeCount = supportingEvidence.filter(
    (e) => e.isDerivative === true && e.derivativeClaimUnverified !== true,
  ).length;

  const derivativeRatio = derivativeCount / supportingEvidence.length;
  return 1.0 - derivativeRatio * (1.0 - derivativeMultiplier);
}

// ============================================================================
// DIRECTION CONFLICT DETECTION (Option G gate)
// ============================================================================

/**
 * Detect whether direct claims disagree in direction (Option G gate).
 *
 * A direction conflict exists when at least one non-excluded direct claim is
 * true-leaning AND at least one is false-leaning. Borderline claims (within
 * margin of 50%) and INSUFFICIENT claims are excluded.
 *
 * This is a structural check on typed LLM outputs, not a semantic heuristic.
 */
export function hasDirectionConflict(
  directClaimVerdicts: CBClaimVerdict[],
  claims: { id: string; claimDirection?: string }[],
  borderlineMargin: number = 10,
): boolean {
  let hasTrueLeaning = false;
  let hasFalseLeaning = false;

  for (const verdict of directClaimVerdicts) {
    // Exclude INSUFFICIENT claims — direction is unreliable
    if (verdict.confidenceTier === "INSUFFICIENT") continue;

    const claim = claims.find((c) => c.id === verdict.claimId);
    const direction = claim?.claimDirection;
    const truth = verdict.truthPercentage;

    // Skip borderline claims (within margin of 50%)
    if (truth >= 50 - borderlineMargin && truth <= 50 + borderlineMargin) continue;

    // Only supports_thesis and contradicts_thesis participate in conflict detection.
    // Contextual claims are excluded — they don't have a directional stake.
    if (direction === "contextual") continue;

    const isSupports = direction === "supports_thesis" || !direction;
    if (isSupports) {
      if (truth > 50 + borderlineMargin) hasTrueLeaning = true;
      else if (truth < 50 - borderlineMargin) hasFalseLeaning = true;
    } else if (direction === "contradicts_thesis") {
      // contradicts_thesis: high truth means the contradiction is true, so article is false-leaning
      if (truth > 50 + borderlineMargin) hasFalseLeaning = true;
      else if (truth < 50 - borderlineMargin) hasTrueLeaning = true;
    }

    if (hasTrueLeaning && hasFalseLeaning) return true;
  }

  return false;
}

// ============================================================================
// ARTICLE ADJUDICATION (Option G — LLM-led)
// ============================================================================

const ArticleAdjudicationOutputSchema = z.object({
  articleTruthPercentage: z.number().min(0).max(100),
  articleConfidence: z.number().min(0).max(100),
  articleTruthRange: z.object({ min: z.number(), max: z.number() }).optional(),
  dominanceAssessment: z.object({
    mode: z.enum(["none", "single"]),
    dominantClaimId: z.string().optional(),
    strength: z.enum(["strong", "decisive"]).optional(),
    rationale: z.string(),
  }),
  claimWeightRationale: z.array(z.object({
    claimId: z.string(),
    effectiveInfluence: z.enum(["primary", "significant", "moderate", "minor"]),
    reasoning: z.string(),
  })),
  adjudicationReasoning: z.string(),
});

/**
 * Run the ARTICLE_ADJUDICATION LLM step to produce the final article truth
 * when direct claims disagree in direction (Option G conflict path).
 *
 * Returns undefined on failure (fail-open: baseline weighted average used).
 */
async function assessArticleVerdict(
  claimVerdicts: CBClaimVerdict[],
  claims: { id: string; statement: string; thesisRelevance?: string }[],
  originalInput: string,
  baselineTruth: number,
  baselineConfidence: number,
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  pipelineConfig: PipelineConfig,
  contractValidationSummary?: {
    ran: boolean;
    preservesContract: boolean;
    rePromptRequired: boolean;
    summary: string;
    failureMode?: "contract_violated" | "validator_unavailable";
    anchorRetryReason?: string;
    truthConditionAnchor?: {
      presentInInput: boolean;
      anchorText: string;
      preservedInClaimIds: string[];
      validPreservedIds: string[];
    };
  },
): Promise<ArticleAdjudication | undefined> {
  if (claimVerdicts.length < 2) return undefined;

  const rendered = await loadAndRenderSection("claimboundary", "ARTICLE_ADJUDICATION", {
    originalInput,
    claimVerdicts: JSON.stringify(
      claimVerdicts.map((v) => {
        const claim = claims.find((c) => c.id === v.claimId);
        return {
          claimId: v.claimId,
          claimDirection: (claim as any)?.claimDirection,
          truthPercentage: v.truthPercentage,
          verdict: v.verdict,
          confidence: v.confidence,
          confidenceTier: v.confidenceTier,
          reasoning: v.reasoning?.slice(0, 200),
        };
      }),
      null,
      2,
    ),
    atomicClaims: JSON.stringify(
      claims.map((c) => ({
        claimId: c.id,
        statement: c.statement,
        thesisRelevance: c.thesisRelevance,
        claimDirection: (c as any).claimDirection,
      })),
      null,
      2,
    ),
    contractValidationSummary: JSON.stringify(contractValidationSummary ?? null, null, 2),
    baselineTruthPercentage: String(Math.round(baselineTruth * 10) / 10),
    baselineConfidence: String(Math.round(baselineConfidence * 10) / 10),
    evidenceSummary: JSON.stringify({
      totalEvidence: evidence.length,
      totalBoundaries: boundaries.length,
    }),
  });

  if (!rendered) return undefined;

  const model = getModelForTask("verdict", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: Awaited<ReturnType<typeof generateText>> | undefined;
  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Produce the article-level truth assessment for this ${claimVerdicts.length}-claim input where claims disagree in direction. Baseline weighted average: ${Math.round(baselineTruth)}%.`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: ArticleAdjudicationOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return undefined;

    const validated = ArticleAdjudicationOutputSchema.parse(parsed);
    recordLLMCall({
      taskType: "aggregate",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    // Structural validation: dominantClaimId must exist in the claim set
    if (validated.dominanceAssessment.mode === "single" && validated.dominanceAssessment.dominantClaimId) {
      const validClaimIds = new Set(claimVerdicts.map((v) => v.claimId));
      if (!validClaimIds.has(validated.dominanceAssessment.dominantClaimId)) {
        console.warn(`[Stage5] Article adjudication cited non-existent dominant claim ${validated.dominanceAssessment.dominantClaimId}`);
        // Clear the invalid reference but keep the rest of the adjudication
        validated.dominanceAssessment.dominantClaimId = undefined;
        validated.dominanceAssessment.mode = "none";
      }
    }

    return validated;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordLLMCall({
      taskType: "aggregate",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    console.warn("[Stage5] Article adjudication failed (non-fatal, falling back to baseline):", err);
    return undefined;
  }
}

// ============================================================================
// VERDICT NARRATIVE
// ============================================================================

const VerdictNarrativeOutputSchema = z.object({
  headline: z.string(),
  evidenceBaseSummary: z.string(),
  keyFinding: z.string(),
  boundaryDisagreements: z.array(z.string()).optional(),
  limitations: z.string(),
  // Confidence ceiling (explanatory-only): narrative can cap confidence downward, never override truth.
  adjustedConfidence: z.number().min(0).max(100).optional(),
});

export async function generateVerdictNarrative(
  truthPercentage: number,
  verdict: string,
  confidence: number,
  claimVerdicts: CBClaimVerdict[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  evidence: EvidenceItem[],
  pipelineConfig: PipelineConfig,
  reportLanguage?: string,
): Promise<VerdictNarrative> {
  const currentDate = new Date().toISOString().split("T")[0];
  const methodologyHighlights = buildNarrativeMethodologyHighlights(boundaries, evidence);

  // Build the two previously-stale template variables that VERDICT_NARRATIVE expects.
  // These were never wired since the original module extraction (6e347f09).
  const supportCount = evidence.filter((e) => e.claimDirection === "supports").length;
  const contradictCount = evidence.filter((e) => e.claimDirection === "contradicts").length;
  const neutralCount = evidence.length - supportCount - contradictCount;
  const uniqueSources = new Set(
    evidence.map((e) => e.sourceUrl).filter(Boolean),
  );

  const rendered = await loadAndRenderSection("claimboundary", "VERDICT_NARRATIVE", {
    reportLanguage: reportLanguage ?? "en",
    currentDate,
    overallVerdict: JSON.stringify({
      truthPercentage: Math.round(truthPercentage),
      verdict,
      confidence: Math.round(confidence),
    }),
    aggregation: JSON.stringify({
      weightedTruthPercentage: Math.round(truthPercentage),
      weightedConfidence: Math.round(confidence),
      verdict,
      claimCount: claimVerdicts.length,
      perClaim: claimVerdicts.slice(0, 7).map((v) => ({
        claimId: v.claimId,
        truthPercentage: v.truthPercentage,
        verdict: v.verdict,
        confidence: v.confidence,
        confidenceTier: v.confidenceTier,
      })),
    }, null, 2),
    evidenceSummary: JSON.stringify({
      totalItems: evidence.length,
      sourceCount: uniqueSources.size,
      boundaryCount: boundaries.length,
      directionBalance: { supports: supportCount, contradicts: contradictCount, neutral: neutralCount },
      perClaim: claimVerdicts.slice(0, 7).map((v) => ({
        claimId: v.claimId,
        evidenceCount: evidence.filter((e) => e.relevantClaimIds?.includes(v.claimId)).length,
      })),
    }, null, 2),
    claimVerdicts: JSON.stringify(
      claimVerdicts.slice(0, 7).map((v) => ({
        claimId: v.claimId,
        truthPercentage: v.truthPercentage,
        verdict: v.verdict,
        confidence: v.confidence,
        reasoning: v.reasoning?.slice(0, 200),
        boundaryFindings: v.boundaryFindings?.map((f) => ({
          boundaryId: f.boundaryId,
          boundaryName: f.boundaryName,
          evidenceDirection: f.evidenceDirection,
          evidenceCount: f.evidenceCount,
        })),
      })),
      null,
      2,
    ),
    claimBoundaries: JSON.stringify(
      boundaries.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        evidenceCount: b.evidenceCount,
      })),
      null,
      2,
    ),
    methodologyHighlights: JSON.stringify(methodologyHighlights, null, 2),
    coverageMatrix: JSON.stringify({
      claims: coverageMatrix.claims,
      boundaries: coverageMatrix.boundaries,
      counts: coverageMatrix.counts,
    }),
    evidenceCount: String(evidence.length),
  });

  if (!rendered) {
    throw new Error("Stage 5: Failed to load VERDICT_NARRATIVE prompt section");
  }

  const model = getModelForTask("verdict", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;
  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Generate a structured narrative for the overall assessment (truth: ${Math.round(truthPercentage)}%, verdict: ${verdict}, confidence: ${Math.round(confidence)}%).`,
        },
      ],
      temperature: pipelineConfig?.narrativeGenerationTemperature ?? 0.2,
      output: Output.object({ schema: VerdictNarrativeOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      throw new Error("Stage 5: LLM returned no structured output for VerdictNarrative");
    }

    const validated = VerdictNarrativeOutputSchema.parse(parsed);
    recordLLMCall({
      taskType: "aggregate",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });
    return validated;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    recordLLMCall({
      taskType: "aggregate",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    throw error;
  }
}

function truncateTigerReasoning(reasoning: string, maxChars: number): string {
  const chars = Array.from(reasoning);
  if (chars.length <= maxChars) {
    return reasoning;
  }
  return `${chars.slice(0, maxChars).join("")}...`;
}

export async function evaluateTigerScore(
  originalInput: string,
  assessment: OverallAssessment,
  evidenceCount: number,
  sourceCount: number,
  llmCall: LLMCallFn,
  pipelineConfig: PipelineConfig,
): Promise<TIGERScore> {
  const TigerScoreOutputSchema = z.object({
    scores: z.object({
      truth: z.number().min(1).max(5),
      insight: z.number().min(1).max(5),
      grounding: z.number().min(1).max(5),
      evidence: z.number().min(1).max(5),
      relevance: z.number().min(1).max(5),
    }),
    overallScore: z.number().min(1).max(5),
    reasoning: z.string(),
    warnings: z.array(z.string()),
  }).superRefine((value, ctx) => {
    const avg = (
      value.scores.truth
      + value.scores.insight
      + value.scores.grounding
      + value.scores.evidence
      + value.scores.relevance
    ) / 5;
    if (Math.abs(value.overallScore - avg) > 0.11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overallScore"],
        message: "overallScore must equal the average of TIGER dimension scores",
      });
    }
  });

  const tigerScoreTier = pipelineConfig.tigerScoreStrength ?? "standard";
  const tigerScoreTemperature = pipelineConfig.tigerScoreTemperature ?? 0.1;

  const raw = await llmCall(
    "TIGER_SCORE_EVAL",
    {
      originalInput,
      assessment: JSON.stringify({
        verdict: assessment.verdict,
        truthPercentage: assessment.truthPercentage,
        confidence: assessment.confidence,
        narrative: assessment.verdictNarrative,
        claims: assessment.claimVerdicts.map((cv) => ({
          claimId: cv.claimId,
          verdict: cv.verdict,
          truthPercentage: cv.truthPercentage,
          confidence: cv.confidence,
          reasoning: truncateTigerReasoning(cv.reasoning, 300),
        })),
      }, null, 2),
      evidenceCount: String(evidenceCount),
      sourceCount: String(sourceCount),
    },
    {
      temperature: tigerScoreTemperature,
      tier: tigerScoreTier,
      callContext: { debateRole: "auditor", promptKey: "TIGER_SCORE_EVAL" },
    },
  );

  const parsed = TigerScoreOutputSchema.parse(raw);
  return {
    scores: parsed.scores,
    overallScore: parsed.overallScore,
    reasoning: parsed.reasoning,
    warnings: parsed.warnings,
  };
}

export function buildQualityGates(
  cbGate1Stats: CBClaimUnderstanding["gate1Stats"] | undefined,
  claimVerdicts: CBClaimVerdict[],
  evidence: EvidenceItem[],
  state: CBResearchState,
): QualityGates {
  const gate1Stats: Gate1Stats | undefined = cbGate1Stats
    ? {
        total: cbGate1Stats.totalClaims,
        passed: cbGate1Stats.totalClaims - cbGate1Stats.filteredCount,
        filtered: cbGate1Stats.filteredCount,
        centralKept: cbGate1Stats.totalClaims - cbGate1Stats.filteredCount,
      }
    : undefined;

  const highConfidence = claimVerdicts.filter((v) => v.confidence >= 70).length;
  const mediumConfidence = claimVerdicts.filter(
    (v) => v.confidence >= 40 && v.confidence < 70,
  ).length;
  const lowConfidence = claimVerdicts.filter(
    (v) => v.confidence > 0 && v.confidence < 40,
  ).length;
  const insufficient = claimVerdicts.filter((v) => v.confidence === 0).length;

  const gate4Stats: Gate4Stats = {
    total: claimVerdicts.length,
    publishable: highConfidence + mediumConfidence,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    insufficient,
    centralKept: claimVerdicts.length,
  };

  return {
    passed: cbGate1Stats?.overallPass !== false && gate4Stats.publishable > 0,
    gate1Stats,
    gate4Stats,
    summary: {
      totalEvidenceItems: evidence.length,
      totalSources: state.sources.length,
      searchesPerformed: state.searchQueries.length,
      contradictionSearchPerformed: state.contradictionIterationsUsed > 0,
    },
  };
}

export function checkExplanationStructure(
  narrative: VerdictNarrative,
): ExplanationStructuralFindings {
  return {
    hasCitedEvidence: narrative.evidenceBaseSummary.length > 0
      && /\d+/.test(narrative.evidenceBaseSummary),
    hasVerdictCategory: narrative.headline.length > 0
      && (/\p{Lu}[\p{Lu}\-]{2,}/u.test(narrative.headline)
        || /\p{Lu}\p{L}+-\p{Lu}\p{L}+/u.test(narrative.headline)
        || /\d+%/.test(narrative.headline)),
    hasConfidenceStatement: /\d+%/.test(narrative.headline)
      || /\d+\s*\/\s*\d+/.test(narrative.headline + " " + narrative.keyFinding),
    hasLimitations: narrative.limitations.length > 5,
  };
}

function renderNarrativeForRubric(narrative: VerdictNarrative): string {
  const boundaryDisagreements = narrative.boundaryDisagreements ?? [];
  const sections = [
    `Headline: ${narrative.headline}`,
    `Evidence Base Summary: ${narrative.evidenceBaseSummary}`,
    `Key Finding: ${narrative.keyFinding}`,
    `Limitations: ${narrative.limitations}`,
  ];

  if (boundaryDisagreements.length > 0) {
    sections.push(`Boundary Disagreements: ${boundaryDisagreements.join("; ")}`);
  }

  return sections.join("\n\n");
}

export async function evaluateExplanationRubric(
  narrative: VerdictNarrative,
  claimCount: number,
  evidenceCount: number,
  llmCall: LLMCallFn,
): Promise<ExplanationRubricScores> {
  const result = await llmCall("EXPLANATION_QUALITY_RUBRIC", {
    narrative: renderNarrativeForRubric(narrative),
    claimCount,
    evidenceCount,
  }, { tier: "haiku" });

  const raw = result as Record<string, unknown>;
  const parseScore = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : 3;
  };

  const clarity = parseScore(raw.clarity);
  const completeness = parseScore(raw.completeness);
  const neutrality = parseScore(raw.neutrality);
  const evidenceSupport = parseScore(raw.evidenceSupport);
  const appropriateHedging = parseScore(raw.appropriateHedging);
  const overallScore = Math.round(
    (clarity + completeness + neutrality + evidenceSupport + appropriateHedging) / 5 * 10,
  ) / 10;

  const flags = Array.isArray(raw.flags) ? raw.flags.map(String) : [];

  return { clarity, completeness, neutrality, evidenceSupport, appropriateHedging, overallScore, flags };
}
