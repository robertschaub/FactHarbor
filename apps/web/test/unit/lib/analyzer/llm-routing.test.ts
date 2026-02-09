import { describe, expect, it } from "vitest";

import { getModel, getModelForTask } from "@/lib/analyzer/llm";
import { DEFAULT_PIPELINE_CONFIG, type PipelineConfig } from "@/lib/config-schemas";

function buildConfig(overrides: Partial<PipelineConfig>): PipelineConfig {
  return { ...DEFAULT_PIPELINE_CONFIG, ...overrides };
}

describe("tiered model routing", () => {
  it("defaults to legacy getModel() when tiering is off", () => {
    const config = buildConfig({ llmProvider: "openai", llmTiering: false });
    const legacy = getModel(undefined, config);
    expect(getModelForTask("understand", undefined, config).modelName).toBe(legacy.modelName);
    expect(getModelForTask("extract_evidence", undefined, config).modelName).toBe(legacy.modelName);
    expect(getModelForTask("verdict", undefined, config).modelName).toBe(legacy.modelName);
  });

  it("uses provider defaults per task when tiering is on", () => {
    const config = buildConfig({ llmProvider: "openai", llmTiering: true });
    expect(getModelForTask("understand", undefined, config).modelName).toBe("gpt-4.1-mini");
    expect(getModelForTask("extract_evidence", undefined, config).modelName).toBe("gpt-4.1-mini");
    expect(getModelForTask("verdict", undefined, config).modelName).toBe("gpt-4.1");
  });

  it("uses Anthropic defaults per task when tiering is on", () => {
    const config = buildConfig({ llmProvider: "anthropic", llmTiering: true });
    expect(getModelForTask("understand", undefined, config).modelName).toBe("claude-haiku-4-5-20251001");
    expect(getModelForTask("extract_evidence", undefined, config).modelName).toBe("claude-haiku-4-5-20251001");
    expect(getModelForTask("verdict", undefined, config).modelName).toBe("claude-opus-4-6");
  });

  it("allows per-task model overrides when tiering is on", () => {
    const config = buildConfig({
      llmProvider: "anthropic",
      llmTiering: true,
      modelUnderstand: "claude-3-5-haiku-20241022",
      modelExtractEvidence: "claude-3-5-haiku-20241022",
      modelVerdict: "claude-sonnet-4-20250514",
    });
    expect(getModelForTask("understand", undefined, config).modelName).toBe("claude-3-5-haiku-20241022");
    expect(getModelForTask("extract_evidence", undefined, config).modelName).toBe("claude-3-5-haiku-20241022");
    expect(getModelForTask("verdict", undefined, config).modelName).toBe("claude-sonnet-4-20250514");
  });
});
