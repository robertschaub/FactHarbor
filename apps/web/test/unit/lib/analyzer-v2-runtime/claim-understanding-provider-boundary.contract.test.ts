import { describe, expect, it } from "vitest";
import {
  CLAIM_UNDERSTANDING_PROVIDER_BOUNDARY_CONTRACT_VERSION,
  validateClaimUnderstandingProviderBoundaryOwnershipContract,
  type ClaimUnderstandingProviderBoundaryOwnershipContract,
} from "@/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import type { AnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/types";

function currentClaimUnderstandingPolicy(): AnalyzerV2TaskModelPolicy {
  const policy = getAnalyzerV2TaskModelPolicy("claim_understanding_gate1");
  if (!policy) {
    throw new Error("Expected claim_understanding_gate1 model policy to be registered.");
  }
  return policy;
}

function baseContract(
  overrides: Partial<ClaimUnderstandingProviderBoundaryOwnershipContract> = {},
): ClaimUnderstandingProviderBoundaryOwnershipContract {
  const policy = currentClaimUnderstandingPolicy();

  return {
    ownerId: "claim_understanding_provider_boundary_owner",
    ownerModule: "analyzer_v2_runtime_claim_understanding_provider_boundary",
    runtimeMode: "contract_only",
    productReachability: "not_wired_to_product",
    activationApprovalState: "not_requested",
    providerConstruction: {
      allowedSdkImportLocation: "outside_analyzer_v2_only",
      sdkImportState: "not_imported",
      callbackCreationState: "not_created",
      sourceReuse: "clean_room_contract_only",
    },
    policyInput: {
      gatewayTaskId: policy.gatewayTaskId,
      modelTask: policy.modelTask,
      modelPolicyId: policy.policyId,
      modelTier: policy.modelTier,
      providerPolicy: policy.providerPolicy,
      temperature: policy.temperature,
      maxCalls: policy.maxCalls,
      schemaRetryCount: policy.schemaRetryCount,
      timeoutMs: policy.timeoutMs,
      maxOutputTokens: policy.maxOutputTokens,
      approvalStatus: policy.approval.status,
    },
    configSnapshotContract: {
      source: "v2_task_policy_snapshot",
      configSnapshotHashState: "required_before_wiring",
      providerState: "required_before_wiring",
      modelNameState: "required_before_wiring",
    },
    inputScope: {
      directText: "allowed_future",
      acsPreparedSnapshot: "blocked",
      directUrl: "blocked",
    },
    outputContract: {
      providerCallResponse: "raw_output_plus_adapter_telemetry",
      telemetry: {
        providerId: "required",
        modelId: "required",
        tokenUsage: "required",
        durationMs: "required",
      },
      cacheIo: "forbidden",
      publicSurface: "internal_only",
    },
    ...overrides,
  };
}

describe("Analyzer V2 runtime Claim Understanding provider ownership contract", () => {
  it("accepts only an inert direct-text ownership contract before provider factory wiring", () => {
    const contract = baseContract();
    const result = validateClaimUnderstandingProviderBoundaryOwnershipContract(contract);

    expect(result).toEqual({
      status: "contract_satisfied",
      contractVersion: CLAIM_UNDERSTANDING_PROVIDER_BOUNDARY_CONTRACT_VERSION,
      contract,
      blockedReasons: [],
    });
    expect(result.contract.policyInput).toMatchObject({
      gatewayTaskId: "claim_understanding_gate1",
      modelTask: "understand",
      providerPolicy: "from_config_snapshot",
      temperature: 0.15,
      maxCalls: 2,
      schemaRetryCount: 1,
    });
  });

  it("blocks product reachability, approval, SDK import, and callback creation", () => {
    const result = validateClaimUnderstandingProviderBoundaryOwnershipContract(baseContract({
      productReachability: "wired_to_product",
      activationApprovalState: "approved_for_wiring",
      providerConstruction: {
        allowedSdkImportLocation: "outside_analyzer_v2_only",
        sdkImportState: "imported",
        callbackCreationState: "created",
        sourceReuse: "clean_room_contract_only",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "product_reachability_enabled",
      "activation_approval_already_granted",
      "provider_sdk_imported",
      "provider_callback_created",
    ]));
  });

  it("blocks legacy provider reuse and legacy pipeline config ownership", () => {
    const result = validateClaimUnderstandingProviderBoundaryOwnershipContract(baseContract({
      providerConstruction: {
        allowedSdkImportLocation: "outside_analyzer_v2_only",
        sdkImportState: "not_imported",
        callbackCreationState: "not_created",
        sourceReuse: "v1_or_legacy_reuse",
      },
      configSnapshotContract: {
        source: "legacy_pipeline_config",
        configSnapshotHashState: "required_before_wiring",
        providerState: "required_before_wiring",
        modelNameState: "required_before_wiring",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "legacy_provider_reuse_allowed",
      "config_snapshot_source_not_v2",
    ]));
  });

  it("blocks non-direct-text scope, cache IO, and public exposure", () => {
    const result = validateClaimUnderstandingProviderBoundaryOwnershipContract(baseContract({
      inputScope: {
        directText: "allowed_future",
        acsPreparedSnapshot: "blocked",
        directUrl: "allowed" as never,
      },
      outputContract: {
        providerCallResponse: "raw_output_plus_adapter_telemetry",
        telemetry: {
          providerId: "required",
          modelId: "required",
          tokenUsage: "required",
          durationMs: "required",
        },
        cacheIo: "allowed" as never,
        publicSurface: "public_exposed" as never,
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "input_scope_not_direct_text_only",
      "cache_io_enabled",
      "public_surface_exposed",
    ]));
  });

  it("blocks the wrong gateway task and invalid retry budget", () => {
    const result = validateClaimUnderstandingProviderBoundaryOwnershipContract(baseContract({
      policyInput: {
        ...baseContract().policyInput,
        gatewayTaskId: "verdict_debate",
        modelTask: "verdict",
        maxCalls: 1,
        schemaRetryCount: 1,
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "policy_input_not_claim_understanding",
      "policy_values_invalid",
    ]));
  });

  it("requires complete adapter telemetry ownership before future wiring", () => {
    const result = validateClaimUnderstandingProviderBoundaryOwnershipContract(baseContract({
      outputContract: {
        providerCallResponse: "raw_output_plus_adapter_telemetry",
        telemetry: {
          providerId: "required",
          modelId: "required",
          tokenUsage: "optional" as never,
          durationMs: "required",
        },
        cacheIo: "forbidden",
        publicSurface: "internal_only",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["telemetry_contract_incomplete"]);
  });
});
