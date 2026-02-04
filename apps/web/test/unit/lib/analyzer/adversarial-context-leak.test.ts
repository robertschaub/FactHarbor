/**
 * Adversarial Context Leak Test Suite
 *
 * Tests the pipeline's ability to prevent cross-context citation bleeding
 * when given intentionally confusing inputs with similar identifiers.
 *
 * Pass criteria:
 * - No cross-context citations (Context A verdict must not cite Context B evidenceItems)
 * - Ambiguous evidence goes to CTX_UNASSIGNED and is excluded from aggregation
 * - Input neutrality maintained (question vs statement forms produce same results)
 *
 * @module analyzer/adversarial-context-leak.test
 */

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { runFactHarborAnalysis } from "@/lib/analyzer";
import { UNASSIGNED_CONTEXT_ID } from "@/lib/analyzer/analysis-contexts";
import { loadEnvFile } from "@test/helpers/test-helpers";

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_TIMEOUT_MS = 300_000; // 5 minutes per test (these are complex)
const FULL_SUITE_TIMEOUT_MS = 900_000; // 15 minutes for full adversarial suite

// ============================================================================
// TEST DATA (from Handover document)
// ============================================================================

/**
 * Adversarial input designed to test context separation.
 * Two legal contexts share confusing identifiers (same case number, similar abbreviations).
 */
const ADVERSARIAL_INPUT_STATEMENT = `
Two legal contexts share confusing identifiers.
Context A: Supreme Court of Country A, Case 2024-017, about whether Policy P violates Statute S.
Context B: Supreme Court of Country B, Case 2024-017, about whether Policy P complies with Statute S.
Some articles abbreviate both courts as "SC" and merge the stories.
Task: Analyze Context A and Context B separately. For each context, list the controlling decision, date, holding, and only the evidence that belongs to that context. If evidence is ambiguous, place it in CTX_UNASSIGNED/General and do not let it affect either context's verdict.
`.trim();

const ADVERSARIAL_INPUT_QUESTION = `
Was it true that two legal contexts share confusing identifiers?
Context A: Supreme Court of Country A, Case 2024-017, about whether Policy P violates Statute S.
Context B: Supreme Court of Country B, Case 2024-017, about whether Policy P complies with Statute S.
Some articles abbreviate both courts as "SC" and merge the stories.
Should Context A and Context B be analyzed separately, listing the controlling decision, date, holding, and only the evidence that belongs to each context? Should ambiguous evidence be placed in CTX_UNASSIGNED/General and excluded from affecting either context's verdict?
`.trim();

// ============================================================================
// ANALYSIS HELPERS
// ============================================================================

interface ContextLeakAnalysis {
  contextA: {
    id: string | null;
    name: string | null;
    evidenceItemCount: number;
    evidenceItems: Array<{ id: string; statement: string; sourceTitle: string }>;
  };
  contextB: {
    id: string | null;
    name: string | null;
    evidenceItemCount: number;
    evidenceItems: Array<{ id: string; statement: string; sourceTitle: string }>;
  };
  unassigned: {
    evidenceItemCount: number;
    evidenceItems: Array<{ id: string; statement: string; sourceTitle: string }>;
  };
  crossContextCitations: Array<{
    evidenceItemId: string;
    assignedContext: string;
    referencesOtherContext: string;
    sourceTitle: string;
  }>;
  passed: boolean;
}

