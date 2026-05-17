import { describe, expect, it, vi } from "vitest";
import { runClaimBoundaryPipelineV2 } from "@/lib/analyzer-v2";
import { runClaimBoundaryV2Shell } from "@/lib/analyzer-v2/pipeline-shell";
import { toResultCompatibilityView } from "@/lib/analyzer-v2/compatibility-view";
import {
  clearEvidenceLifecycleIntakeRuntimeArtifacts,
  readEvidenceLifecycleIntakeRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink";
import {
  clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts,
  readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink";

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
  }
  return [];
}

describe("analyzer-v2 shell", () => {
  it("returns an explicitly damaged V2 pre-cutover envelope without running analysis", async () => {
    const onEvent = vi.fn();

    const result = await runClaimBoundaryV2Shell({
      jobId: "job-v2-shell",
      inputType: "text",
      inputValue: "Structural shell test input",
      onEvent,
    });

    expect(result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        pipeline: "claimboundary-v2",
        publicCutoverStatus: "blocked_precutover",
        runId: "job-v2-shell",
      },
      verdict: {
        label: "UNVERIFIED",
        truthPercentage: 50,
        confidence: 0,
        confidenceTier: "none",
      },
      qualityGates: {
        damagedReport: true,
      },
    });
    expect(result.resultJson.warnings).toEqual([
      expect.objectContaining({
        type: "report_damaged",
        primaryIssueEligible: true,
        damagedReportRelation: "report_damaged",
      }),
    ]);
    expect(result.reportMarkdown).toContain("No claim understanding");
    expect(onEvent).toHaveBeenCalledWith("Analyzer V2 orchestrator initialized.", 8);
    expect(onEvent).toHaveBeenCalledWith("Analyzer V2 damaged structural envelope generated.", 90);
  });

  it("exposes the damaged envelope through the compatibility view", async () => {
    const result = await runClaimBoundaryV2Shell({
      inputType: "text",
      inputValue: "Structural shell test input",
    });

    const view = toResultCompatibilityView(result.resultJson);

    expect(view).toMatchObject({
      schemaKind: "v2",
      schemaVersion: "4.0.0-cb-precutover",
      pipeline: "claimboundary-v2",
      publicCutoverStatus: "blocked_precutover",
      verdictLabel: null,
      truthPercentage: null,
      confidence: null,
      confidenceTier: null,
      primaryIssue: {
        code: "report_damaged",
      },
    });
    expect(view.claims).toEqual([
      expect.objectContaining({
        id: "AC_V2_SHELL_01",
        selected: true,
      }),
    ]);
    expect(view.claimBoundaries).toEqual([]);
    expect(view.claimVerdicts).toEqual([]);
    expect(view.evidenceItems).toEqual([]);
    expect(view.sources).toEqual([]);
    expect(view.qualityGates).toBeNull();
  });

  it("does not expose internal Claim Understanding runtime state in the public result JSON", async () => {
    const result = await runClaimBoundaryV2Shell({
      inputType: "text",
      inputValue: "Structural shell test input",
    });
    const keys = collectKeys(result.resultJson);
    const serialized = JSON.stringify(result.resultJson);

    expect(keys).not.toEqual(expect.arrayContaining([
      "claimUnderstanding",
      "claimUnderstandingResult",
      "claimUnderstandingState",
      "providerTelemetry",
      "cacheDecision",
      "keyParts",
      "renderedPrompt",
      "activationSnapshot",
      "activationSnapshotHash",
      "hiddenArtifact",
      "artifactId",
      "artifactSink",
      "sideEffects",
    ]));
    expect(serialized).not.toContain("V2_CLAIM_UNDERSTANDING_GATE1");
    expect(serialized).not.toContain("v2.claim-understanding.runtime-stage.0");
    expect(serialized).not.toContain("gateway_policy_not_executable");
  });

  it("records product-internal Evidence Lifecycle intake observation without public exposure", async () => {
    const ledgerId = "job-v2-shell-x7j:precutover-observability";
    clearEvidenceLifecycleIntakeRuntimeArtifacts(ledgerId);

    const result = await runClaimBoundaryV2Shell({
      jobId: "job-v2-shell-x7j",
      inputType: "text",
      inputValue: "Structural shell X7-J input",
    });
    const serialized = JSON.stringify(result.resultJson);
    const keys = collectKeys(result.resultJson);

    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(ledgerId)).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        ledgerId,
        evidenceLifecycleIntake: expect.objectContaining({
          observationStatus: "blocked_preexecution",
          status: "blocked",
          executionEligibility: "not_executable_precutover",
        }),
        downstreamExecution: {
          queryPlanningExecuted: false,
          sourceAcquisitionExecuted: false,
          providerNetworkExecuted: false,
          parserExecuted: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
        },
      }),
    ]);
    expect(keys).not.toEqual(expect.arrayContaining([
      "evidenceLifecycleIntake",
      "downstreamExecution",
      "artifactVersion",
      "artifactId",
      "ledgerId",
      "runId",
    ]));
    expect(serialized).not.toContain("job-v2-shell-x7j:precutover-observability");
    expect(serialized).not.toContain("contract_observed_preexecution");
    expect(serialized).not.toContain("not_executable_precutover");
  });

  it("records product-internal Query Planning pre-execution observation without public exposure", async () => {
    const ledgerId = "job-v2-shell-x7o:precutover-observability";
    clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId);

    const result = await runClaimBoundaryV2Shell({
      jobId: "job-v2-shell-x7o",
      inputType: "text",
      inputValue: "Using hydrogen for cars is more efficient than using electricity",
    });
    const serialized = JSON.stringify(result.resultJson);
    const keys = collectKeys(result.resultJson);

    expect(readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId)).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        ledgerId,
        preexecutionObservation: expect.objectContaining({
          status: "blocked_pre_query_planning",
          blockedReason: "evidence_lifecycle_intake_blocked",
          sourceIntakeStatus: "blocked",
          inputScope: "not_applicable",
          sourceLanguageSignal: "unavailable",
        }),
        productExecution: {
          queryPlanningRuntimeInvoked: false,
          promptLoaded: false,
          promptRendered: false,
          modelCalled: false,
          providerCallbackCreated: false,
          providerSearchFetchCalled: false,
          sourceAcquisitionExecuted: false,
          parserExecuted: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
        },
        publicCutoverStatus: "blocked_precutover",
      }),
    ]);
    expect(keys).not.toEqual(expect.arrayContaining([
      "preexecutionObservation",
      "productExecution",
      "artifactVersion",
      "artifactId",
      "ledgerId",
      "runId",
    ]));
    expect(serialized).not.toContain("job-v2-shell-x7o:precutover-observability");
    expect(serialized).not.toContain("preexecutionObservation");
    expect(serialized).not.toContain("structural_prerequisites_observed_not_executed_precutover");
    expect(serialized).not.toContain("blocked_pre_query_planning");
    expect(serialized).not.toContain("queryPlanningEligibility");
    expect(serialized).not.toContain("eligibility");
  });

  it("keeps public damaged output unchanged when intake artifact recording fails", async () => {
    vi.resetModules();
    vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink", () => ({
      recordEvidenceLifecycleIntakeRuntimeArtifact: () => {
        throw new Error("simulated X7-J sink failure");
      },
    }));

    try {
      const { runClaimBoundaryV2Shell: runWithFailingSink } = await import("@/lib/analyzer-v2/pipeline-shell");
      const result = await runWithFailingSink({
        jobId: "job-v2-shell-x7j-sink-failure",
        inputType: "text",
        inputValue: "Structural shell X7-J sink failure input",
      });

      expect(result.resultJson).toMatchObject({
        _schemaVersion: "4.0.0-cb-precutover",
        meta: {
          pipeline: "claimboundary-v2",
          publicCutoverStatus: "blocked_precutover",
          runId: "job-v2-shell-x7j-sink-failure",
        },
        qualityGates: {
          damagedReport: true,
        },
        verdict: {
          label: "UNVERIFIED",
          confidenceTier: "none",
        },
      });
      expect(JSON.stringify(result.resultJson)).not.toContain("simulated X7-J sink failure");
      expect(JSON.stringify(result.resultJson)).not.toContain("not_executable_precutover");
    } finally {
      vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink");
      vi.resetModules();
    }
  });

  it("keeps public damaged output unchanged when Query Planning observation artifact recording fails", async () => {
    vi.resetModules();
    vi.doMock(
      "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink",
      () => ({
        recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact: () => {
          throw new Error("simulated X7-O sink failure");
        },
      }),
    );

    try {
      const { runClaimBoundaryV2Shell: runWithFailingSink } = await import("@/lib/analyzer-v2/pipeline-shell");
      const result = await runWithFailingSink({
        jobId: "job-v2-shell-x7o-sink-failure",
        inputType: "text",
        inputValue: "Plastic recycling is pointless",
      });

      expect(result.resultJson).toMatchObject({
        _schemaVersion: "4.0.0-cb-precutover",
        meta: {
          pipeline: "claimboundary-v2",
          publicCutoverStatus: "blocked_precutover",
          runId: "job-v2-shell-x7o-sink-failure",
        },
        qualityGates: {
          damagedReport: true,
        },
        verdict: {
          label: "UNVERIFIED",
          confidenceTier: "none",
        },
      });
      expect(JSON.stringify(result.resultJson)).not.toContain("simulated X7-O sink failure");
      expect(JSON.stringify(result.resultJson)).not.toContain("preexecutionObservation");
    } finally {
      vi.doUnmock(
        "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink",
      );
      vi.resetModules();
    }
  });

  it("threads ACS preparation diagnostics into admin-only warnings without exposing internal state", async () => {
    const result = await runClaimBoundaryPipelineV2({
      runIdHint: "job-v2-shell-acs-diagnostics",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Prepared resolved text",
          preparedUnderstanding: {
            detectedInputType: "text",
            detectedLanguage: "de",
            atomicClaims: [
              {
                id: "AC_01",
                statement: "Vorbereitete Aussage",
              },
            ],
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: ["AC_01"],
    });
    const keys = collectKeys(result.resultJson);
    const serialized = JSON.stringify(result.resultJson);

    expect(result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      qualityGates: {
        damagedReport: true,
      },
    });
    expect(result.resultJson.warnings).toEqual([
      expect.objectContaining({
        type: "report_damaged",
      }),
      expect.objectContaining({
        type: "claim_preparation_integrity_event",
        category: "internal_diagnostic",
        severity: "info",
        visibility: "admin_only",
        primaryIssueEligible: false,
        details: expect.objectContaining({
          inputSource: "acs_prepared_snapshot",
          preparationStatus: "accepted",
          eventType: "acs_snapshot_consumed",
          acsMigrationStatus: "accepted",
        }),
      }),
    ]);
    expect(keys).not.toEqual(expect.arrayContaining([
      "claimUnderstanding",
      "claimUnderstandingResult",
      "claimUnderstandingState",
      "claimContract",
      "providerTelemetry",
      "cacheDecision",
      "sideEffects",
    ]));
    expect(serialized).not.toContain("V2_CLAIM_UNDERSTANDING_GATE1");
    expect(serialized).not.toContain("v2.claim-understanding.runtime-stage.0");
  });

  it("does not pass direct-text runtime scaffold options from the product shell", async () => {
    const inputValue = "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben";
    let providerCalls = 0;

    const result = await runClaimBoundaryV2Shell(
      {
        jobId: "job-v2-shell-runtime-scaffold",
        inputType: "text",
        inputValue,
      },
      {
        now: () => new Date("2026-05-14T12:00:00.000Z"),
        claimUnderstandingRuntime: {
          directTextRuntimeDispatch: {
            enabled: true,
            providerBoundary: {
              provider: "anthropic",
              modelName: "claude-haiku-4-5-20251001",
              configSnapshotHash: "config-snapshot-hash-6b3c4a",
              temperature: 0.15,
              providerCall: async () => {
                providerCalls += 1;
                throw new Error("product shell must not pass scaffold options");
              },
            },
          },
        },
      } as any,
    );

    const keys = collectKeys(result.resultJson);
    const serialized = JSON.stringify(result.resultJson);

    expect(providerCalls).toBe(0);
    expect(result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      qualityGates: {
        damagedReport: true,
      },
      verdict: {
        label: "UNVERIFIED",
        confidenceTier: "none",
      },
    });
    expect(result.reportMarkdown).toContain("No claim understanding");
    expect(keys).not.toEqual(expect.arrayContaining([
      "claimUnderstanding",
      "claimUnderstandingResult",
      "claimUnderstandingState",
      "providerTelemetry",
      "cacheDecision",
      "keyParts",
      "renderedPrompt",
      "renderedPromptHash",
      "activationSnapshot",
      "activationSnapshotHash",
      "hiddenArtifact",
      "artifactId",
      "artifactSink",
      "sideEffects",
      "runtimeDispatchStatus",
      "runtimeDispatchBlockedReason",
      "ownerContract",
    ]));
    expect(serialized).not.toContain("providerTelemetry");
    expect(serialized).not.toContain("no_store_runtime_dispatch_safety");
    expect(serialized).not.toContain("v2.claim-understanding.runtime-stage.0");
    expect(serialized).not.toContain("runtime_dispatch_completed");
  });
});
