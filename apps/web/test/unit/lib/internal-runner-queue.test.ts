import { describe, expect, it } from "vitest";

import {
  getAutomaticRecommendationSelection,
  normalizeDraftPreparationProgress,
  normalizeRunningProgress,
  resolveRunnerConcurrencyBudget,
} from "@/lib/internal-runner-queue";

describe("normalizeRunningProgress", () => {
  it("keeps undefined progress unchanged", () => {
    expect(normalizeRunningProgress(undefined)).toBeUndefined();
  });

  it("preserves in-flight progress below 100", () => {
    expect(normalizeRunningProgress(95)).toBe(95);
    expect(normalizeRunningProgress(99)).toBe(99);
  });

  it("caps RUNNING progress at 99 until terminal status lands", () => {
    expect(normalizeRunningProgress(100)).toBe(99);
    expect(normalizeRunningProgress(125)).toBe(99);
  });
});

describe("normalizeDraftPreparationProgress", () => {
  it("drops non-positive progress used for observability-only Stage 1 events", () => {
    expect(normalizeDraftPreparationProgress(-1)).toBeUndefined();
    expect(normalizeDraftPreparationProgress(0)).toBeUndefined();
  });

  it("preserves positive progress and still caps 100 at 99", () => {
    expect(normalizeDraftPreparationProgress(22)).toBe(22);
    expect(normalizeDraftPreparationProgress(100)).toBe(99);
  });
});

describe("getAutomaticRecommendationSelection", () => {
  it("returns undefined outside automatic mode", () => {
    expect(getAutomaticRecommendationSelection("interactive", ["AC_01", "AC_02"], 5)).toBeUndefined();
  });

  it("returns undefined when there is no safe recommendation to auto-confirm", () => {
    expect(getAutomaticRecommendationSelection("automatic", [], 5)).toBeUndefined();
    expect(getAutomaticRecommendationSelection("automatic", ["", "  "], 5)).toBeUndefined();
  });

  it("deduplicates and caps automatic recommendations to the configured selection cap", () => {
    expect(
      getAutomaticRecommendationSelection("automatic", ["AC_01", "AC_02", "AC_01", "AC_03"], 2),
    ).toEqual(["AC_01", "AC_02"]);
  });
});

describe("resolveRunnerConcurrencyBudget", () => {
  it("uses the legacy shared runner limit for jobs and a dedicated prep lane by default", () => {
    expect(
      resolveRunnerConcurrencyBudget({
        FH_RUNNER_MAX_CONCURRENCY: "3",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      jobMaxConcurrency: 3,
      draftPreparationMaxConcurrency: 1,
    });
  });

  it("lets explicit job and prep lane env vars override the legacy shared value", () => {
    expect(
      resolveRunnerConcurrencyBudget({
        FH_RUNNER_MAX_CONCURRENCY: "3",
        FH_RUNNER_JOB_MAX_CONCURRENCY: "4",
        FH_RUNNER_PREP_MAX_CONCURRENCY: "2",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      jobMaxConcurrency: 4,
      draftPreparationMaxConcurrency: 2,
    });
  });

  it("falls back safely when split env vars are invalid", () => {
    expect(
      resolveRunnerConcurrencyBudget({
        FH_RUNNER_MAX_CONCURRENCY: "2",
        FH_RUNNER_JOB_MAX_CONCURRENCY: "0",
        FH_RUNNER_PREP_MAX_CONCURRENCY: "-1",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      jobMaxConcurrency: 2,
      draftPreparationMaxConcurrency: 1,
    });
  });
});
