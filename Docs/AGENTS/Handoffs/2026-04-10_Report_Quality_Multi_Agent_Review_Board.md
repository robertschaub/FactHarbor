---
### 2026-04-10 | Review Board: Lead Architect + Senior Developer + LLM Expert + Adversarial Reviewer | GitHub Copilot (GPT-5.4) | Multi-Agent Review Board Consolidation
**Task:** Execute a fresh multi-agent review against the user’s original broad request, have independent reviewers investigate different aspects of the problem, compare and debate their conclusions, and produce an updated plan ready for human review.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Multi_Agent_Review_Board.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The review board confirms the broad investigation framing, not a one-case framing. The current consolidated plan remains directionally correct, but it needed four adjustments: Phase 1 must be treated as one combined implementation wave rather than a lone control-flow patch; matrix honesty should move to parallel or immediate follow-on status; proof gates need to be explicit before calling the fix successful; and the earlier Gate-1 anchor-exemption idea remains withdrawn.
**Open items:** Human review still needs to decide the exact degraded outcome when post-retry contract failure persists. Recommended: bounded retry then degrade, not silent success and not immediate hard fail. One deployed reference run remains desirable if the live app URL and access path become available.
**Warnings:** Do not approve a plan that only adds the Stage-1 circuit-breaker and stops there. Do not treat the `rechtskräftig` proposition as the whole product-level problem. Do not approve new Pass-2 wording without also defining how success will be measured. Do not reintroduce the earlier Gate-1 anchor-exemption idea.
**For next agent:** Use this file as the latest review-board source of truth. Fall back to `2026-04-10_Report_Quality_Consolidated_Review_Plan.md` and the April 10 handoffs only for supporting evidence or detailed rationale.
**Learnings:** No

# Original User Request Kept In Scope

This review board was instructed to preserve the user’s original scope:

- investigate the `rechtskräftig` failure in job `9dab...`
- explain the red matrix fields
- investigate large same-input variation across several inputs, not only this one
- assess perceived report-quality decline and complexity growth
- identify bad code and prompt accretion, including what should be removed
- use a team of agents and return root causes, proposals, and an implementation plan

The board explicitly did **not** treat this as only a one-case or one-family exercise.

# Review Board Composition

Four independent review tracks were run against the original request:

1. Stage-1 / contract / retry specialist
2. Matrix / UI / report-honesty specialist
3. Systemic variance and cross-family specialist
4. Adversarial reviewer challenging the current plan

Each reviewer investigated independently before the final consolidation.

# Consensus

The board reached strong consensus on the following points.

## 1. The current `rechtskräftig` failure is still primarily a Stage-1 problem

Consensus:

- the modifier is not absent because the system never noticed it
- the wrong claim shape is produced too often in Pass 2
- retry guidance does not reliably recover the fused shape; in the current four-run sample it recovered zero of three broken runs
- Stage 1 still ships the broken set when `preservesContract === false`

The four same-input runs remain the cleanest evidence for this.

## 2. The earlier Gate-1 anchor-exemption proposal should remain withdrawn

Consensus:

- Gate 1 is mostly rejecting the wrong shape correctly
- the repair target is upstream claim shape, not Gate-1 bypass

## 3. The matrix issue is real, user-visible, and not cosmetic

Consensus:

- the matrix mixes incompatible semantic levels
- row headers imply a kind of verdict that does not actually exist
- stale `boundaryFindings` can contradict final claim verdicts

This remains a trust issue even if the analytical root cause is elsewhere.

## 4. Same-input variance remains a product-level issue

Consensus:

- the `rechtskräftig` proposition now has a smaller, sharper fix set
- that fix does **not** solve all broad report-quality instability
- non-Swiss families still need explicit follow-on work, especially in Stage 2 and some Stage 4 paths

## 5. Reduction and deletion are still required

Consensus:

- dead config and stale residue should not wait forever
- prompt accretion is itself part of the quality problem
- future fixes must include consolidation and removal, not only added defenses

# Main Debate Points And Resolutions

## Debate 1: Is the control-flow fix the root fix or just a circuit-breaker?

Position A:
- The post-retry `preservesContract === false` branch is the highest-leverage fix.

Position B:
- It is necessary, but if shipped alone it only converts wrong-success reports into degraded reports without making Stage 1 produce the right shape more often.

Resolution:
- Treat the Stage-1 control-flow fix as a **P0 safeguard**, not a standalone cure.
- It must land in the **same implementation wave** as the fusion-first Pass-2 wording and the stronger retry guidance.
- The plan should never present the control-flow branch alone as sufficient.

## Debate 2: Should matrix honesty wait until after the correctness fix?

Position A:
- Correctness first, then UI.

Position B:
- The matrix problem is harming user trust now and is low-risk enough to move earlier.

Resolution:
- Move matrix honesty to **parallel or immediate follow-on** status.
- It should not wait behind the entire broader stabilization program.
- The lowest-risk part is removing `dominantVerdict()`-based row-header semantics and clarifying the legend.

## Debate 3: Is the current Phase-1 success criterion too vague?

Position A:
- Current acceptance criteria are directionally fine.

Position B:
- Terms such as `fusion rate` are not yet defined operationally.

Resolution:
- Add explicit review gates before approval:
  - define `fusion rate` as the percentage of repeated runs where the **final accepted primary direct claim** preserves the truth-condition modifier and `preservesContract === true`
  - define what counts as `degraded` behavior
  - define the repeated-run sample size used for approval

## Debate 4: Is Stage 2 still a blind spot in the current plan?

Position A:
- The `rechtskräftig` fix should proceed first because the four-run data cleanly isolates a Stage-1 problem.

Position B:
- If evidence-pool drift remains large even on fused-shape runs, Phase 1 alone may not narrow verdict spread enough.

