import React from "react";
import styles from "../page.module.css";

type ClaimsGroupedByContextProps = {
  claimVerdicts: any[];
  contexts: any[];
  tangentialClaims: any[];
  renderClaim: (claim: any, showCrossContext: boolean) => React.ReactNode;
};

export function ClaimsGroupedByContext({
  claimVerdicts,
  contexts,
  tangentialClaims,
  renderClaim,
}: ClaimsGroupedByContextProps) {
  const claimsByContext = new Map<string, any[]>();
  const tangentialByContext = new Map<string, any[]>();

  const normalizeContextKey = (id: any): string => {
    const raw = String(id || "").trim();
    return raw ? raw : "general";
  };

  for (const cv of claimVerdicts) {
    const key = normalizeContextKey(cv.contextId);
    if (!claimsByContext.has(key)) claimsByContext.set(key, []);
    claimsByContext.get(key)!.push(cv);
  }

  for (const c of tangentialClaims || []) {
    const key = normalizeContextKey(c?.contextId);
    if (!tangentialByContext.has(key)) tangentialByContext.set(key, []);
    tangentialByContext.get(key)!.push(c);
  }

  const contextIds = contexts.map((c: any) => c.id);
  const hasContexts = contextIds.length > 0;
  const groups: Array<{
    id: string;
    title: string;
    claims: any[];
    tangential: any[];
  }> = [];

  const formatContextTitle = (context: any): string => {
    const shortName = String(context?.shortName || "").trim();
    const name = String(context?.name || "").trim();
    if (!shortName && !name) return "General";
    if (!shortName) return `⚖️ ${name}`;
    if (!name) return `⚖️ ${shortName}`;
    if (shortName.toLowerCase() === name.toLowerCase()) return `⚖️ ${name}`;
    return `⚖️ ${shortName}: ${name}`;
  };

  if (hasContexts) {
    for (const context of contexts) {
      const claims = claimsByContext.get(context.id) || [];
      const tangential = tangentialByContext.get(context.id) || [];
      if (claims.length === 0 && tangential.length === 0) continue;
      groups.push({
        id: context.id,
        title: formatContextTitle(context),
        claims,
        tangential,
      });
    }

    // Add any context IDs that appear in claims/tangentials but are not in the contexts list.
    const extraKeys = new Set<string>();
    for (const k of claimsByContext.keys()) extraKeys.add(k);
    for (const k of tangentialByContext.keys()) extraKeys.add(k);
    for (const key of Array.from(extraKeys)) {
      if (key === "general") continue;
      if (contextIds.includes(key)) continue;
      const claims = claimsByContext.get(key) || [];
      const tangential = tangentialByContext.get(key) || [];
      if (claims.length === 0 && tangential.length === 0) continue;
      groups.push({
        id: key,
        title: `Context ${key}`,
        claims,
        tangential,
      });
    }
  } else {
    const claimsByGroup = new Map<string, any[]>();
    for (const cv of claimVerdicts) {
      const contextId = normalizeContextKey(cv.contextId);
      if (!claimsByGroup.has(contextId)) claimsByGroup.set(contextId, []);
      claimsByGroup.get(contextId)!.push(cv);
    }

    for (const [contextId, claims] of claimsByGroup.entries()) {
      const tangential = tangentialByContext.get(contextId) || [];
      if (claims.length === 0 && tangential.length === 0) continue;
      const context = contexts.find((c: any) => c.id === contextId);
      const fallbackTitle = contextId === "general" ? "General" : `Context ${contextId}`;
      groups.push({
        id: contextId,
        title: context ? formatContextTitle(context) : fallbackTitle,
        claims,
        tangential,
      });
    }
  }

  // Ensure a unified General group exists when there are any unscoped claims (direct or tangential).
  const hasGeneral = groups.some((g) => g.id === "general");
  const generalClaims = claimsByContext.get("general") || [];
  const generalTangential = tangentialByContext.get("general") || [];
  if ((generalClaims.length > 0 || generalTangential.length > 0) && !hasGeneral) {
    groups.push({
      id: "general",
      title: "General",
      claims: generalClaims,
      tangential: generalTangential,
    });
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.id} className={styles.contextGroup}>
          <h4 className={styles.contextGroupHeader}>{group.title}</h4>
          {group.claims.map((cv: any) => (
            <React.Fragment key={`${group.id}:${cv.claimId}`}>
              {renderClaim(
                cv,
                hasContexts && (!cv.contextId || group.id === "general")
              )}
            </React.Fragment>
          ))}

          {group.tangential.length > 0 && (
            <details className={styles.tangentialDetails}>
              <summary className={styles.tangentialSummary}>
                📎 Related context (tangential; excluded from verdict) ({group.tangential.length})
              </summary>
              <ul className={styles.tangentialList}>
                {group.tangential.map((c: any) => (
                  <li key={c.id} className={styles.tangentialItem}>
                    <code className={styles.tangentialClaimId}>{c.id}</code> {c.text}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
