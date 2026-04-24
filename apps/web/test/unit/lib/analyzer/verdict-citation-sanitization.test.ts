import { describe, expect, it } from "vitest";

import type {
  AnalysisWarning,
  CBClaimVerdict,
  ChallengeDocument,
  EvidenceItem,
} from "@/lib/analyzer/types";
import {
  enforceVerdictCitationIntegrity,
  stripPhantomEvidenceIds,
} from "@/lib/analyzer/verdict-stage";

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

function makeEvidence(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "EV_VALID",
    statement: "Evidence statement.",
    category: "evidence",
    specificity: "high",
    sourceId: "S1",
    sourceUrl: "https://example.test/source",
    sourceTitle: "Example source",
    sourceExcerpt: "Excerpt.",
    ...overrides,
  } as EvidenceItem;
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

describe("enforceVerdictCitationIntegrity", () => {
  it("removes challenge-invalid and cross-claim evidence IDs from final citation buckets", () => {
    const warnings: AnalysisWarning[] = [];
    const verdict = makeVerdict({
      supportingEvidenceIds: ["EV_VALID", "EV_CROSS_CLAIM", "EV_INVALID_CHALLENGE"],
    });
    const evidence = [
      makeEvidence({
        id: "EV_VALID",
        claimDirection: "supports",
        applicability: "direct",
        relevantClaimIds: ["AC_01"],
      }),
      makeEvidence({
        id: "EV_CROSS_CLAIM",
        claimDirection: "supports",
        applicability: "direct",
        relevantClaimIds: ["AC_02"],
      }),
      makeEvidence({
        id: "EV_INVALID_CHALLENGE",
        claimDirection: "supports",
        applicability: "direct",
        relevantClaimIds: ["AC_01"],
      }),
    ];
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "missing_evidence",
          description: "Challenge point.",
          evidenceIds: ["EV_INVALID_CHALLENGE"],
          severity: "medium",
          challengeValidation: {
            evidenceIdsValid: false,
            validIds: [],
            invalidIds: ["EV_INVALID_CHALLENGE"],
          },
        }],
      }],
    };

    const result = enforceVerdictCitationIntegrity([verdict], evidence, challengeDoc, warnings);

    expect(result[0].supportingEvidenceIds).toEqual(["EV_VALID"]);
    expect(warnings.some((warning) => warning.type === "verdict_grounding_issue")).toBe(true);
    const dropped = warnings.flatMap((warning) => (warning.details as any)?.droppedCitations ?? []);
    expect(dropped.map((drop: any) => drop.reason)).toEqual([
      "claim_scope_mismatch",
      "invalid_challenge_reference",
    ]);
  });

  it("removes non-direct and misbucketed directional citations before validation", () => {
    const warnings: AnalysisWarning[] = [];
    const verdict = makeVerdict({
      truthPercentage: 75,
      supportingEvidenceIds: [
        "EV_CONTEXTUAL",
        "EV_NEUTRAL",
        "EV_CONTRADICTS_IN_SUPPORT",
      ],
      contradictingEvidenceIds: [],
    });
    const evidence = [
      makeEvidence({
        id: "EV_CONTEXTUAL",
        claimDirection: "supports",
        applicability: "contextual",
        relevantClaimIds: ["AC_01"],
      }),
      makeEvidence({
        id: "EV_NEUTRAL",
        claimDirection: "neutral",
        applicability: "direct",
        relevantClaimIds: ["AC_01"],
      }),
      makeEvidence({
        id: "EV_CONTRADICTS_IN_SUPPORT",
        claimDirection: "contradicts",
        applicability: "direct",
        relevantClaimIds: ["AC_01"],
      }),
    ];

    const result = enforceVerdictCitationIntegrity([verdict], evidence, undefined, warnings);

    expect(result[0].supportingEvidenceIds).toEqual([]);
    expect(result[0].contradictingEvidenceIds).toEqual(["EV_CONTRADICTS_IN_SUPPORT"]);
    const directionWarning = warnings.find(
      (warning) => warning.type === "verdict_direction_issue",
    );
    expect(directionWarning).toBeDefined();
    const directionDropped = (directionWarning?.details as any)?.droppedCitations ?? [];
    const directionMoved = (directionWarning?.details as any)?.movedCitations ?? [];
    expect(directionDropped.map((drop: any) => drop.reason)).toEqual([
      "non_direct_applicability",
      "neutral_claim_direction",
    ]);
    expect(directionMoved.map((move: any) => move.id)).toEqual([
      "EV_CONTRADICTS_IN_SUPPORT",
    ]);
    const guardWarning = warnings.find(
      (warning) => warning.type === "verdict_citation_integrity_guard",
    );
    expect(guardWarning?.severity).toBe("error");
  });

  it("preserves valid citations with missing applicability while deduplicating IDs", () => {
    const warnings: AnalysisWarning[] = [];
    const verdict = makeVerdict({
      supportingEvidenceIds: ["EV_SUPPORT", "EV_SUPPORT"],
      contradictingEvidenceIds: ["EV_CONTRADICT"],
    });
    const evidence = [
      makeEvidence({
        id: "EV_SUPPORT",
        claimDirection: "supports",
        relevantClaimIds: ["AC_01"],
      }),
      makeEvidence({
        id: "EV_CONTRADICT",
        claimDirection: "contradicts",
        applicability: "direct",
        relevantClaimIds: ["AC_01"],
      }),
    ];

    const result = enforceVerdictCitationIntegrity([verdict], evidence, undefined, warnings);

    expect(result[0].supportingEvidenceIds).toEqual(["EV_SUPPORT"]);
    expect(result[0].contradictingEvidenceIds).toEqual(["EV_CONTRADICT"]);
    expect(warnings).toEqual([]);
  });
});
