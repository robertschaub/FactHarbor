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

export type ResearchQueryRetrievalLane = "primary_direct" | "navigational" | "secondary_context";
export type ResearchQueryFreshnessWindow = "none" | "w" | "m" | "y";

export interface GeneratedResearchQuery {
  query: string;
  rationale: string;
  retrievalLane?: ResearchQueryRetrievalLane;
  freshnessWindow?: ResearchQueryFreshnessWindow;
}

// ============================================================================
// SCHEMAS
// ============================================================================

export const GenerateQueriesOutputSchema = z.object({
  queries: z.array(z.object({
    query: z.string(),
    rationale: z.string(),
    variantType: z.enum(["supporting", "refuting"]).optional(),
    retrievalLane: z.enum(["primary_direct", "navigational", "secondary_context"]).optional(),
    freshnessWindow: z.enum(["none", "w", "m", "y"]).optional(),
  })),
});

function warnOnMissingRefinementMetadata(
  iterationType: "main" | "contradiction" | "contrarian" | "refinement",
  queries: z.infer<typeof GenerateQueriesOutputSchema>["queries"],
): void {
  if (iterationType !== "refinement") {
    return;
  }

  const missingAnyMetadataCount = queries.filter(
    (query) => query.retrievalLane === undefined || query.freshnessWindow === undefined,
  ).length;
  if (missingAnyMetadataCount === 0) {
    return;
  }

  console.warn(
    `[Stage2] Refinement query metadata missing for ${missingAnyMetadataCount}/${queries.length} generated queries; ` +
    `routing/freshness fallbacks may suppress or weaken the refinement pass.`,
  );
}

// ============================================================================
// STAGE 2: QUERY GENERATION
// ============================================================================

/**
 * Generate search queries for a claim using LLM (Haiku tier).
 * Uses GENERATE_QUERIES UCM prompt.
 */
export async function generateResearchQueries(
  claim: AtomicClaim,
  iterationType: "main" | "contradiction" | "contrarian" | "refinement",
  existingEvidence: EvidenceItem[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
  distinctEvents: CBClaimUnderstanding["distinctEvents"] = [],
  remainingQueryBudget?: number,
  searchGeo?: { language?: string; geography?: string | null; geographies?: string[] | null },
): Promise<GeneratedResearchQuery[]> {
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
    const fallbackQueries: GeneratedResearchQuery[] = [{
      query: claim.statement.slice(0, 80),
      rationale: "fallback",
      retrievalLane: "secondary_context",
      freshnessWindow: "none",
    }];
    return fallbackQueries.slice(0, maxQueries);
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
      const fallbackQueries: GeneratedResearchQuery[] = [{
        query: claim.statement.slice(0, 80),
        rationale: "fallback",
        retrievalLane: "secondary_context",
        freshnessWindow: "none",
      }];
      return fallbackQueries.slice(0, maxQueries);
    }

    const validated = GenerateQueriesOutputSchema.parse(parsed);
    warnOnMissingRefinementMetadata(iterationType, validated.queries);
    let finalQueries: GeneratedResearchQuery[];
    if (queryStrategyMode !== "pro_con") {
      finalQueries = validated.queries
        .slice(0, maxQueries)
        .map(({ query, rationale, retrievalLane, freshnessWindow }) => ({
          query,
          rationale,
          ...(retrievalLane !== undefined ? { retrievalLane } : {}),
          ...(freshnessWindow !== undefined ? { freshnessWindow } : {}),
        }));
    } else {
      const supportingQueries = validated.queries.filter((query) => query.variantType === "supporting");
      const refutingQueries = validated.queries.filter((query) => query.variantType === "refuting");
      const unlabeledQueries = validated.queries.filter(
        (query) => query.variantType !== "supporting" && query.variantType !== "refuting",
      );

      const merged: GeneratedResearchQuery[] = [];
      const maxVariantLength = Math.max(supportingQueries.length, refutingQueries.length);
      for (let i = 0; i < maxVariantLength; i++) {
        if (supportingQueries[i]) {
          merged.push({
            query: supportingQueries[i].query,
            rationale: supportingQueries[i].rationale,
            ...(supportingQueries[i].retrievalLane !== undefined ? { retrievalLane: supportingQueries[i].retrievalLane } : {}),
            ...(supportingQueries[i].freshnessWindow !== undefined ? { freshnessWindow: supportingQueries[i].freshnessWindow } : {}),
          });
        }
        if (refutingQueries[i]) {
          merged.push({
            query: refutingQueries[i].query,
            rationale: refutingQueries[i].rationale,
            ...(refutingQueries[i].retrievalLane !== undefined ? { retrievalLane: refutingQueries[i].retrievalLane } : {}),
            ...(refutingQueries[i].freshnessWindow !== undefined ? { freshnessWindow: refutingQueries[i].freshnessWindow } : {}),
          });
        }
      }

      for (const unlabeled of unlabeledQueries) {
        merged.push({
          query: unlabeled.query,
          rationale: unlabeled.rationale,
          ...(unlabeled.retrievalLane !== undefined ? { retrievalLane: unlabeled.retrievalLane } : {}),
          ...(unlabeled.freshnessWindow !== undefined ? { freshnessWindow: unlabeled.freshnessWindow } : {}),
        });
      }

      const normalized = merged.length > 0
        ? merged
        : validated.queries.map(({ query, rationale, retrievalLane, freshnessWindow }) => ({
          query,
          rationale,
          ...(retrievalLane !== undefined ? { retrievalLane } : {}),
          ...(freshnessWindow !== undefined ? { freshnessWindow } : {}),
        }));

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
    const fallbackQueries: GeneratedResearchQuery[] = [{
      query: claim.statement.slice(0, 80),
      rationale: "fallback",
      retrievalLane: "secondary_context",
      freshnessWindow: "none",
    }];
    return fallbackQueries.slice(0, maxQueries);
  }
}
