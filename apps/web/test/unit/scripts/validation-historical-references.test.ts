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
});
