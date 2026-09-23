import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const offline = vi.hoisted(() => {
  process.env.FH_DEBUG_LOG_FILE = "false";
  return {
    generate: vi.fn(() => { throw new Error("Unexpected model call in offline test"); }),
    database: vi.fn(() => { throw new Error("Database access forbidden"); }),
    network: vi.fn(() => { throw new Error("Network access forbidden"); }),
  };
});
vi.mock("ai", async original => ({
  ...await original<typeof import("ai")>(),
  generateText: offline.generate,
  generateObject: offline.generate,
}));
vi.mock("sqlite", () => ({ open: offline.database }));
vi.mock("@/lib/config-loader", () => ({
  loadPromptConfig: vi.fn(), loadPipelineConfig: vi.fn(),
  loadSearchConfig: vi.fn(), loadCalcConfig: vi.fn(),
}));
vi.mock("@/lib/analyzer/llm", async original => ({
  ...await original<typeof import("@/lib/analyzer/llm")>(),
  getModelForTask: () => ({ model: {}, modelName: "offline", provider: "anthropic" }),
  extractStructuredOutput: (response: { output: unknown }) => response.output,
}));

import {
  applySingleClaimAtomicityValidation,
  buildContractRetrySaliencePlan,
  ClaimContractOutputSchema,
  evaluateClaimContractValidation,
  extractClaims,
  renderClaimContractRetryDiagnostics,
  renderClaimContractRetryGuidance,
  selectPreferredSingleClaimContractChallenge,
  type ClaimContractValidationResult,
  type EvaluatedClaimContractValidation,
} from "@/lib/analyzer/claim-extraction-stage";
import { clearPromptCache, loadPromptFile } from "@/lib/analyzer/prompt-loader";
import { loadPromptConfig, loadPipelineConfig, loadSearchConfig, loadCalcConfig } from "@/lib/config-loader";
import { DEFAULT_CALC_CONFIG, DEFAULT_PIPELINE_CONFIG, DEFAULT_SEARCH_CONFIG } from "@/lib/config-schemas";
import type { AtomicClaim, CBResearchState } from "@/lib/analyzer/types";

const promptFile = readFileSync(path.resolve(__dirname, "../../../../prompts/claimboundary.prompt.md"), "utf8");
let activePrompt: string;
// Exact Captain-approved inputs. Structural mutations below are validator
// outputs, not new analysis inputs or semantic model-quality judgments.
const german = "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben";
const portuguese = "O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas";

function claim(statement = german): AtomicClaim {
  return {
    id: "AC_01", statement, category: "factual", centrality: "high",
    harmPotential: "medium", isCentral: true, claimDirection: "supports_thesis",
    thesisRelevance: "direct", keyEntities: [], checkWorthiness: "high",
    specificityScore: 1, groundingQuality: "strong",
    expectedEvidenceProfile: { methodologies: [], expectedMetrics: [], expectedSourceTypes: [] },
  };
}

function assessment(overrides: Partial<ClaimContractValidationResult> = {}): ClaimContractValidationResult {
  return ClaimContractOutputSchema.parse({
    inputAssessment: { preservesOriginalClaimContract: true, rePromptRequired: false, summary: "accepted" },
    truthConditionAnchor: {
      presentInInput: true, anchorText: "rechtskräftig",
      preservedInClaimIds: ["AC_01"], preservedByQuotes: ["rechtskräftig"],
    },
    claims: [{ claimId: "AC_01", preservesEvaluativeMeaning: true, usesNeutralDimensionQualifier: true,
      proxyDriftSeverity: "none", recommendedAction: "keep", reasoning: "primary assessment" }],
    ...overrides,
  });
}

function retryAssessment(overrides: Partial<ClaimContractValidationResult> = {}) {
  return assessment({
    inputAssessment: { preservesOriginalClaimContract: false, rePromptRequired: true, summary: "structural retry" },
    ...overrides,
  });
}

