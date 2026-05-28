import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AtomicClaim } from "@/lib/analyzer/types";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/config-schemas";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((args) => args),
  },
}));

vi.mock("@/lib/analyzer/llm", () => ({
  extractStructuredOutput: vi.fn(),
  getModelForTask: vi.fn(() => ({
    provider: "anthropic",
    modelName: "claude-test",
    model: {},
  })),
  getPromptCachingOptions: vi.fn(() => undefined),
  getStructuredOutputProviderOptions: vi.fn(() => ({ anthropic: { structuredOutputMode: "jsonTool" } })),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(async () => ({
    content: "selector prompt",
    contentHash: "hash",
    loadedAt: "2026-05-24T00:00:00Z",
    warnings: [],
  })),
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordLLMCall: vi.fn(),
}));

import { generateText } from "ai";
import { extractStructuredOutput } from "@/lib/analyzer/llm";
import { loadAndRenderSection } from "@/lib/analyzer/prompt-loader";
import { recordLLMCall } from "@/lib/analyzer/metrics-integration";
import {
  buildClaimSelectionPromptClaims,
  generateClaimSelectionRecommendation,
  normalizeClaimAutoSelectionCandidateCap,
  normalizeClaimAutoSelectionCap,
  validateClaimSelectionRecommendation,
} from "@/lib/analyzer/claim-selection-recommendation";

const mockGenerateText = vi.mocked(generateText);
const mockExtractStructuredOutput = vi.mocked(extractStructuredOutput);
const mockLoadAndRenderSection = vi.mocked(loadAndRenderSection);
const mockRecordLLMCall = vi.mocked(recordLLMCall);

function claim(id: string, statement = `${id} statement`): AtomicClaim {
  return {
    id,
    statement,
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    thesisRelevance: "direct",
    keyEntities: [],
    checkWorthiness: "low",
    specificityScore: 0.8,
    groundingQuality: "strong",
    expectedEvidenceProfile: {
      methodologies: [],
      expectedMetrics: [],
      expectedSourceTypes: [],
    },
  };
}

function recommendation(overrides: Record<string, unknown> = {}) {
  return {
    rankedClaimIds: ["AC_01", "AC_02"],
    recommendedClaimIds: ["AC_01"],
    assessments: [
      {
        claimId: "AC_01",
        triageLabel: "fact_check_worthy",
        thesisDirectness: "high",
        expectedEvidenceYield: "high",
        coversDistinctRelevantDimension: "high",
        redundancyWithClaimIds: [],
        recommendationRationale: "Strong, direct, and evidence-resolvable.",
      },
      {
        claimId: "AC_02",
        triageLabel: "fact_non_check_worthy",
        thesisDirectness: "medium",
        expectedEvidenceYield: "low",
        coversDistinctRelevantDimension: "low",
        redundancyWithClaimIds: ["AC_01"],
        recommendationRationale: "Weaker and covered by AC_01.",
      },
    ],
    rationale: "AC_01 is the strongest candidate.",
    ...overrides,
  };
}

