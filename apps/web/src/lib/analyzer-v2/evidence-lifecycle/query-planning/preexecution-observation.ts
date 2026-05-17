import { ClaimContractSchema } from "@/lib/analyzer-v2/claim-understanding/schemas";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";

export const EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_VERSION =
  "v2.evidence-query-planning.preexecution-observation.x7o";

export type EvidenceQueryPlanningPreexecutionObservationStatus =
  | "structural_prerequisites_observed_not_executed_precutover"
  | "blocked_pre_query_planning";

export type EvidenceQueryPlanningPreexecutionObservationBlockedReason =
  | "evidence_lifecycle_intake_blocked"
  | "claim_contract_missing"
  | "claim_contract_invalid"
  | "direct_text_claim_contract_required"
  | "selected_claim_ids_invalid"
  | "language_signal_unavailable"
  | "query_planning_product_execution_not_approved";

export type EvidenceQueryPlanningPreexecutionObservationExecution = {
  readonly queryPlanningExecuted: false;
  readonly promptLoaded: false;
  readonly promptRendered: false;
  readonly modelCalled: false;
  readonly providerCallbackCreated: false;
  readonly providerSearchFetchCalled: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly sourceReliabilityCalled: false;
};

export type EvidenceQueryPlanningPreexecutionObservation = {
  readonly observationVersion: typeof EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_VERSION;
  readonly visibility: "internal_only";
  readonly status: EvidenceQueryPlanningPreexecutionObservationStatus;
  readonly blockedReason: EvidenceQueryPlanningPreexecutionObservationBlockedReason | null;
  readonly sourceIntakeStatus: EvidenceLifecycleStartDecision["status"];
  readonly inputScope:
    | "direct_text_claim_contract"
    | "unsupported_claim_contract_scope"
    | "not_applicable";
  readonly selectedAtomicClaimCount: number;
  readonly sourceLanguageSignal: "present" | "unavailable";
  readonly taskPolicy: {
    readonly queryPlanningPolicySignal:
      | "hidden_task_policy_observed_not_invoked"
      | "not_observed_execution_gate_required";
    readonly productExecutionAuthority: "product_invocation_blocked_precutover";
  };
  readonly execution: EvidenceQueryPlanningPreexecutionObservationExecution;
};

function noExecution(): EvidenceQueryPlanningPreexecutionObservationExecution {
  return {
    queryPlanningExecuted: false,
    promptLoaded: false,
    promptRendered: false,
    modelCalled: false,
    providerCallbackCreated: false,
    providerSearchFetchCalled: false,
    cacheRead: false,
    cacheWrite: false,
    sourceReliabilityCalled: false,
  };
}

function blocked(params: {
  readonly reason: EvidenceQueryPlanningPreexecutionObservationBlockedReason;
  readonly sourceIntakeStatus: EvidenceLifecycleStartDecision["status"];
  readonly inputScope?: EvidenceQueryPlanningPreexecutionObservation["inputScope"];
  readonly selectedAtomicClaimCount?: number;
  readonly sourceLanguageSignal?: EvidenceQueryPlanningPreexecutionObservation["sourceLanguageSignal"];
}): EvidenceQueryPlanningPreexecutionObservation {
  return {
    observationVersion: EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_query_planning",
    blockedReason: params.reason,
    sourceIntakeStatus: params.sourceIntakeStatus,
    inputScope: params.inputScope ?? "not_applicable",
    selectedAtomicClaimCount: params.selectedAtomicClaimCount ?? 0,
    sourceLanguageSignal: params.sourceLanguageSignal ?? "unavailable",
    taskPolicy: {
      queryPlanningPolicySignal: "not_observed_execution_gate_required",
      productExecutionAuthority: "product_invocation_blocked_precutover",
    },
    execution: noExecution(),
  };
}

