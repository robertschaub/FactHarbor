/**
 * Evidence Recency Assessment Module
 *
 * Handles temporal analysis of evidence including:
 * - Recency sensitivity detection
 * - Date extraction and parsing
 * - Graduated recency penalties
 *
 * @module analyzer/evidence-recency
 */

// DELETED: AnalysisContext import (Phase 4 cleanup - orchestrated pipeline only)
import type { EvidenceItem, ClaimUnderstanding } from "./types";

/**
 * Helper to push unique date candidates
 */
function pushDateCandidate(dates: Date[], seen: Set<string>, date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return;
  const key = date.toISOString().slice(0, 10);
  if (seen.has(key)) return;
  seen.add(key);
  dates.push(date);
}

/**
 * Recency validation result
 */
export interface RecencyValidationResult {
  hasRecentEvidence: boolean;
  latestEvidenceDate?: string;
  signalsCount: number;
  dateCandidates: number;
}

/**
 * Recency penalty calculation result
 */
export interface RecencyPenaltyResult {
  effectivePenalty: number;
  breakdown: {
    monthsOld: number | null;
    stalenessMultiplier: number;
    volatilityMultiplier: number;
    volumeMultiplier: number;
    formula: string;
  };
}

/**
 * Recency Assessor class
 *
 * Provides methods for temporal analysis of claims and evidence.
 */
export class RecencyAssessor {
  constructor(private currentDate: Date = new Date()) {}

  /**
   * Determine if a claim/topic is recency-sensitive
   * Checks for recent year mentions, temporal context fields, and custom cue terms
   */
  isRecencySensitive(
    text: string,
    understanding?: any,
    cueTerms?: string[],
  ): boolean {
    void cueTerms;

    // Check for recent date mentions (within last 3 years)
    const currentYear = this.currentDate.getFullYear();
    const recentYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    const yearPattern = /\b(20\d{2})\b/;
    const yearMatch = text.match(yearPattern);
    if (yearMatch) {
      const mentionedYear = parseInt(yearMatch[1]);
      if (recentYears.includes(mentionedYear)) {
        return true;
      }
    }

    // DELETED: analysisContexts check (Phase 4 cleanup - orchestrated pipeline only)

    return false;
  }

  /**
   * Extract date candidates from text using multiple patterns
   */
  extractDateCandidates(text: string): Date[] {
    const dates: Date[] = [];
    const seen = new Set<string>();
    const lower = String(text || "").toLowerCase();
    if (!lower) return dates;

    const currentYear = this.currentDate.getFullYear();
    const maxYear = currentYear + 1;

    // ISO dates: 2024-01-15 or 2024/01/15
    const isoPattern = /\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g;
    for (const match of lower.matchAll(isoPattern)) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      if (year < 1900 || year > maxYear) continue;
      pushDateCandidate(dates, seen, new Date(year, month, day));
    }

    // Quarters: Q1 2024, Q2 2024
    const quarterPattern = /\bq([1-4])\s*(20\d{2})\b/g;
    for (const match of lower.matchAll(quarterPattern)) {
      const quarter = Number(match[1]);
      const year = Number(match[2]);
      if (year < 1900 || year > maxYear) continue;
      const monthIndex = quarter * 3 - 1;
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      pushDateCandidate(dates, seen, new Date(year, monthIndex, lastDay));
    }

    // Year ranges: 2020-2024
    const rangePattern = /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/g;
    for (const match of lower.matchAll(rangePattern)) {
      const endYear = Number(match[2]);
      if (endYear < 1900 || endYear > maxYear) continue;
      pushDateCandidate(dates, seen, new Date(endYear, 11, 31));
    }

    // Standalone years: 2024
    const yearPattern = /\b(19|20)\d{2}\b/g;
    for (const match of lower.matchAll(yearPattern)) {
      const year = Number(match[0]);
      if (year < 1900 || year > maxYear) continue;
      pushDateCandidate(dates, seen, new Date(year, 11, 31));
    }

