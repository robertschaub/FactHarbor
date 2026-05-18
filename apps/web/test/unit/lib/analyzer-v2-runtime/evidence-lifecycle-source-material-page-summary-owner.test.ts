import { describe, expect, it } from "vitest";
import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import {
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildSourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  buildEvidenceLifecycleSourceCandidatePreviewDecision,
  type EvidenceLifecycleSourceCandidatePreviewDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner";
import {
  runEvidenceLifecycleSourceMaterialPageSummaryDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner";

function networkDecision(
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
    ...overrides,
  };
}

function candidate() {
  return {
    key: "Hydrogen_vehicle",
    title: "Hydrogen vehicle",
    excerpt: "Fuel cell vehicles use hydrogen.",
    description: "Public encyclopedia page",
  };
}

function previewDecision(records = [projection()]): EvidenceLifecycleSourceCandidatePreviewDecision {
  return buildEvidenceLifecycleSourceCandidatePreviewDecision({
    networkDecision: networkDecision(),
    previewProjections: records,
  });
}

function projection() {
  return buildSourceCandidatePreviewProjection({
    providerId: "wikimedia_core",
    endpointId: "ep_wikimedia_core_page_search",
    providerAttemptOrdinal: 1,
    providerRank: 1,
    candidateOrdinal: 1,
    sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
    candidate: candidate(),
  });
}

function locator() {
  return buildSourceMaterialPageSummaryFetchLocator({
    projection: projection(),
    candidate: candidate(),
  });
}

describe("Analyzer V2 W3-B page-summary Source Material owner", () => {
  it("creates one hidden Source Material record from a completed W2 and materialized W3-A locator", async () => {
    const decision = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision(),
      previewDecision: previewDecision(),
      fetchLocators: [locator()],
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
    const serialized = JSON.stringify(decision);

    expect(decision).toMatchObject({
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      status: "source_material_page_summary_completed",
      stopReason: "not_stopped",
      attemptedFetchCount: 1,
      sourceMaterialRecordCount: 1,
      fetchDiagnosticCount: 1,
      extractionInput: null,
      evidenceCorpus: null,
      evidenceItems: [],
      productExecution: {
        candidateProviderNetworkObserved: true,
        sourceCandidatePreviewObserved: true,
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
        warningGenerated: false,
        reportGenerated: false,
        verdictGenerated: false,
        confidenceGenerated: false,
        publicSurfaceWritten: false,
      },
      downstreamGate: "source_material_to_evidence_corpus_gate_closed",
      publicCutoverStatus: "blocked_precutover",
    });
    expect(serialized).toContain("Hydrogen vehicles store hydrogen");
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("EvidenceCorpus");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("blocks before fetch when W2/W3-A/locator prerequisites are not met", async () => {
    await expect(runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision({ status: "blocked_pre_candidate_provider_network" }),
      previewDecision: previewDecision(),
      fetchLocators: [locator()],
    })).resolves.toMatchObject({
      status: "blocked_pre_source_material_page_summary",
      stopReason: "candidate_provider_network_not_completed",
      attemptedFetchCount: 0,
    });

    await expect(runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision(),
      previewDecision: buildEvidenceLifecycleSourceCandidatePreviewDecision({
        networkDecision: networkDecision(),
        previewProjections: [],
      }),
      fetchLocators: [locator()],
    })).resolves.toMatchObject({
      status: "blocked_pre_source_material_page_summary",
      stopReason: "source_candidate_preview_not_ready",
      attemptedFetchCount: 0,
    });

    const partialProjection = buildSourceCandidatePreviewProjection({
      providerId: "wikimedia_core",
      endpointId: "ep_wikimedia_core_page_search",
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      candidate: {
        key: "Partial_Page",
        title: "Partial",
        excerpt: "https://example.invalid/unsafe",
      },
    });
    await expect(runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision(),
      previewDecision: previewDecision([partialProjection]),
      fetchLocators: [],
    })).resolves.toMatchObject({
      status: "blocked_pre_source_material_page_summary",
      stopReason: "materialized_preview_missing",
      attemptedFetchCount: 0,
    });

    await expect(runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision(),
      previewDecision: previewDecision(),
      fetchLocators: [],
    })).resolves.toMatchObject({
      status: "blocked_pre_source_material_page_summary",
      stopReason: "eligible_fetch_locator_missing",
      attemptedFetchCount: 0,
    });
  });

  it("fails closed after fetch when extract is missing or unsafe", async () => {
    const decision = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision(),
      previewDecision: previewDecision(),
      fetchLocators: [locator()],
      lowLevelTransport: {
        resolve: async () => [{ address: "93.184.216.34", family: 4 }],
        request: async () => ({
          statusCode: 200,
          headers: { "content-type": "application/json" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from("{\"extract_html\":\"<p>not allowed</p>\"}", "utf8"),
        }),
      },
    });

    expect(decision).toMatchObject({
      status: "source_material_page_summary_failed_structural",
      stopReason: "source_material_extract_missing",
      attemptedFetchCount: 1,
      sourceMaterialRecordCount: 0,
      productExecution: expect.objectContaining({
        extraHttpCallMade: true,
        sourceMaterialCreated: false,
        evidenceCorpusCreated: false,
        publicSurfaceWritten: false,
      }),
    });
  });
});
