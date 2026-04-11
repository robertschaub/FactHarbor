### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Report Quality Review Consolidation
**Task:** Consolidate the unfinished report-quality investigation into a single Lead Architect review artifact that reflects the latest April 10 findings, preserves the user’s broader scope, and is ready for human review.
**Files touched:** This handoff only.
**Key decisions:** This document now supersedes the earlier partial investigation as the review-ready plan. Since consolidation, Wave 1A and the Wave 1B/1C anchor-preservation changes have landed in code, along with two adjacent integrity fixes: stale `boundaryFindings` are cleared during verdict repair and the single-boundary triangulation penalty is neutralized. Matrix honesty still moves to parallel or immediate follow-on status, and broader variance and reduction work remain explicit tracks rather than being collapsed into a one-case fix.
**Open items:** Human review is still needed on whether the current bounded-retry-plus-damaged-report behavior is sufficient or whether a targeted fusion retry should still be added on top of the new guard. Repeated-run proof gates are still pending. `distinctEvents` input-only tightening is not yet evidenced by the implementation summary and should remain open until verified in code.
**Warnings:** Do not treat the recent implementation burst as full closure. Build success and prompt reseeding are necessary but not sufficient; repeated-run validation is still required. Do not revive the withdrawn Gate-1 anchor-exemption idea. Do not treat the Swiss `rechtskräftig` proposition as the whole product-level problem. Do not add more prompt surface without removing overlapping rules.
**For next agent:** Use this file as the review-ready source of truth. Treat Wave 1A/1B/1C and the two adjacent integrity fixes as implemented baseline, then focus on empirical validation, remaining `distinctEvents` confirmation, UI matrix honesty, and broader stabilization.
**Learnings:** No

---

# Purpose

This document consolidates the April 10 investigation wave into one Lead Architect review artifact.

It replaces the earlier partially completed investigation by doing four things:

1. Keeping the original user scope intact, not narrowing it to one bad Swiss run.
2. Folding in the latest same-input empirical evidence and the later review-board debate.
3. Removing superseded recommendations.
4. Converting the investigation into a review-ready plan with approval questions, implementation waves, and proof gates.

# Scope Kept In Review

This plan keeps all of the user’s concerns in scope:

1. The `rechtskräftig` failure in job `9dab007670434245a3b76fa405066989`.
2. The red matrix fields and report-level trust problem.
3. Large same-input variance across several families, not only Swiss.
4. Perceived report-quality decline and whether a specific commit caused it.
5. Code and prompt accretion, including what should be removed.

# Source Priority

Where April 10 documents disagree, use this order:

1. `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md`
2. `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Multi_Agent_Review_Board.md`
3. `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md`
4. `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md`
5. This file’s earlier investigation body, now superseded by this consolidation

Superseded recommendation:

- The earlier Gate-1 anchor-exemption idea remains withdrawn.

# Architectural Decision Principles

This plan is grounded in the current ClaimAssessmentBoundary pipeline and the repository invariants.

1. Fix the primary failure at the earliest stage that can still preserve the proposition, which is Stage 1, not Stage 5.
2. Keep Gate 1 mandatory. Do not solve a bad claim shape by bypassing claim validation.
3. Prefer LLM-first proposition-shape correction over new deterministic semantic rescue logic.
4. Keep the report semantically honest when intermediate and final verdict layers differ.
5. Treat reduction as part of the fix program, not as optional cleanup after the fact.

# Consolidated Findings

## Critical

### C1. The current `rechtskräftig` report failure is real and still primarily a Stage-1 problem

The latest four-run same-input evidence makes the mechanism clearer than the original draft.

Observed Stage-1 modes for the same proposition:

1. Fused modifier inside the primary direct claim. This is the only mode that produced the substantively correct low-truth result.
2. Reified side-claim about legal effect or bindingness. Gate 1 then correctly rejected that side-claim, after which the broken set still shipped.
3. Modifier omitted entirely. This produced the worst result.

In the current four-run sample, the retry path recovered none of the three broken runs. Under the existing guidance, the retry is empirically 0-for-3 rather than merely unreliable.

Architectural conclusion:

- The dominant failure is not that the system never notices `rechtskräftig`.
- The dominant failure is that Pass 2 produces three unstable modes, only one of which is correct: fused, reified, or omitted.
- The retry path does not currently recover the fused proposition under its present guidance.
- Stage 1 still ships the broken set when preservation remains false.

### C2. Stage 1 can still ship a known-broken final claim set

This remains the highest-leverage structural defect.

The current Stage-1 flow can do all of the following in one run:

1. detect the truth-condition anchor,
2. detect that the final accepted claim set does not preserve it,
3. refresh the contract summary,
4. continue to a normal successful report anyway.

