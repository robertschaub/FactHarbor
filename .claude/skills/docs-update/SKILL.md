---
name: docs-update
description: >
  Clean up all documentation files (.md and .xWiki) across the Docs tree. For living documentation
  outside WIP (especially .xWiki specs, architecture, and reference pages), the primary action is
  to UPDATE content to match the current codebase and decisions — not archive it. Only content
  that is clearly and entirely obsolete is moved to the Archive. Partially valid content is always
  updated in place, never lost. Diagrams (Mermaid) are actively verified and updated to reflect
  current architecture.
  For WIP files, the skill archives completed/historical items and syncs the backlog.
  Use this skill whenever the user asks to "clean up docs", "update documentation", "tidy docs",
  "remove obsolete content", "archive stale pages", or anything similar across .md or .xWiki files.
  Note: for WIP-only consolidation with helper-agent investigation, use wip-update instead.
allowed-tools: Bash Read Write Edit
---

# Docs Cleanup

Two distinct workflows apply, depending on where a file lives:

- **Track A — Living docs** (specs, architecture, xWiki pages, reference, org docs outside WIP):
  **Primary action: UPDATE** to match current code and decisions. Archive only what is clearly
  and entirely obsolete. Partially valid content is never lost — it is corrected and kept.

- **Track B — WIP and handoff docs** (`Docs/WIP/`, `Docs/AGENTS/Handoffs/`):
  **Primary action: ARCHIVE** completed/historical material and sync the backlog.

This skill never deletes. Archived files stay on disk for user review before any deletion.

---

## Required reading before starting

Before processing any file, read:
1. `Docs/AGENTS/AGENTS_xWiki.md` — editing workflow, Mermaid syntax in xWiki, xAR handling
2. `Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md` — non-lossy editing rules (GLOBAL-R-016),
   structural integrity guardrails (GLOBAL-R-030), diagram rules (DOC-R-028, DOC-R-029)
3. `Docs/AGENTS/Mermaid_ERD_Quick_Reference.md` — ERD property-name rules (no spaces)
4. `AGENTS.md` (repo root) — terminology cheat sheet and fundamental rules
5. `CLAUDE.md` (repo root) — project snapshot and terminology

If `Docs/ARCHIVE/README_ARCHIVE.md` does not exist yet, continue with an empty baseline and
create it during Step 4 before the first archive entry is appended.

The non-lossy editing contract (GLOBAL-R-016) applies to all Track A files:
**do not shorten, summarize, merge, or remove content unless it is demonstrably obsolete.**
Target ≥98% of the original length unless content is being corrected or pruned for accuracy.

## Cross-tool execution notes

- Shell commands below use Bash syntax (the Claude Code default on this system).
- Non-Claude tools on Windows: translate `find`→`Get-ChildItem`, `mv`→`Move-Item`,
  `mkdir -p`→`New-Item -ItemType Directory -Force`, `grep`→`Select-String`.
- Ignore the YAML frontmatter if your tool does not support Claude skills natively; the body
  of this file is the canonical workflow.

---

## Relationship to consolidate-wip

If `consolidate-wip` ran recently (check `Docs/WIP/README.md` → "Cleanup History"), `Docs/WIP/`
may already be processed. You may skip it here or treat its README as ground truth.

---

## Track A — Living documentation: update-first

### The core question

For every Track A file, the primary question is not "is this historical?" but:
**"Is this accurate today? If not, what needs to be corrected?"**

### Classification decision tree

Work top-to-bottom; stop at the first match:

```
1. Is this file inside Docs/ARCHIVE/ or Docs/xwiki-pages-ARCHIVE/?
   → SKIP — already archived

2. Is this a legal, compliance, CLA, or active external-relations document?
   → KEEP always — living document regardless of age; update only if factually wrong

3. Is every statement in this file accurate as of today's codebase and decisions?
   → KEEP — no change needed

4. Is the file partially outdated (some sections wrong or stale) but the underlying
   subject still exists and is relevant?
   → UPDATE — correct the outdated sections in place; the file stays where it is

5. Is the file entirely about something that no longer exists at all
   (removed feature, abandoned component, superseded architecture with no lessons remaining)?
   AND does it contain nothing forward-looking?
   → ARCHIVE

6. Does the file mix current content with sections about removed/obsolete things?
   → UPDATE + PRUNE — correct the current sections; remove or trim the obsolete ones;
     if the removed sections are non-trivial (>1 paragraph), move them to an _arch file
     in the archive (see archive procedure below) rather than silently deleting them

7. Cannot determine accuracy without deeper investigation?
   → FLAG for user decision; do not modify or archive
```

