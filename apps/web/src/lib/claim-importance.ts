export type ImportanceLevel = "high" | "medium" | "low";
export type ClaimRole = "attribution" | "source" | "timing" | "core" | "unknown";

export type SubClaimImportance = {
  text: string;
  claimRole: ClaimRole;
  harmPotential: ImportanceLevel;
  centrality: ImportanceLevel;
  isCentral: boolean;
};

function clampDown(level: ImportanceLevel, max: ImportanceLevel): ImportanceLevel {
  if (max === "high") return level;
  if (max === "medium") return level === "high" ? "medium" : level;
  return "low";
}

function looksLikeMetaMethodClaim(text: string): boolean {
  const t = (text || "").toLowerCase();

  // NOTE: This is intentionally topic-neutral; it targets *meta* evaluation of methods,
  // not subject-matter claims. Keep patterns small and generic to avoid domain hardcoding.
  const refersToMethod =
    /\b(methodology|framework|analysis (method|approach)|approach|model|study design|data collection|evaluation method)\b/i.test(
      t,
    );
  if (!refersToMethod) return false;

  const isValidityJudgment =
    /\b(valid|invalid|accurate|inaccurate|reliable|unreliable|appropriate|inappropriate|complete|incomplete|biased|unbiased)\b/i.test(
      t,
    );
  return isValidityJudgment;
}

export function normalizeSubClaimImportance<T extends SubClaimImportance>(claim: T): T {
  // Role-based centrality invariants (prompt already says these; we enforce them deterministically).
  if (claim.claimRole !== "core") {
    claim.centrality = "low";
    claim.isCentral = false;
    // If it's not a substantive/core claim, cap harmPotential; wrong attribution/source/timing is usually indirect harm.
    claim.harmPotential = clampDown(claim.harmPotential, "medium");
    return claim;
  }

  // Meta-methodology validity claims are not central to the subject matter.
  if (looksLikeMetaMethodClaim(claim.text)) {
    claim.centrality = "low";
  }

  // Consistent central flag derivation: based on centrality alone.
  // harmPotential affects risk tier/warnings, not centrality.
  claim.isCentral = claim.centrality === "high";
  return claim;
}

export function normalizeSubClaimsImportance<T extends SubClaimImportance>(claims: T[]): T[] {
  // First pass: enforce per-claim invariants.
  for (const c of claims) normalizeSubClaimImportance(c);

  // Second pass: cap "high" centrality to reduce over-centrality drift.
  // The prompt expects few central claims; we enforce a deterministic cap:
  // - Per contextId (if present): keep at most 2 high-central core claims
  // - If contextId is missing/empty: treat as one global group
  const harmScore = (lvl: ImportanceLevel) => (lvl === "high" ? 3 : lvl === "medium" ? 2 : 1);

  const groups = new Map<string, { idx: number; claim: T }[]>();
  for (let i = 0; i < claims.length; i++) {
    const c = claims[i];
    const ctxRaw = (c as any)?.contextId;
    const ctxId = typeof ctxRaw === "string" && ctxRaw.trim() ? ctxRaw.trim() : "__global__";
    const arr = groups.get(ctxId) ?? [];
    arr.push({ idx: i, claim: c });
    groups.set(ctxId, arr);
  }

  for (const [, entries] of groups) {
    const highs = entries.filter((e) => e.claim.claimRole === "core" && e.claim.centrality === "high");
    if (highs.length <= 2) continue;

    // Keep the two most impactful claims as central: prefer higher harmPotential,
    // then keep earlier claims to remain stable/deterministic.
    highs.sort((a, b) => {
      const hs = harmScore(b.claim.harmPotential) - harmScore(a.claim.harmPotential);
      if (hs !== 0) return hs;
      return a.idx - b.idx;
    });

    const keep = new Set(highs.slice(0, 2).map((e) => e.idx));
    for (const e of highs.slice(2)) {
      e.claim.centrality = "medium";
      e.claim.isCentral = false;
    }

    // Re-derive isCentral for kept highs to ensure consistency.
    for (const e of highs.slice(0, 2)) {
      if (keep.has(e.idx)) e.claim.isCentral = true;
    }
  }

  return claims;
}

