import { describe, expect, it } from "vitest";

import {
  CLAIM_SELECTION_ABSOLUTE_MAX,
  CLAIM_SELECTION_DEFAULT_CAP,
  CLAIM_SELECTION_IDLE_AUTO_PROCEED_DEFAULT_MS,
  getClaimSelectionIdleRemainingMs,
  getClaimSelectionCap,
  isValidClaimSelection,
  normalizeClaimSelectionCap,
  normalizeClaimSelectionIdleAutoProceedMs,
  resolveIdleAutoProceedSelection,
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

  it("normalizes the idle auto-proceed timeout with disable support", () => {
    expect(normalizeClaimSelectionIdleAutoProceedMs(undefined)).toBe(
      CLAIM_SELECTION_IDLE_AUTO_PROCEED_DEFAULT_MS,
    );
    expect(normalizeClaimSelectionIdleAutoProceedMs(-50)).toBe(0);
    expect(normalizeClaimSelectionIdleAutoProceedMs(90_999.8)).toBe(90_999);
    expect(normalizeClaimSelectionIdleAutoProceedMs(9_999_999)).toBe(3_600_000);
  });

  it("tracks whether a current claim selection remains valid", () => {
    expect(isValidClaimSelection(["AC_1"])).toBe(true);
    expect(isValidClaimSelection(["AC_1", "AC_2", "AC_3"], 3)).toBe(true);
    expect(isValidClaimSelection([])).toBe(false);
    expect(isValidClaimSelection(["AC_1", "AC_1"])).toBe(false);
    expect(isValidClaimSelection(["AC_1", ""])).toBe(false);
    expect(isValidClaimSelection(["AC_1", "AC_2", "AC_3", "AC_4"], 3)).toBe(false);
  });

  it("falls back to the last valid selection for idle auto-proceed", () => {
    expect(
      resolveIdleAutoProceedSelection(["AC_1", "AC_2"], ["AC_1"], 3),
    ).toEqual(["AC_1", "AC_2"]);

    expect(
      resolveIdleAutoProceedSelection([], ["AC_2", "AC_3"], 3),
    ).toEqual(["AC_2", "AC_3"]);

    expect(
      resolveIdleAutoProceedSelection(["AC_1", "AC_1"], [], 3),
    ).toEqual([]);
  });

  it("computes the remaining idle countdown from the last interaction timestamp", () => {
    expect(getClaimSelectionIdleRemainingMs(undefined, 180_000, 10_000)).toBe(180_000);
    expect(getClaimSelectionIdleRemainingMs(10_000, 180_000, 70_000)).toBe(120_000);
    expect(getClaimSelectionIdleRemainingMs(10_000, 180_000, 200_500)).toBe(0);
    expect(getClaimSelectionIdleRemainingMs(10_000, 0, 70_000)).toBe(0);
  });
});
