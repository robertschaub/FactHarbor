/**
 * ClaimHighlighter Component
 * 
 * Implements UN-17: In-Article Claim Highlighting
 * Shows original text with color-coded claim highlighting:
 * - 🟢 Green: Well-supported claims
 * - 🟡 Yellow: Uncertain/Partially-supported claims  
 * - 🔴 Red: Refuted claims
 * 
 * Hover/click on highlighted claims shows verdict details.
 * 
 * @version 2.2.0
 */

import React, { useState, useMemo } from "react";

interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  verdict: string;
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
    <div style={styles.container}>
      {/* Toggle Controls */}
      <div style={styles.controls}>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={highlightsEnabled}
            onChange={(e) => setHighlightsEnabled(e.target.checked)}
            style={styles.checkbox}
          />
          Show claim highlighting
        </label>
        
        {highlightsEnabled && (
          <div style={styles.legend}>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: COLORS.green.bg }}></span>
              Well-supported
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: COLORS.yellow.bg }}></span>
              Uncertain
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: COLORS.red.bg }}></span>
              Refuted
            </span>
          </div>
        )}
      </div>
      
      {/* Article Text with Highlights */}
      <div style={styles.textContainer}>
        {segments.map((segment, i) => {
          if (segment.type === "text") {
            return <span key={i}>{segment.content}</span>;
          }
          
          const claim = segment.claim!;
          const color = COLORS[claim.highlightColor];
          
          return (
            <span
              key={i}
              style={{
                ...styles.highlight,
                backgroundColor: color.bg,
                borderColor: color.border,
              }}
              onMouseEnter={(e) => handleClaimHover(claim, e)}
              onMouseLeave={handleClaimLeave}
              onClick={(e) => handleClaimHover(claim, e)}
            >
              {segment.content}
              {claim.isCentral && <span style={styles.centralBadge}>🔑</span>}
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

// Tooltip Component
function ClaimTooltip({ claim, x, y, onClose }: { 
  claim: ClaimVerdict; 
  x: number; 
  y: number;
  onClose: () => void;
}) {
  const color = COLORS[claim.highlightColor];
  
  return (
    <div 
      style={{
        ...styles.tooltip,
        left: Math.min(x + 10, window.innerWidth - 320),
        top: y + 10,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={styles.tooltipHeader}>
        <span style={{ ...styles.tooltipVerdict, backgroundColor: color.bg, color: color.text }}>
          {getVerdictEmoji(claim.verdict)} {claim.verdict}
        </span>
        <span style={styles.tooltipConfidence}>{claim.confidence}% confidence</span>
      </div>
      
      {claim.isCentral && (
        <div style={styles.centralIndicator}>
          🔑 Central Claim
        </div>
      )}
      
      <div style={styles.tooltipClaim}>
        "{claim.claimText}"
      </div>
      
      <div style={styles.tooltipReasoning}>
        {claim.reasoning}
      </div>
      
      <div style={styles.tooltipFooter}>
        <span style={styles.riskTier}>Risk Tier: {claim.riskTier}</span>
        <span style={styles.claimId}>{claim.claimId}</span>
      </div>
    </div>
  );
}

function getVerdictEmoji(verdict: string): string {
  switch (verdict) {
    case "WELL-SUPPORTED": return "🟢";
    case "PARTIALLY-SUPPORTED": return "🟡";
    case "UNCERTAIN": return "🟡";
    case "REFUTED": return "🔴";
    default: return "⚪";
  }
}

const COLORS = {
  green: { bg: "#d4edda", border: "#28a745", text: "#155724" },
  yellow: { bg: "#fff3cd", border: "#ffc107", text: "#856404" },
  red: { bg: "#f8d7da", border: "#dc3545", text: "#721c24" },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: "24px",
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    padding: "8px 12px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  checkbox: {
    cursor: "pointer",
  },
  legend: {
    display: "flex",
    gap: "16px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    color: "#666",
  },
  legendDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
  },
  textContainer: {
    padding: "16px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
    lineHeight: 1.8,
    fontSize: "15px",
    whiteSpace: "pre-wrap",
  },
  highlight: {
    padding: "2px 4px",
    borderRadius: "3px",
    borderBottom: "2px solid",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s ease",
  },
  centralBadge: {
    position: "absolute",
    top: "-8px",
    right: "-4px",
    fontSize: "10px",
  },
  tooltip: {
    position: "fixed",
    zIndex: 1000,
    width: "300px",
    padding: "16px",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  tooltipHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  tooltipVerdict: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
  },
  tooltipConfidence: {
    fontSize: "12px",
    color: "#666",
  },
  centralIndicator: {
    padding: "4px 8px",
    backgroundColor: "#e8f4fd",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#0056b3",
    marginBottom: "8px",
  },
  tooltipClaim: {
    fontSize: "14px",
    fontStyle: "italic",
    color: "#333",
    marginBottom: "8px",
    padding: "8px",
    backgroundColor: "#f8f9fa",
    borderRadius: "4px",
  },
  tooltipReasoning: {
    fontSize: "13px",
    color: "#555",
    lineHeight: 1.5,
    marginBottom: "12px",
  },
  tooltipFooter: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#888",
    paddingTop: "8px",
    borderTop: "1px solid #eee",
  },
  riskTier: {},
  claimId: {},
};

export default ClaimHighlighter;
