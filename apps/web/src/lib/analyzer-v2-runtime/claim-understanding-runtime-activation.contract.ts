import type {
  AnalyzerV2GatewayTaskId,
  AnalyzerV2ModelTask,
  AnalyzerV2PolicyApproval,
} from "@/lib/analyzer-v2/gateway/types";

export const CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_CONTRACT_VERSION =
  "v2.claim-understanding.runtime-activation.0";

type RequiredBeforeWiringState = "required_before_wiring" | "missing" | "not_required";
type RuntimeActivationPermission = "forbidden" | "allowed";
type HiddenArtifactInspectionState = "required" | "missing";

export type ClaimUnderstandingRuntimeActivationContract = {
  ownerId: "claim_understanding_runtime_activation_owner";
  ownerModule: "analyzer_v2_runtime_claim_understanding_runtime_activation";
  runtimeMode: "activation_contract_only" | "product_activation";
  productReachability: "not_wired_to_product" | "wired_to_product";
  activationSnapshot: {
    source:
      | "v2_task_policy_snapshot"
      | "caller_supplied"
      | "env_ad_hoc"
      | "test_fixture"
      | "legacy_pipeline_config"
      | "missing";
    freezeLocation: "pipeline_run_context" | "stage_local" | "provider_factory" | "none";
    suppliedBy:
      | "product_owned_activation_authority"
      | "caller"
      | "environment"
      | "test_fixture"
      | "provider_factory";
    hashState: RequiredBeforeWiringState;
    approvalPointerState: RequiredBeforeWiringState;
    configProfileHashState: RequiredBeforeWiringState;
    rollbackTargetState: RequiredBeforeWiringState;
  };
  policyScope: {
    gatewayTaskId: AnalyzerV2GatewayTaskId;
    modelTask: AnalyzerV2ModelTask;
    promptProfile: "claimboundary-v2";
    promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1";
    approvalStatus: AnalyzerV2PolicyApproval["status"];
  };
  activationBehavior: {
    providerFactoryImport: RuntimeActivationPermission;
    providerFactoryInvocation: RuntimeActivationPermission;
    runtimeDispatchImport: RuntimeActivationPermission;
    promptRendering: RuntimeActivationPermission;
    modelCall: RuntimeActivationPermission;
    approvalMutation: RuntimeActivationPermission;
    executableGatewayConstruction: RuntimeActivationPermission;
    cacheIo: RuntimeActivationPermission;
  };
  inputScope: {
    directText: "allowed_future";
    acsPreparedSnapshot: "blocked" | "allowed";
    directUrl: "blocked" | "allowed";
  };
  hiddenArtifact: {
    sinkSelection: "deferred_until_4c3b" | "selected_for_4c3b" | "public_result";
    sinkKind:
      | "none_contract_only"
      | "internal_job_event_audit"
      | "v2_observability_ledger"
      | "local_smoke_artifact"
      | "public_result";
    visibility: "internal_admin_only" | "public";
    publicPointerExposure: RuntimeActivationPermission;
    inspectability: {
      provenance: HiddenArtifactInspectionState;
      providerTelemetry: HiddenArtifactInspectionState;
      schemaOutcome: HiddenArtifactInspectionState;
      failureState: HiddenArtifactInspectionState;
      warningMateriality: HiddenArtifactInspectionState;
    };
  };
  killSwitch: {
    state: "contract_only_not_wired" | "required_before_wiring" | "missing";
    disabledBehavior:
      | "fail_closed_to_v2_damaged_envelope"
      | "silent_v1_fallback"
      | "continue_execution";
    afterActivationFallback: "forbid_v1_fallback_after_activation" | "allow_v1_fallback";
  };
  publicSurface: {
    api: "unchanged" | "exposed";
    ui: "unchanged" | "exposed";
    report: "unchanged" | "exposed";
    export: "unchanged" | "exposed";
    compatibilityView: "unchanged" | "exposed";
  };
  liveJobState: RuntimeActivationPermission;
  v1CleanupState: RuntimeActivationPermission;
};

