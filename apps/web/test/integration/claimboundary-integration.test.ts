/**
 * ClaimAssessmentBoundary Pipeline — End-to-End Integration Tests
 *
 * These tests run the FULL pipeline with REAL LLM calls and web searches.
 * They are EXCLUDED from `npm test` (vitest.config.ts exclude list).
 *
 * To run manually:
 *   npx vitest run test/integration/claimboundary-integration.test.ts
 *
 * Or via npm script:
 *   npm -w apps/web run test:cb-integration
 *
 * Estimated cost: $0.50–1.00 per test scenario ($1.50–3.00 for all 3).
 *
 * All tests use test.skip() by default. Remove .skip() for the test(s)
 * you want to run, then invoke with the commands above.
 *
 * @see Docs/WIP/ClaimAssessmentBoundary_Pipeline_Architecture_2026-02-15.md
 * @see Docs/WIP/CB_Implementation_Plan_2026-02-17.md Phase 5f
 */

import fs from "node:fs";
import path from "node:path";
import { describe, test, expect, beforeAll } from "vitest";

import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";

// ============================================================================
// SETUP
// ============================================================================

/** Load .env.local so LLM API keys are available in test environment */
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

// ============================================================================
// SCHEMA VALIDATION HELPERS
// ============================================================================

/** Validate the top-level resultJson structure matches 3.0.0-cb spec */
function assertCBSchema(resultJson: Record<string, any>): void {
  // Schema version
  expect(resultJson._schemaVersion).toBe("3.0.0-cb");
  expect(resultJson.meta.schemaVersion).toBe("3.0.0-cb");
  expect(resultJson.meta.pipeline).toBe("claimboundary");

  // Core assessment fields
  expect(typeof resultJson.truthPercentage).toBe("number");
  expect(resultJson.truthPercentage).toBeGreaterThanOrEqual(0);
  expect(resultJson.truthPercentage).toBeLessThanOrEqual(100);
  expect(typeof resultJson.verdict).toBe("string");
  expect(typeof resultJson.confidence).toBe("number");
  expect(resultJson.confidence).toBeGreaterThanOrEqual(0);
  expect(resultJson.confidence).toBeLessThanOrEqual(100);

  // Verdict narrative (§8.5.6)
  expect(resultJson.verdictNarrative).toBeDefined();
  expect(typeof resultJson.verdictNarrative.headline).toBe("string");
  expect(typeof resultJson.verdictNarrative.evidenceBaseSummary).toBe("string");
  expect(typeof resultJson.verdictNarrative.keyFinding).toBe("string");
  expect(typeof resultJson.verdictNarrative.limitations).toBe("string");

  // ClaimBoundary-specific data (no AnalysisContext references)
  expect(Array.isArray(resultJson.claimBoundaries)).toBe(true);
  expect(Array.isArray(resultJson.claimVerdicts)).toBe(true);
  expect(resultJson.coverageMatrix).toBeDefined();

  // No legacy AnalysisContext fields
  expect(resultJson.analysisContexts).toBeUndefined();

  // Supporting data
  expect(resultJson.understanding).toBeDefined();
  expect(Array.isArray(resultJson.evidenceItems)).toBe(true);
  expect(Array.isArray(resultJson.sources)).toBe(true);
  expect(Array.isArray(resultJson.searchQueries)).toBe(true);

  // Quality gates
  expect(resultJson.qualityGates).toBeDefined();
}

