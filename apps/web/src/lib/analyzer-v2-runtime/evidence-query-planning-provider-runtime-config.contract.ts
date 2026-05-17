import {
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import type {
  AnalyzerV2GatewayTaskId,
  AnalyzerV2ModelTask,
  AnalyzerV2ModelTier,
  AnalyzerV2PolicyApproval,
} from "@/lib/analyzer-v2/gateway/types";
import {
  QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION =
  "v2.evidence-query-planning.provider-runtime-config.x7s";
export const EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH =
  "apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.ts";
export const EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md";
export const EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS = [
  "ai",
  "@ai-sdk/anthropic",
] as const;

export type EvidenceQueryPlanningProviderRuntimeFactoryAllowedSdkImport =
  typeof EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS[number];

export type EvidenceQueryPlanningProviderRuntimeConfigSnapshot = {
  source: "v2_task_policy_snapshot" | "caller_supplied_ad_hoc" | "legacy_pipeline_config" | "missing";
  gatewayTaskId: AnalyzerV2GatewayTaskId;
  modelTask: AnalyzerV2ModelTask;
  modelPolicyId: string;
  modelTier: AnalyzerV2ModelTier;
  providerPolicy: "from_config_snapshot";
  providerId: string;
  modelId: string;
  configSnapshotAuthority:
    | "supplied_validated_runtime_config_snapshot_only"
    | "factory_reads_config_storage"
    | "caller_ad_hoc";
  configSnapshotHash: string;
  activationProfileId: typeof QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID;
  activationStatus: PipelineRunContext["queryPlanningRuntimeActivation"]["status"];
  temperature: number;
  maxCalls: number;
  schemaRetryCount: number;
  timeoutMs: number;
  maxOutputTokens: number;
  outputSchemaVersion: typeof EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION;
  approval: AnalyzerV2PolicyApproval;
  approvalPointer: {
    sourcePackage: typeof EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE;
  };
  executionState:
    | "not_executable_contract_only"
    | "factory_only_not_product_wired"
    | "product_activation_wired_hidden_direct_text"
    | "execution_approved_public";
  providerConstruction: {
    sdkImportState: "not_imported" | "imported";
    callbackCreationState: "not_created" | "created";
    factorySource: {
      filePath: "none_contract_only" | typeof EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH;
      allowedSdkSpecifiers: readonly EvidenceQueryPlanningProviderRuntimeFactoryAllowedSdkImport[];
      configSnapshotAuthority: EvidenceQueryPlanningProviderRuntimeConfigSnapshot["configSnapshotAuthority"];
    };
  };
  retrySemantics: {
    owner: "model_adapter_one_call_no_retry";
    promptMutation: "forbidden" | "allowed";
    semanticRepair: "forbidden" | "allowed";
    modelEscalation: "forbidden" | "allowed";
    fallbackProvider: "forbidden" | "allowed";
  };
  inputScope: {
    directText: "allowed_hidden";
    acsPreparedSnapshot: "blocked" | "allowed";
    directUrl: "blocked" | "allowed";
  };
  outputContract: {
    cacheIo: "forbidden" | "allowed";
    publicSurface: "internal_only" | "public_exposed";
    telemetry: {
      providerId: "required";
      modelId: "required";
      tokenUsage: "required";
      durationMs: "required";
      configSnapshotHash: "required";
      attemptIdentity: "required";
      outputSchemaVersion: "required";
      promptHashes: "required";
    };
    failureMapping: {
      providerFailure: "sanitized_error_to_model_adapter" | "raw_sdk_error_exposed";
      rawSdkResponseExposure: "forbidden" | "allowed";
      secretExposure: "forbidden" | "allowed";
    };
  };
};

export type EvidenceQueryPlanningProviderRuntimeConfigBlockedReason =
  | "source_not_v2_task_policy_snapshot"
  | "task_not_evidence_query_planning"
  | "provider_or_model_identity_invalid"
  | "config_snapshot_authority_invalid"
  | "config_snapshot_hash_invalid"
  | "activation_profile_invalid"
  | "activation_status_not_enabled"
  | "approval_pointer_invalid"
  | "policy_values_invalid"
  | "execution_authority_public"
  | "provider_construction_invalid"
  | "retry_semantics_not_one_call_no_retry"
  | "input_scope_not_hidden_direct_text_only"
  | "cache_io_enabled"
  | "public_surface_exposed"
  | "telemetry_contract_incomplete"
  | "provider_failure_mapping_invalid";

export type EvidenceQueryPlanningProviderRuntimeConfigValidationResult =
  | {
    status: "contract_satisfied";
    contractVersion: typeof EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION;
    snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot;
    blockedReasons: [];
  }
  | {
    status: "blocked";
    contractVersion: typeof EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION;
    snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot;
    blockedReasons: EvidenceQueryPlanningProviderRuntimeConfigBlockedReason[];
  };

const FORBIDDEN_PLACEHOLDER_VALUES = new Set(["placeholder", "todo", "unknown", "und"]);

function addReason(
  reasons: EvidenceQueryPlanningProviderRuntimeConfigBlockedReason[],
  reason: EvidenceQueryPlanningProviderRuntimeConfigBlockedReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function isRealIdentity(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && !FORBIDDEN_PLACEHOLDER_VALUES.has(normalized);
}

function hasExactFactorySdkSpecifiers(
  specifiers: readonly EvidenceQueryPlanningProviderRuntimeFactoryAllowedSdkImport[],
): boolean {
  return specifiers.length === EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS.length
    && EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS.every((specifier) =>
      specifiers.includes(specifier)
    );
}

function hasValidPolicyValues(snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot): boolean {
  return snapshot.modelPolicyId === "v2.model.evidence_query_planning.0"
    && snapshot.providerId === "anthropic"
    && snapshot.modelId === "claude-haiku-4-5-20251001"
    && snapshot.temperature === 0.1
    && snapshot.maxCalls === 1
    && snapshot.schemaRetryCount === 0
    && snapshot.timeoutMs === 90000
    && snapshot.maxOutputTokens === 4000;
}

function hasValidProviderConstruction(snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot): boolean {
  const factorySource = snapshot.providerConstruction.factorySource;
  if (snapshot.executionState === "not_executable_contract_only") {
    return snapshot.providerConstruction.sdkImportState === "not_imported"
      && snapshot.providerConstruction.callbackCreationState === "not_created"
      && factorySource.filePath === "none_contract_only"
      && factorySource.allowedSdkSpecifiers.length === 0
      && factorySource.configSnapshotAuthority === "supplied_validated_runtime_config_snapshot_only";
  }

  if (
    snapshot.executionState === "factory_only_not_product_wired"
    || snapshot.executionState === "product_activation_wired_hidden_direct_text"
  ) {
    return snapshot.providerConstruction.sdkImportState === "imported"
      && snapshot.providerConstruction.callbackCreationState === "created"
      && factorySource.filePath === EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH
      && hasExactFactorySdkSpecifiers(factorySource.allowedSdkSpecifiers)
      && factorySource.configSnapshotAuthority === "supplied_validated_runtime_config_snapshot_only";
  }

  return false;
}

function hasOneCallNoRetrySemantics(snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot): boolean {
  return snapshot.retrySemantics.owner === "model_adapter_one_call_no_retry"
    && snapshot.retrySemantics.promptMutation === "forbidden"
    && snapshot.retrySemantics.semanticRepair === "forbidden"
    && snapshot.retrySemantics.modelEscalation === "forbidden"
    && snapshot.retrySemantics.fallbackProvider === "forbidden";
}

function hasCompleteTelemetryContract(
  telemetry: EvidenceQueryPlanningProviderRuntimeConfigSnapshot["outputContract"]["telemetry"],
): boolean {
  return telemetry.providerId === "required"
    && telemetry.modelId === "required"
    && telemetry.tokenUsage === "required"
    && telemetry.durationMs === "required"
    && telemetry.configSnapshotHash === "required"
    && telemetry.attemptIdentity === "required"
    && telemetry.outputSchemaVersion === "required"
    && telemetry.promptHashes === "required";
}

function hasValidFailureMapping(
  mapping: EvidenceQueryPlanningProviderRuntimeConfigSnapshot["outputContract"]["failureMapping"],
): boolean {
  return mapping.providerFailure === "sanitized_error_to_model_adapter"
    && mapping.rawSdkResponseExposure === "forbidden"
    && mapping.secretExposure === "forbidden";
}

function collectBlockedReasons(
  snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot,
): EvidenceQueryPlanningProviderRuntimeConfigBlockedReason[] {
  const reasons: EvidenceQueryPlanningProviderRuntimeConfigBlockedReason[] = [];

  if (snapshot.source !== "v2_task_policy_snapshot") {
    addReason(reasons, "source_not_v2_task_policy_snapshot");
  }

  if (
    snapshot.gatewayTaskId !== "evidence_query_planning"
    || snapshot.modelTask !== "understand"
    || snapshot.providerPolicy !== "from_config_snapshot"
    || snapshot.outputSchemaVersion !== EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION
  ) {
    addReason(reasons, "task_not_evidence_query_planning");
  }

  if (!isRealIdentity(snapshot.providerId) || !isRealIdentity(snapshot.modelId)) {
    addReason(reasons, "provider_or_model_identity_invalid");
  }

  if (snapshot.configSnapshotAuthority !== "supplied_validated_runtime_config_snapshot_only") {
    addReason(reasons, "config_snapshot_authority_invalid");
  }

  if (!isRealIdentity(snapshot.configSnapshotHash)) {
    addReason(reasons, "config_snapshot_hash_invalid");
  }

  if (snapshot.activationProfileId !== QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID) {
    addReason(reasons, "activation_profile_invalid");
  }

  if (
    snapshot.executionState !== "not_executable_contract_only"
    && snapshot.activationStatus !== QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT
  ) {
    addReason(reasons, "activation_status_not_enabled");
  }

  if (snapshot.approvalPointer.sourcePackage !== EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE) {
    addReason(reasons, "approval_pointer_invalid");
  }

  if (!hasValidPolicyValues(snapshot)) {
    addReason(reasons, "policy_values_invalid");
  }

  if (snapshot.executionState === "execution_approved_public") {
    addReason(reasons, "execution_authority_public");
  }

  if (!hasValidProviderConstruction(snapshot)) {
    addReason(reasons, "provider_construction_invalid");
  }

  if (!hasOneCallNoRetrySemantics(snapshot)) {
    addReason(reasons, "retry_semantics_not_one_call_no_retry");
  }

  if (
    snapshot.inputScope.directText !== "allowed_hidden"
    || snapshot.inputScope.acsPreparedSnapshot !== "blocked"
    || snapshot.inputScope.directUrl !== "blocked"
  ) {
    addReason(reasons, "input_scope_not_hidden_direct_text_only");
  }

  if (snapshot.outputContract.cacheIo !== "forbidden") {
    addReason(reasons, "cache_io_enabled");
  }

  if (snapshot.outputContract.publicSurface !== "internal_only") {
    addReason(reasons, "public_surface_exposed");
  }

  if (!hasCompleteTelemetryContract(snapshot.outputContract.telemetry)) {
    addReason(reasons, "telemetry_contract_incomplete");
  }

  if (!hasValidFailureMapping(snapshot.outputContract.failureMapping)) {
    addReason(reasons, "provider_failure_mapping_invalid");
  }

  return reasons;
}

export function validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(
  snapshot: EvidenceQueryPlanningProviderRuntimeConfigSnapshot,
): EvidenceQueryPlanningProviderRuntimeConfigValidationResult {
  const blockedReasons = collectBlockedReasons(snapshot);

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      contractVersion: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
      snapshot,
      blockedReasons,
    };
  }

  return {
    status: "contract_satisfied",
    contractVersion: EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
    snapshot,
    blockedReasons: [],
  };
}

export function buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot(
  context: PipelineRunContext,
): EvidenceQueryPlanningProviderRuntimeConfigSnapshot | null {
  const modelPolicy = context.modelPolicy.taskModelPolicies.find(
    (policy) => policy.gatewayTaskId === "evidence_query_planning",
  );
  if (!modelPolicy) {
    return null;
  }

  const activation = context.queryPlanningRuntimeActivation;
  if (activation.status !== QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT) {
    return null;
  }

  return {
    source: "v2_task_policy_snapshot",
    gatewayTaskId: modelPolicy.gatewayTaskId,
    modelTask: modelPolicy.modelTask,
    modelPolicyId: modelPolicy.policyId,
    modelTier: modelPolicy.modelTier,
    providerPolicy: modelPolicy.providerPolicy,
    providerId: activation.provider.providerId,
    modelId: activation.provider.modelId,
    configSnapshotAuthority: "supplied_validated_runtime_config_snapshot_only",
    configSnapshotHash: activation.configProfileHash,
    activationProfileId: activation.activationProfileId,
    activationStatus: activation.status,
    temperature: modelPolicy.temperature,
    maxCalls: modelPolicy.maxCalls,
    schemaRetryCount: modelPolicy.schemaRetryCount,
    timeoutMs: modelPolicy.timeoutMs,
    maxOutputTokens: modelPolicy.maxOutputTokens,
    outputSchemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    approval: modelPolicy.approval,
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
  };
}
