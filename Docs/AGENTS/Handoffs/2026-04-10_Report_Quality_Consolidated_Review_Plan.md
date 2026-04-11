---
### 2026-04-10 | Lead Architect + Senior Developer + LLM Expert | GitHub Copilot (GPT-5.4) | Report Quality Consolidated Review Plan
**Task:** Consolidate the April 10 report-quality investigations into one updated, review-ready plan that reflects the latest empirical evidence, preserves the broad systemic framing, and removes superseded recommendations.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Use the empirical LLM-expert addendum as the latest source of truth where it conflicts with earlier April 10 analyses. Keep the broader multi-family/systemic framing from the architect/developer investigations. Withdraw the earlier Gate-1 anchor-exemption recommendation. Prioritize one control-flow change plus three small prompt edits as the minimal fix set for the `rechtskräftig` failure, while retaining separate follow-on tracks for matrix honesty, systemic variance, and code/prompt reduction.
**Open items:** Review decision needed on post-retry contract failure behavior: bounded retry then degrade, direct degrade, or hard fail. Recommended: bounded retry then degrade. Deployed report UI remains unverified because the public host checked during investigation resolved to docs rather than the live app.
**Warnings:** Do not treat this as only a one-case fix. The `rechtskräftig` proposition now has a smaller and clearer fix set, but same-input variance across other families remains systemic. Do not implement the earlier Gate-1 anchor-exemption idea. Do not expand Pass 2 further without deleting overlapping rules.
**For next agent:** Start here for review and implementation sequencing. Use this document as the review-ready plan. Use the referenced handoffs only for supporting detail or raw evidence.
**Learnings:** No

# Purpose

This document consolidates the April 10 investigations into a single plan that is ready for human review.

It is intended to replace scattered decision-making across multiple same-day handoffs by doing three things:

1. Preserve the broad, general report-quality framing the user asked for.
2. Fold in the latest direct empirical evidence from the four same-input runs.
3. Remove or explicitly downgrade recommendations that are no longer supported.

# Source Priority

Use these sources in this order when they disagree:

1. `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md`
2. `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md`
3. `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Overarching_Report_Quality_Investigation.md`
4. `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation.md`

Superseded conclusion:

- The earlier Gate-1 anchor-exemption proposal is withdrawn.

# Executive Summary

The broad user concerns are confirmed:

1. The current `rechtskräftig` report failure is real and severe.
2. The matrix UI is semantically misleading.
3. Large same-input variance is systemic across several families.
4. The codebase and prompt layer have accumulated enough overlap and transitional residue to justify an active reduction track.

The latest same-input evidence sharpens the diagnosis.

For the proposition `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`, four local runs separate into three Stage-1 outcome modes:

- fused modifier inside the primary claim, which yields the correct low-truth result
- reified side-claim, which Gate 1 correctly rejects, after which the broken set still ships
- modifier never attempted, which yields the worst result

This changes the implementation priority.

The smallest justified fix set for the `rechtskräftig` failure is now:

1. one control-flow fix in Stage 1
2. one Pass-2 fusion-first prompt fix
3. one stronger retry-guidance fix
4. one `distinctEvents` input-only prompt fix

That is the minimal set needed to address the primary failure mode without expanding the prompt surface again.

# Consolidated Findings

## Critical

### C1. Stage 1 can still ship a known-broken final claim set

This remains the highest-leverage structural defect.

Observed state in three of four same-input runs:

- `preservesContract: false`
- retry had already occurred
- report still shipped as a normal successful article verdict

This is a pure control-flow problem in `claim-extraction-stage.ts`.

### C2. The primary stochastic driver for the `rechtskräftig` failure is split-vs-fuse behavior in Pass 2

The four-run evidence shows:

- only the fused-claim run produced the correct answer
- side-claim reification plus Gate-1 rejection produced wrong results
- omission produced the worst results

This makes Stage-1 claim shape the dominant variance source for this proposition.

### C3. Retry exists but does not recover the fused shape reliably

The retry path is real, but in the four-run sample it recovered zero of the three broken runs. The retry guidance in `claim-extraction-stage.ts` repeats the same loose `preserve in at least one direct atomic claim` framing that already failed, so it does not force reinsertion of the modifier inside an existing claim.

## High

### H1. `distinctEvents` appears contaminated by preliminary evidence

The same short input produced varying event counts and included proceedings or dates not present in the input. That violates the input-only contract and likely contributes to decomposition instability, but the current evidence does not yet prove that it is the primary driver rather than a parallel symptom of the same Pass-2 weakness.

### H2. The matrix mixes incompatible semantics in one display

The user-visible issue remains valid:

- cells = boundary-local findings
- row headers/totals = dominant-cell color
- column totals = final claim verdict
- overall total = article verdict

This is report-honesty debt, not just styling debt.

### H3. Same-input variance across the product is systemic, not only this proposition

The broader investigations still stand:

- Swiss-family variance is severe
- Plastik cross-language variance is mostly Stage 2
- Bolsonaro variance includes Stage 4 debate sensitivity
- other families show their own dominant contributors

So the `rechtskräftig` fix is necessary but not sufficient for general stabilization.

## Medium

### M1. `inputClassification` instability is a real separate Stage-1 issue

The same short input flipped between `single_atomic_claim` and `ambiguous_single_claim`. This matters, but it does not need to block the minimal modifier fix.

### M2. Deterministic semantic layers still deserve cleanup, but they are not first on the critical path for this proposition

