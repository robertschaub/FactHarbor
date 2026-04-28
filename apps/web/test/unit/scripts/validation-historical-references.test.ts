import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "../..");
const familiesPath = path.join(repoRoot, "scripts", "validation", "captain-approved-families.json");
const require = createRequire(import.meta.url);
const { extractValidationSummary } = require(
  path.join(repoRoot, "apps", "web", "scripts", "automatic-claim-selection.js"),
);

const approvedFamilies = [
  {
    familyName: "bundesrat_eu_rechtskraeftig",
    inputType: "text",
    inputValue:
      "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben",
  },
  {
    familyName: "bundesrat_eu_bevor",
    inputType: "text",
    inputValue:
      "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben",
  },
  {
    familyName: "asyl_schweiz_235000",
    inputType: "text",
    inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
  },
  {
    familyName: "fluechtlinge_schweiz_235000",
    inputType: "text",
    inputValue:
      "235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.",
  },
  {
    familyName: "bolsonaro_en_legal_fair_trial",
    inputType: "text",
    inputValue:
      "Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?",
  },
  {
    familyName: "bolsonaro_pt_processo",
    inputType: "text",
    inputValue:
      "O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas",
  },
  {
    familyName: "hydrogen_cars_efficiency",
    inputType: "text",
    inputValue: "Using hydrogen for cars is more efficient than using electricity",
  },
  {
    familyName: "plastic_recycling_pointless",
    inputType: "text",
    inputValue: "Plastic recycling is pointless",
  },
];

