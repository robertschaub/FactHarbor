import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requireFromHere = createRequire(import.meta.url);
const {
  extractRunnerResultMetrics,
  getResultSchemaKind,
} = requireFromHere("../../../scripts/result-metrics-reader.js") as {
  extractRunnerResultMetrics: (result: Record<string, unknown>) => any;
  getResultSchemaKind: (result: Record<string, unknown>) => string;
};
const baselineRunner = requireFromHere("../../../scripts/baseline-runner.js") as {
  runBaseline: () => Promise<void>;
};
const regressionRunner = requireFromHere("../../scripts/regression-test.js") as {
  extractMetrics: (result: Record<string, unknown>) => any;
};

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, fileName), "utf8")) as T;
}

describe("legacy live runner result reader compatibility", () => {
  it("imports baseline and regression scripts without submitting live jobs", () => {
    expect(baselineRunner.runBaseline).toEqual(expect.any(Function));
    expect(regressionRunner.extractMetrics).toEqual(expect.any(Function));
  });

  it("extracts V2 runner metrics from canonical result fields", () => {
    const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");

    const metrics = extractRunnerResultMetrics(v2Fixture);

    expect(getResultSchemaKind(v2Fixture)).toBe("v2");
    expect(metrics).toEqual({
      verdict: "UNVERIFIED",
      truthPercentage: 50,
      confidence: 0,
      claimsCount: 1,
      contextsCount: 1,
    });
  });

  it("keeps legacy V1 runner metrics on the ClaimAssessmentBoundary fields", () => {
    const legacyFixture = readFixture<Record<string, any>>("report-result-v1-legacy.fixture.json");

    const metrics = extractRunnerResultMetrics(legacyFixture);

    expect(getResultSchemaKind(legacyFixture)).toBe("legacy-v1");
    expect(metrics).toEqual({
      verdict: "UNVERIFIED",
      truthPercentage: 50,
      confidence: 0,
      claimsCount: 1,
      contextsCount: 1,
    });
  });

  it("preserves unknown historical article field behavior", () => {
    const rawResult = {
      articleVerdict: "Mostly True",
      articleTruthPercentage: 73,
      articleVerdictConfidence: 77,
      claims: [{ id: "claim-1" }, { id: "claim-2" }],
      analysisContexts: [{ id: "ctx-1" }],
      verdict: "SHOULD_NOT_REPLACE_ARTICLE_VERDICT",
      truthPercentage: 11,
      confidence: 12,
    };

    const metrics = extractRunnerResultMetrics(rawResult);

    expect(getResultSchemaKind(rawResult)).toBe("unknown");
    expect(metrics).toEqual({
      verdict: "Mostly True",
      truthPercentage: 73,
      confidence: 77,
      claimsCount: 2,
      contextsCount: 1,
    });
  });

  it("routes regression extraction through the shared compatibility reader", () => {
    const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");

    expect(regressionRunner.extractMetrics(v2Fixture)).toEqual({
      verdict: "UNVERIFIED",
      truthPercentage: 50,
      confidence: 0,
      claimsCount: 1,
      contextsCount: 1,
    });
  });
});
