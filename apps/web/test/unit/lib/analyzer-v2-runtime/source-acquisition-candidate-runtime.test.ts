import { describe, expect, it } from "vitest";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { QueryPlanInspectionSummary } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import {
  QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
  type QueryPlanSourceAcquisitionHandoff,
  type QueryPlanSourceAcquisitionHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import {
  SOURCE_ACQUISITION_REQUEST_VERSION,
  type SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import { SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract";
import {
  createSourceAcquisitionRuntimeAuthority,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
import { buildStaticEvidenceTaskPolicySnapshot, readStaticEvidenceRetrievalPolicyCatalog } from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy";
import type { EvidenceQueryPlan } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
  type SourceAcquisitionCandidateBudgetSnapshot,
  type SourceAcquisitionCandidateProviderAllowlistSnapshot,
  type SourceAcquisitionCandidateProviderAttemptRequest,
  type SourceAcquisitionCandidateProviderAttemptResult,
  type SourceAcquisitionCandidateRunRequest,
  type SourceAcquisitionHiddenCandidateRecord,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";
import {
  createSourceAcquisitionCandidateRuntimeAuthority,
  executeSourceAcquisitionCandidateRuntime,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";

function sourceLanguagePolicy(
  overrides: Partial<EvidenceQueryPlan["sourceLanguagePolicy"]> = {},
): EvidenceQueryPlan["sourceLanguagePolicy"] {
  return {
    primaryLanguage: "de",
    supplementaryLanguageDecision: "needed",
    rationale: "Opaque upstream language policy rationale.",
    ...overrides,
  };
}

function parentAuthoritySnapshot(): SourceAcquisitionRuntimeAuthoritySnapshot {
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
      configSnapshotHash: "config-hash-7n3b1",
      providerAllowlistSnapshotHash: "allowlist-hash-7n3b1",
      budgetSnapshotHash: "budget-hash-7n3b1",
      executionState: "not_executable_authority_contract_only",
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

function parentAuthority() {
  return createSourceAcquisitionRuntimeAuthority(parentAuthoritySnapshot());
}

function candidateAuthority() {
  return createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority: parentAuthority(),
    configSnapshotHash: "config-hash-7n3b1",
    providerAllowlistSnapshotHash: "allowlist-hash-7n3b1",
    budgetSnapshotHash: "budget-hash-7n3b1",
  });
}

function handoff(
  overrides: Partial<QueryPlanSourceAcquisitionHandoff> = {},
): Extract<QueryPlanSourceAcquisitionHandoffDecision, { status: "ready_not_executable" }> {
  const base: QueryPlanSourceAcquisitionHandoff = {
    handoffVersion: QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
    visibility: "internal_only",
    executionScope: "not_executable",
    sourceAcquisitionStatus: "ready_not_executable",
    selectedAtomicClaimIds: ["AC_001", "AC_002"],
    queryPlanResultSchemaVersion: "v2.evidence_query_planning_result.0",
    queryPlanningStatus: "accepted",
    inspection: {} as QueryPlanInspectionSummary,
    promptProvenance: {
      promptContentHash: "p".repeat(64),
      renderedPromptHash: "r".repeat(64),
      configSnapshotHash: "c".repeat(64),
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
    },
    modelPolicyId: "v2.model.evidence_query_planning.0",
    cacheProvenance: {
      namespace: "analyzer-v2:v2.semantic.evidence-query-planning:evidence_query_planning",
      reason: "no_store_runtime_dispatch_safety",
      canRead: false,
      canWrite: false,
    },
    sourceLanguagePolicy: sourceLanguagePolicy(),
    structuralCoverage: {
      selectedAtomicClaimCount: 2,
      coveredSelectedAtomicClaimIds: ["AC_001", "AC_002"],
      uncoveredSelectedAtomicClaimIds: [],
      partialCoverage: false,
      coverageJudgment: "structural_only_not_quality_assessment",
    },
    queryEntries: [
      {
        queryId: "EQ_001",
        retrievalPolicyKey: "baseline_research",
        queryText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
        targetAtomicClaimIds: ["AC_001"],
      },
      {
        queryId: "EQ_002",
        retrievalPolicyKey: "supplementary_language_lane",
        queryText: "Did the legal proceedings against Jair Bolsonaro comply with Brazilian law?",
        targetAtomicClaimIds: ["AC_002"],
      },
    ],
    ...overrides,
  };

  return {
    decisionVersion: QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
    visibility: "internal_only",
    status: "ready_not_executable",
    handoff: base,
    blockedReason: null,
  };
}

function blockedHandoff(): QueryPlanSourceAcquisitionHandoffDecision {
  return {
    decisionVersion: QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
    visibility: "internal_only",
    status: "blocked",
    handoff: null,
    blockedReason: "query_planning_runtime_blocked",
  };
}

function sourceDecision(
  selectedAtomicClaimIds: readonly string[] = ["AC_001", "AC_002"],
): SourceAcquisitionStartDecision {
  return {
    decisionVersion: SOURCE_ACQUISITION_REQUEST_VERSION,
    visibility: "internal_only",
    status: "source_acquisition_ready_not_executable",
    blockedReason: null,
    sourceEvidenceLifecycleStatus: "intake_ready",
    request: {
      requestVersion: SOURCE_ACQUISITION_REQUEST_VERSION,
      visibility: "internal_only",
      executionScope: "contract_only_no_provider_execution",
      sourceAcquisitionStatus: "ready_not_executable",
      intake: {
        intakeVersion: "v2.evidence-lifecycle.intake.0",
        selectedAtomicClaimIds,
        runId: "run-7n3b1",
        currentDate: "2026-05-16",
        detectedLanguage: "de",
      },
      policySnapshot: buildStaticEvidenceTaskPolicySnapshot(),
      retrievalPolicyCatalog: readStaticEvidenceRetrievalPolicyCatalog(),
      claimContract: {} as ClaimContract,
    },
  };
}

function allowlist(
  overrides: Partial<SourceAcquisitionCandidateProviderAllowlistSnapshot> = {},
): SourceAcquisitionCandidateProviderAllowlistSnapshot {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    approval: {
      status: "approved_7n3b1_candidate_runtime",
      approvedBy: "deputy_review_team",
      packagePath: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
      packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
      approvedScope: "hidden_candidate_runtime_shell_only",
    },
    providerAllowlistSnapshotHash: "allowlist-hash-7n3b1",
    configSnapshotHash: "config-hash-7n3b1",
    allowedProviders: [
      {
        providerId: "test_provider",
        endpointKind: "test_injected_candidate_boundary",
        maxQueries: 2,
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

function handoffIdentity(
  sourceHandoff: QueryPlanSourceAcquisitionHandoff,
): SourceAcquisitionCandidateBudgetSnapshot["handoffIdentity"] {
  return {
    handoffVersion: sourceHandoff.handoffVersion,
    selectedAtomicClaimIds: [...sourceHandoff.selectedAtomicClaimIds],
    queryIds: sourceHandoff.queryEntries.map((queryEntry) => queryEntry.queryId),
    queryEntryCount: sourceHandoff.queryEntries.length,
    promptContentHash: sourceHandoff.promptProvenance.promptContentHash,
    renderedPromptHash: sourceHandoff.promptProvenance.renderedPromptHash,
    modelPolicyId: sourceHandoff.modelPolicyId,
    cacheNamespace: sourceHandoff.cacheProvenance.namespace,
    cacheReason: sourceHandoff.cacheProvenance.reason,
    cacheCanRead: false,
    cacheCanWrite: false,
    sourceLanguagePolicy: sourceHandoff.sourceLanguagePolicy,
  };
}

function sourceRequestIdentity(
  decision: SourceAcquisitionStartDecision,
): SourceAcquisitionCandidateBudgetSnapshot["sourceRequestIdentity"] {
  if (decision.status !== "source_acquisition_ready_not_executable") {
    throw new Error("Expected ready source decision.");
  }

  return {
    requestVersion: decision.request.requestVersion,
    selectedAtomicClaimIds: [...decision.request.intake.selectedAtomicClaimIds],
    runId: decision.request.intake.runId,
    currentDate: decision.request.intake.currentDate,
    detectedLanguage: decision.request.intake.detectedLanguage,
  };
}

function budget(
  readyHandoff = handoff(),
  readySourceDecision = sourceDecision(),
  overrides: Partial<SourceAcquisitionCandidateBudgetSnapshot> = {},
): SourceAcquisitionCandidateBudgetSnapshot {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    source: "v2_7n3b1_candidate_runtime",
    approval: {
      status: "approved_7n3b1_candidate_runtime",
      approvedBy: "deputy_review_team",
      packagePath: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
      packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
      approvedScope: "hidden_candidate_runtime_shell_only",
    },
    budgetSnapshotHash: "budget-hash-7n3b1",
    handoffIdentity: handoffIdentity(readyHandoff.handoff),
    sourceRequestIdentity: sourceRequestIdentity(readySourceDecision),
    queryEntryCount: readyHandoff.handoff.queryEntries.length,
    maxAttemptsPerQuery: 1,
    maxCandidateRecordsPerQuery: 2,
    providerTimeoutMs: 5000,
    totalCandidateAcquisitionTimeoutMs: 10000,
    cancellationState: "not_requested",
    retryPolicy: "none",
    partialExecutionSemantics: "structural_query_outcome_per_query",
    ...overrides,
  };
}

function candidate(
  query: {
    queryId: string;
    retrievalPolicyKey: string;
    providerAttemptId: string;
    providerRank?: number;
  },
  overrides: Partial<SourceAcquisitionHiddenCandidateRecord> = {},
): SourceAcquisitionHiddenCandidateRecord {
  const rank = query.providerRank ?? 1;
  return {
    candidateId: `OPAQUE_SOURCE_CANDIDATE_${rank}`,
    queryId: query.queryId,
    retrievalPolicyKey: query.retrievalPolicyKey,
    providerId: "test_provider",
    providerAttemptId: query.providerAttemptId,
    providerRank: rank,
    hiddenLocatorId: `HIDDEN_SOURCE_LOCATOR_${rank}`,
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
  index: number,
  overrides: Partial<SourceAcquisitionCandidateProviderAttemptResult> = {},
): SourceAcquisitionCandidateProviderAttemptResult {
  const providerAttemptId = `ATT_${index + 1}`;
  return {
    queryId: request.queryId,
    providerId: "test_provider",
    providerAttemptId,
    structuralStatus: "success",
    durationMs: 25,
    candidates: [
      candidate({
        queryId: request.queryId,
        retrievalPolicyKey: request.retrievalPolicyKey,
        providerAttemptId,
        providerRank: index + 1,
      }),
    ],
    sanitizedProviderTelemetry: {
      rawPayloadIncluded: false,
      secretIncluded: false,
      publicPayloadIncluded: false,
    },
    ...overrides,
  };
}

function request(
  overrides: Partial<SourceAcquisitionCandidateRunRequest> = {},
): SourceAcquisitionCandidateRunRequest & { calls: SourceAcquisitionCandidateProviderAttemptRequest[] } {
  const calls: SourceAcquisitionCandidateProviderAttemptRequest[] = [];
  const readyHandoff = handoff();
  const readySourceDecision = sourceDecision();
  return {
    candidateRunId: "CANDIDATE_RUN_7N3B1",
    visibility: "internal_only",
    authority: candidateAuthority(),
    handoffDecision: readyHandoff,
    sourceAcquisitionStartDecision: readySourceDecision,
    providerAllowlist: allowlist(),
    budget: budget(readyHandoff, readySourceDecision),
    providerBoundary: {
      acquireCandidates: (attemptRequest) => {
        calls.push(attemptRequest);
        return providerResult(attemptRequest, calls.length - 1);
      },
    },
    calls,
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition candidate runtime", () => {
  it("executes hidden internal candidate acquisition through injected provider boundary only", async () => {
    const runRequest = request();
    const decision = await executeSourceAcquisitionCandidateRuntime(runRequest);

    expect(decision).toMatchObject({
      visibility: "internal_only",
      status: "completed_structural",
      stopReason: "not_stopped",
      queryOutcomes: [
        {
          queryId: "EQ_001",
          status: "attempted",
          structuralReason: "not_stopped",
          providerAttemptId: "ATT_1",
          candidateCount: 1,
        },
        {
          queryId: "EQ_002",
          status: "attempted",
          structuralReason: "not_stopped",
          providerAttemptId: "ATT_2",
          candidateCount: 1,
        },
      ],
    });
    expect(runRequest.calls).toHaveLength(2);
    expect(runRequest.calls[0]).toMatchObject({
      queryId: "EQ_001",
      queryText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      allowedProviderIds: ["test_provider"],
      sourceLanguagePolicy: handoff().handoff.sourceLanguagePolicy,
    });
    expect(JSON.stringify(decision)).not.toContain("Mehr als 235");
    expect(JSON.stringify(decision)).not.toContain("Bolsonaro");
  });

  it("rejects blocked handoffs and source requests before provider calls", async () => {
    for (const overrides of [
      { handoffDecision: blockedHandoff() },
      {
        sourceAcquisitionStartDecision: {
          decisionVersion: SOURCE_ACQUISITION_REQUEST_VERSION,
          visibility: "internal_only",
          status: "blocked",
          request: null,
          blockedReason: "evidence_lifecycle_blocked",
          sourceEvidenceLifecycleStatus: "blocked",
        } satisfies SourceAcquisitionStartDecision,
      },
      { sourceAcquisitionStartDecision: sourceDecision(["AC_001"]) },
    ]) {
      const runRequest = request(overrides);
      const decision = await executeSourceAcquisitionCandidateRuntime(runRequest);

      expect(decision.status).toBe("blocked");
      expect(runRequest.calls).toHaveLength(0);
    }
  });

  it("requires package-scoped 7N-3B1 authority and rejects raw 7N-3A, copied, JSON, and controlled harness authority", async () => {
    const validAuthority = candidateAuthority();
    for (const authority of [
      parentAuthority(),
      { ...validAuthority },
      JSON.parse(JSON.stringify(validAuthority)),
      SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY,
      createSourceAcquisitionCandidateRuntimeAuthority({
        parentAuthority: parentAuthority(),
        configSnapshotHash: "config-hash-7n3b1",
        providerAllowlistSnapshotHash: "stale-allowlist-hash",
        budgetSnapshotHash: "budget-hash-7n3b1",
      }),
    ]) {
      const runRequest = request({ authority });
      const decision = await executeSourceAcquisitionCandidateRuntime(runRequest);

      expect(decision).toMatchObject({
        status: "blocked",
        stopReason: "authority_invalid",
      });
      expect(runRequest.calls).toHaveLength(0);
    }
  });

  it("blocks unsafe allowlists and off-allowlist provider results before public or cache leakage", async () => {
    for (const providerAllowlist of [
      allowlist({ allowedProviders: [] }),
      allowlist({
        allowedProviders: [
          {
            providerId: "https://example.test",
            endpointKind: "test_injected_candidate_boundary",
            maxQueries: 2,
            timeoutMs: 5000,
            credentialsState: "not_required_for_test_boundary",
          },
        ],
      }),
      allowlist({
        allowedProviders: [
          {
            providerId: "test_provider",
            endpointKind: "test_injected_candidate_boundary",
            maxQueries: 1,
            timeoutMs: 5000,
            credentialsState: "not_required_for_test_boundary",
          },
        ],
      }),
    ]) {
      const runRequest = request({ providerAllowlist });
      const decision = await executeSourceAcquisitionCandidateRuntime(runRequest);

      expect(decision.status).toBe("blocked");
      expect(runRequest.calls).toHaveLength(0);
    }

    const offAllowlistCalls: SourceAcquisitionCandidateProviderAttemptRequest[] = [];
    const offAllowlist = request({
      providerBoundary: {
        acquireCandidates: (attemptRequest) => {
          offAllowlistCalls.push(attemptRequest);
          return providerResult(attemptRequest, 0, { providerId: "other_provider" });
        },
      },
    });
    const decision = await executeSourceAcquisitionCandidateRuntime(offAllowlist);

    expect(decision.status).toBe("damaged_structural");
    expect(decision.stopReason).toBe("provider_result_invalid");
    expect(JSON.stringify(decision)).not.toContain("other_provider");
  });

  it("blocks stale, cancelled, retrying, and over-wide timeout budgets before provider calls", async () => {
    const readyHandoff = handoff();
    const readySourceDecision = sourceDecision();
    for (const runtimeBudget of [
      budget(readyHandoff, readySourceDecision, { budgetSnapshotHash: "stale-budget-hash" }),
      budget(readyHandoff, readySourceDecision, { cancellationState: "requested" }),
      budget(readyHandoff, readySourceDecision, {
        retryPolicy: "retry" as SourceAcquisitionCandidateBudgetSnapshot["retryPolicy"],
      }),
      budget(readyHandoff, readySourceDecision, { totalCandidateAcquisitionTimeoutMs: 1 }),
      budget(readyHandoff, readySourceDecision, {
        handoffIdentity: {
          ...handoffIdentity(readyHandoff.handoff),
          queryIds: ["STALE"],
        },
      }),
    ]) {
      const runRequest = request({
        handoffDecision: readyHandoff,
        sourceAcquisitionStartDecision: readySourceDecision,
        budget: runtimeBudget,
      });
      const decision = await executeSourceAcquisitionCandidateRuntime(runRequest);

      expect(decision.status).toBe("blocked");
      expect(runRequest.calls).toHaveLength(0);
    }
  });

  it("records provider failure, timeout, cancellation, and thrown errors per query without silent query loss", async () => {
    const providerFailureCalls: SourceAcquisitionCandidateProviderAttemptRequest[] = [];
    const runRequest = request({
      providerBoundary: {
        acquireCandidates: (attemptRequest) => {
          providerFailureCalls.push(attemptRequest);
          if (attemptRequest.queryId === "EQ_001") {
            throw new Error("raw https://example.test sk_test_secret stack should not leak");
          }
          return providerResult(attemptRequest, 1, {
            structuralStatus: "timed_out",
            durationMs: 1,
            candidates: [],
          });
        },
      },
    });
    const decision = await executeSourceAcquisitionCandidateRuntime(runRequest);

    expect(providerFailureCalls).toHaveLength(2);
    expect(decision).toMatchObject({
      status: "completed_structural",
      queryOutcomes: [
        {
          queryId: "EQ_001",
          status: "failed",
          structuralReason: "provider_failure",
        },
        {
          queryId: "EQ_002",
          status: "timed_out",
          structuralReason: "provider_timeout",
        },
      ],
    });
    expect(JSON.stringify(decision)).not.toContain("example.test");
    expect(JSON.stringify(decision)).not.toContain("sk_test_secret");
  });

  it("rejects raw payload, public URL, source identity, cache key, SR field, and secret leakage in provider results", async () => {
    const leakingResults: Array<Partial<SourceAcquisitionCandidateProviderAttemptResult>> = [
      { sanitizedProviderTelemetry: { rawPayloadIncluded: true, secretIncluded: false, publicPayloadIncluded: false } as never },
      { sanitizedProviderTelemetry: { rawPayloadIncluded: false, secretIncluded: true, publicPayloadIncluded: false } as never },
      { candidates: [{ ...candidate({ queryId: "EQ_001", retrievalPolicyKey: "baseline_research", providerAttemptId: "ATT_1" }), url: "https://example.test" } as never] },
      { candidates: [{ ...candidate({ queryId: "EQ_001", retrievalPolicyKey: "baseline_research", providerAttemptId: "ATT_1" }), sourceReliabilityScore: 0.9 } as never] },
      { candidates: [{ ...candidate({ queryId: "EQ_001", retrievalPolicyKey: "baseline_research", providerAttemptId: "ATT_1" }), cacheKey: "cache-key" } as never] },
      { candidates: [{ ...candidate({ queryId: "EQ_001", retrievalPolicyKey: "baseline_research", providerAttemptId: "ATT_1" }), title: "raw title" } as never] },
      { rawProviderPayload: "not allowed" } as never,
    ];

    for (const resultOverride of leakingResults) {
      const leakingCalls: SourceAcquisitionCandidateProviderAttemptRequest[] = [];
      const runRequest = request({
        providerBoundary: {
          acquireCandidates: (attemptRequest) => {
            leakingCalls.push(attemptRequest);
            return providerResult(attemptRequest, 0, resultOverride);
          },
        },
      });
      const decision = await executeSourceAcquisitionCandidateRuntime(runRequest);
      const serialized = JSON.stringify(decision);

      expect(decision.status).toBe("damaged_structural");
      expect(decision.stopReason).toBe("provider_result_invalid");
      expect(serialized).not.toContain("https://");
      expect(serialized).not.toContain("raw title");
      expect(serialized).not.toContain("cache-key");
      expect(serialized).not.toContain("sourceReliabilityScore");
      expect(serialized).not.toContain("not allowed");
    }
  });

  it("does not cache candidate results between identical valid runs", async () => {
    const left = request();
    const right = request();

    await executeSourceAcquisitionCandidateRuntime(left);
    await executeSourceAcquisitionCandidateRuntime(right);

    expect(left.calls).toHaveLength(2);
    expect(right.calls).toHaveLength(2);
  });
});
