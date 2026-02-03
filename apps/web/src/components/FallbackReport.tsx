/**
 * FallbackReport Component
 * Displays classification fallback warnings in analysis results
 */

import React from 'react';
import styles from './FallbackReport.module.css';
import type { FallbackSummary } from '@/lib/analyzer/classification-fallbacks';

interface FallbackReportProps {
  summary: FallbackSummary | undefined;
}

const fieldDefaults: Record<string, string> = {
  harmPotential: 'medium',
  factualBasis: 'unknown',
  sourceAuthority: 'secondary',
  evidenceBasis: 'anecdotal',
  isContested: 'false'
};

export function FallbackReport({ summary }: FallbackReportProps) {
  // Don't render if no fallbacks
  if (!summary || summary.totalFallbacks === 0) {
    return null;
  }

  const fieldsWithFallbacks = Object.entries(summary.fallbacksByField)
    .filter(([_, count]) => count > 0);

  return (
    <div className={styles.fallbackReport}>
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
            Classification Fallbacks Occurred
          </h3>
          <p className={styles.description}>
            The LLM failed to classify {summary.totalFallbacks} field(s).
            Safe defaults were used to ensure analysis completion.
          </p>

          {/* Fallbacks by field */}
          <div className={styles.fieldSummary}>
            <h4 className={styles.fieldSummaryTitle}>By Field:</h4>
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

          <div className={styles.note}>
            <strong>Note:</strong> Frequent fallbacks indicate LLM reliability issues.
            Consider reviewing prompts or adjusting timeout settings.
          </div>
        </div>
      </div>
    </div>
  );
}

export default FallbackReport;
