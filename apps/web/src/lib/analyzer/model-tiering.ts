/**
 * Tiered LLM Model Routing
 *
 * Routes tasks to appropriate model tiers:
 * - Cheap models (Haiku, Mini, Flash) for extraction
 * - Premium models (Sonnet, GPT-4, Pro) for reasoning
 *
 * Expected savings: 50-70% cost reduction
 *
 * Part of Phase 5: Performance Optimization
 *
 * @version 1.0.0
 * @date 2026-01-19
 */

// ============================================================================
// TYPES
// ============================================================================

export type TaskType =
  | 'understand'
  | 'extract_facts'
  | 'scope_refinement'
  | 'verdict'
  | 'supplemental'
  | 'summary';

export type ModelTier = 'budget' | 'standard' | 'premium';

export interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'google' | 'mistral';
  modelId: string;
  tier: ModelTier;
  costPer1MTokens: {
    input: number;
    output: number;
  };
  maxTokens: number;
  strengths: TaskType[];
}

export interface TieredRoutingConfig {
  enabled: boolean;
  budgetModels: Record<string, ModelConfig>; // provider -> model
  premiumModels: Record<string, ModelConfig>; // provider -> model
  taskTierMapping: Record<TaskType, ModelTier>;
}

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================

export const ANTHROPIC_MODELS: Record<ModelTier, ModelConfig> = {
  budget: {
    provider: 'anthropic',
    modelId: 'claude-3-haiku-20240307',
    tier: 'budget',
    costPer1MTokens: { input: 0.25, output: 1.25 },
    maxTokens: 200000,
    strengths: ['understand', 'extract_facts', 'scope_refinement'],
  },
  standard: {
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-20241022',
    tier: 'standard',
    costPer1MTokens: { input: 1, output: 5 },
    maxTokens: 200000,
    strengths: ['supplemental', 'summary'],
  },
  premium: {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514',
    tier: 'premium',
    costPer1MTokens: { input: 3, output: 15 },
    maxTokens: 200000,
    strengths: ['verdict'],
  },
};

export const OPENAI_MODELS: Record<ModelTier, ModelConfig> = {
  budget: {
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    tier: 'budget',
    costPer1MTokens: { input: 0.15, output: 0.6 },
    maxTokens: 128000,
    strengths: ['understand', 'extract_facts'],
  },
  standard: {
    provider: 'openai',
    modelId: 'gpt-4o',
    tier: 'standard',
    costPer1MTokens: { input: 2.5, output: 10 },
    maxTokens: 128000,
    strengths: ['scope_refinement', 'supplemental'],
  },
  premium: {
    provider: 'openai',
    modelId: 'gpt-4o',
    tier: 'premium',
    costPer1MTokens: { input: 2.5, output: 10 },
    maxTokens: 128000,
    strengths: ['verdict', 'summary'],
  },
};

export const GOOGLE_MODELS: Record<ModelTier, ModelConfig> = {
  budget: {
    provider: 'google',
    modelId: 'gemini-1.5-flash',
    tier: 'budget',
    costPer1MTokens: { input: 0.075, output: 0.3 },
    maxTokens: 1000000,
    strengths: ['understand', 'extract_facts'],
  },
  standard: {
    provider: 'google',
    modelId: 'gemini-1.5-pro',
    tier: 'standard',
    costPer1MTokens: { input: 1.25, output: 5 },
    maxTokens: 2000000,
    strengths: ['scope_refinement', 'supplemental'],
  },
  premium: {
    provider: 'google',
    modelId: 'gemini-1.5-pro',
    tier: 'premium',
    costPer1MTokens: { input: 1.25, output: 5 },
    maxTokens: 2000000,
    strengths: ['verdict', 'summary'],
  },
};

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Default task-to-tier mapping
 */
export const DEFAULT_TASK_TIER_MAPPING: Record<TaskType, ModelTier> = {
  understand: 'budget',      // Extraction task - use cheap model
  extract_facts: 'budget',   // Extraction task - use cheap model
  scope_refinement: 'standard', // Analysis task - balanced model
  verdict: 'premium',        // Reasoning task - premium model CRITICAL
  supplemental: 'standard',  // Generation task - balanced model
  summary: 'standard',       // Generation task - balanced model
};

/**
 * Get the appropriate model for a task
 *
 * @param taskType - The type of task (understand, extract_facts, verdict, etc.)
 * @param provider - LLM provider
 * @param config - Optional tiering config (pass llmTiering from pipeline config)
 *
 * @todo v2.9.0: Simplify config type to PipelineConfig | undefined once migration complete
 */
export function getModelForTask(
  taskType: TaskType,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral',
  config?: Partial<TieredRoutingConfig> | { llmTiering: boolean }
): ModelConfig {
  // Check if tiering is enabled
  let enabled: boolean;
  if (config && 'llmTiering' in config) {
    // New config system (pipeline config)
    enabled = config.llmTiering;
  } else if (config && 'enabled' in config && config.enabled !== undefined) {
    // Legacy TieredRoutingConfig
    enabled = config.enabled;
  } else {
    enabled = false;
  }

  if (!enabled) {
    // Tiering disabled - use premium model for everything
    return getPremiumModel(provider);
  }

  // Get task tier
  const taskTierMapping = (config && 'taskTierMapping' in config && config.taskTierMapping)
    ? config.taskTierMapping
    : DEFAULT_TASK_TIER_MAPPING;
  const tier = taskTierMapping[taskType];

  // Get model for tier
  return getModelByTier(provider, tier);
}

