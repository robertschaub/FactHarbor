---
roles: [Agents Supervisor]
topics: [ace, governance, telemetry, debt_guard, ownership, supersession]
files_touched:
  - Docs/WIP/2026-04-26_ACE_Readiness_Review_And_Debate.md
  - Docs/WIP/2026-04-26_ACE_Governance_Reaudit_Consolidated.md
  - Docs/AGENTS/Multi_Agent_Collaboration_Rules.md
  - Docs/AGENTS/Policies/Handoff_Protocol.md
  - .claude/skills/debt-guard/SKILL.md
  - scripts/build-index.mjs
  - apps/web/test/unit/lib/build-index.test.ts
  - Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Governance_Stabilization_Decisions.md
  - Docs/AGENTS/Agent_Outputs.md
---

# ACE Governance Stabilization Decisions

## Task

Continue the ACE governance re-audit after Captain accepted the GPT corrections and mildly pushed back on the proposed YAML telemetry block.

## Done

- Added a supersession banner to `Docs/WIP/2026-04-26_ACE_Readiness_Review_And_Debate.md` while preserving the original review body.
- Updated `Docs/WIP/2026-04-26_ACE_Governance_Reaudit_Consolidated.md` so the open questions are resolved decisions.
- Changed the telemetry plan from new governance YAML to first-pass parsing of existing `/debt-guard` Phase 7 fenced blocks.
- Updated `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` ownership footer to Captain owner plus Agents Supervisor maintainer.
- Updated `Docs/AGENTS/Policies/Handoff_Protocol.md` and `.claude/skills/debt-guard/SKILL.md` so bugfix handoffs carry `DEBT-GUARD RESULT` or `DEBT-GUARD COMPACT RESULT` blocks.
- Added passive debt-guard telemetry extraction to `scripts/build-index.mjs`, with regression coverage in `apps/web/test/unit/lib/build-index.test.ts`.
- Verified the parser change with `npm -w apps/web test -- build-index.test.ts`.

## Decisions

- The original ACE review is now an archived-source artifact for context, not the operative cleanup plan.
- First telemetry format is the existing debt-guard result block, not handoff frontmatter or new YAML.
- `build-index.mjs` records debt-guard block presence and simple `Label: value` fields when present, but does not fail, warn, or infer noncompliance from absence.
- Governance ownership is split: Captain owns and approves; Agents Supervisor maintains.

## Warnings

- `Docs/AGENTS/index/handoff-index.json` was not regenerated in this task because the worktree already contains unrelated untracked handoffs/WIP files that would be swept into the generated index. Regenerate from a clean or intentionally staged docs set.
- The passive parser captures one prioritized debt-guard block: final full result first, final compact result second, pre-edit compact block last. Richer multi-block aggregation can wait until real data shows a need.
- This creates a docs/process rule and parser support, not enforcement.

## Learnings

- Start governance telemetry by parsing an existing workflow artifact before inventing new metadata. A stable, observed block shape is better than an aspirational schema for first-pass compliance visibility.

## For next agent

Use `Docs/WIP/2026-04-26_ACE_Governance_Reaudit_Consolidated.md` as current baseline. Next technical slice is to run `npm run index:tier2` from a clean/intentional handoff set so `handoff-index.json` includes passive `governance.debt_guard` data; next governance slice is the reproducible `Multi_Agent_Collaboration_Rules.md` section audit before any restructure.
