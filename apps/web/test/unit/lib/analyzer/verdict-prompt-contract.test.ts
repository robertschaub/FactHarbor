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
  atomicClaims: '[{"id":"AC_01","statement":"Test claim","freshnessRequirement":"current_snapshot"}]',
  evidenceItems: '[{"id":"EV_01","statement":"Test evidence","applicability":"direct"}]',
  claimBoundaries: '[{"id":"CB_01","name":"Test boundary"}]',
  coverageMatrix: '{"claims":["AC_01"],"boundaries":["CB_01"],"counts":[[5]]}',
  sourcePortfolioByClaim: '{"AC_01":[]}',
  reportLanguage: "German",
  currentDate: "2026-04-02",
};

/** challenger (verdict-stage.ts:875-888) */
const CHALLENGER_VARS: Record<string, string> = {
  claimVerdicts: '[{"claimId":"AC_01","truthPercentage":72}]',
  evidenceItems: '[{"id":"EV_01","statement":"Test evidence","applicability":"direct"}]',
  claimBoundaries: '[{"id":"CB_01","name":"Test boundary"}]',
  sourcePortfolioByClaim: '{"AC_01":[]}',
  currentDate: "2026-04-02",
};

/** reconciliation (verdict-stage.ts:928-942) */
const RECONCILIATION_VARS: Record<string, string> = {
  advocateVerdicts: '[{"claimId":"AC_01","truthPercentage":72}]',
  challenges: '[{"claimId":"AC_01","challengePoints":[]}]',
  consistencyResults: '[{"claimId":"AC_01","spread":5}]',
  evidenceItems: '[{"id":"EV_01","claimDirection":"supports","applicability":"direct"},{"id":"EV_02","claimDirection":"contextual","applicability":"contextual"}]',
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
  verdicts: '[{"claimId":"AC_01","truthPercentage":72,"evidencePool":[{"id":"EV_01","claimDirection":"supports","applicability":"direct"}]}]',
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
  evidencePool: '[{"id":"EV_01","claimDirection":"supports","applicability":"direct"}]',
  currentDate: "2026-04-02",
};

