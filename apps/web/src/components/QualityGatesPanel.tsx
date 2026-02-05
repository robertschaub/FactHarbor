/**
 * QualityGatesPanel Component
 * Displays quality gate status: pass/fail, evidence counts, confidence distribution
 * P1: Surface quality gates to UI per Analysis Quality Review plan
 */

import React from 'react';
import styles from './QualityGatesPanel.module.css';
import type { QualityGates } from '@/lib/analyzer/types';

// Re-export for consumers that imported from this file
export type { QualityGates } from '@/lib/analyzer/types';

interface QualityGatesPanelProps {
  qualityGates: QualityGates | undefined;
  collapsed?: boolean;
}

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

function ConfidenceBar({ label, count, total, level }: { label: string; count: number; total: number; level: ConfidenceLevel }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={styles.confidenceRow}>
      <span className={styles.confidenceLabel}>{label}</span>
      <div className={styles.confidenceBarContainer}>
        <div
          className={`${styles.confidenceBarFill} ${styles[level]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={styles.confidenceCount}>{count} ({pct}%)</span>
    </div>
  );
}

export function QualityGatesPanel({ qualityGates, collapsed = true }: QualityGatesPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(!collapsed);

  if (!qualityGates) {
    return null;
  }

  const { passed, gate1Stats, gate4Stats, summary } = qualityGates;
  const totalVerdicts = gate4Stats?.total || 0;

  return (
    <div className={`${styles.panel} ${passed ? styles.passed : styles.failed}`}>
      <button
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className={styles.headerLeft}>
          <span className={styles.statusIcon}>
            {passed ? '✓' : '⚠'}
          </span>
          <span className={styles.title}>
            Quality Gates: {passed ? 'Passed' : 'Issues Detected'}
          </span>
        </div>
        <span className={styles.expandIcon}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {/* Summary Stats */}
          {summary && (
            <div className={styles.summaryGrid}>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{summary.totalEvidenceItems}</span>
                <span className={styles.statLabel}>Evidence Items</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{summary.totalSources}</span>
                <span className={styles.statLabel}>Sources</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{summary.searchesPerformed}</span>
                <span className={styles.statLabel}>Searches</span>
              </div>
              <div className={styles.statBox}>
                <span className={`${styles.statValue} ${summary.contradictionSearchPerformed ? styles.yes : styles.no}`}>
                  {summary.contradictionSearchPerformed ? '✓' : '✗'}
                </span>
                <span className={styles.statLabel}>Counter-Search</span>
              </div>
            </div>
          )}

          {/* Gate 4: Verdict Confidence Distribution */}
          {gate4Stats && totalVerdicts > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Verdict Confidence Distribution</h4>
              <div className={styles.confidenceBars}>
                <ConfidenceBar
                  label="High"
                  count={gate4Stats.highConfidence}
                  total={totalVerdicts}
                  level="high"
                />
                <ConfidenceBar
                  label="Medium"
                  count={gate4Stats.mediumConfidence}
                  total={totalVerdicts}
                  level="medium"
                />
                <ConfidenceBar
                  label="Low"
                  count={gate4Stats.lowConfidence}
                  total={totalVerdicts}
                  level="low"
                />
                <ConfidenceBar
                  label="Insufficient"
                  count={gate4Stats.insufficient}
                  total={totalVerdicts}
                  level="insufficient"
                />
              </div>
              <div className={styles.publishableNote}>
                <strong>{gate4Stats.publishable}</strong> of {totalVerdicts} verdicts publishable
                {gate4Stats.centralKept > 0 && (
                  <span className={styles.centralNote}>
                    ({gate4Stats.centralKept} central claims kept despite low confidence)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Gate 1: Claim Validation */}
          {gate1Stats && gate1Stats.total > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Claim Validation (Gate 1)</h4>
              <div className={styles.gate1Stats}>
                <span>{gate1Stats.passed} passed</span>
                <span className={styles.separator}>|</span>
                <span>{gate1Stats.filtered} filtered</span>
                {gate1Stats.centralKept > 0 && (
                  <>
                    <span className={styles.separator}>|</span>
                    <span>{gate1Stats.centralKept} central kept</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QualityGatesPanel;