    return dates;
  }

  /**
   * Validate if evidence meets recency requirements
   */
  validateRecency(
    evidenceItems: EvidenceItem[],
    windowMonths: number
  ): RecencyValidationResult {
    const temporalSignals: string[] = [];
    for (const item of evidenceItems || []) {
      if (item?.evidenceScope?.temporal) temporalSignals.push(item.evidenceScope.temporal);
      if (item?.sourceTitle) temporalSignals.push(item.sourceTitle);
      if (item?.sourceUrl) temporalSignals.push(item.sourceUrl);
    }

    const dates: Date[] = [];
    for (const signal of temporalSignals) {
      dates.push(...this.extractDateCandidates(signal));
    }

    let latestDate: Date | undefined;
    for (const d of dates) {
      if (!latestDate || d > latestDate) latestDate = d;
    }

    const cutoff = new Date(this.currentDate);
    cutoff.setMonth(cutoff.getMonth() - Math.max(1, windowMonths));
    const hasRecentEvidence = !!latestDate && latestDate >= cutoff;

    return {
      hasRecentEvidence,
      latestEvidenceDate: latestDate ? latestDate.toISOString() : undefined,
      signalsCount: temporalSignals.length,
      dateCandidates: dates.length,
    };
  }

  /**
   * Calculate a graduated recency evidence gap penalty
   *
   * Uses three independent factors:
   * 1. Staleness curve: how far outside the recency window the evidence is
   * 2. Topic volatility: how time-critical the topic is (from LLM granularity)
   * 3. Evidence volume: more evidence (even if dated) attenuates the penalty
   *
   * Formula: effectivePenalty = round(maxPenalty × staleness × volatility × volume)
   */
  calculateGraduatedPenalty(
    latestEvidenceDate: string | undefined,
    windowMonths: number,
    maxPenalty: number,
    granularity: "week" | "month" | "year" | "none" | undefined,
    dateCandidates: number,
  ): RecencyPenaltyResult {
    // --- Factor 1: Staleness Curve ---
    let monthsOld: number | null = null;
    let stalenessMultiplier = 1.0; // default: full staleness if no date at all

    if (latestEvidenceDate) {
      const latestDate = new Date(latestEvidenceDate);
      if (!isNaN(latestDate.getTime())) {
        const diffMs = this.currentDate.getTime() - latestDate.getTime();
        monthsOld = diffMs / (30.44 * 24 * 60 * 60 * 1000);

        if (monthsOld <= windowMonths) {
          stalenessMultiplier = 0;
        } else {
          // Linear ramp from 0 to 1 over an additional windowMonths period
          stalenessMultiplier = Math.min(1, Math.max(0, (monthsOld - windowMonths) / windowMonths));
        }
      }
    }

    // --- Factor 2: Topic Volatility ---
    const VOLATILITY_MAP: Record<string, number> = {
      week: 1.0,
      month: 0.8,
      year: 0.4,
      none: 0.2,
    };
    const volatilityMultiplier = granularity ? (VOLATILITY_MAP[granularity] ?? 0.7) : 0.7;

    // --- Factor 3: Evidence Volume Attenuation ---
    let volumeMultiplier: number;
    if (dateCandidates === 0) {
      volumeMultiplier = 1.0;
    } else if (dateCandidates <= 10) {
      volumeMultiplier = 0.9;
    } else if (dateCandidates <= 25) {
      volumeMultiplier = 0.7;
    } else {
      volumeMultiplier = 0.5;
    }

    // --- Combined formula ---
    const effectivePenalty = Math.round(maxPenalty * stalenessMultiplier * volatilityMultiplier * volumeMultiplier);

    return {
      effectivePenalty,
      breakdown: {
        monthsOld,
        stalenessMultiplier,
        volatilityMultiplier,
        volumeMultiplier,
        formula: `round(${maxPenalty} × ${stalenessMultiplier.toFixed(2)} × ${volatilityMultiplier.toFixed(2)} × ${volumeMultiplier.toFixed(2)}) = ${effectivePenalty}`,
      },
    };
  }
}
