import { describe, expect, it } from "vitest";
import { EvaluationResultSchema } from "@/lib/source-reliability/sr-eval-types";

function makeEvaluation(overrides: Record<string, unknown> = {}) {
  return {
    score: 0.62,
    confidence: 0.74,
    reasoning: "Evidence supports a moderately reliable assessment.",
    factualRating: "leaning_reliable",
    ...overrides,
  };
}

describe("EvaluationResultSchema", () => {
  it("normalizes the known legacy sourceType alias to the canonical value", () => {
    const parsed = EvaluationResultSchema.parse(makeEvaluation({
      sourceType: "political-party",
      biasIndicator: "centre-right",
      bias: {
        politicalBias: "centre-right",
        otherBias: "advocacy",
      },
    }));

    expect(parsed.sourceType).toBe("advocacy");
    expect(parsed.biasIndicator).toBe("center_right");
    expect(parsed.bias?.politicalBias).toBe("center_right");
    expect(parsed.bias?.otherBias).toBe("ideological_other");
  });

  it("falls back unsupported enum values to safe canonical defaults", () => {
    const parsed = EvaluationResultSchema.parse(makeEvaluation({
      sourceType: "mystery_bucket",
      biasIndicator: "neutralish",
      bias: {
        politicalBias: "neutralish",
        otherBias: "custom_bias",
      },
    }));

    expect(parsed.sourceType).toBe("unknown");
    expect(parsed.biasIndicator).toBe("not_applicable");
    expect(parsed.bias?.politicalBias).toBe("not_applicable");
    expect(parsed.bias?.otherBias).toBeNull();
  });

  it("canonicalizes separator variants for supported bias values", () => {
    const parsed = EvaluationResultSchema.parse(makeEvaluation({
      sourceType: undefined,
      biasIndicator: "center-right",
      bias: {
        politicalBias: "center-right",
        otherBias: "none-detected",
      },
    }));

    expect(parsed.sourceType).toBe("unknown");
    expect(parsed.biasIndicator).toBe("center_right");
    expect(parsed.bias?.politicalBias).toBe("center_right");
    expect(parsed.bias?.otherBias).toBe("none_detected");
  });
});
