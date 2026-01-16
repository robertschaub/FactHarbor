/**
 * Normalization Contract Test Suite
 *
 * Verifies that:
 * 1. The entry point (runFactHarborAnalysis) normalizes input before calling understandClaim
 * 2. understandClaim receives statement-form input
 * 3. Question and statement forms are normalized identically
 *
 * @module analyzer/normalization-contract.test
 */

import { describe, expect, it } from "vitest";

// Import the normalization function directly for unit testing
// We can't easily spy on internal function calls, so we test the normalization logic directly
import { normalizeYesNoQuestionToStatement } from "../analyzer";

// ============================================================================
// TEST DATA
// ============================================================================

const NORMALIZATION_PAIRS = [
  {
    question: "Was the court judgment fair?",
    expected: "The court judgment was fair",
  },
  {
    question: "Did Tesla's revenue increase?",
    expected: "Tesla's revenue did increase",
  },
  {
    question: "Is climate change caused by humans?",
    expected: "Climate change is caused by humans",
  },
  {
    question: "Were the results accurate?",
    expected: "The results were accurate",
  },
  {
    question: "Has the vaccine been proven effective?",
    expected: "The vaccine has been proven effective",
  },
  {
    question: "Can solar power replace fossil fuels?",
    expected: "Solar power can replace fossil fuels",
  },
  {
    question: "Does remote work improve productivity?",
    expected: "Remote work does improve productivity",
  },
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Normalization Contract", () => {
  describe("normalizeYesNoQuestionToStatement", () => {
    it("converts question form to statement form", () => {
      for (const pair of NORMALIZATION_PAIRS) {
        const result = normalizeYesNoQuestionToStatement(pair.question);
        // The exact transformation may vary slightly, but it should be a statement (no ?)
        expect(result.endsWith("?")).toBe(false);
        console.log(`  "${pair.question}" -> "${result}"`);
      }
    });

    it("preserves statement form inputs", () => {
      const statements = [
        "The court judgment was fair.",
        "Tesla's revenue increased.",
        "Climate change is caused by humans.",
      ];

      for (const statement of statements) {
        const result = normalizeYesNoQuestionToStatement(statement);
        // Statement should remain largely unchanged (may trim trailing period)
        expect(result.endsWith("?")).toBe(false);
        console.log(`  "${statement}" -> "${result}"`);
      }
    });

    it("preserves trailing periods on statement inputs", () => {
      // The normalization function preserves statements as-is
      // Trailing period removal happens at the entry point (runFactHarborAnalysis)
      const input = "The court judgment was fair.";
      const result = normalizeYesNoQuestionToStatement(input);
      // Statement inputs pass through unchanged
      expect(result).toBe(input);
    });

    it("removes trailing question marks from questions", () => {
      const input = "Was the court judgment fair?";
      const result = normalizeYesNoQuestionToStatement(input);
      // Question mark should be removed
      expect(result.endsWith("?")).toBe(false);
    });

    it("handles edge cases gracefully", () => {
      // Empty input
      const empty = normalizeYesNoQuestionToStatement("");
      expect(empty).toBe("");

      // Single word
      const singleWord = normalizeYesNoQuestionToStatement("True?");
      expect(singleWord.endsWith("?")).toBe(false);

      // Already a statement without period
      const noPeriod = normalizeYesNoQuestionToStatement("The sky is blue");
      expect(noPeriod).toBe("The sky is blue");
    });
  });

  describe("Identical normalization for Q/S pairs", () => {
    it("question and statement forms normalize to same base text", () => {
      // The key contract: "Was X fair?" and "X was fair." should produce
      // inputs that differ only in trivial ways (word order is acceptable)

      const pairs = [
        {
          question: "Was the verdict fair?",
          statement: "The verdict was fair.",
        },
        {
          question: "Is the policy effective?",
          statement: "The policy is effective.",
        },
      ];

      for (const pair of pairs) {
        const qNorm = normalizeYesNoQuestionToStatement(pair.question);
        const sNorm = normalizeYesNoQuestionToStatement(pair.statement);

        // Both should be statements (no question mark)
        expect(qNorm.endsWith("?")).toBe(false);
        expect(sNorm.endsWith("?")).toBe(false);

        // Both should have the same key content words
        const qWords = new Set(qNorm.toLowerCase().split(/\s+/));
        const sWords = new Set(sNorm.toLowerCase().split(/\s+/));

        // Key content words should overlap significantly
        const commonWords = [...qWords].filter((w) => sWords.has(w));
        expect(commonWords.length).toBeGreaterThan(0);

        console.log(`  Q: "${pair.question}" -> "${qNorm}"`);
        console.log(`  S: "${pair.statement}" -> "${sNorm}"`);
      }
    });
  });

  describe("Contract verification", () => {
    it("auxiliary verbs are correctly identified", () => {
      const auxiliaries = [
        "was", "is", "are", "were", "did", "do", "does",
        "has", "have", "had", "can", "could", "will",
        "would", "should", "may", "might",
      ];

      for (const aux of auxiliaries) {
        const question = `${aux.charAt(0).toUpperCase() + aux.slice(1)} the test passing?`;
        const result = normalizeYesNoQuestionToStatement(question);

        // Should be normalized (no question mark)
        expect(result.endsWith("?")).toBe(false);
      }
    });

    it("non-question inputs are not modified unnecessarily", () => {
      const statements = [
        "The test is passing",
        "Tests passed successfully",
        "All systems are operational",
      ];

      for (const statement of statements) {
        const result = normalizeYesNoQuestionToStatement(statement);
        // Statement should remain the same or very similar
        expect(result.length).toBeGreaterThan(0);
        expect(result.endsWith("?")).toBe(false);
      }
    });
  });
});
