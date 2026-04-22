---
roles: [Unassigned]
topics: [atomic_claim_selection, check_worthiness, zhaw, recommendation_methodology]
files_touched:
  - Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Proposal.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Check-Worthiness Proposal
**Task:** Investigate whether FactHarbor's current check-worthiness methodology is strong enough for Atomic Claim pre-selection, using the recent ZHAW comparison material, and turn the conclusion into a concrete proposal.
**Files touched:** `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Proposal.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The current extracted `checkWorthiness` field is not strong enough to become the authoritative Atomic Claim pre-selector. Recent ZHAW material consistently points toward explicit triage, not a loose binary scalar: ViClaim uses FCW/FNC/OPN-style separation, CheckThat splits check-worthiness from subjectivity and normalization, and the HAMiSoN synthesis reaches the same conclusion. The spec now encodes a new batched LLM recommendation step that classifies each final Stage 1 candidate as `fact_check_worthy`, `fact_non_check_worthy`, `opinion_or_subjective`, or `unclear`, then ranks within that triage by thesis directness, evidence yield, coverage, and non-redundancy. It also makes one implementation guardrail explicit: do not silently fall back to the extracted `checkWorthiness` field if recommendation fails.
**Open items:** Decide during implementation whether the per-claim `assessments` payload should persist only on the draft or also on the final job for audit. If FactHarbor later wants a smaller specialized classifier for this task, it should first build a FactHarbor-specific labeled evaluation set for claim recommendation rather than directly transferring ViClaim or CheckThat benchmarks.
**Warnings:** Do not retrofit auto-selection onto today's `AtomicClaim.checkWorthiness` enum or any deterministic score fusion. The current live Gate 1 authority already sits in the separate LLM validation path over opinion, specificity, and fidelity, so treating the extraction-time field as authoritative would misstate current behavior. Keep the selector multilingual and generic; avoid English-only cues or topic-specific shortcuts.
**For next agent:** Use [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md) section 8.2 as the implementation baseline. The key repo fact behind this proposal is in [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts): current Gate 1 filtering already depends on the dedicated validation pass, not primarily on `checkWorthiness`, so the new pre-selector should remain a separate batched recommendation module instead of trying to repurpose Gate 1 metadata.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
