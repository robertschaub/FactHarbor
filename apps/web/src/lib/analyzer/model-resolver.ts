/**
 * FactHarbor Model Resolver
 *
 * Eliminates hardcoded model version strings from the codebase by resolving
 * logical strengths (budget, standard, premium) to provider-specific model IDs.
 *
 * Supports:
 *  - Version-lock (default): Uses specific, tested model versions.
 *  - Latest aliases (opt-in): Uses provider-managed -latest aliases.
 *
 * Legacy aliases (haiku, sonnet, opus) are accepted and mapped automatically:
 *   haiku -> budget, sonnet -> standard, opus -> premium
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import type { LLMProviderType } from "./types";

export type ModelStrength = "budget" | "standard" | "premium";

/** @deprecated Use ModelStrength instead. Kept as alias for migration compatibility. */
export type ModelTier = ModelStrength;

export interface ResolvedModel {
  provider: LLMProviderType;
  modelName: string;
  model: any; // AI SDK model instance
}

// ============================================================================
// VERSION MAPS
// ============================================================================

const ANTHROPIC_VERSIONS = {
  budget: "claude-haiku-4-5-latest",
  standard: "claude-sonnet-4-6",
  premium: "claude-opus-4-6",
  latest: {
    budget: "claude-haiku-4-5-latest",
    standard: "claude-sonnet-4-6",
    premium: "claude-opus-4-6",
  }
};

const OPENAI_VERSIONS = {
  budget: "gpt-4.1-mini",
  standard: "gpt-4.1",
  premium: "gpt-4.1", // No direct premium equivalent
  latest: {
    budget: "gpt-4.1-mini",
    standard: "gpt-4.1",
    premium: "gpt-4.1",
  }
};

const GOOGLE_VERSIONS = {
  budget: "gemini-2.5-flash",
  standard: "gemini-2.5-pro",
  premium: "gemini-2.5-pro", // No direct premium equivalent
  latest: {
    budget: "gemini-2.5-flash",
    standard: "gemini-2.5-pro",
    premium: "gemini-2.5-pro",
  }
};

const MISTRAL_VERSIONS = {
  budget: "mistral-small-latest",
  standard: "mistral-large-latest",
  premium: "mistral-large-latest",
  latest: {
    budget: "mistral-small-latest",
    standard: "mistral-large-latest",
    premium: "mistral-large-latest",
  }
};

// ============================================================================
// LEGACY ALIAS MAPPING
// ============================================================================

/** Map legacy tier names to canonical strength names. */
const LEGACY_TIER_TO_STRENGTH: Record<string, ModelStrength> = {
  haiku: "budget",
  sonnet: "standard",
  opus: "premium",
};

/**
 * Normalize a legacy tier name or canonical strength to ModelStrength.
 * Accepts both old (haiku/sonnet/opus) and new (budget/standard/premium) values.
 */
export function normalizeToStrength(value: string): ModelStrength {
  if (value === "budget" || value === "standard" || value === "premium") {
    return value;
  }
  return LEGACY_TIER_TO_STRENGTH[value] ?? "standard";
}

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Resolve a logical strength to a concrete model ID and instance.
 * Accepts both canonical strengths (budget/standard/premium) and
 * legacy tier names (haiku/sonnet/opus).
 */
export function resolveModel(
  strength: ModelStrength | string,
  provider: LLMProviderType = "anthropic",
  useLatest: boolean = false
): ResolvedModel {
  const p = normalizeLLMProvider(provider);
  const s = normalizeToStrength(strength as string);
  let modelName: string;

  switch (p) {
    case "anthropic":
      modelName = useLatest ? ANTHROPIC_VERSIONS.latest[s] : ANTHROPIC_VERSIONS[s];
      return { provider: p, modelName, model: anthropic(modelName) };

    case "openai":
      modelName = useLatest ? OPENAI_VERSIONS.latest[s] : OPENAI_VERSIONS[s];
      return { provider: p, modelName, model: openai(modelName) };

    case "google":
      modelName = useLatest ? GOOGLE_VERSIONS.latest[s] : GOOGLE_VERSIONS[s];
      return { provider: p, modelName, model: google(modelName) };

    case "mistral":
      modelName = useLatest ? MISTRAL_VERSIONS.latest[s] : MISTRAL_VERSIONS[s];
      return { provider: p, modelName, model: mistral(modelName) };

    default:
      // Fallback to Anthropic standard
      modelName = ANTHROPIC_VERSIONS.standard;
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

/**
 * Check if a value is a valid ModelStrength (canonical or legacy).
 */
export function isModelStrength(value: string): value is ModelStrength {
  return value === "budget" || value === "standard" || value === "premium";
}

/**
 * @deprecated Use isModelStrength instead. Accepts both legacy and canonical values.
 */
export function isModelTier(value: string): boolean {
  return value === "budget" || value === "standard" || value === "premium" ||
    value === "haiku" || value === "sonnet" || value === "opus";
}
