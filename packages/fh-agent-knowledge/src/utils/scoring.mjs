export function tokenize(value) {
  const rawTokens = String(value ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);

  return [...new Set(rawTokens)];
}

export function scoreTokenOverlap(query, ...fragments) {
  const queryTokens = Array.isArray(query) ? query : tokenize(query);
  if (queryTokens.length === 0) {
    return 0;
  }

  const candidateTokens = new Set(tokenize(fragments.filter(Boolean).join(" ")));
  if (candidateTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      matches += 1;
    }
  }

  if (matches === 0) {
    return 0;
  }

  return matches * 10 + matches / queryTokens.length + matches / candidateTokens.size;
}

export function scoreDateRecency(dateString) {
  if (!dateString) {
    return 0;
  }

  const parsed = Date.parse(dateString);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  const ageDays = Math.max(0, (Date.now() - parsed) / (1000 * 60 * 60 * 24));
  return 1 / (1 + ageDays / 30);
}
