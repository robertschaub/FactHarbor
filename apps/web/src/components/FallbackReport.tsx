/**
 * FallbackReport Component
 * Displays quality issues: classification fallbacks AND analysis warnings
 * (verdict direction mismatches, structured output failures, budget exceeded, etc.)
 */

import React from 'react';
import styles from './FallbackReport.module.css';
import type { FallbackSummary } from '@/lib/analyzer/classification-fallbacks';
import type { AnalysisWarning } from '@/lib/analyzer/types';

interface FallbackReportProps {
  summary: FallbackSummary | undefined;
  analysisWarnings?: AnalysisWarning[];  // P1: Analysis warnings
}

const fieldDefaults: Record<string, string> = {
  harmPotential: 'medium',
  factualBasis: 'unknown',
  sourceAuthority: 'secondary',
  evidenceBasis: 'anecdotal',
  isContested: 'false'
};

const WARNING_TYPE_LABELS: Record<string, string> = {
  report_damaged: "Report Damaged",
  verdict_direction_mismatch: "Verdict Direction Mismatch",
  structured_output_failure: "Structured Output Failure",
  evidence_filter_degradation: "Evidence Filter Degradation",
  search_fallback: "Search Fallback",
  search_provider_error: "Search Provider Error",
  budget_exceeded: "Budget Exceeded",
  classification_fallback: "Classification Fallback",
  low_evidence_count: "Low Evidence Count",
  context_without_evidence: "Context Without Evidence",
  recency_evidence_gap: "Recency Evidence Gap",
  confidence_calibration: "Confidence Calibration",
  low_source_count: "Low Source Count",
  grounding_check: "Grounding Check",
};

const WARNING_TYPE_HINTS: Record<string, string> = {
  report_damaged: "Treat this report as non-final until critical issues are resolved and the analysis is re-run.",
  structured_output_failure: "Retry with reduced output scope or shorter prompts to avoid structured-output truncation.",
  budget_exceeded: "Increase token/iteration budget or narrow analysis scope.",
  search_provider_error: "Check search provider quota/key health and rerun after recovery.",
  recency_evidence_gap: "Add fresh date-anchored evidence for recency-sensitive claims.",
  grounding_check: "Verify reasoning is explicitly linked to cited evidence IDs.",
  evidence_filter_degradation: "Inspect evidence-filter LLM failures; heuristic fallback may lower precision.",
};

