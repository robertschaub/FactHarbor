/**
 * FactHarbor - Internal Source Reliability Evaluation API
 *
 * LLM-powered evaluation of source reliability with optional multi-model consensus.
 * This endpoint is INTERNAL ONLY - requires FH_INTERNAL_RUNNER_KEY.
 *
 * v2.6.36 Hardening:
 * - Adaptive negative-signal queries for better propaganda/misinformation coverage
 * - Brand variant matching for improved relevance filtering
 * - CRITICAL RULES + mechanistic confidence + numeric caps in prompt
 * - SOURCE TYPE SCORE CAPS with deterministic enforcement
 * - Grounding gates to reduce overrating under weak evidence
 * - Abstract examples (AGENTS.md compliant - no real domain names)
 *
 * @module api/internal/evaluate-source
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { getDeterministicTemperature } from "@/lib/analyzer/config";
import { debugLog } from "@/lib/analyzer/debug";
import { getPromptCachingOptions } from "@/lib/analyzer/llm";
import { getSection, loadPromptFile, type Pipeline } from "@/lib/analyzer/prompt-loader";
import { getActiveSearchProviders, searchWebWithProvider, type WebSearchResult } from "@/lib/web-search";
import { getConfig } from "@/lib/config-storage";
import { DEFAULT_SR_CONFIG, type SearchConfig, type SourceReliabilityConfig } from "@/lib/config-schemas";
import {
  computeRefinementConfidenceBoost,
  countUniqueEvidenceIds,
  extractEvidenceIdsFromText,
  getLanguageDetectionCaveat,
  languageDetectionStatus,
} from "@/lib/source-reliability-eval-helpers";
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_CONSENSUS_THRESHOLD,
  SOURCE_TYPE_EXPECTED_CAPS,
  scoreToFactualRating,
  meetsConfidenceRequirement,
  MIN_EVIDENCE_IDS_FOR_SCORE,
  MIN_FOUNDEDNESS_FOR_HIGH_SCORES,
  type FactualRating,
} from "@/lib/source-reliability-config";
import {
  assessEvidenceQuality,
  filterByRelevance,
  formatEvidenceForEvaluationPrompt,
  type EvidenceCategory,
  type EvidencePackItemForQuality,
  type EvidenceProbativeValue,
  type EvidenceQualityAssessmentConfig,
  type EvidenceQualityAssessmentMeta,
} from "@/lib/source-reliability/evidence-quality-assessment";
import { getEnv, checkRunnerKey } from "@/lib/auth";
import { ANTHROPIC_MODELS } from "@/lib/analyzer/model-tiering";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for multi-model evaluation

// ============================================================================
// CONFIGURATION DIAGNOSTICS (logs once on module load)
// ============================================================================

const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith("PASTE_");
const hasOpenAIKey = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith("PASTE_");

const SR_DEFAULT_EVALUATION_SEARCH = DEFAULT_SR_CONFIG.evaluationSearch!;
const SR_DEFAULT_EQA_CONFIG: EvidenceQualityAssessmentConfig =
  DEFAULT_SR_CONFIG.evidenceQualityAssessment ?? {
    enabled: true,
    model: "haiku",
    timeoutMs: 8000,
    maxItemsPerAssessment: 30,
    minRemainingBudgetMs: 20000,
  };

function buildSrSearchConfigFromEvalSearch(
  evalSearch: SourceReliabilityConfig["evaluationSearch"],
): SearchConfig {
  const cfg = evalSearch ?? SR_DEFAULT_EVALUATION_SEARCH;
  return {
    enabled: true,
    provider: cfg.provider,
    mode: "standard",
    maxResults: cfg.maxResultsPerQuery,
    maxSourcesPerIteration: cfg.maxResultsPerQuery,
    timeoutMs: cfg.timeoutMs,
    dateRestrict: cfg.dateRestrict,
    domainWhitelist: [],
    domainBlacklist: [],
    providers: {
      googleCse: {
        ...SR_DEFAULT_EVALUATION_SEARCH.providers.googleCse,
        ...cfg.providers.googleCse,
        dailyQuotaLimit:
          cfg.providers.googleCse.dailyQuotaLimit ??
          SR_DEFAULT_EVALUATION_SEARCH.providers.googleCse.dailyQuotaLimit ??
          0,
      },
      serpapi: {
        ...SR_DEFAULT_EVALUATION_SEARCH.providers.serpapi,
        ...cfg.providers.serpapi,
        dailyQuotaLimit:
          cfg.providers.serpapi.dailyQuotaLimit ??
          SR_DEFAULT_EVALUATION_SEARCH.providers.serpapi.dailyQuotaLimit ??
          0,
      },
      brave: {
        ...SR_DEFAULT_EVALUATION_SEARCH.providers.brave,
        ...cfg.providers.brave,
        dailyQuotaLimit:
          cfg.providers.brave.dailyQuotaLimit ??
          SR_DEFAULT_EVALUATION_SEARCH.providers.brave.dailyQuotaLimit ??
          0,
      },
      serper: {
        ...SR_DEFAULT_EVALUATION_SEARCH.providers.serper,
        ...cfg.providers.serper,
        dailyQuotaLimit:
          cfg.providers.serper.dailyQuotaLimit ??
          SR_DEFAULT_EVALUATION_SEARCH.providers.serper.dailyQuotaLimit ??
          0,
      },
    },
    cache: { enabled: true, ttlDays: 7 },
  };
}

// Configurable model selection (from UCM)
let SR_OPENAI_MODEL = DEFAULT_SR_CONFIG.openaiModel;
let RATE_LIMIT_PER_IP = DEFAULT_SR_CONFIG.rateLimitPerIp ?? 10;
let DOMAIN_COOLDOWN_SEC = DEFAULT_SR_CONFIG.domainCooldownSec ?? 60;
let SR_SEARCH_CONFIG: SearchConfig = buildSrSearchConfigFromEvalSearch(
  SR_DEFAULT_EVALUATION_SEARCH,
);
let SR_EVAL_USE_SEARCH = DEFAULT_SR_CONFIG.evalUseSearch ?? true;
let SR_EVAL_MAX_RESULTS_PER_QUERY = SR_DEFAULT_EVALUATION_SEARCH.maxResultsPerQuery;
let SR_EVAL_MAX_EVIDENCE_ITEMS = SR_DEFAULT_EVALUATION_SEARCH.maxEvidenceItems;
let SR_EVAL_DATE_RESTRICT: "y" | "m" | "w" | null = SR_DEFAULT_EVALUATION_SEARCH.dateRestrict;

const DEFAULT_EVIDENCE_QUALITY_ASSESSMENT_CONFIG: EvidenceQualityAssessmentConfig = {
  enabled: SR_DEFAULT_EQA_CONFIG.enabled,
  model: SR_DEFAULT_EQA_CONFIG.model,
  timeoutMs: SR_DEFAULT_EQA_CONFIG.timeoutMs,
  maxItemsPerAssessment: SR_DEFAULT_EQA_CONFIG.maxItemsPerAssessment,
  minRemainingBudgetMs: SR_DEFAULT_EQA_CONFIG.minRemainingBudgetMs,
};

debugLog(`[SR-Eval] Configuration check`, {
  anthropicKey: hasAnthropicKey ? "configured" : "MISSING",
  openaiKey: hasOpenAIKey ? "configured" : "MISSING",
  multiModelAvailable: hasAnthropicKey && hasOpenAIKey,
});

const SR_TRANSLATION_TIMEOUT_MS = 30_000;
const SR_REFINEMENT_TIMEOUT_MS = 90_000;
const SR_PRIMARY_EVALUATION_TIMEOUT_MS = 90_000;

async function withTimeout<T>(
  operationName: string,
  timeoutMs: number,
  operation: () => Promise<T>,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${operationName} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const RequestSchema = z.object({
  domain: z.string().min(1),
  multiModel: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).default(DEFAULT_CONFIDENCE_THRESHOLD),
  consensusThreshold: z.number().min(0).max(1).default(DEFAULT_CONSENSUS_THRESHOLD),
  budgetMs: z.number().int().min(10000).max(300000).optional(),
});

const FactualRatingSchema = z
  .enum([
    "highly_reliable", // 0.86-1.00
    "reliable", // 0.72-0.85
    "leaning_reliable", // 0.58-0.71 (formerly generally_reliable)
    "mixed", // 0.43-0.57
    "leaning_unreliable", // 0.29-0.42 (formerly generally_unreliable)
    "unreliable", // 0.15-0.28
    "highly_unreliable", // 0.00-0.14
    "insufficient_data", // null score - Unknown source, no assessments exist
    // Legacy aliases (accept but normalize)
    "generally_reliable",
    "generally_unreliable",
  ])
  .transform((v) => {
    if (v === "generally_reliable") return "leaning_reliable";
    if (v === "generally_unreliable") return "leaning_unreliable";
    return v;
  });

const EvaluationResultSchema = z.object({
  domain: z.string().optional(),
  evaluationDate: z.string().optional(),
  sourceType: z.string().min(1).default("unknown"),
  identifiedEntity: z.string().nullable().optional(), // The organization evaluated, or null if unknown
  evidenceQuality: z.object({
    independentAssessmentsCount: z.coerce.number().min(0).max(10).optional(),
    recencyWindowUsed: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  score: z.number().min(0).max(1).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  factualRating: FactualRatingSchema,
  biasIndicator: z.string().optional(),
  bias: z
    .object({
      politicalBias: z.string(),
      otherBias: z.string().nullable().optional(),
    })
    .optional(),
  evidenceCited: z.array(z.object({
    claim: z.string(),
    basis: z.string(),
    recency: z.string().optional(),
    evidenceId: z.string().optional(),
    url: z.string().optional(),
  })).optional(),
  caveats: z.array(z.string()).optional(),
});

type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

interface EvidenceItem {
  claim: string;
  basis: string;
  recency?: string;
}

interface ResponsePayload {
  score: number | null;
  confidence: number;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
  reasoning: string;
  category: string;
  sourceType?: string; // LLM-classified source type (e.g., propaganda_outlet, state_controlled_media)
  identifiedEntity?: string | null; // The organization evaluated, or null if unknown
  evidencePack?: {
    providersUsed: string[];
    queries: string[];
    items: EvidencePackItem[];
    qualityAssessment?: EvidenceQualityAssessmentMeta;
  };
  biasIndicator: string | null | undefined;
  bias?: {
    politicalBias: string;
    otherBias?: string | null;
  };
  evidenceCited?: EvidenceItem[];
  caveats?: string[];
  /** When consensus fails but primary (Claude) has higher confidence, we use its result */
  fallbackUsed?: boolean;
  fallbackReason?: string;
  /** Sequential refinement: Whether the second LLM adjusted the score */
  refinementApplied?: boolean;
  /** Sequential refinement: Notes from the cross-check process */
  refinementNotes?: string;
  /** Sequential refinement: Original score before refinement */
  originalScore?: number | null;
}

// ============================================================================
// RATE LIMITING (In-Memory)
// ============================================================================

interface RateLimitState {
  ipRequests: Map<string, { count: number; resetAt: number }>;
  domainLastEval: Map<string, number>;
}

const rateLimitState: RateLimitState = {
  ipRequests: new Map(),
  domainLastEval: new Map(),
};

const RATE_LIMIT_WINDOW_SEC = 60;

function checkRateLimit(ip: string, domain: string): { allowed: boolean; reason?: string } {
  const now = Date.now();

  const ipState = rateLimitState.ipRequests.get(ip);
  if (ipState) {
    if (now < ipState.resetAt) {
      if (ipState.count >= RATE_LIMIT_PER_IP) {
        return { allowed: false, reason: `IP rate limit exceeded (${RATE_LIMIT_PER_IP}/min)` };
      }
      ipState.count++;
    } else {
      rateLimitState.ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 });
    }
  } else {
    rateLimitState.ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 });
  }

  const lastEval = rateLimitState.domainLastEval.get(domain);
  if (lastEval && now - lastEval < DOMAIN_COOLDOWN_SEC * 1000) {
    return { allowed: false, reason: `Domain cooldown (${DOMAIN_COOLDOWN_SEC}s)` };
  }
  rateLimitState.domainLastEval.set(domain, now);

  return { allowed: true };
}

// ============================================================================
// BRAND VARIANT GENERATION (for improved relevance matching)
// ============================================================================

type EvidencePackItem = EvidencePackItemForQuality & {
  probativeValue?: EvidenceProbativeValue;
  evidenceCategory?: EvidenceCategory;
  enrichmentVersion?: 1;
};

type EvidencePack = {
  enabled: boolean;
  providersUsed: string[];
  queries: string[];
  items: EvidencePackItem[];
  qualityAssessment?: EvidenceQualityAssessmentMeta;
};

/**
 * Generate brand variants for more flexible relevance matching.
 * Handles hyphen/space/concatenation variants and common suffixes.
 *
 * Examples:
 * - "my-brand" → ["my-brand", "my brand", "mybrand"]
 * - "dailynews" → ["dailynews", "daily news", "daily"]
 * - "medianet" → ["medianet", "media"]
 */
function generateBrandVariants(brand: string): string[] {
  const variants = new Set<string>();
  const b = (brand ?? "").toLowerCase().trim();
  if (!b || b.length < 3) return [];

  variants.add(b);

  // Hyphen variants: split on hyphens
  if (b.includes("-")) {
    const parts = b.split("-").filter(Boolean);
    if (parts.length >= 2) {
      variants.add(parts.join(" ")); // "anti spiegel"
      variants.add(parts.join("")); // "antispiegel"
      // Add individual parts if long enough
      for (const p of parts) {
        if (p.length >= 4) variants.add(p);
      }
    }
  }

  // CamelCase-like detection: split before uppercase letters or at transitions
  // e.g., "DailyNews" → "Daily News" → "daily news"
  const camelSplit = b.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  if (camelSplit !== b && camelSplit.includes(" ")) {
    variants.add(camelSplit);
    variants.add(camelSplit.replace(/\s+/g, ""));
  }

  // Common suffix stripping: *news, *net, *media, *times, *post
  const suffixes = ["news", "net", "media", "times", "post", "daily", "tribune", "herald"];
  for (const suffix of suffixes) {
    if (b.endsWith(suffix) && b.length > suffix.length + 2) {
      const base = b.slice(0, -suffix.length);
      if (base.length >= 3) {
        variants.add(base);
        variants.add(`${base} ${suffix}`);
      }
    }
  }

  // Filter out too-short or stopword-like variants
  const stopwords = new Set(["the", "and", "for", "www", "com", "org", "net"]);
  return [...variants].filter((v) => v.length >= 3 && !stopwords.has(v));
}

