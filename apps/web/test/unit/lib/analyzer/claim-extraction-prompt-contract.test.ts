import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const promptPath = path.resolve(
  __dirname,
  "../../../../prompts/claimboundary.prompt.md",
);
const promptContent = readFileSync(promptPath, "utf-8");

function extractSection(content: string, sectionName: string): string | null {
  const lines = content.split("\n");
  let capturing = false;
  const captured: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^## ([A-Z][A-Z0-9_ ]+(?:\([^)]*\))?)\s*$/);
    if (headerMatch) {
      if (capturing) break;
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

describe("Stage-1 prompt contract", () => {
  describe("CLAIM_SALIENCE_COMMITMENT", () => {
    it("locks in priority-anchor emission for truth-condition-bearing modifiers", () => {
      const section = extractSection(promptContent, "CLAIM_SALIENCE_COMMITMENT");
      expect(section, "Section ## CLAIM_SALIENCE_COMMITMENT not found").not.toBeNull();
      expect(section).toContain("Priority-anchor emission.");
      expect(section).toContain("finality, binding-effect, or completion-status qualifier");
      expect(section).toContain("priority preservation anchor");
    });
  });

  describe("CLAIM_CONTRACT_REPAIR", () => {
    const vars: Record<string, string> = {
      analysisInput: "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben",
      anchorText: "rechtskräftig",
      impliedClaim: "The treaty was legally binding before a later public decision.",
      articleThesis: "The claim turns on whether the legal-binding qualifier is preserved.",
      atomicClaimsJson: JSON.stringify([
        {
          id: "AC_01",
          statement: "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben",
          category: "factual",
          verifiability: "high",
          centrality: "high",
          harmPotential: "medium",
          isCentral: true,
          claimDirection: "supports_thesis",
          thesisRelevance: "direct",
          keyEntities: ["Der Bundesrat", "EU-Vertrag"],
          relevantGeographies: ["CH"],
          checkWorthiness: "high",
          specificityScore: 0.9,
          groundingQuality: "strong",
          expectedEvidenceProfile: {
            methodologies: ["official record"],
            expectedMetrics: [],
            expectedSourceTypes: ["legal_document"],
          },
        },
      ], null, 2),
    };

    it("section exists in the real prompt file with a loader-compatible header", () => {
      const section = extractSection(promptContent, "CLAIM_CONTRACT_REPAIR");
      expect(section, "Section ## CLAIM_CONTRACT_REPAIR not found in claimboundary.prompt.md").not.toBeNull();
    });

    it("renders without unresolved ${...} variables", () => {
      const section = extractSection(promptContent, "CLAIM_CONTRACT_REPAIR");
      if (!section) return;
      const { unresolved } = renderWithVars(section, vars);
      expect(
        unresolved,
        `Unresolved variables in CLAIM_CONTRACT_REPAIR: ${unresolved.join(", ")}`,
      ).toEqual([]);
    });

    it("does not leave legacy handlebars placeholders behind", () => {
      const section = extractSection(promptContent, "CLAIM_CONTRACT_REPAIR");
      if (!section) return;
      const { rendered } = renderWithVars(section, vars);
      expect(rendered).not.toContain("{{");
      expect(rendered).not.toContain("}}");
    });

    it("locks in the narrow repair constraints", () => {
      const section = extractSection(promptContent, "CLAIM_CONTRACT_REPAIR");
      expect(section).not.toBeNull();
      expect(section).toContain("truth-condition-bearing anchor");
      expect(section).toContain("the original predicate itself");
      expect(section).toContain("Verbatim Fusion");
      expect(section).toContain("Do not change any existing claim `id`");
      expect(section).toContain("return the same number of claims you received");
      expect(section).toContain("duplicate or near-duplicate");
      expect(section).toContain("Do NOT merge away coordinated-branch claims");
      expect(section).toContain("preserve the shared anchor in each");
      expect(section).toContain('thesisRelevance` is `"direct"`');
      expect(section).toContain("faithful restatement of that original proposition");
      expect(section).toContain("Comparison-Side Repair Fidelity");
      expect(section).toContain("named/current-side proposition from a comparison");
      expect(section).toContain("remaining comparison or parity proposition");
      expect(section).toContain("Preserve the original comparison operator and approximation strength");
      expect(section).toContain("do not repair by copying the named/current-side numeric anchor onto the comparator/reference side");
      expect(section).toContain("Keep the approximation as a relation");
      expect(section).toContain("neutral anaphoric reference");
      expect(section).toContain("compact reference-link to the already-isolated side's input-authored number");
      expect(section).toContain("does not independently reassert that side's factual truth");
      expect(section).toContain("Side-Plus-Relation Triplet Repair");
      expect(section).toContain("folding the relation and approximation strength into the comparator/reference-side claim");
      expect(section).toContain("removing the redundant whole-comparison claim");
      expect(section).toContain("Do not narrow that primary claim with stage labels, methodology windows, measurement frames, or proxy metrics");
      expect(section).toContain('preserve the user\'s original predicate and present the dimension as a neutral qualifier such as `in terms of [dimension]`');
      expect(section).toContain("Do not replace the original predicate with a proxy formulation");
      expect(section).toContain("Do not shift it onto a different clause");
      expect(section).toContain("Do not externalize the anchor into a supporting sub-claim");
      expect(section).toContain("Do not add chronology, causality, legality, or verdict language");
    });
  });

  describe("CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX", () => {
    const vars: Record<string, string> = {
      salienceBindingContextJson: JSON.stringify(
        {
          enabled: true,
          mode: "binding",
          success: false,
          anchors: [
            { text: "legally binding", type: "modal_illocutionary" },
          ],
          priorityAnchors: [
            { text: "legally binding", type: "modal_illocutionary" },
          ],
        },
        null,
        2,
      ),
    };

    it("locks in the success=false fallback semantics", () => {
      const section = extractSection(promptContent, "CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX");
      expect(section, "Section ## CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX not found").not.toBeNull();
      if (!section) return;

      const { unresolved } = renderWithVars(section, vars);
      expect(
        unresolved,
        `Unresolved variables in CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX: ${unresolved.join(", ")}`,
      ).toEqual([]);

      expect(section).toContain("binding authority is unavailable");
      expect(section).toContain("Ignore the provided `anchors` list and follow the base extraction prompt unchanged");
      expect(section).toContain("provided `anchors` array is empty");
      expect(section).toContain("preserving that priority anchor in each branch claim takes precedence over keeping one bundled near-verbatim sentence");
    });
  });

  describe("CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX", () => {
    const vars: Record<string, string> = {
      salienceBindingContextJson: JSON.stringify(
        {
          enabled: true,
          mode: "binding",
          success: true,
          anchors: [
            { text: "legally binding", type: "modal_illocutionary" },
            { text: "signed", type: "action_predicate" },
          ],
          priorityAnchors: [
            { text: "legally binding", type: "modal_illocutionary" },
            { text: "signed", type: "action_predicate" },
          ],
        },
        null,
        2,
      ),
    };

    it("section exists and resolves the binding context payload", () => {
      const section = extractSection(promptContent, "CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX");
      expect(section, "Section ## CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX not found").not.toBeNull();
      if (!section) return;
      const { unresolved } = renderWithVars(section, vars);
      expect(
        unresolved,
        `Unresolved variables in CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX: ${unresolved.join(", ")}`,
      ).toEqual([]);
    });

    it("locks in the thesis-direct tiebreaker and no-discovery rule", () => {
      const section = extractSection(promptContent, "CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX");
      expect(section).not.toBeNull();
      expect(section).toContain("single most decisive thesis-direct anchor");
      expect(section).toContain("Do not discover an anchor outside that list");
      expect(section).toContain('`success` is `false`');
      expect(section).toContain("Fall back to the base validator behavior");
    });
  });

  describe("CLAIM_CONTRACT_VALIDATION", () => {
    it("forbids ellipsis-bridged truth-condition anchors that repair would copy literally", () => {
      const section = extractSection(promptContent, "CLAIM_CONTRACT_VALIDATION");
      expect(section).not.toBeNull();
      expect(section).toContain("must be a contiguous input-authored span");
      expect(section).toContain("not an ellipsis-bridged summary");
      expect(section).toContain("Do not use `...`, `…`, bracketed omissions");
      expect(section).toContain("choose the single decisive contiguous span");
    });
  });

  describe("CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION", () => {
    const vars: Record<string, string> = {
      analysisInput: "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben",
      inputClassification: "single_atomic_claim",
      impliedClaim: "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben.",
      articleThesis: "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben.",
      salienceBindingContextJson: JSON.stringify(
        {
          enabled: true,
          mode: "audit",
          success: true,
          anchors: [
            {
              text: "rechtskräftig",
              type: "modal_illocutionary",
            },
            {
              text: "bevor Volk und Parlament darüber entschieden haben",
              type: "temporal",
            },
          ],
          priorityAnchors: [
            {
              text: "rechtskräftig",
              type: "modal_illocutionary",
            },
          ],
        },
        null,
        2,
      ),
      distinctEventsContextJson: JSON.stringify(
        {
          count: 2,
          events: [
            { name: "Decision gate A", date: "", description: "First input-derived branch" },
            { name: "Decision gate B", date: "", description: "Second input-derived branch" },
          ],
        },
        null,
        2,
      ),
      atomicClaimsJson: JSON.stringify([
        {
          claimId: "AC_01",
          statement: "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben.",
          thesisRelevance: "direct",
          claimDirection: "supports_thesis",
        },
      ], null, 2),
    };

    it("section exists and resolves its variables", () => {
      const section = extractSection(promptContent, "CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION");
      expect(section, "Section ## CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION not found").not.toBeNull();
      if (!section) return;
      const { unresolved } = renderWithVars(section, vars);
      expect(
        unresolved,
        `Unresolved variables in CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION: ${unresolved.join(", ")}`,
      ).toEqual([]);
    });

    it("locks in the branch-bundling retry doctrine", () => {
      const section = extractSection(promptContent, "CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION");
      expect(section).not.toBeNull();
      expect(section).toContain("Near-verbatim is not enough");
      expect(section).toContain("Precommitted salience context");
      expect(section).toContain("the `coordinatedBranchFinding` object is the general structural-finding container");
      expect(section).toContain("Priority anchor guard");
      expect(section).toContain("Comparison-side test");
      expect(section).toContain("Pure bilateral comparison exception");
      expect(section).toContain("No anchor weakening or externalization");
      expect(section).toContain("Coordinated branch test");
      expect(section).toContain("named/current side plus another proposition about the comparator/reference side");
      expect(section).toContain("Do NOT require decomposition merely because a claim compares A and B");
      expect(section).toContain('A statement of the form "A is more/less [predicate] than B" is ordinarily one inseparable comparative proposition');
      expect(section).toContain("Conjunctive gate rule");
      expect(section).toContain("Modifier handling across split propositions");
      expect(section).toContain("a separate thesis-direct modifier/status claim plus separate branch-relation claims is more atomic");
      expect(section).toContain("No false positives for inseparable composites");
      expect(section).toContain("Mandatory branch enumeration");
      expect(section).toContain("Use `branchLabels` for coordinated branches and for comparison sides alike");
      expect(section).toContain("Detected distinct-events reconciliation");
      expect(section).toContain("${distinctEventsContextJson}");
      expect(section).toContain("singleClaimAssessment");
      expect(section).toContain("coordinatedBranchFinding");
      expect(section).toContain("bundledInSingleClaim");
      expect(section).toContain("branchLabels");
    });
  });

  describe("broad public-language total handling", () => {
    it("claim extraction keeps comparison profiles bilateral and anchored to umbrella quantities", () => {
      const section = extractSection(promptContent, "CLAIM_EXTRACTION_PASS2");
      expect(section).not.toBeNull();
      expect(section).toContain("freshest decisive side");
      expect(section).toContain("current aggregate-metric or threshold claims");
      expect(section).toContain("`expectedEvidenceProfile.primaryMetric` must name the single decisive current metric");
      expect(section).toContain("`expectedEvidenceProfile.componentMetrics`");
      expect(section).toContain("secondary checks only");
      expect(section).toContain("compares two quantities, populations, or rates");
      expect(section).toContain("Do NOT collapse a comparative claim to only one side of the comparison");
      expect(section).toContain("keep the approximation operator as a relation");
      expect(section).toContain("copying the named/current-side numeric anchor onto that side");
      expect(section).toContain("neutral anaphoric reference back to the isolated named/current-side quantity");
      expect(section).toContain("broad public-language label");
      expect(section).toContain("closest authoritative source-native umbrella quantity");
      expect(section).toContain("Do NOT silently redefine the claim to the narrowest official subset");
      expect(section).toContain("current-versus-historical or current-versus-reference comparison");
      expect(section).toContain("broadest authoritative current-side quantity");
      expect(section).toContain("explicitly preserve the comparator metric class");
      expect(section).toContain("do not replace endpoint or stock wording with a cumulative/flow total");
      expect(section).toContain("keep both plausible routes and mark the mismatch as a caveat");
      expect(section).toContain("present-state proposition rather than leaving its time window ambiguous");
      expect(section).toContain("recurring official statistics series");
      expect(section).toContain("copy that source-native wording into `expectedEvidenceProfile` verbatim");
    });
  });

  describe("Gate 1 approximate-comparison validation", () => {
    it("treats approximate quantitative comparisons as factual and fidelity-preserving when source-input anchored", () => {
      const section = extractSection(promptContent, "CLAIM_VALIDATION");
      expect(section).not.toBeNull();
      expect(section).toContain("Approximate quantitative comparison check");
      expect(section).toContain("approximate parity");
      expect(section).toContain("Do NOT fail opinion merely because the comparison operator is imprecise");
      expect(section).toContain("imprecision affects expected evidence and verdict confidence");
      expect(section).toContain("finding that value is the point of research");
      expect(section).toContain("Do NOT fail specificity merely because the comparator value must be researched");
      expect(section).toContain("without assigning an invented standalone value to the comparator/reference side");
    });
  });

  describe("distinct event discipline", () => {
    it("keeps distinctEvents tied to input-authored direct path milestones", () => {
      const section = extractSection(promptContent, "CLAIM_EXTRACTION_PASS2");
      expect(section).not.toBeNull();
      expect(section).toContain("Distinct Events Rules");
      expect(section).toContain("The input text — and only the input text — determines what events exist for Stage 2 to investigate");
      expect(section).toContain("direct milestones of that same proceeding or verdict");
      expect(section).toContain("Use the narrowest same-matter path interpretation");
      expect(section).toContain("overlapping institutional dispute involving the same actors or institutions");
      expect(section).toContain("Antecedent background disputes, side investigations, impeachment efforts, sanctions, media controversies, historical comparator cases, or broader institutional conflicts");
      expect(section).toContain("do NOT explode that process into every earlier conflict, investigation, institutional dispute, or actor confrontation");
    });
  });

  describe("comparative ecosystem evidence profiling", () => {
    it("pass1 keeps comparative ecosystem search hints concrete and in-language", () => {
      const section = extractSection(promptContent, "CLAIM_EXTRACTION_PASS1");
      expect(section).not.toBeNull();
      expect(section).toContain("Comparative ecosystem claims only");
      expect(section).toContain("NOT claims whose decisive evidence is a present-state metric, ranking, or threshold");
      expect(section).toContain("when both ecosystem and metric readings are plausible from the wording alone, default to the metric/present-state interpretation");
      expect(section).toContain("`searchHint` stay in the input language");
      expect(section).toContain("activity plus a concrete institutional signal route");
      expect(section).toContain("participant/member/certification lists");
      expect(section).toContain("network rosters");
      expect(section).toContain("generic words such as system, infrastructure, institutions, landscape, or comparison");
      expect(section).toContain("Prefer actor-, participant-, membership-, certification-, roster-, or recurring-output routes");
      expect(section).toContain("governance of a broader policy problem or harm domain");
    });

    it("pass2 keeps comparative ecosystem profiles tied to concrete source-native signals", () => {
      const section = extractSection(promptContent, "CLAIM_EXTRACTION_PASS2");
      expect(section).not.toBeNull();
      expect(section).toContain("Comparative ecosystem claims only");
      expect(section).toContain("NOT claims whose decisive evidence is a present-state metric, ranking, or threshold");
      expect(section).toContain("when both ecosystem and metric readings are plausible from the wording alone, default to the metric/present-state interpretation");
      expect(section).toContain("primary verification routes");
      expect(section).toContain("participant/member/certification lists");
      expect(section).toContain("source-native program participation records");
      expect(section).toContain("Broad landscape surveys, content analyses, and generic structural discussions may appear only as secondary/contextual routes");
      expect(section).toContain("Do NOT let `expectedEvidenceProfile` reduce the comparison to abstract metrics");
      expect(section).toContain("source-native records for each side");
      expect(section).toContain("broader policy problem, harm domain, or adjacent sector");
      expect(section).toContain("secondary/contextual by default");
    });
  });

  describe("efficiency predicate discipline", () => {
    it("keeps broad efficiency decompositions inside efficiency frames instead of operational proxies", () => {
      const pass1 = extractSection(promptContent, "CLAIM_EXTRACTION_PASS1");
      const pass2 = extractSection(promptContent, "CLAIM_EXTRACTION_PASS2");

      expect(pass1).not.toBeNull();
      expect(pass1).toContain("keep the original compared entities and broad predicate at the same level of generality as the input");
      expect(pass1).toContain("the rough claim should keep that same comparison rather than restating it as a different metric, mechanism, or proxy claim");
      expect(pass1).toContain("Reserve narrower distinctions for verification framing, not rough-claim wording");
      expect(pass1).toContain("preserve the same compared entities and broad predicate in every rough claim");
      expect(pass1).toContain("narrower implementation, pathway, subsystem, or exemplar variant");
      expect(pass1).toContain("Preferred rough-claim form for broad comparative predicates");
      expect(pass1).toContain('"[A] is more/less [same predicate] than [B] in terms of [dimension]"');
      expect(pass2).not.toBeNull();
      expect(pass2).toContain("comparative efficiency, optimization, or resource-use predicates");
      expect(pass2).toContain("full-pathway vs. use-phase-only vs. conversion-stage efficiency");
      expect(pass2).toContain("keep the original compared entities and broad predicate at the same level of generality as the input");
      expect(pass2).toContain("the atomic claim must keep that same comparison rather than restating it as a different metric, mechanism, or proxy claim");
      expect(pass2).toContain("Keep narrower specificity inside `expectedEvidenceProfile`, search queries, or evidence scopes instead of the claim statement");
      expect(pass2).toContain("keep decomposition inside actual efficiency measurement frames or system boundaries");
      expect(pass2).toContain("Do NOT switch to downstream operational proxies or adjacent performance traits");
      expect(pass2).toContain("Keep the compared entities at the same level of generality as the input across all dimension claims");
      expect(pass2).toContain("collapse back to a single broad claim rather than forcing a proxy decomposition");
      expect(pass2).toContain("Comparative predicate template (MANDATORY)");
      expect(pass2).toContain('"[A] is more/less [same predicate] than [B] in terms of [dimension]"');
      expect(pass2).toContain('"achieves higher conversion efficiency"');
      expect(pass2).toContain('"requires less total input per unit output"');
      expect(pass2).toContain('"has lower pathway losses"');
    });
  });

  describe("decomposition integrity guard", () => {
    it("forbids whole-input carry-through when a comparison sentence is decomposed", () => {
      const pass1 = extractSection(promptContent, "CLAIM_EXTRACTION_PASS1");
      const pass2 = extractSection(promptContent, "CLAIM_EXTRACTION_PASS2");
      const contract = extractSection(promptContent, "CLAIM_CONTRACT_VALIDATION");

      expect(pass1).not.toBeNull();
      expect(pass2).not.toBeNull();
      expect(contract).not.toBeNull();

      expect(pass1).toContain("rest of a comparison class");
      expect(pass1).toContain("Do NOT use this label");
      expect(pass1).toContain("Coordinated branch rule");
      expect(pass1).toContain("shared temporal or conditional relation");
      expect(pass1).toContain("independently be verified, falsified, or dated on their own");
      expect(pass1).toContain("treat the input as `multi_assertion_input`");
      expect(pass1).toContain("preserve the shared anchor");
      expect(pass1).toContain("do NOT keep the unsplit whole sentence alongside branch claims");
      expect(pass1).toContain("A conjunctive clause such as \"A and B decided\" does NOT count as a single atomic branch");
      expect(pass1).toContain("separate possible timelines or outcomes");
      expect(pass1).toContain("Modifier-fusion rule for coordinated branches");
      expect(pass1).toContain("keep that modifier fused with the same main act/state in EVERY branch claim");
      expect(pass1).toContain("inseparable rank/order/composite proposition");
      expect(pass1).toContain("Decomposition integrity");
      expect(pass1).toContain("proper sub-assertion");
      expect(pass1).toContain("whole-input restatement");
      expect(pass2).toContain("Coordinated branch rule");
      expect(pass2).toContain("shared temporal or conditional relation");
      expect(pass2).toContain("independently be verified, falsified, or dated on their own");
      expect(pass2).toContain("treat the input as `multi_assertion_input`");
      expect(pass2).toContain("Extract one thesis-direct atomic claim per explicit independently verifiable proposition");
      expect(pass2).toContain("preserve each explicit independently verifiable proposition");
      expect(pass2).toContain("Do NOT omit a later coordinated proposition");
      expect(pass2).toContain("Do NOT let one returned claim absorb or paraphrase away another explicit coordinated proposition");
      expect(pass2).toContain("preserve the shared anchor");
      expect(pass2).toContain("do NOT keep the unsplit whole sentence alongside branch claims");
      expect(pass2).toContain("A conjunctive clause such as \"A and B decided\" does NOT count as a single atomic branch");
      expect(pass2).toContain("Modifier-fusion rule for coordinated branches");
      expect(pass2).toContain("unless the independent-status exception below applies");
      expect(pass2).toContain("Independent-status exception");
      expect(pass2).toContain("Extract one thesis-direct claim preserving the modifier with the main act/state");
      expect(pass2).toContain("Status-plus-branch bundling prohibition");
      expect(pass2).toContain("Do not repeat the status qualifier inside every branch claim");
      expect(pass2).toContain("Single-claim bundling prohibition");
      expect(pass2).toContain("you MUST split it");
      expect(pass2).toContain("named/current side plus a separate proposition about the comparator/reference side");
      expect(pass2).toContain("Preserve the shared relation or comparison anchor in each split claim");
      expect(pass2).toContain("A conjunctive clause with one shared verb phrase does not override this rule");
      expect(pass2).toContain("inseparable rank/order/composite proposition");
      expect(pass2).toContain("rest of a comparison class");
      expect(pass2).toContain("Decomposition integrity (MANDATORY)");
      expect(pass2).toContain("Comparison decomposition integrity (MANDATORY)");
      expect(pass2).toContain("the companion claim must isolate the remaining comparator/reference or parity proposition");
      expect(pass2).toContain("compact reference-link to the already-isolated quantity");
      expect(pass2).toContain("does not independently reassert that side's factual truth");
      expect(pass2).toContain("No side-plus-relation triplets");
      expect(pass2).toContain("return side A plus a companion claim that carries the remaining side B relation to side A");
      expect(pass2).toContain("proper sub-assertion");
      expect(pass2).toContain("whole-input restatement");
      expect(pass2).toContain("If verifying one returned thesis-direct claim still requires resolving another returned thesis-direct claim");
      expect(contract).toContain("non-atomic single-claim bundling");
      expect(contract).toContain("externalization of a main-act modifier into a standalone sub-claim");
      expect(contract).toContain("Single-claim bundling audit (MANDATORY)");
      expect(contract).toContain("returns only one thesis-direct claim");
      expect(contract).toContain("The same rule applies when the coordination is written as one conjunctive clause with a shared verb phrase");
      expect(contract).toContain("comparison-side bundling");
      expect(contract).toContain("current-versus-historical, current-versus-threshold, or named-side-versus-rest-of-comparison-class comparisons");
      expect(contract).toContain("distinct institutions, actor groups, proceedings, or decision gates");
      expect(contract).toContain("Modifier externalization audit (MANDATORY)");
      expect(contract).toContain("one thesis-direct modifier/status claim plus separate thesis-direct branch claims");
      expect(contract).toContain('set `preservesEvaluativeMeaning: true`, `proxyDriftSeverity: "none"` or `"mild"`, and `recommendedAction: "keep"`');
      expect(contract).toContain("may be preserved as its own thesis-direct claim");
      expect(contract).toContain("bundled claim is non-atomic");
      expect(contract).toContain("`rePromptRequired` must be true");
      expect(contract).toContain("whole-input carry-through");
      expect(contract).toContain("another thesis-direct claim restates that same side plus the full comparison");
      expect(contract).toContain("The companion claim must isolate the remaining comparator/reference or parity proposition");
      expect(contract).toContain("semantically subsuming another returned claim");
      expect(contract).toContain("literal, near-verbatim, or semantic restatement of the whole input");
      expect(contract).toContain("whole proposition plus one of its parts");
      expect(contract).toContain("The approximation must remain a relation, not an invented comparator-side metric");
      expect(contract).toContain("Do NOT fail merely because the companion claim contains a short reference-link");
      expect(contract).toContain("is not asserted as a separate current-state fact inside the companion claim");
      expect(contract).toContain("Explicit conjunct coverage audit (MANDATORY)");
      expect(contract).toContain("preserve each explicit proposition unit");
      expect(contract).toContain("omitting another explicit independently verifiable conjunct");
      expect(contract).toContain("Detected distinct-events reconciliation");
      expect(contract).toContain("${distinctEventsContextJson}");
    });
  });
});