export type ClaimUnderstandingRuntimeActivationBlockedReason =
  | "owner_identity_invalid"
  | "runtime_mode_not_contract_only"
  | "product_reachability_enabled"
  | "activation_snapshot_source_invalid"
  | "activation_snapshot_not_frozen_in_run_context"
  | "activation_snapshot_supplier_invalid"
  | "activation_snapshot_traceability_incomplete"
  | "policy_scope_not_claim_understanding_gate1"
  | "provider_factory_reachable"
  | "runtime_dispatch_reachable"
  | "prompt_or_model_execution_enabled"
  | "approval_or_executable_gateway_enabled"
  | "cache_io_enabled"
  | "input_scope_not_direct_text_only"
  | "hidden_artifact_sink_public"
  | "hidden_artifact_inspectability_incomplete"
  | "kill_switch_not_fail_closed"
  | "public_surface_exposed"
  | "live_jobs_enabled"
  | "v1_cleanup_enabled";

export type ClaimUnderstandingRuntimeActivationValidationResult =
  | {
    status: "contract_satisfied";
    contractVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_CONTRACT_VERSION;
    contract: ClaimUnderstandingRuntimeActivationContract;
    blockedReasons: [];
  }
  | {
    status: "blocked";
    contractVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_CONTRACT_VERSION;
    contract: ClaimUnderstandingRuntimeActivationContract;
    blockedReasons: ClaimUnderstandingRuntimeActivationBlockedReason[];
  };

