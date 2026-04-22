---
roles: [Lead Architect]
topics: [atomic_claim_selection, interactive_default, intake_flow, non_interactive_override]
files_touched:
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Interactive_Default.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Requirement_Refinement.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Debate.md
---

### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Interactive Default
**Task:** Resolve the remaining rollout-default decision for Atomic Claim Selection after the refinement and debate notes left it open.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Interactive_Default.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Captain clarified that `interactive` is the v1 default. `automatic` remains supported only through explicit non-interactive user configuration, where the chooser is skipped and the system auto-continues with the LLM-recommended subset. This does not change the debated baseline architecture: keep the chooser as a pre-job draft/intake step over the exact current final `CBClaimUnderstanding.atomicClaims`, do not introduce a live post-Stage-1 wait state, and treat `Other` as a fresh restart before claim extraction.
**Open items:** Define the concrete intake/draft persistence contract; decide whether non-interactive configuration is stored per user, per tenant, or per submission; define how the selected-mode metadata is exposed in the jobs UI and report audit view.
**Warnings:** Do not reinterpret the new default as permission to overload live job-state semantics. `interactive` being the default is a product-choice resolution, not a reversal of the debate outcome on lifecycle placement. Keep non-interactive mode available for automation and batch use cases.
**For next agent:** Treat prior "rollout default undecided" language as superseded. Design the first implementation around an interactive-by-default pre-job chooser, with `automatic` as an explicit override only. Preserve the exact-final-`atomicClaims` seam, persist candidate/recommended/selected IDs plus mode and `Other` restart flag, and keep Stage 1 extraction semantics unchanged.
**Learnings:** no

## Done

- Reviewed the existing refinement and debate handoffs and confirmed that the only unresolved architecture decision was the rollout default.
- Recorded the Captain clarification that `interactive` is the default, while preserving the already-debated v1 architecture seam and non-interactive override path.
- Left the earlier handoffs intact as historical context; this file supersedes only the default-selection decision.
