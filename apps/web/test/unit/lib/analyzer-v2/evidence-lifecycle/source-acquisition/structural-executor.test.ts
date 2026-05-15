import { describe, expect, it } from "vitest";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { QueryPlanInspectionSummary } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import {
  QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
  type QueryPlanSourceAcquisitionHandoff,
  type QueryPlanSourceAcquisitionHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import {
  buildSourceAcquisitionHandoffIdentitySnapshot,
  buildSourceAcquisitionStructuralExecutionBudget,
  executeSourceAcquisitionStructuralExecutor,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor";
import {
  SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY,
  type OpaqueSourceContentPacketPointer,
  type SourceAcquisitionExecutionBudgetSnapshot,
  type SourceAcquisitionExecutionRequest,
  type SourceAcquisitionPort,
  type SourceAcquisitionPortAttemptRequest,
  type SourceAcquisitionPortAttemptResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract";
import {
  SOURCE_ACQUISITION_REQUEST_VERSION,
  type SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import { readStaticSourceAcquisitionStructuralOutcomeKinds } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract";
import { buildStaticEvidenceTaskPolicySnapshot, readStaticEvidenceRetrievalPolicyCatalog } from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy";
import type { EvidenceQueryPlan } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

function sourceLanguagePolicy(overrides: Partial<EvidenceQueryPlan["sourceLanguagePolicy"]> = {}): EvidenceQueryPlan["sourceLanguagePolicy"] {
  return {
    primaryLanguage: "de",
    supplementaryLanguageDecision: "needed",
    rationale: "Opaque upstream language policy rationale.",
    ...overrides,
  };
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
        runId: "run-7n2",
        currentDate: "2026-05-16",
        detectedLanguage: "de",
      },
      policySnapshot: buildStaticEvidenceTaskPolicySnapshot(),
      retrievalPolicyCatalog: readStaticEvidenceRetrievalPolicyCatalog(),
      claimContract: {} as ClaimContract,
    },
  };
}

function pointer(id = "OPAQUE_CONTENT_PACKET_001"): OpaqueSourceContentPacketPointer {
  return {
    contentPacketPointerId: id,
    nonDurable: true,
    dereferenceableByStructuralCore: false,
    rawContentIncluded: false,
  };
}

function portResult(
  overrides: Partial<SourceAcquisitionPortAttemptResult> = {},
): SourceAcquisitionPortAttemptResult {
  return {
    attemptId: "ATT_001",
    outcomeKind: "success",
    durationMs: 25,
    candidateIds: ["OPAQUE_CANDIDATE_001"],
    contentPacketPointers: [pointer()],
    ...overrides,
  };
}

function controlledPort(
  resultFactory: (request: SourceAcquisitionPortAttemptRequest, index: number) => SourceAcquisitionPortAttemptResult = () => portResult(),
): SourceAcquisitionPort & { calls: SourceAcquisitionPortAttemptRequest[] } {
  const calls: SourceAcquisitionPortAttemptRequest[] = [];
  return {
    authority: SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY,
    calls,
    acquire: (request) => {
      calls.push(request);
      return resultFactory(request, calls.length - 1);
    },
  };
}

function executionRequest(
  overrides: Partial<SourceAcquisitionExecutionRequest> = {},
): SourceAcquisitionExecutionRequest {
  const handoffDecision = handoff();
  return {
    executionId: "EXEC_7N2",
    visibility: "internal_only",
    handoffDecision,
    sourceAcquisitionStartDecision: sourceDecision(),
    budget: buildSourceAcquisitionStructuralExecutionBudget(handoffDecision.handoff),
    port: controlledPort(),
    ...overrides,
  };
}

describe("analyzer-v2 source-acquisition structural executor", () => {
  it("executes only hidden internal structural attempts through a controlled harness port", async () => {
    const port = controlledPort((request, index) =>
      portResult({
        attemptId: `ATT_${index + 1}`,
        candidateIds: [`OPAQUE_CANDIDATE_${index + 1}`],
        contentPacketPointers: [pointer(`OPAQUE_CONTENT_PACKET_${index + 1}`)],
      })
    );

    const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({ port }));

    expect(decision).toMatchObject({
      visibility: "internal_only",
      status: "completed_structural",
      executorStopReason: "not_stopped",
      attempts: [
        {
          executionId: "EXEC_7N2",
          queryId: "EQ_001",
          retrievalPolicyKey: "baseline_research",
          targetAtomicClaimIds: ["AC_001"],
          outcomeKind: "success",
          candidateCount: 1,
          contentPacketPointerCount: 1,
          structuralSuccessIsAcquisitionStatusOnly: true,
        },
        {
          queryId: "EQ_002",
          retrievalPolicyKey: "supplementary_language_lane",
          targetAtomicClaimIds: ["AC_002"],
          outcomeKind: "success",
          structuralSuccessIsAcquisitionStatusOnly: true,
        },
      ],
    });
    expect(port.calls).toHaveLength(2);
    expect(port.calls.map((call) => call.queryText)).toEqual([
      "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      "Did the legal proceedings against Jair Bolsonaro comply with Brazilian law?",
    ]);
  });

  it("creates no port calls for blocked handoffs, missing provenance, or invalid cache provenance", async () => {
    for (const handoffDecision of [
      blockedHandoff(),
      {
        ...handoff(),
        decisionVersion: "stale-handoff-decision-version",
      } as unknown as QueryPlanSourceAcquisitionHandoffDecision,
      handoff({
        handoffVersion: "stale-handoff-version" as QueryPlanSourceAcquisitionHandoff["handoffVersion"],
      }),
      handoff({
        sourceLanguagePolicy: {
          ...sourceLanguagePolicy(),
          rationale: undefined,
        } as unknown as QueryPlanSourceAcquisitionHandoff["sourceLanguagePolicy"],
      }),
      handoff({ promptProvenance: null as unknown as QueryPlanSourceAcquisitionHandoff["promptProvenance"] }),
      handoff({
        cacheProvenance: {
          namespace: "cache",
          reason: "no_store_runtime_dispatch_safety",
          canRead: true,
          canWrite: false,
        } as unknown as QueryPlanSourceAcquisitionHandoff["cacheProvenance"],
      }),
      handoff({
        cacheProvenance: {
          namespace: "cache",
          reason: "no_store_runtime_dispatch_safety",
          canRead: false,
          canWrite: true,
        } as unknown as QueryPlanSourceAcquisitionHandoff["cacheProvenance"],
      }),
      handoff({
        cacheProvenance: {
          namespace: "cache",
          reason: "no_store_runtime_dispatch_safety",
          canRead: false,
          canWrite: false,
          keyParts: ["not_allowed"],
        } as unknown as QueryPlanSourceAcquisitionHandoff["cacheProvenance"],
      }),
      handoff({
        cacheProvenance: {
          namespace: "cache",
          reason: "no_store_runtime_dispatch_safety",
          canRead: false,
          canWrite: false,
          storageAuthority: "not_allowed",
        } as unknown as QueryPlanSourceAcquisitionHandoff["cacheProvenance"],
      }),
    ]) {
      const port = controlledPort();
      const readyHandoff = handoff();
      const budget = buildSourceAcquisitionStructuralExecutionBudget(readyHandoff.handoff);

      const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
        handoffDecision,
        budget,
        port,
      }));

      expect(decision.status).toBe("blocked");
      expect(port.calls).toHaveLength(0);
    }
  });

  it("creates no port calls for missing, malformed, or misaligned source-acquisition start decisions", async () => {
    const cases: SourceAcquisitionStartDecision[] = [
      {
        decisionVersion: SOURCE_ACQUISITION_REQUEST_VERSION,
        visibility: "internal_only",
        status: "blocked",
        request: null,
        blockedReason: "evidence_lifecycle_blocked",
        sourceEvidenceLifecycleStatus: "blocked",
      },
      {
        ...sourceDecision(),
        decisionVersion: "stale-source-acquisition-decision-version",
      } as unknown as SourceAcquisitionStartDecision,
      {
        ...sourceDecision(),
        request: {
          ...sourceDecision().request!,
          requestVersion: "stale-source-acquisition-request-version",
        },
      } as unknown as SourceAcquisitionStartDecision,
      {
        ...sourceDecision(),
        request: {
          ...sourceDecision().request!,
          executionScope: "runtime_provider_execution",
        },
      } as unknown as SourceAcquisitionStartDecision,
      sourceDecision(["AC_001"]),
    ];

    for (const sourceAcquisitionStartDecision of cases) {
      const port = controlledPort();
      const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
        sourceAcquisitionStartDecision,
        port,
      }));

      expect(decision).toMatchObject({
        status: "blocked",
        executorStopReason: "source_request_invalid",
      });
      expect(port.calls).toHaveLength(0);
    }
  });

  it("blocks unknown target IDs through the handoff contract before execution", async () => {
    const handoffDecision = handoff({
      queryEntries: [
        {
          queryId: "EQ_UNKNOWN",
          retrievalPolicyKey: "baseline_research",
          queryText: "Opaque query text",
          targetAtomicClaimIds: ["AC_UNKNOWN"],
        },
      ],
    });
    const port = controlledPort();
    const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      handoffDecision,
      sourceAcquisitionStartDecision: sourceDecision(["AC_001", "AC_002"]),
      budget: buildSourceAcquisitionStructuralExecutionBudget(handoff().handoff),
      port,
    }));

    expect(decision).toMatchObject({
      status: "blocked",
      executorStopReason: "handoff_not_ready",
    });
    expect(port.calls).toHaveLength(0);
  });

  it("creates no port calls for invalid, stale, cancelled, retrying, or below-count budgets", async () => {
    const ready = handoff();
    const baseBudget = buildSourceAcquisitionStructuralExecutionBudget(ready.handoff);
    const budgets: SourceAcquisitionExecutionBudgetSnapshot[] = [
      null as unknown as SourceAcquisitionExecutionBudgetSnapshot,
      { ...baseBudget, source: "runtime_provider" } as SourceAcquisitionExecutionBudgetSnapshot,
      { ...baseBudget, maxQueryEntries: 1 },
      { ...baseBudget, maxAttemptsPerQuery: 2 } as SourceAcquisitionExecutionBudgetSnapshot,
      { ...baseBudget, maxCandidateRecordsPerQuery: -1 },
      { ...baseBudget, timeoutMs: 0 },
      { ...baseBudget, maxContentPacketPointersPerQuery: -1 },
      { ...baseBudget, cancellationState: "requested" },
      { ...baseBudget, retryPolicy: "immediate_retry" } as SourceAcquisitionExecutionBudgetSnapshot,
      {
        ...baseBudget,
        handoffIdentity: {
          ...buildSourceAcquisitionHandoffIdentitySnapshot(ready.handoff),
          queryIds: ["STALE"],
        },
      },
    ];

    for (const budget of budgets) {
      const port = controlledPort();
      const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
        handoffDecision: ready,
        budget,
        port,
      }));

      expect(decision.status).toBe("blocked");
      expect(port.calls).toHaveLength(0);
    }
  });

  it("rejects production runtime authority before port calls", async () => {
    const port: SourceAcquisitionPort & { calls: SourceAcquisitionPortAttemptRequest[] } = {
      ...controlledPort(),
      authority: {
        ...SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY,
        productionRuntime: true,
      } as SourceAcquisitionPort["authority"],
    };

    const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({ port }));

    expect(decision).toMatchObject({
      status: "blocked",
      executorStopReason: "controlled_harness_authority_invalid",
    });
    expect(port.calls).toHaveLength(0);
  });

  it("uses the approved 7H structural outcome labels only", async () => {
    const outcomeKinds = readStaticSourceAcquisitionStructuralOutcomeKinds();
    expect(outcomeKinds).toEqual([
      "not_executed",
      "provider_not_configured",
      "provider_failure",
      "search_failure",
      "rate_limited",
      "fetch_failure",
      "content_unavailable",
      "content_rejected_structurally",
      "success",
    ]);

    for (const outcomeKind of outcomeKinds) {
      const ready = handoff({
        queryEntries: [
          {
            queryId: `EQ_${outcomeKind}`,
            retrievalPolicyKey: "baseline_research",
            queryText: "Opaque query text",
            targetAtomicClaimIds: ["AC_001"],
          },
        ],
      });
      const port = controlledPort(() => portResult({ outcomeKind }));
      const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
        handoffDecision: ready,
        budget: buildSourceAcquisitionStructuralExecutionBudget(ready.handoff),
        port,
      }));

      expect(decision).toMatchObject({
        status: "completed_structural",
        attempts: [{ outcomeKind, structuralSuccessIsAcquisitionStatusOnly: true }],
      });
    }
  });

  it("keeps timeout, partial execution, and cap failures as executor stop reasons, not outcome labels", async () => {
    const timeoutDecision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: controlledPort(() => portResult({ durationMs: 30001 })),
    }));
    const partialCalls: SourceAcquisitionPortAttemptRequest[] = [];
    const partialDecision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: {
        ...controlledPort(),
        acquire: (request) => {
          partialCalls.push(request);
          throw new Error("controlled harness failure");
        },
      },
    }));
    const secondQueryFailurePort = controlledPort((_request, index) => {
      if (index === 1) {
        throw new Error("controlled harness failure on second query");
      }
      return portResult({ attemptId: "ATT_FIRST" });
    });
    const secondQueryFailureDecision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: secondQueryFailurePort,
    }));
    const overCandidateCap = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      budget: buildSourceAcquisitionStructuralExecutionBudget(handoff().handoff, {
        maxCandidateRecordsPerQuery: 0,
      }),
      port: controlledPort(() => portResult({ candidateIds: ["OPAQUE_CANDIDATE_001"] })),
    }));
    const overContentCap = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      budget: buildSourceAcquisitionStructuralExecutionBudget(handoff().handoff, {
        maxContentPacketPointersPerQuery: 0,
      }),
      port: controlledPort(() => portResult({ contentPacketPointers: [pointer()] })),
    }));

    expect(timeoutDecision).toMatchObject({ status: "damaged_structural", executorStopReason: "port_timeout" });
    expect(partialDecision).toMatchObject({ status: "damaged_structural", executorStopReason: "partial_execution" });
    expect(partialCalls).toHaveLength(1);
    expect(secondQueryFailureDecision).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "partial_execution",
      attempts: [{ attemptId: "ATT_FIRST" }],
    });
    expect(secondQueryFailurePort.calls).toHaveLength(2);
    expect(overCandidateCap).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "port_candidate_cap_exceeded",
    });
    expect(overContentCap).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "port_content_packet_cap_exceeded",
    });

    const approvedOutcomeKinds = readStaticSourceAcquisitionStructuralOutcomeKinds();
    expect(approvedOutcomeKinds).not.toContain("retry_exhausted");
    expect(approvedOutcomeKinds).not.toContain("timeout");
  });

  it("rejects malformed controlled-harness port output and non-opaque content pointers", async () => {
    const invalidOutcome = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: controlledPort(() =>
        portResult({
          outcomeKind: "evidence_quality_accepted" as SourceAcquisitionPortAttemptResult["outcomeKind"],
        })
      ),
    }));
    const rawContentPointer = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: controlledPort(() =>
        portResult({
          contentPacketPointers: [
            {
              ...pointer(),
              rawContent: "not allowed",
            } as unknown as OpaqueSourceContentPacketPointer,
          ],
        })
      ),
    }));
    const leakingCandidateId = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: controlledPort(() => portResult({ candidateIds: ["https://example.test/source"] })),
    }));
    const leakingPointerId = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: controlledPort(() =>
        portResult({
          contentPacketPointers: [pointer("example.test/source")],
        })
      ),
    }));
    const durablePointer = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: controlledPort(() =>
        portResult({
          contentPacketPointers: [
            {
              ...pointer(),
              nonDurable: false,
            } as unknown as OpaqueSourceContentPacketPointer,
          ],
        })
      ),
    }));
    const dereferenceablePointer = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      port: controlledPort(() =>
        portResult({
          contentPacketPointers: [
            {
              ...pointer(),
              dereferenceableByStructuralCore: true,
            } as unknown as OpaqueSourceContentPacketPointer,
          ],
        })
      ),
    }));

    for (const forbiddenField of [
      "snippet",
      "title",
      "url",
      "domain",
      "sourceName",
      "sourceRecord",
      "providerRank",
      "providerPayload",
      "languageLabel",
      "dereferenceLocator",
      "storageAuthority",
    ]) {
      const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
        port: controlledPort(() =>
          portResult({
            contentPacketPointers: [
              {
                ...pointer(),
                [forbiddenField]: "not allowed",
              } as unknown as OpaqueSourceContentPacketPointer,
            ],
          })
        ),
      }));
      expect(decision).toMatchObject({
        status: "damaged_structural",
        executorStopReason: "port_result_invalid",
      });
    }

    expect(invalidOutcome).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "port_result_invalid",
    });
    expect(rawContentPointer).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "port_result_invalid",
    });
    expect(leakingCandidateId).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "port_result_invalid",
    });
    expect(leakingPointerId).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "port_result_invalid",
    });
    expect(durablePointer).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "port_result_invalid",
    });
    expect(dereferenceablePointer).toMatchObject({
      status: "damaged_structural",
      executorStopReason: "port_result_invalid",
    });
  });

  it("passes query text, retrieval policy key, and language policy through without deriving output labels", async () => {
    const ready = handoff({
      sourceLanguagePolicy: sourceLanguagePolicy({
        primaryLanguage: "pt",
        rationale: "Portuguese-first upstream policy.",
      }),
      queryEntries: [
        {
          queryId: "EQ_PT",
          retrievalPolicyKey: "contradiction_search",
          queryText: "O processo judicial contra Jair Bolsonaro respeitou o direito processual brasileiro?",
          targetAtomicClaimIds: ["AC_001"],
        },
      ],
    });
    const port = controlledPort();

    const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      handoffDecision: ready,
      sourceAcquisitionStartDecision: sourceDecision(),
      budget: buildSourceAcquisitionStructuralExecutionBudget(ready.handoff),
      port,
    }));

    expect(port.calls).toHaveLength(1);
    expect(port.calls[0]).toMatchObject({
      queryText: "O processo judicial contra Jair Bolsonaro respeitou o direito processual brasileiro?",
      retrievalPolicyKey: "contradiction_search",
      sourceLanguagePolicy: ready.handoff.sourceLanguagePolicy,
      supplementaryLanguageRationale: "Portuguese-first upstream policy.",
    });
    expect(JSON.stringify(decision)).not.toContain("Portuguese");
    expect(JSON.stringify(decision)).not.toContain("processo judicial");
  });

  it("keeps structural behavior independent of query wording and language", async () => {
    const left = handoff({
      sourceLanguagePolicy: sourceLanguagePolicy({ primaryLanguage: "de" }),
      queryEntries: [
        {
          queryId: "EQ_LEFT",
          retrievalPolicyKey: "baseline_research",
          queryText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
          targetAtomicClaimIds: ["AC_001"],
        },
      ],
    });
    const right = handoff({
      sourceLanguagePolicy: sourceLanguagePolicy({ primaryLanguage: "en" }),
      queryEntries: [
        {
          queryId: "EQ_RIGHT",
          retrievalPolicyKey: "baseline_research",
          queryText: "Using hydrogen for cars is more efficient than using electricity",
          targetAtomicClaimIds: ["AC_001"],
        },
      ],
    });
    const leftDecision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      handoffDecision: left,
      budget: buildSourceAcquisitionStructuralExecutionBudget(left.handoff),
    }));
    const rightDecision = await executeSourceAcquisitionStructuralExecutor(executionRequest({
      handoffDecision: right,
      budget: buildSourceAcquisitionStructuralExecutionBudget(right.handoff),
    }));

    if (leftDecision.status !== "completed_structural" || rightDecision.status !== "completed_structural") {
      throw new Error("Expected both decisions to complete structurally.");
    }
    expect(leftDecision.attempts[0].outcomeKind).toBe(rightDecision.attempts[0].outcomeKind);
    expect(leftDecision.attempts[0].candidateCount).toBe(rightDecision.attempts[0].candidateCount);
  });

  it("serializes no evidence, source identity, public report, cache-key, or raw provider payload fields", async () => {
    const decision = await executeSourceAcquisitionStructuralExecutor(executionRequest());
    const serialized = JSON.stringify(decision);

    for (const forbidden of [
      "evidenceItems",
      "applicability",
      "probative",
      "sourceReliability",
      "scarcity",
      "sufficiency",
      "warning",
      "verdict",
      "confidence",
      "report",
      "public",
      "cacheKey",
      "keyParts",
      "\"rawContent\"",
      "not allowed",
      "snippet",
      "title",
      "url",
      "domain",
      "sourceName",
      "sourceRecord",
      "locator",
      "providerRank",
      "languageLabel",
      "providerPayload",
      "queryText",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
