import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requireFromHere = createRequire(import.meta.url);
const {
  buildSummaryReadModel,
  extractSummary,
  getResultSchemaKind,
} = requireFromHere("../../../../../scripts/validation/extract-validation-summary.js") as {
  buildSummaryReadModel: (result: Record<string, unknown>) => any;
  extractSummary: (family: Record<string, unknown>, job: Record<string, unknown>) => any;
  getResultSchemaKind: (result: Record<string, unknown>) => string;
};

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, fileName), "utf8")) as T;
}

const FAMILY = {
  familyName: "fixture-family",
  inputValue: "Fixture input",
  inputType: "text",
};

describe("validation summary extractor compatibility reads", () => {
  it("extracts V2 summaries from canonical verdict fields and adapter fallback fields", () => {
    const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");
    v2Fixture.verdict = {
      ...v2Fixture.verdict,
      label: "MOSTLY-TRUE",
      truthPercentage: 73,
      confidence: 81,
    };
    v2Fixture.compatibility.v1.fallbackFields.truthPercentage = 12;
    v2Fixture.compatibility.v1.fallbackFields.verdict = "FALSE";
    v2Fixture.compatibility.v1.fallbackFields.confidence = 9;
    v2Fixture.qualityGates = {
      gate1Stats: { total: 99, passed: 0, filtered: 99 },
      gate4Stats: { total: 99, highConfidence: 99, insufficient: 0 },
      summary: { totalEvidenceItems: 99, totalSources: 99, searchesPerformed: 99 },
    };

    const summary = extractSummary(FAMILY, {
      id: "job-v2",
      resultJson: v2Fixture,
    });
    const readModel = buildSummaryReadModel(v2Fixture);

    expect(getResultSchemaKind(v2Fixture)).toBe("v2");
    expect(summary.article).toEqual({
      truthPercentage: 73,
      verdict: "MOSTLY-TRUE",
      confidence: 81,
    });
    expect(summary.claims).toEqual([
      expect.objectContaining({
        claimId: "AC_01",
        statement: v2Fixture.claims.atomicClaims[0].statement,
        truthPercentage: 50,
      }),
    ]);
    expect(summary.qualityGates).toMatchObject({
      gate1: { total: 1, passed: 1, filtered: 0 },
      gate4: { total: 1, highConfidence: 0, insufficient: 1 },
      summary: {
        totalEvidenceItems: 1,
        totalSources: 1,
      },
    });
    expect(summary.warnings).toEqual({
      total: 1,
      byType: { source_fetch_degradation: 1 },
      bySeverity: { error: 0, warning: 0, info: 1 },
    });
    expect(readModel.warnings[0].message).toBe(
      "Structural fixture warning: source availability was reduced, but no verdict impact is claimed by this fixture.",
    );
    expect(summary.meta.pipelineVariant).toBe("claimboundary-v2");
    expect(summary.run.promptHash).toBe("fixture-prompt-hash");
  });

  it("returns an empty V2 claim summary when adapter fallback claimVerdicts are absent", () => {
    const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");
    delete v2Fixture.compatibility.v1.fallbackFields.claimVerdicts;

    const summary = extractSummary(FAMILY, {
      id: "job-v2-no-claims",
      resultJson: v2Fixture,
    });

    expect(summary.claims).toEqual([]);
  });

  it("preserves legacy V1 summary extraction behavior", () => {
    const legacyFixture = readFixture<Record<string, any>>("report-result-v1-legacy.fixture.json");

    const summary = extractSummary(FAMILY, {
      id: "job-v1",
      resultJson: legacyFixture,
    });

    expect(getResultSchemaKind(legacyFixture)).toBe("legacy-v1");
    expect(summary.article).toEqual({
      truthPercentage: 50,
      verdict: "UNVERIFIED",
      confidence: 0,
    });
    expect(summary.claims).toEqual([
      expect.objectContaining({
        claimId: "AC_01",
        statement: "AC_01",
        truthPercentage: 50,
      }),
    ]);
    expect(summary.warnings).toEqual({
      total: 1,
      byType: { insufficient_evidence: 1 },
      bySeverity: { error: 0, warning: 1, info: 0 },
    });
  });

  it("preserves unknown raw result extraction behavior for historical batches", () => {
    const rawResult = {
      truthPercentage: 64,
      verdict: "RAW_FIXTURE",
      confidence: 71,
      meta: {
        pipeline: "custom-pipeline",
        promptContentHash: "raw-prompt-hash",
      },
      understanding: {
        atomicClaims: [
          { id: "AC_RAW", text: "Raw fixture claim" },
        ],
      },
      claimVerdicts: [
        {
          claimId: "AC_RAW",
          truthPercentage: 64,
          verdict: "RAW_FIXTURE",
          confidence: 71,
          confidenceTier: "high",
        },
      ],
      analysisWarnings: [
        { type: "analysis_generation_failed", severity: "error", message: "Raw warning" },
      ],
      qualityGates: {
        gate1Stats: { total: 1, passed: 1, filtered: 0 },
        gate4Stats: { total: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, insufficient: 0 },
        summary: { totalEvidenceItems: 3, totalSources: 2, searchesPerformed: 1 },
      },
    };

    const summary = extractSummary(FAMILY, {
      id: "job-raw",
      resultJson: rawResult,
    });

    expect(getResultSchemaKind(rawResult)).toBe("unknown");
    expect(summary.article).toEqual({
      truthPercentage: 64,
      verdict: "RAW_FIXTURE",
      confidence: 71,
    });
    expect(summary.claims).toEqual([
      expect.objectContaining({
        claimId: "AC_RAW",
        statement: "Raw fixture claim",
        confidenceTier: "high",
      }),
    ]);
    expect(summary.warnings).toEqual({
      total: 1,
      byType: { analysis_generation_failed: 1 },
      bySeverity: { error: 1, warning: 0, info: 0 },
    });
    expect(summary.meta.pipelineVariant).toBe("custom-pipeline");
    expect(summary.run.promptHash).toBe("raw-prompt-hash");
  });
});