const CITATION_DIRECTION_ADJUDICATION_VARS: Record<string, string> = {
  adjudicationCases: JSON.stringify([{
    claimId: "AC_01",
    claimText: "Entity A is approximately equal to reference B",
    truthPercentage: 35,
    verdict: "LEANING-FALSE",
    caseMode: "decisive_missing",
    decisiveSide: "contradicting",
    candidates: [{
      evidenceId: "EV_01",
      originalBucket: "contradicting",
      statement: "Reference B has value 100 during the assessed window.",
      applicability: "direct",
      probativeValue: "high",
    }],
  }]),
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
  methodologyHighlights: '[{"label":"Named methodology A","count":12,"origins":["boundary_name","evidence_methodology"]}]',
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
    { name: "VERDICT_CITATION_DIRECTION_ADJUDICATION", vars: CITATION_DIRECTION_ADJUDICATION_VARS, label: "citation direction adjudication" },
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
        atomicClaims: [{ id: "AC_01", statement: "Test", freshnessRequirement: "current_snapshot" }],
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

      expect(stringified.atomicClaims).toContain('"freshnessRequirement":"current_snapshot"');
    });
  });

  describe("VERDICT_CITATION_DIRECTION_ADJUDICATION", () => {
    it("keeps citation adjudication generic and preserves numeric comparison direction repair", () => {
      const section = extractSection(promptContent, "VERDICT_CITATION_DIRECTION_ADJUDICATION");
      expect(section).toContain("direct, claim-local evidence items");
      expect(section).toContain("populate an otherwise uncited mixed verdict");
      expect(section).toContain("stored claimDirection that conflicts with the verdict citation bucket");
      expect(section).toContain("storedClaimDirection");
      expect(section).toContain("Return `neutral` when the evidence is background");
      expect(section).toContain("Return `neutral` for source-existence");
      expect(section).toContain("Do not infer a missing value merely because a report or archive is comprehensive");
      expect(section).toContain("For numeric comparison claims");
      expect(section).toContain("Do not keep an item neutral solely because it reports only one side of the comparison");
      expect(section).toContain("For target-object legal/procedural/process claims");
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

    it("reconciliation has evidence metadata for direct-only citation arrays", () => {
      const section = extractSection(promptContent, "VERDICT_RECONCILIATION");
      expect(section).toContain("Treat `applicability` and `claimDirection` in Evidence Items as binding");
      expect(section).toContain("Only `direct` evidence with `claimDirection = \"supports\"` may appear");
      expect(section).toContain("only `direct` evidence with `claimDirection = \"contradicts\"` may appear");
      expect(section).toContain("Do not convert absence of direct evidence into a directional contradiction");
      expect(section).toContain("Do not convert source-existence");
      expect(section).toContain("unless the evidence statement itself gives the decisive value");
      expect(section).toContain("${evidenceItems}");
    });

    it("grounding validator treats inline machine IDs as defensive legacy cases, not expected prose", () => {
      const section = extractSection(promptContent, "VERDICT_GROUNDING_VALIDATION");
      expect(section).toContain("Reasoning SHOULD avoid raw machine IDs");
      expect(section).toContain("Defensive legacy rule for source references");
      expect(section).toContain("Defensive legacy rule for boundary references");
      expect(section).toContain("Defensive legacy rule for challenge references");
    });

    it("grounding validator accepts uncited but claim-local reasoning references", () => {
      const section = extractSection(promptContent, "VERDICT_GROUNDING_VALIDATION");
      expect(section).toContain("claim-local context (`evidencePool`, `sourcePortfolio`, `boundaryIds`, or `challengeContext`)");
      expect(section).toContain("`citedEvidenceRegistry` is the authoritative check for the verdict's directional citation arrays only");
      expect(section).toContain("Validate in this order");
      expect(section).toContain("Do NOT flag an evidence ID solely because it appears in reasoning but not in `citedEvidenceRegistry`");
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

    it("reconciliation blocks one-sided proxy wins but allows close-ecosystem convergence", () => {
      const section = extractSection(promptContent, "VERDICT_RECONCILIATION");
      expect(section).toContain("Per-side ecosystem evidence sufficiency and close-ecosystem convergence");
      expect(section).toContain("assess each side's ecosystem evidence separately");
      expect(section).toContain("do NOT resolve the comparison above the `UNVERIFIED` band");
      expect(section).toContain("Do NOT force `UNVERIFIED` solely because no single formal registry, audit, or umbrella report exists");
      expect(section).toContain("multiple convergent close-ecosystem sources");
      expect(section).toContain("A single organization page, one platform-specific implementation, or one case study is not enough by itself");
      expect(section).toContain("Silence or omission is probative only when the source's declared scope is to enumerate or structurally describe the target ecosystem");
    });

    it("advocate treats foreign government assessment reports as positional outputs requiring corroboration", () => {
      const section = extractSection(promptContent, "VERDICT_ADVOCATE");
      expect(section).toContain("Foreign government-issued assessments, rankings, monitoring reports, or official evaluations");
      expect(section).toContain("independent high-probative contradiction unless they are corroborated");
      expect(section).toContain("direct in-jurisdiction evidence or neutral external evidence");
    });

    it("advocate keeps overlap-only background material confidence-limiting unless explicitly bridged", () => {
      const section = extractSection(promptContent, "VERDICT_ADVOCATE");
      expect(section).toContain("contextual evidence from other episodes or broader institutional controversies");
      expect(section).toContain("does not by itself outweigh direct target-specific evidence");
      expect(section).toContain("explicitly bridges the same criticized/supportive mechanism into the directly evaluated target");
      expect(section).toContain("Grounded external documentation, including foreign documentation");
    });

    it("advocate treats applicability as binding for directional citation arrays", () => {
      const section = extractSection(promptContent, "VERDICT_ADVOCATE");
      expect(section).toContain("Treat `applicability` as binding for directional citation arrays");
      expect(section).toContain("Only evidence items marked `direct` may appear");
      expect(section).toContain("`contextual` or `foreign_reaction`");
      expect(section).toContain("Do not use source-existence");
      expect(section).toContain("without publishing the decisive value or finding");
    });

    it("verdict prompts preserve balanced citations for broad umbrella ambiguity", () => {
      const advocate = extractSection(promptContent, "VERDICT_ADVOCATE");
      const reconciliation = extractSection(promptContent, "VERDICT_RECONCILIATION");

      expect(advocate).toContain("broad authoritative umbrella measurement");
      expect(advocate).toContain("narrower formal subset");
      expect(advocate).toContain("Do NOT omit the broad supporting citation");
      expect(reconciliation).toContain("broad authoritative umbrella measurement");
      expect(reconciliation).toContain("narrower formal subset");
      expect(reconciliation).toContain("preserve both material evidence directions");
    });

    it("verdict prompts treat method comparability limits as caveats unless direct contradiction exists", () => {
      const advocate = extractSection(promptContent, "VERDICT_ADVOCATE");
      const reconciliation = extractSection(promptContent, "VERDICT_RECONCILIATION");

      expect(advocate).toContain("method, scope, or window mismatch limits comparability");
      expect(advocate).toContain("Supporting-only direct evidence cannot justify a low-truth or false verdict by itself");
      expect(advocate).toContain("Unless direct contradicting evidence establishes that the mismatch changes the claim's substantive answer");
      expect(reconciliation).toContain("preserve its citation direction according to `claimDirection`");
      expect(reconciliation).toContain("Do not reconcile to a low-truth or false verdict using only supporting direct citations");
      expect(reconciliation).toContain("keep the limitation as a confidence, misleadingness, or middle-range truth caveat");
    });

    it("direction validation rejects non-direct directional citations", () => {
      const section = extractSection(promptContent, "VERDICT_DIRECTION_VALIDATION");
      expect(section).toContain("Consider the `applicability` field when present");
      expect(section).toContain("Only evidence marked `direct` may remain");
      expect(section).toContain("flag that as a direction issue");
    });

    it("direction validation flags low truth with one-sided supporting evidence", () => {
      const section = extractSection(promptContent, "VERDICT_DIRECTION_VALIDATION");
      expect(section).toContain("Flag a low-truth or below-midpoint verdict");
      expect(section).toContain("one-sided support");
      expect(section).toContain("no direct contradicting citations");
      expect(section).toContain("do not make supporting evidence directional contradiction by themselves");
    });

    it("direction repair removes non-direct evidence from directional arrays", () => {
      const section = extractSection(promptContent, "VERDICT_DIRECTION_REPAIR");
      expect(section).toContain("When `evidencePool` includes `applicability`");
      expect(section).toContain("keep only `direct` evidence IDs");
      expect(section).toContain("Remove `contextual` or `foreign_reaction` IDs");
    });

    it("direction repair does not turn supporting evidence into contradiction for comparability limits", () => {
      const section = extractSection(promptContent, "VERDICT_DIRECTION_REPAIR");
      expect(section).toContain("only direct supporting citations and no direct contradicting citations");
      expect(section).toContain("do not move supporting evidence into `contradictingEvidenceIds`");
      expect(section).toContain("raise the truth into a middle or weak-support range");
      expect(section).toContain("Use `contradictingEvidenceIds` only for direct evidence whose `claimDirection` is `contradicts`");
    });

    it("advocate keeps broad public-language totals anchored to umbrella metrics instead of narrow subsets", () => {
      const section = extractSection(promptContent, "VERDICT_ADVOCATE");
      expect(section).toContain("`expectedEvidenceProfile.primaryMetric` is present");
      expect(section).toContain("Direct evidence for `primaryMetric` should anchor the verdict");
      expect(section).toContain("`expectedEvidenceProfile.componentMetrics` may jointly establish `primaryMetric`");
      expect(section).toContain("compositional bridge");
      expect(section).toContain("confidence-limiting evidence rather than decisive support or contradiction");
      expect(section).toContain("broad public-language wording");
      expect(section).toContain("closest authoritative umbrella measurement");
      expect(section).toContain("A smaller subset count does not by itself falsify a broader public-language total");
      expect(section).toContain("numeric proximity");
      expect(section).toContain("Do not demand perfect label symmetry");
      expect(section).toContain("do NOT speculate a much lower point-in-time comparator");
      expect(section).toContain("Unsupported reconstructed endpoint counts");
      expect(section).toContain("stricter synchronized-stock, endpoint-only, or same-method comparator test");
      expect(section).toContain("hand-built lower comparator");
      expect(section).toContain("selected subcategories");
      expect(section).toContain("such arithmetic may justify uncertainty but not a strong truth downgrade");
    });

    it("reconciliation preserves approximate-comparison handling for broad public-language claims", () => {
      const section = extractSection(promptContent, "VERDICT_RECONCILIATION");
      expect(section).toContain("`expectedEvidenceProfile.primaryMetric` is present");
      expect(section).toContain("If cited evidence directly states `primaryMetric`, weight it first");
      expect(section).toContain("`expectedEvidenceProfile.componentMetrics` may jointly answer `primaryMetric`");
      expect(section).toContain("direct `primaryMetric` artifact or the compositional bridge is missing");
      expect(section).toContain("do NOT let component arithmetic alone drive a strong truth upgrade or downgrade");
      expect(section).toContain("broad public-language population claim");
      expect(section).toContain("closest authoritative umbrella totals first");
      expect(section).toContain("materially close in magnitude");
      expect(section).toContain("labels are not perfectly identical");
      expect(section).toContain("stock-versus-period asymmetry");
      expect(section).toContain("inventing an uncited lower endpoint comparator");
      expect(section).toContain("Reject or heavily discount challenges");
      expect(section).toContain("same-method comparator");
      expect(section).toContain("hand-built lower comparator");
      expect(section).toContain("selected subgroups");
      expect(section).toContain("Do not let such unsupported arithmetic drive a strong truth downgrade");
    });

    it("citation adjudication keeps approximate-comparison direction caveated instead of exact-equality strict", () => {
      const section = extractSection(promptContent, "VERDICT_CITATION_DIRECTION_ADJUDICATION");
      expect(section).toContain("judge direction by the claim's approximate relation, not by exact equality");
      expect(section).toContain("same broad magnitude or near-comparability");
      expect(section).toContain("Do not classify an approximate-comparison candidate as `contradicts` merely because");
      expect(section).toContain("stricter endpoint stock or same-method synchronized stock");
      expect(section).toContain("direct caveated comparator evidence");
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
// Stage-5 ARTICLE_ADJUDICATION prompt contract tests (Option G)
// ---------------------------------------------------------------------------

const ARTICLE_ADJUDICATION_VARS: Record<string, string> = {
  originalInput: "Entity A performed action B before authority C completed review.",
  claimVerdicts: '[{"claimId":"AC_01","truthPercentage":92,"verdict":"TRUE","confidence":88,"confidenceTier":"HIGH","reasoning":"Test..."}]',
  atomicClaims: '[{"claimId":"AC_01","statement":"Test claim","thesisRelevance":"direct"}]',
  contractValidationSummary: '{"ran":true,"preservesContract":true,"rePromptRequired":false,"summary":"Anchor preserved.","truthConditionAnchor":{"presentInInput":true,"anchorText":"before authority C completed review","preservedInClaimIds":["AC_01"],"validPreservedIds":["AC_01"]}}',
  baselineTruthPercentage: "65.3",
  baselineConfidence: "72.6",
  evidenceSummary: '{"totalEvidence":14,"totalBoundaries":3}',
};

describe("Stage-5 ARTICLE_ADJUDICATION prompt contract", () => {
  it("section exists in prompt file", () => {
    const section = extractSection(promptContent, "ARTICLE_ADJUDICATION");
    expect(section, "Section ## ARTICLE_ADJUDICATION not found").not.toBeNull();
  });

  it("no unresolved ${...} placeholders after rendering", () => {
    const section = extractSection(promptContent, "ARTICLE_ADJUDICATION");
    if (!section) return;
    const { unresolved } = renderWithVars(section, ARTICLE_ADJUDICATION_VARS);
    expect(unresolved, `Unresolved: ${unresolved.join(", ")}`).toEqual([]);
  });

  it("instructs conservative dominance default", () => {
    const section = extractSection(promptContent, "ARTICLE_ADJUDICATION");
    expect(section).toContain("none");
    expect(section).toContain("conservative");
  });

  it("anchors judgment to original input and contract validation", () => {
    const section = extractSection(promptContent, "ARTICLE_ADJUDICATION");
    expect(section).toContain("ORIGINAL USER INPUT");
    expect(section).toContain("contractValidationSummary");
    expect(section).toContain("primary semantic anchor");
  });

  it("handles borderline defining claims without prerequisite dominance", () => {
    const section = extractSection(promptContent, "ARTICLE_ADJUDICATION");
    expect(section).toContain("borderline/mixed");
    expect(section).toContain("clear prerequisite or background claim");
    expect(section).toContain("defining proposition");
  });

  it("references baseline weighted average as structural anchor", () => {
    const section = extractSection(promptContent, "ARTICLE_ADJUDICATION");
    expect(section).toContain("baselineTruthPercentage");
    expect(section).toContain("baselineConfidence");
    expect(section).toContain("structural anchor");
  });
});

// ---------------------------------------------------------------------------
// Stage-2 prompt contract tests
// ---------------------------------------------------------------------------

/** Stage 2 query generation (research-query-stage.ts:64-74) */
const GENERATE_QUERIES_VARS: Record<string, string> = {
  currentDate: "2026-04-06",
  claim: "Test claim about policy compliance",
  freshnessRequirement: "current_snapshot",
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

    it("query generation preserves public-language and source-native umbrella coverage", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      expect(section).toContain("`expectedEvidenceProfile.primaryMetric` is present");
      expect(section).toContain("`expectedEvidenceProfile.componentMetrics` is present");
      expect(section).toContain("Do NOT let all returned queries shift from `primaryMetric` to `componentMetrics`");
      expect(section).toContain("broad public-language population label");
      expect(section).toContain("public-language wording");
      expect(section).toContain("source-native umbrella wording");
      expect(section).toContain("Do NOT let all official queries collapse onto a narrower formal subcategory");
      expect(section).toContain("current-versus-historical or current-versus-reference comparison claims");
      expect(section).toContain("broadest authoritative umbrella total");
      expect(section).toContain("Retrieve the decisive current total and the comparator total directly");
      expect(section).toContain("source-native comparator class identified in `expectedEvidenceProfile`");
      expect(section).toContain("endpoint stock versus period/window total or cumulative flow ambiguous");
      expect(section).toContain("not automatic substitutes for one another");
      expect(section).toContain("recurring official statistics series or update stream");
      expect(section).toContain("Avoid institution-plus-topic-only official queries");
    });

    it("query generation forces side-specific enumerative routes for comparative ecosystems", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      expect(section).toContain("Comparative ecosystem claims only");
      expect(section).toContain("NOT claims whose decisive evidence is a present-state metric, ranking, or threshold");
      expect(section).toContain("when both ecosystem and metric readings are plausible from the wording alone, default to the metric/present-state interpretation");
      expect(section).toContain("for metric claims use the present-state rules above");
      expect(section).toContain("side-specific query coverage to the strongest institutional existence signals on BOTH sides");
      expect(section).toContain("At least one returned query for EACH compared side must explicitly target an enumerative ecosystem route");
      expect(section).toContain("participant/member/certification list");
      expect(section).toContain("network or association roster");
      expect(section).toContain("weaker side toward enumerative ecosystem routes");
      expect(section).toContain("At least one query for EACH compared side must name a concrete ecosystem signal");
      expect(section).toMatch(/broad words such as system,\s*infrastructure,\s*institutions,\s*landscape/i);
      expect(section).toMatch(/landscape,\s*overview,\s*or comparison is insufficient/i);
      expect(section).toContain("concrete source-native signal or artifact");
      expect(section).toContain("abstract words such as governance, coordination, evaluation, systematization, monitoring, or structure");
      expect(section).toContain("broader policy problem or harm domain");
      expect(section.indexOf("When the claim is explicitly about the present or current state")).toBeLessThan(
        section.indexOf("Comparative ecosystem claims only"),
      );
      expect(section.indexOf("For approximate comparison claims between current and historical or reference totals")).toBeLessThan(
        section.indexOf("Comparative ecosystem claims only"),
      );
    });

    it("multi-event coverage stays on direct milestones and freshness-appropriate routes", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      expect(section).toContain("that are each direct milestones of the same claim");
      expect(section).toContain("discard event candidates that are merely antecedent background, side disputes, institutional conflicts, foreign reactions, or historical comparator episodes");
      expect(section).toContain("Overlap in actors, institutions, decision-makers, or authorities does NOT by itself make an earlier or parallel episode a direct milestone");
      expect(section).toContain("If `freshnessRequirement` is `current_snapshot` or `recent`, prioritize the latest direct milestone(s)");
      expect(section).toContain("current official or source-native routes first");
      expect(section).toContain("Do NOT let the multi-event rule force one query toward a stale antecedent episode");
    });

    it("query generation keeps rule-governed target claims anchored to source-native records", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      expect(section).toContain("legality, procedure, fairness, or similar rule-governed standards");
      expect(section).toContain("source-native record of the directly evaluated target itself");
      expect(section).toContain("broader commentary involving overlapping actors or institutions");
    });

    it("preserves source-native route labels in generated queries", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      expect(section).toContain("expectedEvidenceProfile.sourceNativeRoutes");
      expect(section).toContain("verbatim or near-verbatim");
    });

    it("query generation spends complex quantitative slots on decisive side totals first", () => {
      const section = extractSection(promptContent, "GENERATE_QUERIES");
      expect(section).toContain("generate 2-4 search queries");
      expect(section).toContain("both direct-value and source-native archive coverage");
      expect(section).toContain("decisive side-specific totals");
      expect(section).toContain("both still needed");
    });
  });

  /** Stage 2 relevance classification (research-extraction-stage.ts:113-123) */
  const RELEVANCE_CLASSIFICATION_VARS: Record<string, string> = {
    currentDate: "2026-04-06",
    claim: "Entity A complied with procedural law during proceeding B",
    freshnessRequirement: "current_snapshot",
    expectedEvidenceProfile: '{"expectedMetrics":["current metric","reference metric"],"sourceNativeRoutes":["publisher archive"]}',
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

    it("downranks root homepages for precise current official totals", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      expect(section).toContain("generic institution homepages are at most borderline relevant");
      expect(section).toContain("statistics archive, series overview, or direct artifact route");
      expect(section).toContain("partial flow metrics");
      expect(section).toContain("${expectedEvidenceProfile}");
    });

    it("treats overlap-only procedural controversies as comparator evidence unless they document the target path", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      expect(section).toContain("legality, procedure, fairness, or similar rule-governed standards");
      expect(section).toContain("collateral inquiry, sanction episode, or broader institutional controversy");
      expect(section).toContain("Overlap alone is insufficient");
    });

    it("relevance classification excludes broader-problem governance reports from direct ecosystem evidence", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      expect(section).toContain("broader policy problem or harm domain");
      expect(section).toContain("not direct ecosystem evidence for the named activity");
      expect(section).toContain("inventories, governs, certifies, funds, or structurally describes the named activity ecosystem itself");
    });

    it("uses expected evidence profile for decomposed comparison companion relevance", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      expect(section).toContain("treat `expectedEvidenceProfile` as part of the relevance target");
      expect(section).toContain("referenced-side anchor");
      expect(section).toContain("source-native measurement route");
      expect(section).toContain("reports only one side");
    });
  });

  /** Stage 2 evidence extraction (research-extraction-stage.ts:261-268) */
  const EXTRACT_EVIDENCE_VARS: Record<string, string> = {
    currentDate: "2026-04-06",
    claim: "Entity A complied with procedural law during proceeding B",
    expectedEvidenceProfile: JSON.stringify({
      methodologies: ["source-native comparator route"],
      expectedMetrics: ["current metric", "reference metric"],
      expectedSourceTypes: ["government_report"],
      primaryMetric: "current metric",
    }),
    allClaims: '[{"id":"AC_01","statement":"Entity A has current metric M","expectedEvidenceProfile":{"expectedMetrics":["current metric"]}},{"id":"AC_02","statement":"Entity A is close to reference metric R","expectedEvidenceProfile":{"expectedMetrics":["current metric","reference metric"]}}]',
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

    it("keeps companion claim IDs direction-safe in evidence extraction", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      expect(section).toContain("Because one evidence item has only one `claimDirection`");
      expect(section).toContain("list multiple claim IDs on a shared item only when that same direction is valid for every listed claim");
      expect(section).toContain("emit a separate evidence item scoped to that companion claim");
      expect(section).toContain("assign the companion's own direction");
      expect(section).toContain("supports or refutes that claim's required side, component, route, or asserted relation");
      expect(section).toContain("Use `contextual` only when the companion evidence is genuinely non-directional background");
      expect(section).toContain("one-sided source evidence that directly reports that side's quantity, stock, total, threshold, denominator, or source-native route");
      expect(section).toContain("Do not reserve it only for a standalone side-specific sibling claim");
      expect(section).toContain("assign the comparison-scoped `claimDirection` from the side's effect on that relation");
    });

    it("comparator guidance classifies historical precedent as contextual by default", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      // Core policy: comparator evidence about different proceedings is contextual
      expect(section).toContain("comparator/precedent");
      expect(section).toContain('"contextual"');
    });

    it("extracts historical/reference totals as direct comparison evidence when point stock is not explicit", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      expect(section).toContain("Expected Evidence Profile");
      expect(section).toContain("${expectedEvidenceProfile}");
      expect(section).toContain("period/window totals, cumulative totals, and endpoint/stock figures");
      expect(section).toContain("treat `expectedEvidenceProfile` as part of the claim context");
      expect(section).toContain("source-native measurement route");
      expect(section).toContain("Preserve the metric class in `evidenceScope`");
      expect(section).toContain("Do not relabel a period/window total or cumulative-through-period value as an endpoint/timepoint stock value");
      expect(section).toContain("When the claim/profile route requires an endpoint or standing stock");
      expect(section).toContain("keep period/window or cumulative values `contextual` unless the claim/profile explicitly accepts that metric class");
      expect(section).toContain("`claimDirection` is relative to the comparison relationship");
      expect(section).toContain("classify the evidence as `supports` or `contradicts` when the numeric relationship is clear");
      expect(section).toContain("A one-sided value can be directional when the missing comparator value is supplied");
      expect(section).toContain("This target-object comparator/precedent default does NOT override numeric comparison claims");
      expect(section).toContain("This rule has priority over the target-object comparator/precedent default above");
      expect(section).toContain("Do not leave source-native current-side or reference-side values `contextual` solely because the source reports only one side of the comparison");
      expect(section).toContain("referenced-side endpoint/stock values in numeric comparisons");
      expect(section).toContain("makes the claimed approximate parity, threshold, rank, greater-than, less-than, or equal-to relation true or false");
      expect(section).toContain("do not demote it to `contextual` solely because the source reports only the referenced side");
      expect(section).toContain("Do not classify a referenced-side value as `supports` merely because it is the correct comparison side");
      expect(section).toContain("Direction must follow the asserted relation");
      expect(section).toContain("Referenced-side endpoint, stock, threshold, or source-native comparator values follow the same rule");
      expect(section).toContain("using `contextual` as a caveat bucket");
      expect(section).toContain("`supports` means the numeric relation is satisfied");
      expect(section).toContain("A direct reference-side value that makes the asserted approximate parity, threshold, ordering, rank, or trend false is `contradicts`");
      expect(section).toContain("same order of magnitude, shared unit, or a broad magnitude bucket is not enough for `supports`");
      expect(section).toContain("materially above or below the other side");
      expect(section).toContain("classify it as `contradicts`, not weak support");
      expect(section).toContain("Do not offset that contradiction with period totals, cumulative totals, sub-counts, or alternate metric classes");
      expect(section).toContain("Same order of magnitude, shared unit, or a broad magnitude bucket is not enough for approximate-parity `supports`");
    });

    it("requires verdicts to cite both sides of approximate numeric comparisons", () => {
      const advocate = extractSection(promptContent, "VERDICT_ADVOCATE");
      const reconciliation = extractSection(promptContent, "VERDICT_RECONCILIATION");
      expect(advocate).toContain("cite material evidence for EACH side of the comparison");
      expect(advocate).toContain("Do not omit a current-side citation");
      expect(reconciliation).toContain("preserve material evidence for EACH side");
      expect(reconciliation).toContain("do not omit a current-side citation");
    });

    it("exception requires finding to be about the directly evaluated target, not just the same institution", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      // The exception must NOT allow "same institution" as sufficient nexus
      expect(section).toContain("directly evaluated target");
      expect(section).not.toContain("direct institutional nexus");
      // Must contain the contrastive example showing same court ≠ target-specific
      expect(section).toContain("different case involving a different party");
    });

    it("keeps overlap-only rule-governed controversies contextual unless explicitly bridged to the target", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      expect(section).toContain("legality, procedure, fairness, or similar rule-governed standards");
      expect(section).toContain("earlier or parallel episodes, collateral inquiries, sanctions, or broader institutional controversies");
      expect(section).toContain("decision artifact, evidentiary act, remedy/safeguard, or other procedural feature of the directly evaluated target itself");
      expect(section).toContain("Overlap in actors or institutions alone does not create that bridge");
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

    it("broad public-language totals do not let narrow official subsets auto-contradict", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      expect(section).toContain("broader or more formal source-native umbrella label");
      expect(section).toContain("classify that umbrella total as `supports`");
      expect(section).toContain("do NOT make the item `contextual` solely because the source uses a technical umbrella category");
      expect(section).toContain("narrower official subcategory or legal-status subset is NOT automatic contradiction");
      expect(section).toContain("The umbrella total may be `supports`");
      expect(section).toContain("scope-clarifying treatment");
      expect(section).toContain("closest authoritative measures");
      expect(section).toContain("flow or process metrics");
      expect(section).toContain("current stock, standing population, or inventory");
    });

    it("institutional-ecosystem extraction allows convergent actor and network pages to evidence ecosystem existence", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      expect(section).toContain("do NOT demote evidence");
      expect(section).toContain("one actor or one umbrella network page");
      expect(section).toContain("multiple source-native pages collectively enumerate named actors");
      expect(section).toContain("network affiliations");
      expect(section).toContain("broader ecosystem");
    });

    it("institutional-ecosystem extraction blocks broader-problem governance reports unless they describe the named activity ecosystem", () => {
      const section = extractSection(promptContent, "EXTRACT_EVIDENCE");
      expect(section).toContain("governance, legal framework, or regulation of a broader policy problem or harm domain");
      expect(section).toContain("extract NO direct evidence items");
      expect(section).toContain("inventories, governs, certifies, funds, or structurally describes the named activity ecosystem itself");
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

    it("direct category requires evidence about the specific target object named by the claim", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("specific target object named by the claim");
      expect(section).toContain("substantive focus is that same target");
    });

    it("contextual category includes comparator/precedent evidence from same jurisdiction", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("Comparator/precedent evidence");
      expect(section).toContain("different target object");
      // Must have contrastive example: same court, different party = contextual
      expect(section).toContain("different target object inside the same institution");
    });

    it("classifies by what the evidence evaluates, not what topic it shares", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("what the evidence evaluates");
      expect(section).toContain("different target object");
    });

    it("keeps overlap-only rule-governed controversies contextual unless they document the target path", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("legality, procedure, fairness, or similar rule-governed standards");
      expect(section).toContain("earlier or parallel episode, collateral inquiry, sanction episode, or broader institutional controversy");
      expect(section).toContain("directly documents the target path");
      expect(section).toContain("Overlap in actors or institutions alone is insufficient");
    });

    it("keeps foreign government assessments as foreign_reaction even when framed as substantive analysis", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("neutral or standards-based analysis");
      expect(section).toContain("Foreign government report rates Country A institutions as failing core standards");
      expect(section).toContain("Foreign academic study rates Country A institutions as failing core standards");
      expect(section).toContain("Negative example (contrast)");
      expect(section).toContain("-> `contextual`");
      expect(section).toContain("Neutral external reporting or analysis about the directly evaluated target remains \"contextual\"");
    });

    it("uses an issuing-authority override for official foreign-government publications", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("State media, government press offices, and official government publications are not neutral external observers");
      expect(section).toContain("Neutral external observers exclude foreign governments, foreign legislative bodies, executive offices, state media, and official government publications");
    });

    it("does not upgrade foreign government publications to contextual just because they summarize local material", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("Do not upgrade a foreign government publication to `contextual`");
      expect(section).toContain("cites local sources, quotes official records, or describes the target in detail");
      expect(section).toContain("If the publication's own official assessment is the substantive evidence, classify it as `foreign_reaction`");
    });

    it("treats broader-problem governance material as contextual for institutional-ecosystem claims unless it directly describes the named activity ecosystem", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("broader policy problem or harm domain remains");
      expect(section).toContain('"contextual"');
      expect(section).toContain("inventories, governs, certifies, funds, or structurally describes the named activity ecosystem itself");
    });

    it("marks historical/reference totals direct for approximate comparison comparator sides", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("Each claim may include `expectedEvidenceProfile`");
      expect(section).toContain("approximate current-versus-historical or current-versus-reference comparisons");
      expect(section).toContain("comparator route named in `expectedEvidenceProfile`");
      expect(section).toContain("different metric class from the route the claim most naturally implies");
      expect(section).toContain("do not let applicability alone erase the distinction");
    });

    it("can map side-specific evidence to decomposed comparison claims through expectedEvidenceProfile", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      expect(section).toContain("evidence applicability and claim-mapping engine");
      expect(section).toContain("directly reports one side, component, denominator, reference class, or source-native measurement route");
      expect(section).toContain("first gathered for a separate side-specific companion claim");
      expect(section).toContain("Do not omit a materially relevant companion claim ID merely because the item is directional for its current claim");
      expect(section).toContain("Use `claimDirectionByClaimId` to keep the direction claim-scoped");
      expect(section).toContain("the claim statement's surface wording is not the only target");
      expect(section).toContain("one-side source-native value gathered under a side-specific sibling");
      expect(section).toContain("do not withhold the ID");
      expect(section).toContain("carries an input-authored side value, side label, threshold, denominator, source family, or source-native route");
      expect(section).toContain("directly reports that same side's quantity or route");
      expect(section).toContain("Add the comparison claim ID and use `claimDirectionByClaimId`");
      expect(section).toContain("include one matching entry in `claimDirectionByClaimId`");
      expect(section).toContain("do not reduce the companion mapping to `\"neutral\"` by default");
      expect(section).toContain("Do not copy an item's existing `claimDirection` onto a comparison companion");
      expect(section).toContain("same order of magnitude, shared unit, or a broad magnitude bucket is not enough for `\"supports\"`");
      expect(section).toContain("set that companion's `claimDirectionByClaimId` entry to `\"contradicts\"`");
      expect(section).toContain("Keep period totals, cumulative totals, sub-counts, or alternate metric classes separate");
      expect(section).toContain("Do not broadcast evidence to every sibling claim");
    });

    it("uses abstract examples without domain-specific terms", () => {
      const section = extractSection(promptContent, "APPLICABILITY_ASSESSMENT");
      const forbiddenTerms = [
        "Bolsonaro", "Lula", "Moro", "Car Wash", "Lava Jato",
        "STF", "Petrobras",
      ];
      for (const term of forbiddenTerms) {
        expect(section, `APPLICABILITY_ASSESSMENT must not contain "${term}"`).not.toContain(term);
      }
    });
  });

  describe("RELEVANCE_CLASSIFICATION — comparator scoring", () => {
    it("contains target-specific vs comparator source guidance", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      expect(section).toContain("target-specific");
      expect(section).toContain("Comparator/precedent");
    });

    it("caps comparator source relevance scores", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      // Comparator sources should be scored at most 0.5
      expect(section).toContain("0.5");
      expect(section).toContain("comparator");
    });

    it("uses abstract examples without domain-specific terms", () => {
      const section = extractSection(promptContent, "RELEVANCE_CLASSIFICATION");
      const forbiddenTerms = [
        "Bolsonaro", "Lula", "Moro", "Car Wash", "Lava Jato",
        "STF", "Petrobras",
      ];
      for (const term of forbiddenTerms) {
        expect(section, `RELEVANCE_CLASSIFICATION must not contain "${term}"`).not.toContain(term);
      }
    });
  });
});
