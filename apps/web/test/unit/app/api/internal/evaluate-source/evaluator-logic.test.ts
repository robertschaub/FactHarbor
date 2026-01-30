/**
 * Tests for Source Reliability Evaluator Logic
 *
 * Tests for brand variant generation, relevance filtering, and post-processing.
 * These are unit tests with synthetic inputs - no live API calls.
 *
 * @module api/internal/evaluate-source/evaluator-logic.test
 */

import { describe, expect, it } from "vitest";

// ============================================================================
// BRAND VARIANT GENERATION (copied from route.ts for testing)
// In production, these could be extracted to a shared utility
// ============================================================================

function generateBrandVariants(brand: string): string[] {
  const variants = new Set<string>();
  const b = (brand ?? "").toLowerCase().trim();
  if (!b || b.length < 3) return [];

  variants.add(b);

  // Hyphen variants
  if (b.includes("-")) {
    const parts = b.split("-").filter(Boolean);
    if (parts.length >= 2) {
      variants.add(parts.join(" "));
      variants.add(parts.join(""));
      for (const p of parts) {
        if (p.length >= 4) variants.add(p);
      }
    }
  }

  // CamelCase-like detection
  const camelSplit = b.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  if (camelSplit !== b && camelSplit.includes(" ")) {
    variants.add(camelSplit);
    variants.add(camelSplit.replace(/\s+/g, ""));
  }

  // Common suffix stripping
  const suffixes = ["news", "net", "media", "times", "post", "daily", "tribune", "herald"];
  for (const suffix of suffixes) {
    if (b.endsWith(suffix) && b.length > suffix.length + 2) {
      const base = b.slice(0, -suffix.length);
      if (base.length >= 3) {
        variants.add(base);
        variants.add(`${base} ${suffix}`);
      }
    }
  }

  // Filter stopwords
  const stopwords = new Set(["the", "and", "for", "www", "com", "org", "net"]);
  return [...variants].filter((v) => v.length >= 3 && !stopwords.has(v));
}

