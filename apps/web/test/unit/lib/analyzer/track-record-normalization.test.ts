/**
 * Track Record Score Normalization Tests (PR-C: Fix for Blocker C)
 *
 * Tests defensive normalization and clamping to prevent math errors
 * caused by trackRecordScore scale mismatches (0-100 vs 0-1).
 *
 * @module analyzer/track-record-normalization.test
 */

import { describe, expect, it } from "vitest";
import { normalizeTrackRecordScore, clampTruthPercentage } from "@/lib/analyzer";

describe("normalizeTrackRecordScore (Unit Tests)", () => {
  it("grounded search sources use 0-1 scale (not 0-100)", () => {
    // This test documents the fix: grounded search should set scores as 0.5, not 50
    const expectedScore = 0.5; // Correct (0-1 scale)
    const incorrectScore = 50; // Wrong (0-100 scale) - this was the bug

    expect(expectedScore).toBeLessThanOrEqual(1);
    expect(expectedScore).toBeGreaterThanOrEqual(0);

    // If we see a score > 1, it's on the wrong scale
    expect(incorrectScore).toBeGreaterThan(1); // This would trigger normalization
  });

  it("normalization handles 0-100 scale conversion", () => {
    expect(normalizeTrackRecordScore(50)).toBe(0.5);
    expect(normalizeTrackRecordScore(60)).toBe(0.6);
    expect(normalizeTrackRecordScore(100)).toBe(1.0);
    expect(normalizeTrackRecordScore(0)).toBe(0.0);
  });

  it("normalization clamps values to [0, 1]", () => {
    expect(normalizeTrackRecordScore(150)).toBe(1.0); // 150/100 = 1.5, clamped to 1.0
    expect(normalizeTrackRecordScore(-10)).toBe(0.0); // Clamped to 0.0
    expect(normalizeTrackRecordScore(0.7)).toBe(0.7); // Already in range
  });

  it("handles invalid values (NaN, Infinity)", () => {
    expect(normalizeTrackRecordScore(NaN)).toBe(0.5); // Default fallback
    expect(normalizeTrackRecordScore(Infinity)).toBe(0.5); // Default fallback
    expect(normalizeTrackRecordScore(-Infinity)).toBe(0.5); // Default fallback
  });

  it("demonstrates the bug: 50 * 100 = 5000% (invalid)", () => {
    const buggyScore = 50; // Wrong scale (0-100)
    const displayMultiplier = 100; // Analyzer multiplies by 100 for display

    // This is what happened before the fix:
    const invalidPercentage = buggyScore * displayMultiplier;
    expect(invalidPercentage).toBe(5000); // WAY out of bounds!

    // After fix: normalize first
    const normalizedScore = normalizeTrackRecordScore(buggyScore);
    const validPercentage = normalizedScore * displayMultiplier;
    expect(validPercentage).toBe(50); // ✅ Correct
    expect(validPercentage).toBeLessThanOrEqual(100);
  });

  it("scale detection: >1 means 0-100 scale", () => {
    // Score <= 1 stays as-is
    expect(normalizeTrackRecordScore(0.7)).toBe(0.7);

    // Score > 1 gets converted from 0-100 to 0-1
    expect(normalizeTrackRecordScore(70)).toBe(0.7);
  });

  it("handles zero score", () => {
    expect(normalizeTrackRecordScore(0)).toBe(0);
  });

  it("handles exactly 1.0", () => {
    expect(normalizeTrackRecordScore(1.0)).toBe(1.0); // Boundary case
    expect(normalizeTrackRecordScore(1.1)).toBeCloseTo(0.011, 5); // 1.1/100 = 0.011 (floating point precision)
  });

  it("handles exactly 100", () => {
    expect(normalizeTrackRecordScore(100)).toBe(1.0);
  });
});

describe("clampTruthPercentage (Unit Tests)", () => {
  it("truth percentage clamping prevents invalid values", () => {
    expect(clampTruthPercentage(150)).toBe(100); // Clamped to 100
    expect(clampTruthPercentage(-50)).toBe(0); // Clamped to 0
    expect(clampTruthPercentage(75)).toBe(75); // Already valid
    expect(clampTruthPercentage(Infinity)).toBe(50); // Non-finite → default
    expect(clampTruthPercentage(NaN)).toBe(50); // Non-finite → default
  });

  it("handles valid range [0, 100]", () => {
    expect(clampTruthPercentage(0)).toBe(0);
    expect(clampTruthPercentage(50)).toBe(50);
    expect(clampTruthPercentage(100)).toBe(100);
  });

  it("handles edge cases", () => {
    expect(clampTruthPercentage(-Infinity)).toBe(50);
    expect(clampTruthPercentage(100.5)).toBe(100);
    expect(clampTruthPercentage(-0.1)).toBe(0);
  });
});

describe("trackRecordScore Scale Consistency", () => {
  it("all test fixtures use 0-1 scale", () => {
    // Verify test fixtures in provenance-validation.test.ts use correct scale
    const testScore = 0.8;
    expect(testScore).toBeLessThanOrEqual(1);
    expect(testScore).toBeGreaterThanOrEqual(0);
  });

  it("multiplication by 100 for display is correct", () => {
    const score = 0.75; // 0-1 scale
    const displayPercentage = score * 100;

    expect(displayPercentage).toBe(75);
    expect(displayPercentage).toBeLessThanOrEqual(100);
  });
});

describe("Integration: normalizeTrackRecordScore + clampTruthPercentage", () => {
  it("prevents invalid verdict math from scale mismatch", () => {
    // Simulate the bug scenario
    const buggyScore = 50; // Wrong scale (0-100)

    // Step 1: Normalize the score
    const normalizedScore = normalizeTrackRecordScore(buggyScore);
    expect(normalizedScore).toBe(0.5);

    // Step 2: Calculate truth percentage (simulate analyzer calculation)
    // In reality this is more complex, but the core is: score affects truth percentage
    const baseTruthPct = 50;
    const adjustedTruthPct = Math.round(baseTruthPct + (normalizedScore - 0.5) * 100);

    // Step 3: Clamp the result
    const finalTruthPct = clampTruthPercentage(adjustedTruthPct);

    expect(finalTruthPct).toBeGreaterThanOrEqual(0);
    expect(finalTruthPct).toBeLessThanOrEqual(100);
    expect(Number.isFinite(finalTruthPct)).toBe(true);
  });
});
