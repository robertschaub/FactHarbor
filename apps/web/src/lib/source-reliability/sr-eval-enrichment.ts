/**
 * Evidence quality assessment enrichment for Source Reliability Evaluation.
 *
 * Handles evidence pack enrichment with LLM-based quality assessment,
 * including prompt rendering, model resolution, and budget management.
 *
 * @module source-reliability/sr-eval-enrichment
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { getDeterministicTemperature } from "@/lib/analyzer/config";
import { debugLog } from "@/lib/analyzer/debug";
import { getSection, loadPromptFile, type Pipeline } from "@/lib/analyzer/prompt-loader";
import { ANTHROPIC_MODELS } from "@/lib/analyzer/model-tiering";
import {
  assessEvidenceQuality,
  filterByRelevance,
  type EvidenceQualityAssessmentConfig,
} from "@/lib/source-reliability/evidence-quality-assessment";
import { getAllFactCheckerDomains } from "@/lib/fact-checker-service";
import { withTimeout, type EvidencePack } from "./sr-eval-types";

// ============================================================================
// TIMEOUT CONSTANTS
// ============================================================================

export const SR_PRIMARY_EVALUATION_TIMEOUT_MS = 90_000;
export const SR_REFINEMENT_TIMEOUT_MS = 90_000;

// ============================================================================
// EVIDENCE QUALITY ASSESSMENT
// ============================================================================

const SR_PROMPT_PIPELINE: Pipeline = "source-reliability";
const SR_EQA_PROMPT_TASK_SECTION = "EVIDENCE QUALITY ASSESSMENT TASK";
const SR_EQA_PROMPT_OUTPUT_SECTION = "EVIDENCE QUALITY ASSESSMENT OUTPUT FORMAT";

/**
 * All fact-checker domains (global + regional) from config.
 * Used to auto-accept search results from known fact-checker sites.
 */
const FACT_CHECKER_DOMAINS = getAllFactCheckerDomains();

export function getRemainingBudgetMs(requestStartedAtMs: number, requestBudgetMs: number | null): number | null {
  if (requestBudgetMs === null) return null;
  const elapsedMs = Date.now() - requestStartedAtMs;
  return Math.max(0, requestBudgetMs - elapsedMs);
}

export function getMinimumCoreEvaluationBudgetMs(multiModel: boolean): number {
  return SR_PRIMARY_EVALUATION_TIMEOUT_MS + (multiModel ? SR_REFINEMENT_TIMEOUT_MS : 0);
}

export function normalizeEvidenceQualityAssessmentConfig(
  config: unknown,
  defaultConfig: EvidenceQualityAssessmentConfig,
): EvidenceQualityAssessmentConfig {
  const c = (config ?? {}) as Partial<EvidenceQualityAssessmentConfig>;
  const fallback = defaultConfig;
  return {
    enabled: typeof c.enabled === "boolean" ? c.enabled : fallback.enabled,
    model: typeof c.model === "string" && c.model.trim().length > 0 ? c.model : fallback.model,
    timeoutMs:
      typeof c.timeoutMs === "number" && Number.isFinite(c.timeoutMs)
        ? Math.max(1000, Math.min(30000, Math.floor(c.timeoutMs)))
        : fallback.timeoutMs,
    maxItemsPerAssessment:
      typeof c.maxItemsPerAssessment === "number" && Number.isFinite(c.maxItemsPerAssessment)
        ? Math.max(1, Math.min(40, Math.floor(c.maxItemsPerAssessment)))
        : fallback.maxItemsPerAssessment,
    minRemainingBudgetMs:
      typeof c.minRemainingBudgetMs === "number" && Number.isFinite(c.minRemainingBudgetMs)
        ? Math.max(0, Math.floor(c.minRemainingBudgetMs))
        : fallback.minRemainingBudgetMs,
  };
}

export function resolveEvidenceQualityAssessmentModel(modelAliasOrId: string): {
  provider: "anthropic" | "openai";
  modelName: string;
} {
  const normalized = modelAliasOrId.trim().toLowerCase();
  if (normalized === "haiku") {
    return { provider: "anthropic", modelName: ANTHROPIC_MODELS.budget.modelId };
  }
  if (normalized === "sonnet") {
    return { provider: "anthropic", modelName: ANTHROPIC_MODELS.premium.modelId };
  }
  if (normalized.startsWith("gpt-")) {
    return { provider: "openai", modelName: modelAliasOrId.trim() };
  }
  if (normalized.startsWith("claude-")) {
    return { provider: "anthropic", modelName: modelAliasOrId.trim() };
  }
  // Conservative default: cheapest SR model.
  return { provider: "anthropic", modelName: ANTHROPIC_MODELS.budget.modelId };
}

