/**
 * FactHarbor Analyzer - LLM Provider Selection
 *
 * Handles model selection, AI SDK output extraction, and schema retry logic.
 *
 * @module analyzer/llm
 * @version 2.8.0 - Added structured output retry support
 */

import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import {
  getStructuredOutputGuidance,
  getEnhancedRetryPrompt,
  getClaudePrefill,
  getOpenAIJsonModeHint,
  type ProviderType,
} from "./prompts/config-adaptations/structured-output";
import { DEFAULT_PIPELINE_CONFIG, type PipelineConfig } from "../config-schemas";

// ============================================================================
// MODEL SELECTION
// ============================================================================

export interface ModelInfo {
  provider: string;
  modelName: string;
  model: ReturnType<typeof openai> | ReturnType<typeof anthropic> | ReturnType<typeof google> | ReturnType<typeof mistral>;
}

export type ModelTask = "understand" | "extract_evidence" | "context_refinement" | "verdict" | "report";

function normalizeProvider(raw: string): "anthropic" | "google" | "mistral" | "openai" {
  const p = (raw || "").toLowerCase().trim();
  if (p === "anthropic" || p === "claude") return "anthropic";
  if (p === "google" || p === "gemini") return "google";
  if (p === "mistral") return "mistral";
  return "openai";
}

function detectProviderFromModelName(modelName: string): "anthropic" | "google" | "mistral" | "openai" | null {
  const name = (modelName || "").toLowerCase();
  if (name.includes("claude")) return "anthropic";
  if (name.includes("gemini")) return "google";
  if (name.includes("mistral")) return "mistral";
  if (name.includes("gpt")) return "openai";
  return null;
}

function isTieringEnabled(config?: PipelineConfig): boolean {
  return config ? config.llmTiering : false;
}

function resolveProvider(
  providerOverride?: string,
  config?: PipelineConfig,
): "anthropic" | "google" | "mistral" | "openai" {
  const fallback = config?.llmProvider ?? DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic";
  return normalizeProvider(providerOverride ?? fallback);
}

function modelOverrideForTask(task: ModelTask, config?: PipelineConfig): string | null {
  if (!config) return null;
  switch (task) {
    case "understand":
      return config.modelUnderstand;
    case "extract_evidence":
    case "context_refinement":
      return config.modelExtractEvidence;
    case "verdict":
      return config.modelVerdict;
    case "report":
      return null;
  }
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
export function getModel(providerOverride?: string, config?: PipelineConfig): ModelInfo {
  const provider = resolveProvider(providerOverride, config);
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
 * Tiering and per-task overrides are configured via the pipeline config.
 *
 * @param config - Optional pipeline config from unified config system
 */
export function getModelForTask(
  task: ModelTask,
  providerOverride?: string,
  config?: PipelineConfig,
): ModelInfo {
  if (!isTieringEnabled(config)) {
    return getModel(providerOverride, config);
  }

  const provider = resolveProvider(providerOverride, config);
  const overrideName = modelOverrideForTask(task, config);
  let modelName: string | null = null;

  if (overrideName) {
    const inferredProvider = detectProviderFromModelName(overrideName);
    if (inferredProvider && inferredProvider !== provider) {
      console.warn(
        `[LLM] Ignoring model override "${overrideName}" for task "${task}" because provider is "${provider}"`,
      );
    } else {
      modelName = overrideName;
    }
  }

  if (!modelName) {
    modelName = defaultModelNameForTask(provider, task);
  }
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
// STRUCTURED OUTPUT UTILITIES
// ============================================================================

/**
 * Enhance a prompt with provider-specific structured output guidance
 */
export function enhancePromptForStructuredOutput(
  prompt: string,
  provider: ProviderType
): string {
  const guidance = getStructuredOutputGuidance(provider);

  if (provider === 'openai') {
    return prompt + guidance + getOpenAIJsonModeHint();
  }

  return prompt + guidance;
}

/**
 * Get a prefill string for Claude to improve JSON output reliability
 * Pass this as the first part of the assistant message
 */
export function getAssistantPrefill(
  provider: ProviderType,
  taskType: string
): string | null {
  if (provider === 'anthropic') {
    return getClaudePrefill(taskType);
  }
  return null;
}

/**
 * Get a retry prompt when schema validation fails
 */
export function getSchemaValidationRetryPrompt(
  provider: ProviderType,
  schemaErrors: string[],
  originalOutput: string
): string {
  return getEnhancedRetryPrompt(provider, schemaErrors, originalOutput);
}

/**
 * Extract schema validation errors from a ZodError
 */
export function extractSchemaErrors(zodError: unknown): string[] {
  if (!zodError || typeof zodError !== 'object') {
    return ['Unknown schema validation error'];
  }

  const err = zodError as Record<string, unknown>;

  // Handle Zod error format
  if (err.errors && Array.isArray(err.errors)) {
    return err.errors.map((e: any) => {
      const path = e.path?.join('.') || 'root';
      const message = e.message || 'Invalid value';
      return `${path}: ${message}`;
    });
  }

  // Handle issues array (alternative Zod format)
  if (err.issues && Array.isArray(err.issues)) {
    return err.issues.map((issue: any) => {
      const path = issue.path?.join('.') || 'root';
      const message = issue.message || 'Invalid value';
      return `${path}: ${message}`;
    });
  }

  // Fallback to string conversion
  if (err.message && typeof err.message === 'string') {
    return [err.message];
  }

  return ['Unknown schema validation error'];
}

/**
 * Detect if an error is a schema validation error
 */
export function isSchemaValidationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as Record<string, unknown>;

  // Check for ZodError markers
  if (err.name === 'ZodError') return true;
  if (err.errors && Array.isArray(err.errors)) return true;
  if (err.issues && Array.isArray(err.issues)) return true;

  // Check error message
  if (typeof err.message === 'string') {
    const msg = err.message.toLowerCase();
    if (msg.includes('schema') || msg.includes('validation') ||
        msg.includes('expected') || msg.includes('required')) {
      return true;
    }
  }

  return false;
}

/**
 * Get the provider type from model info
 */
export function getProviderType(modelInfo: ModelInfo): ProviderType {
  const provider = modelInfo.provider.toLowerCase();
  if (provider.includes('anthropic') || provider.includes('claude')) return 'anthropic';
  if (provider.includes('openai') || provider.includes('gpt')) return 'openai';
  if (provider.includes('google') || provider.includes('gemini')) return 'google';
  if (provider.includes('mistral')) return 'mistral';
  return 'anthropic'; // Default fallback
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

// Re-export structured output types and utilities
export {
  type ProviderType,
  getStructuredOutputGuidance,
} from "./prompts/config-adaptations/structured-output";
