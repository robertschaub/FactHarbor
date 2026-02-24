/**
 * Tests for Semantic Scholar Search API integration.
 *
 * Validates DOI URL preference, title enrichment, abstract truncation,
 * error handling, rate limiter serialization, and result parsing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchProviderError } from "@/lib/web-search";

describe("Semantic Scholar Search API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.SEMANTIC_SCHOLAR_API_KEY = "test_s2_api_key_12345";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should parse successful response and prefer DOI URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: [
          {
            paperId: "123",
            title: "Test Paper",
            year: 2023,
            venue: "Nature",
            abstract: "This is a test abstract.",
            externalIds: { DOI: "10.1000/xyz123" },
          },
        ],
      }),
    }));

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    const results = await searchSemanticScholar({ query: "test", maxResults: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Test Paper (2023, Nature)");
    expect(results[0].snippet).toBe("This is a test abstract.");
    expect(results[0].url).toBe("https://doi.org/10.1000/xyz123");
  });

  it("should fallback to S2 URL if DOI is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: [
          {
            paperId: "abc456",
            title: "No DOI Paper",
            abstract: "Abstract text.",
          },
        ],
      }),
    }));

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    const results = await searchSemanticScholar({ query: "test", maxResults: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("No DOI Paper");
    expect(results[0].url).toBe("https://www.semanticscholar.org/paper/abc456");
  });

  it("should truncate long abstracts at 500 chars", async () => {
    const longAbstract = "A".repeat(600);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: [
          {
            paperId: "123",
            title: "Long Abstract Paper",
            abstract: longAbstract,
          },
        ],
      }),
    }));

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    const results = await searchSemanticScholar({ query: "test", maxResults: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].snippet).toHaveLength(500);
    expect(results[0].snippet?.endsWith("...")).toBe(true);
  });

  it("should enrich title with year and venue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: [
          { paperId: "1", title: "Paper A", year: 2024, venue: "ICML" },
          { paperId: "2", title: "Paper B", year: 2023 },
          { paperId: "3", title: "Paper C" },
        ],
      }),
    }));

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    const results = await searchSemanticScholar({ query: "test", maxResults: 5 });
    expect(results[0].title).toBe("Paper A (2024, ICML)");
    expect(results[1].title).toBe("Paper B (2023)");
    expect(results[2].title).toBe("Paper C");
  });

  it("should throw SearchProviderError on HTTP 429 (rate limit)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: () => Promise.resolve("Rate limit exceeded"),
    }));

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    try {
      await searchSemanticScholar({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err: any) {
      expect(err.name).toBe("SearchProviderError");
      expect(err.provider).toBe("Semantic-Scholar");
      expect(err.status).toBe(429);
      expect(err.fatal).toBe(true);
    }
  });

  it("should throw SearchProviderError on HTTP 403 (forbidden)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: () => Promise.resolve("Invalid API key"),
    }));

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    try {
      await searchSemanticScholar({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err: any) {
      expect(err.name).toBe("SearchProviderError");
      expect(err.provider).toBe("Semantic-Scholar");
      expect(err.status).toBe(403);
      expect(err.fatal).toBe(true);
    }
  });

  it("should return empty array on HTTP 500 (server error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("Server error"),
    }));

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    const result = await searchSemanticScholar({ query: "test", maxResults: 5 });
    expect(result).toEqual([]);
  });

  it("should handle empty results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    }));

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    const results = await searchSemanticScholar({ query: "test", maxResults: 5 });
    expect(results).toHaveLength(0);
  });

  it("should handle missing API key gracefully (no x-api-key header)", async () => {
    delete process.env.SEMANTIC_SCHOLAR_API_KEY;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    await searchSemanticScholar({ query: "test", maxResults: 5 });

    // Verify x-api-key is NOT in headers
    const fetchCall = mockFetch.mock.calls[0];
    const headers = fetchCall[1]?.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("x-api-key");
  });

  it("should apply year range for dateRestrict 'y'", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    const currentYear = new Date().getFullYear();
    await searchSemanticScholar({ query: "test", maxResults: 5, dateRestrict: "y" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`year=${currentYear - 1}-${currentYear}`),
      expect.anything(),
    );
  });

  it("should apply current year only for dateRestrict 'm'", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchSemanticScholar } = await import("@/lib/search-semanticscholar");

    const currentYear = new Date().getFullYear();
    await searchSemanticScholar({ query: "test", maxResults: 5, dateRestrict: "m" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`year=${currentYear}`),
      expect.anything(),
    );
    // Should NOT contain the range format
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining(`year=${currentYear - 1}-${currentYear}`),
      expect.anything(),
    );
  });
});
