import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import type { AnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/types";
import type { EvidenceQueryPlanningProviderCallRequest } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter";
import {
  buildEvidenceQueryPlanningProviderFactory,
  EvidenceQueryPlanningProviderCallError,
  EvidenceQueryPlanningProviderFactoryConfigurationError,
  EVIDENCE_QUERY_PLANNING_PROVIDER_FACTORY_VERSION,
} from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory";
import {
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS,
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE,
  type EvidenceQueryPlanningProviderRuntimeConfigSnapshot,
} from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract";

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
  const policy = getAnalyzerV2TaskModelPolicy("evidence_query_planning");
  if (!policy) {
    throw new Error("Expected evidence_query_planning model policy to be registered.");
  }
  return policy;
}

function baseSnapshot(
  overrides: Partial<EvidenceQueryPlanningProviderRuntimeConfigSnapshot> = {},
): EvidenceQueryPlanningProviderRuntimeConfigSnapshot {
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
    configSnapshotAuthority: "supplied_validated_runtime_config_snapshot_only",
    configSnapshotHash: "query-planning-config-snapshot-hash",
    activationProfileId: "v2.evidence-query-planning.hidden-direct-text.x7s",
    activationStatus: "enabled_hidden_direct_text",
    temperature: policy.temperature,
    maxCalls: policy.maxCalls,
    schemaRetryCount: policy.schemaRetryCount,
    timeoutMs: policy.timeoutMs,
    maxOutputTokens: policy.maxOutputTokens,
    outputSchemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    approval: policy.approval,
    approvalPointer: {
      sourcePackage: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE,
    },
    executionState: "product_activation_wired_hidden_direct_text",
    providerConstruction: {
      sdkImportState: "imported",
      callbackCreationState: "created",
      factorySource: {
        filePath: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
        allowedSdkSpecifiers: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS,
        configSnapshotAuthority: "supplied_validated_runtime_config_snapshot_only",
      },
    },
    retrySemantics: {
      owner: "model_adapter_one_call_no_retry",
      promptMutation: "forbidden",
      semanticRepair: "forbidden",
      modelEscalation: "forbidden",
      fallbackProvider: "forbidden",
    },
    inputScope: {
      directText: "allowed_hidden",
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
  overrides: Partial<EvidenceQueryPlanningProviderCallRequest> = {},
): EvidenceQueryPlanningProviderCallRequest {
  return {
    renderedPrompt: "Evidence Query Planning prompt bytes",
    promptContentHash: "query-planning-prompt-content-hash",
    outputSchemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    attemptNumber: 1,
    maxAttempts: 1,
    modelPolicy: currentPolicy(),
    inputFrame: {
      sourceLanguage: "de",
      selectedAtomicClaimIds: ["AC_001"],
      currentDate: "2026-05-17",
    },
    ...overrides,
  };
}

function usage(inputTokens: number | undefined, outputTokens: number | undefined, totalTokens: number | undefined) {
  return {
    inputTokens,
    outputTokens,
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
  const inputTokens = "inputTokens" in params ? params.inputTokens : 31;
  const outputTokens = "outputTokens" in params ? params.outputTokens : 17;
  const totalTokens = "totalTokens" in params ? params.totalTokens : 48;

  return {
    text: params.text ?? "{\"schemaVersion\":\"v2.evidence_query_planning_result.0\"}",
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

describe("Analyzer V2 Evidence Query Planning provider factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds an Anthropic provider callback from a validated X7-S snapshot", async () => {
    vi.mocked(generateText).mockResolvedValueOnce(generateTextResult({
      text: "{\"status\":\"accepted\"}",
      inputTokens: 120,
      outputTokens: 41,
      totalTokens: 161,
    }));
    const factory = buildEvidenceQueryPlanningProviderFactory(baseSnapshot(), {
      now: sequenceClock(2_000, 2_450),
    });

    const response = await factory.providerCall(providerRequest());

    expect(factory).toMatchObject({
      factoryVersion: EVIDENCE_QUERY_PLANNING_PROVIDER_FACTORY_VERSION,
      factorySourcePath: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
      configSnapshotHash: "query-planning-config-snapshot-hash",
      providerId: "anthropic",
      modelId: MODEL_ID,
    });
    expect(anthropic).toHaveBeenCalledWith(MODEL_ID);
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: { provider: "anthropic.messages", modelId: MODEL_ID },
      prompt: "Evidence Query Planning prompt bytes",
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
        inputTokens: 120,
        outputTokens: 41,
        totalTokens: 161,
        durationMs: 450,
      },
    });
  });

  it("rejects contract-only, wrong-provider, or request-mismatched snapshots before SDK dispatch", async () => {
    expect(() => buildEvidenceQueryPlanningProviderFactory(baseSnapshot({
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
    }))).toThrow(EvidenceQueryPlanningProviderFactoryConfigurationError);

    expect(() => buildEvidenceQueryPlanningProviderFactory(baseSnapshot({
      activationStatus: "kill_switch_closed",
    }))).toThrow(EvidenceQueryPlanningProviderFactoryConfigurationError);

    expect(() => buildEvidenceQueryPlanningProviderFactory(baseSnapshot({
      providerId: "openai",
    }))).toThrow(EvidenceQueryPlanningProviderFactoryConfigurationError);

    const factory = buildEvidenceQueryPlanningProviderFactory(baseSnapshot());
    await expect(factory.providerCall(providerRequest({
      modelPolicy: {
        ...currentPolicy(),
        policyId: "v2.model.evidence_query_planning.mismatched",
      },
    }))).rejects.toThrow("does not match the validated runtime config snapshot");

    expect(anthropic).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
  });

  it("sanitizes provider failures and does not retry inside the factory", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(
      new Error("raw SDK response with ANTHROPIC_API_KEY=secret-value"),
    );
    const factory = buildEvidenceQueryPlanningProviderFactory(baseSnapshot());

    let thrown: unknown;
    try {
      await factory.providerCall(providerRequest());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(EvidenceQueryPlanningProviderCallError);
    expect(caughtErrorMessage(thrown)).toBe("Evidence Query Planning provider call failed.");
    expect(caughtErrorMessage(thrown)).not.toMatch(/ANTHROPIC_API_KEY|secret-value|raw SDK/i);
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("rejects missing token telemetry instead of fabricating usage values", async () => {
    vi.mocked(generateText).mockResolvedValueOnce(generateTextResult({
      inputTokens: undefined,
      outputTokens: 9,
      totalTokens: 9,
    }));
    const factory = buildEvidenceQueryPlanningProviderFactory(baseSnapshot());

    await expect(factory.providerCall(providerRequest())).rejects.toThrow(
      "Evidence Query Planning provider did not return required input token telemetry.",
    );
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});
