---
name: wip-update
description: >
  Consolidate all documentation in Docs/WIP/. Investigates implementation status of WIP topics
  using helper agents when the tool supports delegation, ensures all open items are well-described
  and present in the backlog, updates and cleans up backlog and status files, and moves
  historical/completed content to the Archive.
  Use this skill whenever the user says "consolidate WIP", "clean up WIP", "tidy WIP docs",
  "audit WIP", or asks to update the backlog from WIP — even if phrased differently.
  Note: this skill covers Docs/WIP/ only. To clean up the entire Docs/ tree use docs-update.
allowed-tools: Bash Read Write Edit
---

# Consolidate WIP

This skill audits `Docs/WIP/`, reconciles each file against the codebase and backlog, dispatches
helper agents to investigate ambiguous implementation status when the active tool supports
delegation, and leaves the workspace in a clean state: active work is well-described, completed
or historical content is archived, and the three status documents are up to date.

---

## Before you begin

Read these five files in full before touching anything:

1. `Docs/WIP/README.md` — current active-file registry and cleanup history
2. `Docs/STATUS/Backlog.md` — current backlog items
3. `Docs/STATUS/Current_Status.md` — live system status and recent changes
4. `Docs/ARCHIVE/README_ARCHIVE.md` — archive naming rules and entry format
5. `Docs/AGENTS/Procedures/Consolidate_WIP.md` — base procedure (this skill extends it)

The base procedure gives the underlying classification mechanics. This skill extends it with
(a) explicit "mixed content" splitting rules, (b) tightly-scoped helper-agent dispatch, and
(c) a mandatory backlog sync pass.

## Cross-tool execution notes

- Shell commands below use Bash syntax (the Claude Code default on this system).
- Non-Claude tools on Windows: translate `find`→`Get-ChildItem`, `ls`→`Get-ChildItem`.
- If your tool supports delegation or helper agents, use that capability in Step 3. If not,
  perform the same investigation yourself with the provided checklist.
- Ignore the YAML frontmatter if your tool does not support Claude skills natively; the body
  of this file is the canonical workflow.

---

## Step 1 — Snapshot the WIP directory

```bash
find Docs/WIP -maxdepth 1 -name "*.md" ! -name "README.md" | sort
```

This is your work-list. Do not process `README.md`.

---

## Step 2 — Classify each file

Read each file fully, then apply this table in top-to-bottom priority order — the first
matching row wins:

| Category | Criteria |
|----------|----------|
| **STILL ACTIVE** | Dated today or within 7 days; OR explicitly flagged as the current active phase/charter; OR part of a named open workstream |
| **DONE** | Every item bears ✅ or "SHIPPED/IMPLEMENTED" marker; OR a commit hash confirms the work landed and no follow-up tasks remain |
| **SUPERSEDED** | A newer document explicitly replaces this one; OR the same topic is now fully covered in a spec/arch doc or xWiki page |
| **PARTIALLY DONE** | Some items have ✅ / commit confirmation; other items are clearly still open |
| **HISTORICAL** | Pure investigation report, meeting note, QA batch run, or one-off analysis — no forward-looking action items whatsoever |
| **STALE** | Dated 3+ months ago; not referenced in README active sections; no open items blocking current work |

**Classification sources to consult (in order):**

1. The file itself — completion markers, phase labels, explicit "REVERTED / PARKED / APPROVED"
2. `git log --oneline --all -- <source files named in the doc>` — verify whether related code landed
3. `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` → "Recently Completed" section
4. Helper-agent or self investigation for genuinely ambiguous files (Step 3)

**Do not delegate Step 3 for:**
- STILL ACTIVE files (obvious from date/phase label)
- HISTORICAL files (no implementation claim to verify)
- STALE files (age is the criterion, not implementation status)

---

## Step 3 — Helper-agent investigation for ambiguous files

Use this only when Steps 2-1/2/3 leave classification genuinely unclear — typically when a
file describes a fix or design whose code you cannot confirm from git log alone. If the active
tool does not support helper agents, perform the same checklist yourself and record the result.

### Delegation rule

Group related files before dispatching. Maximum 5 helper-agent tasks per run. If more than 5
files are ambiguous, process the most important ones first and note the rest as "pending
investigation" in your Step 6 report. If no helper-agent capability exists, use the same
batching guidance for your own sequential investigation.

### Investigation brief (use this template verbatim when delegating)

```
You are a code-investigation agent for the FactHarbor project.

Task: Determine the implementation status of the work described in <FILE_NAME>.

Key claim in the file: "<one-sentence description of the design/fix/feature>"

Steps:
1. Run: git log --oneline --all -- <list of source files or patterns if known>
2. Read the most relevant recent commits (last 30 days) touching those files.
3. If no relevant file is obvious, search: rg -l "<key identifier from the doc>" apps -g "*.ts" -g "*.cs"
4. Read Docs/STATUS/Current_Status.md, section "Recent Changes".

Return exactly this structure:
STATUS: implemented | partial | not-implemented | cannot-determine
EVIDENCE: <commit hash(es) or file:line refs, or "none found">
OPEN_ITEMS: <list any still-open decisions or follow-up tasks mentioned in the file, or "none">
```

