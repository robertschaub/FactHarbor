import { describe, expect, it } from "vitest";

import { getModel, getModelForTask } from "@/lib/analyzer/llm";

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("tiered model routing", () => {
  it("defaults to legacy getModel() when tiering is off", () => {
    withEnv({ LLM_PROVIDER: "openai", FH_LLM_TIERING: "off" }, () => {
      const legacy = getModel();
      expect(getModelForTask("understand").modelName).toBe(legacy.modelName);
      expect(getModelForTask("extract_facts").modelName).toBe(legacy.modelName);
      expect(getModelForTask("verdict").modelName).toBe(legacy.modelName);
    });
  });

  it("uses provider defaults per task when tiering is on", () => {
    withEnv({ LLM_PROVIDER: "openai", FH_LLM_TIERING: "on" }, () => {
      expect(getModelForTask("understand").modelName).toBe("gpt-4o-mini");
      expect(getModelForTask("extract_facts").modelName).toBe("gpt-4o-mini");
      expect(getModelForTask("verdict").modelName).toBe("gpt-4o");
    });
  });

  it("uses Anthropic defaults per task when tiering is on", () => {
    withEnv({ LLM_PROVIDER: "anthropic", FH_LLM_TIERING: "on" }, () => {
      expect(getModelForTask("understand").modelName).toBe("claude-3-5-haiku-20241022");
      expect(getModelForTask("extract_facts").modelName).toBe("claude-3-5-haiku-20241022");
      expect(getModelForTask("verdict").modelName).toBe("claude-sonnet-4-20250514");
    });
  });

  it("allows per-task model overrides when tiering is on", () => {
    withEnv(
      {
        LLM_PROVIDER: "anthropic",
        FH_LLM_TIERING: "on",
        FH_MODEL_UNDERSTAND: "claude-3-5-haiku-20241022",
        FH_MODEL_EXTRACT_FACTS: "claude-3-5-haiku-20241022",
        FH_MODEL_VERDICT: "claude-sonnet-4-20250514",
      },
      () => {
        expect(getModelForTask("understand").modelName).toBe("claude-3-5-haiku-20241022");
        expect(getModelForTask("extract_facts").modelName).toBe("claude-3-5-haiku-20241022");
        expect(getModelForTask("verdict").modelName).toBe("claude-sonnet-4-20250514");
      },
    );
  });
});

