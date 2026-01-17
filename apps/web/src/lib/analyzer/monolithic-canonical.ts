/**
 * Monolithic Canonical Pipeline (PR 3)
 *
 * Single-context analysis that produces output conforming to the
 * canonical FactHarbor schema. Uses iterative structured output calls
 * to perform research and generate verdicts.
 *
 * Key features:
 * - Budget enforcement (maxIterations, maxSearches, timeout)
 * - Canonical schema validation
 * - Full UI compatibility with orchestrated pipeline
 * - Automatic fallback on failure
 *
 * @module analyzer/monolithic-canonical
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel } from "./llm";
import { CONFIG, getDeterministicTemperature } from "./config";
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

/** Budget configuration specific to monolithic pipeline */
interface MonolithicBudget {
  maxIterations: number;
  maxSearches: number;
  maxFetches: number;
  timeoutMs: number;
}

/** Fact collected during research */
interface ExtractedFact {
  id: string;
  fact: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  category: string;
  claimDirection: "supports" | "contradicts" | "neutral";
}

/** Source fetched during research */
interface FetchedSource {
  url: string;
  title: string;
  snippet: string;
  fetchedAt: string;
  contentLength: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MONOLITHIC_BUDGET: MonolithicBudget = {
  maxIterations: 5,
  maxSearches: 8,
  maxFetches: 10,
  timeoutMs: 180_000, // 3 minutes
};

// ============================================================================
// SCHEMAS
// ============================================================================

const ClaimExtractionSchema = z.object({
  mainClaim: z.string().describe("The primary factual claim to verify"),
  claimType: z.enum(["factual", "opinion", "prediction", "mixed"]),
  searchQueries: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Search queries to find evidence (include both supporting and contradicting)"),
});

const FactExtractionSchema = z.object({
  facts: z.array(
    z.object({
      fact: z.string().describe("The factual statement extracted"),
      sourceUrl: z.string(),
      sourceTitle: z.string(),
      excerpt: z.string().describe("Relevant quote from source (50-200 chars)"),
      category: z.enum([
        "evidence",
        "expert_quote",
        "statistic",
        "event",
        "legal_provision",
        "criticism",
      ]),
      direction: z.enum(["supports", "contradicts", "neutral"]),
    })
  ),
  needsMoreResearch: z.boolean().describe("True if more searches would help"),
  suggestedQuery: z.string().optional().describe("Next search query if more research needed"),
});

const VerdictSchema = z.object({
  claim: z.string().describe("The claim being evaluated"),
  verdict: z.number().min(0).max(100).describe("Truth percentage (0=false, 50=mixed, 100=true)"),
  confidence: z.number().min(0).max(100).describe("Confidence in the verdict"),
  reasoning: z.string().describe("Detailed reasoning for the verdict (2-4 sentences)"),
  summary: z.string().describe("One-sentence summary"),
  keyFactIds: z.array(z.string()).describe("IDs of most important facts"),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely extract structured output from AI SDK result
 */
function extractStructuredOutput(result: any): any {
  if (!result) return null;

  // Try various paths where output might be
  if (result.output?.value !== undefined) return result.output.value;
  if (result.output !== undefined && typeof result.output !== "function") return result.output;
  if (result._output !== undefined) return result._output;
  if (result.experimental_output !== undefined) return result.experimental_output;
  if (result.object !== undefined) return result.object;

  return null;
}

/**
 * Extract claim and generate search queries
 */
async function extractClaim(
  model: any,
  text: string,
  onEvent?: (msg: string, progress: number) => void | Promise<void>
): Promise<z.infer<typeof ClaimExtractionSchema>> {
  if (onEvent) await onEvent("Analyzing claim", 10);

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: `You are a fact-checking assistant. Extract the main factual claim from the input and generate search queries to verify it.

Generate search queries that:
1. Look for sources that might SUPPORT the claim
2. Look for sources that might CONTRADICT the claim
3. Look for neutral/context information

Return a JSON object with mainClaim, claimType, and searchQueries array.`,
      },
      { role: "user", content: text },
    ],
    temperature: getDeterministicTemperature(0.1),
    output: Output.object({ schema: ClaimExtractionSchema }),
  });

  const output = extractStructuredOutput(result);
  return ClaimExtractionSchema.parse(output);
}

