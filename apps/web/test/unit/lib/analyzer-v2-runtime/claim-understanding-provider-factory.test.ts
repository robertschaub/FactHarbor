import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
} from "@/lib/analyzer-v2/claim-understanding/types";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import type { AnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/types";
import {
  buildClaimUnderstandingProviderFactory,
  ClaimUnderstandingProviderCallError,
  ClaimUnderstandingProviderFactoryConfigurationError,
  CLAIM_UNDERSTANDING_PROVIDER_FACTORY_VERSION,
} from "@/lib/analyzer-v2-runtime/claim-understanding-provider-factory";
import {
  CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS,
  CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
  type ClaimUnderstandingProviderRuntimeConfigSnapshot,
} from "@/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract";
import type { ClaimUnderstandingProviderCallRequest } from "@/lib/analyzer-v2/claim-understanding/model-adapter";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((modelId: string) => ({
    provider: "anthropic.messages",
    modelId,
  })),
}));

const MODEL_ID = "claude-haiku-4-5-20251001";

function currentPolicy(): AnalyzerV2TaskModelPolicy {
  const policy = getAnalyzerV2TaskModelPolicy("claim_understanding_gate1");
  if (!policy) {
    throw new Error("Expected claim_understanding_gate1 model policy to be registered.");
  }
  return policy;
}

function baseSnapshot(
  overrides: Partial<ClaimUnderstandingProviderRuntimeConfigSnapshot> = {},
): ClaimUnderstandingProviderRuntimeConfigSnapshot {
  const policy = currentPolicy();
  return {
    source: "v2_task_policy_snapshot",
    gatewayTaskId: policy.gatewayTaskId,
    modelTask: policy.modelTask,
    modelPolicyId: policy.policyId,
    modelTier: policy.modelTier,
    providerPolicy: policy.providerPolicy,
    providerId: "anthropic",
    modelId: MODEL_ID,
    configSnapshotHash: "factory-config-snapshot-hash",
    temperature: policy.temperature,
    maxCalls: policy.maxCalls,
    schemaRetryCount: policy.schemaRetryCount,
    timeoutMs: policy.timeoutMs,
    maxOutputTokens: policy.maxOutputTokens,
    outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    approval: policy.approval,
    executionState: "factory_only_not_product_wired",
    providerConstruction: {
      sdkImportState: "imported",
      callbackCreationState: "created",
      factorySource: {
        filePath: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
        allowedSdkSpecifiers: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS,
        configSnapshotAuthority: "supplied_validated_runtime_config_snapshot_only",
      },
    },
    retrySemantics: {
      owner: "model_adapter_structural_schema_retry",
      promptMutation: "forbidden",
      semanticRepair: "forbidden",
      modelEscalation: "forbidden",
      fallbackProvider: "forbidden",
    },
    inputScope: {
      directText: "allowed_future",
      acsPreparedSnapshot: "blocked",
      directUrl: "blocked",
    },
    outputContract: {
      cacheIo: "forbidden",
      publicSurface: "internal_only",
      telemetry: {
        providerId: "required",
        modelId: "required",
        tokenUsage: "required",
        durationMs: "required",
        configSnapshotHash: "required",
        attemptIdentity: "required",
        outputSchemaVersion: "required",
        promptHashes: "required",
      },
      failureMapping: {
        providerFailure: "sanitized_error_to_model_adapter",
        rawSdkResponseExposure: "forbidden",
        secretExposure: "forbidden",
      },
    },
    ...overrides,
  };
}

function providerRequest(
  overrides: Partial<ClaimUnderstandingProviderCallRequest> = {},
): ClaimUnderstandingProviderCallRequest {
  return {
    renderedPrompt: "Claim Understanding prompt bytes",
    promptContentHash: "prompt-content-hash",
    outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    attemptNumber: 1,
    maxAttempts: 2,
    modelPolicy: currentPolicy(),
    inputFrame: {
      analysisInput: "Plastic recycling is pointless",
      resolvedInputText: "Plastic recycling is pointless",
      detectedLanguage: "en",
    },
    ...overrides,
  };
}

function usage(inputTokens: number | undefined, outputTokens: number | undefined, totalTokens: number | undefined) {
  return {
    inputTokens,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokens,
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
    totalTokens,
    raw: undefined,
  };
}

