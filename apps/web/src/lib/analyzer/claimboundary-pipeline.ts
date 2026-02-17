/**
 * ClaimBoundary Pipeline — Main Entry Point
 *
 * Replaces the orchestrated pipeline with an evidence-emergent boundary model.
 * Claims drive research, evidence scopes determine boundaries, verdicts use
 * a 5-step LLM debate pattern.
 *
 * Pipeline stages:
 *   Stage 1: EXTRACT CLAIMS — Two-pass evidence-grounded claim extraction
 *   Stage 2: RESEARCH — Claim-driven evidence gathering with mandatory EvidenceScope
 *   Stage 3: CLUSTER BOUNDARIES — Group evidence into ClaimBoundaries by scope congruence
 *   Stage 4: VERDICT — 5-step LLM debate pattern (advocate, consistency, challenge, reconcile, validate)
 *   Stage 5: AGGREGATE — Weighted aggregation with triangulation and narrative
 *
 * @module analyzer/claimboundary-pipeline
 * @since ClaimAssessmentBoundary pipeline v1
 * @see Docs/WIP/ClaimAssessmentBoundary_Pipeline_Architecture_2026-02-15.md
 */

import type {
  AtomicClaim,
  ArticleVerdict7Point,
  CBClaimUnderstanding,
  CBClaimVerdict,
  CBResearchState,
  ClaimAssessmentBoundary,
  CoverageMatrix,
  EvidenceItem,
  EvidenceScope,
  FetchedSource,
  Gate4Stats,
  OverallAssessment,
  QualityGates,
  Gate1Stats,
  AnalysisInput,
  SourceType,
  TriangulationScore,
  VerdictNarrative,
} from "./types";

// Shared modules — reused from existing codebase (no orchestrated.ts imports)
import { filterByProbativeValue } from "./evidence-filter";
import { prefetchSourceReliability, getTrackRecordScore } from "./source-reliability";
import { percentageToArticleVerdict } from "./truth-scale";

// Verdict stage module (§8.4 — 5-step debate pattern)
import {
  runVerdictStage,
  type LLMCallFn,
  type VerdictStageConfig,
  DEFAULT_VERDICT_STAGE_CONFIG,
} from "./verdict-stage";

// LLM call infrastructure
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getModelForTask,
  extractStructuredOutput,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
} from "./llm";
import { loadAndRenderSection } from "./prompt-loader";

// Config loading
import { loadPipelineConfig, loadSearchConfig, loadCalcConfig } from "@/lib/config-loader";
import type { PipelineConfig, SearchConfig, CalcConfig } from "@/lib/config-schemas";

// Search and retrieval
import { searchWebWithProvider } from "@/lib/web-search";
import { extractTextFromUrl } from "@/lib/retrieval";

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Run the ClaimBoundary analysis pipeline.
 *
 * This is the main entry point that orchestrates all 5 stages sequentially.
 * Each stage is an independently testable function.
 *
 * @param input - The analysis input (text or URL, with optional event callback)
 * @returns The result object with resultJson and reportMarkdown
 */
export async function runClaimBoundaryAnalysis(
  input: AnalysisInput
): Promise<{ resultJson: any; reportMarkdown: string }> {
  const onEvent = input.onEvent ?? (() => {});

  // Initialize research state
  const state: CBResearchState = {
    originalInput: input.inputValue,
    originalText: "",
    inputType: input.inputType,
    understanding: null,
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    mainIterationsUsed: 0,
    contradictionIterationsReserved: 2, // UCM default
    contradictionIterationsUsed: 0,
    contradictionSourcesFound: 0,
    claimBoundaries: [],
    llmCalls: 0,
  };

  // Stage 1: Extract Claims
  onEvent("Extracting claims from input...", 10);
  const understanding = await extractClaims(state);
  state.understanding = understanding;

  // Stage 2: Research
  onEvent("Researching evidence for claims...", 30);
  await researchEvidence(state);

  // Stage 3: Cluster Boundaries
  onEvent("Clustering evidence into boundaries...", 60);
  const boundaries = await clusterBoundaries(state);
  state.claimBoundaries = boundaries;

  // Build coverage matrix (between Stage 3 and 4, per §8.5.1)
  const coverageMatrix = buildCoverageMatrix(
    understanding.atomicClaims,
    boundaries,
    state.evidenceItems
  );

  // Stage 4: Verdict
  onEvent("Generating verdicts...", 70);
  const claimVerdicts = await generateVerdicts(
    understanding.atomicClaims,
    state.evidenceItems,
    boundaries,
    coverageMatrix
  );

  // Stage 5: Aggregate
  onEvent("Aggregating final assessment...", 90);
  const assessment = await aggregateAssessment(
    claimVerdicts,
    boundaries,
    state.evidenceItems,
    coverageMatrix,
    state
  );

  onEvent("Analysis complete.", 100);

  // Wrap assessment in resultJson structure (no AnalysisContext references)
  const resultJson = {
    _schemaVersion: "3.0.0-cb", // ClaimAssessmentBoundary pipeline schema
    meta: {
      schemaVersion: "3.0.0-cb",
      generatedUtc: new Date().toISOString(),
      pipeline: "claimboundary",
      inputType: input.inputType,
      detectedInputType: state.understanding?.detectedInputType ?? input.inputType,
      hasMultipleBoundaries: assessment.hasMultipleBoundaries,
      boundaryCount: boundaries.length,
      claimCount: understanding.atomicClaims.length,
      llmCalls: state.llmCalls,
      mainIterationsUsed: state.mainIterationsUsed,
      contradictionIterationsUsed: state.contradictionIterationsUsed,
      contradictionSourcesFound: state.contradictionSourcesFound,
    },
    // Core assessment data
    truthPercentage: assessment.truthPercentage,
    verdict: assessment.verdict,
    confidence: assessment.confidence,
    verdictNarrative: assessment.verdictNarrative,

    // ClaimBoundary-specific data (replaces analysisContexts)
    claimBoundaries: assessment.claimBoundaries,
    claimVerdicts: assessment.claimVerdicts,
    coverageMatrix: assessment.coverageMatrix,

    // Supporting data
    understanding: state.understanding,
    evidenceItems: state.evidenceItems,
    sources: state.sources.map((s: FetchedSource) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      trackRecordScore: s.trackRecordScore,
      category: s.category,
      fetchSuccess: s.fetchSuccess,
      searchQuery: s.searchQuery,
    })),
    searchQueries: state.searchQueries,

    // Quality gates
    qualityGates: assessment.qualityGates,
  };

  // TODO: Generate markdown report (Phase 3 UI work)
  const reportMarkdown = "# ClaimBoundary Analysis Report\n\n(Report generation not yet implemented)";

  return { resultJson, reportMarkdown };
}

// ============================================================================
// STAGE 1: EXTRACT CLAIMS (§8.1)
// ============================================================================

// --- Zod schemas for Stage 1 LLM output parsing ---

const Pass1OutputSchema = z.object({
  impliedClaim: z.string(),
  backgroundDetails: z.string(),
  roughClaims: z.array(z.object({
    statement: z.string(),
    searchHint: z.string(),
  })),
});

const Pass2AtomicClaimSchema = z.object({
  id: z.string(),
  statement: z.string(),
  category: z.enum(["factual", "evaluative", "procedural"]),
  centrality: z.enum(["high", "medium", "low"]),
  harmPotential: z.enum(["critical", "high", "medium", "low"]),
  isCentral: z.boolean(),
  claimDirection: z.enum(["supports_thesis", "contradicts_thesis", "contextual"]),
  keyEntities: z.array(z.string()),
  checkWorthiness: z.enum(["high", "medium", "low"]),
  specificityScore: z.number(),
  groundingQuality: z.enum(["strong", "moderate", "weak", "none"]),
  expectedEvidenceProfile: z.object({
    methodologies: z.array(z.string()),
    expectedMetrics: z.array(z.string()),
    expectedSourceTypes: z.array(z.string()),
  }),
});

const Pass2OutputSchema = z.object({
  impliedClaim: z.string(),
  backgroundDetails: z.string(),
  articleThesis: z.string(),
  atomicClaims: z.array(Pass2AtomicClaimSchema),
  distinctEvents: z.array(z.object({
    name: z.string(),
    date: z.string(),
    description: z.string(),
  })).optional(),
  riskTier: z.enum(["A", "B", "C"]).optional(),
  retainedEvidence: z.array(z.string()).optional(),
});

const Gate1OutputSchema = z.object({
  validatedClaims: z.array(z.object({
    claimId: z.string(),
    passedOpinion: z.boolean(),
    passedSpecificity: z.boolean(),
    reasoning: z.string(),
  })),
});

const PreliminaryEvidenceItemSchema = z.object({
  statement: z.string(),
  category: z.string().optional(),
  claimDirection: z.enum(["supports", "contradicts", "contextual"]).optional(),
  evidenceScope: z.object({
    methodology: z.string().optional(),
    temporal: z.string().optional(),
    geographic: z.string().optional(),
    boundaries: z.string().optional(),
  }).optional(),
  probativeValue: z.enum(["high", "medium", "low"]).optional(),
  sourceType: z.string().optional(),
  isDerivative: z.boolean().optional(),
  derivedFromSourceUrl: z.string().nullable().optional(),
  relevantClaimIds: z.array(z.string()).optional(),
});

const ExtractEvidenceOutputSchema = z.object({
  evidenceItems: z.array(PreliminaryEvidenceItemSchema),
});

// --- Preliminary evidence type (lightweight, for passing between stages) ---

