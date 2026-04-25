import { describe, expect, it, vi } from "vitest";
import {
  classifyRelevanceWithJobCache,
  collectSourceReliabilityUrls,
  finalizeClaimAcquisitionTelemetry,
  recordApplicabilityRemovalTelemetry,
  recordSeededEvidenceTelemetry,
} from "@/lib/analyzer/research-orchestrator";
import type { AtomicClaim, CBResearchState, EvidenceItem } from "@/lib/analyzer/types";

function createState(claimIds = ["AC_01", "AC_02", "AC_03"]): CBResearchState {
  return {
    originalInput: "test",
    inputType: "text",
    languageIntent: null,
    understanding: {
      atomicClaims: claimIds.map((id) => ({
        id,
        text: id,
      })),
    } as any,
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    claimAcquisitionLedger: {},
    queryBudgetUsageByClaim: {},
    mainIterationsUsed: 0,
    contradictionIterationsReserved: 0,
    contradictionIterationsUsed: 0,
    contradictionSourcesFound: 0,
    claimBoundaries: [],
    llmCalls: 0,
    warnings: [],
  };
}

describe("research-orchestrator telemetry helpers", () => {
  it("records seeded evidence counts claim-locally", () => {
    const state = createState(["AC_01", "AC_02"]);
    const seededItems = [
      { id: "EV_001", relevantClaimIds: ["AC_01"] },
      { id: "EV_002", relevantClaimIds: ["AC_01", "AC_02"] },
      { id: "EV_003" },
    ] as EvidenceItem[];

    recordSeededEvidenceTelemetry(state, seededItems);

    expect(state.claimAcquisitionLedger?.AC_01?.seededEvidenceItems).toBe(2);
    expect(state.claimAcquisitionLedger?.AC_02?.seededEvidenceItems).toBe(1);
    expect(state.claimAcquisitionLedger?.AC_03).toBeUndefined();
  });

  it("records post-research applicability removals per affected claim", () => {
    const state = createState(["AC_01", "AC_02"]);
    const removedItems = [
      { id: "EV_101", relevantClaimIds: ["AC_01"], applicability: "foreign_reaction" },
      { id: "EV_102", relevantClaimIds: ["AC_01", "AC_02"], applicability: "foreign_reaction" },
    ] as EvidenceItem[];

    recordApplicabilityRemovalTelemetry(state, removedItems);

    expect(state.claimAcquisitionLedger?.AC_01?.postResearchApplicabilityRemoved).toBe(2);
    expect(state.claimAcquisitionLedger?.AC_02?.postResearchApplicabilityRemoved).toBe(1);
  });

  it("finalizes per-claim boundary concentration and direction counts", () => {
    const state = createState(["AC_01", "AC_02", "AC_03"]);
    state.evidenceItems = [
      {
        id: "EV_201",
        relevantClaimIds: ["AC_01"],
        claimDirection: "supports",
        claimBoundaryId: "CB_01",
      },
      {
        id: "EV_202",
        relevantClaimIds: ["AC_01"],
        claimDirection: "contradicts",
        claimBoundaryId: "CB_01",
      },
      {
        id: "EV_203",
        relevantClaimIds: ["AC_01"],
        claimDirection: "neutral",
        claimBoundaryId: "CB_02",
      },
      {
        id: "EV_204",
        relevantClaimIds: ["AC_02"],
        claimDirection: "supports",
        claimBoundaryId: "CB_02",
      },
    ] as EvidenceItem[];

    finalizeClaimAcquisitionTelemetry(state);

    expect(state.claimAcquisitionLedger?.AC_01).toMatchObject({
      finalEvidenceItems: 3,
      finalBoundaryCount: 2,
      maxBoundaryShare: 2 / 3,
      finalDirectionCounts: {
        supports: 1,
        contradicts: 1,
        neutral: 1,
      },
    });
    expect(state.claimAcquisitionLedger?.AC_01?.boundaryDistribution).toEqual([
      { claimBoundaryId: "CB_01", evidenceCount: 2 },
      { claimBoundaryId: "CB_02", evidenceCount: 1 },
    ]);
    expect(state.claimAcquisitionLedger?.AC_02).toMatchObject({
      finalEvidenceItems: 1,
      finalBoundaryCount: 1,
      maxBoundaryShare: 1,
      finalDirectionCounts: {
        supports: 1,
        contradicts: 0,
        neutral: 0,
      },
    });
    expect(state.claimAcquisitionLedger?.AC_03).toMatchObject({
      finalEvidenceItems: 0,
      finalBoundaryCount: 0,
      maxBoundaryShare: 0,
      finalDirectionCounts: {
        supports: 0,
        contradicts: 0,
        neutral: 0,
      },
    });
  });

  it("reuses exact relevance classification within a research job", async () => {
    const state = createState(["AC_01"]);
    const claim = {
      id: "AC_01",
      statement: "Entity A reported metric B.",
      freshnessRequirement: "current_snapshot",
    } as AtomicClaim;
    const searchResults = [
      { url: "https://example.test/a", title: "A", snippet: "Alpha" },
      { url: "https://example.test/b", title: "B", snippet: "Beta" },
    ];
    const classifier = vi.fn(async () => [
      { url: "https://example.test/a", relevanceScore: 0.91, originalRank: 1 },
    ]);

    const first = await classifyRelevanceWithJobCache({
      state,
      claim,
      searchResults,
      pipelineConfig: { relevanceFloor: 0.4 } as any,
      currentDate: "2026-04-24",
      inferredGeography: "CH",
      relevantGeographies: ["CH"],
      classifier: classifier as any,
    });

    first.relevantSources[0].relevanceScore = 0.1;

    const second = await classifyRelevanceWithJobCache({
      state,
      claim,
      searchResults,
      pipelineConfig: { relevanceFloor: 0.4 } as any,
      currentDate: "2026-04-24",
      inferredGeography: "CH",
      relevantGeographies: ["CH"],
      classifier: classifier as any,
    });

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(classifier).toHaveBeenCalledTimes(1);
    expect(second.relevantSources).toEqual([
      { url: "https://example.test/a", relevanceScore: 0.91, originalRank: 1 },
    ]);
  });

  it("does not reuse relevance classifications across changed claim text", async () => {
    const state = createState(["AC_01"]);
    const searchResults = [
      { url: "https://example.test/a", title: "A", snippet: "Alpha" },
    ];
    const classifier = vi.fn(async () => [
      { url: "https://example.test/a", relevanceScore: 0.82, originalRank: 1 },
    ]);

    await classifyRelevanceWithJobCache({
      state,
      claim: { id: "AC_01", statement: "Entity A reported metric B." } as AtomicClaim,
      searchResults,
      pipelineConfig: { relevanceFloor: 0.4 } as any,
      currentDate: "2026-04-24",
      classifier: classifier as any,
    });
    const changed = await classifyRelevanceWithJobCache({
      state,
      claim: { id: "AC_01", statement: "Entity A reported metric C." } as AtomicClaim,
      searchResults,
      pipelineConfig: { relevanceFloor: 0.4 } as any,
      currentDate: "2026-04-24",
      classifier: classifier as any,
    });

    expect(changed.cacheHit).toBe(false);
    expect(classifier).toHaveBeenCalledTimes(2);
  });
});

describe("collectSourceReliabilityUrls", () => {
  it("uses evidence-linked source URLs and ignores fetched sources that produced no evidence", () => {
    const state = createState(["AC_01"]);
    state.sources = [
      { id: "SRC_A", url: "https://source-a.example.test/a" },
      { id: "SRC_B", url: "https://source-b.example.test/b" },
      { id: "SRC_UNUSED", url: "https://unused.example.test/c" },
    ] as any;
    state.evidenceItems = [
      { id: "EV_01", sourceId: "SRC_B", sourceUrl: "https://source-b.example.test/b" },
      { id: "EV_02", sourceId: "SRC_A", sourceUrl: "https://source-a.example.test/a" },
      { id: "EV_03", sourceId: "SRC_B", sourceUrl: "https://source-b.example.test/b" },
    ] as EvidenceItem[];

    expect(collectSourceReliabilityUrls(state)).toEqual([
      "https://source-b.example.test/b",
      "https://source-a.example.test/a",
    ]);
  });
});