describe("Captain-approved validation historical references", () => {
  it("maps every Captain-approved family to a read-only direct reference or explicit stale comparator", () => {
    const families = JSON.parse(fs.readFileSync(familiesPath, "utf-8"));

    expect(
      families.map(({ familyName, inputType, inputValue }) => ({
        familyName,
        inputType,
        inputValue,
      })),
    ).toEqual(approvedFamilies);

    for (const family of families) {
      expect(typeof family.familyName).toBe("string");
      expect(typeof family.inputValue).toBe("string");
      expect(family.historicalDirectReference).toEqual(
        expect.objectContaining({
          jobId: expect.any(String),
          submissionPath: "direct-api-historical",
          status: "SUCCEEDED",
          referenceQuality: expect.stringMatching(/^(same-day-direct|stale-direct)$/),
        }),
      );
      expect(family.historicalDirectReference.jobId).toMatch(/^[a-f0-9]{32}$/);
    }
  });

  it("emits quality and job-status as separate historical reference fields", () => {
    const [family] = JSON.parse(fs.readFileSync(familiesPath, "utf-8"));
    const summary = extractValidationSummary({
      family,
      job: {
        id: "job-id",
        status: "SUCCEEDED",
        preparedStage1Json: JSON.stringify({
          preparedUnderstanding: {
            atomicClaims: [{ id: "AC_01", claim: "Approved fixture claim" }],
          },
        }),
        claimSelectionJson: JSON.stringify({
          rankedClaimIds: ["AC_01"],
          recommendedClaimIds: ["AC_01"],
          selectedClaimIds: ["AC_01"],
          deferredClaimIds: [],
        }),
        resultJson: JSON.stringify({
          truthPercentage: 60,
          verdict: "LEANING-TRUE",
          confidence: 82,
          claimVerdicts: [],
          claimBoundaries: [],
          evidenceItems: [],
          sources: [],
          analysisWarnings: [],
        }),
      },
    });

    expect(summary.historicalDirectReferenceJobId).toBe(
      family.historicalDirectReference.jobId,
    );
    expect(summary.historicalDirectReferenceQuality).toBe("same-day-direct");
    expect(summary.historicalDirectReferenceJobStatus).toBe("SUCCEEDED");
    expect(summary).not.toHaveProperty("historicalDirectReferenceStatus");
  });

  it("emits ACS budget treatment and selected-claim coverage telemetry", () => {
    const [family] = JSON.parse(fs.readFileSync(familiesPath, "utf-8"));
    const summary = extractValidationSummary({
      family,
      job: {
        id: "job-id",
        status: "SUCCEEDED",
        submissionPath: "acs-automatic-draft",
        createdGitCommitHash: "created-commit",
        executedWebGitCommitHash: "executed-commit",
        promptContentHash: "prompt-hash",
        preparedStage1Json: JSON.stringify({
          preparationProvenance: {
            pipelineVariant: "claimboundary",
            sourceInputType: "text",
            resolvedInputSha256: "input-hash",
            executedWebGitCommitHash: "prepared-executed-commit",
            promptContentHash: "prepared-prompt-hash",
            pipelineConfigHash: "pipeline-hash",
            searchConfigHash: "search-hash",
            calcConfigHash: "calc-hash",
            selectionCap: 5,
          },
          preparedUnderstanding: {
            atomicClaims: [
              { id: "AC_01", claim: "Approved fixture claim one" },
              { id: "AC_02", claim: "Approved fixture claim two" },
            ],
          },
        }),
        claimSelectionJson: JSON.stringify({
          rankedClaimIds: ["AC_01", "AC_02"],
          recommendedClaimIds: ["AC_01"],
          selectedClaimIds: ["AC_01"],
          deferredClaimIds: ["AC_02"],
          budgetFitRationale: "Budget preserves contradiction work for the selected claim.",
          assessments: [
            {
              claimId: "AC_01",
              budgetTreatment: "selected",
              budgetTreatmentRationale: "Selected as the strongest candidate.",
            },
            {
              claimId: "AC_02",
              budgetTreatment: "deferred_budget_limited",
              budgetTreatmentRationale: "Deferred to preserve research budget.",
            },
          ],
        }),
        resultJson: JSON.stringify({
          truthPercentage: 60,
          verdict: "LEANING-TRUE",
          confidence: 82,
          claimVerdicts: [],
          claimBoundaries: [],
          evidenceItems: [],
          sources: [],
          analysisWarnings: [],
          analysisObservability: {
            acsResearchWaste: {
              selectedClaimResearchCoverage: [
                {
                  claimId: "AC_01",
                  targetedMainIterations: 0,
                  totalIterations: 1,
                  iterationTypeCounts: {
                    main: 0,
                    contradiction: 1,
                    contrarian: 0,
                    refinement: 0,
                  },
                  queryCount: 1,
                  fetchAttemptCount: 1,
                  admittedEvidenceItemCount: 0,
                  finalEvidenceItemCount: 0,
                  elapsedMs: 250,
                  sufficiencyState: "insufficient",
                  zeroTargetedMainResearch: true,
                  notRunReason: "no_targeted_main_iteration_recorded",
                },
              ],
              selectedClaimResearch: [
                {
                  claimId: "AC_01",
                  iterations: 1,
                  queryCount: 1,
                  fetchAttemptCount: 1,
                  evidenceItemCount: 0,
                  elapsedMs: 250,
                  sufficiencyState: "insufficient",
                },
              ],
              contradictionReachability: {
                started: true,
                remainingMsWhenMainResearchEnded: 1000,
                iterationsUsed: 1,
                sourcesFound: 0,
              },
            },
          },
        }),
      },
    });

    expect(summary.budgetFitRationale).toContain("Budget preserves");
    expect(summary.budgetTreatmentCounts).toEqual({
      selected: 1,
      deferred_budget_limited: 1,
    });
    expect(summary.budgetTreatmentByClaimId).toMatchObject({
      AC_01: { budgetTreatment: "selected" },
      AC_02: { budgetTreatment: "deferred_budget_limited" },
    });
    expect(summary.selectedClaimResearchCoverage).toHaveLength(1);
    expect(summary.selectedClaimResearch).toHaveLength(1);
    expect(summary.zeroTargetedSelectedClaimCount).toBe(1);
    expect(summary.zeroTargetedSelectedClaimIds).toEqual(["AC_01"]);
    expect(summary.submissionPath).toBe("acs-automatic-draft");
    expect(summary.gitCommitHash).toBe("executed-commit");
    expect(summary.createdGitCommitHash).toBe("created-commit");
    expect(summary.executedWebGitCommitHash).toBe("executed-commit");
    expect(summary.promptContentHash).toBe("prompt-hash");
    expect(summary.analysisRunProvenance).toMatchObject({
      version: 1,
      submissionPath: "acs-automatic-draft",
      jobId: "job-id",
      createdGitCommitHash: "created-commit",
      executedWebGitCommitHash: "executed-commit",
      promptContentHash: "prompt-hash",
      preparedStage1: {
        pipelineVariant: "claimboundary",
        resolvedInputSha256: "input-hash",
        pipelineConfigHash: "pipeline-hash",
        searchConfigHash: "search-hash",
        calcConfigHash: "calc-hash",
        selectionCap: 5,
      },
    });
  });
});
