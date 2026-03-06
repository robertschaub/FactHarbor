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
  hideKeyFinding?: boolean;
  qualityDetails?: ReactNode;
  supplementalMeta?: ReactNode;
  onNavigate?: (refId: string) => void;
}

export function VerdictNarrativeDisplay({ narrative, hideHeadline = false, hideKeyFinding = false, qualityDetails, supplementalMeta, onNavigate }: Props) {
  const { evidenceBaseSummary, boundaryDisagreements, limitations } = narrative;

  return (
    <section className={styles.narrative}>
      {evidenceBaseSummary && (
        <div className={styles.block}>
          <div className={styles.blockLabel}>Evidence Base</div>
          <ExpandableText text={evidenceBaseSummary} className={styles.blockText} modalTitle="Evidence Base" bare onNavigate={onNavigate} />
        </div>
      )}

      {limitations && (
        <div className={styles.block}>
          <div className={styles.blockLabel}>Limitations</div>
          <ExpandableText text={limitations} className={styles.blockText} modalTitle="Limitations" bare onNavigate={onNavigate} />
        </div>
      )}

      {supplementalMeta ? <div className={styles.metaRow}>{supplementalMeta}</div> : null}

      {boundaryDisagreements && boundaryDisagreements.length > 0 && (
        <details className={styles.tensionDetails}>
          <summary className={styles.tensionSummary}>
            <span>Cross-Boundary Tensions ({boundaryDisagreements.length})</span>
          </summary>
          <div className={styles.tensionList}>
            {boundaryDisagreements.map((disagreement, i) => (
              <div key={i} className={styles.tensionItem}>
                <ExpandableText
                  text={disagreement}
                  className={styles.blockText}
                  modalTitle={`Cross-Boundary Tension ${i + 1}`}
                  bare
                  onNavigate={onNavigate}
                />
              </div>
            ))}
          </div>
        </details>
      )}

      {qualityDetails && (
        <details className={styles.qualityDetails}>
          <summary className={styles.qualitySummary}>
            <span>Quality Details</span>
          </summary>
          <div className={styles.qualityDetailsContent}>
            {qualityDetails}
          </div>
        </details>
      )}
    </section>
  );
}
