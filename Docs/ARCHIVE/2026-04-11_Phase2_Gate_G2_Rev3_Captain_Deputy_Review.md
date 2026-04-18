---
title: Phase 2 Gate G2 Rev 3 — Captain Deputy Review
date: 2026-04-11
reviewer: Captain Deputy (subagent)
parent: Docs/WIP/2026-04-11_Phase2_Gate_G2_Replay_Plan.md
status: Review complete — awaiting LLM Expert Rev 3 review and user green-light
verdict: PROCEED (minor clarifications recommended, no blocking issues)
---

# Captain Deputy Review — Gate G2 Rev 3

Received 2026-04-11. Strategic review of Rev 3 against the Rev 2 concerns the Captain Deputy raised earlier.

## Verdict

**PROCEED.** Rev 3 is fit for the Captain's actual purpose. Minor clarifications recommended, but no blocking issues.

## Rev 2 concerns status

| Rev 2 Concern | Rev 3 Status |
|---|---|
| Master-plan drift (Phase 3/4 "keep/delete/refactor" inside G2) | **Addressed** — stripped from the gate body, relocated to "Strong priors (NOT decisions)" section at end |
| Implicit G3/G4 judgments | **Addressed** — §"What G2 approval commits you to" explicitly says does NOT commit to any revert/refactor |
| Opportunity cost / minimum viable | **Partially addressed** — Shape B picked (3 commits, not the strict 2-commit minimum, but justified — see §3) |
| Mini-G1 substitute (3 priority criteria) | **Partially addressed** — 7 criteria instead of 3 (at the ceiling but responsive to input set) |
| Apples-to-apples on Wave 1A | **Addressed** — A2 deferred to post-replay, stash protocol documented, C0 measured in clean worktree |
| Matrix improvement deferred | **Addressed** — explicit "deferred to a separate post-replay workstream" |

## Master-plan drift check

**Drift removed, not relocated.** The "Strong priors (NOT decisions)" section is properly framed: each prior uses the "Prior / Replay may show" format and ends with "None of these priors are being acted on until Phase 3 data is in." This is honest prior disclosure, not disguised decision language. The body of Rev 3 is otherwise free of "delete/refactor/queue for Phase 4" language.

## Captain-question-alignment check

**Rev 3 is answering the Captain's actual pain** — "Apr 10 wave feels mixed / more negative" maps directly to C0-vs-C1 (Option G era alone) and C0-vs-C3 (entire wave) as two nested windows.

**However**, writing still leans slightly forensic. Six of the measurement signals captured are forensic instrumentation (cap-trigger rates, Wave 1A termination reasons, anchor retry counts, thesisRelevance presence, preservesContract distribution) — valuable for Phase 3's Change Impact Ledger but not directly required to answer "is quality better or worse?" **Not a blocker** — marginal cost is zero since every run already emits them.

## Scope discipline check

**Appropriate-viable, not minimum-viable.** 3 commits (not the strict 2-commit minimum) is legitimately load-bearing: without C1 (`82d8080d`), a C0-vs-C3 delta on R2 cannot distinguish "Option G hurt" from "Apr 8 proposition anchoring hurt" from "Apr 9 comparator downgrade hurt". These are the three candidate hypotheses the Captain actually cares about. The +13 jobs to add C1 is cheaper than the Phase 2B activation path that would be required otherwise.

**4 inputs is correct** — all four have backward anchors and cover three variance regimes. R1 and R5-R9 correctly deferred to Phase 2B.

**Total: 39 jobs for $15–30 is well-justified.**

## Mini-G1 expansion check

**7 criteria is acceptable but at the ceiling.** Composition:
- P1-P3 (Q-HF5, Q-ST1, Q-ST5): the 3 symptom-level generics
- P4-P6 (Q-S1.1, Q-S1.3, Q-S1.5): Stage-1 input-specific decomposition / modifier / specificity
- P7 (Q-V1): verdict direction plausibility

The expansion is **responsive to the input set** — if only 3 criteria were set, there would be measurement coverage gaps. Rev 3 adds Q-V1 explicitly, with an honest caveat that Q-V1 is weakly measurable without R7/R8. **Not scope creep, but at the ceiling.** If Rev 4 adds an 8th, push back.

## Residual concerns

1. **Q-V1 is honestly flagged as weak** but the plan doesn't force a decision. Captain should be asked to choose: keep at P7 with weak signal, demote, or strengthen by adding R7/R8 (+$5–12).

2. **Stop rule thresholds are unanchored**. "≥15pp regression on any individual family" is plausible but has no evidence-based justification. For 3 commits × 13 jobs per commit, a single 15pp outlier could trigger pause on sampling noise alone, especially on R4 (2 runs only). Either calibrate against observed R2/R3b HEAD variance first, or label as "first-pass heuristic, expected to need adjustment on first pause".

3. **Budget envelope has DECREASED, not grown.** Original Rev 2 forecast: $45–85. Rev 3 Shape B: $15–30. Phase 2B max: $40–75 additional. Total cap lower than Rev 2.

4. **Decision burden on the Captain**: Rev 3 asks for final green-light but the "What I need from joint review" section mixes reviewer questions with Captain questions. Should be split.

## Three most important recommendations

1. **Reduce Captain decision surface to a single yes/no.** Separate reviewer questions from Captain questions. Captain should see: *"Shape B as written, approved to execute?"* with optional modifiers (Q-V1 demotion, R7/R8 add, stop-rule threshold) as discrete yes/no toggles.

2. **Surface Q-V1 ambiguity to the Captain for explicit decision.** Three options: (a) keep Q-V1 at P7 and accept weak signal, (b) demote Q-V1 to "measure but don't optimize for", (c) add R7/R8 (+$5–12) to strengthen.

3. **Confirm stop-rule thresholds with LLM Expert before Captain sees Rev 3.** Either calibrate against observed HEAD variance, or label explicitly as first-pass heuristic expected to need adjustment.

## Questions the Captain should be asked before green-light

1. **Priority criteria endorsement**: 7 criteria (P1-P7) — endorse as-is, or trim to the 3 P1-P3 generics? Q-V1 in particular: keep weak, demote, or strengthen by adding R7/R8 (+$5–12)?

2. **Phase 2B pre-authorization scope**: at the pause point (stop-rule fires or ambiguous Shape B results), do you approve Phase 2B expansion up to $40–75 total, or do you want separate explicit approval each time?

3. **Commit-sequence green-light**: the Commit A1 / Commit B+revert sequence changes the working tree state before the replay starts. Do you approve as a unit, or want to review A1's contents before it lands?

---

**Note**: The LLM Expert Rev 3 review is still running in the background. Lead Architect will consolidate both reviews into a single user-facing response before any further action.
