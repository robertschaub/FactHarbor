import { describe, expect, it } from "vitest";
import {
  CLAIMBOUNDARY_V1_VARIANT,
  CLAIMBOUNDARY_V2_VARIANT,
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
    });
  });

  it("falls back to V1 when V2 is requested but the shell flag is disabled", () => {
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V2_VARIANT, {})).toEqual({
      path: "claimboundary-v1",
      requestedVariant: CLAIMBOUNDARY_V2_VARIANT,
      executedVariant: CLAIMBOUNDARY_V1_VARIANT,
      fallbackReason: "v2-shell-disabled",
      v2ShellEnabled: false,
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
    });
  });

  it("supports the target-spec v2-shadow flag alias without changing public variants", () => {
    expect(isAnalyzerV2ShellEnabled({ FH_ANALYZER_PIPELINE: "v2-shadow" })).toBe(true);
    expect(resolveAnalyzerExecutionSelection(CLAIMBOUNDARY_V2_VARIANT, {
      FH_ANALYZER_PIPELINE: "v2-shadow",
    }).path).toBe("claimboundary-v2-shell");
  });

  it("falls back to V1 for unsupported stored variants", () => {
    expect(resolveAnalyzerExecutionSelection("legacy-removed", {
      FH_ANALYZER_V2_SHELL: "enabled",
    })).toEqual({
      path: "claimboundary-v1",
      requestedVariant: "legacy-removed",
      executedVariant: CLAIMBOUNDARY_V1_VARIANT,
      fallbackReason: "unsupported-variant",
      v2ShellEnabled: true,
    });
  });
});
