# 2705 + e407 Root Fix — Architect Review

**Date:** 2026-03-29
**Role:** Lead Architect
**Status:** REVIEW-READY
**Problem jobs:**
- `2705c6bf1c904306bd81a2040025024f` — matrix labels mismatch, 2/3 claims `UNVERIFIED`
- `e407cba4ac354248b21d26a4fb0ceaf7` — duplicate final verdicts (4 for 2 claims), article driven by invalid Stage-4 verdicts
**Input family:** SRG SSR fact-checking disclosure (German)
**Related:** `b8e6`, `8640`, `cd4501` (same input family, Stage-1 decomposition)

---

## 1. Executive Summary

Jobs `2705` and `e407` expose a **pipeline integrity failure** at the D5 → Stage-4 transition. When all claims fail D5 sufficiency, the pipeline currently falls back to running Stage 4 on those same insufficient claims, then appends D5 `UNVERIFIED` fallbacks for the same claim IDs. That creates duplicate verdicts, a corrupted article verdict, and downstream UI confusion.

The strongest fix is **not** a UI patch, a salvage step, or aggregation-level cleanup. It is:

1. Introduce an explicit **assessable claim subset** after D5.
2. Run Stage 4 only on that subset.
3. Enforce **one final verdict per claim ID** before aggregation.
4. Align Coverage Matrix rendering with `coverageMatrix.claims`.

This is a root fix for the invalid `e407` state. It is not a full cure for the broader SRG SSR input family, because a residual Stage-1 factual conjunct split (`Werkzeuge` vs `Methoden`) still exists upstream. That recurrence driver should be handled as a separate next-step Stage-1 refinement, not conflated with the integrity fix.

---

## 2. What the Jobs Prove

### 2.1 Job e407 — decisive integrity failure

| Fact | Value |
|------|-------|
| Unique atomic claims | `AC_01` (Werkzeuge), `AC_02` (Methoden) |
| Evidence | 1 total item, 0 mapped to either claim |
| D5 result | Both insufficient |
| `sufficientClaims` | `[]` |
| Current fallback | `activeClaims = understanding.atomicClaims` |
| Stage 4 ran? | **Yes** — produced `MOSTLY-FALSE 15/30` for both |
| D5 fallbacks appended? | **Yes** — `UNVERIFIED 50/0` for both |
| Final verdict entries | **4** for 2 claim IDs |
| Article verdict | `MOSTLY-FALSE 15/30` |

**What this proves:** the pipeline created an invalid state. D5 already determined that no claim was assessable, but Stage 4 still ran and produced publishable verdicts. Those then coexisted with the D5 fallbacks, so the same claim IDs appeared twice in `claimVerdicts`.

This is the primary bug. It is not a presentation issue.

### 2.2 Job 2705 — separate UI contract bug

| Fact | Value |
|------|-------|
| Claims | `AC_01` (Werkzeuge), `AC_02` (Methoden), `AC_03` (combined) |
| D5 result | `AC_01` + `AC_02` insufficient, `AC_03` sufficient |
| Stage 4 ran on | `AC_03` only |
| Final verdict entries | 3 (1 publishable + 2 fallbacks) |
| Matrix claims | `['AC_03']` |
| UI label source | All `claimVerdicts` |

**What this proves:** the pipeline was internally coherent, but the Coverage Matrix UI rendered labels from the wrong source. The matrix body followed `coverageMatrix.claims`, while the header followed `claimVerdicts`.

This is a real bug, but it is downstream of the `e407` integrity failure.

### 2.3 The bugs are related but not identical

| Bug | Trigger | e407? | 2705? |
|-----|---------|:-----:|:-----:|
| All-insufficient Stage-4 fallback | `sufficientClaims.length === 0` | Yes | No |
| Matrix header/body mismatch | Matrix excludes some claims, UI still labels all verdicts | No | Yes |

---

## 3. Root Cause Hierarchy

### Layer 0 (upstream recurrence driver): residual Stage-1 over-fragmentation

