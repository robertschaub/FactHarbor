import { describe, expect, it } from "vitest";

import {
  createResearchWasteMetrics,
  finalizeResearchWasteMetrics,
  hydratePreparedResearchWasteMetrics,
} from "@/lib/analyzer/research-waste-metrics";
import type {
  CBClaimUnderstanding,
  CBResearchState,
  ResearchWasteMetrics,
} from "@/lib/analyzer/types";

function makePreparedMetrics(overrides: Partial<ResearchWasteMetrics> = {}): ResearchWasteMetrics {
  return {
    ...createResearchWasteMetrics(),
    preliminaryTotals: {
      queryCount: 2,
      fetchAttemptCount: 3,
      successfulFetchCount: 3,
      evidenceItemCount: 2,
      sourceUrlCount: 2,
      sourceTextByteCount: 1234,
    },
    ...overrides,
  };
}

describe("research waste metrics", () => {
  it("counts shared selected+dropped preliminary evidence in both non-exclusive buckets", () => {
    const state = {} as CBResearchState;
    const preparedUnderstanding = {
      detectedInputType: "text",
      impliedClaim: "Claim set",
      backgroundDetails: "",
      articleThesis: "",
      atomicClaims: [
        { id: "AC_A", statement: "Claim A" },
        { id: "AC_B", statement: "Claim B" },
      ],
      distinctEvents: [],
      riskTier: "A",
      preliminaryEvidence: [
        {
          claimId: "AC_A",
          relevantClaimIds: ["AC_A", "AC_B"],
          sourceUrl: "https://example.com/shared/",
          snippet: "Shared evidence",
        },
        {
          claimId: "",
          relevantClaimIds: [],
          sourceUrl: "https://example.com/unmapped",
          snippet: "Unmapped evidence",
        },
      ],
      gate1Stats: {
        totalClaims: 2,
        passedOpinion: 2,
        passedSpecificity: 2,
        filteredCount: 0,
        overallPass: true,
      },
    } as CBClaimUnderstanding;

    const metrics = hydratePreparedResearchWasteMetrics({
      state,
      preparedUnderstanding,
      selectedClaimIds: ["AC_B"],
      preparedMetrics: makePreparedMetrics(),
    });

    expect(metrics.preparedCandidateCount).toBe(2);
    expect(metrics.selectedClaimCount).toBe(1);
    expect(metrics.droppedCandidateCount).toBe(1);
    expect(metrics.preliminaryByOutcome.selected).toMatchObject({
      evidenceItemCount: 1,
      sourceUrlCount: 1,
    });
    expect(metrics.preliminaryByOutcome.dropped).toMatchObject({
      evidenceItemCount: 1,
      sourceUrlCount: 1,
    });
    expect(metrics.preliminaryByOutcome.unmapped).toMatchObject({
      queryCount: 2,
      fetchAttemptCount: 3,
      successfulFetchCount: 3,
      evidenceItemCount: 1,
      sourceUrlCount: 1,
      sourceTextByteCount: 1234,
    });
  });

  it("reports normalized Stage 1 to Stage 2 overlap by structural family without persisting source text", () => {
    const state = {
      understanding: {
        atomicClaims: [{ id: "AC_B", statement: "Claim B" }],
        preliminaryEvidence: [
          {
            claimId: "AC_B",
            relevantClaimIds: ["AC_B"],
            sourceUrl: "https://www.example.com/report.pdf/?utm_source=x&keep=Y#section",
          },
          {
            claimId: "AC_B",
            relevantClaimIds: ["AC_B"],
            sourceUrl: "https://data.example.com/table.csv",
          },
          {
            claimId: "AC_B",
            relevantClaimIds: ["AC_B"],
            sourceUrl: "https://html.example.com/page/",
          },
          {
            claimId: "AC_B",
            relevantClaimIds: ["AC_B"],
            sourceUrl: "https://unknown.example.com/source",
          },
        ],
      },
      evidenceItems: [
        {
          id: "EV_01",
          statement: "Evidence",
          category: "evidence",
          specificity: "high",
          sourceId: "S_001",
          sourceUrl: "https://example.com/report.pdf?keep=y",
          sourceTitle: "Report",
          sourceExcerpt: "SECRET_EXCERPT_SHOULD_NOT_PERSIST",
          relevantClaimIds: ["AC_B"],
          evidenceScope: { name: "Scope" },
          claimDirection: "supports",
        },
      ],
      sources: [
        {
          id: "S_001",
          url: "https://example.com/report.pdf?keep=y",
          title: "Document",
          category: "application/pdf",
          fullText: "SECRET_SOURCE_TEXT_SHOULD_NOT_PERSIST",
          trackRecordScore: null,
          fetchSuccess: true,
          fetchedAt: "2026-04-27T00:00:00Z",
        },
        {
          id: "S_002",
          url: "https://data.example.com/table.csv",
          title: "Data",
          category: "text/csv",
          fullText: "data text",
          trackRecordScore: null,
          fetchSuccess: true,
          fetchedAt: "2026-04-27T00:00:00Z",
        },
        {
          id: "S_003",
          url: "https://html.example.com/page",
          title: "HTML",
          category: "text/html",
          fullText: "html text",
          trackRecordScore: null,
          fetchSuccess: true,
          fetchedAt: "2026-04-27T00:00:00Z",
        },
        {
          id: "S_004",
          url: "https://unknown.example.com/source",
          title: "Unknown",
          category: "application/octet-stream",
          fullText: "unknown text",
          trackRecordScore: null,
          fetchSuccess: true,
          fetchedAt: "2026-04-27T00:00:00Z",
        },
      ],
      searchQueries: [],
      claimAcquisitionLedger: {
        AC_B: {
          seededEvidenceItems: 0,
          iterations: [
            {
              iteration: 0,
              iterationType: "main",
              languageLane: "primary",
              generatedQueries: ["query"],
              searchResults: 4,
              relevanceAccepted: 4,
              sourcesFetched: 4,
              rawEvidenceItems: 1,
              admittedEvidenceItems: 1,
              directionCounts: { supports: 1, contradicts: 0, neutral: 0 },
              losses: {
                relevanceRejected: 0,
                fetchRejected: 0,
                sourcesWithoutEvidence: 0,
                probativeFilteredOut: 0,
                perSourceCapDroppedNew: 0,
                perSourceCapEvictedExisting: 0,
              },
              durationMs: 1500,
            },
          ],
        },
      },
      contradictionIterationsUsed: 0,
      contradictionSourcesFound: 0,
      researchWasteMetrics: createResearchWasteMetrics(),
    } as unknown as CBResearchState;

    const metrics = finalizeResearchWasteMetrics(state, {
      claimSufficiencyThreshold: 1,
      researchStartMs: 0,
    });

    expect(metrics.stage1ToStage2UrlOverlap).toMatchObject({
      stage1UrlCount: 4,
      stage2UrlCount: 4,
      exactOverlapCount: 4,
      documentOverlapCount: 1,
      dataOverlapCount: 1,
      htmlOverlapCount: 1,
      unknownOverlapCount: 1,
    });
    expect(metrics.stage1ToStage2UrlOverlap.normalizedOverlapUrls).toEqual([
      "https://data.example.com/table.csv",
      "https://example.com/report.pdf?keep=y",
      "https://html.example.com/page",
      "https://unknown.example.com/source",
    ]);
    expect(metrics.selectedClaimResearch).toEqual([
      {
        claimId: "AC_B",
        iterations: 1,
        queryCount: 1,
        fetchAttemptCount: 4,
        evidenceItemCount: 1,
        elapsedMs: 1500,
        sufficiencyState: "sufficient",
      },
    ]);
    expect(metrics.selectedClaimResearchCoverage).toEqual([
      {
        claimId: "AC_B",
        targetedMainIterations: 1,
        totalIterations: 1,
        iterationTypeCounts: {
          main: 1,
          contradiction: 0,
          contrarian: 0,
          refinement: 0,
        },
        queryCount: 1,
        fetchAttemptCount: 4,
        admittedEvidenceItemCount: 1,
        finalEvidenceItemCount: 1,
        elapsedMs: 1500,
        sufficiencyState: "sufficient",
        zeroTargetedMainResearch: false,
      },
    ]);

    const serialized = JSON.stringify(metrics);
    expect(serialized).not.toContain("SECRET_SOURCE_TEXT_SHOULD_NOT_PERSIST");
    expect(serialized).not.toContain("SECRET_EXCERPT_SHOULD_NOT_PERSIST");
  });

  it("surfaces zero targeted main research separately from non-main iterations", () => {
    const state = {
      understanding: {
        atomicClaims: [
          { id: "AC_A", statement: "Claim A" },
          { id: "AC_B", statement: "Claim B" },
        ],
        preliminaryEvidence: [],
      },
      evidenceItems: [
        {
          id: "EV_01",
          statement: "Evidence",
          category: "evidence",
          specificity: "high",
          sourceId: "S_001",
          sourceUrl: "https://example.com/source",
          sourceTitle: "Source",
          sourceExcerpt: "Excerpt",
          relevantClaimIds: ["AC_A"],
          evidenceScope: { name: "Scope" },
          claimDirection: "supports",
        },
      ],
      sources: [],
      searchQueries: [],
      claimAcquisitionLedger: {
        AC_A: {
          seededEvidenceItems: 0,
          iterations: [
            {
              iteration: 0,
              iterationType: "contradiction",
              languageLane: "primary",
              generatedQueries: ["query one"],
              searchResults: 3,
              relevanceAccepted: 2,
              sourcesFetched: 1,
              rawEvidenceItems: 1,
              admittedEvidenceItems: 1,
              directionCounts: { supports: 0, contradicts: 1, neutral: 0 },
              losses: {
                relevanceRejected: 1,
                fetchRejected: 1,
                sourcesWithoutEvidence: 0,
                probativeFilteredOut: 0,
                perSourceCapDroppedNew: 0,
                perSourceCapEvictedExisting: 0,
              },
              durationMs: 500,
            },
            {
              iteration: 1,
              iterationType: "refinement",
              languageLane: "primary",
              generatedQueries: ["query two", "query three"],
              searchResults: 4,
              relevanceAccepted: 2,
              sourcesFetched: 2,
              rawEvidenceItems: 1,
              admittedEvidenceItems: 0,
              directionCounts: { supports: 1, contradicts: 0, neutral: 0 },
              losses: {
                relevanceRejected: 2,
                fetchRejected: 0,
                sourcesWithoutEvidence: 1,
                probativeFilteredOut: 0,
                perSourceCapDroppedNew: 0,
                perSourceCapEvictedExisting: 0,
              },
              durationMs: 750,
            },
          ],
        },
      },
      contradictionIterationsUsed: 0,
      contradictionSourcesFound: 0,
      researchWasteMetrics: createResearchWasteMetrics(),
    } as unknown as CBResearchState;

    const metrics = finalizeResearchWasteMetrics(state, {
      claimSufficiencyThreshold: 1,
      researchStartMs: 0,
    });

    expect(metrics.selectedClaimResearchCoverage).toEqual([
      expect.objectContaining({
        claimId: "AC_A",
        targetedMainIterations: 0,
        totalIterations: 2,
        iterationTypeCounts: {
          main: 0,
          contradiction: 1,
          contrarian: 0,
          refinement: 1,
        },
        queryCount: 3,
        fetchAttemptCount: 4,
        admittedEvidenceItemCount: 1,
        finalEvidenceItemCount: 1,
        sufficiencyState: "sufficient",
        zeroTargetedMainResearch: true,
        notRunReason: "no_targeted_main_iteration_recorded",
      }),
      expect.objectContaining({
        claimId: "AC_B",
        targetedMainIterations: 0,
        totalIterations: 0,
        iterationTypeCounts: {
          main: 0,
          contradiction: 0,
          contrarian: 0,
          refinement: 0,
        },
        zeroTargetedMainResearch: true,
        notRunReason: "no_claim_acquisition_ledger_entry",
      }),
    ]);
    expect(metrics.selectedClaimResearch).toEqual([
      expect.objectContaining({
        claimId: "AC_A",
        iterations: 2,
        evidenceItemCount: 1,
      }),
      expect.objectContaining({
        claimId: "AC_B",
        iterations: 0,
        evidenceItemCount: 0,
      }),
    ]);
  });
});
