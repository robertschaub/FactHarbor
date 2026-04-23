import { describe, expect, it } from "vitest";

import {
  CLAIM_SELECTION_AUTO_CONTINUE_MAX_CLAIMS,
  CLAIM_SELECTION_UI_MIN_CLAIMS,
  getClaimSelectionCap,
  shouldAutoContinueWithoutSelection,
  shouldRequireClaimSelectionUi,
} from "@/lib/claim-selection-flow";

describe("claim-selection-flow", () => {
  it("auto-continues only when Stage 1 yields one to four candidate claims", () => {
    expect(CLAIM_SELECTION_AUTO_CONTINUE_MAX_CLAIMS).toBe(4);
    expect(shouldAutoContinueWithoutSelection(0)).toBe(false);
    expect(shouldAutoContinueWithoutSelection(1)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(4)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(5)).toBe(false);
  });

  it("requires the selection UI only when five or more candidate claims survive", () => {
    expect(CLAIM_SELECTION_UI_MIN_CLAIMS).toBe(5);
    expect(shouldRequireClaimSelectionUi(4)).toBe(false);
    expect(shouldRequireClaimSelectionUi(5)).toBe(true);
    expect(shouldRequireClaimSelectionUi(8)).toBe(true);
  });

  it("caps client-side selection at five while respecting smaller prepared sets", () => {
    expect(getClaimSelectionCap(0)).toBe(1);
    expect(getClaimSelectionCap(3)).toBe(3);
    expect(getClaimSelectionCap(5)).toBe(5);
    expect(getClaimSelectionCap(9)).toBe(5);
  });
});
