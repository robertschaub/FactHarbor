import { describe, expect, it } from "vitest";

import {
  canCancelDraftStatus,
  getDraftPageTitle,
  getStatusHeadline,
  getStatusSummary,
} from "@/app/analyze/select/[draftId]/page-helpers";

describe("claim-selection draft page helpers", () => {
  it("uses a neutral preparation title before manual claim selection is required", () => {
    expect(getDraftPageTitle("PREPARING", false)).toBe("Preparing Analysis");
    expect(getDraftPageTitle("AWAITING_CLAIM_SELECTION", false)).toBe("Preparing Analysis");
    expect(getDraftPageTitle("AWAITING_CLAIM_SELECTION", true)).toBe("Atomic Claim Selection");
  });

  it("keeps the preparing headline focused on Stage 1 preparation", () => {
    expect(getStatusHeadline("QUEUED", false)).toBe("Waiting to start preparation");
    expect(getStatusHeadline("PREPARING", false)).toBe("Preparing the Stage 1 claim set");
    expect(getStatusHeadline("AWAITING_CLAIM_SELECTION", false)).toBe("Continuing into analysis");
    expect(getStatusHeadline("AWAITING_CLAIM_SELECTION", true)).toBe("Choose the atomic claims to continue");
  });

  it("describes preparing sessions as analysis preparation rather than a selection step", () => {
    expect(getStatusSummary("QUEUED", 0, 0, 5)).toContain(
      "No report job exists yet, so it does not appear in the reports list.",
    );
    expect(getStatusSummary("PREPARING", 0, 0, 5)).toBe(
      "FactHarbor is preparing the final Stage 1 candidate set for this analysis. If the manual-review threshold is reached, FactHarbor then generates claim-selection recommendations before the selection screen appears.",
    );
    expect(getStatusSummary("AWAITING_CLAIM_SELECTION", 3, 3, 5)).toContain(
      "continue directly into the full analysis with all prepared claims",
    );
  });

  it("blocks cancellation for preparing and terminal sessions", () => {
    expect(canCancelDraftStatus("QUEUED")).toBe(true);
    expect(canCancelDraftStatus("AWAITING_CLAIM_SELECTION")).toBe(true);
    expect(canCancelDraftStatus("FAILED")).toBe(true);
    expect(canCancelDraftStatus("PREPARING")).toBe(false);
    expect(canCancelDraftStatus("COMPLETED")).toBe(false);
    expect(canCancelDraftStatus("CANCELLED")).toBe(false);
    expect(canCancelDraftStatus("EXPIRED")).toBe(false);
  });
});
