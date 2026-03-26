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
  const probativeValueWeights = calcConfig.probativeValueWeights ?? {
    high: 1.0,
    medium: 0.9,
    low: 0.5,
  };
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));

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
  const verdictLabel = percentageToArticleVerdict(
    weightedTruthPercentage,
    effectiveWeightedConfidence,
    undefined,
    mixedConfidenceThreshold,
  );

  let verdictNarrative: VerdictNarrative;
  try {
    state.onEvent?.(`LLM call: verdict narrative — ${getModelForTask("verdict", undefined, pipelineConfig).modelName}`, -1);
    verdictNarrative = await generateVerdictNarrative(
      weightedTruthPercentage,
      verdictLabel,
      weightedConfidence,
      claimVerdicts,
      boundaries,
      coverageMatrix,
      evidence,
      pipelineConfig,
    );
    state.llmCalls++;
  } catch (err) {
    console.warn("[Stage5] VerdictNarrative generation failed, using fallback:", err);
    verdictNarrative = {
      headline: `Analysis yields ${verdictLabel} verdict at ${Math.round(weightedConfidence)}% confidence`,
      evidenceBaseSummary: `${evidence.length} evidence items from ${state.sources.length} sources across ${boundaries.length} perspective${boundaries.length !== 1 ? "s" : ""}`,
      keyFinding: `Weighted analysis of ${claimVerdicts.length} claims produces an overall truth assessment of ${Math.round(weightedTruthPercentage)}%.`,
      limitations: "Automated analysis with limitations inherent to evidence availability and source coverage.",
    };
  }

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

  return {
    truthPercentage: Math.round(weightedTruthPercentage * 10) / 10,
    verdict: verdictLabel,
    confidence: Math.round(effectiveWeightedConfidence * 10) / 10,
    verdictNarrative,
    hasMultipleBoundaries: boundaries.length > 1,
    claimBoundaries: boundaries,
    claimVerdicts,
    coverageMatrix,
    qualityGates,
    truthPercentageRange: overallRange,
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

const VerdictNarrativeOutputSchema = z.object({
  headline: z.string(),
  evidenceBaseSummary: z.string(),
  keyFinding: z.string(),
  boundaryDisagreements: z.array(z.string()).optional(),
  limitations: z.string(),
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
): Promise<VerdictNarrative> {
  const currentDate = new Date().toISOString().split("T")[0];

  const rendered = await loadAndRenderSection("claimboundary", "VERDICT_NARRATIVE", {
    currentDate,
    overallVerdict: JSON.stringify({
      truthPercentage: Math.round(truthPercentage),
      verdict,
      confidence: Math.round(confidence),
    }),
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

export async function evaluateExplanationRubric(
  narrative: VerdictNarrative,
  claimCount: number,
  evidenceCount: number,
  llmCall: LLMCallFn,
): Promise<ExplanationRubricScores> {
  const result = await llmCall("EXPLANATION_QUALITY_RUBRIC", {
    headline: narrative.headline,
    evidenceBaseSummary: narrative.evidenceBaseSummary,
    keyFinding: narrative.keyFinding,
    limitations: narrative.limitations,
    boundaryDisagreements: narrative.boundaryDisagreements ?? [],
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
