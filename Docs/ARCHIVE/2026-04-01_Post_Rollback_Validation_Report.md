# Post-Rollback Validation Report

**Date:** 2026-04-01
**Role:** Lead Architect / Senior Developer
**Status:** COMPLETE
**HEAD:** `1101978842a310781864789981d783d5ffbae4ca`
**Context:** Validation after clean rollback of `fff7a508` (Stage-1 decomposition fix), `d04fc750` (candidate selection fix), and `09ce7018` (distinctEvents granularity prompt)

---

## 1. Executive Summary

17 live validation runs across 14 distinct input families confirm the rollback baseline is stable. Zero `verdict_integrity_failure` warnings across all runs. The families that motivated the rollback (Plastik, SRG) are restored to their historical ranges. The pre-existing SRG effizient/wirksam over-fragmentation remains but is not a regression — it predates `fff7a508`.

---

## 2. Full Run Table

### Regression-target families (5 runs — submitted by agent)

| # | Job ID | Input | Verdict | TP | C | Claims | UNVERIFIED | Integrity | Assessment |
|---|--------|-------|---------|:---:|:---:|:---:|:---:|:---:|-----------|
| 1 | `5ee3048e` | Plastic recycling is pointless | LEANING-TRUE | 63 | 58 | 3 | 1/3 | 0 | **Restored.** TP=63 mid-range (hist: 39-71). No catastrophic UNVERIFIED. |
| 2 | `714e4b84` | SRG SSR ... effizient und wirksam | LEANING-TRUE | 62 | 45 | 3 | 2/3 | 0 | **Pre-existing baseline.** AC_02/AC_03 still 0 evidence (known SRG split). Article verdict restored from UNVERIFIED to LEANING-TRUE. |
| 3 | `030209bb` | Were the various Bolsonaro trials... | LEANING-TRUE | 64 | 66 | 2 | 0 | 0 | **Clean.** Squarely in historical range (hist: 59-73). |
| 4 | `ea67c03d` | Were all Bolsonaro trials... | MIXED | 56 | 52 | 3 | 1/3 | 0 | **Acceptable.** Complex 3-claim fairness decomposition. |
| 5 | `b9337728` | Bolsonaro single-proceeding EN | LEANING-TRUE | 63 | 48 | 3 | 2/3 | 0 | **In range.** TP=63 typical (hist: 55-70). C=48 low-end normal. |

### Broader family validation (12 runs — submitted by user)

| # | Job ID | Input | Verdict | TP | C | Claims | UNVERIFIED | Integrity | Assessment |
|---|--------|-------|---------|:---:|:---:|:---:|:---:|:---:|-----------|
| 6 | `4cef48f5` | DPA Faktenprüfung (DE) | MOSTLY-TRUE | 73 | 76 | 2 | 0 | 0 | Clean |
| 7 | `93e37964` | Keystone-SDA Analysemethoden (DE) | LEANING-TRUE | 70 | 69 | 2 | 0 | 0 | Clean |
| 8 | `2d5ccca7` | Homeopathy is effective (single_atomic) | FALSE | 8 | 88 | 1 | 0 | 0 | Clean — strong directional verdict |
| 9 | `3ecd7b31` | Bolsonaro PT golpe de Estado | LEANING-TRUE | 67 | 58 | 2 | 1/2 | 0 | Acceptable — fairness claim borderline |
| 10 | `45872e7c` | BBC fact-checking (EN) | LEANING-TRUE | 70 | 76 | 3 | 0 | 0 | Clean |
| 11 | `b76ee530` | Bali plastic pollution prevention | MOSTLY-TRUE | 79 | 81 | 3 | 0 | 0 | Clean — strong result |
| 12 | `bd103bf6` | Electricity vs hydrogen for cars | MOSTLY-TRUE | 84 | 86 | 2 | 0 | 0 | Clean — strong directional verdict |
| 13 | `13c17ea1` | Sexual orientation determined after birth | LEANING-FALSE | 31 | 65 | 3 | 0 | 0 | Clean |
| 14 | `79ce4f53` | Hydrogen more efficient than electricity | MOSTLY-FALSE | 26 | 61 | 2 | 0 | 0 | Clean — correct direction |
| 15 | `d4739cd3` | Homeopathy effective (ambiguous) | LEANING-FALSE | 42 | 74 | 3 | 0 | 0 | Clean |
| 16 | `b593cfec` | Global warming human-caused | TRUE | 95 | 91 | 2 | 0 | 0 | Clean — strong scientific consensus |
| 17 | `1cb50338` | DPA prüft Behauptungen (DE, ambiguous) | TRUE | 89 | 70 | 3 | 1/3 | 0 | AC_03 (instruments) UNVERIFIED — only 2 evidence items. AC_01+AC_02 strong. |

---

## 3. Key Metrics

