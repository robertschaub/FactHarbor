import { describe, expect, it } from "vitest";
import { buildFailureModeMetrics } from "@/lib/analyzer/metrics-integration";

function resultWith(types: string[]) {
  return {
    meta: { llmCalls: 10 },
    analysisWarnings: types.map((type) => ({ type, severity: "warning", details: {} })),
  };
}

describe("buildFailureModeMetrics — stage taxonomy", () => {
  it("maps previously-unknown degradation types to real stages", () => {
    const m = buildFailureModeMetrics(
      resultWith([
        "evidence_filter_degradation",
        "no_checkworthy_claims",
        "claim_selection_truncated",
        "analysis_generation_failed",
      ]),
    );
    expect(m.byStage["research_filter"]?.degradationCount).toBe(1);
    expect(m.byStage["claim_selection"]?.degradationCount).toBe(2);
    expect(m.byStage["report"]?.degradationCount).toBe(1);
    expect(m.byStage["unknown"]).toBeUndefined();
  });

  it("respects an explicit details.stage over the type mapping", () => {
    const m = buildFailureModeMetrics({
      meta: { llmCalls: 5 },
      analysisWarnings: [
        { type: "evidence_filter_degradation", severity: "warning", details: { stage: "custom_stage" } },
      ],
    });
    expect(m.byStage["custom_stage"]?.degradationCount).toBe(1);
    expect(m.byStage["research_filter"]).toBeUndefined();
  });

  it("still buckets genuinely unrecognized types as unknown", () => {
    const m = buildFailureModeMetrics(resultWith(["some_brand_new_warning"]));
    expect(m.byStage["unknown"]?.degradationCount).toBe(1);
  });
});
