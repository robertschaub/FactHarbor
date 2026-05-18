import { describe, expect, it } from "vitest";
import {
  SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
  SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
  SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION,
  buildSourceMaterialPageSummaryFetchLocator,
  normalizeWikimediaPageSummaryLanguageCode,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";

function projection(candidate: Record<string, unknown>) {
  return buildSourceCandidatePreviewProjection({
    providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
    endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
    providerAttemptOrdinal: 1,
    providerRank: 1,
    candidateOrdinal: 1,
    sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
    candidate,
  });
}

describe("Analyzer V2 W3-B page-summary fetch locator", () => {
  it("creates an eligible runtime-only locator from a materialized provider-owned Wikimedia candidate", () => {
    const locator = buildSourceMaterialPageSummaryFetchLocator({
      projection: projection({
        key: "Switzerland_asylum_statistics",
        title: "Asylum statistics in Switzerland",
        excerpt: "Mehr als 235 000 Personen",
        description: "Public encyclopedia page",
        url: "https://example.invalid/poison?secret=sk_test",
      }),
      candidate: {
        key: "Switzerland_asylum_statistics",
        title: "Asylum statistics in Switzerland",
        url: "https://example.invalid/poison?secret=sk_test",
      },
      languageCode: "en",
    });
    const serialized = JSON.stringify(locator);

    expect(locator).toMatchObject({
      locatorVersion: SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION,
      providerId: "wikimedia_core",
      searchEndpointId: "ep_wikimedia_core_page_search",
      sourceMaterialEndpointId: SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      projectId: "wikipedia",
      languageCode: "en",
      encodedTitlePathSegment: "Switzerland_asylum_statistics",
      materializationStatus: "source_candidate_preview_materialized",
      eligibility: "eligible_for_w3b_fetch",
    });
    expect(locator.locatorRef).toMatch(/^OPAQUE_SOURCE_LOCATOR_1_1_[A-F0-9]{12}$/);
    expect(locator.pageKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(serialized).not.toContain("Asylum statistics in Switzerland");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("url");
  });

  it("rejects partial previews, copied artifacts, provider mismatches, and unsafe language labels", () => {
    const partial = buildSourceMaterialPageSummaryFetchLocator({
      projection: projection({ key: "Valid_Key", title: "Valid", excerpt: "", description: "" }),
      candidate: { key: "Valid_Key" },
    });
    const copiedArtifact = buildSourceMaterialPageSummaryFetchLocator({
      projection: projection({ key: "Valid_Key", title: "Valid title" }),
      candidate: { pageKeyHash: "a".repeat(64), locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_FAKE" },
    });
    const providerMismatch = buildSourceMaterialPageSummaryFetchLocator({
      projection: {
        ...projection({ key: "Valid_Key", title: "Valid title" }),
        providerId: "other_provider" as never,
      },
      candidate: { key: "Valid_Key" },
    });
    const languageMismatch = buildSourceMaterialPageSummaryFetchLocator({
      projection: projection({ key: "Valid_Key", title: "Valid title" }),
      candidate: { key: "Valid_Key" },
      languageCode: "en.wikipedia",
    });

    expect(partial).toMatchObject({
      eligibility: "blocked_preview_not_materialized",
      encodedTitlePathSegment: null,
    });
    expect(copiedArtifact).toMatchObject({
      eligibility: "blocked_locator_invalid",
      encodedTitlePathSegment: null,
    });
    expect(providerMismatch).toMatchObject({
      eligibility: "blocked_provider_mismatch",
      encodedTitlePathSegment: null,
    });
    expect(languageMismatch).toMatchObject({
      eligibility: "blocked_language_invalid",
      encodedTitlePathSegment: null,
    });
    for (const value of ["en", "de", "pt-br", "simple"]) {
      expect(normalizeWikimediaPageSummaryLanguageCode(value)).toBe(value);
    }
    for (const value of ["EN", " en", "en ", "en.wikipedia", "en_us", "-en", "en-", "en/evil"]) {
      expect(normalizeWikimediaPageSummaryLanguageCode(value)).toBeNull();
    }
  });

  it("rejects unsafe path materialization before title encoding", () => {
    for (const key of [
      "https://example.invalid/page",
      "Page/With/Slash",
      "Page?query",
      "Page#fragment",
      "Page..Traversal",
      "Secret_sk_test",
    ]) {
      expect(buildSourceMaterialPageSummaryFetchLocator({
        projection: projection({ key, title: "Valid title" }),
        candidate: { key },
      })).toMatchObject({
        eligibility: "blocked_preview_not_materialized",
        encodedTitlePathSegment: null,
      });
    }
  });
});
