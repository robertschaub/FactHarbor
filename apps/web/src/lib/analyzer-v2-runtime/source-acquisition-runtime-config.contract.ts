export const SOURCE_ACQUISITION_RUNTIME_CONFIG_CONTRACT_VERSION =
  "v2.source-acquisition.runtime-config.7n3a";

type RequiredBeforeSourceIoState = "required_before_7n3b" | "missing";
type RuntimePermission = "forbidden" | "allowed";

export type SourceAcquisitionRuntimeConfigContract = {
  ownerId: "source_acquisition_runtime_config_owner";
  ownerModule: "analyzer_v2_runtime_source_acquisition_runtime_config";
  runtimeMode: "authority_contract_only" | "source_io_runtime";
  productReachability: "not_wired_to_product" | "wired_to_product";
  configSnapshot: {
    source: "v2_task_policy_snapshot" | "caller_ad_hoc" | "legacy_pipeline_config" | "missing";
    freezeLocation: "runtime_owner_contract" | "pipeline_run_context" | "none";
    configSnapshotHashState: RequiredBeforeSourceIoState;
    providerAllowlistSnapshotHashState: RequiredBeforeSourceIoState;
    budgetSnapshotHashState: RequiredBeforeSourceIoState;
    authorityCreation: "runtime_owner_factory_only" | "plain_object_marker" | "request_field";
  };
  authorityCapability: {
    runtimeBrand: "module_private_weakset_membership_required" | "serializable_flag";
    copiedObjectBehavior: "rejected" | "accepted";
    jsonRoundTripBehavior: "rejected" | "accepted";
    controlledHarnessBehavior: "not_valid_runtime_authority" | "valid_runtime_authority";
  };
  executionBoundary: {
    concreteProviderIo: RuntimePermission;
    providerSdkImport: RuntimePermission;
    searchFetchProviderImport: RuntimePermission;
    directFetch: RuntimePermission;
    networkParserImport: RuntimePermission;
    cacheRead: RuntimePermission;
    cacheWrite: RuntimePermission;
    durableStorage: RuntimePermission;
    sourceReliability: RuntimePermission;
    productRuntime: RuntimePermission;
    publicExposure: RuntimePermission;
    liveJobs: RuntimePermission;
  };
  inputScope: {
    queryText: "upstream_query_text_only";
    sourceLanguagePolicy: "upstream_policy_only";
    acsPreparedSnapshot: "blocked";
    directUrl: "blocked";
  };
  budgetSnapshot: {
    providerAllowlist: RequiredBeforeSourceIoState;
    queryCount: RequiredBeforeSourceIoState;
    perQueryAttemptLimit: RequiredBeforeSourceIoState;
    candidateCap: RequiredBeforeSourceIoState;
    contentPacketCap: RequiredBeforeSourceIoState;
    byteCap: RequiredBeforeSourceIoState;
    timeout: RequiredBeforeSourceIoState;
    retryPolicy: "none";
    cancellationState: RequiredBeforeSourceIoState;
    partialExecutionSemantics: "structural_stop_reason_only";
  };
  hiddenArtifact: {
    visibility: "internal_only" | "public";
    publicPointerExposure: RuntimePermission;
    rawContentStorage: RuntimePermission;
    evidenceCorpusPopulation: RuntimePermission;
  };
};

export type SourceAcquisitionRuntimeConfigBlockedReason =
  | "owner_identity_invalid"
  | "runtime_mode_not_authority_contract_only"
  | "product_reachability_enabled"
  | "config_snapshot_source_invalid"
  | "config_snapshot_not_runtime_owned"
  | "config_snapshot_traceability_incomplete"
  | "authority_capability_serializable_or_spoofable"
  | "execution_boundary_enabled"
  | "input_scope_not_query_plan_only"
  | "budget_snapshot_incomplete"
  | "hidden_artifact_public_or_durable";

export type SourceAcquisitionRuntimeConfigValidationResult =
  | {
      status: "contract_satisfied";
      contractVersion: typeof SOURCE_ACQUISITION_RUNTIME_CONFIG_CONTRACT_VERSION;
      contract: SourceAcquisitionRuntimeConfigContract;
      blockedReasons: [];
    }
  | {
      status: "blocked";
      contractVersion: typeof SOURCE_ACQUISITION_RUNTIME_CONFIG_CONTRACT_VERSION;
      contract: SourceAcquisitionRuntimeConfigContract;
      blockedReasons: SourceAcquisitionRuntimeConfigBlockedReason[];
    };

