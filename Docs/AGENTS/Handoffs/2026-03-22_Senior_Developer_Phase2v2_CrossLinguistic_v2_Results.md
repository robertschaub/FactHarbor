# 2026-03-22 Senior Developer — Phase 2 v2: Contrarian Cross-Linguistic Supplementation Results (FAIL)

**Task:** Validate Phase 2 v2 (contrarian supplementary pass + pool balance gate). Run 6-input batch. Evaluate gate. Revert if failed.

---

## Implementation Recap (v2 vs v1)

| Change | v1 | v2 |
|--------|----|----|
| iterationType in supplementary pass | `"main"` | `"contrarian"` |
| Budget bound | `maxSourcesPerIteration` (up to 8) | `suppQueriesPerClaim` (2) |
| Pool balance gate | None | `majorityRatio > supplementarySkewThreshold (0.55)` |
| Empty pool handling | Always fires | ratio=1.0 → always fires |

---

## Validation Runs

| Run | Input | Truth% | Conf | Verdict | Δ truth vs baseline | Δ conf vs v1 |
|-----|-------|--------|------|---------|---------------------|--------------|
| EN exact | "Plastic recycling is pointless" | **60%** | **64%** | LEANING-TRUE | −3pp | **+40pp** |
| DE exact | "Plastik recycling bringt nichts" | **74%** | **24%** | MOSTLY-TRUE | **+53pp (wrong dir)** | −43pp |
| EN para | "Plastic recycling brings no real benefit." | **37%** | **24%** | LEANING-FALSE | **−18pp (correct dir)** | — |
| FR exact | "Le recyclage du plastique ne sert a rien" | **27%** | **70%** | MOSTLY-FALSE | +12pp | **+46pp** |
| Hydrogen | "Using hydrogen for cars is more efficient than electricity" | **10%** | **83%** | FALSE | stable | stable |
| Bolsonaro | "Was the Bolsonaro judgment (trial) fair..." | **59%** | **24%** | LEANING-TRUE | stable | **−41pp** |

**Pre-Phase-2 baselines (for reference):**

| Run | Truth% | Conf | Verdict |
|-----|--------|------|---------|
| EN exact | 63% | 74% | LEANING-TRUE |
| DE exact | 21% | 77% | MOSTLY-FALSE |
| EN para | 55% | — | UNVERIFIED |
| FR exact | 15% | 73% | MOSTLY-FALSE |

---

## Supplementary Pass — Actual Activation

| Run | Pool | Supports | Contradicts | Ratio | Gate (>0.55) | Fired? |
|-----|------|----------|-------------|-------|--------------|--------|
| EN exact | 176 | 89 | 40 | 0.51 | NO | **BLOCKED** |
| DE exact | 199 | 115 | 47 | **0.58** | YES | **FIRED** |
| EN para | 151 | 40 | 77 | 0.51 | NO | **BLOCKED** |
| FR exact | 152 | 33 | 83 | 0.55 | NO (= not >) | **BLOCKED** |
| Hydrogen | 91 | 6 | 50 | 0.55 | NO | **BLOCKED** |
| Bolsonaro | 84 | 40 | 25 | 0.48 | NO | **BLOCKED** |

**The supplementary pass fired for exactly 1 of 6 runs.** The skew gate (ratio > 0.55) blocked all other runs because the main + contradiction loops had already brought pools to ratio ≤ 0.55.

---

## Per-Claim Breakdown

### EN exact (60% / 64%)
| Claim | Truth | Conf | Verdict |
|-------|-------|------|---------|
| AC_01 | 75% | 82% | MOSTLY-TRUE |
| AC_02 | 58% | 43% | UNVERIFIED |
| AC_03 | 36% | 52% | LEANING-FALSE |
**Inter-claim spread: 39pp** (threshold: 25pp → contextConsistency fires)

### DE exact (74% / 24%) — supplementary fired
| Claim | Truth | Conf | Verdict |
|-------|-------|------|---------|
| AC_01 | 85% | 88% | MOSTLY-TRUE |
| AC_02 | 50% | 24% | UNVERIFIED |
| AC_03 | 60% | 63% | LEANING-TRUE |
**Inter-claim spread: 35pp** (contextConsistency fires)

### EN para (37% / 24%)
| Claim | Truth | Conf | Verdict |
|-------|-------|------|---------|
| AC_01 | 18% | 82% | MOSTLY-FALSE |
| AC_02 | 50% | 24% | UNVERIFIED |
| AC_03 | 60% | 72% | LEANING-TRUE |
**Inter-claim spread: 42pp** (contextConsistency fires)

### FR exact (27% / 70%)
| Claim | Truth | Conf | Verdict |
|-------|-------|------|---------|
| AC_01 | 22% | 75% | MOSTLY-FALSE |
| AC_02 | 38% | 72% | LEANING-FALSE |
| AC_03 | 18% | 61% | MOSTLY-FALSE |
**Inter-claim spread: 20pp** (< 25pp → no contextConsistency penalty — this run is clean)

---

## Gate Evaluation

