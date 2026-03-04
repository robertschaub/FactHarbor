import type {
  AnalysisWarning,
  AnalysisWarningSeverity,
  AnalysisWarningType,
} from "@/lib/analyzer/types";

export type DisplayWarning = AnalysisWarning & {
  severity: AnalysisWarningSeverity;
};

export const PROVIDER_ISSUE_TYPES = new Set<AnalysisWarningType>([
  "llm_provider_error",
  "search_provider_error",
  "structured_output_failure",
  "debate_provider_fallback",
  "search_fallback",
  "source_reliability_error",
  "source_fetch_failure",
  "source_fetch_degradation",
  "evidence_filter_degradation",
  "grounding_check_degraded",
  "direction_validation_degraded",
  "explanation_quality_rubric_failed",
  "verdict_batch_retry",
  "verdict_partial_recovery",
  "llm_tpm_guard_fallback",
]);

const NON_DEGRADING_PROVIDER_WARNING_TYPES = new Set<AnalysisWarningType>([
  "debate_provider_fallback",
  "search_fallback",
  "llm_tpm_guard_fallback",
  "source_fetch_failure",
  "source_fetch_degradation",
  "source_reliability_error",
]);

export const REPORT_DEGRADING_ANALYSIS_WARNING_TYPES = new Set<AnalysisWarningType>([
  "report_damaged",
  "no_successful_sources",
  "source_acquisition_collapse",
  "insufficient_evidence",
  "low_evidence_count",
  "low_source_count",
  "context_without_evidence",
  "recency_evidence_gap",
  "baseless_challenge_blocked",
  "baseless_challenge_detected",
  "verdict_direction_mismatch",
  "grounding_check",
  "verdict_fallback_partial",
  "analysis_generation_failed",
  "contested_verdict_range",
  "budget_exceeded",
  "query_budget_exhausted",
  "verdict_integrity_failure",
]);

type NormalizedSeverity = AnalysisWarningSeverity | "unknown";

function normalizeSeverity(raw: unknown): NormalizedSeverity {
  if (raw === "error" || raw === "warning" || raw === "info") return raw;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "error" || normalized === "warning" || normalized === "info") {
      return normalized;
    }
  }
  return "unknown";
}

function degradingDisplaySeverity(raw: unknown): AnalysisWarningSeverity {
  const normalized = normalizeSeverity(raw);
  if (normalized === "error") return "error";
  return "warning";
}

function withDisplaySeverity(
  warning: AnalysisWarning,
  severity: AnalysisWarningSeverity,
): DisplayWarning {
  if (warning.severity === severity) {
    return warning as DisplayWarning;
  }
  return { ...warning, severity };
}

export function isProviderIssueType(type: AnalysisWarningType): boolean {
  return PROVIDER_ISSUE_TYPES.has(type);
}

export function isReportDegradingAnalysisWarningType(type: AnalysisWarningType): boolean {
  return REPORT_DEGRADING_ANALYSIS_WARNING_TYPES.has(type);
}

export function classifyWarningForDisplay(warning: AnalysisWarning): {
  isProviderIssue: boolean;
  isReportDegrading: boolean;
  displaySeverity: AnalysisWarningSeverity;
} {
  if (isProviderIssueType(warning.type)) {
    const isReportDegrading = !NON_DEGRADING_PROVIDER_WARNING_TYPES.has(warning.type);
    return {
      isProviderIssue: true,
      isReportDegrading,
      displaySeverity: isReportDegrading
        ? degradingDisplaySeverity(warning.severity)
        : "info",
    };
  }

  const isReportDegrading = isReportDegradingAnalysisWarningType(warning.type);
  return {
    isProviderIssue: false,
    isReportDegrading,
    displaySeverity: isReportDegrading
      ? degradingDisplaySeverity(warning.severity)
      : "info",
  };
}

export type WarningDisplayBuckets = {
  providerDegrading: DisplayWarning[];
  providerInformational: DisplayWarning[];
  analysisDegrading: DisplayWarning[];
  analysisInformational: DisplayWarning[];
};

export function splitWarningsForDisplay(warnings: AnalysisWarning[]): WarningDisplayBuckets {
  const buckets: WarningDisplayBuckets = {
    providerDegrading: [],
    providerInformational: [],
    analysisDegrading: [],
    analysisInformational: [],
  };

  for (const warning of warnings) {
    const classification = classifyWarningForDisplay(warning);
    const displayWarning = withDisplaySeverity(warning, classification.displaySeverity);

    if (classification.isProviderIssue) {
      if (classification.isReportDegrading) {
        buckets.providerDegrading.push(displayWarning);
      } else {
        buckets.providerInformational.push(displayWarning);
      }
      continue;
    }

    if (classification.isReportDegrading) {
      buckets.analysisDegrading.push(displayWarning);
    } else {
      buckets.analysisInformational.push(displayWarning);
    }
  }

  return buckets;
}