const SEVERITY_ICONS: Record<AnalysisWarning["severity"], string> = {
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function getWarningHints(warning: AnalysisWarning): string[] {
  const explicitHints = toStringArray((warning.details as any)?.remediationHints);
  const recommended = String((warning.details as any)?.recommendedNextStep || "").trim();
  const typeHint = WARNING_TYPE_HINTS[warning.type] ? [WARNING_TYPE_HINTS[warning.type]] : [];
  const combined = [
    ...explicitHints,
    ...(recommended ? [recommended] : []),
    ...typeHint,
  ];
  return Array.from(new Set(combined));
}

export function FallbackReport({ summary, analysisWarnings = [] }: FallbackReportProps) {
  const hasFallbacks = summary && summary.totalFallbacks > 0;
  const hasWarnings = analysisWarnings.length > 0;

  // Don't render if nothing to show
  if (!hasFallbacks && !hasWarnings) {
    return null;
  }

  const fieldsWithFallbacks = hasFallbacks
    ? Object.entries(summary.fallbacksByField).filter(([_, count]) => count > 0)
    : [];

  // Determine overall severity (errors > warnings > info)
  const hasErrors = analysisWarnings.some(w => w.severity === "error");
  const hasWarningLevel = analysisWarnings.some(w => w.severity === "warning");
  const overallSeverity = hasErrors ? "error" : (hasWarningLevel || hasFallbacks) ? "warning" : "info";

  // Count total issues
  const totalIssues = (summary?.totalFallbacks || 0) + analysisWarnings.length;

  return (
    <div className={`${styles.fallbackReport} ${hasErrors ? styles.hasErrors : ''}`}>
      <div className={styles.header}>
        <svg
          className={styles.icon}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className={styles.content}>
          <h3 className={styles.title}>
            Analysis Quality Issues ({totalIssues})
          </h3>

          {/* Analysis Warnings Section */}
          {hasWarnings && (
            <div className={styles.warningsSection}>
              {analysisWarnings.map((warning, index) => (
                <div
                  key={index}
                  className={`${styles.warningItem} ${styles[`severity_${warning.severity}`]}`}
                >
                  <span className={styles.warningIcon}>{SEVERITY_ICONS[warning.severity]}</span>
                  <div className={styles.warningContent}>
                    <span className={styles.warningType}>
                      {WARNING_TYPE_LABELS[warning.type] || warning.type}
                    </span>
                    <p className={styles.warningMessage}>{warning.message}</p>
                    {Array.isArray((warning.details as any)?.issues) && (warning.details as any).issues.length > 0 && (
                      <ul className={styles.warningIssueList}>
                        {(warning.details as any).issues.slice(0, 4).map((issue: any, idx: number) => (
                          <li key={`issue-${idx}`}>
                            <strong>{issue?.type || "issue"}:</strong> {issue?.message || "No message"}
                          </li>
                        ))}
                      </ul>
                    )}
                    {(() => {
                      const hints = getWarningHints(warning);
                      if (hints.length === 0) return null;
                      return (
                        <ul className={styles.warningHintList}>
                          {hints.slice(0, 3).map((hint, hintIdx) => (
                            <li key={`hint-${hintIdx}`}>{hint}</li>
                          ))}
                        </ul>
                      );
                    })()}
                    {warning.details && Object.keys(warning.details).length > 0 && (
                      <details className={styles.warningDetails}>
                        <summary>Details</summary>
                        <pre className={styles.detailsJson}>
                          {JSON.stringify(warning.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Classification Fallbacks Section */}
          {hasFallbacks && (
            <>
              <div className={styles.fallbacksSection}>
                <h4 className={styles.sectionTitle}>Classification Fallbacks</h4>
                <p className={styles.description}>
                  The LLM failed to classify {summary.totalFallbacks} field(s).
                  Safe defaults were used.
                </p>

                {/* Fallbacks by field */}
                <div className={styles.fieldSummary}>
                  <ul className={styles.fieldList}>
                    {fieldsWithFallbacks.map(([field, count]) => (
                      <li key={field}>
                        <strong>{field}:</strong> {count} fallback{count > 1 ? 's' : ''} (default: <code>{fieldDefaults[field]}</code>)
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Details accordion */}
                {summary.fallbackDetails.length > 0 && (
                  <details className={styles.details}>
                    <summary className={styles.detailsSummary}>
                      View Details ({summary.fallbackDetails.length} items)
                    </summary>
                    <div className={styles.detailsContent}>
                      {summary.fallbackDetails.map((fb, index) => (
                        <div key={index} className={styles.detailItem}>
                          <div>
                            <span className={styles.detailField}>{fb.field}</span>
                            {' at '}
                            <span className={styles.detailLocation}>{fb.location}</span>
                          </div>
                          <div className={styles.detailText}>
                            &quot;{fb.text.substring(0, 80)}{fb.text.length > 80 ? '...' : ''}&quot;
                          </div>
                          <div className={styles.detailMeta}>
                            <span>
                              Reason: {fb.reason === 'missing'
                                ? 'LLM did not provide value'
                                : fb.reason === 'llm_error'
                                  ? 'LLM error during classification'
                                  : 'Invalid value'}
                            </span>
                            {' | '}
                            <span>Default: <code>{fb.defaultUsed}</code></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </>
          )}

          <div className={styles.note}>
            <strong>Note:</strong> These issues may affect result accuracy.
            {hasFallbacks && " Frequent fallbacks indicate LLM reliability issues."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FallbackReport;
