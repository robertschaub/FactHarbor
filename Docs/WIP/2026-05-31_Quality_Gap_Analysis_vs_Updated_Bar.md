# Quality-Gap Analysis vs the Updated Bar (2026-05-31) — what needs fixing + root cause

**Author:** Lead Architect (Claude Code, Opus 4.8 1M) · **Date:** 2026-05-31 · **Scope:** re-analyze all 8 benchmark families against the **updated** `Captain_Quality_Expectations.md` / `benchmark-expectations.json` (recalibrated 2026-05-31, main @ `6be9fbf5`). **Analysis only — no fixes proposed/implemented, no live jobs.**

> **Status: v2 — consolidated after 3 independent reviews (mechanism / family-triage / adversarial).** The reviews verified the core finding ("only `plastic-en` is exposed by the new bar"; the reasonable-reading/declaration/cap principle is unimplemented) but corrected four things, all re-verified by me against primary source: (1) the root cause is an **active literal-reading lock + absence**, not pure absence; (2) `adjustedConfidence` is the **wrong hook** (5pp-floored, cannot reach ≤75); (3) `plastic-en` is a **requirement/mechanism gap, not a band miss** (its numbers are in-tolerance), and the only facet failing **on HEAD** is the missing reading-declaration; (4) provenance and `bolsonaro-en` framings were overstated. Corrected below.

