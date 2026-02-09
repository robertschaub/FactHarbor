/**
 * Tests for search provider error detection and surfacing.
 *
 * Validates that HTTP 429, quota exhaustion, and other fatal search provider
 * errors are properly thrown as SearchProviderError (not silently swallowed)
 * and propagated through WebSearchResponse.errors to the analysis pipeline.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchProviderError, type SearchProviderErrorInfo, type WebSearchResponse } from "@/lib/web-search";

/** Helper: check that an error has SearchProviderError shape (cross-module safe) */
function expectSearchProviderError(err: unknown, expected?: Partial<{ provider: string; status: number; fatal: boolean; messageContains: string }>) {
  expect(err).toBeInstanceOf(Error);
  const e = err as any;
  expect(e.name).toBe("SearchProviderError");
  expect(e).toHaveProperty("provider");
  expect(e).toHaveProperty("fatal");
  if (expected?.provider) expect(e.provider).toBe(expected.provider);
  if (expected?.status) expect(e.status).toBe(expected.status);
  if (expected?.fatal !== undefined) expect(e.fatal).toBe(expected.fatal);
  if (expected?.messageContains) expect(e.message).toContain(expected.messageContains);
}

describe("SearchProviderError", () => {
  it("should construct with provider, status, fatal, and message", () => {
    const err = new SearchProviderError("SerpAPI", 429, true, "Your account has run out of searches.");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SearchProviderError);
    expect(err.name).toBe("SearchProviderError");
    expect(err.provider).toBe("SerpAPI");
    expect(err.status).toBe(429);
    expect(err.fatal).toBe(true);
    expect(err.message).toBe("Your account has run out of searches.");
  });

  it("should work with undefined status", () => {
    const err = new SearchProviderError("Google-CSE", undefined, true, "Network error");
    expect(err.status).toBeUndefined();
    expect(err.provider).toBe("Google-CSE");
  });
});

describe("SearchProviderErrorInfo type", () => {
  it("should be assignable from SearchProviderError properties", () => {
    const err = new SearchProviderError("SerpAPI", 429, true, "quota exhausted");
    const info: SearchProviderErrorInfo = {
      provider: err.provider,
      status: err.status,
      message: err.message,
      fatal: err.fatal,
    };
    expect(info.provider).toBe("SerpAPI");
    expect(info.status).toBe(429);
    expect(info.fatal).toBe(true);
  });
});

describe("SerpAPI error detection", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.SERPAPI_API_KEY = "test_api_key_12345";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should throw SearchProviderError on HTTP 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: () => Promise.resolve('{"error": "Your account has run out of searches."}'),
    }));

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    try {
      await searchSerpApi({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expectSearchProviderError(err, { provider: "SerpAPI", status: 429, fatal: true, messageContains: "429" });
    }
  });

  it("should throw SearchProviderError on HTTP 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: () => Promise.resolve("Access denied"),
    }));

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    try {
      await searchSerpApi({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expectSearchProviderError(err, { provider: "SerpAPI", status: 403, fatal: true });
    }
  });

  it("should throw SearchProviderError on body containing 'out of searches'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      statusText: "Payment Required",
      text: () => Promise.resolve("Your account has run out of searches. Please upgrade."),
    }));

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    try {
      await searchSerpApi({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expectSearchProviderError(err, { fatal: true, messageContains: "out of searches" });
    }
  });

  it("should throw SearchProviderError on 200 response with API error in body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        error: "Your account has run out of searches.",
      }),
    }));

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    try {
      await searchSerpApi({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expectSearchProviderError(err, { provider: "SerpAPI", fatal: true });
    }
  });

  it("should NOT throw on normal HTTP 500 (non-quota error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("Server error"),
    }));

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    const result = await searchSerpApi({ query: "test", maxResults: 5 });
    expect(result).toEqual([]);
  });

  it("should return results normally on successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        organic_results: [
          { title: "Test Result", link: "https://example.com", snippet: "A test" },
        ],
      }),
    }));

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    const result = await searchSerpApi({ query: "test", maxResults: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com");
  });

  it("should throw on quota-related body keywords", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: () => Promise.resolve("Your quota has been exceeded"),
    }));

    const { searchSerpApi } = await import("@/lib/search-serpapi");

    try {
      await searchSerpApi({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expectSearchProviderError(err, { provider: "SerpAPI", fatal: true });
    }
  });
});

describe("Google CSE error detection", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.GOOGLE_CSE_API_KEY = "test_api_key";
    process.env.GOOGLE_CSE_ID = "test_cse_id";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should throw SearchProviderError on HTTP 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: () => Promise.resolve("Rate limit exceeded"),
    }));

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    try {
      await searchGoogleCse({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expectSearchProviderError(err, { provider: "Google-CSE", status: 429, fatal: true });
    }
  });

  it("should throw SearchProviderError on quota error in response body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        error: { message: "Daily quota exceeded for project", code: 429 },
      }),
    }));

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    try {
      await searchGoogleCse({ query: "test", maxResults: 5 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expectSearchProviderError(err, { provider: "Google-CSE", fatal: true });
    }
  });

  it("should NOT throw on normal HTTP 500", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("Server error"),
    }));

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    const result = await searchGoogleCse({ query: "test", maxResults: 5 });
    expect(result).toEqual([]);
  });
});

describe("WebSearchResponse error propagation", () => {
  it("should include errors in WebSearchResponse type", () => {
    const response: WebSearchResponse = {
      results: [],
      providersUsed: ["SerpAPI"],
      errors: [
        { provider: "SerpAPI", status: 429, message: "Out of searches", fatal: true },
      ],
    };
    expect(response.errors).toHaveLength(1);
    expect(response.errors![0].fatal).toBe(true);
    expect(response.errors![0].status).toBe(429);
  });

  it("should allow WebSearchResponse without errors", () => {
    const response: WebSearchResponse = {
      results: [{ url: "https://example.com", title: "Test", snippet: null }],
      providersUsed: ["SerpAPI"],
    };
    expect(response.errors).toBeUndefined();
  });
});
