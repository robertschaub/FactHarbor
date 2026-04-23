import { describe, expect, it } from "vitest";

import {
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
    expect(getStatusHeadline("PREPARING", false)).toBe("Preparing the Stage 1 claim set");
    expect(getStatusHeadline("AWAITING_CLAIM_SELECTION", false)).toBe("Continuing into analysis");
    expect(getStatusHeadline("AWAITING_CLAIM_SELECTION", true)).toBe("Choose the atomic claims to continue");
  });

  it("describes preparing sessions as analysis preparation rather than a selection step", () => {
    expect(getStatusSummary("PREPARING", 0, 0, 5)).toBe(
      "FactHarbor is preparing the final Stage 1 claim set for this analysis.",
    );
    expect(getStatusSummary("AWAITING_CLAIM_SELECTION", 3, 3, 5)).toContain(
      "continue directly into the full analysis with all prepared claims",
    );
  });
});
