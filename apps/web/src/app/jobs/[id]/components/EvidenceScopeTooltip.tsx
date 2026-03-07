import React, { useState, useRef } from "react";
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
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  if (!hasScopeData(evidenceScope)) return null;

  const showTooltip = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipMaxHeight = Math.min(320, viewportHeight * 0.7);
      const tooltipWidth = Math.min(400, Math.max(260, viewportWidth - 16));
      const left = Math.max(8, Math.min(rect.left, viewportWidth - tooltipWidth - 8));
      const top = Math.min(
        Math.max(8, rect.bottom + 4),
        viewportHeight - tooltipMaxHeight - 8
      );
      setTooltipPos({ top, left });
    }
  };

  const hideTooltip = () => setTooltipPos(null);

  return (
    <span
      ref={wrapperRef}
      className={`${styles.tooltipWrapper} ${className}`.trim()}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      tabIndex={0}
      role="button"
      aria-label="Show evidence scope details"
    >
      <span className={styles.icon} aria-hidden="true">
        i
      </span>
      {tooltipPos && (
        <div
          className={styles.tooltip}
          role="tooltip"
          style={{ position: "fixed", top: tooltipPos.top, left: tooltipPos.left, right: "auto" }}
        >
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