function hasLanguageSignal(claimContract: ClaimContract): boolean {
  for (const language of [
    claimContract.input.detectedLanguage,
    claimContract.inputGroundingSeed.detectedLanguage,
  ]) {
    const normalized = language.trim();
    if (normalized.length > 0 && normalized.toLowerCase() !== "und") {
      return true;
    }
  }
  return false;
}

function isDirectTextClaimContract(claimContract: ClaimContract): boolean {
  return claimContract.input.inputType === "text"
    && claimContract.inputGroundingSeed.inputType === "text"
    && claimContract.inputGroundingSeed.source === "direct_input"
    && claimContract.acsMigration === null;
}

function selectedClaimIdsAreStructurallyValid(claimContract: ClaimContract): boolean {
  const selectedClaimIds = claimContract.input.selectedAtomicClaimIds.map((claimId) => claimId.trim());
  if (selectedClaimIds.length === 0 || selectedClaimIds.some((claimId) => claimId.length === 0)) {
    return false;
  }
  if (new Set(selectedClaimIds).size !== selectedClaimIds.length) {
    return false;
  }

  const claimById = new Map(claimContract.atomicClaims.map((claim) => [claim.id, claim]));
  return selectedClaimIds.every((claimId) => {
    const claim = claimById.get(claimId);
    return Boolean(claim?.selected);
  });
}

export function buildEvidenceQueryPlanningPreexecutionObservation(
  decision: EvidenceLifecycleStartDecision,
): EvidenceQueryPlanningPreexecutionObservation {
  if (decision.status !== "intake_ready") {
    return blocked({
      reason: "evidence_lifecycle_intake_blocked",
      sourceIntakeStatus: "blocked",
    });
  }

  const rawClaimContract = decision.intake?.claimContract;
  if (!rawClaimContract) {
    return blocked({
      reason: "claim_contract_missing",
      sourceIntakeStatus: "intake_ready",
    });
  }

  const parsedClaimContract = ClaimContractSchema.safeParse(rawClaimContract);
  if (!parsedClaimContract.success) {
    return blocked({
      reason: "claim_contract_invalid",
      sourceIntakeStatus: "intake_ready",
    });
  }

  const claimContract = parsedClaimContract.data as ClaimContract;
  const selectedAtomicClaimCount = claimContract.input.selectedAtomicClaimIds.length;
  const sourceLanguageSignal = hasLanguageSignal(claimContract) ? "present" : "unavailable";

  if (!isDirectTextClaimContract(claimContract)) {
    return blocked({
      reason: "direct_text_claim_contract_required",
      sourceIntakeStatus: "intake_ready",
      inputScope: "unsupported_claim_contract_scope",
      selectedAtomicClaimCount,
      sourceLanguageSignal,
    });
  }

  if (!selectedClaimIdsAreStructurallyValid(claimContract)) {
    return blocked({
      reason: "selected_claim_ids_invalid",
      sourceIntakeStatus: "intake_ready",
      inputScope: "direct_text_claim_contract",
      selectedAtomicClaimCount,
      sourceLanguageSignal,
    });
  }

  if (sourceLanguageSignal === "unavailable") {
    return blocked({
      reason: "language_signal_unavailable",
      sourceIntakeStatus: "intake_ready",
      inputScope: "direct_text_claim_contract",
      selectedAtomicClaimCount,
      sourceLanguageSignal,
    });
  }

  return {
    observationVersion: EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_VERSION,
    visibility: "internal_only",
    status: "structural_prerequisites_observed_not_executed_precutover",
    blockedReason: null,
    sourceIntakeStatus: "intake_ready",
    inputScope: "direct_text_claim_contract",
    selectedAtomicClaimCount,
    sourceLanguageSignal: "present",
    taskPolicy: {
      queryPlanningPolicySignal: "hidden_task_policy_observed_not_invoked",
      productExecutionAuthority: "product_invocation_blocked_precutover",
    },
    execution: noExecution(),
  };
}
