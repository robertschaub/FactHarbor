/**
 * FactHarbor Analyzer - Claim Decomposition Utilities
 *
 * Shared heuristic functions for breaking down complex input text
 * into candidate claim segments. Used by multiple pipelines.
 *
 * @module analyzer/claim-decomposition
 */

/**
 * Normalize claim text for comparison (lowercase, single spaces, trimmed)
 */
export function normalizeClaimText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract candidate claim texts from complex input.
 * Splits on newlines, colons (for labeled sections), sentences, and semicolons.
 * Filters to segments >= 25 chars to avoid fragments.
 *
 * @param input - Raw input text (may be multi-line, multi-sentence)
 * @returns Array of unique candidate claim strings
 */
export function deriveCandidateClaimTexts(input: string): string[] {
  const rawLines = String(input || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates: string[] = [];
  for (const line of rawLines) {
    // Skip lines that are just labels (end with colon)
    if (line.endsWith(":")) continue;

    // Check for "Label: content" pattern
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0 && colonIndex < line.length - 1) {
      const after = line.slice(colonIndex + 1).trim();
      if (after.length >= 25) {
        candidates.push(after);
        continue;
      }
    }
    candidates.push(line);
  }

  // Split on sentence boundaries
  const sentenceCandidates: string[] = [];
  for (const c of candidates) {
    const parts = c
      .split(/[.!?]\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length <= 1) {
      sentenceCandidates.push(c);
    } else {
      sentenceCandidates.push(...parts);
    }
  }

  // Split on semicolons, filter short fragments, normalize whitespace
  const finalCandidates = sentenceCandidates
    .flatMap((c) => c.split(";").map((p) => p.trim()))
    .filter((c) => c.length >= 25)
    .map((c) => c.replace(/\s+/g, " ").trim());

  return [...new Set(finalCandidates)];
}
