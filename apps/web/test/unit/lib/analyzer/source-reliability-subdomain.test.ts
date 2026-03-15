import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { batchGetCachedData } from "@/lib/source-reliability-cache";

const mockedBatchGetCachedData = vi.mocked(batchGetCachedData);

describe("source-reliability subdomain fallback", () => {
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
