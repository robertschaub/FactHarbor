/**
 * Scope Normalization — Phase 2.5
 *
 * LLM-based semantic deduplication of EvidenceScopes before boundary clustering.
 * Detects semantically equivalent scopes that differ only in wording (abbreviations,
 * date format variants, synonymous methodology names) and merges them.
 *
 * This addresses the AGENTS.md LLM Intelligence mandate violation where
 * scopeFingerprint() used exact string matching on semantic content.
 *
 * @module analyzer/scope-normalization
 */

import { z } from "zod";
import { generateText, Output } from "ai";
import type { EvidenceItem, EvidenceScope } from "./types";
import {
  getModelForTask,
  extractStructuredOutput,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
} from "./llm";
import { loadAndRenderSection } from "./prompt-loader";
import { recordLLMCall } from "./metrics-integration";
import type { PipelineConfig } from "@/lib/config-schemas";

// ── Types ───────────────────────────────────────────────────────────

/** Matches UniqueScope from claimboundary-pipeline.ts */
export interface UniqueScope {
  index: number;
  scope: EvidenceScope;
  originalIndices: number[];
}

export interface ScopeNormalizationResult {
  /** Reduced set of truly unique scopes (canonical representatives only) */
  normalizedScopes: UniqueScope[];
  /**
   * Maps original UniqueScope index → canonical UniqueScope index in normalizedScopes[].
   * Record<number, number> (plain object — serializable for logging/metrics).
   */
  mergeMap: Record<number, number>;
  /** How many scopes were merged away (originalCount - normalizedScopes.length) */
  mergedCount: number;
  /** Whether an LLM call was attempted for metrics/accounting. */
  llmAttempted?: boolean;
}

// ── Zod Schema for LLM Output ──────────────────────────────────────

export const ScopeNormalizationOutputSchema = z.object({
  equivalenceGroups: z
    .array(
      z.object({
        scopeIndices: z.array(z.number().int().min(0)).min(1),
        canonicalIndex: z.number().int().min(0),
        rationale: z.string(),
      }),
    )
    .min(1),
});

export type ScopeNormalizationOutput = z.infer<typeof ScopeNormalizationOutputSchema>;

// ── Validation ──────────────────────────────────────────────────────

export function validateNormalizationOutput(
  parsed: ScopeNormalizationOutput,
  scopeCount: number,
): { valid: true } | { valid: false; reason: string } {
  const allIndices = new Set<number>();

  for (const group of parsed.equivalenceGroups) {
    if (!group.scopeIndices.includes(group.canonicalIndex)) {
      return {
        valid: false,
        reason: `canonicalIndex ${group.canonicalIndex} is not a member of scopeIndices [${group.scopeIndices.join(", ")}]`,
      };
    }

    for (const idx of group.scopeIndices) {
      if (idx >= scopeCount) {
        return {
          valid: false,
          reason: `scopeIndex ${idx} is out of bounds (max: ${scopeCount - 1})`,
        };
      }
      if (allIndices.has(idx)) {
        return {
          valid: false,
          reason: `scopeIndex ${idx} appears in multiple equivalence groups`,
        };
      }
      allIndices.add(idx);
    }
  }

  for (let i = 0; i < scopeCount; i++) {
    if (!allIndices.has(i)) {
      return {
        valid: false,
        reason: `scopeIndex ${i} is missing from equivalence groups`,
      };
    }
  }

  return { valid: true };
}

// ── Core Function ───────────────────────────────────────────────────

/**
 * Run LLM-based scope equivalence detection.
 *
 * Makes a single Haiku-tier LLM call to identify semantically equivalent scopes.
 * On any failure (LLM error, parse error, validation error), returns original scopes
 * unchanged (safe fallback).
 */
