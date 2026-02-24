/**
 * Tests for Google Fact Check Tools API integration.
 *
 * Validates standard provider mapping, rich structured data extraction,
 * error handling, URL deduplication, and result parsing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchProviderError } from "@/lib/web-search";

describe("Google Fact Check Tools API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.GOOGLE_FACTCHECK_API_KEY = "test_factcheck_api_key_12345";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ========================================================================
  // Standard provider (searchGoogleFactCheck)
  // ========================================================================

  describe("searchGoogleFactCheck (standard provider)", () => {
    it("should map claims/reviews to WebSearchResult format", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          claims: [
            {
              text: "The earth is flat",
              claimant: "Anonymous",
              claimReview: [
                {
                  publisher: { name: "Snopes", site: "snopes.com" },
                  url: "https://snopes.com/fact-check/flat-earth",
                  title: "Is the Earth Flat?",
                  textualRating: "False",
                  languageCode: "en",
                },
              ],
            },
          ],
        }),
      }));

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      const results = await searchGoogleFactCheck({ query: "flat earth", maxResults: 10 });
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe("https://snopes.com/fact-check/flat-earth");
      expect(results[0].title).toBe("Is the Earth Flat?");
      expect(results[0].snippet).toBe("[Snopes] False: The earth is flat");
    });

    it("should deduplicate reviews by URL", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          claims: [
            {
              text: "Claim A",
              claimReview: [
                {
                  publisher: { name: "Snopes", site: "snopes.com" },
                  url: "https://snopes.com/fact-check/123",
                  title: "Review 1",
                  textualRating: "False",
                  languageCode: "en",
                },
              ],
            },
            {
              text: "Claim B",
              claimReview: [
                {
                  publisher: { name: "Snopes", site: "snopes.com" },
                  url: "https://snopes.com/fact-check/123", // same URL
                  title: "Review 1",
                  textualRating: "False",
                  languageCode: "en",
                },
              ],
            },
          ],
        }),
      }));

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      const results = await searchGoogleFactCheck({ query: "test", maxResults: 10 });
      expect(results).toHaveLength(1); // deduped
    });

    it("should return empty array if no claims in response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      }));

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      const results = await searchGoogleFactCheck({ query: "test", maxResults: 5 });
      expect(results).toEqual([]);
    });

    it("should return empty array when API key is not configured", async () => {
      delete process.env.GOOGLE_FACTCHECK_API_KEY;

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      const results = await searchGoogleFactCheck({ query: "test", maxResults: 5 });
      expect(results).toEqual([]);
    });

    it("should throw SearchProviderError on HTTP 429 (rate limit)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: () => Promise.resolve("Rate limit exceeded"),
      }));

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      try {
        await searchGoogleFactCheck({ query: "test", maxResults: 5 });
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err.name).toBe("SearchProviderError");
        expect(err.provider).toBe("Google-FactCheck");
        expect(err.status).toBe(429);
        expect(err.fatal).toBe(true);
      }
    });

    it("should throw SearchProviderError on HTTP 403 (invalid API key)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: () => Promise.resolve("API key not valid"),
      }));

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      try {
        await searchGoogleFactCheck({ query: "test", maxResults: 5 });
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err.name).toBe("SearchProviderError");
        expect(err.provider).toBe("Google-FactCheck");
        expect(err.status).toBe(403);
        expect(err.fatal).toBe(true);
      }
    });

    it("should return empty array on HTTP 400 (bad request)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("Invalid query"),
      }));

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      const results = await searchGoogleFactCheck({ query: "", maxResults: 5 });
      expect(results).toEqual([]);
    });

    it("should handle multiple reviews per claim", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          claims: [
            {
              text: "Vaccines cause autism",
              claimReview: [
                {
                  publisher: { name: "Snopes", site: "snopes.com" },
                  url: "https://snopes.com/vaccines-autism",
                  title: "Snopes Review",
                  textualRating: "False",
                  languageCode: "en",
                },
                {
                  publisher: { name: "PolitiFact", site: "politifact.com" },
                  url: "https://politifact.com/vaccines-autism",
                  title: "PolitiFact Review",
                  textualRating: "Pants on Fire",
                  languageCode: "en",
                },
              ],
            },
          ],
        }),
      }));

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      const results = await searchGoogleFactCheck({ query: "vaccines autism", maxResults: 10 });
      expect(results).toHaveLength(2);
      expect(results[0].snippet).toContain("Snopes");
      expect(results[1].snippet).toContain("PolitiFact");
    });

    it("should respect maxResults limit", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          claims: [
            {
              text: "Claim 1",
              claimReview: [
                { publisher: { name: "P1", site: "p1.com" }, url: "https://p1.com/1", title: "R1", textualRating: "False", languageCode: "en" },
              ],
            },
            {
              text: "Claim 2",
              claimReview: [
                { publisher: { name: "P2", site: "p2.com" }, url: "https://p2.com/2", title: "R2", textualRating: "True", languageCode: "en" },
              ],
            },
            {
              text: "Claim 3",
              claimReview: [
                { publisher: { name: "P3", site: "p3.com" }, url: "https://p3.com/3", title: "R3", textualRating: "Mixed", languageCode: "en" },
              ],
            },
          ],
        }),
      }));

      const { searchGoogleFactCheck } = await import("@/lib/search-factcheck-api");

      const results = await searchGoogleFactCheck({ query: "test", maxResults: 2 });
      expect(results).toHaveLength(2);
    });
  });

  // ========================================================================
  // Rich query (queryFactCheckApi)
  // ========================================================================

  describe("queryFactCheckApi (rich structured data)", () => {
    it("should return structured claim data with reviews", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          claims: [
            {
              text: "The earth is flat",
              claimant: "Internet meme",
              claimDate: "2023-01-15",
              claimReview: [
                {
                  publisher: { name: "Snopes", site: "snopes.com" },
                  url: "https://snopes.com/flat-earth",
                  title: "Is the Earth Flat?",
                  textualRating: "False",
                  languageCode: "en",
                  reviewDate: "2023-02-01",
                },
              ],
            },
          ],
        }),
      }));

      const { queryFactCheckApi } = await import("@/lib/search-factcheck-api");

      const result = await queryFactCheckApi("flat earth");
      expect(result.claims).toHaveLength(1);
      expect(result.claims![0].text).toBe("The earth is flat");
      expect(result.claims![0].claimant).toBe("Internet meme");
      expect(result.claims![0].claimReview).toHaveLength(1);
      expect(result.claims![0].claimReview[0].textualRating).toBe("False");
    });

    it("should return empty claims when API key is missing", async () => {
      delete process.env.GOOGLE_FACTCHECK_API_KEY;

      const { queryFactCheckApi } = await import("@/lib/search-factcheck-api");

      const result = await queryFactCheckApi("test");
      expect(result.claims).toEqual([]);
    });

    it("should throw SearchProviderError on HTTP 429", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      }));

      const { queryFactCheckApi } = await import("@/lib/search-factcheck-api");

      try {
        await queryFactCheckApi("test");
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err.name).toBe("SearchProviderError");
        expect(err.provider).toBe("Google-FactCheck");
        expect(err.status).toBe(429);
      }
    });

    it("should return empty claims on non-fatal HTTP errors", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }));

      const { queryFactCheckApi } = await import("@/lib/search-factcheck-api");

      const result = await queryFactCheckApi("test");
      expect(result.claims).toEqual([]);
    });

    it("should pass maxAgeDays and languageCode parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ claims: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { queryFactCheckApi } = await import("@/lib/search-factcheck-api");

      await queryFactCheckApi("test", { maxAgeDays: 365, languageCode: "de", maxResults: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("maxAgeDays=365"),
        expect.anything(),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("languageCode=de"),
        expect.anything(),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pageSize=10"),
        expect.anything(),
      );
    });
  });
});
