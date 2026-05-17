# UPQ-1 Phase B Canary Measurement

**Build under test:** `442a5450` (Phase B: per-claim researched-iteration floor)
**Change under test:** `sufficiencyMinResearchedIterationsPerClaim: 1` — each claim must receive at least 1 targeted research iteration before seeded evidence can make it sufficient
**Baseline build:** `b130d00c` (Phase A-2 telemetry canaries)
**Date:** 2026-04-07

---

## Executive Judgment: `helps` — the per-claim floor is working as designed

The primary success check passes: **Plastik AC_01 is no longer skipped.** The forced iteration was productive (33 new items admitted). Bolsonaro AC_01 also received 2 research iterations (13 new items) where previously it was seeded-dominant. All claims across all families now have ≥1 researched iteration in the ledger.

However, the fix amplifies a pre-existing Stage 3 boundary-concentration problem. More evidence flowing into the pipeline means Stage 3 has more material to collapse into mega-boundaries. This is not a Phase B regression — it's the same concentration issue that existed before, now more visible because the evidence pool is larger.

---

## Summary Table

| Family | A-2 baseline | Phase B | Verdict change | Primary check | Boundary shape | Read |
|---|---|---|---|---|---|---|
| Plastik DE | LF 41/64 | **MF 28/75** | Direction stable, stronger | AC_01: 0→**1** iter, **+33 items** | 0.68→**1.00** (collapse) | helps + concentration issue |
| Bolsonaro EN | LT 70/68 | **MT 74/68** | Truth improved | AC_01: 1→**2** iters, AC_02 **20 items** | 0.37→**0.82** | helps + concentration issue |
| Swiss FC | LT 70/58 | **LT 63/76** | Confidence improved | All claims researched | 0.28→**0.31** (stable) | helps |
| Misinfo EN | LT 62/65 | **M 57/62** | Within variance | All claims researched | 0.57→**0.51** (stable) | neutral |

---

## 1. Plastik DE — Primary Success Check

### Top-line
- Job: `041c63ab0dca4893aac8b9f94ddc3569`
- Verdict: `MOSTLY-FALSE 28 / 75`
- Evidence / iterations: `135 / 5`
- Boundaries: `1` → `[135]` — **total collapse into single boundary**
- Max-boundary share: `1.00`

### Claim Acquisition Ledger — The Key Comparison

| Claim | A-2 seeded | A-2 researched iters | A-2 final | Phase B seeded | Phase B researched iters | Phase B final |
|---|---|---|---|---|---|---|
| **AC_01** | 41 | **0** | 39 | 33 | **1** (33 admitted) | **66** |
| AC_02 | 1 | 2 (14 admitted) | 15 | 3 | 3 (29 admitted) | **32** |
| AC_03 | 4 | 1 (29 admitted) | 33 | 1 | 2 (38 admitted) | **39** |

### Phase B Success Check
- **AC_01 received 1 researched iteration** (iter 4/main) — up from 0 on A-2. ✅
- **That iteration admitted 33 new items** (5S/24C/4N) — highly productive, not a zero-yield pass. ✅
- AC_02 and AC_03 also received more research — no starvation from the forced AC_01 iteration. ✅
- Total evidence grew from 87 to 135 — more research across the board.

### Phase B Concern
- **1 boundary absorbing all 135 items** (max share 1.00). This is the worst concentration in the entire measurement series. The per-claim floor caused more evidence to flow in, but Stage 3 collapsed it into a single boundary. This is a pre-existing Stage 3 problem amplified by more evidence volume, not caused by Phase B.

### Reading
- Per-claim floor: **working as designed**
- Evidence quality: **productive** (33 items from forced AC_01 iteration)
- Boundary concentration: **separate problem** (Stage 3, not Phase B)
- Net judgment: `helps` on the primary metric, but exposed a concentration amplification risk

---

## 2. Bolsonaro EN

