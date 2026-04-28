import { describe, expect, it } from "vitest";
import {
  buildPromptRuntimeFields,
  classifyStructuralRetryCause,
  extractLLMUsageFields,
} from "@/lib/analyzer/metrics-integration";

describe("prompt runtime metric helpers", () => {
  it("builds prompt provenance and size fields without storing raw payloads", () => {
    const fields = buildPromptRuntimeFields(
      {
        content: "stable rendered system prompt",
        contentHash: "composite-hash",
        promptProfile: "claimboundary",
        promptSection: "EXTRACT_EVIDENCE",
        promptSectionHash: "section-hash",
      },
      {
        dynamicPayload: {
          claim: "Entity A made claim B.",
          sourceContent: "source text",
        },
        outputBranch: "initial",
      },
    );

    expect(fields).toMatchObject({
      promptProfile: "claimboundary",
      promptSection: "EXTRACT_EVIDENCE",
      promptContentHash: "composite-hash",
      promptSectionHash: "section-hash",
      renderedSystemChars: "stable rendered system prompt".length,
      renderedSystemEstimatedTokens: expect.any(Number),
      dynamicPayloadChars: expect.any(Number),
      dynamicPayloadEstimatedTokens: expect.any(Number),
      outputBranch: "initial",
    });
    expect(fields).not.toHaveProperty("dynamicPayload");
  });

  it("maps AI SDK v6 cache token details into existing metric fields", () => {
    const usage = extractLLMUsageFields({
      inputTokens: 100,
      outputTokens: 25,
      totalTokens: 125,
      inputTokenDetails: {
        cacheReadTokens: 70,
        cacheWriteTokens: 30,
      },
    });

    expect(usage).toEqual({
      promptTokens: 100,
      completionTokens: 25,
      totalTokens: 125,
      cacheReadInputTokens: 70,
      cacheCreationInputTokens: 30,
    });
  });

  it("classifies structural retry causes without inspecting text meaning", () => {
    expect(classifyStructuralRetryCause(new Error("No structured output returned"))).toBe("parse");
    expect(classifyStructuralRetryCause(new Error("Quality validation failed"))).toBe("validation");
    expect(classifyStructuralRetryCause(new Error("request timed out"))).toBe("timeout");
  });
});
