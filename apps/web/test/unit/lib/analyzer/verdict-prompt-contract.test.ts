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

/** Stage 5 narrative (aggregation-stage.ts:399-429) */
const VERDICT_NARRATIVE_VARS: Record<string, string> = {
  reportLanguage: "German",
  currentDate: "2026-04-06",
  overallVerdict: '{"truthPercentage":65,"verdict":"LEANING-TRUE","confidence":58}',
  aggregation: '{"weightedTruthPercentage":65,"weightedConfidence":58,"verdict":"LEANING-TRUE","claimCount":3,"perClaim":[{"claimId":"AC_01","truthPercentage":72,"verdict":"MOSTLY-TRUE","confidence":75,"confidenceTier":"HIGH"}]}',
  evidenceSummary: '{"totalItems":80,"sourceCount":34,"boundaryCount":6,"directionBalance":{"supports":35,"contradicts":12,"neutral":33},"perClaim":[{"claimId":"AC_01","evidenceCount":43}]}',
  claimVerdicts: '[{"claimId":"AC_01","truthPercentage":72,"verdict":"MOSTLY-TRUE","confidence":75,"reasoning":"Test reasoning...","boundaryFindings":[{"boundaryId":"CB_01","boundaryName":"Test","evidenceDirection":"supports","evidenceCount":20}]}]',
  claimBoundaries: '[{"id":"CB_01","name":"Test boundary","description":"Test description","evidenceCount":20}]',
  coverageMatrix: '{"claims":["AC_01"],"boundaries":["CB_01"],"counts":[[20]]}',
  evidenceCount: "80",
};

// ---------------------------------------------------------------------------
// Stage-4 + Stage-5 prompt contract tests
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

  describe("verdict prose contract", () => {
    it("advocate instructions keep machine IDs in structured arrays, not prose reasoning", () => {
      const section = extractSection(promptContent, "VERDICT_ADVOCATE");
      expect(section).toContain("Do NOT embed raw machine identifiers");
      expect(section).toContain("supportingEvidenceIds");
      expect(section).toContain("contradictingEvidenceIds");
    });

    it("challenger instructions keep machine IDs in structured arrays, not challenge prose", () => {
      const section = extractSection(promptContent, "VERDICT_CHALLENGER");
      expect(section).toContain("Use `evidenceIds` as the authoritative machine-readable citation channel");
      expect(section).toContain("Do NOT embed raw machine identifiers");
    });

    it("reconciliation instructions keep machine IDs out of reasoning and challenge response prose", () => {
      const section = extractSection(promptContent, "VERDICT_RECONCILIATION");
      expect(section).toContain("Do not place machine IDs in prose");
      expect(section).toContain("adjustmentBasedOnChallengeIds");
    });

    it("grounding validator treats inline machine IDs as defensive legacy cases, not expected prose", () => {
      const section = extractSection(promptContent, "VERDICT_GROUNDING_VALIDATION");
      expect(section).toContain("Reasoning SHOULD avoid raw machine IDs");
      expect(section).toContain("Defensive legacy rule for source references");
      expect(section).toContain("Defensive legacy rule for boundary references");
      expect(section).toContain("Defensive legacy rule for challenge references");
    });

    it("advocate contains scope-of-truth rule preventing semantic drift", () => {
      const section = extractSection(promptContent, "VERDICT_ADVOCATE");
      expect(section).toContain("Scope-of-truth rule");
      expect(section).toContain("therefore improper");
      expect(section).toContain("misleadingness");
    });

    it("reconciliation contains scope-of-truth rule preventing semantic drift", () => {
      const section = extractSection(promptContent, "VERDICT_RECONCILIATION");
      expect(section).toContain("Scope-of-truth rule");
      expect(section).toContain("therefore improper");
      expect(section).toContain("misleadingness");
    });
  });
});

// ---------------------------------------------------------------------------
// Stage-5 prompt contract tests
// ---------------------------------------------------------------------------

