import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";

import type { AtomicClaim, ClaimSelectionRecommendation } from "@/lib/analyzer/types";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn(() => ({ kind: "mock-output" })),
  },
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({
    model: { id: "mock-model" },
    modelName: "mock-model",
    provider: "anthropic",
  })),
  extractStructuredOutput: vi.fn(),
  getPromptCachingOptions: vi.fn(() => undefined),
  getStructuredOutputProviderOptions: vi.fn(() => undefined),
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordLLMCall: vi.fn(),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(async () => ({ content: "mock prompt", variables: {} })),
}));

import { generateText } from "ai";
import { extractStructuredOutput } from "@/lib/analyzer/llm";
import { loadAndRenderSection } from "@/lib/analyzer/prompt-loader";
import {
  generateClaimSelectionRecommendation,
  validateClaimSelectionRecommendation,
} from "@/lib/analyzer/claim-selection-recommendation";

const promptPath = path.resolve(
  __dirname,
  "../../../../prompts/claimboundary.prompt.md",
);
const promptContent = readFileSync(promptPath, "utf-8");

function createAtomicClaim(overrides: Partial<AtomicClaim> = {}): AtomicClaim {
  return {
    id: "AC_01",
    statement: "Entity A made claim X under condition Y",
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    thesisRelevance: "direct",
    keyEntities: ["Entity A"],
    checkWorthiness: "high",
    specificityScore: 0.82,
    groundingQuality: "strong",
    expectedEvidenceProfile: {
      methodologies: ["official records"],
      expectedMetrics: ["metric X"],
      expectedSourceTypes: ["official_record"],
    },
    ...overrides,
  };
}

function createRecommendation(overrides: Partial<ClaimSelectionRecommendation> = {}): ClaimSelectionRecommendation {
  return {
    rankedClaimIds: ["AC_01", "AC_02"],
    recommendedClaimIds: ["AC_01"],
    assessments: [
      {
        claimId: "AC_01",
        triageLabel: "fact_check_worthy",
        thesisDirectness: "high",
        expectedEvidenceYield: "high",
        coversDistinctRelevantDimension: true,
        redundancyWithClaimIds: [],
        recommendationRationale: "Most thesis-direct and evidence-rich candidate.",
      },
      {
        claimId: "AC_02",
        triageLabel: "fact_non_check_worthy",
        thesisDirectness: "medium",
        expectedEvidenceYield: "medium",
        coversDistinctRelevantDimension: false,
        redundancyWithClaimIds: ["AC_01"],
        recommendationRationale: "Secondary candidate with overlapping coverage.",
      },
    ],
    rationale: "Prioritize the most thesis-direct distinct claim first.",
    ...overrides,
  };
}

