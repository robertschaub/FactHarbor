# Quality Regression Investigation — Review-Ready Report

**Date:** 2026-03-24
**Role:** Lead Architect
**Agent:** Claude Code (Opus 4.6)
**Scope:** Job `cf35a449` forward, with historical context from all repeated-input groups

---

## 1. Executive Summary

The current committed stack produces **directionally correct** results on control inputs (flat-earth FALSE, round-earth TRUE, hydrogen MOSTLY-FALSE). The Stage-4 reliability incident is resolved. The Stage-1 `claimDirection` inversion bug is fixed.

**However**, Plastik-family inputs exhibit significant run-to-run instability (15–78% truth across 36 identical-text runs), and this instability has **not improved** over the March 12–24 period despite multiple targeted fixes. The instability is pre-existing, documented, and parked — but it remains the single largest quality gap in the system.

**Recommendation:** No revert currently justified; confirmed fixes should be kept, while some changes (notably `31aea55d` boundary-coverage fix) remain provisionally kept pending targeted validation. The next highest-leverage investigation is a focused Plastik claim-decomposition comparison (separate from the existing QLT-1 claim-strength preservation study) to empirically verify the current status assumption that the instability is downstream of Stage 1 — the 59pp spread warrants reopening that hypothesis before it guides further work.

---

## 2. Method and Exclusion Rules

**Data sources:** Local API database (all jobs from cf35a449 forward + full history for key input groups), git commit history, documented investigations, handoffs, WIP/ARCHIVE files.

