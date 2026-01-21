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
} from "./source-reliability";
import type { ClaimVerdict, ExtractedFact, FetchedSource } from "./types";

// Mock the cache module to avoid SQLite in tests
vi.mock("../source-reliability-cache", () => ({
  batchGetCachedScores: vi.fn(),
  setCachedScore: vi.fn(),
}));

// Mock fetch for internal API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
      // Mock cache returns some scores
      const { batchGetCachedScores } = await import("../source-reliability-cache");
      (batchGetCachedScores as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([
          ["reuters.com", 0.95],
          ["bbc.com", 0.88],
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

      const facts: ExtractedFact[] = [
        {
          id: "fact-1",
          sourceId: "src-1",
          claim: "Fact from Reuters",
          excerpt: "...",
          supportsClaim: true,
          confidence: 85,
        },
        {
          id: "fact-2",
          sourceId: "src-2",
          claim: "Fact from BBC",
          excerpt: "...",
          supportsClaim: true,
          confidence: 80,
        },
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Test claim",
          truthPercentage: 80,
          confidence: 75,
          verdict: 80,
          highlightColor: "green",
          supportingFactIds: ["fact-1", "fact-2"],
          reasoning: "Based on evidence",
          claimRole: "central",
          isCentral: true,
          centrality: "high",
        },
      ];

      // Step 4: Apply evidence weighting
      const weighted = applyEvidenceWeighting(verdicts, facts, sources);

      // Verify weighting was applied
      expect(weighted[0].evidenceWeight).toBeDefined();
      // Average score: (0.95 + 0.88) / 2 = 0.915
      expect(weighted[0].evidenceWeight).toBeCloseTo(0.915, 2);

      // Truth should be adjusted: 50 + (80-50) * 0.915 = 50 + 27.45 = 77.45 ≈ 77
      expect(weighted[0].truthPercentage).toBeCloseTo(77, 0);
    });

    it("handles unknown sources gracefully (null scores)", async () => {
      const { batchGetCachedScores } = await import("../source-reliability-cache");
      (batchGetCachedScores as ReturnType<typeof vi.fn>).mockResolvedValue(
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

      const facts: ExtractedFact[] = [
        {
          id: "fact-1",
          sourceId: "src-1",
          claim: "Fact from unknown",
          excerpt: "...",
          supportsClaim: true,
          confidence: 70,
        },
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Test claim",
          truthPercentage: 80,
          confidence: 75,
          verdict: 80,
          highlightColor: "green",
          supportingFactIds: ["fact-1"],
          reasoning: "Based on evidence",
          claimRole: "central",
          isCentral: false,
          centrality: "medium",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, facts, sources);

      // Verdict should be unchanged (no score to weight with)
      expect(weighted[0].truthPercentage).toBe(80);
      expect(weighted[0].evidenceWeight).toBeUndefined();
    });

    it("skips blog platforms during prefetch (importance filter)", async () => {
      const { batchGetCachedScores, setCachedScore } = await import("../source-reliability-cache");
      (batchGetCachedScores as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());

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
      const { batchGetCachedScores } = await import("../source-reliability-cache");
      (batchGetCachedScores as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([["factcheck.org", 0.98]])
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

      const facts: ExtractedFact[] = [
        { id: "f1", sourceId: "src-1", claim: "...", excerpt: "...", supportsClaim: true, confidence: 90 },
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Verified claim",
          truthPercentage: 85, // Strong true
          confidence: 80,
          verdict: 85,
          highlightColor: "green",
          supportingFactIds: ["f1"],
          reasoning: "High quality source",
          claimRole: "central",
          isCentral: true,
          centrality: "high",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, facts, sources);

      // With 0.98 reliability: 50 + (85-50) * 0.98 = 50 + 34.3 = 84.3 ≈ 84
      expect(weighted[0].truthPercentage).toBeCloseTo(84, 0);
      expect(weighted[0].evidenceWeight).toBe(0.98);
    });

    it("low reliability sources pull verdicts toward neutral", async () => {
      const { batchGetCachedScores } = await import("../source-reliability-cache");
      (batchGetCachedScores as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([["conspiracy-site.xyz", 0.15]])
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

      const facts: ExtractedFact[] = [
        { id: "f1", sourceId: "src-1", claim: "...", excerpt: "...", supportsClaim: true, confidence: 60 },
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Dubious claim",
          truthPercentage: 90, // Would be "True" but from unreliable source
          confidence: 70,
          verdict: 90,
          highlightColor: "green",
          supportingFactIds: ["f1"],
          reasoning: "Single unreliable source",
          claimRole: "supporting",
          isCentral: false,
          centrality: "low",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, facts, sources);

      // With 0.15 reliability: 50 + (90-50) * 0.15 = 50 + 6 = 56
      expect(weighted[0].truthPercentage).toBe(56);
      expect(weighted[0].evidenceWeight).toBe(0.15);
    });

    it("mixed reliability sources average correctly", async () => {
      const { batchGetCachedScores } = await import("../source-reliability-cache");
      (batchGetCachedScores as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([
          ["good-source.com", 0.85],
          ["bad-source.net", 0.25],
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

      const facts: ExtractedFact[] = [
        { id: "f1", sourceId: "src-1", claim: "...", excerpt: "...", supportsClaim: true, confidence: 80 },
        { id: "f2", sourceId: "src-2", claim: "...", excerpt: "...", supportsClaim: true, confidence: 60 },
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Mixed source claim",
          truthPercentage: 75,
          confidence: 70,
          verdict: 75,
          highlightColor: "yellow",
          supportingFactIds: ["f1", "f2"],
          reasoning: "Mixed sources",
          claimRole: "central",
          isCentral: true,
          centrality: "medium",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, facts, sources);

      // Average score: (0.85 + 0.25) / 2 = 0.55
      expect(weighted[0].evidenceWeight).toBe(0.55);
      // Truth: 50 + (75-50) * 0.55 = 50 + 13.75 = 63.75 ≈ 64
      expect(weighted[0].truthPercentage).toBeCloseTo(64, 0);
    });
  });

  describe("Cache Integration", () => {
    it("uses cached scores without re-evaluation", async () => {
      const { batchGetCachedScores, setCachedScore } = await import("../source-reliability-cache");

      // Simulate cache hit
      (batchGetCachedScores as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([["cached-source.com", 0.72]])
      );

      await prefetchSourceReliability(["https://cached-source.com/article"]);

      // Verify no API call was made (cache hit)
      expect(mockFetch).not.toHaveBeenCalled();

      // Score should be available
      const score = getTrackRecordScore("https://cached-source.com/article");
      expect(score).toBe(0.72);
    });

    it("batch lookup is efficient for multiple URLs", async () => {
      const { batchGetCachedScores } = await import("../source-reliability-cache");

      const cachedScores = new Map([
        ["source1.com", 0.8],
        ["source2.com", 0.7],
        ["source3.com", 0.9],
      ]);
      (batchGetCachedScores as ReturnType<typeof vi.fn>).mockResolvedValue(cachedScores);

      const urls = [
        "https://source1.com/a",
        "https://source2.com/b",
        "https://source3.com/c",
        "https://source1.com/d", // Duplicate domain
      ];

      await prefetchSourceReliability(urls);

      // Should call batchGetCachedScores once with unique domains
      expect(batchGetCachedScores).toHaveBeenCalledTimes(1);
      const calledDomains = (batchGetCachedScores as ReturnType<typeof vi.fn>).mock.calls[0][0];
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
      const facts: ExtractedFact[] = [
        { id: "f1", sourceId: "test-source", claim: "...", excerpt: "...", supportsClaim: true, confidence: 80 },
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Test",
          truthPercentage: 80,
          confidence: 70,
          verdict: 80,
          highlightColor: "green",
          supportingFactIds: ["f1"],
          reasoning: "...",
          claimRole: "central",
          isCentral: false,
          centrality: "medium",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, facts, [source]);
      expect(weighted[0].evidenceWeight).toBe(0.85);
    });

    it("FetchedSource with null trackRecordScore is handled", () => {
      const source: FetchedSource = {
        id: "unknown-source",
        url: "https://unknown.example/article",
        title: "Unknown Article",
        trackRecordScore: null, // Unknown source
        fullText: "...",
        fetchedAt: new Date().toISOString(),
        category: "unknown",
        fetchSuccess: true,
      };

      const facts: ExtractedFact[] = [
        { id: "f1", sourceId: "unknown-source", claim: "...", excerpt: "...", supportsClaim: true, confidence: 70 },
      ];

      const verdicts: ClaimVerdict[] = [
        {
          id: "v1",
          claimText: "Test",
          truthPercentage: 75,
          confidence: 65,
          verdict: 75,
          highlightColor: "yellow",
          supportingFactIds: ["f1"],
          reasoning: "...",
          claimRole: "supporting",
          isCentral: false,
          centrality: "low",
        },
      ];

      const weighted = applyEvidenceWeighting(verdicts, facts, [source]);

      // Verdict unchanged when no score
      expect(weighted[0].truthPercentage).toBe(75);
      expect(weighted[0].evidenceWeight).toBeUndefined();
    });
  });
});