function deriveBrandToken(domain: string): string {
  const labels = String(domain || "")
    .toLowerCase()
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  if (labels.length === 0) return "";

  // Special case: known media abbreviations or short brands
  // e.g., srf.ch -> srf, bbc.co.uk -> bbc
  if (labels.length >= 2) {
    const first = labels[0];
    if (first.length >= 2 && first.length <= 4) {
      // Likely an abbreviation like SRF, BBC, NZZ, CNN
      return first;
    }
  }

  if (labels.length === 1) return labels[0];

  const registryLike = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);

  for (let i = labels.length - 2; i >= 0; i--) {
    const candidate = labels[i];
    if (registryLike.has(candidate)) continue;
    if (candidate === "www") continue;
    return candidate;
  }

  return labels[0];
}

function isUsableBrandToken(token: string): boolean {
  const t = (token ?? "").trim().toLowerCase();
  if (t.length < 2) return false; // Allow 2-char tokens for brands like AP
  if (t === "www") return false;
  return true;
}

/**
 * Check if a search result is FROM the source being evaluated.
 * Results FROM the source are not useful for reliability assessment.
 */
function isResultFromSourceDomain(r: WebSearchResult, domain: string): boolean {
  if (!r.url || !domain) return false;

  try {
    const resultHost = new URL(r.url).hostname.toLowerCase().replace(/^www\./, "");
    const d = domain.toLowerCase().replace(/^www\./, "");
    // Result is FROM the source if the URL is on the source's domain
    return resultHost === d || resultHost.endsWith(`.${d}`);
  } catch {
    return false;
  }
}

// Import fact-checker domains from centralized service
import { getAllFactCheckerDomains, getGlobalFactCheckerSites } from "@/lib/fact-checker-service";

/**
 * All fact-checker domains (global + regional) from config.
 * Used to auto-accept search results from known fact-checker sites.
 */
const FACT_CHECKER_DOMAINS = getAllFactCheckerDomains();

// REMOVED: RELIABILITY_ASSESSMENT_TERMS_EN and getReliabilityAssessmentTerms()
// Relevance filtering is now handled by the LLM evidence quality assessment call
// (see evidence-quality-assessment.ts `relevant` field). Only structural pre-filters
// remain: self-domain exclusion, source-mention check, dedup.

/**
 * Structural pre-filter: does a search result mention the source being evaluated?
 * Does NOT interpret text meaning — only checks for domain/brand name presence.
 * Relevance assessment (is this result ABOUT reliability?) is delegated to the
 * LLM evidence quality assessment call.
 */
function resultMentionsSource(
  r: WebSearchResult,
  domain: string,
  brandVariants: string[],
): boolean {
  const url = (r.url ?? "").toLowerCase();
  const title = (r.title ?? "").toLowerCase();
  const snippet = (r.snippet ?? "").toLowerCase();
  const blob = `${title} ${snippet} ${url}`;
  const blobNoSpaces = blob.replace(/\s+/g, "");
  const brandVariantsNoSpaces = brandVariants.map((v) => v.replace(/\s+/g, ""));

  const d = String(domain || "").toLowerCase();
  if (!d) return true;

  return blob.includes(d) ||
    blob.includes(`www.${d}`) ||
    brandVariants.some(v => v.length >= 3 && blob.includes(v)) ||
    brandVariantsNoSpaces.some(v => v.length >= 5 && blobNoSpaces.includes(v));
}

function isSearchEnabledForSrEval(): { enabled: boolean; providersUsed: string[] } {
  const searchEnabled = SR_SEARCH_CONFIG.enabled;
  if (!SR_EVAL_USE_SEARCH || !searchEnabled) return { enabled: false, providersUsed: [] };

  const providersUsed = getActiveSearchProviders(SR_SEARCH_CONFIG);
  const hasProvider = providersUsed.some((p) => p && p !== "None" && p !== "Unknown");
  return { enabled: hasProvider, providersUsed };
}

// ============================================================================
// MULTI-LANGUAGE SUPPORT
// ============================================================================

/**
 * Cache for detected languages per domain.
 */
const languageDetectionCache = new Map<string, string | null>();

/**
 * Supported languages for fact-checker searches.
 */
const SUPPORTED_LANGUAGES = new Set([
  "German", "French", "Spanish", "Portuguese", "Italian", "Dutch",
  "Polish", "Russian", "Swedish", "Norwegian", "Danish", "Finnish",
  "Czech", "Hungarian", "Turkish", "Japanese", "Chinese", "Korean", "Arabic"
]);

/**
 * Normalize language names from various formats to our standard names.
 */
function normalizeLanguageName(lang: string): string | null {
  const normalized = lang.toLowerCase().trim();

  const mapping: Record<string, string> = {
    // ISO codes
    "de": "German", "deu": "German", "ger": "German",
    "fr": "French", "fra": "French", "fre": "French",
    "es": "Spanish", "spa": "Spanish",
    "pt": "Portuguese", "por": "Portuguese",
    "it": "Italian", "ita": "Italian",
    "nl": "Dutch", "nld": "Dutch", "dut": "Dutch",
    "pl": "Polish", "pol": "Polish",
    "ru": "Russian", "rus": "Russian",
    "sv": "Swedish", "swe": "Swedish",
    "no": "Norwegian", "nor": "Norwegian", "nb": "Norwegian", "nn": "Norwegian",
    "da": "Danish", "dan": "Danish",
    "fi": "Finnish", "fin": "Finnish",
    "cs": "Czech", "ces": "Czech", "cze": "Czech",
    "hu": "Hungarian", "hun": "Hungarian",
    "tr": "Turkish", "tur": "Turkish",
    "ja": "Japanese", "jpn": "Japanese",
    "zh": "Chinese", "zho": "Chinese", "chi": "Chinese",
    "ko": "Korean", "kor": "Korean",
    "ar": "Arabic", "ara": "Arabic",
    "en": "English", "eng": "English",
    // Full names (lowercase)
    "german": "German", "deutsch": "German",
    "french": "French", "français": "French", "francais": "French",
    "spanish": "Spanish", "español": "Spanish", "espanol": "Spanish",
    "portuguese": "Portuguese", "português": "Portuguese", "portugues": "Portuguese",
    "italian": "Italian", "italiano": "Italian",
    "dutch": "Dutch", "nederlands": "Dutch",
    "polish": "Polish", "polski": "Polish",
    "russian": "Russian", "русский": "Russian",
    "swedish": "Swedish", "svenska": "Swedish",
    "norwegian": "Norwegian", "norsk": "Norwegian",
    "danish": "Danish", "dansk": "Danish",
    "finnish": "Finnish", "suomi": "Finnish",
    "czech": "Czech", "čeština": "Czech", "cestina": "Czech",
    "hungarian": "Hungarian", "magyar": "Hungarian",
    "turkish": "Turkish", "türkçe": "Turkish", "turkce": "Turkish",
    "japanese": "Japanese", "日本語": "Japanese",
    "chinese": "Chinese", "中文": "Chinese",
    "korean": "Korean", "한국어": "Korean",
    "arabic": "Arabic", "العربية": "Arabic",
    "english": "English",
  };

  return mapping[normalized] || null;
}

/**
 * Detect the publication language of a source by fetching its homepage.
 * This is the PRIMARY language detection method for source reliability evaluation.
 *
 * Strategy (in order):
 * 1. <html lang="..."> attribute
 * 2. <meta http-equiv="content-language"> tag
 * 3. og:locale meta tag
 * 4. LLM-based text analysis (fallback)
 *
 * NOTE: This detects actual site content language, NOT country-based inference.
 * Returns null for English or if detection fails.
 */
