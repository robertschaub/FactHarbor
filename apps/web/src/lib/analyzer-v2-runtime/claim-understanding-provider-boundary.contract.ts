import type {
  AnalyzerV2GatewayTaskId,
  AnalyzerV2ModelTask,
  AnalyzerV2ModelTier,
  AnalyzerV2PolicyApproval,
} from "@/lib/analyzer-v2/gateway/types";

export const CLAIM_UNDERSTANDING_PROVIDER_BOUNDARY_CONTRACT_VERSION =
  "v2.claim-understanding.provider-boundary-ownership.0";

export type ClaimUnderstandingProviderBoundaryPolicyInput = {
  gatewayTaskId: AnalyzerV2GatewayTaskId;
  modelTask: AnalyzerV2ModelTask;
  modelPolicyId: string;
  modelTier: AnalyzerV2ModelTier;
  providerPolicy: "from_config_snapshot";
  temperature: number;
  maxCalls: number;
  schemaRetryCount: number;
  timeoutMs: number;
  maxOutputTokens: number;
  approvalStatus: AnalyzerV2PolicyApproval["status"];
};

export type ClaimUnderstandingProviderBoundaryOwnershipContract = {
  ownerId: "claim_understanding_provider_boundary_owner";
  ownerModule: "analyzer_v2_runtime_claim_understanding_provider_boundary";
  runtimeMode: "contract_only";
  productReachability: "not_wired_to_product" | "wired_to_product";
  activationApprovalState: "not_requested" | "approved_for_wiring";
  providerConstruction: {
    allowedSdkImportLocation: "outside_analyzer_v2_only";
    sdkImportState: "not_imported" | "imported";
    callbackCreationState: "not_created" | "created";
    sourceReuse: "clean_room_contract_only" | "v1_or_legacy_reuse";
  };
  policyInput: ClaimUnderstandingProviderBoundaryPolicyInput;
  configSnapshotContract: {
    source: "v2_task_policy_snapshot" | "legacy_pipeline_config" | "missing";
    configSnapshotHashState: "required_before_wiring";
    providerState: "required_before_wiring";
    modelNameState: "required_before_wiring";
  };
  inputScope: {
    directText: "allowed_future";
    acsPreparedSnapshot: "blocked";
    directUrl: "blocked";
  };
  outputContract: {
    providerCallResponse: "raw_output_plus_adapter_telemetry";
    telemetry: {
      providerId: "required";
      modelId: "required";
      tokenUsage: "required";
      durationMs: "required";
    };
    cacheIo: "forbidden";
    publicSurface: "internal_only";
  };
};

export type ClaimUnderstandingProviderBoundaryBlockedReason =
  | "owner_identity_invalid"
  | "runtime_mode_not_contract_only"
  | "product_reachability_enabled"
  | "activation_approval_already_granted"
  | "provider_sdk_imported"
  | "provider_callback_created"
  | "provider_sdk_location_invalid"
  | "legacy_provider_reuse_allowed"
  | "policy_input_not_claim_understanding"
  | "policy_values_invalid"
  | "config_snapshot_source_not_v2"
  | "input_scope_not_direct_text_only"
  | "output_not_raw_provider_response"
  | "telemetry_contract_incomplete"
  | "cache_io_enabled"
  | "public_surface_exposed";

export type ClaimUnderstandingProviderBoundaryOwnershipResult =
  | {
    status: "contract_satisfied";
    contractVersion: typeof CLAIM_UNDERSTANDING_PROVIDER_BOUNDARY_CONTRACT_VERSION;
    contract: ClaimUnderstandingProviderBoundaryOwnershipContract;
    blockedReasons: [];
  }
  | {
    status: "blocked";
    contractVersion: typeof CLAIM_UNDERSTANDING_PROVIDER_BOUNDARY_CONTRACT_VERSION;
    contract: ClaimUnderstandingProviderBoundaryOwnershipContract;
    blockedReasons: ClaimUnderstandingProviderBoundaryBlockedReason[];
  };

