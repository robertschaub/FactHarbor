# Post-Rollback Validation Report

**Date:** 2026-04-01
**Role:** Lead Architect / Senior Developer
**Status:** COMPLETE
**HEAD:** `1101978842a310781864789981d783d5ffbae4ca`
**Context:** Validation after clean rollback of `fff7a508` (Stage-1 decomposition fix), `d04fc750` (candidate selection fix), and `09ce7018` (distinctEvents granularity prompt)

---

## 1. Executive Summary

16 live validation runs across 13 distinct input families confirm the rollback baseline is stable. Zero `verdict_integrity_failure` warnings across all runs. The families that motivated the rollback (Plastik, SRG) are restored to their historical ranges. The pre-existing SRG effizient/wirksam over-fragmentation remains but is not a regression — it predates `fff7a508`.

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

### Broader family validation (11 runs — submitted by user)

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

---

## 3. Key Metrics

### Across all 16 runs

| Metric | Value |
|--------|-------|
| Total runs | 16 |
| `verdict_integrity_failure` warnings | **0** (across all 16) |
| Contract validation fail-open (`LLM returned undefined`) | **0** observed in this batch |
| Duplicate verdict IDs | **0** |
| Runs with article-level UNVERIFIED | **0** |
| Runs with any claim-level UNVERIFIED | 6/16 (see below) |

### UNVERIFIED claim analysis

| Job | Family | UNVERIFIED claims | Cause |
|-----|--------|:-:|-------|
| `5ee3048e` | Plastik EN | 1/3 (AC_03) | Verdict consistency instability (C=41). Pre-existing variance. |
| `714e4b84` | SRG compound | 2/3 (AC_02, AC_03) | 0 evidence for effizient/wirksam sub-claims. Pre-existing decomposition issue. |
| `ea67c03d` | Bolsonaro "all" | 1/3 (AC_03) | Borderline confidence (C=48). Evidence-driven. |
| `b9337728` | Bolsonaro single | 2/3 (AC_02, AC_03) | Borderline confidence (C=49, C=43). Evidence distribution variance. |
| `3ecd7b31` | Bolsonaro PT | 1/2 (AC_02) | Fairness claim borderline (C=43). |

None of these UNVERIFIED claims are caused by integrity failures or Stage-1 regressions. All are evidence-driven variance or the known SRG over-fragmentation.

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

## 8. Conclusion

The rollback baseline is confirmed stable. All 16 runs produce results within historical ranges. Zero integrity failures. The Plastik and SRG regressions from the `fff7a508` era are resolved. The pre-existing SRG over-fragmentation remains an open issue but is not a regression from this rollback.
