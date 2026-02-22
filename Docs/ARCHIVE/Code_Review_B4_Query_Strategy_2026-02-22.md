# Code Review: B-4 Query Strategy Mode + Per-Claim Budget

**Date:** 2026-02-22
**Reviewer:** Code Reviewer (Claude Code, Opus 4.6)
**Scope:** B-4 implementation — uncommitted working-tree changes
**Files:** `config-schemas.ts`, `claimboundary.prompt.md`, `types.ts`, `claimboundary-pipeline.ts`, `pipeline.default.json`, `claimboundary-pipeline.test.ts`, `config-schemas.test.ts`
**Build:** Passing | **Tests:** 958/958 passing (6 new)

---

## Finding Summary

| ID | Severity | File | Description |
|----|----------|------|-------------|
| B4-M1 | MEDIUM | `claimboundary-pipeline.ts` | In pro_con mode, partially-labeled LLM responses silently drop unlabeled queries |
| B4-M2 | MEDIUM | `claimboundary-pipeline.ts` | Budget exhaustion logged to console but not emitted as `AnalysisWarning` — no downstream visibility |
| B4-L1 | LOW | `claimboundary-pipeline.ts` | `variantType` provenance stripped from returned queries |
| B4-L2 | LOW | `claimboundary-pipeline.ts` | Interleaving order favors supporting queries when budget is odd |
| B4-L3 | LOW | `claimboundary-pipeline.ts` | Reorder of `allClaimsSufficient` before `findLeastResearchedClaim` |
| B4-L4 | LOW | `claimboundary-pipeline.test.ts` | No test for partial-label fallback in pro_con mode |

**CRITICAL:** 0 | **HIGH:** 0 | **MEDIUM:** 2 | **LOW:** 4

---

## Findings

### B4-M1 — Partially-Labeled Pro/Con Queries Silently Dropped (MEDIUM)

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — `generateResearchQueries()`, lines ~2231-2253

**Code path in pro_con mode:**
```typescript
const supportingQueries = validated.queries.filter((q) => q.variantType === "supporting");
const refutingQueries  = validated.queries.filter((q) => q.variantType === "refuting");
// ... interleave into `merged`
const normalized = merged.length > 0 ? merged : validated.queries.map(...);
```

**Problem:** If the LLM returns a mix of labeled and unlabeled queries (e.g., 1 "supporting", 1 "refuting", 1 without `variantType`), only the labeled queries enter `merged`. The unlabeled query is silently dropped because:
- It's excluded from both `supportingQueries` and `refutingQueries` (no match)
- The fallback `validated.queries` only activates when `merged.length === 0` (all unlabeled)
- No warning is logged for the dropped query

**Impact:** With default budget 8 and LLM typically returning 2-3 queries, losing one query per iteration is a ~33% research coverage reduction for that iteration. The prompt instructs "Each query object must include `variantType`" so full compliance should produce no unlabeled queries — but LLMs don't always follow instructions perfectly.

**Fix (minimal):**
```typescript
// After building merged[], append unlabeled queries:
const unlabeled = validated.queries.filter(
  (q) => q.variantType !== "supporting" && q.variantType !== "refuting"
);
const normalized = [...(merged.length > 0 ? merged : []), ...unlabeled]
  .slice(0, maxQueries);
// If merged is empty AND unlabeled is empty, fall back to validated.queries
if (normalized.length === 0) {
  return validated.queries.map(({ query, rationale }) => ({ query, rationale })).slice(0, maxQueries);
}
```

---

### B4-M2 — Budget Exhaustion Not Surfaced as AnalysisWarning (MEDIUM)

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — lines ~1697, ~1758, ~2020

**Code:** Three locations log budget exhaustion to console:
```typescript
console.info("[Stage2] Shared per-claim query budgets exhausted for all claims; ending main research loop.");
console.info("[Stage2] Shared per-claim query budgets exhausted for all claims; skipping contradiction loop.");
console.info(`[Stage2] Query budget exhausted for claim "${targetClaim.id}"; skipping ${iterationType} iteration.`);
```

