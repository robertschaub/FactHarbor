/**
 * Aggregation module tests - v2.8
 * 
 * Tests the shared verdict aggregation utilities including:
 * - validateContestation (KeyFactor-level)
 * - detectClaimContestation (claim-level heuristic)
 * - detectHarmPotential
 * - getClaimWeight
 * - calculateWeightedVerdictAverage
 */

import { describe, it, expect } from 'vitest';
import {
  validateContestation,
  detectHarmPotential,
  detectClaimContestation,
  getClaimWeight,
  calculateWeightedVerdictAverage,
} from './aggregation';

describe('Aggregation Module (v2.8)', () => {
  // ============================================================================
  // validateContestation tests
  // ============================================================================
  describe('validateContestation', () => {
    it('downgrades contestation without documented evidence from "established" to "opinion"', () => {
      const keyFactors = [
        {
          factor: 'Fairness',
          supports: 'no' as const,
          explanation: 'Critics criticized the trial',
          isContested: true,
          contestedBy: 'critics',
          factualBasis: 'established' as const,
          contestationReason: 'Unfairness claims without specific evidence'
        }
      ];

      const validated = validateContestation(keyFactors);
      
      expect(validated[0].factualBasis).toBe('opinion');
      expect(validated[0].contestationReason).toContain('No documented counter-evidence cited');
    });

    it('keeps "established" when specific documented evidence is cited', () => {
      const keyFactors = [
        {
          factor: 'Procedural Compliance',
          supports: 'no' as const,
          explanation: 'Investigation found violations of Article 47',
          isContested: true,
          contestedBy: 'Ministry of Justice',
          factualBasis: 'established' as const,
          contestationReason: 'Documented violation of procedure 12.3'
        }
      ];

      const validated = validateContestation(keyFactors);
      
      expect(validated[0].factualBasis).toBe('established');
    });

    it('does not modify factors that already have "opinion" basis', () => {
      const keyFactors = [
        {
          factor: 'Public Perception',
          supports: 'no' as const,
          explanation: 'Critics disagree',
          factualBasis: 'opinion' as const
        }
      ];

      const validated = validateContestation(keyFactors);
      
      expect(validated[0].factualBasis).toBe('opinion');
    });

    it('does not modify supporting factors', () => {
      const keyFactors = [
        {
          factor: 'Evidence Basis',
          supports: 'yes' as const,
          explanation: 'Government praised the decision',
          contestedBy: 'Foreign Ministry',
          factualBasis: 'established' as const
        }
      ];

      const validated = validateContestation(keyFactors);
      
      expect(validated[0].factualBasis).toBe('established');
    });
  });

  // ============================================================================
  // detectHarmPotential tests
  // ============================================================================
  describe('detectHarmPotential', () => {
    it('detects death-related claims as high harm', () => {
      expect(detectHarmPotential('10 children died from the vaccine')).toBe('high');
      expect(detectHarmPotential('The accident was fatal')).toBe('high');
      expect(detectHarmPotential('Several people were killed')).toBe('high');
      expect(detectHarmPotential('Multiple deaths occurred')).toBe('high');
    });

    it('detects injury claims as high harm', () => {
      expect(detectHarmPotential('The drug caused injuries')).toBe('high');
      expect(detectHarmPotential('Victims reported severe harm')).toBe('high');
      expect(detectHarmPotential('The product damaged health')).toBe('high');
    });

    it('detects safety/risk claims as high harm', () => {
      expect(detectHarmPotential('The product is dangerous')).toBe('high');
      expect(detectHarmPotential('This poses a safety risk')).toBe('high');
      expect(detectHarmPotential('There is a significant threat')).toBe('high');
    });

    it('detects fraud/crime claims as high harm', () => {
      expect(detectHarmPotential('The company committed fraud')).toBe('high');
      expect(detectHarmPotential('This is illegal activity')).toBe('high');
      expect(detectHarmPotential('Property was stolen')).toBe('high');
      expect(detectHarmPotential('Evidence of corruption')).toBe('high');
    });

    it('returns medium for neutral claims', () => {
      expect(detectHarmPotential('The company released a new product')).toBe('medium');
      expect(detectHarmPotential('The policy was implemented')).toBe('medium');
      expect(detectHarmPotential('The trial concluded')).toBe('medium');
    });

    it('handles empty or null-ish input', () => {
      expect(detectHarmPotential('')).toBe('medium');
      expect(detectHarmPotential(null as any)).toBe('medium');
      expect(detectHarmPotential(undefined as any)).toBe('medium');
    });
  });

  // ============================================================================
  // detectClaimContestation tests
  // ============================================================================
  describe('detectClaimContestation', () => {
    it('detects no contestation when no signals present', () => {
      const result = detectClaimContestation(
        'The policy was implemented successfully',
        'Evidence shows implementation occurred as planned'
      );
      
      expect(result.isContested).toBe(false);
      expect(result.factualBasis).toBe('unknown');
    });

    it('detects contestation without documented evidence as "opinion" (DOUBTED)', () => {
      const result = detectClaimContestation(
        'The trial was fair',
        'Critics disputed the fairness of the trial'
      );
      
      expect(result.isContested).toBe(true);
      expect(result.factualBasis).toBe('opinion');
      expect(result.contestedBy).toBe('critics (no documented evidence)');
    });

    it('detects documented contestation as "established" (CONTESTED)', () => {
      const result = detectClaimContestation(
        'The procedure was followed correctly',
        'An audit documented violations and critics disputed the findings'
      );
      
      expect(result.isContested).toBe(true);
      expect(result.factualBasis).toBe('established');
      expect(result.contestedBy).toBe('documented counter-evidence');
    });

    it('detects contestation with measurements as "established"', () => {
      const result = detectClaimContestation(
        'The efficiency is 80%',
        'Critics disputed this - study found only 45% efficiency'
      );
      
      expect(result.isContested).toBe(true);
      expect(result.factualBasis).toBe('established');
      expect(result.contestedBy).toBe('documented counter-evidence');
    });
  });

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

    it('keeps full weight for contested with "alleged" or "unknown" basis', () => {
      const uncontested = getClaimWeight({ confidence: 100 });
      
      const alleged = getClaimWeight({ 
        confidence: 100, 
        isContested: true, 
        factualBasis: 'alleged' 
      });
      const unknown = getClaimWeight({ 
        confidence: 100, 
        isContested: true, 
        factualBasis: 'unknown' 
      });
      
      expect(alleged).toBe(uncontested);
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

    it('does not reduce weight for doubted claims (opinion basis)', () => {
      const claims = [
        { truthPercentage: 90, confidence: 100 },  // weight = 1.0
        { 
          truthPercentage: 30, 
          confidence: 100, 
          isContested: true, 
          factualBasis: 'opinion' as const  // weight = 1.0 (full)
        }
      ];
      
      // (90*1 + 30*1) / (1+1) = 120 / 2 = 60
      const result = calculateWeightedVerdictAverage(claims);
      expect(result).toBe(60);
    });

    it('handles high harm potential claims correctly', () => {
      const claims = [
        { truthPercentage: 90, harmPotential: 'high' as const, confidence: 100 },  // weight = 1.5
        { truthPercentage: 30, harmPotential: 'low' as const, confidence: 100 }    // weight = 1.0
      ];
      
      // (90*1.5 + 30*1) / (1.5+1) = 165 / 2.5 = 66
      const result = calculateWeightedVerdictAverage(claims);
      expect(result).toBe(66);
    });
  });
});
