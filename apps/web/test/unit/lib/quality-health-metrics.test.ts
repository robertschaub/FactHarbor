/**
 * Quality Health Metrics extraction tests
 *
 * Tests for buildQualityHealthMetrics() which extracts F4/F5/F6 monitoring
 * data from analysis result warnings for the quality health dashboard.
 */

import { describe, expect, it } from "vitest";
import { buildQualityHealthMetrics } from "../../../src/lib/analyzer/metrics-integration";

function makeResult(overrides: {
  analysisWarnings?: Array<{ type: string; severity: string; message: string; details?: Record<string, unknown> }>;
  meta?: Record<string, unknown>;
} = {}) {
  return {
    analysisWarnings: overrides.analysisWarnings ?? [],
    meta: overrides.meta ?? {},
  };
}

describe("buildQualityHealthMetrics", () => {
  it("returns zeroed metrics for empty result", () => {
    const qh = buildQualityHealthMetrics(makeResult());
    expect(qh.f4_insufficientClaims).toBe(0);
    expect(qh.f4_totalClaims).toBe(0);
    expect(qh.f4_rejectionRate).toBe(0);
    expect(qh.f5_baselessBlocked).toBe(0);
    expect(qh.f5_totalAdjustments).toBe(0);
    expect(qh.f5_blockRate).toBe(0);
    expect(qh.f6_partitioningActive).toBe(false);
    expect(qh.f6_institutionalCount).toBe(0);
    expect(qh.f6_generalCount).toBe(0);
    expect(qh.f6_poolImbalanceDetected).toBe(false);
    expect(qh.f6_balanceRatio).toBeNull();
  });

  it("extracts F4 insufficient_evidence metrics", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        { type: "insufficient_evidence", severity: "warning", message: "Claim c1 has insufficient evidence" },
        { type: "insufficient_evidence", severity: "warning", message: "Claim c2 has insufficient evidence" },
        { type: "low_evidence_count", severity: "warning", message: "unrelated" },
      ],
      meta: { claimCount: 5 },
    }));

    expect(qh.f4_insufficientClaims).toBe(2);
    expect(qh.f4_totalClaims).toBe(5);
    expect(qh.f4_rejectionRate).toBeCloseTo(0.4);
  });

  it("handles F4 with zero claims gracefully", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        { type: "insufficient_evidence", severity: "warning", message: "edge case" },
      ],
      meta: { claimCount: 0 },
    }));
    expect(qh.f4_rejectionRate).toBe(0);
  });

  it("extracts F5 baseless challenge metrics", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        { type: "baseless_challenge_blocked", severity: "info", message: "Claim c1: reverted" },
        { type: "baseless_challenge_blocked", severity: "info", message: "Claim c2: reverted" },
        { type: "baseless_challenge_blocked", severity: "info", message: "Claim c3: reverted" },
        {
          type: "baseless_challenge_detected",
          severity: "info",
          message: "3/4 adjustments blocked",
          details: { totalAdjustments: 4, blockedCount: 3, baselessAdjustmentRate: 0.75 },
        },
      ],
    }));

    expect(qh.f5_baselessBlocked).toBe(3);
    expect(qh.f5_totalAdjustments).toBe(4);
    expect(qh.f5_blockRate).toBeCloseTo(0.75);
  });

  it("handles F5 with zero adjustments", () => {
    const qh = buildQualityHealthMetrics(makeResult());
    expect(qh.f5_blockRate).toBe(0);
  });

  it("extracts F6 partition stats", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        {
          type: "evidence_partition_stats",
          severity: "info",
          message: "D5 partitioning active",
          details: { partitioningActive: true, institutionalCount: 7, generalCount: 5, totalEvidence: 12 },
        },
      ],
      meta: {
        evidenceBalance: { balanceRatio: 0.65 },
      },
    }));

    expect(qh.f6_partitioningActive).toBe(true);
    expect(qh.f6_institutionalCount).toBe(7);
    expect(qh.f6_generalCount).toBe(5);
    expect(qh.f6_balanceRatio).toBeCloseTo(0.65);
    expect(qh.f6_poolImbalanceDetected).toBe(false);
  });

  it("detects F6 pool imbalance", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        { type: "evidence_pool_imbalance", severity: "warning", message: "Evidence skewed" },
      ],
    }));
    expect(qh.f6_poolImbalanceDetected).toBe(true);
  });

  it("handles null/undefined result gracefully", () => {
    const qh = buildQualityHealthMetrics({});
    expect(qh.f4_insufficientClaims).toBe(0);
    expect(qh.f5_baselessBlocked).toBe(0);
    expect(qh.f6_partitioningActive).toBe(false);
  });

  it("reads warnings from legacy 'warnings' field", () => {
    const result = {
      warnings: [
        { type: "insufficient_evidence", severity: "warning", message: "legacy" },
      ],
      meta: { claimCount: 3 },
    };
    const qh = buildQualityHealthMetrics(result);
    expect(qh.f4_insufficientClaims).toBe(1);
    expect(qh.f4_totalClaims).toBe(3);
  });
});

