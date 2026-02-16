/**
 * Prompt Builder - Utility Functions
 *
 * Utility functions for prompt infrastructure. The orchestrated pipeline
 * prompt-building functionality has been removed (Phase 2a cleanup).
 *
 * Remaining utilities:
 * - detectProvider: Detect LLM provider from model name
 * - isBudgetModel: Detect if model is a fast-tier/budget model
 * - Type exports for test compatibility
 */

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
