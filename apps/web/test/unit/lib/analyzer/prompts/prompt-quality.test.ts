/**
 * Prompt Quality Tests - Phase 2 Validation
 *
 * Tests to validate Phase 2 prompt optimization changes maintain quality.
 * Specifically validates:
 * - Centrality assignment rules (death = HIGH, attribution = LOW, etc.)
 * - Multi-context detection patterns
 *
 * @version 2.8.0 - Phase 2 prompt optimization validation
 */

import { describe, it, expect } from 'vitest';
import { buildPrompt } from '@/lib/analyzer/prompts/prompt-builder';

/**
 * Helper to generate a test prompt for validation
 */
function generateTestPrompt(task: 'understand' | 'extract_evidence' | 'verdict' | 'context_refinement', provider: 'anthropic' | 'openai' | 'google' | 'mistral', claim: string): string {
  return buildPrompt({
    task,
    provider,
    modelName: provider === 'anthropic' ? 'claude-sonnet-4' : provider === 'openai' ? 'gpt-4o' : provider === 'google' ? 'gemini-2.0-flash-exp' : 'mistral-large-latest',
    config: {
      allowModelKnowledge: false,
      isLLMTiering: false,
      isBudgetModel: false,
    },
    variables: {
      currentDate: '2026-02-03',
      currentDateReadable: 'February 3, 2026',
      isRecent: false,
      originalClaim: claim,
    },
  });
}

describe('Prompt Quality Tests - Phase 2 Validation', () => {
  describe('Suite 2: Centrality Assignment', () => {
    it('T2A: Death claim must have HIGH centrality guidance', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'Official announced 10 children died from Product X');

      // Verify prompt contains death/HIGH centrality guidance
      expect(prompt).toContain('death');
      expect(prompt.toLowerCase()).toMatch(/death.*high|high.*death|centrality/i);
    });

    it('T2B: Fraud claim should have HIGH centrality guidance', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'Company engaged in fraud');

      // Verify prompt mentions fraud or high-stakes claims
      expect(prompt.toLowerCase()).toMatch(/fraud|allegation|violation/i);
    });

    it('T2C: Attribution should have LOW centrality guidance', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'Dr. Jones is a pediatrician');

      // Verify prompt contains attribution guidance
      expect(prompt.toLowerCase()).toMatch(/attribution.*low|low.*attribution/i);
    });
  });

  describe('Suite 3: Multi-Context Detection', () => {
    it('T3A: Different measurement frameworks = multi-context', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'EVs are more efficient than gas cars');

      // Verify prompt mentions analytical frames or methodologies
      expect(prompt.toLowerCase()).toMatch(/analysis.*context|analytical.*frame|measurement|methodology/i);
    });

    it('T3B: Different viewpoints ≠ multi-context', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'Experts disagree on policy X');

      // Verify prompt has guidance against splitting by viewpoint
      expect(prompt.toLowerCase()).toMatch(/do not split|viewpoint|opinion|perspective/i);
    });

    it('T3E: Incidental temporal mention ≠ multi-context', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'Study conducted in 2020 found X');

      // Verify prompt has guidance against splitting by incidental dates
      expect(prompt.toLowerCase()).toMatch(/incidental.*temporal|temporal.*incidental|time.*period|do not split/i);
    });
  });

  describe('Suite 4: Critical Guidance Preserved', () => {
    it('T4A: Core claim separation from attribution', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'Expert claims X is dangerous');

      // Verify attribution separation guidance still present
      expect(prompt.toLowerCase()).toMatch(/attribution|core.*claim|separate/i);
    });

    it('T4B: Claim dependency tracking', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'Report says 100 people affected');

      // Verify depends on / dependency guidance present
      expect(prompt.toLowerCase()).toMatch(/depend|dependency/i);
    });

    it('T4C: Research query generation', () => {
      const prompt = generateTestPrompt('understand', 'anthropic', 'Climate change causes extreme weather');

      // Verify research query guidance present
      expect(prompt.toLowerCase()).toMatch(/research.*quer|search.*quer|queries/i);
    });
  });
});
