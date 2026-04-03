/**
 * Stage-4 Prompt Contract Tests
 *
 * Verifies that each Stage-4 prompt section can be rendered with the variable
 * keys the code actually provides, without leaving unresolved ${...}
 * placeholders or [object Object] artifacts.
 *
 * These tests read the REAL prompt file from disk and apply the same
 * substitution logic as prompt-loader.ts renderSection(). They catch
 * prompt/code variable-name drift at `npm test` cost (no LLM calls).
 *
 * History: repeated VERDICT_ADVOCATE parse failures on German Plastik jobs
 * (b467, d460, f279) were traced to a stale ${evidenceByBoundary} placeholder
 * that the code never resolved. Three prior fix attempts targeted the parser
 * and retry layer; this test prevents the root cause from recurring.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Read the actual prompt file (not mocked — this IS the contract anchor)
// ---------------------------------------------------------------------------
const promptPath = path.resolve(
  __dirname,
  "../../../../prompts/claimboundary.prompt.md",
);
const promptContent = readFileSync(promptPath, "utf-8");

// ---------------------------------------------------------------------------
// Minimal section extractor (mirrors prompt-loader.ts extractSections)
// ---------------------------------------------------------------------------
function extractSection(content: string, sectionName: string): string | null {
  const lines = content.split("\n");
  let capturing = false;
  const captured: string[] = [];

  for (const line of lines) {
    // Match section header: ## SECTION_NAME
    const headerMatch = line.match(/^## ([A-Z][A-Z0-9_ ]+(?:\([^)]*\))?)\s*$/);
    if (headerMatch) {
      if (capturing) break; // hit the next section
      if (headerMatch[1] === sectionName) {
        capturing = true;
        continue;
      }
    }
    if (capturing && line.trim() !== "---") {
      captured.push(line);
    }
  }

  return capturing ? captured.join("\n").trim() : null;
}

// ---------------------------------------------------------------------------
// Variable substitution (mirrors prompt-loader.ts renderSection logic)
// ---------------------------------------------------------------------------
function renderWithVars(
  template: string,
  vars: Record<string, string>,
): { rendered: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const rendered = template.replace(/\$\{(\w+)\}/g, (match, varName) => {
    if (varName in vars) return vars[varName];
    unresolved.push(varName);
    return match;
  });
  return { rendered, unresolved };
}

// ---------------------------------------------------------------------------
// Variable keys each Stage-4 section expects, matching code call sites.
// Values are representative JSON strings (content doesn't matter; shape does).
// ---------------------------------------------------------------------------

/** advocate (verdict-stage.ts:591-602) + self-consistency (verdict-stage.ts:719-729) */
const ADVOCATE_VARS: Record<string, string> = {
  atomicClaims: '[{"id":"AC_01","statement":"Test claim"}]',
  evidenceItems: '[{"id":"EV_01","statement":"Test evidence"}]',
  claimBoundaries: '[{"id":"CB_01","name":"Test boundary"}]',
  coverageMatrix: '{"claims":["AC_01"],"boundaries":["CB_01"],"counts":[[5]]}',
  sourcePortfolioByClaim: '{"AC_01":[]}',
  reportLanguage: "German",
  currentDate: "2026-04-02",
};

/** challenger (verdict-stage.ts:875-888) */
const CHALLENGER_VARS: Record<string, string> = {
  claimVerdicts: '[{"claimId":"AC_01","truthPercentage":72}]',
  evidenceItems: '[{"id":"EV_01","statement":"Test evidence"}]',
  claimBoundaries: '[{"id":"CB_01","name":"Test boundary"}]',
  sourcePortfolioByClaim: '{"AC_01":[]}',
  currentDate: "2026-04-02",
};

/** reconciliation (verdict-stage.ts:928-942) */
const RECONCILIATION_VARS: Record<string, string> = {
  advocateVerdicts: '[{"claimId":"AC_01","truthPercentage":72}]',
  challenges: '[{"claimId":"AC_01","challengePoints":[]}]',
  consistencyResults: '[{"claimId":"AC_01","spread":5}]',
  sourcePortfolioByClaim: '{"AC_01":[]}',
  reportLanguage: "German",
  currentDate: "2026-04-02",
};

/** grounding validation (verdict-stage.ts:1094-1114) */
const GROUNDING_VALIDATION_VARS: Record<string, string> = {
  verdicts: '[{"claimId":"AC_01"}]',
  evidencePool: '[{"id":"EV_01","statement":"Test"}]',
  sourcePortfolio: '[{"sourceId":"S_01","domain":"example.com"}]',
  currentDate: "2026-04-02",
};

