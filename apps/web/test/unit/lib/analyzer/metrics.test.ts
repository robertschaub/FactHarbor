import { describe, expect, it } from "vitest";
import {
  MetricsCollector,
  calculateSummaryStats,
  type LLMCallMetric,
  type AnalysisMetrics,
} from "@/lib/analyzer/metrics";
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
  it("prices the known served GPT-4.1 snapshot and keeps unknown served models unavailable", () => {
    const base = { provider: "openai", modelName: "gpt-4.1", completionTokens: 0,
      promptTokens: 1_000_000, cacheReadInputTokens: 200_000 };
    expect(finalizeMetricsForSingleCall({ ...base, servedModelName: "gpt-4.1-2025-04-14" }).estimatedCostUSD).toBe(1.7);
    expect(finalizeMetricsForSingleCall({ ...base, servedModelName: "unknown-served-model" }).estimatedCostUSD).toBeNull();
  });
  it("prices Sonnet 5 thinking once inside billed output", () => {
    const metrics = finalizeMetricsForSingleCall({ modelName: "claude-sonnet-5", reasoningTokens: 750_000 });
    expect(metrics.estimatedCostUSD).toBe(12);
  });

  it("separates cache reads, five-minute writes and one-hour writes from total input", () => {
    const metrics = finalizeMetricsForSingleCall({ modelName: "claude-sonnet-5",
      promptTokens: 1_000_000, completionTokens: 0, cacheReadInputTokens: 200_000,
      cacheCreationInputTokens: 300_000, cacheCreation1hInputTokens: 100_000 });
    expect(metrics.estimatedCostUSD).toBeCloseTo(1 + 0.04 + 0.5 + 0.4, 9);
  });

  it("uses Fable 5.1's model-specific cache-read rate", () => {
    const metrics = finalizeMetricsForSingleCall({ modelName: "claude-fable-5-1",
      promptTokens: 1_000_000, completionTokens: 0, cacheReadInputTokens: 1_000_000 });
    expect(metrics.estimatedCostUSD).toBe(0.25);
  });

  it.each([
    { modelName: "unpriced-model" },
    { usageAvailable: false },
    { cacheCreationInputTokens: 100 },
  ])("marks unavailable pricing or usage as unavailable, including summary", overrides => {
    const metrics = finalizeMetricsForSingleCall(overrides);
    expect(metrics.estimatedCostUSD).toBeNull();
    expect(metrics.costEstimate?.unpricedCalls).toBe(1);
    expect(calculateSummaryStats([metrics, finalizeMetricsForSingleCall()]).avgCost).toBeNull();
  });

  it("prices claude-sonnet-4-6 with the Anthropic standard-tier rate instead of fallback pricing", () => {
    const metrics = finalizeMetricsForSingleCall();

    expect(metrics.estimatedCostUSD).toBe(18);
  });

  it.each([
    { strength: "budget", expectedCostUSD: 6 },
    { strength: "standard", expectedCostUSD: 18 },
    { strength: "premium", expectedCostUSD: 30 },
  ] as const)(
    "prices the current Anthropic %s model ID without fallback pricing",
    ({ strength, expectedCostUSD }) => {
      const { modelName } = resolveModel(strength, "anthropic");

      const metrics = finalizeMetricsForSingleCall({ modelName });

      expect(metrics.estimatedCostUSD).toBe(expectedCostUSD);
    },
  );
});

describe("calculateSummaryStats — schemaComplianceRate", () => {
  function jobWith(calls: Array<Partial<LLMCallMetric>>): AnalysisMetrics {
    return finalizeMetricsForCalls(calls);
  }

  function finalizeMetricsForCalls(callOverrides: Array<Partial<LLMCallMetric>>): AnalysisMetrics {
    const collector = new MetricsCollector("job-summary", "claimboundary");
    for (const o of callOverrides) collector.recordLLMCall(createLLMCallMetric(o));
    collector.setGate1Stats({ totalClaims: 1, passedClaims: 1, filteredClaims: 0, filteredReasons: {}, centralClaimsKept: 1 });
    collector.setGate4Stats({ totalVerdicts: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, insufficient: 0, unpublishable: 0 });
    collector.setSchemaCompliance({ understand: { success: true, retries: 0 }, extractEvidence: [], verdict: { success: true, retries: 0 } });
    collector.setOutputQuality({ claimsExtracted: 1, claimsWithVerdicts: 1, scopesDetected: 0, sourcesFound: 0, evidenceItemsExtracted: 0, averageConfidence: 80 });
    collector.setConfig({ llmProvider: "anthropic", searchProvider: "auto", allowModelKnowledge: false, isLLMTiering: true, isDeterministic: false });
    return collector.finalize();
  }

  it("counts a job as compliant when every llmCall has schemaCompliant=true", () => {
    const m = jobWith([{ schemaCompliant: true }, { schemaCompliant: true }]);
    expect(calculateSummaryStats([m]).schemaComplianceRate).toBe(100);
  });

  it("counts a job as non-compliant when any llmCall has schemaCompliant=false", () => {
    const m = jobWith([{ schemaCompliant: true }, { schemaCompliant: false }]);
    expect(calculateSummaryStats([m]).schemaComplianceRate).toBe(0);
  });

  it("does not count a job with zero llmCalls as compliant", () => {
    const m = jobWith([]);
    expect(calculateSummaryStats([m]).schemaComplianceRate).toBe(0);
  });

  it("aggregates per-job over a mixed batch", () => {
    const ok = jobWith([{ schemaCompliant: true }]);
    const bad = jobWith([{ schemaCompliant: true }, { schemaCompliant: false }]);
    const rate = calculateSummaryStats([ok, bad, ok, ok]).schemaComplianceRate;
    expect(rate).toBe(75);
  });

  it("ignores source-reliability calls, which have no pipeline schema contract", () => {
    const m = jobWith([{ schemaCompliant: true }, { taskType: "source_reliability", schemaCompliant: false }]);
    expect(calculateSummaryStats([m]).schemaComplianceRate).toBe(100);
  });

  it("does not count a job with only source-reliability calls as compliant", () => {
    const m = jobWith([{ taskType: "source_reliability", schemaCompliant: true }]);
    expect(calculateSummaryStats([m]).schemaComplianceRate).toBe(0);
  });
});

describe("estimatedCostUSD — search estimate", () => {
  it("does not charge searches served from the search cache", () => {
    const collector = new MetricsCollector("job-search", "claimboundary");
    const query = { query: "q", provider: "serper", resultsCount: 3, durationMs: 5, success: true, timestamp: new Date() };
    collector.recordSearchQuery(query);
    collector.recordSearchQuery({ ...query, cached: true });

    expect(collector.finalize().estimatedCostUSD).toBeCloseTo(0.005, 10);
  });
});
