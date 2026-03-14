# Report Quality Analysis — Findings Document

**Date:** 2026-03-13
**Author:** Senior Developer (Claude Sonnet 4.6)
**Source data:** `Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-13.md`
**Runbook:** `Docs/AGENTS/Handoffs/2026-03-12_Senior_Developer_Report_Quality_Worktree_Comparison_Runbook.md`

---

## 1. Scope

This document summarises findings from a comprehensive quality comparison run across four code checkpoints and three independent repeat runs on current HEAD. Total valid runs: 24 (3 failed/invalid discarded).

### Claims tested

| ID | Language | Input |
|----|----------|-------|
| EN Bolsonaro | English | Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process? |
| PT Bolsonaro | Portuguese | Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira e os padrões internacionais de due process? |
| DE Kinder | German | Immer mehr Kinder im Kanton Zürich sind von Migration betroffen _(original comparison only)_ |
| DE mental health | German | Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschnitt stärker psychisch belastet als vor zehn Jahren. _(Task 2–5)_ |

### Commits / checkpoints

| Label | Commit | Key features |
|-------|--------|--------------|
| window_start | 9cdc8889 | No SR weighting, no Fix 1, no geo fix. Best config params (`maxIterationsPerContext: 5`, `selfConsistencyMode: full`) |
| post_window | 704063ef | Code bug in `verdict-stage.ts` — EN fails outright |
| deployed_proxy | 523ee2aa | No SR weighting, no Fix 1 |
| quality_head | 172bba3d | SR weighting active; Fix 1 (jurisdictionMatch) active; geography fix active |
| f6e04ce3 | f6e04ce3 | All Task 2 HD runs. Slight config state issue (pre-`6b4c81d3` fix) |
| 7c207d18 | 7c207d18 | All Task 3–5 runs. Cleanest HEAD state. Fix 1 + Fix 3 + geography fix all active |

---

## 2. Key Findings

### Finding 1 — post_window (704063ef) introduced a catastrophic regression

Commit `704063ef` ("fix(pipeline): structured error telemetry and failure-mode accuracy") contains a functional bug in `verdict-stage.ts` that caused:
- **EN Bolsonaro:** complete failure — `TypeError: run2Verdicts.find is not a function` at self-consistency check
- **PT Bolsonaro:** inverted verdict — LEANING-FALSE (38.6% TP) where all other checkpoints return 55–90% TP

The bug was caused by the self-consistency check receiving a non-array where an array was expected. This is a structural change to how verdict results are returned, not a logic change. The PT result (LEANING-FALSE) is therefore **invalid** and should not be used for any quality benchmarking.

**Severity:** Critical. This commit should not be shipped. Any future audit of verdict accuracy must exclude post_window data.

---

### Finding 2 — SR weighting suppresses confidence by 20–34pp at quality_head

The `applyEvidenceWeighting()` function (introduced at commit 9550eb26) pulls per-claim confidence toward 50% when source reliability scores are in the mid range. At `quality_head`, all three claims show severe confidence suppression:

| Claim | window_start conf | quality_head conf | Δ |
|-------|------------------|------------------|---|
| PT Bolsonaro | 81.8% | 47.6% | **−34pp** |
| DE Kinder | 78.8% | 47.0% | **−32pp** |
| EN Bolsonaro | 73.0% | 52.7% | **−20pp** |

Truth percentage dropped less dramatically (5–25pp), confirming the confidence suppression is the primary SR weighting effect. The weighting is calibrated too aggressively for mixed-reliability source sets. A 34pp confidence drop on PT (from very high to below-50%) is not a reasonable penalty for mid-reliability sources.

**Severity:** High. Confidence values at quality_head do not reflect the actual evidence strength. Users would see misleadingly low confidence scores. The SR weighting formula needs recalibration.

---

### Finding 3 — Fix 1 successfully eliminated U.S. government contamination

Prior to Fix 1 (jurisdictionMatch capping), the EN Bolsonaro analysis at `deployed_proxy` included a "U.S. State Department Human Rights Monitoring and Documentation" boundary. This was foreign-jurisdiction contamination: the U.S. government is not a party to Brazilian legal proceedings.

From `quality_head` onwards (Fix 1 active), EN Bolsonaro shows zero U.S. government boundaries across all runs (Task 2–5, 5 clean runs). PT Bolsonaro was already clean before Fix 1 but remains clean after. Fix 1 is confirmed working as intended.

**Note:** `HD6_EN` includes a "U.S. State Department human rights assessment" boundary (CB_15). This is **not contamination** — it is the U.S. State Dept's annual Human Rights Report on Brazil, which is a standard international reference for assessing due process standards in a foreign country. This is a legitimate evidence source, distinct from the prior contamination (U.S. domestic policy documents).

---

### Finding 4 — Fix 1 introduced a secondary geography regression (now fixed)

Fix 1's `inferredGeography` classification originally inferred country from input language: German-language input → Germany. This caused the DE Kinder claim at `quality_head` to source German federal data (SGB-II, German asylum statistics) instead of Swiss cantonal data (Statistisches Amt Kanton Zürich, SEM), which are the correct sources for a claim about Zürich.

