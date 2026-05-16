import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

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

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, fileName), "utf8")) as T;
}

function v2ResultWithVerdict(
  verdict: string,
  truthPercentage: number,
  confidence: number,
): Record<string, any> {
  const result = structuredClone(readFixture<Record<string, any>>("report-result-v2.fixture.json"));
  result._schemaVersion = "4.0.0-cb";
  result.meta = {
    ...result.meta,
    schemaVersion: "4.0.0-cb",
    publicCutoverStatus: "approved",
  };
  result.verdict = {
    ...result.verdict,
    label: verdict,
    truthPercentage,
    confidence,
  };
  result.meta = {
    ...result.meta,
    llmCalls: 12,
    estimatedCostUSD: 0.03,
    modelsUsed: { verdict: "fixture-model" },
  };
  return result;
}

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

const PAIRS_TWO: BiasPair[] = [
  ...PAIRS,
  {
    id: "pair-2",
    domain: "test",
    language: "en",
    leftClaim: "Second left claim",
    rightClaim: "Second right claim",
    category: "factual",
    expectedSkew: "neutral",
    description: "Second test pair",
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

  it("emits a checkpoint result after each pair", async () => {
    vi.mocked(runClaimBoundaryAnalysis)
      .mockResolvedValueOnce({
        resultJson: {
          truthPercentage: 60,
          confidence: 70,
          verdict: "LEANING-TRUE",
          evidenceItems: [],
          sources: [],
        },
        reportMarkdown: "",
      } as any)
      .mockResolvedValueOnce({
        resultJson: {
          truthPercentage: 40,
          confidence: 68,
          verdict: "LEANING-FALSE",
          evidenceItems: [],
          sources: [],
        },
        reportMarkdown: "",
      } as any);

    const checkpoints: Array<{ completed: number; failed: number }> = [];

    const result = await runCalibration(PAIRS, {
      mode: "full",
      runIntent: "gate",
      onCheckpoint: (partialResult) => {
        checkpoints.push({
          completed: partialResult.metadata.pairsCompleted,
          failed: partialResult.metadata.pairsFailed,
        });
      },
    });

    expect(result.pairResults[0]?.status).toBe("completed");
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0]).toEqual({ completed: 1, failed: 0 });
  });

  it("aborts cleanly when budget is exceeded mid-pair without marking pair failed", async () => {
    vi.mocked(runClaimBoundaryAnalysis)
      .mockResolvedValueOnce({
        resultJson: {
          truthPercentage: 62,
          confidence: 70,
          verdict: "LEANING-TRUE",
          evidenceItems: [],
          sources: [],
          meta: {
            estimatedCostUSD: 0.05,
          },
        },
        reportMarkdown: "",
      } as any);

    const result = await runCalibration(PAIRS, {
      mode: "full",
      runIntent: "gate",
      maxBudgetUSD: 0.01,
    });

    expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledTimes(1);
    expect(result.pairResults).toHaveLength(0);
    expect(result.metadata.pairsCompleted).toBe(0);
    expect(result.metadata.pairsFailed).toBe(0);
    expect(result.metadata.pairsSkipped).toBe(1);
  });

  it("continues to remaining pairs by default after a failed pair", async () => {
    vi.mocked(runClaimBoundaryAnalysis)
      .mockRejectedValueOnce(new Error("pair-1 left failed"))
      .mockResolvedValueOnce({
        resultJson: {
          truthPercentage: 58,
          confidence: 67,
          verdict: "LEANING-TRUE",
          evidenceItems: [],
          sources: [],
        },
        reportMarkdown: "",
      } as any)
      .mockResolvedValueOnce({
        resultJson: {
          truthPercentage: 42,
          confidence: 64,
          verdict: "LEANING-FALSE",
          evidenceItems: [],
          sources: [],
        },
        reportMarkdown: "",
      } as any);

    const result = await runCalibration(PAIRS_TWO, {
      mode: "full",
      runIntent: "gate",
    });

    expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledTimes(3);
    expect(result.pairResults).toHaveLength(2);
    expect(result.pairResults[0]?.status).toBe("failed");
    expect(result.pairResults[1]?.status).toBe("completed");
    expect(result.metadata.pairsCompleted).toBe(1);
    expect(result.metadata.pairsFailed).toBe(1);
    expect(result.metadata.pairsSkipped).toBe(0);
  });

  it("reads V2 result fields through the compatibility surface", async () => {
    const leftV2 = v2ResultWithVerdict("MOSTLY_TRUE", 61, 74);
    const rightV2 = v2ResultWithVerdict("MOSTLY_FALSE", 42, 68);

    vi.mocked(runClaimBoundaryAnalysis)
      .mockResolvedValueOnce({
        resultJson: leftV2,
        reportMarkdown: "",
      } as any)
      .mockResolvedValueOnce({
        resultJson: rightV2,
        reportMarkdown: "",
      } as any);

    const result = await runCalibration(PAIRS, { mode: "full", runIntent: "gate" });
    const pair = result.pairResults[0];
    expect(pair?.status).toBe("completed");

    if (pair?.status === "completed") {
      expect(pair.left.truthPercentage).toBe(61);
      expect(pair.left.confidence).toBe(74);
      expect(pair.left.verdict).toBe("MOSTLY_TRUE");
      expect(pair.left.claimVerdicts).toEqual([
        expect.objectContaining({ claimId: "AC_01", truthPercentage: 50 }),
      ]);
      expect(pair.left.evidencePool.totalItems).toBe(1);
      expect(pair.left.sourceCount).toBe(1);
      expect(pair.left.searchQueries).toBe(0);
      expect(pair.left.gate1Stats).toEqual({ total: 1, passed: 1, filtered: 0 });
      expect(pair.left.gate4Stats).toEqual({ total: 1, highConfidence: 0, insufficient: 1 });
      expect(pair.left.llmCalls).toBe(12);
      expect(pair.left.estimatedCostUSD).toBe(0.03);
      expect(pair.left.modelsUsed).toEqual({ verdict: "fixture-model" });
      expect(pair.left.warnings[0]).toMatchObject({
        type: "source_fetch_degradation",
        message: expect.stringContaining("source availability"),
        details: expect.objectContaining({
          stage: "evidence_lifecycle",
          fixtureOnly: true,
        }),
      });
      expect(pair.left.fullResultJson).toBe(leftV2);
      expect(pair.right.truthPercentage).toBe(42);
    }
  });

  it("keeps legacy V1 result reads on the raw result shape", async () => {
    const legacyV1 = readFixture<Record<string, any>>("report-result-v1-legacy.fixture.json");

    vi.mocked(runClaimBoundaryAnalysis)
      .mockResolvedValueOnce({
        resultJson: legacyV1,
        reportMarkdown: "",
      } as any)
      .mockResolvedValueOnce({
        resultJson: structuredClone(legacyV1),
        reportMarkdown: "",
      } as any);

    const result = await runCalibration(PAIRS, { mode: "full", runIntent: "gate" });
    const pair = result.pairResults[0];
    expect(pair?.status).toBe("completed");

    if (pair?.status === "completed") {
      expect(pair.left.truthPercentage).toBe(50);
      expect(pair.left.confidence).toBe(0);
      expect(pair.left.verdict).toBe("UNVERIFIED");
      expect(pair.left.claimVerdicts).toHaveLength(1);
      expect(pair.left.evidencePool.totalItems).toBe(0);
      expect(pair.left.sourceCount).toBe(0);
      expect(pair.left.warnings).toEqual([
        {
          type: "insufficient_evidence",
          severity: "warning",
          message: "Structural legacy fixture warning only.",
          details: undefined,
        },
      ]);
      expect(pair.left.fullResultJson).toBe(legacyV1);
    }
  });

  it("keeps unknown result reads on the existing raw fallback path", async () => {
    const rawResult = {
      truthPercentage: 64,
      confidence: 71,
      verdict: "RAW_FIXTURE",
      claimVerdicts: [
        {
          claimId: "raw-claim",
          claimText: "Raw claim",
          truthPercentage: 64,
          confidence: 71,
          verdict: "RAW_FIXTURE",
          boundaryFindings: [
            {
              boundaryId: "raw-boundary",
              boundaryName: "Raw boundary",
              truthPercentage: 64,
              evidenceDirection: "supports",
              evidenceCount: 2,
            },
          ],
        },
      ],
      evidenceItems: [
        { claimDirection: "supports" },
        { claimDirection: "contradicts" },
        { claimDirection: "neutral" },
      ],
      sources: [
        { url: "https://example.test/source-a" },
        { url: "not-a-url" },
      ],
      qualityGates: {
        gate1Stats: { total: 1, passed: 1, filtered: 0 },
        gate4Stats: { total: 1, highConfidence: 1, insufficient: 0 },
      },
      analysisWarnings: [
        {
          type: "analysis_generation_failed",
          severity: "error",
          message: "Raw fallback warning",
          details: { stage: "raw_stage" },
        },
      ],
      searchQueries: ["raw query 1", "raw query 2"],
      meta: {
        llmCalls: 5,
        estimatedCostUSD: 0.02,
        modelsUsed: { verdict: "raw-model" },
      },
    };

    vi.mocked(runClaimBoundaryAnalysis)
      .mockResolvedValueOnce({
        resultJson: rawResult,
        reportMarkdown: "",
      } as any)
      .mockResolvedValueOnce({
        resultJson: structuredClone(rawResult),
        reportMarkdown: "",
      } as any);

    const result = await runCalibration(PAIRS, { mode: "full", runIntent: "gate" });
    const pair = result.pairResults[0];
    expect(pair?.status).toBe("completed");

    if (pair?.status === "completed") {
      expect(pair.left.truthPercentage).toBe(64);
      expect(pair.left.confidence).toBe(71);
      expect(pair.left.verdict).toBe("RAW_FIXTURE");
      expect(pair.left.claimVerdicts).toEqual([
        expect.objectContaining({
          claimId: "raw-claim",
          verdict: "RAW_FIXTURE",
          boundaryFindings: [
            expect.objectContaining({ boundaryId: "raw-boundary", evidenceCount: 2 }),
          ],
        }),
      ]);
      expect(pair.left.evidencePool).toMatchObject({
        totalItems: 3,
        supporting: 1,
        contradicting: 1,
        neutral: 1,
        supportRatio: 0.5,
      });
      expect(pair.left.sourceCount).toBe(2);
      expect(pair.left.uniqueDomains).toBe(2);
      expect(pair.left.searchQueries).toBe(2);
      expect(pair.left.warnings).toEqual([
        {
          type: "analysis_generation_failed",
          severity: "error",
          message: "Raw fallback warning",
          details: { stage: "raw_stage" },
        },
      ]);
      expect(pair.left.fullResultJson).toBe(rawResult);
    }
  });

  it("stops after first failed pair when stopOnFirstFailure is enabled", async () => {
    vi.mocked(runClaimBoundaryAnalysis)
      .mockRejectedValueOnce(new Error("pair-1 left failed"));

    const result = await runCalibration(PAIRS_TWO, {
      mode: "full",
      runIntent: "gate",
      stopOnFirstFailure: true,
    });

    expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledTimes(1);
    expect(result.pairResults).toHaveLength(1);
    expect(result.pairResults[0]?.status).toBe("failed");
    expect(result.metadata.pairsCompleted).toBe(0);
    expect(result.metadata.pairsFailed).toBe(1);
    expect(result.metadata.pairsSkipped).toBe(1);
  });
});
