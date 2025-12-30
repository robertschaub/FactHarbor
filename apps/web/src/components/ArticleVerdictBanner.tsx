/**
 * ArticleVerdictBanner Component
 * 
 * Implements the Article Verdict Problem solution:
 * Shows article-level verdict that may differ from claim average
 * Highlights when article is misleading despite accurate supporting facts
 * 
 * @version 2.2.0
 */

import React from "react";

interface ArticleAnalysis {
  articleThesis: string;
  thesisSupported: boolean;
  logicalFallacies: Array<{
    type: string;
    description: string;
    affectedClaims: string[];
  }>;
  articleVerdict: "CREDIBLE" | "MOSTLY-CREDIBLE" | "MISLEADING" | "FALSE";
  articleConfidence: number;
  verdictDiffersFromClaimAverage: boolean;
  verdictDifferenceReason?: string;
  claimPattern: {
    total: number;
    supported: number;
    uncertain: number;
    refuted: number;
    centralClaimsSupported: number;
    centralClaimsTotal: number;
  };
}

interface ArticleVerdictBannerProps {
  articleAnalysis: ArticleAnalysis;
}

export function ArticleVerdictBanner({ articleAnalysis }: ArticleVerdictBannerProps) {
  const verdictStyle = getVerdictStyle(articleAnalysis.articleVerdict);
  const { claimPattern } = articleAnalysis;
  
  // Calculate simple average for comparison
  const simpleAveragePercent = claimPattern.total > 0
    ? Math.round((claimPattern.supported / claimPattern.total) * 100)
    : 0;
  
  return (
    <div style={{ ...styles.container, borderColor: verdictStyle.border }}>
      {/* Main Verdict */}
      <div style={styles.mainSection}>
        <div style={styles.verdictRow}>
          <span style={styles.verdictLabel}>Article Verdict</span>
          <span style={{ ...styles.verdictBadge, ...verdictStyle }}>
            {getVerdictEmoji(articleAnalysis.articleVerdict)} {articleAnalysis.articleVerdict}
          </span>
          <span style={styles.confidence}>
            {articleAnalysis.articleConfidence}% confidence
          </span>
        </div>
        
        <div style={styles.thesisRow}>
          <span style={styles.thesisLabel}>Main Thesis:</span>
          <span style={styles.thesisText}>{articleAnalysis.articleThesis}</span>
        </div>
        
        <div style={styles.supportedRow}>
          <span style={styles.supportedLabel}>Thesis Supported:</span>
          <span style={articleAnalysis.thesisSupported ? styles.supportedYes : styles.supportedNo}>
            {articleAnalysis.thesisSupported ? "✓ Yes" : "✗ No"}
          </span>
        </div>
      </div>
      
      {/* Claim Pattern Summary */}
      <div style={styles.patternSection}>
        <div style={styles.patternTitle}>Claim Analysis</div>
        <div style={styles.patternGrid}>
          <div style={styles.patternItem}>
            <span style={styles.patternNumber}>{claimPattern.total}</span>
            <span style={styles.patternLabel}>Total Claims</span>
          </div>
          <div style={styles.patternItem}>
            <span style={{ ...styles.patternNumber, color: "#28a745" }}>
              {claimPattern.supported}
            </span>
            <span style={styles.patternLabel}>Supported</span>
          </div>
          <div style={styles.patternItem}>
            <span style={{ ...styles.patternNumber, color: "#ffc107" }}>
              {claimPattern.uncertain}
            </span>
            <span style={styles.patternLabel}>Uncertain</span>
          </div>
          <div style={styles.patternItem}>
            <span style={{ ...styles.patternNumber, color: "#dc3545" }}>
              {claimPattern.refuted}
            </span>
            <span style={styles.patternLabel}>Refuted</span>
          </div>
        </div>
        
        {/* Central Claims Highlight */}
        <div style={styles.centralClaimsRow}>
          <span>🔑 Central claims supported: </span>
          <strong>
            {claimPattern.centralClaimsSupported}/{claimPattern.centralClaimsTotal}
          </strong>
        </div>
      </div>
      
      {/* Warning Banner: Verdict differs from average */}
      {articleAnalysis.verdictDiffersFromClaimAverage && (
        <div style={styles.warningBanner}>
          <div style={styles.warningHeader}>
            ⚠️ Article Verdict Differs from Claim Average
          </div>
          <div style={styles.warningContent}>
            <div style={styles.comparisonRow}>
              <span>Simple claim average: </span>
              <span style={styles.averageValue}>
                {simpleAveragePercent}% supported
              </span>
            </div>
            <div style={styles.comparisonRow}>
              <span>Article verdict: </span>
              <span style={{ ...styles.verdictValue, color: verdictStyle.color }}>
                {articleAnalysis.articleVerdict}
              </span>
            </div>
            {articleAnalysis.verdictDifferenceReason && (
              <div style={styles.reasonBox}>
                <strong>Why?</strong> {articleAnalysis.verdictDifferenceReason}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Logical Fallacies */}
      {articleAnalysis.logicalFallacies.length > 0 && (
        <div style={styles.fallaciesSection}>
          <div style={styles.fallaciesHeader}>
            🚨 Logical Issues Detected
          </div>
          {articleAnalysis.logicalFallacies.map((fallacy, i) => (
            <div key={i} style={styles.fallacyItem}>
              <div style={styles.fallacyType}>{fallacy.type}</div>
              <div style={styles.fallacyDescription}>{fallacy.description}</div>
              <div style={styles.fallacyAffected}>
                Affects: {fallacy.affectedClaims.join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getVerdictEmoji(verdict: string): string {
  switch (verdict) {
    case "CREDIBLE": return "✅";
    case "MOSTLY-CREDIBLE": return "🔵";
    case "MISLEADING": return "⚠️";
    case "FALSE": return "❌";
    default: return "❓";
  }
}

function getVerdictStyle(verdict: string): React.CSSProperties & { border: string; color: string } {
  switch (verdict) {
    case "CREDIBLE":
      return { backgroundColor: "#d4edda", color: "#155724", border: "#28a745" };
    case "MOSTLY-CREDIBLE":
      return { backgroundColor: "#d1ecf1", color: "#0c5460", border: "#17a2b8" };
    case "MISLEADING":
      return { backgroundColor: "#fff3cd", color: "#856404", border: "#ffc107" };
    case "FALSE":
      return { backgroundColor: "#f8d7da", color: "#721c24", border: "#dc3545" };
    default:
      return { backgroundColor: "#e9ecef", color: "#495057", border: "#6c757d" };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: "2px solid",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "24px",
    backgroundColor: "#fff",
  },
  mainSection: {
    padding: "20px",
  },
  verdictRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  verdictLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#666",
    textTransform: "uppercase",
  },
  verdictBadge: {
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "18px",
    fontWeight: 700,
  },
  confidence: {
    fontSize: "14px",
    color: "#666",
  },
  thesisRow: {
    marginBottom: "8px",
  },
  thesisLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#666",
    marginRight: "8px",
  },
  thesisText: {
    fontSize: "15px",
    color: "#333",
  },
  supportedRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  supportedLabel: {
    fontSize: "13px",
    color: "#666",
  },
  supportedYes: {
    color: "#28a745",
    fontWeight: 600,
  },
  supportedNo: {
    color: "#dc3545",
    fontWeight: 600,
  },
  patternSection: {
    padding: "16px 20px",
    backgroundColor: "#f8f9fa",
    borderTop: "1px solid #eee",
  },
  patternTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: "12px",
  },
  patternGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginBottom: "12px",
  },
  patternItem: {
    textAlign: "center",
  },
  patternNumber: {
    display: "block",
    fontSize: "24px",
    fontWeight: 700,
    color: "#333",
  },
  patternLabel: {
    fontSize: "11px",
    color: "#888",
    textTransform: "uppercase",
  },
  centralClaimsRow: {
    fontSize: "14px",
    color: "#555",
    textAlign: "center",
    paddingTop: "8px",
    borderTop: "1px solid #ddd",
  },
  warningBanner: {
    backgroundColor: "#fff8e1",
    borderTop: "1px solid #ffe082",
    padding: "16px 20px",
  },
  warningHeader: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#f57c00",
    marginBottom: "12px",
  },
  warningContent: {},
  comparisonRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#555",
    marginBottom: "4px",
  },
  averageValue: {
    fontWeight: 600,
  },
  verdictValue: {
    fontWeight: 700,
  },
  reasonBox: {
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "6px",
    border: "1px solid #ffe082",
    fontSize: "14px",
    color: "#333",
    lineHeight: 1.5,
  },
  fallaciesSection: {
    backgroundColor: "#fff5f5",
    borderTop: "1px solid #feb2b2",
    padding: "16px 20px",
  },
  fallaciesHeader: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#c53030",
    marginBottom: "12px",
  },
  fallacyItem: {
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "6px",
    border: "1px solid #feb2b2",
    marginBottom: "8px",
  },
  fallacyType: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#c53030",
    marginBottom: "4px",
  },
  fallacyDescription: {
    fontSize: "14px",
    color: "#333",
    marginBottom: "4px",
  },
  fallacyAffected: {
    fontSize: "12px",
    color: "#888",
  },
};

export default ArticleVerdictBanner;
