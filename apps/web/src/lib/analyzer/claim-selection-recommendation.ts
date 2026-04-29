import { generateText, Output } from "ai";
import { z } from "zod";

import type { PipelineConfig } from "../config-schemas";
import {
  getClaimSelectionCap,
  normalizeClaimSelectionBudgetFitMode,
  normalizeClaimSelectionMinRecommendedClaims,
  type ClaimSelectionBudgetFitMode,
} from "../claim-selection-flow";
import {
  extractStructuredOutput,
  getModelForTask,
  getPromptCachingOptions,
  getStructuredOutputProviderOptions,
} from "./llm";
import { recordLLMCall } from "./metrics-integration";
import { loadAndRenderSection } from "./prompt-loader";
import type {
  AtomicClaim,
  ClaimSelectionRecommendation,
  ClaimSelectionRecommendationAssessment,
} from "./types";

const TRIAGE_LABELS = [
  "fact_check_worthy",
  "fact_non_check_worthy",
  "opinion_or_subjective",
  "unclear",
] as const;

const LEVEL_LABELS = ["high", "medium", "low"] as const;
const BUDGET_TREATMENT_LABELS = [
  "selected",
  "deferred_budget_limited",
  "not_recommended",
] as const;
const MAX_RECOMMENDATION_RATIONALE_CHARS = 160;
const MAX_BATCH_RATIONALE_CHARS = 240;
const MAX_BUDGET_FIT_RATIONALE_CHARS = 240;

const ClaimSelectionRecommendationAssessmentSchema = z.object({
  claimId: z.string(),
  triageLabel: z.enum(TRIAGE_LABELS),
  thesisDirectness: z.enum(LEVEL_LABELS),
  expectedEvidenceYield: z.enum(LEVEL_LABELS),
  coversDistinctRelevantDimension: z.boolean(),
  redundancyWithClaimIds: z.array(z.string()).catch([]),
  recommendationRationale: z.string(),
  budgetTreatment: z.enum(BUDGET_TREATMENT_LABELS).optional(),
  budgetTreatmentRationale: z.string().optional(),
});

export const ClaimSelectionRecommendationOutputSchema = z.object({
  rankedClaimIds: z.array(z.string()),
  recommendedClaimIds: z.array(z.string()),
  deferredClaimIds: z.array(z.string()).optional(),
  budgetFitRationale: z.string().optional(),
  assessments: z.array(ClaimSelectionRecommendationAssessmentSchema),
  rationale: z.string(),
});

class ClaimSelectionRecommendationInvariantError extends Error {}
class ClaimSelectionRecommendationExplicitRefusalError extends Error {}

type ClaimSelectionValidationBudgetFitMode =
  | ClaimSelectionBudgetFitMode
  | "metadata_allowed";

export interface GenerateClaimSelectionRecommendationParams {
  originalInput: string;
  impliedClaim: string;
  articleThesis: string;
  atomicClaims: AtomicClaim[];
  selectionCap?: number | null;
  pipelineConfig?: PipelineConfig;
}

export interface ValidateClaimSelectionRecommendationOptions {
  budgetFitMode?: ClaimSelectionValidationBudgetFitMode;
  minRecommendedClaims?: number | null;
}

function hasUniqueValues(values: string[]): boolean {
  return values.length === new Set(values).size;
}

function requireNonEmptyTrimmed(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ClaimSelectionRecommendationInvariantError(
      `${fieldName} must be non-empty`,
    );
  }
  return trimmed;
}

function normalizeBoundedText(
  value: string,
  fieldName: string,
  maxChars: number,
): string {
  const trimmed = requireNonEmptyTrimmed(value, fieldName);
  return trimmed.length <= maxChars ? trimmed : trimmed.slice(0, maxChars).trimEnd();
}

function assertValidCandidateSet(atomicClaims: AtomicClaim[]): string[] {
  if (atomicClaims.length === 0) {
    throw new Error("Claim selection recommendation requires at least one candidate claim");
  }

  const claimIds = atomicClaims.map((claim) => claim.id?.trim() ?? "");
  if (claimIds.some((claimId) => !claimId)) {
    throw new Error("Claim selection recommendation received a candidate claim with a blank id");
  }
  if (!hasUniqueValues(claimIds)) {
    throw new Error("Claim selection recommendation requires unique candidate claim ids");
  }

  return claimIds;
}

function isExplicitRefusal(result: unknown): boolean {
  const finishReason = (result as Record<string, unknown> | null)?.finishReason;
  return finishReason === "content-filter" || finishReason === "other";
}

