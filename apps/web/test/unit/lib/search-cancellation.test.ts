import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEventListeners } from "node:events";
import { generateCacheKey } from "@/lib/search-cache";
const providers = [
  ["SerpAPI", () => import("@/lib/search-serpapi").then(m => m.searchSerpApi)],
  ["Google-CSE", () => import("@/lib/search-google-cse").then(m => m.searchGoogleCse)],
  ["Brave", () => import("@/lib/search-brave").then(m => m.searchBrave)],
  ["Serper", () => import("@/lib/search-serper").then(m => m.searchSerper)],
  ["Wikipedia", () => import("@/lib/search-wikipedia").then(m => m.searchWikipedia)],
  ["Semantic-Scholar", () => import("@/lib/search-semanticscholar").then(m => m.searchSemanticScholar)],
  ["Google-FactCheck", () => import("@/lib/search-factcheck-api").then(m => m.searchGoogleFactCheck)],
] as const;
beforeEach(() => {
  vi.resetModules();
  for (const key of ["SERPAPI_API_KEY", "GOOGLE_CSE_API_KEY", "GOOGLE_CSE_ID", "BRAVE_API_KEY", "SERPER_API_KEY", "SEMANTIC_SCHOLAR_API_KEY", "GOOGLE_FACTCHECK_API_KEY"]) vi.stubEnv(key, "offline-fixture");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe.each(providers)("%s parent cancellation", (name, load) => {
  it("does not send a pre-aborted call", async () => {
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    const search = await load(); const signal = AbortSignal.abort();
    await expect(search({ query: "fixture", maxResults: 1, abortSignal: signal })).rejects.toBe(signal.reason);
    expect(send).not.toHaveBeenCalled();
  });
  if (name === "Google-CSE" || name === "Semantic-Scholar") it("settles cancelled throttle waiters without waiting for their slots or sending HTTP", async () => {
    const search = await load();
    const send = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ items: [], data: [] }) }));
    vi.stubGlobal("fetch", send);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01"));
    try {
      await search({ query: "fixture", maxResults: 1 });
      send.mockClear();
      const parent = new AbortController();
      const pending = Promise.allSettled(Array.from({ length: 5 }, () => search({ query: "fixture", maxResults: 1, abortSignal: parent.signal })));
      await vi.advanceTimersByTimeAsync(0);
      parent.abort();
      const results = await pending;
      await vi.advanceTimersByTimeAsync(0);
      expect(results.every(result => result.status === "rejected" && result.reason === parent.signal.reason)).toBe(true);
      expect(send).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it.each(["headers", "body"])("propagates parent TimeoutError during %s without swallowing it", async (phase) => {
    const search = await load(); const parent = new AbortController();
    const reason = new DOMException("upstream deadline", "TimeoutError");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = vi.fn(async (_url, init) => {
      timer = setTimeout(() => parent.abort(reason), 5);
      if (phase === "headers") return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
      return new Response(new ReadableStream({ start(controller) {
        init.signal.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
      } }), { headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", send);
    try { await expect(search({ query: "fixture", maxResults: 1, abortSignal: parent.signal })).rejects.toBe(reason); }
    finally { clearTimeout(timer); }
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("retains empty-result handling for a local provider timeout", async () => {
    const search = await load();
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    })));
    expect(await search({ query: "fixture", maxResults: 1, timeoutMs: 10, abortSignal: new AbortController().signal })).toEqual([]);
  });
  // Wikipedia classifies non-OK statuses without reading an error body.
  if (name !== "Wikipedia") it("does not classify an aborted error-body read as provider failure", async () => {
    const search = await load(); const parent = new AbortController(); const reason = new Error("request ended");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429, text: async () => { parent.abort(reason); throw reason; } })));
    await expect(search({ query: "fixture", maxResults: 1, abortSignal: parent.signal })).rejects.toBe(reason);
  });
});
it("excludes signals from cache identity without opening a database", () => {
  const options = { query: "fixture", maxResults: 3 };
  expect(generateCacheKey({ ...options, abortSignal: new AbortController().signal })).toBe(generateCacheKey(options));
});
it("forty concurrent native signal compositions leave no parent listeners or warnings", async () => {
  const { searchBrave } = await import("@/lib/search-brave");
  const parent = new AbortController(); const warnings: Error[] = []; const onWarning = (warning: Error) => warnings.push(warning);
  process.on("warning", onWarning);
  let started = 0;
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    if (++started === 40) queueMicrotask(() => parent.abort());
  })));
  try {
    const results = await Promise.allSettled(Array.from({ length: 40 }, () => searchBrave({ query: "fixture", maxResults: 1, abortSignal: parent.signal })));
    await new Promise(resolve => setImmediate(resolve));
    expect(results.every(r => r.status === "rejected")).toBe(true);
    expect(getEventListeners(parent.signal, "abort")).toHaveLength(0);
    expect(warnings.filter(w => w.name === "MaxListenersExceededWarning")).toEqual([]);
  } finally { process.off("warning", onWarning); }
});
