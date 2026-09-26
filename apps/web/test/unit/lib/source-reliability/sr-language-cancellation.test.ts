import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const generate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/source-reliability/sr-eval-types", () => ({ generateTextWithTimeout: generate }));
vi.mock("@/lib/web-search", () => ({}));
vi.mock("@/lib/fact-checker-service", () => ({}));
beforeEach(() => { vi.resetModules(); generate.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("SR homepage/language cancellation", () => {
  it.each(["alternate", "llm"])("does not cache cancellation during %s detection", async (stage) => {
    const { detectSourceLanguage } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    const parent = new AbortController(); const reason = new Error("language request cancelled");
    const send = vi.fn();
    if (stage === "alternate") send.mockResolvedValueOnce(new Response('<html><title>Redirecting</title></html>'))
      .mockImplementationOnce(async () => { parent.abort(reason); throw reason; });
    else {
      send.mockResolvedValueOnce(new Response(`<html><p>${"fixture ".repeat(40)}</p></html>`));
      generate.mockImplementationOnce(async () => { parent.abort(reason); throw reason; });
    }
    vi.stubGlobal("fetch", send);
    await expect(detectSourceLanguage("language-fixture.com", parent.signal)).rejects.toBe(reason);
    send.mockResolvedValueOnce(new Response('<html lang="fr"></html>'));
    expect(await detectSourceLanguage("language-fixture.com")).toBe("French");
    expect(send).toHaveBeenCalledTimes(stage === "alternate" ? 3 : 2);
    expect(generate).toHaveBeenCalledTimes(stage === "llm" ? 1 : 0);
  });
  it.each(["German", "French"])("does not cache cancellation before later %s detection", async (language) => {
    const { detectSourceLanguage } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    const parent = new AbortController();
    const reason = new DOMException("offline cancellation", "AbortError");
    const fetch = vi.fn(async (_url, init) => new Response(new ReadableStream({ start(controller) {
      init.signal.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
      queueMicrotask(() => parent.abort(reason));
    } })));
    vi.stubGlobal("fetch", fetch);
    await expect(detectSourceLanguage("language.test", parent.signal)).rejects.toBe(reason);
    fetch.mockImplementationOnce(async () => new Response(`<html lang="${language === "German" ? "de" : "fr"}"></html>`));
    expect(await detectSourceLanguage("language.test")).toBe(language);
    expect(fetch).toHaveBeenCalledTimes(2); expect(generate).not.toHaveBeenCalled();
  });
  it("stops a stalled homepage body at the existing local cap", async () => {
    vi.useFakeTimers();
    const { detectSourceLanguage } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => new Response(new ReadableStream({ start(controller) {
      init.signal.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
    } }))));
    const pending = detectSourceLanguage("body.test");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });
});
