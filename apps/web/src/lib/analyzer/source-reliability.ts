/**
 * FactHarbor Analyzer - Source Reliability
 *
 * Handles source track record scores and evidence weighting.
 * All scores come from the configured source bundle (FH_SOURCE_BUNDLE_PATH).
 *
 * @module analyzer/source-reliability
 */

import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "./config";
import { percentageToClaimVerdict, getHighlightColor7Point, normalizeHighlightColor } from "./truth-scale";
import type { ClaimVerdict, ExtractedFact, FetchedSource } from "./types";

// ============================================================================
// SOURCE TRACK RECORD
// ============================================================================

/**
 * Source reliability scores loaded from FH_SOURCE_BUNDLE_PATH
 * No hard-coded scores - all scores must come from the configured bundle.
 */
let SOURCE_TRACK_RECORDS: Record<string, number> = {};

/**
 * Load source reliability scores from external bundle if configured
 */
export function loadSourceBundle(): void {
  if (!CONFIG.sourceBundlePath) {
    console.log(
      `[FactHarbor] No source bundle configured (FH_SOURCE_BUNDLE_PATH not set)`,
    );
    return;
  }

  try {
    const bundlePath = path.resolve(CONFIG.sourceBundlePath);
    if (fs.existsSync(bundlePath)) {
      const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf-8"));
      if (bundle.sources && typeof bundle.sources === "object") {
        SOURCE_TRACK_RECORDS = bundle.sources;
        console.log(
          `[FactHarbor] Loaded ${Object.keys(bundle.sources).length} source scores from bundle`,
        );
      }
    } else {
      console.warn(`[FactHarbor] Source bundle not found: ${bundlePath}`);
    }
  } catch (err) {
    console.error(`[FactHarbor] Failed to load source bundle:`, err);
  }
}

// Load source bundle at module initialization
loadSourceBundle();

/**
 * Get track record score for a URL
 * Returns score from bundle if available, otherwise null (unknown).
 */
export function getTrackRecordScore(url: string): number | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    // Check exact match from bundle
    if (SOURCE_TRACK_RECORDS[hostname] !== undefined) {
      return SOURCE_TRACK_RECORDS[hostname];
    }

    // Check subdomain match from bundle
    for (const [domain, score] of Object.entries(SOURCE_TRACK_RECORDS)) {
      if (hostname.endsWith("." + domain)) return score;
    }

    // No default - unknown reliability
    return null;
  } catch {
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
  sources: FetchedSource[],
): ClaimVerdict[] {
  const sourceScoreById = new Map(
    sources.map((s) => [s.id, s.trackRecordScore]),
  );
  const factScoreById = new Map(
    facts.map((f) => [f.id, sourceScoreById.get(f.sourceId) ?? null]),
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
    const adjustedVerdict = percentageToClaimVerdict(adjustedTruth);

    return {
      ...verdict,
      evidenceWeight: avg,
      truthPercentage: adjustedTruth,
      confidence: adjustedConfidence,
      verdict: adjustedVerdict,
      highlightColor: normalizeHighlightColor(getHighlightColor7Point(adjustedVerdict)),
    };
  });
}

/**
 * Calculate overall credibility score for an analysis
 */
export function calculateOverallCredibility(
  sources: FetchedSource[],
  facts: ExtractedFact[],
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
  if (averageScore >= 80) {
    credibilityLevel = "HIGH";
  } else if (averageScore >= 60) {
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