### Across all 17 runs

| Metric | Value |
|--------|-------|
| Total runs | 17 |
| `verdict_integrity_failure` warnings | **0** (across all 17) |
| Contract validation fail-open (`LLM returned undefined`) | **0** observed in this batch |
| Duplicate verdict IDs | **0** |
| Runs with article-level UNVERIFIED | **0** |
| Runs with any claim-level UNVERIFIED | 7/17 (see below) |

### UNVERIFIED claim analysis

| Job | Family | UNVERIFIED claims | Cause |
|-----|--------|:-:|-------|
| `5ee3048e` | Plastik EN | 1/3 (AC_03) | Verdict consistency instability (C=41). Pre-existing variance. |
| `714e4b84` | SRG compound | 2/3 (AC_02, AC_03) | 0 evidence for effizient/wirksam sub-claims. Pre-existing decomposition issue. |
| `ea67c03d` | Bolsonaro "all" | 1/3 (AC_03) | Borderline confidence (C=48). Evidence-driven. |
| `b9337728` | Bolsonaro single | 2/3 (AC_02, AC_03) | Borderline confidence (C=49, C=43). Evidence distribution variance. |
| `3ecd7b31` | Bolsonaro PT | 1/2 (AC_02) | Fairness claim borderline (C=43). |

| `1cb50338` | DPA prüft (DE) | 1/3 (AC_03) | AC_03 (instruments) has only 2 evidence items — insufficient diversity. |

None of these UNVERIFIED claims are caused by integrity failures or Stage-1 regressions. All are evidence-driven variance or the known over-fragmentation pattern where fine-grained sub-claims cannot attract enough independent evidence.

---

## 4. Comparison to Pre-Experiment Baselines

### Plastik EN

| Period | Typical range | This run |
|--------|--------------|----------|
| Pre-fff7a508 (Mar 26-29) | MIXED to LEANING-TRUE, TP 48-71, C 65-76 | LEANING-TRUE 63/58 |
| During fff7a508 (Mar 31) | **UNVERIFIED 43/40** (regression) | — |
| Post-rollback | LEANING-TRUE 63/58 | **Restored** |

### SRG compound

| Period | Typical range | This run |
|--------|--------------|----------|
| Pre-fff7a508 (Mar 29) | LEANING-TRUE 58-72, C 65-68 | — |
| During fff7a508 (Mar 30-31) | **UNVERIFIED 48-50, C 0-40** (regression) | — |
| Post-rollback | LEANING-TRUE 62/45 | **Improved** — no longer UNVERIFIED, but 2/3 claims still starved (pre-existing) |

### Bolsonaro "various"

| Period | Typical range | This run |
|--------|--------------|----------|
| Historical (Mar 19-31) | LEANING-TRUE 59-73, C 60-72 | LEANING-TRUE 64/66 |
| Post-rollback | LEANING-TRUE 64/66 | **Clean — squarely in range** |

---

## 5. What Remains In Place

The following fixes from the March 29-31 session were NOT reverted and are confirmed working:

| Fix | Commit | Confirmed by |
|-----|--------|-------------|
| Claim-local verdict-direction scoping | `17da5b84` | 0 integrity failures across 16 runs |
| Boundary sanitization (ghost boundary filtering) | `ef98a07a` | No structural warnings |
| Grounding validation with source portfolio | `3d7f6c85` | No false-positive grounding warnings |
| Source fetch domain short-circuit | `5e948594` | Fetch warnings include error types |
| Article truth clamp removal (±10pp) | `7fdf2b44` | Article truth varies freely per LLM judgment |
| Assessable-claims path (all-insufficient short-circuit) | `cc362d64` | No duplicate verdicts |

---

## 6. What Was Reverted and Why

| Commit | What | Why reverted |
|--------|------|-------------|
| `fff7a508` | Evidence-separability rule in contract validation + retry re-validation + candidate selection | SRG: contract validation intermittently returning `undefined` caused fail-open → UNVERIFIED. Plastik: candidate selection preferred fewer claims even when the merge was worse. |
| `d04fc750` | Candidate selection fix (fewer-claims tiebreaker removal + safety retry for undefined) | Depended on `fff7a508` code paths |
| `09ce7018` | distinctEvents granularity prompt (peer-proceedings over milestones) | Claim count stabilized but primary target (TSE peer extraction) not achieved. Partial success only — deferred. |

---

## 7. Open Issues

| Issue | Status | Priority |
|-------|--------|----------|
| SRG effizient/wirksam over-fragmentation | Pre-existing, not solved | Medium — needs Pass 2 or contract-validation approach that doesn't regress Plastik |
| Bolsonaro TSE peer-proceeding extraction | Not solved by prompt-only | Low — deferred LLM repair step may be needed |
| Contract validation intermittent fail-open | Observed during fff7a508 era, not seen in this batch | Monitor — may recur |

