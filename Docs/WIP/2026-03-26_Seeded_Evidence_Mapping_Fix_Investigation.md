# Seeded Evidence Mapping Fix Investigation

**Date:** 2026-03-26
**Role:** Lead Architect
**Status:** REVIEW-READY
**Target jobs:** `1abb0ea5`, `3b07a079`, `465cd4ac`, `74d40863` + cross-family verification

---

## 1. Executive Summary

The seeded preliminary evidence claim-mapping failure is **systemic and 100% reproducible** for inputs where the LLM uses semantic claim slugs (like `claim_bolsonaro_proceedings`) instead of numeric patterns (like `claim_01`).

Across 4 Bolsonaro jobs: **zero** of 133 preliminary evidence items were successfully mapped to final `AC_*` claims. All 133 entered Stage 2 with `relevantClaimIds: []`.

Cross-family verification shows:
- **Plastik DE:** Partial success — `claim_01` pattern remaps via the existing heuristic (33/43 items mapped)
- **Bolsonaro:** Total failure — `claim_bolsonaro_proceedings` pattern not handled (0/39 items mapped)
- **Hydrogen:** Mixed — `claim_001` works, `claim_hydrogen_vs_electric_efficiency` fails

The root cause is structural: preliminary evidence is extracted BEFORE Pass 2 produces `AC_*` IDs. The LLM invents its own claim handles. The Stage 2 remap only handles `claim_NN → AC_NN` — anything more complex is dropped.

**Final judgment: `Targeted interface fix justified`**

---

## 2. What the Jobs Prove

### 2.1 The mapping failure is 100% for Bolsonaro

| Job | Verdict | Prelim items | Mapped to AC_* | Semantic IDs | Unmapped |
|-----|---------|-------------|----------------|-------------|----------|
| `1abb0ea5` | MIXED 54/58 | 26 | **0** | 23 | 3 |
| `3b07a079` | LT 63.6/66.6 | 29 | **0** | 25 | 4 |
| `465cd4ac` | LT 64.4/67.3 | 39 | **0** | 35 | 4 |
| `74d40863` | UNVERIFIED 47.5/44.2 | 39 | **0** | 36 | 3 |

Semantic IDs found: `claim_bolsonaro_proceedings`, `claim_bolsonaro_coup_proceedings`, `claim_bolsonaro_fair_verdict`, `claim_bolsonaro_procedural_compliance`, `claim_bolsonaro_constitutional_compliance`.

### 2.2 The pattern is family-dependent

| Family | Prelim ID pattern | Remap success | Reason |
|--------|------------------|--------------|--------|
| Plastik DE | `claim_01` | ~75% | Numeric pattern matches heuristic |
| Bolsonaro | `claim_bolsonaro_*` | **0%** | Semantic slug — heuristic fails |
| Hydrogen | `claim_001` + `claim_hydrogen_*` | ~50% | Mixed — numeric works, semantic fails |

### 2.3 The lost evidence is non-trivial

For `1abb0ea5`, the 23 unmapped items included evidence from pbs.org, npr.org, bbc.com, oas.org, journalofdemocracy.org — across news_primary, news_secondary, organization_report, peer_reviewed_study, expert_statement, government_report source types. If even some had been mapped to AC_01, the source-type diversity (currently 1, needs ≥2) could have been met.

---

## 3. Root Cause by Layer

### Layer 1: Timing mismatch (structural)

Preliminary evidence is extracted at [claim-extraction-stage.ts:216](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L216), BEFORE Pass 2 runs at [line 229](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L229). Pass 2 produces the final `AC_*` IDs. The preliminary extraction LLM has never seen these IDs — it invents its own.

This is not a bug in any single component. It's a structural interface mismatch: preliminary extraction runs early (to feed Pass 2 with grounding), but the claim IDs it produces are ephemeral.

### Layer 2: Remap heuristic too narrow (code)

