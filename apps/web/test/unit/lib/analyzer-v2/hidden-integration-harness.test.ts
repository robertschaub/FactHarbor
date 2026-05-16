import { describe, expect, it } from "vitest";
import {
  CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
  type ClaimUnderstandingStageHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  type ClaimContract,
} from "@/lib/analyzer-v2/claim-understanding/types";
import { toResultCompatibilityView } from "@/lib/analyzer-v2/compatibility-view";
import {
  runHiddenV2IntegrationHarness,
} from "@/lib/analyzer-v2/hidden-integration-harness";
import type { EvidenceQueryPlanningProviderCall } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter";
import type { EvidenceQueryPlanningResult } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { buildClaimBoundaryV2RunContext, type PipelineRunContext } from "@/lib/analyzer-v2/run-context";

const STATEMENT = "Entity A made assertion B.";
const CONFIG_SNAPSHOT_HASH = "c".repeat(64);

function buildContext(selectedAtomicClaimIds: readonly string[] = ["AC_001"]): PipelineRunContext {
  const ingress: ClaimBoundaryV2Ingress = {
    runIdHint: "job-v2-hidden-harness",
    submitted: {
      kind: "text",
      value: STATEMENT,
    },
    preparedSeed: {
      acsSnapshot: {
        resolvedInputText: STATEMENT,
        preparedUnderstanding: {
          detectedInputType: "text",
          detectedLanguage: "en",
          atomicClaims: selectedAtomicClaimIds.map((id) => ({
            id,
            statement: STATEMENT,
          })),
        },
      },
      acsSnapshotHash: "acs-hidden-harness",
      inputGroundingSeedHash: "grounding-hidden-harness",
    },
    selectedAtomicClaimIds: [...selectedAtomicClaimIds],
  };

  return buildClaimBoundaryV2RunContext(ingress, {
    now: () => new Date("2026-05-15T11:00:00.000Z"),
  });
}

function claimContract(selectedAtomicClaimIds: readonly string[] = ["AC_001"]): ClaimContract {
  return {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: STATEMENT,
      resolvedInputText: STATEMENT,
      detectedLanguage: "en",
      selectedAtomicClaimIds: [...selectedAtomicClaimIds],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: STATEMENT,
      resolvedInputText: STATEMENT,
      detectedLanguage: "en",
      currentDate: "2026-05-15",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "direct-input-grounding-en",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: STATEMENT,
        selected: selectedAtomicClaimIds.includes("AC_001"),
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "The direct input contains one selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
      {
        id: "AC_002",
        statement: "Entity C made assertion D.",
        selected: selectedAtomicClaimIds.includes("AC_002"),
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "The direct input contains another selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedHandoff(contract: ClaimContract): Extract<ClaimUnderstandingStageHandoff, { status: "accepted" }> {
  return {
    handoffVersion: CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
    visibility: "internal_only",
    runtimeStageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    runtimeStatus: "runtime_dispatch_completed",
    inputSource: "direct_input",
    selectedAtomicClaimIds: [...contract.input.selectedAtomicClaimIds],
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    cacheEligibility: "runtime_no_store",
    integrityEventSummaries: [],
    status: "accepted",
    claimContract: contract,
    blockedReason: null,
    damagedReason: null,
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "public_cutover_not_approved",
    },
  };
}

function blockedHandoff(): Extract<ClaimUnderstandingStageHandoff, { status: "blocked" }> {
  return {
    handoffVersion: CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
    visibility: "internal_only",
    runtimeStageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    runtimeStatus: "blocked_by_gateway",
    inputSource: "direct_input",
    selectedAtomicClaimIds: ["AC_001"],
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "blockedUntilPromptApproved",
    cacheEligibility: "not_evaluated",
    integrityEventSummaries: [],
    status: "blocked",
    claimContract: null,
    blockedReason: "gateway_policy_not_executable",
    damagedReason: null,
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "claim_understanding_blocked",
    },
  };
}

