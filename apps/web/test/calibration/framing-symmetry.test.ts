/**
 * Framing Symmetry Calibration Test Suite
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
import type {
  BiasPair,
  BiasFixtures,
  CalibrationRunResult,
} from "@/lib/calibration/types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CANARY_TIMEOUT_MS = 1_800_000; // 30 minutes for canary mode (1 pair × ~10 min/side)
const QUICK_TIMEOUT_MS = 3_600_000; // 60 minutes for quick mode (3 pairs × ~10 min/pair observed)
const FULL_TIMEOUT_MS = 21_600_000; // 360 minutes for full mode (10 pairs × ~10 min/pair observed, +50% buffer)

/** Default canary pair — symmetric phrasing, English, factual, highest baseline skew (most sensitive). */
const DEFAULT_CANARY_PAIR_ID = "immigration-impact-en";

/**
 * Baseline v1 config hashes (short form) — for drift detection.
 * Source: Calibration_Baseline_v1.md §1, runs from 2026-02-20.
 */
const BASELINE_V1_CONFIG_HASHES = {
  pipeline: "07d578ea",
  search: "2d10e611",
  calculation: "a79f8349",
} as const;

/**
 * Canary pass gate — objective go/no-go criteria for proceeding to full gate.
 * If any check fails, investigate before spending ~$3-5 on a full run.
 */
const CANARY_PASS_GATE = {
  /** Sanity ceiling — skew above this suggests a broken run, not just bias. */
  maxAbsoluteSkew: 70,
  /** Both sides must find meaningful evidence. */
  minEvidenceItemsPerSide: 3,
} as const;

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

function loadBiasFixtures(): BiasFixtures {
  const webRoot = path.resolve(__dirname, "../..");
  const fixturesPath = path.join(webRoot, "test", "fixtures", "framing-symmetry-pairs.json");

  if (!fs.existsSync(fixturesPath)) {
    throw new Error(`Missing fixtures file: ${fixturesPath}`);
  }

  return JSON.parse(
    fs.readFileSync(fixturesPath, "utf-8"),
  ) as BiasFixtures;
}

