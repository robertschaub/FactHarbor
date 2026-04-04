import type { AtomicClaim } from "./types";

function normalizeIsoCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function normalizeRelevantGeographies(
  relevantGeographies?: string[] | null,
  fallbackGeography?: string | null,
): string[] {
  const normalized = unique(
    (Array.isArray(relevantGeographies) ? relevantGeographies : [])
      .map((value) => normalizeIsoCountryCode(value))
      .filter((value): value is string => value !== null),
  );

  if (normalized.length > 0) return normalized;

  const fallback = normalizeIsoCountryCode(fallbackGeography);
  return fallback ? [fallback] : [];
}

export function getClaimRelevantGeographies(
  claim: AtomicClaim,
  fallbackGeography?: string | null,
): string[] {
  return normalizeRelevantGeographies(claim.relevantGeographies, fallbackGeography);
}

export function getClaimsRelevantGeographies(
  claims: AtomicClaim[],
  fallbackGeography?: string | null,
): string[] {
  const merged = unique(
    claims.flatMap((claim) => getClaimRelevantGeographies(claim)),
  );
  return merged.length > 0 ? merged : normalizeRelevantGeographies([], fallbackGeography);
}

export function formatPromptInferredGeography(relevantGeographies: string[]): string {
  return relevantGeographies.length === 1 ? relevantGeographies[0] : "null";
}

export function formatPromptRelevantGeographies(relevantGeographies: string[]): string {
  return JSON.stringify(relevantGeographies, null, 2);
}
