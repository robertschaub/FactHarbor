export const CLAIMBOUNDARY_V1_VARIANT = "claimboundary";
export const CLAIMBOUNDARY_V2_VARIANT = "claimboundary-v2";
export const CLAIM_UNDERSTANDING_RUNTIME_FLAG = "FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME";
export const CLAIM_UNDERSTANDING_RUNTIME_FLAG_ENABLED_VALUE = "enabled_hidden_direct_text";
export const QUERY_PLANNING_RUNTIME_FLAG = "FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME";
export const QUERY_PLANNING_RUNTIME_FLAG_ENABLED_VALUE = "enabled_hidden_direct_text";

export type AnalyzerV2RuntimeActivationStatus =
  | "kill_switch_closed"
  | "enabled_hidden_direct_text";

export type AnalyzerExecutionPath = "claimboundary-v1" | "claimboundary-v2-shell" | "blocked";
export type AnalyzerExecutedVariant =
  | typeof CLAIMBOUNDARY_V1_VARIANT
  | typeof CLAIMBOUNDARY_V2_VARIANT;
export type AnalyzerFallbackReason = "v2-shell-disabled" | "unsupported-variant";

type AnalyzerExecutionSelectionBase = {
  requestedVariant: string;
  v2ShellEnabled: boolean;
  runtimeActivationStatus: AnalyzerV2RuntimeActivationStatus;
  runtimeActivationEnabled: boolean;
  queryPlanningRuntimeActivationStatus: AnalyzerV2RuntimeActivationStatus;
  queryPlanningRuntimeActivationEnabled: boolean;
};

export type AnalyzerExecutionSelection =
  | (AnalyzerExecutionSelectionBase & {
    path: "claimboundary-v1";
    executedVariant: typeof CLAIMBOUNDARY_V1_VARIANT;
    fallbackReason: null;
  })
  | (AnalyzerExecutionSelectionBase & {
    path: "claimboundary-v2-shell";
    executedVariant: typeof CLAIMBOUNDARY_V2_VARIANT;
    fallbackReason: null;
  })
  | (AnalyzerExecutionSelectionBase & {
    path: "blocked";
    executedVariant: null;
    fallbackReason: AnalyzerFallbackReason;
  });

function normalizeRequestedVariant(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : CLAIMBOUNDARY_V2_VARIANT;
}

export function isAnalyzerV2ShellEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FH_ANALYZER_V2_SHELL === "enabled" || env.FH_ANALYZER_PIPELINE === "v2-precutover";
}

export function isAnalyzerV2ClaimUnderstandingRuntimeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[CLAIM_UNDERSTANDING_RUNTIME_FLAG] === CLAIM_UNDERSTANDING_RUNTIME_FLAG_ENABLED_VALUE;
}

export function isAnalyzerV2QueryPlanningRuntimeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[QUERY_PLANNING_RUNTIME_FLAG] === QUERY_PLANNING_RUNTIME_FLAG_ENABLED_VALUE;
}

function runtimeActivationStatus(enabled: boolean): AnalyzerV2RuntimeActivationStatus {
  return enabled ? "enabled_hidden_direct_text" : "kill_switch_closed";
}

export function resolveAnalyzerExecutionSelection(
  requestedVariantValue: unknown,
  env: NodeJS.ProcessEnv = process.env,
): AnalyzerExecutionSelection {
  const requestedVariant = normalizeRequestedVariant(requestedVariantValue);
  const v2ShellEnabled = isAnalyzerV2ShellEnabled(env);
  const runtimeFlagEnabled = isAnalyzerV2ClaimUnderstandingRuntimeEnabled(env);
  const queryPlanningRuntimeFlagEnabled = isAnalyzerV2QueryPlanningRuntimeEnabled(env);

  if (requestedVariant === CLAIMBOUNDARY_V2_VARIANT) {
    if (v2ShellEnabled) {
      const runtimeActivationEnabled = runtimeFlagEnabled;
      const queryPlanningRuntimeActivationEnabled = queryPlanningRuntimeFlagEnabled;
      return {
        path: "claimboundary-v2-shell",
        requestedVariant,
        executedVariant: CLAIMBOUNDARY_V2_VARIANT,
        fallbackReason: null,
        v2ShellEnabled,
        runtimeActivationStatus: runtimeActivationStatus(runtimeActivationEnabled),
        runtimeActivationEnabled,
        queryPlanningRuntimeActivationStatus: runtimeActivationStatus(queryPlanningRuntimeActivationEnabled),
        queryPlanningRuntimeActivationEnabled,
      };
    }

    return {
      path: "blocked",
      requestedVariant,
      executedVariant: null,
      fallbackReason: "v2-shell-disabled",
      v2ShellEnabled,
      runtimeActivationStatus: "kill_switch_closed",
      runtimeActivationEnabled: false,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    };
  }

  if (requestedVariant !== CLAIMBOUNDARY_V1_VARIANT) {
    return {
      path: "blocked",
      requestedVariant,
      executedVariant: null,
      fallbackReason: "unsupported-variant",
      v2ShellEnabled,
      runtimeActivationStatus: "kill_switch_closed",
      runtimeActivationEnabled: false,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    };
  }

  return {
    path: "claimboundary-v1",
    requestedVariant,
    executedVariant: CLAIMBOUNDARY_V1_VARIANT,
    fallbackReason: null,
    v2ShellEnabled,
    runtimeActivationStatus: "kill_switch_closed",
    runtimeActivationEnabled: false,
    queryPlanningRuntimeActivationStatus: "kill_switch_closed",
    queryPlanningRuntimeActivationEnabled: false,
  };
}
