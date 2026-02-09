/**
 * Confidence Calibration System Tests
 *
 * Unit tests for the 4-layer confidence calibration system.
 * Tests each layer in isolation and combined scenarios.
 *
 * @module analyzer/confidence-calibration.test
 */

import { describe, expect, it } from "vitest";
import {
  calculateEvidenceDensityScore,
  calculateMinConfidenceFromDensity,
  snapConfidenceToBand,
  blendWithSnap,
  enforceVerdictConfidenceCoupling,
  checkContextConfidenceConsistency,
  calibrateConfidence,
  DEFAULT_CONFIDENCE_BANDS,
  DEFAULT_CALIBRATION_CONFIG,
  type DensityAnchorConfig,
  type BandSnappingConfig,
  type VerdictCouplingConfig,
  type ContextConsistencyConfig,
  type ConfidenceCalibrationConfig,
} from "@/lib/analyzer/confidence-calibration";
import type { EvidenceItem, FetchedSource, AnalysisContextAnswer } from "@/lib/analyzer/types";

// ============================================================================
// Test Helpers
// ============================================================================

function makeEvidence(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: `ev-${Math.random().toString(36).slice(2, 8)}`,
    statement: "Test evidence statement",
    category: "evidence",
    specificity: "medium",
    sourceId: `src-${Math.random().toString(36).slice(2, 8)}`,
    sourceUrl: "https://example.com",
    sourceTitle: "Example",
    sourceExcerpt: "Excerpt",
    claimDirection: "supports",
    probativeValue: "medium",
    ...overrides,
  };
}

function makeSource(overrides: Partial<FetchedSource> = {}): FetchedSource {
  return {
    id: `src-${Math.random().toString(36).slice(2, 8)}`,
    url: "https://example.com",
    title: "Example Source",
    trackRecordScore: 0.7,
    fullText: "Full text",
    fetchedAt: new Date().toISOString(),
    category: "news",
    fetchSuccess: true,
    ...overrides,
  };
}

function makeContextAnswer(overrides: Partial<AnalysisContextAnswer> = {}): AnalysisContextAnswer {
  return {
    contextId: "CTX_1",
    contextName: "Test Context",
    answer: 65,
    confidence: 50,
    truthPercentage: 65,
    shortAnswer: "Mostly supported",
    keyFactors: [],
    ...overrides,
  };
}

const DENSITY_CONFIG: DensityAnchorConfig = {
  enabled: true,
  minConfidenceBase: 15,
  minConfidenceMax: 60,
  sourceCountThreshold: 5,
};

const BAND_CONFIG: BandSnappingConfig = {
  enabled: true,
  strength: 0.7,
};

const COUPLING_CONFIG: VerdictCouplingConfig = {
  enabled: true,
  strongVerdictThreshold: 70,
  minConfidenceStrong: 50,
  minConfidenceNeutral: 25,
};

const CONSISTENCY_CONFIG: ContextConsistencyConfig = {
  enabled: true,
  maxConfidenceSpread: 25,
  reductionFactor: 0.5,
};

// ============================================================================
// Layer 1: Evidence Density Anchor
// ============================================================================

