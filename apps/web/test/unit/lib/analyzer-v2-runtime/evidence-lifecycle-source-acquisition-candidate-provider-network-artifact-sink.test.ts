import { describe, expect, it } from "vitest";
import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_VERSION,
  buildEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact,
  clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts,
  readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts,
  recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink";

const POISON = "https://example.invalid/source?secret=sk_test_w2_network";

function context(runIdHint = "job-v2-x7w2-network") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-17T21:00:00.000Z"),
  });
}

function decision(
  overrides: Partial<SourceAcquisitionCandidateProviderNetworkLoopDecision> = {},
): SourceAcquisitionCandidateProviderNetworkLoopDecision {
  return {
    networkLoopVersion: "v2.evidence-lifecycle.source-acquisition-candidate-provider-network-loop.x7w2",
    visibility: "internal_only",
    status: "candidate_provider_network_completed",
    blockedReason: null,
    damagedReason: null,
    closedLoopStatus: "closed_loop_completed_no_source_candidates",
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 1,
    retrievalPolicyCount: 1,
    sourceLanguageSignal: "present",
    productNetworkAuthorityHash: "a".repeat(64),
    runtimeContractAuthorityHash: "r".repeat(64),
    endpointSnapshotHash: "e".repeat(64),
    networkBudgetSnapshotHash: "n".repeat(64),
    providerAllowlistSnapshotHash: "p".repeat(64),
    candidateBudgetSnapshotHash: "b".repeat(64),
    runtimeStatus: "completed_structural",
    queryOutcomeSummaries: [
      {
        ordinal: 1,
        candidateProviderNetworkQueryRef: "W2Q_001",
        status: "attempted",
        structuralReason: "not_stopped",
        providerAttemptObserved: true,
        candidateCount: 3,
      },
    ],
    telemetry: {
      candidateRuntimeExercised: true,
      candidateProviderBoundaryInvoked: true,
      providerNetworkBoundaryInvoked: true,
      providerAttemptCount: 1,
      networkAttemptCount: 1,
      candidateCount: 3,
      totalCandidateCount: 5,
      structurallyDroppedCandidateCount: 2,
      totalDurationMs: 42,
      totalCompressedBytes: 2048,
      totalDecompressedBytes: 4096,
      totalBytes: 6144,
      fixedDollarCost: 0,
      costReason: "no_paid_api_no_credentials",
      providerNetworkExecuted: true,
      searchFetchCalled: true,
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
      networkAttempts: [
        {
          telemetryVersion: "v2.source-acquisition.provider-network-attempt-telemetry.7n3b2-t1",
          visibility: "internal_only",
          providerId: "wikimedia_core",
          endpointId: "ep_wikimedia_core_page_search",
          attemptOrdinal: 1,
          structuralStatus: "success",
          stopReason: "not_stopped",
          durationMs: 42,
          timeoutMs: 1500,
          candidateCount: 5,
          compressedBytes: 2048,
          decompressedBytes: 4096,
          byteCountState: "observed",
          rawPayloadIncluded: false,
          secretIncluded: false,
          publicPayloadIncluded: false,
          errorTraceIncluded: false,
        },
      ],
    },
    downstreamGate: "candidate_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    ...overrides,
  };
}

function recordFor(runIdHint = "job-v2-x7w2-network") {
  return recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
    context: context(runIdHint),
    networkDecision: decision(),
  });
}