---

## Entity and type verification

Every document that describes system types, entities, or pipeline stages must be verified
against the current source code — not against the document's own claims.

### Step E1 — Read the authoritative type sources

Before editing any document that mentions types or entities, read:

```text
# Primary type definitions
apps/web/src/lib/analyzer/types.ts

# Terminology rules (forbidden aliases, naming constraints)
AGENTS.md          # "Terminology cheat sheet" section
CLAUDE.md          # "Terminology cheat sheet"
```

These files are the ground truth. Do not rely on the document being updated as a
source of type information — verify everything from the source files above.

### Step E2 — Check each type name mentioned in the document

For every type, interface, or entity name that appears in the document:

```bash
# Does this type still exist?
grep -E "interface <Name>|export type <Name>|export interface <Name>" apps/web/src/lib/analyzer/types.ts

# Has it been renamed or deleted? Look for comments
grep -E "DELETED|renamed|replaced|Phase.*cleanup" apps/web/src/lib/analyzer/types.ts | head -20

# Does this pipeline stage still exist?
ls apps/web/src/lib/analyzer/*-stage.ts
grep "<StageName>" apps/web/src/lib/analyzer/claimboundary-pipeline.ts
```

If a type no longer exists: update all references in the document to use the current
equivalent. Add a `⚠️` annotation noting the change.

If a type was renamed: rename every occurrence in the document, including diagram entity
labels, prose descriptions, and code examples.

### Step E3 — Verify field names and semantics

For each field or property described in the document, read the actual interface definition
and confirm:
- The field name is spelled correctly and still exists
- The described type (`string`, `number`, enum values) is accurate
- The described semantics match the JSDoc comment in the source
- Optional (`?`) vs required markers are correct

If a field was added, removed, or changed: update the document to match.

### Step E4 — Enforce terminology rules from AGENTS.md

After reading `AGENTS.md` and `CLAUDE.md`, scan the document being updated for any
use of forbidden aliases or deprecated names. The terminology rules in those files
are authoritative — apply any corrections they require.

---

## Entity and type verification in diagrams

Every entity box and relationship in a Mermaid (or other) diagram must reflect the current
type structure. For each diagram found during Track A processing:

### Step D1 — Inventory diagram entities

For an `erDiagram`, list all entity names. For a `flowchart` or `sequenceDiagram`, list
all named nodes that correspond to system types or pipeline stages.

### Step D2 — Verify each entity against source code

Use Steps E2–E3 above to verify each entity name and its fields against `types.ts`.

If an entity no longer exists: remove it from the diagram (replace with the current
equivalent, or remove the node and reconnect edges — do not leave orphan nodes).

If an entity was renamed: rename it in the diagram and update all labels and edge references.

### Step D3 — Verify entity fields (for ERDs)

For each entity in an ERD, compare the listed fields to the actual interface in `types.ts`.

Verification checklist per field:
- Does the field name still exist in the interface?
- Is the type correct (`string`, `number`, `boolean`, enum values)?
- Are required vs. optional (`?`) markers correct?
- Have new structurally significant fields been added that the diagram omits? Add them.
  (Do not try to show every field — focus on those important for understanding the model.)

Apply ERD syntax rules while editing (DOC-R-029): `string id_PK`, `number score_0_to_100`.

### Step D4 — Verify relationships

For each relationship edge in an ERD (`||--||`, `}|--|{`, etc.):
- Does the relationship still hold in the current data model?
- Is the cardinality still accurate?
- Does the label still describe the relationship correctly?

