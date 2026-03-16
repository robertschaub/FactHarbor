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

const NULL_EVAL_RESPONSE = {
  score: null,
  confidence: 0.5,
  consensusAchieved: false,
  modelPrimary: "claude-haiku",
  modelSecondary: null,
  reasoning: "no consensus",
  category: "unknown",
  biasIndicator: null,
  evidenceCited: null,
  evidencePack: null,
  identifiedEntity: null,
  sourceType: null,
};

const makeEvalResponse = (score: number) => ({
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
});

/** Stub fetch to always return a valid score. */
function stubFetchEvalSuccess(score = 0.75) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => makeEvalResponse(score),
  }));
}

/**
 * Stub fetch so the first `nullCount` calls return null score,
 * then all subsequent calls return the given valid score.
 */
function stubFetchNullThenSuccess(nullCount: number, score = 0.72) {
  let calls = 0;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
    calls++;
    return {
      ok: true,
      json: async () => calls <= nullCount ? NULL_EVAL_RESPONSE : makeEvalResponse(score),
    };
  }));
}

// ============================================================================
// Cache-hit scenarios (no evaluation needed)
// ============================================================================

describe("source-reliability subdomain fallback — cache hit", () => {
  beforeEach(() => {
    clearPrefetchedScores();
    mockedBatchGetCachedData.mockReset();
  });

  it("falls back to the family domain cache entry when the exact host is missing", async () => {
    mockedBatchGetCachedData.mockResolvedValue(
      new Map([
        [
          "wikipedia.org",
          { score: 0.42, confidence: 0.8, consensusAchieved: true },
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
        ["fr.wikipedia.org", { score: 0.61, confidence: 0.85, consensusAchieved: true }],
        ["wikipedia.org",    { score: 0.42, confidence: 0.8,  consensusAchieved: true }],
      ]),
    );

    await prefetchSourceReliability(["https://fr.wikipedia.org/wiki/Climate_change"]);

    expect(getTrackRecordScore("https://fr.wikipedia.org/wiki/Climate_change")).toBe(0.61);
  });
});

// ============================================================================
// Evaluation scenarios (cache misses)
// ============================================================================

describe("source-reliability subdomain fallback — evaluation", () => {
  beforeEach(() => {
    clearPrefetchedScores();
    mockedBatchGetCachedData.mockReset();
    mockedSetCachedScore.mockReset();
    // Default: all lookups are cache misses
    mockedBatchGetCachedData.mockResolvedValue(new Map());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("evaluates subdomain first; when subdomain returns null, also evaluates and caches root domain", async () => {
    // First fetch call (en.wikipedia.org) → null score; second call (wikipedia.org) → 0.72
    stubFetchNullThenSuccess(1, 0.72);

    await prefetchSourceReliability(["https://en.wikipedia.org/wiki/Test"]);

    // Both domains must be stored in cache
    expect(mockedSetCachedScore).toHaveBeenCalledTimes(2);
    const storedDomains = mockedSetCachedScore.mock.calls.map(c => c[0]);
    expect(storedDomains).toContain("en.wikipedia.org"); // null-score entry
    expect(storedDomains).toContain("wikipedia.org");    // valid-score entry

    // Sync lookup for the subdomain URL returns the root domain's score
    expect(getTrackRecordScore("https://en.wikipedia.org/wiki/Test")).toBe(0.72);
    expect(getTrackRecordScore("https://wikipedia.org/wiki/Test")).toBe(0.72);
  });

  it("does NOT evaluate root domain when the subdomain itself returns a valid score", async () => {
    stubFetchEvalSuccess(0.65);

    await prefetchSourceReliability(["https://en.wikipedia.org/wiki/Test"]);

    // Only the subdomain is cached; no root evaluation needed
    expect(mockedSetCachedScore).toHaveBeenCalledOnce();
    expect(mockedSetCachedScore.mock.calls[0][0]).toBe("en.wikipedia.org");

    expect(getTrackRecordScore("https://en.wikipedia.org/wiki/Test")).toBe(0.65);
  });

  it("evaluates the subdomain directly (no root fallback) when fallback=false", async () => {
    stubFetchEvalSuccess(0.65);

    await prefetchSourceReliability(["https://en.wikipedia.org/wiki/Test"], { fallback: false });

    expect(mockedSetCachedScore).toHaveBeenCalledOnce();
    expect(mockedSetCachedScore.mock.calls[0][0]).toBe("en.wikipedia.org");
  });

  it("deduplicates: two null-score subdomains of the same root trigger only one root evaluation", async () => {
    // First 2 calls (en, de subdomains) → null; 3rd call (wikipedia.org) → 0.80
    stubFetchNullThenSuccess(2, 0.80);

    await prefetchSourceReliability([
      "https://en.wikipedia.org/wiki/A",
      "https://de.wikipedia.org/wiki/B",
    ]);

    // 3 cache writes: en.wikipedia.org (null), de.wikipedia.org (null), wikipedia.org (0.80)
    expect(mockedSetCachedScore).toHaveBeenCalledTimes(3);
    const storedDomains = mockedSetCachedScore.mock.calls.map(c => c[0]);
    expect(storedDomains).toContain("en.wikipedia.org");
    expect(storedDomains).toContain("de.wikipedia.org");
    expect(storedDomains).toContain("wikipedia.org");

    // Both subdomains resolve to root's score
    expect(getTrackRecordScore("https://en.wikipedia.org/wiki/A")).toBe(0.80);
    expect(getTrackRecordScore("https://de.wikipedia.org/wiki/B")).toBe(0.80);
  });

  it("does not trigger root fallback when domain is already the root", async () => {
    stubFetchEvalSuccess(0.55);

    await prefetchSourceReliability(["https://wikipedia.org/wiki/Test"]);

    expect(mockedSetCachedScore).toHaveBeenCalledOnce();
    expect(mockedSetCachedScore.mock.calls[0][0]).toBe("wikipedia.org");
  });
});