describe("generateBrandVariants", () => {
  describe("hyphen handling", () => {
    it("generates variants for hyphenated brands", () => {
      const variants = generateBrandVariants("anti-spiegel");
      expect(variants).toContain("anti-spiegel");
      expect(variants).toContain("anti spiegel");
      expect(variants).toContain("antispiegel");
    });

    it("includes individual parts if long enough", () => {
      const variants = generateBrandVariants("anti-spiegel");
      expect(variants).toContain("spiegel"); // 7 chars >= 4
      expect(variants).toContain("anti"); // 4 chars >= 4
    });

    it("handles multiple hyphens", () => {
      const variants = generateBrandVariants("news-of-the-world");
      expect(variants).toContain("news-of-the-world");
      expect(variants).toContain("news of the world");
      expect(variants).toContain("newsoftheworld");
    });
  });

  describe("suffix stripping", () => {
    it("strips common news suffixes", () => {
      const variants = generateBrandVariants("foxnews");
      expect(variants).toContain("foxnews");
      expect(variants).toContain("fox");
      expect(variants).toContain("fox news");
    });

    it("strips net suffix", () => {
      const variants = generateBrandVariants("xinhuanet");
      expect(variants).toContain("xinhuanet");
      expect(variants).toContain("xinhua");
      expect(variants).toContain("xinhua net");
    });

    it("strips media suffix", () => {
      const variants = generateBrandVariants("socialmedia");
      expect(variants).toContain("socialmedia");
      expect(variants).toContain("social");
      expect(variants).toContain("social media");
    });

    it("does not strip if base would be too short", () => {
      const variants = generateBrandVariants("bbnews"); // "bb" is only 2 chars
      expect(variants).toContain("bbnews");
      expect(variants).not.toContain("bb"); // Too short
    });
  });

  describe("edge cases", () => {
    it("returns empty array for short brands", () => {
      expect(generateBrandVariants("ab")).toEqual([]);
      expect(generateBrandVariants("x")).toEqual([]);
    });

    it("returns empty array for empty input", () => {
      expect(generateBrandVariants("")).toEqual([]);
      expect(generateBrandVariants(null as any)).toEqual([]);
    });

    it("filters out stopwords", () => {
      const variants = generateBrandVariants("the-news");
      // "the" should be filtered out as it's a stopword
      expect(variants).not.toContain("the");
    });

    it("handles brands without hyphens or suffixes", () => {
      const variants = generateBrandVariants("reuters");
      expect(variants).toContain("reuters");
      expect(variants.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ============================================================================
// RELEVANCE FILTERING
// ============================================================================

function isRelevantSearchResult(
  result: { url: string; title: string; snippet: string },
  domain: string,
  brandVariants: string[]
): boolean {
  const url = (result.url ?? "").toLowerCase();
  const title = (result.title ?? "").toLowerCase();
  const snippet = (result.snippet ?? "").toLowerCase();
  const blob = `${title} ${snippet} ${url}`;

  const d = String(domain || "").toLowerCase();
  if (!d) return true;

  // Direct domain mention
  if (blob.includes(d) || blob.includes(`www.${d}`)) return true;

  // URL host match
  try {
    const host = new URL(result.url).hostname.toLowerCase().replace(/^www\./, "");
    if (host === d || host.endsWith(`.${d}`)) return true;
  } catch {
    // ignore URL parse errors
  }

  // Brand variant matching
  for (const variant of brandVariants) {
    if (variant.length >= 4 && blob.includes(variant)) return true;
  }

  return false;
}

describe("isRelevantSearchResult", () => {
  describe("direct domain matching", () => {
    it("matches exact domain in snippet", () => {
      const result = {
        url: "https://factcheck.org/article",
        title: "Fact Check Article",
        snippet: "Analysis of anti-spiegel.ru shows propaganda patterns",
      };
      expect(isRelevantSearchResult(result, "anti-spiegel.ru", [])).toBe(true);
    });

    it("matches domain in URL host", () => {
      const result = {
        url: "https://anti-spiegel.ru/article",
        title: "Some Article",
        snippet: "Some content without domain mention",
      };
      expect(isRelevantSearchResult(result, "anti-spiegel.ru", [])).toBe(true);
    });

    it("matches www variant", () => {
      const result = {
        url: "https://factcheck.org/article",
        title: "Analysis",
        snippet: "Review of www.foxnews.com content",
      };
      expect(isRelevantSearchResult(result, "foxnews.com", [])).toBe(true);
    });
  });

  describe("brand variant matching", () => {
    it("matches brand variant in snippet", () => {
      const result = {
        url: "https://factcheck.org/article",
        title: "Media Bias Review",
        snippet: "Fox News has been rated for bias",
      };
      const variants = generateBrandVariants("foxnews");
      expect(isRelevantSearchResult(result, "foxnews.com", variants)).toBe(true);
    });

    it("matches hyphenated brand variant", () => {
      const result = {
        url: "https://factcheck.org/article",
        title: "Russian Media Analysis",
        snippet: "Anti Spiegel publishes Kremlin-aligned content",
      };
      const variants = generateBrandVariants("anti-spiegel");
      expect(isRelevantSearchResult(result, "anti-spiegel.ru", variants)).toBe(true);
    });

    it("does not match short variants", () => {
      const result = {
        url: "https://factcheck.org/article",
        title: "News Analysis",
        snippet: "The fox jumped over the fence",
      };
      // "fox" is only 3 chars, should not match (minimum is 4)
      expect(isRelevantSearchResult(result, "foxnews.com", ["fox"])).toBe(false);
    });
  });

  describe("non-matching cases", () => {
    it("rejects unrelated results", () => {
      const result = {
        url: "https://unrelated.com/article",
        title: "Weather Report",
        snippet: "Tomorrow will be sunny",
      };
      expect(isRelevantSearchResult(result, "foxnews.com", ["foxnews", "fox news"])).toBe(false);
    });

    it("rejects results with only partial matches", () => {
      const result = {
        url: "https://factcheck.org/article",
        title: "News Analysis",
        snippet: "Many news outlets report differently",
      };
      // "news" alone should not match "foxnews.com"
      expect(isRelevantSearchResult(result, "foxnews.com", [])).toBe(false);
    });
  });
});

// ============================================================================
// SCORE TO RATING ALIGNMENT
// ============================================================================

import { scoreToFactualRating, SOURCE_TYPE_EXPECTED_CAPS } from "@/lib/source-reliability-config";

describe("Post-processing: Score-Rating Alignment", () => {
  it("score 0.37 should align to leaning_unreliable (0.29-0.42)", () => {
    expect(scoreToFactualRating(0.37)).toBe("leaning_unreliable");
  });

  it("score 0.45 should align to mixed (0.43-0.57)", () => {
    expect(scoreToFactualRating(0.45)).toBe("mixed");
  });

  it("score 0.08 should align to highly_unreliable (0.00-0.14)", () => {
    expect(scoreToFactualRating(0.08)).toBe("highly_unreliable");
  });
});

describe("Post-processing: Source Type Caps", () => {
  it("propaganda_outlet cap is 0.14", () => {
    expect(SOURCE_TYPE_EXPECTED_CAPS.propaganda_outlet).toBe(0.14);
    // A score of 0.37 would be capped to 0.14
    const originalScore = 0.37;
    const cappedScore = Math.min(originalScore, SOURCE_TYPE_EXPECTED_CAPS.propaganda_outlet);
    expect(cappedScore).toBe(0.14);
  });

  it("state_controlled_media cap is 0.42", () => {
    expect(SOURCE_TYPE_EXPECTED_CAPS.state_controlled_media).toBe(0.42);
    // A score of 0.55 would be capped to 0.42
    const originalScore = 0.55;
    const cappedScore = Math.min(originalScore, SOURCE_TYPE_EXPECTED_CAPS.state_controlled_media);
    expect(cappedScore).toBe(0.42);
  });

  it("scores below cap are not modified", () => {
    const originalScore = 0.10;
    const cappedScore = Math.min(originalScore, SOURCE_TYPE_EXPECTED_CAPS.propaganda_outlet);
    expect(cappedScore).toBe(0.10); // Already below cap
  });
});

// ============================================================================
// PROBLEM CASE SCENARIOS (based on reported issues)
// ============================================================================

describe("Problem Case: Propaganda Sources", () => {
  it("anti-spiegel.ru scenario: propaganda should be capped at 0.14", () => {
    // Given: LLM classifies as propaganda_outlet with score 0.37
    const llmScore = 0.37;
    const sourceType = "propaganda_outlet";
    
    // When: Post-processing applies cap
    const cap = SOURCE_TYPE_EXPECTED_CAPS[sourceType];
    const finalScore = cap !== undefined ? Math.min(llmScore, cap) : llmScore;
    
    // Then: Score should be capped to 0.14
    expect(finalScore).toBe(0.14);
    expect(scoreToFactualRating(finalScore)).toBe("highly_unreliable");
  });

  it("state-controlled media scenario: should be capped at 0.42", () => {
    // Given: LLM classifies as state_controlled_media with score 0.55
    const llmScore = 0.55;
    const sourceType = "state_controlled_media";
    
    // When: Post-processing applies cap
    const cap = SOURCE_TYPE_EXPECTED_CAPS[sourceType];
    const finalScore = cap !== undefined ? Math.min(llmScore, cap) : llmScore;
    
    // Then: Score should be capped to 0.42
    expect(finalScore).toBe(0.42);
    expect(scoreToFactualRating(finalScore)).toBe("leaning_unreliable");
  });
});

describe("Problem Case: Editorial Publisher (no cap)", () => {
  it("editorial_publisher should NOT be capped", () => {
    // Given: LLM classifies as editorial_publisher with score 0.78
    const llmScore = 0.78;
    const sourceType = "editorial_publisher";
    
    // When: Post-processing checks for cap
    const cap = SOURCE_TYPE_EXPECTED_CAPS[sourceType];
    const finalScore = cap !== undefined ? Math.min(llmScore, cap) : llmScore;
    
    // Then: Score should NOT be modified
    expect(finalScore).toBe(0.78);
    expect(scoreToFactualRating(finalScore)).toBe("reliable");
  });
});
