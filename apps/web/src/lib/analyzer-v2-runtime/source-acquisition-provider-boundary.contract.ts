export const SOURCE_ACQUISITION_PROVIDER_BOUNDARY_CONTRACT_VERSION =
  "v2.source-acquisition.provider-boundary.7n3a";

type RuntimePermission = "forbidden" | "allowed";

export type SourceAcquisitionProviderBoundaryContract = {
  ownerId: "source_acquisition_provider_boundary_owner";
  ownerModule: "analyzer_v2_runtime_source_acquisition_provider_boundary";
  runtimeMode: "boundary_contract_only" | "source_io_factory_future";
  productReachability: "not_wired_to_product" | "wired_to_product";
  providerConstruction: {
    ownerNamespace: "analyzer_v2_runtime_only" | "analyzer_v2_core";
    sdkImportState: "not_imported" | "imported";
    callbackCreationState: "not_created" | "created";
    sourceReuse: "clean_room_contract_only" | "v1_or_legacy_reuse";
    factorySource: {
      filePath: "none_contract_only";
      allowedProviderSdkSpecifiers: readonly [];
      searchFetchProviderReuse: RuntimePermission;
      networkParserImports: RuntimePermission;
      configAuthority:
        | "supplied_validated_source_acquisition_runtime_config_only"
        | "factory_reads_config_storage"
        | "caller_ad_hoc";
    };
  };
  providerInput: {
    queryText: "upstream_query_text_only";
    retrievalPolicyKey: "upstream_policy_key_only";
    sourceLanguagePolicy: "upstream_policy_only";
    acsPreparedSnapshot: "blocked";
    directUrl: "blocked";
  };
  outputContract: {
    candidateRecords: "opaque_candidate_ids_only";
    contentPackets: "opaque_non_durable_not_dereferenceable_by_structural_core";
    rawProviderPayload: "forbidden";
    semanticFields: RuntimePermission;
    sourceReliability: RuntimePermission;
    cacheIo: RuntimePermission;
    publicSurface: "internal_only" | "public_exposed";
  };
};

export type SourceAcquisitionProviderBoundaryBlockedReason =
  | "owner_identity_invalid"
  | "runtime_mode_not_boundary_contract_only"
  | "product_reachability_enabled"
  | "provider_construction_enabled"
  | "legacy_or_v1_reuse_allowed"
  | "factory_source_invalid"
  | "config_authority_invalid"
  | "input_scope_not_query_plan_only"
  | "output_contract_not_hidden_structural_only"
  | "semantic_or_source_reliability_enabled"
  | "cache_io_enabled"
  | "public_surface_exposed";

export type SourceAcquisitionProviderBoundaryValidationResult =
  | {
      status: "contract_satisfied";
      contractVersion: typeof SOURCE_ACQUISITION_PROVIDER_BOUNDARY_CONTRACT_VERSION;
      contract: SourceAcquisitionProviderBoundaryContract;
      blockedReasons: [];
    }
  | {
      status: "blocked";
      contractVersion: typeof SOURCE_ACQUISITION_PROVIDER_BOUNDARY_CONTRACT_VERSION;
      contract: SourceAcquisitionProviderBoundaryContract;
      blockedReasons: SourceAcquisitionProviderBoundaryBlockedReason[];
    };

