import { z } from "zod";
import { generateText, Output } from "ai";
import { loadAndRenderSection } from "./prompt-loader";
import { splitRenderedPromptAtHeader } from "./prompt-message-parts";
import { 
  getModelForTask, 
  getPromptCachingOptions, 
  getStructuredOutputProviderOptions, 
  extractStructuredOutput 
} from "./llm";
import {
  formatPromptInferredGeography,
  formatPromptRelevantGeographies,
  normalizeRelevantGeographies,
} from "./jurisdiction-context";
import {
  buildPromptRuntimeFields,
  classifyStructuralRetryCause,
  extractLLMUsageFields,
  recordLLMCall,
} from "./metrics-integration";
import { debugLogFileOnly } from "./debug";
import { 
  mapCategory, 
  mapSourceType, 
  normalizeExtractedSourceType 
} from "./pipeline-utils";
import { 
  AtomicClaim, 
  EvidenceItem, 
} from "./types";
import { PipelineConfig } from "@/lib/config-schemas";

// ============================================================================
// SCHEMAS
// ============================================================================

export const RelevanceClassificationOutputSchema = z.object({
  relevantSources: z.array(z.object({
    url: z.string(),
    relevanceScore: z.number(),
    jurisdictionMatch: z.enum(["direct", "contextual", "foreign_reaction"]).catch("contextual"),
    reasoning: z.string(),
  })),
});

// Full evidence extraction schema (Stage 2 uses same EXTRACT_EVIDENCE prompt as Stage 1)
export const Stage2EvidenceItemSchema = z.object({
  statement: z.string(),
  sourceUrl: z.string().optional(), // URL of the source this evidence came from
  category: z.string(),
  claimDirection: z.enum(["supports", "contradicts", "contextual"]),
  evidenceScope: z.object({
    methodology: z.string().optional(),
    temporal: z.string().optional(),
    geographic: z.string().optional(),
    boundaries: z.string().optional(),
    analyticalDimension: z.string().optional().catch(undefined),
    additionalDimensions: z.record(z.string()).optional(),
  }),
  probativeValue: z.enum(["high", "medium", "low"]),
  sourceType: z.string().optional()
    .transform((value) => normalizeExtractedSourceType(value)),
  isDerivative: z.boolean().optional(),
  derivedFromSourceUrl: z.string().nullable().optional(),
  relevantClaimIds: z.array(z.string()),
});

export const Stage2ExtractEvidenceOutputSchema = z.object({
  evidenceItems: z.array(Stage2EvidenceItemSchema),
});

