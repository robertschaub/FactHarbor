/**
 * Prompt Builder - Composes optimized prompts from base templates + provider variants + config adaptations
 *
 * This module dynamically builds prompts based on:
 * - Task type (understand, extract_facts, verdict, scope_refinement)
 * - LLM provider (anthropic, openai, google, mistral)
 * - Configuration (tiering mode, model knowledge mode)
 */

import { getUnderstandBasePrompt } from './base/understand-base';
import { getExtractFactsBasePrompt } from './base/extract-facts-base';
import { getVerdictBasePrompt } from './base/verdict-base';
import { getScopeRefinementBasePrompt } from './base/scope-refinement-base';
import { getDynamicPlanBasePrompt } from './base/dynamic-plan-base';
import { getDynamicAnalysisBasePrompt } from './base/dynamic-analysis-base';

import {
  getAnthropicUnderstandVariant,
  getAnthropicExtractFactsVariant,
  getAnthropicVerdictVariant,
  getAnthropicScopeRefinementVariant,
} from './providers/anthropic';

import {
  getOpenAIUnderstandVariant,
  getOpenAIExtractFactsVariant,
  getOpenAIVerdictVariant,
  getOpenAIScopeRefinementVariant,
} from './providers/openai';

import {
  getGeminiUnderstandVariant,
  getGeminiExtractFactsVariant,
  getGeminiVerdictVariant,
  getGeminiScopeRefinementVariant,
} from './providers/google';

import {
  getMistralUnderstandVariant,
  getMistralExtractFactsVariant,
  getMistralVerdictVariant,
  getMistralScopeRefinementVariant,
} from './providers/mistral';

import {
  getTieringUnderstandAdaptation,
  getTieringExtractFactsAdaptation,
  getTieringVerdictAdaptation,
} from './config-adaptations/tiering';

import {
  getWithModelKnowledgeAdaptation,
  getWithoutModelKnowledgeAdaptation,
} from './config-adaptations/knowledge-mode';

export type TaskType = 'understand' | 'extract_facts' | 'verdict' | 'scope_refinement' | 'dynamic_plan' | 'dynamic_analysis';
export type ProviderType = 'anthropic' | 'openai' | 'google' | 'mistral';

export interface PromptContext {
  task: TaskType;
  provider: ProviderType;
  modelName: string;
  config: {
    allowModelKnowledge: boolean;
    isLLMTiering: boolean;
    isBudgetModel: boolean; // Haiku, Mini, Flash
  };
  variables: {
    currentDate?: string;
    originalClaim?: string;
    scopesList?: string;
    isRecent?: boolean;
    textToAnalyze?: string;
    sourceSummary?: string;
  };
}

/**
 * Main prompt builder function
 */
export function buildPrompt(context: PromptContext): string {
  // 1. Get base template
  const basePrompt = getBaseTemplate(context);

  // 2. Get provider variant
  const providerVariant = getProviderVariant(context);

  // 3. Get config adaptations
  const configAdaptations = getConfigAdaptations(context);

  // 4. Compose final prompt
  return basePrompt + providerVariant + configAdaptations;
}

/**
 * Get base template for task
 */
function getBaseTemplate(context: PromptContext): string {
  const { task, variables } = context;

  switch (task) {
    case 'understand':
      return getUnderstandBasePrompt({
        currentDate: variables.currentDate || new Date().toISOString().split('T')[0],
        isRecent: variables.isRecent,
      });

    case 'extract_facts':
      return getExtractFactsBasePrompt({
        currentDate: variables.currentDate || new Date().toISOString().split('T')[0],
        originalClaim: variables.originalClaim || '',
        scopesList: variables.scopesList,
      });

    case 'verdict':
      return getVerdictBasePrompt({
        currentDate: variables.currentDate || new Date().toISOString().split('T')[0],
        originalClaim: variables.originalClaim || '',
        scopesList: variables.scopesList || 'No scopes defined',
        allowModelKnowledge: context.config.allowModelKnowledge,
      });

    case 'scope_refinement':
      return getScopeRefinementBasePrompt();

    case 'dynamic_plan':
      return getDynamicPlanBasePrompt({
        currentDate: variables.currentDate || new Date().toISOString().split('T')[0],
      });

    case 'dynamic_analysis':
      return getDynamicAnalysisBasePrompt({
        currentDate: variables.currentDate || new Date().toISOString().split('T')[0],
      });

    default:
      throw new Error(`Unknown task type: ${task}`);
  }
}

