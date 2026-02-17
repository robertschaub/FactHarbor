export type PipelineVariant = "claimboundary" | "monolithic_dynamic";

export const PIPELINE_STORAGE_KEY = "fh_default_pipeline";

const VALID: ReadonlySet<string> = new Set([
  "claimboundary",
  "monolithic_dynamic",
]);

export function isPipelineVariant(value: unknown): value is PipelineVariant {
  return typeof value === "string" && VALID.has(value);
}

/**
 * Browser-local default pipeline variant.
 *
 * NOTE: This must be safe to call in SSR contexts (returns "claimboundary" when window is unavailable).
 */
export function readDefaultPipelineVariant(): PipelineVariant {
  if (typeof window === "undefined") return "claimboundary";
  try {
    const v = window.localStorage.getItem(PIPELINE_STORAGE_KEY);
    return isPipelineVariant(v) ? v : "claimboundary";
  } catch {
    return "claimboundary";
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

