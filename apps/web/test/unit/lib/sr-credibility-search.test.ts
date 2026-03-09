/**
 * Unit tests for SR Credibility Search query template substitution.
 *
 * Phase 2.4 Commit 2: Tests template substitution, edge cases, and fallback behavior.
 */
import { describe, it, expect } from "vitest";
import {
  buildCredibilitySearchQuery,
  DEFAULT_CREDIBILITY_SEARCH_TEMPLATE,
} from "@/lib/sr-credibility-search";

describe("buildCredibilitySearchQuery", () => {
  it("substitutes {domain} in the default template", () => {
    const result = buildCredibilitySearchQuery(
      DEFAULT_CREDIBILITY_SEARCH_TEMPLATE,
      "reuters.com",
    );
    expect(result).toBe("reuters.com credibility reliability bias fact-check");
  });

  it("substitutes {domain} in a custom template", () => {
    const result = buildCredibilitySearchQuery(
      '"{domain}" media bias rating',
      "bbc.co.uk",
    );
    expect(result).toBe('"bbc.co.uk" media bias rating');
  });

  it("handles multiple {domain} placeholders", () => {
    const result = buildCredibilitySearchQuery(
      "{domain} OR site:{domain} reliability",
      "nytimes.com",
    );
    expect(result).toBe("nytimes.com OR site:nytimes.com reliability");
  });

  it("is case-insensitive for placeholder ({Domain}, {DOMAIN})", () => {
    const result = buildCredibilitySearchQuery(
      "{Domain} credibility {DOMAIN} bias",
      "example.org",
    );
    expect(result).toBe("example.org credibility example.org bias");
  });

  it("falls back to default query when template is empty string", () => {
    const result = buildCredibilitySearchQuery("", "example.com");
    expect(result).toBe("example.com credibility reliability bias fact-check");
  });

  it("falls back to default query when template is whitespace-only", () => {
    const result = buildCredibilitySearchQuery("   ", "example.com");
    expect(result).toBe("example.com credibility reliability bias fact-check");
  });

  it("returns template as-is when no {domain} placeholder present", () => {
    const result = buildCredibilitySearchQuery(
      "static query without placeholder",
      "example.com",
    );
    expect(result).toBe("static query without placeholder");
  });

  it("handles domains with subdomains", () => {
    const result = buildCredibilitySearchQuery(
      DEFAULT_CREDIBILITY_SEARCH_TEMPLATE,
      "www.srf.ch",
    );
    expect(result).toContain("www.srf.ch");
  });
});

describe("DEFAULT_CREDIBILITY_SEARCH_TEMPLATE", () => {
  it("contains the {domain} placeholder", () => {
    expect(DEFAULT_CREDIBILITY_SEARCH_TEMPLATE).toContain("{domain}");
  });

  it("matches the expected default value", () => {
    expect(DEFAULT_CREDIBILITY_SEARCH_TEMPLATE).toBe(
      "{domain} credibility reliability bias fact-check",
    );
  });
});
