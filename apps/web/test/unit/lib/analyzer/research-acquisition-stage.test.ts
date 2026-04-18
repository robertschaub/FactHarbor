import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractDomain,
  computeBatchDelays,
  humanizeErrorType,
  fetchSources,
} from "@/lib/analyzer/research-acquisition-stage";
import type { CBResearchState } from "@/lib/analyzer/types";

// Mock the retrieval module for fetchSources tests
vi.mock("@/lib/retrieval", () => ({
  extractTextFromUrl: vi.fn(),
}));

describe("research-acquisition-stage", () => {
  describe("extractDomain", () => {
    it("should extract hostname from a standard URL", () => {
      expect(extractDomain("https://www.example.com/page")).toBe("www.example.com");
    });

    it("should normalize to lowercase", () => {
      expect(extractDomain("https://WWW.EXAMPLE.COM/Page")).toBe("www.example.com");
    });

    it("should handle URLs with ports", () => {
      expect(extractDomain("https://example.com:8080/path")).toBe("example.com");
    });

    it("should return lowercased input for invalid URLs", () => {
      expect(extractDomain("not-a-url")).toBe("not-a-url");
    });
  });

  describe("computeBatchDelays", () => {
    it("should return zero delays for all-different domains", () => {
      const urls = [
        "https://a.com/1",
        "https://b.com/2",
        "https://c.com/3",
      ];
      expect(computeBatchDelays(urls, 500)).toEqual([0, 0, 0]);
    });

    it("should stagger same-domain requests", () => {
      const urls = [
        "https://example.com/page1",
        "https://example.com/page2",
        "https://example.com/page3",
      ];
      expect(computeBatchDelays(urls, 500)).toEqual([0, 500, 1000]);
    });

    it("should stagger only same-domain, not cross-domain", () => {
      const urls = [
        "https://a.com/1",
        "https://b.com/2",
        "https://a.com/3",
      ];
      expect(computeBatchDelays(urls, 300)).toEqual([0, 0, 300]);
    });

    it("should return all zeros when delay is 0 (disabled)", () => {
      const urls = [
        "https://a.com/1",
        "https://a.com/2",
        "https://a.com/3",
      ];
      expect(computeBatchDelays(urls, 0)).toEqual([0, 0, 0]);
    });

    it("should handle empty batch", () => {
      expect(computeBatchDelays([], 500)).toEqual([]);
    });

    it("should handle single-URL batch", () => {
      expect(computeBatchDelays(["https://a.com/1"], 500)).toEqual([0]);
    });

    it("should handle mixed domains with multiple same-domain groups", () => {
      const urls = [
        "https://a.com/1",
        "https://b.com/1",
        "https://a.com/2",
        "https://b.com/2",
        "https://c.com/1",
      ];
      expect(computeBatchDelays(urls, 200)).toEqual([0, 0, 200, 200, 0]);
    });
  });

  describe("humanizeErrorType", () => {
    it("should map known error types to human-readable labels", () => {
      expect(humanizeErrorType("http_403")).toBe("paywall/blocked");
      expect(humanizeErrorType("http_401")).toBe("paywall");
      expect(humanizeErrorType("http_404")).toBe("dead link");
      expect(humanizeErrorType("timeout")).toBe("timeout");
      expect(humanizeErrorType("network")).toBe("network error");
      expect(humanizeErrorType("pdf_parse_failure")).toBe("PDF parse error");
      expect(humanizeErrorType("http_429")).toBe("rate limited");
      expect(humanizeErrorType("http_5xx")).toBe("server error");
    });

    it("should pass through unknown types as-is", () => {
      expect(humanizeErrorType("unknown")).toBe("unknown");
      expect(humanizeErrorType("something_else")).toBe("something_else");
    });
  });

  describe("fetchSources — domain short-circuit and warning enrichment", () => {
    function createMinimalState(): CBResearchState {
      return {
        originalInput: "test",
        sources: [],
        evidenceItems: [],
        searchQueries: [],
        warnings: [],
        contradictionIterationsUsed: 0,
        llmCalls: 0,
      } as unknown as CBResearchState;
    }

    // Mock extractTextFromUrl at the module level
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.clearAllMocks();
    });

    it("should skip a same-domain URL after 2 consecutive 403 failures", async () => {
      // Mock: first two URLs from blocked.com return 403, third should be skipped
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        if (url.includes("blocked.com")) {
          const err = new Error("HTTP 403 Forbidden");
          (err as any).status = 403;
          throw err;
        }
        return { text: "Good content from other domain. ".repeat(10), title: "Title", contentType: "text/html" };
      });

      const state = createMinimalState();
      const sources = [
        { url: "https://blocked.com/page1" },
        { url: "https://blocked.com/page2" },
        { url: "https://blocked.com/page3" },  // Should be skipped
        { url: "https://good.com/page1" },
      ];

      const result = await fetchSources(sources, "test query", state, {
        fetchDomainSkipThreshold: 2,
        parallelExtractionLimit: 1, // Serial to ensure ordering
        sourceFetchTimeoutMs: 5000,
        fetchSameDomainDelayMs: 0,
      });

      // good.com succeeded
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("https://good.com/page1");

      // Check warning details include skip count
      const fetchWarning = state.warnings.find((w) => w.type === "source_fetch_failure");
      expect(fetchWarning).toBeDefined();
      expect(fetchWarning!.details?.skippedByDomainShortCircuit).toBe(1);
      expect(fetchWarning!.details?.attempted).toBe(3);
      expect(fetchWarning!.details?.failed).toBe(2);
    });

    it("should reset the blocking streak after a non-blocking outcome", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      const attemptedUrls: string[] = [];
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        attemptedUrls.push(url);
        if (url.includes("blocked.com/page1")) {
          const err = new Error("HTTP 403 Forbidden");
          (err as any).status = 403;
          throw err;
        }
        if (url.includes("blocked.com/page3")) {
          const err = new Error("HTTP 403 Forbidden");
          (err as any).status = 403;
          throw err;
        }
        return { text: "Fetch succeeded and should reset the streak. ".repeat(5), title: "Title", contentType: "text/html" };
      });

      const state = createMinimalState();
      const sources = [
        { url: "https://blocked.com/page1" },
        { url: "https://blocked.com/page2" }, // success resets streak
        { url: "https://blocked.com/page3" },
        { url: "https://blocked.com/page4" }, // should still be attempted, not skipped
      ];

      const result = await fetchSources(sources, "test query", state, {
        fetchDomainSkipThreshold: 2,
        parallelExtractionLimit: 1,
        sourceFetchTimeoutMs: 5000,
        fetchSameDomainDelayMs: 0,
      });

      expect(attemptedUrls).toHaveLength(4);
      expect(result).toHaveLength(2);
      const fetchWarning = state.warnings.find((w) => w.type === "source_fetch_failure");
      expect(fetchWarning!.details?.skippedByDomainShortCircuit).toBeUndefined();
    });

    it("should NOT trigger domain skip on 404 errors", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      let fetchCount = 0;
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        if (url.includes("deadlinks.com")) {
          fetchCount++;
          const err = new Error("HTTP 404 Not Found");
          (err as any).status = 404;
          throw err;
        }
        return { text: "Good content from other domain. ".repeat(10), title: "Title", contentType: "text/html" };
      });

      const state = createMinimalState();
      const sources = [
        { url: "https://deadlinks.com/page1" },
        { url: "https://deadlinks.com/page2" },
        { url: "https://deadlinks.com/page3" },  // Should NOT be skipped — 404 is URL-specific
      ];

      await fetchSources(sources, "test query", state, {
        fetchDomainSkipThreshold: 2,
        parallelExtractionLimit: 1,
        sourceFetchTimeoutMs: 5000,
        fetchSameDomainDelayMs: 0,
      });

      // All 3 URLs should have been attempted (404 is not a domain-level skip trigger)
      expect(fetchCount).toBe(3);
    });

    it("should NOT trigger domain skip on transient errors (timeout, network)", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      let fetchCount = 0;
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        if (url.includes("slow.com")) {
          fetchCount++;
          throw new Error("timeout: AbortError");
        }
        return { text: "Good content from other domain. ".repeat(10), title: "Title", contentType: "text/html" };
      });

      const state = createMinimalState();
      const sources = [
        { url: "https://slow.com/page1" },
        { url: "https://slow.com/page2" },
        { url: "https://slow.com/page3" },  // Should NOT be skipped — timeout is transient
      ];

      await fetchSources(sources, "test query", state, {
        fetchDomainSkipThreshold: 2,
        parallelExtractionLimit: 1,
        sourceFetchTimeoutMs: 100,  // Short timeout for test speed
        iterationRetryDelayMs: 0,   // No retry delay
        fetchSameDomainDelayMs: 0,
      });

      // Each URL gets 2 attempts (first + retry for transient errors)
      expect(fetchCount).toBe(6);
    });

    it("should track domains independently", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      const attemptedDomains: string[] = [];
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        const domain = new URL(url).hostname;
        attemptedDomains.push(domain);
        if (url.includes("blocked-a.com") || url.includes("blocked-b.com")) {
          const err = new Error("HTTP 403 Forbidden");
          (err as any).status = 403;
          throw err;
        }
        return { text: "Good content from other domain. ".repeat(10), title: "Title", contentType: "text/html" };
      });

      const state = createMinimalState();
      const sources = [
        { url: "https://blocked-a.com/page1" },
        { url: "https://blocked-b.com/page1" },
        { url: "https://blocked-a.com/page2" },
        { url: "https://blocked-b.com/page2" },
        { url: "https://blocked-a.com/page3" },  // Should be skipped (2 failures from blocked-a.com)
        { url: "https://blocked-b.com/page3" },  // Should be skipped (2 failures from blocked-b.com)
      ];

      await fetchSources(sources, "test query", state, {
        fetchDomainSkipThreshold: 2,
        parallelExtractionLimit: 1,
        sourceFetchTimeoutMs: 5000,
        fetchSameDomainDelayMs: 0,
      });

      // blocked-a.com: attempted page1, page2 (both 403), skipped page3
      // blocked-b.com: attempted page1, page2 (both 403), skipped page3
      expect(attemptedDomains.filter((d) => d === "blocked-a.com")).toHaveLength(2);
      expect(attemptedDomains.filter((d) => d === "blocked-b.com")).toHaveLength(2);

      const fetchWarning = state.warnings.find((w) => w.type === "source_fetch_failure");
      expect(fetchWarning!.details?.skippedByDomainShortCircuit).toBe(2);
    });

    it("should skip a delayed same-batch sibling after earlier blocking failures", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      const attemptedUrls: string[] = [];
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        attemptedUrls.push(url);
        const err = new Error("HTTP 403 Forbidden");
        (err as any).status = 403;
        throw err;
      });

      const state = createMinimalState();
      const sources = [
        { url: "https://blocked.com/page1" },
        { url: "https://blocked.com/page2" },
        { url: "https://blocked.com/page3" }, // delayed sibling should be skipped
      ];

      await fetchSources(sources, "test query", state, {
        fetchDomainSkipThreshold: 2,
        parallelExtractionLimit: 3,
        sourceFetchTimeoutMs: 5000,
        fetchSameDomainDelayMs: 20,
      });

      expect(attemptedUrls).toHaveLength(2);
      const fetchWarning = state.warnings.find((w) => w.type === "source_fetch_failure");
      expect(fetchWarning!.details?.attempted).toBe(2);
      expect(fetchWarning!.details?.failed).toBe(2);
      expect(fetchWarning!.details?.skippedByDomainShortCircuit).toBe(1);
    });

    it("should disable domain skip when threshold is 0", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      let fetchCount = 0;
      vi.mocked(extractTextFromUrl).mockImplementation(async () => {
        fetchCount++;
        const err = new Error("HTTP 403 Forbidden");
        (err as any).status = 403;
        throw err;
      });

      const state = createMinimalState();
      const sources = [
        { url: "https://blocked.com/page1" },
        { url: "https://blocked.com/page2" },
        { url: "https://blocked.com/page3" },
      ];

      await fetchSources(sources, "test query", state, {
        fetchDomainSkipThreshold: 0,  // Disabled
        parallelExtractionLimit: 1,
        sourceFetchTimeoutMs: 5000,
        fetchSameDomainDelayMs: 0,
      });

      // All 3 should be attempted (skip disabled)
      expect(fetchCount).toBe(3);
    });

    it("should include human-readable error types in warning message", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        if (url.includes("paywall.com")) {
          const err = new Error("HTTP 403 Forbidden");
          (err as any).status = 403;
          throw err;
        }
        if (url.includes("dead.com")) {
          const err = new Error("HTTP 404 Not Found");
          (err as any).status = 404;
          throw err;
        }
        return { text: "Content", title: "T", contentType: "text/html" };
      });

      const state = createMinimalState();
      await fetchSources(
        [{ url: "https://paywall.com/a" }, { url: "https://dead.com/b" }],
        "test query",
        state,
        { parallelExtractionLimit: 1, sourceFetchTimeoutMs: 5000, fetchSameDomainDelayMs: 0 },
      );

      const fetchWarning = state.warnings.find((w) => w.type === "source_fetch_failure");
      expect(fetchWarning).toBeDefined();
      expect(fetchWarning!.message).toContain("paywall/blocked");
      expect(fetchWarning!.message).toContain("dead link");
    });

    it("should follow discovered linked PDFs from already-relevant HTML pages", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      const attemptedUrls: string[] = [];
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        attemptedUrls.push(url);
        if (url === "https://www.news.admin.ch/de/newnsb/example") {
          return {
            text: "Release content ".repeat(20),
            title: "Release page",
            contentType: "text/html",
            discoveredDocumentUrls: [
              "https://cms.news.admin.ch/dam/de/sem/B7QVyAXUTwju/stat-jahr-2025-kommentar-d.pdf",
              "https://cms.news.admin.ch/dam/de/sem/07sVT8irIz1g/2025-12-grafiken-asylstatistik-d.pdf",
            ],
          };
        }

        return {
          text: "PDF content ".repeat(20),
          title: url.split("/").pop() ?? "pdf",
          contentType: "application/pdf",
        };
      });

      const state = createMinimalState();
      const result = await fetchSources(
        [{ url: "https://www.news.admin.ch/de/newnsb/example" }],
        "test query",
        state,
        { parallelExtractionLimit: 1, sourceFetchTimeoutMs: 5000, fetchSameDomainDelayMs: 0 },
      );

      expect(attemptedUrls).toEqual([
        "https://www.news.admin.ch/de/newnsb/example",
        "https://cms.news.admin.ch/dam/de/sem/B7QVyAXUTwju/stat-jahr-2025-kommentar-d.pdf",
        "https://cms.news.admin.ch/dam/de/sem/07sVT8irIz1g/2025-12-grafiken-asylstatistik-d.pdf",
      ]);
      expect(result.map((source) => source.url)).toEqual(attemptedUrls);
      expect(state.sources.map((source) => source.url)).toEqual(attemptedUrls);
    });

    it("should re-gate discovered follow-ups before fetching them when a classifier is provided", async () => {
      const { extractTextFromUrl } = await import("@/lib/retrieval");
      const attemptedUrls: string[] = [];
      vi.mocked(extractTextFromUrl).mockImplementation(async (url: string) => {
        attemptedUrls.push(url);
        if (url === "https://www.news.admin.ch/de/newnsb/example") {
          return {
            text: "Release content ".repeat(20),
            title: "Release page",
            contentType: "text/html",
            discoveredFollowUpUrls: [
              "https://cms.news.admin.ch/dam/de/sem/B7QVyAXUTwju/stat-jahr-2025-kommentar-d.pdf",
              "https://cms.news.admin.ch/dam/de/sem/07sVT8irIz1g/2025-12-grafiken-asylstatistik-d.pdf",
            ],
          };
        }

        return {
          text: "PDF content ".repeat(20),
          title: url.split("/").pop() ?? "pdf",
          contentType: "application/pdf",
        };
      });

      const classifyDiscoveredSources = vi.fn(async (sources: Array<{ url: string; title: string; snippet?: string | null }>) => {
        expect(sources).toHaveLength(2);
        expect(sources[0]?.title).toContain("stat jahr 2025 kommentar d");
        expect(sources[0]?.snippet).toContain("Release page");
        return [
          { url: "https://cms.news.admin.ch/dam/de/sem/B7QVyAXUTwju/stat-jahr-2025-kommentar-d.pdf", relevanceScore: 0.92, originalRank: 0 },
        ];
      });

      const state = createMinimalState();
      const result = await fetchSources(
        [{ url: "https://www.news.admin.ch/de/newnsb/example" }],
        "test query",
        state,
        { parallelExtractionLimit: 1, sourceFetchTimeoutMs: 5000, fetchSameDomainDelayMs: 0 },
        { classifyDiscoveredSources },
      );

      expect(classifyDiscoveredSources).toHaveBeenCalledTimes(1);
      expect(attemptedUrls).toEqual([
        "https://www.news.admin.ch/de/newnsb/example",
        "https://cms.news.admin.ch/dam/de/sem/B7QVyAXUTwju/stat-jahr-2025-kommentar-d.pdf",
      ]);
      expect(result.map((source) => source.url)).toEqual(attemptedUrls);
      expect(state.sources.map((source) => source.url)).toEqual(attemptedUrls);
      expect(state.sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: "https://cms.news.admin.ch/dam/de/sem/B7QVyAXUTwju/stat-jahr-2025-kommentar-d.pdf",
            relevanceScore: 0.92,
          }),
        ]),
      );
    });
  });
});