function acceptedQueryPlanningResult(
  targetAtomicClaimIds: readonly string[] = ["AC_001"],
): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_HARNESS_001",
      sourceLanguagePolicy: {
        primaryLanguage: "en",
        supplementaryLanguageDecision: "not_needed",
        rationale: "The source language is sufficient for hidden query-planning verification.",
      },
      queries: [
        {
          queryId: "EQ_HARNESS_001",
          retrievalPolicyKey: "baseline_research",
          queryText: "hidden-query-token",
          targetAtomicClaimIds: [...targetAtomicClaimIds],
          rationale: "Structural retrieval intent for the selected AtomicClaim.",
        },
      ],
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function blockedQueryPlanningResult(): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "blocked",
    queryPlan: null,
    integrityEvents: [
      {
        type: "task_policy_blocked",
        severity: "error",
        message: "Synthetic blocked query-planning result.",
        references: ["evidence_query_planning"],
      },
    ],
    blockedReason: "task_policy_not_executable",
    damagedReason: null,
  };
}

function providerCall(
  output: EvidenceQueryPlanningResult,
  onCall?: () => void,
): EvidenceQueryPlanningProviderCall {
  return async () => {
    onCall?.();
    return {
      output,
      telemetry: {
        providerId: "anthropic",
        modelId: "claude-haiku-4-5",
        inputTokens: 11,
        outputTokens: 12,
        totalTokens: 23,
        durationMs: 34,
      },
    };
  };
}

