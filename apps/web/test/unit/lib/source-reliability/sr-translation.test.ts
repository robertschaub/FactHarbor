import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/source-reliability/sr-eval-types", () => ({ generateTextWithTimeout: generate }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => ({})) }));
vi.mock("@/lib/analyzer/debug", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/web-search", () => ({}));
vi.mock("@/lib/fact-checker-service", () => ({}));

function completeResponse(prompt: string): Record<string, unknown> {
  // Reflect the requested keys, not a second copy of the production term list.
  return Object.fromEntries([...prompt.matchAll(/^- "([^"]+)"$/gm)].map(([, key]) => [key, `übersetzt: ${key}`]));
}

describe("SR translation process cache", () => {
  beforeEach(() => {
    delete (globalThis as typeof globalThis & { __fhSrTranslationCache?: unknown }).__fhSrTranslationCache;
    vi.resetModules();
    generate.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["truncated", (value: Record<string, unknown>) => value, "length"],
    ["partial", (value: Record<string, unknown>) => { delete value.reliability; return value; }, "stop"],
    ...["", "  ", null, 3, false, [], {}].map((invalid) => [
      `invalid ${JSON.stringify(invalid)}`,
      (value: Record<string, unknown>) => ({ ...value, reliability: invalid }),
      "stop",
    ]),
  ] as [string, (value: Record<string, unknown>) => Record<string, unknown>, string][])(
    "caches %s as a failed translation without another call",
    async (_name, change, finishReason) => {
      generate.mockImplementation(async (_label, _timeout, { prompt }) => ({
        text: JSON.stringify(change(completeResponse(prompt))), finishReason,
      }));
      const { getTranslatedSearchTerms } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
      expect(await getTranslatedSearchTerms("German")).toEqual({});
      expect(await getTranslatedSearchTerms("German")).toEqual({});
      expect(generate).toHaveBeenCalledTimes(1);
    },
  );

  it("retains a complete dictionary, drops unrequested keys and keeps the 800 cap", async () => {
    generate.mockImplementation(async (_label, _timeout, { prompt }) => ({
      text: JSON.stringify({ ...completeResponse(prompt), unrequested: "discard me" }), finishReason: "stop",
    }));
    const { getTranslatedSearchTerms } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    const result = await getTranslatedSearchTerms("German");
    expect(result).toEqual(completeResponse(generate.mock.calls[0][2].prompt));
    expect(Object.keys(result).length).toBeGreaterThan(1);
    expect(result).not.toHaveProperty("unrequested");
    expect(await getTranslatedSearchTerms("German")).toBe(result);
    expect(generate).toHaveBeenCalledExactlyOnceWith("SR translation", 30_000, expect.objectContaining({ maxOutputTokens: 800 }));
  });

  it.each(["complete", "partial", "throw"])("shares five concurrent calls per language, including %s outcomes", async (outcome) => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    generate.mockImplementation(async (_label, _timeout, { prompt }) => {
      await blocked;
      if (outcome === "throw") throw new Error("offline transport failure");
      const value = completeResponse(prompt);
      if (outcome === "partial") delete value.reliability;
      return { text: JSON.stringify(value), finishReason: "stop" };
    });
    const { getTranslatedSearchTerms } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    const pending = ["German", "French"].flatMap((language) => Array.from({ length: 5 }, () => getTranslatedSearchTerms(language)));
    expect(generate).toHaveBeenCalledTimes(2);
    expect(pending[0]).toBe(pending[4]);
    expect(pending[5]).toBe(pending[9]);
    release();
    const results = await Promise.all(pending);
    expect(results[0]).toBe(results[4]);
    expect(results[5]).toBe(results[9]);
    if (outcome !== "complete") expect(results).toEqual(Array.from({ length: 10 }, () => ({})));
    await getTranslatedSearchTerms("German");
    await getTranslatedSearchTerms("French");
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it.each(["not JSON", '{"reliability":'])("caches malformed output: %s", async (text) => {
    generate.mockResolvedValue({ text, finishReason: "stop" });
    const { getTranslatedSearchTerms } = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    expect(await getTranslatedSearchTerms("German")).toEqual({});
    expect(await getTranslatedSearchTerms("German")).toEqual({});
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("retains a cached failure across module reloads within the process", async () => {
    generate.mockResolvedValue({ text: "{}", finishReason: "length" });
    const first = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    expect(await first.getTranslatedSearchTerms("German")).toEqual({});
    vi.resetModules();
    const reloaded = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    expect(await reloaded.getTranslatedSearchTerms("German")).toEqual({});
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("shares an in-flight call across module reloads within the process", async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    generate.mockImplementation(async (_label, _timeout, { prompt }) => {
      await blocked;
      return { text: JSON.stringify(completeResponse(prompt)), finishReason: "stop" };
    });
    const first = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    const pending = first.getTranslatedSearchTerms("German");
    vi.resetModules();
    const reloaded = await import("@/lib/source-reliability/sr-eval-evidence-pack");
    const shared = reloaded.getTranslatedSearchTerms("German");
    expect(shared).toBe(pending);
    release();
    expect(await shared).toBe(await pending);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
