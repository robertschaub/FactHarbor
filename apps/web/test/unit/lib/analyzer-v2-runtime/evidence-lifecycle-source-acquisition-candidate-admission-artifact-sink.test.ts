import { describe, expect, it } from "vitest";
import type {
  SourceAcquisitionCandidateRuntimeAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_VERSION,
  buildEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact,
  clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts,
  readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts,
  recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink";

function context(runIdHint = "job-v2-x7w1a-source-admission") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-17T16:00:00.000Z"),
  });
}

function decision(
  overrides: Partial<SourceAcquisitionCandidateRuntimeAdmissionDecision> = {},
): SourceAcquisitionCandidateRuntimeAdmissionDecision {
  return {
    admissionVersion: "v2.evidence-lifecycle.source-acquisition-candidate-runtime-admission.x7w1a",
    visibility: "internal_only",
    status: "admission_ready_no_runtime_execution",
    blockedReason: null,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    admissionScope: "admission_only_no_runtime_execution",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 3,
    retrievalPolicyCount: 5,
    sourceLanguageSignal: "present",
    admissionAuthoritySnapshotHash: "a".repeat(64),
    providerAllowlistSnapshotHash: "p".repeat(64),
    candidateBudgetSnapshotHash: "b".repeat(64),
    candidateRuntimePosture: {
      productAdmissionAuthority: "approved_x7w1a_admission_only",
      candidateRuntimeAuthority: "not_authorized",
      candidateProviderAuthority: "not_authorized",
      sourceExecutionAuthority: "blocked_precutover",
      publicExposure: "forbidden",
    },
    telemetry: {
      admittedQueryCount: 3,
      providerAttemptCount: 0,
      candidateCount: 0,
      totalCandidateCount: 0,
      bytesRead: 0,
      candidateRuntimeExecuted: false,
      candidateProviderInvoked: false,
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
      reportGenerated: false,
      verdictGenerated: false,
      publicSurfaceWritten: false,
    },
    publicCutoverStatus: "blocked_precutover",
    ...overrides,
  };
}

function recordFor(
  runIdHint = "job-v2-x7w1a-source-admission",
  admissionDecision = decision(),
) {
  return recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
    context: context(runIdHint),
    admissionDecision,
  });
}

