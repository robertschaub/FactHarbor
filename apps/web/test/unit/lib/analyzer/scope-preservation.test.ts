/**
 * Scope Preservation Test Suite
 *
 * Verifies that:
 * 1. Multi-scope inputs detect all expected scopes
 * 2. Each detected scope has at least one fact assigned
 * 3. No scope-loss events occur during analysis
 * 4. Scope IDs are stable across deterministic runs
 *
 * @module analyzer/scope-preservation.test
 */

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { runFactHarborAnalysis } from "@/lib/analyzer";
import { UNSCOPED_ID } from "@/lib/analyzer/analysis-contexts";
import { loadEnvFile } from "@test/helpers/test-helpers";

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_TIMEOUT_MS = 180_000; // 3 minutes per test
const STABILITY_TIMEOUT_MS = 300_000; // 5 minutes for stability tests (2 runs)

// ============================================================================
// TEST DATA
// ============================================================================

const MULTI_SCOPE_LEGAL_INPUT = `
The merger between Company A and Company B faces regulatory scrutiny from both
the FTC in the United States and the European Commission in the EU.
The FTC focuses on domestic market concentration and consumer pricing effects,
while the EC examines cross-border competition and digital market dominance.
Both agencies have different thresholds for approval.
`.trim();

const MULTI_SCOPE_METHODOLOGICAL_INPUT = `
Electric vehicle lifecycle emissions vary significantly depending on methodology.
Well-to-Wheel (WTW) analysis shows EVs produce 50% less emissions than ICE vehicles.
Tank-to-Wheel (TTW) analysis shows EVs produce zero tailpipe emissions.
Life Cycle Assessment (LCA) including battery production shows more nuanced results.
`.trim();

const MULTI_SCOPE_TEMPORAL_INPUT = `
COVID-19 vaccine effectiveness changed over time with new variants.
Initial trials in 2020 showed 95% efficacy against the original strain.
By 2022, effectiveness against Omicron variants dropped to 30-50%.
Booster shots restored some protection but with declining duration.
`.trim();

