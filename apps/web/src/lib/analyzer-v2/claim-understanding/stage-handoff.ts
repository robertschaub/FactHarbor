import type { ClaimUnderstandingRuntimeState } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import type {
  ClaimContract,
  ClaimIntegrityEvent,
  ClaimUnderstandingBlockedReason,
  ClaimUnderstandingDamagedReason,
} from "@/lib/analyzer-v2/claim-understanding/types";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import type { ClaimPreparationEnvelopeDiagnostic } from "@/lib/analyzer-v2/result-envelope";

export const CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION = "v2.claim-understanding.stage-handoff.0";

export type ClaimUnderstandingStageHandoffStatus = "accepted" | "blocked" | "damaged";

export type ClaimUnderstandingStageBlockedReason =
  | ClaimUnderstandingBlockedReason
  | "gateway_policy_not_executable"
  | "runtime_dispatch_not_enabled"
  | "runtime_activation_disabled"
  | "runtime_activation_invalid"
  | "runtime_dispatch_model_policy_missing"
  | "runtime_dispatch_provider_callback_missing"
  | "runtime_dispatch_preflight_blocked"
  | "runtime_dispatch_readiness_blocked"
  | "runtime_dispatch_blocked";

export type ClaimUnderstandingDownstreamStartDecision = {
  evidenceLifecycleStatus: "blocked_precutover";
  reason: "public_cutover_not_approved" | "claim_understanding_blocked" | "claim_understanding_damaged";
};

export type ClaimUnderstandingStageIntegrityEventSummary = {
  type: ClaimIntegrityEvent["type"];
  severity: ClaimIntegrityEvent["severity"];
  claimIds: readonly string[];
};

type ClaimUnderstandingStageHandoffBase = {
  handoffVersion: typeof CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION;
  visibility: "internal_only";
  runtimeStageVersion: ClaimUnderstandingRuntimeState["stageVersion"];
  runtimeStatus: ClaimUnderstandingRuntimeState["status"];
  inputSource: ClaimUnderstandingRuntimeState["inputSource"];
  selectedAtomicClaimIds: readonly string[];
  gatewayTaskId: ClaimUnderstandingRuntimeState["gatewayTaskId"];
  gatewayTaskStatus: ClaimUnderstandingRuntimeState["gatewayTaskStatus"];
  cacheEligibility: ClaimUnderstandingRuntimeState["cacheEligibility"];
  integrityEventSummaries: readonly ClaimUnderstandingStageIntegrityEventSummary[];
};

export type ClaimUnderstandingStageHandoff =
  | (ClaimUnderstandingStageHandoffBase & {
    status: "accepted";
    claimContract: ClaimContract;
    blockedReason: null;
    damagedReason: null;
    downstreamStart: ClaimUnderstandingDownstreamStartDecision & {
      reason: "public_cutover_not_approved";
    };
  })
  | (ClaimUnderstandingStageHandoffBase & {
    status: "blocked";
    claimContract: null;
    blockedReason: ClaimUnderstandingStageBlockedReason;
    damagedReason: null;
    downstreamStart: ClaimUnderstandingDownstreamStartDecision & {
      reason: "claim_understanding_blocked";
    };
  })
  | (ClaimUnderstandingStageHandoffBase & {
    status: "damaged";
    claimContract: null;
    blockedReason: null;
    damagedReason: ClaimUnderstandingDamagedReason;
    downstreamStart: ClaimUnderstandingDownstreamStartDecision & {
      reason: "claim_understanding_damaged";
    };
  });

function integrityEventSummaries(
  result: ClaimUnderstandingRuntimeState["result"],
): ClaimUnderstandingStageIntegrityEventSummary[] {
  return (result?.integrityEvents ?? []).map((event) => ({
    type: event.type,
    severity: event.severity,
    claimIds: [...event.claimIds],
  }));
}

function selectedAtomicClaimIds(
  context: PipelineRunContext,
  result: ClaimUnderstandingRuntimeState["result"],
): string[] {
  return result?.status === "accepted"
    ? [...result.claimContract.input.selectedAtomicClaimIds]
    : [...context.selectedAtomicClaimIds];
}

function handoffBase(
  context: PipelineRunContext,
  state: ClaimUnderstandingRuntimeState,
): ClaimUnderstandingStageHandoffBase {
  return {
    handoffVersion: CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
    visibility: "internal_only",
    runtimeStageVersion: state.stageVersion,
    runtimeStatus: state.status,
    inputSource: state.inputSource,
    selectedAtomicClaimIds: selectedAtomicClaimIds(context, state.result),
    gatewayTaskId: state.gatewayTaskId,
    gatewayTaskStatus: state.gatewayTaskStatus,
    cacheEligibility: state.cacheEligibility,
    integrityEventSummaries: integrityEventSummaries(state.result),
  };
}

function readBlockedReason(state: ClaimUnderstandingRuntimeState): ClaimUnderstandingStageBlockedReason {
  const reason = state.result?.status === "blocked" ? state.result.blockedReason : state.blockedReason;
  if (!reason) {
    throw new Error("Analyzer V2 Claim Understanding blocked handoff requires a blocked reason.");
  }
  return reason;
}

function readDamagedReason(state: ClaimUnderstandingRuntimeState): ClaimUnderstandingDamagedReason {
  const reason = state.result?.status === "damaged" ? state.result.damagedReason : null;
  if (!reason) {
    throw new Error("Analyzer V2 Claim Understanding damaged handoff requires a damaged reason.");
  }
  return reason;
}

export function buildClaimUnderstandingStageHandoff(
  context: PipelineRunContext,
  state: ClaimUnderstandingRuntimeState,
): ClaimUnderstandingStageHandoff {
  const base = handoffBase(context, state);

  if (state.result?.status === "accepted") {
    return {
      ...base,
      status: "accepted",
      claimContract: state.result.claimContract,
      blockedReason: null,
      damagedReason: null,
      downstreamStart: {
        evidenceLifecycleStatus: "blocked_precutover",
        reason: "public_cutover_not_approved",
      },
    };
  }

  if (state.result?.status === "damaged") {
    return {
      ...base,
      status: "damaged",
      claimContract: null,
      blockedReason: null,
      damagedReason: readDamagedReason(state),
      downstreamStart: {
        evidenceLifecycleStatus: "blocked_precutover",
        reason: "claim_understanding_damaged",
      },
    };
  }

  return {
    ...base,
    status: "blocked",
    claimContract: null,
    blockedReason: readBlockedReason(state),
    damagedReason: null,
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "claim_understanding_blocked",
    },
  };
}

function blockCategoryForHandoff(
  handoff: ClaimUnderstandingStageHandoff,
): ClaimPreparationEnvelopeDiagnostic["blockCategory"] {
  if (handoff.status === "accepted") {
    return "none";
  }
  if (handoff.inputSource === "acs_prepared_snapshot") {
    return "input_contract";
  }
  if (handoff.blockedReason === "gateway_policy_not_executable") {
    return "policy_gate_closed";
  }
  return "stage_scope";
}

export function claimPreparationEnvelopeDiagnosticsFromHandoff(
  handoff: ClaimUnderstandingStageHandoff,
): ClaimPreparationEnvelopeDiagnostic[] {
  return handoff.integrityEventSummaries.map((event) => ({
    inputSource: handoff.inputSource,
    preparationStatus: handoff.status,
    eventType: event.type,
    eventSeverity: event.severity,
    claimIds: [...event.claimIds],
    acsMigrationStatus: handoff.status === "accepted"
      ? handoff.claimContract.acsMigration?.status ?? null
      : null,
    blockCategory: blockCategoryForHandoff(handoff),
  }));
}
