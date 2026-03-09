/**
 * Phase 2.5 — Scope Normalization: Zod schema + validation + result type
 * FOR CAPTAIN REVIEW — not yet wired into production code.
 */

import { z } from "zod";

// ── LLM Output Schema ──────────────────────────────────────────────

export const ScopeNormalizationOutputSchema = z.object({
  equivalenceGroups: z
    .array(
      z.object({
        /** Indices of scopes in this equivalence group (from input array) */
        scopeIndices: z.array(z.number().int().nonneg()).min(1),
        /** Index of the canonical representative — MUST be a member of scopeIndices */
        canonicalIndex: z.number().int().nonneg(),
        /** Why these scopes are semantically equivalent (or why this is a singleton) */
        rationale: z.string(),
      }),
    )
    .min(1),
});

export type ScopeNormalizationOutput = z.infer<
  typeof ScopeNormalizationOutputSchema
>;

// ── Return type from normalizeScopeEquivalence() ────────────────────

// UniqueScope is imported from claimboundary-pipeline.ts in production;
// repeated here for review clarity.
interface UniqueScope {
  index: number;
  scope: any; // EvidenceScope in production
  originalIndices: number[];
}

export interface ScopeNormalizationResult {
  /** Reduced set of truly unique scopes (canonical representatives only) */
  normalizedScopes: UniqueScope[];
  /**
   * Maps original UniqueScope index → canonical UniqueScope index in normalizedScopes[].
   * Record<number, number> (plain object, not Map — serializable for logging/metrics).
   *
   * Example: { 0: 0, 1: 0, 2: 1, 3: 2 }
   *   → scopes 0 and 1 merged into normalizedScopes[0]
   *   → scope 2 became normalizedScopes[1]
   *   → scope 3 became normalizedScopes[2]
   */
  mergeMap: Record<number, number>;
  /** How many scopes were merged away (originalCount - normalizedScopes.length) */
  mergedCount: number;
}

// ── Post-parse validation (deterministic) ───────────────────────────

export function validateNormalizationOutput(
  parsed: ScopeNormalizationOutput,
  scopeCount: number,
): { valid: true } | { valid: false; reason: string } {
  const allIndices = new Set<number>();

  for (const group of parsed.equivalenceGroups) {
    // canonicalIndex must be a member of its own scopeIndices
    if (!group.scopeIndices.includes(group.canonicalIndex)) {
      return {
        valid: false,
        reason: `canonicalIndex ${group.canonicalIndex} is not a member of scopeIndices [${group.scopeIndices.join(", ")}]`,
      };
    }

    for (const idx of group.scopeIndices) {
      // No index out of bounds
      if (idx >= scopeCount) {
        return {
          valid: false,
          reason: `scopeIndex ${idx} is out of bounds (max: ${scopeCount - 1})`,
        };
      }
      // No index appears in multiple groups
      if (allIndices.has(idx)) {
        return {
          valid: false,
          reason: `scopeIndex ${idx} appears in multiple equivalence groups`,
        };
      }
      allIndices.add(idx);
    }
  }

  // Every scope index (0..scopeCount-1) must appear exactly once
  for (let i = 0; i < scopeCount; i++) {
    if (!allIndices.has(i)) {
      return {
        valid: false,
        reason: `scopeIndex ${i} is missing from equivalence groups`,
      };
    }
  }

  return { valid: true };
}