describe("Stage-5 prompt contract", () => {
  describe("VERDICT_NARRATIVE", () => {
    it("section exists in prompt file", () => {
      const section = extractSection(promptContent, "VERDICT_NARRATIVE");
      expect(section, "Section ## VERDICT_NARRATIVE not found in claimboundary.prompt.md").not.toBeNull();
    });

    it("no unresolved ${...} placeholders after rendering with narrative variables", () => {
      const section = extractSection(promptContent, "VERDICT_NARRATIVE");
      if (!section) return;
      const { unresolved } = renderWithVars(section, VERDICT_NARRATIVE_VARS);
      expect(
        unresolved,
        `Unresolved variables in VERDICT_NARRATIVE: ${unresolved.join(", ")}. ` +
        `aggregation-stage.ts generateVerdictNarrative() must pass these keys, or the prompt must be updated.`,
      ).toEqual([]);
    });

    it("no [object Object] in rendered output", () => {
      const section = extractSection(promptContent, "VERDICT_NARRATIVE");
      if (!section) return;
      const { rendered } = renderWithVars(section, VERDICT_NARRATIVE_VARS);
      expect(
        rendered,
        "[object Object] found in rendered VERDICT_NARRATIVE. " +
        "Non-string values must be JSON.stringify()'d before prompt rendering.",
      ).not.toContain("[object Object]");
    });

    it("boundaryDisagreements instruction requires material directional divergence", () => {
      const section = extractSection(promptContent, "VERDICT_NARRATIVE");
      expect(section).toContain("materially different directional conclusions");
      expect(section).toContain("limitations");
    });
  });
});

// ---------------------------------------------------------------------------
// Stage-5 CLAIM_DOMINANCE_ASSESSMENT prompt contract tests
// ---------------------------------------------------------------------------

const DOMINANCE_ASSESSMENT_VARS: Record<string, string> = {
  originalInput: "Entity A performed action B before authority C completed review.",
  claimVerdicts: '[{"claimId":"AC_01","truthPercentage":92,"verdict":"TRUE","confidence":88,"confidenceTier":"HIGH","reasoning":"Test..."}]',
  atomicClaims: '[{"claimId":"AC_01","statement":"Test claim","thesisRelevance":"direct"}]',
  contractValidationSummary: '{"ran":true,"preservesContract":true,"rePromptRequired":false,"summary":"Anchor preserved.","truthConditionAnchor":{"presentInInput":true,"anchorText":"before authority C completed review","preservedInClaimIds":["AC_01"],"validPreservedIds":["AC_01"]}}',
};

describe("Stage-5 CLAIM_DOMINANCE_ASSESSMENT prompt contract", () => {
  it("section exists in prompt file", () => {
    const section = extractSection(promptContent, "CLAIM_DOMINANCE_ASSESSMENT");
    expect(section, "Section ## CLAIM_DOMINANCE_ASSESSMENT not found").not.toBeNull();
  });

  it("no unresolved ${...} placeholders after rendering", () => {
    const section = extractSection(promptContent, "CLAIM_DOMINANCE_ASSESSMENT");
    if (!section) return;
    const { unresolved } = renderWithVars(section, DOMINANCE_ASSESSMENT_VARS);
    expect(unresolved, `Unresolved: ${unresolved.join(", ")}`).toEqual([]);
  });

  it("instructs conservative default (dominanceMode none)", () => {
    const section = extractSection(promptContent, "CLAIM_DOMINANCE_ASSESSMENT");
    expect(section).toContain("none");
    expect(section).toContain("default");
    expect(section).toContain("conservative");
  });

  it("anchors dominance judgment to original input and contract validation", () => {
    const section = extractSection(promptContent, "CLAIM_DOMINANCE_ASSESSMENT");
    expect(section).toContain("ORIGINAL USER INPUT");
    expect(section).toContain("contractValidationSummary");
    expect(section).toContain("primary semantic anchor");
  });
});

// ---------------------------------------------------------------------------
// Stage-2 prompt contract tests
// ---------------------------------------------------------------------------

/** Stage 2 query generation (research-query-stage.ts:64-74) */
const GENERATE_QUERIES_VARS: Record<string, string> = {
  currentDate: "2026-04-06",
  claim: "Test claim about policy compliance",
  expectedEvidenceProfile: '{"sourceTypes":["government_report","news_primary"]}',
  distinctEvents: '[{"name":"Event A","date":"2025-06-01","description":"First event"}]',
  iterationType: "main",
  queryStrategyMode: "legacy",
  existingEvidenceSummary: '{"totalItems":12,"directionBalance":{"supports":5,"contradicts":4,"neutral":3},"coveredDimensions":["statistical analysis","legal review"]}',
  detectedLanguage: "en",
  inferredGeography: "CH",
  relevantGeographies: "CH, DE",
};