function addReason(
  reasons: SourceAcquisitionProviderBoundaryBlockedReason[],
  reason: SourceAcquisitionProviderBoundaryBlockedReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function providerConstructionIsInert(
  construction: SourceAcquisitionProviderBoundaryContract["providerConstruction"],
): boolean {
  return construction.ownerNamespace === "analyzer_v2_runtime_only"
    && construction.sdkImportState === "not_imported"
    && construction.callbackCreationState === "not_created"
    && construction.sourceReuse === "clean_room_contract_only"
    && construction.factorySource.filePath === "none_contract_only"
    && construction.factorySource.allowedProviderSdkSpecifiers.length === 0
    && construction.factorySource.searchFetchProviderReuse === "forbidden"
    && construction.factorySource.networkParserImports === "forbidden";
}

function inputScopeIsUpstreamOnly(
  providerInput: SourceAcquisitionProviderBoundaryContract["providerInput"],
): boolean {
  return providerInput.queryText === "upstream_query_text_only"
    && providerInput.retrievalPolicyKey === "upstream_policy_key_only"
    && providerInput.sourceLanguagePolicy === "upstream_policy_only"
    && providerInput.acsPreparedSnapshot === "blocked"
    && providerInput.directUrl === "blocked";
}

function outputIsHiddenStructuralOnly(
  outputContract: SourceAcquisitionProviderBoundaryContract["outputContract"],
): boolean {
  return outputContract.candidateRecords === "opaque_candidate_ids_only"
    && outputContract.contentPackets === "opaque_non_durable_not_dereferenceable_by_structural_core"
    && outputContract.rawProviderPayload === "forbidden";
}

function collectBlockedReasons(
  contract: SourceAcquisitionProviderBoundaryContract,
): SourceAcquisitionProviderBoundaryBlockedReason[] {
  const reasons: SourceAcquisitionProviderBoundaryBlockedReason[] = [];

  if (
    contract.ownerId !== "source_acquisition_provider_boundary_owner"
    || contract.ownerModule !== "analyzer_v2_runtime_source_acquisition_provider_boundary"
  ) {
    addReason(reasons, "owner_identity_invalid");
  }

  if (contract.runtimeMode !== "boundary_contract_only") {
    addReason(reasons, "runtime_mode_not_boundary_contract_only");
  }

  if (contract.productReachability !== "not_wired_to_product") {
    addReason(reasons, "product_reachability_enabled");
  }

  if (!providerConstructionIsInert(contract.providerConstruction)) {
    addReason(reasons, "provider_construction_enabled");
  }

  if (contract.providerConstruction.sourceReuse !== "clean_room_contract_only") {
    addReason(reasons, "legacy_or_v1_reuse_allowed");
  }

  if (contract.providerConstruction.factorySource.filePath !== "none_contract_only") {
    addReason(reasons, "factory_source_invalid");
  }

  if (
    contract.providerConstruction.factorySource.configAuthority
    !== "supplied_validated_source_acquisition_runtime_config_only"
  ) {
    addReason(reasons, "config_authority_invalid");
  }

  if (!inputScopeIsUpstreamOnly(contract.providerInput)) {
    addReason(reasons, "input_scope_not_query_plan_only");
  }

  if (!outputIsHiddenStructuralOnly(contract.outputContract)) {
    addReason(reasons, "output_contract_not_hidden_structural_only");
  }

  if (
    contract.outputContract.semanticFields !== "forbidden"
    || contract.outputContract.sourceReliability !== "forbidden"
  ) {
    addReason(reasons, "semantic_or_source_reliability_enabled");
  }

  if (contract.outputContract.cacheIo !== "forbidden") {
    addReason(reasons, "cache_io_enabled");
  }

  if (contract.outputContract.publicSurface !== "internal_only") {
    addReason(reasons, "public_surface_exposed");
  }

  return reasons;
}

export function validateSourceAcquisitionProviderBoundaryContract(
  contract: SourceAcquisitionProviderBoundaryContract,
): SourceAcquisitionProviderBoundaryValidationResult {
  const blockedReasons = collectBlockedReasons(contract);

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      contractVersion: SOURCE_ACQUISITION_PROVIDER_BOUNDARY_CONTRACT_VERSION,
      contract,
      blockedReasons,
    };
  }

  return {
    status: "contract_satisfied",
    contractVersion: SOURCE_ACQUISITION_PROVIDER_BOUNDARY_CONTRACT_VERSION,
    contract,
    blockedReasons: [],
  };
}