async function render(evaluation: EvaluatedClaimContractValidation | undefined, claims = [claim()]) {
  return renderClaimContractRetryGuidance(evaluation, claims, buildContractRetrySaliencePlan(evaluation));
}

function context(content: string) {
  return JSON.parse(content.match(/```json\s*([\s\S]*?)```/)![1]);
}

function removeSection(name: string, empty = false) {
  activePrompt = activePrompt.replace(
    new RegExp(`^## ${name}\\r?\\n[\\s\\S]*?(?=^## |$(?![\\s\\S]))`, "m"),
    empty ? `## ${name}\n\n---\n\n` : "",
  );
  clearPromptCache();
}

beforeEach(() => {
  activePrompt = promptFile;
  clearPromptCache();
  offline.generate.mockReset();
  offline.generate.mockImplementation(() => { throw new Error("Unexpected model call in offline test"); });
  offline.database.mockClear();
  offline.network.mockClear();
  vi.stubGlobal("fetch", offline.network);
  vi.mocked(loadPromptConfig).mockImplementation(async () => ({
    content: activePrompt,
    contentHash: createHash("sha256").update(activePrompt).digest("hex"),
  }) as Awaited<ReturnType<typeof loadPromptConfig>>);
  vi.mocked(loadPipelineConfig).mockResolvedValue({ config: DEFAULT_PIPELINE_CONFIG } as never);
  vi.mocked(loadSearchConfig).mockResolvedValue({ config: DEFAULT_SEARCH_CONFIG } as never);
  vi.mocked(loadCalcConfig).mockResolvedValue({ config: {
    ...DEFAULT_CALC_CONFIG,
    salienceCommitment: { ...DEFAULT_CALC_CONFIG.salienceCommitment, enabled: false },
    claimContractValidation: { ...DEFAULT_CALC_CONFIG.claimContractValidation, enabled: true, maxRetries: 1 },
  } } as never);
});