**Problem:** `console.info()` is invisible in analysis results, calibration reports, and failure-mode metrics. If `perClaimQueryBudget` is set too low and research coverage is truncated, the user/operator has no visibility outside of server logs.

Existing patterns in this codebase emit `AnalysisWarning` for degraded-quality scenarios (e.g., `search_provider_error`, `verdict_fallback_partial`, `source_fetch_degradation`). Budget exhaustion is semantically similar — it reduces research coverage below what the pipeline would otherwise achieve.

**Impact:** In calibration runs, budget truncation would not appear in failure-mode metrics or significance notices. In production analysis, the result JSON would not indicate that research was budget-limited.

**Recommendation:** Add a new `AnalysisWarningType` (e.g., `"query_budget_exhausted"`) and emit it when all claims' budgets are exhausted AND the research loop terminates early because of it. Single-claim exhaustion (the inner `console.info`) can remain console-only since the per-claim level is expected behavior. The loop-level exhaustion (all claims exhausted) is the actionable signal.

---

### B4-L1 — `variantType` Provenance Stripped From Return (LOW)

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — `generateResearchQueries()` return type

The function's return type is `Promise<Array<{ query: string; rationale: string }>>`. The `variantType` field is explicitly stripped during normalization (`.map(({ query, rationale }) => ({ query, rationale }))`). Downstream code cannot distinguish supporting from refuting queries.

This is a conscious scope limitation for B-4. If future work needs provenance (e.g., tracking which evidence came from supporting vs. refuting queries, or adding `queryVariant` metadata to `SearchQuery`), the return type should be extended. No fix needed now.

---

### B4-L2 — Interleaving Favors Supporting Queries (LOW)

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — lines ~2237-2246

The interleaving places supporting before refuting in each pair:
```typescript
if (supportingQueries[i]) merged.push(supportingQueries[i]);
if (refutingQueries[i])  merged.push(refutingQueries[i]);
```

When `maxQueries` is odd (e.g., budget = 1), only the first supporting query survives `.slice(0, maxQueries)`. With default `perClaimQueryBudget: 8` and typical 2-3 queries per iteration, this rarely matters. But for tight budgets (budget = 1-2), the refuting query may be systematically dropped.

**Impact on input neutrality:** Could introduce a pro-supporting skew in tight-budget scenarios. Since B-4 defaults to `"legacy"` mode and `perClaimQueryBudget: 8`, this is not currently activated.

---

### B4-L3 — Reorder of Sufficiency Check Before Claim Selection (LOW)

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — lines ~1693-1704

Old order: `findLeastResearchedClaim()` → `allClaimsSufficient()` check
New order: `allClaimsSufficient()` check → budget filtering → `findLeastResearchedClaim()`

Behavioral analysis:
- Empty claims: both paths break (old: `null` from find; new: `every()` returns `true` vacuously)
- All claims sufficient: both break before further work
- Mixed sufficiency: old selects a claim before checking sufficiency; new checks first (efficiency improvement)

**Verdict:** Correct in all cases. The reorder is an efficiency improvement — avoids unnecessary `findLeastResearchedClaim()` when all claims are already sufficient. Not a bug, but it's an implicit behavior change outside B-4's stated scope.

---

### B4-L4 — No Test for Partial-Label Fallback in Pro/Con Mode (LOW)

**File:** `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`

The test "generates supporting + refuting variants in pro_con mode" provides a cleanly-labeled response (both queries have `variantType`). No test covers the edge case where some queries have `variantType` and others don't (B4-M1's scenario). Adding a test would validate both the current behavior (silent drop) and any future fix.

---

## AGENTS.md Compliance Check

### UCM Placement ✓
Both `queryStrategyMode` and `perClaimQueryBudget` are placed in UCM (pipeline config) — the correct tier for analysis-affecting parameters per AGENTS.md Configuration Placement rules.

