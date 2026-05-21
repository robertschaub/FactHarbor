---
roles: [Unassigned]
topics: [atomic_claim_selection, implementation_spec, sequencing, documentation_reconciliation]
files_touched:
  - Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Spec_Sequencing_Reconcile.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Spec Sequencing Reconcile
**Task:** Re-read the ACS-related docs updated after the previous spec pass and bring `2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md` back into alignment with the latest documented sequencing and tracking decisions.
**Files touched:** `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Spec_Sequencing_Reconcile.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No semantic redesign was needed; the drift was in sequencing emphasis. The spec now explicitly links to the updated `Dominant_Proposition` plan and `Backlog`, states that the broader track is now tracked as `ACS-1`, `ACS-CW-1`, and later `TOPPROP-1`, and clarifies that this spec is the canonical design anchor for the first two only. The rollout section now matches the newer handoffs: build the draft/prepared-job foundation first, then land the recommendation layer inside that same architecture, with any earlier foundation-only landing kept behind a flag and no separate standalone Check-worthiness product contract.
**Open items:** The spec still intentionally describes the full end-state ACS behavior, not a reduced foundation-only public release. If Captain later wants `ACS-1` to ship user-visible without the recommendation layer, that would require a new explicit spec change because current sections 5.4 and 8.2 still make recommendation failure blocking and recommendation part of the user-facing design.
**Warnings:** Do not read the new `ACS-1` / `ACS-CW-1` wording as approval to extract Check-worthiness into a separate external service; the newer debate documents explicitly rejected that. Do not let later `TOPPROP-1` work reopen ACS candidate semantics; the spec and dominant-proposition plan now both say ACS stays on the flat final `atomicClaims` seam.
**For next agent:** The updated alignment points are in [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md): frontmatter related docs, sequencing clarification near the top, and the rollout section. If you implement from this spec, treat `ACS-1` as the draft/prepared-job substrate and `ACS-CW-1` as the in-flow recommendation slice inside that substrate; `TOPPROP-1` remains a later separate track from [2026-04-20_Dominant_Proposition_Architecture_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md).
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