/**
 * Get provider-specific variant
 */
function getProviderVariant(context: PromptContext): string {
  const { task, provider } = context;

  // Map provider to variant functions
  const variantMap = {
    anthropic: {
      understand: getAnthropicUnderstandVariant,
      extract_facts: getAnthropicExtractFactsVariant,
      verdict: getAnthropicVerdictVariant,
      scope_refinement: getAnthropicScopeRefinementVariant,
      dynamic_plan: () => '',
      dynamic_analysis: () => '',
    },
    openai: {
      understand: getOpenAIUnderstandVariant,
      extract_facts: getOpenAIExtractFactsVariant,
      verdict: getOpenAIVerdictVariant,
      scope_refinement: getOpenAIScopeRefinementVariant,
      dynamic_plan: () => '',
      dynamic_analysis: () => '',
    },
    google: {
      understand: getGeminiUnderstandVariant,
      extract_facts: getGeminiExtractFactsVariant,
      verdict: getGeminiVerdictVariant,
      scope_refinement: getGeminiScopeRefinementVariant,
      dynamic_plan: () => '',
      dynamic_analysis: () => '',
    },
    mistral: {
      understand: getMistralUnderstandVariant,
      extract_facts: getMistralExtractFactsVariant,
      verdict: getMistralVerdictVariant,
      scope_refinement: getMistralScopeRefinementVariant,
      dynamic_plan: () => '',
      dynamic_analysis: () => '',
    },
  };

  return variantMap[provider][task]();
}

/**
 * Get configuration-specific adaptations
 */
function getConfigAdaptations(context: PromptContext): string {
  const { task, config } = context;
  let adaptations = '';

  // Add tiering adaptations for budget models
  if (config.isLLMTiering && config.isBudgetModel) {
    switch (task) {
      case 'understand':
        adaptations += getTieringUnderstandAdaptation();
        break;
      case 'extract_facts':
        adaptations += getTieringExtractFactsAdaptation();
        break;
      case 'verdict':
        adaptations += getTieringVerdictAdaptation();
        break;
    }
  }

  // Add model knowledge adaptations (only for verdict task)
  if (task === 'verdict') {
    if (config.allowModelKnowledge) {
      adaptations += getWithModelKnowledgeAdaptation();
    } else {
      adaptations += getWithoutModelKnowledgeAdaptation();
    }
  }

  return adaptations;
}

/**
 * Helper: Detect if model is a budget model
 */
export function isBudgetModel(modelName: string): boolean {
  const budgetModels = [
    'claude-3-5-haiku',
    'claude-3-haiku',
    'gpt-3.5-turbo',
    'gpt-4o-mini',
    'gemini-1.5-flash',
    'gemini-flash',
    'mistral-small',
    'mistral-medium',
  ];

  return budgetModels.some((budget) => modelName.toLowerCase().includes(budget));
}

/**
 * Helper: Detect provider from model name
 */
export function detectProvider(modelName: string): ProviderType {
  const lowerName = modelName.toLowerCase();

  if (lowerName.includes('claude')) return 'anthropic';
  if (lowerName.includes('gpt')) return 'openai';
  if (lowerName.includes('gemini')) return 'google';
  if (lowerName.includes('mistral')) return 'mistral';

  // Default fallback
  return 'anthropic';
}
