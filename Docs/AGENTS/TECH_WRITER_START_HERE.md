# Tech Writer Start Here - Documentation Maintenance

**For: AI agents taking over documentation work on FactHarbor**
**Last Updated**: 2026-02-08

---

## Mission

Maintain and extend FactHarbor's documentation across two formats:
1. **xWiki 2.1 files** (`.xwiki`) — single source of truth, stored in git
2. **Markdown files** (`.md`) — supplementary docs (status, backlog, architecture notes)

The initial consolidation into xWiki is **complete**. Your role is **ongoing maintenance and updates**.

---

## Your Access & Capabilities

**You ARE an AI agent in VS Code with:**
- Full read/write access to `c:\DEV\FactHarbor`
- Can read, edit, create, delete local files
- Can run Python scripts and git commands
- Can preview xWiki pages locally (see below)

**You CANNOT:**
- Access the xWiki web interface (project lead handles imports/exports)

---

## Documentation Structure

### xWiki Pages (Single Source of Truth)

```
Docs/xwiki-pages/
├── FactHarbor/                    (main documentation tree)
│   ├── Specification/             (Requirements, Architecture, Diagrams)
│   ├── Roadmap/                   (Implementation plans, guidance)
│   ├── Organisation/              (Governance, processes, policies)
│   ├── FH Analysis Reports/       (Analysis results)
│   ├── User Guides/               (Getting started, admin, LLM config)
│   ├── License and Disclaimer/
│   └── WebHome.xwiki              (Root page)
│
├── scripts/                       (Conversion tools)
│   ├── xar_to_xwiki_tree.py      (XAR → .xwiki tree)
│   ├── xwiki_tree_to_xar.py      (.xwiki tree → XAR)
│   └── WORKFLOW.md                (Detailed workflow reference)
│
├── View.cmd                       (Local WYSIWYG viewer)
└── README.md                      (Overview and workflow)
```

**File format:** `.xwiki` files contain **pure xWiki 2.1 syntax** — headings with `= Title =`, bold with `**text**`, italic with `//text//`, links with `[[Label>>Space.Page]]`.

### Markdown Docs (Supplementary)

```
Docs/
├── STATUS/              (Current status, backlog, history, known issues)
├── WIP/                 (Active design proposals and future work)
├── ARCHITECTURE/        (Architecture notes not yet in xWiki)
├── AGENTS/              (Multi-agent collaboration rules, THIS FILE)
├── DEVELOPMENT/         (Coding guidelines, testing strategy)
├── USER_GUIDES/         (UCM guides)
├── MIGRATION/           (v2-to-v3 migration guide)
├── REFERENCE/           (Terminology, metrics schema, LLM mapping)
├── ARCHIVE/             (Historical .md content — read-only)
├── ARCHIVE-xwiki/       (Historical .xwiki content — read-only)
├── BACKLOG.md           (Development backlog P1-P3)
└── CHANGELOG.md         (Release changelog)
```

---

## Essential Documents to Read First

| Document | Purpose |
|----------|---------|
| `/AGENTS.md` | Fundamental coding rules, terminology, architecture |
| `/Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` | Multi-agent roles and workflow |
| `/Docs/STATUS/Current_Status.md` | Current implementation status |
| `/Docs/xwiki-pages/README.md` | xWiki tree structure and workflow |
| `/Docs/xwiki-pages/scripts/WORKFLOW.md` | Conversion tool reference |

---

## Key Rules

### Format Authority
- **xWiki pages** are the authoritative source for: architecture, specifications, user guides, reference material
- **Markdown files** are authoritative for: status tracking, backlog, WIP proposals, agent collaboration rules
- **Never duplicate** content across both formats — each topic lives in ONE place

### Terminology (CRITICAL)
- **AnalysisContext** = Top-level bounded analytical frame (NOT "scope")
- **EvidenceScope** = Per-evidence source metadata (NOT "context")
- See AGENTS.md for the full terminology reference

### Generic by Design
- No domain-specific examples in prompts or documentation
- Use abstract examples: "Entity A", "Process X" — not real names

---

## Common Workflows

### Editing xWiki Pages

1. Edit `.xwiki` files directly in `Docs/xwiki-pages/FactHarbor/`
2. Preview locally: run `Docs\xwiki-pages\View.cmd`
3. Commit changes to git
4. Notify project lead when XAR export is needed

### Converting XAR ↔ xWiki Tree

```bash
# Project lead provides .xar file → convert to .xwiki tree
cd Docs/xwiki-pages/scripts
python xar_to_xwiki_tree.py ../path/to/export.xar

# After editing → convert back to .xar for import
python xwiki_tree_to_xar.py ../
```

Full reference: `Docs/xwiki-pages/scripts/WORKFLOW.md`

### Archiving Documentation

- Move historical .md files to `Docs/ARCHIVE/` (preserving sub-tree structure)
- Move historical .xwiki files to `Docs/ARCHIVE-xwiki/` (preserving sub-tree structure)
- Update any cross-references that pointed to the moved file
- Update `Docs/WIP/README.md` if a WIP file was archived

---

## What You ARE Authorized To Do

- Read all files in `Docs/`
- Edit `.xwiki` files directly (pure xWiki 2.1 syntax)
- Edit `.md` documentation files
- Run conversion scripts
- Create, reorganize, and archive documentation
- Fix formatting, links, and terminology
- Commit changes to git (local only)

## Ask Project Lead Before

- Deleting content that seems important but unclear
- Making decisions about technical accuracy
- Changing official terminology
- Pushing to remote or creating PRs
- Any operation involving the xWiki web interface

---

## xWiki 2.1 Quick Syntax Reference

```
= Heading 1 =
== Heading 2 ==
=== Heading 3 ===

**bold**  //italic//  ##inline code##

* Bullet list
** Nested bullet

1. Numbered list
1. Second item (always use "1.")

[[Link Label>>Space.Page.WebHome]]
[[External Link>>https://example.com]]

|=Header 1|=Header 2|
|Cell 1|Cell 2|

{{code language="typescript"}}
const x = 1;
{{/code}}

{{mermaid}}
graph TD
  A --> B
{{/mermaid}}
```

**No metadata headers** — pageId, parent, title are derived from file paths.

---

**Maintained by**: Development Team
**Review frequency**: Update when documentation structure changes
