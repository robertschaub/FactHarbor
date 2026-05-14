import { migrateAcsPreparedSnapshotToClaimContract } from "@/lib/analyzer-v2/claim-understanding/prepared-snapshot";
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

export type ClaimUnderstandingRuntimeSideEffects = {
  promptLoaded: false;
  promptRendered: false;
  adapterCalled: false;
  modelCalled: false;
  cacheDecisionConstructed: false;
  cacheRead: false;
  cacheWrite: false;
  providerCallbackCreated: false;
};

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

export function runClaimUnderstandingRuntimeStage(
  input: ClaimBoundaryV2Ingress,
  context: ClaimBoundaryV2RunContext,
): ClaimUnderstandingRuntimeState {
  if (input.preparedSeed) {
    return evaluateAcsPreparedSnapshot(input, context);
  }

  return evaluateDirectInput();
}
