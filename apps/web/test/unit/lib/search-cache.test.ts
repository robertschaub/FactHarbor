/**
 * Tests for search cache (SQLite-based caching).
 *
 * Validates cache hit/miss, TTL expiration, and key generation.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getCachedSearchResults,
  cacheSearchResults,
  clearAllCache,
  getCacheStats,
  closeSearchCacheDb,
} from "@/lib/search-cache";
import type { WebSearchOptions, WebSearchResult } from "@/lib/web-search";

const TEST_CACHE_CONFIG = { enabled: true, ttlDays: 7 };

describe("Search Cache", () => {
  beforeEach(async () => {
    // Clear cache before each test
    await clearAllCache();
  });

  afterEach(async () => {
    // Close DB connection after each test
    await closeSearchCacheDb();
  });

  it("should return null on cache miss", async () => {
    const options: WebSearchOptions = {
      query: "test query",
      maxResults: 5,
    };

    const cached = await getCachedSearchResults(options, TEST_CACHE_CONFIG);
    expect(cached).toBeNull();
  });

  it("should cache and retrieve search results", async () => {
    const options: WebSearchOptions = {
      query: "test query",
      maxResults: 5,
    };

    const results: WebSearchResult[] = [
      { url: "https://example.com", title: "Test", snippet: "A test result" },
    ];

    // Cache results
    await cacheSearchResults(options, results, "SerpAPI", TEST_CACHE_CONFIG);

    // Retrieve from cache
    const cached = await getCachedSearchResults(options, TEST_CACHE_CONFIG);
    expect(cached).not.toBeNull();
    expect(cached!.results).toHaveLength(1);
    expect(cached!.results[0].url).toBe("https://example.com");
    expect(cached!.provider).toBe("SerpAPI");
  });

  it("should respect cache enabled flag", async () => {
    const options: WebSearchOptions = {
      query: "test query",
      maxResults: 5,
    };

    const results: WebSearchResult[] = [
      { url: "https://example.com", title: "Test", snippet: null },
    ];

    // Cache with enabled=false should be a no-op
    await cacheSearchResults(options, results, "SerpAPI", { enabled: false, ttlDays: 7 });

    // Retrieve should return null even though we "cached"
    const cached = await getCachedSearchResults(options, { enabled: false, ttlDays: 7 });
    expect(cached).toBeNull();
  });

  it("should differentiate cache keys by query", async () => {
    const options1: WebSearchOptions = { query: "query1", maxResults: 5 };
    const options2: WebSearchOptions = { query: "query2", maxResults: 5 };

    await cacheSearchResults(options1, [{ url: "https://a.com", title: "A", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);
    await cacheSearchResults(options2, [{ url: "https://b.com", title: "B", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);

    const cached1 = await getCachedSearchResults(options1, TEST_CACHE_CONFIG);
    const cached2 = await getCachedSearchResults(options2, TEST_CACHE_CONFIG);

    expect(cached1!.results[0].url).toBe("https://a.com");
    expect(cached2!.results[0].url).toBe("https://b.com");
  });

  it("should differentiate cache keys by maxResults", async () => {
    const options1: WebSearchOptions = { query: "same", maxResults: 5 };
    const options2: WebSearchOptions = { query: "same", maxResults: 10 };

    await cacheSearchResults(options1, [{ url: "https://five.com", title: "Five", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);
    await cacheSearchResults(options2, [{ url: "https://ten.com", title: "Ten", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);

    const cached1 = await getCachedSearchResults(options1, TEST_CACHE_CONFIG);
    const cached2 = await getCachedSearchResults(options2, TEST_CACHE_CONFIG);

    expect(cached1!.results[0].url).toBe("https://five.com");
    expect(cached2!.results[0].url).toBe("https://ten.com");
  });

  it("should differentiate cache keys by dateRestrict", async () => {
    const options1: WebSearchOptions = { query: "same", maxResults: 5, dateRestrict: "y" };
    const options2: WebSearchOptions = { query: "same", maxResults: 5, dateRestrict: "m" };

    await cacheSearchResults(options1, [{ url: "https://year.com", title: "Year", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);
    await cacheSearchResults(options2, [{ url: "https://month.com", title: "Month", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);

    const cached1 = await getCachedSearchResults(options1, TEST_CACHE_CONFIG);
    const cached2 = await getCachedSearchResults(options2, TEST_CACHE_CONFIG);

    expect(cached1!.results[0].url).toBe("https://year.com");
    expect(cached2!.results[0].url).toBe("https://month.com");
  });

  it("should differentiate cache keys by domain whitelist", async () => {
    const options1: WebSearchOptions = { query: "same", maxResults: 5, domainWhitelist: ["example.com"] };
    const options2: WebSearchOptions = { query: "same", maxResults: 5, domainWhitelist: ["other.com"] };

    await cacheSearchResults(options1, [{ url: "https://example.com", title: "Example", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);
    await cacheSearchResults(options2, [{ url: "https://other.com", title: "Other", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);

    const cached1 = await getCachedSearchResults(options1, TEST_CACHE_CONFIG);
    const cached2 = await getCachedSearchResults(options2, TEST_CACHE_CONFIG);

    expect(cached1!.results[0].url).toBe("https://example.com");
    expect(cached2!.results[0].url).toBe("https://other.com");
  });

  it("should return cache stats", async () => {
    const options: WebSearchOptions = { query: "test", maxResults: 5 };
    await cacheSearchResults(options, [{ url: "https://a.com", title: "A", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);

    const stats = await getCacheStats();
    expect(stats.totalEntries).toBeGreaterThan(0);
    expect(stats.validEntries).toBeGreaterThan(0);
    expect(stats.providerBreakdown["SerpAPI"]).toBeGreaterThan(0);
  });

  it("should clear all cache", async () => {
    const options: WebSearchOptions = { query: "test", maxResults: 5 };
    await cacheSearchResults(options, [{ url: "https://a.com", title: "A", snippet: null }], "SerpAPI", TEST_CACHE_CONFIG);

    const deleted = await clearAllCache();
    expect(deleted).toBeGreaterThan(0);

    const cached = await getCachedSearchResults(options, TEST_CACHE_CONFIG);
    expect(cached).toBeNull();
  });

  it("should handle TTL expiration (simulated by setting ttlDays=0)", async () => {
    const options: WebSearchOptions = { query: "test", maxResults: 5 };
    const results: WebSearchResult[] = [{ url: "https://a.com", title: "A", snippet: null }];

    // Cache with 0-day TTL (immediate expiration)
    await cacheSearchResults(options, results, "SerpAPI", { enabled: true, ttlDays: 0 });

    // Should return null because TTL is 0 days (expired immediately)
    const cached = await getCachedSearchResults(options, { enabled: true, ttlDays: 0 });
    expect(cached).toBeNull();
  });

  it("should override module-level config with passed cacheConfig", async () => {
    const options: WebSearchOptions = { query: "override test", maxResults: 5 };
    const results: WebSearchResult[] = [{ url: "https://override.com", title: "Override", snippet: null }];

    // Cache with enabled=true
    await cacheSearchResults(options, results, "SerpAPI", { enabled: true, ttlDays: 7 });

    // Retrieve with enabled=false should return null (override wins)
    const cached = await getCachedSearchResults(options, { enabled: false, ttlDays: 7 });
    expect(cached).toBeNull();
  });
});
