import { describe, expect, it } from "vitest";
import {
  finalizeClaimAcquisitionTelemetry,
  recordApplicabilityRemovalTelemetry,
  recordSeededEvidenceTelemetry,
  resolveDirectApplicabilityRequirement,
  claimRequiresDirectApplicability,
  evaluateEvidenceSufficiency,
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

describe("enabled applicability requirements", () => {
  it.each([[], [{applicabilityAssessed:true}], [{applicabilityAssessed:false}]])("does not fail open based on invocation history: %j", evidence => {
    expect(resolveDirectApplicabilityRequirement(true,evidence as any)).toBe(true);
    expect(resolveDirectApplicabilityRequirement(false,evidence as any)).toBe(false);
    expect(claimRequiresDirectApplicability(true,3,[],evidence as any)).toBe(true);
    expect(claimRequiresDirectApplicability(true,3,["CH"],evidence as any)).toBe(true);
  });
  it("retains disabled and empty-claim cases", () => {
    expect(claimRequiresDirectApplicability(false,3,["CH"],[])).toBe(false);
    expect(claimRequiresDirectApplicability(true,0,["CH"],[])).toBe(false);
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


describe("claim-specific sufficiency", () => {
  it("direct-to-A cannot satisfy B or its authoritative shortcut", () => {
    const evidence=[{id:"E",relevantClaimIds:["A","B"],sourceUrl:"https://example.test/",sourceType:"legal_document",
      claimDirection:"supports",probativeValue:"high",applicabilityByClaim:{
        A:{status:"assessed",assessed:true,classification:"direct"},
        B:{status:"assessed",assessed:true,classification:"contextual"},
      }}] as EvidenceItem[];
    const config={minItems:1,minSourceTypes:2,minDistinctDomains:2,minDirectionalItems:1,
      authoritativeDirectionalMinItems:1,authoritativeDirectionalSourceTypes:["legal_document"],includeSeeded:true,requireDirectApplicability:true};
    expect(evaluateEvidenceSufficiency(evidence,{...config,claimId:"A"})).toMatchObject({sufficient:true,directionalCount:1,hasAuthoritativeDirectionalSufficiency:true});
    expect(evaluateEvidenceSufficiency(evidence,{...config,claimId:"B"})).toMatchObject({sufficient:false,directionalCount:0,hasAuthoritativeDirectionalSufficiency:false});
  });
});
