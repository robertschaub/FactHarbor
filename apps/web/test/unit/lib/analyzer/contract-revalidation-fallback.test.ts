import { describe, expect, it } from "vitest";

import {
  areClaimSetsEquivalent,
  canCarryForwardValidatedContractApproval,
} from "@/lib/analyzer/claim-extraction-stage";
import type { AtomicClaim, CBClaimUnderstanding } from "@/lib/analyzer/types";

function makeClaim(
  id: string,
  statement: string,
  thesisRelevance: AtomicClaim["thesisRelevance"] = "direct",
): AtomicClaim {
  return {
    id,
    statement,
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    thesisRelevance,
    keyEntities: [],
    checkWorthiness: "high",
    specificityScore: 0.8,
    groundingQuality: "moderate",
    expectedEvidenceProfile: {
      methodologies: [],
      expectedMetrics: [],
      expectedSourceTypes: [],
    },
  };
}

function makeApprovedSummary(
  validPreservedIds: string[] = ["AC_02"],
): NonNullable<CBClaimUnderstanding["contractValidationSummary"]> {
  return {
    ran: true,
    preservesContract: true,
    rePromptRequired: false,
    summary: "contract approved",
    truthConditionAnchor: {
      presentInInput: true,
      anchorText: "comparison anchor",
      preservedInClaimIds: validPreservedIds,
      preservedByQuotes: ["comparison anchor"],
      validPreservedIds,
    },
    stageAttribution: "retry",
  };
}

describe("areClaimSetsEquivalent", () => {
  it("treats reordered claim sets as equivalent", () => {
    const left = [
      makeClaim("AC_01", "Current-side proposition."),
      makeClaim("AC_02", "Comparator proposition."),
    ];
    const right = [
      makeClaim("AC_02", "Comparator proposition."),
      makeClaim("AC_01", "Current-side proposition."),
    ];

    expect(areClaimSetsEquivalent(left, right)).toBe(true);
  });

  it("rejects materially changed claim sets", () => {
    const left = [makeClaim("AC_01", "Current-side proposition.")];
    const right = [makeClaim("AC_01", "Changed wording.")];

    expect(areClaimSetsEquivalent(left, right)).toBe(false);
  });
});

describe("canCarryForwardValidatedContractApproval", () => {
  const previouslyValidatedClaims = [
    makeClaim("AC_01", "Current-side proposition."),
    makeClaim("AC_02", "Comparator proposition."),
    makeClaim("AC_03", "Background proposition.", "tangential"),
  ];

  it("allows carry-forward when Gate 1 keeps a validated subset that still includes all anchor carriers", () => {
    const finalAcceptedClaims = [
      makeClaim("AC_02", "Comparator proposition."),
      makeClaim("AC_01", "Current-side proposition."),
    ];

    expect(
      canCarryForwardValidatedContractApproval(
        makeApprovedSummary(["AC_02"]),
        previouslyValidatedClaims,
        finalAcceptedClaims,
      ),
    ).toBe(true);
  });

  it("rejects carry-forward when Gate 1 drops a validated anchor carrier", () => {
    const finalAcceptedClaims = [makeClaim("AC_01", "Current-side proposition.")];

    expect(
      canCarryForwardValidatedContractApproval(
        makeApprovedSummary(["AC_02"]),
        previouslyValidatedClaims,
        finalAcceptedClaims,
      ),
    ).toBe(false);
  });

  it("rejects carry-forward when the final set contains an unvalidated claim", () => {
    const finalAcceptedClaims = [
      makeClaim("AC_01", "Current-side proposition."),
      makeClaim("AC_04", "Unvalidated replacement proposition."),
    ];

    expect(
      canCarryForwardValidatedContractApproval(
        makeApprovedSummary(["AC_01"]),
        previouslyValidatedClaims,
        finalAcceptedClaims,
      ),
    ).toBe(false);
  });

  it("rejects carry-forward when Gate 1 drops a previously validated thesis-direct non-anchor claim", () => {
    const finalAcceptedClaims = [makeClaim("AC_02", "Comparator proposition.")];

    expect(
      canCarryForwardValidatedContractApproval(
        makeApprovedSummary(["AC_02"]),
        previouslyValidatedClaims,
        finalAcceptedClaims,
      ),
    ).toBe(false);
  });
});
