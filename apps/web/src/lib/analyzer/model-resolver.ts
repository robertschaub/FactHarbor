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
  haiku: "claude-3-5-haiku-20251001",
  sonnet: "claude-3-5-sonnet-20241022",
  opus: "claude-3-opus-20240229",
  latest: {
    haiku: "claude-3-5-haiku-latest",
    sonnet: "claude-3-5-sonnet-latest",
    opus: "claude-3-opus-latest",
  }
};

const OPENAI_VERSIONS = {
  haiku: "gpt-4o-mini", // No direct haiku equivalent, use mini
  sonnet: "gpt-4o",
  opus: "gpt-4o", // No direct opus equivalent
  latest: {
    haiku: "gpt-4o-mini",
    sonnet: "gpt-4o",
    opus: "gpt-4o",
  }
};

const GOOGLE_VERSIONS = {
  haiku: "gemini-1.5-flash",
  sonnet: "gemini-1.5-pro",
  opus: "gemini-1.5-pro", // No direct opus equivalent
  latest: {
    haiku: "gemini-1.5-flash-latest",
    sonnet: "gemini-1.5-pro-latest",
    opus: "gemini-1.5-pro-latest",
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
  const p = normalizeProvider(provider);
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

function normalizeProvider(raw: string): LLMProviderType {
  const p = (raw || "").toLowerCase().trim();
  if (p === "anthropic" || p === "claude") return "anthropic";
  if (p === "google" || p === "gemini") return "google";
  if (p === "mistral") return "mistral";
  if (p === "openai") return "openai";
  return "anthropic";
}
