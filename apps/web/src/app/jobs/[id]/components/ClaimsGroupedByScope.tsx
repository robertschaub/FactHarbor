import React from "react";
import styles from "../page.module.css";

type ClaimsGroupedByScopeProps = {
  claimVerdicts: any[];
  scopes: any[];
  tangentialClaims: any[];
  renderClaim: (claim: any, showCrossScope: boolean) => React.ReactNode;
};

export function ClaimsGroupedByScope({
  claimVerdicts,
  scopes,
  tangentialClaims,
  renderClaim,
}: ClaimsGroupedByScopeProps) {
  const claimsByScope = new Map<string, any[]>();
  const tangentialByScope = new Map<string, any[]>();

  const normalizeScopeKey = (id: any): string => {
    const raw = String(id || "").trim();
    return raw ? raw : "general";
  };

  for (const cv of claimVerdicts) {
    const key = normalizeScopeKey(cv.contextId ?? cv.relatedProceedingId);
    if (!claimsByScope.has(key)) claimsByScope.set(key, []);
    claimsByScope.get(key)!.push(cv);
  }

  for (const c of tangentialClaims || []) {
    const key = normalizeScopeKey(c?.contextId ?? c?.relatedProceedingId);
    if (!tangentialByScope.has(key)) tangentialByScope.set(key, []);
    tangentialByScope.get(key)!.push(c);
  }

  const scopeIds = scopes.map((s: any) => s.id);
  const hasScopes = scopeIds.length > 0;
  const groups: Array<{
    id: string;
    title: string;
    claims: any[];
    tangential: any[];
  }> = [];

  const formatScopeTitle = (scope: any): string => {
    const shortName = String(scope?.shortName || "").trim();
    const name = String(scope?.name || "").trim();
    if (!shortName && !name) return "General";
    if (!shortName) return `⚖️ ${name}`;
    if (!name) return `⚖️ ${shortName}`;
    if (shortName.toLowerCase() === name.toLowerCase()) return `⚖️ ${name}`;
    return `⚖️ ${shortName}: ${name}`;
  };

  if (hasScopes) {
    for (const scope of scopes) {
      const claims = claimsByScope.get(scope.id) || [];
      const tangential = tangentialByScope.get(scope.id) || [];
      if (claims.length === 0 && tangential.length === 0) continue;
      groups.push({
        id: scope.id,
        title: formatScopeTitle(scope),
        claims,
        tangential,
      });
    }

    // Add any scope IDs that appear in claims/tangentials but are not in the scopes list.
    const extraKeys = new Set<string>();
    for (const k of claimsByScope.keys()) extraKeys.add(k);
    for (const k of tangentialByScope.keys()) extraKeys.add(k);
    for (const key of Array.from(extraKeys)) {
      if (key === "general") continue;
      if (scopeIds.includes(key)) continue;
      const claims = claimsByScope.get(key) || [];
      const tangential = tangentialByScope.get(key) || [];
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
      const scopeId = normalizeScopeKey(cv.contextId ?? cv.relatedProceedingId);
      if (!claimsByGroup.has(scopeId)) claimsByGroup.set(scopeId, []);
      claimsByGroup.get(scopeId)!.push(cv);
    }

    for (const [scopeId, claims] of claimsByGroup.entries()) {
      const tangential = tangentialByScope.get(scopeId) || [];
      if (claims.length === 0 && tangential.length === 0) continue;
      const scope = scopes.find((s: any) => s.id === scopeId);
      const fallbackTitle = scopeId === "general" ? "General" : `Context ${scopeId}`;
      groups.push({
        id: scopeId,
        title: scope ? formatScopeTitle(scope) : fallbackTitle,
        claims,
        tangential,
      });
    }
  }

  // Ensure a unified General group exists when there are any unscoped claims (direct or tangential).
  const hasGeneral = groups.some((g) => g.id === "general");
  const generalClaims = claimsByScope.get("general") || [];
  const generalTangential = tangentialByScope.get("general") || [];
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
        <div key={group.id} className={styles.scopeGroup}>
          <h4 className={styles.scopeGroupHeader}>{group.title}</h4>
          {group.claims.map((cv: any) => (
            <React.Fragment key={`${group.id}:${cv.claimId}`}>
              {renderClaim(
                cv,
                hasScopes && (!cv.contextId && !cv.relatedProceedingId || group.id === "general")
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
