---
roles: [Lead Architect]
topics: [atomic_claim_selection, implementation_spec, pre_job_intake, draft_flow]
files_touched:
  - Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Implementation Spec
**Task:** Consolidate the April 22 Atomic Claim Selection handovers into one implementation-ready design document.
**Files touched:** `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec.md`, `Docs/AGENTS/Agent_Outputs.md`

**Done**
- Wrote a new implementation-ready WIP spec that closes the main handover gaps: draft lifecycle, `Other` restart semantics, invite-slot timing, automatic-mode storage, runner integration, API routes, and report audit exposure.
- Chose a pre-job `ClaimSelectionDraftEntity` model instead of a live paused-job checkpoint.
- Updated the WIP index so the new spec appears in the active design inventory.

**Decisions**
- `interactive` remains the default, but both interactive and automatic mode go through the same draft-preparation path.
- Invite quota is claimed once at draft creation because Stage 1 preparation plus recommendation already consumes material resources.
- `Other` restarts on the same draft ID before claim extraction; the real job is created only after final confirmation.
- Prepared jobs carry `PreparedStage1Json` plus `ClaimSelectionJson` so the runner can skip Stage 1 safely and the report can show audit provenance.

**Open items**
- Lead Developer should confirm whether `PreparedStage1Json` stays as a full snapshot column on `JobEntity` or is wrapped inside a more generic prepared-input contract.
- Captain should confirm whether the initial UI for automatic mode is a visible toggle on the analyze page or an advanced-setting affordance.

**Warnings**
- Do not merge this design back into the older claim-clarification gate document; that document assumes a live job pause and wizard flow that this spec intentionally avoids.
- Do not let implementation reintroduce a `JobEntity` waiting status for claim selection in v1; the waiting state belongs to the draft object only.
- Recommendation failure is intentionally blocking. Any attempt to silently continue without the LLM recommendation would violate the settled requirement.

**Learnings**
- When a pre-analysis UX step needs real pipeline output but the current product has no user-account model, a short-lived token-protected draft object is the least disruptive way to add interaction without contaminating job semantics.

**For next agent**
- Start from `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`. The first implementation slice should be backend-first: add `ClaimSelectionDraftEntity`, the draft service/controller pair, shared analyze-input validation, and the prepared-job columns on `JobEntity`. Only after that should the runner queue and UI be wired.
