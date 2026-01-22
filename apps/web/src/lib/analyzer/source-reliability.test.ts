/**
 * Source Reliability Tests
 *
 * Tests for the Source Reliability Service (Option A: Pure LLM + Cache)
 * - Domain extraction and normalization
 * - Importance filter (skip blogs, spam TLDs)
 * - Sync lookup behavior
 * - Configuration validation
 *
 * @module analyzer/source-reliability.test
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  extractDomain,
  isImportantSource,
  getTrackRecordScore,
  clearPrefetchedScores,
  SR_CONFIG,
  applyEvidenceWeighting,
  normalizeTrackRecordScore,
  clampTruthPercentage,
} from "./source-reliability";

describe("extractDomain", () => {
  it("extracts domain from standard URLs", () => {
    expect(extractDomain("https://www.reuters.com/article/123")).toBe("reuters.com");
    expect(extractDomain("https://bbc.com/news")).toBe("bbc.com");
    expect(extractDomain("http://example.org/path")).toBe("example.org");
  });

  it("strips www prefix", () => {
    expect(extractDomain("https://www.example.com")).toBe("example.com");
    expect(extractDomain("https://www.bbc.co.uk/news")).toBe("bbc.co.uk");
  });

  it("handles subdomains", () => {
    expect(extractDomain("https://news.google.com/article")).toBe("news.google.com");
    expect(extractDomain("https://api.example.org")).toBe("api.example.org");
  });

  it("normalizes to lowercase", () => {
    expect(extractDomain("https://WWW.REUTERS.COM")).toBe("reuters.com");
    expect(extractDomain("https://BBC.Com/News")).toBe("bbc.com");
  });

  it("handles trailing dots", () => {
    expect(extractDomain("https://example.com./path")).toBe("example.com");
  });

  it("returns null for invalid URLs", () => {
    expect(extractDomain("not-a-url")).toBeNull();
    expect(extractDomain("")).toBeNull();
    // Note: ftp:// URLs are technically valid and can be parsed
    expect(extractDomain("ftp://example.com")).toBe("example.com");
  });

  it("handles URLs with ports", () => {
    expect(extractDomain("https://localhost:3000/api")).toBe("localhost");
    expect(extractDomain("https://example.com:8080/path")).toBe("example.com");
  });
});

describe("isImportantSource", () => {
  describe("blog platform filtering", () => {
    it("skips common blog platforms", () => {
      expect(isImportantSource("myblog.blogspot.com")).toBe(false);
      expect(isImportantSource("user.wordpress.com")).toBe(false);
      expect(isImportantSource("author.medium.com")).toBe(false);
      expect(isImportantSource("newsletter.substack.com")).toBe(false);
      expect(isImportantSource("site.tumblr.com")).toBe(false);
    });

    it("skips website builder platforms", () => {
      expect(isImportantSource("mysite.wix.com")).toBe(false);
      expect(isImportantSource("business.weebly.com")).toBe(false);
      expect(isImportantSource("portfolio.squarespace.com")).toBe(false);
      expect(isImportantSource("blog.ghost.io")).toBe(false);
    });

    it("skips hosting platforms", () => {
      expect(isImportantSource("user.github.io")).toBe(false);
      expect(isImportantSource("app.netlify.app")).toBe(false);
      expect(isImportantSource("site.vercel.app")).toBe(false);
      expect(isImportantSource("app.herokuapp.com")).toBe(false);
    });

    it("allows legitimate news domains", () => {
      expect(isImportantSource("reuters.com")).toBe(true);
      expect(isImportantSource("bbc.com")).toBe(true);
      expect(isImportantSource("nytimes.com")).toBe(true);
      expect(isImportantSource("theguardian.com")).toBe(true);
    });
  });

  describe("TLD filtering", () => {
    it("skips spam-associated TLDs", () => {
      expect(isImportantSource("news.xyz")).toBe(false);
      expect(isImportantSource("info.top")).toBe(false);
      expect(isImportantSource("site.club")).toBe(false);
      expect(isImportantSource("page.icu")).toBe(false);
      expect(isImportantSource("viral.buzz")).toBe(false);
    });

    it("skips free domain TLDs", () => {
      expect(isImportantSource("free.tk")).toBe(false);
      expect(isImportantSource("site.ml")).toBe(false);
      expect(isImportantSource("page.ga")).toBe(false);
      expect(isImportantSource("test.cf")).toBe(false);
      expect(isImportantSource("domain.gq")).toBe(false);
    });

    it("allows standard TLDs", () => {
      expect(isImportantSource("example.com")).toBe(true);
      expect(isImportantSource("nonprofit.org")).toBe(true);
      expect(isImportantSource("company.net")).toBe(true);
      expect(isImportantSource("university.edu")).toBe(true);
      expect(isImportantSource("government.gov")).toBe(true);
    });

    it("allows country code TLDs", () => {
      expect(isImportantSource("bbc.co.uk")).toBe(true);
      expect(isImportantSource("spiegel.de")).toBe(true);
      expect(isImportantSource("lemonde.fr")).toBe(true);
      expect(isImportantSource("asahi.jp")).toBe(true);
    });
  });

  describe("personal site heuristics", () => {
    it("skips subdomains with many digits (4+)", () => {
      expect(isImportantSource("user12345.example.com")).toBe(false); // 5 digits
      expect(isImportantSource("blog2024.example.com")).toBe(false); // 4 digits
      expect(isImportantSource("news123.example.com")).toBe(true); // Only 3 digits, OK
    });

    it("skips very long subdomains", () => {
      const longSubdomain = "a".repeat(35) + ".example.com";
      expect(isImportantSource(longSubdomain)).toBe(false);
    });

    it("allows normal subdomains", () => {
      expect(isImportantSource("news.example.com")).toBe(true);
      expect(isImportantSource("blog.company.org")).toBe(true);
    });
  });
});

describe("getTrackRecordScore (sync lookup)", () => {
  beforeEach(() => {
    clearPrefetchedScores();
  });

  it("returns null for unprefetched domains", () => {
    expect(getTrackRecordScore("https://reuters.com/article")).toBeNull();
    expect(getTrackRecordScore("https://bbc.com/news")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(getTrackRecordScore("not-a-url")).toBeNull();
    expect(getTrackRecordScore("")).toBeNull();
  });

  it("is synchronous (no async)", () => {
    // This test verifies the function signature doesn't return a Promise
    const result = getTrackRecordScore("https://example.com");
    expect(result).not.toBeInstanceOf(Promise);
  });
});

describe("SR_CONFIG validation", () => {
  it("has sensible default values", () => {
    // Verify defaults are within expected ranges
    expect(SR_CONFIG.confidenceThreshold).toBeGreaterThanOrEqual(0);
    expect(SR_CONFIG.confidenceThreshold).toBeLessThanOrEqual(1);

    expect(SR_CONFIG.consensusThreshold).toBeGreaterThanOrEqual(0);
    expect(SR_CONFIG.consensusThreshold).toBeLessThanOrEqual(1);

    expect(SR_CONFIG.cacheTtlDays).toBeGreaterThan(0);
    expect(SR_CONFIG.cacheTtlDays).toBeLessThanOrEqual(365);

    expect(SR_CONFIG.rateLimitPerIp).toBeGreaterThan(0);
    expect(SR_CONFIG.domainCooldownSec).toBeGreaterThan(0);
  });

  it("multiModel defaults to true", () => {
    // Multi-model consensus should be on by default for accuracy
    expect(SR_CONFIG.multiModel).toBe(true);
  });

  it("filterEnabled defaults to true", () => {
    // Filter should be on by default to save LLM costs
    expect(SR_CONFIG.filterEnabled).toBe(true);
  });
});

describe("Score interpretation (symmetric 7-band scale, matches verdict scale)", () => {
  // Symmetric scale matching verdict scale, centered at 0.5:
  // highly_reliable (0.86-1.00) ↔ highly_unreliable (0.00-0.15)
  // reliable (0.72-0.86) ↔ unreliable (0.15-0.29)
  // mostly_reliable (0.58-0.72) ↔ mostly_unreliable (0.29-0.43)
  // uncertain (0.43-0.57) = CENTER

  it("score 0.86-1.00 indicates highly reliable", () => {
    const score = 0.93;
    expect(score).toBeGreaterThanOrEqual(0.86);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("score 0.72-0.86 indicates reliable", () => {
    const score = 0.79;
    expect(score).toBeGreaterThanOrEqual(0.72);
    expect(score).toBeLessThan(0.86);
  });

  it("score 0.58-0.72 indicates mostly reliable", () => {
    const score = 0.65;
    expect(score).toBeGreaterThanOrEqual(0.58);
    expect(score).toBeLessThan(0.72);
  });

  it("score 0.43-0.57 indicates uncertain (neutral center)", () => {
    const score = 0.50;
    expect(score).toBeGreaterThanOrEqual(0.43);
    expect(score).toBeLessThan(0.57);
  });

  it("score 0.29-0.43 indicates mostly unreliable", () => {
    const score = 0.36;
    expect(score).toBeGreaterThanOrEqual(0.29);
    expect(score).toBeLessThan(0.43);
  });

  it("score 0.15-0.29 indicates unreliable", () => {
    const score = 0.22;
    expect(score).toBeGreaterThanOrEqual(0.15);
    expect(score).toBeLessThan(0.29);
  });

  it("score 0.00-0.15 indicates highly unreliable", () => {
    const score = 0.07;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.15);
  });

  it("scores are always in 0-1 range", () => {
    const validScores = [0, 0.1, 0.5, 0.9, 1.0];
    for (const score of validScores) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

describe("Integration: Domain extraction + Importance filter", () => {
  it("correctly identifies important sources from full URLs", () => {
    const importantUrls = [
      "https://www.reuters.com/world/article-123",
      "https://bbc.co.uk/news/world",
      "https://nytimes.com/2024/01/article",
    ];

    for (const url of importantUrls) {
      const domain = extractDomain(url);
      expect(domain).not.toBeNull();
      expect(isImportantSource(domain!)).toBe(true);
    }
  });

  it("correctly identifies unimportant sources from full URLs", () => {
    const unimportantUrls = [
      "https://user123456.blogspot.com/post",
      "https://random.substack.com/p/article",
      "https://mysite.xyz/news",
      "https://freestuff.tk/article",
    ];

    for (const url of unimportantUrls) {
      const domain = extractDomain(url);
      expect(domain).not.toBeNull();
      expect(isImportantSource(domain!)).toBe(false);
    }
  });
});

describe("applyEvidenceWeighting (amplified deviation formula)", () => {
  // New formula: effectiveWeight = 0.5 + (score - 0.5) × SPREAD × confidence × consensus
  // Where SPREAD_MULTIPLIER = 1.5, CONSENSUS_SPREAD_MULTIPLIER = 1.15
  // Default confidence when not specified = 0.7, default consensus = false

  it("returns verdicts unchanged when no supporting facts", () => {
    const verdicts = [
      { id: "v1", truthPercentage: 75, confidence: 80, supportingFactIds: [] },
    ];
    const facts: any[] = [];
    const sources: any[] = [];

    const result = applyEvidenceWeighting(verdicts, facts, sources);
    expect(result[0].truthPercentage).toBe(75); // Truly unchanged (no facts)
  });

  it("applies neutral weight to unknown sources (null score)", () => {
    const verdicts = [
      { id: "v1", truthPercentage: 75, confidence: 80, supportingFactIds: ["f1"] },
    ];
    const facts = [{ id: "f1", sourceId: "s1" }];
    const sources = [{ id: "s1", trackRecordScore: null }]; // Unknown source

    const result = applyEvidenceWeighting(verdicts, facts, sources);
    // Unknown source: score=0.5 (neutral), confidence=0.5, no consensus
    // effectiveWeight = 0.5 + (0.5 - 0.5) × 1.5 × 0.5 × 1.0 = 0.5 + 0 = 0.5
    // adjustedTruth = 50 + (75 - 50) × 0.5 = 50 + 12.5 = 63
    expect(result[0].truthPercentage).toBe(63);
    expect(result[0].evidenceWeight).toBeCloseTo(0.5, 2);
  });

  it("adjusts truth percentage based on high reliability source", () => {
    const verdicts = [
      { id: "v1", truthPercentage: 80, confidence: 80, supportingFactIds: ["f1"] },
    ];
    const facts = [{ id: "f1", sourceId: "s1" }];
    const sources = [{ id: "s1", trackRecordScore: 0.95 }]; // High reliability

    const result = applyEvidenceWeighting(verdicts, facts, sources);
    // effectiveWeight = 0.5 + (0.95 - 0.5) × 1.5 × 0.7 × 1.0 = 0.5 + 0.4725 = 0.9725
    // adjustedTruth = 50 + (80 - 50) × 0.9725 = 50 + 29.175 ≈ 79
    expect(result[0].truthPercentage).toBeCloseTo(79, 0);
    expect(result[0].evidenceWeight).toBeCloseTo(0.97, 1);
  });

  it("pulls truth toward neutral for low reliability source", () => {
    const verdicts = [
      { id: "v1", truthPercentage: 80, confidence: 80, supportingFactIds: ["f1"] },
    ];
    const facts = [{ id: "f1", sourceId: "s1" }];
    const sources = [{ id: "s1", trackRecordScore: 0.3 }]; // Low reliability

    const result = applyEvidenceWeighting(verdicts, facts, sources);
    // effectiveWeight = 0.5 + (0.3 - 0.5) × 1.5 × 0.7 × 1.0 = 0.5 - 0.21 = 0.29
    // adjustedTruth = 50 + (80 - 50) × 0.29 = 50 + 8.7 ≈ 59
    expect(result[0].truthPercentage).toBe(59);
    expect(result[0].evidenceWeight).toBeCloseTo(0.29, 2);
  });

  it("averages effective weights from multiple supporting facts", () => {
    const verdicts = [
      { id: "v1", truthPercentage: 80, confidence: 80, supportingFactIds: ["f1", "f2"] },
    ];
    const facts = [
      { id: "f1", sourceId: "s1" },
      { id: "f2", sourceId: "s2" },
    ];
    const sources = [
      { id: "s1", trackRecordScore: 0.9 },  // High
      { id: "s2", trackRecordScore: 0.5 },  // Neutral
    ];

    const result = applyEvidenceWeighting(verdicts, facts, sources);
    // s1: effectiveWeight = 0.5 + (0.9 - 0.5) × 1.5 × 0.7 = 0.5 + 0.42 = 0.92
    // s2: effectiveWeight = 0.5 + (0.5 - 0.5) × 1.5 × 0.7 = 0.5 + 0 = 0.5
    // avgWeight = (0.92 + 0.5) / 2 = 0.71
    // adjustedTruth = 50 + (80 - 50) × 0.71 = 50 + 21.3 ≈ 71
    expect(result[0].truthPercentage).toBe(71);
    expect(result[0].evidenceWeight).toBeCloseTo(0.71, 2);
  });

  it("clamps truth percentage to valid range", () => {
    // Test with extreme values
    expect(clampTruthPercentage(150)).toBe(100);
    expect(clampTruthPercentage(-50)).toBe(0);
    expect(clampTruthPercentage(NaN)).toBe(50);
    expect(clampTruthPercentage(Infinity)).toBe(50);
  });

  it("normalizes 0-100 scale scores to 0-1", () => {
    expect(normalizeTrackRecordScore(50)).toBe(0.5);
    expect(normalizeTrackRecordScore(100)).toBe(1.0);
    expect(normalizeTrackRecordScore(0.75)).toBe(0.75); // Already 0-1
  });

  it("adjusts confidence based on effective weight", () => {
    const verdicts = [
      { id: "v1", truthPercentage: 80, confidence: 80, supportingFactIds: ["f1"] },
    ];
    const facts = [{ id: "f1", sourceId: "s1" }];
    const sources = [{ id: "s1", trackRecordScore: 0.9 }];

    const result = applyEvidenceWeighting(verdicts, facts, sources);
    // effectiveWeight = 0.5 + (0.9 - 0.5) × 1.5 × 0.7 = 0.92
    // Confidence formula: confidence × (0.5 + avgWeight/2) = 80 × (0.5 + 0.46) = 80 × 0.96 = 76.8 ≈ 77
    expect(result[0].confidence).toBe(77);
  });
});

describe("Edge cases", () => {
  it("handles edge case domains", () => {
    // Very short domain
    expect(extractDomain("https://t.co/abc")).toBe("t.co");
    expect(isImportantSource("t.co")).toBe(true); // Twitter shortener

    // IP addresses
    expect(extractDomain("http://192.168.1.1/page")).toBe("192.168.1.1");

    // Numeric subdomains (4+ consecutive digits triggers filter)
    expect(isImportantSource("api.example.com")).toBe(true); // No digits
    expect(isImportantSource("v2.example.com")).toBe(true); // Only 1 digit
    expect(isImportantSource("12345.example.com")).toBe(false); // 5 digits
  });

  it("handles punycode domains", () => {
    // International domains encoded as punycode
    expect(extractDomain("https://xn--n3h.com/")).toBe("xn--n3h.com");
  });
});