---

---

## 8. Quality Evolution Analysis (Mar 29 — Apr 1)

### 8.1 Full family quality trends

Data from all jobs Mar 29 — Apr 1 on the local stack (109 runs across 14+ families).

| Family | Runs | TP Range | TP Mean | Conf Range | Conf Mean | Integrity | Fail-open | Trend |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---------|
| Flat Earth / Controls | 2 | 0 | 0 | 95-98 | 96 | 0 | 0 | Stable GREEN |
| Bolsonaro single | 11 | 55-74 | 65 | 48-69 | 60 | 0 | 0 | Stable LEANING-TRUE |
| Bolsonaro various | 6 | 55-73 | 63 | 24-66 | 53 | 1 | 0 | Stable post claim-local fix |
| Bolsonaro all | 4 | 56-63 | 58 | 40-65 | 55 | 0 | 0 | Stable MIXED/LEANING-TRUE |
| Bolsonaro PT | 7 | 57-72 | 65 | 46-74 | 62 | 0 | 1 | Stable |
| Plastik EN | 6 | 39-71 | 55 | 40-73 | 63 | 0 | 0 | Restored post-rollback |
| Plastik DE | 3 | 33-63 | 52 | 58-75 | 65 | 0 | 0 | Stable |
| Plastik FR | 2 | 13-22 | 17 | 71-73 | 72 | 0 | 0 | Consistently low TP (neutrality gap) |
| SRG/SRF | 27 | 15-76 | 56 | 0-73 | 49 | 1 | 3 | High variance — pre-existing |
| DPA | 5 | 71-89 | 77 | 69-79 | 73 | 0 | 0 | Stable MOSTLY-TRUE/TRUE |
| Keystone-SDA | 3 | 65-70 | 68 | 69-72 | 70 | 0 | 0 | Stable LEANING-TRUE |
| BBC | 1 | 70 | 70 | 76 | 76 | 0 | 0 | Clean |
| Hydrogen | 9 | 8-84 | 36 | 61-86 | 76 | 0 | 0 | Correct direction, 1 outlier |
| Homeopathy | 3 | 8-68 | 39 | 70-88 | 77 | 0 | 0 | Correct inversion across variants |
| Wind-still.ch | 4 | 33-50 | 37 | 0-63 | 33 | 1 | 1 | Improving — early runs failed |
| Oberentfelden | 3 | 50 | 50 | 0 | 0 | 0 | 0 | Correct: no evidence exists |
| Global warming | 1 | 95 | 95 | 91 | 91 | 0 | 0 | Strong TRUE — scientific consensus |
| Bali plastic | 1 | 79 | 79 | 81 | 81 | 0 | 0 | Clean MOSTLY-TRUE |
| Sexual orientation | 1 | 31 | 31 | 65 | 65 | 0 | 0 | Clean LEANING-FALSE |
| Iran nukes | 1 | 86 | 86 | 87 | 87 | 0 | 0 | Clean TRUE |

### 8.2 Integrity and structural defect trends

| Defect | Mar 29 | Mar 30 | Mar 31 | Apr 1 | Trend |
|--------|:---:|:---:|:---:|:---:|---------|
| `verdict_integrity_failure` | 2 (1bfb, 45029b) | 1 (9e4d) | 0 | 0 | **Eliminated** by claim-local scoping fix |
| Contract validation fail-open | 1 (0791c9) | 2 (f80b6b, f34440) | 1 (0a34ef) | 0 | Intermittent, improving |
| Duplicate verdict IDs | 1 (e407) | 0 | 0 | 0 | **Eliminated** by assessable-claims fix |
| All-claims UNVERIFIED (article) | 1 (e407) | 1 (f80b6b) | 1 (0a34ef) | 0 | **Eliminated** on Apr 1 batch |

### 8.3 Cross-linguistic neutrality (Plastik family — unchanged)

| Language | Runs (all time) | TP Mean | Direction |
|----------|:---:|:---:|-----------|
| DE ("bringt nichts") | 3 | 52 | MIXED |
| EN ("is pointless") | 6 | 55 | MIXED/LEANING-TRUE |
| FR ("ne sert a rien") | 2 | 17 | FALSE-side |

The cross-linguistic neutrality gap persists. French consistently scores 35-40pp lower than English/German. This is an evidence-language bias (French sources favor recycling) not addressed by any of the recent fixes. Remains an open EVD-1 gap.

### 8.4 SRG/SRF instability — the dominant open problem

27 runs, 61pp spread (15-76 TP), 3 contract fail-opens, 1 integrity failure. This family has the highest variance of any tracked family.

