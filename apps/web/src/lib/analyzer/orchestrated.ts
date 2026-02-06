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
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";
import { searchWebWithProvider, getActiveSearchProviders, type WebSearchResult } from "@/lib/web-search";
import { searchWithGrounding, isGroundedSearchAvailable, convertToFetchedSources } from "@/lib/search-gemini-grounded";
import { applyGate1Lite, applyGate1ToClaims, applyGate4ToVerdicts } from "./quality-gates";
import { filterEvidenceByProvenance } from "./provenance-validation";
import { filterByProbativeValue, calculateFalsePositiveRate, DEFAULT_FILTER_CONFIG } from "./evidence-filter";
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
import { tryParseFirstJsonObject } from "./json";
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
import { detectContexts, detectContextsHybrid, formatDetectedContextsHint } from "./analysis-contexts";
import { getModelForTask } from "./llm";
import {
  detectAndCorrectVerdictInversion,
  detectCounterClaim,
} from "./verdict-corrections";
import {
  canonicalizeContexts,
  canonicalizeContextsWithRemap,
  ensureAtLeastOneContext,
  UNASSIGNED_CONTEXT_ID,
} from "./analysis-contexts";
import { deriveCandidateClaimTexts } from "./claim-decomposition";
import { loadPromptFile, type Pipeline } from "./prompt-loader";
import { getConfig, recordConfigUsage } from "@/lib/config-storage";
import { getAnalyzerConfig, type PipelineConfig, type SearchConfig } from "@/lib/config-loader";
import { captureConfigSnapshotAsync, getSRConfigSummary } from "@/lib/config-snapshots";
import type { EvidenceItem, AnalysisWarning, VerdictDirectionMismatch } from "./types";
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

  // LLM provided valid value → use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed → use safe default
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

  // LLM provided valid value → use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed → use safe default (NO pattern matching!)
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
): "primary" | "secondary" | "opinion" | "contested" {
  const validValues = ["primary", "secondary", "opinion", "contested"];

  // LLM provided valid value → use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed → use safe default
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

  // LLM provided valid value → use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed → use safe default
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
  // LLM provided valid boolean → use it
  if (typeof llmValue === 'boolean') {
    return llmValue;
  }

  // LLM failed → use safe default
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
function normalizeEvidenceClassifications<T extends {
  statement?: string;
  sourceAuthority?: string;
  evidenceBasis?: string;
}>(
  evidence: T[],
  tracker: FallbackTracker,
  locationPrefix: string = "Evidence"
): T[] {
  return evidence.map((ev, index) => {
    const validSourceAuth = ["primary", "secondary", "opinion", "contested"];
    const validEvidenceBasis = ["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"];

    let sourceAuthority = ev.sourceAuthority;
    let evidenceBasis = ev.evidenceBasis;
    const text = ev.statement || "";

    // Normalize sourceAuthority
    if (!sourceAuthority || !validSourceAuth.includes(sourceAuthority)) {
      const reason = !sourceAuthority ? 'missing' : 'invalid';
      sourceAuthority = "secondary"; // Safe default

      tracker.recordFallback({
        field: 'sourceAuthority',
        location: `${locationPrefix} #${index + 1}`,
        text: text.substring(0, 100),
        defaultUsed: sourceAuthority,
        reason
      });

      console.warn(`[Fallback] sourceAuthority: ${locationPrefix} #${index + 1} - using default "secondary" (reason: ${reason})`);
    }

    // Normalize evidenceBasis
    if (!evidenceBasis || !validEvidenceBasis.includes(evidenceBasis)) {
      const reason = !evidenceBasis ? 'missing' : 'invalid';
      evidenceBasis = "anecdotal"; // Safe default

      tracker.recordFallback({
        field: 'evidenceBasis',
        location: `${locationPrefix} #${index + 1}`,
        text: text.substring(0, 100),
        defaultUsed: evidenceBasis,
        reason
      });

      console.warn(`[Fallback] evidenceBasis: ${locationPrefix} #${index + 1} - using default "anecdotal" (reason: ${reason})`);
    }

    return {
      ...ev,
      sourceAuthority: sourceAuthority as "primary" | "secondary" | "opinion" | "contested",
      evidenceBasis: evidenceBasis as "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific"
    };
  });
}

interface RelevanceCheck {
  isRelevant: boolean;
  reason?: string;
  signals?: {
    entityMatchCount: number;
    contextMatchCount: number;
    institutionMentioned: boolean;
    entityTokens: string[];
    contextTokens: string[];
    institutionTokens: string[];
  };
}

type RelevanceOptions = {
  requireContextMatch?: boolean;
};

type RelevanceClass = "primary_source" | "secondary_commentary" | "unrelated";

function normalizeForMatch(text: string): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const COMMON_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "for", "from", "how", "if", "in", "into", "is", "it", "its", "of", "on", "or",
  "that", "the", "their", "them", "then", "these", "they", "this", "those", "to",
  "was", "we", "were", "what", "when", "where", "which", "who", "why", "with",
  "you", "your"
]);

