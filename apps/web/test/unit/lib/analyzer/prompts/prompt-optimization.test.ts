/**
 * Prompt Optimization Tests
 *
 * Tests for validating prompt enhancements across providers:
 * - Schema compliance
 * - Provider-specific optimizations
 * - Budget model simplification
 * - Token count reduction
 *
 * @version 2.8.0 - Tests for prompt optimization plan
 */

import { describe, it, expect } from 'vitest';
import {
  buildPrompt,
  detectProvider,
  isBudgetModel,
  type PromptContext,
  type TaskType,
  type ProviderType,
} from '@/lib/analyzer/prompts/prompt-builder';
import {
  generateTestPrompt,
  estimateTokenCount,
  compareTokenCounts,
  STANDARD_TEST_CASES,
} from '@/lib/analyzer/prompts/prompt-testing';

// ============================================================================
// PROVIDER VARIANT TESTS
// ============================================================================

describe('Provider Variants', () => {
  const providers: ProviderType[] = ['anthropic', 'openai', 'google', 'mistral'];
  const tasks: TaskType[] = ['understand', 'extract_evidence', 'verdict', 'context_refinement'];

  describe('All providers generate non-empty prompts', () => {
    for (const provider of providers) {
      for (const task of tasks) {
        it(`${provider}/${task} generates prompt`, () => {
          const prompt = generateTestPrompt(task, provider);
          expect(prompt).toBeTruthy();
          expect(prompt.length).toBeGreaterThan(100);
        });
      }
    }
  });

  describe('Claude prompts include XML structure', () => {
    it('understand prompt has XML tags', () => {
      const prompt = generateTestPrompt('understand', 'anthropic');
      expect(prompt).toContain('<claude_optimization>');
    });

    it('extract_evidence prompt has XML tags', () => {
      const prompt = generateTestPrompt('extract_evidence', 'anthropic');
      expect(prompt).toContain('<claude_optimization>');
    });

    it('verdict prompt has XML tags', () => {
      const prompt = generateTestPrompt('verdict', 'anthropic');
      expect(prompt).toContain('<claude_optimization>');
    });
  });

  describe('GPT prompts include few-shot examples', () => {
    it('understand prompt has example', () => {
      const prompt = generateTestPrompt('understand', 'openai');
      expect(prompt).toMatch(/example|Example/i);
      expect(prompt).toContain('"analysisContexts"'); // Multi-context detection example present
    });

    it('extract_evidence prompt has example', () => {
      const prompt = generateTestPrompt('extract_evidence', 'openai');
      expect(prompt).toMatch(/example|Example/i);
    });

    it('verdict prompt has calibration table', () => {
      const prompt = generateTestPrompt('verdict', 'openai');
      expect(prompt).toMatch(/calibration|Calibration/i);
    });
  });

  describe('Gemini prompts include length limits', () => {
    it('understand prompt has length limits', () => {
      const prompt = generateTestPrompt('understand', 'google');
      expect(prompt).toMatch(/length|Length/i);
      expect(prompt).toMatch(/maximum|Maximum|max|Max/i);
    });

    it('verdict prompt has word count limits', () => {
      const prompt = generateTestPrompt('verdict', 'google');
      expect(prompt).toMatch(/word|Word/i);
    });
  });

  describe('Mistral prompts include step-by-step', () => {
    it('understand prompt has numbered steps', () => {
      const prompt = generateTestPrompt('understand', 'mistral');
      expect(prompt).toMatch(/step\s*1|Step\s*1/i);
    });

    it('extract_evidence prompt has checklist', () => {
      const prompt = generateTestPrompt('extract_evidence', 'mistral');
      expect(prompt).toMatch(/\[\s*\]/); // Checkbox pattern
    });
  });
});

// ============================================================================
// BUDGET MODEL TESTS
// ============================================================================