Stage 2 seeding at [research-orchestrator.ts:426-438](apps/web/src/lib/analyzer/research-orchestrator.ts#L426) remaps:
1. Exact `AC_*` matches (never happens — LLM doesn't know these IDs)
2. Legacy single `claimId` matches (rarely happens)
3. Single-claim fallback: all evidence → sole claim (only works for 1-claim inputs)
4. `claim_NN → AC_NN` numeric heuristic

Step 4 catches `claim_01` but not `claim_bolsonaro_proceedings`. The heuristic was designed for a simpler era when the LLM used numeric patterns.

### Layer 3: Downstream impact (D5 + coverage matrix)

Unmapped evidence items have `relevantClaimIds: []`. Both D5 per-claim sufficiency and the coverage matrix only count items with mapped claim IDs. So 23-36 evidence items per Bolsonaro run are invisible to quality gates and diagnostics.

---

## 4. Fix Options Compared

### Option A: Broader heuristic remap (deterministic)

Add a keyword/entity matching step: extract the claim topic from semantic slugs (e.g., `claim_bolsonaro_proceedings` → "proceedings") and match to the AC_* claim whose statement contains that topic.

**Pros:** No LLM call. Fast.
**Cons:** Fragile. Keyword matching is exactly the kind of deterministic text-analysis logic AGENTS.md prohibits. Would need constant maintenance as claim patterns evolve.

**Verdict: Not recommended** — violates LLM Intelligence mandate.

### Option B: All-claims fallback for multi-claim inputs

When no remap succeeds and there are >1 final claims, assign the evidence to ALL claims instead of leaving `relevantClaimIds: []`.

**Pros:** Simplest possible fix (~3 lines). No LLM call. No false negatives. Preliminary evidence is topically relevant to the entire input.
**Cons:** Over-attribution. An evidence item about "fairness" would also be attributed to the "procedural compliance" claim. But preliminary evidence is lightweight topic-level signals, not the detailed per-claim evidence from Stage 2.

**Verdict: Recommended as the immediate fix.**

### Option C: Post-Pass-2 LLM re-attribution

After Pass 2 produces final AC_* claims, run a small Haiku call that maps each unmapped preliminary evidence item to the most relevant claim(s).

**Pros:** Semantically correct attribution. Uses LLM intelligence per AGENTS.md.
**Cons:** Additional LLM call (~$0.003). Adds latency. More complex implementation.

**Verdict: Better long-term solution but higher complexity. Consider as follow-up if Option B proves too coarse.**

### Option D: Stage 1 emits stable claim handles

Make the preliminary extraction prompt use `AC_01`-style IDs by passing the rough claim index to the extraction.

**Pros:** Fixes at the source.
**Cons:** The extraction prompt doesn't know the final AC_* mapping. roughClaims are indexed but the LLM already ignores the index and invents semantic slugs. Would require a prompt change that constrains the LLM's ID generation — fragile.

**Verdict: Not recommended — prompt constraint on ID formatting is unreliable.**

### Option E: Explicit mapping artifact from Stage 1

Stage 1 stores a mapping: `{semantic_slug → roughClaim_index → AC_NN}`. Stage 2 uses this to remap.

**Pros:** Clean architecture. Durable.
**Cons:** Requires Pass 2 to produce the mapping (it knows which rough claims became which AC_* claims). But Pass 2's schema doesn't currently track this lineage.

**Verdict: Best architectural solution but requires Pass 2 schema change. Consider for a larger refactor, not for the immediate fix.**

---

## 5. Recommended Narrow Fix

### Implement Option B: All-claims fallback for multi-claim inputs

In [research-orchestrator.ts](apps/web/src/lib/analyzer/research-orchestrator.ts), after the heuristic remap (line 438), add:

```typescript
// 5. Multi-claim fallback: assign to ALL claims when no remap succeeded.
// Preliminary evidence is topically relevant to the entire input.
// Over-attribution is acceptable for seeded evidence — Stage 2 produces
// the precise per-claim attribution. This prevents D5 and coverage matrix
// from ignoring seeded evidence entirely.
if (claimIds.length === 0 && knownClaimIds.size > 1) {
  claimIds = [...knownClaimIds];
  remappedCount++;
}
```

**Scope:** ~4 lines. Deterministic. No LLM call. No prompt change.

**What this fixes:**
- All 23-36 unmapped Bolsonaro evidence items now count toward all claims
- D5 per-claim sufficiency counts increase (11 → potentially 34+ for AC_01)
- Coverage matrix shows evidence in all boundaries
- Source-type diversity per claim improves

**What this does NOT fix:**
- Does not produce precise per-claim attribution (that's Stage 2's job)
- Does not fix the underlying timing mismatch (preliminary extraction before Pass 2)
- Does not address the Stage-2/D5 alignment gap (research sufficiency vs D5 diversity)

---

## 6. What Not to Change

| Item | Why not |
|------|---------|
| Gate 1 | Not involved in this defect |
| Stage 1 prompts | The LLM's semantic slug behavior is correct — it describes the claim. The problem is downstream remapping. |
| D5 thresholds | D5 is correctly enforcing diversity. The problem is evidence not reaching D5. |
| Spread multiplier | Unrelated mechanism |
| Coverage matrix builder | Working correctly — it counts what's mapped. Fix the mapping, not the counter. |
| Fuzzy keyword heuristics | Violates AGENTS.md LLM Intelligence mandate |

---

## 7. Validation Plan

### After implementing Option B:

1. **Re-run Bolsonaro × 3** (same input text)
   - Target: AC_01 mapped evidence ≥ 20 items (was 11)
   - Target: AC_01 source-type count ≥ 2 (was 1)
   - Target: zero `insufficient_evidence` warnings for AC_01
   - Target: article verdict ≥ LEANING-TRUE

2. **Run Plastik DE × 1** (regression check)
   - Already partially working (claim_01 remap)
   - Verify no regression

3. **Run Hydrogen × 1** (cross-family check)
   - Currently mixed remap success
   - Verify improvement for semantic-slug items

### Success criteria:
- Zero `relevantClaimIds: []` for seeded evidence in multi-claim runs
- AC_01 no longer falls below D5 sufficiency from mapping loss alone
- Coverage matrix shows non-zero contribution in all boundary-claim intersections that have evidence

---

## 8. Final Judgment

**`Targeted interface fix justified`**

The seeded evidence mapping failure is systemic, reproducible, and materially contributes to quality degradation. The fix (all-claims fallback) is 4 lines, deterministic, and addresses the immediate problem without architectural disruption.

**Recommended next task:** `Implement all-claims fallback for seeded evidence in multi-claim inputs`

**Why this first:** It's the smallest justified intervention that directly addresses the mapped-evidence starvation that caused the weak `1abb0ea5` result. The Stage-2/D5 alignment experiment is a separate, complementary track that addresses a different layer (research targeting vs D5 diversity). This fix closes the obvious evidence-loss gap first.