describe("Analyzer V2 Source Acquisition candidate admission artifact sink", () => {
  it("records bounded admin-only candidate-admission artifacts without source or query content", () => {
    const runContext = context();
    clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
      context: runContext,
      admissionDecision: decision(),
    });
    const artifacts = readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );
    const serialized = JSON.stringify(artifacts);

    expect(result.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        source: "product_v2_orchestrator_after_source_acquisition_intake",
        candidateRuntimeAdmission: expect.objectContaining({
          status: "admission_ready_no_runtime_execution",
          blockedReason: null,
          queryEntryCount: 3,
          sourceLanguageSignal: "present",
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: true,
          sourceAcquisitionIntakeObserved: true,
          candidateRuntimeAdmissionObserved: true,
          candidateRuntimeExecuted: false,
          candidateProviderInvoked: false,
          sourceAcquisitionExecuted: false,
          providerNetworkExecuted: false,
          parserExecuted: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
          providerAttemptCount: 0,
          candidateCount: 0,
          bytesRead: 0,
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

  it("records blocked admission decisions with execution flags still false", () => {
    const runContext = context("job-v2-x7w1a-source-admission-blocked");
    clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
      context: runContext,
      admissionDecision: decision({
        status: "blocked_pre_candidate_runtime_admission",
        blockedReason: "source_acquisition_intake_not_ready",
        intakeStatus: "blocked_pre_source_acquisition",
        admissionScope: "not_applicable",
        queryEntryCount: 0,
      }),
    });

    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(runContext.observabilityLedger.ledgerId)[0])
      .toMatchObject({
        candidateRuntimeAdmission: {
          status: "blocked_pre_candidate_runtime_admission",
          blockedReason: "source_acquisition_intake_not_ready",
        },
        productExecution: {
          candidateRuntimeExecuted: false,
          candidateProviderInvoked: false,
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
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
          providerAttemptCount: 0,
          candidateCount: 0,
          bytesRead: 0,
        },
      });
  });

  it("defensively copies artifacts on write and read", () => {
    const runContext = context("job-v2-x7w1a-defensive-copy");
    clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
      context: runContext,
      admissionDecision: decision(),
    });
    if (result.status !== "recorded") {
      throw new Error("expected artifact to be recorded");
    }
    (result.artifact.candidateRuntimeAdmission as { queryEntryCount: number }).queryEntryCount = 99;

    const firstRead = readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    )[0];
    expect(Object.isFrozen(firstRead.candidateRuntimeAdmission)).toBe(true);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(runContext.observabilityLedger.ledgerId)[0]
      ?.candidateRuntimeAdmission.queryEntryCount).toBe(3);
  });

  it("keeps records per ledger and global ledgers bounded", () => {
    const runContext = context("job-v2-x7w1a-bounded-ledger");
    clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_RECORDS_PER_LEDGER;
      index += 1
    ) {
      recordFor("job-v2-x7w1a-bounded-ledger");
    }

    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(runContext.observabilityLedger.ledgerId))
      .toHaveLength(EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_RECORDS_PER_LEDGER);

    const baseRunId = "job-v2-x7w1a-bounded-store";
    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_COUNT;
      index += 1
    ) {
      const boundedRunId = `${baseRunId}-${index}`;
      clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(
        `${boundedRunId}:precutover-observability`,
      );
      recordFor(boundedRunId);
    }

    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(
      `${baseRunId}-0:precutover-observability`,
    )).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(
      `${baseRunId}-${EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_COUNT}:precutover-observability`,
    )).toHaveLength(1);
  });

  it("rejects invalid and overlong ledger ids at the sink boundary", () => {
    const invalid = recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
      context: {
        ...context("job-v2-x7w1a-invalid-ledger"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      admissionDecision: decision(),
    });
    const overlongLedgerId = "x".repeat(
      EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1,
    );
    const overlong = recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
      context: {
        ...context("job-v2-x7w1a-overlong-ledger"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      admissionDecision: decision(),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(" invalid-ledger ")).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(overlongLedgerId)).toEqual([]);
  });

  it("skips oversize artifacts without storing them", () => {
    const overlongRunId = `job-v2-x7w1a-${"x".repeat(17_000)}`;
    const runContext = {
      ...context("job-v2-x7w1a-oversize"),
      runId: overlongRunId,
    };

    const result = recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
      context: runContext,
      admissionDecision: decision(),
    });

    expect(result.status).toBe("skipped_artifact_oversize");
    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(runContext.observabilityLedger.ledgerId))
      .toEqual([]);
  });

  it("builds artifacts by allow-list projection from explicit fields", () => {
    const artifact = buildEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
      context: context("job-v2-x7w1a-allow-list"),
      admissionDecision: decision(),
    });

    expect(Object.keys(artifact).sort()).toEqual([
      "artifactVersion",
      "candidateRuntimeAdmission",
      "createdUtc",
      "ledgerId",
      "productExecution",
      "publicCutoverStatus",
      "publicPointerExposure",
      "runId",
      "source",
      "visibility",
    ]);
    expect(Object.keys(artifact.candidateRuntimeAdmission).sort()).toEqual([
      "admissionAuthoritySnapshotHash",
      "admissionScope",
      "admissionVersion",
      "blockedReason",
      "candidateBudgetSnapshotHash",
      "handoffStatus",
      "intakeStatus",
      "providerAllowlistSnapshotHash",
      "queryEntryCount",
      "requestStatus",
      "retrievalPolicyCount",
      "selectedAtomicClaimCount",
      "sourceLanguageSignal",
      "status",
    ]);
  });
});