export const ApplicabilityAssessmentOutputSchema = z.object({
  assessments: z.array(z.object({
    evidenceIndex: z.number(),
    applicability: z.enum(["direct", "contextual", "foreign_reaction"]).catch("direct"),
    relevantClaimIds: z.array(z.string()),
    claimDirectionByClaimId: z.array(z.object({
      claimId: z.string(),
      claimDirection: z.enum(["supports", "contradicts", "neutral"]).catch("neutral"),
    })).optional().catch([]),
    reasoning: z.string(),
  })),
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * Evidence balance metrics for the evidence pool.
 * Measures the directional skew of evidence items.
 */
export interface EvidenceBalanceMetrics {
  supporting: number;
  contradicting: number;
  neutral: number;
  total: number;
  /** Ratio of supporting / (supporting + contradicting). 0.5 = balanced, >0.8 or <0.2 = skewed. NaN if no directional evidence. */
  balanceRatio: number;
  isSkewed: boolean;
}

function cloneEvidenceScope(scope: EvidenceItem["evidenceScope"]): EvidenceItem["evidenceScope"] {
  if (!scope) return scope;
  return {
    ...scope,
    additionalDimensions: scope.additionalDimensions
      ? { ...scope.additionalDimensions }
      : scope.additionalDimensions,
  };
}

function cloneEvidenceItem(
  item: EvidenceItem,
  overrides: Partial<EvidenceItem> = {},
): EvidenceItem {
  const merged = { ...item, ...overrides };
  return {
    ...merged,
    evidenceScope: cloneEvidenceScope(merged.evidenceScope),
    relevantClaimIds: merged.relevantClaimIds
      ? [...merged.relevantClaimIds]
      : merged.relevantClaimIds,
  };
}

// ============================================================================
// STAGE 2: CLASSIFICATION & EXTRACTION
// ============================================================================

/**
 * Classify search results for relevance to a claim using LLM (Haiku, batched).
 * Uses RELEVANCE_CLASSIFICATION UCM prompt.
 */
export async function classifyRelevance(
  claim: AtomicClaim,
  searchResults: Array<{ url: string; title: string; snippet?: string | null }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
  inferredGeography?: string | null,
  relevantGeographies?: string[] | null,
): Promise<Array<{ url: string; relevanceScore: number; originalRank: number }>> {
  const normalizedRelevantGeographies = normalizeRelevantGeographies(
    relevantGeographies,
    inferredGeography,
  );
  const rendered = await loadAndRenderSection("claimboundary", "RELEVANCE_CLASSIFICATION", {
    currentDate,
    claim: claim.statement,
    freshnessRequirement: claim.freshnessRequirement ?? "none",
    expectedEvidenceProfile: JSON.stringify(claim.expectedEvidenceProfile ?? {}, null, 2),
    inferredGeography: formatPromptInferredGeography(normalizedRelevantGeographies),
    relevantGeographies: formatPromptRelevantGeographies(normalizedRelevantGeographies),
    searchResults: JSON.stringify(
      searchResults.map((r) => ({ url: r.url, title: r.title, snippet: r.snippet ?? "" })),
      null,
      2,
    ),
  });
  if (!rendered) {
    // Fallback: accept all results with neutral score
    return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
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
          content: `Classify the relevance of ${searchResults.length} search results to this claim: "${claim.statement}"`,
        },
      ],
      temperature: pipelineConfig?.relevanceClassificationTemperature ?? 0.1,
      output: Output.object({ schema: RelevanceClassificationOutputSchema }),
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
        errorMessage: "Stage 2 relevance classification returned no structured output",
        timestamp: new Date(),
      });
      return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
    }

    const validated = RelevanceClassificationOutputSchema.parse(parsed);

    // Build URL→originalRank map from the search results array order
    const urlToRank = new Map(searchResults.map((r, i) => [r.url, i]));

    // Cap foreign_reaction scores before applying the relevance threshold.
    // This ensures foreign government actions (sanctions, EOs, congressional statements)
    // are filtered out while contextual evidence (academic studies, NGO reports) passes.
    const foreignCap = pipelineConfig.foreignJurisdictionRelevanceCap ?? 0.35;
    const adjustedSources = validated.relevantSources.map((s) => {
      const rawScore = s.relevanceScore;
      const adjusted = s.jurisdictionMatch === "foreign_reaction"
        ? { ...s, relevanceScore: Math.min(s.relevanceScore, foreignCap) }
        : s;
      const originalRank = urlToRank.get(s.url) ?? searchResults.length;
      return { ...adjusted, rawScore, originalRank };
    });

    // Diagnostics: log every classified result (admin-only via debugLog)
    debugLogFileOnly(`[Stage2] Relevance classification: ${adjustedSources.length} results for "${claim.statement.slice(0, 60)}"`, adjustedSources.map((s) => ({
      rank: s.originalRank,
      url: s.url.slice(0, 80),
      raw: s.rawScore,
      adjusted: s.relevanceScore,
      jurisdiction: s.jurisdictionMatch,
      reasoning: s.reasoning.slice(0, 80),
    })));

    const relevanceThreshold = pipelineConfig.relevanceFloor ?? 0.4;
    const relevantSources = adjustedSources.filter((s) => s.relevanceScore >= relevanceThreshold);

    // Diagnostics: log discard summary
    const discarded = adjustedSources.filter((s) => s.relevanceScore < relevanceThreshold);
    if (discarded.length > 0) {
      const cappedCount = discarded.filter((s) => s.jurisdictionMatch === "foreign_reaction").length;
      const belowThreshold = discarded.length - cappedCount;
      debugLogFileOnly(`[Stage2] Discarded ${discarded.length} items: ${cappedCount} capped (foreign_reaction), ${belowThreshold} below threshold (${relevanceThreshold})`,
        discarded.map((s) => ({ url: s.url.slice(0, 80), raw: s.rawScore, adjusted: s.relevanceScore, jurisdiction: s.jurisdictionMatch })),
      );
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

    // Filter to minimum relevance score of 0.4, return with originalRank for stable sort at call site
    return relevantSources;
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
    debugLogFileOnly("[Stage2] Relevance classification failed, accepting all results", {
      errorMessage,
    });
    return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
  }
}

