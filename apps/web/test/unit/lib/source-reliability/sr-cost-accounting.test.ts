import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SR-COST: source-reliability LLM calls and searches run inside /api/internal/evaluate-source,
// outside the analysis job's metrics context. They must reach the job that asked for them.

const mockGenerateText = vi.fn();
const mockEvaluate = vi.fn();
const mockBatchGetCachedData = vi.fn();
const mockSetCachedScore = vi.fn();
const mockGetConfig = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock("@/lib/source-reliability/sr-eval-engine", () => ({
  evaluateSourceWithConsensus: (...args: unknown[]) => mockEvaluate(...args),
}));

vi.mock("@/lib/source-reliability-cache", () => ({
  batchGetCachedData: (...args: unknown[]) => mockBatchGetCachedData(...args),
  setCachedScore: (...args: unknown[]) => mockSetCachedScore(...args),
  setCacheTtlDays: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkRunnerKey: () => true }));

vi.mock("@/lib/config-storage", async () => {
  const { DEFAULT_SR_CONFIG } = await import("@/lib/config-schemas");
  return { getConfig: async (...args: unknown[]) => mockGetConfig(...args) ?? { config: DEFAULT_SR_CONFIG } };
});

import { createMetricsCollector, type LLMCallMetric, type SearchQueryMetric } from "@/lib/analyzer/metrics";
import {
  captureMetrics,
  recordCapturedMetrics,
  recordLLMCall,
  recordSearchQuery,
} from "@/lib/analyzer/metrics-integration";
import { clearPrefetchedScores, prefetchSourceReliability, setSourceReliabilityConfig, SR_CONFIG } from "@/lib/analyzer/source-reliability";
import { DEFAULT_SR_CONFIG, SourceReliabilityConfigSchema } from "@/lib/config-schemas";
import { getRemainingBudgetMs } from "@/lib/source-reliability/sr-eval-enrichment";
import { generateTextWithTimeout } from "@/lib/source-reliability/sr-eval-types";
import { POST } from "@/app/api/internal/evaluate-source/route";

function srCall(overrides: Partial<LLMCallMetric> = {}): LLMCallMetric {
  return {
    taskType: "source_reliability",
    provider: "anthropic",
    modelName: "claude-haiku-4-5-20251001",
    promptTokens: 1000,
    completionTokens: 200,
    totalTokens: 1200,
    usageAvailable: true,
    durationMs: 10,
    success: true,
    schemaCompliant: true,
    retries: 0,
    timestamp: new Date("2026-09-24T10:00:00Z"),
    ...overrides,
  };
}

function srSearch(): SearchQueryMetric {
  return {
    query: "outlet reliability",
    provider: "serper",
    resultsCount: 5,
    durationMs: 20,
    success: true,
    timestamp: new Date("2026-09-24T10:00:01Z"),
  };
}

function evaluateRequest(domain: string, signal?: AbortSignal, budgetMs?: number): Request {
  return new Request("http://localhost/api/internal/evaluate-source", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, budgetMs }),
    signal,
  });
}

describe("generateTextWithTimeout", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("records a completed call with its usage under the provider family", async () => {
    mockGenerateText.mockResolvedValue({
      text: "{}",
      usage: { inputTokens: 120, outputTokens: 30 },
      finishReason: "stop",
      response: { modelId: "claude-haiku-4-5-20251001" },
    });

    const run = await captureMetrics(() =>
      generateTextWithTimeout("SR test call", 1000, {
        model: { provider: "anthropic.messages", modelId: "claude-haiku-4-5-20251001" } as any,
        prompt: "p",
        maxOutputTokens: 50,
      }),
    );

    expect(run.ok).toBe(true);
    expect(run.captured.llmCalls).toHaveLength(1);
    expect(run.captured.llmCalls[0]).toMatchObject({
      taskType: "source_reliability",
      provider: "anthropic",
      modelName: "claude-haiku-4-5-20251001",
      promptTokens: 120,
      completionTokens: 30,
      usageAvailable: true,
      success: true,
      maxOutputTokens: 50,
    });
  });

  it("records a timed-out call as failed with unknown usage and rethrows", async () => {
    mockGenerateText.mockImplementation(async (params) => {
      const signal = AbortSignal.timeout(params.timeout);
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    });

    const run = await captureMetrics(() =>
      generateTextWithTimeout("SR test call", 5, {
        model: { provider: "openai.responses", modelId: "gpt-4.1-mini" } as any,
        prompt: "p",
      }),
    );

    expect(run.ok).toBe(false);
    expect(String((run as { error: unknown }).error)).toContain("aborted due to timeout");
    expect(run.captured.llmCalls[0]).toMatchObject({
      provider: "openai",
      modelName: "gpt-4.1-mini",
      success: false,
      usageAvailable: false,
      failureKind: "transport",
    });
    expect(run.captured.llmCalls[0].errorMessage).toBe("SR test call: The operation was aborted due to timeout");
  });

  it("does not invoke or account a pre-aborted request", async () => {
    const signal = AbortSignal.abort(new Error("cancelled before dispatch"));
    const run = await captureMetrics(() => generateTextWithTimeout("SR test", 1000, {
      model: {} as any, prompt: "p", abortSignal: signal,
    }));
    expect(run.ok).toBe(false);
    expect(!run.ok && run.error).toBe(signal.reason);
    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(run.captured.llmCalls).toEqual([]);
  });

  it("records a completed call that reports no usage as usage-unknown", async () => {
    mockGenerateText.mockResolvedValue({ text: "{}", finishReason: "stop" });

    const run = await captureMetrics(() =>
      generateTextWithTimeout("SR test call", 1000, {
        model: { provider: "anthropic.messages", modelId: "claude-haiku-4-5-20251001" } as any,
        prompt: "p",
      }),
    );

    expect(run.ok).toBe(true);
    expect(run.captured.llmCalls[0]).toMatchObject({ success: true, usageAvailable: false });
  });
});