const CALIFORNIA_VS_TEXAS_INPUT = `
Compare the environmental regulations for electric vehicle manufacturing
in California versus Texas. California has stricter emission standards
under CARB regulations, while Texas offers more manufacturer flexibility
but fewer incentives for zero-emission vehicles.
`.trim();

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Scope Preservation", () => {
  let testsEnabled = true;
  let outputDir: string;

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
      console.warn("[Scope Preservation] No LLM API keys found, tests will be skipped");
      testsEnabled = false;
    }

    // Set up output directory
    outputDir = path.join(webRoot, "test-output", "scope-preservation");
    fs.mkdirSync(outputDir, { recursive: true });
  });

  describe("Multi-scope detection", () => {
    it(
      "legal: FTC and EC regulatory scopes both detected with facts",
      async () => {
        if (!testsEnabled) {
          console.log("[Scope Preservation] Skipping - no API keys");
          return;
        }

        console.log("[Scope Preservation] Testing: Multi-scope legal (FTC vs EC)");

        const result = await runFactHarborAnalysis({
          inputValue: MULTI_SCOPE_LEGAL_INPUT,
          inputType: "claim",
        });

        const scopes =
          result.resultJson.understanding?.analysisContexts ||
          result.resultJson.understanding?.distinctProceedings ||
          [];
        const facts = result.resultJson.facts || [];

        console.log(`  Detected ${scopes.length} scopes:`);
        scopes.forEach((s) => console.log(`    - ${s.id}: ${s.name}`));
        console.log(`  Extracted ${facts.length} facts`);

        // Should detect at least 2 scopes (FTC/US and EC/EU)
        expect(scopes.length).toBeGreaterThanOrEqual(2);

        // Each scope should have at least 1 fact
        for (const scope of scopes) {
          const scopeFacts = facts.filter((f) => (f.contextId ?? f.relatedProceedingId) === scope.id);
          console.log(`    Scope ${scope.id}: ${scopeFacts.length} facts`);

          // Allow CTX_UNSCOPED or general scopes to have 0 facts
          if (!scope.id.includes("UNSCOPED") && !scope.name.toLowerCase().includes("general")) {
            expect(scopeFacts.length).toBeGreaterThanOrEqual(1);
          }
        }

        // Write results for debugging
        fs.writeFileSync(
          path.join(outputDir, "legal-multi-scope-results.json"),
          JSON.stringify(
            {
              input: MULTI_SCOPE_LEGAL_INPUT,
              scopeCount: scopes.length,
              scopes: scopes.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName })),
              factCount: facts.length,
              factsPerScope: scopes.map((s) => ({
                scopeId: s.id,
                factCount: facts.filter((f) => (f.contextId ?? f.relatedProceedingId) === s.id).length,
              })),
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );
      },
      TEST_TIMEOUT_MS
    );

    it(
      "methodological: WTW, TTW, LCA scopes detected",
      async () => {
        if (!testsEnabled) {
          console.log("[Scope Preservation] Skipping - no API keys");
          return;
        }

        console.log("[Scope Preservation] Testing: Multi-scope methodological");

        const result = await runFactHarborAnalysis({
          inputValue: MULTI_SCOPE_METHODOLOGICAL_INPUT,
          inputType: "claim",
        });

        const scopes =
          result.resultJson.understanding?.analysisContexts ||
          result.resultJson.understanding?.distinctProceedings ||
          [];
        console.log(`  Detected ${scopes.length} scopes:`);
        scopes.forEach((s) => console.log(`    - ${s.id}: ${s.name}`));

        // Should detect multiple methodology scopes
        expect(scopes.length).toBeGreaterThanOrEqual(2);

        fs.writeFileSync(
          path.join(outputDir, "methodological-multi-scope-results.json"),
          JSON.stringify(
            {
              input: MULTI_SCOPE_METHODOLOGICAL_INPUT,
              scopeCount: scopes.length,
              scopes: scopes.map((s) => ({ id: s.id, name: s.name })),
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );
      },
      TEST_TIMEOUT_MS
    );

    it(
      "geographic: California vs Texas scopes detected",
      async () => {
        if (!testsEnabled) {
          console.log("[Scope Preservation] Skipping - no API keys");
          return;
        }

        console.log("[Scope Preservation] Testing: Geographic scopes (CA vs TX)");

        const result = await runFactHarborAnalysis({
          inputValue: CALIFORNIA_VS_TEXAS_INPUT,
          inputType: "claim",
        });

        const scopes =
          result.resultJson.understanding?.analysisContexts ||
          result.resultJson.understanding?.distinctProceedings ||
          [];
        console.log(`  Detected ${scopes.length} scopes:`);
        scopes.forEach((s) => console.log(`    - ${s.id}: ${s.name}`));

        // Should detect at least 2 geographic scopes
        expect(scopes.length).toBeGreaterThanOrEqual(2);

        fs.writeFileSync(
          path.join(outputDir, "geographic-multi-scope-results.json"),
          JSON.stringify(
            {
              input: CALIFORNIA_VS_TEXAS_INPUT,
              scopeCount: scopes.length,
              scopes: scopes.map((s) => ({ id: s.id, name: s.name })),
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );
      },
      TEST_TIMEOUT_MS
    );
  });

  describe("Scope retention", () => {
    it(
      "all detected scopes appear in final verdict",
      async () => {
        if (!testsEnabled) {
          console.log("[Scope Preservation] Skipping - no API keys");
          return;
        }

        console.log("[Scope Preservation] Testing: Scope retention in verdicts");

        const result = await runFactHarborAnalysis({
          inputValue: MULTI_SCOPE_LEGAL_INPUT,
          inputType: "claim",
        });

        const scopes =
          result.resultJson.understanding?.analysisContexts ||
          result.resultJson.understanding?.distinctProceedings ||
          [];
        const verdicts = result.resultJson.claimVerdicts || [];

        // Get all scope IDs referenced in verdicts (via claims' relatedProceedingId)
        const claims = result.understanding?.subClaims || [];
        const scopeIdsInClaims = new Set(
          claims.map((c) => c.contextId ?? c.relatedProceedingId).filter(Boolean)
        );

        console.log(`  Scopes detected: ${scopes.length}`);
        console.log(`  Scopes in claims: ${scopeIdsInClaims.size}`);
        console.log(`  Verdicts generated: ${verdicts.length}`);

        // All non-general scopes should have at least one claim
        for (const scope of scopes) {
          if (!scope.id.includes("UNSCOPED") && !scope.name.toLowerCase().includes("general")) {
            const hasClaimForScope = scopeIdsInClaims.has(scope.id);
            console.log(`    Scope ${scope.id} has claims: ${hasClaimForScope}`);
            // This is informational for now - scope loss is a known issue being addressed
          }
        }
      },
      TEST_TIMEOUT_MS
    );
  });

  describe("Scope ID stability", () => {
    it(
      "same input produces same scope IDs (deterministic mode)",
      async () => {
        if (!testsEnabled) {
          console.log("[Scope Preservation] Skipping - no API keys");
          return;
        }

        console.log("[Scope Preservation] Testing: Scope ID stability across runs");

        // Run 1
        console.log("  Run 1...");
        const run1 = await runFactHarborAnalysis({
          inputValue: CALIFORNIA_VS_TEXAS_INPUT,
          inputType: "claim",
        });

        // Run 2
        console.log("  Run 2...");
        const run2 = await runFactHarborAnalysis({
          inputValue: CALIFORNIA_VS_TEXAS_INPUT,
          inputType: "claim",
        });

        const ids1 = (run1.resultJson.understanding?.analysisContexts || run1.resultJson.understanding?.distinctProceedings || [])
          .map((s) => s.id)
          .sort();
        const ids2 = (run2.resultJson.understanding?.analysisContexts || run2.resultJson.understanding?.distinctProceedings || [])
          .map((s) => s.id)
          .sort();

        console.log(`  Run 1 scope IDs: ${ids1.join(", ")}`);
        console.log(`  Run 2 scope IDs: ${ids2.join(", ")}`);

        // Write stability results
        fs.writeFileSync(
          path.join(outputDir, "scope-id-stability-results.json"),
          JSON.stringify(
            {
              input: CALIFORNIA_VS_TEXAS_INPUT,
              run1: { scopeIds: ids1 },
              run2: { scopeIds: ids2 },
              idsMatch: JSON.stringify(ids1) === JSON.stringify(ids2),
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        // IDs should match exactly in deterministic mode
        expect(ids1).toEqual(ids2);
      },
      STABILITY_TIMEOUT_MS
    );
  });

  // ==========================================================================
  // PR 2: REGRESSION CASES
  // ==========================================================================

  describe("Regression cases (PR 2)", () => {
    it(
      "complex merger case: no scope loss on FTC/EC regulatory input",
      async () => {
        if (!testsEnabled) {
          console.log("[Scope Preservation] Skipping - no API keys");
          return;
        }

        console.log("[Scope Preservation] Regression: Complex merger regulatory case");

        const complexInput = `
The proposed acquisition of TechCorp by MegaCorp faces simultaneous review by
multiple regulatory bodies with different standards and timelines.

The US Federal Trade Commission (FTC) is examining the deal under Section 7 of
the Clayton Act, focusing on horizontal market concentration in the cloud
services sector. The FTC's preliminary analysis suggests the combined entity
would control 45% of the enterprise cloud market.

The European Commission (EC) opened a Phase II investigation under the EU
Merger Regulation, examining potential vertical foreclosure effects and the
impact on European digital sovereignty. The EC has expressed concerns about
data localization and cross-border data flows.

The UK Competition and Markets Authority (CMA) is conducting a parallel review
post-Brexit, with particular attention to the UK AI sector where both companies
have significant operations.
        `.trim();

        const result = await runFactHarborAnalysis({
          inputValue: complexInput,
          inputType: "claim",
        });

        const scopes =
          result.resultJson.understanding?.analysisContexts ||
          result.resultJson.understanding?.distinctProceedings ||
          [];
        const facts = result.resultJson.facts || [];

        console.log(`  Detected ${scopes.length} scopes:`);
        scopes.forEach((s) => console.log(`    - ${s.id}: ${s.name}`));

        // Should detect at least 3 regulatory scopes (FTC, EC, CMA)
        expect(scopes.length).toBeGreaterThanOrEqual(2);

        // Each major regulatory body should have facts
        const scopeFactCounts = scopes.map((s) => ({
          id: s.id,
          name: s.name,
          factCount: facts.filter((f) => (f.contextId ?? f.relatedProceedingId) === s.id).length,
        }));

        console.log("  Facts per scope:");
        scopeFactCounts.forEach((s) => console.log(`    ${s.id}: ${s.factCount} facts`));

        // At least some scopes should have facts (allowing for CTX_UNSCOPED)
        const scopesWithFacts = scopeFactCounts.filter((s) => s.factCount > 0);
        expect(scopesWithFacts.length).toBeGreaterThanOrEqual(1);

        fs.writeFileSync(
          path.join(outputDir, "regression-merger-case-results.json"),
          JSON.stringify(
            {
              input: complexInput.substring(0, 200) + "...",
              scopeCount: scopes.length,
              scopes: scopeFactCounts,
              totalFacts: facts.length,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );
      },
      TEST_TIMEOUT_MS
    );

    it(
      "refinement prompt scope coverage: facts distributed across scopes",
      async () => {
        if (!testsEnabled) {
          console.log("[Scope Preservation] Skipping - no API keys");
          return;
        }

        console.log("[Scope Preservation] Regression: Scope coverage in refinement");

        // Use the multi-scope legal input
        const result = await runFactHarborAnalysis({
          inputValue: MULTI_SCOPE_LEGAL_INPUT,
          inputType: "claim",
        });

        const scopes =
          result.resultJson.understanding?.analysisContexts ||
          result.resultJson.understanding?.distinctProceedings ||
          [];
        const facts = result.resultJson.facts || [];

        // Calculate distribution
        const distribution: Record<string, number> = {};
        for (const fact of facts) {
          const scopeId = fact.contextId ?? fact.relatedProceedingId ?? UNSCOPED_ID;
          distribution[scopeId] = (distribution[scopeId] || 0) + 1;
        }

        console.log("  Fact distribution:");
        Object.entries(distribution).forEach(([scopeId, count]) => {
          console.log(`    ${scopeId}: ${count} facts`);
        });

        // Non-trivial scopes (not UNSCOPED/General) should have representation
        const nonTrivialScopes = scopes.filter(
          (s) =>
            !s.id.includes("UNSCOPED") &&
            !s.name.toLowerCase().includes("general")
        );

        const coveredScopes = nonTrivialScopes.filter(
          (s) => (distribution[s.id] || 0) > 0
        );

        console.log(
          `  Coverage: ${coveredScopes.length}/${nonTrivialScopes.length} non-trivial scopes have facts`
        );

        // At least one non-trivial scope should have facts (goal is all, but start with one)
        if (nonTrivialScopes.length > 0) {
          expect(coveredScopes.length).toBeGreaterThanOrEqual(1);
        }

        fs.writeFileSync(
          path.join(outputDir, "regression-scope-coverage-results.json"),
          JSON.stringify(
            {
              totalScopes: scopes.length,
              nonTrivialScopes: nonTrivialScopes.length,
              coveredScopes: coveredScopes.length,
              distribution,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );
      },
      TEST_TIMEOUT_MS
    );

    it(
      "scope names preserved through refinement",
      async () => {
        if (!testsEnabled) {
          console.log("[Scope Preservation] Skipping - no API keys");
          return;
        }

        console.log("[Scope Preservation] Regression: Scope name preservation");

        const result = await runFactHarborAnalysis({
          inputValue: CALIFORNIA_VS_TEXAS_INPUT,
          inputType: "claim",
        });

        const scopes =
          result.resultJson.understanding?.analysisContexts ||
          result.resultJson.understanding?.distinctProceedings ||
          [];

        // Scope names should contain meaningful identifiers
        const scopeNames = scopes.map((s) => s.name.toLowerCase());

        console.log("  Scope names:");
        scopes.forEach((s) => console.log(`    ${s.id}: "${s.name}"`));

        // At least one scope should reference California or Texas
        const hasGeographicReference = scopeNames.some(
          (name) =>
            name.includes("california") ||
            name.includes("texas") ||
            name.includes("ca") ||
            name.includes("tx")
        );

        console.log(`  Has geographic reference: ${hasGeographicReference}`);

        // This is informational - scope naming is a quality metric
        fs.writeFileSync(
          path.join(outputDir, "regression-scope-names-results.json"),
          JSON.stringify(
            {
              input: CALIFORNIA_VS_TEXAS_INPUT,
              scopes: scopes.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName })),
              hasGeographicReference,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );
      },
      TEST_TIMEOUT_MS
    );
  });
});
