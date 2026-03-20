import type { CalcConfig, PipelineConfig } from "../config-schemas";
import { extractNormalizedHostname } from "../domain-utils";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getModelForTask,
  extractStructuredOutput,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
  type ModelTask,
} from "./llm";
import { recordLLMCall } from "./metrics-integration";
import { loadAndRenderSection } from "./prompt-loader";
import { percentageToClaimVerdict } from "./truth-scale";
import type {
  AnalysisWarning,
  AnalysisWarningType,
  CBClaimVerdict,
  EvidenceItem,
  FetchedSource,
  SourceReliabilityCalibrationMetadata,
  SourceReliabilityCalibrationMode,
  SourceReliabilityCalibrationPortfolioSummary,
  SourceReliabilityCalibrationSourceSummary,
} from "./types";
import { assertValidTruthPercentage } from "./types";
import { confidenceToTier } from "./verdict-stage";

type CalibrationSide = "supports" | "contradicts";

type CalibrationSettings = NonNullable<CalcConfig["sourceReliabilityCalibration"]>;

const PROBATIVE_RANK: Record<NonNullable<EvidenceItem["probativeValue"]>, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export interface SourceReliabilityCalibrationClaimInput {
  claimId: string;
  rawTruthPercentage: number;
  rawConfidence: number;
  supportPortfolio: SourceReliabilityCalibrationPortfolioSummary;
  contradictionPortfolio: SourceReliabilityCalibrationPortfolioSummary;
}

export interface SourceReliabilityCalibrationBatchInput {
  mode: SourceReliabilityCalibrationMode;
  strength: NonNullable<PipelineConfig["sourceReliabilityCalibrationStrength"]>;
  targetMaxInputTokens: number;
  claims: SourceReliabilityCalibrationClaimInput[];
}

export interface SourceReliabilityCalibrationClaimResult {
  claimId: string;
  truthDelta?: number;
  confidenceDelta?: number;
  warningTypes?: AnalysisWarningType[];
  notes?: string[];
}

