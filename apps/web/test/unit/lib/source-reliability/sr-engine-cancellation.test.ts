import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), build: vi.fn(), enrich: vi.fn() }));
vi.mock("@/lib/source-reliability/sr-eval-types", async (original) => ({ ...await original<object>(), generateTextWithTimeout: mocks.generate }));
vi.mock("@/lib/source-reliability/sr-eval-evidence-pack", () => ({ buildEvidencePack: mocks.build }));
vi.mock("@/lib/source-reliability/sr-eval-enrichment", async (original) => ({ ...await original<object>(), enrichEvidencePackWithQualityAssessment: mocks.enrich }));
vi.mock("@/lib/analyzer/llm", () => ({ getPromptCachingOptions: () => undefined }));
vi.mock("@/lib/analyzer/debug", () => ({ debugLog: vi.fn() }));
// loadPromptFile uses this DB-backed seam. Keep real parsing/sections while
// supplying the unchanged file prompt explicitly, with no config DB bootstrap.
vi.mock("@/lib/config-loader", () => ({ loadPromptConfig: async () => {
  const content = await readFile(new URL("../../../../prompts/source-reliability.prompt.md", import.meta.url), "utf8");
  return { content, contentHash: createHash("sha256").update(content).digest("hex") };
} }));
import { evaluateSourceWithConsensus, evaluateSourceWithPinnedEvidencePack } from "@/lib/source-reliability/sr-eval-engine";
import { DEFAULT_SR_CONFIG } from "@/lib/config-schemas";
import type { EvidencePack, SrEvalConfig } from "@/lib/source-reliability/sr-eval-types";
const pack: EvidencePack = { enabled: true, providersUsed: [], queries: [], items: [{ id: "E1", url: "https://reference.test", title: "Reference", snippet: "fixture" }] };
const primary = { text: JSON.stringify({ score: 0.5, confidence: 0.6, reasoning: "E1", factualRating: "mixed", sourceType: "unknown" }) };
const config = (signal?: AbortSignal, budget: number | null = null) => ({ openaiModel: "gpt-4.1-mini", evidenceQualityAssessment: DEFAULT_SR_CONFIG.evidenceQualityAssessment, requestStartedAtMs: Date.now(), requestBudgetMs: budget, abortSignal: signal } as SrEvalConfig);
beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "offline-fixture"); vi.stubEnv("OPENAI_API_KEY", "offline-fixture");
  mocks.generate.mockReset().mockResolvedValue(primary);
  mocks.build.mockReset().mockResolvedValue(pack); mocks.enrich.mockReset().mockResolvedValue(pack);
});
afterEach(() => vi.unstubAllEnvs());
describe("SR refinement entity contract", () => {
  const initial = {
    score: 0.5, confidence: 0.6, reasoning: "Primary assessment of Verlag A, grounded in E1.",
    factualRating: "mixed", sourceType: "editorial_publisher", identifiedEntity: "Verlag A",
    evidenceCited: [{ claim: "Assessment", basis: "E1", evidenceId: "E1" }],
    caveats: ["Fixture caveat."],
  };
  const refinement = (entity: string | null, score: number) => ({
    crossCheckFindings: "Cross-check grounded in E1.",
    entityRefinement: { identifiedEntity: entity, organizationType: "publisher", isWellKnown: false, notes: "Fixture." },
    scoreAdjustment: { originalScore: 0.5, refinedScore: score, adjustmentReason: "Evidence reassessed." },
    refinedRating: score === 0.5 ? "mixed" : "leaning_reliable", refinedConfidence: 0.6,
    // Field-only correction must not rewrite the model's reasoning, even if it mentions the old name.
    combinedReasoning: "Refined assessment mentions Verlag A and E1.",
  });

  describe.each([0.5, 0.65])("with refined score %s", (score) => {
    it.each([
      { label: "retained", before: "Verlag A", after: "Verlag A" },
      { label: "changed", before: "Verlag A", after: "Éditeur B" },
      { label: "cleared", before: "Verlag A", after: null },
      { label: "already unknown", before: null, after: null },
    ])("returns the $label entity with unchanged non-entity fields", async ({ before, after }) => {
      const refined = refinement(after, score);
      mocks.generate
        .mockResolvedValueOnce({ text: JSON.stringify({ ...initial, identifiedEntity: before }) })
        .mockResolvedValueOnce({ text: JSON.stringify(refined) });
      const result = await evaluateSourceWithPinnedEvidencePack("outlet.test", pack, true, 0.8, config());
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected successful refinement");
      // Real parsing, post-processing, confidence boost and final payload assembly all run.
      expect(result.data).toMatchObject({
        score, confidence: score === 0.5 ? 0.6 : 0.7, category: refined.refinedRating,
        reasoning: refined.combinedReasoning, sourceType: initial.sourceType,
        evidenceCited: initial.evidenceCited, consensusAchieved: true,
        originalScore: initial.score, refinementApplied: score !== initial.score,
        caveats: score === 0.5 ? initial.caveats : [
          ...initial.caveats,
          "Score refined from 50% to 65%: Evidence reassessed.",
          "✓ Score refined by cross-check: 50% → 65%",
        ],
      });
      expect(result.data.identifiedEntity).toBe(after);
      expect(mocks.generate).toHaveBeenCalledTimes(2);
      expect(mocks.build).not.toHaveBeenCalled();
    });
  });

  it.each(["missing entity", "provider failure"])("preserves the primary fallback for %s", async (failure) => {
    mocks.generate.mockResolvedValueOnce({ text: JSON.stringify(initial) });
    if (failure === "provider failure") mocks.generate.mockRejectedValueOnce(new Error("Offline fixture failure"));
    else {
      const { identifiedEntity: _omitted, ...entityWithoutRequiredField } = refinement(null, 0.5).entityRefinement;
      mocks.generate.mockResolvedValueOnce({ text: JSON.stringify({ ...refinement(null, 0.5), entityRefinement: entityWithoutRequiredField }) });
    }
    const result = await evaluateSourceWithPinnedEvidencePack("outlet.test", pack, true, 0.8, config());
    expect(result).toMatchObject({ success: true, data: {
      identifiedEntity: initial.identifiedEntity, score: initial.score, confidence: initial.confidence * 0.9,
      category: initial.factualRating, reasoning: initial.reasoning, sourceType: initial.sourceType,
      evidenceCited: initial.evidenceCited, consensusAchieved: false,
      caveats: [...initial.caveats, "⚠️ Refinement pass failed; using initial evaluation only."],
    } });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });
});