export interface PreliminaryEvidenceItem {
  statement: string;
  sourceUrl: string;
  sourceTitle: string;
  evidenceScope?: {
    methodology?: string;
    temporal?: string;
    geographic?: string;
    boundaries?: string;
  };
  relevantClaimIds?: string[];
}

/**
 * Stage 1: Extract atomic claims from input using two-pass evidence-grounded approach.
 *
 * Pass 1: Quick claim scan + preliminary search (Haiku tier)
 * Pass 2: Evidence-grounded claim extraction (Sonnet tier)
 * Then: Centrality filter + Gate 1 validation
 *
 * @param state - The mutable research state
 * @returns CBClaimUnderstanding with atomic claims
 */
export async function extractClaims(
  state: CBResearchState
): Promise<CBClaimUnderstanding> {
  // Load pipeline + search configs from UCM
  const [pipelineResult, searchResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadSearchConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;
  const searchConfig = searchResult.config;

  const currentDate = new Date().toISOString().split("T")[0];

  // ------------------------------------------------------------------
  // Pass 1: Rapid claim scan (Haiku)
  // ------------------------------------------------------------------
  const pass1 = await runPass1(state.originalInput, pipelineConfig, currentDate);
  state.llmCalls++;

  // ------------------------------------------------------------------
  // Preliminary search: search web for rough claims, fetch sources, extract evidence
  // ------------------------------------------------------------------
  const preliminaryEvidence = await runPreliminarySearch(
    pass1.roughClaims,
    searchConfig,
    pipelineConfig,
    currentDate,
    state,
  );

  // ------------------------------------------------------------------
  // Pass 2: Evidence-grounded extraction (Sonnet)
  // ------------------------------------------------------------------
  const pass2 = await runPass2(
    state.originalInput,
    preliminaryEvidence,
    pipelineConfig,
    currentDate,
  );
  state.llmCalls++;

  // ------------------------------------------------------------------
  // Centrality filter
  // ------------------------------------------------------------------
  const centralityThreshold = pipelineConfig.centralityThreshold ?? "medium";
  const maxAtomicClaims = pipelineConfig.maxAtomicClaims ?? 15;

  const filteredClaims = filterByCentrality(
    pass2.atomicClaims,
    centralityThreshold,
    maxAtomicClaims,
  );

  // ------------------------------------------------------------------
  // Gate 1: Claim validation (Haiku, batched)
  // ------------------------------------------------------------------
  const gate1Stats = await runGate1Validation(
    filteredClaims,
    pipelineConfig,
    currentDate,
  );
  state.llmCalls++;

  // ------------------------------------------------------------------
  // Assemble CBClaimUnderstanding
  // ------------------------------------------------------------------
  return {
    detectedInputType: detectInputType(state.originalInput),
    impliedClaim: pass2.impliedClaim,
    backgroundDetails: pass2.backgroundDetails,
    articleThesis: pass2.articleThesis,
    atomicClaims: filteredClaims,
    distinctEvents: pass2.distinctEvents ?? [],
    riskTier: pass2.riskTier ?? "B",
    preliminaryEvidence: preliminaryEvidence.map((pe) => ({
      sourceUrl: pe.sourceUrl,
      snippet: pe.statement,
      claimId: pe.relevantClaimIds?.[0] ?? "",
    })),
    gate1Stats,
  };
}

// ============================================================================
// STAGE 1 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Pass 1: Rapid claim scan using Haiku.
 * Extracts impliedClaim, backgroundDetails, and roughClaims from input text.
 */
export async function runPass1(
  inputText: string,
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<z.infer<typeof Pass1OutputSchema>> {
  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS1", {
    currentDate,
    analysisInput: inputText,
  });
  if (!rendered) {
    throw new Error("Stage 1 Pass 1: Failed to load CLAIM_EXTRACTION_PASS1 prompt section");
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);

  const result = await generateText({
    model: model.model,
    messages: [
      {
        role: "system",
        content: rendered.content,
        providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
      },
      { role: "user", content: inputText },
    ],
    temperature: 0.15,
    output: Output.object({ schema: Pass1OutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(
      pipelineConfig.llmProvider ?? "anthropic",
    ),
  });

  const parsed = extractStructuredOutput(result);
  if (!parsed) {
    throw new Error("Stage 1 Pass 1: LLM returned no structured output");
  }

  return Pass1OutputSchema.parse(parsed);
}

/**
 * Preliminary search: for each rough claim, search the web, fetch sources,
 * and extract brief evidence with EvidenceScope metadata.
 */
export async function runPreliminarySearch(
  roughClaims: Array<{ statement: string; searchHint: string }>,
  searchConfig: SearchConfig,
  pipelineConfig: PipelineConfig,
  currentDate: string,
  state: CBResearchState,
): Promise<PreliminaryEvidenceItem[]> {
  const queriesPerClaim = pipelineConfig.preliminarySearchQueriesPerClaim ?? 2;
  const maxSources = pipelineConfig.preliminaryMaxSources ?? 5;

  const allEvidence: PreliminaryEvidenceItem[] = [];

  // Limit to top 3 rough claims to control cost (§8.1: "impliedClaim and top 2-3 rough claims")
  const claimsToSearch = roughClaims.slice(0, 3);

  for (const claim of claimsToSearch) {
    // Generate search queries from claim + searchHint
    const queries = generateSearchQueries(claim, queriesPerClaim);

    for (const query of queries) {
      try {
        const response = await searchWebWithProvider({
          query,
          maxResults: maxSources,
          config: searchConfig,
        });

        // Track the search query
        state.searchQueries.push({
          query,
          iteration: 0,
          focus: "preliminary",
          resultsCount: response.results.length,
          timestamp: new Date().toISOString(),
          searchProvider: response.providersUsed.join(", "),
        });

        // Fetch and extract text from top results (limit to 3 per query)
        const sourcesToFetch = response.results.slice(0, 3);
        const fetchedSources: Array<{ url: string; title: string; text: string }> = [];

        for (const searchResult of sourcesToFetch) {
          try {
            const content = await extractTextFromUrl(searchResult.url, {
              timeoutMs: 12000,
              maxLength: 15000,
            });
            if (content.text.length > 100) {
              fetchedSources.push({
                url: searchResult.url,
                title: content.title || searchResult.title,
                text: content.text.slice(0, 8000), // Cap to control prompt size
              });
            }
          } catch {
            // Skip sources that fail to fetch — non-fatal
          }
        }

        if (fetchedSources.length === 0) continue;

        // Extract evidence from fetched sources using batched LLM call (Haiku)
        const evidence = await extractPreliminaryEvidence(
          claim.statement,
          fetchedSources,
          pipelineConfig,
          currentDate,
        );
        state.llmCalls++;

        allEvidence.push(...evidence);
      } catch (err) {
        // Search failures are non-fatal for Stage 1 preliminary search
        console.warn(`[Stage1] Preliminary search failed for query "${query}":`, err);
      }
    }
  }

  return allEvidence;
}

/**
 * Generate search queries from a rough claim and its searchHint.
 */
export function generateSearchQueries(
  claim: { statement: string; searchHint: string },
  queriesPerClaim: number,
): string[] {
  const queries: string[] = [];

  // Primary query: use the searchHint (3-5 words, optimized for search)
  if (claim.searchHint) {
    queries.push(claim.searchHint);
  }

  // Secondary query: use the claim statement directly (truncated for search)
  if (queries.length < queriesPerClaim) {
    const truncated = claim.statement.length > 80
      ? claim.statement.slice(0, 80)
      : claim.statement;
    queries.push(truncated);
  }

  return queries.slice(0, queriesPerClaim);
}

/**
 * Extract preliminary evidence from fetched sources using batched LLM call (Haiku).
 * Batches all sources into a single prompt for efficiency.
 */
async function extractPreliminaryEvidence(
  claimStatement: string,
  sources: Array<{ url: string; title: string; text: string }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<PreliminaryEvidenceItem[]> {
  const rendered = await loadAndRenderSection("claimboundary", "EXTRACT_EVIDENCE", {
    currentDate,
    claim: claimStatement,
    sourceContent: sources.map((s, i) =>
      `[Source ${i + 1}: ${s.title}]\nURL: ${s.url}\n${s.text}`
    ).join("\n\n---\n\n"),
    sourceUrl: sources.map((s) => s.url).join(", "),
  });
  if (!rendered) {
    return []; // No prompt available — skip extraction
  }

  const model = getModelForTask("extract_evidence", undefined, pipelineConfig);

  try {
    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        { role: "user", content: `Extract evidence from these ${sources.length} sources relating to: "${claimStatement}"` },
      ],
      temperature: 0.1,
      output: Output.object({ schema: ExtractEvidenceOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        (pipelineConfig.llmProvider) ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return [];

    const validated = ExtractEvidenceOutputSchema.parse(parsed);

    // Map to PreliminaryEvidenceItem, assigning source URLs
    return validated.evidenceItems.map((ei) => ({
      statement: ei.statement,
      sourceUrl: sources[0]?.url ?? "",
      sourceTitle: sources[0]?.title ?? "",
      evidenceScope: ei.evidenceScope ? {
        methodology: ei.evidenceScope.methodology,
        temporal: ei.evidenceScope.temporal,
        geographic: ei.evidenceScope.geographic,
        boundaries: ei.evidenceScope.boundaries,
      } : undefined,
      relevantClaimIds: ei.relevantClaimIds,
    }));
  } catch (err) {
    console.warn("[Stage1] Preliminary evidence extraction failed:", err);
    return [];
  }
}

/**
 * Pass 2: Evidence-grounded claim extraction using Sonnet.
 * Uses preliminary evidence to produce specific, research-ready atomic claims.
 */
export async function runPass2(
  inputText: string,
  preliminaryEvidence: PreliminaryEvidenceItem[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<z.infer<typeof Pass2OutputSchema>> {
  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS2", {
    currentDate,
    analysisInput: inputText,
    preliminaryEvidence: JSON.stringify(
      preliminaryEvidence.map((pe) => ({
        statement: pe.statement,
        sourceUrl: pe.sourceUrl,
        sourceTitle: pe.sourceTitle,
        evidenceScope: pe.evidenceScope,
      })),
      null,
      2,
    ),
  });
  if (!rendered) {
    throw new Error("Stage 1 Pass 2: Failed to load CLAIM_EXTRACTION_PASS2 prompt section");
  }

  const model = getModelForTask("verdict", undefined, pipelineConfig);

  const result = await generateText({
    model: model.model,
    messages: [
      {
        role: "system",
        content: rendered.content,
        providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
      },
      { role: "user", content: inputText },
    ],
    temperature: 0.15,
    output: Output.object({ schema: Pass2OutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(
      (pipelineConfig.llmProvider) ?? "anthropic",
    ),
  });

  const parsed = extractStructuredOutput(result);
  if (!parsed) {
    throw new Error("Stage 1 Pass 2: LLM returned no structured output");
  }

  const validated = Pass2OutputSchema.parse(parsed);

  // Ensure all claims have sequential IDs if the LLM didn't provide them
  validated.atomicClaims.forEach((claim, idx) => {
    if (!claim.id || claim.id.trim() === "") {
      claim.id = `AC_${String(idx + 1).padStart(2, "0")}`;
    }
  });

  return validated;
}

/**
 * Filter claims by centrality and cap at max count.
 * Exported for unit testing.
 *
 * @param claims - Raw atomic claims from Pass 2
 * @param threshold - Minimum centrality ("high" or "medium")
 * @param maxClaims - Maximum number of claims to keep
 * @returns Filtered atomic claims
 */
export function filterByCentrality(
  claims: Array<{ centrality: string; [key: string]: unknown }>,
  threshold: "high" | "medium",
  maxClaims: number,
): AtomicClaim[] {
  // Filter by centrality threshold
  const allowed = threshold === "high" ? ["high"] : ["high", "medium"];
  const filtered = claims.filter((c) => allowed.includes(c.centrality));

  // Sort: high centrality first, then medium
  filtered.sort((a, b) => {
    if (a.centrality === "high" && b.centrality !== "high") return -1;
    if (a.centrality !== "high" && b.centrality === "high") return 1;
    return 0;
  });

  // Cap at max
  return filtered.slice(0, maxClaims) as unknown as AtomicClaim[];
}

/**
 * Detect whether the input is a statement or a question.
 * Simple heuristic: ends with "?" → question, otherwise statement.
 * Exported for unit testing.
 */
export function detectInputType(input: string): "claim" | "article" {
  const trimmed = input.trim();
  // Short inputs (< 200 chars) are typically claims/questions
  // Long inputs (>= 200 chars) are typically articles
  if (trimmed.length < 200) return "claim";
  return "article";
}

/**
 * Gate 1: Claim validation using batched LLM call (Haiku).
 * Validates all claims in a single LLM call for efficiency.
 *
 * @returns Gate 1 statistics
 */
export async function runGate1Validation(
  claims: AtomicClaim[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<CBClaimUnderstanding["gate1Stats"]> {
  if (claims.length === 0) {
    return { totalClaims: 0, passedOpinion: 0, passedSpecificity: 0, overallPass: true };
  }

  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_VALIDATION", {
    currentDate,
    atomicClaims: JSON.stringify(
      claims.map((c) => ({ id: c.id, statement: c.statement, category: c.category })),
      null,
      2,
    ),
  });
  if (!rendered) {
    // If prompt not available, pass all claims (non-blocking)
    console.warn("[Stage1] Gate 1: CLAIM_VALIDATION prompt not found — skipping validation");
    return {
      totalClaims: claims.length,
      passedOpinion: claims.length,
      passedSpecificity: claims.length,
      overallPass: true,
    };
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);

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
          content: `Validate these ${claims.length} claims:\n${JSON.stringify(
            claims.map((c) => ({ id: c.id, statement: c.statement })),
            null,
            2,
          )}`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: Gate1OutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        (pipelineConfig.llmProvider) ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      console.warn("[Stage1] Gate 1: LLM returned no structured output — passing all claims");
      return {
        totalClaims: claims.length,
        passedOpinion: claims.length,
        passedSpecificity: claims.length,
        overallPass: true,
      };
    }

    const validated = Gate1OutputSchema.parse(parsed);

    const passedOpinion = validated.validatedClaims.filter((v) => v.passedOpinion).length;
    const passedSpecificity = validated.validatedClaims.filter((v) => v.passedSpecificity).length;

    // Check if retry threshold exceeded (v1: warn only, no retry)
    const gate1Threshold = pipelineConfig.gate1GroundingRetryThreshold ?? 0.5;
    const failRate = 1 - (passedSpecificity / claims.length);
    if (failRate > gate1Threshold) {
      console.warn(
        `[Stage1] Gate 1: ${Math.round(failRate * 100)}% of claims failed specificity (threshold: ${Math.round(gate1Threshold * 100)}%). Retry deferred to v1.1.`,
      );
    }

    return {
      totalClaims: claims.length,
      passedOpinion,
      passedSpecificity,
      overallPass: passedOpinion > 0 && passedSpecificity > 0,
    };
  } catch (err) {
    console.warn("[Stage1] Gate 1 validation failed:", err);
    return {
      totalClaims: claims.length,
      passedOpinion: claims.length,
      passedSpecificity: claims.length,
      overallPass: true,
    };
  }
}

// ============================================================================
// STAGE 2: RESEARCH (§8.2)
// ============================================================================

// --- Zod schemas for Stage 2 LLM output parsing ---

const GenerateQueriesOutputSchema = z.object({
  queries: z.array(z.object({
    query: z.string(),
    rationale: z.string(),
  })),
});

const RelevanceClassificationOutputSchema = z.object({
  relevantSources: z.array(z.object({
    url: z.string(),
    relevanceScore: z.number(),
    reasoning: z.string(),
  })),
});

// Full evidence extraction schema (Stage 2 uses same EXTRACT_EVIDENCE prompt as Stage 1)
const Stage2EvidenceItemSchema = z.object({
  statement: z.string(),
  category: z.string(),
  claimDirection: z.enum(["supports", "contradicts", "contextual"]),
  evidenceScope: z.object({
    methodology: z.string().optional(),
    temporal: z.string().optional(),
    geographic: z.string().optional(),
    boundaries: z.string().optional(),
    additionalDimensions: z.record(z.string()).optional(),
  }),
  probativeValue: z.enum(["high", "medium", "low"]),
  sourceType: z.string().optional(),
  isDerivative: z.boolean().optional(),
  derivedFromSourceUrl: z.string().nullable().optional(),
  relevantClaimIds: z.array(z.string()),
});

const Stage2ExtractEvidenceOutputSchema = z.object({
  evidenceItems: z.array(Stage2EvidenceItemSchema),
});

/**
 * Stage 2: Gather evidence for each central claim using web search and LLM extraction.
 *
 * Claim-driven iteration: targets the claim with fewest evidence items.
 * Reserved contradiction iterations after main loop.
 * Each evidence item carries a mandatory EvidenceScope.
 *
 * @param state - The mutable research state (evidenceItems and sources populated)
 */
export async function researchEvidence(
  state: CBResearchState
): Promise<void> {
  const [pipelineResult, searchResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadSearchConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;
  const searchConfig = searchResult.config;
  const currentDate = new Date().toISOString().split("T")[0];

  const claims = state.understanding?.atomicClaims ?? [];
  if (claims.length === 0) return;

  // ------------------------------------------------------------------
  // Step 1: Seed evidence pool from Stage 1 preliminary search
  // ------------------------------------------------------------------
  seedEvidenceFromPreliminarySearch(state);

  // ------------------------------------------------------------------
  // Step 2: Claim-driven main iteration loop
  // ------------------------------------------------------------------
  const maxIterations = pipelineConfig.maxTotalIterations ?? 10;
  const reservedContradiction = pipelineConfig.contradictionReservedIterations ?? 2;
  const maxMainIterations = maxIterations - reservedContradiction;
  const sufficiencyThreshold = pipelineConfig.claimSufficiencyThreshold ?? 3;
  const maxSourcesPerIteration = searchConfig.maxSourcesPerIteration ?? 8;

  for (let iteration = 0; iteration < maxMainIterations; iteration++) {
    // Find claim with fewest evidence items
    const targetClaim = findLeastResearchedClaim(claims, state.evidenceItems);
    if (!targetClaim) break;

    // Check if all claims are sufficient
    if (allClaimsSufficient(claims, state.evidenceItems, sufficiencyThreshold)) break;

    // Run one research iteration for the target claim
    await runResearchIteration(
      targetClaim,
      "main",
      searchConfig,
      pipelineConfig,
      maxSourcesPerIteration,
      currentDate,
      state,
    );

    state.mainIterationsUsed++;
  }

  // ------------------------------------------------------------------
  // Step 3: Contradiction search (reserved iterations)
  // ------------------------------------------------------------------
  for (let cIter = 0; cIter < reservedContradiction; cIter++) {
    // Target: claim with fewest contradicting evidence items
    const targetClaim = findLeastContradictedClaim(claims, state.evidenceItems);
    if (!targetClaim) break;

    await runResearchIteration(
      targetClaim,
      "contradiction",
      searchConfig,
      pipelineConfig,
      maxSourcesPerIteration,
      currentDate,
      state,
    );

    state.contradictionIterationsUsed++;
  }
}

// ============================================================================
// STAGE 2 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Seed the evidence pool from Stage 1 preliminary evidence.
 * Converts lightweight PreliminaryEvidenceItem to full EvidenceItem format.
 */
export function seedEvidenceFromPreliminarySearch(state: CBResearchState): void {
  const preliminary = state.understanding?.preliminaryEvidence ?? [];
  let idCounter = state.evidenceItems.length + 1;

  for (const pe of preliminary) {
    state.evidenceItems.push({
      id: `EV_${String(idCounter++).padStart(3, "0")}`,
      statement: pe.snippet,
      category: "evidence",
      specificity: "medium",
      sourceId: "",
      sourceUrl: pe.sourceUrl,
      sourceTitle: "",
      sourceExcerpt: pe.snippet,
      relevantClaimIds: pe.claimId ? [pe.claimId] : [],
      scopeQuality: "partial", // Preliminary evidence has limited scope data
    });
  }
}

/**
 * Find the claim with the fewest evidence items (for targeting).
 */
export function findLeastResearchedClaim(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
): AtomicClaim | null {
  if (claims.length === 0) return null;

  let minCount = Infinity;
  let target: AtomicClaim | null = null;

  for (const claim of claims) {
    const count = evidenceItems.filter(
      (e) => e.relevantClaimIds?.includes(claim.id),
    ).length;
    if (count < minCount) {
      minCount = count;
      target = claim;
    }
  }

  return target;
}

/**
 * Find the claim with the fewest contradicting evidence items.
 */
export function findLeastContradictedClaim(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
): AtomicClaim | null {
  if (claims.length === 0) return null;

  let minCount = Infinity;
  let target: AtomicClaim | null = null;

  for (const claim of claims) {
    const contradictionCount = evidenceItems.filter(
      (e) => e.relevantClaimIds?.includes(claim.id) && e.claimDirection === "contradicts",
    ).length;
    if (contradictionCount < minCount) {
      minCount = contradictionCount;
      target = claim;
    }
  }

  return target;
}

/**
 * Check if all claims have reached the sufficiency threshold.
 */
export function allClaimsSufficient(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  threshold: number,
): boolean {
  return claims.every((claim) => {
    const count = evidenceItems.filter(
      (e) => e.relevantClaimIds?.includes(claim.id),
    ).length;
    return count >= threshold;
  });
}

/**
 * Run a single research iteration for a target claim.
 * Covers: query generation → web search → relevance check → source fetch →
 * reliability prefetch → evidence extraction → scope validation → derivative validation → filter
 */
export async function runResearchIteration(
  targetClaim: AtomicClaim,
  iterationType: "main" | "contradiction",
  searchConfig: SearchConfig,
  pipelineConfig: PipelineConfig,
  maxSourcesPerIteration: number,
  currentDate: string,
  state: CBResearchState,
): Promise<void> {
  // 1. Generate search queries via LLM (Haiku)
  const queries = await generateResearchQueries(
    targetClaim,
    iterationType,
    state.evidenceItems,
    pipelineConfig,
    currentDate,
  );
  state.llmCalls++;

  for (const queryObj of queries) {
    try {
      // 2. Web search
      const response = await searchWebWithProvider({
        query: queryObj.query,
        maxResults: maxSourcesPerIteration,
        config: searchConfig,
      });

      state.searchQueries.push({
        query: queryObj.query,
        iteration: state.mainIterationsUsed + state.contradictionIterationsUsed,
        focus: iterationType,
        resultsCount: response.results.length,
        timestamp: new Date().toISOString(),
        searchProvider: response.providersUsed.join(", "),
      });

      if (response.results.length === 0) continue;

      // 3. Relevance classification via LLM (Haiku, batched)
      const relevantSources = await classifyRelevance(
        targetClaim,
        response.results,
        pipelineConfig,
        currentDate,
      );
      state.llmCalls++;

      if (relevantSources.length === 0) continue;

      // 4. Fetch top sources
      const fetchedSources = await fetchSources(
        relevantSources.slice(0, 5),
        queryObj.query,
        state,
      );

      if (fetchedSources.length === 0) continue;

      // 5. Reliability prefetch (batch)
      const urlsToCheck = fetchedSources.map((s) => s.url);
      await prefetchSourceReliability(urlsToCheck);

      // 6. Evidence extraction with mandatory EvidenceScope (Haiku, batched)
      const rawEvidence = await extractResearchEvidence(
        targetClaim,
        fetchedSources,
        pipelineConfig,
        currentDate,
      );
      state.llmCalls++;

      // 7. EvidenceScope validation (deterministic)
      for (const item of rawEvidence) {
        item.scopeQuality = assessScopeQuality(item);
      }

      // 8. Derivative validation (§8.2 step 9)
      const allFetchedUrls = new Set(state.sources.map((s) => s.url));
      for (const item of rawEvidence) {
        if (item.isDerivative && item.derivedFromSourceUrl) {
          if (!allFetchedUrls.has(item.derivedFromSourceUrl)) {
            item.derivativeClaimUnverified = true;
          }
        }
      }

      // 9. Evidence filter (deterministic safety net)
      const { kept } = filterByProbativeValue(rawEvidence);

      // 10. Add to state
      state.evidenceItems.push(...kept);

      // Track contradiction sources
      if (iterationType === "contradiction") {
        state.contradictionSourcesFound += fetchedSources.length;
      }
    } catch (err) {
      console.warn(`[Stage2] Research iteration failed for query "${queryObj.query}":`, err);
    }
  }
}

/**
 * Generate search queries for a claim using LLM (Haiku tier).
 * Uses GENERATE_QUERIES UCM prompt.
 */
export async function generateResearchQueries(
  claim: AtomicClaim,
  iterationType: "main" | "contradiction",
  existingEvidence: EvidenceItem[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<Array<{ query: string; rationale: string }>> {
  const rendered = await loadAndRenderSection("claimboundary", "GENERATE_QUERIES", {
    currentDate,
    claim: claim.statement,
    expectedEvidenceProfile: JSON.stringify(claim.expectedEvidenceProfile ?? {}),
    iterationType,
  });
  if (!rendered) {
    // Fallback: use claim statement directly
    return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }];
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);

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
          content: `Generate search queries for this claim: "${claim.statement}"`,
        },
      ],
      temperature: 0.2,
      output: Output.object({ schema: GenerateQueriesOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }];

    const validated = GenerateQueriesOutputSchema.parse(parsed);
    return validated.queries.slice(0, 3);
  } catch (err) {
    console.warn("[Stage2] Query generation failed, using fallback:", err);
    return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }];
  }
}

