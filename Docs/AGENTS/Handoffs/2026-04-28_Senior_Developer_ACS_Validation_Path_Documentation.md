---
roles: [Senior Developer]
topics: [acs, validation, direct_full_baseline, claim_selection, deployment]
files_touched:
  - Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Handoffs/2026-04-28_Senior_Developer_ACS_Validation_Path_Documentation.md
  - Docs/AGENTS/Agent_Outputs.md
---

**Superseded by:** `2026-04-28_Senior_Developer_ACS_Validation_Full_Debate_Spec.md`

# ACS Validation Path Documentation

**Task:** Document the reviewed solution for the ACS automatic validation-path regression and add a diagram showing the different paths and steps.

**Done:**

- Added `Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md` with the debate outcome, evidence summary, implementation plan, metadata contract, validation plan, acceptance criteria, deployment stance, and a Mermaid flowchart covering product ACS, default validation ACS, explicit direct-full baseline, and guarded legacy direct attempts.
- Updated `Docs/WIP/README.md` to list the new WIP solution doc under active quality/analyzer proposals and update the active-doc count/date.

**Decisions:**

- Documented the reconciled `MODIFY` plan: keep the `7b5b3409` runtime guard and ACS default path, but amend validation tooling to support an explicitly flagged `direct-full-baseline` path for forensic comparability.
- Documented the overhead constraint: the product path must not gain extra LLM calls or extra Stage 1/Stage 2 work for validation metadata.
- Documented that direct full-analysis must require both `FH_VALIDATION_PATH=direct-full-baseline` and `FH_ALLOW_DIRECT_FULL_ANALYSIS_VALIDATION=1`.

**Warnings:**

- This is documentation only. The validation script amendment and metadata output have not been implemented in code yet.
- The worktree already had unrelated dirty files before this task. Do not assume all current dirty files belong to this documentation update.
- The direct-full baseline path is intentionally a temporary forensic comparator, not a product path and not the default validation gate.

**Learnings:**

- The regression triage should distinguish product correctness from validation comparability. ACS automatic can be the correct product path while still being a poor comparator against historical direct full-claim jobs unless metadata labels the path and claim counts.

**For next agent:** Implement the documented validation-tooling amendment next: default to `acs-automatic-draft`, add a two-flag `direct-full-baseline` mode, emit submission-path and selected/prepared claim-count metadata, then run safe tests/build before any live jobs.
