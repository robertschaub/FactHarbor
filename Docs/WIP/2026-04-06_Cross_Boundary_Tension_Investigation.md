# Cross-Boundary Tension Investigation

**Date:** 2026-04-06
**Role:** Senior Developer (Claude Code, Opus 4.6)
**Status:** Investigation complete, first-pass Stage 5 fix shipped, canary measurement pending

---

## 1. Problem Statement

The user observed that "Cross-Boundary Tensions" (displayed as `boundaryDisagreements` in the VerdictNarrative) appear to have increased in recent jobs. Investigation requested to determine whether this is a regression, and to find root causes.

## 2. Data Collected

- **40 local jobs** across 8+ commits analyzed
- **50 deployed jobs** analyzed
- Cross-boundary tensions extracted and compared per commit

### Aggregate findings

| Metric | Value |
|---|---|
| Local jobs with any tension | 78% (31/40) |
| Local avg tensions per job | 1.62 |
| Local max tensions | 4 |

### Per-commit comparison (key commits)

| Commit | Environment | Jobs | Avg Tensions | % With Tensions |
|---|---|---|---|---|
| `b7783872` (prev deploy) | Deployed | 9 | **0.44** | 33% |
| `2ec54047` (current deploy) | Deployed | 2 | **2.00** | 100% |
| `07cb2e0d` | Local | 5 | 1.20 | 60% |
| `ec7a8de8` | Local | 8 | 1.62 | 75% |
| `a405c20f` | Local | 13 | 1.69 | 69% |

### Important caveat

The apparent increase from `b7783872` (0.44) to `2ec54047` (2.00) is **confounded by topic selection**. The previous deploy batch included many simple factual queries (Meta exit, Earth round, Google ClaimReview) that inherently produce 0 tensions. The current deploy has only 2 jobs, both complex multi-dimensional claims. Topic-matched comparison is inconclusive.

### Families that consistently produce tensions

| Family | Avg Tensions | Pattern |
|---|---|---|
| Plastic recycling | 2.46 | Aggregate stats vs case-level analysis |
| Bolsonaro | 2.25 | Formal compliance vs substantive legitimacy |
| Swiss fact-checking | 1.27 | Institutional existence vs effectiveness |
| Meta/Earth/Google | 0.00 | Simple factual — no tensions expected |

## 3. Root Causes Found

### Root Cause 1 (HIGH) — Stale prompt variables `${aggregation}` and `${evidenceSummary}`

**Location:** `apps/web/prompts/claimboundary.prompt.md` lines 1373 and 1383

The VERDICT_NARRATIVE prompt template references `${aggregation}` and `${evidenceSummary}` but the `generateVerdictNarrative` function in `aggregation-stage.ts` **never provides them**. The `loadAndRenderSection` function leaves unresolved variables as literal text (`${aggregation}`, `${evidenceSummary}`).

**Impact:** The LLM generates the narrative without seeing:
- The actual aggregation weights, centrality, and harm-potential data
- The evidence summary (total items, source count, balance)

It must infer everything from `claimVerdicts` (with `boundaryFindings`) and `claimBoundaries`. Without the full picture, the LLM over-indexes on per-boundary directional differences because that's the only signal available.

**Age:** This has been stale since the original extraction at commit `6e347f09` (pre-March-25). It is NOT a recent regression — it was never wired.

### Root Cause 2 (MEDIUM) — No cap on `boundaryDisagreements` array

**Location:** `aggregation-stage.ts` line 367

The Zod schema `z.array(z.string()).optional()` has no `.max(N)` constraint. The prompt instruction says "Only include if boundaries meaningfully diverge" but this is a soft qualitative gate. The LLM can output as many tensions as it wants. Combined with Root Cause 1 (sparse input data), the LLM tends toward completeness — any directional difference between boundaries becomes a tension.

### Root Cause 3 (LOW) — `boundaryFindings` enrichment amplifies signal

**Source commit:** `03387283`

