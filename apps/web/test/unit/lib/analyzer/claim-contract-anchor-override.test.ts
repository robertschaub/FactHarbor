import { describe, expect, it } from "vitest";

import { evaluateClaimContractValidation } from "@/lib/analyzer/claim-extraction-stage";
import type { AtomicClaim } from "@/lib/analyzer/types";

type ClaimContractValidationResult = Parameters<typeof evaluateClaimContractValidation>[0];

function makeDirectClaim(id: string, statement: string): AtomicClaim {
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

describe("evaluateClaimContractValidation", () => {
  it("does not force report_damaged when an uncited meta anchor accompanies an otherwise approved contract", () => {
    const claims = [
      makeDirectClaim("AC_01", "Social media algorithms influence political communication strategies in Western democracies."),
      makeDirectClaim("AC_02", "Platform algorithms are opaque to users and external researchers."),
      makeDirectClaim("AC_03", "Cambridge Analytica used harvested Facebook data for psychographic political targeting."),
      makeDirectClaim("AC_09", "Algorithmic gatekeeping can compromise fair public debate and indirectly threaten freedom of expression."),
      makeDirectClaim("AC_10", "Large digital platforms influence the public sphere without democratic legitimacy."),
    ];

    const result: ClaimContractValidationResult = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary:
          "The extracted claims collectively preserve the original claim contract. The omission of a significance caveat does not rise to rePrompt level for this multi-claim article input.",
      },
      claims: claims.map((claim) => ({
        claimId: claim.id,
        preservesEvaluativeMeaning: true,
        usesNeutralDimensionQualifier: true,
        proxyDriftSeverity: "none" as const,
        recommendedAction: "keep" as const,
        reasoning: "ok",
      })),
      truthConditionAnchor: {
        presentInInput: true,
        anchorText: "The results are limited in their significance",
        preservedInClaimIds: [],
        preservedByQuotes: [],
      },
    };

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(true);
    expect(evaluated.summary.rePromptRequired).toBe(false);
    expect(evaluated.summary.truthConditionAnchor?.validPreservedIds).toEqual([]);
    expect(evaluated.anchorRetryReason).toBeUndefined();
  });
});
