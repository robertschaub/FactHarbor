import { describe, expect, it } from "vitest";

import { normalizeRunningProgress } from "@/lib/internal-runner-queue";

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
