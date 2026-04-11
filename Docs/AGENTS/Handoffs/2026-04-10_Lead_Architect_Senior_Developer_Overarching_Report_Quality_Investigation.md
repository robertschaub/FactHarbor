# 2026-04-10 | Lead Architect + Senior Developer | Codex (GPT-5) | Overarching Report Quality Investigation

## Task

Investigate report-quality concerns centered on local job `9dab007670434245a3b76fa405066989`, but broaden the analysis to recurring instability across several input families, compare local and deployed evidence where safely available, call supporting agents, and return root causes, improvement proposals, removal candidates, and an implementation plan.

## Evidence Base

- Local job `9dab007670434245a3b76fa405066989`
- Nearby Swiss-family jobs from local `factharbor.db`, including:
  - `05be66cac8a3423993b2897424577563`
  - `11a8f75cb79449b69f152635eb42663a`
  - `67a3d07df2d04ebaab7a0ec0f256bd1a`
  - `e392704377574efa9ced7f7a6d68a97f`
  - `5d46fb750ec044a6879d73e1d664104c`
  - `7e0683dcd4234213b30cff36d22868d1`
- Stored local/deployed cross-review snapshots under `test-output/cross-review/`
- Existing investigations and status docs:
  - `Docs/STATUS/Current_Status.md`
  - `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`
  - `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md`
  - `Docs/AGENTS/Handoffs/2026-04-09_LLM_Expert_Bolsonaro_Evidence_Mix_Regression_Investigation.md`
  - `Docs/WIP/2026-04-09_Deterministic_Analysis_Hotspots_Review.md`
- Supporting agent investigations:
  - Matrix/UI semantics specialist
  - Complexity / removal-candidate specialist

## Executive Summary

The user is right on all three broad concerns:

1. The current Swiss report is semantically wrong.
2. The matrix UI is semantically misleading.
3. Large same-input run-to-run variation is systemic across multiple families, not only Swiss.

The most important concrete failure in job `9dab...` is **not** that the system never noticed `rechtskräftig`. It did notice it. Stage 1 produced a pre-filter anchored claim, its own contract validator then concluded the final accepted claim set no longer preserved the original contract, and the pipeline still continued with the broken claim set. This is the clearest high-severity root cause in the current job.

The codebase-growth concern is also justified. Some complexity is justified by real integrity fixes, but there is now too much transitional baggage:

- dead config
- deprecated dominance artifacts
- stale prompt/runtime legacy surface
- multiple deterministic semantic hotspot layers that should have been retired, not extended

I would **not** throw away the whole recent implementation wave. Some of it materially improved integrity. But I would remove or redesign specific layers aggressively.

## Main Findings

### F1. Stage 1 can detect a broken claim contract and still ship the broken claim set

This is the most important finding.

For job `9dab007670434245a3b76fa405066989`:

