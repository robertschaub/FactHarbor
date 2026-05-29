import { describe, expect, it } from "vitest";
import { generateHtmlReport, type HtmlReportInput } from "@/app/jobs/[id]/utils/generateHtmlReport";

function makeReportInput(claimVerdicts: any[]): HtmlReportInput {
  return {
    job: {
      jobId: "job-test",
      status: "SUCCEEDED",
      inputValue: "Test claim",
      createdUtc: "2026-05-29T00:00:00Z",
      updatedUtc: "2026-05-29T00:01:00Z",
    },
    result: {
      atomicClaims: claimVerdicts.map((cv, index) => ({
        id: cv.claimId,
        statement: `Claim ${index + 1}`,
        category: "factual",
      })),
      verdictSummary: { answer: 50, confidence: 50 },
      qualityGates: { gate4Stats: { publishable: 0 } },
    },
    claimVerdicts,
    claimBoundaries: [],
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    qualityGates: { gate4Stats: { publishable: 0 } },
  };
}

describe("generateHtmlReport claim verdict display", () => {
  it("does not expose a truth signal for plain UNVERIFIED verdicts that only have evidence references", () => {
    const html = generateHtmlReport(makeReportInput([
      {
        claimId: "AC_01",
        verdict: "UNVERIFIED",
        truthPercentage: 58,
        confidence: 45,
        supportingEvidenceIds: ["EV_01"],
        contradictingEvidenceIds: ["EV_02"],
      },
    ]));

    expect(html).toContain("Insufficient evidence");
    expect(html).not.toContain("58% truth signal");
  });

  it("shows the truth signal and not-publishable marker only for explicit publication suppression", () => {
    const html = generateHtmlReport(makeReportInput([
      {
        claimId: "AC_01",
        verdict: "LEANING-TRUE",
        truthPercentage: 58,
        confidence: 45,
        publishable: false,
        publishabilityReason: "low_confidence_high_harm",
        supportingEvidenceIds: ["EV_01"],
      },
    ]));

    expect(html).toContain("58% truth signal");
    expect(html).toContain("Not publishable");
  });

  it("uses Limited evidence for explicitly suppressed midpoint verdicts", () => {
    const html = generateHtmlReport(makeReportInput([
      {
        claimId: "AC_01",
        verdict: "UNVERIFIED",
        truthPercentage: 50,
        confidence: 20,
        publishable: false,
        publishabilityReason: "low_confidence_high_harm",
        supportingEvidenceIds: ["EV_01"],
      },
    ]));

    expect(html).toContain("Limited evidence");
    expect(html).toContain("Not publishable");
  });
});