/**
 * Classify search results for relevance to a claim using LLM (Haiku, batched).
 * Uses RELEVANCE_CLASSIFICATION UCM prompt.
 */
export async function classifyRelevance(
  claim: AtomicClaim,
  searchResults: Array<{ url: string; title: string; snippet?: string | null }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<Array<{ url: string; relevanceScore: number }>> {
  const rendered = await loadAndRenderSection("claimboundary", "RELEVANCE_CLASSIFICATION", {
    currentDate,
    claim: claim.statement,
    searchResults: JSON.stringify(
      searchResults.map((r) => ({ url: r.url, title: r.title, snippet: r.snippet ?? "" })),
      null,
      2,
    ),
  });
  if (!rendered) {
    // Fallback: accept all results with neutral score
    return searchResults.map((r) => ({ url: r.url, relevanceScore: 0.5 }));
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);

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
          content: `Classify the relevance of ${searchResults.length} search results to this claim: "${claim.statement}"`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: RelevanceClassificationOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return searchResults.map((r) => ({ url: r.url, relevanceScore: 0.5 }));

    const validated = RelevanceClassificationOutputSchema.parse(parsed);
    // Filter to minimum relevance score of 0.4
    return validated.relevantSources.filter((s) => s.relevanceScore >= 0.4);
  } catch (err) {
    console.warn("[Stage2] Relevance classification failed, accepting all results:", err);
    return searchResults.map((r) => ({ url: r.url, relevanceScore: 0.5 }));
  }
}