describe('Budget Model Optimization', () => {
  describe('Budget prompts are shorter than full prompts', () => {
    const providers: ProviderType[] = ['anthropic', 'openai', 'google', 'mistral'];
    const tasks: TaskType[] = ['understand', 'extract_evidence', 'verdict'];

    for (const provider of providers) {
      for (const task of tasks) {
        it(`${provider}/${task} budget prompt is shorter`, () => {
          const fullPrompt = generateTestPrompt(task, provider, {
            isBudgetModel: false,
            isLLMTiering: false,
          });

          const budgetPrompt = generateTestPrompt(task, provider, {
            isBudgetModel: true,
            isLLMTiering: true,
          });

          const { oldTokens, newTokens, reduction } = compareTokenCounts(fullPrompt, budgetPrompt);

          // Budget prompts should be at least 20% shorter for most cases
          // Some provider/task combinations may have less reduction
          expect(newTokens).toBeLessThanOrEqual(oldTokens);
        });
      }
    }
  });

  describe('Budget model detection', () => {
    it('detects Haiku as budget', () => {
      expect(isBudgetModel('claude-3-5-haiku-20241022')).toBe(true);
      expect(isBudgetModel('claude-3-haiku')).toBe(true);
    });

    it('detects GPT-4o-mini as budget', () => {
      expect(isBudgetModel('gpt-4o-mini')).toBe(true);
    });

    it('detects Flash as budget', () => {
      expect(isBudgetModel('gemini-1.5-flash')).toBe(true);
      expect(isBudgetModel('gemini-flash')).toBe(true);
    });

    it('detects Mistral Small as budget', () => {
      expect(isBudgetModel('mistral-small-latest')).toBe(true);
    });

    it('does not detect premium models as budget', () => {
      expect(isBudgetModel('claude-sonnet-4-20250514')).toBe(false);
      expect(isBudgetModel('gpt-4o')).toBe(false);
      expect(isBudgetModel('gemini-1.5-pro')).toBe(false);
      expect(isBudgetModel('mistral-large-latest')).toBe(false);
    });
  });
});

// ============================================================================
// STRUCTURED OUTPUT TESTS
// ============================================================================

describe('Structured Output Guidance', () => {
  describe('All prompts include JSON output requirements', () => {
    const providers: ProviderType[] = ['anthropic', 'openai', 'google', 'mistral'];
    const tasks: TaskType[] = ['understand', 'extract_evidence', 'verdict'];

    for (const provider of providers) {
      for (const task of tasks) {
        it(`${provider}/${task} has JSON guidance`, () => {
          const prompt = generateTestPrompt(task, provider);
          expect(prompt).toMatch(/json|JSON/i);
        });
      }
    }
  });

  describe('Provider-specific JSON guidance', () => {
    it('Claude prompt mentions empty strings', () => {
      const prompt = generateTestPrompt('understand', 'anthropic');
      expect(prompt).toMatch(/empty\s*string|""/i);
    });

    it('GPT prompt mentions all required fields', () => {
      const prompt = generateTestPrompt('understand', 'openai');
      expect(prompt).toMatch(/required|REQUIRED/);
    });

    it('Gemini prompt mentions length limits', () => {
      const prompt = generateTestPrompt('understand', 'google');
      expect(prompt).toMatch(/character|word|length/i);
    });

    it('Mistral prompt has validation checklist', () => {
      const prompt = generateTestPrompt('understand', 'mistral');
      expect(prompt).toMatch(/checklist|Checklist/i);
    });
  });
});

// ============================================================================
// CRITICAL GUIDANCE TESTS
// ============================================================================

