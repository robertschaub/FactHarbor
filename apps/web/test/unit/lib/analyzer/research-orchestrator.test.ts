import { describe, expect, it } from "vitest";
import {
  finalizeClaimAcquisitionTelemetry,
  recordApplicabilityRemovalTelemetry,
  recordSeededEvidenceTelemetry,
  resolveDirectApplicabilityRequirement,
} from "@/lib/analyzer/research-orchestrator";
import type { CBResearchState, EvidenceItem } from "@/lib/analyzer/types";

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

describe("resolveDirectApplicabilityRequirement (degraded applicability fails open)", () => {
  const assessed = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `EV_${i}`, applicabilityAssessed: true })) as any;
  const unmarked = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `EV_${i}` })) as any;

  it("keeps direct-applicability required when the classifier ran (items assessed)", () => {
    expect(resolveDirectApplicabilityRequirement(true, assessed(3))).toBe(true);
  });

  it("drops the requirement when the classifier did NOT run (degraded → no item assessed)", () => {
    // Infra degradation: assessEvidenceApplicability returns items UNMARKED. Requiring
    // direct applicability here would collapse the job to UNVERIFIED on an infra failure
    // (the fail-closed inversion this fixes).
    expect(resolveDirectApplicabilityRequirement(true, unmarked(3))).toBe(false);
  });

  it("drops the requirement on a pool with no assessed item", () => {
    expect(resolveDirectApplicabilityRequirement(true, [])).toBe(false);
    expect(
      resolveDirectApplicabilityRequirement(true, [{ id: "EV_0" }, { id: "EV_1", applicability: "contextual" }] as any),
    ).toBe(false);
  });

  it("never requires when the base requirement is false (filter disabled / no geography)", () => {
    expect(resolveDirectApplicabilityRequirement(false, assessed(5))).toBe(false);
  });

  it("requires when at least one surviving item is assessed (classifier ran)", () => {
    expect(
      resolveDirectApplicabilityRequirement(true, [{ id: "EV_0" }, { id: "EV_1", applicabilityAssessed: true }] as any),
    ).toBe(true);
  });
});

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
});