Resolution:
- Keep the smaller Stage-1 fix set as the first implementation wave.
- Add a **post-fix proof gate**: compare at least two fused-shape runs to see whether Stage-2 evidence pools still diverge materially.
- If they do, escalate Stage-2 work sooner in the broader stabilization track.

## Debate 5: Does `distinctEvents` need more than a prompt change?

Position A:
- A prompt tightening is enough for Phase 1.

Position B:
- Since contamination already happened repeatedly, a code-side guard may become necessary.

Resolution:
- Keep the prompt tightening in Phase 1.
- Treat it as a likely contributor, not a proven primary cause, until post-fix measurement shows whether fused-shape runs still import evidence-only events.
- Add an explicit reviewer question: if repeated-run validation still shows imported events or proceedings not present in the input, schedule a code-side guard immediately after Phase 1.

## Debate 6: Is deployed validation a blocker?

Position A:
- Local evidence is already strong enough to proceed.

Position B:
- The plan should not claim full review closure without at least one deployed reference check if access becomes available.

Resolution:
- Deployed validation is **not a blocker** for the first implementation wave.
- It **is** still a review gap and should remain on the checklist for full product-level closure if the live app becomes accessible.

# Updated Review-Ready Plan

## Gate 0: Approval Inputs Before Coding

Before approving implementation, reviewers should explicitly answer:

1. On post-retry contract failure, should the system:
   - bounded retry then degrade
   - degrade immediately after retry
   - hard fail

   Recommended: bounded retry then degrade.

2. Is `fusion rate` defined as:
   - final accepted primary direct claim preserves the modifier
   - and `preservesContract === true`
   - across repeated same-input runs

3. Is the team willing to treat one deployed reference check as a follow-on review item if access is restored?

## Wave 1: Minimal Correctness Wave

This wave is the new minimum and should be reviewed as a single package.

### 1A. Stage-1 safeguard

In `claim-extraction-stage.ts`:

- after the final post-retry contract refresh
- if `preservesContract === false`
- do not ship a normal successful report
- apply the agreed degraded outcome

### 1B. Pass-2 fusion-first rewrite

In `claimboundary.prompt.md`:

- make the primary direct claim carry chronology plus finality or binding modifier inside one proposition
- explicitly prohibit reifying the modifier into a separate effect or binding claim

### 1C. Stronger retry guidance

In the retry path:

- rewrite the corrective guidance string in `claim-extraction-stage.ts`; do not leave the current `include it in at least one direct atomic claim` wording in place
- if the failure reason is anchor omission, instruct reinsertion inside an existing claim as adjective or adverb
- explicitly prohibit creating a new claim about the modifier

### 1D. `distinctEvents` input-only tightening

In `claimboundary.prompt.md`:

- `distinctEvents` must be derivable from the input text alone
- no dates, proceedings, or events from preliminary evidence

## Wave 2: Trust And Display Wave

This wave should run in parallel with Wave 1 or immediately after it.

### 2A. Matrix honesty quick fix

- remove `dominantVerdict()`-based row-header and row-total semantics unless a real boundary verdict exists
- add explicit matrix semantics help text

### 2B. Boundary-finding freshness review

- check the seam in `verdict-generation-stage.ts` and `aggregation-stage.ts`
- determine whether `boundaryFindings` should be recomputed after claim-level repair
- or clearly marked and rendered as intermediate state

### 2C. Align live UI and export semantics

- remove the current mismatch between live and export matrix interpretations

## Wave 3: Proof Gates After Wave 1

Do not declare success after coding alone.

### Required proof gates

1. Run about 10 repeated jobs for the `rechtskräftig` proposition.
2. Measure:
   - fusion rate
   - `preservesContract` rate
   - verdict spread
   - degraded-report rate
3. Compare at least two fused-shape runs for evidence-pool drift.

### Target outcomes

- fusion rate at least `90%`
- `preservesContract` almost always `true`
- no broken contract run ships as normal success
- verdict spread narrows substantially from the current multi-modal pattern

## Wave 4: Low-Risk Reduction Track

After Wave 1 and in parallel with Wave 2 or Wave 3 where safe:

1. remove dead config such as `articleVerdictOverride`
2. remove stale legacy references and low-risk residue
3. keep a list of higher-risk deterministic semantic layers for a later replacement track

## Wave 5: Broader Stabilization Track

This remains explicitly general and multi-family.

Focus areas:

1. Stage-2 retrieval and extraction balance for non-Swiss families such as Plastik
2. Stage-4 debate sensitivity and deterministic rescue review
3. `inputClassification` stability
4. multilingual neutrality and repeated-run measurement beyond the `rechtskräftig` proposition

# Updated Review Questions

Reviewers should now check these before approving implementation:

1. Is the degraded outcome clearly defined and acceptable to product stakeholders?
2. Is the Pass-2 fusion-first wording sharp enough without adding more overlapping rules?
3. Is `fusion rate` defined operationally and instrumented well enough for repeated-run validation?
4. If `distinctEvents` still imports evidence-only material after Wave 1, is the team prepared to add a code-side guard immediately?
5. Is matrix honesty being scheduled early enough to address current user trust problems?
6. If fused-shape runs still show materially different evidence pools, who owns the Stage-2 escalation work?

# Bottom Line

The review board supports the current direction but tightens the approval standard.

The plan is now:

- **not** a one-case plan
- **not** a Stage-5 blame plan
- **not** a broad prompt-expansion plan
- **not** a Gate-1 bypass plan

It is a smaller, sharper Stage-1 correction wave, followed quickly by matrix honesty work, explicit proof gates, low-risk reduction, and broader product-level stabilization.

That is the board’s consolidated recommendation for review.