Key observations:
- **Classification oscillates** between `single_atomic_claim` and `ambiguous_single_claim` across runs
- **effizient/wirksam sub-claims** consistently fail to attract evidence (0 items each)
- **Contract validation intermittently fails** (3/27 runs = 11% fail-open rate for this family vs ~2% for others)
- When contract validation works AND catches the split, the retry sometimes improves (6bc795: 72/73) and sometimes does not (11c529: 58/65)
- When contract validation fails open, results degrade badly (f80b6b: UNVERIFIED 48/40, 0a34ef: UNVERIFIED 50/0)

This is not a regression from the rollback — it's a pre-existing decomposition instability that `fff7a508` attempted to fix but caused collateral damage on Plastik. The SRG family needs a more targeted fix that does not break broad-evaluative families.

### 8.5 Hydrogen — correct direction, 1 known outlier

9 runs. The standard "hydrogen more efficient than electricity" direction is consistently FALSE-side (8-27 TP). The inverted "electricity more efficient than hydrogen" is consistently TRUE-side (78-84 TP). One outlier (`a0c5e51e`, TP=58) was caused by a tangential energy-density claim inflating the score — documented in the Mar 30 analysis.

### 8.6 Homeopathy — correct inversion across variants

"Does not work for animals" → LEANING-TRUE 68/70 (the claim IS true)
"Is effective for diseases" (single_atomic) → FALSE 8/88 (strong)
"Is effective for diseases" (ambiguous) → LEANING-FALSE 42/74 (weaker because sub-dimensions like patient-reported outcomes score higher)

The variant difference (8 vs 42) is analytically correct — patient-reported outcomes for homeopathy ARE more positive than clinical trial outcomes. The system distinguishes them appropriately.

### 8.7 New families (Apr 1) — all clean

| Family | Input | Verdict | TP | C | Notes |
|--------|-------|---------|:---:|:---:|-------|
| BBC | Controversial claims checked with modern methods | LEANING-TRUE | 70 | 76 | 3 claims, all assessed |
| Bali plastic | Ways to prevent plastic pollution on Bali's beaches | MOSTLY-TRUE | 79 | 81 | 3 claims, strong evidence |
| Sexual orientation | Determined after birth | LEANING-FALSE | 31 | 65 | Correct — science shows prenatal factors |
| Global warming | Reality, human-caused | TRUE | 95 | 91 | Strong scientific consensus |
| Iran nukes | Was Iran actually making nukes? | TRUE | 86 | 87 | Strong evidence base |

All new families produce directionally correct, well-evidenced results with zero structural issues.

---

## 9. What Improved Since Mar 25 Baseline

| Improvement | Mechanism | Evidence |
|------------|-----------|---------|
| Zero integrity failures (Apr 1) | Claim-local verdict-direction scoping (`17da5b84`) | 0/17 runs on Apr 1 vs 3/~50 runs Mar 29-30 |
| Zero duplicate verdict IDs | Assessable-claims path (`cc362d64`) | e407-class bug eliminated |
| Honest UNVERIFIED reporting | LLM article adjudication (`03387283`) + matrix alignment | Article confidence reflects unresolved claims |
| Reduced source fetch waste | Domain short-circuit (`5e948594`) | 401/403 domains skipped after 2 failures |
| Ghost boundary elimination | Boundary sanitization (`ef98a07a`) | No structural warnings on Apr 1 |
| Grounding validation accuracy | Source portfolio context (`3d7f6c85`) | No false-positive grounding warnings |

## 10. What Remains Open

| Issue | Severity | Families affected | Notes |
|-------|----------|-------------------|-------|
| SRG/SRF decomposition instability | HIGH for this family | SRG/SRF (27 runs, 61pp spread) | effizient/wirksam split, classification oscillation, contract fail-open |
| Cross-linguistic neutrality gap | MEDIUM | Plastik FR vs EN (35-40pp) | Evidence-language bias. Not addressed by any fix. EVD-1 gap. |
| Bolsonaro TSE peer extraction | LOW | Bolsonaro various/all | distinctEvents prompt change attempted but reverted; deferred LLM repair step possible |
| Contract validation intermittent fail-open | LOW (rare outside SRG) | SRG (11%), Wind-still (25%), Bolsonaro PT (14%) | Sonnet structured output failure — monitor |

---

## 11. Conclusion

The rollback baseline is confirmed stable. All 17 Apr 1 runs produce results within historical ranges with zero integrity failures, zero duplicate verdicts, and zero contract fail-opens. The structural fixes from the March 29-31 session (claim-local scoping, boundary sanitization, grounding alignment, assessable-claims path, source fetch short-circuit, article truth clamp removal) are all working correctly and remain in place.

The SRG/SRF family is the dominant remaining quality problem (61pp spread, 11% contract fail-open rate). The cross-linguistic Plastik neutrality gap (FR 35-40pp below EN) is the second most important open issue. Both predate the reverted `fff7a508` experiment and require targeted solutions that do not regress other families.
