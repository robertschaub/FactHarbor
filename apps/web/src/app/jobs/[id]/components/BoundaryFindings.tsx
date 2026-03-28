/**
 * BoundaryFindings Component
 *
 * Displays inline boundary findings within claim verdict cards for the
 * ClaimAssessmentBoundary pipeline. Shows per-boundary evidence breakdowns when
 * multiple methodologies yield different conclusions about the same claim.
 *
 * Features:
 * - Inline display (NOT separate tabs like AnalysisContexts)
 * - Direction icons: ✓ supports, ✗ contradicts, ⚖ mixed/neutral
 * - Compact metadata with hover tooltips for full EvidenceScope details
 * - Suppressed when boundaries.length ≤ 2 per §18 Q10
 *
 * @since ClaimAssessmentBoundary pipeline v1
 * @see Docs/WIP/ClaimAssessmentBoundary_Pipeline_Architecture_2026-02-15.md §18 Q9/Q10
 */

import React from "react";
import { getConfidenceTierLabel } from "@/lib/analyzer/truth-scale";
import { getBoundaryDescriptionSegments } from "@/lib/claim-boundary-display";
import styles from "../page.module.css";

type BoundaryFinding = {
  boundaryId: string;
  boundaryName: string;
  truthPercentage: number;       // 0-100
  confidence: number;            // 0-100
  evidenceDirection: "supports" | "contradicts" | "mixed" | "neutral";
  evidenceCount: number;
};

type ClaimAssessmentBoundary = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  methodology?: string;
  boundaries?: string;
  geographic?: string;
  temporal?: string;
  constituentScopes: any[];      // EvidenceScope[]
  internalCoherence: number;
  evidenceCount: number;
};

type BoundaryFindingsProps = {
  boundaryFindings: BoundaryFinding[];
  claimBoundaries: ClaimAssessmentBoundary[];
  totalBoundaryCount: number;    // From result.claimBoundaries.length
  onNavigate?: (refId: string) => void; // Cross-navigation callback
};

/**
 * Get direction icon and label for a boundary finding.
 */
function getDirectionDisplay(direction: BoundaryFinding["evidenceDirection"]): {
  icon: string;
  label: string;
  color: string;
  bg: string;
} {
  switch (direction) {
    case "supports":
      return { icon: "✓", label: "Supports", color: "#166534", bg: "#dcfce7" };
    case "contradicts":
      return { icon: "✗", label: "Refutes", color: "#c62828", bg: "#ffcdd2" };
    case "mixed":
      return { icon: "⚖", label: "Mixed", color: "#5d534a", bg: "#f5f0eb" };
    case "neutral":
      return { icon: "⚖", label: "Neutral", color: "#616161", bg: "#f5f5f5" };
  }
}

/**
 * Format temporal range for compact display.
 */
function formatTemporalRange(boundary: ClaimAssessmentBoundary): string {
  if (!boundary.temporal) return "";
  // Extract year range if possible (e.g., "2018-2024" from "Studies from 2018-2024")
  const match = boundary.temporal.match(/(\d{4})\s*[-–—]\s*(\d{4})/);
  if (match) return `${match[1]}-${match[2]}`;
  // Look for single year mentions
  const yearMatch = boundary.temporal.match(/\d{4}/g);
  if (yearMatch && yearMatch.length >= 2) {
    return `${yearMatch[0]}-${yearMatch[yearMatch.length - 1]}`;
  }
  return boundary.temporal.substring(0, 20); // Fallback: truncate
}

/**
 * BoundaryFindings component.
 *
 * Displays inline boundary findings within a claim verdict card.
 * Suppressed when totalBoundaryCount ≤ 2 per §18 Q10.
 */