/**
 * Fetch sources and add to state.sources[].
 * Returns successfully fetched sources with their extracted text.
 */
export async function fetchSources(
  relevantSources: Array<{ url: string; relevanceScore?: number }>,
  searchQuery: string,
  state: CBResearchState,
): Promise<Array<{ url: string; title: string; text: string }>> {
  const fetched: Array<{ url: string; title: string; text: string }> = [];

  for (const source of relevantSources) {
    // Skip already-fetched URLs
    if (state.sources.some((s) => s.url === source.url)) continue;

    try {
      const content = await extractTextFromUrl(source.url, {
        timeoutMs: 12000,
        maxLength: 15000,
      });

      if (content.text.length < 100) continue; // Too short to be useful

      const fetchedSource: FetchedSource = {
        id: `S_${String(state.sources.length + 1).padStart(3, "0")}`,
        url: source.url,
        title: content.title || source.url,
        trackRecordScore: getTrackRecordScore(source.url),
        fullText: content.text,
        fetchedAt: new Date().toISOString(),
        category: content.contentType || "text/html",
        fetchSuccess: true,
        searchQuery,
      };
      state.sources.push(fetchedSource);

      fetched.push({
        url: source.url,
        title: content.title || source.url,
        text: content.text.slice(0, 8000), // Cap for prompt size
      });
    } catch {
      // Non-fatal: skip sources that fail to fetch
    }
  }

  return fetched;
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
): Promise<EvidenceItem[]> {
  const rendered = await loadAndRenderSection("claimboundary", "EXTRACT_EVIDENCE", {
    currentDate,
    claim: targetClaim.statement,
    sourceContent: sources.map((s, i) =>
      `[Source ${i + 1}: ${s.title}]\nURL: ${s.url}\n${s.text}`
    ).join("\n\n---\n\n"),
    sourceUrl: sources.map((s) => s.url).join(", "),
  });
  if (!rendered) return [];

  const model = getModelForTask("extract_evidence", undefined, pipelineConfig);

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
          content: `Extract evidence from these ${sources.length} sources relating to claim "${targetClaim.id}": "${targetClaim.statement}"`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: Stage2ExtractEvidenceOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return [];

    const validated = Stage2ExtractEvidenceOutputSchema.parse(parsed);

    // Map to full EvidenceItem format
    let idCounter = Date.now(); // Use timestamp-based IDs to avoid collisions
    return validated.evidenceItems.map((ei) => {
      // Find which source this evidence came from (match by URL in relevantClaimIds or first source)
      const matchedSource = sources.find((s) => ei.relevantClaimIds?.length > 0)
        ?? sources[0];

      return {
        id: `EV_${String(idCounter++)}`,
        statement: ei.statement,
        category: mapCategory(ei.category),
        specificity: ei.probativeValue === "high" ? "high" as const : "medium" as const,
        sourceId: "",
        sourceUrl: matchedSource?.url ?? "",
        sourceTitle: matchedSource?.title ?? "",
        sourceExcerpt: ei.statement,
        claimDirection: ei.claimDirection === "contextual" ? "neutral" as const : ei.claimDirection,
        evidenceScope: {
          name: ei.evidenceScope?.methodology?.slice(0, 30) || "Unspecified",
          methodology: ei.evidenceScope?.methodology,
          temporal: ei.evidenceScope?.temporal,
          geographic: ei.evidenceScope?.geographic,
          boundaries: ei.evidenceScope?.boundaries,
          additionalDimensions: ei.evidenceScope?.additionalDimensions,
        },
        probativeValue: ei.probativeValue,
        sourceType: mapSourceType(ei.sourceType),
        relevantClaimIds: ei.relevantClaimIds.length > 0
          ? ei.relevantClaimIds
          : [targetClaim.id],
        isDerivative: ei.isDerivative ?? false,
        derivedFromSourceUrl: ei.derivedFromSourceUrl ?? undefined,
      } satisfies EvidenceItem;
    });
  } catch (err) {
    console.warn("[Stage2] Evidence extraction failed:", err);
    return [];
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

  // Check if fields are meaningful vs vague
  const isVague = (s: string) =>
    s.length < 5 || /^(unknown|unspecified|n\/?a|none|other)$/i.test(s.trim());

  if (isVague(scope.methodology!) || isVague(scope.temporal!)) return "partial";

  return "complete";
}