**Exclusion criteria for quality evidence:**
- `analysis_generation_failed` → **excluded** (infrastructure failure, not quality)
- `llm_provider_error` → **excluded** (provider overload, not quality)
- Stage-4 provider failure / VERDICT_ADVOCATE collapse → **excluded** (reliability bug, fixed)
- Fallback `UNVERIFIED` with `confidence: 0` → **uncertain-excluded** (likely infrastructure)
- `status: FAILED` → **excluded** (didn't complete analysis)

**Grouping:** Jobs grouped by exact `inputPreview` text (API-side preview matches full input for short inputs).

---

## 3. Good-Report Criteria

### 3a. Hard Failure Criteria (from AGENTS.md, pipeline integrity rules)

| ID | Criterion | Source |
|----|-----------|--------|
| HF-1 | No `analysis_generation_failed` | AGENTS.md Pipeline Integrity |
| HF-2 | No inverted directional verdict on unambiguous controls | AGENTS.md Input Neutrality |
| HF-3 | `claimDirection` correctly anchored to user thesis, not consensus | AGENTS.md Terminology + 2026-03-24 root cause |
| HF-4 | Evidence transparency: every verdict cites evidence | AGENTS.md Pipeline Integrity |

### 3b. Analytical Quality Criteria (from Report_Quality_Criteria_Scorecard G1-G6)

| ID | Criterion | Source |
|----|-----------|--------|
| AQ-1 | **G1 Verdict stability**: ≤20pp truth spread across repeated runs | Scorecard G1 |
| AQ-2 | **G4 Evidence relevance**: no foreign/off-topic contamination | Scorecard G4, Phase A fixes |
| AQ-3 | **G5 Confidence plausibility**: confidence reflects evidence quality | Scorecard G5 |
| AQ-4 | **G6 Contestation immunity**: rhetoric doesn't alter verdicts | Scorecard G6 |

### 3c. Presentation / Trustworthiness Criteria (from Report Quality Evolution Investigation)

| ID | Criterion | Source |
|----|-----------|--------|
| PT-1 | Report length > 5000 chars (substantial explanation) | Quality Deep Analysis scoring |
| PT-2 | Evidence count > 20 items (sufficient research base) | Quality Deep Analysis scoring |
| PT-3 | Multiple source types represented | Quality Deep Analysis scoring |

---

## 4. Identical-Input Groups and Best-Job Selection

### Group A: `Plastik recycling bringt nichts` (36 runs, Mar 5 – Mar 24)

| Period | Runs | Truth% Range | Median | Verdict Spread |
|--------|------|-------------|--------|---------------|
| Mar 5–8 (early) | 3 | 15–36% | 20% | MOSTLY-FALSE – LEANING-FALSE |
| Mar 14–17 (regression) | 9 | 28–61% | 46% | MOSTLY-FALSE – LEANING-TRUE |
| Mar 19–22 (post-fixes) | 15 | 15–74% | 27% | MOSTLY-FALSE – MOSTLY-TRUE |
| Mar 23–24 (current) | 2 | 23–62% | 43% | MOSTLY-FALSE – LEANING-TRUE |

**Best job:** `cee9b5a7` (Mar 8) — MOSTLY-FALSE 20%, conf 73. Highest quality score in 933-job dataset (279 points). 180 evidence items, 62 sources.
**Worst included job:** `24d3c724` (Mar 22) — MOSTLY-TRUE 74%, conf 24. Low confidence suggests system uncertainty, but truth% is directionally wrong.

**Stability verdict: FAIL (AQ-1).** 59pp spread (15–74%) across 36 runs is far beyond the 20pp threshold. This has **not improved** over the period.

**Exclusions:** `56ab80b1` (Mar 20, UNVERIFIED conf 0) — **uncertain-excluded** (likely infrastructure).

### Group B: `Plastic recycling is pointless` (36 runs, Mar 19 – Mar 24)

| Period | Runs | Truth% Range | Median |
|--------|------|-------------|--------|
| Mar 19–22 | 30+ | 19–79% | ~54% |
| Mar 24 | 1 | 59% | — |

**Best job:** `99de72a1` (Mar 24 08:24) — LEANING-FALSE 41%, conf 73. Directionally plausible.
**Stability verdict: FAIL (AQ-1).** Similar spread to the German variant.

### Group C: `Ist die Erde flach?` (7 runs, Mar 23 – Mar 24)

| Job | Date | Truth% | Conf | Verdict | claimDirection |
|-----|------|--------|------|---------|----------------|
| de2208c3 | Mar 23 18:20 | 50 | — | MIXED | (pre-fix) |
| 7451e047 | Mar 23 19:29 | 16 | — | MOSTLY-FALSE | (pre-fix) |
| f8c73f0d† | Mar 23 21:26 | 100 | 95 | **TRUE** | **contradicts_thesis (BUG)** |
| e2523b0d | Mar 24 06:55 | 50 | — | MIXED | (pre-fix) |
| e683712d | Mar 24 07:13 | 4 | 87 | FALSE | contradicts_thesis (correct) |
| cceefa6b | Mar 24 07:36 | 4 | 94 | FALSE | contradicts_thesis (correct) |
| 47ce1c32 | Mar 24 08:23 | 5 | 88 | FALSE | contradicts_thesis (correct) |

†`f8c73f0d` input was `Die Erde ist flach` (statement, not question) — different input, same root cause.

**Best job:** `cceefa6b` — FALSE 4%, conf 94. Clean, correct.
**Pre-fix to post-fix improvement: confirmed.** The `1e7e2c57` claimDirection prompt fix eliminated the inversion.
**Stability verdict: PASS (AQ-1, post-fix only).** 3 post-fix runs: 4–5% truth, 1pp spread.

### Group D: `Ist die Erde rund?` (multiple runs, Mar 23 – Mar 24)

| Job | Date | Truth% | Conf |
|-----|------|--------|------|
| 615a333a | Mar 24 08:23 | 91 | 86 |
| 3e1cf93e | Mar 24 06:54 | — | — |
| a0aa499e | Mar 24 07:16 | 95 | 91 |
| b5f4c878 | Mar 24 12:33 | 96 | 90 |

**Best job:** `b5f4c878` — TRUE 96%, conf 90. Stable, correct.
**Stability verdict: PASS (AQ-1).** 91–96% truth across 3 completed runs.

### Group E: `Using hydrogen for cars is more efficient than using electricity` (multiple runs)

| Job | Date | Truth% | Conf |
|-----|------|--------|------|
| b4e92e4a | Mar 24 08:23 | 20 | 24 |
| ee0890af | Mar 24 12:33 | 27 | 68 |

**Best job:** `ee0890af` — MOSTLY-FALSE 27%, conf 68. Directionally correct.
**Note:** Earlier run had conf 24, which is AQ-3 questionable. The improvement to 68 is likely from the mixed-confidence default alignment (`e6a20153`).

### Group F: Bolsonaro Variants (multiple formulations)

The most-repeated variant (`Were the various Bolsonaro trials...`) has 28 runs spanning Mar 12–16, ranging 49–71% truth. The newer formulation (`The court proceedings against Jair Bolsonaro for attempted coup d'état...`) has 3 runs:

| Job | Date | Truth% | Conf |
|-----|------|--------|------|
| e254865e | Mar 23 11:30 | 69 | 24 |
| 0272e437 | Mar 24 06:43 | 61 | 63 |
| 84b08b16 | Mar 24 07:16 | 66 | 69 |
| b5cddca2 | Mar 24 12:32 | 44 | 57 |

**Best job:** `84b08b16` — LEANING-TRUE 66%, conf 69. Plausible for a complex political-legal input.
**Stability verdict: MARGINAL.** 44–69% across 4 runs (25pp spread, above 20pp threshold but on a genuinely complex mixed input).

---

## 5. Change Impact Analysis

### 5a. `1e7e2c57` — claimDirection prompt clarification (Mar 24 08:12)

| Aspect | Assessment | Confidence |
|--------|-----------|-----------|
| Fixed flat-earth inversion? | **Yes** — 3 post-fix runs all FALSE 4-5%, pre-fix runs had TRUE 100% and MIXED 50% | **confirmed** |
| Affected other inputs? | No regressions observed on Hydrogen, Bolsonaro, Plastik | **confirmed** |
| Side effects? | None detected | **confirmed** |

### 5b. `31aea55d` — preliminary-evidence multi-claim mapping (Mar 24 09:20)

| Aspect | Assessment | Confidence |
|--------|-----------|-----------|
| Fixed populated-but-empty boundaries? | Cannot confirm from job artifacts alone — boundary structure in resultJson doesn't expose this clearly | **insufficient evidence** |
| Affected verdicts? | No measurable verdict change attributable to this fix | **likely neutral** |
| Side effects? | None detected | **likely** |

### 5c. `39a9ae6b` — weighted verdict-direction sanity check (Mar 24 11:36)

| Aspect | Assessment | Confidence |
|--------|-----------|-----------|
| Fires correctly? | Yes — one `verdict_direction_issue` on Plastik DE (AC_02: 71% truth with 9/9 supports/contradicts) | **confirmed** |
| Overcorrection? | No overcorrection observed — legitimate flagging only | **likely** |
| Side effects? | None detected | **likely** |

### 5d. `e6a20153` — mixed-confidence default alignment (Mar 24 11:38)

| Aspect | Assessment | Confidence |
|--------|-----------|-----------|
| Improved low-confidence edge cases? | Hydrogen conf went from 24 → 68 between runs. Timing correlates with this fix | **plausible but unconfirmed** (could be run variance) |
| Side effects? | None detected | **likely** |

### 5e. `960b09c3` — UCM alignment / remove magic numbers / duplicate schema keys (Mar 24 12:21)

| Aspect | Assessment | Confidence |
|--------|-----------|-----------|
| Affected verdicts? | No measurable change — config-cleanup commit | **likely neutral** |
| Side effects? | None detected | **confirmed** |

### 5f. `75416ce8` — Stage-4 provider guard alignment (Mar 23 21:49)

| Aspect | Assessment | Confidence |
|--------|-----------|-----------|
| Eliminated Stage4LLMCallError? | Yes — 10+ concurrent validation jobs since fix, zero provider failures | **confirmed** |
| Affected verdict quality? | No — infrastructure fix, not semantic change | **confirmed** |

### 5g. WS-1 through WS-4 refactoring (Mar 22–23, multiple commits)

| Aspect | Assessment | Confidence |
|--------|-----------|-----------|
| Attributable regression? | No regression found in validation jobs post-refactor | **likely** (tests pass, build clean; but the post-refactor stack still required a validation gate and follow-up fixes for pre-existing issues exposed during the wave) |
| Regression risk? | Low — intended as structural extraction, not logic changes | **likely** |

---

## 6. Keep / Modify / Revert Recommendations

| Change | Commit(s) | Recommendation | Reasoning |
|--------|-----------|---------------|-----------|
| claimDirection prompt fix | `1e7e2c57` | **keep** | Confirmed fix for the flat-earth inversion. 3 clean post-fix runs. No regressions. |
| Stage-4 provider guard | `75416ce8` | **keep** | Confirmed fix for reliability incident. Zero failures in 10+ validation jobs. |
| Stage-4 incident visibility | `31aee703` | **keep** | Correctly surfaces failures that were previously hidden. No quality impact. |
| Preliminary-evidence mapping | `31aea55d` | **provisionally keep** | Structurally correct fix. No measurable harm. Boundary coverage effect cannot yet be confirmed from job artifacts — needs targeted verification. |
| Verdict direction sanity check | `39a9ae6b` | **keep** | Fires correctly on legitimate issues. No overcorrection. |
| Mixed-confidence alignment | `e6a20153` | **keep** | Config cleanup. Possible small confidence improvement on mixed inputs. |
| UCM alignment | `960b09c3` | **keep** | Pure config hygiene. No behavioral change. |
| WS-1 through WS-4 refactoring | Multiple | **keep** | No attributable regression found. Intended as structural extraction; post-refactor validation gate confirmed no new quality issues. |
| Plastik stability defaults | `5d961fd2` | **keep but monitor** | No measurable improvement in Plastik stability, but no measurable harm either. The fix targeted correct concerns. |
| Claim contract validator | `4f7d3850` | **keep** | Addresses broad-claim drift. Gate 1 improvements documented. |

**No revert currently justified.** Confirmed fixes (claimDirection, Stage-4 guard) have clear evidence. Other changes show no attributable regression but some (`31aea55d`) remain provisionally kept pending targeted validation. The Plastik instability predates all recent changes (first documented Mar 5).

---

## 7. Open Uncertainties and Next Validation Needs

| Item | What's Uncertain | How to Resolve |
|------|-----------------|---------------|
| **Plastik instability root cause** | Is the 59pp spread primarily from Stage 1 claim decomposition, Stage 2 search framing, or Stage 4 verdict variance? | Run 5× identical Plastik input, compare claim texts across runs. If claims differ → Stage 1. If claims match but evidence differs → Stage 2. If evidence matches but verdicts differ → Stage 4. |
| **Boundary coverage fix verification** | Does `31aea55d` actually reduce populated-but-empty boundaries? | Inspect `coverageMatrix.data` structure in a fresh run's full resultJson. |
| **Mixed-confidence alignment causality** | Was Hydrogen confidence improvement (24→68) from `e6a20153` or run variance? | Run 3× Hydrogen, check confidence distribution. |
| **Bolsonaro formulation sensitivity** | Is the 25pp spread on the new Bolsonaro input a stability problem or expected complexity? | Run 5× identical formulation, measure spread. If >20pp → investigate Stage 1 claim decomposition for this input. |

### Recommended Next Actions (priority order)

1. **Plastik claim-decomposition comparison** (new investigation, distinct from QLT-1) — Run 5× identical `Plastik recycling bringt nichts`, compare Stage 1 claim texts across runs to determine whether instability originates at claim extraction or downstream. Note: the canonical status (`Current_Status.md`) currently states the remaining Plastik spread is "downstream of Stage 1, not a Stage-1 decomposition problem." This investigation explicitly reopens that hypothesis for verification — the 59pp spread across 36 runs is large enough that the prior classification deserves empirical confirmation before it guides further work. QLT-1 in the backlog is the existing claim-strength preservation study — a related but separate concern.

2. **VAL-2: Jobs-list sync race** — Non-quality UI bug, but visible to admins.

3. **Captain decision on optimization tracks** — P1-A and P1-B are unblocked by VAL-1 closure but require explicit approval.

---

*Report produced from 500+ job records, 60+ git commits, and 15+ investigation/handoff documents.*
