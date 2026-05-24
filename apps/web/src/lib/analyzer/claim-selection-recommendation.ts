import { generateText, Output } from "ai";
import { z } from "zod";
import type { PipelineConfig } from "../config-schemas";
import type {
  AtomicClaim,
  ClaimSelectionLevelLabel,
  ClaimSelectionRecommendation,
  ClaimSelectionRecommendationAssessment,
  ClaimSelectionTriageLabel,
} from "./types";
import {
  extractStructuredOutput,
  getModelForTask,
  getPromptCachingOptions,
  getStructuredOutputProviderOptions,
} from "./llm";
import { recordLLMCall } from "./metrics-integration";
import { loadAndRenderSection } from "./prompt-loader";

export const CLAIM_AUTO_SELECTION_DEFAULT_CAP = 5;
export const CLAIM_AUTO_SELECTION_MAX = 5;
export const CLAIM_AUTO_SELECTION_DEFAULT_CANDIDATE_CAP = 25;
export const CLAIM_AUTO_SELECTION_MAX_CANDIDATES = 25;

const TRIAGE_LABELS = [
  "fact_check_worthy",
  "fact_non_check_worthy",
  "opinion_or_subjective",
  "unclear",
] as const satisfies readonly ClaimSelectionTriageLabel[];

const LEVEL_LABELS = ["high", "medium", "low"] as const satisfies readonly ClaimSelectionLevelLabel[];

const ClaimSelectionAssessmentSchema = z.object({
  claimId: z.string().min(1),
  triageLabel: z.enum(TRIAGE_LABELS),
  thesisDirectness: z.enum(LEVEL_LABELS),
  expectedEvidenceYield: z.enum(LEVEL_LABELS),
  coversDistinctRelevantDimension: z.enum(LEVEL_LABELS),
  redundancyWithClaimIds: z.array(z.string()).default([]),
  recommendationRationale: z.string().min(1).max(160),
}).strict();

const ClaimSelectionRecommendationSchema = z.object({
  rankedClaimIds: z.array(z.string()).min(0).max(CLAIM_AUTO_SELECTION_MAX_CANDIDATES),
  recommendedClaimIds: z.array(z.string()).min(0).max(CLAIM_AUTO_SELECTION_MAX),
  assessments: z.array(ClaimSelectionAssessmentSchema).min(0).max(CLAIM_AUTO_SELECTION_MAX_CANDIDATES),
  rationale: z.string().min(1).max(240),
}).strict();

export class ClaimSelectionRecommendationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimSelectionRecommendationError";
  }
}

export class ClaimSelectionRecommendationExplicitRefusalError extends ClaimSelectionRecommendationError {
  constructor(message: string) {
    super(message);
    this.name = "ClaimSelectionRecommendationExplicitRefusalError";
  }
}

export function normalizeClaimAutoSelectionCap(raw: unknown): number {
  const numeric = typeof raw === "number" && Number.isFinite(raw) ? Math.trunc(raw) : CLAIM_AUTO_SELECTION_DEFAULT_CAP;
  return Math.max(1, Math.min(CLAIM_AUTO_SELECTION_MAX, numeric));
}

export function normalizeClaimAutoSelectionCandidateCap(raw: unknown): number {
  const numeric = typeof raw === "number" && Number.isFinite(raw)
    ? Math.trunc(raw)
    : CLAIM_AUTO_SELECTION_DEFAULT_CANDIDATE_CAP;
  return Math.max(1, Math.min(CLAIM_AUTO_SELECTION_MAX_CANDIDATES, numeric));
}

export function getClaimAutoSelectionCap(candidateCount: number, rawCap: unknown): number {
  return Math.min(candidateCount, normalizeClaimAutoSelectionCap(rawCap));
}

export function buildClaimSelectionPromptClaims(atomicClaims: AtomicClaim[]): Array<Omit<AtomicClaim, "checkWorthiness">> {
  return atomicClaims.map((claim) => {
    const { checkWorthiness: _checkWorthiness, ...promptClaim } = claim;
    return promptClaim;
  });
}

function toUniqueSet(values: string[], fieldName: string): Set<string> {
  const set = new Set(values);
  if (set.size !== values.length) {
    throw new ClaimSelectionRecommendationError(`${fieldName} must not contain duplicate claim IDs`);
  }
  return set;
}

