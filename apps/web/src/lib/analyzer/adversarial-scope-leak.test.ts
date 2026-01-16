/**
 * Adversarial Scope Leak Test Suite
 *
 * Tests the pipeline's ability to prevent cross-scope citation bleeding
 * when given intentionally confusing inputs with similar identifiers.
 *
 * Pass criteria:
 * - No cross-scope citations (Scope A verdict must not cite Scope B facts)
 * - Ambiguous evidence goes to CTX_UNSCOPED and is excluded from aggregation
 * - Input neutrality maintained (question vs statement forms produce same results)
 *
 * @module analyzer/adversarial-scope-leak.test
 */

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { runFactHarborAnalysis } from "../analyzer";
import { UNSCOPED_ID } from "./scopes";

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_TIMEOUT_MS = 300_000; // 5 minutes per test (these are complex)
const FULL_SUITE_TIMEOUT_MS = 900_000; // 15 minutes for full adversarial suite

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

// ============================================================================
// TEST DATA (from Handover document)
// ============================================================================

/**
 * Adversarial input designed to test scope separation.
 * Two legal scopes share confusing identifiers (same case number, similar abbreviations).
 */
const ADVERSARIAL_INPUT_STATEMENT = `
Two legal scopes share confusing identifiers.
Scope A: Supreme Court of Country A, Case 2024-017, about whether Policy P violates Statute S.
Scope B: Supreme Court of Country B, Case 2024-017, about whether Policy P complies with Statute S.
Some articles abbreviate both courts as "SC" and merge the stories.
Task: Analyze Scope A and Scope B separately. For each scope, list the controlling decision, date, holding, and only the evidence that belongs to that scope. If evidence is ambiguous, place it in CTX_UNSCOPED/General and do not let it affect either scope's verdict.
`.trim();

const ADVERSARIAL_INPUT_QUESTION = `
Was it true that two legal scopes share confusing identifiers?
Scope A: Supreme Court of Country A, Case 2024-017, about whether Policy P violates Statute S.
Scope B: Supreme Court of Country B, Case 2024-017, about whether Policy P complies with Statute S.
Some articles abbreviate both courts as "SC" and merge the stories.
Should Scope A and Scope B be analyzed separately, listing the controlling decision, date, holding, and only the evidence that belongs to each scope? Should ambiguous evidence be placed in CTX_UNSCOPED/General and excluded from affecting either scope's verdict?
`.trim();

// ============================================================================
// ANALYSIS HELPERS
// ============================================================================

interface ScopeLeakAnalysis {
  scopeA: {
    id: string | null;
    name: string | null;
    factCount: number;
    facts: Array<{ id: string; fact: string; sourceTitle: string }>;
  };
  scopeB: {
    id: string | null;
    name: string | null;
    factCount: number;
    facts: Array<{ id: string; fact: string; sourceTitle: string }>;
  };
  unscoped: {
    factCount: number;
    facts: Array<{ id: string; fact: string; sourceTitle: string }>;
  };
  crossScopeCitations: Array<{
    factId: string;
    assignedScope: string;
    referencesOtherScope: string;
    sourceTitle: string;
  }>;
  passed: boolean;
}

