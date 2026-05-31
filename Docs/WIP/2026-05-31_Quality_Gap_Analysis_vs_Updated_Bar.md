# Quality-Gap Analysis vs the Updated Bar (2026-05-31) — what needs fixing + root cause

**Author:** Lead Architect (Claude Code, Opus 4.8 1M) · **Date:** 2026-05-31 · **Scope:** re-analyze all 8 benchmark families against the **updated** `Captain_Quality_Expectations.md` / `benchmark-expectations.json` (recalibrated 2026-05-31, main @ `6be9fbf5`). **Analysis only — no fixes proposed/implemented, no live jobs.**

## Method (provenance-disciplined)
Root-caused from **current HEAD source**, not from stored reports. Reason: the stored corpus spans multiple prompt versions (the plastic proposal shows a literal-ward drift March→May), so report-derived "causes" are *symptoms at mixed commits*, not properties of HEAD. Confirmed via `git log -- apps/web/src/lib/analyzer apps/web/prompts`: the only analyzer/prompt commits after the canary era are this session's own (`ed7698a8` fix + `1c790a05` revert) — so current prompt/code ≈ canary-era for the evaluative/confidence mechanisms. Comparators are the per-family canaries in the JSON (current-stack), labeled as such.

## Gap scan — only ONE family currently fails the new bar
| Family | New band | Current canary (provenance) | Verdict |
|---|---|---|---|
| bundesrat-rechtskraftig | MIXED/LT/LF 35-60 | `f8e72c84` LF 32/80 (current, accepted) | in-band (edge, within 8pt tol) |
| bundesrat-simple | TRUE/MOSTLY-TRUE 85-100 | `1de78d0a` TRUE 97/93 (current) | in-band; **operational** timing/`budget_exceeded` watch (not a quality gap) |
| asylum-235000-de | LT/MT 58-75 | `bb2133a1` MT 78/68 (current, accepted) | in-band (edge); latent stability risk (component-stitching) |
| asylum-wwii-de | MF/LF 18-42 | `ce265797` LF 30/63 (current) | in-band (first-band watch) |
| bolsonaro-en | LT/MT 58-85, conf 45-75 | `aedb3a05` LT 64/43 (current, **Captain-accepted OK**) | conf 43 just below band → **accepted watch-debt, NOT a current defect** |
| bolsonaro-pt | LT/MT 58-85, ≥3 boundaries | `da3580fe` LT 58.2/61 (current) | in-band; clause-drop is a `knownOpenIssue` **guardrail (latent risk), not a current failure** |
| hydrogen-en | FALSE/MF 5-25 | `1f838f8b` FALSE 8/78 (current) | SOLVED, `[]` open issues |
| **plastic-en** | **centered** LF/MIXED/LT 42-65 (target 50-60), conf ≤75, declare reading | latest `939563ec` LF 37/62 (May-era) | **CURRENT DEFECT vs the new bar (see root cause)** |

⇒ The updated bar exposes **one** current, generic pipeline defect, exemplified by `plastic-en`. The other families have in-band current canaries or are Captain-accepted-watch / latent-risk — not "needs fixing" (demoting the two bolsonaro items per the re-grounded bar).

## Root cause (proven from HEAD) — the new evaluative-input principle has NO implementing mechanism
The 2026-05-31 update added a **generic** requirement (Captain_Quality_Expectations.md:101; benchmark-expectations.json plastic `verdictNarrativeRule`): for interpretation-laden/evaluative predicates, **assess the reasonable reading, keep the verdict centered, cap confidence ≤75, and declare which reading.** The current pipeline implements **none** of it:

1. **No reasonable-reading selection.** `grep` across `claimboundary.prompt.md` for any reasonable/literal/charitable/steelman/"which reading" instruction = **0 hits.** The extraction predicate-preservation rules (prompt:271-272) only say "preserve the ORIGINAL EVALUATIVE MEANING, vary the dimension qualifier" — **neutral** on literal-vs-reasonable. So at verdict time the LLM reads the predicate however it infers — and the multi-version corpus shows it drifted to the *literal* reading ("recycling accomplishes nothing" → trivially FALSE). *Locus:* verdict-generation prompt (advocate/challenger/reconciler) + the dimension-claim framing. *Status:* absent.
2. **No reading declaration.** Nothing requires the verdict narrative to state which reading it assessed. *Status:* absent.
3. **No interpretation-laden confidence cap.** The only confidence-capping hooks are the generic optional `adjustedConfidence` ceiling (prompt:2034-2050: "may cap downward when unresolved claims add uncertainty") and `INSUFFICIENT_CONFIDENCE_MAX` (verdict-stage.ts:2250, safe-downgrade only). **Neither is triggered by interpretation-ladenness/evaluative ambiguity** → the pipeline can publish over-confident verdicts on genuinely ambiguous claims (the calibration defect the new bar targets). `adjustedConfidence` is the natural hook, currently untriggered for this case. *Status:* hook exists, trigger absent.

**This is generic, not plastic-specific.** It applies to any evaluative/interpretation-laden input ("pointless", "useless", "worth it", "works"). plastic-en is simply the family whose band moved to require it.

## Related calibration facet (same theme, but NOT a current must-fix)
`bolsonaro-en` AC_02/AC_03 confidence (32/30) is suppressed because impartiality/appellate caveats are treated as **confidence limiters despite one-sided direct support** (JSON knownOpenIssue) — the *under-confidence* direction of the same calibration gap (the new bar: true-side caveats belong in confidence/reasoning but must not push a true-side family below band). The Captain **accepted** the current canary as OK/watch-debt, so this is monitored, not a current defect. Noted because a principled calibration mechanism would address both directions (over-confidence on evaluative ambiguity *and* caveat-driven under-confidence).

## What this implies for a future fix (NOT proposed here)
A single **generic** mechanism in the verdict-generation prompt + the `adjustedConfidence` path: (a) instruct assessing the reasonable reading of an evaluative predicate, (b) require the narrative to declare the reading, (c) trigger the `adjustedConfidence` ≤75 ceiling when the claim is interpretation-laden. Topic-neutral (no plastic hack), LLM-driven (no deterministic semantic adjudication). **Would require LLM Expert review + Captain approval + commit-first validation against the FULL 8-family bar (esp. that it does not over-trigger and pull a decisive factual claim like hydrogen off its decisive verdict).** That is the next step IF commissioned — out of scope for this analysis.

## Caveats / discipline
- Root cause is the HEAD **mechanism absence** (provable); the 108-report literal-drift is *corroborating symptom* at mixed commits, not the locus.
- Comparators used are current-stack per-family canaries (labeled); the stale corpus is treated as symptom evidence only.
- No fixes, no prompt/config edits, no live jobs in this analysis.