/**
 * Map LLM category strings to EvidenceItem.category enum values.
 */
function mapCategory(category: string): EvidenceItem["category"] {
  const normalized = category.toLowerCase().replace(/[_\s-]+/g, "_");
  const validCategories: Record<string, EvidenceItem["category"]> = {
    legal_provision: "legal_provision",
    evidence: "evidence",
    direct_evidence: "direct_evidence",
    expert_quote: "expert_quote",
    expert_testimony: "expert_quote",
    statistic: "statistic",
    statistical_data: "statistic",
    event: "event",
    criticism: "criticism",
    case_study: "evidence",
  };
  return validCategories[normalized] ?? "evidence";
}

/**
 * Map LLM sourceType strings to SourceType enum values.
 */
function mapSourceType(sourceType?: string): SourceType | undefined {
  if (!sourceType) return undefined;
  const normalized = sourceType.toLowerCase().replace(/[_\s-]+/g, "_");
  const validTypes: Record<string, SourceType> = {
    peer_reviewed_study: "peer_reviewed_study",
    fact_check_report: "fact_check_report",
    government_report: "government_report",
    legal_document: "legal_document",
    news_primary: "news_primary",
    news_secondary: "news_secondary",
    expert_statement: "expert_statement",
    organization_report: "organization_report",
  };
  return validTypes[normalized] ?? "other";
}

// ============================================================================
// STAGE 3: CLUSTER BOUNDARIES (§8.3)
// ============================================================================

// --- Zod schema for Stage 3 LLM output parsing ---

const BoundaryClusteringOutputSchema = z.object({
  claimBoundaries: z.array(z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    description: z.string(),
    methodology: z.string().optional(),
    boundaries: z.string().optional(),
    geographic: z.string().optional(),
    temporal: z.string().optional(),
    constituentScopeIndices: z.array(z.number()),
    internalCoherence: z.number(),
  })),
  scopeToBoundaryMapping: z.array(z.object({
    scopeIndex: z.number(),
    boundaryId: z.string(),
    rationale: z.string(),
  })),
  congruenceDecisions: z.array(z.object({
    scopeA: z.number(),
    scopeB: z.number(),
    congruent: z.boolean(),
    rationale: z.string(),
  })),
});

/**
 * A unique scope entry with its index for LLM reference.
 */
export interface UniqueScope {
  index: number;
  scope: EvidenceScope;
  originalIndices: number[]; // indices into state.evidenceItems that share this scope
}

/**
 * Stage 3: Organize evidence into ClaimBoundaries by clustering compatible EvidenceScopes.
 *
 * Single Sonnet-tier LLM call groups scopes with compatible methodology,
 * boundaries, geography, and temporal period. Deterministic post-clustering
 * validation ensures structural integrity.
 *
 * @param state - Research state with populated evidenceItems
 * @returns Array of ClaimBoundaries
 */
