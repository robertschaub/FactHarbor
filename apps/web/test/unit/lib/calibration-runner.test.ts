import { describe, expect, it } from "vitest";
import { resolveLLMConfig } from "@/lib/calibration/runner";
import type { PipelineConfig } from "@/lib/config-schemas";

function createPipelineConfig(
  overrides: Partial<PipelineConfig> = {},
): PipelineConfig {
  return {
    llmProvider: "anthropic",
    llmTiering: true,
    modelUnderstand: "claude-haiku-4-5-20251001",
    modelExtractEvidence: "claude-haiku-4-5-20251001",
    modelVerdict: "claude-sonnet-4-5-20250929",
    debateProfile: "baseline",
    ...overrides,
  } as PipelineConfig;
}

describe("resolveLLMConfig", () => {
  it("maps mistral role provider to mistral model IDs", () => {
    const config = createPipelineConfig({
      debateModelProviders: { challenger: "mistral" },
      debateModelTiers: { challenger: "sonnet" },
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.challenger.provider).toBe("mistral");
    expect(resolved.debateRoles.challenger.model).toBe("mistral-large-latest");
  });

  it("maps mistral budget tier to mistral-small-latest", () => {
    const config = createPipelineConfig({
      debateModelProviders: { validation: "mistral" },
      debateModelTiers: { validation: "haiku" },
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.validation.provider).toBe("mistral");
    expect(resolved.debateRoles.validation.model).toBe("mistral-small-latest");
  });

  it("falls back to anthropic UCM models for unknown providers", () => {
    const config = createPipelineConfig({
      debateModelProviders: { advocate: "unknown-provider" as never },
      debateModelTiers: { advocate: "haiku" },
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.advocate.model).toBe(
      "claude-haiku-4-5-20251001",
    );
  });

  it("resolves opus tier to modelOpus for Anthropic (B-5b)", () => {
    const config = createPipelineConfig({
      debateModelTiers: { reconciler: "opus" },
      modelOpus: "claude-opus-4-6",
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.reconciler.tier).toBe("opus");
    expect(resolved.debateRoles.reconciler.model).toBe("claude-opus-4-6");
    // Other roles remain at default sonnet
    expect(resolved.debateRoles.advocate.tier).toBe("sonnet");
    expect(resolved.debateRoles.advocate.model).toBe("claude-sonnet-4-5-20250929");
  });

  it("falls back to modelVerdict when modelOpus is not set (B-5b)", () => {
    const config = createPipelineConfig({
      debateModelTiers: { reconciler: "opus" },
      // No modelOpus set
    });

    const resolved = resolveLLMConfig(config);
    // Opus falls back to modelVerdict
    expect(resolved.debateRoles.reconciler.model).toBe("claude-sonnet-4-5-20250929");
  });

  it("resolves opus tier for non-Anthropic providers to premium model (B-5b)", () => {
    const config = createPipelineConfig({
      debateModelProviders: { reconciler: "openai" },
      debateModelTiers: { reconciler: "opus" },
      modelOpus: "claude-opus-4-6",
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.reconciler.provider).toBe("openai");
    // OpenAI doesn't have Opus — maps to premium model
    expect(resolved.debateRoles.reconciler.model).toBe("gpt-4.1");
  });
});

