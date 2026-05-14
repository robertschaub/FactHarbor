---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Worktree Rehome
**Task:** Rehome active V2 pipeline rebuild work from `C:\DEV\FactHarbor-pipeline-rebuild-spec` to canonical workspace `C:\DEV\FactHarbor`, while preserving the prior canonical workspace state separately.
**Files touched:** `Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Worktree_Rehome.md`; `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** `C:\DEV\FactHarbor` is now the active V2 workspace on `codex/pipeline-rebuild-spec`. The previous canonical workspace state was preserved on branch/worktree `codex/main-before-v2-rehome` at `C:\DEV\FactHarbor-main-before-v2-rehome`, including commit `31b3ea90` for the daily bug scan note that had been dirty on `main`. The old V2 worktree was detached, verified clean, and removed from Git worktree registration before the branch was checked out at the canonical path.
**Open items:** The legacy directory `C:\DEV\FactHarbor-pipeline-rebuild-spec` was emptied and is no longer a Git worktree, but Windows still holds the root directory handle open. Remove that empty directory once the lock is gone.
**Warnings:** Do not continue V2 work from `C:\DEV\FactHarbor-pipeline-rebuild-spec`; it is not a repository/worktree anymore. Continue V2 implementation and documentation from `C:\DEV\FactHarbor`.
**For next agent:** Active V2 pipeline rebuild work is in `C:\DEV\FactHarbor` on branch `codex/pipeline-rebuild-spec`. Prior main-state work is preserved at `C:\DEV\FactHarbor-main-before-v2-rehome` on branch `codex/main-before-v2-rehome` at `31b3ea90`.
**Learnings:** Not appended; this was a workspace placement change, not a reusable role learning.
