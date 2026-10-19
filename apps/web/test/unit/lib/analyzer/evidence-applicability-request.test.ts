import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const offline = vi.hoisted(() => ({ bodies: [] as any[], fail: false }));
vi.mock("@ai-sdk/anthropic", async importOriginal => {
  const actual = await importOriginal<typeof import("@ai-sdk/anthropic")>();
  const provider = actual.createAnthropic({ apiKey: "offline-placeholder", fetch: async (_url, init) => {
    offline.bodies.push(JSON.parse(init!.body as string));
    if (offline.fail) throw new Error("Offline provider failure");
    return Response.json({ id: "msg_offline", type: "message", role: "assistant", content: [
      { type: "tool_use", id: "tool_offline", name: "json", input: { assessments: [
        { evidenceIndex: 0, applicability: "direct" },
        { evidenceIndex: 1, applicability: "contextual" },
        { evidenceIndex: 2, applicability: "foreign_reaction" },
      ] } },
    ], stop_reason: "tool_use", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20 } });
  } });
  return { ...actual, anthropic: provider };
});
vi.mock("@/lib/config-loader", () => ({ loadPromptConfig: vi.fn() }));
vi.mock("@/lib/analyzer/metrics-integration", () => ({ recordLLMCall: vi.fn() }));
import { loadPromptConfig } from "@/lib/config-loader";
import { clearPromptCache } from "@/lib/analyzer/prompt-loader";
import { assessEvidenceApplicability, ApplicabilityAssessmentOutputSchema } from "@/lib/analyzer/research-extraction-stage";
import { isDirectForClaim } from "@/lib/analyzer/evidence-applicability";
import { claimRequiresDirectApplicability, evaluateEvidenceSufficiency } from "@/lib/analyzer/research-orchestrator";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/config-schemas";
import { recordLLMCall } from "@/lib/analyzer/metrics-integration";
import { getModelForTask } from "@/lib/analyzer/llm";
import { generateText, Output } from "ai";

const prompt = readFileSync(resolve("prompts/claimboundary.prompt.md"), "utf8");
const { families } = JSON.parse(readFileSync(resolve("../../Docs/AGENTS/benchmark-expectations.json"), "utf8"));
const inputs = ["bolsonaro-pt", "bundesrat-rechtskraftig"].map(slug => {
  const family = families.find((entry: any) => entry.slug === slug);
  if (!family) throw new Error(`Missing approved input: ${slug}`);
  return { slug, input: family.inputValue };
});
const config = { ...DEFAULT_PIPELINE_CONFIG, llmProvider: "anthropic" as const, llmTiering: true, modelUnderstand: "budget" as const };
const nativeFetch = vi.fn(() => { throw Error("Native send forbidden"); });
function evidence(input: string) {
  return Array.from({ length: 4 }, (_, i) => ({ id: `EV_${i}`, statement: input,
    sourceUrl: `https://example.test/${i}`, sourceTitle: "Fixture", category: "evidence",
    relevantClaimIds: ["AC_01"], claimDirection: "supports", probativeValue: "high",
    sourceType: "legal_document", evidenceScope: { methodology: "fixture" } })) as any;
}
beforeEach(() => {
  vi.clearAllMocks(); offline.bodies = []; offline.fail = false; clearPromptCache();
  vi.stubGlobal("fetch", nativeFetch);
  vi.mocked(loadPromptConfig).mockResolvedValue({ content: prompt,
    contentHash: createHash("sha256").update(prompt).digest("hex"), fromCache: false, seededFromFile: false } as any);
});
afterEach(() => { vi.unstubAllGlobals(); clearPromptCache(); });