function extractSection(content: string, sectionName: string): string | null {
  const lines = content.split("\n");
  let capturing = false;
  const captured: string[] = [];
  for (const line of lines) {
    const headerMatch = line.match(/^## ([A-Z][A-Z0-9_ ]+(?:\([^)]*\))?)\s*$/);
    if (headerMatch) {
      if (capturing) break;
      if (headerMatch[1] === sectionName) {
        capturing = true;
        continue;
      }
    }
    if (capturing && line.trim() !== "---") {
      captured.push(line);
    }
  }
  return capturing ? captured.join("\n").trim() : null;
}

function renderWithVars(
  template: string,
  vars: Record<string, string>,
): { rendered: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const rendered = template.replace(/\$\{(\w+)\}/g, (match, varName) => {
    if (varName in vars) return vars[varName];
    unresolved.push(varName);
    return match;
  });
  return { rendered, unresolved };
}

describe("CLAIM_SELECTION_RECOMMENDATION prompt contract", () => {
  const vars: Record<string, string> = {
    analysisInput: "Entity A made claim X under condition Y",
    impliedClaim: "Entity A asserts that condition Y makes claim X verifiable.",
    articleThesis: "The input asks whether claim X happened under condition Y.",
    atomicClaimsJson: JSON.stringify(
      [
        createAtomicClaim(),
        createAtomicClaim({
          id: "AC_02",
          statement: "Entity A also claimed related condition Z",
          thesisRelevance: "indirect",
          checkWorthiness: "medium",
        }),
      ],
      null,
      2,
    ),
    maxRecommendedClaims: "2",
  };

  it("exists and resolves all loader variables", () => {
    const section = extractSection(promptContent, "CLAIM_SELECTION_RECOMMENDATION");
    expect(section, "Section ## CLAIM_SELECTION_RECOMMENDATION not found").not.toBeNull();
    if (!section) return;

    const { unresolved } = renderWithVars(section, vars);
    expect(unresolved).toEqual([]);
  });

  it("locks in the approved recommendation constraints", () => {
    const section = extractSection(promptContent, "CLAIM_SELECTION_RECOMMENDATION");
    expect(section).not.toBeNull();
    expect(section).toContain("Recommendation only.");
    expect(section).toContain("Joint reasoning is mandatory.");
    expect(section).toContain("Use exactly one primary treatment label per claim.");
    expect(section).toContain("Rank the entire candidate set.");
    expect(section).toContain("Recommend from `fact_check_worthy` first.");
    expect(section).toContain("Do not recommend `fact_non_check_worthy` or `opinion_or_subjective` in v1.");
    expect(section).toContain("unique ordered permutation of all input claim IDs");
    expect(section).toContain("If no claim should be recommended, return an empty `recommendedClaimIds` array");
  });
});

describe("validateClaimSelectionRecommendation", () => {
  it("accepts a valid recommendation with no recommended claims", () => {
    const recommendation = createRecommendation({
      recommendedClaimIds: [],
      rationale: "Ranking is valid even though no claim should be auto-recommended.",
    });

    const validated = validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]);
    expect(validated.recommendedClaimIds).toEqual([]);
  });

  it("trims overlong rationale fields to the documented caps", () => {
    const recommendation = createRecommendation({
      rationale: `  ${"R".repeat(260)}  `,
      assessments: [
        {
          ...createRecommendation().assessments[0],
          recommendationRationale: `  ${"A".repeat(170)}  `,
        },
        createRecommendation().assessments[1],
      ],
    });

    const validated = validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]);
    expect(validated.rationale).toHaveLength(240);
    expect(validated.assessments[0].recommendationRationale).toHaveLength(160);
  });

  it("rejects missing assessment coverage", () => {
    const recommendation = createRecommendation({
      assessments: [createRecommendation().assessments[0]],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/expected 2 assessments/i);
  });

  it("rejects blank rationale fields", () => {
    const recommendation = createRecommendation({
      rationale: "   ",
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/rationale must be non-empty/i);
  });

  it("rejects out-of-set recommended claims", () => {
    const recommendation = createRecommendation({
      recommendedClaimIds: ["AC_03"],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/not present in rankedClaimIds/i);
  });

  it("rejects self-referential redundancy ids", () => {
    const recommendation = createRecommendation({
      assessments: [
        {
          ...createRecommendation().assessments[0],
          redundancyWithClaimIds: ["AC_01"],
        },
        createRecommendation().assessments[1],
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/cannot list itself/i);
  });

  it("rejects out-of-set redundancy ids", () => {
    const recommendation = createRecommendation({
      assessments: [
        {
          ...createRecommendation().assessments[0],
          redundancyWithClaimIds: ["AC_03"],
        },
        createRecommendation().assessments[1],
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/out-of-set redundancy claim/i);
  });
});

describe("generateClaimSelectionRecommendation", () => {
  const mockGenerateText = vi.mocked(generateText);
  const mockExtractStructuredOutput = vi.mocked(extractStructuredOutput);
  const mockLoadAndRenderSection = vi.mocked(loadAndRenderSection);

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadAndRenderSection.mockResolvedValue({ content: "mock prompt", variables: {} });
    mockExtractStructuredOutput.mockImplementation((result: any) => result?.structured ?? null);
  });

  it("retries once on invariant failure and returns the second valid result", async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        structured: createRecommendation({
          rankedClaimIds: ["AC_01"],
        }),
        usage: { inputTokens: 10, outputTokens: 12, totalTokens: 22 },
      } as any)
      .mockResolvedValueOnce({
        structured: createRecommendation(),
        usage: { inputTokens: 10, outputTokens: 12, totalTokens: 22 },
      } as any);

    const result = await generateClaimSelectionRecommendation({
      originalInput: "Entity A made claim X under condition Y",
      impliedClaim: "Entity A asserts claim X.",
      articleThesis: "The input presents claim X for verification.",
      atomicClaims: [
        createAtomicClaim(),
        createAtomicClaim({
          id: "AC_02",
          statement: "Entity A also claimed related condition Z",
          thesisRelevance: "indirect",
          checkWorthiness: "medium",
        }),
      ],
    });

    expect(result.rankedClaimIds).toEqual(["AC_01", "AC_02"]);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it("does not retry on explicit refusal metadata", async () => {
    mockGenerateText.mockResolvedValue({
      finishReason: "content-filter",
      structured: null,
      usage: { inputTokens: 10, outputTokens: 0, totalTokens: 10 },
    } as any);

    await expect(
      generateClaimSelectionRecommendation({
        originalInput: "Entity A made claim X under condition Y",
        impliedClaim: "Entity A asserts claim X.",
        articleThesis: "The input presents claim X for verification.",
        atomicClaims: [createAtomicClaim()],
      }),
    ).rejects.toThrow(/explicitly refused/i);

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });
});
