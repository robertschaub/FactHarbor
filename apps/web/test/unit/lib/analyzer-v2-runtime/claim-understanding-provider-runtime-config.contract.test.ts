import { describe, expect, it } from "vitest";
import {
  CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
  CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS,
  CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
  validateClaimUnderstandingProviderRuntimeConfigSnapshot,
  type ClaimUnderstandingProviderRuntimeConfigSnapshot,
} from "@/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import type { AnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/types";

function currentClaimUnderstandingPolicy(): AnalyzerV2TaskModelPolicy {
  const policy = getAnalyzerV2TaskModelPolicy("claim_understanding_gate1");
  if (!policy) {
    throw new Error("Expected claim_understanding_gate1 model policy to be registered.");
  }
  return policy;
}

function baseSnapshot(
  overrides: Partial<ClaimUnderstandingProviderRuntimeConfigSnapshot> = {},
): ClaimUnderstandingProviderRuntimeConfigSnapshot {
  const policy = currentClaimUnderstandingPolicy();

  return {
    source: "v2_task_policy_snapshot",
    gatewayTaskId: policy.gatewayTaskId,
    modelTask: policy.modelTask,
    modelPolicyId: policy.policyId,
    modelTier: policy.modelTier,
    providerPolicy: policy.providerPolicy,
    providerId: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    configSnapshotHash: "config-snapshot-hash-4c2a",
    temperature: policy.temperature,
    maxCalls: policy.maxCalls,
    schemaRetryCount: policy.schemaRetryCount,
    timeoutMs: policy.timeoutMs,
    maxOutputTokens: policy.maxOutputTokens,
    outputSchemaVersion: "v2.claim_understanding_result.0",
    approval: policy.approval,
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

describe("Analyzer V2 runtime Claim Understanding provider config contract", () => {
  it("accepts an inert V2 task-policy/config snapshot contract", () => {
    const snapshot = baseSnapshot();
    const result = validateClaimUnderstandingProviderRuntimeConfigSnapshot(snapshot);

    expect(result).toEqual({
      status: "contract_satisfied",
      contractVersion: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
      snapshot,
      blockedReasons: [],
    });
    expect(result.snapshot).toMatchObject({
      source: "v2_task_policy_snapshot",
      gatewayTaskId: "claim_understanding_gate1",
      modelTask: "understand",
      providerPolicy: "from_config_snapshot",
      executionState: "not_executable_contract_only",
    });
  });

  it("accepts a supplied config snapshot for a factory-only non-product-wired state", () => {
    const snapshot = baseSnapshot({
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
    });

    const result = validateClaimUnderstandingProviderRuntimeConfigSnapshot(snapshot);

    expect(result).toEqual({
      status: "contract_satisfied",
      contractVersion: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
      snapshot,
      blockedReasons: [],
    });
    expect(result.snapshot.executionState).toBe("factory_only_not_product_wired");
  });

  it("rejects ad hoc or legacy config authority and missing identity values", () => {
    const result = validateClaimUnderstandingProviderRuntimeConfigSnapshot(baseSnapshot({
      source: "caller_supplied_ad_hoc",
      providerId: "unknown",
      modelId: "",
      configSnapshotHash: "placeholder",
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "source_not_v2_task_policy_snapshot",
      "provider_or_model_identity_missing",
      "config_snapshot_hash_missing",
    ]));
  });

  it("rejects wrong task ownership and invalid retry budget", () => {
    const result = validateClaimUnderstandingProviderRuntimeConfigSnapshot(baseSnapshot({
      gatewayTaskId: "verdict_debate",
      modelTask: "verdict",
      maxCalls: 1,
      schemaRetryCount: 1,
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "task_not_claim_understanding_gate1",
      "policy_values_invalid",
    ]));
  });

  it("records approval as provenance but blocks execution authority and provider construction", () => {
    const result = validateClaimUnderstandingProviderRuntimeConfigSnapshot(baseSnapshot({
      approval: {
        status: "approved",
        reviewer: "Deputy reviewer",
        approvedAt: "2026-05-14T21:20:00.000Z",
      },
      executionState: "execution_approved",
      providerConstruction: {
        sdkImportState: "imported",
        callbackCreationState: "created",
        factorySource: {
          filePath: "none_contract_only",
          allowedSdkSpecifiers: [],
          configSnapshotAuthority: "supplied_validated_runtime_config_snapshot_only",
        },
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "execution_authority_enabled",
      "provider_construction_enabled",
    ]));
  });

  it("rejects semantic repair, prompt mutation, escalation, and fallback provider semantics", () => {
    const result = validateClaimUnderstandingProviderRuntimeConfigSnapshot(baseSnapshot({
      retrySemantics: {
        owner: "model_adapter_structural_schema_retry",
        promptMutation: "allowed",
        semanticRepair: "allowed",
        modelEscalation: "allowed",
        fallbackProvider: "allowed",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["retry_semantics_not_structural_only"]);
  });

  it("rejects ACS, direct URL, cache IO, public surface, and incomplete telemetry", () => {
    const result = validateClaimUnderstandingProviderRuntimeConfigSnapshot(baseSnapshot({
      inputScope: {
        directText: "allowed_future",
        acsPreparedSnapshot: "allowed",
        directUrl: "allowed",
      },
      outputContract: {
        cacheIo: "allowed",
        publicSurface: "public_exposed",
        telemetry: {
          providerId: "required",
          modelId: "required",
          tokenUsage: "required",
          durationMs: "required",
          configSnapshotHash: "optional" as never,
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
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "input_scope_not_direct_text_only",
      "cache_io_enabled",
      "public_surface_exposed",
      "telemetry_contract_incomplete",
    ]));
  });

  it("rejects factory-only state with wrong SDK set, config authority, or failure mapping", () => {
    const result = validateClaimUnderstandingProviderRuntimeConfigSnapshot(baseSnapshot({
      executionState: "factory_only_not_product_wired",
      providerConstruction: {
        sdkImportState: "imported",
        callbackCreationState: "created",
        factorySource: {
          filePath: "none_contract_only",
          allowedSdkSpecifiers: ["ai"],
          configSnapshotAuthority: "caller_ad_hoc",
        },
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
          providerFailure: "raw_sdk_error_exposed",
          rawSdkResponseExposure: "allowed",
          secretExposure: "allowed",
        },
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "provider_construction_enabled",
      "config_snapshot_authority_invalid",
      "provider_failure_mapping_invalid",
    ]));
  });
});