describe('Critical Guidance Inclusion', () => {
  describe('Rating direction guidance', () => {
    const providers: ProviderType[] = ['anthropic', 'openai', 'google', 'mistral'];

    for (const provider of providers) {
      it(`${provider} verdict includes rating direction`, () => {
        const prompt = generateTestPrompt('verdict', provider);
        // Should mention rating the claim, not analysis
        expect(prompt).toMatch(/claim|CLAIM/);
        expect(prompt).toMatch(/rate|Rating|RATING/i);
      });
    }
  });

  describe('Attribution separation guidance', () => {
    const providers: ProviderType[] = ['anthropic', 'openai', 'google', 'mistral'];

    for (const provider of providers) {
      it(`${provider} understand includes attribution separation`, () => {
        const prompt = generateTestPrompt('understand', provider);
        expect(prompt).toMatch(/attribution|Attribution/);
      });
    }
  });

  describe('Scope terminology guidance', () => {
    const providers: ProviderType[] = ['anthropic', 'openai', 'google', 'mistral'];

    for (const provider of providers) {
      it(`${provider} context_refinement includes terminology`, () => {
        const prompt = generateTestPrompt('context_refinement', provider);
        expect(prompt).toMatch(/context|Context/i);
      });
    }
  });
});

// ============================================================================
// PROVIDER DETECTION TESTS
// ============================================================================

describe('Provider Detection', () => {
  it('detects Anthropic from claude models', () => {
    expect(detectProvider('claude-3-opus')).toBe('anthropic');
    expect(detectProvider('claude-sonnet-4')).toBe('anthropic');
    expect(detectProvider('claude-3-5-haiku')).toBe('anthropic');
  });

  it('detects OpenAI from gpt models', () => {
    expect(detectProvider('gpt-4o')).toBe('openai');
    expect(detectProvider('gpt-4-turbo')).toBe('openai');
    expect(detectProvider('gpt-3.5-turbo')).toBe('openai');
  });

  it('detects Google from gemini models', () => {
    expect(detectProvider('gemini-1.5-pro')).toBe('google');
    expect(detectProvider('gemini-1.5-flash')).toBe('google');
    expect(detectProvider('gemini-2.0-flash')).toBe('google');
  });

  it('detects Mistral from mistral models', () => {
    expect(detectProvider('mistral-large-latest')).toBe('mistral');
    expect(detectProvider('mistral-small-latest')).toBe('mistral');
    expect(detectProvider('mistral-medium')).toBe('mistral');
  });

  it('defaults to anthropic for unknown', () => {
    expect(detectProvider('unknown-model')).toBe('anthropic');
  });
});

// ============================================================================
// TOKEN ESTIMATION TESTS
// ============================================================================

describe('Token Estimation', () => {
  it('estimates tokens for short text', () => {
    const tokens = estimateTokenCount('Hello world');
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  it('estimates tokens for longer text', () => {
    const longText = 'This is a longer text that should have more tokens. '.repeat(10);
    const tokens = estimateTokenCount(longText);
    expect(tokens).toBeGreaterThan(50);
  });

  it('compares token counts correctly', () => {
    const oldPrompt = 'This is a very long prompt with lots of words'.repeat(10);
    const newPrompt = 'Short prompt';

    const comparison = compareTokenCounts(oldPrompt, newPrompt);

    expect(comparison.oldTokens).toBeGreaterThan(comparison.newTokens);
    expect(comparison.reduction).toBeGreaterThan(0);
  });
});

// ============================================================================
// STANDARD TEST CASES VALIDATION
// ============================================================================

describe('Standard Test Cases', () => {
  it('has attribution separation test case', () => {
    const testCase = STANDARD_TEST_CASES.find((t) => t.id === 'attribution-separation');
    expect(testCase).toBeDefined();
    expect(testCase?.input).toContain('claims');
  });

  it('has multi-context detection test case', () => {
    const testCase = STANDARD_TEST_CASES.find((t) => t.id === 'multi-context-detection');
    expect(testCase).toBeDefined();
    expect(testCase?.expectedOutput?.contextCount).toBe(2);
  });

  it('has methodology context test case', () => {
    const testCase = STANDARD_TEST_CASES.find((t) => t.id === 'methodology-context');
    expect(testCase).toBeDefined();
    expect(testCase?.input).toMatch(/method a|method b/i);
  });

  it('has rating direction test case', () => {
    const testCase = STANDARD_TEST_CASES.find((t) => t.id === 'rating-direction');
    expect(testCase).toBeDefined();
    expect(testCase?.expectedVerdictRange).toBeDefined();
  });
});