async function detectSourceLanguage(domain: string): Promise<string | null> {
  // Check cache first
  if (languageDetectionCache.has(domain)) {
    return languageDetectionCache.get(domain) ?? null;
  }

  debugLog(`[SR-Eval] Detecting language for ${domain}`, { domain });

  try {
    // Fetch homepage with timeout (increased from 5s to 10s for slower international sites)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`https://${domain}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FactHarbor/1.0; +https://factharbor.com)",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      debugLog(`[SR-Eval] Failed to fetch ${domain}: ${response.status}`, { domain, status: response.status });
      languageDetectionCache.set(domain, null);
      languageDetectionStatus.set(domain, "failed");
      return null;
    }

    const html = await response.text();

    // Check for redirect pages (common pattern: .com redirects to .com.br for Brazilian sites)
    const isRedirectPage = /<title[^>]*>Redirecting/i.test(html) ||
      (html.length < 2000 && /<script/i.test(html) && !/<article|<main|<p[^>]*>/i.test(html));

    if (isRedirectPage && domain.endsWith('.com') && !domain.includes('.com.')) {
      // Try alternate TLDs for common patterns
      const alternateDomains = [
        domain + '.br',  // .com → .com.br (Brazil)
        domain.replace(/\.com$/, '.com.ar'),  // Argentina
        domain.replace(/\.com$/, '.com.mx'),  // Mexico
      ];

      for (const altDomain of alternateDomains) {
        debugLog(`[SR-Eval] Redirect page detected, trying alternate TLD: ${altDomain}`, { domain, altDomain });
        try {
          const altController = new AbortController();
          const altTimeout = setTimeout(() => altController.abort(), 8000);
          const altResponse = await fetch(`https://${altDomain}`, {
            signal: altController.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; FactHarbor/1.0; +https://factharbor.com)",
              "Accept": "text/html",
              "Accept-Language": "en-US,en;q=0.9",
            },
          });
          clearTimeout(altTimeout);

          if (altResponse.ok) {
            const altHtml = await altResponse.text();
            // Check if alternate site has actual content (not another redirect)
            if (altHtml.length > 5000 || /<article|<main/i.test(altHtml)) {
              const altLangMatch = altHtml.match(/<html[^>]*?\s+lang=["']([^"']+)["']/i);
              if (altLangMatch) {
                const altLangCode = altLangMatch[1].split("-")[0];
                const altNormalized = normalizeLanguageName(altLangCode);
                if (altNormalized && altNormalized !== "English" && SUPPORTED_LANGUAGES.has(altNormalized)) {
                  debugLog(`[SR-Eval] Detected language via alternate TLD ${altDomain}: ${altNormalized}`, { domain, altDomain, altNormalized });
                  languageDetectionCache.set(domain, altNormalized);
                  languageDetectionStatus.set(domain, "ok");
                  return altNormalized;
                }
              }
            }
          }
        } catch {
          // Continue to next alternate
        }
      }
    }

    // Strategy 1: Check <html lang="..."> attribute
    // Use non-greedy match and allow optional whitespace before lang=
    const htmlLangMatch = html.match(/<html[^>]*?\s+lang=["']([^"']+)["']/i)
      || html.match(/<html\s+lang=["']([^"']+)["']/i);
    if (htmlLangMatch) {
      const langCode = htmlLangMatch[1].split("-")[0]; // "de-DE" -> "de"
      const normalized = normalizeLanguageName(langCode);
      if (normalized && normalized !== "English" && SUPPORTED_LANGUAGES.has(normalized)) {
        debugLog(`[SR-Eval] Detected language via html lang: ${normalized}`, { domain, langCode, normalized });
        languageDetectionCache.set(domain, normalized);
        languageDetectionStatus.set(domain, "ok");
        return normalized;
      }
    }

    // Strategy 2: Check <meta> content-language
    const metaLangMatch = html.match(/<meta[^>]*http-equiv=["']content-language["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*http-equiv=["']content-language["']/i);
    if (metaLangMatch) {
      const langCode = metaLangMatch[1].split("-")[0];
      const normalized = normalizeLanguageName(langCode);
      if (normalized && normalized !== "English" && SUPPORTED_LANGUAGES.has(normalized)) {
        debugLog(`[SR-Eval] Detected language via meta tag: ${normalized}`, { domain, langCode, normalized });
        languageDetectionCache.set(domain, normalized);
        languageDetectionStatus.set(domain, "ok");
        return normalized;
      }
    }

    // Strategy 3: Check og:locale meta tag (try both attribute orders)
    const ogLocaleMatch = html.match(/<meta[^>]*property=["']og:locale["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:locale["']/i);
    if (ogLocaleMatch) {
      const langCode = ogLocaleMatch[1].split("_")[0]; // "de_DE" -> "de"
      const normalized = normalizeLanguageName(langCode);
      if (normalized && normalized !== "English" && SUPPORTED_LANGUAGES.has(normalized)) {
        debugLog(`[SR-Eval] Detected language via og:locale: ${normalized}`, { domain, langCode, normalized });
        languageDetectionCache.set(domain, normalized);
        languageDetectionStatus.set(domain, "ok");
        return normalized;
      }
    }

    // Strategy 4: Use LLM to detect from content sample
    // Extract visible text (strip tags, take first ~500 chars)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1000);

    if (textContent.length > 100) {
      const { text } = await withTimeout(
        "SR language detection",
        SR_TRANSLATION_TIMEOUT_MS,
        () =>
          generateText({
            model: anthropic(ANTHROPIC_MODELS.budget.modelId),
            prompt: `What is the primary publication language of this webpage content?
Return ONLY the language name in English (e.g., "German", "French", "Russian", "English").
If uncertain, return "English".

Content sample:
${textContent}`,
            temperature: 0,
            maxOutputTokens: 50,
          }),
      );

      const detectedLang = text.trim();
      const normalized = normalizeLanguageName(detectedLang);

      if (normalized && normalized !== "English" && SUPPORTED_LANGUAGES.has(normalized)) {
        debugLog(`[SR-Eval] Detected language via LLM: ${normalized}`, { domain, detectedLang, normalized });
        languageDetectionCache.set(domain, normalized);
        languageDetectionStatus.set(domain, "ok");
        return normalized;
      }
    }

    // Default: English or unknown
    debugLog(`[SR-Eval] No non-English language detected for ${domain}`, { domain });
    languageDetectionCache.set(domain, null);
    languageDetectionStatus.set(domain, "ok");
    return null;

  } catch (err) {
    const errorMessage = String(err);
    const isTimeout = (err as { name?: string })?.name === "AbortError";
    debugLog(`[SR-Eval] Language detection failed for ${domain}`, { domain, error: errorMessage });
    languageDetectionCache.set(domain, null);
    languageDetectionStatus.set(domain, isTimeout ? "timeout" : "failed");
    return null;
  }
}

/**
 * Translation cache to avoid repeated LLM calls for the same language.
 */
const translationCache = new Map<string, Record<string, string>>();

/**
 * Key search terms that need translation for fact-checker searches.
 */
const SEARCH_TERMS_TO_TRANSLATE = [
  // Core fact-checking terms
  "fact check",
  "reliability",
  "misinformation",
  "disinformation",
  "propaganda",
  "fake news",
  "debunked",
  "false claims",
  "media bias",
  "credibility",
  // State/foreign influence
  "state propaganda",
  "foreign propaganda",
  "state media",
  "state-backed",
  "government propaganda",
    "government-backed",
    "state-sponsored",
    "influence operation",
    "information operation",
    "influence campaign",
    "coordinated inauthentic behavior",
    "conspiracy",
    "conspiracy theory",
    "hoax",
    "falsehood",
    "deceptive",
    "manipulation",
    "propaganda network",
    "disinformation network",
    "fringe",
    "extremist",
    "radical",
    "hate",
    "hate speech",
  // Bias/slant terms (symmetric - no political direction preference)
  "partisan",
  "left-wing",
  "far-left",
  "right-wing",
  "far-right",
  "controversial",
  "criticism",
  "unreliable",
  // Quality terms
  "journalistic standards",
  "inaccurate",
  "sensationalist",
  // Organization identity / accountability terms
  "news outlet",
  "news organization",
  "media outlet",
  "media company",
  "newspaper",
  "publisher",
  "ownership",
  "owner",
  "editor-in-chief",
  "editorial board",
  "editorial policy",
  "press council",
  "ombudsman",
  "code of ethics",
  "corrections policy",
  // Press council / ethics violation terms
  "ethics violation",
  "reprimand",
  "sanction",
  "condemned",
  "censured",
  "discrimination",
  "retraction",
  // Science/expert consensus terms
  "anti-science",
  "science denial",
  "denialism",
  // Institutional independence terms
  "independence",
  "politicization",
  "political pressure",
  "scientific integrity",
];

/**
 * Get translated search terms for a language, using LLM with caching.
 */
async function getTranslatedSearchTerms(
  language: string
): Promise<Record<string, string>> {
  // Check cache first
  const cached = translationCache.get(language);
  if (cached) return cached;

  debugLog(`[SR-Eval] Translating search terms to ${language}`, { language });

  try {
    const prompt = `Translate these English fact-checking search terms to ${language}.
Return ONLY a JSON object with English keys and ${language} translations as values.
Use the most common/natural terms that fact-checkers and media critics would use in ${language}.

Terms to translate:
${SEARCH_TERMS_TO_TRANSLATE.map((t) => `- "${t}"`).join("\n")}

Output format (JSON only, no markdown):
{"fact check": "...", "reliability": "...", ...}`;

    const { text } = await withTimeout(
      "SR translation",
      SR_TRANSLATION_TIMEOUT_MS,
      () =>
        generateText({
          model: anthropic(ANTHROPIC_MODELS.budget.modelId),
          prompt,
          temperature: 0,
          maxOutputTokens: 800,
        }),
    );

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[SR-Eval] Failed to parse translation response for ${language}`);
      return {};
    }

    const translations = JSON.parse(jsonMatch[0]) as Record<string, string>;

    // Cache the result
    translationCache.set(language, translations);

    debugLog(`[SR-Eval] Translated ${Object.keys(translations).length} terms to ${language}`, {
      language,
      translations,
    });

    return translations;
  } catch (err) {
    console.warn(`[SR-Eval] Translation failed for ${language}:`, err);
    return {};
  }
}

// Regional fact-checker queries - delegated to FactChecker Service
import { getRegionalFactCheckerQueries } from "@/lib/fact-checker-service";

// ============================================================================
// ADAPTIVE EVIDENCE PACK BUILDING
// ============================================================================

/**
 * Build evidence pack with adaptive negative-signal queries.
 *
 * Strategy:
 * 1. Run initial queries (reliability, bias, standards)
 * 2. If results are sparse or lack strong signals, add negative-signal queries
 * 3. No domain/TLD hardcoding - applies equally to all domains
 */
async function buildEvidencePack(domain: string): Promise<EvidencePack> {
  const { enabled, providersUsed } = isSearchEnabledForSrEval();
  if (!enabled) return { enabled: false, providersUsed, queries: [], items: [] };

  const brand = deriveBrandToken(domain);
  const brandVariants = generateBrandVariants(brand);
  const brandPrefix = isUsableBrandToken(brand) ? `${brand} ` : "";
  const domainToken = `"${domain}"`;

  // Detect source language for multi-language queries
  const sourceLanguage = await detectSourceLanguage(domain);
  let translatedTerms: Record<string, string> = {};

  if (sourceLanguage) {
    debugLog(`[SR-Eval] Detected language for ${domain}: ${sourceLanguage}`, { domain, sourceLanguage });
    translatedTerms = await getTranslatedSearchTerms(sourceLanguage);
  }

  // Helper to get translated term or fallback to English
  const t = (term: string): string => translatedTerms[term] || term;

  // Phase 1: Reliability assessment queries - focused on ABOUT the source
  // Use "rating" and "assessment" to find fact-checker evaluations, not articles FROM the source
  const standardQueries = [
    `${domainToken} reliability rating assessment`,
    `${domainToken} media bias rating fact checker`,
    `"${brand}" credibility assessment fact check`,
  ];

  // Phase 1b: Standard queries in source language (if non-English)
  const standardQueriesTranslated: string[] = sourceLanguage && Object.keys(translatedTerms).length > 0
    ? [
        `${domainToken} ${t("reliability")} ${t("credibility")}`,
        `"${brand}" ${t("fact check")} ${t("media bias")}`,
      ]
    : [];

  // Phase 1c: Neutral/identity queries (to help entity detection)
  const neutralSignalQueries = isUsableBrandToken(brand) ? [
    `"${brand}" ${t("editorial standards")} OR ${t("corrections policy")}`,
    `"${brand}" ${t("editorial policy")} OR ${t("code of ethics")}`,
    `"${brand}" ${t("owner")} OR ${t("ownership")} OR ${t("publisher")}`,
    `"${brand}" ${t("news outlet")} OR ${t("news organization")} OR ${t("media company")}`,
    `"${brand}" ${t("newspaper")} OR ${t("media outlet")}`,
  ] : [];

  // Phase 2: Fact-checker site-specific queries
  // Directly search known fact-checker domains for assessments
  // Uses global fact-checker sites from config
  const globalSites = getGlobalFactCheckerSites();
  const factCheckerQueries: string[] = [];

  // Build queries in batches of 3 sites (to avoid overly long queries)
  for (let i = 0; i < globalSites.length; i += 3) {
    const batch = globalSites.slice(i, i + 3);
    const siteQuery = batch.map(s => `site:${s}`).join(" OR ");
    factCheckerQueries.push(`"${brand}" ${siteQuery}`);
  }

  // Phase 2b: Regional fact-checker queries (language-specific)
  // Comprehensive coverage for all supported languages
  const regionalFactCheckerQueries: string[] = getRegionalFactCheckerQueries(brand, sourceLanguage);

  // Phase 3: Press council / regulatory complaints queries
  // Critical for finding documented ethical/journalistic failures from official bodies
  const pressCouncilQueries = [
    `"${brand}" press council OR press complaints OR media regulator`,
    `"${brand}" ethics violation OR code violation OR journalistic standards`,
    `"${brand}" reprimand OR sanction OR condemned OR censured`,
    `"${brand}" discrimination complaint OR ethics complaint`,
    `"${brand}" retraction OR correction demanded`,
  ];

  // Phase 3b: Press council queries in source language
  const pressCouncilQueriesTranslated: string[] = sourceLanguage && Object.keys(translatedTerms).length > 0
    ? [
        `"${brand}" ${t("press council")} OR ${t("ethics violation")}`,
        `"${brand}" ${t("reprimand")} OR ${t("sanction")} OR ${t("condemned")}`,
        `"${brand}" ${t("discrimination")} OR ${t("retraction")}`,
      ]
    : [];

  // Phase 4: Merged negative signals — English
  // Combines state/foreign propaganda tracking + negative-signal queries.
  // Duplicates across the former Phase 4 and Phase 5 have been removed;
  // every query below is unique. Generic terms only per AGENTS.md.
  const negativeSignalQueries = [
    // State/foreign propaganda tracking
    `"${brand}" state propaganda OR foreign propaganda OR government propaganda`,
    `"${brand}" site:euvsdisinfo.eu OR site:disinfo.eu`,
    `"${brand}" "disinformation" "state media" OR "state-backed"`,
    `"${brand}" "propaganda outlet" OR "government-controlled media"`,
    `"${brand}" "state narrative" OR "government narrative"`,
    `"${brand}" "echo chamber" OR "amplifies" OR "amplifying"`,
    // Influence operations & coordinated inauthenticity (merged — was in both phases)
    `"${brand}" "influence operation" OR "information operation" OR "influence campaign"`,
    `"${brand}" "coordinated inauthentic behavior" OR "state-sponsored" OR astroturf`,
    // Conspiracy / disinformation networks / fringe (merged — was in both phases)
    `"${brand}" conspiracy OR "conspiracy theory" OR hoax`,
    `"${brand}" "disinformation network" OR "propaganda network"`,
    `"${brand}" fringe OR extremist OR radical OR "hate speech"`,
    // General negative signals
    `${domainToken} propaganda accusations disinformation`,
    `"${brand}" false claims debunked misinformation`,
    `"${brand}" fact check failed OR misleading`,
    `"${brand}" bias criticism controversial`,
    `"${brand}" partisan left-wing OR far-left OR right-wing OR far-right`,
    `"${brand}" unreliable OR inaccurate OR sensationalist`,
    // Wikipedia often has documented controversies
    `"${brand}" site:wikipedia.org controversy OR criticism`,
  ];

  // Phase 4b: Science/expert consensus denial queries (separate — distinct topic)
  const scienceDenialQueries = [
    `"${brand}" anti-science OR science denial OR pseudo-science`,
    `"${brand}" denialism OR rejects scientific consensus`,
    `"${brand}" promotes debunked claims OR spreads misinformation`,
  ];

  // Phase 4c: Merged negative signals in source language (if non-English)
  // Combines former state-propaganda translated + negative-signal translated.
  // Duplicates removed; every query is unique.
  const negativeSignalQueriesTranslated: string[] = sourceLanguage && Object.keys(translatedTerms).length > 0
    ? [
        // State/foreign propaganda (unique to former Phase 4c)
        `"${brand}" ${t("state propaganda")} OR ${t("foreign propaganda")}`,
        `"${brand}" ${t("state media")} ${t("disinformation")}`,
        `"${brand}" ${t("state-backed")} OR ${t("government propaganda")}`,
        // Influence operations & coordinated inauthenticity (merged — was in both)
        `"${brand}" ${t("influence operation")} OR ${t("information operation")} OR ${t("influence campaign")}`,
        `"${brand}" ${t("coordinated inauthentic behavior")} OR ${t("state-sponsored")}`,
        // Conspiracy / disinformation networks / fringe (merged — was in both)
        `"${brand}" ${t("conspiracy")} OR ${t("conspiracy theory")} OR ${t("hoax")}`,
        `"${brand}" ${t("disinformation network")} OR ${t("propaganda network")}`,
        `"${brand}" ${t("fringe")} OR ${t("extremist")} OR ${t("radical")}`,
        // General negative signals (unique to former Phase 5b)
        `${domainToken} ${t("propaganda")} ${t("disinformation")}`,
        `"${brand}" ${t("fake news")} ${t("debunked")} ${t("false claims")}`,
        `"${brand}" ${t("partisan")} ${t("controversial")}`,
        `"${brand}" ${t("criticism")} ${t("unreliable")}`,
      ]
    : [];

  // Institutional independence queries (HIGH PRIORITY - run early)
  // Critical for detecting recent politicization or compromised independence
  // Especially important for government/official sources
  const institutionalIndependenceQueries = [
    `"${brand}" independence politicization political pressure`,
    `"${brand}" scientific integrity compromised OR undermined`,
    `"${brand}" political interference OR political influence`,
    `"${brand}" staff exodus OR workforce cuts OR mass resignation`,
    `"${brand}" credibility crisis OR trust crisis`,
    `"${brand}" leadership change controversy OR new leadership concerns`,
  ];

  // Institutional independence queries (translated)
  const institutionalIndependenceQueriesTranslated: string[] = sourceLanguage && Object.keys(translatedTerms).length > 0
    ? [
        `"${brand}" ${t("independence")} ${t("politicization")}`,
        `"${brand}" ${t("political pressure")} ${t("scientific integrity")}`,
      ]
    : [];

  // Entity-focused queries (Organization/Brand only) - lower priority
  const entityQueries = isUsableBrandToken(brand) ? [
    `"${brand}" news outlet reliability assessment`,
    `"${brand}" media organization bias rating`,
    `"${brand}" ownership publisher editor-in-chief`,
  ] : [];

  const maxResultsPerQuery = Math.max(
    1,
    Math.min(SR_EVAL_MAX_RESULTS_PER_QUERY, 10)
  );
  const maxEvidenceItems = Math.max(
    1,
    Math.min(SR_EVAL_MAX_EVIDENCE_ITEMS, 40)
  );
  const dateRestrict =
    (SR_EVAL_DATE_RESTRICT ?? SR_SEARCH_CONFIG.dateRestrict) ?? undefined;

  const seen = new Set<string>();
  const rawItems: Array<{ r: WebSearchResult; query: string; provider: string }> = [];
  const allQueries: string[] = [];

  // Helper to run a query and collect results.
  // Structural pre-filters only: self-domain exclusion, source-mention check, dedup.
  // Relevance assessment (is this ABOUT reliability?) is delegated to the LLM
  // evidence quality assessment call downstream.
  async function runQuery(
    q: string,
    maxResultsOverride?: number,
  ): Promise<number> {
    allQueries.push(q);
    let added = 0;
    try {
      const resp = await searchWebWithProvider({
        query: q,
        maxResults: maxResultsOverride ?? maxResultsPerQuery,
        dateRestrict,
        domainWhitelist: SR_SEARCH_CONFIG.domainWhitelist,
        domainBlacklist: SR_SEARCH_CONFIG.domainBlacklist,
        timeoutMs: SR_SEARCH_CONFIG.timeoutMs,
        config: SR_SEARCH_CONFIG,
      });

      const provider = resp.providersUsed.join("+") || "unknown";
      for (const r of resp.results) {
        if (!r.url) continue;
        if (seen.has(r.url)) continue;
        if (isResultFromSourceDomain(r, domain)) continue;
        if (!resultMentionsSource(r, domain, brandVariants)) continue;
        seen.add(r.url);
        rawItems.push({ r, query: q, provider });
        added++;
        if (rawItems.length >= maxEvidenceItems) break;
      }
    } catch (err) {
      console.warn(`[SR-Eval] Search failed for query "${q}":`, err);
    }
    return added;
  }

  // Helper to run a batch of queries sequentially within a phase, respecting budget
  async function runPhase(
    queries: string[],
    budget: number,
    opts?: { maxResultsOverride?: number }
  ): Promise<void> {
    for (const q of queries) {
      if (rawItems.length >= budget) break;
      await runQuery(q, opts?.maxResultsOverride);
    }
  }

  // Phase budgets - preserve priority ordering from original sequential flow
  const phase1Budget = Math.floor(maxEvidenceItems * 0.5); // 50% for fact-checkers
  const phase2Budget = Math.floor(maxEvidenceItems * 0.75); // 75% cumulative
  const widerOpts = { maxResultsOverride: Math.min(maxResultsPerQuery + 2, 10) };

  // ── PHASE 1 (sequential): Fact-checkers FIRST ─────────────────────
  // Highest priority: fact-checker site-specific queries fill budget first.
  // Sequential to ensure fact-checker evidence gets priority slots.
  debugLog(`[SR-Eval] Phase 1: fact-checker queries for ${domain}`, { brand });
  await runPhase([...factCheckerQueries, ...regionalFactCheckerQueries], phase1Budget);

  // ── PHASE 2 (sequential): Standard reliability queries ─────────────
  debugLog(`[SR-Eval] Phase 2: standard reliability queries for ${domain} (${rawItems.length}/${maxEvidenceItems} items)`);
  await runPhase([...standardQueries, ...standardQueriesTranslated], phase2Budget);

  // ── WAVE 3 (parallel): Merged negative signals + deep signals ──────
  // Negative signals now include former propaganda queries (duplicates removed).
  // All run in parallel — independent and fill remaining budget.
  if (rawItems.length < maxEvidenceItems) {
    debugLog(`[SR-Eval] Wave 3: negative signals + deep signal queries for ${domain} (${rawItems.length}/${maxEvidenceItems} items)`);
    await Promise.all([
      // Merged negative signals (English + translated) — covers propaganda + negative signals
      runPhase(
        [...negativeSignalQueries, ...negativeSignalQueriesTranslated],
        maxEvidenceItems,
        widerOpts
      ),
      // Press council + ethics violations
      runPhase([...pressCouncilQueries, ...pressCouncilQueriesTranslated], maxEvidenceItems),
      // Institutional independence (critical for government sources)
      runPhase(
        [...institutionalIndependenceQueries, ...institutionalIndependenceQueriesTranslated],
        maxEvidenceItems,
        widerOpts
      ),
    ]);
  }

  // ── WAVE 4 (parallel, if budget remains): Science denial + Identity + Entity
  if (rawItems.length < maxEvidenceItems) {
    debugLog(`[SR-Eval] Wave 4: science denial + identity + entity for ${domain} (${rawItems.length}/${maxEvidenceItems} items)`);
    await Promise.all([
      // Science denial (separate topic, kept distinct)
      runPhase(scienceDenialQueries, maxEvidenceItems, widerOpts),
      // Neutral/identity queries (entity detection)
      runPhase(neutralSignalQueries, maxEvidenceItems),
      // Entity-focused queries (lowest priority)
      runPhase(entityQueries, maxEvidenceItems),
    ]);
  }

  const items: EvidencePackItem[] = rawItems.slice(0, maxEvidenceItems).map((it, idx) => ({
    id: `E${idx + 1}`,
    url: it.r.url,
    title: it.r.title,
    snippet: it.r.snippet ?? null,
    query: it.query,
    provider: it.provider,
  }));

  return { enabled: true, providersUsed, queries: allQueries, items };
}

const SR_PROMPT_PIPELINE: Pipeline = "source-reliability";
const SR_EQA_PROMPT_TASK_SECTION = "EVIDENCE QUALITY ASSESSMENT TASK";
const SR_EQA_PROMPT_OUTPUT_SECTION = "EVIDENCE QUALITY ASSESSMENT OUTPUT FORMAT";

function getRemainingBudgetMs(requestStartedAtMs: number, requestBudgetMs: number | null): number | null {
  if (requestBudgetMs === null) return null;
  const elapsedMs = Date.now() - requestStartedAtMs;
  return Math.max(0, requestBudgetMs - elapsedMs);
}

function getMinimumCoreEvaluationBudgetMs(multiModel: boolean): number {
  return SR_PRIMARY_EVALUATION_TIMEOUT_MS + (multiModel ? SR_REFINEMENT_TIMEOUT_MS : 0);
}

function normalizeEvidenceQualityAssessmentConfig(
  config: unknown,
): EvidenceQualityAssessmentConfig {
  const c = (config ?? {}) as Partial<EvidenceQualityAssessmentConfig>;
  const fallback = DEFAULT_EVIDENCE_QUALITY_ASSESSMENT_CONFIG;
  return {
    enabled: typeof c.enabled === "boolean" ? c.enabled : fallback.enabled,
    model: typeof c.model === "string" && c.model.trim().length > 0 ? c.model : fallback.model,
    timeoutMs:
      typeof c.timeoutMs === "number" && Number.isFinite(c.timeoutMs)
        ? Math.max(1000, Math.min(30000, Math.floor(c.timeoutMs)))
        : fallback.timeoutMs,
    maxItemsPerAssessment:
      typeof c.maxItemsPerAssessment === "number" && Number.isFinite(c.maxItemsPerAssessment)
        ? Math.max(1, Math.min(40, Math.floor(c.maxItemsPerAssessment)))
        : fallback.maxItemsPerAssessment,
    minRemainingBudgetMs:
      typeof c.minRemainingBudgetMs === "number" && Number.isFinite(c.minRemainingBudgetMs)
        ? Math.max(0, Math.floor(c.minRemainingBudgetMs))
        : fallback.minRemainingBudgetMs,
  };
}

function resolveEvidenceQualityAssessmentModel(modelAliasOrId: string): {
  provider: "anthropic" | "openai";
  modelName: string;
} {
  const normalized = modelAliasOrId.trim().toLowerCase();
  if (normalized === "haiku") {
    return { provider: "anthropic", modelName: ANTHROPIC_MODELS.budget.modelId };
  }
  if (normalized === "sonnet") {
    return { provider: "anthropic", modelName: ANTHROPIC_MODELS.premium.modelId };
  }
  if (normalized.startsWith("gpt-")) {
    return { provider: "openai", modelName: modelAliasOrId.trim() };
  }
  if (normalized.startsWith("claude-")) {
    return { provider: "anthropic", modelName: modelAliasOrId.trim() };
  }
  // Conservative default: cheapest SR model.
  return { provider: "anthropic", modelName: ANTHROPIC_MODELS.budget.modelId };
}

async function renderEvidenceQualityAssessmentPrompt(
): Promise<{ taskTemplate: string; outputTemplate: string } | null> {
  const promptResult = await loadPromptFile(SR_PROMPT_PIPELINE);
  if (!promptResult.success || !promptResult.prompt) {
    console.warn("[SR-Eval][warning] sr_evidence_quality_assessment_failed: prompt load failed");
    return null;
  }

  const taskSection = getSection(promptResult.prompt, SR_EQA_PROMPT_TASK_SECTION);
  const outputSection = getSection(promptResult.prompt, SR_EQA_PROMPT_OUTPUT_SECTION);
  // Reuse SR assessor taxonomy in the same prompt surface (no duplicated hardcoded list in code).
  const assessorSection = getSection(
    promptResult.prompt,
    "RECOGNIZED INDEPENDENT ASSESSORS (any of these count as \"fact-checker\")",
  );
  if (!taskSection || !outputSection || !assessorSection) {
    console.warn(
      "[SR-Eval][warning] sr_evidence_quality_assessment_failed: required SR prompt sections missing",
      {
        hasTaskSection: !!taskSection,
        hasOutputSection: !!outputSection,
        hasAssessorSection: !!assessorSection,
      },
    );
    return null;
  }

  const taskTemplate = [
    taskSection.content,
    `## RECOGNIZED INDEPENDENT ASSESSORS`,
    assessorSection.content,
  ].join("\n\n");

  return {
    taskTemplate,
    outputTemplate: outputSection.content,
  };
}

async function enrichEvidencePackWithQualityAssessment(
  domain: string,
  evidencePack: EvidencePack,
  config: EvidenceQualityAssessmentConfig,
  requestStartedAtMs: number,
  requestBudgetMs: number | null,
): Promise<EvidencePack> {
  if (!evidencePack.enabled) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "skipped",
        skippedReason: "disabled",
      },
    };
  }

  if (!config.enabled) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "skipped",
        skippedReason: "disabled",
      },
    };
  }

  if (evidencePack.items.length === 0) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "skipped",
        skippedReason: "empty_evidence",
      },
    };
  }

  const remainingBudgetMs = getRemainingBudgetMs(requestStartedAtMs, requestBudgetMs);
  if (
    remainingBudgetMs !== null &&
    remainingBudgetMs < Math.max(0, config.minRemainingBudgetMs)
  ) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "skipped",
        model: resolveEvidenceQualityAssessmentModel(config.model).modelName,
        skippedReason: "budget_guard",
      },
    };
  }

  const promptTemplate = await renderEvidenceQualityAssessmentPrompt();
  if (!promptTemplate) {
    return {
      ...evidencePack,
      qualityAssessment: {
        status: "failed",
        model: resolveEvidenceQualityAssessmentModel(config.model).modelName,
        errorType: "unknown",
      },
    };
  }

  const { provider, modelName } = resolveEvidenceQualityAssessmentModel(config.model);
  const assessment = await assessEvidenceQuality({
    domain,
    items: evidencePack.items,
    config,
    modelName,
    remainingBudgetMs,
    promptTemplate: promptTemplate.taskTemplate,
    outputFormatTemplate: promptTemplate.outputTemplate,
    classify: async (prompt, timeoutMs) => {
      const model = provider === "anthropic" ? anthropic(modelName) : openai(modelName);
      const response = await withTimeout(
        "SR evidence quality assessment",
        timeoutMs,
        () =>
          generateText({
            model,
            prompt,
            temperature: getDeterministicTemperature(0.1),
            maxOutputTokens: 3000,
          }),
      );
      return response.text ?? "";
    },
  });

  if (assessment.warningMessage) {
    console.warn("[SR-Eval][warning] sr_evidence_quality_assessment_failed", {
      domain,
      model: modelName,
      errorType: assessment.qualityAssessment.errorType ?? "unknown",
      timeoutMs: assessment.qualityAssessment.timeoutMs,
      latencyMs: assessment.qualityAssessment.latencyMs,
      assessedItemCount: assessment.qualityAssessment.assessedItemCount,
    });
  } else if (assessment.qualityAssessment.status === "applied") {
    debugLog("[SR-Eval] Evidence quality assessment applied", {
      domain,
      model: modelName,
      timeoutMs: assessment.qualityAssessment.timeoutMs,
      latencyMs: assessment.qualityAssessment.latencyMs,
      assessedItemCount: assessment.qualityAssessment.assessedItemCount,
    });
  }

  // Post-LLM relevance filtering: remove items the LLM marked as not about
  // reliability assessment. Fact-checker domain items auto-pass regardless.
  const { filtered: relevanceFiltered, removedCount: filteredCount } = filterByRelevance(
    assessment.items,
    assessment.qualityAssessment.status === "applied",
    FACT_CHECKER_DOMAINS,
  );

  if (filteredCount > 0) {
    debugLog(`[SR-Eval] Relevance filter: ${relevanceFiltered.length}/${assessment.items.length} items passed (${filteredCount} removed)`, { domain });
  }

  return {
    ...evidencePack,
    items: relevanceFiltered,
    qualityAssessment: assessment.qualityAssessment,
  };
}

