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
import { getHighlightColor7Point, normalizeHighlightColor } from "./truth-scale";
import type { ClaimVerdict, ExtractedFact, FetchedSource } from "./types";
import { batchGetCachedScores, setCachedScore } from "../source-reliability-cache";

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_SKIP_PLATFORMS =
  "blogspot.,wordpress.com,medium.com,substack.com,tumblr.com,wix.com,weebly.com,squarespace.com,ghost.io,blogger.com,sites.google.com,github.io,netlify.app,vercel.app,herokuapp.com";
const DEFAULT_SKIP_TLDS =
  "xyz,top,club,icu,buzz,tk,ml,ga,cf,gq,work,click,link,win,download,stream";

const SKIP_PLATFORMS = (
  process.env.FH_SR_SKIP_PLATFORMS || DEFAULT_SKIP_PLATFORMS
).split(",");
const SKIP_TLDS = (process.env.FH_SR_SKIP_TLDS || DEFAULT_SKIP_TLDS).split(",");

export const SR_CONFIG = {
  enabled: process.env.FH_SR_ENABLED !== "false",
  confidenceThreshold: parseFloat(
    process.env.FH_SR_CONFIDENCE_THRESHOLD || "0.8"
  ),
  cacheTtlDays: parseInt(process.env.FH_SR_CACHE_TTL_DAYS || "90", 10),
  multiModel: process.env.FH_SR_MULTI_MODEL !== "false",
  consensusThreshold: parseFloat(
    process.env.FH_SR_CONSENSUS_THRESHOLD || "0.15"
  ),
  filterEnabled: process.env.FH_SR_FILTER_ENABLED !== "false",
  rateLimitPerIp: parseInt(process.env.FH_SR_RATE_LIMIT_PER_IP || "10", 10),
  domainCooldownSec: parseInt(
    process.env.FH_SR_RATE_LIMIT_DOMAIN_COOLDOWN || "60",
    10
  ),
};

// ============================================================================
// IN-MEMORY MAP (populated by prefetch, read by sync lookup)
// ============================================================================

let prefetchedScores: Map<string, number | null> = new Map();

/**
 * Clear the prefetched scores map (for testing or reset)
 */
export function clearPrefetchedScores(): void {
  prefetchedScores = new Map();
}

// ============================================================================
// DOMAIN UTILITIES
// ============================================================================

/**
 * Extract and normalize domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // Strip www. prefix and trailing dots
    return hostname.replace(/^www\./, "").replace(/\.+$/, "");
  } catch {
    return null;
  }
}

/**
 * Check if a source is "important" enough to warrant LLM evaluation.
 * Uses a blacklist approach: skip known blog platforms and spam TLDs.
 */