function addReason(
  reasons: ClaimUnderstandingRuntimeActivationBlockedReason[],
  reason: ClaimUnderstandingRuntimeActivationBlockedReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function hasCompleteActivationTraceability(
  snapshot: ClaimUnderstandingRuntimeActivationContract["activationSnapshot"],
): boolean {
  return snapshot.hashState === "required_before_wiring"
    && snapshot.approvalPointerState === "required_before_wiring"
    && snapshot.configProfileHashState === "required_before_wiring"
    && snapshot.rollbackTargetState === "required_before_wiring";
}

function hasInternalHiddenArtifactSink(
  hiddenArtifact: ClaimUnderstandingRuntimeActivationContract["hiddenArtifact"],
): boolean {
  if (
    hiddenArtifact.visibility !== "internal_admin_only"
    || hiddenArtifact.publicPointerExposure !== "forbidden"
  ) {
    return false;
  }

  if (
    hiddenArtifact.sinkSelection === "deferred_until_4c3b"
    && hiddenArtifact.sinkKind === "none_contract_only"
  ) {
    return true;
  }

  return hiddenArtifact.sinkSelection === "selected_for_4c3b"
    && hiddenArtifact.sinkKind !== "none_contract_only"
    && hiddenArtifact.sinkKind !== "public_result";
}

function hasCompleteHiddenArtifactInspection(
  inspectability: ClaimUnderstandingRuntimeActivationContract["hiddenArtifact"]["inspectability"],
): boolean {
  return inspectability.provenance === "required"
    && inspectability.providerTelemetry === "required"
    && inspectability.schemaOutcome === "required"
    && inspectability.failureState === "required"
    && inspectability.warningMateriality === "required";
}

function hasUnchangedPublicSurface(
  publicSurface: ClaimUnderstandingRuntimeActivationContract["publicSurface"],
): boolean {
  return publicSurface.api === "unchanged"
    && publicSurface.ui === "unchanged"
    && publicSurface.report === "unchanged"
    && publicSurface.export === "unchanged"
    && publicSurface.compatibilityView === "unchanged";
}

function collectBlockedReasons(
  contract: ClaimUnderstandingRuntimeActivationContract,
): ClaimUnderstandingRuntimeActivationBlockedReason[] {
  const reasons: ClaimUnderstandingRuntimeActivationBlockedReason[] = [];

  if (
    contract.ownerId !== "claim_understanding_runtime_activation_owner"
    || contract.ownerModule !== "analyzer_v2_runtime_claim_understanding_runtime_activation"
  ) {
    addReason(reasons, "owner_identity_invalid");
  }

  if (contract.runtimeMode !== "activation_contract_only") {
    addReason(reasons, "runtime_mode_not_contract_only");
  }

  if (contract.productReachability !== "not_wired_to_product") {
    addReason(reasons, "product_reachability_enabled");
  }

  if (contract.activationSnapshot.source !== "v2_task_policy_snapshot") {
    addReason(reasons, "activation_snapshot_source_invalid");
  }

  if (contract.activationSnapshot.freezeLocation !== "pipeline_run_context") {
    addReason(reasons, "activation_snapshot_not_frozen_in_run_context");
  }

  if (contract.activationSnapshot.suppliedBy !== "product_owned_activation_authority") {
    addReason(reasons, "activation_snapshot_supplier_invalid");
  }

  if (!hasCompleteActivationTraceability(contract.activationSnapshot)) {
    addReason(reasons, "activation_snapshot_traceability_incomplete");
  }

  if (
    contract.policyScope.gatewayTaskId !== "claim_understanding_gate1"
    || contract.policyScope.modelTask !== "understand"
    || contract.policyScope.promptProfile !== "claimboundary-v2"
    || contract.policyScope.promptSectionId !== "V2_CLAIM_UNDERSTANDING_GATE1"
  ) {
    addReason(reasons, "policy_scope_not_claim_understanding_gate1");
  }

  if (
    contract.activationBehavior.providerFactoryImport !== "forbidden"
    || contract.activationBehavior.providerFactoryInvocation !== "forbidden"
  ) {
    addReason(reasons, "provider_factory_reachable");
  }

  if (contract.activationBehavior.runtimeDispatchImport !== "forbidden") {
    addReason(reasons, "runtime_dispatch_reachable");
  }

  if (
    contract.activationBehavior.promptRendering !== "forbidden"
    || contract.activationBehavior.modelCall !== "forbidden"
  ) {
    addReason(reasons, "prompt_or_model_execution_enabled");
  }

  if (
    contract.activationBehavior.approvalMutation !== "forbidden"
    || contract.activationBehavior.executableGatewayConstruction !== "forbidden"
  ) {
    addReason(reasons, "approval_or_executable_gateway_enabled");
  }

  if (contract.activationBehavior.cacheIo !== "forbidden") {
    addReason(reasons, "cache_io_enabled");
  }

  if (
    contract.inputScope.directText !== "allowed_future"
    || contract.inputScope.acsPreparedSnapshot !== "blocked"
    || contract.inputScope.directUrl !== "blocked"
  ) {
    addReason(reasons, "input_scope_not_direct_text_only");
  }

  if (!hasInternalHiddenArtifactSink(contract.hiddenArtifact)) {
    addReason(reasons, "hidden_artifact_sink_public");
  }

  if (!hasCompleteHiddenArtifactInspection(contract.hiddenArtifact.inspectability)) {
    addReason(reasons, "hidden_artifact_inspectability_incomplete");
  }

  if (
    !["contract_only_not_wired", "required_before_wiring"].includes(contract.killSwitch.state)
    || contract.killSwitch.disabledBehavior !== "fail_closed_to_v2_damaged_envelope"
    || contract.killSwitch.afterActivationFallback !== "forbid_v1_fallback_after_activation"
  ) {
    addReason(reasons, "kill_switch_not_fail_closed");
  }

  if (!hasUnchangedPublicSurface(contract.publicSurface)) {
    addReason(reasons, "public_surface_exposed");
  }

  if (contract.liveJobState !== "forbidden") {
    addReason(reasons, "live_jobs_enabled");
  }

  if (contract.v1CleanupState !== "forbidden") {
    addReason(reasons, "v1_cleanup_enabled");
  }

  return reasons;
}

export function validateClaimUnderstandingRuntimeActivationContract(
  contract: ClaimUnderstandingRuntimeActivationContract,
): ClaimUnderstandingRuntimeActivationValidationResult {
  const blockedReasons = collectBlockedReasons(contract);

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      contractVersion: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_CONTRACT_VERSION,
      contract,
      blockedReasons,
    };
  }

  return {
    status: "contract_satisfied",
    contractVersion: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_CONTRACT_VERSION,
    contract,
    blockedReasons: [],
  };
}
