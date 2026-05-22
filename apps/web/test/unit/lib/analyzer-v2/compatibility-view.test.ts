import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getResultSchemaKind,
  toJobQuickFields,
  toLegacyReportSurfaceModel,
  toResultCompatibilityView,
} from "@/lib/analyzer-v2/compatibility-view";

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

describe("analyzer-v2 result compatibility view", () => {
  const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");
  const legacyFixture = readFixture<Record<string, any>>("report-result-v1-legacy.fixture.json");

  it("detects V2 and legacy ClaimBoundary result schemas", () => {
    expect(getResultSchemaKind(v2Fixture)).toBe("v2");
    expect(getResultSchemaKind(legacyFixture)).toBe("legacy-v1");
    expect(getResultSchemaKind({ _schemaVersion: "unknown" })).toBe("unknown");
  });

  it("detects blocked V2 results without exposing public verdict metrics", () => {
    const view = toResultCompatibilityView(v2Fixture);

    expect(view).toMatchObject({
      schemaKind: "v2",
      schemaVersion: "4.0.0-cb-precutover",
      pipeline: "claimboundary-v2",
      publicCutoverStatus: "blocked_precutover",
      verdictLabel: null,
      truthPercentage: null,
      confidence: null,
      confidenceTier: null,
      selectedAtomicClaimIds: ["AC_01"],
    });
    expect(view.claims).toEqual([
      expect.objectContaining({ id: "AC_01", selected: true }),
    ]);
    expect(view.claimBoundaries).toEqual([]);
    expect(view.claimVerdicts).toEqual([]);
    expect(view.evidenceItems).toEqual([]);
    expect(view.sources).toEqual([]);
    expect(view.citedSources).toEqual([]);
    expect(view.searchQueries).toEqual([]);
    expect(view.coverageMatrix).toBeNull();
    expect(view.qualityGates).toBeNull();
    expect(view.warnings).toEqual([
      expect.objectContaining({
        type: "source_fetch_degradation",
        displaySeverity: "info",
        visibility: "admin_only",
        primaryIssueEligible: false,
        details: expect.objectContaining({
          stage: "evidence_lifecycle",
          fixtureOnly: true,
        }),
      }),
    ]);
    expect(view.primaryIssue).toEqual({
      code: "v2_public_cutover_blocked",
      message: "Analyzer V2 result is not approved for public cutover.",
    });
    expect(view.narrative.markdown).toBeNull();
  });

  it("keeps the approved V2 verdict label authoritative even when percentage would imply another legacy label", () => {
    const contradictory = approvedV2Fixture(v2Fixture);
    contradictory.verdict.label = "FALSE";
    contradictory.verdict.truthPercentage = 93;
    contradictory.verdict.confidence = 91;

    const view = toResultCompatibilityView(contradictory);

    expect(view.verdictLabel).toBe("FALSE");
    expect(view.truthPercentage).toBe(93);
    expect(view.confidence).toBe(91);
  });

  it("blocks V2 fixtures from the legacy report surface before public cutover", () => {
    const surface = toLegacyReportSurfaceModel(v2Fixture);

    expect(surface).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        schemaVersion: "4.0.0-cb-precutover",
        pipeline: "claimboundary-v2",
        runId: "fixture-run-v2",
      },
      truthPercentage: null,
      verdict: null,
      confidence: null,
    });
    expect(surface.understanding.atomicClaims).toEqual([
      expect.objectContaining({ id: "AC_01", selected: true }),
    ]);
    expect(surface.claimBoundaries).toEqual([]);
    expect(surface.claimVerdicts).toEqual([]);
    expect(surface.evidenceItems).toEqual([]);
    expect(surface.sources).toEqual([]);
    expect(surface.citedSources).toEqual([]);
    expect(surface.coverageMatrix).toBeNull();
    expect(surface.qualityGates).toBeNull();
    expect(surface.analysisWarnings[0]).toMatchObject({
      type: "source_fetch_degradation",
      displaySeverity: "info",
      details: expect.objectContaining({
        stage: "evidence_lifecycle",
        fixtureOnly: true,
      }),
    });
  });

  it("allows API-supplied blocked V2 report markdown into the admin UI surface without exposing verdict metrics", () => {
    const surface = toLegacyReportSurfaceModel(v2Fixture, {
      reportMarkdown: "# Internal V2 Draft\n\nAdmin-only draft report.",
    });

    expect(surface.truthPercentage).toBeNull();
    expect(surface.verdict).toBeNull();
    expect(surface.confidence).toBeNull();
    expect(surface.verdictNarrative.markdown).toContain("Internal V2 Draft");
  });

  it("projects approved V2 fixtures into a legacy report surface model for UI/export parity tests", () => {
    const surface = toLegacyReportSurfaceModel(approvedV2Fixture(v2Fixture));

    expect(surface).toMatchObject({
      _schemaVersion: "4.0.0-cb",
      meta: {
        schemaVersion: "4.0.0-cb",
        pipeline: "claimboundary-v2",
        publicCutoverStatus: "approved",
        runId: "fixture-run-v2",
      },
      truthPercentage: 50,
      verdict: "UNVERIFIED",
      confidence: 0,
    });
    expect(surface.claimBoundaries).toHaveLength(1);
    expect(surface.claimVerdicts).toEqual([
      expect.objectContaining({ claimId: "AC_01", truthPercentage: 50 }),
    ]);
    expect(surface.evidenceItems).toHaveLength(1);
    expect(surface.sources).toHaveLength(1);
    expect(surface.citedSources).toHaveLength(1);
    expect(surface.coverageMatrix).toEqual({
      claims: ["AC_01"],
      boundaries: ["CB_01"],
      counts: [[1]],
    });
    expect(surface.qualityGates).toMatchObject({
      summary: {
        totalEvidenceItems: 1,
        totalSources: 1,
      },
    });
    expect(surface.analysisWarnings[0]).toMatchObject({
      type: "source_fetch_degradation",
      displaySeverity: "info",
      details: expect.objectContaining({
        stage: "evidence_lifecycle",
        fixtureOnly: true,
      }),
    });
  });

  it("blocks canonical V2 quick fields before public cutover", () => {
    const contradictory = structuredClone(v2Fixture);
    contradictory.verdict.label = "FALSE";
    contradictory.verdict.truthPercentage = 93;
    contradictory.verdict.confidence = 91;

    expect(toJobQuickFields(contradictory)).toEqual({
      schemaKind: "v2",
      verdictLabel: null,
      truthPercentage: null,
      confidence: null,
      analysisIssueCode: "v2_public_cutover_blocked",
      analysisIssueMessage: "Analyzer V2 result is not approved for public cutover.",
    });
  });

  it("projects approved canonical V2 quick fields without re-deriving the verdict label", () => {
    const contradictory = approvedV2Fixture(v2Fixture);
    contradictory.verdict.label = "FALSE";
    contradictory.verdict.truthPercentage = 93;
    contradictory.verdict.confidence = 91;

    expect(toJobQuickFields(contradictory)).toEqual({
      schemaKind: "v2",
      verdictLabel: "FALSE",
      truthPercentage: 93,
      confidence: 91,
      analysisIssueCode: null,
      analysisIssueMessage: null,
    });
  });

  it("fails closed when V2 public cutover status is missing, invalid, or on the precutover schema", () => {
    const missingStatus = structuredClone(v2Fixture);
    delete missingStatus.meta.publicCutoverStatus;
    const invalidStatus = structuredClone(v2Fixture);
    invalidStatus.meta.publicCutoverStatus = "unexpected";
    const precutoverApproved = structuredClone(v2Fixture);
    precutoverApproved.meta.publicCutoverStatus = "approved";

    for (const result of [missingStatus, invalidStatus, precutoverApproved]) {
      expect(toJobQuickFields(result)).toMatchObject({
        schemaKind: "v2",
        verdictLabel: null,
        truthPercentage: null,
        confidence: null,
        analysisIssueCode: "v2_public_cutover_blocked",
      });
    }
  });

  it("maps the legacy V1 result fields for historical report reads", () => {
    const view = toResultCompatibilityView(legacyFixture, {
      reportMarkdown: "Legacy markdown report",
    });

    expect(view).toMatchObject({
      schemaKind: "legacy-v1",
      schemaVersion: "3.2.0-cb",
      pipeline: "claimboundary",
      publicCutoverStatus: null,
      verdictLabel: "UNVERIFIED",
      truthPercentage: 50,
      confidence: 0,
      confidenceTier: null,
      selectedAtomicClaimIds: [],
    });
    expect(view.claims).toEqual([
      expect.objectContaining({ id: "AC_01", selected: null }),
    ]);
    expect(view.claimVerdicts).toHaveLength(1);
    expect(view.claimBoundaries).toHaveLength(1);
    expect(view.narrative.markdown).toBe("Legacy markdown report");
  });

  it("keeps legacy quick fields and report surface aligned with existing top-level fields", () => {
    expect(toJobQuickFields(legacyFixture)).toEqual({
      schemaKind: "legacy-v1",
      verdictLabel: "UNVERIFIED",
      truthPercentage: 50,
      confidence: 0,
      analysisIssueCode: null,
      analysisIssueMessage: null,
    });

    const surface = toLegacyReportSurfaceModel(legacyFixture, {
      reportMarkdown: "Legacy markdown report",
    });
    expect(surface).toMatchObject({
      _schemaVersion: "3.2.0-cb",
      truthPercentage: 50,
      verdict: "UNVERIFIED",
      confidence: 0,
    });
    expect(surface.claimVerdicts).toHaveLength(1);
    expect(surface.claimBoundaries).toHaveLength(1);
    expect(surface.verdictNarrative.markdown).toBe("Legacy markdown report");
  });

  it("maps legacy analysis_generation_failed as the list/detail primary issue", () => {
    const failedLegacy = structuredClone(legacyFixture);
    failedLegacy.analysisWarnings = [
      {
        type: "analysis_generation_failed",
        severity: "error",
        message: "Analysis generation failed in fixture.",
      },
    ];

    const view = toResultCompatibilityView(failedLegacy);

    expect(view.primaryIssue).toEqual({
      code: "analysis_generation_failed",
      message: "Analysis generation failed in fixture.",
    });
    expect(toJobQuickFields(failedLegacy)).toMatchObject({
      analysisIssueCode: "analysis_generation_failed",
      analysisIssueMessage: "Analysis generation failed in fixture.",
    });
  });

  it("maps primary-issue-eligible V2 warnings without checking legacy type names", () => {
    const damagedV2 = structuredClone(v2Fixture);
    damagedV2.warnings = [
      {
        ...damagedV2.warnings[0],
        type: "report_damaged",
        category: "system_failure",
        severity: "error",
        displaySeverity: "error",
        visibility: "blocking",
        materialityRationale: "Fixture damaged report.",
        primaryIssueEligible: true,
        damagedReportRelation: "report_damaged",
      },
    ];

    const view = toResultCompatibilityView(damagedV2);

    expect(view.primaryIssue).toEqual({
      code: "report_damaged",
      message: "Fixture damaged report.",
    });
    expect(toJobQuickFields(damagedV2)).toMatchObject({
      verdictLabel: null,
      truthPercentage: null,
      confidence: null,
      analysisIssueCode: "report_damaged",
      analysisIssueMessage: "Fixture damaged report.",
    });
  });
});
