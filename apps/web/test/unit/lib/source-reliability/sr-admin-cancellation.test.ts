import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cache: vi.fn(), lookup: vi.fn(), config: vi.fn() }));
vi.mock("@/lib/source-reliability-cache", () => ({ setCachedScore: mocks.cache, batchGetCachedData: mocks.lookup }));
vi.mock("@/lib/config-storage", () => ({ getConfig: mocks.config }));
vi.mock("@/lib/auth", () => ({ checkAdminKey: () => true, getEnv: () => "offline" }));
import { POST } from "@/app/api/admin/source-reliability/route";
beforeEach(() => {
  mocks.cache.mockReset().mockResolvedValue(undefined); mocks.lookup.mockReset().mockResolvedValue(new Map());
  mocks.config.mockReset().mockResolvedValue({ config: { multiModel: true, confidenceThreshold: 0.8, consensusThreshold: 0.2 } });
});
afterEach(() => vi.unstubAllGlobals());
it.each(["body", "after-cache", "root-body"])("admin cancellation at %s stops cache writes and subsequent domains", async (stage) => {
  const parent = new AbortController(); const reason = new Error("admin disconnected");
  let calls = 0;
  const send = vi.fn(async (_url, init) => {
    expect(init.signal.aborted).toBe(false);
    calls++;
    return { ok: true, json: async () => {
      if (stage === "body" || (stage === "root-body" && calls === 2)) parent.abort(reason);
      return { score: null, confidence: 0.7, consensusAchieved: true };
    } };
  });
  if (stage === "after-cache") mocks.cache.mockImplementationOnce(async () => { parent.abort(reason); });
  vi.stubGlobal("fetch", send);
  const req = new Request("http://localhost/api/admin/source-reliability", { method: "POST", signal: parent.signal,
    body: JSON.stringify({ domains: "news.example.com,second.example.org", forceReevaluate: true }) });
  await expect(POST(req)).rejects.toBe(reason);
  expect(send).toHaveBeenCalledTimes(stage === "root-body" ? 2 : 1);
  expect(mocks.cache).toHaveBeenCalledTimes(stage === "body" ? 0 : 1);
});
it("starts no evaluation after disconnect during configuration loading", async () => {
  const parent = new AbortController(); const reason = new Error("disconnected");
  mocks.config.mockImplementationOnce(async () => { parent.abort(reason); return { config: {} }; });
  const send = vi.fn(); vi.stubGlobal("fetch", send);
  await expect(POST(new Request("http://localhost/api/admin/source-reliability", { method: "POST", signal: parent.signal,
    body: JSON.stringify({ domains: "example.com", forceReevaluate: true }) }))).rejects.toBe(reason);
  expect(send).not.toHaveBeenCalled(); expect(mocks.cache).not.toHaveBeenCalled();
});

it("continues to the next domain after an internal deadline failure while the Admin request is live", async () => {
  const send = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Evaluation error", details: "TimeoutError", accounting: { llmCalls: [], searchQueries: [] } }), { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ score: 0.6, confidence: 0.7, consensusAchieved: true }), { status: 200 }));
  vi.stubGlobal("fetch", send);
  const response = await POST(new Request("http://localhost/api/admin/source-reliability", { method: "POST",
    body: JSON.stringify({ domains: "example.com,example.org", forceReevaluate: true }) }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.results.map((entry: { success: boolean }) => entry.success)).toEqual([false, true]);
  expect(send).toHaveBeenCalledTimes(2); expect(mocks.cache).toHaveBeenCalledTimes(1);
});
