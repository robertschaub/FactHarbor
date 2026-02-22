import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analyzer/claimboundary-pipeline", () => ({
  runClaimBoundaryAnalysis: vi.fn(),
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: vi.fn(async () => ({
    config: {
      llmProvider: "anthropic",
      llmTiering: true,
      modelUnderstand: "claude-haiku-4-5-20251001",
      modelExtractEvidence: "claude-haiku-4-5-20251001",
      modelVerdict: "claude-sonnet-4-5-20250929",
      debateProfile: "baseline",
    },
    contentHash: "pipeline-hash",
  })),
  loadSearchConfig: vi.fn(async () => ({
    config: { provider: "auto" },
    contentHash: "search-hash",
  })),
  loadCalcConfig: vi.fn(async () => ({
    config: {},
    contentHash: "calc-hash",
  })),
}));

vi.mock("@/lib/web-search", () => ({
  getActiveSearchProviders: vi.fn(() => ["Google-CSE"]),
}));

import { runCalibration } from "@/lib/calibration/runner";
import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";
import type { BiasPair } from "@/lib/calibration/types";

const PAIRS: BiasPair[] = [
  {
    id: "pair-1",
    domain: "test",
    language: "en",
    leftClaim: "Left claim",
    rightClaim: "Right claim",
    category: "factual",
    expectedSkew: "neutral",
    description: "Test pair",
  },
];

describe("runCalibration failure diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bubbles structured error metadata into failed pair diagnostics", async () => {
    const err = Object.assign(new Error("TPM guard exhausted"), {
      name: "Stage4LLMCallError",
      details: {
        stage: "stage4_verdict",
        promptKey: "VERDICT_CHALLENGER",
        provider: "openai",
        model: "gpt-4.1",
      },
    });

    vi.mocked(runClaimBoundaryAnalysis).mockRejectedValueOnce(err);

    const result = await runCalibration(PAIRS, { mode: "full", runIntent: "gate" });
    const failed = result.pairResults[0];
    expect(failed?.status).toBe("failed");

    if (failed?.status === "failed") {
      expect(failed.error).toBe("TPM guard exhausted");
      expect(failed.diagnostics?.errorClass).toBe("Stage4LLMCallError");
      expect(failed.diagnostics?.stage).toBe("stage4_verdict");
      expect(failed.diagnostics?.promptKey).toBe("VERDICT_CHALLENGER");
      expect(failed.diagnostics?.provider).toBe("openai");
      expect(failed.diagnostics?.model).toBe("gpt-4.1");
      expect(failed.diagnostics?.side).toBe("left");
    }
  });

  it("retries once on known value-read crash and continues pair execution", async () => {
    vi.mocked(runClaimBoundaryAnalysis)
      .mockRejectedValueOnce(
        new TypeError("Cannot read properties of undefined (reading 'value')"),
      )
      .mockResolvedValueOnce({
        resultJson: {
          truthPercentage: 61,
          confidence: 66,
          verdict: "LEANING-TRUE",
          evidenceItems: [],
          sources: [],
        },
        reportMarkdown: "",
      } as any)
      .mockResolvedValueOnce({
        resultJson: {
          truthPercentage: 40,
          confidence: 62,
          verdict: "LEANING-FALSE",
          evidenceItems: [],
          sources: [],
        },
        reportMarkdown: "",
      } as any);

    const result = await runCalibration(PAIRS, { mode: "full", runIntent: "gate" });
    const pair = result.pairResults[0];
    expect(pair?.status).toBe("completed");
    expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledTimes(3);
  });
});
