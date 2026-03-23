import { describe, expect, it, beforeEach } from "vitest";

import {
  __resetLlmProviderGuardForTests,
  getLlmProviderConcurrencyLimit,
  runWithLlmProviderGuard,
} from "@/lib/analyzer/llm-provider-guard";

describe("llm-provider-guard", () => {
  beforeEach(() => {
    __resetLlmProviderGuardForTests();
  });

  it("uses lane-specific defaults and overrides", () => {
    expect(getLlmProviderConcurrencyLimit("anthropic", "claude-sonnet-4-5", {})).toBe(2);
    expect(getLlmProviderConcurrencyLimit("anthropic", "claude-haiku-4-5", {})).toBe(3);
    expect(getLlmProviderConcurrencyLimit("openai", "gpt-4.1", {})).toBe(3);
    expect(
      getLlmProviderConcurrencyLimit("anthropic", "claude-sonnet-4-5", {
        FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET: "4",
      }),
    ).toBe(4);
    expect(
      getLlmProviderConcurrencyLimit("anthropic", "claude-haiku-4-5", {
        FH_LLM_MAX_CONCURRENCY_ANTHROPIC: "4",
      }),
    ).toBe(4);
    expect(
      getLlmProviderConcurrencyLimit("openai", "gpt-4.1", {
        FH_LLM_MAX_CONCURRENCY_DEFAULT: "5",
      }),
    ).toBe(5);
  });

  it("serializes calls when provider limit is 1", async () => {
    const events: string[] = [];
    let active = 0;
    let maxObserved = 0;

    const makeTask = (label: string, delayMs: number) =>
      runWithLlmProviderGuard(
        "anthropic",
        "claude-sonnet-4-5",
        async () => {
          active += 1;
          maxObserved = Math.max(maxObserved, active);
          events.push(`${label}:start`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          events.push(`${label}:end`);
          active -= 1;
          return label;
        },
        { FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET: "1" },
      );

    const [first, second] = await Promise.all([
      makeTask("first", 10),
      makeTask("second", 0),
    ]);

    expect(first).toBe("first");
    expect(second).toBe("second");
    expect(maxObserved).toBe(1);
    expect(events).toEqual(["first:start", "first:end", "second:start", "second:end"]);
  });

  it("queues only the excess call when provider limit is 2", async () => {
    const events: string[] = [];
    let active = 0;
    let maxObserved = 0;

    const makeTask = (label: string, delayMs: number) =>
      runWithLlmProviderGuard(
        "anthropic",
        "claude-sonnet-4-5",
        async () => {
          active += 1;
          maxObserved = Math.max(maxObserved, active);
          events.push(`${label}:start`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          events.push(`${label}:end`);
          active -= 1;
          return label;
        },
        { FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET: "2" },
      );

    const [first, second, third] = await Promise.all([
      makeTask("first", 20),
      makeTask("second", 20),
      makeTask("third", 0),
    ]);

    expect(first).toBe("first");
    expect(second).toBe("second");
    expect(third).toBe("third");
    expect(maxObserved).toBe(2);
    expect(events.slice(0, 2)).toEqual(["first:start", "second:start"]);
    const firstEndIndex = events.findIndex((event) => /^(first|second):end$/.test(event));
    const thirdStartIndex = events.indexOf("third:start");
    const thirdEndIndex = events.indexOf("third:end");
    expect(firstEndIndex).toBeGreaterThanOrEqual(2);
    expect(thirdStartIndex).toBeGreaterThan(firstEndIndex);
    expect(thirdEndIndex).toBeGreaterThan(thirdStartIndex);
  });

  it("keeps Anthropic Sonnet and Haiku on separate concurrency lanes", async () => {
    const events: string[] = [];

    const sonnetTask = runWithLlmProviderGuard(
      "anthropic",
      "claude-sonnet-4-5",
      async () => {
        events.push("sonnet:start");
        await new Promise((resolve) => setTimeout(resolve, 15));
        events.push("sonnet:end");
        return "sonnet";
      },
      { FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET: "1" },
    );

    const haikuTask = runWithLlmProviderGuard(
      "anthropic",
      "claude-haiku-4-5",
      async () => {
        events.push("haiku:start");
        await new Promise((resolve) => setTimeout(resolve, 0));
        events.push("haiku:end");
        return "haiku";
      },
      { FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET: "1" },
    );

    const [sonnet, haiku] = await Promise.all([sonnetTask, haikuTask]);

    expect(sonnet).toBe("sonnet");
    expect(haiku).toBe("haiku");
    expect(events.slice(0, 2).sort()).toEqual(["haiku:start", "sonnet:start"]);
    expect(events.indexOf("haiku:end")).toBeLessThan(events.indexOf("sonnet:end"));
  });
});