describe("SR engine cancellation boundaries", () => {
  it("starts no work for a pre-aborted request", async () => {
    const signal = AbortSignal.abort();
    await expect(evaluateSourceWithConsensus("outlet.test", true, 0.8, config(signal))).rejects.toBe(signal.reason);
    expect(mocks.build).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it.each(["primary", "refinement"])("does not turn cancelled %s into a score/fallback", async (stage) => {
    const parent = new AbortController();
    const reason = new DOMException("offline cancellation", "AbortError");
    if (stage === "refinement") mocks.generate.mockResolvedValueOnce(primary);
    mocks.generate.mockImplementationOnce(async () => { parent.abort(reason); throw new Error("SDK wrapped cancellation"); });
    await expect(evaluateSourceWithPinnedEvidencePack("outlet.test", pack, true, 0.8, config(parent.signal))).rejects.toBe(reason);
    expect(mocks.generate).toHaveBeenCalledTimes(stage === "primary" ? 1 : 2);
  });
  it("rejects a cancelled primary's late success before refinement", async () => {
    const parent = new AbortController();
    const reason = new DOMException("offline cancellation", "AbortError");
    mocks.generate.mockImplementationOnce(async () => { parent.abort(reason); return primary; });
    await expect(evaluateSourceWithPinnedEvidencePack("outlet.test", pack, true, 0.8, config(parent.signal))).rejects.toBe(reason);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("preserves primary fallback after a local refinement timeout", async () => {
    mocks.generate.mockResolvedValueOnce(primary).mockRejectedValueOnce(new DOMException("local timeout", "TimeoutError"));
    const result = await evaluateSourceWithPinnedEvidencePack("outlet.test", pack, true, 0.8, config(new AbortController().signal));
    expect(result.success).toBe(true); expect(result.success && result.data.consensusAchieved).toBe(false);
  });
  it("preserves primary failure after a local timeout while the request remains live", async () => {
    mocks.generate.mockRejectedValueOnce(new DOMException("local timeout", "TimeoutError"));
    const result = await evaluateSourceWithPinnedEvidencePack("outlet.test", pack, true, 0.8, config(new AbortController().signal));
    expect(result).toMatchObject({ success: false, error: { reason: "primary_model_failed" } });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it.each(["cancelled", "live"])("the real eligible enrichment path handles a %s assessment", async (mode) => {
    const actual = await vi.importActual<typeof import("@/lib/source-reliability/sr-eval-enrichment")>("@/lib/source-reliability/sr-eval-enrichment");
    const parent = new AbortController(); const reason = new Error("assessment cancelled");
    mocks.generate.mockImplementationOnce(async (_label, _cap, params) => {
      expect(params.abortSignal).toBe(parent.signal);
      if (mode === "cancelled") { parent.abort(reason); throw reason; }
      return { text: JSON.stringify({ classifications: [{ id: "E1", relevant: true, probativeValue: "high", evidenceCategory: "fact_checker_rating" }] }) };
    });
    const pending = actual.enrichEvidencePackWithQualityAssessment("outlet.test", pack,
      DEFAULT_SR_CONFIG.evidenceQualityAssessment!, Date.now(), 300_000, parent.signal);
    if (mode === "cancelled") await expect(pending).rejects.toBe(reason);
    else expect(await pending).toMatchObject({ items: [{ id: "E1", probativeValue: "high", evidenceCategory: "fact_checker_rating" }], qualityAssessment: { status: "applied" } });
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith("SR evidence quality assessment",
      DEFAULT_SR_CONFIG.evidenceQualityAssessment!.timeoutMs, expect.objectContaining({ maxOutputTokens: 3000 }));
  });
  it("preserves the 90s EQA budget guard", async () => {
    await evaluateSourceWithConsensus("outlet.test", true, 0.8, config(undefined, 90_000));
    expect(mocks.enrich).not.toHaveBeenCalled();
  });
  it("checks cancellation after a swallowed enrichment failure", async () => {
    const parent = new AbortController();
    const reason = new DOMException("offline cancellation", "AbortError");
    mocks.enrich.mockImplementationOnce(async () => { parent.abort(reason); return pack; });
    await expect(evaluateSourceWithConsensus("outlet.test", true, 0.8, config(parent.signal))).rejects.toBe(reason);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
