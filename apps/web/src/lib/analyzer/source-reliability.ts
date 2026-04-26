/**
 * FactHarbor Analyzer - Source Reliability
 *
 * NEW ARCHITECTURE (v2.2): Pure LLM + Cache
 * - Batch prefetch (async) populates in-memory map before analysis
 * - Sync lookup during analysis reads from the prefetched map
 * - No async calls in the analyzer hot path
 *
 * @module analyzer/source-reliability
 */

import { CONFIG } from "./config";
import { getHighlightColor7Point, normalizeHighlightColor, percentageToClaimVerdict } from "./truth-scale";
import type { ClaimVerdict, EvidenceItem, FetchedSource } from "./types";
import { assertValidTruthPercentage } from "./types";
import { batchGetCachedData, setCachedScore, setCacheTtlDays, type CachedReliabilityDataFromCache } from "../source-reliability-cache";
import { getSRConfig, scoreToFactualRating, setSRConfig } from "../source-reliability-config";
import type { SourceReliabilityConfig } from "../config-schemas";
import { extractNormalizedHostname, getDomainLookupChain, getFamilyDomain } from "../domain-utils";

// ============================================================================
// CONFIGURATION (using shared config for unified defaults)
// ============================================================================

// Use shared config for unified defaults across admin, pipeline, and evaluator
const sharedConfig = getSRConfig();

export const SR_CONFIG = {
  enabled: sharedConfig.enabled,
  confidenceThreshold: sharedConfig.confidenceThreshold, // Unified default: 0.8
  cacheTtlDays: sharedConfig.cacheTtlDays,
  multiModel: sharedConfig.multiModel,
  consensusThreshold: sharedConfig.consensusThreshold,
  filterEnabled: sharedConfig.filterEnabled,
  rateLimitPerIp: sharedConfig.rateLimitPerIp,
  domainCooldownSec: sharedConfig.domainCooldownSec,
  skipPlatforms: sharedConfig.skipPlatforms,
  skipTlds: sharedConfig.skipTlds,
  evalConcurrency: sharedConfig.evalConcurrency ?? 5,
  evalTimeoutMs: sharedConfig.evalTimeoutMs ?? 90000,
  maxLiveEvaluationsPerRun: sharedConfig.maxLiveEvaluationsPerRun ?? 12,
  runtimeBudgetMs: sharedConfig.runtimeBudgetMs ?? 90000,
  minLiveEvaluationBudgetMs: sharedConfig.minLiveEvaluationBudgetMs ?? 10000,
  minPrimaryRemainingBudgetMs: sharedConfig.minPrimaryRemainingBudgetMs ?? 15000,
  minRefinementRemainingBudgetMs: sharedConfig.minRefinementRemainingBudgetMs ?? 20000,
  defaultConfidence: sharedConfig.defaultConfidence ?? 0.8,
};

/**
 * SR module default for unknown sources.
 * The SR system itself returns null for unknown/unrated sources; consuming apps
 * choose if/how to map null to a fallback numeric weight.
 */
export const DEFAULT_UNKNOWN_SOURCE_SCORE: null = null;

export function setSourceReliabilityConfig(config?: SourceReliabilityConfig): void {
  setSRConfig(config);
  const next = getSRConfig();
  SR_CONFIG.enabled = next.enabled;
  SR_CONFIG.confidenceThreshold = next.confidenceThreshold;
  SR_CONFIG.cacheTtlDays = next.cacheTtlDays;
  SR_CONFIG.multiModel = next.multiModel;
  SR_CONFIG.consensusThreshold = next.consensusThreshold;
  SR_CONFIG.filterEnabled = next.filterEnabled;
  SR_CONFIG.rateLimitPerIp = next.rateLimitPerIp;
  SR_CONFIG.domainCooldownSec = next.domainCooldownSec;
  SR_CONFIG.skipPlatforms = next.skipPlatforms;
  SR_CONFIG.skipTlds = next.skipTlds;
  SR_CONFIG.evalConcurrency = next.evalConcurrency ?? 5;
  SR_CONFIG.evalTimeoutMs = next.evalTimeoutMs ?? 90000;
  SR_CONFIG.maxLiveEvaluationsPerRun = next.maxLiveEvaluationsPerRun ?? 12;
  SR_CONFIG.runtimeBudgetMs = next.runtimeBudgetMs ?? 90000;
  SR_CONFIG.minLiveEvaluationBudgetMs = next.minLiveEvaluationBudgetMs ?? 10000;
  SR_CONFIG.minPrimaryRemainingBudgetMs = next.minPrimaryRemainingBudgetMs ?? 15000;
  SR_CONFIG.minRefinementRemainingBudgetMs = next.minRefinementRemainingBudgetMs ?? 20000;
  SR_CONFIG.defaultConfidence = next.defaultConfidence ?? 0.8;
  setCacheTtlDays(next.cacheTtlDays);
}

