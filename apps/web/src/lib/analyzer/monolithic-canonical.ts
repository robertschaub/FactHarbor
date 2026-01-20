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
import { getModel, getModelForTask } from "./llm";
import { CONFIG, getDeterministicTemperature } from "./config";
import {
  createBudgetTracker,
  getBudgetConfig,
  recordLLMCall,
  getBudgetStats,
} from "./budgets";
import { searchWebWithProvider } from "../web-search";
import { extractTextFromUrl } from "../retrieval";
import { percentageToClaimVerdict, getHighlightColor } from "./truth-scale";
import { filterFactsByProvenance } from "./provenance-validation";
import type { ExtractedFact } from "./types";
import { buildPrompt, detectProvider, isBudgetModel } from "./prompts/prompt-builder";
import { normalizeClaimText, deriveCandidateClaimTexts } from "./claim-decomposition";
import { calculateWeightedVerdictAverage } from "./aggregation";

function normalizeForContainsMatch(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForLooseContainsMatch(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHeuristicSubClaims(
  input: string,
  existingTexts: Set<string>,
  maxClaims = 4,
): Array<{ text: string }> {
  const candidates = deriveCandidateClaimTexts(input)
    .filter((c) => !existingTexts.has(normalizeClaimText(c)))
    .slice(0, maxClaims);

  return candidates.map((text) => ({ text }));
}

function excerptAppearsInContent(excerpt: string, content: string): boolean {
  const ex = String(excerpt || "").trim();
  if (ex.length < 24) return false; // too short to validate reliably
  const c = String(content || "");
  if (!c) return false;
  const nEx = normalizeForContainsMatch(ex);
  const nC = normalizeForContainsMatch(c);
  if (nEx && nC.includes(nEx)) return true;
  const lEx = normalizeForLooseContainsMatch(ex);
  const lC = normalizeForLooseContainsMatch(c);
  if (!lEx) return false;
  return lC.includes(lEx);
}

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

// Local helper types for internal processing (not extending FetchedSource to avoid required field conflicts)
interface MonolithicSource {
  id: string;
  url: string;
  title: string;
  snippet: string;
  content: string;
  fetchSuccess: boolean;
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
const MAX_CLAIMS_FOR_VERDICTS = 4;

// ============================================================================
// SCHEMAS
// ============================================================================

const SubClaimSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]).optional(),
  harmPotential: z.enum(["high", "medium", "low"]).optional().describe("High for death/injury/safety claims"),
  centrality: z.enum(["high", "medium", "low"]).optional(),
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]).optional(),
});

const ClaimExtractionSchema = z.object({
  mainClaim: z.string().describe("The primary factual claim to verify"),
  claimType: z.enum(["factual", "opinion", "prediction", "mixed"]),
  searchQueries: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Search queries to find evidence (include both supporting and contradicting)"),
  subClaims: z.array(SubClaimSchema).optional(),
  // Multi-scope detection fields
  detectedScopes: z.array(z.object({
    id: z.string().describe("Short ID like 'SCOPE_A', 'SCOPE_B'"),
    name: z.string().describe("Human-readable name"),
    type: z.enum(["legal", "scientific", "methodological", "general"]),
  })).optional().describe("Distinct analytical frames detected (e.g., multiple trials, different proceedings)"),
  requiresSeparateAnalysis: z.boolean().optional().describe("True if input involves multiple distinct proceedings/trials that should be analyzed separately"),
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
  detectedScopes: z
    .array(
      z.object({
        id: z.string().describe("Unique short ID, e.g., 'CTX_TSE'"),
        name: z.string().describe("Human-readable name, e.g., 'TSE Electoral Case'"),
        subject: z.string().describe("The specific subject of this scope"),
        type: z.enum(["legal", "scientific", "methodological", "general"]),
      })
    )
    .optional()
    .describe("List of distinct analytical frames detected"),
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

  const understandPrompt = buildPrompt({
    task: 'understand',
    provider: detectProvider(model.modelId || ''),
    modelName: model.modelId || '',
    config: {
      allowModelKnowledge: CONFIG.allowModelKnowledge,
      isLLMTiering: process.env.FH_LLM_TIERING === 'on',
      isBudgetModel: isBudgetModel(model.modelId || ''),
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
      isRecent: false, // TODO: Add recency detection
    },
  });

  const outputConfig = Output.object({ schema: ClaimExtractionSchema });

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: understandPrompt,
      },
      { role: "user", content: text },
    ],
    temperature: getDeterministicTemperature(0.1),
    output: outputConfig as any,
  });

  const output = extractStructuredOutput(result);
  return ClaimExtractionSchema.parse(output) as z.infer<typeof ClaimExtractionSchema>;
}

