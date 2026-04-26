# ACE Governance Implementation Plan

**Status:** READY_FOR_IMPLEMENTATION
**Created:** 2026-04-26
**Last Updated:** 2026-04-26
**Author Role:** Agents Supervisor

---

## Context

This plan operationalizes `Docs/WIP/2026-04-26_ACE_Governance_Reaudit_Consolidated.md` after Captain accepted the GPT re-audit corrections.

The governing decision is `MODIFY`: improve the agent governance system now, but start with stabilization, passive telemetry, and reproducible audit before any broad restructuring or archival.

## Scope

In scope:

- Preserve the original ACE review with a supersession banner.
- Keep the consolidated re-audit as the operative planning baseline.
- Capture initial `/debt-guard` telemetry from existing Phase 7 result blocks.
- Resolve `Multi_Agent_Collaboration_Rules.md` ownership metadata.
- Produce a reproducible audit before restructuring collaboration rules.
- Defer Agent Evaluator and broad YAML governance metadata until real telemetry exists.

Out of scope for the first implementation wave:

- Moving or deleting sections from `Multi_Agent_Collaboration_Rules.md`.
- Archiving formal workflow material based only on citation counts.
- Adding enforcement gates for missing debt-guard blocks.
- Scheduling a recurring Agent Evaluator.

## Current Baseline

The stabilization slice is implemented in the working tree:

- Original ACE review has a supersession banner.
- Consolidated re-audit records accepted corrections and resolved decisions.
- `Multi_Agent_Collaboration_Rules.md` footer now names Robert Schaub / Captain as owner and Agents Supervisor as maintainer.
- `Handoff_Protocol.md` and `/debt-guard` require bugfix handoffs to include `DEBT-GUARD RESULT` or `DEBT-GUARD COMPACT RESULT`.
- `scripts/build-index.mjs` passively parses the first prioritized debt-guard result block into `governance.debt_guard`.
- `apps/web/test/unit/lib/build-index.test.ts` covers full-result extraction and final-result priority over pre-edit compact blocks.

Verification already run:

- `npm -w apps/web test -- build-index.test.ts` -> passed.
- `git diff --check` -> passed.

Implementation progress:

- Phase 0 committed as `ab559315 docs(agents): stabilize ACE governance plan`.
- Phase 1 implemented a tracked-only handoff-index mode, regenerated `handoff-index.json` without unrelated untracked handoffs, and updated the post-commit hook to use tracked-only handoff indexing.
- Phase 2 produced `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md`.

## Implementation Sequence

### Phase 0 - Commit Stabilization Baseline

Goal: capture the accepted corrections and passive parser support as a clean checkpoint.

Tasks:

- Commit only the ACE governance files, debt-guard/handoff protocol updates, parser changes, focused test, and relevant handoffs.
- Exclude unrelated untracked WIP/handoff files.
- Exclude dirty generated index files unless they are intentionally regenerated from a clean file set.

Acceptance criteria:

- Commit exists with scoped files only.
- `git show --stat` does not include unrelated generated index churn or unrelated WIP artifacts.

### Phase 1 - Clean Passive Telemetry Index

Goal: rebuild `handoff-index.json` once the handoff directory state is intentional.

Tasks:

- Decide whether the existing unrelated untracked handoff/WIP files should be staged, archived, or left out.
- Run `npm run index:tier2` from that clean/intentional state.
- Inspect several generated entries that contain debt-guard result blocks.
- Confirm generated `governance.debt_guard` fields are useful enough for sampling.

Acceptance criteria:

- `Docs/AGENTS/index/handoff-index.json` includes passive `governance.debt_guard` data where result blocks exist.
- No enforcement, warning, or failure behavior is added.
- Generated index diff is reviewed for unrelated file sweep-in before commit.

Status: implemented with `node scripts/build-index.mjs --tier=2 --tracked-only` and root script `npm run index:tier2:tracked`. The generated index excludes unrelated untracked handoff files, and `scripts/git-hooks/post-commit` now uses tracked-only handoff indexing after commits. The current run has no older tracked handoff with a final debt-guard result block, so telemetry field presence is proven by parser tests and appears once a tracked handoff contains a result block.

