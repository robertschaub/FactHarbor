import type {
  EvidenceLifecycleTaskKey,
  EvidenceLifecycleTaskOutputSchemaVersion,
  EvidenceLifecycleTaskPromptSectionId,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

export const EVIDENCE_TASK_POLICY_SNAPSHOT_VERSION = "v2.evidence-lifecycle.task-policy.0";

export type EvidenceTaskPolicyPlannedTaskKey = EvidenceLifecycleTaskKey;

export type EvidenceRetrievalPolicyCatalogKey =
  | "baseline_research"
  | "primary_source_refinement"
  | "contradiction_search"
  | "supplementary_language_lane"
  | "evidence_scarcity_handling";

export type EvidenceTaskPolicyPlannedTask = {
  taskKey: EvidenceTaskPolicyPlannedTaskKey;
  status: "symbolic_not_executable" | "hidden_internal_executable";
  promptSectionId: EvidenceLifecycleTaskPromptSectionId;
  outputSchemaVersion: EvidenceLifecycleTaskOutputSchemaVersion;
  promptApprovalStatus: "missing" | "approved";
  modelPolicyStatus: "not_approved" | "approved";
  executionAuthority: "not_executable" | "gateway_executable_hidden_internal";
};

export type EvidenceRetrievalPolicyCatalogEntry = {
  policyKey: EvidenceRetrievalPolicyCatalogKey;
  status: "planned_not_executable";
  source: "static_contract_only";
};

export type EvidenceTaskPolicySnapshot = {
  snapshotVersion: typeof EVIDENCE_TASK_POLICY_SNAPSHOT_VERSION;
  source: "static_contract_only";
  policyStatus:
    | "not_executable"
    | "query_planning_hidden_internal_executable"
    | "query_planning_and_evidence_extraction_hidden_internal_executable"
    | "query_planning_applicability_and_evidence_extraction_hidden_internal_executable";
  plannedTasks: readonly EvidenceTaskPolicyPlannedTask[];
  retrievalPolicyCatalog: readonly EvidenceRetrievalPolicyCatalogEntry[];
  cachePolicy: "no_store_no_read";
  providerExecution:
    | "not_wired"
    | "query_planning_and_bounded_evidence_extraction_wired_hidden_internal"
    | "query_planning_applicability_and_bounded_evidence_extraction_wired_hidden_internal";
  promptModelExecution:
    | "not_approved"
    | "query_planning_approved_only"
    | "query_planning_and_bounded_evidence_extraction_approved_only"
    | "query_planning_applicability_and_bounded_evidence_extraction_approved_only";
  publicExposure: "forbidden";
  sourceReliabilityIntegration: "thin_port_pending";
  sourceLanguagePolicy:
    | "source_language_first_planned_not_executable"
    | "source_language_first_query_planning_approved";
};
