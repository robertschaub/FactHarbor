import type { SourceAcquisitionStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import {
  EVIDENCE_CORPUS_BUILD_DECISION_VERSION,
  type EvidenceCorpusBuildBlockedReason,
  type EvidenceCorpusBuildDecision,
  type EvidenceCorpusBuildSourceAcquisitionTrace,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/types";

function sourceAcquisitionTrace(
  decision: SourceAcquisitionStartDecision,
): EvidenceCorpusBuildSourceAcquisitionTrace {
  return {
    decisionVersion: decision.decisionVersion,
    decisionStatus: decision.status,
    requestVersion: decision.request?.requestVersion ?? null,
    requestStatus: decision.request?.sourceAcquisitionStatus ?? null,
    upstreamBlockedReason: decision.blockedReason,
    sourceEvidenceLifecycleStatus: decision.sourceEvidenceLifecycleStatus,
  };
}

function blockedDecision(
  decision: SourceAcquisitionStartDecision,
  blockedReason: EvidenceCorpusBuildBlockedReason,
): EvidenceCorpusBuildDecision {
  return {
    decisionVersion: EVIDENCE_CORPUS_BUILD_DECISION_VERSION,
    visibility: "internal_only",
    executionScope: "contract_only_no_corpus_execution",
    status: "blocked_pre_execution",
    notBuiltReason: null,
    blockedReason,
    evidenceCorpus: null,
    claimContract: null,
    taskPolicySnapshot: null,
    retrievalPolicyCatalog: null,
    sourceAcquisition: sourceAcquisitionTrace(decision),
  };
}

export function buildEvidenceCorpusPreExecutionDecision(
  decision: SourceAcquisitionStartDecision,
): EvidenceCorpusBuildDecision {
  if (decision.status === "blocked") {
    return blockedDecision(decision, "source_acquisition_blocked");
  }

  const request = decision.request;
  if (!request) {
    return blockedDecision(decision, "source_acquisition_request_missing");
  }

  if (!request.claimContract) {
    return blockedDecision(decision, "claim_contract_missing");
  }

  if (!request.policySnapshot) {
    return blockedDecision(decision, "task_policy_provenance_missing");
  }

  if (!Array.isArray(request.retrievalPolicyCatalog) || request.retrievalPolicyCatalog.length === 0) {
    return blockedDecision(decision, "retrieval_policy_catalog_missing");
  }

  return {
    decisionVersion: EVIDENCE_CORPUS_BUILD_DECISION_VERSION,
    visibility: "internal_only",
    executionScope: "contract_only_no_corpus_execution",
    status: "not_built_pre_execution",
    notBuiltReason: "source_acquisition_not_executable",
    blockedReason: null,
    evidenceCorpus: null,
    claimContract: request.claimContract,
    taskPolicySnapshot: request.policySnapshot,
    retrievalPolicyCatalog: request.retrievalPolicyCatalog,
    sourceAcquisition: {
      decisionVersion: decision.decisionVersion,
      decisionStatus: decision.status,
      requestVersion: request.requestVersion,
      requestStatus: request.sourceAcquisitionStatus,
      upstreamBlockedReason: null,
      sourceEvidenceLifecycleStatus: "intake_ready",
    },
  };
}