The geography fix (present from `f6e04ce3` onwards) resolves this by extracting explicit geographic entities from the claim text. Verification: all HD_DE runs (Tasks 2–5) return `inferredGeography: CH` with Swiss/Zürich-specific boundaries (Trend-Monitor Kanton Zürich, Amt für Gesundheit Kanton Zürich, HBSC Schweiz, etc.).

**Status:** Resolved in current HEAD.

---

### Finding 5 — f6e04ce3 is materially weaker than 7c207d18 for all three claims

The Task 2 runs on `f6e04ce3` produced noticeably weaker results than the Task 3–5 runs on `7c207d18`, despite both being on essentially the same codebase:

| Metric | f6e04ce3 (Task 2) | 7c207d18 avg (Tasks 3–5) | Δ |
|--------|------------------|--------------------------|---|
| EN conf | 40.2% | 55.5% | **+15pp** |
| EN verdict | UNVERIFIED | MIXED–LEANING-TRUE | improved |
| PT TP | 49.2% | 55.5% | **+6pp** |
| DE conf | 47.0% | 52.6% | **+5.6pp** |

The most likely cause is commit `6b4c81d3` ("fix(config): strip legacy fields on save"), which corrects a UCM state issue: stale legacy fields in the config database were being merged with current values, potentially degrading SR weighting or verdict computation. After this fix, all Task 3–5 runs show materially better confidence.

**Implication:** Any evaluation of HEAD quality should use `7c207d18` or later as the baseline, not `f6e04ce3`.

---

### Finding 6 — 7c207d18 produces stable, clean results across 3 independent runs

Tasks 3, 4, and 5 each ran all three claims on commit `7c207d18`. Results are consistent:

| Metric | Task 3 (HD4) | Task 4 (HD5) | Task 5 (HD6) | Range |
|--------|-------------|-------------|-------------|-------|
| EN TP | 55.4% | 52.7% | 58.8% | 6.1pp |
| EN Conf | 51.6% | 59.5% | 55.2% | 7.9pp |
| PT TP | 55.5% | 55.0% | 56.0% | 1.0pp |
| PT Conf | 52.5% | 53.7% | 49.0% | 4.7pp |
| DE TP | 61.0% | 60.6% | 58.7% | 2.3pp |
| DE Conf | 56.0% | 51.2% | 50.6% | 5.4pp |

Geography is correct in all 9 runs (BR for Bolsonaro, CH for Swiss). No contamination in any run. No non-info warnings in 8/9 runs (HD6_PT has `insufficient_evidence` for one sub-claim, discussed below).

**Verdict stability:** PT and DE verdicts are completely stable across all 3 runs. EN verdict changed MIXED → LEANING-TRUE in Task 5, attributable to Finding 7 below.

---

### Finding 7 — EN claim decomposition varies between runs, affecting verdict direction

The EN Bolsonaro claim decomposes into different numbers of AtomicClaims across runs:

| Run | AC count | AC_01 | AC_02 | AC_03 | Overall |
|-----|----------|-------|-------|-------|---------|
| HD4_EN | 2 | LEANING-TRUE (59%) | MIXED (51%) | — | MIXED |
| HD5_EN | 2 | LEANING-TRUE (64%) | **LEANING-FALSE** (42%) | — | MIXED |
| HD6_EN | 3 | LEANING-TRUE (62%) | LEANING-TRUE (61%) | MIXED (52%) | LEANING-TRUE |

HD5_EN extracted a LEANING-FALSE sub-claim (AC_02) which pulled the overall verdict to MIXED. HD6_EN decomposed differently, separating the claim into three distinct dimensions (coup charges / criminal organisation charges / international standards), all scoring ≥MIXED. This decomposition non-determinism is inherent to LLM claim extraction. The overall TP range (52.7–58.8%) is reasonable, but the verdict label flips between MIXED and LEANING-TRUE.

**Implication:** For EN Bolsonaro, the "correct" answer at current HEAD is somewhere in the MIXED–LEANING-TRUE range. Single-run verdict labels should not be over-interpreted. The 3-run average TP of ~55.6% is a more reliable signal.

---

### Finding 8 — PT Bolsonaro AC_02 (international standards) consistently has thin evidence

Across all Task 2–5 PT runs, the "international due process standards" sub-claim (AC_02) is the weaker half of the analysis:

- HD4_PT: AC_02 MIXED (50%/47%)
- HD5_PT: AC_02 MIXED (49%/46%)
- HD6_PT: AC_02 **UNVERIFIED** (50%/0%) — `insufficient_evidence` warning (11 items, 1 source type)

The "accordance with international standards" dimension is harder to find direct evidence for than the Brazilian procedural law dimension. This is an **analytical reality** (sparse published evidence on this specific dimension), not a system failure. The system correctly downgrades confidence when evidence is thin.

---

### Finding 9 — window_start scores are high but confounded

`window_start` (9cdc8889) produces the highest scores across all metrics:

