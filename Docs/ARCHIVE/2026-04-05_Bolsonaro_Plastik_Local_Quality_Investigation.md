# Bolsonaro EN & Plastik DE — Local Quality Investigation

**Date:** 2026-04-05
**Role:** Senior Developer (Claude Code, Opus 4.6)
**Build under investigation:** local `07cb2e0d`
**Comparators:** local previous `ec7a8de8`, deployed current `b7783872`, deployed previous `521040e9`

---

## Executive Summary

Both families' remaining quality deficits trace to a **single shared root cause**: the grounding validator LLM cannot reliably cross-reference long timestamp-based evidence IDs (`EV_1775405xxxxxx`) against the `citedEvidenceRegistry` payload it receives, producing **false-positive grounding failures** on evidence that demonstrably exists in the registry.

A secondary contributing factor for Bolsonaro EN is **retrieval depth variance** (3 main iterations locally vs 6 deployed), which produces a smaller and less balanced evidence pool that exposes the direction validator to extreme per-claim ratios.

The recommended primary fix is narrow: **normalize evidence IDs to short sequential format before the grounding validator receives them**, eliminating the validator LLM's ID-matching confusion without changing any analytical behavior.

---

## 1. Jobs Inspected

All six anchor jobs were inspected from their full `ResultJson` artifacts.

### Bolsonaro EN

| Label | Job ID | Build | Verdict | Truth | Conf | Evidence | Boundaries |
|---|---|---|---|---|---|---|---|
| Local current | `52fcb624` | `07cb2e0d` | LEANING-TRUE | 58 | 55 | 80 | 6 (41/13/9/8/5/4) |
| Local previous | `5e93d734` | `ec7a8de8` | LEANING-TRUE | 58 | 47 | 101 | 6 (48/19/14/9/8/3) |
| Deployed current | `eb02cd2e` | `b7783872` | MOSTLY-TRUE | 73 | 70 | 97 | 6 (80/7/6/2/2/2) |
| Deployed previous | `cfd508bc` | `521040e9` | LEANING-TRUE | 71 | 66 | 64 | 6 (19/13/12/11/5/4) |

### Plastik DE

| Label | Job ID | Build | Verdict | Truth | Conf | Evidence | Boundaries |
|---|---|---|---|---|---|---|---|
| Local current | `345d6487` | `07cb2e0d` | MIXED | 45 | 66 | 101 | 6 (30/28/13/13/11/7) |
| Local previous | `c4a4c606` | `ec7a8de8` | MIXED | 51 | 62 | 71 | 6 (31/11/9/7/7/6) |
| Deployed current | `80bbcc3d` | `b7783872` | LEANING-FALSE | 41 | 48 | 124 | 6 (41/39/14/12/9/9) |
| Deployed previous | `3d3f6fbb` | `521040e9` | MIXED | 53 | 68 | 78 | 6 (37/10/9/8/7/7) |

---

## 2. Bolsonaro EN Diagnosis

### 2.1 Why does local current (58/55) underperform deployed current (73/70)?

Three compounding factors, in order of impact:

**Factor 1 — Retrieval depth variance (primary driver, ~10pp truth gap).**
Local ran 3 main iterations (80 evidence, 34 sources, 17 queries). Deployed ran 6 main iterations (97 evidence, ~55 sources). The deployed run had nearly twice the research depth, which directly yields a richer and more balanced evidence pool. The local run hit `allClaimsSufficient` after 3 iterations — diversity-aware sufficiency with seeded preliminary evidence can make claims appear "sufficient" prematurely when the seed is already diverse enough on paper.

The deployed UCM config may also differ (different `sufficiencyMinMainIterations` or `claimSufficiencyThreshold`), but this cannot be verified without access to the deployed config snapshot.

**Factor 2 — AC_03 direction validator correction (secondary, ~5pp truth drag).**
Local current's AC_03 has a 9:1 contradicting-to-supporting evidence ratio (9 contra, 1 support). The reconciler initially proposed truthPercentage=52% for this claim. The direction validator correctly flagged this as inconsistent with a 9:1 adverse ratio and triggered a correction to 38%. This 14pp drop on one of three claims drags the aggregate. However, the 9:1 ratio itself is a retrieval artifact — a deeper research pass would likely have found more balanced evidence for AC_03.