function assertSameIdSet(actual: string[], expected: string[], fieldName: string): void {
  const expectedSet = new Set(expected);
  const actualSet = toUniqueSet(actual, fieldName);
  if (actualSet.size !== expectedSet.size) {
    throw new ClaimSelectionRecommendationError(`${fieldName} must cover every evaluated candidate exactly once`);
  }
  for (const id of expectedSet) {
    if (!actualSet.has(id)) {
      throw new ClaimSelectionRecommendationError(`${fieldName} is missing evaluated candidate ${id}`);
    }
  }
  for (const id of actualSet) {
    if (!expectedSet.has(id)) {
      throw new ClaimSelectionRecommendationError(`${fieldName} contains unknown claim ID ${id}`);
    }
  }
}

function assertSelectedOrder(selectedIds: string[], rankedIds: string[]): void {
  let previousIndex = -1;
  for (const id of selectedIds) {
    const index = rankedIds.indexOf(id);
    if (index === -1) {
      throw new ClaimSelectionRecommendationError(`recommendedClaimIds contains claim ID ${id} outside rankedClaimIds`);
    }
    if (index <= previousIndex) {
      throw new ClaimSelectionRecommendationError("recommendedClaimIds must preserve rankedClaimIds order");
    }
    previousIndex = index;
  }
}

export function validateClaimSelectionRecommendation(
  raw: unknown,
  atomicClaims: AtomicClaim[],
  selectionCap: number,
): ClaimSelectionRecommendation {
  const parsed = ClaimSelectionRecommendationSchema.parse(raw);
  const candidateIds = atomicClaims.map((claim) => claim.id);
  const candidateSet = toUniqueSet(candidateIds, "atomicClaims");
  const normalizedSelectionCap = getClaimAutoSelectionCap(candidateIds.length, selectionCap);

  assertSameIdSet(parsed.rankedClaimIds, candidateIds, "rankedClaimIds");

  if (parsed.recommendedClaimIds.length > normalizedSelectionCap) {
    throw new ClaimSelectionRecommendationError(
      `recommendedClaimIds exceeds selection cap ${normalizedSelectionCap}`,
    );
  }
  toUniqueSet(parsed.recommendedClaimIds, "recommendedClaimIds");
  for (const id of parsed.recommendedClaimIds) {
    if (!candidateSet.has(id)) {
      throw new ClaimSelectionRecommendationError(`recommendedClaimIds contains unknown claim ID ${id}`);
    }
  }
  assertSelectedOrder(parsed.recommendedClaimIds, parsed.rankedClaimIds);

  const assessmentIds = parsed.assessments.map((assessment) => assessment.claimId);
  assertSameIdSet(assessmentIds, candidateIds, "assessments");
  for (const assessment of parsed.assessments) {
    const rationale = assessment.recommendationRationale.trim();
    if (!rationale) {
      throw new ClaimSelectionRecommendationError(`assessment ${assessment.claimId} has an empty rationale`);
    }
    if (rationale.length > 160) {
      throw new ClaimSelectionRecommendationError(`assessment ${assessment.claimId} rationale exceeds 160 chars`);
    }
    for (const redundantId of assessment.redundancyWithClaimIds) {
      if (!candidateSet.has(redundantId)) {
        throw new ClaimSelectionRecommendationError(
          `assessment ${assessment.claimId} references unknown redundant claim ID ${redundantId}`,
        );
      }
      if (redundantId === assessment.claimId) {
        throw new ClaimSelectionRecommendationError(
          `assessment ${assessment.claimId} must not list itself as redundant`,
        );
      }
    }
  }

  const rationale = parsed.rationale.trim();
  if (!rationale) {
    throw new ClaimSelectionRecommendationError("rationale must not be empty");
  }
  if (rationale.length > 240) {
    throw new ClaimSelectionRecommendationError("rationale exceeds 240 chars");
  }

  return {
    rankedClaimIds: parsed.rankedClaimIds,
    recommendedClaimIds: parsed.recommendedClaimIds,
    assessments: parsed.assessments.map((assessment): ClaimSelectionRecommendationAssessment => ({
      ...assessment,
      recommendationRationale: assessment.recommendationRationale.trim(),
      redundancyWithClaimIds: [...new Set(assessment.redundancyWithClaimIds)],
    })),
    rationale,
  };
}

