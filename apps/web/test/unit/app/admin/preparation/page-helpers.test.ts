import { describe, expect, it } from "vitest";

import {
  ADMIN_ACTABLE_DRAFT_STATUS,
  ADMIN_WAITING_FOR_INPUT_LINKED_FILTER,
  canAdminActOnClaimSelectionDraft,
  getAdminClaimSelectionHref,
  isAdminWaitingForInputFilter,
} from "@/app/admin/preparation/page-helpers";

describe("admin preparation page helpers", () => {
  it("allows admins to act only on unlinked waiting claim-selection drafts", () => {
    expect(canAdminActOnClaimSelectionDraft(ADMIN_ACTABLE_DRAFT_STATUS, null)).toBe(true);
    expect(canAdminActOnClaimSelectionDraft(ADMIN_ACTABLE_DRAFT_STATUS, "")).toBe(true);
    expect(canAdminActOnClaimSelectionDraft("PREPARING", null)).toBe(false);
    expect(canAdminActOnClaimSelectionDraft("FAILED", null)).toBe(false);
    expect(canAdminActOnClaimSelectionDraft("COMPLETED", "job-1")).toBe(false);
    expect(canAdminActOnClaimSelectionDraft(ADMIN_ACTABLE_DRAFT_STATUS, "job-1")).toBe(false);
  });

  it("identifies the waiting-for-input list filter", () => {
    expect(
      isAdminWaitingForInputFilter(
        ADMIN_ACTABLE_DRAFT_STATUS,
        ADMIN_WAITING_FOR_INPUT_LINKED_FILTER,
      ),
    ).toBe(true);
    expect(isAdminWaitingForInputFilter(ADMIN_ACTABLE_DRAFT_STATUS, "any")).toBe(false);
    expect(isAdminWaitingForInputFilter("PREPARING", ADMIN_WAITING_FOR_INPUT_LINKED_FILTER)).toBe(false);
  });

  it("builds the existing live selection route for admin action", () => {
    expect(getAdminClaimSelectionHref("draft-1")).toBe("/analyze/select/draft-1");
    expect(getAdminClaimSelectionHref("draft with spaces")).toBe("/analyze/select/draft%20with%20spaces");
  });
});
