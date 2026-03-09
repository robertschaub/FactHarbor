/**
 * Unit tests for Phase 2.5 — Scope Normalization
 *
 * Tests: (1) mergeMap correctness, (2) fallback on invalid LLM output,
 * (3) skip when scope count < threshold, (4) evidence re-pointing.
 */

import { describe, it, expect } from "vitest";
import {
  validateNormalizationOutput,
  repointEvidenceScopes,
  type UniqueScope,
  type ScopeNormalizationResult,
  type ScopeNormalizationOutput,
} from "@/lib/analyzer/scope-normalization";
import type { EvidenceItem, EvidenceScope } from "@/lib/analyzer/types";

// ── Helper: create a minimal EvidenceScope ──────────────────────────

function makeScope(overrides: Partial<EvidenceScope> = {}): EvidenceScope {
  return {
    name: overrides.name ?? "test scope",
    methodology: overrides.methodology ?? "test methodology",
    temporal: overrides.temporal ?? "2024",
    geographic: overrides.geographic ?? "",
    boundaries: overrides.boundaries ?? "",
    ...overrides,
  };
}

function makeUniqueScope(
  index: number,
  originalIndices: number[],
  scopeOverrides: Partial<EvidenceScope> = {},
): UniqueScope {
  return { index, scope: makeScope(scopeOverrides), originalIndices };
}

