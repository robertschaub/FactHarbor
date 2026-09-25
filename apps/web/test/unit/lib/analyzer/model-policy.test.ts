import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText, Output } from "ai";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PIPELINE_CONFIG, MODEL_POLICY_STAGES, PipelineConfigSchema,
  getModelPolicyErrors, type PipelineConfig,
} from "@/lib/config-schemas";
import { getModelForTask, getStructuredOutputProviderOptions } from "@/lib/analyzer/llm";
import { measuredLLMCall } from "@/lib/analyzer/metrics-integration";
import { MetricsCollector, type LLMCallMetric } from "@/lib/analyzer/metrics";

function candidate(): PipelineConfig {
  return JSON.parse(readFileSync(
    fileURLToPath(new URL("../../../../../../scripts/diag/model-upgrade-pilot/arm-B-sonnet5-medium.json", import.meta.url)),
    "utf8",
  )) as PipelineConfig;
}

function serializedBaseline(): PipelineConfig {
  const { schemaVersion: _schemaVersion, ...config } = JSON.parse(readFileSync(
    fileURLToPath(new URL("../../../../configs/pipeline.default.json", import.meta.url)),
    "utf8",
  ));
  return config as PipelineConfig;
}

const metric: LLMCallMetric = {
  taskType: "verdict", provider: "anthropic", modelName: "claude-sonnet-5",
  promptTokens: 0, completionTokens: 0, totalTokens: 0, durationMs: 1,
  success: false, schemaCompliant: false, retries: 0, timestamp: new Date(),
};

