export const ADMIN_ACTABLE_DRAFT_STATUS = "AWAITING_CLAIM_SELECTION";
export const ADMIN_WAITING_FOR_INPUT_LINKED_FILTER = "withoutFinalJob";

export function canAdminActOnClaimSelectionDraft(
  status: string | null | undefined,
  finalJobId: string | null | undefined,
): boolean {
  return status === ADMIN_ACTABLE_DRAFT_STATUS && !finalJobId;
}

export function isAdminWaitingForInputFilter(
  status: string | null | undefined,
  linked: string | null | undefined,
): boolean {
  return status === ADMIN_ACTABLE_DRAFT_STATUS && linked === ADMIN_WAITING_FOR_INPUT_LINKED_FILTER;
}

export function getAdminClaimSelectionHref(draftId: string): string {
  return `/analyze/select/${encodeURIComponent(draftId)}`;
}
