/**
 * Tests for Google CSE search integration.
 *
 * Validates geo-aware parameter threading and BCP-47 language code handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Google CSE Search", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.GOOGLE_CSE_API_KEY = "test_google_cse_key";
    process.env.GOOGLE_CSE_ID = "test_cse_id";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should pass gl and lr params when geography and language are provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    await searchGoogleCse({ query: "test", maxResults: 5, language: "de", geography: "CH" });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("gl=ch");
    expect(calledUrl).toContain("lr=lang_de");
  });

  it("should strip BCP-47 region subtag from language for lr param", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    await searchGoogleCse({ query: "test", maxResults: 5, language: "de-CH" });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("lr=lang_de");
    expect(calledUrl).not.toContain("lang_de-ch");
  });

  it("should strip BCP-47 region subtag for pt-BR", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    await searchGoogleCse({ query: "test", maxResults: 5, language: "pt-BR", geography: "BR" });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("lr=lang_pt");
    expect(calledUrl).toContain("gl=br");
  });

  it("should NOT set gl/lr params when geography and language are undefined", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    await searchGoogleCse({ query: "test", maxResults: 5 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("gl=");
    expect(calledUrl).not.toContain("lr=");
  });

  it("should parse successful response into WebSearchResult[]", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        items: [
          { title: "Result 1", link: "https://example.com/1", snippet: "Snippet 1" },
          { title: "Result 2", link: "https://example.com/2" },
        ],
      }),
    }));

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    const results = await searchGoogleCse({ query: "test", maxResults: 5 });
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ url: "https://example.com/1", title: "Result 1", snippet: "Snippet 1" });
    expect(results[1].snippet).toBeNull();
  });

  it("should return empty array when API key is not configured", async () => {
    delete process.env.GOOGLE_CSE_API_KEY;

    vi.stubGlobal("fetch", vi.fn());

    const { searchGoogleCse } = await import("@/lib/search-google-cse");

    const results = await searchGoogleCse({ query: "test", maxResults: 5 });
    expect(results).toEqual([]);
  });
});