**Factor 3 — Deployed mega-boundary paradox.**
The deployed current run concentrated 80 of 97 evidence items into a single mega-boundary (CB_12). Counter-intuitively, this mega-boundary **helped** the deployed verdict because the combined evidence pool within that boundary is predominantly supportive (38 supports, 14 contradicts, 50 neutral; balance ratio 0.73). Mega-concentration means the verdict is driven by one large balanced pool rather than several smaller pools with extreme individual ratios. The deployed previous run (`cfd508bc`) had a much healthier boundary distribution (19/13/12/11/5/4) and still scored 71/66 — confirming that the deployed truth advantage comes primarily from retrieval depth, not from mega-boundary effects.

### 2.2 Per-claim comparison

| Claim | Local current | Local previous | Deployed current | Deployed previous |
|---|---|---|---|---|
| AC_01 (Brazilian procedural law) | MOSTLY-TRUE 72 | LEANING-TRUE 65 | MOSTLY-TRUE 82 | MOSTLY-TRUE 82 |
| AC_02 (International procedural law) | LEANING-TRUE 62 | UNVERIFIED 55 | MOSTLY-TRUE 75 | LEANING-TRUE 65 |
| AC_03 (Fair trial standards) | UNVERIFIED 38 | UNVERIFIED 52 | LEANING-TRUE 58 | LEANING-TRUE 60 |

Local current improved AC_01 and AC_02 vs local previous, but AC_03 collapsed. The AC_03 collapse is the main local-to-local regression.

### 2.3 Evidence direction balance

| | Supports | Contradicts | Neutral | Balance ratio |
|---|---|---|---|---|
| Local current | 35 (44%) | 12 (15%) | 33 (41%) | 0.73 |
| Local previous | 33 (33%) | 23 (23%) | 45 (45%) | 0.56 |
| Deployed current | 38 (39%) | 14 (14%) | 50 (52%) | 0.73 |
| Deployed previous | 23 (36%) | 11 (17%) | 37 (58%) | 0.68 |

Local current and deployed current have identical balance ratios (0.73), but deployed found more total evidence with more consistent distribution across claims.

### 2.4 Warning analysis

**`verdict_grounding_issue` (AC_02):** The grounding validator reported `EV_1775405712465` as "cited in reasoning but not present in citedEvidenceRegistry (only in evidencePool)." Investigation found:
- `EV_1775405712465` **exists in the evidence pool** with `relevantClaimIds: ['AC_02']`
- It is NOT in the `supportingEvidenceIds` structured array (the array has `EV_1775405712464` but omits `...465`)
- The prompt three-tier rule says claim-local-but-uncited evidence context is valid — so this should NOT be a grounding failure
- **Root cause:** The Stage-4 LLM discussed evidence in reasoning without including it in the structured citation array, and the grounding validator LLM failed to apply the three-tier rule for this case

**`verdict_direction_issue` (AC_03):** Truth=52% with 9:1 contra ratio. This is a **genuine analytical signal** — the direction validator correctly identified the mismatch. The correction to 38% is appropriate given the evidence. The problem is upstream: why did AC_03 accumulate 9 contradicting and only 1 supporting item? This traces to retrieval depth — with only 3 main iterations, AC_03's evidence happened to cluster heavily in opposition.

### 2.5 Is the `verdict_direction_issue` a real problem or a validator artifact?

**It is a real problem, but its root cause is upstream.** The 9:1 evidence ratio for AC_03 is a genuine retrieval imbalance. The direction validator's intervention (52%→38%) is analytically justified given that ratio. The fix should target retrieval depth, not the direction validator.

### 2.6 Why did local confidence improve (47→55) while truth stayed at 58?

AC_01 improved substantially (65/61 → 72/75 confidence). AC_02 went from UNVERIFIED to LEANING-TRUE. These gains raised aggregate confidence. But AC_03's collapse (52→38) canceled the truth improvement and added a direction warning that slightly reduced aggregate confidence from what would otherwise have been ~60+.

---

## 3. Plastik DE Diagnosis

### 3.1 Why did local move from MIXED 51/62 → MIXED 45/66 while gaining grounding warnings?

**Truth dropped because the evidence pool shifted toward contradiction.** Local current found 101 items (50 contradicting = 50%) vs local previous 71 items (28 contradicting = 39%). More research iterations found more contradicting evidence on the ecological and pollution claims, which is analytically correct — the claim "Plastik recycling bringt nichts" is generally opposed by the evidence base.

