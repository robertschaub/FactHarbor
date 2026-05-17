import { describe, expect, it } from "vitest";
import { buildEvidenceQueryPlanningInspection } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import {
  EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION,
  type EvidenceQueryPlanningRuntimeResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import { buildQueryPlanSourceAcquisitionHandoff } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  clearEvidenceQueryPlanningRuntimeArtifacts,
  EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_VERSION,
  recordEvidenceQueryPlanningRuntimeArtifact,
  readEvidenceQueryPlanningRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink";

function context() {
  return buildClaimBoundaryV2RunContext(
    {
      runIdHint: "job-v2-x7s-artifact",
      submitted: {
        kind: "text",
        value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: ["AC_001"],
    },
    {
      now: () => new Date("2026-05-17T12:00:00.000Z"),
      queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
    },
  );
}

function acceptedRuntimeResult(): EvidenceQueryPlanningRuntimeResult {
  return {
    runtimeVersion: EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION,
    visibility: "internal_only",
    status: "completed",
    blockedReason: null,
    result: {
      schemaVersion: "v2.evidence_query_planning_result.0",
      taskKey: "evidence_query_planning",
      status: "accepted",
      queryPlan: {
        queryPlanId: "EQP_001",
        sourceLanguagePolicy: {
          primaryLanguage: "de",
          supplementaryLanguageDecision: "needed",
          rationale: "German remains primary; supplementary language may help coverage.",
        },
        queries: [
          {
            queryId: "EQ_001",
            retrievalPolicyKey: "baseline_research",
            queryText: "Mehr als 235000 Personen Asylbereich Schweiz Statistik",
            targetAtomicClaimIds: ["AC_001"],
            rationale: "Baseline retrieval for the selected AtomicClaim.",
          },
          {
            queryId: "EQ_002",
            retrievalPolicyKey: "primary_source_refinement",
            queryText: "https://example.invalid/source should not persist as query text",
            targetAtomicClaimIds: ["AC_001"],
            rationale: "Sentinel URL-like text must be redacted in artifacts.",
          },
        ],
      },
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    },
    promptProvenance: {
      promptContentHash: "p".repeat(64),
      renderedPromptHash: "r".repeat(64),
      configSnapshotHash: "c".repeat(64),
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
    },
    cacheDecision: {
      namespace: "analyzer-v2:query",
      canRead: false,
      canWrite: false,
      reason: "no_store_runtime_dispatch_safety",
      missingDimensions: [],
      keyParts: [],
    },
    adapterOutcome: {
      executionStatus: "completed",
      blockedReason: null,
      result: {
        schemaVersion: "v2.evidence_query_planning_result.0",
        taskKey: "evidence_query_planning",
        status: "accepted",
        queryPlan: {
          queryPlanId: "EQP_001",
          sourceLanguagePolicy: {
            primaryLanguage: "de",
            supplementaryLanguageDecision: "needed",
            rationale: "German remains primary; supplementary language may help coverage.",
          },
          queries: [
            {
              queryId: "EQ_001",
              retrievalPolicyKey: "baseline_research",
              queryText: "Mehr als 235000 Personen Asylbereich Schweiz Statistik",
              targetAtomicClaimIds: ["AC_001"],
              rationale: "Baseline retrieval for the selected AtomicClaim.",
            },
          ],
        },
        integrityEvents: [],
        blockedReason: null,
        damagedReason: null,
      },
      attempts: [
        {
          attemptNumber: 1,
          promptContentHash: "p".repeat(64),
          status: "accepted",
          providerTelemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
            inputTokens: 100,
            outputTokens: 60,
            totalTokens: 160,
            durationMs: 90,
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
        modelId: "claude-haiku-4-5-20251001",
        retryCount: 0,
        tokenUsage: {
          inputTokens: 100,
          outputTokens: 60,
          totalTokens: 160,
        },
        durationMs: 90,
        cacheDecision: {
          namespace: "analyzer-v2:query",
          canRead: false,
          canWrite: false,
          reason: "no_store_runtime_dispatch_safety",
          missingDimensions: [],
          keyParts: [],
        },
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

function damagedRuntimeResult(): EvidenceQueryPlanningRuntimeResult {
  const accepted = acceptedRuntimeResult();
  const damagedResult: EvidenceQueryPlanningRuntimeResult["result"] = {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "damaged",
    queryPlan: null,
    integrityEvents: [
      {
        type: "schema_validation_failed",
        severity: "error",
        message: "schema validation failed",
        references: ["evidence_query_planning"],
      },
    ],
    blockedReason: null,
    damagedReason: "schema_validation_failed",
  };

  return {
    ...accepted,
    result: damagedResult,
    adapterOutcome: {
      ...accepted.adapterOutcome!,
      result: damagedResult,
      attempts: [
        {
          attemptNumber: 1,
          promptContentHash: "p".repeat(64),
          status: "invalid_schema",
          providerTelemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
            inputTokens: 100,
            outputTokens: 60,
            totalTokens: 160,
            durationMs: 90,
          },
          failureMessage: JSON.stringify([
            {
              code: "invalid_type",
              path: ["queryPlan", "queries", 0, "queryText"],
              message: `Expected string near https://example.invalid/private and "${"x".repeat(96)}"`,
            },
          ]),
        },
      ],
    },
  };
}

describe("Analyzer V2 Evidence Query Planning runtime artifact sink", () => {
  it("records bounded admin-only X7-S runtime artifacts without raw prompt or source data", () => {
    const runContext = context();
    const runtimeResult = acceptedRuntimeResult();
    const inspection = buildEvidenceQueryPlanningInspection({
      runtimeResult,
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    });
    const sourceAcquisitionHandoff = buildQueryPlanSourceAcquisitionHandoff({
      runtimeResult,
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    });

    clearEvidenceQueryPlanningRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const recordResult = recordEvidenceQueryPlanningRuntimeArtifact({
      context: runContext,
      runtimeResult,
      inspection,
      sourceAcquisitionHandoff,
    });
    const artifacts = readEvidenceQueryPlanningRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const serialized = JSON.stringify(artifacts);

    expect(recordResult.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        ledgerId: "job-v2-x7s-artifact:precutover-observability",
        selectedAtomicClaimIds: ["AC_001"],
        activation: expect.objectContaining({
          status: "enabled_hidden_direct_text",
          sourcePackage: "Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md",
        }),
        runtime: expect.objectContaining({
          status: "completed",
          resultStatus: "accepted",
        }),
        sourceLanguagePolicy: expect.objectContaining({
          primaryLanguage: "de",
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: true,
          modelCalled: true,
          sourceAcquisitionExecuted: false,
          parserExecuted: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(artifacts[0]?.queryEntries).toEqual([
      expect.objectContaining({
        queryId: "EQ_001",
        queryText: "Mehr als 235000 Personen Asylbereich Schweiz Statistik",
        targetAtomicClaimIds: ["AC_001"],
      }),
      expect.objectContaining({
        queryId: "EQ_002",
        queryText: "[redacted_url_like_query_text]",
        targetAtomicClaimIds: ["AC_001"],
      }),
    ]);
    expect(serialized).not.toContain("Evidence Query Planning prompt bytes");
    expect(serialized).not.toContain("Baseline retrieval");
    expect(serialized).not.toContain("https://example.invalid");
    expect(artifacts[0]?.adapterAttemptDiagnostics).toEqual([
      expect.objectContaining({
        attemptNumber: 1,
        status: "accepted",
        failureCategory: "none",
        issueCount: 0,
        issues: [],
      }),
    ]);
  });

  it("records bounded sanitized adapter diagnostics for damaged schema attempts", () => {
    const runContext = context();
    const runtimeResult = damagedRuntimeResult();
    const inspection = buildEvidenceQueryPlanningInspection({
      runtimeResult,
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    });
    const sourceAcquisitionHandoff = buildQueryPlanSourceAcquisitionHandoff({
      runtimeResult,
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    });

    clearEvidenceQueryPlanningRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const recordResult = recordEvidenceQueryPlanningRuntimeArtifact({
      context: runContext,
      runtimeResult,
      inspection,
      sourceAcquisitionHandoff,
    });
    const artifacts = readEvidenceQueryPlanningRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const serialized = JSON.stringify(artifacts);

    expect(recordResult.status).toBe("recorded");
    expect(artifacts[0]).toMatchObject({
      runtime: {
        resultStatus: "damaged",
        resultDamagedReason: "schema_validation_failed",
      },
      queryEntryCount: 0,
      queryEntries: [],
      sourceLanguagePolicy: null,
      sourceAcquisitionHandoff: {
        status: "blocked",
      },
      adapterAttemptDiagnostics: [
        {
          attemptNumber: 1,
          status: "invalid_schema",
          promptContentHash: "p".repeat(64),
          providerTelemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
            inputTokens: 100,
            outputTokens: 60,
            totalTokens: 160,
            durationMs: 90,
          },
          failureCategory: "schema_validation",
          issueCount: 1,
          issues: [
            {
              path: "queryPlan.queries.0.queryText",
              code: "invalid_type",
              message: 'Expected string near [redacted_url] and "[redacted_long_literal]"',
            },
          ],
        },
      ],
    });
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("x".repeat(96));
  });

  it("projects selected AtomicClaim ids from inspection when run context has no selected ids", () => {
    const runContext = {
      ...context(),
      selectedAtomicClaimIds: [],
    };
    const runtimeResult = acceptedRuntimeResult();
    const inspection = buildEvidenceQueryPlanningInspection({
      runtimeResult,
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    });
    const sourceAcquisitionHandoff = buildQueryPlanSourceAcquisitionHandoff({
      runtimeResult,
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    });

    clearEvidenceQueryPlanningRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    expect(recordEvidenceQueryPlanningRuntimeArtifact({
      context: runContext,
      runtimeResult,
      inspection,
      sourceAcquisitionHandoff,
    }).status).toBe("recorded");

    const artifact = readEvidenceQueryPlanningRuntimeArtifacts(runContext.observabilityLedger.ledgerId)[0];
    expect(artifact?.selectedAtomicClaimIds).toEqual(["AC_001"]);
    expect(artifact?.queryEntries.flatMap((queryEntry) => queryEntry.targetAtomicClaimIds)).toEqual([
      "AC_001",
      "AC_001",
    ]);
    expect(artifact?.sourceAcquisitionHandoff).toMatchObject({
      status: "ready_not_executable",
      blockedReason: null,
      executionScope: "not_executable",
    });
  });

  it("rejects invalid ledger ids at the sink boundary", () => {
    const runContext = {
      ...context(),
      observabilityLedger: {
        ledgerId: " invalid-ledger ",
        status: "runtime_activation_ready" as const,
      },
    };
    const runtimeResult = acceptedRuntimeResult();
    const inspection = buildEvidenceQueryPlanningInspection({
      runtimeResult,
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    });
    const sourceAcquisitionHandoff = buildQueryPlanSourceAcquisitionHandoff({
      runtimeResult,
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
    });

    expect(recordEvidenceQueryPlanningRuntimeArtifact({
      context: runContext,
      runtimeResult,
      inspection,
      sourceAcquisitionHandoff,
    })).toEqual({
      status: "skipped_invalid_ledger_id",
      artifact: null,
    });
  });
});
