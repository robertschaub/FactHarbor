/**
 * Input Neutrality Test Suite
 *
 * Verifies that question forms ("Was X fair?") and statement forms ("X was fair")
 * produce equivalent verdicts within the allowed divergence threshold.
 *
 * Target: Average absolute divergence ≤ 4 percentage points
 *
 * @module input-neutrality.test
 */

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { runFactHarborAnalysis } from "@/lib/analyzer";

// ============================================================================
// TYPES
// ============================================================================

interface NeutralityPair {
  id: string;
  question: string;
  statement: string;
  category: string;
}

interface NeutralityConfig {
  pairs: NeutralityPair[];
}

interface VerdictResult {
  truthPercentage: number;
  claimCount: number;
  scopeCount: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_DIVERGENCE_POINTS = 4;
const TEST_TIMEOUT_MS = 180_000; // 3 minutes per test
const AGGREGATE_TIMEOUT_MS = 600_000; // 10 minutes for aggregate tests

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

function loadNeutralityPairs(): NeutralityPair[] {
  const webRoot = path.resolve(__dirname, "../../..");
  const fixturesPath = path.join(webRoot, "test", "fixtures", "neutrality-pairs.json");

  if (!fs.existsSync(fixturesPath)) {
    throw new Error(`Missing fixtures file: ${fixturesPath}`);
  }

  const config = JSON.parse(fs.readFileSync(fixturesPath, "utf-8")) as NeutralityConfig;
  return config.pairs;
}

/**
 * Extract aggregate truth percentage from analysis result.
 * Uses the verdict summary's overall truth percentage if available,
 * otherwise calculates from individual claim verdicts.
 */
function extractVerdictResult(result: Awaited<ReturnType<typeof runFactHarborAnalysis>>): VerdictResult {
  // Try to get from verdictSummary first
  const verdictSummary = result.resultJson.verdictSummary;
  if (verdictSummary?.overallTruthPercentage !== undefined) {
    return {
      truthPercentage: verdictSummary.overallTruthPercentage,
      claimCount: result.resultJson.claimVerdicts?.length || 0,
      scopeCount: (result.resultJson.understanding?.analysisContexts?.length ??
        result.resultJson.understanding?.distinctProceedings?.length) ||
        1,
    };
  }

  // Fall back to averaging claim verdicts
  const verdicts = result.resultJson.claimVerdicts || [];
  if (verdicts.length === 0) {
    return { truthPercentage: 50, claimCount: 0, scopeCount: 1 }; // Default to neutral
  }

  const sum = verdicts.reduce((acc, v) => acc + (v.truthPercentage || 50), 0);
  return {
    truthPercentage: sum / verdicts.length,
    claimCount: verdicts.length,
    scopeCount: (result.resultJson.understanding?.analysisContexts?.length ??
      result.resultJson.understanding?.distinctProceedings?.length) ||
      1,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Input Neutrality", () => {
  let pairs: NeutralityPair[];
  let outputDir: string;
  let testsEnabled = true;

  beforeAll(() => {
    const webRoot = path.resolve(__dirname, "../../..");
    const envPath = path.join(webRoot, ".env.local");
    loadEnvFile(envPath);

    // Enable deterministic mode for reproducibility
    process.env.FH_DETERMINISTIC = "true";

    // Check if we have necessary API keys
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;
    const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!hasOpenAI && !hasClaude && !hasGemini) {
      console.warn("[Input Neutrality] No LLM API keys found, tests will be skipped");
      testsEnabled = false;
    }

    pairs = loadNeutralityPairs();

    // Set up output directory for test results
    outputDir = path.join(webRoot, "test", "output", "neutrality");
    fs.mkdirSync(outputDir, { recursive: true });
  });

  describe("Individual pair divergence", () => {
    it("should load test pairs", () => {
      expect(pairs.length).toBeGreaterThanOrEqual(5);
      console.log(`[Input Neutrality] Loaded ${pairs.length} test pairs`);
    });

    // Test a single representative pair to verify the test infrastructure works
    it(
      "single pair: court-judgment (Q vs S divergence ≤ 4 points)",
      async () => {
        if (!testsEnabled) {
          console.log("[Input Neutrality] Skipping - no API keys");
          return;
        }

        const pair = pairs.find((p) => p.id === "court-judgment");
        if (!pair) {
          throw new Error("court-judgment pair not found in fixtures");
        }

        console.log(`[Input Neutrality] Testing: ${pair.id}`);
        console.log(`  Question: "${pair.question}"`);
        console.log(`  Statement: "${pair.statement}"`);

        const qStart = Date.now();
        const qResult = await runFactHarborAnalysis({
          inputValue: pair.question,
          inputType: "claim",
        });
        const qElapsed = Date.now() - qStart;

        const sStart = Date.now();
        const sResult = await runFactHarborAnalysis({
          inputValue: pair.statement,
          inputType: "claim",
        });
        const sElapsed = Date.now() - sStart;

        const qVerdict = extractVerdictResult(qResult);
        const sVerdict = extractVerdictResult(sResult);
        const divergence = Math.abs(qVerdict.truthPercentage - sVerdict.truthPercentage);

        console.log(`  Question verdict: ${qVerdict.truthPercentage.toFixed(1)}% (${qElapsed}ms)`);
        console.log(`  Statement verdict: ${sVerdict.truthPercentage.toFixed(1)}% (${sElapsed}ms)`);
        console.log(`  Divergence: ${divergence.toFixed(1)} points`);

        // Write detailed output for debugging
        const resultPath = path.join(outputDir, `${pair.id}-results.json`);
        fs.writeFileSync(
          resultPath,
          JSON.stringify(
            {
              pair,
              question: { verdict: qVerdict, elapsed: qElapsed },
              statement: { verdict: sVerdict, elapsed: sElapsed },
              divergence,
              passed: divergence <= MAX_DIVERGENCE_POINTS,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        expect(divergence).toBeLessThanOrEqual(MAX_DIVERGENCE_POINTS);
      },
      TEST_TIMEOUT_MS
    );
  });

  describe("Aggregate metrics", () => {
    it(
      "average absolute divergence ≤ 4 points across all pairs",
      async () => {
        if (!testsEnabled) {
          console.log("[Input Neutrality] Skipping aggregate test - no API keys");
          return;
        }

        const results: Array<{
          id: string;
          qTruth: number;
          sTruth: number;
          divergence: number;
        }> = [];

        console.log(`[Input Neutrality] Running aggregate test on ${pairs.length} pairs...`);

        for (const pair of pairs) {
          try {
            console.log(`  Processing: ${pair.id}...`);

            const qResult = await runFactHarborAnalysis({
              inputValue: pair.question,
              inputType: "claim",
            });

            const sResult = await runFactHarborAnalysis({
              inputValue: pair.statement,
              inputType: "claim",
            });

            const qVerdict = extractVerdictResult(qResult);
            const sVerdict = extractVerdictResult(sResult);
            const divergence = Math.abs(qVerdict.truthPercentage - sVerdict.truthPercentage);

            results.push({
              id: pair.id,
              qTruth: qVerdict.truthPercentage,
              sTruth: sVerdict.truthPercentage,
              divergence,
            });

            console.log(
              `    ${pair.id}: Q=${qVerdict.truthPercentage.toFixed(1)}%, S=${sVerdict.truthPercentage.toFixed(1)}%, Δ=${divergence.toFixed(1)}`
            );
          } catch (err) {
            console.error(`    ${pair.id}: FAILED - ${err}`);
            // Continue with other pairs
          }
        }

        if (results.length === 0) {
          throw new Error("No pairs completed successfully");
        }

        // Calculate metrics
        const divergences = results.map((r) => r.divergence);
        const avgDivergence = divergences.reduce((a, b) => a + b, 0) / divergences.length;
        const maxDivergence = Math.max(...divergences);
        const sortedDivergences = [...divergences].sort((a, b) => a - b);
        const p95Index = Math.floor(sortedDivergences.length * 0.95);
        const p95Divergence = sortedDivergences[Math.min(p95Index, sortedDivergences.length - 1)];

        console.log(`\n[Input Neutrality] Aggregate Results:`);
        console.log(`  Pairs tested: ${results.length}`);
        console.log(`  Average divergence: ${avgDivergence.toFixed(2)} points`);
        console.log(`  Max divergence: ${maxDivergence.toFixed(2)} points`);
        console.log(`  p95 divergence: ${p95Divergence.toFixed(2)} points`);

        // Write aggregate results
        const aggregatePath = path.join(outputDir, "aggregate-results.json");
        fs.writeFileSync(
          aggregatePath,
          JSON.stringify(
            {
              pairsTotal: pairs.length,
              pairsCompleted: results.length,
              avgDivergence,
              maxDivergence,
              p95Divergence,
              target: MAX_DIVERGENCE_POINTS,
              passed: avgDivergence <= MAX_DIVERGENCE_POINTS,
              results,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        expect(avgDivergence).toBeLessThanOrEqual(MAX_DIVERGENCE_POINTS);
      },
      AGGREGATE_TIMEOUT_MS
    );

    it(
      "p95 divergence tracking (informational)",
      async () => {
        if (!testsEnabled) {
          console.log("[Input Neutrality] Skipping p95 tracking - no API keys");
          return;
        }

        // Read from aggregate results if available
        const aggregatePath = path.join(outputDir, "aggregate-results.json");
        if (fs.existsSync(aggregatePath)) {
          const data = JSON.parse(fs.readFileSync(aggregatePath, "utf-8"));
          console.log(`[Input Neutrality] p95 divergence from aggregate: ${data.p95Divergence?.toFixed(2)} points`);
          // This is informational - no assertion, just tracking
        } else {
          console.log("[Input Neutrality] No aggregate results found - run aggregate test first");
        }
      },
      10_000
    );
  });
});
