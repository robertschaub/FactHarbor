/**
 * Unit tests for Phase 2.5 — Scope Normalization
 *
 * Tests: (1) mergeMap correctness, (2) fallback on invalid LLM output,
 * (3) source-scope preservation through semantic grouping.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateNormalizationOutput,
  normalizeScopeEquivalence,
  type UniqueScope,
  type ScopeNormalizationOutput,
} from "@/lib/analyzer/scope-normalization";
import type { EvidenceScope } from "@/lib/analyzer/types";

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


vi.mock("ai", () => ({ generateText: vi.fn(), Output: { object: vi.fn(() => ({})) } }));
vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({ model: {} })),
  extractStructuredOutput: vi.fn(result => result.output),
  getStructuredOutputProviderOptions: vi.fn(), getPromptCachingOptions: vi.fn(),
}));
vi.mock("@/lib/analyzer/prompt-loader", () => ({ loadAndRenderSection: vi.fn() }));
import { generateText } from "ai";
import { loadAndRenderSection } from "@/lib/analyzer/prompt-loader";

describe("normalizeScopeEquivalence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAndRenderSection).mockResolvedValue({ content: "fixture" } as any);
  });
  it("groups reordered representatives without altering original scopes and sends all dimensions", async () => {
    const scopes = [
      makeUniqueScope(0, [0, 1], { methodology: "Methode A", temporal: "2022", analyticalDimension: "dimensão A", additionalDimensions: { período: "原文" } }),
      makeUniqueScope(1, [2], { methodology: "Método A", temporal: "2025", boundaries: "Limite A" }),
      makeUniqueScope(2, [3], { methodology: "Methode B" }),
    ];
    const original = structuredClone(scopes);
    vi.mocked(generateText).mockResolvedValue({ output: { equivalenceGroups: [
      { scopeIndices: [2], canonicalIndex: 2, rationale: "fixture" },
      { scopeIndices: [1, 0], canonicalIndex: 1, rationale: "fixture" },
    ] } } as any);
    const result = await normalizeScopeEquivalence(scopes, {} as any);
    expect(result.mergeMap).toEqual({ 0: 1, 1: 1, 2: 0 });
    expect(result.normalizedScopes.map(scope => scope.originalIndices)).toEqual([[3], [2, 0, 1]]);
    expect(result.normalizedScopes[1].scope).toBe(scopes[1].scope);
    expect(scopes).toEqual(original);
    const sent = JSON.parse(vi.mocked(loadAndRenderSection).mock.calls[0][2].scopes);
    expect(sent[0]).toMatchObject({ analyticalDimension: "dimensão A", additionalDimensions: { período: "原文" } });
  });
  it.each(["invalid", "error", "no_merge"])("retains identity on %s", async kind => {
    const scopes = [makeUniqueScope(0, [0]), makeUniqueScope(1, [1])];
    if (kind === "error") vi.mocked(generateText).mockRejectedValueOnce(new Error("fixture"));
    else vi.mocked(generateText).mockResolvedValueOnce({ output: { equivalenceGroups: kind === "invalid"
      ? [{ scopeIndices: [0, 1], canonicalIndex: 9, rationale: "fixture" }]
      : [{ scopeIndices: [0], canonicalIndex: 0, rationale: "fixture" }, { scopeIndices: [1], canonicalIndex: 1, rationale: "fixture" }],
    } } as any);
    const result = await normalizeScopeEquivalence(scopes, {} as any);
    expect(result).toEqual({ normalizedScopes: scopes, mergeMap: { 0: 0, 1: 1 }, mergedCount: 0 });
    expect(result.normalizedScopes).toBe(scopes);
  });
});
