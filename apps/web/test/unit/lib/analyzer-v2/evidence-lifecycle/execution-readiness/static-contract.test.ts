import { describe, expect, it } from "vitest";
import {
  EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION,
  type EvidenceTaskBatchInputEnvelope,
  type EvidenceTaskExecutionProvenanceEnvelope,
  type EvidenceTaskPreCallReadinessResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/types";
import { buildStaticEvidenceExecutionReadinessContract } from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/static-contract";

describe("analyzer-v2 Evidence Lifecycle execution-readiness contract", () => {
  it("declares the exact hidden query-planning readiness contract", () => {
    expect(buildStaticEvidenceExecutionReadinessContract()).toEqual({
      contractVersion: "v2.evidence-lifecycle.execution-readiness.0",
      source: "static_contract_only",
      contractStatus: "query_planning_hidden_internal_executable",
      executionScope: "query_planning_hidden_internal_prompt_model_only_no_search_fetch",
      tasks: [
        {
          taskKey: "evidence_query_planning",
          readinessStatus: "ready_hidden_internal",
          promptSectionId: "V2_EVIDENCE_QUERY_PLANNING",
          outputSchemaVersion: "v2.evidence_query_planning_result.0",
          batchInputEnvelope: "query_planning_input_envelope",
          preCallValidation: "runtime_pre_call_validation",
          provenanceEnvelope: "runtime_provenance",
          promptModelExecution: "approved_hidden_internal",
          providerSearchFetchExecution: "not_wired",
          cachePolicy: "no_store_no_read",
          sourceReliabilityIntegration: "thin_port_pending",
          publicExposure: "forbidden",
        },
        {
          taskKey: "evidence_applicability",
          readinessStatus: "not_ready_not_executable",
          promptSectionId: "V2_EVIDENCE_APPLICABILITY",
          outputSchemaVersion: "v2.evidence_applicability_result.0",
          batchInputEnvelope: "contract_only",
          preCallValidation: "contract_only",
          provenanceEnvelope: "contract_only",
          promptModelExecution: "not_approved",
          providerSearchFetchExecution: "not_wired",
          cachePolicy: "no_store_no_read",
          sourceReliabilityIntegration: "thin_port_pending",
          publicExposure: "forbidden",
        },
        {
          taskKey: "evidence_extraction",
          readinessStatus: "not_ready_not_executable",
          promptSectionId: "V2_EVIDENCE_EXTRACTION",
          outputSchemaVersion: "v2.evidence_extraction_result.0",
          batchInputEnvelope: "contract_only",
          preCallValidation: "contract_only",
          provenanceEnvelope: "contract_only",
          promptModelExecution: "not_approved",
          providerSearchFetchExecution: "not_wired",
          cachePolicy: "no_store_no_read",
          sourceReliabilityIntegration: "thin_port_pending",
          publicExposure: "forbidden",
        },
        {
          taskKey: "evidence_sufficiency",
          readinessStatus: "not_ready_not_executable",
          promptSectionId: "V2_EVIDENCE_SUFFICIENCY_GATE",
          outputSchemaVersion: "v2.evidence_sufficiency_assessment.0",
          batchInputEnvelope: "contract_only",
          preCallValidation: "contract_only",
          provenanceEnvelope: "contract_only",
          promptModelExecution: "not_approved",
          providerSearchFetchExecution: "not_wired",
          cachePolicy: "no_store_no_read",
          sourceReliabilityIntegration: "thin_port_pending",
          publicExposure: "forbidden",
        },
      ],
      blockedReasons: [
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
      ],
    });
  });

  it("returns defensive copies of contract arrays", () => {
    const first = buildStaticEvidenceExecutionReadinessContract();
    const second = buildStaticEvidenceExecutionReadinessContract();

    (first.tasks as Array<{ taskKey: string }>)[0].taskKey = "mutated";
    (first.blockedReasons as string[])[0] = "mutated";

    expect(second.tasks[0]?.taskKey).toBe("evidence_query_planning");
    expect(second.blockedReasons[0]).toBe("task_policy_not_executable");
  });

  it("keeps future batch, readiness, and provenance envelopes typed but inert", () => {
    const batchEnvelope: EvidenceTaskBatchInputEnvelope = {
      envelopeVersion: EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION,
      taskKey: "evidence_query_planning",
      executionScope: "query_planning_hidden_internal_prompt_model_only_no_search_fetch",
      selectedAtomicClaimIds: ["AC_001"],
      claimContractHash: null,
      sourcePacketIds: [],
      previousTaskResultHashes: [],
    };
    const blockedReadiness: EvidenceTaskPreCallReadinessResult = {
      readinessVersion: EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION,
      taskKey: "evidence_query_planning",
      status: "blocked",
      blockedReasons: ["task_policy_not_executable", "prompt_approval_missing"],
    };
    const provenance: EvidenceTaskExecutionProvenanceEnvelope = {
      provenanceVersion: EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION,
      taskKey: "evidence_query_planning",
      promptProfile: "claimboundary-v2",
      promptSectionId: "V2_EVIDENCE_QUERY_PLANNING",
      promptContentHash: null,
      outputSchemaVersion: "v2.evidence_query_planning_result.0",
      taskPolicySnapshotHash: null,
      configSnapshotHash: null,
      approvalPointer: null,
      provider: {
        providerId: null,
        modelId: null,
      },
      tokenBudget: {
        maxInputTokens: null,
        maxOutputTokens: null,
      },
      callBudget: {
        maxCalls: null,
      },
      cacheDecision: "no_store_no_read",
      retryCount: 0,
      timing: {
        queuedAtUtc: null,
        startedAtUtc: null,
        completedAtUtc: null,
      },
    };

    expect(batchEnvelope.executionScope).toBe("query_planning_hidden_internal_prompt_model_only_no_search_fetch");
    expect(blockedReadiness.status).toBe("blocked");
    expect(provenance.promptContentHash).toBeNull();
    expect(provenance.provider.providerId).toBeNull();
  });
});