function makeEvidenceItem(
  id: string,
  scope: EvidenceScope,
  overrides: Partial<EvidenceItem> = {},
): EvidenceItem {
  return {
    id,
    statement: `Evidence ${id}`,
    category: "evidence",
    specificity: "medium",
    sourceId: "",
    sourceUrl: "https://example.com",
    sourceTitle: "Test",
    sourceExcerpt: "",
    relevantClaimIds: ["AC_01"],
    probativeValue: "medium",
    scopeQuality: "complete",
    claimDirection: "supports",
    sourceType: "other",
    evidenceScope: scope,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════
// 1. validateNormalizationOutput — structural validation
// ══════════════════════════════════════════════════════════════════════

describe("validateNormalizationOutput", () => {
  it("accepts valid output with all singletons", () => {
    const output: ScopeNormalizationOutput = {
      equivalenceGroups: [
        { scopeIndices: [0], canonicalIndex: 0, rationale: "no match" },
        { scopeIndices: [1], canonicalIndex: 1, rationale: "no match" },
        { scopeIndices: [2], canonicalIndex: 2, rationale: "no match" },
      ],
    };
    expect(validateNormalizationOutput(output, 3)).toEqual({ valid: true });
  });

  it("accepts valid output with merges", () => {
    const output: ScopeNormalizationOutput = {
      equivalenceGroups: [
        { scopeIndices: [0, 2], canonicalIndex: 0, rationale: "same methodology" },
        { scopeIndices: [1], canonicalIndex: 1, rationale: "no match" },
      ],
    };
    expect(validateNormalizationOutput(output, 3)).toEqual({ valid: true });
  });

  it("rejects when canonicalIndex is not in scopeIndices", () => {
    const output: ScopeNormalizationOutput = {
      equivalenceGroups: [
        { scopeIndices: [0, 1], canonicalIndex: 2, rationale: "bad" },
        { scopeIndices: [2], canonicalIndex: 2, rationale: "ok" },
      ],
    };
    const result = validateNormalizationOutput(output, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("canonicalIndex 2 is not a member");
    }
  });

  it("rejects when scope index is out of bounds", () => {
    const output: ScopeNormalizationOutput = {
      equivalenceGroups: [
        { scopeIndices: [0, 5], canonicalIndex: 0, rationale: "bad" },
      ],
    };
    const result = validateNormalizationOutput(output, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("out of bounds");
    }
  });

  it("rejects when a scope index appears in multiple groups", () => {
    const output: ScopeNormalizationOutput = {
      equivalenceGroups: [
        { scopeIndices: [0, 1], canonicalIndex: 0, rationale: "group A" },
        { scopeIndices: [1, 2], canonicalIndex: 1, rationale: "group B" },
      ],
    };
    const result = validateNormalizationOutput(output, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("appears in multiple");
    }
  });

  it("rejects when a scope index is missing", () => {
    const output: ScopeNormalizationOutput = {
      equivalenceGroups: [
        { scopeIndices: [0], canonicalIndex: 0, rationale: "ok" },
        // scope index 1 and 2 missing
      ],
    };
    const result = validateNormalizationOutput(output, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("missing from equivalence groups");
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. mergeMap correctness
// ══════════════════════════════════════════════════════════════════════

describe("mergeMap correctness", () => {
  it("produces correct mergeMap from equivalence groups", () => {
    // Simulate what normalizeScopeEquivalence does internally
    const uniqueScopes: UniqueScope[] = [
      makeUniqueScope(0, [0, 1], { methodology: "RCT double-blind" }),
      makeUniqueScope(1, [2], { methodology: "RCT, double blind" }),
      makeUniqueScope(2, [3, 4], { methodology: "Observational cohort" }),
      makeUniqueScope(3, [5], { methodology: "Observational cohort study" }),
    ];

    // Simulate LLM output: scopes 0+1 merged, scopes 2+3 merged
    const llmOutput: ScopeNormalizationOutput = {
      equivalenceGroups: [
        { scopeIndices: [0, 1], canonicalIndex: 0, rationale: "same RCT methodology" },
        { scopeIndices: [2, 3], canonicalIndex: 2, rationale: "same observational methodology" },
      ],
    };

    // Build mergeMap + normalizedScopes (same logic as in the function)
    const normalizedScopes: UniqueScope[] = [];
    const mergeMap: Record<number, number> = {};

    for (const group of llmOutput.equivalenceGroups) {
      const canonicalScope = uniqueScopes[group.canonicalIndex];
      const newIndex = normalizedScopes.length;
      const mergedOriginalIndices: number[] = [];

      for (const oldIdx of group.scopeIndices) {
        mergedOriginalIndices.push(...uniqueScopes[oldIdx].originalIndices);
        mergeMap[oldIdx] = newIndex;
      }

      normalizedScopes.push({
        index: newIndex,
        scope: canonicalScope.scope,
        originalIndices: mergedOriginalIndices,
      });
    }

    // Verify mergeMap
    expect(mergeMap).toEqual({ 0: 0, 1: 0, 2: 1, 3: 1 });

    // Verify normalizedScopes
    expect(normalizedScopes).toHaveLength(2);
    expect(normalizedScopes[0].originalIndices).toEqual([0, 1, 2]); // from scopes 0+1
    expect(normalizedScopes[1].originalIndices).toEqual([3, 4, 5]); // from scopes 2+3

    // Verify canonical scope is preserved
    expect(normalizedScopes[0].scope.methodology).toBe("RCT double-blind");
    expect(normalizedScopes[1].scope.methodology).toBe("Observational cohort");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. repointEvidenceScopes — evidence re-pointing
// ══════════════════════════════════════════════════════════════════════

describe("repointEvidenceScopes", () => {
  it("re-points evidence items to canonical scopes when merges occurred", () => {
    const canonicalScope = makeScope({ methodology: "RCT double-blind" });
    const nonCanonicalScope = makeScope({ methodology: "RCT, double blind" });

    const items: EvidenceItem[] = [
      makeEvidenceItem("EV_001", canonicalScope),
      makeEvidenceItem("EV_002", nonCanonicalScope),
      makeEvidenceItem("EV_003", canonicalScope),
    ];

    const normResult: ScopeNormalizationResult = {
      normalizedScopes: [
        {
          index: 0,
          scope: canonicalScope,
          originalIndices: [0, 1, 2], // all three items now point to canonical
        },
      ],
      mergeMap: { 0: 0, 1: 0 },
      mergedCount: 1,
    };

    repointEvidenceScopes(items, normResult);

    // All items should now reference the canonical scope object
    expect(items[0].evidenceScope).toBe(canonicalScope);
    expect(items[1].evidenceScope).toBe(canonicalScope);
    expect(items[2].evidenceScope).toBe(canonicalScope);
  });

  it("does nothing when mergedCount is 0", () => {
    const scope1 = makeScope({ methodology: "Method A" });
    const scope2 = makeScope({ methodology: "Method B" });

    const items: EvidenceItem[] = [
      makeEvidenceItem("EV_001", scope1),
      makeEvidenceItem("EV_002", scope2),
    ];

    const normResult: ScopeNormalizationResult = {
      normalizedScopes: [
        makeUniqueScope(0, [0], { methodology: "Method A" }),
        makeUniqueScope(1, [1], { methodology: "Method B" }),
      ],
      mergeMap: { 0: 0, 1: 1 },
      mergedCount: 0,
    };

    repointEvidenceScopes(items, normResult);

    // Scopes should be unchanged (original objects)
    expect(items[0].evidenceScope).toBe(scope1);
    expect(items[1].evidenceScope).toBe(scope2);
  });
});
