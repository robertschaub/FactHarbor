/**
 * FactHarbor Analyzer - LLM Provider Selection
 *
 * Handles model selection and AI SDK output extraction.
 *
 * @module analyzer/llm
 */

import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";

// ============================================================================
// MODEL SELECTION
// ============================================================================

export interface ModelInfo {
  provider: string;
  modelName: string;
  model: ReturnType<typeof openai> | ReturnType<typeof anthropic> | ReturnType<typeof google> | ReturnType<typeof mistral>;
}

export type ModelTask = "understand" | "extract_facts" | "verdict" | "report";

function normalizeProvider(raw: string): "anthropic" | "google" | "mistral" | "openai" {
  const p = (raw || "").toLowerCase().trim();
  if (p === "anthropic" || p === "claude") return "anthropic";
  if (p === "google" || p === "gemini") return "google";
  if (p === "mistral") return "mistral";
  return "openai";
}

function isTieringEnabled(): boolean {
  const v = (process.env.FH_LLM_TIERING ?? "off").toLowerCase().trim();
  return v === "on" || v === "true" || v === "1" || v === "enabled";
}

function envModelOverrideForTask(task: ModelTask): string | null {
  const key =
    task === "understand"
      ? "FH_MODEL_UNDERSTAND"
      : task === "extract_facts"
        ? "FH_MODEL_EXTRACT_FACTS"
        : task === "verdict"
          ? "FH_MODEL_VERDICT"
          : "FH_MODEL_REPORT";
  const v = process.env[key];
  return v && v.trim() ? v.trim() : null;
}

function defaultModelNameForTask(provider: "anthropic" | "google" | "mistral" | "openai", task: ModelTask): string {
  // Defaults are task-tiered (cheap/fast for extraction-ish steps, higher-quality for synthesis).
  // They can be overridden per task via env vars.
  switch (provider) {
    case "anthropic":
      return task === "verdict" || task === "report" ? "claude-sonnet-4-20250514" : "claude-3-5-haiku-20241022";
    case "google":
      return task === "verdict" || task === "report" ? "gemini-1.5-pro" : "gemini-1.5-flash";
    case "mistral":
      return task === "verdict" || task === "report" ? "mistral-large-latest" : "mistral-small-latest";
    case "openai":
    default:
      return task === "verdict" || task === "report" ? "gpt-4o" : "gpt-4o-mini";
  }
}

function buildModelInfo(provider: "anthropic" | "google" | "mistral" | "openai", modelName: string): ModelInfo {
  if (provider === "anthropic") {
    return { provider, modelName, model: anthropic(modelName) };
  }
  if (provider === "google") {
    return { provider, modelName, model: google(modelName) };
  }
  if (provider === "mistral") {
    return { provider, modelName, model: mistral(modelName) };
  }
  return { provider: "openai", modelName, model: openai(modelName) };
}

/**
 * Get the LLM model based on configuration
 */
export function getModel(providerOverride?: string): ModelInfo {
  const provider = normalizeProvider(providerOverride ?? process.env.LLM_PROVIDER ?? "anthropic");
  // Preserve legacy single-model defaults.
  const modelName =
    provider === "anthropic"
      ? "claude-sonnet-4-20250514"
      : provider === "google"
        ? "gemini-1.5-pro"
        : provider === "mistral"
          ? "mistral-large-latest"
          : "gpt-4o";
  return buildModelInfo(provider, modelName);
}

/**
 * Get an LLM model for a specific pipeline task.
 *
 * By default, tiering is OFF and this returns the same model as `getModel()`.
 * Enable by setting `FH_LLM_TIERING=on` and optionally override per-task models:
 * - `FH_MODEL_UNDERSTAND`
 * - `FH_MODEL_EXTRACT_FACTS`
 * - `FH_MODEL_VERDICT`
 * - `FH_MODEL_REPORT` (reserved for future use)
 */
export function getModelForTask(task: ModelTask, providerOverride?: string): ModelInfo {
  if (!isTieringEnabled()) {
    return getModel(providerOverride);
  }

  const provider = normalizeProvider(providerOverride ?? process.env.LLM_PROVIDER ?? "anthropic");
  const overrideName = envModelOverrideForTask(task);
  const modelName = overrideName ?? defaultModelNameForTask(provider, task);
  return buildModelInfo(provider, modelName);
}

// ============================================================================
// OUTPUT EXTRACTION
// ============================================================================

/**
 * Safely extract structured output from AI SDK generateText result
 * Handles different SDK versions and result structures
 */
export function extractStructuredOutput(result: unknown): unknown {
  if (!result) {
    console.log("[Analyzer] extractStructuredOutput: result is null/undefined");
    return null;
  }

  const resultObj = result as Record<string, unknown>;
  console.log("[Analyzer] extractStructuredOutput: Checking result with keys:", Object.keys(resultObj));

  const safeGet = (getter: () => unknown) => {
    try {
      return getter();
    } catch {
      return undefined;
    }
  };

  // Try result.output
  const output = safeGet(() => resultObj.output);
  console.log("[Analyzer] extractStructuredOutput: result.output =", output !== undefined ? "exists" : "undefined");
  if (output !== undefined && output !== null) {
    const outputObj = output as Record<string, unknown>;
    const outputValue = safeGet(() => outputObj?.value);
    if (outputValue !== undefined) {
      console.log("[Analyzer] extractStructuredOutput: Found in output.value");
      return outputValue;
    }
    console.log("[Analyzer] extractStructuredOutput: Found in output directly");
    return output;
  }

  // AI SDK 6.x stores structured output in _output
  const _output = safeGet(() => resultObj._output);
  console.log("[Analyzer] extractStructuredOutput: result._output =", _output !== undefined ? "exists" : "undefined");
  if (_output !== undefined && _output !== null) {
    console.log("[Analyzer] extractStructuredOutput: Found structured output in result._output");
    return _output;
  }

  // Handle experimental_output safely
  const experimental = safeGet(() => resultObj.experimental_output) as Record<string, unknown> | undefined;
  if (experimental !== undefined && experimental !== null) {
    const experimentalValue = safeGet(() => experimental?.value);
    if (experimentalValue !== undefined) {
      return experimentalValue;
    }
    if (typeof experimental === "object" && !Array.isArray(experimental)) {
      return experimental;
    }
  }

  // Some SDK versions might put it directly in result.object
  const objectOutput = safeGet(() => resultObj.object);
  if (objectOutput !== undefined && objectOutput !== null) {
    return objectOutput;
  }

  // Last resort: return the result itself if it looks like structured data
  if (typeof result === "object" && !Array.isArray(result) && result !== null) {
    const keys = Object.keys(resultObj);
    if (keys.length > 0 && !keys.includes("text") && !keys.includes("usage")) {
      return result;
    }
  }

  return null;
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Clamp confidence value to valid range
 */
export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}
