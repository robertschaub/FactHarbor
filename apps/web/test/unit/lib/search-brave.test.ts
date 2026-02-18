/**
 * Tests for Brave Search API integration.
 *
 * Validates HTTP error handling, date restriction mapping, and result parsing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchProviderError } from "@/lib/web-search";

describe("Brave Search API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.BRAVE_API_KEY = "test_brave_api_key_12345";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should throw SearchProviderError on HTTP 429 (rate limit)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: () => Promise.resolve("Rate limit exceeded"),
    }));

    const { searchBrave } = await import("@/lib/search-brave");

    try {
      await searchBrave({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SearchProviderError);
      const e = err as SearchProviderError;
      expect(e.provider).toBe("Brave");
      expect(e.status).toBe(429);
      expect(e.fatal).toBe(true);
    }
  });

  it("should throw SearchProviderError on HTTP 403 (invalid API key)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: () => Promise.resolve("Invalid API key"),
    }));

    const { searchBrave } = await import("@/lib/search-brave");

    try {
      await searchBrave({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SearchProviderError);
      const e = err as SearchProviderError;
      expect(e.provider).toBe("Brave");
      expect(e.status).toBe(403);
      expect(e.fatal).toBe(true);
    }
  });

  it("should return empty array on HTTP 500 (server error, non-quota)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("Server error"),
    }));

    const { searchBrave } = await import("@/lib/search-brave");

    const result = await searchBrave({ query: "test", maxResults: 5 });
    expect(result).toEqual([]);
  });

  it("should parse successful Brave API response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        web: {
          results: [
            {
              title: "Example Result",
              url: "https://example.com",
              description: "This is a test result",
            },
            {
              title: "Another Result",
              url: "https://example.org",
              description: "Second result",
            },
          ],
        },
      }),
    }));

    const { searchBrave } = await import("@/lib/search-brave");

    const result = await searchBrave({ query: "test", maxResults: 5 });
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Example Result");
    expect(result[0].url).toBe("https://example.com");
    expect(result[0].snippet).toBe("This is a test result");
    expect(result[1].title).toBe("Another Result");
  });

  it("should handle missing description field gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        web: {
          results: [
            {
              title: "No Description",
              url: "https://example.com",
            },
          ],
        },
      }),
    }));

    const { searchBrave } = await import("@/lib/search-brave");

    const result = await searchBrave({ query: "test", maxResults: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].snippet).toBeNull();
  });

  it("should respect maxResults limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        web: {
          results: [
            { title: "R1", url: "https://example.com/1", description: "D1" },
            { title: "R2", url: "https://example.com/2", description: "D2" },
            { title: "R3", url: "https://example.com/3", description: "D3" },
          ],
        },
      }),
    }));

    const { searchBrave } = await import("@/lib/search-brave");

    const result = await searchBrave({ query: "test", maxResults: 2 });
    expect(result).toHaveLength(2); // Brave returns 3 but we requested 2
  });

  it("should return empty array if no web.results in response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        web: {},
      }),
    }));

    const { searchBrave } = await import("@/lib/search-brave");

    const result = await searchBrave({ query: "test", maxResults: 5 });
    expect(result).toEqual([]);
  });

  it("should map dateRestrict parameter to freshness query param", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ web: { results: [] } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchBrave } = await import("@/lib/search-brave");

    // Test "y" (past year) → "py"
    await searchBrave({ query: "test", maxResults: 5, dateRestrict: "y" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("freshness=py"),
      expect.anything(),
    );

    mockFetch.mockClear();

    // Test "m" (past month) → "pm"
    await searchBrave({ query: "test", maxResults: 5, dateRestrict: "m" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("freshness=pm"),
      expect.anything(),
    );

    mockFetch.mockClear();

    // Test "w" (past week) → "pw"
    await searchBrave({ query: "test", maxResults: 5, dateRestrict: "w" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("freshness=pw"),
      expect.anything(),
    );
  });

  it("should NOT set freshness param if dateRestrict is undefined", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ web: { results: [] } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchBrave } = await import("@/lib/search-brave");

    await searchBrave({ query: "test", maxResults: 5 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.not.stringContaining("freshness="),
      expect.anything(),
    );
  });
});