function tokenizeForMatch(text: string, minLength = 4): string[] {
  const normalized = normalizeForMatch(text);
  if (!normalized) return [];
  const tokens = normalized
    .split(/\s+/)
    .filter((t) => t.length >= minLength && !COMMON_STOPWORDS.has(t));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function hasToken(haystack: string, token: string): boolean {
  if (!haystack || !token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
  const exactPattern = new RegExp(`\\b${escaped}\\b`, "i");
  if (exactPattern.test(haystack)) return true;

  if (token.length >= 5) {
    const pluralPattern = new RegExp(`\\b${escaped}(s|es)\\b`, "i");
    if (pluralPattern.test(haystack)) return true;
    if (token.endsWith("s")) {
      const singular = token.slice(0, -1);
      if (singular.length >= 4) {
        const singularPattern = new RegExp(`\\b${singular}\\b`, "i");
        if (singularPattern.test(haystack)) return true;
      }
    }
  }

  return false;
}

function containsAnyToken(haystack: string, tokens: string[]): boolean {
  if (!haystack || tokens.length === 0) return false;
  for (const t of tokens) {
    if (hasToken(haystack, t)) return true;
  }
  return false;
}

function countTokenMatches(haystack: string, url: string, tokens: string[]): number {
  if ((!haystack && !url) || tokens.length === 0) return 0;
  let count = 0;
  for (const t of tokens) {
    if (hasToken(haystack, t) || hasToken(url, t)) count += 1;
  }
  return count;
}

function extractContextTokens(contexts: AnalysisContext[]): string[] {
  if (!Array.isArray(contexts) || contexts.length === 0) return [];
  const rawCore: string[] = [];
  const rawFallback: string[] = [];
  const metadataExcludeKeys = new Set(["geographic", "jurisdiction", "boundaries"]);

  for (const ctx of contexts) {
    if (!ctx) continue;
    if (ctx.subject) {
      rawCore.push(ctx.subject);
    } else if (ctx.assessedStatement) {
      rawCore.push(ctx.assessedStatement);
    }

    if (ctx.name) rawFallback.push(ctx.name);
    if (ctx.shortName) rawFallback.push(ctx.shortName);

    const meta = ctx.metadata || {};
    for (const [key, value] of Object.entries(meta)) {
      if (metadataExcludeKeys.has(key)) continue;
      if (typeof value === "string" && value.trim()) {
        rawFallback.push(value);
      } else if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
        rawFallback.push(value.join(" "));
      }
    }
  }

  const coreTokens = tokenizeForMatch(rawCore.join(" "), 4);
  if (coreTokens.length > 0) return coreTokens;
  return tokenizeForMatch(rawFallback.join(" "), 4);
}

function extractInstitutionTokens(contexts: AnalysisContext[]): string[] {
  if (!Array.isArray(contexts) || contexts.length === 0) return [];
  const raw: string[] = [];
  for (const ctx of contexts) {
    if (!ctx) continue;
    if (ctx.shortName) raw.push(ctx.shortName);
    const meta = ctx.metadata || {};
    if (meta.institution) raw.push(meta.institution);
    if (meta.court) raw.push(meta.court);
    if (meta.regulatoryBody) raw.push(meta.regulatoryBody);
  }
  // Allow shorter tokens to capture acronyms/initialisms
  return tokenizeForMatch(raw.join(" "), 2);
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
  const ctx = contexts.find(c => c.metadata?.jurisdiction || c.metadata?.institution || c.metadata?.geographic);
  const jurisdiction = ctx?.metadata?.jurisdiction || ctx?.metadata?.geographic || "";
  const institution = ctx?.metadata?.institution || ctx?.metadata?.court || "";

  const queries = (jurisdiction || institution)
    ? [
        `${entityStr} ${jurisdiction} ${institution} criticism official review`,
        `${entityStr} ${jurisdiction} appeals challenges objections ${currentYear}`,
        `${entityStr} ${institution} internal review findings`,
      ]
    : [
        `${entityStr} criticism documented evidence ${currentYear}`,
        `${entityStr} official response challenges`,
      ];

  return queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/**
 * Quick heuristic check for obvious irrelevance.
 * Does NOT replace LLM extraction - just filters clear noise.
 */
function checkSearchResultRelevance(
  result: WebSearchResult,
  entityStr: string,
  contexts: AnalysisContext[],
  options: RelevanceOptions = {}
): RelevanceCheck {
  const title = (result.title || "").toLowerCase();
  const snippet = (result.snippet || "").toLowerCase();
  const url = (result.url || "").toLowerCase();
  const combined = `${title} ${snippet}`.trim();

  const entityTokens = tokenizeForMatch(entityStr, 3);
  const contextTokens = extractContextTokens(contexts);
  const institutionTokens = extractInstitutionTokens(contexts);

  const entityMatchCount = countTokenMatches(combined, url, entityTokens);
  const contextMatchCount = countTokenMatches(combined, url, contextTokens);
  const contextMinMatches = contextTokens.length >= 4 ? 2 : 1;
  const strongEntityTokens = entityTokens.filter((t) => t.length >= 7);
  const strongEntityMatchCount = countTokenMatches(combined, url, strongEntityTokens);
  const entityMinMatches = entityTokens.length >= 4 ? 2 : 1;
  const passesEntityGate =
    strongEntityTokens.length > 0
      ? strongEntityMatchCount > 0
      : entityMatchCount >= entityMinMatches;
  const hasContextTokens = contextTokens.length > 0;
  const passesContextGate = hasContextTokens && contextMatchCount >= contextMinMatches;
  const passesContextOrMissing = !hasContextTokens || contextMatchCount >= contextMinMatches;

  const institutionMentioned =
    institutionTokens.length > 0 &&
    (containsAnyToken(combined, institutionTokens) || containsAnyToken(url, institutionTokens));

  const signals = {
    entityMatchCount,
    contextMatchCount,
    institutionMentioned,
    entityTokens,
    contextTokens,
    institutionTokens,
  };

  if (options.requireContextMatch) {
    if (institutionTokens.length > 0) {
      if (institutionMentioned && passesEntityGate && passesContextOrMissing) return { isRelevant: true, signals };
      if (!institutionMentioned && passesEntityGate && passesContextOrMissing && strongEntityMatchCount > 0) {
        return { isRelevant: true, signals };
      }
      return { isRelevant: false, reason: "insufficient_context_match", signals };
    }
    if (passesEntityGate && passesContextOrMissing) return { isRelevant: true, signals };
    return { isRelevant: false, reason: "insufficient_context_match", signals };
  }

  if (passesEntityGate || passesContextGate) return { isRelevant: true, signals };
  if (entityTokens.length === 0 && contextTokens.length === 0) return { isRelevant: true, signals };

  return {
    isRelevant: false,
    reason: entityTokens.length > 0 ? "entity_not_mentioned" : "context_not_mentioned",
    signals,
  };
}

const SEARCH_RELEVANCE_SCHEMA = z.object({
  classification: z.enum(["primary_source", "secondary_commentary", "unrelated"]),
  confidence: z.number().min(0).max(100),
  reason: z.string().max(400),
});

function buildRelevanceContextSummary(contexts: AnalysisContext[]): string {
  if (!contexts || contexts.length === 0) return "No contexts available.";
  return contexts
    .map((ctx, idx) => {
      const meta = ctx.metadata || {};
      const institution = meta.institution || meta.court || "";
      const jurisdiction = meta.jurisdiction || meta.geographic || "";
      const methodology = meta.methodology || "";
      return [
        `Context ${idx + 1}: ${ctx.subject || ctx.name || ctx.shortName || "General"}`,
        institution ? `Institution: ${institution}` : "",
        jurisdiction ? `Jurisdiction: ${jurisdiction}` : "",
        methodology ? `Methodology: ${methodology}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");
}

async function classifySearchResultRelevanceLLM(
  result: WebSearchResult,
  entityStr: string,
  contexts: AnalysisContext[],
  model: any,
  pipelineConfig?: PipelineConfig,
): Promise<{ classification: RelevanceClass; confidence: number; reason: string } | null> {
  const systemPrompt = `You classify the relevance of a search result to a claim and its AnalysisContexts.
Return JSON only. Classify as:
- "primary_source": directly about the claim/context and contains primary evidence, official records, data, or first-hand documentation.
- "secondary_commentary": discusses the topic but is commentary, reaction, analysis, or indirect discussion without primary evidence.
- "unrelated": not about the claim or context.`;

  const userPrompt = `CLAIM:
"${entityStr}"

ANALYSISCONTEXTS:
${buildRelevanceContextSummary(contexts)}

SEARCH RESULT:
Title: ${result.title || "N/A"}
Snippet: ${result.snippet || "N/A"}
URL: ${result.url || "N/A"}

Return JSON with: classification, confidence (0-100), reason.`;

  try {
    const response = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.1, pipelineConfig),
      output: Output.object({ schema: SEARCH_RELEVANCE_SCHEMA }),
    });

    const parsed = extractStructuredOutput(response);
    if (!parsed) return null;
    const safe = SEARCH_RELEVANCE_SCHEMA.safeParse(parsed);
    if (!safe.success) return null;
    return safe.data;
  } catch (err: any) {
    debugLog("classifySearchResultRelevanceLLM: failed", {
      error: err?.message || String(err),
    });
    return null;
  }
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
    if (!item.sourceAuthority || !["primary", "secondary", "opinion", "contested"].includes(item.sourceAuthority)) {
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
  if (!state.understanding) return { updated: false, llmCalls: 0 };

  const preRefineContexts = state.understanding.analysisContexts || [];

  const evidenceItems = state.evidenceItems || [];
  // If we don't have enough evidence, skip refinement (avoid hallucinated contexts).
  // v2.6.39: Align threshold with mode config (quick=6, deep=8) to enable refinement in quick mode
  const config = getActiveConfig(state.pipelineConfig);
  const minEvidenceItemsForRefinement = Math.min(8, config.minEvidenceItemsRequired);
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
    ? selectEvidenceItemsForContextRefinementPrompt(evidenceItems, analysisInput, contextPromptMaxEvidenceItems)
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

  // v2.6.39: Compute seed context candidates from heuristics (soft hints, not mandatory)
  const pipelineCfg = state.pipelineConfig;
  const detectionMethod =
    pipelineCfg?.contextDetectionMethod ?? "heuristic";
  const seedContexts = detectionMethod === "heuristic"
    ? detectContexts(analysisInput) || []
    : (await detectContextsHybrid(analysisInput, pipelineCfg!)) || [];
  const seedHint = seedContexts.length > 0 ? formatDetectedContextsHint(seedContexts, true) : "";

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

  const systemPrompt = `You are a professional evidence analyst organizing evidence into AnalysisContexts. Your role is to identify distinct AnalysisContexts requiring separate investigation—based on differences in analytical dimensions such as methodology, boundaries, or institutional framework—and organize evidence into the appropriate AnalysisContexts.

Terminology (critical):
- Background details: High-level narrative frame or topic of the input. This is descriptive only and is NOT a reason to split analysis.
- AnalysisContext: a bounded analytical frame that should be analyzed separately. You will output these as analysisContexts.
- EvidenceScope: per-evidence-item source metadata (methodology/boundaries/geography/temporal) attached to individual extracted evidence items (EvidenceItem.evidenceScope). This is NOT the same as AnalysisContext.

Language rules (avoid ambiguity):
- Always use the term "AnalysisContext" for top-level bounded frames.
- Use the term "background details" for narrative framing (not a separate verdict space).
- Use the term "EvidenceScope" ONLY for per-evidence-item metadata shown in the EVIDENCE list.
- Avoid using the bare word "context" unless you explicitly mean AnalysisContext.

Your job: Identify the DISTINCT AnalysisContexts that are REQUIRED by the evidence. Create a separate AnalysisContext ONLY when the evidence clearly indicates a different analytical frame (methodology/boundary/jurisdiction/etc.) that would require its own verdict. If the evidence does NOT show distinct frames, return a single AnalysisContext.

CRITICAL RULES:
- SAME QUESTION: every AnalysisContext must answer the user's original question. Third-party reactions/responses to X are INVALID when evaluating X itself.
- Relevance: every AnalysisContext MUST be directly relevant to the input's specific topic. Do not keep marginally related contexts.
- When in doubt, use fewer AnalysisContexts rather than including marginally relevant ones.
- Evidence-grounded only: every AnalysisContext MUST be supported by at least one evidenceId from the list.
- Do NOT invent AnalysisContexts based on guesswork or background knowledge.
- Split into multiple AnalysisContexts when the evidence indicates different boundaries, methods, time periods, institutions, datasets, or processes that should be analyzed separately.
- Do NOT split into multiple AnalysisContexts solely due to incidental geographic or temporal strings unless the evidence indicates they materially change the analytical frame (e.g., different regulatory regimes, different datasets/studies, different measurement windows).
- Also split when evidence clearly covers different phases/components/metrics that are not directly comparable (e.g., upstream vs downstream phases, production vs use-phase, system-wide vs component-level metrics, different denominators/normalizations).
- **CRITICAL: Separate formal authority = separate contexts (evidence-gated)**: If evidence references decisions, rulings, or processes from DIFFERENT formal bodies (each with independent authority to make determinations on different matters), AND each authority has at least one supporting evidence item, these require separate AnalysisContexts. Do NOT split on incidental mentions without supporting evidence.
- **CRITICAL: Different system boundaries = separate contexts (evidence-gated)**: If the input is a comparative claim and evidence uses different measurement boundaries or system definitions, AND each boundary has at least one supporting evidence item, these require separate AnalysisContexts. Do NOT split on incidental mentions.
- **Anti-duplication rule**: If you create an authority-specific or boundary-specific context, do NOT also keep a redundant generic parent context UNLESS the parent context (a) answers a different question than the specific contexts, OR (b) has distinct evidence not covered by the specific contexts.
- Do NOT split into AnalysisContexts just because there are pro vs con viewpoints. Viewpoints are not AnalysisContexts.
- Do NOT split into AnalysisContexts purely by EVIDENCE GENRE (e.g., expert quotes vs market adoption vs news reporting). Those are source types, not bounded analytical frames.
- If you split, prefer frames that reflect methodology/boundaries/process-chain segmentation present in the evidence (e.g., end-to-end vs component-level; upstream vs downstream; production vs use-phase).
- If the evidence does not clearly support multiple AnalysisContexts, return exactly ONE AnalysisContext.
- Use neutral, generic labels (no domain-specific hardcoding), BUT ensure each AnalysisContext name reflects 1–3 specific identifying details found in the evidence (per-evidence EvidenceScope fields and/or the AnalysisContext metadata).
- Different evidence reports may define DIFFERENT AnalysisContexts. A single evidence report may contain MULTIPLE AnalysisContexts. Do not restrict AnalysisContexts to one-per-source.
- Put domain-specific details in metadata (e.g., court/institution/methodology/boundaries/geographic/standardApplied/decisionMakers/charges).
- Non-example: do NOT create separate AnalysisContexts from background details (e.g., "political frame", "media discourse") unless the evidence itself defines distinct analytical frames.
- An AnalysisContext with zero relevant claims/evidence should NOT exist.
- IMPORTANT: For each AnalysisContext, include an assessedStatement field describing what you are assessing in this context. The Assessment summary MUST summarize the assessment of THIS assessedStatement.

Return JSON only matching the schema.`;

  // v2.6.39: Build candidate contexts section if heuristics detected potential contexts
  const candidateContextsSection = seedHint ? `
CANDIDATE CONTEXTS (heuristic detection - optional):
${seedHint}

NOTE: These candidates are heuristic suggestions. Use a candidate ONLY if it is supported by ≥1 evidence item from the EVIDENCE list above. Drop any candidate that lacks evidence support. You may also identify additional contexts not listed here if the evidence supports them.
` : "";

  const userPrompt = `INPUT (normalized):
"${analysisInput}"

EVIDENCE (unverified extracted statements):
${evidenceText}

CURRENT CLAIMS (may be incomplete):
${claimsText || "(none)"}
${candidateContextsSection}
Return:
- requiresSeparateAnalysis
- analysisContexts (1..N)
- evidenceContextAssignments: map each evidenceId (Evidence item id) listed above to exactly one contextId (use contextId from your analysisContexts). NOTE: this assigns Evidence items to AnalysisContexts (not to per-item EvidenceScope).
- claimContextAssignments: (optional) map any claimIds that clearly belong to a specific contextId
`;

  // v2.6.39: Log when seed hints are passed to refinement
  if (seedContexts.length > 0) {
    debugLog("refineContextsFromEvidence: passing seed hints as candidates", {
      seedCount: seedContexts.length,
      seedIds: seedContexts.map((s) => s.id),
    });
  }

  let refined: any;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.1, state.pipelineConfig),
      output: Output.object({ schema }),
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

  const evidenceAssignments = next.evidenceContextAssignments || [];
  const normalizedEvidenceAssignments = evidenceAssignments.map((a) => ({
    ...a,
    evidenceId: normalizeEvidenceId(String(a.evidenceId ?? ""), "refineContextsFromEvidence"),
  }));

  const claimAssignmentsList = next.claimContextAssignments || [];

  // Validate coverage: we need assignments for most evidence items, and at least one evidence item per context.
  const assignmentCount = normalizedEvidenceAssignments.length;
  if (assignmentCount < Math.floor(promptEvidenceItems.length * 0.7)) {
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

  // v2.6.38: Validate claim assignments (all claims assigned to existing contexts)
  const existingContextIds = new Set(state.understanding!.analysisContexts.map(ctx => ctx.id));
  for (const claim of state.understanding!.subClaims || []) {
    const claimContextId = String((claim as any).contextId || "");
    if (claimContextId && !existingContextIds.has(claimContextId)) {
      debugLog(`⚠️ Claim ${claim.id} assigned to non-existent context ${claimContextId}`);
      // Unassign orphaned claims - they'll be assigned to General or fallback context later
      (claim as any).contextId = "";
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
      return { updated: false, llmCalls: 1 };
    }
  }

  // Optional: enforce EvidenceScope name alignment based on context metadata + per-evidence evidenceScope signals.
  const nameAlignmentEnabled =
    state.pipelineConfig?.contextNameAlignmentEnabled ??
    DEFAULT_PIPELINE_CONFIG.contextNameAlignmentEnabled;
  if (nameAlignmentEnabled) {
    const thr =
      state.pipelineConfig?.contextNameAlignmentThreshold ??
      DEFAULT_PIPELINE_CONFIG.contextNameAlignmentThreshold ??
      0.3;
    const threshold = Number.isFinite(thr) ? Math.max(0, Math.min(1, thr)) : 0.3;
    state.understanding!.analysisContexts = validateAndFixContextNameAlignment(
      state.understanding!.analysisContexts || [],
      state.evidenceItems || [],
      threshold,
    );
  }

  // Avoid over-splitting into “dimension contexts” (e.g., cost vs infrastructure) unless the
  // evidence indicates genuinely distinct analytical frames (methodology/boundaries/geography/temporal).
  if ((state.understanding!.analysisContexts?.length ?? 0) > 1) {
    const contextsNow = state.understanding!.analysisContexts || [];

    const contextFrameKeys = new Set<string>();
    for (const s of contextsNow as any[]) {
      const m = String(s?.metadata?.methodology || "").trim();
      const b = String(s?.metadata?.boundaries || "").trim();
      const g = String(s?.metadata?.geographic || "").trim();
      const t = String(s?.metadata?.temporal || s?.temporal || "").trim();
      const key = [m, b, g, t].filter(Boolean).join("|");
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

    const hasStrongFrameSignal =
      contextFrameKeys.size >= 2 ||
      (distinctEvidenceScopeKeys.size >= 2 && contextsWithEvidenceScope >= 2);

    if (!hasStrongFrameSignal) {
      // Extra debug signal: if contexts are very similar by text/metadata, it's likely a dimension split.
      const thrRaw =
        state.pipelineConfig?.evidenceScopeAlmostEqualThreshold ??
        DEFAULT_PIPELINE_CONFIG.evidenceScopeAlmostEqualThreshold ??
        0.7;
      const simThreshold = Number.isFinite(thrRaw) ? Math.max(0, Math.min(1, thrRaw)) : 0.7;
      const pairs: Array<{ a: string; b: string; sim: number }> = [];
      for (let i = 0; i < contextsNow.length; i++) {
        for (let j = i + 1; j < contextsNow.length; j++) {
          const sim = calculateContextSimilarity(contextsNow[i] as any, contextsNow[j] as any);
          if (sim >= simThreshold) {
            pairs.push({ a: (contextsNow[i] as any).name, b: (contextsNow[j] as any).name, sim });
          }
        }
      }
      debugLog("refineContextsFromEvidence: rejected (likely dimension split, weak frame signals)", {
        contextCount: contextsNow.length,
        contextFrameKeyCount: contextFrameKeys.size,
        distinctEvidenceScopeKeys: distinctEvidenceScopeKeys.size,
        contextsWithEvidenceScope,
        highSimilarityPairs: pairs.slice(0, 8),
      });
      return { updated: false, llmCalls: 1 };
    }
  }

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

  // Ensure we never end up with zero contexts.
  state.understanding = ensureAtLeastOneContext(state.understanding!);

  // If we introduced multi-context but claim coverage is thin, add minimal per-context central claims.
  // (This is generic decomposition; it does not “hunt” for named scenarios.)
  if (state.understanding!.analysisContexts.length > 1 && state.understanding!.subClaims.length <= 1) {
    const added = await requestSupplementalSubClaims(analysisInput, model, state.understanding!, state.pipelineConfig);
    if (added.length > 0) {
      state.understanding!.subClaims.push(...added);
    }
    return { updated: true, llmCalls: 2 };
  }

  return { updated: true, llmCalls: 1 };
}

export function normalizeYesNoQuestionToStatement(input: string): string {
  const trimmed = input.trim().replace(/\?+$/, "");

  // Handle the common yes/no forms in a way that is stable and avoids bad grammar.
  // Goal: "Was the X fair and based on Y?" -> "The X was fair and based on Y"
  // NOTE: needsNormalizationEntry (entry point) checks a broader set of auxiliaries (did/do/does/has/have/had/can/...),
  // so this function must also handle those; otherwise question vs statement inputs can diverge.
  const m = trimmed.match(
    /^(was|were|is|are|did|do|does|has|have|had|can|could|will|would|should|may|might)\s+(.+)$/i,
  );
  if (!m) {
    return trimmed;
  }

  const aux = m[1].toLowerCase(); // was|were|is|are|did|do|does|has|have|had|can|could|will|would|should|may|might
  const rest = m[2].trim();
  if (!rest) return trimmed;

  // Prefer splitting on a clear subject boundary (parentheses / comma) when present.
  const lastParen = rest.lastIndexOf(")");
  if (lastParen > 0 && lastParen < rest.length - 1) {
    const subject = rest.slice(0, lastParen + 1).trim();
    const predicate = rest.slice(lastParen + 1).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
    return out;
  }

  const commaIdx = rest.indexOf(",");
  if (commaIdx > 0 && commaIdx < rest.length - 1) {
    const subject = rest.slice(0, commaIdx).trim();
    const predicate = rest.slice(commaIdx + 1).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
    return out;
  }

  // Heuristic: split before common predicate starters.
  // Keep this generic (no domain-specific terms) but broad enough to handle common yes/no question shapes:
  // - evaluation adjectives ("fair", "true", ...)
  // - common verbs ("cause", "increase", ...)
  const predicateStarters = [
    "fair",
    "true",
    "false",
    "accurate",
    "correct",
    "legitimate",
    "legal",
    "valid",
    "based",
    "justified",
    "reasonable",
    "biased",
    // generic verb starters (helps convert "Did/Does/Can X cause Y?" -> "X did/does/can cause Y")
    "cause",
    "causes",
    "caused",
    "increase",
    "increases",
    "increased",
    "decrease",
    "decreases",
    "decreased",
    "improve",
    "improves",
    "improved",
    "reduce",
    "reduces",
    "reduced",
    "prevent",
    "prevents",
    "prevented",
    "lead",
    "leads",
    "led",
    "result",
    "results",
    "resulted",
  ];
  const starterRe = new RegExp(`\\b(${predicateStarters.join("|")})\\b`, "i");
  const starterMatch = rest.match(starterRe);
  if (starterMatch && typeof starterMatch.index === "number" && starterMatch.index > 0) {
    const subject = rest.slice(0, starterMatch.index).trim();
    const predicate = rest.slice(starterMatch.index).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    if (subject && predicate) {
      const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
      return out;
    }
  }

  // Fallback: don't guess a subject/predicate split; keep the remainder intact and use a stable grammatical form.
  // For copulas (is/are/was/were), "It <aux> the case that …" is grammatical.
  // For other auxiliaries, avoid "It do/has/can the case that …" and instead keep meaning with "It is the case that …".
  const copulas = new Set(["is", "are", "was", "were"]);
  const out = copulas.has(aux)
    ? `It ${aux} the case that ${rest}`
    : `It is the case that ${rest}`;
  // Preserve modality/tense as much as possible by not dropping content; we only normalize the question form.
  // (We intentionally do NOT attempt complex verb conjugation.)
  const normalized = out.replace(/\s+/g, " ").trim();
  return normalized;
}

/**
 * NEW v2.6.29: Generate an inverse claim query for counter-evidence search
 * For comparative claims like "X is better than Y", generates "Y is better than X"
 * For efficiency claims, generates the opposite ("inefficient", "less efficient", etc.)
 * Returns null if no meaningful inverse can be generated
 */
function generateInverseClaimQuery(claim: string): string | null {
  if (!claim || claim.length < 10) return null;

  const lowerClaim = claim.toLowerCase();

  // Pattern 1a: "Using X for Y is more Z than [using] W" - swap X and W
  // Example: "Using Technology A for transport is more efficient than using Technology B"
  // -> "Using Technology B for transport is more efficient than Technology A"
  const usingPattern = /using\s+(\w+(?:\s+\w+)?)\s+(?:for\s+\w+\s+)?(?:is|are)\s+(?:more\s+)?(\w+)\s+than\s+(?:using\s+)?(\w+(?:\s+\w+)?)/i;
  const usingMatch = claim.match(usingPattern);
  if (usingMatch) {
    const [, subjectA, adjective, subjectB] = usingMatch;
    // Generate proper inverse: swap subjects
    return `${subjectB.trim()} is more ${adjective} than ${subjectA.trim()}`;
  }

  // Pattern 1b: General comparative "X is/are [more] Z than Y" - swap X and Y
  const comparativePattern = /^(.+?)\s+(?:is|are)\s+(?:more\s+)?(\w+)\s+than\s+(.+)$/i;
  const compMatch = claim.match(comparativePattern);
  if (compMatch) {
    const [, subjectA, adjective, subjectB] = compMatch;
    // Clean up subjects (remove "using" prefix if present)
    const cleanA = subjectA.replace(/^using\s+/i, '').trim();
    const cleanB = subjectB.replace(/^using\s+/i, '').trim();
    // Generate inverse: "B is more [adjective] than A"
    return `${cleanB} is more ${adjective} than ${cleanA}`;
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
      const subjectMatch = claim.match(/(?:using\s+)?(\w+(?:\s+\w+){0,2})/i);
      if (subjectMatch) {
        return `${subjectMatch[1]} ${opposite} evidence study`;
      }
    }
  }

  // Pattern 3: Simple negation for factual claims
  // For claims starting with "The X is/was/has", search for contradicting evidence
  const factualPattern = /^(?:the\s+)?(.+?)\s+(?:is|was|has|have|are|were)\s+(.+)/i;
  const factMatch = claim.match(factualPattern);
  if (factMatch) {
    const [, subject, predicate] = factMatch;
    // Search for evidence that contradicts
    return `${subject.trim()} not ${predicate.trim().split(' ').slice(0, 3).join(' ')}`;
  }

  // Fallback: extract key terms and add contradiction modifiers
  const words = claim.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ');
  return `${words} false incorrect evidence against`;
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
function analyzeEvidenceGaps(
  evidenceItems: EvidenceItem[],
  understanding: ClaimUnderstanding,
  searchQueries: Array<{ query: string; iteration: number }>,
  evidenceSimilarityThreshold: number = 0.4,
): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];

  for (const claim of understanding.subClaims) {
    // Find evidence items that might be relevant to this claim
    const relevantEvidence = evidenceItems.filter((e) => {
      // Check if evidence is assigned to same context
      if (e.contextId && claim.contextId && e.contextId === claim.contextId) return true;
      // Check for text similarity
      const similarity = calculateTextSimilarity(e.statement, claim.text);
      return similarity > evidenceSimilarityThreshold;
    });

    // Get queries that were attempted for this claim's context
    const attemptedQueries = searchQueries
      .filter((sq) => sq.query.toLowerCase().includes(claim.text.toLowerCase().split(" ").slice(0, 3).join(" ")))
      .map((sq) => sq.query);

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
          claim.text,
          `${claim.text} evidence study`,
          `${claim.text.split(" ").slice(0, 5).join(" ")} official source`,
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
        suggestedQueries: inverseQuery ? [inverseQuery] : [`${claim.text} criticism controversy dispute`],
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
          `${claim.text} official source`,
          `${claim.text} study research`,
          `${claim.text.split(" ").slice(0, 4).join(" ")} peer reviewed`,
        ],
        attemptedQueries,
      });
    }
  }

  return gaps;
}

/**
 * NEW v2.6.29: Calculate similarity between two strings (Jaccard similarity on words)
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function selectEvidenceItemsForContextRefinementPrompt(
  evidenceItems: EvidenceItem[],
  analysisInput: string,
  maxEvidenceItems: number,
): EvidenceItem[] {
  if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) return [];
  if (evidenceItems.length <= maxEvidenceItems) return evidenceItems;

  const mustKeepIds = new Set<string>();
  const bestByContext = new Map<string, { evidenceItem: EvidenceItem; score: number }>();
  const input = (analysisInput || "").trim();
  for (const item of evidenceItems) {
    if (!item?.id) continue;
    if (item.category === "criticism") mustKeepIds.add(item.id);
    if (item.claimDirection === "contradicts") mustKeepIds.add(item.id);
    if (item.fromOppositeClaimSearch) mustKeepIds.add(item.id);
    if (item.evidenceScope) mustKeepIds.add(item.id);
    if (item.contextId) {
      const score = input ? calculateTextSimilarity(input, item.statement || "") : 0;
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
      const score = input ? calculateTextSimilarity(input, item.statement || "") : 0;
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

function calculateContextSimilarity(a: AnalysisContext, b: AnalysisContext): number {
  const nameA = String(a?.name || "");
  const nameB = String(b?.name || "");

  const nameSim = calculateTextSimilarity(nameA, nameB);
  const subjectSim =
    a?.subject && b?.subject ? calculateTextSimilarity(String(a.subject), String(b.subject)) : 0;

  const assessedSim =
    (a as any)?.assessedStatement && (b as any)?.assessedStatement
      ? calculateTextSimilarity(String((a as any).assessedStatement), String((b as any).assessedStatement))
      : 0;

  // NOTE: geographic/timeframe can be noisy and should not dominate similarity/dedup.
  // Treat them as secondary modifiers, not primary identity signals.
  const primaryKeys = [
    "court",            // authority venue (if present)
    "institution",      // who is the authority
    "jurisdiction",     // where the authority applies (if present)
    "methodology",      // how was it measured/determined
    "definition",       // what does the term mean
    "framework",        // what evaluative structure applies
    "boundaries",       // limits of applicability
  ];

  const secondaryKeys = [
    "geographic",       // where
    "timeframe",        // when
    "scale",            // individual vs aggregate
  ];

  const metaA: Record<string, any> = (a as any)?.metadata || {};
  const metaB: Record<string, any> = (b as any)?.metadata || {};

  let primarySim = 0;
  let primaryCount = 0;
  for (const k of primaryKeys) {
    const va = String((metaA as any)?.[k] ?? "").trim();
    const vb = String((metaB as any)?.[k] ?? "").trim();
    if (!va || !vb) continue;
    primarySim += calculateTextSimilarity(va, vb);
    primaryCount++;
  }
  if (primaryCount > 0) primarySim /= primaryCount;

  let secondarySim = 0;
  let secondaryCount = 0;
  for (const k of secondaryKeys) {
    const va = String((metaA as any)?.[k] ?? "").trim();
    const vb = String((metaB as any)?.[k] ?? "").trim();
    if (!va || !vb) continue;
    secondarySim += calculateTextSimilarity(va, vb);
    secondaryCount++;
  }
  if (secondaryCount > 0) secondarySim /= secondaryCount;

  // Weighted average:
  // - name (35%): still important, but names can vary while describing the same context
  // - primary metadata (30%): includes institutional/boundary identity signals (now also includes court)
  // - assessedStatement (20%): directly captures the analytical question for this context
  // - subject (10%): often overlaps across all contexts (thesis), so keep secondary
  // - geo/time (5%): noisy, keep minimal
  let similarity =
    nameSim * 0.35 +
    primarySim * 0.3 +
    assessedSim * 0.2 +
    subjectSim * 0.1 +
    secondarySim * 0.05;

  // Generic near-duplicate override: if two contexts are essentially asking the same assessed question
  // (high assessedStatement similarity) and have at least mild agreement on identity signals, merge them.
  // This helps collapse redundant rephrasings like:
  // - "procedural compliance ..." vs "procedural compliance in Jurisdiction A ..."
  if (assessedSim >= 0.75 && (nameSim >= 0.25 || primarySim >= 0.15)) {
    similarity = Math.max(similarity, 0.92);
  }

  return Math.min(1.0, similarity);
}

function mergeContextMetadata(primary: AnalysisContext, duplicates: AnalysisContext[]): AnalysisContext {
  const merged: AnalysisContext = { ...(primary as any) };
  const outMeta: Record<string, any> = { ...(((primary as any).metadata as any) || {}) };

  for (const dup of duplicates || []) {
    const dm: Record<string, any> = ((dup as any)?.metadata as any) || {};
    for (const [k, v] of Object.entries(dm)) {
      const existing = outMeta[k];
      const isEmpty =
        existing === undefined ||
        existing === null ||
        (typeof existing === "string" && existing.trim() === "");
      if (isEmpty && v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "")) {
        outMeta[k] = v;
      }
    }
  }

  (merged as any).metadata = outMeta;
  return merged;
}

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
          sim = calculateContextSimilarity(cur, other);
          shouldMerge = sim >= similarityThreshold;
        }
      } else {
        sim = calculateContextSimilarity(cur, other);
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

function validateAndFixContextNameAlignment(
  contexts: AnalysisContext[],
  evidenceItems: EvidenceItem[],
  similarityThreshold: number,
): AnalysisContext[] {
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

  const covers = (name: string, identifier: string) => {
    const n = String(name || "").toLowerCase();
    const id = String(identifier || "").toLowerCase().trim();
    if (!id) return false;
    if (n.includes(id)) return true;
    return calculateTextSimilarity(n, id) >= similarityThreshold;
  };

  return contexts.map((s) => {
    const contextEvidenceItems = evidenceItemsByContext.get(String((s as any)?.id || "")) || [];
    const meta: Record<string, any> = ((s as any)?.metadata as any) || {};

    // Gather candidate identifiers from per-evidence evidenceScope (prioritize common values)
    const counts = new Map<string, number>();
    const bump = (v: string, w: number = 1) => {
      const vv = String(v || "").trim();
      if (!vv) return;
      counts.set(vv, (counts.get(vv) || 0) + Math.max(1, Math.floor(w)));
    };
    for (const f of contextEvidenceItems) {
      const es: any = (f as any)?.evidenceScope;
      if (!es) continue;
      // Higher weight for core methodology/boundaries/name signals.
      bump(es.name, 3);
      bump(es.methodology, 3);
      bump(es.boundaries, 3);
      // Lower weight for geo/time to avoid misleading names.
      bump(es.geographic, 1);
      bump(es.temporal, 1);
    }

    // Add stable metadata string values as lower-priority candidates
    for (const k of primaryMetaKeys) {
      const v = meta?.[k];
      if (typeof v === "string" && v.trim()) bump(v.trim());
    }
    for (const k of secondaryMetaKeys) {
      const v = meta?.[k];
      if (typeof v === "string" && v.trim()) bump(v.trim());
    }

    const identifiers = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([v]) => v);

    if (identifiers.length === 0) return s;

    const name = String((s as any)?.name || "");
    const alreadyAligned = identifiers.some((id) => covers(name, id));

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

/**
 * Pipeline Phase 1: Normalize URL for deduplication
 * Removes tracking params, normalizes www prefix, lowercases, removes hash fragments
 */
function normalizeUrlForDedup(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove common tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    // Remove hash fragment
    parsed.hash = "";
    // Normalize hostname: lowercase and remove www prefix
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return parsed.toString().toLowerCase();
  } catch {
    // If URL parsing fails, return lowercased original
    return url.toLowerCase();
  }
}

/**
 * Pipeline Phase 1: Filter search results to exclude already-processed URLs
 * Returns only new URLs and tracks them in the state
 */
function deduplicateSearchUrls<T extends { url: string }>(
  results: T[],
  state: { processedUrls: Set<string>; urlDeduplicationCount: number },
): T[] {
  const deduplicated: T[] = [];
  for (const result of results) {
    const normalized = normalizeUrlForDedup(result.url);
    if (state.processedUrls.has(normalized)) {
      state.urlDeduplicationCount++;
      console.log(`[Analyzer] URL dedup: Skipping already-processed URL: ${result.url}`);
      continue;
    }
    state.processedUrls.add(normalized);
    deduplicated.push(result);
  }
  return deduplicated;
}

/**
 * NEW v2.6.29: Check if an evidence item is a duplicate or near-duplicate of existing items
 * Returns true if the evidence item should be skipped (is duplicate)
 */
function isDuplicateEvidenceItem(
  newItem: EvidenceItem,
  existingItems: EvidenceItem[],
  threshold: number = 0.85,
): boolean {
  const newItemLower = newItem.statement.toLowerCase().trim();

  for (const existing of existingItems) {
    const existingLower = existing.statement.toLowerCase().trim();

    // Exact match
    if (newItemLower === existingLower) {
      return true;
    }

    // Near-duplicate based on text similarity
    const similarity = calculateTextSimilarity(newItem.statement, existing.statement);
    if (similarity >= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * NEW v2.6.29: Filter out duplicate evidence items from a list, keeping the first occurrence
 * Optionally merges fromOppositeClaimSearch flag if duplicate found from opposite search
 */
function deduplicateEvidenceItems(
  newEvidenceItems: EvidenceItem[],
  existingEvidenceItems: EvidenceItem[],
): EvidenceItem[] {
  const result: EvidenceItem[] = [];

  for (const item of newEvidenceItems) {
    if (!isDuplicateEvidenceItem(item, existingEvidenceItems) && !isDuplicateEvidenceItem(item, result)) {
      result.push(item);
    } else {
      // Log deduplication for debugging
      console.log(`[Analyzer] Deduplication: Skipping near-duplicate evidence item: "${item.statement.substring(0, 60)}..."`);
    }
  }

  return result;
}

/**
 * Detect if a topic likely requires recent data
 * Returns true if dates, recent keywords, or temporal indicators suggest recency matters
 * v2.6.23: Removed domain-specific person names to comply with Generic by Design principle
 */
function isRecencySensitive(text: string, understanding?: ClaimUnderstanding): boolean {
  const lowerText = text.toLowerCase();

  // Check for recent date mentions (within last 3 years from current date - extended for better coverage)
  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  const yearPattern = /\b(20\d{2})\b/;
  const yearMatch = text.match(yearPattern);
  if (yearMatch) {
    const mentionedYear = parseInt(yearMatch[1]);
    if (recentYears.includes(mentionedYear)) {
      return true;
    }
  }

  // Check understanding for recent dates in contexts
  if (understanding?.analysisContexts) {
    for (const context of understanding.analysisContexts) {
      const dateStr = context.date || context.temporal || "";
      if (dateStr && recentYears.some(year => dateStr.includes(String(year)))) {
        return true;
      }
    }
  }

  return false;
}

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function pushDateCandidate(dates: Date[], seen: Set<string>, date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return;
  const key = date.toISOString().slice(0, 10);
  if (seen.has(key)) return;
  seen.add(key);
  dates.push(date);
}

function extractTemporalDateCandidates(text: string, currentDate: Date): Date[] {
  const dates: Date[] = [];
  const seen = new Set<string>();
  const lower = String(text || "").toLowerCase();
  if (!lower) return dates;

  const currentYear = currentDate.getFullYear();
  const maxYear = currentYear + 1;

  const isoPattern = /\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g;
  for (const match of lower.matchAll(isoPattern)) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (year < 1900 || year > maxYear) continue;
    pushDateCandidate(dates, seen, new Date(year, month, day));
  }

  const monthPattern = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})\b/g;
  for (const match of lower.matchAll(monthPattern)) {
    const monthToken = match[1];
    const year = Number(match[2]);
    const monthIndex = MONTH_NAME_TO_INDEX[monthToken];
    if (monthIndex == null || year < 1900 || year > maxYear) continue;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    pushDateCandidate(dates, seen, new Date(year, monthIndex, lastDay));
  }

  const quarterPattern = /\bq([1-4])\s*(20\d{2})\b/g;
  for (const match of lower.matchAll(quarterPattern)) {
    const quarter = Number(match[1]);
    const year = Number(match[2]);
    if (year < 1900 || year > maxYear) continue;
    const monthIndex = quarter * 3 - 1;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    pushDateCandidate(dates, seen, new Date(year, monthIndex, lastDay));
  }

  const rangePattern = /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/g;
  for (const match of lower.matchAll(rangePattern)) {
    const endYear = Number(match[2]);
    if (endYear < 1900 || endYear > maxYear) continue;
    pushDateCandidate(dates, seen, new Date(endYear, 11, 31));
  }

  const yearPattern = /\b(19|20)\d{2}\b/g;
  for (const match of lower.matchAll(yearPattern)) {
    const year = Number(match[0]);
    if (year < 1900 || year > maxYear) continue;
    pushDateCandidate(dates, seen, new Date(year, 11, 31));
  }

  return dates;
}

function validateEvidenceRecency(
  evidenceItems: EvidenceItem[],
  currentDate: Date,
  windowMonths: number
): { hasRecentEvidence: boolean; latestEvidenceDate?: string; signalsCount: number; dateCandidates: number } {
  const temporalSignals: string[] = [];
  for (const item of evidenceItems || []) {
    if (item?.evidenceScope?.temporal) temporalSignals.push(item.evidenceScope.temporal);
    if (item?.sourceTitle) temporalSignals.push(item.sourceTitle);
    if (item?.sourceUrl) temporalSignals.push(item.sourceUrl);
  }

  const dates: Date[] = [];
  for (const signal of temporalSignals) {
    dates.push(...extractTemporalDateCandidates(signal, currentDate));
  }

  let latestDate: Date | undefined;
  for (const d of dates) {
    if (!latestDate || d > latestDate) latestDate = d;
  }

  const cutoff = new Date(currentDate);
  cutoff.setMonth(cutoff.getMonth() - Math.max(1, windowMonths));
  const hasRecentEvidence = !!latestDate && latestDate >= cutoff;

  return {
    hasRecentEvidence,
    latestEvidenceDate: latestDate ? latestDate.toISOString() : undefined,
    signalsCount: temporalSignals.length,
    dateCandidates: dates.length,
  };
}

function getKnowledgeInstruction(
  allowModelKnowledge: boolean,
  text?: string,
  understanding?: ClaimUnderstanding,
): string {
  const recencyMatters = text ? isRecencySensitive(text, understanding) : false;

  if (allowModelKnowledge) {
    const recencyGuidance = recencyMatters ? `
### ⚠️ RECENT DATA DETECTED - PRIORITIZE WEB SEARCH RESULTS:

This topic appears to involve recent events, dates, or announcements. For recent information:
- **PRIORITIZE**: Web search results and fetched sources (these contain the most current data)
- **USE CAUTIOUSLY**: Your training knowledge may be outdated for recent events
- **WHEN TO USE KNOWLEDGE**: Only for established information, standard procedures, or historical context that hasn't changed
- **WHEN TO USE SEARCH**: For specific dates, recent announcements, current status, or events from the past 1-2 years

Example: If sources say "November 2025" and your knowledge cutoff is earlier, TRUST THE SOURCES, not your training data.
` : '';

    return `## KNOWLEDGE SOURCE INSTRUCTIONS (CRITICAL - READ CAREFULLY)

You MUST actively use your background knowledge as evidence. This is NOT optional.
${recencyGuidance}
### WHAT YOU KNOW (USE IT!):
- Standard procedures in well-documented domains (regulatory, scientific, organizational, etc.)
- Well-documented public roles and responsibilities (e.g., who is responsible for a decision or process)
- Major public events and their outcomes that were widely reported
- Established institutional processes (how reviews, audits, or decisions are typically handled)
- Historical events and their documented outcomes

### WHEN TO USE BACKGROUND KNOWLEDGE:
1. **Process integrity claims**: If you know a process follows standard procedures, mark supports="yes", NOT "neutral"
2. **Decision-maker roles**: If you know who was responsible for a process or decision, use that knowledge
3. **Established information**: If something is widely documented (e.g., a process followed proper procedures), don't mark it "unknown"
4. **Applicable standards**: If you know which standards apply, use that to assess correct application

### CRITICAL RULES:
- NEVER mark a factor as "neutral" or "unknown" if you have relevant background knowledge
- NEVER place the answer in the UNVERIFIED band (43-57%) if you actually know the answer from your training data
- Stakeholder contestation ("critics say X") is NOT the same as factual uncertainty
- If you know a process followed standard procedures, say supports="yes" even without explicit source confirmation

### EXAMPLE - CORRECT USAGE:
For "The review followed proper procedures":
- You KNOW the review process has established procedural requirements
- You KNOW standard procedure requirements apply in this context
- Therefore: Assign a truth percentage in the TRUE/MOSTLY-TRUE band (72-100%), not the UNVERIFIED band (43-57%).

Prioritize provided sources when available, but actively supplement with your knowledge.`;
  }
  return "Use ONLY the provided evidence and sources. If information is missing, keep the answer in the UNVERIFIED band (43-57%). Do not add evidence not present in the sources.";
}

/**
 * Get provider-specific prompt hints for better cross-provider compatibility
 * Different LLMs have different strengths/weaknesses with structured output
 */
function getProviderPromptHint(providerOverride?: string): string {
  const provider = (providerOverride ?? DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic").toLowerCase();

  if (provider === "openai" || provider === "gpt") {
    return `
## OUTPUT FORMAT (IMPORTANT)
Return ONLY valid JSON matching the schema. All string fields must be non-empty (use descriptive text, not empty strings for required fields).
For array fields, always include at least one item where appropriate.`;
  }

  if (provider === "anthropic" || provider === "claude") {
    return `
## OUTPUT FORMAT (CRITICAL)
Return ONLY valid JSON. Do NOT include any explanation text outside the JSON.
- All enum fields must use EXACT values from the allowed options (case-sensitive)
- All boolean fields must be true or false (not strings)
- All number fields must be numbers (not strings)
- Do not omit any required fields
- For empty arrays, use [] not null`;
  }

  if (provider === "google" || provider === "gemini") {
    return `
## OUTPUT FORMAT (CRITICAL)
Return ONLY valid JSON. Do NOT include any explanation text outside the JSON.
- All enum fields must use EXACT values from the allowed options
- All boolean fields must be true or false (not strings)
- All number fields must be numbers (not strings)
- For empty arrays, use [] not null`;
  }

  if (provider === "mistral") {
    return `
## OUTPUT FORMAT (CRITICAL)
Return ONLY valid JSON matching the exact schema structure.
- Use the exact enum values specified (case-sensitive)
- Do not omit any required fields
- Use empty string "" for optional string fields with no value
- Use empty array [] for optional array fields with no items`;
  }

  return "";
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

// Confidence threshold to distinguish MIXED from UNVERIFIED
const MIXED_CONFIDENCE_THRESHOLD = 60;

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
  switch (band) {
    case "strong":
      return Math.round(72 + 28 * conf);
    case "partial":
      return Math.round(50 + 35 * conf);
    case "uncertain":
      return Math.round(35 + 30 * conf);
    case "refuted":
      return Math.round(28 * (1 - conf));
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


/**
 * Clamp truth percentage to valid [0, 100] range (PR-C: defensive safety)
 *
 * Prevents mathematically invalid verdict outputs that can occur from
 * incorrect trackRecordScore scaling or weighting calculations.
 *
 * @param value - Calculated truth percentage
 * @returns Clamped value in [0, 100] range
 */
export function clampTruthPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    console.error(`[Analyzer] Non-finite truthPercentage: ${value}, clamping to 50`);
    return 50;
  }

  if (value < 0 || value > 100) {
    console.error(
      `[Analyzer] truthPercentage out of bounds: ${value}, clamping to [0, 100]`
    );
    return Math.max(0, Math.min(100, value));
  }

  return value;
}


/**
 * Map truth percentage to 7-point claim verdict
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish MIXED from UNVERIFIED in 43-57% range.
 */
function percentageToClaimVerdict(truthPercentage: number, confidence?: number): ClaimVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) {
    // Distinguish MIXED (high confidence, evidence on both sides) from UNVERIFIED (low confidence, insufficient evidence)
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
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
  if (truthPercentage >= 86) return "YES";
  if (truthPercentage >= 72) return "MOSTLY-YES";
  if (truthPercentage >= 58) return "LEANING-YES";
  if (truthPercentage >= 43) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-NO";
  if (truthPercentage >= 15) return "MOSTLY-NO";
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
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
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
// WEIGHTED VERDICT CALCULATION (v2.6.30)
// ============================================================================

/**
 * Calculate claim weight based on centrality and confidence.
 * Higher centrality claims with higher confidence have more influence on the overall verdict.
 *
 * Weight = centralityMultiplier × (confidence / 100)
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
  if (normalized >= 72) return "green";
  if (normalized >= 43) return "yellow";
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
} from "./source-reliability";

// Re-export for backward compatibility
export { prefetchSourceReliability, getTrackRecordScore };

/**
 * Calculate de-duplicated weighted average truth percentage
 * Clusters near-duplicate claims and down-weights them so each semantic cluster
 * contributes approximately 1 unit to the average (prevents double-counting)
 */
function dedupeWeightedAverageTruth(verdicts: ClaimVerdict[]): number {
  if (verdicts.length === 0) return 50;
  if (verdicts.length === 1) return Math.round(verdicts[0].truthPercentage);

  // Simple token-based similarity clustering
  const tokenize = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3) // Ignore short words
    );
  };

  const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  };

  // Cluster claims by similarity (threshold 0.6)
  const clusters: ClaimVerdict[][] = [];
  for (const verdict of verdicts) {
    const tokens = tokenize(verdict.claimText);
    let addedToCluster = false;

    for (const cluster of clusters) {
      const clusterTokens = tokenize(cluster[0].claimText);
      if (jaccardSimilarity(tokens, clusterTokens) >= 0.6) {
        cluster.push(verdict);
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      clusters.push([verdict]);
    }
  }

  // Calculate weighted average: each cluster contributes ~1 unit
  let totalWeight = 0;
  let weightedSum = 0;

  for (const cluster of clusters) {
    // Primary claim gets weight 1.0, duplicates share remaining weight
    const primaryWeight = 1.0;
    const duplicateWeight = cluster.length > 1 ? 0.5 / (cluster.length - 1) : 0;

    // Sort by truthPercentage descending to pick primary
    const sorted = [...cluster].sort((a, b) => b.truthPercentage - a.truthPercentage);

    weightedSum += sorted[0].truthPercentage * primaryWeight;
    totalWeight += primaryWeight;

    for (let i = 1; i < sorted.length; i++) {
      weightedSum += sorted[i].truthPercentage * duplicateWeight;
      totalWeight += duplicateWeight;
    }
  }

  return Math.round(weightedSum / totalWeight);
}

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
 * P0: Validate verdict direction against evidence direction.
 * Detects when LLM returns HIGH verdict (>=72%) but majority of evidence contradicts the claim.
 *
 * @param claimVerdicts - Verdicts to validate
 * @param evidenceItems - All evidence items
 * @param options - Validation options
 * @returns Object with validated verdicts and any direction mismatches found
 */
function validateVerdictDirections(
  claimVerdicts: ClaimVerdict[],
  evidenceItems: EvidenceItem[],
  options: {
    /** Threshold for evidence majority (default 0.6 = 60%) */
    majorityThreshold?: number;
    /** Whether to auto-correct mismatched verdicts (default false) */
    autoCorrect?: boolean;
    /** Minimum evidence count to trigger validation (default 2) */
    minEvidenceCount?: number;
  } = {},
): {
  validatedVerdicts: ClaimVerdict[];
  mismatches: VerdictDirectionMismatch[];
  warnings: AnalysisWarning[];
} {
  const {
    majorityThreshold = 0.6,
    autoCorrect = false,
    minEvidenceCount = 2,
  } = options;

  const mismatches: VerdictDirectionMismatch[] = [];
  const warnings: AnalysisWarning[] = [];

  const validatedVerdicts = claimVerdicts.map((verdict) => {
    // Get evidence items linked to this claim
    const supportingIds = verdict.supportingEvidenceIds || [];
    const linkedEvidence = evidenceItems.filter((e) => supportingIds.includes(e.id));

    // Skip validation if not enough evidence
    if (linkedEvidence.length < minEvidenceCount) {
      return verdict;
    }

    // Count evidence by direction
    const supportCount = linkedEvidence.filter((e) => e.claimDirection === "supports").length;
    const contradictCount = linkedEvidence.filter((e) => e.claimDirection === "contradicts").length;
    const neutralCount = linkedEvidence.filter((e) => e.claimDirection === "neutral" || !e.claimDirection).length;
    const totalDirectional = supportCount + contradictCount;

    // Skip if no directional evidence
    if (totalDirectional === 0) {
      return verdict;
    }

    // Determine expected direction based on evidence majority
    const supportRatio = supportCount / totalDirectional;
    const contradictRatio = contradictCount / totalDirectional;

    // Evidence suggests claim should be TRUE (high verdict)
    const evidenceSuggestsHigh = supportRatio >= majorityThreshold;
    // Evidence suggests claim should be FALSE (low verdict)
    const evidenceSuggestsLow = contradictRatio >= majorityThreshold;

    // Determine actual direction from verdict
    const verdictIsHigh = verdict.truthPercentage >= 72; // MOSTLY-TRUE or higher
    const verdictIsLow = verdict.truthPercentage < 43; // LEANING-FALSE or lower

    // Check for mismatch
    const hasDirectionMismatch =
      (evidenceSuggestsLow && verdictIsHigh) || // Counter-evidence but HIGH verdict
      (evidenceSuggestsHigh && verdictIsLow);    // Support evidence but LOW verdict

    if (hasDirectionMismatch) {
      const expectedDirection = evidenceSuggestsHigh ? "high" : "low";
      const actualDirection = verdictIsHigh ? "high" : "low";

      const mismatch: VerdictDirectionMismatch = {
        claimId: verdict.claimId,
        claimText: verdict.claimText || "",
        verdictPct: verdict.truthPercentage,
        evidenceSupportCount: supportCount,
        evidenceContradictCount: contradictCount,
        evidenceNeutralCount: neutralCount,
        expectedDirection,
        actualDirection,
        wasCorrect: false,
      };

      // Log the mismatch
      console.warn(`[VerdictValidation] Direction mismatch detected for claim ${verdict.claimId}:`, {
        verdictPct: verdict.truthPercentage,
        supportCount,
        contradictCount,
        expectedDirection,
        actualDirection,
      });

      // Auto-correct if enabled
      if (autoCorrect) {
        let correctedPct: number;
        if (evidenceSuggestsLow && verdictIsHigh) {
          // Evidence contradicts but verdict is HIGH - pull down to LEANING-FALSE range
          correctedPct = Math.min(35, 100 - verdict.truthPercentage);
        } else {
          // Evidence supports but verdict is LOW - pull up to LEANING-TRUE range
          correctedPct = Math.max(65, 100 - verdict.truthPercentage);
        }
        mismatch.correctedVerdictPct = correctedPct;

        mismatches.push(mismatch);

        // Add warning
        warnings.push({
          type: "verdict_direction_mismatch",
          severity: "warning",
          message: `Verdict for "${verdict.claimText?.substring(0, 50)}..." was ${verdict.truthPercentage}% but ${Math.round(contradictRatio * 100)}% of evidence contradicts it. Auto-corrected to ${correctedPct}%.`,
          details: {
            claimId: verdict.claimId,
            expectedDirection,
            actualVerdictPct: verdict.truthPercentage,
            evidenceSupportPct: Math.round(supportRatio * 100),
            correctedVerdictPct: correctedPct,
          },
        });

        return {
          ...verdict,
          truthPercentage: correctedPct,
          verdict: correctedPct,
          highlightColor: getHighlightColor7Point(correctedPct),
          // Add flag to indicate this was auto-corrected
          verdictDirectionCorrected: true,
          originalVerdictPct: verdict.truthPercentage,
        } as ClaimVerdict;
      }

      mismatches.push(mismatch);

      // Add warning (without correction)
      warnings.push({
        type: "verdict_direction_mismatch",
        severity: "warning",
        message: `Verdict for "${verdict.claimText?.substring(0, 50)}..." is ${verdict.truthPercentage}% but ${Math.round(contradictRatio * 100)}% of evidence contradicts it. Manual review recommended.`,
        details: {
          claimId: verdict.claimId,
          expectedDirection,
          actualVerdictPct: verdict.truthPercentage,
          evidenceSupportPct: Math.round(supportRatio * 100),
        },
      });
    }

    return verdict;
  });

  if (mismatches.length > 0) {
    debugLog("validateVerdictDirections: Found mismatches", {
      count: mismatches.length,
      claimIds: mismatches.map((m) => m.claimId),
    });
  }

  return { validatedVerdicts, mismatches, warnings };
}

/**
 * Sanitize temporal error phrases from LLM-generated reasoning
 * Removes false "temporal error", "in the future", "date discrepancy" comments
 * that occur when LLM incorrectly assumes dates are impossible
 */
function sanitizeTemporalErrors(reasoning: string, currentDate: Date): string {
  const temporalErrorPatterns = [
    /temporal\s+error/gi,
    /in\s+the\s+future\s+from\s+the\s+current\s+date/gi,
    /date\s+discrepancy/gi,
    /(?:claim|statement|event)\s+(?:is|was)\s+(?:in\s+the\s+)?future/gi,
    /(?:occurred|happened)\s+in\s+the\s+future/gi,
    /cannot\s+have\s+occurred\s+yet/gi,
    /has\s+not\s+yet\s+happened/gi,
    /impossible\s+(?:date|timing)/gi,
  ];

  let sanitized = reasoning;
  let hasTemporalError = false;

  for (const pattern of temporalErrorPatterns) {
    if (pattern.test(sanitized)) {
      hasTemporalError = true;
      // Replace with neutral phrasing
      sanitized = sanitized.replace(pattern, "[date evaluated]");
    }
  }

  if (hasTemporalError) {
    debugLog("sanitizeTemporalErrors: Cleaned temporal error text", {
      before: reasoning.substring(0, 150),
      after: sanitized.substring(0, 150),
    });
  }

  return sanitized;
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
  thesisRelevanceConfidence: z.number().int().min(0).max(100).catch(100),
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

function enforceThesisRelevanceInvariants<T extends { thesisRelevance?: any; centrality?: any; isCentral?: any; text?: any }>(
  claims: T[],
  thesis?: string,
): T[] {
  const thesisLower = (thesis || "").toLowerCase();

  const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "at",
    "by",
    "from",
    "as",
    "into",
    "than",
    "over",
    "under",
    "using",
    "use",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "this",
    "that",
    "these",
    "those",
  ]);
  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 3 && !STOP_WORDS.has(t));
  const overlapRatio = (a: string, b: string): number => {
    const aTokens = tokenize(a);
    const bTokens = tokenize(b);
    if (aTokens.length === 0 || bTokens.length === 0) return 0;
    const aSet = new Set(aTokens);
    const bSet = new Set(bTokens);
    let inter = 0;
    for (const t of aSet) if (bSet.has(t)) inter++;
    const denom = Math.min(aSet.size, bSet.size);
    return denom > 0 ? inter / denom : 0;
  };

  for (const claim of claims as any[]) {
    const raw = String(claim?.thesisRelevance || "direct").trim();
    let thesisRelevance =
      raw === "direct" || raw === "tangential" || raw === "irrelevant" ? raw : "direct";
    const isMarkedCentral = claim?.isCentral === true || claim?.centrality === "high";

    // If a claim substantially overlaps the thesis text, it should be direct (not tangential).
    if (thesisRelevance === "tangential") {
      const claimText = String(claim?.text || "");
      const overlap = overlapRatio(claimText, thesisLower);
      if (overlap >= 0.5) {
        thesisRelevance = "direct";
        debugLog("enforceThesisRelevanceInvariants: High overlap → direct", {
          claimText: claimText.slice(0, 80),
          thesis: thesisLower.slice(0, 80),
          overlap,
        });
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

  const isCompound = isCompoundLikeText(analysisInput) || analysisInput.includes("\n");
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

function ensureUnassignedClaimsContext(
  understanding: ClaimUnderstanding,
): ClaimUnderstanding {
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

  const pickBestContextId = (claimText: string): string => {
    const text = String(claimText || "").trim();
    let bestId = candidates[0].id;
    let bestScore = -1;
    for (const c of candidates) {
      const score = text ? calculateTextSimilarity(text, c.signature) : 0;
      if (score > bestScore) {
        bestScore = score;
        bestId = c.id;
      } else if (score === bestScore && c.id.localeCompare(bestId) < 0) {
        bestId = c.id;
      }
    }
    return bestId;
  };

  for (const c of claims) {
    const tr = String(c?.thesisRelevance || "direct");
    if (tr === "irrelevant") continue;
    const pid = String(c?.contextId || "").trim();
    if (pid) continue;
    c.contextId = pickBestContextId(String(c?.text || ""));
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
      affiliation: z.string().optional(),
    })).optional(),

    // Scientific domain
    methodology: z.string().optional(),
    boundaries: z.string().optional(),
    geographic: z.string().optional(),
    dataSource: z.string().optional(),

    // Regulatory domain
    regulatoryBody: z.string().optional(),
    standardApplied: z.string().optional(),
  }).passthrough().default({}),  // passthrough allows any additional fields
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
  thesisRelevanceConfidence: z.number().int().min(0).max(100).optional(),
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
// but MUST NOT force “central” marking. Centrality is determined by the LLM + guardrails.
// Raise minimums to avoid collapsing compound inputs into a single claim.
const MIN_CORE_CLAIMS_PER_PROCEEDING = 2;
const MIN_TOTAL_CLAIMS_WITH_SINGLE_CORE = 3;
const SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS = 2;
const SHORT_SIMPLE_INPUT_MAX_CHARS = 60;
const MIN_DIRECT_CLAIMS_PER_CONTEXT = 2;

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

function isComparativeLikeText(text: string): boolean {
  const t = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!t.includes(" than ")) return false;
  const before = t.split(" than ")[0] || "";
  const window = before.split(/\s+/).slice(-6).join(" ");
  // Generic comparative cues (topic-agnostic; no domain keywords).
  if (/\b(more|less|better|worse|higher|lower|fewer|greater|smaller)\b/.test(window)) return true;
  // Heuristic: common comparative adjective/adverb form (e.g., "faster", "cheaper") near "than".
  if (/\b[a-z]{3,}er\b/.test(window)) return true;
  return false;
}

function isCompoundLikeText(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  if (/[;,]/.test(t)) return true;
  if (/\b(and|or|but|while|which|that)\b/.test(t)) return true;
  // Simple enumeration cue: multiple numerals or roman numerals separated by commas.
  if (/\b[ivxlcdm]+\b/.test(t) && t.includes(",")) return true;
  return false;
}

function buildHeuristicSubClaims(
  input: string,
  existingClaims: ClaimUnderstanding["subClaims"],
  contextId: string,
  maxClaims = 6,
): ClaimUnderstanding["subClaims"] {
  const normalize = (text: string) =>
    (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  const existing = new Set(existingClaims.map((c) => normalize(c.text || "")).filter(Boolean));
  const candidates = deriveCandidateClaimTexts(input)
    .filter((c) => !existing.has(normalize(c)))
    .slice(0, maxClaims);

  let idx = 0;
  return candidates.map((text) => ({
    id: `HC${++idx}`,
    text,
    type: "factual" as const,
    claimRole: "core" as const,
    dependsOn: [],
    keyEntities: [],
    checkWorthiness: "high" as const,
    harmPotential: "medium" as const,
    centrality: "medium" as const,
    isCentral: false,
    thesisRelevance: "direct" as const,
    thesisRelevanceConfidence: 100,
    isCounterClaim: false, // Heuristic claims default to thesis-aligned
    contextId,
    approximatePosition: "",
    keyFactorId: "",
  }));
}

async function understandClaim(
  input: string,
  model: any,
  pipelineConfig?: PipelineConfig,
): Promise<ClaimUnderstanding> {
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
  // INPUT CONTRACT: Caller (runFactHarborAnalysis) MUST normalize input before calling.
  // This function receives already-normalized statement-form input.
  // =========================================================================
  const trimmedInputRaw = input.trim();

  // Store original input for UI display (before any normalization)
  const originalInputDisplay = trimmedInputRaw;

  // CONTRACT ASSERTION: Input should already be normalized by caller.
  // In development/test mode, warn if input looks like a question (indicates contract violation).
  if (process.env.NODE_ENV !== "production") {
    const looksLikeQuestion =
      trimmedInputRaw.endsWith("?") ||
      /^(was|is|are|were|did|do|does|has|have|had|can|could|will|would|should|may|might)\s/i.test(
        trimmedInputRaw,
      );
    if (looksLikeQuestion) {
      console.warn(
        "[Analyzer] CONTRACT VIOLATION: understandClaim received question-form input. " +
        "Caller should normalize via normalizeYesNoQuestionToStatement() before calling."
      );
      console.warn(`[Analyzer]   Input: "${trimmedInputRaw.substring(0, 100)}..."`);
    }
  }

  // Use input directly - it should already be normalized by caller
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

  // Detect recency sensitivity for this analysis (using normalized input)
  const recencyMatters = isRecencySensitive(analysisInput, undefined);

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
    // Non-fatal: fall back to inline heuristics if service fails
    debugLog("understandClaim: inputClassification failed, using inline heuristics", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // v2.8: Pre-detect contexts using heuristics (shared implementation from analysis-contexts.ts)
  const contextDetectionMethod =
    pipelineConfig?.contextDetectionMethod ?? "heuristic";
  // v2.9.2: Context detection is now done entirely by LLM - no pattern-based pre-detection
  // The LLM should discover analytical contexts independently based on the input content
  const preDetectedContexts = contextDetectionMethod === "heuristic"
    ? detectContexts(analysisInput)
    : pipelineConfig
      ? await detectContextsHybrid(analysisInput, pipelineConfig)
      : detectContexts(analysisInput);
  // Note: preDetectedContexts are internal hints and are NOT passed to the LLM prompt
  debugLog("understandClaim: preDetectedContexts (heuristic, not passed to LLM)", {
    count: preDetectedContexts?.length ?? 0,
    ids: (preDetectedContexts || []).map((s: any) => String(s?.id || "")).filter(Boolean),
  });

  const systemPrompt = `You are a professional evidence analyst analyzing inputs for verification. Your role is to identify distinct AnalysisContexts requiring separate evaluation, detect background details if present, extract verifiable claims while separating attribution from core content, establish claim dependencies, and generate strategic search queries.

TERMINOLOGY (critical):
- Background details: Optional narrative frame or topic of the input. Descriptive only and NOT a reason to split analysis. Output as backgroundDetails.
- AnalysisContext: a bounded analytical frame that should be analyzed separately. Output as analysisContexts.
- EvidenceScope: per-evidence source metadata (methodology/boundaries/geography/temporal) attached to individual evidence items later in the pipeline. NOT the same as AnalysisContext.

NOT DISTINCT ANALYSIS CONTEXTS:
- Different perspectives on the same event (e.g., "Country A view" vs "Country B view") are NOT separate AnalysisContexts by themselves.
- Pro vs con viewpoints are NOT AnalysisContexts.
- "Public perception", "trust", or "confidence in institutions" AnalysisContexts - AVOID unless explicitly the main topic.
- Meta-level commentary AnalysisContexts (how people feel about the topic) - AVOID, focus on factual AnalysisContexts.

ANALYSIS CONTEXT RELEVANCE REQUIREMENT (CRITICAL):
- Every AnalysisContext MUST be directly relevant to the SPECIFIC TOPIC of the input
- Do NOT include AnalysisContexts from unrelated domains just because they share a general category
- Example: If input is about "Topic A's efficiency", do NOT include AnalysisContexts about "Topic B regulations" or "Topic C subsidies" just because all are in a broad category
- Example: If input is about "Substance A effects", do NOT include AnalysisContexts about "Substance B studies" or "Substance C research" just because all involve consumption
- Each AnalysisContext must have a clear, direct connection to the input's subject matter
- When in doubt, use fewer AnalysisContexts rather than including marginally relevant ones
- An AnalysisContext with zero relevant claims/evidence should NOT exist

**CRITICAL: The Incompatibility Test (apply to ALL inputs)**
Before finalizing AnalysisContexts, ask: "If I combined verdicts from these potential AnalysisContexts, would the result be MISLEADING because they evaluate fundamentally different things?"
- If YES and combining would change what is being evaluated: Create separate AnalysisContexts
- If NO: Keep as single AnalysisContext

Common incompatibility signals (only split if evidence supports each):
- Different formal bodies with separate authority
- Different measurement system boundaries
- Different process phases that yield incomparable outputs

${recencyMatters ? `## ⚠️ RECENT DATA DETECTED

This input appears to involve recent events, dates, or announcements. When generating research queries:
- **PRIORITIZE**: Queries that will help find the most current information via web search
- **INCLUDE**: Date-specific queries (e.g., "November 2025", "2025", "recent")
- **FOCUS**: Recent developments, current status, latest announcements
- **NOTE**: Web search will be used to find current sources - structure your research queries accordingly

` : ''}## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- A date like "November 2025" is in the PAST if the current date is January 2026 or later
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments
- When in doubt about temporal relationships, use the evidence from sources rather than making assumptions

**EXAMPLE**: If the current date is January 6, 2026, then "late November 2025" is in the PAST (approximately 6 weeks ago), not the future.

## CRITICAL: ARTICLE THESIS (articleThesis)

The articleThesis should NEUTRALLY SUMMARIZE what the article claims, covering ALL main points.
- Include ALL major claims, not just one
- Use neutral language ("claims that", "alleges that")
- Keep the source attribution ("according to X", "allegedly from Y")
- Example: "The article claims a regulator announced stricter rules and alleges an internal review found harms linked to a product."

## CRITICAL: CLAIM STRUCTURE ANALYSIS

When extracting claims, identify their ROLE and DEPENDENCIES:

### Claim Roles:
- **attribution**: WHO said it (person's identity, role) - e.g., "Person X is the agency director"
- **source**: WHERE/HOW it was communicated (document type, channel) - e.g., "in an internal email"
- **timing**: WHEN it happened - e.g., "in late November"
- **core**: THE ACTUAL VERIFIABLE ASSERTION - MUST be isolated from source/attribution

### CRITICAL: ISOLATING CORE CLAIMS

Core claims must be PURE FACTUAL ASSERTIONS without embedded source/attribution:
- WRONG: "An internal review found that 10 people were harmed by Product X" (embeds source)
- CORRECT: "At least 10 people were harmed by Product X" (pure factual claim)

The source attribution belongs in a SEPARATE claim:
- SC1: "An internal review exists" (source claim)
- SC2: "At least 10 people were harmed by Product X" (core claim, depends on SC1)

### CRITICAL: SEPARATING ATTRIBUTION FROM EVALUATIVE CONTENT

**THIS IS MANDATORY** - When someone CRITICIZES, CLAIMS, or ASSERTS something, YOU MUST create separate claims:
1. The FACT that they said/criticized it (attribution - verifiable: did they say it?)
2. The CONTENT of what they said (the actual claim to verify - is it TRUE?)

**NEVER CREATE CLAIMS LIKE THESE** (they conflate attribution with content):
❌ WRONG: "A spokesperson criticized an agency's processes as based on weak and misleading evidence"
❌ WRONG: "Expert claims the treatment is dangerous"
❌ WRONG: "Study found that X causes Y"

**ALWAYS SPLIT INTO TWO CLAIMS:**

Example 1: "A spokesperson criticized an agency's processes as based on weak evidence"
✅ SC-A: "A spokesperson has publicly criticized past agency processes"
   → claimRole: "attribution", type: "factual", centrality: LOW
   → Verifies: Did the spokesperson make critical statements about the agency?
✅ SC-B: "Past agency processes were based on weak and misleading evidence"
   → claimRole: "core", type: "evaluative", centrality: HIGH, dependsOn: ["SC-A"]
   → Verifies: Is this assessment ACCURATE based on evidence?

Example 2: "An internal review found 10 people were harmed by Product X"
✅ SC-A: "An internal review exists making claims about harms"
   → claimRole: "source", type: "factual", centrality: LOW
✅ SC-B: "At least 10 people were harmed by Product X"
   → claimRole: "core", type: "factual", centrality: HIGH, dependsOn: ["SC-A"]
   → This is THE claim readers care about - is it TRUE?

**WHY THIS MATTERS:**
- SC-A (attribution) might be TRUE (yes, he said it)
- SC-B (content) might be FALSE (what he said is wrong)
- If you only verify SC-A, you're NOT verifying the article's actual claims!
- The article's credibility depends on SC-B, not SC-A.

### Claim Dependencies (dependsOn):
Core claims often DEPEND on attribution/source/timing claims being true.

EXAMPLE: "An agency director claimed in an internal memo that 10 people were harmed by Product X"
- SC1 (attribution): "Person X is agency director" → claimRole: "attribution", dependsOn: []
- SC2 (source): "An internal memo exists making claims about harms" → claimRole: "source", dependsOn: ["SC1"]
- SC3 (core): "At least 10 people were harmed by Product X" → claimRole: "core", dependsOn: ["SC2"], isCentral: true

If SC2 is FALSE (no such memo exists), then SC3 has NO evidential basis from this source.

### THREE-ATTRIBUTE CLAIM ASSESSMENT

For EACH claim, assess these three attributes (high/medium/low):

**1. checkWorthiness** - Is it a factual assertion a reader would challenge?
- HIGH: Specific factual claim that can be verified, readers would want proof
- MEDIUM: Somewhat verifiable but less likely to be challenged
- LOW: Pure opinion with no factual component, or not independently verifiable

NOTE: Broad institutional claims ARE verifiable (checkWorthiness: HIGH):
- "The regulator has acted on weak evidence in the past" → Can check documented cases, audits, expert analyses
- "The government has lied about X" → Can check historical record, declassified documents
- "Company X has a history of fraud" → Can check court records, SEC filings, news archives
These are not opinions - they're historical assertions that can be verified.

**2. harmPotential** - Does it impact high-stakes areas?
- HIGH: Public health, safety, democratic integrity, financial markets, legal outcomes
- MEDIUM: Affects specific groups or has moderate societal impact
- LOW: Limited impact, affects few people, low stakes

IMPORTANT: harmPotential is CLAIM-LEVEL, not topic-level.
- Do NOT set harmPotential=HIGH just because the overall topic is “high risk” or because other claims are high-stakes.
- Attribution/source/timing/background claims are usually NOT harmPotential=HIGH even in high-stakes topics.
- Reserve harmPotential=HIGH for claims where being wrong could plausibly cause material real-world harm (directly, not just “credibility harm”).

**3. centrality** - Is it pivotal to the author's argument?
- HIGH: Core assertion the argument depends on; removing it collapses the narrative
- MEDIUM: Supports the main argument but not essential
- LOW: Peripheral detail, context, or attribution

**CRITICAL: Source/Attribution claims are NEVER centrality HIGH**
Claims with claimRole "source", "attribution", or "timing" should ALWAYS have centrality: LOW
- "An internal email exists" → centrality: LOW (source claim, not the argument itself)
- "Dr. X is director of Y" → centrality: LOW (attribution, establishes who said it)
- "The statement was made in November" → centrality: LOW (timing detail)
- "The methodology used is scientifically valid" → centrality: LOW (meta-claim about analysis, not the subject)
- "The study followed ISO standards" → centrality: LOW (methodology validation, not the main claim)
- "The data collection methods were appropriate" → centrality: LOW (methodological, not substantive)

Only CORE claims (claimRole: "core") can have centrality: HIGH
- The existence of a document is not the argument - what the document SAYS is the argument
- Who said something is not the argument - what they SAID is the argument

**CRITICAL: Policy/Action claims that DEPEND on source claims are NOT central**
If a policy claim depends on a source claim being true, it inherits LOW centrality:
- "The regulator will impose stricter rules" (depends on memo/email existing) → centrality: LOW
- "Company will lay off 1000 workers" (depends on memo existing) → centrality: LOW
These are CONDITIONAL claims - they're only meaningful IF the source exists.

The CENTRAL claims are the **factual assertions about real-world impact**:
- "At least 10 people were harmed by Product X" → centrality: HIGH (factual impact claim)
- "Past agency processes were based on weak evidence" → centrality: HIGH (evaluative but verifiable)

**RULE: When multiple claims compete for centrality, ask: "Which claim, if false, would completely undermine the article's credibility?"**
- If "The regulator will impose stricter rules" is false → article is wrong about policy
- If "At least 10 people were harmed by Product X" is false → article is spreading serious misinformation
The second is MORE CENTRAL because it has greater real-world harm potential.

**isCentral = true** if centrality is "high"
- harmPotential affects risk tier and warning display, NOT centrality
- checkWorthiness does NOT affect isCentral (a high checkWorthiness alone doesn't make it central)
- However, if checkWorthiness is "low", the claim should NOT be investigated or displayed
- Attribution, source, and timing claims should typically have centrality = "low" (not central to the argument)
- Only core evaluative claims that are the main thesis should have centrality = "high"

IMPORTANT: riskTier is ANALYSIS-LEVEL only.
- riskTier must NOT be used as a shortcut to set claim-level harmPotential/centrality.
- You may set riskTier based on the overall analysis, but claim-level harmPotential/centrality must be justified by each claim's content.

**CRITICAL HEURISTIC for centrality = "high"**:
Ask yourself: "Does this claim DIRECTLY address the user's primary thesis?"
→ If yes, it's central. If it's supporting evidence or background, it's not.

**CRITICAL: Centrality calibration (prevent over-centrality + redundancy)**
- There should be **AT MOST 1-2 HIGH centrality claims per AnalysisContext**.
- If multiple claims seem equally important, most should be **MEDIUM**, not HIGH.
- Do NOT create multiple near-duplicate HIGH centrality claims that all mean "the process was fair/proper" in slightly different wording. Prefer ONE canonical claim.
- Claims about specific outcomes/penalties/consequences are usually MEDIUM unless the user's thesis is specifically about that outcome.

**EXPECT 3-6 CLAIMS** in most analyses (hard cap: do not output more than 8). The number depends on the thesis type:
- Simple factual claim: 2-3 central claims (break down into testable parts)
- Comparative claim ("X vs Y"): 3-5 central claims (one per major aspect of comparison)
- Compound statement: 4-6 central claims (each atomic assertion separately)
- Multi-faceted thesis: 3-5 central claims (one per facet)

**CRITICAL: BREAK DOWN COMPOUND STATEMENTS INTO ATOMIC CLAIMS**

⛔ **FORBIDDEN**: Do NOT synthesize or combine multiple assertions into a single claim
⛔ **FORBIDDEN**: Do NOT create claims with "and", "which", or multiple verbs
⛔ **FORBIDDEN**: Do NOT paraphrase the entire input as one claim

Each atomic claim should make ONE testable assertion that can be verified independently.

**DECOMPOSITION RULES** (apply to ANY compound input):
1. Count the number of distinct verbs/assertions in the input
2. Each verb/assertion becomes its OWN claim
3. Characterizations (adjectives like "unfair", "illegal", "largest") become separate claims
4. Magnitude/superlative claims ("biggest", "first", "most") become separate claims

**Pattern Recognition**:
- "X did A and B" → 2 claims (one for A, one for B)
- "X did Y through method Z" → 2 claims (action vs method characterization)
- "Event E happened and was [adjective]" → 2 claims (event vs characterization)
- "This was the [superlative] example of category C" → 2 claims (event vs magnitude)
- Clauses joined by "and", "which", "that", "while" → separate claims

**Minimum Output**: For inputs with 3+ distinct assertions, generate 3+ separate claims.

Only assign centrality: "high" when the claim:
1. DIRECTLY addresses the user's thesis, AND
2. Represents a distinct aspect that needs independent verification

**Examples of NON-central claims (centrality = "low" or "medium")**:
- ❌ "Source X stated Y" (attribution - NOT central)
- ❌ "Event happened on date Z" (timing/background - NOT central)
- ❌ "Document was published by institution W" (source verification - NOT central)
- ❌ "Person A has credentials B" (background context - NOT central)
- ❌ "Study used methodology M" (methodological detail - NOT central unless methodology IS the main claim)
- ❌ "The [analysis method] is valid/accurate/complete" (methodology validation - NOT central, the claim is about the SUBJECT, not the method)
- ❌ "The study/analysis framework is appropriate" (meta-analysis about methods - NOT central)
- ❌ "The analysis excludes/includes factor X" (methodological boundary - NOT central)
- ❌ Supporting evidence for the main thesis (evidence - NOT central, only the thesis itself is central)

**CRITICAL FOR COMPARATIVE CLAIMS**: If the main claim is "X is better/more/faster than Y", then:
- ✓ CENTRAL: "X performs better than Y in aspect A" (direct comparison)
- ✓ CENTRAL: "X performs better than Y in aspect B" (another direct comparison)
- ✓ CENTRAL: "Expert consensus supports X over Y" (direct evaluative claim)
- ❌ NOT CENTRAL: "The methodology for comparing X and Y is valid" (meta-analysis)
- ❌ NOT CENTRAL: "The analysis framework is appropriate" (meta-analysis)
- ❌ NOT CENTRAL: "The comparison includes/excludes certain factors" (methodological boundary)

**IMPORTANT**: For comparative claims, EACH distinct aspect of the comparison that directly addresses the thesis should have centrality="high". For "Technology A vs Technology B efficiency", claims about end-to-end efficiency, production efficiency, AND expert consensus can all be central because they address the thesis from different angles.

**Examples of CENTRAL claims (centrality = "high")**:
- ✓ "The trial was fair and impartial" (PRIMARY evaluative thesis)
- ✓ "The product causes serious side effects" (PRIMARY factual thesis)
- ✓ "The policy violated constitutional rights" (PRIMARY legal thesis)

**Rule of thumb**: In an analysis of "Was X fair?", only the fairness conclusion itself is central. All supporting evidence items, sources, dates, and background are NOT central.

NOT "high" for:
- Supporting evidence (even if important)
- Attribution claims (who said what)
- Source verification (does document exist)
- Background context
- Peripheral details

## THESIS RELEVANCE (thesisRelevance field) - NEW v2.6.31

**thesisRelevance** determines whether a claim should CONTRIBUTE to the overall verdict:

- **"direct"**: The claim DIRECTLY tests part of the main thesis
  → These claims contribute to the verdict calculation

- **"tangential"**: Related context but does NOT test the thesis
  → These claims are displayed but EXCLUDED from verdict calculation

- **"irrelevant"**: Not meaningfully about the input’s specific topic (noise)
  → These claims should be dropped and not shown

**CRITICAL DISTINCTION**:
- "Was the trial fair?" → claims about the trial's fairness = "direct"
- "Was the trial fair?" → claims about foreign reactions/sanctions to the trial = "tangential"
- The thesis is about the TRIAL, not about how others REACTED to it

**Examples for input "The court judgment was fair and based on applicable law"**:

✓ thesisRelevance="direct" (evaluates the THESIS):
- "The process followed proper procedures" → directly tests the claim
- "The evidence was properly evaluated" → directly tests the claim
- "Applicable standards were applied" → directly tests the claim
- "The outcome was proportionate" → directly tests the claim
- "Proper authority was established" → directly tests the claim

✗ thesisRelevance="tangential" (does NOT evaluate the thesis):
- "Foreign trade restrictions were proportionate" → reaction, not the judgment itself
- "Foreign sanctions were justified" → reaction, not the judgment itself
- "International relations deteriorated" → consequence, not the judgment itself
- "Tariffs imposed by an external government were proportionate" → foreign reaction, NOT the judgment
- "Sanctions imposed by an external government were justified" → foreign reaction, NOT the judgment
- "Other countries condemned the proceedings" → foreign reaction, NOT the judgment

**CRITICAL - FOREIGN GOVERNMENT RESPONSES ARE ALWAYS TANGENTIAL**:
When the thesis is about whether a domestic legal proceeding was fair/lawful, claims about
how foreign governments responded (tariffs, sanctions, diplomatic statements, condemnations)
are TANGENTIAL - they are reactions TO the proceeding, not evaluations OF the proceeding.
Even if a foreign government claims the proceeding was unfair, that claim is about the
foreign government's RESPONSE, not about the proceeding's actual fairness.

**Rule**: If you can rephrase the claim as "The thesis is true/false BECAUSE [claim]" = direct
          If the claim is "BECAUSE the thesis is true/false, [consequence]" = tangential
          If the claim is "Foreign entity X responded to the event by doing Y" = tangential

**FILTERING RULE**: Claims with checkWorthiness = "low" should be excluded from investigation

**Examples:**

"At least 10 people were harmed by Product X"
→ checkWorthiness: HIGH (specific factual claim, readers want proof)
→ harmPotential: HIGH (public safety)
→ centrality: HIGH (core assertion of the article) ← HIGH
→ isCentral: TRUE (centrality is HIGH)

"The regulator will require stricter testing for all products"
→ checkWorthiness: HIGH (policy claim that can be verified)
→ harmPotential: HIGH (affects safety/compliance, public impact)
→ centrality: HIGH (major policy change claim) ← HIGH
→ isCentral: TRUE (centrality is HIGH)

"Person X is the agency director"
→ claimRole: attribution
→ checkWorthiness: MEDIUM (verifiable but routine)
→ harmPotential: LOW (credential, not harmful if wrong)
→ centrality: LOW (attribution, not the main point)
→ isCentral: FALSE (centrality is not HIGH)

"An internal memo exists stating the regulator will impose stricter rules"
→ claimRole: source (establishes document existence)
→ checkWorthiness: HIGH (verifiable - does such email exist?)
→ harmPotential: MEDIUM (affects credibility of subsequent claims)
→ centrality: LOW ← MUST BE LOW - this is a source claim, not the core argument!
→ isCentral: FALSE
→ NOTE: Even though this claim is important as a prerequisite, it's NOT central to the ARGUMENT.
→ The argument is about the policy change, not about memo existence.

"The email was sent on November 28"
→ checkWorthiness: LOW (timing detail) ← LOW = EXCLUDE FROM INVESTIGATION
→ harmPotential: LOW (no significant impact)
→ centrality: LOW (peripheral detail)
→ isCentral: FALSE
→ NOTE: This claim should NOT be investigated or displayed (checkWorthiness is LOW)

"The regulator has acted on weak and misleading evidence in the past"
→ checkWorthiness: HIGH (historical claim, verifiable via documented cases, audits, expert analyses)
→ harmPotential: HIGH (public safety, regulatory trust) ← HIGH
→ centrality: MEDIUM (supports main argument but not the core claim)
→ isCentral: FALSE (centrality is not HIGH - supporting evidence, not the core thesis)

"Expert says the policy change is controversial"
→ checkWorthiness: HIGH (verifiable who said what)
→ harmPotential: MEDIUM (affects policy debate)
→ centrality: MEDIUM (contextual, not core)
→ isCentral: FALSE (neither harmPotential nor centrality is HIGH)

### EXAMPLE: Attribution vs Evaluative Content Split

Original text: "A spokesperson criticized agency processes as based on weak evidence"

CORRECT claim extraction (2 separate claims):

SC5: "A spokesperson has publicly criticized past agency processes"
→ type: factual (did he criticize? YES/NO)
→ claimRole: attribution
→ checkWorthiness: MEDIUM (routine verification)
→ harmPotential: LOW (just confirms he said something)
→ centrality: LOW (attribution only)
→ isCentral: FALSE
→ dependsOn: []

SC6: "Past agency processes were based on weak and misleading evidence"
→ type: evaluative (is this assessment accurate?)
→ claimRole: core
→ checkWorthiness: HIGH (historical claim about the agency, verifiable)
→ harmPotential: HIGH (public health, regulatory trust)
→ centrality: HIGH (core evaluative assertion)
→ isCentral: TRUE
→ dependsOn: ["SC5"] (claim originates from the spokesperson's criticism)

NOTE: SC5 may be TRUE (he did criticize) while SC6 may fall in the UNVERIFIED or LEANING-TRUE bands (43-71%).
The system must verify BOTH: (1) did he say it? AND (2) is what he said accurate?

### Dependencies:
1. List dependencies in dependsOn array (claim IDs that must be true for this claim to matter)
2. Core claims typically depend on attribution claims

## COUNTER-CLAIM DETECTION (isCounterClaim field) - v2.8.4

For EACH sub-claim, determine if it tests the OPPOSITE of the main thesis:

**isCounterClaim = true** when the claim evaluates the OPPOSITE position:
- Thesis: "X is fair" → Claim: "X violated due process" (tests unfairness) → **isCounterClaim: true**
- Thesis: "A is more efficient than B" → Claim: "B outperforms A" (tests opposite) → **isCounterClaim: true**
- Thesis: "The decision was justified" → Claim: "The decision lacked basis" (tests unjustified) → **isCounterClaim: true**

**isCounterClaim = false** when the claim is thesis-aligned:
- Thesis: "X is fair" → Claim: "X followed procedures" (supports fairness) → **isCounterClaim: false**
- Thesis: "A is more efficient than B" → Claim: "A has higher output" (supports thesis) → **isCounterClaim: false**
- Thesis: "The decision was justified" → Claim: "Evidence supported the decision" → **isCounterClaim: false**

**WHY THIS MATTERS**: Counter-claims have their verdicts INVERTED during aggregation.
If a counter-claim is rated TRUE (85%), it means the OPPOSITE of the thesis is true,
so it contributes as FALSE (15%) to the overall verdict.

## MULTI-CONTEXT DETECTION

Look for multiple distinct contexts (AnalysisContexts) that should be analyzed separately.
**Definition**: A "Context" is a bounded analytical frame with defined boundaries, methodology, temporal period, and subject matter.

If the input mixes timelines, distinct contexts, or different analytical frames, split them.

### IMPORTANT: What is a VALID distinct context
- Separate formal proceedings or processes
- Distinct temporal events or phases
- Different institutional processes
- Different analytical methodologies or boundaries
- Different measurement boundaries
- Different regulatory or governance frameworks

### IMPORTANT: What is NOT a distinct context
- Different national/political perspectives on the SAME event (e.g., "Country A view" vs "Country B view")
- Different stakeholder viewpoints on a single topic
- Contested interpretations of the same event
- Pro vs con arguments about the same topic
- Claims and counter-claims about one event

**Only create separate contexts for GENUINELY DISTINCT events, proceedings, or analytical frames - not for different perspectives on the same event.**

### GENERIC EXAMPLES - MUST DETECT MULTIPLE CONTEXTS:

**Legal Domain:**
1. **CTX_COURT_A**: Legal proceeding A
   - subject: Case A allegations
   - temporal: 2024
   - status: concluded
   - outcome: Ruling issued
   - assessedStatement: (what is being assessed in this context)
   - metadata: { institution: "Court A", charges: [...], decisionMakers: [...] }

2. **CTX_COURT_B**: Legal proceeding B
   - subject: Case B allegations
   - temporal: 2024
   - status: ongoing
   - outcome: Unresolved
   - assessedStatement: (what is being assessed in this context)
   - metadata: { institution: "Court B", charges: [...], decisionMakers: [...] }

**Scientific Domain:**
1. **CTX_BOUNDARY_A**: Narrow boundary analysis
   - subject: Performance/efficiency within a limited boundary
   - temporal: 2024
   - status: concluded
   - outcome: Example numeric estimate
   - assessedStatement: (what is being assessed in this context)
   - metadata: { methodology: "Standard X", boundaries: "Narrow boundary", geographic: "Region A" }

2. **CTX_BOUNDARY_B**: Broad boundary analysis
   - subject: Performance/efficiency across a broader boundary
   - temporal: 2024
   - status: concluded
   - outcome: Example numeric estimate
   - assessedStatement: (what is being assessed in this context)
   - metadata: { methodology: "Standard Y", boundaries: "Broad boundary", geographic: "Region A" }

**CRITICAL - assessedStatement field (v2.6.39)**:
For each AnalysisContext, include an assessedStatement that describes what you are assessing in this context.
- The assessedStatement MUST describe what is being evaluated in THIS specific context
- The Assessment summary MUST summarize the assessment OF the assessedStatement
- These two fields must be consistent: Assessment answers/evaluates the assessedStatement

**CRITICAL: metadata.decisionMakers field**
- Extract key decision-makers or primary actors only when they are explicitly mentioned in the input or evidence.
- Do NOT rely on background knowledge for names/roles (avoid hallucination).

**CRITICAL: Comparative claims and boundary sensitivity (MANDATORY)**
If the input compares alternatives (e.g., "X is better/more efficient than Y", "X causes more harm than Y"):
- Ask: "Could the answer change depending on the measurement boundary, phase, or system definition?"
- If yes (or plausibly yes), you MUST create **at least TWO** AnalysisContexts representing distinct boundaries (e.g., end-to-end vs use-phase only; upstream vs downstream; lifecycle vs operational).
- Set requiresSeparateAnalysis=true.

**MANDATORY for efficiency/performance comparisons**
If the user's claim compares **efficiency / performance / effectiveness / impact** between alternatives:
- You MUST create **at least TWO** AnalysisContexts representing different measurement boundaries/phases (same metric, different boundary), even if the input does not explicitly name the boundaries.
- Set requiresSeparateAnalysis=true.
This requirement OVERRIDES the general heuristic of using fewer contexts when in doubt.

**CRITICAL: Comparative contexts must be SAME-METRIC boundary variants (MANDATORY)**
When creating multiple AnalysisContexts for a comparison claim:
- ALL contexts MUST evaluate the SAME metric/dimension stated in the user's claim.
- Contexts may vary the measurement boundary/phase/system definition, but MUST NOT shift to unrelated dimensions.
- DO NOT create contexts for other dimensions (e.g., cost, environmental impact, popularity) unless the user's claim explicitly includes them.

Set requiresSeparateAnalysis = true when multiple contexts are detected.

## FOR ANY INPUT STYLE

- **impliedClaim**: What claim would "YES" confirm? Must be AFFIRMATIVE.
  - CORRECT: "The process was fair and followed applicable standards"
  - WRONG: "may or may not have been fair"

- **subClaims**: Generate sub-claims that need to be verified to address the thesis.

  ⚠️ **MINIMUM CLAIM COUNT**: Generate AT LEAST 3-4 separate claims for any non-trivial input
  ⚠️ **IF YOU GENERATE ONLY 1 CLAIM, YOU ARE DOING IT WRONG** - go back and decompose!

  - **MANDATORY: Break compound statements into ATOMIC claims** (each testing ONE assertion)
  - Each atomic claim must be independently verifiable with its own evidence
  - **ALL core atomic claims should have thesisRelevance="direct"** since they each test part of the input
  - For multi-context cases, ensure meaningful coverage across all contexts (set contextId appropriately)
  - **DECOMPOSE COMPOUND CLAIMS**: Split claims that combine multiple assertions into separate claims:
    - Each distinct factual assertion becomes a separate claim with claimRole="core"
    - Multiple core claims can have isCentral=true if they test different parts of the thesis
    - Separate source/attribution claims as non-central (isCentral: false, claimRole: "source" or "attribution")
    - Use dependsOn to link claims to their prerequisites
  - For each AnalysisContext, consider claims covering:
    - Standards application (were relevant rules/standards/methods applied correctly?)
    - Process integrity (were appropriate procedures followed?)
    - Evidence basis (were conclusions based on evidence?)
    - Decision-maker independence (any conflicts of interest?)
    - Outcome proportionality/impact (was the outcome proportionate and consistent with similar situations?)
  - **CRITICAL: DECOMPOSE SPECIFIC OUTCOMES**: When specific outcomes, penalties, or consequences are mentioned (e.g., an \(N\)-year term, a monetary fine, a time-bound ban, ineligibility duration), create a SEPARATE claim evaluating whether that specific outcome was fair, proportionate, or appropriate for the context.
  - **CRITICAL: DO NOT SYNTHESIZE MULTIPLE CLAIMS INTO ONE** - each distinct assertion should remain separate for independent verification

- **researchQueries**: Generate specific queries to research, including:
  - Potential conflicts of interest for key decision-makers
  - Comparisons to similar cases, phases, or precedents
  - Criticisms and rebuttals with documented evidence

## KEY FACTORS (Emergent Decomposition)

**IMPORTANT**: KeyFactors are OPTIONAL and EMERGENT - only generate them if the thesis naturally decomposes into distinct evaluation dimensions.

${keyFactorHints && keyFactorHints.length > 0
  ? `\n**OPTIONAL HINTS** (you may consider these, but are not required to use them):
The following KeyFactor dimensions have been suggested as potentially relevant. Use them only if they genuinely apply to this thesis. If they don't fit, ignore them and generate factors that actually match the thesis:
${keyFactorHints.map((hint, i) => `- ${hint.factor} (${hint.category}): "${hint.evaluationCriteria}"`).join("\n")}`
  : ""}

**WHEN TO GENERATE**: Create keyFactors array when the thesis involves:
- Complex multi-dimensional evaluation (e.g., fairness, legitimacy, effectiveness)
- Topics where truth depends on multiple independent criteria
- Situations requiring structured assessment beyond simple yes/no

**WHEN NOT TO GENERATE**: Leave keyFactors as empty array [] for:
- Simple factual claims ("Did X happen?")
- Single-dimension claims ("Is Y true?")
- Straightforward verifications

**HOW TO GENERATE**: Break down the thesis into 2-5 fundamental queries that must ALL be answered "yes" for the thesis to be true.

**FORMAT**:
- **id**: Unique identifier (KF1, KF2, etc.)
- **evaluationCriteria**: The evaluation criteria (e.g., "Was due process followed?")
- **factor**: SHORT ABSTRACT LABEL (2-5 words ONLY, e.g., "Due Process", "Expert Consensus", "Energy Efficiency")
- **category**: Choose from: "procedural", "evidential", "methodological", "factual", "evaluative"

**CRITICAL: factor MUST be abstract, NOT claim text**:
- GOOD: "Energy efficiency comparison", "Expert consensus", "Procedural fairness"
- BAD: "A professor claims Technology A needs 3x more input than Technology B" (TOO SPECIFIC)
- BAD: "Multiple experts say Option A is more efficient" (CONTAINS ATTRIBUTION)
- BAD: "Technology A is more efficient than Technology B" (THIS IS A CLAIM)

KeyFactors are CATEGORIES for evaluation, NOT the claims themselves. Specific claims belong in subClaims array.

**EXAMPLES**:

For "The trial was fair."
[
  {
    "id": "KF1",
    "evaluationCriteria": "Were proper legal procedures and due process followed throughout the trial?",
    "factor": "Procedural Fairness",
    "category": "procedural"
  },
  {
    "id": "KF2",
    "evaluationCriteria": "Were decisions based on documented evidence rather than assumptions or bias?",
    "factor": "Evidence Basis",
    "category": "evidential"
  },
  {
    "id": "KF3",
    "evaluationCriteria": "Were the judges and decision-makers free from conflicts of interest?",
    "factor": "Impartiality",
    "category": "procedural"
  }
]

For "This product causes a specific harm."
[
  {
    "id": "KF1",
    "evaluationCriteria": "Is there documented evidence of a plausible causal mechanism linking the product to the claimed harm?",
    "factor": "Causal Mechanism",
    "category": "factual"
  },
  {
    "id": "KF2",
    "evaluationCriteria": "Do controlled studies and high-quality analyses support this causal relationship?",
    "factor": "Controlled Evidence",
    "category": "evidential"
  },
  {
    "id": "KF3",
    "evaluationCriteria": "What does the relevant expert community conclude about this relationship?",
    "factor": "Expert Consensus",
    "category": "evaluative"
  }
]
**CLAIM-TO-FACTOR MAPPING**: If you generate keyFactors, map each claim to the most relevant factor using keyFactorId. Claims can only map to one factor. Use empty string "" for claims that don't address any specific factor.

**CRITICAL OUTPUT CONSTRAINT (comparative efficiency/performance claims)**:
If the input is a comparative efficiency/performance/effectiveness claim, then:
- \`analysisContexts\` MUST contain **at least 2** items
- \`requiresSeparateAnalysis\` MUST be \`true\`

### FINAL OUTPUT CHECKLIST (MANDATORY)
- If the input is a comparative efficiency/performance/effectiveness claim: did you output **2+** \`analysisContexts\` and set \`requiresSeparateAnalysis=true\`?
- If \`analysisContexts\` has 2+ items: did you assign each core claim a non-empty \`contextId\` (avoid leaving claims unassigned)?
- Did you avoid adding off-thesis dimensions (do not invent unrelated metrics that are not in the user's claim)?`;

// Use normalized analysisInput (yes/no→statement) for consistent LLM analysis
  const userPrompt = `Analyze for verification:\n\n"${analysisInputForLLM}"`;

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
  const understandingSchemaForProvider = isOpenAiProvider
    ? UNDERSTANDING_SCHEMA_OPENAI
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
        { role: "system", content: prompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.3, pipelineConfig),
      output: Output.object({ schema: understandingSchemaForProvider }),
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
    const system = `Return ONLY a single JSON object matching the expected schema.\n- Do NOT include markdown.\n- Do NOT include explanations.\n- Do NOT wrap in code fences.\n- Use empty strings \"\" and empty arrays [] when unknown.\n\nIMPORTANT TERMINOLOGY:\n- backgroundDetails is the broader narrative frame or topic of the input (descriptive only).\n- analysisContexts represents AnalysisContexts (top-level bounded analytical frames).\n- EvidenceScope is per-evidence source metadata (do NOT confuse with AnalysisContext).\n\nThe JSON object MUST contain at least these top-level keys:\n- detectedInputType\n- analysisIntent\n- originalInputDisplay\n- impliedClaim\n- analysisContexts\n- requiresSeparateAnalysis\n- backgroundDetails\n- mainThesis\n- articleThesis\n- subClaims\n- distinctEvents\n- legalFrameworks\n- researchQueries\n- riskTier\n- keyFactors`;
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
        { role: "system", content: system },
        { role: "user", content: `${userPrompt}\n\nReturn JSON only.` },
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
      console.error("[Analyzer] ❌ ANTHROPIC API CREDITS EXHAUSTED - Please add credits at https://console.anthropic.com/settings/plans");
      throw new Error("Anthropic API credits exhausted. Please add credits or switch provider in UCM pipeline config (llmProvider).");
    }
    if (errMsg.includes("invalid_api_key") || errMsg.includes("401")) {
      console.error("[Analyzer] ❌ INVALID API KEY - Check your ANTHROPIC_API_KEY or OPENAI_API_KEY");
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
    // v2.6.30: Changed detectedInputType to "claim | article" - yes/no inputs are normalized to claims at entry point
    const retryPrompt = `You are a verification analyst.

Return ONLY a single JSON object that EXACTLY matches the expected schema.
- No markdown, no prose, no code fences.
- Every required field must exist.
- Use empty strings "" and empty arrays [] when unknown.

CRITICAL: MULTI-ANALYSIS-CONTEXT DETECTION
- Detect whether the input mixes multiple distinct AnalysisContexts (e.g., different events, methodologies, institutions, timelines, or processes).
- If there are 2+ distinct AnalysisContexts, put them in analysisContexts (one per AnalysisContext) and set requiresSeparateAnalysis=true.
- If there is only 1 AnalysisContext, analysisContexts may contain 0 or 1 item, and requiresSeparateAnalysis=false.

NOT DISTINCT ANALYSIS CONTEXTS:
- Different perspectives on the same event (e.g., "Country A view" vs "Country B view") are NOT separate AnalysisContexts by themselves.
- Pro vs con viewpoints are NOT AnalysisContexts.

INCOMPATIBILITY TEST: Split into separate AnalysisContexts ONLY IF combining verdicts would be MISLEADING because they evaluate fundamentally different things (e.g., different formal authorities, different measurement boundaries). Only split if each AnalysisContext has supporting evidence.

ANALYSIS CONTEXT RELEVANCE REQUIREMENT (CRITICAL):
- Every AnalysisContext MUST be directly relevant to the SPECIFIC TOPIC of the input
- Do NOT include AnalysisContexts from unrelated domains just because they share a general category
- When in doubt, use fewer AnalysisContexts rather than including marginally relevant ones
- An AnalysisContext with zero relevant claims/evidence should NOT exist

ENUM RULES
- detectedInputType must be exactly one of: claim | article
- analysisIntent must be exactly one of: verification | exploration | comparison | none
- riskTier must be exactly one of: A | B | C

CLAIMS
- Populate subClaims with 3–8 verifiable sub-claims when possible.
- Every subClaim must include ALL required fields and use allowed enum values.

Now analyze the input and output JSON only.`;
    try {
      parsed = await tryStructured(retryPrompt, "structured-2");
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
  // POST-PROCESSING: Use early-normalized input for input neutrality
  // Since we normalized to statements BEFORE the LLM call (lines 2504-2528),
  // both paths now converge. We use:
  // - originalInputDisplay (raw input): for UI display
  // - analysisInput (from line 2528): for analysis (impliedClaim)
  // =========================================================================
  const trimmedInput = input.trim();

  // UI display: prefer the original raw input; otherwise use trimmed input
  parsed.originalInputDisplay = originalInputDisplay || parsed.originalInputDisplay || trimmedInput;

  // v2.6.26: ALWAYS force impliedClaim to normalized statement for input neutrality
  // Regardless of what LLM returns, use analysisInput to ensure any input style
  // produces identical analysis results. This is unconditional - no checking LLM output.
  const llmImpliedClaim = parsed.impliedClaim;
  parsed.impliedClaim = analysisInput;
  console.log(`[Analyzer] Input Neutrality: impliedClaim forced to normalized statement`);
  console.log(`[Analyzer]   LLM returned: "${(llmImpliedClaim || '').substring(0, 80)}..."`);
  console.log(`[Analyzer]   Using: "${analysisInput.substring(0, 80)}..."`);
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
  // v2.6.23: Use analysisInput (normalized statement) for consistent context canonicalization
  // This ensures any input phrasing yields identical context detection and research queries
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
  // v2.9: Use cached inputClassification if available, fall back to inline heuristics
  const isComparativeInput = inputClassification?.isComparative ?? isComparativeLikeText(analysisInput);
  const isCompoundInput = inputClassification?.isCompound ?? isCompoundLikeText(analysisInput);

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
  // focused ONLY on context detection. v2.6.30: Simplified - single input type after normalization
  if (
    deterministic &&
    parsed.detectedInputType === "claim" &&
    (parsed.analysisContexts?.length ?? 0) <= 1
  ) {
    // v2.6.23: Use normalized analysisInput for context detection to maintain input neutrality.
      // When deterministic mode is enabled, yes/no forms are normalized to statements earlier (lines 2507-2528).
    // Using the same normalized form here ensures context detection aligns with claim analysis,
    // preventing context-to-statement misalignment and maintaining input neutrality.
    const supplementalInput = parsed.impliedClaim || analysisInput;
    const supplemental = await requestSupplementalContexts(supplementalInput, model, parsed, pipelineConfig);
    if (supplemental?.analysisContexts && supplemental.analysisContexts.length > 1) {
      parsed = {
        ...parsed,
        requiresSeparateAnalysis: true,
        analysisContexts: supplemental.analysisContexts,
      };
      // v2.6.23: Use analysisInput (normalized statement) for consistent context canonicalization
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
      // Extract key terms from claim text
      const stopWords = new Set(["the", "a", "an", "is", "was", "were", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "and", "but", "if", "or", "because", "this", "that", "these", "those", "it", "its", "what", "which", "who", "whom", "whose", "based"]);
      const words = claim.text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && !stopWords.has(word));
      // Take unique words, prioritize capitalized words from original text
      const capitalizedWords = claim.text
        .match(/[A-Z][a-z]+/g) || [];
      const uniqueTerms = [...new Set([...capitalizedWords, ...words])].slice(0, 5);
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
      // Use analysisInput (normalized statement) for input neutrality
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

  // Heuristic fallback: if we still have too few claims for non-trivial inputs, derive atomic claims
  // directly from the input text to avoid collapsing complex statements into a single claim.
  if (!isShortSimpleInput && (parsed.subClaims?.length || 0) < MIN_TOTAL_CLAIMS_WITH_SINGLE_CORE) {
    const contexts = parsed.analysisContexts || [];
    const singleContextId = contexts.length === 1 ? contexts[0].id : "";
    const candidateSources = [
      parsed.originalInputDisplay,
      analysisInput,
      parsed.articleThesis,
      parsed.impliedClaim,
    ]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());
    const sourceText =
      candidateSources.sort((a, b) => b.length - a.length)[0] || analysisInput;
    const heuristicClaims = buildHeuristicSubClaims(
      sourceText,
      parsed.subClaims as any,
      singleContextId,
    );
    if (heuristicClaims.length > 0) {
      parsed.subClaims.push(...heuristicClaims);
      console.log(`[Analyzer] Added ${heuristicClaims.length} heuristic claims from input text`);
      // Heuristic claims may violate role/centrality invariants; re-normalize deterministically.
      normalizeSubClaimsImportance(parsed.subClaims as any);
    }
  }

  // Note: Full Gate 1 validation exists (apps/web/src/lib/analyzer/quality-gates.ts) but the orchestrated
  // pipeline currently treats Gate 1 as characterization/telemetry rather than a hard filter.
  const validatedClaims = parsed.subClaims;

  // Pass thesis to detect foreign response claims that should be tangential
  const thesis = parsed.impliedClaim || parsed.articleThesis || analysisInput;
  const relevanceValidatedClaims = validateThesisRelevance(validatedClaims as any, pipelineConfig);
  const claimsWithThesisRelevanceInvariant = enforceThesisRelevanceInvariants(relevanceValidatedClaims as any, thesis);
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

  const systemPrompt = `You are a verification assistant. Add missing subClaims ONLY for the listed contexts.
 - Return ONLY new claims (do not repeat existing ones).
- Each claim must be tied to a single AnalysisContext via contextId.${hasScopes ? "" : " Use an empty string if no AnalysisContexts are listed."}
 - Use claimRole="core" and checkWorthiness="high".
 - Set thesisRelevance="direct" for ALL supplemental claims you generate.
 - Set harmPotential and centrality realistically. **Default centrality to "medium" for ALL supplemental claims.** Only set centrality="high" if this claim IS a primary thesis question being evaluated in that AnalysisContext (rare for supplemental claims).
 - **CRITICAL**: Avoid redundant or near-duplicate claims. Before adding a claim, verify it is meaningfully distinct from existing claims.
 - **CRITICAL**: Do NOT add more than 2 supplemental claims per context unless explicitly instructed.
 - Set isCentral=true if centrality==="high" (harmPotential affects risk tier, not centrality).
 - Use dependsOn=[] unless a dependency is truly required.
 - **CRITICAL**: If the input contains multiple assertions, decompose into ATOMIC claims (one assertion per claim).
 - **CRITICAL**: Do NOT create claims that combine multiple assertions with "and", "which", or "that".
 - **CRITICAL**: Return at least ${minNewClaimsTotal} new claims in total across all listed contexts.
 - Ensure each listed context reaches at least ${MIN_CORE_CLAIMS_PER_PROCEEDING} core claims.
 - **CRITICAL**: If specific outcomes, penalties, or consequences are mentioned (e.g., an \(N\)-year term, a monetary fine, a time-bound ban), create a SEPARATE claim evaluating whether that specific outcome was fair, proportionate, or appropriate.
 - **CRITICAL: Thesis dimension lock (MANDATORY)**:
   - Identify the SPECIFIC metric/dimension the user's claim evaluates (e.g., efficiency, fairness, harm, cost).
   - ALL supplemental claims MUST evaluate the SAME metric/dimension.
   - Do NOT add claims about other dimensions not present in the user's original claim.`;

  const userPrompt = `INPUT:\n"${input}"\n\nCONTEXTS NEEDING MORE CLAIMS:\n${missingSummary}\n\nEXISTING CLAIMS (DO NOT DUPLICATE):\n${existingClaimsSummary}`;

  debugLog("requestSupplementalSubClaims: START", {
    contextsNeedingCoverage: missingProceedings.length,
    minNewClaimsTotal,
    missingSummary,
  });

  let supplemental: any;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2, pipelineConfig),
      output: Output.object({ schema: SUPPLEMENTAL_SUBCLAIMS_SCHEMA_LITE }),
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

  const systemPrompt = `You are a verification assistant.

Return ONLY a single JSON object with keys:
- analysisContexts: array
- requiresSeparateAnalysis: boolean

CRITICAL:
- Detect whether the input mixes 2+ distinct AnalysisContexts (e.g., different events, phases, institutions, timelines, or processes).
- Only split when there are clearly 2+ distinct contexts that would benefit from separate analysis.
- If there is only 1 context, return an empty array or a 1-item array and set requiresSeparateAnalysis=false.

NOT DISTINCT CONTEXTS:
- Different perspectives on the same event (e.g., "Country A view" vs "Country B view") are NOT separate contexts by themselves.
- Pro vs con viewpoints are NOT contexts.

INCOMPATIBILITY TEST: Split into separate contexts ONLY IF combining verdicts would be MISLEADING because they evaluate fundamentally different things (e.g., different formal authorities, different measurement boundaries). Only split if each context has supporting evidence.

CONTEXT RELEVANCE REQUIREMENT (CRITICAL):
- Every context MUST be directly relevant to the SPECIFIC TOPIC of the input
- Do NOT include contexts from unrelated domains just because they share a general category
- When in doubt, use fewer contexts rather than including marginally relevant ones
- A context with zero relevant claims/evidence should NOT exist

SCHEMA:
analysisContexts items must include:
- id (string)
- name (string)
- shortName (string)
- subject (string)
- temporal (string)
- status (concluded|ongoing|pending|unknown)
- outcome (string)
- assessedStatement (string): What is being assessed in this context (Assessment MUST summarize assessment of THIS)
- metadata (object, may include domain-specific fields like institution/methodology/boundaries/geographic/standardApplied)

Use empty strings "" and empty arrays [] when unknown.`;

  const userPrompt = `INPUT:\n"${input}"\n\nCURRENT analysisContexts COUNT: ${currentCount}\nReturn JSON only.`;

  const schema = z.object({
    requiresSeparateAnalysis: z.boolean(),
    analysisContexts: z.array(ANALYSIS_CONTEXT_SCHEMA),
  });

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2, pipelineConfig),
      output: Output.object({ schema }),
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

  // Check if any evidence items mention outcomes (quick heuristic check before LLM call)
  const outcomeKeywords = /\b(\d+\s*(?:year|month|day)\s*(?:sentence|prison|jail|ban|ineligible|suspended|fine|penalty|sanction)|sentenced|convicted|acquitted|fined|banned|ineligible)\b/i;
  if (!outcomeKeywords.test(evidenceText)) {
    return [];
  }

  const systemPrompt = `You are an evidence-analysis assistant. Extract specific outcomes, penalties, or consequences mentioned in the evidence items that should be evaluated as separate claims.

Return ONLY a JSON object with an "outcomes" array. Each outcome should have:
- "outcome": The specific outcome mentioned (e.g., "27-year prison sentence", "8-year ineligibility", "$1M fine")
- "contextId": The context ID this outcome relates to (or empty string if unclear)
- "claimText": A claim evaluating whether this outcome was fair/proportionate (e.g., "The 27-year prison sentence was proportionate to the crimes committed")

Only extract outcomes that:
1. Are specific and quantifiable (e.g., "27-year sentence", not just "sentenced")
2. Are NOT already covered by existing claims
3. Are relevant to evaluating fairness/proportionality

Return empty array if no such outcomes are found.`;

  const userPrompt = `EVIDENCE DISCOVERED DURING RESEARCH (unverified extracted statements):
${evidenceText}

EXISTING CLAIMS (DO NOT DUPLICATE):
${existingClaims.map((c) => `- ${c.id}: ${c.text}`).join("\n")}

CONTEXTS:
${contexts.map((s) => `- ${s.id}: ${s.name}`).join("\n")}

Extract outcomes that need separate evaluation claims.`;

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
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2, state.pipelineConfig),
      output: Output.object({ schema: OUTCOME_SCHEMA }),
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

  for (const proc of state.understanding.analysisContexts) {
    // Skip if already has a specific outcome (not vague placeholders)
    const currentOutcome = (proc.outcome || "").toLowerCase().trim();
    const isVagueOutcome = !currentOutcome ||
      currentOutcome === "unknown" ||
      currentOutcome === "pending" ||
      currentOutcome.includes("investigation") ||
      currentOutcome.includes("ongoing") ||
      currentOutcome.includes("not yet") ||
      currentOutcome.includes("to be determined");

    if (!isVagueOutcome) continue;

    // Get evidence items related to this context
    const relevantEvidenceItems = evidenceItems.filter(item =>
      !item.contextId || item.contextId === proc.id
    );

    if (relevantEvidenceItems.length === 0) continue;

    const evidenceText = relevantEvidenceItems.map(item => `- ${item.statement}`).join("\n").slice(0, 4000);

    try {
      // Use LLM to extract outcome - generic, not domain-specific
      const result = await generateText({
        model,
        temperature: deterministic ? 0 : undefined,
        messages: [
          { role: "system", content: "You extract specific outcomes from evidence. Return ONLY the outcome phrase, nothing else." },
          { role: "user", content: `Given this evidence about "${proc.name}" (${proc.subject || ""}):

${evidenceText}

What is the specific, concrete outcome or result mentioned?
- Return ONLY the outcome in a short phrase (e.g., "8-year penalty", "approved", "rejected", "settled for $X")
- If no specific outcome is mentioned, return exactly: NONE
- Do NOT return vague terms like "pending", "ongoing", "under investigation"` },
        ],
      });
      const text = result.text;

      const outcome = text.trim();
      if (outcome && outcome !== "NONE" && outcome.length < 100) {
        console.log(`[Analyzer] Enriched context "${proc.name}" outcome: "${proc.outcome}" → "${outcome}"`);
        proc.outcome = outcome;
        // Update status if we found a concrete outcome
        if (proc.status === "pending" || proc.status === "ongoing" || proc.status === "unknown") {
          proc.status = "concluded";
        }
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
    .slice(0, 4);

  // For claim inputs (normalized), prioritize the implied claim for better search results
  const isClaimLike = isClaimInput(understanding);
  const stopWords = new Set(["the", "a", "an", "is", "was", "were", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while", "although", "though", "whether", "this", "that", "these", "those", "it", "its", "what", "which", "who", "whom", "whose", "based"]);

  let entityStr = "";

  // For claim inputs, always use the implied claim as primary search basis
  if (isClaimLike && understanding.impliedClaim) {
    entityStr = understanding.impliedClaim
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 8)
      .join(" ");
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
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 6)
      .join(" ");
  }

  const hasLegal = categories.includes("legal_provision");
  const hasEvidence = categories.includes("evidence");

  // Detect if this topic requires recent data
  // v2.6.25: Use impliedClaim (normalized) for consistent recency detection across input styles
  const recencyMatters = isRecencySensitive(
    understanding.impliedClaim || understanding.articleThesis || state.originalInput || "",
    understanding
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

  if (
    state.evidenceItems.length >= config.minEvidenceItemsRequired &&
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
    const normalizeText = (text: string) =>
      text.toLowerCase().replace(/\s+/g, " ").trim();

    const hasAnyEvidenceForClaim = (claim: any): boolean => {
      const claimText = String(claim?.text || "");
      const claimEntities = (claim?.keyEntities || []).map((e: string) =>
        String(e || "").toLowerCase(),
      );
      const claimLower = claimText.toLowerCase();
      const claimWords = claimLower.split(/\s+/).filter((w: string) => w.length > 4);
      const claimProc = String(claim?.contextId || "");

      return state.evidenceItems.some((f: EvidenceItem) => {
        // If we have proceeding context, prefer matching within that context.
        if (claimProc && f.contextId && f.contextId !== claimProc) return false;
        const factLower = String(f.statement || "").toLowerCase();
        // Entity overlap
        const hasEntityOverlap = claimEntities.some((entity: string) =>
          entity.length > 3 && factLower.includes(entity),
        );
        // Word overlap (at least 2 meaningful words)
        const wordOverlap = claimWords.filter((w: string) => factLower.includes(w)).length;
        return hasEntityOverlap || wordOverlap >= 2;
      });
    };

    const centralCoreClaims = directClaimsForResearch.filter(
      (c: any) => c?.isCentral === true && c?.claimRole === "core",
    );

    for (const c of centralCoreClaims) {
      if (!c?.id) continue;
      if (state.centralClaimsSearched.has(c.id)) continue;
      if (hasAnyEvidenceForClaim(c)) continue;

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
        recencyMatters: isRecencySensitive(basis, understanding),
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
      const isRecentClaim = isRecencySensitive(claimText, undefined);

      // Check if this claim has any supporting evidence
      // Evidence items are linked via relatedClaimId or by matching claim text/entities
      const claimEntities = (claim.keyEntities || []).map((e: string) => e.toLowerCase());
      const hasEvidence = state.evidenceItems.some((item: EvidenceItem) => {
        // Direct match via claim text in evidence item
        const evidenceLower = item.statement.toLowerCase();
        const claimLower = claimText.toLowerCase();

        // Check if any key entity from the claim appears in the evidence item
        const hasEntityOverlap = claimEntities.some((entity: string) =>
          entity.length > 3 && evidenceLower.includes(entity)
        );

        // Check for significant word overlap (at least 2 meaningful words)
        const claimWords = claimLower.split(/\s+/).filter((w: string) => w.length > 4);
        const wordOverlap = claimWords.filter((w: string) => evidenceLower.includes(w)).length;

        return hasEntityOverlap || wordOverlap >= 2;
      });

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

  // Research each context
  if (
    contexts.length > 0 &&
    state.iterations.length < contexts.length * 2
  ) {
    for (const context of contexts) {
      const contextEvidenceItems = state.evidenceItems.filter(
        (f) => f.contextId === context.id,
      );
      if (contextEvidenceItems.length < 2) {
        const contextKey = [context.institution || context.court, context.shortName, context.name]
          .filter(Boolean)
          .join(" ")
          .trim();
        // Build base queries
        const baseQueries = [
          `${entityStr} ${contextKey}`.trim(),
          `${entityStr} ${context.court || ""} official decision documents`.trim(),
          `${entityStr} ${context.shortName || context.name} evidence procedure`.trim(),
          `${entityStr} ${contextKey} outcome`.trim(),
        ];
        // Add date-variant queries for recency-sensitive topics
        const queries = recencyMatters ? [
          ...baseQueries,
          `${entityStr} ${contextKey} ${currentYear} latest`.trim(),
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
    const queries = recencyMatters
      ? [...baseQueries, ...contextAwareQueries]
      : [...baseQueries, ...contextAwareQueries.slice(0, 2)];
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

  // NEW v2.6.18: Search for decision-makers and potential conflicts of interest
  if (!state.decisionMakerSearchPerformed && contexts.length > 0) {
    // Extract decision-maker names from all contexts
    const decisionMakerNames = contexts
      .flatMap((s: AnalysisContext) => s.decisionMakers?.map(dm => dm.name) || [])
      .filter((name, index, arr) => arr.indexOf(name) === index); // unique names

    if (decisionMakerNames.length > 0) {
      const baseQueries = [
        `${decisionMakerNames[0]} conflict of interest ${entityStr}`,
        `${decisionMakerNames[0]} impartiality bias ${contexts[0]?.court || ""}`,
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
    "&ndash;": "–",
    "&mdash;": "—",
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
    firstLine.includes("%���") ||
    firstLine.includes("\x00") ||
    /^[\x00-\x1f\x7f-\xff]{3,}/.test(firstLine);

  // Check for other binary/garbage patterns
  const isGarbage =
    firstLine.length < 3 ||
    !/[a-zA-Z]{3,}/.test(firstLine) || // Must have some letters
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
        /[a-zA-Z]{4,}/.test(cleaned) &&
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
      // NEW: Source authority classification
      sourceAuthority: z.enum(["primary", "secondary", "opinion", "contested"]).optional(),
      // NEW: Evidence basis classification
      evidenceBasis: z
        .enum(["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"])
        .optional(),
      // Phase 1.5: Probative value assessment
      probativeValue: z.enum(["high", "medium", "low"]).optional(),
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

function normalizeEvidenceId(id: string, source: string): string {
  if (!id || typeof id !== "string") return "";
  const normalized = id.replace(/(^|-)F(\d+)/g, "$1E$2");
  if (normalized !== id) {
    console.warn(`[${source}] Legacy F-prefix evidence ID "${id}" detected; use "${normalized}"`);
  }
  return normalized;
}

function normalizeEvidenceIdList(ids: string[], source: string): string[] {
  return ids
    .map((id) => normalizeEvidenceId(String(id ?? ""), source))
    .filter((id) => id.length > 0);
}

type RawEvidenceItem = {
  statement?: string;
  category?: string;
  specificity?: "high" | "medium" | "low";
  sourceExcerpt?: string;
  contextId?: string;
  isContestedClaim?: boolean;
  claimSource?: string;
  claimDirection?: "supports" | "contradicts" | "neutral";
  sourceAuthority?: "primary" | "secondary" | "opinion" | "contested";
  evidenceBasis?: "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific";
  probativeValue?: "high" | "medium" | "low";
  evidenceScope?: any;
};

function normalizeEvidenceItems(raw: any, source: string): RawEvidenceItem[] {
  const rawItems = Array.isArray(raw?.evidenceItems) ? raw.evidenceItems : [];

  if (!Array.isArray(rawItems)) return [];

  const normalized = rawItems.map((item: any) => ({
    statement: item.statement ?? "",
    category: item.category ?? "evidence",
    specificity: item.specificity ?? "medium",
    sourceExcerpt: item.sourceExcerpt ?? "",
    contextId: item.contextId ?? "",
    isContestedClaim: item.isContestedClaim ?? false,
    claimSource: item.claimSource ?? "",
    claimDirection: item.claimDirection ?? "neutral",
    sourceAuthority: item.sourceAuthority,
    evidenceBasis: item.evidenceBasis,
    probativeValue: item.probativeValue,
    evidenceScope: item.evidenceScope,
  }));

  return normalized;
}

function normalizeSupportingEvidenceIds(raw: any, source: string): string[] {
  if (Array.isArray(raw?.supportingEvidenceIds) && raw.supportingEvidenceIds.length > 0) {
    return normalizeEvidenceIdList(raw.supportingEvidenceIds, source);
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
): Promise<EvidenceItem[]> {
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

  // v2.6.29: Include original claim for counter-evidence identification
  const originalClaimSection = originalClaim
    ? `\n\n## ORIGINAL USER CLAIM (for claimDirection evaluation)
The user's original claim is: "${originalClaim}"

For EVERY extracted evidence item, evaluate claimDirection:
- **"supports"**: This evidence item provides evidence that SUPPORTS the user's claim being TRUE
- **"contradicts"**: This evidence item provides evidence that CONTRADICTS the user's claim (supports the OPPOSITE being true)
- **"neutral"**: This evidence item is contextual/background information that doesn't directly support or contradict the claim

CRITICAL: Be precise about direction! If the user claims "X is better than Y" and the source says "Y is better than X", that is CONTRADICTING evidence, not supporting evidence.`
    : "";

  const systemPrompt = `Extract SPECIFIC evidence items. Focus: ${focus}
 ${targetContextId ? `Target context: ${targetContextId}` : ""}
Track contested claims with isContestedClaim and claimSource.
Only HIGH/MEDIUM specificity.
If the source contains evidence items relevant to MULTIPLE known contexts, include them (do not restrict to only the target),
and set contextId accordingly. Do not omit key numeric outcomes (durations, amounts, counts) when present.

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}). When extracting dates, compare them to this current date.${originalClaimSection}

## EVIDENCE SCOPE EXTRACTION (per-evidence EvidenceScope)

Evidence documents often define their EvidenceScope (methodology/boundaries/geography/temporal). Extract this when present:

**Look for explicit EvidenceScope definitions**:
- Methodology: "This study uses a specific analysis method", "Based on ISO 14040 LCA"
- Boundaries: "From initial inputs to final outcomes", "Excluding upstream production"
- Geographic: "Region A market", "Region B regulations", "national coverage"
- Temporal: "2020-2025 data", "FY2024", "as of March 2024"

**Set evidenceScope when the source defines its analytical frame**:
- name: Short label (e.g., "Broad boundary", "Narrow boundary", "EU-LCA", "Agency report")
- methodology: Standard referenced (empty string if none)
- boundaries: What's included/excluded (empty string if not specified)
- geographic: Geographic coverage (empty string if not specified)
- temporal: Time period (empty string if not specified)

**IMPORTANT**: Different sources may use different EvidenceScopes. A "40% reported value" from a broad-boundary study is NOT directly comparable to a number from a narrow-boundary study. Capturing EvidenceScope enables accurate comparisons.${contextsList}`;

  debugLog(`extractEvidence: Calling LLM for ${source.id}`, {
    textLength: source.fullText.length,
    title: source.title?.substring(0, 50),
    focus: focus.substring(0, 100),
  });

  try {
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
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Source: ${source.title}\nURL: ${source.url}\n\n${source.fullText}`,
        },
      ],
      temperature: getDeterministicTemperature(0.2, pipelineConfig),
      output: Output.object({ schema: EVIDENCE_SCHEMA }),
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

    const extractedItems = normalizeEvidenceItems(rawOutput, `Analyzer.extractEvidence:${source.id}`);
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
      filteredEvidenceItems = filteredEvidenceItems.filter((item) => {
        const hay = `${item.statement}\n${item.sourceExcerpt}`.toLowerCase();
        const isHighImpactOutcome =
          hay.includes("sentenced") ||
          hay.includes("convicted") ||
          hay.includes("years in prison") ||
          hay.includes("year prison") ||
          hay.includes("months in prison") ||
          (hay.includes("prison") && hay.includes("year"));
        return !isHighImpactOutcome;
      });
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
      const { kept, filtered, stats } = filterByProbativeValue(
        candidateEvidenceItems as EvidenceItem[],
        { ...DEFAULT_FILTER_CONFIG },
      );
      debugLog("Evidence filter stats", {
        sourceId: source.id,
        total: stats.total,
        kept: stats.kept,
        filtered: stats.filtered,
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
            `[Evidence Filter] ⚠️ High false positive rate${llmPrefix}: ${Math.round(falsePositiveRate * 100)}% ` +
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
      debugLog("❌ ANTHROPIC API CREDITS EXHAUSTED");
    }

    // Check for OpenAI schema validation errors
    if (errorMsg.includes("Invalid schema") || errorMsg.includes("required")) {
      debugLog("❌ OpenAI SCHEMA VALIDATION ERROR - check for .optional() fields in EVIDENCE_SCHEMA");
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
        const uniqueItems = deduplicateEvidenceItems(
          result.value.items,
          [...existingEvidenceItems, ...allEvidenceItems],
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
  const contextsFormatted = understanding.analysisContexts
    .map(
      (s: AnalysisContext) =>
        `- **${s.id}**: ${s.name}
  Institution: ${s.institution || s.court || "N/A"} | Date: ${s.temporal || s.date || "N/A"} | Status: ${s.status}
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
  const systemPromptBase = `You are a professional evidence analyst rendering evidence-based verdicts. Your role is to rate the truthfulness of claims by critically weighing evidence quality across AnalysisContexts, ensuring EvidenceScope compatibility when comparing evidence items, distinguishing causation from correlation, and assessing source credibility.

## CRITICAL: OUTPUT STRUCTURE - verdictSummary

You MUST provide a complete verdictSummary with:
- **answer**: A NUMBER from 0-100 representing the overall truth percentage of the ${inputLabel}
  * 86-100 = TRUE (strong evidence supports the claim)
  * 72-85 = MOSTLY-TRUE (mostly supported)
  * 58-71 = LEANING-TRUE (some support)
  * 43-57 = UNVERIFIED (insufficient evidence)
  * 29-42 = LEANING-FALSE (some counter-evidence)
  * 15-28 = MOSTLY-FALSE (strong counter-evidence)
  * 0-14 = FALSE (direct contradiction)
- **confidence**: A NUMBER from 0-100 indicating how confident you are in the verdict
- **shortAnswer**: A descriptive sentence summarizing the finding
- **nuancedAnswer**: A longer explanation of the verdict
- **keyFactors**: Array of key factors evaluated

CRITICAL: The "answer" field must be a NUMBER (not a string), and must reflect the weighted assessment of the claim based on evidence. Do NOT default to 50 - actively evaluate the evidence!

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- A date like "November 2025" is in the PAST if the current date is January 2026 or later
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments
- When in doubt about temporal relationships, use the evidence from sources rather than making assumptions

## EVIDENCE-SCOPE-AWARE EVALUATION

Evidence may come from sources with DIFFERENT EvidenceScopes (per-evidence source methodology/boundaries; e.g., broad-boundary vs narrow-boundary, Region A vs Region B methodology).

- **Check EvidenceScope alignment**: Are evidence items being compared from compatible EvidenceScopes?
- **Flag EvidenceScope mismatches**: Different EvidenceScopes are NOT directly comparable
- **Note in reasoning**: When EvidenceScope affects interpretation, mention it (e.g., "Under broad-boundary analysis...")

## CRITICAL: RATING DIRECTION

**ORIGINAL ${inputLabel} TO RATE**:
"${analysisInput}"

**YOUR TASK**: Rate the ORIGINAL ${inputLabel} above AS STATED by the user.
- If the user claims "X is better than Y" and evidence shows Y is better, rate as FALSE/LOW percentage
- If the user claims "X increased" and evidence shows X decreased, rate as FALSE/LOW percentage
- Preserve the directional/comparative aspect of the original claim
- DO NOT rate your analysis conclusion - rate whether the USER'S CLAIM matches the evidence

## COUNTER-EVIDENCE HANDLING

Evidence items in the EVIDENCE section are labeled with their relationship to the user's claim:
- **[SUPPORTING]**: Evidence that supports the user's claim being TRUE
- **[COUNTER-EVIDENCE]**: Evidence that CONTRADICTS the user's claim (supports the OPPOSITE being true)
- Unlabeled items are neutral/contextual

**How to use these labels:**
- If most evidence items are [COUNTER-EVIDENCE], the verdict should be LOW (FALSE/MOSTLY-FALSE range: 0-28%)
- If most evidence items are [SUPPORTING], the verdict should be HIGH (TRUE/MOSTLY-TRUE range: 72-100%)
- Weight counter-evidence appropriately - strong counter-evidence should significantly lower the verdict

## CRITICAL: CAUSAL vs TEMPORAL CLAIMS

When a claim contains causal language ("due to", "caused by", "because of", "linked to", "result of"):
- **Do NOT conflate "after" with "due to"**: Temporal sequence does NOT establish causation
- **Require causal evidence**: Association/correlation is NOT causation
- **Weight methodology criticism**: If the methodology used to establish causation is contested (e.g., unverified reporting systems, missing control groups, passive surveillance data), this DIRECTLY reduces the claim's truth value

**EXAMPLES**:
- Claim: "10 deaths occurred after X" - evaluate temporal sequence (easier to verify)
- Claim: "10 deaths were due to X" - evaluate CAUSATION (requires stronger evidence)
- Claim: "10 deaths after or due to X" - must evaluate the CAUSAL part ("due to") separately; temporal sequence alone is insufficient

**CRITICAL**: If causation is claimed but only temporal/correlational evidence exists (e.g., deaths reported after an event in an unverified system), the verdict should be LOW (29-42% LEANING-FALSE) because causation is NOT established.

## CONTEXTS - PROVIDE SEPARATE ANSWER FOR EACH
${contextsFormatted}

## INSTRUCTIONS

1. For EACH context (use contextId/contextName in the schema), provide:
   - contextId (must match: ${understanding.analysisContexts.map((p: AnalysisContext) => p.id).join(", ")})
   - contextName (use the context name)
   - answer: Truth percentage (0-100) rating THE ORIGINAL USER CLAIM shown above
     * CRITICAL: Rate whether the USER'S CLAIM is true, NOT whether your analysis is correct
     * If user claims "X is MORE efficient" and evidence shows "X is LESS efficient", answer should be 0-28% (FALSE/MOSTLY FALSE)
     * Preserve the direction/comparative aspect of the original claim
     * **CRITICAL: Evaluate SUBSTANCE, Not Attribution**
       - When evaluating a claim like "X happened according to Y's review":
         Do NOT evaluate whether Y's review EXISTS or what it SAID
         EVALUATE whether X is ACTUALLY TRUE based on evidence
       - The claim's truth depends on the SUBSTANCE (did X happen?), not the source's existence
       - If the source's methodology is contested by experts, the underlying claim's truth is UNCERTAIN regardless of what the source said
       - Example: "10 died due to Z per report R" → evaluate if deaths were CAUSED BY Z, not just whether R exists
   - shortAnswer (Assessment): A 1-sentence summary that MUST evaluate the assessedStatement shown above for this context
     * CRITICAL: The shortAnswer must answer/evaluate the assessedStatement for THIS context
     * MUST be a descriptive sentence, NOT just a percentage or scale label

   **CRITICAL: Direction consistency check (MANDATORY)**
   Before finalizing each context's answer:
   1. Decide clearly: does the evidence SUPPORT the user's claim as stated, CONTRADICT it, or is it UNVERIFIED/MIXED?
   2. Your numeric answer MUST match that direction:
      - SUPPORTS → answer should be ≥ 58 (leaning-true or higher)
      - CONTRADICTS → answer should be ≤ 42 (leaning-false or lower)
      - UNVERIFIED/MIXED → answer should be 43-57
   3. For comparison claims: if evidence supports the OPPOSITE direction (user claims "X > Y" but evidence shows "Y > X"), the answer MUST be ≤ 42.

   - keyFactors: Array of factors that address the SUBSTANCE of the original claim:
     * CRITICAL: Key factors must evaluate whether THE USER'S CLAIM is true, NOT whether your analysis is correct
     * For comparative claims ("X is better than Y"), factors should evaluate the actual comparison
     * For factual claims, factors should cover the main evidence points that support or refute the claim
     * For procedural/legal claims, include: standards application, process integrity, evidence basis, decision-maker independence
     * DO NOT generate meta-methodology factors like "Was the analysis done correctly?" - focus on the CLAIM ITSELF

2. KEY FACTOR SCORING RULES - VERY IMPORTANT:
   - supports="yes": Factor supports the claim with evidence (from sources OR your background knowledge of widely-reported information)
   - supports="no": Factor refutes the claim with counter-evidence (NOT just disputed/contested)
   - supports="neutral": Use ONLY when you genuinely have no information about this factor

   ${(state.pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge) ? `IMPORTANT: You MUST use your background knowledge! For well-known public events, established procedures/standards, and widely-reported information, you ALREADY KNOW the relevant information - use it!
   DO NOT mark factors as "neutral" if you know the answer from your training data.
   Example: If you know a process followed standard procedures, mark it "yes" even if sources don't explicitly state it.` : "Use ONLY the provided evidence and sources."}

   CRITICAL: Being "contested" or "disputed" by stakeholders = supports="yes" (if evidence supports it), NOT "neutral"
   Example: "Critics claim X was unfair" but X followed proper procedures = "yes", not "neutral"

3. Mark contested factors:
   - isContested: true ONLY if this factor is genuinely disputed with documented factual counter-evidence
   - **CRITICAL: Do NOT set isContested=true for:**
     * Mere disagreement or different viewpoints without documented counter-evidence
     * Rhetorical opposition without factual basis
     * Normal debate where both sides cite evidence (this is not "contested"; it's "disputed")
   - contestedBy: Be SPECIFIC about who disputes it (e.g., "supplier group A", "regulator X", "employee union")
     * Do NOT use vague terms like "some people" - specify WHICH group/organization
     * **NO CIRCULAR CONTESTATION**: The entity making a decision CANNOT contest its own decision
       - WRONG: "Due process adherence" contested by "Court X judiciary" (they conducted it!)
       - RIGHT: "Due process adherence" contested by "international observers" or "defense counsel"
   - factualBasis: Does the opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
     * **CRITICAL: factualBasis classification determines weight in aggregation**
     * "established" = Opposition cites SPECIFIC DOCUMENTED EVIDENCE that contradicts (e.g., audits showing violations, logs contradicting timeline, datasets contradicting measurements, official reports documenting non-compliance)
     * "disputed" = Opposition has some factual counter-evidence but it's debatable or incomplete
     * "opinion" = Opposition has NO factual counter-evidence - just claims, rhetoric, political statements, or actions without documentation
       - **Use "opinion" for**: Political criticism without specifics, "says it was unfair" without citing violated procedures, "claims bias" without evidence
       - **Do NOT use "opinion" for**: Documented violations, measured discrepancies, recorded non-compliance
     * "unknown" = Cannot determine

   **EXAMPLES of factualBasis classification**:
   - "External government says the proceeding was unfair" → "opinion" (no specific violation cited)
   - "Critics claim procedure violated" → "opinion" (no specific procedure number/statute cited)
   - "Audit found violation of Regulation 47(b)" → "established" (specific documented violation)
   - "Study measured 38 units vs claimed 55 units" → "established" (documented measurement contradiction)
   - "Defense presented conflicting expert testimony" → "disputed" (some counter-evidence but debatable)

   CRITICAL - factualBasis MUST be "opinion" for ALL of these:
   - Policy announcements or institutional actions without evidence
   - Statements by supporters, officials, or advocacy groups (claims are not evidence)
   - Calling something "unfair", "persecution", or "political" without citing specific documented violations
   - Public protests, position papers, or other responses without evidence

   factualBasis can ONLY be "established" or "disputed" when opposition provides:
   - Specific documents, records, logs, or audits showing actual procedural violations
   - Verifiable data or documents contradicting the findings
   - Documented evidence of specific errors, bias, or misconduct (not just allegations)

4. Calibration: Neutral contested factors don't reduce verdicts
   - Positive factors with evidence + neutral contested factors => keep the answer in the TRUE/MOSTLY-TRUE band (>=72%)
   - Only actual negative factors with documented evidence can reduce verdict

5. CLAIM VERDICT RULES (for claimVerdicts array):
   **CRITICAL**: You MUST generate verdicts for ALL claims listed in the CLAIMS section above. Those are the DIRECT thesis-relevant claims. Every listed claim must have a corresponding entry in claimVerdicts. Do NOT add verdicts for tangential/irrelevant claims that are not listed.

   - For each context, ensure ALL claims with that contextId (or claims that logically belong to that context) have verdicts
   - If a claim doesn't have a contextId, assign it to the most relevant context based on the claim content

   **CRITICAL - RATING DIRECTION FOR SUB-CLAIMS**:
   - The verdict MUST rate whether THE CLAIM AS STATED is true
   - If the claim says "X was proportionate" but evidence shows X was NOT proportionate → verdict should be LOW (15-28%)
   - If the claim says "X was justified" but evidence shows X was NOT justified → verdict should be LOW (15-28%)
   - DO NOT rate whether your analysis reasoning is correct - rate whether THE CLAIM TEXT matches the evidence
   - The reasoning field explains why the verdict is high or low - the verdict percentage MUST match the reasoning's conclusion
   - Example: If reasoning says "tariffs were NOT proportionate", the verdict for a claim stating "tariffs were proportionate" MUST be LOW

   - Provide a truth percentage (0-100) for each claim.
   - Use these bands to calibrate:
     * 86-100: TRUE (strong support, no credible counter-evidence)
     * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
     * 58-71: LEANING-TRUE (mixed evidence)
     * 43-57: UNVERIFIED (insufficient evidence)
     * 29-42: LEANING-FALSE (more counter-evidence than support)
     * 15-28: MOSTLY-FALSE (strong counter-evidence)
     * 0-14: FALSE (direct contradiction)

   CRITICAL: Stakeholder contestation ("critics say it was unfair") is NOT the same as counter-evidence.
   Use the TRUE/MOSTLY-TRUE band (>=72%), not the UNVERIFIED band (43-57%), if you know the evidence supports the claim despite stakeholder opposition.

${getKnowledgeInstruction(
  state.pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
  state.originalInput,
  understanding,
)}
${getProviderPromptHint(state.pipelineConfig?.llmProvider)}`;

  // Prevent structured-output truncation (common cause of JSON/schema parse failures).
  // Keep outputs concise so they fit within typical provider output token limits.
  const brevityRules = `
## OUTPUT BREVITY (CRITICAL)
- Be concise. Avoid long paragraphs.
- keyFactors: provide 3–5 items max (overall + per context).
- keyFactors.factor: <= 12 words. keyFactors.explanation: <= 1 sentence.
- claimVerdicts.reasoning: <= 2 short sentences.
- supportingEvidenceIds: include up to 5 IDs per claim (or [] if unclear).
- calibrationNote: keep very short (or "" if not applicable).`;

  const systemPrompt = systemPromptBase + brevityRules;

  const userPrompt = `## ${inputLabel}
"${analysisInput}"

## CONTEXTS
${contextsFormatted}

## CLAIMS
${claimsFormatted}

## EVIDENCE (UNVERIFIED EXTRACTED STATEMENTS)
${evidenceItemsFormatted}

Provide SEPARATE answers for each context.`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_MULTI_CONTEXT> | null = null;

  // Retry once in "extreme compact" mode to reduce the chance of truncated JSON output.
  // This is especially important when many evidence items/claims exist (deep mode).
  const attempts: Array<{ label: string; extraSystem: string }> = [
    { label: "primary", extraSystem: "" },
    {
      label: "retry-compact",
      extraSystem: `

## EXTREME COMPACT MODE (RETRY)
- keyFactors: provide 3 items max (overall + per AnalysisContext).
- keyFactors.explanation: <= 12 words.
- claimVerdicts.reasoning: <= 12 words.
- If unsure, prefer short, conservative wording over long explanations.`,
    },
  ];

  const normalizeMultiContextOutput = (obj: any) => {
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
        supportingEvidenceIds: normalizeSupportingEvidenceIds(cv, "normalizeMultiContextOutput"),
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
      const obj = normalizeMultiContextOutput(tryParseFirstJsonObject(c));
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
    const system =
      systemPrompt +
      `

## OUTPUT FORMAT (CRITICAL)
Return ONLY a single JSON object. Do NOT include markdown. Do NOT include any text outside JSON.

The JSON object MUST include these top-level keys:
- verdictSummary
- analysisContextAnswers
- analysisContextSummary
- claimVerdicts`;

    try {
      const result: any = await generateText({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `${userPrompt}\n\nReturn JSON only.` },
        ],
        temperature: getDeterministicTemperature(0.3, state.pipelineConfig),
        maxOutputTokens: 4096,
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

      const obj = normalizeMultiContextOutput(tryParseFirstJsonObject(txt));
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
          { role: "system", content: systemPrompt + attempt.extraSystem },
          { role: "user", content: userPrompt },
        ],
        temperature: getDeterministicTemperature(0.3, state.pipelineConfig),
        // Explicit maxOutputTokens avoids relying on SDK/provider defaults (which can be too low for multi-context verdicts).
        maxOutputTokens: 4096,
        output: Output.object({ schema: VERDICTS_SCHEMA_MULTI_CONTEXT }),
      });
      state.llmCalls++;
      recordLLMCall(state.budgetTracker, (result as any).usage?.totalTokens || (result as any).totalUsage?.totalTokens || 0);

      // Handle different AI SDK versions - safely extract structured output
      const rawOutput = extractStructuredOutput(result);
      if (rawOutput) {
        parsed = normalizeMultiContextOutput(rawOutput) as z.infer<typeof VERDICTS_SCHEMA_MULTI_CONTEXT>;
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
      debugLog("generateMultiContextVerdicts: ERROR", {
        attempt: attempt.label,
        error: errMsg,
        name: err instanceof Error ? err.name : typeof err,
        finishReason: isNoObj ? (err as any).finishReason : undefined,
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
        debugLog("❌ OpenAI SCHEMA VALIDATION ERROR in VERDICTS_SCHEMA_MULTI_CONTEXT");
      }
      state.llmCalls++;

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
        reasoning:
          "Unable to generate verdict due to structured-output failure. Manual review recommended.",
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
      nuancedAnswer:
        "Verdict generation failed due to a structured-output error (often caused by truncated JSON). Manual review recommended.",
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
      (v) => v.isCentral && v.truthPercentage >= 72,
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

    // P1: Track structured output failure
    state.analysisWarnings.push({
      type: "structured_output_failure",
      severity: "error",
      message: "Multi-context verdict generation failed due to structured output error. Using fallback verdicts (50% uncertain).",
      details: {
        fallbackClaimCount: fallbackVerdicts.length,
      },
    });

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
    const factors = pa.keyFactors as KeyFactor[];
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

    if (answerTruthPct < 43 && positiveFactors > effectiveNegatives) {
      correctedConfidence = Math.min(correctedConfidence, 72);
      answerTruthPct = truthFromBand("partial", correctedConfidence);
      factorAnalysis.verdictExplanation = `Corrected from <43: ${positiveFactors} positive > ${effectiveNegatives.toFixed(1)} effective negative`;
    } else if (
      answerTruthPct < 43 &&
      contestedNegatives > 0 &&
      contestedNegatives === negativeFactors
    ) {
      correctedConfidence = Math.min(correctedConfidence, 68);
      answerTruthPct = truthFromBand("partial", correctedConfidence);
      factorAnalysis.verdictExplanation = `Corrected: All ${negativeFactors} factors are contested`;
    }

    // PR-C: Clamp truth percentage to valid range
    const clampedTruthPct = clampTruthPercentage(answerTruthPct);
    return {
      ...pa,
      answer: clampedTruthPct,
      confidence: correctedConfidence,
      truthPercentage: clampedTruthPct,
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
    debugLog(`⚠️ High context count detected: ${correctedAnalysisContextAnswers.length} contexts may indicate over-splitting`);
  }

  // Calculate average for display (UI can choose to de-emphasize when hasMultipleContexts=true)
  const avgTruthPct = correctedAnalysisContextAnswers.length > 0
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
        ? (relatedContext.answer >= 72
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

  const claimVerdicts: ClaimVerdict[] = parsed.claimVerdicts.map((cv: any) => {
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
      const actuallyHigh = truthPct >= 58;
      const actuallyLow = truthPct <= 42;

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
    const isCounterClaim = claim?.isCounterClaim ?? detectCounterClaim(
      claim?.text || cv.claimId || "",
      understanding.impliedClaim || understanding.articleThesis || "",
      truthPct,
      claimFacts,
    );

    // v2.5.2: If the context has positive factors and no evidenced negatives,
    // boost claims below 72% into the >=72 band
    // v2.6.31: SKIP boost if verdict was inverted (reasoning contradicts claim)
    // v2.6.31: SKIP boost for counter-claims (they evaluate the opposite position)
    if (!inversionCheck.wasInverted && !isCounterClaim && relatedContext && relatedContext.factorAnalysis) {
      const fa = relatedContext.factorAnalysis;
      // Check if context has positive factors and no evidenced negatives
      const contextIsPositive = relatedContext?.answer >= 72;

      // If context is positive and claim is below threshold, boost it
      // This applies to claims below 72% or with mixed/uncertain evidence
      if (contextIsPositive && truthPct < 72) {
        const originalTruth = truthPct;
        truthPct = 72; // Minimum for MOSTLY-TRUE
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
    // PR-C: Clamp truth percentage to valid range
    const clampedTruthPct = clampTruthPercentage(truthPct);
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
  });

  const weightedClaimVerdicts = applyEvidenceWeighting(
    claimVerdicts,
    state.evidenceItems,
    state.sources,
  );

  // P0: Validate verdict direction against evidence direction (multi-context path)
  const {
    validatedVerdicts: directionValidatedVerdicts,
    mismatches: verdictMismatches,
    warnings: verdictDirectionWarnings,
  } = validateVerdictDirections(weightedClaimVerdicts, state.evidenceItems, {
    majorityThreshold: 0.6,
    autoCorrect: true, // Auto-correct mismatches for better accuracy
    minEvidenceCount: 2,
  });

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
    supported: finalVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: finalVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: finalVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: finalVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: finalVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
  };

  const calibrationNote = hasContestedFactors
    ? "Some factors are contested with documented evidence and receive reduced weight."
    : undefined;

  // PR-C: Clamp truth percentage to valid range (defensive)
  const clampedAvgTruthPct = clampTruthPercentage(avgTruthPct);

  const summaryKeyFactors = parsed.verdictSummary.keyFactors || [];
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
    shortAnswer: parsed.verdictSummary.shortAnswer,
    nuancedAnswer: parsed.verdictSummary.nuancedAnswer,
    keyFactors: prunedSummaryKeyFactors, // v2.8.6: Use pruned keyFactors
    hasMultipleContexts: hasMultipleContexts,
    analysisContextAnswers: correctedAnalysisContextAnswers,
    analysisContextSummary: parsed.analysisContextSummary,
    calibrationNote,
    hasContestedFactors,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality × confidence)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(finalVerdicts);

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

  const systemPrompt = `Answer the input based on documented evidence.

## CRITICAL: OUTPUT STRUCTURE - verdictSummary

You MUST provide a complete verdictSummary with:
- **answer**: A NUMBER from 0-100 representing the overall truth percentage of the ${inputLabel}
  * 86-100 = TRUE (strong evidence supports the claim)
  * 72-85 = MOSTLY-TRUE (mostly supported)
  * 58-71 = LEANING-TRUE (some support)
  * 43-57 = UNVERIFIED (insufficient evidence)
  * 29-42 = LEANING-FALSE (some counter-evidence)
  * 15-28 = MOSTLY-FALSE (strong counter-evidence)
  * 0-14 = FALSE (direct contradiction)
- **confidence**: A NUMBER from 0-100 indicating how confident you are in the verdict
- **shortAnswer**: A descriptive sentence summarizing the finding
- **nuancedAnswer**: A longer explanation of the verdict
- **keyFactors**: Array of key factors evaluated

CRITICAL: The "answer" field must be a NUMBER (not a string), and must reflect the weighted assessment of the claim based on evidence. Do NOT default to 50 - actively evaluate the evidence!

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments

## CRITICAL: RATING DIRECTION

**YOUR TASK**: Rate the ORIGINAL ${inputLabel} AS STATED by the user (shown below in the user prompt).
- If the user claims "X is better than Y" and evidence shows Y is better, rate as FALSE/LOW percentage
- If the user claims "X increased" and evidence shows X decreased, rate as FALSE/LOW percentage
- Preserve the directional/comparative aspect of the original claim
- DO NOT rate your analysis conclusion - rate whether the USER'S CLAIM matches the evidence

**CRITICAL: Evaluate SUBSTANCE, Not Attribution**
- When evaluating a claim like "X happened according to Y's review":
  - Do NOT evaluate whether Y's review EXISTS or what it SAID
  - EVALUATE whether X is ACTUALLY TRUE based on evidence
- The claim's truth depends on the SUBSTANCE (did X happen?), not the source's existence
- If the source's methodology is contested by experts, the underlying claim's truth is UNCERTAIN regardless of what the source said
- Example: "10 died due to Z per report R" → evaluate if deaths were CAUSED BY Z, not just whether R exists

## COUNTER-EVIDENCE HANDLING

Evidence items in the EVIDENCE section are labeled with their relationship to the user's claim:
- **[SUPPORTING]**: Evidence that supports the user's claim being TRUE
- **[COUNTER-EVIDENCE]**: Evidence that CONTRADICTS the user's claim (supports the OPPOSITE being true)
- Unlabeled items are neutral/contextual

**How to use these labels:**
- If most evidence items are [COUNTER-EVIDENCE], the verdict should be LOW (FALSE/MOSTLY-FALSE range: 0-28%)
- If most evidence items are [SUPPORTING], the verdict should be HIGH (TRUE/MOSTLY-TRUE range: 72-100%)
- Weight counter-evidence appropriately - strong counter-evidence should significantly lower the verdict

## CRITICAL: CAUSAL vs TEMPORAL CLAIMS

When a claim contains causal language ("due to", "caused by", "because of", "linked to", "result of"):
- **Do NOT conflate "after" with "due to"**: Temporal sequence does NOT establish causation
- **Require causal evidence**: Association/correlation is NOT causation
- **Weight methodology criticism**: If the methodology used to establish causation is contested (e.g., unverified reporting systems, missing control groups, passive surveillance data), this DIRECTLY reduces the claim's truth value

**EXAMPLES**:
- Claim: "10 deaths occurred after X" - evaluate temporal sequence (easier to verify)
- Claim: "10 deaths were due to X" - evaluate CAUSATION (requires stronger evidence)
- Claim: "10 deaths after or due to X" - must evaluate the CAUSAL part ("due to") separately; temporal sequence alone is insufficient

**CRITICAL**: If causation is claimed but only temporal/correlational evidence exists (e.g., deaths reported after an event in an unverified system), the verdict should be LOW (29-42% LEANING-FALSE) because causation is NOT established.

## EVIDENCE-SCOPE-AWARE EVALUATION

Evidence may come from sources with DIFFERENT EvidenceScopes (per-evidence source methodology/boundaries; e.g., broad-boundary vs narrow-boundary, Region A vs Region B methodology).

- **Check EvidenceScope alignment**: Are evidence items being compared from compatible EvidenceScopes?
- **Flag EvidenceScope mismatches**: Different EvidenceScopes are NOT directly comparable
- **Note in reasoning**: When EvidenceScope affects interpretation, mention it

## SHORT ANSWER GUIDANCE:
- shortAnswer MUST be a complete descriptive sentence summarizing the finding
- Example: "The evidence shows proper procedures were followed."
- NEVER use just a percentage value or scale label as the shortAnswer

## KEY FACTORS - CRITICAL GUIDANCE:
Key factors must address the SUBSTANCE of the original claim:
- CRITICAL: Key factors must evaluate whether THE USER'S CLAIM is true, NOT whether your analysis is correct
- For comparative claims ("X is better than Y"), factors should evaluate the actual comparison
- For factual claims, factors should cover the main evidence points that support or refute the claim
- For procedural/legal claims, include: standards application, process integrity, evidence basis
- DO NOT generate meta-methodology factors like "Was the analysis done correctly?" - focus on the CLAIM ITSELF

## KEY FACTOR SCORING RULES - VERY IMPORTANT:
- supports="yes": Factor supports the claim with evidence (from sources OR your background knowledge)
- supports="no": Factor refutes the claim with counter-evidence (NOT just disputed/contested)
- supports="neutral": Use ONLY when you genuinely have no information about this factor

${(state.pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge) ? `IMPORTANT: You MUST use your background knowledge! For well-known public events and widely-reported information, use what you know!
DO NOT mark factors as "neutral" if you know the answer from your training data.` : "Use ONLY the provided evidence and sources."}

CRITICAL: Being "contested" by stakeholders does NOT make something neutral.
Example: "Critics claim X was unfair" but X followed proper procedures = "yes", not "neutral"

## Mark contested factors:
- isContested: true ONLY if this factor is genuinely disputed with documented factual counter-evidence
- **CRITICAL: Do NOT set isContested=true for:**
  * Mere disagreement or different viewpoints without documented counter-evidence
  * Rhetorical opposition without factual basis
  * Normal debate where both sides cite evidence (this is not "contested"; it's "disputed")
- contestedBy: Who disputes it (empty string if not contested)
  * **NO CIRCULAR CONTESTATION**: The entity that made the decision CANNOT contest it
  * Example: If evaluating "Was Court X's trial fair?", contestedBy CANNOT be "Court X" or "Court X judiciary"
- factualBasis: Does opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
  * "established" = Opposition cites SPECIFIC DOCUMENTED EVIDENCE (audits, logs, datasets)
  * "disputed" = Opposition has some factual counter-evidence but debatable
  * "opinion" = NO factual counter-evidence (just claims, political statements, executive orders)
  * "unknown" = Cannot determine

CRITICAL - factualBasis MUST be "opinion" for:
- Policy announcements or institutional actions without evidence
- Statements by supporters, officials, or advocacy groups (claims are not evidence)
- Calling something "unfair" or "persecution" without documented violations

## CLAIM VERDICT RULES:

**CRITICAL - RATING DIRECTION FOR SUB-CLAIMS**:
- The verdict MUST rate whether THE CLAIM AS STATED is true
- If the claim says "X was proportionate" but evidence shows X was NOT proportionate → verdict should be LOW (15-28%)
- If the claim says "X was justified" but evidence shows X was NOT justified → verdict should be LOW (15-28%)
- DO NOT rate whether your analysis reasoning is correct - rate whether THE CLAIM TEXT matches the evidence
- The reasoning field explains why the verdict is high or low - the verdict percentage MUST match the reasoning's conclusion
- Example: If reasoning says "tariffs were NOT proportionate", the verdict for a claim stating "tariffs were proportionate" MUST be LOW

- Provide a truth percentage (0-100) for each claim.
- Use these bands to calibrate:
  * 86-100: TRUE (strong support, no credible counter-evidence)
  * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
  * 58-71: LEANING-TRUE (mixed evidence)
  * 43-57: UNVERIFIED (insufficient evidence)
  * 29-42: LEANING-FALSE (more counter-evidence than support)
  * 15-28: MOSTLY-FALSE (strong counter-evidence)
  * 0-14: FALSE (direct contradiction)

CRITICAL: Stakeholder contestation is NOT counter-evidence.
Use the TRUE/MOSTLY-TRUE band (>=72%) if you know the evidence supports the claim despite stakeholder opposition.

${getKnowledgeInstruction(
  state.pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
  state.originalInput,
  understanding,
)}
${getProviderPromptHint(state.pipelineConfig?.llmProvider)}`;

  const userPrompt = `## ${inputLabel}
"${analysisInput}"

## CLAIMS
${claimsFormatted}

## EVIDENCE (UNVERIFIED EXTRACTED STATEMENTS)
${evidenceItemsFormatted}`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_SIMPLE> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.3, state.pipelineConfig),
      maxOutputTokens: 4096,
      output: Output.object({ schema: VERDICTS_SCHEMA_SIMPLE }),
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
          supportingEvidenceIds: normalizeSupportingEvidenceIds(cv, "generateSingleContextVerdicts"),
        })),
      };

      // Debug: Log what we received vs what we're using
      console.log("[Analyzer] generateSingleContextVerdicts: Raw verdictSummary.answer =", rawOutput.verdictSummary?.answer, "type =", typeof rawOutput.verdictSummary?.answer);
      console.log("[Analyzer] generateSingleContextVerdicts: Coerced verdictSummary.answer =", coercedOutput.verdictSummary?.answer);

      parsed = coercedOutput as z.infer<typeof VERDICTS_SCHEMA_SIMPLE>;
    }
  } catch (err) {
    console.warn(
      "[Analyzer] Structured output failed for verdicts, using fallback:",
      err,
    );
    state.llmCalls++;
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
        reasoning: "Unable to generate verdict due to structured-output failure.",
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
      nuancedAnswer:
        "Verdict generation failed due to a structured-output error (often caused by truncated JSON). Manual review recommended.",
      keyFactors: [],
      hasMultipleContexts: false,
    };

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
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

    // P1: Track structured output failure
    state.analysisWarnings.push({
      type: "structured_output_failure",
      severity: "error",
      message: "Single-context verdict generation failed due to structured output error. Using fallback verdicts (50% uncertain).",
      details: {
        fallbackClaimCount: fallbackVerdicts.length,
      },
    });

    return { claimVerdicts: fallbackVerdicts, articleAnalysis, verdictSummary };
  }

  // Normal flow with parsed output

  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv]),
  );

  // Ensure ALL claims get a verdict
  const claimVerdicts: ClaimVerdict[] = claimsForVerdicts.map(
    (claim: any) => {
      const cv = llmVerdictMap.get(claim.id);

      if (!cv) {
        console.warn(
          `[Analyzer] Missing verdict for claim ${claim.id}, using default`,
        );
        return {
          claimId: claim.id,
          claimText: claim.text,
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
        const actuallyHigh = truthPct >= 58;
        const actuallyLow = truthPct <= 42;

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
      const isCounterClaim = claim.isCounterClaim ?? detectCounterClaim(
        claim.text || cv.claimId || "",
        understanding.impliedClaim || understanding.articleThesis || "",
        truthPct,
        claimFacts,
      );

      // PR-C: Clamp truth percentage to valid range
      const clampedTruthPct = clampTruthPercentage(truthPct);
      return {
        ...cv,
        claimId: claim.id,
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
  );

  const weightedClaimVerdicts = applyEvidenceWeighting(
    claimVerdicts,
    state.evidenceItems,
    state.sources,
  );

  // P0: Validate verdict direction against evidence direction (single-context path)
  const {
    validatedVerdicts: directionValidatedVerdicts,
    mismatches: verdictMismatches,
    warnings: verdictDirectionWarnings,
  } = validateVerdictDirections(weightedClaimVerdicts, state.evidenceItems, {
    majorityThreshold: 0.6,
    autoCorrect: true, // Auto-correct mismatches for better accuracy
    minEvidenceCount: 2,
  });

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
    supported: finalVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: finalVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: finalVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: finalVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: finalVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
  };

  const keyFactors = parsed.verdictSummary.keyFactors || [];

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
  console.log("[generateSingleContextVerdicts] Raw verdictSummary.answer =", parsed.verdictSummary.answer, "type =", typeof parsed.verdictSummary.answer);
  console.log("[generateSingleContextVerdicts] Raw verdictSummary.confidence =", parsed.verdictSummary.confidence, "type =", typeof parsed.verdictSummary.confidence);

  let answerTruthPct = normalizePercentage(parsed.verdictSummary.answer);
  let correctedConfidence = normalizePercentage(parsed.verdictSummary.confidence);

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
  const clampedAnswerTruthPct = clampTruthPercentage(answerTruthPct);
  console.log("[generateSingleContextVerdicts] Final clampedAnswerTruthPct =", clampedAnswerTruthPct);
  const verdictSummary: VerdictSummary = {
    displayText: displayText,
    answer: clampedAnswerTruthPct,
    confidence: correctedConfidence,
    truthPercentage: clampedAnswerTruthPct,
    shortAnswer: parsed.verdictSummary.shortAnswer || "",
    nuancedAnswer: parsed.verdictSummary.nuancedAnswer || "",
    keyFactors: prunedKeyFactors, // v2.8.6: Use pruned keyFactors
    hasMultipleContexts: false,
    hasContestedFactors,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality × confidence)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(finalVerdicts);

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

  // Article verdict - CRITICAL: Use clamped value for consistency with verdictSummary
    articleTruthPercentage: clampedAnswerTruthPct,
    articleVerdict: clampedAnswerTruthPct,
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

  // Also add Article Verdict Problem analysis per POC1 spec
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let systemPrompt = `Generate verdicts for each claim AND an independent article-level verdict.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments

## CLAIM VERDICT CALIBRATION (IMPORTANT):

**CRITICAL - RATING DIRECTION FOR SUB-CLAIMS**:
- The verdict MUST rate whether THE CLAIM AS STATED is true
- If the claim says "X was proportionate" but evidence shows X was NOT proportionate → verdict should be LOW (15-28%)
- If the claim says "X was justified" but evidence shows X was NOT justified → verdict should be LOW (15-28%)
- DO NOT rate whether your analysis reasoning is correct - rate whether THE CLAIM TEXT matches the evidence
- The reasoning field explains why the verdict is high or low - the verdict percentage MUST match the reasoning's conclusion
- Example: If reasoning says "tariffs were NOT proportionate", the verdict for a claim stating "tariffs were proportionate" MUST be LOW

**CRITICAL: Evaluate SUBSTANCE, Not Attribution**
- When evaluating a claim like "X happened according to Y's review":
  - Do NOT evaluate whether Y's review EXISTS or what it SAID
  - EVALUATE whether X is ACTUALLY TRUE based on evidence
- The claim's truth depends on the SUBSTANCE (did X happen?), not the source's existence
- If the source's methodology is contested by experts, the underlying claim's truth is UNCERTAIN regardless of what the source said
- Example: "10 died due to Z per report R" → evaluate if deaths were CAUSED BY Z, not just whether R exists

- Provide a truth percentage (0-100) for each claim.
- Use these bands to calibrate:
  * 86-100: TRUE (strong support, no credible counter-evidence)
  * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
  * 58-71: LEANING-TRUE (mixed evidence)
  * 43-57: UNVERIFIED (insufficient evidence)
  * 29-42: LEANING-FALSE (more counter-evidence than support)
  * 15-28: MOSTLY-FALSE (strong counter-evidence)
  * 0-14: FALSE (direct contradiction)

Use the MOSTLY-FALSE/FALSE bands (0-28%) for any claim that evidence contradicts, regardless of certainty level.

## COUNTER-EVIDENCE HANDLING

Evidence items in the EVIDENCE section are labeled with their relationship to the user's claim:
- **[SUPPORTING]**: Evidence that supports the user's claim being TRUE
- **[COUNTER-EVIDENCE]**: Evidence that CONTRADICTS the user's claim (supports the OPPOSITE being true)
- Unlabeled items are neutral/contextual

**How to use these labels:**
- If most evidence items are [COUNTER-EVIDENCE], the verdict should be LOW (FALSE/MOSTLY-FALSE range: 0-28%)
- If most evidence items are [SUPPORTING], the verdict should be HIGH (TRUE/MOSTLY-TRUE range: 72-100%)
- Weight counter-evidence appropriately - strong counter-evidence should significantly lower the verdict

## CRITICAL: CAUSAL vs TEMPORAL CLAIMS

When a claim contains causal language ("due to", "caused by", "because of", "linked to", "result of"):
- **Do NOT conflate "after" with "due to"**: Temporal sequence does NOT establish causation
- **Require causal evidence**: Association/correlation is NOT causation
- **Weight methodology criticism**: If the methodology used to establish causation is contested (e.g., unverified reporting systems, missing control groups, passive surveillance data), this DIRECTLY reduces the claim's truth value

**EXAMPLES**:
- Claim: "10 deaths occurred after X" - evaluate temporal sequence (easier to verify)
- Claim: "10 deaths were due to X" - evaluate CAUSATION (requires stronger evidence)
- Claim: "10 deaths after or due to X" - must evaluate the CAUSAL part ("due to") separately; temporal sequence alone is insufficient

**CRITICAL**: If causation is claimed but only temporal/correlational evidence exists (e.g., deaths reported after an event in an unverified system), the verdict should be LOW (29-42% LEANING-FALSE) because causation is NOT established.

## CLAIM CONTESTATION (for each claim):
- isContested: true ONLY if this claim is genuinely disputed with documented factual counter-evidence
- **CRITICAL: Do NOT set isContested=true for:**
  * Mere disagreement or different viewpoints without documented counter-evidence
  * Rhetorical opposition without factual basis
  * Normal debate where both sides cite evidence (this is not "contested"; it's "disputed")
- contestedBy: Who disputes it (e.g., "critics", "opponents") - empty string if not contested
  * **NO CIRCULAR CONTESTATION**: The entity that made the decision CANNOT contest its own decision
- factualBasis: Does the opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
  * **CRITICAL: factualBasis classification determines weight in aggregation**
  * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS that contradict (e.g., audits showing violations, logs contradicting timeline, datasets contradicting measurements, official reports documenting non-compliance)
  * "disputed" = Opposition has some factual counter-evidence but it's debatable or incomplete
  * "opinion" = Opposition has NO factual counter-evidence - just claims, rhetoric, political statements, or actions without documentation
    - **Use "opinion" for**: Political criticism without specifics, "says it was unfair" without citing violated procedures, "claims bias" without evidence
    - **Do NOT use "opinion" for**: Documented violations, measured discrepancies, recorded non-compliance
  * "unknown" = Cannot determine

**EXAMPLES of factualBasis classification**:
- "External government says the proceeding was unfair" → "opinion" (no specific violation cited)
- "Critics claim procedure violated" → "opinion" (no specific procedure number/statute cited)
- "Audit found violation of Regulation 47(b)" → "established" (specific documented violation)
- "Study measured 38 units vs claimed 55 units" → "established" (documented measurement contradiction)
- "Defense presented conflicting expert testimony" → "disputed" (some counter-evidence but debatable)

CRITICAL - factualBasis MUST be "opinion" for:
- Public statements or rhetoric without documented evidence
- Ideological objections without factual basis
- "Some people say" or "critics claim" without specific counter-evidence

## RATING CONFIRMATION (ratingConfirmation field) - v2.8.4

For EACH claim verdict, EXPLICITLY confirm what direction you are rating:

**ratingConfirmation** confirms your verdict direction:
- **"claim_supported"**: Evidence SUPPORTS the claim being TRUE → verdict should be 58-100%
- **"claim_refuted"**: Evidence REFUTES the claim → verdict should be 0-42%
- **"mixed"**: Evidence is balanced or insufficient → verdict should be 43-57%

**CRITICAL VALIDATION**: Your ratingConfirmation MUST match your verdict:
- ratingConfirmation: "claim_supported" + verdict: 25% = ERROR (mismatch!)
- ratingConfirmation: "claim_refuted" + verdict: 80% = ERROR (mismatch!)
- ratingConfirmation: "claim_supported" + verdict: 75% = CORRECT

**BEFORE OUTPUTTING**: Ask yourself:
"Am I rating THE USER'S CLAIM as true/false, or am I rating my analysis quality?"
→ Rate THE CLAIM, not your analysis.

## CAUSAL CLAIM CALIBRATION (CRITICAL)

When a claim uses causal language (e.g., "caused by", "due to", "because of"):
- Do NOT treat "after" / temporal sequence as proof of causation.
- If evidence only shows temporal association, unverified reports, or speculation (no causal methodology), the verdict should be in the **FALSE/MOSTLY-FALSE** bands (0-28%).
- Only rate causal claims above 42% if there is credible causal evidence (e.g., controlled analysis, clear causal mechanism with strong evidence, or authoritative findings with methodology).

## EVIDENCE-SCOPE-AWARE EVALUATION

Evidence may come from sources with DIFFERENT EvidenceScopes (per-evidence source methodology/boundaries; e.g., broad-boundary vs narrow-boundary, Region A vs Region B methodology).

**When evaluating claims with EvidenceScope-specific evidence**:
1. **Check EvidenceScope alignment**: Are evidence items being compared from compatible EvidenceScopes?
2. **Flag EvidenceScope mismatches**: If Source A uses a broad boundary and Source B uses a narrow boundary, these are NOT directly comparable
3. **Note in reasoning**: When EvidenceScope affects interpretation, mention it (e.g., "Under broad-boundary analysis...")
4. **Don't treat EvidenceScope differences as contradictions**: "40% efficient (broad boundary)" and "60% efficient (narrow boundary)" can BOTH be correct under different EvidenceScopes

**Example EvidenceScope mismatch to flag**:
- Claim: "Method A is more efficient than Method B"
- Source A (narrow boundary): "A is 60% efficient (use-phase only)"
- Source B (broad boundary): "B is 80% efficient (full lifecycle)"
→ These use different EvidenceScopes - NOT a valid comparison. Note in reasoning.

## ARTICLE VERDICT ANALYSIS (CRITICAL - Article Verdict Problem)

The article's overall credibility is NOT simply the average of individual claim verdicts!
An article with mostly accurate evidence items can still be MISLEADING if:
1. The main conclusion doesn't follow from the evidence
2. There are logical fallacies (correlation ≠ causation, cherry-picking, etc.)
3. The framing creates a false impression despite accurate individual evidence items

AFTER analyzing individual claims, evaluate the article as a whole:

1. What is the article's main argument or conclusion (thesis)?
2. Does this conclusion LOGICALLY FOLLOW from the evidence presented?
3. Are there LOGICAL FALLACIES?
   - Correlation presented as causation
   - Cherry-picking evidence
   - False equivalence
   - Appeal to authority without substance
   - Hasty generalization
4. Even if individual evidence items are accurate, is the article's framing MISLEADING?
5. Are CENTRAL claims (marked [CENTRAL]) true? If central claims are FALSE but supporting claims are TRUE, the article is MISLEADING.

6. **Central-claim dominance rule (generic)**:
   - If a CENTRAL claim is refuted in the **MOSTLY-FALSE/FALSE** bands (0-28%) AND that claim is a key pillar of the thesis, the articleVerdict should typically also fall in **15-28%** unless the thesis is clearly separable and primarily about other central claims.
   - If the refuted CENTRAL claim is also framed as causal/high-impact, weight it more heavily than peripheral accurate details.

ARTICLE VERDICT TRUTH PERCENTAGE:
- Provide articleVerdict as a truth percentage (0-100).
- Use these bands to calibrate:
  * 86-100: TRUE (thesis strongly supported, no significant logical issues)
  * 72-85: MOSTLY-TRUE (mostly supported, minor issues)
  * 58-71: LEANING-TRUE (mixed framing or gaps)
  * 43-57: UNVERIFIED (mixed support)
  * 29-42: LEANING-FALSE (notable logical gaps or framing issues)
  * 15-28: MOSTLY-FALSE (strong counter-evidence to the thesis)
  * 0-14: FALSE (thesis is directly contradicted)

IMPORTANT: Set verdictDiffersFromClaimAverage=true if the article verdict differs from what a simple average would suggest.
Example: If 3/4 claims are true but the main conclusion is false -> set articleVerdict in the LEANING-FALSE band (29-42%).

${getKnowledgeInstruction(
  state.pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
  state.originalInput,
  understanding,
)}
${getProviderPromptHint(state.pipelineConfig?.llmProvider)}`;

  // KeyFactors are now generated in understanding phase, not verdict generation
  systemPrompt += `

## KEY FACTORS
KeyFactors are handled in the understanding phase. Provide an empty keyFactors array: []`;

  // v2.9.2: Generic instruction for unscientific evidence (replaces pattern-based pseudoscience detection)
  // LLM should independently identify claims lacking scientific basis based on evidence quality
  systemPrompt += `\n\nEVIDENCE QUALITY GUIDANCE:
- Claims that rely on mechanisms contradicting established physics, chemistry, or biology should be treated with skepticism
- Claims lacking peer-reviewed scientific evidence, or relying on anecdotes/testimonials, are OPINION not established evidence
- If a claim's mechanism has no scientific basis, it should be in the MOSTLY-FALSE/FALSE bands (0-28%)
- However, do NOT place claims in the FALSE band (0-14%) unless directly contradicted by strong evidence`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_CLAIM> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `THESIS: "${understanding.articleThesis}"\n\nCLAIMS:\n${claimsFormatted}\n\nFACTS:\n${evidenceItemsFormatted}`,
        },
      ],
      temperature: getDeterministicTemperature(0.3, state.pipelineConfig),
      maxOutputTokens: 4096,
      output: Output.object({ schema: VERDICTS_SCHEMA_CLAIM }),
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
          supportingEvidenceIds: normalizeSupportingEvidenceIds(cv, "generateClaimVerdicts"),
        })),
      };

      parsed = coercedOutput as z.infer<typeof VERDICTS_SCHEMA_CLAIM>;
    }
  } catch (err: any) {
    console.error(
      "[Analyzer] Structured output failed for claim verdicts:",
      err?.message || err,
    );
    console.error("[Analyzer] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
    state.llmCalls++;
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
        reasoning:
          "Unable to generate verdict due to structured-output failure. Manual review recommended.",
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
      (v) => v.isCentral && v.truthPercentage >= 72,
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

    // P1: Track structured output failure
    state.analysisWarnings.push({
      type: "structured_output_failure",
      severity: "error",
      message: "Claim verdict generation failed due to structured output error. Using fallback verdicts (50% uncertain).",
      details: {
        fallbackClaimCount: fallbackVerdicts.length,
      },
    });

    return { claimVerdicts: fallbackVerdicts, articleAnalysis };
  }

  // Normal flow with parsed output

  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv]),
  );

  // Ensure ALL claims get a verdict (fill in missing ones)
  const claimVerdicts: ClaimVerdict[] = claimsForVerdicts.map(
    (claim: any) => {
      const cv = llmVerdictMap.get(claim.id);

      // If LLM didn't return a verdict for this claim, create a default one
      if (!cv) {
        console.warn(
          `[Analyzer] Missing verdict for claim ${claim.id}, using default`,
        );
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
        const actuallyHigh = truthPct >= 58;
        const actuallyLow = truthPct <= 42;

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
      const isCounterClaim = claim.isCounterClaim ?? detectCounterClaim(
        claim.text || cv.claimId || "",
        understanding.impliedClaim || understanding.articleThesis || "",
        truthPct,
        claimFacts,
      );

      // v2.9.2: Pseudoscience detection removed - LLM should identify claims lacking scientific basis
      // based on evidence quality, not pattern matching

      const evidenceBasedContestation =
        cv.isContested &&
        (cv.factualBasis === "established" || cv.factualBasis === "disputed");
      if (evidenceBasedContestation) {
        const penalty = cv.factualBasis === "established" ? 12 : 8;
        truthPct = Math.max(0, truthPct - penalty);
      }

      // PR-C: Clamp truth percentage to valid range
      const clampedTruthPct = clampTruthPercentage(truthPct);
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
  );

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
          const correctedPct = clampTruthPercentage(validation.suggestedCorrection);
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

        // Override harm potential if LLM assessment differs
        if (validation.harmPotential !== cv.harmPotential) {
          updatedVerdict.harmPotential = validation.harmPotential;
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

  const weightedClaimVerdicts = applyEvidenceWeighting(
    validatedClaimVerdicts,
    state.evidenceItems,
    state.sources,
  );

  // P0: Validate verdict direction against evidence direction (claim verdicts path)
  const {
    validatedVerdicts: directionValidatedVerdicts,
    mismatches: verdictMismatches,
    warnings: verdictDirectionWarnings,
  } = validateVerdictDirections(weightedClaimVerdicts, state.evidenceItems, {
    majorityThreshold: 0.6,
    autoCorrect: true, // Auto-correct mismatches for better accuracy
    minEvidenceCount: 2,
  });

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
        return depVerdict && depVerdict.truthPercentage < 43;
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
    supported: independentVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: independentVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: independentVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: independentVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: independentVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
    // Track excluded claims for transparency
    dependencyFailedCount: finalVerdicts.filter((v) => v.dependencyFailed).length,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality × confidence, only independent claims)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(independentVerdicts);

  // Article Verdict Problem: Check central claims specifically (using independent verdicts only)
  // If central claims are refuted but supporting claims are true, article is MISLEADING
  const centralClaims = independentVerdicts.filter((v) => v.isCentral);
  const centralRefuted = centralClaims.filter((v) => v.truthPercentage < 43);
  const centralSupported = centralClaims.filter((v) => v.truthPercentage >= 72);
  const nonCentralClaims = independentVerdicts.filter((v) => !v.isCentral);
  const nonCentralSupported = nonCentralClaims.filter((v) => v.truthPercentage >= 72);

  // Detect Article Verdict Problem pattern: accurate supporting evidence but false central claim
  const hasMisleadingPattern =
    centralRefuted.length > 0 &&
    nonCentralSupported.length >= 2 &&
    claimsAvgTruthPct >= 50; // Average looks OK but central claim is false

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
  // This catches the "Coffee cures cancer" pattern where supporting evidence is true
  // but the main conclusion is false
  if (hasMisleadingPattern && articleTruthPct > 35) {
    console.log(`[Analyzer] Article Verdict Problem detected: ${centralRefuted.length} central claims refuted, ${nonCentralSupported.length} supporting claims true, but avg=${claimsAvgTruthPct}%. Overriding to MISLEADING.`);
    articleTruthPct = 35; // MISLEADING range (29-42%)
    articleVerdictOverrideReason = `Central claim(s) refuted despite ${nonCentralSupported.length} accurate supporting evidence - article draws unsupported conclusions`;
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
        if (factorAvgTruthPct >= 72) {
          supports = "yes";
        } else if (factorAvgTruthPct < 43) {
          supports = "no";
        } else {
          supports = "neutral";
        }

        // Create explanation from aggregated claim verdicts
        const supportedCount = factorClaims.filter(v => v.truthPercentage >= 72).length;
        const refutedCount = factorClaims.filter(v => v.truthPercentage < 43).length;
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
  const iconPositive = useRich ? "✅" : "";
  const iconNegative = useRich ? "❌" : "";
  const iconNeutral = useRich ? "❓" : "";
  const iconWarning = useRich ? "⚠️" : "";
  const iconOk = useRich ? "✅" : "";
  const iconFail = useRich ? "❌" : "";

  let report = `# FactHarbor Analysis Report\n\n`;
  report += `**Analysis ID:** ${twoPanelSummary.factharborAnalysis.analysisId}\n`;
  report += `**Schema:** ${CONFIG.schemaVersion}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Executive Summary (moved to top - public-facing content first)
  report += `## Executive Summary\n\n`;

  // Unified summary for all inputs (input neutrality)
    const verdictEmoji =
      articleAnalysis.articleTruthPercentage >= 72
        ? iconPositive
        : articleAnalysis.articleTruthPercentage >= 43
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
      cv.truthPercentage >= 72
        ? iconPositive
        : cv.truthPercentage >= 43
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
      report += `- \`${sq.query}\` → ${sq.resultsCount} results (${sq.focus})\n`;
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

  debugLog("[Config] Loaded analyzer config", {
    source: analyzerConfig.source,
    pipelineHash: analyzerConfig.hashes.pipeline,
    llmTiering: pipelineConfig.llmTiering,
    analysisMode: pipelineConfig.analysisMode,
  });

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
  // v2.6.26: EARLY INPUT NORMALIZATION at entry point for complete input neutrality
  // Normalize yes/no phrasing to statements BEFORE any analysis begins
  // The original input is preserved only for UI display (originalInputDisplay)
  // ==========================================================================
  const rawInputValue = input.inputValue.trim();
  const needsNormalizationEntry =
    rawInputValue.endsWith("?") ||
    /^(was|is|are|were|did|do|does|has|have|had|can|could|will|would|should|may|might)\s/i.test(rawInputValue);

  // Normalize to statement form for ALL analysis
  // Also strip trailing period from statements to ensure identical text for both input phrasings
  let normalizedInputValue = needsNormalizationEntry
    ? normalizeYesNoQuestionToStatement(rawInputValue)
    : rawInputValue;

  // CRITICAL: Remove trailing period from ALL inputs for exact text matching
  // This ensures "Was X fair?" -> "X was fair" matches "X was fair." -> "X was fair"
  normalizedInputValue = normalizedInputValue.replace(/\.+$/, "").trim();

  // Store original input for UI display (will be set in understanding.originalInputDisplay)
  const originalInputDisplay = rawInputValue;

  console.log(`[Analyzer] v2.6.26 Input Neutrality: Entry point normalization`);
  console.log(`[Analyzer]   Original: "${rawInputValue.substring(0, 100)}"`);
  console.log(`[Analyzer]   Normalized: "${normalizedInputValue.substring(0, 100)}"`);
  // normalizedInputValue is now the canonical form for all analysis paths

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
    originalInput: normalizedInputValue,  // v2.6.26: Use NORMALIZED input everywhere
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
  let textToAnalyze = normalizedInputValue;  // v2.6.26: Use normalized input
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

    // UI-only: preserve original input text for display; analysis uses normalized statement
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

  const contextCount = state.understanding.analysisContexts.length;
  let statusMsg = `Detected: ${state.understanding.detectedInputType.toUpperCase()} with ${state.understanding.subClaims.length} claims`;
  if (contextCount > 1) statusMsg += ` | ${contextCount} CONTEXTS`;
  await emit(statusMsg, 10);

  // STEP 2-4: Research with search tracking
  let iteration = 0;
  let relevanceLlmCalls = 0;
  while (
    iteration < config.maxResearchIterations &&
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
        `⚠️ Budget limit reached: ${reason}`,
        Math.round(10 + (iteration / config.maxResearchIterations) * 50),
      );
      break;
    }

    // Record this iteration (increments totalIterations counter)
    // Note: Per-context limits enforced separately when researching specific contexts
    recordIteration(state.budgetTracker, `ITER_${iteration}`);

    const baseProgress = Math.round(10 + (iteration / config.maxResearchIterations) * 50);

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
        `⚠️ Search disabled (UCM search.enabled=false)`,
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
        `🔍 Using Gemini Grounded Search for: "${decision.focus}"`,
        baseProgress + 1,
      );

      const groundedResult = await searchWithGrounding({
        prompt: `Find recent, factual information about: ${decision.focus}`,
        context: state.originalInput || state.originalText || "",
      });

      if (groundedResult.groundingUsed && groundedResult.sources.length > 0) {
        console.log(`[Analyzer] Grounded search found ${groundedResult.sources.length} URL candidates`);

        // PR-B: Ground Realism hardening
        // Fetch the URLs provided by grounded search (don't use synthetic content)
        await emit(`Fetching ${groundedResult.sources.length} grounded sources`, baseProgress + 2);

      // Pipeline Phase 1: Apply URL deduplication to grounded search results
      const validGroundedSources = groundedResult.sources.filter(s => s.url && s.url.trim().length > 0);
      const groundedUrlCandidates = deduplicateSearchUrls(validGroundedSources, state)
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
          await emit(`📊 Checking source reliability (${uniqueGroundedDomains.length}): ${domainPreview}`, baseProgress + 3);
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
            `  → ${successfulSources.length}/${validSources.length} grounded sources fetched successfully`,
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
        await emit(`⚠️ Grounded search unavailable, using standard search`, baseProgress + 1);
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
      let recencyMatters = decision.recencyMatters || isRecencySensitive(query, state.understanding || undefined);
      let dateRestrict: "y" | "m" | "w" | undefined = searchConfig.dateRestrict ?? undefined;

      const temporalConfThreshold = state.pipelineConfig.temporalConfidenceThreshold ?? 0.6;
      if (temporalContext?.isRecencySensitive && temporalContext.confidence > temporalConfThreshold) {
        // Use LLM-determined temporal context
        recencyMatters = true;
        if (!dateRestrict) {
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
        `🔍 Searching [${searchProviders}]${dateFilterMsg}: "${query}"`,
        baseProgress + 1,
      );

      try {
        const searchResponse = await searchWebWithProvider({
          query,
          maxResults: searchConfig.maxResults,
          dateRestrict,
          domainWhitelist: searchConfig.domainWhitelist,
          domainBlacklist: searchConfig.domainBlacklist,
          timeoutMs: searchConfig.timeoutMs,
          config: searchConfig,
        });
        let results = searchResponse.results;
        const actualProviders = searchResponse.providersUsed.join("+");
        console.log(`[Analyzer] Search used: ${actualProviders}, returned ${results.length} results`);

        // Track the search with provider info
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: results.length,
          timestamp: new Date().toISOString(),
          searchProvider: searchConfig.provider,
        });

        searchResults.push(...results.map((r: any) => ({ ...r, query })));
        await emit(`  → ${results.length} results`, baseProgress + 2);
      } catch (err) {
        await emit(`  → Search failed: ${err}`, baseProgress + 2);
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: 0,
          timestamp: new Date().toISOString(),
          searchProvider: searchConfig.provider,
        });
      }
    }

    // Pipeline Phase 1: URL deduplication with normalization across iterations
    // First filter out results with empty URLs
    const validUrlResults = searchResults.filter((r) => r.url && r.url.trim().length > 0);
    // Apply cross-iteration deduplication using normalized URLs
    const deduplicatedResults = deduplicateSearchUrls(validUrlResults, state);
    // Preserve provider relevance ordering, limit to max sources per iteration
    const uniqueResults = deduplicatedResults.slice(0, searchConfig.maxSourcesPerIteration);

    // Task 2.2: Heuristic relevance pre-filter to remove obvious irrelevance before extraction
    const analysisContexts = state.understanding?.analysisContexts || [];
    const entityStrForRelevance =
      state.understanding?.impliedClaim ||
      state.understanding?.articleThesis ||
      state.originalInput ||
      "";

    const requireContextMatch =
      decision.category === "criticism" || decision.isContradictionSearch === true;

    const relevantResults: typeof uniqueResults = [];
    const relevanceLlmEnabled = state.pipelineConfig.searchRelevanceLlmEnabled ?? false;
    const relevanceLlmMaxCalls = state.pipelineConfig.searchRelevanceLlmMaxCalls ?? 3;

    for (const result of uniqueResults) {
      const check = checkSearchResultRelevance(
        result,
        entityStrForRelevance,
        analysisContexts,
        { requireContextMatch },
      );

      if (check.isRelevant) {
        relevantResults.push(result);
        continue;
      }

      const signals = check.signals;
      const isAmbiguous =
        !!signals &&
        (signals.entityMatchCount > 0 ||
          signals.contextMatchCount > 0 ||
          signals.institutionMentioned);

      if (
        relevanceLlmEnabled &&
        isAmbiguous &&
        relevanceLlmCalls < relevanceLlmMaxCalls
      ) {
        relevanceLlmCalls += 1;
        const llmDecision = await classifySearchResultRelevanceLLM(
          result,
          entityStrForRelevance,
          analysisContexts,
          understandModelInfo.model,
          state.pipelineConfig,
        );
        state.llmCalls += 1;

        if (llmDecision?.classification === "primary_source") {
          debugLog("Pre-filter LLM keep", {
            url: result.url,
            title: result.title,
            classification: llmDecision.classification,
            confidence: llmDecision.confidence,
          });
          relevantResults.push(result);
          continue;
        }

        debugLog("Pre-filter rejected", {
          url: result.url,
          title: result.title,
          reason: `llm_${llmDecision?.classification || "unavailable"}`,
          query: (result as any).query,
        });
        continue;
      }

      debugLog("Pre-filter rejected", {
        url: result.url,
        title: result.title,
        reason: check.reason,
        query: (result as any).query,
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
    await emit(`📊 Checking source reliability (${uniqueDomainsToFetch.length}): ${domainPreview2}`, baseProgress + 4);
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
      `  → ${successfulSources.length}/${validSources.length} fetched successfully`,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Pipeline Phase 1: Gap-driven research continuation
  // ═══════════════════════════════════════════════════════════════════════════
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
  // ═══════════════════════════════════════════════════════════════════════════
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

      const gaps = analyzeEvidenceGaps(
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
          state.searchQueries.push({
            query,
            iteration: state.iterations.length + 1,
            focus: "gap_research",
            resultsCount: results.length,
            timestamp: new Date().toISOString(),
            searchProvider: searchConfig.provider,
          });
        } catch (err) {
          console.warn(`[Analyzer] Gap research search failed: ${err}`);
        }
      }

      // Deduplicate and fetch sources
      const deduplicatedGapResults = deduplicateSearchUrls(
        gapSearchResults.filter((r) => r.url && r.url.trim().length > 0),
        state,
      ).slice(0, searchConfig.maxSourcesPerIteration);

      if (deduplicatedGapResults.length === 0) {
        console.log(`[Analyzer] Gap research: No new URLs found`);
        continue;
      }

      // Fetch and extract
      const gapFetchPromises = deduplicatedGapResults.map((r: any, i: number) =>
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
      enforceThesisRelevanceInvariants(
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
  state.understanding = ensureUnassignedClaimsContext(state.understanding!);
  state.understanding = pruneContextsByCoverage(state.understanding!, state.evidenceItems);
  state.understanding = ensureAtLeastOneContext(state.understanding!);
  validateContextReferences(state.understanding!, state.evidenceItems);

  // P0: Normalize evidence classifications with fallback tracking before verdict generation
  if (state.evidenceItems.length > 0) {
    state.evidenceItems = normalizeEvidenceClassifications(
      state.evidenceItems,
      state.fallbackTracker,
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
    (recencyBasis ? isRecencySensitive(recencyBasis, state.understanding || undefined) : false);

  if (recencyMatters) {
    const windowMonths = state.pipelineConfig.recencyWindowMonths ?? 6;
    const penalty = state.pipelineConfig.recencyConfidencePenalty ?? 20;
    const recencyCheck = validateEvidenceRecency(state.evidenceItems, new Date(), windowMonths);
    debugLog("Recency evidence check", {
      recencyMatters,
      windowMonths,
      penalty,
      hasRecentEvidence: recencyCheck.hasRecentEvidence,
      latestEvidenceDate: recencyCheck.latestEvidenceDate,
      signalsCount: recencyCheck.signalsCount,
      dateCandidates: recencyCheck.dateCandidates,
    });

    if (!recencyCheck.hasRecentEvidence && penalty > 0) {
      const applyPenalty = (value?: number | string | null) =>
        Math.max(0, normalizePercentage(value) - penalty);

      if (verdictSummary?.confidence != null) {
        verdictSummary.confidence = applyPenalty(verdictSummary.confidence);
      }
      if (articleAnalysis?.verdictSummary?.confidence != null) {
        articleAnalysis.verdictSummary.confidence = applyPenalty(articleAnalysis.verdictSummary.confidence);
      }

      state.analysisWarnings.push({
        type: "recency_evidence_gap",
        severity: "warning",
        message: `Time-sensitive claim lacks recent evidence (no signals within last ${windowMonths} months). Confidence reduced by ${penalty} points.`,
        details: {
          windowMonths,
          penalty,
          latestEvidenceDate: recencyCheck.latestEvidenceDate,
          signalsCount: recencyCheck.signalsCount,
          dateCandidates: recencyCheck.dateCandidates,
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
    state.evidenceItems
  );
  console.log(`[Analyzer] Gate 4 applied: ${gate4Stats.publishable}/${gate4Stats.total} publishable, HIGH=${gate4Stats.highConfidence}, MED=${gate4Stats.mediumConfidence}, LOW=${gate4Stats.lowConfidence}, INSUFF=${gate4Stats.insufficient}`);

  // Use validated verdicts going forward (includes gate4Validation metadata)
  const finalClaimVerdicts = validatedVerdicts;

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
  const reportMarkdown = await generateReport(
    state,
    finalClaimVerdicts,
    articleAnalysis,
    twoPanelSummary,
    model,
    searchConfig.provider,
  );

  // Safety: ensure we never emit a result with zero contexts, even if context refinement was
  // skipped/rejected and the initial understanding produced no contexts.
  state.understanding = ensureAtLeastOneContext(state.understanding!);

  // PR 6: Log budget stats and warn if exceeded
  const budgetStats = getBudgetStats(state.budgetTracker, state.budget);
  console.log(
    `[Budget] Usage: ${budgetStats.tokensUsed} tokens (${budgetStats.tokensPercent}%), ` +
    `${budgetStats.totalIterations} iterations (${budgetStats.iterationsPercent}%), ` +
    `${budgetStats.llmCalls} LLM calls`
  );
  if (state.budgetTracker.budgetExceeded) {
    console.warn(
      `[Budget] ⚠️ Analysis terminated early due to budget limits: ${state.budgetTracker.exceedReason}`
    );
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
    console.warn(
      `[Evidence Filter] ⚠️ LLM evidence quality filter failed ${state.evidenceFilterLlmFailures} time(s), fell back to heuristics`
    );
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

  await emit("Analysis complete", 100);

  // Result JSON with search data (NEW v2.4.3)
  const resultJson = {
    _schemaVersion: "2.7.0",
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: mode,
      llmProvider: provider,
      llmModel: modelName,
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
          llmCalls: stats.llmCalls,
          budgetExceeded: stats.budgetExceeded,
          exceedReason: state.budgetTracker.exceedReason,
        };
      })(),
    },
    verdictSummary: verdictSummary || null,
    analysisContexts: state.understanding!.analysisContexts,
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
    researchMetrics: (() => {
      // Use configurable threshold from pipeline config
      const similarityThreshold = state.pipelineConfig.evidenceSimilarityThreshold ?? 0.4;

      // Calculate coverage metrics
      const highCentralityClaims = state.understanding?.subClaims?.filter(c => c.centrality === "high") || [];
      const claimsWithEvidence = highCentralityClaims.filter(claim => {
        return state.evidenceItems.some(e => {
          if (e.contextId && claim.contextId && e.contextId === claim.contextId) return true;
          const similarity = calculateTextSimilarity(e.statement, claim.text);
          return similarity > similarityThreshold;
        });
      });
      const highCentralityCoverage = highCentralityClaims.length > 0
        ? claimsWithEvidence.length / highCentralityClaims.length
        : 1;

      // Calculate counter-evidence rate for HIGH centrality claims
      const claimsWithCounterEvidence = highCentralityClaims.filter(claim => {
        return state.evidenceItems.some(e => {
          if (e.claimDirection !== "contradicts") return false;
          if (e.contextId && claim.contextId && e.contextId === claim.contextId) return true;
          const similarity = calculateTextSimilarity(e.statement, claim.text);
          return similarity > similarityThreshold;
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
        ? analyzeEvidenceGaps(state.evidenceItems, state.understanding, state.searchQueries, similarityThreshold)
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
