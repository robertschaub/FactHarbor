import { describe, expect, it } from "vitest";

import {
  CLAIM_SELECTION_ABSOLUTE_MAX,
  CLAIM_SELECTION_BUDGET_AWARENESS_DEFAULT_ENABLED,
  CLAIM_SELECTION_BUDGET_FIT_DEFAULT_MODE,
  CLAIM_SELECTION_DEFAULT_CAP,
  CLAIM_SELECTION_ESTIMATED_MAIN_RESEARCH_MS_PER_CLAIM_DEFAULT,
  CLAIM_SELECTION_IDLE_AUTO_PROCEED_DEFAULT_MS,
  CLAIM_SELECTION_MIN_RECOMMENDED_DEFAULT,
  getBudgetAwareClaimSelectionCap,
  getClaimSelectionIdleRemainingMs,
  getClaimSelectionCap,
  isValidClaimSelection,
  normalizeClaimSelectionBudgetFitMode,
  normalizeClaimSelectionCap,
  normalizeClaimSelectionEstimatedMainResearchMsPerClaim,
  normalizeClaimSelectionIdleAutoProceedMs,
  normalizeClaimSelectionMode,
  normalizeClaimSelectionMinRecommendedClaims,
  resolveIdleAutoProceedSelection,
  resolveInitialClaimSelection,
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

  it("defaults claim-selection mode to interactive unless automatic is explicitly configured", () => {
    expect(normalizeClaimSelectionMode(undefined)).toBe("interactive");
    expect(normalizeClaimSelectionMode(null)).toBe("interactive");
    expect(normalizeClaimSelectionMode("interactive")).toBe("interactive");
    expect(normalizeClaimSelectionMode("automatic")).toBe("automatic");
    expect(normalizeClaimSelectionMode("AUTO")).toBe("interactive");
  });

  it("enables budget-aware ACS admission by default", () => {
    expect(CLAIM_SELECTION_BUDGET_AWARENESS_DEFAULT_ENABLED).toBe(true);
    expect(CLAIM_SELECTION_BUDGET_FIT_DEFAULT_MODE).toBe("allow_fewer_recommendations");
    expect(CLAIM_SELECTION_MIN_RECOMMENDED_DEFAULT).toBe(1);
    expect(CLAIM_SELECTION_ESTIMATED_MAIN_RESEARCH_MS_PER_CLAIM_DEFAULT).toBe(160000);
    expect(normalizeClaimSelectionBudgetFitMode(undefined)).toBe("allow_fewer_recommendations");
    expect(normalizeClaimSelectionBudgetFitMode("explain_only")).toBe("explain_only");
    expect(normalizeClaimSelectionBudgetFitMode("allow_fewer_recommendations")).toBe("allow_fewer_recommendations");
    expect(normalizeClaimSelectionBudgetFitMode("enabled")).toBe("allow_fewer_recommendations");
    expect(normalizeClaimSelectionMinRecommendedClaims(undefined)).toBe(1);
    expect(normalizeClaimSelectionMinRecommendedClaims(0)).toBe(1);
    expect(normalizeClaimSelectionMinRecommendedClaims(3.8)).toBe(3);
    expect(normalizeClaimSelectionMinRecommendedClaims(10)).toBe(5);
    expect(normalizeClaimSelectionEstimatedMainResearchMsPerClaim(undefined)).toBe(160000);
    expect(normalizeClaimSelectionEstimatedMainResearchMsPerClaim(10_000)).toBe(30_000);
    expect(normalizeClaimSelectionEstimatedMainResearchMsPerClaim(123_456.7)).toBe(123_456);
    expect(normalizeClaimSelectionEstimatedMainResearchMsPerClaim(900_000)).toBe(600_000);
  });

  it("auto-continues while candidate count fits within the configured threshold", () => {
    expect(shouldAutoContinueWithoutSelection(0)).toBe(false);
    expect(shouldAutoContinueWithoutSelection(1)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(4)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(5)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(6)).toBe(false);
    expect(shouldAutoContinueWithoutSelection(2, 3)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(3, 3)).toBe(true);
    expect(shouldAutoContinueWithoutSelection(4, 3)).toBe(false);
  });

  it("requires the selection UI only once candidate count exceeds the configured threshold", () => {
    expect(shouldRequireClaimSelectionUi(4)).toBe(false);
    expect(shouldRequireClaimSelectionUi(5)).toBe(false);
    expect(shouldRequireClaimSelectionUi(8)).toBe(true);
    expect(shouldRequireClaimSelectionUi(2, 3)).toBe(false);
    expect(shouldRequireClaimSelectionUi(3, 3)).toBe(false);
    expect(shouldRequireClaimSelectionUi(4, 3)).toBe(true);
  });

  it("caps selection at the normalized threshold while respecting smaller prepared sets", () => {
    expect(getClaimSelectionCap(0)).toBe(1);
    expect(getClaimSelectionCap(3)).toBe(3);
    expect(getClaimSelectionCap(5)).toBe(5);
    expect(getClaimSelectionCap(9)).toBe(5);
    expect(getClaimSelectionCap(4, 3)).toBe(3);
  });

  it("derives a budget-aware admission cap from structural time budgets", () => {
    expect(getBudgetAwareClaimSelectionCap({
      candidateCount: 24,
      configuredCap: 5,
      budgetAwarenessEnabled: true,
      budgetFitMode: "allow_fewer_recommendations",
      researchTimeBudgetMs: 600000,
      contradictionProtectedTimeMs: 120000,
      estimatedMainResearchMsPerClaim: 160000,
      minRecommendedClaims: 1,
    })).toBe(3);

    expect(getBudgetAwareClaimSelectionCap({
      candidateCount: 24,
      configuredCap: 5,
      budgetAwarenessEnabled: false,
      budgetFitMode: "allow_fewer_recommendations",
      researchTimeBudgetMs: 600000,
      contradictionProtectedTimeMs: 120000,
      estimatedMainResearchMsPerClaim: 160000,
      minRecommendedClaims: 1,
    })).toBe(5);

    expect(getBudgetAwareClaimSelectionCap({
      candidateCount: 2,
      configuredCap: 5,
      budgetAwarenessEnabled: true,
      budgetFitMode: "allow_fewer_recommendations",
      researchTimeBudgetMs: 600000,
      contradictionProtectedTimeMs: 120000,
      estimatedMainResearchMsPerClaim: 160000,
      minRecommendedClaims: 1,
    })).toBe(2);

    expect(getBudgetAwareClaimSelectionCap({
      candidateCount: 24,
      configuredCap: 5,
      budgetAwarenessEnabled: true,
      budgetFitMode: "allow_fewer_recommendations",
      researchTimeBudgetMs: 120000,
      contradictionProtectedTimeMs: 120000,
      estimatedMainResearchMsPerClaim: 160000,
      minRecommendedClaims: 2,
    })).toBe(2);
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

  it("prefers recommendations over seeded persisted defaults before user interaction", () => {
    expect(
      resolveInitialClaimSelection({
        candidateClaimIds: ["AC_27", "AC_24", "AC_25", "AC_04", "AC_03", "AC_12"],
        persistedSelectedClaimIds: ["AC_27", "AC_24", "AC_25", "AC_04", "AC_12"],
        recommendedClaimIds: ["AC_27", "AC_24", "AC_04", "AC_03", "AC_12"],
        configuredCap: 5,
        requiresSelectionUi: true,
        hasUserSelectionInteraction: false,
      }),
    ).toEqual(["AC_27", "AC_24", "AC_04", "AC_03", "AC_12"]);
  });

  it("keeps a proven user selection over recommendations", () => {
    expect(
      resolveInitialClaimSelection({
        candidateClaimIds: ["AC_27", "AC_24", "AC_25", "AC_04", "AC_03", "AC_12"],
        persistedSelectedClaimIds: ["AC_27", "AC_24", "AC_25", "AC_04", "AC_12"],
        recommendedClaimIds: ["AC_27", "AC_24", "AC_04", "AC_03", "AC_12"],
        configuredCap: 5,
        requiresSelectionUi: true,
        hasUserSelectionInteraction: true,
      }),
    ).toEqual(["AC_27", "AC_24", "AC_25", "AC_04", "AC_12"]);
  });

  it("uses prepared candidates directly when manual selection is not required", () => {
    expect(
      resolveInitialClaimSelection({
        candidateClaimIds: ["AC_1", "AC_2", "AC_3"],
        persistedSelectedClaimIds: ["AC_3"],
        recommendedClaimIds: ["AC_2"],
        configuredCap: 5,
        requiresSelectionUi: false,
        hasUserSelectionInteraction: true,
      }),
    ).toEqual(["AC_1", "AC_2", "AC_3"]);
  });

  it("computes the remaining idle countdown from the last interaction timestamp", () => {
    expect(getClaimSelectionIdleRemainingMs(undefined, 3_600_000, 10_000)).toBe(3_600_000);
    expect(getClaimSelectionIdleRemainingMs(10_000, 3_600_000, 70_000)).toBe(3_540_000);
    expect(getClaimSelectionIdleRemainingMs(10_000, 3_600_000, 3_610_500)).toBe(0);
    expect(getClaimSelectionIdleRemainingMs(10_000, 0, 70_000)).toBe(0);
  });
});
