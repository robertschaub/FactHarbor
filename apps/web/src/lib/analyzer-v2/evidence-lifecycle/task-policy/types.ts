export const EVIDENCE_TASK_POLICY_SNAPSHOT_VERSION = "v2.evidence-lifecycle.task-policy.0";

export type EvidenceTaskPolicyPlannedTaskKey =
  | "evidence_query_planning"
  | "evidence_applicability"
  | "evidence_extraction"
  | "evidence_sufficiency";

export type EvidenceRetrievalPolicyCatalogKey =
  | "baseline_research"
  | "primary_source_refinement"
  | "contradiction_search"
  | "supplementary_language_lane"
  | "evidence_scarcity_handling";

export type EvidenceTaskPolicyPlannedTask = {
  taskKey: EvidenceTaskPolicyPlannedTaskKey;
  status: "symbolic_not_executable";
};

export type EvidenceRetrievalPolicyCatalogEntry = {
  policyKey: EvidenceRetrievalPolicyCatalogKey;
  status: "planned_not_executable";
  source: "static_contract_only";
};

export type EvidenceTaskPolicySnapshot = {
  snapshotVersion: typeof EVIDENCE_TASK_POLICY_SNAPSHOT_VERSION;
  source: "static_contract_only";
  policyStatus: "not_executable";
  plannedTasks: readonly EvidenceTaskPolicyPlannedTask[];
  retrievalPolicyCatalog: readonly EvidenceRetrievalPolicyCatalogEntry[];
  cachePolicy: "no_store_no_read";
  providerExecution: "not_wired";
  promptModelExecution: "not_approved";
  publicExposure: "forbidden";
  sourceReliabilityIntegration: "thin_port_pending";
  sourceLanguagePolicy: "source_language_first_planned_not_executable";
};