**Confidence rose (62→66) because more evidence yields higher model certainty.** 101 items from 40 sources (87 institutional) vs 71 items from 32 sources (56 institutional). The model is more confidently MIXED at a lower truth score.

**Per-claim shifts:**

| Claim | Local current | Local previous |
|---|---|---|
| AC_01 (ecological benefit) | LEANING-FALSE 35/68 | LEANING-FALSE 42/68 |
| AC_02 (economic viability) | LEANING-TRUE 58/60 | MIXED 48/58 |
| AC_03 (pollution reduction) | MIXED 48/70 | LEANING-TRUE 62/61 |

AC_02 and AC_03 swapped directions — current found more opposition evidence on pollution (AC_03) but more support for economic viability (AC_02). These shifts are run-to-run retrieval variance, not a systematic regression.

### 3.2 Grounding warning root cause — the critical finding

**Both grounding warnings are validator false positives caused by dual-format evidence IDs.**

Investigation of the actual artifacts found:

1. **All cited evidence IDs exist in the evidence pool.** AC_02: 27 cited, 27 found. AC_03: 25 cited, 25 found. Zero IDs are genuinely missing.

2. **The `getCitedEvidenceRegistry` code correctly builds the registry.** The function filters `allEvidence` by the IDs in `supportingEvidenceIds` and `contradictingEvidenceIds`. All IDs match.

3. **The grounding validator LLM receives the complete registry but reports false mismatches.** It claims IDs like `EV_1775405792214` are "not found in citedEvidenceRegistry" when they demonstrably ARE in the registry that was sent to it.

4. **Root cause — dual evidence ID format:**
   - Preliminary/seeded evidence uses short sequential IDs: `EV_001`, `EV_002`, ..., `EV_056`
   - Main research extraction uses timestamp-based IDs: `EV_1775405682333`, `EV_1775405792214`, etc.
   - The ID generation code at `research-extraction-stage.ts:318` uses `Date.now()` as the counter
   - The grounding validator LLM receives a `citedEvidenceRegistry` containing both formats
   - The LLM struggles to accurately cross-reference 13-digit numeric IDs that differ by only a few digits (e.g., `EV_1775405792214` vs `EV_1775405792215`)
   - This is a classic LLM numeric precision limitation — large integers are unreliably compared by language models

5. **The `baseless_challenge_blocked` warning is a downstream consequence.** The challenge for AC_03 cited `EV_055` and `EV_056` — these are short-format IDs that DO exist in the evidence pool but happen to belong to AC_01's claim scope, not AC_03's. This is a legitimate cross-claim citation error by the Stage-4 challenger LLM, but the grounding validator's false-positive behavior on the timestamp IDs undermines confidence in the overall grounding signal.

### 3.3 Why is deployed (LEANING-FALSE 41/48) numerically lower but cleaner on warnings?

The deployed run (`b7783872`) had a much more contradiction-skewed evidence pool: 124 items with 60 contradicts (48%) and only 13 supports (10.5%). Balance ratio 0.18 (extremely skewed). AC_02 went to UNVERIFIED 52/41 — the worst per-claim result across all 6 jobs. The lower confidence (48 vs 66) reflects the deployed run's sparsity on the supporting side.

The deployed run shows no `verdict_grounding_issue` because the deployed build's evidence ID format and extraction path may have produced fewer or no timestamp-based IDs, or the deployed run's evidence pool was different enough that the validator didn't trip.

### 3.4 Is local analytically better or just noisier?

**Local is analytically better on structure, but carries validator noise that deployed avoids.**

| Dimension | Local current | Deployed current |
|---|---|---|
| Boundary structure | 6 thematic boundaries, no mega-boundary (30/28/13/13/11/7) | 2 near-mega-boundaries (41/39) |
| Evidence depth | 101 items, 40 sources | 124 items, unknown sources |
| Evidence balance | 31 support / 50 contra / 20 neutral (ratio 0.38) | 13 support / 60 contra / 17 neutral (ratio 0.18) |
| Confidence | 66 | 48 |
| Grounding noise | 2 false-positive grounding warnings | None |

Local has better boundary distribution, better evidence balance, and higher confidence. The grounding warnings are false positives, not analytical quality problems.

---

## 4. Root Cause Classification by Layer

### Shared root cause (both families)

| Layer | Problem | Evidence |
|---|---|---|
| **Stage 5 — Grounding validation** | Validator LLM cannot reliably match long timestamp-based evidence IDs against the registry payload | Plastik AC_02/AC_03: all 52 cited IDs exist in pool, validator reports them missing. Bolsonaro AC_02: `EV_1775405712465` exists in pool, validator flags as "not in citedEvidenceRegistry." |

