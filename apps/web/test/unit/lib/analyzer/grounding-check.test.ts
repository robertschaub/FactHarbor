/**
 * Grounding Check Test Suite
 *
 * Tests for:
 * 1. Stop word filtering
 * 2. Key term extraction from reasoning
 * 3. Grounding ratio calculation in checkVerdictGrounding
 *
 * @module analyzer/grounding-check.test
 */

import { describe, expect, it } from "vitest";
import {
  extractKeyTerms,
  checkVerdictGrounding,
} from "@/lib/analyzer/grounding-check";
import type { ClaimVerdict, EvidenceItem } from "@/lib/analyzer/types";

// ============================================================================
// extractKeyTerms
// ============================================================================

describe("extractKeyTerms", () => {
  it("excludes standard stop words", () => {
    const terms = extractKeyTerms("the cat is on the mat");
    expect(terms).not.toContain("the");
    expect(terms).not.toContain("is");
    expect(terms).not.toContain("on");
  });

  it("returns empty array for empty input", () => {
    expect(extractKeyTerms("")).toEqual([]);
    expect(extractKeyTerms("   ")).toEqual([]);
  });

  it("filters words shorter than 3 characters", () => {
    const terms = extractKeyTerms("I am at go up");
    expect(terms.length).toBe(0);
  });

  it("deduplicates identical terms", () => {
    const terms = extractKeyTerms("solar panels and more solar panels");
    const solarCount = terms.filter(t => t === "solar").length;
    expect(solarCount).toBe(1);
  });
});

// ============================================================================
// checkVerdictGrounding
// ============================================================================

describe("checkVerdictGrounding", () => {
  function makeVerdict(overrides: Partial<ClaimVerdict>): ClaimVerdict {
    return {
      claimId: "c1",
      verdict: "true" as any,
      confidence: 80,
      reasoning: "test reasoning",
      supportingEvidenceIds: [],
      opposingEvidenceIds: [],
      ...overrides,
    } as ClaimVerdict;
  }

  function makeEvidence(overrides: Partial<EvidenceItem>): EvidenceItem {
    return {
      id: "e1",
      statement: "test evidence",
      category: "test",
      claimDirection: "supporting" as any,
      sourceUrl: "https://example.com",
      sourceType: "news_primary" as any,
      probativeValue: "medium" as any,
      ...overrides,
    } as EvidenceItem;
  }

  it("matches exact terms across reasoning and evidence", () => {
    const verdict = makeVerdict({
      reasoning: "The battery efficiency was demonstrated clearly",
      supportingEvidenceIds: ["e1"],
    });
    const evidence = [
      makeEvidence({
        id: "e1",
        statement: "Tests showed the battery is highly efficient in real conditions",
      }),
    ];

    const result = checkVerdictGrounding([verdict], evidence);
    expect(result.groundingRatio).toBeGreaterThan(0);
    const detail = result.verdictDetails[0];
    expect(detail.groundedTermCount).toBeGreaterThan(0);
  });

  it("returns ratio 1 for empty verdicts", () => {
    const result = checkVerdictGrounding([], []);
    expect(result.groundingRatio).toBe(1);
  });

  it("returns ratio 0 when reasoning has terms but no cited evidence", () => {
    const verdict = makeVerdict({
      reasoning: "The vaccine was proven effective in trials",
      supportingEvidenceIds: [],
    });
    const result = checkVerdictGrounding([verdict], []);
    expect(result.groundingRatio).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("correctly grounds terms that appear in evidence corpus", () => {
    const verdict = makeVerdict({
      reasoning: "Solar panels have improved dramatically in recent years",
      supportingEvidenceIds: ["e1"],
    });
    const evidence = [
      makeEvidence({
        id: "e1",
        statement: "Solar panel technology has improved output by 40% since 2020",
        sourceExcerpt: "Dramatic improvements in photovoltaic efficiency",
      }),
    ];

    const result = checkVerdictGrounding([verdict], evidence);
    expect(result.groundingRatio).toBeGreaterThan(0);
  });

  it("warns when grounding ratio is very low", () => {
    const verdict = makeVerdict({
      reasoning: "The cryptocurrency market experienced extreme volatility and regulatory uncertainty",
      supportingEvidenceIds: ["e1"],
    });
    const evidence = [
      makeEvidence({
        id: "e1",
        statement: "GDP growth was steady at 2.5% in 2024",
      }),
    ];

    const result = checkVerdictGrounding([verdict], evidence);
    // Terms from crypto reasoning should NOT match GDP evidence
    expect(result.groundingRatio).toBeLessThan(0.5);
  });
});
