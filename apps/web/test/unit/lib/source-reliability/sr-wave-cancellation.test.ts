import { afterEach, expect, it, vi } from "vitest";
const search = vi.hoisted(() => vi.fn());
vi.mock("@/lib/web-search", () => ({ searchWebWithProvider: search, getActiveSearchProviders: () => ["fixture"] }));
vi.mock("@/lib/fact-checker-service", () => ({ getGlobalFactCheckerSites: () => [], getRegionalFactCheckerQueries: () => [] }));
import { buildEvidencePack } from "@/lib/source-reliability/sr-eval-evidence-pack";
import { captureMetrics, recordSearchQuery } from "@/lib/analyzer/metrics-integration";
import { DEFAULT_SEARCH_CONFIG, DEFAULT_SR_CONFIG } from "@/lib/config-schemas";
import type { SrEvalConfig } from "@/lib/source-reliability/sr-eval-types";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it("settles all three in-flight wave branches before capturing cancellation accounting", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(async () => new Response('<html lang="en"></html>')));
  const parent = new AbortController(); const reason = new Error("wave cancelled");
  let sends = 0; let allStarted!: () => void;
  const started = new Promise<void>(resolve => { allStarted = resolve; });
  search.mockImplementation(async (options) => {
    const ordinal = ++sends;
    const record = (success: boolean) => recordSearchQuery({ query: options.query, provider: "fixture", resultsCount: 0, durationMs: 1, success, cached: false, timestamp: new Date() });
    // Empty fact-checker fixtures leave the three existing standard queries first.
    if (ordinal <= 3) { record(true); return { results: [], providersUsed: ["fixture"] }; }
    try { return await new Promise((_resolve, reject) => {
      options.abortSignal.addEventListener("abort", () => setTimeout(() => { reject(reason); }, ordinal === 4 ? 0 : 20), { once: true });
      if (ordinal === 6) allStarted();
    }); } catch (error) { record(false); throw error; }
  });
  let completed = false;
  const pending = captureMetrics(() => buildEvidencePack("outlet.test", {
    ...DEFAULT_SR_CONFIG, searchConfig: DEFAULT_SEARCH_CONFIG, evalUseSearch: true, evalMaxResultsPerQuery: 5,
    evalMaxEvidenceItems: 30, requestStartedAtMs: Date.now(), requestBudgetMs: 90_000, abortSignal: parent.signal,
  } as SrEvalConfig)).then(result => { completed = true; return result; });
  await started; parent.abort(reason);
  await vi.advanceTimersByTimeAsync(0);
  expect(completed).toBe(false);
  await vi.advanceTimersByTimeAsync(20);
  const result = await pending;
  expect(result.ok).toBe(false); expect(!result.ok && result.error).toBe(reason);
  expect(sends).toBe(6); expect(result.captured.searchQueries).toHaveLength(6);
  expect(result.captured.searchQueries.filter(q => !q.success)).toHaveLength(3);
  expect(vi.getTimerCount()).toBe(0);
});