function addReason(
  reasons: ClaimUnderstandingProviderBoundaryBlockedReason[],
  reason: ClaimUnderstandingProviderBoundaryBlockedReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function hasValidPolicyValues(policyInput: ClaimUnderstandingProviderBoundaryPolicyInput): boolean {
  return policyInput.modelPolicyId.trim().length > 0
    && Number.isFinite(policyInput.temperature)
    && policyInput.temperature >= 0
    && policyInput.maxCalls >= 1
    && policyInput.schemaRetryCount >= 0
    && policyInput.schemaRetryCount < policyInput.maxCalls
    && policyInput.timeoutMs > 0
    && policyInput.maxOutputTokens > 0;
}

function hasCompleteTelemetryContract(
  telemetry: ClaimUnderstandingProviderBoundaryOwnershipContract["outputContract"]["telemetry"],
): boolean {
  return telemetry.providerId === "required"
    && telemetry.modelId === "required"
    && telemetry.tokenUsage === "required"
    && telemetry.durationMs === "required";
}

function collectBlockedReasons(
  contract: ClaimUnderstandingProviderBoundaryOwnershipContract,
): ClaimUnderstandingProviderBoundaryBlockedReason[] {
  const reasons: ClaimUnderstandingProviderBoundaryBlockedReason[] = [];

  if (
    contract.ownerId !== "claim_understanding_provider_boundary_owner"
    || contract.ownerModule !== "analyzer_v2_runtime_claim_understanding_provider_boundary"
  ) {
    addReason(reasons, "owner_identity_invalid");
  }

  if (contract.runtimeMode !== "contract_only") {
    addReason(reasons, "runtime_mode_not_contract_only");
  }

  if (contract.productReachability !== "not_wired_to_product") {
    addReason(reasons, "product_reachability_enabled");
  }

  if (contract.activationApprovalState !== "not_requested") {
    addReason(reasons, "activation_approval_already_granted");
  }

  if (contract.providerConstruction.allowedSdkImportLocation !== "outside_analyzer_v2_only") {
    addReason(reasons, "provider_sdk_location_invalid");
  }

  if (contract.providerConstruction.sdkImportState !== "not_imported") {
    addReason(reasons, "provider_sdk_imported");
  }

  if (contract.providerConstruction.callbackCreationState !== "not_created") {
    addReason(reasons, "provider_callback_created");
  }

  if (contract.providerConstruction.sourceReuse !== "clean_room_contract_only") {
    addReason(reasons, "legacy_provider_reuse_allowed");
  }

  if (
    contract.policyInput.gatewayTaskId !== "claim_understanding_gate1"
    || contract.policyInput.modelTask !== "understand"
    || contract.policyInput.providerPolicy !== "from_config_snapshot"
  ) {
    addReason(reasons, "policy_input_not_claim_understanding");
  }

  if (!hasValidPolicyValues(contract.policyInput)) {
    addReason(reasons, "policy_values_invalid");
  }

  if (contract.configSnapshotContract.source !== "v2_task_policy_snapshot") {
    addReason(reasons, "config_snapshot_source_not_v2");
  }

  if (
    contract.inputScope.directText !== "allowed_future"
    || contract.inputScope.acsPreparedSnapshot !== "blocked"
    || contract.inputScope.directUrl !== "blocked"
  ) {
    addReason(reasons, "input_scope_not_direct_text_only");
  }

  if (contract.outputContract.providerCallResponse !== "raw_output_plus_adapter_telemetry") {
    addReason(reasons, "output_not_raw_provider_response");
  }

  if (!hasCompleteTelemetryContract(contract.outputContract.telemetry)) {
    addReason(reasons, "telemetry_contract_incomplete");
  }

  if (contract.outputContract.cacheIo !== "forbidden") {
    addReason(reasons, "cache_io_enabled");
  }

  if (contract.outputContract.publicSurface !== "internal_only") {
    addReason(reasons, "public_surface_exposed");
  }

  return reasons;
}

export function validateClaimUnderstandingProviderBoundaryOwnershipContract(
  contract: ClaimUnderstandingProviderBoundaryOwnershipContract,
): ClaimUnderstandingProviderBoundaryOwnershipResult {
  const blockedReasons = collectBlockedReasons(contract);

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      contractVersion: CLAIM_UNDERSTANDING_PROVIDER_BOUNDARY_CONTRACT_VERSION,
      contract,
      blockedReasons,
    };
  }

  return {
    status: "contract_satisfied",
    contractVersion: CLAIM_UNDERSTANDING_PROVIDER_BOUNDARY_CONTRACT_VERSION,
    contract,
    blockedReasons: [],
  };
}