### Phase 2 - Reproducible Collaboration Rules Audit

Goal: replace the informal 44% dead-weight claim with a reproducible audit artifact.

Create:

- `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md`

Required audit fields:

- Commit hash and date.
- Corpus file list.
- Exact search patterns and commands.
- Section inventory with line ranges.
- Classification per section: `live`, `duplicate`, `load-on-demand reference`, `dormant`, `obsolete`, or `owner-conflict`.
- False-positive notes, especially for internalized protocols like hub-and-spoke.
- Proposed destination for each section.

Acceptance criteria:

- Every proposed move/delete/archive action cites section-level evidence.
- Citation absence is not treated as proof of dead weight by itself.
- The audit distinguishes "rare but useful reference" from "obsolete".

Status: initial audit created at `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md`; pending Captain review.

### Phase 3 - Collaboration Rules Restructure Proposal

Goal: prepare a Captain-reviewable restructure plan, not directly rewrite the rules yet.

Tasks:

- Use the Phase 2 audit to propose a compact routing shape for `Multi_Agent_Collaboration_Rules.md`.
- Identify procedure docs that should receive long-form material, such as multi-agent investigation templates.
- Mark each proposed destination as `keep inline`, `move to procedure`, `move to policy`, `archive`, or `delete`.
- Include exact rollback path if the restructure harms agent behavior.

Acceptance criteria:

- Captain can approve, reject, or modify each section movement independently.
- No section is moved before approval unless it is clearly metadata-only.

### Phase 4 - Approved Rules Edit

Goal: perform the approved restructure with minimal behavior drift.

Tasks:

- Edit `Multi_Agent_Collaboration_Rules.md` into a concise routing document.
- Move long procedures/templates only to approved destination files.
- Add load-on-demand pointers where material is preserved outside the main rules file.
- Run `npm run index:tier2` if handoffs or indexed docs are moved.

Acceptance criteria:

- No authoritative rule is lost.
- Cross-references resolve.
- Agents can still find role registry, workflow pointers, model guidance, WIP protocol, and handoff protocol quickly.

### Phase 5 - Telemetry Review And Optional Evaluator

Goal: decide whether automation is needed after observing real data.

Tasks:

- After 2-4 weeks of handoffs, sample `governance.debt_guard` coverage.
- Classify missing blocks as true noncompliance, non-bugfix task, old handoff, or parser miss.
- Only if recurring true gaps remain, propose an Agent Evaluator routine.

Acceptance criteria:

- Agent Evaluator decision is based on observed telemetry, not literature framing alone.
- Any evaluator has a narrow checklist and explicit false-positive handling.

## Risks And Controls

| Risk | Control |
|---|---|
| Generated index sweeps unrelated local files into a commit | Regenerate only after cleaning or intentionally staging handoff/WIP state. |
| Telemetry becomes premature enforcement | Keep parser passive until sample review. |
| Useful low-frequency procedures get archived | Require section-level audit and Captain approval before moves. |
| Governance docs become heavier instead of leaner | Prefer pointers and load-on-demand procedures over duplicating rules. |
| Agent Evaluator adds recurring overhead without evidence | Defer until telemetry shows recurring gaps. |

## Open Decisions

Captain review is needed before Phase 3 restructure proposal becomes an edit plan. Phase 1 no longer requires cleaning unrelated untracked files when `--tracked-only` is used. Post-commit uses tracked-only indexing; PostToolUse hook-time indexing still scans the filesystem for immediate local discoverability.

## Done Criteria

This implementation track is complete when:

- Stabilization baseline is committed.
- Passive debt-guard telemetry is present in the handoff index from a clean regeneration.
- The collaboration rules audit is reproducible and reviewed.
- Any approved restructure is performed from the audit, not from the old 44% estimate.
- Agent Evaluator is either explicitly deferred again or scoped from observed telemetry.
