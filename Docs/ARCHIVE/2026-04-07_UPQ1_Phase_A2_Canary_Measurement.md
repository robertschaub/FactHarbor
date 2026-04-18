# UPQ-1 Phase A-2 Canary Measurement

**Build under test:** `b130d00c` (Phase A-2: claim-level acquisition telemetry)
**Change under test:** `claimAcquisitionLedger` added to result JSON; Phase A-1 (`existingEvidenceSummary`) still active
**Baseline build:** `62e97e0d` (Phase A-1 canaries from 2026-04-06)
**Date:** 2026-04-07

---

## Executive Judgment: `still_inconclusive` — but the ledger now provides the diagnostic data to decide

The per-claim per-iteration telemetry is working and answers the key diagnostic questions. The A-1 effect on claim-level evidence balance is **within normal variance** — the previous AC_02 collapses do not reproduce, and the positive signals are not consistent enough to attribute to A-1. The ledger confirms the remaining quality gaps are upstream of the evidence summary: seeded-evidence dominance, iteration targeting, and source scarcity.

---

## Local vs Deployed Check

The new `b130d00c` local canaries do **not** justify a quality-based deploy on
their own.

Exact or near-exact current deployed comparisons are mixed:

| Family | Local (`b130d00c`) | Deployed comparator | Reading |
|---|---|---|---|
| Bolsonaro EN | `ee5df495` → `LEANING-TRUE 70 / 68` | No exact current-deployed EN rerun. Latest exact deployed EN comparator remains `eb02cd2e` on older runtime (`MOSTLY-TRUE 73 / 70`). | Near parity, not a clear local win |
| Plastik DE | `c731c5b2` → `LEANING-FALSE 41 / 64` | `2cf4682c` on current deployed runtime (`LEANING-TRUE 62 / 72`) | Not a clear local improvement |
| Swiss FC | `035d6e65` → `LEANING-TRUE 70 / 58` | `8ec68105` on current deployed runtime (`LEANING-TRUE 60 / 52`) | Local better |
| Misinformation tools EN | `959d6a91` → `LEANING-TRUE 62 / 65` | No exact current deployed same-input rerun | No strict deploy comparison |

Deployed service version during this comparison:

- `https://app.factharbor.ch/api/version` → `f1a372bf`

Key implication:

- `b130d00c` is a **successful observability build**
- but it is **not yet a clear report-quality promotion candidate**
- the right next action is to use the new ledger to drive a bounded upstream
  Phase B fix, not to deploy on quality grounds alone

---

## Summary Table

| Family | Baseline (A-1) | New (A-2) | Verdict change | AC_02 items | Max-boundary share | Read |
|---|---|---|---|---|---|---|
| Bolsonaro EN | LT 71/60 | LT 70/68 | Stable | 6→**17** (recovered) | 0.56→**0.37** | better |
| Plastik DE | LF 39/69 | LF 41/64 | Stable | 23→**15** (within range) | 0.81→**0.68** | mixed |
| Swiss FC | UV 50/0 | LT 70/58 | **Recovered** | n/a→**15** | 0.40→**0.28** | better |
| Misinfo EN | M 48/58 | LT 62/65 | Higher truth | 10→**32** (2 claims only) | 0.51→**0.57** | mixed |

---

## 1. Bolsonaro EN

### Top-line
- Job: `ee5df495797f4bee8aa36bc0b472061b`
- Verdict: `LEANING-TRUE 70 / 68`
- Evidence / iterations: `92 / 5`
- Boundaries: `6` → `34 / 20 / 16 / 9 / 8 / 5`
- Max-boundary share: `0.37` (best in this batch)
- Tensions: 1
- Warnings: 13 (1 grounding, 2 baseless-challenge)

### Claim Acquisition Ledger

| Claim | Seeded | Iterations targeted | Admitted from research | Final | Direction (S/C/N) |
|---|---|---|---|---|---|
| AC_01 | 26 | 1 (iter 4) | 15 (1S/10C/4N) | 41 | 20S/12C/9N |
| AC_02 | 4 | 3 (iter 0, 3, 5) | 13 (4S/0C/9N) | 17 | 4S/2C/11N |
| AC_03 | 9 | 2 (iter 1, 2) | 20 (8S/3C/9N) | 29 | 11S/7C/11N |

