import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/source-reliability-cache", async () => {
  const actual = await vi.importActual<typeof import("@/lib/source-reliability-cache")>(
    "@/lib/source-reliability-cache",
  );

  return {
    ...actual,
    batchGetCachedData: vi.fn(),
    setCachedScore: vi.fn(),
    setCacheTtlDays: vi.fn(),
  };
});

import {
  clearPrefetchedScores,
  getTrackRecordData,
  getTrackRecordScore,
  prefetchSourceReliability,
} from "@/lib/analyzer/source-reliability";
import { batchGetCachedData, setCachedScore } from "@/lib/source-reliability-cache";

const mockedBatchGetCachedData = vi.mocked(batchGetCachedData);
const mockedSetCachedScore = vi.mocked(setCachedScore);

/** Stub fetch to return a successful evaluation result for any domain. */
function stubFetchEvalSuccess(score = 0.75) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      score,
      confidence: 0.9,
      consensusAchieved: true,
      modelPrimary: "claude-haiku",
      modelSecondary: null,
      reasoning: "test",
      category: "news",
      biasIndicator: null,
      evidenceCited: null,
      evidencePack: null,
      identifiedEntity: null,
      sourceType: "news_primary",
    }),
  }));
}

describe("source-reliability subdomain fallback — cache hit", () => {
  beforeEach(() => {
    clearPrefetchedScores();
    mockedBatchGetCachedData.mockReset();
  });

  it("falls back to the family domain cache entry when an exact host is missing", async () => {
    mockedBatchGetCachedData.mockResolvedValue(
      new Map([
        [
          "wikipedia.org",
          {
            score: 0.42,
            confidence: 0.8,
            consensusAchieved: true,
          },
        ],
      ]),
    );

    await prefetchSourceReliability(["https://fr.wikipedia.org/wiki/Climate_change"]);

    expect(mockedBatchGetCachedData).toHaveBeenCalledWith(["fr.wikipedia.org", "wikipedia.org"]);
    expect(getTrackRecordScore("https://fr.wikipedia.org/wiki/Climate_change")).toBe(0.42);
    expect(getTrackRecordData("https://fr.wikipedia.org/wiki/Climate_change")).toEqual({
      score: 0.42,
      confidence: 0.8,
      consensusAchieved: true,
    });
  });

  it("prefers the exact host cache entry over the family fallback", async () => {
    mockedBatchGetCachedData.mockResolvedValue(
      new Map([
        [
          "fr.wikipedia.org",
          {
            score: 0.61,
            confidence: 0.85,
            consensusAchieved: true,
          },
        ],
        [
          "wikipedia.org",
          {
            score: 0.42,
            confidence: 0.8,
            consensusAchieved: true,
          },
        ],
      ]),
    );

    await prefetchSourceReliability(["https://fr.wikipedia.org/wiki/Climate_change"]);

    expect(getTrackRecordScore("https://fr.wikipedia.org/wiki/Climate_change")).toBe(0.61);
  });
});

describe("source-reliability subdomain fallback — evaluation", () => {
  beforeEach(() => {
    clearPrefetchedScores();
    mockedBatchGetCachedData.mockReset();
    mockedSetCachedScore.mockReset();
    // Default: both subdomain and root domain are cache misses
    mockedBatchGetCachedData.mockResolvedValue(new Map());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("evaluates and caches the ROOT domain when subdomain has no cache entry (fallback=true default)", async () => {
    stubFetchEvalSuccess(0.72);

    await prefetchSourceReliability(["https://en.wikipedia.org/wiki/Test"]);

    // setCachedScore must be called with the root domain, not the subdomain
    expect(mockedSetCachedScore).toHaveBeenCalledOnce();
    expect(mockedSetCachedScore.mock.calls[0][0]).toBe("wikipedia.org");

    // Both the root and the subdomain should resolve to the evaluated score
    expect(getTrackRecordScore("https://en.wikipedia.org/wiki/Test")).toBe(0.72);
    expect(getTrackRecordScore("https://wikipedia.org/wiki/Test")).toBe(0.72);
  });

  it("evaluates the SUBDOMAIN directly when fallback=false", async () => {
    stubFetchEvalSuccess(0.65);

    await prefetchSourceReliability(["https://en.wikipedia.org/wiki/Test"], { fallback: false });

    expect(mockedSetCachedScore).toHaveBeenCalledOnce();
    expect(mockedSetCachedScore.mock.calls[0][0]).toBe("en.wikipedia.org");
  });

  it("deduplicates: two subdomains of the same root trigger only one evaluation", async () => {
    stubFetchEvalSuccess(0.80);

    await prefetchSourceReliability([
      "https://en.wikipedia.org/wiki/A",
      "https://de.wikipedia.org/wiki/B",
    ]);

    // Only one evaluation — for the root domain
    expect(mockedSetCachedScore).toHaveBeenCalledOnce();
    expect(mockedSetCachedScore.mock.calls[0][0]).toBe("wikipedia.org");

    // Both subdomains resolve to the root's score
    expect(getTrackRecordScore("https://en.wikipedia.org/wiki/A")).toBe(0.80);
    expect(getTrackRecordScore("https://de.wikipedia.org/wiki/B")).toBe(0.80);
  });

  it("does not redirect a root domain to itself when it is already the root", async () => {
    stubFetchEvalSuccess(0.55);

    await prefetchSourceReliability(["https://wikipedia.org/wiki/Test"]);

    expect(mockedSetCachedScore).toHaveBeenCalledOnce();
    expect(mockedSetCachedScore.mock.calls[0][0]).toBe("wikipedia.org");
  });
});