/**
 * Extract facts from source content
 */
async function extractFacts(
  model: any,
  claim: string,
  claimType: string | null,
  limitationNote: string | null,
  sourceContents: Array<{ url: string; title: string; content: string }>,
  existingFactCount: number,
  onEvent?: (msg: string, progress: number) => void | Promise<void>
): Promise<z.infer<typeof FactExtractionSchema>> {
  if (onEvent) await onEvent("Extracting facts from sources", 40);

  const sourceSummary = sourceContents
    .map((s, i) => `[Source ${i + 1}] ${s.title}\nURL: ${s.url}\n\n${s.content.slice(0, 5000)}`)
    .join("\n\n---\n\n");

  const extractFactsPrompt = buildPrompt({
    task: 'extract_facts',
    provider: detectProvider(model.modelId || ''),
    modelName: model.modelId || '',
    config: {
      allowModelKnowledge: CONFIG.allowModelKnowledge,
      isLLMTiering: process.env.FH_LLM_TIERING === 'on',
      isBudgetModel: isBudgetModel(model.modelId || ''),
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
      originalClaim: claim,
      scopesList: 'No scopes defined yet',
    },
  });

  const outputConfig = Output.object({ schema: FactExtractionSchema });

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: extractFactsPrompt,
      },
      {
        role: "user",
        content: `CLAIM TO VERIFY: ${claim}\n\nSOURCES:\n${sourceSummary}\n\nExisting fact count: ${existingFactCount}.\n\nRules:\n- Extract ONLY factual statements that are supported by the source text.\n- The excerpt MUST be a verbatim quote (or near-verbatim) from the source content.\n- If you cannot quote the source, do NOT include that fact.\n- If more research would help, set needsMoreResearch=true.`,
      },
    ],
    temperature: getDeterministicTemperature(0.1),
    output: outputConfig as any,
  });

  const output = extractStructuredOutput(result);
  return FactExtractionSchema.parse(output) as z.infer<typeof FactExtractionSchema>;
}

/**
 * Generate final verdict
 */
