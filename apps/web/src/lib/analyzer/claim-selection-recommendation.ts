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
export const CLAIM_AUTO_SELECTION_DEFAULT_CANDIDATE_CAP = 12;
export const CLAIM_AUTO_SELECTION_MAX_CANDIDATES = 25;
const ASSESSMENT_RATIONALE_DISPLAY_MAX = 600;
const OVERALL_RATIONALE_DISPLAY_MAX = 240;
const DIAGNOSTIC_PREVIEW_MAX = 300;

const TRIAGE_LABELS = [
  "fact_check_worthy",
  "fact_non_check_worthy",
  "opinion_or_subjective",
  "unclear",
] as const satisfies readonly ClaimSelectionTriageLabel[];

const LEVEL_LABELS = ["high", "medium", "low"] as const satisfies readonly ClaimSelectionLevelLabel[];

const OptionalStringSchema = z.preprocess(
  (value) => value ?? undefined,
  z.string().optional(),
).catch(undefined);

const OptionalStringArraySchema = z.preprocess(
  (value) => value ?? undefined,
  z.array(z.string()).optional(),
).catch(undefined);

const RedundancyArraySchema = z.preprocess(
  (value) => value ?? [],
  z.array(z.string()).default([]),
).catch([]);

const ClaimSelectionAssessmentWireSchema = z.object({
  claimId: OptionalStringSchema,
  triageLabel: OptionalStringSchema,
  thesisDirectness: OptionalStringSchema,
  expectedEvidenceYield: OptionalStringSchema,
  coversDistinctRelevantDimension: OptionalStringSchema,
  redundancyWithClaimIds: RedundancyArraySchema,
  recommendationRationale: OptionalStringSchema,
}).passthrough();

const ClaimSelectionRecommendationWireSchema = z.object({
  rankedClaimIds: OptionalStringArraySchema,
  recommendedClaimIds: OptionalStringArraySchema,
  assessments: z.preprocess(
    (value) => value ?? undefined,
    z.array(ClaimSelectionAssessmentWireSchema).optional(),
  ).catch(undefined),
  rationale: OptionalStringSchema,
}).passthrough();

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

function truncateForDisplay(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  if (max <= 3) return trimmed.slice(0, max);
  return `${trimmed.slice(0, max - 3).trimEnd()}...`;
}

function normalizeContractLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const withCamelBoundaries = raw.trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  const normalized = withCamelBoundaries
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase()
    .replace(/^_+|_+$/g, "");
  return normalized || null;
}

function normalizeEnumLabel<T extends string>(raw: unknown, allowed: readonly T[], fieldName: string): T {
  const normalized = normalizeContractLabel(raw);
  if (!normalized) {
    throw new ClaimSelectionRecommendationError(`${fieldName} must be a non-empty contract label`);
  }
  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as T;
  }
  throw new ClaimSelectionRecommendationError(`${fieldName} contains unsupported label ${String(raw)}`);
}

function requireStringArray(raw: string[] | undefined, fieldName: string): string[] {
  if (!Array.isArray(raw)) {
    throw new ClaimSelectionRecommendationError(`${fieldName} must be an array of claim IDs`);
  }
  return raw;
}

function requireAssessments(
  raw: z.infer<typeof ClaimSelectionRecommendationWireSchema>["assessments"],
): Array<z.infer<typeof ClaimSelectionAssessmentWireSchema>> {
  if (!Array.isArray(raw)) {
    throw new ClaimSelectionRecommendationError("assessments must be an array");
  }
  return raw;
}

function requireNonEmptyString(raw: unknown, fieldName: string): string {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new ClaimSelectionRecommendationError(`${fieldName} must be a non-empty string`);
  }
  return raw.trim();
}

function normalizeOptionalRationale(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return truncateForDisplay(trimmed, max);
}

