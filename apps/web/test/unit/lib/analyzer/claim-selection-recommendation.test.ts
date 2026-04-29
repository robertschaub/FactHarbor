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
import { recordLLMCall } from "@/lib/analyzer/metrics-integration";
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
    budgetAwarenessMode: "off",
    budgetResearchTimeBudgetMs: "",
    budgetContradictionProtectedTimeMs: "",
    budgetMainResearchTimeBudgetMs: "",
    budgetMinRecommendedClaims: "1",
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
    expect(section).toContain("Budget mode discipline.");
    expect(section).toContain("Active budget mode is `${budgetAwarenessMode}`.");
    expect(section).toContain("Recommend from `fact_check_worthy` first.");
    expect(section).toContain("Do not recommend `fact_non_check_worthy` or `opinion_or_subjective` in v1.");
    expect(section).toContain("unique ordered permutation of all input claim IDs");
    expect(section).toContain("`deferredClaimIds`: omit unless budget mode is `allow_fewer_recommendations`");
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
      budgetFitRationale: `  ${"B".repeat(260)}  `,
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
    expect(validated.budgetFitRationale).toHaveLength(240);
    expect(validated.assessments[0].recommendationRationale).toHaveLength(160);
  });

  it("accepts budget-fit metadata and normalizes deferred claims into ranked order", () => {
    const recommendation = createRecommendation({
      rankedClaimIds: ["AC_03", "AC_01", "AC_02"],
      recommendedClaimIds: ["AC_01"],
      deferredClaimIds: ["AC_02", "AC_03"],
      budgetFitRationale: "Budget can cover the first claim while preserving review of deferred candidates.",
      assessments: [
        {
          claimId: "AC_03",
          triageLabel: "fact_check_worthy",
          thesisDirectness: "medium",
          expectedEvidenceYield: "medium",
          coversDistinctRelevantDimension: true,
          redundancyWithClaimIds: [],
          recommendationRationale: "A distinct but budget-limited candidate.",
          budgetTreatment: "deferred_budget_limited",
          budgetTreatmentRationale: "Deferred so research can finish within the protected budget.",
        },
        {
          ...createRecommendation().assessments[0],
          budgetTreatment: "selected",
          budgetTreatmentRationale: "Selected as the strongest budget-fit candidate.",
        },
        {
          ...createRecommendation().assessments[1],
          budgetTreatment: "deferred_budget_limited",
          budgetTreatmentRationale: "Deferred because it overlaps the selected candidate under budget pressure.",
        },
      ],
    });

    const validated = validateClaimSelectionRecommendation(
      recommendation,
      ["AC_01", "AC_02", "AC_03"],
      3,
      { budgetFitMode: "allow_fewer_recommendations" },
    );

    expect(validated.deferredClaimIds).toEqual(["AC_03", "AC_02"]);
    expect(validated.budgetFitRationale).toContain("Budget can cover");
    expect(validated.assessments[0].budgetTreatment).toBe("deferred_budget_limited");
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

  it("rejects deferred claims that overlap recommended claims", () => {
    const recommendation = createRecommendation({
      deferredClaimIds: ["AC_01"],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/cannot also be recommended/i);
  });

  it("rejects budget metadata when budget mode is off", () => {
    const recommendation = createRecommendation({
      deferredClaimIds: ["AC_02"],
      budgetFitRationale: "Budget metadata should not be active in off mode.",
      assessments: [
        {
          ...createRecommendation().assessments[0],
          budgetTreatment: "selected",
          budgetTreatmentRationale: "Selected claim.",
        },
        {
          ...createRecommendation().assessments[1],
          budgetTreatment: "deferred_budget_limited",
          budgetTreatmentRationale: "Deferred claim.",
        },
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"], 2, { budgetFitMode: "off" }),
    ).toThrow(/budget metadata is not allowed/i);
  });

  it("rejects explain-only budget metadata that reduces recommendations below the cap", () => {
    const recommendation = createRecommendation({
      rankedClaimIds: ["AC_01", "AC_02", "AC_03"],
      recommendedClaimIds: ["AC_01"],
      deferredClaimIds: ["AC_02"],
      budgetFitRationale: "Budget metadata cannot reduce the selected set in explain-only mode.",
      assessments: [
        {
          ...createRecommendation().assessments[0],
          budgetTreatment: "selected",
          budgetTreatmentRationale: "Selected claim.",
        },
        {
          ...createRecommendation().assessments[1],
          budgetTreatment: "deferred_budget_limited",
          budgetTreatmentRationale: "Deferred claim.",
        },
        {
          claimId: "AC_03",
          triageLabel: "fact_check_worthy",
          thesisDirectness: "medium",
          expectedEvidenceYield: "medium",
          coversDistinctRelevantDimension: true,
          redundancyWithClaimIds: [],
          recommendationRationale: "Distinct candidate.",
        },
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02", "AC_03"], 3, { budgetFitMode: "explain_only" }),
    ).toThrow(/explain_only budget mode cannot reduce/i);
  });

  it("rejects deferred budget claims in explain-only mode", () => {
    const recommendation = createRecommendation({
      rankedClaimIds: ["AC_01", "AC_02", "AC_03"],
      recommendedClaimIds: ["AC_01", "AC_02"],
      deferredClaimIds: ["AC_03"],
      budgetFitRationale: "Shadow mode cannot operationally defer claims.",
      assessments: [
        {
          ...createRecommendation().assessments[0],
          budgetTreatment: "selected",
          budgetTreatmentRationale: "Selected claim.",
        },
        {
          ...createRecommendation().assessments[1],
          budgetTreatment: "selected",
          budgetTreatmentRationale: "Selected claim.",
        },
        {
          claimId: "AC_03",
          triageLabel: "fact_check_worthy",
          thesisDirectness: "medium",
          expectedEvidenceYield: "medium",
          coversDistinctRelevantDimension: true,
          redundancyWithClaimIds: [],
          recommendationRationale: "Distinct candidate.",
          budgetTreatment: "deferred_budget_limited",
          budgetTreatmentRationale: "Deferred claim.",
        },
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02", "AC_03"], 2, { budgetFitMode: "explain_only" }),
    ).toThrow(/cannot return deferred budget claims/i);
  });

  it("rejects budget-deferred assessments missing deferredClaimIds membership", () => {
    const recommendation = createRecommendation({
      deferredClaimIds: [],
      assessments: [
        createRecommendation().assessments[0],
        {
          ...createRecommendation().assessments[1],
          budgetTreatment: "deferred_budget_limited",
          budgetTreatmentRationale: "Deferred due to budget pressure.",
        },
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/missing from deferredClaimIds/i);
  });

  it("rejects allow-fewer budget metadata without a top-level budget rationale", () => {
    const recommendation = createRecommendation({
      rankedClaimIds: ["AC_01", "AC_02", "AC_03"],
      recommendedClaimIds: ["AC_01"],
      assessments: [
        {
          ...createRecommendation().assessments[0],
          budgetTreatment: "selected",
          budgetTreatmentRationale: "Selected claim.",
        },
        {
          ...createRecommendation().assessments[1],
          budgetTreatment: "not_recommended",
          budgetTreatmentRationale: "Budget-aware treatment without top-level rationale.",
        },
        {
          claimId: "AC_03",
          triageLabel: "fact_check_worthy",
          thesisDirectness: "medium",
          expectedEvidenceYield: "medium",
          coversDistinctRelevantDimension: true,
          redundancyWithClaimIds: [],
          recommendationRationale: "Distinct candidate.",
        },
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02", "AC_03"], 3, { budgetFitMode: "allow_fewer_recommendations" }),
    ).toThrow(/fewer-than-cap recommendations require budgetFitRationale/i);
  });

  it("rejects deferred IDs without matching per-claim budget treatment", () => {
    const recommendation = createRecommendation({
      deferredClaimIds: ["AC_02"],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/must have budgetTreatment deferred_budget_limited/i);
  });

  it("aligns allow-fewer top-level deferred IDs when assessment treatment metadata is missing", () => {
    const recommendation = createRecommendation({
      deferredClaimIds: ["AC_02"],
      budgetFitRationale: "Budget only supports deep research for the selected claim.",
    });

    const validated = validateClaimSelectionRecommendation(
      recommendation,
      ["AC_01", "AC_02"],
      2,
      { budgetFitMode: "allow_fewer_recommendations" },
    );

    expect(validated.deferredClaimIds).toEqual(["AC_02"]);
    expect(validated.assessments[1]).toMatchObject({
      claimId: "AC_02",
      budgetTreatment: "deferred_budget_limited",
      budgetTreatmentRationale: "Secondary candidate with overlapping coverage.",
    });
  });

  it("aligns allow-fewer top-level deferred IDs over generic not-recommended treatment", () => {
    const recommendation = createRecommendation({
      deferredClaimIds: ["AC_02"],
      budgetFitRationale: "Budget only supports deep research for the selected claim.",
      assessments: [
        createRecommendation().assessments[0],
        {
          ...createRecommendation().assessments[1],
          budgetTreatment: "not_recommended",
          budgetTreatmentRationale: "Not selected under the current recommendation budget.",
        },
      ],
    });

    const validated = validateClaimSelectionRecommendation(
      recommendation,
      ["AC_01", "AC_02"],
      2,
      { budgetFitMode: "allow_fewer_recommendations" },
    );

    expect(validated.assessments[1]).toMatchObject({
      claimId: "AC_02",
      budgetTreatment: "deferred_budget_limited",
      budgetTreatmentRationale: "Not selected under the current recommendation budget.",
    });
  });

  it("rejects inconsistent selected and not-recommended budget treatments", () => {
    const selectedMismatch = createRecommendation({
      assessments: [
        createRecommendation().assessments[0],
        {
          ...createRecommendation().assessments[1],
          budgetTreatment: "selected",
          budgetTreatmentRationale: "Claims marked selected must be recommended.",
        },
      ],
    });
    const notRecommendedMismatch = createRecommendation({
      assessments: [
        {
          ...createRecommendation().assessments[0],
          budgetTreatment: "not_recommended",
          budgetTreatmentRationale: "Recommended claims cannot be budget not-recommended.",
        },
        createRecommendation().assessments[1],
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(selectedMismatch, ["AC_01", "AC_02"]),
    ).toThrow(/missing from recommendedClaimIds/i);
    expect(() =>
      validateClaimSelectionRecommendation(notRecommendedMismatch, ["AC_01", "AC_02"]),
    ).toThrow(/cannot be not_recommended/i);
  });

  it("rejects budget treatment without a rationale", () => {
    const recommendation = createRecommendation({
      assessments: [
        {
          ...createRecommendation().assessments[0],
          budgetTreatment: "selected",
        },
        createRecommendation().assessments[1],
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/budgetTreatment requires budgetTreatmentRationale/i);
  });

  it("rejects budget rationale without a treatment", () => {
    const recommendation = createRecommendation({
      assessments: [
        {
          ...createRecommendation().assessments[0],
          budgetTreatmentRationale: "Budget-related explanation without a typed treatment.",
        },
        createRecommendation().assessments[1],
      ],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"]),
    ).toThrow(/budgetTreatmentRationale requires budgetTreatment/i);
  });

  it("normalizes recommended claims into ranked order", () => {
    const recommendation = createRecommendation({
      rankedClaimIds: ["AC_03", "AC_01", "AC_02"],
      recommendedClaimIds: ["AC_02", "AC_03"],
      assessments: [
        {
          claimId: "AC_03",
          triageLabel: "fact_check_worthy",
          thesisDirectness: "high",
          expectedEvidenceYield: "high",
          coversDistinctRelevantDimension: true,
          redundancyWithClaimIds: [],
          recommendationRationale: "Most thesis-direct and evidence-rich candidate.",
        },
        createRecommendation().assessments[0],
        createRecommendation().assessments[1],
      ],
    });

    const validated = validateClaimSelectionRecommendation(
      recommendation,
      ["AC_01", "AC_02", "AC_03"],
    );

    expect(validated.recommendedClaimIds).toEqual(["AC_03", "AC_02"]);
  });

  it("rejects recommendations that exceed the configured claim-selection cap", () => {
    const recommendation = createRecommendation({
      recommendedClaimIds: ["AC_01", "AC_02"],
    });

    expect(() =>
      validateClaimSelectionRecommendation(recommendation, ["AC_01", "AC_02"], 1),
    ).toThrow(/at most 1 claims/i);
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
  const mockRecordLLMCall = vi.mocked(recordLLMCall);

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
    expect(mockRecordLLMCall).toHaveBeenLastCalledWith(
      expect.objectContaining({ taskType: "claim_selection", success: true }),
    );
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

  it("passes the effective recommendation cap to the prompt renderer", async () => {
    mockGenerateText.mockResolvedValue({
      structured: createRecommendation(),
      usage: { inputTokens: 10, outputTokens: 12, totalTokens: 22 },
    } as any);

    await generateClaimSelectionRecommendation({
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
      selectionCap: 1,
    });

    expect(mockLoadAndRenderSection).toHaveBeenCalledWith(
      "claimboundary",
      "CLAIM_SELECTION_RECOMMENDATION",
      expect.objectContaining({
        maxRecommendedClaims: "1",
        budgetAwarenessMode: "off",
        budgetResearchTimeBudgetMs: "",
      }),
    );
  });

  it("passes structural budget context when budget awareness is enabled", async () => {
    mockGenerateText.mockResolvedValue({
      structured: createRecommendation(),
      usage: { inputTokens: 10, outputTokens: 12, totalTokens: 22 },
    } as any);

    await generateClaimSelectionRecommendation({
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
      selectionCap: 2,
      pipelineConfig: {
        claimSelectionBudgetAwarenessEnabled: true,
        claimSelectionBudgetFitMode: "explain_only",
        claimSelectionMinRecommendedClaims: 1,
        researchTimeBudgetMs: 600000,
        contradictionProtectedTimeMs: 120000,
      } as any,
    });

    expect(mockLoadAndRenderSection).toHaveBeenCalledWith(
      "claimboundary",
      "CLAIM_SELECTION_RECOMMENDATION",
      expect.objectContaining({
        budgetAwarenessMode: "explain_only",
        budgetResearchTimeBudgetMs: "600000",
        budgetContradictionProtectedTimeMs: "120000",
        budgetMainResearchTimeBudgetMs: "480000",
        budgetMinRecommendedClaims: "1",
      }),
    );
  });

  it("rejects model-returned budget metadata while budget awareness is off", async () => {
    mockGenerateText.mockResolvedValue({
      structured: createRecommendation({
        deferredClaimIds: ["AC_02"],
        budgetFitRationale: "Budget metadata should not be accepted while disabled.",
        assessments: [
          {
            ...createRecommendation().assessments[0],
            budgetTreatment: "selected",
            budgetTreatmentRationale: "Selected claim.",
          },
          {
            ...createRecommendation().assessments[1],
            budgetTreatment: "deferred_budget_limited",
            budgetTreatmentRationale: "Deferred claim.",
          },
        ],
      }),
      usage: { inputTokens: 10, outputTokens: 12, totalTokens: 22 },
    } as any);

    await expect(
      generateClaimSelectionRecommendation({
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
      }),
    ).rejects.toThrow(/budget metadata is not allowed/i);
  });

  it("accepts out-of-order recommended claims without retrying", async () => {
    mockGenerateText.mockResolvedValue({
      structured: createRecommendation({
        rankedClaimIds: ["AC_03", "AC_01", "AC_02"],
        recommendedClaimIds: ["AC_02", "AC_03"],
        assessments: [
          {
            claimId: "AC_03",
            triageLabel: "fact_check_worthy",
            thesisDirectness: "high",
            expectedEvidenceYield: "high",
            coversDistinctRelevantDimension: true,
            redundancyWithClaimIds: [],
            recommendationRationale: "Most thesis-direct and evidence-rich candidate.",
          },
          createRecommendation().assessments[0],
          createRecommendation().assessments[1],
        ],
      }),
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
        createAtomicClaim({
          id: "AC_03",
          statement: "Entity A made a second thesis-direct claim under condition W",
          thesisRelevance: "direct",
          checkWorthiness: "high",
        }),
      ],
    });

    expect(result.recommendedClaimIds).toEqual(["AC_03", "AC_02"]);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });
});