That violates the intended role of Gate 1 and makes downstream stages adjudicate the wrong proposition.

### C3. The matrix issue is real, user-visible, and not merely cosmetic

The matrix still mixes incompatible semantic layers:

1. Cells represent boundary-local findings.
2. Row headers and row totals use dominant-cell semantics.
3. Column totals show final claim verdicts.
4. Overall totals show the article verdict.

In `9dab...`, that is compounded by stale `boundaryFindings` that can remain false-side while the final claim verdict has been repaired upward. This is a report-honesty problem, not just a styling issue.

Fixing Stage 1 should reduce how often this contradiction appears, but it will not eliminate the display problem by itself. Wave 2 still needs an explicit freshness and semantics fix.

## High

### H1. Same-input variance remains systemic across the product

The broader investigation still stands. The problem is not only Swiss, not only one build, and not only one stage.

Repeated-run spreads remain materially large across several families, including Swiss, Plastik, Hydrogen, Flat Earth, and Bolsonaro. The dominant contributor differs by family, but the product-level issue is real.

### H2. `f1a372bf` is not causal

The earlier draft was correct on this point and it remains important for review.

- `f1a372bf` is docs-only.
- The broad quality problem predates that commit.
- Some April 7-8 proposition-anchoring changes added complexity without reliably solving the Swiss-family issue, but there is no clean narrative where `f1a372bf` itself caused the decline.

### H3. Complexity accretion is now part of the problem, not just background debt

The codebase is not out of control, but the user is right that too many fixes landed as additions.

Credible current reduction targets include:

1. dead config such as `articleVerdictOverride`,
2. deprecated dominance residue,
3. stale prompt and docs surface tied to removed pipeline mental models,
4. deterministic semantic rescue layers that now complicate debugging and trust.

## Medium

### M1. `distinctEvents` appears contaminated by preliminary evidence

The same short input produced varying event counts and event content not derivable from the input itself. This likely contributes to proposition fragmentation, but the current evidence does not yet prove it is the primary cause rather than a parallel symptom. It is still part of the Phase-1 fix set because the input-only contract is non-negotiable.

### M2. `inputClassification` instability is real but secondary for the immediate Swiss fix

The same short input flipped between `single_atomic_claim` and `ambiguous_single_claim`. This matters, but the current empirical evidence still points to fused-vs-split Stage-1 claim shape as the first correction target.

### M3. Deterministic semantic rescue layers remain a broader architectural cleanup target

This includes substring anchor checks, verdict-direction rescue arithmetic, and other semantic heuristics already flagged in the April 9 hotspot review. These remain important, but they are not the first move for the specific `rechtskräftig` failure.

# What Changed From The Earlier Draft

The original investigation in this file was directionally right, but the later same-day evidence sharpened the plan.

Confirmed:

1. Stage-1 contract enforcement remains the top structural fix.
2. The matrix issue remains a real trust problem.
3. Same-input variance remains general, not one-family.
4. Reduction and deletion must stay on the plan.

Updated:

1. The minimal Swiss-family fix is smaller and sharper than the earlier draft suggested.
2. Gate-1 anchor blindness is no longer a top-tier explanation for the current proposition failure.
3. The Gate-1 anchor-exemption proposal is withdrawn and should stay withdrawn.
4. The control-flow safeguard has now landed, together with the fusion-first prompt and stronger retry guidance, so the document must distinguish shipped corrections from still-open validation work.
5. Two adjacent integrity fixes are now also present in code: verdict repair clears stale `boundaryFindings`, and single-boundary triangulation is neutral rather than penalized.
6. Verdict-stage scope-of-truth concerns remain latent rather than resolved; they become relevant once Stage 1 reliably preserves the fused proposition under repeated-run validation.

# Review-Ready Plan

## Gate 0: Approval Decisions Before Coding

Reviewers should explicitly answer these before implementation starts:

1. On post-retry contract failure, should the system use bounded retry then degrade, degrade immediately, hard fail, or perform a targeted fusion retry on the existing claim set before degrading?
2. Is `fusion rate` defined as the percentage of repeated runs where the final accepted primary direct claim preserves the truth-condition modifier and `preservesContract === true`?

Recommendation:

- adopt the operational `fusion rate` definition above,
- prefer a bounded targeted fusion retry over a blind full re-extraction retry if the implementation cost is reasonable,
- otherwise use bounded retry then degrade.

## Current Implementation Status

The plan is no longer purely prospective. Based on the latest implementation summary and code review, the following items are now shipped:

