# Gate 1 Thesis-Direct Rescue Refinement — Two-Agent Debate

**Date:** 2026-03-26
**Role:** Lead Architect
**Status:** DECIDED — Gate 1 refinement declined (Captain Deputy approved 2026-03-26)
**Jobs:** `74d40863` (UNVERIFIED, 3 claims) vs `92f2ada7` (MOSTLY-TRUE, 2 claims)

---

## 1. Executive Summary

The two jobs present a clean natural experiment: same input, one run with AC_03 ("fairness") kept by the thesis-direct rescue, one run with AC_03 filtered by Gate 1. The MOSTLY-TRUE run filtered it; the UNVERIFIED run kept it.

However, **the data does not support the hypothesis that rescuing AC_03 caused the UNVERIFIED outcome.** The UNVERIFIED verdict is driven by AC_01 and AC_02 performing worse in Job A (lower truth, lower confidence, higher spread, worse evidence balance), not by AC_03 dragging them down. AC_03's own verdict (48/45, spread 6) is actually the most stable claim in the UNVERIFIED run.

The debate finds that **the proposed Gate 1 refinement would likely improve this specific input family's outcomes** but for the **wrong reason**: it would suppress a legitimate user question (fairness) rather than fix the actual instability mechanism (evidence variation on the procedural claims).

**Final judgment: `Review/characterize further before implementation`**

---

## 2. Advocate Case: Implement Now

### The rescue is empirically correlated with worse outcomes

| Metric | `92f2ada7` (AC_03 filtered) | `74d40863` (AC_03 rescued) |
|--------|---------------------------|---------------------------|
| Verdict | MOSTLY-TRUE (72.6/65.2) | UNVERIFIED (47.5/44.2) |
| Claim count | 2 | 3 |
| Stability | 2/2 stable | 0/3 stable |
| Evidence balance | 0.76 (supporting) | 0.38 (contradicting) |
| Warnings | 0 | 0 |

Filtering the evaluative "fairness" claim produces a focused 2-claim analysis on procedural compliance — a factual question. Keeping it adds an inherently evaluative dimension that:
- Generates ambiguous evidence (fairness is contested)
- Reduces the supporting-evidence ratio (more neutral/contradicting items)
- Adds a third claim whose verdict pulls the article truth toward MIXED

### The proposed refinement is narrowly scoped

The refinement only affects claims that:
1. Fail BOTH opinion AND specificity
2. Have `thesisRelevance === "direct"`
3. Do NOT satisfy any of: `isDimensionDecomposition`, `verifiability === "high"`, `category in (factual, procedural)`

For Job A's AC_03: `category=evaluative`, `verifiability=medium`, `isDimensionDecomposition=MISSING`. It would be filtered under the proposed refinement. AC_01 and AC_02 (`category=factual`, `verifiability=high`) would still be rescued.

### The existing rescue is too broad

Any claim with `thesisRelevance === "direct"` is currently rescued regardless of quality signals. This means a "Pizza is the best food" claim decomposed into "Pizza is the best food in terms of taste" would be rescued if `thesisRelevance=direct`, even though it's pure opinion with no verifiable dimension.

### The Stage 4 safety net argument is weakened

The original rescue argument was "Stage 4 handles evaluative claims with confidence calibration." But the data shows Stage 4 DID handle AC_03 (48/45, MIXED) — the problem is that having 3 claims instead of 2 changed the evidence allocation and research focus for ALL claims, degrading the procedural claims (AC_01/AC_02) too.

---

## 3. Challenger Case: Do Not Implement Now

### AC_03 is not the cause of the UNVERIFIED outcome

The critical comparison within Job A:

| Claim | Truth | Conf | Spread | Stable |
|-------|-------|------|--------|--------|
| AC_01 (procedural law) | 52 | 41 | 16 | No |
| AC_02 (constitutional) | 42 | 47 | 10 | No |
| AC_03 (fairness) | 48 | 45 | **6** | No |

**AC_03 is the MOST stable and best-calibrated claim in the UNVERIFIED run.** If AC_03 caused the problem, we'd expect it to be the outlier — but it's the least volatile. The UNVERIFIED outcome is driven by AC_01's low confidence (41, spread 16) and AC_02's low truth (42), not by AC_03.

### The evidence balance difference is the dominant signal

| Metric | Filtered (MOSTLY-TRUE) | Rescued (UNVERIFIED) |
|--------|------------------------|---------------------|
| Evidence supporting | 22 | 19 |
| Evidence contradicting | **7** | **31** |
| Evidence neutral | 34 | 46 |
| Balance ratio | **0.76** | **0.38** |

Job A found 4.4× more contradicting evidence than Job B. This is a Stage 2 evidence-acquisition difference — different search results returned different evidence mixes. Removing AC_03 would not change which web sources were fetched for AC_01 and AC_02.

### The runtime-path investigation argues against Stage-1 fixes

