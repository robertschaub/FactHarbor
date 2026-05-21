---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Debate On Check-Worthiness Before ACS
**Task:** Run the `/debate` workflow on the proposition that Check-worthiness should be implemented before Atomic Claim Selection as a standalone post-Stage-1 recommendation service that ACS later consumes, not as a new Gate 1 authority.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Debate_CheckWorthiness_Before_ACS.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Debate result is `MODIFY`. The non-Gate-1 boundary survives: Check-worthiness should remain a post-Stage-1 batched recommendation over the exact final `CBClaimUnderstanding.atomicClaims`, and `AtomicClaim.checkWorthiness` should remain advisory. The standalone-rollout claim does not survive: on the current evidence, Check-worthiness should not ship as a separate pre-ACS service contract. At most it may exist as internal telemetry/prototyping until ACS draft/intake artifacts exist.
**Open items:** If Captain later wants a genuinely standalone pre-ACS rollout, the missing prerequisite is not semantic logic but product contract: define a concrete persistence/audit surface outside ACS and show that shadow/admin-first rollout has enough distinct value to justify separate engineering and rollout complexity.
**Warnings:** Do not reinterpret this debate as approval to make Check-worthiness a new Gate 1 authority. Do not treat feasibility of pre-ACS shadowing as sufficient justification for a separately shipped feature. Do not conflate this with `topLevelProposition`; ACS v1 still excludes it.
**For next agent:** The winning shape is: ACS draft/prepared-job foundation first, then the check-worthiness recommendation module inside that flow. Relevant anchors are [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md), `apps/web/src/lib/analyzer/claim-extraction-stage.ts` Gate 1 behavior, and the current lack of claim-selection draft plumbing in `apps/api` and `apps/web`.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

## Debate Result

**Proposition:** Check-worthiness should be implemented before Atomic Claim Selection only as a standalone post-Stage-1 recommendation service that ACS later consumes, not as a new Gate 1 authority.
**Tier:** `standard` (3 agents)
**Intake status:** `debate-ready`

### Structural Audit

- Evidence inventory: 5
- Opposition explicitly present: yes
- Known gaps: no standalone artifact contract outside ACS; no empirical proof that a separate rollout beats folding recommendation directly into ACS
- Optional state: ACS v1 excludes `topLevelProposition`; current Stage 5 dominance path is unrelated
- Tier rationale: multi-factor architecture/rollout decision with concrete code/spec evidence

### Reconciler's Verdict: MODIFY

Check-worthiness before ACS should remain a post-Stage-1 batched recommendation signal and must not become Gate 1 authority, but it should not ship as a standalone pre-ACS service contract; at most it should exist as internal telemetry/prototyping until ACS draft/intake artifacts exist.

### Point-by-Point Resolution

| Point | Winner | Reasoning |
|-------|--------|-----------|
| Authority boundary | Advocate | The spec and code agree that recommendation ranks final `atomicClaims` and the live Stage 1 authority is still Gate 1 + contract validation, not `checkWorthiness`. |
| Current runtime seam | Advocate | The code shows `checkWorthiness` exists on the schema but is not the active selector; fidelity is telemetry-only and contract validation is the fidelity authority. |
| Standalone rollout viability | Challenger | The persistence and audit contract is specified inside ACS draft/job artifacts, not as an already-justified independent product slice. |
| Cost versus value before ACS | Challenger | The current evidence does not justify separate rollout complexity just because shadow/admin-first behavior is feasible. |

### Rejected Arguments

The Advocate’s step from “pre-ACS rollout would naturally be shadow/admin-first” to “therefore it should ship standalone before ACS” failed the structural bar. Feasibility is not yet justification.

### What Survives

- Recommendation stays post-Stage-1 and batched over the exact final `CBClaimUnderstanding.atomicClaims`
- `AtomicClaim.checkWorthiness` remains advisory/audit-level
- `topLevelProposition` remains outside ACS v1
- The Challenger’s adopted modification is to keep any pre-ACS work internal-only until ACS artifacts exist

### Skipped Roles

none

### Confidence: INFERRED

### Caveats

This is grounded in the current repo/spec state on 2026-04-22. If Captain later approves a concrete standalone persistence/audit contract and there is evidence that pre-ACS shadow rollout has distinct operational value, the rollout decision can be revisited without changing the non-Gate-1 authority boundary.
