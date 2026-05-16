import {
  EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
  type EvidenceLifecycleTaskKey,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION,
  type EvidenceExecutionReadinessBlockedReason,
  type EvidenceExecutionReadinessStaticContract,
  type EvidenceExecutionReadinessTaskContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/types";

const EVIDENCE_TASK_KEYS = [
  "evidence_query_planning",
  "evidence_applicability",
  "evidence_extraction",
  "evidence_sufficiency",
] as const satisfies readonly EvidenceLifecycleTaskKey[];

const BLOCKED_REASONS = [
  "task_policy_not_executable",
  "prompt_approval_missing",
  "model_policy_missing",
  "cache_approval_missing",
  "claim_contract_missing",
  "source_acquisition_not_executable",
  "source_packets_missing",
  "invalid_claim_ids",
  "invalid_source_or_content_ids",
  "incomplete_content_packets",
  "token_budget_overflow",
  "call_budget_exhausted",
] as const satisfies readonly EvidenceExecutionReadinessBlockedReason[];

function taskContract(taskKey: EvidenceLifecycleTaskKey): EvidenceExecutionReadinessTaskContract {
  if (taskKey === "evidence_query_planning") {
    return {
      taskKey,
      readinessStatus: "ready_hidden_internal",
      promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS[taskKey],
      outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS[taskKey],
      batchInputEnvelope: "query_planning_input_envelope",
      preCallValidation: "runtime_pre_call_validation",
      provenanceEnvelope: "runtime_provenance",
      promptModelExecution: "approved_hidden_internal",
      providerSearchFetchExecution: "not_wired",
      cachePolicy: "no_store_no_read",
      sourceReliabilityIntegration: "thin_port_pending",
      publicExposure: "forbidden",
    };
  }

  return {
    taskKey,
    readinessStatus: "not_ready_not_executable",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS[taskKey],
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS[taskKey],
    batchInputEnvelope: "contract_only",
    preCallValidation: "contract_only",
    provenanceEnvelope: "contract_only",
    promptModelExecution: "not_approved",
    providerSearchFetchExecution: "not_wired",
    cachePolicy: "no_store_no_read",
    sourceReliabilityIntegration: "thin_port_pending",
    publicExposure: "forbidden",
  };
}

export function buildStaticEvidenceExecutionReadinessContract(): EvidenceExecutionReadinessStaticContract {
  return {
    contractVersion: EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION,
    source: "static_contract_only",
    contractStatus: "query_planning_hidden_internal_executable",
    executionScope: "query_planning_hidden_internal_prompt_model_only_no_search_fetch",
    tasks: EVIDENCE_TASK_KEYS.map(taskContract),
    blockedReasons: [...BLOCKED_REASONS],
  };
}
