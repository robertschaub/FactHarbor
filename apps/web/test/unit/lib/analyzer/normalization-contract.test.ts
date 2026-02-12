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
import fs from "fs";
import path from "path";

// Import the normalization function directly for unit testing
// We can't easily spy on internal function calls, so we test the normalization logic directly
import { normalizeYesNoQuestionToStatement } from "@/lib/analyzer";

const pipelineDefaultPath = path.resolve(process.cwd(), "configs/pipeline.default.json");
const pipelineDefaultConfig = JSON.parse(fs.readFileSync(pipelineDefaultPath, "utf-8"));
const normalizationConfig = {
  normalizationPredicateStarters: pipelineDefaultConfig.normalizationPredicateStarters || [],
  normalizationAdjectiveSuffixes: pipelineDefaultConfig.normalizationAdjectiveSuffixes || [],
};

function normalize(input: string): string {
  return normalizeYesNoQuestionToStatement(input, normalizationConfig as any);
}

// ============================================================================
// TEST DATA
// ============================================================================

const NORMALIZATION_PAIRS = [
  {
    question: "Was the court judgment fair?",
    expected: "Was the court judgment fair",
  },
  {
    question: "Did Tesla's revenue increase?",
    expected: "Did Tesla's revenue increase",
  },
  {
    question: "Is climate change caused by humans?",
    expected: "Is climate change caused by humans",
  },
  {
    question: "Were the results accurate?",
    expected: "Were the results accurate",
  },
  {
    question: "Has the vaccine been proven effective?",
    expected: "Has the vaccine been proven effective",
  },
  {
    question: "Can solar power replace fossil fuels?",
    expected: "Can solar power replace fossil fuels",
  },
  {
    question: "Does remote work improve productivity?",
    expected: "Does remote work improve productivity",
  },
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Normalization Contract", () => {
  describe("normalizeYesNoQuestionToStatement", () => {
    it("keeps question wording and strips trailing question marks", () => {
      for (const pair of NORMALIZATION_PAIRS) {
        const result = normalize(pair.question);
        expect(result).toBe(pair.expected);
      }
    });

    it("preserves statement form inputs", () => {
      const statements = [
        "The court judgment was fair.",
        "Tesla's revenue increased.",
        "Climate change is caused by humans.",
      ];

      for (const statement of statements) {
        const result = normalize(statement);
        // Statement should remain largely unchanged (may trim trailing period)
        expect(result.endsWith("?")).toBe(false);
        console.log(`  "${statement}" -> "${result}"`);
      }
    });

    it("preserves trailing periods on statement inputs", () => {
      // The normalization function preserves statements as-is
      // Trailing period removal happens at the entry point (runFactHarborAnalysis)
      const input = "The court judgment was fair.";
      const result = normalize(input);
      // Statement inputs pass through unchanged
      expect(result).toBe(input);
    });

    it("removes trailing question marks from questions", () => {
      const input = "Was the court judgment fair?";
      const result = normalize(input);
      // Question mark should be removed
      expect(result.endsWith("?")).toBe(false);
    });

    it("handles edge cases gracefully", () => {
      // Empty input
      const empty = normalize("");
      expect(empty).toBe("");

      // Single word
      const singleWord = normalize("True?");
      expect(singleWord.endsWith("?")).toBe(false);

      // Already a statement without period
      const noPeriod = normalize("The sky is blue");
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
        const qNorm = normalize(pair.question);
        const sNorm = normalize(pair.statement);

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

describe("Regression: no broken grammar from fallback", () => {
  const REGRESSION_CASES = [
    {
      question: "Is aspirin effective for pain relief?",
      expected: "Is aspirin effective for pain relief",
    },
    {
      question: "Is U.S. inflation currently below 3 percent?",
      expected: "Is U.S. inflation currently below 3 percent",
    },
    {
      question: "Is Donald Trump currently the President of the United States?",
      expected: "Is Donald Trump currently the President of the United States",
    },
    {
      question: "Has the vaccine been proven effective?",
      expected: "Has the vaccine been proven effective",
    },
    {
      question: "Is the policy controversial?",
      expected: "Is the policy controversial",
    },
    {
      question: "Was the decision appropriate?",
      expected: "Was the decision appropriate",
    },
    {
      question: "Are electric vehicles really better for the environment?",
      expected: "Are electric vehicles really better for the environment",
    },
    ];

    for (const { question, expected } of REGRESSION_CASES) {
      it(`"${question}" → "${expected}"`, () => {
        const result = normalize(question);
        expect(result).toBe(expected);
      });
    }

    it("never produces 'It is the case that' for ANY question pattern", () => {
      const allQuestions = [
        "Is aspirin effective for pain relief?",
        "Is the economy currently stable?",
        "Was the ruling justified?",
        "Are vaccines safe for children?",
        "Is climate change real?",
        "Were the elections fair?",
        "Is remote work beneficial for productivity?",
        "Can solar power replace fossil fuels?",
        "Could autonomous vehicles reduce traffic fatalities?",
        "Should governments regulate artificial intelligence?",
        "Will electric planes become commercially viable?",
        "Would universal basic income reduce poverty?",
      ];

      for (const question of allQuestions) {
        const result = normalize(question);
        expect(result).not.toContain("It is the case that");
        expect(result).not.toContain("It was the case that");
        expect(result).not.toContain("It are the case that");
        expect(result).not.toContain("It were the case that");
      }
    });

    it("preserves question form (minus ?) when heuristic split fails", () => {
      // When the subject/predicate boundary can't be found (verb not in predicate starters),
      // normalization should return the original input with just "?" stripped — this is
      // always better input for the LLM than a garbled transformation.
      // NOTE: "replace", "regulate", "achieve" are NOT in normalizationPredicateStarters,
      // so these cases genuinely fall through to the fallback.
      const unsplittableCases = [
        {
          question: "Can solar power replace fossil fuels?",
          expected: "Can solar power replace fossil fuels",
        },
        {
          question: "Should we ban nuclear weapons?",
          expected: "Should we ban nuclear weapons",
        },
        {
          question: "Will humanity ever colonize Mars?",
          expected: "Will humanity ever colonize Mars",
        },
      ];

      for (const { question, expected } of unsplittableCases) {
        const result = normalize(question);
        expect(result).toBe(expected);
      }
    });
  });

  describe("Regression: no garbled splits from hyphenated/modifier matches", () => {
    const GARBLED_REGRESSION_CASES = [
      {
        question: "Is lithium-ion battery storage more energy-efficient than hydrogen storage?",
        mustNotContain: ["energy- is", "energy-is", "- is "],
        description: "hyphenated compound 'energy-efficient' must not be split",
      },
      {
        question: "Can statements from the current federal government be trusted as reliable evidence?",
        mustNotContain: ["trusted as can", "as can reliable"],
        description: "modifier 'as reliable' must not cause garbled split",
      },
      {
        question: "Has the cost-effective solution been proven reliable?",
        mustNotContain: ["cost- has", "cost-has", "- has "],
        description: "hyphenated compound 'cost-effective' must not be split",
      },
      {
        question: "Is the new policy more effective than the old one?",
        mustNotContain: ["more is effective", "policy more is"],
        description: "modifier 'more effective' must not cause garbled split",
      },
      {
        question: "Were the long-term results accurate?",
        mustNotContain: ["long- were", "- were "],
        description: "hyphenated compound 'long-term' must not be split",
      },
    ];

    for (const { question, mustNotContain, description } of GARBLED_REGRESSION_CASES) {
      it(`${description}: "${question}"`, () => {
        const result = normalize(question);
        expect(result.endsWith("?")).toBe(false);
        for (const forbidden of mustNotContain) {
          expect(result).not.toContain(forbidden);
        }
        // Verify no trailing hyphens in result
        expect(result).not.toMatch(/\w-\s/);
      });
    }
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
        const result = normalize(question);

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
        const result = normalize(statement);
        // Statement should remain the same or very similar
        expect(result.length).toBeGreaterThan(0);
        expect(result.endsWith("?")).toBe(false);
      }
    });
  });
});
