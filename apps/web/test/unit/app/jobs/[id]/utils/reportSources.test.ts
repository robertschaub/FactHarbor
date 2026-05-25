import { describe, expect, it } from "vitest";
import { normalizeDynamicCitationSources, normalizeReportSources } from "@/app/jobs/[id]/utils/reportSources";

describe("report source normalization", () => {
  it("keeps current array-shaped sources", () => {
    const sources = [{ url: "https://example.test/a", title: "A" }];

    expect(normalizeReportSources(sources)).toEqual([
      {
        url: "https://example.test/a",
        title: "A",
        category: "",
        trackRecordScore: null,
      },
    ]);
  });

  it("unwraps legacy item-shaped sources", () => {
    const source = { url: "https://example.test/legacy", title: "Legacy" };

    expect(normalizeReportSources({ items: [source] })).toEqual([
      {
        url: "https://example.test/legacy",
        title: "Legacy",
        category: "",
        trackRecordScore: null,
      },
    ]);
  });

  it("returns an empty array for unsupported source containers", () => {
    expect(normalizeReportSources({ total: 1 })).toEqual([]);
    expect(normalizeReportSources(null)).toEqual([]);
  });

  it("normalizes dynamic citation containers to source records", () => {
    expect(
      normalizeDynamicCitationSources({
        items: [
          {
            url: "https://example.test/citation",
            title: "Citation",
            sourceType: "news_primary",
            trackRecordScore: 0.75,
          },
        ],
      }),
    ).toEqual([
      {
        url: "https://example.test/citation",
        title: "Citation",
        fetchSuccess: true,
        trackRecordScore: 0.75,
        trackRecordConfidence: undefined,
        trackRecordConsensus: undefined,
        excerpt: undefined,
        category: "news_primary",
      },
    ]);
  });
});
