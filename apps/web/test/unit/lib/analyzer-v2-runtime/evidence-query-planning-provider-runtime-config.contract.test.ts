import { describe, expect, it } from "vitest";
import {
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS,
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE,
  buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot,
  validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot,
  type EvidenceQueryPlanningProviderRuntimeConfigSnapshot,
} from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract";
import { EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import type { AnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/types";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

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
    modelId: "claude-haiku-4-5-20251001",
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

describe("Analyzer V2 Evidence Query Planning provider runtime config contract", () => {
  it("accepts the X7-S hidden direct-text provider runtime snapshot", () => {
    const snapshot = baseSnapshot();

    expect(validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(snapshot)).toEqual({
      status: "contract_satisfied",
      contractVersion: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
      snapshot,
      blockedReasons: [],
    });
  });

  it("accepts a factory-only snapshot without product wiring", () => {
    const snapshot = baseSnapshot({
      executionState: "factory_only_not_product_wired",
    });

    expect(validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(snapshot).status).toBe("contract_satisfied");
  });

  it("rejects ad hoc authority, placeholders, wrong activation, and wrong package approval pointer", () => {
    const result = validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(baseSnapshot({
      source: "caller_supplied_ad_hoc",
      providerId: "unknown",
      modelId: "placeholder",
      configSnapshotAuthority: "caller_ad_hoc",
      configSnapshotHash: "todo",
      activationProfileId: "v2.claim-understanding.hidden-direct-text.4c3b" as never,
      activationStatus: "kill_switch_closed",
      approvalPointer: {
        sourcePackage: "Docs/WIP/other.md" as never,
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "source_not_v2_task_policy_snapshot",
      "provider_or_model_identity_invalid",
      "config_snapshot_authority_invalid",
      "config_snapshot_hash_invalid",
      "activation_profile_invalid",
      "activation_status_not_enabled",
      "approval_pointer_invalid",
    ]));
  });

  it("does not build an executable provider snapshot from a closed X7-S activation context", () => {
    const closedContext = buildClaimBoundaryV2RunContext({
      runIdHint: "job-v2-x7s-closed-config",
      submitted: {
        kind: "text",
        value: "Using hydrogen for cars is more efficient than using electricity",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: ["AC_001"],
    });
    const openContext = buildClaimBoundaryV2RunContext(
      {
        runIdHint: "job-v2-x7s-open-config",
        submitted: {
          kind: "text",
          value: "Using hydrogen for cars is more efficient than using electricity",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: ["AC_001"],
      },
      { queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text" },
    );

    expect(buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot(closedContext)).toBeNull();
    const openSnapshot = buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot(openContext);
    expect(openSnapshot?.activationStatus).toBe("enabled_hidden_direct_text");
    expect(validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(openSnapshot!)).toMatchObject({
      status: "contract_satisfied",
      blockedReasons: [],
    });
  });

  it("rejects non-X7-S task or policy values", () => {
    const result = validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(baseSnapshot({
      gatewayTaskId: "claim_understanding_gate1",
      modelPolicyId: "v2.model.claim_understanding_gate1.0",
      temperature: 0.2,
      maxCalls: 2,
      schemaRetryCount: 1,
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "task_not_evidence_query_planning",
      "policy_values_invalid",
    ]));
  });

  it("rejects public execution, wrong factory imports, repairs, public output, and cache IO", () => {
    const result = validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(baseSnapshot({
      executionState: "execution_approved_public",
      configSnapshotAuthority: "factory_reads_config_storage",
      providerConstruction: {
        sdkImportState: "imported",
        callbackCreationState: "created",
        factorySource: {
          filePath: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
          allowedSdkSpecifiers: ["ai"],
          configSnapshotAuthority: "factory_reads_config_storage",
        },
      },
      retrySemantics: {
        owner: "model_adapter_one_call_no_retry",
        promptMutation: "allowed",
        semanticRepair: "allowed",
        modelEscalation: "allowed",
        fallbackProvider: "allowed",
      },
      inputScope: {
        directText: "allowed_hidden",
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
      "config_snapshot_authority_invalid",
      "execution_authority_public",
      "provider_construction_invalid",
      "retry_semantics_not_one_call_no_retry",
      "input_scope_not_hidden_direct_text_only",
      "cache_io_enabled",
      "public_surface_exposed",
      "provider_failure_mapping_invalid",
    ]));
  });
});
