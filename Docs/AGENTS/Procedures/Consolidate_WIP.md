# Consolidate WIP Procedure

When the Captain requests "Consolidate WIP", follow this procedure to clean up `Docs/WIP/`. The goal is to keep WIP lean: only active proposals and in-progress work remain; everything else moves to ARCHIVE or gets absorbed into status docs.

**Prerequisites:** Read `Docs/WIP/README.md`, `Docs/STATUS/Backlog.md`, `Docs/STATUS/Current_Status.md`, and `Docs/ARCHIVE/README_ARCHIVE.md` before starting.

## Step 1: Audit each WIP file

For every file in `Docs/WIP/` (excluding `README.md`):

1. **Read the file** completely.
2. **Cross-check against code and status:**
   - Has the proposed work been implemented? (Check git log, source code, Backlog "Recently Completed")
   - Is the document superseded by a newer document?
   - Are pending items still relevant?
3. **Classify the file** into one of these categories:

| Category | Criteria | Action |
|----------|----------|--------|
| **DONE** | All items implemented; no open decisions remain | Archive (Step 2) |
| **SUPERSEDED** | A newer document or implementation replaces this | Archive (Step 2) |
| **PARTIALLY DONE** | Some items done, some still pending | Update in place (Step 3) |
| **STILL ACTIVE** | Work not started or actively in progress | Keep as-is |
| **STALE** | Not referenced in 3+ months, not blocking any decision | Ask Captain: archive or revive? |

## Step 2: Archive completed files

For each file classified as DONE or SUPERSEDED:

1. **Extract any forward-looking content** (future goals, deferred decisions, open questions) before archiving. Ask the Captain where this content should live:
   - Backlog item → `Docs/STATUS/Backlog.md`
   - Known issue → `Docs/STATUS/KNOWN_ISSUES.md`
   - Architecture note → relevant `Docs/ARCHITECTURE/` or xWiki doc
   - Future research → keep a summary in WIP or add to Backlog "Future Research"
2. **Move the file** to `Docs/ARCHIVE/`.
3. **Update** `Docs/ARCHIVE/README_ARCHIVE.md` with the new file entry.
4. **Update** `Docs/WIP/README.md`: remove the entry and add to "Cleanup History".

## Step 3: Update partially-done files

For each file classified as PARTIALLY DONE:

1. **Mark completed items** with ✅ and a completion date.
2. **Mark remaining items** with their current status (🧭 pending decision, 🔧 in progress, 🔬 research).
3. **Remove obsolete content** (outdated approaches, rejected alternatives).
4. **Update** the file's header status line to reflect current state.

## Step 4: Sync status documents

After processing all WIP files:

1. **Backlog.md**: Ensure "Recently Completed" reflects newly-completed work. Add/remove backlog items as discovered during audit.
2. **Current_Status.md**: Update "Recent Changes" and "Known Issues" if any WIP findings affect them.
3. **WIP/README.md**: Rebuild the "Active Future Proposals" section to match remaining WIP files. Update "Cleanup History" with today's actions.

## Step 5: Report to Captain

Provide a summary:
- Files archived (with reason)
- Files updated (what changed)
- Files kept as-is (confirm still active)
- Content extracted and relocated (what went where)
- Items needing Captain decision (stale files, ambiguous status, content placement)

**Important:** When unsure whether a file is done or where extracted content belongs, **ask the Captain** — don't guess. This procedure is interactive, not autonomous.
