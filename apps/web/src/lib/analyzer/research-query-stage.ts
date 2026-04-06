import { z } from "zod";
import { generateText, Output } from "ai";
import { 
  getModelForTask, 
  getPromptCachingOptions, 
  getStructuredOutputProviderOptions, 
  extractStructuredOutput 
} from "./llm";
import { loadAndRenderSection } from "./prompt-loader";
import { recordLLMCall } from "./metrics-integration";
import {
  formatPromptInferredGeography,
  formatPromptRelevantGeographies,
  normalizeRelevantGeographies,
} from "./jurisdiction-context";
import { 
  AtomicClaim, 
  CBClaimUnderstanding, 
  EvidenceItem 
} from "./types";
import { PipelineConfig } from "@/lib/config-schemas";

// ============================================================================
// SCHEMAS
// ============================================================================

export const GenerateQueriesOutputSchema = z.object({
  queries: z.array(z.object({
    query: z.string(),
    rationale: z.string(),
    variantType: z.enum(["supporting", "refuting"]).optional(),
  })),
});

// ============================================================================
// STAGE 2: QUERY GENERATION
// ============================================================================

/**
 * Generate search queries for a claim using LLM (Haiku tier).
 * Uses GENERATE_QUERIES UCM prompt.
 */
export async function generateResearchQueries(
  claim: AtomicClaim,
  iterationType: "main" | "contradiction" | "contrarian",
  existingEvidence: EvidenceItem[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
  distinctEvents: CBClaimUnderstanding["distinctEvents"] = [],
  remainingQueryBudget?: number,
  searchGeo?: { language?: string; geography?: string | null; geographies?: string[] | null },
): Promise<Array<{ query: string; rationale: string }>> {
  const maxQueriesPerCall = pipelineConfig.researchMaxQueriesPerIteration ?? 3;
  const maxQueries = Math.max(0, Math.min(maxQueriesPerCall, remainingQueryBudget ?? maxQueriesPerCall));
  if (maxQueries === 0) {
    return [];
  }

  const queryStrategyMode = pipelineConfig.queryStrategyMode ?? "legacy";
  const relevantGeographies = normalizeRelevantGeographies(
    searchGeo?.geographies,
    searchGeo?.geography,
  );

  // Build claim-local evidence summary so the query generator can target
  // under-represented dimensions and directions instead of re-covering
  // already-well-supported areas. Filter to this claim only — sibling-claim
  // evidence must not pollute the per-claim coverage signal.
  const claimLocalEvidence = existingEvidence.filter(
    (e) => e.relevantClaimIds?.includes(claim.id),
  );
  const claimSupports = claimLocalEvidence.filter((e) => e.claimDirection === "supports").length;
  const claimContradicts = claimLocalEvidence.filter((e) => e.claimDirection === "contradicts").length;
  const claimNeutral = claimLocalEvidence.length - claimSupports - claimContradicts;
  const existingEvidenceSummary = claimLocalEvidence.length > 0
    ? JSON.stringify({
        totalItems: claimLocalEvidence.length,
        directionBalance: { supports: claimSupports, contradicts: claimContradicts, neutral: claimNeutral },
        coveredDimensions: [...new Set(
          claimLocalEvidence
            .map((e) => e.evidenceScope?.methodology)
            .filter(Boolean),
        )].slice(0, 8),
      })
    : "none";

  const rendered = await loadAndRenderSection("claimboundary", "GENERATE_QUERIES", {
    currentDate,
    claim: claim.statement,
    expectedEvidenceProfile: JSON.stringify(claim.expectedEvidenceProfile ?? {}),
    distinctEvents: JSON.stringify(distinctEvents),
    iterationType,
    queryStrategyMode,
    existingEvidenceSummary,
    detectedLanguage: searchGeo?.language ?? "en",
    inferredGeography: formatPromptInferredGeography(relevantGeographies),
    relevantGeographies: formatPromptRelevantGeographies(relevantGeographies),
  });
  if (!rendered) {
    // Fallback: use claim statement directly
    return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }].slice(0, maxQueries);
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;

  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Generate search queries for this claim: "${claim.statement}"`,
        },
      ],
      temperature: pipelineConfig?.queryGenerationTemperature ?? 0.2,
      output: Output.object({ schema: GenerateQueriesOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      recordLLMCall({
        taskType: "research",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Stage 2 query generation returned no structured output",
        timestamp: new Date(),
      });
      return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }].slice(0, maxQueries);
    }

    const validated = GenerateQueriesOutputSchema.parse(parsed);
    let finalQueries: Array<{ query: string; rationale: string }>;
    if (queryStrategyMode !== "pro_con") {
      finalQueries = validated.queries
        .slice(0, maxQueries)
        .map(({ query, rationale }) => ({ query, rationale }));
    } else {
      const supportingQueries = validated.queries.filter((query) => query.variantType === "supporting");
      const refutingQueries = validated.queries.filter((query) => query.variantType === "refuting");
      const unlabeledQueries = validated.queries.filter(
        (query) => query.variantType !== "supporting" && query.variantType !== "refuting",
      );

      const merged: Array<{ query: string; rationale: string }> = [];
      const maxVariantLength = Math.max(supportingQueries.length, refutingQueries.length);
      for (let i = 0; i < maxVariantLength; i++) {
        if (supportingQueries[i]) {
          merged.push({
            query: supportingQueries[i].query,
            rationale: supportingQueries[i].rationale,
          });
        }
        if (refutingQueries[i]) {
          merged.push({
            query: refutingQueries[i].query,
            rationale: refutingQueries[i].rationale,
          });
        }
      }

      for (const unlabeled of unlabeledQueries) {
        merged.push({ query: unlabeled.query, rationale: unlabeled.rationale });
      }

      const normalized = merged.length > 0
        ? merged
        : validated.queries.map(({ query, rationale }) => ({ query, rationale }));

      finalQueries = normalized.slice(0, maxQueries);
    }

    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    return finalQueries;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    console.warn("[Stage2] Query generation failed, using fallback:", err);
    return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }].slice(0, maxQueries);
  }
}
