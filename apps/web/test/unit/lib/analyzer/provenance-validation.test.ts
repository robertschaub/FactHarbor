/**
 * Provenance Validation Test Suite (PR 5: Phase 0 Ground Realism)
 *
 * Tests the "Ground Realism" gate: Facts must have real source URLs + excerpts,
 * not LLM-synthesized content.
 *
 * @module analyzer/provenance-validation.test
 */

import { describe, expect, it } from "vitest";

import type { EvidenceItem, FetchedSource } from "@/lib/analyzer/types";
import {
  validateFactProvenance,
  filterFactsByProvenance,
  validateSourceProvenance,
  validateGroundedSearchProvenance,
} from "@/lib/analyzer/provenance-validation";

// ============================================================================
// FACT PROVENANCE VALIDATION TESTS
// ============================================================================

describe("validateFactProvenance", () => {
  it("accepts facts with valid URL and substantial excerpt", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "The court ruled in favor of the defendant",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/article",
      sourceTitle: "Court Decision",
      sourceExcerpt: "According to the court documents filed on March 15, the judge ruled in favor of the defendant.",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
    expect(result.failureReason).toBeUndefined();
  });

  it("rejects facts with missing sourceUrl", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "The court ruled in favor",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "",
      sourceTitle: "Court Decision",
      sourceExcerpt: "The judge ruled in favor of the defendant on March 15.",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("Missing sourceUrl");
  });

  it("rejects facts with invalid URL patterns (localhost)", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "Test fact",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "http://localhost:3000/test",
      sourceTitle: "Test",
      sourceExcerpt: "This is a test excerpt from localhost.",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("Invalid URL pattern");
  });

  it("rejects facts with invalid URL patterns (chrome://)", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "Test fact",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "chrome://settings",
      sourceTitle: "Test",
      sourceExcerpt: "This is a test excerpt from chrome with enough content.",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    // Chrome:// URLs fail the protocol check
    expect(result.failureReason).toContain("Non-HTTP");
  });

  it("rejects facts with malformed URLs", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "Test fact",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "not-a-url",
      sourceTitle: "Test",
      sourceExcerpt: "This is a test excerpt.",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("Malformed URL");
  });

  it("rejects facts with missing sourceExcerpt", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "The court ruled",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/article",
      sourceTitle: "Court Decision",
      sourceExcerpt: "",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("Missing sourceExcerpt");
  });

  it("rejects facts with too-short sourceExcerpt", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "The court ruled",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/article",
      sourceTitle: "Court Decision",
      sourceExcerpt: "Too short",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("too short");
  });

  it("rejects facts with synthetic LLM-generated excerpts (pattern: 'Based on the information')", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "The court ruled in favor",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/article",
      sourceTitle: "Court Decision",
      sourceExcerpt: "Based on the information available, the court ruled in favor of the defendant.",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("LLM-generated synthesis");
  });

  it("rejects facts with synthetic LLM-generated excerpts (pattern: 'According to')", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "The study found X",
      category: "study",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/study",
      sourceTitle: "Research",
      sourceExcerpt: "According to the analysis, the study found significant improvements.",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("LLM-generated synthesis");
  });

  it("rejects facts with synthetic LLM-generated excerpts (pattern: 'The source')", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "Revenue increased",
      category: "study",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/report",
      sourceTitle: "Financial Report",
      sourceExcerpt: "The source indicates that revenue increased by 25% in Q3.",
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("LLM-generated synthesis");
  });

  it("accepts excerpts that start with legitimate quoted text", () => {
    const fact: EvidenceItem = {
      id: "S1-F1",
      fact: "Revenue increased by 25%",
      category: "study",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/report",
      sourceTitle: "Q3 Report",
      sourceExcerpt: '"Revenue for Q3 2024 increased by 25% compared to Q3 2023," stated the CFO in the earnings call.',
    };

    const result = validateFactProvenance(fact);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
  });
});

// ============================================================================
// FILTER FACTS BY PROVENANCE TESTS
// ============================================================================

