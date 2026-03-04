import { useMemo } from "react";

type QualityTone = "ok" | "warning" | "damaged";

interface UseQualitySummaryParams {
  isReportDamaged: boolean;
  degradingProviderIssueCount: number;
  degradingAnalysisIssueCount: number;
  gatesFailed: boolean;
  informationalProviderIssueCount: number;
  fallbackCount: number;
  informationalAnalysisIssueCount: number;
}

export interface QualitySummaryViewModel {
  summaryLabel: string;
  summaryIcon: "✓" | "⚠️" | "❌";
  tone: QualityTone;
  hasRealIssues: boolean;
  realIssueCount: number;
  infoCount: number;
}

export function useQualitySummary({
  isReportDamaged,
  degradingProviderIssueCount,
  degradingAnalysisIssueCount,
  gatesFailed,
  informationalProviderIssueCount,
  fallbackCount,
  informationalAnalysisIssueCount,
}: UseQualitySummaryParams): QualitySummaryViewModel {
  return useMemo(() => {
    const realIssueCount = degradingProviderIssueCount + degradingAnalysisIssueCount;
    const hasRealIssues = isReportDamaged || realIssueCount > 0 || gatesFailed;

    const infoCount = informationalProviderIssueCount
      + fallbackCount
      + informationalAnalysisIssueCount;

    let summaryLabel: string;
    if (isReportDamaged) {
      summaryLabel = "Analysis Quality — Damaged";
    } else if (realIssueCount > 0 || gatesFailed) {
      const parts: string[] = [];
      if (realIssueCount > 0) {
        parts.push(`${realIssueCount} degrading issue${realIssueCount !== 1 ? "s" : ""}`);
      }
      if (gatesFailed) {
        parts.push("quality gates failed");
      }
      summaryLabel = `Analysis Quality — ${parts.join(" · ")}`;
    } else {
      summaryLabel = "Analysis Quality — No degrading issues";
    }

    const summaryIcon: "✓" | "⚠️" | "❌" = isReportDamaged ? "❌" : hasRealIssues ? "⚠️" : "✓";
    const tone: QualityTone = isReportDamaged ? "damaged" : hasRealIssues ? "warning" : "ok";

    return {
      summaryLabel,
      summaryIcon,
      tone,
      hasRealIssues,
      realIssueCount,
      infoCount,
    };
  }, [
    isReportDamaged,
    degradingProviderIssueCount,
    degradingAnalysisIssueCount,
    gatesFailed,
    informationalProviderIssueCount,
    fallbackCount,
    informationalAnalysisIssueCount,
  ]);
}
