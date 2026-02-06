# xWiki Pages - Master Documentation Source

**This directory contains the MASTER source for all FactHarbor documentation.**

## Overview

- **Format:** `.xwiki` files containing pure xWiki 2.1 syntax
- **Version Control:** All files are tracked in git
- **Editing:** AI agents edit these files directly
- **Structure:** Folder tree mirrors xWiki page hierarchy

## File Structure

```
xwiki-pages/
├── FactHarbor/
│   ├── WebHome.xwiki              (Home page)
│   ├── Specification/
│   │   ├── WebHome.xwiki          (Specification overview)
│   │   ├── Architecture.xwiki     (Architecture page)
│   │   ├── Diagrams/
│   │   │   ├── WebHome.xwiki
│   │   │   └── ...
│   │   └── ...
│   ├── Roadmap/
│   └── ...
└── ...
```

## File Format

Each `.xwiki` file contains **pure xWiki 2.1 syntax** - exactly what you would paste into the xWiki page editor.

**Example:** `FactHarbor/Specification/WebHome.xwiki`
```xwiki
= Specification =

This is the **specification** for FactHarbor.

== Architecture ==

The system uses a modular architecture...

{{mermaid}}
graph TD
  A --> B
{{/mermaid}}
```

**No metadata headers** - pageId, parent, and title are derived from file path.

## Metadata Derivation

| File Path | Derived Metadata |
|-----------|------------------|
| **File:** `FactHarbor/Specification/WebHome.xwiki` | |
| - pageId: | `FactHarbor.Specification.WebHome` |
| - parent: | `FactHarbor.WebHome` |
| - title: | Extracted from first heading |
| - syntax: | `xwiki/2.1` |

## Workflow

### For AI Agents (Direct Editing)

**Edit .xwiki files directly:**
```bash
# Open and edit any .xwiki file
code Docs/xwiki-pages/FactHarbor/Specification/WebHome.xwiki

# Commit changes to git
git add Docs/xwiki-pages/
git commit -m "docs: update specification"
```

**Export to XAR (for xWiki import):**
```bash
cd Docs/xwiki-export
python xwiki_tree_to_xar.py ../xwiki-pages/ --output FactHarbor_Updated.xar
```

### For Project Lead (xWiki Sync)

**Import from xWiki:**
```bash
# 1. Export XAR from xWiki (Administration → Export)
# 2. Convert to .xwiki tree:
cd Docs/xwiki-export
python xar_to_xwiki_tree.py FactHarbor_Export.xar --output ../xwiki-pages/
```

**Export to xWiki:**
```bash
# 1. Convert .xwiki tree to XAR:
cd Docs/xwiki-export
python xwiki_tree_to_xar.py ../xwiki-pages/ --output FactHarbor_Updated.xar

# 2. Import XAR to xWiki (Administration → Import)
```

## Benefits of This Approach

✅ **Git-native:** All documentation version controlled as plain text
✅ **Direct editing:** No conversion needed for editing
✅ **Copy-paste ready:** Content can be pasted directly into xWiki editor
✅ **AI-friendly:** Agents can read and edit without conversion overhead
✅ **Human-readable:** Plain xWiki 2.1 syntax with Markdown-like simplicity
✅ **Lossless sync:** Full round-trip to/from xWiki with all metadata preserved

## xWiki 2.1 Syntax Reference

**Common syntax elements:**

| Element | xWiki Syntax | Preview |
|---------|--------------|---------|
| Heading 1 | `= Title =` | <h1>Title</h1> |
| Heading 2 | `== Subtitle ==` | <h2>Subtitle</h2> |
| Bold | `**bold**` | **bold** |
| Italic | `//italic//` | *italic* |
| Link | `[[url>>text]]` | [text](url) |
| Code inline | `##code##` | `code` |
| Code block | `{{{code}}}` | ```code``` |
| Mermaid | `{{mermaid}}...{{/mermaid}}` | Diagram |

**Full reference:** See [Docs/xwiki-export/WORKFLOW.md](../xwiki-export/WORKFLOW.md)

## Viewer Options

**For human readers:**

1. **xWiki itself** - Import XAR to xWiki instance for full WYSIWYG viewing
2. **VS Code with extension** - Install xWiki syntax highlighter
3. **GitHub rendering** - GitHub renders .xwiki files as plain text (limited formatting)

## Maintenance

**This directory is the MASTER:**
- All documentation changes should be made here
- Changes are committed to git for version control
- XAR files are generated from this source for xWiki import
- xWiki is synchronized periodically via XAR import/export

---

**Last Updated:** 2026-02-06
**Total Pages:** 108
**Format:** xWiki 2.1