export function BoundaryFindings({
  boundaryFindings,
  claimBoundaries,
  totalBoundaryCount,
  onNavigate,
}: BoundaryFindingsProps) {
  // Suppress boundary display when ≤ 2 boundaries (§18 Q10)
  if (totalBoundaryCount <= 2) {
    return null;
  }

  // No boundary findings for this claim
  if (!boundaryFindings || boundaryFindings.length === 0) {
    return null;
  }

  return (
    <div className={styles.boundaryFindingsSection}>
      <div className={styles.boundaryFindingsHeader}>
        Evidence by methodology
      </div>
      <div className={styles.boundaryFindingsList}>
        {boundaryFindings.map((finding) => {
          const boundary = claimBoundaries.find((b) => b.id === finding.boundaryId);
          if (!boundary) return null; // Shouldn't happen, but guard against missing boundary

          const dirDisplay = getDirectionDisplay(finding.evidenceDirection);
          const temporalRange = formatTemporalRange(boundary);
          const cleanedDescription = getBoundaryDescriptionSegments(boundary.description).join(" | ");

          // Build tooltip text for the row
          const tooltipParts: string[] = [];
          if (cleanedDescription) tooltipParts.push(cleanedDescription);
          if (boundary.methodology) tooltipParts.push(`Methodology: ${boundary.methodology}`);
          if (boundary.geographic) tooltipParts.push(`Geographic: ${boundary.geographic}`);
          if (boundary.temporal) tooltipParts.push(`Temporal: ${boundary.temporal}`);
          if (boundary.constituentScopes.length > 0) {
            tooltipParts.push(`Scopes: ${boundary.constituentScopes.length}`);
          }
          const rowTooltip = tooltipParts.join(" | ");

          return (
            <div
              key={finding.boundaryId}
              className={styles.boundaryFindingRow}
              id={`nav-bf-${finding.boundaryId}`}
              title={rowTooltip}
            >
              {/* Direction icon + boundary name */}
              <div className={styles.boundaryFindingName}>
                <span
                  className={styles.boundaryFindingIcon}
                  style={{ color: dirDisplay.color }}
                  title={dirDisplay.label}
                >
                  {dirDisplay.icon}
                </span>
                {onNavigate ? (
                  <button
                    className={styles.navLink}
                    onClick={() => onNavigate(finding.boundaryId)}
                    title={`Go to ${boundary.shortName || boundary.name} in legend`}
                    style={{ color: dirDisplay.color, textDecoration: "underline dotted", background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer", fontWeight: 600 }}
                  >
                    {boundary.shortName || boundary.name}
                  </button>
                ) : (
                  <span className={styles.boundaryNameText}>
                    {boundary.shortName || boundary.name}
                  </span>
                )}
              </div>

              {/* Compact inline metadata (evidence count + temporal range) */}
              <div className={styles.boundaryFindingMeta}>
                {onNavigate ? (
                  <button className={styles.navLink} style={{ fontSize: "inherit", fontWeight: "inherit" }} onClick={() => onNavigate(`BF_${finding.boundaryId}`)} title="Jump to evidence for this boundary">
                    {finding.evidenceCount} items
                  </button>
                ) : (
                  <span className={styles.boundaryMetaItem}>
                    {finding.evidenceCount} items
                  </span>
                )}
                {temporalRange && (
                  <>
                    <span className={styles.boundaryMetaSeparator}>·</span>
                    <span className={styles.boundaryMetaItem}>{temporalRange}</span>
                  </>
                )}
              </div>

              {/* Verdict badge + percentage · confidence */}
              <div className={styles.boundaryFindingVerdict}>
                <span
                  className={styles.boundaryVerdictBadge}
                  style={{ backgroundColor: dirDisplay.bg, color: dirDisplay.color }}
                >
                  {dirDisplay.icon} {dirDisplay.label}
                </span>
                <span className={styles.boundaryVerdictDetail}>
                  {Math.round(finding.truthPercentage)}%
                  <span
                    className={styles.boundaryConfidenceText}
                    title={`${finding.confidence}%`}
                  >
                    {" "}· {getConfidenceTierLabel(finding.confidence)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
