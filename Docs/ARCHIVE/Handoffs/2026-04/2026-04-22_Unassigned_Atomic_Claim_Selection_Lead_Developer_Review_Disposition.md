---
roles: [Unassigned]
topics: [atomic_claim_selection, implementation_spec, lead_developer_review, review_disposition]
files_touched:
  - Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md
  - Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Lead_Developer_Review_Disposition.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Lead Developer Review Disposition
**Task:** Apply the Lead Developer implementation review to the ACS v1 spec and close the document-level gaps that would otherwise trip implementation of `ACS-1` and `ACS-CW-1`.
**Files touched:** `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`; `Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Lead_Developer_Review_Disposition.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Accepted the review's structural clarifications rather than redesigning the feature. The ACS spec now defines the true Stage 1 preparation boundary as config load + URL pre-fetch normalization + minimal `CBResearchState` construction + `extractClaims(...)` + contract-preservation check, persists `resolvedInputText` together with `preparedUnderstanding` in a new `PreparedStage1Snapshot`, treats draft-row lifecycle columns as the queryable truth while `DraftStateJson` is the rich-detail store, documents lazy expiry for v1, records `FinalJobId != null` as the recovery/completion witness, and makes the invite-slot warning explicit: draft-time claiming cannot rely on the current jobs-only hourly count in `TryClaimInviteSlotAsync(...)`. The ACS spec and CW design doc now both state that the recommendation contract types must be canonically defined in `apps/web/src/lib/analyzer/types.ts`, with inline interfaces kept documentary only.
**Open items:** This pass did not change code, so the implementation still needs to choose the exact API-side persistence mechanism for draft-time invite usage and the concrete place where canonical recommendation types land in `types.ts`. The provisional single-label recommendation schema also remains subject to later multilingual validation already called out elsewhere in the ACS docs.
**Warnings:** Do not implement prepared-job execution by hydrating only `CBClaimUnderstanding`; the spec now requires `resolvedInputText` persistence specifically to avoid URL re-fetch drift. Do not treat `DraftStateJson` as the lifecycle source of truth for status/progress queries; the row projection is intentionally authoritative there to avoid dual-write ambiguity.
**For next agent:** The implemented review dispositions are concentrated in [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md): queryable-row vs rich-detail split (section 5.6), `PreparedStage1Snapshot` and draft/job persistence (section 6), lazy expiry plus Stage 1 preparation boundary (sections 5.12 and 8.1), prepared-job reconstruction rules (section 8.4), and the implementation/test checklists (sections 11 and 12). The matching single-source-of-truth note for recommendation types is in [2026-04-22_Check_Worthiness_Recommendation_Design.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md).
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
