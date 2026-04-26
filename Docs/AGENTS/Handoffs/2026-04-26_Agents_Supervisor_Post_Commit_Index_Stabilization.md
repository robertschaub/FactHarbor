---
roles: [Agents Supervisor]
topics: [ace, governance, post_commit_hook, tracked_index, debt_guard]
files_touched:
  - scripts/git-hooks/post-commit
  - Docs/AGENTS/index/handoff-index.json
  - Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md
  - Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_Post_Commit_Index_Stabilization.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Post-Commit Index Stabilization

## Task

Continue the ACE governance implementation by closing the remaining Phase 1 operational gap: post-commit hook regeneration was still using the default filesystem handoff scan and could re-dirty `handoff-index.json` with unrelated untracked handoffs after a clean tracked-only commit.

## Done

- Updated `scripts/git-hooks/post-commit` so handoff-triggered post-commit rebuilds call `build-index.mjs --tier=2 --tracked-only`.
- Reinstalled local git hooks with `npm run install-hooks` so the current `.git/hooks/post-commit` uses the tracked-only behavior for this commit onward.
- Updated `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md` to record that post-commit now uses tracked-only handoff indexing.
- Regenerated `Docs/AGENTS/index/handoff-index.json` with `npm run index:tier2:tracked`.

## Decisions

- Post-commit uses tracked-only indexing because commits should produce clean generated artifacts that reflect tracked/staged files.
- PostToolUse hook-time indexing remains a filesystem scan because immediate local discoverability of newly written handoffs is still useful during active work.

## Warnings

- `npm run install-hooks` created timestamped backups of the previous local `.git/hooks/post-commit` and `.git/hooks/post-merge`; these backups are local `.git` files and are not committed.
- `Docs/AGENTS/index/stage-manifest.json` and `Docs/AGENTS/index/stage-map.json` still have unrelated generated diffs from prior analyzer state and remain outside this slice.

## Learnings

- Commit-time generated indexes and live-session generated indexes have different needs. Commit-time should be tracked-only; live-session indexing can stay filesystem-based for discoverability.

## For next agent

Phase 1 is now operationally stable: use `npm run index:tier2:tracked` or the post-commit hook for commit-quality handoff indexes. Next governance step remains Captain review of `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md` before any Phase 3 restructure proposal.

```text
DEBT-GUARD COMPACT RESULT
Chosen option: amend post-commit hook to use existing tracked-only index mode
Net mechanism count: unchanged
Verification: safe-local / `npm run install-hooks`; `npm run index:tier2:tracked`; `npm -w apps/web test -- build-index.test.ts`; `git diff --check`
Residual debt: PostToolUse hook intentionally remains filesystem-based for live discoverability
```
