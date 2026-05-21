---
roles: [Agents Supervisor]
topics: [ace_governance, collaboration_rules, restructure_proposal]
files_touched:
  - Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Restructure_Proposal.md
  - Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md
  - Docs/AGENTS/index/handoff-index.json
---

# Collaboration Rules Restructure Proposal

**Task:** Continue ACE governance implementation by producing the Phase 3 Captain-reviewable restructure proposal for `Multi_Agent_Collaboration_Rules.md`.

**Done:**

- Created `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Restructure_Proposal.md`.
- Converted the Phase 2 audit into a section-by-section disposition matrix.
- Defined approval slices A-F so Captain can approve the move/rewrite/delete decisions independently.
- Added rollback and acceptance criteria for the future Phase 4 edit.
- Updated `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md` to mark Phase 3 proposal creation complete.

**Decisions:**

- No direct edits were made to `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`.
- The proposal preserves hub-and-spoke investigation material as a procedure rather than treating it as dead weight.
- Area-to-documents and role-to-area material are deferred until coverage is audited elsewhere.

**Warnings:**

- Phase 4 still requires Captain approval before any section movement or archival.
- The proposal intentionally leaves the unrelated dirty generated `stage-map.json` and `stage-manifest.json` files untouched.

**Learnings:**

- The useful cleanup unit is not "delete dead weight"; it is "routing doc plus preserved procedures." That distinction prevents rare but important coordination protocols from disappearing.

**For next agent:** Use `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Restructure_Proposal.md` as the approval matrix. Do not edit `Multi_Agent_Collaboration_Rules.md` until Captain decides which slices are approved.