If no helper agent is available, use the same structure for your own notes.

Use the helper investigation's `STATUS` and `OPEN_ITEMS` to finalize the classification:
- `implemented` + no OPEN_ITEMS → DONE
- `implemented` + OPEN_ITEMS present → PARTIALLY DONE (keep open items)
- `partial` → PARTIALLY DONE
- `not-implemented` + file is recent → STILL ACTIVE
- `not-implemented` + file is old → STALE
- `cannot-determine` → flag as UNCERTAIN in Step 6 report; do not archive

---

## Step 4 — Act on each classification

### DONE / SUPERSEDED / HISTORICAL → Archive

Before moving the file, answer two questions:

**Q1: Does this file contain any forward-looking content?**
Forward-looking content = open questions, deferred items, future goals, "future work" sections,
known issues not yet fixed, or unresolved decisions.

If yes: extract each item and add it to `Docs/STATUS/Backlog.md` under the most appropriate
section (use "Future Research" if unsure). Note the source file in the backlog item description.

**Q2: Is the file mixed — does it contain both archivable historical content AND current/future
content worth preserving in place?**

A file is **mixed** when it passes *both* of these tests:
- It has at least one section that is purely historical narrative (past events, completed work,
  old investigation results with no ongoing relevance)
- AND it also has at least one section that is forward-looking or provides active reference value
  (open decisions, future plans, architectural context still used today)

A file is **NOT mixed** just because it happens to describe completed work — completion
descriptions are historical and can be archived whole.

**If mixed:** Split the file:
1. Write the current/forward-looking content back to the original path (trimmed version).
2. Write the historical content to `Docs/ARCHIVE/<same-relative-path>/<stem>_arch.md`.
3. Add this note at the top of the trimmed original:
   `> _Historical detail moved to [Docs/ARCHIVE/…/<stem>_arch.md]._`

**If not mixed:** Move the whole file to `Docs/ARCHIVE/` preserving the relative path under
`Docs/WIP/` (i.e., flat into `Docs/ARCHIVE/` since WIP is already one level deep).

After archiving:
- Update `Docs/ARCHIVE/README_ARCHIVE.md` with the new entry.
- Remove the entry from `Docs/WIP/README.md`; add a line to "Cleanup History".

### PARTIALLY DONE → Update in place

1. Mark each completed item with ✅ and the completion date or commit hash.
2. Mark remaining items: 🧭 pending decision · 🔧 in progress · 🔬 research needed.
3. Remove obsolete content (rejected approaches, outdated alternatives).
4. Update the file's header status line.
5. For each remaining open item, verify it appears in `Docs/STATUS/Backlog.md`. Add it if missing.

### STILL ACTIVE → Keep as-is

Confirm the file is listed correctly in `Docs/WIP/README.md`. If it is missing from README,
add it to the appropriate section.

### STALE → Flag, do not archive

Include in the Step 6 report. Ask the user: archive or revive? Do not move the file autonomously.

### UNCERTAIN → Flag, do not archive

Include in the Step 6 report with the helper investigation evidence (or lack of it). Ask for guidance.

---

## Step 5 — Sync status documents

After all individual files are processed, update these three documents:

**`Docs/STATUS/Backlog.md`**
- Add all extracted forward-looking items (from Step 4 Q1).
- Move items to "Recently Completed" for every file newly classified DONE.
- Remove items that are now demonstrably irrelevant.
- Verify: every open WIP item should have a matching backlog entry. Add any that are missing.

**`Docs/STATUS/Current_Status.md`**
- Update "Recent Changes" if any newly-archived WIP marks a completed milestone.
- Update "Known Issues" if any WIP surfaces an issue not already listed.

**`Docs/WIP/README.md`**
- Rebuild the "Currently Active" and "Active Future Proposals" sections to exactly match the
  files that remain.
- Add a new row to "Cleanup History": date, consolidation number (increment from last row),
  files archived count, files remaining count.

---

## Step 5b — Rebuild agent indexes

After all archiving and status document updates are complete, rebuild the handoff index
so agents in subsequent sessions see the current corpus:

```
node scripts/build-index.mjs --tier=2
```

If `scripts/build-index.mjs` does not exist yet, skip this step and note it in the report.

---

## Step 6 — Report to user

```
## WIP Consolidation Summary

### Archived — N files
- <filename> → ARCHIVE — [reason: DONE / SUPERSEDED / HISTORICAL]

### Split — N files
- <filename> (current part kept) + <filename>_arch.md → ARCHIVE — [what was split out]

### Updated in place (PARTIALLY DONE) — N files
- <filename> — [what was marked done; what remains open]

### Kept as-is (STILL ACTIVE) — N files
- <filename> — [brief confirmation]

### Backlog changes
- Added: [new items with source file]
- Moved to Recently Completed: [items]

### Needs your decision — N files
- <filename> — STALE since [date]. [One-sentence summary.] Archive or revive?
- <filename> — UNCERTAIN. [What the helper investigation found / didn't find.] How should I classify this?
```

When in doubt about classification or where extracted content belongs, ask — do not guess.
