# Plastic Reasonable-Reading — Execution Plan (PLAN-LEVEL, for grounded review)

**Author:** Lead Architect · **Date:** 2026-05-31 · **Status:** under grounded review; "if consolidated, go." Plan-level only — NOT a carve-out spec (premature until baseline + feasibility are settled).

## Settled (do NOT re-litigate in review)
- **Diagnosis** (3 independent reviewers + my code re-verification): the pipeline assesses the **literal** reading of evaluative predicates because of an active **literal-lock** — predicate-strength preservation (`claimboundary.prompt.md:275`, forbids softening "brings nothing"→"is ineffective") + scope-of-truth (`:1468` advocate / `:1679` reconciler, assess only the literal proposition) — *plus* the absence of any reasonable-reading / reading-declaration / interpretation-laden confidence-cap mechanism.
- **Cap-site** (code-verified): the ≤75 cap must use **per-claim verdict confidence** (`:1469`) or a dedicated knob — **NOT** `adjustedConfidence` (5pp-floored at `aggregation-stage.ts:437-446` / `config-schemas.ts:1928`; cannot reach ≤75).
- **The bar:** plastic centered 42–65 (target 50–60), conf ≤75, narrative declares which reading (`benchmark-expectations.json` + `Captain_Quality_Expectations.md:101`, generic principle).

## The proposed fix (plan-level)
The only change that meets the bar's **intent** (not just the declaration gate) is a **reasonable-reading carve-out for evaluative predicates**, so the verdict assesses the reasonable construal rather than the categorical-literal one — paired with the reading-declaration and the ≤75 cap. Regression risk to be **bounded** by touching only `275`/the evaluative path and leaving scope-of-truth (`1468/1679`) and the modifier rules (`274` truth-condition-bearing modifier, `276` action/state threshold — these protect bolsonaro/bundesrat) intact.

## Two hard problems this plan must respect
1. **No HEAD baseline exists.** The "canary" `939563ec` (LF 37/62) is *historical* (pre the 3 post-canary commits) and a single draw from a high-variance process (evidence Jaccard 0.10–0.29). The Captain's **fail-fast rule** ("revert if the first 3 jobs regress") is **un-runnable without a HEAD baseline to measure against.** ⇒ A baseline (3–5 HEAD `plastic-en` runs) looks like a **prerequisite to any prompt change**, and could **kill the fix**: if HEAD already centers ~50–60, the carve-out is unnecessary and the right move is to pivot to the larger population defect (`report_damaged`/gate-error census, now unblocked).
2. **The carve-out may be the stochastic-tiebreaker trap.** A prompt instruction to "assess the reasonable reading" is the same *class* of interpretive instruction that just failed live at Stage 1 (`ed7698a8` → reverted `1c790a05`: a prompt tiebreaker "cannot reliably override the stochastic classification at temperature 0.15; the real lever is temperature/structural"). If reasonable-reading selection can't be reliably steered by prompt, the prompt approach is mis-scoped and the honest options are a structural/temperature lever or accepting "literal-but-declared" as a documented limitation.

## Proposed sequence (for the review to confirm or correct)
1. **Baseline first (live, read-out):** 3–5 HEAD `plastic-en` runs (canonical input "Plastic recycling is pointless"), commit-first so the runs bind a clean commit hash. Read where HEAD lands (label/truth/confidence distribution) + whether the narrative declares a reading.
2. **Branch on the baseline:**
   - HEAD already centers (~50–60, conf ≤~75) → **pivot** to the population census (plastic fix not needed now).
   - HEAD lands literal/low-edge → proceed to a concrete carve-out spec (separate proposal), implement **commit-first**, validate with **fail-fast** (first 3 plastic runs vs baseline; abort+revert on clear regression), then a guardrail check on the true-side families before any broad 8-family validation.

## Validation / cost discipline
Commit-first before any live job. Baseline now = 3–5 jobs (modest, justified spend; canonical benchmark input, not invented). Defer the heavier 8-family validation until an actual fix is in hand. Fail-fast governs the post-fix runs.