// ============================================================================
// SHARED PROMPT SECTIONS
// ============================================================================
// These sections are used by both the initial evaluation and refinement prompts
// to ensure consistency in how both LLMs interpret evidence and apply ratings.

/**
 * Rating scale - MUST be identical in both prompts
 */
const SHARED_RATING_SCALE = `
  0.86–1.00 → highly_reliable     (highest standards, fact-checked, proactively corrects)
  0.72–0.85 → reliable            (good standards, accurate, corrects promptly)
  0.58–0.71 → leaning_reliable    (basic standards, mostly accurate, corrects when notified)
  0.43–0.57 → mixed               (mixed standards, mixed accuracy, mixed corrections)
  0.29–0.42 → leaning_unreliable  (lax standards, often inaccurate, slow to correct)
  0.15–0.28 → unreliable          (poor standards, inaccurate, rarely corrects)
  0.00–0.14 → highly_unreliable   (lowest standards, fabricates, resists correction)
  null      → insufficient_data   (cannot evaluate — sparse/no evidence)

  USE THE FULL RANGE of each band — do not default to the midpoint.
  Strong evidence for the band description → score toward the EDGES (closer to adjacent bands).
  Differentiate within bands: 1 failure vs 5 failures matters, even if both land in the same band.

  AVOID CENTER-GRAVITY BIAS: Resist the tendency to regress scores toward 0.50.
  Clearly reliable → 0.72-0.90, not pulled toward 0.60. Clearly unreliable → 0.15-0.35, not pulled toward 0.40.
  Only score near 0.50 when evidence genuinely shows BOTH positive and negative signals equally.`;

/**
 * Evidence quality signals - shared understanding of what counts as positive/negative
 */
const SHARED_EVIDENCE_SIGNALS = `
STRONG POSITIVE SIGNALS (can justify high scores when present):
  - Fact-checker explicitly rates source as "HIGH" or "VERY HIGH" factual reporting
  - Multiple independent Tier 1 assessors give positive ratings
  - No documented fact-checker failures combined with positive assessments
  - Evidence describes "highest standards", "proactively corrects", "gold standard"

  IMPORTANT: When evidence explicitly supports high reliability, the score should MATCH the evidence.
  Do not be artificially conservative when assessors rate a source highly.
  Let the assessor ratings guide your score - if they say "HIGH", score in the reliable/highly_reliable range.

POSITIVE CONTEXTUAL SIGNALS (supporting evidence, not standalone):
  - Source is frequently cited in academic publications as reference material
  - Source is used by professional institutions as information source
  - Community/industry treats the source as respected/authoritative
  - Note: These support reliability assessment but cannot establish verdict alone

NEUTRAL SIGNALS (context only):
  - Government funding with editorial independence
  - Self-published editorial policies or standards pages
  - Awards from industry organizations (without independent verification)`;

/**
 * Bias value definitions - MUST be identical in both prompts
 */
const SHARED_BIAS_VALUES = `
politicalBias: far_left | left | center_left | center | center_right | right | far_right | not_applicable
otherBias: pro_government | anti_government | corporate_interest | sensationalist | ideological_other | none_detected | null`;

/**
 * Source type definitions with score caps - MUST be consistent across prompts
 */
const SHARED_SOURCE_TYPES = `
- editorial_publisher: Traditional news outlet with editorial oversight (newspaper, magazine, TV news)

- wire_service: News agency providing content to other outlets (neutral aggregation)

- government: Official government communication (not journalism)

- state_media: Government-FUNDED but editorially INDEPENDENT (national public broadcasters).
  Key test: Does it criticize its own government? If yes → state_media, not state_controlled.

- state_controlled_media: Government DIRECTLY CONTROLS editorial decisions
  STRICT: Requires evidence of editorial control, not just government funding.
  If evidence is ambiguous → use state_media instead.

- platform_ugc: User-generated content platforms

- advocacy: Organization promoting specific cause/viewpoint.
  USE THIS for outlets with strong political slant but legitimate editorial operations.

- aggregator: Republishes content from other sources

- propaganda_outlet: PRIMARY PURPOSE is coordinated influence operations
  CLASSIFICATION TRIGGERS (ANY ONE is sufficient):
  (1) Listed on government/EU disinformation tracking databases
  (2) Identified by academic disinformation researchers as coordinated influence
  (3) Evidence shows domain mirrors/amplifies known state propaganda narratives
  (4) Domain registered/operated by sanctioned entities or state actors
  (5) Multiple independent assessors classify as propaganda

- known_disinformation: DOCUMENTED source of FABRICATED content
  CLASSIFICATION TRIGGERS (ANY ONE is sufficient):
  (1) Multiple fact-checkers document FABRICATED (invented) content
  (2) Listed on disinformation tracking databases as fake news source
  (3) Documented history of publishing verifiably false stories
  (4) Platform bans for repeated violations of misinformation policies

- unknown: Cannot determine from evidence`;

