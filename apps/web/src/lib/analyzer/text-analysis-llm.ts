/**
 * LLM Text Analysis Service
 *
 * Implementation of ITextAnalysisService using LLM calls with admin-editable prompts.
 * Uses the existing LLM infrastructure (AI SDK, schema retry, model selection).
 *
 * @module analyzer/text-analysis-llm
 * @version 1.0.0
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { createHash } from "crypto";

import {
  ITextAnalysisService,
  InputClassificationRequest,
  InputClassificationResult,
  EvidenceQualityRequest,
  EvidenceQualityResult,
  ContextSimilarityRequest,
  ContextSimilarityResult,
  VerdictValidationRequest,
  VerdictValidationResult,
  AnalysisPoint,
  TextAnalysisMeta,
  TextAnalysisResponse,
  DEFAULT_PARSE_CONFIG,
  ParseConfig,
} from "./text-analysis-types";

import { getModel, getModelForTask, type ModelTask } from "./llm";
import type { PipelineConfig } from "../config-schemas";
import { loadPromptConfig } from "../config-loader";
import { recordMetrics } from "./text-analysis-service";

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

const MetaSchema = z.object({
  version: z.string(),
  analysisPoint: z.enum(["input", "evidence", "context", "verdict"]),
  promptHash: z.string(),
  processingMs: z.number().optional(),
});

const InputClassificationResultSchema = z.object({
  isComparative: z.boolean(),
  isCompound: z.boolean(),
  claimType: z.enum(["evaluative", "factual", "predictive", "mixed"]),
  complexity: z.enum(["simple", "moderate", "complex"]),
  decomposedClaims: z.array(
    z.object({
      text: z.string(),
      role: z.enum(["primary", "supporting", "context"]),
      standalone: z.boolean(),
    })
  ),
  decompositionReasoning: z.string().optional(),
});

const InputClassificationResponseSchema = z.object({
  _meta: MetaSchema,
  result: InputClassificationResultSchema.nullable(),
  error: z.string().optional(),
});

const EvidenceQualityResultSchema = z.object({
  evidenceId: z.string(),
  qualityAssessment: z.enum(["high", "medium", "low", "filter"]),
  issues: z.array(z.string()),
  reasoning: z.string(),
});

const EvidenceQualityResponseSchema = z.object({
  _meta: MetaSchema,
  result: z.array(EvidenceQualityResultSchema).nullable(),
  error: z.string().optional(),
});

const ContextSimilarityResultSchema = z.object({
  contextA: z.string(),
  contextB: z.string(),
  similarity: z.number(),
  phaseBucketA: z.enum(["production", "usage", "other"]),
  phaseBucketB: z.enum(["production", "usage", "other"]),
  shouldMerge: z.boolean(),
  canonicalName: z.string().nullable(),
  reasoning: z.string(),
});

const ContextSimilarityResponseSchema = z.object({
  _meta: MetaSchema,
  result: z.array(ContextSimilarityResultSchema).nullable(),
  error: z.string().optional(),
});

const VerdictValidationResultSchema = z.object({
  claimId: z.string(),
  isInverted: z.boolean().optional(),
  suggestedCorrection: z.number().nullable().optional(),
  isCounterClaim: z.boolean().optional(),
  polarity: z.enum(["supports_thesis", "opposes_thesis", "neutral"]).optional(),
  harmPotential: z.enum(["high", "medium", "low"]),
  contestation: z.object({
    isContested: z.boolean(),
    factualBasis: z.enum(["established", "disputed", "opinion", "unknown"]),
  }),
  reasoning: z.string(),
});

const VerdictValidationResponseSchema = z.object({
  _meta: MetaSchema,
  result: z.array(VerdictValidationResultSchema).nullable(),
  error: z.string().optional(),
});

// ============================================================================
// PROMPT LOADING AND VARIABLE SUBSTITUTION
// ============================================================================

/**
 * Load prompt from config system and substitute variables.
 */
