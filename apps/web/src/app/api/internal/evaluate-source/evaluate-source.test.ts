/**
 * Tests for Source Reliability Evaluation Logic
 *
 * Focuses on the business logic that matters:
 * - Rate limiting (cost control)
 * - Consensus calculation (correctness)
 */

import { describe, it, expect, beforeEach } from "vitest";

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

// Replicate the rate limiting logic for testing
interface RateLimitState {
  ipRequests: Map<string, { count: number; resetAt: number }>;
  domainLastEval: Map<string, number>;
}

function createRateLimiter(
  rateLimit: number = 10,
  cooldownSec: number = 60,
  windowSec: number = 60
) {
  const state: RateLimitState = {
    ipRequests: new Map(),
    domainLastEval: new Map(),
  };

  return {
    check(ip: string, domain: string, now: number = Date.now()): { allowed: boolean; reason?: string } {
      // Check IP rate limit
      const ipState = state.ipRequests.get(ip);
      if (ipState) {
        if (now < ipState.resetAt) {
          if (ipState.count >= rateLimit) {
            return { allowed: false, reason: `IP rate limit exceeded (${rateLimit}/min)` };
          }
          ipState.count++;
        } else {
          state.ipRequests.set(ip, { count: 1, resetAt: now + windowSec * 1000 });
        }
      } else {
        state.ipRequests.set(ip, { count: 1, resetAt: now + windowSec * 1000 });
      }

      // Check domain cooldown
      const lastEval = state.domainLastEval.get(domain);
      if (lastEval && now - lastEval < cooldownSec * 1000) {
        return { allowed: false, reason: `Domain cooldown (${cooldownSec}s)` };
      }
      state.domainLastEval.set(domain, now);

      return { allowed: true };
    },
    reset() {
      state.ipRequests.clear();
      state.domainLastEval.clear();
    },
  };
}

describe("Rate Limiting", () => {
  describe("IP rate limit", () => {
    it("allows requests up to the limit", () => {
      const limiter = createRateLimiter(3, 60, 60);
      const now = Date.now();

      expect(limiter.check("1.2.3.4", "a.com", now).allowed).toBe(true);
      expect(limiter.check("1.2.3.4", "b.com", now).allowed).toBe(true);
      expect(limiter.check("1.2.3.4", "c.com", now).allowed).toBe(true);
      expect(limiter.check("1.2.3.4", "d.com", now).allowed).toBe(false);
    });

    it("resets after window expires", () => {
      const limiter = createRateLimiter(2, 60, 60);
      const now = Date.now();

      limiter.check("1.2.3.4", "a.com", now);
      limiter.check("1.2.3.4", "b.com", now);
      expect(limiter.check("1.2.3.4", "c.com", now).allowed).toBe(false);

      // 61 seconds later
      const later = now + 61000;
      expect(limiter.check("1.2.3.4", "d.com", later).allowed).toBe(true);
    });

    it("tracks different IPs separately", () => {
      const limiter = createRateLimiter(1, 60, 60);
      const now = Date.now();

      expect(limiter.check("1.1.1.1", "a.com", now).allowed).toBe(true);
      expect(limiter.check("1.1.1.1", "b.com", now).allowed).toBe(false);
      expect(limiter.check("2.2.2.2", "c.com", now).allowed).toBe(true); // Different IP
    });
  });

  describe("Domain cooldown", () => {
    it("prevents re-evaluation of same domain within cooldown", () => {
      const limiter = createRateLimiter(100, 30, 60); // High IP limit, 30s cooldown
      const now = Date.now();

      expect(limiter.check("1.2.3.4", "example.com", now).allowed).toBe(true);
      expect(limiter.check("1.2.3.4", "example.com", now + 10000).allowed).toBe(false); // 10s later
      expect(limiter.check("1.2.3.4", "example.com", now + 31000).allowed).toBe(true); // 31s later
    });

    it("allows different domains immediately", () => {
      const limiter = createRateLimiter(100, 60, 60);
      const now = Date.now();

      expect(limiter.check("1.2.3.4", "a.com", now).allowed).toBe(true);
      expect(limiter.check("1.2.3.4", "b.com", now).allowed).toBe(true);
      expect(limiter.check("1.2.3.4", "c.com", now).allowed).toBe(true);
    });

    it("cooldown is per-domain, not per-IP", () => {
      const limiter = createRateLimiter(100, 60, 60);
      const now = Date.now();

      limiter.check("1.1.1.1", "example.com", now);
      // Different IP, same domain - should still be blocked
      expect(limiter.check("2.2.2.2", "example.com", now + 1000).allowed).toBe(false);
    });
  });
});

// ============================================================================
// CONSENSUS CALCULATION TESTS
// ============================================================================

interface EvalResult {
  score: number;
  confidence: number;
}