1. `claimboundary-pipeline.ts`: early termination with a damaged report when Stage 1 still ends with `preservesContract === false`.
2. `claimboundary.prompt.md` and `claim-extraction-stage.ts`: fusion-first truth-condition-anchor preservation plus stronger code-side retry guidance.
3. `verdict-stage.ts`: truth-percentage repair now clears stale `boundaryFindings` before returning a repaired verdict.
4. `aggregation-stage.ts`: single-boundary claims now receive neutral triangulation (`factor = 0`) instead of a penalty.
5. Build and prompt reseeding have been reported successful.

The following items should still be treated as open unless separately verified:

1. explicit `distinctEvents` input-only tightening,
2. matrix row/header honesty in the UI,
3. repeated-run proof gates and post-fix spread measurement.

## Wave 1: Minimal Correctness Wave

This was the minimum justified implementation package. As of the latest implementation pass, 1A/1B/1C are in code; 1D remains open unless separately verified.

### 1A. Stage-1 safeguard

Target file:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

Status:

- Implemented in `claimboundary-pipeline.ts` as an early termination path that emits a `report_damaged` warning, stops research and verdict stages, and returns a damaged report with fallback UNVERIFIED claim verdicts.

Change intent:

- After the final post-retry contract refresh, if `preservesContract === false`, do not ship a normal successful report.
- Apply the agreed degraded behavior and surface the contract failure explicitly in the degraded output, including the final contract summary and anchor retry reason.

Reason:

- This prevents known-broken final claim sets from flowing into later stages as if the proposition were preserved.
- The contract validator already produces user-comprehensible diagnostic material; hiding it would waste the main value of degradation.

### 1B. Pass-2 fusion-first rule

Target file:

- `apps/web/prompts/claimboundary.prompt.md`

Status:

- Implemented in `claimboundary.prompt.md` and reinforced in `claim-extraction-stage.ts` retry guidance.

Change intent:

- Rewrite the modifier-preservation instruction so that when the input combines chronology or state with a finality, binding, or effect modifier, the primary direct claim must contain both inside one proposition.
- Explicitly prohibit externalizing the modifier into a separate claim about effect or bindingness.
- Explicitly prohibit omission of the modifier-bearing proposition, not only reification of it.
- Replace rather than layer onto the current loose preservation wording, and consolidate the redundant anchor-preservation self-check blocks that are not preventing reification or omission.

Reason:

- The current evidence shows three modes: fused, reified, and omitted. Only the fused shape reliably yields the correct result.

### 1C. Stronger retry guidance

Target files:

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/prompts/claimboundary.prompt.md` if shared retry wording is prompt-backed

Status:

- Implemented in `claim-extraction-stage.ts`. The old loose `preserve it in at least one direct atomic claim` wording has been replaced with fusion-first corrective guidance.

Change intent:

- Rewrite the corrective guidance string in `claim-extraction-stage.ts`; do not leave the current `include it in at least one direct atomic claim` wording in place.
- When anchor omission is the failure reason, instruct reinsertion of the modifier inside an existing claim as an adjective or adverb.
- Explicitly prohibit creating a new claim about the modifier.
- If reviewers approve it at Gate 0, prefer a targeted fusion retry on the existing claim set over a blind from-scratch retry.

Reason:

- Retry exists today but repeats the same weak preservation framing that already failed.
- In the current sample, the retry path recovered zero of three broken runs, so rewriting the code-side retry guidance is non-optional.

### 1D. `distinctEvents` input-only tightening

Target file:

- `apps/web/prompts/claimboundary.prompt.md`

Status:

- Still open unless separately verified. The latest implementation summary did not claim this item, and the current review should not mark it complete on inference alone.

Change intent:

- Tighten the rule so `distinctEvents` must be derivable from the input text alone.
- Explicitly forbid importing dates, proceedings, or events that appear only in preliminary evidence.

Reason:

- Current contamination likely amplifies decomposition drift, and Wave 3 should measure whether this contamination persists after the edit.

## Wave 2: Trust And Display Wave

This wave should run in parallel with Wave 1 or immediately after it.

### 2A. Matrix honesty quick fix

Target files:

- `apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx`
- `apps/web/src/app/jobs/[id]/page.tsx`

Status:

- Partially implemented in `verdict-stage.ts`: repaired verdicts now clear stale `boundaryFindings` before returning.
- Remaining open question: whether any downstream recomputation or neutral rendering is still needed for non-repair paths and UI presentation.

Change intent:

- Remove `dominantVerdict()`-based row-header and row-total coloring unless a real boundary-level verdict exists.
- Add explicit matrix semantics help text.

### 2B. Boundary-finding freshness review

Initial target files:

- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`

Change:

