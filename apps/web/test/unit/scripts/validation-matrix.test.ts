import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requireFromHere = createRequire(import.meta.url);
const {
  extractMetrics,
  getResultSchemaKind,
} = requireFromHere("../../../../../scripts/run-validation-matrix.js") as {
  extractMetrics: (result: Record<string, unknown>) => any;
  getResultSchemaKind: (result: Record<string, unknown>) => string;
};

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, fileName), "utf8")) as T;
}

describe("validation matrix result metrics compatibility reads", () => {
  it("extracts V2 matrix metrics from canonical result fields", () => {
    const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");
    v2Fixture.verdict = {
      ...v2Fixture.verdict,
      label: "MOSTLY-TRUE",
      truthPercentage: 73,
      confidence: 81,
    };

    const metrics = extractMetrics(v2Fixture);

    expect(getResultSchemaKind(v2Fixture)).toBe("v2");
    expect(metrics).toMatchObject({
      answer: 73,
      confidence: 81,
      contexts: 1,
      sources: 1,
      fetchedSources: 1,
      domains: ["example.test"],
      verdict: "MOSTLY-TRUE",
    });
    expect(metrics.analysisWarnings).toEqual([
      expect.objectContaining({
        type: "source_fetch_degradation",
        severity: "info",
        message: expect.stringContaining("source availability"),
      }),
    ]);
  });

  it("keeps legacy V1 matrix metrics on the old verdictSummary path", () => {
    const legacyFixture = readFixture<Record<string, any>>("report-result-v1-legacy.fixture.json");

    const metrics = extractMetrics(legacyFixture);

    expect(getResultSchemaKind(legacyFixture)).toBe("legacy-v1");
    expect(metrics).toMatchObject({
      answer: undefined,
      confidence: undefined,
      contexts: 0,
      sources: 0,
      fetchedSources: 0,
      domains: [],
      verdict: undefined,
    });
    expect(metrics.analysisWarnings).toEqual([
      {
        type: "insufficient_evidence",
        severity: "warning",
        message: "Structural legacy fixture warning only.",
      },
    ]);
  });

  it("preserves unknown raw matrix metrics behavior", () => {
    const rawResult = {
      verdictSummary: {
        truthPercentage: 64,
        answer: 63,
        confidence: 71,
        displayText: "RAW_FIXTURE",
      },
      analysisContexts: [{ id: "ctx-1" }, { id: "ctx-2" }],
      sources: [
        { url: "https://example.test/source-a", fetchSuccess: true },
        { url: "https://not-fetched.test/source-b", fetchSuccess: false },
      ],
      analysisWarnings: [
        { type: "search_provider_error", severity: "error", message: "Raw warning" },
      ],
    };

    const metrics = extractMetrics(rawResult);

    expect(getResultSchemaKind(rawResult)).toBe("unknown");
    expect(metrics).toMatchObject({
      answer: 64,
      confidence: 71,
      contexts: 2,
      sources: 2,
      fetchedSources: 1,
      domains: ["example.test"],
      verdict: "RAW_FIXTURE",
    });
    expect(metrics.analysisWarnings).toEqual(rawResult.analysisWarnings);
  });
});
