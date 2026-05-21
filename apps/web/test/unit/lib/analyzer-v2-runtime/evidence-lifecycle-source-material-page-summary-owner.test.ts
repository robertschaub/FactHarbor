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
import type {
  SourceMaterialPageSummaryRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";

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

function candidate(key = "Hydrogen_vehicle", title = "Hydrogen vehicle") {
  return {
    key,
    title,
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

function projection(
  key = "Hydrogen_vehicle",
  title = "Hydrogen vehicle",
  candidateOrdinal = 1,
  providerAttemptOrdinal = 1,
) {
  return buildSourceCandidatePreviewProjection({
    providerId: "wikimedia_core",
    endpointId: "ep_wikimedia_core_page_search",
    providerAttemptOrdinal,
    providerRank: 1,
    candidateOrdinal,
    sourceCandidateRef: `OPAQUE_SOURCE_CANDIDATE_ATT_${providerAttemptOrdinal}_${candidateOrdinal}`,
    candidate: candidate(key, title),
  });
}

function locator(
  key = "Hydrogen_vehicle",
  title = "Hydrogen vehicle",
  candidateOrdinal = 1,
  providerAttemptOrdinal = 1,
) {
  const candidateRecord = candidate(key, title);
  return buildSourceMaterialPageSummaryFetchLocator({
    projection: projection(key, title, candidateOrdinal, providerAttemptOrdinal),
    candidate: candidateRecord,
  });
}

function openAlexRecord(): SourceMaterialPageSummaryRecord {
  return {
    recordVersion: "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
    sourceMaterialId: "SOURCE_MATERIAL_OPENALEX_ABCDEF1234567890",
    locatorRef: "OPAQUE_OPENALEX_WORK_ABCDEF1234567890",
    candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_4_1",
    providerId: "openalex",
    sourceMaterialEndpointId: "ep_openalex_works_search",
    languageCode: "en",
    sourceMaterialKind: "openalex_work_abstract_text",
    sourceMaterialText: "Hydrogen vehicles use electricity",
    sourceMaterialTextHash: "a".repeat(64),
    sourceMaterialTextByteLength: 33,
    sourceMaterialTextCharLength: 33,
    truncationApplied: false,
    responseStatusCategory: "success_2xx",
    contentTypeCategory: "accepted_json",
    compressedBytes: 200,
    decompressedBytes: 300,
    durationMs: 25,
    timeoutMs: 1500,
    publicPointerExposure: "forbidden",
    parserExecuted: false,
    cacheRead: false,
    cacheWrite: false,
    storageWrite: false,
    sourceReliabilityCalled: false,
    evidenceCorpusCreated: false,
    evidenceItemGenerated: false,
    warningGenerated: false,
    reportGenerated: false,
    verdictGenerated: false,
    confidenceGenerated: false,
    publicSurfaceWritten: false,
  };
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

  it("prefers one eligible OpenAlex Source Material record before Wikimedia fill records", async () => {
    const decision = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision(),
      previewDecision: previewDecision(),
      fetchLocators: [locator()],
      openAlexSourceMaterialRecords: [openAlexRecord()],
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

    expect(decision).toMatchObject({
      status: "source_material_page_summary_completed",
      sourceMaterialRecordCount: 2,
      attemptedFetchCount: 1,
      fetchDiagnosticCount: 1,
    });
    expect(decision.sourceMaterialRecords[0]?.providerId).toBe("openalex");
    expect(decision.sourceMaterialRecords[0]?.sourceMaterialKind).toBe("openalex_work_abstract_text");
    expect(decision.sourceMaterialRecords[1]?.providerId).toBe("wikimedia_core");
  });

  it("fetches up to six structurally distinct page summaries in provider-attempt balanced order", async () => {
    const previewRecords = [
      projection("Hydrogen_vehicle", "Hydrogen vehicle", 1),
      projection("Electric_vehicle", "Electric vehicle", 2),
      projection("Battery_electric_vehicle", "Battery electric vehicle", 3),
      projection("Vehicle_efficiency", "Vehicle efficiency", 1, 2),
      projection("Fuel_cell_vehicle", "Fuel cell vehicle", 1, 3),
    ];
    const requestedPaths: string[] = [];
    const decision = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision({
        telemetry: {
          ...networkDecision().telemetry,
          candidateCount: 5,
          totalCandidateCount: 5,
        },
      }),
      previewDecision: previewDecision(previewRecords),
      fetchLocators: [
        locator("Hydrogen_vehicle", "Hydrogen vehicle", 1),
        locator("Electric_vehicle", "Electric vehicle", 2),
        locator("Battery_electric_vehicle", "Battery electric vehicle", 3),
        locator("Vehicle_efficiency", "Vehicle efficiency", 1, 2),
        locator("Fuel_cell_vehicle", "Fuel cell vehicle", 1, 3),
      ],
      lowLevelTransport: {
        resolve: async () => [{ address: "93.184.216.34", family: 4 }],
        request: async (request) => {
          requestedPaths.push(request.pathWithQuery);
          return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            remoteAddress: "93.184.216.34",
            body: Buffer.from(
              JSON.stringify({ extract: `Bounded summary text for ${request.pathWithQuery}.` }),
              "utf8",
            ),
          };
        },
      },
    });

    expect(decision.status).toBe("source_material_page_summary_completed");
    expect(decision.attemptedFetchCount).toBe(5);
    expect(decision.sourceMaterialRecordCount).toBe(5);
    expect(decision.fetchDiagnosticCount).toBe(5);
    expect(decision.sourceMaterialRecords.map((record) => record.candidatePreviewId)).toEqual([
      "SOURCE_CANDIDATE_PREVIEW_1_1",
      "SOURCE_CANDIDATE_PREVIEW_2_1",
      "SOURCE_CANDIDATE_PREVIEW_3_1",
      "SOURCE_CANDIDATE_PREVIEW_1_2",
      "SOURCE_CANDIDATE_PREVIEW_1_3",
    ]);
    expect(decision.fetchDiagnostics.map((diagnostic) => diagnostic.attemptOrdinal)).toEqual([1, 2, 3, 4, 5]);
    expect(requestedPaths).toEqual([
      "/api/rest_v1/page/summary/Hydrogen_vehicle",
      "/api/rest_v1/page/summary/Vehicle_efficiency",
      "/api/rest_v1/page/summary/Fuel_cell_vehicle",
      "/api/rest_v1/page/summary/Electric_vehicle",
      "/api/rest_v1/page/summary/Battery_electric_vehicle",
    ]);
  });

  it("uses preview order rather than incoming locator order for provider-attempt balancing", async () => {
    const previewRecords = [
      projection("First_query_candidate", "First query candidate", 1, 1),
      projection("Second_query_candidate", "Second query candidate", 1, 2),
      projection("Third_query_candidate", "Third query candidate", 1, 3),
    ];
    const decision = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision({
        telemetry: {
          ...networkDecision().telemetry,
          candidateCount: 3,
          totalCandidateCount: 3,
        },
      }),
      previewDecision: previewDecision(previewRecords),
      fetchLocators: [
        locator("Third_query_candidate", "Third query candidate", 1, 3),
        locator("First_query_candidate", "First query candidate", 1, 1),
        locator("Second_query_candidate", "Second query candidate", 1, 2),
      ],
      lowLevelTransport: {
        resolve: async () => [{ address: "93.184.216.34", family: 4 }],
        request: async (request) => ({
          statusCode: 200,
          headers: { "content-type": "application/json" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from(
            JSON.stringify({ extract: `Bounded summary text for ${request.pathWithQuery}.` }),
            "utf8",
          ),
        }),
      },
    });

    expect(decision.sourceMaterialRecords.map((record) => record.candidatePreviewId)).toEqual([
      "SOURCE_CANDIDATE_PREVIEW_1_1",
      "SOURCE_CANDIDATE_PREVIEW_2_1",
      "SOURCE_CANDIDATE_PREVIEW_3_1",
    ]);
  });

  it("fills remaining slots from the same provider-attempt group when fewer groups are eligible", async () => {
    const previewRecords = [
      projection("Hydrogen_vehicle", "Hydrogen vehicle", 1),
      projection("Electric_vehicle", "Electric vehicle", 2),
      projection("Battery_electric_vehicle", "Battery electric vehicle", 3),
      projection("Vehicle_efficiency", "Vehicle efficiency", 4),
    ];
    const decision = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision({
        telemetry: {
          ...networkDecision().telemetry,
          candidateCount: 4,
          totalCandidateCount: 4,
        },
      }),
      previewDecision: previewDecision(previewRecords),
      fetchLocators: [
        locator("Hydrogen_vehicle", "Hydrogen vehicle", 1),
        locator("Electric_vehicle", "Electric vehicle", 2),
        locator("Battery_electric_vehicle", "Battery electric vehicle", 3),
        locator("Vehicle_efficiency", "Vehicle efficiency", 4),
      ],
      lowLevelTransport: {
        resolve: async () => [{ address: "93.184.216.34", family: 4 }],
        request: async (request) => ({
          statusCode: 200,
          headers: { "content-type": "application/json" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from(
            JSON.stringify({ extract: `Bounded summary text for ${request.pathWithQuery}.` }),
            "utf8",
          ),
        }),
      },
    });

    expect(decision.sourceMaterialRecords.map((record) => record.candidatePreviewId)).toEqual([
      "SOURCE_CANDIDATE_PREVIEW_1_1",
      "SOURCE_CANDIDATE_PREVIEW_1_2",
      "SOURCE_CANDIDATE_PREVIEW_1_3",
      "SOURCE_CANDIDATE_PREVIEW_1_4",
    ]);
  });

  it("keeps dedupe ahead of provider-attempt balancing", async () => {
    const previewRecords = [
      projection("Shared_page", "Shared page", 1, 1),
      projection("Shared_page", "Shared page", 1, 2),
      projection("Distinct_page", "Distinct page", 1, 3),
    ];
    const firstSharedLocator = locator("Shared_page", "Shared page", 1, 1);
    const duplicatedSharedLocator = {
      ...firstSharedLocator,
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_2_1",
    };
    const decision = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
      networkDecision: networkDecision({
        telemetry: {
          ...networkDecision().telemetry,
          candidateCount: 3,
          totalCandidateCount: 3,
        },
      }),
      previewDecision: previewDecision(previewRecords),
      fetchLocators: [
        firstSharedLocator,
        duplicatedSharedLocator,
        locator("Distinct_page", "Distinct page", 1, 3),
      ],
      lowLevelTransport: {
        resolve: async () => [{ address: "93.184.216.34", family: 4 }],
        request: async (request) => ({
          statusCode: 200,
          headers: { "content-type": "application/json" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from(
            JSON.stringify({ extract: `Bounded summary text for ${request.pathWithQuery}.` }),
            "utf8",
          ),
        }),
      },
    });

    expect(decision.sourceMaterialRecords.map((record) => record.candidatePreviewId)).toEqual([
      "SOURCE_CANDIDATE_PREVIEW_1_1",
      "SOURCE_CANDIDATE_PREVIEW_3_1",
    ]);
    expect(decision.attemptedFetchCount).toBe(2);
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