function normalizePositiveMs(value: number | null | undefined): number | undefined {
  return Number.isFinite(value) && typeof value === "number"
    ? Math.max(0, Math.trunc(value))
    : undefined;
}

function resolveBudgetFitMode(pipelineConfig: PipelineConfig | undefined): ClaimSelectionBudgetFitMode {
  if (pipelineConfig?.claimSelectionBudgetAwarenessEnabled !== true) {
    return "off";
  }
  return normalizeClaimSelectionBudgetFitMode(pipelineConfig.claimSelectionBudgetFitMode);
}

function resolveBudgetPromptValues(pipelineConfig: PipelineConfig | undefined): {
  budgetAwarenessMode: ClaimSelectionBudgetFitMode;
  budgetResearchTimeBudgetSeconds: string;
  budgetContradictionProtectedTimeSeconds: string;
  budgetMainResearchTimeBudgetSeconds: string;
  budgetMinRecommendedClaims: string;
} {
  const budgetAwarenessMode = resolveBudgetFitMode(pipelineConfig);
  const researchTimeBudgetMs = normalizePositiveMs(pipelineConfig?.researchTimeBudgetMs);
  const contradictionProtectedTimeMs = normalizePositiveMs(pipelineConfig?.contradictionProtectedTimeMs);
  const mainResearchTimeBudgetMs =
    researchTimeBudgetMs === undefined || contradictionProtectedTimeMs === undefined
      ? undefined
      : Math.max(0, researchTimeBudgetMs - contradictionProtectedTimeMs);

  return {
    budgetAwarenessMode,
    budgetResearchTimeBudgetSeconds: budgetAwarenessMode === "off" || researchTimeBudgetMs === undefined
      ? ""
      : String(Math.round(researchTimeBudgetMs / 1000)),
    budgetContradictionProtectedTimeSeconds: budgetAwarenessMode === "off" || contradictionProtectedTimeMs === undefined
      ? ""
      : String(Math.round(contradictionProtectedTimeMs / 1000)),
    budgetMainResearchTimeBudgetSeconds: budgetAwarenessMode === "off" || mainResearchTimeBudgetMs === undefined
      ? ""
      : String(Math.round(mainResearchTimeBudgetMs / 1000)),
    budgetMinRecommendedClaims: String(
      normalizeClaimSelectionMinRecommendedClaims(pipelineConfig?.claimSelectionMinRecommendedClaims),
    ),
  };
}

function validateRecommendationAssessment(
  assessment: ClaimSelectionRecommendationAssessment,
  candidateSet: Set<string>,
): ClaimSelectionRecommendationAssessment {
  const recommendationRationale = normalizeBoundedText(
    assessment.recommendationRationale,
    `assessment ${assessment.claimId} recommendationRationale`,
    MAX_RECOMMENDATION_RATIONALE_CHARS,
  );
  const budgetTreatmentRationale =
    typeof assessment.budgetTreatmentRationale === "string"
      ? normalizeBoundedText(
        assessment.budgetTreatmentRationale,
        `assessment ${assessment.claimId} budgetTreatmentRationale`,
        MAX_RECOMMENDATION_RATIONALE_CHARS,
      )
      : undefined;

  if (assessment.budgetTreatment && !budgetTreatmentRationale) {
    throw new ClaimSelectionRecommendationInvariantError(
      `assessment ${assessment.claimId} budgetTreatment requires budgetTreatmentRationale`,
    );
  }
  if (!assessment.budgetTreatment && budgetTreatmentRationale) {
    throw new ClaimSelectionRecommendationInvariantError(
      `assessment ${assessment.claimId} budgetTreatmentRationale requires budgetTreatment`,
    );
  }

  if (!candidateSet.has(assessment.claimId)) {
    throw new ClaimSelectionRecommendationInvariantError(
      `assessment claimId ${assessment.claimId} is not in the candidate set`,
    );
  }

  if (!hasUniqueValues(assessment.redundancyWithClaimIds)) {
    throw new ClaimSelectionRecommendationInvariantError(
      `assessment ${assessment.claimId} has duplicate redundancyWithClaimIds`,
    );
  }

  for (const redundantClaimId of assessment.redundancyWithClaimIds) {
    if (!candidateSet.has(redundantClaimId)) {
      throw new ClaimSelectionRecommendationInvariantError(
        `assessment ${assessment.claimId} references out-of-set redundancy claim ${redundantClaimId}`,
      );
    }
    if (redundantClaimId === assessment.claimId) {
      throw new ClaimSelectionRecommendationInvariantError(
        `assessment ${assessment.claimId} cannot list itself in redundancyWithClaimIds`,
      );
    }
  }

  return {
    ...assessment,
    recommendationRationale,
    budgetTreatmentRationale,
  };
}

