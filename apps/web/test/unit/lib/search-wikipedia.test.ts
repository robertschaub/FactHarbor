/**
 * Tests for Wikipedia Search API integration.
 *
 * Validates HTML tag stripping, URL construction, error handling, and result parsing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchProviderError } from "@/lib/web-search";

describe("Wikipedia Search API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should parse successful response and strip HTML tags", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        query: {
          search: [
            {
              title: "Climate change",
              snippet: "Global warming is the long-term heating of Earth's <span class=\"searchmatch\">climate</span> system.",
            },
          ],
        },
      }),
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({ query: "climate change", maxResults: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Climate change");
    expect(results[0].snippet).toBe("Global warming is the long-term heating of Earth's climate system.");
    expect(results[0].url).toBe("https://en.wikipedia.org/wiki/Climate_change");
  });

  it("should handle empty results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ query: { search: [] } }),
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({ query: "nonexistent query", maxResults: 5 });
    expect(results).toHaveLength(0);
  });

  it("should handle network timeout gracefully", async () => {
    const timeoutError = new Error("Timeout");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({ query: "timeout query", maxResults: 5 });
    expect(results).toHaveLength(0);
  });

  it("should throw SearchProviderError on HTTP 429 (rate limit)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    try {
      await searchWikipedia({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err: any) {
      // Use duck-typing instead of instanceof (vi.resetModules breaks class identity)
      expect(err.name).toBe("SearchProviderError");
      expect(err.provider).toBe("Wikipedia");
      expect(err.status).toBe(429);
      expect(err.fatal).toBe(true);
    }
  });

  it("should throw SearchProviderError on HTTP 500 (server error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    try {
      await searchWikipedia({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err: any) {
      expect(err.name).toBe("SearchProviderError");
      expect(err.provider).toBe("Wikipedia");
      expect(err.status).toBe(500);
      expect(err.fatal).toBe(true);
    }
  });

  it("should return empty array on HTTP 404 (client error, not 429)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({ query: "test", maxResults: 5 });
    expect(results).toEqual([]);
  });

  it("should construct URLs correctly with spaces and special characters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        query: {
          search: [
            {
              title: "C++ (programming language)",
              snippet: "C++ is a general-purpose programming language.",
            },
          ],
        },
      }),
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({ query: "c++", maxResults: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://en.wikipedia.org/wiki/C%2B%2B_(programming_language)");
  });

  it("should handle unicode characters in titles", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        query: {
          search: [
            {
              title: "São Paulo",
              snippet: "São Paulo is a municipality in Brazil.",
            },
          ],
        },
      }),
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({ query: "São Paulo", maxResults: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://en.wikipedia.org/wiki/S%C3%A3o_Paulo");
  });

  it("should respect maxResults limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        query: {
          search: [
            { title: "Result 1", snippet: "S1" },
            { title: "Result 2", snippet: "S2" },
            { title: "Result 3", snippet: "S3" },
          ],
        },
      }),
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({ query: "test", maxResults: 2 });
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Result 1");
    expect(results[1].title).toBe("Result 2");
  });

  it("should use language parameter to construct correct subdomain URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        query: {
          search: [
            { title: "Changement climatique", snippet: "Le changement climatique..." },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({
      query: "changement climatique",
      maxResults: 5,
      config: {
        providers: {
          wikipedia: {
            language: "fr",
            enabled: true,
            priority: 3,
            dailyQuotaLimit: 0,
          },
        },
      } as any,
    });

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://fr.wikipedia.org/wiki/Changement_climatique");
    // Verify fetch was called with French Wikipedia API
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("fr.wikipedia.org"),
      expect.anything(),
    );
  });

  it("should return empty array if no query.search in response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ query: {} }),
    }));

    const { searchWikipedia } = await import("@/lib/search-wikipedia");

    const results = await searchWikipedia({ query: "test", maxResults: 5 });
    expect(results).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Language fallback chain: detectedLanguage > config language > "en"
  // ---------------------------------------------------------------------------

  describe("language fallback chain", () => {
    it("prefers detectedLanguage over config language", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ query: { search: [{ title: "Plastik", snippet: "s" }] } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { searchWikipedia } = await import("@/lib/search-wikipedia");

      const results = await searchWikipedia({
        query: "Plastik",
        maxResults: 3,
        detectedLanguage: "de",
        config: {
          providers: { wikipedia: { language: "fr", enabled: true, priority: 3, dailyQuotaLimit: 0 } },
        } as any,
      });

      expect(results[0].url).toContain("de.wikipedia.org");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("de.wikipedia.org"),
        expect.anything(),
      );
    });

    it("falls back to config language when detectedLanguage is absent", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ query: { search: [{ title: "Test", snippet: "s" }] } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { searchWikipedia } = await import("@/lib/search-wikipedia");

      await searchWikipedia({
        query: "test",
        maxResults: 3,
        config: {
          providers: { wikipedia: { language: "fr", enabled: true, priority: 3, dailyQuotaLimit: 0 } },
        } as any,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("fr.wikipedia.org"),
        expect.anything(),
      );
    });

    it("falls back to 'en' when both detectedLanguage and config language are absent", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ query: { search: [{ title: "Test", snippet: "s" }] } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { searchWikipedia } = await import("@/lib/search-wikipedia");

      await searchWikipedia({
        query: "test",
        maxResults: 3,
        // No detectedLanguage, no config
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("en.wikipedia.org"),
        expect.anything(),
      );
    });
  });
});
