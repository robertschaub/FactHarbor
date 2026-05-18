import { describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildEvidenceLifecycleSourceCandidatePreviewDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner";
import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import {
  EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_VERSION,
  clearEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts,
  readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts,
  recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink";

function context(runIdHint = "job-v2-x7w3a-preview") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-18T10:00:00.000Z"),
  });
}

function networkDecision(): SourceAcquisitionCandidateProviderNetworkLoopDecision {
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
    queryOutcomeSummaries: [],
    telemetry: {
      candidateRuntimeExercised: true,
      candidateProviderBoundaryInvoked: true,
      providerNetworkBoundaryInvoked: true,
      providerAttemptCount: 1,
      networkAttemptCount: 1,
      candidateCount: 1,
      totalCandidateCount: 1,
      structurallyDroppedCandidateCount: 0,
      totalDurationMs: 20,
      totalCompressedBytes: 200,
      totalDecompressedBytes: 200,
      totalBytes: 400,
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
      networkAttempts: [],
    },
    downstreamGate: "candidate_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

function previewDecision() {
  const preview = buildSourceCandidatePreviewProjection({
    providerId: "wikimedia_core",
    endpointId: "ep_wikimedia_core_page_search",
    providerAttemptOrdinal: 1,
    providerRank: 1,
    candidateOrdinal: 1,
    sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
    candidate: {
      key: "Switzerland_asylum_statistics",
      title: "Asylum statistics in Switzerland",
      excerpt: "Mehr als 235 000 Personen",
      description: "Public encyclopedia page",
    },
  });
  return buildEvidenceLifecycleSourceCandidatePreviewDecision({
    networkDecision: networkDecision(),
    previewProjections: [preview],
  });
}

function recordFor(runIdHint = "job-v2-x7w3a-preview") {
  return recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact({
    context: context(runIdHint),
    previewDecision: previewDecision(),
  });
}

describe("Analyzer V2 W3-A source-candidate preview artifact sink", () => {
  it("records bounded admin-only preview artifacts without raw locator or downstream leakage", () => {
    const runContext = context();
    clearEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact({
      context: runContext,
      previewDecision: previewDecision(),
    });
    const artifacts = readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );
    const serialized = JSON.stringify(artifacts);

    expect(result.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        source: "product_v2_orchestrator_after_source_candidate_preview_materialization",
        sourceCandidatePreview: expect.objectContaining({
          status: "source_candidate_preview_materialized",
          previewRecordCount: 1,
          sourceMaterial: null,
          extractionInput: null,
          evidenceCorpus: null,
          downstreamGate: "source_candidate_preview_to_source_material_gate_closed",
        }),
        productExecution: expect.objectContaining({
          sourceCandidatePreviewObserved: true,
          extraHttpCallMade: false,
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
        }),
        publicCutoverStatus: "blocked_precutover",
      }),
    ]);
    for (const forbidden of [
      "Switzerland_asylum_statistics",
      "https://example.invalid",
      "sk_test",
      "queryText",
      "sourceMaterialCreated:true",
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

  it("keeps artifacts defensively copied and ledger storage bounded", () => {
    const runContext = context("job-v2-x7w3a-bounded");
    clearEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_RECORDS_PER_LEDGER;
      index += 1
    ) {
      recordFor("job-v2-x7w3a-bounded");
    }
    const records = readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    expect(records).toHaveLength(EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_RECORDS_PER_LEDGER);
    expect(Object.isFrozen(records[0]?.sourceCandidatePreview)).toBe(true);

    const baseRunId = "job-v2-x7w3a-bounded-store";
    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_COUNT;
      index += 1
    ) {
      recordFor(`${baseRunId}-${index}`);
    }
    expect(readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(
      `${baseRunId}-0:precutover-observability`,
    )).toEqual([]);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", () => {
    const invalid = recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact({
      context: {
        ...context("job-v2-x7w3a-invalid-ledger"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      previewDecision: previewDecision(),
    });
    const overlongLedgerId = "x".repeat(
      EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1,
    );
    const overlong = recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact({
      context: {
        ...context("job-v2-x7w3a-overlong-ledger"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      previewDecision: previewDecision(),
    });
    const oversize = recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact({
      context: {
        ...context("job-v2-x7w3a-oversize"),
        runId: `job-v2-x7w3a-${"x".repeat(25_000)}`,
      },
      previewDecision: previewDecision(),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
  });
});
