/**
 * Grounding Check Test Suite
 *
 * Tests for:
 * 1. LLM-powered key term extraction from reasoning (extractKeyTerms)
 * 2. LLM-powered grounding adjudication in checkVerdictGrounding
 * 3. applyGroundingPenalty structural logic
 * 4. Degraded-path behavior when LLM adjudication fails
 *
 * @module analyzer/grounding-check.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  extractKeyTerms,
  checkVerdictGrounding,
  applyGroundingPenalty,
  DEFAULT_GROUNDING_PENALTY_CONFIG,
} from "@/lib/analyzer/grounding-check";
import type { ClaimVerdict, EvidenceItem } from "@/lib/analyzer/types";

// Mock the AI SDK generateText
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock getModelForTask
vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({
    model: "mock-model",
    taskId: "extract_evidence",
    tierId: "haiku",
  })),
}));

// Mock prompt-loader to return a simple rendered prompt
vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(() =>
    Promise.resolve({ content: "mocked prompt content" })
  ),
}));

import { generateText } from "ai";
const mockGenerateText = vi.mocked(generateText);

// Helper: configure mock to return specific terms (for extractKeyTerms)
function mockLLMTerms(termArrays: string[][]) {
  mockGenerateText.mockResolvedValueOnce({
    text: JSON.stringify(termArrays),
  } as any);
}

// Helper: configure mock to return adjudication ratios (for checkVerdictGrounding)
function mockAdjudicationRatios(ratios: number[]) {
  mockGenerateText.mockResolvedValueOnce({
    text: JSON.stringify(ratios),
  } as any);
}

// ============================================================================
// extractKeyTerms
// ============================================================================

describe("extractKeyTerms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array for empty input", async () => {
    expect(await extractKeyTerms("")).toEqual([]);
    expect(await extractKeyTerms("   ")).toEqual([]);
    // No LLM call should be made for empty input
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("returns LLM-extracted terms", async () => {
    mockLLMTerms([["solar", "panels", "efficiency", "2024"]]);
    const terms = await extractKeyTerms("Solar panels reached 25% efficiency in 2024");
    expect(terms).toEqual(["solar", "panels", "efficiency", "2024"]);
  });

  it("filters non-string values from LLM response", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify([["valid", 123, null, "term"]]),
    } as any);
    const terms = await extractKeyTerms("valid and term extraction");
    expect(terms).toEqual(["valid", "term"]);
  });

  it("returns empty term set when LLM fails (no deterministic fallback)", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("LLM unavailable"));
    const terms = await extractKeyTerms("The battery technology improved dramatically");
    expect(terms).toEqual([]);
  });
});

// ============================================================================
// checkVerdictGrounding (LLM-powered adjudication)
// ============================================================================

describe("checkVerdictGrounding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeVerdict(overrides: Partial<ClaimVerdict>): ClaimVerdict {
    return {
      claimId: "c1",
      verdict: "true" as any,
      confidence: 80,
      reasoning: "test reasoning",
      supportingEvidenceIds: [],
      opposingEvidenceIds: [],
      ...overrides,
    } as ClaimVerdict;
  }

  function makeEvidence(overrides: Partial<EvidenceItem>): EvidenceItem {
    return {
      id: "e1",
      statement: "test evidence",
      category: "test",
      claimDirection: "supporting" as any,
      sourceUrl: "https://example.com",
      sourceType: "news_primary" as any,
      probativeValue: "medium" as any,
      ...overrides,
    } as EvidenceItem;
  }

  it("returns ratio 1 for empty verdicts", async () => {
    const result = await checkVerdictGrounding([], []);
    expect(result.groundingRatio).toBe(1);
    expect(result.degraded).toBeFalsy();
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("returns LLM-adjudicated grounding ratio for verdict with evidence", async () => {
    mockAdjudicationRatios([0.85]);
    const verdict = makeVerdict({
      reasoning: "The battery efficiency was demonstrated clearly",
      supportingEvidenceIds: ["e1"],
    });
    const evidence = [
      makeEvidence({
        id: "e1",
        statement: "Tests showed the battery is highly efficient in real conditions",
      }),
    ];

    const result = await checkVerdictGrounding([verdict], evidence);
    expect(result.groundingRatio).toBe(0.85);
    expect(result.degraded).toBeFalsy();
    const detail = result.verdictDetails[0];
    expect(detail.ratio).toBe(0.85);
    expect(detail.hasCitedEvidence).toBe(true);
  });

  it("returns ratio 0 when reasoning has no cited evidence (no LLM call)", async () => {
    const verdict = makeVerdict({
      reasoning: "The vaccine was proven effective in trials",
      supportingEvidenceIds: [],
    });
    const result = await checkVerdictGrounding([verdict], []);
    expect(result.groundingRatio).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    // No LLM call — verdict handled structurally (no evidence = ungrounded)
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("warns when LLM returns very low grounding ratio", async () => {
    mockAdjudicationRatios([0.15]);
    const verdict = makeVerdict({
      reasoning: "The cryptocurrency market experienced extreme volatility",
      supportingEvidenceIds: ["e1"],
    });
    const evidence = [
      makeEvidence({
        id: "e1",
        statement: "GDP growth was steady at 2.5% in 2024",
      }),
    ];

    const result = await checkVerdictGrounding([verdict], evidence);
    expect(result.groundingRatio).toBe(0.15);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("low grounding ratio");
  });

  it("batches multiple verdicts in a single LLM call", async () => {
    mockAdjudicationRatios([0.85, 0.9]);
    const verdicts = [
      makeVerdict({
        claimId: "c1",
        reasoning: "Solar panels improved",
        supportingEvidenceIds: ["e1"],
      }),
      makeVerdict({
        claimId: "c2",
        reasoning: "Wind turbines expanded",
        supportingEvidenceIds: ["e2"],
      }),
    ];
    const evidence = [
      makeEvidence({ id: "e1", statement: "Solar panel tech advanced" }),
      makeEvidence({ id: "e2", statement: "Wind turbine capacity grew" }),
    ];

    const result = await checkVerdictGrounding(verdicts, evidence);
    // Should make only ONE LLM call for both verdicts (adjudication batch)
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(result.verdictDetails).toHaveLength(2);
    expect(result.degraded).toBeFalsy();
  });

  it("returns ratio 1 for verdict without reasoning (trivially grounded)", async () => {
    const verdict = makeVerdict({
      reasoning: "",
      supportingEvidenceIds: ["e1"],
    });
    const evidence = [makeEvidence({ id: "e1", statement: "Some evidence" })];

    const result = await checkVerdictGrounding([verdict], evidence);
    expect(result.verdictDetails[0].ratio).toBe(1);
    // No LLM call — empty reasoning is trivially grounded
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  // ---- Degraded-path tests ----

  it("returns degraded=true with conservative 0.5 ratio on LLM failure", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("LLM unavailable"));
    const verdict = makeVerdict({
      reasoning: "This reasoning should trigger adjudication",
      supportingEvidenceIds: ["e1"],
    });
    const evidence = [
      makeEvidence({ id: "e1", statement: "Evidence for grounding" }),
    ];

    const result = await checkVerdictGrounding([verdict], evidence);
    expect(result.degraded).toBe(true);
    expect(result.groundingRatio).toBe(0.5);
    expect(result.verdictDetails[0].ratio).toBe(0.5);
  });

  it("does not silently return 1.0 (all grounded) on LLM failure", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("LLM timeout"));
    const verdicts = [
      makeVerdict({
        claimId: "c1",
        reasoning: "Reasoning A",
        supportingEvidenceIds: ["e1"],
      }),
      makeVerdict({
        claimId: "c2",
        reasoning: "Reasoning B",
        supportingEvidenceIds: ["e2"],
      }),
    ];
    const evidence = [
      makeEvidence({ id: "e1", statement: "Evidence 1" }),
      makeEvidence({ id: "e2", statement: "Evidence 2" }),
    ];

    const result = await checkVerdictGrounding(verdicts, evidence);
    // Must NOT be 1.0 — that would hide the failure
    expect(result.groundingRatio).not.toBe(1);
    expect(result.degraded).toBe(true);
    // Each verdict should get 0.5 (conservative fallback)
    for (const detail of result.verdictDetails) {
      expect(detail.ratio).toBe(0.5);
    }
  });
});

// ============================================================================
// applyGroundingPenalty (structural math — no LLM dependency)
// ============================================================================

describe("applyGroundingPenalty", () => {
  it("applies no penalty when grounding is above threshold", () => {
    const result = applyGroundingPenalty(80, 0.7);
    expect(result.applied).toBe(false);
    expect(result.adjustedConfidence).toBe(80);
    expect(result.penalty).toBe(0);
  });

  it("applies penalty when grounding is below threshold", () => {
    const result = applyGroundingPenalty(80, 0.3);
    expect(result.applied).toBe(true);
    expect(result.adjustedConfidence).toBeLessThan(80);
    expect(result.penalty).toBeGreaterThan(0);
  });

  it("caps penalty at floor ratio", () => {
    const atFloor = applyGroundingPenalty(80, 0.1);
    const belowFloor = applyGroundingPenalty(80, 0.0);
    // Below floor should give same penalty as at floor
    expect(atFloor.penalty).toBe(belowFloor.penalty);
  });

  it("does nothing when disabled", () => {
    const config = { ...DEFAULT_GROUNDING_PENALTY_CONFIG, enabled: false };
    const result = applyGroundingPenalty(80, 0.1, config);
    expect(result.applied).toBe(false);
    expect(result.adjustedConfidence).toBe(80);
  });

  it("never reduces confidence below 5", () => {
    const result = applyGroundingPenalty(10, 0.1);
    expect(result.adjustedConfidence).toBeGreaterThanOrEqual(5);
  });
});
