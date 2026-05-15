import {
  buildClaimUnderstandingDispatchFrame,
  type ClaimUnderstandingDispatchFrame,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-frame";
import {
  validateClaimUnderstandingDispatchReadinessContract,
  type ClaimUnderstandingDispatchReadinessApprovalSnapshot,
  type ClaimUnderstandingDispatchReadinessProvenancePacket,
  type ClaimUnderstandingDispatchReadinessResult,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract";
import { migrateAcsPreparedSnapshotToClaimContract } from "@/lib/analyzer-v2/claim-understanding/prepared-snapshot";
import {
  executeClaimUnderstandingRuntimeDispatch,
  type ClaimUnderstandingRuntimeDispatchResult,
} from "@/lib/analyzer-v2/claim-understanding/runtime-dispatch";
import {
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimIntegrityEvent,
  type ClaimUnderstandingBlockedReason,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import {
  canExecuteAnalyzerV2GatewayTask,
} from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2GatewayTask,
  AnalyzerV2GatewayTaskStatus,
  AnalyzerV2PolicyApproval,
} from "@/lib/analyzer-v2/gateway/types";
import {
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";
import {
  type ClaimUnderstandingRuntimeActivationState,
  type ClaimUnderstandingRuntimeProviderBoundary,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation";
import {
  CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
  type ClaimUnderstandingRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";

export const CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION = "v2.claim-understanding.runtime-stage.0";
const CLAIM_UNDERSTANDING_RUNTIME_APPROVAL_SNAPSHOT_VERSION =
  "v2.claim-understanding.runtime-approval-snapshot.gateway-policy.0";
const CLAIMBOUNDARY_V2_PRECUTOVER_RESULT_SCHEMA_VERSION = "4.0.0-cb-precutover";

export type ClaimUnderstandingDirectTextRuntimeDispatchOptions = {
  enabled?: boolean;
  providerBoundary?: ClaimUnderstandingRuntimeProviderBoundary | null;
};

export type ClaimUnderstandingRuntimeStageOptions = {
  activation?: ClaimUnderstandingRuntimeActivationState | null;
  // Retained only so older scaffold callers fail closed instead of regaining execution reachability.
  directTextRuntimeDispatch?: ClaimUnderstandingDirectTextRuntimeDispatchOptions;
};

export type ClaimUnderstandingRuntimeSideEffects = {
  promptLoaded: boolean;
  promptRendered: boolean;
  adapterCalled: boolean;
  modelCalled: boolean;
  cacheDecisionConstructed: boolean;
  cacheRead: false;
  cacheWrite: false;
  providerCallbackCreated: false;
};

export type ClaimUnderstandingDirectInputRuntimeBlockedReason =
  | "gateway_policy_not_executable"
  | "runtime_dispatch_not_enabled"
  | "runtime_activation_disabled"
  | "runtime_activation_invalid"
  | "runtime_dispatch_model_policy_missing"
  | "runtime_dispatch_provider_callback_missing"
  | "runtime_dispatch_preflight_blocked"
  | "runtime_dispatch_readiness_blocked"
  | "runtime_dispatch_blocked";

export type ClaimUnderstandingDirectInputRuntimeStatus =
  | "blocked_by_runtime_activation"
  | "blocked_by_dispatch_preflight"
  | "blocked_by_missing_provider_callback"
  | "blocked_by_dispatch_readiness"
  | "runtime_dispatch_blocked"
  | "runtime_dispatch_completed";

export type ClaimUnderstandingRuntimeState =
  | {
    stageVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION;
    visibility: "internal_only";
    inputSource: "acs_prepared_snapshot";
    status: "accepted" | "blocked";
    result: ClaimUnderstandingResult;
    blockedReason: ClaimUnderstandingBlockedReason | null;
    gatewayTaskId: null;
    gatewayTaskStatus: null;
    cacheEligibility: "not_evaluated";
    sideEffects: ClaimUnderstandingRuntimeSideEffects;
  }
  | {
    stageVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION;
    visibility: "internal_only";
    inputSource: "direct_input";
    status: "blocked_by_gateway" | "blocked_by_stage_scope";
    result: null;
    blockedReason: "gateway_policy_not_executable" | "runtime_dispatch_not_enabled";
    gatewayTaskId: "claim_understanding_gate1";
    gatewayTaskStatus: AnalyzerV2GatewayTaskStatus;
    cacheEligibility: "not_evaluated";
    sideEffects: ClaimUnderstandingRuntimeSideEffects;
  }
  | {
    stageVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION;
    visibility: "internal_only";
    inputSource: "direct_input";
    status: ClaimUnderstandingDirectInputRuntimeStatus;
    result: ClaimUnderstandingResult | null;
    blockedReason: ClaimUnderstandingDirectInputRuntimeBlockedReason | null;
    gatewayTaskId: "claim_understanding_gate1";
    gatewayTaskStatus: AnalyzerV2GatewayTaskStatus;
    runtimeDispatchStatus: "not_attempted" | "blocked" | "completed";
    runtimeDispatchBlockedReason: string | null;
    cacheEligibility: "not_evaluated" | "runtime_no_store";
    sideEffects: ClaimUnderstandingRuntimeSideEffects;
  };

type ClaimUnderstandingDirectInputRuntimeState = Extract<
  ClaimUnderstandingRuntimeState,
  { inputSource: "direct_input"; status: ClaimUnderstandingDirectInputRuntimeStatus }
>;

function noDispatchSideEffects(): ClaimUnderstandingRuntimeSideEffects {
  return {
    promptLoaded: false,
    promptRendered: false,
    adapterCalled: false,
    modelCalled: false,
    cacheDecisionConstructed: false,
    cacheRead: false,
    cacheWrite: false,
    providerCallbackCreated: false,
  };
}

function dispatchSideEffects(
  sideEffects: ClaimUnderstandingRuntimeDispatchResult["sideEffects"],
): ClaimUnderstandingRuntimeSideEffects {
  return {
    promptLoaded: sideEffects.promptLoaded,
    promptRendered: sideEffects.promptRendered,
    adapterCalled: sideEffects.adapterCalled,
    modelCalled: sideEffects.modelCalled,
    cacheDecisionConstructed: sideEffects.cacheDecisionConstructed,
    cacheRead: false,
    cacheWrite: false,
    providerCallbackCreated: false,
  };
}

function event(
  type: ClaimIntegrityEvent["type"],
  severity: ClaimIntegrityEvent["severity"],
  message: string,
  claimIds: string[] = [],
): ClaimIntegrityEvent {
  return { type, severity, message, claimIds };
}

function blockedClaimUnderstandingResult(
  blockedReason: ClaimUnderstandingBlockedReason,
  integrityEvents: ClaimIntegrityEvent[],
): ClaimUnderstandingResult {
  return {
    schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    status: "blocked",
    claimContract: null,
    integrityEvents,
    blockedReason,
    damagedReason: null,
  };
}

function readRequiredCanonicalHash(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function blockedAcsState(reason: string): ClaimUnderstandingRuntimeState {
  const result = blockedClaimUnderstandingResult(
    "prepared_snapshot_invalid",
    [event("prepared_snapshot_invalid", "error", reason)],
  );

  return {
    stageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    visibility: "internal_only",
    inputSource: "acs_prepared_snapshot",
    status: "blocked",
    result,
    blockedReason: result.blockedReason,
    gatewayTaskId: null,
    gatewayTaskStatus: null,
    cacheEligibility: "not_evaluated",
    sideEffects: noDispatchSideEffects(),
  };
}

function evaluateAcsPreparedSnapshot(
  input: ClaimBoundaryV2Ingress,
  context: PipelineRunContext,
): ClaimUnderstandingRuntimeState {
  const acsSnapshot = input.preparedSeed?.acsSnapshot;
  const acsSnapshotHash = readRequiredCanonicalHash(input.preparedSeed?.acsSnapshotHash);
  const inputGroundingSeedHash = readRequiredCanonicalHash(input.preparedSeed?.inputGroundingSeedHash);

  if (!acsSnapshotHash || !inputGroundingSeedHash) {
    return blockedAcsState("Prepared snapshot migration requires canonical V2 ACS and input-grounding hashes.");
  }

  const result = migrateAcsPreparedSnapshotToClaimContract(
    acsSnapshot as Parameters<typeof migrateAcsPreparedSnapshotToClaimContract>[0],
    context.selectedAtomicClaimIds,
    {
      currentDate: context.currentDate,
      inputValue: context.inputValue,
      acsSnapshotHash,
      inputGroundingSeedHash,
    },
  );

  return {
    stageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    visibility: "internal_only",
    inputSource: "acs_prepared_snapshot",
    status: result.status === "accepted" ? "accepted" : "blocked",
    result,
    blockedReason: result.status === "blocked" ? result.blockedReason : null,
    gatewayTaskId: null,
    gatewayTaskStatus: null,
    cacheEligibility: "not_evaluated",
    sideEffects: noDispatchSideEffects(),
  };
}

function evaluateDirectInput(context: PipelineRunContext): ClaimUnderstandingRuntimeState {
  const gatewayTask = getPipelineRunGatewayTask(context, "claim_understanding_gate1");
  const executable = canExecuteAnalyzerV2GatewayTask(gatewayTask);

  return {
    stageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    visibility: "internal_only",
    inputSource: "direct_input",
    status: executable ? "blocked_by_stage_scope" : "blocked_by_gateway",
    result: null,
    blockedReason: executable ? "runtime_dispatch_not_enabled" : "gateway_policy_not_executable",
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: gatewayTask.status,
    cacheEligibility: "not_evaluated",
    sideEffects: noDispatchSideEffects(),
  };
}

function isRealString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasRuntimeProviderBoundary(
  value: ClaimUnderstandingRuntimeProviderBoundary | null | undefined,
): value is ClaimUnderstandingRuntimeProviderBoundary {
  return typeof value?.providerCall === "function"
    && isRealString(value.provider)
    && isRealString(value.modelName)
    && isRealString(value.configSnapshotHash)
    && Number.isFinite(value.temperature);
}

function hasApprovedPolicyIdentity(
  approval: AnalyzerV2PolicyApproval | null | undefined,
): approval is AnalyzerV2PolicyApproval & { status: "approved"; reviewer: string; approvedAt: string } {
  return approval?.status === "approved"
    && isRealString(approval.reviewer)
    && isRealString(approval.approvedAt);
}

function buildRuntimeApprovalSnapshotFromGatewayTask(
  gatewayTask: AnalyzerV2GatewayTask,
): ClaimUnderstandingDispatchReadinessApprovalSnapshot | null {
  if (
    !canExecuteAnalyzerV2GatewayTask(gatewayTask)
    || !hasApprovedPolicyIdentity(gatewayTask.promptPolicy?.approval)
    || !hasApprovedPolicyIdentity(gatewayTask.modelPolicy?.approval)
    || !hasApprovedPolicyIdentity(gatewayTask.cachePolicy?.approval)
  ) {
    return null;
  }

  const approvalSnapshotId = sha256Json({
    gatewayTaskId: gatewayTask.id,
    promptApproval: gatewayTask.promptPolicy.approval,
    modelApproval: gatewayTask.modelPolicy.approval,
    cacheApproval: gatewayTask.cachePolicy.approval,
  });

  return {
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    promptApprovalStatus: "approved",
    modelApprovalStatus: "approved",
    cacheApprovalStatus: "approved",
    approvalSource: "runtime_approval_snapshot",
    approvalSnapshotId,
    approvalSnapshotVersion: CLAIM_UNDERSTANDING_RUNTIME_APPROVAL_SNAPSHOT_VERSION,
    approvedBy: [
      `prompt:${gatewayTask.promptPolicy.approval.reviewer}`,
      `model:${gatewayTask.modelPolicy.approval.reviewer}`,
      `cache:${gatewayTask.cachePolicy.approval.reviewer}`,
    ].join(";"),
    approvedAt: [
      gatewayTask.promptPolicy.approval.approvedAt,
      gatewayTask.modelPolicy.approval.approvedAt,
      gatewayTask.cachePolicy.approval.approvedAt,
    ].sort().at(-1) ?? gatewayTask.promptPolicy.approval.approvedAt,
  };
}

function artifactSchemaOutcome(
  result: ClaimUnderstandingResult | null,
): ClaimUnderstandingRuntimeArtifact["schemaOutcome"] {
  if (!result) {
    return {
      status: "not_attempted",
      blockedReason: null,
      damagedReason: null,
    };
  }

  return {
    status: result.status,
    blockedReason: result.blockedReason,
    damagedReason: result.damagedReason,
  };
}

async function recordRuntimeArtifact(params: {
  context: PipelineRunContext;
  activation: ClaimUnderstandingRuntimeActivationState;
  status: "blocked" | "completed";
  gatewayTaskStatus: AnalyzerV2GatewayTaskStatus | "not_constructed";
  result: ClaimUnderstandingResult | null;
  blockedReason: string | null;
  failureMessage: string | null;
  dispatchResult?: ClaimUnderstandingRuntimeDispatchResult | null;
}): Promise<void> {
  const dispatchResult = params.dispatchResult ?? null;
  const adapterTelemetry = dispatchResult?.status === "completed"
    ? dispatchResult.adapterOutcome.telemetry
    : null;
  const providerTelemetry = adapterTelemetry?.providerId && adapterTelemetry.modelId
    ? {
      providerId: adapterTelemetry.providerId,
      modelId: adapterTelemetry.modelId,
      inputTokens: adapterTelemetry.tokenUsage.inputTokens,
      outputTokens: adapterTelemetry.tokenUsage.outputTokens,
      totalTokens: adapterTelemetry.tokenUsage.totalTokens,
      durationMs: adapterTelemetry.durationMs,
    }
    : null;
  const cacheDecision = dispatchResult?.cacheDecision
    ? {
      reason: dispatchResult.cacheDecision.reason,
      canRead: dispatchResult.cacheDecision.canRead,
      canWrite: dispatchResult.cacheDecision.canWrite,
    }
    : null;

  await params.activation.artifactSink.record({
    artifactVersion: CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
    artifactId: sha256Json({
      runId: params.context.runId,
      activationSnapshotHash: params.activation.activationSnapshot.activationSnapshotHash,
      status: params.status,
      blockedReason: params.blockedReason,
      failureMessage: params.failureMessage,
    }),
    ledgerId: params.activation.artifactSink.ledgerId,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    runId: params.context.runId,
    inputSource: "direct_input",
    executionStatus: params.status,
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: params.gatewayTaskStatus,
    activationSnapshotHash: params.activation.activationSnapshot.activationSnapshotHash,
    configSnapshotHash: params.activation.status === "enabled"
      ? params.activation.runtimeConfigSnapshot.configSnapshotHash
      : null,
    promptContentHash: dispatchResult?.status === "completed"
      ? dispatchResult.promptProvenance.promptContentHash
      : null,
    renderedPromptHash: dispatchResult?.status === "completed"
      ? dispatchResult.promptProvenance.renderedPromptHash
      : null,
    providerTelemetry,
    schemaOutcome: artifactSchemaOutcome(params.result),
    failureState: {
      blockedReason: params.blockedReason,
      failureMessage: params.failureMessage,
    },
    cacheDecision,
    warningMateriality: "admin_only_internal",
  });
}

function buildDirectTextRuntimeProvenancePacket(
  frame: ClaimUnderstandingDispatchFrame,
  providerBoundary: ClaimUnderstandingRuntimeProviderBoundary,
): ClaimUnderstandingDispatchReadinessProvenancePacket {
  const inputGroundingSeed = {
    source: "direct_input",
    inputType: "text",
    inputValue: frame.analysisInput,
    resolvedInputText: frame.resolvedInputText,
    detectedLanguage: frame.detectedLanguage,
    currentDate: frame.currentDate,
    acsSnapshotHash: null,
  };

  return {
    provenancePhase: "pre_render",
    submittedKind: "text",
    analysisInput: frame.analysisInput,
    resolvedInputText: frame.resolvedInputText,
    selectedAtomicClaimIds: [...frame.selectedAtomicClaimIds],
    promptProfile: "claimboundary-v2",
    promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
    promptContentHash: null,
    renderedPromptHash: null,
    configSnapshotHash: providerBoundary.configSnapshotHash,
    modelTask: "understand",
    provider: providerBoundary.provider,
    modelName: providerBoundary.modelName,
    temperature: providerBoundary.temperature,
    outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    resultSchemaVersion: CLAIMBOUNDARY_V2_PRECUTOVER_RESULT_SCHEMA_VERSION,
    inputSource: "direct_input",
    inputIdentityHash: sha256Json({
      inputSource: "direct_input",
      analysisInput: frame.analysisInput,
      resolvedInputText: frame.resolvedInputText,
      selectedAtomicClaimIds: frame.selectedAtomicClaimIds,
      currentDate: frame.currentDate,
    }),
    acsSnapshotHash: null,
    inputGroundingSeedHash: sha256Json(inputGroundingSeed),
    currentDateBucket: frame.currentDate,
    cacheDecisionState: "not_constructed",
  };
}

function directRuntimeState(params: {
  status: ClaimUnderstandingDirectInputRuntimeStatus;
  result: ClaimUnderstandingResult | null;
  blockedReason: ClaimUnderstandingDirectInputRuntimeBlockedReason | null;
  gatewayTaskStatus: AnalyzerV2GatewayTaskStatus;
  runtimeDispatchStatus: "not_attempted" | "blocked" | "completed";
  runtimeDispatchBlockedReason: string | null;
  cacheEligibility: "not_evaluated" | "runtime_no_store";
  sideEffects: ClaimUnderstandingRuntimeSideEffects;
}): ClaimUnderstandingDirectInputRuntimeState {
  return {
    stageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    visibility: "internal_only",
    inputSource: "direct_input",
    gatewayTaskId: "claim_understanding_gate1",
    ...params,
  };
}

async function evaluateDirectInputRuntimeDispatch(
  input: ClaimBoundaryV2Ingress,
  context: PipelineRunContext,
  options: ClaimUnderstandingRuntimeStageOptions,
): Promise<ClaimUnderstandingRuntimeState> {
  const activation = options.activation ?? null;

  if (activation?.status === "disabled") {
    await recordRuntimeArtifact({
      context,
      activation,
      status: "blocked",
      gatewayTaskStatus: "not_constructed",
      result: null,
      blockedReason: activation.disabledReason === "activation_snapshot_invalid"
        ? "runtime_activation_invalid"
        : "runtime_activation_disabled",
      failureMessage: activation.failureMessage,
    });

    return directRuntimeState({
      status: "blocked_by_runtime_activation",
      result: null,
      blockedReason: activation.disabledReason === "activation_snapshot_invalid"
        ? "runtime_activation_invalid"
        : "runtime_activation_disabled",
      gatewayTaskStatus: "notImplemented",
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: activation.disabledReason,
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects(),
    });
  }

  const gatewayTask = activation?.status === "enabled"
    ? activation.gatewayTask
    : getPipelineRunGatewayTask(context, "claim_understanding_gate1");

  if (activation?.status !== "enabled") {
    return evaluateDirectInput(context);
  }

  const frameResult = buildClaimUnderstandingDispatchFrame(input, context);
  if (frameResult.status === "blocked") {
    const state = directRuntimeState({
      status: "blocked_by_dispatch_preflight",
      result: null,
      blockedReason: "runtime_dispatch_preflight_blocked",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: frameResult.blockedReason,
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects(),
    });
    await recordRuntimeArtifact({
      context,
      activation,
      status: "blocked",
      gatewayTaskStatus: gatewayTask.status,
      result: null,
      blockedReason: state.blockedReason,
      failureMessage: state.runtimeDispatchBlockedReason,
    });
    return state;
  }

  const approvalSnapshot = buildRuntimeApprovalSnapshotFromGatewayTask(gatewayTask);
  if (!approvalSnapshot) {
    return evaluateDirectInput(context);
  }

  const providerBoundary = activation.providerBoundary;
  if (!hasRuntimeProviderBoundary(providerBoundary)) {
    const state = directRuntimeState({
      status: "blocked_by_missing_provider_callback",
      result: null,
      blockedReason: "runtime_dispatch_provider_callback_missing",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: "runtime_dispatch_provider_callback_missing",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects(),
    });
    await recordRuntimeArtifact({
      context,
      activation,
      status: "blocked",
      gatewayTaskStatus: gatewayTask.status,
      result: null,
      blockedReason: state.blockedReason,
      failureMessage: state.runtimeDispatchBlockedReason,
    });
    return state;
  }

  const readiness: ClaimUnderstandingDispatchReadinessResult =
    validateClaimUnderstandingDispatchReadinessContract({
      frame: frameResult.frame,
      approvalSnapshot,
      provenancePacket: buildDirectTextRuntimeProvenancePacket(frameResult.frame, providerBoundary),
    });

  if (readiness.status === "blocked") {
    const state = directRuntimeState({
      status: "blocked_by_dispatch_readiness",
      result: null,
      blockedReason: "runtime_dispatch_readiness_blocked",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: readiness.blockedReasons.join(","),
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects(),
    });
    await recordRuntimeArtifact({
      context,
      activation,
      status: "blocked",
      gatewayTaskStatus: gatewayTask.status,
      result: null,
      blockedReason: state.blockedReason,
      failureMessage: state.runtimeDispatchBlockedReason,
    });
    return state;
  }

  const modelPolicy = activation.modelPolicy ?? getPipelineRunTaskModelPolicy(context, "claim_understanding_gate1");
  if (!modelPolicy) {
    const state = directRuntimeState({
      status: "runtime_dispatch_blocked",
      result: null,
      blockedReason: "runtime_dispatch_model_policy_missing",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: "runtime_dispatch_model_policy_missing",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects(),
    });
    await recordRuntimeArtifact({
      context,
      activation,
      status: "blocked",
      gatewayTaskStatus: gatewayTask.status,
      result: null,
      blockedReason: state.blockedReason,
      failureMessage: state.runtimeDispatchBlockedReason,
    });
    return state;
  }

  const dispatchResult = await executeClaimUnderstandingRuntimeDispatch({
    readiness,
    gatewayTask,
    modelPolicy,
    providerCall: providerBoundary.providerCall,
  });

  if (dispatchResult.status === "blocked") {
    const state = directRuntimeState({
      status: "runtime_dispatch_blocked",
      result: null,
      blockedReason: "runtime_dispatch_blocked",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "blocked",
      runtimeDispatchBlockedReason: dispatchResult.blockedReason,
      cacheEligibility: dispatchResult.cacheDecision ? "runtime_no_store" : "not_evaluated",
      sideEffects: dispatchSideEffects(dispatchResult.sideEffects),
    });
    await recordRuntimeArtifact({
      context,
      activation,
      status: "blocked",
      gatewayTaskStatus: gatewayTask.status,
      result: null,
      blockedReason: state.blockedReason,
      failureMessage: dispatchResult.failureMessage ?? dispatchResult.blockedReason,
      dispatchResult,
    });
    return state;
  }

  const state = directRuntimeState({
    status: "runtime_dispatch_completed",
    result: dispatchResult.adapterOutcome.claimUnderstandingResult,
    blockedReason: null,
    gatewayTaskStatus: gatewayTask.status,
    runtimeDispatchStatus: "completed",
    runtimeDispatchBlockedReason: null,
    cacheEligibility: "runtime_no_store",
    sideEffects: dispatchSideEffects(dispatchResult.sideEffects),
  });
  await recordRuntimeArtifact({
    context,
    activation,
    status: "completed",
    gatewayTaskStatus: gatewayTask.status,
    result: state.result,
    blockedReason: null,
    failureMessage: null,
    dispatchResult,
  });
  return state;
}

export async function runClaimUnderstandingRuntimeStage(
  input: ClaimBoundaryV2Ingress,
  context: PipelineRunContext,
  options: ClaimUnderstandingRuntimeStageOptions = {},
): Promise<ClaimUnderstandingRuntimeState> {
  if (input.preparedSeed) {
    return evaluateAcsPreparedSnapshot(input, context);
  }

  return evaluateDirectInputRuntimeDispatch(input, context, options);
}