describe("Layer 1: Evidence Density Anchor", () => {
  describe("calculateEvidenceDensityScore", () => {
    it("should return 0 for empty evidence", () => {
      const score = calculateEvidenceDensityScore([], [], 5);
      expect(score).toBe(0);
    });

    it("should return low score for single source, low quality evidence", () => {
      const src = makeSource({ id: "src-1" });
      const ev = makeEvidence({ sourceId: "src-1", probativeValue: "low", claimDirection: "supports" });
      const score = calculateEvidenceDensityScore([ev], [src], 5);
      // sourceScore = 1/5 = 0.2, qualityScore = 0/1 = 0, diversityScore = 1/2 = 0.5
      // = 0.2*0.5 + 0*0.3 + 0.5*0.2 = 0.1 + 0 + 0.1 = 0.2
      expect(score).toBeCloseTo(0.2, 1);
    });

    it("should return high score for diverse, high-quality evidence from many sources", () => {
      const sources = Array.from({ length: 6 }, (_, i) =>
        makeSource({ id: `src-${i}` }),
      );
      const evidence = [
        makeEvidence({ sourceId: "src-0", probativeValue: "high", claimDirection: "supports" }),
        makeEvidence({ sourceId: "src-1", probativeValue: "high", claimDirection: "contradicts" }),
        makeEvidence({ sourceId: "src-2", probativeValue: "high", claimDirection: "supports" }),
        makeEvidence({ sourceId: "src-3", probativeValue: "medium", claimDirection: "neutral" }),
        makeEvidence({ sourceId: "src-4", probativeValue: "high", claimDirection: "supports" }),
      ];
      const score = calculateEvidenceDensityScore(evidence, sources, 5);
      // sourceScore = min(5,6)/5 = 1.0, qualityScore = 4/5 = 0.8, diversityScore = min(3,2)/2 = 1.0
      // = 1.0*0.5 + 0.8*0.3 + 1.0*0.2 = 0.5 + 0.24 + 0.2 = 0.94
      expect(score).toBeGreaterThan(0.9);
    });

    it("should cap source score at 1.0 when sources exceed threshold", () => {
      const sources = Array.from({ length: 10 }, (_, i) =>
        makeSource({ id: `src-${i}` }),
      );
      const evidence = sources.map(s =>
        makeEvidence({ sourceId: s.id, probativeValue: "medium", claimDirection: "supports" }),
      );
      const score = calculateEvidenceDensityScore(evidence, sources, 5);
      // sourceScore capped at 1.0
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("should not count failed sources", () => {
      const sources = [
        makeSource({ id: "src-1", fetchSuccess: true }),
        makeSource({ id: "src-2", fetchSuccess: false }),
      ];
      const evidence = [
        makeEvidence({ sourceId: "src-1" }),
        makeEvidence({ sourceId: "src-2" }),
      ];
      const score = calculateEvidenceDensityScore(evidence, sources, 5);
      // relevantSourceCount = min(2 unique IDs, 1 successful) = 1
      // sourceScore = 1/5 = 0.2
      expect(score).toBeLessThan(0.5);
    });

    it("should weight high-probative evidence correctly", () => {
      const src = makeSource({ id: "src-1" });
      const allHigh = [
        makeEvidence({ sourceId: "src-1", probativeValue: "high", claimDirection: "supports" }),
        makeEvidence({ sourceId: "src-1", probativeValue: "high", claimDirection: "supports" }),
      ];
      const allLow = [
        makeEvidence({ sourceId: "src-1", probativeValue: "low", claimDirection: "supports" }),
        makeEvidence({ sourceId: "src-1", probativeValue: "low", claimDirection: "supports" }),
      ];
      const highScore = calculateEvidenceDensityScore(allHigh, [src], 5);
      const lowScore = calculateEvidenceDensityScore(allLow, [src], 5);
      expect(highScore).toBeGreaterThan(lowScore);
    });

    it("should reward evidence diversity (both directions)", () => {
      const src = makeSource({ id: "src-1" });
      const oneDirection = [
        makeEvidence({ sourceId: "src-1", claimDirection: "supports" }),
        makeEvidence({ sourceId: "src-1", claimDirection: "supports" }),
      ];
      const bothDirections = [
        makeEvidence({ sourceId: "src-1", claimDirection: "supports" }),
        makeEvidence({ sourceId: "src-1", claimDirection: "contradicts" }),
      ];
      const oneScore = calculateEvidenceDensityScore(oneDirection, [src], 5);
      const bothScore = calculateEvidenceDensityScore(bothDirections, [src], 5);
      expect(bothScore).toBeGreaterThan(oneScore);
    });
  });

  describe("calculateMinConfidenceFromDensity", () => {
    it("should return minConfidenceBase for density 0", () => {
      const result = calculateMinConfidenceFromDensity(0, DENSITY_CONFIG);
      expect(result).toBe(15);
    });

    it("should return minConfidenceMax for density 1.0", () => {
      const result = calculateMinConfidenceFromDensity(1.0, DENSITY_CONFIG);
      expect(result).toBe(60);
    });

    it("should return midpoint for density 0.5", () => {
      const result = calculateMinConfidenceFromDensity(0.5, DENSITY_CONFIG);
      // 15 + 0.5 * 45 = 37.5 → 38
      expect(result).toBe(38);
    });

    it("should scale linearly", () => {
      const low = calculateMinConfidenceFromDensity(0.25, DENSITY_CONFIG);
      const mid = calculateMinConfidenceFromDensity(0.50, DENSITY_CONFIG);
      const high = calculateMinConfidenceFromDensity(0.75, DENSITY_CONFIG);
      expect(low).toBeLessThan(mid);
      expect(mid).toBeLessThan(high);
    });
  });
});

// ============================================================================
// Layer 2: Confidence Band Snapping
// ============================================================================

describe("Layer 2: Confidence Band Snapping", () => {
  describe("snapConfidenceToBand", () => {
    it("should snap very low confidence to 10", () => {
      expect(snapConfidenceToBand(5, BAND_CONFIG)).toBe(10);
    });

    it("should snap low confidence to 25", () => {
      expect(snapConfidenceToBand(20, BAND_CONFIG)).toBe(25);
    });

    it("should snap moderate-low to 40", () => {
      expect(snapConfidenceToBand(35, BAND_CONFIG)).toBe(40);
    });

    it("should snap neutral confidence to 50", () => {
      expect(snapConfidenceToBand(48, BAND_CONFIG)).toBe(50);
    });

    it("should snap moderate-high to 60", () => {
      expect(snapConfidenceToBand(62, BAND_CONFIG)).toBe(60);
    });

    it("should snap high confidence to 75", () => {
      expect(snapConfidenceToBand(78, BAND_CONFIG)).toBe(75);
    });

    it("should snap very high confidence to 90", () => {
      expect(snapConfidenceToBand(95, BAND_CONFIG)).toBe(90);
    });

    it("should snap boundary values correctly (15 → low band)", () => {
      expect(snapConfidenceToBand(15, BAND_CONFIG)).toBe(25);
    });

    it("should use custom bands when provided", () => {
      const customConfig: BandSnappingConfig = {
        enabled: true,
        strength: 1.0,
        customBands: [
          { min: 0, max: 50, snapTo: 30 },
          { min: 50, max: 100, snapTo: 70 },
        ],
      };
      expect(snapConfidenceToBand(25, customConfig)).toBe(30);
      expect(snapConfidenceToBand(75, customConfig)).toBe(70);
      expect(snapConfidenceToBand(100, customConfig)).toBe(70);
    });
  });

  describe("blendWithSnap", () => {
    it("should return raw value when strength is 0", () => {
      const config: BandSnappingConfig = { enabled: true, strength: 0 };
      expect(blendWithSnap(48, config)).toBe(48);
    });

    it("should return snapped value when strength is 1", () => {
      const config: BandSnappingConfig = { enabled: true, strength: 1.0 };
      expect(blendWithSnap(48, config)).toBe(50); // neutral band
    });

    it("should blend at default strength 0.7", () => {
      // raw=48, snapped=50, blend = 48*0.3 + 50*0.7 = 14.4 + 35 = 49.4 → 49
      const result = blendWithSnap(48, BAND_CONFIG);
      expect(result).toBe(49);
    });

    it("should blend at strength 0.5", () => {
      const config: BandSnappingConfig = { enabled: true, strength: 0.5 };
      // raw=62, snapped=60, blend = 62*0.5 + 60*0.5 = 31 + 30 = 61
      expect(blendWithSnap(62, config)).toBe(61);
    });
  });
});

// ============================================================================
// Layer 3: Verdict-Confidence Coupling
// ============================================================================

describe("Layer 3: Verdict-Confidence Coupling", () => {
  it("should enforce minimum confidence for strong TRUE verdicts (>=70)", () => {
    const result = enforceVerdictConfidenceCoupling(85, 30, COUPLING_CONFIG);
    expect(result).toBe(50);
  });

  it("should enforce minimum confidence for strong FALSE verdicts (<=30)", () => {
    const result = enforceVerdictConfidenceCoupling(15, 25, COUPLING_CONFIG);
    expect(result).toBe(50);
  });

  it("should not change confidence that already meets threshold for strong verdicts", () => {
    const result = enforceVerdictConfidenceCoupling(85, 65, COUPLING_CONFIG);
    expect(result).toBe(65);
  });

  it("should enforce minimum confidence for neutral verdicts (40-60)", () => {
    const result = enforceVerdictConfidenceCoupling(50, 15, COUPLING_CONFIG);
    expect(result).toBe(25);
  });

  it("should not change confidence for neutral verdicts that meet threshold", () => {
    const result = enforceVerdictConfidenceCoupling(50, 40, COUPLING_CONFIG);
    expect(result).toBe(40);
  });

  it("should enforce interpolated floor for moderate verdicts (31-39, 61-69)", () => {
    // For verdict=65, interpolated floor is 38 with default settings.
    const result = enforceVerdictConfidenceCoupling(65, 20, COUPLING_CONFIG);
    expect(result).toBe(38);
  });

  it("should handle exactly-at-threshold verdict (70)", () => {
    const result = enforceVerdictConfidenceCoupling(70, 30, COUPLING_CONFIG);
    expect(result).toBe(50);
  });

  it("should handle exactly-at-threshold verdict (30)", () => {
    const result = enforceVerdictConfidenceCoupling(30, 30, COUPLING_CONFIG);
    expect(result).toBe(50);
  });

  it("should respect custom thresholds", () => {
    const config: VerdictCouplingConfig = {
      enabled: true,
      strongVerdictThreshold: 80,
      minConfidenceStrong: 60,
      minConfidenceNeutral: 30,
    };
    // verdict 75 is moderate (not strong with threshold 80) and gets interpolated floor.
    expect(enforceVerdictConfidenceCoupling(75, 20, config)).toBe(53);
    // verdict 85 IS strong with threshold 80
    expect(enforceVerdictConfidenceCoupling(85, 20, config)).toBe(60);
  });
});

// ============================================================================
// Layer 4: Context Confidence Consistency
// ============================================================================

describe("Layer 4: Context Confidence Consistency", () => {
  it("should return unchanged confidence for single context", () => {
    const result = checkContextConfidenceConsistency(
      [makeContextAnswer({ confidence: 70 })],
      70,
      CONSISTENCY_CONFIG,
    );
    expect(result.adjustedConfidence).toBe(70);
    expect(result.warning).toBeUndefined();
  });

  it("should not penalize when contexts are within spread limit", () => {
    const result = checkContextConfidenceConsistency(
      [
        makeContextAnswer({ confidence: 60 }),
        makeContextAnswer({ confidence: 80 }),
      ],
      70,
      CONSISTENCY_CONFIG,
    );
    // spread = 20, max allowed = 25
    expect(result.adjustedConfidence).toBe(70);
    expect(result.warning).toBeUndefined();
  });

  it("should penalize when contexts exceed spread limit", () => {
    const result = checkContextConfidenceConsistency(
      [
        makeContextAnswer({ confidence: 30 }),
        makeContextAnswer({ confidence: 80 }),
      ],
      55,
      CONSISTENCY_CONFIG,
    );
    // spread = 50, excess = 25, reduction = round(25 * 0.5) = 13
    expect(result.adjustedConfidence).toBe(42); // 55 - 13
    expect(result.warning).toContain("context_confidence_divergence");
  });

  it("should not reduce below minimum floor of 10", () => {
    const result = checkContextConfidenceConsistency(
      [
        makeContextAnswer({ confidence: 5 }),
        makeContextAnswer({ confidence: 95 }),
      ],
      15,
      CONSISTENCY_CONFIG,
    );
    // spread = 90, excess = 65, reduction = round(65 * 0.5) = 33
    // 15 - 33 = -18, clamped to 10
    expect(result.adjustedConfidence).toBe(10);
  });

  it("should exactly match at boundary (spread = maxAllowedSpread)", () => {
    const result = checkContextConfidenceConsistency(
      [
        makeContextAnswer({ confidence: 40 }),
        makeContextAnswer({ confidence: 65 }),
      ],
      50,
      CONSISTENCY_CONFIG,
    );
    // spread = 25, exactly at threshold → no penalty
    expect(result.adjustedConfidence).toBe(50);
    expect(result.warning).toBeUndefined();
  });

  it("should apply penalty for 3+ contexts with wide spread", () => {
    const result = checkContextConfidenceConsistency(
      [
        makeContextAnswer({ confidence: 20 }),
        makeContextAnswer({ confidence: 50 }),
        makeContextAnswer({ confidence: 80 }),
      ],
      50,
      CONSISTENCY_CONFIG,
    );
    // spread = 60, excess = 35, reduction = round(35 * 0.5) = 18
    expect(result.adjustedConfidence).toBe(32); // 50 - 18
    expect(result.warning).toContain("context_confidence_divergence");
  });

  it("should respect custom reductionFactor", () => {
    const config: ContextConsistencyConfig = {
      enabled: true,
      maxConfidenceSpread: 25,
      reductionFactor: 1.0, // aggressive
    };
    const result = checkContextConfidenceConsistency(
      [
        makeContextAnswer({ confidence: 20 }),
        makeContextAnswer({ confidence: 80 }),
      ],
      50,
      config,
    );
    // spread = 60, excess = 35, reduction = round(35 * 1.0) = 35
    expect(result.adjustedConfidence).toBe(15); // 50 - 35
  });
});

// ============================================================================
// Master calibrateConfidence Function
// ============================================================================

describe("calibrateConfidence (master function)", () => {
  const sources5 = Array.from({ length: 5 }, (_, i) =>
    makeSource({ id: `src-${i}` }),
  );
  const richEvidence = [
    makeEvidence({ sourceId: "src-0", probativeValue: "high", claimDirection: "supports" }),
    makeEvidence({ sourceId: "src-1", probativeValue: "high", claimDirection: "contradicts" }),
    makeEvidence({ sourceId: "src-2", probativeValue: "high", claimDirection: "supports" }),
    makeEvidence({ sourceId: "src-3", probativeValue: "medium", claimDirection: "supports" }),
    makeEvidence({ sourceId: "src-4", probativeValue: "high", claimDirection: "neutral" }),
  ];

  it("should return raw confidence when all layers disabled", () => {
    const config: ConfidenceCalibrationConfig = {
      enabled: true,
      densityAnchor: { ...DENSITY_CONFIG, enabled: false },
      bandSnapping: { ...BAND_CONFIG, enabled: false },
      verdictCoupling: { ...COUPLING_CONFIG, enabled: false },
      contextConsistency: { ...CONSISTENCY_CONFIG, enabled: false },
    };
    const result = calibrateConfidence(42, 65, richEvidence, sources5, [], config);
    expect(result.calibratedConfidence).toBe(42);
    expect(result.adjustments).toHaveLength(0);
  });

  it("should bypass all layers when top-level enabled=false", () => {
    const config: ConfidenceCalibrationConfig = {
      ...DEFAULT_CALIBRATION_CONFIG,
      enabled: false,
    };
    const result = calibrateConfidence(42, 85, richEvidence, sources5, [
      makeContextAnswer({ confidence: 10 }),
      makeContextAnswer({ confidence: 90 }),
    ], config);
    expect(result.calibratedConfidence).toBe(42);
    expect(result.adjustments).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("should clamp to minimum 5", () => {
    const config: ConfidenceCalibrationConfig = {
      enabled: true,
      densityAnchor: { ...DENSITY_CONFIG, enabled: false },
      bandSnapping: { ...BAND_CONFIG, enabled: false },
      verdictCoupling: { ...COUPLING_CONFIG, enabled: false },
      contextConsistency: {
        ...CONSISTENCY_CONFIG,
        maxConfidenceSpread: 1, // very tight
        reductionFactor: 1.0,
      },
    };
    const result = calibrateConfidence(
      10, 50, [], [],
      [
        makeContextAnswer({ confidence: 10 }),
        makeContextAnswer({ confidence: 90 }),
      ],
      config,
    );
    // Context consistency floors at 10, final clamp at 5 doesn't lower further
    expect(result.calibratedConfidence).toBe(10);
    expect(result.calibratedConfidence).toBeGreaterThanOrEqual(5);
  });

  it("should clamp to maximum 100", () => {
    const config: ConfidenceCalibrationConfig = {
      ...DEFAULT_CALIBRATION_CONFIG,
      densityAnchor: { ...DENSITY_CONFIG, minConfidenceBase: 95, minConfidenceMax: 100 },
    };
    const result = calibrateConfidence(99, 85, richEvidence, sources5, [], config);
    expect(result.calibratedConfidence).toBeLessThanOrEqual(100);
  });

  it("should apply density anchor when raw confidence is below floor", () => {
    const result = calibrateConfidence(
      10, 65, richEvidence, sources5, [],
      DEFAULT_CALIBRATION_CONFIG,
    );
    expect(result.calibratedConfidence).toBeGreaterThan(10);
    expect(result.adjustments.some(a => a.type === "density_anchor")).toBe(true);
  });

  it("should not apply density anchor when raw confidence exceeds floor", () => {
    const result = calibrateConfidence(
      70, 65, richEvidence, sources5, [],
      DEFAULT_CALIBRATION_CONFIG,
    );
    expect(result.adjustments.some(a => a.type === "density_anchor")).toBe(false);
  });

  it("should apply band snapping", () => {
    // Raw 48 → snap target 50 at strength 0.7 → blend 49
    const config: ConfidenceCalibrationConfig = {
      ...DEFAULT_CALIBRATION_CONFIG,
      densityAnchor: { ...DENSITY_CONFIG, enabled: false },
      verdictCoupling: { ...COUPLING_CONFIG, enabled: false },
      contextConsistency: { ...CONSISTENCY_CONFIG, enabled: false },
    };
    const result = calibrateConfidence(48, 50, [], [], [], config);
    expect(result.adjustments.some(a => a.type === "band_snapping")).toBe(true);
    expect(result.calibratedConfidence).toBe(49);
  });

  it("should preserve density floor after band snapping", () => {
    const config: ConfidenceCalibrationConfig = {
      ...DEFAULT_CALIBRATION_CONFIG,
      densityAnchor: {
        enabled: true,
        minConfidenceBase: 46,
        minConfidenceMax: 46,
        sourceCountThreshold: 5,
      },
      bandSnapping: { enabled: true, strength: 1.0 },
      verdictCoupling: { ...COUPLING_CONFIG, enabled: false },
      contextConsistency: { ...CONSISTENCY_CONFIG, enabled: false },
    };
    const result = calibrateConfidence(
      46,
      55,
      [makeEvidence({ sourceId: "src-0", probativeValue: "high", claimDirection: "supports" })],
      [makeSource({ id: "src-0" })],
      [],
      config,
    );
    expect(result.calibratedConfidence).toBe(50);
    expect(result.calibratedConfidence).toBeGreaterThanOrEqual(46);
  });

  it("should apply verdict coupling for strong verdict with low confidence", () => {
    const config: ConfidenceCalibrationConfig = {
      ...DEFAULT_CALIBRATION_CONFIG,
      densityAnchor: { ...DENSITY_CONFIG, enabled: false },
      bandSnapping: { ...BAND_CONFIG, enabled: false },
      contextConsistency: { ...CONSISTENCY_CONFIG, enabled: false },
    };
    const result = calibrateConfidence(25, 85, [], [], [], config);
    expect(result.adjustments.some(a => a.type === "verdict_coupling")).toBe(true);
    expect(result.calibratedConfidence).toBe(50);
  });

  it("should apply context consistency penalty for divergent contexts", () => {
    const config: ConfidenceCalibrationConfig = {
      ...DEFAULT_CALIBRATION_CONFIG,
      densityAnchor: { ...DENSITY_CONFIG, enabled: false },
      bandSnapping: { ...BAND_CONFIG, enabled: false },
      verdictCoupling: { ...COUPLING_CONFIG, enabled: false },
    };
    const result = calibrateConfidence(
      60, 65, [], [],
      [
        makeContextAnswer({ confidence: 20 }),
        makeContextAnswer({ confidence: 80 }),
      ],
      config,
    );
    expect(result.adjustments.some(a => a.type === "context_consistency")).toBe(true);
    expect(result.calibratedConfidence).toBeLessThan(60);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should apply layers in order (density → band → coupling → consistency)", () => {
    // Force all 4 layers to fire by crafting inputs that trigger each
    const sparseEvidence = [
      makeEvidence({ sourceId: "src-0", probativeValue: "low", claimDirection: "supports" }),
    ];
    const sparseSources = [makeSource({ id: "src-0" })];

    const config: ConfidenceCalibrationConfig = {
      enabled: true,
      densityAnchor: { enabled: true, minConfidenceBase: 15, minConfidenceMax: 60, sourceCountThreshold: 5 },
      bandSnapping: { enabled: true, strength: 0.7 },
      verdictCoupling: { enabled: true, strongVerdictThreshold: 70, minConfidenceStrong: 50, minConfidenceNeutral: 25 },
      contextConsistency: { enabled: true, maxConfidenceSpread: 10, reductionFactor: 0.5 },
    };

    const result = calibrateConfidence(
      5,  // very low raw
      85, // strong verdict
      sparseEvidence,
      sparseSources,
      [
        makeContextAnswer({ confidence: 20 }),
        makeContextAnswer({ confidence: 80 }),
      ],
      config,
    );

    // Layer ordering check: density should fire first, then others build on it
    const types = result.adjustments.map(a => a.type);
    expect(types[0]).toBe("density_anchor");
    expect(result.calibratedConfidence).toBeGreaterThanOrEqual(5);
  });

  // Combined real-world scenario: SRG trustworthiness
  it("SRG scenario: rich evidence, institutional topic, high confidence", () => {
    // 35 date candidates → lots of evidence → high density score
    const sources = Array.from({ length: 8 }, (_, i) =>
      makeSource({ id: `src-${i}` }),
    );
    const evidence = Array.from({ length: 15 }, (_, i) =>
      makeEvidence({
        sourceId: `src-${i % 8}`,
        probativeValue: i < 10 ? "high" : "medium",
        claimDirection: i < 12 ? "supports" : "contradicts",
      }),
    );

    const result = calibrateConfidence(
      41, // post-graduated-recency confidence
      65, // leaning true
      evidence,
      sources,
      [
        makeContextAnswer({ confidence: 58 }),
        makeContextAnswer({ confidence: 72 }),
      ],
      DEFAULT_CALIBRATION_CONFIG,
    );

    // With rich evidence, density anchor should lift confidence above 41
    // Band snapping should stabilize it
    expect(result.calibratedConfidence).toBeGreaterThanOrEqual(41);
    expect(result.calibratedConfidence).toBeLessThanOrEqual(80);
  });

  // Sparse evidence scenario: technology comparison
  it("Technology comparison: sparse evidence, strong verdict → coupling enforces minimum", () => {
    const result = calibrateConfidence(
      15,  // very low raw confidence
      85,  // strong TRUE verdict
      [makeEvidence({ sourceId: "src-0", probativeValue: "medium" })],
      [makeSource({ id: "src-0" })],
      [],
      DEFAULT_CALIBRATION_CONFIG,
    );

    // Even with sparse evidence, coupling should enforce >= 50 for verdict 85
    expect(result.calibratedConfidence).toBeGreaterThanOrEqual(50);
    expect(result.adjustments.some(a => a.type === "verdict_coupling")).toBe(true);
  });

  it("should produce empty adjustments when confidence is already well-calibrated", () => {
    const result = calibrateConfidence(
      60, // moderate-high band center
      60, // moderate verdict
      richEvidence,
      sources5,
      [
        makeContextAnswer({ confidence: 55 }),
        makeContextAnswer({ confidence: 65 }),
      ],
      DEFAULT_CALIBRATION_CONFIG,
    );
    // 60 is already in the moderate_high band, rich evidence → density floor likely below 60
    // Verdict 60 is neither strong nor neutral-range for coupling
    // Context spread 10 < 25 → no consistency penalty
    expect(result.adjustments.length).toBeLessThanOrEqual(1); // at most band snapping
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle 0 raw confidence", () => {
    const result = calibrateConfidence(
      0, 50, [], [], [],
      DEFAULT_CALIBRATION_CONFIG,
    );
    expect(result.calibratedConfidence).toBeGreaterThanOrEqual(5);
  });

  it("should handle 100 raw confidence", () => {
    const result = calibrateConfidence(
      100, 95,
      [makeEvidence({ sourceId: "src-0", probativeValue: "high", claimDirection: "supports" })],
      [makeSource({ id: "src-0" })],
      [],
      DEFAULT_CALIBRATION_CONFIG,
    );
    expect(result.calibratedConfidence).toBeLessThanOrEqual(100);
  });

  it("should handle evidence with undefined claimDirection", () => {
    const ev = makeEvidence({ claimDirection: undefined });
    const score = calculateEvidenceDensityScore(
      [ev],
      [makeSource({ id: ev.sourceId })],
      5,
    );
    // undefined direction filtered out → diversityScore = 0
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should handle evidence with undefined probativeValue", () => {
    const ev = makeEvidence({ probativeValue: undefined });
    const score = calculateEvidenceDensityScore(
      [ev],
      [makeSource({ id: ev.sourceId })],
      5,
    );
    // probativeValue undefined → not counted as "high" → qualityScore = 0
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("should handle empty context answers array", () => {
    const result = calibrateConfidence(
      50, 50, [], [], [],
      DEFAULT_CALIBRATION_CONFIG,
    );
    // No context consistency check for empty array
    expect(result.warnings).toHaveLength(0);
  });

  it("should handle sourceCountThreshold of 1", () => {
    const ev = makeEvidence({ sourceId: "src-0", probativeValue: "high" });
    const score = calculateEvidenceDensityScore(
      [ev],
      [makeSource({ id: "src-0" })],
      1, // threshold of 1
    );
    // sourceScore = min(1, 1)/1 = 1.0
    expect(score).toBeGreaterThanOrEqual(0.5);
  });
});
