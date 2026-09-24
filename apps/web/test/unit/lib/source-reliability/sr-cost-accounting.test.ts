import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SR-COST: source-reliability LLM calls and searches run inside /api/internal/evaluate-source,
// outside the analysis job's metrics context. They must reach the job that asked for them.

const mockGenerateText = vi.fn();
const mockEvaluate = vi.fn();
const mockBatchGetCachedData = vi.fn();
const mockSetCachedScore = vi.fn();

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
  return { getConfig: async () => ({ config: DEFAULT_SR_CONFIG }) };
});

import { createMetricsCollector, type LLMCallMetric, type SearchQueryMetric } from "@/lib/analyzer/metrics";
import {
  captureMetrics,
  recordCapturedMetrics,
  recordLLMCall,
  recordSearchQuery,
} from "@/lib/analyzer/metrics-integration";
import { clearPrefetchedScores, prefetchSourceReliability } from "@/lib/analyzer/source-reliability";
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

function evaluateRequest(domain: string): Request {
  return new Request("http://localhost/api/internal/evaluate-source", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
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
    mockGenerateText.mockReturnValue(new Promise(() => {}));

    const run = await captureMetrics(() =>
      generateTextWithTimeout("SR test call", 5, {
        model: { provider: "openai.responses", modelId: "gpt-4.1-mini" } as any,
        prompt: "p",
      }),
    );

    expect(run.ok).toBe(false);
    expect(String((run as { error: unknown }).error)).toContain("SR test call timeout");
    expect(run.captured.llmCalls[0]).toMatchObject({
      provider: "openai",
      modelName: "gpt-4.1-mini",
      success: false,
      usageAvailable: false,
      failureKind: "transport",
    });
    expect(run.captured.llmCalls[0].errorMessage).toBe("SR test call timeout after 5ms");
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
