import { describe, expect, it } from "vitest";
import {
  SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
  SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
  SOURCE_CANDIDATE_PREVIEW_VERSION,
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  OPENALEX_PROVIDER_ID,
  OPENALEX_WORKS_ENDPOINT_ID,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/openalex-abstract-source-material";

describe("Analyzer V2 W3-A source-candidate preview projection", () => {
  it("materializes only bounded preview fields from provider-owned Wikimedia candidates", () => {
    const preview = buildSourceCandidatePreviewProjection({
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      candidate: {
        key: "Switzerland_asylum_statistics",
        id: 12345,
        title: "Asylum statistics in Switzerland",
        excerpt: "Mehr als <span class=\"searchmatch\">235 000</span> Personen",
        description: "Public encyclopedia page",
        url: "https://example.invalid/raw?secret=sk_test",
      },
    });
    const serialized = JSON.stringify(preview);

    expect(preview).toMatchObject({
      previewVersion: SOURCE_CANDIDATE_PREVIEW_VERSION,
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      titlePreviewText: "Asylum statistics in Switzerland",
      excerptPreviewText: "Mehr als 235 000 Personen",
      descriptionPreviewText: "Public encyclopedia page",
      materializationStatus: "source_candidate_preview_materialized",
      stopReason: "not_stopped",
    });
    expect(preview.locatorRef).toMatch(/^OPAQUE_SOURCE_LOCATOR_1_1_[A-F0-9]{12}$/);
    expect(preview.pageKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.pageIdHash).toMatch(/^[a-f0-9]{64}$/);
    expect(serialized).not.toContain("Switzerland_asylum_statistics");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("url");
  });

  it("materializes bounded OpenAlex previews without exposing raw work identifiers", () => {
    const preview = buildSourceCandidatePreviewProjection({
      providerId: OPENALEX_PROVIDER_ID,
      endpointId: OPENALEX_WORKS_ENDPOINT_ID,
      providerAttemptOrdinal: 4,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_4_1",
      candidate: {
        id: "https://openalex.org/W123",
        display_name: "Hydrogen vehicle efficiency",
        abstract_inverted_index: { Hydrogen: [0] },
      },
    });
    const serialized = JSON.stringify(preview);

    expect(preview).toMatchObject({
      providerId: OPENALEX_PROVIDER_ID,
      endpointId: OPENALEX_WORKS_ENDPOINT_ID,
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_4_1",
      titlePreviewText: "Hydrogen vehicle efficiency",
      materializationStatus: "source_candidate_preview_materialized",
      stopReason: "not_stopped",
    });
    expect(preview.locatorRef).toMatch(/^OPAQUE_OPENALEX_WORK_4_1_[A-F0-9]{12}$/);
    expect(preview.pageKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(serialized).not.toContain("https://openalex.org/W123");
    expect(serialized).not.toContain("abstract_inverted_index");
  });

  it("blocks provider mismatches, non-record inputs, and invalid locators", () => {
    expect(buildSourceCandidatePreviewProjection({
      providerId: "other_provider",
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      candidate: { key: "Safe_Key" },
    })).toMatchObject({
      materializationStatus: "blocked_provider_mismatch",
      pageKeyHash: null,
      locatorRef: null,
    });

    expect(buildSourceCandidatePreviewProjection({
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      candidate: "public payload",
    })).toMatchObject({
      materializationStatus: "blocked_public_or_artifact_input",
      pageKeyHash: null,
      locatorRef: null,
    });

    expect(buildSourceCandidatePreviewProjection({
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      candidate: { key: "https://example.invalid/key", title: "Title" },
    })).toMatchObject({
      materializationStatus: "blocked_invalid_locator",
      pageKeyHash: null,
      titlePreviewText: null,
    });
  });
});