/**
 * Extract evidence from fetched sources for a target claim (Haiku, batched).
 * Uses EXTRACT_EVIDENCE UCM prompt. Returns full EvidenceItem[] with all CB fields.
 */
export async function extractResearchEvidence(
  targetClaim: AtomicClaim,
  sources: Array<{ url: string; title: string; text: string }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
  allClaims: AtomicClaim[] = [targetClaim],
): Promise<EvidenceItem[]> {
  const claimSet = allClaims.some((claim) => claim.id === targetClaim.id)
    ? allClaims
    : [targetClaim, ...allClaims];
  const promptVariables = {
    currentDate,
    claim: targetClaim.statement,
    expectedEvidenceProfile: JSON.stringify(targetClaim.expectedEvidenceProfile ?? {}, null, 2),
    allClaims: JSON.stringify(claimSet.map((claim) => ({
      id: claim.id,
      statement: claim.statement,
      expectedEvidenceProfile: claim.expectedEvidenceProfile ?? {},
    })), null, 2),
    sourceContent: sources.map((s, i) =>
      `[Source ${i + 1}: ${s.title}]\nURL: ${s.url}\n${s.text}`
    ).join("\n\n---\n\n"),
    sourceUrl: sources.map((s) => s.url).join(", "),
  };
  const rendered = await loadAndRenderSection("claimboundary", "EXTRACT_EVIDENCE", promptVariables);
  if (!rendered) return [];
  const promptParts = splitRenderedPromptAtHeader(rendered, "### Input");
  const extractionInstruction =
    `Extract evidence from these ${sources.length} sources relating to claim "${targetClaim.id}": "${targetClaim.statement}"`;

  const model = getModelForTask("extract_evidence", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;

  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: promptParts.systemContent,
          providerOptions: promptParts.separated ? getPromptCachingOptions(model.provider) : undefined,
        },
        {
          role: "user",
          content: promptParts.separated
            ? `${promptParts.userContent}\n\n${extractionInstruction}`
            : extractionInstruction,
        },
      ],
      temperature: pipelineConfig?.extractEvidenceTemperature ?? 0.1,
      output: Output.object({ schema: Stage2ExtractEvidenceOutputSchema }),
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
        ...extractLLMUsageFields(result?.usage),
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Stage 2 evidence extraction returned no structured output",
        ...buildPromptRuntimeFields(rendered, {
          renderedSystemContent: promptParts.systemContent,
          dynamicPayload: promptVariables,
          retryCause: "parse",
          outputBranch: "failed",
        }),
        timestamp: new Date(),
      });
      return [];
    }

    const validated = Stage2ExtractEvidenceOutputSchema.parse(parsed);

    // Map to full EvidenceItem format
    let idCounter = Date.now(); // Use timestamp-based IDs to avoid collisions
    let claimIdMismatchCount = 0;
    let categoryNormalizationCount = 0;
    let categoryFallbackToEvidenceCount = 0;
    let missingSourceUrlAssignmentCount = 0;
    let unmatchedSourceUrlFallbackCount = 0;
    let contextualMappedToNeutralCount = 0;
    let directionalCompanionClaimRetainedCount = 0;
    const knownClaimIds = new Set(claimSet.map((claim) => claim.id));

    const evidenceItems = validated.evidenceItems.map((ei) => {
      const hasUnknownClaimIds = ei.relevantClaimIds.some((claimId) => !knownClaimIds.has(claimId));
      if (ei.relevantClaimIds.length === 0 || !ei.relevantClaimIds.includes(targetClaim.id) || hasUnknownClaimIds) {
        claimIdMismatchCount++;
      }
      const mappedClaimDirection = ei.claimDirection === "contextual" ? "neutral" as const : ei.claimDirection;
      const validCompanionClaimIds = ei.relevantClaimIds.filter((claimId) =>
        claimId !== targetClaim.id && knownClaimIds.has(claimId),
      );
      if (mappedClaimDirection !== "neutral" && validCompanionClaimIds.length > 0) {
        directionalCompanionClaimRetainedCount++;
      }
      const relevantClaimIds = Array.from(new Set([targetClaim.id, ...validCompanionClaimIds]));
      
      const normalizedCategoryInput = ei.category.toLowerCase().replace(/[_\s-]+/g, "_");
      const mappedCategory = mapCategory(ei.category);
      if (mappedCategory !== normalizedCategoryInput) {
        categoryNormalizationCount++;
      }
      if (
        mappedCategory === "evidence"
        && normalizedCategoryInput !== "evidence"
        && normalizedCategoryInput !== "case_study"
      ) {
        categoryFallbackToEvidenceCount++;
      }
      
      // Use LLM-attributed sourceUrl when available; fall back to first source.
      let matchedSource = sources.find((s) => s.url === ei.sourceUrl);
      if (!ei.sourceUrl) {
        missingSourceUrlAssignmentCount++;
      } else if (!matchedSource) {
        unmatchedSourceUrlFallbackCount++;
      }
      matchedSource = matchedSource ?? sources[0];

      if (mappedClaimDirection === "neutral" && ei.claimDirection === "contextual") {
        contextualMappedToNeutralCount++;
      }

      return {
        id: `EV_${String(idCounter++)}`,
        statement: ei.statement,
        category: mappedCategory,
        specificity: ei.probativeValue === "high" ? "high" as const : "medium" as const,
        sourceId: "",
        sourceUrl: matchedSource?.url ?? "",
        sourceTitle: matchedSource?.title ?? "",
        sourceExcerpt: ei.statement,
        claimDirection: mappedClaimDirection,
        evidenceScope: {
          name: ei.evidenceScope?.methodology?.slice(0, 30) || "Unspecified",
          methodology: ei.evidenceScope?.methodology,
          temporal: ei.evidenceScope?.temporal,
          geographic: ei.evidenceScope?.geographic,
          boundaries: ei.evidenceScope?.boundaries,
          analyticalDimension: ei.evidenceScope?.analyticalDimension,
          additionalDimensions: ei.evidenceScope?.additionalDimensions,
        },
        probativeValue: ei.probativeValue,
        sourceType: mapSourceType(ei.sourceType),
        // Extraction targets a single claim, so always preserve the target ID.
        // The prompt permits shared directional mappings only when the same
        // claimDirection is valid for every listed claim.
        relevantClaimIds,
        isDerivative: ei.isDerivative ?? false,
        derivedFromSourceUrl: ei.derivedFromSourceUrl ?? undefined,
      } satisfies EvidenceItem;
    });

    if (
      claimIdMismatchCount > 0
      || categoryNormalizationCount > 0
      || categoryFallbackToEvidenceCount > 0
      || missingSourceUrlAssignmentCount > 0
      || unmatchedSourceUrlFallbackCount > 0
      || contextualMappedToNeutralCount > 0
      || directionalCompanionClaimRetainedCount > 0
    ) {
      debugLogFileOnly(`[Stage2] Extraction normalizations for ${targetClaim.id}`, {
        claimIdMismatches: claimIdMismatchCount,
        categoryNormalizations: categoryNormalizationCount,
        categoryFallbackToEvidence: categoryFallbackToEvidenceCount,
        missingSourceUrlAssignments: missingSourceUrlAssignmentCount,
        unmatchedSourceUrlFallbacks: unmatchedSourceUrlFallbackCount,
        contextualMappedToNeutral: contextualMappedToNeutralCount,
        directionalCompanionClaimRetained: directionalCompanionClaimRetainedCount,
      });
    }

    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      ...extractLLMUsageFields(result?.usage),
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      ...buildPromptRuntimeFields(rendered, {
        renderedSystemContent: promptParts.systemContent,
        dynamicPayload: promptVariables,
        outputBranch: "initial",
      }),
      timestamp: new Date(),
    });

    return evidenceItems;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      ...extractLLMUsageFields(result?.usage),
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      ...buildPromptRuntimeFields(rendered, {
        renderedSystemContent: promptParts.systemContent,
        dynamicPayload: promptVariables,
        retryCause: classifyStructuralRetryCause(err),
        outputBranch: "failed",
      }),
      timestamp: new Date(),
    });
    debugLogFileOnly("[Stage2] Evidence extraction failed", {
      claimId: targetClaim.id,
      errorMessage,
    });
    return [];
  }
}