async function renderEvidenceQualityAssessmentPrompt(
): Promise<{ taskTemplate: string; outputTemplate: string } | null> {
  const promptResult = await loadPromptFile(SR_PROMPT_PIPELINE);
  if (!promptResult.success || !promptResult.prompt) {
    console.warn("[SR-Eval][warning] sr_evidence_quality_assessment_failed: prompt load failed");
    return null;
  }

  const taskSection = getSection(promptResult.prompt, SR_EQA_PROMPT_TASK_SECTION);
  const outputSection = getSection(promptResult.prompt, SR_EQA_PROMPT_OUTPUT_SECTION);
  // Reuse SR assessor taxonomy in the same prompt surface (no duplicated hardcoded list in code).
  const assessorSection = getSection(
    promptResult.prompt,
    "RECOGNIZED INDEPENDENT ASSESSORS (any of these count as \"fact-checker\")",
  );
  if (!taskSection || !outputSection || !assessorSection) {
    console.warn(
      "[SR-Eval][warning] sr_evidence_quality_assessment_failed: required SR prompt sections missing",
      {
        hasTaskSection: !!taskSection,
        hasOutputSection: !!outputSection,
        hasAssessorSection: !!assessorSection,
      },
    );
    return null;
  }

  const taskTemplate = [
    taskSection.content,
    `## RECOGNIZED INDEPENDENT ASSESSORS`,
    assessorSection.content,
  ].join("\n\n");

  return {
    taskTemplate,
    outputTemplate: outputSection.content,
  };
}

export async function enrichEvidencePackWithQualityAssessment(
  domain: string,
  evidencePack: EvidencePack,
  config: EvidenceQualityAssessmentConfig,
  requestStartedAtMs: number,
  requestBudgetMs: number | null,
): Promise<EvidencePack> {
  if (!evidencePack.enabled) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "skipped",
        skippedReason: "disabled",
      },
    };
  }

  if (!config.enabled) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "skipped",
        skippedReason: "disabled",
      },
    };
  }

  if (evidencePack.items.length === 0) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "skipped",
        skippedReason: "empty_evidence",
      },
    };
  }

  const remainingBudgetMs = getRemainingBudgetMs(requestStartedAtMs, requestBudgetMs);
  if (
    remainingBudgetMs !== null &&
    remainingBudgetMs < Math.max(0, config.minRemainingBudgetMs)
  ) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "skipped",
        model: resolveEvidenceQualityAssessmentModel(config.model).modelName,
        skippedReason: "budget_guard",
      },
    };
  }

  const promptTemplate = await renderEvidenceQualityAssessmentPrompt();
  if (!promptTemplate) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "failed",
        model: resolveEvidenceQualityAssessmentModel(config.model).modelName,
        errorType: "unknown",
      },
    };
  }

  const { provider, modelName } = resolveEvidenceQualityAssessmentModel(config.model);
  const assessment = await assessEvidenceQuality({
    domain,
    items: evidencePack.items,
    config,
    modelName,
    remainingBudgetMs,
    promptTemplate: promptTemplate.taskTemplate,
    outputFormatTemplate: promptTemplate.outputTemplate,
    classify: async (prompt, timeoutMs) => {
      const model = provider === "anthropic" ? anthropic(modelName) : openai(modelName);
      const response = await withTimeout(
        "SR evidence quality assessment",
        timeoutMs,
        () =>
          generateText({
            model,
            prompt,
            temperature: getDeterministicTemperature(0.1),
            maxOutputTokens: 3000,
          }),
      );
      return response.text ?? "";
    },
  });

  if (assessment.warningMessage) {
    console.warn("[SR-Eval][warning] sr_evidence_quality_assessment_failed", {
      domain,
      model: modelName,
      errorType: assessment.qualityAssessment.errorType ?? "unknown",
      timeoutMs: assessment.qualityAssessment.timeoutMs,
      latencyMs: assessment.qualityAssessment.latencyMs,
      assessedItemCount: assessment.qualityAssessment.assessedItemCount,
    });
  } else if (assessment.qualityAssessment.status === "applied") {
    debugLog("[SR-Eval] Evidence quality assessment applied", {
      domain,
      model: modelName,
      timeoutMs: assessment.qualityAssessment.timeoutMs,
      latencyMs: assessment.qualityAssessment.latencyMs,
      assessedItemCount: assessment.qualityAssessment.assessedItemCount,
    });
  }

  // Post-LLM relevance filtering: remove items the LLM marked as not about
  // reliability assessment. Fact-checker domain items auto-pass regardless.
  const { filtered: relevanceFiltered, removedCount: filteredCount } = filterByRelevance(
    assessment.items,
    assessment.qualityAssessment.status === "applied",
    FACT_CHECKER_DOMAINS,
  );

  if (filteredCount > 0) {
    debugLog(`[SR-Eval] Relevance filter: ${relevanceFiltered.length}/${assessment.items.length} items passed (${filteredCount} removed)`, { domain });
  }

  return {
    ...evidencePack,
    items: relevanceFiltered,
    qualityAssessment: assessment.qualityAssessment,
  };
}