### LLM Intelligence ✓
Query generation remains LLM-driven. The `queryStrategyMode` is passed as a prompt variable to the LLM, which generates the actual queries. No deterministic text-analysis logic added for query classification. The `variantType` filtering is structural routing (filtering by label), not semantic interpretation.

### No Hardcoded Keywords ✓
No domain-specific keywords, entity names, or topic-specific terms introduced. The prompt changes use generic language ("the claim", "supporting", "refuting").

### Input Neutrality ✓
Legacy mode is unchanged. Pro_con mode generates both supporting AND refuting variants, which should improve neutrality by explicitly requesting both sides. B4-L2 (interleaving order) is a minor concern for tight budgets but doesn't apply at default settings.

### Prompt Rules ✓
No test-case terms in the prompt. Examples use abstract language. The `queryStrategyMode` is injected as a template variable, not hardcoded inline.

### String Usage Boundary ✓
`queryStrategyMode` is used in: (1) LLM prompt text (allowed), (2) structural routing (`if (queryStrategyMode !== "pro_con")` — structural, not semantic). No language-dependent strings used for analytical decisions.

---

## Architecture Assessment

### Budget Framework Design — Well Structured ✓

The four helper functions (`getPerClaimQueryBudget`, `getClaimQueryBudgetUsed`, `getClaimQueryBudgetRemaining`, `consumeClaimQueryBudget`) form a clean, reusable API:
- Exported for testability and future consumers
- Per-claim isolation (not global) — correct for multi-claim analysis
- Double-gated enforcement (loop level + per-query level) prevents overconsumption
- Defensive initialization of `queryBudgetUsageByClaim` handles edge cases
- `consumeClaimQueryBudget` returns `boolean` for clean control flow

### Backward Compatibility — Correct ✓

- `queryStrategyMode: "legacy"` preserves existing behavior (no query generation changes)
- `perClaimQueryBudget: 8` is generous enough that existing research patterns are not constrained
- `generateResearchQueries()` new 7th parameter is optional with `?? 3` default
- All existing tests pass without modification to their assertions (only mock/state init updates)
- `GenerateQueriesOutputSchema` adds `variantType` as `.optional()` — backward-compatible

### Test Coverage — Good

| Path | Test Coverage |
|------|--------------|
| Legacy mode query generation | ✓ Explicit test |
| Pro_con variant generation | ✓ Explicit test |
| Budget enforcement (pre-exhausted) | ✓ Explicit test |
| Budget enforcement (mid-iteration) | ✓ Explicit test |
| Per-claim isolation | ✓ Explicit test |
| Config validation (enum, range) | ✓ Explicit test |
| Config defaults (omitted fields) | ✓ Explicit test |
| Partial-label LLM response | ✗ Not tested (B4-L4) |
| Budget exhaustion warning | ✗ Not tested (console.info only) |

---

## Overall Verdict

**GO — clean B-4 implementation, ready to commit.**

The implementation is well-structured with correct backward compatibility, proper UCM placement, and thorough test coverage for the main paths. The budget framework is reusable and the double-gated enforcement is defensive without being wasteful.

### Pre-commit recommended fixes (optional, not blocking):

**Fix 1 — B4-M1** (10 min): Append unlabeled queries after interleaving in pro_con mode instead of dropping them. This prevents silent query loss from partially-compliant LLM responses.

**Fix 2 — B4-M2** (15 min): Emit an `AnalysisWarning` with type `"query_budget_exhausted"` when all claims' budgets are exhausted and the research loop terminates early. Leave per-claim console.info as-is.

### Post-commit backlog:
- B4-L1: Extend return type to include `variantType` provenance when needed by downstream features
- B4-L2: Consider alternating starting variant (supporting/refuting) across iterations for neutrality
- B4-L4: Add test for partial-label fallback scenario

---

*Review complete.*