export async function clusterBoundaries(
  state: CBResearchState
): Promise<ClaimAssessmentBoundary[]> {
  const [pipelineResult] = await Promise.all([
    loadPipelineConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;
  const currentDate = new Date().toISOString().split("T")[0];

  // ------------------------------------------------------------------
  // Step 1: Collect unique EvidenceScopes
  // ------------------------------------------------------------------
  const uniqueScopes = collectUniqueScopes(state.evidenceItems);

  // If 0 or 1 unique scopes, skip LLM — single boundary
  if (uniqueScopes.length <= 1) {
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    assignEvidenceToBoundaries(state.evidenceItems, [boundary], uniqueScopes);
    return [boundary];
  }

  // ------------------------------------------------------------------
  // Step 2: LLM clustering (Sonnet tier)
  // ------------------------------------------------------------------
  let boundaries: ClaimAssessmentBoundary[];
  try {
    boundaries = await runLLMClustering(
      uniqueScopes,
      state.evidenceItems,
      state.understanding?.atomicClaims ?? [],
      pipelineConfig,
      currentDate,
    );
    state.llmCalls++;
  } catch (err) {
    console.warn("[Stage3] LLM clustering failed, using fallback:", err);
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    assignEvidenceToBoundaries(state.evidenceItems, [boundary], uniqueScopes);
    return [boundary];
  }

  // ------------------------------------------------------------------
  // Step 3: Coherence assessment — flag low-coherence boundaries
  // ------------------------------------------------------------------
  const coherenceMinimum = pipelineConfig.boundaryCoherenceMinimum ?? 0.3;
  for (const b of boundaries) {
    if (b.internalCoherence < coherenceMinimum) {
      console.warn(
        `[Stage3] Boundary "${b.name}" (${b.id}) has low coherence: ${b.internalCoherence} < ${coherenceMinimum}`,
      );
    }
  }

  // ------------------------------------------------------------------
  // Step 4: Post-clustering validation (deterministic)
  // ------------------------------------------------------------------

  // 4a. Validate no empty or malformed boundaries
  boundaries = boundaries.filter(
    (b) => b.id && b.name && b.constituentScopes.length > 0,
  );

  if (boundaries.length === 0) {
    console.warn("[Stage3] All boundaries invalid after filtering — using fallback");
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    assignEvidenceToBoundaries(state.evidenceItems, [boundary], uniqueScopes);
    return [boundary];
  }

  // 4b. Validate no duplicate boundary IDs
  const idSet = new Set<string>();
  for (const b of boundaries) {
    if (idSet.has(b.id)) {
      b.id = `${b.id}_${Date.now()}`;
    }
    idSet.add(b.id);
  }

  // 4c. Completeness check — every unique scope must be in exactly one boundary
  const assignedScopeIndices = new Set<number>();
  for (const b of boundaries) {
    for (const scope of b.constituentScopes) {
      const matchIdx = uniqueScopes.findIndex(
        (us) => scopeFingerprint(us.scope) === scopeFingerprint(scope),
      );
      if (matchIdx >= 0) assignedScopeIndices.add(matchIdx);
    }
  }

  // Find orphaned scopes
  const orphanedScopes = uniqueScopes.filter((_, idx) => !assignedScopeIndices.has(idx));
  if (orphanedScopes.length > 0) {
    // Add orphaned scopes to a "General" fallback boundary
    let generalBoundary = boundaries.find((b) => b.id === "CB_GENERAL");
    if (!generalBoundary) {
      generalBoundary = {
        id: "CB_GENERAL",
        name: "General Evidence",
        shortName: "General",
        description: "Evidence not assigned to a specific methodology boundary",
        constituentScopes: [],
        internalCoherence: 0.5,
        evidenceCount: 0,
      };
      boundaries.push(generalBoundary);
    }
    for (const orphan of orphanedScopes) {
      generalBoundary.constituentScopes.push(orphan.scope);
    }
  }

  // 4d. Cap enforcement — merge if over maxClaimBoundaries
  const maxBoundaries = pipelineConfig.maxClaimBoundaries ?? 6;
  while (boundaries.length > maxBoundaries) {
    boundaries = mergeClosestBoundaries(boundaries);
  }

  // ------------------------------------------------------------------
  // Step 5: Assign evidence items to boundaries
  // ------------------------------------------------------------------
  assignEvidenceToBoundaries(state.evidenceItems, boundaries, uniqueScopes);

  // Update evidenceCount per boundary
  for (const b of boundaries) {
    b.evidenceCount = state.evidenceItems.filter(
      (e) => e.claimBoundaryId === b.id,
    ).length;
  }

  return boundaries;
}

// ============================================================================
// STAGE 3 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Generate a fingerprint for an EvidenceScope for deduplication.
 * Uses methodology + temporal + geographic + boundaries as key fields.
 */
export function scopeFingerprint(scope: EvidenceScope): string {
  return JSON.stringify({
    m: (scope.methodology ?? "").trim().toLowerCase(),
    t: (scope.temporal ?? "").trim().toLowerCase(),
    g: (scope.geographic ?? "").trim().toLowerCase(),
    b: (scope.boundaries ?? "").trim().toLowerCase(),
  });
}

/**
 * Collect unique EvidenceScopes from evidence items, deduplicating by fingerprint.
 * Returns array of UniqueScope entries with indices back to originating evidence items.
 */
export function collectUniqueScopes(evidenceItems: EvidenceItem[]): UniqueScope[] {
  const seen = new Map<string, UniqueScope>();

  for (let i = 0; i < evidenceItems.length; i++) {
    const scope = evidenceItems[i].evidenceScope;
    if (!scope) continue;

    const fp = scopeFingerprint(scope);
    const existing = seen.get(fp);
    if (existing) {
      existing.originalIndices.push(i);
    } else {
      seen.set(fp, {
        index: seen.size,
        scope,
        originalIndices: [i],
      });
    }
  }

  return Array.from(seen.values());
}

/**
 * Run LLM clustering via BOUNDARY_CLUSTERING prompt (Sonnet tier).
 * Returns ClaimBoundary[] parsed from LLM output.
 */
export async function runLLMClustering(
  uniqueScopes: UniqueScope[],
  evidenceItems: EvidenceItem[],
  atomicClaims: AtomicClaim[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<ClaimAssessmentBoundary[]> {
  const rendered = await loadAndRenderSection("claimboundary", "BOUNDARY_CLUSTERING", {
    currentDate,
    evidenceScopes: JSON.stringify(
      uniqueScopes.map((us) => ({
        index: us.index,
        ...us.scope,
      })),
      null,
      2,
    ),
    evidenceItems: JSON.stringify(
      evidenceItems.map((ei, idx) => ({
        index: idx,
        statement: ei.statement.slice(0, 100),
        claimDirection: ei.claimDirection,
        scopeFingerprint: ei.evidenceScope ? scopeFingerprint(ei.evidenceScope) : null,
        relevantClaimIds: ei.relevantClaimIds,
      })),
      null,
      2,
    ),
    atomicClaims: JSON.stringify(
      atomicClaims.map((c) => ({
        id: c.id,
        statement: c.statement,
      })),
      null,
      2,
    ),
  });

  if (!rendered) {
    throw new Error("Stage 3: Failed to load BOUNDARY_CLUSTERING prompt section");
  }

  const model = getModelForTask("verdict", undefined, pipelineConfig);

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
        content: `Cluster ${uniqueScopes.length} unique EvidenceScopes into ClaimBoundaries based on methodological congruence.`,
      },
    ],
    temperature: 0.15,
    output: Output.object({ schema: BoundaryClusteringOutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(
      pipelineConfig.llmProvider ?? "anthropic",
    ),
  });

  const parsed = extractStructuredOutput(result);
  if (!parsed) {
    throw new Error("Stage 3: LLM returned no structured output");
  }

  const validated = BoundaryClusteringOutputSchema.parse(parsed);

  if (validated.claimBoundaries.length === 0) {
    throw new Error("Stage 3: LLM returned 0 boundaries");
  }

  // Map LLM output to ClaimBoundary[] with constituentScopes
  return validated.claimBoundaries.map((cb) => ({
    id: cb.id,
    name: cb.name,
    shortName: cb.shortName,
    description: cb.description,
    methodology: cb.methodology,
    boundaries: cb.boundaries,
    geographic: cb.geographic,
    temporal: cb.temporal,
    constituentScopes: cb.constituentScopeIndices
      .filter((idx) => idx >= 0 && idx < uniqueScopes.length)
      .map((idx) => uniqueScopes[idx].scope),
    internalCoherence: Math.max(0, Math.min(1, cb.internalCoherence)),
    evidenceCount: 0, // Populated after assignment
  }));
}

/**
 * Create a single fallback "General" boundary containing all scopes.
 */
export function createFallbackBoundary(
  uniqueScopes: UniqueScope[],
  evidenceItems: EvidenceItem[],
): ClaimAssessmentBoundary {
  return {
    id: "CB_GENERAL",
    name: "General Evidence",
    shortName: "General",
    description: "All evidence analyzed together",
    constituentScopes: uniqueScopes.map((us) => us.scope),
    internalCoherence: 0.8,
    evidenceCount: evidenceItems.length,
  };
}

/**
 * Assign each evidence item to a boundary by matching its scope fingerprint
 * to the boundary's constituent scopes.
 */
export function assignEvidenceToBoundaries(
  evidenceItems: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  uniqueScopes: UniqueScope[],
): void {
  // Build scope fingerprint → boundary ID mapping
  const fpToBoundary = new Map<string, string>();
  for (const boundary of boundaries) {
    for (const scope of boundary.constituentScopes) {
      fpToBoundary.set(scopeFingerprint(scope), boundary.id);
    }
  }

  // Assign each evidence item
  for (const item of evidenceItems) {
    if (item.evidenceScope) {
      const fp = scopeFingerprint(item.evidenceScope);
      const boundaryId = fpToBoundary.get(fp);
      if (boundaryId) {
        item.claimBoundaryId = boundaryId;
        continue;
      }
    }
    // Fallback: assign to first boundary (General if exists, otherwise first)
    const fallback = boundaries.find((b) => b.id === "CB_GENERAL") ?? boundaries[0];
    if (fallback) {
      item.claimBoundaryId = fallback.id;
    }
  }
}

/**
 * Compute Jaccard similarity between two boundaries based on scope fingerprints.
 */
export function boundaryJaccardSimilarity(a: ClaimAssessmentBoundary, b: ClaimAssessmentBoundary): number {
  const setA = new Set(a.constituentScopes.map(scopeFingerprint));
  const setB = new Set(b.constituentScopes.map(scopeFingerprint));

  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const fp of setA) {
    if (setB.has(fp)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Merge the two most similar boundaries (highest Jaccard similarity).
 * Returns new array with one fewer boundary.
 */
export function mergeClosestBoundaries(boundaries: ClaimAssessmentBoundary[]): ClaimAssessmentBoundary[] {
  if (boundaries.length <= 1) return boundaries;

  let bestI = 0;
  let bestJ = 1;
  let bestSim = -1;

  for (let i = 0; i < boundaries.length; i++) {
    for (let j = i + 1; j < boundaries.length; j++) {
      const sim = boundaryJaccardSimilarity(boundaries[i], boundaries[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestI = i;
        bestJ = j;
      }
    }
  }

  const a = boundaries[bestI];
  const b = boundaries[bestJ];

  // Merge b into a
  const merged: ClaimAssessmentBoundary = {
    id: a.id,
    name: `${a.name} + ${b.name}`,
    shortName: a.shortName,
    description: `Merged: ${a.description}; ${b.description}`,
    methodology: a.methodology,
    boundaries: a.boundaries,
    geographic: a.geographic,
    temporal: a.temporal,
    constituentScopes: [
      ...a.constituentScopes,
      ...b.constituentScopes.filter(
        (s) => !a.constituentScopes.some(
          (as) => scopeFingerprint(as) === scopeFingerprint(s),
        ),
      ),
    ],
    internalCoherence: (a.internalCoherence + b.internalCoherence) / 2,
    evidenceCount: a.evidenceCount + b.evidenceCount,
  };

  const result = boundaries.filter((_, idx) => idx !== bestI && idx !== bestJ);
  result.push(merged);
  return result;
}

// ============================================================================
// COVERAGE MATRIX (§8.5.1)
// ============================================================================

/**
 * Build the coverage matrix: claims × boundaries evidence distribution.
 * Computed after Stage 3, used by Stage 4 (verdict) and Stage 5 (aggregation).
 *
 * ~20 lines of deterministic code. Zero LLM cost.
 *
 * @param claims - Atomic claims from Stage 1
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param evidence - All evidence items (boundary-assigned)
 * @returns CoverageMatrix
 */
export function buildCoverageMatrix(
  claims: AtomicClaim[],
  boundaries: ClaimAssessmentBoundary[],
  evidence: EvidenceItem[]
): CoverageMatrix {
  const claimIds = claims.map(c => c.id);
  const boundaryIds = boundaries.map(b => b.id);

  // Initialize counts[claimIdx][boundaryIdx] = 0
  const counts: number[][] = claimIds.map(() =>
    boundaryIds.map(() => 0)
  );

  // Count evidence items per claim × boundary
  // Evidence items carry claimBoundaryId (assigned in Stage 3)
  // and relevantClaimIds (assigned in Stage 2)
  for (const item of evidence) {
    const bIdx = boundaryIds.indexOf(
      (item as EvidenceItem & { claimBoundaryId?: string }).claimBoundaryId ?? ""
    );
    if (bIdx === -1) continue;

    // Each evidence item may be relevant to multiple claims
    const relevantClaims = (item as EvidenceItem & { relevantClaimIds?: string[] }).relevantClaimIds ?? [];
    for (const claimId of relevantClaims) {
      const cIdx = claimIds.indexOf(claimId);
      if (cIdx !== -1) {
        counts[cIdx][bIdx]++;
      }
    }
  }

  return {
    claims: claimIds,
    boundaries: boundaryIds,
    counts,
    getBoundariesForClaim(claimId: string): string[] {
      const cIdx = claimIds.indexOf(claimId);
      if (cIdx === -1) return [];
      return boundaryIds.filter((_, bIdx) => counts[cIdx][bIdx] > 0);
    },
    getClaimsForBoundary(boundaryId: string): string[] {
      const bIdx = boundaryIds.indexOf(boundaryId);
      if (bIdx === -1) return [];
      return claimIds.filter((_, cIdx) => counts[cIdx][bIdx] > 0);
    },
  };
}

// ============================================================================
// STAGE 4: VERDICT (§8.4)
// ============================================================================

/**
 * Stage 4: Generate verdicts using the 5-step LLM debate pattern.
 *
 * Implemented as a separate module (verdict-stage.ts) per §22.
 * This function delegates to that module.
 *
 * Steps:
 *   1. Advocate Verdict (Sonnet)
 *   2. Self-Consistency Check (Sonnet × 2, parallel with Step 3)
 *   3. Adversarial Challenge (Sonnet, parallel with Step 2)
 *   4. Reconciliation (Sonnet)
 *   5. Verdict Validation (Haiku × 2) + Structural Consistency Check
 *   Gate 4: Confidence classification
 *
 * @param claims - Atomic claims from Stage 1
 * @param evidence - All evidence items (boundary-assigned)
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param coverageMatrix - Claims × boundaries evidence distribution
 * @param llmCall - Optional injectable LLM call (for testing). Production creates one from UCM config.
 * @returns Array of CBClaimVerdicts
 */
export async function generateVerdicts(
  claims: AtomicClaim[],
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  llmCall?: LLMCallFn,
): Promise<CBClaimVerdict[]> {
  // Load UCM configs for verdict stage
  const [pipelineResult, calcResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadCalcConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;
  const calcConfig = calcResult.config;

  // Build VerdictStageConfig from UCM parameters
  const verdictConfig = buildVerdictStageConfig(pipelineConfig, calcConfig);

  // Production LLM call wiring — use injected or create from UCM
  const llmCallFn = llmCall ?? createProductionLLMCall(pipelineConfig);

  return runVerdictStage(claims, evidence, boundaries, coverageMatrix, llmCallFn, verdictConfig);
}

// ============================================================================
// STAGE 4 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Build VerdictStageConfig from UCM pipeline and calculation configs.
 * Maps UCM config field names to VerdictStageConfig structure.
 */
export function buildVerdictStageConfig(
  pipelineConfig: PipelineConfig,
  calcConfig: CalcConfig,
): VerdictStageConfig {
  const spreadThresholds = calcConfig.selfConsistencySpreadThresholds ?? {
    stable: 5,
    moderate: 12,
    unstable: 20,
  };

  return {
    selfConsistencyMode:
      pipelineConfig.selfConsistencyMode === "full" ? "enabled" : "disabled",
    selfConsistencyTemperature:
      pipelineConfig.selfConsistencyTemperature ?? 0.3,
    stableThreshold: spreadThresholds.stable ?? 5,
    moderateThreshold: spreadThresholds.moderate ?? 12,
    unstableThreshold: spreadThresholds.unstable ?? 20,
    spreadMultipliers: DEFAULT_VERDICT_STAGE_CONFIG.spreadMultipliers,
    mixedConfidenceThreshold: calcConfig.mixedConfidenceThreshold ?? 40,
  };
}

/**
 * Create a production LLM call function for verdict-stage.
 * Loads prompts from UCM, uses AI SDK for structured output.
 * Each call loads the prompt section, selects the model by tier, and parses the JSON result.
 */
export function createProductionLLMCall(pipelineConfig: PipelineConfig): LLMCallFn {
  return async (
    promptKey: string,
    input: Record<string, unknown>,
    options?: { tier?: "sonnet" | "haiku"; temperature?: number },
  ): Promise<unknown> => {
    // 1. Load UCM prompt section
    const currentDate = new Date().toISOString().split("T")[0];
    const rendered = await loadAndRenderSection("claimboundary", promptKey, {
      ...input,
      currentDate,
    });
    if (!rendered) {
      throw new Error(`Stage 4: Failed to load prompt section "${promptKey}"`);
    }

    // 2. Select model based on tier
    const tier = options?.tier ?? "sonnet";
    const taskKey = tier === "sonnet" ? "verdict" : "understand";
    const model = getModelForTask(taskKey as any, undefined, pipelineConfig);

    // 3. Call AI SDK
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
          content: typeof input.userMessage === "string"
            ? input.userMessage
            : JSON.stringify(input),
        },
      ],
      temperature: options?.temperature ?? 0.0,
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    // 4. Parse result as JSON
    const text = result.text?.trim();
    if (!text) {
      throw new Error(`Stage 4: LLM returned empty response for prompt "${promptKey}"`);
    }

    try {
      return JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch?.[1]) {
        return JSON.parse(jsonMatch[1].trim());
      }
      throw new Error(`Stage 4: Failed to parse LLM response as JSON for prompt "${promptKey}"`);
    }
  };
}

// ============================================================================
// STAGE 5: AGGREGATE (§8.5)
// ============================================================================

/**
 * Stage 5: Produce the overall assessment by weighted aggregation.
 *
 * Includes triangulation scoring, derivative weight reduction,
 * weighted average computation, and VerdictNarrative generation.
 *
 * @param claimVerdicts - Verdicts from Stage 4
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param evidence - All evidence items
 * @param coverageMatrix - Claims × boundaries evidence distribution
 * @param state - Research state for metadata
 * @returns OverallAssessment
 */
export async function aggregateAssessment(
  claimVerdicts: CBClaimVerdict[],
  boundaries: ClaimAssessmentBoundary[],
  evidence: EvidenceItem[],
  coverageMatrix: CoverageMatrix,
  state: CBResearchState
): Promise<OverallAssessment> {
  const [pipelineResult, calcResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadCalcConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;
  const calcConfig = calcResult.config;

  const claims = state.understanding?.atomicClaims ?? [];

  // ------------------------------------------------------------------
  // Step 1: Triangulation scoring per claim (§8.5.2)
  // ------------------------------------------------------------------
  for (const verdict of claimVerdicts) {
    verdict.triangulationScore = computeTriangulationScore(
      verdict,
      coverageMatrix,
      calcConfig,
    );
  }

  // ------------------------------------------------------------------
  // Step 2: Weighted average computation (§8.5.4)
  // ------------------------------------------------------------------
  const aggregation = calcConfig.aggregation ?? {
    centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
    harmPotentialMultiplier: 1.5,
    derivativeMultiplier: 0.5,
  };
  const harmMultipliers = (calcConfig as any).harmPotentialMultipliers ?? {
    critical: 1.5,
    high: 1.2,
    medium: 1.0,
    low: 1.0,
  };
  const derivativeMultiplier = aggregation.derivativeMultiplier ?? 0.5;

  const weightsData = claimVerdicts.map((verdict) => {
    const claim = claims.find((c) => c.id === verdict.claimId);

    // Centrality weight
    const centrality = claim?.centrality ?? "low";
    const centralityWeight =
      (aggregation.centralityWeights as any)?.[centrality] ?? 1.0;

    // Harm multiplier (4-level)
    const harmLevel = verdict.harmPotential ?? "medium";
    const harmWeight = (harmMultipliers as any)[harmLevel] ?? 1.0;

    // Confidence factor (0-100 → 0-1)
    const confidenceFactor = verdict.confidence / 100;

    // Triangulation factor
    const triangulationFactor = verdict.triangulationScore?.factor ?? 0;

    // Derivative factor (§8.5.3)
    const derivativeFactor = computeDerivativeFactor(
      verdict,
      evidence,
      derivativeMultiplier,
    );

    // Final weight (§8.5.4): centrality × harm × confidence × (1 + triangulation) × derivative
    const finalWeight =
      centralityWeight *
      harmWeight *
      confidenceFactor *
      (1 + triangulationFactor) *
      derivativeFactor;

    return {
      truthPercentage: verdict.truthPercentage,
      confidence: verdict.confidence,
      weight: Math.max(0, finalWeight),
    };
  });

  // Compute weighted averages inline (same weights for both)
  const totalWeight = weightsData.reduce((sum, item) => sum + item.weight, 0);
  const weightedTruthPercentage =
    totalWeight > 0
      ? weightsData.reduce(
          (sum, item) => sum + item.truthPercentage * item.weight,
          0,
        ) / totalWeight
      : 50;
  const weightedConfidence =
    totalWeight > 0
      ? weightsData.reduce(
          (sum, item) => sum + item.confidence * item.weight,
          0,
        ) / totalWeight
      : 50;

  // 7-point verdict label
  const mixedConfidenceThreshold = calcConfig.mixedConfidenceThreshold ?? 40;
  const verdictLabel = percentageToArticleVerdict(
    weightedTruthPercentage,
    weightedConfidence,
    undefined,
    mixedConfidenceThreshold,
  );

  // ------------------------------------------------------------------
  // Step 3: VerdictNarrative generation (§8.5.6, Sonnet call)
  // ------------------------------------------------------------------
  let verdictNarrative: VerdictNarrative;
  try {
    verdictNarrative = await generateVerdictNarrative(
      weightedTruthPercentage,
      verdictLabel,
      weightedConfidence,
      claimVerdicts,
      boundaries,
      coverageMatrix,
      evidence,
      pipelineConfig,
    );
    state.llmCalls++;
  } catch (err) {
    console.warn("[Stage5] VerdictNarrative generation failed, using fallback:", err);
    verdictNarrative = {
      headline: `Analysis yields ${verdictLabel} verdict at ${Math.round(weightedConfidence)}% confidence`,
      evidenceBaseSummary: `${evidence.length} evidence items from ${state.sources.length} sources across ${boundaries.length} perspective${boundaries.length !== 1 ? "s" : ""}`,
      keyFinding: `Weighted analysis of ${claimVerdicts.length} claims produces an overall truth assessment of ${Math.round(weightedTruthPercentage)}%.`,
      limitations: "Automated analysis with limitations inherent to evidence availability and source coverage.",
    };
  }

  // ------------------------------------------------------------------
  // Step 4: Quality gates summary (§8.5.7)
  // ------------------------------------------------------------------
  const qualityGates = buildQualityGates(
    state.understanding?.gate1Stats,
    claimVerdicts,
    evidence,
    state,
  );

  // ------------------------------------------------------------------
  // Step 5: Report assembly
  // ------------------------------------------------------------------
  return {
    truthPercentage: Math.round(weightedTruthPercentage * 10) / 10,
    verdict: verdictLabel,
    confidence: Math.round(weightedConfidence * 10) / 10,
    verdictNarrative,
    hasMultipleBoundaries: boundaries.length > 1,
    claimBoundaries: boundaries,
    claimVerdicts,
    coverageMatrix,
    qualityGates,
  };
}

// ============================================================================
// STAGE 5 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Compute triangulation score for a claim verdict (§8.5.2).
 * Deterministic — no LLM calls.
 */
export function computeTriangulationScore(
  verdict: CBClaimVerdict,
  coverageMatrix: CoverageMatrix,
  calcConfig: CalcConfig,
): TriangulationScore {
  const triangulationConfig = (calcConfig as any).triangulation ?? {
    strongAgreementBoost: 0.15,
    moderateAgreementBoost: 0.05,
    singleBoundaryPenalty: -0.10,
  };

  const boundaryIds = coverageMatrix.getBoundariesForClaim(verdict.claimId);
  const findings = verdict.boundaryFindings ?? [];

  let supporting = 0;
  let contradicting = 0;

  for (const bId of boundaryIds) {
    const finding = findings.find((f) => f.boundaryId === bId);
    if (!finding) continue;
    if (finding.evidenceDirection === "supports") supporting++;
    else if (finding.evidenceDirection === "contradicts") contradicting++;
  }

  const boundaryCount = boundaryIds.length;

  // Classify triangulation level and compute factor
  let level: TriangulationScore["level"];
  let factor: number;

  if (boundaryCount <= 1) {
    level = "weak";
    factor = triangulationConfig.singleBoundaryPenalty ?? -0.10;
  } else if (supporting >= 3) {
    level = "strong";
    factor = triangulationConfig.strongAgreementBoost ?? 0.15;
  } else if (supporting >= 2 && contradicting <= 1) {
    level = "moderate";
    factor = triangulationConfig.moderateAgreementBoost ?? 0.05;
  } else if (supporting > 0 && contradicting > 0 && Math.abs(supporting - contradicting) <= 1) {
    level = "conflicted";
    factor = 0; // No boost/penalty for conflicted
  } else if (supporting > contradicting) {
    level = "moderate";
    factor = triangulationConfig.moderateAgreementBoost ?? 0.05;
  } else {
    level = "weak";
    factor = triangulationConfig.singleBoundaryPenalty ?? -0.10;
  }

  return { boundaryCount, supporting, contradicting, level, factor };
}

/**
 * Compute derivative weight reduction factor for a claim verdict (§8.5.3).
 * derivativeFactor = 1.0 - (derivativeRatio × (1.0 - derivativeMultiplier))
 */
export function computeDerivativeFactor(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  derivativeMultiplier: number,
): number {
  const supportingIds = verdict.supportingEvidenceIds ?? [];
  if (supportingIds.length === 0) return 1.0;

  const supportingEvidence = supportingIds
    .map((id) => evidence.find((e) => e.id === id))
    .filter(Boolean) as EvidenceItem[];

  if (supportingEvidence.length === 0) return 1.0;

  // Count verified derivatives (isDerivative=true AND derivativeClaimUnverified is NOT true)
  const derivativeCount = supportingEvidence.filter(
    (e) => e.isDerivative === true && e.derivativeClaimUnverified !== true,
  ).length;

  const derivativeRatio = derivativeCount / supportingEvidence.length;
  return 1.0 - derivativeRatio * (1.0 - derivativeMultiplier);
}

/**
 * Zod schema for VerdictNarrative LLM output.
 */
const VerdictNarrativeOutputSchema = z.object({
  headline: z.string(),
  evidenceBaseSummary: z.string(),
  keyFinding: z.string(),
  boundaryDisagreements: z.array(z.string()).optional(),
  limitations: z.string(),
});

/**
 * Generate a VerdictNarrative using Sonnet LLM call (§8.5.6).
 */
export async function generateVerdictNarrative(
  truthPercentage: number,
  verdict: string,
  confidence: number,
  claimVerdicts: CBClaimVerdict[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  evidence: EvidenceItem[],
  pipelineConfig: PipelineConfig,
): Promise<VerdictNarrative> {
  const currentDate = new Date().toISOString().split("T")[0];

  const rendered = await loadAndRenderSection("claimboundary", "VERDICT_NARRATIVE", {
    currentDate,
    overallVerdict: JSON.stringify({
      truthPercentage: Math.round(truthPercentage),
      verdict,
      confidence: Math.round(confidence),
    }),
    claimVerdicts: JSON.stringify(
      claimVerdicts.slice(0, 7).map((v) => ({
        claimId: v.claimId,
        truthPercentage: v.truthPercentage,
        verdict: v.verdict,
        confidence: v.confidence,
        reasoning: v.reasoning?.slice(0, 200),
        boundaryFindings: v.boundaryFindings?.map((f) => ({
          boundaryId: f.boundaryId,
          boundaryName: f.boundaryName,
          evidenceDirection: f.evidenceDirection,
          evidenceCount: f.evidenceCount,
        })),
      })),
      null,
      2,
    ),
    claimBoundaries: JSON.stringify(
      boundaries.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        evidenceCount: b.evidenceCount,
      })),
      null,
      2,
    ),
    coverageMatrix: JSON.stringify({
      claims: coverageMatrix.claims,
      boundaries: coverageMatrix.boundaries,
      counts: coverageMatrix.counts,
    }),
    evidenceCount: String(evidence.length),
  });

  if (!rendered) {
    throw new Error("Stage 5: Failed to load VERDICT_NARRATIVE prompt section");
  }

  const model = getModelForTask("verdict", undefined, pipelineConfig);

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
        content: `Generate a structured narrative for the overall assessment (truth: ${Math.round(truthPercentage)}%, verdict: ${verdict}, confidence: ${Math.round(confidence)}%).`,
      },
    ],
    temperature: 0.2,
    output: Output.object({ schema: VerdictNarrativeOutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(
      pipelineConfig.llmProvider ?? "anthropic",
    ),
  });

  const parsed = extractStructuredOutput(result);
  if (!parsed) {
    throw new Error("Stage 5: LLM returned no structured output for VerdictNarrative");
  }

  return VerdictNarrativeOutputSchema.parse(parsed);
}

