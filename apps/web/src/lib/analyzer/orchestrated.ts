/**
 * FactHarbor POC1 Analyzer v2.6.40
 *
 * Features:
 * - 7-level symmetric scale (True/Mostly True/Leaning True/Unverified/Leaning False/Mostly False/False)
 * - Multi-Context analysis with Contested Factors
 * - Search tracking with LLM call counting
 * - Source reliability via LLM evaluation with caching (UCM SR config)
 * - Configurable search via UCM search config
 * - Fixed AI SDK output handling for different versions (output vs experimental_output)
 * - Claim dependency tracking (claimRole: attribution/source/timing/core)
 * - Dependency propagation (if prerequisite false, dependent claims flagged)
 * - Unified analysis depth regardless of punctuation
 * - Key Factors generated for procedural/legal topics in both modes
 * - Simplified schemas for better cross-provider compatibility
 * - Enhanced recency detection with news-related keywords (v2.6.22)
 * - Date-aware query variants for ALL search types (v2.6.22)
 * - Optional Gemini Grounded Search mode (v2.6.22)
 * - v2.6.23: Fixed input neutrality - canonicalizeContexts uses normalized input
 * - v2.6.23: Strengthened centrality heuristic with explicit examples
 * - v2.6.23: Generic recency detection (removed person names)
 * - v2.6.25: Removed originalInputDisplay from analysis pipeline
 * - v2.6.25: resolveAnalysisPromptInput no longer falls back to yes/no format
 * - v2.6.25: isRecencySensitive uses impliedClaim (normalized) for consistency
 * - v2.6.26: Force impliedClaim to normalized statement unconditionally
 * - v2.6.26: Show article summary for all input styles
 * - v2.6.30: Complete Input Neutrality - removed detectedInputType override
 * - v2.6.30: Inputs now follow IDENTICAL analysis paths
 * - v2.6.31: Modularized - extracted debug, config modules
 * - v2.6.32: Verdict structured-output resilience (recover from NoObjectGeneratedError + JSON-text fallback)
 * - v2.6.33: Fixed counter-claim detection - thesis-aligned claims no longer flagged as counter
 * - v2.6.33: Auto-detect external reaction claims as tangential (generic: reactions to X don't evaluate X)
 * - v2.6.33: Contested claims WITH factual counter-evidence get reduced weight in aggregation
 * - v2.6.40: Fixed Context/Scope terminology - assessedStatement now passed to verdict prompts
 * - v2.6.40: Renamed scopesFormatted to contextsFormatted, fixed legacy wording in prompts
 * - Note: Any remaining legacy wording in version notes is historical (pre-AnalysisContext cleanup)
 *
 * @version 2.6.40
 * @date January 2026
 */

import { z } from "zod";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";
import { searchWebWithProvider, getActiveSearchProviders, type WebSearchResult, type SearchProviderErrorInfo } from "@/lib/web-search";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/provider-health";
import { searchWithGrounding, isGroundedSearchAvailable, convertToFetchedSources } from "@/lib/search-gemini-grounded";
import { applyGate1Lite, applyGate1ToClaims, applyGate4ToVerdicts } from "./quality-gates";
import { filterEvidenceByProvenance } from "./provenance-validation";
import { filterByProbativeValue, calculateFalsePositiveRate, DEFAULT_FILTER_CONFIG, type ProbativeFilterConfig } from "./evidence-filter";
import {
  getBudgetConfig,
  createBudgetTracker,
  checkTokenBudget,
  recordIteration,
  recordLLMCall,
  markBudgetExceeded,
  getBudgetStats,
  type ResearchBudget,
  type BudgetTracker,
} from "./budgets";
import { normalizeSubClaimsImportance } from "../claim-importance";
import * as fs from "fs";
import * as path from "path";

// Modular imports
import { debugLog, clearDebugLog, agentLog } from "./debug";
import { tryParseFirstJsonObject, repairTruncatedJson } from "./json";
import {
  CONFIG,
  getActiveConfig,
  getDeterministicTemperature,
  extractParenAcronym,
  extractAllCapsToken,
  inferToAcronym,
  inferContextTypeLabel,
  contextTypeRank,
  detectInstitutionCode,
  sanitizeContextShortAnswer,
} from "./config";
import {
  calculateWeightedVerdictAverage,
  pruneTangentialBaselessClaims,
  pruneOpinionOnlyFactors,
  monitorOpinionAccumulation,
} from "./aggregation";
import { canonicalizeContexts, canonicalizeContextsWithRemap, ensureAtLeastOneContext, UNASSIGNED_CONTEXT_ID } from "./analysis-contexts";
import { VERDICT_BANDS } from "./truth-scale";
import { getModelForTask, getStructuredOutputProviderOptions, getPromptCachingOptions } from "./llm";
import {
  detectAndCorrectVerdictInversion,
  detectCounterClaim,
} from "./verdict-corrections";
import { loadAndRenderSection, loadPromptFile, type Pipeline } from "./prompt-loader";
import { calibrateConfidence, DEFAULT_CALIBRATION_CONFIG, type ConfidenceCalibrationConfig } from "./confidence-calibration";
import { checkVerdictGrounding, applyGroundingPenalty, DEFAULT_GROUNDING_PENALTY_CONFIG } from "./grounding-check";
import { ENGLISH_STOPWORDS } from "./constants/stopwords";
import { getConfig, recordConfigUsage } from "@/lib/config-storage";
import { getAnalyzerConfig, type PipelineConfig, type SearchConfig, type CalcConfig, DEFAULT_CALC_CONFIG } from "@/lib/config-loader";
import { captureConfigSnapshotAsync, getSRConfigSummary } from "@/lib/config-snapshots";
import type { EvidenceItem, AnalysisWarning, VerdictDirectionMismatch } from "./types";
import { assertValidTruthPercentage } from "./types";
import {
  getTextAnalysisService,
  isLLMEnabled,
  type InputClassificationResult,
  type EvidenceItemInput,
  type EvidenceQualityResult,
  type VerdictValidationResult as TextAnalysisVerdictResult,
  type ContextSimilarityResult,
  type ContextPair,
} from "./text-analysis-service";
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_SR_CONFIG } from "../config-schemas";
import { FallbackTracker } from "./classification-fallbacks";
import { formatFallbackReportMarkdown } from "./format-fallback-report";

// Phase 2a: Evidence Processor Modules
import {
  EvidenceDeduplicator,
  type DeduplicationState,
} from "./evidence-deduplication";
import {
  EvidenceNormalizer,
  type RawEvidenceItem,
} from "./evidence-normalization";
import {
  RecencyAssessor,
  type RecencyValidationResult,
  type RecencyPenaltyResult,
} from "./evidence-recency";
import {
  mergeContextMetadata,
  buildContextDescription,
  buildRelevanceContextSummary,
} from "./evidence-context-utils";
import {
  applyRecencyEvidenceGuard,
  buildTemporalPromptGuard,
} from "./temporal-guard";

// Configuration, helpers, and debug utilities imported from modular files above

// NOTE: AnalysisContext canonicalization helpers extracted to ./analyzer/analysis-contexts

// ============================================================================
// Classification Fallback Functions (P0: No Pattern Matching)
// ============================================================================

/**
 * Get factualBasis with safe default fallback
 * NO PATTERN MATCHING - just null-checking and logging
 */
function getFactualBasisWithFallback(
  llmValue: string | undefined,
  keyFactorText: string,
  keyFactorIndex: number,
  tracker: FallbackTracker
): "established" | "disputed" | "opinion" | "unknown" {
  const validValues = ["established", "disputed", "opinion", "unknown"];

  // LLM provided valid value â†’ use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed â†’ use safe default
  const reason = !llmValue ? 'missing' : 'invalid';
  const defaultValue = "unknown"; // Most conservative default

  tracker.recordFallback({
    field: 'factualBasis',
    location: `KeyFactor #${keyFactorIndex + 1}`,
    text: keyFactorText.substring(0, 100), // First 100 chars
    defaultUsed: defaultValue,
    reason
  });

  console.warn(`[Fallback] factualBasis: KeyFactor #${keyFactorIndex + 1} - using default "${defaultValue}" (reason: ${reason})`);

  return defaultValue;
}

/**
 * Get harmPotential with safe default fallback
 * NO PATTERN MATCHING - just null-checking and logging
 */
function getHarmPotentialWithFallback(
  llmValue: string | undefined,
  claimText: string,
  claimIndex: number,
  tracker: FallbackTracker
): "high" | "medium" | "low" {
  const validValues = ["high", "medium", "low"];

  // LLM provided valid value â†’ use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed â†’ use safe default (NO pattern matching!)
  const reason = !llmValue ? 'missing' : 'invalid';
  const defaultValue = "medium"; // Neutral default

  tracker.recordFallback({
    field: 'harmPotential',
    location: `Claim #${claimIndex + 1}`,
    text: claimText.substring(0, 100),
    defaultUsed: defaultValue,
    reason
  });

  console.warn(`[Fallback] harmPotential: Claim #${claimIndex + 1} - using default "${defaultValue}" (reason: ${reason})`);

  return defaultValue;
}

/**
 * Get sourceAuthority with safe default fallback
 * NO PATTERN MATCHING - just null-checking and logging
 */
function getSourceAuthorityWithFallback(
  llmValue: string | undefined,
  evidenceText: string,
  evidenceIndex: number,
  tracker: FallbackTracker
): "primary" | "secondary" | "opinion" {
  const validValues = ["primary", "secondary", "opinion"];

  // LLM provided valid value â†’ use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed â†’ use safe default
  const reason = !llmValue ? 'missing' : 'invalid';
  const defaultValue = "secondary"; // Neutral default

  tracker.recordFallback({
    field: 'sourceAuthority',
    location: `Evidence #${evidenceIndex + 1}`,
    text: evidenceText.substring(0, 100),
    defaultUsed: defaultValue,
    reason
  });

  console.warn(`[Fallback] sourceAuthority: Evidence #${evidenceIndex + 1} - using default "${defaultValue}" (reason: ${reason})`);

  return defaultValue;
}

/**
 * Get evidenceBasis with safe default fallback
 * NO PATTERN MATCHING - just null-checking and logging
 */
function getEvidenceBasisWithFallback(
  llmValue: string | undefined,
  evidenceText: string,
  evidenceIndex: number,
  tracker: FallbackTracker
): "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific" {
  const validValues = ["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"];

  // LLM provided valid value â†’ use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed â†’ use safe default
  const reason = !llmValue ? 'missing' : 'invalid';
  const defaultValue = "anecdotal"; // Conservative default (weakest documented evidence)

  tracker.recordFallback({
    field: 'evidenceBasis',
    location: `Evidence #${evidenceIndex + 1}`,
    text: evidenceText.substring(0, 100),
    defaultUsed: defaultValue,
    reason
  });

  console.warn(`[Fallback] evidenceBasis: Evidence #${evidenceIndex + 1} - using default "${defaultValue}" (reason: ${reason})`);

  return defaultValue;
}

/**
 * Get isContested with safe default fallback
 * NO PATTERN MATCHING - just null-checking and logging
 */
function getIsContestedWithFallback(
  llmValue: boolean | undefined,
  keyFactorText: string,
  keyFactorIndex: number,
  tracker: FallbackTracker
): boolean {
  // LLM provided valid boolean â†’ use it
  if (typeof llmValue === 'boolean') {
    return llmValue;
  }

  // LLM failed â†’ use safe default
  const defaultValue = false; // Conservative default (don't penalize without evidence)

  tracker.recordFallback({
    field: 'isContested',
    location: `KeyFactor #${keyFactorIndex + 1}`,
    text: keyFactorText.substring(0, 100),
    defaultUsed: String(defaultValue),
    reason: 'missing'
  });

  console.warn(`[Fallback] isContested: KeyFactor #${keyFactorIndex + 1} - using default "${defaultValue}"`);

  return defaultValue;
}

/**
 * Normalize claim classifications with fallback tracking
 * Call this after LLM extraction to ensure all classification fields are defined
 */
function normalizeClaimClassifications<T extends { text?: string; harmPotential?: string }>(
  claims: T[],
  tracker: FallbackTracker,
  locationPrefix: string = "Claim"
): T[] {
  return claims.map((claim, index) => {
    const validHarmValues = ["high", "medium", "low"];
    let harmPotential = claim.harmPotential;

    if (!harmPotential || !validHarmValues.includes(harmPotential)) {
      const reason = !harmPotential ? 'missing' : 'invalid';
      harmPotential = "medium"; // Safe default

      tracker.recordFallback({
        field: 'harmPotential',
        location: `${locationPrefix} #${index + 1}`,
        text: (claim.text || "").substring(0, 100),
        defaultUsed: harmPotential,
        reason
      });

      console.warn(`[Fallback] harmPotential: ${locationPrefix} #${index + 1} - using default "medium" (reason: ${reason})`);
    }

    return {
      ...claim,
      harmPotential: harmPotential as "high" | "medium" | "low"
    };
  });
}

/**
 * Decontextualized harmPotential classification.
 *
 * Sends ONLY claim texts (no article, no topic, no context names) to a lightweight
 * LLM call to classify harmPotential. This eliminates "frame contamination" where
 * the topic domain (safety, health, legal) causes the LLM to over-classify claims
 * as HIGH when the claims themselves don't allege death, injury, or major fraud.
 *
 * Called after the understand step but before research begins.
 */
async function classifyHarmPotentialDecontextualized(
  claims: Array<{ text: string; harmPotential?: string }>,
  model: any,
  pipelineConfig: any,
): Promise<Array<"high" | "medium" | "low">> {
  if (!claims.length) return [];

  try {
    const renderedSystem = await loadAndRenderSection("orchestrated", "HARM_POTENTIAL_CLASSIFY", {});
    const claimsList = claims.map((c, i) => `${i + 1}. ${c.text}`).join("\n");
    const renderedUser = await loadAndRenderSection("orchestrated", "HARM_POTENTIAL_CLASSIFY_USER", {
      CLAIMS_LIST: claimsList,
    });

    if (!renderedSystem?.content?.trim() || !renderedUser?.content?.trim()) {
      console.warn("[HarmClassify] Missing prompt sections, skipping decontextualized classification");
      return claims.map(c => (c.harmPotential as any) || "medium");
    }

    const result: any = await generateText({
      model,
      messages: [
        { role: "system", content: renderedSystem.content },
        { role: "user", content: renderedUser.content },
      ],
      temperature: getDeterministicTemperature(0.1, pipelineConfig),
      maxOutputTokens: Math.max(512, claims.length * 30),
    });

    const txt = result?.text as string | undefined;
    if (!txt) {
      console.warn("[HarmClassify] No text in LLM response");
      return claims.map(c => (c.harmPotential as any) || "medium");
    }

    // Parse the JSON array from the response
    const parsed = tryParseFirstJsonObject(`{"arr":${txt.trim().startsWith("[") ? txt.trim() : `[${txt.trim()}]`}}`);
    const arr: any[] = parsed?.arr || [];

    const validValues = ["high", "medium", "low"];
    return claims.map((_, i) => {
      const entry = arr.find((e: any) => e?.index === i) || arr[i];
      const val = entry?.harmPotential;
      return validValues.includes(val) ? val : "medium";
    });
  } catch (err: any) {
    console.warn(`[HarmClassify] Decontextualized classification failed: ${err?.message || err}. Using original values.`);
    return claims.map(c => (c.harmPotential as any) || "medium");
  }
}

/**
 * Normalize KeyFactor classifications with fallback tracking
 * Call this after verdict generation to ensure all classification fields are defined
 */
function normalizeKeyFactorClassifications<T extends {
  text?: string;
  factualBasis?: string;
  isContested?: boolean;
}>(
  keyFactors: T[],
  tracker: FallbackTracker,
  locationPrefix: string = "KeyFactor"
): T[] {
  return keyFactors.map((kf, index) => {
    const validFactualBasis = ["established", "disputed", "opinion", "unknown"];
    let factualBasis = kf.factualBasis;
    let isContested = kf.isContested;

    // Normalize factualBasis
    if (!factualBasis || !validFactualBasis.includes(factualBasis)) {
      const reason = !factualBasis ? 'missing' : 'invalid';
      factualBasis = "unknown"; // Safe default

      tracker.recordFallback({
        field: 'factualBasis',
        location: `${locationPrefix} #${index + 1}`,
        text: (kf.text || "").substring(0, 100),
        defaultUsed: factualBasis,
        reason
      });

      console.warn(`[Fallback] factualBasis: ${locationPrefix} #${index + 1} - using default "unknown" (reason: ${reason})`);
    }

    // Normalize isContested
    if (typeof isContested !== 'boolean') {
      isContested = false; // Safe default

      tracker.recordFallback({
        field: 'isContested',
        location: `${locationPrefix} #${index + 1}`,
        text: (kf.text || "").substring(0, 100),
        defaultUsed: "false",
        reason: 'missing'
      });

      console.warn(`[Fallback] isContested: ${locationPrefix} #${index + 1} - using default "false"`);
    }

    return {
      ...kf,
      factualBasis: factualBasis as "established" | "disputed" | "opinion" | "unknown",
      isContested
    };
  });
}

/**
 * Normalize evidence classifications with fallback tracking
 * Call this after evidence extraction to ensure all classification fields are defined
 */

interface RelevanceCheck {
  isRelevant: boolean;
  reason?: string;
  classification?: RelevanceClass;
}

type RelevanceOptions = {
  requireContextMatch?: boolean;
  strictInstitutionMatch?: boolean;
  allowInstitutionFallback?: boolean;
};

type RelevanceClass = "primary_source" | "secondary_commentary" | "unrelated";

function normalizeForMatch(text: string): string {
  return (text || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Extract key words from text for search query construction (structural plumbing, not semantic decisions).
 * Simple word extraction with length filter â€” no stop-word lists or semantic interpretation.
 */
function extractKeyWordsForQuery(text: string, minLength = 4, maxWords = 10): string[] {
  const normalized = normalizeForMatch(text);
  if (!normalized) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of normalized.split(/\s+/)) {
    if (word.length >= minLength && !seen.has(word)) {
      seen.add(word);
      out.push(word);
      if (out.length >= maxWords) break;
    }
  }
  return out;
}

function normalizeContextAlias(raw: unknown): string {
  const alias = String(raw || "").trim();
  if (!alias) return "";
  const upper = alias.toUpperCase();
  if (/^CTX(?:[_-]?[A-Z0-9]+)?$/.test(upper)) return "";
  if (/^CONTEXT(?:[_-]?[A-Z0-9]+)?$/.test(upper)) return "";
  return alias;
}

function isGenericAliasToken(token: string): boolean {
  const normalized = String(token || "").trim().toLowerCase();
  return normalized === "ctx" || normalized === "context";
}

function selectDiverseSearchResultsByQuery<T extends { query?: string }>(
  results: T[],
  maxSources: number,
): T[] {
  if (!Array.isArray(results) || results.length <= maxSources) return results;
  const bucketOrder: string[] = [];
  const buckets = new Map<string, T[]>();

  for (const result of results) {
    const bucketKey = String(result.query || "__default");
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
      bucketOrder.push(bucketKey);
    }
    buckets.get(bucketKey)!.push(result);
  }

  const selected: T[] = [];
  let madeProgress = true;
  while (selected.length < maxSources && madeProgress) {
    madeProgress = false;
    for (const bucketKey of bucketOrder) {
      const bucket = buckets.get(bucketKey);
      if (!bucket || bucket.length === 0) continue;
      selected.push(bucket.shift()!);
      madeProgress = true;
      if (selected.length >= maxSources) break;
    }
  }

  if (selected.length >= maxSources) return selected;
  for (const result of results) {
    if (selected.length >= maxSources) break;
    if (!selected.includes(result)) selected.push(result);
  }
  return selected;
}

function buildAdaptiveFallbackQueries(params: {
  entityText: string;
  focus?: string;
  category?: string;
  originalQueries: string[];
  maxQueries: number;
  currentYear: number;
}): string[] {
  const { entityText, focus, category, originalQueries, maxQueries, currentYear } = params;
  if (maxQueries <= 0) return [];

  const entityAnchor = extractKeyWordsForQuery(entityText, 3, 6).join(" ");
  const focusAnchor = extractKeyWordsForQuery(String(focus || ""), 4, 4).join(" ");
  const baseAnchor = [entityAnchor, focusAnchor].filter(Boolean).join(" ").trim() || entityAnchor || focusAnchor;
  if (!baseAnchor) return [];

  const lowerCategory = String(category || "").toLowerCase();
  const candidates =
    lowerCategory === "criticism" || lowerCategory === "counter_evidence"
      ? [
          `${baseAnchor} criticism documented evidence`,
          `${baseAnchor} independent review evidence ${currentYear}`,
        ]
      : [
          `${baseAnchor} documented evidence`,
          `${baseAnchor} independent analysis evidence ${currentYear}`,
        ];

  const existing = new Set((originalQueries || []).map((q) => String(q || "").trim().toLowerCase()));
  return candidates
    .map((q) => q.replace(/\s+/g, " ").trim())
    .filter((q) => q.length > 0 && !existing.has(q.toLowerCase()))
    .slice(0, maxQueries);
}


/**
 * Build context-aware criticism queries that focus on relevant actors/jurisdictions.
 * Prevents unrelated third-party reactions from contaminating evidence.
 */
function buildContextAwareCriticismQueries(
  entityStr: string,
  contexts: AnalysisContext[],
  currentYear: number
): string[] {
  // Collect jurisdiction/institution pairs from ALL contexts (not just the first)
  // to ensure multi-context analyses generate criticism queries for each distinct frame.
  const seen = new Set<string>();
  const queries: string[] = [];

  for (const ctx of contexts) {
    const jurisdiction = ctx?.metadata?.jurisdiction || ctx?.metadata?.geographic || "";
    const institution = ctx?.metadata?.institution || ctx?.metadata?.court || "";
    if (!jurisdiction && !institution) continue;
    const key = `${jurisdiction}|${institution}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    queries.push(
      `${entityStr} ${jurisdiction} ${institution} criticism official review`,
      `${entityStr} ${jurisdiction} appeals challenges objections ${currentYear}`,
      `${entityStr} ${institution} internal review findings`,
    );
  }

  if (queries.length === 0) {
    // No context had jurisdiction/institution â€” fall back to generic queries
    queries.push(
      `${entityStr} criticism documented evidence ${currentYear}`,
      `${entityStr} official response challenges`,
    );
  }

  return queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/**
 * LLM-powered batch search result relevance assessment.
 * Replaces the deterministic checkSearchResultRelevance heuristic.
 * Batches all results into a single LLM call for efficiency.
 */
const BATCH_RELEVANCE_SCHEMA = z.object({
  results: z.array(z.object({
    id: z.string(),
    classification: z.enum(["primary_source", "secondary_commentary", "unrelated"]),
    reason: z.string(),
  })),
});

const BATCH_RELEVANCE_SCHEMA_ANTHROPIC = z.object({
  results: z.array(z.object({
    id: z.string(),
    classification: z.enum(["primary_source", "secondary_commentary", "unrelated"]),
    reason: z.string(),
  })),
});

async function assessSearchRelevanceBatch(
  results: WebSearchResult[],
  entityStr: string,
  contexts: AnalysisContext[],
  options: RelevanceOptions = {},
  pipelineConfig?: PipelineConfig,
): Promise<Map<string, RelevanceCheck>> {
  const out = new Map<string, RelevanceCheck>();
  if (!results || results.length === 0) return out;

  const mode = options.requireContextMatch
    ? (options.strictInstitutionMatch ? "strict" : "moderate")
    : "relaxed";

  const modeSectionName = mode === "strict"
    ? "SEARCH_RELEVANCE_MODE_STRICT"
    : mode === "moderate"
      ? "SEARCH_RELEVANCE_MODE_MODERATE"
      : "SEARCH_RELEVANCE_MODE_RELAXED";
  const renderedMode = await loadAndRenderSection("orchestrated", modeSectionName, {});
  const modeInstructions = renderedMode?.content?.trim() || `${mode.toUpperCase()} mode`;

  const contextSummary = buildRelevanceContextSummary(contexts as AnalysisContext[]);

  const resultEntries = results.map((r, idx) => ({
    id: `r${idx}`,
    title: r.title || "N/A",
    snippet: r.snippet || "N/A",
    url: r.url || "N/A",
  }));

  const resultsText = resultEntries
    .map((r) => `[${r.id}] Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.url}`)
    .join("\n\n");

  try {
    const renderedSystemPrompt = await loadAndRenderSection("orchestrated", "SEARCH_RELEVANCE_BATCH_SYSTEM", {
      MODE_INSTRUCTIONS: modeInstructions,
    });
    const renderedUserPrompt = await loadAndRenderSection("orchestrated", "SEARCH_RELEVANCE_BATCH_USER", {
      CLAIM_TEXT: entityStr,
      CONTEXTS_TEXT: contextSummary,
      RESULTS_TEXT: resultsText,
    });
    if (!renderedSystemPrompt?.content?.trim() || !renderedUserPrompt?.content?.trim()) {
      throw new Error("Missing SEARCH_RELEVANCE_BATCH_* prompt sections in orchestrated prompt profile");
    }
    const systemPrompt = renderedSystemPrompt.content;
    const userPrompt = renderedUserPrompt.content;

    const { model: llmModel } = getModelForTask("extract_evidence");
    const response = await generateText({
      model: llmModel,
      messages: [
        { role: "system", content: systemPrompt, providerOptions: getPromptCachingOptions(pipelineConfig?.llmProvider) },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.1, pipelineConfig),
      output: Output.object({
        schema: isAnthropicProvider(pipelineConfig?.llmProvider)
          ? BATCH_RELEVANCE_SCHEMA_ANTHROPIC
          : BATCH_RELEVANCE_SCHEMA,
      }),
      providerOptions: getStructuredOutputProviderOptions(pipelineConfig?.llmProvider ?? "anthropic"),
    });

    const parsed = extractStructuredOutput(response);
    if (parsed && Array.isArray(parsed.results)) {
      const safe = BATCH_RELEVANCE_SCHEMA.safeParse(parsed);
      if (safe.success) {
        for (const item of safe.data.results) {
          const idx = parseInt(item.id.replace("r", ""), 10);
          if (idx >= 0 && idx < results.length) {
            const isRelevant = item.classification === "primary_source" ||
              (mode === "relaxed" && item.classification === "secondary_commentary");
            out.set(item.id, {
              isRelevant,
              reason: isRelevant ? undefined : item.reason,
              classification: item.classification,
            });
          }
        }
      }
    }
  } catch (err: any) {
    debugLog("assessSearchRelevanceBatch: LLM failed, accepting all results as fallback", {
      error: err?.message || String(err),
      resultCount: results.length,
    });
  }

  // Fill in any missing results (LLM didn't classify them) â€” accept as fallback
  for (let i = 0; i < results.length; i++) {
    const id = `r${i}`;
    if (!out.has(id)) {
      out.set(id, { isRelevant: true, reason: "llm_fallback" });
    }
  }

  return out;
}

/**
 * Remove low-evidence drift contexts that are not anchored to the primary subject/entity.
 * Conservative by design:
 * - only applies when at least one other context has anchor evidence
 * - only drops contexts with <=2 evidence items and zero anchor similarity
 * Uses LLM-powered similarity to assess anchor relevance.
 */
async function pruneWeakAnchorContexts(
  understanding: ClaimUnderstanding,
  evidenceItems: EvidenceItem[],
  analysisInput: string,
): Promise<{ understanding: ClaimUnderstanding; droppedContextIds: string[] }> {
  const contexts = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts
    : [];
  if (contexts.length <= 1) {
    return { understanding, droppedContextIds: [] };
  }

  if (!analysisInput || !analysisInput.trim()) {
    return { understanding, droppedContextIds: [] };
  }

  // Build similarity pairs: each evidence item's content vs the analysis input
  const pairs: Array<{ id: string; textA: string; textB: string }> = [];
  const evidenceByContext = new Map<string, EvidenceItem[]>();
  for (const item of evidenceItems) {
    const cid = String(item?.contextId || "");
    if (!cid) continue;
    if (!evidenceByContext.has(cid)) evidenceByContext.set(cid, []);
    evidenceByContext.get(cid)!.push(item);
  }

  for (const context of contexts) {
    const contextId = String(context.id || "");
    const ctxEvidence = evidenceByContext.get(contextId) || [];
    for (const item of ctxEvidence) {
      const combined = `${item?.statement || ""} ${item?.sourceTitle || ""}`;
      if (combined.trim()) {
        pairs.push({ id: `${contextId}__${item.id}`, textA: analysisInput, textB: combined });
      }
    }
  }

  if (pairs.length === 0) {
    return { understanding, droppedContextIds: [] };
  }

  const simScores = await assessTextSimilarityBatch(pairs);

  // Aggregate: max similarity score per context
  const contextMaxSim = new Map<string, number>();
  for (const [pairId, score] of simScores) {
    const contextId = pairId.split("__")[0];
    contextMaxSim.set(contextId, Math.max(contextMaxSim.get(contextId) || 0, score));
  }

  const contextStats = contexts.map((context) => {
    const contextId = String(context.id || "");
    const evidenceCount = (evidenceByContext.get(contextId) || []).length;
    const anchorSim = contextMaxSim.get(contextId) || 0;
    return { contextId, evidenceCount, anchorSim };
  });

  const maxAnchorSim = Math.max(...contextStats.map((s) => s.anchorSim), 0);
  if (maxAnchorSim <= 0.1) {
    return { understanding, droppedContextIds: [] };
  }

  const droppedContextIds = contextStats
    .filter((s) => s.evidenceCount > 0 && s.evidenceCount <= 2 && s.anchorSim < 0.15)
    .map((s) => s.contextId);

  if (droppedContextIds.length === 0 || droppedContextIds.length >= contexts.length) {
    return { understanding, droppedContextIds: [] };
  }

  const keptStats = contextStats
    .filter((s) => !droppedContextIds.includes(s.contextId))
    .sort((a, b) => {
      if (b.anchorSim !== a.anchorSim) return b.anchorSim - a.anchorSim;
      return b.evidenceCount - a.evidenceCount;
    });
  const fallbackContextId =
    keptStats[0]?.contextId || String(contexts[0]?.id || "");

  for (const item of evidenceItems) {
    const contextId = String(item?.contextId || "");
    if (contextId && droppedContextIds.includes(contextId)) {
      (item as any).contextId = fallbackContextId;
    }
  }

  for (const claim of understanding.subClaims || []) {
    const contextId = String((claim as any)?.contextId || "");
    if (contextId && droppedContextIds.includes(contextId)) {
      (claim as any).contextId = fallbackContextId;
    }
  }

  const nextContexts = contexts.filter(
    (context) => !droppedContextIds.includes(String(context.id || "")),
  );

  return {
    understanding: {
      ...understanding,
      analysisContexts: nextContexts,
      requiresSeparateAnalysis: nextContexts.length > 1,
    },
    droppedContextIds,
  };
}


/**
 * Final verification: Check all classifications at end of analysis
 * Catches any items that bypassed entry-point normalization
 *
 * Default value reasoning:
 * - harmPotential: "medium" - Neutral; doesn't over-alarm (high) or dismiss (low)
 * - factualBasis: "unknown" - Most conservative; doesn't claim evidence quality we can't verify
 * - isContested: false - Conservative; don't penalize without evidence of contestation
 * - sourceAuthority: "secondary" - Neutral; news/analysis (not primary research, not pure opinion)
 * - evidenceBasis: "anecdotal" - Conservative; weakest credible evidence type
 */
function verifyFinalClassifications(
  state: ResearchState,
  claimVerdicts: any[],
  articleAnalysis: any
): void {
  const tracker = state.fallbackTracker;

  // Verify claim verdicts have harmPotential
  claimVerdicts.forEach((cv, index) => {
    if (!cv.harmPotential || !["high", "medium", "low"].includes(cv.harmPotential)) {
      const reason = !cv.harmPotential ? 'missing' : 'invalid';
      tracker.recordFallback({
        field: 'harmPotential',
        location: `Final Verdict #${index + 1}`,
        text: (cv.claimText || "").substring(0, 100),
        defaultUsed: "medium",
        reason
      });
      cv.harmPotential = "medium";
      console.warn(`[Fallback] Final verification: Verdict #${index + 1} missing harmPotential, set to "medium"`);
    }
  });

  // Verify KeyFactors have factualBasis and isContested
  if (articleAnalysis?.keyFactors) {
    articleAnalysis.keyFactors.forEach((kf: any, index: number) => {
      // factualBasis
      if (!kf.factualBasis || !["established", "disputed", "opinion", "unknown"].includes(kf.factualBasis)) {
        const reason = !kf.factualBasis ? 'missing' : 'invalid';
        tracker.recordFallback({
          field: 'factualBasis',
          location: `Final KeyFactor #${index + 1}`,
          text: (kf.factor || "").substring(0, 100),
          defaultUsed: "unknown",
          reason
        });
        kf.factualBasis = "unknown";
        console.warn(`[Fallback] Final verification: KeyFactor #${index + 1} missing factualBasis, set to "unknown"`);
      }

      // isContested
      if (typeof kf.isContested !== 'boolean') {
        tracker.recordFallback({
          field: 'isContested',
          location: `Final KeyFactor #${index + 1}`,
          text: (kf.factor || "").substring(0, 100),
          defaultUsed: "false",
          reason: 'missing'
        });
        kf.isContested = false;
        console.warn(`[Fallback] Final verification: KeyFactor #${index + 1} missing isContested, set to false`);
      }
    });
  }

  // Verify evidence items have sourceAuthority and evidenceBasis
  state.evidenceItems.forEach((item: any, index: number) => {
    // sourceAuthority
    if (!item.sourceAuthority || !["primary", "secondary", "opinion"].includes(item.sourceAuthority)) {
      const reason = !item.sourceAuthority ? 'missing' : 'invalid';
      tracker.recordFallback({
        field: 'sourceAuthority',
        location: `Final Evidence #${index + 1}`,
        text: (item.statement || "").substring(0, 100),
        defaultUsed: "secondary",
        reason
      });
      item.sourceAuthority = "secondary";
      console.warn(`[Fallback] Final verification: Evidence #${index + 1} missing sourceAuthority, set to "secondary"`);
    }

    // evidenceBasis
    if (!item.evidenceBasis || !["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"].includes(item.evidenceBasis)) {
      const reason = !item.evidenceBasis ? 'missing' : 'invalid';
      tracker.recordFallback({
        field: 'evidenceBasis',
        location: `Final Evidence #${index + 1}`,
        text: (item.statement || "").substring(0, 100),
        defaultUsed: "anecdotal",
        reason
      });
      item.evidenceBasis = "anecdotal";
      console.warn(`[Fallback] Final verification: Evidence #${index + 1} missing evidenceBasis, set to "anecdotal"`);
    }
  });

  // Log summary if any final verifications were needed
  const summary = tracker.getSummary();
  const finalFallbacks = summary.fallbackDetails.filter(f => f.location.startsWith('Final'));
  if (finalFallbacks.length > 0) {
    console.warn(`[Fallback] Final verification caught ${finalFallbacks.length} items that bypassed entry-point normalization`);
  }
}

// ============================================================================

async function refineContextsFromEvidence(
  state: ResearchState,
  model: any,
): Promise<{ updated: boolean; llmCalls: number }> {
  const evidenceNormalizer = new EvidenceNormalizer(state.fallbackTracker);
  if (!state.understanding) return { updated: false, llmCalls: 0 };

  const preRefineUnderstanding = JSON.parse(JSON.stringify(state.understanding)) as ClaimUnderstanding;
  const preRefineContexts = preRefineUnderstanding.analysisContexts || [];
  const preRefineEvidenceContextById = new Map<string, string>();
  for (const item of state.evidenceItems || []) {
    preRefineEvidenceContextById.set(String(item.id || ""), String((item as any).contextId || ""));
  }
  const preRefineClaimContextById = new Map<string, string>();
  for (const claim of preRefineUnderstanding.subClaims || []) {
    preRefineClaimContextById.set(String(claim.id || ""), String((claim as any).contextId || ""));
  }
  const rollbackRefinement = (
    reason: string,
    details?: Record<string, unknown>,
  ): { updated: false; llmCalls: number } => {
    state.understanding = JSON.parse(JSON.stringify(preRefineUnderstanding)) as ClaimUnderstanding;
    for (const item of state.evidenceItems || []) {
      const originalContextId = preRefineEvidenceContextById.get(String(item.id || ""));
      (item as any).contextId = originalContextId ?? "";
    }
    for (const claim of state.understanding.subClaims || []) {
      claim.contextId = preRefineClaimContextById.get(String(claim.id || "")) ?? "";
    }
    debugLog("refineContextsFromEvidence: rolled back to pre-refinement state", {
      reason,
      restoredContextCount: state.understanding.analysisContexts?.length ?? 0,
      ...(details || {}),
    });
    return { updated: false, llmCalls: 1 };
  };

  const evidenceItems = state.evidenceItems || [];
  // If we don't have enough evidence, skip refinement (avoid hallucinated contexts).
  // v2.6.39: Align threshold with mode config (quick=6, deep=8) to enable refinement in quick mode
  const config = getActiveConfig(state.pipelineConfig);
  const maxEvidenceCeiling = state.calcConfig.contextRefinement?.maxEvidenceCeiling ?? 8;
  const minEvidenceItemsForRefinement = Math.min(maxEvidenceCeiling, config.minEvidenceItemsRequired);
  if (evidenceItems.length < minEvidenceItemsForRefinement) {
    const mode = state.pipelineConfig?.analysisMode ?? DEFAULT_PIPELINE_CONFIG.analysisMode;
    debugLog(`[Refine] Skipping refinement: ${evidenceItems.length} evidence items < ${minEvidenceItemsForRefinement} threshold (mode: ${mode})`);
    return { updated: false, llmCalls: 0 };
  }

  const analysisInput =
    state.understanding.impliedClaim ||
    state.originalInput ||
    state.originalText ||
    "";

  const shouldEnableScopePromptSelection =
    state.pipelineConfig?.contextPromptSelectionEnabled ??
    DEFAULT_PIPELINE_CONFIG.contextPromptSelectionEnabled;

  const contextPromptMaxEvidenceItemsRaw =
    state.pipelineConfig?.contextPromptMaxEvidenceItems ??
    DEFAULT_PIPELINE_CONFIG.contextPromptMaxEvidenceItems ??
    40;
  const contextPromptMaxEvidenceItems = Number.isFinite(contextPromptMaxEvidenceItemsRaw)
    ? Math.max(8, Math.min(80, contextPromptMaxEvidenceItemsRaw))
    : 40;

  const promptEvidenceItems = shouldEnableScopePromptSelection
    ? await selectEvidenceItemsForContextRefinementPrompt(evidenceItems, analysisInput, contextPromptMaxEvidenceItems)
    : evidenceItems.slice(0, contextPromptMaxEvidenceItems);

  const evidenceText = promptEvidenceItems.map((item) => {
      const es = (item as any).evidenceScope;
      const esBits: string[] = [];
      if (es?.methodology) esBits.push(`method=${es.methodology}`);
      if (es?.boundaries) esBits.push(`boundaries=${es.boundaries}`);
      if (es?.geographic) esBits.push(`geo=${es.geographic}`);
      if (es?.temporal) esBits.push(`time=${es.temporal}`);
      const esStr = esBits.length > 0 ? ` | EvidenceScope: ${esBits.join("; ")}` : "";
      return `[${item.id}] ${item.statement} (Source: ${item.sourceTitle})${esStr}`;
    }).join("\n");

  const claimsText = (state.understanding.subClaims || [])
    .filter((c: any) => !c?.thesisRelevance || c.thesisRelevance === "direct")
    .slice(0, 12)
    .map((c: any) => `${c.id}: ${c.text}`)
    .join("\n");

  // Heuristic seed-context injection removed (LLM-only context intelligence).
  const seedHint = "";

  const schema = z.object({
    requiresSeparateAnalysis: z.boolean(),
    analysisContexts: z.array(ANALYSIS_CONTEXT_SCHEMA),
    evidenceContextAssignments: z
      .array(z.object({ evidenceId: z.string(), contextId: z.string() }))
      .default([]),
    claimContextAssignments: z
      .array(z.object({ claimId: z.string(), contextId: z.string() }))
      .default([]),
  });

  debugLog("refineContextsFromEvidence: deterministic seed hints disabled");

  let refined: any;
  try {
    const renderedSystem = await loadAndRenderSection("orchestrated", "CONTEXT_REFINEMENT", {});
    if (!renderedSystem?.content?.trim()) {
      throw new Error("Missing CONTEXT_REFINEMENT prompt section in orchestrated prompt profile");
    }

    const candidateContextsSection = seedHint
      ? (await loadAndRenderSection("orchestrated", "CONTEXT_REFINEMENT_CANDIDATES_BLOCK", {
          SEED_HINT: seedHint,
        }))?.content || ""
      : "";

    const renderedUser = await loadAndRenderSection("orchestrated", "CONTEXT_REFINEMENT_USER", {
      ANALYSIS_INPUT: analysisInput,
      EVIDENCE_TEXT: evidenceText,
      CLAIMS_TEXT: claimsText || "(none)",
      CANDIDATE_CONTEXTS_SECTION: candidateContextsSection,
    });
    if (!renderedUser?.content?.trim()) {
      throw new Error("Missing CONTEXT_REFINEMENT_USER prompt section in orchestrated prompt profile");
    }

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: renderedSystem.content, providerOptions: getPromptCachingOptions(state.pipelineConfig?.llmProvider) },
        { role: "user", content: renderedUser.content },
      ],
      temperature: getDeterministicTemperature(0.1, state.pipelineConfig),
      output: Output.object({ schema }),
      providerOptions: getStructuredOutputProviderOptions(state.pipelineConfig?.llmProvider ?? "anthropic"),
    });
    refined = extractStructuredOutput(result);
  } catch (err: any) {
    debugLog("refineContextsFromEvidence: FAILED", err?.message || String(err));
    return { updated: false, llmCalls: 0 };
  }

  const sp = schema.safeParse(refined);
  if (!sp.success) {
    debugLog("refineContextsFromEvidence: safeParse failed", {
      issues: sp.error.issues?.slice(0, 10),
    });
    return { updated: false, llmCalls: 1 };
  }

  const next = sp.data;
  if (!Array.isArray(next.analysisContexts) || next.analysisContexts.length === 0) {
    return { updated: false, llmCalls: 1 };
  }

  // Track whether LLM explicitly requested separate analysis
  const llmRequestedSeparateAnalysis = !!next.requiresSeparateAnalysis && next.analysisContexts.length > 1;

  const evidenceAssignments = next.evidenceContextAssignments || [];
  const normalizedEvidenceAssignments = evidenceAssignments.map((a) => ({
    ...a,
    evidenceId: evidenceNormalizer.normalizeId(String(a.evidenceId ?? ""), "refineContextsFromEvidence"),
  }));

  const claimAssignmentsList = next.claimContextAssignments || [];

  // Validate coverage: we need assignments for most evidence items, and at least one evidence item per context.
  const assignmentCount = normalizedEvidenceAssignments.length;
  const minCoverage = state.calcConfig.contextRefinement?.minAssignmentCoverage ?? 0.7;
  if (assignmentCount < Math.floor(promptEvidenceItems.length * minCoverage)) {
    debugLog("refineContextsFromEvidence: rejected (insufficient evidence assignments)", {
      evidenceItemsInPrompt: promptEvidenceItems.length,
      totalEvidenceItems: evidenceItems.length,
      assignments: assignmentCount,
    });
    return { updated: false, llmCalls: 1 };
  }

  // Apply refined contexts.
  state.understanding = {
    ...state.understanding!,
    analysisContexts: next.analysisContexts,
    requiresSeparateAnalysis: !!next.requiresSeparateAnalysis && next.analysisContexts.length > 1,
  };

  // Canonicalize IDs and keep a remap so we can remap evidence/claim assignments.
  const canon = canonicalizeContextsWithRemap(analysisInput, state.understanding!);
  state.understanding = canon.understanding;

  const remapId = (id: string) => (id && canon.idRemap.has(id) ? canon.idRemap.get(id)! : id);

  // Remap any pre-existing evidence/claim assignments across canonicalization (important when we don't
  // necessarily reassign every evidence item/claim during refinement).
  for (const item of state.evidenceItems || []) {
    const rp = String((item as any).contextId || "");
    if (rp) (item as any).contextId = remapId(rp);
  }
  for (const c of state.understanding!.subClaims || []) {
    const rp = String((c as any).contextId || "");
    if (rp) (c as any).contextId = remapId(rp);
  }

  // Optional: merge near-duplicate EvidenceScopes deterministically and remap assignments.
  // NOTE: Do this BEFORE applying evidenceContextAssignments/claimContextAssignments (or legacy fields)
  // so assignments are mapped consistently.
  let dedupMerged: Map<string, string> | null = null;
  let oldToNewRemap: Map<string, string> | null = null;
  const dedupEnabled =
    state.pipelineConfig?.contextDedupEnabled ??
    DEFAULT_PIPELINE_CONFIG.contextDedupEnabled;
  if (dedupEnabled) {
    // v2.6.38: Only drop contexts that are highly overlapping (>=85% similarity)
    // Lower values cause valid contexts and claims to be lost
    const thr =
      state.pipelineConfig?.contextDedupThreshold ??
      DEFAULT_PIPELINE_CONFIG.contextDedupThreshold ??
      0.85;
    const threshold = Number.isFinite(thr) ? Math.max(0, Math.min(1, thr)) : 0.85;
    // v2.9: deduplicateContexts is now async to support LLM context similarity analysis
    const dedup = await deduplicateContexts(
      state.understanding!.analysisContexts || [],
      threshold,
      state.pipelineConfig ?? undefined,
    );
    dedupMerged = dedup.merged;
    state.understanding!.analysisContexts = dedup.contexts;

    // Remap any pre-existing evidence/claim assignments (from earlier phases) to merged IDs.
    for (const f of state.evidenceItems || []) {
      const rp = String((f as any).contextId || "");
      if (!rp) continue;
      if (dedupMerged.has(rp)) (f as any).contextId = dedupMerged.get(rp)!;
    }
    for (const c of state.understanding!.subClaims || []) {
      const rp = String((c as any).contextId || "");
      if (!rp) continue;
      if (dedupMerged.has(rp)) (c as any).contextId = dedupMerged.get(rp)!;
    }
  }

  // Phase 4b+4c: Batched LLM similarity remap for orphaned old→new context IDs.
  // Collects IDs referenced by claims/evidence that no longer exist in current contexts,
  // filters out IDs already resolvable by canon/dedup remaps, then uses LLM similarity
  // to match remaining orphans to their replacement contexts.
  {
    const currentContextIds = new Set(state.understanding!.analysisContexts.map(ctx => ctx.id));
    const referencedIds = new Set<string>();
    for (const claim of state.understanding!.subClaims || []) {
      const cid = String((claim as any).contextId || "");
      if (cid) referencedIds.add(cid);
    }
    for (const item of state.evidenceItems || []) {
      const cid = String((item as any).contextId || "");
      if (cid) referencedIds.add(cid);
    }
    // Identify truly orphaned IDs: referenced but not in current contexts AND not
    // resolvable by canon remap or dedup merge.
    const trulyOrphanedIds: string[] = [];
    for (const refId of referencedIds) {
      if (currentContextIds.has(refId)) continue;
      // Check if canon remap resolves it
      const canonResolved = remapId(refId);
      if (canonResolved && currentContextIds.has(canonResolved)) continue;
      // Check if dedup merge resolves it
      if (dedupMerged) {
        let chased = canonResolved || refId;
        const seen = new Set<string>();
        while (chased && dedupMerged.has(chased) && !seen.has(chased)) {
          seen.add(chased);
          chased = dedupMerged.get(chased)!;
        }
        if (currentContextIds.has(chased)) continue;
      }
      trulyOrphanedIds.push(refId);
    }
    if (trulyOrphanedIds.length > 0) {
      // Reconstruct orphaned old contexts from preRefineContexts
      const orphanedOldContexts = preRefineContexts.filter(ctx => trulyOrphanedIds.includes(ctx.id));
      const similarityThreshold = state.calcConfig?.contextRefinement?.oldToNewSimilarityThreshold ?? 0.65;
      oldToNewRemap = await buildOldToNewContextRemap(
        orphanedOldContexts,
        state.understanding!.analysisContexts,
        similarityThreshold,
      );
      if (oldToNewRemap.size > 0) {
        const remapResult = applyContextIdRemap(oldToNewRemap, state);
        debugLog("Phase 4 old\u2192new context remap applied", {
          orphanedCount: trulyOrphanedIds.length,
          matchedCount: oldToNewRemap.size,
          remappedClaims: remapResult.remappedClaims,
          remappedEvidence: remapResult.remappedEvidence,
          threshold: similarityThreshold,
        });
      } else {
        debugLog("Phase 4 old\u2192new context remap: no LLM matches found", {
          orphanedCount: trulyOrphanedIds.length,
          unmatchedIds: trulyOrphanedIds.slice(0, 8),
        });
      }
    }
  }

  // IMPORTANT: finalize any context ID coming from the refinement output by applying both:
  // - canonicalization remap (remapId)
  // - context dedup merge remap (dedupMerged), transitively (in case of chained merges)
  const finalizeContextId = (rawId: string): string => {
    let pid = remapId(rawId || "");
    if (!pid) return "";
    if (dedupMerged) {
      // Chase merges transitively to a stable representative ID.
      const seen = new Set<string>();
      while (pid && dedupMerged.has(pid) && !seen.has(pid)) {
        seen.add(pid);
        pid = dedupMerged.get(pid)!;
      }
    }
    // Phase 4b: Chase old→new remap from LLM similarity matching
    if (oldToNewRemap?.has(pid)) pid = oldToNewRemap.get(pid)!;
    return pid;
  };

  const evidenceAssignmentsById = new Map<string, string>();
  for (const a of normalizedEvidenceAssignments) {
    const pid = finalizeContextId(a.contextId || "");
    if (!a.evidenceId || !pid) continue;
    evidenceAssignmentsById.set(a.evidenceId, pid);
  }

  // v2.6.31: Identify evidence items that were in promptEvidenceItems (sent to LLM) vs excluded items
  const promptEvidenceItemIds = new Set(promptEvidenceItems.map((item) => item.id));

  // Determine default context for evidence items not included in promptEvidenceItems
  // Use the first/primary context as the default (most analyses have one dominant context)
  const defaultContextId = (state.understanding!.analysisContexts || [])[0]?.id || "";

  for (const item of state.evidenceItems) {
    const pid = evidenceAssignmentsById.get(item.id);
    if (pid) {
      // Evidence item was in promptEvidenceItems and got an assignment from LLM
      item.contextId = pid;
    } else if (!promptEvidenceItemIds.has(item.id) && defaultContextId && !item.contextId) {
      // Evidence item was NOT in promptEvidenceItems (excluded due to max limit) and has no assignment
      // Assign to default context to prevent orphaning
      item.contextId = defaultContextId;
      debugLog("refineContextsFromEvidence: assigned excluded evidence to default context", {
        evidenceId: item.id,
        defaultContextId,
        reason: "evidence excluded from promptEvidenceItems due to max limit",
      });
    }
    // Evidence items that were in promptEvidenceItems but got no assignment are left alone
    // (they may have pre-existing assignments or will be reconciled by ensureScopesCoverAssignments)
  }

  // Phase 4 fix: Apply claim assignments from LLM refinement BEFORE ensureContextsCoverAssignments.
  // Claims must reference new (finalized) context IDs so that reconciliation and zero-evidence
  // checks see the correct state. Previously this ran at the very end of the function, causing
  // reconciliation to restore old contexts (which had zero evidence) and trigger rollback.
  const claimAssignments = new Map<string, string>();
  for (const a of claimAssignmentsList) {
    const pid = finalizeContextId(a.contextId || "");
    if (!a.claimId || !pid) continue;
    claimAssignments.set(a.claimId, pid);
  }
  for (const c of state.understanding!.subClaims || []) {
    const pid = claimAssignments.get(c.id);
    if (pid) c.contextId = pid;
  }

  // IMPORTANT: ensure we never end up with orphaned assignments (evidence/claims referencing a
  // context ID that does not exist in analysisContexts). This can happen because:
  // - understandClaim/extractEvidence may assign IDs from the initial context list
  // - refineContextsFromEvidence may overwrite analysisContexts with a refined list that omits
  //   some previously-referenced context IDs (claimContextAssignments are optional)
  //
  // Strategy (generic):
  // - If an orphaned contextId exists in the pre-refinement context list, restore that context.
  // - Otherwise, clear the orphaned assignment to keep the state consistent.
  const ensureContextsCoverAssignments = () => {
    const prevById = new Map<string, any>();
    for (const s of preRefineContexts as any[]) {
      if (s?.id) prevById.set(String(s.id), s);
    }

    const referenced = new Set<string>();
    for (const f of state.evidenceItems || []) {
      const rp = String((f as any)?.contextId || "").trim();
      if (rp) referenced.add(rp);
    }
    for (const c of state.understanding?.subClaims || []) {
      const rp = String((c as any)?.contextId || "").trim();
      if (rp) referenced.add(rp);
    }

    const contextsNow = state.understanding!.analysisContexts || [];
    const contextById = new Map<string, any>();
    for (const s of contextsNow as any[]) {
      if (s?.id) contextById.set(String(s.id), s);
    }

    const restored: string[] = [];
    const cleared: string[] = [];
    for (const rp of referenced) {
      if (contextById.has(rp)) continue;
      const prev = prevById.get(rp);
      if (prev) {
        contextsNow.push(prev);
        contextById.set(rp, prev);
        restored.push(rp);
      } else {
        // We can't restore it; clear downstream references so UI/state stays consistent.
        for (const f of state.evidenceItems || []) {
          if (String((f as any)?.contextId || "") === rp) (f as any).contextId = "";
        }
        for (const c of state.understanding?.subClaims || []) {
          if (String((c as any)?.contextId || "") === rp) (c as any).contextId = "";
        }
        cleared.push(rp);
      }
    }

    if (restored.length > 0 || cleared.length > 0) {
      state.understanding!.analysisContexts = contextsNow;
      // v2.6.31: Fix - use simple check instead of AND logic
      // If we have multiple contexts after restoration, enable separate analysis
      // (the AND logic incorrectly kept requiresSeparateAnalysis=false when contexts were restored)
      state.understanding!.requiresSeparateAnalysis = contextsNow.length > 1;
      debugLog("refineContextsFromEvidence: reconciled orphaned context assignments", {
        restored: restored.slice(0, 8),
        cleared: cleared.slice(0, 8),
      });
    }
  };

  ensureContextsCoverAssignments();

  // Phase 4a: Final orphan check — clear truly-orphaned contextIds that survived
  // all remap layers (canon, dedup, LLM similarity) AND ensureContextsCoverAssignments restoration.
  // Covers BOTH claims AND evidence items.
  {
    const finalContextIds = new Set(state.understanding!.analysisContexts.map(ctx => ctx.id));
    for (const claim of state.understanding!.subClaims || []) {
      const cid = String((claim as any).contextId || "");
      if (cid && !finalContextIds.has(cid)) {
        debugLog(`Final orphan check: claim ${claim.id} still references non-existent context ${cid}, clearing`);
        (claim as any).contextId = "";
      }
    }
    for (const item of state.evidenceItems || []) {
      const cid = String((item as any).contextId || "");
      if (cid && !finalContextIds.has(cid)) {
        debugLog(`Final orphan check: evidence ${item.id} still references non-existent context ${cid}, clearing`);
        (item as any).contextId = "";
      }
    }
  }

  // If refinement replaced the original anchor AnalysisContext with unrelated alternatives,
  // recover the anchor deterministically and keep the most input-relevant contexts.
  if (preRefineContexts.length === 1 && (state.understanding!.analysisContexts?.length ?? 0) >= 1) {
    const anchor = preRefineContexts[0] as any;
    const contextsNow = (state.understanding!.analysisContexts || []) as any[];
    const anchorRecoverySim = CONTEXT_SIMILARITY_CONFIG.anchorRecoveryThreshold ?? 0.6;
    const anchorSims = await Promise.all(
      contextsNow.map((ctx) => assessContextSimilarity(ctx, anchor)),
    );
    const anchorStillRepresented = anchorSims.some((sim) => sim >= anchorRecoverySim);

    if (!anchorStillRepresented) {
      // Score each context by LLM similarity to input + structural authority bonus
      const ctxSimPairs = contextsNow.map((ctx: any, idx: number) => {
        const meta = (ctx?.metadata || {}) as Record<string, any>;
        const ctxText = [
          String(ctx?.name || ""),
          String(ctx?.subject || ""),
          String(ctx?.assessedStatement || ""),
          String(meta.institution || ""),
          String(meta.jurisdiction || ""),
        ].filter(Boolean).join(" ");
        return { id: `ctx_${idx}`, textA: analysisInput, textB: ctxText };
      });
      const ctxSimScores = await assessTextSimilarityBatch(ctxSimPairs);

      const scoreContext = (ctx: any, idx: number): number => {
        const meta = (ctx?.metadata || {}) as Record<string, any>;
        const relevanceScore = ctxSimScores.get(`ctx_${idx}`) || 0;
        let authorityScore = 0;
        if (meta.court) authorityScore += 3;
        if (meta.institution) authorityScore += 2;
        if (Array.isArray(meta.decisionMakers) && meta.decisionMakers.length > 0) authorityScore += 2;
        if (Array.isArray(meta.charges) && meta.charges.length > 0) authorityScore += 1;
        return relevanceScore * 100 + authorityScore;
      };

      const targetCount = Math.max(2, contextsNow.length);
      const ranked = contextsNow.map((ctx: any, idx: number) => ({ ctx, score: scoreContext(ctx, idx) }))
        .sort((a, b) => b.score - a.score)
        .map((s) => s.ctx);
      const kept: any[] = [anchor];
      for (const ctx of ranked) {
        if (kept.length >= targetCount) break;
        kept.push(ctx);
      }
      state.understanding!.analysisContexts = kept;
      state.understanding!.requiresSeparateAnalysis = kept.length > 1;

      let restoredEvidenceCount = 0;
      for (const item of state.evidenceItems || []) {
        if (preRefineEvidenceContextById.get(String(item.id || "")) === String(anchor.id || "")) {
          (item as any).contextId = String(anchor.id || "");
          restoredEvidenceCount += 1;
        }
      }
      if (restoredEvidenceCount === 0 && (state.evidenceItems?.length ?? 0) > 0) {
        const anchorDesc = buildContextDescription(anchor);
        const evidSimPairs = (state.evidenceItems || [])
          .filter((item) => item.statement || item.sourceTitle)
          .map((item, idx) => ({
            id: `ev_${idx}`,
            textA: anchorDesc,
            textB: `${item.statement || ""} ${item.sourceTitle || ""}`,
          }));
        if (evidSimPairs.length > 0) {
          const evidSimScores = await assessTextSimilarityBatch(evidSimPairs);
          let bestItem: any = null;
          let bestScore = 0;
          const items = (state.evidenceItems || []).filter((item) => item.statement || item.sourceTitle);
          for (let ei = 0; ei < items.length; ei++) {
            const score = evidSimScores.get(`ev_${ei}`) || 0;
            if (score > bestScore) {
              bestScore = score;
              bestItem = items[ei];
            }
          }
          if (bestItem && bestScore > 0.1) {
            (bestItem as any).contextId = String(anchor.id || "");
            restoredEvidenceCount = 1;
          }
        }
      }

      let restoredClaimCount = 0;
      for (const claim of state.understanding!.subClaims || []) {
        if (preRefineClaimContextById.get(String(claim.id || "")) === String(anchor.id || "")) {
          (claim as any).contextId = String(anchor.id || "");
          restoredClaimCount += 1;
        }
      }

      debugLog("refineContextsFromEvidence: restored anchor context after drift", {
        anchorId: anchor.id,
        retainedContextIds: kept.map((c) => c.id),
        restoredEvidenceCount,
        restoredClaimCount,
      });
    }
  }

  // Best-effort recovery for under-split contexts after evidence-driven refinement.
  if ((state.understanding!.analysisContexts?.length ?? 0) <= 1) {
    const supplemental = await requestSupplementalContexts(
      analysisInput,
      model,
      state.understanding!,
      state.pipelineConfig,
    );
    if (supplemental?.analysisContexts && supplemental.analysisContexts.length > 1) {
      state.understanding = {
        ...state.understanding!,
        analysisContexts: supplemental.analysisContexts,
        requiresSeparateAnalysis: true,
      };

      const canonSupplemental = canonicalizeContextsWithRemap(analysisInput, state.understanding!);
      state.understanding = canonSupplemental.understanding;
      const existingIds = new Set((state.understanding!.analysisContexts || []).map((ctx) => String(ctx.id || "")));
      const defaultContextId = String((state.understanding!.analysisContexts || [])[0]?.id || "");

      for (const item of state.evidenceItems || []) {
        const cid = String((item as any).contextId || "");
        if (!cid || !existingIds.has(cid)) {
          (item as any).contextId = defaultContextId;
        }
      }
      for (const claim of state.understanding!.subClaims || []) {
        const cid = String((claim as any).contextId || "");
        if (!cid || !existingIds.has(cid)) {
          (claim as any).contextId = defaultContextId;
        }
      }

      const evidenceCountByContext = new Map<string, number>();
      for (const item of state.evidenceItems || []) {
        const cid = String((item as any).contextId || "");
        if (!cid) continue;
        evidenceCountByContext.set(cid, (evidenceCountByContext.get(cid) || 0) + 1);
      }

      const allEvidence = state.evidenceItems || [];
      const contextsNeedingEvidence = (state.understanding!.analysisContexts || [])
        .filter((ctx) => (evidenceCountByContext.get(ctx.id) || 0) === 0);
      if (contextsNeedingEvidence.length > 0 && allEvidence.length > 0) {
        // Batch all context-evidence pairs for LLM similarity
        const ctxEvPairs: Array<{ id: string; textA: string; textB: string }> = [];
        for (const ctx of contextsNeedingEvidence) {
          const ctxDesc = buildContextDescription(ctx as any);
          for (let ei = 0; ei < allEvidence.length; ei++) {
            const item = allEvidence[ei];
            ctxEvPairs.push({
              id: `${ctx.id}__${ei}`,
              textA: ctxDesc,
              textB: `${item.statement || ""} ${item.sourceTitle || ""}`,
            });
          }
        }
        const ctxEvScores = await assessTextSimilarityBatch(ctxEvPairs);
        for (const ctx of contextsNeedingEvidence) {
          let bestItem: any = null;
          let bestScore = 0;
          for (let ei = 0; ei < allEvidence.length; ei++) {
            const score = ctxEvScores.get(`${ctx.id}__${ei}`) || 0;
            if (score > bestScore) {
              bestScore = score;
              bestItem = allEvidence[ei];
            }
          }
          if (bestItem && bestScore > 0.1) {
            (bestItem as any).contextId = String(ctx.id || "");
            evidenceCountByContext.set(ctx.id, 1);
          }
        }
      }

      debugLog("refineContextsFromEvidence: supplemental contexts applied post-refinement", {
        contextCount: state.understanding!.analysisContexts.length,
        contextIds: state.understanding!.analysisContexts.map((ctx: any) => ctx.id),
      });
    }
  }

  const evidenceItemsPerContext = new Map<string, number>();
  for (const f of state.evidenceItems) {
    const pid = String(f.contextId || "");
    if (!pid) continue;
    evidenceItemsPerContext.set(pid, (evidenceItemsPerContext.get(pid) || 0) + 1);
  }
  for (const s of state.understanding!.analysisContexts || []) {
    const c = evidenceItemsPerContext.get(s.id) || 0;
    if (c < 1) {
      debugLog("refineContextsFromEvidence: rejected (context with zero evidence)", {
        contextId: s.id,
        contextName: s.name,
      });
      return rollbackRefinement("context-with-zero-evidence", {
        contextId: s.id,
        contextName: s.name,
      });
    }
  }

  // Avoid over-splitting into "dimension contexts" (e.g., cost vs infrastructure) unless the
  // evidence indicates genuinely distinct analytical frames (methodology/boundaries/geography/temporal).
  if ((state.understanding!.analysisContexts?.length ?? 0) > 1) {
    const contextsNow = state.understanding!.analysisContexts || [];

    const contextFrameKeys = new Set<string>();
    for (const s of contextsNow as any[]) {
      const m = String(s?.metadata?.methodology || "").trim();
      const b = String(s?.metadata?.boundaries || "").trim();
      const g = String(s?.metadata?.geographic || "").trim();
      const t = String(s?.metadata?.temporal || s?.temporal || "").trim();
      const inst = String(s?.metadata?.institution || s?.metadata?.court || "").trim();
      const key = [inst, m, b, g, t].filter(Boolean).join("|");
      if (key) contextFrameKeys.add(key);
    }

    const evidenceScopeKeysByContext = new Map<string, Set<string>>();
    for (const f of state.evidenceItems as any[]) {
      const pid = String(f?.contextId || "");
      if (!pid) continue;
      const es = f?.evidenceScope;
      if (!es) continue;
      const mk = String(es?.methodology || "").trim();
      const bk = String(es?.boundaries || "").trim();
      const gk = String(es?.geographic || "").trim();
      const tk = String(es?.temporal || "").trim();
      const nk = String(es?.name || "").trim();
      const key = [nk, mk, bk, gk, tk].filter(Boolean).join("|");
      if (!key) continue;
      if (!evidenceScopeKeysByContext.has(pid)) evidenceScopeKeysByContext.set(pid, new Set());
      evidenceScopeKeysByContext.get(pid)!.add(key);
    }

    const distinctEvidenceScopeKeys = new Set<string>();
    for (const set of evidenceScopeKeysByContext.values()) {
      for (const k of set) distinctEvidenceScopeKeys.add(k);
    }
    const contextsWithEvidenceScope = Array.from(evidenceScopeKeysByContext.entries()).filter(
      ([, set]) => set.size > 0,
    ).length;

    let hasStrongFrameSignal =
      contextFrameKeys.size >= 2 ||
      (distinctEvidenceScopeKeys.size >= 2 && contextsWithEvidenceScope >= 2);

    // Text-based distinctness check: if any pair of contexts has clearly different
    // names AND assessed statements, they represent genuinely distinct analytical
    // frames even without structured evidenceScope metadata.
    if (!hasStrongFrameSignal && contextsNow.length >= 2) {
      const nameThreshold = state.calcConfig.frameSignal?.nameDistinctnessThreshold ?? 0.35;
      const assessedThreshold = state.calcConfig.frameSignal?.assessedDistinctnessThreshold ?? 0.45;
      // Batch all frame signal pairs for LLM assessment
      const framePairs: Array<{ id: string; textA: string; textB: string }> = [];
      const framePairIndices: Array<{ i: number; j: number }> = [];
      for (let i = 0; i < contextsNow.length; i++) {
        for (let j = i + 1; j < contextsNow.length; j++) {
          const cA = contextsNow[i] as any;
          const cB = contextsNow[j] as any;
          const nameA = String(cA?.name || "").trim();
          const nameB = String(cB?.name || "").trim();
          const assessedA = String(cA?.assessedStatement || "").trim();
          const assessedB = String(cB?.assessedStatement || "").trim();
          if (nameA && nameB && assessedA && assessedB) {
            framePairs.push({ id: `n-${i}-${j}`, textA: nameA, textB: nameB });
            framePairs.push({ id: `a-${i}-${j}`, textA: assessedA, textB: assessedB });
            framePairIndices.push({ i, j });
          }
        }
      }
      const frameScores = await assessTextSimilarityBatch(framePairs);
      for (const { i, j } of framePairIndices) {
        const nSim = frameScores.get(`n-${i}-${j}`) ?? 1;
        const aSim = frameScores.get(`a-${i}-${j}`) ?? 1;
        if (nSim < nameThreshold && aSim < assessedThreshold) {
          hasStrongFrameSignal = true;
          debugLog("refineContextsFromEvidence: text distinctness provides strong frame signal", {
            contextA: (contextsNow[i] as any)?.name,
            contextB: (contextsNow[j] as any)?.name,
            nameSimilarity: nSim,
            assessedSimilarity: aSim,
          });
          break;
        }
      }
    }

    // If the refinement LLM explicitly determined separate analysis is required AND
    // there is at least partial metadata/evidence support, trust the LLM's judgment.
    // Require partial support to prevent unconditional acceptance of LLM frame signals
    // when there is no structural evidence backing the split.
    if (!hasStrongFrameSignal && llmRequestedSeparateAnalysis) {
      const hasPartialSupport = contextFrameKeys.size >= 1 || distinctEvidenceScopeKeys.size >= 1;
      if (hasPartialSupport) {
        hasStrongFrameSignal = true;
        debugLog("refineContextsFromEvidence: LLM requiresSeparateAnalysis accepted (partial metadata support)", {
          contextCount: contextsNow.length,
          contextFrameKeys: contextFrameKeys.size,
          distinctEvidenceScopeKeys: distinctEvidenceScopeKeys.size,
        });
      } else {
        debugLog("refineContextsFromEvidence: LLM requiresSeparateAnalysis rejected (no metadata support)", {
          contextCount: contextsNow.length,
        });
      }
    }

    if (!hasStrongFrameSignal) {
      // Extra debug signal: if contexts are very similar by text/metadata, it's likely a dimension split.
      const thrRaw =
        state.pipelineConfig?.evidenceScopeAlmostEqualThreshold ??
        DEFAULT_PIPELINE_CONFIG.evidenceScopeAlmostEqualThreshold ??
        0.7;
      const simThreshold = Number.isFinite(thrRaw) ? Math.max(0, Math.min(1, thrRaw)) : 0.7;
      const pairs: Array<{ a: string; b: string; sim: number }> = [];
      const contextPairPromises: Array<{ i: number; j: number; promise: Promise<number> }> = [];
      for (let i = 0; i < contextsNow.length; i++) {
        for (let j = i + 1; j < contextsNow.length; j++) {
          contextPairPromises.push({ i, j, promise: assessContextSimilarity(contextsNow[i] as any, contextsNow[j] as any) });
        }
      }
      for (const { i, j, promise } of contextPairPromises) {
        const sim = await promise;
        if (sim >= simThreshold) {
          pairs.push({ a: (contextsNow[i] as any).name, b: (contextsNow[j] as any).name, sim });
        }
      }
      debugLog("refineContextsFromEvidence: rejected (likely dimension split, weak frame signals)", {
        contextCount: contextsNow.length,
        contextFrameKeyCount: contextFrameKeys.size,
        distinctEvidenceScopeKeys: distinctEvidenceScopeKeys.size,
        contextsWithEvidenceScope,
        highSimilarityPairs: pairs.slice(0, 8),
      });
      return rollbackRefinement("weak-frame-signal", {
        contextCount: contextsNow.length,
        contextFrameKeyCount: contextFrameKeys.size,
        distinctEvidenceScopeKeys: distinctEvidenceScopeKeys.size,
        contextsWithEvidenceScope,
      });
    }

    debugLog("refineContextsFromEvidence: frame signal check PASSED", {
      contextCount: contextsNow.length,
      contextNames: contextsNow.map((c: any) => c.name),
    });
  }

  // Optional: enforce EvidenceScope name alignment based on context metadata + per-evidence evidenceScope signals.
  // NOTE: This runs AFTER the frame signal check so that text-distinctness evaluates original LLM names,
  // not scope-inflated names (which inflate similarity and cause false frame-signal passes).
  const nameAlignmentEnabled =
    state.pipelineConfig?.contextNameAlignmentEnabled ??
    DEFAULT_PIPELINE_CONFIG.contextNameAlignmentEnabled;
  if (nameAlignmentEnabled) {
    const thr =
      state.pipelineConfig?.contextNameAlignmentThreshold ??
      DEFAULT_PIPELINE_CONFIG.contextNameAlignmentThreshold ??
      0.3;
    const threshold = Number.isFinite(thr) ? Math.max(0, Math.min(1, thr)) : 0.3;
    state.understanding!.analysisContexts = await validateAndFixContextNameAlignment(
      state.understanding!.analysisContexts || [],
      state.evidenceItems || [],
      threshold,
    );
  }

  // Ensure we never end up with zero contexts.
  state.understanding = ensureAtLeastOneContext(state.understanding!);

  // If we introduced multi-context but claim coverage is thin, add minimal per-context central claims.
  // (This is generic decomposition; it does not â€œhuntâ€ for named scenarios.)
  if (state.understanding!.analysisContexts.length > 1 && state.understanding!.subClaims.length <= 1) {
    const added = await requestSupplementalSubClaims(analysisInput, model, state.understanding!, state.pipelineConfig);
    if (added.length > 0) {
      state.understanding!.subClaims.push(...added);
    }
    return { updated: true, llmCalls: 2 };
  }

  return { updated: true, llmCalls: 1 };
}

/**
 * NEW v2.6.29: Generate an inverse claim query for counter-evidence search
 * For comparative claims like "X is better than Y", generates "Y is better than X"
 * For efficiency claims, generates the opposite ("inefficient", "less efficient", etc.)
 * Returns null if no meaningful inverse can be generated
 */
function generateInverseClaimQuery(claim: string): string | null {
  if (!claim || claim.length < 10) return null;

  const normalizedClaim = String(claim)
    .replace(/^it\s+(?:is|was)\s+the\s+case\s+that\s+/i, "")
    .replace(/^the claim that\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const lowerClaim = normalizedClaim.toLowerCase();
  if (normalizedClaim.length < 10) return null;

  // Pattern 1a: "Using X for Y is more Z than [using] W" - swap X and W
  // Example: "Using Technology A for transport is more efficient than using Technology B"
  // -> "Using Technology B for transport is more efficient than Technology A"
  const usingPattern = /using\s+(\w+(?:\s+\w+)?)\s+(?:for\s+\w+\s+)?(?:is|are)\s+(?:more\s+)?(\w+)\s+than\s+(?:using\s+)?(\w+(?:\s+\w+)?)/i;
  const usingMatch = normalizedClaim.match(usingPattern);
  if (usingMatch) {
    const [, subjectA, adjective, subjectB] = usingMatch;
    // Generate proper inverse: swap subjects
    return `${subjectB.trim()} is more ${adjective} than ${subjectA.trim()} evidence data`;
  }

  // Pattern 1b: General comparative "X is/are [more] Z than Y" - swap X and Y
  const comparativePattern = /^(.+?)\s+(?:is|are)\s+(?:more\s+)?(\w+)\s+than\s+(.+)$/i;
  const compMatch = normalizedClaim.match(comparativePattern);
  if (compMatch) {
    const [, subjectA, adjective, subjectB] = compMatch;
    // Clean up subjects (remove "using" prefix if present)
    const cleanA = subjectA.replace(/^using\s+/i, '').trim();
    const cleanB = subjectB.replace(/^using\s+/i, '').trim();
    // Generate inverse: "B is more [adjective] than A"
    return `${cleanB} is more ${adjective} than ${cleanA} evidence data`;
  }

  // Pattern 2: Efficiency/performance claims without explicit comparison
  // Look for key adjectives and generate opposite search
  const efficiencyWords = ['efficient', 'effective', 'better', 'superior', 'faster', 'cheaper', 'safer'];
  const oppositeMappings: Record<string, string> = {
    'efficient': 'inefficient',
    'effective': 'ineffective',
    'better': 'worse',
    'superior': 'inferior',
    'faster': 'slower',
    'cheaper': 'more expensive',
    'safer': 'more dangerous',
  };

  for (const word of efficiencyWords) {
    if (lowerClaim.includes(word)) {
      const opposite = oppositeMappings[word] || `not ${word}`;
      // Extract the main subject (first noun phrase)
      const subjectMatch = normalizedClaim.match(/(?:using\s+)?(\w+(?:\s+\w+){0,2})/i);
      if (subjectMatch) {
        return `${subjectMatch[1]} ${opposite} evidence data`;
      }
    }
  }

  // Pattern 3: Simple negation for factual claims
  // For claims starting with "The X is/was/has", search for contradicting evidence
  const factualPattern = /^(?:the\s+)?(.+?)\s+(?:is|was|has|have|are|were)\s+(.+)/i;
  const factMatch = normalizedClaim.match(factualPattern);
  if (factMatch) {
    const [, subject, predicate] = factMatch;
    const predicateHead = predicate.trim().split(" ").slice(0, 4).join(" ");
    return `${subject.trim()} ${predicateHead} contradictory evidence`;
  }

  // Fallback: keep query grammatical and context-bound.
  const words = normalizedClaim
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 10)
    .join(" ");
  if (!words) return null;
  return `${words} contradictory evidence primary source`;
}

/**
 * Pipeline Phase 1: Evidence gap types and severity
 */
interface EvidenceGap {
  claimId: string;
  claimText: string;
  contextId: string;
  gapType: "no_evidence" | "no_counter_evidence" | "low_quality" | "outdated";
  severity: "critical" | "high" | "medium" | "low";
  suggestedQueries: string[];
  attemptedQueries: string[];
}

/**
 * Pipeline Phase 1: Analyze evidence gaps for claims
 * Returns a list of gaps with suggested queries to fill them
 */
async function analyzeEvidenceGaps(
  evidenceItems: EvidenceItem[],
  understanding: ClaimUnderstanding,
  searchQueries: Array<{ query: string; iteration: number }>,
  evidenceSimilarityThreshold: number = 0.4,
): Promise<EvidenceGap[]> {
  const gaps: EvidenceGap[] = [];
  const contextById = new Map<string, AnalysisContext>();
  for (const context of understanding.analysisContexts || []) {
    contextById.set(String(context.id || ""), context);
  }

  for (const claim of understanding.subClaims) {
    // Batch LLM similarity for evidence-to-claim relevance scoring
    const needsScoring = evidenceItems.filter((e) =>
      !(e.contextId && claim.contextId && e.contextId === claim.contextId),
    );
    const pairs = needsScoring.map((e) => ({
      id: e.id || `ev-${Math.random().toString(36).slice(2)}`,
      textA: e.statement,
      textB: claim.text,
    }));
    const scores = await assessTextSimilarityBatch(pairs);

    const relevantEvidence = evidenceItems.filter((e) => {
      if (e.contextId && claim.contextId && e.contextId === claim.contextId) return true;
      const pairId = e.id || "";
      return (scores.get(pairId) ?? 0) > evidenceSimilarityThreshold;
    });

    // Get queries that were attempted for this claim's context
    const attemptedQueries = searchQueries
      .filter((sq) => sq.query.toLowerCase().includes(claim.text.toLowerCase().split(" ").slice(0, 3).join(" ")))
      .map((sq) => sq.query);
    const context = contextById.get(String(claim.contextId || ""));
    const contextMetadata = (context?.metadata || {}) as Record<string, any>;
    const contextAuthority = String(
      contextMetadata.court ||
      contextMetadata.institution ||
      contextMetadata.regulatoryBody ||
      "",
    ).trim();
    const contextJurisdiction = String(
      contextMetadata.jurisdiction || contextMetadata.geographic || "",
    ).trim();
    const contextSubject = String(context?.subject || context?.assessedStatement || "").trim();
    const compactSubject = contextSubject
      .split(/\s+/)
      .slice(0, 8)
      .join(" ");
    const contextQueryBase = [
      compactSubject,
      contextAuthority,
      contextJurisdiction,
      claim.text.split(/\s+/).slice(0, 8).join(" "),
    ]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const compactClaim = claim.text
      .split(/\s+/)
      .slice(0, 8)
      .join(" ");
    const compactContext = [contextAuthority, contextJurisdiction]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Gap 1: No evidence at all
    if (relevantEvidence.length === 0) {
      const severity = claim.centrality === "high" ? "critical" : claim.centrality === "medium" ? "high" : "medium";
      gaps.push({
        claimId: claim.id,
        claimText: claim.text,
        contextId: claim.contextId || "",
        gapType: "no_evidence",
        severity,
        suggestedQueries: [
          contextQueryBase || claim.text,
          `${contextQueryBase || compactClaim} documented evidence`,
          `${compactContext || compactClaim} official decision record`,
        ],
        attemptedQueries,
      });
      continue;
    }

    // Gap 2: No counter-evidence (bias risk) for non-low centrality claims
    const hasCounterEvidence = relevantEvidence.some((e) => e.claimDirection === "contradicts");
    if (!hasCounterEvidence && claim.centrality !== "low") {
      const inverseQuery = generateInverseClaimQuery(claim.text);
      gaps.push({
        claimId: claim.id,
        claimText: claim.text,
        contextId: claim.contextId || "",
        gapType: "no_counter_evidence",
        severity: claim.centrality === "high" ? "high" : "medium",
        suggestedQueries: inverseQuery
          ? [contextQueryBase ? `${contextQueryBase} ${inverseQuery}`.trim() : inverseQuery]
          : [`${contextQueryBase || claim.text} contradictory evidence primary source`],
        attemptedQueries: [],
      });
    }

    // Gap 3: Low quality evidence only for HIGH centrality claims
    const highQualityEvidence = relevantEvidence.filter((e) => e.probativeValue === "high");
    if (highQualityEvidence.length === 0 && claim.centrality === "high") {
      gaps.push({
        claimId: claim.id,
        claimText: claim.text,
        contextId: claim.contextId || "",
        gapType: "low_quality",
        severity: "high",
        suggestedQueries: [
          `${contextQueryBase || claim.text} official source`,
          `${contextQueryBase || claim.text} primary documentation`,
          `${compactContext || compactClaim} legal analysis`,
        ],
        attemptedQueries,
      });
    }
  }

  return gaps;
}

/**
 * LLM-powered text similarity assessment (batch).
 * Returns semantic similarity scores (0-1) for each pair.
 * On failure: retries with exponential backoff, then leaves failed pair IDs
 * unset so caller defaults (?? 1, ?? 0, || 0) apply conservatively.
 */
const _similaritySleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function assessTextSimilarityBatch(
  pairs: Array<{ id: string; textA: string; textB: string }>,
  maxRetries: number = 3,
): Promise<Map<string, number>> {
  if (pairs.length === 0) return new Map();

  const modelInfo = getModelForTask("extract_evidence"); // Haiku tier â€” fast, cheap
  const chunkSize = 25;
  const resultMap = new Map<string, number>();

  for (let offset = 0; offset < pairs.length; offset += chunkSize) {
    const chunk = pairs.slice(offset, offset + chunkSize);
    let chunkSuccess = false;

    // Retry loop for this chunk
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const pairTexts = chunk
          .map((p, i) => `[${i}] A: "${p.textA.slice(0, 200)}" | B: "${p.textB.slice(0, 200)}"`)
          .join("\n");
        const renderedPrompt = await loadAndRenderSection("orchestrated", "TEXT_SIMILARITY_BATCH_USER", {
          PAIR_TEXTS: pairTexts,
        });
        if (!renderedPrompt?.content?.trim()) {
          throw new Error("Missing TEXT_SIMILARITY_BATCH_USER prompt section in orchestrated prompt profile");
        }

        const result = await generateText({
          model: modelInfo.model,
          messages: [{
            role: "user",
            content: renderedPrompt.content,
          }],
          temperature: 0,
        });

        let text = result.text.trim();
        text = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
        const scores = JSON.parse(text);

        // Schema validation
        if (Array.isArray(scores) && scores.length === chunk.length) {
          for (let i = 0; i < chunk.length; i++) {
            if (typeof scores[i] === "number") {
              const score = Math.max(0, Math.min(1, scores[i]));
              resultMap.set(chunk[i].id, score);
            } else {
              // Non-numeric element: leave this pair unset; caller default applies
              console.warn(`[assessTextSimilarityBatch] Non-numeric score at index ${i}; leaving unset`);
            }
          }
          chunkSuccess = true;
          break; // Success â€” exit retry loop for this chunk
        } else {
          // Invalid schema â€” retry if attempts remain
          console.warn(`[assessTextSimilarityBatch] Invalid schema (attempt ${attempt}/${maxRetries}): expected array[${chunk.length}], got ${typeof scores}`);
          if (attempt < maxRetries) {
            const baseDelay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms
            const jitter = Math.floor(Math.random() * 51) - 25; // Â±25ms
            await _similaritySleep(baseDelay + jitter);
            continue;
          }
        }
      } catch (err) {
        // LLM call failed â€” retry if attempts remain
        console.warn(`[assessTextSimilarityBatch] LLM error (attempt ${attempt}/${maxRetries}):`, err);
        if (attempt < maxRetries) {
          const baseDelay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms
          const jitter = Math.floor(Math.random() * 51) - 25; // Â±25ms
          await _similaritySleep(baseDelay + jitter);
          continue;
        }
      }
    }

    // All retries exhausted for this chunk â€” leave chunk pair IDs unset
    if (!chunkSuccess) {
      console.error(`[assessTextSimilarityBatch] All retries exhausted for chunk (offset ${offset}). Leaving scores unset; caller defaults will apply.`);
    }
  }

  return resultMap;
}

/**
 * Phase 4c: Apply a context ID remap to all contextId carriers in the state.
 * Updates claims and evidence items. Pure mutation, no LLM calls.
 */
function applyContextIdRemap(
  remap: Map<string, string>,
  state: {
    understanding?: { subClaims?: Array<{ contextId?: string; [k: string]: any }> } | null;
    evidenceItems: Array<{ contextId?: string; [k: string]: any }>;
  },
): { remappedClaims: number; remappedEvidence: number } {
  if (remap.size === 0) return { remappedClaims: 0, remappedEvidence: 0 };

  let remappedClaims = 0;
  let remappedEvidence = 0;

  for (const claim of state.understanding?.subClaims || []) {
    const cid = String((claim as any).contextId || "");
    if (cid && remap.has(cid)) {
      (claim as any).contextId = remap.get(cid)!;
      remappedClaims++;
    }
  }

  for (const item of state.evidenceItems || []) {
    const cid = String((item as any).contextId || "");
    if (cid && remap.has(cid)) {
      (item as any).contextId = remap.get(cid)!;
      remappedEvidence++;
    }
  }

  return { remappedClaims, remappedEvidence };
}

/**
 * Phase 4b: Build a remap from orphaned pre-refinement context IDs to their
 * best-matching post-refinement context IDs using batched LLM similarity.
 *
 * Uses assessTextSimilarityBatch with buildContextDescription (from evidence-context-utils.ts)
 * to serialize contexts into text for comparison.
 *
 * Returns empty map if no orphaned IDs, no matches above threshold, or LLM call fails.
 */
async function buildOldToNewContextRemap(
  orphanedOldContexts: AnalysisContext[],
  newContexts: AnalysisContext[],
  similarityThreshold: number = 0.65,
): Promise<Map<string, string>> {
  const remap = new Map<string, string>();
  if (orphanedOldContexts.length === 0 || newContexts.length === 0) return remap;

  // Build cross-product pairs: each orphaned old × each new context
  const pairs: Array<{ id: string; textA: string; textB: string }> = [];
  for (const oldCtx of orphanedOldContexts) {
    const descA = buildContextDescription(oldCtx);
    if (!descA) continue;
    for (const newCtx of newContexts) {
      const descB = buildContextDescription(newCtx);
      if (!descB) continue;
      pairs.push({
        id: `${oldCtx.id}__${newCtx.id}`,
        textA: descA,
        textB: descB,
      });
    }
  }

  if (pairs.length === 0) return remap;

  // One batched LLM call (assessTextSimilarityBatch handles chunking at 25, retries, graceful degradation)
  const scores = await assessTextSimilarityBatch(pairs);

  // For each old context, find the new context with the highest similarity score
  for (const oldCtx of orphanedOldContexts) {
    let bestNewId: string | null = null;
    let bestScore = 0;
    for (const newCtx of newContexts) {
      const key = `${oldCtx.id}__${newCtx.id}`;
      const score = scores.get(key);
      if (score !== undefined && score >= similarityThreshold && score > bestScore) {
        bestScore = score;
        bestNewId = newCtx.id;
      }
    }
    if (bestNewId) {
      remap.set(oldCtx.id, bestNewId);
    }
  }

  if (remap.size > 0) {
    debugLog("buildOldToNewContextRemap: LLM similarity matches found", {
      orphanedCount: orphanedOldContexts.length,
      matchedCount: remap.size,
      threshold: similarityThreshold,
      mappings: Array.from(remap.entries()).slice(0, 8),
    });
  }

  return remap;
}

/**
 * LLM-powered context similarity assessment.
 * Replaces the deterministic weighted Jaccard approach with semantic LLM assessment.
 * Returns neutral similarity when the LLM path fails.
 */
async function assessContextSimilarity(a: AnalysisContext, b: AnalysisContext): Promise<number> {
  const modelInfo = getModelForTask("extract_evidence"); // Haiku tier
  try {
    const contextA = JSON.stringify({
      name: a.name, subject: a.subject,
      assessedStatement: (a as any).assessedStatement,
      metadata: (a as any).metadata,
    });
    const contextB = JSON.stringify({
      name: b.name, subject: b.subject,
      assessedStatement: (b as any).assessedStatement,
      metadata: (b as any).metadata,
    });
    const renderedPrompt = await loadAndRenderSection("orchestrated", "CONTEXT_SIMILARITY_USER", {
      CONTEXT_A: contextA,
      CONTEXT_B: contextB,
    });
    if (!renderedPrompt?.content?.trim()) {
      throw new Error("Missing CONTEXT_SIMILARITY_USER prompt section in orchestrated prompt profile");
    }

    const result = await generateText({
      model: modelInfo.model,
      messages: [{
        role: "user",
        content: renderedPrompt.content,
      }],
      temperature: 0,
    });

    let text = result.text.trim();
    text = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
    const score = JSON.parse(text);
    if (typeof score === "number") return Math.max(0, Math.min(1, score));
  } catch {
    // LLM call failed â€” return neutral score (no hidden deterministic fallback).
  }
  return 0.5;
}

async function selectEvidenceItemsForContextRefinementPrompt(
  evidenceItems: EvidenceItem[],
  analysisInput: string,
  maxEvidenceItems: number,
): Promise<EvidenceItem[]> {
  if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) return [];
  if (evidenceItems.length <= maxEvidenceItems) return evidenceItems;

  const mustKeepIds = new Set<string>();
  const input = (analysisInput || "").trim();

  // Batch LLM similarity for all evidence items against analysis input
  const allPairs = input
    ? evidenceItems
        .filter((item) => item?.id)
        .map((item) => ({ id: item.id!, textA: input, textB: item.statement || "" }))
    : [];
  const allScores = await assessTextSimilarityBatch(allPairs);

  const bestByContext = new Map<string, { evidenceItem: EvidenceItem; score: number }>();
  for (const item of evidenceItems) {
    if (!item?.id) continue;
    if (item.category === "criticism") mustKeepIds.add(item.id);
    if (item.claimDirection === "contradicts") mustKeepIds.add(item.id);
    if (item.fromOppositeClaimSearch) mustKeepIds.add(item.id);
    if (item.evidenceScope) mustKeepIds.add(item.id);
    if (item.contextId) {
      const score = allScores.get(item.id) ?? 0;
      const existing = bestByContext.get(item.contextId);
      if (!existing || score > existing.score) {
        bestByContext.set(item.contextId, { evidenceItem: item, score });
      }
    }
  }

  const chosen: EvidenceItem[] = [];
  for (const item of evidenceItems) {
    if (item?.id && mustKeepIds.has(item.id)) chosen.push(item);
  }

  const scored = evidenceItems
    .filter((item) => item?.id && !mustKeepIds.has(item.id))
    .map((item) => {
      const score = allScores.get(item.id!) ?? 0;
      return { item, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.item.id).localeCompare(String(b.item.id));
    });

  // Ensure at least one representative evidence item per context (if any exist)
  for (const { evidenceItem } of bestByContext.values()) {
    if (chosen.length >= maxEvidenceItems) break;
    if (evidenceItem?.id && !chosen.some((c) => c.id === evidenceItem.id)) {
      chosen.push(evidenceItem);
    }
  }

  for (const s of scored) {
    if (chosen.length >= maxEvidenceItems) break;
    chosen.push(s.item);
  }
  return chosen.slice(0, maxEvidenceItems);
}

// calculateContextSimilarity removed â€” replaced by assessContextSimilarity (LLM-powered)

async function deduplicateContexts(
  contexts: AnalysisContext[],
  similarityThreshold: number = 0.85,  // Only merge at >=85% similarity to preserve valid contexts
  pipelineConfig?: PipelineConfig,
): Promise<{ contexts: AnalysisContext[]; merged: Map<string, string> }> {
  if (!Array.isArray(contexts) || contexts.length <= 1) return { contexts: contexts || [], merged: new Map() };

  const merged = new Map<string, string>();
  const kept: AnalysisContext[] = [];
  const processed = new Set<string>();

  // v2.9: LLM Context Similarity Analysis (when enabled via pipeline config)
  const useLLMContextSimilarity = isLLMEnabled("context");
  let llmSimilarityMap: Map<string, ContextSimilarityResult> | null = null;

  if (useLLMContextSimilarity && contexts.length >= 2) {
    try {
      debugLog("deduplicateContexts: LLM context similarity analysis starting", {
        contextCount: contexts.length,
      });

      // Build all context pairs for analysis
      const contextPairs: ContextPair[] = [];
      for (let i = 0; i < contexts.length; i++) {
        for (let j = i + 1; j < contexts.length; j++) {
          const a = contexts[i];
          const b = contexts[j];
          if (!a?.id || !b?.id) continue;
          contextPairs.push({
            contextA: String(a.name || a.id),
            contextB: String(b.name || b.id),
            metadataA: (a as any).metadata,
            metadataB: (b as any).metadata,
          });
        }
      }

      if (contextPairs.length > 0) {
        const textAnalysisService = getTextAnalysisService({
          pipelineConfig: pipelineConfig ?? undefined,
        });
        const results = await textAnalysisService.analyzeContextSimilarity({
          contextPairs,
          contextList: contexts.map((s) => String(s.name || s.id)),
        });

        // Build a map for quick lookup (key = "contextA|contextB")
        llmSimilarityMap = new Map();
        for (const result of results) {
          const key = `${result.contextA}|${result.contextB}`;
          llmSimilarityMap.set(key, result);
          // Also store reverse key
          const reverseKey = `${result.contextB}|${result.contextA}`;
          llmSimilarityMap.set(reverseKey, result);
        }

        debugLog("deduplicateContexts: LLM context similarity analysis complete", {
          pairsAnalyzed: results.length,
          mergeRecommendations: results.filter((r) => r.shouldMerge).length,
        });
      }
    } catch (err) {
      console.warn(
        "[Context Dedup] LLM context similarity analysis failed, using heuristics:",
        err instanceof Error ? err.message : String(err)
      );
      debugLog("deduplicateContexts: LLM context similarity analysis failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      llmSimilarityMap = null;
    }
  }

  for (let i = 0; i < contexts.length; i++) {
    const cur = contexts[i];
    if (!cur?.id) continue;
    if (processed.has(cur.id)) continue;

    const dups: AnalysisContext[] = [];
    for (let j = i + 1; j < contexts.length; j++) {
      const other = contexts[j];
      if (!other?.id) continue;
      if (processed.has(other.id)) continue;

      // Use LLM similarity if available, fall back to heuristic
      let sim: number;
      let shouldMerge: boolean;

      if (llmSimilarityMap) {
        const key = `${String(cur.name || cur.id)}|${String(other.name || other.id)}`;
        const llmResult = llmSimilarityMap.get(key);
        if (llmResult) {
          sim = llmResult.similarity;
          shouldMerge = llmResult.shouldMerge;
        } else {
          // Fall back to heuristic for pairs not in LLM results
          sim = await assessContextSimilarity(cur, other);
          shouldMerge = sim >= similarityThreshold;
        }
      } else {
        sim = await assessContextSimilarity(cur, other);
        shouldMerge = sim >= similarityThreshold;
      }

      if (shouldMerge) {
        dups.push(other);
        processed.add(other.id);
        merged.set(other.id, cur.id);
      }
    }

    const keptScope = dups.length > 0 ? mergeContextMetadata(cur, dups) : cur;
    kept.push(keptScope);
    processed.add(cur.id);
  }

  return { contexts: kept, merged };
}

async function validateAndFixContextNameAlignment(
  contexts: AnalysisContext[],
  evidenceItems: EvidenceItem[],
  similarityThreshold: number,
): Promise<AnalysisContext[]> {
  if (!Array.isArray(contexts) || contexts.length === 0) return contexts || [];
  if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) return contexts;

  // Prefer non-noisy identity keys for naming; geo/time should be secondary.
  const primaryMetaKeys = [
    "institution",
    "jurisdiction",
    "methodology",
    "boundaries",
    "standardApplied",
    "regulatoryBody",
  ];
  const secondaryMetaKeys = ["geographic", "temporal"];

  const evidenceItemsByContext = new Map<string, EvidenceItem[]>();
  for (const f of evidenceItems) {
    const pid = String((f as any)?.contextId || "").trim();
    if (!pid) continue;
    if (!evidenceItemsByContext.has(pid)) evidenceItemsByContext.set(pid, []);
    evidenceItemsByContext.get(pid)!.push(f);
  }

  // Pre-compute all name-identifier similarity pairs via LLM batch
  const coversPairsList: Array<{ contextIdx: number; idIdx: number; name: string; identifier: string }> = [];
  const contextIdentifiers: Array<{ context: AnalysisContext; identifiers: string[] }> = [];

  for (let ci = 0; ci < contexts.length; ci++) {
    const s = contexts[ci];
    const contextEvidenceItemsLocal = evidenceItemsByContext.get(String((s as any)?.id || "")) || [];
    const metaLocal: Record<string, any> = ((s as any)?.metadata as any) || {};

    const countsLocal = new Map<string, number>();
    const bumpLocal = (v: string, w: number = 1) => {
      const vv = String(v || "").trim();
      if (!vv) return;
      countsLocal.set(vv, (countsLocal.get(vv) || 0) + Math.max(1, Math.floor(w)));
    };
    for (const f of contextEvidenceItemsLocal) {
      const es: any = (f as any)?.evidenceScope;
      if (!es) continue;
      bumpLocal(es.name, 3);
      bumpLocal(es.methodology, 3);
      bumpLocal(es.boundaries, 3);
      bumpLocal(es.geographic, 1);
      bumpLocal(es.temporal, 1);
    }
    for (const k of primaryMetaKeys) {
      const v = metaLocal?.[k];
      if (typeof v === "string" && v.trim()) bumpLocal(v.trim());
    }
    for (const k of secondaryMetaKeys) {
      const v = metaLocal?.[k];
      if (typeof v === "string" && v.trim()) bumpLocal(v.trim());
    }
    const ids = Array.from(countsLocal.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([v]) => v);
    contextIdentifiers.push({ context: s, identifiers: ids });

    const name = String((s as any)?.name || "").toLowerCase();
    for (let ii = 0; ii < ids.length; ii++) {
      const id = ids[ii].toLowerCase().trim();
      if (!id || name.includes(id)) continue; // structural inclusion â€” no LLM needed
      coversPairsList.push({ contextIdx: ci, idIdx: ii, name, identifier: id });
    }
  }

  // Batch LLM similarity for name-identifier pairs that didn't match structurally
  const simPairs = coversPairsList.map((p, i) => ({
    id: `cov-${i}`,
    textA: p.name,
    textB: p.identifier,
  }));
  const coversScores = await assessTextSimilarityBatch(simPairs);

  // Build covers lookup: contextIdx â†’ Set of identifier indices that "cover"
  const coversMap = new Map<number, Set<number>>();
  // First, add structural inclusions
  for (let ci = 0; ci < contexts.length; ci++) {
    const name = String((contexts[ci] as any)?.name || "").toLowerCase();
    const ids = contextIdentifiers[ci].identifiers;
    const coveredSet = new Set<number>();
    for (let ii = 0; ii < ids.length; ii++) {
      const id = ids[ii].toLowerCase().trim();
      if (id && name.includes(id)) coveredSet.add(ii);
    }
    coversMap.set(ci, coveredSet);
  }
  // Then, add LLM-scored pairs
  for (let pi = 0; pi < coversPairsList.length; pi++) {
    const { contextIdx, idIdx } = coversPairsList[pi];
    const score = coversScores.get(`cov-${pi}`) ?? 0;
    if (score >= similarityThreshold) {
      coversMap.get(contextIdx)!.add(idIdx);
    }
  }

  return contexts.map((s, ci) => {
    const { identifiers } = contextIdentifiers[ci];
    const contextEvidenceItems = evidenceItemsByContext.get(String((s as any)?.id || "")) || [];
    const meta: Record<string, any> = ((s as any)?.metadata as any) || {};

    if (identifiers.length === 0) return s;

    const coveredIds = coversMap.get(ci) ?? new Set<number>();
    const alreadyAligned = identifiers.some((_, ii) => coveredIds.has(ii));

    // Opportunistically copy consistent per-evidence evidenceScope fields into metadata
    const uniqueValue = (vals: Array<string | undefined>) => {
      const set = new Set(vals.map((v) => String(v || "").trim()).filter(Boolean));
      return set.size === 1 ? Array.from(set)[0] : "";
    };
    const method = uniqueValue(contextEvidenceItems.map((f) => (f as any)?.evidenceScope?.methodology));
    const bounds = uniqueValue(contextEvidenceItems.map((f) => (f as any)?.evidenceScope?.boundaries));
    const geo = uniqueValue(contextEvidenceItems.map((f) => (f as any)?.evidenceScope?.geographic));
    const temp = uniqueValue(contextEvidenceItems.map((f) => (f as any)?.evidenceScope?.temporal));

    const nextMeta = { ...meta };
    if (!nextMeta.methodology && method) nextMeta.methodology = method;
    if (!nextMeta.boundaries && bounds) nextMeta.boundaries = bounds;
    if (!nextMeta.geographic && geo) nextMeta.geographic = geo;
    if (!nextMeta.temporal && temp) nextMeta.temporal = temp;

    if (alreadyAligned) {
      return { ...(s as any), metadata: nextMeta };
    }

    const primary = identifiers[0];
    const extras = identifiers.slice(1, 3);
    const improved =
      extras.length > 0 ? `${primary} (${extras.join(", ")}) context` : `${primary} context`;

    debugLog("validateAndFixContextNameAlignment: fixing context name", {
      contextId: (s as any)?.id,
      oldName: (s as any)?.name,
      newName: improved,
      identifiers: identifiers.slice(0, 5),
    });

    return { ...(s as any), name: improved, metadata: nextMeta };
  });
}



async function getKnowledgeInstruction(
  allowModelKnowledge: boolean,
  text?: string,
  understanding?: ClaimUnderstanding,
  cueTerms?: string[],
  pipelineConfig?: PipelineConfig,
): Promise<string> {
  const assessor = new RecencyAssessor();
  const recencyMatters = text ? assessor.isRecencySensitive(text, understanding, cueTerms) : false;
  const temporalPromptGuard = buildTemporalPromptGuard({
    currentDate: new Date(),
    recencyMatters,
    allowModelKnowledge,
    templates: pipelineConfig,
  });
  let recencyGuidance = "";
  if (allowModelKnowledge && recencyMatters) {
    const renderedRecencyGuidance = await loadAndRenderSection("orchestrated", "KNOWLEDGE_RECENCY_GUIDANCE", {});
    if (!renderedRecencyGuidance?.content?.trim()) {
      throw new Error("Missing KNOWLEDGE_RECENCY_GUIDANCE prompt section in orchestrated prompt profile");
    }
    recencyGuidance = renderedRecencyGuidance.content;
  }
  const sectionName = allowModelKnowledge
    ? "KNOWLEDGE_INSTRUCTION_ALLOW_MODEL"
    : "KNOWLEDGE_INSTRUCTION_EVIDENCE_ONLY";
  const renderedInstruction = await loadAndRenderSection("orchestrated", sectionName, {
    TEMPORAL_PROMPT_GUARD: temporalPromptGuard,
    RECENCY_GUIDANCE: recencyGuidance,
  });
  if (!renderedInstruction?.content?.trim()) {
    throw new Error(`Missing ${sectionName} prompt section in orchestrated prompt profile`);
  }
  return renderedInstruction.content;
}

/**
 * Get provider-specific prompt hints for better cross-provider compatibility
 * Different LLMs have different strengths/weaknesses with structured output
 */
async function getProviderPromptHint(providerOverride?: string): Promise<string> {
  const provider = (providerOverride ?? DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic").toLowerCase();
  let sectionName = "";

  if (provider === "openai" || provider === "gpt") {
    sectionName = "PROVIDER_HINT_OPENAI";
  } else if (provider === "anthropic" || provider === "claude") {
    sectionName = "PROVIDER_HINT_ANTHROPIC";
  } else if (provider === "google" || provider === "gemini") {
    sectionName = "PROVIDER_HINT_GOOGLE";
  } else if (provider === "mistral") {
    sectionName = "PROVIDER_HINT_MISTRAL";
  }
  if (!sectionName) return "";

  const rendered = await loadAndRenderSection("orchestrated", sectionName, {});
  if (!rendered?.content?.trim()) {
    throw new Error(`Missing ${sectionName} prompt section in orchestrated prompt profile`);
  }
  return rendered.content;
}

function isAnthropicProvider(providerOverride?: string): boolean {
  const provider = (providerOverride ?? DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic").toLowerCase();
  return provider === "anthropic" || provider === "claude";
}

type LlmProviderIssue = {
  kind: "quota_or_credits" | "invalid_api_key" | "rate_limited" | "service_unavailable";
  message: string;
  hint: string;
};

function classifyLlmProviderIssue(errorText: string): LlmProviderIssue | null {
  const msg = String(errorText || "").toLowerCase();

  if (
    msg.includes("credit balance is too low") ||
    msg.includes("insufficient_quota") ||
    (msg.includes("quota") && (msg.includes("exceeded") || msg.includes("exhausted")))
  ) {
    return {
      kind: "quota_or_credits",
      message: "LLM provider credits/quota exhausted. Verdict generation could not complete.",
      hint: "Add provider credits or raise quota, then rerun analysis.",
    };
  }

  if (
    msg.includes("invalid_api_key") ||
    (msg.includes("api key") && (msg.includes("invalid") || msg.includes("missing"))) ||
    msg.includes("unauthorized") ||
    msg.includes(" 401")
  ) {
    return {
      kind: "invalid_api_key",
      message: "LLM provider authentication failed (invalid/missing API key).",
      hint: "Fix the provider API key in environment/UCM settings, then rerun analysis.",
    };
  }

  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes(" 429")
  ) {
    return {
      kind: "rate_limited",
      message: "LLM provider rate limit hit during analysis.",
      hint: "Retry after cooldown or reduce concurrency/request volume.",
    };
  }

  if (
    msg.includes("service unavailable") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("overloaded") ||
    msg.includes(" 503")
  ) {
    return {
      kind: "service_unavailable",
      message: "LLM provider service was temporarily unavailable.",
      hint: "Retry once provider service recovers.",
    };
  }

  return null;
}

/**
 * Safely extract structured output from AI SDK generateText result
 * Handles different SDK versions and result structures
 * Prevents "Cannot read properties of undefined (reading 'value')" errors
 */
function extractStructuredOutput(result: any): any {
  // Guard against null/undefined result
  if (!result) {
    console.log("[Analyzer] extractStructuredOutput: result is null/undefined");
    return null;
  }

  console.log("[Analyzer] extractStructuredOutput: Checking result with keys:", Object.keys(result));

  const safeGet = (getter: () => any) => {
    try {
      return getter();
    } catch {
      return undefined;
    }
  };

  // Try different possible locations for the output
  // Priority: result.output > result._output > result.experimental_output?.value > result.experimental_output > result.object
  // Note: AI SDK 6.x uses _output for structured output
  const output = safeGet(() => result.output);
  console.log("[Analyzer] extractStructuredOutput: result.output =", output !== undefined ? "exists" : "undefined");
  if (output !== undefined && output !== null) {
    const outputValue = safeGet(() => output?.value);
    if (outputValue !== undefined) {
      console.log("[Analyzer] extractStructuredOutput: Found in output.value");
      return outputValue;
    }
    console.log("[Analyzer] extractStructuredOutput: Found in output directly");
    return output;
  }

  // AI SDK 6.x stores structured output in _output
  const _output = safeGet(() => result._output);
  console.log("[Analyzer] extractStructuredOutput: result._output =", _output !== undefined ? "exists" : "undefined");
  if (_output !== undefined && _output !== null) {
    console.log("[Analyzer] extractStructuredOutput: Found structured output in result._output");
    return _output;
  }

  // Handle experimental_output safely (avoid "reading 'value' of undefined")
  const experimental = safeGet(() => result.experimental_output);
  if (experimental !== undefined && experimental !== null) {
    const experimentalValue = safeGet(() => experimental?.value);
    if (experimentalValue !== undefined) {
      return experimentalValue;
    }
    if (typeof experimental === "object" && !Array.isArray(experimental)) {
      return experimental;
    }
  }

  // Some SDK versions might put it directly in result.object
  const objectOutput = safeGet(() => result.object);
  if (objectOutput !== undefined && objectOutput !== null) {
    return objectOutput;
  }

  // Last resort: return the result itself if it looks like structured data
  if (typeof result === "object" && !Array.isArray(result) && result !== null) {
    // Check if it has properties that suggest it's the output object
    const keys = Object.keys(result);
    if (keys.length > 0 && !keys.includes("text") && !keys.includes("usage")) {
      return result;
    }
  }

  return null;
}

// ============================================================================
// QUALITY GATES (POC1 Specification)
// ============================================================================

/**
 * Gate 1: Claim Validation Result
 * Determines if a claim is factual (verifiable) vs opinion/prediction
 */
interface ClaimValidationResult {
  claimId: string;
  isFactual: boolean;
  opinionScore: number;        // 0-1 (higher = more opinion-like)
  specificityScore: number;    // 0-1 (higher = more specific/concrete)
  futureOriented: boolean;
  claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS";
  passed: boolean;
  failureReason?: string;
  validatedAt: Date;
}

/**
 * Gate 4: Verdict Validation Result
 * Determines if verdict has sufficient evidence confidence to publish
 */
interface VerdictValidationResult {
  verdictId: string;
  evidenceCount: number;
  averageSourceQuality: number;     // 0-1
  evidenceAgreement: number;        // 0-1 (% supporting vs contradicting)
  uncertaintyFactors: number;       // Count of hedging statements
  confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  publishable: boolean;
  failureReasons?: string[];
  validatedAt: Date;
}
// NOTE: Gate 1/4 implementations live in `apps/web/src/lib/analyzer/quality-gates.ts`.
// This file imports `applyGate1ToClaims` and `applyGate4ToVerdicts` so there is a single
// source of truth (reduces logic drift between the monolith and the modular analyzer).

// ============================================================================
// 7-POINT TRUTH SCALE (Symmetric, neutral)
// ============================================================================

/**
 * SYMMETRIC 7-LEVEL SCALE (centered on 50%):
 *
 * | Range    | Verdict       | Score |
 * |----------|---------------|-------|
 * | 86-100%  | True          | +3    |
 * | 72-85%   | Mostly True   | +2    |
 * | 58-71%   | Leaning True  | +1    |
 * | 43-57%   | Unverified    |  0    |
 * | 29-42%   | Leaning False | -1    |
 * | 15-28%   | Mostly False  | -2    |
 * | 0-14%    | False         | -3    |
 */

type ClaimVerdict7Point =
  | "TRUE" // 86-100%, Score +3
  | "MOSTLY-TRUE" // 72-85%,  Score +2
  | "LEANING-TRUE" // 58-71%,  Score +1
  | "MIXED" // 43-57%,  Score  0, high confidence (evidence on both sides)
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence (insufficient evidence)
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE" // 15-28%,  Score -2
  | "FALSE"; // 0-14%,   Score -3

type VerdictSummary7Point =
  | "YES" // 86-100%, Score +3
  | "MOSTLY-YES" // 72-85%,  Score +2
  | "LEANING-YES" // 58-71%,  Score +1
  | "MIXED" // 43-57%,  Score  0, high confidence
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence
  | "LEANING-NO" // 29-42%,  Score -1
  | "MOSTLY-NO" // 15-28%,  Score -2
  | "NO"; // 0-14%,   Score -3

type ArticleVerdict7Point =
  | "TRUE" // 86-100%, Score +3
  | "MOSTLY-TRUE" // 72-85%,  Score +2
  | "LEANING-TRUE" // 58-71%,  Score +1
  | "MIXED" // 43-57%,  Score  0, high confidence (evidence on both sides)
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence (insufficient evidence)
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE" // 15-28%,  Score -2
  | "FALSE"; // 0-14%,   Score -3

// Confidence threshold to distinguish MIXED from UNVERIFIED (default; overridden by CalcConfig at runtime)
let MIXED_CONFIDENCE_THRESHOLD = DEFAULT_CALC_CONFIG.mixedConfidenceThreshold;

// VERDICT_BANDS imported from truth-scale.ts â€” system constant, not configurable via UCM.

/**
 * Context similarity weights derived from CalcConfig.contextSimilarity.
 * Initialized with defaults; overwritten when calcConfig is loaded.
 */
let CONTEXT_SIMILARITY_CONFIG = {
  nameWeight: DEFAULT_CALC_CONFIG.contextSimilarity?.nameWeight ?? 0.35,
  primaryMetadataWeight: DEFAULT_CALC_CONFIG.contextSimilarity?.primaryMetadataWeight ?? 0.3,
  assessedStatementWeight: DEFAULT_CALC_CONFIG.contextSimilarity?.assessedStatementWeight ?? 0.2,
  subjectWeight: DEFAULT_CALC_CONFIG.contextSimilarity?.subjectWeight ?? 0.1,
  secondaryMetadataWeight: DEFAULT_CALC_CONFIG.contextSimilarity?.secondaryMetadataWeight ?? 0.05,
  nearDuplicateAssessedThreshold: DEFAULT_CALC_CONFIG.contextSimilarity?.nearDuplicateAssessedThreshold ?? 0.85,
  nearDuplicateForceScore: DEFAULT_CALC_CONFIG.contextSimilarity?.nearDuplicateForceScore ?? 0.92,
  nearDuplicateSubjectGuardThreshold: DEFAULT_CALC_CONFIG.contextSimilarity?.nearDuplicateSubjectGuardThreshold ?? 0.5,
  nearDuplicateNameGuardThreshold: DEFAULT_CALC_CONFIG.contextSimilarity?.nearDuplicateNameGuardThreshold ?? 0.4,
  nearDuplicateMinNameSim: DEFAULT_CALC_CONFIG.contextSimilarity?.nearDuplicateMinNameSim ?? 0.25,
  nearDuplicateMinPrimarySim: DEFAULT_CALC_CONFIG.contextSimilarity?.nearDuplicateMinPrimarySim ?? 0.15,
  anchorRecoveryThreshold: DEFAULT_CALC_CONFIG.contextSimilarity?.anchorRecoveryThreshold ?? 0.6,
  fallbackEvidenceCapPercent: DEFAULT_CALC_CONFIG.contextSimilarity?.fallbackEvidenceCapPercent ?? 40,
};

/**
 * Claim clustering config derived from CalcConfig.claimClustering.
 * Initialized with defaults; overwritten when calcConfig is loaded.
 */
let CLAIM_CLUSTERING_CONFIG = {
  jaccardSimilarityThreshold: DEFAULT_CALC_CONFIG.claimClustering?.jaccardSimilarityThreshold ?? 0.6,
  duplicateWeightShare: DEFAULT_CALC_CONFIG.claimClustering?.duplicateWeightShare ?? 0.5,
};

/**
 * Fallback graduation config derived from CalcConfig.fallback.
 * Initialized with defaults; overwritten when calcConfig is loaded.
 */
let FALLBACK_CONFIG = {
  step1RelaxInstitution: DEFAULT_CALC_CONFIG.fallback?.step1RelaxInstitution ?? true,
  step2RelevanceFloor: DEFAULT_CALC_CONFIG.fallback?.step2RelevanceFloor ?? 0.4,
  step3BroadEnabled: DEFAULT_CALC_CONFIG.fallback?.step3BroadEnabled ?? true,
};

/**
 * Normalize truth percentage values (0-100)
 * CRITICAL: Handles string inputs that LLMs sometimes return (e.g., "65" instead of 65)
 */
function normalizePercentage(value: number | string | undefined | null): number {
  // Handle string inputs (LLM sometimes returns "65" instead of 65)
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace('%', '').trim());
    if (Number.isFinite(parsed)) {
      value = parsed;
    } else {
      console.warn(`[normalizePercentage] Could not parse string value: "${value}", defaulting to 50`);
      return 50;
    }
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    console.warn(`[normalizePercentage] Invalid value: ${value} (type: ${typeof value}), defaulting to 50`);
    return 50;
  }

  const normalized = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function truthFromBand(
  band: "strong" | "partial" | "uncertain" | "refuted",
  confidence: number,
): number {
  const conf = normalizePercentage(confidence) / 100;
  // Derive ranges from VERDICT_BANDS (configurable via CalcConfig)
  // Band boundaries: adjacent lower bounds define each band's upper bound
  const tr = VERDICT_BANDS.TRUE;          // default 86
  const mt = VERDICT_BANDS.MOSTLY_TRUE;   // default 72
  const lt = VERDICT_BANDS.LEANING_TRUE;  // default 58
  const mx = VERDICT_BANDS.MIXED;         // default 43
  const lf = VERDICT_BANDS.LEANING_FALSE; // default 29
  const mtUpper = tr - 1;                                    // 85
  const mxMid = Math.floor((mx + lt - 1) / 2);              // 50
  const lfMid = Math.floor((lf + mx - 1) / 2);              // 35
  const ltMid = Math.ceil((lt + mt - 1) / 2);               // 65
  const mfUpper = lf - 1;                                    // 28
  switch (band) {
    case "strong":
      // MOSTLY-TRUE lower â†’ 100: default 72 + 28*conf
      return Math.round(mt + (100 - mt) * conf);
    case "partial":
      // MIXED midpoint â†’ MOSTLY-TRUE upper: default 50 + 35*conf
      return Math.round(mxMid + (mtUpper - mxMid) * conf);
    case "uncertain":
      // LEANING-FALSE midpoint â†’ LEANING-TRUE midpoint: default 35 + 30*conf
      return Math.round(lfMid + (ltMid - lfMid) * conf);
    case "refuted":
      // 0 â†’ MOSTLY-FALSE upper (inverse): default 28*(1-conf)
      return Math.round(mfUpper * (1 - conf));
  }
}


/**
 * Normalize truth percentage (0-100)
 * v2.6.30: Consolidated duplicate functions for input neutrality
 */
function calculateTruthPercentage(
  answerPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(answerPercentage);
}


/**
 * Normalize trackRecordScore to 0-1 range (PR-C: fix for Blocker C)
 *
 * Handles both 0-1 and 0-100 scales defensively.
 * CRITICAL FIX: Grounded search was setting scores as 50/60 (0-100 scale)
 * but analyzer expects 0-1 scale, causing invalid math (5000% truth values).
 *
 * @param score - Track record score in either 0-1 or 0-100 scale
 * @returns Normalized score in 0-1 range
 */
export function normalizeTrackRecordScore(score: number): number {
  // Handle invalid values
  if (!Number.isFinite(score)) {
    console.warn(`[Analyzer] Invalid trackRecordScore: ${score}, defaulting to 0.5`);
    return 0.5;
  }

  // If score > 1, assume it's on 0-100 scale and convert
  if (score > 1) {
    console.warn(
      `[Analyzer] trackRecordScore > 1 detected (${score}), converting from 0-100 scale to 0-1`
    );
    score = score / 100;
  }

  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, score));
}


function anchorVerdictTowardClaims(options: {
  verdictPct: number;
  claimsAvgPct: number;
  divergenceThreshold: number;
  claimsWeight: number;
}): {
  applied: boolean;
  divergence: number;
  anchoredPct: number;
} {
  const divergenceThreshold = Number.isFinite(options.divergenceThreshold)
    ? Math.max(0, options.divergenceThreshold)
    : 15;
  const claimsWeight = Number.isFinite(options.claimsWeight)
    ? Math.max(0, Math.min(1, options.claimsWeight))
    : 0.6;
  const divergence = Math.abs(options.verdictPct - options.claimsAvgPct);

  if (divergence <= divergenceThreshold) {
    return { applied: false, divergence, anchoredPct: options.verdictPct };
  }

  const anchoredPct = assertValidTruthPercentage(
    Math.round(
      (1 - claimsWeight) * options.verdictPct +
      claimsWeight * options.claimsAvgPct,
    ),
    "anchor verdict toward claims"
  );
  return { applied: true, divergence, anchoredPct };
}


/**
 * Map truth percentage to 7-point claim verdict
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish MIXED from UNVERIFIED in 43-57% range.
 */
function percentageToClaimVerdict(truthPercentage: number, confidence?: number): ClaimVerdict7Point {
  if (truthPercentage >= VERDICT_BANDS.TRUE) return "TRUE";
  if (truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE) return "MOSTLY-TRUE";
  if (truthPercentage >= VERDICT_BANDS.LEANING_TRUE) return "LEANING-TRUE";
  if (truthPercentage >= VERDICT_BANDS.MIXED) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= VERDICT_BANDS.LEANING_FALSE) return "LEANING-FALSE";
  if (truthPercentage >= VERDICT_BANDS.MOSTLY_FALSE) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Map truth percentage to verdict answer
 * v2.6.30: Updated comment for input neutrality
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish MIXED from UNVERIFIED in 43-57% range.
 */
function percentageToVerdictSummary(
  truthPercentage: number,
  confidence?: number,
): VerdictSummary7Point {
  if (truthPercentage >= VERDICT_BANDS.TRUE) return "YES";
  if (truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE) return "MOSTLY-YES";
  if (truthPercentage >= VERDICT_BANDS.LEANING_TRUE) return "LEANING-YES";
  if (truthPercentage >= VERDICT_BANDS.MIXED) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= VERDICT_BANDS.LEANING_FALSE) return "LEANING-NO";
  if (truthPercentage >= VERDICT_BANDS.MOSTLY_FALSE) return "MOSTLY-NO";
  return "NO";
}

/**
 * Map truth percentage to article verdict
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish MIXED from UNVERIFIED in 43-57% range.
 */
function percentageToArticleVerdict(
  truthPercentage: number,
  confidence?: number,
): ArticleVerdict7Point {
  if (truthPercentage >= VERDICT_BANDS.TRUE) return "TRUE";
  if (truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE) return "MOSTLY-TRUE";
  if (truthPercentage >= VERDICT_BANDS.LEANING_TRUE) return "LEANING-TRUE";
  if (truthPercentage >= VERDICT_BANDS.MIXED) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= VERDICT_BANDS.LEANING_FALSE) return "LEANING-FALSE";
  if (truthPercentage >= VERDICT_BANDS.MOSTLY_FALSE) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Normalize article truth percentage (0-100)
 */
function calculateArticleTruthPercentage(
  verdictPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(verdictPercentage);
}

// ============================================================================
// REPORT ENRICHMENT (v2.9.1)
// ============================================================================

/**
 * Enrich analysis contexts with their verdicts, evidence, and claim verdicts for report output.
 * Joins flat arrays by contextId into self-contained context objects.
 */
function enrichContextsForReport(
  contexts: AnalysisContext[],
  verdictSummary: VerdictSummary | null,
  evidenceItems: EvidenceItem[],
  claimVerdicts: ClaimVerdict[],
): Array<AnalysisContext & {
  verdict?: {
    rating: ClaimVerdict7Point;
    truthPercentage: number;
    confidence: number;
    shortAnswer?: string;
    keyFactors?: KeyFactor[];
  };
  evidenceItems?: EvidenceItem[];
  claimVerdicts?: ClaimVerdict[];
}> {
  const result = contexts.map(ctx => {
    const ctxAnswer = verdictSummary?.analysisContextAnswers?.find(
      (a: any) => a.contextId === ctx.id,
    );
    const ctxEvidence = evidenceItems.filter(e => e.contextId === ctx.id);
    const ctxClaims = claimVerdicts.filter(cv => cv.contextId === ctx.id);

    return {
      ...ctx,
      verdict: ctxAnswer ? {
        rating: percentageToClaimVerdict(ctxAnswer.truthPercentage, ctxAnswer.confidence),
        truthPercentage: ctxAnswer.truthPercentage,
        confidence: ctxAnswer.confidence,
        shortAnswer: ctxAnswer.shortAnswer,
        keyFactors: ctxAnswer.keyFactors,
      } : undefined,
      evidenceItems: ctxEvidence.length > 0 ? ctxEvidence : undefined,
      claimVerdicts: ctxClaims.length > 0 ? ctxClaims : undefined,
    };
  });

  // Single-context fallback: VERDICTS_SCHEMA_SIMPLE doesn't produce analysisContextAnswers,
  // so the per-context verdict join above finds nothing. Synthesize from top-level verdictSummary.
  if (contexts.length === 1 && !result[0]?.verdict && verdictSummary) {
    const vs = verdictSummary as any;
    const tp = vs.answer ?? vs.truthPercentage ?? 50;
    const conf = vs.confidence ?? 50;
    result[0] = {
      ...result[0],
      verdict: {
        rating: percentageToClaimVerdict(tp, conf),
        truthPercentage: tp,
        confidence: conf,
        shortAnswer: vs.shortAnswer,
        keyFactors: vs.keyFactors,
      },
      // If claim verdict join was empty (claims lacked contextId before 2a fix),
      // assign all top-level claim verdicts to the sole context
      claimVerdicts: result[0].claimVerdicts?.length
        ? result[0].claimVerdicts
        : claimVerdicts.length > 0 ? claimVerdicts : undefined,
    };
  }

  return result;
}

// ============================================================================
// WEIGHTED VERDICT CALCULATION (v2.6.30)
// ============================================================================

/**
 * Calculate claim weight based on centrality and confidence.
 * Higher centrality claims with higher confidence have more influence on the overall verdict.
 *
 * Weight = centralityMultiplier Ã— (confidence / 100)
 * where centralityMultiplier: high=3.0, medium=2.0, low=1.0
 */
// NOTE: weighted aggregation helpers extracted to ./analyzer/aggregation

// NOTE: verdict correction helpers extracted to ./analyzer/verdict-corrections


/**
 * Get color for 7-level verdict display
 */
function getVerdictColor(verdict: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (verdict) {
    case "TRUE":
    case "YES":
      return { bg: "#d4edda", text: "#155724", border: "#28a745" }; // Green
    case "MOSTLY-TRUE":
    case "MOSTLY-YES":
      return { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a" }; // Light green
    case "LEANING-TRUE":
    case "LEANING-YES":
      return { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b" }; // Yellow
    case "UNVERIFIED":
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" }; // Orange
    case "LEANING-FALSE":
    case "LEANING-NO":
      return { bg: "#ffccbc", text: "#bf360c", border: "#ff5722" }; // Dark orange
    case "MOSTLY-FALSE":
    case "MOSTLY-NO":
      return { bg: "#ffcdd2", text: "#c62828", border: "#f44336" }; // Red
    case "FALSE":
    case "NO":
      return { bg: "#b71c1c", text: "#ffffff", border: "#b71c1c" }; // Dark red
    default:
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" }; // Orange default
  }
}

/**
 * Get highlight color for verdicts
 *
 * Maps 7-point verdicts to 3-color UI system:
 * - Green: TRUE, MOSTLY-TRUE, YES, MOSTLY-YES (well-supported)
 * - Yellow: LEANING-TRUE, LEANING-YES, UNVERIFIED, LEANING-FALSE, LEANING-NO (uncertain)
 * - Red: MOSTLY-FALSE, MOSTLY-NO, FALSE, NO (refuted)
 */
function getHighlightColor7Point(
  truthPercentage: number,
): "green" | "yellow" | "red" {
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= VERDICT_BANDS.MOSTLY_TRUE) return "green";
  if (normalized >= VERDICT_BANDS.MIXED) return "yellow";
  return "red";
}


// ============================================================================
// TYPES
// ============================================================================

type InputType = "claim" | "article";
// v2.6.27: Renamed from AnalysisIntent for input neutrality
type AnalysisIntent = "verification" | "exploration" | "comparison" | "none";
type ClaimRole = "attribution" | "source" | "timing" | "core" | "unknown";

interface DecisionMaker {
  name: string;
  role: string;
  affiliation: string;
}

// AnalysisContext = A bounded analytical frame requiring separate analysis
// Formerly "Proceeding" - now unified under "Context" terminology
// Note: This is different from EvidenceScope (per-evidence source-defined methodology metadata)
interface AnalysisContext {
  id: string;                // e.g., "CTX_TSE", "CTX_WTW"
  name: string;              // Human-readable name
  shortName: string;         // Abbreviation

  // Unified fields (generic across domains)
  institution?: string;      // Court, agency, organization (was: court)
  jurisdiction?: string;     // Geographic/legal jurisdiction
  methodology?: string;      // Standard/method used (e.g., "ISO 14040", "WTW")
  boundaries?: string;       // What's included/excluded
  temporal?: string;         // Time period (was: date)
  subject: string;           // What's being analyzed
  criteria?: string[];       // Evaluation criteria (was: charges)
  outcome?: string;          // Result if known
  status: "concluded" | "ongoing" | "pending" | "unknown";
  assessedStatement?: string; // v2.6.40: What is being assessed in this context

  // Extensible domain metadata (legal/scientific/regulatory fields, etc.)
  metadata?: Record<string, any>;

  // Legacy field mappings for backward compatibility
  court?: string;            // Alias for institution (legal domain)
  date?: string;             // Alias for temporal
  charges?: string[];        // Alias for criteria (legal domain)

  decisionMakers?: DecisionMaker[];
}


interface KeyFactor {
  factor: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;
  isContested: boolean;
  contestedBy: string;
  contestationReason: string;
  factualBasis: "established" | "disputed" | "opinion" | "unknown";
}

interface FactorAnalysis {
  positiveFactors: number;
  negativeFactors: number;
  neutralFactors: number;
  contestedNegatives: number;
  verdictExplanation: string;
}

// AnalysisContextAnswer: verdict for a single AnalysisContext
interface AnalysisContextAnswer {
  contextId: string;      // Context ID
  contextName: string;    // Context name
  // Answer truth percentage (0-100)
  answer: number;
  confidence: number;
  // Truth percentage for display (0-100%)
  truthPercentage: number;
  shortAnswer: string;
  keyFactors: KeyFactor[];
  factorAnalysis?: FactorAnalysis;
}

// NEW v2.4.3: Search tracking
interface SearchQuery {
  query: string;
  iteration: number;
  focus: string;
  resultsCount: number;
  timestamp: string;
  searchProvider?: string;
  /** Error message if the search provider returned a fatal error (429, quota exhaustion) */
  error?: string;
}

interface ResearchState {
  originalInput: string;
  originalText: string;
  inputType: "text" | "url";
  understanding: ClaimUnderstanding | null;
  iterations: ResearchIteration[];
  evidenceItems: EvidenceItem[];
  sources: FetchedSource[];
  contradictionSearchPerformed: boolean;
  contradictionSourcesFound: number;
  // NEW v2.4.3: Track all searches
  searchQueries: SearchQuery[];
  // NEW v2.6.6: Track LLM calls
  llmCalls: number;
  researchQueriesSearched: Set<number>;
  // NEW v2.6.18: Track if decision-maker search was performed
  decisionMakerSearchPerformed: boolean;
  // NEW v2.6.22: Track if claim-level recency search was performed
  recentClaimsSearched: boolean;
  // NEW: Track if we've already done a targeted search for a specific central claim
  // that has no evidence/counter-evidence yet.
  centralClaimsSearched: Set<string>;
  // NEW v2.6.29: Track if inverse claim search has been performed
  inverseClaimSearchPerformed: boolean;
  // NEW PR 6: Budget tracking for p95 hardening
  budget: ResearchBudget;
  budgetTracker: BudgetTracker;
  // NEW v2.9.0: Pipeline config for hot-reload support
  pipelineConfig: PipelineConfig;
  // NEW v2.10.0: Search config for hot-reload support
  searchConfig: SearchConfig;
  // NEW v3.1: Calculation config for UCM-configurable weights, bands, gates
  calcConfig: CalcConfig;
  // P0: Fallback tracking for LLM classification reliability
  fallbackTracker: FallbackTracker;
  // P0: Analysis warnings for verdict direction validation and other issues
  analysisWarnings: AnalysisWarning[];
  // P3: Track evidence filter LLM failures (degradation to heuristic)
  evidenceFilterLlmFailures: number;
  // Pipeline Phase 1: URL deduplication across iterations
  processedUrls: Set<string>;
  urlDeduplicationCount: number;
  // Pipeline Phase 1: Gap-driven research tracking
  lastIterationNovelEvidenceCount: number;
  gapResearchIterations: number;
  totalGapQueriesIssued: number;
}

interface ClaimUnderstanding {
  detectedInputType: InputType;
  analysisIntent: AnalysisIntent;
  originalInputDisplay: string;
  impliedClaim: string;

  analysisContexts: AnalysisContext[];
  requiresSeparateAnalysis: boolean;
  backgroundDetails: string; // Article background details (NOT an AnalysisContext)

  mainThesis: string;
  articleThesis: string;
  subClaims: Array<{
    id: string;
    text: string;
    type: "legal" | "procedural" | "factual" | "evaluative";
    claimRole: ClaimRole;
    dependsOn: string[];
    keyEntities: string[];
    // Three-attribute assessment for claim importance
    checkWorthiness: "high" | "medium" | "low";
    harmPotential: "high" | "medium" | "low";   // Does it impact high-stakes areas?
    centrality: "high" | "medium" | "low";      // Is it pivotal to the author's argument?
    isCentral: boolean; // Derived: true if centrality is "high"
    // v2.6.31: Thesis relevance - does this claim DIRECTLY test the main thesis?
    thesisRelevance: "direct" | "tangential" | "irrelevant";
    // v2.9.1: Confidence in thesis relevance classification (0-100)
    thesisRelevanceConfidence?: number;
    // v2.8.4: Counter-claim detection - true if claim tests OPPOSITE of thesis
    isCounterClaim: boolean;
    contextId: string;
    approximatePosition: string;
    keyFactorId: string; // empty string if not mapped to any factor
  }>;
  distinctEvents: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  legalFrameworks: string[];
  researchQueries: string[];
  riskTier: "A" | "B" | "C";
  // NEW: KeyFactors discovered during understanding phase
  keyFactors: Array<{
    id: string;
    evaluationCriteria: string;
    factor: string;
    category: "procedural" | "evidential" | "methodological" | "factual" | "evaluative";
  }>;
  // Gate 1 statistics (POC1 quality gate)
  gate1Stats?: {
    total: number;
    passed: number;
    filtered: number;
    centralKept: number;
  };
  // Pipeline Phase 1: Temporal context for recency-sensitive searches
  temporalContext?: TemporalContext;
}

/**
 * Pipeline Phase 1: Temporal context assessment from LLM understanding
 * Determines if the claim requires recent information
 */
interface TemporalContext {
  isRecencySensitive: boolean;
  granularity: "week" | "month" | "year" | "none";
  confidence: number; // 0-1
  reason: string;
}

interface ResearchIteration {
  number: number;
  focus: string;
  queries: string[];
  sourcesFound: number;
  evidenceItemsExtracted: number;
}

interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;
  trackRecordConfidence?: number | null; // v2.6.35: LLM confidence in the score
  trackRecordConsensus?: boolean | null; // v2.6.35: Whether multiple models agreed
  fullText: string;
  fetchedAt: string;
  category: string;
  fetchSuccess: boolean;
  searchQuery?: string; // Which query found this
}

interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  // NEW v2.6.30: Centrality level for weighted verdict calculation
  centrality?: "high" | "medium" | "low";
  // NEW v2.6.31: Thesis relevance - does this claim directly test the thesis?
  // "direct" = contributes to verdict, "tangential" = on-topic but excluded, "irrelevant" = off-topic noise
  thesisRelevance?: "direct" | "tangential" | "irrelevant";
  // v2.9.1: Confidence in thesis relevance classification (0-100)
  thesisRelevanceConfidence?: number;
  // NEW: Claim role and dependencies
  claimRole?: "attribution" | "source" | "timing" | "core";
  dependsOn?: string[]; // Claim IDs this depends on
  dependencyFailed?: boolean; // True if a prerequisite claim was false
  failedDependencies?: string[]; // Which dependencies failed
  // Verdict truth percentage (0-100 where 100 = completely true)
  verdict: number;
  // LLM's confidence in the verdict (internal use)
  confidence: number;
  // Truth percentage for display (0-100% where 100 = completely true)
  truthPercentage: number;
  // Evidence weighting derived from source track record scores
  evidenceWeight?: number;
  riskTier: "A" | "B" | "C";
  reasoning: string;
  supportingEvidenceIds: string[];
  keyFactorId?: string; // Maps claim to KeyFactor for aggregation
  contextId?: string;
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
  isPseudoscience?: boolean;
  escalationReason?: string;
  isContested?: boolean;
  contestedBy?: string;
  factualBasis?: "established" | "disputed" | "opinion" | "unknown";
  evidenceQuality?: {
    scientificCount: number;
    documentedCount: number;
    anecdotalCount: number;
    theoreticalCount: number;
    pseudoscientificCount: number;
    weightedQuality: number;
    strongestBasis: "scientific" | "documented" | "theoretical" | "anecdotal" | "pseudoscientific";
    diversity: number;
  };
  // v2.8: Harm potential assessment
  harmPotential?: "high" | "medium" | "low";
  // v2.9: Counter-claim detection (claim opposes thesis rather than supporting it)
  isCounterClaim?: boolean;
  // v2.9.1: 7-point rating label derived from truthPercentage + confidence
  rating?: ClaimVerdict7Point;
}

// v2.6.27: Renamed from VerdictSummary for input neutrality
interface VerdictSummary {
  displayText: string;
  // Answer truth percentage (0-100)
  answer: number;
  confidence: number;
  // Truth percentage for display (0-100%)
  truthPercentage: number;
  shortAnswer: string;
  nuancedAnswer: string;
  keyFactors: KeyFactor[];

  hasMultipleContexts?: boolean;
  analysisContextAnswers?: AnalysisContextAnswer[];
  analysisContextSummary?: string;
  calibrationNote?: string;
  hasContestedFactors?: boolean;
}

interface ArticleAnalysis {
  inputType: InputType;
  verdictSummary?: VerdictSummary;

  hasMultipleContexts: boolean;
  analysisContexts?: AnalysisContext[];

  articleThesis: string;
  logicalFallacies: Array<{
    type: string;
    description: string;
    affectedClaims: string[];
  }>;

  // CLAIMS SUMMARY (average of individual claim verdicts)
  claimsAverageTruthPercentage: number;
  claimsAverageVerdict: number;

  // ARTICLE VERDICT (LLM's independent assessment of thesis/conclusion)
  // May differ from claims average! E.g., true evidence used to support false conclusion
  articleTruthPercentage: number;
  articleVerdict: number;
  articleVerdictReason?: string;
  // v2.6.38: Signal for UI to de-emphasize overall average when multiple distinct contexts exist
  articleVerdictReliability?: "high" | "low";

  claimPattern: {
    total: number;
    supported: number;
    uncertain: number;
    refuted: number;
    centralClaimsSupported: number;
    centralClaimsTotal: number;
  };
  // Pseudoscience detection (v2.4.6+)
  isPseudoscience?: boolean;
  pseudoscienceCategories?: string[];
  keyFactors?: KeyFactor[];
  hasContestedFactors?: boolean;
}

interface TwoPanelSummary {
  articleSummary: {
    title: string;
    source: string;
    mainArgument: string;
    keyFindings: string[];
    reasoning: string;
    conclusion: string;
  };
  factharborAnalysis: {
    sourceCredibility: string;
    claimVerdicts: Array<{
      claim: string;
      verdict: number;
      truthPercentage: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: number;
    confidence: number; // v2.6.28: Added missing confidence property
    analysisId: string;
  };
}

// ============================================================================
// SOURCE RELIABILITY (v2.2 - LLM + Cache)
// ============================================================================

// ============================================================================
// SOURCE RELIABILITY (v2.9.0 - Interface-based for modularity)
// ============================================================================

// v2.9.0 Phase 3: Use SR service interface for modularity
// This allows SR to be extracted as a standalone service in the future
import type { ISRService } from "./sr-service-interface";
import { getDefaultSRService } from "./sr-service-impl";

// Legacy direct imports (deprecated - use SR service interface)
import {
  prefetchSourceReliability,
  getTrackRecordScore,
  setSourceReliabilityConfig,
  applyEvidenceWeighting as applyEvidenceWeightingSR,
  extractDomain,
  isImportantSource,
} from "./source-reliability";

// Re-export for backward compatibility
export { prefetchSourceReliability, getTrackRecordScore };

// Exported for unit testing (not part of public API)
export { assessTextSimilarityBatch as _assessTextSimilarityBatch };

// ============================================================================
// TRUTH PERCENTAGE ADJUSTMENT PIPELINE
// ============================================================================
//
// Canonical order of adjustments to truthPercentage (each applied ONCE per claim):
//
// 1. EVIDENCE WEIGHTING (applyEvidenceWeighting)
//    - Adjusts truth based on source reliability scores
//    - Formula: adjustedTruth = 50 + (originalTruth - 50) * avgEffectiveWeight
//    - Unknown sources use DEFAULT_UNKNOWN_SOURCE_SCORE (0.5) with low confidence
//
// 2. DIRECTION VALIDATION (validateVerdictDirections)
//    - Validates that verdict direction matches evidence direction
//    - If 60%+ of evidence contradicts but verdict is HIGH, flags mismatch
//    - Can auto-correct mismatched verdicts when enabled
//
// 3. GATE 4 CLASSIFICATION (applyGate4ToVerdicts)
//    - Assigns confidence tier (HIGH/MEDIUM/LOW/INSUFFICIENT)
//    - Based on: source count, quality average, evidence agreement
//    - Does NOT modify truthPercentage, only adds metadata
//
// Each adjustment records metadata for audit trail (evidenceWeight, sourceReliabilityMeta, etc.)
// ============================================================================

/**
 * Apply evidence weighting based on source reliability.
 * Uses the shared SR module implementation for consistency.
 *
 * The SR version properly handles:
 * - Unknown sources (uses DEFAULT_UNKNOWN_SOURCE_SCORE with low confidence)
 * - trackRecordConfidence and consensus metadata
 * - Consistent formula: adjustedTruth = 50 + (originalTruth - 50) * avgEffectiveWeight
 */
function applyEvidenceWeighting(
  claimVerdicts: ClaimVerdict[],
  evidenceItems: EvidenceItem[],
  sources: FetchedSource[],
): ClaimVerdict[] {
  // Delegate to shared SR module implementation
  return applyEvidenceWeightingSR(claimVerdicts, evidenceItems, sources);
}

/**
 * Count claim direction votes by unique evidence source.
 * One source contributes at most one directional vote:
 * - supports if all directional items support
 * - contradicts if all directional items contradict
 * - neutral if source has conflicting directional items or only neutral items
 */
function countBySourceDeduped(evidence: EvidenceItem[]): {
  supports: number;
  contradicts: number;
  neutral: number;
  totalSources: number;
} {
  const perSource = new Map<string, { hasSupport: boolean; hasContradict: boolean }>();

  for (const item of evidence) {
    const sourceKey = String(item.sourceId || item.sourceUrl || item.id || "").trim() || item.id;
    const direction = item.claimDirection || "neutral";
    const current = perSource.get(sourceKey) ?? { hasSupport: false, hasContradict: false };

    if (direction === "supports") current.hasSupport = true;
    if (direction === "contradicts") current.hasContradict = true;

    perSource.set(sourceKey, current);
  }

  let supports = 0;
  let contradicts = 0;
  let neutral = 0;

  for (const vote of perSource.values()) {
    if (vote.hasSupport && vote.hasContradict) neutral++;
    else if (vote.hasSupport) supports++;
    else if (vote.hasContradict) contradicts++;
    else neutral++;
  }

  return { supports, contradicts, neutral, totalSources: perSource.size };
}

/**
 * LLM-powered direction validation batch.
 * For each verdict, asks the LLM whether the truth percentage is
 * directionally consistent with the cited evidence.
 * Resolves the claimDirection scope mismatch by having the LLM
 * evaluate the sub-claim/evidence relationship directly.
 */
type DirectionValidationResult = { aligned: boolean; expectedDirection?: "high" | "low"; suggestedPct?: number; reason?: string };

interface DirectionValidationBatchResult {
  results: DirectionValidationResult[] | null;
  degraded: boolean;
}

async function batchDirectionValidationLLM(
  inputs: Array<{
    claimText: string;
    verdictPct: number;
    evidenceStatements: string[];
  }>,
): Promise<DirectionValidationBatchResult> {
  if (inputs.length === 0) return { results: [], degraded: false };

  const modelInfo = getModelForTask("verdict"); // Verdict tier for nuanced semantic direction checks

  const pairs = inputs
    .map((v, i) => {
      const evidenceList = v.evidenceStatements
        .map((s, j) => `  ${j + 1}. ${s}`)
        .join("\n");
      return `[${i}] Sub-claim: "${v.claimText.slice(0, 200)}"\nVerdict: ${v.verdictPct}%\nEvidence:\n${evidenceList}`;
    })
    .join("\n\n");

  try {
    const rendered = await loadAndRenderSection("orchestrated", "VERDICT_DIRECTION_VALIDATION_BATCH_USER", {
      VERDICT_DIRECTION_PAIRS: pairs,
    });
    if (!rendered?.content?.trim()) {
      throw new Error("Missing or empty prompt section: VERDICT_DIRECTION_VALIDATION_BATCH_USER");
    }

    const result = await generateText({
      model: modelInfo.model,
      messages: [{ role: "user", content: rendered.content }],
      temperature: 0.1,
    });

    let text = result.text.trim();
    text = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed) && parsed.length === inputs.length) {
      return {
        results: parsed.map((item: any) => ({
          aligned: item?.aligned !== false,
          expectedDirection: item?.expectedDirection === "high" || item?.expectedDirection === "low"
            ? item.expectedDirection : undefined,
          suggestedPct: typeof item?.suggestedPct === "number" && item.suggestedPct >= 0 && item.suggestedPct <= 100
            ? Math.round(item.suggestedPct) : undefined,
          reason: typeof item?.reason === "string" ? item.reason : undefined,
        })),
        degraded: false,
      };
    }
  } catch (err) {
    console.warn("[batchDirectionValidationLLM] LLM validation failed; skipping direction judgments", err);
  }

  // Degraded fallback: return null results — caller must skip judgments and keep verdicts unchanged
  return { results: null, degraded: true };
}

/**
 * P0: Validate verdict direction against evidence direction (LLM-powered).
 * Uses LLM to evaluate whether each verdict's truth percentage is
 * directionally consistent with the cited evidence, resolving the
 * claimDirection scope mismatch that affected deterministic validation.
 *
 * @param claimVerdicts - Verdicts to validate
 * @param evidenceItems - All evidence items
 * @param options - Validation options
 * @returns Object with validated verdicts and any direction mismatches found
 */
async function validateVerdictDirections(
  claimVerdicts: ClaimVerdict[],
  evidenceItems: EvidenceItem[],
  options: {
    /** Whether to auto-correct mismatched verdicts (default false) */
    autoCorrect?: boolean;
    /** Minimum linked evidence items to trigger validation (default 2) */
    minEvidenceCount?: number;
  } = {},
): Promise<{
  validatedVerdicts: ClaimVerdict[];
  mismatches: VerdictDirectionMismatch[];
  warnings: AnalysisWarning[];
  degraded: boolean;
}> {
  const {
    autoCorrect = false,
    minEvidenceCount = 2,
  } = options;

  const mismatches: VerdictDirectionMismatch[] = [];
  const warnings: AnalysisWarning[] = [];
  const validatedVerdicts = [...claimVerdicts]; // mutable copy

  // Pass 1: collect candidates for LLM validation
  type Candidate = {
    verdictIndex: number;
    verdict: ClaimVerdict;
    linkedEvidence: EvidenceItem[];
    dedupedCounts: ReturnType<typeof countBySourceDeduped>;
  };
  const candidates: Candidate[] = [];

  for (let i = 0; i < claimVerdicts.length; i++) {
    const verdict = claimVerdicts[i];
    const supportingIds = verdict.supportingEvidenceIds || [];
    const linkedEvidence = evidenceItems.filter((e) => supportingIds.includes(e.id));

    if (linkedEvidence.length < minEvidenceCount) continue;

    // Collect directional metadata (for diagnostics only — NOT used for gating)
    const dedupedCounts = countBySourceDeduped(linkedEvidence);

    candidates.push({ verdictIndex: i, verdict, linkedEvidence, dedupedCounts });
  }

  if (candidates.length === 0) {
    return { validatedVerdicts, mismatches, warnings, degraded: false };
  }

  // Batch LLM direction validation (single call for all candidates)
  const llmInputs = candidates.map((c) => ({
    claimText: c.verdict.claimText || c.verdict.claimId,
    verdictPct: c.verdict.truthPercentage,
    evidenceStatements: c.linkedEvidence.map((e) => e.statement),
  }));
  const llmBatch = await batchDirectionValidationLLM(llmInputs);

  // If LLM failed (degraded), skip all mismatch judgments — keep verdicts unchanged
  if (llmBatch.degraded || !llmBatch.results) {
    return { validatedVerdicts, mismatches, warnings, degraded: true };
  }

  // Pass 2: process LLM results
  for (let j = 0; j < candidates.length; j++) {
    const { verdictIndex, verdict, linkedEvidence, dedupedCounts } = candidates[j];
    const llmResult = llmBatch.results[j];

    if (llmResult.aligned) continue;

    // LLM flagged this verdict as misaligned
    const expectedDirection = llmResult.expectedDirection || (verdict.truthPercentage >= 50 ? "low" : "high");
    const actualDirection = verdict.truthPercentage >= 50 ? "high" : "low";

    const claimTextPreview = verdict.claimText?.substring(0, 50) || verdict.claimId;
    const evidenceIds = linkedEvidence.map((e) => e.id);

    const mismatch: VerdictDirectionMismatch = {
      claimId: verdict.claimId,
      claimText: verdict.claimText || "",
      verdictPct: verdict.truthPercentage,
      evidenceSupportCount: dedupedCounts.supports,
      evidenceContradictCount: dedupedCounts.contradicts,
      evidenceNeutralCount: dedupedCounts.neutral,
      expectedDirection,
      actualDirection,
      wasCorrect: false,
    };

    console.warn(`[VerdictValidation] LLM direction mismatch for claim ${verdict.claimId}:`, {
      verdictPct: verdict.truthPercentage,
      expectedDirection,
      reason: llmResult.reason || "no reason provided",
    });

    if (autoCorrect) {
      let correctedPct: number;
      if (llmResult.suggestedPct != null) {
        // LLM-provided correction — use directly (already validated 0-100 in parser)
        correctedPct = llmResult.suggestedPct;
      } else if (expectedDirection === "low") {
        // Fallback: capped inversion formula (moderate band, never extreme)
        correctedPct = Math.max(25, Math.min(45, 100 - verdict.truthPercentage));
      } else {
        correctedPct = Math.max(55, Math.min(75, 100 - verdict.truthPercentage));
      }
      mismatch.correctedVerdictPct = correctedPct;
      mismatches.push(mismatch);

      const correctionSource = llmResult.suggestedPct != null ? "LLM-suggested" : "capped-fallback";
      warnings.push({
        type: "verdict_direction_mismatch",
        severity: "warning",
        message:
          `Verdict for "${claimTextPreview}..." misaligned with evidence (LLM-assessed). ` +
          `Original verdict: ${verdict.truthPercentage}%. ` +
          `LLM: ${llmResult.reason || "direction inconsistent"}. ` +
          `Auto-corrected to ${correctedPct}% (${correctionSource}).`,
        details: {
          claimId: verdict.claimId,
          expectedDirection,
          actualDirection,
          actualVerdictPct: verdict.truthPercentage,
          evidenceIds: evidenceIds.slice(0, 10),
          correctedVerdictPct: correctedPct,
          correctionSource,
          llmReason: llmResult.reason,
          legacyDirectionalMetadata: {
            note: "claimDirection counts are scoped to original user claim, not sub-claims; use LLM assessment instead",
            evidenceSupportCount: dedupedCounts.supports,
            evidenceContradictCount: dedupedCounts.contradicts,
            evidenceNeutralCount: dedupedCounts.neutral,
          },
        },
      });

      validatedVerdicts[verdictIndex] = {
        ...verdict,
        truthPercentage: correctedPct,
        verdict: correctedPct,
        rating: percentageToClaimVerdict(correctedPct, verdict.confidence),
        highlightColor: getHighlightColor7Point(correctedPct),
        verdictDirectionCorrected: true,
        originalVerdictPct: verdict.truthPercentage,
      } as ClaimVerdict;
    } else {
      mismatches.push(mismatch);

      warnings.push({
        type: "verdict_direction_mismatch",
        severity: "warning",
        message:
          `Verdict for "${claimTextPreview}..." misaligned with evidence (LLM-assessed). ` +
          `Verdict: ${verdict.truthPercentage}%. ` +
          `LLM: ${llmResult.reason || "direction inconsistent"}. ` +
          "Manual review recommended.",
        details: {
          claimId: verdict.claimId,
          expectedDirection,
          actualDirection,
          actualVerdictPct: verdict.truthPercentage,
          evidenceIds: evidenceIds.slice(0, 10),
          llmReason: llmResult.reason,
          legacyDirectionalMetadata: {
            note: "claimDirection counts are scoped to original user claim, not sub-claims; use LLM assessment instead",
            evidenceSupportCount: dedupedCounts.supports,
            evidenceContradictCount: dedupedCounts.contradicts,
            evidenceNeutralCount: dedupedCounts.neutral,
          },
        },
      });
    }
  }

  if (mismatches.length > 0) {
    debugLog("validateVerdictDirections: Found mismatches (LLM-powered)", {
      count: mismatches.length,
      claimIds: mismatches.map((m) => m.claimId),
    });
  }

  return { validatedVerdicts, mismatches, warnings, degraded: false };
}

/**
 * Temporal reasoning post-processing is intentionally disabled.
 * Avoid deterministic phrase rewriting; temporal interpretation stays LLM-driven.
 */
function sanitizeTemporalErrors(reasoning: string, currentDate: Date): string {
  void currentDate;
  return reasoning;
}

// ============================================================================
// TOPIC DETECTION (for unified analysis)
// ============================================================================

/**
 * Detect if the topic involves procedural or institutional analysis
 * This determines whether Key Factors should be generated
 *
 * Key Factors are appropriate for topics involving:
 * - Multi-step processes (rollouts, audits, reviews, investigations)
 * - Institutional decisions (regulatory, organizational, or governance actions)
 * - Procedural integrity (process fairness, evidence basis, role conflicts)
 * - High-impact decisions with formal standards or rules
 */
function detectProceduralTopic(understanding: ClaimUnderstanding, originalText: string): boolean {
  // Check 1: Has distinct contexts detected
  if (understanding.analysisContexts && understanding.analysisContexts.length > 0) {
    return true;
  }

  // Check 2: Has formal frameworks identified
  if (understanding.legalFrameworks && understanding.legalFrameworks.length > 0) {
    return true;
  }

  // Check 3: Claims are predominantly procedural type
  const legalProceduralClaims = understanding.subClaims.filter(
    (c: any) => c.type === "legal" || c.type === "procedural"
  );
  if (legalProceduralClaims.length >= understanding.subClaims.length * 0.4) {
    return true;
  }

  return false;
}

// ============================================================================
// STEP 1: UNDERSTAND
// ============================================================================

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Using union types with explicit "unknown" or empty values instead of nullable/optional.
const SUBCLAIM_SCHEMA = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["legal", "procedural", "factual", "evaluative"]),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]),
  dependsOn: z.array(z.string()), // empty array if no dependencies
  keyEntities: z.array(z.string()),
  // Three-attribute assessment
  checkWorthiness: z.enum(["high", "medium", "low"]),
  harmPotential: z.enum(["high", "medium", "low"]),
  centrality: z.enum(["high", "medium", "low"]),
  isCentral: z.boolean(), // true if centrality is "high" (harmPotential affects risk tier, not centrality)
  // v2.6.31: Thesis relevance - does this claim DIRECTLY test the main thesis?
  // "direct" = directly evaluates whether the thesis is true (should contribute to verdict)
  // "tangential" = related context but doesn't test the thesis (e.g., reactions to an event)
  // "irrelevant" = off-topic noise that should not be evaluated or shown
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]),
  // v2.9.1: Confidence in thesis relevance classification (0-100)
  thesisRelevanceConfidence: z.number().int().min(0).max(100),
  // v2.8.4: Counter-claim detection - LLM explicitly indicates if claim tests OPPOSITE of thesis
  // true = this claim evaluates the opposite position (e.g., thesis "X is fair", claim tests "X violated procedures")
  // false = this claim is thesis-aligned (tests the same direction as thesis)
  isCounterClaim: z.boolean(),
  contextId: z.string(), // empty string if not applicable
  approximatePosition: z.string(), // empty string if not applicable
  keyFactorId: z.string(), // empty string if not mapped to any factor
});

// Lenient subclaim schema for providers that invent extra labels (e.g. "evidential").
// We normalize them back into the supported set so downstream code stays consistent.
const SUBCLAIM_SCHEMA_LENIENT = z.object({
  id: z.string(),
  text: z.string(),
  type: z
    .enum(["legal", "procedural", "factual", "evaluative", "evidential", "methodological"])
    .catch("factual")
    .transform((t) => (t === "evidential" || t === "methodological" ? "factual" : t)),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]).catch("unknown"),
  dependsOn: z.array(z.string()).default([]),
  keyEntities: z.array(z.string()).default([]),
  checkWorthiness: z.enum(["high", "medium", "low"]).catch("medium"),
  harmPotential: z.enum(["high", "medium", "low"]).catch("medium"),
  centrality: z.enum(["high", "medium", "low"]).catch("medium"),
  isCentral: z.boolean().catch(false),
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]).catch("direct"), // Default to direct for backward compat
  thesisRelevanceConfidence: z.number().catch(100),
  // v2.8.4: Counter-claim detection - default to false (thesis-aligned) for backward compat
  isCounterClaim: z.boolean().catch(false),
  contextId: z.string().default(""),
  approximatePosition: z.string().default(""),
  keyFactorId: z.string().default(""),
});

/**
 * Validate thesis relevance classifications and flag low-confidence cases.
 * Optionally downgrade "direct" to "tangential" when confidence is very low.
 * @exported for unit testing
 */
export function validateThesisRelevance<T extends {
  thesisRelevance?: "direct" | "tangential" | "irrelevant";
  thesisRelevanceConfidence?: number;
  text?: string;
  claimText?: string;
}>(claims: T[], pipelineConfig?: PipelineConfig): T[] {
  const enabled =
    pipelineConfig?.thesisRelevanceValidationEnabled ??
    DEFAULT_PIPELINE_CONFIG.thesisRelevanceValidationEnabled;
  if (!enabled) return claims;

  const lowThreshold =
    pipelineConfig?.thesisRelevanceLowConfidenceThreshold ??
    DEFAULT_PIPELINE_CONFIG.thesisRelevanceLowConfidenceThreshold ?? 70;
  const downgradeThreshold =
    pipelineConfig?.thesisRelevanceAutoDowngradeThreshold ??
    DEFAULT_PIPELINE_CONFIG.thesisRelevanceAutoDowngradeThreshold ?? 60;

  for (const claim of claims) {
    const confidence = Number.isFinite(claim.thesisRelevanceConfidence)
      ? (claim.thesisRelevanceConfidence as number)
      : 100;
    const label = claim.thesisRelevance || "direct";
    const preview = String(claim.text || claim.claimText || "").slice(0, 80);

    if (confidence < lowThreshold) {
      console.warn(
        `[Relevance] Low-confidence thesisRelevance: "${preview}..." classified as "${label}" (${confidence}%)`,
      );
    }

    if (confidence < downgradeThreshold && label === "direct") {
      console.warn(
        `[Relevance] Downgrading "direct" to "tangential" due to very low confidence (${confidence}%)`,
      );
      claim.thesisRelevance = "tangential";
    }
  }

  return claims;
}

async function enforceThesisRelevanceInvariants<T extends { thesisRelevance?: any; centrality?: any; isCentral?: any; text?: any }>(
  claims: T[],
  thesis?: string,
): Promise<T[]> {
  const thesisLower = (thesis || "").toLowerCase();

  // Collect tangential claims that might need upgrading to "direct"
  const tangentialPairs: Array<{ id: string; textA: string; textB: string }> = [];
  const tangentialIndices: number[] = [];

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i] as any;
    const raw = String(claim?.thesisRelevance || "direct").trim();
    const thesisRelevance =
      raw === "direct" || raw === "tangential" || raw === "irrelevant" ? raw : "direct";
    if (thesisRelevance === "tangential" && thesisLower) {
      const claimText = String(claim?.text || "");
      if (claimText) {
        tangentialPairs.push({ id: `tr_${i}`, textA: claimText, textB: thesisLower });
        tangentialIndices.push(i);
      }
    }
  }

  // Batch LLM similarity for tangential claims vs thesis
  const simScores = tangentialPairs.length > 0
    ? await assessTextSimilarityBatch(tangentialPairs)
    : new Map<string, number>();

  for (const claim of claims as any[]) {
    const raw = String(claim?.thesisRelevance || "direct").trim();
    let thesisRelevance =
      raw === "direct" || raw === "tangential" || raw === "irrelevant" ? raw : "direct";
    const isMarkedCentral = claim?.isCentral === true || claim?.centrality === "high";

    // If a claim substantially overlaps the thesis, it should be direct (not tangential).
    if (thesisRelevance === "tangential") {
      const idx = claims.indexOf(claim);
      const simIdx = tangentialIndices.indexOf(idx);
      if (simIdx >= 0) {
        const similarity = simScores.get(`tr_${idx}`) || 0;
        if (similarity >= 0.5) {
          thesisRelevance = "direct";
          debugLog("enforceThesisRelevanceInvariants: High similarity â†’ direct", {
            claimText: String(claim?.text || "").slice(0, 80),
            thesis: thesisLower.slice(0, 80),
            similarity,
          });
        }
      }
    }

    // Invariant: central claims must be direct (by definition, they test the thesis).
    claim.thesisRelevance = isMarkedCentral ? "direct" : thesisRelevance;

    // Invariant: non-direct claims must never be treated as central/weighted.
    if (claim.thesisRelevance !== "direct") {
      claim.centrality = "low";
      claim.isCentral = false;
    }
  }
  return claims;
}

function applyThesisRelevancePolicyBToSubClaims<T extends { id?: any; dependsOn?: any; thesisRelevance?: any }>(
  claims: T[],
): T[] {
  // Policy B:
  // - "irrelevant": drop entirely (never shown, never researched, never verdicted)
  // - "tangential": keep for display, but exclude from research/verdict (handled elsewhere)
  const kept = (claims as any[]).filter((c) => String(c?.thesisRelevance || "direct") !== "irrelevant");
  const keptIds = new Set(kept.map((c) => String(c?.id || "")).filter(Boolean));

  for (const c of kept) {
    const deps = Array.isArray((c as any).dependsOn) ? (c as any).dependsOn : [];
    (c as any).dependsOn = deps.filter((dep: any) => keptIds.has(String(dep)));
  }
  return kept as any;
}

function enforceMinimumDirectClaimsPerContext(
  understanding: ClaimUnderstanding,
  analysisInput: string,
): ClaimUnderstanding {
  const claims = Array.isArray(understanding.subClaims) ? understanding.subClaims : [];
  const contexts = Array.isArray(understanding.analysisContexts) ? understanding.analysisContexts : [];
  if (claims.length === 0) return understanding;

  const llmSignalsCompound =
    Boolean((understanding as any)?.requiresSeparateAnalysis) ||
    String((understanding as any)?.complexity || "").toLowerCase() === "complex";
  const isCompound = llmSignalsCompound || analysisInput.includes("\n");
  if (!isCompound) return understanding;

  const contextIds = contexts.length > 0 ? contexts.map((c) => c.id) : [""];
  const byContext = new Map<string, ClaimUnderstanding["subClaims"]>();
  for (const contextId of contextIds) byContext.set(contextId, []);

  for (const claim of claims) {
    const contextId = contextIds.length === 1 ? contextIds[0] : (claim.contextId || "");
    if (!byContext.has(contextId)) continue;
    byContext.get(contextId)!.push(claim);
  }

  for (const [contextId, contextClaims] of byContext.entries()) {
    const direct = contextClaims.filter((c) => c.thesisRelevance === "direct");
    if (direct.length >= MIN_DIRECT_CLAIMS_PER_CONTEXT) continue;

    const eligible = contextClaims.filter((c) => {
      if (c.thesisRelevance === "direct") return false;
      if (c.claimRole === "attribution" || c.claimRole === "source" || c.claimRole === "timing") return false;
      if (c.checkWorthiness === "low") return false;
      return true;
    });

    const needed = Math.max(0, MIN_DIRECT_CLAIMS_PER_CONTEXT - direct.length);
    const toPromote = eligible.slice(0, needed);
    for (const claim of toPromote) {
      claim.thesisRelevance = "direct";
    }
  }

  return understanding;
}

async function ensureUnassignedClaimsContext(
  understanding: ClaimUnderstanding,
): Promise<ClaimUnderstanding> {
  const contexts = Array.isArray((understanding as any).analysisContexts)
    ? ((understanding as any).analysisContexts as any[])
    : [];
  const claims = Array.isArray((understanding as any).subClaims)
    ? ((understanding as any).subClaims as any[])
    : [];
  if (contexts.length === 0 || claims.length === 0) return understanding;

  // Only apply this when there are already 2+ contexts.
  // (This avoids turning a single-context run into an artificial multi-context run.)
  if (contexts.length <= 1) return understanding;

  // UNASSIGNED_CONTEXT_ID is now imported from ./analyzer/analysis-contexts

  const hasUnassignedClaims = claims.some((c) => {
    const tr = String(c?.thesisRelevance || "direct");
    const pid = String(c?.contextId || "").trim();
    return tr !== "irrelevant" && !pid;
  });
  if (!hasUnassignedClaims) return understanding;

  // Deterministic backstop: instead of introducing a new "General" context (which can vary between
  // semantically equivalent inputs), assign unassigned claims to the *best matching existing context*.
  // This preserves all claims while improving input neutrality and inverse-pair symmetry.
  const candidates = contexts
    .map((ctx) => ({
      id: String(ctx?.id || "").trim(),
      signature: [
        String(ctx?.name || ""),
        String((ctx as any)?.assessedStatement || ""),
        String(ctx?.subject || ""),
        String((ctx as any)?.metadata?.institution || ""),
        String((ctx as any)?.metadata?.court || ""),
        String((ctx as any)?.metadata?.jurisdiction || ""),
        String((ctx as any)?.metadata?.boundaries || ""),
        String((ctx as any)?.metadata?.methodology || ""),
        String((ctx as any)?.metadata?.standardApplied || ""),
      ]
        .filter(Boolean)
        .join(" "),
    }))
    .filter((c) => c.id && c.id !== UNASSIGNED_CONTEXT_ID)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (candidates.length === 0) return understanding;

  // Collect all unassigned claims
  const unassigned = claims.filter((c) => {
    const tr = String(c?.thesisRelevance || "direct");
    const pid = String(c?.contextId || "").trim();
    return tr !== "irrelevant" && !pid;
  });

  if (unassigned.length > 0) {
    // Batch LLM similarity: all unassigned claims Ã— all candidate contexts
    const pairs: Array<{ id: string; textA: string; textB: string }> = [];
    for (let ci = 0; ci < unassigned.length; ci++) {
      const text = String(unassigned[ci]?.text || "").trim();
      if (!text) continue;
      for (let ki = 0; ki < candidates.length; ki++) {
        pairs.push({ id: `ctx-${ci}-${ki}`, textA: text, textB: candidates[ki].signature });
      }
    }
    const scores = await assessTextSimilarityBatch(pairs);

    for (let ci = 0; ci < unassigned.length; ci++) {
      let bestId = candidates[0].id;
      let bestScore = -1;
      for (let ki = 0; ki < candidates.length; ki++) {
        const score = scores.get(`ctx-${ci}-${ki}`) ?? 0;
        if (score > bestScore) {
          bestScore = score;
          bestId = candidates[ki].id;
        } else if (score === bestScore && candidates[ki].id.localeCompare(bestId) < 0) {
          bestId = candidates[ki].id;
        }
      }
      unassigned[ci].contextId = bestId;
    }
  }

  (understanding as any).requiresSeparateAnalysis = contexts.length > 1;
  return understanding;
}

function pruneContextsByCoverage(
  understanding: ClaimUnderstanding,
  evidenceItems: EvidenceItem[],
): ClaimUnderstanding {
  const contexts = Array.isArray((understanding as any).analysisContexts)
    ? ((understanding as any).analysisContexts as any[])
    : [];
  if (contexts.length === 0) return understanding;
  // Single-context runs often leave contextId empty on evidence/claims (because there is no
  // context choice to make). Never prune the only context in that case; doing so would lose metadata
  // and fragment the analysis.
  if (contexts.length === 1) return understanding;

  const evidenceItemsPerContext = new Map<string, number>();
  for (const item of evidenceItems || []) {
    const pid = String((item as any)?.contextId || "").trim();
    if (!pid) continue;
    evidenceItemsPerContext.set(pid, (evidenceItemsPerContext.get(pid) || 0) + 1);
  }

  const claims = Array.isArray((understanding as any).subClaims)
    ? ((understanding as any).subClaims as any[])
    : [];
  const claimsPerContext = new Map<string, number>();
  for (const c of claims) {
    const pid = String((c as any)?.contextId || "").trim();
    if (!pid) continue;
    claimsPerContext.set(pid, (claimsPerContext.get(pid) || 0) + 1);
  }

  const keep: any[] = [];
  const removed = new Set<string>();
  for (const s of contexts) {
    const id = String(s?.id || "").trim();
    if (!id) continue;
    const hasEvidenceItems = (evidenceItemsPerContext.get(id) || 0) > 0;
    const hasAnyClaims = (claimsPerContext.get(id) || 0) > 0;

    // Keep a context if it has ANY claims (direct or tangential) or ANY evidence.
    // Tangential claims are displayed (Policy B), so a context that contains only tangential
    // claims is not "empty" and must remain to preserve display context.
    if (hasEvidenceItems || hasAnyClaims) keep.push(s);
    else removed.add(id);
  }

  if (removed.size === 0) return understanding;

  // Clear orphaned claim assignments to removed contexts.
  // (These contexts should be truly empty: no evidence and no claims.)
  if (Array.isArray((understanding as any).subClaims)) {
    for (const c of (understanding as any).subClaims as any[]) {
      const pid = String(c?.contextId || "").trim();
      if (pid && removed.has(pid)) c.contextId = "";
    }
  }

  (understanding as any).analysisContexts = keep;
  (understanding as any).requiresSeparateAnalysis = keep.length > 1;
  return understanding;
}

function validateContextReferences(
  understanding: ClaimUnderstanding,
  evidenceItems: EvidenceItem[],
): void {
  const contexts = understanding.analysisContexts || [];
  const validIds = new Set(contexts.map((c: any) => String(c?.id || "")).filter(Boolean));
  if (validIds.size === 0) return;

  const invalidEvidenceItems = (evidenceItems || []).filter(
    (item) => item.contextId && !validIds.has(String(item.contextId)),
  );
  const invalidClaims = (understanding.subClaims || []).filter(
    (c: any) => c.contextId && !validIds.has(String(c.contextId)),
  );

  if (invalidEvidenceItems.length === 0 && invalidClaims.length === 0) return;

  debugLog("validateContextReferences: invalid contextId references", {
    invalidEvidenceRefs: invalidEvidenceItems.slice(0, 8).map((item) => ({
      id: item.id,
      contextId: item.contextId,
    })),
    invalidClaimRefs: invalidClaims.slice(0, 8).map((c: any) => ({
      id: c.id,
      contextId: c.contextId,
    })),
    totalInvalidEvidenceItems: invalidEvidenceItems.length,
    totalInvalidClaims: invalidClaims.length,
  });
  console.warn(
    `[Analyzer] WARN: Invalid contextId references found (evidenceItems=${invalidEvidenceItems.length}, claims=${invalidClaims.length}).`,
  );
}

// Generic AnalysisContext schema (replaces legal-specific DISTINCT_PROCEEDING_SCHEMA)
// Domain-specific fields (court, jurisdiction, charges, etc.) are now in metadata
const ANALYSIS_CONTEXT_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  subject: z.string().default(""),
  temporal: z.string().default(""),
  status: z.enum(["concluded", "ongoing", "pending", "unknown"]).catch("unknown"),
  outcome: z.string().default("unknown"),
  assessedStatement: z.string().optional(), // v2.6.39: Statement being evaluated in this context
  metadata: z.object({
    // Legal domain (backward compatibility)
    institution: z.string().optional(),
    court: z.string().optional(),
    jurisdiction: z.string().optional(),
    charges: z.array(z.string()).optional(),
    decisionMakers: z.array(z.object({
      name: z.string(),
      role: z.string(),
      affiliation: z.string().default(""),  // Fixed: OpenAI strict mode compatibility
    })).optional(),

    // Scientific domain
    methodology: z.string().optional(),
    boundaries: z.string().optional(),
    geographic: z.string().optional(),
    dataSource: z.string().optional(),

    // Regulatory domain
    regulatoryBody: z.string().optional(),
    standardApplied: z.string().optional(),
  }).default({}),
});

const ANALYSIS_CONTEXT_SCHEMA_ANTHROPIC = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  subject: z.string(),
  temporal: z.string(),
  status: z.enum(["concluded", "ongoing", "pending", "unknown"]),
  outcome: z.string(),
  assessedStatement: z.string(),
  metadata: z.object({}),
});

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Some providers are more tolerant and benefit from a more lenient schema.
const UNDERSTANDING_SCHEMA_OPENAI = z.object({
  detectedInputType: z.enum(["claim", "article"]),
  analysisIntent: z.enum(["verification", "exploration", "comparison", "none"]),
  originalInputDisplay: z.string(), // empty string if not applicable
  impliedClaim: z.string(), // empty string if not applicable

  analysisContexts: z.array(ANALYSIS_CONTEXT_SCHEMA),
  requiresSeparateAnalysis: z.boolean(),
  backgroundDetails: z.string().optional(), // Article background details (preferred)

  mainThesis: z.string(),
  articleThesis: z.string(),
  subClaims: z.array(SUBCLAIM_SCHEMA),
  distinctEvents: z.array(
    z.object({
      name: z.string(),
      date: z.string(),
      description: z.string(),
    }),
  ),
  legalFrameworks: z.array(z.string()),
  researchQueries: z.array(z.string()),
  riskTier: z.enum(["A", "B", "C"]),
  // NEW: KeyFactors discovered during understanding phase (emergent, not forced)
  // factor MUST be abstract label (2-5 words), NOT specific claims or quotes
  keyFactors: z.array(
    z.object({
      id: z.string(),
      evaluationCriteria: z.string(), // The evaluation criteria (e.g., "Was due process followed?")
      factor: z.string(), // ABSTRACT label only (2-5 words, e.g., "Due Process", "Expert Consensus")
      category: z.enum(["procedural", "evidential", "methodological", "factual", "evaluative"]),
    }),
  ),
});

const SUBCLAIM_SCHEMA_ANTHROPIC = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["legal", "procedural", "factual", "evaluative"]),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]),
  dependsOn: z.array(z.string()),
  keyEntities: z.array(z.string()),
  checkWorthiness: z.enum(["high", "medium", "low"]),
  harmPotential: z.enum(["high", "medium", "low"]),
  centrality: z.enum(["high", "medium", "low"]),
  isCentral: z.boolean(),
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]),
  thesisRelevanceConfidence: z.number(),
  isCounterClaim: z.boolean(),
  contextId: z.string(),
  approximatePosition: z.string(),
  keyFactorId: z.string(),
});

const UNDERSTANDING_SCHEMA_ANTHROPIC = z.object({
  detectedInputType: z.enum(["claim", "article"]),
  analysisIntent: z.enum(["verification", "exploration", "comparison", "none"]),
  originalInputDisplay: z.string(),
  impliedClaim: z.string(),
  analysisContexts: z.array(ANALYSIS_CONTEXT_SCHEMA_ANTHROPIC),
  requiresSeparateAnalysis: z.boolean(),
  backgroundDetails: z.string(),
  mainThesis: z.string(),
  articleThesis: z.string(),
  subClaims: z.array(SUBCLAIM_SCHEMA_ANTHROPIC),
  distinctEvents: z.array(
    z.object({
      name: z.string(),
      date: z.string(),
      description: z.string(),
    }),
  ),
  legalFrameworks: z.array(z.string()),
  researchQueries: z.array(z.string()),
  riskTier: z.enum(["A", "B", "C"]),
  keyFactors: z.array(
    z.object({
      id: z.string(),
      evaluationCriteria: z.string(),
      factor: z.string(),
      category: z.enum(["procedural", "evidential", "methodological", "factual", "evaluative"]),
    }),
  ),
});

const SUPPLEMENTAL_SUBCLAIMS_SCHEMA = z.object({
  subClaims: z.array(SUBCLAIM_SCHEMA),
});

// Lite schema for supplemental claims to reduce structured-output failures.
// We fill defaults after parsing to meet SUBCLAIM_SCHEMA requirements.
const SUPPLEMENTAL_SUBCLAIM_LITE_SCHEMA = z.object({
  text: z.string(),
  contextId: z.string().optional(),
  type: z.enum(["legal", "procedural", "factual", "evaluative"]).optional(),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]).optional(),
  dependsOn: z.array(z.string()).optional(),
  keyEntities: z.array(z.string()).optional(),
  checkWorthiness: z.enum(["high", "medium", "low"]).optional(),
  harmPotential: z.enum(["high", "medium", "low"]).optional(),
  centrality: z.enum(["high", "medium", "low"]).optional(),
  isCentral: z.boolean().optional(),
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]).optional(),
  thesisRelevanceConfidence: z.number().optional(),
  approximatePosition: z.string().optional(),
  keyFactorId: z.string().optional(),
});

const SUPPLEMENTAL_SUBCLAIMS_SCHEMA_LITE = z.object({
  subClaims: z.array(SUPPLEMENTAL_SUBCLAIM_LITE_SCHEMA),
});

// Lenient variant for providers that sometimes omit arrays/fields; defaults prevent hard failures.
const UNDERSTANDING_SCHEMA_LENIENT = z.object({
  detectedInputType: z.enum(["claim", "article"]).catch("claim"),
  // Some models invent new labels (e.g. "evaluation"); coerce unknowns to "none" then post-process.
  analysisIntent: z.enum(["verification", "exploration", "comparison", "none"]).catch("none"),
  originalInputDisplay: z.string().default(""),
  impliedClaim: z.string().default(""),

  analysisContexts: z.array(ANALYSIS_CONTEXT_SCHEMA).default([]),
  requiresSeparateAnalysis: z.boolean().default(false),
  backgroundDetails: z.string().default(""),

  mainThesis: z.string().default(""),
  articleThesis: z.string().default(""),
  subClaims: z.array(SUBCLAIM_SCHEMA_LENIENT).default([]),
  distinctEvents: z
    .array(
      z.object({
        name: z.string(),
        date: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  legalFrameworks: z.array(z.string()).default([]),
  researchQueries: z.array(z.string()).default([]),
  riskTier: z.enum(["A", "B", "C"]).catch("B"),
  keyFactors: z
    .array(
      z.object({
        id: z.string(),
        evaluationCriteria: z.string(),
        factor: z.string(),
        category: z
          .enum(["procedural", "evidential", "methodological", "factual", "evaluative"])
          .catch("evaluative"),
      }),
    )
    .default([]),
});

// Supplemental claim backfill should ensure each context has at least one substantive/core claim,
// but MUST NOT force â€œcentralâ€ marking. Centrality is determined by the LLM + guardrails.
// Raise minimums to avoid collapsing compound inputs into a single claim.
let MIN_CORE_CLAIMS_PER_PROCEEDING = DEFAULT_CALC_CONFIG.claimDecomposition?.minCoreClaimsPerContext ?? 2;
let MIN_TOTAL_CLAIMS_WITH_SINGLE_CORE = DEFAULT_CALC_CONFIG.claimDecomposition?.minTotalClaimsWithSingleCore ?? 3;
let SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS = DEFAULT_CALC_CONFIG.claimDecomposition?.supplementalRepromptMaxAttempts ?? 2;
let SHORT_SIMPLE_INPUT_MAX_CHARS = DEFAULT_CALC_CONFIG.claimDecomposition?.shortSimpleInputMaxChars ?? 60;
let MIN_DIRECT_CLAIMS_PER_CONTEXT = DEFAULT_CALC_CONFIG.claimDecomposition?.minDirectClaimsPerContext ?? 2;

function expandClaimsForVerdicts(
  understanding: ClaimUnderstanding,
  directClaims: ClaimUnderstanding["subClaims"],
): ClaimUnderstanding["subClaims"] {
  if (directClaims.length >= MIN_DIRECT_CLAIMS_PER_CONTEXT) return directClaims;

  const extraClaims = (understanding.subClaims || []).filter((c: any) => {
    if (directClaims.some((d) => d.id === c.id)) return false;
    if (c?.thesisRelevance === "irrelevant") return false;
    if (c?.claimRole === "attribution" || c?.claimRole === "source" || c?.claimRole === "timing") return false;
    if (c?.checkWorthiness === "low") return false;
    return true;
  });

  const needed = Math.max(0, MIN_DIRECT_CLAIMS_PER_CONTEXT - directClaims.length);
  return directClaims.concat(extraClaims.slice(0, needed));
}

async function understandClaim(
  input: string,
  model: any,
  pipelineConfig?: PipelineConfig,
): Promise<ClaimUnderstanding> {
  const recencyAssessor = new RecencyAssessor();
  const deterministic = pipelineConfig?.deterministic ?? DEFAULT_PIPELINE_CONFIG.deterministic;
  const keyFactorHints = pipelineConfig?.keyFactorHints ?? DEFAULT_PIPELINE_CONFIG.keyFactorHints;
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // =========================================================================
  // INPUT CONTRACT: Caller passes the user text as entered (trimmed only).
  // This function must not rely on deterministic rewording.
  // =========================================================================
  const trimmedInputRaw = input.trim();

  // Store original input for UI display (before any normalization)
  const originalInputDisplay = trimmedInputRaw;

  // Use input directly - preserve user phrasing.
  const analysisInput = trimmedInputRaw;

  // Safety: extremely long article/PDF inputs can cause provider hangs or excessive prompt sizes.
  // We keep analysis logic consistent, but cap what we send to the Step 1 LLM call.
  const understandMaxCharsRaw =
    pipelineConfig?.understandMaxChars ??
    DEFAULT_PIPELINE_CONFIG.understandMaxChars ??
    12000;
  const understandMaxChars = Number.isFinite(understandMaxCharsRaw)
    ? Math.max(2000, Math.min(50000, understandMaxCharsRaw))
    : 12000;
  const analysisInputForLLM =
    analysisInput.length > understandMaxChars ? analysisInput.slice(0, understandMaxChars) : analysisInput;

  // Detect recency sensitivity for this analysis (using input as provided)
  const recencyMatters = recencyAssessor.isRecencySensitive(
    analysisInput,
    undefined,
    pipelineConfig?.recencyCueTerms,
  );

  // v2.9: LLM Text Analysis - Classify input and decompose claims
  let inputClassification: InputClassificationResult | null = null;
  try {
    const textAnalysisService = getTextAnalysisService({
      pipelineConfig: pipelineConfig ?? undefined,
    });
    inputClassification = await textAnalysisService.classifyInput({
      inputText: analysisInput,
      pipeline: "orchestrated",
    });
    debugLog("understandClaim: inputClassification", {
      isComparative: inputClassification.isComparative,
      isCompound: inputClassification.isCompound,
      claimType: inputClassification.claimType,
      complexity: inputClassification.complexity,
      decomposedClaimsCount: inputClassification.decomposedClaims.length,
    });
  } catch (err) {
    // Non-fatal: continue without classification-based hints.
    debugLog("understandClaim: inputClassification failed; proceeding without classification hints", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Deterministic context pre-detection removed (LLM-only context intelligence).
  const preDetectedContexts: any[] = [];
  debugLog("understandClaim: deterministic preDetectedContexts disabled", {
    count: 0,
    ids: [],
  });

  const renderedUnderstandSystem = await loadAndRenderSection("orchestrated", "UNDERSTAND", {
    currentDate: currentDateStr,
    currentDateReadable,
    contextHint: "",
    contextDetectionHint: "",
    keyFactorHints: "",
  });
  const renderedUnderstandUser = await loadAndRenderSection("orchestrated", "UNDERSTAND_USER", {
    ANALYSIS_INPUT_FOR_LLM: analysisInputForLLM,
  });
  if (!renderedUnderstandSystem?.content?.trim() || !renderedUnderstandUser?.content?.trim()) {
    throw new Error("Missing UNDERSTAND prompt sections in orchestrated prompt profile");
  }
  const systemPrompt = renderedUnderstandSystem.content;
  const userPrompt = renderedUnderstandUser.content;

  function extractFirstJsonObject(text: string): string | null {
    const start = text.indexOf("{");
    if (start < 0) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
    return null;
  }

  const providerName =
    (pipelineConfig?.llmProvider ?? DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic").toLowerCase();
  const isOpenAiProvider =
    providerName === "openai" || providerName.startsWith("gpt") || providerName.includes("openai");
  const isAnthropic =
    providerName === "anthropic" || providerName === "claude" || providerName.includes("anthropic");
  const understandingSchemaForProvider = isOpenAiProvider
    ? UNDERSTANDING_SCHEMA_OPENAI
    : isAnthropic
      ? UNDERSTANDING_SCHEMA_ANTHROPIC
      : UNDERSTANDING_SCHEMA_LENIENT;

  const tryStructured = async (prompt: string, attemptLabel: string) => {
    const startTime = Date.now();
    debugLog(`understandClaim: STARTING LLM CALL (${attemptLabel})`);
    debugLog("understandClaim: Input (first 100 chars)", input.substring(0, 100));
    debugLog("understandClaim: Model", String(model));

    const llmTimeoutMsRaw =
      pipelineConfig?.understandLlmTimeoutMs ??
      DEFAULT_PIPELINE_CONFIG.understandLlmTimeoutMs ??
      600000;
    const llmTimeoutMs = Number.isFinite(llmTimeoutMsRaw)
      ? Math.max(60000, Math.min(3600000, llmTimeoutMsRaw))
      : 600000;

    const result: any = await Promise.race([
      generateText({
      model,
      messages: [
        { role: "system", content: prompt, providerOptions: getPromptCachingOptions(pipelineConfig?.llmProvider) },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.3, pipelineConfig),
      output: Output.object({ schema: understandingSchemaForProvider }),
      providerOptions: getStructuredOutputProviderOptions(pipelineConfig?.llmProvider ?? "anthropic"),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`understandClaim LLM timeout after ${llmTimeoutMs}ms`)), llmTimeoutMs),
      ),
    ]);

    const elapsed = Date.now() - startTime;
    debugLog(`understandClaim: LLM CALL COMPLETED (${attemptLabel}) in ${elapsed}ms`);
    debugLog("understandClaim: Result keys", result ? Object.keys(result) : "null");

    if (result?.usage || result?.totalUsage) {
      debugLog("understandClaim: Token usage", (result as any).usage || (result as any).totalUsage);
    }
    if (elapsed < 1000) {
      debugLog(`understandClaim: WARNING - LLM responded suspiciously fast (${elapsed}ms)`);
    }

    const rawOutput = extractStructuredOutput(result);
    if (!rawOutput) {
      debugLog(`understandClaim: No structured output (${attemptLabel})`, {
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : "null",
      });
      return null;
    }
    return rawOutput as any;
  };

  const tryRecoverFromNoObjectGeneratedError = (err: any): ClaimUnderstanding | null => {
    // ai-sdk throws AI_NoObjectGeneratedError with a cause stack containing:
    // "Type validation failed: Value: {...json...}"
    const causeStack = err?.cause?.stack ?? err?.cause?.message ?? "";
    if (typeof causeStack !== "string") return null;
    const idx = causeStack.indexOf("Value:");
    if (idx < 0) return null;
    const jsonStr = extractFirstJsonObject(causeStack.slice(idx));
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      const sp = UNDERSTANDING_SCHEMA_LENIENT.safeParse(obj);
      if (!sp.success) {
        debugLog("understandClaim: recovered Value failed lenient safeParse", {
          issues: sp.error.issues?.slice(0, 10),
        });
        return null;
      }
      debugLog("understandClaim: recovered Value from schema-mismatch error", {
        detectedInputType: sp.data.detectedInputType,
        analysisContexts: sp.data.analysisContexts?.length ?? 0,
        requiresSeparateAnalysis: sp.data.requiresSeparateAnalysis,
        subClaims: sp.data.subClaims?.length ?? 0,
      });
      return sp.data as ClaimUnderstanding;
    } catch (e: any) {
      debugLog("understandClaim: failed to parse recovered Value JSON", e?.message || String(e));
      return null;
    }
  };

  const tryJsonTextFallback = async () => {
    debugLog("understandClaim: FALLBACK JSON TEXT ATTEMPT");
    const renderedSystem = await loadAndRenderSection("orchestrated", "UNDERSTAND_JSON_FALLBACK_SYSTEM", {});
    const renderedJsonOnlyAppend = await loadAndRenderSection("orchestrated", "JSON_ONLY_USER_APPEND", {});
    if (!renderedSystem?.content?.trim() || !renderedJsonOnlyAppend?.content?.trim()) {
      throw new Error(
        "Missing UNDERSTAND_JSON_FALLBACK_SYSTEM or JSON_ONLY_USER_APPEND prompt section in orchestrated prompt profile",
      );
    }
    const llmTimeoutMsRaw =
      pipelineConfig?.understandLlmTimeoutMs ??
      DEFAULT_PIPELINE_CONFIG.understandLlmTimeoutMs ??
      600000;
    const llmTimeoutMs = Number.isFinite(llmTimeoutMsRaw)
      ? Math.max(60000, Math.min(3600000, llmTimeoutMsRaw))
      : 600000;

    const result: any = await Promise.race([
      generateText({
      model,
      messages: [
        { role: "system", content: renderedSystem.content, providerOptions: getPromptCachingOptions(pipelineConfig?.llmProvider) },
        { role: "user", content: `${userPrompt}\n\n${renderedJsonOnlyAppend.content}` },
      ],
      temperature: getDeterministicTemperature(0.2, pipelineConfig),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`understandClaim JSON fallback timeout after ${llmTimeoutMs}ms`)), llmTimeoutMs),
      ),
    ]);

    const txt = (result as any)?.text as string | undefined;
    if (!txt || typeof txt !== "string") return null;
    const jsonStr = extractFirstJsonObject(txt);
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      const parsed = UNDERSTANDING_SCHEMA_LENIENT.safeParse(obj);
      if (!parsed.success) {
        debugLog("understandClaim: JSON fallback safeParse failed", {
          issues: parsed.error.issues?.slice(0, 10),
        });
        return null;
      }
      return parsed.data as ClaimUnderstanding;
    } catch (e: any) {
      debugLog("understandClaim: JSON fallback parse failed", e?.message || String(e));
      return null;
    }
  };

  const handleApiKeyOrQuota = (errMsg: string) => {
    if (errMsg.includes("credit balance is too low") || errMsg.includes("insufficient_quota")) {
      console.error("[Analyzer] âŒ ANTHROPIC API CREDITS EXHAUSTED - Please add credits at https://console.anthropic.com/settings/plans");
      throw new Error("Anthropic API credits exhausted. Please add credits or switch provider in UCM pipeline config (llmProvider).");
    }
    if (errMsg.includes("invalid_api_key") || errMsg.includes("401")) {
      console.error("[Analyzer] âŒ INVALID API KEY - Check your ANTHROPIC_API_KEY or OPENAI_API_KEY");
      throw new Error("Invalid API key. Please check your LLM provider API key.");
    }
  };

  let parsed: any = null;
  try {
    parsed = await tryStructured(systemPrompt, "structured-1");
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    debugLog("understandClaim: FAILED (structured-1)", errMsg);
    debugLog("understandClaim: FAILED (structured-1) details", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
    console.error("[Analyzer] generateText failed in understandClaim (structured-1):", errMsg);
    handleApiKeyOrQuota(errMsg);
    parsed = tryRecoverFromNoObjectGeneratedError(err);
  }

  if (!parsed) {
    // Retry once with a smaller, schema-focused prompt (providers sometimes fail on long prompts + strict schemas).
    const renderedRetryPrompt = await loadAndRenderSection("orchestrated", "UNDERSTAND_STRUCTURED_RETRY_SYSTEM", {});
    if (!renderedRetryPrompt?.content?.trim()) {
      throw new Error("Missing UNDERSTAND_STRUCTURED_RETRY_SYSTEM prompt section in orchestrated prompt profile");
    }
    try {
      parsed = await tryStructured(renderedRetryPrompt.content, "structured-2");
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      debugLog("understandClaim: FAILED (structured-2)", errMsg);
      debugLog("understandClaim: FAILED (structured-2) details", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
      console.error("[Analyzer] generateText failed in understandClaim (structured-2):", errMsg);
      handleApiKeyOrQuota(errMsg);
      parsed = tryRecoverFromNoObjectGeneratedError(err);
    }
  }

  if (!parsed) {
    parsed = await tryJsonTextFallback();
  }

  if (!parsed) throw new Error("Failed to understand claim: structured output did not match schema");

  if (typeof parsed.backgroundDetails !== "string" || parsed.backgroundDetails.trim().length === 0) {
    parsed.backgroundDetails = "";
  }

  // Ensure no orphaned context assignments: if any subClaim uses contextId, that ID must
  // exist in analysisContexts. Some providers may emit claim assignments that reference IDs
  // they didn't include in analysisContexts; we reconcile deterministically.
  const reconcileContextsWithClaimAssignments = (u: ClaimUnderstanding) => {
    const contexts = Array.isArray((u as any).analysisContexts) ? (u as any).analysisContexts : [];
    const contextIds = new Set(contexts.map((s: any) => String(s?.id || "")).filter(Boolean));
    const claims = Array.isArray((u as any).subClaims) ? (u as any).subClaims : [];

    const missing = new Set<string>();
    for (const c of claims as any[]) {
      const rp = String(c?.contextId || "").trim();
      if (rp && !contextIds.has(rp)) missing.add(rp);
    }
    // IMPORTANT: Keep requiresSeparateAnalysis consistent with the current context list.
    // Some providers may emit requiresSeparateAnalysis=false even when analysisContexts has 2+ items,
    // which can lead to downstream divergence (input neutrality failures).
    (u as any).requiresSeparateAnalysis = contexts.length > 1;
    if (missing.size === 0) return u;

    for (const id of Array.from(missing)) {
      const exemplar = (claims as any[]).find((c) => String(c?.contextId || "").trim() === id);
      const rawName = String(exemplar?.text || "").trim();
      const name = rawName ? rawName.slice(0, 120) : `${id} context`;
      // Extract short name: remove CTX_ prefix if present, or use ID as-is
      const withoutPrefix = id.replace(/^CTX_/, "").trim();
      const shortName = (withoutPrefix || id).slice(0, 12) || "CONTEXT";
      contexts.push({
        id,
        name,
        shortName,
        subject: rawName || "",
        temporal: "",
        status: "unknown",
        outcome: "unknown",
        metadata: {},
      });
      contextIds.add(id);
    }

    // If any claim still references a non-existent ID (shouldn't happen), clear it.
    for (const c of claims as any[]) {
      const rp = String(c?.contextId || "").trim();
      if (rp && !contextIds.has(rp)) c.contextId = "";
    }

    (u as any).analysisContexts = contexts;
    (u as any).requiresSeparateAnalysis = contexts.length > 1;
    return u;
  };

  parsed = reconcileContextsWithClaimAssignments(parsed);

  // =========================================================================
  // POST-PROCESSING: preserve user phrasing and only apply structural defaults.
  // =========================================================================
  const trimmedInput = input.trim();

  // UI display: prefer the original raw input; otherwise use trimmed input
  parsed.originalInputDisplay = originalInputDisplay || parsed.originalInputDisplay || trimmedInput;

  // Do not overwrite model phrasing; only provide a fallback when missing.
  const llmImpliedClaim = String(parsed.impliedClaim || "").trim();
  parsed.impliedClaim = llmImpliedClaim || analysisInput;
  if (!llmImpliedClaim) {
    console.log(`[Analyzer] impliedClaim missing; defaulted to input text`);
  }
  // Validate parsed has required fields
  if (!parsed.subClaims || !Array.isArray(parsed.subClaims)) {
    console.error(
      "[Analyzer] Invalid parsed output - missing subClaims:",
      parsed,
    );
    throw new Error("LLM output missing required fields");
  }

  // Canonicalize contexts early so:
  // - IDs are stable (P1/P2/...) instead of model-invented IDs
  // - downstream research queries don't drift because the model changed labels/dates
  // Canonicalize context IDs/ordering deterministically; keep text phrasing as returned by model.
  parsed = canonicalizeContexts(analysisInput, parsed);
  // Ensure flag consistency after canonicalization (some providers drift this field).
  parsed.requiresSeparateAnalysis = (parsed.analysisContexts?.length ?? 0) > 1;

  // v2.8.2: Force detectedInputType to "claim" for input neutrality
  // The LLM sometimes returns "question" even after normalization, causing
  // different analysis paths for semantically identical inputs.
  // CRITICAL FIX: This addresses the input neutrality regression where
  // "Was X fair?" and "X was fair" produced different results.
  if (parsed.detectedInputType !== "claim" && parsed.detectedInputType !== "article") {
    console.warn(`[INPUT NEUTRALITY FIX] Forcing detectedInputType from "${parsed.detectedInputType}" to "claim"`);
    parsed.detectedInputType = "claim";
  }

  debugLog("understandClaim: contexts after canonicalize", {
    detectedInputType: parsed.detectedInputType,
    requiresSeparateAnalysis: parsed.requiresSeparateAnalysis,
    count: parsed.analysisContexts?.length ?? 0,
    ids: (parsed.analysisContexts || []).map((p: any) => p.id),
  });

  // v2.8.x: Deterministic seed-context enforcement
  // If heuristic context pre-detection found multiple contexts but the LLM under-split,
  // enforce the seed contexts to avoid collapsing boundary-sensitive comparison claims
  // into a single generic context.
  //
  // v2.6.39: Gate seed forcing to only apply when BOTH conditions are true:
  // - deterministic mode is enabled (reproducible runs need consistent context splits)
  // - input is comparative-like (boundary-sensitive, e.g., "X before vs after Y")
  // In non-deterministic/exploratory runs, let the model + evidence-based refinement decide contexts.
  // Use LLM classification only; no deterministic linguistic fallback.
  const isComparativeInput = inputClassification?.isComparative ?? false;
  const isCompoundInput = inputClassification?.isCompound ?? false;

  const shouldForceSeedContexts =
    deterministic === true &&
    isComparativeInput &&
    Array.isArray(preDetectedContexts) &&
    preDetectedContexts.length >= 2 &&
    (parsed.analysisContexts?.length ?? 0) <= 1;

  if (shouldForceSeedContexts) {
    const seedContexts = preDetectedContexts.map((s, idx) => {
      const rawId = String(s.id || `CTX_SEED_${idx + 1}`);
      const short = rawId.replace(/^CTX_/, "").slice(0, 12) || `CTX${idx + 1}`;
      return {
        id: rawId,
        name: String(s.name || rawId),
        shortName: short,
        subject: String(parsed.impliedClaim || analysisInput || "").slice(0, 200),
        temporal: "",
        status: "unknown",
        outcome: "",
        assessedStatement: String(parsed.impliedClaim || analysisInput || ""),
        metadata: (s.metadata && typeof s.metadata === "object") ? s.metadata : {},
      };
    });
    parsed.analysisContexts = seedContexts as any;
    parsed.requiresSeparateAnalysis = true;
    // Assign unassigned claims to the first seed context so they aren't dropped in multi-context flows.
    const firstContextId = seedContexts[0]?.id || "";
    if (firstContextId && Array.isArray(parsed.subClaims)) {
      for (const c of parsed.subClaims as any[]) {
        if (!String(c?.contextId || "").trim()) c.contextId = firstContextId;
      }
    }
    debugLog("understandClaim: applied heuristic seed contexts (deterministic + comparative)", {
      seedCount: seedContexts.length,
      seedIds: seedContexts.map((s) => s.id),
    });
  } else if (Array.isArray(preDetectedContexts) && preDetectedContexts.length >= 2) {
    // Log when we skip seed forcing (helps debugging)
    debugLog("understandClaim: skipped seed forcing", {
      deterministic,
      isComparative: isComparativeInput,
      preDetectedContextsCount: preDetectedContexts.length,
      existingContextsCount: parsed.analysisContexts?.length ?? 0,
    });
  }

  // If the model under-split contexts for a claim, do a single best-effort retry
  // focused ONLY on context detection.
  if (
    deterministic &&
    parsed.detectedInputType === "claim" &&
    (parsed.analysisContexts?.length ?? 0) <= 1
  ) {
    // Reuse the same analysisInput string for the supplemental context pass.
    const supplementalInput = parsed.impliedClaim || analysisInput;
    const supplemental = await requestSupplementalContexts(supplementalInput, model, parsed, pipelineConfig);
    if (supplemental?.analysisContexts && supplemental.analysisContexts.length > 1) {
      parsed = {
        ...parsed,
        requiresSeparateAnalysis: true,
        analysisContexts: supplemental.analysisContexts,
      };
      // Reuse the same analysisInput string for context canonicalization.
      parsed = canonicalizeContexts(analysisInput, parsed);
      debugLog("understandClaim: supplemental contexts applied", {
        detectedInputType: parsed.detectedInputType,
        requiresSeparateAnalysis: parsed.requiresSeparateAnalysis,
        count: parsed.analysisContexts?.length ?? 0,
        ids: (parsed.analysisContexts || []).map((p: any) => p.id),
      });
    }
  }

  // v2.6.30: Input Neutrality: all inputs must be treated identically
  // v2.6.32: IMPORTANT drift reducer
  // Do NOT branch on model output (e.g., parsed.subClaims length). That can cause meaning-equivalent inputs
  // to take different paths depending on what the model happened to return, which amplifies drift in:
  // - context splitting
  // - claim decomposition
  // - research query generation
  //
  // Instead, decide "short/simple" purely from the input string (canonical analysisInput).
  const isShortSimpleInput =
    analysisInput.trim().length > 0 &&
    analysisInput.trim().length <= SHORT_SIMPLE_INPUT_MAX_CHARS &&
    !analysisInput.includes("\n") &&
    analysisInput.split(/\s+/).filter(Boolean).length <= 12 &&
    // Comparative statements are short but need decomposition; don't skip expansion.
    // v2.9: Use cached classification result with heuristic fallback
    !isComparativeInput &&
    // Compound statements are short but still need decomposition.
    !isCompoundInput;

  if (isShortSimpleInput && parsed.detectedInputType === "article") {
    parsed.detectedInputType = "claim";
    if (!parsed.originalInputDisplay) {
      parsed.originalInputDisplay = trimmedInput;
    }
    if (!parsed.impliedClaim) {
      parsed.impliedClaim = trimmedInput;
    }
  }

  // Deterministic normalization of importance labels.
  // This enforces role-based invariants and derives isCentral consistently.
  normalizeSubClaimsImportance(parsed.subClaims as any);

  // Post-processing: Ensure keyEntities are populated for each claim
  for (const claim of parsed.subClaims) {
    if (!claim.keyEntities || claim.keyEntities.length === 0) {
      // Structural fallback only (language-agnostic): unique normalized tokens.
      const words = String(claim.text || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((word: string) => word.length > 2);
      const uniqueTerms = [...new Set(words)].slice(0, 5);
      claim.keyEntities = uniqueTerms;
      console.log(`[Analyzer] Auto-populated keyEntities for claim "${claim.id}": ${uniqueTerms.join(", ")}`);
    }
  }

  const claimsWithPositions = parsed.subClaims.map((claim: any) => {
    const positions = findClaimPosition(input, claim.text);
    return {
      ...claim,
      startOffset: positions?.start,
      endOffset: positions?.end,
    };
  });

  // PR-E: Apply Gate 1 Lite BEFORE supplemental claims (fixes Blocker E)
  // Gate1-lite is intended as a minimal, budget-protection pre-filter.
  // It should NOT remove claims simply for being evaluative/opinion-like; those are still analyzable.
  const { filteredClaims: gate1LiteClaims, stats: gate1LiteStats } = applyGate1Lite(claimsWithPositions);
  console.log(`[Analyzer] Gate 1 Lite (pre-research): ${gate1LiteStats.passed}/${gate1LiteStats.total} claims passed minimal filter, ${gate1LiteStats.filtered} extreme cases filtered`);

  // Update parsed with filtered claims for supplemental logic
  parsed.subClaims = gate1LiteClaims as any;

  // Post-processing: Re-prompt if coverage is thin (single attempt only)
  // Skip for short, simple inputs.
  // PR-E: Now operates on Gate1-lite FILTERED claims (fixes Blocker E ordering)
  if (!isShortSimpleInput) {
    for (let attempt = 0; attempt < SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS; attempt++) {
      // Reuse analysisInput for supplemental claim generation.
      const supplementalClaims = await requestSupplementalSubClaims(
        analysisInput,
        model,
        parsed,
        pipelineConfig,
      );
      if (supplementalClaims.length === 0) break;
      parsed.subClaims.push(...supplementalClaims);
      console.log(`[Analyzer] Added ${supplementalClaims.length} supplemental claims to balance context coverage`);
      // Supplemental claims may introduce new contextId values. Ensure analysisContexts
      // covers all referenced context IDs, then re-canonicalize for stable IDs.
      parsed = reconcileContextsWithClaimAssignments(parsed);
      parsed = canonicalizeContexts(analysisInput, parsed);
      // Supplemental claims can reintroduce over-centrality and role drift; re-normalize deterministically.
      normalizeSubClaimsImportance(parsed.subClaims as any);
      break;
    }
  }

  // Deterministic text-derived subclaim fallback removed.

  // Note: Full Gate 1 validation exists (apps/web/src/lib/analyzer/quality-gates.ts) but the orchestrated
  // pipeline currently treats Gate 1 as characterization/telemetry rather than a hard filter.
  const validatedClaims = parsed.subClaims;

  // Pass thesis to detect foreign response claims that should be tangential
  const thesis = parsed.impliedClaim || parsed.articleThesis || analysisInput;
  const relevanceValidatedClaims = validateThesisRelevance(validatedClaims as any, pipelineConfig);
  const claimsWithThesisRelevanceInvariant = await enforceThesisRelevanceInvariants(relevanceValidatedClaims as any, thesis);
  const claimsPolicyB = applyThesisRelevancePolicyBToSubClaims(claimsWithThesisRelevanceInvariant as any);
  const withMinimumDirect = enforceMinimumDirectClaimsPerContext(
    { ...parsed, subClaims: claimsPolicyB } as ClaimUnderstanding,
    analysisInput,
  );
  return { ...parsed, subClaims: withMinimumDirect.subClaims, gate1Stats: gate1LiteStats };
}

async function requestSupplementalSubClaims(
  input: string,
  model: any,
  understanding: ClaimUnderstanding,
  pipelineConfig?: PipelineConfig,
): Promise<ClaimUnderstanding["subClaims"]> {
  const contexts = understanding.analysisContexts || [];
  const hasScopes = contexts.length > 0;
  const isMultiContext = contexts.length > 1;
  const singleContextId = contexts.length === 1 ? contexts[0].id : "";

  const normalizeText = (text: string) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();

  const claimsByProc = new Map<string, ClaimUnderstanding["subClaims"]>();
  const coreCounts = new Map<string, number>();
  const existingTextByProc = new Map<string, Set<string>>();
  const existingTextGlobal = new Set<string>();

  const coverageTargets = hasScopes
    ? contexts.map((s) => ({ id: s.id, name: s.name }))
    : [{ id: "", name: "General" }];

  for (const target of coverageTargets) {
    claimsByProc.set(target.id, []);
    existingTextByProc.set(target.id, new Set());
    coreCounts.set(target.id, 0);
  }

  for (const claim of understanding.subClaims) {
    const normalized = normalizeText(claim.text || "");
    if (normalized) {
      existingTextGlobal.add(normalized);
    }

    // For single-context (or no-context) runs, treat all claims as belonging to the
    // single/default context to avoid brittle ID mismatches.
    const procId = isMultiContext ? (claim.contextId || "") : (singleContextId || "");

    if (isMultiContext && !procId) continue;
    if (!claimsByProc.has(procId)) continue;

    claimsByProc.get(procId)!.push(claim);
    existingTextByProc.get(procId)!.add(normalized);
    if (claim.claimRole === "core") {
      coreCounts.set(procId, (coreCounts.get(procId) || 0) + 1);
    }
  }

  const missingProceedings = coverageTargets
    .map((target) => {
      const totalClaims = claimsByProc.get(target.id)?.length ?? 0;
      const core = coreCounts.get(target.id) || 0;
      const needsCoverage =
        core < MIN_CORE_CLAIMS_PER_PROCEEDING &&
        !(core === 1 && totalClaims >= MIN_TOTAL_CLAIMS_WITH_SINGLE_CORE);
      return { target, totalClaims, core, needsCoverage };
    })
    .filter((entry) => entry.needsCoverage);

  if (missingProceedings.length === 0) return [];

  const minNewClaimsTotal = missingProceedings.reduce((acc, entry) => {
    const neededCore = Math.max(0, MIN_CORE_CLAIMS_PER_PROCEEDING - entry.core);
    return acc + Math.max(1, neededCore);
  }, 0);

  const missingSummary = missingProceedings
    .map(({ target, totalClaims, core }) => {
      const neededCore = Math.max(0, MIN_CORE_CLAIMS_PER_PROCEEDING - core);
      const label = target.id ? `${target.id}: ${target.name}` : `${target.name}`;
      return `- ${label} (total=${totalClaims}, core=${core}, need +${neededCore} core)`;
    })
    .join("\n");

  const existingClaimsSummary = missingProceedings
    .map(({ target }) => {
      const claims = claimsByProc.get(target.id) || [];
      const label = target.id ? `${target.id}` : `${target.name}`;
      if (claims.length === 0) return `- ${label}: (no claims yet)`;
      return `- ${label}:\n${claims
        .map((claim) => `  - ${claim.id}: ${claim.text}`)
        .join("\n")}`;
    })
    .join("\n");

  debugLog("requestSupplementalSubClaims: START", {
    contextsNeedingCoverage: missingProceedings.length,
    minNewClaimsTotal,
    missingSummary,
  });

  let supplemental: any;
  try {
    const renderedSystem = await loadAndRenderSection("orchestrated", "SUPPLEMENTAL_CLAIMS", {});
    const renderedUser = await loadAndRenderSection("orchestrated", "SUPPLEMENTAL_CLAIMS_USER", {
      INPUT_TEXT: input,
      MISSING_SUMMARY: missingSummary,
      EXISTING_CLAIMS_SUMMARY: existingClaimsSummary,
      MIN_NEW_CLAIMS_TOTAL: String(minNewClaimsTotal),
      MIN_CORE_CLAIMS_PER_CONTEXT: String(MIN_CORE_CLAIMS_PER_PROCEEDING),
      HAS_SCOPES_GUIDANCE: hasScopes ? "" : "Use an empty string for contextId when no AnalysisContexts are listed.",
    });
    if (!renderedSystem?.content?.trim() || !renderedUser?.content?.trim()) {
      throw new Error("Missing SUPPLEMENTAL_CLAIMS prompt sections in orchestrated prompt profile");
    }

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: renderedSystem.content, providerOptions: getPromptCachingOptions(pipelineConfig?.llmProvider) },
        { role: "user", content: renderedUser.content },
      ],
      temperature: getDeterministicTemperature(0.2, pipelineConfig),
      output: Output.object({ schema: SUPPLEMENTAL_SUBCLAIMS_SCHEMA_LITE }),
      providerOptions: getStructuredOutputProviderOptions(pipelineConfig?.llmProvider ?? "anthropic"),
    });

    supplemental = extractStructuredOutput(result);
  } catch (err: any) {
    debugLog("requestSupplementalSubClaims: FAILED", err?.message || String(err));
    return [];
  }

  if (!supplemental?.subClaims || !Array.isArray(supplemental.subClaims)) {
    debugLog("requestSupplementalSubClaims: No supplemental claims returned");
    return [];
  }

  const allowedProcIds = new Set(missingProceedings.map((entry) => entry.target.id));
  const existingIds = new Set(understanding.subClaims.map((c) => c.id));
  const idRemap = new Map<string, string>();

  let maxId = 0;
  for (const claim of understanding.subClaims) {
    const match = /^SC(\d+)$/i.exec(claim.id || "");
    if (match) {
      const num = Number(match[1]);
      if (!Number.isNaN(num)) maxId = Math.max(maxId, num);
    }
  }

  const nextId = () => {
    let candidate = `SC${++maxId}`;
    while (existingIds.has(candidate)) {
      candidate = `SC${++maxId}`;
    }
    return candidate;
  };

  const supplementalClaims: ClaimUnderstanding["subClaims"] = [];
  for (const claim of supplemental.subClaims) {
    // For single-context/no-context runs, force all supplemental claims onto the default context.
    // This avoids dropping good claims due to model-invented IDs.
    let procId = isMultiContext ? (claim?.contextId || "") : (singleContextId || "");
    if (isMultiContext && !procId) {
      continue;
    }
    if (!allowedProcIds.has(procId)) {
      continue;
    }

    const normalized = normalizeText(claim.text || "");
    if (!normalized) continue;

    if (existingTextGlobal.has(normalized)) continue;

    const existingTexts = existingTextByProc.get(procId) || new Set();
    if (existingTexts.has(normalized)) continue;

    let newId = claim.id || "";
    if (!newId || existingIds.has(newId)) {
      newId = nextId();
      if (claim.id) idRemap.set(claim.id, newId);
    }

    existingIds.add(newId);
    existingTexts.add(normalized);

    const claimRole = claim.claimRole || "core";
    const centrality = claim.centrality || "medium";
    const isCentral =
      typeof claim.isCentral === "boolean" ? claim.isCentral : centrality === "high";

    supplementalClaims.push({
      id: newId,
      text: claim.text,
      type: claim.type || "factual",
      claimRole,
      dependsOn: Array.isArray(claim.dependsOn) ? claim.dependsOn : [],
      keyEntities: Array.isArray(claim.keyEntities) ? claim.keyEntities : [],
      checkWorthiness: claim.checkWorthiness || "high",
      harmPotential: claim.harmPotential ?? "medium",
      centrality,
      isCentral,
      thesisRelevance: claim.thesisRelevance || "direct",
      thesisRelevanceConfidence:
        typeof claim.thesisRelevanceConfidence === "number"
          ? claim.thesisRelevanceConfidence
          : 100,
      // v2.8.4: Use LLM-provided isCounterClaim or default to false
      isCounterClaim: claim.isCounterClaim ?? false,
      contextId: procId,
      approximatePosition: claim.approximatePosition || "",
      keyFactorId: claim.keyFactorId || "",
    });
  }

  if (idRemap.size > 0) {
    for (const claim of supplementalClaims) {
      if (!Array.isArray(claim.dependsOn)) continue;
      claim.dependsOn = claim.dependsOn.map((dep) => idRemap.get(dep) || dep);
    }
  }

  debugLog("requestSupplementalSubClaims: COMPLETE", {
    returned: supplemental.subClaims.length,
    accepted: supplementalClaims.length,
  });

  return supplementalClaims;
}

/**
 * Best-effort: ask the model to (re)consider whether there are multiple distinct AnalysisContexts.
 * This is intentionally generic and only applied when the initial understanding appears under-split.
 */
async function requestSupplementalContexts(
  input: string,
  model: any,
  understanding: ClaimUnderstanding,
  pipelineConfig?: PipelineConfig,
): Promise<Pick<ClaimUnderstanding, "analysisContexts" | "requiresSeparateAnalysis"> | null> {
  const currentCount = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts.length
    : 0;
  if (currentCount > 1) return null;

  const schema = z.object({
    requiresSeparateAnalysis: z.boolean(),
    analysisContexts: z.array(ANALYSIS_CONTEXT_SCHEMA),
  });

  try {
    const renderedSystem = await loadAndRenderSection("orchestrated", "SUPPLEMENTAL_CONTEXTS", {});
    const renderedUser = await loadAndRenderSection("orchestrated", "SUPPLEMENTAL_CONTEXTS_USER", {
      INPUT_TEXT: input,
      CURRENT_CONTEXT_COUNT: String(currentCount),
    });
    if (!renderedSystem?.content?.trim() || !renderedUser?.content?.trim()) {
      throw new Error("Missing SUPPLEMENTAL_CONTEXTS prompt sections in orchestrated prompt profile");
    }

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: renderedSystem.content, providerOptions: getPromptCachingOptions(pipelineConfig?.llmProvider) },
        { role: "user", content: renderedUser.content },
      ],
      temperature: getDeterministicTemperature(0.2, pipelineConfig),
      output: Output.object({ schema }),
      providerOptions: getStructuredOutputProviderOptions(pipelineConfig?.llmProvider ?? "anthropic"),
    });
    const raw = extractStructuredOutput(result) as any;
    if (!raw) return null;
    const sp = schema.safeParse(raw);
    if (!sp.success) return null;

    // Only accept if it meaningfully improves multi-context detection.
    const nextCount = sp.data.analysisContexts?.length ?? 0;
    if (nextCount <= 1 || !sp.data.requiresSeparateAnalysis) return null;

    return {
      requiresSeparateAnalysis: sp.data.requiresSeparateAnalysis,
      analysisContexts: sp.data.analysisContexts,
    };
  } catch (err: any) {
    debugLog("requestSupplementalContexts: FAILED", err?.message || String(err));
    return null;
  }
}

/**
 * Extract outcome-related claims from evidence discovered during research.
 * This addresses cases where specific outcomes (e.g., an N-year term) are mentioned
 * in research but weren't in the original input, so no claim was created initially.
 */
async function extractOutcomeClaimsFromEvidence(
  state: ResearchState,
  model: any,
): Promise<ClaimUnderstanding["subClaims"]> {
  if (!state.understanding || state.evidenceItems.length === 0) return [];

  const understanding = state.understanding;
  const contexts = understanding.analysisContexts || [];
  const existingClaims = understanding.subClaims || [];
  const existingClaimTexts = new Set(existingClaims.map((c) => c.text.toLowerCase().trim()));

  // Extract evidence text for LLM analysis
  const evidenceText = state.evidenceItems
    .slice(0, 50) // Limit to first 50 evidence items to avoid token limits
    .map((f, idx) => `E${idx + 1}: ${f.statement}`)
    .join("\n");

  if (!evidenceText || evidenceText.length < 100) return [];

  // Cheap structural guard: skip only when no digits are present at all.
  // Do not apply language-dependent unit keyword filters here.
  const hasNumericSignal = /\d/.test(evidenceText);
  if (!hasNumericSignal) {
    return [];
  }

  const OUTCOME_SCHEMA = z.object({
    outcomes: z.array(
      z.object({
        outcome: z.string(),
        contextId: z.string(),
        claimText: z.string(),
      })
    ),
  });

  try {
    const renderedSystem = await loadAndRenderSection("orchestrated", "OUTCOME_CLAIMS", {});
    const renderedUser = await loadAndRenderSection("orchestrated", "OUTCOME_CLAIMS_USER", {
      EVIDENCE_TEXT: evidenceText,
      EXISTING_CLAIMS_TEXT: existingClaims.map((c) => `- ${c.id}: ${c.text}`).join("\n"),
      CONTEXTS_TEXT: contexts.map((s) => `- ${s.id}: ${s.name}`).join("\n"),
    });
    if (!renderedSystem?.content?.trim() || !renderedUser?.content?.trim()) {
      throw new Error("Missing OUTCOME_CLAIMS prompt sections in orchestrated prompt profile");
    }

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: renderedSystem.content, providerOptions: getPromptCachingOptions(state.pipelineConfig?.llmProvider) },
        { role: "user", content: renderedUser.content },
      ],
      temperature: getDeterministicTemperature(0.2, state.pipelineConfig),
      output: Output.object({ schema: OUTCOME_SCHEMA }),
      providerOptions: getStructuredOutputProviderOptions(state.pipelineConfig?.llmProvider ?? "anthropic"),
    });

    const extracted = extractStructuredOutput(result);
    if (!extracted?.outcomes || !Array.isArray(extracted.outcomes)) return [];

    // Generate claim IDs and create claim objects
    let maxId = 0;
    for (const claim of existingClaims) {
      const match = /^SC(\d+)$/i.exec(claim.id || "");
      if (match) {
        const num = Number(match[1]);
        if (!Number.isNaN(num)) maxId = Math.max(maxId, num);
      }
    }

    const outcomeClaims: ClaimUnderstanding["subClaims"] = [];
    for (const outcome of extracted.outcomes) {
      // Skip if claim text is too similar to existing claims
      const normalized = outcome.claimText.toLowerCase().trim();
      if (existingClaimTexts.has(normalized)) continue;

      const newId = `SC${++maxId}`;
      outcomeClaims.push({
        id: newId,
        text: outcome.claimText,
        type: "evaluative",
        claimRole: "core",
        dependsOn: [],
        keyEntities: [],
        checkWorthiness: "high",
        harmPotential: "high",
        // Outcome fairness claims are often important but not always the *primary thesis*.
        // Let centrality/isCentral be determined by the main UNDERSTAND rubric + guardrails.
        centrality: "medium",
        isCentral: false,
        thesisRelevance: "direct", // Outcome claims are direct evaluations
        thesisRelevanceConfidence: 100,
        isCounterClaim: false, // Outcome claims default to thesis-aligned
        contextId: outcome.contextId || "",
        approximatePosition: "",
        keyFactorId: "",
      });
      existingClaimTexts.add(normalized);
    }

    return outcomeClaims;
  } catch (err: any) {
    debugLog("extractOutcomeClaimsFromEvidence: FAILED", err?.message || String(err));
    return [];
  }
}

/**
 * Enrich AnalysisContexts with outcomes discovered in the extracted evidence.
 * Uses LLM to extract outcomes generically (no hardcoded domain-specific patterns).
 * This addresses the issue where outcome is shown as "pending" or "unknown" in the UI
 * even though the actual outcome was found in the evidence.
 */
async function enrichContextsWithOutcomes(state: ResearchState, model: any): Promise<void> {
  if (!state.understanding?.analysisContexts?.length) return;

  const evidenceItems = state.evidenceItems || [];
  if (evidenceItems.length === 0) return;
  const deterministic = state.pipelineConfig?.deterministic ?? DEFAULT_PIPELINE_CONFIG.deterministic;
  const OUTCOME_ENRICH_SCHEMA = z.object({
    action: z.enum(["keep", "replace", "none"]),
    outcome: z.string().default(""),
  });

  for (const proc of state.understanding.analysisContexts) {
    const currentOutcome = String(proc.outcome || "").trim();

    // Get evidence items related to this context
    const relevantEvidenceItems = evidenceItems.filter(item =>
      !item.contextId || item.contextId === proc.id
    );

    if (relevantEvidenceItems.length === 0) continue;

    const evidenceText = relevantEvidenceItems.map(item => `- ${item.statement}`).join("\n").slice(0, 4000);

    try {
      const renderedSystem = await loadAndRenderSection("orchestrated", "OUTCOME_ENRICH_SYSTEM", {});
      const renderedUser = await loadAndRenderSection("orchestrated", "OUTCOME_ENRICH_USER", {
        CONTEXT_NAME: proc.name,
        CONTEXT_SUBJECT: proc.subject || "",
        CURRENT_OUTCOME: currentOutcome || "(empty)",
        EVIDENCE_TEXT: evidenceText,
      });
      if (!renderedSystem?.content?.trim() || !renderedUser?.content?.trim()) {
        throw new Error("Missing OUTCOME_ENRICH prompt sections in orchestrated prompt profile");
      }

      // LLM decides whether current outcome is specific enough and whether to replace it.
      const result = await generateText({
        model,
        temperature: deterministic ? 0 : undefined,
        messages: [
          {
            role: "system",
            content: renderedSystem.content,
            providerOptions: getPromptCachingOptions(state.pipelineConfig?.llmProvider),
          },
          { role: "user", content: renderedUser.content },
        ],
        output: Output.object({ schema: OUTCOME_ENRICH_SCHEMA }),
        providerOptions: getStructuredOutputProviderOptions(state.pipelineConfig?.llmProvider ?? "anthropic"),
      });
      const parsed = extractStructuredOutput(result) as z.infer<typeof OUTCOME_ENRICH_SCHEMA> | null;
      if (!parsed) continue;

      if (parsed.action === "replace") {
        const rawOutcome = String(parsed.outcome || "").trim();
        const outcome = rawOutcome.length > 250
          ? rawOutcome.slice(0, 250).replace(/\s+\S*$/, "")
          : rawOutcome;
        if (!outcome) continue;
        console.log(`[Analyzer] Enriched context "${proc.name}" outcome: "${proc.outcome}" -> "${outcome}"`);
        proc.outcome = outcome;
        proc.status = "concluded";
      }
    } catch (err: any) {
      debugLog("enrichContextsWithOutcomes: LLM call failed", err?.message || String(err));
      // Continue with other contexts
    }
  }
}

function findClaimPosition(
  text: string,
  claimText: string,
): { start: number; end: number } | null {
  const normalizedText = text.toLowerCase();
  const normalizedClaim = claimText.toLowerCase();

  let index = normalizedText.indexOf(normalizedClaim);
  if (index !== -1) {
    return { start: index, end: index + claimText.length };
  }
  return null;
}

// v2.6.30: Simplified - returns true for claims (NOT articles)
// Yes/no phrasing is normalized to claims at entry point, so no separate type exists
function isClaimInput(understanding: ClaimUnderstanding): boolean {
  return understanding.detectedInputType === "claim";
}

function resolveAnalysisPromptInput(
  understanding: ClaimUnderstanding,
  state: ResearchState,
): string {
  // v2.6.25: Never use originalInputDisplay for analysis - it's display-only
  // This ensures all inputs produce identical analysis results
  return (
    understanding.impliedClaim ||
    understanding.articleThesis ||
    understanding.mainThesis ||
    state.originalInput ||
    state.originalText ||
    ""
  );
}

// ============================================================================
// STEP 2-4: Research with Search Tracking
// ============================================================================

interface ResearchDecision {
  complete: boolean;
  focus?: string;
  queries?: string[];
  category?: string;
  isContradictionSearch?: boolean;
  targetContextId?: string;
  targetClaimId?: string;
  /** If true, search should use date filtering for recency */
  recencyMatters?: boolean;
}

function decideNextResearch(state: ResearchState): ResearchDecision {
  const recencyAssessor = new RecencyAssessor();
  const config = getActiveConfig(state.pipelineConfig);
  const categories = [
    ...new Set(state.evidenceItems.map((f: EvidenceItem) => f.category)),
  ];
  const understanding = state.understanding!;

  const directClaimsForResearch = (understanding.subClaims || []).filter(
    (c: any) => !c?.thesisRelevance || c.thesisRelevance === "direct",
  );

  const entities = directClaimsForResearch
    .flatMap((c: any) => c.keyEntities)
    .slice(0, state.searchConfig.queryGeneration?.maxEntitiesPerClaim ?? 4);

  // For claim inputs (normalized), prioritize the implied claim for better search results
  const isClaimLike = isClaimInput(understanding);
  const stopWords = ENGLISH_STOPWORDS;

  let entityStr = "";

  // For claim inputs, prefer key entities as anchor terms to reduce evaluative phrasing noise.
  if (isClaimLike) {
    const entityHints = Array.from(
      new Set(
        entities
          .map((value) => String(value || "").toLowerCase().trim())
          .filter((word) => word.length > (state.searchConfig.queryGeneration?.maxWordLength ?? 2) && !stopWords.has(word)),
      ),
    ).slice(0, state.searchConfig.queryGeneration?.maxSearchTerms ?? 8);

    if (entityHints.length >= 2) {
      entityStr = entityHints.join(" ");
    } else if (understanding.impliedClaim) {
      entityStr = understanding.impliedClaim
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > (state.searchConfig.queryGeneration?.maxWordLength ?? 2) && !stopWords.has(word))
        .slice(0, state.searchConfig.queryGeneration?.maxSearchTerms ?? 8)
        .join(" ");
    }
  } else {
    // For articles/claims, use keyEntities
    entityStr = entities.join(" ");
  }

  // Fallback: if entityStr is empty, extract terms from claim text or thesis
  if (!entityStr.trim()) {
    const fallbackText = understanding.impliedClaim
      || understanding.articleThesis
      || directClaimsForResearch[0]?.text
      || state.originalText?.slice(0, 150)
      || "";
    entityStr = fallbackText
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > (state.searchConfig.queryGeneration?.maxWordLength ?? 2) && !stopWords.has(word))
      .slice(0, state.searchConfig.queryGeneration?.maxFallbackTerms ?? 6)
      .join(" ");
  }

  const hasLegal = categories.includes("legal_provision");
  const hasEvidence = categories.includes("evidence");

  // Detect if this topic requires recent data
  // v2.6.25: Use impliedClaim (normalized) for consistent recency detection across input styles
  const recencyMatters = recencyAssessor.isRecencySensitive(
    understanding.impliedClaim || understanding.articleThesis || state.originalInput || "",
    understanding,
    state.pipelineConfig?.recencyCueTerms,
  );

  // Get current year for date-specific queries
  const currentYear = new Date().getFullYear();

  if (recencyMatters && state.searchConfig.enabled) {
    debugLog("Research phase: Recency-sensitive topic detected - prioritizing web search", {
      input: state.originalInput?.substring(0, 100),
    });
  }

  const contexts = understanding.analysisContexts || [];
  const contextsWithEvidence = new Set(
    state.evidenceItems
      .map((f: EvidenceItem) => f.contextId)
      .filter(Boolean),
  );
  const inverseClaimCandidate = generateInverseClaimQuery(
    understanding.impliedClaim || state.originalInput || "",
  );
  const inverseClaimSearchRequired = !!inverseClaimCandidate;

  // Scale evidence minimum with context count: each context should have meaningful
  // coverage, not just 6 items split across N contexts. The per-context floor (3)
  // ensures at least basic evidence per analytical frame.
  // Cap at 75% of maxTotalSources so the threshold is always reachable.
  const scaledMinEvidence = Math.max(
    config.minEvidenceItemsRequired,
    Math.min(contexts.length * 3, Math.floor(config.maxTotalSources * 0.75)),
  );
  if (
    state.evidenceItems.length >= scaledMinEvidence &&
    categories.length >= CONFIG.minCategories &&
    state.contradictionSearchPerformed &&
    (!inverseClaimSearchRequired || state.inverseClaimSearchPerformed) &&
    (contexts.length === 0 ||
      contexts.every((p: AnalysisContext) =>
        contextsWithEvidence.has(p.id),
      ))
  ) {
    // =========================================================================
    // CENTRAL CLAIM EVIDENCE COVERAGE (NEW)
    // For each CENTRAL core claim, try to obtain at least one evidence or counter-evidence item.
    // This is best-effort and bounded: at most 1 targeted search per central claim.
    // =========================================================================
    const hasStructurallyLinkedEvidence = (claim: any): boolean => {
      const claimId = String(claim?.id || "");
      const claimContextId = String(claim?.contextId || "");
      return state.evidenceItems.some((item: EvidenceItem) => {
        if (claimId && String((item as any)?.relatedClaimId || "") === claimId) return true;
        if (claimContextId && String(item.contextId || "") === claimContextId) return true;
        return false;
      });
    };

    const centralCoreClaims = directClaimsForResearch.filter(
      (c: any) => c?.isCentral === true && c?.claimRole === "core",
    );

    for (const c of centralCoreClaims) {
      if (!c?.id) continue;
      if (state.centralClaimsSearched.has(c.id)) continue;
      if (hasStructurallyLinkedEvidence(c)) continue;

      const basis = String(c.text || understanding.impliedClaim || state.originalInput || "").trim();
      if (!basis) continue;

      const entityHints = Array.isArray(c.keyEntities) ? c.keyEntities.slice(0, 4).join(" ") : "";
      const qBase = entityHints ? `${basis} ${entityHints}`.trim() : basis;

      debugLog("Central-claim evidence coverage: scheduling targeted search", {
        claimId: c.id,
        claimText: basis.slice(0, 140),
        contextId: c.contextId || "",
      });

      return {
        complete: false,
        category: "central_claim",
        targetClaimId: c.id,
        targetContextId: c.contextId || undefined,
        focus: `Central claim evidence: ${basis.slice(0, 80)}`,
        queries: [
          `${qBase} evidence`,
          `${qBase} study`,
          `${qBase} criticism`,
        ],
        recencyMatters: recencyAssessor.isRecencySensitive(
          basis,
          understanding,
          state.pipelineConfig?.recencyCueTerms,
        ),
      };
    }

    // =========================================================================
    // CLAIM-LEVEL RECENCY CHECK (v2.6.22)
    // Before marking complete, check if any claims appear to be about recent events
    // but have zero supporting evidence. This catches cases like DOGE (Jan-May 2025)
    // where the thesis-level recency check passed but individual claims need evidence.
    // =========================================================================
    const claimsWithoutEvidence = directClaimsForResearch.filter((claim: any) => {
      // Check if this claim appears to be about recent events
      const claimText = claim.text || "";
      const isRecentClaim = recencyAssessor.isRecencySensitive(
        claimText,
        undefined,
        state.pipelineConfig?.recencyCueTerms,
      );

      const hasEvidence = hasStructurallyLinkedEvidence(claim);

      return isRecentClaim && !hasEvidence;
    });

    // If there are recent claims without evidence, don't mark complete yet - search for them
    if (claimsWithoutEvidence.length > 0 && !state.recentClaimsSearched) {
      const claimToSearch = claimsWithoutEvidence[0]; // Search for first ungrounded recent claim
      const claimEntities = (claimToSearch.keyEntities || []).slice(0, 4).join(" ");
      const claimTerms = (claimToSearch.text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 5)
        .join(" ");

      debugLog("Claim-level recency check: Found ungrounded recent claims", {
        count: claimsWithoutEvidence.length,
        firstClaim: claimToSearch.text?.substring(0, 100),
        entities: claimEntities,
      });

      const queries = [
        `${claimEntities} ${currentYear}`.trim(),
        `${claimTerms} ${currentYear} latest`.trim(),
        `${claimEntities} recent news`.trim(),
      ].filter(q => q.length > 5);

      return {
        complete: false,
        focus: `Recent claim: ${claimToSearch.text?.substring(0, 50)}...`,
        category: "evidence",
        queries,
        recencyMatters: true,
      };
    }

    return { complete: true };
  }

  // Research each context — one pass through contexts, reserving at least 1 iteration
  // for contradiction search. The old gate (contexts.length * 2) allowed Block 2 to retry
  // the same context indefinitely when evidence extraction assigned items to a different
  // context, consuming the entire iteration budget and starving contradiction search.
  const mandatorySlots = 2; // contradiction + inverse claim
  const localEffectiveMax = Math.max(
    config.maxResearchIterations,
    Math.min(contexts.length + mandatorySlots, config.maxResearchIterations * 2),
  );
  const reserveForContradiction = state.contradictionSearchPerformed ? 0 : 1;
  const contextBudget = Math.max(0, Math.min(contexts.length, localEffectiveMax - reserveForContradiction));

  if (
    contexts.length > 0 &&
    state.iterations.length < contextBudget
  ) {
    for (const context of contexts) {
      const contextEvidenceItems = state.evidenceItems.filter(
        (f) => f.contextId === context.id,
      );
      if (contextEvidenceItems.length < 2) {
        const contextMeta = (context.metadata || {}) as Record<string, any>;
        const contextAuthority = String(
          contextMeta.institution || contextMeta.court || contextMeta.regulatoryBody || "",
        ).trim();
        const contextDescriptor =
          String(context.subject || context.assessedStatement || context.name || "").trim();
        const contextNameKey = extractKeyWordsForQuery(contextDescriptor, 4, 4).join(" ");
        const contextAlias = normalizeContextAlias(context.shortName);
        const contextKey = [contextAuthority, contextAlias, contextNameKey]
          .filter(Boolean)
          .join(" ")
          .trim();
        const authorityKey = contextAuthority || contextKey;
        // Build base queries
        const baseQueries = [
          `${entityStr} ${contextKey}`.trim(),
          `${authorityKey} official decision documents`.trim(),
          `${authorityKey} evidence procedure`.trim(),
          `${entityStr} ${authorityKey} outcome`.trim(),
        ];
        // Add date-variant queries for recency-sensitive topics
        const queries = recencyMatters ? [
          ...baseQueries,
          `${contextKey} ${currentYear} latest`.trim(),
        ] : baseQueries;
        return {
          complete: false,
          focus: `${context.name} - ${contextKey || "context"}`,
          targetContextId: context.id,
          category: "evidence",
          queries,
          recencyMatters,
        };
      }
    }
  }

  if (
    !hasLegal &&
    understanding.legalFrameworks.length > 0 &&
    state.iterations.length === 0
  ) {
    const baseQueries = [
      `${entityStr} legal basis statute`,
      `${understanding.legalFrameworks[0]} law provisions`,
    ];
    // Add date-variant for recency-sensitive legal topics
    const queries = recencyMatters ? [
      ...baseQueries,
      `${entityStr} ${understanding.legalFrameworks[0]} ${currentYear} ruling decision`,
    ] : baseQueries;
    return {
      complete: false,
      focus: "Applicable framework",
      category: "legal_provision",
      queries,
      recencyMatters,
    };
  }

  if (!hasEvidence && state.iterations.length <= 1) {
    // For recency-sensitive topics, add date-specific queries
    const baseQueries = [
      `${entityStr} evidence documents`,
      `${entityStr} evidence findings`,
    ];

    const queries = recencyMatters ? [
      ...baseQueries,
      `${entityStr} ${currentYear} ${currentYear - 1} latest news`,
      `${entityStr} recent announcement update`,
    ] : baseQueries;

    return {
      complete: false,
      focus: recencyMatters ? "Recent evidence (prioritizing current data)" : "Evidence",
      category: "evidence",
      queries,
      recencyMatters,
    };
  }

  if (!state.contradictionSearchPerformed) {
    const baseQueries = [
      `${entityStr} criticism concerns`,
      `${entityStr} controversy disputed unfair`,
    ];
    const contextAwareQueries = buildContextAwareCriticismQueries(
      entityStr,
      contexts,
      currentYear,
    );
    // Add date-variant for recent controversies/criticism
    const queries = contextAwareQueries.length > 0
      ? (recencyMatters ? contextAwareQueries : contextAwareQueries.slice(0, 2))
      : (recencyMatters ? baseQueries : baseQueries.slice(0, 2));
    return {
      complete: false,
      focus: "Criticism and opposing views",
      category: "criticism",
      isContradictionSearch: true,
      queries,
      recencyMatters,
    };
  }

  // NEW v2.6.29: Search for INVERSE claim evidence (counter-evidence)
  // For claims like "X is better than Y", explicitly search for evidence that "Y is better than X"
  if (!state.inverseClaimSearchPerformed) {
    const inverseClaim = inverseClaimCandidate;

    if (inverseClaim) {
      const inverseQueries = [
        `${inverseClaim} evidence study`,
        `${inverseClaim} research data`,
        ...(recencyMatters ? [`${inverseClaim} ${currentYear}`] : []),
      ];
      return {
        complete: false,
        focus: "Counter-evidence search (inverse claim)",
        category: "counter_evidence",
        isContradictionSearch: true,  // Mark as contradiction for tracking
        queries: inverseQueries,
        recencyMatters,
      };
    }
  }

  // Cross-proceeding discovery pass (moved after contradiction/inverse to prevent budget starvation):
  // When only one context is detected, run one focused search for other formal proceedings
  // involving the same subject/entity but different authority.
  if (
    contexts.length === 1 &&
    state.iterations.length >= 2 &&
    !state.sources.some((s) => s.category === "cross_context")
  ) {
    const primaryMeta = (contexts[0]?.metadata || {}) as Record<string, any>;
    const primaryAuthority = String(
      primaryMeta.institution || primaryMeta.court || primaryMeta.regulatoryBody || "",
    ).trim();
    const crossQueries = [
      `${entityStr} related proceeding different authority ruling`,
      `${entityStr} parallel legal case court decision`,
      `${entityStr} additional institution proceeding ruling`,
      ...(recencyMatters ? [`${entityStr} separate proceeding ${currentYear}`] : []),
    ];
    if (primaryAuthority) {
      crossQueries.push(
        `${entityStr} separate proceeding different from ${primaryAuthority}`,
        `${entityStr} other authority court ruling ${currentYear}`,
      );
    }
    return {
      complete: false,
      focus: "Related proceedings (cross-authority)",
      category: "cross_context",
      queries: crossQueries,
      recencyMatters,
    };
  }

  // NEW v2.6.18: Search for decision-makers and potential conflicts of interest
  if (!state.decisionMakerSearchPerformed && contexts.length > 0) {
    // Extract decision-maker names from all contexts
    const decisionMakerNames = contexts
      .flatMap((s: AnalysisContext) => s.decisionMakers?.map(dm => dm.name) || [])
      .filter((name, index, arr) => arr.indexOf(name) === index); // unique names

    if (decisionMakerNames.length > 0) {
      const firstContextMeta = (contexts[0]?.metadata || {}) as Record<string, any>;
      const firstContextAuthority = String(firstContextMeta.court || firstContextMeta.institution || "").trim();
      const baseQueries = [
        `${decisionMakerNames[0]} conflict of interest ${entityStr}`,
        `${decisionMakerNames[0]} impartiality bias ${firstContextAuthority}`,
        ...(decisionMakerNames.length > 1 ? [`${decisionMakerNames.slice(0, 2).join(" ")} role multiple trials`] : []),
      ];
      // Add date-variant for recency-sensitive conflict searches
      const queries = recencyMatters ? [
        ...baseQueries,
        `${decisionMakerNames[0]} ${currentYear} conflict bias`,
      ] : baseQueries;
      return {
        complete: false,
        focus: "Decision-maker conflicts of interest",
        category: "conflict_of_interest",
        queries,
        recencyMatters,
      };
    }

    // Fallback when the model didn't populate decisionMakers: still search generically for conflicts/independence.
    // This keeps runs aligned regardless of phrasing, without hardcoding any domain/person names.
    const fallbackBaseQueries = [
      `${entityStr} conflict of interest decision maker`.trim(),
      `${entityStr} impartiality bias`.trim(),
      `${entityStr} recusal ethics`.trim(),
    ];
    const fallbackQueries = recencyMatters ? [
      ...fallbackBaseQueries,
      `${entityStr} conflict ${currentYear}`.trim(),
    ] : fallbackBaseQueries;
    return {
      complete: false,
      focus: "Decision-maker conflicts of interest",
      category: "conflict_of_interest",
      queries: fallbackQueries,
      recencyMatters,
    };
  }

  // NEW v2.6.18: Use generated research queries for additional searches
  // Determinism: skip this step because researchQueries come from the model and can cause run-to-run drift.
  if ((state.pipelineConfig?.deterministic ?? DEFAULT_PIPELINE_CONFIG.deterministic)) {
    // no-op
  } else {
  const researchQueries = understanding.researchQueries || [];
  const nextQueryIdx = Array.from({ length: researchQueries.length }, (_, i) => i)
    .find(i => !state.researchQueriesSearched.has(i));

  if (nextQueryIdx !== undefined && state.iterations.length < config.maxResearchIterations) {
    const researchQuery = researchQueries[nextQueryIdx];
    // Convert research query to search query by extracting key terms
    const queryTerms = researchQuery
      .toLowerCase()
      .replace(/[?.,!]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 6)
      .join(" ");

    if (queryTerms.trim()) {
      const baseQueries = [
        queryTerms,
        `${entityStr} ${queryTerms.split(" ").slice(0, 3).join(" ")}`,
      ];
      // Add date-variant for recency-sensitive research queries
      const queries = recencyMatters ? [
        ...baseQueries,
        `${queryTerms} ${currentYear}`,
      ] : baseQueries;
      return {
        complete: false,
        focus: `Research: ${researchQuery.slice(0, 50)}...`,
        category: "research_query",
        queries,
        recencyMatters,
      };
    }
    }
  }

  return { complete: true };
}

// Helper to decode HTML entities in text
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&#x2d;": "-",
    "&#x2D;": "-",
    "&nbsp;": " ",
    "&#160;": " ",
    "&ndash;": "â€“",
    "&mdash;": "â€”",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }
  // Also handle numeric entities like &#45;
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  // Handle hex entities like &#x2d;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );

  return result;
}

/**
 * Extract a readable title from URL path/filename
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Get filename from path
    const filename = pathname.split("/").pop() || "";

    if (filename) {
      // Remove extension and clean up
      let title = filename
        .replace(/\.(pdf|html|htm|php|aspx?)$/i, "")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Capitalize first letter of each word
      if (title.length > 3) {
        title = title
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
        return title.slice(0, 100);
      }
    }

    // Fallback to hostname
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "Unknown Source";
  }
}

/**
 * Extract title from document text with PDF header detection
 */
function extractTitle(text: string, url: string): string {
  const firstLine = text.split("\n")[0]?.trim().slice(0, 150) || "";

  // Check for PDF header patterns - these indicate raw PDF bytes
  const isPdfHeader =
    /^%PDF-\d+\.\d+/.test(firstLine) ||
    firstLine.includes("%ï¿½ï¿½ï¿½") ||
    firstLine.includes("\x00") ||
    /^[\x00-\x1f\x7f-\xff]{3,}/.test(firstLine);

  // Check for other binary/garbage patterns
  const isGarbage =
    firstLine.length < 3 ||
    !/\p{L}{3,}/u.test(firstLine) || // Must have some letters (any language)
    (firstLine.match(/[^\x20-\x7E]/g)?.length || 0) > firstLine.length * 0.3; // >30% non-printable

  if (isPdfHeader || isGarbage) {
    // Try to find a better title in the first few lines
    const lines = text.split("\n").slice(0, 10);
    for (const line of lines) {
      const cleaned = line.trim();
      // Look for a line that looks like a title (has letters, reasonable length)
      if (
        cleaned.length >= 10 &&
        cleaned.length <= 150 &&
        /\p{L}{4,}/u.test(cleaned) &&
        !/^%PDF/.test(cleaned) &&
        (cleaned.match(/[^\x20-\x7E]/g)?.length || 0) < cleaned.length * 0.1
      ) {
        return cleaned.slice(0, 100);
      }
    }

    // Fallback to URL-based title
    return extractTitleFromUrl(url);
  }

  return firstLine.slice(0, 100) || extractTitleFromUrl(url);
}

async function fetchSource(
  url: string,
  id: string,
  category: string,
  searchQuery?: string,
  pipelineConfig?: PipelineConfig,
): Promise<FetchedSource | null> {
  const config = getActiveConfig(pipelineConfig);
  const trackRecord = getTrackRecordScore(url);

  try {
    const result = await Promise.race([
      extractTextFromUrl(url, {
        pdfParseTimeoutMs:
          pipelineConfig?.pdfParseTimeoutMs ?? DEFAULT_PIPELINE_CONFIG.pdfParseTimeoutMs,
      }),
      new Promise<{ text: string; title: string; contentType: string }>(
        (_, reject) =>
          setTimeout(() => reject(new Error("timeout")), CONFIG.fetchTimeoutMs),
      ),
    ]);

    // Handle both old (string) and new (object) return types for compatibility
    const text = typeof result === "string" ? result : result.text;
    const extractedTitle = typeof result === "string" ? null : result.title;

    // Use extracted title if available, otherwise fall back to extraction
    let title = extractedTitle || extractTitle(text, url);
    title = decodeHtmlEntities(title);

    return {
      id,
      url,
      title,
      trackRecordScore: trackRecord,
      fullText: text.slice(0, config.articleMaxChars),
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: true,
      searchQuery,
    };
  } catch (err) {
    console.warn(`Fetch failed for ${url}:`, err);
    return {
      id,
      url,
      title: extractTitleFromUrl(url),
      trackRecordScore: trackRecord,
      fullText: "",
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: false,
      searchQuery,
    };
  }
}

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Using empty string "" instead of optional for string fields.
const EVIDENCE_SCHEMA = z.object({
  evidenceItems: z.array(
    z.object({
      statement: z.string(),
      category: z.enum([
        "legal_provision",
        "evidence",
        "direct_evidence",  // NEW v2.8: Preferred value (avoids tautology)
        "expert_quote",
        "statistic",
        "event",
        "criticism",
      ]),
      specificity: z.enum(["high", "medium", "low"]),
      sourceExcerpt: z.string().min(20),
      contextId: z.string(), // empty string if not applicable
      isContestedClaim: z.boolean(),
      claimSource: z.string(), // empty string if not applicable
      // NEW v2.6.29: Does this evidence item support or contradict the ORIGINAL user claim?
      claimDirection: z.enum(["supports", "contradicts", "neutral"]),
      // Source authority classification: producer type only (primary/secondary/opinion)
      // Contestation is handled at assertion level (isContestedClaim, contestedBy), not source type
      sourceAuthority: z.enum(["primary", "secondary", "opinion"]),
      // Evidence basis classification (required — prompt instructs LLM; normalization fallback is safety net)
      evidenceBasis: z.enum(["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"]),
      // Probative value assessment (required — prompt instructs LLM; normalization fallback is safety net)
      probativeValue: z.enum(["high", "medium", "low"]),
      // EvidenceScope: Captures the methodology/boundaries of the source document
      // (e.g., different analytical standards, different regulatory frameworks, different time periods)
      evidenceScope: z.object({
        name: z.string(),           // Short label (e.g., "WTW", "TTW", "Lifecycle-A")
        methodology: z.string(),    // Standard/method (empty string if not applicable)
        boundaries: z.string(),     // What's included/excluded (empty string if not applicable)
        geographic: z.string(),     // Geographic coverage (empty string if not applicable)
        temporal: z.string(),       // Time period (empty string if not applicable)
        // NEW v2.8 (Phase 2.5): Source type classification for better reliability calibration
        sourceType: z.enum([
          "peer_reviewed_study",
          "fact_check_report",
          "government_report",
          "legal_document",
          "news_primary",
          "news_secondary",
          "expert_statement",
          "organization_report",
          "other",
        ]).optional(),
      }).optional(),
    }),
  ),
});


function normalizeSupportingEvidenceIds(raw: any, source: string, normalizer: EvidenceNormalizer): string[] {
  if (Array.isArray(raw?.supportingEvidenceIds) && raw.supportingEvidenceIds.length > 0) {
    return normalizer.normalizeIdList(raw.supportingEvidenceIds, source);
  }
  return [];
}

async function extractEvidence(
  source: FetchedSource,
  focus: string,
  model: any,
  contexts: AnalysisContext[],
  targetContextId?: string,
  originalClaim?: string,
  fromOppositeClaimSearch?: boolean,
  pipelineConfig?: PipelineConfig,
  extractionStats?: { llmFilterFailed?: boolean },  // P3: Track LLM filter failures
  evidenceFilterConfig?: Partial<ProbativeFilterConfig>,
): Promise<EvidenceItem[]> {
  const fallbackTracker = new FallbackTracker();
  const evidenceNormalizer = new EvidenceNormalizer(fallbackTracker);
  console.log(`[Analyzer] extractEvidence called for source ${source.id}: "${source.title?.substring(0, 50)}..."`);
  console.log(`[Analyzer] extractEvidence: fetchSuccess=${source.fetchSuccess}, fullText length=${source.fullText?.length ?? 0}`);

  if (!source.fetchSuccess || !source.fullText) {
    console.warn(`[Analyzer] extractEvidence: Skipping ${source.id} - no content (fetchSuccess=${source.fetchSuccess}, hasText=${!!source.fullText})`);
    return [];
  }

  const contextsList =
    contexts.length > 0
      ? `\n\nKNOWN CONTEXTS:\n${contexts.map((p: AnalysisContext) => `- ${p.id}: ${p.name}`).join("\n")}`
      : "";

  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  debugLog(`extractEvidence: Calling LLM for ${source.id}`, {
    textLength: source.fullText.length,
    title: source.title?.substring(0, 50),
    focus: focus.substring(0, 100),
  });

  try {
    const renderedSystem = await loadAndRenderSection("orchestrated", "EXTRACT_EVIDENCE", {
      focus,
      targetContextId: targetContextId || "",
      currentDateReadable,
      currentDate: currentDateStr,
      originalClaim: originalClaim || "",
      contextsList,
    });
    const renderedUser = await loadAndRenderSection("orchestrated", "EXTRACT_EVIDENCE_USER", {
      SOURCE_TITLE: source.title || "",
      SOURCE_URL: source.url || "",
      SOURCE_TEXT: source.fullText,
    });
    if (!renderedSystem?.content?.trim() || !renderedUser?.content?.trim()) {
      throw new Error("Missing EXTRACT_EVIDENCE prompt sections in orchestrated prompt profile");
    }

    const startTime = Date.now();
    const llmTimeoutMsRaw =
      pipelineConfig?.extractEvidenceLlmTimeoutMs ??
      DEFAULT_PIPELINE_CONFIG.extractEvidenceLlmTimeoutMs ??
      300000;
    const llmTimeoutMs = Number.isFinite(llmTimeoutMsRaw)
      ? Math.max(60000, Math.min(3600000, llmTimeoutMsRaw))
      : 300000;

    const result: any = await Promise.race([
      generateText({
      model,
      messages: [
        { role: "system", content: renderedSystem.content, providerOptions: getPromptCachingOptions(pipelineConfig?.llmProvider) },
        { role: "user", content: renderedUser.content },
      ],
      temperature: getDeterministicTemperature(0.2, pipelineConfig),
      output: Output.object({ schema: EVIDENCE_SCHEMA }),
      providerOptions: getStructuredOutputProviderOptions(pipelineConfig?.llmProvider ?? "anthropic"),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`extractEvidence LLM timeout after ${llmTimeoutMs}ms`)), llmTimeoutMs),
      ),
    ]);
    const elapsed = Date.now() - startTime;

    debugLog(`extractEvidence: LLM returned for ${source.id} in ${elapsed}ms`);
    debugLog(`extractEvidence: Result keys`, result ? Object.keys(result) : "null");

    if (elapsed < 2000) {
      debugLog(`extractEvidence: WARNING - LLM responded suspiciously fast (${elapsed}ms) for ${source.fullText.length} chars`);
    }

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (!rawOutput) {
      debugLog(`extractEvidence: No structured output for ${source.id}`, {
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : "null",
        resultPreview: result && typeof result === 'object' ? JSON.stringify(result).substring(0, 500) : "N/A",
      });
      return [];
    }

    const parsed = EVIDENCE_SCHEMA.safeParse(rawOutput);
    if (!parsed.success) {
      console.warn(`[Analyzer] extractEvidence: structured output validation failed for ${source.id}`, parsed.error?.message);
    }

    const extractedItems = evidenceNormalizer.normalizeItems(rawOutput, `Analyzer.extractEvidence:${source.id}`);
    console.log(`[Analyzer] extractEvidence: Raw extraction has ${extractedItems.length} evidence items`);

    if (!extractedItems || extractedItems.length === 0) {
      console.warn(`[Analyzer] Invalid evidence extraction from ${source.id} - no evidence items returned`);
      return [];
    }

    let filteredEvidenceItems = extractedItems
      .filter((item) => item.specificity !== "low" && (item.sourceExcerpt?.length ?? 0) >= 20);

    // Conservative safeguard: avoid treating high-impact outcomes (sentencing/conviction/prison terms)
    // as evidence when they come from low/unknown-reliability sources.
    // These claims are easy to get wrong and can dominate the analysis.
    // PR-C: Normalize trackRecordScore to 0-1 scale before using in comparison
    const track = typeof source.trackRecordScore === "number" ? normalizeTrackRecordScore(source.trackRecordScore) : null;
    // Only apply this safeguard when we have an explicit reliability score.
    // If no source bundle is configured, trackRecordScore is null (unknown) and we should NOT discard evidence items.
    if (typeof track === "number" && track < 0.6) {
      const before = filteredEvidenceItems.length;
      // LLM-powered high-impact outcome detection (replaces hardcoded keywords)
      try {
        const modelInfo = getModelForTask("extract_evidence"); // Haiku tier â€” fast, cheap
        const itemTexts = filteredEvidenceItems.map((item, idx) =>
          `[${idx}]: ${(item.statement + " " + (item.sourceExcerpt || "")).slice(0, 300)}`
        ).join("\n");
        const renderedImpactPrompt = await loadAndRenderSection(
          "orchestrated",
          "EXTRACT_EVIDENCE_HIGH_IMPACT_FILTER_USER",
          { ITEM_TEXTS: itemTexts },
        );
        if (!renderedImpactPrompt?.content?.trim()) {
          throw new Error("Missing EXTRACT_EVIDENCE_HIGH_IMPACT_FILTER_USER prompt section in orchestrated prompt profile");
        }
        const impactResult = await generateText({
          model: modelInfo.model,
          messages: [{ role: "user", content: renderedImpactPrompt.content }],
          temperature: 0,
        });
        let responseText = impactResult.text.trim();
        responseText = responseText.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
        const flags = JSON.parse(responseText);
        if (Array.isArray(flags) && flags.length === filteredEvidenceItems.length) {
          filteredEvidenceItems = filteredEvidenceItems.filter((_, idx) => !flags[idx]);
        }
      } catch (err) {
        // LLM call failed â€” skip high-impact filtering rather than blocking the pipeline
        console.warn(`[Analyzer] extractEvidence: LLM high-impact assessment failed for ${source.id}, skipping filter`, err);
      }
      if (before !== filteredEvidenceItems.length) {
        console.warn(
          `[Analyzer] extractEvidence: filtered ${before - filteredEvidenceItems.length} high-impact outcome evidence items from low/unknown trackRecord source ${source.id} (track=${track})`,
        );
      }
    }

    console.log(`[Analyzer] extractEvidence: After filtering (non-low specificity, excerpt >= 20 chars): ${filteredEvidenceItems.length} evidence items`);

    if (filteredEvidenceItems.length === 0 && extractedItems.length > 0) {
      console.warn(`[Analyzer] extractEvidence: All ${extractedItems.length} evidence items were filtered out!`);
      extractedItems.forEach((item, i) => {
        console.warn(`[Analyzer]   Evidence item ${i}: specificity="${item.specificity}", excerptLen=${item.sourceExcerpt?.length ?? 0}`);
      });
    }

    // Map evidence items with provenance metadata
    const evidenceItemsWithProvenance = filteredEvidenceItems.map((item, i) => ({
        id: `${source.id}-E${i + 1}`,
        statement: item.statement ?? "",
        category: (item.category ?? "evidence") as EvidenceItem["category"],
        specificity: (item.specificity ?? "medium") as "high" | "medium",
        sourceId: source.id,
        sourceUrl: source.url,
        sourceTitle: source.title,
        sourceExcerpt: item.sourceExcerpt ?? "",
        contextId: item.contextId || targetContextId,
        isContestedClaim: item.isContestedClaim,
        claimSource: item.claimSource,
        claimDirection: item.claimDirection,
        probativeValue: item.probativeValue,  // v2.8: LLM assessment of evidence quality
        evidenceScope: item.evidenceScope,
        sourceAuthority: item.sourceAuthority,
        evidenceBasis: item.evidenceBasis,
        fromOppositeClaimSearch: fromOppositeClaimSearch || false,
      }));

    // Phase 1.5: claimDirection validation telemetry
    // Track how often claimDirection is missing to inform future requirement enforcement
    const missingClaimDirection = evidenceItemsWithProvenance.filter(item => !item.claimDirection || item.claimDirection === undefined);
    if (missingClaimDirection.length > 0) {
      console.warn(
        `[Telemetry] claimDirection missing: ${missingClaimDirection.length}/${evidenceItemsWithProvenance.length} evidence items ` +
        `(${Math.round(100 * missingClaimDirection.length / evidenceItemsWithProvenance.length)}%) ` +
        `from source ${source.id}`
      );
      console.warn(`[Telemetry] Missing claimDirection evidence item IDs: ${missingClaimDirection.map(item => item.id).join(", ")}`);
    } else if (evidenceItemsWithProvenance.length > 0) {
      console.log(
        `[Telemetry] claimDirection coverage: 100% (${evidenceItemsWithProvenance.length}/${evidenceItemsWithProvenance.length}) ` +
        `from source ${source.id}`
      );
    }

    // Phase 1.5 Layer 2: Probative value filter (deterministic post-process)
    // Filter out low-quality evidence that slipped through LLM extraction layer
    // Only apply if enabled via environment flag (default: enabled)
    const probativeFilterEnabled =
      pipelineConfig?.probativeFilterEnabled ??
      DEFAULT_PIPELINE_CONFIG.probativeFilterEnabled;
    let filteredByProbativeValue = evidenceItemsWithProvenance as typeof evidenceItemsWithProvenance;

    if (probativeFilterEnabled && evidenceItemsWithProvenance.length > 0) {
      // v2.9: LLM Evidence Quality Assessment (optional pre-filter)
      const useLLMEvidenceQuality = isLLMEnabled("evidence");
      let llmFilterSuccess = false;
      let candidateEvidenceItems = evidenceItemsWithProvenance as EvidenceItem[];

      if (useLLMEvidenceQuality) {
        try {
          debugLog("extractEvidence: LLM evidence quality assessment starting", {
            sourceId: source.id,
            itemCount: evidenceItemsWithProvenance.length,
          });

          // Convert EvidenceItem to EvidenceItemInput format for the service
          const evidenceInputs: EvidenceItemInput[] = evidenceItemsWithProvenance.map((item: any) => ({
            evidenceId: item.id,
            statement: item.statement,
            excerpt: item.sourceExcerpt,
            sourceUrl: item.sourceUrl,
            category: item.category,
          }));

          const textAnalysisService = getTextAnalysisService({
            pipelineConfig: pipelineConfig ?? undefined,
          });
          const qualityResults = await textAnalysisService.assessEvidenceQuality({
            evidenceItems: evidenceInputs,
            thesisText: originalClaim || focus,
          });

          // Filter items based on LLM quality assessment
          const qualityMap = new Map<string, EvidenceQualityResult>();
          for (const result of qualityResults) {
            qualityMap.set(result.evidenceId, result);
          }

          const llmKept: typeof evidenceItemsWithProvenance = [];
          const llmFiltered: typeof evidenceItemsWithProvenance = [];
          const llmFilterReasons: Record<string, number> = {};

          for (const item of evidenceItemsWithProvenance as any[]) {
            const quality = qualityMap.get(item.id);
            if (!quality || quality.qualityAssessment === "filter") {
              llmFiltered.push(item);
              const reasons = quality?.issues || ["llm_quality_filter"];
              for (const reason of reasons) {
                llmFilterReasons[reason] = (llmFilterReasons[reason] || 0) + 1;
              }
            } else {
              llmKept.push(item);
            }
          }

          // Log LLM filter statistics
          if (llmFiltered.length > 0) {
            console.log(
              `[Evidence Filter] LLM quality filter for ${source.id}: kept ${llmKept.length}/${evidenceItemsWithProvenance.length} ` +
              `(${Math.round(100 * llmKept.length / evidenceItemsWithProvenance.length)}%), filtered ${llmFiltered.length} items`
            );
            console.log(
              `[Evidence Filter] LLM filter reasons: ${Object.entries(llmFilterReasons)
                .map(([reason, count]) => `${reason}=${count}`)
                .join(", ")}`
            );
          } else {
            console.log(`[Evidence Filter] LLM quality filter for ${source.id}: all ${llmKept.length} items passed`);
          }

          candidateEvidenceItems = llmKept as EvidenceItem[];
          llmFilterSuccess = true;
          debugLog("extractEvidence: LLM evidence quality assessment complete", {
            sourceId: source.id,
            kept: llmKept.length,
            filtered: llmFiltered.length,
          });
        } catch (err) {
          // Fall back to heuristic filtering
          console.warn(
            `[Evidence Filter] LLM evidence quality assessment failed for ${source.id}, falling back to heuristics:`,
            err instanceof Error ? err.message : String(err)
          );
          debugLog("extractEvidence: LLM evidence quality assessment failed", {
            sourceId: source.id,
            error: err instanceof Error ? err.message : String(err),
          });
          // P3: Track LLM filter failure for warning generation
          if (extractionStats) {
            extractionStats.llmFilterFailed = true;
          }
        }
      }

      // Deterministic filtering (always apply; LLM filter is a pre-filter, not a replacement)
      const deduplicationThreshold =
        pipelineConfig?.probativeDeduplicationThreshold ??
        DEFAULT_PIPELINE_CONFIG.probativeDeduplicationThreshold ??
        DEFAULT_FILTER_CONFIG.deduplicationThreshold;
      const { kept, filtered, stats } = filterByProbativeValue(
        candidateEvidenceItems as EvidenceItem[],
        {
          ...DEFAULT_FILTER_CONFIG,
          ...evidenceFilterConfig,
          deduplicationThreshold,
        },
      );
      debugLog("Evidence filter stats", {
        sourceId: source.id,
        total: stats.total,
        kept: stats.kept,
        filtered: stats.filtered,
        deduplicationThreshold,
        reasons: stats.filterReasons,
      });

      // Log filter statistics
      if (stats.filtered > 0) {
        const falsePositiveRate = calculateFalsePositiveRate(filtered);
        console.log(
          `[Evidence Filter] Probative filter for ${source.id}: kept ${stats.kept}/${stats.total} ` +
          `(${Math.round(100 * stats.kept / stats.total)}%), filtered ${stats.filtered} items`
        );
        console.log(
          `[Evidence Filter] Filter reasons: ${Object.entries(stats.filterReasons)
            .map(([reason, count]) => `${reason}=${count}`)
            .join(", ")}`
        );

        if (falsePositiveRate > 0.05) {
          const llmPrefix = llmFilterSuccess ? " (LLM quality pre-filter applied)" : "";
          console.warn(
            `[Evidence Filter] âš ï¸ High false positive rate${llmPrefix}: ${Math.round(falsePositiveRate * 100)}% ` +
            `of filtered items had probativeValue="high"`
          );
        }
      } else {
        console.log(`[Evidence Filter] Probative filter for ${source.id}: all ${stats.kept} items passed`);
      }

      filteredByProbativeValue = kept as typeof evidenceItemsWithProvenance;
    }

    // Apply Ground Realism gate (PR 5): Evidence items must have real sources, not LLM synthesis
    // Only validate if enabled via environment flag (default: enabled)
    const provenanceValidationEnabled =
      pipelineConfig?.provenanceValidationEnabled ??
      DEFAULT_PIPELINE_CONFIG.provenanceValidationEnabled;

    if (provenanceValidationEnabled && filteredByProbativeValue.length > 0) {
      const { validEvidenceItems, stats } = filterEvidenceByProvenance(filteredByProbativeValue);
      console.log(`[Analyzer] Provenance validation for ${source.id}: ${stats.valid}/${stats.total} evidence items have valid provenance, ${stats.invalid} rejected`);
      return validEvidenceItems;
    }

    return filteredByProbativeValue;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    debugLog(`extractEvidence: ERROR for ${source.id}`, {
      error: errorMsg,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    });

    // Check for specific API errors
    if (errorMsg.includes("credit balance is too low") || errorMsg.includes("insufficient_quota")) {
      debugLog("âŒ ANTHROPIC API CREDITS EXHAUSTED");
    }

    // Check for OpenAI schema validation errors
    if (errorMsg.includes("Invalid schema") || errorMsg.includes("required")) {
      debugLog("âŒ OpenAI SCHEMA VALIDATION ERROR - check for .optional() fields in EVIDENCE_SCHEMA");
    }

    return [];
  }
}

/**
 * Pipeline Phase 1: Parallel evidence extraction with bounded concurrency
 * Uses Promise.allSettled for fault tolerance and dynamic backoff on throttling
 */
interface ParallelExtractionOptions {
  focus: string;
  model: any;
  contexts: AnalysisContext[];
  targetContextId?: string;
  originalClaim?: string;
  fromOppositeClaimSearch?: boolean;
  pipelineConfig?: PipelineConfig;
  evidenceFilterConfig?: Partial<ProbativeFilterConfig>;
  claimSimilarityThreshold?: number;
}

interface ParallelExtractionResult {
  evidenceItems: EvidenceItem[];
  llmFilterFailures: number;
  telemetry: {
    totalSources: number;
    successCount: number;
    failureCount: number;
    throttlingEvents: number;
    durationMs: number;
    concurrencyLevel: number;
    // LLM call count for accurate budget tracking
    // Currently equals successCount (1 LLM call per extraction)
    // Separated for future-proofing if extractEvidence starts making multiple calls
    llmCallCount: number;
  };
}

const DEFAULT_PARALLEL_EXTRACTION_LIMIT = 3;
// NOTE: CLAIM_EVIDENCE_SIMILARITY_THRESHOLD and TEMPORAL_CONTEXT_CONFIDENCE_THRESHOLD
// are now configurable via PipelineConfig.evidenceSimilarityThreshold (default: 0.4)
// and PipelineConfig.temporalConfidenceThreshold (default: 0.6) respectively.

async function extractEvidenceParallel(
  sources: FetchedSource[],
  options: ParallelExtractionOptions,
  existingEvidenceItems: EvidenceItem[],
): Promise<ParallelExtractionResult> {
  const evidenceDeduplicator = new EvidenceDeduplicator(0.85, assessTextSimilarityBatch);
  const startTime = Date.now();
  const allEvidenceItems: EvidenceItem[] = [];
  let llmFilterFailures = 0;
  let successCount = 0;
  let failureCount = 0;
  let throttlingEvents = 0;
  // Use configurable limit from PipelineConfig, fallback to default
  const configLimit = options.pipelineConfig?.parallelExtractionLimit ?? DEFAULT_PARALLEL_EXTRACTION_LIMIT;
  let currentLimit = configLimit;

  // Process in batches with bounded concurrency
  for (let i = 0; i < sources.length; i += currentLimit) {
    const batch = sources.slice(i, i + currentLimit);

    // Use allSettled for fault tolerance
    const batchResults = await Promise.allSettled(
      batch.map(async (source) => {
        const extractionStats: { llmFilterFailed?: boolean } = {};
        const items = await extractEvidence(
          source,
          options.focus,
          options.model,
          options.contexts,
          options.targetContextId,
          options.originalClaim,
          options.fromOppositeClaimSearch,
          options.pipelineConfig,
          extractionStats,
          options.evidenceFilterConfig,
        );
        return { items, llmFilterFailed: extractionStats.llmFilterFailed };
      })
    );

    // Process results
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        successCount++;
        if (result.value.llmFilterFailed) {
          llmFilterFailures++;
        }
        // Deduplicate against existing and already-collected items
        const uniqueItems = await evidenceDeduplicator.deduplicateItems(
          result.value.items,
          [...existingEvidenceItems, ...allEvidenceItems],
          options.claimSimilarityThreshold,
        );
        allEvidenceItems.push(...uniqueItems);
      } else {
        failureCount++;
        const errorMsg = result.reason?.message || String(result.reason);
        // Check for throttling errors (429, 503)
        if (errorMsg.includes("429") || errorMsg.includes("503") || errorMsg.includes("rate limit")) {
          throttlingEvents++;
          // Reduce concurrency on throttling
          currentLimit = Math.max(1, currentLimit - 1);
          console.warn(`[Analyzer] Parallel extraction: Throttling detected, reducing concurrency to ${currentLimit}`);
        } else {
          console.error(`[Analyzer] Parallel extraction: Source failed: ${errorMsg}`);
        }
      }
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[Analyzer] Parallel extraction: ${successCount}/${sources.length} sources succeeded in ${durationMs}ms ` +
    `(${throttlingEvents} throttling events, concurrency=${currentLimit})`
  );

  return {
    evidenceItems: allEvidenceItems,
    llmFilterFailures,
    telemetry: {
      totalSources: sources.length,
      successCount,
      failureCount,
      throttlingEvents,
      durationMs,
      concurrencyLevel: currentLimit,
      // Currently 1:1 with successCount; separated for future-proofing
      // if extractEvidence starts making multiple LLM calls
      llmCallCount: successCount,
    },
  };
}

// ============================================================================
// STEP 5: GENERATE VERDICTS - FIX: Calculate factorAnalysis from actual factors
// ============================================================================

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
const KEY_FACTOR_SCHEMA = z.object({
  factor: z.string(),
  supports: z.enum(["yes", "no", "neutral"]),
  explanation: z.string(),
  isContested: z.boolean(),
  contestedBy: z.string(), // empty string if not contested
  contestationReason: z.string(), // empty string if not contested
  factualBasis: z.enum(["established", "disputed", "opinion", "unknown"]),
});

const DEFAULT_EVIDENCE_QUALITY = {
  scientificCount: 0,
  documentedCount: 0,
  anecdotalCount: 0,
  theoreticalCount: 0,
  pseudoscientificCount: 0,
  weightedQuality: 0,
  strongestBasis: "documented" as const,
  diversity: 0,
};

const EVIDENCE_QUALITY_SCHEMA = z.object({
  scientificCount: z.number().min(0),
  documentedCount: z.number().min(0),
  anecdotalCount: z.number().min(0),
  theoreticalCount: z.number().min(0),
  pseudoscientificCount: z.number().min(0),
  weightedQuality: z.number().min(0).max(100),
  strongestBasis: z.enum(["scientific", "documented", "theoretical", "anecdotal", "pseudoscientific"]),
  diversity: z.number().min(0).max(1),
});

// Anthropic output_format currently rejects numeric min/max in JSON schema.
// Keep provider-side schema unconstrained and validate/normalize after generation.
const EVIDENCE_QUALITY_SCHEMA_ANTHROPIC = z.object({
  scientificCount: z.number(),
  documentedCount: z.number(),
  anecdotalCount: z.number(),
  theoreticalCount: z.number(),
  pseudoscientificCount: z.number(),
  weightedQuality: z.number(),
  strongestBasis: z.enum(["scientific", "documented", "theoretical", "anecdotal", "pseudoscientific"]),
  diversity: z.number(),
});

const EVIDENCE_QUALITY_SCHEMA_LENIENT = z
  .object({
    scientificCount: z.number().catch(0),
    documentedCount: z.number().catch(0),
    anecdotalCount: z.number().catch(0),
    theoreticalCount: z.number().catch(0),
    pseudoscientificCount: z.number().catch(0),
    weightedQuality: z.number().catch(0),
    strongestBasis: z.enum(["scientific", "documented", "theoretical", "anecdotal", "pseudoscientific"]).catch("documented"),
    diversity: z.number().catch(0),
  })
  .catch(DEFAULT_EVIDENCE_QUALITY);

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
const VERDICTS_SCHEMA_MULTI_CONTEXT = z.object({
  verdictSummary: z.object({
    answer: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
    calibrationNote: z.string(), // empty string if not applicable
  }),
  analysisContextAnswers: z.array(
    z.object({
      contextId: z.string(),
      contextName: z.string(),
      answer: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      shortAnswer: z.string(),
      keyFactors: z.array(KEY_FACTOR_SCHEMA),
    }),
  ),
  analysisContextSummary: z.string(),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingEvidenceIds: z.array(z.string()).optional(),
      contextId: z.string(), // empty string if not applicable
      // v2.8.4: Explicit rating direction confirmation - LLM states what it's rating
      // "claim_supported" = evidence supports the claim being TRUE (verdict should be 58-100)
      // "claim_refuted" = evidence refutes the claim (verdict should be 0-42)
      // "mixed" = evidence is balanced or insufficient (verdict should be 43-57)
      ratingConfirmation: z.enum(["claim_supported", "claim_refuted", "mixed"]),
      evidenceQuality: EVIDENCE_QUALITY_SCHEMA.optional(),
    }),
  ),
});

const VERDICTS_SCHEMA_MULTI_CONTEXT_ANTHROPIC = z.object({
  verdictSummary: z.object({
    answer: z.number(),
    confidence: z.number(),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
    calibrationNote: z.string(),
  }),
  analysisContextAnswers: z.array(
    z.object({
      contextId: z.string(),
      contextName: z.string(),
      answer: z.number(),
      confidence: z.number(),
      shortAnswer: z.string(),
      keyFactors: z.array(KEY_FACTOR_SCHEMA),
    }),
  ),
  analysisContextSummary: z.string(),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number(),
      confidence: z.number(),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingEvidenceIds: z.array(z.string()).optional(),
      contextId: z.string(),
      ratingConfirmation: z.enum(["claim_supported", "claim_refuted", "mixed"]),
      evidenceQuality: EVIDENCE_QUALITY_SCHEMA_ANTHROPIC.optional(),
    }),
  ),
});

// Lenient schemas used ONLY for recovery/parsing when the SDK throws NoObjectGeneratedError.
// Important: use `.catch()` instead of `.optional()` to keep OpenAI JSON schema generation happy.
const DEFAULT_KEY_FACTOR_LENIENT: KeyFactor = {
  factor: "",
  supports: "neutral",
  explanation: "",
  isContested: false,
  contestedBy: "",
  contestationReason: "",
  factualBasis: "unknown",
};

const KEY_FACTOR_SCHEMA_LENIENT = z.object({
    factor: z.string().catch(""),
    supports: z.enum(["yes", "no", "neutral"]).catch("neutral"),
    explanation: z.string().catch(""),
    isContested: z.boolean().optional().catch(undefined),
    contestedBy: z.string().catch(""),
    contestationReason: z.string().catch(""),
    factualBasis: z
      .enum(["established", "disputed", "opinion", "unknown"])
      .optional()
      .catch(undefined),
  });

const DEFAULT_VERDICT_SUMMARY_LENIENT = {
  answer: 50,
  confidence: 50,
  shortAnswer: "",
  nuancedAnswer: "",
  keyFactors: [] as KeyFactor[],
  calibrationNote: "",
};

const VERDICT_SUMMARY_SCHEMA_LENIENT = z
  .object({
    answer: z.number().min(0).max(100).catch(50),
    confidence: z.number().min(0).max(100).catch(50),
    shortAnswer: z.string().catch(""),
    nuancedAnswer: z.string().catch(""),
    keyFactors: z.array(KEY_FACTOR_SCHEMA_LENIENT).catch([]),
    calibrationNote: z.string().catch(""),
  })
  .catch(DEFAULT_VERDICT_SUMMARY_LENIENT);

const DEFAULT_CONTEXT_ANSWER_LENIENT = {
  contextId: "",
  contextName: "",
  answer: 50,
  confidence: 50,
  shortAnswer: "",
  keyFactors: [] as KeyFactor[],
};

const CONTEXT_ANSWER_SCHEMA_LENIENT = z
  .object({
    contextId: z.string().catch(""),
    contextName: z.string().catch(""),
    answer: z.number().min(0).max(100).catch(50),
    confidence: z.number().min(0).max(100).catch(50),
    shortAnswer: z.string().catch(""),
    keyFactors: z.array(KEY_FACTOR_SCHEMA_LENIENT).catch([]),
  })
  .catch(DEFAULT_CONTEXT_ANSWER_LENIENT);

const DEFAULT_CLAIM_VERDICT_MULTI_CONTEXT_LENIENT = {
  claimId: "",
  verdict: 50,
  confidence: 50,
  riskTier: "B" as const,
  reasoning: "",
  supportingEvidenceIds: [] as string[],
  contextId: "",
  ratingConfirmation: "mixed" as const,
};

const CLAIM_VERDICT_SCHEMA_MULTI_CONTEXT_LENIENT = z
  .object({
    claimId: z.string().catch(""),
    verdict: z.number().min(0).max(100).catch(50),
    confidence: z.number().min(0).max(100).catch(50),
    riskTier: z.enum(["A", "B", "C"]).catch("B"),
    reasoning: z.string().catch(""),
    // v2.8.4: Rating direction confirmation with fallback
    ratingConfirmation: z.enum(["claim_supported", "claim_refuted", "mixed"]).catch("mixed"),
    supportingEvidenceIds: z.array(z.string()).catch([]),
    contextId: z.string().catch(""),
    evidenceQuality: EVIDENCE_QUALITY_SCHEMA_LENIENT.optional(),
  })
  .catch(DEFAULT_CLAIM_VERDICT_MULTI_CONTEXT_LENIENT);

const VERDICTS_SCHEMA_MULTI_CONTEXT_LENIENT = z
  .object({
    verdictSummary: VERDICT_SUMMARY_SCHEMA_LENIENT,
    analysisContextAnswers: z.array(CONTEXT_ANSWER_SCHEMA_LENIENT).catch([]),
    analysisContextSummary: z.string().catch(""),
    claimVerdicts: z.array(CLAIM_VERDICT_SCHEMA_MULTI_CONTEXT_LENIENT).catch([]),
  })
  .catch({
    verdictSummary: DEFAULT_VERDICT_SUMMARY_LENIENT,
    analysisContextAnswers: [],
    analysisContextSummary: "",
    claimVerdicts: [],
  });

const VERDICTS_SCHEMA_SIMPLE = z.object({
  verdictSummary: z.object({
    answer: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
  }),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingEvidenceIds: z.array(z.string()).optional(),
      // v2.8.4: Explicit rating direction confirmation
      ratingConfirmation: z.enum(["claim_supported", "claim_refuted", "mixed"]),
      evidenceQuality: EVIDENCE_QUALITY_SCHEMA.optional(),
    }),
  ),
});

const VERDICTS_SCHEMA_SIMPLE_ANTHROPIC = z.object({
  verdictSummary: z.object({
    answer: z.number(),
    confidence: z.number(),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
  }),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number(),
      confidence: z.number(),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingEvidenceIds: z.array(z.string()).optional(),
      ratingConfirmation: z.enum(["claim_supported", "claim_refuted", "mixed"]),
      evidenceQuality: EVIDENCE_QUALITY_SCHEMA_ANTHROPIC.optional(),
    }),
  ),
});

const VERDICTS_SCHEMA_CLAIM = z.object({
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingEvidenceIds: z.array(z.string()).optional(),
      // v2.8.4: Explicit rating direction confirmation
      ratingConfirmation: z.enum(["claim_supported", "claim_refuted", "mixed"]),
      // Contestation fields
      isContested: z.boolean(),
      contestedBy: z.string(), // empty string if not contested
      factualBasis: z.enum(["established", "disputed", "opinion", "unknown"]),
      evidenceQuality: EVIDENCE_QUALITY_SCHEMA.optional(),
    }),
  ),
  articleAnalysis: z.object({
    thesisSupported: z.boolean(),
    logicalFallacies: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        affectedClaims: z.array(z.string()),
      }),
    ),
    articleVerdict: z.number().min(0).max(100),
    articleConfidence: z.number().min(0).max(100),
    verdictDiffersFromClaimAverage: z.boolean(),
    verdictDifferenceReason: z.string(), // empty string if not applicable
  }),
});

const VERDICTS_SCHEMA_CLAIM_ANTHROPIC = z.object({
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number(),
      confidence: z.number(),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingEvidenceIds: z.array(z.string()).optional(),
      ratingConfirmation: z.enum(["claim_supported", "claim_refuted", "mixed"]),
      isContested: z.boolean(),
      contestedBy: z.string(),
      factualBasis: z.enum(["established", "disputed", "opinion", "unknown"]),
      evidenceQuality: EVIDENCE_QUALITY_SCHEMA_ANTHROPIC.optional(),
    }),
  ),
  articleAnalysis: z.object({
    thesisSupported: z.boolean(),
    logicalFallacies: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        affectedClaims: z.array(z.string()),
      }),
    ),
    articleVerdict: z.number(),
    articleConfidence: z.number(),
    verdictDiffersFromClaimAverage: z.boolean(),
    verdictDifferenceReason: z.string(),
  }),
});

async function generateVerdicts(
  state: ResearchState,
  model: any,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  verdictSummary?: VerdictSummary;
}> {
  const understanding = state.understanding!;
  const inputIsClaim = isClaimInput(understanding);
  const hasMultipleContexts =
    understanding.requiresSeparateAnalysis &&
    understanding.analysisContexts.length > 1;

  // PR-F: Exclude CTX_UNASSIGNED claims from verdict calculations (fixes Blocker F)
  // Only include direct claims that are NOT unassigned (unassigned is display-only)
  const directClaimsForVerdicts = (understanding.subClaims || []).filter(
    (c: any) =>
      (!c?.thesisRelevance || c.thesisRelevance === "direct") &&
      c?.contextId !== UNASSIGNED_CONTEXT_ID
  );
  const claimsForVerdicts = expandClaimsForVerdicts(
    understanding,
    directClaimsForVerdicts,
  );

  // PR-F: Exclude CTX_UNASSIGNED evidence items from verdict calculations (fixes Blocker F)
  // UNASSIGNED evidence items are display-only and should NOT affect overall verdict
  const evidenceItemsForVerdicts = state.evidenceItems.filter(
    (f: EvidenceItem) => f.contextId !== UNASSIGNED_CONTEXT_ID
  );

  const evidenceItemsFormatted = evidenceItemsForVerdicts
    .map((f: EvidenceItem) => {
      let evidenceLine = `[${f.id}]`;
      if (f.contextId) evidenceLine += ` (${f.contextId})`;
      // v2.6.31: Add direction labels so LLM knows which evidence items support vs contradict the claim
      if (f.claimDirection === "contradicts") {
        evidenceLine += ` [COUNTER-EVIDENCE]`;
      } else if (f.claimDirection === "supports") {
        evidenceLine += ` [SUPPORTING]`;
      } else if (f.fromOppositeClaimSearch) {
        // Provenance metadata (not evidence direction)
        evidenceLine += ` [OPPOSITE-SEARCH]`;
      }
      if (f.isContestedClaim)
        evidenceLine += ` [CONTESTED by ${f.claimSource || "critics"}]`;
      evidenceLine += ` ${f.statement} (Source: ${f.sourceTitle})`;
      return evidenceLine;
    })
    .join("\n");

  const claimsFormatted = claimsForVerdicts
    .map(
      (c: any) =>
        `${c.id}${c.contextId ? ` (${c.contextId})` : ""}: "${c.text}" [${c.isCentral ? "CENTRAL" : "Supporting"}]`,
    )
    .join("\n");

  if (inputIsClaim && hasMultipleContexts) {
    const result = await generateMultiContextVerdicts(
      state,
      understanding,
      evidenceItemsFormatted,
      claimsFormatted,
      model,
      understanding.detectedInputType,
    );
    return result;
  } else if (inputIsClaim) {
    const result = await generateSingleContextVerdicts(
      state,
      understanding,
      evidenceItemsFormatted,
      claimsFormatted,
      model,
      understanding.detectedInputType,
    );
    return result;
  } else {
    const result = await generateClaimVerdicts(
      state,
      understanding,
      evidenceItemsFormatted,
      claimsFormatted,
      model,
    );
    return result;
  }
}

async function generateMultiContextVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  evidenceItemsFormatted: string,
  claimsFormatted: string,
  model: any,
  analysisInputType: InputType,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  verdictSummary: VerdictSummary;
}> {
  // Phase 2a: Create local evidence normalizer instance
  const evidenceNormalizer = new EvidenceNormalizer(state.fallbackTracker);

  const contextsFormatted = understanding.analysisContexts
    .map(
      (s: AnalysisContext) =>
        `- **${s.id}**: ${s.name}
  Institution: ${s.metadata?.institution || s.metadata?.court || s.metadata?.regulatoryBody || "N/A"} | Date: ${s.temporal || s.date || "N/A"} | Status: ${s.status}
  Subject: ${s.subject}
  **assessedStatement**: ${s.assessedStatement || "(assess the user's claim in this context)"}`,
    )
    .join("\n\n");

  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const analysisInput = resolveAnalysisPromptInput(understanding, state);
  const displayText =
    understanding.originalInputDisplay ||
    understanding.mainThesis ||
    analysisInput;
  // PR-F: Exclude CTX_UNASSIGNED claims from verdict calculations (fixes Blocker F)
  // Only include direct claims that are NOT unassigned (unassigned is display-only)
  const directClaimsForVerdicts = (understanding.subClaims || []).filter(
    (c: any) =>
      (!c?.thesisRelevance || c.thesisRelevance === "direct") &&
      c?.contextId !== UNASSIGNED_CONTEXT_ID
  );
  const claimsForVerdicts = expandClaimsForVerdicts(
    understanding,
    directClaimsForVerdicts,
  );
  // v2.6.21: Use neutral label to ensure phrasing-neutral verdicts
  const inputLabel = "STATEMENT";
  const allowModelKnowledgePrompt = await getKnowledgeInstruction(
    state.pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
    state.originalInput,
    understanding,
    state.pipelineConfig?.recencyCueTerms,
    state.pipelineConfig,
  );
  const renderedVerdictSystem = await loadAndRenderSection("orchestrated", "VERDICT", {
    inputLabel,
    currentDateReadable,
    currentDate: currentDateStr,
    analysisInput,
    contextsFormatted,
    allowModelKnowledge: allowModelKnowledgePrompt,
  });
  const renderedVerdictBrevity = await loadAndRenderSection("orchestrated", "VERDICT_BREVITY_RULES", {});
  const renderedVerdictUser = await loadAndRenderSection("orchestrated", "VERDICT_USER", {
    inputLabel,
    analysisInput,
    contextsFormatted,
    claimsFormatted,
    evidenceItemsFormatted,
  });
  const renderedVerdictCompactRetry = await loadAndRenderSection(
    "orchestrated",
    "VERDICT_EXTREME_COMPACT_RETRY_APPEND",
    {},
  );
  const renderedJsonOnlyAppend = await loadAndRenderSection("orchestrated", "JSON_ONLY_USER_APPEND", {});
  if (
    !renderedVerdictSystem?.content?.trim() ||
    !renderedVerdictBrevity?.content?.trim() ||
    !renderedVerdictUser?.content?.trim() ||
    !renderedVerdictCompactRetry?.content?.trim() ||
    !renderedJsonOnlyAppend?.content?.trim()
  ) {
    throw new Error("Missing VERDICT prompt sections in orchestrated prompt profile");
  }

  const providerPromptHint = await getProviderPromptHint(state.pipelineConfig?.llmProvider);
  const systemPrompt = `${renderedVerdictSystem.content}\n${providerPromptHint}\n${renderedVerdictBrevity.content}`;
  const userPrompt = renderedVerdictUser.content;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_MULTI_CONTEXT> | null = null;
  let llmProviderIssue: LlmProviderIssue | null = null;
  let lastTruncatedText: string | null = null; // Captured from failed attempts for partial recovery
  const multiContextOutputSchema: z.ZodTypeAny = isAnthropicProvider(state.pipelineConfig?.llmProvider)
    ? VERDICTS_SCHEMA_MULTI_CONTEXT_ANTHROPIC
    : VERDICTS_SCHEMA_MULTI_CONTEXT;

  // Retry once in "extreme compact" mode to reduce the chance of truncated JSON output.
  // This is especially important when many evidence items/claims exist (deep mode).
  const attempts: Array<{ label: string; extraSystem: string }> = [
    { label: "primary", extraSystem: "" },
    {
      label: "retry-compact",
      extraSystem: `\n\n${renderedVerdictCompactRetry.content}`,
    },
  ];

  const normalizeMultiContextOutput = (obj: any, evidenceNormalizer: EvidenceNormalizer) => {
    if (!obj || typeof obj !== "object") return obj;

    // CRITICAL FIX: Unwrap $PARAMETER_NAME wrapper that some LLM providers add
    // The LLM sometimes returns {"$PARAMETER_NAME": {actual data}} instead of {actual data}
    let result = obj;
    if (result.$PARAMETER_NAME && typeof result.$PARAMETER_NAME === 'object') {
      console.log("[normalizeMultiContextOutput] Unwrapping $PARAMETER_NAME wrapper");
      result = result.$PARAMETER_NAME;
    }

    // Also check for other common wrapper patterns
    const wrapperKeys = ['$PARAMETER_NAME', 'data', 'result', 'output', 'response'];
    for (const key of wrapperKeys) {
      if (result[key] && typeof result[key] === 'object' &&
          (result[key].verdictSummary || result[key].analysisContextAnswers || result[key].claimVerdicts)) {
        console.log(`[normalizeMultiContextOutput] Unwrapping ${key} wrapper`);
        result = result[key];
        break;
      }
    }

    // CRITICAL FIX: Coerce string values to numbers (LLM sometimes returns "65" instead of 65)
    const coerceToNumber = (val: any): number | any => {
      if (typeof val === 'string') {
        const parsed = parseFloat(val.replace('%', '').trim());
        return Number.isFinite(parsed) ? parsed : val;
      }
      return val;
    };

    // Coerce verdictSummary numeric fields
    if (result.verdictSummary) {
      result.verdictSummary = {
        ...result.verdictSummary,
        answer: coerceToNumber(result.verdictSummary.answer),
        confidence: coerceToNumber(result.verdictSummary.confidence),
      };
    }

    // Coerce analysisContextAnswers numeric fields
    if (Array.isArray(result.analysisContextAnswers)) {
      result.analysisContextAnswers = result.analysisContextAnswers.map((pa: any) => ({
        ...pa,
        answer: coerceToNumber(pa.answer),
        confidence: coerceToNumber(pa.confidence),
      }));
    }

    // Coerce claimVerdicts numeric fields
    if (Array.isArray(result.claimVerdicts)) {
      result.claimVerdicts = result.claimVerdicts.map((cv: any) => ({
        ...cv,
        verdict: coerceToNumber(cv.verdict),
        confidence: coerceToNumber(cv.confidence),
        supportingEvidenceIds: normalizeSupportingEvidenceIds(cv, "normalizeMultiContextOutput", evidenceNormalizer),
      }));
    }

    return result;
  };

  const recoverFromNoObjectGeneratedError = (
    err: any,
    attemptLabel: string,
  ): z.infer<typeof VERDICTS_SCHEMA_MULTI_CONTEXT> | null => {
    if (!NoObjectGeneratedError.isInstance(err)) return null;

    const cause = (err as any)?.cause as any;
    const candidates: string[] = [];
    if (typeof err.text === "string" && err.text.trim()) candidates.push(err.text);
    if (typeof cause?.stack === "string" && cause.stack.trim())
      candidates.push(cause.stack);
    if (typeof cause?.message === "string" && cause.message.trim())
      candidates.push(cause.message);

    for (const c of candidates) {
      const obj = normalizeMultiContextOutput(tryParseFirstJsonObject(c), evidenceNormalizer);
      if (!obj) continue;

      // Try strict first; if it still fails, accept a leniently-normalized version.
      const strict = VERDICTS_SCHEMA_MULTI_CONTEXT.safeParse(obj);
      if (strict.success) {
        debugLog("generateMultiContextVerdicts: RECOVERED strict object from NoObjectGeneratedError", {
          attempt: attemptLabel,
          finishReason: err.finishReason,
          hadText: !!err.text,
        });
        return strict.data;
      }

      const lenient = VERDICTS_SCHEMA_MULTI_CONTEXT_LENIENT.safeParse(obj);
      if (lenient.success) {
        debugLog("generateMultiContextVerdicts: RECOVERED lenient object from NoObjectGeneratedError", {
          attempt: attemptLabel,
          finishReason: err.finishReason,
          hadText: !!err.text,
        });
        return lenient.data as any;
      }

      debugLog("generateMultiContextVerdicts: Recovered JSON but schema parse failed", {
        attempt: attemptLabel,
        finishReason: err.finishReason,
        strictIssues: strict.success ? [] : strict.error.issues?.slice(0, 10),
        lenientIssues: lenient.success ? [] : lenient.error.issues?.slice(0, 10),
      });
    }

    return null;
  };

  const tryJsonTextFallback = async (): Promise<
    z.infer<typeof VERDICTS_SCHEMA_MULTI_CONTEXT> | null
  > => {
    debugLog("generateMultiContextVerdicts: FALLBACK JSON TEXT ATTEMPT");
    const renderedJsonAppend = await loadAndRenderSection("orchestrated", "VERDICT_JSON_ONLY_APPEND", {});
    if (!renderedJsonAppend?.content?.trim()) {
      throw new Error("Missing VERDICT_JSON_ONLY_APPEND prompt section in orchestrated prompt profile");
    }
    const system = `${systemPrompt}\n${renderedJsonAppend.content}`;

    try {
      const result: any = await generateText({
        model,
        messages: [
          { role: "system", content: system, providerOptions: getPromptCachingOptions(state.pipelineConfig?.llmProvider) },
          { role: "user", content: `${userPrompt}\n\n${renderedJsonOnlyAppend.content}` },
        ],
        temperature: getDeterministicTemperature(0.3, state.pipelineConfig),
        maxOutputTokens: 16384,
      });
      state.llmCalls++;
      recordLLMCall(state.budgetTracker, (result as any).usage?.totalTokens || (result as any).totalUsage?.totalTokens || 0);

      const txt = result?.text as string | undefined;
      if (!txt || typeof txt !== "string") {
        debugLog("generateMultiContextVerdicts: JSON fallback missing text", {
          resultKeys: result ? Object.keys(result) : [],
        });
        return null;
      }

      const obj = normalizeMultiContextOutput(tryParseFirstJsonObject(txt), evidenceNormalizer);
      if (!obj) {
        debugLog("generateMultiContextVerdicts: JSON fallback could not find JSON object", {
          textSnippet: txt.slice(0, 800),
        });
        return null;
      }

      const strict = VERDICTS_SCHEMA_MULTI_CONTEXT.safeParse(obj);
      if (strict.success) return strict.data;

      const lenient = VERDICTS_SCHEMA_MULTI_CONTEXT_LENIENT.safeParse(obj);
      if (lenient.success) return lenient.data as any;

      debugLog("generateMultiContextVerdicts: JSON fallback safeParse failed", {
        strictIssues: strict.error.issues?.slice(0, 10),
        lenientIssues: lenient.error.issues?.slice(0, 10),
      });
      return null;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      debugLog("generateMultiContextVerdicts: JSON fallback ERROR", {
        error: errMsg,
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 8).join("\n") : undefined,
      });
      state.llmCalls++;
      return null;
    }
  };

  for (const attempt of attempts) {
    if (
      Array.isArray(parsed?.analysisContextAnswers) &&
      parsed.analysisContextAnswers.length > 0
    )
      break;

    try {
      const result = await generateText({
        model,
        messages: [
          { role: "system", content: systemPrompt + attempt.extraSystem, providerOptions: getPromptCachingOptions(state.pipelineConfig?.llmProvider) },
          { role: "user", content: userPrompt },
        ],
        temperature: getDeterministicTemperature(0.3, state.pipelineConfig),
        // Explicit maxOutputTokens: 16384 covers analyses up to ~40 claims / ~10 contexts.
        // Token estimate: claimCount * 350 + contextCount * 600 + 1500 overhead.
        // For 25 claims + 8 contexts: ~14,300 tokens needed.
        maxOutputTokens: 16384,
        output: Output.object({ schema: multiContextOutputSchema }),
        providerOptions: getStructuredOutputProviderOptions(state.pipelineConfig?.llmProvider ?? "anthropic"),
      });
      state.llmCalls++;
      recordLLMCall(state.budgetTracker, (result as any).usage?.totalTokens || (result as any).totalUsage?.totalTokens || 0);

      // Handle different AI SDK versions - safely extract structured output
      const rawOutput = extractStructuredOutput(result);
      if (rawOutput) {
        parsed = normalizeMultiContextOutput(rawOutput, evidenceNormalizer) as z.infer<typeof VERDICTS_SCHEMA_MULTI_CONTEXT>;
        debugLog("generateMultiContextVerdicts: SUCCESS", {
          attempt: attempt.label,
          hasVerdictSummary: !!parsed.verdictSummary,
          analysisContextAnswersCount: parsed.analysisContextAnswers?.length,
          claimVerdictsCount: parsed.claimVerdicts?.length,
        });
      } else {
        debugLog("generateMultiContextVerdicts: No rawOutput returned", {
          attempt: attempt.label,
          resultKeys: result ? Object.keys(result) : [],
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isNoObj = NoObjectGeneratedError.isInstance(err);
      const isNoOutput = typeof NoOutputGeneratedError !== "undefined" && NoOutputGeneratedError.isInstance?.(err);
      debugLog("generateMultiContextVerdicts: ERROR", {
        attempt: attempt.label,
        error: errMsg,
        name: err instanceof Error ? err.name : typeof err,
        errorType: isNoOutput ? "NoOutputGeneratedError" : isNoObj ? "NoObjectGeneratedError" : "other",
        finishReason: (isNoObj || isNoOutput) ? (err as any).finishReason : undefined,
        hasText: isNoObj ? !!(err as any).text : undefined,
        textSnippet: isNoObj ? String((err as any).text || "").slice(0, 1200) : undefined,
        cause: (err as any)?.cause
          ? {
              name: String((err as any).cause?.name || ""),
              message: String((err as any).cause?.message || "").slice(0, 800),
            }
          : undefined,
        stack:
          err instanceof Error
            ? err.stack?.split("\n").slice(0, 8).join("\n")
            : undefined,
      });

      // Check for OpenAI schema validation errors
      if (errMsg.includes("Invalid schema") || errMsg.includes("required")) {
        debugLog("âŒ OpenAI SCHEMA VALIDATION ERROR in VERDICTS_SCHEMA_MULTI_CONTEXT");
      }
      if (errMsg.includes("output_format.schema") && errMsg.includes("maximum, minimum")) {
        debugLog("âŒ Anthropic schema constraint error (numeric bounds unsupported)");
      }
      const providerIssue = classifyLlmProviderIssue(errMsg);
      if (providerIssue && !llmProviderIssue) {
        llmProviderIssue = providerIssue;
      }
      state.llmCalls++;

      // Capture truncated text for partial recovery attempt later
      if (isNoObj && typeof (err as any).text === "string" && (err as any).text.length > 100) {
        lastTruncatedText = (err as any).text;
      }

      // Attempt recovery from the SDK error payload (often contains the raw JSON/text).
      const recovered = recoverFromNoObjectGeneratedError(err, attempt.label);
      if (
        recovered &&
        Array.isArray(recovered.analysisContextAnswers) &&
        recovered.analysisContextAnswers.length > 0
      ) {
        parsed = recovered;
      }
    }
  }

  // If structured output failed, try a last-ditch "JSON text" call and parse ourselves.
  if (
    !parsed ||
    !Array.isArray(parsed.analysisContextAnswers) ||
    parsed.analysisContextAnswers.length === 0
  ) {
    const fallbackParsed = await tryJsonTextFallback();
    if (
      fallbackParsed &&
      Array.isArray(fallbackParsed.analysisContextAnswers) &&
      fallbackParsed.analysisContextAnswers.length > 0
    ) {
      parsed = fallbackParsed;
      debugLog("generateMultiContextVerdicts: JSON text fallback SUCCESS", {
        analysisContextAnswersCount: parsed.analysisContextAnswers?.length,
        claimVerdictsCount: parsed.claimVerdicts?.length,
      });
    }
  }

  // Partial JSON recovery: if we have truncated text from a failed attempt,
  // try to repair it and recover whatever claim verdicts parsed before truncation.
  // This avoids blanket 50/50 fallback when most of the output was actually valid.
  if (
    (!parsed || !Array.isArray(parsed.analysisContextAnswers) || parsed.analysisContextAnswers.length === 0) &&
    lastTruncatedText
  ) {
    const repairedObj = repairTruncatedJson(lastTruncatedText);
    if (repairedObj) {
      const normalized = normalizeMultiContextOutput(repairedObj, evidenceNormalizer);
      const lenient = VERDICTS_SCHEMA_MULTI_CONTEXT_LENIENT.safeParse(normalized);
      if (lenient.success && Array.isArray(lenient.data.analysisContextAnswers) && lenient.data.analysisContextAnswers.length > 0) {
        parsed = lenient.data as any;
        const recoveredClaimCount = parsed?.claimVerdicts?.length || 0;
        const totalClaims = claimsForVerdicts.length;
        debugLog("generateMultiContextVerdicts: PARTIAL RECOVERY from truncated JSON", {
          recoveredClaims: recoveredClaimCount,
          totalClaims,
          recoveredContexts: parsed?.analysisContextAnswers?.length,
          hasVerdictSummary: !!parsed?.verdictSummary,
        });
        state.analysisWarnings.push({
          type: "verdict_partial_recovery",
          severity: "warning",
          message: `Recovered ${recoveredClaimCount}/${totalClaims} claim verdicts from truncated LLM output. Remaining claims received fallback verdicts.`,
          details: { recoveredClaims: recoveredClaimCount, totalClaims },
        });
      }
    }
  }

  // Fallback if structured output failed
  if (
    !parsed ||
    !Array.isArray(parsed.analysisContextAnswers) ||
    parsed.analysisContextAnswers.length === 0
  ) {
    debugLog("generateMultiContextVerdicts: Using FALLBACK (parsed failed)", {
      hasParsed: !!parsed,
      hasAnalysisContextAnswers: !!parsed?.analysisContextAnswers,
    });

    const fallbackVerdicts: ClaimVerdict[] = claimsForVerdicts.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: llmProviderIssue
          ? "Unable to generate verdict due to LLM provider failure."
          : "Unable to generate verdict due to structured-output failure. Manual review recommended.",
        supportingEvidenceIds: [],
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        thesisRelevanceConfidence:
          typeof claim.thesisRelevanceConfidence === "number"
            ? claim.thesisRelevanceConfidence
            : 100,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const verdictSummary: VerdictSummary = {
      displayText: displayText,
      answer: 50,
      confidence: 50,
      truthPercentage: 50,
      shortAnswer: "Unable to determine - analysis failed",
      nuancedAnswer: llmProviderIssue
        ? `Verdict generation failed because the LLM provider was unavailable: ${llmProviderIssue.message}`
        : "Verdict generation failed due to a structured-output error (schema/provider mismatch or malformed JSON). Manual review recommended.",
      keyFactors: [],
      hasMultipleContexts: true,
      analysisContextAnswers: understanding.analysisContexts.map(
        (p: AnalysisContext) => ({
          contextId: p.id,
          contextName: p.name,
          answer: 50,
          truthPercentage: 50,
          confidence: 50,
          shortAnswer: "Analysis failed",
          keyFactors: [],
        }),
      ),
    };

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE,
    ).length;
    const articleAnalysis: ArticleAnalysis = {
      inputType: analysisInputType,
      verdictSummary,
      hasMultipleContexts: true,
      analysisContexts: understanding.analysisContexts,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    if (llmProviderIssue) {
      state.analysisWarnings.push({
        type: "llm_provider_error",
        severity: "error",
        message: `Multi-context verdict generation failed: ${llmProviderIssue.message}`,
        details: {
          issueKind: llmProviderIssue.kind,
          remediationHints: [llmProviderIssue.hint],
          fallbackClaimCount: fallbackVerdicts.length,
        },
      });
    } else {
      // P1: Track structured output failure
      state.analysisWarnings.push({
        type: "structured_output_failure",
        severity: "error",
        message: "Multi-context verdict generation failed due to structured output error. Using fallback verdicts (50% uncertain).",
        details: {
          fallbackClaimCount: fallbackVerdicts.length,
        },
      });
    }

    return { claimVerdicts: fallbackVerdicts, articleAnalysis, verdictSummary };
  }

  // Normal flow with parsed output

  // FIX v2.4.3: Calculate factorAnalysis from ACTUAL keyFactors array
  // v2.5.0: Calibrate to 7-point scale
  // v2.5.1: Contested factors without evidence don't reduce rating
  // v2.6.31: Inversion detection for context answers must reference the substantive claim being evaluated
  // (the normalized analysis input), not the context name/id.
  const contextVerdictClaimText = resolveAnalysisPromptInput(understanding, state);
  let correctedAnalysisContextAnswers = parsed.analysisContextAnswers.map((pa: any) => {
    const factors = (pa.keyFactors || []) as KeyFactor[];
    const ctxMeta = understanding.analysisContexts.find(
      (p: any) => p.id === pa.contextId,
    );
    const ctxStatus = (ctxMeta?.status || "unknown") as string;

    // Calculate from actual factors - NOT from LLM-reported numbers
    const positiveFactors = factors.filter((f) => f.supports === "yes").length;
    const negativeFactors = factors.filter((f) => f.supports === "no").length;
    const neutralFactors = factors.filter(
      (f) => f.supports === "neutral",
    ).length;

    // v2.5.1: Count negative factors that are contested without evidence
    // Only count "no" factors with established factualBasis as true negatives
    const evidencedNegatives = factors.filter(
      (f) => f.supports === "no" && f.factualBasis === "established",
    ).length;
    // v2.6.40+: Treat "contested negatives" as negatives disputed WITHOUT established counter-evidence.
    // If factualBasis is "established", the negative should NOT be discounted just because it's labeled contested.
    const contestedNegatives = factors.filter(
      (f) => f.supports === "no" && f.isContested && f.factualBasis !== "established",
    ).length;
    // Contested neutrals (opinions without evidence) should not count negatively
    const contestedNeutrals = factors.filter(
      (f) => f.supports === "neutral" && f.isContested,
    ).length;

    // Debug: Log factor details for this context
    debugLog(`Factor analysis for context ${pa.contextId}`, {
      answerTruthPct: pa.answer,
      factorCounts: {
        positive: positiveFactors,
        negative: negativeFactors,
        neutral: neutralFactors,
        evidencedNegatives,
        contestedNegatives,
        contestedNeutrals,
      },
      factors: factors.map((f) => ({
        factor: f.factor?.substring(0, 50),
        supports: f.supports,
        isContested: f.isContested,
        factualBasis: f.factualBasis,
      })),
    });

    const factorAnalysis: FactorAnalysis = {
      positiveFactors,
      negativeFactors,
      neutralFactors,
      contestedNegatives,
      verdictExplanation: `${positiveFactors} positive, ${negativeFactors} negative (${evidencedNegatives} evidenced, ${contestedNegatives} contested), ${neutralFactors} neutral (${contestedNeutrals} disputed)`,
    };

    // Apply calibration correction based on factors
    let answerTruthPct = normalizePercentage(pa.answer);
    let correctedConfidence = normalizePercentage(pa.confidence);

    // v2.6.31: Apply inversion detection to context-level answers
    // Check shortAnswer for negation patterns - the LLM often correctly identifies
    // something is NOT fair/proportionate but still rates it high
    const contextInversion = detectAndCorrectVerdictInversion(
      contextVerdictClaimText,
      pa.shortAnswer || "",
      answerTruthPct
    );
    if (contextInversion.wasInverted) {
      answerTruthPct = contextInversion.correctedPct;
      debugLog("Context answer inversion detected", {
        contextId: pa.contextId,
        originalPct: normalizePercentage(pa.answer),
        correctedPct: answerTruthPct,
        shortAnswer: (pa.shortAnswer || "").slice(0, 100),
      });
    }

    // v2.5.1: Only evidenced negatives count at full weight
    // Negatives without established evidence (opinion/unknown) do NOT reduce verdict
    const effectiveNegatives = evidencedNegatives;

    // v2.6.20: Removed factor-based boost to ensure input neutrality
    // The boost was causing inconsistent verdicts for identical inputs
    // Verdicts are now purely claim-based for transparency and consistency
    debugLog(`Context ${pa.contextId}: No factor-based boost applied`, {
      answerTruthPct,
          positiveFactors,
          evidencedNegatives,
      contestedNegatives,
        });

    if (answerTruthPct < VERDICT_BANDS.MIXED && positiveFactors > effectiveNegatives) {
      correctedConfidence = Math.min(correctedConfidence, VERDICT_BANDS.MOSTLY_TRUE);
      answerTruthPct = truthFromBand("partial", correctedConfidence);
      factorAnalysis.verdictExplanation = `Corrected from <${VERDICT_BANDS.MIXED}: ${positiveFactors} positive > ${effectiveNegatives.toFixed(1)} effective negative`;
    } else if (
      answerTruthPct < VERDICT_BANDS.MIXED &&
      contestedNegatives > 0 &&
      contestedNegatives === negativeFactors
    ) {
      // Cap below MOSTLY_TRUE band: margin keeps contested-corrected results in LEANING_TRUE range
      const contestedCapMargin = Math.max(1, Math.round((VERDICT_BANDS.MOSTLY_TRUE - VERDICT_BANDS.LEANING_TRUE) * 0.3));
      correctedConfidence = Math.min(correctedConfidence, VERDICT_BANDS.MOSTLY_TRUE - contestedCapMargin);
      answerTruthPct = truthFromBand("partial", correctedConfidence);
      factorAnalysis.verdictExplanation = `Corrected: All ${negativeFactors} factors are contested`;
    }

    // Validate truth percentage is in valid range
    const validatedTruthPct = assertValidTruthPercentage(answerTruthPct, "single-context verdict");
    return {
      ...pa,
      answer: validatedTruthPct,
      confidence: correctedConfidence,
      truthPercentage: validatedTruthPct,
      shortAnswer: sanitizeContextShortAnswer(String(pa.shortAnswer || ""), ctxStatus),
      factorAnalysis,
    } as AnalysisContextAnswer;
  });


  // Context verdicts
  // When multiple distinct contexts exist, the average is shown but UI should emphasize individual context verdicts
  // The hasMultipleContexts flag indicates the average may not be meaningful
  const hasMultipleContexts = correctedAnalysisContextAnswers.length > 1;

  // v2.6.38: Context count warning (detect over-splitting)
  const CONTEXT_WARNING_THRESHOLD = 5;
  if (correctedAnalysisContextAnswers.length > CONTEXT_WARNING_THRESHOLD) {
    debugLog(`âš ï¸ High context count detected: ${correctedAnalysisContextAnswers.length} contexts may indicate over-splitting`);
  }

  // Calculate average for display (UI can choose to de-emphasize when hasMultipleContexts=true)
  let avgTruthPct = correctedAnalysisContextAnswers.length > 0
    ? Math.round(correctedAnalysisContextAnswers.reduce((sum, pa) => sum + pa.truthPercentage, 0) / correctedAnalysisContextAnswers.length)
    : 50;
  const avgConfidence = correctedAnalysisContextAnswers.length > 0
    ? Math.round(correctedAnalysisContextAnswers.reduce((sum, pa) => sum + pa.confidence, 0) / correctedAnalysisContextAnswers.length)
    : 50;

  // Calculate overall factorAnalysis
  const allFactors = correctedAnalysisContextAnswers.flatMap((pa) => pa.keyFactors);

  // Only flag contested negatives with evidence-based contestation
  const hasContestedFactors = allFactors.some(
    (f) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  // Build claim verdicts with 7-point calibration
  // v2.5.1: Apply correction based on context-level factor analysis

  // v2.6.19: Ensure ALL claims have verdicts - add missing ones
  const claimIdsWithVerdicts = new Set(parsed.claimVerdicts.map((cv: any) => cv.claimId));
  const missingClaims = directClaimsForVerdicts.filter(
    (claim: any) => !claimIdsWithVerdicts.has(claim.id)
  );

  if (missingClaims.length > 0) {
    debugLog(`generateMultiContextVerdicts: Missing verdicts for ${missingClaims.length} claims`, {
      missingClaimIds: missingClaims.map((c: any) => c.id),
      totalClaims: directClaimsForVerdicts.length,
      verdictsGenerated: parsed.claimVerdicts.length,
    });

    // Add fallback verdicts for missing claims
    for (const claim of missingClaims) {
      const ctxId = claim.contextId || "";
      const relatedContext = correctedAnalysisContextAnswers.find(
        (pa) => pa.contextId === ctxId
      );

      // Use context-level answer as fallback
      const fallbackConfidence = relatedContext?.confidence || 50;
      const fallbackVerdict = relatedContext
        ? (relatedContext.answer >= VERDICT_BANDS.MOSTLY_TRUE
          ? truthFromBand("strong", fallbackConfidence)
          : truthFromBand("uncertain", fallbackConfidence))
        : 50;

      // v2.6.31: Include all fields required by ClaimVerdict interface for weighted calculation
      // Cast to any since parsed.claimVerdicts has a narrower schema type; full ClaimVerdict fields are added here
      // and will be properly typed after the mapping step at line ~6180.
      (parsed.claimVerdicts as any[]).push({
        claimId: claim.id,
        claimText: claim.text || "",
        verdict: fallbackVerdict,
        confidence: fallbackConfidence,
        truthPercentage: fallbackVerdict,
        riskTier: "B",
        reasoning: `Fallback verdict based on context-level analysis (${relatedContext?.contextId || "unknown"}). Original verdict generation did not include this claim.`,
        supportingEvidenceIds: [],
        contextId: ctxId,
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        thesisRelevanceConfidence:
          typeof claim.thesisRelevanceConfidence === "number"
            ? claim.thesisRelevanceConfidence
            : 100,
        highlightColor: getHighlightColor7Point(fallbackVerdict),
      });

      debugLog(`Added fallback verdict for claim ${claim.id}`, {
        contextId: ctxId,
        verdict: fallbackVerdict,
        reason: "Missing from LLM output",
      });
    }
  }

  const claimVerdicts: ClaimVerdict[] = await Promise.all(parsed.claimVerdicts.map(async (cv: any) => {
    const claim = understanding.subClaims.find((c: any) => c.id === cv.claimId);
    const ctxId = cv.contextId || claim?.contextId || "";

    // Find the corrected context answer for this claim
    const relatedContext = correctedAnalysisContextAnswers.find(
      (pa) => pa.contextId === ctxId
    );

    // Sanitize temporal errors from reasoning
    const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

    // Calculate base truth percentage from LLM verdict
    let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);

    // v2.8.4: Use LLM-provided ratingConfirmation to validate verdict direction
    // Check for mismatch between ratingConfirmation and verdict
    const ratingConfirmation = (cv as any).ratingConfirmation;
    let inversionDetected = false;
    if (ratingConfirmation) {
      const expectedLow = ratingConfirmation === "claim_refuted";
      const expectedHigh = ratingConfirmation === "claim_supported";
      const actuallyHigh = truthPct >= VERDICT_BANDS.LEANING_TRUE;
      const actuallyLow = truthPct < VERDICT_BANDS.MIXED;

      // Mismatch: LLM says "refuted" but verdict is high, or "supported" but verdict is low
      if ((expectedLow && actuallyHigh) || (expectedHigh && actuallyLow)) {
        debugLog("ratingConfirmation MISMATCH detected", {
          ratingConfirmation,
          truthPct,
          expectedLow,
          expectedHigh,
          actuallyHigh,
          actuallyLow,
        });
        // Invert the verdict
        truthPct = 100 - truthPct;
        inversionDetected = true;
      }
    }

    // v2.6.31: Detect and correct inverted verdicts (regex fallback)
    // LLM sometimes rates "is my analysis correct" instead of "is the claim true"
    // Only run regex detection if LLM ratingConfirmation didn't already detect inversion
    const inversionCheck = !inversionDetected
      ? detectAndCorrectVerdictInversion(
          claim?.text || cv.claimId || "",
          sanitizedReasoning,
          truthPct
        )
      : { wasInverted: false, correctedPct: truthPct };
    if (inversionCheck.wasInverted) {
      truthPct = inversionCheck.correctedPct;
    }

    // v2.8.4: Use LLM-provided isCounterClaim from understand phase, fall back to regex detection
    // NOTE: supporting evidence IDs may include refuting evidence; counter-claim detection uses truth% as a guard.
    const supportingEvidenceIds =
      cv.supportingEvidenceIds && cv.supportingEvidenceIds.length > 0
        ? cv.supportingEvidenceIds
        : [];
    const claimFacts = state.evidenceItems.filter((f) => supportingEvidenceIds.includes(f.id));
    const isCounterClaim = claim?.isCounterClaim ?? await detectCounterClaim(
      claim?.text || cv.claimId || "",
      understanding.impliedClaim || understanding.articleThesis || "",
      truthPct,
      claimFacts,
      VERDICT_BANDS,
    );

    // v2.5.2: If the context has positive factors and no evidenced negatives,
    // boost claims below 72% into the >=72 band
    // v2.6.31: SKIP boost if verdict was inverted (reasoning contradicts claim)
    // v2.6.31: SKIP boost for counter-claims (they evaluate the opposite position)
    if (!inversionCheck.wasInverted && !isCounterClaim && relatedContext && relatedContext.factorAnalysis) {
      const fa = relatedContext.factorAnalysis;
      // Check if context has positive factors and no evidenced negatives
      const contextIsPositive = relatedContext?.answer >= VERDICT_BANDS.MOSTLY_TRUE;

      // If context is positive and claim is below threshold, boost it
      // This applies to claims below MOSTLY-TRUE or with mixed/uncertain evidence
      if (contextIsPositive && truthPct < VERDICT_BANDS.MOSTLY_TRUE) {
        const originalTruth = truthPct;
        truthPct = VERDICT_BANDS.MOSTLY_TRUE; // Minimum for MOSTLY-TRUE
        debugLog("claimVerdict: Corrected based on context factors", {
          claimId: cv.claimId,
          contextId: ctxId,
          from: originalTruth,
          to: truthPct,
          truthPctBefore: originalTruth,
          truthPctAfter: truthPct,
          reason: "Context is positive with no evidenced negatives",
        });
      }
    }

    // Derive 7-point verdict from percentage
    // Validate truth percentage is in valid range
    const clampedTruthPct = assertValidTruthPercentage(truthPct, "multi-context verdict");
    return {
      ...cv,
      verdict: clampedTruthPct,
      truthPercentage: clampedTruthPct,
      reasoning: sanitizedReasoning,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      centrality: claim?.centrality || "medium",
      harmPotential: claim?.harmPotential || "medium", // v2.7.0: Pass through for weighted aggregation
      thesisRelevance: claim?.thesisRelevance || "direct",
      supportingEvidenceIds,
      keyFactorId: claim?.keyFactorId || "", // Preserve KeyFactor mapping for aggregation
      contextId: ctxId,
      highlightColor: getHighlightColor7Point(clampedTruthPct),
      isCounterClaim,
    };
  }));

  const recencyMatters = new RecencyAssessor().isRecencySensitive(
    analysisInput,
    understanding,
    state.pipelineConfig?.recencyCueTerms,
  );
  const guardedMultiContextVerdicts = applyRecencyEvidenceGuard(claimVerdicts, {
    recencyMatters,
  });
  if (guardedMultiContextVerdicts.adjustedClaimIds.length > 0) {
    state.analysisWarnings.push({
      type: "recency_evidence_gap",
      severity: "warning",
      message:
        "Recency-sensitive claims without supporting evidence were capped to UNVERIFIED for temporal safety.",
      details: {
        adjustedClaimIds: guardedMultiContextVerdicts.adjustedClaimIds,
      },
    });
  }

  const weightedClaimVerdicts = applyEvidenceWeighting(
    guardedMultiContextVerdicts.verdicts,
    state.evidenceItems,
    state.sources,
  );

  // P0: Validate verdict direction against evidence direction (multi-context path, LLM-powered)
  const {
    validatedVerdicts: directionValidatedVerdicts,
    mismatches: verdictMismatches,
    warnings: verdictDirectionWarnings,
    degraded: directionValidationDegraded,
  } = await validateVerdictDirections(weightedClaimVerdicts, state.evidenceItems, {
    autoCorrect: true,
    minEvidenceCount: 2,
  });

  // Surface direction validation degradation warning
  if (directionValidationDegraded) {
    state.analysisWarnings.push({
      type: "direction_validation_degraded",
      severity: "warning",
      message: "Direction validation LLM failed; verdicts kept unchanged. Direction mismatch detection skipped.",
      details: { verdictCount: weightedClaimVerdicts.length },
    });
  }

  // Add any direction mismatch warnings to state
  if (verdictDirectionWarnings.length > 0) {
    state.analysisWarnings.push(...verdictDirectionWarnings);
    debugLog("Multi-context verdicts: Direction validation warnings", {
      count: verdictDirectionWarnings.length,
      mismatches: verdictMismatches.map((m) => ({
        claimId: m.claimId,
        original: m.verdictPct,
        corrected: m.correctedVerdictPct,
      })),
    });
  }

  // Use direction-validated verdicts for pattern calculation
  const finalVerdicts = directionValidatedVerdicts;

  const claimPattern = {
    total: finalVerdicts.length,
    supported: finalVerdicts.filter((v) => v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE)
      .length,
    uncertain: finalVerdicts.filter(
      (v) => v.truthPercentage >= VERDICT_BANDS.MIXED && v.truthPercentage < VERDICT_BANDS.MOSTLY_TRUE,
    ).length,
    refuted: finalVerdicts.filter((v) => v.truthPercentage < VERDICT_BANDS.MIXED).length,
    centralClaimsTotal: finalVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: finalVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE,
    ).length,
  };

  const calibrationNote = hasContestedFactors
    ? "Some factors are contested with documented evidence and receive reduced weight."
    : undefined;

  // Validate truth percentage is in valid range
  const clampedAvgTruthPct = assertValidTruthPercentage(avgTruthPct, "average across contexts");

  const summaryKeyFactors = parsed.verdictSummary?.keyFactors || [];
  const monitoredSummaryKeyFactors = monitorOpinionAccumulation(summaryKeyFactors, {
    maxOpinionCount: state.pipelineConfig?.maxOpinionFactors ?? DEFAULT_PIPELINE_CONFIG.maxOpinionFactors,
    warningThresholdPercent: state.pipelineConfig?.opinionAccumulationWarningThreshold ??
      DEFAULT_PIPELINE_CONFIG.opinionAccumulationWarningThreshold,
  });
  // v2.8.6: Prune opinion-only factors (no documented evidence)
  const prunedSummaryKeyFactors = pruneOpinionOnlyFactors(monitoredSummaryKeyFactors);

  const verdictSummary: VerdictSummary = {
    displayText: displayText,
    answer: clampedAvgTruthPct,
    confidence: avgConfidence,
    truthPercentage: clampedAvgTruthPct,
    shortAnswer: parsed.verdictSummary?.shortAnswer || "",
    nuancedAnswer: parsed.verdictSummary?.nuancedAnswer || "",
    keyFactors: prunedSummaryKeyFactors, // v2.8.6: Use pruned keyFactors
    hasMultipleContexts: hasMultipleContexts,
    analysisContextAnswers: correctedAnalysisContextAnswers,
    analysisContextSummary: parsed.analysisContextSummary,
    calibrationNote,
    hasContestedFactors,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality Ã— confidence)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(finalVerdicts, state.calcConfig.aggregation);

  // v2.9.0: Context-claims consistency anchoring (multi-context path)
  // When LLM context verdicts diverge significantly from evidence-based claims average,
  // anchor context verdicts toward claims to prevent holistic LLM bias.
  // Claims are more evidence-grounded (each backed by specific evidence items) while context
  // verdicts are the LLM's holistic assessment which can be biased by prompt framing.
  const contextClaimsAnchorDivergenceThreshold =
    state.pipelineConfig.contextClaimsAnchorDivergenceThreshold ??
    DEFAULT_PIPELINE_CONFIG.contextClaimsAnchorDivergenceThreshold ??
    15;
  const contextClaimsAnchorClaimsWeight =
    state.pipelineConfig.contextClaimsAnchorClaimsWeight ??
    DEFAULT_PIPELINE_CONFIG.contextClaimsAnchorClaimsWeight ??
    0.6;
  if (correctedAnalysisContextAnswers.length > 0 && finalVerdicts.length > 0) {
    let anchoringApplied = false;
    for (const ctxAnswer of correctedAnalysisContextAnswers) {
      const contextClaims = finalVerdicts.filter(v => v.contextId === ctxAnswer.contextId);
      if (contextClaims.length === 0) continue;
      const contextClaimsAvg = calculateWeightedVerdictAverage(contextClaims, state.calcConfig.aggregation);
      const anchorResult = anchorVerdictTowardClaims({
        verdictPct: ctxAnswer.truthPercentage,
        claimsAvgPct: contextClaimsAvg,
        divergenceThreshold: contextClaimsAnchorDivergenceThreshold,
        claimsWeight: contextClaimsAnchorClaimsWeight,
      });
      if (anchorResult.applied) {
        const original = ctxAnswer.truthPercentage;
        const anchored = anchorResult.anchoredPct;
        ctxAnswer.truthPercentage = anchored;
        ctxAnswer.answer = anchored;
        anchoringApplied = true;
        debugLog(`Context-claims anchoring applied`, {
          contextId: ctxAnswer.contextId,
          originalContextVerdict: original,
          contextClaimsAvg,
          anchoredVerdict: anchored,
          divergence: anchorResult.divergence,
          threshold: contextClaimsAnchorDivergenceThreshold,
          claimsWeight: contextClaimsAnchorClaimsWeight,
        });
      }
    }
    if (anchoringApplied) {
      avgTruthPct = Math.round(
        correctedAnalysisContextAnswers.reduce((sum, pa) => sum + pa.truthPercentage, 0) / correctedAnalysisContextAnswers.length
      );
      // Update verdictSummary to reflect anchored values
      const anchoredClamped = assertValidTruthPercentage(avgTruthPct, "anchored verdict summary");
      verdictSummary.answer = anchoredClamped;
      verdictSummary.truthPercentage = anchoredClamped;
      debugLog(`Context-claims anchoring: avgTruthPct updated to ${avgTruthPct}`);
    }
  }

  const articleAnalysis: ArticleAnalysis = {
    inputType: analysisInputType,
    verdictSummary,
    hasMultipleContexts: hasMultipleContexts,
    analysisContexts: understanding.analysisContexts, // v2.6.39: Contexts include assessedStatement from LLM
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    logicalFallacies: [],

    // Claims summary
    claimsAverageTruthPercentage: claimsAvgTruthPct,
    claimsAverageVerdict: claimsAvgTruthPct,

  // Article verdict (average shown, but UI should emphasize individual contexts when hasMultipleContexts=true)
    articleTruthPercentage: avgTruthPct,
    articleVerdict: avgTruthPct,
    articleVerdictReason: hasMultipleContexts ? "Average of distinct contexts - see individual verdicts" : undefined,
    // v2.6.38: Signal UI reliability - low when multiple distinct contexts (average may not be meaningful)
    articleVerdictReliability: hasMultipleContexts ? "low" : "high",

    claimPattern,
  };

  // v2.8.6: Prune tangential claims with no/low evidence (using direction-validated verdicts)
  const prunedClaimVerdicts = pruneTangentialBaselessClaims(finalVerdicts, {
    evidenceItems: state.evidenceItems,
    minEvidenceForTangential: state.pipelineConfig?.minEvidenceForTangential ??
      state.calcConfig.tangentialPruning?.minEvidenceForTangential ??
      DEFAULT_PIPELINE_CONFIG.minEvidenceForTangential,
    requireQualityEvidence: state.pipelineConfig?.tangentialEvidenceQualityCheckEnabled ??
      DEFAULT_PIPELINE_CONFIG.tangentialEvidenceQualityCheckEnabled,
  });
  console.log(`[Analyzer] MultiContext: Pruned ${finalVerdicts.length - prunedClaimVerdicts.length} tangential claims, ${monitoredSummaryKeyFactors.length - prunedSummaryKeyFactors.length} baseless factors`);

  return {
    claimVerdicts: prunedClaimVerdicts,
    articleAnalysis,
    verdictSummary,
  };
}

async function generateSingleContextVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  evidenceItemsFormatted: string,
  claimsFormatted: string,
  model: any,
  analysisInputType: InputType,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  verdictSummary: VerdictSummary;
}> {
  const evidenceNormalizer = new EvidenceNormalizer(state.fallbackTracker);
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const analysisInput = resolveAnalysisPromptInput(understanding, state);
  const displayText =
    understanding.originalInputDisplay ||
    understanding.mainThesis ||
    analysisInput;
  // PR-F: Exclude CTX_UNASSIGNED claims from verdict calculations (fixes Blocker F)
  // Only include direct claims that are NOT unassigned (unassigned is display-only)
  const directClaimsForVerdicts = (understanding.subClaims || []).filter(
    (c: any) =>
      (!c?.thesisRelevance || c.thesisRelevance === "direct") &&
      c?.contextId !== UNASSIGNED_CONTEXT_ID
  );
  const claimsForVerdicts = expandClaimsForVerdicts(
    understanding,
    directClaimsForVerdicts,
  );
  // v2.6.21: Use neutral label to ensure phrasing-neutral verdicts
  const inputLabel = "STATEMENT";

  const allowModelKnowledgePrompt = await getKnowledgeInstruction(
    state.pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
    state.originalInput,
    understanding,
    state.pipelineConfig?.recencyCueTerms,
    state.pipelineConfig,
  );
  const renderedAnswerSystem = await loadAndRenderSection("orchestrated", "ANSWER", {
    inputLabel,
    currentDateReadable,
    currentDate: currentDateStr,
  });
  const renderedAnswerUser = await loadAndRenderSection("orchestrated", "ANSWER_USER", {
    inputLabel,
    analysisInput,
    claimsFormatted,
    evidenceItemsFormatted,
  });
  const renderedAnswerCompactRetry = await loadAndRenderSection("orchestrated", "ANSWER_COMPACT_RETRY_APPEND", {});
  if (!renderedAnswerSystem?.content?.trim() || !renderedAnswerUser?.content?.trim() || !renderedAnswerCompactRetry?.content?.trim()) {
    throw new Error("Missing ANSWER prompt sections in orchestrated prompt profile");
  }
  const providerPromptHint = await getProviderPromptHint(state.pipelineConfig?.llmProvider);
  const systemPrompt = `${renderedAnswerSystem.content}\n${allowModelKnowledgePrompt}\n${providerPromptHint}`;
  const userPrompt = renderedAnswerUser.content;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_SIMPLE> | null = null;
  let llmProviderIssue: LlmProviderIssue | null = null;
  const singleContextOutputSchema: z.ZodTypeAny = isAnthropicProvider(state.pipelineConfig?.llmProvider)
    ? VERDICTS_SCHEMA_SIMPLE_ANTHROPIC
    : VERDICTS_SCHEMA_SIMPLE;

  // Retry once in compact mode if primary attempt fails (mirrors multi-context retry pattern).
  const singleCtxAttempts: Array<{ label: string; extraSystem: string }> = [
    { label: "primary", extraSystem: "" },
    {
      label: "retry-compact",
      extraSystem: `\n\n${renderedAnswerCompactRetry.content}`,
    },
  ];

  for (const attempt of singleCtxAttempts) {
    if (parsed?.verdictSummary && parsed?.claimVerdicts) break;

    try {
      const result = await generateText({
        model,
        messages: [
          { role: "system", content: systemPrompt + attempt.extraSystem, providerOptions: getPromptCachingOptions(state.pipelineConfig?.llmProvider) },
          { role: "user", content: userPrompt },
        ],
        temperature: getDeterministicTemperature(0.3, state.pipelineConfig),
        maxOutputTokens: 8192,
        output: Output.object({ schema: singleContextOutputSchema }),
        providerOptions: getStructuredOutputProviderOptions(state.pipelineConfig?.llmProvider ?? "anthropic"),
      });
      state.llmCalls++;
      recordLLMCall(state.budgetTracker, (result as any).usage?.totalTokens || (result as any).totalUsage?.totalTokens || 0);

      // Handle different AI SDK versions - safely extract structured output
      let rawOutput = extractStructuredOutput(result);
      if (rawOutput) {
        // CRITICAL FIX: Unwrap $PARAMETER_NAME wrapper that some LLM providers add
        // The LLM sometimes returns {"$PARAMETER_NAME": {actual data}} instead of {actual data}
        if (rawOutput.$PARAMETER_NAME && typeof rawOutput.$PARAMETER_NAME === 'object') {
          console.log("[generateSingleContextVerdicts] Unwrapping $PARAMETER_NAME wrapper");
          rawOutput = rawOutput.$PARAMETER_NAME;
        }
        // Also check for other common wrapper patterns
        const wrapperKeys = ['data', 'result', 'output', 'response'];
        for (const key of wrapperKeys) {
          if (rawOutput[key] && typeof rawOutput[key] === 'object' &&
              (rawOutput[key].verdictSummary || rawOutput[key].claimVerdicts)) {
            console.log(`[generateSingleContextVerdicts] Unwrapping ${key} wrapper`);
            rawOutput = rawOutput[key];
            break;
          }
        }

        // CRITICAL FIX: Validate against schema with coercion for numeric fields
        // The LLM sometimes returns answer/confidence as strings like "65" instead of 65
        const coercedOutput = {
          ...rawOutput,
          verdictSummary: rawOutput.verdictSummary ? {
            ...rawOutput.verdictSummary,
            answer: typeof rawOutput.verdictSummary.answer === 'string'
              ? parseFloat(rawOutput.verdictSummary.answer)
              : rawOutput.verdictSummary.answer,
            confidence: typeof rawOutput.verdictSummary.confidence === 'string'
              ? parseFloat(rawOutput.verdictSummary.confidence)
              : rawOutput.verdictSummary.confidence,
          } : rawOutput.verdictSummary,
          claimVerdicts: (rawOutput.claimVerdicts || []).map((cv: any) => ({
            ...cv,
            verdict: typeof cv.verdict === 'string' ? parseFloat(cv.verdict) : cv.verdict,
            confidence: typeof cv.confidence === 'string' ? parseFloat(cv.confidence) : cv.confidence,
            supportingEvidenceIds: normalizeSupportingEvidenceIds(cv, "generateSingleContextVerdicts", evidenceNormalizer),
          })),
        };

        // Debug: Log what we received vs what we're using
        console.log("[Analyzer] generateSingleContextVerdicts: Raw verdictSummary.answer =", rawOutput.verdictSummary?.answer, "type =", typeof rawOutput.verdictSummary?.answer);
        console.log("[Analyzer] generateSingleContextVerdicts: Coerced verdictSummary.answer =", coercedOutput.verdictSummary?.answer);

        parsed = coercedOutput as z.infer<typeof VERDICTS_SCHEMA_SIMPLE>;
      }
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const errName = err instanceof Error ? err.name : typeof err;
      const isNoOutput = typeof NoOutputGeneratedError !== "undefined" && NoOutputGeneratedError.isInstance?.(err);
      const isNoObject = NoObjectGeneratedError.isInstance?.(err);
      console.warn(
        `[Analyzer] Structured output failed for verdicts (${attempt.label}), using fallback: ${errMessage}`,
      );
      debugLog(`generateSingleContextVerdicts: structured output failed (${attempt.label})`, {
        error: errMessage,
        name: errName,
        errorType: isNoOutput ? "NoOutputGeneratedError" : isNoObject ? "NoObjectGeneratedError" : "other",
        finishReason: (isNoOutput || isNoObject) ? (err as any).finishReason : undefined,
        hasText: isNoObject ? !!(err as any).text : undefined,
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 10).join("\n") : undefined,
      });
      if (isNoOutput) {
        debugLog("generateSingleContextVerdicts: NoOutputGeneratedError - output getter threw (likely native output_format failure)");
      }
      if (errMessage.includes("output_format.schema") && errMessage.includes("maximum, minimum")) {
        debugLog("generateSingleContextVerdicts: Anthropic schema constraint error (numeric bounds unsupported)");
      }
      const providerIssue = classifyLlmProviderIssue(errMessage);
      if (providerIssue && !llmProviderIssue) {
        llmProviderIssue = providerIssue;
      }
      state.llmCalls++;

      if (attempt.label === "primary") {
        debugLog("generateSingleContextVerdicts: primary attempt failed, retrying in compact mode");
      }
    }
  }

  // Fallback if structured output failed or verdictSummary is missing
  // CRITICAL: Also check that answer is a valid number (not NaN, undefined, or non-numeric)
  const hasValidVerdictSummary = parsed?.verdictSummary &&
    typeof parsed.verdictSummary.answer === 'number' &&
    Number.isFinite(parsed.verdictSummary.answer);

  if (!parsed || !parsed.claimVerdicts || !hasValidVerdictSummary) {
    console.log("[Analyzer] Using fallback verdict generation (parsed:", !!parsed, ", claimVerdicts:", !!parsed?.claimVerdicts, ", verdictSummary:", !!parsed?.verdictSummary, ", hasValidAnswer:", hasValidVerdictSummary, ")");

    const fallbackVerdicts: ClaimVerdict[] = claimsForVerdicts.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: llmProviderIssue
          ? "Unable to generate verdict due to LLM provider failure."
          : "Unable to generate verdict due to structured-output failure.",
        supportingEvidenceIds: [],
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        thesisRelevanceConfidence:
          typeof claim.thesisRelevanceConfidence === "number"
            ? claim.thesisRelevanceConfidence
            : 100,
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const verdictSummary: VerdictSummary = {
      displayText: displayText,
      answer: 50,
      confidence: 50,
      truthPercentage: 50,
      shortAnswer: "Unable to determine - analysis failed",
      nuancedAnswer: llmProviderIssue
        ? `Verdict generation failed because the LLM provider was unavailable: ${llmProviderIssue.message}`
        : "Verdict generation failed due to a structured-output error (schema/provider mismatch or malformed JSON). Manual review recommended.",
      keyFactors: [],
      hasMultipleContexts: false,
    };

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE,
    ).length;
    const fallbackContexts = understanding.analysisContexts || [];
    const articleAnalysis: ArticleAnalysis = {
      inputType: analysisInputType,
      verdictSummary,
      hasMultipleContexts: false,
      analysisContexts: fallbackContexts,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    if (llmProviderIssue) {
      state.analysisWarnings.push({
        type: "llm_provider_error",
        severity: "error",
        message: `Single-context verdict generation failed: ${llmProviderIssue.message}`,
        details: {
          issueKind: llmProviderIssue.kind,
          remediationHints: [llmProviderIssue.hint],
          fallbackClaimCount: fallbackVerdicts.length,
        },
      });
    } else {
      // P1: Track structured output failure
      state.analysisWarnings.push({
        type: "structured_output_failure",
        severity: "error",
        message: "Single-context verdict generation failed due to structured output error. Using fallback verdicts (50% uncertain).",
        details: {
          fallbackClaimCount: fallbackVerdicts.length,
        },
      });
    }

    return { claimVerdicts: fallbackVerdicts, articleAnalysis, verdictSummary };
  }

  // Normal flow with parsed output

  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv]),
  );

  // Ensure ALL claims get a verdict
  const claimVerdicts: ClaimVerdict[] = await Promise.all(claimsForVerdicts.map(
    async (claim: any) => {
      const cv = llmVerdictMap.get(claim.id);

      if (!cv) {
        console.warn(
          `[Analyzer] Missing verdict for claim ${claim.id}, using default`,
        );
        // v2.9.1: Track per-claim fallback in analysisWarnings (was console.warn only)
        state.analysisWarnings.push({
          type: "verdict_fallback_partial",
          severity: "warning",
          message: `Verdict fallback for claim ${claim.id}: LLM did not return verdict`,
          details: { claimId: claim.id, fallbackType: "per_claim" },
        });
        return {
          claimId: claim.id,
          claimText: claim.text,
          contextId: claim.contextId || (state.understanding?.analysisContexts?.[0]?.id ?? ""),
          verdict: 50,
          confidence: 50,
          truthPercentage: 50,
          riskTier: "B" as const,
          reasoning: "No verdict returned by LLM for this claim.",
          supportingEvidenceIds: [],
          isCentral: claim.isCentral || false,
          centrality: claim.centrality || "medium",
          harmPotential: claim.harmPotential ?? "medium",
          thesisRelevance: claim.thesisRelevance || "direct",
          thesisRelevanceConfidence:
            typeof claim.thesisRelevanceConfidence === "number"
              ? claim.thesisRelevanceConfidence
              : 100,
          startOffset: claim.startOffset,
          endOffset: claim.endOffset,
          highlightColor: getHighlightColor7Point(50),
        } as ClaimVerdict;
      }

      // Sanitize temporal errors from reasoning
      const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

      let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);

      // v2.8.4: Use LLM-provided ratingConfirmation to validate verdict direction
      const ratingConfirmation = (cv as any).ratingConfirmation;
      let inversionDetected = false;
      if (ratingConfirmation) {
        const expectedLow = ratingConfirmation === "claim_refuted";
        const expectedHigh = ratingConfirmation === "claim_supported";
        const actuallyHigh = truthPct >= VERDICT_BANDS.LEANING_TRUE;
        const actuallyLow = truthPct < VERDICT_BANDS.MIXED;

        if ((expectedLow && actuallyHigh) || (expectedHigh && actuallyLow)) {
          truthPct = 100 - truthPct;
          inversionDetected = true;
        }
      }

      // v2.6.31: Detect and correct inverted verdicts (regex fallback)
      const inversionCheck = !inversionDetected
        ? detectAndCorrectVerdictInversion(
            claim.text || cv.claimId || "",
            sanitizedReasoning,
            truthPct
          )
        : { wasInverted: false, correctedPct: truthPct };
      if (inversionCheck.wasInverted) {
        truthPct = inversionCheck.correctedPct;
      }

      // v2.8.4: Use LLM-provided isCounterClaim, fall back to regex detection
        const supportingEvidenceIds =
          cv.supportingEvidenceIds && cv.supportingEvidenceIds.length > 0
            ? cv.supportingEvidenceIds
            : [];
      const claimFacts = state.evidenceItems.filter(f =>
        supportingEvidenceIds.includes(f.id)
      );
      const isCounterClaim = claim.isCounterClaim ?? await detectCounterClaim(
        claim.text || cv.claimId || "",
        understanding.impliedClaim || understanding.articleThesis || "",
        truthPct,
        claimFacts,
        VERDICT_BANDS,
      );

      // PR-C: Clamp truth percentage to valid range
      const clampedTruthPct = assertValidTruthPercentage(truthPct);
      return {
        ...cv,
        claimId: claim.id,
        contextId: claim.contextId || (state.understanding?.analysisContexts?.[0]?.id ?? ""),
        verdict: clampedTruthPct,
        truthPercentage: clampedTruthPct,
        reasoning: sanitizedReasoning,
        claimText: claim.text || "",
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        harmPotential: claim.harmPotential ?? "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        thesisRelevanceConfidence:
          typeof claim.thesisRelevanceConfidence === "number"
            ? claim.thesisRelevanceConfidence
            : 100,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(clampedTruthPct),
        isCounterClaim,
        supportingEvidenceIds,
      } as ClaimVerdict;
    },
  ));

  const recencyMatters = new RecencyAssessor().isRecencySensitive(
    analysisInput,
    understanding,
    state.pipelineConfig?.recencyCueTerms,
  );
  const guardedSingleContextVerdicts = applyRecencyEvidenceGuard(claimVerdicts, {
    recencyMatters,
  });
  if (guardedSingleContextVerdicts.adjustedClaimIds.length > 0) {
    state.analysisWarnings.push({
      type: "recency_evidence_gap",
      severity: "warning",
      message:
        "Recency-sensitive claims without supporting evidence were capped to UNVERIFIED for temporal safety.",
      details: {
        adjustedClaimIds: guardedSingleContextVerdicts.adjustedClaimIds,
      },
    });
  }

  const weightedClaimVerdicts = applyEvidenceWeighting(
    guardedSingleContextVerdicts.verdicts,
    state.evidenceItems,
    state.sources,
  );

  // P0: Validate verdict direction against evidence direction (single-context path, LLM-powered)
  const {
    validatedVerdicts: directionValidatedVerdicts,
    mismatches: verdictMismatches,
    warnings: verdictDirectionWarnings,
    degraded: directionValidationDegraded,
  } = await validateVerdictDirections(weightedClaimVerdicts, state.evidenceItems, {
    autoCorrect: true,
    minEvidenceCount: 2,
  });

  // Surface direction validation degradation warning
  if (directionValidationDegraded) {
    state.analysisWarnings.push({
      type: "direction_validation_degraded",
      severity: "warning",
      message: "Direction validation LLM failed; verdicts kept unchanged. Direction mismatch detection skipped.",
      details: { verdictCount: weightedClaimVerdicts.length },
    });
  }

  // Add any direction mismatch warnings to state
  if (verdictDirectionWarnings.length > 0) {
    state.analysisWarnings.push(...verdictDirectionWarnings);
    debugLog("Single-context verdicts: Direction validation warnings", {
      count: verdictDirectionWarnings.length,
      mismatches: verdictMismatches.map((m) => ({
        claimId: m.claimId,
        original: m.verdictPct,
        corrected: m.correctedVerdictPct,
      })),
    });
  }

  // Use direction-validated verdicts for pattern calculation
  const finalVerdicts = directionValidatedVerdicts;

  const claimPattern = {
    total: finalVerdicts.length,
    supported: finalVerdicts.filter((v) => v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE)
      .length,
    uncertain: finalVerdicts.filter(
      (v) => v.truthPercentage >= VERDICT_BANDS.MIXED && v.truthPercentage < VERDICT_BANDS.MOSTLY_TRUE,
    ).length,
    refuted: finalVerdicts.filter((v) => v.truthPercentage < VERDICT_BANDS.MIXED).length,
    centralClaimsTotal: finalVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: finalVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE,
    ).length,
  };

  const keyFactors = parsed.verdictSummary?.keyFactors || [];

  const monitoredKeyFactors = monitorOpinionAccumulation(keyFactors, {
    maxOpinionCount: state.pipelineConfig?.maxOpinionFactors ?? DEFAULT_PIPELINE_CONFIG.maxOpinionFactors,
    warningThresholdPercent: state.pipelineConfig?.opinionAccumulationWarningThreshold ??
      DEFAULT_PIPELINE_CONFIG.opinionAccumulationWarningThreshold,
  });
  // v2.8.6: Prune opinion-only factors (no documented evidence)
  const prunedKeyFactors = pruneOpinionOnlyFactors(monitoredKeyFactors);

  // Only flag contested negatives with evidence-based contestation
  const hasContestedFactors = prunedKeyFactors.some(
    (kf: any) =>
      kf.supports === "no" &&
      kf.isContested &&
      (kf.factualBasis === "established" || kf.factualBasis === "disputed"),
  );

  // v2.5.1: Apply factor-based correction for single-proceeding cases
  const positiveFactors = prunedKeyFactors.filter((f: KeyFactor) => f.supports === "yes").length;
  const evidencedNegatives = prunedKeyFactors.filter(
    (f: KeyFactor) => f.supports === "no" && f.factualBasis === "established",
  ).length;
  // v2.6.43: Fixed to match multi-context path - only count contested negatives WITHOUT established counter-evidence
  // If factualBasis is "established", the negative should NOT be discounted just because it's labeled contested.
  const contestedNegatives = prunedKeyFactors.filter(
    (f: KeyFactor) => f.supports === "no" && f.isContested && f.factualBasis !== "established",
  ).length;

  // DEBUG: Log raw values from LLM before normalization
  console.log("[generateSingleContextVerdicts] Raw verdictSummary.answer =", parsed.verdictSummary?.answer, "type =", typeof parsed.verdictSummary?.answer);
  console.log("[generateSingleContextVerdicts] Raw verdictSummary.confidence =", parsed.verdictSummary?.confidence, "type =", typeof parsed.verdictSummary?.confidence);

  let answerTruthPct = normalizePercentage(parsed.verdictSummary?.answer);
  let correctedConfidence = normalizePercentage(parsed.verdictSummary?.confidence);

  // DEBUG: Log normalized values
  console.log("[generateSingleContextVerdicts] Normalized answerTruthPct =", answerTruthPct);
  console.log("[generateSingleContextVerdicts] Normalized correctedConfidence =", correctedConfidence);

  // v2.6.20: Removed factor-based boost to ensure input neutrality
  debugLog("generateSingleContextVerdicts: No factor-based boost applied", {
    answerTruthPct,
    positiveFactors,
    evidencedNegatives,
    contestedNegatives,
  });

  // PR-C: Clamp truth percentage to valid range (defensive)
  const clampedAnswerTruthPct = assertValidTruthPercentage(answerTruthPct);
  console.log("[generateSingleContextVerdicts] Final clampedAnswerTruthPct =", clampedAnswerTruthPct);
  const verdictSummary: VerdictSummary = {
    displayText: displayText,
    answer: clampedAnswerTruthPct,
    confidence: correctedConfidence,
    truthPercentage: clampedAnswerTruthPct,
    shortAnswer: parsed.verdictSummary?.shortAnswer || "",
    nuancedAnswer: parsed.verdictSummary?.nuancedAnswer || "",
    keyFactors: prunedKeyFactors, // v2.8.6: Use pruned keyFactors
    hasMultipleContexts: false,
    hasContestedFactors,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality Ã— confidence)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(finalVerdicts, state.calcConfig.aggregation);

  // v2.9.0: Single-context verdict-claims consistency anchoring
  // When LLM's overall verdict diverges significantly from evidence-based claims average,
  // blend toward claims to prevent holistic LLM bias.
  let finalAnswerTruthPct = clampedAnswerTruthPct;
  if (finalVerdicts.length > 0) {
    const contextClaimsAnchorDivergenceThreshold =
      state.pipelineConfig.contextClaimsAnchorDivergenceThreshold ??
      DEFAULT_PIPELINE_CONFIG.contextClaimsAnchorDivergenceThreshold ??
      15;
    const contextClaimsAnchorClaimsWeight =
      state.pipelineConfig.contextClaimsAnchorClaimsWeight ??
      DEFAULT_PIPELINE_CONFIG.contextClaimsAnchorClaimsWeight ??
      0.6;
    const anchorResult = anchorVerdictTowardClaims({
      verdictPct: clampedAnswerTruthPct,
      claimsAvgPct: claimsAvgTruthPct,
      divergenceThreshold: contextClaimsAnchorDivergenceThreshold,
      claimsWeight: contextClaimsAnchorClaimsWeight,
    });
    if (anchorResult.applied) {
      finalAnswerTruthPct = anchorResult.anchoredPct;
      verdictSummary.answer = finalAnswerTruthPct;
      verdictSummary.truthPercentage = finalAnswerTruthPct;
      debugLog(`Single-context verdict-claims anchoring applied`, {
        originalVerdict: clampedAnswerTruthPct,
        claimsAvg: claimsAvgTruthPct,
        anchoredVerdict: finalAnswerTruthPct,
        divergence: anchorResult.divergence,
        threshold: contextClaimsAnchorDivergenceThreshold,
        claimsWeight: contextClaimsAnchorClaimsWeight,
      });
    }
  }

  const articleAnalysis: ArticleAnalysis = {
    inputType: analysisInputType,
    verdictSummary,
    hasMultipleContexts: false,
    analysisContexts: understanding.analysisContexts || [],
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    logicalFallacies: [],

    // Claims summary
    claimsAverageTruthPercentage: claimsAvgTruthPct,
    claimsAverageVerdict: claimsAvgTruthPct,

  // Article verdict - CRITICAL: Use anchored value for consistency with verdictSummary
    articleTruthPercentage: finalAnswerTruthPct,
    articleVerdict: finalAnswerTruthPct,
    // Avoid duplicating claims average in the UI; we show it as a dedicated row.
    articleVerdictReason: undefined,
    // v2.6.38: Single context always has high reliability (verdict is meaningful)
    articleVerdictReliability: "high",

    claimPattern,
  };

  // v2.8.6: Prune tangential claims with no/low evidence (using direction-validated verdicts)
  const prunedClaimVerdicts = pruneTangentialBaselessClaims(finalVerdicts, {
    evidenceItems: state.evidenceItems,
    minEvidenceForTangential: state.pipelineConfig?.minEvidenceForTangential ??
      state.calcConfig.tangentialPruning?.minEvidenceForTangential ??
      DEFAULT_PIPELINE_CONFIG.minEvidenceForTangential,
    requireQualityEvidence: state.pipelineConfig?.tangentialEvidenceQualityCheckEnabled ??
      DEFAULT_PIPELINE_CONFIG.tangentialEvidenceQualityCheckEnabled,
  });
  console.log(`[Analyzer] SingleContext: Pruned ${finalVerdicts.length - prunedClaimVerdicts.length} tangential claims, ${monitoredKeyFactors.length - prunedKeyFactors.length} baseless factors`);

  return {
    claimVerdicts: prunedClaimVerdicts,
    articleAnalysis,
    verdictSummary,
  };
}

async function generateClaimVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  evidenceItemsFormatted: string,
  claimsFormatted: string,
  model: any,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
}> {
  const evidenceNormalizer = new EvidenceNormalizer(state.fallbackTracker);
  // Detect if topic involves procedural/legal/institutional analysis
  // This determines whether to generate Key Factors (unified analysis mode)
  const isProceduralTopic = detectProceduralTopic(understanding, state.originalText);
  // PR-F: Exclude CTX_UNASSIGNED claims from verdict calculations (fixes Blocker F)
  // Only include direct claims that are NOT unassigned (unassigned is display-only)
  const directClaimsForVerdicts = (understanding.subClaims || []).filter(
    (c: any) =>
      (!c?.thesisRelevance || c.thesisRelevance === "direct") &&
      c?.contextId !== UNASSIGNED_CONTEXT_ID
  );
  const claimsForVerdicts = expandClaimsForVerdicts(
    understanding,
    directClaimsForVerdicts,
  );
  const analysisInput = resolveAnalysisPromptInput(understanding, state);

  // Also add Article Verdict Problem analysis per POC1 spec
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const allowModelKnowledgePrompt = await getKnowledgeInstruction(
    state.pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
    state.originalInput,
    understanding,
    state.pipelineConfig?.recencyCueTerms,
    state.pipelineConfig,
  );
  const renderedClaimSystem = await loadAndRenderSection("orchestrated", "CLAIM_VERDICTS", {
    currentDateReadable,
    currentDate: currentDateStr,
  });
  const renderedClaimUser = await loadAndRenderSection("orchestrated", "CLAIM_VERDICTS_USER", {
    THESIS_TEXT: understanding.articleThesis,
    CLAIMS_TEXT: claimsFormatted,
    EVIDENCE_TEXT: evidenceItemsFormatted,
  });
  const renderedClaimKeyFactors = await loadAndRenderSection(
    "orchestrated",
    "CLAIM_VERDICTS_KEY_FACTORS_APPEND",
    {},
  );
  const renderedClaimEvidenceQuality = await loadAndRenderSection(
    "orchestrated",
    "CLAIM_VERDICTS_EVIDENCE_QUALITY_APPEND",
    {},
  );
  const renderedClaimCompactRetry = await loadAndRenderSection(
    "orchestrated",
    "CLAIM_VERDICTS_COMPACT_RETRY_APPEND",
    {},
  );
  if (
    !renderedClaimSystem?.content?.trim() ||
    !renderedClaimUser?.content?.trim() ||
    !renderedClaimKeyFactors?.content?.trim() ||
    !renderedClaimEvidenceQuality?.content?.trim() ||
    !renderedClaimCompactRetry?.content?.trim()
  ) {
    throw new Error("Missing CLAIM_VERDICTS prompt sections in orchestrated prompt profile");
  }
  const providerPromptHint = await getProviderPromptHint(state.pipelineConfig?.llmProvider);

  let systemPrompt = `${renderedClaimSystem.content}
${allowModelKnowledgePrompt}
${providerPromptHint}`;

  systemPrompt += `\n\n${renderedClaimKeyFactors.content}`;
  systemPrompt += `\n\n${renderedClaimEvidenceQuality.content}`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_CLAIM> | null = null;
  let llmProviderIssue: LlmProviderIssue | null = null;
  const claimOutputSchema: z.ZodTypeAny = isAnthropicProvider(state.pipelineConfig?.llmProvider)
    ? VERDICTS_SCHEMA_CLAIM_ANTHROPIC
    : VERDICTS_SCHEMA_CLAIM;

  // Retry once in compact mode if primary attempt fails (mirrors multi-context retry pattern).
  const claimAttempts: Array<{ label: string; extraSystem: string }> = [
    { label: "primary", extraSystem: "" },
    {
      label: "retry-compact",
      extraSystem: `\n\n${renderedClaimCompactRetry.content}`,
    },
  ];

  for (const attempt of claimAttempts) {
    if (parsed?.claimVerdicts) break;

    try {
      const result = await generateText({
        model,
        messages: [
          { role: "system", content: systemPrompt + attempt.extraSystem, providerOptions: getPromptCachingOptions(state.pipelineConfig?.llmProvider) },
          {
            role: "user",
            content: renderedClaimUser.content,
          },
        ],
        temperature: getDeterministicTemperature(0.3, state.pipelineConfig),
        maxOutputTokens: 8192,
        output: Output.object({ schema: claimOutputSchema }),
        providerOptions: getStructuredOutputProviderOptions(state.pipelineConfig?.llmProvider ?? "anthropic"),
      });
      state.llmCalls++;
      recordLLMCall(state.budgetTracker, (result as any).usage?.totalTokens || (result as any).totalUsage?.totalTokens || 0);

      // Handle different AI SDK versions - safely extract structured output
      let rawOutput = extractStructuredOutput(result);
      if (rawOutput) {
        // CRITICAL FIX: Unwrap $PARAMETER_NAME wrapper that some LLM providers add
        if (rawOutput.$PARAMETER_NAME && typeof rawOutput.$PARAMETER_NAME === 'object') {
          console.log("[generateClaimVerdicts] Unwrapping $PARAMETER_NAME wrapper");
          rawOutput = rawOutput.$PARAMETER_NAME;
        }
        // Also check for other common wrapper patterns
        const wrapperKeys = ['data', 'result', 'output', 'response'];
        for (const key of wrapperKeys) {
          if (rawOutput[key] && typeof rawOutput[key] === 'object' &&
              (rawOutput[key].articleAnalysis || rawOutput[key].claimVerdicts)) {
            console.log(`[generateClaimVerdicts] Unwrapping ${key} wrapper`);
            rawOutput = rawOutput[key];
            break;
          }
        }

        // CRITICAL FIX: Coerce string values to numbers (LLM sometimes returns "65" instead of 65)
        const coerceToNumber = (val: any): number | any => {
          if (typeof val === 'string') {
            const parsed = parseFloat(val.replace('%', '').trim());
            return Number.isFinite(parsed) ? parsed : val;
          }
          return val;
        };

        const coercedOutput = {
          ...rawOutput,
          articleAnalysis: rawOutput.articleAnalysis ? {
            ...rawOutput.articleAnalysis,
            articleVerdict: coerceToNumber(rawOutput.articleAnalysis.articleVerdict),
            articleConfidence: coerceToNumber(rawOutput.articleAnalysis.articleConfidence),
          } : rawOutput.articleAnalysis,
          claimVerdicts: (rawOutput.claimVerdicts || []).map((cv: any) => ({
            ...cv,
            verdict: coerceToNumber(cv.verdict),
            confidence: coerceToNumber(cv.confidence),
            supportingEvidenceIds: normalizeSupportingEvidenceIds(cv, "generateClaimVerdicts", evidenceNormalizer),
          })),
        };

        parsed = coercedOutput as z.infer<typeof VERDICTS_SCHEMA_CLAIM>;
      }
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isNoOutput = typeof NoOutputGeneratedError !== "undefined" && NoOutputGeneratedError.isInstance?.(err);
      const isNoObj = NoObjectGeneratedError.isInstance?.(err);
      console.error(
        `[Analyzer] Structured output failed for claim verdicts (${attempt.label}):`,
        errMsg,
      );
      debugLog(`generateClaimVerdicts: structured output failed (${attempt.label})`, {
        error: errMsg,
        name: err instanceof Error ? err.name : typeof err,
        errorType: isNoOutput ? "NoOutputGeneratedError" : isNoObj ? "NoObjectGeneratedError" : "other",
        finishReason: isNoObj ? (err as any)?.finishReason : undefined,
      });
      if (errMsg.includes("output_format.schema") && errMsg.includes("maximum, minimum")) {
        debugLog("generateClaimVerdicts: Anthropic schema constraint error (numeric bounds unsupported)");
      }
      const providerIssue = classifyLlmProviderIssue(errMsg);
      if (providerIssue && !llmProviderIssue) {
        llmProviderIssue = providerIssue;
      }
      state.llmCalls++;

      if (attempt.label === "primary") {
        debugLog("generateClaimVerdicts: primary attempt failed, retrying in compact mode");
      }
    }
  }

  // If structured output failed, create fallback verdicts
  if (!parsed || !parsed.claimVerdicts) {
    console.log("[Analyzer] Using fallback verdict generation");

    // Create default verdicts for each claim
    const fallbackVerdicts: ClaimVerdict[] = claimsForVerdicts.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: llmProviderIssue
          ? "Unable to generate verdict due to LLM provider failure."
          : "Unable to generate verdict due to structured-output failure. Manual review recommended.",
        supportingEvidenceIds: [],
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        thesisRelevanceConfidence:
          typeof claim.thesisRelevanceConfidence === "number"
            ? claim.thesisRelevanceConfidence
            : 100,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE,
    ).length;
    const articleAnalysis: ArticleAnalysis = {
      inputType: "article",
      hasMultipleContexts: false,
      analysisContexts: understanding.analysisContexts || [],
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
      articleVerdictReason:
        "Verdict generation failed - manual review recommended",
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    if (llmProviderIssue) {
      state.analysisWarnings.push({
        type: "llm_provider_error",
        severity: "error",
        message: `Claim verdict generation failed: ${llmProviderIssue.message}`,
        details: {
          issueKind: llmProviderIssue.kind,
          remediationHints: [llmProviderIssue.hint],
          fallbackClaimCount: fallbackVerdicts.length,
        },
      });
    } else {
      // P1: Track structured output failure
      state.analysisWarnings.push({
        type: "structured_output_failure",
        severity: "error",
        message: "Claim verdict generation failed due to structured output error. Using fallback verdicts (50% uncertain).",
        details: {
          fallbackClaimCount: fallbackVerdicts.length,
        },
      });
    }

    return { claimVerdicts: fallbackVerdicts, articleAnalysis };
  }

  // Normal flow with parsed output

  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv]),
  );

  // Ensure ALL claims get a verdict (fill in missing ones)
  const claimVerdicts: ClaimVerdict[] = await Promise.all(claimsForVerdicts.map(
    async (claim: any) => {
      const cv = llmVerdictMap.get(claim.id);

      // If LLM didn't return a verdict for this claim, create a default one
      if (!cv) {
        console.warn(
          `[Analyzer] Missing verdict for claim ${claim.id}, using default`,
        );
        // v2.9.1: Track per-claim fallback in analysisWarnings (was console.warn only)
        state.analysisWarnings.push({
          type: "verdict_fallback_partial",
          severity: "warning",
          message: `Verdict fallback for claim ${claim.id}: LLM did not return verdict`,
          details: { claimId: claim.id, fallbackType: "per_claim" },
        });
        return {
          claimId: claim.id,
          claimText: claim.text,
          verdict: 50,
          confidence: 50,
          truthPercentage: 50,
          riskTier: "B" as const,
          reasoning: "No verdict returned by LLM for this claim.",
          supportingEvidenceIds: [],
          isContested: false,
          contestedBy: "",
          factualBasis: "unknown",
          isCentral: claim.isCentral || false,
          centrality: claim.centrality || "medium",
          harmPotential: claim.harmPotential ?? "medium",
          thesisRelevance: claim.thesisRelevance || "direct",
          thesisRelevanceConfidence:
            typeof claim.thesisRelevanceConfidence === "number"
              ? claim.thesisRelevanceConfidence
              : 100,
          claimRole: claim.claimRole || "core",
          dependsOn: claim.dependsOn || [],
          keyFactorId: claim.keyFactorId || "", // Preserve KeyFactor mapping
          startOffset: claim.startOffset,
          endOffset: claim.endOffset,
          highlightColor: getHighlightColor7Point(50),
        } as ClaimVerdict;
      }

      // Sanitize temporal errors from reasoning
      const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

      let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);
      let finalConfidence = normalizePercentage(cv.confidence);
      // v2.8.4: Use LLM-provided ratingConfirmation to validate verdict direction
      const ratingConfirmation = (cv as any).ratingConfirmation;
      let inversionDetected = false;
      if (ratingConfirmation) {
        const expectedLow = ratingConfirmation === "claim_refuted";
        const expectedHigh = ratingConfirmation === "claim_supported";
        const actuallyHigh = truthPct >= VERDICT_BANDS.LEANING_TRUE;
        const actuallyLow = truthPct < VERDICT_BANDS.MIXED;

        if ((expectedLow && actuallyHigh) || (expectedHigh && actuallyLow)) {
          truthPct = 100 - truthPct;
          inversionDetected = true;
        }
      }

      // v2.6.31: Detect and correct inverted verdicts (regex fallback)
      const inversionCheck = !inversionDetected
        ? detectAndCorrectVerdictInversion(
            claim.text || cv.claimId || "",
            sanitizedReasoning,
            truthPct
          )
        : { wasInverted: false, correctedPct: truthPct };
      if (inversionCheck.wasInverted) {
        truthPct = inversionCheck.correctedPct;
      }

      // v2.8.4: Use LLM-provided isCounterClaim, fall back to regex detection
        const supportingEvidenceIds =
          cv.supportingEvidenceIds && cv.supportingEvidenceIds.length > 0
            ? cv.supportingEvidenceIds
            : [];
      const claimFacts = state.evidenceItems.filter(f =>
        supportingEvidenceIds.includes(f.id)
      );
      const isCounterClaim = claim.isCounterClaim ?? await detectCounterClaim(
        claim.text || cv.claimId || "",
        understanding.impliedClaim || understanding.articleThesis || "",
        truthPct,
        claimFacts,
        VERDICT_BANDS,
      );

      // v2.9.2: Pseudoscience detection removed - LLM should identify claims lacking scientific basis
      // based on evidence quality, not pattern matching

      const evidenceBasedContestation =
        cv.isContested &&
        (cv.factualBasis === "established" || cv.factualBasis === "disputed");
      if (evidenceBasedContestation) {
        const penalty = cv.factualBasis === "established"
          ? Math.abs(state.calcConfig.contestationPenalties.established)
          : Math.abs(state.calcConfig.contestationPenalties.disputed);
        truthPct = Math.max(0, truthPct - penalty);
      }

      // PR-C: Clamp truth percentage to valid range
      const clampedTruthPct = assertValidTruthPercentage(truthPct);
      return {
        ...cv,
        claimId: claim.id,
        verdict: clampedTruthPct,
        truthPercentage: clampedTruthPct,
        confidence: finalConfidence,
        reasoning: sanitizedReasoning,
        claimText: claim.text || "",
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        harmPotential: claim.harmPotential ?? "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        thesisRelevanceConfidence:
          typeof claim.thesisRelevanceConfidence === "number"
            ? claim.thesisRelevanceConfidence
            : 100,
        claimRole: claim.claimRole || "core",
        dependsOn: claim.dependsOn || [],
        keyFactorId: claim.keyFactorId || "", // Preserve KeyFactor mapping for aggregation
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(clampedTruthPct),
        isCounterClaim,
        supportingEvidenceIds,
      } as ClaimVerdict;
    },
  ));

  // v2.9: LLM Verdict Validation
  // Validates verdicts for harm potential, contestation, and inversion detection
  const useLLMVerdictValidation = isLLMEnabled("verdict");
  let validatedClaimVerdicts = claimVerdicts;

  if (useLLMVerdictValidation && claimVerdicts.length > 0) {
    try {
      debugLog("generateClaimVerdicts: LLM verdict validation starting", {
        claimCount: claimVerdicts.length,
      });

      // Prepare claim verdicts for validation
      const claimVerdictsForValidation = claimVerdicts.map((cv) => ({
        claimId: cv.claimId,
        claimText: cv.claimText,
        verdictPct: cv.truthPercentage,
        reasoning: cv.reasoning || "",
      }));

      const textAnalysisService = getTextAnalysisService({
        pipelineConfig: state.pipelineConfig ?? undefined,
      });
      const validationResults = await textAnalysisService.validateVerdicts({
        thesis: understanding.impliedClaim || understanding.articleThesis || "",
        claimVerdicts: claimVerdictsForValidation,
        evidenceSummary: evidenceItemsFormatted?.slice(0, 2000) || "",
        mode: "full",
      });

      // Build map for quick lookup
      const validationMap = new Map<string, TextAnalysisVerdictResult>();
      for (const result of validationResults) {
        validationMap.set(result.claimId, result);
      }

      // Apply validation results to claim verdicts
      validatedClaimVerdicts = claimVerdicts.map((cv) => {
        const validation = validationMap.get(cv.claimId);
        if (!validation) return cv;

        let updatedVerdict = { ...cv };

        // Apply inversion correction if detected
        if (validation.isInverted && validation.suggestedCorrection !== undefined && validation.suggestedCorrection !== null) {
          const correctedPct = assertValidTruthPercentage(validation.suggestedCorrection);
          debugLog("Verdict inversion detected (LLM)", {
            claimId: cv.claimId,
            originalPct: cv.truthPercentage,
            correctedPct,
            reasoning: validation.reasoning,
          });
          updatedVerdict.truthPercentage = correctedPct;
          updatedVerdict.verdict = correctedPct;
          updatedVerdict.reasoning = `[LLM INVERSION CORRECTED] ${cv.reasoning || ""}`;
        }

        // Override harm potential only for downgrades (high→medium, medium→low) or
        // upgrades from low. Do NOT unconditionally escalate medium→high — the understand
        // phase has richer context for initial classification; validation should only correct
        // clear misclassifications, not inflate based on topic-adjacent keywords.
        if (validation.harmPotential !== cv.harmPotential) {
          const harmRank = { low: 0, medium: 1, high: 2 } as const;
          const oldRank = harmRank[cv.harmPotential || "medium"];
          const newRank = harmRank[validation.harmPotential || "medium"];
          const isDowngrade = newRank < oldRank;
          const isUpgradeFromLow = oldRank === 0 && newRank > 0;
          if (isDowngrade || isUpgradeFromLow) {
            updatedVerdict.harmPotential = validation.harmPotential;
          }
        }

        // Apply counter-claim detection
        if (validation.isCounterClaim !== undefined) {
          updatedVerdict.isCounterClaim = validation.isCounterClaim;
        }

        return updatedVerdict;
      });

      debugLog("generateClaimVerdicts: LLM verdict validation complete", {
        processed: validationResults.length,
        inversionsDetected: validationResults.filter((r) => r.isInverted).length,
      });
    } catch (err) {
      // Non-fatal: continue with original verdicts if LLM validation fails
      console.warn(
        "[Verdict Validation] LLM verdict validation failed, using heuristic results:",
        err instanceof Error ? err.message : String(err)
      );
      debugLog("generateClaimVerdicts: LLM verdict validation failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const recencyMatters = new RecencyAssessor().isRecencySensitive(
    analysisInput,
    understanding,
    state.pipelineConfig?.recencyCueTerms,
  );
  const guardedClaimVerdicts = applyRecencyEvidenceGuard(validatedClaimVerdicts, {
    recencyMatters,
  });
  if (guardedClaimVerdicts.adjustedClaimIds.length > 0) {
    state.analysisWarnings.push({
      type: "recency_evidence_gap",
      severity: "warning",
      message:
        "Recency-sensitive claims without supporting evidence were capped to UNVERIFIED for temporal safety.",
      details: {
        adjustedClaimIds: guardedClaimVerdicts.adjustedClaimIds,
      },
    });
  }

  const weightedClaimVerdicts = applyEvidenceWeighting(
    guardedClaimVerdicts.verdicts,
    state.evidenceItems,
    state.sources,
  );

  // P0: Validate verdict direction against evidence direction (claim verdicts path, LLM-powered)
  const {
    validatedVerdicts: directionValidatedVerdicts,
    mismatches: verdictMismatches,
    warnings: verdictDirectionWarnings,
    degraded: directionValidationDegraded,
  } = await validateVerdictDirections(weightedClaimVerdicts, state.evidenceItems, {
    autoCorrect: true,
    minEvidenceCount: 2,
  });

  // Surface direction validation degradation warning
  if (directionValidationDegraded) {
    state.analysisWarnings.push({
      type: "direction_validation_degraded",
      severity: "warning",
      message: "Direction validation LLM failed; verdicts kept unchanged. Direction mismatch detection skipped.",
      details: { verdictCount: weightedClaimVerdicts.length },
    });
  }

  // Add any direction mismatch warnings to state
  if (verdictDirectionWarnings.length > 0) {
    state.analysisWarnings.push(...verdictDirectionWarnings);
    debugLog("Claim verdicts: Direction validation warnings", {
      count: verdictDirectionWarnings.length,
      mismatches: verdictMismatches.map((m) => ({
        claimId: m.claimId,
        original: m.verdictPct,
        corrected: m.correctedVerdictPct,
      })),
    });
  }

  // Use direction-validated verdicts going forward
  const finalVerdicts = directionValidatedVerdicts;

  // DEPENDENCY PROPAGATION: If a prerequisite claim is false, flag dependent claims
  const verdictMap = new Map(finalVerdicts.map((v) => [v.claimId, v]));

  for (const verdict of finalVerdicts) {
    const claim = understanding.subClaims.find(
      (c: any) => c.id === verdict.claimId,
    );
    const dependencies = claim?.dependsOn || [];

    if (dependencies.length > 0) {
      // Check if any dependency is false (truthPercentage < 43%)
      const failedDeps = dependencies.filter((depId: string) => {
        const depVerdict = verdictMap.get(depId);
        return depVerdict && depVerdict.truthPercentage < VERDICT_BANDS.MIXED;
      });

      if (failedDeps.length > 0) {
        // Mark this claim as having failed prerequisites
        verdict.dependencyFailed = true;
        verdict.failedDependencies = failedDeps;

        // Add note to reasoning
        const depNames = failedDeps
          .map((id: string) => {
            const dv = verdictMap.get(id);
            return dv ? `${id}: "${dv.claimText.slice(0, 50)}..."` : id;
          })
          .join(", ");

        verdict.reasoning = `[PREREQUISITE FAILED: ${depNames}] ${verdict.reasoning || ""}`;

        // For display purposes, we keep the original verdict but flag it
        // The UI can choose to show this differently
      }
    }
  }

  // Filter out claims with failed dependencies for verdict calculations
  // These claims are shown but don't contribute to the overall verdict to avoid double-counting
  // (the failed prerequisite already contributes its false verdict)
  const independentVerdicts = finalVerdicts.filter((v) => !v.dependencyFailed);

  // Calculate claim pattern using truth percentages (only independent claims)
  const claimPattern = {
    total: finalVerdicts.length,
    supported: independentVerdicts.filter((v) => v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE)
      .length,
    uncertain: independentVerdicts.filter(
      (v) => v.truthPercentage >= VERDICT_BANDS.MIXED && v.truthPercentage < VERDICT_BANDS.MOSTLY_TRUE,
    ).length,
    refuted: independentVerdicts.filter((v) => v.truthPercentage < VERDICT_BANDS.MIXED).length,
    centralClaimsTotal: independentVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: independentVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE,
    ).length,
    // Track excluded claims for transparency
    dependencyFailedCount: finalVerdicts.filter((v) => v.dependencyFailed).length,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality Ã— confidence, only independent claims)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(independentVerdicts, state.calcConfig.aggregation);

  // Article Verdict Problem: Check central claims specifically (using independent verdicts only)
  // If central claims are refuted but supporting claims are true, article is MISLEADING
  const centralClaims = independentVerdicts.filter((v) => v.isCentral);
  const centralRefuted = centralClaims.filter((v) => v.truthPercentage < VERDICT_BANDS.MIXED);
  const centralSupported = centralClaims.filter((v) => v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE);
  const nonCentralClaims = independentVerdicts.filter((v) => !v.isCentral);
  const nonCentralSupported = nonCentralClaims.filter((v) => v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE);

  // Detect Article Verdict Problem pattern: accurate supporting evidence but false central claim
  // v2.9.0: Require MAJORITY of central claims refuted (not just any one), prevents false triggers
  // on complex multi-claim analyses where one central claim has mixed evidence
  const centralRefutedRatio = centralClaims.length > 0 ? centralRefuted.length / centralClaims.length : 0;
  const avoCfg = state.calcConfig.articleVerdictOverride;
  const hasMisleadingPattern =
    centralRefutedRatio > (avoCfg?.centralRefutedRatioThreshold ?? 0.5) &&
    nonCentralSupported.length >= 2 &&
    claimsAvgTruthPct >= 50; // Average looks OK but majority of central claims are false

  // Calculate article truth percentage from LLM's article verdict
  let articleTruthPct = calculateArticleTruthPercentage(
    parsed.articleAnalysis.articleVerdict,
    parsed.articleAnalysis.articleConfidence,
  );

  let articleVerdictOverrideReason: string | undefined;

  // If LLM returned default/unknown verdict (50%), use claims average instead
  if (articleTruthPct === 50 && claimsAvgTruthPct !== 50) {
    articleTruthPct = claimsAvgTruthPct;
  }

  // Article Verdict Problem Override: Central claim refuted = article MISLEADING
  // v2.9.0: Blend toward misleading range instead of hard-overriding
  // The refuted ratio determines the blend strength
  const misleadingTarget = avoCfg?.misleadingTarget ?? 35;
  const maxBlendStrength = avoCfg?.maxBlendStrength ?? 0.8;
  if (hasMisleadingPattern && articleTruthPct > misleadingTarget) {
    const blendStrength = Math.min(centralRefutedRatio, maxBlendStrength);
    const blendedPct = Math.round(articleTruthPct * (1 - blendStrength) + misleadingTarget * blendStrength);
    console.log(`[Analyzer] Article Verdict Problem detected: ${centralRefuted.length}/${centralClaims.length} central claims refuted (${Math.round(centralRefutedRatio * 100)}%), ${nonCentralSupported.length} supporting claims true, avg=${claimsAvgTruthPct}%. Blending ${articleTruthPct}â†’${blendedPct}.`);
    articleTruthPct = blendedPct;
    articleVerdictOverrideReason = `${centralRefuted.length}/${centralClaims.length} central claim(s) refuted despite ${nonCentralSupported.length} accurate supporting evidence`;
  }

  // Check if article verdict differs significantly from claims average
  const verdictDiffers = Math.abs(articleTruthPct - claimsAvgTruthPct) > 15 || hasMisleadingPattern;

  // Process Key Factors by aggregating claim verdicts (moved from verdict generation to understanding)
  const keyFactors: KeyFactor[] = [];

  // Only process KeyFactors if they were discovered during understanding
  if (understanding.keyFactors && understanding.keyFactors.length > 0) {
    for (const factor of understanding.keyFactors) {
      // Find all claims mapped to this factor
      const factorClaims = finalVerdicts.filter(v => v.keyFactorId === factor.id);

      if (factorClaims.length > 0) {
        // Aggregate verdicts for this factor
        const factorAvgTruthPct = Math.round(
          factorClaims.reduce((sum, v) => sum + v.truthPercentage, 0) / factorClaims.length
        );

        // Determine factor support based on average
        let supports: "yes" | "no" | "neutral";
        if (factorAvgTruthPct >= VERDICT_BANDS.MOSTLY_TRUE) {
          supports = "yes";
        } else if (factorAvgTruthPct < VERDICT_BANDS.MIXED) {
          supports = "no";
        } else {
          supports = "neutral";
        }

        // Create explanation from aggregated claim verdicts
        const supportedCount = factorClaims.filter(v => v.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE).length;
        const refutedCount = factorClaims.filter(v => v.truthPercentage < VERDICT_BANDS.MIXED).length;
        const explanation = `${supportedCount}/${factorClaims.length} claims support this factor, ${refutedCount} refute it. Average truth: ${factorAvgTruthPct}%.`;

        keyFactors.push({
          factor: factor.factor,
          supports,
          explanation,
          isContested: false, // Will be determined by contestation analysis
          contestedBy: "",
          contestationReason: "",
          factualBasis: "unknown",
        });
      }
    }
  }

  // Check if any factors are contested with evidence-based contestation
  const hasContestedFactors = keyFactors.some(
    (f) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  console.log(`[Analyzer] Key Factors aggregated: ${keyFactors.length} factors from ${understanding.keyFactors?.length || 0} discovered, ${hasContestedFactors ? "has" : "no"} contested factors`);

  // v2.8.6: Prune tangential claims with no/low evidence and opinion-only factors (using direction-validated verdicts)
  const prunedClaimVerdicts = pruneTangentialBaselessClaims(finalVerdicts, {
    evidenceItems: state.evidenceItems,
    minEvidenceForTangential: state.pipelineConfig?.minEvidenceForTangential ??
      state.calcConfig.tangentialPruning?.minEvidenceForTangential ??
      DEFAULT_PIPELINE_CONFIG.minEvidenceForTangential,
    requireQualityEvidence: state.pipelineConfig?.tangentialEvidenceQualityCheckEnabled ??
      DEFAULT_PIPELINE_CONFIG.tangentialEvidenceQualityCheckEnabled,
  });
  const monitoredKeyFactors = monitorOpinionAccumulation(keyFactors, {
    maxOpinionCount: state.pipelineConfig?.maxOpinionFactors ?? DEFAULT_PIPELINE_CONFIG.maxOpinionFactors,
    warningThresholdPercent: state.pipelineConfig?.opinionAccumulationWarningThreshold ??
      DEFAULT_PIPELINE_CONFIG.opinionAccumulationWarningThreshold,
  });
  const prunedKeyFactors = pruneOpinionOnlyFactors(monitoredKeyFactors);
  console.log(`[Analyzer] Pruned: ${finalVerdicts.length - prunedClaimVerdicts.length} tangential claims, ${monitoredKeyFactors.length - prunedKeyFactors.length} opinion-only factors`);

  return {
    claimVerdicts: prunedClaimVerdicts,
      articleAnalysis: {
        inputType: understanding.detectedInputType,
        hasMultipleContexts: false,
        articleThesis: understanding.articleThesis,
      logicalFallacies: parsed.articleAnalysis.logicalFallacies,

      // Claims summary
      claimsAverageTruthPercentage: claimsAvgTruthPct,
      claimsAverageVerdict: claimsAvgTruthPct,

      // Article verdict (LLM's independent assessment, with Article Verdict Problem override)
      articleTruthPercentage: articleTruthPct,
      articleVerdict: articleTruthPct,
      articleVerdictReason: articleVerdictOverrideReason
        ? articleVerdictOverrideReason
        : verdictDiffers
          ? articleTruthPct < claimsAvgTruthPct
            ? "Article uses evidence misleadingly or draws unsupported conclusions"
            : "Article's conclusion is better supported than individual claims suggest"
          : undefined,

      claimPattern,
      isPseudoscience: false,
      pseudoscienceCategories: [],

  // NEW v2.6.18: Key Factors for article mode (unified analysis mode)
      keyFactors: prunedKeyFactors.length > 0 ? prunedKeyFactors : undefined,
      hasContestedFactors: prunedKeyFactors.length > 0 ? hasContestedFactors : undefined,
    },
  };
}


// ============================================================================
// STEP 6-7: Summary & Report
// ============================================================================

async function generateTwoPanelSummary(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  model: any,
): Promise<TwoPanelSummary> {
  const understanding = state.understanding!;
  const hasMultipleContexts = articleAnalysis.hasMultipleContexts;

  const rawInputDisplay = String(
    understanding.originalInputDisplay || state.originalInput || "",
  ).trim();
  const isShortSimpleInput =
    !!rawInputDisplay &&
    state.inputType !== "url" &&
    rawInputDisplay.length <= 220 &&
    !rawInputDisplay.includes("\n") &&
    rawInputDisplay.split(/\s+/).filter(Boolean).length <= 35;

  // Display: do not paraphrase short/simple inputs; show verbatim.
  let title =
    (isShortSimpleInput ? rawInputDisplay : "") ||
    understanding.articleThesis ||
    understanding.impliedClaim ||
    state.originalText.split("\n")[0]?.trim().slice(0, 100) ||
    "Analyzed Content";

  if (hasMultipleContexts) {
    title += ` (${understanding.analysisContexts.length} contexts)`;
  }

  // Get the implied claim, filtering out placeholder values
  // v2.6.24: Use articleThesis for display (LLM-extracted summary)
  // impliedClaim is now the normalized input (for analysis consistency), not for display
  const displaySummary = isShortSimpleInput
    ? rawInputDisplay
    : (understanding.articleThesis || understanding.impliedClaim);
  const isValidDisplaySummary = displaySummary &&
    !displaySummary.toLowerCase().includes("unknown") &&
    displaySummary !== "<UNKNOWN>" &&
    displaySummary.length > 10;

  const articleSummary = {
    title,
    source:
      state.inputType === "url" ? state.originalInput : "User-provided text",
    mainArgument: isValidDisplaySummary
      ? displaySummary
      : (understanding.subClaims[0]?.text || "Analysis of provided content"),
    keyFindings: understanding.subClaims.slice(0, 4).map((c: any) => c.text),
    reasoning: hasMultipleContexts
      ? `Covers ${understanding.analysisContexts.length} contexts: ${understanding.analysisContexts.map((p: AnalysisContext) => p.shortName).join(", ")}`
      : `Examined ${understanding.subClaims.length} claims`,
    conclusion:
      articleAnalysis.verdictSummary?.shortAnswer ||
      (isValidDisplaySummary ? displaySummary : understanding.subClaims[0]?.text || "See claims analysis"),
  };

  const analysisId = `FH-${Date.now().toString(36).toUpperCase()}`;

  const overallVerdict = normalizePercentage(
    articleAnalysis.articleTruthPercentage ??
    articleAnalysis.verdictSummary?.truthPercentage ??
    50,
  );

  const inputUrl = state.inputType === "url" ? state.originalInput : undefined;

  // v2.6.28: Calculate confidence from verdictSummary or claims average
  let overallConfidence = 50; // Default fallback
  if (articleAnalysis.verdictSummary?.confidence != null) {
    overallConfidence = normalizePercentage(articleAnalysis.verdictSummary.confidence);
  } else if (claimVerdicts.length > 0) {
    // Fallback: average confidence from claims
    const avgClaimConfidence = claimVerdicts.reduce((sum, cv) => sum + (cv.confidence ?? 50), 0) / claimVerdicts.length;
    overallConfidence = Math.round(avgClaimConfidence);
  }

  const factharborAnalysis = {
    sourceCredibility: calculateOverallCredibility(state.sources, inputUrl),
    claimVerdicts: claimVerdicts.map((cv: ClaimVerdict) => ({
      claim:
        cv.claimText.slice(0, 80) + (cv.claimText.length > 80 ? "..." : ""),
      verdict: cv.verdict,
      truthPercentage: cv.truthPercentage,
    })),
    methodologyAssessment: generateMethodologyAssessment(
      state,
      articleAnalysis,
    ),
    overallVerdict,
    confidence: overallConfidence, // v2.6.28: Added missing confidence property
    analysisId,
  };

  return { articleSummary, factharborAnalysis };
}

function calculateOverallCredibility(
  sources: FetchedSource[],
  inputUrl?: string,
): string {
  // First, check input source credibility if URL provided
  let inputSourceInfo = "";
  if (inputUrl && inputUrl.startsWith("http")) {
    try {
      const hostname = new URL(inputUrl).hostname.replace(/^www\./, "");
      const inputScore = getTrackRecordScore(inputUrl);
      if (inputScore !== null) {
        // Symmetric 7-band scale (matches verdict scale)
        const level =
          inputScore >= 0.86
            ? "Highly Reliable"
            : inputScore >= 0.72
              ? "Reliable"
              : inputScore >= 0.58
                ? "Leaning Reliable"
                : inputScore >= 0.43
                  ? "Mixed"
                  : inputScore >= 0.29
                    ? "Leaning Unreliable"
                    : inputScore >= 0.15
                      ? "Unreliable"
                      : "Highly Unreliable";
        inputSourceInfo = `${hostname}: ${level} (${(inputScore * 100).toFixed(0)}%)`;
      } else {
        inputSourceInfo = `${hostname}: Unknown`;
      }
    } catch {
      inputSourceInfo = "Unknown source";
    }
  }

  // Then check research sources
  const withScore = sources.filter(
    (s) => s.trackRecordScore !== null && s.fetchSuccess,
  );
  if (withScore.length === 0) {
    return inputSourceInfo || "Unknown";
  }

  // PR-C: Normalize trackRecordScores before averaging
  const avg =
    withScore.reduce((sum, s) => sum + normalizeTrackRecordScore(s.trackRecordScore || 0), 0) /
    withScore.length;
  // Symmetric 7-band scale (matches verdict scale)
  const researchLevel =
    avg >= 0.86
      ? "Highly Reliable"
      : avg >= 0.72
        ? "Reliable"
        : avg >= 0.58
          ? "Leaning Reliable"
          : avg >= 0.43
            ? "Mixed"
            : avg >= 0.29
              ? "Leaning Unreliable"
              : avg >= 0.15
                ? "Unreliable"
                : "Highly Unreliable";
  const researchInfo = `Research sources: ${researchLevel} (${(avg * 100).toFixed(0)}%)`;

  if (inputSourceInfo) {
    return `${inputSourceInfo}\n${researchInfo}`;
  }
  return researchInfo;
}

function generateMethodologyAssessment(
  state: ResearchState,
  articleAnalysis: ArticleAnalysis,
): string {
  const parts: string[] = [];
  parts.push("Unified analysis mode");
  if (articleAnalysis.hasMultipleContexts)
    parts.push(`Multi-context (${articleAnalysis.analysisContexts?.length})`);
  if (articleAnalysis.verdictSummary?.hasContestedFactors)
    parts.push("Contested factors flagged");
  parts.push(`${state.searchQueries.length} searches`);
  parts.push(`${state.sources.filter((s) => s.fetchSuccess).length} sources`);
  return parts.join("; ");
}

const REPORT_DAMAGE_TRIGGER_TYPES = new Set<string>([
  "llm_provider_error",
  "structured_output_failure",
  "budget_exceeded",
  "search_provider_error",
]);

function reportDamageHintForType(type: string): string {
  switch (type) {
    case "llm_provider_error":
      return "Check LLM provider credits/quota/API key/availability and rerun after provider health is restored.";
    case "structured_output_failure":
      return "Retry with fewer claims/contexts or shorter outputs; structured output failures are often truncation-related.";
    case "budget_exceeded":
      return "Increase token/iteration budget in config or reduce scope so the full pipeline can complete.";
    case "search_provider_error":
      return "Check search provider key/quota/availability and rerun after provider health is restored.";
    case "grounding_check":
      return "Ensure verdict reasoning references concrete evidence IDs extracted from sources.";
    case "evidence_filter_degradation":
      return "Investigate evidence-filter LLM failures; heuristic fallback reduces evidence quality precision.";
    case "recency_evidence_gap":
      return "Add fresh date-anchored sources before trusting high-truth recency-sensitive verdicts.";
    default:
      return "Review warning details, fix upstream failures, and rerun analysis.";
  }
}

function synthesizeReportDamageWarning(state: ResearchState): {
  damaged: boolean;
  triggerTypes: string[];
  remediationHints: string[];
  criticalIssues: Array<{ type: string; severity: string; message: string }>;
} {
  const criticalWarnings = (state.analysisWarnings || []).filter(
    (w) =>
      (w.severity === "error" || REPORT_DAMAGE_TRIGGER_TYPES.has(w.type)) &&
      w.type !== "report_damaged",
  );
  const triggerTypes = Array.from(new Set(criticalWarnings.map((w) => w.type)));
  const remediationHints = Array.from(
    new Set(criticalWarnings.map((w) => reportDamageHintForType(w.type))),
  );
  const criticalIssues = criticalWarnings.map((w) => ({
    type: w.type,
    severity: w.severity,
    message: w.message,
  }));

  const damaged = triggerTypes.length > 0;
  if (damaged && !state.analysisWarnings.some((w) => w.type === "report_damaged")) {
    state.analysisWarnings.push({
      type: "report_damaged",
      severity: "error",
      message:
        `Analysis report integrity is degraded due to ${criticalIssues.length} critical issue(s). Treat verdicts as damaged until resolved.`,
      details: {
        triggeredWarningTypes: triggerTypes,
        issues: criticalIssues,
        remediationHints,
        recommendedNextStep:
          remediationHints[0] ||
          "Resolve critical warnings and re-run analysis before trusting verdict outputs.",
      },
    });
    debugLog("Report integrity degraded", {
      triggerTypes,
      criticalIssueCount: criticalIssues.length,
      remediationHints,
    });
  }

  return { damaged, triggerTypes, remediationHints, criticalIssues };
}

async function generateReport(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  twoPanelSummary: TwoPanelSummary,
  model: any,
  searchProvider: string,
): Promise<string> {
  const understanding = state.understanding!;
  const analysisMode = state.pipelineConfig?.analysisMode ?? DEFAULT_PIPELINE_CONFIG.analysisMode;
  const hasMultipleContexts = articleAnalysis.hasMultipleContexts;
  const useRich = CONFIG.reportStyle === "rich";
  const iconPositive = useRich ? "âœ…" : "";
  const iconNegative = useRich ? "âŒ" : "";
  const iconNeutral = useRich ? "â“" : "";
  const iconWarning = useRich ? "âš ï¸" : "";
  const iconOk = useRich ? "âœ…" : "";
  const iconFail = useRich ? "âŒ" : "";

  let report = `# FactHarbor Analysis Report\n\n`;
  report += `**Analysis ID:** ${twoPanelSummary.factharborAnalysis.analysisId}\n`;
  report += `**Schema:** ${CONFIG.schemaVersion}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Executive Summary (moved to top - public-facing content first)
  report += `## Executive Summary\n\n`;

  // Unified summary for all inputs (input neutrality)
    const verdictEmoji =
      articleAnalysis.articleTruthPercentage >= VERDICT_BANDS.MOSTLY_TRUE
        ? iconPositive
        : articleAnalysis.articleTruthPercentage >= VERDICT_BANDS.MIXED
          ? iconNeutral
          : iconNegative;

    report += `### Article Verdict: ${verdictEmoji} ${percentageToArticleVerdict(articleAnalysis.articleTruthPercentage)} (${articleAnalysis.articleTruthPercentage}%)\n\n`;

    if (articleAnalysis.articleVerdictReason) {
      report += `> ${articleAnalysis.articleVerdictReason}\n\n`;
    }

    if (articleAnalysis.articleThesis &&
        articleAnalysis.articleThesis !== "<UNKNOWN>" &&
        !articleAnalysis.articleThesis.toLowerCase().includes("unknown")) {
      report += `**Implied Claim:** ${articleAnalysis.articleThesis}\n\n`;
    }

    if (articleAnalysis.keyFactors && articleAnalysis.keyFactors.length > 0) {
      report += `**Key Factors:**\n`;
      for (const f of articleAnalysis.keyFactors) {
        const icon =
          f.supports === "yes"
            ? iconPositive
            : f.supports === "no"
              ? iconNegative
              : iconNeutral;
        report += `- ${icon} ${f.factor}${f.isContested ? ` ${iconWarning} CONTESTED` : ""}\n`;
      }
      report += `\n`;
  }

  // Claims
  report += `## Claims\n\n`;
  for (const cv of claimVerdicts) {
    // 7-level scale emoji mapping based on truthPercentage
    const emoji =
      cv.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE
        ? iconPositive
        : cv.truthPercentage >= VERDICT_BANDS.MIXED
          ? iconNeutral
          : iconNegative;

    const cvConfidence = cv.confidence ?? 0;
    report += `**${cv.claimId}:** ${cv.claimText} ${emoji} ${percentageToClaimVerdict(cv.truthPercentage, cvConfidence)} (${cv.truthPercentage}% truth)\n\n`;
  }

  // Sources
  report += `## Sources\n\n`;
  for (const s of state.sources) {
    const status = s.fetchSuccess ? iconOk : iconFail;
    report += `- ${status} [${s.title}](${s.url})`;
    if (s.trackRecordScore)
      report += ` (${(s.trackRecordScore * 100).toFixed(0)}%)`;
    report += `\n`;
  }

  // Technical Notes (moved to bottom - development/technical info)
  report += `\n---\n\n`;
  report += `## Technical Notes\n\n`;
  report += `### Research Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `| --- | --- |\n`;
  report += `| Web searches | ${state.searchQueries.length} |\n`;
  report += `| LLM calls | ${state.llmCalls} |\n`;
  report += `| Sources fetched | ${state.sources.length} |\n`;
  report += `| Sources successful | ${state.sources.filter((s: FetchedSource) => s.fetchSuccess).length} |\n`;
  report += `| Evidence extracted | ${state.evidenceItems.length} |\n`;
  report += `| Search provider | ${searchProvider} |\n`;
  report += `| Analysis mode | ${analysisMode} |\n\n`;

  if (state.searchQueries.length > 0) {
    report += `### Web Search Queries\n\n`;
    for (const sq of state.searchQueries) {
      report += `- \`${sq.query}\` â†’ ${sq.resultsCount} results (${sq.focus})\n`;
    }
    report += `\n`;
  }

  const fallbackSummary = state.fallbackTracker.hasFallbacks()
    ? state.fallbackTracker.getSummary()
    : null;
  if (fallbackSummary) {
    const fallbackReport = formatFallbackReportMarkdown(fallbackSummary);
    if (fallbackReport) {
      report += `\n${fallbackReport}\n`;
    }
  }

  if (state.analysisWarnings.length > 0) {
    report += `\n### Analysis Quality Warnings\n\n`;
    for (const warning of state.analysisWarnings) {
      report += `- [${warning.severity.toUpperCase()}] ${warning.type}: ${warning.message}\n`;
      const issues = Array.isArray((warning.details as any)?.issues)
        ? (warning.details as any).issues
        : [];
      if (issues.length > 0) {
        for (const issue of issues.slice(0, 5)) {
          report += `  - issue: ${issue.type} (${issue.severity}) â€” ${issue.message}\n`;
        }
      }
      const hints = Array.isArray((warning.details as any)?.remediationHints)
        ? (warning.details as any).remediationHints
        : [];
      if (hints.length > 0) {
        for (const hint of hints.slice(0, 3)) {
          report += `  - hint: ${hint}\n`;
        }
      }
      const recommended = String((warning.details as any)?.recommendedNextStep || "").trim();
      if (recommended) {
        report += `  - next step: ${recommended}\n`;
      }
    }
    report += `\n`;
  }

  return report;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
  jobId?: string;
};

export async function runFactHarborAnalysis(input: AnalysisInput) {
  // Clear debug log at start of each analysis
  clearDebugLog();
  debugLog("=== ANALYSIS STARTED ===");
  debugLog("Input", {
    jobId: input.jobId || "",
    inputType: input.inputType,
    inputValue: input.inputValue.substring(0, 200),
  });

  const startTime = Date.now();
  const emit = input.onEvent ?? (() => {});

  // ============================================================================
  // P0: Initialize Fallback Tracker for LLM classification monitoring
  // ============================================================================
  const fallbackTracker = new FallbackTracker();

  // ============================================================================
  // Phase 2a: Initialize Evidence Processor Modules
  // ============================================================================
  const evidenceDeduplicator = new EvidenceDeduplicator(0.85, assessTextSimilarityBatch);
  const evidenceNormalizer = new EvidenceNormalizer(fallbackTracker);
  const recencyAssessor = new RecencyAssessor();

  // ============================================================================
  // v2.9.0 Phase 3: Initialize SR service (interface-based modularity)
  // ============================================================================
  const srService = getDefaultSRService();
  srService.clearCache(); // Clear prefetched data at start of analysis

  // ============================================================================
  // v2.9.0: Load unified configuration from DB/env/defaults
  // This replaces direct env reads with hot-reload capable UCM config
  // ============================================================================
  const analyzerConfig = await getAnalyzerConfig({ jobId: input.jobId });
  const pipelineConfig = analyzerConfig.pipeline;
  const searchConfig = analyzerConfig.search;
  const calcConfig = analyzerConfig.calc;

  debugLog("[Config] Loaded analyzer config", {
    source: analyzerConfig.source,
    pipelineHash: analyzerConfig.hashes.pipeline,
    calcHash: analyzerConfig.hashes.calc,
    llmTiering: pipelineConfig.llmTiering,
    analysisMode: pipelineConfig.analysisMode,
  });

  // Apply CalcConfig to module-level verdict scale
  MIXED_CONFIDENCE_THRESHOLD = calcConfig.mixedConfidenceThreshold;
  // VERDICT_BANDS: system constant from truth-scale.ts, not overridden by CalcConfig.
  // Apply CalcConfig to claim clustering
  if (calcConfig.claimClustering) {
    CLAIM_CLUSTERING_CONFIG = {
      jaccardSimilarityThreshold: calcConfig.claimClustering.jaccardSimilarityThreshold,
      duplicateWeightShare: calcConfig.claimClustering.duplicateWeightShare,
    };
  }
  // Apply CalcConfig to context similarity weights
  if (calcConfig.contextSimilarity) {
    CONTEXT_SIMILARITY_CONFIG = {
      nameWeight: calcConfig.contextSimilarity.nameWeight,
      primaryMetadataWeight: calcConfig.contextSimilarity.primaryMetadataWeight,
      assessedStatementWeight: calcConfig.contextSimilarity.assessedStatementWeight,
      subjectWeight: calcConfig.contextSimilarity.subjectWeight,
      secondaryMetadataWeight: calcConfig.contextSimilarity.secondaryMetadataWeight,
      nearDuplicateAssessedThreshold: calcConfig.contextSimilarity.nearDuplicateAssessedThreshold,
      nearDuplicateForceScore: calcConfig.contextSimilarity.nearDuplicateForceScore,
      nearDuplicateSubjectGuardThreshold: calcConfig.contextSimilarity.nearDuplicateSubjectGuardThreshold ?? 0.5,
      nearDuplicateNameGuardThreshold: calcConfig.contextSimilarity.nearDuplicateNameGuardThreshold ?? 0.4,
      nearDuplicateMinNameSim: calcConfig.contextSimilarity.nearDuplicateMinNameSim ?? 0.25,
      nearDuplicateMinPrimarySim: calcConfig.contextSimilarity.nearDuplicateMinPrimarySim ?? 0.15,
      anchorRecoveryThreshold: calcConfig.contextSimilarity.anchorRecoveryThreshold ?? 0.6,
      fallbackEvidenceCapPercent: calcConfig.contextSimilarity.fallbackEvidenceCapPercent ?? 40,
    };
  }
  // Apply CalcConfig to fallback graduation
  if (calcConfig.fallback) {
    FALLBACK_CONFIG = {
      step1RelaxInstitution: calcConfig.fallback.step1RelaxInstitution,
      step2RelevanceFloor: calcConfig.fallback.step2RelevanceFloor,
      step3BroadEnabled: calcConfig.fallback.step3BroadEnabled,
    };
  }
  // Apply CalcConfig to claim decomposition limits
  if (calcConfig.claimDecomposition) {
    MIN_CORE_CLAIMS_PER_PROCEEDING = calcConfig.claimDecomposition.minCoreClaimsPerContext;
    MIN_TOTAL_CLAIMS_WITH_SINGLE_CORE = calcConfig.claimDecomposition.minTotalClaimsWithSingleCore;
    SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS = calcConfig.claimDecomposition.supplementalRepromptMaxAttempts;
    SHORT_SIMPLE_INPUT_MAX_CHARS = calcConfig.claimDecomposition.shortSimpleInputMaxChars;
    MIN_DIRECT_CLAIMS_PER_CONTEXT = calcConfig.claimDecomposition.minDirectClaimsPerContext;
  }

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

  // ============================================================================
  // v2.9.0 Phase 2: Capture config snapshot for job auditability
  // Capture complete resolved config (DB + env overrides) asynchronously
  // ============================================================================
  const srSummary = getSRConfigSummary(srConfig);

  // Only capture snapshot if jobId is provided
  const snapshotPromise = input.jobId
    ? captureConfigSnapshotAsync(
        input.jobId,
        pipelineConfig,
        searchConfig,
        srSummary
      )
    : Promise.resolve(); // No-op if no jobId

  const config = getActiveConfig(pipelineConfig);
  const mode = pipelineConfig.analysisMode;

  const tieringEnabled = pipelineConfig.llmTiering;

  const understandModelInfo = getModelForTask("understand", undefined, pipelineConfig);
  const extractEvidenceModelInfo = getModelForTask("extract_evidence", undefined, pipelineConfig);
  const verdictModelInfo = getModelForTask("verdict", undefined, pipelineConfig);

  const provider = verdictModelInfo.provider;
  const modelName = verdictModelInfo.modelName;
  const model = verdictModelInfo.model;

  debugLog(
    `LLM Provider: ${provider}; Models: understand=${understandModelInfo.modelName}, extract=${extractEvidenceModelInfo.modelName}, verdict=${verdictModelInfo.modelName}`,
  );
  console.log(
    `[Analyzer] Using LLM provider: ${provider}; understand=${understandModelInfo.modelName}, extract=${extractEvidenceModelInfo.modelName}, verdict=${verdictModelInfo.modelName}`,
  );

  const llmLabel = tieringEnabled
    ? `${provider} (understand=${understandModelInfo.modelName}, extract=${extractEvidenceModelInfo.modelName}, verdict=${verdictModelInfo.modelName})`
    : `${provider}/${modelName}`;

  await emit(`Analysis mode: ${mode} (v${CONFIG.schemaVersion}) | LLM: ${llmLabel}`, 2);

  // ==========================================================================
  // Input handling:
  // Keep user phrasing intact for analysis. Do not rewrite question/statement form.
  // ==========================================================================
  const rawInputValue = input.inputValue.trim();
  const analysisInputValue = rawInputValue;

  // Store original input for UI display (will be set in understanding.originalInputDisplay)
  const originalInputDisplay = rawInputValue;

  console.log(`[Analyzer] Input handling: preserving user phrasing`);
  console.log(`[Analyzer]   Original: "${rawInputValue.substring(0, 100)}"`);
  console.log(`[Analyzer]   Analysis input: "${analysisInputValue.substring(0, 100)}"`);

  // Initialize budget tracker (PR 6: p95 Hardening)
  const budget = getBudgetConfig(pipelineConfig);
  const budgetTracker = createBudgetTracker();
  console.log(`[Budget] Initialized: maxIterationsPerContext=${budget.maxIterationsPerContext}, maxTotalIterations=${budget.maxTotalIterations}, maxTotalTokens=${budget.maxTotalTokens}`);

  // ==========================================================================
  // External Prompt File System: Load prompt and track version per job
  // ==========================================================================
  let promptContentHash: string | null = null;
  let promptLoadedUtc: string | null = null;
  try {
    const pipelineName: Pipeline = "orchestrated";
    const promptResult = await loadPromptFile(pipelineName);
    if (promptResult.success && promptResult.prompt) {
      promptContentHash = promptResult.prompt.contentHash;
      promptLoadedUtc = promptResult.prompt.loadedAt;

      // Record usage for this job
      if (input.jobId) {
        await recordConfigUsage(
          input.jobId,
          "prompt",
          pipelineName,
          promptResult.prompt.contentHash,
        ).catch((err) => {
          console.warn(
            `[Prompt-Tracking] Failed to record prompt usage: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }

      console.log(`[Prompt-Tracking] Loaded orchestrated prompt v${promptResult.prompt.frontmatter.version} (hash: ${promptContentHash?.substring(0, 12)}...)`);
      if (promptResult.warnings.length > 0) {
        console.warn(`[Prompt-Tracking] Warnings:`, promptResult.warnings);
      }
    } else {
      console.warn(`[Prompt-Tracking] Failed to load orchestrated prompt file:`, promptResult.errors);
    }
  } catch (err: any) {
    console.warn(`[Prompt-Tracking] Error loading prompt file (non-fatal): ${err?.message}`);
  }

  const state: ResearchState = {
    originalInput: analysisInputValue,
    originalText: "",
    inputType: input.inputType,
    understanding: null,
    iterations: [],
    evidenceItems: [],
    sources: [],
    contradictionSearchPerformed: false,
    contradictionSourcesFound: 0,
    searchQueries: [], // NEW v2.4.3
    llmCalls: 0, // NEW v2.6.6
    researchQueriesSearched: new Set(), // NEW v2.6.18
    decisionMakerSearchPerformed: false, // NEW v2.6.18
    recentClaimsSearched: false, // NEW v2.6.22
    centralClaimsSearched: new Set(),
    inverseClaimSearchPerformed: false, // NEW v2.6.29
    budget, // NEW PR 6: p95 hardening
    budgetTracker, // NEW PR 6: p95 hardening
    pipelineConfig, // NEW v2.9.0: Hot-reload support
    searchConfig, // NEW v2.10.0: Hot-reload support
    calcConfig, // NEW v3.1: UCM-configurable calculation weights, bands, gates
    fallbackTracker, // P0: LLM classification fallback tracking
    analysisWarnings: [], // P0: Analysis warnings for verdict direction validation
    evidenceFilterLlmFailures: 0, // P3: Track evidence filter LLM failures
    processedUrls: new Set(), // Pipeline Phase 1: URL deduplication across iterations
    urlDeduplicationCount: 0, // Pipeline Phase 1: Track deduplicated URL count
    lastIterationNovelEvidenceCount: 0, // Pipeline Phase 1: Gap research stop condition
    gapResearchIterations: 0, // Pipeline Phase 1: Gap research iteration counter
    totalGapQueriesIssued: 0, // Pipeline Phase 1: Total gap queries issued
  };

  // Handle URL
  let textToAnalyze = analysisInputValue;
  if (input.inputType === "url") {
    await emit("Fetching URL content", 3);
    try {
      const result = await extractTextFromUrl(input.inputValue, {
        pdfParseTimeoutMs:
          pipelineConfig?.pdfParseTimeoutMs ?? DEFAULT_PIPELINE_CONFIG.pdfParseTimeoutMs,
      });
      // Handle both old (string) and new (object) return types
      textToAnalyze = typeof result === "string" ? result : result.text;
    } catch (err) {
      throw new Error(`Failed to fetch URL: ${err}`);
    }
  }
  state.originalText = textToAnalyze;

  // STEP 1: Understand
  debugLog("=== STEP 1: UNDERSTAND CLAIM ===");
  debugLog("Text to analyze (first 300 chars)", textToAnalyze.substring(0, 300));
  await emit(`Step 1: Analyzing input [LLM: ${understandModelInfo.provider}/${understandModelInfo.modelName}]`, 5);
  const step1Start = Date.now();
  try {
    debugLog("Calling understandClaim...");
    state.understanding = await understandClaim(textToAnalyze, understandModelInfo.model, state.pipelineConfig);
    state.llmCalls++; // understandClaim uses 1 LLM call

    // UI-only: preserve original input text for display.
    state.understanding.originalInputDisplay = originalInputDisplay;

    const step1Elapsed = Date.now() - step1Start;
    debugLog(`Step 1 completed in ${step1Elapsed}ms`);
    debugLog("Understanding result", {
      detectedInputType: state.understanding?.detectedInputType,
      subClaimsCount: state.understanding?.subClaims?.length,
      researchQueriesCount: state.understanding?.researchQueries?.length,
    });
    console.log(`[Analyzer] Step 1 completed in ${step1Elapsed}ms`);
    if (step1Elapsed < 2000) {
      debugLog(`WARNING: Step 1 completed too fast (${step1Elapsed}ms). LLM call may have failed silently.`);
      console.warn(`[Analyzer] WARNING: Step 1 completed too fast (${step1Elapsed}ms). LLM call may have failed silently.`);
    }
  } catch (err: any) {
    debugLog("!!! STEP 1 FAILED !!!", err?.message || String(err));
    console.error(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.error(`[Analyzer] STEP 1 FAILED - understandClaim threw an error!`);
    console.error(`[Analyzer] Error message:`, err?.message || err);
    console.error(`[Analyzer] Full error:`, err);
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);

    // Re-throw if it's a critical API error so the user knows
    const errMsg = err?.message || String(err);
    if (errMsg.includes("credit balance") || errMsg.includes("insufficient_quota") || errMsg.includes("API")) {
      throw err; // Don't swallow API errors
    }

    state.understanding = {
      detectedInputType: "claim",
      analysisIntent: "none",
      originalInputDisplay: "",
      impliedClaim: "",
      analysisContexts: [],
      requiresSeparateAnalysis: false,
      backgroundDetails: "",
      mainThesis: textToAnalyze.slice(0, 200),
      articleThesis: textToAnalyze.slice(0, 200),
      subClaims: [
        {
          id: "C1",
          text: textToAnalyze.slice(0, 200),
          type: "factual",
          claimRole: "core",
          dependsOn: [],
          keyEntities: [],
          checkWorthiness: "high",
          harmPotential: "medium",
          centrality: "high",
          isCentral: true,
          thesisRelevance: "direct",
          thesisRelevanceConfidence: 100,
          isCounterClaim: false, // Fallback claims are thesis-aligned
          contextId: "",
          approximatePosition: "",
          keyFactorId: "",
        },
      ],
      distinctEvents: [],
      legalFrameworks: [],
      researchQueries: [],
      riskTier: "B",
      keyFactors: [],
    };
  }

  // P0: Normalize claim classifications with fallback tracking
  if (state.understanding?.subClaims) {
    state.understanding.subClaims = normalizeClaimClassifications(
      state.understanding.subClaims,
      state.fallbackTracker,
      "Claim"
    );
  }

  // Decontextualized harmPotential: re-classify using ONLY claim texts (no article/topic context).
  // This prevents frame contamination where topic domain causes over-classification to HIGH.
  if (state.understanding?.subClaims?.length > 0) {
    const harmResults = await classifyHarmPotentialDecontextualized(
      state.understanding.subClaims,
      understandModelInfo.model,
      state.pipelineConfig,
    );
    state.llmCalls++;
    for (let i = 0; i < state.understanding.subClaims.length; i++) {
      const original = state.understanding.subClaims[i].harmPotential;
      const decontextualized = harmResults[i];
      if (original !== decontextualized) {
        debugLog(`[HarmClassify] Claim #${i + 1} harmPotential: ${original} → ${decontextualized}`, {
          claimText: state.understanding.subClaims[i].text.substring(0, 100),
        });
      }
      state.understanding.subClaims[i].harmPotential = decontextualized;
      // Update isCentral if it was derived from harmPotential (it's from centrality, not harm, so no change needed)
    }
  }

  const contextCount = state.understanding.analysisContexts.length;
  let statusMsg = `Detected: ${state.understanding.detectedInputType.toUpperCase()} with ${state.understanding.subClaims.length} claims`;
  if (contextCount > 1) statusMsg += ` | ${contextCount} CONTEXTS`;
  await emit(statusMsg, 10);

  // STEP 2-4: Research with search tracking
  // Scale iteration budget for multi-context analyses: the base maxResearchIterations
  // is a per-context floor, not a global ceiling. Multi-context jobs need enough
  // iterations for context research + mandatory searches (contradiction, inverse claim).
  // Cap at 2× base to prevent runaway cost.
  const mandatorySearchSlots = 2; // contradiction + inverse claim
  const effectiveMaxIterations = Math.max(
    config.maxResearchIterations,
    Math.min(contextCount + mandatorySearchSlots, config.maxResearchIterations * 2),
  );
  let iteration = 0;
  while (
    iteration < effectiveMaxIterations &&
    state.sources.length < config.maxTotalSources
  ) {
    iteration++;

    // PR 6: Budget enforcement - check GLOBAL total iteration limit
    // CRITICAL FIX: Check global limit directly (not per-context check with constant)
    // Previous bug: used checkContextIterationBudget with "GLOBAL_RESEARCH" constant,
    // which applied maxIterationsPerContext (3) to entire research, causing premature termination
    if (state.budgetTracker.totalIterations >= state.budget.maxTotalIterations) {
      const reason = `Total iterations reached max: ${state.budgetTracker.totalIterations}/${state.budget.maxTotalIterations}`;
      console.warn(`[Budget] ${reason}`);
      markBudgetExceeded(state.budgetTracker, reason);
      await emit(
        `âš ï¸ Budget limit reached: ${reason}`,
        Math.round(10 + (iteration / effectiveMaxIterations) * 50),
      );
      break;
    }

    // Record this iteration (increments totalIterations counter)
    // Note: Per-context limits enforced separately when researching specific contexts
    recordIteration(state.budgetTracker, `ITER_${iteration}`);

    const baseProgress = Math.round(10 + (iteration / effectiveMaxIterations) * 50);

    const decision = decideNextResearch(state);
    if (decision.complete) {
      await emit(
        `Research complete: ${state.evidenceItems.length} evidence items, ${state.searchQueries.length} searches`,
        baseProgress,
      );
      break;
    }

    let focusMsg = `Step 2.${iteration}: ${decision.focus}`;
    if (decision.targetContextId)
      focusMsg += ` [${decision.targetContextId}]`;
    await emit(focusMsg, baseProgress);

    if (decision.isContradictionSearch)
      state.contradictionSearchPerformed = true;

    // NEW v2.6.29: Track inverse claim search (counter-evidence)
    if (decision.category === "counter_evidence")
      state.inverseClaimSearchPerformed = true;

    // NEW v2.6.18: Track decision-maker and research query searches
    if (decision.category === "conflict_of_interest")
      state.decisionMakerSearchPerformed = true;
    // NEW v2.6.22: Track claim-level recency searches
    if (decision.focus?.startsWith("Recent claim:"))
      state.recentClaimsSearched = true;
    // NEW: Track central-claim targeted searches
    if (decision.category === "central_claim" && decision.targetClaimId) {
      state.centralClaimsSearched.add(decision.targetClaimId);
    }
    if (decision.category === "research_query") {
      // Mark all matching research queries as searched
      const researchQueries = state.understanding?.researchQueries || [];
      researchQueries.forEach((q, idx) => {
        if (decision.focus?.includes(q.slice(0, 30))) {
          state.researchQueriesSearched.add(idx);
        }
      });
      // Also just mark the next one as searched to avoid infinite loops
      const nextIdx = Array.from({ length: researchQueries.length }, (_, i) => i)
        .find(i => !state.researchQueriesSearched.has(i));
      if (nextIdx !== undefined) state.researchQueriesSearched.add(nextIdx);
    }

    // Check if search is enabled
    if (!searchConfig.enabled) {
      await emit(
        `âš ï¸ Search disabled (UCM search.enabled=false)`,
        baseProgress + 1,
      );
      state.searchQueries.push({
        query: decision.queries?.[0] || "search disabled",
        iteration,
        focus: decision.focus!,
        resultsCount: 0,
        timestamp: new Date().toISOString(),
        searchProvider: "Disabled",
      });
      continue;
    }

    // =========================================================================
    // GROUNDED SEARCH MODE: Use Gemini's built-in Google Search
    // =========================================================================
    if (
      searchConfig.mode === "grounded" &&
      isGroundedSearchAvailable(state.pipelineConfig?.llmProvider)
    ) {
      await emit(
        `\u{1F50D} Using Gemini Grounded Search for: "${decision.focus}"`,
        baseProgress + 1,
      );

      const groundedResult = await searchWithGrounding({
        prompt: decision.focus || "",
        context: state.originalInput || state.originalText || "",
      });

      if (groundedResult.groundingUsed && groundedResult.sources.length > 0) {
        console.log(`[Analyzer] Grounded search found ${groundedResult.sources.length} URL candidates`);

        // PR-B: Ground Realism hardening
        // Fetch the URLs provided by grounded search (don't use synthetic content)
        await emit(`Fetching ${groundedResult.sources.length} grounded sources`, baseProgress + 2);

      // Pipeline Phase 1: Apply URL deduplication to grounded search results
      const validGroundedSources = groundedResult.sources.filter(s => s.url && s.url.trim().length > 0);
      const groundedUrlCandidates = evidenceDeduplicator.filterDuplicateUrls(validGroundedSources, state)
          .slice(0, searchConfig.maxSourcesPerIteration);

        if (groundedUrlCandidates.length === 0) {
          console.warn(`[Analyzer] Grounded search returned no valid URLs - falling back to standard search`);
          // Fall through to standard search
        } else {
          // Prefetch source reliability scores for grounded URLs
          const groundedUrls = groundedUrlCandidates.map(c => c.url);
          const groundedDomains = groundedUrls.map(u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } });
          const uniqueGroundedDomains = [...new Set(groundedDomains)];
          const domainPreview = uniqueGroundedDomains.length <= 3
            ? uniqueGroundedDomains.join(', ')
            : `${uniqueGroundedDomains.slice(0, 3).join(', ')} +${uniqueGroundedDomains.length - 3} more`;
          await emit(`\u{1F4CA} Checking source reliability (${uniqueGroundedDomains.length}): ${domainPreview}`, baseProgress + 3);
          // v2.9.0: Use SR service interface
          await srService.prefetch(groundedUrls);

          // Fetch URLs just like standard search sources
          const fetchPromises = groundedUrlCandidates.map((candidate, i) =>
            fetchSource(
              candidate.url,
              `S${state.sources.length + i + 1}`,
              "grounded_search",
              decision.focus!,
              state.pipelineConfig,
            ),
          );
          const fetchedSources = await Promise.all(fetchPromises);
          const validSources = fetchedSources.filter(
            (s): s is FetchedSource => s !== null,
          );
          state.sources.push(...validSources);

          const successfulSources = validSources.filter((s) => s.fetchSuccess);
          await emit(
            `  â†’ ${successfulSources.length}/${validSources.length} grounded sources fetched successfully`,
            baseProgress + 4,
          );

          // Track the search
          state.searchQueries.push({
            query: groundedResult.searchQueries[0] || decision.focus!,
            iteration,
            focus: decision.focus!,
            resultsCount: successfulSources.length,
            timestamp: new Date().toISOString(),
            searchProvider: "Gemini-Grounded",
          });

          // Pipeline Phase 1: Parallel evidence extraction from grounded sources
          if (successfulSources.length > 0) {
            await emit(
              `Extracting evidence items from ${successfulSources.length} grounded sources (parallel)`,
              baseProgress + 6,
            );
            const parallelResult = await extractEvidenceParallel(
              successfulSources,
              {
                focus: decision.focus!,
                model: extractEvidenceModelInfo.model,
                contexts: state.understanding!.analysisContexts,
                targetContextId: decision.targetContextId,
                originalClaim: state.understanding?.impliedClaim || state.originalInput,
                fromOppositeClaimSearch: undefined,
                pipelineConfig: state.pipelineConfig,
                evidenceFilterConfig: state.calcConfig.evidenceFilter,
                claimSimilarityThreshold: state.calcConfig.deduplication.claimSimilarityThreshold,
              },
              state.evidenceItems,
            );
            state.evidenceItems.push(...parallelResult.evidenceItems);
            state.evidenceFilterLlmFailures += parallelResult.llmFilterFailures;
            state.llmCalls += parallelResult.telemetry.llmCallCount;
            console.log(`[Analyzer] Parallel extraction from ${successfulSources.length} grounded sources: ${parallelResult.telemetry.durationMs}ms`);
          }

          // Continue to next iteration (skip standard search)
          state.iterations.push({
            number: iteration,
            focus: decision.focus!,
            queries: groundedResult.searchQueries,
            sourcesFound: successfulSources.length,
            evidenceItemsExtracted: state.evidenceItems.length,
          });
          continue;
        }
      } else {
        console.log(`[Analyzer] Grounded search did not return results, falling back to standard search`);
        await emit(`âš ï¸ Grounded search unavailable, using standard search`, baseProgress + 1);
      }
    }

    // =========================================================================
    // STANDARD SEARCH MODE: Use SerpAPI / Google CSE
    // =========================================================================

    // Perform searches and track them
    const searchResults: Array<WebSearchResult & { query: string }> = [];
    for (const query of decision.queries || []) {
      // Pipeline Phase 1: Use LLM-derived temporalContext when available, fallback to pattern-based
      const temporalContext = state.understanding?.temporalContext;
      const queryRecencySensitive = recencyAssessor.isRecencySensitive(
        query,
        state.understanding || undefined,
        state.pipelineConfig?.recencyCueTerms,
      );
      const categoryUsesBroadRecency =
        decision.category === "criticism" ||
        decision.category === "counter_evidence" ||
        decision.category === "central_claim" ||
        decision.category === "conflict_of_interest";
      let recencyMatters =
        queryRecencySensitive ||
        (!!decision.recencyMatters && categoryUsesBroadRecency);
      let dateRestrict: "y" | "m" | "w" | undefined = searchConfig.dateRestrict ?? undefined;

      const temporalConfThreshold = state.pipelineConfig.temporalConfidenceThreshold ?? 0.6;
      if (temporalContext?.isRecencySensitive && temporalContext.confidence > temporalConfThreshold) {
        // Use LLM-determined temporal context where recency filtering meaningfully applies.
        const applyTemporalRestriction = categoryUsesBroadRecency || queryRecencySensitive;
        recencyMatters = recencyMatters || applyTemporalRestriction;
        if (!dateRestrict && applyTemporalRestriction) {
          switch (temporalContext.granularity) {
            case "week": dateRestrict = "w"; break;
            case "month": dateRestrict = "m"; break;
            case "year": dateRestrict = "y"; break;
            default: dateRestrict = undefined;
          }
        }
      } else if (!dateRestrict && recencyMatters) {
        // Fallback to pattern-based default (year)
        dateRestrict = "y";
      }

      // Get providers before search to show in event
      const searchProviders = getActiveSearchProviders(searchConfig).join("+");
      const dateFilterMsg = dateRestrict ? ` [filtering: past ${dateRestrict === "y" ? "year" : dateRestrict === "m" ? "month" : "week"}]` : "";
      await emit(
        `\u{1F50D} Searching [${searchProviders}]${dateFilterMsg}: "${query}"`,
        baseProgress + 1,
      );

      try {
        // Use higher maxResults for criticism/counter_evidence queries for more diverse sources
        const isCriticismQuery = decision.category === "criticism" || decision.category === "counter_evidence";
        const effectiveMaxResults = isCriticismQuery
          ? (state.pipelineConfig.searchMaxResultsCriticism ?? searchConfig.maxResults)
          : searchConfig.maxResults;
        const searchResponse = await searchWebWithProvider({
          query,
          maxResults: effectiveMaxResults,
          dateRestrict,
          domainWhitelist: searchConfig.domainWhitelist,
          domainBlacklist: searchConfig.domainBlacklist,
          timeoutMs: searchConfig.timeoutMs,
          config: searchConfig,
        });
        let results = searchResponse.results;
        const actualProviders = searchResponse.providersUsed.join("+");
        console.log(`[Analyzer] Search used: ${actualProviders}, returned ${results.length} results`);

        // Surface search provider errors as analysis warnings
        if (searchResponse.errors && searchResponse.errors.length > 0) {
          for (const err of searchResponse.errors) {
            console.error(`[Analyzer] âŒ SEARCH PROVIDER ERROR: ${err.provider} (HTTP ${err.status ?? "N/A"}): ${err.message}`);
            state.analysisWarnings.push({
              type: "search_provider_error",
              severity: "error",
              message: `Search provider ${err.provider} returned fatal error: ${err.message}`,
              details: { provider: err.provider, status: err.status, fatal: err.fatal },
            });
            if (err.fatal) recordProviderFailure("search", err.message);
          }
          await emit(`  âš ï¸ Search provider error: ${searchResponse.errors.map(e => `${e.provider} HTTP ${e.status ?? "?"}`).join(", ")}`, baseProgress + 2);
        } else if (results.length > 0) {
          recordProviderSuccess("search");
        }

        // Track the search with provider info (include error if present)
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: results.length,
          timestamp: new Date().toISOString(),
          searchProvider: searchConfig.provider,
          ...(searchResponse.errors?.length ? { error: searchResponse.errors.map(e => e.message).join("; ") } : {}),
        });

        searchResults.push(...results.map((r: any) => ({ ...r, query })));
        await emit(`  â†’ ${results.length} results`, baseProgress + 2);
      } catch (err) {
        await emit(`  â†’ Search failed: ${err}`, baseProgress + 2);
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: 0,
          timestamp: new Date().toISOString(),
          searchProvider: searchConfig.provider,
          error: String(err),
        });
      }
    }

    // Pipeline Phase 1: URL deduplication with normalization across iterations
    // First filter out results with empty URLs
    const validUrlResults = searchResults.filter((r) => r.url && r.url.trim().length > 0);
    // Apply cross-iteration deduplication using normalized URLs
    const deduplicatedResults = evidenceDeduplicator.filterDuplicateUrls(validUrlResults, state);
    // Preserve provider relevance ordering, limit to max sources per iteration
    const uniqueResults = selectDiverseSearchResultsByQuery(
      deduplicatedResults,
      searchConfig.maxSourcesPerIteration,
    );

    // Task 2.2: Heuristic relevance pre-filter to remove obvious irrelevance before extraction
    const analysisContexts = state.understanding?.analysisContexts || [];
    const entityStrForRelevance =
      state.understanding?.impliedClaim ||
      state.understanding?.articleThesis ||
      state.originalInput ||
      "";
    const hasInstitutionalContext = analysisContexts.some((context: any) => {
      const meta = context?.metadata || {};
      return Boolean(meta.institution || meta.court || meta.regulatoryBody);
    });

    const requireContextMatch =
      decision.category === "criticism" ||
      decision.isContradictionSearch === true ||
      !!decision.targetContextId ||
      (decision.category === "evidence" && hasInstitutionalContext);
    // Criticism/counter-evidence searches use MODERATE mode (not STRICT) to allow
    // secondary commentary through. For legal/political topics, news analysis and
    // commentary are often the primary counter-evidence sources. STRICT institution
    // matching would reject them. Context relevance is still enforced via requireContextMatch.
    const strictInstitutionMatch =
      !!decision.targetContextId ||
      (decision.category === "evidence" && hasInstitutionalContext);
    const allowInstitutionFallback = !(
      !!decision.targetContextId ||
      (decision.category === "evidence" && hasInstitutionalContext)
    );

    let relevantResults: typeof uniqueResults = [];

    // Domain pre-filter (structural â€” no semantic decision)
    const domainFilteredResults = uniqueResults.filter((result) => {
      const domain = extractDomain(result.url || "");
      if (domain && !isImportantSource(domain)) {
        debugLog("Pre-filter rejected", {
          url: result.url,
          title: result.title,
          reason: "low_importance_domain",
          domain,
          query: (result as any).query,
        });
        return false;
      }
      return true;
    });

    // LLM-powered batch relevance assessment (replaces heuristic + LLM escalation)
    if (domainFilteredResults.length > 0) {
      const batchResults = await assessSearchRelevanceBatch(
        domainFilteredResults,
        entityStrForRelevance,
        analysisContexts,
        { requireContextMatch, strictInstitutionMatch, allowInstitutionFallback },
        state.pipelineConfig,
      );
      state.llmCalls += 1;

      for (let i = 0; i < domainFilteredResults.length; i++) {
        const result = domainFilteredResults[i];
        const check = batchResults.get(`r${i}`);
        if (check?.isRelevant) {
          relevantResults.push(result);
        } else {
          debugLog("Pre-filter rejected", {
            url: result.url,
            title: result.title,
            reason: check?.reason || "llm_not_relevant",
            classification: check?.classification,
            query: (result as any).query,
          });
        }
      }
    }

    const adaptiveMinCandidates = state.pipelineConfig.searchAdaptiveFallbackMinCandidates ?? 5;
    const adaptiveMaxQueries = state.pipelineConfig.searchAdaptiveFallbackMaxQueries ?? 2;

    // Search retry before fallback: retry original queries with modified terms
    // before triggering the graduated fallback, to reduce search variance impact.
    const shouldRetryBeforeFallback =
      (state.pipelineConfig.searchRetryBeforeFallback ?? true) &&
      adaptiveMinCandidates > 0 &&
      (requireContextMatch || strictInstitutionMatch) &&
      relevantResults.length < adaptiveMinCandidates &&
      (decision.queries || []).length > 0;

    if (shouldRetryBeforeFallback) {
      const retryTerms = ["evidence", "analysis"];
      const retrySuffix = retryTerms[iteration % retryTerms.length];
      const retryQueries = (decision.queries || []).slice(0, 2).map(
        (q: string) => `${q} ${retrySuffix}`,
      );
      debugLog("search_retry_before_fallback", { retryQueries, currentCandidates: relevantResults.length });

      for (const query of retryQueries) {
        try {
          const searchResponse = await searchWebWithProvider({
            query,
            maxResults: searchConfig.maxResults,
            dateRestrict: searchConfig.dateRestrict ?? undefined,
            domainWhitelist: searchConfig.domainWhitelist,
            domainBlacklist: searchConfig.domainBlacklist,
            timeoutMs: searchConfig.timeoutMs,
            config: searchConfig,
          });
          const results = searchResponse.results || [];

          // Surface search provider errors
          if (searchResponse.errors?.length) {
            for (const sErr of searchResponse.errors) {
              state.analysisWarnings.push({
                type: "search_provider_error",
                severity: "error",
                message: `Search provider ${sErr.provider} returned fatal error: ${sErr.message}`,
                details: { provider: sErr.provider, status: sErr.status, fatal: sErr.fatal },
              });
              if (sErr.fatal) recordProviderFailure("search", sErr.message);
            }
          } else if (results.length > 0) {
            recordProviderSuccess("search");
          }

          state.searchQueries.push({
            query,
            iteration,
            focus: `${decision.focus || "retry"} [retry_before_fallback]`,
            resultsCount: results.length,
            timestamp: new Date().toISOString(),
            searchProvider: searchConfig.provider,
            ...(searchResponse.errors?.length ? { error: searchResponse.errors.map(e => e.message).join("; ") } : {}),
          });

          // Evaluate retry results with ORIGINAL strictness (not relaxed)
          const newRetryResults: typeof uniqueResults = [];
          for (const result of results) {
            const normalizedUrl = evidenceDeduplicator.normalizeUrl(String((result as any).url || ""));
            const existingUrl = relevantResults.some(
              (r) => evidenceDeduplicator.normalizeUrl(String((r as any).url || "")) === normalizedUrl,
            );
            if (!existingUrl) {
              newRetryResults.push({ ...result, query } as typeof uniqueResults[number]);
            }
          }
          if (newRetryResults.length > 0) {
            const retryBatch = await assessSearchRelevanceBatch(
              newRetryResults,
              entityStrForRelevance,
              analysisContexts,
              { requireContextMatch, strictInstitutionMatch, allowInstitutionFallback: true },
              state.pipelineConfig,
            );
            state.llmCalls += 1;
            for (let ri = 0; ri < newRetryResults.length; ri++) {
              if (retryBatch.get(`r${ri}`)?.isRelevant) {
                relevantResults.push(newRetryResults[ri]);
              }
            }
          }
        } catch (err) {
          debugLog("search_retry_query_failed", {
            query,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const adaptiveApplies =
      adaptiveMinCandidates > 0 &&
      (requireContextMatch || strictInstitutionMatch) &&
      relevantResults.length < adaptiveMinCandidates;

    if (adaptiveApplies) {
      const initiallyKept = relevantResults.length;
      const primaryResultCount = relevantResults.length;
      const selectedUrlKeys = new Set(relevantResults.map((r) => evidenceDeduplicator.normalizeUrl(String((r as any).url || ""))));

      // Graduated fallback: 3 steps of increasing relaxation (RC1 fix)
      // Step 1: Relax institution match only, keep context match.
      // This allows results from different institutions about the same context.
      if (FALLBACK_CONFIG.step1RelaxInstitution) {
        const step1Candidates = uniqueResults.filter((result) => {
          const normalizedUrl = evidenceDeduplicator.normalizeUrl(String((result as any).url || ""));
          if (selectedUrlKeys.has(normalizedUrl)) return false;
          const domain = extractDomain(result.url || "");
          if (domain && !isImportantSource(domain)) return false;
          return true;
        });
        if (step1Candidates.length > 0) {
          const step1Batch = await assessSearchRelevanceBatch(
            step1Candidates,
            entityStrForRelevance,
            analysisContexts,
            { requireContextMatch: true, strictInstitutionMatch: false, allowInstitutionFallback: true },
            state.pipelineConfig,
          );
          state.llmCalls += 1;
          for (let si = 0; si < step1Candidates.length; si++) {
            if (step1Batch.get(`r${si}`)?.isRelevant) {
              const result = step1Candidates[si];
              (result as any)._isFallback = true;
              (result as any)._fallbackStep = 1;
              relevantResults.push(result);
              selectedUrlKeys.add(evidenceDeduplicator.normalizeUrl(String((result as any).url || "")));
            }
          }
        }
        debugLog("adaptive_fallback_step1", {
          focus: decision.focus,
          before: initiallyKept,
          after: relevantResults.length,
          added: relevantResults.length - initiallyKept,
        });
      }

      // Step 2: Relax context match too, but apply relevance floor.
      // Only accept results that still have meaningful entity overlap.
      if (relevantResults.length < adaptiveMinCandidates) {
        const step2Before = relevantResults.length;
        const step2Candidates = uniqueResults.filter((result) => {
          const normalizedUrl = evidenceDeduplicator.normalizeUrl(String((result as any).url || ""));
          if (selectedUrlKeys.has(normalizedUrl)) return false;
          const domain = extractDomain(result.url || "");
          if (domain && !isImportantSource(domain)) return false;
          return true;
        });
        if (step2Candidates.length > 0) {
          const step2Batch = await assessSearchRelevanceBatch(
            step2Candidates,
            entityStrForRelevance,
            analysisContexts,
            { requireContextMatch: false, strictInstitutionMatch: false, allowInstitutionFallback: true },
            state.pipelineConfig,
          );
          state.llmCalls += 1;
          for (let si = 0; si < step2Candidates.length; si++) {
            if (step2Batch.get(`r${si}`)?.isRelevant) {
              const result = step2Candidates[si];
              (result as any)._isFallback = true;
              (result as any)._fallbackStep = 2;
              relevantResults.push(result);
              selectedUrlKeys.add(evidenceDeduplicator.normalizeUrl(String((result as any).url || "")));
            }
          }
        }
        debugLog("adaptive_fallback_step2", {
          focus: decision.focus,
          before: step2Before,
          after: relevantResults.length,
          added: relevantResults.length - step2Before,
        });
      }

      let fallbackQueriesUsed: string[] = [];
      // Step 3: Broad fallback queries (last resort, only if enabled).
      if (relevantResults.length < adaptiveMinCandidates && adaptiveMaxQueries > 0 && FALLBACK_CONFIG.step3BroadEnabled) {
        const step3Before = relevantResults.length;
        const fallbackQueries = buildAdaptiveFallbackQueries({
          entityText: entityStrForRelevance,
          focus: decision.focus,
          category: decision.category,
          originalQueries: decision.queries || [],
          maxQueries: adaptiveMaxQueries,
          currentYear: new Date().getFullYear(),
        });
        fallbackQueriesUsed = fallbackQueries;

        if (fallbackQueries.length > 0) {
          await emit(
            `\u{1F501} Adaptive fallback step 3: broad search (${relevantResults.length}/${adaptiveMinCandidates} candidates)`,
            baseProgress + 2,
          );
        }

        const fallbackSearchResults: Array<WebSearchResult & { query: string }> = [];
        for (const query of fallbackQueries) {
          try {
            const searchResponse = await searchWebWithProvider({
              query,
              maxResults: searchConfig.maxResults,
              dateRestrict: searchConfig.dateRestrict ?? undefined,
              domainWhitelist: searchConfig.domainWhitelist,
              domainBlacklist: searchConfig.domainBlacklist,
              timeoutMs: searchConfig.timeoutMs,
              config: searchConfig,
            });
            const results = searchResponse.results || [];
            fallbackSearchResults.push(...results.map((r: any) => ({ ...r, query })));

            // Surface search provider errors
            if (searchResponse.errors?.length) {
              for (const sErr of searchResponse.errors) {
                state.analysisWarnings.push({
                  type: "search_provider_error",
                  severity: "error",
                  message: `Search provider ${sErr.provider} returned fatal error: ${sErr.message}`,
                  details: { provider: sErr.provider, status: sErr.status, fatal: sErr.fatal },
                });
                if (sErr.fatal) recordProviderFailure("search", sErr.message);
              }
            } else if (results.length > 0) {
              recordProviderSuccess("search");
            }

            state.searchQueries.push({
              query,
              iteration,
              focus: `${decision.focus || "adaptive_fallback"} [adaptive_fallback]`,
              resultsCount: results.length,
              timestamp: new Date().toISOString(),
              searchProvider: searchConfig.provider,
              ...(searchResponse.errors?.length ? { error: searchResponse.errors.map(e => e.message).join("; ") } : {}),
            });
          } catch (err) {
            state.searchQueries.push({
              query,
              iteration,
              focus: `${decision.focus || "adaptive_fallback"} [adaptive_fallback]`,
              resultsCount: 0,
              timestamp: new Date().toISOString(),
              searchProvider: searchConfig.provider,
              error: String(err),
            });
            debugLog("Adaptive fallback query failed", {
              query,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        if (fallbackSearchResults.length > 0) {
          const fallbackCandidates = selectDiverseSearchResultsByQuery(
            evidenceDeduplicator.filterDuplicateUrls(
              fallbackSearchResults.filter((r) => r.url && r.url.trim().length > 0),
              state,
            ),
            searchConfig.maxSourcesPerIteration,
          );

          const step3Filtered = fallbackCandidates.filter((result) => {
            const normalizedUrl = evidenceDeduplicator.normalizeUrl(String((result as any).url || ""));
            if (selectedUrlKeys.has(normalizedUrl)) return false;
            const domain = extractDomain(result.url || "");
            if (domain && !isImportantSource(domain)) return false;
            return true;
          });
          if (step3Filtered.length > 0) {
            const step3Batch = await assessSearchRelevanceBatch(
              step3Filtered,
              entityStrForRelevance,
              analysisContexts,
              { requireContextMatch: false, strictInstitutionMatch: false, allowInstitutionFallback: true },
              state.pipelineConfig,
            );
            state.llmCalls += 1;
            for (let si = 0; si < step3Filtered.length; si++) {
              if (step3Batch.get(`r${si}`)?.isRelevant) {
                const result = step3Filtered[si];
                (result as any)._isFallback = true;
                (result as any)._fallbackStep = 3;
                relevantResults.push(result);
                selectedUrlKeys.add(evidenceDeduplicator.normalizeUrl(String((result as any).url || "")));
              }
            }
          }
        }
        debugLog("adaptive_fallback_step3", {
          focus: decision.focus,
          before: step3Before,
          after: relevantResults.length,
          added: relevantResults.length - step3Before,
        });
      }

      // Apply fallback evidence cap: limit fallback-sourced results to capPercent of total
      const capPercent = CONTEXT_SIMILARITY_CONFIG.fallbackEvidenceCapPercent ?? 40;
      const fallbackResults = relevantResults.filter((r) => (r as any)._isFallback);
      const maxFallbackCount = Math.max(1, Math.floor(relevantResults.length * capPercent / 100));
      if (fallbackResults.length > maxFallbackCount) {
        // Remove excess fallback results (keep earliest/most relevant, remove from end)
        const toRemove = fallbackResults.length - maxFallbackCount;
        // Sort fallback by step (higher step = less relevant), remove highest-step first
        const sortedFallback = fallbackResults
          .map((r, idx) => ({ r, idx: relevantResults.indexOf(r), step: (r as any)._fallbackStep || 3 }))
          .sort((a, b) => b.step - a.step || b.idx - a.idx);
        const removeIndices = new Set(sortedFallback.slice(0, toRemove).map((s) => s.idx));
        const cappedResults = relevantResults.filter((_, idx) => !removeIndices.has(idx));
        relevantResults.length = 0;
        relevantResults.push(...cappedResults);
        debugLog("adaptive_fallback_cap_applied", {
          focus: decision.focus,
          fallbackCount: fallbackResults.length,
          maxFallback: maxFallbackCount,
          removed: toRemove,
          finalTotal: relevantResults.length,
        });
      }

      debugLog("adaptive_fallback_triggered", {
        focus: decision.focus,
        category: decision.category,
        minCandidates: adaptiveMinCandidates,
        initialCandidates: initiallyKept,
        primaryResults: primaryResultCount,
        finalCandidates: relevantResults.length,
        addedCandidates: Math.max(0, relevantResults.length - initiallyKept),
        fallbackQueriesUsed,
      });
    }

    if (relevantResults.length === 0) {
      state.iterations.push({
        number: iteration,
        focus: decision.focus!,
        queries: decision.queries!,
        sourcesFound: 0,
        evidenceItemsExtracted: state.evidenceItems.length,
      });
      continue;
    }

    await emit(`Fetching ${relevantResults.length} sources`, baseProgress + 3);

    // Prefetch source reliability scores (async batch operation)
    const urlsToFetch = relevantResults.map((r: any) => r.url);
    const domainsToFetch = urlsToFetch.map((u: string) => {
      try {
        return new URL(u).hostname.replace(/^www\./, '');
      } catch {
        return u;
      }
    });
    const uniqueDomainsToFetch = [...new Set(domainsToFetch)];
    const domainPreview2 = uniqueDomainsToFetch.length <= 3
      ? uniqueDomainsToFetch.join(', ')
      : `${uniqueDomainsToFetch.slice(0, 3).join(', ')} +${uniqueDomainsToFetch.length - 3} more`;
    await emit(`\u{1F4CA} Checking source reliability (${uniqueDomainsToFetch.length}): ${domainPreview2}`, baseProgress + 4);
    // v2.9.0: Use SR service interface
    await srService.prefetch(urlsToFetch);

    const fetchPromises = relevantResults.map((r: any, i: number) =>
      fetchSource(
        r.url,
        `S${state.sources.length + i + 1}`,
        decision.category || "general",
        r.query,
        state.pipelineConfig,
      ),
    );
    const fetchedSources = await Promise.all(fetchPromises);
    const validSources = fetchedSources.filter(
      (s): s is FetchedSource => s !== null,
    );
    state.sources.push(...validSources);

    const successfulSources = validSources.filter((s) => s.fetchSuccess);
    await emit(
      `  â†’ ${successfulSources.length}/${validSources.length} fetched successfully`,
      baseProgress + 5,
    );

    if (decision.isContradictionSearch)
      state.contradictionSourcesFound = successfulSources.length;

    await emit(
      `Extracting evidence items (parallel) [LLM: ${extractEvidenceModelInfo.provider}/${extractEvidenceModelInfo.modelName}]`,
      baseProgress + 8,
    );
    const extractStart = Date.now();
    // v2.6.29: Mark evidence items from counter_evidence category as fromOppositeClaimSearch
    const isOppositeClaimSearch = decision.category === "counter_evidence";
    // Pipeline Phase 1: Parallel evidence extraction
    const parallelResult = await extractEvidenceParallel(
      successfulSources,
      {
        focus: decision.focus!,
        model: extractEvidenceModelInfo.model,
        contexts: state.understanding!.analysisContexts,
        targetContextId: decision.targetContextId,
        originalClaim: state.understanding?.impliedClaim || state.originalInput,
        fromOppositeClaimSearch: isOppositeClaimSearch,
        pipelineConfig: state.pipelineConfig,
        evidenceFilterConfig: state.calcConfig.evidenceFilter,
        claimSimilarityThreshold: state.calcConfig.deduplication.claimSimilarityThreshold,
      },
      state.evidenceItems,
    );
    // Pipeline Phase 1: Track novel evidence count for gap research stop condition
    const novelEvidenceCount = parallelResult.evidenceItems.length;
    state.lastIterationNovelEvidenceCount = novelEvidenceCount;
    state.evidenceItems.push(...parallelResult.evidenceItems);
    state.evidenceFilterLlmFailures += parallelResult.llmFilterFailures;
    state.llmCalls += parallelResult.telemetry.llmCallCount;
    const extractElapsed = Date.now() - extractStart;
    console.log(`[Analyzer] Evidence extraction for iteration ${iteration} completed in ${extractElapsed}ms for ${successfulSources.length} sources (parallel, ${novelEvidenceCount} novel)`);

    state.iterations.push({
      number: iteration,
      focus: decision.focus!,
      queries: decision.queries!,
      sourcesFound: successfulSources.length,
      evidenceItemsExtracted: state.evidenceItems.length,
    });
    await emit(
      `Iteration ${iteration}: ${state.evidenceItems.length} evidence items from ${state.sources.length} sources (${extractElapsed}ms)`,
      baseProgress + 12,
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Pipeline Phase 1: Gap-driven research continuation
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //
  // BUDGET DESIGN DECISION:
  // Gap research uses a SEPARATE, bounded query budget (gapResearchMaxQueries)
  // that runs AFTER the main research phase completes. This is intentional:
  //
  // 1. The main budget (state.budget/budgetTracker) controls the primary research
  //    phase including iteration limits and token caps
  // 2. Gap research is a supplemental "gap-filling" phase with its own limits
  // 3. gapResearchMaxQueries is additive to main research, not shared
  // 4. This ensures critical HIGH centrality claims without evidence get
  //    targeted follow-up even if main budget is exhausted
  //
  // If gap research should share the main budget instead, integrate via:
  //   - Check checkTokenBudget() before gap queries
  //   - Deduct gap iterations from state.budgetTracker.totalIterations
  //
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Gap research configuration - now configurable via PipelineConfig
  const maxGapIterations = state.pipelineConfig.gapResearchMaxIterations ?? 2;
  const maxGapQueriesTotal = state.pipelineConfig.gapResearchMaxQueries ?? 8;
  const enableGapDrivenResearch = state.pipelineConfig.gapResearchEnabled ?? true;

  if (enableGapDrivenResearch && state.understanding) {
    await emit("Analyzing evidence gaps", 55);
    for (let gapIter = 0; gapIter < maxGapIterations; gapIter++) {
      // Stop if prior iteration produced no novel evidence
      if (gapIter > 0 && state.lastIterationNovelEvidenceCount === 0) {
        console.log(`[Analyzer] Gap research: Stopping - prior iteration produced no novel evidence`);
        break;
      }

      const gaps = await analyzeEvidenceGaps(
        state.evidenceItems,
        state.understanding,
        state.searchQueries,
        state.pipelineConfig.evidenceSimilarityThreshold ?? 0.4
      );
      const criticalGaps = gaps.filter((g) => g.severity === "critical" || g.severity === "high");

      if (criticalGaps.length === 0) {
        console.log(`[Analyzer] Gap research: No critical/high gaps found after iteration ${gapIter}`);
        break;
      }

      // Generate and bound queries
      const gapQueries = criticalGaps.flatMap((g) => g.suggestedQueries);
      const remainingBudget = Math.max(0, maxGapQueriesTotal - state.totalGapQueriesIssued);
      const boundedQueries = gapQueries.slice(0, remainingBudget);

      if (boundedQueries.length === 0) {
        console.log(`[Analyzer] Gap research: Query budget exhausted (${state.totalGapQueriesIssued}/${maxGapQueriesTotal})`);
        break;
      }

      console.log(`[Analyzer] Gap research iteration ${gapIter + 1}: ${criticalGaps.length} gaps, ${boundedQueries.length} queries`);
      state.gapResearchIterations++;
      state.totalGapQueriesIssued += boundedQueries.length;

      // Execute gap-driven search (using first query as representative)
      const gapSearchResults: any[] = [];
      for (const query of boundedQueries.slice(0, 2)) { // Limit to 2 queries per gap iteration
        try {
          const searchResponse = await searchWebWithProvider({
            query,
            maxResults: searchConfig.maxResults,
            domainWhitelist: searchConfig.domainWhitelist,
            domainBlacklist: searchConfig.domainBlacklist,
            timeoutMs: searchConfig.timeoutMs,
            config: searchConfig,
          });
          const results = searchResponse.results;
          gapSearchResults.push(...results.map((r: any) => ({ ...r, query })));

          // Surface search provider errors
          if (searchResponse.errors?.length) {
            for (const sErr of searchResponse.errors) {
              state.analysisWarnings.push({
                type: "search_provider_error",
                severity: "error",
                message: `Search provider ${sErr.provider} returned fatal error: ${sErr.message}`,
                details: { provider: sErr.provider, status: sErr.status, fatal: sErr.fatal },
              });
              if (sErr.fatal) recordProviderFailure("search", sErr.message);
            }
          } else if (results.length > 0) {
            recordProviderSuccess("search");
          }

          state.searchQueries.push({
            query,
            iteration: state.iterations.length + 1,
            focus: "gap_research",
            resultsCount: results.length,
            timestamp: new Date().toISOString(),
            searchProvider: searchConfig.provider,
            ...(searchResponse.errors?.length ? { error: searchResponse.errors.map(e => e.message).join("; ") } : {}),
          });
        } catch (err) {
          console.warn(`[Analyzer] Gap research search failed: ${err}`);
          state.searchQueries.push({
            query,
            iteration: state.iterations.length + 1,
            focus: "gap_research",
            resultsCount: 0,
            timestamp: new Date().toISOString(),
            searchProvider: searchConfig.provider,
            error: String(err),
          });
        }
      }

      // Deduplicate and fetch sources
      const deduplicatedGapResults = selectDiverseSearchResultsByQuery(
        evidenceDeduplicator.filterDuplicateUrls(
        gapSearchResults.filter((r) => r.url && r.url.trim().length > 0),
        state,
        ),
        searchConfig.maxSourcesPerIteration,
      );

      const gapAnalysisContexts = state.understanding?.analysisContexts || [];
      const gapEntity = state.understanding?.impliedClaim || state.originalInput || state.originalText || "";

      // Domain pre-filter (structural)
      const gapDomainFiltered = deduplicatedGapResults.filter((result) => {
        const gapDomain = extractDomain(result.url || "");
        if (gapDomain && !isImportantSource(gapDomain)) {
          debugLog("Gap pre-filter rejected", {
            url: result.url,
            title: result.title,
            reason: "low_importance_domain",
            domain: gapDomain,
            query: (result as any).query,
          });
          return false;
        }
        return true;
      });

      // LLM-powered batch relevance for gap results
      const relevantGapResults: typeof deduplicatedGapResults = [];
      if (gapDomainFiltered.length > 0) {
        const gapBatch = await assessSearchRelevanceBatch(
          gapDomainFiltered,
          gapEntity,
          gapAnalysisContexts,
          { requireContextMatch: true, strictInstitutionMatch: true, allowInstitutionFallback: false },
          state.pipelineConfig,
        );
        state.llmCalls += 1;
        for (let gi = 0; gi < gapDomainFiltered.length; gi++) {
          const result = gapDomainFiltered[gi];
          const check = gapBatch.get(`r${gi}`);
          if (check?.isRelevant) {
            relevantGapResults.push(result);
          } else {
            debugLog("Gap pre-filter rejected", {
              url: result.url,
              title: result.title,
              reason: check?.reason || "not_relevant",
              query: (result as any).query,
            });
          }
        }
      }

      if (relevantGapResults.length === 0) {
        console.log(`[Analyzer] Gap research: No relevant URLs found`);
        continue;
      }

      // Fetch and extract
      const gapFetchPromises = relevantGapResults.map((r: any, i: number) =>
        fetchSource(r.url, `GS${state.sources.length + i + 1}`, "gap_research", r.query, state.pipelineConfig)
      );
      const gapFetchedSources = await Promise.all(gapFetchPromises);
      const gapValidSources = gapFetchedSources.filter((s): s is FetchedSource => s !== null);
      state.sources.push(...gapValidSources);

      const gapSuccessfulSources = gapValidSources.filter((s) => s.fetchSuccess);
      if (gapSuccessfulSources.length > 0) {
        const gapExtractResult = await extractEvidenceParallel(
          gapSuccessfulSources,
          {
            focus: "gap_research",
            model: extractEvidenceModelInfo.model,
            contexts: state.understanding!.analysisContexts,
            originalClaim: state.understanding?.impliedClaim || state.originalInput,
            pipelineConfig: state.pipelineConfig,
            evidenceFilterConfig: state.calcConfig.evidenceFilter,
            claimSimilarityThreshold: state.calcConfig.deduplication.claimSimilarityThreshold,
          },
          state.evidenceItems,
        );
        state.lastIterationNovelEvidenceCount = gapExtractResult.evidenceItems.length;
        state.evidenceItems.push(...gapExtractResult.evidenceItems);
        state.evidenceFilterLlmFailures += gapExtractResult.llmFilterFailures;
        state.llmCalls += gapExtractResult.telemetry.llmCallCount;
        console.log(`[Analyzer] Gap research: Added ${gapExtractResult.evidenceItems.length} evidence items from ${gapSuccessfulSources.length} sources`);
      }
    }

    if (state.gapResearchIterations > 0) {
      console.log(
        `[Telemetry] Gap research: ${state.gapResearchIterations} iterations, ` +
        `${state.totalGapQueriesIssued} queries issued`
      );
    }
  }

  // Phase 1.5: Aggregate claimDirection telemetry across all iterations
  if (state.evidenceItems.length > 0) {
    const totalEvidenceItems = state.evidenceItems.length;
    const evidenceItemsWithClaimDirection = state.evidenceItems.filter(
      (item) => item.claimDirection && item.claimDirection !== undefined,
    ).length;
    const missingRate = Math.round(
      100 * (totalEvidenceItems - evidenceItemsWithClaimDirection) / totalEvidenceItems,
    );

    if (evidenceItemsWithClaimDirection < totalEvidenceItems) {
      console.warn(
        `[Telemetry] AGGREGATE claimDirection: ${evidenceItemsWithClaimDirection}/${totalEvidenceItems} have direction ` +
        `(${missingRate}% missing)`
      );
    } else {
      console.log(
        `[Telemetry] AGGREGATE claimDirection: 100% coverage (${totalEvidenceItems}/${totalEvidenceItems} evidence items)`
      );
    }

    // Break down by direction value
    const byDirection = {
      supports: state.evidenceItems.filter((item) => item.claimDirection === "supports").length,
      contradicts: state.evidenceItems.filter((item) => item.claimDirection === "contradicts").length,
      neutral: state.evidenceItems.filter((item) => item.claimDirection === "neutral").length,
    };
    console.log(
      `[Telemetry] claimDirection breakdown: ` +
      `supports=${byDirection.supports}, contradicts=${byDirection.contradicts}, neutral=${byDirection.neutral}`
    );
  }

  // Pipeline Phase 1: URL deduplication telemetry
  if (state.urlDeduplicationCount > 0 || state.processedUrls.size > 0) {
    const refetchRate = state.urlDeduplicationCount > 0
      ? Math.round(100 * state.urlDeduplicationCount / (state.processedUrls.size + state.urlDeduplicationCount))
      : 0;
    console.log(
      `[Telemetry] URL deduplication: ${state.processedUrls.size} unique URLs processed, ` +
      `${state.urlDeduplicationCount} duplicates skipped (${refetchRate}% re-fetch rate avoided)`
    );
  }

  // STEP 4.4: Evidence-driven context refinement (fixes under-split / asymmetric context detection)
  await emit(
    `Refining contexts from evidence [LLM: ${extractEvidenceModelInfo.provider}/${extractEvidenceModelInfo.modelName}]`,
    60,
  );
  const contextRefineStart = Date.now();
  const contextRefine = await refineContextsFromEvidence(state, extractEvidenceModelInfo.model);
  state.llmCalls += contextRefine.llmCalls;
  if (contextRefine.updated) {
    debugLog("refineContextsFromEvidence: applied", {
      contextCount: state.understanding?.analysisContexts?.length ?? 0,
      contextIds: (state.understanding?.analysisContexts || []).map((p: any) => p.id),
      requiresSeparateAnalysis: state.understanding?.requiresSeparateAnalysis,
      subClaimsCount: state.understanding?.subClaims?.length ?? 0,
    });
  }
  debugLog(`refineContextsFromEvidence: completed in ${Date.now() - contextRefineStart}ms`, {
    updated: contextRefine.updated,
    llmCalls: contextRefine.llmCalls,
  });

  const anchorPruneInput =
    state.understanding?.impliedClaim ||
    state.originalInput ||
    state.originalText ||
    "";
  const anchorPrune = await pruneWeakAnchorContexts(
    state.understanding!,
    state.evidenceItems,
    anchorPruneInput,
  );
  if (anchorPrune.droppedContextIds.length > 0) {
    state.understanding = anchorPrune.understanding;
    debugLog("Context drift guard: dropped low-anchor contexts", {
      droppedContextIds: anchorPrune.droppedContextIds,
      remainingContextIds: (state.understanding.analysisContexts || []).map((c: any) => c.id),
      remainingContextCount: state.understanding.analysisContexts?.length ?? 0,
    });
  }

  // STEP 4.5: Post-research outcome extraction - extract outcomes from evidence and create claims
  await emit(
    `Extracting outcomes from research [LLM: ${extractEvidenceModelInfo.provider}/${extractEvidenceModelInfo.modelName}]`,
    62,
  );
  const outcomeClaims = await extractOutcomeClaimsFromEvidence(state, extractEvidenceModelInfo.model);
  if (outcomeClaims.length > 0) {
    state.understanding!.subClaims.push(...outcomeClaims);
    normalizeSubClaimsImportance(state.understanding!.subClaims as any);
    // Pass thesis to detect foreign response claims that should be tangential
    const thesis = state.understanding!.impliedClaim || state.understanding!.articleThesis || state.originalInput;
    state.understanding!.subClaims = applyThesisRelevancePolicyBToSubClaims(
      await enforceThesisRelevanceInvariants(
        validateThesisRelevance(state.understanding!.subClaims as any, state.pipelineConfig) as any,
        thesis,
      ) as any,
    ) as any;
    console.log(`[Analyzer] Added ${outcomeClaims.length} outcome-related claims from research`);
    await emit(`Added ${outcomeClaims.length} outcome-related claims`, 63);
  }

  // STEP 4.6: Enrich contexts with outcomes discovered in evidence (generic LLM-based)
  // This updates "pending"/"unknown" outcomes with actual outcomes found in evidence
  await emit(
    `Enriching contexts with discovered outcomes [LLM: ${extractEvidenceModelInfo.provider}/${extractEvidenceModelInfo.modelName}]`,
    64,
  );
  await enrichContextsWithOutcomes(state, extractEvidenceModelInfo.model);

  // Deterministic backstop for the Context Relevance Requirement:
  // 1) if we're already in multi-context mode, place any unassigned (direct/tangential) claims into a special UNASSIGNED context
  // 2) prune contexts that have zero claims AND zero evidence, and recompute requiresSeparateAnalysis.
  state.understanding = await ensureUnassignedClaimsContext(state.understanding!);
  state.understanding = pruneContextsByCoverage(state.understanding!, state.evidenceItems);
  state.understanding = ensureAtLeastOneContext(state.understanding!);
  validateContextReferences(state.understanding!, state.evidenceItems);

  // P0: Normalize evidence classifications with fallback tracking before verdict generation
  if (state.evidenceItems.length > 0) {
    state.evidenceItems = evidenceNormalizer.normalizeClassifications(
      state.evidenceItems,
      "Evidence"
    );
  }

  // STEP 5: Verdicts
  await emit(`Step 3: Generating verdicts [LLM: ${provider}/${modelName}]`, 65);
  const verdictStart = Date.now();
  let claimVerdicts: ClaimVerdict[];
  let articleAnalysis: ArticleAnalysis;
  let verdictSummary: VerdictSummary | undefined;
  try {
    ({ claimVerdicts, articleAnalysis, verdictSummary } = await generateVerdicts(state, model));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debugLog("runFactHarborAnalysis: generateVerdicts ERROR", {
      error: msg,
      name: err instanceof Error ? err.name : typeof err,
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 20).join("\n") : undefined,
    });

    // Generic backstop: some provider/SDK failures manifest as transient TypeErrors.
    // Retry once to avoid failing the entire job on an intermittent structured-output issue.
    if (err instanceof TypeError) {
      await emit("Verdict generation hit an internal error; retrying once", 66);
      ({ claimVerdicts, articleAnalysis, verdictSummary } = await generateVerdicts(state, model));
    } else {
      throw err;
    }
  }
  const verdictElapsed = Date.now() - verdictStart;
  console.log(`[Analyzer] Verdict generation completed in ${verdictElapsed}ms`);

  // P0: Normalize KeyFactor classifications with fallback tracking
  if (articleAnalysis?.keyFactors && articleAnalysis.keyFactors.length > 0) {
    articleAnalysis.keyFactors = normalizeKeyFactorClassifications(
      articleAnalysis.keyFactors,
      state.fallbackTracker,
      "KeyFactor"
    );
  }

  // Phase 2.5: Confidence calibration (Session 25)
  // Apply multi-layer deterministic calibration to reduce confidence instability.
  // Runs BEFORE recency/low-source penalties so those can further reduce from calibrated baseline.
  const calConfig = state.pipelineConfig.confidenceCalibration;
  if (calConfig && calConfig.enabled !== false) {
    const calibrationConfig: ConfidenceCalibrationConfig = {
      enabled: true,
      densityAnchor: {
        enabled: calConfig.densityAnchor?.enabled !== false,
        minConfidenceBase: calConfig.densityAnchor?.minConfidenceBase ?? 15,
        minConfidenceMax: calConfig.densityAnchor?.minConfidenceMax ?? 60,
        sourceCountThreshold: calConfig.densityAnchor?.sourceCountThreshold ?? 5,
      },
      bandSnapping: {
        enabled: calConfig.bandSnapping?.enabled !== false,
        strength: calConfig.bandSnapping?.strength ?? 0.7,
        customBands: calConfig.bandSnapping?.customBands,
      },
      verdictCoupling: {
        enabled: calConfig.verdictCoupling?.enabled !== false,
        strongVerdictThreshold: calConfig.verdictCoupling?.strongVerdictThreshold ?? 70,
        minConfidenceStrong: calConfig.verdictCoupling?.minConfidenceStrong ?? 50,
        minConfidenceNeutral: calConfig.verdictCoupling?.minConfidenceNeutral ?? 25,
      },
      contextConsistency: {
        enabled: calConfig.contextConsistency?.enabled !== false,
        maxConfidenceSpread: calConfig.contextConsistency?.maxConfidenceSpread ?? 25,
        reductionFactor: calConfig.contextConsistency?.reductionFactor ?? 0.5,
      },
    };

    // Calibrate verdictSummary confidence
    if (verdictSummary?.confidence != null) {
      const contextAnswers = verdictSummary.analysisContextAnswers ?? [];
      const calResult = calibrateConfidence(
        verdictSummary.confidence,
        verdictSummary.truthPercentage ?? verdictSummary.answer ?? 50,
        state.evidenceItems,
        state.sources,
        contextAnswers,
        calibrationConfig,
      );
      if (calResult.adjustments.length > 0) {
        debugLog("Confidence calibration applied to verdictSummary", {
          before: verdictSummary.confidence,
          after: calResult.calibratedConfidence,
          adjustments: calResult.adjustments,
          warnings: calResult.warnings,
        });
        verdictSummary.confidence = calResult.calibratedConfidence;
      }
      if (calResult.warnings.length > 0) {
        state.analysisWarnings.push({
          type: "confidence_calibration",
          severity: "info",
          message: `Confidence calibrated: ${calResult.adjustments.map(a => a.type).join(", ")}`,
          details: {
            adjustments: calResult.adjustments,
            warnings: calResult.warnings,
          },
        });
      }
    }

    // Layer 5: Grounding check â€” validate verdict reasoning against cited evidence
    if (claimVerdicts.length > 0 && state.evidenceItems.length > 0) {
      const groundingResult = await checkVerdictGrounding(claimVerdicts, state.evidenceItems);
      debugLog("Grounding check result", {
        groundingRatio: groundingResult.groundingRatio.toFixed(2),
        warnings: groundingResult.warnings,
        details: groundingResult.verdictDetails.map(d => ({
          claimId: d.claimId,
          ratio: d.ratio.toFixed(2),
          hasCitedEvidence: d.hasCitedEvidence,
        })),
      });

      // Apply grounding penalty to verdictSummary confidence (UCM-configurable)
      const groundingPenaltyConfig = state.calcConfig.groundingPenalty ?? DEFAULT_GROUNDING_PENALTY_CONFIG;
      if (verdictSummary?.confidence != null) {
        const gp = applyGroundingPenalty(
          verdictSummary.confidence,
          groundingResult.groundingRatio,
          groundingPenaltyConfig,
        );
        if (gp.applied) {
          debugLog("Grounding penalty applied to verdictSummary", {
            before: verdictSummary.confidence,
            after: gp.adjustedConfidence,
            penalty: gp.penalty,
            groundingRatio: groundingResult.groundingRatio.toFixed(2),
          });
          verdictSummary.confidence = gp.adjustedConfidence;
        }
      }

      // Surface grounding degradation warning if LLM adjudication failed
      if (groundingResult.degraded) {
        state.analysisWarnings.push({
          type: "grounding_check_degraded",
          severity: "warning",
          message: `Grounding adjudication LLM failed; using conservative fallback ratios (0.5). Grounding penalties may be inaccurate.`,
          details: {
            groundingRatio: groundingResult.groundingRatio,
            verdictCount: claimVerdicts.length,
          },
        });
      }

      // Log grounding warnings
      if (groundingResult.warnings.length > 0) {
        state.analysisWarnings.push({
          type: "grounding_check",
          severity: "warning",
          message: `Grounding ratio: ${(groundingResult.groundingRatio * 100).toFixed(0)}% \u2013 ${groundingResult.warnings.length} verdict(s) with low evidence grounding`,
          details: {
            groundingRatio: groundingResult.groundingRatio,
            warnings: groundingResult.warnings,
          },
        });
      }
    }

    // Calibrate articleAnalysis verdictSummary confidence
    if (articleAnalysis?.verdictSummary?.confidence != null) {
      const contextAnswers = articleAnalysis.verdictSummary.analysisContextAnswers ?? [];
      const calResult = calibrateConfidence(
        articleAnalysis.verdictSummary.confidence,
        articleAnalysis.verdictSummary.truthPercentage ?? articleAnalysis.verdictSummary.answer ?? 50,
        state.evidenceItems,
        state.sources,
        contextAnswers,
        calibrationConfig,
      );
      if (calResult.adjustments.length > 0) {
        articleAnalysis.verdictSummary.confidence = calResult.calibratedConfidence;
      }
    }
  }

  // Phase 3: Recency validation for time-sensitive claims
  const temporalContext = state.understanding?.temporalContext;
  const temporalConfThreshold = state.pipelineConfig.temporalConfidenceThreshold ?? 0.6;
  const recencyBasis =
    state.understanding?.impliedClaim ||
    state.understanding?.articleThesis ||
    state.originalInput ||
    "";
  const recencyMatters =
    (temporalContext?.isRecencySensitive && temporalContext.confidence >= temporalConfThreshold) ||
    (recencyBasis
      ? recencyAssessor.isRecencySensitive(
        recencyBasis,
        state.understanding || undefined,
        state.pipelineConfig?.recencyCueTerms,
      )
      : false);

  if (recencyMatters) {
    const windowMonths = state.pipelineConfig.recencyWindowMonths ?? 6;
    const penalty = state.pipelineConfig.recencyConfidencePenalty ?? 20;
    const recencyCheck = recencyAssessor.validateRecency(state.evidenceItems, windowMonths);
    debugLog("Recency evidence check", {
      recencyMatters,
      windowMonths,
      maxPenalty: penalty,
      graduatedEnabled: state.pipelineConfig.recencyGraduatedPenalty !== false,
      hasRecentEvidence: recencyCheck.hasRecentEvidence,
      latestEvidenceDate: recencyCheck.latestEvidenceDate,
      signalsCount: recencyCheck.signalsCount,
      dateCandidates: recencyCheck.dateCandidates,
      granularity: temporalContext?.granularity,
    });

    if (!recencyCheck.hasRecentEvidence && penalty > 0) {
      const confFloor = state.pipelineConfig.minConfidenceFloor ?? 10;
      const useGraduated = state.pipelineConfig.recencyGraduatedPenalty !== false;

      let effectivePenalty = penalty;
      let penaltyBreakdown: Record<string, unknown> | undefined;

      if (useGraduated) {
        const result = recencyAssessor.calculateGraduatedPenalty(
          recencyCheck.latestEvidenceDate,
          windowMonths,
          penalty,
          temporalContext?.granularity,
          recencyCheck.dateCandidates,
        );
        effectivePenalty = result.effectivePenalty;
        penaltyBreakdown = result.breakdown;
        debugLog("Graduated recency penalty", result);
      }

      if (effectivePenalty > 0) {
        const applyPenalty = (value?: number | string | null) =>
          Math.max(confFloor, normalizePercentage(value) - effectivePenalty);

        if (verdictSummary?.confidence != null) {
          verdictSummary.confidence = applyPenalty(verdictSummary.confidence);
        }
        if (articleAnalysis?.verdictSummary?.confidence != null) {
          articleAnalysis.verdictSummary.confidence = applyPenalty(articleAnalysis.verdictSummary.confidence);
        }
      }

      state.analysisWarnings.push({
        type: "recency_evidence_gap",
        severity: effectivePenalty > 0 ? "warning" : "info",
        message: effectivePenalty > 0
          ? `Time-sensitive claim lacks recent evidence (no signals within last ${windowMonths} months). Confidence reduced by ${effectivePenalty} points${useGraduated ? " (graduated)" : ""}.`
          : `Time-sensitive claim evidence is outside ${windowMonths}-month window, but graduated penalty is 0 (topic volatility and evidence volume mitigate penalty).`,
        details: {
          windowMonths,
          maxPenalty: penalty,
          effectivePenalty,
          graduated: useGraduated,
          latestEvidenceDate: recencyCheck.latestEvidenceDate,
          signalsCount: recencyCheck.signalsCount,
          dateCandidates: recencyCheck.dateCandidates,
          granularity: temporalContext?.granularity,
          ...(penaltyBreakdown ? { penaltyBreakdown } : {}),
        },
      });
    }
  }

  // Apply Gate 4: Verdict Confidence Assessment
  // Adds confidence tier and publication status to each verdict
  // CRITICAL: Central claims are ALWAYS kept publishable
  const { validatedVerdicts, stats: gate4Stats } = applyGate4ToVerdicts(
    claimVerdicts,
    state.sources,
    state.evidenceItems,
    {
      ...state.calcConfig.qualityGates,
      defaultTrackRecordScore: state.calcConfig.sourceReliability.defaultScore,
    },
  );
  console.log(`[Analyzer] Gate 4 applied: ${gate4Stats.publishable}/${gate4Stats.total} publishable, HIGH=${gate4Stats.highConfidence}, MED=${gate4Stats.mediumConfidence}, LOW=${gate4Stats.lowConfidence}, INSUFF=${gate4Stats.insufficient}`);

  // Use validated verdicts going forward (includes gate4Validation metadata)
  const finalClaimVerdicts = validatedVerdicts;

  // Fix 3: Low-source confidence penalty
  // When evidence base is thin (â‰¤ lowSourceThreshold unique sources), penalize confidence
  // to prevent over-confident verdicts based on insufficient evidence.
  // NOTE: Use state.sources (fetched sources) for consistency with the displayed source count
  // in the report/UI, NOT state.evidenceItems (which only counts sources that produced evidence).
  const lowSourceThreshold = state.pipelineConfig.lowSourceThreshold ?? 2;
  const lowSourcePenalty = state.pipelineConfig.lowSourceConfidencePenalty ?? 15;
  const uniqueSourceCount = state.sources.filter(s => s.fetchSuccess).length;
  const totalSearchCount = state.searchQueries?.length ?? 0;

  // Zero successful sources: explicit acquisition failure warning
  if (uniqueSourceCount === 0) {
    state.analysisWarnings.push({
      type: "no_successful_sources",
      severity: "error",
      message: "No sources were successfully fetched. Insufficient fetched evidence; results may be unreliable.",
      details: {
        uniqueSourceCount: 0,
        totalSearches: totalSearchCount,
        totalSourceCandidates: state.sources?.length ?? 0,
      },
    });

    // Acquisition collapse: many searches but zero fetched sources — pipeline stall pattern
    if (totalSearchCount >= 10) {
      state.analysisWarnings.push({
        type: "source_acquisition_collapse",
        severity: "error",
        message: `Source acquisition collapsed: ${totalSearchCount} searches performed but 0 sources successfully fetched. Analysis quality is severely degraded.`,
        details: {
          totalSearches: totalSearchCount,
          totalSourceCandidates: state.sources?.length ?? 0,
          successfulFetches: 0,
          evidenceItemCount: state.evidenceItems?.length ?? 0,
        },
      });
    }
  }

  if (uniqueSourceCount <= lowSourceThreshold && uniqueSourceCount > 0 && lowSourcePenalty > 0) {
    const confFloor = state.pipelineConfig.minConfidenceFloor ?? 10;
    const applyLowSourcePenalty = (value: number) =>
      Math.max(confFloor, value - lowSourcePenalty);

    if (verdictSummary?.confidence != null) {
      const before = verdictSummary.confidence;
      verdictSummary.confidence = applyLowSourcePenalty(verdictSummary.confidence);
      debugLog("Low-source confidence penalty applied to verdictSummary", {
        uniqueSourceCount,
        threshold: lowSourceThreshold,
        penalty: lowSourcePenalty,
        before,
        after: verdictSummary.confidence,
      });
    }
    if (articleAnalysis?.verdictSummary?.confidence != null) {
      articleAnalysis.verdictSummary.confidence = applyLowSourcePenalty(articleAnalysis.verdictSummary.confidence);
    }

    state.analysisWarnings.push({
      type: "low_source_count",
      severity: "warning",
      message: `Only ${uniqueSourceCount} unique source(s) found. Confidence reduced by ${lowSourcePenalty} points due to thin evidence base.`,
      details: {
        uniqueSourceCount,
        threshold: lowSourceThreshold,
        penalty: lowSourcePenalty,
      },
    });
  }

  // Fix 1: Confidence floor guard â€” ensure confidence never reaches 0 on successful verdicts
  // Applied after all penalties (recency, low-source) as a final safety net
  {
    const confFloor = state.pipelineConfig.minConfidenceFloor ?? 10;
    if (confFloor > 0 && verdictSummary?.confidence != null && verdictSummary.confidence < confFloor) {
      debugLog("Confidence floor applied to verdictSummary", {
        before: verdictSummary.confidence,
        floor: confFloor,
      });
      verdictSummary.confidence = confFloor;
    }
    if (confFloor > 0 && articleAnalysis?.verdictSummary?.confidence != null && articleAnalysis.verdictSummary.confidence < confFloor) {
      articleAnalysis.verdictSummary.confidence = confFloor;
    }
  }

  // STEP 6: Summary
  await emit("Step 4: Building summary", 75);
  const twoPanelSummary = await generateTwoPanelSummary(
    state,
    finalClaimVerdicts,
    articleAnalysis,
    model,
  );

  // STEP 7: Report
  await emit("Step 5: Generating report", 85);
  let reportMarkdown = "";

  // Safety: ensure we never emit a result with zero contexts, even if context refinement was
  // skipped/rejected and the initial understanding produced no contexts.
  state.understanding = ensureAtLeastOneContext(state.understanding!);

  // PR 6: Log budget stats and warn if exceeded
  const budgetStats = getBudgetStats(state.budgetTracker, state.budget);
  debugLog("[Budget] Usage", {
    tokensUsed: budgetStats.tokensUsed,
    tokensPercent: budgetStats.tokensPercent,
    totalIterations: budgetStats.totalIterations,
    iterationsPercent: budgetStats.iterationsPercent,
    llmCalls: budgetStats.llmCalls,
  });
  if (state.budgetTracker.budgetExceeded) {
    debugLog("[Budget] Analysis terminated early due to budget limits", {
      reason: state.budgetTracker.exceedReason,
    });
    // P2: Add budget_exceeded warning to analysisWarnings for UI display
    state.analysisWarnings.push({
      type: "budget_exceeded",
      severity: "warning",
      message: `Analysis terminated early due to budget limits: ${state.budgetTracker.exceedReason}. Results may be incomplete.`,
      details: {
        tokensUsed: budgetStats.tokensUsed,
        tokensPercent: budgetStats.tokensPercent,
        iterationsUsed: budgetStats.totalIterations,
        iterationsPercent: budgetStats.iterationsPercent,
        reason: state.budgetTracker.exceedReason,
      },
    });
  }

  // P3: Add warning if evidence filter degraded to heuristics
  if (state.evidenceFilterLlmFailures > 0) {
    debugLog("[Evidence Filter] LLM evidence quality filter degraded to heuristic fallback", {
      failureCount: state.evidenceFilterLlmFailures,
    });
    state.analysisWarnings.push({
      type: "evidence_filter_degradation",
      severity: "warning",
      message: `Evidence quality filtering degraded from LLM to heuristic filtering ${state.evidenceFilterLlmFailures} time(s). Evidence quality assessment may be less accurate.`,
      details: {
        failureCount: state.evidenceFilterLlmFailures,
        filterMethod: "heuristic",
      },
    });
  }

  // P0: Final verification - catch any classifications that bypassed entry-point normalization
  verifyFinalClassifications(state, finalClaimVerdicts, articleAnalysis);

  // v2.9.1: Summary fallback warning — if any claims used per-claim 50/50 fallback, flag it.
  // Uses "structured_output_failure" type to trigger reportIntegrity.damaged when ALL claims fell back.
  const fallbackCount = finalClaimVerdicts.filter(
    cv => cv.reasoning?.includes("No verdict returned by LLM for this claim."),
  ).length;
  if (fallbackCount > 0) {
    state.analysisWarnings.push({
      type: "structured_output_failure",
      severity: fallbackCount === finalClaimVerdicts.length ? "error" : "warning",
      message: `${fallbackCount}/${finalClaimVerdicts.length} claims received fallback verdicts (50/50 defaults)`,
      details: { fallbackCount, totalClaims: finalClaimVerdicts.length },
    });
  }

  // Synthesize a top-level "report_damaged" warning for clear UI surfacing.
  const reportIntegrity = synthesizeReportDamageWarning(state);

  reportMarkdown = await generateReport(
    state,
    finalClaimVerdicts,
    articleAnalysis,
    twoPanelSummary,
    model,
    searchConfig.provider,
  );

  await emit("Analysis complete", 100);

  // v2.9.1: Apply 7-point rating labels to claim verdicts
  for (const cv of finalClaimVerdicts) {
    cv.rating = percentageToClaimVerdict(cv.truthPercentage, cv.confidence);
  }

  // v2.9.1: Enrich analysis contexts with their verdicts, evidence, and claim verdicts
  const enrichedContexts = enrichContextsForReport(
    state.understanding!.analysisContexts,
    verdictSummary || null,
    state.evidenceItems,
    finalClaimVerdicts,
  );

  // Result JSON with search data (NEW v2.4.3)
  const resultJson = {
    _schemaVersion: "2.7.0",
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: mode,
      llmProvider: provider,
      llmModel: modelName,
      promptContentHash,
      promptLoadedUtc,
      searchProvider: searchConfig.provider,
      inputType: input.inputType,
      detectedInputType: state.understanding!.detectedInputType,
      hasMultipleContexts: articleAnalysis.hasMultipleContexts,
      contextCount: state.understanding!.analysisContexts.length,
      hasContestedFactors:
        articleAnalysis.verdictSummary?.hasContestedFactors || false,
      // NEW v2.4.5: Pseudoscience detection (pattern-based checks removed)
      isPseudoscience: false,
      pseudoscienceCategories: [],
      pseudoscienceConfidence: 0,
      inputLength: textToAnalyze.length,
      analysisTimeMs: Date.now() - startTime,
      analysisId: twoPanelSummary.factharborAnalysis.analysisId,
      // Gate statistics (POC1)
      gate4Stats: {
        publishable: gate4Stats.publishable,
        total: gate4Stats.total,
        highConfidence: gate4Stats.highConfidence,
        mediumConfidence: gate4Stats.mediumConfidence,
        lowConfidence: gate4Stats.lowConfidence,
        insufficient: gate4Stats.insufficient,
        centralKept: gate4Stats.centralKept,
      },
      // Budget statistics (PR 6: p95 Hardening)
      budgetStats: (() => {
        const stats = getBudgetStats(state.budgetTracker, state.budget);
        return {
          tokensUsed: stats.tokensUsed,
          tokensPercent: stats.tokensPercent,
          totalIterations: stats.totalIterations,
          iterationsPercent: stats.iterationsPercent,
          // v2.9.1: Use state.llmCalls (authoritative counter) instead of budgetTracker.llmCalls (selective)
          llmCalls: state.llmCalls,
          budgetExceeded: stats.budgetExceeded,
          exceedReason: state.budgetTracker.exceedReason,
        };
      })(),
      reportIntegrity: {
        damaged: reportIntegrity.damaged,
        triggerTypes: reportIntegrity.triggerTypes,
        remediationHints: reportIntegrity.remediationHints,
        criticalIssues: reportIntegrity.criticalIssues,
      },
    },
    verdictSummary: verdictSummary || null,
    // v2.9.1: Top-level article verdict for API consumers (additive — UI uses articleAnalysis fallback chain)
    articleVerdict: {
      rating: percentageToArticleVerdict(
        articleAnalysis?.articleTruthPercentage ?? 50,
        verdictSummary?.confidence ?? 50,
      ),
      truthPercentage: articleAnalysis?.articleTruthPercentage ?? null,
      confidence: verdictSummary?.confidence ?? null,
      summary: verdictSummary?.shortAnswer ?? null,
      articleVerdictReliability: articleAnalysis?.articleVerdictReliability ?? null,
    },
    // v2.9.1: Enriched contexts with verdicts, evidence, and claim verdicts joined by contextId
    analysisContexts: enrichedContexts,
    twoPanelSummary,
    articleAnalysis,
    claimVerdicts: finalClaimVerdicts,
    understanding: state.understanding,
    evidenceItems: state.evidenceItems,
    // Enhanced source data (v2.4.3)
    sources: state.sources.map((s: FetchedSource) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      trackRecordScore: s.trackRecordScore,
      category: s.category,
      fetchSuccess: s.fetchSuccess,
      searchQuery: s.searchQuery,
    })),
    // NEW v2.4.3: Search queries
    searchQueries: state.searchQueries,
    iterations: state.iterations,
    // Research stats
    researchStats: {
      totalSearches: state.searchQueries.length,
      totalResults: state.searchQueries.reduce(
        (sum, q) => sum + q.resultsCount,
        0,
      ),
      sourcesFetched: state.sources.length,
      sourcesSuccessful: state.sources.filter((s) => s.fetchSuccess).length,
      evidenceItemsExtracted: state.evidenceItems.length,
      contradictionSearchPerformed: state.contradictionSearchPerformed,
      llmCalls: state.llmCalls,
    },
    // NEW v2.4.5: Pseudoscience analysis (pattern-based checks removed)
    pseudoscienceAnalysis: null,
    // P0: Classification fallback tracking
    classificationFallbacks: state.fallbackTracker.hasFallbacks() ? state.fallbackTracker.getSummary() : undefined,
    // P0: Analysis warnings (verdict direction mismatches, quality issues)
    analysisWarnings: state.analysisWarnings.length > 0 ? state.analysisWarnings : undefined,
    qualityGates: {
      passed:
        state.evidenceItems.length >= config.minEvidenceItemsRequired &&
        state.contradictionSearchPerformed &&
        gate4Stats.publishable > 0,
      // Gate 1: Claim Validation (characterization / telemetry; should not hard-filter opinion/prediction claims)
      gate1Stats: state.understanding?.gate1Stats || {
        total: 0,
        passed: 0,
        filtered: 0,
        centralKept: 0,
      },
      // Gate 4: Verdict Confidence Assessment (validates evidence quality)
      gate4Stats: {
        total: gate4Stats.total,
        publishable: gate4Stats.publishable,
        highConfidence: gate4Stats.highConfidence,
        mediumConfidence: gate4Stats.mediumConfidence,
        lowConfidence: gate4Stats.lowConfidence,
        insufficient: gate4Stats.insufficient,
        centralKept: gate4Stats.centralKept,
      },
      summary: {
        totalEvidenceItems: state.evidenceItems.length,
        totalSources: state.sources.length,
        searchesPerformed: state.searchQueries.length,
        contradictionSearchPerformed: state.contradictionSearchPerformed,
      },
    },
    // Pipeline Phase 1: Research metrics for gap reporting
    researchMetrics: await (async () => {
      // Use configurable threshold from pipeline config
      const similarityThreshold = state.pipelineConfig.evidenceSimilarityThreshold ?? 0.4;

      // Calculate coverage metrics
      const highCentralityClaims = state.understanding?.subClaims?.filter(c => c.centrality === "high") || [];
      const claimsWithEvidence = highCentralityClaims.filter(claim => {
        return state.evidenceItems.some(e => {
          if (String((e as any)?.relatedClaimId || "") === String(claim.id || "")) return true;
          if (e.contextId && claim.contextId && e.contextId === claim.contextId) return true;
          return false;
        });
      });
      const highCentralityCoverage = highCentralityClaims.length > 0
        ? claimsWithEvidence.length / highCentralityClaims.length
        : 1;

      // Calculate counter-evidence rate for HIGH centrality claims
      const claimsWithCounterEvidence = highCentralityClaims.filter(claim => {
        return state.evidenceItems.some(e => {
          if (e.claimDirection !== "contradicts") return false;
          if (String((e as any)?.relatedClaimId || "") === String(claim.id || "")) return true;
          if (e.contextId && claim.contextId && e.contextId === claim.contextId) return true;
          return false;
        });
      });
      const counterEvidenceRate = highCentralityClaims.length > 0
        ? claimsWithCounterEvidence.length / highCentralityClaims.length
        : 1;

      // Evidence by context
      const evidenceByContext: Record<string, number> = {};
      for (const e of state.evidenceItems) {
        const ctx = e.contextId || "unassigned";
        evidenceByContext[ctx] = (evidenceByContext[ctx] || 0) + 1;
      }

      // Analyze gaps for reporting
      const gaps = state.understanding
        ? await analyzeEvidenceGaps(state.evidenceItems, state.understanding, state.searchQueries, similarityThreshold)
        : [];

      return {
        totalIterations: state.iterations.length,
        evidenceCount: state.evidenceItems.length,
        evidenceByContext,
        coverageMetrics: {
          highCentralityCoverage: Math.round(highCentralityCoverage * 100) / 100,
          counterEvidenceRate: Math.round(counterEvidenceRate * 100) / 100,
        },
        evidenceGaps: gaps.map(g => ({
          claimId: g.claimId,
          gapType: g.gapType,
          severity: g.severity,
        })),
        processedUrlCount: state.processedUrls.size,
        deduplicatedUrlCount: state.urlDeduplicationCount,
        novelEvidenceLastIteration: state.lastIterationNovelEvidenceCount,
        gapResearchIterations: state.gapResearchIterations,
        totalGapQueriesIssued: state.totalGapQueriesIssued,
        temporalContext: state.understanding?.temporalContext,
      };
    })(),
  };

  // ============================================================================
  // v2.9.0 Phase 2: Ensure config snapshot is saved before returning
  // ============================================================================
  await snapshotPromise;

  return { resultJson, reportMarkdown };
}