function analyzeScopeLeak(
  result: Awaited<ReturnType<typeof runFactHarborAnalysis>>
): ScopeLeakAnalysis {
  const scopes = result.understanding?.distinctProceedings || [];
  const facts = result.facts || [];

  // Find Scope A and Scope B by looking for "Country A" and "Country B" in names
  const scopeA = scopes.find(
    (s) =>
      s.name.includes("Country A") ||
      s.name.includes("Scope A") ||
      s.shortName?.includes("Country A")
  );
  const scopeB = scopes.find(
    (s) =>
      s.name.includes("Country B") ||
      s.name.includes("Scope B") ||
      s.shortName?.includes("Country B")
  );

  // Get facts for each scope
  const scopeAFacts = scopeA
    ? facts.filter((f) => f.relatedProceedingId === scopeA.id)
    : [];
  const scopeBFacts = scopeB
    ? facts.filter((f) => f.relatedProceedingId === scopeB.id)
    : [];
  const unscopedFacts = facts.filter(
    (f) =>
      !f.relatedProceedingId ||
      f.relatedProceedingId === UNSCOPED_ID ||
      f.relatedProceedingId.toLowerCase().includes("unscoped") ||
      f.relatedProceedingId.toLowerCase().includes("general")
  );

  // Check for cross-scope citations
  const crossScopeCitations: ScopeLeakAnalysis["crossScopeCitations"] = [];

  // Check if Scope A facts reference Country B
  for (const fact of scopeAFacts) {
    const factText = fact.fact.toLowerCase();
    const sourceTitle = (fact.sourceTitle || "").toLowerCase();
    const sourceUrl = (fact.sourceUrl || "").toLowerCase();

    if (
      factText.includes("country b") ||
      sourceTitle.includes("country b") ||
      sourceUrl.includes("countryb")
    ) {
      crossScopeCitations.push({
        factId: fact.id,
        assignedScope: scopeA?.id || "unknown",
        referencesOtherScope: "Country B",
        sourceTitle: fact.sourceTitle || "",
      });
    }
  }

  // Check if Scope B facts reference Country A
  for (const fact of scopeBFacts) {
    const factText = fact.fact.toLowerCase();
    const sourceTitle = (fact.sourceTitle || "").toLowerCase();
    const sourceUrl = (fact.sourceUrl || "").toLowerCase();

    if (
      factText.includes("country a") ||
      sourceTitle.includes("country a") ||
      sourceUrl.includes("countrya")
    ) {
      crossScopeCitations.push({
        factId: fact.id,
        assignedScope: scopeB?.id || "unknown",
        referencesOtherScope: "Country A",
        sourceTitle: fact.sourceTitle || "",
      });
    }
  }

  return {
    scopeA: {
      id: scopeA?.id || null,
      name: scopeA?.name || null,
      factCount: scopeAFacts.length,
      facts: scopeAFacts.map((f) => ({
        id: f.id,
        fact: f.fact.substring(0, 100),
        sourceTitle: f.sourceTitle || "",
      })),
    },
    scopeB: {
      id: scopeB?.id || null,
      name: scopeB?.name || null,
      factCount: scopeBFacts.length,
      facts: scopeBFacts.map((f) => ({
        id: f.id,
        fact: f.fact.substring(0, 100),
        sourceTitle: f.sourceTitle || "",
      })),
    },
    unscoped: {
      factCount: unscopedFacts.length,
      facts: unscopedFacts.map((f) => ({
        id: f.id,
        fact: f.fact.substring(0, 100),
        sourceTitle: f.sourceTitle || "",
      })),
    },
    crossScopeCitations,
    passed: crossScopeCitations.length === 0,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Adversarial Scope Leak", () => {
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
      console.warn("[Adversarial Scope Leak] No LLM API keys found, tests will be skipped");
      testsEnabled = false;
    }

    // Set up output directory
    outputDir = path.join(webRoot, "test-output", "adversarial-scope-leak");
    fs.mkdirSync(outputDir, { recursive: true });
  });

  describe("Cross-scope citation prevention", () => {
    it(
      "no cross-scope citations (statement form)",
      async () => {
        if (!testsEnabled) {
          console.log("[Adversarial Scope Leak] Skipping - no API keys");
          return;
        }

        console.log("[Adversarial Scope Leak] Testing: Statement form");
        console.log(`  Input: "${ADVERSARIAL_INPUT_STATEMENT.substring(0, 80)}..."`);

        const result = await runFactHarborAnalysis({
          inputValue: ADVERSARIAL_INPUT_STATEMENT,
          inputType: "claim",
        });

        const analysis = analyzeScopeLeak(result);

        console.log("\n  Results:");
        console.log(`    Scope A: ${analysis.scopeA.id} - ${analysis.scopeA.factCount} facts`);
        console.log(`    Scope B: ${analysis.scopeB.id} - ${analysis.scopeB.factCount} facts`);
        console.log(`    Unscoped: ${analysis.unscoped.factCount} facts`);
        console.log(`    Cross-scope citations: ${analysis.crossScopeCitations.length}`);

        if (analysis.crossScopeCitations.length > 0) {
          console.log("\n  ⚠️ Cross-scope citations found:");
          for (const citation of analysis.crossScopeCitations) {
            console.log(
              `      ${citation.factId} (${citation.assignedScope}) references ${citation.referencesOtherScope}`
            );
          }
        }

        // Write detailed results
        fs.writeFileSync(
          path.join(outputDir, "statement-form-results.json"),
          JSON.stringify(
            {
              input: ADVERSARIAL_INPUT_STATEMENT,
              analysis,
              scopes: result.understanding?.distinctProceedings?.map((s) => ({
                id: s.id,
                name: s.name,
              })),
              totalFacts: result.facts?.length || 0,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        // PASS CRITERIA: No cross-scope citations
        expect(analysis.crossScopeCitations.length).toBe(0);
      },
      TEST_TIMEOUT_MS
    );

    it(
      "no cross-scope citations (question form)",
      async () => {
        if (!testsEnabled) {
          console.log("[Adversarial Scope Leak] Skipping - no API keys");
          return;
        }

        console.log("[Adversarial Scope Leak] Testing: Question form");
        console.log(`  Input: "${ADVERSARIAL_INPUT_QUESTION.substring(0, 80)}..."`);

        const result = await runFactHarborAnalysis({
          inputValue: ADVERSARIAL_INPUT_QUESTION,
          inputType: "claim",
        });

        const analysis = analyzeScopeLeak(result);

        console.log("\n  Results:");
        console.log(`    Scope A: ${analysis.scopeA.id} - ${analysis.scopeA.factCount} facts`);
        console.log(`    Scope B: ${analysis.scopeB.id} - ${analysis.scopeB.factCount} facts`);
        console.log(`    Unscoped: ${analysis.unscoped.factCount} facts`);
        console.log(`    Cross-scope citations: ${analysis.crossScopeCitations.length}`);

        // Write detailed results
        fs.writeFileSync(
          path.join(outputDir, "question-form-results.json"),
          JSON.stringify(
            {
              input: ADVERSARIAL_INPUT_QUESTION,
              analysis,
              scopes: result.understanding?.distinctProceedings?.map((s) => ({
                id: s.id,
                name: s.name,
              })),
              totalFacts: result.facts?.length || 0,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        // PASS CRITERIA: No cross-scope citations
        expect(analysis.crossScopeCitations.length).toBe(0);
      },
      TEST_TIMEOUT_MS
    );
  });

  describe("Ambiguous evidence handling", () => {
    it(
      "ambiguous evidence should be placed in CTX_UNSCOPED",
      async () => {
        if (!testsEnabled) {
          console.log("[Adversarial Scope Leak] Skipping - no API keys");
          return;
        }

        console.log("[Adversarial Scope Leak] Testing: Ambiguous evidence handling");

        const result = await runFactHarborAnalysis({
          inputValue: ADVERSARIAL_INPUT_STATEMENT,
          inputType: "claim",
        });

        const analysis = analyzeScopeLeak(result);

        console.log(`  Unscoped facts: ${analysis.unscoped.factCount}`);

        // If there's ambiguous evidence (facts that mention both countries or "SC"),
        // they should be in unscoped
        const allFacts = result.facts || [];
        const ambiguousFacts = allFacts.filter((f) => {
          const text = f.fact.toLowerCase();
          // Facts that mention SC without country specificity, or mention both
          const mentionsSC = text.includes(" sc ") || text.includes("supreme court");
          const mentionsA = text.includes("country a");
          const mentionsB = text.includes("country b");
          return (mentionsSC && !mentionsA && !mentionsB) || (mentionsA && mentionsB);
        });

        console.log(`  Ambiguous facts found: ${ambiguousFacts.length}`);

        // Check if ambiguous facts are properly categorized as unscoped
        for (const fact of ambiguousFacts) {
          const isUnscoped =
            !fact.relatedProceedingId ||
            fact.relatedProceedingId === "CTX_UNSCOPED" ||
            fact.relatedProceedingId.toLowerCase().includes("unscoped") ||
            fact.relatedProceedingId.toLowerCase().includes("general");

          if (!isUnscoped) {
            console.log(
              `  ⚠️ Ambiguous fact incorrectly scoped: ${fact.id} -> ${fact.relatedProceedingId}`
            );
          }
        }

        // Write results
        fs.writeFileSync(
          path.join(outputDir, "ambiguous-evidence-results.json"),
          JSON.stringify(
            {
              analysis,
              ambiguousFacts: ambiguousFacts.map((f) => ({
                id: f.id,
                fact: f.fact.substring(0, 150),
                relatedProceedingId: f.relatedProceedingId,
              })),
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        // This test is informational - ambiguous evidence handling is a goal, not yet enforced
        console.log("  Note: Ambiguous evidence handling is tracked but not yet enforced");
      },
      TEST_TIMEOUT_MS
    );
  });

  describe("Input neutrality on adversarial input", () => {
    it(
      "question and statement forms produce consistent scope detection",
      async () => {
        if (!testsEnabled) {
          console.log("[Adversarial Scope Leak] Skipping - no API keys");
          return;
        }

        console.log("[Adversarial Scope Leak] Testing: Q/S consistency on adversarial input");

        // Read from previous test results if available
        const statementPath = path.join(outputDir, "statement-form-results.json");
        const questionPath = path.join(outputDir, "question-form-results.json");

        if (fs.existsSync(statementPath) && fs.existsSync(questionPath)) {
          const statementResults = JSON.parse(fs.readFileSync(statementPath, "utf-8"));
          const questionResults = JSON.parse(fs.readFileSync(questionPath, "utf-8"));

          const statementScopeCount = statementResults.scopes?.length || 0;
          const questionScopeCount = questionResults.scopes?.length || 0;

          console.log(`  Statement form scopes: ${statementScopeCount}`);
          console.log(`  Question form scopes: ${questionScopeCount}`);

          // Both forms should detect similar number of scopes (within 1)
          expect(Math.abs(statementScopeCount - questionScopeCount)).toBeLessThanOrEqual(1);
        } else {
          console.log("  Previous test results not found - skipping comparison");
        }
      },
      10_000
    );
  });
});
