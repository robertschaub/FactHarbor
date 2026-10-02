---
name: docs-update
description: >
  Reconcile the requested Markdown documentation scope; expand to the whole Docs tree
  only when requested. Update living specifications, architecture and reference pages
  against current code and decisions. Preserve partially valid material, open work,
  sources and operative rules. Verify diagrams and reconcile links, navigation, status
  and backlog. Use for documentation cleanup, updates and retirement reviews.
  For WIP-only consolidation with bounded investigation, use wip-update.
allowed-tools: Bash Read Write Edit
---

Resolve source, discovery and durable output locations from the current task or a verified adopted workspace profile before using the public paths below. Working handoffs, full investigations and unpublished prototypes default to that assigned non-public home; existing public implementation and clearly public task records stay public. Query assigned private discovery as well as relevant public history; an empty public index is not evidence of closure or no prior work. Missing access is a stated gap, not authority to recreate the collection publicly. The handoff protocol governs preservation, pending records and persistence status. For historical/WIP/output steps, the Handoff Protocol source-and-output rule governs collection substitution and index metadata; never put private record names or summaries in a public index.

Bind this workflow to the documents, diff or question in the current authorized task and any explicit invocation arguments (`TASK_ARGUMENTS`). This name is a description, not a client-expanded variable or shell expression; do not guess the active editor file. Skill loading does not expand action, path or writable-state authority. Follow root AGENTS.md and the assigned session profile; return proposals/findings in chat when read-only.

# Documentation reconciliation

Read root AGENTS.md, applicable nested instructions, the selected documents and relevant surrounding context. Use `/doc-guard` before substantial edits. [Documentation guidance](../../../Docs/DEVELOPMENT/Documentation.md) covers authoring, preservation, links and preview commands. Read the active client adapter only when its behavior matters.

## Scope and classification

Use `rg --files Docs -g '*.md'` within the authorized scope. Do not broaden a focused task into a whole-tree cleanup. If recent WIP consolidation covers the same files, inspect its evidence before repeating it.

| State | Action |
|---|---|
| Accurate living reference | Leave unchanged |
| Partially outdated, subject still relevant | Correct the affected parts in place |
| Legal, compliance or active external-relations document | Preserve; factual or obligation changes require task scope and appropriate review |
| Active investigation, approved phase or open proposal | Preserve its current authority and open work |
| Completed or historical, no current reference value | Propose retirement within the task's preservation scope |
| Mixed historical and current material | Keep current meaning and open work; handle historical detail through the authorized preservation procedure |
| Stale or unverified | Report uncertainty; do not infer obsolescence from age |

Living documentation is update-first. A passage is clearly obsolete only if its subject no longer exists, it contains no forward-looking value and keeping it would mislead current work. When uncertain, retain it with a concise status qualification. Routine cleanup does not authorize deletion or create additional history collections, destination catalogs or relocation notices.

## Verify implementation claims

For types and entities, inspect relevant source definitions, starting with `apps/web/src/lib/analyzer/types.ts` for analysis types. Apply AGENTS.md terminology rules. Confirm each changed name, field, type, optional marker and described meaning. Search current source for exact locations; navigation indexes are aids, not proof.

For stages and control flow, inspect `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` and relevant stage implementations. For configuration, inspect authoritative file-backed defaults and schema definitions. Distinguish implemented, default-on, default-off and proposed behavior.

Check decisions and status against `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md` and the relevant active task record. A format-only task preserves meaning; do not silently turn it into architectural revision. Report a discovered behavior discrepancy separately unless its correction is in scope.

## Edit living content

1. Read enough source and surrounding prose to understand each affected claim. Read the full file when the change depends on its complete structure.
2. Leave accurate passages unchanged. Correct wrong paths, names or factual claims precisely; avoid unrelated rewriting.
3. Preserve meaning, obligations, qualifications, sources and useful history. Authorized tightening may remove repetition without a word-count floor. Explain substantive removals and their basis in the review.
4. Keep heading order and table structure unless correctness requires a change. Add a short status or change note when readers need it, without routine change banners.
5. Preserve future intent, open questions and deferred decisions. If a proposed feature is already implemented, describe what exists and what remains. Keep useful design rationale with its historical status.
6. Before retiring a mixed or completed record, carry every current obligation and open item into an appropriate living reference or backlog entry. Verify preservation and references under the assigned task before removal. If preservation authority or destination is missing, retain the file and report the missing scope.

Do not refresh dates, inputs, examples or measurements merely to make a document appear current. Existing investigation STOP rules, exact analysis inputs, quality requirements and execution authority remain controlling.

## Verify diagrams

Read each affected diagram with surrounding prose. Check entity names, important fields, relationship cardinality, flow order and conditions against relevant source or explicitly proposed design. Do not imply that planned architecture is implemented.

Update a partially outdated diagram in place. Preserve useful structure and visual style. Reconnect edges when removing a replaced node, and check that no meaningful condition or entity becomes orphaned. Show structurally important fields rather than every implementation detail.

Shared figures have one `.mmd` source and a corresponding SVG referenced from Markdown. Update both together and inspect the rendering. Use the configured renderer to validate syntax; do not substitute an unverified style rule for parsing. Keep identifiers stable, quote labels with punctuation and preserve legends. Inspect desktop and narrow layouts, including full-size access to dense figures.

Propose a missing diagram when it would clarify a concrete concept; add it only if the current task covers that work.

## Reconcile navigation and status

- Update affected Markdown links, website navigation and current instructions in the same change.
- Preserve authoritative public setup, contribution, licensing, policy and implementation-contract guidance.
- For WIP and handoff retirement, inspect next actions and unresolved decisions before classification. Use `/wip-update` for the bounded WIP procedure.
- Add genuinely open work to the backlog; mark work complete only when source or a verified decision supports that conclusion.
- Update `Current_Status.md` and relevant indexes only where the task changes their facts. Do not rewrite unrelated history.

Only the designated integrator rebuilds necessary indexes in the assigned worktree. Inspect effective Git hooks and outputs first; avoid duplicate rebuilding. Handoff changes use `node scripts/build-index.mjs --tier=2`; analyzer source changes use `--tier=1`. Ordinary documentation edits alone do not require either. Limit index inputs to tracked public sources. Workers and read-only reviewers report required updates in chat.

## Verify and report

Choose focused checks for the actual change: preservation, links, diagrams, navigation and relevant tooling. Site changes require the strict documentation build. Documentation work does not authorize live analysis, provider spending, service changes or deployment.

Report what changed and why, preservation evidence, checks, remaining uncertainties and concrete decisions needed. Separate confirmed implementation facts from proposals. Keep detailed preservation records within the task's authorized output scope.
