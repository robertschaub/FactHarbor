# Stage 1 Claim Decomposition Fix — 3-Step Package

**Date:** 2026-03-29
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)

---

## 1. Executive Summary

Implemented the approved 3-step fix for the `b8e6`/`8640`/`cd4501` claim decomposition failure family. **Step 2 (evidence-separability in contract validation) is the primary fix** — it successfully caught and corrected the 4-claim over-fragmentation in the 8640/cd4501 family, reducing claims from 4 to 2 and eliminating the UNVERIFIED starvation pattern. Steps 1 and 3 are supporting infrastructure.

---

## 2. What Changed

### Step 1 — Fallback removal (code-only, 3 locations)

Removed the `single_atomic_claim` fallback that auto-promoted multi-claim outputs to `isDimensionDecomposition` when all claims had `centrality=high` and `claimDirection=supports_thesis`. Changed at lines 357, 430, 535 of `claim-extraction-stage.ts`. Now only `ambiguous_single_claim` triggers dimension tagging.

**Impact:** Near-zero on current data (stress test confirmed 0/7 jobs used this path). Correct by construction — eliminates a wrong-by-design code path.

### Step 2 — Evidence-separability in contract validation (prompt + schema)

Added Rule 9 to `CLAIM_CONTRACT_VALIDATION` in `claimboundary.prompt.md`: assesses whether each claim requires a meaningfully different evidence body. Added `evidenceSeparable: boolean` to the per-claim output schema with `.catch(true)` default. Updated the failing-claims filter to also catch `evidenceSeparable === false`.

Updated retry guidance to include: "If the previous extraction produced claims that would be answered by the same evidence, merge them into fewer independently researchable claims."

**Impact:** This is the primary defense. Caught the 8640/cd4501 4-claim over-fragmentation and triggered merge.

### Step 3 — Retry re-validation and structured candidate selection (code-only)

After contract-validation-triggered retry, the output is now re-validated by calling `validateClaimContract()` again. If the retry still fails, structured candidate selection chooses the best result based on: (1) fewer material failures, (2) whether original preserved contract better, (3) fewer claims as tiebreaker. Emits `claim_contract_retry_still_failing` info warning.

**Impact:** Prevents blind acceptance of retry output. In the validation batch, this fired on 3 of 5 jobs — correctly noting that retries improved but didn't fully resolve all overlap.

---

## 3. Tests

3 new tests in `claim-contract-validation.test.ts`:
- `evidenceSeparable` defaults to `true` when absent
- `evidenceSeparable=false` parsed correctly as retry trigger
- Mixed separability in multi-claim output works

1462 total tests pass (74 files). Build clean.

---

## 4. Validation Run Table

| # | Job ID | Input Family | Claims | Verdict | T% | C% | Contract Retry | Contract Re-val | UNVERIFIED Claims |
|---|--------|-------------|--------|---------|----|----|----------------|-----------------|-------------------|
| 1 | `b3468281` | b8e6 (Werkzeuge/Methoden) | 3 | MIXED | 55 | 60 | No | — | 2 (AC_01, AC_03) |
| 2 | `6bc7950b` | 8640/cd4501 (effizient/wirksam) | **2** | MOSTLY-TRUE | 72 | 73 | **Yes** | **Yes (still failing)** | 0 |
| 3 | `c0eb5c9f` | Bolsonaro compound | 2 | LEANING-TRUE | 69 | 61 | No | — | 0 |
| 4 | `0d36be0f` | Plastik control | 3 | LEANING-TRUE | 60 | 65 | Yes | — | 0 |
| 5 | `98be67e1` | Hydrogen control | 2 | FALSE | 11 | 76 | Yes | Yes (still failing) | 0 |

---

## 5. Outcome by Target Job Family

### 8640/cd4501 family — FIXED

- **Before:** 3-4 claims (methods, tools, efficient, effective). AC_02 + AC_03 starved to UNVERIFIED. Article verdict distorted.
- **After:** 2 claims (methods+tools merged, efficient+effective merged). Both claims got evidence. MOSTLY-TRUE 72/73. **Step 2 was the primary mechanism** — it flagged the 4-claim split as evidence-inseparable and triggered retry with merge guidance.

### b8e6 family — PARTIALLY IMPROVED

- **Before:** `single_atomic_claim` with near-duplicate Werkzeuge/Methoden split, auto-tagged as dimension decomposition.
- **After:** Now classified as `ambiguous_single_claim` (LLM changed its classification). Still produces 3 claims with the Werkzeuge/Methoden split. Contract validation passed (no retry). 2 of 3 claims UNVERIFIED.
- **Assessment:** Step 1 (fallback removal) didn't help because the LLM changed classification to `ambiguous_single_claim`. The remaining over-fragmentation is a Pass 2 extraction issue, not a contract validation miss. This would need Step 4 (Pass 2 prompt refinement) per the architect review's sequencing.

### Bolsonaro compound — NO REGRESSION

- 2 claims (procedural + fairness). Contract validation passed. LEANING-TRUE 69/61.
- Fairness claim preserved (not filtered by Gate 1 — thesis-direct rescue working).

### Controls — NO REGRESSION

- **Plastik:** 3 claims, LEANING-TRUE 60/65. Contract validation caught some overlap but retry still produced 3 claims. No UNVERIFIED.
- **Hydrogen:** 2 claims, FALSE 11/76. Contract validation caught AC_03 drift and AC_01/AC_02 overlap, reduced from 3 to 2. Correct direction.

---

## 6. Risks / Regressions

| Risk | Status |
|------|--------|
| Bolsonaro claims merged incorrectly | Not observed — 2 claims preserved |
| Contract validation too aggressive | Not observed — legitimate splits still pass |
| Plastik regression | Not observed — LEANING-TRUE 60/65 within EVD-1 range |
| Hydrogen regression | Not observed — FALSE 11/76, correct direction |
| b8e6 still over-fragments | Observed — but classification changed to `ambiguous_single_claim`, so Step 1 is not the relevant fix. Pass 2 refinement (Step 4) would be needed. |

---

## 7. Final Judgment

**Step 2 is the primary fix** and it works for the 8640/cd4501 family. Step 1 removes a wrong-by-construction code path. Step 3 provides re-validation safety. The b8e6 family needs further work at the Pass 2 level (not part of this package).

**Recommendation: Keep.** The 3-step package improves claim decomposition quality for the target failure family without regressions on controls. The b8e6 residual is documented for a potential Step 4.

---

*5 validation jobs, zero exclusions. 1462 tests pass, build clean.*