describe("filterFactsByProvenance", () => {
  it("filters out facts without valid provenance", () => {
    const facts: EvidenceItem[] = [
      {
        id: "S1-F1",
        fact: "Valid fact",
        category: "ruling",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com/valid",
        sourceTitle: "Valid Source",
        sourceExcerpt: "This is a valid excerpt with enough content to pass validation.",
      },
      {
        id: "S1-F2",
        fact: "Invalid fact (missing URL)",
        category: "ruling",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "",
        sourceTitle: "Invalid Source",
        sourceExcerpt: "This excerpt has a missing URL.",
      },
      {
        id: "S1-F3",
        fact: "Invalid fact (synthetic excerpt)",
        category: "ruling",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com/synthetic",
        sourceTitle: "Synthetic Source",
        sourceExcerpt: "Based on my analysis of the data, this appears to be synthetic.",
      },
    ];

    const result = filterFactsByProvenance(facts);

    expect(result.stats.total).toBe(3);
    expect(result.stats.valid).toBe(1);
    expect(result.stats.invalid).toBe(2);
    expect(result.validFacts).toHaveLength(1);
    expect(result.validFacts[0].id).toBe("S1-F1");
    expect(result.invalidFacts).toHaveLength(2);
  });

  it("returns all facts when all have valid provenance", () => {
    const facts: EvidenceItem[] = [
      {
        id: "S1-F1",
        fact: "Fact 1",
        category: "ruling",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com/source1",
        sourceTitle: "Source 1",
        sourceExcerpt: "This is a valid excerpt from the first source.",
      },
      {
        id: "S2-F1",
        fact: "Fact 2",
        category: "ruling",
        specificity: "high",
        sourceId: "S2",
        sourceUrl: "https://example.com/source2",
        sourceTitle: "Source 2",
        sourceExcerpt: "This is a valid excerpt from the second source.",
      },
    ];

    const result = filterFactsByProvenance(facts);

    expect(result.stats.total).toBe(2);
    expect(result.stats.valid).toBe(2);
    expect(result.stats.invalid).toBe(0);
    expect(result.validFacts).toHaveLength(2);
    expect(result.invalidFacts).toHaveLength(0);
  });
});

// ============================================================================
// SOURCE PROVENANCE VALIDATION TESTS
// ============================================================================

describe("validateSourceProvenance", () => {
  it("validates grounded search sources with real URLs", () => {
    const source: FetchedSource = {
      id: "S1",
      url: "https://example.com/article",
      title: "Article Title",
      fullText: "This is the full text of the article from the source.",
      trackRecordScore: 0.8,
      fetchedAt: new Date().toISOString(),
      category: "grounded_search",
      fetchSuccess: true,
    };

    const result = validateSourceProvenance(source);

    expect(result.hasProvenance).toBe(true);
    expect(result.hasGroundingMetadata).toBe(true);
    expect(result.failureReason).toBeUndefined();
  });

  it("rejects grounded search sources without URLs", () => {
    const source: FetchedSource = {
      id: "S1",
      url: "",
      title: "Article Title",
      fullText: "This is synthetic text without a real source.",
      trackRecordScore: 0.8,
      fetchedAt: new Date().toISOString(),
      category: "grounded_search",
      fetchSuccess: true,
    };

    const result = validateSourceProvenance(source);

    expect(result.hasProvenance).toBe(false);
    expect(result.hasGroundingMetadata).toBe(false);
    expect(result.failureReason).toContain("missing URL");
  });

  it("rejects grounded search sources with invalid URLs", () => {
    const source: FetchedSource = {
      id: "S1",
      url: "javascript:void(0)",
      title: "Invalid Source",
      fullText: "This has an invalid URL.",
      trackRecordScore: 0.8,
      fetchedAt: new Date().toISOString(),
      category: "grounded_search",
      fetchSuccess: true,
    };

    const result = validateSourceProvenance(source);

    expect(result.hasProvenance).toBe(false);
    expect(result.hasGroundingMetadata).toBe(false);
    expect(result.failureReason).toContain("invalid URL");
  });

  it("rejects grounded search sources with synthetic fullText", () => {
    const source: FetchedSource = {
      id: "S1",
      url: "https://example.com/article",
      title: "Article",
      fullText: "Based on my analysis, here is what I found about the topic.",
      trackRecordScore: 0.8,
      fetchedAt: new Date().toISOString(),
      category: "grounded_search",
      fetchSuccess: true,
    };

    const result = validateSourceProvenance(source);

    expect(result.hasProvenance).toBe(false);
    expect(result.hasGroundingMetadata).toBe(false);
    expect(result.failureReason).toContain("LLM synthesis");
  });

  it("validates non-grounded sources with valid URLs", () => {
    const source: FetchedSource = {
      id: "S1",
      url: "https://example.com/article",
      title: "Article Title",
      fullText: "Article content",
      trackRecordScore: 0.8,
      fetchedAt: new Date().toISOString(),
      category: "web_search",
      fetchSuccess: true,
    };

    const result = validateSourceProvenance(source);

    expect(result.hasProvenance).toBe(true);
    expect(result.hasGroundingMetadata).toBe(false); // Not a grounded source
    expect(result.failureReason).toBeUndefined();
  });
});