async function generateVerdict(
  model: any,
  claim: string,
  claimType: string | null,
  limitationNote: string | null,
  facts: ExtractedFact[],
  onEvent?: (msg: string, progress: number) => void | Promise<void>
): Promise<z.infer<typeof VerdictSchema>> {
  if (onEvent) await onEvent("Generating verdict", 80);

  const factsSummary = facts
    .map(
      (f) =>
        `[${f.id}] ${(f.claimDirection || "neutral").toUpperCase()}: ${f.fact}\n   Category: ${f.category}\n   Source: ${f.sourceTitle}`
    )
    .join("\n\n");

  const verdictPrompt = buildPrompt({
    task: 'verdict',
    provider: detectProvider(model.modelId || ''),
    modelName: model.modelId || '',
    config: {
      // Monolithic canonical is intended to be evidence-grounded; do not allow
      // training-data assertions to substitute for provenance.
      allowModelKnowledge: false,
      isLLMTiering: process.env.FH_LLM_TIERING === 'on',
      isBudgetModel: isBudgetModel(model.modelId || ''),
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
      originalClaim: claim,
      scopesList: 'Single scope analysis',
    },
  });

  const outputConfig = Output.object({ schema: VerdictSchema });

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: verdictPrompt,
      },
      {
        role: "user",
        content: `CLAIM: ${claim}\n\nEVIDENCE (${facts.length} facts):\n${factsSummary}\n\nRules:\n- Use ONLY the evidence facts above.\n- Do NOT introduce new facts, institutions, outcomes, or dates not present in the evidence list.\n- If evidence is insufficient or conflicting, keep confidence low and explain the gap.`,
      },
    ],
    temperature: getDeterministicTemperature(0.1),
    output: outputConfig as any,
  });

  const output = extractStructuredOutput(result);
  return VerdictSchema.parse(output) as z.infer<typeof VerdictSchema>;
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
  // We use tiered models below instead of a single getModel()
  const budgetConfig = getBudgetConfig();
  const budgetTracker = createBudgetTracker();

  // State tracking
  const facts: ExtractedFact[] = [];
  const sources: MonolithicSource[] = [];
  const searchQueriesWithResults: Array<{ query: string; resultsCount: number }> = [];
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
  const understandModel = getModelForTask("understand");
  const claimData = await extractClaim(understandModel.model, textToAnalyze, input.onEvent);
  recordLLMCall(budgetTracker, 2000); // Estimate

  const normalizedSeen = new Set<string>();
  const claimEntries: Array<{
    id: string;
    text: string;
    claimRole: "core" | "attribution" | "source" | "timing" | "unknown";
    centrality: "high" | "medium" | "low";
    thesisRelevance: "direct" | "tangential" | "irrelevant";
    harmPotential: "high" | "medium" | "low";
    isCentral: boolean;
  }> = [];

  // Helper to detect high harm potential from claim text
  const detectHarmPotential = (text: string): "high" | "medium" | "low" => {
    const lowered = text.toLowerCase();
    // Death/injury claims are ALWAYS high harm potential
    if (/\b(die[ds]?|death[s]?|dead|kill[eds]*|fatal|fatalit)/i.test(lowered)) return "high";
    if (/\b(injur[yies]*|harm[eds]*|damage[ds]*|victim[s]?)/i.test(lowered)) return "high";
    // Safety/health risk claims
    if (/\b(danger|unsafe|risk|threat|hazard)/i.test(lowered)) return "high";
    // Fraud/crime accusations
    if (/\b(fraud|crime|corrupt|illegal|stolen|theft)/i.test(lowered)) return "high";
    return "medium";
  };

  const mainClaimText = String(claimData.mainClaim || "").trim();
  if (mainClaimText) {
    claimEntries.push({
      id: "C1",
      text: mainClaimText,
      claimRole: "core",
      centrality: "high",
      thesisRelevance: "direct",
      harmPotential: detectHarmPotential(mainClaimText),
      isCentral: true,
    });
    normalizedSeen.add(normalizeClaimText(mainClaimText));
  }

  const rawSubClaims = Array.isArray(claimData.subClaims) ? claimData.subClaims : [];
  const heuristicSubClaims =
    rawSubClaims.length >= 2
      ? []
      : buildHeuristicSubClaims(textToAnalyze, normalizedSeen, MAX_CLAIMS_FOR_VERDICTS);

  const combinedSubClaims = rawSubClaims.map((c) => {
    const claimText = String(c.text || "").trim();
    return {
      text: claimText,
      claimRole: c.claimRole || "core",
      centrality: c.centrality || "medium",
      thesisRelevance: c.thesisRelevance || "direct",
      // v2.7.0: Use detectHarmPotential as fallback to catch death/injury claims LLM missed
      harmPotential: c.harmPotential || detectHarmPotential(claimText),
    };
  });
  combinedSubClaims.push(...heuristicSubClaims.map((c) => ({
    text: c.text,
    claimRole: "core" as const,
    centrality: "medium" as const,
    thesisRelevance: "direct" as const,
    harmPotential: detectHarmPotential(c.text),
  })));

  let subClaimIndex = 1;
  for (const sub of combinedSubClaims) {
    if (!sub.text) continue;
    const normalized = normalizeClaimText(sub.text);
    if (!normalized || normalizedSeen.has(normalized)) continue;
    const id = `C${++subClaimIndex}`;
    // If harm potential is high, also ensure centrality is high
    const effectiveCentrality = sub.harmPotential === "high" ? "high" : sub.centrality;
    claimEntries.push({
      id,
      text: sub.text,
      claimRole: sub.claimRole as any,
      centrality: effectiveCentrality as any,
      thesisRelevance: sub.thesisRelevance as any,
      harmPotential: sub.harmPotential as any,
      isCentral: effectiveCentrality === "high",
    });
    normalizedSeen.add(normalized);
  }

  const claimsForVerdicts = claimEntries.slice(0, MAX_CLAIMS_FOR_VERDICTS);

  // Use LLM-generated search queries directly
  // The LLM prompt already instructs it to generate scope-aware queries when needed
  const allSearchQueries = claimData.searchQueries;

  // IMPORTANT: Do NOT hard-stop on opinion/prediction inputs.
  // Many user inputs are evaluative or predictive but still have verifiable components
  // (timelines, procedures, quoted statements, what the law says, what courts ruled, etc.).
  // We proceed with research, but we:
  // - attach an explicit limitation note
  // - cap confidence later to avoid overclaiming
  const claimType = claimData.claimType;
  const limitationNote: string | null = null;

  // Step 2: Research loop
  let iteration = 0;
  let needsMoreResearch = true;
  const extractFactsModel = getModelForTask("extract_facts");

  while (
    needsMoreResearch &&
    iteration < MONOLITHIC_BUDGET.maxIterations &&
    searchCount < MONOLITHIC_BUDGET.maxSearches &&
    Date.now() - startTime < MONOLITHIC_BUDGET.timeoutMs
  ) {
    iteration++;

    // Get queries for this iteration, avoiding duplicates
    // Track query offset to prevent re-searching previously used queries
    const queryOffset = iteration === 1 ? 0 : 3 + (iteration - 2); // iter1: 0-2, iter2: 3, iter3: 4, etc.
    const queriesToRun =
      iteration === 1
        ? allSearchQueries.slice(0, 3)
        : allSearchQueries[queryOffset]
          ? [allSearchQueries[queryOffset]]
          : [`${claimData.mainClaim} ${iteration > 2 ? "contradicting" : "supporting"} evidence`];

    // Run searches
    const searchResults: Array<{ url: string; title: string; snippet: string }> = [];

    for (const query of queriesToRun) {
      if (searchCount >= MONOLITHIC_BUDGET.maxSearches) break;
      // Skip if we've already searched this exact query
      if (searchQueriesWithResults.some((q) => q.query === query)) continue;

      searchCount++;

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
        // Track query with actual results count
        searchQueriesWithResults.push({ query, resultsCount: response.results.length });
        searchResults.push(
          ...response.results.map((r) => ({
            url: r.url,
            title: r.title,
            snippet: r.snippet || "",
          }))
        );
      } catch (err) {
        // Track failed query with 0 results
        searchQueriesWithResults.push({ query, resultsCount: 0 });
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

      // Safely parse hostname for display, fallback to URL on parse error
      let displayHost = result.url;
      try {
        displayHost = new URL(result.url).hostname;
      } catch {
        // Malformed URL - use raw URL for display, will likely fail fetch below
      }

      if (input.onEvent) {
        await input.onEvent(`Fetching: ${displayHost}`, 25 + iteration * 10);
      }

      try {
        const content = await extractTextFromUrl(result.url, {
          timeoutMs: 15000,
          maxLength: 20000,
        });

        sources.push({
          id: `S${sources.length + 1}`,
          url: result.url,
          title: content.title || result.title,
          snippet: result.snippet,
          content: content.text,
          fetchSuccess: true,
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
          extractFactsModel.model,
          claimData.mainClaim,
          claimType,
          limitationNote,
          fetchedContents,
          facts.length,
          input.onEvent
        );
        recordLLMCall(budgetTracker, 3000); // Estimate

        // Add new facts with IDs
        const urlToSourceId = new Map(sources.map((s) => [s.url, s.id]));
        const urlToContent = new Map(sources.map((s) => [s.url, s.content]));
        for (const f of extraction.facts) {
          const content = urlToContent.get(f.sourceUrl) || "";
          if (!excerptAppearsInContent(f.excerpt, content)) {
            console.warn(
              `[MonolithicCanonical] Dropping fact with non-verifiable excerpt (not found in fetched content): ${f.sourceUrl}`,
            );
            continue;
          }
          facts.push({
            id: `F${facts.length + 1}`,
            fact: f.fact,
            sourceId: urlToSourceId.get(f.sourceUrl) || `S-${f.sourceUrl.substring(0, 10)}`,
            sourceUrl: f.sourceUrl,
            sourceTitle: f.sourceTitle,
            sourceExcerpt: f.excerpt,
            category: f.category,
            claimDirection: f.direction,
            specificity: "medium",
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
    // Avoid failing the entire pipeline; return a safe, low-confidence result.
    // (Runner fallback is still available, but this keeps canonical output consistent and debuggable.)
    const fallbackClaimVerdicts = claimsForVerdicts.map((claim) => ({
      claimId: claim.id,
      claimText: claim.text,
      contextId: "CTX_MAIN",
      isCentral: claim.isCentral,
      centrality: claim.centrality,
      verdict: 50,
      truthPercentage: 50,
      confidence: 30,
      riskTier: "C",
      reasoning: "Insufficient verifiable evidence to assess this claim.",
      supportingFactIds: [],
      highlightColor: getHighlightColor(50),
    }));
    const resultJson = buildResultJson({
      input,
      startTime,
      provider: understandModel.provider,
      modelName: understandModel.modelName,
      budgetTracker,
      budgetConfig,
      claim: claimData.mainClaim,
      claimType,
      facts: [],
      sources,
      searchQueriesWithResults,
      verdict: 50,
      confidence: 30,
      reasoning: "No verifiable facts could be extracted from sources within budget.",
      summary: "Insufficient verifiable evidence",
      claimVerdicts: fallbackClaimVerdicts,
    });
    const reportMarkdown = generateReportMarkdown(resultJson, null);
    return { resultJson, reportMarkdown };
  }

  // Harden with Provenance Validation
  const provenanceResult = filterFactsByProvenance(facts);
  const validatedFacts = provenanceResult.validFacts;

  if (validatedFacts.length === 0) {
    throw new Error("Facts failed provenance validation. Falling back to orchestrated pipeline.");
  }

  const verdictModel = getModelForTask("verdict");
  const verdictResults: Array<{
    entry: typeof claimsForVerdicts[number];
    verdictData: z.infer<typeof VerdictSchema>;
  }> = [];

  for (const entry of claimsForVerdicts) {
    const verdictData = await generateVerdict(
      verdictModel.model,
      entry.text,
      claimType,
      limitationNote,
      validatedFacts,
      input.onEvent
    );
    verdictResults.push({ entry, verdictData });
    recordLLMCall(budgetTracker, 2000); // Estimate
  }

  const verdictData = verdictResults[0]?.verdictData;
  if (!verdictData) {
    throw new Error("Failed to generate verdict for primary claim.");
  }

  // Build result
  const claimVerdicts = verdictResults.map((result) => {
    const v = result.verdictData;
    return {
      claimId: result.entry.id,
      claimText: result.entry.text,
      contextId: "CTX_MAIN",
      isCentral: result.entry.isCentral,
      centrality: result.entry.centrality,
      harmPotential: result.entry.harmPotential,
      verdict: v.verdict,
      truthPercentage: v.verdict,
      confidence: v.confidence,
      riskTier: v.confidence >= 70 ? "A" : v.confidence >= 40 ? "B" : "C",
      reasoning: v.reasoning,
      supportingFactIds: validatedFacts.map((f) => f.id),
      highlightColor: getHighlightColor(v.verdict),
    };
  });

  // Calculate aggregated verdict using weighted average of all claims
  // Central claims (high centrality) and high harm potential claims have more influence
  const aggregatedVerdict = calculateWeightedVerdictAverage(
    claimVerdicts.map((cv) => ({
      truthPercentage: cv.verdict,
      centrality: cv.centrality as "high" | "medium" | "low",
      confidence: cv.confidence,
      harmPotential: cv.harmPotential as "high" | "medium" | "low",
      thesisRelevance: "direct" as const, // All canonical claims are direct
    }))
  );

  // Aggregated confidence: weighted average of claim confidences
  const totalConfidenceWeight = claimVerdicts.reduce((sum, cv) => {
    const centralityWeight = cv.centrality === "high" ? 3 : cv.centrality === "medium" ? 2 : 1;
    return sum + centralityWeight;
  }, 0);
  const aggregatedConfidence = totalConfidenceWeight > 0
    ? Math.round(
        claimVerdicts.reduce((sum, cv) => {
          const centralityWeight = cv.centrality === "high" ? 3 : cv.centrality === "medium" ? 2 : 1;
          return sum + cv.confidence * centralityWeight;
        }, 0) / totalConfidenceWeight
      )
    : verdictData.confidence;

  // Use most central claim's reasoning/summary for the overall summary
  const primaryClaimVerdict = claimVerdicts.find((cv) => cv.centrality === "high") || claimVerdicts[0];

  const resultJson = buildResultJson({
    input,
    startTime,
    provider: verdictModel.provider,
    modelName: verdictModel.modelName,
    budgetTracker,
    budgetConfig,
    claim: claimData.mainClaim,
    claimType,
    facts: validatedFacts,
    sources,
    searchQueriesWithResults,
    verdict: aggregatedVerdict,
    confidence: aggregatedConfidence,
    reasoning: primaryClaimVerdict?.reasoning || verdictData.reasoning,
    summary: verdictData.summary,
    verdictData, // Pass the LLM response to include detectedScopes
    claimVerdicts,
  });

  const reportMarkdown = generateReportMarkdown(resultJson, verdictData);

  if (input.onEvent) {
    await input.onEvent("Analysis complete", 100);
  }

  return { resultJson, reportMarkdown };
}

// ============================================================================
// SCOPE INFERENCE
// ============================================================================

/**
 * Infers which scope a fact belongs to based on content matching.
 * Returns the most relevant scope ID, or the first scope as default.
 */
function inferScopeForFact(
  fact: ExtractedFact,
  scopes: Array<{ id: string; name: string; subject: string }>
): string {
  if (scopes.length <= 1) {
    return scopes[0]?.id || "CTX_MAIN";
  }

  // Combine fact content for matching
  const factContent = `${fact.fact} ${fact.sourceTitle || ""} ${fact.sourceExcerpt || ""}`.toLowerCase();

  // Score each scope by keyword matches
  let bestScope = scopes[0];
  let bestScore = 0;

  for (const scope of scopes) {
    let score = 0;

    // Extract keywords from scope name and subject
    const scopeKeywords = `${scope.name} ${scope.subject}`.toLowerCase().split(/\s+/);

    for (const keyword of scopeKeywords) {
      // Skip common words
      if (keyword.length < 3 || ["the", "and", "for", "with", "from"].includes(keyword)) {
        continue;
      }
      if (factContent.includes(keyword)) {
        score += keyword.length; // Weight by keyword length
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestScope = scope;
    }
  }

  return bestScope.id;
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
  sources: MonolithicSource[];
  searchQueriesWithResults: Array<{ query: string; resultsCount: number }>;
  verdict: number;
  confidence: number;
  reasoning: string;
  summary: string;
  verdictData?: any;
  claimVerdicts?: Array<{
    claimId: string;
    claimText: string;
    contextId: string;
    isCentral: boolean;
    centrality: string;
    verdict: number;
    truthPercentage: number;
    confidence: number;
    riskTier: string;
    reasoning: string;
    supportingFactIds: string[];
    highlightColor: string;
  }>;
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
    searchQueriesWithResults,
    verdict,
    confidence,
    reasoning,
    summary,
  } = params;

  const analysisTimeMs = Date.now() - startTime;
  const budgetStats = getBudgetStats(budgetTracker, budgetConfig);
  // Use canonical truth scale for consistent verdicts across pipelines
  const verdictLabel = percentageToClaimVerdict(verdict, confidence);
  const highlightColor = getHighlightColor(verdict);

  // Map LLM-detected scopes if available, otherwise fallback to CTX_MAIN
  const finalScopes =
    params.verdictData?.detectedScopes && params.verdictData.detectedScopes.length > 0
      ? params.verdictData.detectedScopes.map((s: any) => ({
          id: s.id,
          name: s.name,
          shortName: s.name.substring(0, 10),
          subject: s.subject,
          temporal: "",
          status: "concluded",
          outcome: summary,
          metadata: { claimType, type: s.type },
        }))
      : [
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
        ];

  const claimsOutput =
    params.claimVerdicts && params.claimVerdicts.length > 0
      ? params.claimVerdicts
      : [
          {
            claimId: "C1",
            claimText: claim,
            contextId: finalScopes[0]?.id || "CTX_MAIN",
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
        ];

  return {
    _schemaVersion: "2.7.0",
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
      hasMultipleProceedings: finalScopes.length > 1,
      hasMultipleContexts: finalScopes.length > 1,
      hasMultipleScopes: finalScopes.length > 1,
      proceedingCount: finalScopes.length,
      contextCount: finalScopes.length,
      scopeCount: finalScopes.length,
      isPseudoscience: false,
      inputLength: input.inputValue.length,
      analysisTimeMs,
      analysisId: input.jobId || `mono-${Date.now()}`,
      monolithicStats: {
        searches: searchQueriesWithResults.length,
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
      // Orchestrated/UI-compatible fields (preferred)
      answer: verdict,
      confidence,
      truthPercentage: verdict,
      // Backward/alternate naming still used in some places/tests
      overallVerdict: verdict,
      overallConfidence: confidence,
      verdictLabel,
      summary,
      hasContestedFactors: false,
    },
    analysisContexts: finalScopes,
    scopes: finalScopes,
    twoPanelSummary: {
      factharborAnalysis: {
        analysisId: input.jobId || `mono-${Date.now()}`,
        version: CONFIG.schemaVersion,
        confidence,
        centralClaimSummary: claim,
        factCheckSummary: reasoning,
        keyFindings: facts.slice(0, 5).map((f) => f.fact),
        overallVerdict: verdict,
      },
    },
    claimVerdicts: claimsOutput,
    // Build URL-to-ID mapping for proper fact-source relationships
    sources: sources.map((s) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      snippet: s.snippet,
      fetchedAt: s.fetchedAt,
    })),
    // Create lookup after sources are defined (using closure over sources array)
    // Associate facts with scopes using content-based matching
    facts: facts.map((f) => ({
      id: f.id,
      fact: f.fact,
      category: f.category,
      specificity: f.specificity,
      sourceId: f.sourceId,
      sourceUrl: f.sourceUrl,
      sourceTitle: f.sourceTitle,
      sourceExcerpt: f.sourceExcerpt,
      claimDirection: f.claimDirection,
      contextId: inferScopeForFact(f, finalScopes),
    })),
    searchQueries: searchQueriesWithResults.map((q, i) => ({
      id: `Q${i + 1}`,
      query: q.query,
      resultsCount: q.resultsCount,
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
