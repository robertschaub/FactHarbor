import { describe, expect, it } from "vitest";

import type { AnalysisWarning, CBClaimVerdict, EvidenceItem } from "@/lib/analyzer/types";
import { stripPhantomEvidenceIds } from "@/lib/analyzer/verdict-stage";

function makeVerdict(overrides: Partial<CBClaimVerdict> = {}): CBClaimVerdict {
  return {
    id: "CV_AC_01",
    claimId: "AC_01",
    truthPercentage: 62,
    verdict: "LEANING-TRUE",
    confidence: 71,
    confidenceTier: "MEDIUM",
    reasoning: "Base verdict reasoning.",
    harmPotential: "medium",
    isContested: false,
    supportingEvidenceIds: ["EV_VALID"],
    contradictingEvidenceIds: [],
    boundaryFindings: [],
    consistencyResult: {
      claimId: "AC_01",
      percentages: [62],
      average: 62,
      spread: 0,
      stable: true,
      assessed: false,
    },
    challengeResponses: [],
    triangulationScore: {
      boundaryCount: 0,
      supporting: 0,
      contradicting: 0,
      level: "weak",
      factor: 1,
    },
    ...overrides,
  };
}

describe("stripPhantomEvidenceIds challenge-adjusted sanitation", () => {
  it("reverts to the advocate verdict when phantom cleanup removes the decisive adjusted side", () => {
    const warnings: AnalysisWarning[] = [];
    const evidence = [{ id: "EV_VALID" } as EvidenceItem];

    const advocate = makeVerdict({
      truthPercentage: 61,
      verdict: "LEANING-TRUE",
      confidence: 68,
      confidenceTier: "MEDIUM",
      reasoning: "Advocate reasoning.",
      supportingEvidenceIds: ["EV_VALID"],
      contradictingEvidenceIds: [],
    });

    const adjusted = makeVerdict({
      truthPercentage: 29,
      verdict: "LEANING-FALSE",
      confidence: 74,
      confidenceTier: "MEDIUM",
      reasoning: "Reconciler adjusted the verdict due to a challenge.",
      supportingEvidenceIds: [],
      contradictingEvidenceIds: ["EV_PHANTOM"],
      isContested: true,
      challengeResponses: [
        {
          challengeType: "missing_evidence",
          response: "The challenge was accepted.",
          verdictAdjusted: true,
          adjustmentBasedOnChallengeIds: ["CP_AC_01_0"],
        },
      ],
    });

    const result = stripPhantomEvidenceIds([adjusted], evidence, warnings, [advocate]);

    expect(result[0].truthPercentage).toBe(61);
    expect(result[0].verdict).toBe("LEANING-TRUE");
    expect(result[0].reasoning).toBe("Advocate reasoning.");
    expect(result[0].supportingEvidenceIds).toEqual(["EV_VALID"]);
    expect(result[0].contradictingEvidenceIds).toEqual([]);
    expect(result[0].challengeResponses[0]?.verdictAdjusted).toBe(false);
    expect(result[0].challengeResponses[0]?.response).toContain("citation sanitation");
    expect(
      warnings.some((warning) =>
        warning.message.includes("reverted challenge-driven adjustment"),
      ),
    ).toBe(true);
  });

  it("keeps non-adjusted verdicts sanitized without reverting them", () => {
    const warnings: AnalysisWarning[] = [];
    const evidence = [{ id: "EV_VALID" } as EvidenceItem];

    const verdict = makeVerdict({
      truthPercentage: 29,
      verdict: "LEANING-FALSE",
      confidence: 74,
      confidenceTier: "MEDIUM",
      contradictingEvidenceIds: ["EV_PHANTOM"],
      challengeResponses: [
        {
          challengeType: "missing_evidence",
          response: "Challenge considered but no adjustment made.",
          verdictAdjusted: false,
          adjustmentBasedOnChallengeIds: ["CP_AC_01_0"],
        },
      ],
    });

    const result = stripPhantomEvidenceIds([verdict], evidence, warnings, [makeVerdict()]);

    expect(result[0].truthPercentage).toBe(29);
    expect(result[0].verdict).toBe("LEANING-FALSE");
    expect(result[0].supportingEvidenceIds).toEqual(["EV_VALID"]);
    expect(result[0].contradictingEvidenceIds).toEqual([]);
    expect(
      warnings.some((warning) =>
        warning.message.includes("reverted challenge-driven adjustment"),
      ),
    ).toBe(false);
  });
});
