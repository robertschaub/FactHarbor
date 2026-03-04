import { describe, expect, it } from "vitest";
import {
  classifyWarningForDisplay,
  splitWarningsForDisplay,
} from "@/lib/analyzer/warning-display";
import type { AnalysisWarning } from "@/lib/analyzer/types";

function warning(overrides: Partial<AnalysisWarning>): AnalysisWarning {
  return {
    type: "confidence_calibration",
    severity: "warning",
    message: "test",
    ...overrides,
  };
}

describe("warning-display classification", () => {
  it("forces non-degrading analysis warnings to info", () => {
    const result = classifyWarningForDisplay(warning({
      type: "confidence_calibration",
      severity: "error",
    }));

    expect(result.isProviderIssue).toBe(false);
    expect(result.isReportDegrading).toBe(false);
    expect(result.displaySeverity).toBe("info");
  });

  it("keeps degrading analysis warnings visible as warning/error", () => {
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

  it("surfaces degrading provider warnings as warning/error", () => {
    const result = classifyWarningForDisplay(warning({
      type: "llm_provider_error",
      severity: "info",
    }));

    expect(result.isProviderIssue).toBe(true);
    expect(result.isReportDegrading).toBe(true);
    expect(result.displaySeverity).toBe("warning");
  });

  it("splits warnings into display buckets with coerced severities", () => {
    const buckets = splitWarningsForDisplay([
      warning({ type: "llm_provider_error", severity: "info" }),
      warning({ type: "source_fetch_failure", severity: "error" }),
      warning({ type: "insufficient_evidence", severity: "info" }),
      warning({ type: "confidence_calibration", severity: "warning" }),
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
