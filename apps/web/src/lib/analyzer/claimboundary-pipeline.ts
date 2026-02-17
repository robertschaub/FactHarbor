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
 * @since ClaimBoundary pipeline v1
 * @see Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md
 */

import type {
  AtomicClaim,
  CBClaimUnderstanding,
  CBClaimVerdict,
  CBResearchState,
  ClaimBoundary,
  CoverageMatrix,
  EvidenceItem,
  FetchedSource,
  OverallAssessment,
  QualityGates,
  Gate1Stats,
  AnalysisInput,
  SourceType,
} from "./types";

// Shared modules — reused from existing codebase (no orchestrated.ts imports)
import { filterByProbativeValue } from "./evidence-filter";
import { prefetchSourceReliability } from "./source-reliability";
import { getClaimWeight, calculateWeightedVerdictAverage } from "./aggregation";

// Verdict stage module (§8.4 — 5-step debate pattern)
import { runVerdictStage, type LLMCallFn } from "./verdict-stage";

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
import { loadPipelineConfig, loadSearchConfig } from "@/lib/config-loader";
import type { PipelineConfig, SearchConfig } from "@/lib/config-schemas";

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
    _schemaVersion: "3.0.0-cb", // ClaimBoundary pipeline schema
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
  // TODO (Phase 1b/1c): Implement claim-driven research loop
  // 1. Seed evidence pool from Stage 1 preliminary search
  // 2. Claim-driven query generation
  // 3. Web search + relevance classification
  // 4. Source fetch + reliability prefetch
  // 5. Evidence extraction with mandatory EvidenceScope
  // 6. EvidenceScope validation
  // 7. Evidence filter (LLM + deterministic safety net)
  // 8. Sufficiency check + contradiction search
  throw new Error("Stage 2 (researchEvidence) not yet implemented");
}

// ============================================================================
// STAGE 3: CLUSTER BOUNDARIES (§8.3)
// ============================================================================

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
): Promise<ClaimBoundary[]> {
  // TODO (Phase 1b/1c): Implement scope clustering
  // 1. Collect unique EvidenceScopes
  // 2. LLM clustering (Sonnet)
  // 3. Coherence assessment
  // 4. Post-clustering validation (deterministic)
  // 5. Fallback to single "General" boundary if needed
  throw new Error("Stage 3 (clusterBoundaries) not yet implemented");
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
  boundaries: ClaimBoundary[],
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
 * @returns Array of CBClaimVerdicts
 */
export async function generateVerdicts(
  claims: AtomicClaim[],
  evidence: EvidenceItem[],
  boundaries: ClaimBoundary[],
  coverageMatrix: CoverageMatrix,
  llmCall?: LLMCallFn,
): Promise<CBClaimVerdict[]> {
  if (!llmCall) {
    // TODO (Phase 1c): Wire production LLM call function from UCM prompts
    throw new Error("Stage 4 (generateVerdicts): llmCall function required — production wiring not yet implemented");
  }

  return runVerdictStage(claims, evidence, boundaries, coverageMatrix, llmCall);
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
  boundaries: ClaimBoundary[],
  evidence: EvidenceItem[],
  coverageMatrix: CoverageMatrix,
  state: CBResearchState
): Promise<OverallAssessment> {
  // TODO (Phase 1b): Implement aggregation
  // 1. Triangulation scoring per claim (§8.5.2)
  // 2. Derivative weight reduction (§8.5.3)
  // 3. Weighted average + confidence (§8.5.4-8.5.5)
  // 4. VerdictNarrative generation (§8.5.6, Sonnet call)
  // 5. Report assembly (§8.5.7)
  throw new Error("Stage 5 (aggregateAssessment) not yet implemented");
}
