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
import { percentageToClaimVerdict } from "@/lib/analyzer/truth-scale";
import styles from "./CoverageMatrix.module.css";

interface CellVerdict {
  pct: number;   // truthPercentage 0-100
  conf: number;  // confidence 0-100
}

interface VerdictColorEntry {
  bg: string;
  text: string;
  border?: string;
}

interface Props {
  matrix: CoverageMatrix;
  claimLabels?: string[];
  boundaryLabels?: string[];      // Full boundary names (for legend)
  boundaryShortLabels?: string[]; // Short labels (for table rows, matching "Evidence by Methodology")
  hideLegend?: boolean;           // When true, boundary legend is not rendered (rendered separately)
  onNavigate?: (refId: string) => void; // Cross-navigation callback
  cellVerdicts?: (CellVerdict | null)[][]; // Same shape as counts: [claimIdx][boundaryIdx]
  claimVerdicts?: (CellVerdict | null)[];  // One per claim — claim-level verdict for Total row
  overallVerdict?: CellVerdict | null;     // Overall verdict — colors "Total" header + grand total cell
  verdictColorMap?: Record<string, VerdictColorEntry>; // Same palette as claim cards
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

export function CoverageMatrixDisplay({ matrix, claimLabels, boundaryLabels, boundaryShortLabels, hideLegend = false, onNavigate, cellVerdicts, claimVerdicts: claimLevelVerdicts, overallVerdict, verdictColorMap }: Props) {
  const { claims, boundaries, counts } = matrix;
  const hasVerdictData = !!cellVerdicts && cellVerdicts.length > 0;

  const claimDisplayLabels = claimLabels ?? claims.map((id, i) => `Claim ${i + 1}`);
  const fullLabels = boundaryLabels ?? boundaries.map((id, i) => `Boundary ${i + 1}`);
  const shortLabels = boundaryShortLabels ?? fullLabels;
  const needsLegend = fullLabels.some((full, i) => full !== shortLabels[i]);

  const fallbackColors: Record<string, VerdictColorEntry> = {
    "TRUE": { bg: "#d4edda", text: "#155724", border: "#28a745" },
    "MOSTLY-TRUE": { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a" },
    "LEANING-TRUE": { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b" },
    "MIXED": { bg: "#f5f0eb", text: "#5d534a", border: "#d6cdc4" },
    "UNVERIFIED": { bg: "#fff3e0", text: "#e65100", border: "#ff9800" },
    "LEANING-FALSE": { bg: "#ffccbc", text: "#bf360c", border: "#ff5722" },
    "MOSTLY-FALSE": { bg: "#ffcdd2", text: "#c62828", border: "#f44336" },
    "FALSE": { bg: "#b71c1c", text: "#ffffff", border: "#b71c1c" },
  };
  const colorMap = verdictColorMap ?? fallbackColors;

  /** Get inline style from a verdict percentage using the same palette as claim cards. */
  const verdictStyle = (v: CellVerdict | null | undefined): React.CSSProperties => {
    if (!v) return {};
    const verdict = percentageToClaimVerdict(v.pct, v.conf);
    const c = colorMap[verdict] || colorMap["UNVERIFIED"] || fallbackColors["UNVERIFIED"];
    return { backgroundColor: c.bg, color: c.text };
  };

  /** Dominant-cell verdict for totals: uses the verdict of the cell with the most evidence.
   *  Avoids ghost verdicts that arise from averaging truth percentages across cells. */
  const dominantVerdict = (
    verdicts: (CellVerdict | null | undefined)[],
    weights: number[],
    labels: string[],
  ): { style: React.CSSProperties; tooltip: string } => {
    let bestIdx = -1;
    let bestWeight = 0;
    for (let i = 0; i < verdicts.length; i++) {
      if (verdicts[i] && weights[i] > bestWeight) {
        bestIdx = i;
        bestWeight = weights[i];
      }
    }
    if (bestIdx < 0) return { style: {}, tooltip: "" };
    const v = verdicts[bestIdx]!;
    const verdict = percentageToClaimVerdict(v.pct, v.conf);
    return {
      style: verdictStyle(v),
      tooltip: `Dominant: ${labels[bestIdx]} (${bestWeight} items) — ${verdict} ${Math.round(v.pct)}%`,
    };
  };

  /** Fallback CSS class when no verdict data. */
  const fallbackCellClass = (count: number): string => {
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
        {hasVerdictData ? (
          <>
            <span className={styles.legendTitle}>Verdict:</span>
            {([
              ["True", "TRUE"], ["Mostly True", "MOSTLY-TRUE"], ["Leaning True", "LEANING-TRUE"],
              ["Mixed", "MIXED"], ["Leaning False", "LEANING-FALSE"], ["Mostly False", "MOSTLY-FALSE"],
              ["False", "FALSE"],
            ] as const).map(([label, key]) => {
              const c = colorMap[key] || fallbackColors[key];
              return (
                <span key={key} className={styles.legendItem}>
                  <span className={styles.legendSwatch} style={{ backgroundColor: c.bg, borderColor: c.border }}></span>
                  {label}
                </span>
              );
            })}
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.cellEmpty}`}></span>
              No evidence
            </span>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.cornerCell} style={overallVerdict ? verdictStyle(overallVerdict) : undefined}>
                <div className={styles.cornerDiagonal}></div>
                <span className={styles.cornerLabelTop}>Atomic Claim</span>
                <span className={styles.cornerLabelBottom}>Assessment Boundary</span>
              </th>
              {claimDisplayLabels.map((label, i) => {
                const claimVerdict = claimLevelVerdicts?.[i];
                return (
                  <th
                    key={claims[i]}
                    className={`${styles.headerCell} ${onNavigate ? styles.clickableHeader : ""}`}
                    style={claimVerdict ? verdictStyle(claimVerdict) : undefined}
                    title={label}
                    onClick={onNavigate ? () => onNavigate(claims[i]) : undefined}
                  >
                    <div className={styles.headerCellContent}>{label}</div>
                  </th>
                );
              })}
              <th className={styles.totalHeader} style={overallVerdict ? verdictStyle(overallVerdict) : undefined}>Total</th>
            </tr>
          </thead>
          <tbody>
            {boundaries.map((_, boundaryIdx) => {
              const colTotal = counts.reduce((sum, row) => sum + row[boundaryIdx], 0);
              const rowDv = hasVerdictData
                ? dominantVerdict(
                    claims.map((_, ci) => cellVerdicts?.[ci]?.[boundaryIdx]),
                    claims.map((_, ci) => counts[ci][boundaryIdx]),
                    claimDisplayLabels,
                  )
                : null;
              return (
                <tr key={boundaries[boundaryIdx]}>
                  <th
                    className={`${styles.rowHeader} ${onNavigate ? styles.clickableHeader : ""}`}
                    style={rowDv?.style}
                    title={fullLabels[boundaryIdx]}
                    onClick={onNavigate ? () => onNavigate(boundaries[boundaryIdx]) : undefined}
                  >
                    {shortLabels[boundaryIdx]}
                  </th>
                  {counts.map((row, claimIdx) => {
                    const count = row[boundaryIdx];
                    const cv = cellVerdicts?.[claimIdx]?.[boundaryIdx];
                    return (
                      <td
                        key={`${boundaryIdx}-${claimIdx}`}
                        className={`${cv && count > 0 ? "" : fallbackCellClass(count)} ${onNavigate && count > 0 ? styles.clickableCell : ""}`}
                        style={count > 0 ? verdictStyle(cv) : undefined}
                        onClick={onNavigate && count > 0 ? () => onNavigate(claims[claimIdx]) : undefined}
                      >
                        {count > 0 ? count : "—"}
                      </td>
                    );
                  })}
                  <td className={styles.totalCell} style={rowDv?.style} title={rowDv?.tooltip}>
                    {colTotal}
                  </td>
                </tr>
              );
            })}
            <tr className={styles.totalRow}>
              <th className={styles.rowHeader} style={overallVerdict ? verdictStyle(overallVerdict) : undefined}>Total</th>
              {counts.map((row, claimIdx) => {
                const rowTotal = row.reduce((sum, count) => sum + count, 0);
                const cv = claimLevelVerdicts?.[claimIdx];
                let totalStyle: React.CSSProperties | undefined;
                let totalTooltip: string | undefined;
                if (cv) {
                  const verdict = percentageToClaimVerdict(cv.pct, cv.conf);
                  totalStyle = verdictStyle(cv);
                  totalTooltip = `Claim verdict: ${verdict} ${Math.round(cv.pct)}%`;
                } else if (hasVerdictData) {
                  const dv = dominantVerdict(
                    boundaries.map((_, bi) => cellVerdicts?.[claimIdx]?.[bi]),
                    boundaries.map((_, bi) => counts[claimIdx][bi]),
                    shortLabels,
                  );
                  totalStyle = dv.style;
                  totalTooltip = dv.tooltip;
                }
                return (
                  <td key={claimIdx} className={styles.totalCell} style={totalStyle} title={totalTooltip}>
                    {rowTotal}
                  </td>
                );
              })}
              <td className={styles.grandTotal} style={overallVerdict ? verdictStyle(overallVerdict) : undefined}>
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
