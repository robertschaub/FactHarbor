/**
 * FallbackReport Component
 * Displays quality issues: classification fallbacks AND analysis warnings
 * (verdict direction mismatches, structured output failures, budget exceeded, etc.)
 */

import styles from './FallbackReport.module.css';
import type { FallbackSummary } from '@/lib/analyzer/classification-fallbacks';
import { splitWarningsForDisplay } from '@/lib/analyzer/warning-display';
import type { AnalysisWarning } from '@/lib/analyzer/types';

interface FallbackReportProps {
  summary: FallbackSummary | undefined;
  analysisWarnings?: AnalysisWarning[];  // P1: Analysis warnings
  isAdmin?: boolean;
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
  llm_provider_error: "LLM Provider Error",
  structured_output_failure: "Structured Output Failure",
  evidence_filter_degradation: "Evidence Filter Degradation",
  grounding_check_degraded: "Grounding Validation Degraded",
  direction_validation_degraded: "Direction Validation Degraded",
  verdict_fallback_partial: "Verdict Partial Fallback",
  verdict_partial_recovery: "Verdict Partial Recovery",
  verdict_batch_retry: "Verdict Batch Retry",
  search_provider_error: "Search Provider Error",
  source_reliability_error: "Source Reliability Error",
  source_fetch_failure: "Source Fetch Failure",
  source_fetch_degradation: "Source Fetch Degradation",
  debate_provider_fallback: "Debate Provider Fallback",
  llm_tpm_guard_fallback: "TPM Guard Fallback",
  budget_exceeded: "Budget Exceeded",
  query_budget_exhausted: "Query Budget Exhausted",
  low_evidence_count: "Low Evidence Count",
  low_source_count: "Low Source Count",
  no_successful_sources: "No Successful Sources",
  source_acquisition_collapse: "Source Acquisition Collapse",
  insufficient_evidence: "Insufficient Evidence (F4)",
  baseless_challenge_blocked: "Baseless Challenge Blocked (F5)",
  baseless_challenge_detected: "Baseless Challenges Detected (F5)",
  evidence_partition_stats: "Evidence Partitioning (F6)",
  evidence_pool_imbalance: "Evidence Pool Imbalance",
  analysis_generation_failed: "Analysis Generation Failed",
  contested_verdict_range: "Contested Verdict Range",
  all_same_debate_tier: "Debate Tier Homogeneity",
  inverse_consistency_error: "Inverse Consistency Error",
  challenger_failure: "Challenger Failure",
  tiger_score_failed: "TIGER Score Failed",
  explanation_quality_rubric_failed: "Explanation Rubric Failed",
  verdict_integrity_failure: "Verdict Integrity Failure",
  verdict_grounding_issue: "Verdict Grounding Issue",
  verdict_direction_issue: "Verdict Direction Issue",
  verdict_citation_integrity_guard: "Verdict Citation Integrity Guard",
};

