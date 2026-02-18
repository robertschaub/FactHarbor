/**
 * Monolithic Dynamic Pipeline (PR 4)
 *
 * Fast single-context analysis that produces flexible/dynamic output.
 * This allows the LLM more freedom in structuring the analysis while
 * maintaining minimum safety contracts.
 *
 * Key features:
 * - Flexible output structure (not bound to canonical schema)
 * - Minimum safety contract: citations[], rawJson always stored
 * - Budget enforcement (maxIterations, maxSearches, timeout)
 * - Full citation provenance tracking
 *
 * @module analyzer/monolithic-dynamic
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, getModelForTask, getStructuredOutputProviderOptions, getPromptCachingOptions } from "./llm";
import { CONFIG, getDeterministicTemperature } from "./config";
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_SR_CONFIG } from "@/lib/config-schemas";
import { filterEvidenceByProvenance } from "./provenance-validation";
import type { AnalysisWarning, EvidenceItem } from "./types";
import {
  createBudgetTracker,
  getBudgetConfig,
  recordLLMCall,
  getBudgetStats,
} from "./budgets";
import { searchWebWithProvider, type SearchProviderErrorInfo } from "../web-search";
import { extractTextFromUrl } from "../retrieval";
import { recordFailure as recordSearchFailure } from "@/lib/search-circuit-breaker";
import { detectProvider } from "./prompts/prompt-builder";
import { loadAndRenderSection, loadPromptFile, type Pipeline } from "./prompt-loader";
import { getConfig, recordConfigUsage } from "@/lib/config-storage";
import { loadPipelineConfig, loadSearchConfig } from "@/lib/config-loader";
import {
  prefetchSourceReliability,
  getTrackRecordData,
  clearPrefetchedScores,
  calculateEffectiveWeight,
  DEFAULT_UNKNOWN_SOURCE_SCORE,
  SR_CONFIG,
  setSourceReliabilityConfig,
  type CachedReliabilityData,
} from "./source-reliability";
import { percentageToArticleVerdict } from "./truth-scale";

// ============================================================================
// TYPES
// ============================================================================

export type MonolithicAnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void | Promise<void>;
  jobId?: string;
};

/** Minimum safety contract for citations */
interface Citation {
  url: string;
  title: string;
  excerpt: string;
  accessedAt: string;
  // v2.6.35: Source Reliability
  trackRecordScore?: number | null;
  trackRecordConfidence?: number | null;
  trackRecordConsensus?: boolean | null;
}

/** Dynamic analysis result - flexible structure */
interface DynamicAnalysisResult {
  // Required fields (safety contract)
  citations: Citation[];
  rawJson: any;

  // Flexible analysis fields
  summary: string;
  verdict?: {
    label: string;
    score?: number;
    confidence?: number;
  };
  findings?: Array<{
    point: string;
    support: "strong" | "moderate" | "weak" | "none";
    sources?: string[];
  }>;
  methodology?: string;
  limitations?: string[];
  additionalContext?: any;
}