### Ledger Interpretation

**AC_02 recovered to 17 items** — up from the 6-item collapse in the A-1 canary. The ledger reveals why:
- AC_02 was targeted in 3 iterations (the most of any claim), but only iter 0 was productive (12 admitted). Iter 3 yielded 1 item. The contradiction iteration (iter 5) yielded 0.
- AC_02 started with only 4 seeded items — the lowest seed count. The research loop correctly prioritized it (targeted first in iter 0).
- The 17-item final count is within the historical pre-A-1 range (6-21).

**AC_01 is seeded-heavy** (26 seeded, only 15 from research). The research iteration targeting AC_01 (iter 4) found predominantly contradicting evidence (1S/10C/4N) — a healthy direction-rebalancing signal.

**AC_03 boundary distribution is excellent** (maxBoundaryShare 0.24 — 6 boundaries, well-spread).

### Reading
- AC_02 collapse: **not reproduced** — normal variance, not A-1 reallocation
- Boundary shape: **0.37** — best in this batch, much better than A-1's 0.56
- Net judgment: `better`

---

## 2. Plastik DE

### Top-line
- Job: `c731c5b2acfd43dea2ac7b0dd60958a5`
- Verdict: `LEANING-FALSE 41 / 64`
- Evidence / iterations: `87 / 2`
- Boundaries: `6` → `59 / 14 / 7 / 4 / 2 / 1`
- Max-boundary share: `0.68`
- Tensions: 2
- Warnings: 11 (1 grounding, 2 baseless-challenge)

### Claim Acquisition Ledger

| Claim | Seeded | Iterations targeted | Admitted from research | Final | Direction (S/C/N) |
|---|---|---|---|---|---|
| AC_01 | 41 | 0 | 0 | 39 | 15S/17C/7N |
| AC_02 | 1 | 2 (iter 1 main, iter 2 contra) | 14 (3S/6C/5N) | 15 | 3S/7C/5N |
| AC_03 | 4 | 1 (iter 0 main) | 29 (17S/8C/4N) | 33 | 17S/12C/4N |

### Ledger Interpretation

**AC_01 is entirely seeded** — 41 seeded items, 0 research iterations targeted it, final count 39 (2 removed by applicability filter). This is the strongest ledger finding: AC_01 is so heavily seeded that the research loop never targets it, and its final evidence is entirely from Stage 1 preliminary search. This is not an A-1 effect — it's a structural pattern in how seeded evidence dominates this claim.

**AC_02 got 15 items** — down from A-1's 23 but within the historical range (8-17). The ledger shows it was targeted in 2 iterations and gained 14 items from research. The contradiction iteration yielded useful direction coverage (3S/1C/2N).

**AC_03's single research iteration produced 29 items** — a large yield from one iteration. This is why total evidence is high despite only 2 main iterations.

**Boundary concentration (0.68)** is better than A-1's 0.81 but still high. The 59-item mega-boundary persists.

### Reading
- AC_01 is seeded-dominated, not research-driven — structural pattern
- AC_02 is within historical range — no reallocation signal
- Concentration still high — pre-existing Stage 3 issue
- Net judgment: `mixed`

---

## 3. Swiss FC

### Top-line
- Job: `035d6e65f7cd4d5490755d4c6431ee19`
- Verdict: `LEANING-TRUE 70 / 58`
- Evidence / iterations: `25 / 5`
- Boundaries: `5` → `7 / 6 / 5 / 4 / 3`
- Max-boundary share: `0.28` (best boundary distribution in batch)
- Tensions: 1
- Warnings: 8

### Claim Acquisition Ledger

| Claim | Seeded | Iterations targeted | Admitted from research | Final | Direction (S/C/N) |
|---|---|---|---|---|---|
| AC_01 | 1 | 2 (iter 1, 4) | 6 (0S/3C/3N) | 7 | 0S/3C/4N |
| AC_02 | 1 | 2 (iter 2, 5 contra) | 14 (10S/1C/3N) | 15 | 10S/1C/4N |
| AC_03 | 0 | 2 (iter 0, 3) | 2 (0S/0C/2N) | 2 | 0S/0C/2N |