The SRG SSR disclosure input still gets split into factual conjunct subclaims (`Werkzeuge`, `Methoden`) that are not independently research-productive. The shipped Stage-1 decomposition package reduced the `8640/cd4501` family, but this factual split remains a residual blind spot.

This matters because it increases the chance of the all-insufficient state. It does **not** excuse the invalid Stage-4 fallback.

### Layer 1 (primary integrity bug): D5 result is overridden

**Location:** [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L561)

```typescript
const activeClaims = sufficientClaims.length > 0 ? sufficientClaims : understanding.atomicClaims;
```

When all claims are insufficient, the code still feeds all claims into Stage 4. That is the incorrect transition.

### Layer 2 (missing invariant): final verdict set is not checked for uniqueness

After Stage 4 and D5 fallbacks are merged, the pipeline does not assert that each `claimId` appears only once before the result is handed to aggregation.

### Layer 3 (secondary bug): UI matrix contract mismatch

**Location:** [page.tsx](C:/DEV/FactHarbor/apps/web/src/app/jobs/[id]/page.tsx#L1871)

`claimLabels` are built from `claimVerdicts`, while the Coverage Matrix body renders from `coverageMatrix.claims`.

---

## 4. Option Analysis

### Option A: Short-circuit only

**What:** if `sufficientClaims.length === 0`, do not run Stage 4. Return only D5 `UNVERIFIED` fallbacks.

**Pros:** fixes the primary integrity bug directly.
**Cons:** leaves matrix rendering bug untouched; no invariant guard; does not reduce recurrence.
**Assessment:** necessary, but incomplete.

### Option B: Short-circuit + UI fix

**What:** Option A plus matrix labels derived from `coverageMatrix.claims`.

**Pros:** fixes the demonstrated integrity bug and the demonstrated rendering bug.
**Cons:** still lacks explicit verdict uniqueness enforcement; does not reduce recurrence.
**Assessment:** good minimum correction.

### Option C: Salvage step now

**What:** when all claims are insufficient, run an LLM claim-set reduction/salvage step before finalizing.

**Pros:** could rescue some over-fragmented inputs.
**Cons:** adds new pipeline complexity, duplicates Stage-1 intent downstream, and is not required to correct the invalid `e407` state.
**Assessment:** premature.

### Option D: Upstream-only fix

**What:** solve the whole issue only in Stage 1 by further tightening claim decomposition.

**Pros:** reduces recurrence.
**Cons:** even perfect Stage 1 would not justify the current all-insufficient fallback. Genuine sparse-evidence cases still need a correct terminal path.
**Assessment:** insufficient by itself.

### Option E: Integrity fix now, recurrence fix next

**What:** implement an explicit assessable-claims path now, plus UI alignment and verdict uniqueness invariant; then schedule the residual Stage-1 factual conjunct refinement as the next track.

**Pros:** fixes the invalid state at its creation point and still acknowledges the broader recurrence source.
**Cons:** requires a second follow-on task for Stage 1.
**Assessment:** **recommended**.

---

## 5. Recommended Root Fix

### 5.1 Replace the overloaded `activeClaims` pattern

The current `activeClaims` variable is doing too much. It drives:

- Stage 4 claim selection
- Coverage Matrix content
- and indirectly report display expectations

Those responsibilities diverge once D5 excludes claims.

The stronger design is:

- `assessableClaims = sufficientClaims`
- `insufficientClaims = ...`
- Stage 4 consumes only `assessableClaims`
- Coverage Matrix also uses `assessableClaims`
- D5 fallbacks are created only for `insufficientClaims`

When `assessableClaims` is empty:

- Stage 4 does not run
- Coverage Matrix is empty
- final claim verdicts are only D5 fallbacks
- article verdict resolves to a clean insufficiency result

### 5.2 Enforce uniqueness before aggregation

After the final verdict list is assembled in [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts), assert that `claimId`s are unique before sending the result onward.

This should be treated as:

- a pipeline invariant check
- ideally fail-fast in tests / development
- and at minimum an internal diagnostic in production

It should **not** be framed as “aggregation deduplication is the fix.”

### 5.3 Fix the matrix rendering contract

In [page.tsx](C:/DEV/FactHarbor/apps/web/src/app/jobs/[id]/page.tsx#L1871), build matrix labels from `coverageMatrix.claims`, not all `claimVerdicts`.

This prevents ghost or duplicated header columns and keeps the UI aligned with the actual matrix content.

### 5.4 Separate next-step recurrence work

The residual factual split (`Werkzeuge` vs `Methoden`) should be handled in a separate Stage-1 follow-up.

That is not needed to fix the invalid `e407` state, but it is needed to reduce how often this SRG family lands in all-insufficient territory.

---

## 6. Required Invariants

| Invariant | Enforcement point |
|-----------|------------------|
| Stage 4 runs only on D5-assessable claims | `claimboundary-pipeline.ts` before Stage 4 |
| One final verdict per `claimId` | Immediately after final verdict assembly |
| No publishable article verdict when every claim failed D5 | Before aggregation / final article result |
| Matrix columns must match `coverageMatrix.claims` | Job page UI |
| Duplicate claim IDs must never silently influence aggregation | Invariant check before aggregation |

---

## 7. What NOT to Change

| Item | Why not |
|------|---------|
| D5 thresholds | D5 is correctly identifying insufficient claims in `e407`. |
| Verdict-stage logic | The bug is that Stage 4 is receiving claims it should never see. |
| Stage 2 budget/search tuning | Not the source of the invalid final state. |
| UI-only patch as the main fix | Would hide the primary integrity bug. |
| Aggregation “pick highest confidence” dedup as the main repair | Symptom handling, not root repair. |
| Salvage step now | Adds complexity before the simpler integrity correction is in place. |

---

## 8. Implementation Sequence

### Step 1: Assessable-claims short-circuit

**What:** replace the current all-insufficient fallback with an explicit empty assessable set and guard Stage 4 accordingly.
**Type:** code-only
**Scope:** small change in [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts)
**Risk:** low

### Step 2: Verdict uniqueness invariant

**What:** after assembling final claim verdicts, assert unique `claimId`s before aggregation. If violated, surface a high-signal internal diagnostic; do not silently normalize this as the primary fix.
**Type:** code-only
**Scope:** small
**Risk:** low

### Step 3: Matrix label alignment

**What:** derive labels from `coverageMatrix.claims`.
**Type:** code-only
**Scope:** very small
**Risk:** minimal

### Step 4: Residual Stage-1 refinement

**What:** reopen the factual conjunct-splitting blind spot for this disclosure-claim family.
**Type:** likely prompt/Stage-1 follow-on
**Scope:** separate track
**Risk:** medium

---

## 9. Validation Gate

Required runs:

1. `e407` input family — expect no duplicate verdicts, no Stage-4 verdicts when all insufficient
2. `2705` input family — expect aligned matrix columns
3. `8640/cd4501` family — expect no regression on the recently fixed evaluative decomposition family
4. Bolsonaro multi-claim control — no regression
5. one genuinely sparse-evidence control — expect a clean insufficient result, not a publishable article verdict

Success criteria:

- no duplicate `claimId`s in final verdicts
- no publishable article verdict when all claims failed D5
- matrix headers exactly match `coverageMatrix.claims`
- uniqueness invariant never fires on clean runs

---

## 10. Final Judgment

**`Root-fix path justified`**

The root bug is the D5 → Stage-4 transition, not the UI and not aggregation. The all-insufficient fallback in [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L561) creates an invalid pipeline state by sending D5-rejected claims into Stage 4. The proper fix is to introduce an explicit assessable-claims path, enforce verdict uniqueness before aggregation, and align the Coverage Matrix UI to the matrix's own claim list.

This is a real root fix for `e407`. It does not by itself eliminate the residual Stage-1 conjunct-splitting recurrence, which should be handled as a separate follow-on.

---

**Recommended next task:** Implement assessable-claims short-circuit + verdict-uniqueness invariant + matrix label alignment

**Why this first:** It corrects the invalid final state at the exact point where it is created, requires no prompt change, and stops `e407`-class corruption without pretending the separate Stage-1 recurrence problem is already solved.