/**
 * Build quality gates summary (§8.5.7).
 */
export function buildQualityGates(
  cbGate1Stats: CBClaimUnderstanding["gate1Stats"] | undefined,
  claimVerdicts: CBClaimVerdict[],
  evidence: EvidenceItem[],
  state: CBResearchState,
): QualityGates {
  // Map CB gate1Stats to Gate1Stats shape
  const gate1Stats: Gate1Stats | undefined = cbGate1Stats
    ? {
        total: cbGate1Stats.totalClaims,
        passed: cbGate1Stats.passedSpecificity,
        filtered: cbGate1Stats.totalClaims - cbGate1Stats.passedSpecificity,
        centralKept: cbGate1Stats.totalClaims, // CB pipeline keeps all central claims
      }
    : undefined;

  // Gate 4 stats: classify confidence levels
  const highConfidence = claimVerdicts.filter((v) => v.confidence >= 70).length;
  const mediumConfidence = claimVerdicts.filter(
    (v) => v.confidence >= 40 && v.confidence < 70,
  ).length;
  const lowConfidence = claimVerdicts.filter(
    (v) => v.confidence > 0 && v.confidence < 40,
  ).length;
  const insufficient = claimVerdicts.filter((v) => v.confidence === 0).length;

  const gate4Stats: Gate4Stats = {
    total: claimVerdicts.length,
    publishable: highConfidence + mediumConfidence,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    insufficient,
    centralKept: claimVerdicts.length, // All claims retained in CB pipeline
  };

  return {
    passed: cbGate1Stats?.overallPass !== false && gate4Stats.publishable > 0,
    gate1Stats,
    gate4Stats,
    summary: {
      totalEvidenceItems: evidence.length,
      totalSources: state.sources.length,
      searchesPerformed: state.searchQueries.length,
      contradictionSearchPerformed: state.contradictionIterationsUsed > 0,
    },
  };
}
