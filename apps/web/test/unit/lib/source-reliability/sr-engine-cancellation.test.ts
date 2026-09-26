import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), build: vi.fn(), enrich: vi.fn() }));
vi.mock("@/lib/source-reliability/sr-eval-types", async (original) => ({ ...await original<object>(), generateTextWithTimeout: mocks.generate }));
vi.mock("@/lib/source-reliability/sr-eval-evidence-pack", () => ({ buildEvidencePack: mocks.build }));
vi.mock("@/lib/source-reliability/sr-eval-enrichment", async (original) => ({ ...await original<object>(), enrichEvidencePackWithQualityAssessment: mocks.enrich }));
vi.mock("@/lib/analyzer/llm", () => ({ getPromptCachingOptions: () => undefined }));
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
