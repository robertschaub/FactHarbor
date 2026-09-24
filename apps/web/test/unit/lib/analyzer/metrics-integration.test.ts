import { describe, expect, it } from "vitest";
import { buildFailureModeMetrics, measuredLLMCall } from "@/lib/analyzer/metrics-integration";
import type { LLMCallMetric } from "@/lib/analyzer/metrics";

it("retains bounded schema-failure text and formatted issues, never successful responses", () => {
  const call: LLMCallMetric = { taskType: "other", provider: "anthropic", modelName: "offline",
    promptTokens: 0, completionTokens: 0, totalTokens: 0, durationMs: 1,
    success: false, schemaCompliant: false, retries: 0, timestamp: new Date() };
  const model = { provider: "anthropic", modelName: "offline" };
  const error = Object.assign(new Error("schema mismatch"), {
    name: "AI_NoObjectGeneratedError", text: "x".repeat(600),
    usage: { inputTokens: 10, outputTokens: 20 }, finishReason: "stop",
    cause: { cause: { issues: Array.from({ length: 8 }, (_, index) => ({ path: ["claims", index], message: "m".repeat(600) })) } },
  });
  const measured = measuredLLMCall(call, { model, error });
  expect(measured).toMatchObject({ failureKind: "schema", schemaFailureExcerpt: "x".repeat(512) });
  expect(measured.schemaIssues).toHaveLength(5);
  expect(measured.schemaIssues?.every((issue, index) => issue.length === 512 && issue.startsWith(`claims.${index}: `))).toBe(true);
  const result = { usage: error.usage, toolCalls: [{ input: { claims: [] } }] };
  expect(measuredLLMCall(call, { model, result }).schemaFailureExcerpt).toBe('{"claims":[]}');
  const metadataModel = { ...model, getLastCall: () => ({ result: { usage: error.usage } }) };
  expect(measuredLLMCall(call, { model: metadataModel, result }).schemaFailureExcerpt).toBe('{"claims":[]}');
  expect(measuredLLMCall(call, { model: metadataModel, result, error: { ...error, text: "" } }).schemaFailureExcerpt).toBe('{"claims":[]}');
  const success = measuredLLMCall({ ...call, success: true, schemaCompliant: true }, { model, result });
  expect(success).not.toHaveProperty("schemaFailureExcerpt");
  expect(success).not.toHaveProperty("schemaIssues");
});

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