- Input: `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
- Final article result: `TRUE 86 / 83`
- Final accepted claims:
  - AC_01: `Der Bundesrat hat den EU-Vertrag unterzeichnet, bevor das Parlament darüber entschieden hat.`
  - AC_02: `Der Bundesrat hat den EU-Vertrag unterzeichnet, bevor die Stimmbevölkerung darüber entschieden hat.`
- The defining modifier `rechtskräftig` is gone.

But Stage 1 did more than that:

- `understanding.preFilterAtomicClaims` still contained a third claim:
  - AC_03: `Die Unterzeichnung des EU-Vertrags durch den Bundesrat hat rechtskräftige Wirkung.`
- `contractValidationSummary` explicitly says:
  - `preservesContract: false`
  - `rePromptRequired: true`
  - summary: `Both claims omit 'rechtskräftig' ... No claim preserves it.`

So the system had enough internal evidence to know the final accepted claim set was wrong, yet it still let Stage 2-5 proceed on the stripped chronology-only claim set.

This is a structural acceptance bug around Stage-1 retry / Gate-1 selection / final contract-summary handling, not just an extraction-quality issue.

### F2. The current Swiss result is wrong because Option G never had a chance to help

In job `9dab...`:

- `adjudicationPath.path = baseline_same_direction`
- `directionConflict = false`

That is not because Option G malfunctioned. It is because the final accepted claims were already wrong:

- AC_01 and AC_02 are both same-direction chronology claims
- the anchor-bearing legal-status proposition is absent

So the article adjudicator never fires, and the pipeline aggregates the wrong proposition very confidently.

This is why job `05be66...` is the important nearby control:

- it preserved an anchor-bearing claim in the final accepted set
- it produced direct claim conflict
- `adjudicationPath.path = llm_adjudicated`
- article truth moved from baseline `54` to `32`

That proves the current Option G path can correct the Swiss family **when Stage 1 hands it a semantically valid claim set**.

### F3. The matrix red fields are mostly a UI semantics problem, not a proof bug

The screenshot is behaving as coded, but the semantics are confusing.

Live UI matrix behavior:

- Cell color = claim-boundary-local verdict
- Column header / bottom total = overall claim verdict
- Row header / row total = dominant-cell verdict, not a true boundary verdict
- Corner / grand total = article verdict

For job `9dab...`:

- AC_01 boundary findings are strongly false-leaning:
  - CB_01: `18 / 90`
  - CB_02: `10 / 75`
  - CB_03: `12 / 80`
- AC_02 boundary findings are strongly true:
  - CB_01: `98 / 95`
  - CB_03: `92 / 88`

So the red cells are consistent with the payload. The misleading part is the row semantics:

- the row header looks like “this boundary is false”
- in reality it is only borrowing the biggest cell’s verdict

That is why rows like `Bundesrat offiziell` can look false-ish even though the same row contains a large green cell.

There is also a UI/export inconsistency:

- live UI colors by verdict
- HTML export matrix still colors by count class

### F4. Same-input variance is systemic across several families

This is not only Swiss.

From local job history / cross-review snapshots:

- Swiss `rechtskräftig` family: spread up to `89pp` locally (`11 -> 100`)
- Plastik DE: spread `63pp`
- Plastik EN: spread `58pp`
- Hydrogen EN: spread `51pp`
- Bolsonaro EN classic input: spread `41pp`
- Flat Earth control: historical spread `50pp`, though later stabilized after classification fixes

This confirms the user’s clarification: large variation between runs affects several inputs, not just Swiss.

### F5. The “since f1a372bf” suspicion is understandable but not accurate as a root cause

`f1a372bf7d9e69cfe220953cbfc5e5aa8193d651` is a docs-only commit.

So:

- it did not directly cause analyzer quality decline
- it is not the right causal boundary

What is true:

- several important instability patterns predate it
- later change waves added both real integrity improvements and additional complexity / failure paths

### F6. Some quality really improved after late-March work; this is not a pure decline story

From existing investigations and local job history:

- citation carriage and verdict uniqueness improved
- all-insufficient / matrix honesty improved
- article adjudication on conflict-path jobs can help materially
- some older structural defects are genuinely fixed

So the correct picture is not “everything got worse.”

It is:

- some integrity layers improved
- some upstream quality problems remained
- some new transitional layers and policy scar tissue accumulated
- Swiss-family proposition anchoring is still unstable enough to dominate user perception

### F7. Complexity accretion is real and now worth active reduction

Confirmed immediate reduction candidates:

- dead `articleVerdictOverride` config
- deprecated dominance contract remnants
- stale prompt/README legacy surface around orchestrated/legacy prompt identities
- “DELETED/legacy” comment debris across analyzer modules

Higher-value but riskier simplification targets:

- Stage-1 deterministic anchor-preservation override
- Stage-4 deterministic verdict-direction rescue
- Stage-5 anchor multiplier heuristic

These are not just style debt. They are meaning-bearing deterministic layers living inside an LLM-first pipeline.

## What Predates `f1a372bf` vs What Plausibly Worsened Later

### Clearly predates `f1a372bf`

- Bolsonaro exact-input variance already existed on March 1
- broad same-input instability in several families
- Stage-2/3 evidence-mix and boundary-shape variance
- cross-linguistic neutrality gap
- SRG/SRF classification instability

### Plausibly worsened or became more visible later

- Swiss-family Stage-1 anchoring / contract-selection instability during Apr 7-10 proposition-anchoring work
- UI confusion after matrix verdict colorization work
- Prompt scar tissue and policy layering after repeated narrow fixes
- Option G / article-adjudication design adding another conceptual layer, even where it is not the current Swiss root cause

### What did not materially cause the current Swiss wrongness

- `f1a372bf` itself
- Option G conflict-path math/guards in job `9dab...`

`9dab...` never even entered the conflict path. The wrongness happened earlier.

## Root-Cause Model

### RC1. Stage-1 final-claim acceptance is not contract-safe

Current Stage-1 behavior can end in this state:

- pre-filter claims include the anchor-bearing proposition
- Gate 1 removes it
- refreshed contract summary says the final accepted set no longer preserves the input
- pipeline still proceeds

This is the most important root cause for job `9dab...`.

### RC2. Stage-1 claim extraction around truth-condition modifiers is still unstable

Swiss-family runs show several failure modes:

- anchor omitted entirely
- anchor preserved in one combined claim
- anchor split into a separate legal-effect claim
- anchor judged as injected legal/normative drift

This is not stable enough for production on truth-condition-bearing inputs.

### RC3. Stage-2 evidence-mix drift remains a major cross-family variance source

Already well documented in Bolsonaro and cross-language Plastik:

- retrieval drift
- evidence admission drift
- clustering amplification

This is the main reason the broad same-input variance is not solved by Stage-1 fixes alone.

### RC4. UI/report semantics overstate certainty or disagreement in confusing ways

Coverage Matrix currently compresses different semantics into one verdict legend. That makes already-complex analyses harder to interpret and can create false alarms for users.

### RC5. Transitional analyzer baggage is increasing cognitive and debugging cost

The codebase is not irrecoverable, but it is carrying too many overlapping policy layers, legacy surfaces, and partially retired concepts.

## Debate / Team Convergence

### Matrix specialist

Conclusion:

- red rows/cells in `9dab...` are expected from payload
- row semantics are misleading because row headers/totals are dominant-cell colors, not true boundary verdicts

### Complexity specialist

Conclusion:

- user concern about code growth is justified
- dead config and deprecated dominance artifacts should be removed
- deterministic semantic hotspots should be replaced then removed, not tuned further

### Main investigation convergence

Conclusion:

- the most important bug is the Stage-1 contract-acceptance gap
- the biggest broad problem is systemic same-input variance across Stage 1-4
- the UI matrix issue is secondary but user-visible
- `f1a372bf` is not the causal boundary; the real issue is ongoing accretion plus unresolved upstream instability

## Improvement Proposals

### P0. Block broken final claim sets from proceeding as normal

If the final accepted Stage-1 claim set fails refreshed contract validation, do not continue as a normal high-confidence analysis.

Recommended behavior:

- no normal success path when final `contractValidationSummary.preservesContract = false`
- route to explicit retry/fallback/damaged-report handling
- at minimum, prevent high-confidence article verdict publication on a known-broken claim set

This is structural routing on typed LLM output, not deterministic semantic text analysis.

### P1. Redesign Stage 1 around anchored direct-claim acceptance, not just retry guidance

Current pipeline spends effort detecting anchor problems, but not enough effort enforcing acceptance criteria on the final claim set.

Recommendation:

- require at least one final accepted direct claim that preserves the truth-condition anchor when such an anchor exists
- if Gate 1 removes the only anchor-preserving claim, the extraction is not complete
- do not let Gate 1 silently convert an anchored proposition into a chronology-only proposition

### P2. Fix Coverage Matrix semantics

Recommended order:

1. stop coloring row headers/totals by dominant cell unless a real boundary verdict exists
2. keep cell verdict colors
3. label semantics clearly in legend/tooltips
4. later, persist true boundary-level verdicts if that concept is needed

### P3. Re-open a broad variance workstream above family-specific patching

Current evidence says run-to-run instability is broader than any one family.

Run a bounded repeat-measurement program on a fixed set:

- Swiss anchor family
- Plastik DE / EN / FR
- Hydrogen
- Bolsonaro
- SRG/SRF
- flat/round-earth controls

Track separately:

- Stage-1 decomposition class and contract status
- evidence-mix composition
- boundary concentration
- claim-level verdict spread
- article adjudication path

### P4. Start a removal-first cleanup track

Immediate removals:

- dead `articleVerdictOverride`
- deprecated dominance artifacts after compatibility window
- stale prompt docs / misleading prompt profile legacy references

Next removals after replacement:

- deterministic Stage-1 anchor override
- deterministic Stage-4 direction rescue
- deterministic Stage-5 anchor multiplier

### P5. Stop treating every new quality problem with additive prompt text

The current pattern is too often:

- observe family-specific failure
- add another prompt rule
- keep old rules and old layers

Future changes should require one of:

- remove an obsolete rule/layer while adding the new one
- or explicitly justify why the old layer cannot yet be removed

## Implementation Plan

### Phase 1 — High-severity containment

1. Fix Stage-1 contract-acceptance policy:
   - final accepted claims must pass refreshed contract validation for anchored inputs
   - if not, do not publish a normal report
2. Add regression tests covering:
   - `9dab`-style anchor loss after Gate 1
   - `05be`-style preserved anchor with adjudication
   - final contract-summary mismatch must not pass silently

### Phase 2 — UI/report clarity

1. Neutralize row-header / row-total verdict colors unless a true boundary verdict exists
2. Clarify legend/tooltips
3. Align export semantics with live UI, or explicitly rename export matrix as count-based

### Phase 3 — Removal-first simplification

1. Delete dead `articleVerdictOverride`
2. Remove deprecated dominance contract remnants after migration boundary is settled
3. Clean stale prompt/runtime legacy surface

### Phase 4 — Semantic hotspot replacement

1. Replace Stage-1 deterministic anchor checks with LLM-led acceptance/routing only
2. Replace Stage-4 deterministic direction rescue with LLM-led resolution or stricter structural-only guarding
3. Remove Stage-5 anchor multiplier once anchored claim handling is reliable upstream

### Phase 5 — Broad variance program

1. Same-input repeated-run harness on the core family set
2. Local + stored deployed comparison using the same summary dimensions
3. Promotion gates based on spread + contract-preservation, not only final truth%

## Recommended Priority Order

1. Stage-1 contract-acceptance fix
2. Coverage Matrix semantic fix
3. Dead/transitional code removal
4. Broad variance measurement
5. Deterministic hotspot replacement

## Bottom Line

I would **not** throw away the entire recent implementation.

I would throw away:

- dead config
- deprecated dominance residue
- misleading matrix row semantics
- and, after replacement, the remaining deterministic semantic hotspots

The single most important correction is this:

> A final accepted claim set that the system itself says does not preserve the original claim contract must not be allowed to drive a normal article verdict.

That is the clearest explanation for why job `9dab...` looks wrong even though many internal components are “working.”

## Files Touched

- `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Overarching_Report_Quality_Investigation.md`

## Key Decisions

- Treated `f1a372bf` as a non-causal date marker because it is docs-only.
- Elevated the Stage-1 contract-acceptance gap above matrix/UI concerns as the main root cause for `9dab...`.
- Framed the matrix issue as a UI semantic mismatch, not a verdict-calculation bug.
- Accepted the user's complexity concern as valid and identified concrete removal candidates.

## Open Items

- A Captain decision is still useful on the exact product behavior for final contract failure:
  - hard fail / damaged report
  - mandatory retry path
  - or forced low-confidence unresolved output
- Deployed live system was not queried directly; deployed comparisons used stored cross-review snapshots and prior investigations.

## Warnings

- Fixing only Swiss-family anchoring will not solve the broad same-input variance problem.
- Re-adding more prompt text without removal will likely worsen the maintainability problem the user is already feeling.

## For Next Agent

Start with:

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx`
- `Docs/WIP/2026-04-09_Deterministic_Analysis_Hotspots_Review.md`

If implementing, Phase 1 should be the Stage-1 contract-acceptance fix, not another Stage-5 weighting change.

## Learnings

No
