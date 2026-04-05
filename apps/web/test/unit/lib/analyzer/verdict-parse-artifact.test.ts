/**
 * Stage-4 Parse Failure Artifact Tests
 *
 * Verifies that when Stage-4 JSON parsing fails, a diagnostic artifact
 * is captured in the LLM call metrics with enough fidelity to inspect
 * the exact malformed output. Admin-only — never user-facing.
 *
 * @see apps/web/src/lib/analyzer/verdict-generation-stage.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies before imports
vi.mock("ai", () => ({
  generateText: vi.fn(),
  APICallError: { isInstance: () => false },
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({
    model: { id: "mock-model" },
    modelName: "claude-sonnet-mock",
    provider: "anthropic",
  })),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => ({})),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(async () => ({
    content: "mock system prompt",
    contentHash: "abc123",
    loadedAt: new Date().toISOString(),
    warnings: [],
  })),
}));

vi.mock("@/lib/analyzer/llm-provider-guard", () => ({
  runWithLlmProviderGuard: vi.fn((_provider: string, _model: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: vi.fn(async () => ({ config: {}, contentHash: "test" })),
  loadCalcConfig: vi.fn(async () => ({ config: {}, contentHash: "test" })),
}));

vi.mock("@/lib/error-classification", () => ({
  classifyError: vi.fn(() => ({ provider: "unknown", category: "unknown", message: "test" })),
}));

vi.mock("@/lib/provider-health", () => ({
  recordProviderFailure: vi.fn(() => ({ circuitOpened: false })),
  pauseSystem: vi.fn(),
}));

const mockRecordLLMCall = vi.fn();
vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordLLMCall: (...args: unknown[]) => mockRecordLLMCall(...args),
}));

import { generateText } from "ai";
import { createProductionLLMCall } from "@/lib/analyzer/verdict-generation-stage";
import type { ParseFailureArtifact } from "@/lib/analyzer/metrics";

const mockGenerateText = vi.mocked(generateText);

// ============================================================================
// TEST HELPERS
// ============================================================================

function makeResponse(text: string, usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }) {
  return {
    text,
    usage: {
      inputTokens: usage?.inputTokens ?? 1000,
      outputTokens: usage?.outputTokens ?? 500,
      totalTokens: usage?.totalTokens ?? 1500,
    },
  } as any;
}

/** Extract all recordLLMCall invocations that have a parseFailureArtifact */
function getArtifactCalls(): Array<{ call: any; artifact: ParseFailureArtifact }> {
  return mockRecordLLMCall.mock.calls
    .map((args) => args[0])
    .filter((call: any) => call.parseFailureArtifact)
    .map((call: any) => ({ call, artifact: call.parseFailureArtifact }));
}