const WARNING_TYPE_HINTS: Record<string, string> = {
  report_damaged: "Treat this report as non-final until critical issues are resolved and the analysis is re-run.",
  llm_provider_error: "Check LLM provider credits/quota/API key/availability and rerun once provider health is restored.",
  source_reliability_error: "Source reliability scoring encountered provider issues. Review provider health and rerun.",
  source_fetch_degradation: "High source fetch failure ratio can miss key evidence. Rerun when network/provider health improves.",
  source_acquisition_collapse: "No usable sources were acquired despite repeated queries. Do not rely on this report.",
  structured_output_failure: "Retry with reduced output scope or shorter prompts to avoid structured-output truncation.",
  grounding_check_degraded: "Grounding validation model failed. Integrity checks may be less reliable for this run.",
  direction_validation_degraded: "Direction validation model failed. Truth/evidence alignment checks may be incomplete.",
  verdict_fallback_partial: "Some claims used fallback verdicts due model output gaps.",
  verdict_partial_recovery: "Only part of the model output could be recovered; remaining claims were preserved/fallbacked.",
  verdict_batch_retry: "Verdict generation required a recovery retry path.",
  budget_exceeded: "Increase token/iteration budget or narrow analysis scope.",
  query_budget_exhausted: "Per-claim query budget was exhausted before sufficiency for at least one claim.",
  search_provider_error: "Check search provider quota/key health and rerun after recovery.",
  evidence_filter_degradation: "Inspect evidence-filter LLM failures; heuristic fallback may lower precision.",
  insufficient_evidence: "This claim lacks sufficient evidence for a confident verdict. Consider broadening search scope or adding more sources.",
  verdict_citation_integrity_guard: "Final verdict citations were sanitized. Review remaining evidence support before relying on the verdict.",
  baseless_challenge_blocked: "A verdict adjustment was reverted because the challenge lacked supporting evidence.",
  baseless_challenge_detected: "Multiple baseless challenges were detected and blocked during verdict aggregation.",
  evidence_pool_imbalance: "This is directional telemetry and can occur naturally on one-sided evidence topics.",
  verdict_integrity_failure: "The verdict was downgraded to a safe fallback due to integrity validation failure.",
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

function WarningCard({ warning }: { warning: AnalysisWarning }) {
  const hints = getWarningHints(warning);
  return (
    <div className={`${styles.warningItem} ${styles[`severity_${warning.severity}`]}`}>
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
        {hints.length > 0 && (
          <ul className={styles.warningHintList}>
            {hints.slice(0, 3).map((hint, hintIdx) => (
              <li key={`hint-${hintIdx}`}>{hint}</li>
            ))}
          </ul>
        )}
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
  );
}

export function FallbackReport({ summary, analysisWarnings = [], isAdmin = false }: FallbackReportProps) {
  const hasFallbacks = summary && summary.totalFallbacks > 0;
  const warningBuckets = splitWarningsForDisplay(analysisWarnings);
  const qualityWarnings = [
    ...warningBuckets.providerDegrading,
    ...warningBuckets.analysisDegrading,
  ];
  const operationalWarnings = [
    ...warningBuckets.providerInformational,
    ...warningBuckets.analysisInformational,
  ];

  const qualityWarningsCount = qualityWarnings.length;
  const hasVisibleContent = hasFallbacks || qualityWarningsCount > 0
    || (isAdmin && operationalWarnings.length > 0);

  // Don't render if nothing to show (non-admins never see operational notes)
  if (!hasVisibleContent) {
    return null;
  }

  const fieldsWithFallbacks = hasFallbacks
    ? Object.entries(summary.fallbacksByField).filter(([_, count]) => count > 0)
    : [];

  const hasErrors = qualityWarnings.some(w => w.severity === "error");

  // Count only quality-affecting warnings (classification fallbacks are informational)
  const qualityIssueCount = qualityWarnings.length;
  const hasQualityIssues = qualityIssueCount > 0;

  // Notes-only (no quality issues): render as a single collapsed line
  if (!hasQualityIssues) {
    const hasAdminNotes = isAdmin && operationalWarnings.length > 0;
    if (!hasFallbacks && !hasAdminNotes) return null;

    const parts: string[] = [];
    if (hasFallbacks) parts.push(`${summary!.totalFallbacks} classification fallback${summary!.totalFallbacks !== 1 ? 's' : ''}`);
    if (hasAdminNotes) parts.push(`${operationalWarnings.length} operational note${operationalWarnings.length !== 1 ? 's' : ''}`);

    return (
      <details className={styles.notesOnlyDetails}>
        <summary className={styles.notesOnlySummary}>
          Analysis Notes — {parts.join(', ')} (informational)
        </summary>
        {hasFallbacks && (
          <div className={styles.fallbackNote}>
            <strong>Classification Fallbacks:</strong> {summary!.totalFallbacks} field{summary!.totalFallbacks !== 1 ? 's' : ''} used safe defaults
            {fieldsWithFallbacks.length > 0 && (
              <span> ({fieldsWithFallbacks.map(([f]) => f).join(', ')})</span>
            )}
          </div>
        )}
        {hasAdminNotes && (
          <div className={styles.warningsSection}>
            {operationalWarnings.map((warning, index) => (
              <WarningCard key={`o-${index}`} warning={warning} />
            ))}
          </div>
        )}
      </details>
    );
  }

  return (
    <details
      className={`${styles.fallbackReport} ${hasErrors ? styles.hasErrors : ''}`}
      open
    >
      <summary className={styles.header}>
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
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>
            Analysis Quality Issues ({qualityIssueCount})
          </h3>
          <p className={styles.noteInline}>
            May affect result accuracy.
            {hasFallbacks && " Classification fallbacks used safe defaults."}
          </p>
        </div>
      </summary>

      <div className={styles.body}>
        {/* Quality-affecting warnings — always visible */}
        {qualityWarnings.length > 0 && (
          <div className={styles.warningsSection}>
            {qualityWarnings.map((warning, index) => (
              <WarningCard key={`q-${index}`} warning={warning} />
            ))}
          </div>
        )}

        {/* Operational/informational warnings — admin only, expandable */}
        {isAdmin && operationalWarnings.length > 0 && (
          <details className={styles.operationalDetails}>
            <summary className={styles.operationalSummary}>
              {operationalWarnings.length} operational note{operationalWarnings.length !== 1 ? 's' : ''} (informational)
            </summary>
            <div className={styles.warningsSection}>
              {operationalWarnings.map((warning, index) => (
                <WarningCard key={`o-${index}`} warning={warning} />
              ))}
            </div>
          </details>
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

      </div>
    </details>
  );
}

export default FallbackReport;
