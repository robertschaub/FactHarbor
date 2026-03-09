/**
 * Per-category SR Cache TTL Tests
 *
 * Tests for resolveCacheTtlDays and setCacheTtlByCategory.
 *
 * @module source-reliability-cache-ttl.test
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  resolveCacheTtlDays,
  setCacheTtlByCategory,
  setCacheTtlDays,
} from "@/lib/source-reliability-cache";

describe("resolveCacheTtlDays", () => {
  beforeEach(() => {
    // Reset to known defaults
    setCacheTtlDays(90);
    setCacheTtlByCategory({
      highly_reliable: 60,
      reliable: 60,
      leaning_reliable: 45,
      mixed: 21,
      leaning_unreliable: 14,
      unreliable: 7,
      highly_unreliable: 7,
    });
  });

  it("returns per-category TTL for known category", () => {
    expect(resolveCacheTtlDays("highly_reliable")).toBe(60);
    expect(resolveCacheTtlDays("unreliable")).toBe(7);
    expect(resolveCacheTtlDays("mixed")).toBe(21);
    expect(resolveCacheTtlDays("leaning_reliable")).toBe(45);
    expect(resolveCacheTtlDays("leaning_unreliable")).toBe(14);
  });

  it("falls back to flat cacheTtlDays for unknown category", () => {
    expect(resolveCacheTtlDays("unknown_category")).toBe(90);
  });

  it("falls back to flat cacheTtlDays when category is null", () => {
    expect(resolveCacheTtlDays(null)).toBe(90);
  });

  it("falls back to flat cacheTtlDays when category is undefined", () => {
    expect(resolveCacheTtlDays(undefined)).toBe(90);
  });

  it("falls back to flat cacheTtlDays when category map is undefined", () => {
    setCacheTtlByCategory(undefined);
    expect(resolveCacheTtlDays("highly_reliable")).toBe(90);
  });

  it("uses updated flat TTL after setCacheTtlDays", () => {
    setCacheTtlDays(30);
    expect(resolveCacheTtlDays("unknown_category")).toBe(30);
    // Per-category still works
    expect(resolveCacheTtlDays("unreliable")).toBe(7);
  });

  it("uses updated category map after setCacheTtlByCategory", () => {
    setCacheTtlByCategory({ highly_reliable: 120 });
    expect(resolveCacheTtlDays("highly_reliable")).toBe(120);
    // Other categories fall back to flat
    expect(resolveCacheTtlDays("unreliable")).toBe(90);
  });
});