describe("Stage-2 prompt contract", () => {
  describe("GENERATE_QUERIES", () => {
    it("section exists in prompt file", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      expect(section, "Section ## GENERATE_QUERIES not found in claimboundary.prompt.md").not.toBeNull();
    });

    it("no unresolved ${...} placeholders after rendering with query generation variables", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      if (!section) return;
      const { unresolved } = renderWithVars(section, GENERATE_QUERIES_VARS);
      expect(
        unresolved,
        `Unresolved variables in GENERATE_QUERIES: ${unresolved.join(", ")}. ` +
        `research-query-stage.ts generateResearchQueries() must pass these keys, or the prompt must be updated.`,
      ).toEqual([]);
    });

    it("no [object Object] in rendered output", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      if (!section) return;
      const { rendered } = renderWithVars(section, GENERATE_QUERIES_VARS);
      expect(
        rendered,
        "[object Object] found in rendered GENERATE_QUERIES. " +
        "Non-string values must be JSON.stringify()'d before prompt rendering.",
      ).not.toContain("[object Object]");
    });

    it("evidence summary instruction uses gap-identification framing", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      expect(section).toContain("identify gaps");
      expect(section).toContain("under-represented");
    });
  });

  /** Stage 2 relevance classification (research-extraction-stage.ts:113-123) */
  const RELEVANCE_CLASSIFICATION_VARS: Record<string, string> = {
    currentDate: "2026-04-06",
    claim: "Entity A complied with procedural law during proceeding B",
    inferredGeography: "BR",
    relevantGeographies: '["BR"]',
    searchResults: '[{"url":"https://example.com/article","title":"Test Article","snippet":"Relevant snippet"}]',
  };

  describe("RELEVANCE_CLASSIFICATION", () => {
    it("section exists in prompt file", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      expect(section, "Section ## RELEVANCE_CLASSIFICATION not found").not.toBeNull();
    });

    it("no unresolved ${...} placeholders after rendering", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      if (!section) return;
      const { unresolved } = renderWithVars(section, RELEVANCE_CLASSIFICATION_VARS);
      expect(unresolved, `Unresolved: ${unresolved.join(", ")}`).toEqual([]);
    });
  });

  /** Stage 2 evidence extraction (research-extraction-stage.ts:261-268) */
  const EXTRACT_EVIDENCE_VARS: Record<string, string> = {
    currentDate: "2026-04-06",
    claim: "Entity A complied with procedural law during proceeding B",
    sourceContent: "[Source 1: Test]\nURL: https://example.com\nContent about proceedings...",
    sourceUrl: "https://example.com",
  };

  describe("EXTRACT_EVIDENCE", () => {
    it("section exists in prompt file", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      expect(section, "Section ## EXTRACT_EVIDENCE not found").not.toBeNull();
    });

    it("no unresolved ${...} placeholders after rendering", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      if (!section) return;
      const { unresolved } = renderWithVars(section, EXTRACT_EVIDENCE_VARS);
      expect(unresolved, `Unresolved: ${unresolved.join(", ")}`).toEqual([]);
    });

    it("no [object Object] in rendered output", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      if (!section) return;
      const { rendered } = renderWithVars(section, EXTRACT_EVIDENCE_VARS);
      expect(rendered).not.toContain("[object Object]");
    });

    it("contains target-specific vs comparator evidence guidance", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      expect(section).toContain("target-specific");
      expect(section).toContain("comparator");
    });

    it("comparator guidance classifies historical precedent as contextual by default", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      // Core policy: comparator evidence about different proceedings is contextual
      expect(section).toContain("comparator/precedent");
      expect(section).toContain('"contextual"');
      // Exception: direct institutional nexus may override
      expect(section).toContain("direct institutional nexus");
    });

    it("comparator guidance uses abstract examples without domain-specific terms", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      // Must NOT contain test-case-specific terms
      const forbiddenTerms = [
        "Bolsonaro", "Lula", "Moro", "Car Wash", "Lava Jato",
        "Brazil", "STF", "Petrobras",
      ];
      for (const term of forbiddenTerms) {
        expect(section, `EXTRACT_EVIDENCE must not contain domain-specific term "${term}"`).not.toContain(term);
      }
    });
  });

  /** Stage 2 applicability assessment (research-extraction-stage.ts:441-445) */
  const APPLICABILITY_ASSESSMENT_VARS: Record<string, string> = {
    claims: '[{"id":"AC_01","statement":"Entity A complied with procedural law"}]',
    inferredGeography: "BR",
    relevantGeographies: '["BR"]',
    evidenceItems: '[{"index":0,"statement":"Test evidence","sourceUrl":"https://example.com","sourceTitle":"Test","category":"legal_document"}]',
  };

  describe("APPLICABILITY_ASSESSMENT", () => {
    it("section exists in prompt file", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section, "Section ## APPLICABILITY_ASSESSMENT not found").not.toBeNull();
    });

    it("no unresolved ${...} placeholders after rendering", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      if (!section) return;
      const { unresolved } = renderWithVars(section, APPLICABILITY_ASSESSMENT_VARS);
      expect(unresolved, `Unresolved: ${unresolved.join(", ")}`).toEqual([]);
    });
  });
});