/**
 * Extract facts from source content
 */
async function extractFacts(
  model: any,
  claim: string,
  sourceContents: Array<{ url: string; title: string; content: string }>,
  existingFactCount: number,
  onEvent?: (msg: string, progress: number) => void | Promise<void>
): Promise<z.infer<typeof FactExtractionSchema>> {
  if (onEvent) await onEvent("Extracting facts from sources", 40);

  const sourceSummary = sourceContents
    .map((s, i) => `[Source ${i + 1}] ${s.title}\nURL: ${s.url}\n\n${s.content.slice(0, 5000)}`)
    .join("\n\n---\n\n");

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: `You are a fact-checking assistant. Extract relevant facts from sources that relate to verifying a claim.

For each fact:
- State the fact clearly and specifically
- Include the source URL and title
- Provide a brief excerpt (50-200 chars) that contains the fact
- Categorize it (evidence, expert_quote, statistic, event, legal_provision, criticism)
- Indicate if it supports, contradicts, or is neutral to the claim

Extract 3-8 facts. Focus on the most relevant and authoritative information.
If you have ${existingFactCount} facts already and more research would help, set needsMoreResearch=true.`,
      },
      {
        role: "user",
        content: `CLAIM TO VERIFY: ${claim}\n\nSOURCES:\n${sourceSummary}`,
      },
    ],
    temperature: getDeterministicTemperature(0.1),
    output: Output.object({ schema: FactExtractionSchema }),
  });

  const output = extractStructuredOutput(result);
  return FactExtractionSchema.parse(output);
}

/**
 * Generate final verdict
 */
async function generateVerdict(
  model: any,
  claim: string,
  facts: ExtractedFact[],
  onEvent?: (msg: string, progress: number) => void | Promise<void>
): Promise<z.infer<typeof VerdictSchema>> {
  if (onEvent) await onEvent("Generating verdict", 80);

  const factsSummary = facts
    .map(
      (f) =>
        `[${f.id}] ${f.claimDirection.toUpperCase()}: ${f.fact}\n   Category: ${f.category}\n   Source: ${f.sourceTitle}`
    )
    .join("\n\n");

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: `You are a fact-checking assistant. Based on the collected evidence, provide a verdict on the claim.

Verdict scale:
- 0-20: False/Mostly False
- 20-40: Mostly False with some truth
- 40-60: Mixed/Uncertain/Contested
- 60-80: Mostly True with caveats
- 80-100: True/Mostly True

Confidence should reflect:
- Quality and reliability of sources
- Consistency of evidence
- Any gaps in verification

Reference specific fact IDs in your reasoning.`,
      },
      {
        role: "user",
        content: `CLAIM: ${claim}\n\nEVIDENCE (${facts.length} facts):\n${factsSummary}`,
      },
    ],
    temperature: getDeterministicTemperature(0.1),
    output: Output.object({ schema: VerdictSchema }),
  });

  const output = extractStructuredOutput(result);
  return VerdictSchema.parse(output);
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Run fact-check analysis using a monolithic approach with canonical schema output.
 */
