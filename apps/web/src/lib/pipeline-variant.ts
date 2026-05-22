export type PipelineVariant = "claimboundary" | "claimboundary-v2";

export const PIPELINE_STORAGE_KEY = "fh_default_pipeline";
export const DEFAULT_PIPELINE_VARIANT: PipelineVariant = "claimboundary-v2";
export const PIPELINE_VARIANTS = [
  "claimboundary",
  "claimboundary-v2",
] as const satisfies readonly PipelineVariant[];

const VALID: ReadonlySet<string> = new Set(PIPELINE_VARIANTS);

export function isPipelineVariant(value: unknown): value is PipelineVariant {
  return typeof value === "string" && VALID.has(value);
}

export function normalizePipelineVariant(
  value: unknown,
  fallback: PipelineVariant = DEFAULT_PIPELINE_VARIANT,
): PipelineVariant {
  return isPipelineVariant(value) ? value : fallback;
}

/**
 * Browser-local default pipeline variant.
 *
 * NOTE: This must be safe to call in SSR contexts.
 */
export function readDefaultPipelineVariant(): PipelineVariant {
  if (typeof window === "undefined") return DEFAULT_PIPELINE_VARIANT;
  try {
    return normalizePipelineVariant(window.localStorage.getItem(PIPELINE_STORAGE_KEY));
  } catch {
    return DEFAULT_PIPELINE_VARIANT;
  }
}

export function writeDefaultPipelineVariant(v: PipelineVariant): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIPELINE_STORAGE_KEY, v);
  } catch {
    // Ignore storage failures (e.g. privacy mode).
  }
}
