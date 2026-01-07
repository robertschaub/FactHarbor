/**
 * ClaimHighlighter Component
 * 
 * Implements UN-17: In-Article Claim Highlighting
 * Shows original text with color-coded claim highlighting:
 * - 🟢 Green: True-side claims
 * - 🟡 Yellow: Unverified/Leaning claims
 * - 🔴 Red: False-side claims
 * 
 * Hover/click on highlighted claims shows verdict details.
 * 
 * @version 2.2.0
 */

import React, { useState, useMemo } from "react";
import styles from "./ClaimHighlighter.module.css";
import { percentageToClaimVerdict } from "@/lib/analyzer/truth-scale";

interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  verdict: number;
  truthPercentage?: number;
  confidence: number;
  riskTier: string;
  reasoning: string;
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
}

interface ClaimHighlighterProps {
  originalText: string;
  claimVerdicts: ClaimVerdict[];
  showHighlights?: boolean;
}

interface TooltipData {
  claim: ClaimVerdict;
  x: number;
  y: number;
}

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 50;
  const normalized = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function getClaimTruthPercentage(claim: ClaimVerdict): number {
  if (typeof claim.truthPercentage === "number") {
    return normalizePercentage(claim.truthPercentage);
  }
  return normalizePercentage(claim.verdict);
}

function getVerdictLabel(verdict: string): string {
  const labels: Record<string, string> = {
    "TRUE": "True",
    "MOSTLY-TRUE": "Mostly True",
    "LEANING-TRUE": "Leaning True",
    "UNVERIFIED": "Unverified",
    "LEANING-FALSE": "Leaning False",
    "MOSTLY-FALSE": "Mostly False",
    "FALSE": "False",
  };
  return labels[verdict] || verdict;
}

export function ClaimHighlighter({ 
  originalText, 
  claimVerdicts,
  showHighlights = true 
}: ClaimHighlighterProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [highlightsEnabled, setHighlightsEnabled] = useState(showHighlights);
  
  // Sort claims by position and build highlighted segments
  const segments = useMemo(() => {
    if (!highlightsEnabled) {
      return [{ type: "text" as const, content: originalText }];
    }
    
    // Filter claims with valid positions
    const positionedClaims = claimVerdicts
      .filter(c => c.startOffset !== undefined && c.endOffset !== undefined)
      .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));
    
    if (positionedClaims.length === 0) {
      return [{ type: "text" as const, content: originalText }];
    }
    
    const result: Array<{ type: "text" | "claim"; content: string; claim?: ClaimVerdict }> = [];
    let lastEnd = 0;
    
    for (const claim of positionedClaims) {
      const start = claim.startOffset!;
      const end = claim.endOffset!;
      
      // Skip if overlapping with previous
      if (start < lastEnd) continue;
      
      // Add text before this claim
      if (start > lastEnd) {
        result.push({
          type: "text",
          content: originalText.slice(lastEnd, start)
        });
      }
      
      // Add the claim
      result.push({
        type: "claim",
        content: originalText.slice(start, end),
        claim
      });
      
      lastEnd = end;
    }
    
    // Add remaining text
    if (lastEnd < originalText.length) {
      result.push({
        type: "text",
        content: originalText.slice(lastEnd)
      });
    }
    
    return result;
  }, [originalText, claimVerdicts, highlightsEnabled]);
  
  const handleClaimHover = (claim: ClaimVerdict, e: React.MouseEvent) => {
    setTooltip({
      claim,
      x: e.clientX,
      y: e.clientY
    });
  };
  
  const handleClaimLeave = () => {
    setTooltip(null);
  };
  
  return (
    <div className={styles.container}>
      {/* Toggle Controls */}
      <div className={styles.controls}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={highlightsEnabled}
            onChange={(e) => setHighlightsEnabled(e.target.checked)}
            className={styles.checkbox}
          />
          Show claim highlighting
        </label>

        {highlightsEnabled && (
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDotGreen}`}></span>
              True
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDotYellow}`}></span>
              Unverified
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDotRed}`}></span>
              False
            </span>
          </div>
        )}
      </div>

      {/* Article Text with Highlights */}
      <div className={styles.textContainer}>
        {segments.map((segment, i) => {
          if (segment.type === "text") {
            return <span key={i}>{segment.content}</span>;
          }

          const claim = segment.claim!;
          const highlightClass = getHighlightClass(claim.highlightColor);

          return (
            <span
              key={i}
              className={`${styles.highlight} ${highlightClass}`}
              onMouseEnter={(e) => handleClaimHover(claim, e)}
              onMouseLeave={handleClaimLeave}
              onClick={(e) => handleClaimHover(claim, e)}
            >
              {segment.content}
              {claim.isCentral && <span className={styles.centralBadge}>🔑</span>}
            </span>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <ClaimTooltip
          claim={tooltip.claim}
          x={tooltip.x}
          y={tooltip.y}
          onClose={() => setTooltip(null)}
        />
      )}
    </div>
  );
}

function getHighlightClass(color: "green" | "yellow" | "red"): string {
  switch (color) {
    case "green": return styles.highlightGreen;
    case "yellow": return styles.highlightYellow;
    case "red": return styles.highlightRed;
  }
}

// Tooltip Component
function ClaimTooltip({ claim, x, y, onClose }: {
  claim: ClaimVerdict;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const verdictClass = getTooltipVerdictClass(claim.highlightColor);
  const truthPercentage = getClaimTruthPercentage(claim);
  const verdictLabel = percentageToClaimVerdict(truthPercentage);

  return (
    <div
      className={styles.tooltip}
      style={{
        left: Math.min(x + 10, window.innerWidth - 320),
        top: y + 10,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.tooltipHeader}>
        <span className={`${styles.tooltipVerdict} ${verdictClass}`}>
          {getVerdictEmoji(verdictLabel)} {getVerdictLabel(verdictLabel)}
        </span>
        <span className={styles.tooltipConfidence}>{claim.confidence}% confidence</span>
      </div>

      {claim.isCentral && (
        <div className={styles.centralIndicator}>
          🔑 Central Claim
        </div>
      )}

      <div className={styles.tooltipClaim}>
        "{claim.claimText}"
      </div>

      <div className={styles.tooltipReasoning}>
        {claim.reasoning}
      </div>

      <div className={styles.tooltipFooter}>
        <span>Risk Tier: {claim.riskTier}</span>
        <span>{claim.claimId}</span>
      </div>
    </div>
  );
}

function getTooltipVerdictClass(color: "green" | "yellow" | "red"): string {
  switch (color) {
    case "green": return styles.tooltipVerdictGreen;
    case "yellow": return styles.tooltipVerdictYellow;
    case "red": return styles.tooltipVerdictRed;
  }
}

function getVerdictEmoji(verdict: string): string {
  switch (verdict) {
    case "TRUE": return "✅";
    case "MOSTLY-TRUE": return "✓";
    case "LEANING-TRUE": return "◐";
    case "UNVERIFIED": return "?";
    case "LEANING-FALSE": return "◔";
    case "MOSTLY-FALSE": return "✗";
    case "FALSE": return "❌";
    default: return "⚪";
  }
}

export default ClaimHighlighter;
