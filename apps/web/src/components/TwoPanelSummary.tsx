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
import styles from "./TwoPanelSummary.module.css";
import commonStyles from "../styles/common.module.css";
import { percentageToClaimVerdict } from "@/lib/analyzer/truth-scale";

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
      verdict: number;
      truthPercentage: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: string;
    analysisId: string;
  };
}

export function TwoPanelSummary({ articleSummary, factharborAnalysis }: TwoPanelSummaryProps) {
  return (
    <div className={styles.container}>
      {/* Left Panel: Article Summary */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelIcon}>📄</span>
          <h3 className={styles.panelTitle}>What the Article Claims</h3>
        </div>

        <div className={styles.panelContent}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Title</span>
            <span className={styles.fieldValue}>{articleSummary.title}</span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Source</span>
            <span className={styles.fieldValue}>{articleSummary.source}</span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Main Argument</span>
            <p className={styles.fieldValueBlock}>{articleSummary.mainArgument}</p>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Key Findings</span>
            <ul className={styles.findingsList}>
              {articleSummary.keyFindings.map((finding, i) => (
                <li key={i} className={styles.findingItem}>{finding}</li>
              ))}
            </ul>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Conclusion</span>
            <p className={styles.fieldValueBlock}>{articleSummary.conclusion}</p>
          </div>
        </div>
      </div>

      {/* Right Panel: FactHarbor Analysis */}
      <div className={`${styles.panel} ${styles.analysisPanelBorder}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelIcon}>🔍</span>
          <h3 className={styles.panelTitle}>FactHarbor Analysis</h3>
        </div>

        <div className={styles.panelContent}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Source Credibility</span>
            <span className={styles.credibilityBadge}>{factharborAnalysis.sourceCredibility}</span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Claim-by-Claim Verdicts</span>
            <div className={styles.verdictsContainer}>
              {factharborAnalysis.claimVerdicts.map((cv, i) => (
                <div key={i} className={styles.verdictRow}>
                  <span className={styles.claimText}>{cv.claim}</span>
                  <VerdictBadge truthPercentage={cv.truthPercentage ?? cv.verdict} />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Methodology</span>
            <span className={styles.fieldValue}>{factharborAnalysis.methodologyAssessment}</span>
          </div>

          <div className={styles.overallVerdictBox}>
            <span className={styles.overallLabel}>Overall Verdict</span>
            <span className={styles.overallValue}>{factharborAnalysis.overallVerdict}</span>
          </div>

          <div className={styles.analysisIdBox}>
            Analysis ID: {factharborAnalysis.analysisId}
          </div>
        </div>
      </div>
    </div>
  );
}

// Verdict Badge Component
function VerdictBadge({ truthPercentage }: { truthPercentage: number }) {
  const verdictLabel = percentageToClaimVerdict(truthPercentage);
  const verdictClass = getVerdictClass(verdictLabel);
  return (
    <span className={`${styles.verdictBadge} ${verdictClass}`}>
      {verdictLabel} ({truthPercentage}%)
    </span>
  );
}

function getVerdictClass(verdict: string): string {
  switch (verdict) {
    case "TRUE": return commonStyles.verdictCredible;
    case "MOSTLY-TRUE": return commonStyles.verdictMostlyCredible;
    case "LEANING-TRUE": return commonStyles.verdictUncertain;
    case "UNVERIFIED": return commonStyles.verdictUncertain;
    case "LEANING-FALSE": return commonStyles.verdictMisleading;
    case "MOSTLY-FALSE": return commonStyles.verdictRefuted;
    case "FALSE": return commonStyles.verdictFalse;
    default: return commonStyles.verdictDefault;
  }
}

export default TwoPanelSummary;