/** Extract all recordLLMCall invocations */
function getAllCalls(): any[] {
  return mockRecordLLMCall.mock.calls.map((args) => args[0]);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Stage-4 parse failure artifact capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures artifact on first-attempt parse failure with fenced JSON", async () => {
    const malformedFenced = "```json\n[\n  {\n    \"id\": \"CV_AC_01\", \"claimId\": broken here";
    // First call returns unparseable, retry also returns unparseable
    mockGenerateText
      .mockResolvedValueOnce(makeResponse(malformedFenced))
      .mockResolvedValueOnce(makeResponse(malformedFenced));

    const llmCall = createProductionLLMCall({} as any);

    await expect(
      llmCall("VERDICT_ADVOCATE", {}, {
        callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
      }),
    ).rejects.toThrow("Failed to parse LLM response as JSON");

    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBe(2); // initial + retry

    // First attempt artifact
    const initial = artifacts.find((a) => a.artifact.attempt === "initial")!;
    expect(initial).toBeDefined();
    expect(initial.artifact.promptKey).toBe("VERDICT_ADVOCATE");
    expect(initial.artifact.debateRole).toBe("advocate");
    expect(initial.artifact.attempt).toBe("initial");
    expect(initial.artifact.rawLength).toBe(malformedFenced.length);
    expect(initial.artifact.startsWithKind).toBe("fence");
    expect(initial.artifact.expectedRoot).toBe("array");
    expect(initial.artifact.rawPrefix).toBe(malformedFenced);
    expect(initial.artifact.recoveriesAttempted).toContain("direct_parse");
    expect(initial.artifact.recoveriesAttempted).toContain("fenced_parse");

    // Retry artifact
    const retry = artifacts.find((a) => a.artifact.attempt === "retry")!;
    expect(retry).toBeDefined();
    expect(retry.artifact.attempt).toBe("retry");
    expect(retry.artifact.promptKey).toBe("VERDICT_ADVOCATE");
  });

  it("captures artifact with prose-starting response", async () => {
    const proseResponse = "Here are the verdicts for each claim:\n\n" + JSON.stringify([{ id: "CV_AC_01" }]) + "\n\nI hope this helps.";
    // This should actually parse via embedded value extraction, but let's use truly unparseable prose
    const badProse = "I apologize, but I cannot generate verdicts for these claims because they involve sensitive political topics.";
    mockGenerateText
      .mockResolvedValueOnce(makeResponse(badProse))
      .mockResolvedValueOnce(makeResponse(badProse));

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_ADVOCATE", {}, {
        callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
      }),
    ).rejects.toThrow();

    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBe(2);
    expect(artifacts[0].artifact.startsWithKind).toBe("prose");
  });

  it("truncates long responses to prefix/suffix limits", async () => {
    // Build a response larger than ARTIFACT_PREFIX_LIMIT + ARTIFACT_SUFFIX_LIMIT
    const bigText = "```json\n" + "x".repeat(10000) + "\n```";
    mockGenerateText
      .mockResolvedValueOnce(makeResponse(bigText))
      .mockResolvedValueOnce(makeResponse(bigText));

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_ADVOCATE", {}, {
        callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
      }),
    ).rejects.toThrow();

    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBeGreaterThanOrEqual(1);
    const artifact = artifacts[0].artifact;

    expect(artifact.rawLength).toBe(bigText.length);
    expect(artifact.rawPrefix.length).toBeLessThanOrEqual(4096);
    expect(artifact.rawSuffix.length).toBeLessThanOrEqual(2048);
    // Prefix should start with the beginning of the response
    expect(artifact.rawPrefix.startsWith("```json")).toBe(true);
    // Suffix should end with the end of the response
    expect(artifact.rawSuffix.endsWith("```")).toBe(true);
  });

  it("does NOT capture artifact on successful parse", async () => {
    const validJson = JSON.stringify([{ id: "CV_AC_01", claimId: "AC_01", truthPercentage: 72 }]);
    mockGenerateText.mockResolvedValue(makeResponse(validJson));

    const llmCall = createProductionLLMCall({} as any);
    await llmCall("VERDICT_ADVOCATE", {}, {
      callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
    });

    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBe(0);

    // Verify a successful call WAS recorded (without artifact)
    const allCalls = getAllCalls();
    const successCalls = allCalls.filter((c: any) => c.schemaCompliant === true);
    expect(successCalls.length).toBeGreaterThanOrEqual(1);
    expect(successCalls[0].parseFailureArtifact).toBeUndefined();
  });

  it("records correct metadata on the parent LLM call metric", async () => {
    const malformed = "not json at all";
    mockGenerateText
      .mockResolvedValueOnce(makeResponse(malformed, { inputTokens: 19511, outputTokens: 7038, totalTokens: 26549 }))
      .mockResolvedValueOnce(makeResponse(malformed));

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_ADVOCATE", {}, {
        callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
      }),
    ).rejects.toThrow();

    const artifacts = getArtifactCalls();
    const initial = artifacts.find((a) => a.artifact.attempt === "initial")!;

    // Verify parent metric has correct fields
    expect(initial.call.taskType).toBe("verdict");
    expect(initial.call.schemaCompliant).toBe(false);
    expect(initial.call.debateRole).toBe("advocate");
    expect(initial.call.promptTokens).toBe(19511);
    expect(initial.call.completionTokens).toBe(7038);
  });

  it("records all four recovery strategies on complete failure", async () => {
    const malformed = "totally broken not json";
    mockGenerateText
      .mockResolvedValueOnce(makeResponse(malformed))
      .mockResolvedValueOnce(makeResponse(malformed));

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_ADVOCATE", {}, {
        callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
      }),
    ).rejects.toThrow();

    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBeGreaterThanOrEqual(1);
    const recoveries = artifacts[0].artifact.recoveriesAttempted;
    expect(recoveries).toContain("direct_parse");
    expect(recoveries).toContain("fenced_parse");
    expect(recoveries).toContain("embedded_value_extraction");
    expect(recoveries).toContain("truncated_repair");
  });

  it("handles empty response gracefully", async () => {
    // Empty response triggers early throw, not the parse path — verify no artifact
    mockGenerateText.mockResolvedValue(makeResponse(""));

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_ADVOCATE", {}),
    ).rejects.toThrow("empty response");

    // Empty response throws before parse — no artifact expected
    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBe(0);
  });
});