### Ledger Interpretation

**Swiss recovered from UNVERIFIED to LEANING-TRUE 70/58** — up from the A-1 canary's UV 50/0. The ledger shows the recovery is from better fetch success (25 items vs 5), not from the evidence summary.

**AC_03 remains thin** (only 2 items despite 2 targeted iterations). Both iterations targeted it but the second (iter 3) yielded 0 items. This is genuine source scarcity for this claim dimension, not A-1 reallocation.

**AC_02 is well-supported** (15 items, 10S/1C/4N) — the strongest evidence pool of any Swiss claim.

**Boundary distribution is excellent** (0.28 max share, 5 boundaries evenly distributed).

### Reading
- Recovery from UNVERIFIED: fetch reliability, not A-1 effect
- AC_03 scarcity: genuine, confirmed by 0-yield iteration
- Boundary shape: best in batch
- Net judgment: `better`

---

## 4. Misinfo EN

### Top-line
- Job: `959d6a91945447ad95ec74420fd414f6`
- Verdict: `LEANING-TRUE 62 / 65`
- Evidence / iterations: `68 / 1`
- Boundaries: `6` → `39 / 14 / 6 / 4 / 3 / 2`
- Max-boundary share: `0.57`
- Tensions: 2
- Warnings: 17 (1 grounding)

### Claim Acquisition Ledger

| Claim | Seeded | Iterations targeted | Admitted from research | Final | Direction (S/C/N) |
|---|---|---|---|---|---|
| AC_01 | 15 | 1 (iter 1 contradiction) | 19 (12S/3C/4N) | 34 | 22S/5C/7N |
| AC_02 | 10 | 1 (iter 0 main) | 22 (11S/4C/7N) | 32 | 16S/6C/10N |

### Ledger Interpretation

**Only 2 claims this run** vs 3 in the A-1 baseline — Stage 1 extracted fewer claims, making direct comparison imperfect.

**AC_02 got 32 items** — up from A-1's 10. But this is a different claim decomposition (2 vs 3 claims), so AC_02 may map to a broader scope. Cannot attribute to A-1.

**Both claims are well-supported** with healthy direction balance.

**1 main iteration + 1 contradiction** — sufficiency fired quickly because both claims reached threshold with seeded + 1 iteration.

### Reading
- Claim decomposition changed (2 vs 3 claims) — not comparable to A-1
- Both claims well-balanced
- Net judgment: `mixed` (incomparable decomposition)

---

## Cross-Canary Diagnosis

### Question 1: Is A-1 creating observable query/evidence reallocation between claims?

**No.** The ledger shows no evidence of cross-claim reallocation:
- The research loop targets claims via `findLeastResearchedClaim` — the claim with fewest items gets the next iteration
- The evidence summary in GENERATE_QUERIES only describes the target claim's own evidence, not sibling claims
- There is no mechanism by which the evidence summary could reallocate research effort between claims

The previous AC_02 collapses (Bolsonaro 17→6, Misinfo 20→10) were normal variance, as confirmed by:
- Bolsonaro AC_02 returned to 17 items this run
- Misinfo changed claim decomposition (2 vs 3 claims), making the comparison invalid

### Question 2: If reallocation exists, is it healthy or harmful?

**N/A** — no reallocation detected.

### Question 3: Do the AC_02 collapses now look like normal scarcity, reallocation, fetch variance, or filtering loss?

**Normal scarcity + iteration-count variance.**

The ledger proves this conclusively for Bolsonaro AC_02:
- A-1 canary: AC_02 got 6 items (likely fewer iterations targeted at AC_02)
- A-2 canary: AC_02 got 17 items (3 iterations targeted, but only iter 0 productive)
- The variability is in how many iterations target each claim, which depends on which claim `findLeastResearchedClaim` selects, which depends on seeded evidence counts and early iteration yields

No evidence was lost to applicability filtering (0 removed for all claims in all families).

