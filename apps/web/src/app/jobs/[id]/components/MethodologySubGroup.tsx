import { useState } from "react";
import styles from "./MethodologySubGroup.module.css";
import type { MethodologyGroup } from "../utils/methodologyGrouping";

type MethodologySubGroupProps = {
  group: MethodologyGroup;
  renderFact: (fact: any) => React.ReactNode;
  defaultExpanded?: boolean;
};

export function MethodologySubGroup({
  group,
  renderFact,
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
        <span className={styles.count}>{group.facts.length}</span>
        <span
          className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>
      {isExpanded && (
        <div className={styles.content}>
          {group.facts.map((fact) => (
            <div key={fact.id} className={styles.factItem}>
              {renderFact(fact)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
