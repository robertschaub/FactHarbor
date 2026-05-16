import { readFileSync } from "node:fs";
import path from "node:path";
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
import {
  runHiddenV2IntegrationHarness,
  type HiddenV2IntegrationHarnessResult,
} from "@/lib/analyzer-v2/hidden-integration-harness";
import type { EvidenceQueryPlanningProviderCall } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter";
import type { EvidenceQueryPlanningResult } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import type { QueryPlanSourceAcquisitionHandoff } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import type { SourceAcquisitionStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { buildClaimBoundaryV2RunContext, type PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import {
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
  createSourceAcquisitionRuntimeAuthority,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
import {
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
  type SourceAcquisitionCandidateBudgetSnapshot,
  type SourceAcquisitionCandidateProviderAllowlistSnapshot,
  type SourceAcquisitionCandidateProviderAttemptRequest,
  type SourceAcquisitionCandidateProviderAttemptResult,
  type SourceAcquisitionHiddenCandidateRecord,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";
import {
  createSourceAcquisitionCandidateRuntimeAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";
import {
  runHiddenDirectTextCandidateAcquisitionHarness,
  type HiddenDirectTextCandidateAcquisitionHarnessRequest,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness";
import {
  isHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult,
  readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness-provenance";

const STATEMENT = "Entity A made assertion B.";
const CONFIG_SNAPSHOT_HASH = "c".repeat(64);
const X6_CONFIG_HASH = "config-hash-x6";
const X6_ALLOWLIST_HASH = "allowlist-hash-x6";
const X6_BUDGET_HASH = "budget-hash-x6";

function buildContext(): PipelineRunContext {
  const ingress: ClaimBoundaryV2Ingress = {
    runIdHint: "job-v2-x6-hidden-candidate-harness",
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
          atomicClaims: [
            {
              id: "AC_001",
              statement: STATEMENT,
            },
          ],
        },
      },
      acsSnapshotHash: "acs-x6-hidden-candidate-harness",
      inputGroundingSeedHash: "grounding-x6-hidden-candidate-harness",
    },
    selectedAtomicClaimIds: ["AC_001"],
  };

  return buildClaimBoundaryV2RunContext(ingress, {
    now: () => new Date("2026-05-16T12:00:00.000Z"),
  });
}

function claimContract(): ClaimContract {
  return {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: STATEMENT,
      resolvedInputText: STATEMENT,
      detectedLanguage: "en",
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: STATEMENT,
      resolvedInputText: STATEMENT,
      detectedLanguage: "en",
      currentDate: "2026-05-16",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "direct-input-grounding-x6",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: STATEMENT,
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "The direct input contains one selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedHandoff(): Extract<ClaimUnderstandingStageHandoff, { status: "accepted" }> {
  const contract = claimContract();
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
    ...acceptedHandoff(),
    runtimeStatus: "blocked_by_gateway",
    gatewayTaskStatus: "blockedUntilPromptApproved",
    cacheEligibility: "not_evaluated",
    status: "blocked",
    claimContract: null,
    blockedReason: "gateway_policy_not_executable",
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "claim_understanding_blocked",
    },
  };
}

function acceptedQueryPlanningResult(): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_X6_001",
      sourceLanguagePolicy: {
        primaryLanguage: "en",
        supplementaryLanguageDecision: "not_needed",
        rationale: "The source language is sufficient for hidden candidate-acquisition verification.",
      },
      queries: [
        {
          queryId: "EQ_X6_001",
          retrievalPolicyKey: "baseline_research",
          queryText: "hidden-x6-query-token",
          targetAtomicClaimIds: ["AC_001"],
          rationale: "Structural retrieval intent for the selected AtomicClaim.",
        },
      ],
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function providerCall(output: EvidenceQueryPlanningResult): EvidenceQueryPlanningProviderCall {
  return async () => ({
    output,
    telemetry: {
      providerId: "anthropic",
      modelId: "claude-haiku-4-5",
      inputTokens: 11,
      outputTokens: 12,
      totalTokens: 23,
      durationMs: 34,
    },
  });
}

async function buildX5(
  handoff: ClaimUnderstandingStageHandoff = acceptedHandoff(),
): Promise<HiddenV2IntegrationHarnessResult> {
  return runHiddenV2IntegrationHarness({
    context: buildContext(),
    claimUnderstandingHandoff: handoff,
    queryPlanning: {
      configSnapshotHash: CONFIG_SNAPSHOT_HASH,
      providerId: "anthropic",
      modelId: "claude-haiku-4-5",
      providerCall: providerCall(acceptedQueryPlanningResult()),
    },
  });
}

function parentAuthoritySnapshot(overrides: Partial<SourceAcquisitionRuntimeAuthoritySnapshot["configSnapshot"]> = {}): SourceAcquisitionRuntimeAuthoritySnapshot {
  return {
    kind: "source_acquisition_runtime_authority_7n3a",
    source: "v2_7n3a_source_io_authority_boundary_package",
    authorityVersion: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
    packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
    approval: {
      status: "approved_7n3a_authority_contract_only",
      approvedBy: "deputy_review_team",
      packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
      packageCommit: "8b4035cc",
      approvedScope: "authority_boundary_contracts_only",
    },
    visibility: "internal_only",
    configSnapshot: {
      source: "v2_task_policy_snapshot",
      freezeLocation: "runtime_owner_contract",
      configSnapshotHash: X6_CONFIG_HASH,
      providerAllowlistSnapshotHash: X6_ALLOWLIST_HASH,
      budgetSnapshotHash: X6_BUDGET_HASH,
      executionState: "not_executable_authority_contract_only",
      ...overrides,
    },
    capabilityScope: {
      concreteProviderIo: false,
      providerSdk: false,
      searchFetch: false,
      network: false,
      parser: false,
      urlDereference: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      productRuntime: false,
      publicExposure: false,
      liveJobs: false,
      acsPreparedSnapshot: false,
      directUrl: false,
      evidenceCorpusPopulation: false,
      semanticInterpretation: false,
    },
    futureGate: "requires_7n3b_concrete_io_gate",
  };
}

function candidateAuthority(configOverrides: Partial<SourceAcquisitionRuntimeAuthoritySnapshot["configSnapshot"]> = {}) {
  return createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority: createSourceAcquisitionRuntimeAuthority(parentAuthoritySnapshot(configOverrides)),
    configSnapshotHash: configOverrides.configSnapshotHash ?? X6_CONFIG_HASH,
    providerAllowlistSnapshotHash: configOverrides.providerAllowlistSnapshotHash ?? X6_ALLOWLIST_HASH,
    budgetSnapshotHash: configOverrides.budgetSnapshotHash ?? X6_BUDGET_HASH,
  });
}

function candidateApproval() {
  return {
    status: "approved_7n3b1_candidate_runtime" as const,
    approvedBy: "deputy_review_team" as const,
    packagePath: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
    approvedScope: "hidden_candidate_runtime_shell_only" as const,
  };
}

function allowlist(
  overrides: Partial<SourceAcquisitionCandidateProviderAllowlistSnapshot> = {},
): SourceAcquisitionCandidateProviderAllowlistSnapshot {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    approval: candidateApproval(),
    providerAllowlistSnapshotHash: X6_ALLOWLIST_HASH,
    configSnapshotHash: X6_CONFIG_HASH,
    allowedProviders: [
      {
        providerId: "test_provider",
        endpointKind: "test_injected_candidate_boundary",
        maxQueries: 1,
        timeoutMs: 5000,
        credentialsState: "not_required_for_test_boundary",
      },
    ],
    disabledProviders: [],
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
    ...overrides,
  };
}

