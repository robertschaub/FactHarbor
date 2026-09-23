import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  DEFAULT_PIPELINE_CONFIG, MODEL_POLICY_STAGES, PipelineConfigSchema,
  getModelPolicyErrors, type PipelineConfig,
} from "@/lib/config-schemas";
import { getModelForTask, getStructuredOutputProviderOptions } from "@/lib/analyzer/llm";
import { measuredLLMCall } from "@/lib/analyzer/metrics-integration";
import { MetricsCollector, type LLMCallMetric } from "@/lib/analyzer/metrics";

function candidate(): PipelineConfig {
  return {
    ...DEFAULT_PIPELINE_CONFIG, modelVerdict: "claude-sonnet-5",
    modelPolicies: { "claude-sonnet-5": {
      thinking: { type: "adaptive", effort: "medium" },
      outputTokenCaps: Object.fromEntries(MODEL_POLICY_STAGES.map(stage => [stage, 16384])),
    } },
  };
}

const metric: LLMCallMetric = {
  taskType: "verdict", provider: "anthropic", modelName: "claude-sonnet-5",
  promptTokens: 0, completionTokens: 0, totalTokens: 0, durationMs: 1,
  success: false, schemaCompliant: false, retries: 0, timestamp: new Date(),
};

describe("candidate policy validation", () => {
  it("keeps legacy blobs without new settings valid", () => {
    const config = { ...DEFAULT_PIPELINE_CONFIG };
    delete config.modelPolicies;
    expect(PipelineConfigSchema.safeParse(config).success).toBe(true);
    expect(getModelPolicyErrors({ modelVerdict: "standard" })).toEqual([]);
  });

  it("rejects implicit thinking and missing stage budgets", () => {
    const config = candidate();
    config.modelPolicies = {};
    expect(PipelineConfigSchema.safeParse(config).success).toBe(false);
    const configured = candidate();
    delete configured.modelPolicies!["claude-sonnet-5"].outputTokenCaps.claimContractCompletion;
    expect(getModelPolicyErrors(configured).join()).toContain("claimContractCompletion");
  });

  it.each([NaN, Infinity, 0, -1, 128001, 1.5])("rejects invalid cap %s", cap => {
    const config = candidate();
    config.modelPolicies!["claude-sonnet-5"].outputTokenCaps.verdict = cap;
    expect(PipelineConfigSchema.safeParse(config).success).toBe(false);
  });

  it("accepts disabled without effort and rejects silently discarded effort", () => {
    const config = candidate();
    config.modelPolicies!["claude-sonnet-5"].thinking = { type: "disabled" };
    expect(PipelineConfigSchema.safeParse(config).success).toBe(true);
    (config.modelPolicies!["claude-sonnet-5"].thinking as any).effort = "medium";
    expect(PipelineConfigSchema.safeParse(config).success).toBe(false);
  });

  it("does not assume another model supports the same controls", () => {
    const config = candidate();
    config.modelPolicies!["claude-fable-5-1"] = config.modelPolicies!["claude-sonnet-5"];
    expect(getModelPolicyErrors(config).join()).toContain("no reviewed policy support");
    expect(getModelPolicyErrors(config, { modelName: "claude-sonnet-5-latest", stage: "verdict" }).join()).toContain("exact model ID");
  });

  it("requires the calibration budget when its Sonnet route is enabled", () => {
    const config = candidate();
    delete config.modelPolicies!["claude-sonnet-5"].outputTokenCaps.sourceReliabilityCalibration;
    expect(getModelPolicyErrors(config)).toEqual([]);
    config.sourceReliabilityCalibrationEnabled = true;
    config.sourceReliabilityCalibrationMode = "confidence_only";
    config.sourceReliabilityCalibrationStrength = "standard";
    expect(getModelPolicyErrors(config).join()).toContain("sourceReliabilityCalibration");
    delete config.sourceReliabilityCalibrationMode;
    expect(getModelPolicyErrors(config)).toEqual([]);
  });
});

