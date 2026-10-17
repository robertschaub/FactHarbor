import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("sqlite", () => ({ open: mocks.open }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("FH_SEARCH_CACHE_PATH", path.resolve("offline-cache", "search.db"));
  vi.stubEnv("FH_SEARCH_CACHE_ENABLED", "true");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Search cache path and initialization", () => {
  it("resolves explicit, SR, config and local paths with deterministic precedence", async () => {
    const { resolveSearchCachePath } = await import("@/lib/search-cache");
    const sr = path.join("sr-data", "reliability.db"), config = path.join("config-data", "config.db");
    expect(resolveSearchCachePath({ FH_SEARCH_CACHE_PATH: "explicit.db", FH_SR_CACHE_PATH: sr, FH_CONFIG_DB_PATH: config })).toBe(path.resolve("explicit.db"));
    expect(resolveSearchCachePath({ FH_SR_CACHE_PATH: sr, FH_CONFIG_DB_PATH: config })).toBe(path.resolve("sr-data", "search-cache.db"));
    expect(resolveSearchCachePath({ FH_SR_CACHE_PATH: sr })).toBe(path.resolve("sr-data", "search-cache.db"));
    expect(resolveSearchCachePath({ FH_CONFIG_DB_PATH: config })).toBe(path.resolve("config-data", "search-cache.db"));
    expect(resolveSearchCachePath({})).toBe(path.resolve("search-cache.db"));
    expect(resolveSearchCachePath({ FH_SEARCH_CACHE_PATH: "", FH_SR_CACHE_PATH: "", FH_CONFIG_DB_PATH: config })).toBe(path.resolve("config-data", "search-cache.db"));
    expect(mocks.open).not.toHaveBeenCalled();
  });

  it("retains one failed attempt and one error across concurrent callers, maintenance and close", async () => {
    mocks.open.mockRejectedValue(new Error("SQLITE_CANTOPEN"));
    const cache = await import("@/lib/search-cache");
    const options = { query: "cache plumbing fixture", maxResults: 1 };
    const results = await Promise.all(Array.from({ length: 5 }, () => cache.getCachedSearchResults(options)));
    expect(results).toEqual([null, null, null, null, null]);
    await cache.cacheSearchResults(options, [], "offline");
    expect(await cache.cleanupExpiredCache()).toBe(0);
    expect(await cache.clearAllCache()).toBe(0);
    expect((await cache.getCacheStats()).totalEntries).toBe(0);
    await cache.closeSearchCacheDb();
    expect(await cache.getSearchCacheHealth()).toEqual({ ok: false, status: "unavailable" });
    expect(mocks.open).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.error).mock.calls[0][0]).toContain(path.resolve("offline-cache", "search.db"));
  });

  it("closes a partially initialized handle and retains failure", async () => {
    const instance = { exec: vi.fn().mockRejectedValue(new Error("schema initialization failed")), close: vi.fn().mockResolvedValue(undefined) };
    mocks.open.mockResolvedValue(instance);
    const cache = await import("@/lib/search-cache");
    expect(await cache.getSearchCacheHealth()).toEqual({ ok: false, status: "unavailable" });
    expect(await cache.getSearchCacheHealth()).toEqual({ ok: false, status: "unavailable" });
    expect(instance.close).toHaveBeenCalledTimes(1);
    expect(mocks.open).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("does not open a disabled cache; explicit UCM enablement can initialize it once", async () => {
    vi.stubEnv("FH_SEARCH_CACHE_ENABLED", "false");
    const instance = { exec: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
    mocks.open.mockResolvedValue(instance);
    const cache = await import("@/lib/search-cache");
    expect(await cache.getSearchCacheHealth()).toEqual({ ok: true, status: "disabled" });
    expect(mocks.open).not.toHaveBeenCalled();
    expect(await cache.getSearchCacheHealth(true)).toEqual({ ok: true, status: "ready" });
    expect(await cache.getSearchCacheHealth(true)).toEqual({ ok: true, status: "ready" });
    expect(mocks.open).toHaveBeenCalledTimes(1);
    expect(mocks.open.mock.calls[0][0].filename).toBe(path.resolve("offline-cache", "search.db"));
    expect(instance.exec).toHaveBeenCalledTimes(2);
    await cache.closeSearchCacheDb();
  });
});
