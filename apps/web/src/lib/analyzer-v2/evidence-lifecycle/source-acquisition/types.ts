import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { EvidenceLifecycleIntake, EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";

export const SOURCE_ACQUISITION_REQUEST_VERSION = "v2.evidence-lifecycle.source-acquisition-request.0";
export const SOURCE_ACQUISITION_POLICY_SNAPSHOT_VERSION = "v2.evidence-lifecycle.source-acquisition-policy.0";

export type SourceAcquisitionPlannedTaskKey =
  | "evidence_query_planning"
  | "evidence_applicability"
  | "evidence_extraction"
  | "evidence_sufficiency";

export type SourceAcquisitionRetrievalPolicyKey =
  | "baseline_research"
  | "primary_source_refinement"
  | "contradiction_search"
  | "supplementary_language_lane"
  | "evidence_scarcity_handling";

export type SourceAcquisitionPlannedTask = {
  taskKey: SourceAcquisitionPlannedTaskKey;
  status: "symbolic_not_executable";
};

export type SourceAcquisitionRetrievalPolicy = {
  policyKey: SourceAcquisitionRetrievalPolicyKey;
  status: "planned_not_executable";
  source: "static_contract_only";
};

export type EvidenceAcquisitionPolicySnapshot = {
  snapshotVersion: typeof SOURCE_ACQUISITION_POLICY_SNAPSHOT_VERSION;
  source: "static_contract_only";
  policyStatus: "not_executable";
  plannedTasks: readonly SourceAcquisitionPlannedTask[];
  retrievalPolicyCatalog: readonly SourceAcquisitionRetrievalPolicy[];
  cachePolicy: "no_store_no_read";
  providerExecution: "not_wired";
  promptModelExecution: "not_approved";
  publicExposure: "forbidden";
  sourceReliabilityIntegration: "thin_port_pending";
  sourceLanguagePolicy: "source_language_first_planned_not_executable";
};

export type SourceAcquisitionRequest = {
  requestVersion: typeof SOURCE_ACQUISITION_REQUEST_VERSION;
  visibility: "internal_only";
  executionScope: "contract_only_no_provider_execution";
  sourceAcquisitionStatus: "ready_not_executable";
  intake: {
    intakeVersion: EvidenceLifecycleIntake["intakeVersion"];
    selectedAtomicClaimIds: readonly string[];
    runId: string;
    currentDate: string;
    detectedLanguage: string;
  };
  policySnapshot: EvidenceAcquisitionPolicySnapshot;
  retrievalPolicyCatalog: readonly SourceAcquisitionRetrievalPolicy[];
  claimContract: ClaimContract;
};

export type SourceAcquisitionBlockedReason =
  | "evidence_lifecycle_blocked"
  | "evidence_lifecycle_intake_missing"
  | "claim_contract_missing";

export type SourceAcquisitionStartDecision =
  | {
    decisionVersion: typeof SOURCE_ACQUISITION_REQUEST_VERSION;
    visibility: "internal_only";
    status: "source_acquisition_ready_not_executable";
    request: SourceAcquisitionRequest;
    blockedReason: null;
    sourceEvidenceLifecycleStatus: "intake_ready";
  }
  | {
    decisionVersion: typeof SOURCE_ACQUISITION_REQUEST_VERSION;
    visibility: "internal_only";
    status: "blocked";
    request: null;
    blockedReason: SourceAcquisitionBlockedReason;
    sourceEvidenceLifecycleStatus: EvidenceLifecycleStartDecision["status"];
  };
