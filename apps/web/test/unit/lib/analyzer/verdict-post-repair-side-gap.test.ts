import { describe, expect, it, vi } from "vitest";

import type {
  AnalysisWarning,
  AtomicClaim,
  CBClaimVerdict,
  CoverageMatrix,
  EvidenceItem,
} from "@/lib/analyzer/types";
import {
  DEFAULT_VERDICT_STAGE_CONFIG,
  validateVerdicts,
  type LLMCallFn,
  type VerdictStageConfig,
} from "@/lib/analyzer/verdict-stage";

function makeVerdict(overrides: Partial<CBClaimVerdict> = {}): CBClaimVerdict {
  return {
    id: "CV_AC_01",
    claimId: "AC_01",
    truthPercentage: 30,
    verdict: "LEANING-FALSE",
    confidence: 70,
    confidenceTier: "MEDIUM",
    reasoning: "Original verdict reasoning.",
    harmPotential: "medium",
    isContested: false,
    supportingEvidenceIds: [],
    contradictingEvidenceIds: ["EV_CONTRA"],
    boundaryFindings: [],
    consistencyResult: {
      claimId: "AC_01",
      percentages: [30],
      average: 30,
      spread: 0,
      stable: false,
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
    id: "EV_CONTRA",
    statement: "Evidence statement.",
    category: "direct_evidence",
    specificity: "high",
    sourceId: "S1",
    sourceUrl: "https://example.test/source",
    sourceTitle: "Example source",
    sourceExcerpt: "Excerpt.",
    claimDirection: "contradicts",
    applicability: "direct",
    probativeValue: "high",
    relevantClaimIds: ["AC_01"],
    ...overrides,
  } as EvidenceItem;
}

const claims: AtomicClaim[] = [{
  id: "AC_01",
  statement: "Entity A achieved metric X.",
  category: "factual",
  centrality: "high",
  harmPotential: "medium",
  isCentral: true,
  claimDirection: "supports_thesis",
  thesisRelevance: "direct",
  keyEntities: ["Entity A"],
  checkWorthiness: "high",
  specificityScore: 0.8,
  groundingQuality: "strong",
  expectedEvidenceProfile: {
    methodologies: ["standard analysis"],
    expectedMetrics: ["metric X"],
    expectedSourceTypes: ["government_report"],
  },
}];

const coverageMatrix: CoverageMatrix = {
  claims: ["AC_01"],
  boundaries: [],
  counts: [[]],
  getBoundariesForClaim: () => [],
  getClaimsForBoundary: () => [],
};

describe("validateVerdicts post-repair citation-side-gap guard", () => {
  it("does not plausibility-rescue a repaired verdict that still omits a direct citation side", async () => {
    const verdicts = [makeVerdict()];
    const evidence = [
      makeEvidence({
        id: "EV_SUPPORT",
        claimDirection: "supports",
      }),
      makeEvidence(),
    ];
    const warnings: AnalysisWarning[] = [];
    let directionValidationCalls = 0;

    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionValidationCalls += 1;
        return [{
          claimId: "AC_01",
          directionValid: false,
          issues: [`Direction validation failed at pass ${directionValidationCalls}`],
        }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        return {
          claimId: "AC_01",
          truthPercentage: 30,
          reasoning: "Repaired verdict still cites only the contradicting side.",
          supportingEvidenceIds: [],
          contradictingEvidenceIds: ["EV_CONTRA"],
        };
      }
      if (key === "VERDICT_CITATION_DIRECTION_ADJUDICATION") {
        return { adjudications: [] };
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries: [], coverageMatrix },
    );

    expect(result[0].verdictReason).toBe("verdict_integrity_failure");
    expect(result[0].truthPercentage).toBe(50);
    expect(warnings.some((warning) => warning.type === "direction_rescue_plausible")).toBe(false);
    expect(
      warnings.some((warning) =>
        warning.type === "verdict_integrity_failure"
        && warning.message.includes("supportingEvidenceIds cites no direct supporting item"),
      ),
    ).toBe(true);
  });
});