afterEach(() => {
  expect(offline.network).not.toHaveBeenCalled();
  expect(offline.database).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe("carrier presence and fidelity", () => {
  it.each([false, true])("does not treat a retry-only carrier as drift (top-level retry=%s)", retry => {
    const raw = assessment();
    raw.claims[0].recommendedAction = "retry";
    raw.inputAssessment.rePromptRequired = retry;
    raw.inputAssessment.preservesOriginalClaimContract = !retry;
    const result = evaluateClaimContractValidation(raw, [claim()]);
    expect(result.anchorRetryReason).toBeUndefined();
    expect(result.effectiveRePromptRequired).toBe(retry);
    expect(result.summary.preservesContract).toBe(!retry);
    expect(result.summary.truthConditionAnchor?.validPreservedIds).toEqual(["AC_01"]);
  });

  it.each(["none", "mild"] as const)("separates generic promotion from explicit carriers for severity=%s", severity => {
    const raw = assessment();
    raw.claims[0].proxyDriftSeverity = severity;
    raw.truthConditionAnchor!.preservedInClaimIds = [];
    const uncited = evaluateClaimContractValidation(raw, [claim()], "multi_assertion_input");
    expect(uncited.summary.preservesContract).toBe(true); // intentional uncited-anchor exception
    expect(uncited.summary.contractCarrierClaimIds ?? []).toEqual(severity === "none" ? ["AC_01"] : []);
    raw.truthConditionAnchor!.preservedInClaimIds = ["AC_01"];
    expect(evaluateClaimContractValidation(raw, [claim()], "multi_assertion_input").summary.contractCarrierClaimIds).toEqual(["AC_01"]);
  });
});

describe("UCM retry guidance", () => {
  it("registers the new sections/variables in the actual prompt", async () => {
    const loaded = await loadPromptFile("claimboundary");
    expect(loaded.success).toBe(true);
    expect(loaded.warnings.filter(w => w.type === "missing_section")).toEqual([]);
    expect(loaded.prompt?.frontmatter.version).toBe("1.0.13");
    expect(loaded.prompt?.frontmatter.requiredSections).toEqual(expect.arrayContaining([
      "CLAIM_CONTRACT_RETRY_GUIDANCE", "CLAIM_CONTRACT_RETRY_ANCHOR_GUIDANCE", "CLAIM_CONTRACT_RETRY_ATOMICITY_GUIDANCE",
      "CLAIM_CONTRACT_CARRIER_FIDELITY_REASON",
    ]));
    expect(loaded.prompt?.frontmatter.variables).toEqual(expect.arrayContaining([
      "retryValidationContextJson", "anchorGuidance", "atomicityGuidance", "contractRetryAtomicityGuidance", "anchorText", "carrierClaimIds",
    ]));
  });

  it.each([[german, "rechtskräftig"], [portuguese, "justas"]])("renders original-language anchor finding for %s", async (input, anchor) => {
    const raw = retryAssessment({ truthConditionAnchor: {
      presentInInput: true, anchorText: anchor, preservedInClaimIds: [], preservedByQuotes: [],
    } });
    const evaluation = evaluateClaimContractValidation(raw, [claim(input)]);
    expect(evaluation.anchorRetryReason).toBeUndefined();
    expect(buildContractRetrySaliencePlan(evaluation).anchorEscalation.mode).toBe("audit_guidance_only");
    const rendered = await render(evaluation, [claim(input)]);
    expect(rendered.content).toContain(`structural checks: "${anchor}"`);
    expect(rendered.content).not.toContain("${");
    expect(rendered.content).not.toContain("claims omitted");
  });

  it("does not describe normative injection with valid carriers as anchor omission", async () => {
    const raw = assessment({ antiInferenceCheck: {
      normativeClaimInjected: true, injectedClaimIds: ["AC_01"], reasoning: "injection finding",
    } });
    const evaluation = evaluateClaimContractValidation(raw, [claim()]);
    expect(evaluation.anchorRetryReason).toContain("normative_injection");
    expect(evaluation.effectiveRePromptRequired).toBe(true);
    expect(buildContractRetrySaliencePlan(evaluation).anchorEscalation.mode).toBe("none");
    const result = await render(evaluation);
    expect(result.content).not.toContain("supplied no carrier");
    expect(context(result.content).antiInferenceCheck).toEqual(raw.antiInferenceCheck);
  });

  it.each(["invalid_id", "normative_injection"] as const)("does not forward a code-written %s diagnostic into retry guidance", async kind => {
    const raw = assessment();
    if (kind === "invalid_id") raw.truthConditionAnchor!.preservedInClaimIds = ["AC_99"];
    else raw.antiInferenceCheck = { normativeClaimInjected: true, injectedClaimIds: ["AC_01"], reasoning: "validator finding" };
    const evaluated = await renderClaimContractRetryDiagnostics(evaluateClaimContractValidation(raw, [claim()]));
    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.summary.preservesContract).toBe(false);
    expect(evaluated.anchorRetryReason).toContain(kind === "invalid_id" ? "anchor_provenance_failed" : "normative_injection");
    const result = await render(evaluated);
    const payload = context(result.content);
    expect(payload).not.toHaveProperty("anchorRetryReason");
    expect(payload.carrierFidelityGuidance).toBeNull();
    expect(result.content).not.toContain(evaluated.anchorRetryReason);
    if (kind === "invalid_id") expect(result.content).toContain("supplied no carrier that passed the structural checks");
    else expect(payload.antiInferenceCheck).toEqual(raw.antiInferenceCheck);
    expect(evaluated.summary.anchorRetryReason).toBe(evaluated.anchorRetryReason);
  });

  it("uses the winning challenger's summary, anchor and per-claim assessment", async () => {
    const primary = evaluateClaimContractValidation(assessment(), [claim()]);
    const raw = retryAssessment({ truthConditionAnchor: {
      presentInInput: true, anchorText: "bevor", preservedInClaimIds: [], preservedByQuotes: [],
    } });
    raw.inputAssessment.summary = "challenger summary";
    raw.claims[0] = { ...raw.claims[0], preservesEvaluativeMeaning: false, reasoning: "challenger finding" };
    const challenger = evaluateClaimContractValidation(raw, [claim()]);
    const winner = selectPreferredSingleClaimContractChallenge(primary, challenger);
    const result = await render(winner);
    expect(result.failingClaimCount).toBe(1); // fidelity=false alone is selected
    expect(result.content).toContain("challenger finding");
    expect(result.content).toContain('structural checks: "bevor"');
    expect(result.content).not.toContain("primary assessment");
    expect(context(result.content).summary).toBe("challenger summary");
  });

  it("does not invent per-claim issues when only the evaluated critique is available", async () => {
    const { assessment: _raw, ...evaluation } = evaluateClaimContractValidation(retryAssessment(), [claim()]);
    const result = await render(evaluation);
    expect(context(result.content)).toEqual({ validationAvailable: true, summary: "structural retry", carrierFidelityGuidance: null, flaggedAssessments: [], antiInferenceCheck: null });
    expect(result.failingClaimCount).toBe(0);
  });

  it("omits synthesized action/severity judgments while preserving the validator's reasoning", async () => {
    const raw = assessment();
    const { recommendedAction: _action, proxyDriftSeverity: _severity, ...finding } = raw.claims[0];
    const parsed = ClaimContractOutputSchema.parse({ ...raw, claims: [{ ...finding,
      preservesEvaluativeMeaning: false, reasoning: "structural finding; recommendedAction:retry",
    }] });
    expect(parsed.claims[0].recommendedAction).toBe("keep");
    expect(parsed.claims[0].proxyDriftSeverity).toBe("none");
    const result = await render(evaluateClaimContractValidation(parsed, [claim()]));
    expect(context(result.content).flaggedAssessments).toEqual([{
      claimId: "AC_01", preservesEvaluativeMeaning: false, usesNeutralDimensionQualifier: true,
      reasoning: "structural finding; recommendedAction:retry",
    }]);
  });

  it.each([[german, false], [portuguese, false], [german, true]] as const)("delivers the rendered UCM guidance to retry Pass 2 for %s (material only=%s)", async (input, materialOnly) => {
    const claims = [claim(input)];
    const rejected = materialOnly ? assessment() : retryAssessment({ truthConditionAnchor: {
      presentInInput: true, anchorText: input, preservedInClaimIds: [], preservedByQuotes: [],
    } });
    if (materialOnly) rejected.claims[0].proxyDriftSeverity = "material";
    else rejected.claims[0].recommendedAction = "retry";
    const evaluated = await renderClaimContractRetryDiagnostics(evaluateClaimContractValidation(rejected, claims));
    const expectedGuidance = await render(evaluated, claims);
    if (materialOnly) {
      expect(context(expectedGuidance.content).summary).toBe("accepted");
      expect(context(expectedGuidance.content).carrierFidelityGuidance).toContain("carrier_fidelity_failed");
    }
    const pass2 = { impliedClaim: input, articleThesis: input, backgroundDetails: input,
      inputClassification: "single_atomic_claim", atomicClaims: claims };
    for (const output of [
      { impliedClaim: input, backgroundDetails: input, roughClaims: [], detectedLanguage: input === german ? "de" : "pt" },
      pass2, rejected, pass2, assessment(),
      { validatedClaims: [{ claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "accepted" }] },
    ]) offline.generate.mockResolvedValueOnce({ output, usage: {}, finishReason: "stop" } as never);
    const state = { originalInput: input, warnings: [], sources: [], searchQueries: [], llmCalls: 0 } as unknown as CBResearchState;
    const result = await extractClaims(state);
    expect(offline.generate).toHaveBeenCalledTimes(6);
    const calls = offline.generate.mock.calls as unknown as Array<[{ messages: Array<{ role: string; content: string }> }]>;
    const initialUser = calls[1][0].messages.find(m => m.role === "user")!.content;
    const retryUser = calls[3][0].messages.find(m => m.role === "user")!.content;
    expect(initialUser).not.toContain("CLAIM CONTRACT CORRECTION");
    expect(retryUser).toContain(expectedGuidance.content);
    expect(retryUser).toContain(input);
    expect(result.contractValidationSummary?.stageAttribution).toBe("retry");
    expect(result.contractValidationSummary?.preservesContract).toBe(true);
  });

  it("preserves assessment provenance through an atomicity override", async () => {
    const primary = evaluateClaimContractValidation(assessment(), [claim()]);
    const evaluation = applySingleClaimAtomicityValidation(primary, {
      singleClaimAssessment: { isAtomic: false, rePromptRequired: true, summary: "atomicity finding" },
      coordinatedBranchFinding: { presentInInput: true, bundledInSingleClaim: true,
        branchLabels: ["Volk", "Parlament"], reasoning: "independent branches" },
    });
    expect(evaluation.assessment).toBe(primary.assessment);
    const result = await render(evaluation);
    expect(result.content).toContain("atomicity assessment requires splitting");
    expect(result.content).not.toContain("supplied no carrier");
  });

  it.each([true, false])("retains shared fusion instructions with validationAvailable=%s", async available => {
    const result = await render(available ? evaluateClaimContractValidation(retryAssessment(), [claim()]) : undefined);
    expect(context(result.content).validationAvailable).toBe(available);
    for (const phrase of ["must fuse any truth-condition-bearing modifier", "Do NOT substitute proxy predicates", "shared predicate or modifier applies across multiple actors"]) {
      expect(result.content).toContain(phrase);
    }
  });

  it("does not require unused fragments", async () => {
    removeSection("CLAIM_CONTRACT_RETRY_ANCHOR_GUIDANCE");
    removeSection("CLAIM_CONTRACT_RETRY_ATOMICITY_GUIDANCE");
    await expect(render(evaluateClaimContractValidation(retryAssessment(), [claim()]))).resolves.toHaveProperty("content");
  });

  it.each(["CLAIM_CONTRACT_RETRY_GUIDANCE", "CLAIM_CONTRACT_RETRY_ANCHOR_GUIDANCE", "CLAIM_CONTRACT_RETRY_ATOMICITY_GUIDANCE"])("rejects a required empty section: %s", async section => {
    removeSection(section, true);
    const raw = retryAssessment({ truthConditionAnchor: {
      presentInInput: true, anchorText: "rechtskräftig", preservedInClaimIds: [], preservedByQuotes: [],
    } });
    const evaluation = evaluateClaimContractValidation(raw, [claim()]);
    evaluation.atomicityRetryReason = "structural finding";
    await expect(render(evaluation)).rejects.toThrow(section);
    expect(offline.generate).not.toHaveBeenCalled();
  });

  it.each(["CLAIM_CONTRACT_RETRY_GUIDANCE", "CLAIM_CONTRACT_RETRY_ANCHOR_GUIDANCE"])("propagates missing %s through extractClaims before retry/repair", async section => {
    removeSection(section);
    const response = (output: unknown) => ({ output, usage: {}, finishReason: "stop" });
    offline.generate
      .mockResolvedValueOnce(response({ impliedClaim: german, backgroundDetails: german, roughClaims: [], detectedLanguage: "de" }) as never)
      .mockResolvedValueOnce(response({ impliedClaim: german, articleThesis: german, backgroundDetails: german, atomicClaims: [claim()] }) as never)
      .mockResolvedValueOnce(response(retryAssessment({ truthConditionAnchor: {
        presentInInput: true, anchorText: "rechtskräftig", preservedInClaimIds: [], preservedByQuotes: [],
      } })) as never);
    const state = { originalInput: german, warnings: [], sources: [], searchQueries: [], llmCalls: 0 } as unknown as CBResearchState;
    await expect(extractClaims(state)).rejects.toThrow(section);
    expect(offline.generate).toHaveBeenCalledTimes(3); // initial mocked passes only
    expect(state.llmCalls).toBe(3);
  });

  it("propagates a missing atomicity fragment before retry/repair", async () => {
    removeSection("CLAIM_CONTRACT_RETRY_ATOMICITY_GUIDANCE");
    vi.mocked(loadCalcConfig).mockResolvedValue({ config: {
      ...DEFAULT_CALC_CONFIG,
      salienceCommitment: { ...DEFAULT_CALC_CONFIG.salienceCommitment, enabled: true, mode: "audit" },
      claimContractValidation: { ...DEFAULT_CALC_CONFIG.claimContractValidation, enabled: true, maxRetries: 1 },
    } } as never);
    const outputs = [
      { impliedClaim: german, backgroundDetails: german, roughClaims: [], detectedLanguage: "de" },
      { anchors: [{ text: "rechtskräftig", inputSpan: "rechtskräftig", type: "modal_illocutionary",
        rationale: "input modifier", truthConditionShiftIfRemoved: "changes predicate" }] },
      { impliedClaim: german, articleThesis: german, backgroundDetails: german, atomicClaims: [claim()] },
      assessment(),
      { singleClaimAssessment: { isAtomic: false, rePromptRequired: true, summary: "atomicity finding" },
        coordinatedBranchFinding: { presentInInput: true, bundledInSingleClaim: true,
          branchLabels: ["Volk", "Parlament"], reasoning: "independent branches" } },
    ];
    for (const output of outputs) {
      offline.generate.mockResolvedValueOnce({ output, usage: {}, finishReason: "stop" } as never);
    }
    const state = { originalInput: german, warnings: [], sources: [], searchQueries: [], llmCalls: 0 } as unknown as CBResearchState;
    await expect(extractClaims(state)).rejects.toThrow("CLAIM_CONTRACT_RETRY_ATOMICITY_GUIDANCE");
    expect(offline.generate).toHaveBeenCalledTimes(5);
    expect(state.llmCalls).toBe(5);
  });
});

describe("UCM carrier fidelity diagnostic", () => {
  it.each([
    [german, "rechtskräftig", false, "none", false],
    [portuguese, "justas", true, "material", false],
    [german, "rechtskräftig", false, "none", true],
    [portuguese, "justas", true, "material", true],
  ] as const)("retains guard and routing for %s (anchor=%s, meaning=%s, severity=%s, retry=%s)", async (input, anchor, meaning, severity, retry) => {
    const raw = assessment({ truthConditionAnchor: {
      presentInInput: true, anchorText: anchor, preservedInClaimIds: ["AC_01"], preservedByQuotes: [anchor],
    } });
    raw.claims[0].preservesEvaluativeMeaning = meaning;
    raw.claims[0].proxyDriftSeverity = severity;
    raw.inputAssessment.rePromptRequired = retry;
    const evaluated = evaluateClaimContractValidation(raw, [claim(input)]);
    const rendered = await renderClaimContractRetryDiagnostics(evaluated);
    expect(rendered.effectiveRePromptRequired).toBe(true);
    expect(rendered.summary.preservesContract).toBe(false);
    expect(rendered.summary.truthConditionAnchor?.validPreservedIds).toEqual(["AC_01"]);
    expect(buildContractRetrySaliencePlan(rendered)).toEqual(buildContractRetrySaliencePlan(evaluated));
    expect(buildContractRetrySaliencePlan(rendered).anchorEscalation.mode).toBe("none");
    expect(rendered.anchorRetryReason).toContain(`anchor "${anchor}" in claim(s) [AC_01]`);
    expect(rendered.anchorRetryReason).toContain("Carrier presence does not establish fidelity");
    expect(rendered.anchorRetryReason).not.toContain("self-contradiction");
    expect(rendered.summary.anchorRetryReason).toBe(rendered.anchorRetryReason);
    const guidance = await render(rendered, [claim(input)]);
    expect(context(guidance.content).carrierFidelityGuidance).toBe(rendered.carrierFidelityGuidance);
    expect(context(guidance.content)).not.toHaveProperty("anchorRetryReason");
    expect(rendered.summary).not.toHaveProperty("carrierFidelityGuidance");
    expect(context(guidance.content).flaggedAssessments[0]).not.toHaveProperty("proxyDriftSeverity");
    expect(rendered).not.toHaveProperty("carrierFidelityFailure");
    expect(rendered.summary).not.toHaveProperty("carrierFidelityFailure");
    expect(await renderClaimContractRetryDiagnostics(rendered)).toEqual(rendered);
  });

  it("preserves separate injection and atomicity findings while rendering fidelity", async () => {
    const raw = assessment({ antiInferenceCheck: {
      normativeClaimInjected: true, injectedClaimIds: ["AC_01"], reasoning: "injection finding",
    } });
    raw.claims[0].preservesEvaluativeMeaning = false;
    const evaluated = applySingleClaimAtomicityValidation(evaluateClaimContractValidation(raw, [claim()]), {
      singleClaimAssessment: { isAtomic: false, rePromptRequired: true, summary: "atomicity finding" },
      coordinatedBranchFinding: { presentInInput: true, bundledInSingleClaim: true,
        branchLabels: ["Volk", "Parlament"], reasoning: "independent branches" },
    });
    const rendered = await renderClaimContractRetryDiagnostics(evaluated);
    expect(rendered.anchorRetryReason).toContain("normative_injection");
    expect(rendered.anchorRetryReason).toContain("carrier_fidelity_failed");
    expect(rendered.atomicityRetryReason).toBe(evaluated.atomicityRetryReason);
    expect(rendered.summary.anchorRetryReason).toBe(rendered.anchorRetryReason);
    const guidance = await render(rendered);
    expect(context(guidance.content).carrierFidelityGuidance).toBe(rendered.carrierFidelityGuidance);
    expect(context(guidance.content).carrierFidelityGuidance).not.toContain("normative_injection");
    expect(guidance.content).not.toContain("added normative/legal assertion not in input");
    expect(context(guidance.content).antiInferenceCheck).toEqual(raw.antiInferenceCheck);
    expect(rendered.summary).not.toHaveProperty("carrierFidelityGuidance");
    const atomicity = {
      singleClaimAssessment: { isAtomic: false, rePromptRequired: true, summary: "atomicity finding" },
      coordinatedBranchFinding: { presentInInput: true, bundledInSingleClaim: true,
        branchLabels: ["Volk", "Parlament"], reasoning: "independent branches" },
    };
    const afterAtomicity = applySingleClaimAtomicityValidation(rendered, atomicity);
    expect(afterAtomicity.carrierFidelityGuidance).toBe(rendered.carrierFidelityGuidance);
    expect(afterAtomicity.summary).not.toHaveProperty("carrierFidelityGuidance");
    const challenger = evaluateClaimContractValidation(retryAssessment(), [claim()]);
    const winner = selectPreferredSingleClaimContractChallenge(afterAtomicity, challenger);
    expect(context((await render(winner)).content).carrierFidelityGuidance).toBeNull();
  });

  it.each([false, true])("rejects an unavailable fidelity diagnostic (empty=%s) before retry", async empty => {
    removeSection("CLAIM_CONTRACT_CARRIER_FIDELITY_REASON", empty);
    const raw = assessment();
    raw.claims[0].preservesEvaluativeMeaning = false;
    for (const output of [
      { impliedClaim: german, backgroundDetails: german, roughClaims: [], detectedLanguage: "de" },
      { impliedClaim: german, articleThesis: german, backgroundDetails: german, atomicClaims: [claim()] }, raw,
    ]) offline.generate.mockResolvedValueOnce({ output, usage: {}, finishReason: "stop" } as never);
    const state = { originalInput: german, warnings: [], sources: [], searchQueries: [], llmCalls: 0 } as unknown as CBResearchState;
    await expect(extractClaims(state)).rejects.toThrow("CLAIM_CONTRACT_CARRIER_FIDELITY_REASON");
    expect(offline.generate).toHaveBeenCalledTimes(3);
  });
});
