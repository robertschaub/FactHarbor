import { describe, expect, it } from "vitest";
import type {
  SourceAcquisitionCandidateRuntimeClosedLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_VERSION,
  buildEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact,
  clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts,
  readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts,
  recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink";

const POISON = "https://example.invalid/source?secret=sk_test_closed_loop";

function context(runIdHint = "job-v2-x7w1b-closed-loop") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-17T18:00:00.000Z"),
  });
}

function decision(
  overrides: Partial<SourceAcquisitionCandidateRuntimeClosedLoopDecision> = {},
): SourceAcquisitionCandidateRuntimeClosedLoopDecision {
  return {
    closedLoopVersion: "v2.evidence-lifecycle.source-acquisition-candidate-runtime-closed-loop.x7w1b",
    visibility: "internal_only",
    status: "closed_loop_completed_no_source_candidates",
    blockedReason: null,
    damagedReason: null,
    admissionStatus: "admission_ready_no_runtime_execution",
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 3,
    retrievalPolicyCount: 5,
    sourceLanguageSignal: "present",
    productClosedLoopAuthorityHash: "a".repeat(64),
    runtimeContractAuthorityHash: "r".repeat(64),
    providerAllowlistSnapshotHash: "p".repeat(64),
    candidateBudgetSnapshotHash: "b".repeat(64),
    runtimeStatus: "completed_structural",
    queryOutcomeSummaries: [
      {
        ordinal: 1,
        closedLoopQueryRef: "CLQ_001",
        status: "failed",
        structuralReason: "provider_failure",
        providerAttemptObserved: true,
        candidateCount: 0,
      },
    ],
    telemetry: {
      candidateRuntimeExercised: true,
      closedProviderBoundaryInvoked: true,
      providerAttemptCount: 3,
      candidateCount: 0,
      totalCandidateCount: 0,
      bytesRead: 0,
      providerNetworkExecuted: false,
      searchFetchCalled: false,
      contentDereferenceCalled: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      publicSurfaceWritten: false,
    },
    publicCutoverStatus: "blocked_precutover",
    ...overrides,
  };
}

function recordFor(
  runIdHint = "job-v2-x7w1b-closed-loop",
  closedLoopDecision = decision(),
) {
  return recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact({
    context: context(runIdHint),
    closedLoopDecision,
  });
}

describe("Analyzer V2 Source Acquisition candidate closed-loop artifact sink", () => {
  it("records bounded admin-only closed-loop artifacts without query/source/provider leakage", () => {
    const runContext = context();
    clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact({
      context: runContext,
      closedLoopDecision: decision(),
    });
    const artifacts = readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );
    const serialized = JSON.stringify(artifacts);

    expect(result.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        source: "product_v2_orchestrator_after_candidate_runtime_admission",
        candidateRuntimeClosedLoop: expect.objectContaining({
          status: "closed_loop_completed_no_source_candidates",
          blockedReason: null,
          damagedReason: null,
          queryEntryCount: 3,
          queryOutcomeSummaries: [
            expect.objectContaining({
              closedLoopQueryRef: "CLQ_001",
              status: "failed",
              structuralReason: "provider_failure",
              candidateCount: 0,
            }),
          ],
        }),
        productExecution: expect.objectContaining({
          candidateRuntimeClosedLoopObserved: true,
          candidateRuntimeExecuted: true,
          closedProviderBoundaryInvoked: true,
          providerNetworkExecuted: false,
          parserExecuted: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
          providerAttemptCount: 3,
          candidateCount: 0,
          bytesRead: 0,
        }),
        publicCutoverStatus: "blocked_precutover",
      }),
    ]);
    for (const forbidden of [
      POISON,
      "Mehr als 235",
      "Asylbereich Schweiz Statistik",
      "queryText",
      "queryId",
      "sourceLanguagePolicy",
      "providerAttemptId",
      "sk_test",
      "https://example.invalid",
      "EvidenceItem",
      "reportMarkdown",
      "truthPercentage",
      "confidence",
      "cacheKey",
      "parsedContent",
      "FH_ADMIN_KEY",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("defensively copies artifacts on write and read", () => {
    const runContext = context("job-v2-x7w1b-defensive-copy");
    clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact({
      context: runContext,
      closedLoopDecision: decision(),
    });
    if (result.status !== "recorded") {
      throw new Error("expected artifact to be recorded");
    }
    (result.artifact.candidateRuntimeClosedLoop as { queryEntryCount: number }).queryEntryCount = 99;

    const firstRead = readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    )[0];
    expect(Object.isFrozen(firstRead.candidateRuntimeClosedLoop)).toBe(true);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(runContext.observabilityLedger.ledgerId)[0]
      ?.candidateRuntimeClosedLoop.queryEntryCount).toBe(3);
  });

  it("keeps records per ledger and global ledgers bounded", () => {
    const runContext = context("job-v2-x7w1b-bounded-ledger");
    clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_RECORDS_PER_LEDGER;
      index += 1
    ) {
      recordFor("job-v2-x7w1b-bounded-ledger");
    }

    expect(readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(runContext.observabilityLedger.ledgerId))
      .toHaveLength(EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_RECORDS_PER_LEDGER);

    const baseRunId = "job-v2-x7w1b-bounded-store";
    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_COUNT;
      index += 1
    ) {
      const boundedRunId = `${baseRunId}-${index}`;
      clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(
        `${boundedRunId}:precutover-observability`,
      );
      recordFor(boundedRunId);
    }

    expect(readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(
      `${baseRunId}-0:precutover-observability`,
    )).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(
      `${baseRunId}-${EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_COUNT}:precutover-observability`,
    )).toHaveLength(1);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", () => {
    const invalid = recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact({
      context: {
        ...context("job-v2-x7w1b-invalid-ledger"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      closedLoopDecision: decision(),
    });
    const overlongLedgerId = "x".repeat(
      EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1,
    );
    const overlong = recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact({
      context: {
        ...context("job-v2-x7w1b-overlong-ledger"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      closedLoopDecision: decision(),
    });
    const oversize = recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact({
      context: {
        ...context("job-v2-x7w1b-oversize"),
        runId: `job-v2-x7w1b-${"x".repeat(17_000)}`,
      },
      closedLoopDecision: decision(),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
    expect(readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(" invalid-ledger ")).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(overlongLedgerId)).toEqual([]);
  });

  it("builds artifacts by allow-list projection from explicit fields", () => {
    const artifact = buildEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact({
      context: context("job-v2-x7w1b-allow-list"),
      closedLoopDecision: decision(),
    });

    expect(Object.keys(artifact).sort()).toEqual([
      "artifactVersion",
      "candidateRuntimeClosedLoop",
      "createdUtc",
      "ledgerId",
      "productExecution",
      "publicCutoverStatus",
      "publicPointerExposure",
      "runId",
      "source",
      "visibility",
    ]);
    expect(Object.keys(artifact.candidateRuntimeClosedLoop).sort()).toEqual([
      "admissionStatus",
      "blockedReason",
      "candidateBudgetSnapshotHash",
      "closedLoopVersion",
      "damagedReason",
      "handoffStatus",
      "intakeStatus",
      "productClosedLoopAuthorityHash",
      "providerAllowlistSnapshotHash",
      "queryEntryCount",
      "queryOutcomeSummaries",
      "requestStatus",
      "retrievalPolicyCount",
      "runtimeContractAuthorityHash",
      "runtimeStatus",
      "selectedAtomicClaimCount",
      "sourceLanguageSignal",
      "status",
    ]);
  });
});