/**
 * Score caps for severe source types - MUST be enforced consistently
 */
const SHARED_SCORE_CAPS = `
SOURCE TYPE SCORE CAPS (hard limits):
  - propaganda_outlet:       MAX 0.14 (highly_unreliable)
  - known_disinformation:    MAX 0.14 (highly_unreliable)
  - state_controlled_media:  MAX 0.42 (leaning_unreliable)
  - platform_ugc:            MAX 0.42 (leaning_unreliable)
Note: If evidence suggests a source has reformed, reclassify the sourceType instead.`;

// ============================================================================
// HARDENED EVALUATION PROMPT
// ============================================================================

/**
 * Generate LLM evaluation prompt with CRITICAL RULES and mechanistic guidance.
 *
 * Key features:
 * - CRITICAL RULES at top (evidence-only, insufficient-data thresholds, caps)
 * - Mechanistic confidence calculation
 * - SOURCE TYPE SCORE CAPS
 * - Self-published pages exclusion
 * - Abstract examples (no real domain names per AGENTS.md)
 */
function getEvaluationPrompt(domain: string, evidencePack: EvidencePack): string {
  const currentDate = new Date().toISOString().split("T")[0];

  const hasEvidence = evidencePack.enabled && evidencePack.items.length > 0;
  const evidenceBody = hasEvidence ? formatEvidenceForEvaluationPrompt(evidencePack.items) : "";
  const hasQualityLabels = hasEvidence && evidencePack.items.some((item) => !!item.probativeValue);

  const evidenceSection = hasEvidence
    ? [
        `## EVIDENCE PACK`,
        hasQualityLabels
          ? [
              `The following ${evidencePack.items.length} search results are your ONLY external evidence. They are grouped by probativeValue (pre-assessed quality). Base all claims on these items using their IDs (E1, E2, etc.).`,
              ``,
              `EVIDENCE WEIGHTING RULES:`,
              `- HIGH probativeValue items are authoritative assessments (fact-checker ratings, press council rulings). They carry the MOST weight and can establish a verdict direction alone.`,
              `- MEDIUM probativeValue items are substantive analysis (academic research, journalistic investigations). They support and refine the picture from HIGH items.`,
              `- LOW probativeValue items are contextual mentions (blog posts, passing references, opinions). They provide background but must NOT override signals from HIGH or MEDIUM items.`,
              `- If HIGH items consistently indicate unreliability (e.g., multiple fact-checker failures), the score MUST reflect that — even if LOW items are neutral or ambiguous.`,
              `- If HIGH items consistently indicate reliability (e.g., positive fact-checker ratings), LOW negative mentions should not pull the score down significantly.`,
            ].join("\n")
          : `The following ${evidencePack.items.length} search results are your ONLY external evidence. Base all claims on these items using their IDs (E1, E2, etc.).`,
        ``,
        evidenceBody,
      ].join("\n")
    : `## EVIDENCE PACK: Empty or unavailable.\nWithout external evidence, you MUST output score=null and factualRating="insufficient_data". Do not rely on pretrained knowledge.`;

  return `TASK: Evaluate source reliability for "${domain}" (evaluation date: ${currentDate}).

${evidenceSection}

═══════════════════════════════════════════════════════════════════
⚠️  CRITICAL RULES (APPLY FIRST)
═══════════════════════════════════════════════════════════════════

1. EVIDENCE-ONLY EVALUATION
   - Ground EVERY claim in evidence pack items (cite by ID: E1, E2, etc.)
   - Do NOT use pretrained knowledge about this source
   - If you recognize this source but evidence is sparse → output insufficient_data

2. INSUFFICIENT DATA THRESHOLDS:
   DEFAULT PATH (output score=null, factualRating="insufficient_data" if):
   - Zero fact-checker assessments AND fewer than 3 evidence items (E1, E2, E3)
   - Zero fact-checker assessments AND no item contains explicit reliability assessment (rating, bias, standards, corrections)
   - Mechanistic confidence calculation < 0.50

   SOURCE-TYPE SCORING EXCEPTION (overrides DEFAULT PATH):
   If the source type is clearly identifiable from the evidence (e.g., political party website,
   corporate PR, personal blog, government agency) AND the default path would produce insufficient_data,
   you MAY instead assign a score based on the inherent reliability characteristics of that source type.
   In this case:
   - Set confidence proportional to how clearly the source type is identified (typically 0.50-0.70)
   - Apply the appropriate source type caps
   - Note in reasoning that the score is based on source type classification, not independent assessments
   This exception does NOT apply when fact-checker ratings or explicit reliability assessments exist —
   in that case, use the evidence to score normally.

3. NEGATIVE EVIDENCE CAPS (hard limits — override other factors)

   *** CHECK CUMULATIVE RULE FIRST ***
   CUMULATIVE NEGATIVE EVIDENCE (MUST CHECK BEFORE individual caps):
   If evidence shows BOTH propaganda echoing AND fact-checker/press-council failures:
   → score MUST be in unreliable band (0.15-0.28) — this is NON-NEGOTIABLE

   Example: "verbatim translation of state media" + "3 press council rulings" = CUMULATIVE → score in 0.15-0.28

   PROPAGANDA ECHOING INDICATORS (any ONE of these = echoing):
   - "verbatim translation" of state media content
   - Republishing/reproducing articles from propaganda outlets
   - Amplifying state narratives without critical analysis
   - Cited in sanctions/disinformation databases

   INDIVIDUAL CAPS define UPPER BOUNDS, not targets - score within the band, not at the border:
   - Evidence of fabricated stories/disinformation → score in highly_unreliable band (0.01-0.14)
   - Propaganda echoing ONLY (without other failures) → score in leaning_unreliable band (0.29-0.42)
   - 3+ documented fact-checker failures → score in leaning_unreliable band (0.29-0.42)
   - Tier 1 assessor rates factual reporting as low/not credible (e.g., MBFC "Mixed"/"Low"
     /"Not Credible") → score in leaning_unreliable band (0.29-0.42).
     "Low" or "Not Credible" should score in the LOWER half of this band (0.29-0.35).
   - 1-2 documented failures from reputable fact-checkers → score in mixed band (0.43-0.57)
   - Political/ideological bias WITHOUT documented failures → no score cap (note in bias field only)

   SEVERITY COMPOUNDING — when multiple HIGH-probativeValue negative signals converge:
   - 3+ fact-checker failures AND academic/research classification as unreliable/misinformation
     → score in unreliable band (0.15-0.28). Academic confirmation elevates severity.
   - 3+ fact-checker failures AND cited in disinformation tracking databases
     → score in unreliable band (0.15-0.28).
   - Multiple independent HIGH negative signals confirming same pattern → use LOWER applicable band.

   IMPORTANT: Caps are CEILINGS, not targets. Score naturally within the appropriate band based on severity.
   When evidence items are labeled with probativeValue, weight HIGH items most heavily.

   Press council reprimands from countries with rule of law → count as fact-checker failures
   (Reprimands from regimes without rule of law should be IGNORED or viewed positively)

4. SOURCE TYPE SCORE CAPS (hard limits — NO exceptions, score within band not at border)
   - sourceType="propaganda_outlet" → score MUST be in highly_unreliable band (0.01-0.14)
   - sourceType="known_disinformation" → score MUST be in highly_unreliable band (0.01-0.14)
   - sourceType="state_controlled_media" → score MUST be in leaning_unreliable band (0.29-0.42)
   - sourceType="platform_ugc" → score MUST be in leaning_unreliable band (0.29-0.42)
   Note: If evidence suggests a source has reformed, reclassify the sourceType instead.

5. SELF-PUBLISHED PAGES DO NOT COUNT
   - The source's own "about", "editorial standards", or "corrections" pages are NOT independent assessments
   - Only third-party fact-checkers, journalism reviews, or independent analyses count as evidence

6. INSTITUTIONAL INDEPENDENCE (especially for government/official sources)
   - Evidence of politicization, political pressure, or compromised scientific integrity → LOWER the score
   - Mass staff resignations, workforce cuts, or leadership changes with controversy → treat as warning signs
   - Recent evidence (within 1-2 years) of independence concerns outweighs historical reputation
   - Government sources are NOT automatically reliable - evaluate based on current evidence of independence

6. ENTITY-LEVEL EVALUATION (ORGANIZATION VS DOMAIN)
   - If the domain is the primary outlet for a larger organization (e.g., a TV channel, newspaper, or media group), you MUST evaluate the reliability of the WHOLE ORGANIZATION.
   - ONLY use organization-level reputation if the evidence pack explicitly documents it (ratings, standards, corrections, independent assessments).
   - Do NOT raise scores based on size, influence, reach, or "legacy" status unless evidence cites concrete reliability practices.
   - If organization identity or reputation is not explicitly supported by evidence, set identifiedEntity=null and do NOT infer.

7. MULTILINGUAL EVIDENCE HANDLING
   - Evidence items may be in languages OTHER than English (German, French, Spanish, etc.)
   - Evaluate ALL evidence regardless of language — non-English evidence is equally valid
   - Regional fact-checkers are authoritative for sources in their region
   - Regional fact-checkers are Tier 1 assessors (same authority as IFCN signatories)
   - Evidence from regional fact-checkers should be weighted equally to global fact-checkers

─────────────────────────────────────────────────────────────────────
RATING SCALE (score → factualRating — MUST match exactly)
─────────────────────────────────────────────────────────────────────
${SHARED_RATING_SCALE}

─────────────────────────────────────────────────────────────────────
CONFIDENCE ASSESSMENT
─────────────────────────────────────────────────────────────────────
Your confidence reflects how well the evidence supports your assessment.

FACTORS THAT INCREASE CONFIDENCE:
  - More independent assessors have evaluated the source
  - Evidence is recent rather than outdated
  - Sources agree with each other (consistency)
  - Evidence directly addresses reliability (not tangential)

FACTORS THAT DECREASE CONFIDENCE:
  - Few or no independent assessments
  - Evidence is old or outdated
  - Sources contradict each other
  - Evidence is indirect or tangential

SOFT GUARDRAILS:
  - Multiple consistent assessors → confidence should be strong
  - One assessor with clear findings → confidence should be moderate
  - No assessors or contradictory evidence → confidence should be weak
  - When confidence is weak, strongly consider insufficient_data

─────────────────────────────────────────────────────────────────────
SOURCE TYPE CLASSIFICATION (USE STRICT CRITERIA - prefer LESS SEVERE)
─────────────────────────────────────────────────────────────────────
⚠️ CRITICAL: Use the LEAST severe classification that fits the evidence.
   Political bias alone does NOT make a source propaganda or disinformation.
${SHARED_SOURCE_TYPES}

ADDITIONAL GUIDANCE for severe classifications:
  - propaganda_outlet: DO NOT USE for mainstream outlets with political bias, advocacy journalism
  - known_disinformation: DO NOT USE for outlets with occasional fact-check failures but real journalistic operation

${SHARED_SCORE_CAPS}

─────────────────────────────────────────────────────────────────────
RECOGNIZED INDEPENDENT ASSESSORS (any of these count as "fact-checker")
─────────────────────────────────────────────────────────────────────
TIER 1 - Full Authority (single mention can establish verdict):
  • IFCN signatories (International Fact-Checking Network)
  • Media credibility rating services (source rating databases)
  • Academic disinformation research labs (university-affiliated)
  • EU/government disinformation tracking units
  • Press freedom organizations (journalist protection NGOs)
  • Digital forensics/open-source intelligence organizations

TIER 2 - High Authority (corroboration recommended):
  • Major news organizations' analyses of other outlets
  • Think tanks with media research programs
  • Journalism school studies and reports
  • Parliamentary/congressional reports on disinformation

TIER 3 - Supporting (cannot establish alone):
  • Wikipedia's "Reliability" discussions
  • Crowdsourced credibility assessments
  • Social media platform labeling/bans

NOT INDEPENDENT ASSESSORS:
  • The source's own statements about itself
  • Competitor news outlets without research backing
  • Anonymous blogs or forums
  • Partisan attack pieces without evidence

─────────────────────────────────────────────────────────────────────
EVIDENCE QUALITY HIERARCHY
─────────────────────────────────────────────────────────────────────
HIGH WEIGHT (can establish verdict alone):
  - Explicit assessments from Tier 1/2 assessors above
  - Documented placement on propaganda/disinformation tracking lists
  - Research reports identifying coordinated inauthentic behavior
  - Documented corrections/retractions tracked by third parties

MEDIUM WEIGHT (support but don't establish alone):
  - Newsroom analyses of editorial standards
  - Academic studies on source reliability
  - Awards/recognition from journalism organizations
  - Platform moderation actions (bans, labels, demonetization)

LOW WEIGHT (context only, cannot trigger caps):
  - Single blog posts or forum discussions
  - Passing mentions without substantive analysis
  - Generic references without reliability details
  - Self-published claims (source's own website)
  - Social media posts, comment threads, or partisan opinion pieces
  - Wikipedia controversy lists or unsourced summaries

${SHARED_EVIDENCE_SIGNALS}

─────────────────────────────────────────────────────────────────────
RECENCY WEIGHTING (apply temporal discount to evidence)
─────────────────────────────────────────────────────────────────────
  0-12 months:   1.0× (full weight)
  12-24 months:  0.8× (high weight)
  2-5 years:     0.5× (moderate weight — organization may have changed)
  >5 years:      0.2× (low weight — only if recent evidence confirms pattern persists)

If relying on evidence >2 years old, add caveat: "Assessment based on [year]
evidence; may not reflect current state."

─────────────────────────────────────────────────────────────────────
BIAS VALUES (exact strings only)
─────────────────────────────────────────────────────────────────────
${SHARED_BIAS_VALUES}

─────────────────────────────────────────────────────────────────────
OUTPUT FORMAT (JSON only, no markdown, no commentary)
CRITICAL: Output MUST be raw JSON. Do NOT wrap in code fences.
First character MUST be "{" and last character MUST be "}".
MANDATORY: "sourceType" MUST be populated with the most specific applicable type. Do NOT leave empty or omit. Use "unknown" ONLY when evidence is truly insufficient to determine any type. If your reasoning identifies the source as state-controlled, propaganda, or disinformation, sourceType MUST reflect that — score caps depend on it.
─────────────────────────────────────────────────────────────────────
{
  "sourceType": "REQUIRED — editorial_publisher | wire_service | government | state_media | state_controlled_media | platform_ugc | advocacy | aggregator | propaganda_outlet | known_disinformation | unknown",
  "identifiedEntity": "string, the organization name if domain is primary outlet OR null",
  "evidenceQuality": {
    "independentAssessmentsCount": "number 0-10",
    "recencyWindowUsed": "string, e.g. '2024-2026' or 'unknown'",
    "notes": "string, brief quality assessment"
  },
  "score": "number 0.0-1.0 OR null",
  "confidence": "number 0.0-1.0",
  "factualRating": "string (from rating scale)",
  "bias": {
    "politicalBias": "string (from list)",
    "otherBias": "string (from list) OR null"
  },
  "reasoning": "string, 2-4 sentences explaining verdict. Use DIRECT framing: explain what evidence SHOWS and why score IS what it is. IMPORTANT: Use CONSISTENT terminology matching the factualRating (e.g., if rating is 'reliable', say 'reliable' not 'highly reliable'). Never write 'does not support X rating'.",
  "evidenceCited": [
    {
      "claim": "string, what you assert about the source",
      "basis": "string, MUST cite evidence ID (e.g. 'E1 shows...', 'Per E2 and E3...')",
      "recency": "string, time period if known (e.g. '2024', '2023-2025', 'unknown')"
    }
  ],
  "caveats": ["string array of limitations, gaps, or uncertainties"]
}

─────────────────────────────────────────────────────────────────────
FEW-SHOT EXAMPLES (Follow these patterns — abstract domains only)
─────────────────────────────────────────────────────────────────────

**Example 1: Reliable Wire Service**
Input: "example-wire-service.com"
Evidence: [E1] Independent assessor A: High factual accuracy rating. [E2] Independent assessor B: Strong editorial standards documented.
Output:
{
  "sourceType": "wire_service",
  "identifiedEntity": "Example Wire Service",
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2024-2026", "notes": "Multiple independent assessments confirm high standards." },
  "score": 0.88,
  "confidence": 0.90,
  "factualRating": "highly_reliable",
  "bias": { "politicalBias": "center", "otherBias": "none_detected" },
  "reasoning": "Multiple independent fact-checkers rate this wire service highly for accuracy and editorial standards. Evidence shows consistent accuracy and prompt corrections.",
  "evidenceCited": [
    { "claim": "Maintains strict editorial and verification standards", "basis": "E2 documents editorial policies", "recency": "2024" },
    { "claim": "High factual accuracy confirmed by independent assessors", "basis": "E1", "recency": "2025" }
  ],
  "caveats": []
}

**Example 2: Unreliable Source with Documented Failures**
Input: "example-tabloid.com"
Evidence: [E1] Independent assessor A: Rated as publishing false claims. [E2] Independent assessor B: Documented fabrication of stories.
Output:
{
  "sourceType": "editorial_publisher",
  "identifiedEntity": "Example Tabloid",
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2023-2025", "notes": "Multiple documented failures from independent fact-checkers." },
  "score": 0.22,
  "confidence": 0.88,
  "factualRating": "unreliable",
  "bias": { "politicalBias": "right", "otherBias": "sensationalist" },
  "reasoning": "Multiple independent assessors document fabrication and false claims. Evidence indicates systematic accuracy problems. Negative evidence cap applied.",
  "evidenceCited": [
    { "claim": "Documented fabrication of news stories", "basis": "E2", "recency": "2023" },
    { "claim": "Failed multiple independent fact-checks", "basis": "E1", "recency": "2024" }
  ],
  "caveats": ["Evaluation based on specific documented failures; overall volume of output not assessed."]
}

**Example 3: State-Controlled Media**
Input: "example-state-outlet.example"
Evidence: [E1] Independent assessor: Government-controlled, limited editorial independence. [E2] Press freedom organization: Content reflects state narratives.
Output:
{
  "sourceType": "state_controlled_media",
  "identifiedEntity": "Example State News Agency",
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2024-2025", "notes": "Multiple assessments identify state control." },
  "score": 0.27,
  "confidence": 0.85,
  "factualRating": "unreliable",
  "bias": { "politicalBias": "not_applicable", "otherBias": "pro_government" },
  "reasoning": "Evidence indicates state-controlled media without editorial independence. Content reflects government narratives. Score capped at state_controlled_media ceiling (≤0.42).",
  "evidenceCited": [
    { "claim": "Government-controlled with limited editorial independence", "basis": "E1", "recency": "2024" },
    { "claim": "Content reflects state narratives", "basis": "E2", "recency": "2025" }
  ],
  "caveats": ["Assessment based on editorial structure, not specific fact-checks of individual claims"]
}

**Example 4: Propaganda Outlet**
Input: "example-propaganda-site.example"
Evidence: [E1] Disinformation tracker: Identified as propaganda outlet. [E2] Independent assessor: Publishes false and misleading content.
Output:
{
  "sourceType": "propaganda_outlet",
  "identifiedEntity": null,
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2023-2025", "notes": "Multiple independent assessments identify propaganda operations." },
  "score": 0.08,
  "confidence": 0.92,
  "factualRating": "highly_unreliable",
  "bias": { "politicalBias": "not_applicable", "otherBias": "pro_government" },
  "reasoning": "Multiple independent disinformation trackers and assessors identify this as a propaganda outlet. Score capped at propaganda_outlet ceiling (≤0.14).",
  "evidenceCited": [
    { "claim": "Identified as propaganda outlet", "basis": "E1", "recency": "2024" },
    { "claim": "Publishes false and misleading content", "basis": "E2", "recency": "2023" }
  ],
  "caveats": []
}

**Example 5: Identifiable Source Type Without Fact-Checker Ratings**
Input: "party-website.example"
Evidence: [E1] Government directory listing: official website of political party X. [E2] Academic paper citing party publications. [E3] News article mentioning party's political positions.
Output:
{
  "sourceType": "political_party",
  "identifiedEntity": "Political Party X",
  "evidenceQuality": { "independentAssessmentsCount": 0, "recencyWindowUsed": "2020-2025", "notes": "Source type clearly identifiable from evidence. No independent reliability assessments but source type characteristics allow scoring." },
  "score": 0.30,
  "confidence": 0.60,
  "factualRating": "leaning_unreliable",
  "bias": { "politicalBias": "right", "otherBias": "advocacy" },
  "reasoning": "Evidence clearly identifies this as an official political party website. Political party websites are inherently advocacy sources — they present partisan positions, selectively use data, and lack editorial independence or corrections policies. Score of 0.30 reflects the inherent limitations of advocacy sources. No independent fact-checker ratings exist to adjust this assessment up or down.",
  "evidenceCited": [
    { "claim": "Official political party website", "basis": "E1", "recency": "2023" },
    { "claim": "Referenced in academic research as party source", "basis": "E2", "recency": "2020" }
  ],
  "caveats": ["Score based on source type classification (advocacy/political party), not independent fact-checker assessments", "No independent reliability ratings available"]
}

**Example 6: Insufficient Data (truly unknown)**
Input: "unknown-local-outlet.example"
Evidence: (empty evidence pack)
Output:
{
  "sourceType": "unknown",
  "identifiedEntity": null,
  "evidenceQuality": { "independentAssessmentsCount": 0, "recencyWindowUsed": "unknown", "notes": "No evidence available at all." },
  "score": null,
  "confidence": 0.15,
  "factualRating": "insufficient_data",
  "bias": { "politicalBias": "not_applicable", "otherBias": null },
  "reasoning": "Empty evidence pack — no information available to assess this source. Cannot determine source type or reliability.",
  "evidenceCited": [],
  "caveats": ["No evidence available", "Source type unknown"]
}

─────────────────────────────────────────────────────────────────────
FINAL VALIDATION (check before responding)
─────────────────────────────────────────────────────────────────────
□ Score falls within correct range for factualRating
□ Every claim in evidenceCited references an evidence ID (E1, E2, etc.)
□ Applied evidence-only rule (no pretrained knowledge used)
□ Applied SOURCE TYPE CAPS if sourceType is propaganda_outlet/known_disinformation/state_controlled_media/platform_ugc
□ Applied negative evidence caps if applicable
□ If confidence < 0.50 or zero fact-checkers + weak mentions → considered insufficient_data
□ EXCEPTION: If source type clearly identifiable → scored by source type even without fact-checker ratings
□ Recency weighting applied (discounted old evidence appropriately)
□ Political bias noted but did NOT reduce score unless paired with documented failures
□ Self-published pages were NOT counted as independent assessments
□ Follow the schema above exactly
□ Return only valid JSON (no markdown, no extra commentary)
`;
}