describe("captureMetrics and recordCapturedMetrics", () => {
  it("keeps records made inside a capture out of the enclosing collector", async () => {
    const outer = await captureMetrics(async () => {
      const inner = await captureMetrics(async () => {
        recordLLMCall(srCall());
        recordSearchQuery(srSearch());
      });
      expect(inner.captured.llmCalls).toHaveLength(1);
      expect(inner.captured.searchQueries).toHaveLength(1);
    });

    expect(outer.captured.llmCalls).toHaveLength(0);
    expect(outer.captured.searchQueries).toHaveLength(0);
  });

  it("adds serialized records to the current collector with Date timestamps", async () => {
    const inner = await captureMetrics(async () => {
      recordLLMCall(srCall());
      recordSearchQuery(srSearch());
    });
    const wire = JSON.parse(JSON.stringify(inner.captured));

    const outer = await captureMetrics(async () => recordCapturedMetrics(wire));

    expect(outer.ok && outer.value).toBe(true);
    expect(outer.captured.llmCalls).toHaveLength(1);
    expect(outer.captured.llmCalls[0].timestamp).toBeInstanceOf(Date);
    expect(outer.captured.llmCalls[0].promptTokens).toBe(1000);
    expect(outer.captured.searchQueries).toHaveLength(1);
    expect(outer.captured.searchQueries[0].timestamp).toBeInstanceOf(Date);
  });

  it("returns what was recorded when the function throws", async () => {
    const run = await captureMetrics(async () => {
      recordSearchQuery(srSearch());
      throw new Error("boom");
    });

    expect(run.ok).toBe(false);
    expect(run.captured.searchQueries).toHaveLength(1);
  });

  it("rejects input that is not a record set", () => {
    expect(recordCapturedMetrics(undefined)).toBe(false);
    expect(recordCapturedMetrics({ llmCalls: [] })).toBe(false);
    expect(recordCapturedMetrics({ llmCalls: "x", searchQueries: [] })).toBe(false);
  });
});

