import { describe, expect, it, vi, beforeEach } from "vitest";

import type { EvidenceItem } from "@/lib/analyzer/types";
import { detectCounterClaim } from "@/lib/analyzer/verdict-corrections";

// Mock the text-analysis service
vi.mock("@/lib/analyzer/text-analysis-service", () => ({
  getTextAnalysisService: () => mockService,
}));

const mockService = {
  classifyInput: vi.fn(),
  assessEvidenceQuality: vi.fn(),
  analyzeContextSimilarity: vi.fn(),
  validateVerdicts: vi.fn(),
  detectCounterClaims: vi.fn(),
};

function makeEvidence(overrides: Partial<EvidenceItem>): EvidenceItem {
  return {
    id: overrides.id ?? "E1",
    statement: overrides.statement ?? "Example evidence statement",
    category: overrides.category ?? "evidence",
    specificity: overrides.specificity ?? "high",
    sourceId: overrides.sourceId ?? "S1",
    sourceUrl: overrides.sourceUrl ?? "https://example.com",
    sourceTitle: overrides.sourceTitle ?? "Example Source",
    sourceExcerpt: overrides.sourceExcerpt ?? "Example excerpt",
    contextId: overrides.contextId,
    isContestedClaim: overrides.isContestedClaim,
    claimSource: overrides.claimSource,
    claimDirection: overrides.claimDirection,
    fromOppositeClaimSearch: overrides.fromOppositeClaimSearch,
    evidenceScope: overrides.evidenceScope,
  };
}

describe("detectCounterClaim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns LLM result when service returns isCounterClaim=true", async () => {
    mockService.detectCounterClaims.mockResolvedValue([
      { claimId: "claim", isCounterClaim: true, reasoning: "Reversed comparative" },
    ]);

    const result = await detectCounterClaim(
      "Technology B is more efficient than Technology A",
      "Using Technology A for transport is more efficient than using Technology B",
      85,
      [],
    );

    expect(result).toBe(true);
    expect(mockService.detectCounterClaims).toHaveBeenCalledOnce();
  });

  it("returns LLM result when service returns isCounterClaim=false", async () => {
    mockService.detectCounterClaims.mockResolvedValue([
      { claimId: "claim", isCounterClaim: false, reasoning: "Thesis-aligned claim" },
    ]);

    const result = await detectCounterClaim(
      "Standard efficiency measurement methodologies favor Technology A over Technology B",
      "Using Technology A for transport is more efficient than using Technology B",
      20,
      [
        makeEvidence({ id: "E1", claimDirection: "contradicts" }),
        makeEvidence({ id: "E2", claimDirection: "contradicts" }),
      ],
    );

    expect(result).toBe(false);
  });

  it("passes evidence direction counts to the service", async () => {
    mockService.detectCounterClaims.mockResolvedValue([
      { claimId: "claim", isCounterClaim: false, reasoning: "Not a counter-claim" },
    ]);

    const evidenceItems = [
      makeEvidence({ id: "E1", claimDirection: "supports" }),
      makeEvidence({ id: "E2", claimDirection: "contradicts" }),
      makeEvidence({ id: "E3", claimDirection: "contradicts" }),
    ];

    await detectCounterClaim("Some claim", "Some thesis", 70, evidenceItems);

    expect(mockService.detectCounterClaims).toHaveBeenCalledWith({
      thesis: "Some thesis",
      claims: [
        {
          claimId: "claim",
          claimText: "Some claim",
          truthPercentage: 70,
          evidenceDirections: { supporting: 1, contradicting: 2 },
        },
      ],
      verdictBands: undefined,
    });
  });

  it("passes verdict bands to the service when provided", async () => {
    mockService.detectCounterClaims.mockResolvedValue([
      { claimId: "claim", isCounterClaim: false, reasoning: "Not a counter-claim" },
    ]);

    await detectCounterClaim("Some claim", "Some thesis", 70, [], { LEANING_TRUE: 58, MIXED: 43 });

    expect(mockService.detectCounterClaims).toHaveBeenCalledWith(
      expect.objectContaining({
        verdictBands: { LEANING_TRUE: 58, MIXED: 43 },
      }),
    );
  });

  it("defaults to false when LLM service fails", async () => {
    mockService.detectCounterClaims.mockRejectedValue(new Error("LLM service unavailable"));

    const result = await detectCounterClaim(
      "Technology B is more efficient than Technology A",
      "Using Technology A for transport is more efficient than using Technology B",
      85,
      [],
    );

    expect(result).toBe(false);
  });

  it("defaults to false when service returns empty results", async () => {
    mockService.detectCounterClaims.mockResolvedValue([]);

    const result = await detectCounterClaim("Some claim", "Some thesis", 50, []);

    expect(result).toBe(false);
  });

  it("handles zero evidence items gracefully", async () => {
    mockService.detectCounterClaims.mockResolvedValue([
      { claimId: "claim", isCounterClaim: false, reasoning: "No evidence context" },
    ]);

    const result = await detectCounterClaim("Some claim", "Some thesis", 50);

    expect(result).toBe(false);
    expect(mockService.detectCounterClaims).toHaveBeenCalledWith(
      expect.objectContaining({
        claims: [
          expect.objectContaining({
            evidenceDirections: { supporting: 0, contradicting: 0 },
          }),
        ],
      }),
    );
  });
});