// ============================================================================
// REFINEMENT PROMPT (Sequential LLM Chain)
// ============================================================================

/**
 * Generate a refinement prompt for the second LLM to cross-check and refine
 * the initial evaluation. This enables sequential refinement where LLM2
 * can catch what LLM1 missed, especially for entity-level evaluation.
 */
function getRefinementPrompt(
  domain: string,
  evidenceSection: string,
  initialResult: EvaluationResult,
  initialModelName: string
): string {
  const scoreStr = initialResult.score !== null
    ? `${(initialResult.score * 100).toFixed(0)}%`
    : "null (insufficient_data)";

  const evidenceCitedSummary = (initialResult.evidenceCited ?? [])
    .map(e => `- ${e.claim} (${e.basis})`)
    .join("\n") || "(none cited)";

  return `You are a senior fact-check analyst performing a CROSS-CHECK and REFINEMENT of an initial source reliability evaluation.

═══════════════════════════════════════════════════════════════════════════════
DOMAIN UNDER EVALUATION: ${domain}
═══════════════════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════════════
INITIAL EVALUATION (by ${initialModelName})
═══════════════════════════════════════════════════════════════════════════════
Score: ${scoreStr}
Rating: ${initialResult.factualRating}
Source Type: ${initialResult.sourceType || "unknown"}
Identified Entity: ${initialResult.identifiedEntity || "Not identified"}
Confidence: ${(initialResult.confidence * 100).toFixed(0)}%

Initial Reasoning:
${initialResult.reasoning}

Evidence Cited by Initial Evaluation:
${evidenceCitedSummary}

Caveats from Initial Evaluation:
${(initialResult.caveats ?? []).map(c => `- ${c}`).join("\n") || "(none)"}

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE PACK (Same evidence the initial evaluation used)
═══════════════════════════════════════════════════════════════════════════════

EVIDENCE WEIGHTING RULES (if items are grouped by probativeValue):
- HIGH = authoritative assessments (fact-checker ratings, press council rulings). Carry the MOST weight.
- MEDIUM = substantive analysis (academic research, journalistic investigations). Support/refine.
- LOW = contextual mentions (blog posts, passing references). Must NOT override HIGH/MEDIUM signals.
- If HIGH items consistently indicate unreliability, the score MUST reflect that regardless of LOW items.

${evidenceSection}

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK: CROSS-CHECK AND REFINE
═══════════════════════════════════════════════════════════════════════════════

1. CROSS-CHECK the initial evaluation against the evidence
   - Did the initial evaluation interpret the evidence correctly?
   - Are there any errors or oversights?

2. IDENTIFY what the initial evaluation missed or got wrong
   - Look for evidence the initial evaluation didn't cite
   - Check if evidence was misinterpreted

3. SHARPEN the entity identification
   - Is this domain the PRIMARY outlet for a larger organization?
   - What type of organization is it? (public broadcaster, wire service, newspaper, etc.)
   - Only mark "well-known/established" if the evidence pack explicitly says so

4. ENRICH with organizational context
   - For PUBLIC BROADCASTERS (national/public media funded by government but editorially independent):
     * Government-funded but editorially independent
     * Institutional history and accountability structures
   - For WIRE SERVICES (news agencies providing content to other outlets):
     * Industry standard for factual reporting
     * Used by other news organizations worldwide
   - For LEGACY NEWSPAPERS/BROADCASTERS (established media with decades of operation):
     * Established editorial standards and correction policies
     * Track record matters
   IMPORTANT: Only include organization-level context if the evidence pack explicitly documents it.

5. CROSS-CHECK AND ADJUST the score
   - Verify the initial evaluation is correct
   - Add entity-level context if the initial evaluation missed it

   ADJUSTMENT RULES (must follow strictly):
   - UPWARD adjustment when positive signals are PRESENT and score doesn't match evidence:
     * Fact-checker explicitly rates "HIGH" or "VERY HIGH" factual → score in reliable/highly_reliable range
     * Multiple Tier 1 assessors give positive ratings → score should reflect the consensus
     * If assessors say source is highly reliable but initial score seems low, adjust upward
     * Don't be artificially conservative when assessors explicitly rate a source highly
   - UPWARD adjustment also supported by:
     * Academic citations of the source as reference material
     * Professional/institutional use documented
     * Independent mentions treating it as authoritative
     * Explicit evidence of editorial standards, corrections, or reliability ratings
   - DOWNWARD adjustment if negative signals were missed or underweighted:
     * Fact-checker failures (CORRECTIV, Snopes, etc. found misleading content)
     * ECHOING or AMPLIFYING propaganda from other sources (even if not creating it)
     * Publishing unverified claims from propaganda outlets
     * Multiple documented instances of misleading content
   - ENFORCE NEGATIVE EVIDENCE CAPS (CHECK CUMULATIVE FIRST):
     *** CUMULATIVE RULE (check FIRST, takes precedence): ***
     If evidence shows BOTH propaganda echoing AND fact-checker/press-council failures:
     → score MUST be in unreliable band (0.15-0.28) — NON-NEGOTIABLE

     PROPAGANDA ECHOING = "verbatim translation", republishing state media, cited in disinformation databases
     Press council rulings from rule-of-law countries = fact-checker failures

     Example: "verbatim translation" + "3 press council rulings" = CUMULATIVE → score in 0.15-0.28

     Individual caps define UPPER BOUNDS - score within the band, not at the border:
     * Echoing ONLY → score in 0.29-0.42 band
     * Failures ONLY → score in 0.29-0.57 depending on severity
     * Tier 1 assessor rates factual reporting as "Low"/"Not Credible"/"Mixed" → score ≤ 0.42
       ("Low"/"Not Credible" should be in lower half: 0.29-0.35)

     SEVERITY COMPOUNDING — multiple HIGH-probativeValue negative signals:
     * 3+ fact-checker failures + academic/research classification as unreliable → unreliable band (0.15-0.28)
     * 3+ fact-checker failures + cited in disinformation databases → unreliable band (0.15-0.28)
     * Multiple independent HIGH negative signals confirming same pattern → use LOWER applicable band

     IMPORTANT: Caps are CEILINGS, not targets. Score naturally within appropriate band.
     Weight HIGH probativeValue evidence most heavily when determining which band applies.

     If initial evaluation scored above these caps despite evidence, LOWER THE SCORE
   - NO adjustment if evidence is simply sparse (sparse ≠ positive)
   - Absence of negative evidence alone does NOT justify upward adjustment
   - Do NOT adjust upward based on popularity, audience size, influence, or "legacy" status without evidence

6. MULTILINGUAL EVIDENCE CHECK
   - Evidence may be in languages OTHER than English
   - Regional fact-checkers are Tier 1 assessors (same weight as global fact-checkers)
   - Did the initial evaluation properly weigh non-English evidence?
   - Check if regional fact-checker assessments were overlooked

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE SIGNALS (same as initial evaluation)
═══════════════════════════════════════════════════════════════════════════════
${SHARED_EVIDENCE_SIGNALS}

REFINEMENT-SPECIFIC RULES:
- Absence of explicit fact-checker ratings does NOT penalize sources
  (fact-checkers focus on problematic sources), but it also does NOT justify upward adjustment
- Upward adjustment requires POSITIVE signals to be documented in the evidence pack

═══════════════════════════════════════════════════════════════════════════════
RATING SCALE (must match initial evaluation)
═══════════════════════════════════════════════════════════════════════════════
${SHARED_RATING_SCALE}

═══════════════════════════════════════════════════════════════════════════════
SOURCE TYPES (must match initial evaluation)
═══════════════════════════════════════════════════════════════════════════════
${SHARED_SOURCE_TYPES}

${SHARED_SCORE_CAPS}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON only, no markdown, no extra commentary)
CRITICAL: Output MUST be raw JSON. Do NOT wrap in code fences.
First character MUST be "{" and last character MUST be "}".
═══════════════════════════════════════════════════════════════════════════════
{
  "crossCheckFindings": "string: What did the initial evaluation miss, get wrong, or interpret incorrectly? Be specific.",
  "entityRefinement": {
    "identifiedEntity": "string: The organization name or null if unknown",
    "organizationType": "string: public_broadcaster | wire_service | legacy_newspaper | legacy_broadcaster | digital_native | other",
    "isWellKnown": "boolean: Is this a well-established, recognized organization?",
    "notes": "string: Brief explanation of the organization's status"
  },
  "scoreAdjustment": {
    "originalScore": ${initialResult.score !== null ? initialResult.score.toFixed(2) : "null"},
    "refinedScore": "number (0.00-1.00) or null if insufficient_data",
    "adjustmentReason": "string: Why the score was adjusted, or 'No adjustment - initial score is appropriate'"
  },
  "refinedRating": "string: highly_reliable | reliable | leaning_reliable | mixed | leaning_unreliable | unreliable | highly_unreliable | insufficient_data",
  "refinedConfidence": "number (0.00-1.00): Your confidence in the refined assessment",
  "combinedReasoning": "string: Updated reasoning. Use DIRECT framing and CONSISTENT terminology matching the refinedRating (e.g., 'reliable' not 'highly reliable'). Never write 'does not support X rating'"
}

Return ONLY valid JSON. No markdown fences, no extra text.`;
}

