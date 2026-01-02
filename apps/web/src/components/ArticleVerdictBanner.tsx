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
import css from "./ArticleVerdictBanner.module.css";
import commonStyles from "../styles/common.module.css";

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
  const verdictClasses = getVerdictClasses(articleAnalysis.articleVerdict);
  const { claimPattern } = articleAnalysis;

  // Calculate simple average for comparison
  const simpleAveragePercent = claimPattern.total > 0
    ? Math.round((claimPattern.supported / claimPattern.total) * 100)
    : 0;

  return (
    <div className={`${css.container} ${verdictClasses.border}`}>
      {/* Main Verdict */}
      <div className={css.mainSection}>
        <div className={css.verdictRow}>
          <span className={css.verdictLabel}>Article Verdict</span>
          <span className={`${css.verdictBadge} ${verdictClasses.verdict}`}>
            {getVerdictEmoji(articleAnalysis.articleVerdict)} {articleAnalysis.articleVerdict}
          </span>
          <span className={css.confidence}>
            {articleAnalysis.articleConfidence}% confidence
          </span>
        </div>

        <div className={css.thesisRow}>
          <span className={css.thesisLabel}>Main Thesis:</span>
          <span className={css.thesisText}>{articleAnalysis.articleThesis}</span>
        </div>

        <div className={css.supportedRow}>
          <span className={css.supportedLabel}>Thesis Supported:</span>
          <span className={articleAnalysis.thesisSupported ? css.supportedYes : css.supportedNo}>
            {articleAnalysis.thesisSupported ? "✓ Yes" : "✗ No"}
          </span>
        </div>
      </div>

      {/* Claim Pattern Summary */}
      <div className={css.patternSection}>
        <div className={css.patternTitle}>Claim Analysis</div>
        <div className={css.patternGrid}>
          <div className={css.patternItem}>
            <span className={css.patternNumber}>{claimPattern.total}</span>
            <span className={css.patternLabel}>Total Claims</span>
          </div>
          <div className={css.patternItem}>
            <span className={`${css.patternNumber} ${css.patternNumberSupported}`}>
              {claimPattern.supported}
            </span>
            <span className={css.patternLabel}>Supported</span>
          </div>
          <div className={css.patternItem}>
            <span className={`${css.patternNumber} ${css.patternNumberUncertain}`}>
              {claimPattern.uncertain}
            </span>
            <span className={css.patternLabel}>Uncertain</span>
          </div>
          <div className={css.patternItem}>
            <span className={`${css.patternNumber} ${css.patternNumberRefuted}`}>
              {claimPattern.refuted}
            </span>
            <span className={css.patternLabel}>Refuted</span>
          </div>
        </div>

        {/* Central Claims Highlight */}
        <div className={css.centralClaimsRow}>
          <span>🔑 Central claims supported: </span>
          <strong>
            {claimPattern.centralClaimsSupported}/{claimPattern.centralClaimsTotal}
          </strong>
        </div>
      </div>

      {/* Warning Banner: Verdict differs from average */}
      {articleAnalysis.verdictDiffersFromClaimAverage && (
        <div className={css.warningBanner}>
          <div className={css.warningHeader}>
            ⚠️ Article Verdict Differs from Claim Average
          </div>
          <div>
            <div className={css.comparisonRow}>
              <span>Simple claim average: </span>
              <span className={css.averageValue}>
                {simpleAveragePercent}% supported
              </span>
            </div>
            <div className={css.comparisonRow}>
              <span>Article verdict: </span>
              <span className={`${css.verdictValue} ${verdictClasses.color}`}>
                {articleAnalysis.articleVerdict}
              </span>
            </div>
            {articleAnalysis.verdictDifferenceReason && (
              <div className={css.reasonBox}>
                <strong>Why?</strong> {articleAnalysis.verdictDifferenceReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logical Fallacies */}
      {articleAnalysis.logicalFallacies.length > 0 && (
        <div className={css.fallaciesSection}>
          <div className={css.fallaciesHeader}>
            🚨 Logical Issues Detected
          </div>
          {articleAnalysis.logicalFallacies.map((fallacy, i) => (
            <div key={i} className={css.fallacyItem}>
              <div className={css.fallacyType}>{fallacy.type}</div>
              <div className={css.fallacyDescription}>{fallacy.description}</div>
              <div className={css.fallacyAffected}>
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

function getVerdictClasses(verdict: string): { verdict: string; border: string; color: string } {
  switch (verdict) {
    case "CREDIBLE":
      return { verdict: commonStyles.verdictCredible, border: commonStyles.borderCredible, color: commonStyles.colorCredible };
    case "MOSTLY-CREDIBLE":
      return { verdict: commonStyles.verdictMostlyCredible, border: commonStyles.borderMostlyCredible, color: commonStyles.colorMostlyCredible };
    case "MISLEADING":
      return { verdict: commonStyles.verdictMisleading, border: commonStyles.borderMisleading, color: commonStyles.colorMisleading };
    case "FALSE":
      return { verdict: commonStyles.verdictFalse, border: commonStyles.borderFalse, color: commonStyles.colorFalse };
    default:
      return { verdict: commonStyles.verdictDefault, border: commonStyles.borderDefault, color: commonStyles.colorDefault };
  }
}

export default ArticleVerdictBanner;
