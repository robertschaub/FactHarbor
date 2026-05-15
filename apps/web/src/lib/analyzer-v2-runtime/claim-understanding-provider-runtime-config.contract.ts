import type {
  AnalyzerV2GatewayTaskId,
  AnalyzerV2ModelTask,
  AnalyzerV2ModelTier,
  AnalyzerV2PolicyApproval,
} from "@/lib/analyzer-v2/gateway/types";

export const CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION =
  "v2.claim-understanding.provider-runtime-config.0";
export const CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH =
  "apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts";
export const CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS = [
  "ai",
  "@ai-sdk/anthropic",
] as const;

export type ClaimUnderstandingProviderRuntimeFactoryAllowedSdkImport =
  typeof CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS[number];

export type ClaimUnderstandingProviderRuntimeConfigSnapshot = {
  source: "v2_task_policy_snapshot" | "caller_supplied_ad_hoc" | "legacy_pipeline_config" | "missing";
  gatewayTaskId: AnalyzerV2GatewayTaskId;
  modelTask: AnalyzerV2ModelTask;
  modelPolicyId: string;
  modelTier: AnalyzerV2ModelTier;
  providerPolicy: "from_config_snapshot";
  providerId: string;
  modelId: string;
  configSnapshotHash: string;
  temperature: number;
  maxCalls: number;
  schemaRetryCount: number;
  timeoutMs: number;
  maxOutputTokens: number;
  outputSchemaVersion: "v2.claim_understanding_result.0";
  approval: AnalyzerV2PolicyApproval;
  executionState:
    | "not_executable_contract_only"
    | "factory_only_not_product_wired"
    | "product_activation_wired_hidden_direct_text"
    | "execution_approved";
  providerConstruction: {
    sdkImportState: "not_imported" | "imported";
    callbackCreationState: "not_created" | "created";
    factorySource: {
      filePath: "none_contract_only" | typeof CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH;
      allowedSdkSpecifiers: readonly ClaimUnderstandingProviderRuntimeFactoryAllowedSdkImport[];
      configSnapshotAuthority:
        | "supplied_validated_runtime_config_snapshot_only"
        | "factory_reads_config_storage"
        | "caller_ad_hoc";
    };
  };
  retrySemantics: {
    owner: "model_adapter_structural_schema_retry";
    promptMutation: "forbidden" | "allowed";
    semanticRepair: "forbidden" | "allowed";
    modelEscalation: "forbidden" | "allowed";
    fallbackProvider: "forbidden" | "allowed";
  };
  inputScope: {
    directText: "allowed_future";
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

export type ClaimUnderstandingProviderRuntimeConfigBlockedReason =
  | "source_not_v2_task_policy_snapshot"
  | "task_not_claim_understanding_gate1"
  | "provider_or_model_identity_missing"
  | "config_snapshot_hash_missing"
  | "policy_values_invalid"
  | "execution_authority_enabled"
  | "provider_construction_enabled"
  | "factory_source_invalid"
  | "config_snapshot_authority_invalid"
  | "retry_semantics_not_structural_only"
  | "input_scope_not_direct_text_only"
  | "cache_io_enabled"
  | "public_surface_exposed"
  | "telemetry_contract_incomplete"
  | "provider_failure_mapping_invalid";

export type ClaimUnderstandingProviderRuntimeConfigValidationResult =
  | {
    status: "contract_satisfied";
    contractVersion: typeof CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION;
    snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot;
    blockedReasons: [];
  }
  | {
    status: "blocked";
    contractVersion: typeof CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION;
    snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot;
    blockedReasons: ClaimUnderstandingProviderRuntimeConfigBlockedReason[];
  };

const FORBIDDEN_PLACEHOLDER_VALUES = new Set(["placeholder", "todo", "unknown"]);

function addReason(
  reasons: ClaimUnderstandingProviderRuntimeConfigBlockedReason[],
  reason: ClaimUnderstandingProviderRuntimeConfigBlockedReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function isRealIdentity(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && !FORBIDDEN_PLACEHOLDER_VALUES.has(normalized);
}

function hasValidPolicyValues(snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot): boolean {
  return snapshot.modelPolicyId.trim().length > 0
    && Number.isFinite(snapshot.temperature)
    && snapshot.temperature >= 0
    && snapshot.maxCalls >= 1
    && snapshot.schemaRetryCount >= 0
    && snapshot.schemaRetryCount < snapshot.maxCalls
    && snapshot.timeoutMs > 0
    && snapshot.maxOutputTokens > 0;
}

function hasStructuralRetrySemantics(snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot): boolean {
  return snapshot.retrySemantics.owner === "model_adapter_structural_schema_retry"
    && snapshot.retrySemantics.promptMutation === "forbidden"
    && snapshot.retrySemantics.semanticRepair === "forbidden"
    && snapshot.retrySemantics.modelEscalation === "forbidden"
    && snapshot.retrySemantics.fallbackProvider === "forbidden";
}

function hasCompleteTelemetryContract(
  telemetry: ClaimUnderstandingProviderRuntimeConfigSnapshot["outputContract"]["telemetry"],
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

function hasExactFactorySdkSpecifiers(
  specifiers: readonly ClaimUnderstandingProviderRuntimeFactoryAllowedSdkImport[],
): boolean {
  return specifiers.length === CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS.length
    && CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS.every((specifier) =>
      specifiers.includes(specifier)
    );
}

function hasValidProviderConstruction(snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot): boolean {
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
      && factorySource.filePath === CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH
      && hasExactFactorySdkSpecifiers(factorySource.allowedSdkSpecifiers)
      && factorySource.configSnapshotAuthority === "supplied_validated_runtime_config_snapshot_only";
  }

  return false;
}

function hasValidFailureMapping(
  mapping: ClaimUnderstandingProviderRuntimeConfigSnapshot["outputContract"]["failureMapping"],
): boolean {
  return mapping.providerFailure === "sanitized_error_to_model_adapter"
    && mapping.rawSdkResponseExposure === "forbidden"
    && mapping.secretExposure === "forbidden";
}

function collectBlockedReasons(
  snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot,
): ClaimUnderstandingProviderRuntimeConfigBlockedReason[] {
  const reasons: ClaimUnderstandingProviderRuntimeConfigBlockedReason[] = [];

  if (snapshot.source !== "v2_task_policy_snapshot") {
    addReason(reasons, "source_not_v2_task_policy_snapshot");
  }

  if (
    snapshot.gatewayTaskId !== "claim_understanding_gate1"
    || snapshot.modelTask !== "understand"
    || snapshot.providerPolicy !== "from_config_snapshot"
    || snapshot.outputSchemaVersion !== "v2.claim_understanding_result.0"
  ) {
    addReason(reasons, "task_not_claim_understanding_gate1");
  }

  if (!isRealIdentity(snapshot.providerId) || !isRealIdentity(snapshot.modelId)) {
    addReason(reasons, "provider_or_model_identity_missing");
  }

  if (!isRealIdentity(snapshot.configSnapshotHash)) {
    addReason(reasons, "config_snapshot_hash_missing");
  }

  if (!hasValidPolicyValues(snapshot)) {
    addReason(reasons, "policy_values_invalid");
  }

  if (snapshot.executionState === "execution_approved") {
    addReason(reasons, "execution_authority_enabled");
  }

  if (!hasValidProviderConstruction(snapshot)) {
    addReason(reasons, "provider_construction_enabled");
  }

  if (snapshot.providerConstruction.factorySource.filePath !== "none_contract_only"
    && snapshot.providerConstruction.factorySource.filePath
      !== CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH) {
    addReason(reasons, "factory_source_invalid");
  }

  if (
    snapshot.providerConstruction.factorySource.configSnapshotAuthority
    !== "supplied_validated_runtime_config_snapshot_only"
  ) {
    addReason(reasons, "config_snapshot_authority_invalid");
  }

  if (!hasStructuralRetrySemantics(snapshot)) {
    addReason(reasons, "retry_semantics_not_structural_only");
  }

  if (
    snapshot.inputScope.directText !== "allowed_future"
    || snapshot.inputScope.acsPreparedSnapshot !== "blocked"
    || snapshot.inputScope.directUrl !== "blocked"
  ) {
    addReason(reasons, "input_scope_not_direct_text_only");
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

export function validateClaimUnderstandingProviderRuntimeConfigSnapshot(
  snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot,
): ClaimUnderstandingProviderRuntimeConfigValidationResult {
  const blockedReasons = collectBlockedReasons(snapshot);

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      contractVersion: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
      snapshot,
      blockedReasons,
    };
  }

  return {
    status: "contract_satisfied",
    contractVersion: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_CONFIG_CONTRACT_VERSION,
    snapshot,
    blockedReasons: [],
  };
}