describe("evaluate-source route accounting", () => {
  beforeEach(() => {
    mockEvaluate.mockReset();
    mockGetConfig.mockReset();
  });

  it("uses the default budget without an immediate timeout when budgetMs is omitted", async () => {
    vi.useFakeTimers();
    let entered!: () => void; const started = new Promise<void>(resolve => { entered = resolve; });
    mockEvaluate.mockImplementation(async (_domain, _multi, _confidence, config) => {
      expect(config.requestBudgetMs).toBe(90_000); entered();
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(config.abortSignal.aborted).toBe(false);
      return { success: true, data: { score: 0.7 } };
    });
    try {
      const req = evaluateRequest("default-budget.test"); req.headers.set("x-forwarded-for", "default-budget");
      const pending = POST(req); await started;
      await vi.advanceTimersByTimeAsync(5);
      expect((await pending).status).toBe(200); expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("starts no evaluation after disconnect during config loading", async () => {
    const { DEFAULT_SR_CONFIG } = await import("@/lib/config-schemas");
    const parent = new AbortController();
    mockGetConfig.mockImplementationOnce(async () => { parent.abort(); return { config: DEFAULT_SR_CONFIG }; });
    const req = evaluateRequest("config-disconnect.test", parent.signal); req.headers.set("x-forwarded-for", "config-disconnect");
    expect((await POST(req)).status).toBe(500);
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it.each(["domain", "ip"])("preserves %s rate accounting for a pre-aborted request", async (limit) => {
    const { DEFAULT_SR_CONFIG } = await import("@/lib/config-schemas");
    mockGetConfig.mockResolvedValue({ config: { ...DEFAULT_SR_CONFIG, rateLimitPerIp: limit === "ip" ? 1 : 10 } });
    const domain = `rate-${limit}.test`;
    const first = evaluateRequest(domain, AbortSignal.abort()); first.headers.set("x-forwarded-for", `rate-${limit}`);
    expect((await POST(first)).status).toBe(500);
    const second = evaluateRequest(limit === "ip" ? "other-rate.test" : domain); second.headers.set("x-forwarded-for", `rate-${limit}`);
    const response = await POST(second);
    expect(response.status).toBe(429);
    expect((await response.json()).reason).toContain(limit === "ip" ? "IP rate limit" : "Domain cooldown");
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it("keeps two requests' cancellation signals separate without mutating shared config", async () => {
    const { DEFAULT_SR_CONFIG } = await import("@/lib/config-schemas");
    const parents = [new AbortController(), new AbortController()];
    const configs: any[] = []; let entered!: () => void; let release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    mockEvaluate.mockImplementation(async (_domain, _multi, _confidence, config) => {
      configs.push(config); if (configs.length === 2) entered();
      await held; config.abortSignal.throwIfAborted(); return { success: true, data: { score: 0.7 } };
    });
    const pending = parents.map((parent, i) => {
      const req = evaluateRequest(`separate-${i}.test`, parent.signal); req.headers.set("x-forwarded-for", `separate-${i}`);
      return POST(req);
    });
    await started; parents[0].abort();
    expect(configs[0]).not.toBe(configs[1]);
    expect(configs.map(config => config.abortSignal.aborted)).toEqual([true, false]);
    expect(DEFAULT_SR_CONFIG).not.toHaveProperty("abortSignal");
    release(); expect((await Promise.all(pending)).map(response => response.status)).toEqual([500, 200]);
  });

  it("aborts synchronously when setup has already exhausted the request budget", async () => {
    const req = evaluateRequest("overdue-setup.test", undefined, 10_000); req.headers.set("x-forwarded-for", "overdue-setup");
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValueOnce(now).mockReturnValue(now + 10_001);
    try {
      const response = await POST(req);
      expect(response.status).toBe(500); expect(mockEvaluate).not.toHaveBeenCalled();
      expect((await response.json()).accounting.llmCalls).toEqual([]);
    } finally { clock.mockRestore(); }
  });

  it("returns the evaluation's records with the result", async () => {
    mockEvaluate.mockImplementation(async () => {
      recordLLMCall(srCall());
      recordSearchQuery(srSearch());
      return { success: true, data: { score: 0.7, confidence: 0.8 } };
    });

    const res = await POST(evaluateRequest("outlet-route-a.com"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.score).toBe(0.7);
    expect(body.accounting.llmCalls).toHaveLength(1);
    expect(body.accounting.searchQueries).toHaveLength(1);
    expect(body.accounting.searchQueries[0].origin).toBe("source_reliability");
  });

  it("rejects an already-disconnected request without starting evaluation", async () => {
    const response = await POST(evaluateRequest("cancelled-before-work.test", AbortSignal.abort()));
    expect(response.status).toBe(500);
    expect(mockEvaluate).not.toHaveBeenCalled();
    expect((await response.json()).accounting.llmCalls).toEqual([]);
  });

  it.each(["disconnect", "deadline"])("cancels %s, retains records and clears its deadline", async (mode) => {
    vi.useFakeTimers();
    const parent = new AbortController();
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    mockEvaluate.mockImplementation(async (_domain, _multi, _confidence, config) => {
      recordLLMCall(srCall());
      entered();
      return new Promise((_resolve, reject) => config.abortSignal.addEventListener("abort", () => reject(config.abortSignal.reason), { once: true }));
    });
    try {
      const pending = POST(evaluateRequest("cancelled-" + mode + ".test", parent.signal, 10_000));
      await started;
      if (mode === "disconnect") parent.abort();
      else await vi.advanceTimersByTimeAsync(10_000);
      const response = await pending;
      expect(response.status).toBe(500);
      expect((await response.json()).accounting.llmCalls).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("rejects a late result even when the engine ignores cancellation", async () => {
    const parent = new AbortController();
    mockEvaluate.mockImplementation(async () => {
      parent.abort();
      return { success: true, data: { score: 0.7 } };
    });
    const response = await POST(evaluateRequest("late-score.test", parent.signal));
    expect(response.status).toBe(500);
    expect(await response.json()).not.toHaveProperty("score");
  });

  it("returns the records of a failed evaluation", async () => {
    mockEvaluate.mockImplementation(async () => {
      recordLLMCall(srCall());
      return { success: false, error: { reason: "no_consensus", details: "models disagree" } };
    });

    const res = await POST(evaluateRequest("outlet-route-b.com"));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.accounting.llmCalls).toHaveLength(1);
  });

  it("returns the records of an evaluation that throws", async () => {
    mockEvaluate.mockImplementation(async () => {
      recordLLMCall(srCall());
      throw new Error("engine crashed");
    });

    const res = await POST(evaluateRequest("outlet-route-c.com"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Evaluation error");
    expect(body.accounting.llmCalls).toHaveLength(1);
  });
});

describe("prefetchSourceReliability accounting", () => {
  beforeEach(() => {
    mockGetConfig.mockReset().mockResolvedValue({ config: DEFAULT_SR_CONFIG });
    clearPrefetchedScores();
    mockBatchGetCachedData.mockReset().mockResolvedValue(new Map());
    mockSetCachedScore.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the route's records to the job that asked for the evaluation", async () => {
    const wire = JSON.parse(JSON.stringify({ llmCalls: [srCall()], searchQueries: [srSearch()] }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      score: 0.7,
      confidence: 0.9,
      modelPrimary: "claude-haiku-4-5-20251001",
      modelSecondary: null,
      consensusAchieved: true,
      accounting: wire,
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const job = await captureMetrics(() => prefetchSourceReliability(["https://outlet-prefetch-a.com/story"]));

    expect(job.ok).toBe(true);
    expect(job.captured.llmCalls).toHaveLength(1);
    expect(job.captured.llmCalls[0].taskType).toBe("source_reliability");
    expect(job.captured.searchQueries).toHaveLength(1);
  });

  it("keeps the outer deadline active while the response body stalls", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => new Response(new ReadableStream({ start(controller) {
      init.signal.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
    } }), { headers: { "content-type": "application/json" } })));
    try {
      const pending = captureMetrics(() => prefetchSourceReliability(["https://body-stall.test/story"]));
      await vi.advanceTimersByTimeAsync(95_000);
      const job = await pending;
      expect(job.captured.llmCalls).toHaveLength(1);
      expect(job.captured.llmCalls[0]).toMatchObject({ usageAvailable: false, success: false });
      expect(job.captured.llmCalls[0].errorMessage).toContain("timeout");
      expect(mockSetCachedScore).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("marks a timed-out evaluation as unknown cost instead of free", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    }));

    const job = await captureMetrics(() => prefetchSourceReliability(["https://outlet-prefetch-b.com/story"]));

    expect(job.captured.llmCalls).toHaveLength(1);
    expect(job.captured.llmCalls[0]).toMatchObject({
      taskType: "source_reliability",
      usageAvailable: false,
      success: false,
    });
    expect(job.captured.llmCalls[0].errorMessage).toContain("timeout");

    const collector = createMetricsCollector("job-1", "claimboundary");
    collector.recordLLMCall(srCall());
    for (const call of job.captured.llmCalls) collector.recordLLMCall(call);
    expect(collector.finalize().estimatedCostUSD).toBeNull();
  });

  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }

  const wireRecords = () => JSON.parse(JSON.stringify({ llmCalls: [srCall()], searchQueries: [srSearch()] }));
  const evaluation = { score: 0.7, confidence: 0.9, modelPrimary: "m", modelSecondary: null, consensusAchieved: true };

  it.each([
    ["a failed evaluation (422)", () => jsonResponse(422, { error: "Evaluation failed", accounting: wireRecords() })],
    ["an evaluation that threw (500)", () => jsonResponse(500, { error: "Evaluation error", accounting: wireRecords() })],
  ])("adds the records carried by %s", async (_label, makeResponse) => {
    vi.stubGlobal("fetch", vi.fn(async () => makeResponse()));

    const job = await captureMetrics(() => prefetchSourceReliability(["https://outlet-prefetch.com/story"]));

    expect(job.captured.llmCalls).toHaveLength(1);
    expect(job.captured.llmCalls[0].usageAvailable).toBe(true);
    expect(job.captured.searchQueries).toHaveLength(1);
  });

  it.each([
    ["a 422 without records", () => jsonResponse(422, { error: "Evaluation failed" })],
    ["a 503 without records", () => new Response("Service Unavailable", { status: 503 })],
    ["a 200 without records", () => jsonResponse(200, evaluation)],
    ["a 200 whose body is not JSON", () => new Response("<html>", { status: 200 })],
    ["a connection reset", () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); }],
  ])("marks the evaluation as unaccounted after %s", async (_label, makeResponse) => {
    vi.stubGlobal("fetch", vi.fn(async () => makeResponse()));

    const job = await captureMetrics(() => prefetchSourceReliability(["https://outlet-prefetch.com/story"]));

    expect(job.captured.llmCalls).toHaveLength(1);
    expect(job.captured.llmCalls[0]).toMatchObject({ taskType: "source_reliability", usageAvailable: false });
  });

  it.each([
    ["a rate-limited request (429)", () => jsonResponse(429, { error: "Rate limit exceeded" })],
    ["an unauthorized request (401)", () => jsonResponse(401, { error: "Unauthorized" })],
    ["a refused connection", () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } }); }],
  ])("records nothing for %s, which did no work", async (_label, makeResponse) => {
    vi.stubGlobal("fetch", vi.fn(async () => makeResponse()));

    const job = await captureMetrics(() => prefetchSourceReliability(["https://outlet-prefetch.com/story"]));

    expect(job.captured.llmCalls).toHaveLength(0);
  });

  it("keeps concurrent jobs' records apart when responses arrive out of order", async () => {
    let releaseFirst!: () => void;
    const firstHeld = new Promise<void>((resolve) => { releaseFirst = resolve; });
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const { domain } = JSON.parse(String(init.body));
      if (domain === "outlet-first.com") await firstHeld;
      return jsonResponse(200, {
        ...evaluation,
        accounting: JSON.parse(JSON.stringify({ llmCalls: [srCall({ modelName: `model-${domain}` })], searchQueries: [] })),
      });
    }));

    const first = captureMetrics(() => prefetchSourceReliability(["https://outlet-first.com/story"]));
    const second = await captureMetrics(() => prefetchSourceReliability(["https://outlet-second.com/story"]));
    releaseFirst();
    const firstDone = await first;

    expect(second.captured.llmCalls.map((call) => call.modelName)).toEqual(["model-outlet-second.com"]);
    expect(firstDone.captured.llmCalls.map((call) => call.modelName)).toEqual(["model-outlet-first.com"]);
  });
});