function readyX5(result: HiddenV2IntegrationHarnessResult): Extract<HiddenV2IntegrationHarnessResult, { status: "completed" }> {
  if (result.status !== "completed") {
    throw new Error("Expected completed X5 result.");
  }
  return result;
}

function handoffIdentity(
  handoff: QueryPlanSourceAcquisitionHandoff,
): SourceAcquisitionCandidateBudgetSnapshot["handoffIdentity"] {
  return {
    handoffVersion: handoff.handoffVersion,
    selectedAtomicClaimIds: [...handoff.selectedAtomicClaimIds],
    queryIds: handoff.queryEntries.map((queryEntry) => queryEntry.queryId),
    queryEntryCount: handoff.queryEntries.length,
    promptContentHash: handoff.promptProvenance.promptContentHash,
    renderedPromptHash: handoff.promptProvenance.renderedPromptHash,
    modelPolicyId: handoff.modelPolicyId,
    cacheNamespace: handoff.cacheProvenance.namespace,
    cacheReason: handoff.cacheProvenance.reason,
    cacheCanRead: false,
    cacheCanWrite: false,
    sourceLanguagePolicy: handoff.sourceLanguagePolicy,
  };
}

function sourceRequestIdentity(
  decision: Extract<SourceAcquisitionStartDecision, { status: "source_acquisition_ready_not_executable" }>,
): SourceAcquisitionCandidateBudgetSnapshot["sourceRequestIdentity"] {
  return {
    requestVersion: decision.request.requestVersion,
    selectedAtomicClaimIds: [...decision.request.intake.selectedAtomicClaimIds],
    runId: decision.request.intake.runId,
    currentDate: decision.request.intake.currentDate,
    detectedLanguage: decision.request.intake.detectedLanguage,
  };
}