export function isImportantSource(domain: string): boolean {
  if (!SR_CONFIG.filterEnabled) return true;

  // 1. Skip user-content platforms (configurable list)
  if (SKIP_PLATFORMS.some((p) => domain.includes(p))) {
    return false;
  }

  // 2. Skip domains that look like personal/generated sites
  const subdomain = domain.split(".")[0];
  if (/\d{4,}/.test(subdomain)) return false; // Contains 4+ digits
  if (subdomain.length > 30) return false; // Very long subdomain

  // 3. Skip exotic/spam-associated TLDs (configurable list)
  const tld = domain.split(".").pop()?.toLowerCase() || "";
  if (SKIP_TLDS.includes(tld)) {
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
 */
export async function prefetchSourceReliability(urls: string[]): Promise<void> {
  if (!SR_CONFIG.enabled) {
    console.log("[SR] Source reliability disabled");
    return;
  }

  // Extract unique domains
  const domains = urls
    .map(extractDomain)
    .filter((d): d is string => d !== null);
  const uniqueDomains = [...new Set(domains)];

  if (uniqueDomains.length === 0) {
    console.log("[SR] No domains to prefetch");
    return;
  }

  console.log(`[SR] Prefetching ${uniqueDomains.length} unique domains`);

  // Batch cache lookup
  const cached = await batchGetCachedScores(uniqueDomains);
  console.log(`[SR] Cache hits: ${cached.size}/${uniqueDomains.length}`);

  // Populate map with cached values
  for (const [domain, score] of cached) {
    prefetchedScores.set(domain, score);
  }

  // Find cache misses that need evaluation
  const misses = uniqueDomains.filter((d) => !cached.has(d));

  for (const domain of misses) {
    // Apply importance filter
    if (!isImportantSource(domain)) {
      console.log(`[SR] Skipping unimportant source: ${domain}`);
      prefetchedScores.set(domain, null);
      continue;
    }

    // Evaluate via internal API
    try {
      const result = await evaluateSourceInternal(domain);
      if (result) {
        prefetchedScores.set(domain, result.score);
        // Cache the result
        await setCachedScore(
          domain,
          result.score,
          result.confidence,
          result.modelPrimary,
          result.modelSecondary,
          result.consensusAchieved
        );
        console.log(
          `[SR] Evaluated ${domain}: score=${result.score.toFixed(2)}, confidence=${result.confidence.toFixed(2)}`
        );
      } else {
        prefetchedScores.set(domain, null);
        console.log(`[SR] No consensus for ${domain}`);
      }
    } catch (err) {
      console.error(`[SR] Error evaluating ${domain}:`, err);
      prefetchedScores.set(domain, null);
    }
  }

  console.log(`[SR] Prefetch complete: ${prefetchedScores.size} domains`);
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

  // Sync lookup from prefetched map
  const score = prefetchedScores.get(domain);
  return score ?? null;
}

// ============================================================================
// LLM EVALUATION (Internal API Call)
// ============================================================================

interface EvaluationResult {
  score: number;
  confidence: number;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
}

/**
 * Call the internal evaluation API endpoint.
 * This is only called during prefetch (async phase).
 */
async function evaluateSourceInternal(
  domain: string
): Promise<EvaluationResult | null> {
  const baseUrl = process.env.FH_INTERNAL_API_URL || "http://localhost:3000";
  const runnerKey = process.env.FH_INTERNAL_RUNNER_KEY || "";

  try {
    const response = await fetch(`${baseUrl}/api/internal/evaluate-source`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Runner-Key": runnerKey,
      },
      body: JSON.stringify({
        domain,
        multiModel: SR_CONFIG.multiModel,
        confidenceThreshold: SR_CONFIG.confidenceThreshold,
        consensusThreshold: SR_CONFIG.consensusThreshold,
      }),
    });

    if (!response.ok) {
      console.error(
        `[SR] Evaluation API error for ${domain}: ${response.status}`
      );
      return null;
    }

    const data = await response.json();
    return data as EvaluationResult;
  } catch (err) {
    console.error(`[SR] Evaluation API call failed for ${domain}:`, err);
    return null;
  }
}

// ============================================================================
// EVIDENCE WEIGHTING
// ============================================================================

/**
 * Apply evidence weighting based on source track record scores
 */
export function applyEvidenceWeighting(
  claimVerdicts: ClaimVerdict[],
  facts: ExtractedFact[],
  sources: FetchedSource[]
): ClaimVerdict[] {
  const sourceScoreById = new Map(
    sources.map((s) => [s.id, s.trackRecordScore])
  );
  const factScoreById = new Map(
    facts.map((f) => [f.id, sourceScoreById.get(f.sourceId) ?? null])
  );

  return claimVerdicts.map((verdict) => {
    const factIds = verdict.supportingFactIds ?? [];
    const scores = factIds
      .map((id) => factScoreById.get(id))
      .filter((score): score is number => typeof score === "number");

    if (scores.length === 0) return verdict;

    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const adjustedTruth = Math.round(50 + (verdict.truthPercentage - 50) * avg);
    const adjustedConfidence = Math.round(verdict.confidence * (0.5 + avg / 2));

    return {
      ...verdict,
      evidenceWeight: avg,
      truthPercentage: adjustedTruth,
      confidence: adjustedConfidence,
      verdict: adjustedTruth,
      highlightColor: normalizeHighlightColor(
        getHighlightColor7Point(adjustedTruth)
      ),
    };
  });
}

/**
 * Calculate overall credibility score for an analysis
 */
export function calculateOverallCredibility(
  sources: FetchedSource[],
  _facts: ExtractedFact[]
): {
  averageScore: number;
  knownSourceCount: number;
  unknownSourceCount: number;
  credibilityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
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

  let credibilityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  if (averageScore >= 0.8) {
    credibilityLevel = "HIGH";
  } else if (averageScore >= 0.6) {
    credibilityLevel = "MEDIUM";
  } else {
    credibilityLevel = "LOW";
  }

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

/**
 * @deprecated Use prefetchSourceReliability() instead
 */
export function loadSourceBundle(): void {
  console.warn(
    "[SR] loadSourceBundle() is deprecated. Source reliability now uses LLM evaluation with caching."
  );
}