export interface SourceReliabilityCalibrationRunResult {
  verdicts: CBClaimVerdict[];
  request: SourceReliabilityCalibrationBatchInput;
  warnings: AnalysisWarning[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function truncateText(value: string | undefined, maxChars: number): string | undefined {
  if (!value) return undefined;
  return value.length <= maxChars ? value : value.slice(0, maxChars);
}

function getProbativeRank(value: EvidenceItem["probativeValue"] | undefined): number {
  if (!value) return 0;
  return PROBATIVE_RANK[value];
}

function createEmptyPortfolio(): SourceReliabilityCalibrationPortfolioSummary {
  return {
    totalEvidenceItems: 0,
    selectedSourceCount: 0,
    knownSourceCount: 0,
    unknownSourceCount: 0,
    unknownShare: 0,
    topSources: [],
  };
}

function getCalibrationSettings(calcConfig: CalcConfig): CalibrationSettings {
  return calcConfig.sourceReliabilityCalibration ?? {
    truthDeltaMax: 5,
    confidenceDeltaMax: 15,
    maxSourcesPerSide: 5,
    reasoningMaxChars: 100,
    targetMaxInputTokens: 2000,
    minKnownSourcesPerSide: 1,
    unknownDominanceThreshold: 0.75,
  };
}

function buildPortfolioSummary(
  evidenceIds: string[],
  evidenceItemsById: Map<string, EvidenceItem>,
  sourcesById: Map<string, FetchedSource>,
  side: CalibrationSide,
  settings: CalibrationSettings,
): SourceReliabilityCalibrationPortfolioSummary {
  if (evidenceIds.length === 0) return createEmptyPortfolio();

  const grouped = new Map<string, SourceReliabilityCalibrationSourceSummary>();
  let resolvedEvidenceCount = 0;

  for (const evidenceId of evidenceIds) {
    const evidence = evidenceItemsById.get(evidenceId);
    if (!evidence) continue;
    resolvedEvidenceCount += 1;

    const source = sourcesById.get(evidence.sourceId);
    const existing = grouped.get(evidence.sourceId);
    const domain = source?.url ? extractNormalizedHostname(source.url) : extractNormalizedHostname(evidence.sourceUrl);
    // TODO: populate reasoningShort once richer SR evaluation details are threaded into runtime source data.
    const reasoningShort = truncateText(undefined, settings.reasoningMaxChars);

    if (!existing) {
      grouped.set(evidence.sourceId, {
        sourceId: evidence.sourceId,
        domain,
        sourceType: evidence.sourceType,
        probativeValue: evidence.probativeValue,
        claimDirection: side,
        evidenceCount: 1,
        evidenceIds: [evidence.id],
        trackRecordScore: source?.trackRecordScore ?? null,
        trackRecordConfidence: source?.trackRecordConfidence ?? null,
        trackRecordConsensus: source?.trackRecordConsensus ?? null,
        reasoningShort,
        category: source?.category ?? null,
        biasIndicator: null,
        identifiedEntity: null,
      });
      continue;
    }

    existing.evidenceCount += 1;
    existing.evidenceIds.push(evidence.id);
    if (getProbativeRank(evidence.probativeValue) > getProbativeRank(existing.probativeValue)) {
      existing.probativeValue = evidence.probativeValue;
    }
    if (!existing.sourceType && evidence.sourceType) {
      existing.sourceType = evidence.sourceType;
    }
  }

  const selected = [...grouped.values()]
    .sort((left, right) => {
      const probativeDelta = getProbativeRank(right.probativeValue) - getProbativeRank(left.probativeValue);
      if (probativeDelta !== 0) return probativeDelta;
      const evidenceDelta = right.evidenceCount - left.evidenceCount;
      if (evidenceDelta !== 0) return evidenceDelta;
      return left.sourceId.localeCompare(right.sourceId);
    })
    .slice(0, settings.maxSourcesPerSide);

  const knownSourceCount = selected.filter((source) => source.trackRecordScore !== null).length;
  const unknownSourceCount = selected.length - knownSourceCount;

  return {
    totalEvidenceItems: resolvedEvidenceCount,
    selectedSourceCount: selected.length,
    knownSourceCount,
    unknownSourceCount,
    unknownShare: selected.length === 0 ? 0 : unknownSourceCount / selected.length,
    topSources: selected,
  };
}

export function buildSourceReliabilityCalibrationInput(
  verdicts: CBClaimVerdict[],
  evidenceItems: EvidenceItem[],
  sources: FetchedSource[],
  calcConfig: CalcConfig,
  pipelineConfig: PipelineConfig,
): SourceReliabilityCalibrationBatchInput {
  const settings = getCalibrationSettings(calcConfig);
  const evidenceItemsById = new Map(evidenceItems.map((item) => [item.id, item]));
  const sourcesById = new Map(sources.map((source) => [source.id, source]));

  return {
    mode: pipelineConfig.sourceReliabilityCalibrationMode ?? "off",
    strength: pipelineConfig.sourceReliabilityCalibrationStrength ?? "budget",
    targetMaxInputTokens: settings.targetMaxInputTokens,
    claims: verdicts.map((verdict) => ({
      claimId: verdict.claimId,
      rawTruthPercentage: verdict.truthPercentage,
      rawConfidence: verdict.confidence,
      supportPortfolio: buildPortfolioSummary(
        verdict.supportingEvidenceIds,
        evidenceItemsById,
        sourcesById,
        "supports",
        settings,
      ),
      contradictionPortfolio: buildPortfolioSummary(
        verdict.contradictingEvidenceIds,
        evidenceItemsById,
        sourcesById,
        "contradicts",
        settings,
      ),
    })),
  };
}

function createWarning(type: AnalysisWarningType, claimId: string, message: string): AnalysisWarning {
  return {
    type,
    severity: "info",
    message,
    details: { claimId },
  };
}

function pushWarningOnce(
  warnings: AnalysisWarning[],
  type: AnalysisWarningType,
  claimId: string,
  message: string,
): void {
  const exists = warnings.some(
    (warning) => warning.type === type && warning.details?.claimId === claimId,
  );
  if (!exists) {
    warnings.push(createWarning(type, claimId, message));
  }
}

function createMetadata(
  verdict: CBClaimVerdict,
  claimInput: SourceReliabilityCalibrationClaimInput | undefined,
  mode: SourceReliabilityCalibrationMode,
  llmStatus: SourceReliabilityCalibrationMetadata["llmStatus"],
  applied: boolean,
  rawTruthDelta: number,
  rawConfidenceDelta: number,
  truthDelta: number,
  confidenceDelta: number,
  notes?: string[],
): SourceReliabilityCalibrationMetadata {
  return {
    mode,
    applied,
    llmStatus,
    rawTruthPercentage: verdict.truthPercentage,
    rawConfidence: verdict.confidence,
    rawTruthDelta,
    rawConfidenceDelta,
    truthDelta,
    confidenceDelta,
    supportPortfolio: claimInput?.supportPortfolio ?? createEmptyPortfolio(),
    contradictionPortfolio: claimInput?.contradictionPortfolio ?? createEmptyPortfolio(),
    notes,
  };
}

// ============================================================================
// LLM CALL — Stage 4.5 prompt-backed calibration
// ============================================================================

const SRCalibrationOutputSchema = z.object({
  claims: z.array(z.object({
    claimId: z.string(),
    confidenceDelta: z.number().int(),
    concerns: z.array(z.string()).catch([]),
    reasoning: z.string().catch(""),
  })),
});

const CONCERN_TO_WARNING_TYPE: Record<string, AnalysisWarningType> = {
  support_reliability_concern: "source_reliability_support_concern",
  contradiction_reliability_concern: "source_reliability_contradiction_concern",
  unknown_dominance: "source_reliability_unknown_dominance",
};

function strengthToModelTask(
  strength: NonNullable<PipelineConfig["sourceReliabilityCalibrationStrength"]>,
): ModelTask {
  if (strength === "standard") return "context_refinement";
  if (strength === "premium") return "verdict";
  return "extract_evidence"; // budget
}

function serializePortfolio(portfolio: SourceReliabilityCalibrationPortfolioSummary) {
  return {
    sources: portfolio.selectedSourceCount,
    known: portfolio.knownSourceCount,
    unknown: portfolio.unknownSourceCount,
    unknownShare: Math.round(portfolio.unknownShare * 100) / 100,
    top: portfolio.topSources.map((source) => ({
      domain: source.domain,
      type: source.sourceType ?? null,
      score: source.trackRecordScore,
      items: source.evidenceCount,
    })),
  };
}

function serializeClaimsForPrompt(
  request: SourceReliabilityCalibrationBatchInput,
): string {
  const claims = request.claims.map((claim) => ({
    claimId: claim.claimId,
    rawTruth: claim.rawTruthPercentage,
    rawConfidence: claim.rawConfidence,
    support: serializePortfolio(claim.supportPortfolio),
    contradict: serializePortfolio(claim.contradictionPortfolio),
  }));
  return JSON.stringify({ claims }, null, 2);
}

/**
 * Call the LLM to calibrate verdict confidence based on source reliability portfolios.
 * Returns undefined on any failure (prompt load, LLM call, schema validation) —
 * the caller treats undefined as a graceful no-op.
 */
export async function callSRCalibrationLLM(
  request: SourceReliabilityCalibrationBatchInput,
  calcConfig: CalcConfig,
  pipelineConfig: PipelineConfig,
): Promise<SourceReliabilityCalibrationClaimResult[] | undefined> {
  if (request.claims.length === 0) return undefined;

  const settings = getCalibrationSettings(calcConfig);
  const task = strengthToModelTask(request.strength);
  const model = getModelForTask(task, undefined, pipelineConfig);
  const expectedClaimIds = new Set(request.claims.map((c) => c.claimId));
  const llmCallStartedAt = Date.now();

  try {
    const rendered = await loadAndRenderSection("claimboundary", "SR_CALIBRATION", {
      claimsJson: serializeClaimsForPrompt(request),
      maxConfidenceDelta: String(settings.confidenceDeltaMax),
      unknownDominanceThreshold: String(settings.unknownDominanceThreshold),
      reasoningMaxChars: String(settings.reasoningMaxChars),
    });

    if (!rendered) {
      recordLLMCall({
        taskType: "other",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Stage 4.5 SR calibration prompt section could not be loaded",
        timestamp: new Date(),
      });
      return undefined;
    }

    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Calibrate verdict confidence for ${request.claims.length} claim(s) based on source reliability portfolios.`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: SRCalibrationOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      recordLLMCall({
        taskType: "other",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Stage 4.5 SR calibration returned no structured output",
        timestamp: new Date(),
      });
      return undefined;
    }

    const validated = SRCalibrationOutputSchema.parse(parsed);

    // Enforce batch contract: LLM must return exactly the requested claimIds
    const returnedClaimIds = new Set(validated.claims.map((c) => c.claimId));
    const contractViolation =
      returnedClaimIds.size !== expectedClaimIds.size ||
      [...expectedClaimIds].some((id) => !returnedClaimIds.has(id));

    if (contractViolation) {
      recordLLMCall({
        taskType: "other",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: `Stage 4.5 SR calibration batch contract violated: expected ${expectedClaimIds.size} claims [${[...expectedClaimIds].join(",")}], got ${returnedClaimIds.size} [${[...returnedClaimIds].join(",")}]`,
        timestamp: new Date(),
      });
      return undefined;
    }

    recordLLMCall({
      taskType: "other",
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

    return validated.claims.map((claim) => ({
      claimId: claim.claimId,
      confidenceDelta: claim.confidenceDelta,
      warningTypes: (claim.concerns ?? [])
        .map((concern) => CONCERN_TO_WARNING_TYPE[concern])
        .filter((type): type is AnalysisWarningType => type !== undefined),
      notes: claim.reasoning ? [claim.reasoning] : undefined,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    recordLLMCall({
      taskType: "other",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage: `Stage 4.5 SR calibration failed: ${errorMessage}`,
      timestamp: new Date(),
    });
    return undefined;
  }
}

// ============================================================================
// RESULT APPLICATION — deterministic plumbing (sync)
// ============================================================================

export function applySourceReliabilityCalibrationResults(
  verdicts: CBClaimVerdict[],
  request: SourceReliabilityCalibrationBatchInput,
  calcConfig: CalcConfig,
  results: SourceReliabilityCalibrationClaimResult[] | undefined,
): SourceReliabilityCalibrationRunResult {
  const settings = getCalibrationSettings(calcConfig);
  const requestByClaimId = new Map(request.claims.map((claim) => [claim.claimId, claim]));
  const resultByClaimId = new Map((results ?? []).map((result) => [result.claimId, result]));
  const warnings: AnalysisWarning[] = [];

  for (const claim of request.claims) {
    const supportNeedsWarning =
      claim.supportPortfolio.selectedSourceCount > 0 &&
      claim.supportPortfolio.unknownShare >= settings.unknownDominanceThreshold &&
      claim.supportPortfolio.knownSourceCount < settings.minKnownSourcesPerSide;
    const contradictionNeedsWarning =
      claim.contradictionPortfolio.selectedSourceCount > 0 &&
      claim.contradictionPortfolio.unknownShare >= settings.unknownDominanceThreshold &&
      claim.contradictionPortfolio.knownSourceCount < settings.minKnownSourcesPerSide;

    if (supportNeedsWarning || contradictionNeedsWarning) {
      pushWarningOnce(
        warnings,
          "source_reliability_unknown_dominance",
        claim.claimId,
        "Unknown or unrated sources dominate the selected source portfolio.",
      );
    }
  }

  const nextVerdicts = verdicts.map((verdict) => {
    const claimInput = requestByClaimId.get(verdict.claimId);
    const result = resultByClaimId.get(verdict.claimId);

    if (!result) {
      return {
        ...verdict,
        sourceReliabilityCalibration: createMetadata(
          verdict,
          claimInput,
          request.mode,
          results ? "no_result" : "not_requested",
          false,
          0,
          0,
          0,
          0,
        ),
      };
    }

    const rawTruthDelta = Math.round(result.truthDelta ?? 0);
    const rawConfidenceDelta = Math.round(result.confidenceDelta ?? 0);

    const boundedTruthDelta = request.mode === "confidence_only"
      ? 0
      : clamp(rawTruthDelta, -settings.truthDeltaMax, settings.truthDeltaMax);
    const boundedConfidenceDelta = clamp(
      rawConfidenceDelta,
      -settings.confidenceDeltaMax,
      settings.confidenceDeltaMax,
    );

    const calibratedTruth = assertValidTruthPercentage(
      clamp(verdict.truthPercentage + boundedTruthDelta, 0, 100),
      "SR-calibrated truth",
    );
    const calibratedConfidence = clamp(verdict.confidence + boundedConfidenceDelta, 0, 100);

    if (result.warningTypes?.includes("source_reliability_support_concern")) {
      pushWarningOnce(warnings, "source_reliability_support_concern", verdict.claimId, "Supporting-source portfolio shows a reliability concern.");
    }
    if (result.warningTypes?.includes("source_reliability_contradiction_concern")) {
      pushWarningOnce(warnings, "source_reliability_contradiction_concern", verdict.claimId, "Contradicting-source portfolio shows a reliability concern.");
    }
    if (result.warningTypes?.includes("source_reliability_unknown_dominance")) {
      pushWarningOnce(warnings, "source_reliability_unknown_dominance", verdict.claimId, "Unknown or unrated sources dominate the selected source portfolio.");
    }

    return {
      ...verdict,
      truthPercentage: calibratedTruth,
      confidence: calibratedConfidence,
      verdict: percentageToClaimVerdict(calibratedTruth, calibratedConfidence),
      confidenceTier: confidenceToTier(calibratedConfidence),
      sourceReliabilityCalibration: createMetadata(
        verdict,
        claimInput,
        request.mode,
        "applied",
        boundedTruthDelta !== 0 || boundedConfidenceDelta !== 0,
        rawTruthDelta,
        rawConfidenceDelta,
        boundedTruthDelta,
        boundedConfidenceDelta,
        result.notes,
      ),
    };
  });

  return { verdicts: nextVerdicts, request, warnings };
}

export function calibrateVerdictsWithSourceReliability(
  verdicts: CBClaimVerdict[],
  evidenceItems: EvidenceItem[],
  sources: FetchedSource[],
  calcConfig: CalcConfig,
  pipelineConfig: PipelineConfig,
  results?: SourceReliabilityCalibrationClaimResult[],
): SourceReliabilityCalibrationRunResult {
  const request = buildSourceReliabilityCalibrationInput(
    verdicts,
    evidenceItems,
    sources,
    calcConfig,
    pipelineConfig,
  );
  const applied = applySourceReliabilityCalibrationResults(verdicts, request, calcConfig, results);

  if (!results) {
    return {
      ...applied,
      warnings: [
        ...applied.warnings,
        {
          type: "source_reliability_calibration_skipped",
          severity: "info",
          message: "Source-reliability calibration is enabled but no calibration result is available yet. Legacy SR weighting is intentionally skipped while Stage 4.5 is enabled.",
          details: { mode: request.mode },
        },
      ],
    };
  }

  return applied;
}
