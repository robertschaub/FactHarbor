/**
 * Coverage Matrix Display Component
 *
 * Visualizes the claims × boundaries evidence-COUNT distribution matrix.
 * Transposed layout: boundaries as rows, claims as columns.
 * Uses short boundary labels in table, full names in legend below.
 *
 * Count-only semantics: cell color encodes evidence count (none / low /
 * medium / high). Live UI and HTML export share the same count semantics.
 * If a verdict-oriented matrix is wanted, build a separate component.
 *
 * @module components/CoverageMatrix
 */

import type { CoverageMatrix } from "@/lib/analyzer/types";
import styles from "./CoverageMatrix.module.css";

interface Props {
  matrix: CoverageMatrix;
  claimLabels?: string[];
  boundaryLabels?: string[];      // Full boundary names (for legend)
  boundaryShortLabels?: string[]; // Short labels (for table rows, matching "Evidence by Methodology")
  hideLegend?: boolean;           // When true, boundary legend is not rendered (rendered separately)
  onNavigate?: (refId: string) => void; // Cross-navigation callback
}

/** Standalone boundary legend — maps short labels to full names */
export function BoundaryLegend({ shortLabels, fullLabels, boundaryIds, onNavigate }: {
  shortLabels: string[];
  fullLabels: string[];
  boundaryIds?: string[];
  onNavigate?: (refId: string) => void;
}) {
  const needsLegend = fullLabels.some((full, i) => full !== shortLabels[i]);
  if (!needsLegend) return null;
  return (
    <div className={styles.boundaryLegend}>
      {fullLabels.map((full, i) => (
        <div key={i} className={styles.boundaryLegendItem} id={boundaryIds?.[i] ? `nav-cb-${boundaryIds[i]}` : undefined}>
          {onNavigate && boundaryIds?.[i] ? (
            <button className={`${styles.boundaryLegendLabel} ${styles.clickableHeader}`} onClick={() => onNavigate(`BF_${boundaryIds![i]}`)} title="Jump to evidence for this boundary">{shortLabels[i]}</button>
          ) : (
            <div className={styles.boundaryLegendLabel}>{shortLabels[i]}</div>
          )}
          <div className={styles.boundaryLegendFull}>{full}</div>
        </div>
      ))}
    </div>
  );
}

export function CoverageMatrixDisplay({ matrix, claimLabels, boundaryLabels, boundaryShortLabels, hideLegend = false, onNavigate }: Props) {
  const { claims, boundaries, counts } = matrix;

  const claimDisplayLabels = claimLabels ?? claims.map((_, i) => `Claim ${i + 1}`);
  const fullLabels = boundaryLabels ?? boundaries.map((_, i) => `Boundary ${i + 1}`);
  const shortLabels = boundaryShortLabels ?? fullLabels;
  const needsLegend = fullLabels.some((full, i) => full !== shortLabels[i]);

  /** Cell CSS class based on evidence count. Count-only semantics. */
  const countCellClass = (count: number): string => {
    if (count === 0) return styles.cellEmpty;
    if (count === 1) return styles.cellLow;
    if (count === 2) return styles.cellMedium;
    return styles.cellHigh;
  };

  if (claims.length === 0 || boundaries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No coverage data available</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.legend}>
        <span className={styles.legendTitle}>Evidence Count:</span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.cellEmpty}`}></span>
          0
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.cellLow}`}></span>
          1
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.cellMedium}`}></span>
          2
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.cellHigh}`}></span>
          3+
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.cornerCell}>
                <div className={styles.cornerDiagonal}></div>
                <span className={styles.cornerLabelTop}>Atomic Claim</span>
                <span className={styles.cornerLabelBottom}>Assessment Boundary</span>
              </th>
              {claimDisplayLabels.map((label, i) => (
                <th
                  key={claims[i]}
                  className={`${styles.headerCell} ${onNavigate ? styles.clickableHeader : ""}`}
                  title={label}
                  onClick={onNavigate ? () => onNavigate(claims[i]) : undefined}
                >
                  <div className={styles.headerCellContent}>{label}</div>
                </th>
              ))}
              <th className={styles.totalHeader}>Total</th>
            </tr>
          </thead>
          <tbody>
            {boundaries.map((_, boundaryIdx) => {
              const colTotal = counts.reduce((sum, row) => sum + row[boundaryIdx], 0);
              return (
                <tr key={boundaries[boundaryIdx]}>
                  <th
                    className={`${styles.rowHeader} ${onNavigate ? styles.clickableHeader : ""}`}
                    title={fullLabels[boundaryIdx]}
                    onClick={onNavigate ? () => onNavigate(boundaries[boundaryIdx]) : undefined}
                  >
                    {shortLabels[boundaryIdx]}
                  </th>
                  {counts.map((row, claimIdx) => {
                    const count = row[boundaryIdx];
                    return (
                      <td
                        key={`${boundaryIdx}-${claimIdx}`}
                        className={`${countCellClass(count)} ${onNavigate && count > 0 ? styles.clickableCell : ""}`}
                        onClick={onNavigate && count > 0 ? () => onNavigate(claims[claimIdx]) : undefined}
                      >
                        {count > 0 ? count : "—"}
                      </td>
                    );
                  })}
                  <td className={`${styles.totalCell} ${countCellClass(colTotal)}`}>
                    {colTotal}
                  </td>
                </tr>
              );
            })}
            <tr className={styles.totalRow}>
              <th className={styles.rowHeader}>Total</th>
              {counts.map((row, claimIdx) => {
                const rowTotal = row.reduce((sum, count) => sum + count, 0);
                return (
                  <td key={claimIdx} className={`${styles.totalCell} ${countCellClass(rowTotal)}`}>
                    {rowTotal}
                  </td>
                );
              })}
              <td className={`${styles.grandTotal} ${countCellClass(counts.reduce((sum, row) => sum + row.reduce((s, c) => s + c, 0), 0))}`}>
                {counts.reduce((sum, row) => sum + row.reduce((s, c) => s + c, 0), 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!hideLegend && needsLegend && (
        <div className={styles.boundaryLegend}>
          {fullLabels.map((full, i) => (
            <div key={i} className={styles.boundaryLegendItem}>
              <div className={styles.boundaryLegendLabel}>{shortLabels[i]}</div>
              <div className={styles.boundaryLegendFull}>{full}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
