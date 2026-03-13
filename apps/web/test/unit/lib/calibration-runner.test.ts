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
    ...overrides,
  } as PipelineConfig;
}

describe("resolveLLMConfig", () => {
  it("maps mistral role provider to mistral model IDs", () => {
    const config = createPipelineConfig({
      debateRoles: {
        challenger: { provider: "mistral", strength: "standard" },
      },
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.challenger.provider).toBe("mistral");
    expect(resolved.debateRoles.challenger.model).toBe("mistral-large-latest");
  });

  it("maps mistral budget strength to mistral-small-latest", () => {
    const config = createPipelineConfig({
      debateRoles: {
        validation: { provider: "mistral", strength: "budget" },
      },
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.validation.provider).toBe("mistral");
    expect(resolved.debateRoles.validation.model).toBe("mistral-small-latest");
  });

  it("falls back to anthropic UCM models for unknown providers", () => {
    const config = createPipelineConfig({
      debateRoles: {
        advocate: { provider: "unknown-provider" as never, strength: "budget" },
      },
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.advocate.model).toBe(
      "claude-haiku-4-5-20251001",
    );
  });

  it("resolves premium strength to modelOpus for Anthropic (B-5b)", () => {
    const config = createPipelineConfig({
      debateRoles: {
        reconciler: { provider: "anthropic", strength: "premium" },
      },
      modelOpus: "claude-opus-4-6",
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.reconciler.strength).toBe("premium");
    expect(resolved.debateRoles.reconciler.model).toBe("claude-opus-4-6");
    // Other roles remain at default standard
    expect(resolved.debateRoles.advocate.strength).toBe("standard");
    expect(resolved.debateRoles.advocate.model).toBe("claude-sonnet-4-5-20250929");
  });

  it("falls back to modelVerdict when modelOpus is not set (B-5b)", () => {
    const config = createPipelineConfig({
      debateRoles: {
        reconciler: { provider: "anthropic", strength: "premium" },
      },
      // No modelOpus set
    });

    const resolved = resolveLLMConfig(config);
    // Premium falls back to modelVerdict
    expect(resolved.debateRoles.reconciler.model).toBe("claude-sonnet-4-5-20250929");
  });

  it("resolves premium strength for non-Anthropic providers to premium model (B-5b)", () => {
    const config = createPipelineConfig({
      debateRoles: {
        reconciler: { provider: "openai", strength: "premium" },
      },
      modelOpus: "claude-opus-4-6",
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.reconciler.provider).toBe("openai");
    // OpenAI maps premium → gpt-4.1
    expect(resolved.debateRoles.reconciler.model).toBe("gpt-4.1");
  });

  it("honors non-Anthropic UCM model override when provider matches", () => {
    const config = createPipelineConfig({
      llmProvider: "openai",
      modelVerdict: "gpt-4.1-mini",
      debateRoles: {
        challenger: { provider: "openai", strength: "standard" },
      },
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.challenger.provider).toBe("openai");
    expect(resolved.debateRoles.challenger.model).toBe("gpt-4.1-mini");
  });

  it("ignores mismatched-provider model override and falls back to provider default", () => {
    const config = createPipelineConfig({
      llmProvider: "openai",
      modelVerdict: "claude-sonnet-4-5-20250929",
      debateRoles: {
        challenger: { provider: "openai", strength: "standard" },
      },
    });

    const resolved = resolveLLMConfig(config);
    expect(resolved.debateRoles.challenger.provider).toBe("openai");
    expect(resolved.debateRoles.challenger.model).toBe("gpt-4.1");
  });
});
