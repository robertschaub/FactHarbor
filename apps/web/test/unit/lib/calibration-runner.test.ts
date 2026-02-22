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
});

