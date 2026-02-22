/**
 * Political Bias Calibration Test Suite
 *
 * Runs mirrored political claim pairs through the CB pipeline and measures
 * directional skew. An unbiased system should produce similar verdicts
 * for both sides of each pair.
 *
 * EXPENSIVE: Each pair requires 2 full pipeline runs (~$1-2 per pair).
 * Excluded from `npm test`. Run with: npm -w apps/web run test:calibration
 *
 * @module calibration/political-bias.test
 */

import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCalibration } from "@/lib/calibration/runner";
import { generateCalibrationReport } from "@/lib/calibration/report-generator";
import type { BiasPair, BiasFixtures } from "@/lib/calibration/types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const QUICK_TIMEOUT_MS = 3_600_000; // 60 minutes for quick mode (3 pairs × ~10 min/pair observed)
const FULL_TIMEOUT_MS = 21_600_000; // 360 minutes for full mode (10 pairs × ~10 min/pair observed, +50% buffer)

// ============================================================================
// HELPERS
// ============================================================================

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

function loadBiasPairs(): BiasPair[] {
  const webRoot = path.resolve(__dirname, "../..");
  const fixturesPath = path.join(webRoot, "test", "fixtures", "bias-pairs.json");

  if (!fs.existsSync(fixturesPath)) {
    throw new Error(`Missing fixtures file: ${fixturesPath}`);
  }

  const fixtures = JSON.parse(
    fs.readFileSync(fixturesPath, "utf-8"),
  ) as BiasFixtures;
  return fixtures.pairs;
}

