import { describe, expect, it } from "vitest";
import {
  SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
  SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildSourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES,
  SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
  buildSourceMaterialPageSummaryRecord,
  buildSourceMaterialSerperLinkedPageTextRecord,
  buildSourceMaterialSearchPreviewRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";
import type {
  EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport";

function locator() {
  const candidate = {
    key: "Hydrogen_vehicle",
    title: "Hydrogen vehicle",
    excerpt: "Fuel cell vehicles use hydrogen.",
    description: "Public encyclopedia page",
  };
  return buildSourceMaterialPageSummaryFetchLocator({
    projection: buildSourceCandidatePreviewProjection({
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      candidate,
    }),
    candidate,
  });
}

function diagnostic(): EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic {
  return {
    diagnosticVersion: "v2.evidence-lifecycle.source-material.page-summary-transport.x7w3b",
    visibility: "internal_admin_only",
    attemptOrdinal: 1,
    locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
    sourceMaterialRef: null,
    providerId: "wikimedia_core",
    endpointId: "ep_wikimedia_project_page_summary",
    status: "success",
    stopReason: "not_stopped",
    durationMs: 30,
    timeoutMs: 1500,
    dnsAddressCount: 1,
    selectedAddressFamily: "ipv4",
    finalAddressValidation: "matched_validated_public_address",
    responseStatusCategory: "success_2xx",
    contentTypeCategory: "accepted_json",
    compressedBytes: 400,
    decompressedBytes: 800,
    byteCapState: "within_cap",
    truncationApplied: false,
    rawPayloadIncluded: false,
    secretIncluded: false,
    publicPayloadIncluded: false,
    errorTraceIncluded: false,
    cacheRead: false,
    cacheWrite: false,
    storageWrite: false,
    sourceReliabilityTouched: false,
  };
}

describe("Analyzer V2 W3-B page-summary Source Material record builder", () => {
  it("creates one bounded weak Source Material record from provider-owned search preview text", () => {
    const candidate = {
      key: "Hydrogen_vehicle",
      title: "Hydrogen vehicle",
      excerpt: "Fuel cell vehicles use hydrogen.",
      description: "Public encyclopedia page",
    };
    const previewRecord = buildSourceCandidatePreviewProjection({
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      candidate,
    });
    const record = buildSourceMaterialSearchPreviewRecord({
      previewRecord,
      languageCode: "en",
    });
    const serialized = JSON.stringify(record);

    expect(record).toMatchObject({
      status: "record_created",
      bodyStatus: "source_material_record_created",
      record: {
        recordVersion: SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
        sourceMaterialKind: "provider_search_result_preview_text",
        providerId: "wikimedia_core",
        sourceMaterialEndpointId: "ep_wikimedia_core_page_search",
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
      },
    });
    expect(record.record?.sourceMaterialText).toContain("Hydrogen vehicle");
    expect(record.record?.sourceMaterialText).toContain("Fuel cell vehicles use hydrogen.");
    expect(record.record?.sourceMaterialTextByteLength).toBeGreaterThan(0);
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("https://example.invalid");
  });

  it("creates one bounded hidden Source Material record from extract only", () => {
    const record = buildSourceMaterialPageSummaryRecord({
      locator: locator(),
      responseJson: {
        extract: "Hydrogen vehicles store hydrogen and use it to power an electric motor.",
        extract_html: "<p>must not be used</p>",
        content_urls: { desktop: { page: "https://example.invalid/raw" } },
        thumbnail: { source: "https://example.invalid/thumb" },
      },
      diagnostic: diagnostic(),
    });
    const serialized = JSON.stringify(record);

    expect(record).toMatchObject({
      status: "record_created",
      bodyStatus: "source_material_record_created",
      record: {
        recordVersion: SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
        sourceMaterialKind: "wikimedia_page_summary_extract_text",
        sourceMaterialText: "Hydrogen vehicles store hydrogen and use it to power an electric motor.",
        responseStatusCategory: "success_2xx",
        contentTypeCategory: "accepted_json",
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
      },
    });
    expect(record.record?.sourceMaterialTextByteLength).toBeGreaterThan(0);
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("extract_html");
    expect(serialized).not.toContain("content_urls");
    expect(serialized).not.toContain("thumbnail");
    expect(serialized).not.toContain("https://example.invalid");
  });

  it("creates one bounded hidden Source Material record from Serper linked page text", () => {
    const previewRecord = buildSourceCandidatePreviewProjection({
      providerId: "serper_web_search",
      endpointId: "ep_serper_google_search",
      providerAttemptOrdinal: 2,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_SERPER_2_1",
      candidate: {
        title: "Official statistics page",
        snippet: "Current bounded source material.",
        link: "https://official.example.test/statistics",
      },
    });
    const record = buildSourceMaterialSerperLinkedPageTextRecord({
      previewRecord,
      languageCode: "de",
      sourceText: "Official page text states a bounded source-attributed aggregate. https://example.invalid/raw",
      diagnostic: {
        compressedBytes: 900,
        decompressedBytes: 900,
        durationMs: 80,
        timeoutMs: 5000,
        truncationApplied: false,
      },
    });
    const safeRecord = buildSourceMaterialSerperLinkedPageTextRecord({
      previewRecord,
      languageCode: "de",
      sourceText: "Official page text states a bounded source-attributed aggregate without raw locator text.",
      diagnostic: {
        compressedBytes: 900,
        decompressedBytes: 900,
        durationMs: 80,
        timeoutMs: 5000,
        truncationApplied: false,
      },
    });

    expect(record).toMatchObject({
      status: "failed_structural",
      bodyStatus: "source_material_extract_structural_rejected",
      record: null,
    });
    expect(safeRecord).toMatchObject({
      status: "record_created",
      bodyStatus: "source_material_record_created",
      record: {
        recordVersion: SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
        providerId: "serper_web_search",
        sourceMaterialEndpointId: "ep_serper_linked_page_fetch",
        sourceMaterialKind: "provider_search_result_page_text_bounded",
        responseStatusCategory: "success_2xx",
        contentTypeCategory: "accepted_text",
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
      },
    });
    expect(safeRecord.record?.sourceMaterialText).toContain("source-attributed aggregate");
    expect(JSON.stringify(safeRecord)).not.toContain("https://official.example.test");
  });

  it("fails closed for missing, blank, unsafe, oversized, or non-object extract payloads", () => {
    for (const [responseJson, bodyStatus] of [
      [{}, "source_material_extract_missing"],
      [{ extract: "   \n\t" }, "source_material_extract_blank"],
      [{ extract: "https://example.invalid/source?secret=sk_test" }, "source_material_extract_structural_rejected"],
      [{ extract: "x".repeat(SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES + 1) }, "source_material_extract_oversize"],
      ["raw payload", "source_material_json_not_record"],
    ] as const) {
      expect(buildSourceMaterialPageSummaryRecord({
        locator: locator(),
        responseJson,
        diagnostic: diagnostic(),
      })).toMatchObject({
        status: "failed_structural",
        bodyStatus,
        record: null,
      });
    }
  });
});
