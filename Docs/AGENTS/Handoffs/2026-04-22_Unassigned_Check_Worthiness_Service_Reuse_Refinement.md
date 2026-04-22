---
roles: [Unassigned]
topics: [check_worthiness, service_boundary, atomic_claim_extraction, zhaw, architecture]
files_touched:
  - Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Service_Reuse_Refinement.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Service Reuse Refinement
**Task:** Refine the consolidated check-worthiness design so it records a later internal-service reuse path for Atomic Claim Extraction from Input and makes the ZHAW-aligned worthiness properties more explicit.
**Files touched:** `Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Service_Reuse_Refinement.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The design now states that the ACS recommendation module should be implemented behind an internal reusable service boundary, with ACS draft preparation as the first consumer and later reuse allowed for Atomic Claim Extraction from Input. It also now makes the semantic mapping explicit between FactHarbor's v1 labels and the ZHAW/ViClaim FCW/FNC/OPN categories, while keeping `unclear` as a FactHarbor control state and preserving the current single-primary-label simplification.
**Open items:** This is still a design note, not an implementation. If the service boundary is later implemented, the concrete TypeScript interface and call sites will need their own contract review. If Captain wants stronger ZHAW parity than the current single-label simplification, that would require reopening the taxonomy design and validation plan.
**Warnings:** This does not approve a standalone pre-ACS public service. The reuse path is internal-only and subordinate to the ACS-first rollout. It also does not claim full ViClaim multilabel parity; the doc still keeps FactHarbor v1's simplified contract.
**For next agent:** Reuse the same ACS recommendation logic as an internal service, not as a separate product slice. Preserve the explicit semantic mapping to FCW/FNC/OPN-equivalent properties, keep `unclear` as a FactHarbor control state, and do not let the reuse note blur the approved order of `ACS-1` first and `ACS-CW-1` second.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
