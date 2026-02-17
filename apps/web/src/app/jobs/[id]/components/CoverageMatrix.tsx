/**
 * Coverage Matrix Display Component
 *
 * Visualizes the claims × boundaries evidence distribution matrix.
 * Shows which claims have evidence in which boundaries, with color-coded counts.
 *
 * @module components/CoverageMatrix
 */

import type { CoverageMatrix } from "@/lib/analyzer/types";
import styles from "./CoverageMatrix.module.css";

interface Props {
  matrix: CoverageMatrix;
  claimLabels?: string[]; // Optional shortened claim statements for display
  boundaryLabels?: string[]; // Optional boundary names for display
}

export function CoverageMatrixDisplay({ matrix, claimLabels, boundaryLabels }: Props) {
  const { claims, boundaries, counts } = matrix;

  // Generate display labels (use provided or fallback to IDs)
  const claimDisplayLabels = claimLabels ?? claims.map((id, i) => `Claim ${i + 1}`);
  const boundaryDisplayLabels = boundaryLabels ?? boundaries.map((id, i) => `Boundary ${i + 1}`);

  // Color coding based on evidence count
  const getCellClass = (count: number): string => {
    if (count === 0) return styles.cellEmpty;
    if (count === 1) return styles.cellLow;
    if (count === 2) return styles.cellMedium;
    return styles.cellHigh; // 3+
  };

  const getCellTooltip = (count: number, claimLabel: string, boundaryLabel: string): string => {
    if (count === 0) {
      return `No evidence for "${claimLabel}" in ${boundaryLabel}`;
    }
    return `${count} evidence item${count > 1 ? "s" : ""} for "${claimLabel}" in ${boundaryLabel}`;
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
          0 (no coverage)
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.cellLow}`}></span>
          1 (minimal)
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.cellMedium}`}></span>
          2 (moderate)
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.cellHigh}`}></span>
          3+ (good)
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.cornerCell}>Claims / Boundaries</th>
              {boundaryDisplayLabels.map((label, i) => (
                <th key={boundaries[i]} className={styles.headerCell} title={boundaries[i]}>
                  {label}
                </th>
              ))}
              <th className={styles.totalCell}>Total</th>
            </tr>
          </thead>
          <tbody>
            {counts.map((row, claimIdx) => {
              const rowTotal = row.reduce((sum, count) => sum + count, 0);
              return (
                <tr key={claims[claimIdx]}>
                  <th className={styles.rowHeader} title={claims[claimIdx]}>
                    {claimDisplayLabels[claimIdx]}
                  </th>
                  {row.map((count, boundaryIdx) => (
                    <td
                      key={`${claimIdx}-${boundaryIdx}`}
                      className={getCellClass(count)}
                      title={getCellTooltip(count, claimDisplayLabels[claimIdx], boundaryDisplayLabels[boundaryIdx])}
                    >
                      {count > 0 ? count : "—"}
                    </td>
                  ))}
                  <td className={styles.totalCell}>{rowTotal}</td>
                </tr>
              );
            })}
            <tr className={styles.totalRow}>
              <th className={styles.rowHeader}>Total</th>
              {boundaries.map((_, boundaryIdx) => {
                const colTotal = counts.reduce((sum, row) => sum + row[boundaryIdx], 0);
                return <td key={boundaryIdx} className={styles.totalCell}>{colTotal}</td>;
              })}
              <td className={styles.grandTotal}>
                {counts.reduce((sum, row) => sum + row.reduce((s, c) => s + c, 0), 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
