export const CLAIMBOUNDARY_V1_VARIANT = "claimboundary";
export const CLAIMBOUNDARY_V2_VARIANT = "claimboundary-v2";

export type AnalyzerExecutionPath = "claimboundary-v1" | "claimboundary-v2-shell";
export type AnalyzerExecutedVariant =
  | typeof CLAIMBOUNDARY_V1_VARIANT
  | typeof CLAIMBOUNDARY_V2_VARIANT;
export type AnalyzerFallbackReason = "v2-shell-disabled" | "unsupported-variant";

export type AnalyzerExecutionSelection = {
  path: AnalyzerExecutionPath;
  requestedVariant: string;
  executedVariant: AnalyzerExecutedVariant;
  fallbackReason: AnalyzerFallbackReason | null;
  v2ShellEnabled: boolean;
};

function normalizeRequestedVariant(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : CLAIMBOUNDARY_V1_VARIANT;
}

export function isAnalyzerV2ShellEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FH_ANALYZER_V2_SHELL === "enabled" || env.FH_ANALYZER_PIPELINE === "v2-shadow";
}

export function resolveAnalyzerExecutionSelection(
  requestedVariantValue: unknown,
  env: NodeJS.ProcessEnv = process.env,
): AnalyzerExecutionSelection {
  const requestedVariant = normalizeRequestedVariant(requestedVariantValue);
  const v2ShellEnabled = isAnalyzerV2ShellEnabled(env);

  if (requestedVariant === CLAIMBOUNDARY_V2_VARIANT) {
    if (v2ShellEnabled) {
      return {
        path: "claimboundary-v2-shell",
        requestedVariant,
        executedVariant: CLAIMBOUNDARY_V2_VARIANT,
        fallbackReason: null,
        v2ShellEnabled,
      };
    }

    return {
      path: "claimboundary-v1",
      requestedVariant,
      executedVariant: CLAIMBOUNDARY_V1_VARIANT,
      fallbackReason: "v2-shell-disabled",
      v2ShellEnabled,
    };
  }

  if (requestedVariant !== CLAIMBOUNDARY_V1_VARIANT) {
    return {
      path: "claimboundary-v1",
      requestedVariant,
      executedVariant: CLAIMBOUNDARY_V1_VARIANT,
      fallbackReason: "unsupported-variant",
      v2ShellEnabled,
    };
  }

  return {
    path: "claimboundary-v1",
    requestedVariant,
    executedVariant: CLAIMBOUNDARY_V1_VARIANT,
    fallbackReason: null,
    v2ShellEnabled,
  };
}
