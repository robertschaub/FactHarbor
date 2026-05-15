import { describe, expect, it } from "vitest";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  runEvidenceQueryPlanningRuntime,
  type RunEvidenceQueryPlanningRuntimeRequest,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import type { EvidenceQueryPlanningResult } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

function claimContract(language = "de"): ClaimContract {
  return {
    schemaVersion: "v2.claim_contract.0",
    input: {
      inputType: "text",
      inputValue: "Entity A machte Aussage B.",
      resolvedInputText: "Entity A machte Aussage B.",
      detectedLanguage: language,
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: "Entity A machte Aussage B.",
      resolvedInputText: "Entity A machte Aussage B.",
      detectedLanguage: language,
      currentDate: "2026-05-15",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: "Entity A machte Aussage B.",
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
      {
        id: "AC_002",
        statement: "Entity C made assertion D.",
        selected: false,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Unselected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedResult(language = "de"): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_001",
      sourceLanguagePolicy: {
        primaryLanguage: language,
        supplementaryLanguageDecision: "needed",
        rationale: "The source language remains primary while supplementary language coverage can be useful.",
      },
      queries: [
        {
          queryId: "EQ_001",
          retrievalPolicyKey: "baseline_research",
          queryText: "Entity A Aussage B",
          targetAtomicClaimIds: ["AC_001"],
          rationale: "Initial retrieval should cover the selected AtomicClaim.",
        },
        {
          queryId: "EQ_002",
          retrievalPolicyKey: "evidence_scarcity_handling",
          queryText: "Entity A Aussage B source availability",
          targetAtomicClaimIds: ["AC_001"],
          rationale: "Retrieval may need to test whether relevant evidence exists.",
        },
      ],
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function runtimeRequest(
  overrides: Partial<RunEvidenceQueryPlanningRuntimeRequest> = {},
): RunEvidenceQueryPlanningRuntimeRequest {
  return {
    claimContract: claimContract(),
    selectedAtomicClaimIds: ["AC_001"],
    currentDate: "2026-05-15",
    configSnapshotHash: "c".repeat(64),
    providerId: "anthropic",
    modelId: "claude-haiku-4-5",
    providerCall: async (request) => ({
      output: acceptedResult(request.inputFrame.sourceLanguage),
      telemetry: {
        providerId: "anthropic",
        modelId: "claude-haiku-4-5",
        inputTokens: 120,
        outputTokens: 90,
        totalTokens: 210,
        durationMs: 75,
      },
    }),
    ...overrides,
  };
}

describe("analyzer-v2 evidence query-planning runtime", () => {
  it("executes hidden direct-text query planning with no cache IO, public output, search, or SR side effects", async () => {
    let providerCalled = false;
    const result = await runEvidenceQueryPlanningRuntime(runtimeRequest({
      providerCall: async (request) => {
        providerCalled = true;
        expect(request.renderedPrompt).toContain("Entity A machte Aussage B.");
        expect(request.renderedPrompt).toContain("\"detectedLanguage\":\"de\"");
        expect(request.renderedPrompt).not.toContain("Entity C made assertion D.");
        expect(request.inputFrame.sourceLanguage).toBe("de");
        return {
          output: acceptedResult("de"),
          telemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5",
            inputTokens: 120,
            outputTokens: 90,
            totalTokens: 210,
            durationMs: 75,
          },
        };
      },
    }));

    expect(providerCalled).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.visibility).toBe("internal_only");
    expect(result.result.status).toBe("accepted");
    expect(result.result.status === "accepted" ? result.result.queryPlan.sourceLanguagePolicy : null).toMatchObject({
      primaryLanguage: "de",
      supplementaryLanguageDecision: "needed",
    });
    expect(result.cacheDecision.canRead).toBe(false);
    expect(result.cacheDecision.canWrite).toBe(false);
    expect(result.cacheDecision.reason).toBe("no_store_runtime_dispatch_safety");
    expect(result.sideEffects).toMatchObject({
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
      providerSdkLoaded: false,
      searchFetchCalled: false,
      sourceReliabilityCalled: false,
      publicSurfaceWritten: false,
    });
  });

  it("blocks missing or und language before prompt rendering or provider callback", async () => {
    let providerCalled = false;
    const result = await runEvidenceQueryPlanningRuntime(runtimeRequest({
      claimContract: claimContract("und"),
      providerCall: async () => {
        providerCalled = true;
        throw new Error("provider must not be called");
      },
    }));

    expect(providerCalled).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.result.blockedReason).toBe("input_contract_invalid");
    expect(result.sideEffects.promptLoaded).toBe(false);
    expect(result.sideEffects.promptRendered).toBe(false);
    expect(result.sideEffects.modelCalled).toBe(false);
  });

  it("blocks invalid selected IDs before prompt rendering or provider callback", async () => {
    let providerCalled = false;
    const result = await runEvidenceQueryPlanningRuntime(runtimeRequest({
      selectedAtomicClaimIds: ["AC_001", "AC_001"],
      providerCall: async () => {
        providerCalled = true;
        throw new Error("provider must not be called");
      },
    }));

    expect(providerCalled).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.result.blockedReason).toBe("input_contract_invalid");
    expect(result.sideEffects.promptLoaded).toBe(false);
    expect(result.sideEffects.promptRendered).toBe(false);
  });

  it("keeps evidence_scarcity_handling as query intent only", async () => {
    const result = await runEvidenceQueryPlanningRuntime(runtimeRequest());

    expect(result.status).toBe("completed");
    if (result.result.status !== "accepted") {
      throw new Error("expected accepted query planning result");
    }

    expect(result.result.queryPlan.queries.map((query) => query.retrievalPolicyKey)).toContain(
      "evidence_scarcity_handling",
    );
    expect(result.result).not.toHaveProperty("sufficiencyAssessment");
    expect(result.result.integrityEvents).toEqual([]);
    expect(result.sideEffects.publicSurfaceWritten).toBe(false);
  });
});
