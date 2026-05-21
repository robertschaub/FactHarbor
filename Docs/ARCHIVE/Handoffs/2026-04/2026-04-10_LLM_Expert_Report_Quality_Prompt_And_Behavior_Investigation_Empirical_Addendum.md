---
### 2026-04-10 | LLM Expert | GitHub Copilot (GPT-5.4) | Report Quality Prompt And Behavior Investigation Empirical Addendum
**Task:** Integrate new direct same-input evidence from four local runs of `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`, correct earlier LLM-expert conclusions where needed, and update the fix hierarchy.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Revised the earlier LLM-expert hierarchy based on direct multi-run evidence. The primary mechanism is now clearer: Pass 2 produces three distinct Stage-1 shapes for the same input, and only the fused-claim shape yields the correct verdict. With this evidence, the proposed Gate-1 anchor exemption is withdrawn. The smallest justified fix set is now 3 prompt edits plus 1 control-flow change.
**Open items:** Captain decision still needed on the contract-failure outcome after retry: bounded retry then degrade, direct degrade, or hard fail. Recommended: bounded retry then degrade.
**Warnings:** Do not implement the earlier Gate-1 anchor exemption proposal from the first LLM handoff. The new data shows Gate 1 is correctly rejecting reified side claims; the real fix is to stop Pass 2 from generating them. Do not over-expand the prompt again. The evidence supports a smaller fix, not a larger one.
**For next agent:** Read this addendum together with `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation.md`. Where they conflict, prefer this addendum on the ranking of F1/F2/F3 and on the withdrawal of the Gate-1 anchor-exemption idea.
**Learnings:** No

## Direct Evidence

Four local jobs analyzed the identical input:

`Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`

Observed outcomes:

| Job | Verdict | inputClassification | #Events | Pre-filter claims | Anchor handling | preservesContract |
|---|---|---|---:|---|---|---|
| `9dab...` | `TRUE 86` | `single_atomic_claim` | 4 | 3 (`chrono + chrono + side`) | `AC_03` reified, then killed by Gate 1 fidelity | `false`, shipped anyway |
| `05be66ca...` | `LEANING-FALSE 32` | `single_atomic_claim` | 3 | 3 (`fused + chrono + chrono`) | `AC_01` fused: `rechtskräftig unterzeichnet, bevor...` | `true` |
| `11a8f75c...` | `LEANING-TRUE 65` | `ambiguous_single_claim` | 6 | 3 (`chrono + chrono + side`) | `AC_03` reified as `rechtskräftig und bindend`, then killed by Gate 1 | `false`, shipped anyway |
| `e3927043...` | `TRUE 93` | `single_atomic_claim` | 3 | 2 (`chrono + chrono`) | modifier never attempted | `false`, shipped anyway |

This is a bimodal or tri-modal Stage-1 problem, not simple noise:

- fused modifier in the primary claim leads to the correct result, around `32`
- reified side-claim then stripped leads to wrong results, around `65` to `86`
- modifier never attempted leads to the worst result, around `93`

Three of the four runs shipped with `preservesContract: false`.

## What Changes From The Earlier LLM Handoff

### Confirmed and strengthened

1. Stage-1 enforcement is still the highest-leverage structural fix.

Three of four runs shipped after the contract validator already knew the final accepted claims were broken. This makes the control-flow defect empirically airtight.

2. Split-versus-fuse is the dominant variance mechanism for this proposition.

The fused run is the only correct run. That makes fusion frequency, not downstream verdict behavior, the critical Stage-1 quality lever for this case.

### Corrected

1. Gate-1 anchor blindness is no longer a top-tier explanation.

In `9dab` and `11a8f75c`, Gate 1 rejected `AC_03` because the model had already reified the adverb into a new proposition such as `die Unterzeichnung hat rechtskräftige Wirkung`. That is a different claim from the input. Gate 1 is correctly rejecting the wrong shape.

The earlier proposal to give Gate 1 an anchor exemption is therefore withdrawn.

2. The earlier framing of a hard contradiction between modifier-preservation and anti-normative rules was overstated.

The four-run evidence shows there is a third valid option that satisfies both rules: fuse the modifier directly into the main proposition. The problem is not that the prompt makes fusion impossible. The problem is that the prompt does not make fusion the dominant mode.

3. Scope-of-truth issues in Stage 4 are demoted.

They remain real, but in this case they are latent. In three of four runs, the modifier never survives into the decisive claim set, so verdict-stage truth-scope logic is not the primary current cause.

