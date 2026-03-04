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
      summaryLabel = "Report Quality — Damaged";
    } else if (realIssueCount > 0 || gatesFailed) {
      const issueText = gatesFailed && realIssueCount === 0
        ? "Quality gates failed"
        : `${realIssueCount} issue${realIssueCount !== 1 ? "s" : ""}`;
      summaryLabel = infoCount > 0
        ? `Report Quality — ${issueText}, ${infoCount} informational`
        : `Report Quality — ${issueText}`;
    } else if (infoCount > 0) {
      summaryLabel = `Report Quality — ${infoCount} informational`;
    } else {
      summaryLabel = "Report Quality — No issues";
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