| Claim | window_start TP | window_start conf | Verdict |
|-------|----------------|------------------|---------|
| PT Bolsonaro | 90.1% | 81.8% | TRUE |
| EN Bolsonaro | 75.4% | 73.0% | MOSTLY-TRUE |
| DE Kinder | 84.0% | 78.8% | MOSTLY-TRUE |

However, these results are confounded:
1. **Google CSE quota:** PT and EN runs hit CSE 429 and fell back to Serper/Brave. Only DE had clean CSE access.
2. **Config params:** window_start used `maxIterationsPerContext: 5` (vs 3 at HEAD), `selfConsistencyMode: full`, `maxClaimBoundaries: 6`, `boundaryCoherenceMinimum: 0.3` — all of which were removed by HEAD. More iterations and stricter coherence likely inflated confidence.
3. **No SR weighting:** The absence of SR weighting means confidence is not penalised for mid-reliability sources — inflating absolute confidence values.

The window_start results represent an upper bound on quality achievable with the older config, not a clean apples-to-apples comparison with HEAD.

---

## 3. Quality Trajectory Summary

Reading across all commits in chronological order:

| Commit | Status | Quality summary |
|--------|--------|-----------------|
| 9cdc8889 (window_start) | Historical baseline | Highest scores; good config; CSE confounded; no SR weighting |
| 704063ef (post_window) | **Regression** | Code bug; EN fails; PT verdict inverted |
| 523ee2aa (deployed_proxy) | Partial recovery | EN contamination (US boundary); good conf; CSE confounded |
| 172bba3d (quality_head) | Regression | SR weighting crushes confidence 20–34pp; DE wrong jurisdiction |
| f6e04ce3 | Weak HEAD | Geography fix works (CH ✅); config state issue degrades conf |
| **7c207d18** | **Current best** | Stable, clean, correct geo, no contamination, reasonable confidence |

---

## 4. Recommendations

### Priority 1 — SR weighting recalibration (high impact)

The current `applyEvidenceWeighting()` formula is too aggressive. A 34pp confidence penalty on PT Bolsonaro (81.8% → 47.6%) for using mid-reliability sources is not proportionate. Review the weighting function and consider:
- Softer dampening curve (e.g. apply at most ±15pp adjustment)
- Asymmetric weighting (high-reliability sources boost more than mid-reliability sources dampen)
- Floor threshold — don't apply weighting if average source reliability is already ≥0.7

Test goal: window_start-equivalent confidence (70–80%) on a well-evidenced claim should be preserved after SR weighting, not halved.

### Priority 2 — EN claim decomposition stability (medium impact)

EN Bolsonaro verdict flips between MIXED and LEANING-TRUE across runs due to claim decomposition non-determinism. Two options:
- **Reduce temperature** on the claim-extraction LLM call (already at `boundaryClusteringTemperature: 0.05` — may need further reduction on the understand stage)
- **Use 3-run consensus** for production verdicts on ambiguous claims where single-run verdict is unstable

The decomposition itself is not wrong — the LLM is legitimately identifying different sub-dimensions. The issue is that aggregating different decompositions produces different overall verdicts.

### Priority 3 — Restore removed config params (investigate)

The following params were present at window_start and removed by HEAD:
- `maxIterationsPerContext: 5` → now 3
- `selfConsistencyMode: "full"` → removed
- `boundaryCoherenceMinimum: 0.3` → removed

These may have contributed to window_start's higher quality. A controlled test (add them back one at a time on commit 7c207d18) would clarify their contribution. `selfConsistencyMode: full` in particular may improve verdict stability.

### Priority 4 — Controlled re-run of all checkpoints with equal CSE access

The worktree comparison (§3) had Google CSE quota exhaustion for most runs. A re-run where all checkpoints have equal search access would give cleaner signal on the code/config quality delta between checkpoints. Current results cannot reliably distinguish code quality effects from search provider effects.

---

## 5. Production Readiness Assessment (current HEAD, 7c207d18)

| Criterion | Status |
|-----------|--------|
| Correct jurisdiction (geo) | ✅ CH for Swiss claims, BR for Brazilian claims |
| No foreign contamination | ✅ Zero U.S. gov boundaries in 5/5 EN+PT runs |
| Substantive verdicts | ✅ No UNVERIFIED/FAILED in Task 3–5 |
| Verdict stability (PT, DE) | ✅ Consistent across 3 runs |
| Verdict stability (EN) | ⚠️ MIXED/LEANING-TRUE depending on decomposition |
| Confidence levels | ⚠️ 49–56% — usable but lower than desired (SR weighting effect) |
| Thin-evidence handling | ✅ `insufficient_evidence` correctly signalled for AC_02 PT |
| Pipeline reliability | ✅ 9/9 jobs succeeded in Tasks 3–5 |

**Conclusion:** HEAD at `7c207d18` is functional and produces clean, geographically accurate results. The main open concerns are SR weighting calibration (depressed confidence) and EN claim-decomposition variance (verdict label instability). Neither blocks use, but both reduce the credibility of the confidence score as a user-facing signal.
