/**
 * Tests for Source Reliability Shared Configuration
 *
 * @module lib/source-reliability-config.test
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_CONSENSUS_THRESHOLD,
  DEFAULT_UNKNOWN_SCORE,
  SOURCE_TYPE_CAPS,
  scoreToFactualRating,
  ratingToScoreRange,
  meetsConfidenceRequirement,
  CONFIDENCE_REQUIREMENTS,
  getSRConfig,
} from "@/lib/source-reliability-config";

describe("Source Reliability Config - Constants", () => {
  it("has correct default confidence threshold (0.8)", () => {
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.8);
  });

  it("has correct default consensus threshold (0.20)", () => {
    expect(DEFAULT_CONSENSUS_THRESHOLD).toBe(0.20);
  });

  it("has correct default unknown score (0.5)", () => {
    expect(DEFAULT_UNKNOWN_SCORE).toBe(0.5);
  });
});

describe("SOURCE_TYPE_CAPS", () => {
  it("caps propaganda_outlet at 0.14 (highly_unreliable)", () => {
    expect(SOURCE_TYPE_CAPS.propaganda_outlet).toBe(0.14);
  });

  it("caps known_disinformation at 0.14 (highly_unreliable)", () => {
    expect(SOURCE_TYPE_CAPS.known_disinformation).toBe(0.14);
  });

  it("caps state_controlled_media at 0.42 (leaning_unreliable)", () => {
    expect(SOURCE_TYPE_CAPS.state_controlled_media).toBe(0.42);
  });

  it("caps platform_ugc at 0.42 (leaning_unreliable)", () => {
    expect(SOURCE_TYPE_CAPS.platform_ugc).toBe(0.42);
  });

  it("does not cap editorial_publisher", () => {
    expect(SOURCE_TYPE_CAPS.editorial_publisher).toBeUndefined();
  });

  it("does not cap wire_service", () => {
    expect(SOURCE_TYPE_CAPS.wire_service).toBeUndefined();
  });
});

describe("scoreToFactualRating", () => {
  it("returns highly_reliable for scores >= 0.86", () => {
    expect(scoreToFactualRating(0.86)).toBe("highly_reliable");
    expect(scoreToFactualRating(0.95)).toBe("highly_reliable");
    expect(scoreToFactualRating(1.0)).toBe("highly_reliable");
  });

  it("returns reliable for scores 0.72-0.859", () => {
    expect(scoreToFactualRating(0.72)).toBe("reliable");
    expect(scoreToFactualRating(0.80)).toBe("reliable");
    expect(scoreToFactualRating(0.859)).toBe("reliable");
  });

  it("returns leaning_reliable for scores 0.58-0.719", () => {
    expect(scoreToFactualRating(0.58)).toBe("leaning_reliable");
    expect(scoreToFactualRating(0.65)).toBe("leaning_reliable");
    expect(scoreToFactualRating(0.719)).toBe("leaning_reliable");
  });

  it("returns mixed for scores 0.43-0.579", () => {
    expect(scoreToFactualRating(0.43)).toBe("mixed");
    expect(scoreToFactualRating(0.50)).toBe("mixed");
    expect(scoreToFactualRating(0.579)).toBe("mixed");
  });

  it("returns leaning_unreliable for scores 0.29-0.429", () => {
    expect(scoreToFactualRating(0.29)).toBe("leaning_unreliable");
    expect(scoreToFactualRating(0.35)).toBe("leaning_unreliable");
    expect(scoreToFactualRating(0.429)).toBe("leaning_unreliable");
  });

  it("returns unreliable for scores 0.15-0.289", () => {
    expect(scoreToFactualRating(0.15)).toBe("unreliable");
    expect(scoreToFactualRating(0.22)).toBe("unreliable");
    expect(scoreToFactualRating(0.289)).toBe("unreliable");
  });

  it("returns highly_unreliable for scores 0.00-0.149", () => {
    expect(scoreToFactualRating(0.00)).toBe("highly_unreliable");
    expect(scoreToFactualRating(0.08)).toBe("highly_unreliable");
    expect(scoreToFactualRating(0.149)).toBe("highly_unreliable");
  });

  it("returns insufficient_data for null", () => {
    expect(scoreToFactualRating(null)).toBe("insufficient_data");
  });

  it("handles boundary cases correctly", () => {
    // Exactly at boundary
    expect(scoreToFactualRating(0.86)).toBe("highly_reliable");
    expect(scoreToFactualRating(0.72)).toBe("reliable");
    expect(scoreToFactualRating(0.58)).toBe("leaning_reliable");
    expect(scoreToFactualRating(0.43)).toBe("mixed");
    expect(scoreToFactualRating(0.29)).toBe("leaning_unreliable");
    expect(scoreToFactualRating(0.15)).toBe("unreliable");
    
    // Just below boundary
    expect(scoreToFactualRating(0.859)).toBe("reliable");
    expect(scoreToFactualRating(0.719)).toBe("leaning_reliable");
    expect(scoreToFactualRating(0.579)).toBe("mixed");
    expect(scoreToFactualRating(0.429)).toBe("leaning_unreliable");
    expect(scoreToFactualRating(0.289)).toBe("unreliable");
    expect(scoreToFactualRating(0.149)).toBe("highly_unreliable");
  });
});

describe("ratingToScoreRange", () => {
  it("returns correct range for highly_reliable", () => {
    const range = ratingToScoreRange("highly_reliable");
    expect(range).toEqual({ min: 0.86, max: 1.00 });
  });

  it("returns correct range for mixed", () => {
    const range = ratingToScoreRange("mixed");
    expect(range).toEqual({ min: 0.43, max: 0.579 });
  });

  it("returns null for insufficient_data", () => {
    expect(ratingToScoreRange("insufficient_data")).toBeNull();
  });
});

describe("meetsConfidenceRequirement (asymmetric gating)", () => {
  it("requires high confidence for highly_reliable", () => {
    expect(meetsConfidenceRequirement("highly_reliable", 0.85)).toBe(true);
    expect(meetsConfidenceRequirement("highly_reliable", 0.84)).toBe(false);
  });

  it("requires moderate confidence for reliable", () => {
    expect(meetsConfidenceRequirement("reliable", 0.75)).toBe(true);
    expect(meetsConfidenceRequirement("reliable", 0.74)).toBe(false);
  });

  it("requires moderate confidence for leaning_reliable", () => {
    expect(meetsConfidenceRequirement("leaning_reliable", 0.65)).toBe(true);
    expect(meetsConfidenceRequirement("leaning_reliable", 0.64)).toBe(false);
  });

  it("allows lower bar for mixed", () => {
    expect(meetsConfidenceRequirement("mixed", 0.55)).toBe(true);
    expect(meetsConfidenceRequirement("mixed", 0.54)).toBe(false);
  });

  it("allows lower bar for leaning_unreliable", () => {
    expect(meetsConfidenceRequirement("leaning_unreliable", 0.50)).toBe(true);
    expect(meetsConfidenceRequirement("leaning_unreliable", 0.49)).toBe(false);
  });

  it("allows lower confidence for unreliable", () => {
    expect(meetsConfidenceRequirement("unreliable", 0.45)).toBe(true);
    expect(meetsConfidenceRequirement("unreliable", 0.44)).toBe(false);
  });

  it("allows lowest confidence for highly_unreliable", () => {
    expect(meetsConfidenceRequirement("highly_unreliable", 0.40)).toBe(true);
    expect(meetsConfidenceRequirement("highly_unreliable", 0.39)).toBe(false);
  });

  it("always allows insufficient_data", () => {
    expect(meetsConfidenceRequirement("insufficient_data", 0.10)).toBe(true);
    expect(meetsConfidenceRequirement("insufficient_data", 0.00)).toBe(true);
  });

  it("implements skeptical default - high scores need more evidence", () => {
    // Verify asymmetry: high scores require higher confidence than low scores
    const highScoreReq = CONFIDENCE_REQUIREMENTS.highly_reliable;
    const lowScoreReq = CONFIDENCE_REQUIREMENTS.highly_unreliable;
    expect(highScoreReq).toBeGreaterThan(lowScoreReq);
  });
});

describe("getSRConfig", () => {
  it("returns config with correct structure", () => {
    const config = getSRConfig();
    expect(config).toHaveProperty("enabled");
    expect(config).toHaveProperty("multiModel");
    expect(config).toHaveProperty("confidenceThreshold");
    expect(config).toHaveProperty("consensusThreshold");
    expect(config).toHaveProperty("defaultScore");
    expect(config).toHaveProperty("cacheTtlDays");
    expect(config).toHaveProperty("filterEnabled");
  });

  it("uses correct defaults when env vars not set", () => {
    const config = getSRConfig();
    // These should match the module-level defaults
    expect(config.confidenceThreshold).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
    expect(config.consensusThreshold).toBe(DEFAULT_CONSENSUS_THRESHOLD);
    expect(config.defaultScore).toBe(DEFAULT_UNKNOWN_SCORE);
  });
});