function analyzeContextLeak(
  result: Awaited<ReturnType<typeof runFactHarborAnalysis>>
): ContextLeakAnalysis {
  const contexts = result.resultJson.understanding?.analysisContexts || [];
  const evidenceItems = result.resultJson.evidenceItems || [];

  // Find Context A and Context B by looking for "Country A" and "Country B" in names
  const contextA = contexts.find(
    (s) =>
      s.name.includes("Country A") ||
      s.name.includes("Context A") ||
      s.shortName?.includes("Country A")
  );
  const contextB = contexts.find(
    (s) =>
      s.name.includes("Country B") ||
      s.name.includes("Context B") ||
      s.shortName?.includes("Country B")
  );

  // Get evidenceItems for each context
  const contextAEvidence = contextA
    ? evidenceItems.filter((item) => item.contextId === contextA.id)
    : [];
  const contextBEvidence = contextB
    ? evidenceItems.filter((item) => item.contextId === contextB.id)
    : [];
  const unassignedEvidence = evidenceItems.filter(
    (item) =>
      !item.contextId ||
      item.contextId === UNASSIGNED_CONTEXT_ID ||
      String(item.contextId || "").toLowerCase().includes("unassigned") ||
      String(item.contextId || "").toLowerCase().includes("general")
  );

  // Check for cross-context citations
  const crossContextCitations: ContextLeakAnalysis["crossContextCitations"] = [];

  // Check if Context A evidenceItems reference Country B
  for (const evidenceItem of contextAEvidence) {
    const evidenceItemText = String((evidenceItem as any).statement ?? (evidenceItem as any).evidenceItem ?? "").toLowerCase();
    const sourceTitle = (evidenceItem.sourceTitle || "").toLowerCase();
    const sourceUrl = (evidenceItem.sourceUrl || "").toLowerCase();

    if (
      evidenceItemText.includes("country b") ||
      sourceTitle.includes("country b") ||
      sourceUrl.includes("countryb")
    ) {
      crossContextCitations.push({
        evidenceItemId: evidenceItem.id,
        assignedContext: contextA?.id || "unknown",
        referencesOtherContext: "Country B",
        sourceTitle: evidenceItem.sourceTitle || "",
      });
    }
  }

  // Check if Context B evidenceItems reference Country A
  for (const evidenceItem of contextBEvidence) {
    const evidenceItemText = String((evidenceItem as any).statement ?? (evidenceItem as any).evidenceItem ?? "").toLowerCase();
    const sourceTitle = (evidenceItem.sourceTitle || "").toLowerCase();
    const sourceUrl = (evidenceItem.sourceUrl || "").toLowerCase();

    if (
      evidenceItemText.includes("country a") ||
      sourceTitle.includes("country a") ||
      sourceUrl.includes("countrya")
    ) {
      crossContextCitations.push({
        evidenceItemId: evidenceItem.id,
        assignedContext: contextB?.id || "unknown",
        referencesOtherContext: "Country A",
        sourceTitle: evidenceItem.sourceTitle || "",
      });
    }
  }

  return {
    contextA: {
      id: contextA?.id || null,
      name: contextA?.name || null,
      evidenceItemCount: contextAEvidence.length,
      evidenceItems: contextAEvidence.map((item) => ({
        id: item.id,
        statement: String((item as any).statement ?? (item as any).evidenceItem ?? "").substring(0, 100),
        sourceTitle: item.sourceTitle || "",
      })),
    },
    contextB: {
      id: contextB?.id || null,
      name: contextB?.name || null,
      evidenceItemCount: contextBEvidence.length,
      evidenceItems: contextBEvidence.map((item) => ({
        id: item.id,
        statement: String((item as any).statement ?? (item as any).evidenceItem ?? "").substring(0, 100),
        sourceTitle: item.sourceTitle || "",
      })),
    },
    unassigned: {
      evidenceItemCount: unassignedEvidence.length,
      evidenceItems: unassignedEvidence.map((item) => ({
        id: item.id,
        statement: String((item as any).statement ?? (item as any).evidenceItem ?? "").substring(0, 100),
        sourceTitle: item.sourceTitle || "",
      })),
    },
    crossContextCitations,
    passed: crossContextCitations.length === 0,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Adversarial Context Leak", () => {
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
      console.warn("[Adversarial Context Leak] No LLM API keys found, tests will be skipped");
      testsEnabled = false;
    }

    // Set up output directory
    outputDir = path.join(webRoot, "test-output", "adversarial-context-leak");
    fs.mkdirSync(outputDir, { recursive: true });
  });

  describe("Cross-context citation prevention", () => {
    it(
      "no cross-context citations (statement form)",
      async () => {
        if (!testsEnabled) {
          console.log("[Adversarial Context Leak] Skipping - no API keys");
          return;
        }

        console.log("[Adversarial Context Leak] Testing: Statement form");
        console.log(`  Input: "${ADVERSARIAL_INPUT_STATEMENT.substring(0, 80)}..."`);

        const result = await runFactHarborAnalysis({
          inputValue: ADVERSARIAL_INPUT_STATEMENT,
          inputType: "claim",
        });

        const analysis = analyzeContextLeak(result);

        console.log("\n  Results:");
        console.log(`    Context A: ${analysis.contextA.id} - ${analysis.contextA.evidenceItemCount} evidenceItems`);
        console.log(`    Context B: ${analysis.contextB.id} - ${analysis.contextB.evidenceItemCount} evidenceItems`);
        console.log(`    Unassigned: ${analysis.unassigned.evidenceItemCount} evidenceItems`);
        console.log(`    Cross-context citations: ${analysis.crossContextCitations.length}`);

        if (analysis.crossContextCitations.length > 0) {
          console.log("\n  ⚠️ Cross-context citations found:");
          for (const citation of analysis.crossContextCitations) {
            console.log(
              `      ${citation.evidenceItemId} (${citation.assignedContext}) references ${citation.referencesOtherContext}`
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
              contexts: (result.resultJson.understanding?.analysisContexts || []).map((s) => ({
                id: s.id,
                name: s.name,
              })),
              totalEvidenceItems: (result.resultJson.evidenceItems || []).length,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        // PASS CRITERIA: No cross-context citations
        expect(analysis.crossContextCitations.length).toBe(0);
      },
      TEST_TIMEOUT_MS
    );

    it(
      "no cross-context citations (question form)",
      async () => {
        if (!testsEnabled) {
          console.log("[Adversarial Context Leak] Skipping - no API keys");
          return;
        }

        console.log("[Adversarial Context Leak] Testing: Question form");
        console.log(`  Input: "${ADVERSARIAL_INPUT_QUESTION.substring(0, 80)}..."`);

        const result = await runFactHarborAnalysis({
          inputValue: ADVERSARIAL_INPUT_QUESTION,
          inputType: "claim",
        });

        const analysis = analyzeContextLeak(result);

        console.log("\n  Results:");
        console.log(`    Context A: ${analysis.contextA.id} - ${analysis.contextA.evidenceItemCount} evidenceItems`);
        console.log(`    Context B: ${analysis.contextB.id} - ${analysis.contextB.evidenceItemCount} evidenceItems`);
        console.log(`    Unassigned: ${analysis.unassigned.evidenceItemCount} evidenceItems`);
        console.log(`    Cross-context citations: ${analysis.crossContextCitations.length}`);

        // Write detailed results
        fs.writeFileSync(
          path.join(outputDir, "question-form-results.json"),
          JSON.stringify(
            {
              input: ADVERSARIAL_INPUT_QUESTION,
              analysis,
              contexts: (result.resultJson.understanding?.analysisContexts || []).map((s) => ({
                id: s.id,
                name: s.name,
              })),
              totalEvidenceItems: (result.resultJson.evidenceItems || []).length,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        // PASS CRITERIA: No cross-context citations
        expect(analysis.crossContextCitations.length).toBe(0);
      },
      TEST_TIMEOUT_MS
    );
  });

  describe("Ambiguous evidence handling", () => {
    it(
      "ambiguous evidence should be placed in CTX_UNASSIGNED",
      async () => {
        if (!testsEnabled) {
          console.log("[Adversarial Context Leak] Skipping - no API keys");
          return;
        }

        console.log("[Adversarial Context Leak] Testing: Ambiguous evidence handling");

        const result = await runFactHarborAnalysis({
          inputValue: ADVERSARIAL_INPUT_STATEMENT,
          inputType: "claim",
        });

        const analysis = analyzeContextLeak(result);

        console.log(`  Unassigned evidence items: ${analysis.unassigned.evidenceItemCount}`);

        // If there's ambiguous evidence (evidenceItems that mention both countries or "SC"),
        // they should be in unassigned
        const allEvidenceItems = result.resultJson?.evidenceItems || result.evidenceItems || [];
        const ambiguousEvidenceItems = allEvidenceItems.filter((item) => {
          const text = String((item as any).statement ?? (item as any).evidenceItem ?? "").toLowerCase();
          // Evidence items that mention SC without country specificity, or mention both
          const mentionsSC = text.includes(" sc ") || text.includes("supreme court");
          const mentionsA = text.includes("country a");
          const mentionsB = text.includes("country b");
          return (mentionsSC && !mentionsA && !mentionsB) || (mentionsA && mentionsB);
        });

        console.log(`  Ambiguous evidence items found: ${ambiguousEvidenceItems.length}`);

        // Check if ambiguous evidenceItems are properly categorized as unassigned
        for (const evidenceItem of ambiguousEvidenceItems) {
          const contextId = evidenceItem.contextId;
          const isUnassigned =
            !contextId ||
            contextId === UNASSIGNED_CONTEXT_ID ||
            contextId.toLowerCase().includes("unassigned") ||
            contextId.toLowerCase().includes("general");

          if (!isUnassigned) {
            console.log(
              `  ⚠️ Ambiguous evidence item incorrectly assigned to context: ${evidenceItem.id} -> ${contextId}`
            );
          }
        }

        // Write results
        fs.writeFileSync(
          path.join(outputDir, "ambiguous-evidence-results.json"),
          JSON.stringify(
            {
              analysis,
              ambiguousEvidenceItems: ambiguousEvidenceItems.map((item) => ({
                id: item.id,
                statement: String((item as any).statement ?? (item as any).evidenceItem ?? "").substring(0, 150),
                contextId: item.contextId,
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
      "question and statement forms produce consistent context detection",
      async () => {
        if (!testsEnabled) {
          console.log("[Adversarial Context Leak] Skipping - no API keys");
          return;
        }

        console.log("[Adversarial Context Leak] Testing: Q/S consistency on adversarial input");

        // Read from previous test results if available
        const statementPath = path.join(outputDir, "statement-form-results.json");
        const questionPath = path.join(outputDir, "question-form-results.json");

        if (fs.existsSync(statementPath) && fs.existsSync(questionPath)) {
          const statementResults = JSON.parse(fs.readFileSync(statementPath, "utf-8"));
          const questionResults = JSON.parse(fs.readFileSync(questionPath, "utf-8"));

          const statementContextCount = statementResults.contexts?.length || 0;
          const questionContextCount = questionResults.contexts?.length || 0;

          console.log(`  Statement form contexts: ${statementContextCount}`);
          console.log(`  Question form contexts: ${questionContextCount}`);

          // Both forms should detect similar number of contexts (within 1)
          expect(Math.abs(statementContextCount - questionContextCount)).toBeLessThanOrEqual(1);
        } else {
          console.log("  Previous test results not found - skipping comparison");
        }
      },
      10_000
    );
  });
});