function generateTextResult(params: {
  text?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
} = {}): Awaited<ReturnType<typeof generateText>> {
  const inputTokens = "inputTokens" in params ? params.inputTokens : 11;
  const outputTokens = "outputTokens" in params ? params.outputTokens : 7;
  const totalTokens = "totalTokens" in params ? params.totalTokens : 18;

  return {
    text: params.text ?? "{\"schemaVersion\":\"v2.claim_understanding_result.0\"}",
    usage: usage(inputTokens, outputTokens, totalTokens),
    totalUsage: usage(inputTokens, outputTokens, totalTokens),
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

function sequenceClock(...values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

function caughtErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    throw new Error("Expected an Error instance.");
  }
  return error.message;
}

describe("Analyzer V2 Claim Understanding provider factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a factory-only Anthropic provider callback from a validated runtime snapshot", async () => {
    vi.mocked(generateText).mockResolvedValueOnce(generateTextResult({
      text: "{\"status\":\"accepted\"}",
      inputTokens: 101,
      outputTokens: 44,
      totalTokens: 145,
    }));
    const factory = buildClaimUnderstandingProviderFactory(baseSnapshot(), {
      now: sequenceClock(1_000, 1_375),
    });

    const response = await factory.providerCall(providerRequest());

    expect(factory).toMatchObject({
      factoryVersion: CLAIM_UNDERSTANDING_PROVIDER_FACTORY_VERSION,
      factorySourcePath: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
      configSnapshotHash: "factory-config-snapshot-hash",
      providerId: "anthropic",
      modelId: MODEL_ID,
    });
    expect(anthropic).toHaveBeenCalledWith(MODEL_ID);
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: { provider: "anthropic.messages", modelId: MODEL_ID },
      prompt: "Claim Understanding prompt bytes",
      temperature: currentPolicy().temperature,
      maxOutputTokens: currentPolicy().maxOutputTokens,
      timeout: currentPolicy().timeoutMs,
      maxRetries: 0,
    }));
    expect(response).toEqual({
      output: "{\"status\":\"accepted\"}",
      telemetry: {
        providerId: "anthropic",
        modelId: MODEL_ID,
        inputTokens: 101,
        outputTokens: 44,
        totalTokens: 145,
        durationMs: 375,
      },
    });
  });

  it("rejects contract-only or non-Anthropic snapshots before provider callback creation", () => {
    expect(() => buildClaimUnderstandingProviderFactory(baseSnapshot({
      executionState: "not_executable_contract_only",
      providerConstruction: {
        sdkImportState: "not_imported",
        callbackCreationState: "not_created",
        factorySource: {
          filePath: "none_contract_only",
          allowedSdkSpecifiers: [],
          configSnapshotAuthority: "supplied_validated_runtime_config_snapshot_only",
        },
      },
    }))).toThrow(ClaimUnderstandingProviderFactoryConfigurationError);

    expect(() => buildClaimUnderstandingProviderFactory(baseSnapshot({
      providerId: "openai",
    }))).toThrow("currently supports only the anthropic provider id");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("fails closed before SDK dispatch when the adapter request does not match the snapshot", async () => {
    const factory = buildClaimUnderstandingProviderFactory(baseSnapshot());

    await expect(factory.providerCall(providerRequest({
      modelPolicy: {
        ...currentPolicy(),
        policyId: "v2.model.claim_understanding_gate1.mismatched",
      },
    }))).rejects.toThrow("does not match the validated runtime config snapshot");

    expect(anthropic).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
  });

  it("sanitizes provider failures and does not retry inside the factory", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(
      new Error("raw SDK response with ANTHROPIC_API_KEY=secret-value"),
    );
    const factory = buildClaimUnderstandingProviderFactory(baseSnapshot());

    let thrown: unknown;
    try {
      await factory.providerCall(providerRequest());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ClaimUnderstandingProviderCallError);
    expect(caughtErrorMessage(thrown)).toBe("Claim Understanding provider call failed.");
    expect(caughtErrorMessage(thrown)).not.toMatch(/ANTHROPIC_API_KEY|secret-value|raw SDK/i);
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("rejects missing token telemetry instead of fabricating usage values", async () => {
    vi.mocked(generateText).mockResolvedValueOnce(generateTextResult({
      inputTokens: undefined,
      outputTokens: 9,
      totalTokens: 9,
    }));
    const factory = buildClaimUnderstandingProviderFactory(baseSnapshot());

    await expect(factory.providerCall(providerRequest())).rejects.toThrow(
      "Claim Understanding provider did not return required input token telemetry.",
    );
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});
