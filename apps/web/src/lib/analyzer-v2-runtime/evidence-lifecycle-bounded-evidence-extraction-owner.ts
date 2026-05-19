import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
  runBoundedEvidenceExtractionRuntime,
  type BoundedEvidenceExtractionDecision,
  type BoundedEvidenceExtractionProviderCallRequest,
  type BoundedEvidenceExtractionProviderCallResponse,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type {
  BoundedExtractionInputAuthorizationDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import type {
  EvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import {
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
  type PipelineRunContext,
  QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
} from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";
import {
  inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership,
  readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance";
import {
  inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership,
  readEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance";
import { markBoundedEvidenceExtractionRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

export const BOUNDED_EVIDENCE_EXTRACTION_PROVIDER_FACTORY_VERSION =
  "v2.evidence-lifecycle.bounded-evidence-extraction.provider-factory.x7w5" as const;

export class BoundedEvidenceExtractionProviderCallError extends Error {
  constructor(message = "Bounded Evidence Extraction provider call failed.") {
    super(message);
    this.name = "BoundedEvidenceExtractionProviderCallError";
  }
}

export type RunBoundedEvidenceExtractionDecisionInput = {
  readonly context: PipelineRunContext;
  readonly claimContract: ClaimContract;
  readonly extractionInputAuthorization: BoundedExtractionInputAuthorizationDecision;
  readonly executionReadinessDenial: EvidenceLifecycleExecutionReadinessDenialDecision;
};

function requireTokenCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new BoundedEvidenceExtractionProviderCallError();
  }
  return value;
}

function sanitizeProviderError(error: unknown): BoundedEvidenceExtractionProviderCallError {
  return error instanceof BoundedEvidenceExtractionProviderCallError
    ? error
    : new BoundedEvidenceExtractionProviderCallError();
}

function assertActivation(context: PipelineRunContext): void {
  const activation = context.queryPlanningRuntimeActivation;
  if (
    activation.status !== QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT ||
    activation.source !== "v2_task_policy_snapshot" ||
    activation.suppliedBy !== "product_owned_activation_authority" ||
    activation.freezeLocation !== "pipeline_run_context" ||
    activation.activationProfileId !== QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID ||
    activation.provider.providerId !== "anthropic" ||
    activation.provider.modelId.trim().length === 0 ||
    activation.hiddenArtifactSink.visibility !== "internal_admin_only" ||
    activation.hiddenArtifactSink.publicPointerExposure !== "forbidden"
  ) {
    throw new BoundedEvidenceExtractionProviderCallError();
  }
}

function assertRequestMatchesSnapshot(
  request: BoundedEvidenceExtractionProviderCallRequest,
  context: PipelineRunContext,
): void {
  const modelPolicy = getPipelineRunTaskModelPolicy(context, "evidence_extraction");
  if (!modelPolicy) {
    throw new BoundedEvidenceExtractionProviderCallError();
  }
  if (
    request.modelPolicy.policyId !== modelPolicy.policyId ||
    request.modelPolicy.gatewayTaskId !== "evidence_extraction" ||
    request.modelPolicy.modelTask !== "extract_evidence" ||
    request.modelPolicy.temperature !== modelPolicy.temperature ||
    request.modelPolicy.maxCalls !== modelPolicy.maxCalls ||
    request.modelPolicy.schemaRetryCount !== modelPolicy.schemaRetryCount ||
    request.modelPolicy.timeoutMs !== modelPolicy.timeoutMs ||
    request.modelPolicy.maxOutputTokens !== modelPolicy.maxOutputTokens
  ) {
    throw new BoundedEvidenceExtractionProviderCallError();
  }
}

async function executeAnthropicProviderCall(params: {
  readonly request: BoundedEvidenceExtractionProviderCallRequest;
  readonly context: PipelineRunContext;
  readonly startedAt: number;
}): Promise<BoundedEvidenceExtractionProviderCallResponse> {
  try {
    assertRequestMatchesSnapshot(params.request, params.context);
    const modelId = params.context.queryPlanningRuntimeActivation.provider.modelId;
    const result = await generateText({
      model: anthropic(modelId as Parameters<typeof anthropic>[0]),
      prompt: params.request.renderedPrompt,
      temperature: params.request.modelPolicy.temperature,
      maxOutputTokens: params.request.modelPolicy.maxOutputTokens,
      timeout: params.request.modelPolicy.timeoutMs,
      maxRetries: 0,
    });
    const usage = result.totalUsage ?? result.usage;
    return {
      output: result.text,
      telemetry: {
        providerId: "anthropic",
        modelId,
        inputTokens: requireTokenCount(usage.inputTokens),
        outputTokens: requireTokenCount(usage.outputTokens),
        totalTokens: requireTokenCount(usage.totalTokens),
        durationMs: Math.max(0, Date.now() - params.startedAt),
      },
    };
  } catch (error) {
    throw sanitizeProviderError(error);
  }
}

function buildConfigSnapshotHash(context: PipelineRunContext): string {
  return sha256Json({
    sourcePackage: BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
    providerFactoryVersion: BOUNDED_EVIDENCE_EXTRACTION_PROVIDER_FACTORY_VERSION,
    activationSnapshotHash: context.queryPlanningRuntimeActivation.activationSnapshotHash,
    gatewayTask: getPipelineRunGatewayTask(context, "evidence_extraction"),
    modelPolicy: getPipelineRunTaskModelPolicy(context, "evidence_extraction"),
    modelPolicySnapshotHash: context.modelPolicy.snapshotHash,
  });
}

export async function runBoundedEvidenceExtractionDecision(
  input: RunBoundedEvidenceExtractionDecisionInput,
): Promise<BoundedEvidenceExtractionDecision> {
  const extractionInputRuntimeOwnership =
    inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership(
      input.extractionInputAuthorization,
    );
  const runtimeOwnedExtractionInput =
    readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(
      input.extractionInputAuthorization,
    );
  const executionReadinessRuntimeOwnership =
    inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership(input.executionReadinessDenial);
  const runtimeOwnedExecutionReadiness =
    readEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(input.executionReadinessDenial);

  const providerCall = async (
    request: BoundedEvidenceExtractionProviderCallRequest,
  ): Promise<BoundedEvidenceExtractionProviderCallResponse> => {
    assertActivation(input.context);
    return executeAnthropicProviderCall({ request, context: input.context, startedAt: Date.now() });
  };

  const decision = await runBoundedEvidenceExtractionRuntime({
    context: input.context,
    claimContract: input.claimContract,
    extractionInputAuthorization: runtimeOwnedExtractionInput,
    extractionInputRuntimeOwnership,
    executionReadinessDenial: runtimeOwnedExecutionReadiness,
    executionReadinessRuntimeOwnership,
    providerCall,
    providerId: "anthropic",
    modelId: input.context.queryPlanningRuntimeActivation.provider.modelId,
    configSnapshotHash: buildConfigSnapshotHash(input.context),
    providerCallbackCreated: true,
    providerSdkLoaded: true,
  });

  return markBoundedEvidenceExtractionRuntimeOwnedDecision(decision);
}
