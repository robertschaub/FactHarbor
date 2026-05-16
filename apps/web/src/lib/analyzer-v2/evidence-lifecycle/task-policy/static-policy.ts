import {
  EVIDENCE_TASK_POLICY_SNAPSHOT_VERSION,
  type EvidenceRetrievalPolicyCatalogEntry,
  type EvidenceTaskPolicySnapshot,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/types";
import {
  EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

function buildStaticPlannedTasks(): EvidenceTaskPolicySnapshot["plannedTasks"] {
  return [{
    taskKey: "evidence_query_planning",
    status: "hidden_internal_executable",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_query_planning,
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS.evidence_query_planning,
    promptApprovalStatus: "approved",
    modelPolicyStatus: "approved",
    executionAuthority: "gateway_executable_hidden_internal",
  },
  {
    taskKey: "evidence_applicability",
    status: "symbolic_not_executable",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_applicability,
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS.evidence_applicability,
    promptApprovalStatus: "missing",
    modelPolicyStatus: "not_approved",
    executionAuthority: "not_executable",
  },
  {
    taskKey: "evidence_extraction",
    status: "symbolic_not_executable",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_extraction,
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS.evidence_extraction,
    promptApprovalStatus: "missing",
    modelPolicyStatus: "not_approved",
    executionAuthority: "not_executable",
  },
  {
    taskKey: "evidence_sufficiency",
    status: "symbolic_not_executable",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_sufficiency,
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS.evidence_sufficiency,
    promptApprovalStatus: "missing",
    modelPolicyStatus: "not_approved",
    executionAuthority: "not_executable",
  },
  ];
}

const STATIC_RETRIEVAL_POLICY_CATALOG: readonly EvidenceRetrievalPolicyCatalogEntry[] = [
  { policyKey: "baseline_research", status: "planned_not_executable", source: "static_contract_only" },
  { policyKey: "primary_source_refinement", status: "planned_not_executable", source: "static_contract_only" },
  { policyKey: "contradiction_search", status: "planned_not_executable", source: "static_contract_only" },
  { policyKey: "supplementary_language_lane", status: "planned_not_executable", source: "static_contract_only" },
  { policyKey: "evidence_scarcity_handling", status: "planned_not_executable", source: "static_contract_only" },
];

export function readStaticEvidenceRetrievalPolicyCatalog(): EvidenceRetrievalPolicyCatalogEntry[] {
  return STATIC_RETRIEVAL_POLICY_CATALOG.map((policy) => ({ ...policy }));
}

export function buildStaticEvidenceTaskPolicySnapshot(): EvidenceTaskPolicySnapshot {
  return {
    snapshotVersion: EVIDENCE_TASK_POLICY_SNAPSHOT_VERSION,
    source: "static_contract_only",
    policyStatus: "query_planning_hidden_internal_executable",
    plannedTasks: buildStaticPlannedTasks().map((task) => ({ ...task })),
    retrievalPolicyCatalog: readStaticEvidenceRetrievalPolicyCatalog(),
    cachePolicy: "no_store_no_read",
    providerExecution: "not_wired",
    promptModelExecution: "query_planning_approved_only",
    publicExposure: "forbidden",
    sourceReliabilityIntegration: "thin_port_pending",
    sourceLanguagePolicy: "source_language_first_query_planning_approved",
  };
}
