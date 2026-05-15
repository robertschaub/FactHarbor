import { describe, expect, it } from "vitest";
import { EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope";
import type { QueryPlanInspectionRequest } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import type { EvidenceQueryPlanningRuntimeResult } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import {
  buildQueryPlanSourceAcquisitionHandoff,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import type {
  EvidenceQueryPlanEntry,
  EvidenceQueryPlanningResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import type { AnalyzerV2CacheDecision } from "@/lib/analyzer-v2/gateway/types";

function queryEntry(overrides: Partial<EvidenceQueryPlanEntry> = {}): EvidenceQueryPlanEntry {
  return {
    queryId: "EQ_001",
    retrievalPolicyKey: "baseline_research",
    queryText: "Entity A Aussage B",
    targetAtomicClaimIds: ["AC_001"],
    rationale: "Initial retrieval intent for the selected AtomicClaim.",
    ...overrides,
  };
}

function acceptedResult(
  queries: readonly EvidenceQueryPlanEntry[] = [queryEntry()],
): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_001",
      sourceLanguagePolicy: {
        primaryLanguage: "de",
        supplementaryLanguageDecision: "needed",
        rationale: "The source language remains primary.",
      },
      queries: [...queries],
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function blockedResult(): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "blocked",
    queryPlan: null,
    integrityEvents: [],
    blockedReason: "task_policy_not_executable",
    damagedReason: null,
  };
}

function cacheDecision(overrides: Partial<AnalyzerV2CacheDecision> = {}): AnalyzerV2CacheDecision {
  return {
    namespace: "analyzer-v2:v2.semantic.evidence-query-planning:evidence_query_planning",
    canRead: false,
    canWrite: false,
    reason: "no_store_runtime_dispatch_safety",
    missingDimensions: [],
    keyParts: [],
    ...overrides,
  };
}

function completedRuntimeResult(
  result: EvidenceQueryPlanningResult = acceptedResult(),
  overrides: Partial<EvidenceQueryPlanningRuntimeResult> = {},
): EvidenceQueryPlanningRuntimeResult {
  const decision = cacheDecision();
  return {
    runtimeVersion: "v2.evidence-query-planning.runtime.0",
    visibility: "internal_only",
    status: "completed",
    result,
    blockedReason: null,
    promptProvenance: {
      promptContentHash: "p".repeat(64),
      renderedPromptHash: "r".repeat(64),
      configSnapshotHash: "c".repeat(64),
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
    },
    cacheDecision: decision,
    adapterOutcome: {
      executionStatus: "completed",
      blockedReason: null,
      result,
      attempts: [
        {
          attemptNumber: 1,
          promptContentHash: "p".repeat(64),
          status: "accepted",
          providerTelemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5",
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
            durationMs: 40,
          },
          failureMessage: null,
        },
      ],
      telemetry: {
        adapterVersion: "v2.evidence-query-planning.model-adapter.0",
        promptContentHash: "p".repeat(64),
        configSnapshotHash: "c".repeat(64),
        outputSchemaVersion: "v2.evidence_query_planning_result.0",
        gatewayTaskId: "evidence_query_planning",
        modelPolicyId: "v2.model.evidence_query_planning.0",
        providerId: "anthropic",
        modelId: "claude-haiku-4-5",
        retryCount: 0,
        tokenUsage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        durationMs: 40,
        cacheDecision: decision,
        cacheAccess: {
          readAttempted: false,
          writeAttempted: false,
        },
      },
    },
    sideEffects: {
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
      providerSdkLoaded: false,
      searchFetchCalled: false,
      sourceReliabilityCalled: false,
      publicSurfaceWritten: false,
    },
    ...overrides,
  } as EvidenceQueryPlanningRuntimeResult;
}

function blockedRuntimeResult(): EvidenceQueryPlanningRuntimeResult {
  return {
    runtimeVersion: "v2.evidence-query-planning.runtime.0",
    visibility: "internal_only",
    status: "blocked",
    result: blockedResult(),
    blockedReason: "gateway_policy_not_executable",
    promptProvenance: null,
    cacheDecision: null,
    adapterOutcome: null,
    sideEffects: {
      promptLoaded: false,
      promptRendered: false,
      adapterCalled: false,
      modelCalled: false,
      cacheDecisionConstructed: false,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
      providerSdkLoaded: false,
      searchFetchCalled: false,
      sourceReliabilityCalled: false,
      publicSurfaceWritten: false,
    },
  };
}

function request(
  overrides: Partial<QueryPlanInspectionRequest> = {},
): QueryPlanInspectionRequest {
  return {
    runtimeResult: completedRuntimeResult(),
    selectedAtomicClaimIds: ["AC_001", "AC_002"],
    selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    ...overrides,
  };
}

