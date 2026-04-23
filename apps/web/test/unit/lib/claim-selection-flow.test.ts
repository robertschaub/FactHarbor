import { describe, expect, it } from "vitest";

import {
  CLAIM_SELECTION_ABSOLUTE_MAX,
  CLAIM_SELECTION_DEFAULT_CAP,
  getClaimSelectionCap,
  normalizeClaimSelectionCap,
  shouldAutoContinueWithoutSelection,
  shouldRequireClaimSelectionUi,
} from "@/lib/claim-selection-flow";

describe("claim-selection-flow", () => {
  it("normalizes the configurable claim-selection cap against the structural maximum", () => {
    expect(CLAIM_SELECTION_DEFAULT_CAP).toBe(5);
    expect(CLAIM_SELECTION_ABSOLUTE_MAX).toBe(5);
    expect(normalizeClaimSelectionCap(undefined)).toBe(5);
    expect(normalizeClaimSelectionCap(0)).toBe(1);
    expect(normalizeClaimSelectionCap(3.9)).toBe(3);
    expect(normalizeClaimSelectionCap(9)).toBe(5);
  });

  it("auto-continues only while candidate count stays below the configured threshold", () => {
    expect(shouldAutoContinueWithoutSelection(0)).toBe(false);
    expect(shouldAutoContinueWithoutSelection(1)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(4)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(5)).toBe(false);
    expect(shouldAutoContinueWithoutSelection(2, 3)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(3, 3)).toBe(false);
  });

  it("requires the selection UI once candidate count reaches the configured threshold", () => {
    expect(shouldRequireClaimSelectionUi(4)).toBe(false);
    expect(shouldRequireClaimSelectionUi(5)).toBe(true);
    expect(shouldRequireClaimSelectionUi(8)).toBe(true);
    expect(shouldRequireClaimSelectionUi(2, 3)).toBe(false);
    expect(shouldRequireClaimSelectionUi(3, 3)).toBe(true);
  });

  it("caps selection at the normalized threshold while respecting smaller prepared sets", () => {
    expect(getClaimSelectionCap(0)).toBe(1);
    expect(getClaimSelectionCap(3)).toBe(3);
    expect(getClaimSelectionCap(5)).toBe(5);
    expect(getClaimSelectionCap(9)).toBe(5);
    expect(getClaimSelectionCap(4, 3)).toBe(3);
  });
});
