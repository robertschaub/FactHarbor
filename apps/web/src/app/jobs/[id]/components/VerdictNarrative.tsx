/**
 * Verdict Narrative Display Component
 *
 * Displays the structured narrative for the overall assessment.
 * LLM-generated synthesis providing context and interpretation.
 *
 * @module components/VerdictNarrative
 */

import type { VerdictNarrative } from "@/lib/analyzer/types";
import styles from "./VerdictNarrative.module.css";

interface Props {
  narrative: VerdictNarrative;
}

export function VerdictNarrativeDisplay({ narrative }: Props) {
  const { headline, evidenceBaseSummary, keyFinding, boundaryDisagreements, limitations } = narrative;

  return (
    <section className={styles.narrative}>
      <div className={styles.headline}>
        <span className={styles.headlineIcon}>📋</span>
        <h3 className={styles.headlineText}>{headline}</h3>
      </div>

      <div className={styles.evidenceBase}>
        <strong className={styles.label}>Evidence Base:</strong>
        <span className={styles.value}>{evidenceBaseSummary}</span>
      </div>

      <div className={styles.keyFinding}>
        <strong className={styles.label}>Key Finding:</strong>
        <p className={styles.findingText}>{keyFinding}</p>
      </div>

      {boundaryDisagreements && boundaryDisagreements.length > 0 && (
        <details className={styles.details}>
          <summary className={styles.summary}>
            <span className={styles.summaryIcon}>⚠️</span>
            <span>Boundary Disagreements ({boundaryDisagreements.length})</span>
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
          <span className={styles.summaryIcon}>ℹ️</span>
          <span>Limitations</span>
        </summary>
        <div className={styles.limitationsContent}>
          <p className={styles.limitationsText}>{limitations}</p>
        </div>
      </details>
    </section>
  );
}