## New Findings From The Four-Run Evidence

### N1. `inputClassification` is unstable for the same short input

Across four runs, the same 12-word input produced:

- `single_atomic_claim` three times
- `ambiguous_single_claim` once

That is a separate Stage-1 instability source.

### N2. `distinctEvents` is contaminated by preliminary evidence

Observed event counts varied from `3` to `6` for the same input, and the event content included dates and proceedings not present in the input itself. This implies Stage 1 is importing preliminary-evidence material into `distinctEvents`, despite the input-only contract.

That contamination likely amplifies decomposition drift by pushing the system toward multi-event fragmentation.

### N3. The contract-validator retry path is real but ineffective

The broken runs did not fail because retry was absent. They failed because the retry guidance repeated the same weak formulation: preserve the anchor in at least one direct claim. That guidance is too weak to force fusion and too permissive about side-claim reification.

### N4. This is a frequency problem, not a capability problem

`05be66ca` proves the current system can produce the correct fused shape and the correct verdict. The problem is not inability. The problem is low fusion frequency.

## Revised Root-Cause Hierarchy

1. Pass 2 produces the fused modifier shape too rarely.

This is now the primary Stage-1 stochastic source for this proposition.

2. Contract-validator retry guidance does not recover fusion.

Retry exists, but the wording is too weak and replays the same failure mode.

3. Stage 1 still ships broken outputs when `preservesContract === false`.

This remains the highest-leverage structural fix.

4. `distinctEvents` is contaminated by preliminary evidence, which fragments the proposition.

5. `inputClassification` instability sends the same input down different decomposition paths.

Notably lowered versus the prior LLM handoff:

- Gate-1 anchor blindness
- verdict-stage scope-of-truth concerns for this particular failure

## Revised Fix List

### Must-have, in order

1. Non-prompt P0: in `claim-extraction-stage.ts`, do not ship a normal successful report when `preservesContract === false` after retry.

This one change would have prevented three of the four broken runs from shipping as successes.

2. Prompt, surgical: rewrite the Pass-2 modifier rule for fusion-first behavior.

Replace the loose `preserve in at least one direct atomic claim` wording with a direct rule that when the input combines chronology or state with a finality, binding, or effect modifier, the primary direct claim must contain both inside one proposition, and the modifier must not be externalized into a separate claim about effect or bindingness.

3. Prompt, surgical: strengthen the contract-validator retry guidance.

When the failure is anchor omission, the retry must say: insert the missing modifier inside an existing claim as an adverb or adjective; do not add a new claim about the modifier.

4. Prompt, fidelity: tighten the `distinctEvents` input-only rule.

Add one sharp sentence: `distinctEvents must be derivable from the input text alone. Do not add events, dates, or proceedings that appear only in preliminary evidence.`

### Lower priority now

1. Withdraw the earlier Gate-1 anchor-exemption proposal.

2. Keep verdict scope-of-truth tightening, but lower it behind the Stage-1 fixes.

3. Treat `inputClassification` stability as a separate follow-on issue rather than a blocker for the modifier fix.

## What We Are Now Confident About

1. The fix is smaller than the earlier LLM handoff suggested.

The evidence supports 3 prompt edits plus 1 control-flow change, not a long prompt-program.

2. Stage 4 already produces the correct answer when Stage 1 preserves the modifier.

`05be66ca` returned `LEANING-FALSE 32`, which matches the substantive proposition much better than the broken runs.

3. Gate 1 is not the thing to bypass.

It is correctly rejecting reified side claims. The repair target is upstream claim shape.

4. Additional runs are not needed for diagnosis.

The four payloads already separate the modes cleanly. More runs are useful only for post-fix A/B validation.

## Recommended Validation After The Fix

After implementation, run about 10 repeated jobs for this exact input and check:

- fusion rate rises from about `25%` to at least `90%`
- `preservesContract` is almost always `true`
- verdict spread collapses into a narrow band around the fused-run result instead of splitting across `32 / 65 / 86 / 93`

## Bottom Line

The direct data sharpens the picture.

The current failure is not best described as Gate 1 lacking anchor context. Gate 1 is mostly doing the right thing against the wrong claim shape. The decisive problems are:

- Pass 2 does not reliably fuse `rechtskräftig` into the main proposition
- retry guidance does not force that fusion on the second attempt
- Stage 1 still ships the broken set when retry fails

That reduces the justified fix set to one control-flow change plus three small prompt edits.
