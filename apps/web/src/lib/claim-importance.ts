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

  // Consistent central flag derivation (central only when both high).
  claim.isCentral = claim.harmPotential === "high" && claim.centrality === "high";
  return claim;
}

export function normalizeSubClaimsImportance<T extends SubClaimImportance>(claims: T[]): T[] {
  for (const c of claims) normalizeSubClaimImportance(c);
  return claims;
}