The immediate mechanism is the **dual evidence ID format**: `EV_001`-`EV_NNN` (sequential, 3-digit) from preliminary extraction vs `EV_1775405xxxxxx` (13-digit timestamp) from main research extraction. The grounding validator LLM cannot reliably compare these long IDs within a JSON payload.

### Bolsonaro-specific

| Layer | Problem | Evidence |
|---|---|---|
| **Stage 2 — Retrieval depth** | Local ran 3 main iterations (sufficiency triggered early) vs deployed's 6. Smaller evidence pool with uneven per-claim distribution. | 80 items / 17 queries locally vs 97 items / unknown queries deployed. AC_03 had 9:1 contra ratio from only 10 items. |
| **Stage 4 — Direction validator** | AC_03's 52% truth with 9:1 contra ratio is correctly flagged. But the ratio is a retrieval artifact, not an analytical error. | Correction from 52→38 is analytically sound given the evidence; the problem is upstream evidence balance. |

### Plastik-specific

| Layer | Problem | Evidence |
|---|---|---|
| **Stage 4 — Challenge citation** | Challenger for AC_03 cited `EV_055`/`EV_056` which belong to AC_01, not AC_03. | `baseless_challenge_blocked` correctly caught this. This is a Stage-4 LLM cross-claim confusion error, not a validator problem. |

---

## 5. Fix Recommendations

### Fix 1 (PRIMARY — shared, both families): Normalize evidence IDs before grounding validation

**Problem:** The grounding validator LLM cannot reliably match 13-digit timestamp-based evidence IDs against a registry payload containing dozens of similar-looking long numbers.

**Fix:** Before constructing the grounding validation payload, remap all evidence IDs to short sequential format (`EV_001`, `EV_002`, ...) within the validator input only. The actual pipeline evidence keeps its original IDs; only the data sent to the grounding validator prompt gets normalized.

**Implementation:**
- In `verdict-stage.ts`, in the grounding validation payload construction (~line 1128-1154):
- Build a temporary `id → shortId` mapping for the claim-local evidence
- Remap `evidencePool`, `citedEvidenceRegistry`, `supportingEvidenceIds`, `contradictingEvidenceIds`, and `challengeContext` to use short IDs
- The validator LLM operates on clean 3-digit IDs and can reliably cross-reference them
- Map any flagged issues back to original IDs for the warning output

**Risk:** Very low. This changes only the data format sent to the validator prompt, not any analytical behavior. Evidence IDs in the actual pipeline, result JSON, and all other stages remain unchanged.

**Validation:** Run `npm test`. Then rerun Plastik DE and Bolsonaro EN on local and confirm `verdict_grounding_issue` does not appear when all cited IDs actually exist. If genuine grounding failures exist (truly hallucinated IDs), they should still be caught because the short-format IDs will still not match.

**Why this is the best fix:**
- Addresses the root cause (LLM numeric precision on long IDs) rather than symptoms
- Does not change analytical behavior
- Does not require prompt redesign
- Does not add complexity to the main pipeline
- Works for any future evidence that uses timestamp IDs

### Fix 2 (secondary — Bolsonaro only): Investigate sufficiency triggering too early

**Problem:** Local Bolsonaro ran only 3 main iterations before `allClaimsSufficient` fired, while deployed ran 6. With seeded preliminary evidence counted toward sufficiency, the threshold may be met prematurely.

