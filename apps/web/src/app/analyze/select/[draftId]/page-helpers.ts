import {
  shouldAutoContinueWithoutSelection,
  shouldRequireClaimSelectionUi,
} from "@/lib/claim-selection-flow";

export type DraftStatus =
  | "QUEUED"
  | "PREPARING"
  | "AWAITING_CLAIM_SELECTION"
  | "FAILED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | string;

export function formatClaimCount(count: number): string {
  return `${count} claim${count === 1 ? "" : "s"}`;
}

export function getDraftPageTitle(
  status: DraftStatus,
  requiresSelectionUi: boolean,
): string {
  if (status === "AWAITING_CLAIM_SELECTION" && requiresSelectionUi) {
    return "Atomic Claim Selection";
  }

  switch (status) {
    case "CANCELLED":
    case "EXPIRED":
      return "Analysis Session";
    default:
      return "Preparing Analysis";
  }
}

export function getStatusHeadline(
  status: DraftStatus,
  requiresSelectionUi: boolean,
): string {
  switch (status) {
    case "QUEUED":
      return "Waiting to start preparation";
    case "PREPARING":
      return "Preparing the Stage 1 claim set";
    case "AWAITING_CLAIM_SELECTION":
      return requiresSelectionUi
        ? "Choose the atomic claims to continue"
        : "Continuing into analysis";
    case "FAILED":
      return "Session preparation failed";
    case "CANCELLED":
      return "Session cancelled";
    case "EXPIRED":
      return "Session expired";
    case "COMPLETED":
      return "Session completed";
    default:
      return status;
  }
}

export function getStatusSummary(
  status: DraftStatus,
  candidateCount: number,
  recommendedCount: number,
  selectionThreshold: number,
): string {
  switch (status) {
    case "QUEUED":
      return "FactHarbor has accepted this analysis session and queued Stage 1 preparation. No report job exists yet, so it does not appear in the reports list.";
    case "PREPARING":
      return "FactHarbor is preparing the final Stage 1 candidate set for this analysis. If the manual-review threshold is reached, FactHarbor then generates claim-selection recommendations before the selection screen appears.";
    case "AWAITING_CLAIM_SELECTION":
      if (shouldRequireClaimSelectionUi(candidateCount, selectionThreshold)) {
        return `Stage 1 reached the manual-review threshold (${formatClaimCount(selectionThreshold)}) and produced ${formatClaimCount(candidateCount)}. Review the ranked list below and choose the final subset before analysis continues.`;
      }
      if (shouldAutoContinueWithoutSelection(candidateCount, selectionThreshold)) {
        return `Stage 1 stayed below the manual-review threshold (${formatClaimCount(selectionThreshold)}), so FactHarbor can continue directly into the full analysis with all prepared claims.`;
      }
      if (recommendedCount === 0) {
        return "The prepared analysis is waiting for the next continuation step.";
      }
      return "The prepared analysis is ready for continuation.";
    case "FAILED":
      return "The prepared Stage 1 snapshot was not accepted. You can retry preparation or cancel the session.";
    case "CANCELLED":
      return "This session will not create a job unless you start over from the analyze page.";
    case "EXPIRED":
      return "The 24-hour session window elapsed before confirmation.";
    case "COMPLETED":
      return "The session has already been confirmed and is handing off to the job runner.";
    default:
      return "FactHarbor is processing this session.";
  }
}

export function canCancelDraftStatus(status: DraftStatus): boolean {
  return !["CANCELLED", "COMPLETED", "EXPIRED", "PREPARING"].includes(status);
}

export function shouldShowDraftSummary(status: DraftStatus): boolean {
  return status !== "QUEUED" && status !== "PREPARING" && status !== "COMPLETED";
}