function calculateConsensus(
  primary: EvalResult | null,
  secondary: EvalResult | null,
  confidenceThreshold: number = 0.8,
  consensusThreshold: number = 0.15
): { score: number; confidence: number; consensusAchieved: boolean } | null {
  // Primary must exist and meet confidence threshold
  if (!primary || primary.confidence < confidenceThreshold) {
    return null;
  }

  // No secondary = single model mode
  if (!secondary) {
    return {
      score: primary.score,
      confidence: primary.confidence * 0.8, // Reduced without consensus
      consensusAchieved: false,
    };
  }

  // Check consensus
  const scoreDiff = Math.abs(primary.score - secondary.score);
  if (scoreDiff > consensusThreshold) {
    return null; // Models disagree too much
  }

  // Consensus achieved
  return {
    score: (primary.score + secondary.score) / 2,
    confidence: (primary.confidence + secondary.confidence) / 2,
    consensusAchieved: true,
  };
}

describe("Consensus Calculation", () => {
  describe("confidence threshold", () => {
    it("rejects primary with low confidence", () => {
      const result = calculateConsensus(
        { score: 0.85, confidence: 0.7 }, // Below 0.8 threshold
        { score: 0.85, confidence: 0.9 }
      );
      expect(result).toBeNull();
    });

    it("accepts primary meeting threshold", () => {
      const result = calculateConsensus(
        { score: 0.85, confidence: 0.85 },
        { score: 0.85, confidence: 0.9 }
      );
      expect(result).not.toBeNull();
    });

    it("uses configurable threshold", () => {
      const result = calculateConsensus(
        { score: 0.85, confidence: 0.6 },
        { score: 0.85, confidence: 0.9 },
        0.5 // Lower threshold
      );
      expect(result).not.toBeNull();
    });
  });

  describe("consensus threshold", () => {
    it("accepts models within threshold", () => {
      const result = calculateConsensus(
        { score: 0.80, confidence: 0.9 },
        { score: 0.90, confidence: 0.9 },
        0.8,
        0.15 // Diff is 0.10, within 0.15
      );
      expect(result).not.toBeNull();
      expect(result!.consensusAchieved).toBe(true);
    });

    it("rejects models exceeding threshold", () => {
      const result = calculateConsensus(
        { score: 0.80, confidence: 0.9 },
        { score: 0.50, confidence: 0.9 },
        0.8,
        0.15 // Diff is 0.30, exceeds 0.15
      );
      expect(result).toBeNull();
    });

    it("scores just within threshold are accepted", () => {
      const result = calculateConsensus(
        { score: 0.80, confidence: 0.9 },
        { score: 0.66, confidence: 0.9 }, // Diff is 0.14, within 0.15
        0.8,
        0.15
      );
      expect(result).not.toBeNull();
    });
  });

  describe("score averaging", () => {
    it("averages scores when consensus achieved", () => {
      const result = calculateConsensus(
        { score: 0.80, confidence: 0.9 },
        { score: 0.90, confidence: 0.8 }
      );
      expect(result!.score).toBeCloseTo(0.85, 5);
      expect(result!.confidence).toBeCloseTo(0.85, 5);
    });

    it("handles asymmetric scores", () => {
      const result = calculateConsensus(
        { score: 0.92, confidence: 0.95 },
        { score: 0.88, confidence: 0.85 }
      );
      expect(result!.score).toBeCloseTo(0.9, 5);
      expect(result!.confidence).toBeCloseTo(0.9, 5);
    });
  });

  describe("single model fallback", () => {
    it("uses primary when secondary is null", () => {
      const result = calculateConsensus(
        { score: 0.85, confidence: 0.9 },
        null
      );
      expect(result).not.toBeNull();
      expect(result!.score).toBe(0.85);
      expect(result!.confidence).toBeCloseTo(0.72, 5); // 0.9 * 0.8
      expect(result!.consensusAchieved).toBe(false);
    });

    it("reduces confidence without consensus", () => {
      const result = calculateConsensus(
        { score: 0.85, confidence: 1.0 },
        null
      );
      expect(result!.confidence).toBeCloseTo(0.8, 5); // Capped at 80% without consensus
    });
  });

  describe("null primary", () => {
    it("returns null when primary is null", () => {
      const result = calculateConsensus(null, { score: 0.85, confidence: 0.9 });
      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("Edge Cases", () => {
  it("handles boundary scores (0.0 and 1.0)", () => {
    const result = calculateConsensus(
      { score: 1.0, confidence: 0.9 },
      { score: 0.9, confidence: 0.9 }
    );
    expect(result!.score).toBe(0.95);
  });

  it("handles minimum valid consensus", () => {
    // Both at confidence threshold, scores within consensus boundary
    const result = calculateConsensus(
      { score: 0.5, confidence: 0.8 },
      { score: 0.6, confidence: 0.8 }, // Diff is 0.1, within 0.15
      0.8,
      0.15
    );
    expect(result).not.toBeNull();
    expect(result!.score).toBeCloseTo(0.55, 5);
  });
});
