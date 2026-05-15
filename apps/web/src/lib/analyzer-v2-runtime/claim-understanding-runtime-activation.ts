import type { ClaimUnderstandingProviderCall } from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import {
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
} from "@/lib/analyzer-v2/claim-understanding/types";
import type {
  AnalyzerV2GatewayTask,
  AnalyzerV2PolicyApproval,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";
import {
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
  type PipelineRunClaimUnderstandingRuntimeActivationSnapshot,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";
import {
  buildClaimUnderstandingProviderFactory,
  type ClaimUnderstandingProviderFactory,
} from "@/lib/analyzer-v2-runtime/claim-understanding-provider-factory";
import {
  CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS,
  CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
  type ClaimUnderstandingProviderRuntimeConfigSnapshot,
} from "@/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract";
import {
  createClaimUnderstandingRuntimeInMemoryArtifactSink,
  type ClaimUnderstandingRuntimeArtifactSink,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";

export const CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_OWNER_VERSION =
  "v2.claim-understanding.runtime-activation-owner.0";

const CAPTAIN_APPROVAL: AnalyzerV2PolicyApproval = {
  status: "approved",
  reviewer: "Captain approval: 2026-05-15 4C3b hidden direct-text wiring package",
  approvedAt: "2026-05-15T00:00:00.000Z",
};

export type ClaimUnderstandingRuntimeProviderBoundary = {
  providerCall: ClaimUnderstandingProviderCall;
  provider: "anthropic";
  modelName: string;
  configSnapshotHash: string;
  temperature: number;
};

export type ClaimUnderstandingRuntimeActivationSideEffects = {
  executableGatewayConstructed: boolean;
  providerFactoryInvoked: boolean;
  providerCallbackCreated: boolean;
  approvalMutated: false;
  cacheIo: false;
};

export type ClaimUnderstandingRuntimeActivationDisabledReason =
  | "kill_switch_closed"
  | "activation_snapshot_invalid"
  | "unsupported_input_source"
  | "model_policy_missing"
  | "provider_factory_unavailable";

export type ClaimUnderstandingRuntimeActivationState =
  | {
    activationVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_OWNER_VERSION;
    status: "disabled";
    disabledReason: ClaimUnderstandingRuntimeActivationDisabledReason;
    failureMessage: string | null;
    activationSnapshot: PipelineRunClaimUnderstandingRuntimeActivationSnapshot;
    artifactSink: ClaimUnderstandingRuntimeArtifactSink;
    gatewayTask: null;
    modelPolicy: null;
    runtimeConfigSnapshot: null;
    providerBoundary: null;
    sideEffects: ClaimUnderstandingRuntimeActivationSideEffects;
  }
  | {
    activationVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_OWNER_VERSION;
    status: "enabled";
    disabledReason: null;
    failureMessage: null;
    activationSnapshot: PipelineRunClaimUnderstandingRuntimeActivationSnapshot;
    artifactSink: ClaimUnderstandingRuntimeArtifactSink;
    gatewayTask: AnalyzerV2GatewayTask;
    modelPolicy: AnalyzerV2TaskModelPolicy;
    runtimeConfigSnapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot;
    providerBoundary: ClaimUnderstandingRuntimeProviderBoundary;
    sideEffects: ClaimUnderstandingRuntimeActivationSideEffects;
  };

export type BuildClaimUnderstandingRuntimeActivationOptions = {
  artifactSink?: ClaimUnderstandingRuntimeArtifactSink;
  providerFactoryBuilder?: (
    snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot,
  ) => ClaimUnderstandingProviderFactory;
};

function disabledActivation(params: {
  context: PipelineRunContext;
  artifactSink: ClaimUnderstandingRuntimeArtifactSink;
  reason: ClaimUnderstandingRuntimeActivationDisabledReason;
  failureMessage?: string | null;
}): ClaimUnderstandingRuntimeActivationState {
  return {
    activationVersion: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_OWNER_VERSION,
    status: "disabled",
    disabledReason: params.reason,
    failureMessage: params.failureMessage ?? null,
    activationSnapshot: params.context.claimUnderstandingRuntimeActivation,
    artifactSink: params.artifactSink,
    gatewayTask: null,
    modelPolicy: null,
    runtimeConfigSnapshot: null,
    providerBoundary: null,
    sideEffects: {
      executableGatewayConstructed: false,
      providerFactoryInvoked: false,
      providerCallbackCreated: false,
      approvalMutated: false,
      cacheIo: false,
    },
  };
}

function hasValidActivationSnapshot(
  snapshot: PipelineRunClaimUnderstandingRuntimeActivationSnapshot,
): boolean {
  return snapshot.source === "v2_task_policy_snapshot"
    && snapshot.suppliedBy === "product_owned_activation_authority"
    && snapshot.freezeLocation === "pipeline_run_context"
    && snapshot.authority === "deputy_approved_temporary_activation_profile"
    && snapshot.hiddenArtifactSink.kind === "v2_observability_ledger"
    && snapshot.hiddenArtifactSink.visibility === "internal_admin_only"
    && snapshot.hiddenArtifactSink.publicPointerExposure === "forbidden"
    && snapshot.rollbackTarget.behavior === "fail_closed_to_v2_damaged_envelope"
    && snapshot.activationSnapshotHash.trim().length > 0
    && snapshot.configProfileHash.trim().length > 0;
}

function executableGatewayTask(base: AnalyzerV2GatewayTask): AnalyzerV2GatewayTask {
  return {
    ...base,
    status: "executable",
    promptPolicy: base.promptPolicy ? { ...base.promptPolicy, approval: CAPTAIN_APPROVAL } : null,
    modelPolicy: base.modelPolicy ? { ...base.modelPolicy, approval: CAPTAIN_APPROVAL } : null,
    cachePolicy: base.cachePolicy ? { ...base.cachePolicy, approval: CAPTAIN_APPROVAL } : null,
  };
}

function runtimeConfigSnapshot(params: {
  context: PipelineRunContext;
  modelPolicy: AnalyzerV2TaskModelPolicy;
}): ClaimUnderstandingProviderRuntimeConfigSnapshot {
  const activation = params.context.claimUnderstandingRuntimeActivation;

  return {
    source: "v2_task_policy_snapshot",
    gatewayTaskId: params.modelPolicy.gatewayTaskId,
    modelTask: params.modelPolicy.modelTask,
    modelPolicyId: params.modelPolicy.policyId,
    modelTier: params.modelPolicy.modelTier,
    providerPolicy: params.modelPolicy.providerPolicy,
    providerId: activation.provider.providerId,
    modelId: activation.provider.modelId,
    configSnapshotHash: activation.configProfileHash,
    temperature: params.modelPolicy.temperature,
    maxCalls: params.modelPolicy.maxCalls,
    schemaRetryCount: params.modelPolicy.schemaRetryCount,
    timeoutMs: params.modelPolicy.timeoutMs,
    maxOutputTokens: params.modelPolicy.maxOutputTokens,
    outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    approval: CAPTAIN_APPROVAL,
    executionState: "product_activation_wired_hidden_direct_text",
    providerConstruction: {
      sdkImportState: "imported",
      callbackCreationState: "created",
      factorySource: {
        filePath: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH,
        allowedSdkSpecifiers: CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS,
        configSnapshotAuthority: "supplied_validated_runtime_config_snapshot_only",
      },
    },
    retrySemantics: {
      owner: "model_adapter_structural_schema_retry",
      promptMutation: "forbidden",
      semanticRepair: "forbidden",
      modelEscalation: "forbidden",
      fallbackProvider: "forbidden",
    },
    inputScope: {
      directText: "allowed_future",
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

export function buildClaimUnderstandingRuntimeActivation(
  context: PipelineRunContext,
  options: BuildClaimUnderstandingRuntimeActivationOptions = {},
): ClaimUnderstandingRuntimeActivationState {
  const artifactSink = options.artifactSink
    ?? createClaimUnderstandingRuntimeInMemoryArtifactSink(context.observabilityLedger.ledgerId);
  const activation = context.claimUnderstandingRuntimeActivation;

  if (!hasValidActivationSnapshot(activation)) {
    return disabledActivation({
      context,
      artifactSink,
      reason: "activation_snapshot_invalid",
    });
  }

  if (activation.status !== "enabled_hidden_direct_text") {
    return disabledActivation({
      context,
      artifactSink,
      reason: "kill_switch_closed",
    });
  }

  if (context.inputType !== "text") {
    return disabledActivation({
      context,
      artifactSink,
      reason: "unsupported_input_source",
    });
  }

  const modelPolicy = getPipelineRunTaskModelPolicy(context, "claim_understanding_gate1");
  if (!modelPolicy) {
    return disabledActivation({
      context,
      artifactSink,
      reason: "model_policy_missing",
    });
  }

  const snapshot = runtimeConfigSnapshot({ context, modelPolicy });
  let providerFactory: ClaimUnderstandingProviderFactory;
  try {
    providerFactory = (options.providerFactoryBuilder ?? buildClaimUnderstandingProviderFactory)(snapshot);
  } catch (error) {
    return disabledActivation({
      context,
      artifactSink,
      reason: "provider_factory_unavailable",
      failureMessage: error instanceof Error ? error.message : "provider factory unavailable",
    });
  }

  return {
    activationVersion: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_OWNER_VERSION,
    status: "enabled",
    disabledReason: null,
    failureMessage: null,
    activationSnapshot: activation,
    artifactSink,
    gatewayTask: executableGatewayTask(getPipelineRunGatewayTask(context, "claim_understanding_gate1")),
    modelPolicy,
    runtimeConfigSnapshot: snapshot,
    providerBoundary: {
      providerCall: providerFactory.providerCall,
      provider: providerFactory.providerId,
      modelName: providerFactory.modelId,
      configSnapshotHash: providerFactory.configSnapshotHash,
      temperature: snapshot.temperature,
    },
    sideEffects: {
      executableGatewayConstructed: true,
      providerFactoryInvoked: true,
      providerCallbackCreated: true,
      approvalMutated: false,
      cacheIo: false,
    },
  };
}
