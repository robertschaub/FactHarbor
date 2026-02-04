/**
 * Source Reliability Integration Tests
 * 
 * Tests the full integration flow:
 * 1. Prefetch phase (async batch operation)
 * 2. Lookup phase (sync retrieval)
 * 3. Evidence weighting (verdict adjustment)
 * 
 * These tests verify that Source Reliability correctly affects
 * the analysis pipeline and verdict calculations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  prefetchSourceReliability,
  getTrackRecordScore,
  clearPrefetchedScores,
  applyEvidenceWeighting,
  extractDomain,
  isImportantSource,
  normalizeTrackRecordScore,
  SR_CONFIG,
} from "@/lib/analyzer/source-reliability";
import type { ClaimVerdict, EvidenceItem, FetchedSource } from "@/lib/analyzer/types";

// Mock the cache module to avoid SQLite in tests
vi.mock("@/lib/source-reliability-cache", () => ({
  batchGetCachedData: vi.fn(),
  setCachedScore: vi.fn(),
}));

// Mock fetch for internal API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

const makeEvidenceItem = (id: string, sourceId: string): EvidenceItem => ({
  id,
  statement: `Evidence statement for ${id}`,
  category: "evidence",
  specificity: "high",
  sourceId,
  sourceUrl: "https://example.com",
  sourceTitle: "Example Source",
  sourceExcerpt: "Example excerpt",
});

describe("Source Reliability Integration", () => {
  beforeEach(() => {
    clearPrefetchedScores();
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    clearPrefetchedScores();
  });

  describe("End-to-End Pipeline Flow", () => {
    it("prefetch → lookup → weighting produces correct verdict adjustment", async () => {
      // Mock cache returns some scores (batchGetCachedData returns full data objects)
      const { batchGetCachedData } = await import("@/lib/source-reliability-cache");
      (batchGetCachedData as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([
          ["reuters.com", { score: 0.95, confidence: 0.9, consensusAchieved: true }],
          ["bbc.com", { score: 0.88, confidence: 0.85, consensusAchieved: true }],
        ])
      );

      // Step 1: Prefetch
      const urls = [
        "https://www.reuters.com/article/123",
        "https://bbc.com/news/456",
      ];
      await prefetchSourceReliability(urls);

      // Step 2: Lookup (should be instant, no async)
      const reutersScore = getTrackRecordScore("https://reuters.com/different-article");
      const bbcScore = getTrackRecordScore("https://www.bbc.com/another");

      expect(reutersScore).toBe(0.95);
      expect(bbcScore).toBe(0.88);

      // Step 3: Create mock data for evidence weighting
      const sources: FetchedSource[] = [
        {
          id: "src-1",
          url: "https://reuters.com/article/123",
          title: "Reuters Article",
          trackRecordScore: reutersScore,
          fullText: "Article content...",
          fetchedAt: new Date().toISOString(),
          category: "news",
          fetchSuccess: true,
        },
        {
          id: "src-2",
          url: "https://bbc.com/news/456",
          title: "BBC Article",
          trackRecordScore: bbcScore,
          fullText: "BBC content...",
          fetchedAt: new Date().toISOString(),
          category: "news",
          fetchSuccess: true,
        },
      ];

      const evidenceItems: EvidenceItem[] = [
        makeEvidenceItem("E1", "src-1"),
        makeEvidenceItem("E2", "src-2"),
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Test claim",
          truthPercentage: 80,
          confidence: 75,
          verdict: 80,
          highlightColor: "green",
          supportingEvidenceIds: ["E1", "E2"],
          reasoning: "Based on evidence",
          claimRole: "central",
          isCentral: true,
          centrality: "high",
        },
      ];

      // Step 4: Apply evidence weighting
      const weighted = applyEvidenceWeighting(verdicts, evidenceItems, sources);

      // Verify weighting was applied
      expect(weighted[0].evidenceWeight).toBeDefined();
      // Average score: (0.95 + 0.88) / 2 = 0.915
      expect(weighted[0].evidenceWeight).toBeCloseTo(0.915, 2);

      // Truth should be adjusted: 50 + (80-50) * 0.915 = 50 + 27.45 = 77.45 ≈ 77
      expect(weighted[0].truthPercentage).toBeCloseTo(77, 0);
    });

    it("handles unknown sources gracefully (null scores)", async () => {
      const { batchGetCachedData } = await import("@/lib/source-reliability-cache");
      (batchGetCachedData as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map() // Empty cache
      );

      // Mock the internal API to fail (simulating rate limit or error)
      mockFetch.mockRejectedValue(new Error("API error"));

      const urls = ["https://unknown-source.xyz/article"];
      await prefetchSourceReliability(urls);

      // Lookup should return null for unknown source
      const score = getTrackRecordScore("https://unknown-source.xyz/article");
      expect(score).toBeNull();

      // Evidence weighting should leave verdict unchanged when no scores
      const sources: FetchedSource[] = [
        {
          id: "src-1",
          url: "https://unknown-source.xyz/article",
          title: "Unknown Article",
          trackRecordScore: null,
          fullText: "Content...",
          fetchedAt: new Date().toISOString(),
          category: "unknown",
          fetchSuccess: true,
        },
      ];

      const evidenceItems: EvidenceItem[] = [makeEvidenceItem("E1", "src-1")];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Test claim",
          truthPercentage: 80,
          confidence: 75,
          verdict: 80,
          highlightColor: "green",
          supportingEvidenceIds: ["E1"],
          reasoning: "Based on evidence",
          claimRole: "central",
          isCentral: false,
          centrality: "medium",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, evidenceItems, sources);

      // Unknown sources use DEFAULT_UNKNOWN_SOURCE_SCORE (0.5) which pulls verdict toward neutral
      // Formula: adjustedTruth = 50 + (80 - 50) * 0.5 = 50 + 15 = 65
      expect(weighted[0].truthPercentage).toBe(65);
      expect(weighted[0].evidenceWeight).toBe(0.5);
      expect(weighted[0].sourceReliabilityMeta?.unknownSources).toBe(1);
    });

    it("skips blog platforms during prefetch (importance filter)", async () => {
      const { batchGetCachedData, setCachedScore } = await import("@/lib/source-reliability-cache");
      (batchGetCachedData as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());

      const urls = [
        "https://myblog.blogspot.com/post",
        "https://personal.medium.com/article",
        "https://reuters.com/real-news",
      ];

      // Only reuters.com should trigger evaluation (others are filtered)
      expect(isImportantSource("myblog.blogspot.com")).toBe(false);
      expect(isImportantSource("personal.medium.com")).toBe(false);
      expect(isImportantSource("reuters.com")).toBe(true);
    });
  });

  describe("Mixed Source Reliability Scenarios", () => {
    it("high reliability sources strengthen verdicts", async () => {
      const { batchGetCachedData } = await import("@/lib/source-reliability-cache");
      (batchGetCachedData as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([["factcheck.org", { score: 0.98, confidence: 0.95, consensusAchieved: true }]])
      );

      await prefetchSourceReliability(["https://factcheck.org/check/123"]);

      const sources: FetchedSource[] = [
        {
          id: "src-1",
          url: "https://factcheck.org/check/123",
          title: "Fact Check",
          trackRecordScore: 0.98,
          fullText: "...",
          fetchedAt: new Date().toISOString(),
          category: "factcheck",
          fetchSuccess: true,
        },
      ];

      const evidenceItems: EvidenceItem[] = [makeEvidenceItem("E1", "src-1")];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Verified claim",
          truthPercentage: 85, // Strong true
          confidence: 80,
          verdict: 85,
          highlightColor: "green",
          supportingEvidenceIds: ["E1"],
          reasoning: "High quality source",
          claimRole: "central",
          isCentral: true,
          centrality: "high",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, evidenceItems, sources);

      // With 0.98 reliability: 50 + (85-50) * 0.98 = 50 + 34.3 = 84.3 ≈ 84
      expect(weighted[0].truthPercentage).toBeCloseTo(84, 0);
      expect(weighted[0].evidenceWeight).toBe(0.98);
    });

    it("low reliability sources pull verdicts toward neutral", async () => {
      const { batchGetCachedData } = await import("@/lib/source-reliability-cache");
      (batchGetCachedData as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([["conspiracy-site.xyz", { score: 0.15, confidence: 0.8, consensusAchieved: true }]])
      );

      await prefetchSourceReliability(["https://conspiracy-site.xyz/article"]);

      const sources: FetchedSource[] = [
        {
          id: "src-1",
          url: "https://conspiracy-site.xyz/article",
          title: "Dubious Article",
          trackRecordScore: 0.15,
          fullText: "...",
          fetchedAt: new Date().toISOString(),
          category: "unknown",
          fetchSuccess: true,
        },
      ];

      const evidenceItems: EvidenceItem[] = [makeEvidenceItem("E1", "src-1")];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Dubious claim",
          truthPercentage: 90, // Would be "True" but from unreliable source
          confidence: 70,
          verdict: 90,
          highlightColor: "green",
          supportingEvidenceIds: ["E1"],
          reasoning: "Single unreliable source",
          claimRole: "supporting",
          isCentral: false,
          centrality: "low",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, evidenceItems, sources);

      // With 0.15 reliability: 50 + (90-50) * 0.15 = 50 + 6 = 56
      expect(weighted[0].truthPercentage).toBe(56);
      expect(weighted[0].evidenceWeight).toBe(0.15);
    });

    it("mixed reliability sources average correctly", async () => {
      const { batchGetCachedData } = await import("@/lib/source-reliability-cache");
      (batchGetCachedData as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([
          ["good-source.com", { score: 0.85, confidence: 0.9, consensusAchieved: true }],
          ["bad-source.net", { score: 0.25, confidence: 0.8, consensusAchieved: true }],
        ])
      );

      await prefetchSourceReliability([
        "https://good-source.com/article",
        "https://bad-source.net/post",
      ]);

      const sources: FetchedSource[] = [
        {
          id: "src-1",
          url: "https://good-source.com/article",
          title: "Good Article",
          trackRecordScore: 0.85,
          fullText: "...",
          fetchedAt: new Date().toISOString(),
          category: "news",
          fetchSuccess: true,
        },
        {
          id: "src-2",
          url: "https://bad-source.net/post",
          title: "Bad Article",
          trackRecordScore: 0.25,
          fullText: "...",
          fetchedAt: new Date().toISOString(),
          category: "blog",
          fetchSuccess: true,
        },
      ];

      const evidenceItems: EvidenceItem[] = [
        makeEvidenceItem("E1", "src-1"),
        makeEvidenceItem("E2", "src-2"),
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Mixed source claim",
          truthPercentage: 75,
          confidence: 70,
          verdict: 75,
          highlightColor: "yellow",
          supportingEvidenceIds: ["E1", "E2"],
          reasoning: "Mixed sources",
          claimRole: "central",
          isCentral: true,
          centrality: "medium",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, evidenceItems, sources);

      // Average score: (0.85 + 0.25) / 2 = 0.55
      expect(weighted[0].evidenceWeight).toBe(0.55);
      // Truth: 50 + (75-50) * 0.55 = 50 + 13.75 = 63.75 ≈ 64
      expect(weighted[0].truthPercentage).toBeCloseTo(64, 0);
    });
  });

  describe("Cache Integration", () => {
    it("uses cached scores without re-evaluation", async () => {
      const { batchGetCachedData, setCachedScore } = await import("@/lib/source-reliability-cache");

      // Simulate cache hit
      (batchGetCachedData as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([["cached-source.com", { score: 0.72, confidence: 0.85, consensusAchieved: true }]])
      );

      await prefetchSourceReliability(["https://cached-source.com/article"]);

      // Verify no API call was made (cache hit)
      expect(mockFetch).not.toHaveBeenCalled();

      // Score should be available
      const score = getTrackRecordScore("https://cached-source.com/article");
      expect(score).toBe(0.72);
    });

    it("batch lookup is efficient for multiple URLs", async () => {
      const { batchGetCachedData } = await import("@/lib/source-reliability-cache");

      const cachedData = new Map([
        ["source1.com", { score: 0.8, confidence: 0.9, consensusAchieved: true }],
        ["source2.com", { score: 0.7, confidence: 0.85, consensusAchieved: true }],
        ["source3.com", { score: 0.9, confidence: 0.95, consensusAchieved: true }],
      ]);
      (batchGetCachedData as ReturnType<typeof vi.fn>).mockResolvedValue(cachedData);

      const urls = [
        "https://source1.com/a",
        "https://source2.com/b",
        "https://source3.com/c",
        "https://source1.com/d", // Duplicate domain
      ];

      await prefetchSourceReliability(urls);

      // Should call batchGetCachedData once with unique domains
      expect(batchGetCachedData).toHaveBeenCalledTimes(1);
      const calledDomains = (batchGetCachedData as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledDomains).toHaveLength(3); // Deduplicated
    });
  });

  describe("Score Normalization", () => {
    it("handles 0-100 scale scores from legacy data", () => {
      // Simulate legacy data that might be on 0-100 scale
      expect(normalizeTrackRecordScore(75)).toBe(0.75);
      expect(normalizeTrackRecordScore(100)).toBe(1.0);
      expect(normalizeTrackRecordScore(0)).toBe(0);
    });

    it("passes through 0-1 scale scores unchanged", () => {
      expect(normalizeTrackRecordScore(0.75)).toBe(0.75);
      expect(normalizeTrackRecordScore(0.5)).toBe(0.5);
      expect(normalizeTrackRecordScore(1.0)).toBe(1.0);
    });

    it("handles edge cases defensively", () => {
      expect(normalizeTrackRecordScore(NaN)).toBe(0.5);
      expect(normalizeTrackRecordScore(Infinity)).toBe(0.5);
      expect(normalizeTrackRecordScore(-1)).toBe(0); // Clamped
    });
  });

  describe("FetchedSource Integration", () => {
    it("FetchedSource with trackRecordScore flows through pipeline", () => {
      // This tests the type compatibility
      const source: FetchedSource = {
        id: "test-source",
        url: "https://example.com/article",
        title: "Test Article",
        trackRecordScore: 0.85, // This field is populated by getTrackRecordScore
        fullText: "Article content goes here...",
        fetchedAt: new Date().toISOString(),
        category: "news",
        fetchSuccess: true,
      };

      // Verify the score is accessible
      expect(source.trackRecordScore).toBe(0.85);

      // Verify it can be used in weighting
      const evidenceItems: EvidenceItem[] = [makeEvidenceItem("E1", "test-source")];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Test",
          truthPercentage: 80,
          confidence: 70,
          verdict: 80,
          highlightColor: "green",
          supportingEvidenceIds: ["E1"],
          reasoning: "...",
          claimRole: "central",
          isCentral: false,
          centrality: "medium",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, evidenceItems, [source]);
      expect(weighted[0].evidenceWeight).toBe(0.85);
    });

    it("FetchedSource with null trackRecordScore is handled", () => {
      const source: FetchedSource = {
        id: "unknown-source",
        url: "https://unknown.example/article",
        title: "Unknown Article",
        trackRecordScore: null, // Unknown source - uses DEFAULT_UNKNOWN_SOURCE_SCORE (0.5)
        fullText: "...",
        fetchedAt: new Date().toISOString(),
        category: "unknown",
        fetchSuccess: true,
      };

      const evidenceItems: EvidenceItem[] = [makeEvidenceItem("E1", "unknown-source")];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Test",
          truthPercentage: 75,
          confidence: 65,
          verdict: 75,
          highlightColor: "yellow",
          supportingEvidenceIds: ["E1"],
          reasoning: "...",
          claimRole: "supporting",
          isCentral: false,
          centrality: "low",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, evidenceItems, [source]);

      // Unknown sources use DEFAULT_UNKNOWN_SOURCE_SCORE (0.5) which pulls verdict toward neutral
      // Formula: adjustedTruth = 50 + (75 - 50) * 0.5 = 50 + 12.5 = 63 (rounded)
      expect(weighted[0].truthPercentage).toBe(63);
      expect(weighted[0].evidenceWeight).toBe(0.5);
      expect(weighted[0].sourceReliabilityMeta?.unknownSources).toBe(1);
    });
  });
});
