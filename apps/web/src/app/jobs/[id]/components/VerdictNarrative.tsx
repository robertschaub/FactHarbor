/**
 * Verdict Narrative Display Component
 *
 * Displays the structured narrative for the overall assessment.
 * LLM-generated synthesis providing context and interpretation.
 *
 * @module components/VerdictNarrative
 */

import type { VerdictNarrative } from "@/lib/analyzer/types";
import type { ReactNode } from "react";
import styles from "./VerdictNarrative.module.css";
import { ExpandableText } from "./ExpandableText";

interface Props {
  narrative: VerdictNarrative;
  hideHeadline?: boolean;
  beforeLimitations?: ReactNode;
  onNavigate?: (refId: string) => void;
}

export function VerdictNarrativeDisplay({ narrative, hideHeadline = false, beforeLimitations, onNavigate }: Props) {
  const { headline, evidenceBaseSummary, keyFinding, boundaryDisagreements, limitations } = narrative;

  return (
    <section className={styles.narrative}>
      {!hideHeadline && (
        <div className={styles.headline}>
          <span className={styles.headlineIcon}>📋</span>
          <h3 className={styles.headlineText}>{headline}</h3>
        </div>
      )}

      <div className={styles.keyFinding}>
        <ExpandableText text={keyFinding} className={styles.findingText} modalTitle="Key Finding" bare onNavigate={onNavigate} />
      </div>

      <details className={styles.qualityDetails}>
        <summary className={styles.qualitySummary}>
          <span>Quality</span>
        </summary>

        <div className={styles.evidenceBase}>
          <strong className={styles.label}>Evidence Base:</strong>
          <ExpandableText text={evidenceBaseSummary} className={styles.value} modalTitle="Evidence Base" bare onNavigate={onNavigate} />
        </div>

        {boundaryDisagreements && boundaryDisagreements.length > 0 && (
          <details className={styles.details}>
            <summary className={styles.summary}>
              <span>Cross-Boundary Tensions ({boundaryDisagreements.length})</span>
            </summary>
            <ul className={styles.list}>
              {boundaryDisagreements.map((disagreement, i) => (
                <li key={i} className={styles.listItem}>
                  {disagreement}
                </li>
              ))}
            </ul>
          </details>
        )}

        <details className={styles.details}>
          <summary className={styles.summary}>
            <span>Limitations</span>
          </summary>
          <div className={styles.limitationsContent}>
            <ExpandableText text={limitations} className={styles.limitationsText} modalTitle="Limitations" onNavigate={onNavigate} />
          </div>
        </details>

        {beforeLimitations}
      </details>
    </section>
  );
}
