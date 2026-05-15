import type { EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";
import {
  SOURCE_ACQUISITION_POLICY_SNAPSHOT_VERSION,
  SOURCE_ACQUISITION_REQUEST_VERSION,
  type EvidenceAcquisitionPolicySnapshot,
  type SourceAcquisitionBlockedReason,
  type SourceAcquisitionRequest,
  type SourceAcquisitionRetrievalPolicy,
  type SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";

const PLANNED_TASKS: EvidenceAcquisitionPolicySnapshot["plannedTasks"] = [
  { taskKey: "evidence_query_planning", status: "symbolic_not_executable" },
  { taskKey: "evidence_applicability", status: "symbolic_not_executable" },
  { taskKey: "evidence_extraction", status: "symbolic_not_executable" },
  { taskKey: "evidence_sufficiency", status: "symbolic_not_executable" },
];

const RETRIEVAL_POLICY_CATALOG: readonly SourceAcquisitionRetrievalPolicy[] = [
  { policyKey: "baseline_research", status: "planned_not_executable", source: "static_contract_only" },
  { policyKey: "primary_source_refinement", status: "planned_not_executable", source: "static_contract_only" },
  { policyKey: "contradiction_search", status: "planned_not_executable", source: "static_contract_only" },
  { policyKey: "supplementary_language_lane", status: "planned_not_executable", source: "static_contract_only" },
  { policyKey: "evidence_scarcity_handling", status: "planned_not_executable", source: "static_contract_only" },
];

function buildPolicySnapshot(): EvidenceAcquisitionPolicySnapshot {
  return {
    snapshotVersion: SOURCE_ACQUISITION_POLICY_SNAPSHOT_VERSION,
    source: "static_contract_only",
    policyStatus: "not_executable",
    plannedTasks: PLANNED_TASKS.map((task) => ({ ...task })),
    retrievalPolicyCatalog: RETRIEVAL_POLICY_CATALOG.map((policy) => ({ ...policy })),
    cachePolicy: "no_store_no_read",
    providerExecution: "not_wired",
    promptModelExecution: "not_approved",
    publicExposure: "forbidden",
    sourceReliabilityIntegration: "thin_port_pending",
    sourceLanguagePolicy: "source_language_first_planned_not_executable",
  };
}

function blockedDecision(
  decision: EvidenceLifecycleStartDecision,
  blockedReason: SourceAcquisitionBlockedReason,
): SourceAcquisitionStartDecision {
  return {
    decisionVersion: SOURCE_ACQUISITION_REQUEST_VERSION,
    visibility: "internal_only",
    status: "blocked",
    request: null,
    blockedReason,
    sourceEvidenceLifecycleStatus: decision.status,
  };
}

function buildRequest(
  decision: Extract<EvidenceLifecycleStartDecision, { status: "intake_ready" }>,
): SourceAcquisitionRequest {
  const intake = decision.intake;
  const policySnapshot = buildPolicySnapshot();

  return {
    requestVersion: SOURCE_ACQUISITION_REQUEST_VERSION,
    visibility: "internal_only",
    executionScope: "contract_only_no_provider_execution",
    sourceAcquisitionStatus: "ready_not_executable",
    intake: {
      intakeVersion: intake.intakeVersion,
      selectedAtomicClaimIds: [...intake.claimContract.input.selectedAtomicClaimIds],
      runId: intake.pipelineRunContext.runId,
      currentDate: intake.pipelineRunContext.currentDate,
      detectedLanguage: intake.pipelineRunContext.detectedLanguage,
    },
    policySnapshot,
    retrievalPolicyCatalog: policySnapshot.retrievalPolicyCatalog.map((policy) => ({ ...policy })),
    claimContract: intake.claimContract,
  };
}

export function buildSourceAcquisitionRequest(
  decision: EvidenceLifecycleStartDecision,
): SourceAcquisitionStartDecision {
  if (decision.status === "blocked") {
    return blockedDecision(decision, "evidence_lifecycle_blocked");
  }

  if (!decision.intake) {
    return blockedDecision(decision, "evidence_lifecycle_intake_missing");
  }

  if (!decision.intake.claimContract) {
    return blockedDecision(decision, "claim_contract_missing");
  }

  return {
    decisionVersion: SOURCE_ACQUISITION_REQUEST_VERSION,
    visibility: "internal_only",
    status: "source_acquisition_ready_not_executable",
    request: buildRequest(decision),
    blockedReason: null,
    sourceEvidenceLifecycleStatus: "intake_ready",
  };
}
