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

/**
 * Get the LLM model based on configuration
 */
export function getModel(providerOverride?: string): ModelInfo {
  const provider = (
    providerOverride ??
    process.env.LLM_PROVIDER ??
    "anthropic"
  ).toLowerCase();

  if (provider === "anthropic" || provider === "claude") {
    return {
      provider: "anthropic",
      modelName: "claude-sonnet-4-20250514",
      model: anthropic("claude-sonnet-4-20250514"),
    };
  }
  if (provider === "google" || provider === "gemini") {
    return {
      provider: "google",
      modelName: "gemini-1.5-pro",
      model: google("gemini-1.5-pro"),
    };
  }
  if (provider === "mistral") {
    return {
      provider: "mistral",
      modelName: "mistral-large-latest",
      model: mistral("mistral-large-latest"),
    };
  }
  return { provider: "openai", modelName: "gpt-4o", model: openai("gpt-4o") };
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
  return Math.max(0.1, Math.min(1, value));
}
