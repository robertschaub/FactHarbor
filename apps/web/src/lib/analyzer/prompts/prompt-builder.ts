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
  getOrchestratedUnderstandPrompt,
  type OrchestratedUnderstandVariables,
} from './base/orchestrated-understand';
import {
  getSupplementalClaimsPromptForProvider,
  getSupplementalScopesPromptForProvider,
  getOutcomeClaimsExtractionPrompt,
  type SupplementalClaimsVariables,
} from './base/orchestrated-supplemental';

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
  getBudgetUnderstandPrompt,
  getBudgetExtractFactsPrompt,
  getBudgetVerdictPrompt,
} from './config-adaptations/tiering';

import {
  getWithModelKnowledgeAdaptation,
  getWithoutModelKnowledgeAdaptation,
} from './config-adaptations/knowledge-mode';

import {
  getStructuredOutputGuidance,
} from './config-adaptations/structured-output';

export type TaskType =
  | 'understand'
  | 'extract_facts'
  | 'verdict'
  | 'scope_refinement'
  | 'dynamic_plan'
  | 'dynamic_analysis'
  | 'orchestrated_understand'
  | 'supplemental_claims'
  | 'supplemental_scopes';
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
    currentDateReadable?: string;
    originalClaim?: string;
    scopesList?: string;
    isRecent?: boolean;
    textToAnalyze?: string;
    sourceSummary?: string;
    // Orchestrated pipeline variables
    keyFactorHints?: Array<{ factor: string; category: string; evaluationCriteria: string }>;
    minCoreClaimsPerContext?: number;
    hasScopes?: boolean;
  };
}

/**
 * Main prompt builder function
 *
 * For budget models with tiering enabled, uses simplified prompts that:
 * - Reduce token count by ~40%
 * - Skip verbose explanations
 * - Focus on direct task completion
 */
export function buildPrompt(context: PromptContext): string {
  const { task, config, variables } = context;

  // For budget models with tiering, use ultra-simplified prompts for extraction tasks
  // This significantly reduces token count and speeds up responses
  const useBudgetPrompt = config.isLLMTiering && config.isBudgetModel &&
    ['understand', 'extract_facts', 'verdict'].includes(task);

  if (useBudgetPrompt) {
    return getBudgetPrompt(context);
  }

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
 * Get ultra-simplified budget prompt for fast models
 * Used when FH_LLM_TIERING=on and model is Haiku/Flash/Mini
 */
function getBudgetPrompt(context: PromptContext): string {
  const { task, provider, variables } = context;
  const currentDate = variables.currentDate || new Date().toISOString().split('T')[0];

  let basePrompt: string;

  switch (task) {
    case 'understand':
      basePrompt = getBudgetUnderstandPrompt(currentDate);
      break;
    case 'extract_facts':
      basePrompt = getBudgetExtractFactsPrompt(currentDate, variables.originalClaim || '');
      break;
    case 'verdict':
      basePrompt = getBudgetVerdictPrompt(currentDate, variables.originalClaim || '');
      break;
    default:
      // Fall back to normal prompt composition for other tasks
      return getBaseTemplate(context) + getProviderVariant(context) + getConfigAdaptations(context);
  }

  // Add minimal provider-specific hint for budget models
  const providerHint = getBudgetProviderHint(provider, task);

  return basePrompt + providerHint;
}

/**
 * Get minimal provider hint for budget models
 * Much shorter than full provider variants
 */
function getBudgetProviderHint(provider: ProviderType, task: TaskType): string {
  switch (provider) {
    case 'anthropic':
      return '\n\n[Claude: Be direct, no hedging. Valid JSON output.]';
    case 'openai':
      return '\n\n[GPT: Follow example patterns exactly. All fields required.]';
    case 'google':
      return '\n\n[Gemini: Keep outputs concise. Use "" not null for strings.]';
    case 'mistral':
      return '\n\n[Mistral: Follow numbered steps. Output valid JSON.]';
    default:
      return '';
  }
}

/**
 * Get base template for task
 */
function getBaseTemplate(context: PromptContext): string {
  const { task, variables, provider } = context;
  const currentDate = variables.currentDate || new Date().toISOString().split('T')[0];

  switch (task) {
    case 'understand':
      return getUnderstandBasePrompt({
        currentDate,
        isRecent: variables.isRecent,
      });

    case 'extract_facts':
      return getExtractFactsBasePrompt({
        currentDate,
        originalClaim: variables.originalClaim || '',
        scopesList: variables.scopesList,
      });

    case 'verdict':
      return getVerdictBasePrompt({
        currentDate,
        originalClaim: variables.originalClaim || '',
        scopesList: variables.scopesList || 'No scopes defined',
        allowModelKnowledge: context.config.allowModelKnowledge,
      });

    case 'scope_refinement':
      return getScopeRefinementBasePrompt();

    case 'dynamic_plan':
      return getDynamicPlanBasePrompt({ currentDate });

    case 'dynamic_analysis':
      return getDynamicAnalysisBasePrompt({ currentDate });

    // Orchestrated pipeline tasks - these return provider-optimized prompts directly
    case 'orchestrated_understand':
      return getOrchestratedUnderstandPrompt(
        {
          currentDate,
          currentDateReadable: variables.currentDateReadable || currentDate,
          isRecent: variables.isRecent || false,
          keyFactorHints: variables.keyFactorHints,
        },
        provider
      );

    case 'supplemental_claims':
      return getSupplementalClaimsPromptForProvider(
        {
          minCoreClaimsPerContext: variables.minCoreClaimsPerContext || 2,
          hasScopes: variables.hasScopes || false,
        },
        provider
      );

    case 'supplemental_scopes':
      return getSupplementalScopesPromptForProvider(provider);

    default:
      throw new Error(`Unknown task type: ${task}`);
  }
}

/**
 * Get provider-specific variant
 */
function getProviderVariant(context: PromptContext): string {
  const { task, provider } = context;

  // Orchestrated tasks already include provider optimization in base template
  if (task === 'orchestrated_understand' || task === 'supplemental_claims' || task === 'supplemental_scopes') {
    return '';
  }

  // Map provider to variant functions
  const variantMap: Record<ProviderType, Record<string, () => string>> = {
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

  const variantFn = variantMap[provider]?.[task];
  return variantFn ? variantFn() : '';
}

/**
 * Get configuration-specific adaptations
 */
function getConfigAdaptations(context: PromptContext): string {
  const { task, config, provider } = context;
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

  // Add structured output guidance for all tasks (except orchestrated tasks which have it built-in)
  if (!task.startsWith('orchestrated') && !task.startsWith('supplemental')) {
    adaptations += getStructuredOutputGuidance(provider);
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

// Re-export orchestrated prompt functions for direct access by analyzer.ts
export {
  getOrchestratedUnderstandPrompt,
  type OrchestratedUnderstandVariables,
} from './base/orchestrated-understand';

export {
  getSupplementalClaimsPromptForProvider,
  getSupplementalScopesPromptForProvider,
  getOutcomeClaimsExtractionPrompt,
  type SupplementalClaimsVariables,
} from './base/orchestrated-supplemental';
