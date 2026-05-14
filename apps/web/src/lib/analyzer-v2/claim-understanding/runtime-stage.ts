import { createHash } from "node:crypto";
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
  type ClaimUnderstandingRuntimeDispatchRequest,
  type ClaimUnderstandingRuntimeDispatchResult,
} from "@/lib/analyzer-v2/claim-understanding/runtime-dispatch";
import {
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimIntegrityEvent,
  type ClaimUnderstandingBlockedReason,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import type { ClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  canExecuteAnalyzerV2GatewayTask,
  getAnalyzerV2GatewayTask,
} from "@/lib/analyzer-v2/gateway/policy";
import type { AnalyzerV2GatewayTaskStatus } from "@/lib/analyzer-v2/gateway/types";

export const CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION = "v2.claim-understanding.runtime-stage.0";
const CLAIM_UNDERSTANDING_RUNTIME_APPROVAL_SNAPSHOT_ID =
  "captain-approved-6b3c4a-direct-text-runtime-scaffold";
const CLAIM_UNDERSTANDING_RUNTIME_APPROVAL_SNAPSHOT_VERSION =
  "v2.claim-understanding.runtime-approval-snapshot.6b3c4a";
const CLAIM_UNDERSTANDING_RUNTIME_APPROVED_BY = "Captain approval for 6B.3c-4A";
const CLAIM_UNDERSTANDING_RUNTIME_APPROVED_AT = "2026-05-14T00:00:00.000Z";
const CLAIMBOUNDARY_V2_PRECUTOVER_RESULT_SCHEMA_VERSION = "4.0.0-cb-precutover";

export type ClaimUnderstandingRuntimeProviderBoundary = {
  providerCall: ClaimUnderstandingRuntimeDispatchRequest["providerCall"];
  provider: string;
  modelName: string;
  configSnapshotHash: string;
  temperature: number;
};

export type ClaimUnderstandingDirectTextRuntimeDispatchOptions = {
  enabled?: boolean;
  providerBoundary?: ClaimUnderstandingRuntimeProviderBoundary | null;
};

export type ClaimUnderstandingRuntimeStageOptions = {
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
  | "runtime_dispatch_provider_callback_missing"
  | "runtime_dispatch_preflight_blocked"
  | "runtime_dispatch_readiness_blocked"
  | "runtime_dispatch_blocked";

export type ClaimUnderstandingDirectInputRuntimeStatus =
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
  context: ClaimBoundaryV2RunContext,
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

function evaluateDirectInput(): ClaimUnderstandingRuntimeState {
  const gatewayTask = getAnalyzerV2GatewayTask("claim_understanding_gate1");
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

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
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

function buildCaptainConfirmedRuntimeApprovalSnapshot(): ClaimUnderstandingDispatchReadinessApprovalSnapshot {
  return {
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    promptApprovalStatus: "approved",
    modelApprovalStatus: "approved",
    cacheApprovalStatus: "approved",
    approvalSource: "runtime_approval_snapshot",
    approvalSnapshotId: CLAIM_UNDERSTANDING_RUNTIME_APPROVAL_SNAPSHOT_ID,
    approvalSnapshotVersion: CLAIM_UNDERSTANDING_RUNTIME_APPROVAL_SNAPSHOT_VERSION,
    approvedBy: CLAIM_UNDERSTANDING_RUNTIME_APPROVED_BY,
    approvedAt: CLAIM_UNDERSTANDING_RUNTIME_APPROVED_AT,
  };
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
}): ClaimUnderstandingRuntimeState {
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
  context: ClaimBoundaryV2RunContext,
  options: ClaimUnderstandingRuntimeStageOptions,
): Promise<ClaimUnderstandingRuntimeState> {
  const gatewayTask = getAnalyzerV2GatewayTask("claim_understanding_gate1");

  if (options.directTextRuntimeDispatch?.enabled !== true) {
    return evaluateDirectInput();
  }

  const frameResult = buildClaimUnderstandingDispatchFrame(input, context);
  if (frameResult.status === "blocked") {
    return directRuntimeState({
      status: "blocked_by_dispatch_preflight",
      result: null,
      blockedReason: "runtime_dispatch_preflight_blocked",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: frameResult.blockedReason,
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects(),
    });
  }

  const providerBoundary = options.directTextRuntimeDispatch.providerBoundary;
  if (!hasRuntimeProviderBoundary(providerBoundary)) {
    return directRuntimeState({
      status: "blocked_by_missing_provider_callback",
      result: null,
      blockedReason: "runtime_dispatch_provider_callback_missing",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: "runtime_dispatch_provider_callback_missing",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects(),
    });
  }

  const readiness: ClaimUnderstandingDispatchReadinessResult =
    validateClaimUnderstandingDispatchReadinessContract({
      frame: frameResult.frame,
      approvalSnapshot: buildCaptainConfirmedRuntimeApprovalSnapshot(),
      provenancePacket: buildDirectTextRuntimeProvenancePacket(frameResult.frame, providerBoundary),
    });

  if (readiness.status === "blocked") {
    return directRuntimeState({
      status: "blocked_by_dispatch_readiness",
      result: null,
      blockedReason: "runtime_dispatch_readiness_blocked",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: readiness.blockedReasons.join(","),
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects(),
    });
  }

  const dispatchResult = await executeClaimUnderstandingRuntimeDispatch({
    readiness,
    providerCall: providerBoundary.providerCall,
  });

  if (dispatchResult.status === "blocked") {
    return directRuntimeState({
      status: "runtime_dispatch_blocked",
      result: null,
      blockedReason: "runtime_dispatch_blocked",
      gatewayTaskStatus: gatewayTask.status,
      runtimeDispatchStatus: "blocked",
      runtimeDispatchBlockedReason: dispatchResult.blockedReason,
      cacheEligibility: dispatchResult.cacheDecision ? "runtime_no_store" : "not_evaluated",
      sideEffects: dispatchSideEffects(dispatchResult.sideEffects),
    });
  }

  return directRuntimeState({
    status: "runtime_dispatch_completed",
    result: dispatchResult.adapterOutcome.claimUnderstandingResult,
    blockedReason: null,
    gatewayTaskStatus: gatewayTask.status,
    runtimeDispatchStatus: "completed",
    runtimeDispatchBlockedReason: null,
    cacheEligibility: "runtime_no_store",
    sideEffects: dispatchSideEffects(dispatchResult.sideEffects),
  });
}

export async function runClaimUnderstandingRuntimeStage(
  input: ClaimBoundaryV2Ingress,
  context: ClaimBoundaryV2RunContext,
  options: ClaimUnderstandingRuntimeStageOptions = {},
): Promise<ClaimUnderstandingRuntimeState> {
  if (input.preparedSeed) {
    return evaluateAcsPreparedSnapshot(input, context);
  }

  return evaluateDirectInputRuntimeDispatch(input, context, options);
}
