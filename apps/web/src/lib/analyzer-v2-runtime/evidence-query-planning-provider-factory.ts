import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type {
  EvidenceQueryPlanningProviderCall,
  EvidenceQueryPlanningProviderCallRequest,
  EvidenceQueryPlanningProviderCallResponse,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter";
import {
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
  validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot,
  type EvidenceQueryPlanningProviderRuntimeConfigSnapshot,
} from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract";

export const EVIDENCE_QUERY_PLANNING_PROVIDER_FACTORY_VERSION =
  "v2.evidence-query-planning.provider-factory.x7s";

export class EvidenceQueryPlanningProviderFactoryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceQueryPlanningProviderFactoryConfigurationError";
  }
}

export class EvidenceQueryPlanningProviderCallError extends Error {
  constructor(message = "Evidence Query Planning provider call failed.") {
    super(message);
    this.name = "EvidenceQueryPlanningProviderCallError";
  }
}

export type EvidenceQueryPlanningProviderFactoryClock = () => number;

export type BuildEvidenceQueryPlanningProviderFactoryOptions = {
  now?: EvidenceQueryPlanningProviderFactoryClock;
};

export type EvidenceQueryPlanningProviderFactory = {
  factoryVersion: typeof EVIDENCE_QUERY_PLANNING_PROVIDER_FACTORY_VERSION;
  factorySourcePath: typeof EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH;
  configSnapshotHash: string;
  providerId: "anthropic";
  modelId: string;
  providerCall: EvidenceQueryPlanningProviderCall;
};

function sanitizeProviderError(error: unknown): EvidenceQueryPlanningProviderCallError {
  if (error instanceof EvidenceQueryPlanningProviderCallError) {
    return error;
  }
  return new EvidenceQueryPlanningProviderCallError();
}

function requireTokenCount(value: number | undefined, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new EvidenceQueryPlanningProviderCallError(
      `Evidence Query Planning provider did not return required ${fieldName} telemetry.`,
    );
  }
  return value;
}

function assertFactorySnapshot(snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot): void {
  const validation = validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(snapshot);
  if (validation.status !== "contract_satisfied") {
    throw new EvidenceQueryPlanningProviderFactoryConfigurationError(
      `Evidence Query Planning provider factory requires a valid runtime config snapshot: ${validation.blockedReasons.join(", ")}`,
    );
  }

  if (
    snapshot.executionState !== "factory_only_not_product_wired"
    && snapshot.executionState !== "product_activation_wired_hidden_direct_text"
  ) {
    throw new EvidenceQueryPlanningProviderFactoryConfigurationError(
      "Evidence Query Planning provider factory requires factory-only or hidden direct-text product activation state.",
    );
  }

  if (snapshot.providerId !== "anthropic") {
    throw new EvidenceQueryPlanningProviderFactoryConfigurationError(
      "Evidence Query Planning provider factory currently supports only the anthropic provider id.",
    );
  }
}

function assertRequestMatchesSnapshot(
  request: EvidenceQueryPlanningProviderCallRequest,
  snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot,
): void {
  if (
    request.outputSchemaVersion !== snapshot.outputSchemaVersion
    || request.modelPolicy.policyId !== snapshot.modelPolicyId
    || request.modelPolicy.gatewayTaskId !== snapshot.gatewayTaskId
    || request.modelPolicy.modelTask !== snapshot.modelTask
    || request.modelPolicy.providerPolicy !== snapshot.providerPolicy
    || request.modelPolicy.temperature !== snapshot.temperature
    || request.modelPolicy.maxCalls !== snapshot.maxCalls
    || request.modelPolicy.schemaRetryCount !== snapshot.schemaRetryCount
    || request.modelPolicy.timeoutMs !== snapshot.timeoutMs
    || request.modelPolicy.maxOutputTokens !== snapshot.maxOutputTokens
  ) {
    throw new EvidenceQueryPlanningProviderCallError(
      "Evidence Query Planning provider request does not match the validated runtime config snapshot.",
    );
  }
}

async function executeAnthropicProviderCall(params: {
  request: EvidenceQueryPlanningProviderCallRequest;
  snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot;
  now: EvidenceQueryPlanningProviderFactoryClock;
}): Promise<EvidenceQueryPlanningProviderCallResponse> {
  const startedAt = params.now();
  try {
    assertRequestMatchesSnapshot(params.request, params.snapshot);

    const result = await generateText({
      model: anthropic(params.snapshot.modelId as Parameters<typeof anthropic>[0]),
      prompt: params.request.renderedPrompt,
      temperature: params.snapshot.temperature,
      maxOutputTokens: params.snapshot.maxOutputTokens,
      timeout: params.snapshot.timeoutMs,
      maxRetries: 0,
    });

    const finishedAt = params.now();
    const usage = result.totalUsage ?? result.usage;
    const inputTokens = requireTokenCount(usage.inputTokens, "input token");
    const outputTokens = requireTokenCount(usage.outputTokens, "output token");
    const totalTokens = requireTokenCount(usage.totalTokens, "total token");

    return {
      output: result.text,
      telemetry: {
        providerId: params.snapshot.providerId,
        modelId: params.snapshot.modelId,
        inputTokens,
        outputTokens,
        totalTokens,
        durationMs: Math.max(0, finishedAt - startedAt),
      },
    };
  } catch (error) {
    throw sanitizeProviderError(error);
  }
}

export function buildEvidenceQueryPlanningProviderFactory(
  snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot,
  options: BuildEvidenceQueryPlanningProviderFactoryOptions = {},
): EvidenceQueryPlanningProviderFactory {
  assertFactorySnapshot(snapshot);
  const now = options.now ?? Date.now;

  return {
    factoryVersion: EVIDENCE_QUERY_PLANNING_PROVIDER_FACTORY_VERSION,
    factorySourcePath: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
    configSnapshotHash: snapshot.configSnapshotHash,
    providerId: "anthropic",
    modelId: snapshot.modelId,
    providerCall: (request) => executeAnthropicProviderCall({ request, snapshot, now }),
  };
}
