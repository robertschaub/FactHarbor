---
roles: [Unassigned]
topics: [atomic_claim_selection, check_worthiness, review_followup, recommendation_methodology]
files_touched:
  - Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Review_Followup.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Check-Worthiness Review Follow-up
**Task:** Apply the review findings on the Atomic Claim Selection check-worthiness proposal and tighten the implementation spec accordingly.
**Files touched:** `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Review_Followup.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Corrected the spec’s reading of current Gate 1 so it now matches code: Gate 1 filters on failed opinion+specificity and grounded low-specificity claims, while fidelity is telemetry-only there. Kept the core conclusion that `AtomicClaim.checkWorthiness` is advisory-only. Reframed the four-label recommendation schema as a provisional FactHarbor v1 simplification inspired by ZHAW material rather than a direct transfer from ViClaim/CheckThat. Made the separate post-Gate-1 batched recommendation call explicit and justified it on contract/audit grounds. Closed the persistence gap by requiring the full recommendation snapshot, including per-claim assessments, to live on the draft and be copied into `ClaimSelectionJson` on the final job.
**Open items:** The schema is still provisional. If multilingual validation shows unstable behavior or mixed fact-plus-opinion cases are too common for one primary label, the next design step should revisit whether the recommendation output becomes multi-label or orthogonal instead of single-label.
**Warnings:** Do not re-describe the current selector as “based on opinion, specificity, and fidelity” unless the code changes again; that wording is now known to be inaccurate. Do not treat the provisional four-label contract as externally validated research truth; the review specifically narrowed it to a FactHarbor v1 product choice. Keep any future implementation aligned with the persisted audit snapshot requirement, or the job-page provenance panel will drift from the draft-time recommendation.
**For next agent:** The corrected baseline is [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md). Focus on sections 2, 6.2-6.4, 8.2, and 12.5. If implementation starts, preserve the new contract split: Gate 1 remains filtering authority, while the post-Gate-1 recommendation call is a separate ranking/audit surface over the exact final candidate set.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