/**
 * Schema for parsing refinement output from the second LLM.
 */
const RefinementResultSchema = z.object({
  crossCheckFindings: z.string(),
  entityRefinement: z.object({
    identifiedEntity: z.string().nullable(),
    organizationType: z.string(),
    isWellKnown: z.boolean(),
    notes: z.string(),
  }),
  scoreAdjustment: z.object({
    originalScore: z.number().nullable(),
    refinedScore: z.number().min(0).max(1).nullable(),
    adjustmentReason: z.string(),
  }),
  refinedRating: FactualRatingSchema,
  refinedConfidence: z.number().min(0).max(1),
  combinedReasoning: z.string(),
});

type RefinementResult = z.infer<typeof RefinementResultSchema>;

/**
 * Call the secondary model to cross-check and refine the primary evaluation.
 * This implements the sequential refinement pattern where LLM2 reviews LLM1's work.
 */
async function refineEvaluation(
  domain: string,
  evidencePack: EvidencePack,
  initialResult: EvaluationResult,
  initialModelName: string
): Promise<{
  refinedResult: EvaluationResult;
  refinementApplied: boolean;
  refinementNotes: string;
  originalScore: number | null;
} | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.startsWith("PASTE_") || apiKey === "sk-...") {
    debugLog(`[SR-Eval] Refinement skipped: OpenAI API key not configured`);
    return null;
  }

  // Build evidence section for the refinement prompt
  const evidenceSection = evidencePack.enabled && evidencePack.items.length > 0
    ? formatEvidenceForEvaluationPrompt(evidencePack.items)
    : "(No evidence items available)";

  const prompt = getRefinementPrompt(domain, evidenceSection, initialResult, initialModelName);
  const temperature = getDeterministicTemperature(0.3);
  const modelName = SR_OPENAI_MODEL;

  debugLog(`[SR-Eval] Starting refinement pass with ${modelName} for ${domain}...`);

  try {
    const { text } = await withTimeout(
      "SR refinement",
      SR_REFINEMENT_TIMEOUT_MS,
      () =>
        generateText({
          model: openai(modelName),
          prompt,
          temperature,
          maxOutputTokens: 2000,
        }),
    );

    // Parse JSON response
    const cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      debugLog(`[SR-Eval] Refinement failed: Invalid JSON response`, { domain, response: text.slice(0, 500) });
      return null;
    }

    const validated = RefinementResultSchema.safeParse(parsed);
    if (!validated.success) {
      debugLog(`[SR-Eval] Refinement failed: Schema validation error`, { domain, errors: validated.error.issues });
      return null;
    }

    const refinement = validated.data;
    const originalScore = initialResult.score;
    const refinedScore = refinement.scoreAdjustment.refinedScore;
    const scoreChanged = refinedScore !== originalScore;

    // Build refined result
    const refinedResult: EvaluationResult = {
      ...initialResult,
      score: refinedScore,
      confidence: refinement.refinedConfidence,
      factualRating: refinement.refinedRating,
      reasoning: refinement.combinedReasoning,
      identifiedEntity: refinement.entityRefinement.identifiedEntity ?? initialResult.identifiedEntity,
      caveats: [
        ...(initialResult.caveats ?? []),
        ...(scoreChanged ? [`Score refined from ${originalScore !== null ? (originalScore * 100).toFixed(0) + '%' : 'null'} to ${refinedScore !== null ? (refinedScore * 100).toFixed(0) + '%' : 'null'}: ${refinement.scoreAdjustment.adjustmentReason}`] : []),
      ],
    };

    // Apply post-processing to ensure caps and rating alignment
    const processedResult = applyPostProcessing(refinedResult, evidencePack);

    const refinementNotes = [
      `Cross-check findings: ${refinement.crossCheckFindings}`,
      `Entity: ${refinement.entityRefinement.identifiedEntity ?? 'Not identified'} (${refinement.entityRefinement.organizationType})`,
      `Well-known: ${refinement.entityRefinement.isWellKnown ? 'Yes' : 'No'}`,
      scoreChanged ? `Score adjusted: ${refinement.scoreAdjustment.adjustmentReason}` : 'Score confirmed as appropriate',
    ].join(' | ');

    debugLog(`[SR-Eval] Refinement complete for ${domain}: ${scoreChanged ? 'score adjusted' : 'score confirmed'}`, {
      domain,
      originalScore,
      refinedScore: processedResult.score,
      refinementApplied: scoreChanged,
    });

    return {
      refinedResult: processedResult,
      refinementApplied: scoreChanged,
      refinementNotes,
      originalScore,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    debugLog(`[SR-Eval] Refinement failed with error: ${errorMessage}`, { domain });
    return null;
  }
}

// ============================================================================
// POST-PROCESSING & VALIDATION
// ============================================================================

/**
 * Count unique evidence IDs referenced in the evaluation.
 */
/**
 * Compute foundedness score based on evidence grounding.
 */
function computeFoundednessScore(result: EvaluationResult, evidencePack: EvidencePack): number {
  const cited = result.evidenceCited ?? [];
  if (cited.length === 0) return 0;

  if (evidencePack.enabled && evidencePack.items.length > 0) {
    const ids = new Set(evidencePack.items.map((i) => i.id));
    const urls = new Set(evidencePack.items.map((i) => i.url));

    let totalRefs = 0;
    const uniqueRefs = new Set<string>();
    let recencyCount = 0;

    for (const item of cited) {
      if (item.recency && item.recency.trim()) recencyCount++;

      if (item.evidenceId && ids.has(item.evidenceId)) {
        totalRefs++;
        uniqueRefs.add(item.evidenceId);
      }

      const extracted = extractEvidenceIdsFromText(item.basis || "");
      for (const id of extracted) {
        if (ids.has(id)) {
          totalRefs++;
          uniqueRefs.add(id);
        }
      }

      if (item.url && urls.has(item.url)) {
        totalRefs++;
        uniqueRefs.add(item.url);
      }
    }

    const independentBonus = result.evidenceQuality?.independentAssessmentsCount
      ? Math.min(2, Math.max(0, result.evidenceQuality.independentAssessmentsCount) / 5)
      : 0;

    return totalRefs * 2 + uniqueRefs.size * 1 + recencyCount * 0.25 + independentBonus;
  }

  const recencyCount = cited.filter((c) => (c.recency ?? "").trim().length > 0).length;
  return cited.length + recencyCount * 0.25;
}

/**
 * Apply deterministic post-processing to enforce consistency and caps.
 *
 * 1. Enforce source type caps
 * 2. Align factualRating with score
 * 3. Add caveats when caps are applied
 */
function applyPostProcessing(result: EvaluationResult, evidencePack: EvidencePack): EvaluationResult {
  // Make a mutable copy
  const processed = { ...result, caveats: [...(result.caveats ?? [])] };

  // Skip if score is null (insufficient_data)
  if (processed.score === null) {
    processed.factualRating = "insufficient_data";
    return processed;
  }

  // 1. Flag missing sourceType classification
  const sourceType = processed.sourceType ?? "unknown";
  if (sourceType === "unknown") {
    debugLog(`[SR-Eval] sourceType is "unknown" — LLM did not classify the source type`, { domain: processed.domain });
    processed.caveats.push(`sourceType not classified by LLM — source type caps could not be applied.`);
  }

  // 2. Enforce source type caps (deterministic quality gate)
  const expectedCap = SOURCE_TYPE_EXPECTED_CAPS[sourceType];

  if (expectedCap !== undefined && processed.score > expectedCap) {
    const originalScore = processed.score;
    processed.score = expectedCap;
    debugLog(`[SR-Eval] Source type cap enforced: ${sourceType} score ${originalScore.toFixed(2)} → ${expectedCap.toFixed(2)}`, { sourceType, originalScore, expectedCap });
    processed.caveats.push(
      `Score capped from ${(originalScore * 100).toFixed(0)}% to ${(expectedCap * 100).toFixed(0)}% due to sourceType="${sourceType}".`
    );
  }

  // 3. Align factualRating with (potentially capped) score
  const expectedRating = scoreToFactualRating(processed.score);
  if (processed.factualRating !== expectedRating) {
    debugLog(`[SR-Eval] Aligning factualRating: ${processed.factualRating} → ${expectedRating}`);
    processed.factualRating = expectedRating;
  }

  // 4. Check grounding for high scores (asymmetric skepticism)
  const foundedness = computeFoundednessScore(processed, evidencePack);
  const uniqueEvidence = countUniqueEvidenceIds(processed, evidencePack);

  if (processed.score >= 0.72 && foundedness < MIN_FOUNDEDNESS_FOR_HIGH_SCORES) {
    // High score with weak grounding - add caveat
    processed.caveats.push(
      `High reliability score (${(processed.score * 100).toFixed(0)}%) with limited evidence grounding (foundedness: ${foundedness.toFixed(1)}).`
    );
  }

  if (processed.score !== null && uniqueEvidence < MIN_EVIDENCE_IDS_FOR_SCORE) {
    // Score without minimum evidence citations
    processed.caveats.push(
      `Score issued with only ${uniqueEvidence} unique evidence citations.`
    );
  }

  return processed;
}

// ============================================================================
// MODEL EVALUATION
// ============================================================================

interface EvaluationError {
  reason:
    | "primary_model_failed"
    | "no_consensus"
    | "evaluation_error"
    | "grounding_failed";
  details: string;
  primaryScore?: number | null;
  primaryConfidence?: number;
  secondaryScore?: number | null;
  secondaryConfidence?: number;
}

function extractBiasIndicator(bias?: EvaluationResult["bias"]): string | null {
  if (!bias) return null;
  const spectrum = bias.politicalBias;
  if (spectrum === "not_applicable") return null;
  return spectrum.replace(/_/g, "-");
}

function buildResponsePayload(
  result: EvaluationResult,
  modelPrimary: string,
  modelSecondary: string | null,
  consensusAchieved: boolean,
  evidencePack: EvidencePack,
  overrideScore?: number | null,
  overrideConfidence?: number
): ResponsePayload {
  return {
    score: overrideScore !== undefined ? overrideScore : result.score,
    confidence: overrideConfidence !== undefined ? overrideConfidence : result.confidence,
    modelPrimary,
    modelSecondary,
    consensusAchieved,
    reasoning: result.reasoning,
    category: result.factualRating,
    sourceType: result.sourceType || "unknown",
    evidencePack: {
      providersUsed: evidencePack.providersUsed,
      queries: evidencePack.queries,
      items: evidencePack.items,
      qualityAssessment: evidencePack.qualityAssessment,
    },
    biasIndicator: extractBiasIndicator(result.bias),
    bias: result.bias,
    evidenceCited: result.evidenceCited,
    caveats: result.caveats,
  };
}

function applyLanguageDetectionCaveat(payload: ResponsePayload, domain: string): void {
  const caveat = getLanguageDetectionCaveat(domain);
  if (!caveat) return;
  payload.caveats = [...(payload.caveats ?? []), caveat];
}

function applyEvidenceQualityAssessmentCaveat(
  payload: ResponsePayload,
  evidencePack: EvidencePack,
): void {
  const qa = evidencePack.qualityAssessment;
  if (!qa || qa.status !== "failed") return;
  payload.caveats = [
    ...(payload.caveats ?? []),
    "⚠️ Evidence quality assessment failed; fallback to flat evidence weighting was used.",
  ];
}

