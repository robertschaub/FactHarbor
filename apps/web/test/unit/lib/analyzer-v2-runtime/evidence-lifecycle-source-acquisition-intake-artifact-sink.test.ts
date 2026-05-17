import { describe, expect, it } from "vitest";
import type {
  SourceAcquisitionIntakeBoundaryDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_VERSION,
  buildEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact,
  clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts,
  readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts,
  recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink";

function context(runIdHint = "job-v2-x7v-source-intake") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-17T14:00:00.000Z"),
  });
}

function decision(
  overrides: Partial<SourceAcquisitionIntakeBoundaryDecision> = {},
): SourceAcquisitionIntakeBoundaryDecision {
  return {
    boundaryVersion: "v2.evidence-lifecycle.source-acquisition-intake-boundary.x7v",
    visibility: "internal_only",
    status: "intake_ready_not_executable",
    blockedReason: null,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    executionScope: "not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 3,
    retrievalPolicyCount: 5,
    sourceLanguageSignal: "present",
    executionPosture: {
      sourceExecutionAuthority: "blocked_precutover",
      providerNetworkAuthority: "not_authorized",
      parserAuthority: "not_authorized",
      publicExposure: "forbidden",
    },
    execution: {
      sourceAcquisitionExecuted: false,
      providerNetworkExecuted: false,
      searchFetchCalled: false,
      contentDereferenceCalled: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: false,
      evidenceCorpusCreated: false,
      reportGenerated: false,
      verdictGenerated: false,
    },
    ...overrides,
  };
}

function recordFor(
  runIdHint = "job-v2-x7v-source-intake",
  intakeBoundary = decision(),
) {
  return recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
    context: context(runIdHint),
    intakeBoundary,
  });
}

describe("Analyzer V2 Source Acquisition intake artifact sink", () => {
  it("records bounded admin-only intake artifacts without query text or source material", () => {
    const runContext = context();
    clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
      context: runContext,
      intakeBoundary: decision(),
    });
    const artifacts = readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );
    const serialized = JSON.stringify(artifacts);

    expect(result.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        source: "product_v2_orchestrator_after_query_planning_source_acquisition_handoff",
        sourceAcquisitionIntake: expect.objectContaining({
          status: "intake_ready_not_executable",
          blockedReason: null,
          queryEntryCount: 3,
          sourceLanguageSignal: "present",
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: true,
          sourceAcquisitionIntakeObserved: true,
          sourceAcquisitionExecuted: false,
          providerNetworkExecuted: false,
          parserExecuted: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
        publicCutoverStatus: "blocked_precutover",
      }),
    ]);
    for (const forbidden of [
      "Mehr als 235",
      "Asylbereich Schweiz Statistik",
      "queryText",
      "EvidenceItem",
      "reportMarkdown",
      "truthPercentage",
      "confidence",
      "cacheKey",
      "parsedContent",
      "https://example.invalid",
      "FH_ADMIN_KEY",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("records blocked intake boundary decisions with execution flags still false", () => {
    const runContext = context("job-v2-x7v-source-intake-blocked");
    clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
      context: runContext,
      intakeBoundary: decision({
        status: "blocked_pre_source_acquisition",
        blockedReason: "query_plan_handoff_not_ready",
        handoffStatus: "blocked",
        requestStatus: "source_acquisition_ready_not_executable",
        executionScope: "not_applicable",
        queryEntryCount: 0,
      }),
    });

    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(runContext.observabilityLedger.ledgerId)[0])
      .toMatchObject({
        sourceAcquisitionIntake: {
          status: "blocked_pre_source_acquisition",
          blockedReason: "query_plan_handoff_not_ready",
        },
        productExecution: {
          sourceAcquisitionExecuted: false,
          providerNetworkExecuted: false,
          searchFetchCalled: false,
          contentDereferenceCalled: false,
          parserExecuted: false,
          cacheRead: false,
          cacheWrite: false,
          sourceReliabilityCalled: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        },
      });
  });

  it("defensively copies artifacts on write and read", () => {
    const runContext = context("job-v2-x7v-defensive-copy");
    clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
      context: runContext,
      intakeBoundary: decision(),
    });
    if (result.status !== "recorded") {
      throw new Error("expected artifact to be recorded");
    }
    (result.artifact.sourceAcquisitionIntake as { queryEntryCount: number }).queryEntryCount = 99;

    const firstRead = readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    )[0];
    expect(Object.isFrozen(firstRead.sourceAcquisitionIntake)).toBe(true);
    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(runContext.observabilityLedger.ledgerId)[0]
      ?.sourceAcquisitionIntake.queryEntryCount).toBe(3);
  });

  it("keeps records per ledger and global ledgers bounded", () => {
    const runContext = context("job-v2-x7v-bounded-ledger");
    clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (let index = 0; index <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER; index += 1) {
      recordFor("job-v2-x7v-bounded-ledger");
    }

    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(runContext.observabilityLedger.ledgerId))
      .toHaveLength(EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER);

    const baseRunId = "job-v2-x7v-bounded-store";
    for (let index = 0; index <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_COUNT; index += 1) {
      const boundedRunId = `${baseRunId}-${index}`;
      clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(`${boundedRunId}:precutover-observability`);
      recordFor(boundedRunId);
    }

    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(`${baseRunId}-0:precutover-observability`))
      .toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(
      `${baseRunId}-${EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_COUNT}:precutover-observability`,
    )).toHaveLength(1);
  });

  it("rejects invalid ledger ids at the sink boundary", () => {
    const result = recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
      context: {
        ...context("job-v2-x7v-invalid-ledger"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      intakeBoundary: decision(),
    });

    expect(result).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(" invalid-ledger ")).toEqual([]);
  });

  it("skips oversize artifacts without storing them", () => {
    const overlongRunId = `job-v2-x7v-${"x".repeat(17_000)}`;
    const runContext = {
      ...context("job-v2-x7v-oversize"),
      runId: overlongRunId,
    };

    const result = recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
      context: runContext,
      intakeBoundary: decision(),
    });

    expect(result.status).toBe("skipped_artifact_oversize");
    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(runContext.observabilityLedger.ledgerId))
      .toEqual([]);
  });

  it("builds artifacts by allow-list projection from explicit fields", () => {
    const artifact = buildEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
      context: context("job-v2-x7v-allow-list"),
      intakeBoundary: decision(),
    });

    expect(Object.keys(artifact).sort()).toEqual([
      "artifactVersion",
      "createdUtc",
      "ledgerId",
      "productExecution",
      "publicCutoverStatus",
      "publicPointerExposure",
      "runId",
      "source",
      "sourceAcquisitionIntake",
      "visibility",
    ]);
    expect(Object.keys(artifact.sourceAcquisitionIntake).sort()).toEqual([
      "blockedReason",
      "boundaryVersion",
      "executionScope",
      "handoffStatus",
      "queryEntryCount",
      "requestStatus",
      "retrievalPolicyCount",
      "selectedAtomicClaimCount",
      "sourceLanguageSignal",
      "status",
    ]);
  });

  it("rejects overlong ledger ids at the sink boundary", () => {
    const overlongLedgerId = "x".repeat(
      EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1,
    );

    const result = recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
      context: {
        ...context("job-v2-x7v-overlong-ledger"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      intakeBoundary: decision(),
    });

    expect(result).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(overlongLedgerId)).toEqual([]);
  });
});