// ============================================================================
// PARSE RECOVERY — EXPECTED ROOT VALIDATION (Fix 3)
// ============================================================================

describe("Stage-4 parse recovery expected-root validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a valid JSON object when expected root is array (ADVOCATE)", async () => {
    // ADVOCATE expects an array. Return a valid JSON object — should be rejected.
    const validObject = JSON.stringify({ id: "CV_AC_01", claimId: "AC_01", truthPercentage: 72 });
    mockGenerateText
      .mockResolvedValueOnce(makeResponse(validObject))
      .mockResolvedValueOnce(makeResponse(validObject));

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_ADVOCATE", {}, {
        callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
      }),
    ).rejects.toThrow("Failed to parse LLM response as JSON");

    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBeGreaterThanOrEqual(1);
    expect(artifacts[0].artifact.expectedRoot).toBe("array");
  });

  it("accepts a valid JSON array when expected root is array (ADVOCATE)", async () => {
    const validArray = JSON.stringify([{ id: "CV_AC_01", claimId: "AC_01", truthPercentage: 72 }]);
    mockGenerateText.mockResolvedValue(makeResponse(validArray));

    const llmCall = createProductionLLMCall({} as any);
    const result = await llmCall("VERDICT_ADVOCATE", {}, {
      callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
    });

    expect(Array.isArray(result)).toBe(true);
    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBe(0);
  });

  it("rejects a valid JSON array when expected root is object (CHALLENGER)", async () => {
    // CHALLENGER expects an object. Return a valid JSON array — should be rejected.
    const validArray = JSON.stringify([{ id: "CV_AC_01" }]);
    mockGenerateText
      .mockResolvedValueOnce(makeResponse(validArray))
      .mockResolvedValueOnce(makeResponse(validArray));

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_CHALLENGER", {}, {
        callContext: { debateRole: "challenger", promptKey: "VERDICT_CHALLENGER" },
      }),
    ).rejects.toThrow("Failed to parse LLM response as JSON");

    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBeGreaterThanOrEqual(1);
    expect(artifacts[0].artifact.expectedRoot).toBe("object");
  });

  it("skips wrong-root direct parse and finds correct root via fenced recovery", async () => {
    // ADVOCATE expects array. Direct parse yields an object, but fenced block has an array.
    const mixedResponse = '{"wrong": true}\n\n```json\n[{"id": "CV_AC_01", "claimId": "AC_01"}]\n```';
    mockGenerateText.mockResolvedValue(makeResponse(mixedResponse));

    const llmCall = createProductionLLMCall({} as any);
    const result = await llmCall("VERDICT_ADVOCATE", {}, {
      callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" },
    });

    expect(Array.isArray(result)).toBe(true);
    const artifacts = getArtifactCalls();
    expect(artifacts.length).toBe(0);
  });
});
