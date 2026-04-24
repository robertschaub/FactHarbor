import { scoreDateRecency, scoreTokenOverlap, tokenize } from "../utils/scoring.mjs";
import { normalizeRoleKey, resolveRoleEntry } from "../sources/roles.mjs";

function collectMatchedTokens(queryTokens, ...fragments) {
  const candidateTokens = new Set(tokenize(fragments.filter(Boolean).join(" ")));
  return queryTokens.filter((token) => candidateTokens.has(token));
}

function buildReasons(queryTokens, entry, roleFilterKey) {
  const reasons = [];
  const topicMatches = collectMatchedTokens(queryTokens, (entry.topics ?? []).join(" "));
  const summaryMatches = collectMatchedTokens(queryTokens, entry.summary);
  const fileMatches = collectMatchedTokens(
    queryTokens,
    entry.file,
    ...(entry.files_touched ?? []),
  );

  if (topicMatches.length > 0) {
    reasons.push(`topics: ${topicMatches.join(", ")}`);
  }

  if (summaryMatches.length > 0) {
    reasons.push(`summary: ${summaryMatches.join(", ")}`);
  }

  if (fileMatches.length > 0) {
    reasons.push(`paths: ${fileMatches.join(", ")}`);
  }

  if (
    roleFilterKey &&
    (entry.roles ?? []).some((candidateRole) => normalizeRoleKey(candidateRole) === roleFilterKey)
  ) {
    reasons.push(`role: ${roleFilterKey}`);
  }

  if (reasons.length === 0 && entry.date) {
    reasons.push(`recent: ${entry.date}`);
  }

  return reasons;
}

export function searchHandoffs(knowledgeContext, { query, role, after, limit = 10 } = {}) {
  const queryTokens = tokenize(query);
  const roleEntries = knowledgeContext.data?.roles?.entries ?? [];
  const normalizedRole = role
    ? (resolveRoleEntry(roleEntries, role)?.canonicalKey ?? normalizeRoleKey(role))
    : null;
  const entries = knowledgeContext.data?.handoffs?.entries ?? [];

  return entries
    .filter((entry) => {
      if (
        normalizedRole &&
        !(entry.roles ?? []).some((candidateRole) => normalizeRoleKey(candidateRole) === normalizedRole)
      ) {
        return false;
      }

      if (after && entry.date < after) {
        return false;
      }

      return true;
    })
    .map((entry) => {
      const score =
        scoreTokenOverlap(queryTokens, entry.file) * 1.4 +
        scoreTokenOverlap(queryTokens, (entry.topics ?? []).join(" ")) * 1.8 +
        scoreTokenOverlap(queryTokens, (entry.files_touched ?? []).join(" ")) * 1.2 +
        scoreTokenOverlap(queryTokens, entry.summary) * 1.3 +
        scoreTokenOverlap(queryTokens, (entry.roles ?? []).join(" ")) +
        scoreDateRecency(entry.date) +
        (normalizedRole &&
        (entry.roles ?? []).some((candidateRole) => normalizeRoleKey(candidateRole) === normalizedRole)
          ? 5
          : 0);

      return {
        ...entry,
        score,
        reasons: buildReasons(queryTokens, entry, normalizedRole),
      };
    })
    .filter((entry) => entry.score > 0 || queryTokens.length === 0)
    .sort((left, right) => right.score - left.score || right.date.localeCompare(left.date))
    .slice(0, limit);
}
