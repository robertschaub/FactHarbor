import { describe, expect, it } from "vitest";
import { MetricsCollector, type LLMCallMetric } from "@/lib/analyzer/metrics";

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

describe("MetricsCollector cost estimation", () => {
  it("prices claude-sonnet-4-6 with the Anthropic standard-tier rate instead of fallback pricing", () => {
    const collector = new MetricsCollector("job-metrics", "claimboundary");

    collector.recordLLMCall(createLLMCallMetric());
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

    const metrics = collector.finalize();

    expect(metrics.estimatedCostUSD).toBe(18);
  });
});