export async function normalizeScopeEquivalence(
  uniqueScopes: UniqueScope[],
  pipelineConfig: PipelineConfig,
  onEvent?: (message: string, progress: number) => void,
): Promise<ScopeNormalizationResult> {
  const scopeCount = uniqueScopes.length;

  // Build identity result (no merges) as fallback
  const identityResult: ScopeNormalizationResult = {
    normalizedScopes: uniqueScopes,
    mergeMap: Object.fromEntries(uniqueScopes.map((s) => [s.index, s.index])),
    mergedCount: 0,
    llmAttempted: false,
  };

  // Render the SCOPE_NORMALIZATION prompt
  let rendered: { content: string } | null;
  try {
    rendered = await loadAndRenderSection("claimboundary", "SCOPE_NORMALIZATION", {
      scopes: JSON.stringify(
        uniqueScopes.map((us) => ({
          index: us.index,
          methodology: us.scope.methodology ?? "",
          temporal: us.scope.temporal ?? "",
          geographic: us.scope.geographic ?? "",
          boundaries: us.scope.boundaries ?? "",
          additionalDimensions: us.scope.additionalDimensions ?? {},
        })),
        null,
        2,
      ),
    });
  } catch (err) {
    console.info("[ScopeNorm] Failed to load SCOPE_NORMALIZATION prompt, skipping normalization:", err);
    return identityResult;
  }

  if (!rendered) {
    console.info("[ScopeNorm] SCOPE_NORMALIZATION prompt section not found, skipping normalization");
    return identityResult;
  }

  // Make Haiku-tier LLM call
  const model = getModelForTask("understand", undefined, pipelineConfig);
  onEvent?.(`LLM call: scope normalization - ${model.modelName}`, -1);
  let llmOutput: ScopeNormalizationOutput;
  let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  const llmCallStartedAt = Date.now();
  try {
    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Analyze these ${scopeCount} EvidenceScopes for semantic equivalence.`,
        },
      ],
      temperature: pipelineConfig?.scopeNormalizationTemperature ?? 0,
      output: Output.object({ schema: ScopeNormalizationOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });
    usage = result.usage;

    const extracted = extractStructuredOutput(result);
    if (!extracted) {
      recordLLMCall({
        taskType: "cluster",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: usage?.inputTokens ?? 0,
        completionTokens: usage?.outputTokens ?? 0,
        totalTokens: usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: true,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Scope normalization returned no structured output",
        timestamp: new Date(),
      });
      console.info("[ScopeNorm] Failed to extract structured output from LLM, skipping normalization");
      return { ...identityResult, llmAttempted: true };
    }
    llmOutput = ScopeNormalizationOutputSchema.parse(extracted);
  } catch (err) {
    recordLLMCall({
      taskType: "cluster",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: usage?.inputTokens ?? 0,
      completionTokens: usage?.outputTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage: err instanceof Error ? err.message : String(err),
      timestamp: new Date(),
    });
    console.info("[ScopeNorm] LLM call failed, skipping normalization:", err);
    return { ...identityResult, llmAttempted: true };
  }

  // Validate LLM output
  const validation = validateNormalizationOutput(llmOutput, scopeCount);
  if (!validation.valid) {
    recordLLMCall({
      taskType: "cluster",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: usage?.inputTokens ?? 0,
      completionTokens: usage?.outputTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: false,
      retries: 0,
      errorMessage: validation.reason,
      timestamp: new Date(),
    });
    console.info(`[ScopeNorm] LLM output validation failed: ${validation.reason}. Skipping normalization.`);
    return { ...identityResult, llmAttempted: true };
  }

  recordLLMCall({
    taskType: "cluster",
    provider: model.provider,
    modelName: model.modelName,
    promptTokens: usage?.inputTokens ?? 0,
    completionTokens: usage?.outputTokens ?? 0,
    totalTokens: usage?.totalTokens ?? 0,
    durationMs: Date.now() - llmCallStartedAt,
    success: true,
    schemaCompliant: true,
    retries: 0,
    timestamp: new Date(),
  });

  // Check if any actual merges occurred
  const multiMemberGroups = llmOutput.equivalenceGroups.filter((g) => g.scopeIndices.length > 1);
  if (multiMemberGroups.length === 0) {
    console.info(`[ScopeNorm] No equivalent scopes found among ${scopeCount} scopes`);
    return { ...identityResult, llmAttempted: true };
  }

  // Build normalized scopes and merge map
  const normalizedScopes: UniqueScope[] = [];
  const mergeMap: Record<number, number> = {};

  for (const group of llmOutput.equivalenceGroups) {
    const canonicalOldIndex = group.canonicalIndex;
    const canonicalScope = uniqueScopes[canonicalOldIndex];
    const newIndex = normalizedScopes.length;

    // Merge originalIndices from all group members
    const mergedOriginalIndices: number[] = [];
    for (const oldIdx of group.scopeIndices) {
      mergedOriginalIndices.push(...uniqueScopes[oldIdx].originalIndices);
      mergeMap[oldIdx] = newIndex;
    }

    normalizedScopes.push({
      index: newIndex,
      scope: canonicalScope.scope,
      originalIndices: mergedOriginalIndices,
    });
  }

  const mergedCount = scopeCount - normalizedScopes.length;
  console.info(
    `[ScopeNorm] Normalized ${scopeCount} → ${normalizedScopes.length} scopes (${mergedCount} merged). ` +
    `Groups: ${multiMemberGroups.map((g) => `[${g.scopeIndices.join(",")}]→${g.canonicalIndex}`).join(", ")}`,
  );

  return { normalizedScopes, mergeMap, mergedCount, llmAttempted: true };
}

/**
 * Re-point evidence items to use canonical scope objects after normalization.
 *
 * For each evidence item whose scope was merged into a canonical representative,
 * replace the item's evidenceScope with the canonical scope object.
 * This ensures scopeFingerprint() matches the canonical entry downstream.
 */
export function repointEvidenceScopes(
  evidenceItems: EvidenceItem[],
  result: ScopeNormalizationResult,
): void {
  if (result.mergedCount === 0) return;

  for (const normalizedScope of result.normalizedScopes) {
    for (const itemIdx of normalizedScope.originalIndices) {
      if (itemIdx >= 0 && itemIdx < evidenceItems.length) {
        evidenceItems[itemIdx].evidenceScope = normalizedScope.scope;
      }
    }
  }
}
