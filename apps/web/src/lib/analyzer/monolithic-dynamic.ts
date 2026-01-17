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
import { filterFactsByProvenance } from "./provenance-validation";
import type { ExtractedFact } from "./types";
import {
  createBudgetTracker,
  getBudgetConfig,
  recordLLMCall,
  getBudgetStats,
} from "./budgets";
import { searchWebWithProvider } from "../web-search";
import { extractTextFromUrl } from "../retrieval";

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
      score: z.number().min(0).max(100).optional().describe("Optional truth score 0-100"),
      confidence: z.number().min(0).max(100).optional().describe("Optional confidence level"),
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
  const budgetConfig = getBudgetConfig();
  const budgetTracker = createBudgetTracker();

  // Collected citations (safety contract)
  const citations: Citation[] = [];
  const searchQueries: string[] = [];
  let searchCount = 0;
  let fetchCount = 0;

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

  const understandModel = getModelForTask("understand");
  const planResult = await generateText({
    model: understandModel.model,
    messages: [
      {
        role: "system",
        content: `You are an experimental fact-checking assistant. Analyze the input and determine:
1. What are the key claims or questions to investigate?
2. What search queries would help verify or contextualize this information?
3. What type of analysis approach is most appropriate?

Generate 3-5 search queries that will help investigate this from multiple angles.
Be creative - include queries that might find contradicting evidence.`,
      },
      { role: "user", content: textToAnalyze },
    ],
    temperature: getDeterministicTemperature(0.2),
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

    searchCount++;
    searchQueries.push(query);

    if (input.onEvent) {
      await input.onEvent(`Searching: "${query.slice(0, 40)}..."`, 20 + searchCount * 8);
    }

    try {
      const response = await searchWebWithProvider({
        query,
        maxResults: 4,
        domainWhitelist: CONFIG.searchDomainWhitelist ?? undefined,
        dateRestrict: CONFIG.searchDateRestrict ?? undefined,
      });

      // Fetch top results
      for (const result of response.results.slice(0, 2)) {
        if (fetchCount >= DYNAMIC_BUDGET.maxFetches) break;
        if (citations.some((c) => c.url === result.url)) continue;

        fetchCount++;

        try {
          const content = await extractTextFromUrl(result.url, {
            timeoutMs: 12000,
            maxLength: 15000,
          });

          citations.push({
            url: result.url,
            title: content.title || result.title,
            excerpt: content.text.slice(0, 300),
            accessedAt: new Date().toISOString(),
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

  const verdictModel = getModelForTask("verdict");
  const analysisResult = await generateText({
    model: verdictModel.model,
    messages: [
      {
        role: "system",
        content: `You are an experimental fact-checking assistant. Provide a comprehensive, flexible analysis.

Your analysis should:
1. Summarize what you found
2. Provide a verdict if appropriate (or explain why one isn't possible)
3. List key findings with their level of evidence support
4. Note any methodology or limitations
5. Reference specific sources by their URL

Be honest about uncertainty. If something can't be verified, say so.
This is an experimental analysis mode - prioritize insight over rigid structure.`,
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
    temperature: getDeterministicTemperature(0.15),
    output: Output.object({ schema: DynamicAnalysisSchema }),
  });
  recordLLMCall(budgetTracker, 4000);

  const analysis = extractStructuredOutput(analysisResult);

  if (!analysis) {
    throw new Error("Failed to generate analysis. Falling back to orchestrated pipeline.");
  }

  // Step 4: Harden with Provenance Validation
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

  const finalCitations: Citation[] = provenanceResult.validFacts.map((f) => ({
    url: f.sourceUrl,
    title: f.sourceTitle,
    excerpt: f.sourceExcerpt,
    accessedAt: new Date().toISOString(),
  }));

  // Build result with safety contract
  const analysisTimeMs = Date.now() - startTime;
  const budgetStats = getBudgetStats(budgetTracker, budgetConfig);

  const resultJson = {
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: "dynamic",
      pipelineVariant: "monolithic_dynamic",
      isExperimental: true,
      llmProvider: verdictModel.provider,
      llmModel: verdictModel.modelName,
      searchProvider: CONFIG.searchProvider,
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
    verdict: analysis.verdict || null,
    findings: analysis.findings || [],
    methodology: analysis.methodology || plan?.analysisApproach || "Dynamic experimental analysis",
    limitations: analysis.limitations || [
      "This is an experimental analysis mode",
      "Results should be independently verified",
    ],
    searchQueries: searchQueries,

    // Compatibility layer for UI (minimal canonical fields)
    verdictSummary: analysis.verdict
      ? {
          overallVerdict: analysis.verdict.score ?? 50,
          overallConfidence: analysis.verdict.confidence ?? 40,
          verdictLabel: analysis.verdict.label,
          summary: analysis.summary,
          hasContestedFactors: false,
          isExperimental: true,
        }
      : {
          overallVerdict: 50,
          overallConfidence: 30,
          verdictLabel: "Experimental Analysis",
          summary: analysis.summary,
          hasContestedFactors: false,
          isExperimental: true,
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