describe("Analyzer V2 Source Acquisition candidate-provider network artifact sink", () => {
  it("records bounded admin-only W2 artifacts without query/provider/source leakage", () => {
    const runContext = context();
    clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    const result = recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
      context: runContext,
      networkDecision: decision(),
    });
    const artifacts = readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );
    const serialized = JSON.stringify(artifacts);

    expect(result.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        source: "product_v2_orchestrator_after_candidate_provider_network_loop",
        candidateProviderNetwork: expect.objectContaining({
          status: "candidate_provider_network_completed",
          blockedReason: null,
          damagedReason: null,
          queryEntryCount: 1,
          queryOutcomeSummaries: [
            expect.objectContaining({
              candidateProviderNetworkQueryRef: "W2Q_001",
              status: "attempted",
              structuralReason: "not_stopped",
              candidateCount: 3,
            }),
          ],
          downstreamGate: "candidate_to_source_material_gate_closed",
        }),
        productExecution: expect.objectContaining({
          candidateProviderNetworkObserved: true,
          candidateRuntimeExecuted: true,
          candidateProviderBoundaryInvoked: true,
          providerNetworkBoundaryInvoked: true,
          providerNetworkExecuted: true,
          searchFetchCalled: true,
          contentDereferenceCalled: false,
          parserExecuted: false,
          cacheRead: false,
          cacheWrite: false,
          storageWrite: false,
          sourceReliabilityCalled: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
          providerAttemptCount: 1,
          networkAttemptCount: 1,
          candidateCount: 3,
          totalCandidateCount: 5,
          structurallyDroppedCandidateCount: 2,
          fixedDollarCost: 0,
          costReason: "no_paid_api_no_credentials",
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
      "Raw Title",
      "Raw excerpt",
      "Raw_Key",
      "sk_test",
      "https://example.invalid",
      "EvidenceItem",
      "EvidenceCorpus",
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
    const runContext = context("job-v2-x7w2-defensive-copy");
    clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    const result = recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
      context: runContext,
      networkDecision: decision(),
    });
    if (result.status !== "recorded") {
      throw new Error("expected artifact to be recorded");
    }
    (result.artifact.candidateProviderNetwork as { queryEntryCount: number }).queryEntryCount = 99;

    const firstRead = readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    )[0];
    expect(Object.isFrozen(firstRead.candidateProviderNetwork)).toBe(true);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    )[0]?.candidateProviderNetwork.queryEntryCount).toBe(1);
  });

  it("keeps records per ledger and global ledgers bounded", () => {
    const runContext = context("job-v2-x7w2-bounded-ledger");
    clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_RECORDS_PER_LEDGER;
      index += 1
    ) {
      recordFor("job-v2-x7w2-bounded-ledger");
    }

    expect(readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    )).toHaveLength(EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_RECORDS_PER_LEDGER);

    const baseRunId = "job-v2-x7w2-bounded-store";
    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_COUNT;
      index += 1
    ) {
      const boundedRunId = `${baseRunId}-${index}`;
      clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
        `${boundedRunId}:precutover-observability`,
      );
      recordFor(boundedRunId);
    }

    expect(readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      `${baseRunId}-0:precutover-observability`,
    )).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
      `${baseRunId}-${EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_COUNT}:precutover-observability`,
    )).toHaveLength(1);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", () => {
    const invalid = recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
      context: {
        ...context("job-v2-x7w2-invalid-ledger"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      networkDecision: decision(),
    });
    const overlongLedgerId = "x".repeat(
      EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1,
    );
    const overlong = recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
      context: {
        ...context("job-v2-x7w2-overlong-ledger"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      networkDecision: decision(),
    });
    const oversize = recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
      context: {
        ...context("job-v2-x7w2-oversize"),
        runId: `job-v2-x7w2-${"x".repeat(25_000)}`,
      },
      networkDecision: decision(),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
    expect(readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(" invalid-ledger "))
      .toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(overlongLedgerId))
      .toEqual([]);
  });

  it("builds artifacts by allow-list projection from explicit fields", () => {
    const artifact = buildEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
      context: context("job-v2-x7w2-allow-list"),
      networkDecision: decision(),
    });

    expect(Object.keys(artifact).sort()).toEqual([
      "artifactVersion",
      "candidateProviderNetwork",
      "createdUtc",
      "ledgerId",
      "productExecution",
      "publicCutoverStatus",
      "publicPointerExposure",
      "runId",
      "source",
      "visibility",
    ]);
    expect(Object.keys(artifact.candidateProviderNetwork).sort()).toEqual([
      "blockedReason",
      "candidateBudgetSnapshotHash",
      "closedLoopStatus",
      "damagedReason",
      "downstreamGate",
      "endpointSnapshotHash",
      "handoffStatus",
      "intakeStatus",
      "networkBudgetSnapshotHash",
      "networkLoopVersion",
      "productNetworkAuthorityHash",
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
