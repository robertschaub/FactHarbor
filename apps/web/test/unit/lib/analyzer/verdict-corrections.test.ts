import { describe, expect, it } from "vitest";

import type { EvidenceItem } from "@/lib/analyzer/types";
import { detectCounterClaim } from "@/lib/analyzer/verdict-corrections";

function makeFact(overrides: Partial<EvidenceItem>): EvidenceItem {
  return {
    id: overrides.id ?? "F1",
    fact: overrides.fact ?? "Example fact",
    category: overrides.category ?? "evidence",
    specificity: overrides.specificity ?? "high",
    sourceId: overrides.sourceId ?? "S1",
    sourceUrl: overrides.sourceUrl ?? "https://example.com",
    sourceTitle: overrides.sourceTitle ?? "Example Source",
    sourceExcerpt: overrides.sourceExcerpt ?? "Example excerpt",
    contextId: overrides.contextId,
    isContestedClaim: overrides.isContestedClaim,
    claimSource: overrides.claimSource,
    claimDirection: overrides.claimDirection,
    fromOppositeClaimSearch: overrides.fromOppositeClaimSearch,
    evidenceScope: overrides.evidenceScope,
  };
}

describe("detectCounterClaim", () => {
  it("does NOT tag thesis-aligned refuted subclaims as counter-claims just because evidence contradicts the thesis", () => {
    const thesis =
      "Using Technology A for transport is more efficient than using Technology B";
    const claim =
      "Standard efficiency measurement methodologies favor Technology A over Technology B";

    const facts = [
      makeFact({ id: "F1", claimDirection: "contradicts" }),
      makeFact({ id: "F2", claimDirection: "contradicts" }),
      makeFact({ id: "F3", claimDirection: "contradicts" }),
    ];

    // Claim is rated mostly false; refuting evidence may all be "contradicts" vs thesis,
    // but that should not automatically make this a counter-claim.
    expect(detectCounterClaim(claim, thesis, 20, facts)).toBe(false);
  });

  it("detects swapped comparative claims as counter-claims (text-based)", () => {
    const thesis =
      "Using Technology A for transport is more efficient than using Technology B";
    const counter =
      "Using Technology B for transport is more efficient than using Technology A";

    expect(detectCounterClaim(counter, thesis, 85, [])).toBe(true);
  });

  it("can fall back to evidence direction when the claim is true-ish and most evidence contradicts the thesis", () => {
    const thesis =
      "Using Technology A for transport is more efficient than using Technology B";
    const claim =
      "Technology B is more efficient than Technology A";

    const facts = [
      makeFact({ id: "F1", claimDirection: "contradicts" }),
      makeFact({ id: "F2", claimDirection: "contradicts" }),
      makeFact({ id: "F3", claimDirection: "contradicts" }),
    ];

    expect(detectCounterClaim(claim, thesis, 85, facts)).toBe(true);
  });

  it("detects polarity-opposite evaluative terms (fair vs unfair)", () => {
    expect(detectCounterClaim("The trial was unfair", "The trial was fair", 20, [])).toBe(
      true,
    );
  });
});

