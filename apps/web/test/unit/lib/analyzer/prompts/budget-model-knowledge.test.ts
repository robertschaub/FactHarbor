/**
 * Fast-Tier Model Knowledge Mode Test
 *
 * Verifies that fast-tier prompts respect the FH_ALLOW_MODEL_KNOWLEDGE setting
 *
 * Bug Fix: Fast-tier prompts were bypassing model knowledge configuration,
 * causing inconsistent behavior between fast-tier and premium models.
 */

import { describe, it, expect } from 'vitest';
import { buildPrompt, type PromptContext } from '@/lib/analyzer/prompts/prompt-builder';

describe('Fast-Tier Model Knowledge Mode', () => {
  it('includes EVIDENCE-ONLY guidance when allowModelKnowledge=false', () => {
    const context: PromptContext = {
      task: 'verdict',
      provider: 'anthropic',
      config: {
        isLLMTiering: true,
        isBudgetModel: true,
        allowModelKnowledge: false,
      },
      variables: {
        currentDate: '2026-01-19',
        originalClaim: 'Test claim',
      },
    };

    const prompt = buildPrompt(context);

    // Should include evidence-only instructions
    expect(prompt).toContain('EVIDENCE-ONLY');
    expect(prompt).toContain('Do NOT use your training data');
    expect(prompt).toContain('mark "neutral"');

    // Should NOT include model knowledge instructions
    expect(prompt).not.toContain('Use your training data');
    expect(prompt).not.toContain('extensive knowledge');
  });

  it('includes MODEL KNOWLEDGE guidance when allowModelKnowledge=true', () => {
    const context: PromptContext = {
      task: 'verdict',
      provider: 'anthropic',
      config: {
        isLLMTiering: true,
        isBudgetModel: true,
        allowModelKnowledge: true,
      },
      variables: {
        currentDate: '2026-01-19',
        originalClaim: 'Test claim',
      },
    };

    const prompt = buildPrompt(context);

    // Should include model knowledge instructions
    expect(prompt).toContain('Use your training data');
    expect(prompt).toContain('If you know well-established information from training data');

    // Should NOT include evidence-only instructions
    expect(prompt).not.toContain('EVIDENCE-ONLY');
  });

  it('non-fast-tier models also respect allowModelKnowledge setting', () => {
    const evidenceOnlyContext: PromptContext = {
      task: 'verdict',
      provider: 'anthropic',
      config: {
        isLLMTiering: false,
        isBudgetModel: false,
        allowModelKnowledge: false,
      },
      variables: {
        currentDate: '2026-01-19',
        originalClaim: 'Test claim',
      },
    };

    const evidenceOnlyPrompt = buildPrompt(evidenceOnlyContext);
    expect(evidenceOnlyPrompt).toContain('EVIDENCE-ONLY');

    const modelKnowledgeContext: PromptContext = {
      ...evidenceOnlyContext,
      config: {
        ...evidenceOnlyContext.config,
        allowModelKnowledge: true,
      },
    };

    const modelKnowledgePrompt = buildPrompt(modelKnowledgeContext);
    expect(modelKnowledgePrompt).toContain('USE YOUR TRAINING DATA');
  });

  it('fast-tier vs premium prompts have consistent knowledge mode behavior', () => {
    const budgetContext: PromptContext = {
      task: 'verdict',
      provider: 'anthropic',
      config: {
        isLLMTiering: true,
        isBudgetModel: true,
        allowModelKnowledge: false,
      },
      variables: {
        currentDate: '2026-01-19',
        originalClaim: 'Test claim',
      },
    };

    const nonBudgetContext: PromptContext = {
      ...budgetContext,
      config: {
        isLLMTiering: false,
        isBudgetModel: false,
        allowModelKnowledge: false,
      },
    };

    const budgetPrompt = buildPrompt(budgetContext);
    const nonBudgetPrompt = buildPrompt(nonBudgetContext);

    // Both should enforce evidence-only mode
    expect(budgetPrompt).toContain('EVIDENCE-ONLY');
    expect(nonBudgetPrompt).toContain('EVIDENCE-ONLY');

    // Neither should allow model knowledge
    expect(budgetPrompt).not.toContain('Use your training data');
    expect(nonBudgetPrompt).not.toContain('Use your training data');
  });
});
