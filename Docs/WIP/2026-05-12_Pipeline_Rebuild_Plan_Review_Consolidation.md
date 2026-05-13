# Pipeline Rebuild Plan Review Consolidation

**Date:** 2026-05-12  
**Status:** Consolidated review result  
**Reviewed plan:** `Docs/WIP/2026-05-12_Pipeline_Rebuild_Specification_Plan.md`  
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

Keep the plan's Captain Intent and no-implementation-before-approval backbone, but revise it into a Plan V2 Baseline before Phase 1.

The plan must not proceed to reverse-engineering until it adds hard gates for:

- Complete source inventory.
- Locked external contracts and persisted-report compatibility.
- Prompt/config/model-routing baseline.
- Quality, benchmark, Q-code, multilingual, input-neutrality, and semantic-drift baseline.
- Runnable-system strategy using parallel/shadow V2 or equivalent isolation.
- Explicit approval/tie-breaker rules for removing risk-bearing mechanisms.

## Debate Result

**Verdict:** MODIFY  
**Confidence:** CONFIRMED

Survives:
- Captain Intent.
- Dedicated worktree.
- Reverse-engineer first.
- No implementation before approved specification.
- UI unchanged unless justified.
- Clean architecture and maintainability goals.
- Multi-role review gates.

Adopted from Challenger:
- The first draft needed structural revision, not a small patch list.
- Literal cleanup-before-rebuild is unsafe for the hot path.
- External contracts and historical report behavior must be locked down.
- Quality and semantic baselines must exist before cutover.

## Applied Plan Changes

The plan was rewritten as **Plan V2 Baseline** with:

- Phase 0 baseline gates.
- Full source inventory gate.
- External contract lock.
- Prompt/config/model baseline gate.
- Quality/regression baseline gate.
- Runnable-system strategy gate.
- Review and tie-breaking gate.
- Explicit Claude/Gemini participation timing.

## Claude and Gemini Timing

- **Phase 0:** Claude Lead Architect or Senior Developer reviews inventory/cutover safety; Claude LLM Expert reviews prompt/config/model and semantic drift; Gemini challenges broken-intermediate risk and additive-refactoring drift.
- **After Phase 2:** Claude checks factual completeness; Gemini challenges hidden coupling and missed external contracts.
- **After Phase 4:** Claude/Gemini debate the target architecture before Captain approves implementation.

## Deputy Decision Update

Captain subsequently delegated normal decision gates to the agent team as a Captain Deputy team. Escalate back to Captain only when risk is high, the deputy team cannot reach consent, or a decision would materially change product behavior, UI/API/report compatibility, persisted data behavior, validation spend, production/secrets/security posture, or the approved Captain Intent.

## Phase 0 Deputy Approval

Deputy team review returned `APPROVE_WITH_NOTES` from:

- Claude Lead Architect / Senior Developer.
- Claude LLM Expert.
- Claude Code Reviewer.
- Gemini Challenger.

No reviewer requested Captain escalation. The notes were accepted and folded into the Plan V2 Baseline:

- ACS/claim-selection surfaces are inventoried unconditionally during Phase 2.
- Gate 0.4 now distinguishes Phase 0 verification-surface definition from Phase 6 execution.
- Parallel/shadow V2 is recorded as the Phase 0 default runnable-system strategy.
- Structured-output schemas, multilingual mechanisms, cache structure, cost/latency baseline, prompt approval trail, reviewed-equivalent reviewer ownership, hot-path mechanism registry, and test-gap carry-forward were made explicit.

**Decision:** Phase 1 is authorized under the Captain Deputy delegation rule.