async function evaluateWithModel(
  domain: string,
  modelProvider: "anthropic" | "openai",
  evidencePack: EvidencePack
): Promise<{ result: EvaluationResult; modelName: string } | null> {
  const apiKeyEnvVar = modelProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  const apiKey = process.env[apiKeyEnvVar];

  if (!apiKey) {
    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: ${apiKeyEnvVar} not set in environment`);
    return null;
  }

  if (apiKey.startsWith("PASTE_") || apiKey === "sk-...") {
    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: ${apiKeyEnvVar} appears to be a placeholder value`);
    return null;
  }

  const prompt = getEvaluationPrompt(domain, evidencePack);
  const temperature = getDeterministicTemperature(0.3);

  const modelName = modelProvider === "anthropic"
    ? ANTHROPIC_MODELS.budget.modelId
    : SR_OPENAI_MODEL;

  debugLog(`[SR-Eval] Calling ${modelProvider} (${modelName}) for ${domain}...`);

  const model = modelProvider === "anthropic"
    ? anthropic(modelName)
    : openai(modelName);

  try {
    const response = await withTimeout(
      "SR primary evaluation",
      SR_PRIMARY_EVALUATION_TIMEOUT_MS,
      () =>
        generateText({
          model,
          messages: [
            {
              role: "system",
              content: `You are a media reliability analyst using EVIDENCE-ONLY methodology. CRITICAL RULES:
(1) Evaluate sources based solely on PROVIDED EVIDENCE - cite evidence pack items (E1, E2, etc.) for every claim.
(2) Apply SOURCE TYPE CAPS: propaganda_outlet/known_disinformation → ≤14%, state_controlled_media/platform_ugc → ≤42%.
(3) Apply negative evidence caps: fabrication/disinformation → ≤14%, 3+ failures → ≤42%, 1-2 failures → ≤57%.
(4) Never use pretrained knowledge about sources.
(5) Self-published pages (source's own website) do NOT count as independent assessments.
(6) Default to insufficient_data when evidence is sparse (confidence < 0.50), unless source type is clearly identifiable (then score by source type).
(7) Separate political bias from accuracy - bias alone does not reduce score.
Always respond with valid JSON only.`,
              providerOptions: getPromptCachingOptions(modelProvider),
            },
            { role: "user", content: prompt },
          ],
          temperature,
        }),
    );

    const text = response.text?.trim() || "";
    if (!text) {
      console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: Empty response`);
      return null;
    }

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: Invalid JSON`);
      console.error(`  - Raw response: ${text.slice(0, 200)}...`);
      return null;
    }

    let result = EvaluationResultSchema.parse(parsed);

    // Apply post-processing (caps, alignment)
    result = applyPostProcessing(result, evidencePack);

    const scoreStr = result.score !== null ? result.score.toFixed(2) : "null";
    debugLog(`[SR-Eval] ${modelProvider.toUpperCase()} SUCCESS: score=${scoreStr}, confidence=${result.confidence.toFixed(2)}, rating=${result.factualRating}, type=${result.sourceType || "unknown"}`, { domain, result });
    return { result, modelName };
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    const errorCode = err?.code || err?.status || "unknown";

    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED for ${domain}:`);
    console.error(`  - Error code: ${errorCode}`);
    console.error(`  - Message: ${errorMessage}`);

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("invalid_api_key")) {
      console.error(`  - DIAGNOSIS: API key is invalid or expired. Check ${apiKeyEnvVar}`);
    } else if (errorMessage.includes("429") || errorMessage.includes("rate_limit")) {
      console.error(`  - DIAGNOSIS: Rate limit exceeded. Wait and retry.`);
    } else if (errorMessage.includes("500") || errorMessage.includes("503")) {
      console.error(`  - DIAGNOSIS: Provider service error. Try again later.`);
    } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      console.error(`  - DIAGNOSIS: Request timed out. Network issue or slow response.`);
    }

    return null;
  }
}

// ============================================================================
// SEQUENTIAL REFINEMENT EVALUATION
// ============================================================================
//
// Architecture: LLM1 (Initial Evaluation) → LLM2 (Cross-check and Refine) → Final Result
//
// Benefits over parallel consensus:
// - LLM2 can catch what LLM1 missed (especially entity-level evaluation)
// - LLM2 explicitly cross-checks entity identification
// - LLM2 can apply baseline adjustments for known organization types
// - Better reasoning transparency (shows refinement logic)
// ============================================================================

async function evaluateSourceWithConsensus(
  domain: string,
  multiModel: boolean,
  confidenceThreshold: number,
  options: {
    requestStartedAtMs: number;
    requestBudgetMs: number | null;
    evidenceQualityAssessmentConfig: EvidenceQualityAssessmentConfig;
  },
): Promise<{ success: true; data: ResponsePayload } | { success: false; error: EvaluationError }> {
  const initialEvidencePack = await buildEvidencePack(domain);
  if (initialEvidencePack.enabled) {
    debugLog(
      `[SR-Eval] Evidence pack for ${domain}: ${initialEvidencePack.items.length} items`,
      { domain, itemCount: initialEvidencePack.items.length, providers: initialEvidencePack.providersUsed },
    );
  }

  // Budget note: per-domain prefetch timeout in analyzer defaults to 90s (`SR_CONFIG.evalTimeoutMs`).
  // Guard enrichment up front so core evaluation budget stays available.
  const remainingBudgetBeforeEnrichmentMs = getRemainingBudgetMs(
    options.requestStartedAtMs,
    options.requestBudgetMs,
  );
  const minimumBudgetForCoreEvaluationMs = getMinimumCoreEvaluationBudgetMs(multiModel);
  const minimumBudgetToAttemptEnrichmentMs =
    minimumBudgetForCoreEvaluationMs +
    Math.max(0, options.evidenceQualityAssessmentConfig.minRemainingBudgetMs);

  let evidencePack: EvidencePack;
  if (
    remainingBudgetBeforeEnrichmentMs !== null &&
    remainingBudgetBeforeEnrichmentMs < minimumBudgetToAttemptEnrichmentMs
  ) {
    const modelName = resolveEvidenceQualityAssessmentModel(
      options.evidenceQualityAssessmentConfig.model,
    ).modelName;
    debugLog(
      "[SR-Eval] Skipping evidence quality assessment due to tight request budget",
      {
        domain,
        remainingBudgetMs: remainingBudgetBeforeEnrichmentMs,
        minimumBudgetToAttemptEnrichmentMs,
        minimumBudgetForCoreEvaluationMs,
        multiModel,
      },
    );
    evidencePack = {
      ...initialEvidencePack,
      qualityAssessment: {
        status: "skipped",
        model: modelName,
        skippedReason: "budget_guard",
      },
    };
  } else {
    evidencePack = await enrichEvidencePackWithQualityAssessment(
      domain,
      initialEvidencePack,
      options.evidenceQualityAssessmentConfig,
      options.requestStartedAtMs,
      options.requestBudgetMs,
    );
  }

  // ============================================================================
  // STEP 1: Primary evaluation (Anthropic Claude)
  // ============================================================================
  const primary = await evaluateWithModel(domain, "anthropic", evidencePack);
  if (!primary) {
    debugLog(`[SR-Eval] Primary evaluation failed for ${domain}`);
    return {
      success: false,
      error: {
        reason: "primary_model_failed",
        details: "Claude evaluation failed. Check API key or service availability.",
      },
    };
  }

  // Handle insufficient_data case - skip refinement only if evidence pack is empty
  if ((primary.result.factualRating === "insufficient_data" || primary.result.score === null)
      && evidencePack.items.length === 0) {
    debugLog(`[SR-Eval] Insufficient data (no evidence) for ${domain}`);
    const payload = buildResponsePayload(primary.result, primary.modelName, null, true, evidencePack);
    applyLanguageDetectionCaveat(payload, domain);
    applyEvidenceQualityAssessmentCaveat(payload, evidencePack);
    return {
      success: true,
      data: payload,
    };
  }

  // ============================================================================
  // STEP 2: Single-model mode - skip refinement
  // ============================================================================
  if (!multiModel) {
    debugLog(`[SR-Eval] Single-model mode: Using primary only for ${domain}`);
    const payload = buildResponsePayload(
      primary.result,
      primary.modelName,
      null,
      true, // consensusAchieved = true in single-model mode
      evidencePack
    );
    applyLanguageDetectionCaveat(payload, domain);
    applyEvidenceQualityAssessmentCaveat(payload, evidencePack);
    return {
      success: true,
      data: payload,
    };
  }

  // ============================================================================
  // STEP 3: Sequential Refinement (GPT-5 mini cross-checks Claude's work)
  // ============================================================================
  debugLog(`[SR-Eval] Starting sequential refinement for ${domain}...`);

  const refinement = await refineEvaluation(
    domain,
    evidencePack,
    primary.result,
    primary.modelName
  );

  // If refinement fails, fall back to primary result
  if (!refinement) {
    debugLog(`[SR-Eval] Refinement failed for ${domain}, using primary result`);
    const payload = buildResponsePayload(
      primary.result,
      primary.modelName,
      SR_OPENAI_MODEL, // Attempted but failed
      false, // consensusAchieved = false (refinement failed)
      evidencePack,
      primary.result.score,
      primary.result.confidence * 0.9 // Slight confidence reduction when refinement fails
    );
    applyLanguageDetectionCaveat(payload, domain);
    applyEvidenceQualityAssessmentCaveat(payload, evidencePack);
    payload.identifiedEntity = primary.result.identifiedEntity;
    payload.caveats = [
      ...(payload.caveats ?? []),
      "⚠️ Refinement pass failed; using initial evaluation only."
    ];
    return {
      success: true,
      data: payload,
    };
  }

  // ============================================================================
  // STEP 4: Build final response with refinement data
  // ============================================================================
  const { refinedResult, refinementApplied, refinementNotes, originalScore } = refinement;

  // Apply confidence boost based on refinement substance (score delta + new evidence)
  const { boost: confidenceBoost } = computeRefinementConfidenceBoost(
    primary.result,
    refinedResult,
    evidencePack,
    refinementApplied
  );

  const boostedConfidence = Math.min(0.95, refinedResult.confidence + confidenceBoost);

  const finalRating = scoreToFactualRating(refinedResult.score);

  // Check confidence requirements (informational only, no blocking)
  const meetsConfReq = meetsConfidenceRequirement(finalRating, boostedConfidence);
  if (!meetsConfReq) {
    debugLog(`[SR-Eval] Note: confidence ${boostedConfidence.toFixed(2)} is below typical threshold for "${finalRating}" - proceeding anyway`, { domain, finalRating, boostedConfidence });
  }

  if (boostedConfidence < confidenceThreshold) {
    debugLog(`[SR-Eval] Note: confidence ${boostedConfidence.toFixed(2)} is below threshold ${confidenceThreshold} - proceeding with score anyway`, { domain, confidenceThreshold });
  }

  debugLog(
    `[SR-Eval] Sequential refinement complete for ${domain}: score=${refinedResult.score?.toFixed(2)}, conf=${boostedConfidence.toFixed(2)}, refined=${refinementApplied}`,
    { domain, finalScore: refinedResult.score, boostedConfidence, refinementApplied, originalScore }
  );

  // Build final payload
  const payload = buildResponsePayload(
    refinedResult,
    primary.modelName,
    SR_OPENAI_MODEL,
    true, // consensusAchieved = true (sequential refinement completed)
    evidencePack,
    refinedResult.score,
    boostedConfidence
  );
  applyLanguageDetectionCaveat(payload, domain);
  applyEvidenceQualityAssessmentCaveat(payload, evidencePack);

  payload.category = finalRating;
  payload.identifiedEntity = refinedResult.identifiedEntity;
  payload.refinementApplied = refinementApplied;
  payload.refinementNotes = refinementNotes;
  payload.originalScore = originalScore;

  if (refinementApplied) {
    payload.caveats = [
      ...(payload.caveats ?? []),
      `✓ Score refined by cross-check: ${originalScore !== null ? (originalScore * 100).toFixed(0) + '%' : 'null'} → ${refinedResult.score !== null ? (refinedResult.score * 100).toFixed(0) + '%' : 'null'}`
    ];
  }

  return {
    success: true,
    data: payload,
  };
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(req: Request) {
  // Authentication
  if (!checkRunnerKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request
  let body: z.infer<typeof RequestSchema>;
  let raw: any;
  try {
    raw = await req.json();
    body = RequestSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: String(err) },
      { status: 400 }
    );
  }

  const srConfigResult = await getConfig("sr", "default");
  const srConfig = srConfigResult.config;

  // Decision A1/A2: Derive search config directly from SR evaluationSearch settings.
  // No longer loads shared 'search' profile from UCM and NO LONGER spreads DEFAULT_SEARCH_CONFIG.
  // This ensures SR is fully independent from Analysis-side default changes (e.g. domainBlacklist).
  const evalSearch = srConfig.evaluationSearch || SR_DEFAULT_EVALUATION_SEARCH;

  SR_SEARCH_CONFIG = buildSrSearchConfigFromEvalSearch(evalSearch);

  SR_OPENAI_MODEL = srConfig.openaiModel;
  RATE_LIMIT_PER_IP = srConfig.rateLimitPerIp ?? (DEFAULT_SR_CONFIG.rateLimitPerIp ?? 10);
  DOMAIN_COOLDOWN_SEC = srConfig.domainCooldownSec ?? (DEFAULT_SR_CONFIG.domainCooldownSec ?? 60);
  SR_EVAL_USE_SEARCH = srConfig.evalUseSearch ?? (DEFAULT_SR_CONFIG.evalUseSearch ?? true);
  SR_EVAL_MAX_RESULTS_PER_QUERY = evalSearch.maxResultsPerQuery;
  SR_EVAL_MAX_EVIDENCE_ITEMS = evalSearch.maxEvidenceItems;
  SR_EVAL_DATE_RESTRICT = evalSearch.dateRestrict;

  const effectiveMultiModel = raw.multiModel !== undefined ? body.multiModel : srConfig.multiModel;
  const effectiveConfidenceThreshold =
    raw.confidenceThreshold !== undefined ? body.confidenceThreshold : srConfig.confidenceThreshold;
  const evidenceQualityAssessmentConfig = normalizeEvidenceQualityAssessmentConfig(
    srConfig.evidenceQualityAssessment,
  );
  const requestStartedAtMs = Date.now();
  const requestBudgetMs = raw.budgetMs !== undefined
    ? body.budgetMs ?? (srConfig.evalTimeoutMs ?? DEFAULT_SR_CONFIG.evalTimeoutMs ?? 90000)
    : (srConfig.evalTimeoutMs ?? DEFAULT_SR_CONFIG.evalTimeoutMs ?? 90000);

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rateCheck = checkRateLimit(ip, body.domain);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", reason: rateCheck.reason },
      { status: 429 }
    );
  }

  // Evaluate
  const result = await evaluateSourceWithConsensus(
    body.domain,
    effectiveMultiModel,
    effectiveConfidenceThreshold,
    {
      requestStartedAtMs,
      requestBudgetMs,
      evidenceQualityAssessmentConfig,
    },
  );

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Evaluation failed",
        reason: result.error.reason,
        details: result.error.details,
        primaryScore: result.error.primaryScore,
        primaryConfidence: result.error.primaryConfidence,
        secondaryScore: result.error.secondaryScore,
        secondaryConfidence: result.error.secondaryConfidence,
      },
      { status: 422 }
    );
  }

  return NextResponse.json(result.data);
}
