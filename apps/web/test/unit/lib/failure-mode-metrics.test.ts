import { describe, expect, it } from "vitest";
import { buildFailureModeMetrics } from "../../../src/lib/analyzer/metrics-integration";

function makeResult(overrides: {
  analysisWarnings?: Array<{
    type?: string;
    severity?: string;
    message?: string;
    details?: Record<string, unknown>;
  }>;
  meta?: Record<string, unknown>;
} = {}) {
  return {
    analysisWarnings: overrides.analysisWarnings ?? [],
    meta: overrides.meta ?? {},
  };
}

describe("buildFailureModeMetrics", () => {
  it("counts warning/error severities as degradation events", () => {
    const metrics = buildFailureModeMetrics(makeResult({
      analysisWarnings: [
        { type: "low_source_count", severity: "warning", message: "thin evidence base" },
        { type: "no_successful_sources", severity: "warning", message: "no sources fetched" },
      ],
      meta: { llmCalls: 10 },
    }));

    expect(metrics.totalWarnings).toBe(2);
    expect(metrics.degradationEvents).toBe(2);
    expect(metrics.refusalEvents).toBe(0);
    expect(metrics.degradationRatePer100LlmCalls).toBeCloseTo(20);
  });

  it("counts fallback warnings even when emitted as info", () => {
    const metrics = buildFailureModeMetrics(makeResult({
      analysisWarnings: [
        { type: "classification_fallback", severity: "info", message: "classification fallback used" },
        { type: "contested_verdict_range", severity: "info", message: "wide verdict range" },
      ],
      meta: { llmCalls: 5 },
    }));

    expect(metrics.totalWarnings).toBe(2);
    expect(metrics.degradationEvents).toBe(1);
    expect(metrics.refusalEvents).toBe(0);
  });

  it("tracks refusal warnings as refusal and degradation events", () => {
    const metrics = buildFailureModeMetrics(makeResult({
      analysisWarnings: [
        {
          type: "structured_output_failure",
          severity: "warning",
          message: "model refusal",
          details: { reason: "Refusal: safety policy" },
        },
      ],
      meta: { llmCalls: 4 },
    }));

    expect(metrics.refusalEvents).toBe(1);
    expect(metrics.degradationEvents).toBe(1);
    expect(metrics.refusalRatePer100LlmCalls).toBeCloseTo(25);
    expect(metrics.degradationRatePer100LlmCalls).toBeCloseTo(25);
  });

  it("maps source-fetch warnings to research_fetch stage and provider bucket", () => {
    const metrics = buildFailureModeMetrics(makeResult({
      analysisWarnings: [
        {
          type: "source_fetch_degradation",
          severity: "warning",
          message: "fetch degradation",
          details: { searchProvider: "serpapi" },
        },
      ],
      meta: { llmCalls: 1 },
    }));

    expect(metrics.byStage.research_fetch?.degradationCount).toBe(1);
    expect(metrics.byProvider.serpapi?.degradationCount).toBe(1);
  });

  it("ignores informational non-fallback warnings for degradation counts", () => {
    const metrics = buildFailureModeMetrics(makeResult({
      analysisWarnings: [
        { type: "contested_verdict_range", severity: "info", message: "range warning" },
        { type: "evidence_partition_stats", severity: "info", message: "partition stats" },
      ],
    }));

    expect(metrics.totalWarnings).toBe(2);
    expect(metrics.degradationEvents).toBe(0);
    expect(metrics.refusalEvents).toBe(0);
  });
});
