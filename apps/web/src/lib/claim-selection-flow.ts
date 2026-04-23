export const CLAIM_SELECTION_ABSOLUTE_MAX = 5;
export const CLAIM_SELECTION_DEFAULT_CAP = 5;

export function normalizeClaimSelectionCap(
  configuredCap: number | null | undefined,
): number {
  if (!Number.isFinite(configuredCap)) {
    return CLAIM_SELECTION_DEFAULT_CAP;
  }

  const normalizedCap = configuredCap as number;
  return Math.max(
    1,
    Math.min(CLAIM_SELECTION_ABSOLUTE_MAX, Math.trunc(normalizedCap)),
  );
}

export function shouldAutoContinueWithoutSelection(
  candidateCount: number,
  configuredCap?: number | null,
): boolean {
  if (!Number.isFinite(candidateCount)) return false;
  return candidateCount > 0 && candidateCount < normalizeClaimSelectionCap(configuredCap);
}

export function shouldRequireClaimSelectionUi(
  candidateCount: number,
  configuredCap?: number | null,
): boolean {
  if (!Number.isFinite(candidateCount)) return false;
  return candidateCount >= normalizeClaimSelectionCap(configuredCap);
}

export function getClaimSelectionCap(
  candidateCount: number,
  configuredCap?: number | null,
): number {
  const normalizedCap = normalizeClaimSelectionCap(configuredCap);
  if (!Number.isFinite(candidateCount) || candidateCount <= 0) {
    return 1;
  }
  return Math.min(normalizedCap, Math.trunc(candidateCount));
}
