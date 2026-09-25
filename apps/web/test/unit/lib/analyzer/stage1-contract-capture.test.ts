import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtomicClaim } from "@/lib/analyzer/types";
import type { ClaimContractValidationResult } from "@/lib/analyzer/claim-extraction-stage";
import savedContractCases from "../../../fixtures/claim-contract-retry-consistency.json";

const mocks = vi.hoisted(() => ({ generate: vi.fn(), calc: vi.fn(), render: vi.fn() }));
vi.mock("ai", () => ({ generateText: mocks.generate, Output: { object: vi.fn(() => ({})) }, APICallError: { isInstance: () => false } }));
vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: () => ({ model: {}, modelName: "offline", provider: "anthropic" }),
  extractStructuredOutput: (result: any) => result.object,
  getStructuredOutputProviderOptions: () => ({}), getPromptCachingOptions: () => ({}),
}));
vi.mock("@/lib/analyzer/prompt-loader", () => ({ loadAndRenderSection: mocks.render }));
vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: async () => ({ config: { centralityThreshold: "medium", maxAtomicClaims: 5 } }),
  loadSearchConfig: async () => ({ config: {} }), loadCalcConfig: mocks.calc,
}));
vi.mock("@/lib/analyzer/metrics-integration", () => ({ recordLLMCall: vi.fn(), recordGate1Stats: vi.fn() }));
vi.mock("@/lib/web-search", () => ({ searchWebWithProvider: async () => ({ results: [], providersUsed: [] }) }));
vi.mock("@/lib/retrieval", () => ({ extractTextFromUrl: vi.fn() }));
vi.mock("@/lib/analyzer/research-extraction-stage", () => ({ classifyRelevance: vi.fn() }));

import { createContractDiagnosticCapture, extractClaims } from "@/lib/analyzer/claim-extraction-stage";

// Exact Captain-approved inputs; candidates below are mocked model outputs.
const PT = "O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas";
const DE = "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben";
const claims = ["O processo respeitou o direito processual brasileiro.", "As sentenças proferidas foram justas."].map((statement, index) => ({
  id: `AC_0${index + 1}`, statement, category: "evaluative", centrality: "high", harmPotential: "medium", isCentral: true,
  claimDirection: "supports_thesis", thesisRelevance: "direct", keyEntities: [], checkWorthiness: "high", specificityScore: 0.8,
  groundingQuality: "strong", expectedEvidenceProfile: { methodologies: [], expectedMetrics: [], expectedSourceTypes: [] },
} as AtomicClaim));

