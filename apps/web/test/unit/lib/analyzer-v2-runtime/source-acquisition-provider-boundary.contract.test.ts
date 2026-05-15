import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_PROVIDER_BOUNDARY_CONTRACT_VERSION,
  validateSourceAcquisitionProviderBoundaryContract,
  type SourceAcquisitionProviderBoundaryContract,
} from "@/lib/analyzer-v2-runtime/source-acquisition-provider-boundary.contract";

function baseContract(
  overrides: Partial<SourceAcquisitionProviderBoundaryContract> = {},
): SourceAcquisitionProviderBoundaryContract {
  return {
    ownerId: "source_acquisition_provider_boundary_owner",
    ownerModule: "analyzer_v2_runtime_source_acquisition_provider_boundary",
    runtimeMode: "boundary_contract_only",
    productReachability: "not_wired_to_product",
    providerConstruction: {
      ownerNamespace: "analyzer_v2_runtime_only",
      sdkImportState: "not_imported",
      callbackCreationState: "not_created",
      sourceReuse: "clean_room_contract_only",
      factorySource: {
        filePath: "none_contract_only",
        allowedProviderSdkSpecifiers: [],
        searchFetchProviderReuse: "forbidden",
        networkParserImports: "forbidden",
        configAuthority: "supplied_validated_source_acquisition_runtime_config_only",
      },
    },
    providerInput: {
      queryText: "upstream_query_text_only",
      retrievalPolicyKey: "upstream_policy_key_only",
      sourceLanguagePolicy: "upstream_policy_only",
      acsPreparedSnapshot: "blocked",
      directUrl: "blocked",
    },
    outputContract: {
      candidateRecords: "opaque_candidate_ids_only",
      contentPackets: "opaque_non_durable_not_dereferenceable_by_structural_core",
      rawProviderPayload: "forbidden",
      semanticFields: "forbidden",
      sourceReliability: "forbidden",
      cacheIo: "forbidden",
      publicSurface: "internal_only",
    },
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition provider boundary contract", () => {
  it("accepts an inert clean-room provider boundary contract for 7N-3A", () => {
    const contract = baseContract();
    const result = validateSourceAcquisitionProviderBoundaryContract(contract);

    expect(result).toEqual({
      status: "contract_satisfied",
      contractVersion: SOURCE_ACQUISITION_PROVIDER_BOUNDARY_CONTRACT_VERSION,
      contract,
      blockedReasons: [],
    });
  });

  it("blocks source-IO factory mode and product reachability", () => {
    const result = validateSourceAcquisitionProviderBoundaryContract(baseContract({
      runtimeMode: "source_io_factory_future",
      productReachability: "wired_to_product",
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "runtime_mode_not_boundary_contract_only",
      "product_reachability_enabled",
    ]));
  });

  it("blocks provider construction, provider reuse, search/fetch reuse, and config reads", () => {
    const result = validateSourceAcquisitionProviderBoundaryContract(baseContract({
      providerConstruction: {
        ownerNamespace: "analyzer_v2_core",
        sdkImportState: "imported",
        callbackCreationState: "created",
        sourceReuse: "v1_or_legacy_reuse",
        factorySource: {
          filePath: "none_contract_only",
          allowedProviderSdkSpecifiers: ["ai"] as never,
          searchFetchProviderReuse: "allowed",
          networkParserImports: "allowed",
          configAuthority: "factory_reads_config_storage",
        },
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "provider_construction_enabled",
      "legacy_or_v1_reuse_allowed",
      "config_authority_invalid",
    ]));
  });

  it("blocks ACS and direct URL inputs before a separate gate", () => {
    const result = validateSourceAcquisitionProviderBoundaryContract(baseContract({
      providerInput: {
        queryText: "upstream_query_text_only",
        retrievalPolicyKey: "upstream_policy_key_only",
        sourceLanguagePolicy: "upstream_policy_only",
        acsPreparedSnapshot: "blocked",
        directUrl: "allowed" as never,
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["input_scope_not_query_plan_only"]);
  });

  it("blocks raw content, semantic fields, Source Reliability, cache, and public exposure", () => {
    const result = validateSourceAcquisitionProviderBoundaryContract(baseContract({
      outputContract: {
        candidateRecords: "opaque_candidate_ids_only",
        contentPackets: "raw_content" as never,
        rawProviderPayload: "allowed" as never,
        semanticFields: "allowed",
        sourceReliability: "allowed",
        cacheIo: "allowed",
        publicSurface: "public_exposed",
      },
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "output_contract_not_hidden_structural_only",
      "semantic_or_source_reliability_enabled",
      "cache_io_enabled",
      "public_surface_exposed",
    ]));
  });
});
