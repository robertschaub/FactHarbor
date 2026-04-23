export const CLAIM_SELECTION_AUTO_CONTINUE_MAX_CLAIMS = 4;
export const CLAIM_SELECTION_UI_MIN_CLAIMS =
  CLAIM_SELECTION_AUTO_CONTINUE_MAX_CLAIMS + 1;
export const CLAIM_SELECTION_MAX_SELECTED = 5;

export function shouldAutoContinueWithoutSelection(
  candidateCount: number,
): boolean {
  if (!Number.isFinite(candidateCount)) return false;
  return candidateCount > 0 && candidateCount <= CLAIM_SELECTION_AUTO_CONTINUE_MAX_CLAIMS;
}

export function shouldRequireClaimSelectionUi(
  candidateCount: number,
): boolean {
  if (!Number.isFinite(candidateCount)) return false;
  return candidateCount >= CLAIM_SELECTION_UI_MIN_CLAIMS;
}

export function getClaimSelectionCap(candidateCount: number): number {
  if (!Number.isFinite(candidateCount) || candidateCount <= 0) {
    return 1;
  }
  return Math.min(CLAIM_SELECTION_MAX_SELECTED, Math.trunc(candidateCount));
}
