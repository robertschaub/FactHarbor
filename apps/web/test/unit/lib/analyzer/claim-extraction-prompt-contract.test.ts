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
      expect(section).toContain("Return the same number of claims you received");
      expect(section).toContain('thesisRelevance` is `"direct"`');
      expect(section).toContain("faithful restatement of that original proposition");
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

  describe("broad public-language total handling", () => {
    it("claim extraction keeps comparison profiles bilateral and anchored to umbrella quantities", () => {
      const section = extractSection(promptContent, "CLAIM_EXTRACTION_PASS2");
      expect(section).not.toBeNull();
      expect(section).toContain("freshest decisive side");
      expect(section).toContain("compares two quantities, populations, or rates");
      expect(section).toContain("Do NOT collapse a comparative claim to only one side of the comparison");
      expect(section).toContain("broad public-language label");
      expect(section).toContain("closest authoritative source-native umbrella quantity");
      expect(section).toContain("Do NOT silently redefine the claim to the narrowest official subset");
      expect(section).toContain("current-versus-historical or current-versus-reference comparison");
      expect(section).toContain("broadest authoritative current-side quantity");
      expect(section).toContain("recurring official statistics series");
      expect(section).toContain("copy that source-native wording into `expectedEvidenceProfile` verbatim");
    });
  });

  describe("comparative ecosystem evidence profiling", () => {
    it("pass1 keeps comparative ecosystem search hints concrete and in-language", () => {
      const section = extractSection(promptContent, "CLAIM_EXTRACTION_PASS1");
      expect(section).not.toBeNull();
      expect(section).toContain("`searchHint` stay in the input language");
      expect(section).toContain("activity plus a concrete institutional signal route");
      expect(section).toContain("participant/member/certification lists");
      expect(section).toContain("network rosters");
      expect(section).toContain("generic words such as system, infrastructure, institutions, landscape, or comparison");
    });

    it("pass2 keeps comparative ecosystem profiles tied to concrete source-native signals", () => {
      const section = extractSection(promptContent, "CLAIM_EXTRACTION_PASS2");
      expect(section).not.toBeNull();
      expect(section).toContain("primary verification routes");
      expect(section).toContain("participant/member/certification lists");
      expect(section).toContain("source-native program participation records");
      expect(section).toContain("Broad landscape surveys, content analyses, and generic structural discussions may appear only as secondary/contextual routes");
      expect(section).toContain("Do NOT let `expectedEvidenceProfile` reduce the comparison to abstract metrics");
      expect(section).toContain("source-native records for each side");
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
      expect(pass1).toContain("Decomposition integrity");
      expect(pass1).toContain("proper sub-assertion");
      expect(pass1).toContain("whole-input restatement");
      expect(pass2).toContain("rest of a comparison class");
      expect(pass2).toContain("Decomposition integrity (MANDATORY)");
      expect(pass2).toContain("proper sub-assertion");
      expect(pass2).toContain("whole-input restatement");
      expect(pass2).toContain("If verifying one returned thesis-direct claim still requires resolving another returned thesis-direct claim");
      expect(contract).toContain("whole-input carry-through");
      expect(contract).toContain("semantically subsuming another returned claim");
      expect(contract).toContain("literal, near-verbatim, or semantic restatement of the whole input");
      expect(contract).toContain("whole proposition plus one of its parts");
    });
  });
});
