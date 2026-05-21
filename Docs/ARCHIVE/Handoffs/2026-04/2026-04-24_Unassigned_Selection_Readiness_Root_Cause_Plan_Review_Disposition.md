# 2026-04-24 — Selection Readiness Root Cause Plan Review Disposition

## Summary

Created and review-tightened the root-cause plan for delayed or missing Atomic Claim Selection readiness:

- active plan: `Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md`

The first draft overstated broad-input contract-preservation failure as the dominant repeated driver. Review corrected that. The final plan now separates:

- a resolved worktree bug: `/analyze` forcing `automatic`
- the primary currently measured problem: Stage 1 latency before selection
- a secondary but real analytical-risk track: broad-input Stage 1 quality issues that need concrete failing packets
- an observability track: draft/job log attribution

## Review Findings Accepted

1. The original draft overclaimed that the monitored `sp-ps` family clearly failed through contract-preservation rejection.
- Accepted.
- The final doc now treats broad-input quality as a real risk but not the best-grounded primary driver of delayed selection readiness.

2. The original ordering put broad-input quality ahead of the repeatedly measured latency issue.
- Accepted.
- The final doc now prioritizes:
  1. Stage 1 same-semantics latency work
  2. targeted broad-input quality investigation on concrete failing packets
  3. observability/log attribution cleanup

3. “Already fixed” blurred current-worktree implementation with historical monitored runs.
- Accepted.
- The final doc now says the interactive-mode fix is implemented in the current worktree and applies to new sessions, not retroactively to old drafts already created in `automatic` mode.

4. The observability phase was broader than current repo state required.
- Accepted.
- The final doc now narrows that phase to attribution/operator clarity, not session-mode UI work that has already landed.

5. One rereview found that `SR sparse-domain early exit` had been incorrectly pulled into the selection-readiness latency phase.
- Accepted.
- Removed from the readiness phase because it is part of the later full-analysis path, not the pre-selection critical path.

## Final Position

The final plan is:

1. **Phase 1:** reduce Stage 1 time-to-selection under current semantics
2. **Phase 2:** investigate Stage 1 broad-input quality failures only on concrete failing packets
3. **Phase 3:** improve observability and draft/job log attribution
4. keep hydration-extension noise as low-priority monitor-only

## Warnings

- The plan is intentionally a diagnosis-and-prioritization note, not an implementation spec for one single code change.
- The broad-input quality track is still important, but the current evidence does not support claiming it as the dominant repeated readiness blocker.

## Learnings

- “Selection readiness” must be scoped strictly to the pre-selection path. Pulling in later full-analysis optimizations makes the plan look broader but less correct.
- Review was necessary here because the first draft mixed one historically important failure with the strongest currently repeated signal, which is latency.