describe("analyzer-v2 query-plan to source-acquisition handoff", () => {
  it("creates a hidden non-executable handoff from an accepted query plan", () => {
    const decision = buildQueryPlanSourceAcquisitionHandoff(request());

    expect(decision).toMatchObject({
      status: "ready_not_executable",
      blockedReason: null,
      handoff: {
        visibility: "internal_only",
        executionScope: "not_executable",
        sourceAcquisitionStatus: "ready_not_executable",
        selectedAtomicClaimIds: ["AC_001", "AC_002"],
        queryPlanningStatus: "accepted",
        modelPolicyId: "v2.model.evidence_query_planning.0",
        cacheProvenance: {
          canRead: false,
          canWrite: false,
          reason: "no_store_runtime_dispatch_safety",
        },
        structuralCoverage: {
          partialCoverage: true,
          coverageJudgment: "structural_only_not_quality_assessment",
        },
        queryEntries: [
          {
            queryId: "EQ_001",
            retrievalPolicyKey: "baseline_research",
            queryText: "Entity A Aussage B",
            targetAtomicClaimIds: ["AC_001"],
          },
        ],
      },
    });

    const serialized = JSON.stringify(decision.handoff);
    expect(serialized).not.toContain("evidenceItems");
    expect(serialized).not.toContain("sources");
    expect(serialized).not.toContain("sourceReliability");
    expect(serialized).not.toContain("sufficiencyAssessment");
    expect(serialized).not.toContain("warning");
    expect(serialized).not.toContain("verdict");
    expect(serialized).not.toContain("confidence");
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("keyParts");
  });

  it("does not infer selected AtomicClaim IDs from query target IDs", () => {
    const decision = buildQueryPlanSourceAcquisitionHandoff(request({
      selectedAtomicClaimIds: ["AC_002"],
    }));

    expect(decision).toMatchObject({
      status: "blocked",
      handoff: null,
      blockedReason: "query_entry_target_ids_outside_selected",
    });
  });

  it("blocks runtime and result states that are not accepted query planning", () => {
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: blockedRuntimeResult(),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_planning_runtime_blocked",
      handoff: null,
    });
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: completedRuntimeResult(blockedResult()),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_planning_not_accepted",
      handoff: null,
    });
  });

  it("blocks invalid selected AtomicClaim snapshots", () => {
    expect(buildQueryPlanSourceAcquisitionHandoff(request({ selectedAtomicClaimIds: [] }))).toMatchObject({
      status: "blocked",
      blockedReason: "inspection_request_invalid",
    });
    expect(buildQueryPlanSourceAcquisitionHandoff(request({ selectedAtomicClaimIds: ["AC_001", "AC_001"] }))).toMatchObject({
      status: "blocked",
      blockedReason: "inspection_request_invalid",
    });
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      selectedAtomicClaimSnapshotSource: "wrong_source" as "7l1_input_envelope",
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "inspection_request_invalid",
    });
  });

  it("blocks empty, over-limit, empty-target, and out-of-selection query entries", () => {
    const overLimitQueries = Array.from({ length: EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES + 1 }, (_, index) =>
      queryEntry({ queryId: `EQ_${index + 1}` })
    );

    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: completedRuntimeResult(acceptedResult([])),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_entries_empty",
    });
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: completedRuntimeResult(acceptedResult(overLimitQueries)),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_entries_exceed_limit",
    });
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: completedRuntimeResult(acceptedResult([
        queryEntry({ targetAtomicClaimIds: [] }),
      ])),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_entry_target_ids_empty",
    });
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: completedRuntimeResult(acceptedResult([
        queryEntry({ targetAtomicClaimIds: ["AC_UNKNOWN"] }),
      ])),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_entry_target_ids_outside_selected",
    });
  });

  it("blocks missing prompt, model, or no-store cache provenance", () => {
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: completedRuntimeResult(undefined, {
        promptProvenance: null,
      } as Partial<EvidenceQueryPlanningRuntimeResult>),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_plan_provenance_missing",
    });
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: completedRuntimeResult(undefined, {
        adapterOutcome: null,
      } as Partial<EvidenceQueryPlanningRuntimeResult>),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_plan_provenance_missing",
    });
    expect(buildQueryPlanSourceAcquisitionHandoff(request({
      runtimeResult: completedRuntimeResult(undefined, {
        cacheDecision: cacheDecision({ canWrite: true }),
      } as Partial<EvidenceQueryPlanningRuntimeResult>),
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "query_plan_provenance_missing",
    });
  });
});