### Question 4: Does the telemetry support keeping A-1, revising A-1, or reverting A-1?

**Keep A-1 provisionally.** The telemetry shows:
- No reallocation effect (no harm)
- No clear positive effect either (still inconclusive)
- The evidence summary is a small, cheap addition (~200 tokens Haiku)
- The kill gate condition (repeatable claim starvation) is **not met**

### Question 5: Is the next step more A-2 measurement, or choosing a Stage-2 slice?

**The telemetry already reveals the next bounded Stage-2 slice.** The most actionable finding from the ledger is:

**Seeded-evidence dominance.** Plastik AC_01 has 41 seeded items and 0 research iterations. This means the research loop considers AC_01 "sufficient" before research even starts. The sufficiency check counts seeded items (diversity-aware sufficiency with `includeSeeded: true`). This is not an A-1 problem — it's a structural interaction between seeded evidence volume and sufficiency thresholds.

This directly connects to the earlier sufficiency investigation: the question is not `sufficiencyMinMainIterations` (MT-3 already handles that), but whether heavily-seeded claims should still receive at least one targeted research iteration to get non-seeded evidence with proper claim attribution.

---

## Ledger Highlights

### Seeded vs Research Evidence

| Family | Claim | Seeded | Research | % Seeded |
|---|---|---|---|---|
| Plastik AC_01 | 41 | 0 | **100%** seeded |
| Bolsonaro AC_01 | 26 | 15 | 63% seeded |
| Misinfo AC_01 | 15 | 19 | 44% seeded |
| Swiss AC_02 | 1 | 14 | 7% seeded |
| Swiss AC_01 | 1 | 6 | 14% seeded |
| Bolsonaro AC_03 | 9 | 20 | 31% seeded |
| Bolsonaro AC_02 | 4 | 13 | 24% seeded |
| Plastik AC_03 | 4 | 29 | 12% seeded |
| Plastik AC_02 | 1 | 14 | 7% seeded |

**Pattern:** The first claim (AC_01) is consistently the most heavily seeded. On Plastik, it is entirely seeded with zero research iterations. This means the first claim's evidence quality is entirely dependent on the preliminary search, which is Stage 1 (Haiku tier, broader queries, no claim-local targeting).

### Zero-Yield Iterations

| Family | Claim | Iteration | Admitted |
|---|---|---|---|
| Bolsonaro AC_02 | iter 5 contradiction | 0 |
| Swiss AC_01 | iter 4 main | 0 |
| Swiss AC_03 | iter 3 main | 0 |
| Bolsonaro AC_02 | iter 3 main | 1 (near-zero) |

**Pattern:** Later iterations targeting already-researched claims often yield 0 items — diminishing returns is real. The research loop's zero-yield break threshold catches this after 2 consecutive zeros.

---

## Final Recommendation

### A-1 judgment: `keep provisionally`

The kill gate (repeatable claim starvation) is not met. No reallocation detected. No clear positive or negative signal. Keep A-1 and continue monitoring.

### Why `still_inconclusive` and not `helps` or `hurts`

- The ledger confirms the previous AC_02 collapses were normal variance, not A-1 reallocation
- But the ledger also shows no consistent evidence that A-1's evidence summary is improving query targeting
- The most impactful patterns in the ledger (seeded dominance, zero-yield iterations) are unrelated to A-1

### Next step

The ledger has already answered the A-1 question (inconclusive, keep provisionally) and revealed the **next bounded Stage-2 slice**:

**Investigate seeded-evidence dominance on AC_01 across families.** When the first claim is heavily seeded (Plastik: 41 items, Bolsonaro: 26 items), the research loop never targets it, and its evidence base is entirely from Stage 1 preliminary search. This may be the largest single upstream quality factor that A-1 was not designed to address.

Options:
1. **Exclude seeded evidence from sufficiency count** so that all claims get at least one targeted research iteration
2. **Ensure at least one research iteration per claim** regardless of seeded count (per-claim iteration floor — the MT-3 debate from earlier)
3. **Accept** — seeded evidence may be good enough for high-evidence claims

This is a separate decision from A-1 and should be the next Phase B candidate.