/** Budget configuration for dynamic pipeline */
interface DynamicBudget {
  maxIterations: number;
  maxSearches: number;
  maxFetches: number;
  timeoutMs: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DYNAMIC_BUDGET: DynamicBudget = {
  maxIterations: 4,
  maxSearches: 6,
  maxFetches: 8,
  timeoutMs: 150_000, // 2.5 minutes
};

// ============================================================================
// SCHEMAS
// ============================================================================

const DynamicAnalysisSchema = z.object({
  summary: z.string().describe("A comprehensive summary of the analysis"),
  verdict: z
    .object({
      label: z.string().describe("Verdict label (e.g., 'Mostly True', 'Unverifiable', 'Context Needed')"),
      score: z.number().min(0).max(100).describe("REQUIRED: Truth score 0-100 (0=False, 50=Unverified, 100=True)"),
      confidence: z.number().min(0).max(100).describe("REQUIRED: Confidence level 0-100"),
      reasoning: z.string().optional().describe("Brief reasoning for the verdict"),
    })
    .optional(),
  findings: z
    .array(
      z.object({
        point: z.string().describe("A key finding or observation"),
        support: z.enum(["strong", "moderate", "weak", "none"]).describe("Level of evidence support"),
        sources: z.array(z.string()).optional().describe("Source URLs that support this finding"),
        notes: z.string().optional().describe("Additional notes about this finding"),
      })
    )
    .optional(),
  methodology: z.string().optional().describe("Brief description of analysis approach"),
  limitations: z.array(z.string()).optional().describe("Known limitations of this analysis"),
  searchQueries: z.array(z.string()).describe("Queries used for research"),
  additionalInsights: z.any().optional().describe("Any additional structured insights"),
});

const DynamicAnalysisSchemaAnthropic = z.object({
  summary: z.string().describe("A comprehensive summary of the analysis"),
  verdict: z
    .object({
      label: z.string().describe("Verdict label (e.g., 'Mostly True', 'Unverifiable', 'Context Needed')"),
      score: z.number().describe("REQUIRED: Truth score 0-100 (0=False, 50=Unverified, 100=True)"),
      confidence: z.number().describe("REQUIRED: Confidence level 0-100"),
      reasoning: z.string().optional().describe("Brief reasoning for the verdict"),
    })
    .optional(),
  findings: z
    .array(
      z.object({
        point: z.string().describe("A key finding or observation"),
        support: z.enum(["strong", "moderate", "weak", "none"]).describe("Level of evidence support"),
        sources: z.array(z.string()).optional().describe("Source URLs that support this finding"),
        notes: z.string().optional().describe("Additional notes about this finding"),
      })
    )
    .optional(),
  methodology: z.string().optional().describe("Brief description of analysis approach"),
  limitations: z.array(z.string()).optional().describe("Known limitations of this analysis"),
  searchQueries: z.array(z.string()).describe("Queries used for research"),
  additionalInsights: z.object({}).optional().describe("Any additional structured insights"),
});

const DynamicPlanSchema = z.object({
  keyQuestions: z.array(z.string()).describe("Main questions to investigate"),
  searchQueries: z.array(z.string()).min(3),
  analysisApproach: z.string().describe("Recommended approach for this content"),
});

const DynamicPlanSchemaAnthropic = z.object({
  keyQuestions: z.array(z.string()).describe("Main questions to investigate"),
  searchQueries: z.array(z.string()),
  analysisApproach: z.string().describe("Recommended approach for this content"),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely extract structured output from AI SDK result
 */
function extractStructuredOutput(result: any): any {
  if (!result) return null;
  if (result.output?.value !== undefined) return result.output.value;
  if (result.output !== undefined && typeof result.output !== "function") return result.output;
  if (result._output !== undefined) return result._output;
  if (result.experimental_output !== undefined) return result.experimental_output;
  if (result.object !== undefined) return result.object;
  return null;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Run claim verification analysis using a dynamic/experimental approach.
 *
 * This pipeline allows more flexibility in the analysis structure while
 * maintaining minimum safety requirements (citations, rawJson storage).
 */
export async function runMonolithicDynamic(
  input: MonolithicAnalysisInput
): Promise<{ resultJson: any; reportMarkdown: string }> {
  const startTime = Date.now();
  // We use tiered models below instead of a single getModel()
  const [pipelineResult, searchResult] = await Promise.all([
    loadPipelineConfig("default", input.jobId),
    loadSearchConfig("default", input.jobId),
  ]);
  const pipelineConfig = pipelineResult.config;
  const searchConfig = searchResult.config;
  const dynamicBudget: DynamicBudget = {
    maxIterations: pipelineConfig.monolithicMaxIterations ?? 4,
    maxSearches: pipelineConfig.monolithicMaxSearches ?? 6,
    maxFetches: pipelineConfig.monolithicMaxFetches ?? 8,
    timeoutMs: pipelineConfig.monolithicDynamicTimeoutMs ?? 150_000,
  };
  const budgetConfig = getBudgetConfig(pipelineConfig);
  const budgetTracker = createBudgetTracker();

  let srConfig = DEFAULT_SR_CONFIG;
  try {
    const srResult = await getConfig("sr", "default", { jobId: input.jobId });
    srConfig = srResult.config;
  } catch (err) {
    console.warn(
      "[Config] Failed to load SR config, using defaults:",
      err instanceof Error ? err.message : String(err),
    );
  }

  setSourceReliabilityConfig(srConfig);

  // v2.6.35: Clear source reliability cache at start of analysis
  clearPrefetchedScores();

  // External Prompt File System: Track prompt version per job
  try {
    const pipelineName: Pipeline = "monolithic-dynamic";
    const promptResult = await loadPromptFile(pipelineName);
    if (promptResult.success && promptResult.prompt) {
      if (input.jobId) {
        await recordConfigUsage(
          input.jobId,
          "prompt",
          pipelineName,
          promptResult.prompt.contentHash,
        ).catch(() => {});
      }
      console.log(`[Prompt-Tracking] Loaded monolithic-dynamic prompt (hash: ${promptResult.prompt.contentHash.substring(0, 12)}...)`);
    }
  } catch (err: any) {
    console.warn(`[Prompt-Tracking] Error loading prompt file (non-fatal): ${err?.message}`);
  }

  // Collected citations (safety contract)
  const citations: Citation[] = [];
  const searchQueries: string[] = [];
  const warnings: AnalysisWarning[] = [];
  let searchCount = 0;
  let fetchCount = 0;
  // v2.6.35: Track URLs for source reliability prefetch
  const urlsForReliability: string[] = [];

  if (input.onEvent) {
    await input.onEvent("Starting dynamic analysis", 5);
  }

  // Prepare input text
  let textToAnalyze = input.inputValue;
  if (input.inputType === "url") {
    if (input.onEvent) {
      await input.onEvent("Fetching input URL", 8);
    }
    try {
      const urlContent = await extractTextFromUrl(input.inputValue, {
        timeoutMs: 20000,
        maxLength: 10000,
        pdfParseTimeoutMs:
          pipelineConfig?.pdfParseTimeoutMs ?? DEFAULT_PIPELINE_CONFIG.pdfParseTimeoutMs,
      });
      textToAnalyze = `URL: ${input.inputValue}\n\nTitle: ${urlContent.title}\n\nContent:\n${urlContent.text}`;

      // Add input URL as citation
      citations.push({
        url: input.inputValue,
        title: urlContent.title,
        excerpt: urlContent.text.slice(0, 300),
        accessedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new Error(`Failed to fetch input URL: ${err}`);
    }
  }

  // Step 1: Initial analysis to determine research approach
  if (input.onEvent) {
    await input.onEvent("Analyzing input and planning research", 15);
  }

  const understandModel = getModelForTask("understand", undefined, pipelineConfig ?? undefined);
  const currentDate = new Date().toISOString().split('T')[0];
  const understandProvider = detectProvider(understandModel.modelName || "");

  const renderedPlan = await loadAndRenderSection("monolithic-dynamic", "DYNAMIC_PLAN", {
    currentDate,
  });
  if (!renderedPlan?.content?.trim()) {
    throw new Error("Missing DYNAMIC_PLAN prompt section in monolithic-dynamic prompt profile");
  }
  const renderedPlanOutput = await loadAndRenderSection(
    "monolithic-dynamic",
    `STRUCTURED_OUTPUT_${understandProvider.toUpperCase()}`,
    {},
  );
  const planPrompt = renderedPlan.content + (renderedPlanOutput?.content || "");

  const maxSearchQueries = pipelineConfig?.planningMaxSearchQueries ?? 8;
  const planOutputSchema =
    understandProvider === "anthropic" ? DynamicPlanSchemaAnthropic : DynamicPlanSchema;
  const planResult = await generateText({
    model: understandModel.model,
    messages: [
      {
        role: "system",
        content: planPrompt,
        providerOptions: getPromptCachingOptions(pipelineConfig?.llmProvider),
      },
      { role: "user", content: textToAnalyze },
    ],
    temperature: getDeterministicTemperature(0.2, pipelineConfig),
    output: Output.object({ schema: planOutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(pipelineConfig?.llmProvider ?? "anthropic"),
  });
  recordLLMCall(budgetTracker, 2000);

  const plan = extractStructuredOutput(planResult);
  const plannedQueries = Array.isArray(plan?.searchQueries) ? plan.searchQueries : [];
  const queriesToRun = plannedQueries.slice(0, maxSearchQueries).length > 0
    ? plannedQueries.slice(0, maxSearchQueries)
    : [`claim verification: ${textToAnalyze.slice(0, 100)}`];

  // Step 2: Research phase - gather sources
  const sourceContents: Array<{ url: string; title: string; content: string }> = [];

  for (const query of queriesToRun) {
    if (searchCount >= dynamicBudget.maxSearches) break;
    if (Date.now() - startTime > dynamicBudget.timeoutMs) break;

    if (!searchConfig.enabled) {
      console.warn("[Analyzer] Search disabled (UCM search.enabled=false) - skipping web search");
      break;
    }

    searchCount++;
    searchQueries.push(query);

    if (input.onEvent) {
      await input.onEvent(`Searching: "${query.slice(0, 40)}..."`, 20 + searchCount * 8);
    }

    try {
      const response = await searchWebWithProvider({
        query,
        maxResults: searchConfig.maxResults,
        domainWhitelist: searchConfig.domainWhitelist,
        domainBlacklist: searchConfig.domainBlacklist,
        dateRestrict: searchConfig.dateRestrict ?? undefined,
        timeoutMs: searchConfig.timeoutMs,
        config: searchConfig,
      });

      // Capture search provider errors as warnings AND report to circuit breaker
      if (response.errors && response.errors.length > 0) {
        for (const provErr of response.errors) {
          // Report to circuit breaker so health banner can trip
          recordSearchFailure(provErr.provider, provErr.message);

          // Deduplicate warnings: only warn once per provider
          const alreadyWarned = warnings.some(
            (w) => w.type === "search_provider_error" && w.details?.provider === provErr.provider,
          );
          if (!alreadyWarned) {
            warnings.push({
              type: "search_provider_error",
              severity: "error",
              message: `Search provider "${provErr.provider}" failed: ${provErr.message}`,
              details: { provider: provErr.provider, status: provErr.status },
            });
            // Emit to live events log
            if (input.onEvent) {
              await input.onEvent(`Search provider "${provErr.provider}" error: ${provErr.message}`, 0);
            }
          }
        }
      }

      const maxSourcesToFetch = Math.min(
        searchConfig.maxSourcesPerIteration,
        Math.max(0, dynamicBudget.maxFetches - fetchCount),
      );

      // v2.6.35: Collect URLs for source reliability prefetch
      const urlsToFetch = response.results
        .slice(0, maxSourcesToFetch)
        .filter((r) => !citations.some((c) => c.url === r.url))
        .map((r) => r.url);

      // Prefetch source reliability before fetching
      if (SR_CONFIG.enabled && urlsToFetch.length > 0) {
        const domains = urlsToFetch.map((u) => {
          try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
        });
        const uniqueDomains = [...new Set(domains)];
        if (input.onEvent) {
          const preview = uniqueDomains.length <= 3
            ? uniqueDomains.join(", ")
            : `${uniqueDomains.slice(0, 3).join(", ")} +${uniqueDomains.length - 3} more`;
          await input.onEvent(`📊 Checking source reliability: ${preview}`, 25 + searchCount * 8);
        }
        await prefetchSourceReliability(urlsToFetch);
      }

      // Fetch top results
      for (const result of response.results.slice(0, maxSourcesToFetch)) {
        if (fetchCount >= dynamicBudget.maxFetches) break;
        if (citations.some((c) => c.url === result.url)) continue;

        fetchCount++;

        try {
          const content = await extractTextFromUrl(result.url, {
            timeoutMs: 12000,
            maxLength: 15000,
            pdfParseTimeoutMs:
              pipelineConfig?.pdfParseTimeoutMs ?? DEFAULT_PIPELINE_CONFIG.pdfParseTimeoutMs,
          });

          // v2.6.35: Get source reliability data
          const reliabilityData = getTrackRecordData(result.url);

          citations.push({
            url: result.url,
            title: content.title || result.title,
            excerpt: content.text.slice(0, 300),
            accessedAt: new Date().toISOString(),
            trackRecordScore: reliabilityData?.score ?? null,
            trackRecordConfidence: reliabilityData?.confidence ?? null,
            trackRecordConsensus: reliabilityData?.consensusAchieved ?? null,
          });

          sourceContents.push({
            url: result.url,
            title: content.title || result.title,
            content: content.text,
          });
        } catch {
          // Skip failed fetches
        }
      }
    } catch (err) {
      console.error(`Search failed for "${query}":`, err);
    }
  }

  // Post-research quality warnings
  const totalSearches = searchQueries.length;
  const totalSources = citations.length;
  const uniqueSourceUrls = new Set(citations.map((c) => c.url)).size;

  if (totalSources === 0) {
    warnings.push({
      type: "no_successful_sources",
      severity: "error",
      message: "No sources were successfully fetched during research — verdict is based on zero evidence.",
      details: { searchQueries: totalSearches },
    });
    if (totalSearches >= 3) {
      warnings.push({
        type: "source_acquisition_collapse",
        severity: "error",
        message: `${totalSearches} search queries were executed but yielded zero usable sources — search providers may be unavailable.`,
        details: { searchQueries: totalSearches },
      });
    }
  } else {
    if (totalSources < 3) {
      warnings.push({
        type: "low_source_count",
        severity: "warning",
        message: `Only ${totalSources} source(s) fetched — verdict reliability is reduced.`,
        details: { sourceCount: totalSources },
      });
    }
    if (uniqueSourceUrls < 2) {
      warnings.push({
        type: "low_source_count",
        severity: "warning",
        message: `Evidence comes from only ${uniqueSourceUrls} unique source(s) — limited triangulation possible.`,
        details: { uniqueSources: uniqueSourceUrls },
      });
    }
  }

  // Step 3: Dynamic analysis with collected sources
  if (input.onEvent) {
    await input.onEvent("Generating dynamic analysis", 70);
  }

  const sourceSummary =
    sourceContents.length > 0
      ? sourceContents
          .map((s, i) => `[Source ${i + 1}] ${s.title}\nURL: ${s.url}\n\n${s.content.slice(0, 4000)}`)
          .join("\n\n---\n\n")
      : "No external sources were successfully retrieved.";

  const verdictModel = getModelForTask("verdict", undefined, pipelineConfig ?? undefined);
  const verdictProvider = detectProvider(verdictModel.modelName || "");
  const dynamicOutputSchema = verdictProvider === "anthropic"
    ? DynamicAnalysisSchemaAnthropic
    : DynamicAnalysisSchema;
  const renderedAnalysis = await loadAndRenderSection("monolithic-dynamic", "DYNAMIC_ANALYSIS", {
    currentDate,
  });
  if (!renderedAnalysis?.content?.trim()) {
    throw new Error("Missing DYNAMIC_ANALYSIS prompt section in monolithic-dynamic prompt profile");
  }
  const renderedAnalysisOutput = await loadAndRenderSection(
    "monolithic-dynamic",
    `STRUCTURED_OUTPUT_${verdictProvider.toUpperCase()}`,
    {},
  );
  const dynamicAnalysisPrompt = renderedAnalysis.content + (renderedAnalysisOutput?.content || "");
  const renderedDynamicUser = await loadAndRenderSection("monolithic-dynamic", "DYNAMIC_ANALYSIS_USER", {
    TEXT_TO_ANALYZE: textToAnalyze,
    SOURCE_SUMMARY: sourceSummary,
  });
  if (!renderedDynamicUser?.content?.trim()) {
    throw new Error("Missing DYNAMIC_ANALYSIS_USER prompt section in monolithic-dynamic prompt profile");
  }

  const analysisResult = await generateText({
    model: verdictModel.model,
    messages: [
      {
        role: "system",
        content: dynamicAnalysisPrompt,
        providerOptions: getPromptCachingOptions(pipelineConfig?.llmProvider),
      },
      {
        role: "user",
        content: renderedDynamicUser.content,
      },
    ],
    temperature: getDeterministicTemperature(0.15, pipelineConfig),
    output: Output.object({ schema: dynamicOutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(pipelineConfig?.llmProvider ?? "anthropic"),
  });
  recordLLMCall(budgetTracker, 4000);

  const analysis = extractStructuredOutput(analysisResult);

  if (!analysis) {
    throw new Error("Failed to generate analysis. Falling back to orchestrated pipeline.");
  }

  // Step 4: Harden with Provenance Validation
  // Preserve original accessedAt timestamps (Bug fix: don't lose fetch times)
  const citationTimestamps = new Map<string, string>();
  for (const c of citations) {
    citationTimestamps.set(c.url, c.accessedAt);
  }

  const citationsAsEvidenceItems: EvidenceItem[] = citations.map((c, i) => ({
    id: `C${i + 1}`,
    statement: c.excerpt,
    sourceId: `S${i + 1}`,
    sourceUrl: c.url,
    sourceTitle: c.title,
    sourceExcerpt: c.excerpt,
    category: "evidence",
    specificity: "medium",
    claimDirection: "neutral",
  }));

  // Validate citations have valid provenance (real URLs)
  const provenanceResult = filterEvidenceByProvenance(citationsAsEvidenceItems);

  // Preserve source reliability data from original citations
  const citationReliability = new Map<string, { score: number | null; confidence: number | null; consensus: boolean | null }>();
  for (const c of citations) {
    citationReliability.set(c.url, {
      score: c.trackRecordScore ?? null,
      confidence: c.trackRecordConfidence ?? null,
      consensus: c.trackRecordConsensus ?? null,
    });
  }

  const finalCitations: Citation[] = provenanceResult.validEvidenceItems.map((f) => {
    const reliability = citationReliability.get(f.sourceUrl);
    return {
      url: f.sourceUrl,
      title: f.sourceTitle,
      excerpt: f.sourceExcerpt,
      accessedAt: citationTimestamps.get(f.sourceUrl) || new Date().toISOString(),
      trackRecordScore: reliability?.score ?? null,
      trackRecordConfidence: reliability?.confidence ?? null,
      trackRecordConsensus: reliability?.consensus ?? null,
    };
  });

  // v2.6.35: Apply source reliability weighting to verdict
  let avgSourceReliabilityWeight = DEFAULT_UNKNOWN_SOURCE_SCORE;
  if (SR_CONFIG.enabled && finalCitations.length > 0) {
    const reliabilityWeights = finalCitations.map((c) => {
      if (c.trackRecordScore !== null && c.trackRecordScore !== undefined) {
        return calculateEffectiveWeight({
          score: c.trackRecordScore,
          confidence: c.trackRecordConfidence ?? 0.7,
          consensusAchieved: c.trackRecordConsensus ?? false,
        });
      }
      // Unknown source: use default with low confidence
      return calculateEffectiveWeight({
        score: DEFAULT_UNKNOWN_SOURCE_SCORE,
        confidence: 0.5,
        consensusAchieved: false,
      });
    });
    avgSourceReliabilityWeight = reliabilityWeights.reduce((a, b) => a + b, 0) / reliabilityWeights.length;
    console.log(`[MonolithicDynamic] Source reliability avg weight: ${(avgSourceReliabilityWeight * 100).toFixed(1)}% from ${finalCitations.length} citations`);
  }

  // Apply weighting to verdict if present
  let adjustedVerdictScore = analysis.verdict?.score ?? 50;
  let adjustedVerdictConfidence = analysis.verdict?.confidence ?? 50;
  if (SR_CONFIG.enabled && analysis.verdict) {
    const originalScore = analysis.verdict.score ?? 50;
    const originalConfidence = analysis.verdict.confidence ?? 50;
    // Pull verdict toward neutral (50) based on source reliability
    adjustedVerdictScore = Math.round(50 + (originalScore - 50) * avgSourceReliabilityWeight);
    // Scale confidence by reliability
    adjustedVerdictConfidence = Math.round(originalConfidence * (0.5 + avgSourceReliabilityWeight / 2));
  }

  // Build result with safety contract
  const analysisTimeMs = Date.now() - startTime;
  const budgetStats = getBudgetStats(budgetTracker, budgetConfig);

  const resultJson = {
    _schemaVersion: "2.7.0",
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: "dynamic",
      pipelineVariant: "monolithic_dynamic",
      isExperimental: false,
      llmProvider: verdictModel.provider,
      llmModel: verdictModel.modelName,
      searchProvider: searchConfig.provider,
      inputType: input.inputType,
      inputLength: input.inputValue.length,
      analysisTimeMs,
      analysisId: input.jobId || `dyn-${Date.now()}`,
      dynamicStats: {
        searches: searchCount,
        maxSearches: dynamicBudget.maxSearches,
        fetches: fetchCount,
        maxFetches: dynamicBudget.maxFetches,
        citationsCollected: finalCitations.length,
      },
      budgetStats: {
        tokensUsed: budgetStats.tokensUsed,
        tokensPercent: budgetStats.tokensPercent,
        llmCalls: budgetStats.llmCalls,
        budgetExceeded: budgetStats.budgetExceeded,
      },
    },

    // Safety contract: always include citations and rawJson
    citations: finalCitations,
    rawJson: analysis,

    // Dynamic analysis fields
    summary: analysis.summary || "Analysis completed",
    verdict: analysis.verdict
      ? {
          ...analysis.verdict,
          // v2.6.35: Use source reliability adjusted scores
          score: adjustedVerdictScore,
          confidence: adjustedVerdictConfidence,
          // v2.10.2: Standardize verdict labels to avoid non-canonical values (e.g., "Context Needed")
          label: percentageToArticleVerdict(adjustedVerdictScore, adjustedVerdictConfidence),
          // Preserve original for transparency
          originalScore: analysis.verdict.score ?? 50,
          originalConfidence: analysis.verdict.confidence ?? 50,
        }
      : null,
    findings: analysis.findings || [],
    methodology: analysis.methodology || plan?.analysisApproach || "Dynamic analysis",
    limitations: analysis.limitations || [
      "This is a streamlined analysis — for comprehensive analysis, use the ClaimAssessmentBoundary pipeline",
      "Results should be independently verified",
    ],
    searchQueries: searchQueries,

    // v2.6.35: Source reliability metadata
    sourceReliability: {
      enabled: SR_CONFIG.enabled,
      avgWeight: avgSourceReliabilityWeight,
      knownSources: finalCitations.filter((c) => c.trackRecordScore !== null).length,
      unknownSources: finalCitations.filter((c) => c.trackRecordScore === null).length,
    },

    // Analysis quality warnings (surfaced to UI via FallbackReport)
    analysisWarnings: warnings,

    // Compatibility layer for UI (minimal canonical fields)
    verdictSummary: analysis.verdict
      ? {
          // v2.6.35: Use adjusted scores
          overallVerdict: adjustedVerdictScore,
          overallConfidence: adjustedVerdictConfidence,
          // v2.10.2: Use standardized verdict label based on score, not LLM-generated label
          // This fixes "Context Needed" and other non-standard labels being displayed
          verdictLabel: percentageToArticleVerdict(adjustedVerdictScore, adjustedVerdictConfidence),
          summary: analysis.summary,
          hasContestedFactors: false,
          isExperimental: false,
          // v2.6.35: Include source reliability weight
          sourceReliabilityWeight: avgSourceReliabilityWeight,
        }
      : {
          overallVerdict: 50,
          overallConfidence: 30,
          verdictLabel: "UNVERIFIED",
          summary: analysis.summary,
          hasContestedFactors: false,
          isExperimental: false,
          sourceReliabilityWeight: avgSourceReliabilityWeight,
        },
  };

  // Generate report markdown
  const reportMarkdown = generateDynamicReportMarkdown(resultJson);

  if (input.onEvent) {
    await input.onEvent("Analysis complete", 100);
  }

  return { resultJson, reportMarkdown };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateDynamicReportMarkdown(result: any): string {
  let report = `# FactHarbor Dynamic Analysis Report

> This analysis uses a fast, streamlined methodology.
> For comprehensive multi-iteration analysis, use the ClaimAssessmentBoundary pipeline.

## Summary

${result.summary}

`;

  if (result.verdict) {
    report += `## Verdict: ${result.verdict.label}

`;
    if (result.verdict.score !== undefined) {
      report += `**Score:** ${result.verdict.score}%\n`;
    }
    if (result.verdict.confidence !== undefined) {
      report += `**Confidence:** ${result.verdict.confidence}%\n`;
    }
    if (result.verdict.reasoning) {
      report += `\n${result.verdict.reasoning}\n`;
    }
    report += "\n";
  }

  if (result.findings && result.findings.length > 0) {
    report += `## Key Findings

`;
    for (const finding of result.findings) {
      const supportIcon =
        finding.support === "strong"
          ? "🟢"
          : finding.support === "moderate"
            ? "🟡"
            : finding.support === "weak"
              ? "🟠"
              : "🔴";
      report += `${supportIcon} **${finding.support.toUpperCase()}**: ${finding.point}\n`;
      if (finding.sources && finding.sources.length > 0) {
        report += `   _Sources: ${finding.sources.join(", ")}_\n`;
      }
      if (finding.notes) {
        report += `   _Note: ${finding.notes}_\n`;
      }
      report += "\n";
    }
  }

  if (result.methodology) {
    report += `## Methodology

${result.methodology}

`;
  }

  if (result.limitations && result.limitations.length > 0) {
    report += `## Limitations

`;
    for (const limitation of result.limitations) {
      report += `- ${limitation}\n`;
    }
    report += "\n";
  }

  report += `## Citations (${result.citations.length})

`;
  for (const citation of result.citations) {
    report += `- [${citation.title}](${citation.url})\n`;
  }

  report += `
---
_Generated by FactHarbor Dynamic Pipeline v${result.meta.schemaVersion}_
_Analysis time: ${(result.meta.analysisTimeMs / 1000).toFixed(1)}s_
_Dynamic Pipeline — fast, streamlined analysis_
`;

  return report;
}