/**
 * Fix 3: Post-extraction applicability assessment and claim mapping.
 *
 * Batches all evidence items into a single extraction-tier LLM call to classify each item
 * as "direct", "contextual", or "foreign_reaction", and to fill missing claim mappings
 * when evidence gathered for one claim also materially verifies a companion claim.
 * Items classified as "foreign_reaction" are filtered out by the caller only when the
 * applicability filter is enabled.
 *
 * Called between research completion and clusterBoundaries() in the main pipeline.
 *
 * @param claims - The atomic claims being analyzed
 * @param evidenceItems - All gathered evidence items
 * @param inferredGeography - The claim's inferred jurisdiction (null = no filtering)
 * @param pipelineConfig - Pipeline configuration
 * @returns Evidence items with `applicability` field populated
 */
export async function assessEvidenceApplicability(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  inferredGeography: string | null,
  pipelineConfig: PipelineConfig,
  relevantGeographies?: string[] | null,
): Promise<EvidenceItem[]> {
  const normalizedRelevantGeographies = normalizeRelevantGeographies(
    relevantGeographies,
    inferredGeography,
  );
  const shouldApplyApplicability =
    normalizedRelevantGeographies.length > 0 &&
    (pipelineConfig.applicabilityFilterEnabled ?? true);

  // Skip if no evidence
  if (evidenceItems.length === 0) {
    return evidenceItems;
  }

  const statementMaxChars = Math.max(
    200,
    Math.min(
      2000,
      Math.floor(pipelineConfig.applicabilityAssessmentEvidenceStatementMaxChars ?? 600),
    ),
  );

  // Prepare compact evidence summaries for LLM (minimize tokens)
  const evidenceSummaries = evidenceItems.map((item, index) => ({
    index,
    statement: item.statement.slice(0, statementMaxChars),
    sourceUrl: item.sourceUrl ?? "unknown",
    sourceTitle: item.sourceTitle ?? "unknown",
    category: item.category,
    claimDirection: item.claimDirection ?? "neutral",
    evidenceScope: item.evidenceScope ?? null,
    currentRelevantClaimIds: item.relevantClaimIds ?? [],
  }));

  const rendered = await loadAndRenderSection("claimboundary", "APPLICABILITY_ASSESSMENT", {
    claims: JSON.stringify(claims.map(c => ({
      id: c.id,
      statement: c.statement,
      expectedEvidenceProfile: c.expectedEvidenceProfile ?? {},
    })), null, 2),
    inferredGeography: formatPromptInferredGeography(normalizedRelevantGeographies),
    relevantGeographies: formatPromptRelevantGeographies(normalizedRelevantGeographies),
    evidenceItems: JSON.stringify(evidenceSummaries, null, 2),
  });

  if (!rendered) {
    debugLogFileOnly("[Fix3] APPLICABILITY_ASSESSMENT prompt section not found — skipping applicability filter", {
      claimIds: claims.map((claim) => claim.id),
    });
    return evidenceItems;
  }

  const model = getModelForTask("extract_evidence", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;

  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(model.provider),
        },
        { role: "user", content: "Classify each evidence item by applicability and claim relevance." },
      ],
      temperature: pipelineConfig?.relevanceClassificationTemperature ?? 0.1,
      output: Output.object({ schema: ApplicabilityAssessmentOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        model.provider,
      ),
    });

    const validated = extractStructuredOutput(result) as z.infer<typeof ApplicabilityAssessmentOutputSchema>;

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

    // Apply classifications and LLM claim-mapping additions to evidence items.
    // Existing mappings are preserved; this pass only fills missing multi-claim
    // links found by the same LLM call that already sees all claims together.
    const knownClaimIds = new Set(claims.map((claim) => claim.id));
    type ClaimDirection = NonNullable<EvidenceItem["claimDirection"]>;
    const classificationMap = new Map<number, "direct" | "contextual" | "foreign_reaction">();
    const claimMappingAdditions = new Map<number, string[]>();
    const claimDirectionAdditions = new Map<number, Map<string, ClaimDirection>>();
    for (const assessment of validated.assessments) {
      classificationMap.set(assessment.evidenceIndex, assessment.applicability);
      const directionByClaim = new Map<string, ClaimDirection>();
      for (const directionEntry of assessment.claimDirectionByClaimId ?? []) {
        if (knownClaimIds.has(directionEntry.claimId)) {
          directionByClaim.set(directionEntry.claimId, directionEntry.claimDirection);
        }
      }
      const candidateClaimIds = [
        ...assessment.relevantClaimIds,
        ...Array.from(directionByClaim.keys()),
      ];
      const validClaimIds = candidateClaimIds.filter((claimId) => knownClaimIds.has(claimId));
      if (validClaimIds.length > 0) {
        claimMappingAdditions.set(assessment.evidenceIndex, Array.from(new Set(validClaimIds)));
      }
      if (directionByClaim.size > 0) {
        claimDirectionAdditions.set(assessment.evidenceIndex, directionByClaim);
      }
    }

    // Debug: count by category
    const counts = { direct: 0, contextual: 0, foreign_reaction: 0, unclassified: 0 };
    const foreignDomains: string[] = [];
    let claimMappingExtensions = 0;
    let neutralClaimDirectionClones = 0;
    let neutralCompanionClones = 0;
    let directionalCompanionClones = 0;
    let existingClaimDirectionCorrections = 0;

    const assessed = evidenceItems.flatMap((item, index) => {
      const applicability = classificationMap.get(index) ?? "direct";
      counts[applicability]++;
      if (applicability === "foreign_reaction") {
        const domain = item.sourceUrl?.match(/^https?:\/\/([^/?#]+)/)?.[1] ?? "unknown";
        foreignDomains.push(domain);
      }
      const existingClaimIds = item.relevantClaimIds ?? [];
      const assessedClaimIds = claimMappingAdditions.get(index) ?? [];
      const claimDirections = claimDirectionAdditions.get(index) ?? new Map<string, ClaimDirection>();
      let assessedItem = cloneEvidenceItem(
        item,
        shouldApplyApplicability ? { applicability } : {},
      );
      let itemDirection = item.claimDirection ?? "neutral";
      const companionClaimIds = assessedClaimIds.filter((claimId) =>
        !existingClaimIds.includes(claimId),
      );
      const knownExistingClaimIds = existingClaimIds.filter((claimId) => knownClaimIds.has(claimId));
      const existingDirectionOverrides = knownExistingClaimIds
        .map((claimId) => claimDirections.get(claimId))
        .filter((direction): direction is ClaimDirection => direction !== undefined);
      const uniqueExistingDirectionOverrides = new Set(existingDirectionOverrides);
      if (
        itemDirection !== "neutral"
        && uniqueExistingDirectionOverrides.size === 1
        && existingDirectionOverrides.length === knownExistingClaimIds.length
        && knownExistingClaimIds.length > 0
      ) {
        const correctedDirection = Array.from(uniqueExistingDirectionOverrides)[0];
        if (correctedDirection !== itemDirection) {
          existingClaimDirectionCorrections++;
        }
        assessedItem = cloneEvidenceItem(assessedItem, {
          claimDirection: correctedDirection,
        });
        itemDirection = correctedDirection;
      }
      if (itemDirection === "neutral") {
        const relevantClaimIds = Array.from(new Set([...existingClaimIds, ...assessedClaimIds]));
        const directionalClaimIds = relevantClaimIds.filter((claimId) => {
          const claimDirection = claimDirections.get(claimId);
          return claimDirection !== undefined && claimDirection !== "neutral";
        });
        if (directionalClaimIds.length > 0) {
          const neutralClaimIds = relevantClaimIds.filter((claimId) => !directionalClaimIds.includes(claimId));
          const neutralItem = neutralClaimIds.length > 0
            ? [cloneEvidenceItem(assessedItem, { relevantClaimIds: neutralClaimIds })]
            : [];
          const directionalItems = directionalClaimIds.map((claimId) => {
            const claimDirection = claimDirections.get(claimId)!;
            neutralClaimDirectionClones++;
            return cloneEvidenceItem(assessedItem, {
              id: `${item.id}__${claimDirection}_${claimId}`,
              claimDirection,
              relevantClaimIds: [claimId],
            });
          });
          if (relevantClaimIds.length > existingClaimIds.length) {
            claimMappingExtensions += relevantClaimIds.length - existingClaimIds.length;
          }
          return [...neutralItem, ...directionalItems];
        }
        if (relevantClaimIds.length > existingClaimIds.length) {
          claimMappingExtensions += relevantClaimIds.length - existingClaimIds.length;
        }
        return [
          relevantClaimIds.length > 0
            ? cloneEvidenceItem(assessedItem, { relevantClaimIds })
            : assessedItem,
        ];
      }

      if (companionClaimIds.length === 0) {
        return [assessedItem];
      }

      const companionItems = companionClaimIds.map((claimId) => {
        const companionDirection = claimDirections.get(claimId) ?? "neutral";
        if (companionDirection === "neutral") {
          neutralCompanionClones++;
        } else {
          directionalCompanionClones++;
        }
        return cloneEvidenceItem(assessedItem, {
          id: `${item.id}__${companionDirection}_${claimId}`,
          claimDirection: companionDirection,
          relevantClaimIds: [claimId],
        });
      });
      claimMappingExtensions += companionItems.length;

      return [assessedItem, ...companionItems];
    });

    // Count unclassified (items not in LLM response — default to "direct")
    counts.unclassified = evidenceItems.length - classificationMap.size;

    debugLogFileOnly(
      `[Fix3] Applicability assessment: ${counts.direct} direct, ${counts.contextual} contextual, ` +
      `${counts.foreign_reaction} foreign_reaction, ${counts.unclassified} unclassified (defaulted to direct). ` +
      `Applicability applied: ${shouldApplyApplicability}. ` +
      `Claim mapping extensions: ${claimMappingExtensions}. ` +
      `Neutral claim-local direction clones: ${neutralClaimDirectionClones}. ` +
      `Neutral companion clones: ${neutralCompanionClones}. ` +
      `Directional companion clones: ${directionalCompanionClones}. ` +
      `Existing claim direction corrections: ${existingClaimDirectionCorrections}. ` +
      `Foreign domains: ${foreignDomains.length > 0 ? foreignDomains.length : "none"}`
    );
    debugLogFileOnly(
      `[Fix3] Applicability: ${counts.direct}D/${counts.contextual}C/${counts.foreign_reaction}F ` +
      `(${evidenceItems.length} total, geography: ${normalizedRelevantGeographies.join(",")})`
    );

    return assessed;
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
    // Fail-open: if assessment fails, keep all evidence (don't block pipeline)
    debugLogFileOnly("[Fix3] Applicability assessment failed, keeping all evidence", {
      claimIds: claims.map((claim) => claim.id),
      errorMessage,
    });
    return evidenceItems;
  }
}

/**
 * Assess EvidenceScope quality (§8.2 step 8).
 * Deterministic structural check: complete/partial/incomplete.
 */
export function assessScopeQuality(
  item: EvidenceItem,
): "complete" | "partial" | "incomplete" {
  const scope = item.evidenceScope;
  if (!scope) return "incomplete";

  const hasMethodology = !!(scope.methodology && scope.methodology.trim().length > 0);
  const hasTemporal = !!(scope.temporal && scope.temporal.trim().length > 0);

  if (!hasMethodology || !hasTemporal) return "incomplete";

  // Check if fields are meaningful vs vague (language-neutral: length + structural markers only)
  const isVague = (s: string) =>
    s.length < 5 || /^(n\/?a|—|-|\?|\.{1,3}|\*+)$/i.test(s.trim());

  if (isVague(scope.methodology!) || isVague(scope.temporal!)) return "partial";

  return "complete";
}

/**
 * Assess directional balance of the evidence pool.
 * Returns metrics and whether the pool is skewed beyond the configured threshold.
 *
 * @param evidenceItems - All evidence items from research stage
 * @param skewThreshold - Ratio above which (or below 1-threshold) the pool is considered skewed (default 0.8)
 * @returns EvidenceBalanceMetrics
 */
export function assessEvidenceBalance(
  evidenceItems: EvidenceItem[],
  skewThreshold = 0.8,
  minDirectional = 3,
): EvidenceBalanceMetrics {
  let supporting = 0;
  let contradicting = 0;
  let neutral = 0;

  for (const item of evidenceItems) {
    switch (item.claimDirection) {
      case "supports":
        supporting++;
        break;
      case "contradicts":
        contradicting++;
        break;
      default:
        neutral++;
        break;
    }
  }

  const directional = supporting + contradicting;
  const balanceRatio = directional > 0 ? supporting / directional : NaN;
  // Use max(ratio, 1-ratio) to get majority proportion — avoids floating-point issues with 1-threshold
  const majorityRatio = isNaN(balanceRatio) ? 0 : Math.max(balanceRatio, 1 - balanceRatio);
  // Strict > so that threshold=1.0 disables detection (majorityRatio maxes at 1.0)
  const isSkewed = !isNaN(balanceRatio) && directional >= minDirectional && majorityRatio > skewThreshold;

  return {
    supporting,
    contradicting,
    neutral,
    total: evidenceItems.length,
    balanceRatio,
    isSkewed,
  };
}

// ============================================================================
// PER-SOURCE EVIDENCE CAP (Fix 2 — single-source flooding mitigation)
// ============================================================================

/** Probative value sort order: high > medium > low. */
const PROBATIVE_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Enforce a per-source evidence item cap by retaining the best N items
 * (by probativeValue) across both the existing pool and newly extracted items.
 *
 * Structural plumbing — not semantic filtering. Prevents any single source URL
 * from contributing more than `maxPerSource` items to the evidence pool.
 *
 * Unlike a first-come approach, a higher-quality new item can displace a
 * lower-quality existing item from the same source. Evicted existing item IDs
 * are returned so the caller can remove them from the pool.
 *
 * Within the same probativeValue tier, existing items are preferred over new
 * items (stable — no churn when quality is equal).
 *
 * @param newItems - Newly extracted items to be added this iteration
 * @param existingEvidence - Items already in the evidence pool
 * @param maxPerSource - Cap per source URL (UCM: maxEvidenceItemsPerSource)
 * @returns `kept` new items to add, `capped` count, `evictedIds` to remove from pool
 */
export function applyPerSourceCap(
  newItems: EvidenceItem[],
  existingEvidence: EvidenceItem[],
  maxPerSource: number,
): { kept: EvidenceItem[]; capped: number; evictedIds: string[] } {
  if (maxPerSource <= 0 || newItems.length === 0) {
    return { kept: newItems, capped: 0, evictedIds: [] };
  }

  // Index existing items by source URL
  const existingBySource = new Map<string, EvidenceItem[]>();
  for (const item of existingEvidence) {
    const url = item.sourceUrl ?? "";
    if (!existingBySource.has(url)) existingBySource.set(url, []);
    existingBySource.get(url)!.push(item);
  }

  // Group new items by source URL
  const newBySource = new Map<string, EvidenceItem[]>();
  for (const item of newItems) {
    const url = item.sourceUrl ?? "";
    if (!newBySource.has(url)) newBySource.set(url, []);
    newBySource.get(url)!.push(item);
  }

  const kept: EvidenceItem[] = [];
  const evictedIds: string[] = [];
  let capped = 0;

  for (const [url, newSourceItems] of newBySource) {
    const existingSourceItems = existingBySource.get(url) ?? [];
    const totalCount = existingSourceItems.length + newSourceItems.length;

    if (totalCount <= maxPerSource) {
      // Combined pool is within cap — keep all new items, no evictions
      kept.push(...newSourceItems);
      continue;
    }

    // Merge existing + new, sort by probativeValue descending.
    // Tag each item so we can tell existing from new after sorting.
    type Tagged = { item: EvidenceItem; isNew: boolean };
    const merged: Tagged[] = [
      ...existingSourceItems.map((item) => ({ item, isNew: false })),
      ...newSourceItems.map((item) => ({ item, isNew: true })),
    ];

    // Sort: best probativeValue first. Within same tier, existing before new (stable preference).
    merged.sort((a, b) => {
      const aOrder = PROBATIVE_ORDER[a.item.probativeValue ?? "low"] ?? 2;
      const bOrder = PROBATIVE_ORDER[b.item.probativeValue ?? "low"] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Same tier: prefer existing over new (no churn when equal quality)
      if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
      return 0;
    });

    const retained = merged.slice(0, maxPerSource);
    const dropped = merged.slice(maxPerSource);

    // Collect new items that survived into `kept`
    for (const tagged of retained) {
      if (tagged.isNew) kept.push(tagged.item);
    }

    // Collect existing items that were evicted
    for (const tagged of dropped) {
      if (!tagged.isNew) evictedIds.push(tagged.item.id);
      else capped++;
    }
  }

  return { kept, capped, evictedIds };
}