For flowchart edges, verify the data/control flow matches the actual pipeline sequence
in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` and the stage files.

### Step D5 — Update diagram

Apply all corrections. Preserve the overall structure and visual style. Annotate:
> `⚠️ _Diagram updated <date>: [brief description of what changed]._`

After editing, perform the ERD self-check: scan every property line in every `erDiagram`
block for spaces between the property name and any descriptor/constraint — replace with
underscores.

---

## Future enhancement sections — grounding rule

Documents often contain "Future Plans", "Planned Enhancements", "Phase N", or "Roadmap"
sections. **Keep all such sections.** They represent forward-looking intent and must not
be archived or removed.

However, future enhancement sections must be **grounded in the current implementation**.
If a future section describes something as if it does not yet exist — when it now does
exist — update the framing:

| Before (wrong framing) | After (correct framing) |
|------------------------|------------------------|
| "Will implement ClaimAssessmentBoundary clustering" | "Extends current ClaimAssessmentBoundary clustering (§8.3) with…" |
| "Planned: source reliability calibration" | "Stage 4.5 source reliability calibration is implemented (confidence_only mode). Future enhancement: bounded_truth_and_confidence mode — see `SourceReliabilityCalibrationMode`." |
| "Future: EvidenceItem probative scoring" | "EvidenceItem.probativeValue (high/medium/low) is implemented since v2.8. Future enhancement: [remaining work]." |
| "Will add Wikipedia integration" | "Wikipedia supplementary lane is implemented (default-off). Future enhancement: [scope of next iteration]." |

**The rule:** A future section should always say "builds on" or "extends" the current
implementation, not imply the current baseline does not exist. Read the source code to
establish what is already built before describing what the "future" adds.

If a future section describes a feature that is now fully implemented with no remaining
open work:
- If the section has no residual forward value: it can be converted to a brief "Implemented"
  note or archived (Track A prune rule applies).
- If it describes the design rationale worth preserving: keep it, update the framing to
  past tense ("was implemented in Phase X"), and add a `⚠️` annotation.

### What "currently implemented" means

When in doubt about implementation status, check the source — do not assume:

```bash
# Is a feature flag or config present?
grep "<feature name>" apps/web/src/lib/analyzer/config.ts

# Is the stage active in the pipeline?
grep -E "<StageName>|<stage-function>" apps/web/src/lib/analyzer/claimboundary-pipeline.ts

# When was something added?
git log --oneline --all --follow -- "apps/web/src/lib/analyzer/<relevant-file>.ts" | head -20

# Is a feature default-on or feature-flagged off?
grep -E "enabled|featureFlag|default.*false|default.*true" apps/web/src/lib/analyzer/config.ts | head -20
```

---

### What "clearly obsolete" means for Track A

A section or page is clearly obsolete only when **all** of the following hold:
- It describes something that no longer exists in any form
- There is no forward-looking content (plans, open questions, envisioned future state)
- Keeping it would actively mislead someone working on current features

When in doubt, annotate rather than remove. A note like:
> `⚠️ _This section describes the pre-Alpha design. Current implementation differs — see [link]._`
is always safer than deleting context.

---

## Track A — Update procedure (step by step)

### Step U1 — Read the full document

Read the file completely before touching it. Understand what it describes, what claims it
makes about the system, and which parts reference code, config, or decisions.

### Step U2 — Cross-check against the current codebase

For each factual claim in the document (a component exists, a file is at a path, a feature
works a certain way, a field has a certain name), verify it:

```bash
# Verify a path still exists
[ -f "apps/web/src/lib/analyzer/claimboundary-pipeline.ts" ] && echo "FOUND" || echo "NOT FOUND"

# Find where a component or concept currently lives
rg -l "ClaimAssessmentBoundary|AtomicClaim" apps -g "*.ts"

# Check recent changes to related source files
git log --oneline --since="60 days ago" -- apps | head -20

