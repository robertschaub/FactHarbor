/**
 * Aggregation module tests - v2.10
 *
 * Tests weighted verdict aggregation utilities:
 * - getClaimWeight
 * - calculateWeightedVerdictAverage
 */

import { describe, it, expect } from 'vitest';
import {
  getClaimWeight,
  calculateWeightedVerdictAverage,
} from '@/lib/analyzer/aggregation';

describe('Aggregation Module (v2.10)', () => {
  // ============================================================================
  // getClaimWeight tests
  // ============================================================================
  describe('getClaimWeight', () => {
    it('returns 0 for tangential claims', () => {
      expect(getClaimWeight({ thesisRelevance: 'tangential' })).toBe(0);
      expect(getClaimWeight({ thesisRelevance: 'irrelevant' })).toBe(0);
    });

    it('applies centrality multiplier correctly', () => {
      const baseConfidence = 100;

      const highCentrality = getClaimWeight({ centrality: 'high', confidence: baseConfidence });
      const mediumCentrality = getClaimWeight({ centrality: 'medium', confidence: baseConfidence });
      const lowCentrality = getClaimWeight({ centrality: 'low', confidence: baseConfidence });

      expect(highCentrality).toBe(3.0);  // 3.0 * 1.0 * 1.0
      expect(mediumCentrality).toBe(2.0);  // 2.0 * 1.0 * 1.0
      expect(lowCentrality).toBe(1.0);  // 1.0 * 1.0 * 1.0
    });

    it('applies harm potential multiplier correctly', () => {
      const baseConfidence = 100;

      const highHarm = getClaimWeight({ harmPotential: 'high', confidence: baseConfidence });
      const mediumHarm = getClaimWeight({ harmPotential: 'medium', confidence: baseConfidence });
      const lowHarm = getClaimWeight({ harmPotential: 'low', confidence: baseConfidence });

      expect(highHarm).toBe(1.5);  // 1.0 * 1.5 * 1.0
      expect(mediumHarm).toBe(1.0);  // 1.0 * 1.0 * 1.0
      expect(lowHarm).toBe(1.0);  // 1.0 * 1.0 * 1.0
    });

    it('reduces weight for contested claims with established counter-evidence', () => {
      const uncontested = getClaimWeight({ confidence: 100 });
      const contested = getClaimWeight({
        confidence: 100,
        isContested: true,
        factualBasis: 'established'
      });

      expect(contested).toBe(uncontested * 0.3);
    });

    it('reduces weight for contested claims with disputed counter-evidence', () => {
      const uncontested = getClaimWeight({ confidence: 100 });
      const contested = getClaimWeight({
        confidence: 100,
        isContested: true,
        factualBasis: 'disputed'
      });

      expect(contested).toBe(uncontested * 0.5);
    });

    it('keeps full weight for "doubted" claims (opinion basis)', () => {
      const uncontested = getClaimWeight({ confidence: 100 });
      const doubted = getClaimWeight({
        confidence: 100,
        isContested: true,
        factualBasis: 'opinion'
      });

      expect(doubted).toBe(uncontested);
    });

    it('keeps full weight for contested with "unknown" basis', () => {
      const uncontested = getClaimWeight({ confidence: 100 });

      const unknown = getClaimWeight({
        confidence: 100,
        isContested: true,
        factualBasis: 'unknown'
      });

      expect(unknown).toBe(uncontested);
    });

    it('combines all multipliers correctly', () => {
      const weight = getClaimWeight({
        centrality: 'high',      // 3.0x
        harmPotential: 'high',   // 1.5x
        confidence: 80,          // 0.8
        isContested: true,
        factualBasis: 'disputed' // 0.5x
      });

      // 3.0 * 1.5 * 0.8 * 0.5 = 1.8
      expect(weight).toBe(1.8);
    });
  });

  // ============================================================================
  // calculateWeightedVerdictAverage tests
  // ============================================================================
  describe('calculateWeightedVerdictAverage', () => {
    it('returns 50 for empty claims array', () => {
      expect(calculateWeightedVerdictAverage([])).toBe(50);
    });

    it('excludes tangential claims', () => {
      const claims = [
        { truthPercentage: 90, thesisRelevance: 'direct' as const },
        { truthPercentage: 10, thesisRelevance: 'tangential' as const }
      ];

      // Only direct claim (90%) should be counted
      const result = calculateWeightedVerdictAverage(claims);
      expect(result).toBe(90);
    });

    it('inverts counter-claim truth percentages', () => {
      const claims = [
        { truthPercentage: 80, isCounterClaim: false },
        { truthPercentage: 80, isCounterClaim: true }  // Inverted to 20%
      ];

      // (80 + 20) / 2 = 50
      const result = calculateWeightedVerdictAverage(claims);
      expect(result).toBe(50);
    });

    it('weights central claims higher than peripheral', () => {
      const claims = [
        { truthPercentage: 90, centrality: 'high' as const, confidence: 100 },  // weight = 3.0
        { truthPercentage: 30, centrality: 'low' as const, confidence: 100 }    // weight = 1.0
      ];

      // (90*3 + 30*1) / (3+1) = 300 / 4 = 75
      const result = calculateWeightedVerdictAverage(claims);
      expect(result).toBe(75);
    });

    it('reduces weight for contested claims with counter-evidence', () => {
      const claims = [
        { truthPercentage: 90, confidence: 100 },  // weight = 1.0
        {
          truthPercentage: 30,
          confidence: 100,
          isContested: true,
          factualBasis: 'established' as const  // weight = 0.3
        }
      ];

      // (90*1 + 30*0.3) / (1+0.3) = 99 / 1.3 ≈ 76
      const result = calculateWeightedVerdictAverage(claims);
      expect(result).toBe(76);
    });
  });
});
