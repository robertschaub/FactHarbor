import { describe, expect, it } from "vitest";
import {
  CLAIMBOUNDARY_V1_VARIANT,
  CLAIMBOUNDARY_V2_VARIANT,
  CLAIM_UNDERSTANDING_RUNTIME_FLAG,
  CLAIM_UNDERSTANDING_RUNTIME_FLAG_ENABLED_VALUE,
  QUERY_PLANNING_RUNTIME_FLAG,
  QUERY_PLANNING_RUNTIME_FLAG_ENABLED_VALUE,
  isAnalyzerV2ClaimUnderstandingRuntimeEnabled,
  isAnalyzerV2QueryPlanningRuntimeEnabled,
  isAnalyzerV2ShellEnabled,
  resolveAnalyzerExecutionSelection,
} from "@/lib/analyzer-v2/execution-selection";

describe("analyzer-v2 execution selection", () => {
  it("routes normal jobs to V1 when no V2 flag is set", () => {
    expect(resolveAnalyzerExecutionSelection(undefined, {})).toEqual({
      path: "claimboundary-v1",
      requestedVariant: CLAIMBOUNDARY_V1_VARIANT,
      executedVariant: CLAIMBOUNDARY_V1_VARIANT,
      fallbackReason: null,
      v2ShellEnabled: false,
      runtimeActivationStatus: "kill_switch_closed",
      runtimeActivationEnabled: false,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    });
  });

  it("does not upgrade V1 jobs when the V2 shell flag is enabled", () => {
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V1_VARIANT, {
      FH_ANALYZER_V2_SHELL: "enabled",
    })).toEqual({
      path: "claimboundary-v1",
      requestedVariant: CLAIMBOUNDARY_V1_VARIANT,
      executedVariant: CLAIMBOUNDARY_V1_VARIANT,
      fallbackReason: null,
      v2ShellEnabled: true,
      runtimeActivationStatus: "kill_switch_closed",
      runtimeActivationEnabled: false,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    });
  });

  it("blocks execution when V2 is requested but the shell flag is disabled", () => {
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V2_VARIANT, {})).toEqual({
      path: "blocked",
      requestedVariant: CLAIMBOUNDARY_V2_VARIANT,
      executedVariant: null,
      fallbackReason: "v2-shell-disabled",
      v2ShellEnabled: false,
      runtimeActivationStatus: "kill_switch_closed",
      runtimeActivationEnabled: false,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    });
  });

  it("selects the V2 shell only when V2 is requested and explicitly enabled", () => {
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V2_VARIANT, {
      FH_ANALYZER_V2_SHELL: "enabled",
    })).toEqual({
      path: "claimboundary-v2-shell",
      requestedVariant: CLAIMBOUNDARY_V2_VARIANT,
      executedVariant: CLAIMBOUNDARY_V2_VARIANT,
      fallbackReason: null,
      v2ShellEnabled: true,
      runtimeActivationStatus: "kill_switch_closed",
      runtimeActivationEnabled: false,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    });
  });

  it("opens hidden direct-text runtime only behind the V2 shell and dedicated runtime kill switch", () => {
    const env = {
      FH_ANALYZER_V2_SHELL: "enabled",
      [CLAIM_UNDERSTANDING_RUNTIME_FLAG]: CLAIM_UNDERSTANDING_RUNTIME_FLAG_ENABLED_VALUE,
    };

    expect(isAnalyzerV2ClaimUnderstandingRuntimeEnabled(env)).toBe(true);
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V2_VARIANT, env)).toEqual({
      path: "claimboundary-v2-shell",
      requestedVariant: CLAIMBOUNDARY_V2_VARIANT,
      executedVariant: CLAIMBOUNDARY_V2_VARIANT,
      fallbackReason: null,
      v2ShellEnabled: true,
      runtimeActivationStatus: "enabled_hidden_direct_text",
      runtimeActivationEnabled: true,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    });
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V1_VARIANT, env)).toMatchObject({
      path: "claimboundary-v1",
      runtimeActivationStatus: "kill_switch_closed",
      runtimeActivationEnabled: false,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    });
  });

  it("opens Query Planning only behind the V2 shell and dedicated X7-S kill switch", () => {
    const env = {
      FH_ANALYZER_V2_SHELL: "enabled",
      [CLAIM_UNDERSTANDING_RUNTIME_FLAG]: CLAIM_UNDERSTANDING_RUNTIME_FLAG_ENABLED_VALUE,
      [QUERY_PLANNING_RUNTIME_FLAG]: QUERY_PLANNING_RUNTIME_FLAG_ENABLED_VALUE,
    };

    expect(isAnalyzerV2QueryPlanningRuntimeEnabled(env)).toBe(true);
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V2_VARIANT, env)).toMatchObject({
      path: "claimboundary-v2-shell",
      runtimeActivationStatus: "enabled_hidden_direct_text",
      runtimeActivationEnabled: true,
      queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
      queryPlanningRuntimeActivationEnabled: true,
    });
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V1_VARIANT, env)).toMatchObject({
      path: "claimboundary-v1",
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    });
  });

  it("supports the target-spec v2-precutover gate without changing public variants", () => {
    expect(isAnalyzerV2ShellEnabled({ FH_ANALYZER_PIPELINE: "v2-precutover" })).toBe(true);
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V2_VARIANT, {
      FH_ANALYZER_PIPELINE: "v2-precutover",
    }).path).toBe("claimboundary-v2-shell");
  });

  it("blocks execution for unsupported stored variants", () => {
    expect(resolveAnalyzerExecutionSelection("legacy-removed", {
      FH_ANALYZER_V2_SHELL: "enabled",
    })).toEqual({
      path: "blocked",
      requestedVariant: "legacy-removed",
      executedVariant: null,
      fallbackReason: "unsupported-variant",
      v2ShellEnabled: true,
      runtimeActivationStatus: "kill_switch_closed",
      runtimeActivationEnabled: false,
      queryPlanningRuntimeActivationStatus: "kill_switch_closed",
      queryPlanningRuntimeActivationEnabled: false,
    });
  });
});
