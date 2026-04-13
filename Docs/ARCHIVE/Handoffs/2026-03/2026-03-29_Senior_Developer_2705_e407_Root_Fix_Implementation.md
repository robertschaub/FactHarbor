# 2705 / e407 Root Fix — Assessable-Claims Path + Verdict Uniqueness + Matrix Alignment

**Date:** 2026-03-30
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)

---

## 1. Executive Summary

Implemented the approved root fix for the all-insufficient fallback integrity failure and Coverage Matrix mismatch. Three changes:

1. **Assessable-claims path:** D5-rejected claims no longer re-enter Stage 4. Only `sufficientClaims` proceed.
2. **Verdict uniqueness invariant:** Duplicate `claimId`s in final verdicts trigger a hard failure (throw), not silent continuation.
3. **Coverage Matrix labels:** Derived from `coverageMatrix.claims` (assessable subset), not all `claimVerdicts`.

Validation: 5 jobs, zero duplicate verdict IDs, matrix columns correctly aligned, no regression on controls.

---

## 2. What Changed

### Part 1 — Assessable-claims path (`claimboundary-pipeline.ts`)

**Before:** `activeClaims = sufficientClaims.length > 0 ? sufficientClaims : understanding.atomicClaims`
When all claims failed D5, this sent ALL claims (including insufficient ones) back into Stage 4, creating duplicate verdicts.

**After:** `assessableClaims = sufficientClaims` — no fallback. Stage 4 and Coverage Matrix both use only the assessable subset. If every claim is insufficient, Stage 4 receives an empty array and produces no verdicts; only D5 UNVERIFIED fallbacks appear.

### Part 2 — Verdict uniqueness invariant (`claimboundary-pipeline.ts`)

After assembling `claimVerdicts = [...sufficientVerdicts, ...insufficientVerdicts]`, a uniqueness check runs. If any `claimId` appears more than once, the pipeline throws with `PIPELINE INVARIANT VIOLATION` and records a `verdict_integrity_failure` error warning. This is a hard failure, not a silent dedup.

### Part 3 — Coverage Matrix label alignment (`page.tsx`)

**Before:** `claimLabels` derived from `claimVerdicts.map(...)` — included insufficient fallback claims not in the matrix body.

**After:** `claimLabels` derived from `result.coverageMatrix.claims.map(...)` — only assessable claims. Guard changed from `claimVerdicts.length > 0` to `result.coverageMatrix.claims?.length > 0`.

---

## 3. Tests

1462 existing tests pass. No new tests added in this commit — the invariant is a throw-on-violation, which would surface immediately in any test that triggers it. The primary validation is the live run batch.

---

## 4. Validation Run Table

| # | Job ID | Input | Claims | Assessable | Verdict | T% | C% | Dup IDs | Matrix Claims |
|---|--------|-------|--------|-----------|---------|----|----|---------|---------------|
| 1 | `5f1f96f6` | e407 (Werkzeuge/Methoden) | 2 | 2 | MIXED | 57.7 | 70 | None | AC_01, AC_02 |
| 2 | `55299b20` | 2705 (effizient/wirksam) | 2 | **1** | LEANING-TRUE | 62 | 68 | None | **AC_01 only** |
| 3 | `11c5295a` | 8640/cd4501 (repeat) | 3 | **1** | LEANING-TRUE | 58 | 65 | None | **AC_01 only** |
| 4 | `64b5d5d6` | Bolsonaro compound | 2 | 2 | LEANING-TRUE | 69 | 63 | None | AC_01, AC_02 |
| 5 | `c7c3528c` | Flat Earth control | 2 | 2 | FALSE | 0 | 95 | None | AC_01, AC_02 |

---

## 5. Outcome by Target Job Family

### 2705 family — FIXED
- 2 claims: AC_01 (methods+tools) assessed, AC_02 (efficient+effective) insufficient → UNVERIFIED
- Matrix shows only `['AC_01']` — **no header/body mismatch**
- No duplicate verdict IDs

### e407 family — CLEAN
- 2 claims, both assessed. No UNVERIFIED starvation on this run.
- Matrix shows both claims. No mismatch.

### 8640/cd4501 family — CORRECT BEHAVIOR
- 3 claims: AC_01 assessed, AC_02+AC_03 insufficient → UNVERIFIED
- Matrix shows only `['AC_01']`
- No duplicates

### Bolsonaro — NO REGRESSION
- 2 claims (procedural + fairness), both assessed. LEANING-TRUE 69/63.

### Flat Earth — NO REGRESSION
- 2 claims, both assessed. FALSE 0/95. Clean control.

---

## 6. Risks / Regressions

| Risk | Status |
|------|--------|
| All-insufficient sends claims to Stage 4 | **Eliminated** — assessable path only |
| Duplicate verdict IDs | **Eliminated** — invariant throws on violation |
| Matrix header/body mismatch | **Eliminated** — labels from `coverageMatrix.claims` |
| Bolsonaro regression | Not observed |
| Flat Earth regression | Not observed |
| All-insufficient produces empty article | Expected and correct — UNVERIFIED fallbacks aggregate to UNVERIFIED |

---

## 7. Final Judgment

**Recommendation: Keep.** The fix addresses the root cause (D5 fallback re-sending rejected claims to Stage 4) and the downstream symptoms (duplicate verdicts, matrix mismatch). The verdict uniqueness invariant provides a safety net against future regressions. No analytical behavior changed for claims that pass D5.

---

*5 validation jobs, zero exclusions. 1462 tests pass, build clean.*
