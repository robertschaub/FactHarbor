import { describe, expect, it } from "vitest";
import {
  CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_CONTRACT_VERSION,
  validateClaimUnderstandingRuntimeActivationContract,
  type ClaimUnderstandingRuntimeActivationContract,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation.contract";

function baseContract(
  overrides: Partial<ClaimUnderstandingRuntimeActivationContract> = {},
): ClaimUnderstandingRuntimeActivationContract {
  return {
    ownerId: "claim_understanding_runtime_activation_owner",
    ownerModule: "analyzer_v2_runtime_claim_understanding_runtime_activation",
    runtimeMode: "activation_contract_only",
    productReachability: "not_wired_to_product",
    activationSnapshot: {
      source: "v2_task_policy_snapshot",
      freezeLocation: "pipeline_run_context",
      suppliedBy: "product_owned_activation_authority",
      hashState: "required_before_wiring",
      approvalPointerState: "required_before_wiring",
      configProfileHashState: "required_before_wiring",
      rollbackTargetState: "required_before_wiring",
    },
    policyScope: {
      gatewayTaskId: "claim_understanding_gate1",
      modelTask: "understand",
      promptProfile: "claimboundary-v2",
      promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
      approvalStatus: "missing",
    },
    activationBehavior: {
      providerFactoryImport: "forbidden",
      providerFactoryInvocation: "forbidden",
      runtimeDispatchImport: "forbidden",
      promptRendering: "forbidden",
      modelCall: "forbidden",
      approvalMutation: "forbidden",
      executableGatewayConstruction: "forbidden",
      cacheIo: "forbidden",
    },
    inputScope: {
      directText: "allowed_future",
      acsPreparedSnapshot: "blocked",
      directUrl: "blocked",
    },
    hiddenArtifact: {
      sinkSelection: "deferred_until_4c3b",
      sinkKind: "none_contract_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      inspectability: {
        provenance: "required",
        providerTelemetry: "required",
        schemaOutcome: "required",
        failureState: "required",
        warningMateriality: "required",
      },
    },
    killSwitch: {
      state: "contract_only_not_wired",
      disabledBehavior: "fail_closed_to_v2_damaged_envelope",
      afterActivationFallback: "forbid_v1_fallback_after_activation",
    },
    publicSurface: {
      api: "unchanged",
      ui: "unchanged",
      report: "unchanged",
      export: "unchanged",
      compatibilityView: "unchanged",
    },
    liveJobState: "forbidden",
    v1CleanupState: "forbidden",
    ...overrides,
  };
}

