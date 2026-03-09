/**
 * Tests for SerpAPI search integration.
 *
 * Validates response parsing and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("SerpAPI Search", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.SERPAPI_API_KEY = "test_serpapi_key_12345";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should NOT set gl/hl params (geo/language never sent to providers)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ organic_results: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    await searchSerpApi({ query: "test", maxResults: 5 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("gl=");
    expect(calledUrl).not.toContain("hl=");
  });

  it("should parse successful response into WebSearchResult[]", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        organic_results: [
          { title: "Result 1", link: "https://example.com/1", snippet: "Snippet 1" },
          { title: "Result 2", link: "https://example.com/2" },
        ],
      }),
    }));

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    const results = await searchSerpApi({ query: "test", maxResults: 5 });
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ url: "https://example.com/1", title: "Result 1", snippet: "Snippet 1" });
    expect(results[1].snippet).toBeNull();
  });

  it("should return empty array when API key is not configured", async () => {
    delete process.env.SERPAPI_API_KEY;

    vi.stubGlobal("fetch", vi.fn());

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    const results = await searchSerpApi({ query: "test", maxResults: 5 });
    expect(results).toEqual([]);
  });
});
