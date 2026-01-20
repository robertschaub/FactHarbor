# AGENTS.md - xWiki Documentation Work

## Purpose

This file directs AI coding agents working on FactHarbor xWiki documentation.

---

## Required Reading

Before working on xWiki content, agents MUST read and follow:

1. **[GlobalMasterKnowledge_for_xWiki.md](GlobalMasterKnowledge_for_xWiki.md)** (same folder)
   - Core rules and constraints (GLOBAL-R-*)
   - Document handling rules (DOC-R-*)
   - Diagram rules (Draw.io, Mermaid, PlantUML)
   - Cursor workflow rules (GLOBAL-R-034 to R-036)

2. **[InitializeFHchat_for_xWiki.md](InitializeFHchat_for_xWiki.md)** (same folder)
   - Workflow overview
   - Cursor IDE xar-to-xar workflow
   - Export commands and versioning

---

## Cursor Workflow (xar-to-xar)

1. User drops .xar in `Docs/xWiki-work/`
2. Agent extracts internally (to JSON)
3. Agent makes requested edits to JSON content
4. User says "Export" → Agent saves versioned .xar in same folder

### Export Commands
- `"Export"` or `"Export delta"` → Changed pages only
- `"Export full"` → Complete corpus

### Viewing Pages
- `"Show page <pageId>"` → Display as rendered Markdown (WYSIWYG-like)
- `"Show raw page <pageId>"` → Display raw xWiki 2.1 markup

### Markdown Conversion Commands
- `"Import MD <filepath> as page <pageId>"` → Convert .md to xWiki and add to corpus
- `"Export page <pageId> as MD"` → Convert xWiki page to standard .md file

**Mermaid conversion:** Automatically handled in both directions:
- MD ` ```mermaid ` ↔ xWiki `{{mermaid}}` (with required empty lines)

### Versioning
- Auto-increment patch on each export: 0.9.70 → 0.9.71
- Exception: delta then full with no changes between = same version

---

## xWiki Mermaid Syntax

**Critical:** Empty lines required before AND after the mermaid block!

Example:
```
Text before diagram.

{{mermaid}}
flowchart TD
    A[Start] --> B[Process]
{{/mermaid}}

Text after diagram.
```

Do NOT use `{{code language="mermaid"}}` – it doesn't work.

---

## Key Rules Summary

- Mermaid preferred for new diagrams (DOC-R-028)
- No changes without explicit request (GLOBAL-R-017)
- Preserve xWiki markup exactly (GLOBAL-R-030)
- Delta-only exports by default (GLOBAL-R-015)
- Auto-version on export (GLOBAL-R-035)

---

## File Locations

| Path | Purpose |
|------|---------|
| `Docs/xWiki-work/` | Input/output folder for .xar files |
| `scripts xWiki/xwiki_xar_to_fulltree_generic.py` | xar → JSON |
| `scripts xWiki/xwiki_fulltree_to_xar_ROBUST.py` | JSON → xar |
