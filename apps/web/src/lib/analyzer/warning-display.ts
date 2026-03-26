import type {
  AnalysisWarning,
  AnalysisWarningSeverity,
  AnalysisWarningType,
} from "@/lib/analyzer/types";

export type DisplayWarning = AnalysisWarning & {
  severity: AnalysisWarningSeverity;
};

type WarningBucket = "provider" | "analysis";
type WarningImpact = "degrading" | "informational";
type WarningClassification = {
  bucket: WarningBucket;
  impact: WarningImpact;
};

// Canonical registry: every AnalysisWarningType must be classified here.
// `satisfies` enforces full coverage when the union changes.
const WARNING_CLASSIFICATION = {
  report_damaged: { bucket: "analysis", impact: "degrading" },
  llm_provider_error: { bucket: "provider", impact: "degrading" },
  structured_output_failure: { bucket: "provider", impact: "degrading" },
  evidence_filter_degradation: { bucket: "provider", impact: "degrading" },
  search_provider_error: { bucket: "provider", impact: "informational" },
  source_reliability_error: { bucket: "provider", impact: "informational" },
  source_fetch_failure: { bucket: "provider", impact: "informational" },
  source_fetch_degradation: { bucket: "analysis", impact: "informational" },
  budget_exceeded: { bucket: "analysis", impact: "degrading" },
  query_budget_exhausted: { bucket: "analysis", impact: "degrading" },
  low_evidence_count: { bucket: "analysis", impact: "degrading" },
  low_source_count: { bucket: "analysis", impact: "degrading" },
  no_successful_sources: { bucket: "analysis", impact: "degrading" },
  source_acquisition_collapse: { bucket: "analysis", impact: "degrading" },
  grounding_check_degraded: { bucket: "provider", impact: "degrading" },
  direction_validation_degraded: { bucket: "provider", impact: "degrading" },
  verdict_fallback_partial: { bucket: "provider", impact: "degrading" },
  verdict_partial_recovery: { bucket: "provider", impact: "degrading" },
  verdict_batch_retry: { bucket: "provider", impact: "informational" },
  analysis_generation_failed: { bucket: "analysis", impact: "degrading" },
  evidence_pool_imbalance: { bucket: "analysis", impact: "informational" },
  evidence_partition_stats: { bucket: "analysis", impact: "informational" },
  all_same_debate_tier: { bucket: "analysis", impact: "degrading" },
  debate_provider_fallback: { bucket: "provider", impact: "informational" },
  contested_verdict_range: { bucket: "analysis", impact: "degrading" },
  baseless_challenge_detected: { bucket: "analysis", impact: "informational" },
  baseless_challenge_blocked: { bucket: "analysis", impact: "informational" },
  explanation_quality_rubric_failed: { bucket: "provider", impact: "informational" },
  insufficient_evidence: { bucket: "analysis", impact: "degrading" },
  tiger_score_failed: { bucket: "analysis", impact: "informational" },
  structural_consistency: { bucket: "analysis", impact: "degrading" },
  inverse_consistency_error: { bucket: "analysis", impact: "degrading" },
  verdict_integrity_failure: { bucket: "analysis", impact: "degrading" },
  verdict_grounding_issue: { bucket: "analysis", impact: "informational" },
  verdict_direction_issue: { bucket: "analysis", impact: "informational" },
  challenger_failure: { bucket: "analysis", impact: "informational" },
  llm_tpm_guard_fallback: { bucket: "provider", impact: "informational" },
  low_claim_count: { bucket: "analysis", impact: "informational" },
  evidence_applicability_filter: { bucket: "analysis", impact: "informational" },
  phantom_evidence_stripped: { bucket: "analysis", impact: "informational" },
  phantom_evidence_all_supporting: { bucket: "analysis", impact: "degrading" },
  boundary_evidence_concentration: { bucket: "analysis", impact: "informational" },
  source_reliability_support_concern: { bucket: "analysis", impact: "informational" },
  source_reliability_contradiction_concern: { bucket: "analysis", impact: "informational" },
  source_reliability_unknown_dominance: { bucket: "analysis", impact: "informational" },
  source_reliability_calibration_skipped: { bucket: "analysis", impact: "informational" },
  gate1_thesis_direct_rescue: { bucket: "analysis", impact: "informational" },
} as const satisfies Record<AnalysisWarningType, WarningClassification>;

export const PROVIDER_ISSUE_TYPES = new Set<AnalysisWarningType>(
  (Object.entries(WARNING_CLASSIFICATION) as Array<[AnalysisWarningType, WarningClassification]>)
    .filter(([, classification]) => classification.bucket === "provider")
    .map(([type]) => type),
);

export const REPORT_DEGRADING_ANALYSIS_WARNING_TYPES = new Set<AnalysisWarningType>(
  (Object.entries(WARNING_CLASSIFICATION) as Array<[AnalysisWarningType, WarningClassification]>)
    .filter(([, classification]) => classification.bucket === "analysis" && classification.impact === "degrading")
    .map(([type]) => type),
);

function normalizeSeverity(raw: unknown): AnalysisWarningSeverity {
  if (raw === "error" || raw === "warning" || raw === "info") return raw;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "error" || normalized === "warning" || normalized === "info") {
      return normalized;
    }
  }
  return "info";
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

function getClassification(type: AnalysisWarningType): WarningClassification {
  return WARNING_CLASSIFICATION[type];
}

export function isProviderIssueType(type: AnalysisWarningType): boolean {
  return getClassification(type).bucket === "provider";
}

export function isReportDegradingAnalysisWarningType(type: AnalysisWarningType): boolean {
  const classification = getClassification(type);
  return classification.bucket === "analysis" && classification.impact === "degrading";
}

export function classifyWarningForDisplay(warning: AnalysisWarning): {
  isProviderIssue: boolean;
  isReportDegrading: boolean;
  displaySeverity: AnalysisWarningSeverity;
} {
  const classification = getClassification(warning.type);
  const normalizedSeverity = normalizeSeverity(warning.severity);
  const isReportDegrading = classification.impact === "degrading";
  const displaySeverity: AnalysisWarningSeverity = isReportDegrading
    ? (normalizedSeverity === "info" ? "warning" : normalizedSeverity)
    : "info";

  return {
    isProviderIssue: classification.bucket === "provider",
    isReportDegrading,
    displaySeverity,
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
