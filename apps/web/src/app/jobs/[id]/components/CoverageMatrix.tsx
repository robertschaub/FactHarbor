/**
 * Coverage Matrix Display Component
 *
 * Visualizes the claims × boundaries evidence distribution matrix.
 * Transposed layout: boundaries as rows, claims as columns.
 * Uses short boundary labels in table, full names in legend below.
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
}

/** Standalone boundary legend — maps short labels to full names */
export function BoundaryLegend({ shortLabels, fullLabels }: { shortLabels: string[]; fullLabels: string[] }) {
  const needsLegend = fullLabels.some((full, i) => full !== shortLabels[i]);
  if (!needsLegend) return null;
  return (
    <div className={styles.boundaryLegend}>
      {fullLabels.map((full, i) => (
        <div key={i} className={styles.boundaryLegendItem}>
          <div className={styles.boundaryLegendLabel}>{shortLabels[i]}</div>
          <div className={styles.boundaryLegendFull}>{full}</div>
        </div>
      ))}
    </div>
  );
}

export function CoverageMatrixDisplay({ matrix, claimLabels, boundaryLabels, boundaryShortLabels, hideLegend = false }: Props) {
  const { claims, boundaries, counts } = matrix;

  const claimDisplayLabels = claimLabels ?? claims.map((id, i) => `Claim ${i + 1}`);
  const fullLabels = boundaryLabels ?? boundaries.map((id, i) => `Boundary ${i + 1}`);
  const shortLabels = boundaryShortLabels ?? fullLabels;
  const needsLegend = fullLabels.some((full, i) => full !== shortLabels[i]);

  const getCellClass = (count: number): string => {
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
              <th className={styles.cornerCell}>Boundary</th>
              {claimDisplayLabels.map((label, i) => (
                <th key={claims[i]} className={styles.headerCell} title={claims[i]}>
                  {label}
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
                  <th className={styles.rowHeader} title={fullLabels[boundaryIdx]}>
                    {shortLabels[boundaryIdx]}
                  </th>
                  {counts.map((row, claimIdx) => (
                    <td
                      key={`${boundaryIdx}-${claimIdx}`}
                      className={getCellClass(row[boundaryIdx])}
                    >
                      {row[boundaryIdx] > 0 ? row[boundaryIdx] : "—"}
                    </td>
                  ))}
                  <td className={styles.totalCell}>{colTotal}</td>
                </tr>
              );
            })}
            <tr className={styles.totalRow}>
              <th className={styles.rowHeader}>Total</th>
              {counts.map((row, claimIdx) => {
                const rowTotal = row.reduce((sum, count) => sum + count, 0);
                return <td key={claimIdx} className={styles.totalCell}>{rowTotal}</td>;
              })}
              <td className={styles.grandTotal}>
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