The Plastik DE investigation (same session) concluded: "The Stage-1 safeguards did not fail. They worked for what they check." It recommended "Downstream characterization justified" and explicitly NOT recommended new Stage-1 prompt changes. The same principle applies here — Gate 1 is working correctly; the UNVERIFIED is driven by evidence variation.

### Filtering AC_03 suppresses a legitimate user question

The user explicitly asked about fairness: "...and the resulting verdicts were fair." Filtering this dimension means the pipeline silently ignores part of the user's input. A MIXED/UNVERIFIED verdict on the fairness dimension is more useful than no assessment at all.

### The `verifiability` and `isDimensionDecomposition` fields are unreliable

- `isDimensionDecomposition` is MISSING from both Bolsonaro jobs' claims — the field was not set. The proposed refinement relies on it as a rescue condition, but it won't fire.
- `verifiability` is `.optional().catch(undefined)` and is stripped when `claimAnnotationMode === "off"`. Whether it's populated depends on the UCM config state.
- `category` is populated (`factual`/`procedural`/`evaluative`) but the proposed refinement uses it as a positive signal — `evaluative` claims would be filtered, which is exactly the class where the user might want a nuanced verdict.

### Over-filtering risk is real

Any future input that explicitly asks an evaluative question would lose that dimension:
- "Was the trial fair?" → fairness claim filtered
- "Was the policy effective?" → effectiveness claim filtered (if classified as evaluative + non-specific)
- "Was the decision justified?" → justification claim filtered

These are exactly the kinds of questions the verdict debate was designed to handle.

---

## 4. Reconciled Analysis

### What the two jobs prove

1. **Same input can produce 2 or 3 claims.** Gate 1 filtering of the fairness claim is non-deterministic — it depends on whether the LLM classifies it as `passedOpinion=false` (which it does consistently) combined with whether `thesisRelevance=direct` (which triggers the rescue).

2. **The 2-claim version happens to be more stable.** But this is correlation, not causation. Job B also happened to find a much more supportive evidence mix (ratio 0.76 vs 0.38). We cannot separate "fewer claims helped" from "better evidence helped."

3. **The fairness claim itself is well-behaved.** AC_03 in Job A has the lowest spread (6pp) and a plausible MIXED verdict (48/45). It's not the instability source.

### Does the runtime-path investigation undermine the case?

**Yes, substantially.** The investigation established that Stage-1 safeguards are working correctly and that UNVERIFIED outcomes on broad evaluative inputs are primarily evidence-driven. The Bolsonaro case shows the same pattern: the UNVERIFIED is driven by evidence variation (0.38 vs 0.76 ratio), not by claim decomposition.

### Does the proposed refinement target the right mechanism?

**No.** The refinement targets Gate 1 claim filtering as the fix, but the actual driver is evidence variation. Filtering AC_03 would reduce the claim count from 3 to 2, but it wouldn't change the evidence mix that AC_01 and AC_02 receive. A future run with 2 claims and an unfavorable evidence mix could still produce UNVERIFIED.

### What is the regression risk?

**High for legitimate evaluative inputs.** The refinement would filter:
- "Were the verdicts fair?" → fairness dimension lost
- "Was the policy effective?" → effectiveness dimension lost
- Any evaluative user question where the predicate fails Gate 1's opinion+specificity check

These are core use cases for a fact-checking platform. Silently dropping them is worse than producing a nuanced MIXED/UNVERIFIED verdict.

---

## 5. Recommended Next Step

**Do not implement the Gate 1 refinement.**

Instead, follow the sequence already recommended by the runtime-path investigation and the EVD-1 policy:

1. **Ship the observability fixes** (store `inputClassification` and `contractValidation` result) — these are uncontroversial and close diagnostic blind spots.

2. **Ship the structural_consistency bug fix** (verdict label relabeling after spread adjustment) — already approved, independent of this debate.

3. **Run Bolsonaro × 5 on current code** with the same input text. Measure the spread under EVD-1 (Class E: legal/political, acceptable ≤ 20pp). If 4 of 5 are LEANING-TRUE or better and the article spread is ≤ 20pp, the UNVERIFIED in `74d40863` is a single-tail outlier (amber).

4. **Only if UNVERIFIED recurs in ≥ 2 of 5 runs:** investigate whether research-budget allocation across 3 claims (vs 2) materially degrades per-claim evidence quality. This would be the right mechanism to investigate, not Gate 1 filtering.

---

## 6. Final Judgment

**`Review/characterize further before implementation`**

**Required next check:** `Bolsonaro × 5 EVD-1 measurement`

**Why that first:** The two-job comparison shows a large evidence-balance difference (0.38 vs 0.76) as the dominant driver, with Gate 1 filtering as a secondary correlation. A 5-run measurement would establish whether the UNVERIFIED is a recurring pattern or a single-tail outlier. If it recurs, the evidence-allocation mechanism (not Gate 1) is the right investigation target. If it doesn't recur, no fix is needed.
