# Pipeline Rebuild Plan Review Consolidation

**Date:** 2026-05-12
**Status:** Consolidated review result
**Reviewed plan:** `Docs/ARCHIVE/WIP/2026-05-12_Pipeline_Rebuild_Specification_Plan.md`
**Outcome:** MODIFY

---

## Review Inputs

- Claude Lead Architect: requested changes; blockers on missing `verdict-stage.ts`, incomplete source scope, unresolved structural-plumbing decision, missing benchmark/Q-code context, and unsafe ambiguity around cleanup.
- Claude LLM Expert: requested changes; blockers on missing prompt baseline and missing semantic-drift/quality-equivalence gate.
- Claude Senior Developer: requested changes; blockers on runnable-system isolation and regression baseline strategy.
- Claude Code Reviewer: requested changes; high findings on rebuild boundary ambiguity, persisted report compatibility, and missing analysis-quality regression path.
- Gemini adversarial architect: requested changes; blocker on literal cleanup-before-build breaking the hot path, plus high findings on quarantine risk and API/result JSON compatibility.
- Codex debate: Advocate and Challenger agreed the plan's intent survives, but the change must be structural, not editorial.

## Consolidated Verdict

Keep the plan's governing intent and no-implementation-before-approved-specification backbone, but revise it into a Plan V2 Baseline before Phase 1.

The plan must not proceed to reverse-engineering until it adds review checkpoints for:

- Complete source inventory.
- Locked external contracts and persisted-report compatibility.
- Prompt/config/model-routing baseline.
- Quality, benchmark, Q-code, multilingual, input-neutrality, and semantic-drift baseline.
- Runnable-system strategy using parallel/shadow V2 or equivalent isolation.
- Explicit decision rules for removing risk-bearing mechanisms.

## Debate Result

**Verdict:** MODIFY
**Confidence:** CONFIRMED

Survives:
- Governing intent.
- Dedicated worktree.
- Reverse-engineer first.
- No implementation before approved specification.
- UI unchanged unless justified.
- Clean architecture and maintainability goals.
- Focused reviewer checkpoints.

Adopted from Challenger:
- The first draft needed structural revision, not a small patch list.
- Literal cleanup-before-rebuild is unsafe for the hot path.
- External contracts and historical report behavior must be locked down.
- Quality and semantic baselines must exist before cutover.

## Applied Plan Changes

The plan was rewritten as **Plan V2 Baseline** with:

- Phase 0 baseline checkpoints.
- Full source inventory checkpoint.
- External contract lock.
- Prompt/config/model baseline checkpoint.
- Quality/regression baseline checkpoint.
- Runnable-system strategy checkpoint.
- Review and tie-breaking checkpoint.
- Explicit Claude/Gemini participation timing.

## Reviewer Timing

- **Phase 0:** Use a small targeted reviewer set for inventory, cutover safety, prompt/config/model behavior, semantic drift, broken-intermediate risk, and additive-refactoring drift.
- **After Phase 2:** Review factual completeness and challenge hidden coupling or missed external contracts.
- **After Phase 4:** Run a focused architecture challenge before implementation starts.

## Process Posture After Reset

The later Captain-Deputy orchestration model is not carried forward as the default operating process on the reset main branch. Future V2 work should prefer small, direct implementation packets with targeted reviewer checks. Escalate only when risk is high, reviewers materially disagree, or a decision would materially change product behavior, UI/API/report compatibility, persisted data behavior, validation spend, production/secrets/security posture, or the governing intent.

## Phase 0 Review Result

The original Phase 0 review returned `APPROVE_WITH_NOTES` from:

- Claude Lead Architect / Senior Developer.
- Claude LLM Expert.
- Claude Code Reviewer.
- Gemini Challenger.

No reviewer requested escalation. The notes were accepted and folded into the Plan V2 Baseline:

- ACS/claim-selection surfaces are inventoried unconditionally during Phase 2.
- Gate 0.4 now distinguishes Phase 0 verification-surface definition from Phase 6 execution.
- Parallel/shadow V2 is recorded as the Phase 0 default runnable-system strategy.
- Structured-output schemas, multilingual mechanisms, cache structure, cost/latency baseline, prompt approval trail, reviewed-equivalent reviewer ownership, hot-path mechanism registry, and test-gap carry-forward were made explicit.

**Decision:** Phase 1 was authorized for the original rebuild track. On the reset main branch this document is retained as historical design context, not as an active process mandate.
