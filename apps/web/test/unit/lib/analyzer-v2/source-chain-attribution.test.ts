import { describe, expect, it } from "vitest";
import {
  buildSourceChainAttributionSnapshot,
  SOURCE_CHAIN_ATTRIBUTION_VERSION,
} from "@/lib/analyzer-v2/source-chain-attribution";

describe("Analyzer V2 source-chain attribution", () => {
  it("projects structural source-chain counts, hashes, and lengths without raw material", () => {
    const snapshot = buildSourceChainAttributionSnapshot({
      runId: "job-hj73",
      createdUtc: "2026-05-23T12:00:00.000Z",
      publicCutoverStatus: "blocked_precutover",
      claimUnderstandingStatus: "accepted",
      selectedAtomicClaimCount: 1,
      queryPlanningInspection: {
        status: "inspected",
        summary: {
          runtimeStatus: "completed",
          resultStatus: "accepted",
          queryEntryCount: 2,
          rawQueryText: "raw query text must not be serialized",
          promptText: "prompt text must not be serialized",
        },
      },
      candidateProviderNetwork: {
        status: "candidate_provider_network_completed",
        telemetry: {
          providerAttemptCount: 2,
          candidateCount: 3,
          totalCandidateCount: 4,
          totalBytes: 4096,
          providerPayload: "provider payload must not be serialized",
        },
      },
      sourceCandidatePreview: {
        status: "source_candidate_preview_completed",
        previewRecordCount: 3,
        previewRecords: [
          {
            titlePreviewText: "title must not be serialized",
            excerptPreviewText: "snippet must not be serialized",
            url: "https://example.invalid/not-serialized",
          },
        ],
      },
      sourceMaterialPageSummary: {
        status: "source_material_page_summary_completed",
        sourceMaterialRecordCount: 2,
        materializedPreviewRecordCount: 2,
        attemptedFetchCount: 2,
        fetchDiagnosticCount: 1,
        sourceMaterialRecords: [
          {
            sourceMaterialId: "SOURCE_MATERIAL_A",
            providerId: "provider_a",
            sourceMaterialKind: "provider_search_result_page_text_bounded",
            sourceMaterialText: "source text must not be serialized",
            sourceMaterialTextHash: "hash-a",
            sourceMaterialTextByteLength: 100,
            sourceMaterialTextCharLength: 90,
            truncationApplied: false,
            pageKey: "page key must not be serialized",
          },
          {
            sourceMaterialId: "SOURCE_MATERIAL_B",
            providerId: "provider_a",
            sourceMaterialKind: "provider_search_result_preview_text",
            sourceMaterialText: "source summary must not be serialized",
            sourceMaterialTextHash: "hash-b",
            sourceMaterialTextByteLength: 75,
            sourceMaterialTextCharLength: 70,
            truncationApplied: true,
          },
        ],
      },
      boundedTextAuthorization: {
        status: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
        boundedTextSidecarCount: 2,
        boundedTextSidecars: [
          {
            text: "bounded sidecar text must not be serialized",
            textHash: "hash-a",
            textByteLength: 100,
          },
        ],
      },
      extractionInputAuthorization: {
        status: "bounded_extraction_input_packet_created_extraction_execution_closed",
        extractionInputPacketCount: 1,
        extractionInputPacket: {
          inputText: "input text must not be serialized",
          sourceContentPackets: [
            { contentText: "source content text must not be serialized" },
            { contentText: "second source content text must not be serialized" },
          ],
        },
      },
      executionReadinessDenial: {
        status: "extraction_execution_pre_call_gate_open",
      },
      boundedEvidenceExtraction: {
        status: "hidden_evidence_item_extraction_completed",
        extractionStatus: "evidence_extracted",
        evidenceItemCount: 2,
        parent: {
          sourceContentPackets: [
            { sourceRecordId: "SOURCE_MATERIAL_A", contentPacketId: "PACKET_A", providerId: "provider_a" },
            { sourceRecordId: "SOURCE_MATERIAL_B", contentPacketId: "PACKET_B", providerId: "provider_a" },
          ],
          parentPacketByteLength: 175,
        },
        extractionResult: {
          evidenceItems: [
            { statement: "model output statement must not be serialized" },
          ],
        },
      },
      internalReportWriter: {
        status: "internal_report_writer_draft_created",
        reportMarkdown: "report markdown must not be serialized",
        reportMarkdownHash: "report-hash",
        reportMarkdownByteLength: 250,
        citedEvidenceItemRefCount: 2,
        hiddenLedgerId: "hidden-ledger-id-must-not-be-serialized",
        stackTrace: "stack trace must not be serialized",
      },
    });

    expect(snapshot).toMatchObject({
      version: SOURCE_CHAIN_ATTRIBUTION_VERSION,
      visibility: "internal_admin_only",
      defaultProjection: "redacted_hash_length_provenance_only",
      runId: "job-hj73",
      stages: {
        queryPlanning: {
          status: "inspected",
          resultStatus: "accepted",
          queryEntryCount: 2,
        },
        candidateProviderNetwork: {
          providerAttemptCount: 2,
          totalCandidateCount: 4,
          totalBytes: 4096,
        },
        sourceMaterial: {
          recordCount: 2,
          totalBoundedTextBytes: 175,
          truncationCount: 1,
          sourceMaterialKindCounts: {
            provider_search_result_page_text_bounded: 1,
            provider_search_result_preview_text: 1,
          },
          providerIdCounts: {
            provider_a: 2,
          },
        },
        w4: {
          boundedTextSidecarCount: 2,
          extractionInputPacketCount: 1,
        },
        w5: {
          evidenceItemCount: 2,
          sourceContentPacketCount: 2,
          parentPacketByteLength: 175,
        },
        reportWriter: {
          status: "internal_report_writer_draft_created",
          reportMarkdownHash: "report-hash",
          reportMarkdownByteLength: 250,
        },
      },
      sourceMaterialRefs: [
        expect.objectContaining({
          ordinal: 1,
          sourceMaterialRef: "SOURCE_MATERIAL_A",
          textHash: "hash-a",
          textByteLength: 100,
        }),
        expect.objectContaining({
          ordinal: 2,
          sourceMaterialRef: "SOURCE_MATERIAL_B",
          textHash: "hash-b",
          truncationApplied: true,
        }),
      ],
      lossPointCandidate: "unknown",
    });
    expect(snapshot.redaction).toEqual({
      sourceTextReturned: false,
      snippetsReturned: false,
      summariesReturned: false,
      titlesReturned: false,
      urlsReturned: false,
      pageKeysReturned: false,
      providerPayloadsReturned: false,
      rawQueryTextReturned: false,
      promptTextReturned: false,
      hiddenLedgerIdsReturned: false,
      stackTracesReturned: false,
      modelOutputReturned: false,
    });

    const serialized = JSON.stringify(snapshot);
    for (const forbidden of [
      "raw query text",
      "prompt text",
      "provider payload",
      "title must not",
      "snippet must not",
      "https://example.invalid",
      "page key must not",
      "source text must not",
      "source summary must not",
      "bounded sidecar text",
      "input text must not",
      "source content text",
      "model output statement",
      "report markdown must not",
      "hidden-ledger-id",
      "stack trace",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("classifies structural loss points without semantic source ranking", () => {
    const snapshot = buildSourceChainAttributionSnapshot({
      runId: "job-hj73-loss",
      createdUtc: "2026-05-23T12:00:00.000Z",
      publicCutoverStatus: "blocked_precutover",
      claimUnderstandingStatus: "accepted",
      selectedAtomicClaimCount: 1,
      queryPlanningInspection: {
        status: "inspected",
        summary: {
          resultStatus: "accepted",
          queryEntryCount: 1,
        },
      },
      candidateProviderNetwork: {
        status: "candidate_provider_network_completed",
        telemetry: {
          totalCandidateCount: 2,
        },
      },
      sourceMaterialPageSummary: {
        status: "source_material_page_summary_completed",
        sourceMaterialRecordCount: 0,
        sourceMaterialRecords: [],
      },
    });

    expect(snapshot.lossPointCandidate).toBe("source_material");
  });
});