function budget(
  x5Result: Extract<HiddenV2IntegrationHarnessResult, { status: "completed" }>,
  overrides: Partial<SourceAcquisitionCandidateBudgetSnapshot> = {},
): SourceAcquisitionCandidateBudgetSnapshot {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    source: "v2_7n3b1_candidate_runtime",
    approval: candidateApproval(),
    budgetSnapshotHash: X6_BUDGET_HASH,
    handoffIdentity: handoffIdentity(x5Result.queryPlanSourceAcquisitionHandoff.handoff),
    sourceRequestIdentity: sourceRequestIdentity(x5Result.sourceAcquisitionStart),
    queryEntryCount: x5Result.queryPlanSourceAcquisitionHandoff.handoff.queryEntries.length,
    maxAttemptsPerQuery: 1,
    maxCandidateRecordsPerQuery: 1,
    providerTimeoutMs: 5000,
    totalCandidateAcquisitionTimeoutMs: 5000,
    cancellationState: "not_requested",
    retryPolicy: "none",
    partialExecutionSemantics: "structural_query_outcome_per_query",
    ...overrides,
  };
}

function candidate(
  request: SourceAcquisitionCandidateProviderAttemptRequest,
  overrides: Partial<SourceAcquisitionHiddenCandidateRecord> = {},
): SourceAcquisitionHiddenCandidateRecord {
  return {
    candidateId: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
    queryId: request.queryId,
    retrievalPolicyKey: request.retrievalPolicyKey,
    providerId: "test_provider",
    providerAttemptId: "ATT_1",
    providerRank: 1,
    hiddenLocatorId: "HIDDEN_SOURCE_LOCATOR_ATT_1_1",
    hiddenMetadata: {
      semanticUse: "not_semantic_evidence",
      titleState: "not_collected",
      snippetState: "not_collected",
      domainState: "not_collected",
      languageState: "not_collected",
    },
    candidateStructuralStatus: "candidate_acquired",
    ...overrides,
  };
}

function providerResult(
  request: SourceAcquisitionCandidateProviderAttemptRequest,
  overrides: Partial<SourceAcquisitionCandidateProviderAttemptResult> = {},
): SourceAcquisitionCandidateProviderAttemptResult {
  return {
    queryId: request.queryId,
    providerId: "test_provider",
    providerAttemptId: "ATT_1",
    structuralStatus: "success",
    durationMs: 25,
    candidates: [candidate(request)],
    sanitizedProviderTelemetry: {
      rawPayloadIncluded: false,
      secretIncluded: false,
      publicPayloadIncluded: false,
    },
    ...overrides,
  };
}

