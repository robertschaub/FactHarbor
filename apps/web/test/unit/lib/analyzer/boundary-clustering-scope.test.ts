import { describe, expect, it } from "vitest";
import { scopeFingerprint } from "@/lib/analyzer/boundary-clustering-stage";
import type { EvidenceScope } from "@/lib/analyzer/types";

// S4: analyticalDimension was dropped by the evidence mappings (Stage-2, preliminary,
// seed), so this clustering-key component was permanently empty even though
// scopeFingerprint() reads it. These tests assert the field is part of the clustering
// fingerprint, so once the mappings preserve it, clustering can split boundaries along
// the analytical dimension (its documented purpose, types.ts EvidenceScope.analyticalDimension).
const base = (extra: Partial<EvidenceScope> = {}): EvidenceScope =>
  ({ name: "n", methodology: "m", temporal: "t", geographic: "g", boundaries: "b", ...extra } as unknown as EvidenceScope);

describe("scopeFingerprint — analyticalDimension is part of the clustering key (S4)", () => {
  it("incorporates analyticalDimension into the fingerprint", () => {
    const withDim = scopeFingerprint(base({ analyticalDimension: "use-phase efficiency" }));
    const withoutDim = scopeFingerprint(base());
    expect(withDim).not.toBe(withoutDim);
    expect(withDim.toLowerCase()).toContain("use-phase efficiency");
  });

  it("separates two scopes that differ ONLY by analyticalDimension", () => {
    const a = scopeFingerprint(base({ analyticalDimension: "full-pathway" }));
    const b = scopeFingerprint(base({ analyticalDimension: "use-phase-only" }));
    expect(a).not.toBe(b);
  });

  it("is stable for identical analyticalDimension", () => {
    expect(scopeFingerprint(base({ analyticalDimension: "X" }))).toBe(scopeFingerprint(base({ analyticalDimension: "X" })));
  });
});
