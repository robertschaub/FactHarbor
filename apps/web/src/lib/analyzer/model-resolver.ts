/**
 * FactHarbor Model Resolver
 *
 * Eliminates hardcoded model version strings from the codebase by resolving
 * logical tiers (haiku, sonnet, opus) to provider-specific model IDs.
 *
 * Supports:
 *  - Version-lock (default): Uses specific, tested model versions.
 *  - Latest aliases (opt-in): Uses provider-managed -latest aliases.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import type { LLMProviderType } from "./types";

export type ModelTier = "haiku" | "sonnet" | "opus";

export interface ResolvedModel {
  provider: LLMProviderType;
  modelName: string;
  model: any; // AI SDK model instance
}

// ============================================================================
// VERSION MAPS
// ============================================================================

const ANTHROPIC_VERSIONS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250929",
  opus: "claude-opus-4-6",
  latest: {
    haiku: "claude-haiku-4-5-latest",
    sonnet: "claude-sonnet-4-5-latest",
    opus: "claude-opus-4-6",
  }
};

const OPENAI_VERSIONS = {
  haiku: "gpt-4.1-mini", // No direct haiku equivalent, use budget tier
  sonnet: "gpt-4.1",
  opus: "gpt-4.1", // No direct opus equivalent
  latest: {
    haiku: "gpt-4.1-mini",
    sonnet: "gpt-4.1",
    opus: "gpt-4.1",
  }
};

const GOOGLE_VERSIONS = {
  haiku: "gemini-2.5-flash",
  sonnet: "gemini-2.5-pro",
  opus: "gemini-2.5-pro", // No direct opus equivalent
  latest: {
    haiku: "gemini-2.5-flash",
    sonnet: "gemini-2.5-pro",
    opus: "gemini-2.5-pro",
  }
};

const MISTRAL_VERSIONS = {
  haiku: "mistral-small-latest",
  sonnet: "mistral-large-latest",
  opus: "mistral-large-latest",
  latest: {
    haiku: "mistral-small-latest",
    sonnet: "mistral-large-latest",
    opus: "mistral-large-latest",
  }
};

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Resolve a logical tier to a concrete model ID and instance.
 */
export function resolveModel(
  tier: ModelTier,
  provider: LLMProviderType = "anthropic",
  useLatest: boolean = false
): ResolvedModel {
  const p = normalizeLLMProvider(provider);
  let modelName: string;

  switch (p) {
    case "anthropic":
      modelName = useLatest ? ANTHROPIC_VERSIONS.latest[tier] : ANTHROPIC_VERSIONS[tier];
      return { provider: p, modelName, model: anthropic(modelName) };
    
    case "openai":
      modelName = useLatest ? OPENAI_VERSIONS.latest[tier] : OPENAI_VERSIONS[tier];
      return { provider: p, modelName, model: openai(modelName) };

    case "google":
      modelName = useLatest ? GOOGLE_VERSIONS.latest[tier] : GOOGLE_VERSIONS[tier];
      return { provider: p, modelName, model: google(modelName) };

    case "mistral":
      modelName = useLatest ? MISTRAL_VERSIONS.latest[tier] : MISTRAL_VERSIONS[tier];
      return { provider: p, modelName, model: mistral(modelName) };

    default:
      // Fallback to Anthropic sonnet
      modelName = ANTHROPIC_VERSIONS.sonnet;
      return { provider: "anthropic", modelName, model: anthropic(modelName) };
  }
}

export function normalizeLLMProvider(raw: string): LLMProviderType {
  const p = (raw || "").toLowerCase().trim();
  if (p === "anthropic" || p === "claude") return "anthropic";
  if (p === "google" || p === "gemini") return "google";
  if (p === "mistral") return "mistral";
  if (p === "openai") return "openai";
  return "anthropic";
}

export function isModelTier(value: string): value is ModelTier {
  return value === "haiku" || value === "sonnet" || value === "opus";
}
