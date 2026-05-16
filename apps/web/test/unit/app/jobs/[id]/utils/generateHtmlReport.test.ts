import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateHtmlReport } from "@/app/jobs/[id]/utils/generateHtmlReport";
import { toLegacyReportSurfaceModel } from "@/lib/analyzer-v2/compatibility-view";

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, fileName), "utf8")) as T;
}

function approvedV2Fixture(source: Record<string, any>): Record<string, any> {
  const approved = structuredClone(source);
  approved._schemaVersion = "4.0.0-cb";
  approved.meta.schemaVersion = "4.0.0-cb";
  approved.meta.publicCutoverStatus = "approved";
  return approved;
}

describe("generateHtmlReport analyzer-v2 compatibility", () => {
  it("does not emit public verdict metadata for blocked V2 results", () => {
    const v2Fixture = readFixture<Record<string, unknown>>("report-result-v2.fixture.json");
    const surface = toLegacyReportSurfaceModel(v2Fixture);

    const html = generateHtmlReport({
      job: {
        jobId: "fixture-job-v2",
        status: "SUCCEEDED",
        inputValue: "Structural V2 fixture input",
        createdUtc: "2026-05-13T00:00:00.000Z",
        updatedUtc: "2026-05-13T00:01:00.000Z",
      },
      result: surface,
      claimVerdicts: surface.claimVerdicts as any[],
      claimBoundaries: surface.claimBoundaries as any[],
      evidenceItems: surface.evidenceItems as any[],
      sources: surface.citedSources as any[],
      allSources: surface.sources as any[],
      searchQueries: surface.searchQueries as any[],
      qualityGates: surface.qualityGates,
    });

    expect(html).not.toContain('meta name="fh:verdict"');
    expect(html).not.toContain('meta name="fh:truth" content="50"');
    expect(html).not.toContain('meta name="fh:confidence" content="0"');
    expect(html).not.toContain("Structural V2 compatibility fixture only.");
    expect(html).not.toContain("Cited Sources");
  });

  it("renders approved V2 results through the legacy report surface model", () => {
    const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");
    const surface = toLegacyReportSurfaceModel(approvedV2Fixture(v2Fixture));

    const html = generateHtmlReport({
      job: {
        jobId: "fixture-job-v2",
        status: "SUCCEEDED",
        inputValue: "Structural V2 fixture input",
        createdUtc: "2026-05-13T00:00:00.000Z",
        updatedUtc: "2026-05-13T00:01:00.000Z",
      },
      result: surface,
      claimVerdicts: surface.claimVerdicts as any[],
      claimBoundaries: surface.claimBoundaries as any[],
      evidenceItems: surface.evidenceItems as any[],
      sources: surface.citedSources as any[],
      allSources: surface.sources as any[],
      searchQueries: surface.searchQueries as any[],
      qualityGates: surface.qualityGates,
    });

    expect(html).toContain('meta name="fh:verdict" content="UNVERIFIED"');
    expect(html).toContain('meta name="fh:truth" content="50"');
    expect(html).toContain("ClaimAssessmentBoundaries");
    expect(html).toContain("Structural V2 compatibility fixture only.");
    expect(html).toContain("Cited Sources");
  });
});