export async function runMonolithicCanonical(
  input: MonolithicAnalysisInput
): Promise<{ resultJson: any; reportMarkdown: string }> {
  const startTime = Date.now();
  const { model, provider, modelName } = getModel();
  const budgetConfig = getBudgetConfig();
  const budgetTracker = createBudgetTracker();

  // State tracking
  const facts: ExtractedFact[] = [];
  const sources: FetchedSource[] = [];
  const searchQueries: string[] = [];
  let searchCount = 0;
  let fetchCount = 0;

  if (input.onEvent) {
    await input.onEvent("Starting monolithic analysis", 5);
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
        maxLength: 8000,
      });
      textToAnalyze = `URL: ${input.inputValue}\n\nTitle: ${urlContent.title}\n\nContent:\n${urlContent.text}`;
    } catch (err) {
      throw new Error(`Failed to fetch input URL: ${err}`);
    }
  }

  // Step 1: Extract claim and generate search queries
  const claimData = await extractClaim(model, textToAnalyze, input.onEvent);
  recordLLMCall(budgetTracker, 2000); // Estimate

  // Handle opinion/prediction claims
  if (claimData.claimType === "opinion" || claimData.claimType === "prediction") {
    // Return early with appropriate verdict
    const resultJson = buildResultJson({
      input,
      startTime,
      provider,
      modelName,
      budgetTracker,
      budgetConfig,
      claim: claimData.mainClaim,
      claimType: claimData.claimType,
      facts: [],
      sources: [],
      searchQueries: [],
      verdict: 50,
      confidence: 20,
      reasoning: `This appears to be ${claimData.claimType === "opinion" ? "an opinion" : "a prediction"} rather than a verifiable factual claim. Fact-checking is limited to verifiable factual statements.`,
      summary: `Cannot fact-check: ${claimData.claimType}`,
    });
    const reportMarkdown = generateReportMarkdown(resultJson, null);
    return { resultJson, reportMarkdown };
  }

  // Step 2: Research loop
  let iteration = 0;
  let needsMoreResearch = true;

  while (
    needsMoreResearch &&
    iteration < MONOLITHIC_BUDGET.maxIterations &&
    searchCount < MONOLITHIC_BUDGET.maxSearches &&
    Date.now() - startTime < MONOLITHIC_BUDGET.timeoutMs
  ) {
    iteration++;

    // Get queries for this iteration
    const queriesToRun =
      iteration === 1
        ? claimData.searchQueries.slice(0, 3)
        : facts.length > 0 && facts[facts.length - 1]
          ? [claimData.searchQueries[iteration] || `${claimData.mainClaim} evidence`]
          : claimData.searchQueries.slice(0, 2);

    // Run searches
    const searchResults: Array<{ url: string; title: string; snippet: string }> = [];

    for (const query of queriesToRun) {
      if (searchCount >= MONOLITHIC_BUDGET.maxSearches) break;

      searchCount++;
      searchQueries.push(query);

      if (input.onEvent) {
        await input.onEvent(`Searching: "${query.slice(0, 40)}..."`, 15 + iteration * 10);
      }

      try {
        const response = await searchWebWithProvider({
          query,
          maxResults: 4,
          domainWhitelist: CONFIG.searchDomainWhitelist ?? undefined,
          dateRestrict: CONFIG.searchDateRestrict ?? undefined,
        });
        searchResults.push(
          ...response.results.map((r) => ({
            url: r.url,
            title: r.title,
            snippet: r.snippet || "",
          }))
        );
      } catch (err) {
        console.error(`Search failed for "${query}":`, err);
      }
    }

    // Fetch top URLs
    const urlsToFetch = searchResults
      .filter((r) => !sources.some((s) => s.url === r.url))
      .slice(0, 3);

    const fetchedContents: Array<{ url: string; title: string; content: string }> = [];

    for (const result of urlsToFetch) {
      if (fetchCount >= MONOLITHIC_BUDGET.maxFetches) break;

      fetchCount++;

      if (input.onEvent) {
        await input.onEvent(`Fetching: ${new URL(result.url).hostname}`, 25 + iteration * 10);
      }

      try {
        const content = await extractTextFromUrl(result.url, {
          timeoutMs: 15000,
          maxLength: 20000,
        });

        sources.push({
          url: result.url,
          title: content.title || result.title,
          snippet: result.snippet,
          fetchedAt: new Date().toISOString(),
          contentLength: content.text.length,
        });

        fetchedContents.push({
          url: result.url,
          title: content.title || result.title,
          content: content.text,
        });
      } catch (err) {
        console.error(`Fetch failed for ${result.url}:`, err);
      }
    }

    // Extract facts from fetched content
    if (fetchedContents.length > 0) {
      try {
        const extraction = await extractFacts(
          model,
          claimData.mainClaim,
          fetchedContents,
          facts.length,
          input.onEvent
        );
        recordLLMCall(budgetTracker, 3000); // Estimate

        // Add new facts with IDs
        for (const f of extraction.facts) {
          facts.push({
            id: `F${facts.length + 1}`,
            fact: f.fact,
            sourceUrl: f.sourceUrl,
            sourceTitle: f.sourceTitle,
            sourceExcerpt: f.excerpt,
            category: f.category,
            claimDirection: f.direction,
          });
        }

        needsMoreResearch = extraction.needsMoreResearch && facts.length < 8;
      } catch (err) {
        console.error("Fact extraction failed:", err);
        needsMoreResearch = false;
      }
    } else {
      needsMoreResearch = false;
    }
  }

  // Step 3: Generate verdict
  if (facts.length === 0) {
    throw new Error("No facts could be extracted. Falling back to orchestrated pipeline.");
  }

  const verdictData = await generateVerdict(model, claimData.mainClaim, facts, input.onEvent);
  recordLLMCall(budgetTracker, 2000); // Estimate

  // Build result
  const resultJson = buildResultJson({
    input,
    startTime,
    provider,
    modelName,
    budgetTracker,
    budgetConfig,
    claim: claimData.mainClaim,
    claimType: claimData.claimType,
    facts,
    sources,
    searchQueries,
    verdict: verdictData.verdict,
    confidence: verdictData.confidence,
    reasoning: verdictData.reasoning,
    summary: verdictData.summary,
  });

  const reportMarkdown = generateReportMarkdown(resultJson, verdictData);

  if (input.onEvent) {
    await input.onEvent("Analysis complete", 100);
  }

  return { resultJson, reportMarkdown };
}

