---
roles: [Unassigned]
topics: [acs, claim_selection, draft_slowness, observability, stage1, challenger]
files_touched:
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Draft_Slowness_Challenger_Position.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Draft Slowness Challenger Position
**Task:** Evaluate the proposed first implementation slice for ACS claim-selection dialog slowness from the Challenger side and recommend a better first patch.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Draft_Slowness_Challenger_Position.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Rejected the proposed first slice as the wrong shape, not because draft observability is unnecessary, but because a row-level `LastEventMessage` column plus more progress percentages spends schema/migration effort on ephemeral UI detail without producing the most actionable breakdown. The recommended replacement is a no-schema first slice that persists a structured `observability` block inside `DraftStateJson` and returns a derived public projection with `phaseCode`, `phaseLabel`, `eventMessage`, elapsed/timing fields, and coarse Stage 1 vs recommendation timings. This better matches ACS spec section 5.6 (`Queryable row truth plus one rich payload per layer`) and directly instruments the proven hot seam around `prepareStage1Snapshot(...)`.
**Open items:** No production/post-patch timings exist yet, so the ordering judgment is grounded in code structure rather than measured latency. If this alternative lands, the next decision should be driven by the first real timing breakdown: Stage 1 plateau branch cost, recommendation cost, or UI transport lag.
**Warnings:** The repo already has active ACS work; this handoff assumes that new draft observability can be added without reworking unrelated ACS payloads. It also assumes `UpdatedUtc` is sufficient freshness metadata for the waiting UI unless later UX testing proves a dedicated event timestamp is necessary.
**For next agent:** The critical code anchors are `apps/web/src/lib/internal-runner-queue.ts` (`runDraftPreparationBackground(...)` and `prepareStage1Snapshot(...)` call site), `apps/web/src/lib/analyzer/claim-extraction-stage.ts` (contract validation / retry / repair progress plateau), `apps/web/src/app/analyze/select/[draftId]/page.tsx` (polling UI), `apps/api/Services/ClaimSelectionDraftService.cs` (currently drops `eventMessage`), and the ACS spec at `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md` section 5.6 for row-vs-payload authority.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