describe("claim-selection recommendation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue({
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      finishReason: "stop",
    } as any);
  });

  it("normalizes selection caps within the configured hard bounds", () => {
    expect(normalizeClaimAutoSelectionCap(undefined)).toBe(5);
    expect(normalizeClaimAutoSelectionCap(99)).toBe(5);
    expect(normalizeClaimAutoSelectionCap(0)).toBe(1);
    expect(normalizeClaimAutoSelectionCandidateCap(undefined)).toBe(12);
    expect(normalizeClaimAutoSelectionCandidateCap(99)).toBe(25);
    expect(normalizeClaimAutoSelectionCandidateCap(0)).toBe(1);
  });

  it("validates zero selected candidates and single-candidate runs", () => {
    const zero = validateClaimSelectionRecommendation(
      {
        rankedClaimIds: ["AC_01"],
        recommendedClaimIds: [],
        assessments: [
          {
            claimId: "AC_01",
            triageLabel: "opinion_or_subjective",
            thesisDirectness: "low",
            expectedEvidenceYield: "low",
            coversDistinctRelevantDimension: "low",
            redundancyWithClaimIds: [],
            recommendationRationale: "Nicht ausreichend überprüfbar.",
          },
        ],
        rationale: "Keine überprüfbare Auswahl.",
      },
      [claim("AC_01", "Die Aussage ist eher wertend.")],
      5,
    );

    expect(zero.recommendedClaimIds).toEqual([]);
    expect(zero.assessments[0].recommendationRationale).toContain("Nicht");
  });

  it("accepts optional rationale fields, harmless extra fields, null redundancy, and enum label drift", () => {
    const longRationale = "x".repeat(720);
    const parsed = validateClaimSelectionRecommendation(
      {
        rankedClaimIds: ["AC_01", "AC_02"],
        recommendedClaimIds: ["AC_01"],
        assessments: [
          {
            claimId: "AC_01",
            triageLabel: "factCheckWorthy",
            thesisDirectness: "High",
            expectedEvidenceYield: "high",
            coversDistinctRelevantDimension: "high",
            redundancyWithClaimIds: null,
            recommendationRationale: null,
            extraField: "ignored",
          },
          {
            claimId: "AC_02",
            triageLabel: "fact-non-check-worthy",
            thesisDirectness: "medium",
            expectedEvidenceYield: "LOW",
            coversDistinctRelevantDimension: "low",
            redundancyWithClaimIds: ["AC_01", "AC_01"],
            recommendationRationale: longRationale,
          },
        ],
        rationale: null,
        extraRootField: true,
      },
      [claim("AC_01"), claim("AC_02")],
      2,
    );

    expect(parsed.assessments[0]).toMatchObject({
      triageLabel: "fact_check_worthy",
      thesisDirectness: "high",
      redundancyWithClaimIds: [],
    });
    expect(parsed.assessments[0].recommendationRationale).toBeUndefined();
    expect(parsed.assessments[1]).toMatchObject({
      triageLabel: "fact_non_check_worthy",
      expectedEvidenceYield: "low",
      redundancyWithClaimIds: ["AC_01"],
    });
    expect(parsed.assessments[1].recommendationRationale).toHaveLength(600);
    expect(parsed.assessments[1].recommendationRationale?.endsWith("...")).toBe(true);
    expect(parsed.rationale).toBe("Automatic claim selection ranked candidates by check-worthiness.");
  });

  it("rejects enum labels that do not normalize to the selector contract", () => {
    expect(() => validateClaimSelectionRecommendation(
      recommendation({
        assessments: [
          {
            ...recommendation().assessments[0],
            triageLabel: "mostly_check_worthy",
          },
          recommendation().assessments[1],
        ],
      }),
      [claim("AC_01"), claim("AC_02")],
      2,
    )).toThrow(/unsupported label/);
  });

  it("rejects missing coverage, unknown IDs, excessive selection, and order drift", () => {
    const claims = [claim("AC_01"), claim("AC_02")];

    expect(() => validateClaimSelectionRecommendation(
      recommendation({ assessments: [recommendation().assessments[0]] }),
      claims,
      5,
    )).toThrow(/assessments/);

    expect(() => validateClaimSelectionRecommendation(
      recommendation({ rankedClaimIds: ["AC_01", "AC_03"] }),
      claims,
      5,
    )).toThrow(/rankedClaimIds/);

    expect(() => validateClaimSelectionRecommendation(
      recommendation({ recommendedClaimIds: ["AC_03"] }),
      claims,
      5,
    )).toThrow(/unknown claim ID AC_03/);

    expect(() => validateClaimSelectionRecommendation(
      recommendation({ recommendedClaimIds: ["AC_01", "AC_02"] }),
      claims,
      1,
    )).toThrow(/selection cap/);

    expect(() => validateClaimSelectionRecommendation(
      recommendation({ rankedClaimIds: ["AC_01", "AC_02"], recommendedClaimIds: ["AC_02", "AC_01"] }),
      claims,
      2,
    )).toThrow(/preserve rankedClaimIds order/);
  });

  it("strips extraction-time checkWorthiness from selector prompt inputs", async () => {
    const claims = [claim("AC_01"), claim("AC_02")];
    mockExtractStructuredOutput.mockReturnValue(recommendation());

    await generateClaimSelectionRecommendation({
      originalInput: "Input",
      impliedClaim: "Implied",
      articleThesis: "Thesis",
      atomicClaims: claims,
      selectionCap: 2,
      pipelineConfig: DEFAULT_PIPELINE_CONFIG,
    });

    const promptClaims = buildClaimSelectionPromptClaims(claims);
    expect(promptClaims[0]).not.toHaveProperty("checkWorthiness");

    const variables = mockLoadAndRenderSection.mock.calls[0]?.[2] as Record<string, string>;
    expect(variables.maxRecommendedClaims).toBe("2");
    expect(variables.atomicClaimsJson).toContain("AC_01");
    expect(variables.atomicClaimsJson).not.toContain("checkWorthiness");
  });

  it("retries once on schema or invariant failure and records both attempts", async () => {
    mockExtractStructuredOutput
      .mockReturnValueOnce(recommendation({ assessments: [] }))
      .mockReturnValueOnce(recommendation());

    const result = await generateClaimSelectionRecommendation({
      originalInput: "Input",
      impliedClaim: "Implied",
      articleThesis: "Thesis",
      atomicClaims: [claim("AC_01"), claim("AC_02")],
      selectionCap: 2,
      pipelineConfig: DEFAULT_PIPELINE_CONFIG,
    });

    expect(result.recommendedClaimIds).toEqual(["AC_01"]);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(mockRecordLLMCall).toHaveBeenCalledTimes(2);
    expect(mockRecordLLMCall.mock.calls[0][0]).toMatchObject({ success: false, taskType: "claim_selection" });
    expect(mockRecordLLMCall.mock.calls[0][0].errorMessage).toContain("diagnosticPreview=");
    expect(mockRecordLLMCall.mock.calls[1][0]).toMatchObject({ success: true, retries: 1 });
  });

  it("records a bounded redacted diagnostic preview on selector call failure", async () => {
    mockGenerateText.mockRejectedValue(
      new Error(`No object generated for sk-${"a".repeat(24)} with Bearer ${"b".repeat(32)} ${"x".repeat(500)}`),
    );

    await expect(generateClaimSelectionRecommendation({
      originalInput: "Input",
      impliedClaim: "Implied",
      articleThesis: "Thesis",
      atomicClaims: [claim("AC_01"), claim("AC_02")],
      selectionCap: 2,
      pipelineConfig: DEFAULT_PIPELINE_CONFIG,
    })).rejects.toThrow(/No object generated/);

    const message = mockRecordLLMCall.mock.calls[0][0].errorMessage ?? "";
    expect(message).toContain("diagnosticPreview=");
    expect(message).toContain("sk-[REDACTED]");
    expect(message).toContain("Bearer [REDACTED]");
    expect(message).not.toContain("sk-aaaaaaaa");
    expect(message).not.toContain("Bearer bbbbbbbb");
    expect(message.length).toBeLessThan(700);
  });

  it("does not retry explicit provider safety blocks", async () => {
    mockGenerateText.mockResolvedValueOnce({ finishReason: "safety", usage: {} } as any);

    await expect(generateClaimSelectionRecommendation({
      originalInput: "Input",
      impliedClaim: "Implied",
      articleThesis: "Thesis",
      atomicClaims: [claim("AC_01"), claim("AC_02")],
      selectionCap: 2,
      pipelineConfig: DEFAULT_PIPELINE_CONFIG,
    })).rejects.toThrow(/safety/);

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockExtractStructuredOutput).not.toHaveBeenCalled();
  });

  it("keeps the prompt contract automatic-only", () => {
    const promptPath = path.resolve(__dirname, "../../../../prompts/claimboundary.prompt.md");
    const prompt = fs.readFileSync(promptPath, "utf8");
    const section = prompt.slice(
      prompt.indexOf("## CLAIM_SELECTION_RECOMMENDATION"),
      prompt.indexOf("## CLAIM_VALIDATION"),
    );

    expect(section).toContain("automatic claim-selection");
    expect(section).toContain("rankedClaimIds");
    expect(section).toContain("recommendedClaimIds");
    expect(section).toContain("optional transparency fields");
    expect(section).not.toContain("must be non-empty and at most 160");
    expect(section).not.toMatch(/\bchooser\b|\bdraft\b|\bpreselection\b|\bACS\b/i);
  });
});
