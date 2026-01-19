import React, { useState } from "react";
import type { EvidenceScope } from "@/lib/analyzer/types";
import styles from "./EvidenceScopeTooltip.module.css";

type EvidenceScopeTooltipProps = {
  evidenceScope: EvidenceScope;
  className?: string;
};

const hasScopeData = (scope?: EvidenceScope | null) => {
  if (!scope) return false;
  return Boolean(
    scope.name ||
      scope.methodology ||
      scope.boundaries ||
      scope.geographic ||
      scope.temporal
  );
};

export function EvidenceScopeTooltip({
  evidenceScope,
  className = "",
}: EvidenceScopeTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!hasScopeData(evidenceScope)) return null;

  return (
    <span
      className={`${styles.tooltipWrapper} ${className}`.trim()}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      role="button"
      aria-label="Show evidence scope details"
    >
      <span className={styles.icon} aria-hidden="true">
        i
      </span>
      {isVisible && (
        <div className={styles.tooltip} role="tooltip">
          <div className={styles.tooltipHeader}>Evidence Scope</div>
          <div className={styles.tooltipContent}>
            {evidenceScope.name && (
              <div className={styles.tooltipRow}>
                <strong>Name:</strong> {evidenceScope.name}
              </div>
            )}
            {evidenceScope.methodology && (
              <div className={styles.tooltipRow}>
                <strong>Methodology:</strong> {evidenceScope.methodology}
              </div>
            )}
            {evidenceScope.boundaries && (
              <div className={styles.tooltipRow}>
                <strong>Boundaries:</strong> {evidenceScope.boundaries}
              </div>
            )}
            {evidenceScope.geographic && (
              <div className={styles.tooltipRow}>
                <strong>Geographic:</strong> {evidenceScope.geographic}
              </div>
            )}
            {evidenceScope.temporal && (
              <div className={styles.tooltipRow}>
                <strong>Temporal:</strong> {evidenceScope.temporal}
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
