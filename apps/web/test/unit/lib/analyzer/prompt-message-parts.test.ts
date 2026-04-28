import { describe, expect, it } from "vitest";
import {
  joinPromptUserContent,
  splitRenderedPromptAtHeader,
} from "@/lib/analyzer/prompt-message-parts";
import type { RenderedPromptSection } from "@/lib/analyzer/prompt-loader";

function rendered(content: string): RenderedPromptSection {
  return {
    content,
    contentHash: "composite-hash",
    loadedAt: "2026-04-28T00:00:00.000Z",
    warnings: [],
    promptProfile: "claimboundary",
    promptSection: "TEST_SECTION",
    promptSectionHash: "section-hash",
    promptSectionEstimatedTokens: 1,
  };
}

describe("prompt message parts", () => {
  it("splits rendered prompt content at the requested heading", () => {
    const parts = splitRenderedPromptAtHeader(
      rendered("Stable rules\n\n### Input\n\nDynamic payload\n\n### Output Schema\n{}"),
      "### Input",
    );

    expect(parts).toEqual({
      systemContent: "Stable rules",
      userContent: "### Input\n\nDynamic payload\n\n### Output Schema\n{}",
      separated: true,
    });
  });

  it("keeps the full rendered prompt when the split heading is unavailable", () => {
    const content = "Stable rules and dynamic payload without a delimiter";

    expect(splitRenderedPromptAtHeader(rendered(content), "### Input")).toEqual({
      systemContent: content,
      userContent: "",
      separated: false,
    });
  });

  it("joins non-empty user content parts with blank lines", () => {
    expect(joinPromptUserContent(["  A  ", undefined, "", "B"])).toBe("A\n\nB");
  });
});