# Read a specific source file to verify described behaviour
# (use Read tool on the relevant file)
```

Also cross-check against known decisions:
- `Docs/STATUS/Current_Status.md` — what is live and what is deferred
- `Docs/STATUS/Backlog.md` — open items and recently completed work
- `Docs/WIP/README.md` — active architectural tracks

### Step U3 — Classify each section

After reading and cross-checking, mark each section mentally:

| Section state | Action |
|---------------|--------|
| Accurate | Leave untouched |
| Partially outdated (concept valid, details wrong) | Update the wrong details |
| Describes a removed or replaced thing | Prune or archive (see Step U5) |
| Missing important current information | Add a brief accurate update |
| Unclear / cannot verify | Leave untouched; add UNCERTAIN flag to report |

### Step U4 — Apply updates

Use the Edit tool to apply corrections. Editing rules:

1. **Correct the facts** — fix wrong file paths, renamed types, removed parameters, changed
   behaviour. Be precise; do not rewrite prose style unnecessarily.

2. **Annotate significant changes** — when a section was substantially revised, add a brief
   change note directly below the heading:
   ```
   > ⚠️ _Updated 2026-04-15: [one sentence describing what changed and why]._
   ```
   This preserves the audit trail without requiring a separate changelog.

3. **Add missing context** — if the document omits important current information (a new
   component, a changed API, a recent architectural decision), add it under the most
   appropriate existing heading. Do not create new headings unless necessary.

4. **Never silently delete** — if you believe a passage is wrong, correct it rather than
   removing it. If you are removing something, note it in the Step U5 pruning log.

5. **Preserve structure** — do not reorganise headings, change the document's section order,
   or reformat tables unless the restructure is necessary for correctness.

6. **Non-lossy target** — the updated file should be at least 98% of the original length
   unless specific content is being pruned as clearly obsolete.

### Step U5 — Prune clearly obsolete sections

If a section describes something that no longer exists and has no residual value:

- If the section is brief (≤1 paragraph): delete it and note it in the report.
- If the section is substantial (>1 paragraph): move it to
  `Docs/ARCHIVE/<same-relative-path>/<stem>_arch.md` and add a link at the top of the
  original file:
  ```
  > _Obsolete sections archived to [Docs/ARCHIVE/…/<stem>_arch.md] on 2026-04-15._
  ```

---

## Track A — Diagram handling (Mermaid and xWiki)

Diagrams are first-class documentation. They must be kept accurate and must not be lost.
The goal is: if an architectural diagram is wrong, fix it; do not archive it.

### Reading diagrams

In `.xwiki` files, Mermaid diagrams use the `{{mermaid}}` macro:

```
Text before.

{{mermaid}}
flowchart TD
    A[Pipeline Start] --> B[ClaimBoundary Stage]
    B --> C[AtomicClaim Stage]
{{/mermaid}}

Text after.
```

The empty lines before `{{mermaid}}` and after `{{/mermaid}}` are **mandatory** for rendering.
Do not remove them.

In `.md` files, Mermaid uses standard fenced blocks:
````
```mermaid
flowchart TD
    A --> B