// ============================================================================
// IN-MEMORY MAP (populated by prefetch, read by sync lookup)
// ============================================================================

/**
 * Cached reliability data for a domain.
 * Stores all evaluation properties, not just score.
 */
export interface CachedReliabilityData {
  score: number | null;
  confidence: number;
  consensusAchieved: boolean;
}

let prefetchedData: Map<string, CachedReliabilityData | null> = new Map();

/**
 * Clear the prefetched scores map (for testing or reset)
 */
export function clearPrefetchedScores(): void {
  prefetchedData = new Map();
}

// ============================================================================
// DOMAIN UTILITIES
// ============================================================================

/**
 * Extract and normalize domain from URL
 */
export function extractDomain(url: string): string | null {
  return extractNormalizedHostname(url);
}

/**
 * Check if a source is "important" enough to warrant LLM evaluation.
 * Uses a blacklist approach: skip known blog platforms and spam TLDs.
 */
export function isImportantSource(domain: string): boolean {
  return isImportantSourceWithConfig(domain, SR_CONFIG);
}

function isImportantSourceWithConfig(
  domain: string,
  config: Pick<SourceReliabilityConfig, "filterEnabled" | "skipPlatforms" | "skipTlds">,
): boolean {
  if (!config.filterEnabled) return true;

  // 1. Skip user-content platforms (configurable list)
  if (config.skipPlatforms.some((p) => domain.includes(p))) {
    return false;
  }

  // 2. Skip domains that look like personal/generated sites
  const subdomain = domain.split(".")[0];
  if (/\d{4,}/.test(subdomain)) return false; // Contains 4+ digits
  if (subdomain.length > 30) return false; // Very long subdomain

  // 3. Skip exotic/spam-associated TLDs (configurable list)
  const tld = domain.split(".").pop()?.toLowerCase() || "";
  if (config.skipTlds.includes(tld)) {
    return false;
  }

  return true;
}

// ============================================================================
// PHASE 1: ASYNC PREFETCH
// ============================================================================

/**
 * Prefetch source reliability scores for a batch of URLs.
 * This is the ONLY async operation - called once before analysis.
 *
 * Populates the in-memory `prefetchedScores` map for sync lookups.
 * Returns info about what was prefetched for logging.
 */
export interface PrefetchResult {
  domains: string[];
  alreadyPrefetched: number;
  cacheHits: number;
  evaluated: number;
  noConsensusCount: number;
  errorCount: number;
  errorByType: Record<SourceReliabilityErrorType, number>;
  failedDomains: string[];
  errorSamples: SourceReliabilityErrorEvent[];
  skippedDueToLimit: number;
  skippedDueToBudget: number;
  liveEvaluationLimit: number;
  liveEvaluationBudgetMs: number | null;
}

export interface PrefetchSourceReliabilityOptions {
  fallback?: boolean;
  config?: SourceReliabilityConfig;
  maxLiveEvaluations?: number;
  budgetMs?: number;
  minEvaluationBudgetMs?: number;
}

export type SourceReliabilityErrorType =
  | "timeout"
  | "connection_refused"
  | "http_401"
  | "http_403"
  | "http_429"
  | "http_5xx"
  | "http_other"
  | "network"
  | "unknown";

export interface SourceReliabilityErrorEvent {
  domain: string;
  type: SourceReliabilityErrorType;
  statusCode?: number;
  message: string;
}

function emptySourceReliabilityErrorCounts(): Record<SourceReliabilityErrorType, number> {
  return {
    timeout: 0,
    connection_refused: 0,
    http_401: 0,
    http_403: 0,
    http_429: 0,
    http_5xx: 0,
    http_other: 0,
    network: 0,
    unknown: 0,
  };
}