### Top-line
- Job: `8f07c9de5d0746b382a7fb632b2f2fe5`
- Verdict: `MOSTLY-TRUE 74 / 68` — best local Bolsonaro result in the measurement series
- Evidence / iterations: `105 / 6`
- Boundaries: `6` → `86 / 7 / 7 / 3 / 1 / 1`
- Max-boundary share: `0.82`

### Claim Acquisition Ledger

| Claim | A-2 seeded | A-2 researched iters | A-2 final | Phase B seeded | Phase B researched iters | Phase B final |
|---|---|---|---|---|---|---|
| AC_01 | 26 | 1 (15 admitted) | 41 | 41 | **2** (13 admitted) | **53** |
| AC_02 | 4 | 3 (13 admitted) | 17 | 2 | 3 (18 admitted) | **20** |
| AC_03 | 9 | 2 (20 admitted) | 29 | 8 | 2 (29 admitted) | **33** |

### Phase B Effect
- AC_01 received 2 research iterations (up from 1 on A-2) — the floor forced at least 1, and the loop chose it again for a 2nd. Both iterations were modest yield (6 + 7 = 13 items).
- AC_02 at 20 items — within historical range (6-21), stable.
- AC_03 at 33 items — good evidence pool.
- **Truth 74% is the best local Bolsonaro result** — matches the deployed comparator range (73/70).

### Concentration concern
- 0.82 max-boundary share (86 of 105 items in one boundary). Same pre-existing pattern.

### Reading
- Net judgment: `helps` — best truth result, all claims well-researched, AC_02 stable

---

## 3. Swiss FC

### Top-line
- Job: `00865fd1c0d0405982481d0b321f85a9`
- Verdict: `LEANING-TRUE 63 / 76` — highest confidence in Swiss measurement series
- Evidence / iterations: `26 / 3`
- Boundaries: `6` → `8 / 6 / 5 / 5 / 1 / 1`
- Max-boundary share: `0.31`

### Claim Acquisition Ledger

| Claim | A-2 seeded | A-2 researched iters | A-2 final | Phase B seeded | Phase B researched iters | Phase B final |
|---|---|---|---|---|---|---|
| AC_01 | 1 | 2 (6 admitted) | 7 | 1 | 1 (3 admitted) | **4** |
| AC_02 | 1 | 2 (14 admitted) | 15 | 3 | 2 (12 admitted) | **15** |
| AC_03 | 0 | 2 (2 admitted) | 2 | 3 | 1 (1 admitted) | **4** |

### Phase B Effect
- All claims received ≥1 researched iteration. No claim was skipped.
- AC_03 remains thin (4 items, all neutral) — genuine source scarcity, not a Phase B issue.
- Boundary distribution is excellent (0.31 max share) — no concentration issue on this family.
- **Confidence 76% is the highest Swiss confidence** in the entire measurement series.

### Reading
- Net judgment: `helps` — confidence improved, no scarcity regression, clean boundaries

---

## 4. Misinfo EN

### Top-line
- Job: `d402535c21034151a32fd4ce17ec3a5f`
- Verdict: `MIXED 57 / 62`
- Evidence / iterations: `79 / 2`
- Boundaries: `6` → `40 / 18 / 8 / 6 / 6 / 1`
- Max-boundary share: `0.51`

### Claim Acquisition Ledger

| Claim | A-2 seeded | A-2 researched iters | A-2 final | Phase B seeded | Phase B researched iters | Phase B final |
|---|---|---|---|---|---|---|
| AC_01 | 15 | 1 (19 admitted) | 34 | 15 | 1 (19 admitted) | **34** |
| AC_02 | 10 | 1 (22 admitted) | 32 | 6 | 2 (36 admitted) | **42** |

### Phase B Effect
- 2 claims again (same as A-2) — decomposition is consistent.
- Both claims received ≥1 researched iteration. No claims skipped.
- AC_02 grew from 32 to 42 items — got an extra research iteration.
- Boundary concentration is moderate and stable (0.51).
- Direction balance is healthier: AC_01 now has 16S/9C/9N (was 22S/5C/7N on A-2 — more contra).

