import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimUnderstandingRuntimeState } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import type { EvidenceQueryPlanningResult } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  clearEvidenceQueryPlanningRuntimeArtifacts,
  readEvidenceQueryPlanningRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink";

function claimContract(): ClaimContract {
  return {
    schemaVersion: "v2.claim_contract.0",
    input: {
      inputType: "text",
      inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      resolvedInputText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      detectedLanguage: "de",
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      resolvedInputText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      detectedLanguage: "de",
      currentDate: "2026-05-17",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz.",
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "One selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedClaimUnderstandingState(): ClaimUnderstandingRuntimeState {
  return {
    stageVersion: "v2.claim-understanding.runtime-stage.0",
    visibility: "internal_only",
    inputSource: "direct_input",
    status: "runtime_dispatch_completed",
    result: {
      schemaVersion: "v2.claim_understanding_result.0",
      status: "accepted",
      claimContract: claimContract(),
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    },
    blockedReason: null,
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    runtimeDispatchStatus: "completed",
    runtimeDispatchBlockedReason: null,
    cacheEligibility: "runtime_no_store",
    sideEffects: {
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
    },
  };
}

function acceptedQueryPlanningResult(): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_001",
      sourceLanguagePolicy: {
        primaryLanguage: "de",
        supplementaryLanguageDecision: "needed",
        rationale: "Use German first; supplementary language may improve coverage.",
      },
      queries: [
        {
          queryId: "EQ_001",
          retrievalPolicyKey: "baseline_research",
          queryText: "Asylbereich Schweiz 235000 Personen Statistik",
          targetAtomicClaimIds: ["AC_001"],
          rationale: "Baseline query for the selected AtomicClaim.",
        },
      ],
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

describe("Analyzer V2 orchestrator X7-S Query Planning product-internal execution", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/analyzer-v2/claim-understanding/runtime-stage");
    vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory");
    vi.resetModules();
  });

  it("executes hidden Query Planning only when CU is accepted, X7-O is observed, and X7-S activation is open", async () => {
    let providerCalls = 0;
    const ledgerId = "job-v2-x7s-orchestrator:precutover-observability";
    clearEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    vi.resetModules();
    vi.doMock("@/lib/analyzer-v2/claim-understanding/runtime-stage", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/analyzer-v2/claim-understanding/runtime-stage")>()),
      runClaimUnderstandingRuntimeStage: vi.fn(async () => acceptedClaimUnderstandingState()),
    }));
    vi.doMock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory", () => ({
      buildEvidenceQueryPlanningProviderFactory: vi.fn((snapshot) => ({
        factoryVersion: "v2.evidence-query-planning.provider-factory.x7s",
        factorySourcePath: "apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.ts",
        configSnapshotHash: snapshot.configSnapshotHash,
        providerId: "anthropic",
        modelId: snapshot.modelId,
        providerCall: vi.fn(async () => {
          providerCalls += 1;
          return {
            output: acceptedQueryPlanningResult(),
            telemetry: {
              providerId: "anthropic",
              modelId: snapshot.modelId,
              inputTokens: 100,
              outputTokens: 50,
              totalTokens: 150,
              durationMs: 80,
            },
          };
        }),
      })),
    }));

    const { runClaimBoundaryPipelineV2 } = await import("@/lib/analyzer-v2/orchestrator");
    const result = await runClaimBoundaryPipelineV2(
      {
        runIdHint: "job-v2-x7s-orchestrator",
        submitted: {
          kind: "text",
          value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: ["AC_001"],
      },
      {
        now: () => new Date("2026-05-17T12:45:00.000Z"),
        runtimeActivationStatus: "enabled_hidden_direct_text",
        queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
      },
    );
    const artifacts = readEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    const serializedPublic = JSON.stringify(result.resultJson);

    expect(providerCalls).toBe(1);
    expect(artifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        activation: expect.objectContaining({
          status: "enabled_hidden_direct_text",
        }),
        runtime: expect.objectContaining({
          status: "completed",
          resultStatus: "accepted",
        }),
        sourceLanguagePolicy: expect.objectContaining({
          primaryLanguage: "de",
        }),
        sourceAcquisitionHandoff: expect.objectContaining({
          status: "ready_not_executable",
          executionScope: "not_executable",
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: true,
          modelCalled: true,
          providerSearchFetchCalled: false,
          sourceAcquisitionExecuted: false,
          parserExecuted: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        publicCutoverStatus: "blocked_precutover",
      },
      qualityGates: {
        damagedReport: true,
      },
    });
    expect(serializedPublic).not.toContain("evidence_query_planning");
    expect(serializedPublic).not.toContain("Asylbereich Schweiz 235000");
    expect(serializedPublic).not.toContain("job-v2-x7s-orchestrator:precutover-observability");
  });

  it("does not invoke Query Planning when X7-S activation is closed", async () => {
    let factoryCalls = 0;
    const ledgerId = "job-v2-x7s-closed:precutover-observability";
    clearEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    vi.resetModules();
    vi.doMock("@/lib/analyzer-v2/claim-understanding/runtime-stage", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/analyzer-v2/claim-understanding/runtime-stage")>()),
      runClaimUnderstandingRuntimeStage: vi.fn(async () => acceptedClaimUnderstandingState()),
    }));
    vi.doMock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory", () => ({
      buildEvidenceQueryPlanningProviderFactory: vi.fn(() => {
        factoryCalls += 1;
        throw new Error("closed activation must not create provider factory");
      }),
    }));

    const { runClaimBoundaryPipelineV2 } = await import("@/lib/analyzer-v2/orchestrator");
    await runClaimBoundaryPipelineV2(
      {
        runIdHint: "job-v2-x7s-closed",
        submitted: {
          kind: "text",
          value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: ["AC_001"],
      },
      {
        now: () => new Date("2026-05-17T12:50:00.000Z"),
        runtimeActivationStatus: "enabled_hidden_direct_text",
      },
    );

    expect(factoryCalls).toBe(0);
    expect(readEvidenceQueryPlanningRuntimeArtifacts(ledgerId)).toEqual([]);
  });
});