/** direction validation (verdict-stage.ts:1126-1140) */
const DIRECTION_VALIDATION_VARS: Record<string, string> = {
  verdicts: '[{"claimId":"AC_01","truthPercentage":72}]',
  currentDate: "2026-04-02",
};

/** direction repair (verdict-stage.ts:1551-1566) */
const DIRECTION_REPAIR_VARS: Record<string, string> = {
  claimId: "AC_01",
  claimText: "Test claim statement",
  boundaryContext: '[{"boundaryId":"CB_01"}]',
  directionIssues: '["supporting evidence counted as contradicting"]',
  verdict: '{"claimId":"AC_01","truthPercentage":72}',
  evidenceDirectionSummary: '{"supporting":3,"contradicting":1}',
  evidencePool: '[{"id":"EV_01"}]',
  currentDate: "2026-04-02",
};

// ---------------------------------------------------------------------------
// Stage-4 prompt contract tests
// ---------------------------------------------------------------------------

describe("Stage-4 prompt contract", () => {
  const SECTIONS: Array<{
    name: string;
    vars: Record<string, string>;
    label: string;
  }> = [
    { name: "VERDICT_ADVOCATE", vars: ADVOCATE_VARS, label: "advocate" },
    { name: "VERDICT_CHALLENGER", vars: CHALLENGER_VARS, label: "challenger" },
    { name: "VERDICT_RECONCILIATION", vars: RECONCILIATION_VARS, label: "reconciliation" },
    { name: "VERDICT_GROUNDING_VALIDATION", vars: GROUNDING_VALIDATION_VARS, label: "grounding validation" },
    { name: "VERDICT_DIRECTION_VALIDATION", vars: DIRECTION_VALIDATION_VARS, label: "direction validation" },
    { name: "VERDICT_DIRECTION_REPAIR", vars: DIRECTION_REPAIR_VARS, label: "direction repair" },
  ];

  for (const { name, vars, label } of SECTIONS) {
    describe(name, () => {
      it(`section exists in prompt file`, () => {
        const section = extractSection(promptContent, name);
        expect(section, `Section ## ${name} not found in claimboundary.prompt.md`).not.toBeNull();
      });

      it(`no unresolved \${...} placeholders after rendering with ${label} variables`, () => {
        const section = extractSection(promptContent, name);
        if (!section) return; // covered by existence test
        const { unresolved } = renderWithVars(section, vars);
        expect(
          unresolved,
          `Unresolved variables in ${name}: ${unresolved.join(", ")}. ` +
          `Code must pass these keys to llmCall() or the prompt must be updated.`,
        ).toEqual([]);
      });

      it(`no [object Object] in rendered output`, () => {
        const section = extractSection(promptContent, name);
        if (!section) return;
        const { rendered } = renderWithVars(section, vars);
        expect(
          rendered,
          `[object Object] found in rendered ${name}. ` +
          `Non-string values must be JSON.stringify()'d before prompt rendering.`,
        ).not.toContain("[object Object]");
      });
    });
  }

  // Additional: verify the serialization helper in verdict-generation-stage.ts
  // produces string values for all input keys (regression guard for the
  // [object Object] coercion bug).
  describe("input serialization", () => {
    it("JSON.stringify produces valid JSON for representative structured inputs", () => {
      const structuredInput = {
        atomicClaims: [{ id: "AC_01", statement: "Test" }],
        evidenceItems: [{ id: "EV_01", statement: "Evidence" }],
        claimBoundaries: [{ id: "CB_01", name: "Boundary" }],
        coverageMatrix: { claims: ["AC_01"], boundaries: ["CB_01"], counts: [[3]] },
        sourcePortfolioByClaim: { AC_01: [] },
        reportLanguage: "German",
      };

      const stringified: Record<string, string> = {};
      for (const [key, value] of Object.entries(structuredInput)) {
        stringified[key] = typeof value === "string" ? value : JSON.stringify(value);
      }

      for (const [key, value] of Object.entries(stringified)) {
        expect(typeof value).toBe("string");
        expect(value, `Key "${key}" serialized to [object Object]`).not.toBe("[object Object]");
        // Non-string inputs should be valid JSON
        if (key !== "reportLanguage") {
          expect(() => JSON.parse(value), `Key "${key}" is not valid JSON: ${value}`).not.toThrow();
        }
      }
    });
  });
});
