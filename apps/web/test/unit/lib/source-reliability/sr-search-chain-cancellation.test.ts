import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/search-cache", () => ({ getCachedSearchResults: async () => null, cacheSearchResults: vi.fn() }));
vi.mock("@/lib/fact-checker-service", () => ({ getGlobalFactCheckerSites: () => [], getRegionalFactCheckerQueries: () => [] }));

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("settles real SR search-chain records after cancelling a throttled wave and serves a later live query", async () => {
  vi.resetModules();
  vi.stubEnv("GOOGLE_CSE_API_KEY", "offline-fixture"); vi.stubEnv("GOOGLE_CSE_ID", "offline-fixture");
  vi.stubEnv("GOOGLE_CSE_MIN_INTERVAL_MS", "20");
  const throttle = await import("@/lib/search-throttle");
  const acquire = throttle.acquireGoogleCseSlot;
  const parent = new AbortController(); let attempts = 0;
  // Instrument entry only; the real queue, adapter, logical-search recorder and
  // evidence-pack wave join remain in use, with no substituted cancellation.
  vi.spyOn(throttle, "acquireGoogleCseSlot").mockImplementation(signal => {
    const pending = acquire(signal); attempts++; return pending;
  });
  // Install instrumentation before consumers bind the exported acquisition.
  const { buildEvidencePack } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
  const { searchWebWithProvider } = await import("@/lib/web-search");
  const { captureMetrics } = await import("@/lib/analyzer/metrics-integration");
  const { DEFAULT_SR_CONFIG, DEFAULT_SEARCH_CONFIG } = await import("@/lib/config-schemas");
  // searchWebWithProvider loads its adapter lazily; finish that real module I/O
  // before fake-clock advancement so the test can observe acquisition itself.
  await import("@/lib/search-google-cse");
  let sends = 0; let sendsAfterAbort = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (String(url) === "https://outlet.test") return new Response('<html lang="en"></html>');
    expect(String(url)).toMatch(/^https:\/\/www\.googleapis\.com\/customsearch\/v1\?/);
    sends++; if (parent.signal.aborted) sendsAfterAbort++;
    return new Response(JSON.stringify({ items: [] }), { headers: { "content-type": "application/json" } });
  }));
  const searchConfig = {
    ...DEFAULT_SEARCH_CONFIG, provider: "google-cse" as const, cache: { enabled: false, ttlDays: 7 },
    providers: Object.fromEntries(Object.entries(DEFAULT_SEARCH_CONFIG.providers).map(([key, value]) =>
      [key, { ...value, enabled: key === "googleCse" }])) as typeof DEFAULT_SEARCH_CONFIG.providers,
  };
  vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01"));
  const pending = captureMetrics(() => buildEvidencePack("outlet.test", {
    ...DEFAULT_SR_CONFIG, searchConfig, evalUseSearch: true, evalMaxResultsPerQuery: 5,
    evalMaxEvidenceItems: 30, requestStartedAtMs: Date.now(), requestBudgetMs: 90_000, abortSignal: parent.signal,
  } as any));
  const liveParent = new AbortController();
  let later: ReturnType<typeof searchWebWithProvider> | undefined;
  try {
    // Body/cache promises can schedule the next serial query after a clock step.
    for (let step = 0; attempts < 6 && step < 50; step++) await vi.advanceTimersByTimeAsync(20);
    expect(attempts).toBe(6);
    expect(sends).toBe(3); parent.abort(new Error("wave cancelled"));
    const result = await pending; await vi.advanceTimersByTimeAsync(0);
    expect(result.ok).toBe(false); expect(!result.ok && result.error).toBe(parent.signal.reason);
    expect(attempts).toBe(6); expect(sendsAfterAbort).toBe(0);
    expect(result.captured.searchQueries).toHaveLength(6);
    expect(result.captured.searchQueries.map(query => query.success)).toEqual([true, true, true, false, false, false]);
    expect(result.captured.searchQueries.every(query => query.provider === "Google-CSE")).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    later = searchWebWithProvider({ query: "fixture", maxResults: 1, config: searchConfig, abortSignal: liveParent.signal });
    await vi.advanceTimersByTimeAsync(20); await later;
    expect(sends).toBe(4); expect(vi.getTimerCount()).toBe(0);
  } finally {
    parent.abort(); liveParent.abort();
    await Promise.allSettled(later ? [pending, later] : [pending]);
  }
});
