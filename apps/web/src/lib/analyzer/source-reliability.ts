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
import { batchGetCachedData, setCachedScore, type CachedReliabilityDataFromCache } from "../source-reliability-cache";

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

/**
 * Cached reliability data for a domain.
 * Stores all evaluation properties, not just score.
 */
export interface CachedReliabilityData {
  score: number;
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
 * Returns info about what was prefetched for logging.
 */
export interface PrefetchResult {
  domains: string[];
  alreadyPrefetched: number;
  cacheHits: number;
  evaluated: number;
}

export async function prefetchSourceReliability(urls: string[]): Promise<PrefetchResult> {
  const result: PrefetchResult = { domains: [], alreadyPrefetched: 0, cacheHits: 0, evaluated: 0 };
  
  if (!SR_CONFIG.enabled) {
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

  // Batch cache lookup - now returns full data
  const cached = await batchGetCachedData(newDomains);
  result.cacheHits = cached.size;
  console.log(`[SR] Cache hits: ${cached.size}/${newDomains.length}`);

  // Populate map with cached values (full data)
  for (const [domain, data] of cached) {
    prefetchedData.set(domain, {
      score: data.score,
      confidence: data.confidence,
      consensusAchieved: data.consensusAchieved,
    });
  }

  // Find cache misses that need evaluation
  const misses = newDomains.filter((d) => !cached.has(d));

  for (const domain of misses) {
    // Apply importance filter
    if (!isImportantSource(domain)) {
      console.log(`[SR] Skipping unimportant source: ${domain}`);
      prefetchedData.set(domain, null);
      continue;
    }

    // Evaluate via internal API
    try {
      const evalResult = await evaluateSourceInternal(domain);
      if (evalResult) {
        prefetchedData.set(domain, {
          score: evalResult.score,
          confidence: evalResult.confidence,
          consensusAchieved: evalResult.consensusAchieved,
        });
        result.evaluated++;
        // Cache the result
        await setCachedScore(
          domain,
          evalResult.score,
          evalResult.confidence,
          evalResult.modelPrimary,
          evalResult.modelSecondary,
          evalResult.consensusAchieved
        );
        console.log(
          `[SR] Evaluated ${domain}: score=${evalResult.score.toFixed(2)}, confidence=${evalResult.confidence.toFixed(2)}, consensus=${evalResult.consensusAchieved}`
        );
      } else {
        prefetchedData.set(domain, null);
        console.log(`[SR] No consensus for ${domain}`);
      }
    } catch (err) {
      console.error(`[SR] Error evaluating ${domain}:`, err);
      prefetchedData.set(domain, null);
    }
  }

  console.log(`[SR] Prefetch complete: ${prefetchedData.size} domains total`);
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

  // Sync lookup from prefetched map
  const data = prefetchedData.get(domain);
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

  // Sync lookup from prefetched map
  const data = prefetchedData.get(domain);
  return data ?? null;
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

/**
 * Clamp truth percentage to valid [0, 100] range
 */
export function clampTruthPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 50; // Default to neutral if invalid
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

// ============================================================================
// EVIDENCE WEIGHTING
// ============================================================================

/**
 * Default score for unknown sources (sources without reliability data).
 * 
 * Set to 0.5 (50%) which represents the neutral center of the symmetric scale:
 * - Above 0.5: Positive boost to verdict preservation (trusted sources)
 * - At 0.5: No change (neutral/unknown - appropriate skepticism)
 * - Below 0.5: Pull verdict toward neutral (skepticism for unreliable sources)
 * 
 * Unknown sources use this with low confidence (0.5), resulting in:
 * effectiveWeight = 0.5 + (0.5 - 0.5) × spread × 0.5 = 0.5 (neutral)
 * 
 * Configurable via FH_SR_DEFAULT_SCORE environment variable.
 */
export const DEFAULT_UNKNOWN_SOURCE_SCORE = parseFloat(
  process.env.FH_SR_DEFAULT_SCORE || "0.5"
);

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
 * - confidenceMultiplier: Scales impact based on how confident the evaluation was
 *   Low confidence (0.5) → 0.75 multiplier, High confidence (1.0) → 1.0 multiplier
 * 
 * - consensusBonus: Multi-model agreement boosts trust slightly
 *   No consensus → 1.0, Consensus achieved → 1.05 (5% boost, capped at 1.0 final)
 */
// Fixed blend center for mathematical stability (NOT configurable)
// 0.5 = "we don't know" - the neutral point for uncertain scores
const BLEND_CENTER = 0.5;

// Spread multiplier: amplifies deviation from neutral (configurable via env)
const SPREAD_MULTIPLIER = parseFloat(process.env.FH_SR_SPREAD_MULTIPLIER || "1.5");

// Consensus spread multiplier: extra spread when models agree (configurable via env)
const CONSENSUS_SPREAD_MULTIPLIER = parseFloat(process.env.FH_SR_CONSENSUS_SPREAD_MULTIPLIER || "1.15");

export function calculateEffectiveWeight(data: SourceReliabilityData): number {
  const { score, confidence, consensusAchieved } = data;
  
  // Calculate deviation from neutral
  const deviation = score - BLEND_CENTER;
  
  // Consensus multiplies spread (agreement = more impact from score deviation)
  const consensusFactor = consensusAchieved ? CONSENSUS_SPREAD_MULTIPLIER : 1.0;
  const amplifiedDeviation = deviation * SPREAD_MULTIPLIER * confidence * consensusFactor;
  
  // Calculate effective weight, clamped to [0, 1]
  const effectiveWeight = Math.max(0, Math.min(1.0, BLEND_CENTER + amplifiedDeviation));
  
  return effectiveWeight;
}

/**
 * Apply evidence weighting based on source track record scores.
 * 
 * Symmetric 7-band scale (matches verdict scale, centered at 0.5):
 * - 0.86-1.00: highly_reliable (verdict fully preserved)
 * - 0.72-0.86: reliable (verdict mostly preserved)
 * - 0.58-0.72: mostly_reliable (slight preservation)
 * - 0.43-0.57: uncertain (neutral center, appropriate skepticism)
 * - 0.29-0.43: mostly_unreliable (pulls verdict toward neutral)
 * - 0.15-0.29: unreliable (strong pull toward neutral)
 * - 0.00-0.15: highly_unreliable (maximum skepticism)
 * 
 * Formula: adjustedTruth = 50 + (originalTruth - 50) * avgEffectiveWeight
 * 
 * The effective weight incorporates:
 * - Score: Base reliability rating (symmetric scale centered at 0.5)
 * - Confidence: How confident the LLM was in its evaluation  
 * - Consensus: Whether multiple models agreed (multiplies spread)
 */
export function applyEvidenceWeighting(
  claimVerdicts: ClaimVerdict[],
  facts: ExtractedFact[],
  sources: FetchedSource[]
): ClaimVerdict[] {
  // Build source reliability data map
  const sourceDataById = new Map<string, SourceReliabilityData | null>(
    sources.map((s) => [
      s.id,
      s.trackRecordScore !== null
        ? {
            score: normalizeTrackRecordScore(s.trackRecordScore),
            confidence: s.trackRecordConfidence ?? 0.7, // Default confidence if not available
            consensusAchieved: s.trackRecordConsensus ?? false,
          }
        : null,
    ])
  );

  // Map facts to their source reliability data
  const factDataById = new Map(
    facts.map((f) => [f.id, sourceDataById.get(f.sourceId) ?? null])
  );

  return claimVerdicts.map((verdict) => {
    const factIds = verdict.supportingFactIds ?? [];
    const reliabilityData = factIds
      .map((id) => factDataById.get(id))
      .filter((data): data is SourceReliabilityData | null => true);

    // Calculate effective weights for each source
    const weights = reliabilityData.map((data) => {
      if (data === null) {
        // Unknown source: use default score with moderate confidence, no consensus
        return calculateEffectiveWeight({
          score: DEFAULT_UNKNOWN_SOURCE_SCORE,
          confidence: 0.5, // Low confidence for unknown sources
          consensusAchieved: false,
        });
      }
      return calculateEffectiveWeight(data);
    });

    // If no facts/sources, return verdict unchanged
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

    // Clamp to valid ranges
    const clampedTruth = clampTruthPercentage(adjustedTruth);
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
      verdict: clampedTruth,
      highlightColor: normalizeHighlightColor(
        getHighlightColor7Point(clampedTruth)
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

  // Credibility levels aligned with symmetric 7-band scale (centered at 0.5)
  let credibilityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  if (averageScore >= 0.58) {
    credibilityLevel = "HIGH";      // mostly_reliable + reliable + highly_reliable (0.58+)
  } else if (averageScore >= 0.43) {
    credibilityLevel = "MEDIUM";    // uncertain (0.43-0.57, neutral center)
  } else {
    credibilityLevel = "LOW";       // mostly_unreliable + unreliable + highly_unreliable (<0.43)
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
