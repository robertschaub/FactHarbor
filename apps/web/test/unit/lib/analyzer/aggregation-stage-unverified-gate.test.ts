import { describe, expect, it } from "vitest";

import { enforceUnverifiedResearchExhaustionGate } from "@/lib/analyzer/aggregation-stage";
import type {
  CBResearchState,
  QualityGates,
} from "@/lib/analyzer/types";

function makeQualityGates(): QualityGates {
  return {
    passed: true,
    gate4Stats: {
      total: 2,
      publishable: 1,
      highConfidence: 0,
      mediumConfidence: 1,
      lowConfidence: 1,
      insufficient: 0,
      centralKept: 2,
    },
    summary: {
      totalEvidenceItems: 4,
      totalSources: 3,
      searchesPerformed: 6,
      contradictionSearchPerformed: false,
    },
  };
}

function makeState(overrides: Partial<CBResearchState> = {}): CBResearchState {
  return {
    originalInput: "https://example.test/source.pdf",
    inputType: "url",
    languageIntent: null,
    understanding: null,
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    claimAcquisitionLedger: {},
    queryBudgetUsageByClaim: {},
    researchedIterationsByClaim: {},
    mainIterationsUsed: 4,
    contradictionIterationsReserved: 1,
    contradictionIterationsUsed: 0,
    contradictionSourcesFound: 0,
    claimBoundaries: [],
    llmCalls: 0,
    warnings: [],
    ...overrides,
  };
}

describe("enforceUnverifiedResearchExhaustionGate", () => {
  it("fails the quality gate when UNVERIFIED follows incomplete research", () => {
    const qualityGates = makeQualityGates();
    const state = makeState({
      warnings: [
        {
          type: "budget_exceeded",
          severity: "warning",
          message: "Analysis reached its runtime budget.",
        },
      ],
    });

    enforceUnverifiedResearchExhaustionGate("UNVERIFIED", qualityGates, state);

    expect(qualityGates.passed).toBe(false);
    const warning = state.warnings.find(
      (entry) => entry.type === "unverified_research_incomplete",
    );
    expect(warning?.severity).toBe("error");
    expect(warning?.details).toMatchObject({
      blockingWarningTypes: ["budget_exceeded"],
      contradictionResearchIncomplete: true,
      contradictionIterationsReserved: 1,
      contradictionIterationsUsed: 0,
      mainIterationsUsed: 4,
    });
  });

  it("allows UNVERIFIED when required research completed without blocking warnings", () => {
    const qualityGates = makeQualityGates();
    const state = makeState({
      contradictionIterationsUsed: 1,
      contradictionSourcesFound: 2,
    });

    enforceUnverifiedResearchExhaustionGate("UNVERIFIED", qualityGates, state);

    expect(qualityGates.passed).toBe(true);
    expect(state.warnings).toEqual([]);
  });

  it("does not affect non-UNVERIFIED article verdicts", () => {
    const qualityGates = makeQualityGates();
    const state = makeState({
      warnings: [
        {
          type: "budget_exceeded",
          severity: "warning",
          message: "Analysis reached its runtime budget.",
        },
      ],
    });

    enforceUnverifiedResearchExhaustionGate("MIXED", qualityGates, state);

    expect(qualityGates.passed).toBe(true);
    expect(state.warnings).toHaveLength(1);
  });

  it("tolerates legacy partial state without warnings", () => {
    const qualityGates = makeQualityGates();
    const state = {
      contradictionIterationsReserved: 0,
      contradictionIterationsUsed: 0,
    } as CBResearchState;

    enforceUnverifiedResearchExhaustionGate("UNVERIFIED", qualityGates, state);

    expect(qualityGates.passed).toBe(true);
    expect(state.warnings).toEqual([]);
  });
});
