/**
 * Per-category and per-sourceType SR Cache TTL Tests
 *
 * Tests for resolveCacheTtlDays 3-tier lookup:
 *   1. Per-sourceType (highest priority)
 *   2. Per-category (fallback)
 *   3. Flat cacheTtlDays (final fallback)
 *
 * @module source-reliability-cache-ttl.test
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  resolveCacheTtlDays,
  setCacheTtlByCategory,
  setCacheTtlBySourceType,
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
    setCacheTtlBySourceType({
      government: 21,
      state_controlled_media: 21,
      unknown: 21,
      state_media: 30,
      advocacy: 30,
      platform_ugc: 45,
      aggregator: 45,
      editorial_publisher: 60,
      wire_service: 90,
      propaganda_outlet: 90,
      known_disinformation: 90,
    });
  });

  // =========================================================================
  // Tier 2: Per-category TTL (no sourceType)
  // =========================================================================

  it("returns per-category TTL for known category (no sourceType)", () => {
    expect(resolveCacheTtlDays("highly_reliable")).toBe(60);
    expect(resolveCacheTtlDays("unreliable")).toBe(7);
    expect(resolveCacheTtlDays("mixed")).toBe(21);
    expect(resolveCacheTtlDays("leaning_reliable")).toBe(45);
    expect(resolveCacheTtlDays("leaning_unreliable")).toBe(14);
  });

  it("falls back to flat cacheTtlDays for unknown category (no sourceType)", () => {
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

  // =========================================================================
  // Tier 1: Per-sourceType TTL (highest priority)
  // =========================================================================

  it("returns per-sourceType TTL when sourceType is in the map", () => {
    expect(resolveCacheTtlDays("highly_reliable", "government")).toBe(21);
    expect(resolveCacheTtlDays("highly_reliable", "wire_service")).toBe(90);
    expect(resolveCacheTtlDays("unreliable", "editorial_publisher")).toBe(60);
    expect(resolveCacheTtlDays("mixed", "advocacy")).toBe(30);
  });

  it("sourceType takes priority over category when both match", () => {
    // government sourceType = 21 days, highly_reliable category = 60 days
    // sourceType should win
    expect(resolveCacheTtlDays("highly_reliable", "government")).toBe(21);
  });

  it("falls back to per-category when sourceType is not in the map", () => {
    // "news_primary" is not in sourceType map, but "highly_reliable" is in category map
    expect(resolveCacheTtlDays("highly_reliable", "news_primary")).toBe(60);
  });

  it("falls back to flat cacheTtlDays when neither sourceType nor category match", () => {
    expect(resolveCacheTtlDays("unknown_category", "unknown_source_type")).toBe(90);
  });

  it("falls back to per-category when sourceType is null", () => {
    expect(resolveCacheTtlDays("unreliable", null)).toBe(7);
  });

  it("falls back to per-category when sourceType is undefined", () => {
    expect(resolveCacheTtlDays("leaning_reliable", undefined)).toBe(45);
  });

  it("falls back to per-category when sourceType map is undefined", () => {
    setCacheTtlBySourceType(undefined);
    expect(resolveCacheTtlDays("highly_reliable", "government")).toBe(60);
  });

  it("falls back to flat when both maps are undefined", () => {
    setCacheTtlByCategory(undefined);
    setCacheTtlBySourceType(undefined);
    expect(resolveCacheTtlDays("highly_reliable", "government")).toBe(90);
  });

  it("uses updated sourceType map after setCacheTtlBySourceType", () => {
    setCacheTtlBySourceType({ government: 7 });
    expect(resolveCacheTtlDays("highly_reliable", "government")).toBe(7);
    // Other source types fall back to category
    expect(resolveCacheTtlDays("highly_reliable", "wire_service")).toBe(60);
  });

  // =========================================================================
  // Full 3-tier cascade
  // =========================================================================

  it("3-tier cascade: sourceType → category → flat", () => {
    // Tier 1 hit
    expect(resolveCacheTtlDays("mixed", "government")).toBe(21);
    // Tier 2 hit (sourceType miss)
    expect(resolveCacheTtlDays("mixed", "news_primary")).toBe(21);  // mixed category = 21
    // Tier 3 hit (both miss)
    expect(resolveCacheTtlDays("some_new_category", "some_new_type")).toBe(90);
  });
});