describe("Analyzer V2 Claim Understanding runtime activation contract", () => {
  it("accepts an inert activation-authority contract with no selected hidden artifact sink", () => {
    const contract = baseContract();
    const result = validateClaimUnderstandingRuntimeActivationContract(contract);

    expect(result).toEqual({
      status: "contract_satisfied",
      contractVersion: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_CONTRACT_VERSION,
      contract,
      blockedReasons: [],
    });
  });

  it("accepts a future non-public hidden artifact sink selection without enabling product wiring", () => {
    const contract = baseContract({
      hiddenArtifact: {
        sinkSelection: "selected_for_4c3b",
        sinkKind: "v2_observability_ledger",
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        inspectability: {
          provenance: "required",
          providerTelemetry: "required",
          schemaOutcome: "required",
          failureState: "required",
          warningMateriality: "required",
        },
      },
      killSwitch: {
        state: "required_before_wiring",
        disabledBehavior: "fail_closed_to_v2_damaged_envelope",
        afterActivationFallback: "forbid_v1_fallback_after_activation",
      },
    });

    const result = validateClaimUnderstandingRuntimeActivationContract(contract);

    expect(result.status).toBe("contract_satisfied");
    expect(result.contract.hiddenArtifact).toMatchObject({
      sinkSelection: "selected_for_4c3b",
      sinkKind: "v2_observability_ledger",
      visibility: "internal_admin_only",
    });
  });

  it("rejects product activation mode and product reachability", () => {
    const result = validateClaimUnderstandingRuntimeActivationContract(baseContract({
      runtimeMode: "product_activation",
      productReachability: "wired_to_product",
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "runtime_mode_not_contract_only",
      "product_reachability_enabled",
    ]));
  });

  it("rejects caller, environment, test, legacy, missing, or non-frozen activation authority", () => {
    const result = validateClaimUnderstandingRuntimeActivationContract(baseContract({
      activationSnapshot: {
        source: "caller_supplied",
        freezeLocation: "stage_local",
        suppliedBy: "caller",
        hashState: "missing",
        approvalPointerState: "not_required",
        configProfileHashState: "required_before_wiring",
        rollbackTargetState: "missing",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "activation_snapshot_source_invalid",
      "activation_snapshot_not_frozen_in_run_context",
      "activation_snapshot_supplier_invalid",
      "activation_snapshot_traceability_incomplete",
    ]));
  });

  it("rejects non-Claim Understanding policy scope", () => {
    const result = validateClaimUnderstandingRuntimeActivationContract(baseContract({
      policyScope: {
        gatewayTaskId: "verdict_debate",
        modelTask: "verdict",
        promptProfile: "claimboundary-v2",
        promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
        approvalStatus: "approved",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["policy_scope_not_claim_understanding_gate1"]);
  });

  it("rejects provider factory, dispatch, prompt/model, approval, and cache activation", () => {
    const result = validateClaimUnderstandingRuntimeActivationContract(baseContract({
      activationBehavior: {
        providerFactoryImport: "allowed",
        providerFactoryInvocation: "allowed",
        runtimeDispatchImport: "allowed",
        promptRendering: "allowed",
        modelCall: "allowed",
        approvalMutation: "allowed",
        executableGatewayConstruction: "allowed",
        cacheIo: "allowed",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "provider_factory_reachable",
      "runtime_dispatch_reachable",
      "prompt_or_model_execution_enabled",
      "approval_or_executable_gateway_enabled",
      "cache_io_enabled",
    ]));
  });

  it("rejects ACS and direct URL runtime activation", () => {
    const result = validateClaimUnderstandingRuntimeActivationContract(baseContract({
      inputScope: {
        directText: "allowed_future",
        acsPreparedSnapshot: "allowed",
        directUrl: "allowed",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["input_scope_not_direct_text_only"]);
  });

  it("rejects public or under-inspectable hidden artifacts", () => {
    const result = validateClaimUnderstandingRuntimeActivationContract(baseContract({
      hiddenArtifact: {
        sinkSelection: "public_result",
        sinkKind: "public_result",
        visibility: "public",
        publicPointerExposure: "allowed",
        inspectability: {
          provenance: "required",
          providerTelemetry: "missing",
          schemaOutcome: "required",
          failureState: "missing",
          warningMateriality: "required",
        },
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "hidden_artifact_sink_public",
      "hidden_artifact_inspectability_incomplete",
    ]));
  });

  it("rejects V1 fallback, public surfaces, live jobs, and V1 cleanup", () => {
    const result = validateClaimUnderstandingRuntimeActivationContract(baseContract({
      killSwitch: {
        state: "missing",
        disabledBehavior: "silent_v1_fallback",
        afterActivationFallback: "allow_v1_fallback",
      },
      publicSurface: {
        api: "exposed",
        ui: "exposed",
        report: "exposed",
        export: "exposed",
        compatibilityView: "exposed",
      },
      liveJobState: "allowed",
      v1CleanupState: "allowed",
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "kill_switch_not_fail_closed",
      "public_surface_exposed",
      "live_jobs_enabled",
      "v1_cleanup_enabled",
    ]));
  });

  it("rejects invalid owner identity", () => {
    const result = validateClaimUnderstandingRuntimeActivationContract(baseContract({
      ownerId: "wrong_owner" as never,
      ownerModule: "wrong_module" as never,
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["owner_identity_invalid"]);
  });
});
