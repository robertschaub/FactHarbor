import { describe, expect, it } from "vitest";

import { clampConfidence } from "@/lib/analyzer/llm";

describe("clampConfidence", () => {
  it("clamps values above 1 to 1", () => {
    expect(clampConfidence(1.5)).toBe(1);
  });

  it("clamps values below 0 to 0", () => {
    expect(clampConfidence(-0.25)).toBe(0);
  });

  it("passes through values within range", () => {
    expect(clampConfidence(0.42)).toBe(0.42);
  });
});