function critique(candidates = claims, violated = false): ClaimContractValidationResult {
  return {
    inputAssessment: { preservesOriginalClaimContract: !violated, rePromptRequired: violated, summary: "offline assessment" },
    claims: candidates.map(({ id }) => ({ claimId: id, preservesEvaluativeMeaning: true, usesNeutralDimensionQualifier: true, proxyDriftSeverity: "none", recommendedAction: "keep", reasoning: "not captured" })),
    antiInferenceCheck: { normativeClaimInjected: false, injectedClaimIds: [], reasoning: "not captured" },
  };
}
const pass2 = (candidates = claims) => ({ impliedClaim: PT, articleThesis: PT, backgroundDetails: "Offline fixture for contract validation.", inputClassification: "multi_assertion_input", atomicClaims: candidates });
const gate = (candidates = claims) => ({ validatedClaims: candidates.map(({ id }) => ({ claimId: id, passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" })) });
const atomicity = (bundled: boolean) => ({ singleClaimAssessment: { isAtomic: !bundled, rePromptRequired: bundled, summary: "not captured" }, coordinatedBranchFinding: { presentInInput: true, bundledInSingleClaim: bundled, branchLabels: [], reasoning: "not captured" } });
const completion = (candidates: AtomicClaim[]) => ({ completionEligible: true, failureKind: "omitted_thesis_direct_proposition", omittedPropositions: [], atomicClaims: candidates, rationale: "offline" });

async function scenario(options: Record<string, unknown> = {}, salience = false, input = PT, decomposition = {}) {
  mocks.calc.mockResolvedValue({ config: {
    claimDecomposition: { minCoreClaimsPerContext: 1, supplementalRepromptMaxAttempts: 0, ...decomposition },
    claimContractValidation: { enabled: true, maxRetries: 0, repairPassEnabled: false, surgicalRepairEnabled: false, completionEnabled: false, validatorAvailabilityMaxAttempts: 0, ...options },
    salienceCommitment: { enabled: salience, mode: "audit" }, mixedConfidenceThreshold: 40,
  } });
  const state: any = { originalInput: input, inputType: "claim", evidenceItems: [], sources: [], searchQueries: [], queryBudgetUsageByClaim: {}, mainIterationsUsed: 0, contradictionIterationsReserved: 1, contradictionIterationsUsed: 0, contradictionSourcesFound: 0, claimBoundaries: [], llmCalls: 0, warnings: [] };
  const queues: Record<string, unknown[]> = {
    CLAIM_EXTRACTION_PASS1: [{ impliedClaim: input, backgroundDetails: "", roughClaims: [], detectedLanguage: input === DE ? "de" : "pt", inferredGeography: null }],
    CLAIM_SALIENCE_COMMITMENT: [{ anchors: [{ text: input, inputSpan: input, type: "other" }] }],
  };
  const unexpected: string[] = [];
  mocks.generate.mockImplementation(async ({ messages }) => {
    const section = messages[0].content.split("\n")[0];
    const queue = queues[section];
    if (!queue?.length) { unexpected.push(section); throw new Error(`Unexpected offline call: ${section}`); }
    return { text: "", object: queue.shift() };
  });
  return {
    state, queues,
    async run() {
      const result = await extractClaims(state);
      expect(unexpected).toEqual([]);
      return result;
    },
    capture(type: string) {
      const warning = state.warnings.find((item: any) => item.type === type);
      expect(warning?.severity).toBe("info");
      return warning.details;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.render.mockImplementation(async (_pipeline, section) => ({ content: section, variables: {} }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in offline tests"); }));
});
afterEach(() => vi.unstubAllGlobals());

describe("Stage 1 bounded contract capture", () => {
  it.each([0, 1])("honors retry-only critique with recovery budget %s without changing preservation", async maxRetries => {
    const s = await scenario({ maxRetries });
    const assessment = critique();
    assessment.claims[0].recommendedAction = "retry";
    assessment.claims[0].proxyDriftSeverity = "mild";
    s.queues.CLAIM_EXTRACTION_PASS2 = Array.from({ length: 1 + maxRetries }, () => pass2());
    s.queues.CLAIM_CONTRACT_VALIDATION = Array.from({ length: 1 + maxRetries }, () => structuredClone(assessment));
    s.queues.CLAIM_VALIDATION = [gate()];
    const result = await s.run();
    expect(result.contractValidationSummary).toMatchObject({ preservesContract: true, rePromptRequired: true, failureMode: "contract_violated" });
    expect(result.contractValidationSummary?.anchorRetryReason).toBeUndefined();
    expect(mocks.generate).toHaveBeenCalledTimes(4 + 2 * maxRetries);
    expect(s.queues.CLAIM_EXTRACTION_PASS2).toEqual([]);
    expect(s.queues.CLAIM_CONTRACT_VALIDATION).toEqual([]);
    if (maxRetries) {
      const steps = s.capture("contract_validation_retry_triggered").adminCapture.steps;
      expect(steps.find((step: any) => step.step === "initial_contract").validator.claims[0].recommendedAction).toBe("retry");
    }
  });

  it.each([false, true])("retains retry after count-floor replacement (initial retry-only=%s)", async retryOnly => {
    const s = await scenario({}, false, PT, { minCoreClaimsPerContext: 3, supplementalRepromptMaxAttempts: 1 });
    const replacement = [...claims, { ...claims[0], id: "AC_03", statement: "O processo respeitou os requisitos constitucionais." }];
    const initial = critique(claims, !retryOnly);
    if (retryOnly) initial.claims[0].recommendedAction = "retry";
    const final = critique(replacement);
    final.claims[2].recommendedAction = "retry";
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2(), pass2(replacement)];
    s.queues.CLAIM_CONTRACT_VALIDATION = [initial, final];
    s.queues.CLAIM_VALIDATION = [gate(), gate(replacement)];
    const result = await s.run();
    expect(result.contractValidationSummary).toMatchObject({ preservesContract: true, rePromptRequired: true, failureMode: "contract_violated", stageAttribution: "count_floor_reprompt" });
    expect(result.contractValidationSummary?.adminCapture?.steps.find(step => step.step === "final_contract")?.validator?.claims[2].recommendedAction).toBe("retry");
    expect(mocks.generate).toHaveBeenCalledTimes(7);
    expect(s.queues.CLAIM_EXTRACTION_PASS2).toEqual([]);
  });

  it.each([false, true])("keeps C11b's existing literal-carrier routing (inflected anchor=%s)", async inflected => {
    const s = await scenario({ repairPassEnabled: true }, false, DE);
    const fixture = savedContractCases.fixtures.find(f => f.name === "de-stress")!;
    const candidates = fixture.claims.map(c => ({ ...claims[0], ...c })) as AtomicClaim[];
    const assessment = structuredClone(fixture.assessment);
    assessment.truthConditionAnchor!.anchorText = inflected ? "rechtskräftige" : "rechtskräftig";
    const extracted = { ...pass2(candidates), impliedClaim: DE, articleThesis: DE };
    s.queues.CLAIM_EXTRACTION_PASS2 = [extracted];
    // Without successful repair, the existing centrality cap keeps three
    // claims and therefore requires final validation of that smaller set.
    s.queues.CLAIM_CONTRACT_VALIDATION = inflected
      ? [assessment, critique(candidates)]
      : [assessment, critique(candidates.slice(0, 3))];
    s.queues.CLAIM_CONTRACT_REPAIR = inflected ? [extracted] : [];
    s.queues.CLAIM_VALIDATION = [gate(candidates)];
    await s.run();
    expect(mocks.generate).toHaveBeenCalledTimes(inflected ? 6 : 5);
    expect(s.state.warnings.filter((w: any) => w.type === "contract_repair_pass_fired")).toHaveLength(inflected ? 1 : 0);
  });

  it("attributes an adopted multi-event reprompt and captures its candidates", async () => {
    const s = await scenario({}, false, PT, { minCoreClaimsPerContext: 2, supplementalRepromptMaxAttempts: 1 });
    const original = [claims[0]];
    const collapsed = { ...pass2(original), distinctEvents: [
      { name: "event-1", date: "", description: "offline event" },
      { name: "event-2", date: "", description: "offline event" },
    ] };
    s.queues.CLAIM_EXTRACTION_PASS2 = [collapsed, collapsed, pass2(claims)];
    s.queues.CLAIM_CONTRACT_VALIDATION = [critique(original, true), critique(claims)];
    s.queues.CLAIM_VALIDATION = [gate(original), gate(original), gate(claims)];
    const result = await s.run();
    expect(result.contractValidationSummary?.stageAttribution).toBe("multi_event_reprompt");
    expect(result.contractValidationSummary?.adminCapture?.steps.map((step) => step.step))
      .toEqual(["count_floor_1_gate1", "multi_event_gate1", "final_contract"]);
    expect(result.atomicClaims).toHaveLength(2);
  });

  it("keeps initial attribution when a count-floor attempt is not adopted", async () => {
    const s = await scenario({}, false, PT, { minCoreClaimsPerContext: 3, supplementalRepromptMaxAttempts: 1 });
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2(claims), pass2([claims[0]])];
    s.queues.CLAIM_CONTRACT_VALIDATION = [critique(claims, true)];
    s.queues.CLAIM_VALIDATION = [gate(claims), gate([claims[0]])];
    const result = await s.run();
    expect(result.contractValidationSummary?.stageAttribution).toBe("initial");
    expect(result.contractValidationSummary?.adminCapture?.steps).toMatchObject([
      { step: "count_floor_1_gate1", candidateCount: 1, validator: null },
    ]);
    expect(result.atomicClaims).toHaveLength(2);
  });

  it.each([false, true])("captures count-floor replacement and final typed flags (initial validator unavailable: %s)", async (unavailable) => {
    const s = await scenario({}, false, DE, { minCoreClaimsPerContext: 2, supplementalRepromptMaxAttempts: 1 });
    const original = [{ ...claims[0], statement: DE }];
    const replacement = [
      { ...claims[0], statement: "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor das Parlament darüber entschieden hat." },
      { ...claims[1], statement: "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor das Volk darüber entschieden hat." },
      { ...claims[0], id: "AC_03", statement: "Die Unterschrift hatte rechtskräftige Wirkung." },
    ];
    const final = critique(replacement, true);
    Object.assign(final.claims[2], { preservesEvaluativeMeaning: false, proxyDriftSeverity: "material", recommendedAction: "retry" });
    final.antiInferenceCheck!.injectedClaimIds = ["AC_03"];
    const replacementGate = gate(replacement);
    replacementGate.validatedClaims[2].passedFidelity = false;
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2(original), pass2(replacement)];
    s.queues.CLAIM_CONTRACT_VALIDATION = [...(unavailable ? [undefined, undefined] : [critique(original, true)]), final];
    s.queues.CLAIM_VALIDATION = [gate(original), replacementGate];
    const result = await s.run();
    expect(result.atomicClaims.map(({ id }) => id)).toEqual(["AC_01", "AC_02", "AC_03"]);
    expect(result.gate1Reasoning?.find((claim) => claim.claimId === "AC_03")?.passedFidelity).toBe(false);
    expect(result.contractValidationSummary).toMatchObject({ stageAttribution: "count_floor_reprompt", failureMode: "contract_violated" });
    expect(result.contractValidationSummary?.adminCapture).toMatchObject({ truncated: false, omittedSteps: 0, steps: [
      { step: "count_floor_1_gate1", candidates: replacement.map(({ id, statement }) => ({ id, statement })), validator: null },
      { step: "final_contract", candidates: replacement.map(({ id, statement }) => ({ id, statement })), validator: {
        rePromptRequired: true, injectedClaimIds: ["AC_03"],
        claims: [{}, {}, { claimId: "AC_03", preservesEvaluativeMeaning: false, proxyDriftSeverity: "material", recommendedAction: "retry" }],
      } },
    ] });
  });

  it("captures initial and rejected retry candidates with typed flags", async () => {
    const s = await scenario({ maxRetries: 1 });
    const initial = critique(claims, true);
    initial.claims[0].preservesEvaluativeMeaning = false;
    const retried = claims.map((claim) => ({ ...claim, statement: `${claim.statement} (retry)` }));
    const retry = critique(retried, true);
    retry.claims[1].proxyDriftSeverity = "material";
    retry.claims[1].recommendedAction = "retry";
    retry.antiInferenceCheck!.injectedClaimIds = ["AC_02"];
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2(), pass2(retried)];
    s.queues.CLAIM_CONTRACT_VALIDATION = [initial, retry];
    s.queues.CLAIM_VALIDATION = [gate()];
    await s.run();
    const capture = s.capture("contract_validation_retry_triggered").adminCapture;
    expect(capture.steps).toMatchObject([
      { step: "initial_contract", candidates: claims.map(({ id, statement }) => ({ id, statement })), validator: { claims: [{ preservesEvaluativeMeaning: false }, {}] } },
      { step: "retry_contract", candidates: retried.map(({ id, statement }) => ({ id, statement })), validator: { claims: [{}, { proxyDriftSeverity: "material", recommendedAction: "retry" }], injectedClaimIds: ["AC_02"] } },
    ]);
    expect(JSON.stringify(capture)).not.toContain("not captured");
  });

  it("captures surgical candidates and both atomicity verdicts when the recheck vetoes adoption", async () => {
    const s = await scenario({ surgicalRepairEnabled: true }, true);
    const initial = critique(claims, true);
    initial.claims.forEach((claim) => { claim.recommendedAction = "retry"; });
    const repaired = [{ ...claims[0], id: "AC_03", statement: PT }];
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2()];
    s.queues.CLAIM_CONTRACT_VALIDATION = [initial, critique(repaired)];
    s.queues.CLAIM_CONTRACT_SURGICAL_REPAIR = [{ repairs: [{ replacesClaimIds: ["AC_01", "AC_02"], claims: repaired }] }];
    s.queues.CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION = [atomicity(false), atomicity(true)];
    s.queues.CLAIM_VALIDATION = [gate()];
    await s.run();
    const details = s.capture("contract_surgical_repair_diagnostic");
    expect(details.outcome).toBe("not_validated_cleanly");
    const steps = details.adminCapture.steps;
    expect(steps.map((step: any) => step.step)).toEqual(["current_contract", "surgical_contract", "surgical_atomicity_primary", "surgical_atomicity_recheck", "surgical_atomicity_selected"]);
    expect(steps[1].candidates).toEqual([{ id: "AC_03", statement: PT }]);
    expect(steps[2].atomicity).toMatchObject({ isAtomic: true, rePromptRequired: false });
    expect(steps[3].atomicity).toMatchObject({ isAtomic: false, rePromptRequired: true, presentInInput: true, bundledInSingleClaim: true });
    expect(steps[4].atomicity).toEqual(steps[3].atomicity);
    expect(steps[3].validator.claims[0]).toMatchObject({ preservesEvaluativeMeaning: true, proxyDriftSeverity: "none", recommendedAction: "keep" });
  });

  it("captures completion candidates and preserves all attempts when a later completion is adopted", async () => {
    const s = await scenario({ completionEnabled: true, completionMaxAttempts: 2 });
    const completed = [...claims, { ...claims[0], id: "AC_03", statement: "O processo respeitou os requisitos constitucionais." }];
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2()];
    s.queues.CLAIM_CONTRACT_VALIDATION = [critique(claims, true), critique(completed, true), critique(completed)];
    s.queues.CLAIM_CONTRACT_COMPLETION = [completion(completed), completion(completed)];
    s.queues.CLAIM_VALIDATION = [gate(completed)];
    await s.run();
    const details = s.capture("contract_completion_diagnostic");
    expect(details.outcome).toBe("adopted");
    expect(details.attempt).toBe(2);
    expect(details.adminCapture.steps.map((step: any) => step.step)).toEqual(["current_contract", "completion_1_contract", "completion_2_contract"]);
    expect(details.adminCapture.steps[1].candidates).toEqual(completed.map(({ id, statement }) => ({ id, statement })));
    expect(details.adminCapture.steps[2].validator).toMatchObject({ rePromptRequired: false, injectedClaimIds: [] });
    expect(s.state.warnings.filter((warning: any) => warning.type === "contract_completion_diagnostic")).toHaveLength(1);
  });

  it("bounds UTF-8 capture bytes, counts, IDs, statements and steps without mutating candidates", () => {
    const oversized = Array.from({ length: 40 }, (_, i) => ({ ...claims[0], id: `${i}${"X".repeat(100)}`, statement: "漢".repeat(2000) }));
    const assessment = critique(oversized);
    assessment.antiInferenceCheck!.injectedClaimIds = oversized.map((claim) => claim.id);
    const capture = createContractDiagnosticCapture();
    for (let i = 0; i < 50; i++) capture.forClaims("test", oversized)("contract", assessment);
    expect(Buffer.byteLength(JSON.stringify(capture.details))).toBeLessThanOrEqual(65_536);
    expect(capture.details.truncated).toBe(true);
    expect(capture.details.omittedSteps).toBeGreaterThan(0);
    expect(oversized[0].statement).toHaveLength(2000);
    const one = createContractDiagnosticCapture();
    one.forClaims("test", [oversized[0]])("contract", assessment);
    expect(one.details.steps[0]).toMatchObject({
      candidateCount: 1, truncated: true,
      validator: { assessmentCount: 40, injectedClaimIdCount: 40 },
    });
    const snapshot = one.details.steps[0] as any;
    expect(snapshot.candidates[0].id).toHaveLength(80);
    expect(snapshot.candidates[0].statement).toHaveLength(1000);
    expect(snapshot.validator.claims).toHaveLength(32);
    expect(snapshot.validator.injectedClaimIds).toHaveLength(32);
    const small = createContractDiagnosticCapture();
    for (let i = 0; i < 50; i++) small.forClaims("test", claims)("contract", critique());
    expect(small.details.steps.length).toBeLessThanOrEqual(32);
  });
});

describe("Stage 1 completion existing-claim gate", () => {
  it.each(["meaning", "material", "injected"])("skips completion for the typed %s flag on an existing claim", async (flag) => {
    const s = await scenario({ completionEnabled: true }, false, DE);
    const germanClaims = claims.map((claim) => ({ ...claim, statement: DE }));
    const assessment = critique(germanClaims, true);
    if (flag === "meaning") assessment.claims[0].preservesEvaluativeMeaning = false;
    if (flag === "material") assessment.claims[0].proxyDriftSeverity = "material";
    if (flag === "injected") assessment.antiInferenceCheck!.injectedClaimIds = ["AC_01"];
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2(germanClaims)];
    s.queues.CLAIM_CONTRACT_VALIDATION = [assessment];
    s.queues.CLAIM_VALIDATION = [gate(germanClaims)];
    await s.run();
    const details = s.capture("contract_completion_diagnostic");
    expect(details.outcome).toBe("skipped_existing_claim_defects");
    expect(details.adminCapture.steps[0].candidates[0]).toEqual({ id: "AC_01", statement: DE });
    expect(mocks.render.mock.calls.map((call) => call[1])).not.toContain("CLAIM_CONTRACT_COMPLETION");
  });

  it("keeps completion for retry-only and mild flags; ignores injected IDs outside the current set", async () => {
    const s = await scenario({ completionEnabled: true });
    const assessment = critique(claims); // Explicit retry alone now opens existing completion eligibility.
    assessment.claims[0].recommendedAction = "retry";
    assessment.claims[0].proxyDriftSeverity = "mild";
    assessment.antiInferenceCheck!.injectedClaimIds = ["not_a_current_claim"];
    const completed = [...claims, { ...claims[0], id: "AC_03" }];
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2()];
    s.queues.CLAIM_CONTRACT_VALIDATION = [assessment, critique(completed)];
    s.queues.CLAIM_CONTRACT_COMPLETION = [completion(completed)];
    s.queues.CLAIM_VALIDATION = [gate(completed)];
    const result = await s.run();
    expect(result.contractValidationSummary?.stageAttribution).toBe("completion");
    expect(s.capture("contract_completion_diagnostic").outcome).toBe("adopted");
  });

  it.each([false, true])("uses the critique for the current set when surgical adoption is %s", async (adopted) => {
    const s = await scenario({ surgicalRepairEnabled: true, completionEnabled: true });
    const original = critique(claims, true);
    original.claims[0].preservesEvaluativeMeaning = false;
    const repaired = [{ ...claims[0], statement: "O processo respeitou os requisitos constitucionais." }, claims[1]];
    const afterRepair = critique(repaired, true);
    // The existing adoption rule accepts rePromptRequired=false, even when the
    // input-level assessment still reports an omission. This exercises the
    // completion gate after adoption, rather than bypassing it as fully approved.
    afterRepair.inputAssessment.rePromptRequired = !adopted;
    const completed = [...repaired, { ...claims[0], id: "AC_03" }];
    s.queues.CLAIM_EXTRACTION_PASS2 = [pass2()];
    s.queues.CLAIM_CONTRACT_SURGICAL_REPAIR = [{ repairs: [{ replacesClaimIds: ["AC_01"], claims: [repaired[0]] }] }];
    s.queues.CLAIM_CONTRACT_VALIDATION = [original, afterRepair, ...(adopted ? [critique(completed)] : [])];
    s.queues.CLAIM_CONTRACT_COMPLETION = adopted ? [completion(completed)] : [];
    s.queues.CLAIM_VALIDATION = [gate(adopted ? completed : claims)];
    await s.run();
    expect(s.capture("contract_surgical_repair_diagnostic").outcome).toBe(adopted ? "adopted" : "not_validated_cleanly");
    const details = s.capture("contract_completion_diagnostic");
    expect(details.outcome).toBe(adopted ? "adopted" : "skipped_existing_claim_defects");
    expect(details.adminCapture.steps[0]).toMatchObject({
      candidates: (adopted ? repaired : claims).map(({ id, statement }) => ({ id, statement })),
      validator: { claims: [{ preservesEvaluativeMeaning: adopted }, {}] },
    });
  });
});