export function validateClaimSelectionRecommendation(
  raw: unknown,
  atomicClaims: AtomicClaim[],
  selectionCap: number,
): ClaimSelectionRecommendation {
  const parsed = ClaimSelectionRecommendationWireSchema.parse(raw);
  const candidateIds = atomicClaims.map((claim) => claim.id);
  const candidateSet = toUniqueSet(candidateIds, "atomicClaims");
  const normalizedSelectionCap = getClaimAutoSelectionCap(candidateIds.length, selectionCap);
  const rankedClaimIds = requireStringArray(parsed.rankedClaimIds, "rankedClaimIds");
  const recommendedClaimIds = requireStringArray(parsed.recommendedClaimIds, "recommendedClaimIds");
  const assessments = requireAssessments(parsed.assessments).map((assessment, index): ClaimSelectionRecommendationAssessment => {
    const claimId = requireNonEmptyString(assessment.claimId, `assessments[${index}].claimId`);
    const recommendationRationale = normalizeOptionalRationale(
      assessment.recommendationRationale,
      ASSESSMENT_RATIONALE_DISPLAY_MAX,
    );
    return {
      claimId,
      triageLabel: normalizeEnumLabel(assessment.triageLabel, TRIAGE_LABELS, `assessments[${index}].triageLabel`),
      thesisDirectness: normalizeEnumLabel(
        assessment.thesisDirectness,
        LEVEL_LABELS,
        `assessments[${index}].thesisDirectness`,
      ),
      expectedEvidenceYield: normalizeEnumLabel(
        assessment.expectedEvidenceYield,
        LEVEL_LABELS,
        `assessments[${index}].expectedEvidenceYield`,
      ),
      coversDistinctRelevantDimension: normalizeEnumLabel(
        assessment.coversDistinctRelevantDimension,
        LEVEL_LABELS,
        `assessments[${index}].coversDistinctRelevantDimension`,
      ),
      redundancyWithClaimIds: [...new Set(assessment.redundancyWithClaimIds)],
      ...(recommendationRationale ? { recommendationRationale } : {}),
    };
  });

  assertSameIdSet(rankedClaimIds, candidateIds, "rankedClaimIds");

  if (recommendedClaimIds.length > normalizedSelectionCap) {
    throw new ClaimSelectionRecommendationError(
      `recommendedClaimIds exceeds selection cap ${normalizedSelectionCap}`,
    );
  }
  toUniqueSet(recommendedClaimIds, "recommendedClaimIds");
  for (const id of recommendedClaimIds) {
    if (!candidateSet.has(id)) {
      throw new ClaimSelectionRecommendationError(`recommendedClaimIds contains unknown claim ID ${id}`);
    }
  }
  assertSelectedOrder(recommendedClaimIds, rankedClaimIds);

  const assessmentIds = assessments.map((assessment) => assessment.claimId);
  assertSameIdSet(assessmentIds, candidateIds, "assessments");
  for (const assessment of assessments) {
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

  const rationale = normalizeOptionalRationale(parsed.rationale, OVERALL_RATIONALE_DISPLAY_MAX)
    ?? "Automatic claim selection ranked candidates by check-worthiness.";

  return {
    rankedClaimIds,
    recommendedClaimIds,
    assessments,
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

function stringifyDiagnosticValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Error) {
    const cause = stringifyDiagnosticValue((value as Error & { cause?: unknown }).cause);
    return cause ? `${value.name}: ${value.message}; cause: ${cause}` : `${value.name}: ${value.message}`;
  }
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, nested) => {
      if (typeof nested === "bigint") return nested.toString();
      if (typeof nested === "object" && nested !== null) {
        if (seen.has(nested)) return "[Circular]";
        seen.add(nested);
      }
      return nested;
    });
  } catch {
    return String(value);
  }
}

function redactDiagnosticText(text: string): string {
  return text
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "sk-[REDACTED]")
    .replace(/\b(authorization|api[_-]?key|token)\s*[:=]\s*["']?[^"',\s}]+/gi, "$1=[REDACTED]");
}

function truncateDiagnosticPreview(text: string): string {
  return truncateForDisplay(redactDiagnosticText(text), DIAGNOSTIC_PREVIEW_MAX);
}

function getResultText(result: unknown): unknown {
  return (result as { text?: unknown } | undefined)?.text;
}

function getErrorPayload(error: unknown): unknown {
  const errorObj = error as {
    value?: unknown;
    responseBody?: unknown;
    response?: { body?: unknown; text?: unknown };
    cause?: unknown;
  };
  return errorObj?.value ?? errorObj?.responseBody ?? errorObj?.response?.body ?? errorObj?.response?.text ?? errorObj?.cause;
}

function buildDiagnosticPreview(args: {
  structuredOutput?: unknown;
  result?: unknown;
  error?: unknown;
}): string | undefined {
  const candidates = [
    args.structuredOutput,
    getResultText(args.result),
    getErrorPayload(args.error),
    args.error,
  ];
  for (const candidate of candidates) {
    const text = stringifyDiagnosticValue(candidate);
    if (text?.trim()) {
      return truncateDiagnosticPreview(text.trim());
    }
  }
  return undefined;
}

function recordClaimSelectionCall(args: {
  model: { provider: string; modelName: string };
  result?: any;
  structuredOutput?: unknown;
  startedAt: number;
  success: boolean;
  schemaCompliant: boolean;
  retries: number;
  error?: unknown;
}): void {
  const baseErrorMessage = args.error instanceof Error
    ? args.error.message
    : args.error === undefined
      ? undefined
      : String(args.error);
  const diagnosticPreview = args.success
    ? undefined
    : buildDiagnosticPreview({
        structuredOutput: args.structuredOutput,
        result: args.result,
        error: args.error,
      });
  const safeBaseErrorMessage = baseErrorMessage
    ? truncateDiagnosticPreview(baseErrorMessage)
    : undefined;
  const errorMessage = baseErrorMessage
    ? diagnosticPreview
      ? `${safeBaseErrorMessage} | diagnosticPreview=${diagnosticPreview}`
      : safeBaseErrorMessage
    : diagnosticPreview
      ? `diagnosticPreview=${diagnosticPreview}`
      : undefined;
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
    let structured: unknown;
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
        output: Output.object({ schema: ClaimSelectionRecommendationWireSchema }),
        providerOptions: getStructuredOutputProviderOptions(model.provider),
      });

      if (isExplicitRefusalOrSafetyBlock(result)) {
        throw new ClaimSelectionRecommendationExplicitRefusalError(
          `Stage 1.5: LLM safety/refusal finish reason: ${getFinishReason(result)}`,
        );
      }

      structured = extractStructuredOutput(result);
      if (!structured) {
        throw new ClaimSelectionRecommendationError("Stage 1.5: LLM returned no structured claim-selection output");
      }

      const validated = validateClaimSelectionRecommendation(structured, args.atomicClaims, selectionCap);
      recordClaimSelectionCall({
        model,
        result,
        structuredOutput: structured,
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
        structuredOutput: structured,
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