- Decide whether `boundaryFindings` should be recomputed after claim-level repair or clearly marked as intermediate state and rendered neutrally.
- Confirm the exact recompute seam before implementation if the data flow is not already obvious from those two files.

### 2C. Align live and exported semantics

Change:

- Remove the current mismatch between live UI and export semantics for matrix interpretation.

### 2D. Single-boundary triangulation neutralization

Target file:

- `apps/web/src/lib/analyzer/aggregation-stage.ts`

Status:

- Implemented. `computeTriangulationScore()` now returns `factor = 0` when `boundaryCount <= 1`, which removes the prior artificial penalty on single-boundary claims.

Reason:

- A single boundary provides no cross-boundary corroboration, but it also does not justify an automatic negative multiplier. Neutral treatment is the architecturally cleaner default.

## Wave 3: Proof Gates After Wave 1

Do not declare the issue fixed after coding alone.

Current status:

- Production build and prompt reseeding have been reported successful.
- That is necessary but not sufficient. The repeated-run gates below remain mandatory before calling the `rechtskräftig` issue fixed.

Required validation:

1. Run about 10 repeated jobs for the exact `rechtskräftig` proposition.
2. Measure fusion rate, `preservesContract` rate, verdict spread, and degraded-report rate.
3. Compare at least two fused-shape runs for evidence-pool drift.

Target outcomes:

1. fusion rate `>= 70%` acceptable on first pass, with `>= 90%` as the target,
2. `preservesContract` almost always `true`,
3. no broken-contract run ships as normal success,
4. verdict spread narrows materially from the current multi-modal pattern.

Escalation rule:

- If fusion rate lands below target but above the acceptable floor, treat Wave 1 as partial success and schedule a follow-on targeted fusion retry refinement rather than declaring closure.
- If fused-shape runs still show materially different evidence pools, escalate Stage-2 work earlier in the broader stabilization track.

## Wave 4: Low-Risk Reduction Track

This should proceed in parallel where safe.

Priority items:

1. remove dead config such as `articleVerdictOverride`,
2. remove stale legacy references and deprecated dominance residue,
3. consolidate duplicated Pass-2 rules rather than leaving the new rule layered on top,
4. keep a tracked list of higher-risk deterministic semantic layers for later replacement.

Review rule:

- No new semantic rescue layer should be added without removing or narrowing an older one.

## Wave 5: Broader Stabilization Track

This remains explicitly multi-family and product-level.

Focus areas:

1. Stage-2 retrieval and extraction balance for families such as Plastik.
2. Stage-4 debate sensitivity and deterministic rescue review.
3. `inputClassification` stability.
4. multilingual neutrality and repeated-run measurement beyond the Swiss family.

# Success Criteria For Review Approval

Before reviewers call the first wave successful, all of the following should be true:

1. Broken contract runs no longer ship as normal successful reports.
2. The fused proposition shape becomes the dominant Stage-1 mode for the `rechtskräftig` proposition.
3. Matrix row headers no longer imply nonexistent boundary-level verdicts.
4. Repaired claim verdicts no longer coexist with stale contradictory boundary colors in the UI.
5. At least one low-risk reduction item is actually removed, not merely moved to backlog.
6. Control families show no clear regression during repeated-run validation.

# Review Questions

Reviewers should explicitly challenge these points:

1. Is bounded retry then degrade the right product behavior, or should post-retry failure be harsher or softer?
2. Is the fusion-first wording sharp enough without re-expanding the prompt surface?
3. If `distinctEvents` still imports evidence-only material after Wave 1, should a code-side guard be scheduled immediately?
4. Is matrix honesty landing early enough to address the current trust problem?
5. If fused-shape runs still diverge materially due to evidence pools, who owns the Stage-2 escalation?
6. Should Wave 1 use a targeted fusion retry on the existing claim set rather than a blind re-extraction retry?

# What This Plan Explicitly Rejects

1. It does not blame Stage 5 as the primary cause of the current Swiss-family failure.
2. It does not recommend bypassing Gate 1 to let side-claims through.
3. It does not recommend a large prompt expansion program.
4. It does not reduce the whole report-quality problem to one Swiss-family proposition.
5. It does not treat reduction as optional cleanup for later.

# Bottom Line

The original investigation was correct about the big picture but not yet in review shape.

The current plan is now clear:

1. acknowledge that the core Stage-1 safeguard and anchor-preservation fixes are now implemented,
2. do not call the issue fixed until repeated-run gates show the fused proposition has become the dominant stable mode,
3. move matrix honesty to parallel or immediate follow-on status,
4. keep explicit reduction work on the plan,
5. continue the broader multi-family stabilization program after the immediate fix.

That is the Lead Architect recommendation for review.
