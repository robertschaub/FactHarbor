import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type {
  ClaimUnderstandingProviderCall,
  ClaimUnderstandingProviderCallRequest,
  ClaimUnderstandingProviderCallResponse,
} from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import {
  CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
  validateClaimUnderstandingProviderRuntimeConfigSnapshot,
  type ClaimUnderstandingProviderRuntimeConfigSnapshot,
} from "@/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract";

export const CLAIM_UNDERSTANDING_PROVIDER_FACTORY_VERSION =
  "v2.claim-understanding.provider-factory.0";

export class ClaimUnderstandingProviderFactoryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimUnderstandingProviderFactoryConfigurationError";
  }
}

export class ClaimUnderstandingProviderCallError extends Error {
  constructor(message = "Claim Understanding provider call failed.") {
    super(message);
    this.name = "ClaimUnderstandingProviderCallError";
  }
}

export type ClaimUnderstandingProviderFactoryClock = () => number;

export type BuildClaimUnderstandingProviderFactoryOptions = {
  now?: ClaimUnderstandingProviderFactoryClock;
};

export type ClaimUnderstandingProviderFactory = {
  factoryVersion: typeof CLAIM_UNDERSTANDING_PROVIDER_FACTORY_VERSION;
  factorySourcePath: typeof CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH;
  configSnapshotHash: string;
  providerId: "anthropic";
  modelId: string;
  providerCall: ClaimUnderstandingProviderCall;
};

function sanitizeProviderError(error: unknown): ClaimUnderstandingProviderCallError {
  if (error instanceof ClaimUnderstandingProviderCallError) {
    return error;
  }
  return new ClaimUnderstandingProviderCallError();
}

function requireTokenCount(value: number | undefined, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ClaimUnderstandingProviderCallError(
      `Claim Understanding provider did not return required ${fieldName} telemetry.`,
    );
  }
  return value;
}

function assertFactorySnapshot(snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot): void {
  const validation = validateClaimUnderstandingProviderRuntimeConfigSnapshot(snapshot);
  if (validation.status !== "contract_satisfied") {
    throw new ClaimUnderstandingProviderFactoryConfigurationError(
      `Claim Understanding provider factory requires a valid runtime config snapshot: ${validation.blockedReasons.join(", ")}`,
    );
  }

  if (
    snapshot.executionState !== "factory_only_not_product_wired"
    && snapshot.executionState !== "product_activation_wired_hidden_direct_text"
  ) {
    throw new ClaimUnderstandingProviderFactoryConfigurationError(
      "Claim Understanding provider factory requires factory-only or hidden direct-text product activation state.",
    );
  }

  if (snapshot.providerId !== "anthropic") {
    throw new ClaimUnderstandingProviderFactoryConfigurationError(
      "Claim Understanding provider factory currently supports only the anthropic provider id.",
    );
  }
}

function assertRequestMatchesSnapshot(
  request: ClaimUnderstandingProviderCallRequest,
  snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot,
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
    throw new ClaimUnderstandingProviderCallError(
      "Claim Understanding provider request does not match the validated runtime config snapshot.",
    );
  }
}

async function executeAnthropicProviderCall(params: {
  request: ClaimUnderstandingProviderCallRequest;
  snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot;
  now: ClaimUnderstandingProviderFactoryClock;
}): Promise<ClaimUnderstandingProviderCallResponse> {
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

export function buildClaimUnderstandingProviderFactory(
  snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot,
  options: BuildClaimUnderstandingProviderFactoryOptions = {},
): ClaimUnderstandingProviderFactory {
  assertFactorySnapshot(snapshot);
  const now = options.now ?? Date.now;

  return {
    factoryVersion: CLAIM_UNDERSTANDING_PROVIDER_FACTORY_VERSION,
    factorySourcePath: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
    configSnapshotHash: snapshot.configSnapshotHash,
    providerId: "anthropic",
    modelId: snapshot.modelId,
    providerCall: (request) => executeAnthropicProviderCall({ request, snapshot, now }),
  };
}
