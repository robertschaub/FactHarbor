---
name: doc-guard
description: Keep repository documentation lean, clear, and readable. Use automatically before adding a new document, substantially expanding or rewriting Markdown/xWiki content, adding explanatory/background sections, adding FAQs/glossaries/templates, introducing repeated framing, or reviewing a documentation diff for clutter, filler, duplication, over-broad prose, stale links, or readability problems.
---

Bind this workflow to the documents, diff or question in the current authorized task and any explicit invocation arguments (`TASK_ARGUMENTS`). This name is a description, not a client-expanded variable or shell expression; do not guess the active editor file. Skill loading does not expand action, path or writable-state authority. Follow root AGENTS.md and the assigned session profile; return proposals/findings in chat when read-only.


# /doc-guard - keep documentation lean and readable

Apply documentation guardrails to: TASK_ARGUMENTS

## Purpose

Prevent documentation clutter: text, structure, or duplication that makes a
reader work harder without adding durable understanding. This is the
documentation counterpart to code debt guardrails.

Use `/doc-guard` before substantial documentation edits. Use `/docs-update`
afterward when status labels, README/index entries, links, or changelog/backlog
records need to stay in sync.

## Required pre-edit output

For any substantial documentation edit, write this block before editing:

```
DOC-GUARD
Reader: <who needs this document or section>
Need: <the concrete question, decision, or action it serves>
Existing home: <current document/section that should carry it, or N/A>
Chosen option: tighten | amend | merge | move | delete | add
Rejected path and why worse: <the strongest alternative>
Lean test: <what would be removed if it does not serve the need>
Readability check: <status/source/link/structure check>
Docs-update needed after? yes | no
```

Small wording fixes can satisfy this with a one-line note. New documents,
large rewrites, status changes, or public-facing framing changes need the full
block.

## Rules

1. Start from the reader need. Do not add text just because a related idea is
   interesting, true, or recently discussed.
2. Prefer tightening, amending, merging, moving, or deleting before adding a
   new section or document.
3. Keep one authoritative home for each idea. Link rather than repeat unless
   the repetition is needed for standalone comprehension.
4. Cut filler: throat-clearing, generic values language, obvious caveats,
   repeated summaries, placeholder sections, process history, and ornamental
   transitions.
5. Keep claims concrete and sourceable. Avoid broad promises, marketing tone,
   unexplained abstractions, and unsupported certainty.
6. Use headings, tables, and lists only when they improve scanning. Do not add
   structure as decoration.
7. Preserve necessary nuance, including minority interpretations, but make the
   contrast concise and tied to the document's purpose.
8. Before adding a new document, verify that it has a durable audience, a clear
   status if the repo uses status labels, a distinct home in the repository,
   and no better existing target.

## Post-edit reconciliation

Before declaring done, compare the diff against the `DOC-GUARD` block:

- Remove text that did not satisfy the stated reader need.
- Merge or link duplicated explanations.
- Check that headings match the actual content under them.
- Check status labels, links, README/index entries, changelog, backlog, or
  handoff impact where those systems apply.
- Confirm no private, internal, personal, or secret material was introduced.

## Review mode

When asked to review a documentation diff, lead with deletion and
simplification candidates. Flag duplicated ideas, unclear reader need,
over-broad claims, stale links, status-label drift, placeholder sections,
unnecessary background, and any text that reads as persuasion rather than
clear documentation.

## Hard stops

Preserve meaning, sources, obligations and maturity claims while tightening authorized text. Existing authorization for the named edit remains valid. Ask only when needed authority is missing for a substantive normative/maturity change, public retirement/move, private-context use or publication with uncertain sources/licensing. Word-count preservation is not a substitute for semantic preservation.
