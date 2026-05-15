import { describe, expect, it } from "vitest";
import {
  buildEvidenceQueryPlanningInspection,
  type QueryPlanInspectionRequest,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import type { EvidenceQueryPlanningRuntimeResult } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import type { EvidenceQueryPlanningResult } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import type { AnalyzerV2CacheDecision } from "@/lib/analyzer-v2/gateway/types";

function acceptedQueryPlanningResult(overrides: Partial<EvidenceQueryPlanningResult> = {}): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_001",
      sourceLanguagePolicy: {
        primaryLanguage: "de",
        supplementaryLanguageDecision: "needed",
        rationale: "The primary source language remains the first retrieval lane.",
      },
      queries: [
        {
          queryId: "EQ_001",
          retrievalPolicyKey: "baseline_research",
          queryText: "Entity A Aussage B",
          targetAtomicClaimIds: ["AC_001"],
          rationale: "Initial retrieval intent for the selected AtomicClaim.",
        },
      ],
    },
    integrityEvents: [
      {
        type: "schema_validation_failed",
        severity: "error",
        message: "raw event message must not be copied",
        references: ["evidence_query_planning"],
      },
    ],
    blockedReason: null,
    damagedReason: null,
    ...overrides,
  } as EvidenceQueryPlanningResult;
}

function cacheDecision(): AnalyzerV2CacheDecision {
  return {
    namespace: "analyzer-v2:v2.semantic.evidence-query-planning:evidence_query_planning",
    canRead: false,
    canWrite: false,
    reason: "no_store_runtime_dispatch_safety",
    missingDimensions: [],
    keyParts: [
      { dimension: "promptProfile", value: "claimboundary-v2" },
    ],
  };
}

function completedRuntimeResult(
  result: EvidenceQueryPlanningResult = acceptedQueryPlanningResult(),
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
          status: "parse_failure",
          providerTelemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5",
            inputTokens: 120,
            outputTokens: 40,
            totalTokens: 160,
            durationMs: 80,
          },
          failureMessage: "raw provider failure detail must stay redacted",
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
          inputTokens: 120,
          outputTokens: 40,
          totalTokens: 160,
        },
        durationMs: 80,
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

describe("analyzer-v2 evidence query-plan inspection", () => {
  it("builds a hidden redacted inspection summary from an explicit selected-claim snapshot", () => {
    const inspection = buildEvidenceQueryPlanningInspection(request());

    expect(inspection.status).toBe("inspected");
    if (inspection.status !== "inspected") {
      throw new Error("expected inspected query plan");
    }

    expect(inspection.summary).toMatchObject({
      visibility: "internal_only",
      runtimeStatus: "completed",
      resultStatus: "accepted",
      selectedAtomicClaimIds: ["AC_001", "AC_002"],
      queryEntryCount: 1,
      queryEntryTargetAtomicClaimIds: ["AC_001"],
      modelPolicyId: "v2.model.evidence_query_planning.0",
      cacheDecision: {
        canRead: false,
        canWrite: false,
        reason: "no_store_runtime_dispatch_safety",
      },
      structuralCoverage: {
        coveredSelectedAtomicClaimIds: ["AC_001"],
        uncoveredSelectedAtomicClaimIds: ["AC_002"],
        partialCoverage: true,
        coverageJudgment: "structural_only_not_quality_assessment",
      },
      adapterAttemptSummary: {
        attemptCount: 1,
        statuses: ["parse_failure"],
        providerTelemetryAttemptCount: 1,
        failureMessageAttemptCount: 1,
      },
    });

    const serialized = JSON.stringify(inspection);
    expect(serialized).not.toContain("raw provider failure detail");
    expect(serialized).not.toContain("raw event message");
    expect(serialized).not.toContain("claude-haiku-4-5");
    expect(serialized).not.toContain("keyParts");
  });

  it("does not infer selected AtomicClaim IDs from query targets", () => {
    const inspection = buildEvidenceQueryPlanningInspection(request({
      selectedAtomicClaimIds: ["AC_002"],
    }));

    expect(inspection.status).toBe("inspected");
    if (inspection.status !== "inspected") {
      throw new Error("expected inspected query plan");
    }

    expect(inspection.summary.selectedAtomicClaimIds).toEqual(["AC_002"]);
    expect(inspection.summary.queryEntryTargetAtomicClaimIds).toEqual(["AC_001"]);
    expect(inspection.summary.structuralCoverage).toMatchObject({
      coveredSelectedAtomicClaimIds: [],
      uncoveredSelectedAtomicClaimIds: ["AC_002"],
      partialCoverage: true,
    });
  });

  it("blocks missing, duplicate, or wrong-source selected AtomicClaim snapshots", () => {
    expect(buildEvidenceQueryPlanningInspection(request({ selectedAtomicClaimIds: [] }))).toMatchObject({
      status: "blocked",
      blockedReason: "selected_atomic_claim_snapshot_missing",
    });
    expect(buildEvidenceQueryPlanningInspection(request({ selectedAtomicClaimIds: ["AC_001", "AC_001"] }))).toMatchObject({
      status: "blocked",
      blockedReason: "selected_atomic_claim_snapshot_invalid",
    });
    expect(buildEvidenceQueryPlanningInspection(request({
      selectedAtomicClaimSnapshotSource: "wrong_source" as "7l1_input_envelope",
    }))).toMatchObject({
      status: "blocked",
      blockedReason: "selected_atomic_claim_snapshot_wrong_source",
    });
  });
});