### Reading
- Net judgment: `neutral` — working correctly, no regression, no dramatic improvement

---

## Cross-Canary Diagnosis

### Primary success check: PASS on all 4 families

| Family | Claim with 0 researched iters on A-2 | Researched iters on Phase B | Items admitted from forced iteration |
|---|---|---|---|
| **Plastik AC_01** | **0 iters** (41 seeded) | **1 iter** → **33 admitted** | ✅ Productive |
| Bolsonaro AC_01 | 1 iter (had seeded + research) | 2 iters → 13 admitted | ✅ Working |
| Swiss — | All had ≥1 iter on A-2 | All have ≥1 iter | ✅ No regression |
| Misinfo — | All had ≥1 iter on A-2 | All have ≥1 iter | ✅ No regression |

**No claim across any family has 0 researched iterations.** The per-claim floor is universally enforced.

### Secondary check: evidence quality from forced iterations

| Family | Forced claim | Admitted items | Direction balance | Zero-yield? |
|---|---|---|---|---|
| **Plastik AC_01** | iter 4 | **33** | 5S/24C/4N | **No** — highly productive |
| Bolsonaro AC_01 | iter 4+5 | 6+7=13 | 2S/0C/11N | **No** — modest but non-zero |
| Swiss AC_01 | iter 0 | 3 | 0S/1C/2N | **No** — thin but real |

**Zero forced iterations produced zero items.** The `zeroYieldBreakThreshold` concern is not masking the intended benefit.

### Concentration amplification

| Family | A-2 max-boundary share | Phase B max-boundary share | Worse? |
|---|---|---|---|
| **Plastik** | 0.68 | **1.00** | **Yes** — total collapse |
| **Bolsonaro** | 0.37 | **0.82** | **Yes** — significant |
| Swiss | 0.28 | 0.31 | No — stable |
| Misinfo | 0.57 | 0.51 | No — slightly better |

More evidence flowing in (Plastik: 87→135, Bolsonaro: 92→105) means Stage 3 has more material to cluster. On Plastik and Bolsonaro, it collapsed everything into mega-boundaries. This is a pre-existing Stage 3 problem now amplified by the higher evidence volume. The per-claim floor is not causing the concentration — it's providing more evidence that Stage 3 then mis-handles.

---

## Phase B Judgment: `helps`

### Why `helps` and not `mixed` or `still_inconclusive`

1. **The primary success check passes on all 4 families.** No claim has 0 researched iterations.
2. **Plastik AC_01** — the specific failure mode that motivated Phase B — is now receiving productive research (33 items from the forced iteration). This is the clearest signal in the entire UPQ-1 measurement series.
3. **Bolsonaro MOSTLY-TRUE 74/68** is the best local result for this family — matching the deployed comparator range.
4. **Swiss confidence 76%** is the highest in the series.
5. **No scarcity regression** on any family — Swiss AC_03 remains thin (4 items) but this is genuine source scarcity, not Phase B starvation.

### Why not a full `clear_win`

- **Boundary concentration amplification** on Plastik (1.00) and Bolsonaro (0.82) is real and concerning.
- This is not caused by Phase B but is amplified by it.
- This confirms the original UPQ-1 plan: Phase C (Stage 3 concentration work) is now warranted.

### Recommendation

**Keep Phase B (`sufficiencyMinResearchedIterationsPerClaim: 1`).** It fixes the observed failure mode and the forced iterations are productive. The concentration amplification should be addressed in Phase C (Stage 3), not by reverting Phase B.

### Next step

**Phase C: Stage 3 boundary-concentration stabilization** — the ledger now shows that with more evidence flowing in, Stage 3's clustering is the next bottleneck. This was the planned sequence from the original UPQ-1 proposal: Stage 2 first, Stage 3 only after.
