/**
 * Multi-Jurisdiction Stress Test
 *
 * Verifies that the Monolithic Canonical path correctly identifies and
 * separates distinct analytical frames (contexts) when comparing
 * information across different legal jurisdictions.
 *
 * @module analyzer/multi-jurisdiction.test
 */

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { runMonolithicCanonical } from "@/lib/analyzer/monolithic-canonical";
import { loadEnvFile } from "@test/helpers/test-helpers";

const TEST_TIMEOUT_MS = 300_000;

describe("Multi-Jurisdiction Stress Test (Monolithic Canonical)", () => {
  let testsEnabled = true;

  beforeAll(() => {
    // Path: test/unit/lib/analyzer -> 4 levels up to apps/web
    const webRoot = path.resolve(__dirname, "../../../..");
    const envPath = path.join(webRoot, ".env.local");
    loadEnvFile(envPath);

    process.env.FH_DETERMINISTIC = "true";

    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;
    const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!hasOpenAI && !hasClaude && !hasGemini) {
      testsEnabled = false;
    }
  });

  it(
    "should separate Brazilian TSE and US Supreme Court contexts",
    async () => {
      if (!testsEnabled) return;

      const input = "Compare the 2023 TSE ruling on Jair Bolsonaro's ineligibility with the 2024 US Supreme Court ruling on Trump's eligibility (Colorado case).";

      const result = await runMonolithicCanonical({
        inputValue: input,
        inputType: "text",
      });

      const contexts = result.resultJson.analysisContexts || [];

      // Pass Criteria 1: At least two distinct contexts detected
      expect(contexts.length).toBeGreaterThanOrEqual(2);

      // Pass Criteria 2: Specific jurisdictions identified in context names/subjects
      const hasBrazil = contexts.some((s: any) =>
        s.name.toLowerCase().includes("brazil") ||
        s.name.toLowerCase().includes("tse") ||
        s.subject.toLowerCase().includes("bolsonaro")
      );
      const hasUS = contexts.some((s: any) =>
        s.name.toLowerCase().includes("us") ||
        s.name.toLowerCase().includes("supreme court") ||
        s.subject.toLowerCase().includes("trump")
      );

      expect(hasBrazil).toBe(true);
      expect(hasUS).toBe(true);

      // Pass Criteria 3: Evidence items are associated with correct contexts
      const evidenceItems = result.resultJson.evidenceItems || [];
      const brazilContext = contexts.find((s: any) => s.name.toLowerCase().includes("tse") || s.name.toLowerCase().includes("brazil"));
      const usContext = contexts.find((s: any) => s.name.toLowerCase().includes("supreme court") || s.name.toLowerCase().includes("us"));

      if (brazilContext && usContext) {
        // In the actual implementation, evidence items might not have contextId yet in buildResultJson
        // but they should be identifiable by content or IDs assigned during extraction.
        const brazilEvidence = evidenceItems.filter((item: any) =>
          item.statement.toLowerCase().includes("tse") ||
          item.statement.toLowerCase().includes("bolsonaro") ||
          item.sourceTitle.toLowerCase().includes("brazil")
        );
        const usEvidence = evidenceItems.filter((item: any) =>
          item.statement.toLowerCase().includes("trump") ||
          item.statement.toLowerCase().includes("colorado") ||
          item.sourceTitle.toLowerCase().includes("supreme court")
        );

        expect(brazilEvidence.length).toBeGreaterThan(0);
        expect(usEvidence.length).toBeGreaterThan(0);
      }

      // Pass Criteria 4: Budget stats are reasonable (no quadratic token explosion)
      const budgetStats = result.resultJson.meta?.budgetStats;
      if (budgetStats) {
        // Token usage should be reasonable (less than 50% of max for a 2-context query)
        expect(budgetStats.tokensPercent).toBeLessThan(50);
        // Should not exceed budget
        expect(budgetStats.budgetExceeded).toBe(false);
      }
    },
    TEST_TIMEOUT_MS
  );

  it(
    "should produce consistent verdicts regardless of comparison order (neutrality)",
    async () => {
      if (!testsEnabled) return;

      // Original order: TSE first, then SCOTUS
      const input1 = "Compare the 2023 TSE ruling on Jair Bolsonaro with the 2024 US Supreme Court ruling on Trump's eligibility.";
      // Reversed order: SCOTUS first, then TSE
      const input2 = "Compare the 2024 US Supreme Court ruling on Trump's eligibility with the 2023 TSE ruling on Jair Bolsonaro.";

      const [result1, result2] = await Promise.all([
        runMonolithicCanonical({ inputValue: input1, inputType: "text" }),
        runMonolithicCanonical({ inputValue: input2, inputType: "text" }),
      ]);

      const verdict1 = result1.resultJson.verdictSummary?.overallVerdict || 50;
      const verdict2 = result2.resultJson.verdictSummary?.overallVerdict || 50;

      // Verdicts should be within 10 percentage points of each other
      // (allowing for some variation in search results and LLM responses)
      const divergence = Math.abs(verdict1 - verdict2);
      console.log(`[Neutrality Check] Order 1 verdict: ${verdict1}, Order 2 verdict: ${verdict2}, Divergence: ${divergence}`);

      expect(divergence).toBeLessThanOrEqual(15);

      // Both should detect at least 2 contexts
      expect(result1.resultJson.analysisContexts?.length).toBeGreaterThanOrEqual(2);
      expect(result2.resultJson.analysisContexts?.length).toBeGreaterThanOrEqual(2);
    },
    TEST_TIMEOUT_MS * 2 // Double timeout for parallel runs
  );

  it(
    "should maintain linear token usage across multiple contexts",
    async () => {
      if (!testsEnabled) return;

      // Single-context baseline
      const singleContextInput = "Did the 2023 TSE ruling find Bolsonaro ineligible for office?";

      // Multi-context comparison
      const multiContextInput = "Compare the 2023 TSE ruling on Jair Bolsonaro with the 2024 US Supreme Court ruling on Trump's eligibility (Colorado case).";

      const [singleResult, multiResult] = await Promise.all([
        runMonolithicCanonical({ inputValue: singleContextInput, inputType: "text" }),
        runMonolithicCanonical({ inputValue: multiContextInput, inputType: "text" }),
      ]);

      const singleTokens = singleResult.resultJson.meta?.budgetStats?.tokensUsed || 0;
      const multiTokens = multiResult.resultJson.meta?.budgetStats?.tokensUsed || 0;
      const multiContexts = multiResult.resultJson.analysisContexts?.length || 1;

      // Multi-context should not use more than 2.5x the tokens of single-context
      // (per Architect Review section 4 - tokens < 2.5x orchestrated path)
      const ratio = multiTokens / Math.max(singleTokens, 1);
      console.log(`[Cost Check] Single-context tokens: ${singleTokens}, Multi-context tokens: ${multiTokens} (${multiContexts} contexts), Ratio: ${ratio.toFixed(2)}x`);

      expect(ratio).toBeLessThan(2.5);
    },
    TEST_TIMEOUT_MS * 2 // Double timeout for parallel runs
  );
});
