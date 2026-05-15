import { describe, expect, it } from "vitest";
import type { RenderedEvidenceQueryPlanningPrompt } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader";
import {
  executeEvidenceQueryPlanningModelAdapter,
  type EvidenceQueryPlanningProviderCall,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter";
import type { EvidenceQueryPlanningResult } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import { getAnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/policy";
import type { AnalyzerV2CacheDecision } from "@/lib/analyzer-v2/gateway/types";

const renderedPrompt: RenderedEvidenceQueryPlanningPrompt = {
  profile: "claimboundary-v2",
  sectionId: "V2_EVIDENCE_QUERY_PLANNING",
  promptFilePath: "prompts/claimboundary-v2.prompt.md",
  promptContentHash: "a".repeat(64),
  requiredVariables: [
    "claimContractJson",
    "taskPolicySnapshotJson",
    "retrievalPolicyCatalogJson",
    "sourceAcquisitionTraceJson",
  ],
  renderedPrompt: "Render query planning prompt.",
};

const cacheDecision: AnalyzerV2CacheDecision = {
  namespace: "analyzer-v2:v2.semantic.evidence-query-planning:evidence_query_planning",
  canRead: false,
  canWrite: false,
  reason: "no_store_runtime_dispatch_safety",
  missingDimensions: [],
  keyParts: [],
};

function acceptedResult(overrides: Partial<EvidenceQueryPlanningResult> = {}): EvidenceQueryPlanningResult {
  const result: EvidenceQueryPlanningResult = {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_001",
      sourceLanguagePolicy: {
        primaryLanguage: "en",
        supplementaryLanguageDecision: "not_needed",
        rationale: "The source language is sufficient for initial retrieval.",
      },
      queries: [
        {
          queryId: "EQ_001",
          retrievalPolicyKey: "baseline_research",
          queryText: "Entity A assertion B",
          targetAtomicClaimIds: ["AC_001"],
          rationale: "Baseline retrieval covers the selected AtomicClaim.",
        },
      ],
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };

  return {
    ...result,
    ...overrides,
  };
}

function provider(output: unknown): EvidenceQueryPlanningProviderCall {
  return async () => ({
    output,
    telemetry: {
      providerId: "anthropic",
      modelId: "claude-haiku-4-5",
      inputTokens: 100,
      outputTokens: 80,
      totalTokens: 180,
      durationMs: 50,
    },
  });
}

function adapterRequest(providerCall: EvidenceQueryPlanningProviderCall) {
  const modelPolicy = getAnalyzerV2TaskModelPolicy("evidence_query_planning");
  if (!modelPolicy) {
    throw new Error("missing query-planning model policy");
  }

  return {
    gatewayTask: getAnalyzerV2GatewayTask("evidence_query_planning"),
    modelPolicy,
    renderedPrompt,
    inputFrame: {
      sourceLanguage: "en",
      selectedAtomicClaimIds: ["AC_001"],
      currentDate: "2026-05-15",
    },
    configSnapshotHash: "b".repeat(64),
    cacheDecision,
    providerCall,
  };
}

describe("analyzer-v2 evidence query-planning model adapter", () => {
  it("calls the injected provider once and accepts strict query-planning JSON", async () => {
    let callCount = 0;
    const outcome = await executeEvidenceQueryPlanningModelAdapter(adapterRequest(async (request) => {
      callCount += 1;
      expect(request.outputSchemaVersion).toBe("v2.evidence_query_planning_result.0");
      expect(request.maxAttempts).toBe(1);
      expect(request.inputFrame.selectedAtomicClaimIds).toEqual(["AC_001"]);
      return provider(acceptedResult())(request);
    }));

    expect(callCount).toBe(1);
    expect(outcome.executionStatus).toBe("completed");
    expect(outcome.result?.status).toBe("accepted");
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0]?.status).toBe("accepted");
    expect(outcome.telemetry.cacheAccess).toEqual({
      readAttempted: false,
      writeAttempted: false,
    });
  });

  it("distinguishes parse failures from schema failures without retries", async () => {
    const parseOutcome = await executeEvidenceQueryPlanningModelAdapter(adapterRequest(provider("{not-json")));
    const schemaOutcome = await executeEvidenceQueryPlanningModelAdapter(adapterRequest(provider({
      schemaVersion: "v2.evidence_query_planning_result.0",
      taskKey: "evidence_query_planning",
      status: "accepted",
    })));

    expect(parseOutcome.attempts).toHaveLength(1);
    expect(parseOutcome.attempts[0]?.status).toBe("parse_failure");
    expect(parseOutcome.result?.status).toBe("damaged");
    expect(parseOutcome.result?.damagedReason).toBe("schema_validation_failed");

    expect(schemaOutcome.attempts).toHaveLength(1);
    expect(schemaOutcome.attempts[0]?.status).toBe("invalid_schema");
    expect(schemaOutcome.result?.status).toBe("damaged");
  });

  it("rejects accepted plans that target unselected claims or exceed the query cap", async () => {
    const unselectedOutcome = await executeEvidenceQueryPlanningModelAdapter(adapterRequest(provider(
      acceptedResult({
        queryPlan: {
          ...acceptedResult().queryPlan!,
          queries: [
            {
              ...acceptedResult().queryPlan!.queries[0],
              targetAtomicClaimIds: ["AC_002"],
            },
          ],
        },
      }),
    )));
    const tooManyQueries = Array.from({ length: 7 }, (_value, index) => ({
      ...acceptedResult().queryPlan!.queries[0],
      queryId: `EQ_${index + 1}`,
    }));
    const cappedOutcome = await executeEvidenceQueryPlanningModelAdapter(adapterRequest(provider(
      acceptedResult({
        queryPlan: {
          ...acceptedResult().queryPlan!,
          queries: tooManyQueries,
        },
      }),
    )));

    expect(unselectedOutcome.attempts[0]?.status).toBe("invalid_schema");
    expect(unselectedOutcome.result?.status).toBe("damaged");
    expect(cappedOutcome.attempts[0]?.status).toBe("invalid_schema");
    expect(cappedOutcome.result?.status).toBe("damaged");
  });

  it("blocks before provider invocation when gateway policy is not executable", async () => {
    let called = false;
    const request = adapterRequest(async () => {
      called = true;
      return provider(acceptedResult())({} as Parameters<EvidenceQueryPlanningProviderCall>[0]);
    });
    const outcome = await executeEvidenceQueryPlanningModelAdapter({
      ...request,
      gatewayTask: {
        ...request.gatewayTask,
        status: "blockedUntilPromptApproved",
      },
    });

    expect(called).toBe(false);
    expect(outcome.executionStatus).toBe("blocked_by_gateway");
    expect(outcome.attempts).toEqual([]);
  });
});