describe("offline SDK requests (fetch stub only; no paid calls)", () => {
  let bodies: any[];
  let response: any;
  beforeEach(() => {
    bodies = [];
    response = {
      id: "msg_offline", type: "message", role: "assistant", model: "claude-sonnet-5",
      content: [{ type: "text", text: '{"items":[{"ok":true}]}' }], stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 30, output_tokens_details: { thinking_tokens: 10 } },
    };
    vi.stubEnv("ANTHROPIC_API_KEY", "offline-test-key");
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return new Response(JSON.stringify(response), { headers: { "content-type": "application/json" } });
    }));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it.each(MODEL_POLICY_STAGES)("transmits policy and finite cap for %s", async stage => {
    const model = getModelForTask("verdict", undefined, candidate(), stage);
    await generateText({ model: model.model, prompt: "Using hydrogen for cars is more efficient than using electricity", maxRetries: 0 });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ model: "claude-sonnet-5", max_tokens: 16384, thinking: { type: "adaptive" }, output_config: { effort: "medium" } });
    expect(model.getLastCall?.().maxOutputTokens).toBe(16384);
  });

  it.each([
    "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben",
    "O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas",
    "Using hydrogen for cars is more efficient than using electricity",
  ])("preserves the exact approved input and nested jsonTool request: %s", async prompt => {
    response.content = [{ type: "tool_use", id: "tool_offline", name: "json", input: { items: [{ ok: true }] } }];
    response.stop_reason = "tool_use";
    const model = getModelForTask("verdict", undefined, candidate(), "boundaryClustering");
    const result = await generateText({ model: model.model, prompt, maxRetries: 0,
      output: Output.object({ schema: z.object({ items: z.array(z.object({ ok: z.boolean() })) }) }),
      providerOptions: getStructuredOutputProviderOptions(model.provider),
    });
    expect(result.output).toEqual({ items: [{ ok: true }] });
    expect(bodies[0].messages[0].content[0].text).toBe(prompt);
    expect(bodies[0].tools[0].name).toBe("json");
    expect(bodies[0].thinking.type).toBe("adaptive");
    expect(bodies[0].max_tokens).toBe(16384);
  });

  it("blocks missing policy/stage even if the caller supplies its own budget", async () => {
    const missingPolicy = { ...candidate(), modelPolicies: {} };
    for (const model of [getModelForTask("verdict", undefined, missingPolicy, "verdict"), getModelForTask("verdict", undefined, candidate())]) {
      await expect(generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxOutputTokens: 16384, maxRetries: 0 })).rejects.toThrow("Invalid model policy");
    }
    expect(bodies).toHaveLength(0);
  });

  it("enforces disabled policy, overrides caller defaults, and leaves legacy calls unchanged", async () => {
    const config = candidate();
    config.modelPolicies!["claude-sonnet-5"].thinking = { type: "disabled" };
    const controlled = getModelForTask("verdict", undefined, config, "verdict");
    await generateText({ model: controlled.model, prompt: "Plastic recycling is pointless", maxRetries: 0,
      maxOutputTokens: 128000, providerOptions: { anthropic: { effort: "high", thinking: { type: "adaptive" } } } });
    expect(bodies[0].thinking).toEqual({ type: "disabled" });
    expect(bodies[0].output_config?.effort).toBeUndefined();
    expect(bodies[0].max_tokens).toBe(16384);
    const legacy = getModelForTask("verdict", undefined, DEFAULT_PIPELINE_CONFIG);
    expect(legacy.getLastCall).toBeUndefined();
    await generateText({ model: legacy.model, prompt: "Plastic recycling is pointless", temperature: 0, maxOutputTokens: 1234, maxRetries: 0 });
    expect(bodies[1]).toMatchObject({ model: "claude-sonnet-4-6", max_tokens: 1234, temperature: 0 });
    expect(bodies[1].thinking).toBeUndefined();
  });

  it("preserves tiering-off and cross-provider routing while enforcing premium overrides", async () => {
    const config = candidate();
    expect(getModelForTask("verdict", undefined, { ...config, llmTiering: false }).modelName).toBe("claude-sonnet-4-6");
    expect(getModelForTask("verdict", "openai", config, "verdict").modelName).toBe("gpt-4.1");
    const premium = getModelForTask("verdict", undefined, { ...config, modelVerdict: "claude-sonnet-5", modelOpus: "claude-sonnet-5" }, "verdict");
    await generateText({ model: premium.model, prompt: "Plastic recycling is pointless", maxRetries: 0 });
    expect(bodies[0].output_config.effort).toBe("medium");
  });

  it.each([["refusal", "refusal"], ["max_tokens", "truncation"]])("retains billed usage on %s before parsing", async (stop, kind) => {
    response.stop_reason = stop;
    response.content = [];
    const model = getModelForTask("verdict", undefined, candidate(), "verdict");
    let error: unknown;
    try { await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0 }); }
    catch (caught) { error = caught; }
    expect(error).toBeDefined();
    const measured = measuredLLMCall(metric, { model, error });
    expect(measured).toMatchObject({ success: false, schemaCompliant: false, failureKind: kind, rawFinishReason: stop,
      promptTokens: 100, completionTokens: 30, reasoningTokens: 10, maxOutputTokens: 16384, usageAvailable: true });
    const collector = new MetricsCollector("offline", "claimboundary");
    collector.recordLLMCall(measured);
    expect(collector.finalize().estimatedCostUSD).toBeCloseTo(0.0005, 9);
  });

  it("extracts cache TTL usage from the real SDK response without double counting", async () => {
    response.usage = { input_tokens: 100, output_tokens: 30,
      cache_read_input_tokens: 200, cache_creation_input_tokens: 300,
      cache_creation: { ephemeral_5m_input_tokens: 200, ephemeral_1h_input_tokens: 100 },
      output_tokens_details: { thinking_tokens: 10 } };
    const model = getModelForTask("verdict", undefined, candidate(), "verdict");
    const result = await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0 });
    const measured = measuredLLMCall({ ...metric, success: true, schemaCompliant: true }, { model, result });
    expect(measured).toMatchObject({ promptTokens: 600, completionTokens: 30, cacheReadInputTokens: 200,
      cacheCreationInputTokens: 300, cacheCreation1hInputTokens: 100, reasoningTokens: 10 });
    const collector = new MetricsCollector("offline-cache", "claimboundary");
    collector.recordLLMCall(measured);
    expect(collector.finalize().estimatedCostUSD).toBeCloseTo((100 * 2 + 200 * 0.2 + 200 * 2.5 + 100 * 4 + 30 * 10) / 1e6, 9);
  });

  it("retains SDK-boundary usage after schema failure and clears it before a later transport failure", async () => {
    const model = getModelForTask("verdict", undefined, candidate(), "verdict");
    let error: unknown;
    try { await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0,
      output: Output.object({ schema: z.object({ missing: z.number() }) }) }); }
    catch (caught) { error = caught; }
    expect(error).toBeDefined();
    expect(measuredLLMCall(metric, { model, error })).toMatchObject({ failureKind: "schema", completionTokens: 30, rawFinishReason: "end_turn" });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline transport failure"));
    try { await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0 }); }
    catch (caught) { error = caught; }
    expect(measuredLLMCall(metric, { model, error })).toMatchObject({ failureKind: "transport", usageAvailable: false, completionTokens: 0 });
  });
});