## Method (provenance-disciplined)
Root-caused from **current HEAD source**, not from stored reports (the corpus spans mixed prompt versions, so report-derived "causes" are symptoms at mixed commits). **Currency (corrected):** `git diff ed7698a8~1..1c790a05 -- claimboundary.prompt.md` is empty (this session's Stage-1 fix+revert nets to zero). Three other commits — `0d97a7a6`, `54fe23c3` (2026-05-29), `8e87c3e9` (2026-05-30) — *do* postdate the May plastic canary and touch `apps/web/src/lib/analyzer`/prompts, but **none touch the evaluative-reading / scope-of-truth / confidence mechanisms** named below. So current source ≈ canary-era **for these mechanisms specifically** (softened from the v1 claim that there were no post-canary commits at all). Comparators are the per-family `latestObserved` canaries (current-stack), labeled.

## Gap scan — only ONE family is exposed by the new bar (and it's a requirement gap, not a band miss)
Mechanical rule: observed must fall within `band ± noiseTolerancePct(8)` on both edges (`report-quality-expectations.json` Q-BE2 truth / Q-BE3 conf).

| Family | New band | Current canary | Truth±8 / Conf±8 | Verdict |
|---|---|---|---|---|
| bundesrat-rechtskraftig | 35-60 | `f8e72c84` LF 32/80 | [27,68]∋32 · [47,93]∋80 | in-band |
| bundesrat-simple | 85-100 | `1de78d0a` TRUE 97/93 | ✓ · ✓ | in-band; **operational** timing/`budget_exceeded` watch (not quality) |
| asylum-235000-de | 58-75 | `bb2133a1` MT 78/68 | [50,83]∋78 · ✓ | in-band (truth edge); latent stitching-stability risk |
| asylum-wwii-de | 18-42 | `ce265797` LF 30/63 | ✓ · ✓ | in-band |
| bolsonaro-en | 58-85, conf 45-75 | `aedb3a05` LT 64/43 | ✓ · **[37,83]∋43** | **in-band** (conf 43 ≥ floor 37; Captain-accepted) — NOT a defect |
| bolsonaro-pt | 58-85, ≥3 boundaries | `da3580fe` LT 58.2/61 | ✓ · ✓ | in-band on truth/conf; **boundary-count UNVERIFIABLE** (not in observed; DB hook-blocked) → latent, *conditional* on JSON `CONFIRMED-ON-CURRENT-HEAD` |
| hydrogen-en | 5-25 | `1f838f8b` FALSE 8/78 | ✓ · ✓ | SOLVED, `[]` |
| **plastic-en** | **centered** 42-65 (target 50-60), conf ≤75, **declare reading** | `939563ec` LF 37/62 | **[34,73]∋37 · 62≤75** | **in-tolerance on the numbers**; **fails the new *qualitative* requirement** (no reading-declaration) — see root cause |

⇒ "Only `plastic-en` is exposed" **holds** — but the exposure is the **unimplemented qualitative requirement** (declare-the-reading + the centered/calibration discipline), **not** an out-of-band number. On HEAD the canary's truth (37) is inside ±8 tolerance and its confidence (62) is already ≤75. Every other family's canary is in-band on both axes; `bolsonaro-en` is **in-band** (not "just below"), and its AC-level under-confidence is a Captain-accepted watch item.

## Root cause (corrected: active literal-lock + absence — re-verified against HEAD)
The 2026-05-31 update added a **generic** requirement (Captain_Quality_Expectations.md:101; plastic `verdictNarrativeRule`): for interpretation-laden/evaluative predicates, **assess the reasonable reading · keep the verdict centered · cap confidence ≤75 · declare which reading.** Two things in HEAD jointly defeat it:

**A. An ACTIVE literal-reading lock (commission).** Not an omission — a present instruction pointing the wrong way for evaluative predicates:
- `claimboundary.prompt.md:275` **predicate-strength preservation** — forbids softening a categorical evaluative predicate; verbatim-prohibits *"brings nothing" → "is ineffective"* and *"is useless" → "has limited utility"*, with the explicit rationale that softening *"systematically biases the verdict stage toward higher truth scores."* So each dimension claim is locked to the categorical strawman ("brings nothing in terms of [dimension]"). *(271-272 preserve the predicate's meaning; 275 preserves its **intensity** — that is the operative, non-neutral rule. v1 mis-cited 271-272 as "neutral.")*
- `claimboundary.prompt.md:1468` (advocate) & `:1679` (reconciler) **scope-of-truth rule** — "Assess truth ONLY against the proposition the AtomicClaim actually states… any implication beyond that belongs in `misleadingness`/`reasoning`, NOT `truthPercentage`." So the verdict scores the literal "brings nothing" → trivially FALSE at high confidence.
- Chain: extraction hardens the predicate → verdict scores it literally → over-FALSE/over-confident on the literal tail. This *is* the corpus symptom (`9fcef050` FALSE 9/78). **A fix cannot simply add "assess the reasonable reading"** — that directly contradicts 275 + 1468/1679 and would be the same prompt-tiebreaker pattern that just failed live (`ed7698a8`→`1c790a05`). A coherent fix must **carve out evaluative predicates within 275/1468/1679**, not stack a contradicting instruction.

**B. Absence of the countervailing principle:**
1. **No reasonable-reading selection** — grep for reasonable/literal/which-reading/steelman/charitable across the prompt = **0 hits**; none of ADVOCATE (1452), CHALLENGER (1560), RECONCILIATION (1644) instructs which reading of an evaluative predicate to assess.
2. **No reading declaration** — the VERDICT_NARRATIVE output schema (prompt:2036-2050) requires headline/summary/keyFinding/limitations/adjustedConfidence; **nothing requires stating which reading was assessed.** *(This is the one facet that genuinely fails on the HEAD canary.)*
3. **No interpretation-laden confidence cap — and the obvious hook is mechanically inadequate.** `adjustedConfidence` is **floored at 5pp**: `aggregation-stage.ts:437-446` takes `max(finalConfidence − narrativeConfidenceMaxDownwardDelta, adjConf)` with the delta defaulting to **5** (`config-schemas.ts:1928`); baseline 88 + `adjustedConfidence:50` → **83**, never ≤75. *(The prompt at :2050 advertises a plain `min()` — a doc-vs-code defect.)* The viable site is **per-claim verdict `confidence`** (prompt:1469, un-floored through aggregation) or a **dedicated knob**, applied as **deterministic policy on an LLM-emitted evaluative flag** (`isDimensionDecomposition` / category) — which dodges the stochastic-judgment trap *and* honors "no deterministic semantic adjudication" (a ceiling on a value is not a semantic decision).

## Right-sizing the defect (what bites on HEAD vs latent)
- **On HEAD (canary `939563ec` LF 37/62):** only the **missing reading-declaration** genuinely fails. Truth 37 is in ±8 tolerance; conf 62 is already ≤75 (the cap is a no-op here).
- **Latent / residual:** the over-confidence + literal-collapse pattern (FALSE 9/78, MOSTLY-TRUE 85/88) is **run-to-run direction variance**, evidenced by the mixed-version corpus (explicitly *symptom*, not HEAD locus). The central tendency is in-tolerance; the residual risk is the occasional literal-FALSE collapse, which is a **direction-variance** problem — and per the failed Stage-1 precedent, prompt instructions don't reliably tame stochastic direction (that needs temperature/structural levers, not a stack-on).

## Related calibration facet (distinct, NOT a current must-fix)
`bolsonaro-en` AC_02/AC_03 confidence (32/30) is *suppressed* because impartiality/appellate caveats are treated as confidence limiters despite one-sided support (JSON knownOpenIssue) — the **under-confidence** direction. It is genuinely **distinct** from plastic over-confidence (different mechanism), the family canary is **in-band**, and the Captain accepted it as watch-debt. Monitored, not a defect. (Checked line-100 "don't downgrade true-side to MIXED": read VERDICT_DIRECTION_VALIDATION/REPAIR 1846-1970 + ARTICLE_ADJUDICATION 2054 — **no** evidence-independent mechanism wrongly forces true-side→MIXED; none to fix.)

## What this implies for a future fix — SPLIT by brittleness (NOT proposed here; needs Captain go-ahead)
Three fixes of three difficulties; do **not** bundle them as "one mechanism" or validate them as equal-risk:
1. **Reading-declaration** (narrative-stage prose addition) — low-risk, not the tiebreaker trap, **the only HEAD failure.** Cheap and safe.
2. **Interpretation-laden confidence cap (≤75)** — as **deterministic policy on an existing LLM-emitted evaluative flag** (not `adjustedConfidence`; use per-claim confidence or a dedicated knob). Dodges the trap; AGENTS-compliant. Moot on the current canary (62≤75) but tames the residual.
3. **Reading-selection to move the truth number** — this is the **genuine tiebreaker trap** *and largely unnecessary* (central tendency already in-tolerance; the real residual is direction variance, which a prompt instruction won't reliably fix). If pursued at all, it means **amending 275/1468/1679 for evaluative predicates** + a temperature/structural lever, validated against the **full 8-family bar** (esp. not pulling decisive factual claims like `hydrogen` off their correct decisive verdict) — and gated on LLM-Expert review + Captain approval + commit-first.

## Caveats / discipline
- Root cause = HEAD **active literal-lock (275 + 1468/1679) + absence of the countervailing principle**; the 108-report corpus is *corroborating symptom* at mixed commits.
- Comparators are current-stack canaries; bolsonaro-pt boundary-count could not be independently verified (DB safety hook) — its "latent" status is conditional on the JSON.
- No fixes, no prompt/config edits, no live jobs in this analysis.
