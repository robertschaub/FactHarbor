export const CLAIM_SELECTION_ABSOLUTE_MAX = 5;
export const CLAIM_SELECTION_DEFAULT_CAP = 5;
export const CLAIM_SELECTION_IDLE_AUTO_PROCEED_DEFAULT_MS = 900000;
export const CLAIM_SELECTION_IDLE_AUTO_PROCEED_MAX_MS = 3600000;

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

export function normalizeClaimSelectionIdleAutoProceedMs(
  configuredMs: number | null | undefined,
): number {
  if (!Number.isFinite(configuredMs)) {
    return CLAIM_SELECTION_IDLE_AUTO_PROCEED_DEFAULT_MS;
  }

  const normalizedMs = configuredMs as number;
  return Math.max(
    0,
    Math.min(CLAIM_SELECTION_IDLE_AUTO_PROCEED_MAX_MS, Math.trunc(normalizedMs)),
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

export function isValidClaimSelection(
  selectedClaimIds: readonly string[] | null | undefined,
  configuredCap?: number | null,
): boolean {
  if (!Array.isArray(selectedClaimIds)) {
    return false;
  }

  if (selectedClaimIds.some((claimId) => typeof claimId !== "string" || claimId.trim().length === 0)) {
    return false;
  }

  if (new Set(selectedClaimIds).size !== selectedClaimIds.length) {
    return false;
  }

  const selectionCap = normalizeClaimSelectionCap(configuredCap);
  return selectedClaimIds.length >= 1 && selectedClaimIds.length <= selectionCap;
}

export function resolveIdleAutoProceedSelection(
  currentSelectedClaimIds: readonly string[] | null | undefined,
  lastValidSelectedClaimIds: readonly string[] | null | undefined,
  configuredCap?: number | null,
): string[] {
  if (isValidClaimSelection(currentSelectedClaimIds, configuredCap)) {
    return Array.from(currentSelectedClaimIds ?? []);
  }

  if (isValidClaimSelection(lastValidSelectedClaimIds, configuredCap)) {
    return Array.from(lastValidSelectedClaimIds ?? []);
  }

  return [];
}

export function getClaimSelectionIdleRemainingMs(
  lastInteractionAtMs: number | null | undefined,
  configuredIdleTimeoutMs?: number | null,
  nowMs = Date.now(),
): number {
  const idleTimeoutMs = normalizeClaimSelectionIdleAutoProceedMs(configuredIdleTimeoutMs);
  if (idleTimeoutMs <= 0) {
    return 0;
  }

  if (!Number.isFinite(lastInteractionAtMs) || !Number.isFinite(nowMs)) {
    return idleTimeoutMs;
  }

  const elapsedMs = Math.max(0, nowMs - (lastInteractionAtMs as number));
  return Math.max(0, idleTimeoutMs - elapsedMs);
}