function resolveRunIntent(mode: "quick" | "full" | "targeted"): "gate" | "smoke" {
  const envIntent = process.env.FH_CALIBRATION_RUN_INTENT;
  if (envIntent === "gate" || envIntent === "smoke") return envIntent;
  // Default policy: full/targeted are decision-grade gate runs; quick is smoke.
  return mode === "quick" ? "smoke" : "gate";
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Political Bias Calibration", () => {
  let pairs: BiasPair[];
  let outputDir: string;
  let testsEnabled = true;
  let previousDeterministic: string | undefined;

  beforeAll(() => {
    const webRoot = path.resolve(__dirname, "../..");
    const envPath = path.join(webRoot, ".env.local");
    loadEnvFile(envPath);

    // Enable deterministic mode for reproducibility
    previousDeterministic = process.env.FH_DETERMINISTIC;
    process.env.FH_DETERMINISTIC = "true";

    pairs = loadBiasPairs();

    // Skip on CI
    if (process.env.CI === "true") {
      console.warn(
        "[Bias Calibration] Skipping on CI — requires real LLM calls",
      );
      testsEnabled = false;
      return;
    }

    // Check API keys
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;
    if (!hasClaude) {
      console.warn(
        "[Bias Calibration] No ANTHROPIC_API_KEY found, tests will be skipped",
      );
      testsEnabled = false;
    }

    outputDir = path.join(webRoot, "test", "output", "bias");
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    if (previousDeterministic === undefined) {
      delete process.env.FH_DETERMINISTIC;
    } else {
      process.env.FH_DETERMINISTIC = previousDeterministic;
    }
  });

  it("should load bias test pairs", () => {
    expect(pairs.length).toBeGreaterThanOrEqual(5);
    console.log(`[Bias Calibration] Loaded ${pairs.length} test pairs`);

    // Validate pair structure
    for (const pair of pairs) {
      expect(pair.id).toBeTruthy();
      expect(pair.leftClaim).toBeTruthy();
      expect(pair.rightClaim).toBeTruthy();
      expect(["factual", "evaluative"]).toContain(pair.category);
      expect(["neutral", "left-favored", "right-favored"]).toContain(
        pair.expectedSkew,
      );
    }
  });

  it(
    "quick mode: representative pairs pass bias thresholds",
    async () => {
      if (!testsEnabled) {
        console.log("[Bias Calibration] Skipping — no API keys");
        return;
      }

      console.log("[Bias Calibration] Starting quick mode run...");

      const result = await runCalibration(pairs, {
        mode: "quick",
        runIntent: resolveRunIntent("quick"),
        fixtureVersion: "1.0.0",
        onProgress: (msg) => console.log(`  [Calibration] ${msg}`),
      });
      const runIntent = result.metadata.runIntent ?? resolveRunIntent("quick");

      // Write JSON results
      const timestamp = result.timestamp.replace(/[:.]/g, "-");
      const jsonPath = path.join(
        outputDir,
        `${runIntent}-quick-${timestamp}.json`,
      );
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
      console.log(`[Bias Calibration] JSON results: ${jsonPath}`);

      // Generate HTML report
      const html = generateCalibrationReport(result);
      const htmlPath = path.join(
        outputDir,
        `${runIntent}-quick-${timestamp}.html`,
      );
      fs.writeFileSync(htmlPath, html);
      console.log(`[Bias Calibration] HTML report: ${htmlPath}`);

      // Log summary
      const am = result.aggregateMetrics;
      console.log(`\n[Bias Calibration] === RESULTS ===`);
      console.log(`  Pairs completed: ${am.completedPairs}/${am.totalPairs}`);
      console.log(
        `  Mean directional skew: ${am.meanDirectionalSkew.toFixed(1)} pp (target: ±${result.thresholds.maxMeanDirectionalSkew})`,
      );
      console.log(
        `  Mean absolute skew: ${am.meanAbsoluteSkew.toFixed(1)} pp (target: ≤${result.thresholds.maxMeanAbsoluteSkew})`,
      );
      console.log(
        `  Max absolute skew: ${am.maxAbsoluteSkew.toFixed(1)} pp (target: ≤${result.thresholds.maxPairSkew})`,
      );
      console.log(
        `  Pass rate: ${(am.passRate * 100).toFixed(0)}% (target: ≥${result.thresholds.minPassRate * 100}%)`,
      );
      console.log(`  Overall: ${am.overallPassed ? "PASS" : "FAIL"}`);
      console.log(
        `  Duration: ${(am.totalDurationMs / 1000).toFixed(0)}s`,
      );

      // Per-pair summary
      for (const pr of result.pairResults) {
        if (pr.status !== "completed") {
          console.log(`  ${pr.pairId}: FAILED (${pr.error})`);
        } else {
          const m = pr.metrics;
          console.log(
            `  ${pr.pairId}: L=${pr.left.truthPercentage.toFixed(0)}% R=${pr.right.truthPercentage.toFixed(0)}% skew=${m.directionalSkew.toFixed(1)} ${m.passed ? "✓" : "✗"}`,
          );
        }
      }

      // Assertions
      expect(result.aggregateMetrics.completedPairs).toBeGreaterThan(0);
      expect(
        result.aggregateMetrics.completedPairs + result.aggregateMetrics.failedPairs,
      ).toBe(result.aggregateMetrics.totalPairs);
      expect(
        Math.abs(result.aggregateMetrics.meanDirectionalSkew),
      ).toBeLessThanOrEqual(result.thresholds.maxMeanDirectionalSkew);
      expect(result.aggregateMetrics.meanAbsoluteSkew).toBeLessThanOrEqual(
        result.thresholds.maxMeanAbsoluteSkew,
      );
    },
    QUICK_TIMEOUT_MS,
  );

  it(
    "full mode: all pairs including multilingual variants",
    async () => {
      if (!testsEnabled) {
        console.log("[Bias Calibration] Skipping — no API keys");
        return;
      }

      console.log("[Bias Calibration] Starting full mode run...");

      const result = await runCalibration(pairs, {
        mode: "full",
        runIntent: resolveRunIntent("full"),
        fixtureVersion: "1.0.0",
        onProgress: (msg) => console.log(`  [Calibration] ${msg}`),
      });
      const runIntent = result.metadata.runIntent ?? resolveRunIntent("full");

      // Write results
      const timestamp = result.timestamp.replace(/[:.]/g, "-");
      const jsonPath = path.join(
        outputDir,
        `${runIntent}-full-${timestamp}.json`,
      );
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

      const html = generateCalibrationReport(result);
      const htmlPath = path.join(
        outputDir,
        `${runIntent}-full-${timestamp}.html`,
      );
      fs.writeFileSync(htmlPath, html);

      console.log(`[Bias Calibration] Full results: ${jsonPath}`);
      console.log(`[Bias Calibration] Full HTML report: ${htmlPath}`);

      // Log per-domain and per-language breakdown
      const am = result.aggregateMetrics;
      console.log(`\n[Bias Calibration] === FULL RESULTS ===`);
      console.log(`  Overall: ${am.overallPassed ? "PASS" : "FAIL"}`);
      console.log(
        `  Mean directional skew: ${am.meanDirectionalSkew.toFixed(1)} pp`,
      );

      console.log(`\n  Per-domain:`);
      for (const [domain, stats] of Object.entries(am.perDomain)) {
        console.log(
          `    ${domain}: ${stats.pairCount} pairs, mean=${stats.meanSkew.toFixed(1)}, max=${stats.maxSkew.toFixed(1)}`,
        );
      }

      console.log(`\n  Per-language:`);
      for (const [lang, stats] of Object.entries(am.perLanguage)) {
        console.log(
          `    ${lang}: ${stats.pairCount} pairs, mean=${stats.meanSkew.toFixed(1)}, max=${stats.maxSkew.toFixed(1)}`,
        );
      }

      console.log(`\n  Stage bias prevalence:`);
      console.log(
        `    Extraction: ${am.stagePrevalence.extractionBiasCount}/${am.completedPairs}`,
      );
      console.log(
        `    Research: ${am.stagePrevalence.researchBiasCount}/${am.completedPairs}`,
      );
      console.log(
        `    Evidence: ${am.stagePrevalence.evidenceBiasCount}/${am.completedPairs}`,
      );
      console.log(
        `    Verdict: ${am.stagePrevalence.verdictBiasCount}/${am.completedPairs}`,
      );

      // Assertions
      expect(result.aggregateMetrics.totalPairs).toBe(pairs.length);
      expect(
        result.aggregateMetrics.completedPairs + result.aggregateMetrics.failedPairs,
      ).toBe(result.aggregateMetrics.totalPairs);
      expect(result.aggregateMetrics.completedPairs).toBeGreaterThan(0);
    },
    FULL_TIMEOUT_MS,
  );
});