```
````

### Validating a diagram

For each diagram found in a document being updated:

1. **Identify what it depicts** — read the diagram source and the surrounding prose.
2. **Verify against codebase** — does the structure, naming, and flow still match reality?
   Check entity names against the terminology cheat sheet in `CLAUDE.md` and `AGENTS.md`.
3. **Check ERD syntax** (for `erDiagram` diagrams):
   ```bash
   # Find all erDiagram blocks in a file
   grep -n "erDiagram" "<file>"
   ```
   Then inspect each property line. The rule (DOC-R-029):
   - ❌ `string id PK` — space before constraint → will cause "Syntax error in text"
   - ✅ `string id_PK` — underscore connects name and constraint
   - ❌ `number score 0_to_100` — space before descriptor
   - ✅ `number score_0_to_100` — underscore throughout

### Updating a diagram

If a diagram is partially outdated (e.g., a renamed stage, a removed node, a new component):

1. **Update the diagram source** — correct node labels, edge labels, and relationships.
2. **Do not remove the diagram** because it is outdated — update it.
3. **Preserve diagram style** — do not switch from `flowchart` to `sequenceDiagram` or change
   the overall layout unless the content genuinely requires it.
4. **Add an annotation** in the surrounding prose if the change is significant:
   > `⚠️ _Diagram updated 2026-04-15: added [new component]; removed [old stage]._`

### Creating a missing diagram

If a document clearly describes an architectural concept that would benefit from a diagram
(e.g., a pipeline, a data flow, a state machine) but currently has none, you may propose
adding one. Do not add it autonomously — note it in the Step R report as:
> "Diagram opportunity: [description of what to add and where]"

### Mermaid rules to enforce (from DOC-R-028 and DOC-R-029)

When writing or editing any Mermaid diagram in `.xwiki` files:

| Rule | Detail |
|------|--------|
| Macro wrapper | `{{mermaid}}...{{/mermaid}}` — never `{{code language="mermaid"}}` |
| Empty lines | Mandatory blank line BEFORE `{{mermaid}}` and AFTER `{{/mermaid}}` |
| Node IDs | No spaces — use camelCase or underscores: `claimStage` not `claim stage` |
| Labels with special chars | Wrap in double quotes: `A["Step 1: Init"]` |
| Edge labels with special chars | Wrap in quotes: `A -->|"O(1)"|B` |
| ERD properties | No spaces between name and descriptor: `string id_PK` not `string id PK` |
| ERD constraints | All parts connected by underscores: `number score_0_to_100` |

After editing a Mermaid diagram, do a quick self-check: look at every property definition line
in any `erDiagram` block and confirm there are no spaces between the property name and any
descriptor or constraint.

### Diagram pages in xWiki

Diagrams in `Docs/xwiki-pages/` often live in dedicated wrapper pages under
`…/Diagrams/<DiagramName>/WebHome.xwiki`, included in other pages via
`{{include reference="…"/}}`. When a diagram page is updated:

- Update only the diagram source in its own `WebHome.xwiki`.
- Do not modify the including page unless its prose description also needs updating.
- Never archive a diagram page just because it seems old — verify whether it is still
  included somewhere, then update or flag it.

---

## Track B — WIP and handoff docs: archive-first

### Classification

| Category | Criteria | Action |
|----------|----------|--------|
| **STILL ACTIVE** | Current phase/charter, open investigation, active proposal | Keep as-is |
| **DONE / HISTORICAL** | All items implemented; pure past-event narrative; no open follow-on | Archive |
| **MIXED** | Historical narrative + still-open items or future-relevant analysis | Split |
| **STALE** | Old, unreferenced, ambiguous status | Flag for user decision |

Before archiving any Track B file, extract forward-looking content (open questions, deferred
items, future goals) into `Docs/STATUS/Backlog.md`.

`Docs/AGENTS/Handoffs/` files are almost always DONE/HISTORICAL. Always check the "Next"
section — if it contains open actions not yet in the backlog, extract them first.

---

## Archive folder locations

| File type | Source root | Archive root |
|-----------|-------------|-------------|
| `.md` | `Docs/` | `Docs/ARCHIVE/` |
| `.xwiki` | `Docs/xwiki-pages/` | `Docs/xwiki-pages-ARCHIVE/` |

Preserve the relative path inside the archive:
- `Docs/WIP/old_plan.md` → `Docs/ARCHIVE/WIP/old_plan.md`
- `Docs/xwiki-pages/FactHarbor/Product Development/Planning/OldPage/WebHome.xwiki` →
  `Docs/xwiki-pages-ARCHIVE/FactHarbor/Product Development/Planning/OldPage/WebHome.xwiki`

---

## Step 1 — Scope the work

```bash
# All .md files (exclude archives, node_modules, tool config, build output)
find Docs -name "*.md" \
  -not -path "*/ARCHIVE/*" \
  -not -path "*/xwiki-pages-ARCHIVE/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/.claude/*" \
  -not -path "*/.next/*" \
  | sort

