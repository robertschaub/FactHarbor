import { describe, expect, it } from "vitest";
import { filterClaimUnderstandingForSelectedClaims } from "@/lib/analyzer/claim-selection-filter";
import type { AtomicClaim, CBClaimUnderstanding } from "@/lib/analyzer/types";

function claim(id: string): AtomicClaim {
  return {
    id,
    statement: `${id} statement`,
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    thesisRelevance: "direct",
    keyEntities: [],
    checkWorthiness: "high",
    specificityScore: 0.8,
    groundingQuality: "strong",
    expectedEvidenceProfile: {
      methodologies: [],
      expectedMetrics: [],
      expectedSourceTypes: [],
    },
  };
}

function understanding(): CBClaimUnderstanding {
  return {
    detectedInputType: "text",
    impliedClaim: "Implied claim",
    backgroundDetails: "",
    articleThesis: "Thesis",
    atomicClaims: [claim("AC_01"), claim("AC_02"), claim("AC_03")],
    distinctEvents: [],
    riskTier: "B",
    preliminaryEvidence: [
      {
        sourceUrl: "https://example.test/1",
        snippet: "AC_02 only",
        claimId: "AC_02",
        relevantClaimIds: ["AC_02"],
      },
      {
        sourceUrl: "https://example.test/2",
        snippet: "Maps to selected claims",
        claimId: "AC_02",
        relevantClaimIds: ["AC_03", "AC_01"],
      },
      {
        sourceUrl: "https://example.test/3",
        snippet: "AC_01 only",
        claimId: "AC_01",
      },
    ],
    gate1Stats: {
      totalClaims: 3,
      passedOpinion: 3,
      passedSpecificity: 3,
      passedFidelity: 3,
      filteredCount: 0,
      overallPass: true,
    },
    preFilterAtomicClaims: [claim("AC_01"), claim("AC_02"), claim("AC_03")],
    gate1Reasoning: [
      { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "one" },
      { claimId: "AC_02", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "two" },
      { claimId: "AC_03", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "three" },
    ],
    contractValidationSummary: {
      ran: true,
      preservesContract: true,
      rePromptRequired: false,
      summary: "ok",
      contractCarrierClaimIds: ["AC_02", "AC_03", "AC_01"],
      truthConditionAnchor: {
        presentInInput: true,
        anchorText: "anchor",
        preservedInClaimIds: ["AC_02", "AC_03", "AC_01"],
        validPreservedIds: ["AC_03", "AC_01"],
      },
    },
  };
}

describe("claim-selection filter", () => {
  it("filters and orders Stage 1 understanding by selected claim IDs", () => {
    const filtered = filterClaimUnderstandingForSelectedClaims(understanding(), ["AC_03", "AC_01"]);

    expect(filtered.atomicClaims.map((claim) => claim.id)).toEqual(["AC_03", "AC_01"]);
    expect(filtered.preFilterAtomicClaims?.map((claim) => claim.id)).toEqual(["AC_03", "AC_01"]);
    expect(filtered.gate1Reasoning?.map((reasoning) => reasoning.claimId)).toEqual(["AC_03", "AC_01"]);
    expect(filtered.gate1Stats.totalClaims).toBe(3);
  });

  it("filters preliminary evidence and remaps multi-claim evidence to selected IDs", () => {
    const filtered = filterClaimUnderstandingForSelectedClaims(understanding(), ["AC_03", "AC_01"]);

    expect(filtered.preliminaryEvidence).toHaveLength(2);
    expect(filtered.preliminaryEvidence[0]).toMatchObject({
      sourceUrl: "https://example.test/2",
      claimId: "AC_03",
      relevantClaimIds: ["AC_03", "AC_01"],
    });
    expect(filtered.preliminaryEvidence[1]).toMatchObject({
      sourceUrl: "https://example.test/3",
      claimId: "AC_01",
    });
  });

  it("filters contract anchor claim ID lists without changing validation outcome when all carriers remain", () => {
    const input = understanding();
    input.contractValidationSummary = {
      ...input.contractValidationSummary!,
      contractCarrierClaimIds: ["AC_03", "AC_01"],
    };

    const filtered = filterClaimUnderstandingForSelectedClaims(input, ["AC_03", "AC_01"]);

    expect(filtered.contractValidationSummary?.preservesContract).toBe(true);
    expect(filtered.contractValidationSummary?.contractCarrierClaimIds).toEqual(["AC_03", "AC_01"]);
    expect(filtered.contractValidationSummary?.truthConditionAnchor?.preservedInClaimIds).toEqual(["AC_03", "AC_01"]);
    expect(filtered.contractValidationSummary?.truthConditionAnchor?.validPreservedIds).toEqual(["AC_03", "AC_01"]);
  });

  it("invalidates positive contract validation when selection removes a carrier", () => {
    const filtered = filterClaimUnderstandingForSelectedClaims(understanding(), ["AC_03", "AC_01"]);

    expect(filtered.contractValidationSummary).toMatchObject({
      preservesContract: false,
      rePromptRequired: true,
      failureMode: "contract_violated",
      summary: expect.stringContaining("AC_02"),
    });
    expect(filtered.contractValidationSummary?.contractCarrierClaimIds).toEqual(["AC_03", "AC_01"]);
  });
});

describe("claim-selection filter — unresolved preliminary evidence", () => {
  it("keeps unresolved preliminary evidence and drops evidence mapped only to deselected claims", () => {
    const input = understanding();
    input.preliminaryEvidence = [
      { sourceUrl: "https://example.test/unresolved-empty", snippet: "no claim reference", claimId: "", relevantClaimIds: [] },
      { sourceUrl: "https://example.test/unresolved-legacy", snippet: "legacy id format", claimId: "claim_1", relevantClaimIds: ["claim_1"] },
      { sourceUrl: "https://example.test/deselected", snippet: "AC_02 only", claimId: "AC_02", relevantClaimIds: ["AC_02"] },
      { sourceUrl: "https://example.test/selected", snippet: "AC_01", claimId: "AC_01", relevantClaimIds: ["AC_01"] },
    ];

    const filtered = filterClaimUnderstandingForSelectedClaims(input, ["AC_03", "AC_01"]);

    expect(filtered.preliminaryEvidence.map((evidence) => evidence.sourceUrl)).toEqual([
      "https://example.test/unresolved-empty",
      "https://example.test/unresolved-legacy",
      "https://example.test/selected",
    ]);
    // Unresolved entries pass through unchanged so the Stage 2 remap and seeding
    // fallbacks (single-claim fallback, claim_NN heuristic, LLM remap) can attribute them.
    expect(filtered.preliminaryEvidence[1]).toMatchObject({ claimId: "claim_1", relevantClaimIds: ["claim_1"] });
  });
});
