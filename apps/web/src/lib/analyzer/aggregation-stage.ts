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
  CBClaimUnderstanding,
  CBClaimVerdict,
  CBResearchState,
  ClaimAssessmentBoundary,
  CoverageMatrix,
  DominanceAssessment,
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
  // Complete-assessment predicate: every direct claim has confidenceTier !== "INSUFFICIENT"
  // ------------------------------------------------------------------
  const directClaimVerdicts = claimVerdicts.filter((v) => {
    const claim = claims.find((c) => c.id === v.claimId);
    return !claim?.thesisRelevance || claim.thesisRelevance === "direct";
  });
  const isCompleteAssessment = directClaimVerdicts.length > 0 &&
    directClaimVerdicts.every((v) => v.confidenceTier !== "INSUFFICIENT");

  // ------------------------------------------------------------------
  // Dominance assessment: run after per-claim verdicts, before narrative
  // ------------------------------------------------------------------
  const dominanceEnabled = calcConfig.aggregation?.dominance?.enabled ?? false;
  let dominanceAssessment: DominanceAssessment | undefined;
  let dominanceAdjustedTruth: number | undefined;
  let dominanceAdjustedConfidence: number | undefined;
  // Track effective weights — either baseline or dominance-adjusted — for range computation.
  let effectiveWeightsData = weightsData;

  if (dominanceEnabled && claimVerdicts.length >= 2) {
    state.onEvent?.(`LLM call: dominance assessment — ${getModelForTask("verdict", undefined, pipelineConfig).modelName}`, -1);
    const rawDominance = await assessClaimDominance(
      claimVerdicts,
      claims,
      state.originalInput,
      pipelineConfig,
      state.understanding?.contractValidationSummary,
    );
    state.llmCalls++;

    if (rawDominance && rawDominance.dominanceMode === "single" && rawDominance.dominantClaimId) {
      const domConfig = calcConfig.aggregation?.dominance;
      const minConfidence = domConfig?.minConfidence ?? "high";
      const confidenceOrder = { low: 0, medium: 1, high: 2 };
      const meetsMinConfidence = confidenceOrder[rawDominance.dominanceConfidence] >= confidenceOrder[minConfidence];

      if (meetsMinConfidence) {
        const strength = rawDominance.dominanceStrength ?? "strong";
        const multiplier = strength === "decisive"
          ? (domConfig?.decisiveMultiplier ?? 5.0)
          : (domConfig?.strongMultiplier ?? 2.5);

        // Recompute weighted average with dominance multiplier.
        // Dominance SUPERSEDES anchor — do not stack.
        const domWeightsData = weightsData.map((item, idx) => {
          const verdict = claimVerdicts[idx];
          const isDominant = verdict.claimId === rawDominance.dominantClaimId;
          const isAnchor = anchorPreservedClaimIds.has(verdict.claimId);
          if (isDominant) {
            // Replace anchor factor with dominance multiplier
            const anchorFactor = isAnchor ? (aggregation.anchorClaimMultiplier ?? 2.5) : 1.0;
            const baseWeight = item.weight / anchorFactor; // Remove anchor
            return { ...item, weight: baseWeight * multiplier };
          }
          return item;
        });
        const domTotalWeight = domWeightsData.reduce((sum, item) => sum + item.weight, 0);
        if (domTotalWeight > 0) {
          dominanceAdjustedTruth = domWeightsData.reduce((sum, item) => sum + item.truthPercentage * item.weight, 0) / domTotalWeight;
          dominanceAdjustedConfidence = domWeightsData.reduce((sum, item) => sum + item.confidence * item.weight, 0) / domTotalWeight;
        }

        effectiveWeightsData = domWeightsData;
        dominanceAssessment = { ...rawDominance, appliedMultiplier: multiplier };
      } else {
        // Dominance detected but below minimum confidence — record but do not apply
        dominanceAssessment = { ...rawDominance, appliedMultiplier: undefined };
      }
    } else if (rawDominance) {
      dominanceAssessment = rawDominance;
    }
  }

  // ------------------------------------------------------------------
  // Determine pre-narrative truth/confidence
  // ------------------------------------------------------------------
  const baselineTruth = weightedTruthPercentage;
  const baselineConfidence = effectiveWeightedConfidence;
  const preNarrativeTruth = dominanceAdjustedTruth ?? baselineTruth;
  const preNarrativeConfidence = dominanceAdjustedConfidence != null
    ? (hasIntegrityDowngrade ? Math.min(dominanceAdjustedConfidence, INSUFFICIENT_CONFIDENCE_MAX) : dominanceAdjustedConfidence)
    : baselineConfidence;

  const verdictLabel = percentageToArticleVerdict(
    preNarrativeTruth,
    preNarrativeConfidence,
    undefined,
    mixedConfidenceThreshold,
  );

  // ------------------------------------------------------------------
  // Narrative generation
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

  // ------------------------------------------------------------------
  // Final truth/confidence determination + adjudication path
  // ------------------------------------------------------------------
  let finalTruthPercentage: number;
  let finalConfidence: number;
  let adjudicationPathType: AdjudicationPath["path"];

  if (isCompleteAssessment) {
    // Complete-assessment jobs: narrative CANNOT override truth.
    // Truth is deterministic from the dominance-adjusted (or baseline) aggregate.
    finalTruthPercentage = preNarrativeTruth;
    finalConfidence = preNarrativeConfidence;
    adjudicationPathType = dominanceAdjustedTruth != null ? "dominance_adjusted" : "baseline_only";

    // Confidence ceiling from narrative still applies (structural safeguard)
    const adjConf = verdictNarrative.adjustedConfidence;
    if (typeof adjConf === "number" && Number.isFinite(adjConf)) {
      finalConfidence = Math.min(adjConf, finalConfidence);
      finalConfidence = Math.max(0, Math.min(100, finalConfidence));
    }
  } else {
    // Unresolved-claim jobs: preserve the existing article-level narrative adjustment path.
    finalTruthPercentage = preNarrativeTruth;
    finalConfidence = preNarrativeConfidence;
    adjudicationPathType = dominanceAdjustedTruth != null ? "dominance_adjusted" : "baseline_only";

    const adjTruth = verdictNarrative.adjustedTruthPercentage;
    const adjConf = verdictNarrative.adjustedConfidence;
    if (typeof adjConf === "number" && Number.isFinite(adjConf)) {
      finalConfidence = Math.min(adjConf, preNarrativeConfidence);
      finalConfidence = Math.max(0, Math.min(100, finalConfidence));
    }
    if (typeof adjTruth === "number" && Number.isFinite(adjTruth)) {
      finalTruthPercentage = Math.max(0, Math.min(100, adjTruth));
      adjudicationPathType = "unresolved_claim_narrative_adjustment";
    }
  }

  const adjudicationPath: AdjudicationPath = {
    baselineAggregate: { truthPercentage: Math.round(baselineTruth), confidence: Math.round(baselineConfidence) },
    ...(dominanceAdjustedTruth != null ? {
      dominanceAdjustedAggregate: {
        truthPercentage: Math.round(dominanceAdjustedTruth),
        confidence: Math.round(dominanceAdjustedConfidence ?? baselineConfidence),
      },
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
    // Use the same effective weights that produced the final truth — either
    // baseline or dominance-adjusted — so the range is consistent with the verdict.
    const totalW = effectiveWeightsData.reduce((sum, item) => sum + item.weight, 0);
    if (totalW > 0) {
      let weightedMin = 0;
      let weightedMax = 0;
      for (let i = 0; i < effectiveWeightsData.length; i++) {
        const v = effectiveWeightsData[i];
        const w = effectiveWeightsData[i]?.weight ?? 0;
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
    dominanceAssessment,
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
// CLAIM DOMINANCE ASSESSMENT (v1)
// ============================================================================

const DominanceAssessmentOutputSchema = z.object({
  dominanceMode: z.enum(["none", "single"]),
  dominanceConfidence: z.enum(["low", "medium", "high"]),
  dominantClaimId: z.string().optional(),
  dominanceStrength: z.enum(["strong", "decisive"]).optional(),
  claimRoles: z.array(z.object({
    claimId: z.string(),
    role: z.enum(["supporting", "decisive"]),
  })),
  rationale: z.string(),
});

/**
 * Run the CLAIM_DOMINANCE_ASSESSMENT LLM step to determine whether one claim
 * is semantically decisive for the article-level verdict.
 *
 * Returns undefined on failure (fail-open: no dominance applied).
 */
async function assessClaimDominance(
  claimVerdicts: CBClaimVerdict[],
  claims: { id: string; statement: string; thesisRelevance?: string }[],
  originalInput: string,
  pipelineConfig: PipelineConfig,
  contractValidationSummary?: {
    ran: boolean;
    preservesContract: boolean;
    rePromptRequired: boolean;
    summary: string;
    anchorRetryReason?: string;
    truthConditionAnchor?: {
      presentInInput: boolean;
      anchorText: string;
      preservedInClaimIds: string[];
      validPreservedIds: string[];
    };
  },
): Promise<DominanceAssessment | undefined> {
  // Skip when there is no meaningful dominance choice to make.
  if (claimVerdicts.length < 2) return undefined;

  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_DOMINANCE_ASSESSMENT", {
    originalInput,
    claimVerdicts: JSON.stringify(
      claimVerdicts.map((v) => ({
        claimId: v.claimId,
        truthPercentage: v.truthPercentage,
        verdict: v.verdict,
        confidence: v.confidence,
        confidenceTier: v.confidenceTier,
        reasoning: v.reasoning?.slice(0, 200),
      })),
      null,
      2,
    ),
    atomicClaims: JSON.stringify(
      claims.map((c) => ({ claimId: c.id, statement: c.statement, thesisRelevance: c.thesisRelevance })),
      null,
      2,
    ),
    contractValidationSummary: JSON.stringify(contractValidationSummary ?? null, null, 2),
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
          content: `Assess whether any single claim is semantically decisive for the article-level verdict across ${claimVerdicts.length} claims.`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: DominanceAssessmentOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return undefined;

    const validated = DominanceAssessmentOutputSchema.parse(parsed);
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
    if (validated.dominanceMode === "single" && validated.dominantClaimId) {
      const validClaimIds = new Set(claimVerdicts.map((v) => v.claimId));
      if (!validClaimIds.has(validated.dominantClaimId)) {
        console.warn(`[Stage5] Dominance assessment cited non-existent claim ${validated.dominantClaimId}`);
        return undefined;
      }
    }

    return {
      ...validated,
      dominantClaimId: validated.dominantClaimId ?? undefined,
      dominanceStrength: validated.dominanceStrength ?? undefined,
    };
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
    console.warn("[Stage5] Dominance assessment failed (non-fatal):", err);
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
  // Article-level adjudication: LLM's final judgment on overall truth/confidence,
  // accounting for unresolved direct claims that deterministic aggregation ignores.
  adjustedTruthPercentage: z.number().min(0).max(100).optional(),
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