function getFinishReason(result: unknown): string | null {
  const resultObj = result as {
    finishReason?: unknown;
    response?: { finishReason?: unknown };
    finish_reason?: unknown;
  };
  const reason = resultObj?.finishReason ?? resultObj?.response?.finishReason ?? resultObj?.finish_reason;
  return typeof reason === "string" ? reason : null;
}

function isExplicitRefusalOrSafetyBlock(result: unknown): boolean {
  const reason = getFinishReason(result)?.toLowerCase();
  return reason === "content-filter" || reason === "safety";
}

function recordClaimSelectionCall(args: {
  model: { provider: string; modelName: string };
  result?: any;
  startedAt: number;
  success: boolean;
  schemaCompliant: boolean;
  retries: number;
  error?: unknown;
}): void {
  const errorMessage = args.error instanceof Error
    ? args.error.message
    : args.error === undefined
      ? undefined
      : String(args.error);
  recordLLMCall({
    taskType: "claim_selection",
    provider: args.model.provider,
    modelName: args.model.modelName,
    promptTokens: args.result?.usage?.inputTokens ?? 0,
    completionTokens: args.result?.usage?.outputTokens ?? 0,
    totalTokens: args.result?.usage?.totalTokens ?? 0,
    durationMs: Date.now() - args.startedAt,
    success: args.success,
    schemaCompliant: args.schemaCompliant,
    retries: args.retries,
    errorMessage,
    errorType: args.error instanceof Error ? args.error.name : undefined,
    timestamp: new Date(),
  });
}

export async function generateClaimSelectionRecommendation(args: {
  originalInput: string;
  impliedClaim: string;
  articleThesis: string;
  atomicClaims: AtomicClaim[];
  selectionCap: number;
  pipelineConfig: PipelineConfig;
}): Promise<ClaimSelectionRecommendation> {
  const candidateCount = args.atomicClaims.length;
  const selectionCap = getClaimAutoSelectionCap(candidateCount, args.selectionCap);
  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_SELECTION_RECOMMENDATION", {
    originalInput: args.originalInput,
    impliedClaim: args.impliedClaim,
    articleThesis: args.articleThesis,
    maxRecommendedClaims: String(selectionCap),
    atomicClaimsJson: JSON.stringify(buildClaimSelectionPromptClaims(args.atomicClaims), null, 2),
  });

  if (!rendered) {
    throw new ClaimSelectionRecommendationError("Stage 1.5: Failed to load CLAIM_SELECTION_RECOMMENDATION prompt section");
  }

  const model = getModelForTask("context_refinement", undefined, args.pipelineConfig);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const startedAt = Date.now();
    let result: Awaited<ReturnType<typeof generateText>> | undefined;
    try {
      result = await generateText({
        model: model.model,
        messages: [
          {
            role: "system",
            content: rendered.content,
            providerOptions: getPromptCachingOptions(model.provider),
          },
          {
            role: "user",
            content: `Select up to ${selectionCap} check-worthy atomic claims from ${candidateCount} evaluated candidates.`,
          },
        ],
        temperature: 0,
        output: Output.object({ schema: ClaimSelectionRecommendationSchema }),
        providerOptions: getStructuredOutputProviderOptions(model.provider),
      });

      if (isExplicitRefusalOrSafetyBlock(result)) {
        throw new ClaimSelectionRecommendationExplicitRefusalError(
          `Stage 1.5: LLM safety/refusal finish reason: ${getFinishReason(result)}`,
        );
      }

      const structured = extractStructuredOutput(result);
      if (!structured) {
        throw new ClaimSelectionRecommendationError("Stage 1.5: LLM returned no structured claim-selection output");
      }

      const validated = validateClaimSelectionRecommendation(structured, args.atomicClaims, selectionCap);
      recordClaimSelectionCall({
        model,
        result,
        startedAt,
        success: true,
        schemaCompliant: true,
        retries: attempt,
      });
      return validated;
    } catch (error) {
      lastError = error;
      recordClaimSelectionCall({
        model,
        result,
        startedAt,
        success: false,
        schemaCompliant: false,
        retries: attempt,
        error,
      });
      if (error instanceof ClaimSelectionRecommendationExplicitRefusalError) {
        throw error;
      }
      if (attempt === 1) {
        break;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new ClaimSelectionRecommendationError("Stage 1.5: Claim selection failed");
}
