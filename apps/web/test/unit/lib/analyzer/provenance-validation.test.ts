/**
 * Provenance Validation Test Suite (PR 5: Phase 0 Ground Realism)
 *
 * Tests the "Ground Realism" gate: Evidence items must have real source URLs + excerpts,
 * not LLM-synthesized content.
 *
 * @module analyzer/provenance-validation.test
 */

import { describe, expect, it } from "vitest";

import type { EvidenceItem, FetchedSource } from "@/lib/analyzer/types";
import {
  validateEvidenceProvenance,
  filterEvidenceByProvenance,
  validateSourceProvenance,
  validateGroundedSearchProvenance,
} from "@/lib/analyzer/provenance-validation";

// ============================================================================
// EVIDENCE PROVENANCE VALIDATION TESTS
// ============================================================================

describe("validateEvidenceProvenance", () => {
  it("accepts evidence items with valid URL and substantial excerpt", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "The court ruled in favor of the defendant",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/article",
      sourceTitle: "Court Decision",
      sourceExcerpt: "According to the court documents filed on March 15, the judge ruled in favor of the defendant.",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
    expect(result.failureReason).toBeUndefined();
  });

  it("rejects evidence items with missing sourceUrl", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "The court ruled in favor",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "",
      sourceTitle: "Court Decision",
      sourceExcerpt: "The judge ruled in favor of the defendant on March 15.",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("Missing sourceUrl");
  });

  it("accepts evidence items with localhost URLs (no pattern rejection)", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "Test evidence statement",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "http://localhost:3000/test",
      sourceTitle: "Test",
      sourceExcerpt: "This is a test excerpt from localhost.",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
    expect(result.failureReason).toBeUndefined();
  });

  it("rejects evidence items with invalid URL patterns (chrome://)", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "Test evidence statement",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "chrome://settings",
      sourceTitle: "Test",
      sourceExcerpt: "This is a test excerpt from chrome with enough content.",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    // Chrome:// URLs fail the protocol check
    expect(result.failureReason).toContain("Non-HTTP");
  });

  it("rejects evidence items with malformed URLs", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "Test evidence statement",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "not-a-url",
      sourceTitle: "Test",
      sourceExcerpt: "This is a test excerpt.",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("Malformed URL");
  });

  it("rejects evidence items with missing sourceExcerpt", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "The court ruled",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/article",
      sourceTitle: "Court Decision",
      sourceExcerpt: "",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.failureReason).toContain("Missing sourceExcerpt");
  });

  it("accepts evidence items with short sourceExcerpt (no minimum length)", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "The court ruled",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/article",
      sourceTitle: "Court Decision",
      sourceExcerpt: "Too short",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
    expect(result.failureReason).toBeUndefined();
  });

  it("accepts evidence items with 'Based on the information' excerpt (no synthetic pattern detection)", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "The court ruled in favor",
      category: "ruling",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/article",
      sourceTitle: "Court Decision",
      sourceExcerpt: "Based on the information available, the court ruled in favor of the defendant.",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
    expect(result.failureReason).toBeUndefined();
  });

  it("accepts evidence items with 'According to' excerpt (no synthetic pattern detection)", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "The study found X",
      category: "study",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/study",
      sourceTitle: "Research",
      sourceExcerpt: "According to the analysis, the study found significant improvements.",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
    expect(result.failureReason).toBeUndefined();
  });

  it("accepts evidence items with 'The source' excerpt (no synthetic pattern detection)", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "Revenue increased",
      category: "study",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/report",
      sourceTitle: "Financial Report",
      sourceExcerpt: "The source indicates that revenue increased by 25% in Q3.",
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
    expect(result.failureReason).toBeUndefined();
  });

  it("accepts excerpts that start with legitimate quoted text", () => {
    const evidenceItem: EvidenceItem = {
      id: "S1-E1",
      statement: "Revenue increased by 25%",
      category: "study",
      specificity: "high",
      sourceId: "S1",
      sourceUrl: "https://example.com/report",
      sourceTitle: "Q3 Report",
      sourceExcerpt: '"Revenue for Q3 2024 increased by 25% compared to Q3 2023," stated the CFO in the earnings call.',
    };

    const result = validateEvidenceProvenance(evidenceItem);

    expect(result.isValid).toBe(true);
    expect(result.severity).toBe("ok");
  });
});

// ============================================================================
// FILTER EVIDENCE BY PROVENANCE TESTS
// ============================================================================

describe("filterEvidenceByProvenance", () => {
  it("filters out evidence items without valid provenance", () => {
    const evidenceItems: EvidenceItem[] = [
      {
        id: "S1-E1",
        statement: "Valid evidence item",
        category: "ruling",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com/valid",
        sourceTitle: "Valid Source",
        sourceExcerpt: "This is a valid excerpt with enough content to pass validation.",
      },
      {
        id: "S1-E2",
        statement: "Invalid evidence item (missing URL)",
        category: "ruling",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "",
        sourceTitle: "Invalid Source",
        sourceExcerpt: "This excerpt has a missing URL.",
      },
      {
        id: "S1-E3",
        statement: "Evidence item with synthetic-looking excerpt (but passes without pattern detection)",
        category: "ruling",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com/synthetic",
        sourceTitle: "Synthetic Source",
        sourceExcerpt: "Based on my analysis of the data, this appears to be synthetic.",
      },
    ];

    const result = filterEvidenceByProvenance(evidenceItems);

    expect(result.stats.total).toBe(3);
    expect(result.stats.valid).toBe(2);
    expect(result.stats.invalid).toBe(1);
    expect(result.validEvidenceItems).toHaveLength(2);
    expect(result.validEvidenceItems[0].id).toBe("S1-E1");
    expect(result.validEvidenceItems[1].id).toBe("S1-E3");
    expect(result.invalidEvidenceItems).toHaveLength(1);
    expect(result.invalidEvidenceItems[0].id).toBe("S1-E2");
  });

  it("returns all evidence items when all have valid provenance", () => {
    const evidenceItems: EvidenceItem[] = [
      {
        id: "S1-E1",
        statement: "Evidence item 1",
        category: "ruling",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com/source1",
        sourceTitle: "Source 1",
        sourceExcerpt: "This is a valid excerpt from the first source.",
      },
      {
        id: "S2-E1",
        statement: "Evidence item 2",
        category: "ruling",
        specificity: "high",
        sourceId: "S2",
        sourceUrl: "https://example.com/source2",
        sourceTitle: "Source 2",
        sourceExcerpt: "This is a valid excerpt from the second source.",
      },
    ];

    const result = filterEvidenceByProvenance(evidenceItems);

    expect(result.stats.total).toBe(2);
    expect(result.stats.valid).toBe(2);
    expect(result.stats.invalid).toBe(0);
    expect(result.validEvidenceItems).toHaveLength(2);
    expect(result.invalidEvidenceItems).toHaveLength(0);
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

  it("accepts grounded search sources with non-HTTP URLs (no URL pattern validation)", () => {
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

    expect(result.hasProvenance).toBe(true);
    expect(result.hasGroundingMetadata).toBe(true);
    expect(result.failureReason).toBeUndefined();
  });

  it("accepts grounded search sources with synthetic-looking fullText (no synthesis detection)", () => {
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

    expect(result.hasProvenance).toBe(true);
    expect(result.hasGroundingMetadata).toBe(true);
    expect(result.failureReason).toBeUndefined();
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