describe("analyzer-v2 hidden integration harness", () => {
  it("threads accepted Claim Understanding into hidden query planning and non-executable Source Acquisition only", async () => {
    let providerCalled = false;
    const context = buildContext();
    const result = await runHiddenV2IntegrationHarness({
      context,
      claimUnderstandingHandoff: acceptedHandoff(claimContract()),
      queryPlanning: {
        configSnapshotHash: CONFIG_SNAPSHOT_HASH,
        providerId: "anthropic",
        modelId: "claude-haiku-4-5",
        providerCall: providerCall(acceptedQueryPlanningResult(), () => {
          providerCalled = true;
        }),
      },
    });

    expect(providerCalled).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.visibility).toBe("internal_only");
    expect(result.evidenceLifecycleStart).toMatchObject({
      status: "intake_ready",
      intake: {
        claimContract: {
          input: {
            selectedAtomicClaimIds: ["AC_001"],
          },
        },
      },
    });
    expect(result.queryPlanningRuntime).toMatchObject({
      status: "completed",
      result: {
        status: "accepted",
      },
      sideEffects: {
        cacheRead: false,
        cacheWrite: false,
        searchFetchCalled: false,
        sourceReliabilityCalled: false,
        publicSurfaceWritten: false,
      },
    });
    expect(result.queryPlanInspection).toMatchObject({
      status: "inspected",
      summary: {
        selectedAtomicClaimIds: ["AC_001"],
        structuralCoverage: {
          coveredSelectedAtomicClaimIds: ["AC_001"],
          partialCoverage: false,
          coverageJudgment: "structural_only_not_quality_assessment",
        },
      },
    });
    expect(result.queryPlanSourceAcquisitionHandoff).toMatchObject({
      status: "ready_not_executable",
      handoff: {
        visibility: "internal_only",
        executionScope: "not_executable",
        sourceAcquisitionStatus: "ready_not_executable",
        selectedAtomicClaimIds: ["AC_001"],
      },
    });
    expect(result.sourceAcquisitionStart).toMatchObject({
      status: "source_acquisition_ready_not_executable",
      request: {
        visibility: "internal_only",
        executionScope: "contract_only_no_provider_execution",
        sourceAcquisitionStatus: "ready_not_executable",
      },
    });

    const publicResult = result.publicEnvelope.resultJson;
    expect(publicResult).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        pipeline: "claimboundary-v2",
        publicCutoverStatus: "blocked_precutover",
      },
      qualityGates: {
        damagedReport: true,
      },
      compatibility: {
        v1: {
          fallbackFields: {
            truthPercentage: null,
            verdict: null,
            confidence: null,
          },
        },
      },
    });
    expect(toResultCompatibilityView(publicResult)).toMatchObject({
      schemaKind: "v2",
      publicCutoverStatus: "blocked_precutover",
      verdictLabel: null,
      truthPercentage: null,
      confidence: null,
    });

    const publicJson = JSON.stringify(publicResult);
    expect(publicJson).not.toContain("hidden-query-token");
    expect(publicJson).not.toContain("EQ_HARNESS_001");
    expect(publicJson).not.toContain("queryPlan");
    expect(publicJson).not.toContain("promptProvenance");
    expect(publicJson).not.toContain("providerTelemetry");
    expect(publicJson).not.toContain("sourceAcquisitionStatus");
  });

  it("does not call query planning when Claim Understanding is blocked", async () => {
    let providerCalled = false;
    const result = await runHiddenV2IntegrationHarness({
      context: buildContext(),
      claimUnderstandingHandoff: blockedHandoff(),
      queryPlanning: {
        configSnapshotHash: CONFIG_SNAPSHOT_HASH,
        providerId: "anthropic",
        modelId: "claude-haiku-4-5",
        providerCall: providerCall(acceptedQueryPlanningResult(), () => {
          providerCalled = true;
        }),
      },
    });

    expect(providerCalled).toBe(false);
    expect(result).toMatchObject({
      status: "blocked",
      blockedReason: "claim_understanding_not_accepted",
      queryPlanningRuntime: null,
      queryPlanInspection: null,
      queryPlanSourceAcquisitionHandoff: null,
      sourceAcquisitionStart: null,
      evidenceLifecycleStart: {
        status: "blocked",
        blockedReason: "claim_understanding_blocked",
      },
    });
    expect(result.publicEnvelope.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        publicCutoverStatus: "blocked_precutover",
      },
    });
  });

  it("keeps selected AtomicClaim IDs from the accepted ClaimContract rather than query targets", async () => {
    const result = await runHiddenV2IntegrationHarness({
      context: buildContext(["AC_001", "AC_002"]),
      claimUnderstandingHandoff: acceptedHandoff(claimContract(["AC_001", "AC_002"])),
      queryPlanning: {
        configSnapshotHash: CONFIG_SNAPSHOT_HASH,
        providerId: "anthropic",
        modelId: "claude-haiku-4-5",
        providerCall: providerCall(acceptedQueryPlanningResult(["AC_001"])),
      },
    });

    expect(result.status).toBe("completed");
    expect(result.queryPlanInspection).toMatchObject({
      status: "inspected",
      summary: {
        selectedAtomicClaimIds: ["AC_001", "AC_002"],
        queryEntryTargetAtomicClaimIds: ["AC_001"],
        structuralCoverage: {
          coveredSelectedAtomicClaimIds: ["AC_001"],
          uncoveredSelectedAtomicClaimIds: ["AC_002"],
          partialCoverage: true,
        },
      },
    });
    expect(result.queryPlanSourceAcquisitionHandoff).toMatchObject({
      status: "ready_not_executable",
      handoff: {
        selectedAtomicClaimIds: ["AC_001", "AC_002"],
      },
    });
  });

  it("blocks before Source Acquisition when query planning returns no accepted query plan", async () => {
    const result = await runHiddenV2IntegrationHarness({
      context: buildContext(),
      claimUnderstandingHandoff: acceptedHandoff(claimContract()),
      queryPlanning: {
        configSnapshotHash: CONFIG_SNAPSHOT_HASH,
        providerId: "anthropic",
        modelId: "claude-haiku-4-5",
        providerCall: providerCall(blockedQueryPlanningResult()),
      },
    });

    expect(result).toMatchObject({
      status: "blocked",
      blockedReason: "query_planning_result_not_accepted",
      queryPlanningRuntime: {
        status: "completed",
        result: {
          status: "blocked",
        },
      },
      queryPlanInspection: {
        status: "inspected",
      },
      queryPlanSourceAcquisitionHandoff: {
        status: "blocked",
        blockedReason: "query_planning_not_accepted",
      },
      sourceAcquisitionStart: null,
    });
  });

  it("fails closed when provider output targets an unselected AtomicClaim", async () => {
    const result = await runHiddenV2IntegrationHarness({
      context: buildContext(),
      claimUnderstandingHandoff: acceptedHandoff(claimContract()),
      queryPlanning: {
        configSnapshotHash: CONFIG_SNAPSHOT_HASH,
        providerId: "anthropic",
        modelId: "claude-haiku-4-5",
        providerCall: providerCall(acceptedQueryPlanningResult(["AC_UNKNOWN"])),
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("query_planning_result_not_accepted");
    expect(result.queryPlanningRuntime).toMatchObject({
      status: "completed",
      result: {
        status: "damaged",
        damagedReason: "schema_validation_failed",
      },
    });
    expect(result.queryPlanSourceAcquisitionHandoff).toMatchObject({
      status: "blocked",
      blockedReason: "query_planning_not_accepted",
    });
    expect(result.sourceAcquisitionStart).toBeNull();
  });
});