| Criterion | Target | Actual | Attribution | Result |
|-----------|--------|--------|-------------|--------|
| EN exact conf ≥ 50% | was 24% in v1 | **64%** | Run variance (pass not fired) | ✅ PASS |
| FR exact conf ≥ 50% | was 24% in v1 | **70%** | Run variance (pass blocked at 0.55) | ✅ PASS |
| EN para truth ≤ 55% | was 63% wrong dir | **37%** | Run variance (pass not fired) | ✅ PASS |
| Spread EN exact vs DE/FR ≤ 35pp | was 47pp | EN↔FR: 33pp | Mixed | ✅ PASS (marginal) |
| Hydrogen conf stable ±15pp | ~80% baseline | **83%** | Stable | ✅ PASS |
| Bolsonaro conf stable ±15pp | ~65% baseline | **24%** | Unknown (pass blocked) | ❌ FAIL |

**Formal gate: 5/6 PASS, 1 FAIL.**

---

## Root Cause: Mechanism Does Not Work As Designed

### Problem 1: Gate fires too rarely (5/6 blocked)
The skew threshold of 0.55 is higher than the typical post-loop pool ratio. After the main + contradiction loops run, evidence pools converge to ratio ≤ 0.55 in almost all cases. The supplementary pass never gets the opportunity to act on the inputs it was designed to balance.

### Problem 2: The one firing moved in the wrong direction
DE exact (ratio=0.58, just above threshold) had the supplementary pass fire. Result: 21%→74%, from MOSTLY-FALSE to MOSTLY-TRUE. This is the clearest evidence that the core design assumption is **not stably true**:
> "Contrarian queries in language B will yield evidence in the opposite direction to the current pool majority."

The EN contrarian pass for a DE pool (majority supports "recycling is useless") should have added evidence contradicting that claim. Instead, the DE result swung toward MOSTLY-TRUE — the opposite of the intended correction. Either the EN search space for this topic yields primarily failure-mode evidence regardless of query framing (contrarian queries still find recycling failure sources in EN), or the contrarian LLM prompt does not reliably direct the search in the intended direction across language boundaries.

### Problem 3: Apparent improvements are run variance
Three gate criteria that "passed" (EN exact conf, FR exact conf, EN para direction) are not attributable to Phase 2 v2 — the supplementary pass was blocked for all three. These are legitimate improvements in this batch, but they would have occurred without Phase 2 v2 active.

### Problem 4: Family spread unchanged
Pre-experiment family spread (max-min across EN/DE/FR): ~48pp. Phase 2 v2 result: DE(74%) vs FR(27%) = **47pp**. No improvement. The spread problem is redistributed (previously EN was the outlier, now DE is) but not solved.

---

## Decision

**UCM reverted:** `crossLinguisticQueryEnabled = false` (activated 2026-03-22T17:04:29Z)
**Code: KEPT.** Phase 2 v2 implementation remains in codebase behind flag.
**Flag: OFF.** Phase 2 v2 stays permanently disabled until redesigned.

---

## What NOT to Do

- **Do NOT lower threshold** from 0.55 to 0.50 or change `>` to `>=`. This would only cause more firings that may cause the same wrong-direction effect seen in DE exact.
- **Do NOT increase `supplementaryQueriesPerClaim`** — more queries from the same broken mechanism won't fix it.
- **Do NOT re-run for "better luck"** — the DE firing is a hard counterexample to the core assumption, not bad luck.

---

## Architecture Lessons (for Phase 2 v3 if pursued)

The current design conflates three independent decisions:
1. **Which language to search** (supplementary language selection)
2. **Which evidential direction to seek** (contrarian assumes language B = opposite direction)
3. **Which claim needs balancing** (pool-level skew, not per-claim skew)

These three must be independently controlled. "Supplementary language = balancing direction" is not a stable assumption across language pairs and topic families.

Any future Phase 2 must:
- Diagnose per-claim evidence distribution, not aggregate pool skew
- Control evidential direction explicitly per claim (not via language proxy)
- Validate that a given language search space can actually yield the requested direction before committing budget

Captain decision: either park as known limitation, or commence Phase 2 v3 as a fresh architecture brief.

---

## State After Experiment

- `crossLinguisticQueryEnabled`: **false** (UCM active, reverted 2026-03-22T17:04:29Z)
- `supplementarySkewThreshold`: `0.55` (kept, no change needed)
- `supplementaryQueriesPerClaim`: `2` (kept)
- Code: Phase 2 v2 implementation in `claimboundary-pipeline.ts` Step 3.5 (kept behind flag)
- Tests: 6 cross-linguistic tests passing

---

## Full Experiment History — Cross-Linguistic Supplementation

| Phase | Mechanism | Result | Root Cause |
|-------|-----------|--------|------------|
| Phase 2 v1 | `"main"` iterationType, no gate | FAIL — confidence collapse 74%→24% | Claim-unaware pool mixing → inter-claim spread > 25pp → contextConsistency penalty |
| Phase 2 v2 | `"contrarian"` iterationType, 0.55 gate | FAIL — gate fires rarely; DE exact wrong-direction | Post-loop pools already balanced; language ≠ direction proxy |