# All .xwiki files (active pages only)
find Docs/xwiki-pages -name "*.xwiki" | sort
```

Group by top-level subdirectory. Assign each group to Track A or Track B.
Process one group at a time; confirm with the user between groups if total > 100 files.

**Track A groups:** `Docs/xwiki-pages/`, `Docs/STATUS/`, `Docs/ARCHITECTURE/`,
`Docs/Knowledge/`, `Docs/Specification/`, `Docs/Legal/`, `Docs/DEVELOPMENT/`,
`Docs/USER_GUIDES/`, `Docs/MARKETING/`, `Docs/security/`

**Track B groups:** `Docs/WIP/`, `Docs/AGENTS/Handoffs/`

---

## Step 2 — Execute: Track A (update)

For each Track A file, follow the update procedure (Steps U1–U5) above.
Process files with diagrams with extra care — read, verify, update, validate ERD syntax.

Archiving a xWiki page (pure ARCHIVE):
```bash
mkdir -p "Docs/xwiki-pages-ARCHIVE/<same-relative-path>"
mv "Docs/xwiki-pages/<path>/WebHome.xwiki" "Docs/xwiki-pages-ARCHIVE/<path>/WebHome.xwiki"
# Leave _attachments/ in place for user review
```

For a split (UPDATE + PRUNE), write the obsolete sections to:
`Docs/xwiki-pages-ARCHIVE/<parent-path>/<PageName>_arch/WebHome.xwiki`

---

## Step 3 — Execute: Track B (archive)

### Pure ARCHIVE
```bash
mkdir -p "Docs/ARCHIVE/<relative-path-to-parent>"
mv "Docs/<path>/filename.md" "Docs/ARCHIVE/<path>/filename.md"
```

### SPLIT
1. Write the keep content back to the original path.
2. Write the historical content to `Docs/ARCHIVE/<path>/<stem>_arch.md`.
3. Add at the top of the kept file:
   `> _Historical detail moved to [Docs/ARCHIVE/…/<stem>_arch.md] on <YYYY-MM-DD>._`
4. Add a header to the `_arch` file:
   `> _Archived from [Docs/…/<original>] on <YYYY-MM-DD>._`

**Naming collision:** if `<stem>_arch.md` already exists, use `<stem>_arch_2.md`.

---

## Step 4 — Update index and status files

After each directory group:

- If `Docs/ARCHIVE/README_ARCHIVE.md` does not exist yet, create it first with:
  ```markdown
  # Archive Index

  Generated by documentation cleanup workflows. Append new archive entries below.

  ---
  ```
- Append newly archived files to `Docs/ARCHIVE/README_ARCHIVE.md`.
- If `Docs/WIP/README.md` references any archived file, remove the reference and note
  it in "Cleanup History".

After all groups are complete, update the two status documents:

**`Docs/STATUS/Backlog.md`**
- Add any new open items surfaced during Track A updates (corrections that revealed a
  gap or unresolved decision, missing documentation that should be written, etc.).
- Add items extracted from archived Track B files (forward-looking content that was
  present before archiving).
- Move items to "Recently Completed" for any features or work confirmed as implemented
  during entity/type verification.
- Remove items that are now demonstrably irrelevant or fully superseded.

**`Docs/STATUS/Current_Status.md`**
- Update "Recent Changes" to reflect any newly confirmed implemented features discovered
  during the entity/type verification pass.
- Update "Known Issues" if any document corrections surfaced an issue not already listed.
- Correct any factual claim in Current_Status.md itself that the Track A verification
  revealed to be outdated.

---

## Step 4b — Rebuild agent indexes

After all Track A and Track B operations are complete, rebuild the agent indexes
so subsequent sessions see the current document corpus:

```
node scripts/build-index.mjs --tier=2
```

If any `apps/web/src/lib/analyzer/` files were updated during Track A, also run:

```
node scripts/build-index.mjs --tier=1
```

If `scripts/build-index.mjs` does not exist yet, skip and note it in the report.

---

## Step 5 — Report

```
## Docs Cleanup Summary

### Track A — Updated (N files)
- Docs/xwiki-pages/.../WebHome.xwiki
  Updated: [what was corrected; one line per change]
  Entities/types fixed: [deleted types replaced, field names corrected, semantics updated]
  Future sections reframed: [sections updated to "extends current X" language]
  Diagrams: [updated / validated-correct / ERD syntax fixed / issue found]

### Track A — Obsolete sections pruned (N files)
- Docs/path/file.md — [what was removed/archived and where it went]

### Track A — No changes needed (N files)
- [count only, or brief note if non-obvious]

### Track B — Archived (N files)
- Docs/path/file.md → Docs/ARCHIVE/path/file.md — [reason]

### Track B — Split (N files)
- Docs/path/file.md — current content kept; historical →
  Docs/ARCHIVE/path/file_arch.md — [what moved]

### Diagram findings
- [file] — Diagram updated: [what changed]
- [file] — ERD syntax fixed: [what was wrong]
- [file] — Diagram opportunity noted: [description]

### Flagged for your decision (N)
- Docs/path/file.md — [why uncertain; what you need from the user]

### Backlog additions (N)
- [item], source: [file]

### Backlog items moved to Recently Completed (N)
- [item] — confirmed implemented via [source file / commit]

### Current_Status.md changes
- [what was updated and why]
```

Remind the user: **archived files remain on disk for review before any deletion.**