/** Validate claim-verdict consistency */
function assertClaimVerdictConsistency(resultJson: Record<string, any>): void {
  const claims = resultJson.understanding?.atomicClaims ?? [];
  const verdicts = resultJson.claimVerdicts ?? [];

  // Every claim should have a verdict
  expect(verdicts.length).toBe(claims.length);

  // Every verdict references a valid claim
  const claimIds = new Set(claims.map((c: any) => c.id));
  for (const v of verdicts) {
    expect(claimIds.has(v.claimId)).toBe(true);
    expect(v.truthPercentage).toBeGreaterThanOrEqual(0);
    expect(v.truthPercentage).toBeLessThanOrEqual(100);
    expect(typeof v.verdict).toBe("string");
    expect(typeof v.reasoning).toBe("string");
    expect(Array.isArray(v.supportingEvidenceIds)).toBe(true);
    expect(Array.isArray(v.contradictingEvidenceIds)).toBe(true);
    expect(Array.isArray(v.boundaryFindings)).toBe(true);
  }
}

/** Validate coverage matrix dimensions match claims × boundaries */
function assertCoverageMatrix(resultJson: Record<string, any>): void {
  const claims = resultJson.understanding?.atomicClaims ?? [];
  const boundaries = resultJson.claimBoundaries ?? [];
  const matrix = resultJson.coverageMatrix;

  expect(matrix.claims.length).toBe(claims.length);
  expect(matrix.boundaries.length).toBe(boundaries.length);
  expect(matrix.counts.length).toBe(claims.length);

  for (const row of matrix.counts) {
    expect(row.length).toBe(boundaries.length);
    for (const count of row) {
      expect(count).toBeGreaterThanOrEqual(0);
    }
  }
}

