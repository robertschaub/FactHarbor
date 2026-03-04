import { describe, expect, it } from "vitest";
import {
  classifyWarningForDisplay,
  splitWarningsForDisplay,
} from "@/lib/analyzer/warning-display";
import type { AnalysisWarning } from "@/lib/analyzer/types";

function warning(overrides: Partial<AnalysisWarning>): AnalysisWarning {
  return {
    type: "evidence_pool_imbalance",
    severity: "warning",
    message: "test",
    ...overrides,
  };
}

describe("warning-display classification", () => {
  it("forces non-degrading analysis warnings to info", () => {
    const result = classifyWarningForDisplay(warning({
      type: "evidence_pool_imbalance",
      severity: "error",
    }));

    expect(result.isProviderIssue).toBe(false);
    expect(result.isReportDegrading).toBe(false);
    expect(result.displaySeverity).toBe("info");
  });

  it("treats baseless-challenge enforcement telemetry as informational", () => {
    const blocked = classifyWarningForDisplay(warning({
      type: "baseless_challenge_blocked",
      severity: "warning",
    }));
    const detected = classifyWarningForDisplay(warning({
      type: "baseless_challenge_detected",
      severity: "error",
    }));

    expect(blocked.isProviderIssue).toBe(false);
    expect(blocked.isReportDegrading).toBe(false);
    expect(blocked.displaySeverity).toBe("info");
    expect(detected.isProviderIssue).toBe(false);
    expect(detected.isReportDegrading).toBe(false);
    expect(detected.displaySeverity).toBe("info");
  });

  it("applies warning floor to degrading analysis warnings", () => {
    const warningLevel = classifyWarningForDisplay(warning({
      type: "insufficient_evidence",
      severity: "info",
    }));
    const errorLevel = classifyWarningForDisplay(warning({
      type: "insufficient_evidence",
      severity: "error",
    }));

    expect(warningLevel.isReportDegrading).toBe(true);
    expect(warningLevel.displaySeverity).toBe("warning");
    expect(errorLevel.displaySeverity).toBe("error");
  });

  it("forces non-degrading provider warnings to info", () => {
    const result = classifyWarningForDisplay(warning({
      type: "source_fetch_failure",
      severity: "error",
    }));

    expect(result.isProviderIssue).toBe(true);
    expect(result.isReportDegrading).toBe(false);
    expect(result.displaySeverity).toBe("info");
  });

  it("applies warning floor to degrading provider warnings", () => {
    const result = classifyWarningForDisplay(warning({
      type: "llm_provider_error",
      severity: "info",
    }));

    expect(result.isProviderIssue).toBe(true);
    expect(result.isReportDegrading).toBe(true);
    expect(result.displaySeverity).toBe("warning");
  });

  it("registers v2.9.1 degradation types with correct buckets", () => {
    const groundingDegraded = classifyWarningForDisplay(warning({
      type: "grounding_check_degraded",
      severity: "warning",
    }));
    const fallbackPartial = classifyWarningForDisplay(warning({
      type: "verdict_fallback_partial",
      severity: "warning",
    }));
    const batchRetry = classifyWarningForDisplay(warning({
      type: "verdict_batch_retry",
      severity: "warning",
    }));

    expect(groundingDegraded.isProviderIssue).toBe(true);
    expect(groundingDegraded.isReportDegrading).toBe(true);
    expect(fallbackPartial.isProviderIssue).toBe(true);
    expect(fallbackPartial.isReportDegrading).toBe(true);
    expect(batchRetry.isProviderIssue).toBe(true);
    expect(batchRetry.isReportDegrading).toBe(false);
    expect(batchRetry.displaySeverity).toBe("info");
  });

  it("forces routine analysis telemetry to info", () => {
    const challenger = classifyWarningForDisplay(warning({
      type: "challenger_failure",
      severity: "error",
    }));
    const tiger = classifyWarningForDisplay(warning({
      type: "tiger_score_failed",
      severity: "warning",
    }));

    expect(challenger.isProviderIssue).toBe(false);
    expect(challenger.isReportDegrading).toBe(false);
    expect(challenger.displaySeverity).toBe("info");
    expect(tiger.isProviderIssue).toBe(false);
    expect(tiger.isReportDegrading).toBe(false);
    expect(tiger.displaySeverity).toBe("info");
  });

  it("keeps structural/integrity warnings degrading in analysis bucket", () => {
    const structural = classifyWarningForDisplay(warning({
      type: "structural_consistency",
      severity: "error",
    }));
    const integrity = classifyWarningForDisplay(warning({
      type: "verdict_integrity_failure",
      severity: "warning",
    }));
    const grounding = classifyWarningForDisplay(warning({
      type: "verdict_grounding_issue",
      severity: "error",
    }));
    const direction = classifyWarningForDisplay(warning({
      type: "verdict_direction_issue",
      severity: "info",
    }));

    expect(structural.isProviderIssue).toBe(false);
    expect(structural.isReportDegrading).toBe(true);
    expect(structural.displaySeverity).toBe("error");
    expect(integrity.isProviderIssue).toBe(false);
    expect(integrity.isReportDegrading).toBe(true);
    expect(integrity.displaySeverity).toBe("warning");
    expect(grounding.isReportDegrading).toBe(true);
    expect(grounding.displaySeverity).toBe("error");
    expect(direction.isReportDegrading).toBe(true);
    expect(direction.displaySeverity).toBe("warning");
  });

  it("maps budget and runtime generation failures to analysis bucket", () => {
    const budget = classifyWarningForDisplay(warning({
      type: "budget_exceeded",
      severity: "error",
    }));
    const queryBudget = classifyWarningForDisplay(warning({
      type: "query_budget_exhausted",
      severity: "warning",
    }));
    const generation = classifyWarningForDisplay(warning({
      type: "analysis_generation_failed",
      severity: "error",
    }));

    expect(budget.isProviderIssue).toBe(false);
    expect(budget.isReportDegrading).toBe(true);
    expect(budget.displaySeverity).toBe("error");
    expect(queryBudget.isProviderIssue).toBe(false);
    expect(queryBudget.isReportDegrading).toBe(true);
    expect(queryBudget.displaySeverity).toBe("warning");
    expect(generation.isProviderIssue).toBe(false);
    expect(generation.isReportDegrading).toBe(true);
    expect(generation.displaySeverity).toBe("error");
  });

  it("forces rubric fallback provider warning to info", () => {
    const result = classifyWarningForDisplay(warning({
      type: "explanation_quality_rubric_failed",
      severity: "warning",
    }));

    expect(result.isProviderIssue).toBe(true);
    expect(result.isReportDegrading).toBe(false);
    expect(result.displaySeverity).toBe("info");
  });

  it("splits warnings into display buckets with warning floor for degrading items", () => {
    const buckets = splitWarningsForDisplay([
      warning({ type: "llm_provider_error", severity: "info" }),
      warning({ type: "source_fetch_failure", severity: "error" }),
      warning({ type: "insufficient_evidence", severity: "info" }),
      warning({ type: "evidence_pool_imbalance", severity: "warning" }),
    ]);

    expect(buckets.providerDegrading).toHaveLength(1);
    expect(buckets.providerInformational).toHaveLength(1);
    expect(buckets.analysisDegrading).toHaveLength(1);
    expect(buckets.analysisInformational).toHaveLength(1);
    expect(buckets.providerDegrading[0].severity).toBe("warning");
    expect(buckets.providerInformational[0].severity).toBe("info");
    expect(buckets.analysisDegrading[0].severity).toBe("warning");
    expect(buckets.analysisInformational[0].severity).toBe("info");
  });
});
