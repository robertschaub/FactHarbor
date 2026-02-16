/**
 * Prompt Builder - Composes optimized prompts from base templates + provider variants + config adaptations
 *
 * This module dynamically builds prompts based on:
 * - Task type (understand, extract_evidence, verdict, context_refinement)
 * - LLM provider (anthropic, openai, google, mistral)
 * - Configuration (tiering mode, model knowledge mode)
 */

import { getUnderstandBasePrompt } from './base/understand-base';
import { getExtractEvidenceBasePrompt } from './base/extract-evidence-base';
import { getVerdictBasePrompt } from './base/verdict-base';
import { getDynamicPlanBasePrompt } from './base/dynamic-plan-base';
import { getDynamicAnalysisBasePrompt } from './base/dynamic-analysis-base';

import {
  getAnthropicUnderstandVariant,
  getAnthropicExtractEvidenceVariant,
  getAnthropicVerdictVariant,
} from './providers/anthropic';

import {
  getOpenAIUnderstandVariant,
  getOpenAIExtractEvidenceVariant,
  getOpenAIVerdictVariant,
} from './providers/openai';

import {
  getGeminiUnderstandVariant,
  getGeminiExtractEvidenceVariant,
  getGeminiVerdictVariant,
} from './providers/google';

import {
  getMistralUnderstandVariant,
  getMistralExtractEvidenceVariant,
  getMistralVerdictVariant,
} from './providers/mistral';

import {
  getTieringUnderstandAdaptation,
  getTieringExtractEvidenceAdaptation,
  getTieringVerdictAdaptation,
  getBudgetUnderstandPrompt,
  getBudgetExtractEvidencePrompt,
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
  | 'extract_evidence'
  | 'verdict'
  | 'dynamic_plan'
  | 'dynamic_analysis';
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
    contextsList?: string;
    isRecent?: boolean;
    textToAnalyze?: string;
    sourceSummary?: string;
  };
}

/**
 * Main prompt builder function
 *
 * For fast-tier models with tiering enabled, uses simplified prompts that:
 * - Reduce token count by ~40%
 * - Skip verbose explanations
 * - Focus on direct task completion
 */
export function buildPrompt(context: PromptContext): string {
  const { task, config, variables } = context;

  // For fast-tier models with tiering, use ultra-simplified prompts for extraction tasks
  // This significantly reduces token count and speeds up responses
  const useBudgetPrompt = config.isLLMTiering && config.isBudgetModel &&
    ['understand', 'extract_evidence', 'verdict'].includes(task);

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
 * Get ultra-simplified prompt for fast-tier models
 * Used when tiering is enabled in pipeline config and model is a fast tier (Haiku/Flash/Mini)
 */
function getBudgetPrompt(context: PromptContext): string {
  const { task, provider, variables, config } = context;
  const currentDate = variables.currentDate || new Date().toISOString().split('T')[0];

  let basePrompt: string;

  switch (task) {
    case 'understand':
      basePrompt = getBudgetUnderstandPrompt(currentDate);
      break;
    case 'extract_evidence':
      basePrompt = getBudgetExtractEvidencePrompt(currentDate, variables.originalClaim || '');
      break;
    case 'verdict':
      basePrompt = getBudgetVerdictPrompt(currentDate, variables.originalClaim || '', config.allowModelKnowledge);
      break;
    default:
      // Fall back to normal prompt composition for other tasks
      return getBaseTemplate(context) + getProviderVariant(context) + getConfigAdaptations(context);
  }

  // Add minimal provider-specific hint for fast-tier models
  const providerHint = getBudgetProviderHint(provider, task);

  return basePrompt + providerHint;
}

/**
 * Get minimal provider hint for fast-tier models
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

    case 'extract_evidence':
      return getExtractEvidenceBasePrompt({
        currentDate,
        originalClaim: variables.originalClaim || '',
        contextsList: variables.contextsList,
      });

    case 'verdict':
      return getVerdictBasePrompt({
        currentDate,
        originalClaim: variables.originalClaim || '',
        contextsList: variables.contextsList || 'No AnalysisContexts defined',
        allowModelKnowledge: context.config.allowModelKnowledge,
      });

    case 'dynamic_plan':
      return getDynamicPlanBasePrompt({ currentDate });

    case 'dynamic_analysis':
      return getDynamicAnalysisBasePrompt({ currentDate });

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
  const variantMap: Record<ProviderType, Record<string, () => string>> = {
    anthropic: {
      understand: getAnthropicUnderstandVariant,
      extract_evidence: getAnthropicExtractEvidenceVariant,
      verdict: getAnthropicVerdictVariant,
      dynamic_plan: () => '',
      dynamic_analysis: () => '',
    },
    openai: {
      understand: getOpenAIUnderstandVariant,
      extract_evidence: getOpenAIExtractEvidenceVariant,
      verdict: getOpenAIVerdictVariant,
      dynamic_plan: () => '',
      dynamic_analysis: () => '',
    },
    google: {
      understand: getGeminiUnderstandVariant,
      extract_evidence: getGeminiExtractEvidenceVariant,
      verdict: getGeminiVerdictVariant,
      dynamic_plan: () => '',
      dynamic_analysis: () => '',
    },
    mistral: {
      understand: getMistralUnderstandVariant,
      extract_evidence: getMistralExtractEvidenceVariant,
      verdict: getMistralVerdictVariant,
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

  // Add tiering adaptations for fast-tier models
  if (config.isLLMTiering && config.isBudgetModel) {
    switch (task) {
      case 'understand':
        adaptations += getTieringUnderstandAdaptation();
        break;
      case 'extract_evidence':
        adaptations += getTieringExtractEvidenceAdaptation();
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

  // Add structured output guidance for all tasks
  adaptations += getStructuredOutputGuidance(provider);

  return adaptations;
}

/**
 * Helper: Detect if model is a fast-tier model
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
