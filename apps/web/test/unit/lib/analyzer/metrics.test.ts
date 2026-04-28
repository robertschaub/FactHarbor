import { describe, expect, it } from "vitest";
import { MetricsCollector, type LLMCallMetric } from "@/lib/analyzer/metrics";
import { resolveModel } from "@/lib/analyzer/model-resolver";

function createLLMCallMetric(overrides: Partial<LLMCallMetric> = {}): LLMCallMetric {
  return {
    taskType: "understand",
    provider: "anthropic",
    modelName: "claude-sonnet-4-6",
    promptTokens: 1_000_000,
    completionTokens: 1_000_000,
    totalTokens: 2_000_000,
    durationMs: 100,
    success: true,
    schemaCompliant: true,
    retries: 0,
    timestamp: new Date("2026-04-15T10:00:00.000Z"),
    ...overrides,
  };
}

function finalizeMetricsForSingleCall(overrides: Partial<LLMCallMetric> = {}) {
  const collector = new MetricsCollector("job-metrics", "claimboundary");

  collector.recordLLMCall(createLLMCallMetric(overrides));
  collector.setGate1Stats({
    totalClaims: 1,
    passedClaims: 1,
    filteredClaims: 0,
    filteredReasons: {},
    centralClaimsKept: 1,
  });
  collector.setGate4Stats({
    totalVerdicts: 1,
    highConfidence: 1,
    mediumConfidence: 0,
    lowConfidence: 0,
    insufficient: 0,
    unpublishable: 0,
  });
  collector.setSchemaCompliance({
    understand: { success: true, retries: 0 },
    extractEvidence: [],
    verdict: { success: true, retries: 0 },
  });
  collector.setOutputQuality({
    claimsExtracted: 1,
    claimsWithVerdicts: 1,
    scopesDetected: 0,
    sourcesFound: 0,
    evidenceItemsExtracted: 0,
    averageConfidence: 80,
  });
  collector.setConfig({
    llmProvider: "anthropic",
    searchProvider: "auto",
    allowModelKnowledge: false,
    isLLMTiering: true,
    isDeterministic: false,
  });

  return collector.finalize();
}

describe("MetricsCollector cost estimation", () => {
  it("prices claude-sonnet-4-6 with the Anthropic standard-tier rate instead of fallback pricing", () => {
    const metrics = finalizeMetricsForSingleCall();

    expect(metrics.estimatedCostUSD).toBe(18);
  });

  it.each([
    { strength: "budget", expectedCostUSD: 6 },
    { strength: "standard", expectedCostUSD: 18 },
    { strength: "premium", expectedCostUSD: 90 },
  ] as const)(
    "prices the current Anthropic %s model ID without fallback pricing",
    ({ strength, expectedCostUSD }) => {
      const { modelName } = resolveModel(strength, "anthropic");

      const metrics = finalizeMetricsForSingleCall({ modelName });

      expect(metrics.estimatedCostUSD).toBe(expectedCostUSD);
    },
  );
});

describe("MetricsCollector prompt runtime diagnostics", () => {
  it("preserves optional prompt-runtime fields on individual LLM calls", () => {
    const metrics = finalizeMetricsForSingleCall({
      promptProfile: "claimboundary",
      promptSection: "EXTRACT_EVIDENCE",
      promptContentHash: "composite-hash",
      promptSectionHash: "section-hash",
      renderedSystemChars: 1400,
      renderedSystemEstimatedTokens: 400,
      dynamicPayloadChars: 700,
      dynamicPayloadEstimatedTokens: 200,
      retryCause: "schema",
      retryBranch: "pass2_guided_retry",
      outputBranch: "retry",
    });

    expect(metrics.llmCalls[0]).toMatchObject({
      promptProfile: "claimboundary",
      promptSection: "EXTRACT_EVIDENCE",
      promptContentHash: "composite-hash",
      promptSectionHash: "section-hash",
      renderedSystemChars: 1400,
      renderedSystemEstimatedTokens: 400,
      dynamicPayloadChars: 700,
      dynamicPayloadEstimatedTokens: 200,
      retryCause: "schema",
      retryBranch: "pass2_guided_retry",
      outputBranch: "retry",
    });
  });

  it("aggregates provider cache read and creation token fields", () => {
    const metrics = finalizeMetricsForSingleCall({
      cacheReadInputTokens: 120,
      cacheCreationInputTokens: 80,
    });

    expect(metrics.tokenCounts.cacheReadInputTokens).toBe(120);
    expect(metrics.tokenCounts.cacheCreationInputTokens).toBe(80);
  });
});
