/**
 * Claim Filtering Enhancements Tests
 *
 * Unit tests for the claim filtering enhancements implemented per:
 * Docs/WIP/Claim_Filtering_Enhancements_Implementation_Prompt.md
 *
 * Tests cover:
 * - Enhancement 1: validateThesisRelevance (confidence scoring)
 * - Enhancement 2: pruneTangentialBaselessClaims (threshold=2)
 * - Enhancement 3: monitorOpinionAccumulation (monitoring & limiting)
 *
 * @module claim-filtering-enhancements.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  pruneTangentialBaselessClaims,
  pruneOpinionOnlyFactors,
  monitorOpinionAccumulation,
} from "@/lib/analyzer/aggregation";
import { validateThesisRelevance } from "@/lib/analyzer/orchestrated";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/config-schemas";

// ============================================================================
// ENHANCEMENT 1: validateThesisRelevance
// ============================================================================

describe("Enhancement 1: validateThesisRelevance", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should pass through claims when validation is disabled", () => {
    const claims = [
      {
        claimText: "Test claim",
        thesisRelevance: "direct" as const,
        thesisRelevanceConfidence: 50, // Very low confidence
      },
    ];

    const result = validateThesisRelevance(claims, {
      ...DEFAULT_PIPELINE_CONFIG,
      thesisRelevanceValidationEnabled: false,
    });

    // Should not modify claims when disabled
    expect(result[0].thesisRelevance).toBe("direct");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("should flag low-confidence classifications with warning", () => {
    const claims = [
      {
        claimText: "Borderline claim that could be direct or tangential",
        thesisRelevance: "direct" as const,
        thesisRelevanceConfidence: 65, // Below lowThreshold (70) but above downgradeThreshold (60)
      },
    ];

    const result = validateThesisRelevance(claims, {
      ...DEFAULT_PIPELINE_CONFIG,
      thesisRelevanceValidationEnabled: true,
      thesisRelevanceLowConfidenceThreshold: 70,
      thesisRelevanceAutoDowngradeThreshold: 60,
    });

    // Should log warning but NOT downgrade (65 > 60)
    expect(result[0].thesisRelevance).toBe("direct");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Low-confidence thesisRelevance"),
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Downgrading"),
    );
  });

  it("should downgrade 'direct' to 'tangential' for very low confidence", () => {
    const claims = [
      {
        claimText: "Very uncertain claim classification",
        thesisRelevance: "direct" as const,
        thesisRelevanceConfidence: 55, // Below downgradeThreshold (60)
      },
    ];

    const result = validateThesisRelevance(claims, {
      ...DEFAULT_PIPELINE_CONFIG,
      thesisRelevanceValidationEnabled: true,
      thesisRelevanceLowConfidenceThreshold: 70,
      thesisRelevanceAutoDowngradeThreshold: 60,
    });

    // Should downgrade from "direct" to "tangential"
    expect(result[0].thesisRelevance).toBe("tangential");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Downgrading"),
    );
  });

  it("should NOT downgrade 'tangential' or 'irrelevant' even with low confidence", () => {
    const claims = [
      {
        claimText: "Tangential claim with low confidence",
        thesisRelevance: "tangential" as const,
        thesisRelevanceConfidence: 40,
      },
      {
        claimText: "Irrelevant claim with low confidence",
        thesisRelevance: "irrelevant" as const,
        thesisRelevanceConfidence: 30,
      },
    ];

    const result = validateThesisRelevance(claims, {
      ...DEFAULT_PIPELINE_CONFIG,
      thesisRelevanceValidationEnabled: true,
    });

    // Should NOT downgrade non-direct claims
    expect(result[0].thesisRelevance).toBe("tangential");
    expect(result[1].thesisRelevance).toBe("irrelevant");
  });

  it("should assume 100% confidence when thesisRelevanceConfidence is missing", () => {
    const claims = [
      {
        claimText: "Claim without confidence score",
        thesisRelevance: "direct" as const,
        // No thesisRelevanceConfidence
      },
    ];

    const result = validateThesisRelevance(claims, {
      ...DEFAULT_PIPELINE_CONFIG,
      thesisRelevanceValidationEnabled: true,
    });

    // Should not warn or downgrade (defaults to 100% confidence)
    expect(result[0].thesisRelevance).toBe("direct");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("should handle high-confidence classifications without warnings", () => {
    const claims = [
      {
        claimText: "Clearly direct claim",
        thesisRelevance: "direct" as const,
        thesisRelevanceConfidence: 95,
      },
      {
        claimText: "Clearly tangential claim",
        thesisRelevance: "tangential" as const,
        thesisRelevanceConfidence: 90,
      },
    ];

    const result = validateThesisRelevance(claims, {
      ...DEFAULT_PIPELINE_CONFIG,
      thesisRelevanceValidationEnabled: true,
    });

    // Should not modify or warn for high-confidence claims
    expect(result[0].thesisRelevance).toBe("direct");
    expect(result[1].thesisRelevance).toBe("tangential");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("should use custom thresholds from config", () => {
    const claims = [
      {
        claimText: "Test claim",
        thesisRelevance: "direct" as const,
        thesisRelevanceConfidence: 75, // Above default 70 lowThreshold
      },
    ];

    // With higher lowThreshold (80), this should trigger warning
    const result = validateThesisRelevance(claims, {
      ...DEFAULT_PIPELINE_CONFIG,
      thesisRelevanceValidationEnabled: true,
      thesisRelevanceLowConfidenceThreshold: 80,
      thesisRelevanceAutoDowngradeThreshold: 70,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Low-confidence"),
    );
  });
});

// ============================================================================
// ENHANCEMENT 2: pruneTangentialBaselessClaims
// ============================================================================

describe("Enhancement 2: pruneTangentialBaselessClaims (threshold=2)", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should NEVER prune direct claims regardless of evidence count", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Direct claim with no evidence",
        thesisRelevance: "direct" as const,
        supportingEvidenceIds: [], // Zero evidence
      },
      {
        claimId: "c2",
        claimText: "Direct claim with 1 fact",
        thesisRelevance: "direct" as const,
        supportingEvidenceIds: ["f1"],
      },
    ];

    const result = pruneTangentialBaselessClaims(claims);

    // Direct claims are NEVER pruned
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.claimId)).toEqual(["c1", "c2"]);
  });

  it("should prune tangential claims with 0 facts", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Tangential claim with no evidence",
        thesisRelevance: "tangential" as const,
        supportingEvidenceIds: [],
      },
    ];

    const result = pruneTangentialBaselessClaims(claims);

    expect(result).toHaveLength(0);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Dropping tangential claim"),
    );
  });

  it("should prune tangential claims with 1 fact (threshold=2)", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Tangential claim with insufficient evidence",
        thesisRelevance: "tangential" as const,
        supportingEvidenceIds: ["f1"], // Only 1 fact, threshold is 2
      },
    ];

    const result = pruneTangentialBaselessClaims(claims);

    expect(result).toHaveLength(0);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("1 evidence items"),
    );
  });

  it("should KEEP tangential claims with 2+ facts", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Tangential claim with sufficient evidence",
        thesisRelevance: "tangential" as const,
        supportingEvidenceIds: ["f1", "f2"], // 2 facts = meets threshold
      },
      {
        claimId: "c2",
        claimText: "Another tangential with 3 facts",
        thesisRelevance: "tangential" as const,
        supportingEvidenceIds: ["f3", "f4", "f5"],
      },
    ];

    const result = pruneTangentialBaselessClaims(claims);

    expect(result).toHaveLength(2);
    expect(result.map((c) => c.claimId)).toEqual(["c1", "c2"]);
  });

  it("should prune irrelevant claims with insufficient evidence", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Irrelevant claim",
        thesisRelevance: "irrelevant" as const,
        supportingEvidenceIds: ["f1"], // Below threshold
      },
    ];

    const result = pruneTangentialBaselessClaims(claims);

    expect(result).toHaveLength(0);
  });

  it("should respect custom minEvidenceForTangential option", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Tangential claim",
        thesisRelevance: "tangential" as const,
        supportingEvidenceIds: ["f1", "f2", "f3"], // 3 facts
      },
    ];

    // With higher threshold (4), should be pruned
    const result = pruneTangentialBaselessClaims(claims, {
      minEvidenceForTangential: 4,
    });

    expect(result).toHaveLength(0);
  });

  it("should apply quality check when enabled with facts provided", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Tangential with 2 low-quality facts",
        thesisRelevance: "tangential" as const,
        supportingEvidenceIds: ["f1", "f2"],
      },
    ];

    const facts = [
      { id: "f1", probativeValue: "low" as const },
      { id: "f2", probativeValue: "low" as const },
    ];

    const result = pruneTangentialBaselessClaims(claims, {
      requireQualityEvidence: true,
      facts,
    });

    // Should be pruned because no high/medium quality facts
    expect(result).toHaveLength(0);
  });

  it("should keep tangential claims with quality evidence when check enabled", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Tangential with quality evidence",
        thesisRelevance: "tangential" as const,
        supportingEvidenceIds: ["f1", "f2"],
      },
    ];

    const facts = [
      { id: "f1", probativeValue: "high" as const },
      { id: "f2", probativeValue: "low" as const },
    ];

    const result = pruneTangentialBaselessClaims(claims, {
      requireQualityEvidence: true,
      facts,
    });

    // Should be kept because f1 is high quality
    expect(result).toHaveLength(1);
  });

  it("should handle claims without thesisRelevance (default to direct)", () => {
    const claims = [
      {
        claimId: "c1",
        claimText: "Claim without relevance field",
        // No thesisRelevance
        supportingEvidenceIds: [],
      },
    ];

    const result = pruneTangentialBaselessClaims(claims);

    // Should be kept (treated as direct)
    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// ENHANCEMENT 3: monitorOpinionAccumulation
// ============================================================================

describe("Enhancement 3: monitorOpinionAccumulation", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log opinion/documented factor counts", () => {
    const keyFactors = [
      { factualBasis: "established" as const },
      { factualBasis: "opinion" as const },
      { factualBasis: "disputed" as const },
    ];

    monitorOpinionAccumulation(keyFactors);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("1 opinion, 2 documented"),
    );
  });

  it("should NOT warn when opinion ratio is below threshold", () => {
    const keyFactors = [
      { factualBasis: "established" as const },
      { factualBasis: "established" as const },
      { factualBasis: "established" as const },
      { factualBasis: "opinion" as const }, // 25% opinion
    ];

    monitorOpinionAccumulation(keyFactors, { warningThresholdPercent: 70 });

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("High opinion ratio"),
    );
  });

  it("should warn when opinion ratio exceeds threshold", () => {
    const keyFactors = [
      { factualBasis: "established" as const },
      { factualBasis: "opinion" as const },
      { factualBasis: "opinion" as const },
      { factualBasis: "opinion" as const }, // 75% opinion
    ];

    monitorOpinionAccumulation(keyFactors, { warningThresholdPercent: 70 });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("High opinion ratio"),
    );
  });

  it("should warn when ALL factors are opinion-based", () => {
    const keyFactors = [
      { factualBasis: "opinion" as const },
      { factualBasis: "unknown" as const },
      { factualBasis: "opinion" as const },
    ];

    monitorOpinionAccumulation(keyFactors);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("All 3 keyFactors are opinion-based"),
    );
  });

  it("should NOT limit opinions when maxOpinionCount=0 (unlimited)", () => {
    const keyFactors = [
      { factualBasis: "established" as const },
      { factualBasis: "opinion" as const },
      { factualBasis: "opinion" as const },
      { factualBasis: "opinion" as const },
      { factualBasis: "opinion" as const },
      { factualBasis: "opinion" as const }, // 5 opinions
    ];

    const result = monitorOpinionAccumulation(keyFactors, {
      maxOpinionCount: 0, // Unlimited
    });

    // Should return all factors (monitoring only)
    expect(result).toHaveLength(6);
  });

  it("should limit opinions when maxOpinionCount > 0", () => {
    const keyFactors = [
      { factualBasis: "established" as const },
      { factualBasis: "opinion" as const, supports: "yes" as const },
      { factualBasis: "opinion" as const, supports: "yes" as const },
      { factualBasis: "opinion" as const, supports: "no" as const },
      { factualBasis: "opinion" as const, supports: "no" as const },
      { factualBasis: "opinion" as const, supports: "no" as const },
    ];

    const result = monitorOpinionAccumulation(keyFactors, {
      maxOpinionCount: 2, // Limit to 2 opinions
    });

    // Should have 1 documented + 2 opinions = 3 total
    expect(result).toHaveLength(3);

    // Check that documented factor is preserved
    expect(result.filter((kf) => kf.factualBasis === "established")).toHaveLength(1);

    // Check that only 2 opinions remain
    expect(result.filter((kf) => kf.factualBasis === "opinion")).toHaveLength(2);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Limiting opinion factors from 5 to 2"),
    );
  });

  it("should prioritize 'yes' (supporting) opinions when limiting", () => {
    const keyFactors = [
      { factualBasis: "opinion" as const, supports: "no" as const, factor: "opposing1" },
      { factualBasis: "opinion" as const, supports: "no" as const, factor: "opposing2" },
      { factualBasis: "opinion" as const, supports: "yes" as const, factor: "supporting1" },
    ];

    const result = monitorOpinionAccumulation(keyFactors, {
      maxOpinionCount: 2,
    });

    // Should keep 2 opinions, prioritizing "yes" supports
    expect(result).toHaveLength(2);

    // The "yes" support should be kept
    const factors = result.map((r) => (r as { factor?: string }).factor);
    expect(factors).toContain("supporting1");
  });

  it("should handle empty keyFactors array", () => {
    const result = monitorOpinionAccumulation([]);

    expect(result).toHaveLength(0);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("0 opinion, 0 documented"),
    );
  });

  it("should treat 'unknown' factualBasis as opinion", () => {
    const keyFactors = [
      { factualBasis: "unknown" as const },
      { factualBasis: "established" as const },
    ];

    const result = monitorOpinionAccumulation(keyFactors);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("1 opinion, 1 documented"),
    );
    expect(result).toHaveLength(2); // No limiting when maxOpinionCount=0
  });
});

// ============================================================================
// pruneOpinionOnlyFactors (existing function, verify behavior)
// ============================================================================

describe("pruneOpinionOnlyFactors", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should keep factors with 'established' factualBasis", () => {
    const keyFactors = [
      { factualBasis: "established" as const, factor: "Documented fact" },
    ];

    const result = pruneOpinionOnlyFactors(keyFactors);

    expect(result).toHaveLength(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("should keep factors with 'disputed' factualBasis", () => {
    const keyFactors = [
      { factualBasis: "disputed" as const, factor: "Contested fact" },
    ];

    const result = pruneOpinionOnlyFactors(keyFactors);

    expect(result).toHaveLength(1);
  });

  it("should prune factors with 'opinion' factualBasis", () => {
    const keyFactors = [
      { factualBasis: "opinion" as const, factor: "Someone's opinion", supports: "yes" as const },
    ];

    const result = pruneOpinionOnlyFactors(keyFactors);

    expect(result).toHaveLength(0);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Dropping opinion-only factor"),
    );
  });

  it("should prune factors with 'unknown' factualBasis", () => {
    const keyFactors = [
      { factualBasis: "unknown" as const, factor: "Unknown basis" },
    ];

    const result = pruneOpinionOnlyFactors(keyFactors);

    expect(result).toHaveLength(0);
  });

  it("should handle mixed factors correctly", () => {
    const keyFactors = [
      { factualBasis: "established" as const, factor: "fact1" },
      { factualBasis: "opinion" as const, factor: "opinion1" },
      { factualBasis: "disputed" as const, factor: "fact2" },
      { factualBasis: "unknown" as const, factor: "unknown1" },
      { factualBasis: "established" as const, factor: "fact3" },
    ];

    const result = pruneOpinionOnlyFactors(keyFactors);

    expect(result).toHaveLength(3);
    expect(result.map((kf) => kf.factor)).toEqual(["fact1", "fact2", "fact3"]);
  });
});