This includes:

- substring-based anchor checks
- verdict-direction rescue arithmetic

These remain valid cleanup targets and system-wide quality concerns.

### M3. Prompt accretion remains a real risk

The prompt surface is too dense, and overlapping rules now compete for attention. The next changes must include deletion and consolidation, not only additions.

# Decisions Updated By The New Evidence

## Confirmed

1. Stage-1 contract enforcement is still the top structural fix.
2. The broad report-quality investigation must remain general and multi-family.
3. The matrix issue is real and should stay on the plan.
4. Same-input variance remains a product-level concern.

## Downgraded or withdrawn

1. Gate-1 anchor blindness is no longer a top-tier explanation for the `rechtskräftig` failure.
2. The Gate-1 anchor-exemption proposal is withdrawn.
3. Verdict-stage scope-of-truth issues are real but secondary for this specific proposition.
4. The earlier larger prompt-program is no longer justified by the evidence.

# Review-Ready Implementation Plan

## Phase 1: Minimal Correctness Fix

### Goal

Stop the system from shipping known-broken outputs and make the correct fused shape the dominant Stage-1 mode.

### Changes

1. `claim-extraction-stage.ts`
   Add a post-retry failure branch when `preservesContract === false` after the final contract refresh.

   Recommended behavior:
   - allow one bounded corrective retry if not already exhausted
   - if still broken, degrade the report instead of shipping normal success

2. `claimboundary.prompt.md`
   Rewrite the Pass-2 modifier-preservation rule so it is fusion-first:
   - when the input combines chronology or state with a finality, binding, or effect modifier, the primary direct claim must contain both inside one proposition
   - do not externalize the modifier into a separate claim about effect or bindingness

3. `claim-extraction-stage.ts` retry guidance
   Rewrite the corrective guidance string in code; do not leave the current `include it in at least one direct atomic claim` wording in place.
   When anchor omission is the failure reason, explicitly instruct:
   - insert the missing modifier inside an existing claim as an adverb or adjective
   - do not create a new claim about the modifier

4. `claimboundary.prompt.md`
   Tighten the `distinctEvents` rule:
   - `distinctEvents` must be derivable from the input text alone
   - do not add dates, proceedings, or events that appear only in preliminary evidence

### Acceptance Criteria

For repeated runs of the `rechtskräftig` proposition:

- fusion rate rises from about `25%` to at least `90%`
- `preservesContract` is almost always `true`
- failed contract runs no longer ship as normal successful reports
- verdict spread collapses toward the fused-run band instead of splitting across the currently observed modes

## Phase 2: Report Honesty Fix

### Goal

Make the UI semantically honest even when upstream stages disagree or later repairs modify claim-level outcomes.

### Changes

1. Remove `dominantVerdict()`-based row header and row-total coloring unless a real boundary-level verdict exists.
2. In `verdict-generation-stage.ts` and `aggregation-stage.ts`, recompute or invalidate `boundaryFindings` after claim-level repair so stale boundary cells do not contradict final claim verdicts.
3. Align live UI and export matrix semantics.

### Acceptance Criteria

- no row header implies a boundary verdict that does not exist
- repaired claim verdicts do not coexist with stale contradictory boundary colors
- export and live view use the same semantic color model

## Phase 3: Prompt And Code Reduction Track

### Goal

Reduce overlapping or obsolete logic while preserving the gains from the correctness fix.

### Changes

1. Consolidate duplicated Pass-2 anchor-preservation rules.
2. Remove dead config such as `articleVerdictOverride`.
3. Audit deprecated dominance residue and delete what is no longer consumed.
4. Plan replacement of deterministic semantic rescue layers with LLM re-validation where required by the repository rules.

### Acceptance Criteria

- prompt length is reduced or stays flat after the fix wave
- obsolete config and stale legacy surfaces are removed
- no new semantic rescue layer is added without removing an older one

## Phase 4: Broader Variance Work

### Goal

Address the broader report-quality instability the user asked about, beyond the specific `rechtskräftig` proposition.

### Focus Areas

1. Stage-2 retrieval and extraction balance for cross-language families such as Plastik.
2. Stage-4 debate sensitivity and deterministic rescue removal.
3. `inputClassification` stability and related Stage-1 branching drift.

### Acceptance Criteria

- repeated-run variance narrows in at least one non-Swiss family after targeted work
- evaluation is based on repeated-run distributions, not single-run anecdotes

# What Reviewers Should Explicitly Check

1. Is bounded retry then degrade the right product behavior for post-retry contract failure?
2. Is the proposed fusion-first wording sharp enough without re-expanding Pass 2?
3. Is the `distinctEvents` input-only fix sufficient, or does it also need a code-side guard later?
4. Should matrix honesty work land immediately after Phase 1, or in parallel if staffing allows?
5. Which reduction candidates are safe to remove in the same PR series, and which should stay in a follow-on cleanup track?

# What This Plan Explicitly Does Not Do

1. It does not claim the entire report-quality problem is a single Swiss-family issue.
2. It does not claim Stage 5 is the main cause of the current proposition failure.
3. It does not recommend a large prompt rewrite.
4. It does not recommend bypassing Gate 1 to let side-claims through.
5. It does not recommend additional diagnosis runs before the first fix lands.

# Review Recommendation

Approve Phase 1 as the minimal immediate fix set.

Then review Phase 2 and Phase 3 together as the first trust-and-simplification wave, with Phase 4 remaining a broader stabilization program.
