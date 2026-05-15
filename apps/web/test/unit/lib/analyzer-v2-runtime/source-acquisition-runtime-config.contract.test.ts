import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_RUNTIME_CONFIG_CONTRACT_VERSION,
  validateSourceAcquisitionRuntimeConfigContract,
  type SourceAcquisitionRuntimeConfigContract,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-config.contract";

function baseContract(
  overrides: Partial<SourceAcquisitionRuntimeConfigContract> = {},
): SourceAcquisitionRuntimeConfigContract {
  return {
    ownerId: "source_acquisition_runtime_config_owner",
    ownerModule: "analyzer_v2_runtime_source_acquisition_runtime_config",
    runtimeMode: "authority_contract_only",
    productReachability: "not_wired_to_product",
    configSnapshot: {
      source: "v2_task_policy_snapshot",
      freezeLocation: "runtime_owner_contract",
      configSnapshotHashState: "required_before_7n3b",
      providerAllowlistSnapshotHashState: "required_before_7n3b",
      budgetSnapshotHashState: "required_before_7n3b",
      authorityCreation: "runtime_owner_factory_only",
    },
    authorityCapability: {
      runtimeBrand: "module_private_weakset_membership_required",
      copiedObjectBehavior: "rejected",
      jsonRoundTripBehavior: "rejected",
      controlledHarnessBehavior: "not_valid_runtime_authority",
    },
    executionBoundary: {
      concreteProviderIo: "forbidden",
      providerSdkImport: "forbidden",
      searchFetchProviderImport: "forbidden",
      directFetch: "forbidden",
      networkParserImport: "forbidden",
      cacheRead: "forbidden",
      cacheWrite: "forbidden",
      durableStorage: "forbidden",
      sourceReliability: "forbidden",
      productRuntime: "forbidden",
      publicExposure: "forbidden",
      liveJobs: "forbidden",
    },
    inputScope: {
      queryText: "upstream_query_text_only",
      sourceLanguagePolicy: "upstream_policy_only",
      acsPreparedSnapshot: "blocked",
      directUrl: "blocked",
    },
    budgetSnapshot: {
      providerAllowlist: "required_before_7n3b",
      queryCount: "required_before_7n3b",
      perQueryAttemptLimit: "required_before_7n3b",
      candidateCap: "required_before_7n3b",
      contentPacketCap: "required_before_7n3b",
      byteCap: "required_before_7n3b",
      timeout: "required_before_7n3b",
      retryPolicy: "none",
      cancellationState: "required_before_7n3b",
      partialExecutionSemantics: "structural_stop_reason_only",
    },
    hiddenArtifact: {
      visibility: "internal_only",
      publicPointerExposure: "forbidden",
      rawContentStorage: "forbidden",
      evidenceCorpusPopulation: "forbidden",
    },
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition runtime config contract", () => {
  it("accepts a 7N-3A authority-contract-only config boundary", () => {
    const contract = baseContract();
    const result = validateSourceAcquisitionRuntimeConfigContract(contract);

    expect(result).toEqual({
      status: "contract_satisfied",
      contractVersion: SOURCE_ACQUISITION_RUNTIME_CONFIG_CONTRACT_VERSION,
      contract,
      blockedReasons: [],
    });
  });

  it("blocks product reachability and executable source-IO runtime mode", () => {
    const result = validateSourceAcquisitionRuntimeConfigContract(baseContract({
      runtimeMode: "source_io_runtime",
      productReachability: "wired_to_product",
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "runtime_mode_not_authority_contract_only",
      "product_reachability_enabled",
    ]));
  });

  it("requires V2 task-policy provenance, runtime-owner creation, and full traceability", () => {
    const result = validateSourceAcquisitionRuntimeConfigContract(baseContract({
      configSnapshot: {
        source: "legacy_pipeline_config",
        freezeLocation: "none",
        configSnapshotHashState: "missing",
        providerAllowlistSnapshotHashState: "required_before_7n3b",
        budgetSnapshotHashState: "missing",
        authorityCreation: "plain_object_marker",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "config_snapshot_source_invalid",
      "config_snapshot_not_runtime_owned",
      "config_snapshot_traceability_incomplete",
    ]));
  });

  it("requires a non-serializable authority and rejects controlled-harness authorization", () => {
    const result = validateSourceAcquisitionRuntimeConfigContract(baseContract({
      authorityCapability: {
        runtimeBrand: "serializable_flag",
        copiedObjectBehavior: "accepted",
        jsonRoundTripBehavior: "accepted",
        controlledHarnessBehavior: "valid_runtime_authority",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["authority_capability_serializable_or_spoofable"]);
  });

  it("blocks concrete IO, cache, Source Reliability, product, public, and live-job execution", () => {
    const result = validateSourceAcquisitionRuntimeConfigContract(baseContract({
      executionBoundary: {
        concreteProviderIo: "allowed",
        providerSdkImport: "allowed",
        searchFetchProviderImport: "allowed",
        directFetch: "allowed",
        networkParserImport: "allowed",
        cacheRead: "allowed",
        cacheWrite: "allowed",
        durableStorage: "allowed",
        sourceReliability: "allowed",
        productRuntime: "allowed",
        publicExposure: "allowed",
        liveJobs: "allowed",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["execution_boundary_enabled"]);
  });

  it("blocks non-query-plan input scope, incomplete budgets, and public artifacts", () => {
    const result = validateSourceAcquisitionRuntimeConfigContract(baseContract({
      inputScope: {
        queryText: "upstream_query_text_only",
        sourceLanguagePolicy: "upstream_policy_only",
        acsPreparedSnapshot: "blocked",
        directUrl: "allowed" as never,
      },
      budgetSnapshot: {
        providerAllowlist: "missing",
        queryCount: "required_before_7n3b",
        perQueryAttemptLimit: "missing",
        candidateCap: "required_before_7n3b",
        contentPacketCap: "required_before_7n3b",
        byteCap: "required_before_7n3b",
        timeout: "missing",
        retryPolicy: "none",
        cancellationState: "required_before_7n3b",
        partialExecutionSemantics: "structural_stop_reason_only",
      },
      hiddenArtifact: {
        visibility: "public",
        publicPointerExposure: "allowed",
        rawContentStorage: "allowed",
        evidenceCorpusPopulation: "allowed",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "input_scope_not_query_plan_only",
      "budget_snapshot_incomplete",
      "hidden_artifact_public_or_durable",
    ]));
  });
});