// ============================================================================
// GROUNDED SEARCH PROVENANCE VALIDATION TESTS
// ============================================================================

describe("validateGroundedSearchProvenance", () => {
  it("passes when all grounded sources have valid provenance", () => {
    const sources: FetchedSource[] = [
      {
        id: "S1",
        url: "https://example.com/article1",
        title: "Article 1",
        fullText: "Content from article 1",
        trackRecordScore: 0.8,
        fetchedAt: new Date().toISOString(),
        category: "grounded_search",
        fetchSuccess: true,
      },
      {
        id: "S2",
        url: "https://example.com/article2",
        title: "Article 2",
        fullText: "Content from article 2",
        trackRecordScore: 0.8,
        fetchedAt: new Date().toISOString(),
        category: "grounded_search",
        fetchSuccess: true,
      },
    ];

    const result = validateGroundedSearchProvenance(sources);

    expect(result.isValid).toBe(true);
    expect(result.groundedSources).toBe(2);
    expect(result.validGroundedSources).toBe(2);
    expect(result.invalidGroundedSources).toBe(0);
    expect(result.shouldFallbackToExternalSearch).toBe(false);
  });

  it("fails and requires fallback when grounded sources lack provenance", () => {
    const sources: FetchedSource[] = [
      {
        id: "S1",
        url: "", // Missing URL
        title: "Article 1",
        fullText: "Based on my analysis, here is what I found.",
        trackRecordScore: 0.8,
        fetchedAt: new Date().toISOString(),
        category: "grounded_search",
        fetchSuccess: true,
      },
      {
        id: "S2",
        url: "https://example.com/article2",
        title: "Article 2",
        fullText: "Content from article 2",
        trackRecordScore: 0.8,
        fetchedAt: new Date().toISOString(),
        category: "grounded_search",
        fetchSuccess: true,
      },
    ];

    const result = validateGroundedSearchProvenance(sources);

    expect(result.isValid).toBe(false);
    expect(result.groundedSources).toBe(2);
    expect(result.validGroundedSources).toBe(1);
    expect(result.invalidGroundedSources).toBe(1);
    expect(result.shouldFallbackToExternalSearch).toBe(true);
  });

  it("ignores non-grounded sources in validation", () => {
    const sources: FetchedSource[] = [
      {
        id: "S1",
        url: "https://example.com/article1",
        title: "Article 1",
        fullText: "Content from article 1",
        trackRecordScore: 0.8,
        fetchedAt: new Date().toISOString(),
        category: "web_search", // Not grounded
        fetchSuccess: true,
      },
      {
        id: "S2",
        url: "", // Invalid, but not grounded so ignored
        title: "Article 2",
        fullText: "Content from article 2",
        trackRecordScore: 0.8,
        fetchedAt: new Date().toISOString(),
        category: "web_search",
        fetchSuccess: true,
      },
    ];

    const result = validateGroundedSearchProvenance(sources);

    expect(result.isValid).toBe(false); // No grounded sources found
    expect(result.groundedSources).toBe(0);
    expect(result.validGroundedSources).toBe(0);
    expect(result.invalidGroundedSources).toBe(0);
    expect(result.shouldFallbackToExternalSearch).toBe(false); // No grounded sources to fallback from
  });
});
