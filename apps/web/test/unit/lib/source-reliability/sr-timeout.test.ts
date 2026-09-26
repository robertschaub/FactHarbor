import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateTextWithTimeout } from "@/lib/source-reliability/sr-eval-types";
import { captureMetrics } from "@/lib/analyzer/metrics-integration";

afterEach(() => vi.unstubAllGlobals());

describe.each(["anthropic", "openai"] as const)("SR SDK cancellation (%s)", (provider) => {
  it.each(["timeout", "parent", "retry-delay", "body"])("aborts %s and records one unknown-cost call", async (mode) => {
    vi.stubGlobal("fetch", () => { throw new Error("Network forbidden"); });
    const parent = new AbortController();
    const reason = new DOMException("Request cancelled", "AbortError");
    let aborts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = vi.fn(async (_url: unknown, init: any): Promise<Response> => {
      const signal: AbortSignal = init.signal;
      signal.throwIfAborted();
      if (mode === "parent" || mode === "retry-delay") timer = setTimeout(() => parent.abort(reason), 10);
      if (mode === "retry-delay") return new Response(JSON.stringify({ error: { message: "offline retryable failure" } }), {
        status: 503, headers: { "content-type": "application/json" },
      });
      if (mode === "body") return new Response(new ReadableStream({ start(controller) {
        signal.addEventListener("abort", () => { aborts++; controller.error(signal.reason); }, { once: true });
      } }), { headers: { "content-type": "application/json" } });
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => {
        aborts++; reject(signal.reason);
      }, { once: true }));
    });
    const model = provider === "anthropic"
      ? createAnthropic({ apiKey: "offline-fixture", fetch: send })("claude-haiku-4-5-20251001")
      : createOpenAI({ apiKey: "offline-fixture", fetch: send })("gpt-4.1-mini");
    try {
      const run = await captureMetrics(() => generateTextWithTimeout("SR test call", mode === "retry-delay" ? 500 : 100, {
        model, prompt: "p", maxOutputTokens: 50, abortSignal: parent.signal,
      }));
      expect(run.ok).toBe(false);
      expect(send).toHaveBeenCalledTimes(1);
      if (mode !== "retry-delay") expect(aborts).toBe(1);
      expect(run.captured.llmCalls).toHaveLength(1);
      expect(run.captured.llmCalls[0]).toMatchObject({ provider, success: false, failureKind: "transport", usageAvailable: false });
      if (mode === "timeout" || mode === "body") {
        expect(run.captured.llmCalls[0].errorMessage).toBe("SR test call: The operation was aborted due to timeout");
        expect(!run.ok && (run.error as Error).name).toBe("TimeoutError");
      } else expect(!run.ok && run.error).toBe(reason);
    } finally { clearTimeout(timer); }
  });
});
