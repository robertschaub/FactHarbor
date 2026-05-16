import type {
  EvidenceLifecycleTaskKey,
  EvidenceLifecycleTaskOutputSchemaVersion,
  EvidenceLifecycleTaskPromptSectionId,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

export const EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION =
  "v2.evidence-lifecycle.execution-readiness.0";

export type EvidenceExecutionReadinessScope =
  | "inert_contract_only_no_prompt_model_provider_execution"
  | "query_planning_hidden_internal_prompt_model_only_no_search_fetch";

export type EvidenceExecutionReadinessBlockedReason =
  | "task_policy_not_executable"
  | "prompt_approval_missing"
  | "model_policy_missing"
  | "cache_approval_missing"
  | "claim_contract_missing"
  | "source_acquisition_not_executable"
  | "source_packets_missing"
  | "invalid_claim_ids"
  | "invalid_source_or_content_ids"
  | "incomplete_content_packets"
  | "token_budget_overflow"
  | "call_budget_exhausted";

export type EvidenceExecutionReadinessTaskContract = {
  taskKey: EvidenceLifecycleTaskKey;
  readinessStatus: "not_ready_not_executable" | "ready_hidden_internal";
  promptSectionId: EvidenceLifecycleTaskPromptSectionId;
  outputSchemaVersion: EvidenceLifecycleTaskOutputSchemaVersion;
  batchInputEnvelope: "contract_only" | "query_planning_input_envelope";
  preCallValidation: "contract_only" | "runtime_pre_call_validation";
  provenanceEnvelope: "contract_only" | "runtime_provenance";
  promptModelExecution: "not_approved" | "approved_hidden_internal";
  providerSearchFetchExecution: "not_wired";
  cachePolicy: "no_store_no_read";
  sourceReliabilityIntegration: "thin_port_pending";
  publicExposure: "forbidden";
};

export type EvidenceTaskBatchInputEnvelope = {
  envelopeVersion: typeof EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION;
  taskKey: EvidenceLifecycleTaskKey;
  executionScope: EvidenceExecutionReadinessScope;
  selectedAtomicClaimIds: readonly string[];
  claimContractHash: string | null;
  sourcePacketIds: readonly string[];
  previousTaskResultHashes: readonly string[];
};

export type EvidenceTaskPreCallReadinessResult =
  | {
    readinessVersion: typeof EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION;
    taskKey: EvidenceLifecycleTaskKey;
    status: "ready";
    blockedReasons: [];
  }
  | {
    readinessVersion: typeof EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION;
    taskKey: EvidenceLifecycleTaskKey;
    status: "blocked";
    blockedReasons: readonly EvidenceExecutionReadinessBlockedReason[];
  };

export type EvidenceTaskExecutionProvenanceEnvelope = {
  provenanceVersion: typeof EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION;
  taskKey: EvidenceLifecycleTaskKey;
  promptProfile: "claimboundary-v2";
  promptSectionId: EvidenceLifecycleTaskPromptSectionId;
  promptContentHash: string | null;
  outputSchemaVersion: EvidenceLifecycleTaskOutputSchemaVersion;
  taskPolicySnapshotHash: string | null;
  configSnapshotHash: string | null;
  approvalPointer: string | null;
  provider: {
    providerId: string | null;
    modelId: string | null;
  };
  tokenBudget: {
    maxInputTokens: number | null;
    maxOutputTokens: number | null;
  };
  callBudget: {
    maxCalls: number | null;
  };
  cacheDecision: "no_store_no_read";
  retryCount: number;
  timing: {
    queuedAtUtc: string | null;
    startedAtUtc: string | null;
    completedAtUtc: string | null;
  };
};

export type EvidenceExecutionReadinessStaticContract = {
  contractVersion: typeof EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION;
  source: "static_contract_only";
  contractStatus: "not_executable" | "query_planning_hidden_internal_executable";
  executionScope: EvidenceExecutionReadinessScope;
  tasks: readonly EvidenceExecutionReadinessTaskContract[];
  blockedReasons: readonly EvidenceExecutionReadinessBlockedReason[];
};