This commit added `boundaryFindings` per claim verdict to the VERDICT_NARRATIVE input, including `evidenceDirection` ("supports"/"contradicts") per boundary. Before this change, the LLM only had aggregate boundary info. After it, the LLM can see exactly which boundaries support vs contradict each claim.

**Assessment:** This is NOT a bug — it's correct enrichment. But combined with Root Cause 1 (missing context), the LLM treats every directional disagreement as a meaningful tension because it lacks the aggregation/summary context to calibrate significance.

## 4. Three Structural Tension Archetypes

These are **genuine analytical patterns**, not artifacts:

1. **Aggregate/macro vs case/sector data** (plastic recycling) — official statistics diverge from project-level or sector-specific analyses
2. **Formal compliance vs substantive legitimacy** (Bolsonaro) — judicial procedures were followed, but impartiality/independence is contested
3. **Institutional existence vs effectiveness** (Swiss fact-checking) — structures exist, but effectiveness is debatable

These tensions are analytically correct when they appear. The problem is not that they exist — it's that they appear too frequently and too uniformly because the LLM lacks calibration context.

## 5. Debate Outcome and Revised Fix Plan

### Captain's corrections to original Anthropic findings

The Captain reviewed the Anthropic findings and identified three corrections, all confirmed by GPT review:

1. **"No regression" framing is too broad.** Correct statement: no proven causal regression in `2ec54047`, but **yes a real increase in surfaced tensions** on the current deployed cohort (1.86 avg vs 0.60). The increase is partly explained by topic mix, but is empirically real.

2. **`.max(3)` cap is not a root cause.** Current problematic jobs are already at 1-3 tensions. The cap wouldn't change any of the jobs driving this investigation. Demoted to optional later guardrail.

3. **Missed root cause: stale advocate-era `boundaryFindings`.** Reconciliation in `verdict-stage.ts` line 1022 (`...original` spread) preserves the advocate's `boundaryFindings` unchanged into the final merged verdict. The reconciler updates `truthPercentage`, `confidence`, `reasoning`, `supportingEvidenceIds`, `contradictingEvidenceIds` — but NOT `boundaryFindings`. Stage 5 then narrates tensions from pre-challenge, pre-finalization per-boundary judgments. This is more important than the array cap.

4. **Content misclassification.** Some current "tensions" are really methodology asymmetry, thin singleton caveats, or boundary concentration diagnostics — these belong in `limitations`, not `boundaryDisagreements`.

### Revised fix plan (Captain-approved ranking)

#### Fix 1 (Priority 1) — Wire stale Stage 5 prompt variables

**What:** Resolve `${aggregation}` and `${evidenceSummary}` in `generateVerdictNarrative()`.

**How:**
- `aggregation`: Pass overall verdict, per-claim weights, weighted truth, and aggregation method. Already computed in `aggregateAssessment()`.
- `evidenceSummary`: Pass total evidence count, source count, boundary count, evidence direction balance, per-claim evidence counts.
- Both JSON-stringified and passed to `loadAndRenderSection`.

**Why:** The LLM needs aggregation context to calibrate tension significance.

**Risk:** Very low — adds data the prompt already expects.

#### Fix 2 (Priority 2) — Stop feeding stale advocate `boundaryFindings`

**What:** Ensure Stage 5 receives final, post-reconciliation boundary findings, not advocate-era ones.

**Options:**
- **A:** Have VERDICT_RECONCILIATION return updated `boundaryFindings` (prompt + schema + code change in reconciliation)
- **B:** Add a post-reconciliation boundary-summary derivation step using final evidence/citations (lighter, no prompt change to reconciler)

**Code location:** `verdict-stage.ts` line 1022 — `mergedVerdict` spread inherits advocate `boundaryFindings`.

**Why:** Stage 5 tension narration is based on pre-challenge judgments that may no longer reflect final claim state. This can overstate disagreement or narrate tensions that reconciliation resolved.