export async function prefetchSourceReliability(
  urls: string[],
  options?: PrefetchSourceReliabilityOptions,
): Promise<PrefetchResult> {
  const useRootFallback = options?.fallback ?? true;
  const runtimeConfig = options?.config ?? getSRConfig();
  const evalConcurrency = runtimeConfig.evalConcurrency ?? 5;
  const evalTimeoutMs = runtimeConfig.evalTimeoutMs ?? 90000;
  const maxLiveEvaluations = Math.max(
    0,
    Math.floor(options?.maxLiveEvaluations ?? runtimeConfig.maxLiveEvaluationsPerRun ?? 12),
  );
  const liveEvaluationBudgetMs = options?.budgetMs ?? runtimeConfig.runtimeBudgetMs ?? 90000;
  const minEvaluationBudgetMs = Math.max(
    0,
    options?.minEvaluationBudgetMs ?? runtimeConfig.minLiveEvaluationBudgetMs ?? 10000,
  );
  const budgetDeadlineMs =
    liveEvaluationBudgetMs === undefined || liveEvaluationBudgetMs === null
      ? null
      : Date.now() + Math.max(0, liveEvaluationBudgetMs);
  let liveEvaluationsStarted = 0;

  const result: PrefetchResult = {
    domains: [],
    alreadyPrefetched: 0,
    cacheHits: 0,
    evaluated: 0,
    noConsensusCount: 0,
    errorCount: 0,
    errorByType: emptySourceReliabilityErrorCounts(),
    failedDomains: [],
    errorSamples: [],
    skippedDueToLimit: 0,
    skippedDueToBudget: 0,
    liveEvaluationLimit: maxLiveEvaluations,
    liveEvaluationBudgetMs: liveEvaluationBudgetMs ?? null,
  };
  
  if (!runtimeConfig.enabled) {
    console.log("[SR] Source reliability disabled");
    return result;
  }

  // Extract unique domains
  const domains = urls
    .map(extractDomain)
    .filter((d): d is string => d !== null);
  const uniqueDomains = [...new Set(domains)];

  if (uniqueDomains.length === 0) {
    console.log("[SR] No domains to prefetch");
    return result;
  }

  // Filter out domains already prefetched in this analysis run
  const newDomains = uniqueDomains.filter(d => !prefetchedData.has(d));
  result.alreadyPrefetched = uniqueDomains.length - newDomains.length;
  result.domains = newDomains;
  
  if (newDomains.length === 0) {
    console.log(`[SR] All ${uniqueDomains.length} domains already prefetched`);
    return result;
  }

  console.log(`[SR] Prefetching ${newDomains.length} new domains (${result.alreadyPrefetched} already done)`);

  const cacheLookupDomains = [...new Set(newDomains.flatMap((domain) => getDomainLookupChain(domain)))];

  // Batch cache lookup - exact host first, then parent domain fallback
  const cached = await batchGetCachedData(cacheLookupDomains);
  const cachedHits = newDomains.reduce((count, domain) => {
    const resolved = resolveCachedReliability(domain, cached);
    if (!resolved) return count;

    prefetchedData.set(domain, resolved);
    return count + 1;
  }, 0);
  result.cacheHits = cachedHits;
  console.log(`[SR] Cache hits: ${cachedHits}/${newDomains.length}`);

  // Preserve exact cached entries as direct lookup keys too
  for (const [domain, data] of cached) {
    if (prefetchedData.has(domain)) continue;
    prefetchedData.set(domain, {
      score: data.score,
      confidence: data.confidence,
      consensusAchieved: data.consensusAchieved,
    });
  }

  // Find cache misses that need evaluation
  const misses = newDomains.filter((d) => !prefetchedData.has(d));

  const getRemainingBudgetMs = (): number | null => {
    if (budgetDeadlineMs === null) return null;
    return Math.max(0, budgetDeadlineMs - Date.now());
  };

  const getLiveEvaluationBlockReason = (): "limit" | "budget" | null => {
    if (liveEvaluationsStarted >= maxLiveEvaluations) return "limit";
    const remainingBudgetMs = getRemainingBudgetMs();
    if (remainingBudgetMs !== null && remainingBudgetMs < minEvaluationBudgetMs) return "budget";
    return null;
  };

  const canStartLiveEvaluation = (): boolean => getLiveEvaluationBlockReason() === null;

  const reserveLiveEvaluation = (domain: string): { allowed: true; budgetMs: number } | { allowed: false; reason: "limit" | "budget" } => {
    if (liveEvaluationsStarted >= maxLiveEvaluations) {
      result.skippedDueToLimit++;
      prefetchedData.set(domain, null);
      return { allowed: false, reason: "limit" };
    }

    const remainingBudgetMs = getRemainingBudgetMs();
    if (
      remainingBudgetMs !== null &&
      (remainingBudgetMs <= 0 || remainingBudgetMs < minEvaluationBudgetMs)
    ) {
      result.skippedDueToBudget++;
      prefetchedData.set(domain, null);
      return { allowed: false, reason: "budget" };
    }

    liveEvaluationsStarted++;
    return {
      allowed: true,
      budgetMs: Math.max(
        minEvaluationBudgetMs,
        Math.min(evalTimeoutMs, remainingBudgetMs ?? evalTimeoutMs),
      ),
    };
  };

  // Core evaluation function: evaluate ONE domain, store result in cache and prefetchedData.
  const evaluateDomain = async (domain: string, budgetMs: number): Promise<CachedReliabilityData | null> => {
    if (!isImportantSourceWithConfig(domain, runtimeConfig)) {
      console.log(`[SR] Skipping unimportant source: ${domain}`);
      prefetchedData.set(domain, null);
      return null;
    }

    try {
      let hadEvalError = false;
      const evalResult = await evaluateSourceInternal(domain, runtimeConfig, (errInfo) => {
        hadEvalError = true;
        result.errorCount++;
        result.errorByType[errInfo.type] = (result.errorByType[errInfo.type] ?? 0) + 1;
        if (!result.failedDomains.includes(domain)) result.failedDomains.push(domain);
        if (result.errorSamples.length < 20) result.errorSamples.push(errInfo);
      }, budgetMs);

      if (evalResult) {
        if (evalResult.transient) {
          prefetchedData.set(domain, null);
          result.noConsensusCount++;
          console.log(`[SR] Transient evaluation skipped for ${domain}: ${evalResult.reasoning ?? "budget guard"}`);
          return null;
        }

        const data: CachedReliabilityData = {
          score: evalResult.score,
          confidence: evalResult.confidence,
          consensusAchieved: evalResult.consensusAchieved,
        };
        prefetchedData.set(domain, data);
        result.evaluated++;
        await setCachedScore(
          domain,
          evalResult.score,
          evalResult.confidence,
          evalResult.modelPrimary,
          evalResult.modelSecondary,
          evalResult.consensusAchieved,
          evalResult.reasoning,
          evalResult.category,
          evalResult.biasIndicator,
          evalResult.evidenceCited,
          evalResult.evidencePack,
          undefined, // fallbackUsed
          undefined, // fallbackReason
          evalResult.identifiedEntity,
          evalResult.sourceType,
        );
        const scoreStr = evalResult.score !== null ? evalResult.score.toFixed(2) : "null";
        console.log(`[SR] Evaluated ${domain}: score=${scoreStr}, confidence=${evalResult.confidence.toFixed(2)}, consensus=${evalResult.consensusAchieved}`);
        return data;
      } else {
        prefetchedData.set(domain, null);
        if (hadEvalError) {
          console.log(`[SR] Evaluation failed for ${domain} — using unknown reliability (null score)`);
        } else {
          result.noConsensusCount++;
          console.log(`[SR] No consensus for ${domain}`);
        }
        return null;
      }
    } catch (err) {
      console.error(`[SR] Error evaluating ${domain}:`, err);
      result.errorCount++;
      result.errorByType.unknown = (result.errorByType.unknown ?? 0) + 1;
      if (!result.failedDomains.includes(domain)) result.failedDomains.push(domain);
      if (result.errorSamples.length < 20) {
        result.errorSamples.push({
          domain,
          type: "unknown",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      prefetchedData.set(domain, null);
      return null;
    }
  };

  const evaluateDomainsWithLimits = async (domainsToEvaluate: string[], label: string): Promise<void> => {
    const uniqueDomainsToEvaluate = [...new Set(domainsToEvaluate)];
    let i = 0;
    let batchIndex = 0;

    while (i < uniqueDomainsToEvaluate.length) {
      const batch: Array<{ domain: string; budgetMs: number }> = [];

      while (i < uniqueDomainsToEvaluate.length && batch.length < evalConcurrency) {
        const domain = uniqueDomainsToEvaluate[i++];
        if (prefetchedData.has(domain)) continue;

        if (!isImportantSourceWithConfig(domain, runtimeConfig)) {
          console.log(`[SR] Skipping unimportant source: ${domain}`);
          prefetchedData.set(domain, null);
          continue;
        }

        const reservation = reserveLiveEvaluation(domain);
        if (!reservation.allowed) {
          console.log(`[SR] Skipping live evaluation for ${domain}: ${reservation.reason}`);
          continue;
        }

        batch.push({ domain, budgetMs: reservation.budgetMs });
      }

      if (batch.length === 0) continue;

      batchIndex++;
      const totalBatches = Math.ceil(uniqueDomainsToEvaluate.length / Math.max(1, evalConcurrency));
      console.log(`[SR] ${label} batch ${batchIndex}/${totalBatches}: ${batch.map((item) => item.domain).join(", ")}`);
      await Promise.all(batch.map((item) => evaluateDomain(item.domain, item.budgetMs)));
    }
  };

  // Pass 1: evaluate every miss domain directly (no root redirect).
  // Each domain is evaluated on its own merits and its result stored under its own name.
  const uniqueMisses = [...new Set(misses)];
  await evaluateDomainsWithLimits(uniqueMisses, "Pass 1");

  // Pass 2 (fallback enabled only): for domains whose score is still null after Pass 1,
  // evaluate their root domain. The root domain result is stored under its own name and the
  // in-memory prefetch map is updated so sync lookups return the root's score for the subdomain.
  if (useRootFallback) {
    // Collect unique root domains needed, deduplicated across subdomains
    const rootsNeeded = new Map<string, string[]>(); // root → [null-score subdomains that need it]
    for (const domain of uniqueMisses) {
      const data = prefetchedData.get(domain);
      if (!data || data.score === null) {
        const root = getFamilyDomain(domain);
        if (root !== domain) {
          const list = rootsNeeded.get(root) ?? [];
          list.push(domain);
          rootsNeeded.set(root, list);
        }
      }
    }

    if (rootsNeeded.size > 0) {
      // Root domains may already be in the persistent cache — check before evaluating
      const cachedRoots = await batchGetCachedData([...rootsNeeded.keys()]);
      const rootsToEvaluate: string[] = [];
      for (const [root, subdomains] of rootsNeeded) {
        const cachedRoot = cachedRoots.get(root);
        if (cachedRoot && cachedRoot.score !== null) {
          const data: CachedReliabilityData = {
            score: cachedRoot.score,
            confidence: cachedRoot.confidence,
            consensusAchieved: cachedRoot.consensusAchieved,
          };
          prefetchedData.set(root, data);
          result.cacheHits++;
          console.log(`[SR] Root domain ${root} found in cache (score=${cachedRoot.score.toFixed(2)}), applying to: ${subdomains.join(", ")}`);
          for (const subdomain of subdomains) prefetchedData.set(subdomain, data);
        } else {
          rootsToEvaluate.push(root);
        }
      }

      // Evaluate root domains not found in cache only if a live SR slot remains.
      if (rootsToEvaluate.length > 0 && canStartLiveEvaluation()) {
        await evaluateDomainsWithLimits(rootsToEvaluate, "Pass 2 (root fallback)");
      } else if (rootsToEvaluate.length > 0) {
        const blockReason = getLiveEvaluationBlockReason() ?? "limit";
        const skippedEvaluationRoots = rootsToEvaluate.filter((root) => {
          prefetchedData.set(root, null);
          if (!isImportantSourceWithConfig(root, runtimeConfig)) {
            console.log(`[SR] Skipping unimportant source: ${root}`);
            return false;
          }
          return true;
        });
        if (blockReason === "limit") {
          result.skippedDueToLimit += skippedEvaluationRoots.length;
        } else {
          result.skippedDueToBudget += skippedEvaluationRoots.length;
        }
        console.log(
          `[SR] Skipping Pass 2 root fallback for ${skippedEvaluationRoots.length} root domain(s): live evaluation ${blockReason} exhausted`,
        );
      }
      for (const root of rootsToEvaluate) {
        const rootData = prefetchedData.get(root);
        if (rootData && rootData.score !== null) {
          for (const subdomain of rootsNeeded.get(root) ?? []) {
            prefetchedData.set(subdomain, rootData);
          }
        }
      }
    }
  }

  console.log(
    `[SR] Prefetch complete: ${prefetchedData.size} domains total; ` +
    `${result.evaluated} evaluated, ${result.cacheHits} cache hit(s), ` +
    `${result.skippedDueToLimit} skipped by limit, ${result.skippedDueToBudget} skipped by budget`,
  );
  if (result.errorCount > 0) {
    console.warn(
      `[SR] Prefetch had ${result.errorCount} evaluation error(s) across ${result.failedDomains.length} domain(s). ` +
      `Types: ${JSON.stringify(result.errorByType)}`
    );
  }
  return result;
}

// ============================================================================
// PHASE 2: SYNC LOOKUP
// ============================================================================

/**
 * Get track record score for a URL (SYNC - no await).
 * Reads from the prefetched in-memory map.
 *
 * Call prefetchSourceReliability() first to populate the map.
 */
export function getTrackRecordScore(url: string): number | null {
  if (!SR_CONFIG.enabled) return null;

  const domain = extractDomain(url);
  if (!domain) return null;

  const data = getPrefetchedReliability(domain);
  return data?.score ?? null;
}

/**
 * Get full track record data for a URL (SYNC - no await).
 * Returns score, confidence, and consensus data.
 *
 * Call prefetchSourceReliability() first to populate the map.
 */
export function getTrackRecordData(url: string): CachedReliabilityData | null {
  if (!SR_CONFIG.enabled) return null;

  const domain = extractDomain(url);
  if (!domain) return null;

  const data = getPrefetchedReliability(domain);
  return data ?? null;
}

function resolveCachedReliability(
  domain: string,
  cached: Map<string, CachedReliabilityDataFromCache>,
): CachedReliabilityData | null {
  for (const candidate of getDomainLookupChain(domain)) {
    const data = cached.get(candidate);
    // Skip null-score entries — fall through to the parent domain which may have a score.
    if (!data || data.score === null) continue;
    return {
      score: data.score,
      confidence: data.confidence,
      consensusAchieved: data.consensusAchieved,
    };
  }

  return null;
}

function getPrefetchedReliability(domain: string): CachedReliabilityData | null {
  for (const candidate of getDomainLookupChain(domain)) {
    const data = prefetchedData.get(candidate);
    // Skip null-score entries — fall through to the parent domain which may have a score.
    if (data && data.score !== null) return data;
  }

  return null;
}

// ============================================================================
// LLM EVALUATION (Internal API Call)
// ============================================================================

interface SourceReliabilityEvidenceItem {
  claim: string;
  basis: string;
  recency?: string;
}

interface EvaluationResult {
  score: number | null;
  confidence: number;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
  reasoning?: string;
  category?: string;
  biasIndicator?: string | null;
  evidencePack?: unknown;
  bias?: {
    politicalBias: string;
    otherBias?: string | null;
  };
  evidenceCited?: SourceReliabilityEvidenceItem[];
  caveats?: string[];
  identifiedEntity?: string | null;
  sourceType?: string | null;
  transient?: boolean;
}

/**
 * Call the internal evaluation API endpoint.
 * This is only called during prefetch (async phase).
 */
async function evaluateSourceInternal(
  domain: string,
  config: SourceReliabilityConfig,
  onError?: (event: SourceReliabilityErrorEvent) => void,
  budgetMs?: number,
): Promise<EvaluationResult | null> {
  const baseUrl = process.env.FH_INTERNAL_API_URL || "http://localhost:3000";
  const runnerKey = process.env.FH_INTERNAL_RUNNER_KEY || "";

  // **P0 FIX**: Add timeout to prevent indefinite hangs (90 sec max per domain)
  const EVAL_TIMEOUT_MS = Math.max(
    10000,
    Math.min(config.evalTimeoutMs ?? 90000, budgetMs ?? config.evalTimeoutMs ?? 90000),
  );
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EVAL_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/internal/evaluate-source`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Runner-Key": runnerKey,
      },
      body: JSON.stringify({
        domain,
        multiModel: config.multiModel,
        confidenceThreshold: config.confidenceThreshold,
        consensusThreshold: config.consensusThreshold,
        budgetMs: EVAL_TIMEOUT_MS,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorType = classifySourceReliabilityHttpError(response.status);
      const message = `HTTP ${response.status} ${response.statusText}`.trim();
      onError?.({
        domain,
        type: errorType,
        statusCode: response.status,
        message,
      });
      console.error(
        `[SR] Evaluation API error for ${domain}: ${message}`
      );
      return null;
    }

    const data = await response.json();
    return data as EvaluationResult;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errorType = classifySourceReliabilityTransportError(err);
    const message = err instanceof Error ? err.message : String(err);
    onError?.({
      domain,
      type: errorType,
      message,
    });
    if (err?.name === 'AbortError') {
      console.error(`[SR] Evaluation timeout for ${domain} after ${EVAL_TIMEOUT_MS}ms`);
    } else {
      console.error(`[SR] Evaluation API call failed for ${domain}:`, err);
    }
    return null;
  }
}

function classifySourceReliabilityHttpError(statusCode: number): SourceReliabilityErrorType {
  if (statusCode === 401) return "http_401";
  if (statusCode === 403) return "http_403";
  if (statusCode === 429) return "http_429";
  if (statusCode >= 500 && statusCode <= 599) return "http_5xx";
  return "http_other";
}

function classifySourceReliabilityTransportError(err: any): SourceReliabilityErrorType {
  if (err?.name === "AbortError") return "timeout";
  const code = String(err?.code ?? err?.cause?.code ?? "").toUpperCase();
  if (code === "ECONNREFUSED") return "connection_refused";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ECONNRESET" || code === "ETIMEDOUT") {
    return "network";
  }
  return "unknown";
}

// ============================================================================
// SCORE NORMALIZATION (Defensive)
// ============================================================================

/**
 * Normalize trackRecordScore to 0-1 range
 * Handles both 0-1 and 0-100 scales defensively.
 */
export function normalizeTrackRecordScore(score: number): number {
  // Handle invalid values
  if (!Number.isFinite(score)) {
    console.warn(`[SR] Invalid trackRecordScore: ${score}, defaulting to 0.5`);
    return 0.5;
  }

  // If score > 1, assume it's on 0-100 scale and convert
  if (score > 1) {
    console.warn(`[SR] trackRecordScore > 1 detected (${score}), converting from 0-100 scale`);
    score = score / 100;
  }

  // Clamp to valid range
  return Math.max(0, Math.min(1, score));
}

// ============================================================================
// EVIDENCE WEIGHTING
// ============================================================================

/**
 * Options for evidence weighting.
 * `unknownSourceScore` is app-defined; SR defaults to null for unknown sources.
 */
export interface EvidenceWeightingOptions {
  unknownSourceScore?: number | null;
}

/**
 * Extended source reliability data for verdict calculation.
 * Includes confidence and consensus in addition to score.
 */
export interface SourceReliabilityData {
  score: number;
  confidence: number;
  consensusAchieved: boolean;
}

/**
 * Calculate effective reliability weight combining score, confidence, and consensus.
 * 
 * Formula: effectiveWeight = score × confidenceMultiplier × consensusBonus
 * 
 * With the 7-band scale, the score directly represents reliability level.
 * Confidence is used for filtering (threshold gate) but not for weighting.
 * If a score passes the confidence threshold, we trust it as-is.
 */
export function calculateEffectiveWeight(data: SourceReliabilityData): number {
  // Simple: effective weight = score
  // Confidence already filtered out low-quality evaluations (threshold gate)
  // If it passed that gate, the score IS the effective weight
  return data.score;
}

/**
 * Apply evidence weighting based on source track record scores.
 * 
 * 7-band credibility scale (centered at 0.5):
 * - 0.86-1.00: highly_reliable (verdict fully preserved)
 * - 0.72-0.86: reliable (verdict mostly preserved)
 * - 0.58-0.72: leaning_reliable (moderate preservation)
 * - 0.43-0.57: mixed (variable track record, appropriate skepticism)
 * - 0.29-0.43: leaning_unreliable (pulls verdict toward neutral)
 * - 0.15-0.29: unreliable (strong pull toward neutral)
 * - 0.00-0.15: highly_unreliable (maximum skepticism)
 * - null: insufficient_data (unknown source, no assessments)
 * 
 * Formula: adjustedTruth = 50 + (originalTruth - 50) * avgEffectiveWeight
 *
 * Unknown-source handling is consumer-defined via `options.unknownSourceScore`.
 * If omitted/null, unknown sources are excluded from weighting.
 */
interface WeightableVerdict {
  truthPercentage: number;
  confidence: number;
  supportingEvidenceIds: string[];
}

export function applyEvidenceWeighting<T extends WeightableVerdict>(
  claimVerdicts: T[],
  evidenceItems: EvidenceItem[],
  sources: FetchedSource[],
  options: EvidenceWeightingOptions = {}
): T[] {
  // Build source reliability data map
  const sourceDataById = new Map<string, SourceReliabilityData | null>(
    sources.map((s) => [
      s.id,
      s.trackRecordScore !== null
        ? {
            score: normalizeTrackRecordScore(s.trackRecordScore),
            confidence: s.trackRecordConfidence ?? SR_CONFIG.defaultConfidence, // Default confidence from UCM
            consensusAchieved: s.trackRecordConsensus ?? false,
          }
        : null,
    ])
  );

  // Map evidence items to their source reliability data
  const evidenceDataById = new Map(
    evidenceItems.map((item) => [item.id, sourceDataById.get(item.sourceId) ?? null])
  );

  return claimVerdicts.map((verdict) => {
    const supportingEvidenceIds: string[] =
      verdict.supportingEvidenceIds && verdict.supportingEvidenceIds.length > 0
        ? verdict.supportingEvidenceIds
        : [];
    const reliabilityData = supportingEvidenceIds
      .map((id) => evidenceDataById.get(id) ?? null);

    // Calculate effective weights for each source
    const weights = reliabilityData
      .map((data) => {
      if (data === null) {
        if (options.unknownSourceScore === null || options.unknownSourceScore === undefined) {
          return null;
        }
        return normalizeTrackRecordScore(options.unknownSourceScore);
      }
      return calculateEffectiveWeight(data);
    })
      .filter((weight): weight is number => weight !== null);

    // If no evidence/sources, return verdict unchanged
    if (weights.length === 0) return verdict;

    // Calculate average effective weight
    const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;

    // Count known vs unknown sources for transparency
    const knownCount = reliabilityData.filter((d) => d !== null).length;
    const unknownCount = reliabilityData.filter((d) => d === null).length;

    // Adjust truth: pull toward/away from neutral (50) based on source reliability
    const adjustedTruth = Math.round(50 + (verdict.truthPercentage - 50) * avgWeight);
    
    // Adjust confidence: scale by reliability
    const adjustedConfidence = Math.round(verdict.confidence * (0.5 + avgWeight / 2));

    // Validate truth percentage is in valid range (SR adjustment can produce edge-case values)
    const clampedTruth = assertValidTruthPercentage(Math.round(adjustedTruth), "SR-adjusted truth");
    const clampedConfidence = Math.max(0, Math.min(100, adjustedConfidence));

    return {
      ...verdict,
      evidenceWeight: avgWeight,
      sourceReliabilityMeta: {
        knownSources: knownCount,
        unknownSources: unknownCount,
        avgWeight,
      },
      truthPercentage: clampedTruth,
      confidence: clampedConfidence,
      verdict: percentageToClaimVerdict(clampedTruth, clampedConfidence),
      highlightColor: normalizeHighlightColor(
        getHighlightColor7Point(clampedTruth)
      ),
    } as T; // Safe: spread preserves all T properties, we only override shared fields
  });
}

/**
 * 7-band credibility level for source reliability assessment.
 * 
 * Band 7 (86-100%): Highly Reliable - Verified accuracy, recognized standards body
 * Band 6 (72-85%): Reliable - Consistent accuracy, professional standards
 * Band 5 (58-71%): Leaning Reliable - Often accurate, corrects when notified
 * Band 4 (43-57%): Mixed - Variable accuracy, inconsistent quality
 * Band 3 (29-42%): Leaning Unreliable - Often inaccurate, slow to correct
 * Band 2 (15-28%): Unreliable - Pattern of false claims, ignores corrections
 * Band 1 (0-14%): Highly Unreliable - Fabricates content, documented disinformation
 * Null: Insufficient Data - Unknown source, no assessments exist
 */
export type CredibilityLevel7Band =
  | "ESTABLISHED_AUTHORITY"       // 0.86-1.00
  | "HIGH_CREDIBILITY"            // 0.72-0.86
  | "GENERALLY_CREDIBLE"          // 0.58-0.72
  | "MIXED_TRACK_RECORD"          // 0.43-0.57 (neutral center)
  | "QUESTIONABLE_CREDIBILITY"    // 0.29-0.43
  | "LOW_CREDIBILITY"             // 0.15-0.29
  | "KNOWN_DISINFORMATION"        // 0.00-0.15
  | "UNKNOWN";                    // no data

/**
 * Convert score to 7-band credibility level.
 */
export function scoreToCredibilityLevel(
  score: number,
  bands?: { TRUE: number; MOSTLY_TRUE: number; LEANING_TRUE: number; MIXED: number; LEANING_FALSE: number; MOSTLY_FALSE: number },
): CredibilityLevel7Band {
  // Bands are on 0-100 scale; scores are 0-1 scale — divide by 100
  const b = bands ?? { TRUE: 86, MOSTLY_TRUE: 72, LEANING_TRUE: 58, MIXED: 43, LEANING_FALSE: 29, MOSTLY_FALSE: 15 };
  if (score >= b.TRUE / 100) return "ESTABLISHED_AUTHORITY";
  if (score >= b.MOSTLY_TRUE / 100) return "HIGH_CREDIBILITY";
  if (score >= b.LEANING_TRUE / 100) return "GENERALLY_CREDIBLE";
  if (score >= b.MIXED / 100) return "MIXED_TRACK_RECORD";
  if (score >= b.LEANING_FALSE / 100) return "QUESTIONABLE_CREDIBILITY";
  if (score >= b.MOSTLY_FALSE / 100) return "LOW_CREDIBILITY";
  return "KNOWN_DISINFORMATION";
}

export function calculateOverallCredibility(
  sources: FetchedSource[],
  _evidenceItems: EvidenceItem[]
): {
  averageScore: number;
  knownSourceCount: number;
  unknownSourceCount: number;
  credibilityLevel: CredibilityLevel7Band;
} {
  const scores = sources
    .map((s) => s.trackRecordScore)
    .filter((s): s is number => s !== null);

  const knownSourceCount = scores.length;
  const unknownSourceCount = sources.length - knownSourceCount;

  if (scores.length === 0) {
    return {
      averageScore: 0,
      knownSourceCount: 0,
      unknownSourceCount: sources.length,
      credibilityLevel: "UNKNOWN",
    };
  }

  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // 7-band credibility level matching symmetric reliability scale
  const credibilityLevel = scoreToCredibilityLevel(averageScore);

  return {
    averageScore,
    knownSourceCount,
    unknownSourceCount,
    credibilityLevel,
  };
}

// ============================================================================
// LEGACY COMPATIBILITY (to be removed)
// ============================================================================
