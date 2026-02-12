/**
 * Graduated Recency Penalty Tests
 *
 * Unit tests for the calculateGraduatedRecencyPenalty function.
 * Tests the three-factor penalty formula: staleness × volatility × volume.
 *
 * @module analyzer/recency-graduated-penalty.test
 */

import { describe, expect, it } from "vitest";
import { RecencyAssessor } from "@/lib/analyzer/evidence-recency";

describe("calculateGraduatedRecencyPenalty", () => {
  const NOW = new Date("2026-02-08T00:00:00Z");
  const assessor = new RecencyAssessor(NOW);
  const MAX_PENALTY = 20;
  const WINDOW = 6; // months

  // =========================================================================
  // Factor 1: Staleness Curve
  // =========================================================================
  describe("Factor 1: Staleness Curve", () => {
    it("should return 0 penalty when evidence is within the window", () => {
      // Evidence from 3 months ago (within 6-month window)
      const result = assessor.calculateGraduatedPenalty(
        "2025-11-08T00:00:00Z", WINDOW, MAX_PENALTY, "week", 5,
      );
      expect(result.effectivePenalty).toBe(0);
      expect(result.breakdown.stalenessMultiplier).toBe(0);
    });

    it("should return 0 penalty when evidence is exactly at window boundary", () => {
      // Evidence from exactly 6 months ago (calendar months ≠ 30.44-day months, allow tolerance)
      const result = assessor.calculateGraduatedPenalty(
        "2025-08-08T00:00:00Z", WINDOW, MAX_PENALTY, "week", 5,
      );
      expect(result.effectivePenalty).toBe(0);
      expect(result.breakdown.stalenessMultiplier).toBeCloseTo(0, 1);
    });

    it("should apply partial staleness for evidence just outside the window", () => {
      // Evidence from ~9 months ago (3 months past the 6-month window)
      // stalenessMultiplier ≈ (9-6)/6 = 0.5
      const result = assessor.calculateGraduatedPenalty(
        "2025-05-08T00:00:00Z", WINDOW, MAX_PENALTY, "week", 0,
      );
      expect(result.breakdown.stalenessMultiplier).toBeCloseTo(0.5, 1);
    });

    it("should cap staleness at 1.0 for evidence at 2× window", () => {
      // Evidence from 12 months ago (6 months past the 6-month window)
      // stalenessMultiplier ≈ (12-6)/6 ≈ 1.0 (calendar months cause slight variance)
      const result = assessor.calculateGraduatedPenalty(
        "2025-02-08T00:00:00Z", WINDOW, MAX_PENALTY, "week", 0,
      );
      expect(result.breakdown.stalenessMultiplier).toBeCloseTo(1.0, 1);
    });

    it("should cap staleness at 1.0 for very old evidence (beyond 2× window)", () => {
      // Evidence from 24 months ago
      const result = assessor.calculateGraduatedPenalty(
        "2024-02-08T00:00:00Z", WINDOW, MAX_PENALTY, "week", 0,
      );
      expect(result.breakdown.stalenessMultiplier).toBe(1.0);
    });

    it("should use staleness 1.0 when no date is available", () => {
      const result = assessor.calculateGraduatedPenalty(
        undefined, WINDOW, MAX_PENALTY, "week", 0,
      );
      expect(result.breakdown.stalenessMultiplier).toBe(1.0);
      expect(result.breakdown.monthsOld).toBeNull();
    });
  });

  // =========================================================================
  // Factor 2: Topic Volatility
  // =========================================================================
  describe("Factor 2: Topic Volatility", () => {
    // Use very old date (staleness=1.0) and 0 dateCandidates (volume=1.0) to isolate volatility
    const OLD_DATE = "2024-01-01T00:00:00Z";

    it("should apply full penalty for 'week' granularity (breaking news)", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "week", 0,
      );
      expect(result.breakdown.volatilityMultiplier).toBe(1.0);
      expect(result.effectivePenalty).toBe(20);
    });

    it("should apply 0.8 multiplier for 'month' granularity", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "month", 0,
      );
      expect(result.breakdown.volatilityMultiplier).toBe(0.8);
      expect(result.effectivePenalty).toBe(16);
    });

    it("should apply 0.4 multiplier for 'year' granularity (institutional)", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "year", 0,
      );
      expect(result.breakdown.volatilityMultiplier).toBe(0.4);
      expect(result.effectivePenalty).toBe(8);
    });

    it("should apply 0.2 multiplier for 'none' granularity (enduring)", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "none", 0,
      );
      expect(result.breakdown.volatilityMultiplier).toBe(0.2);
      expect(result.effectivePenalty).toBe(4);
    });

    it("should apply 0.7 fallback when granularity is undefined", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, undefined, 0,
      );
      expect(result.breakdown.volatilityMultiplier).toBe(0.7);
      expect(result.effectivePenalty).toBe(14);
    });
  });

  // =========================================================================
  // Factor 3: Evidence Volume Attenuation
  // =========================================================================
  describe("Factor 3: Evidence Volume", () => {
    // Use very old date (staleness=1.0), week volatility (1.0) to isolate volume
    const OLD_DATE = "2024-01-01T00:00:00Z";

    it("should apply full penalty with 0 dateCandidates", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "week", 0,
      );
      expect(result.breakdown.volumeMultiplier).toBe(1.0);
      expect(result.effectivePenalty).toBe(20);
    });

    it("should apply 0.9 multiplier for 1-10 dateCandidates", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "week", 5,
      );
      expect(result.breakdown.volumeMultiplier).toBe(0.9);
      expect(result.effectivePenalty).toBe(18);
    });

    it("should apply 0.9 multiplier at boundary (10 dateCandidates)", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "week", 10,
      );
      expect(result.breakdown.volumeMultiplier).toBe(0.9);
    });

    it("should apply 0.7 multiplier for 11-25 dateCandidates", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "week", 15,
      );
      expect(result.breakdown.volumeMultiplier).toBe(0.7);
      expect(result.effectivePenalty).toBe(14);
    });

    it("should apply 0.5 multiplier for 26+ dateCandidates", () => {
      const result = assessor.calculateGraduatedPenalty(
        OLD_DATE, WINDOW, MAX_PENALTY, "week", 35,
      );
      expect(result.breakdown.volumeMultiplier).toBe(0.5);
      expect(result.effectivePenalty).toBe(10);
    });
  });

  // =========================================================================
  // Combined Scenarios
  // =========================================================================
  describe("Combined Scenarios", () => {
    it("SRG example: institutional topic, 14 months old, 35 date candidates", () => {
      // SRG analysis: "Is SRG trustworthy?"
      // monthsOld ≈ 14, windowMonths = 6
      // staleness = clamp(0, 1, (14-6)/6) = 1.0 (capped)
      // volatility = 0.4 (granularity = "year")
      // volume = 0.5 (35 dateCandidates)
      // effectivePenalty = round(20 × 1.0 × 0.4 × 0.5) = 4
      const result = assessor.calculateGraduatedPenalty(
        "2024-12-30T00:00:00Z",
        6, 20, "year", 35,
      );
      expect(result.effectivePenalty).toBe(4);
      expect(result.breakdown.stalenessMultiplier).toBe(1.0);
      expect(result.breakdown.volatilityMultiplier).toBe(0.4);
      expect(result.breakdown.volumeMultiplier).toBe(0.5);
    });

    it("Breaking news, 8 months old, minimal evidence", () => {
      // monthsOld ≈ 8, window = 6
      // staleness ≈ (8-6)/6 ≈ 0.33
      // volatility = 1.0 (week)
      // volume = 0.9 (3 dateCandidates)
      // effectivePenalty = round(20 × 0.33 × 1.0 × 0.9) = round(6.0) = 6
      const eightMonthsAgo = new Date(NOW);
      eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);

      const result = assessor.calculateGraduatedPenalty(
        eightMonthsAgo.toISOString(), 6, 20, "week", 3,
      );
      expect(result.effectivePenalty).toBeGreaterThanOrEqual(5);
      expect(result.effectivePenalty).toBeLessThanOrEqual(7);
    });

    it("Enduring topic, just barely outside window, lots of evidence → penalty 0", () => {
      // monthsOld ≈ 7, window = 6
      // staleness ≈ (7-6)/6 ≈ 0.167
      // volatility = 0.2 (none)
      // volume = 0.5 (30 dateCandidates)
      // effectivePenalty = round(20 × 0.167 × 0.2 × 0.5) = round(0.33) = 0
      const sevenMonthsAgo = new Date(NOW);
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      const result = assessor.calculateGraduatedPenalty(
        sevenMonthsAgo.toISOString(), 6, 20, "none", 30,
      );
      expect(result.effectivePenalty).toBe(0);
    });

    it("Month granularity, moderate staleness, moderate evidence", () => {
      // monthsOld ≈ 10, window = 6
      // staleness ≈ (10-6)/6 ≈ 0.67
      // volatility = 0.8 (month)
      // volume = 0.7 (20 dateCandidates)
      // effectivePenalty = round(20 × 0.67 × 0.8 × 0.7) = round(7.5) = 7 or 8
      const tenMonthsAgo = new Date(NOW);
      tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);

      const result = assessor.calculateGraduatedPenalty(
        tenMonthsAgo.toISOString(), 6, 20, "month", 20,
      );
      expect(result.effectivePenalty).toBeGreaterThanOrEqual(6);
      expect(result.effectivePenalty).toBeLessThanOrEqual(9);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe("Edge Cases", () => {
    it("should handle maxPenalty of 0", () => {
      const result = assessor.calculateGraduatedPenalty(
        "2024-01-01T00:00:00Z", WINDOW, 0, "week", 0,
      );
      expect(result.effectivePenalty).toBe(0);
    });

    it("should handle windowMonths of 1", () => {
      // Evidence ~1.27 months old, window = 1
      // staleness = (1.27-1)/1 = 0.27
      const result = assessor.calculateGraduatedPenalty(
        "2026-01-01T00:00:00Z", 1, 20, "week", 0,
      );
      expect(result.breakdown.stalenessMultiplier).toBeGreaterThan(0);
      expect(result.breakdown.stalenessMultiplier).toBeLessThan(0.5);
    });

    it("should handle windowMonths of 24", () => {
      // Evidence 14 months old, window = 24 → within window
      const result = assessor.calculateGraduatedPenalty(
        "2024-12-30T00:00:00Z", 24, 20, "year", 35,
      );
      expect(result.effectivePenalty).toBe(0);
      expect(result.breakdown.stalenessMultiplier).toBe(0);
    });

    it("should handle invalid date string gracefully", () => {
      const result = assessor.calculateGraduatedPenalty(
        "not-a-date", WINDOW, MAX_PENALTY, "week", 0,
      );
      // Invalid date → staleness defaults to 1.0
      expect(result.breakdown.stalenessMultiplier).toBe(1.0);
      expect(result.breakdown.monthsOld).toBeNull();
    });

    it("should return formula string in breakdown", () => {
      const result = assessor.calculateGraduatedPenalty(
        "2024-01-01T00:00:00Z", WINDOW, MAX_PENALTY, "year", 15,
      );
      expect(result.breakdown.formula).toContain("round(");
      expect(result.breakdown.formula).toContain("=");
      expect(result.breakdown.formula).toContain(String(result.effectivePenalty));
    });

    it("should set monthsOld to null when no date provided", () => {
      const result = assessor.calculateGraduatedPenalty(
        undefined, WINDOW, MAX_PENALTY, "week", 0,
      );
      expect(result.breakdown.monthsOld).toBeNull();
    });

    it("should set monthsOld to a positive number when date is provided", () => {
      const result = assessor.calculateGraduatedPenalty(
        "2025-05-08T00:00:00Z", WINDOW, MAX_PENALTY, "week", 0,
      );
      expect(result.breakdown.monthsOld).toBeGreaterThan(0);
    });
  });
});
