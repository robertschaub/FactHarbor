/**
 * Utilities for extracting and formatting LLM model usage from analysis results.
 *
 * Backward compatibility:
 * - Supports legacy single-model fields (`llmModel`, `model`)
 * - Supports stage-level model maps (`modelsUsed`)
 * - Supports runtime model lists (`modelsUsedAll`)
 * - Optionally consumes per-call metrics when present (`analysisMetrics.llmCalls`)
 */

type JsonLike = Record<string, unknown>;

function asObject(value: unknown): JsonLike {
  return value && typeof value === "object" ? (value as JsonLike) : {};
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function addModel(
  target: Set<string>,
  modelValue: unknown,
  providerValue?: unknown,
): void {
  const model = normalizeText(modelValue);
  if (!model) return;

  // Preserve pre-qualified values like "openai:gpt-4.1".
  if (model.includes(":")) {
    target.add(model);
    return;
  }

  const provider = normalizeText(providerValue);
  target.add(provider ? `${provider}:${model}` : model);
}

function addModelsFromUnknown(
  target: Set<string>,
  value: unknown,
  providerValue?: unknown,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      addModel(target, item, providerValue);
    }
    return;
  }

  if (typeof value === "string") {
    // Accept comma-separated legacy strings.
    for (const token of value.split(",")) {
      addModel(target, token, providerValue);
    }
    return;
  }

  addModel(target, value, providerValue);
}

/**
 * Collect all known models used for an analysis result (or meta object).
 * Output is deduplicated while preserving first-seen order.
 */
export function collectUsedModels(resultOrMeta: unknown): string[] {
  const root = asObject(resultOrMeta);
  const hasMeta = !!root.meta && typeof root.meta === "object";
  const meta = hasMeta ? asObject(root.meta) : root;
  const models = new Set<string>();

  const defaultProvider = meta.llmProvider ?? meta.provider;

  // Preferred runtime source (actual calls, including fallbacks/overrides).
  addModelsFromUnknown(models, meta.modelsUsedAll, undefined);

  // Legacy stage-level source (configured tiers).
  const stageModels = asObject(meta.modelsUsed);
  for (const value of Object.values(stageModels)) {
    addModelsFromUnknown(models, value, defaultProvider);
  }

  // Legacy single-model fields.
  addModel(models, meta.llmModel, defaultProvider);
  addModel(models, meta.model, meta.provider ?? defaultProvider);

  // Optional per-call metrics if embedded in result payload.
  const analysisMetrics = asObject(root.analysisMetrics);
  const llmCalls = Array.isArray(analysisMetrics.llmCalls) ? analysisMetrics.llmCalls : [];
  for (const rawCall of llmCalls) {
    const call = asObject(rawCall);
    addModel(models, call.modelName ?? call.model, call.provider);
  }

  return Array.from(models);
}

export function formatUsedModels(models: string[]): string {
  return models.join(", ");
}
