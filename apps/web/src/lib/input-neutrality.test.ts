import { describe, expect, it } from "vitest";

import { normalizeInputAtEntryPoint } from "./input-neutrality";

describe("input neutrality (entry-point normalization)", () => {
  it("normalizes yes/no questions and equivalent statements to the same canonical string", () => {
    const q = normalizeInputAtEntryPoint("Was the court judgment fair and based on applicable law?");
    const s = normalizeInputAtEntryPoint("The court judgment was fair and based on applicable law.");

    expect(q.normalizedInputValue).toBe("The court judgment was fair and based on applicable law");
    expect(s.normalizedInputValue).toBe("The court judgment was fair and based on applicable law");
    expect(q.normalizedInputValue).toBe(s.normalizedInputValue);
  });

  it("strips trailing periods for exact matching", () => {
    const a = normalizeInputAtEntryPoint("A short statement.");
    const b = normalizeInputAtEntryPoint("A short statement");
    expect(a.normalizedInputValue).toBe("A short statement");
    expect(b.normalizedInputValue).toBe("A short statement");
  });

  it("keeps non-questions stable aside from trimming/punctuation", () => {
    const r = normalizeInputAtEntryPoint("  Hello world...   ");
    expect(r.originalInputDisplay).toBe("Hello world...");
    expect(r.normalizedInputValue).toBe("Hello world");
  });
});