function harnessRequest(
  x5Result: HiddenV2IntegrationHarnessResult,
  overrides: Partial<HiddenDirectTextCandidateAcquisitionHarnessRequest["candidateAcquisition"]> = {},
): {
  request: HiddenDirectTextCandidateAcquisitionHarnessRequest;
  calls: SourceAcquisitionCandidateProviderAttemptRequest[];
} {
  const calls: SourceAcquisitionCandidateProviderAttemptRequest[] = [];
  const completedX5 = readyX5(x5Result);
  return {
    request: {
      x5Integration: x5Result,
      candidateAcquisition: {
        candidateRunId: "CANDIDATE_RUN_X6",
        authority: candidateAuthority(),
        providerAllowlist: allowlist(),
        budget: budget(completedX5),
        providerBoundary: {
          acquireCandidates: (attemptRequest) => {
            calls.push(attemptRequest);
            return providerResult(attemptRequest);
          },
        },
        ...overrides,
      },
    },
    calls,
  };
}

function publicJson(result: Awaited<ReturnType<typeof runHiddenDirectTextCandidateAcquisitionHarness>>): string {
  return JSON.stringify(result.publicEnvelope.resultJson);
}

describe("Analyzer V2 hidden direct-text candidate-acquisition harness", () => {
  it("runs candidate acquisition from completed X5 through an injected test boundary only", async () => {
    const x5Result = await buildX5();
    const { request, calls } = harnessRequest(x5Result);

    const result = await runHiddenDirectTextCandidateAcquisitionHarness(request);

    expect(result).toMatchObject({
      visibility: "internal_only",
      status: "completed",
      blockedReason: null,
      candidateAcquisitionRuntime: {
        status: "completed_structural",
        stopReason: "not_stopped",
        queryOutcomes: [
          {
            queryId: "EQ_X6_001",
            status: "attempted",
            structuralReason: "not_stopped",
            providerAttemptId: "ATT_1",
            candidateCount: 1,
          },
        ],
      },
      publicEnvelope: {
        resultJson: {
          _schemaVersion: "4.0.0-cb-precutover",
          meta: {
            publicCutoverStatus: "blocked_precutover",
          },
          compatibility: {
            v1: {
              fallbackFields: {
                verdict: null,
                truthPercentage: null,
                confidence: null,
              },
            },
          },
        },
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      candidateRunId: "CANDIDATE_RUN_X6",
      queryId: "EQ_X6_001",
      retrievalPolicyKey: "baseline_research",
      queryText: "hidden-x6-query-token",
      allowedProviderIds: ["test_provider"],
    });
    expect(isHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(result)).toBe(true);
    expect(readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(result)).toBe(result);
    expect(Object.keys(result).sort()).toEqual([
      "blockedReason",
      "candidateAcquisitionRuntime",
      "harnessVersion",
      "publicEnvelope",
      "status",
      "visibility",
      "x5Integration",
    ]);

    const serializedPublic = publicJson(result);
    const serializedResult = JSON.stringify(result);
    for (const forbidden of [
      "CANDIDATE_RUN_X6",
      "test_provider",
      "EQ_X6_001",
      "baseline_research",
      "hidden-x6-query-token",
      "ATT_1",
      "OPAQUE_SOURCE_CANDIDATE",
      "HIDDEN_SOURCE_LOCATOR",
      "completed_structural",
      "not_stopped",
      "source_acquisition_ready_not_executable",
      "ready_not_executable",
      "candidateRunId",
      "providerAttemptId",
      "candidateAcquisitionRuntime",
      "queryPlanSourceAcquisitionHandoff",
      "sourceAcquisitionStart",
      "sourceReliability",
      "cacheKey",
      "https://",
      "rawPayload",
    ]) {
      expect(serializedPublic).not.toContain(forbidden);
    }
    for (const forbidden of [
      "runtimeOwned",
      "WeakSet",
      "brand",
      "provenance",
    ]) {
      expect(serializedResult).not.toContain(forbidden);
    }
  });

  it("keeps runtime ownership in-process and invisible to object copies", async () => {
    const x5Result = await buildX5();
    const { request } = harnessRequest(x5Result);
    const result = await runHiddenDirectTextCandidateAcquisitionHarness(request);

    expect(readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(result)).toBe(result);
    expect(readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult({ ...result })).toBeNull();
    expect(readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(
      JSON.parse(JSON.stringify(result)),
    )).toBeNull();
    expect(readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(
      structuredClone(result),
    )).toBeNull();

    const mutableResult = result as unknown as { harnessVersion: string };
    const originalVersion = mutableResult.harnessVersion;
    mutableResult.harnessVersion = "v2.hidden-direct-text-candidate-acquisition-harness.forged";
    expect(readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(result)).toBeNull();
    mutableResult.harnessVersion = originalVersion;
    expect(readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(result)).toBe(result);
  });

  it("does not call candidate provider when X5 is not completed", async () => {
    const completedX5 = await buildX5();
    const blockedX5 = await buildX5(blockedHandoff());
    const { request, calls } = harnessRequest(completedX5);

    const result = await runHiddenDirectTextCandidateAcquisitionHarness({
      ...request,
      x5Integration: blockedX5,
    });

    expect(result).toMatchObject({
      status: "blocked",
      blockedReason: "x5_not_completed",
      candidateAcquisitionRuntime: null,
    });
    expect(isHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(result)).toBe(true);
    expect(readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult({ ...result })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("blocks future or mixed network-capable allowlists before provider invocation", async () => {
    const x5Result = await buildX5();
    const futureProvider = {
      providerId: "future_provider",
      endpointKind: "candidate_search_api_future" as const,
      maxQueries: 1,
      timeoutMs: 5000,
      credentialsState: "present_without_secret" as const,
    };

    for (const providerAllowlist of [
      allowlist({ allowedProviders: [futureProvider] }),
      allowlist({ allowedProviders: [...allowlist().allowedProviders, futureProvider] }),
    ]) {
      const { request, calls } = harnessRequest(x5Result, { providerAllowlist });

      const result = await runHiddenDirectTextCandidateAcquisitionHarness(request);

      expect(result).toMatchObject({
        status: "blocked",
        blockedReason: "candidate_allowlist_not_test_injected",
        candidateAcquisitionRuntime: null,
      });
      expect(calls).toHaveLength(0);
    }
  });

  it("lets candidate runtime fail closed for invalid authority and stale snapshots before provider invocation", async () => {
    const x5Result = readyX5(await buildX5());
    const validAuthority = candidateAuthority();
    const invalidCases: Array<Partial<HiddenDirectTextCandidateAcquisitionHarnessRequest["candidateAcquisition"]>> = [
      { authority: { ...validAuthority } },
      { authority: JSON.parse(JSON.stringify(validAuthority)) },
      { authority: { kind: "source_acquisition_candidate_runtime_authority_7n3b1" } },
      { providerAllowlist: allowlist({ providerAllowlistSnapshotHash: "stale-allowlist-hash" }) },
      { budget: budget(x5Result, { budgetSnapshotHash: "stale-budget-hash" }) },
      {
        budget: budget(x5Result, {
          handoffIdentity: {
            ...budget(x5Result).handoffIdentity,
            queryIds: ["STALE_QUERY"],
          },
        }),
      },
    ];

    for (const candidateOverride of invalidCases) {
      const { request, calls } = harnessRequest(x5Result, candidateOverride);

      const result = await runHiddenDirectTextCandidateAcquisitionHarness(request);

      expect(result.status).toBe("blocked");
      expect(result.blockedReason).toBe("candidate_runtime_blocked");
      expect(calls).toHaveLength(0);
      expect(publicJson(result)).not.toContain("candidate_runtime_blocked");
    }
  });

  it("has no X5 execution, query-planning callback, network, parser, or product import path", () => {
    const sourcePath = path.resolve(
      process.cwd(),
      "src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.ts",
    );
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("runHiddenV2IntegrationHarness");
    expect(source).not.toContain("providerCall");
    expect(source).not.toContain("EvidenceQueryPlanningProviderCall");
    expect(source).not.toContain("source-acquisition-network");
    expect(source).not.toContain("source-acquisition-content");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("@/app");
    expect(source).not.toContain("@/components");
    expect(source).not.toContain("@/lib/analyzer/");
  });
});
