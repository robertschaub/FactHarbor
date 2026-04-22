"use client";

import type {
  AtomicClaim,
  ClaimSelectionRecommendationAssessment,
} from "@/lib/analyzer/types";
import styles from "./page.module.css";

type AssessmentMap = Record<string, ClaimSelectionRecommendationAssessment | undefined>;

type ClaimSelectionPanelProps = {
  claims: AtomicClaim[];
  assessmentsByClaimId: AssessmentMap;
  recommendedClaimIds: Set<string>;
  selectedClaimIds: Set<string>;
  selectionDisabled?: boolean;
  selectionLimitReached?: boolean;
  onToggleClaim: (claimId: string) => void;
};

function formatTriageLabel(
  triageLabel: ClaimSelectionRecommendationAssessment["triageLabel"],
): string {
  switch (triageLabel) {
    case "fact_check_worthy":
      return "Fact-check worthy";
    case "fact_non_check_worthy":
      return "Fact non-check worthy";
    case "opinion_or_subjective":
      return "Opinion / subjective";
    case "unclear":
      return "Unclear";
  }
}

function triageBadgeClass(
  triageLabel: ClaimSelectionRecommendationAssessment["triageLabel"],
): string {
  switch (triageLabel) {
    case "fact_check_worthy":
      return styles.triageGood;
    case "fact_non_check_worthy":
      return styles.triageNeutral;
    case "opinion_or_subjective":
      return styles.triageMuted;
    case "unclear":
      return styles.triageCaution;
  }
}

export function ClaimSelectionPanel({
  claims,
  assessmentsByClaimId,
  recommendedClaimIds,
  selectedClaimIds,
  selectionDisabled = false,
  selectionLimitReached = false,
  onToggleClaim,
}: ClaimSelectionPanelProps) {
  return (
    <div className={styles.claimList}>
      {claims.map((claim, index) => {
        const assessment = assessmentsByClaimId[claim.id];
        const isRecommended = recommendedClaimIds.has(claim.id);
        const isSelected = selectedClaimIds.has(claim.id);
        const disableCheckbox = selectionDisabled || (!isSelected && selectionLimitReached);

        return (
          <label
            key={claim.id}
            className={`${styles.claimCard} ${isSelected ? styles.claimCardSelected : ""}`}
          >
            <div className={styles.claimCardHeader}>
              <div className={styles.claimCheckboxWrap}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disableCheckbox}
                  onChange={() => onToggleClaim(claim.id)}
                />
              </div>
              <div className={styles.claimMeta}>
                <div className={styles.claimMetaTop}>
                  <span className={styles.claimRank}>#{index + 1}</span>
                  <span className={styles.claimId}>{claim.id}</span>
                  {isRecommended && <span className={styles.recommendedBadge}>Recommended</span>}
                  {assessment && (
                    <span className={`${styles.triageBadge} ${triageBadgeClass(assessment.triageLabel)}`}>
                      {formatTriageLabel(assessment.triageLabel)}
                    </span>
                  )}
                </div>
                <div className={styles.claimStatement}>{claim.statement}</div>
              </div>
            </div>

            {(assessment || claim.thesisRelevance || claim.checkWorthiness) && (
              <div className={styles.claimSignals}>
                {claim.thesisRelevance && (
                  <span className={styles.signalPill}>Thesis: {claim.thesisRelevance}</span>
                )}
                <span className={styles.signalPill}>Check-worthiness: {claim.checkWorthiness}</span>
                {assessment && (
                  <>
                    <span className={styles.signalPill}>
                      Directness: {assessment.thesisDirectness}
                    </span>
                    <span className={styles.signalPill}>
                      Evidence yield: {assessment.expectedEvidenceYield}
                    </span>
                    {assessment.coversDistinctRelevantDimension && (
                      <span className={styles.signalPill}>Distinct dimension</span>
                    )}
                  </>
                )}
              </div>
            )}

            {assessment?.recommendationRationale && (
              <div className={styles.claimRationale}>{assessment.recommendationRationale}</div>
            )}
          </label>
        );
      })}
    </div>
  );
}