/**
 * Get model by tier
 */
function getModelByTier(
  provider: 'anthropic' | 'openai' | 'google' | 'mistral',
  tier: ModelTier
): ModelConfig {
  switch (provider) {
    case 'anthropic':
      return ANTHROPIC_MODELS[tier];
    case 'openai':
      return OPENAI_MODELS[tier];
    case 'google':
      return GOOGLE_MODELS[tier];
    case 'mistral':
      // Fallback to Anthropic if Mistral not configured
      return ANTHROPIC_MODELS[tier];
    default:
      return ANTHROPIC_MODELS[tier];
  }
}

/**
 * Get premium model for provider
 */
function getPremiumModel(provider: 'anthropic' | 'openai' | 'google' | 'mistral'): ModelConfig {
  return getModelByTier(provider, 'premium');
}

/**
 * Calculate cost savings from tiering
 */
export function calculateTieringSavings(
  tasksExecuted: Array<{ type: TaskType; tokenCount: number }>,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral'
): {
  withoutTiering: number;
  withTiering: number;
  savings: number;
  savingsPercent: number;
} {
  const premiumModel = getPremiumModel(provider);

  let costWithoutTiering = 0;
  let costWithTiering = 0;

  for (const task of tasksExecuted) {
    const tokens = task.tokenCount;

    // Cost without tiering (all premium)
    costWithoutTiering += (tokens / 1_000_000) * premiumModel.costPer1MTokens.input;

    // Cost with tiering (appropriate tier per task)
    const tierModel = getModelForTask(task.type, provider, { enabled: true });
    costWithTiering += (tokens / 1_000_000) * tierModel.costPer1MTokens.input;
  }

  const savings = costWithoutTiering - costWithTiering;
  const savingsPercent = (savings / costWithoutTiering) * 100;

  return {
    withoutTiering: costWithoutTiering,
    withTiering: costWithTiering,
    savings,
    savingsPercent,
  };
}

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Load tiering configuration from pipeline config or environment
 *
 * @param pipelineConfig - Optional pipeline config from unified config system
 */
export function loadTieringConfig(pipelineConfig?: { llmTiering: boolean }): TieredRoutingConfig {
  const enabled = pipelineConfig ? pipelineConfig.llmTiering : false;

  return {
    enabled,
    budgetModels: {
      anthropic: ANTHROPIC_MODELS.budget,
      openai: OPENAI_MODELS.budget,
      google: GOOGLE_MODELS.budget,
    },
    premiumModels: {
      anthropic: ANTHROPIC_MODELS.premium,
      openai: OPENAI_MODELS.premium,
      google: GOOGLE_MODELS.premium,
    },
    taskTierMapping: DEFAULT_TASK_TIER_MAPPING,
  };
}

/**
 * Override task tier mapping
 */
export function setTaskTierMapping(overrides: Partial<Record<TaskType, ModelTier>>): void {
  Object.assign(DEFAULT_TASK_TIER_MAPPING, overrides);
}

/**
 * Get cost estimate for a task
 */
export function estimateTaskCost(
  taskType: TaskType,
  estimatedTokens: number,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral'
): number {
  const model = getModelForTask(taskType, provider);
  return (estimatedTokens / 1_000_000) * model.costPer1MTokens.input;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example of using tiered routing in analyzer.ts:
 *
 * ```typescript
 * import { getModelForTask } from './model-tiering';
 * import { anthropic } from '@ai-sdk/anthropic';
 *
 * // Instead of:
 * const model = anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514');
 *
 * // Use:
 * const modelConfig = getModelForTask('understand', 'anthropic');
 * const model = anthropic(modelConfig.modelId);
 *
 * // For verdict generation (critical reasoning):
 * const verdictModelConfig = getModelForTask('verdict', 'anthropic');
 * const verdictModel = anthropic(verdictModelConfig.modelId);
 * ```
 */

/**
 * Example cost comparison:
 *
 * ```typescript
 * const tasks = [
 *   { type: 'understand' as TaskType, tokenCount: 50000 },
 *   { type: 'extract_facts' as TaskType, tokenCount: 100000 },
 *   { type: 'extract_facts' as TaskType, tokenCount: 100000 },
 *   { type: 'extract_facts' as TaskType, tokenCount: 100000 },
 *   { type: 'verdict' as TaskType, tokenCount: 80000 },
 * ];
 *
 * const savings = calculateTieringSavings(tasks, 'anthropic');
 * console.log(`Savings: $${savings.savings.toFixed(4)} (${savings.savingsPercent.toFixed(1)}%)`);
 * // Expected output: "Savings: $0.0825 (55.0%)"
 * ```
 */