describe("buildQualityHealthMetrics — D5 direct-publishability split", () => {
  it("returns an available, zeroed d5 block for an empty result", () => {
    const qh = buildQualityHealthMetrics(makeResult({ meta: { claimCount: 4 } }));
    expect(qh.d5?.status.available).toBe(true);
    expect(qh.d5?.status.partial).toBe(false);
    expect(qh.d5?.totalClaims).toBe(4);
    expect(qh.d5?.insufficientEvidenceClaims).toBe(0);
    expect(qh.d5?.insufficientDirectEvidenceClaims).toBe(0);
    expect(qh.d5?.claimDiagnostics).toEqual([]);
  });

  it("splits insufficient_evidence vs insufficient_direct_evidence and sums directional totals", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        {
          type: "insufficient_evidence", severity: "warning", message: "x",
          details: { claimId: "AC_01", totalDirectionalCount: 0, directDirectionalCount: 0, nonDirectDirectionalCount: 0, directApplicabilityRequired: false },
        },
        {
          type: "insufficient_direct_evidence", severity: "warning", message: "x",
          details: { claimId: "AC_02", totalDirectionalCount: 3, directDirectionalCount: 0, nonDirectDirectionalCount: 3, directApplicabilityRequired: true },
        },
      ],
      meta: { claimCount: 5 },
    }));
    expect(qh.d5?.insufficientEvidenceClaims).toBe(1);
    expect(qh.d5?.insufficientDirectEvidenceClaims).toBe(1);
    expect(qh.d5?.totalDirectionalEvidenceTotal).toBe(3);
    expect(qh.d5?.directDirectionalEvidenceTotal).toBe(0);
    expect(qh.d5?.nonDirectDirectionalEvidenceTotal).toBe(3);
    expect(qh.d5?.status.partial).toBe(false);
    expect(qh.d5?.claimDiagnostics).toHaveLength(2);
    const direct = qh.d5?.claimDiagnostics.find(c => c.claimId === "AC_02");
    expect(direct?.sufficiencyStatus).toBe("insufficient_direct_evidence");
    expect(direct?.directApplicabilityRequired).toBe(true);
  });

  it("counts distinct claim IDs across batch-level applicability-degraded warnings", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        { type: "evidence_applicability_assessment_degraded", severity: "warning", message: "x", details: { claimIds: ["AC_01", "AC_02"], reason: "prompt_section_missing" } },
        { type: "evidence_applicability_assessment_degraded", severity: "warning", message: "x", details: { claimIds: ["AC_02", "AC_03"] } },
      ],
      meta: { claimCount: 3 },
    }));
    expect(qh.d5?.applicabilityAssessmentDegradedEvents).toBe(2);
    expect(qh.d5?.applicabilityAssessmentDegradedClaims).toBe(3); // AC_01, AC_02, AC_03 distinct
  });

  it("marks d5 partial when an insufficiency warning lacks expected directional detail", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        { type: "insufficient_direct_evidence", severity: "warning", message: "x", details: { claimId: "AC_01" } },
      ],
      meta: { claimCount: 2 },
    }));
    expect(qh.d5?.status.partial).toBe(true);
    expect(qh.d5?.insufficientDirectEvidenceClaims).toBe(1);
  });

  it("marks d5 partial when a degraded warning lacks a claimIds array", () => {
    const qh = buildQualityHealthMetrics(makeResult({
      analysisWarnings: [
        { type: "evidence_applicability_assessment_degraded", severity: "warning", message: "x", details: { reason: "prompt_section_missing" } },
      ],
      meta: { claimCount: 2 },
    }));
    expect(qh.d5?.status.partial).toBe(true);
    expect(qh.d5?.applicabilityAssessmentDegradedEvents).toBe(1);
    expect(qh.d5?.applicabilityAssessmentDegradedClaims).toBe(0);
  });
});