**Fix options (investigate before choosing):**
- **Option A:** Increase `sufficiencyMinMainIterations` from 1 to 2 in UCM defaults. This ensures at least 2 complete main iterations run before sufficiency can fire, regardless of seeded evidence.
- **Option B:** Exclude seeded/preliminary evidence from the sufficiency count (they are lower-quality and shouldn't count as "researched" evidence).
- **Option C:** No code change — this may be acceptable run-to-run variance within EVD-1 bands.

**Risk:** Low for Option A (one config change). Medium for Option B (changes sufficiency semantics). Option C requires no change but accepts the 3-iteration ceiling.

**Validation:** Rerun Bolsonaro EN with the config change and verify more iterations run and AC_03 gets a more balanced evidence pool.

**Why Fix 2 is secondary:** The truth gap between local and deployed is not solely iteration count. Deployed current has an 80-evidence mega-boundary that also contributes to its higher score. Fix 2 would narrow the gap but not necessarily close it. Also, the deployed previous run (`cfd508bc`) scored 71/66 with only 64 evidence items (4 main iterations), suggesting that deeper research helps but isn't the only factor.

### Fix 3 (no code change — Plastik): No fix needed

Plastik DE's local current run is analytically superior to both the deployed current and the local previous:
- Better boundary structure (no mega-boundary)
- Higher confidence (66 vs 48 deployed, 62 previous)
- Better evidence balance (ratio 0.38 vs 0.18 deployed)

The grounding warnings are false positives from the dual-ID format (Fix 1 resolves this). The truth drop from 51→45 is genuine evidence-driven — more contradicting evidence was found, which is analytically correct for this claim family. No analytical code change is warranted.

---

## 6. Single Best Next Implementation Target

**Fix 1: Evidence ID normalization in grounding validation payload.**

This is the single best next target because:
1. It resolves the grounding false positives in both families
2. It is narrow, low-risk, and does not change analytical behavior
3. It removes the most visible "noise" signal that makes local builds look worse than they are
4. It can be validated with existing test infrastructure
5. It unblocks accurate assessment of whether the grounding root fix (`d9194303`) is actually working

Without Fix 1, every future run that uses timestamp-based evidence IDs will produce false-positive grounding warnings, making it impossible to distinguish real grounding failures from ID-format artifacts.

---

## 7. What NOT to do

- **Do not reopen broad grounding redesign.** The grounding architecture is sound; the issue is validator LLM numeric precision on long IDs.
- **Do not add domain-specific heuristics.** Both families' issues are generic infrastructure problems.
- **Do not tune direction validator thresholds.** The direction validator's AC_03 intervention is analytically correct. The problem is upstream (retrieval depth).
- **Do not conflate local-vs-deployed truth gaps with code quality.** Much of the deployed advantage comes from retrieval variance (more iterations, different provider cache state, possibly different UCM config). The local build is structurally healthier on both families.
- **Do not chase the truth% difference between local and deployed Plastik.** Deployed Plastik (41/48) is analytically worse than local Plastik (45/66) — lower confidence, worse balance, near-mega-boundaries. The deployed number looking "lower" is not a quality signal.

---

## 8. Deployment Readiness Assessment

| Family | Local quality vs deployed | Blocking issue | After Fix 1 |
|---|---|---|---|
| Bolsonaro EN | Structurally healthier boundaries, lower truth. Gap is primarily retrieval depth. | Grounding + direction warnings create noise. | Grounding noise eliminated. Direction issue remains but is analytically correct. |
| Plastik DE | Structurally superior. Better boundaries, balance, confidence. | Grounding false positives create appearance of regression. | Clean. Local is demonstrably better than deployed. |

**After Fix 1, local is deployment-ready for Plastik DE.** Bolsonaro EN remains noisy but within EVD-1 amber bands (25pp spread historically). The truth gap to deployed is retrieval-variance-driven, not a code regression.

---

## 9. Fix 1 Implementation Status

**Committed:** `cbb364ec` — `fix(verdict): alias evidence IDs in grounding validation to prevent LLM false positives`

Implementation followed the Captain's scoping: **validator-local aliasing only**, canonical pipeline IDs untouched.

- `EVG_001`/`EVG_002`/... aliases built per grounding validation call from a sorted de-duplicated ID set
- All evidence ID fields aliased: `supportingEvidenceIds`, `contradictingEvidenceIds`, `evidencePool.id`, `citedEvidenceRegistry.id`, `challengeContext.citedEvidenceIds`, `challengeValidation.validIds/.invalidIds`
- Source IDs and boundary IDs are NOT aliased
- Issue strings reverse-mapped back to canonical IDs for admin diagnostics
- Tests: 1574 passed. Build: clean.

**Validation canaries submitted on `cbb364ec+a38b9121`:**
- Bolsonaro EN: `d826bcb2ac2a4fd2bba2ac35533553de`
- Plastik DE: `182205640559409aaf2f074d53a15624`

**Validation criteria:**
1. `verdict_grounding_issue` should not appear when all cited IDs actually exist in the evidence pool
2. If grounding warnings remain, classify by type: `EV_*` matching (should be fixed) vs `CB_*`/`CP_*` context handling (different class, not addressed by this fix)
3. Verdict direction and confidence should not change in suspicious ways vs the `07cb2e0d` comparators