function addReason(
  reasons: SourceAcquisitionRuntimeConfigBlockedReason[],
  reason: SourceAcquisitionRuntimeConfigBlockedReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function hasCompleteConfigTraceability(
  snapshot: SourceAcquisitionRuntimeConfigContract["configSnapshot"],
): boolean {
  return snapshot.configSnapshotHashState === "required_before_7n3b"
    && snapshot.providerAllowlistSnapshotHashState === "required_before_7n3b"
    && snapshot.budgetSnapshotHashState === "required_before_7n3b";
}

function hasNonSerializableAuthority(
  authority: SourceAcquisitionRuntimeConfigContract["authorityCapability"],
): boolean {
  return authority.runtimeBrand === "module_private_weakset_membership_required"
    && authority.copiedObjectBehavior === "rejected"
    && authority.jsonRoundTripBehavior === "rejected"
    && authority.controlledHarnessBehavior === "not_valid_runtime_authority";
}

function hasClosedExecutionBoundary(
  boundary: SourceAcquisitionRuntimeConfigContract["executionBoundary"],
): boolean {
  return boundary.concreteProviderIo === "forbidden"
    && boundary.providerSdkImport === "forbidden"
    && boundary.searchFetchProviderImport === "forbidden"
    && boundary.directFetch === "forbidden"
    && boundary.networkParserImport === "forbidden"
    && boundary.cacheRead === "forbidden"
    && boundary.cacheWrite === "forbidden"
    && boundary.durableStorage === "forbidden"
    && boundary.sourceReliability === "forbidden"
    && boundary.productRuntime === "forbidden"
    && boundary.publicExposure === "forbidden"
    && boundary.liveJobs === "forbidden";
}

function hasUpstreamOnlyInputScope(
  inputScope: SourceAcquisitionRuntimeConfigContract["inputScope"],
): boolean {
  return inputScope.queryText === "upstream_query_text_only"
    && inputScope.sourceLanguagePolicy === "upstream_policy_only"
    && inputScope.acsPreparedSnapshot === "blocked"
    && inputScope.directUrl === "blocked";
}

function hasCompleteBudgetSnapshot(
  budget: SourceAcquisitionRuntimeConfigContract["budgetSnapshot"],
): boolean {
  return budget.providerAllowlist === "required_before_7n3b"
    && budget.queryCount === "required_before_7n3b"
    && budget.perQueryAttemptLimit === "required_before_7n3b"
    && budget.candidateCap === "required_before_7n3b"
    && budget.contentPacketCap === "required_before_7n3b"
    && budget.byteCap === "required_before_7n3b"
    && budget.timeout === "required_before_7n3b"
    && budget.retryPolicy === "none"
    && budget.cancellationState === "required_before_7n3b"
    && budget.partialExecutionSemantics === "structural_stop_reason_only";
}

function hasInternalOnlyArtifact(
  hiddenArtifact: SourceAcquisitionRuntimeConfigContract["hiddenArtifact"],
): boolean {
  return hiddenArtifact.visibility === "internal_only"
    && hiddenArtifact.publicPointerExposure === "forbidden"
    && hiddenArtifact.rawContentStorage === "forbidden"
    && hiddenArtifact.evidenceCorpusPopulation === "forbidden";
}

function collectBlockedReasons(
  contract: SourceAcquisitionRuntimeConfigContract,
): SourceAcquisitionRuntimeConfigBlockedReason[] {
  const reasons: SourceAcquisitionRuntimeConfigBlockedReason[] = [];

  if (
    contract.ownerId !== "source_acquisition_runtime_config_owner"
    || contract.ownerModule !== "analyzer_v2_runtime_source_acquisition_runtime_config"
  ) {
    addReason(reasons, "owner_identity_invalid");
  }

  if (contract.runtimeMode !== "authority_contract_only") {
    addReason(reasons, "runtime_mode_not_authority_contract_only");
  }

  if (contract.productReachability !== "not_wired_to_product") {
    addReason(reasons, "product_reachability_enabled");
  }

  if (contract.configSnapshot.source !== "v2_task_policy_snapshot") {
    addReason(reasons, "config_snapshot_source_invalid");
  }

  if (
    contract.configSnapshot.freezeLocation !== "runtime_owner_contract"
    || contract.configSnapshot.authorityCreation !== "runtime_owner_factory_only"
  ) {
    addReason(reasons, "config_snapshot_not_runtime_owned");
  }

  if (!hasCompleteConfigTraceability(contract.configSnapshot)) {
    addReason(reasons, "config_snapshot_traceability_incomplete");
  }

  if (!hasNonSerializableAuthority(contract.authorityCapability)) {
    addReason(reasons, "authority_capability_serializable_or_spoofable");
  }

  if (!hasClosedExecutionBoundary(contract.executionBoundary)) {
    addReason(reasons, "execution_boundary_enabled");
  }

  if (!hasUpstreamOnlyInputScope(contract.inputScope)) {
    addReason(reasons, "input_scope_not_query_plan_only");
  }

  if (!hasCompleteBudgetSnapshot(contract.budgetSnapshot)) {
    addReason(reasons, "budget_snapshot_incomplete");
  }

  if (!hasInternalOnlyArtifact(contract.hiddenArtifact)) {
    addReason(reasons, "hidden_artifact_public_or_durable");
  }

  return reasons;
}

export function validateSourceAcquisitionRuntimeConfigContract(
  contract: SourceAcquisitionRuntimeConfigContract,
): SourceAcquisitionRuntimeConfigValidationResult {
  const blockedReasons = collectBlockedReasons(contract);

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      contractVersion: SOURCE_ACQUISITION_RUNTIME_CONFIG_CONTRACT_VERSION,
      contract,
      blockedReasons,
    };
  }

  return {
    status: "contract_satisfied",
    contractVersion: SOURCE_ACQUISITION_RUNTIME_CONFIG_CONTRACT_VERSION,
    contract,
    blockedReasons: [],
  };
}
