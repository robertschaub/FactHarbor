---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Workspace Naming Cleanup
**Task:** Remove stale and ambiguous V2 workspace/branch wording from active planning and handoff documents after the canonical workspace rehome.
**Files touched:** `Docs/WIP/*Pipeline_Rebuild*.md`; `Docs/WIP/README.md`; selected active V2 handoffs; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** Current V2 workspace is documented as `C:\DEV\FactHarbor`. Current Git branch is documented separately as `codex/v2-pipeline-rebuild`. Active docs no longer use phrasing that makes the branch name look like part of the filesystem path.
**Open items:** None for the naming cleanup.
**Warnings:** Continue implementation from workspace `C:\DEV\FactHarbor` with Git branch `codex/v2-pipeline-rebuild`. Do not reintroduce path-like wording such as "workspace on branch" in status summaries.
**For next agent:** The cleanup is documentation-only. Rebuild the generated handoff index after any future handoff rename or bulk handoff edit.
**Learnings:** Separate filesystem location and Git branch in human-facing text to avoid misreading Codex UI branch selectors as workspace paths.
