import type { EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";
import {
  buildStaticEvidenceTaskPolicySnapshot,
  readStaticEvidenceRetrievalPolicyCatalog,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy";
import {
  SOURCE_ACQUISITION_REQUEST_VERSION,
  type SourceAcquisitionBlockedReason,
  type SourceAcquisitionRequest,
  type SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";

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
  const policySnapshot = buildStaticEvidenceTaskPolicySnapshot();

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
    retrievalPolicyCatalog: readStaticEvidenceRetrievalPolicyCatalog(),
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
