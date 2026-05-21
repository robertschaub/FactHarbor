### 2026-04-04 | Senior Developer | Codex (GPT-5) | Refresh Provenance Doc Labels And Index
**Task:** Update the provenance WIP documentation so the active design is indexed correctly and the standalone GPT review prompt is clearly marked as historical review input.
**Files touched:** `Docs/WIP/README.md`, `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md`, `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added the provenance design to the WIP index under future analyzer proposals, labeled the GPT prompt file as historical review input rather than the active plan, and removed one drifting implementation-specific line-count detail from the revised design doc while preserving its technical direction.
**Open items:** None beyond any future substantive design changes to the provenance proposal itself.
**Warnings:** The standalone GPT review prompt still contains superseded proposal content by design; the new label reduces confusion but does not rewrite that historical prompt.
**For next agent:** Treat `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md` as the current plan and `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md` as review history only.
**Learnings:** no