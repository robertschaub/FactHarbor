/**
 * Monolithic Dynamic Pipeline (PR 4)
 *
 * Experimental single-context analysis that produces flexible/dynamic output.
 * Unlike the canonical pipeline, this allows the LLM more freedom in structuring
 * the analysis while maintaining minimum safety contracts.
 *
 * Key features:
 * - Flexible output structure (not bound to canonical schema)
 * - Minimum safety contract: citations[], rawJson always stored
 * - Budget enforcement (maxIterations, maxSearches, timeout)
 * - "Experimental" labeling in UI
 * - Full citation provenance tracking
 *
 * @module analyzer/monolithic-dynamic
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, getModelForTask } from "./llm";
import { CONFIG, getDeterministicTemperature } from "./config";
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_SR_CONFIG } from "@/lib/config-schemas";
import { filterFactsByProvenance, setProvenanceLexicon } from "./provenance-validation";
import type { ExtractedFact } from "./types";
import {
  createBudgetTracker,
  getBudgetConfig,
  recordLLMCall,
  getBudgetStats,
} from "./budgets";
import { searchWebWithProvider } from "../web-search";
import { extractTextFromUrl } from "../retrieval";
import { buildPrompt, detectProvider, isBudgetModel } from "./prompts/prompt-builder";
import { loadPromptFile, type Pipeline } from "./prompt-loader";
import { getConfig, recordConfigUsage } from "@/lib/config-storage";
import { loadPipelineConfig, loadSearchConfig } from "@/lib/config-loader";
import { setAggregationLexicon } from "./aggregation";
import { setContextHeuristicsLexicon } from "./scopes";
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
  timeoutMs: 150_000, // 2.5 minutes (slightly shorter for experimental)
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
 * Run fact-check analysis using a dynamic/experimental approach.
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
  const budgetConfig = getBudgetConfig(pipelineConfig);
  const budgetTracker = createBudgetTracker();

  let evidenceLexicon;
  let aggregationLexicon;
  let srConfig = DEFAULT_SR_CONFIG;
  try {
    const [evidenceResult, aggregationResult, srResult] = await Promise.all([
      getConfig("evidence-lexicon", "default", { jobId: input.jobId }),
      getConfig("aggregation-lexicon", "default", { jobId: input.jobId }),
      getConfig("sr", "default", { jobId: input.jobId }),
    ]);
    evidenceLexicon = evidenceResult.config;
    aggregationLexicon = aggregationResult.config;
    srConfig = srResult.config;
  } catch (err) {
    console.warn(
      "[Config] Failed to load lexicon configs, using defaults:",
      err instanceof Error ? err.message : String(err),
    );
  }

  setProvenanceLexicon(evidenceLexicon);
  setAggregationLexicon(aggregationLexicon);
  setContextHeuristicsLexicon(aggregationLexicon);
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
  let searchCount = 0;
  let fetchCount = 0;
  // v2.6.35: Track URLs for source reliability prefetch
  const urlsForReliability: string[] = [];

  if (input.onEvent) {
    await input.onEvent("Starting experimental dynamic analysis", 5);
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
  const planPrompt = buildPrompt({
    task: 'dynamic_plan',
    provider: detectProvider(understandModel.modelName || ''),
    modelName: understandModel.modelName || '',
    config: {
      allowModelKnowledge: pipelineConfig.allowModelKnowledge,
      isLLMTiering: pipelineConfig.llmTiering,
      isBudgetModel: isBudgetModel(understandModel.modelName || ''),
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
    },
  });

  const planResult = await generateText({
    model: understandModel.model,
    messages: [
      {
        role: "system",
        content: planPrompt,
      },
      { role: "user", content: textToAnalyze },
    ],
    temperature: getDeterministicTemperature(0.2, pipelineConfig),
    output: Output.object({
      schema: z.object({
        keyQuestions: z.array(z.string()).describe("Main questions to investigate"),
        searchQueries: z.array(z.string()).min(3).max(5),
        analysisApproach: z.string().describe("Recommended approach for this content"),
      }),
    }),
  });
  recordLLMCall(budgetTracker, 2000);

  const plan = extractStructuredOutput(planResult);
  const queriesToRun = plan?.searchQueries || [`fact check: ${textToAnalyze.slice(0, 100)}`];

  // Step 2: Research phase - gather sources
  const sourceContents: Array<{ url: string; title: string; content: string }> = [];

  for (const query of queriesToRun) {
    if (searchCount >= DYNAMIC_BUDGET.maxSearches) break;
    if (Date.now() - startTime > DYNAMIC_BUDGET.timeoutMs) break;

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

      const maxSourcesToFetch = Math.min(
        searchConfig.maxSourcesPerIteration,
        Math.max(0, DYNAMIC_BUDGET.maxFetches - fetchCount),
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
        if (fetchCount >= DYNAMIC_BUDGET.maxFetches) break;
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
  const dynamicAnalysisPrompt = buildPrompt({
    task: 'dynamic_analysis',
    provider: detectProvider(verdictModel.modelName || ''),
    modelName: verdictModel.modelName || '',
    config: {
      allowModelKnowledge: pipelineConfig.allowModelKnowledge,
      isLLMTiering: pipelineConfig.llmTiering,
      isBudgetModel: isBudgetModel(verdictModel.modelName || ''),
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
      textToAnalyze,
      sourceSummary,
    },
  });

  const analysisResult = await generateText({
    model: verdictModel.model,
    messages: [
      {
        role: "system",
        content: dynamicAnalysisPrompt,
      },
      {
        role: "user",
        content: `CONTENT TO ANALYZE:
${textToAnalyze}

RESEARCH SOURCES:
${sourceSummary}

Provide your dynamic analysis.`,
      },
    ],
    temperature: getDeterministicTemperature(0.15, pipelineConfig),
    output: Output.object({ schema: DynamicAnalysisSchema }),
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

  const citationsAsFacts: ExtractedFact[] = citations.map((c, i) => ({
    id: `C${i + 1}`,
    fact: c.excerpt,
    sourceId: `S${i + 1}`,
    sourceUrl: c.url,
    sourceTitle: c.title,
    sourceExcerpt: c.excerpt,
    category: "evidence",
    specificity: "medium",
    claimDirection: "neutral",
  }));

  // Validate citations have valid provenance (real URLs)
  const provenanceResult = filterFactsByProvenance(citationsAsFacts);

  // Preserve source reliability data from original citations
  const citationReliability = new Map<string, { score: number | null; confidence: number | null; consensus: boolean | null }>();
  for (const c of citations) {
    citationReliability.set(c.url, {
      score: c.trackRecordScore ?? null,
      confidence: c.trackRecordConfidence ?? null,
      consensus: c.trackRecordConsensus ?? null,
    });
  }

  const finalCitations: Citation[] = provenanceResult.validFacts.map((f) => {
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
      isExperimental: true,
      llmProvider: verdictModel.provider,
      llmModel: verdictModel.modelName,
      searchProvider: searchConfig.provider,
      inputType: input.inputType,
      inputLength: input.inputValue.length,
      analysisTimeMs,
      analysisId: input.jobId || `dyn-${Date.now()}`,
      dynamicStats: {
        searches: searchCount,
        maxSearches: DYNAMIC_BUDGET.maxSearches,
        fetches: fetchCount,
        maxFetches: DYNAMIC_BUDGET.maxFetches,
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
    verdict: analysis.verdict ? {
      ...analysis.verdict,
      // v2.6.35: Use source reliability adjusted scores
      score: adjustedVerdictScore,
      confidence: adjustedVerdictConfidence,
      // Preserve original for transparency
      originalScore: analysis.verdict.score ?? 50,
      originalConfidence: analysis.verdict.confidence ?? 50,
    } : null,
    findings: analysis.findings || [],
    methodology: analysis.methodology || plan?.analysisApproach || "Dynamic experimental analysis",
    limitations: analysis.limitations || [
      "This is an experimental analysis mode",
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

    // Compatibility layer for UI (minimal canonical fields)
    verdictSummary: analysis.verdict
      ? {
          // v2.6.35: Use adjusted scores
          overallVerdict: adjustedVerdictScore,
          overallConfidence: adjustedVerdictConfidence,
          verdictLabel: analysis.verdict.label,
          summary: analysis.summary,
          hasContestedFactors: false,
          isExperimental: true,
          // v2.6.35: Include source reliability weight
          sourceReliabilityWeight: avgSourceReliabilityWeight,
        }
      : {
          overallVerdict: 50,
          overallConfidence: 30,
          verdictLabel: "Experimental Analysis",
          summary: analysis.summary,
          hasContestedFactors: false,
          isExperimental: true,
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

> ⚠️ **EXPERIMENTAL**: This analysis uses a flexible, experimental methodology.
> Results should be independently verified.

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
_This is an experimental analysis mode_
`;

  return report;
}
