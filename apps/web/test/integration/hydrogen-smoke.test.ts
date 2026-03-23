/**
 * Hydrogen Smoke Test — Targeted Integration Baseline
 * 
 * Runs a single, well-known scenario to verify pipeline integrity 
 * across all 5 stages after the WS-2/WS-3/WS-4 refactorings.
 *
 * Input: "Hydrogen is more efficient for cars than electricity"
 * Expected: System should complete all stages and produce a structured verdict.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, test, expect, beforeAll } from "vitest";
import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";

/** Load .env.local so LLM API keys are available */
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

describe("Hydrogen Smoke Test — Targeted Integration Baseline", () => {
  beforeAll(() => {
    const webRoot = path.resolve(__dirname, "../..");
    loadEnvFile(path.join(webRoot, ".env.local"));
    // Set admin key for tests
    process.env.FH_ADMIN_KEY = "test";
  });

  test("Hydrogen vs Electricity Efficiency scenario", async () => {
    console.log("[SmokeTest] Starting Hydrogen vs Electricity Efficiency analysis...");
    const startMs = Date.now();
    
    const result = await runClaimBoundaryAnalysis({
      jobId: `smoke-hydrogen-${Date.now()}`,
      inputType: "text",
      inputValue: "Hydrogen is more efficient for cars than electricity",
      onEvent: (msg, pct) => {
        if (pct >= 0) console.log(`[${pct}%] ${msg}`);
      },
    });

    const durationS = Math.round((Date.now() - startMs) / 1000);
    const r = result.resultJson;

    // 1. Basic Schema & Integrity Checks
    expect(r._schemaVersion).toBe("3.2.0-cb");
    expect(r.meta.claimCount).toBeGreaterThanOrEqual(1);
    expect(r.claimVerdicts.length).toBe(r.meta.claimCount);
    expect(r.claimBoundaries.length).toBeGreaterThanOrEqual(1);
    expect(r.evidenceItems.length).toBeGreaterThanOrEqual(3);
    
    // 2. Stages Verification (Presence of results)
    expect(r.understanding.atomicClaims.length).toBeGreaterThan(0); // Stage 1
    expect(r.evidenceItems.some(e => e.evidenceScope)).toBe(true);  // Stage 2 (Extraction)
    expect(r.claimBoundaries.length).toBeGreaterThan(0);            // Stage 3
    expect(r.claimVerdicts.some(v => v.reasoning)).toBe(true);      // Stage 4
    expect(r.truthPercentage).toBeDefined();                        // Stage 5
    
    // 3. Expected Result Context (loose)
    // Most scientific consensus is that BEVs are more efficient than FCEVs
    // So the truthPercentage should generally be low (MOSTLY-FALSE / FALSE)
    console.log("[SmokeTest] Results:", {
      duration: `${durationS}s`,
      truth: r.truthPercentage,
      verdict: r.verdict,
      confidence: r.confidence,
      claims: r.meta.claimCount,
      boundaries: r.meta.boundaryCount,
      evidence: r.evidenceItems.length,
      llmCalls: r.meta.llmCalls,
    });

    // Verification of the "Hydrogen" baseline characteristic (usually false/low truth)
    expect(r.truthPercentage).toBeLessThan(50);
    
  }, 300_000); // 5 minute timeout
});