function safeUnlink(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function writeRunArtifacts(
  result: CalibrationRunResult,
  jsonPath: string,
  htmlPath: string,
): void {
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  fs.writeFileSync(htmlPath, generateCalibrationReport(result));
}

function resolveRunIntent(mode: "quick" | "full" | "targeted"): "gate" | "smoke" {
  const envIntent = process.env.FH_CALIBRATION_RUN_INTENT;
  if (envIntent === "gate" || envIntent === "smoke") return envIntent;
  // Default policy: full/targeted are decision-grade gate runs; quick is smoke.
  return mode === "quick" ? "smoke" : "gate";
}

/**
 * Preflight config check — runs before expensive calibration to catch config issues early.
 *
 * - All runs: log config hashes, provider overrides, and flag drift from Baseline v1 for manual review
 */
async function preflightConfigCheck(intent: "gate" | "smoke"): Promise<void> {
  const { loadPipelineConfig, loadSearchConfig, loadCalcConfig } =
    await import("@/lib/config-loader");

  const [pipelineResult, searchResult, calcResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadSearchConfig("default"),
    loadCalcConfig("default"),
  ]);

  const pipeline = pipelineResult.config as Record<string, unknown>;

  // Log provider overrides so the operator knows what config is being tested
  const providers = pipeline.debateModelProviders as Record<string, string> | undefined;
  const hasProviderOverrides = providers && Object.values(providers).some(v => v != null);
  if (hasProviderOverrides) {
    console.log(`[Preflight] debateModelProviders: ${JSON.stringify(providers)}`);
  }

  // Log config hashes for comparison with Baseline v1
  const hashes = {
    pipeline: pipelineResult.contentHash.slice(0, 8),
    search: searchResult.contentHash.slice(0, 8),
    calculation: calcResult.contentHash.slice(0, 8),
  };

  const drifted = Object.entries(hashes).filter(
    ([key]) =>
      hashes[key as keyof typeof hashes] !==
      BASELINE_V1_CONFIG_HASHES[key as keyof typeof BASELINE_V1_CONFIG_HASHES],
  );

  console.log(`[Preflight] debateModelProviders: ${JSON.stringify(providers ?? {})}`);
  console.log(
    `[Preflight] Config hashes: pipeline=${hashes.pipeline}, search=${hashes.search}, calc=${hashes.calculation}`,
  );

  if (drifted.length > 0) {
    const details = drifted
      .map(
        ([k]) =>
          `${k}=${hashes[k as keyof typeof hashes]} (v1 was ${BASELINE_V1_CONFIG_HASHES[k as keyof typeof BASELINE_V1_CONFIG_HASHES]})`,
      )
      .join(", ");
    console.warn(`[Preflight] Config drift from Baseline v1: ${details}`);
  } else {
    console.log(`[Preflight] All config hashes match Baseline v1`);
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Framing Symmetry Calibration", () => {
  let pairs: BiasPair[];
  let fixtureVersion: string;
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

    const fixtures = loadBiasFixtures();
    pairs = fixtures.pairs;
    fixtureVersion = fixtures.version;

    // Skip on CI
    if (process.env.CI === "true") {
      console.warn(
        "[Symmetry Calibration] Skipping on CI — requires real LLM calls",
      );
      testsEnabled = false;
      return;
    }

    // Check API keys
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;
    if (!hasClaude) {
      console.warn(
        "[Symmetry Calibration] No ANTHROPIC_API_KEY found, tests will be skipped",
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
    console.log(`[Symmetry Calibration] Loaded ${pairs.length} test pairs`);

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
        console.log("[Symmetry Calibration] Skipping — no API keys");
        return;
      }

      const quickRunIntent = resolveRunIntent("quick");
      await preflightConfigCheck(quickRunIntent);

      console.log("[Symmetry Calibration] Starting quick mode run...");
      const quickPartialJsonPath = path.join(
        outputDir,
        `${quickRunIntent}-quick-latest.partial.json`,
      );
      const quickPartialHtmlPath = path.join(
        outputDir,
        `${quickRunIntent}-quick-latest.partial.html`,
      );
      safeUnlink(quickPartialJsonPath);
      safeUnlink(quickPartialHtmlPath);

      const result = await runCalibration(pairs, {
        mode: "quick",
        runIntent: quickRunIntent,
        fixtureVersion,
        onProgress: (msg) => console.log(`  [Calibration] ${msg}`),
        onCheckpoint: (partialResult) => {
          writeRunArtifacts(
            partialResult,
            quickPartialJsonPath,
            quickPartialHtmlPath,
          );
        },
      });
      const runIntent = result.metadata.runIntent ?? quickRunIntent;

      // Write JSON results
      const timestamp = result.timestamp.replace(/[:.]/g, "-");
      const jsonPath = path.join(
        outputDir,
        `${runIntent}-quick-${timestamp}.json`,
      );
      const htmlPath = path.join(
        outputDir,
        `${runIntent}-quick-${timestamp}.html`,
      );
      writeRunArtifacts(result, jsonPath, htmlPath);
      safeUnlink(quickPartialJsonPath);
      safeUnlink(quickPartialHtmlPath);
      console.log(`[Symmetry Calibration] JSON results: ${jsonPath}`);
      console.log(`[Symmetry Calibration] HTML report: ${htmlPath}`);

      // Log summary
      const am = result.aggregateMetrics;
      console.log(`\n[Symmetry Calibration] === RESULTS ===`);
      console.log(`  Pairs completed: ${am.completedPairs}/${am.totalPairs}`);
      console.log(
        `  Mean directional skew: ${am.meanDirectionalSkew.toFixed(1)} pp (all pairs, raw)`,
      );
      console.log(
        `  Mean absolute skew: ${am.meanAbsoluteSkew.toFixed(1)} pp (all pairs, raw)`,
      );
      console.log(
        `  Diagnostic gate: ${am.diagnosticGatePassed ? "PASS" : "FAIL"} (${am.diagnosticPairCount} bias-diagnostic pairs)`,
      );
      console.log(
        `  Operational gate: ${am.operationalGatePassed ? "PASS" : "FAIL"} (execution reliability)`,
      );
      console.log(
        `  Diagnostic mean |adjustedSkew|: ${am.diagnosticMeanAdjustedSkew.toFixed(1)} pp (target: ≤${result.thresholds.maxDiagnosticMeanSkew})`,
      );
      console.log(
        `  Pass rate: ${(am.passRate * 100).toFixed(0)}% all / ${(am.diagnosticPassRate * 100).toFixed(0)}% diagnostic`,
      );
      console.log(`  Overall (compat): ${am.overallPassed ? "PASS" : "FAIL"}`);
      console.log(
        `  Duration: ${(am.totalDurationMs / 1000).toFixed(0)}s`,
      );

      // Per-pair summary
      for (const pr of result.pairResults) {
        if (pr.status !== "completed") {
          console.log(`  ${pr.pairId}: FAILED (${pr.error})`);
        } else {
          const m = pr.metrics;
          const cat = pr.pair.pairCategory === "accuracy-control" ? " [ctrl]" : "";
          console.log(
            `  ${pr.pairId}${cat}: L=${pr.left.truthPercentage.toFixed(0)}% R=${pr.right.truthPercentage.toFixed(0)}% skew=${m.directionalSkew.toFixed(1)} adj=${m.adjustedSkew.toFixed(1)} ${m.passed ? "✓" : "✗"}`,
          );
        }
      }

      // Assertions — operational integrity only
      expect(result.aggregateMetrics.completedPairs).toBeGreaterThan(0);
      expect(
        result.aggregateMetrics.completedPairs + result.aggregateMetrics.failedPairs,
      ).toBe(result.aggregateMetrics.totalPairs);
    },
    QUICK_TIMEOUT_MS,
  );

  it(
    "full mode: all pairs including multilingual variants",
    async () => {
      if (!testsEnabled) {
        console.log("[Symmetry Calibration] Skipping — no API keys");
        return;
      }

      const fullRunIntent = resolveRunIntent("full");
      await preflightConfigCheck(fullRunIntent);

      console.log("[Symmetry Calibration] Starting full mode run...");
      const fullPartialJsonPath = path.join(
        outputDir,
        `${fullRunIntent}-full-latest.partial.json`,
      );
      const fullPartialHtmlPath = path.join(
        outputDir,
        `${fullRunIntent}-full-latest.partial.html`,
      );
      safeUnlink(fullPartialJsonPath);
      safeUnlink(fullPartialHtmlPath);

      const result = await runCalibration(pairs, {
        mode: "full",
        runIntent: fullRunIntent,
        fixtureVersion,
        onProgress: (msg) => console.log(`  [Calibration] ${msg}`),
        onCheckpoint: (partialResult) => {
          writeRunArtifacts(
            partialResult,
            fullPartialJsonPath,
            fullPartialHtmlPath,
          );
        },
      });
      const runIntent = result.metadata.runIntent ?? fullRunIntent;

      // Write results
      const timestamp = result.timestamp.replace(/[:.]/g, "-");
      const jsonPath = path.join(
        outputDir,
        `${runIntent}-full-${timestamp}.json`,
      );
      const htmlPath = path.join(
        outputDir,
        `${runIntent}-full-${timestamp}.html`,
      );
      writeRunArtifacts(result, jsonPath, htmlPath);
      safeUnlink(fullPartialJsonPath);
      safeUnlink(fullPartialHtmlPath);

      console.log(`[Symmetry Calibration] Full results: ${jsonPath}`);
      console.log(`[Symmetry Calibration] Full HTML report: ${htmlPath}`);

      // Log per-domain and per-language breakdown
      const am = result.aggregateMetrics;
      console.log(`\n[Symmetry Calibration] === FULL RESULTS ===`);
      console.log(
        `  Operational gate: ${am.operationalGatePassed ? "PASS" : "FAIL"}`,
      );
      console.log(
        `  Diagnostic gate: ${am.diagnosticGatePassed ? "PASS" : "FAIL"} (${am.diagnosticPairCount} bias-diagnostic pairs)`,
      );
      console.log(
        `  Diagnostic mean |adjustedSkew|: ${am.diagnosticMeanAdjustedSkew.toFixed(1)} pp`,
      );
      console.log(
        `  Mean directional skew: ${am.meanDirectionalSkew.toFixed(1)} pp (all pairs, raw)`,
      );
      console.log(`  Overall (compat): ${am.overallPassed ? "PASS" : "FAIL"}`);

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

  it(
    "canary mode: single pair smoke test",
    async () => {
      if (!testsEnabled) {
        console.log("[Symmetry Calibration] Skipping — no API keys");
        return;
      }

      await preflightConfigCheck("smoke");

      const canaryPairId =
        process.env.FH_CALIBRATION_CANARY_PAIR ?? DEFAULT_CANARY_PAIR_ID;

      console.log(
        `[Symmetry Calibration] Starting canary mode (pair: ${canaryPairId})...`,
      );

      const result = await runCalibration(pairs, {
        mode: "targeted",
        runIntent: "smoke",
        targetPairId: canaryPairId,
        fixtureVersion,
        onProgress: (msg) => console.log(`  [Calibration] ${msg}`),
      });

      // Write JSON results
      const timestamp = result.timestamp.replace(/[:.]/g, "-");
      const jsonPath = path.join(
        outputDir,
        `canary-${canaryPairId}-${timestamp}.json`,
      );
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
      console.log(`[Symmetry Calibration] JSON results: ${jsonPath}`);

      // Generate HTML report
      const html = generateCalibrationReport(result);
      const htmlPath = path.join(
        outputDir,
        `canary-${canaryPairId}-${timestamp}.html`,
      );
      fs.writeFileSync(htmlPath, html);
      console.log(`[Symmetry Calibration] HTML report: ${htmlPath}`);

      // Log summary
      expect(result.pairResults).toHaveLength(1);
      const pr = result.pairResults[0];
      if (pr.status === "completed") {
        const m = pr.metrics;
        const cat = pr.pair.pairCategory === "accuracy-control" ? " [accuracy-control]" : " [bias-diagnostic]";
        console.log(`\n[Symmetry Calibration] === CANARY RESULT ===`);
        console.log(`  Pair: ${pr.pairId}${cat}`);
        console.log(
          `  Left: ${pr.left.truthPercentage.toFixed(0)}% (${pr.left.verdict})`,
        );
        console.log(
          `  Right: ${pr.right.truthPercentage.toFixed(0)}% (${pr.right.verdict})`,
        );
        console.log(
          `  Skew: ${m.directionalSkew.toFixed(1)} pp (raw) | adjustedSkew: ${m.adjustedSkew.toFixed(1)} pp | ${m.passed ? "PASS" : "FAIL"}`,
        );
        if (pr.pair.expectedSkew !== "neutral") {
          console.log(
            `  Expected: ${pr.pair.expectedSkew} ${pr.pair.expectedAsymmetry ?? 0} pp`,
          );
        }
        console.log(
          `  Evidence balance: L=${pr.left.evidencePool.supportRatio.toFixed(2)} R=${pr.right.evidencePool.supportRatio.toFixed(2)}`,
        );
        console.log(
          `  Duration: ${((pr.left.durationMs + pr.right.durationMs) / 1000).toFixed(0)}s`,
        );

        // === CANARY PASS GATE ===
        // Objective go/no-go for proceeding to full gate run.
        const hasB1Trace = (side: typeof pr.left): boolean => {
          const roles = side.runtimeRoleModels;
          if (!roles || typeof roles !== "object") return false;
          return Object.values(roles).some(
            (r) => typeof r === "object" && r !== null && (r as { callCount?: number }).callCount !== undefined && (r as { callCount: number }).callCount > 0,
          );
        };

        const gateChecks = {
          completed: true,
          noFailedPairs: result.aggregateMetrics.failedPairs === 0,
          noCriticalWarnings:
            !pr.left.warnings.some((w) => w.severity === "critical") &&
            !pr.right.warnings.some((w) => w.severity === "critical"),
          skewBelowCeiling:
            m.absoluteSkew <= CANARY_PASS_GATE.maxAbsoluteSkew,
          leftHasEvidence:
            pr.left.evidencePool.totalItems >=
            CANARY_PASS_GATE.minEvidenceItemsPerSide,
          rightHasEvidence:
            pr.right.evidencePool.totalItems >=
            CANARY_PASS_GATE.minEvidenceItemsPerSide,
          b1TracePresent: hasB1Trace(pr.left) && hasB1Trace(pr.right),
        };

        const allPassed = Object.values(gateChecks).every((v) => v === true);
        console.log(
          `\n[Canary Gate] ${allPassed ? "PASS → proceed to full gate" : "FAIL → investigate before full gate"}`,
        );
        for (const [check, passed] of Object.entries(gateChecks)) {
          console.log(`  ${passed ? "✓" : "✗"} ${check}`);
        }

        // Hard enforcement unless FH_CANARY_GATE_SOFT=true (for local debugging)
        if (process.env.FH_CANARY_GATE_SOFT !== "true") {
          expect(allPassed).toBe(true);
        }
      } else {
        console.log(
          `[Symmetry Calibration] Canary FAILED: ${pr.error}`,
        );
      }

      expect(result.aggregateMetrics.completedPairs).toBe(1);
    },
    CANARY_TIMEOUT_MS,
  );
});
