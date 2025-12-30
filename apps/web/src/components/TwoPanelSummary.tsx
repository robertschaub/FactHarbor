/**
 * TwoPanelSummary Component
 * 
 * Implements UN-3: Article Summary with FactHarbor Analysis Summary
 * Shows side-by-side comparison of:
 * - Left: What the article claims
 * - Right: FactHarbor's assessment
 * 
 * @version 2.2.0
 */

import React from "react";

interface TwoPanelSummaryProps {
  articleSummary: {
    title: string;
    source: string;
    mainArgument: string;
    keyFindings: string[];
    reasoning: string;
    conclusion: string;
  };
  factharborAnalysis: {
    sourceCredibility: string;
    claimVerdicts: Array<{
      claim: string;
      verdict: string;
      confidence: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: string;
    analysisId: string;
  };
}

export function TwoPanelSummary({ articleSummary, factharborAnalysis }: TwoPanelSummaryProps) {
  return (
    <div style={styles.container}>
      {/* Left Panel: Article Summary */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelIcon}>📄</span>
          <h3 style={styles.panelTitle}>What the Article Claims</h3>
        </div>
        
        <div style={styles.panelContent}>
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Title</span>
            <span style={styles.fieldValue}>{articleSummary.title}</span>
          </div>
          
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Source</span>
            <span style={styles.fieldValue}>{articleSummary.source}</span>
          </div>
          
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Main Argument</span>
            <p style={styles.fieldValueBlock}>{articleSummary.mainArgument}</p>
          </div>
          
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Key Findings</span>
            <ul style={styles.findingsList}>
              {articleSummary.keyFindings.map((finding, i) => (
                <li key={i} style={styles.findingItem}>{finding}</li>
              ))}
            </ul>
          </div>
          
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Conclusion</span>
            <p style={styles.fieldValueBlock}>{articleSummary.conclusion}</p>
          </div>
        </div>
      </div>
      
      {/* Right Panel: FactHarbor Analysis */}
      <div style={{ ...styles.panel, ...styles.analysisPanelBorder }}>
        <div style={styles.panelHeader}>
          <span style={styles.panelIcon}>🔍</span>
          <h3 style={styles.panelTitle}>FactHarbor Analysis</h3>
        </div>
        
        <div style={styles.panelContent}>
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Source Credibility</span>
            <span style={styles.credibilityBadge}>{factharborAnalysis.sourceCredibility}</span>
          </div>
          
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Claim-by-Claim Verdicts</span>
            <div style={styles.verdictsContainer}>
              {factharborAnalysis.claimVerdicts.map((cv, i) => (
                <div key={i} style={styles.verdictRow}>
                  <span style={styles.claimText}>{cv.claim}</span>
                  <VerdictBadge verdict={cv.verdict} confidence={cv.confidence} />
                </div>
              ))}
            </div>
          </div>
          
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Methodology</span>
            <span style={styles.fieldValue}>{factharborAnalysis.methodologyAssessment}</span>
          </div>
          
          <div style={styles.overallVerdictBox}>
            <span style={styles.overallLabel}>Overall Verdict</span>
            <span style={styles.overallValue}>{factharborAnalysis.overallVerdict}</span>
          </div>
          
          <div style={styles.analysisIdBox}>
            Analysis ID: {factharborAnalysis.analysisId}
          </div>
        </div>
      </div>
    </div>
  );
}

// Verdict Badge Component
function VerdictBadge({ verdict, confidence }: { verdict: string; confidence: number }) {
  const color = getVerdictColor(verdict);
  return (
    <span style={{ ...styles.verdictBadge, backgroundColor: color.bg, color: color.text }}>
      {verdict} ({confidence}%)
    </span>
  );
}

function getVerdictColor(verdict: string): { bg: string; text: string } {
  switch (verdict) {
    case "WELL-SUPPORTED": return { bg: "#d4edda", text: "#155724" };
    case "PARTIALLY-SUPPORTED": return { bg: "#fff3cd", text: "#856404" };
    case "UNCERTAIN": return { bg: "#fff3cd", text: "#856404" };
    case "REFUTED": return { bg: "#f8d7da", text: "#721c24" };
    case "CREDIBLE": return { bg: "#d4edda", text: "#155724" };
    case "MOSTLY-CREDIBLE": return { bg: "#d1ecf1", text: "#0c5460" };
    case "MISLEADING": return { bg: "#fff3cd", text: "#856404" };
    case "FALSE": return { bg: "#f8d7da", text: "#721c24" };
    default: return { bg: "#e9ecef", text: "#495057" };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "24px",
  },
  panel: {
    border: "1px solid #ddd",
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  analysisPanelBorder: {
    borderColor: "#007bff",
    borderWidth: "2px",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #ddd",
  },
  panelIcon: {
    fontSize: "20px",
  },
  panelTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
    color: "#333",
  },
  panelContent: {
    padding: "16px",
  },
  field: {
    marginBottom: "16px",
  },
  fieldLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: "4px",
  },
  fieldValue: {
    fontSize: "14px",
    color: "#333",
  },
  fieldValueBlock: {
    fontSize: "14px",
    color: "#333",
    margin: "4px 0 0 0",
    lineHeight: 1.5,
  },
  findingsList: {
    margin: "4px 0 0 0",
    paddingLeft: "20px",
  },
  findingItem: {
    fontSize: "14px",
    color: "#333",
    marginBottom: "4px",
    lineHeight: 1.4,
  },
  credibilityBadge: {
    display: "inline-block",
    padding: "4px 10px",
    backgroundColor: "#e9ecef",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: 500,
  },
  verdictsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
  },
  verdictRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    padding: "8px",
    backgroundColor: "#f8f9fa",
    borderRadius: "6px",
  },
  claimText: {
    fontSize: "13px",
    color: "#333",
    flex: 1,
  },
  verdictBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  overallVerdictBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#f0f7ff",
    borderRadius: "8px",
    marginTop: "16px",
  },
  overallLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#666",
    textTransform: "uppercase",
  },
  overallValue: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#007bff",
    marginTop: "4px",
  },
  analysisIdBox: {
    marginTop: "16px",
    textAlign: "center",
    fontSize: "11px",
    color: "#888",
  },
};

export default TwoPanelSummary;