/** Validate boundary structure */
function assertBoundaryStructure(resultJson: Record<string, any>): void {
  for (const boundary of resultJson.claimBoundaries) {
    expect(typeof boundary.id).toBe("string");
    expect(boundary.id).toMatch(/^CB_/);
    expect(typeof boundary.name).toBe("string");
    expect(boundary.name.length).toBeGreaterThan(0);
    expect(typeof boundary.shortName).toBe("string");
    expect(typeof boundary.description).toBe("string");
    expect(Array.isArray(boundary.constituentScopes)).toBe(true);
    expect(typeof boundary.internalCoherence).toBe("number");
    expect(typeof boundary.evidenceCount).toBe("number");
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe.sequential("ClaimAssessmentBoundary Pipeline — End-to-End Integration", () => {
  beforeAll(() => {
    const webRoot = path.resolve(__dirname, "../..");
    loadEnvFile(path.join(webRoot, ".env.local"));
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Simple factual input (1 claim, 1+ boundary)
  // --------------------------------------------------------------------------
  test.skip("simple input: single verifiable fact", async () => {
    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "The Eiffel Tower is located in Paris, France.",
      onEvent: (msg, pct) => console.log(`[${pct}%] ${msg}`),
    });

    const r = result.resultJson;

    // Schema compliance
    assertCBSchema(r);
    assertClaimVerdictConsistency(r);
    assertCoverageMatrix(r);
    assertBoundaryStructure(r);

    // Content expectations (loose — LLM outputs vary)
    expect(r.meta.claimCount).toBeGreaterThanOrEqual(1);
    expect(r.claimBoundaries.length).toBeGreaterThanOrEqual(1);
    expect(r.truthPercentage).toBeGreaterThan(80);
    expect(r.confidence).toBeGreaterThan(50);
    expect(r.evidenceItems.length).toBeGreaterThanOrEqual(1);

    // Verdict should be TRUE or MOSTLY-TRUE for a well-known fact
    expect(["TRUE", "MOSTLY-TRUE"]).toContain(r.verdict);

    console.log("[Scenario 1] Simple input result:", {
      truth: r.truthPercentage,
      verdict: r.verdict,
      confidence: r.confidence,
      claims: r.meta.claimCount,
      boundaries: r.meta.boundaryCount,
      evidence: r.evidenceItems.length,
      llmCalls: r.meta.llmCalls,
    });
  }, 120_000); // 2 minute timeout

  // --------------------------------------------------------------------------
  // Scenario 2: Multi-claim input (3+ claims, 2-3 boundaries expected)
  // --------------------------------------------------------------------------
  test.skip("multi-claim input: economic statistics", async () => {
    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue:
        "Brazil's economy grew 5% in 2020. The unemployment rate fell to 8%. Inflation remained under control at 3%.",
      onEvent: (msg, pct) => console.log(`[${pct}%] ${msg}`),
    });

    const r = result.resultJson;

    // Schema compliance
    assertCBSchema(r);
    assertClaimVerdictConsistency(r);
    assertCoverageMatrix(r);
    assertBoundaryStructure(r);

    // Content expectations
    expect(r.meta.claimCount).toBeGreaterThanOrEqual(2);
    expect(r.claimVerdicts.length).toBeGreaterThanOrEqual(2);
    expect(r.claimBoundaries.length).toBeGreaterThanOrEqual(1);
    expect(r.evidenceItems.length).toBeGreaterThanOrEqual(2);

    // Multiple claims should produce per-claim verdicts
    for (const v of r.claimVerdicts) {
      expect(v.truthPercentage).toBeGreaterThanOrEqual(0);
      expect(v.truthPercentage).toBeLessThanOrEqual(100);
    }

    // Coverage matrix should have rows for each claim
    expect(r.coverageMatrix.claims.length).toBeGreaterThanOrEqual(2);

    console.log("[Scenario 2] Multi-claim result:", {
      truth: r.truthPercentage,
      verdict: r.verdict,
      confidence: r.confidence,
      claims: r.meta.claimCount,
      boundaries: r.meta.boundaryCount,
      evidence: r.evidenceItems.length,
      llmCalls: r.meta.llmCalls,
      verdicts: r.claimVerdicts.map((v: any) => ({
        claim: v.claimId,
        truth: v.truthPercentage,
        verdict: v.verdict,
      })),
    });
  }, 180_000); // 3 minute timeout

  // --------------------------------------------------------------------------
  // Scenario 3: Adversarial input (opinion + fact mix)
  // --------------------------------------------------------------------------
  test.skip("adversarial input: opinion and fact mix", async () => {
    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue:
        "Electric cars are clearly the future of transportation. Tesla sold over 500,000 vehicles in 2020.",
      onEvent: (msg, pct) => console.log(`[${pct}%] ${msg}`),
    });

    const r = result.resultJson;

    // Schema compliance
    assertCBSchema(r);
    assertClaimVerdictConsistency(r);
    assertCoverageMatrix(r);
    assertBoundaryStructure(r);

    // Content expectations
    expect(r.meta.claimCount).toBeGreaterThanOrEqual(1);
    expect(r.claimBoundaries.length).toBeGreaterThanOrEqual(1);

    // Gate 1 should identify opinion claims (lower specificity/checkworthiness)
    // The "clearly the future" claim may be filtered or flagged
    const claims = r.understanding?.atomicClaims ?? [];
    const evaluativeClaims = claims.filter(
      (c: any) => c.category === "evaluative"
    );
    // At least one claim should be evaluative (the opinion part)
    // Note: LLM may classify differently — this is a soft check
    if (evaluativeClaims.length > 0) {
      console.log(
        `[Scenario 3] ${evaluativeClaims.length} evaluative claim(s) detected`
      );
    }

    // The factual claim (Tesla sales) should have evidence
    const factualVerdicts = r.claimVerdicts.filter(
      (v: any) => v.supportingEvidenceIds.length > 0
    );
    expect(factualVerdicts.length).toBeGreaterThanOrEqual(1);

    console.log("[Scenario 3] Adversarial result:", {
      truth: r.truthPercentage,
      verdict: r.verdict,
      confidence: r.confidence,
      claims: r.meta.claimCount,
      boundaries: r.meta.boundaryCount,
      evidence: r.evidenceItems.length,
      llmCalls: r.meta.llmCalls,
      claimCategories: claims.map((c: any) => ({
        id: c.id,
        category: c.category,
        centrality: c.centrality,
      })),
    });
  }, 180_000); // 3 minute timeout
});