// ============================================================================
// RESULT BUILDING
// ============================================================================

function buildResultJson(params: {
  input: MonolithicAnalysisInput;
  startTime: number;
  provider: string;
  modelName: string;
  budgetTracker: any;
  budgetConfig: any;
  claim: string;
  claimType: string;
  facts: ExtractedFact[];
  sources: FetchedSource[];
  searchQueries: string[];
  verdict: number;
  confidence: number;
  reasoning: string;
  summary: string;
}): any {
  const {
    input,
    startTime,
    provider,
    modelName,
    budgetTracker,
    budgetConfig,
    claim,
    claimType,
    facts,
    sources,
    searchQueries,
    verdict,
    confidence,
    reasoning,
    summary,
  } = params;

  const analysisTimeMs = Date.now() - startTime;
  const budgetStats = getBudgetStats(budgetTracker, budgetConfig);
  const highlightColor = verdict >= 70 ? "green" : verdict >= 40 ? "yellow" : "red";

  return {
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: "monolithic",
      pipelineVariant: "monolithic_canonical",
      llmProvider: provider,
      llmModel: modelName,
      searchProvider: CONFIG.searchProvider,
      inputType: input.inputType,
      detectedInputType: input.inputType,
      hasMultipleProceedings: false,
      hasMultipleScopes: false,
      proceedingCount: 1,
      scopeCount: 1,
      isPseudoscience: false,
      inputLength: input.inputValue.length,
      analysisTimeMs,
      analysisId: input.jobId || `mono-${Date.now()}`,
      monolithicStats: {
        searches: searchQueries.length,
        maxSearches: MONOLITHIC_BUDGET.maxSearches,
        fetches: sources.length,
        maxFetches: MONOLITHIC_BUDGET.maxFetches,
        factsExtracted: facts.length,
      },
      budgetStats: {
        tokensUsed: budgetStats.tokensUsed,
        tokensPercent: budgetStats.tokensPercent,
        llmCalls: budgetStats.llmCalls,
        budgetExceeded: budgetStats.budgetExceeded,
      },
    },
    verdictSummary: {
      overallVerdict: verdict,
      overallConfidence: confidence,
      verdictLabel:
        verdict >= 80
          ? "True"
          : verdict >= 60
            ? "Mostly True"
            : verdict >= 40
              ? "Mixed"
              : verdict >= 20
                ? "Mostly False"
                : "False",
      summary,
      hasContestedFactors: false,
    },
    scopes: [
      {
        id: "CTX_MAIN",
        name: "Main Analysis",
        shortName: "Main",
        subject: claim,
        temporal: "",
        status: "concluded",
        outcome: summary,
        metadata: { claimType },
      },
    ],
    twoPanelSummary: {
      factharborAnalysis: {
        analysisId: input.jobId || `mono-${Date.now()}`,
        version: CONFIG.schemaVersion,
        verdictConfidence: confidence,
        centralClaimSummary: claim,
        factCheckSummary: reasoning,
        keyFindings: facts.slice(0, 5).map((f) => f.fact),
        overallVerdict: verdict,
      },
    },
    claimVerdicts: [
      {
        claimId: "C1",
        claimText: claim,
        isCentral: true,
        centrality: "high",
        verdict,
        truthPercentage: verdict,
        confidence,
        riskTier: confidence >= 70 ? "A" : confidence >= 40 ? "B" : "C",
        reasoning,
        supportingFactIds: facts.map((f) => f.id),
        highlightColor,
      },
    ],
    facts: facts.map((f) => ({
      id: f.id,
      fact: f.fact,
      category: f.category,
      specificity: "medium",
      sourceId: f.sourceUrl,
      sourceUrl: f.sourceUrl,
      sourceTitle: f.sourceTitle,
      sourceExcerpt: f.sourceExcerpt,
      claimDirection: f.claimDirection,
    })),
    sources: sources.map((s, i) => ({
      id: `S${i + 1}`,
      url: s.url,
      title: s.title,
      snippet: s.snippet,
      fetchedAt: s.fetchedAt,
    })),
    searchQueries: searchQueries.map((q, i) => ({
      id: `Q${i + 1}`,
      query: q,
      resultsCount: 4,
    })),
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReportMarkdown(result: any, verdictData: any): string {
  const verdict = result.verdictSummary;
  const facts = result.facts || [];
  const sources = result.sources || [];

  let report = `# FactHarbor Analysis Report

## Verdict: ${verdict.verdictLabel}

**Truth Score:** ${verdict.overallVerdict}%
**Confidence:** ${verdict.overallConfidence}%

### Summary

${verdict.summary}

${verdictData?.reasoning ? `### Reasoning\n\n${verdictData.reasoning}` : ""}

## Evidence (${facts.length} facts)

`;

  for (const fact of facts) {
    const direction =
      fact.claimDirection === "supports"
        ? "✅"
        : fact.claimDirection === "contradicts"
          ? "❌"
          : "➖";
    report += `${direction} **${fact.category}**: ${fact.fact}\n`;
    report += `   _Source: [${fact.sourceTitle}](${fact.sourceUrl})_\n\n`;
  }

  report += `## Sources (${sources.length})\n\n`;

  for (const source of sources) {
    report += `- [${source.title}](${source.url})\n`;
  }

  report += `\n---\n_Generated by FactHarbor Monolithic Pipeline v${result.meta.schemaVersion}_\n`;
  report += `_Analysis time: ${(result.meta.analysisTimeMs / 1000).toFixed(1)}s_\n`;

  return report;
}