function alignDeferredBudgetTreatments(
  assessments: ClaimSelectionRecommendationAssessment[],
  deferredClaimIdSet: Set<string>,
  budgetFitMode: ClaimSelectionValidationBudgetFitMode,
): ClaimSelectionRecommendationAssessment[] {
  if (budgetFitMode !== "allow_fewer_recommendations" || deferredClaimIdSet.size === 0) {
    return assessments;
  }

  return assessments.map((assessment) => {
    if (!deferredClaimIdSet.has(assessment.claimId)) {
      return assessment;
    }
    if (assessment.budgetTreatment === "deferred_budget_limited") {
      return assessment;
    }
    if (assessment.budgetTreatment && assessment.budgetTreatment !== "not_recommended") {
      return assessment;
    }

    return {
      ...assessment,
      budgetTreatment: "deferred_budget_limited",
      budgetTreatmentRationale:
        assessment.budgetTreatmentRationale ?? assessment.recommendationRationale,
    };
  });
}

export function validateClaimSelectionRecommendation(
  recommendation: ClaimSelectionRecommendation,
  candidateClaimIds: string[],
  selectionCap?: number | null,
  options: ValidateClaimSelectionRecommendationOptions = {},
): ClaimSelectionRecommendation {
  const candidateSet = new Set(candidateClaimIds);
  const maxRecommendedClaims = getClaimSelectionCap(candidateClaimIds.length, selectionCap);
  const budgetFitMode = options.budgetFitMode ?? "metadata_allowed";
  const minRecommendedClaims = normalizeClaimSelectionMinRecommendedClaims(options.minRecommendedClaims);

  if (recommendation.assessments.length !== candidateClaimIds.length) {
    throw new ClaimSelectionRecommendationInvariantError(
      `expected ${candidateClaimIds.length} assessments, got ${recommendation.assessments.length}`,
    );
  }

  const normalizedAssessments = recommendation.assessments.map((assessment) =>
    validateRecommendationAssessment(assessment, candidateSet),
  );
  const assessmentClaimIds = normalizedAssessments.map((assessment) => assessment.claimId);
  if (!hasUniqueValues(assessmentClaimIds)) {
    throw new ClaimSelectionRecommendationInvariantError(
      "assessment claimIds must be unique",
    );
  }
  if (assessmentClaimIds.some((claimId) => !candidateSet.has(claimId)) || assessmentClaimIds.length !== candidateSet.size) {
    throw new ClaimSelectionRecommendationInvariantError(
      "assessment claimIds must cover the full candidate set",
    );
  }

  if (recommendation.rankedClaimIds.length !== candidateClaimIds.length) {
    throw new ClaimSelectionRecommendationInvariantError(
      `expected ${candidateClaimIds.length} rankedClaimIds, got ${recommendation.rankedClaimIds.length}`,
    );
  }
  if (!hasUniqueValues(recommendation.rankedClaimIds)) {
    throw new ClaimSelectionRecommendationInvariantError(
      "rankedClaimIds must be unique",
    );
  }
  if (recommendation.rankedClaimIds.some((claimId) => !candidateSet.has(claimId))) {
    throw new ClaimSelectionRecommendationInvariantError(
      "rankedClaimIds must be a permutation of the candidate set",
    );
  }

  if (!hasUniqueValues(recommendation.recommendedClaimIds)) {
    throw new ClaimSelectionRecommendationInvariantError(
      "recommendedClaimIds must be unique",
    );
  }
  if (recommendation.recommendedClaimIds.length > maxRecommendedClaims) {
    throw new ClaimSelectionRecommendationInvariantError(
      `recommendedClaimIds must contain at most ${maxRecommendedClaims} claims`,
    );
  }

  const rankedOrder = new Map(recommendation.rankedClaimIds.map((claimId, index) => [claimId, index]));
  for (const claimId of recommendation.recommendedClaimIds) {
    if (!rankedOrder.has(claimId)) {
      throw new ClaimSelectionRecommendationInvariantError(
        `recommended claim ${claimId} is not present in rankedClaimIds`,
      );
    }
  }

  const recommendedSet = new Set(recommendation.recommendedClaimIds);
  const deferredClaimIds = Array.isArray(recommendation.deferredClaimIds)
    ? recommendation.deferredClaimIds
    : undefined;
  if (deferredClaimIds) {
    if (!hasUniqueValues(deferredClaimIds)) {
      throw new ClaimSelectionRecommendationInvariantError(
        "deferredClaimIds must be unique",
      );
    }
    for (const claimId of deferredClaimIds) {
      if (!rankedOrder.has(claimId)) {
        throw new ClaimSelectionRecommendationInvariantError(
          `deferred claim ${claimId} is not present in rankedClaimIds`,
        );
      }
      if (recommendedSet.has(claimId)) {
        throw new ClaimSelectionRecommendationInvariantError(
          `deferred claim ${claimId} cannot also be recommended`,
        );
      }
    }
  }

  const deferredClaimIdSet = new Set(deferredClaimIds ?? []);
  const budgetAlignedAssessments = alignDeferredBudgetTreatments(
    normalizedAssessments,
    deferredClaimIdSet,
    budgetFitMode,
  );
  const assessmentByClaimId = new Map(budgetAlignedAssessments.map((assessment) => [assessment.claimId, assessment]));
  for (const assessment of budgetAlignedAssessments) {
    if (assessment.budgetTreatment === "selected" && !recommendedSet.has(assessment.claimId)) {
      throw new ClaimSelectionRecommendationInvariantError(
        `assessment ${assessment.claimId} is budget-selected but is missing from recommendedClaimIds`,
      );
    }
    if (assessment.budgetTreatment === "not_recommended" && recommendedSet.has(assessment.claimId)) {
      throw new ClaimSelectionRecommendationInvariantError(
        `assessment ${assessment.claimId} cannot be not_recommended while present in recommendedClaimIds`,
      );
    }
    if (assessment.budgetTreatment === "deferred_budget_limited" && !deferredClaimIdSet.has(assessment.claimId)) {
      throw new ClaimSelectionRecommendationInvariantError(
        `assessment ${assessment.claimId} is budget-deferred but is missing from deferredClaimIds`,
      );
    }
  }
  for (const claimId of deferredClaimIdSet) {
    const assessment = assessmentByClaimId.get(claimId);
    if (assessment?.budgetTreatment !== "deferred_budget_limited") {
      throw new ClaimSelectionRecommendationInvariantError(
        `deferred claim ${claimId} must have budgetTreatment deferred_budget_limited`,
      );
    }
  }

  const hasBudgetTreatment = budgetAlignedAssessments.some((assessment) => Boolean(assessment.budgetTreatment));
  const hasBudgetMetadata =
    hasBudgetTreatment ||
    deferredClaimIdSet.size > 0 ||
    typeof recommendation.budgetFitRationale === "string";

  if (budgetFitMode === "off" && hasBudgetMetadata) {
    throw new ClaimSelectionRecommendationInvariantError(
      "budget metadata is not allowed when claim-selection budget mode is off",
    );
  }
  if (
    budgetFitMode === "explain_only" &&
    hasBudgetMetadata &&
    recommendation.recommendedClaimIds.length < maxRecommendedClaims
  ) {
    throw new ClaimSelectionRecommendationInvariantError(
      "explain_only budget mode cannot reduce recommendedClaimIds below the recommendation cap",
    );
  }
  if (
    budgetFitMode === "explain_only" &&
    (deferredClaimIdSet.size > 0 || budgetAlignedAssessments.some((assessment) => assessment.budgetTreatment === "deferred_budget_limited"))
  ) {
    throw new ClaimSelectionRecommendationInvariantError(
      "explain_only budget mode cannot return deferred budget claims",
    );
  }
  if (
    budgetFitMode === "allow_fewer_recommendations" &&
    hasBudgetMetadata &&
    recommendation.recommendedClaimIds.length < maxRecommendedClaims &&
    typeof recommendation.budgetFitRationale !== "string"
  ) {
    throw new ClaimSelectionRecommendationInvariantError(
      "budget-aware fewer-than-cap recommendations require budgetFitRationale",
    );
  }
  if (
    budgetFitMode === "allow_fewer_recommendations" &&
    deferredClaimIdSet.size > 0 &&
    typeof recommendation.budgetFitRationale !== "string"
  ) {
    throw new ClaimSelectionRecommendationInvariantError(
      "budget-deferred recommendations require budgetFitRationale",
    );
  }
  if (
    budgetFitMode === "allow_fewer_recommendations" &&
    hasBudgetMetadata &&
    recommendation.recommendedClaimIds.length < minRecommendedClaims
  ) {
    throw new ClaimSelectionRecommendationInvariantError(
      `budget-aware recommendedClaimIds must contain at least ${minRecommendedClaims} claim(s)`,
    );
  }

  const normalizedRecommendedClaimIds = [...recommendation.recommendedClaimIds].sort(
    (left, right) => (rankedOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (rankedOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
  const normalizedDeferredClaimIds = deferredClaimIds
    ? [...deferredClaimIds].sort(
      (left, right) => (rankedOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (rankedOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
    )
    : undefined;

  return {
    rankedClaimIds: [...recommendation.rankedClaimIds],
    recommendedClaimIds: normalizedRecommendedClaimIds,
    ...(normalizedDeferredClaimIds ? { deferredClaimIds: normalizedDeferredClaimIds } : {}),
    ...(typeof recommendation.budgetFitRationale === "string"
      ? {
        budgetFitRationale: normalizeBoundedText(
          recommendation.budgetFitRationale,
          "budgetFitRationale",
          MAX_BUDGET_FIT_RATIONALE_CHARS,
        ),
      }
      : {}),
    assessments: budgetAlignedAssessments,
    rationale: normalizeBoundedText(
      recommendation.rationale,
      "rationale",
      MAX_BATCH_RATIONALE_CHARS,
    ),
  };
}

export async function generateClaimSelectionRecommendation({
  originalInput,
  impliedClaim,
  articleThesis,
  atomicClaims,
  selectionCap,
  pipelineConfig,
}: GenerateClaimSelectionRecommendationParams): Promise<ClaimSelectionRecommendation> {
  const candidateClaimIds = assertValidCandidateSet(atomicClaims);
  const maxRecommendedClaims = getClaimSelectionCap(candidateClaimIds.length, selectionCap);
  const budgetPromptValues = resolveBudgetPromptValues(pipelineConfig);
  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_SELECTION_RECOMMENDATION", {
    analysisInput: originalInput,
    impliedClaim,
    articleThesis,
    atomicClaimsJson: JSON.stringify(atomicClaims, null, 2),
    maxRecommendedClaims: String(maxRecommendedClaims),
    ...budgetPromptValues,
  });

  if (!rendered) {
    throw new Error("Claim selection recommendation prompt section could not be loaded");
  }

  const model = getModelForTask("context_refinement", undefined, pipelineConfig);
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const attemptStartedAt = Date.now();
    let attemptResult: Awaited<ReturnType<typeof generateText>> | undefined;

    try {
      attemptResult = await generateText({
        model: model.model,
        messages: [
          {
            role: "system",
            content: rendered.content,
            providerOptions: getPromptCachingOptions(model.provider),
          },
          {
            role: "user",
            content: `Rank and recommend the strongest claims from ${atomicClaims.length} final candidate claim(s).`,
          },
        ],
        temperature: 0,
        output: Output.object({ schema: ClaimSelectionRecommendationOutputSchema }),
        providerOptions: getStructuredOutputProviderOptions(model.provider),
      });

      const parsed = extractStructuredOutput(attemptResult);
      if (!parsed) {
        if (isExplicitRefusal(attemptResult)) {
          throw new ClaimSelectionRecommendationExplicitRefusalError(
            "Claim selection recommendation was explicitly refused by the model",
          );
        }
        throw new Error("Claim selection recommendation returned no structured output");
      }

      const validated = ClaimSelectionRecommendationOutputSchema.parse(parsed);
      const normalized = validateClaimSelectionRecommendation(
        validated,
        candidateClaimIds,
        selectionCap,
        {
          budgetFitMode: budgetPromptValues.budgetAwarenessMode,
          minRecommendedClaims: pipelineConfig?.claimSelectionMinRecommendedClaims,
        },
      );

      recordLLMCall({
        taskType: "claim_selection",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: attemptResult.usage?.inputTokens ?? 0,
        completionTokens: attemptResult.usage?.outputTokens ?? 0,
        totalTokens: attemptResult.usage?.totalTokens ?? 0,
        durationMs: Date.now() - attemptStartedAt,
        success: true,
        schemaCompliant: true,
        retries: attempt,
        timestamp: new Date(),
      });

      return normalized;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      recordLLMCall({
        taskType: "claim_selection",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: attemptResult?.usage?.inputTokens ?? 0,
        completionTokens: attemptResult?.usage?.outputTokens ?? 0,
        totalTokens: attemptResult?.usage?.totalTokens ?? 0,
        durationMs: Date.now() - attemptStartedAt,
        success: false,
        schemaCompliant: false,
        retries: attempt,
        errorMessage: lastError.message,
        timestamp: new Date(),
      });

      if (lastError instanceof ClaimSelectionRecommendationExplicitRefusalError) {
        break;
      }
    }
  }

  throw lastError ?? new Error("Claim selection recommendation failed");
}
