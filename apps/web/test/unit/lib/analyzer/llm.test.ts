import { describe, expect, it } from "vitest";
import { getPromptCachingOptions } from "@/lib/analyzer/llm";

describe("LLM prompt caching policy", () => {
  it("keeps Anthropic prompt caching hard-off for every provider", () => {
    expect(getPromptCachingOptions()).toBeUndefined();
    expect(getPromptCachingOptions("anthropic")).toBeUndefined();
    expect(getPromptCachingOptions("claude")).toBeUndefined();
    expect(getPromptCachingOptions("openai")).toBeUndefined();
  });
});