## The net-new decision for the review
(1) **Go/no-go** on the plastic fix track now; (2) **is the HEAD baseline a hard prerequisite** before any prompt change; (3) **is the reasonable-reading carve-out achievable via prompt**, or is it the tiebreaker trap (and if so, the alternative); (4) **pivot rule** if the baseline shows HEAD already centers.

---

## REVIEW OUTCOME — consolidated 2026-05-31 (3 independent reviewers)
**Verdict: NO-GO on the carve-out + paid baseline; GO on the read-only population census (done).** Strong convergence:
- **Carve-out is REFUTED (R2):** a verdict-stage "assess the reasonable reading" instruction directly **contradicts** the co-located scope-of-truth rule (`:1468`/`:1679`) at the same stage → worse than the failed Stage-1 tiebreaker (which was at least internally consistent); two interpretive prompt-reverts already on record (`1c790a05`, `e7deeb8b`). And it is **mis-targeted**: the existing 3-dimension decomposition (98/108 reports) **already centers** (env~49/econ~50/eff~70 → ~52–60, arithmetic roll-up, AGENTS-compliant). `:275` is **load-bearing FOR** that centering (forces honest per-dimension eval; averaging centers) — softening it would *dismantle* the working mechanism AND risk the true-side families (`:275` shares the `:273` "Wording fidelity CRITICAL" parent with `:274`/`:276` that protect bolsonaro/bundesrat). ⇒ Do **not** soften `:275`.
- **Baseline is NOT a prerequisite (R1):** fail-fast judges post-fix runs against **static bands + guard inputs** (`AGENTS.md:309`), not a measured baseline. The 3–5 plastic runs are redundant (corpus already answers "does HEAD center" at higher n), **misleading** (bimodal/high-variance; a 3–5 draw is noise), and **violate** `Captain_Quality_Expectations.md:122` ("do not spend a new plastic job to confirm").
- **Wrong priority (R3):** plastic is one non-gating control-lane family; the **population floor** (`:96`) outranks it. Census-first.
- **Citation/currency corrections:** declare-the-reading is `Captain_Quality_Expectations.md:103` (not :101); the "3 post-canary commits don't touch the mechanisms" claim is soft (`0d97a7a6` +121 prompt lines + calc config; `54fe23c3` +20 prompt + verdict-stage.ts) — the May canary is an even weaker HEAD proxy.

**Plastic conclusion:** the centered band is essentially met by the existing decomposition; the residual literal tail is a **classification-stability / evidence-drift** problem (keep input on the 3-dim path), NOT a verdict re-interpretation — a separate structural lever, not urgent. Optional later: reading-declaration + ≤75 cap as a calibration guard, but with full-bar validation (cap over-triggers on `isDimensionDecomposition`) and labeled transparency-not-compliance.

**Census (executed, read-only, `scripts/diag/checkworthy-unverified-census.cjs`, n=1550 SUCCEEDED):** Q-HF1 hard-failure **8.6%** (report_damaged 107 / analysis_generation_failed 19 / llm_provider_error 7); top-level UNVERIFIED **14.8%**; **checkworthy-claim UNVERIFIED 24.2%** (930/3836; all verdicted claims are medium/high checkworthy); 30.5% of jobs have ≥1, 16.1% on otherwise-clean jobs. UNVERIFIED-claim reasons: none 319, report_damaged 272, insufficient_evidence 213, verdict_integrity_failure 76, analysis_generation_failed 50. bolsonaro-pt latest 5 = 6 boundaries (PASS).

**Recommended next:** pivot to the population defect — `report_damaged` (107 jobs, largest hard-failure; validated fix direction = surgical per-claim repair) + the 24.2% checkworthy-UNVERIFIED (research/evidence-gathering gap, per the n=3 fetch-failure signal) — not the plastic prompt change.
