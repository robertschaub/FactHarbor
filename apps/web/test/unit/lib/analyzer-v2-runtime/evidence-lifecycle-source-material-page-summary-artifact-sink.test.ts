import { describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildSourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  buildEvidenceLifecycleSourceCandidatePreviewDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner";
import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import {
  runEvidenceLifecycleSourceMaterialPageSummaryDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner";
import {
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_VERSION,
  clearEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts,
  readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts,
  recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink";

function context(runIdHint = "job-v2-x7w3b-page-summary") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-18T11:00:00.000Z"),
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

async function decision() {
  const candidate = {
    key: "Hydrogen_vehicle",
    title: "Hydrogen vehicle",
    excerpt: "Fuel cell vehicles use hydrogen.",
    description: "Public encyclopedia page",
  };
  const projection = buildSourceCandidatePreviewProjection({
    providerId: "wikimedia_core",
    endpointId: "ep_wikimedia_core_page_search",
    providerAttemptOrdinal: 1,
    providerRank: 1,
    candidateOrdinal: 1,
    sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
    candidate,
  });
  return runEvidenceLifecycleSourceMaterialPageSummaryDecision({
    networkDecision: networkDecision(),
    previewDecision: buildEvidenceLifecycleSourceCandidatePreviewDecision({
      networkDecision: networkDecision(),
      previewProjections: [projection],
    }),
    fetchLocators: [buildSourceMaterialPageSummaryFetchLocator({ projection, candidate })],
    lowLevelTransport: {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      request: async () => ({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        remoteAddress: "93.184.216.34",
        body: Buffer.from("{\"extract\":\"Hydrogen vehicles store hydrogen and power an electric motor.\"}", "utf8"),
      }),
    },
  });
}

async function recordFor(runIdHint = "job-v2-x7w3b-page-summary") {
  return recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact({
    context: context(runIdHint),
    decision: await decision(),
  });
}

describe("Analyzer V2 W3-B page-summary Source Material artifact sink", () => {
  it("records bounded admin-only Source Material artifacts without raw locator leakage", async () => {
    const runContext = context();
    clearEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact({
      context: runContext,
      decision: await decision(),
    });
    const artifacts = readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );
    const serialized = JSON.stringify(artifacts);

    expect(result.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        source: "product_v2_orchestrator_after_source_material_page_summary",
        sourceMaterialPageSummary: expect.objectContaining({
          status: "source_material_page_summary_completed",
          sourceMaterialRecordCount: 1,
          extractionInput: null,
          evidenceCorpus: null,
          downstreamGate: "source_material_to_evidence_corpus_gate_closed",
        }),
        productExecution: expect.objectContaining({
          pageSummaryFetchObserved: true,
          extraHttpCallMade: true,
          contentDereferenceCalled: true,
          parserExecuted: false,
          cacheRead: false,
          cacheWrite: false,
          storageWrite: false,
          sourceReliabilityCalled: false,
          sourceMaterialCreated: true,
          evidenceCorpusCreated: false,
          evidenceItemGenerated: false,
          reportGenerated: false,
          verdictGenerated: false,
          confidenceGenerated: false,
          publicSurfaceWritten: false,
        }),
        publicCutoverStatus: "blocked_precutover",
      }),
    ]);
    expect(serialized).toContain("Hydrogen vehicles store hydrogen");
    for (const forbidden of [
      "Hydrogen_vehicle",
      "https://example.invalid",
      "sk_test",
      "queryText",
      "EvidenceCorpus",
      "EvidenceItem",
      "reportMarkdown",
      "truthPercentage",
      "confidence:",
      "cacheKey",
      "FH_ADMIN_KEY",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("keeps artifacts defensively copied and ledger storage bounded", async () => {
    const runContext = context("job-v2-x7w3b-bounded");
    clearEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_RECORDS_PER_LEDGER;
      index += 1
    ) {
      await recordFor("job-v2-x7w3b-bounded");
    }
    const records = readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    expect(records).toHaveLength(EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_RECORDS_PER_LEDGER);
    expect(Object.isFrozen(records[0]?.sourceMaterialPageSummary)).toBe(true);

    const baseRunId = "job-v2-x7w3b-bounded-store";
    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_COUNT;
      index += 1
    ) {
      await recordFor(`${baseRunId}-${index}`);
    }
    expect(readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(
      `${baseRunId}-0:precutover-observability`,
    )).toEqual([]);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", async () => {
    const sourceDecision = await decision();
    const invalid = recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact({
      context: {
        ...context("job-v2-x7w3b-invalid-ledger"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      decision: sourceDecision,
    });
    const overlongLedgerId = "x".repeat(
      EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1,
    );
    const overlong = recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact({
      context: {
        ...context("job-v2-x7w3b-overlong-ledger"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      decision: sourceDecision,
    });
    const oversize = recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact({
      context: {
        ...context("job-v2-x7w3b-oversize"),
        runId: `job-v2-x7w3b-${"x".repeat(25_000)}`,
      },
      decision: sourceDecision,
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
  });
});