describe("SR caller/route deadline and accounting contract", () => {
  const workMs = 10_000;
  const graceMs = 5000;
  const evaluation = { score: 0.7, confidence: 0.9, modelPrimary: "m", modelSecondary: null, consensusAchieved: true };
  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
  let serial = 0;
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
    clearPrefetchedScores();
    setSourceReliabilityConfig({ ...DEFAULT_SR_CONFIG, evalTimeoutMs: workMs, evalAccountingGraceMs: graceMs, filterEnabled: false });
    mockBatchGetCachedData.mockReset().mockResolvedValue(new Map());
    mockSetCachedScore.mockReset().mockResolvedValue(undefined);
    mockEvaluate.mockReset();
    mockGetConfig.mockReset().mockResolvedValue({ config: { ...DEFAULT_SR_CONFIG, rateLimitPerIp: 100, domainCooldownSec: 0 } });
    errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", () => { throw new Error("Network forbidden"); });
  });
  afterEach(() => {
    setSourceReliabilityConfig();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // Compose the real caller and POST, but enforce fetch disconnection: once its
  // signal aborts, a later route Response cannot reach the caller or its collector.
  function bridge(transform?: (req: Request) => Promise<Response>) {
    const send = vi.fn((_url: unknown, init: RequestInit) => {
      expect(String(_url)).toBe("http://localhost:3000/api/internal/evaluate-source");
      const signal = init.signal!;
      signal.throwIfAborted();
      const req = new Request(String(_url), init);
      req.headers.set("x-forwarded-for", `offline-${++serial}`);
      return new Promise<Response>((resolve, reject) => {
        const aborted = () => reject(signal.reason);
        signal.addEventListener("abort", aborted, { once: true });
        void (transform ? transform(req) : POST(req)).then(resolve, reject).finally(() => signal.removeEventListener("abort", aborted));
      });
    });
    vi.stubGlobal("fetch", send);
    return send;
  }
  function run(domain = `receipt-${++serial}.test`, fallback = false) {
    return captureMetrics(() => prefetchSourceReliability([`https://${domain}/story`], { fallback }));
  }
  function holdUntilAbort(config: any) {
    return new Promise<void>(resolve => config.abortSignal.addEventListener("abort", () => resolve(), { once: true }));
  }
  function assertTimeout(job: Awaited<ReturnType<typeof run>>) {
    expect(job.ok && job.value.errorByType.timeout).toBe(1);
    expect(job.ok && job.value.errorCount).toBe(1);
    expect(mockSetCachedScore).not.toHaveBeenCalled();
  }

  it.each(["cancelled", "ignores cancellation", "unknown LLM usage"])("receives accounting during grace after %s, without accepting the score", async (mode) => {
    let config: any;
    mockEvaluate.mockImplementation(async (_domain, _multi, _confidence, cfg) => {
      config = cfg;
      recordLLMCall(srCall({ usageAvailable: mode !== "unknown LLM usage" }));
      recordSearchQuery(srSearch());
      await holdUntilAbort(cfg);
      await delay(100);
      if (mode !== "ignores cancellation") cfg.abortSignal.throwIfAborted();
      return { success: true, data: evaluation };
    });
    const send = bridge();
    const pending = run("receipt.test");
    await vi.advanceTimersByTimeAsync(workMs - 1);
    expect(config.abortSignal.aborted).toBe(false);
    expect(getRemainingBudgetMs(config.requestStartedAtMs, config.requestBudgetMs)).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(config.abortSignal.aborted).toBe(true);
    expect(getRemainingBudgetMs(config.requestStartedAtMs, config.requestBudgetMs)).toBe(0);
    await vi.advanceTimersByTimeAsync(100);
    const job = await pending;
    assertTimeout(job);
    expect(job.captured.llmCalls).toHaveLength(1);
    expect(job.captured.llmCalls[0].provider).toBe("anthropic");
    expect(job.captured.llmCalls[0].usageAvailable).toBe(mode !== "unknown LLM usage");
    expect(job.captured.searchQueries).toHaveLength(1);
    expect(errorLog).toHaveBeenCalledWith("[SR] Evaluation timeout for receipt.test after 10000ms");
    expect(errorLog.mock.calls.filter(args => args[0] === "[SR] Evaluation timeout for receipt.test after 10000ms")).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(send.mock.calls[0][1].body)).budgetMs).toBe(workMs);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["json", "config"])("charges delayed %s setup against the shared deadline", async (phase) => {
    mockEvaluate.mockImplementation(async (_domain, _multi, _confidence, config) => {
      expect(config.requestBudgetMs).toBe(7000);
      expect(getRemainingBudgetMs(config.requestStartedAtMs, config.requestBudgetMs)).toBe(7000);
      await holdUntilAbort(config);
      config.abortSignal.throwIfAborted();
    });
    if (phase === "config") mockGetConfig.mockResolvedValueOnce({ config: DEFAULT_SR_CONFIG })
      .mockImplementationOnce(async () => { await delay(3000); return { config: DEFAULT_SR_CONFIG }; });
    bridge(async req => {
      if (phase === "json") {
        const json = req.json.bind(req);
        req.json = async () => { await delay(3000); return json(); };
      }
      return POST(req);
    });
    const pending = run();
    await vi.advanceTimersByTimeAsync(workMs);
    const job = await pending;
    assertTimeout(job);
    expect(job.captured.llmCalls).toEqual([]);
  });

  it("starts no work after setup exhausts the caller deadline", async () => {
    mockGetConfig.mockResolvedValueOnce({ config: DEFAULT_SR_CONFIG })
      .mockImplementationOnce(async () => { await delay(workMs + 1); return { config: DEFAULT_SR_CONFIG }; });
    bridge();
    const pending = run();
    await vi.advanceTimersByTimeAsync(workMs + 1);
    const job = await pending;
    assertTimeout(job);
    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(job.captured.llmCalls).toEqual([]);
  });

  it.each([0, 10_000])("bounds receipt waiting with grace %i and never merges a disconnected late response", async grace => {
    // Deliberately differs from SR_CONFIG: the timer must use the UCM value.
    mockGetConfig.mockResolvedValueOnce({ config: { ...DEFAULT_SR_CONFIG, evalAccountingGraceMs: grace } });
    mockEvaluate.mockImplementation(async (_d, _m, _c, config) => {
      await holdUntilAbort(config);
      await delay(grace + 100);
      recordLLMCall(srCall());
      config.abortSignal.throwIfAborted();
    });
    bridge();
    const pending = run();
    await vi.advanceTimersByTimeAsync(workMs + grace);
    const job = await pending;
    assertTimeout(job);
    expect(job.captured.llmCalls).toHaveLength(1);
    expect(job.captured.llmCalls[0].provider).toBe("unknown");
    await vi.advanceTimersByTimeAsync(100);
    expect(job.captured.llmCalls).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["absent", "malformed", "partial merge", "disconnect", "body stall"])("keeps %s accounting unknown exactly once", async mode => {
    bridge(async req => {
      if (mode === "disconnect") throw new TypeError("offline connection lost");
      if (mode === "body stall") return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode('{"accounting":'));
        req.signal.addEventListener("abort", () => controller.error(req.signal.reason), { once: true });
      } }));
      const accounting = mode === "absent" ? undefined : mode === "malformed" ? { llmCalls: "invalid", searchQueries: [] }
        : { llmCalls: [srCall(), null], searchQueries: [] };
      return Response.json({ ...evaluation, accounting });
    });
    const pending = run();
    await vi.advanceTimersByTimeAsync(workMs + graceMs);
    const job = await pending;
    expect(job.captured.llmCalls.filter(call => call.provider === "unknown")).toHaveLength(1);
    expect(job.captured.llmCalls.filter(call => call.provider === "anthropic")).toHaveLength(mode === "partial merge" ? 1 : 0);
    expect(mockSetCachedScore).not.toHaveBeenCalled();
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "later", null])("rejects invalid deadline %s before work", async deadlineAtMs => {
    const response = await POST(new Request("http://localhost/api/internal/evaluate-source", {
      method: "POST", body: JSON.stringify({ domain: "invalid.test", budgetMs: workMs, deadlineAtMs }),
    }));
    expect(response.status).toBe(400);
    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(mockGetConfig).not.toHaveBeenCalled();
  });
  it("requires a budget with the deadline and rejects non-finite JSON", async () => {
    for (const body of [JSON.stringify({ domain: "pair.test", deadlineAtMs: Date.now() }), '{"domain":"finite.test","budgetMs":10000,"deadlineAtMs":1e999}']) {
      expect((await POST(new Request("http://localhost/api/internal/evaluate-source", { method: "POST", body }))).status).toBe(400);
    }
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it.each(["future", "legacy", "past"])("clamps %s deadlines without changing legacy post-setup budgeting", async mode => {
    const now = Date.now();
    mockGetConfig.mockImplementationOnce(async () => { await delay(3000); return { config: DEFAULT_SR_CONFIG }; });
    mockEvaluate.mockImplementation(async (_d, _m, _c, config) => {
      expect(config.requestStartedAtMs).toBe(now + 3000);
      expect(config.requestBudgetMs).toBe(workMs);
      return { success: true, data: evaluation };
    });
    const body = { domain: `deadline-${mode}.test`, budgetMs: workMs, ...(mode === "legacy" ? {} : { deadlineAtMs: now + (mode === "past" ? -1 : 1_000_000) }) };
    const pending = POST(new Request("http://localhost/api/internal/evaluate-source", { method: "POST", body: JSON.stringify(body) }));
    await vi.advanceTimersByTimeAsync(3000);
    const response = await pending;
    expect(response.status).toBe(mode === "past" ? 500 : 200);
    if (mode === "past") {
      expect(mockEvaluate).not.toHaveBeenCalled();
      expect(await response.json()).toMatchObject({ code: "evaluation_deadline_exceeded", accounting: { llmCalls: [], searchQueries: [] } });
    }
  });

  it("does not label a generic disconnect as the route's deadline", async () => {
    const res = await POST(evaluateRequest("generic-disconnect.test", AbortSignal.abort(), workMs));
    expect((await res.json()).code).toBeUndefined();
  });

  it("rejects a late parsed score after a forward clock step and keeps its records", async () => {
    bridge(async () => {
      vi.setSystemTime(Date.now() + workMs);
      return Response.json({ ...evaluation, accounting: { llmCalls: [srCall()], searchQueries: [] } });
    });
    const job = await run();
    assertTimeout(job);
    expect(job.captured.llmCalls).toHaveLength(1);
    expect(job.captured.llmCalls[0].provider).toBe("anthropic");
  });

  it("uses the typed route deadline after a backward clock step", async () => {
    mockEvaluate.mockImplementation(async (_d, _m, _c, config) => {
      recordLLMCall(srCall());
      vi.setSystemTime(Date.now() - 1000);
      await holdUntilAbort(config);
      config.abortSignal.throwIfAborted();
    });
    bridge();
    const pending = run();
    await vi.advanceTimersByTimeAsync(workMs);
    const job = await pending;
    assertTimeout(job);
    expect(job.captured.llmCalls).toHaveLength(1);
    expect(job.captured.llmCalls[0].provider).toBe("anthropic");
  });

  it("demonstrates the unsupported old-route setup skew loses its receipt", async () => {
    bridge(async req => {
      const body = await req.json();
      delete body.deadlineAtMs;
      await delay(graceMs + 1);
      return POST(new Request(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(body), signal: req.signal }));
    });
    mockEvaluate.mockImplementation(async (_d, _m, _c, config) => { await holdUntilAbort(config); recordLLMCall(srCall()); config.abortSignal.throwIfAborted(); });
    const pending = run();
    await vi.advanceTimersByTimeAsync(workMs + graceMs);
    const job = await pending;
    assertTimeout(job);
    expect(job.captured.llmCalls.map(call => call.provider)).toEqual(["unknown"]);
    await vi.advanceTimersByTimeAsync(1);
  });

  it("keeps concurrent jobs and domains separate through the real route capture", async () => {
    mockEvaluate.mockImplementation(async (domain, _m, _c, config) => {
      recordLLMCall(srCall({ modelName: domain }));
      await holdUntilAbort(config);
      await delay(domain.startsWith("first") ? 100 : 10);
      config.abortSignal.throwIfAborted();
    });
    bridge();
    const first = run("first.test");
    const second = captureMetrics(() => prefetchSourceReliability(["https://second.test", "https://third.test"], { fallback: false }));
    await vi.advanceTimersByTimeAsync(workMs + 100);
    expect((await first).captured.llmCalls.map(call => call.modelName)).toEqual(["first.test"]);
    expect((await second).captured.llmCalls.map(call => call.modelName).sort()).toEqual(["second.test", "third.test"]);
  });

  it("retains the existing different-root fallback after a subdomain timeout", async () => {
    mockEvaluate.mockImplementation(async (domain, _m, _c, config) => {
      if (domain === "sub.receipt.test") { await holdUntilAbort(config); config.abortSignal.throwIfAborted(); }
      return { success: true, data: evaluation };
    });
    bridge();
    const pending = run("sub.receipt.test", true);
    await vi.advanceTimersByTimeAsync(workMs);
    const job = await pending;
    expect(mockEvaluate.mock.calls.map(call => call[0])).toEqual(["sub.receipt.test", "receipt.test"]);
    expect(job.ok && job.value.errorByType.timeout).toBe(1);
    expect(mockSetCachedScore).toHaveBeenCalledTimes(1);
  });

  it("does not transfer shared translation billing when its owner outlasts grace", async () => {
    delete (globalThis as typeof globalThis & { __fhSrTranslationCache?: unknown }).__fhSrTranslationCache;
    const { getTranslatedSearchTerms } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    let translationSignal: AbortSignal;
    mockGenerateText.mockReset().mockImplementation(async ({ prompt, abortSignal }) => {
      translationSignal = abortSignal;
      await delay(workMs + graceMs + 100);
      return {
        text: JSON.stringify(Object.fromEntries([...prompt.matchAll(/^- "([^"]+)"$/gm)].map((match: RegExpMatchArray) => [match[1], `translated: ${match[1]}`]))),
        finishReason: "stop", usage: { inputTokens: 120, outputTokens: 30 },
        response: { modelId: "claude-haiku-4-5-20251001" },
      };
    });
    mockEvaluate.mockImplementation(async (_d, _m, _c, config) => {
      await getTranslatedSearchTerms("German", config.abortSignal);
      return { success: true, data: evaluation };
    });
    bridge();
    const owner = run();
    await vi.advanceTimersByTimeAsync(0);
    const survivor = captureMetrics(() => getTranslatedSearchTerms("German"));
    await vi.advanceTimersByTimeAsync(workMs + graceMs);
    const job = await owner;
    assertTimeout(job);
    expect(job.captured.llmCalls.map(call => call.provider)).toEqual(["unknown"]);
    expect(translationSignal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    const survived = await survivor;
    expect(survived.ok).toBe(true);
    expect(survived.captured.llmCalls).toEqual([]);
    expect(job.captured.llmCalls.map(call => call.provider)).toEqual(["unknown"]);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    delete (globalThis as typeof globalThis & { __fhSrTranslationCache?: unknown }).__fhSrTranslationCache;
  });

  it.each(["empty", "disabled", "cache hit"])("does not load grace or dispatch for %s prefetch", async mode => {
    if (mode === "disabled") setSourceReliabilityConfig({ ...DEFAULT_SR_CONFIG, enabled: false });
    if (mode === "cache hit") mockBatchGetCachedData.mockResolvedValue(new Map([["cached.test", { score: 0.7, confidence: 0.9, consensusAchieved: true }]]));
    const send = bridge();
    await prefetchSourceReliability(mode === "empty" ? [] : ["https://cached.test"]);
    expect(mockGetConfig).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("loads grace before dispatch, uses its existing default when absent, and reads once for multiple domains", async () => {
    const { evalAccountingGraceMs: _grace, ...legacyConfig } = DEFAULT_SR_CONFIG;
    mockGetConfig.mockImplementationOnce(async () => { await delay(100); return { config: legacyConfig }; });
    const send = bridge(async req => {
      expect(mockGetConfig).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(await req.text())).budgetMs).toBe(workMs);
      return new Promise((_resolve, reject) => req.signal.addEventListener("abort", () => reject(req.signal.reason), { once: true }));
    });
    const pending = captureMetrics(() => prefetchSourceReliability(["https://one.test", "https://two.test"], { fallback: false }));
    await vi.advanceTimersByTimeAsync(99);
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(workMs + graceMs);
    expect((await pending).captured.llmCalls.map(call => call.provider)).toEqual(["unknown", "unknown"]);
    expect(mockGetConfig).toHaveBeenCalledTimes(1);
  });

  it("rejects a failed configuration load before dispatch without inventing unknown spend", async () => {
    const failure = new Error("offline UCM read/parse failure");
    mockGetConfig.mockRejectedValueOnce(failure);
    const send = bridge();
    const job = await run();
    expect(job.ok).toBe(false);
    expect(!job.ok && job.error).toBe(failure);
    expect(job.captured.llmCalls).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it("keeps the original grace snapshot for root fallback after UCM changes", async () => {
    mockGetConfig.mockResolvedValueOnce({ config: { ...DEFAULT_SR_CONFIG, evalAccountingGraceMs: 250 } });
    mockEvaluate.mockImplementation(async (domain, _m, _c, config) => {
      await holdUntilAbort(config);
      if (domain === "snapshot.test") await delay(1000);
      config.abortSignal.throwIfAborted();
    });
    const send = bridge();
    const pending = run("sub.snapshot.test", true);
    await vi.advanceTimersByTimeAsync(0);
    mockGetConfig.mockResolvedValue({ config: { ...DEFAULT_SR_CONFIG, evalAccountingGraceMs: 0 } });
    await vi.advanceTimersByTimeAsync(2 * workMs);
    expect(send.mock.calls[1][1].signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(250);
    const job = await pending;
    expect(job.ok && job.value.errorByType.timeout).toBe(2);
    expect(job.captured.llmCalls.map(call => call.provider)).toEqual(["unknown"]);
    expect(mockGetConfig).toHaveBeenCalledTimes(3); // One snapshot, two route reads.
    expect(send.mock.calls.map(call => JSON.parse(String(call[1].body)).budgetMs)).toEqual([workMs, workMs]);
    await vi.advanceTimersByTimeAsync(750);
  });

  it("keeps different UCM grace snapshots isolated between concurrent jobs", async () => {
    mockEvaluate.mockImplementation(async (_d, _m, _c, config) => {
      await holdUntilAbort(config); await delay(1000); config.abortSignal.throwIfAborted();
    });
    const send = bridge();
    mockGetConfig.mockResolvedValueOnce({ config: { ...DEFAULT_SR_CONFIG, evalAccountingGraceMs: 100 } });
    const first = run("first-grace.test");
    await vi.advanceTimersByTimeAsync(0);
    mockGetConfig.mockResolvedValueOnce({ config: { ...DEFAULT_SR_CONFIG, evalAccountingGraceMs: 500 } });
    const second = run("second-grace.test");
    await vi.advanceTimersByTimeAsync(workMs + 100);
    expect(send.mock.calls.map(call => call[1].signal?.aborted)).toEqual([true, false]);
    expect((await first).captured.llmCalls.map(call => call.provider)).toEqual(["unknown"]);
    await vi.advanceTimersByTimeAsync(400);
    expect(send.mock.calls.map(call => call[1].signal?.aborted)).toEqual([true, true]);
    expect((await second).captured.llmCalls.map(call => call.provider)).toEqual(["unknown"]);
    expect(SR_CONFIG.evalAccountingGraceMs).toBe(graceMs);
    expect(mockGetConfig).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(500);
  });

  it("bounds the UCM schema and the non-production setter's fallback", () => {
    for (const value of [0, 10_000]) {
      const config = SourceReliabilityConfigSchema.parse({ ...DEFAULT_SR_CONFIG, evalAccountingGraceMs: value });
      setSourceReliabilityConfig(config);
      expect(SR_CONFIG.evalAccountingGraceMs).toBe(value);
    }
    for (const value of [-1, 10_001, 1.5, Infinity]) {
      expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, evalAccountingGraceMs: value }).success).toBe(false);
    }
    setSourceReliabilityConfig();
    expect(SR_CONFIG.evalAccountingGraceMs).toBe(5000);
  });
});