async function loadAndRenderPrompt(
  profileKey: string,
  variables: Record<string, string>,
  jobId?: string
): Promise<{ prompt: string; promptHash: string } | null> {
  const config = await loadPromptConfig(profileKey, jobId);
  if (!config) {
    console.warn(`[TextAnalysis] No prompt config found for ${profileKey}`);
    return null;
  }

  let prompt = config.content;

  // Substitute variables
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\$\\{${key}\\}`, "g");
    prompt = prompt.replace(pattern, value);
  }

  // Calculate prompt hash for telemetry
  const promptHash = createHash("sha256").update(prompt).digest("hex").substring(0, 8);

  return { prompt, promptHash };
}

// ============================================================================
// JSON PARSING WITH REPAIR
// ============================================================================

/**
 * Attempt to repair common JSON issues.
 */
function attemptJSONRepair(text: string): string {
  let repaired = text.trim();

  // Remove markdown code fences if present
  repaired = repaired.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  repaired = repaired.replace(/^```\s*/i, "").replace(/```\s*$/i, "");

  // Fix trailing commas
  repaired = repaired.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  // Fix unquoted keys (simple cases)
  repaired = repaired.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

  return repaired;
}

/**
 * Parse JSON response with retry and repair.
 */
function parseJSONResponse<T>(
  text: string,
  schema: z.ZodSchema<T>,
  config: ParseConfig = DEFAULT_PARSE_CONFIG
): T {
  let lastError: Error | null = null;

  // First attempt: direct parse
  try {
    const parsed = JSON.parse(text);
    return schema.parse(parsed);
  } catch (e) {
    lastError = e as Error;
  }

  // Second attempt: repair and parse
  if (config.repairAttempt) {
    try {
      const repaired = attemptJSONRepair(text);
      const parsed = JSON.parse(repaired);
      return schema.parse(parsed);
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw lastError || new Error("Failed to parse JSON response");
}

// ============================================================================
// LLM TEXT ANALYSIS SERVICE
// ============================================================================

/**
 * LLM implementation of ITextAnalysisService.
 * Uses admin-editable prompts and the AI SDK for LLM calls.
 */
export class LLMTextAnalysisService implements ITextAnalysisService {
  private config: ParseConfig;
  private pipelineConfig?: PipelineConfig;

  constructor(config: Partial<ParseConfig> = {}, pipelineConfig?: PipelineConfig) {
    this.config = { ...DEFAULT_PARSE_CONFIG, ...config };
    this.pipelineConfig = pipelineConfig;
  }

  /**
   * Map analysis point to model task for tiering.
   */
  private getModelTask(analysisPoint: AnalysisPoint): ModelTask {
    switch (analysisPoint) {
      case "input":
        return "understand";
      case "evidence":
        return "extract_evidence";
      case "context":
        return "context_refinement";
      case "verdict":
        return "verdict";
    }
  }

  /**
   * Make an LLM call with the given prompt.
   * Note: maxTokens is not directly supported by AI SDK generateText,
   * the model handles output length internally.
   */
  private async callLLM(
    analysisPoint: AnalysisPoint,
    prompt: string,
    _maxTokens: number = 2000 // Reserved for future use
  ): Promise<string> {
    const modelInfo = getModelForTask(
      this.getModelTask(analysisPoint),
      undefined,
      this.pipelineConfig,
    );

    const result = await generateText({
      model: modelInfo.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // Low temperature for consistent structured output
    });

    return result.text;
  }

  /**
   * Call 1: Classify input and decompose into claims
   */
  async classifyInput(request: InputClassificationRequest): Promise<InputClassificationResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    const promptData = await loadAndRenderPrompt("text-analysis-input", {
      INPUT_TEXT: request.inputText,
      PIPELINE: request.pipeline,
      PROMPT_HASH: "", // Will be filled after loading
    });

    if (!promptData) {
      throw new Error("Failed to load input classification prompt");
    }

    // Update PROMPT_HASH in the prompt
    const prompt = promptData.prompt.replace("${PROMPT_HASH}", promptData.promptHash);

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const responseText = await this.callLLM("input", prompt);
        const parsed = parseJSONResponse(responseText, InputClassificationResponseSchema, this.config);

        if (parsed.error || !parsed.result) {
          throw new Error(parsed.error || "No result in response");
        }

        // Record success metrics
        recordMetrics({
          analysisPoint: "input",
          success: true,
          latencyMs: Date.now() - startTime,
          retryCount,
          usedFallback: false,
        });

        return parsed.result;
      } catch (e) {
        lastError = e as Error;
        retryCount++;
        if (attempt < this.config.maxRetries) {
          await new Promise((r) => setTimeout(r, this.config.retryDelayMs * (attempt + 1)));
        }
      }
    }

    // Record failure metrics
    recordMetrics({
      analysisPoint: "input",
      success: false,
      latencyMs: Date.now() - startTime,
      retryCount,
      usedFallback: false,
      error: lastError?.message,
    });

    throw lastError || new Error("Failed to classify input after retries");
  }

  /**
   * Call 2: Assess evidence quality for filtering
   */
  async assessEvidenceQuality(request: EvidenceQualityRequest): Promise<EvidenceQualityResult[]> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    // Serialize evidence items for the prompt
    const evidenceItemsJson = JSON.stringify(request.evidenceItems, null, 2);

    const promptData = await loadAndRenderPrompt("text-analysis-evidence", {
      EVIDENCE_ITEMS: evidenceItemsJson,
      THESIS_TEXT: request.thesisText,
      PROMPT_HASH: "",
    });

    if (!promptData) {
      throw new Error("Failed to load evidence quality prompt");
    }

    const prompt = promptData.prompt.replace("${PROMPT_HASH}", promptData.promptHash);

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const responseText = await this.callLLM("evidence", prompt, 3000);
        const parsed = parseJSONResponse(responseText, EvidenceQualityResponseSchema, this.config);

        if (parsed.error || !parsed.result) {
          throw new Error(parsed.error || "No result in response");
        }

        recordMetrics({
          analysisPoint: "evidence",
          success: true,
          latencyMs: Date.now() - startTime,
          retryCount,
          usedFallback: false,
        });

        return parsed.result;
      } catch (e) {
        lastError = e as Error;
        retryCount++;
        if (attempt < this.config.maxRetries) {
          await new Promise((r) => setTimeout(r, this.config.retryDelayMs * (attempt + 1)));
        }
      }
    }

    recordMetrics({
      analysisPoint: "evidence",
      success: false,
      latencyMs: Date.now() - startTime,
      retryCount,
      usedFallback: false,
      error: lastError?.message,
    });

    throw lastError || new Error("Failed to assess evidence quality after retries");
  }

  /**
   * Call 3: Analyze context similarity for merging
   */
  async analyzeContextSimilarity(request: ContextSimilarityRequest): Promise<ContextSimilarityResult[]> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    const contextPairsJson = JSON.stringify(request.contextPairs, null, 2);
    const contextListJson = JSON.stringify(request.contextList, null, 2);

    const promptData = await loadAndRenderPrompt("text-analysis-context", {
      CONTEXT_PAIRS: contextPairsJson,
      CONTEXT_LIST: contextListJson,
      PROMPT_HASH: "",
    });

    if (!promptData) {
      throw new Error("Failed to load context similarity prompt");
    }

    const prompt = promptData.prompt.replace("${PROMPT_HASH}", promptData.promptHash);

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const responseText = await this.callLLM("context", prompt, 2000);
        const parsed = parseJSONResponse(responseText, ContextSimilarityResponseSchema, this.config);

        if (parsed.error || !parsed.result) {
          throw new Error(parsed.error || "No result in response");
        }

        recordMetrics({
          analysisPoint: "context",
          success: true,
          latencyMs: Date.now() - startTime,
          retryCount,
          usedFallback: false,
        });

        return parsed.result;
      } catch (e) {
        lastError = e as Error;
        retryCount++;
        if (attempt < this.config.maxRetries) {
          await new Promise((r) => setTimeout(r, this.config.retryDelayMs * (attempt + 1)));
        }
      }
    }

    recordMetrics({
      analysisPoint: "context",
      success: false,
      latencyMs: Date.now() - startTime,
      retryCount,
      usedFallback: false,
      error: lastError?.message,
    });

    throw lastError || new Error("Failed to analyze context similarity after retries");
  }

  /**
   * Call 4: Validate verdicts for inversion/harm/contestation
   */
  async validateVerdicts(request: VerdictValidationRequest): Promise<VerdictValidationResult[]> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    const claimVerdictsJson = JSON.stringify(request.claimVerdicts, null, 2);

    const promptData = await loadAndRenderPrompt("text-analysis-verdict", {
      THESIS_TEXT: request.thesis,
      CLAIM_VERDICTS: claimVerdictsJson,
      EVIDENCE_SUMMARY: request.evidenceSummary || "",
      MODE: request.mode,
      PROMPT_HASH: "",
    });

    if (!promptData) {
      throw new Error("Failed to load verdict validation prompt");
    }

    const prompt = promptData.prompt.replace("${PROMPT_HASH}", promptData.promptHash);

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const responseText = await this.callLLM("verdict", prompt, 4000);
        const parsed = parseJSONResponse(responseText, VerdictValidationResponseSchema, this.config);

        if (parsed.error || !parsed.result) {
          throw new Error(parsed.error || "No result in response");
        }

        recordMetrics({
          analysisPoint: "verdict",
          success: true,
          latencyMs: Date.now() - startTime,
          retryCount,
          usedFallback: false,
        });

        return parsed.result;
      } catch (e) {
        lastError = e as Error;
        retryCount++;
        if (attempt < this.config.maxRetries) {
          await new Promise((r) => setTimeout(r, this.config.retryDelayMs * (attempt + 1)));
        }
      }
    }

    recordMetrics({
      analysisPoint: "verdict",
      success: false,
      latencyMs: Date.now() - startTime,
      retryCount,
      usedFallback: false,
      error: lastError?.message,
    });

    throw lastError || new Error("Failed to validate verdicts after retries");
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Default LLM service instance */
export const llmTextAnalysisService = new LLMTextAnalysisService();
