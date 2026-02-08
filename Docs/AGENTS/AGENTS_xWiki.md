# AGENTS.md - xWiki Documentation Work

## Purpose

This file directs AI coding agents working on FactHarbor xWiki documentation.

---

## Required Reading

Before working on xWiki content, agents MUST read and follow:

1. **[GlobalMasterKnowledge_for_xWiki.md](GlobalMasterKnowledge_for_xWiki.md)** (same folder)
   - Core rules and constraints (GLOBAL-R-*)
   - Document handling rules (DOC-R-*)
   - Diagram rules (Mermaid preferred)

2. **[Docs/xwiki-pages/README.md](../xwiki-pages/README.md)** (master documentation)
   - Directory structure, workflow, file format
   - Metadata derivation rules

---

## Workflow: Direct .xwiki Editing

Agents edit `.xwiki` files directly — no conversion needed.

### Edit Pages

```bash
# Edit any page (pure xWiki 2.1 syntax)
code Docs/xwiki-pages/FactHarbor/Specification/Architecture/WebHome.xwiki
code Docs/xwiki-pages/FactHarbor/Organisation/Governance/WebHome.xwiki

# Commit changes
git add Docs/xwiki-pages/
git commit -m "docs: update architecture and governance"
```

### Preview Locally (WYSIWYG)

```bash
# Double-click or run:
Docs\xwiki-pages\View.cmd
```

### Export to XAR (for xWiki import)

```bash
# From repo root — pass xwiki-pages as base, NOT FactHarbor
python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar
```

### Import from XAR (from xWiki export)

```bash
# From repo root
python Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py exported.xar --output Docs/xwiki-pages
```

---

## xWiki Mermaid Syntax

**Critical:** Empty lines required before AND after the mermaid block!

```
Text before diagram.

{{mermaid}}
flowchart TD
    A[Start] --> B[Process]
{{/mermaid}}

Text after diagram.
```

Do NOT use `{{code language="mermaid"}}` — it doesn't work.

**ERD Diagrams:** See **[Mermaid_ERD_Quick_Reference.md](Mermaid_ERD_Quick_Reference.md)** for critical syntax rules.

---

## Key Rules Summary

- Edit `.xwiki` files directly — no JSON conversion needed
- Mermaid preferred for new diagrams (DOC-R-028)
- No changes without explicit request (GLOBAL-R-017)
- Preserve xWiki markup exactly (GLOBAL-R-030)
- Commit frequently to git for version control

---

## File Locations

| Path | Purpose |
|------|---------|
| `Docs/xwiki-pages/FactHarbor/` | Master documentation tree (137 pages) |
| `Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py` | XAR → .xwiki tree |
| `Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py` | .xwiki tree → XAR |
| `Docs/xwiki-pages/scripts/WORKFLOW.md` | Detailed workflow reference |
| `Docs/xwiki-export/` | Dated XAR snapshots |

---

## Metadata Derivation (How Scripts Work)

The conversion scripts derive pageId, parent, and title from file paths:

- **WebHome pages**: Title = parent directory name (e.g., `FactHarbor/Specification/WebHome.xwiki` → title "Specification")
- **Non-WebHome pages**: Title = first xWiki heading (`= Title =`)
- **Escaped dots**: Directory names with dots (e.g., `Architecture Analysis 1.Jan.26`) are escaped in pageIds as `\.`

See [Docs/xwiki-pages/README.md](../xwiki-pages/README.md) for full derivation table.

---

**Last Updated:** 2026-02-08
