import type { PipelineConfig } from "../config-schemas";

export interface PredicateSplit {
  subject: string;
  predicate: string;
}

function escapeRegexToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeTokens(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

export function splitByConfigurableHeuristics(
  rest: string,
  pipelineConfig?: Pick<PipelineConfig, "normalizationPredicateStarters" | "normalizationAdjectiveSuffixes">,
): PredicateSplit | null {
  const trimmed = String(rest || "").trim();
  if (!trimmed) return null;

  const predicateStarters = normalizeTokens(pipelineConfig?.normalizationPredicateStarters);
  if (predicateStarters.length > 0) {
    const tokenPattern = predicateStarters.map(escapeRegexToken).join("|");
    const starterRe = new RegExp(`\\b(${tokenPattern})\\b`, "i");
    const starterMatch = trimmed.match(starterRe);
    if (starterMatch && typeof starterMatch.index === "number" && starterMatch.index > 0) {
      const subject = trimmed.slice(0, starterMatch.index).trim();
      const predicate = trimmed.slice(starterMatch.index).trim();
      if (subject && predicate) {
        return { subject, predicate };
      }
    }
  }

  const adjectiveSuffixes = normalizeTokens(pipelineConfig?.normalizationAdjectiveSuffixes);
  if (adjectiveSuffixes.length > 0) {
    const suffixPattern = adjectiveSuffixes.map(escapeRegexToken).join("|");
    const adjSuffixRe = new RegExp(`\\b(\\w{5,}(?:${suffixPattern}))\\b`, "i");
    const suffixMatch = trimmed.match(adjSuffixRe);
    if (suffixMatch && typeof suffixMatch.index === "number" && suffixMatch.index > 0) {
      const subject = trimmed.slice(0, suffixMatch.index).trim();
      const predicate = trimmed.slice(suffixMatch.index).trim();
      if (subject && predicate) {
        return { subject, predicate };
      }
    }
  }

  return null;
}