describe("candidate policy validation", () => {
  it("keeps every baseline setting except the declared Sonnet 5 policy", () => {
    const config = candidate();
    const baseline = serializedBaseline();
    const policy = config.modelPolicies!["claude-sonnet-5"];
    expect({
      ...config,
      modelClaimContractValidation: config.modelClaimContractValidation ?? null,
      modelVerdict: baseline.modelVerdict,
      modelPolicies: baseline.modelPolicies,
    }).toEqual(baseline);
    expect(policy.thinking).toEqual({ type: "adaptive", effort: "medium" });
    expect(policy.outputTokenCaps.boundaryClustering).toBe(32768);
  });

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

function contractCandidate(): PipelineConfig {
  return { ...serializedBaseline(), modelClaimContractValidation: "claude-sonnet-5",
    modelPolicies: { "claude-sonnet-5": {
      thinking: { type: "adaptive", effort: "medium" },
      outputTokenCaps: { claimContractValidation: 8192 },
      structuredOutputModes: { claimContractValidation: "outputFormat" },
    } } };
}

describe("contract-only candidate routing", () => {
  it("requires only its cap and leaves every other stage and task on the inherited model", () => {
    const config = contractCandidate();
    expect(PipelineConfigSchema.safeParse(config).success).toBe(true);
    expect(getModelForTask("context_refinement", undefined, config, "claimContractValidation").modelName).toBe("claude-sonnet-5");
    for (const stage of MODEL_POLICY_STAGES.filter(s => s !== "claimContractValidation")) {
      expect(getModelForTask("context_refinement", undefined, config, stage).modelName).toBe("claude-sonnet-4-6");
    }
    expect(getModelForTask("context_refinement", undefined, config).modelName).toBe("claude-sonnet-4-6");
    for (const task of ["understand", "extract_evidence", "verdict", "report"] as const) {
      expect(getModelForTask(task, undefined, config, "claimContractValidation").modelName)
        .toBe(getModelForTask(task, undefined, serializedBaseline(), "claimContractValidation").modelName);
    }
    expect(getModelForTask("verdict", "openai", config, "verdict").provider).toBe("openai");
  });

  it("preserves Stage 4's derived OpenAI fallback without accepting it for contract validation", () => {
    const config = contractCandidate();
    expect(getModelPolicyErrors(config)).toEqual([]);
    const fallbackConfig: PipelineConfig = {
      ...config, llmTiering: true, llmProvider: "openai", modelVerdict: "gpt-4.1-mini",
    };
    expect(getModelForTask("verdict", "openai", fallbackConfig, "verdict"))
      .toMatchObject({ provider: "openai", modelName: "gpt-4.1-mini" });
    expect(() => getModelForTask("context_refinement", "openai", fallbackConfig, "claimContractValidation"))
      .toThrow("Invalid model policy");
  });

  it.each([
    { modelClaimContractValidation: "claude-sonnet-5-latest" },
    { modelClaimContractValidation: {} },
    { llmTiering: false },
    { llmProvider: "openai" },
    { llmProvider: null },
    { llmProvider: 42 },
    { modelPolicies: {} },
    { modelClaimContractValidation: null },
  ])("rejects incompatible config and direct resolver calls: %j", change => {
    const config = { ...contractCandidate(), ...change } as PipelineConfig;
    expect(getModelPolicyErrors(config).length).toBeGreaterThan(0);
    expect(PipelineConfigSchema.safeParse(config).success).toBe(false);
    expect(() => getModelForTask("context_refinement", undefined, config, "claimContractValidation")).toThrow("Invalid model policy");
  });

  it.each([
    { claimContractValidation: "auto" }, { claimContractValidation: "jsonTool" },
    { verdict: "outputFormat" }, null, "outputFormat",
  ])("rejects unsupported raw mode objects: %j", modes => {
    const config = contractCandidate();
    (config.modelPolicies!["claude-sonnet-5"] as any).structuredOutputModes = modes;
    expect(getModelPolicyErrors(config).length).toBeGreaterThan(0);
    expect(PipelineConfigSchema.safeParse(config).success).toBe(false);
  });

  it("keeps candidate defaults inert and rejects missing thinking/caps", () => {
    expect(DEFAULT_PIPELINE_CONFIG.modelClaimContractValidation).toBeNull();
    expect(DEFAULT_PIPELINE_CONFIG.modelPolicies).toEqual({});
    expect(serializedBaseline().modelClaimContractValidation).toBeNull();
    expect(serializedBaseline().modelPolicies).toEqual({});
    for (const field of ["thinking", "outputTokenCaps"]) {
      const config = contractCandidate();
      delete (config.modelPolicies!["claude-sonnet-5"] as any)[field];
      expect(getModelPolicyErrors(config).length).toBeGreaterThan(0);
    }
    const config = contractCandidate();
    config.modelPolicies!["claude-sonnet-5"].outputTokenCaps = {};
    expect(getModelPolicyErrors(config).join()).toContain("outputTokenCaps.claimContractValidation");
  });

  it("unions required caps and rejects direct non-Anthropic contract overrides", () => {
    const config = contractCandidate();
    config.modelOpus = "claude-sonnet-5";
    expect(getModelPolicyErrors(config).join()).toContain("outputTokenCaps.verdict");
    config.modelVerdict = "claude-sonnet-5";
    expect(getModelPolicyErrors(config).join()).toContain("outputTokenCaps.boundaryClustering");
    const complete = candidate();
    complete.modelClaimContractValidation = "claude-sonnet-5";
    complete.modelPolicies!["claude-sonnet-5"].structuredOutputModes = { claimContractValidation: "outputFormat" };
    expect(getModelPolicyErrors(complete)).toEqual([]);
    expect(() => getModelForTask("context_refinement", "google", contractCandidate(), "claimContractValidation")).toThrow("Anthropic provider");
    // The old non-candidate/tiering-off behavior stays available with no new opt-in.
    expect(getModelForTask("verdict", undefined, { ...serializedBaseline(), llmTiering: false }).modelName).toBe("claude-sonnet-4-6");
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

  it("sends native output at the candidate seam and retains configured request metadata", async () => {
    const model = getModelForTask("context_refinement", undefined, contractCandidate(), "claimContractValidation");
    const result = await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0,
      temperature: 0.1, output: Output.object({ schema: z.object({ items: z.array(z.object({ ok: z.boolean() })) }) }),
      providerOptions: getStructuredOutputProviderOptions(model.provider) });
    expect(result.output).toEqual({ items: [{ ok: true }] });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ model: "claude-sonnet-5", max_tokens: 8192,
      thinking: { type: "adaptive" }, output_config: { effort: "medium", format: { type: "json_schema" } } });
    expect(bodies[0].tools).toBeUndefined();
    expect(bodies[0].tool_choice).toBeUndefined();
    expect(bodies[0].temperature).toBeUndefined();
    expect(measuredLLMCall(metric, { model, result })).toMatchObject({
      modelPolicyStage: "claimContractValidation", configuredStructuredOutputMode: "outputFormat", maxOutputTokens: 8192 });
  });

  it("preserves legacy validator wire bytes and does not switch an unrelated stage", async () => {
    response.content = [{ type: "tool_use", id: "offline_tool", name: "json", input: { items: [{ ok: true }] } }];
    response.stop_reason = "tool_use";
    const baseline = serializedBaseline(), legacy = { ...baseline };
    delete legacy.modelClaimContractValidation;
    for (const [config, stage] of [[legacy, "claimContractValidation"], [baseline, "claimContractValidation"],
      [contractCandidate(), "claimAtomicity"]] as const) {
      const model = getModelForTask("context_refinement", undefined, config, stage);
      await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0, temperature: 0.1,
        output: Output.object({ schema: z.object({ items: z.array(z.object({ ok: z.boolean() })) }) }),
        providerOptions: getStructuredOutputProviderOptions(model.provider) });
    }
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
  });

  it("preserves Stage 4's derived premium route with only the caps required by the original config", async () => {
    const config = contractCandidate();
    config.modelOpus = "claude-sonnet-5";
    config.modelPolicies!["claude-sonnet-5"].outputTokenCaps.verdict = 16384;
    expect(getModelPolicyErrors(config)).toEqual([]);
    const effectiveConfig = { ...config, modelVerdict: config.modelOpus };
    response.content = [{ type: "tool_use", id: "offline_tool", name: "json", input: { items: [{ ok: true }] } }];
    response.stop_reason = "tool_use";
    const model = getModelForTask("verdict", undefined, effectiveConfig, "verdict");
    await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0,
      output: Output.object({ schema: z.object({ items: z.array(z.object({ ok: z.boolean() })) }) }),
      providerOptions: getStructuredOutputProviderOptions(model.provider) });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ model: "claude-sonnet-5", max_tokens: 16384,
      thinking: { type: "adaptive" }, output_config: { effort: "medium" } });
    expect(bodies[0].tools[0].name).toBe("json");
    expect(bodies[0].output_config.format).toBeUndefined();
    expect(model.getLastCall?.()).toMatchObject({ modelPolicyStage: "verdict", configuredStructuredOutputMode: "jsonTool" });
  });

  it.each([["refusal", "refusal"], ["max_tokens", "truncation"], ["end_turn", "schema"]])(
    "retains native failure usage and mode for %s", async (stop, kind) => {
      response.stop_reason = stop;
      response.content = [{ type: "text", text: '{"wrong":true}' }];
      const model = getModelForTask("context_refinement", undefined, contractCandidate(), "claimContractValidation");
      let error: unknown;
      try { await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0,
        output: Output.object({ schema: z.object({ items: z.array(z.object({ ok: z.boolean() })) }) }),
        providerOptions: getStructuredOutputProviderOptions(model.provider) }); }
      catch (caught) { error = caught; }
      expect(error).toBeDefined();
      const measured = measuredLLMCall(metric, { model, error });
      expect(measured).toMatchObject({ failureKind: kind, usageAvailable: true,
        promptTokens: 100, completionTokens: 30, modelPolicyStage: "claimContractValidation",
        configuredStructuredOutputMode: "outputFormat", maxOutputTokens: 8192 });
      if (kind === "schema") expect(measured.schemaFailureExcerpt).toBe('{"wrong":true}');
      expect(bodies).toHaveLength(1);
    });

  it("retains native request metadata when headers never arrive without inventing usage", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Headers Timeout"));
    const model = getModelForTask("context_refinement", undefined, contractCandidate(), "claimContractValidation");
    let error: unknown;
    try { await generateText({ model: model.model, prompt: "Plastic recycling is pointless", maxRetries: 0 }); }
    catch (caught) { error = caught; }
    expect(measuredLLMCall({ ...metric, durationMs: 300001 }, { model, error })).toMatchObject({
      failureKind: "transport", usageAvailable: false, durationMs: 300001,
      modelPolicyStage: "claimContractValidation", configuredStructuredOutputMode: "outputFormat" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(MODEL_POLICY_STAGES)("transmits policy and finite cap for %s", async stage => {
    const config = candidate();
    const expectedCap = config.modelPolicies!["claude-sonnet-5"].outputTokenCaps[stage];
    const model = getModelForTask("verdict", undefined, config, stage);
    await generateText({ model: model.model, prompt: "Using hydrogen for cars is more efficient than using electricity", maxRetries: 0 });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ model: "claude-sonnet-5", max_tokens: expectedCap, thinking: { type: "adaptive" }, output_config: { effort: "medium" } });
    expect(model.getLastCall?.().maxOutputTokens).toBe(expectedCap);
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
    expect(bodies[0].max_tokens).toBe(32768);
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