describe("normal applicability route through the real SDK, with offline transport", () => {
  for (const { slug, input } of inputs) {
    it.each([true, false])(`${slug}: invokes the enabled classifier and carries classifications to consumers; tiering=%s`, async llmTiering => {
      const result = await assessEvidenceApplicability([{ id: "AC_01", statement: input }] as any,
        evidence(input), "CH", { ...config, llmTiering });
      expect(offline.bodies).toHaveLength(1);
      const body = offline.bodies[0];
      expect(body.model).toBe(llmTiering ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6");
      expect(body.max_tokens).toBe(8192);
      expect(body.tool_choice.type).toBe("any");
      expect(body.tools[0].input_schema.properties.assessments.items.properties).toHaveProperty("evidenceIndex");
      expect(body.tools[0].input_schema.properties.assessments.items.properties).not.toHaveProperty("rowId");
      expect(JSON.stringify(body)).toContain(input);
      expect(JSON.stringify(body)).not.toMatch(/\$\{\w+\}|\[object Object\]/);
      expect(result.map(item => item.applicability)).toEqual(["direct", "contextual", "foreign_reaction", undefined]);
      expect(result.every(item => item.applicabilityAssessed)).toBe(true);
      expect(result.every(item => item.applicabilityByClaim === undefined)).toBe(true);
      expect(result.map(item => isDirectForClaim(item, "AC_01"))).toEqual([true, false, false, false]);
      const kept = result.filter(item => item.applicability !== "foreign_reaction");
      expect(kept.map(item => item.id)).toEqual(["EV_0", "EV_1", "EV_3"]);
      expect(claimRequiresDirectApplicability(true, kept.length, ["CH"], kept)).toBe(true);
      expect(evaluateEvidenceSufficiency(kept, { minItems: 1, minSourceTypes: 1, minDistinctDomains: 1,
        minDirectionalItems: 1, requireDirectApplicability: true })).toMatchObject({ sufficient: true, directionalCount: 1 });
      expect(recordLLMCall).toHaveBeenCalledWith(expect.objectContaining({ success: true, promptTokens: 10, completionTokens: 20 }));
      expect(nativeFetch).not.toHaveBeenCalled();
    });
  }
  it.each(["no_geography", "disabled", "provider_failure"])("preserves baseline %s behavior and does not invent an assessment", async reason => {
    const items = evidence(inputs[0].input);
    offline.fail = reason === "provider_failure";
    const warnings: any[] = [];
    const result = await assessEvidenceApplicability([{ id: "AC_01", statement: inputs[0].input }] as any,
      items, reason === "no_geography" ? null : "CH", { ...config, applicabilityFilterEnabled: reason !== "disabled" }, undefined, warnings);
    expect(result).toBe(items);
    expect(result.every(item => item.applicabilityAssessed === undefined && item.applicabilityByClaim === undefined)).toBe(true);
    expect(claimRequiresDirectApplicability(true, items.length, ["CH"], result)).toBe(false);
    expect(offline.bodies).toHaveLength(reason === "provider_failure" ? 1 : 0);
    expect(warnings).toHaveLength(reason === "provider_failure" ? 1 : 0);
    expect(nativeFetch).not.toHaveBeenCalled();
  });
  it("retains request-local attempt observations without affecting normal transport", async () => {
    const events: any[] = [];
    const model = getModelForTask("understand", undefined, config, undefined, {
      apiKey: "offline-placeholder", observeAttempt: event => { events.push(event); }, fetch: async () =>
        Response.json({ id: "msg_attempt", type: "message", role: "assistant", content: [
          { type: "tool_use", id: "tool_attempt", name: "json", input: { assessments: [] } },
        ], stop_reason: "tool_use", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20 } }),
    });
    await generateText({ model: model.model, prompt: inputs[0].input, output: Output.object({ schema: ApplicabilityAssessmentOutputSchema }) });
    expect(events.map(event => event.type)).toEqual(["start", "result"]);
    expect(events[1].modelId).toBeUndefined();
    expect(events[1].usage.inputTokens.total).toBe(10);
    expect(JSON.stringify(events)).not.toContain("assessments");
    expect(nativeFetch).not.toHaveBeenCalled();
  });
});
