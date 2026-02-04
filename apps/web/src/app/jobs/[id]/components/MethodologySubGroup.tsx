import { useState } from "react";
import styles from "./MethodologySubGroup.module.css";
import type { MethodologyGroup } from "../utils/methodologyGrouping";

type MethodologySubGroupProps = {
  group: MethodologyGroup;
  renderEvidenceItem: (evidenceItem: any) => React.ReactNode;
  defaultExpanded?: boolean;
};

export function MethodologySubGroup({
  group,
  renderEvidenceItem,
  defaultExpanded = true,
}: MethodologySubGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <span className={styles.icon} aria-hidden="true">
          {group.icon}
        </span>
        <span className={styles.title}>{group.label}</span>
        <span className={styles.count}>{group.evidenceItems.length}</span>
        <span
          className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>
      {isExpanded && (
        <div className={styles.content}>
          {group.evidenceItems.map((evidenceItem) => (
            <div key={evidenceItem.id} className={styles.evidenceItem}>
              {renderEvidenceItem(evidenceItem)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
