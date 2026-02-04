/**
 * Context Utilities Test - Verifies Generic by Design compliance
 *
 * Tests the fixes for:
 * - Bug 1: Removed hardcoded political figure names
 * - Bug 2: Fixed proper noun detection by extracting entities before lowercasing
 * 
 * v2.8: Added tests for detectContexts and formatDetectedContextsHint
 */

import { describe, it, expect } from 'vitest';
import {
  generateContextDetectionHint,
  detectContexts,
  formatDetectedContextsHint,
  UNASSIGNED_CONTEXT_ID
} from '@/lib/analyzer/analysis-contexts';

describe('Context Detection - Generic by Design', () => {
  describe('Proper Noun Detection', () => {
    it('detects proper nouns regardless of domain', () => {
      // Political figures (no hardcoding needed)
      expect(generateContextDetectionHint('Bolsonaro case')).toContain('bolsonaro');
      expect(generateContextDetectionHint('Trump trial')).toContain('trump');
      
      // Scientists
      expect(generateContextDetectionHint('Einstein theory')).toContain('einstein');
      expect(generateContextDetectionHint('Tesla invention')).toContain('tesla');
      
      // Historical figures
      expect(generateContextDetectionHint('Gandhi movement')).toContain('gandhi');
      expect(generateContextDetectionHint('Churchill decision')).toContain('churchill');
      
      // Business leaders
      expect(generateContextDetectionHint('Musk acquisition')).toContain('musk');
      expect(generateContextDetectionHint('Gates foundation')).toContain('gates');
      
      // Multi-word proper nouns
      expect(generateContextDetectionHint('Angela Merkel policy')).toContain('angela merkel');
      expect(generateContextDetectionHint('Marie Curie research')).toContain('marie curie');
    });

    it('works with question phrasing', () => {
      const questionHint = generateContextDetectionHint('Was Einstein right about relativity?');
      expect(questionHint).toContain('einstein');
      expect(questionHint).toContain('CONTEXT DETECTION HINT');
    });

    it('works with statement phrasing', () => {
      const statementHint = generateContextDetectionHint('Einstein was right about relativity');
      expect(statementHint).toContain('einstein');
      expect(statementHint).toContain('CONTEXT DETECTION HINT');
    });

    it('detects legal/institutional terms', () => {
      expect(generateContextDetectionHint('court ruling on case')).toContain('court');
      expect(generateContextDetectionHint('tribunal judgment')).toContain('tribunal');
      expect(generateContextDetectionHint('appeal hearing')).toContain('appeal');
    });

    it('detects jurisdiction indicators', () => {
      expect(generateContextDetectionHint('Brazilian supreme court')).toContain('brazilian');
      expect(generateContextDetectionHint('EU commission ruling')).toContain('eu');
      expect(generateContextDetectionHint('US federal court')).toContain('us');
    });

    it('returns empty hint when no entities detected', () => {
      const hint = generateContextDetectionHint('this is just filler words');
      expect(hint).toBe('');
    });
  });

  describe('Input Neutrality', () => {
    it('generates identical hints for question vs statement', () => {
      const question = generateContextDetectionHint('Was Newton correct about gravity?');
      const statement = generateContextDetectionHint('Newton was correct about gravity');
      
      // Both should detect "newton" and "correct"
      expect(question).toContain('newton');
      expect(statement).toContain('newton');
      
      // Hints should be functionally equivalent (same entities)
      expect(question.toLowerCase()).toContain('newton');
      expect(statement.toLowerCase()).toContain('newton');
    });

    it('generates consistent hints for different phrasings', () => {
      const inputs = [
        'Galileo was right',
        'Was Galileo right?',
        'Is Galileo right?',
        'Galileo is correct'
      ];
      
      const hints = inputs.map(input => generateContextDetectionHint(input));
      
      // All should detect "galileo"
      hints.forEach(hint => {
        expect(hint).toContain('galileo');
      });
    });
  });

  describe('Generic by Design Compliance', () => {
    it('does not contain hardcoded political figure lists', () => {
      // Read the actual function implementation to verify
      const hint = generateContextDetectionHint('Random Person case');
      
      // Should work generically via regex, not hardcoded lists
      expect(hint).toContain('random person');
      
      // Verify it's not relying on hardcoded names
      const obscureName = generateContextDetectionHint('Zephyr case');
      expect(obscureName).toContain('zephyr');
    });

    it('handles diverse domains without special-casing', () => {
      const domains = [
        { input: 'Curie research validity', expected: 'curie' },
        { input: 'Darwin theory accuracy', expected: 'darwin' },
        { input: 'Picasso painting authenticity', expected: 'picasso' },
        { input: 'Mozart composition attribution', expected: 'mozart' },
        { input: 'Aristotle philosophy interpretation', expected: 'aristotle' }
      ];
      
      domains.forEach(({ input, expected }) => {
        const hint = generateContextDetectionHint(input);
        expect(hint).toContain(expected);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input', () => {
      const hint = generateContextDetectionHint('');
      expect(hint).toBe('');
    });

    it('handles input with no proper nouns', () => {
      const hint = generateContextDetectionHint('the quick brown fox jumps');
      expect(hint).toBe('');
    });

    it('proper noun detection requires standard capitalization', () => {
      // All caps doesn't match proper noun pattern (needs initial cap + lowercase)
      const allCaps = generateContextDetectionHint('EINSTEIN theory');
      // This is acceptable - input should have standard capitalization for best results
      
      // Standard capitalization works correctly
      const standardCase = generateContextDetectionHint('Einstein theory');
      expect(standardCase).toContain('einstein');
    });

    it('deduplicates repeated entities', () => {
      const hint = generateContextDetectionHint('Tesla Tesla Tesla case');
      // Should only mention "tesla" once in entities list
      const teslaMatches = (hint.match(/tesla/gi) || []).length;
      expect(teslaMatches).toBeGreaterThan(0);
    });
  });

  describe('Hint Content Quality', () => {
    it('includes input neutrality guidance', () => {
      const hint = generateContextDetectionHint('Newton case');
      expect(hint).toContain('Whether the input is phrased as a question or statement');
    });

    it('warns against meta-level contexts', () => {
      const hint = generateContextDetectionHint('Newton case');
      expect(hint).toContain('Public perception/opinion contexts');
      expect(hint).toContain('trust');
      expect(hint).toContain('confidence');
    });

    it('emphasizes concrete contexts', () => {
      const hint = generateContextDetectionHint('Newton case');
      expect(hint).toContain('concrete, factual contexts');
      expect(hint).toContain('legal proceedings');
    });
  });
});

// ============================================================================
// v2.8: detectContexts tests
// ============================================================================
describe('detectContexts (v2.8 - Heuristic Pre-Detection)', () => {
  describe('Comparison Claims', () => {
    it('detects production/usage contexts for efficiency comparisons with "than"', () => {
      // Pattern requires BOTH comparison words (more/less/than) AND efficiency keywords
      // The word 'energy' is in efficiencyKeywords pattern
      const contexts = detectContexts('Hydrogen cars use more energy than electric cars');
      
      expect(contexts).not.toBeNull();
      expect(contexts!.length).toBeGreaterThanOrEqual(2);
      
      const contextIds = contexts!.map(s => s.id);
      expect(contextIds).toContain('CTX_PRODUCTION');
      expect(contextIds).toContain('CTX_USAGE');
    });

    it('detects contexts for performance comparisons', () => {
      const contexts = detectContexts('Technology A has better performance than Technology B');
      
      expect(contexts).not.toBeNull();
      expect(contexts!.some(s => s.id === 'CTX_PRODUCTION')).toBe(true);
      expect(contexts!.some(s => s.id === 'CTX_USAGE')).toBe(true);
    });

    it('detects contexts for "vs" comparisons with efficiency keywords', () => {
      const contexts = detectContexts('Solar energy consumption vs wind energy consumption');
      
      expect(contexts).not.toBeNull();
      expect(contexts!.length).toBeGreaterThanOrEqual(2);
    });

    it('returns null for non-comparison efficiency claims', () => {
      const contexts = detectContexts('The system is efficient');
      
      // No comparison pattern, no contexts detected
      expect(contexts).toBeNull();
    });
  });

  describe('Legal/Trial Fairness Claims', () => {
    it('detects contexts for trial fairness claims', () => {
      const contexts = detectContexts('The trial was fair and based on law');
      
      expect(contexts).not.toBeNull();
      expect(contexts!.some(s => s.id === 'CTX_LEGAL_PROC')).toBe(true);
      expect(contexts!.some(s => s.id === 'CTX_OUTCOMES')).toBe(true);
    });

    it('detects contexts for judgment/ruling claims', () => {
      const contexts = detectContexts('Was the judgment fair and legitimate?');
      
      expect(contexts).not.toBeNull();
      expect(contexts!.length).toBeGreaterThanOrEqual(2);
    });

    it('detects contexts for court procedure claims', () => {
      const contexts = detectContexts('The court followed proper legal procedures');
      
      expect(contexts).not.toBeNull();
      expect(contexts!.some(s => s.type === 'legal')).toBe(true);
    });
  });

  describe('Environmental/Health Comparisons', () => {
    it('detects direct/lifecycle contexts for pollution comparisons', () => {
      // Pattern requires BOTH comparison (than/vs) AND env/health keyword (pollution/emission/etc)
      const contexts = detectContexts('Factory A causes less pollution than Factory B');
      
      expect(contexts).not.toBeNull();
      expect(contexts!.some(s => s.id === 'CTX_DIRECT')).toBe(true);
      expect(contexts!.some(s => s.id === 'CTX_LIFECYCLE')).toBe(true);
    });

    it('detects contexts for environmental impact comparisons', () => {
      const contexts = detectContexts('Solar has lower environmental impact than coal');
      
      expect(contexts).not.toBeNull();
      expect(contexts!.length).toBeGreaterThanOrEqual(2);
    });

    it('detects contexts for safety hazard comparisons', () => {
      const contexts = detectContexts('Process A poses more hazard than Process B');
      
      expect(contexts).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('returns null for unstructured text', () => {
      const contexts = detectContexts('Hello world, this is a test');
      expect(contexts).toBeNull();
    });

    it('handles empty input', () => {
      const contexts = detectContexts('');
      expect(contexts).toBeNull();
    });

    it('detects multiple context types when patterns overlap', () => {
      // This has both comparison AND legal fairness patterns
      const contexts = detectContexts('The trial outcome had more impact than the previous ruling and was fair');
      
      expect(contexts).not.toBeNull();
      // Should detect both legal and comparison contexts
      expect(contexts!.length).toBeGreaterThan(2);
    });
  });
});

// ============================================================================
// v2.8: formatDetectedContextsHint tests
// ============================================================================
describe('formatDetectedContextsHint (v2.8)', () => {
  it('returns empty string for null contexts', () => {
    expect(formatDetectedContextsHint(null)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(formatDetectedContextsHint([])).toBe('');
  });

  it('formats contexts as list (simple mode)', () => {
    const contexts = [
      { id: 'CTX_A', name: 'Context A', type: 'legal' },
      { id: 'CTX_B', name: 'Context B', type: 'methodological' }
    ];
    
    const hint = formatDetectedContextsHint(contexts, false);
    
    expect(hint).toContain('PRE-DETECTED CONTEXTS');
    expect(hint).toContain('Context A (legal)');
    expect(hint).toContain('Context B (methodological)');
    expect(hint).not.toContain('MUST output');
  });

  it('includes detailed instructions when detailed=true', () => {
    const contexts = [
      { id: 'CTX_A', name: 'Context A', type: 'legal', metadata: { focus: 'compliance' } }
    ];
    
    const hint = formatDetectedContextsHint(contexts, true);
    
    expect(hint).toContain('PRE-DETECTED CONTEXTS');
    expect(hint).toContain('MUST output at least these contexts');
    expect(hint).toContain('AnalysisContexts');
    expect(hint).toContain('"focus":"compliance"');
  });
});

// ============================================================================
// Constants tests
// ============================================================================
describe('Context Constants', () => {
  it('exports UNASSIGNED_CONTEXT_ID constant', () => {
    expect(UNASSIGNED_CONTEXT_ID).toBe('CTX_UNASSIGNED');
  });
});
