import { describe, expect, it } from "vitest";
import {
  OPENALEX_PROVIDER_ID,
  OPENALEX_WORKS_ENDPOINT_ID,
  buildOpenAlexAbstractSourceMaterialRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/openalex-abstract-source-material";

function diagnostic() {
  return {
    responseStatusCategory: "success_2xx" as const,
    contentTypeCategory: "accepted_json" as const,
    compressedBytes: 320,
    decompressedBytes: 640,
    durationMs: 42,
    timeoutMs: 1500,
  };
}

describe("Analyzer V2 W6-F1 OpenAlex abstract Source Material", () => {
  it("creates one bounded hidden source-material record from abstract_inverted_index", () => {
    const decision = buildOpenAlexAbstractSourceMaterialRecord({
      candidate: {
        id: "https://openalex.org/W123",
        display_name: "Hydrogen vehicle efficiency",
        language: "en",
        abstract_inverted_index: {
          Hydrogen: [0],
          vehicles: [1],
          use: [2],
          electricity: [3],
        },
      },
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_4_1",
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_4_1",
      providerAttemptId: "ATT_4",
      providerRank: 1,
      diagnostic: diagnostic(),
    });
    const serialized = JSON.stringify(decision);

    expect(decision).toMatchObject({
      status: "record_created",
      bodyStatus: "source_material_record_created",
      record: {
        providerId: OPENALEX_PROVIDER_ID,
        sourceMaterialEndpointId: OPENALEX_WORKS_ENDPOINT_ID,
        sourceMaterialKind: "openalex_work_abstract_text",
        sourceMaterialText: "Hydrogen vehicles use electricity",
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
      },
    });
    expect(decision.record?.sourceMaterialTextByteLength).toBeGreaterThan(0);
    expect(serialized).not.toContain("https://openalex.org/W123");
    expect(serialized).not.toContain("abstract_inverted_index");
  });

  it("fails closed for invalid, duplicate, gapped, unsafe, or oversized abstract indexes", () => {
    for (const abstract_inverted_index of [
      null,
      { Hydrogen: [0], duplicate: [0] },
      { Hydrogen: [0], gap: [2] },
      { "https://example.invalid": [0] },
      { x: Array.from({ length: 4097 }, (_, index) => index) },
    ]) {
      expect(buildOpenAlexAbstractSourceMaterialRecord({
        candidate: {
          id: "https://openalex.org/W123",
          display_name: "Hydrogen vehicle efficiency",
          abstract_inverted_index,
        },
        candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_4_1",
        sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_4_1",
        providerAttemptId: "ATT_4",
        providerRank: 1,
        diagnostic: diagnostic(),
      })).toMatchObject({
        status: "failed_structural",
        record: null,
      });
    }
  });
});