**Risk:** Medium — touches Stage 4 output contract. Needs careful testing.

#### Fix 3 (Priority 3) — Tighten Stage 5 prompt for content classification

**What:** Define `boundaryDisagreements` as requiring final-verdict-level directional divergence. Redirect methodology asymmetry, thin singleton caveats, and concentration diagnostics to `limitations`.

**Prompt instruction should specify:**
- `boundaryDisagreements`: Only when boundaries materially diverge on truth direction for the same claim (one supports, another contradicts). Must reflect final reconciled state.
- `limitations`: Methodology differences, data-quality asymmetries, thin evidence in single boundaries, boundary concentration issues.

**Risk:** Low — prompt-only change. May need tuning.

#### Fix 4 (Optional later) — Add `.max(3)` schema cap

**What:** `z.array(z.string()).max(3).optional()` + prompt instruction "at most 3, prioritized by significance."

**Why:** Defensive guardrail. Not a root cause fix.

### Do NOT change:
- Do not remove `boundaryFindings` from the input — the data is correct when it's current
- Do not remove `boundaryDisagreements` — the feature is valuable
- Do not add domain-specific filtering
- Do not roll back the `boundaryFindings` enrichment from `03387283`

## 6. Recommended Implementation Order (final consensus, 2026-04-06)

Three-way debate outcome (Anthropic → Captain correction → GPT review → Anthropic honest reassessment → GPT final concurrence):

1. **Fix 1** — wire `${aggregation}` and `${evidenceSummary}` (1-2 hours, very low risk)
2. **Fix 3** — tighten `VERDICT_NARRATIVE` prompt: material directional divergence → `boundaryDisagreements`; methodology/coverage caveats → `limitations` (30 min, low risk, highest-confidence lever for tension reduction)
3. **Re-measure** — rerun repeated canary families, compare tension counts
4. **Fix 2** — only if tensions remain problematic after Fix 1+3. Use safer path B: derive final boundary summary deterministically from reconciled evidence/citations, NOT by extending reconciler schema. (2-4 hours, medium risk)
5. **Fix 4** — `.max(3)` cap, deferred unless unbounded output becomes a problem

**Rationale for reordering Fix 3 before Fix 2:**
- Fix 3 directly controls what the LLM classifies as a tension — it's the most reliable low-risk behavior lever
- Fix 2 is architecturally correct (stale `boundaryFindings` are real) but the advocate's `evidenceDirection` is mostly still accurate because evidence items don't move through reconciliation — so the data-staleness impact on tension counts is uncertain
- GPT's pushback: stale findings also affect *salience* (a boundary can be over-represented in the narrative even when reconciliation downgraded it) — this is valid but doesn't change the sequencing for fastest tension reduction
- Measure after Fix 1+3 before committing to Fix 2's higher implementation cost

## 7. Implementation Update (2026-04-06)

Shipped:
- `08220154` — wired `${aggregation}` and `${evidenceSummary}` into `VERDICT_NARRATIVE` and tightened `boundaryDisagreements` classification
- `2acc4545` — corrected `sourceCount` to use unique `sourceUrl` values and added a dedicated Stage 5 prompt-contract test

Current status:
- consensus Fix 1 + Fix 3 path is now implemented
- the two immediate review findings are closed
- next step is canary reruns, not more architecture change

## 8. Summary

The cross-boundary tension increase is **empirically real** on the deployed cohort (1.86 avg → 0.60). It is **not a proven causal regression** from the `2ec54047` commit itself (which is docs-only), but it is a real quality signal that needs fixing.

Three root causes are active simultaneously:
1. Stale `${aggregation}`/`${evidenceSummary}` prompt variables (never wired since module extraction)
2. Stale advocate-era `boundaryFindings` surviving reconciliation into Stage 5
3. Under-specified prompt that doesn't distinguish substantive tensions from methodology caveats

The fix is a three-step sequence: wire the missing variables, fix the stale boundary findings propagation, then tighten the prompt classification rules.
