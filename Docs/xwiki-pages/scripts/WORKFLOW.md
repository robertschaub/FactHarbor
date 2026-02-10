# xWiki ↔ .xwiki Tree Conversion Workflow

**New simplified workflow using `.xwiki` files as master source.**

## Overview

**Master source:** `Docs/xwiki-pages/` - Git-tracked `.xwiki` files
**Conversion:** One-step commands for XAR ↔ .xwiki tree
**Editing:** AI agents edit `.xwiki` files directly (no conversion needed)

## Quick Start

### Import from xWiki → .xwiki tree

```bash
# Convert XAR to .xwiki tree (from repo root)
python Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py FactHarbor_Export.xar --output Docs/xwiki-pages

# Result: Docs/xwiki-pages/FactHarbor/.../*.xwiki
```

### Edit .xwiki files directly

```bash
# Open any file and edit
code Docs/xwiki-pages/FactHarbor/Product Development/Specification/WebHome.xwiki

# Commit to git
git add Docs/xwiki-pages/
git commit -m "docs: update specification"
```

### Export to xWiki → XAR

```bash
# Convert .xwiki tree to XAR (from repo root, pass xwiki-pages as base, NOT FactHarbor)
python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar

# Result: FactHarbor.xar (ready for import to xWiki)
```

---

## Tools

### xar_to_xwiki_tree.py - Import from xWiki

**Extract pages from XAR and save as .xwiki files.**

```bash
# Basic usage (from repo root)
python Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py input.xar --output Docs/xwiki-pages

# Example
python Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py FactHarbor_Export.xar --output Docs/xwiki-pages
```

**Output:**
```
Docs/xwiki-pages/
└── FactHarbor/
    ├── WebHome.xwiki
    ├── Specification/
    │   ├── WebHome.xwiki
    │   ├── Architecture.xwiki
    │   └── ...
    └── ...
```

### xwiki_tree_to_xar.py - Export to xWiki

**Package .xwiki files into importable XAR.**

```bash
# Basic usage (from repo root, pass xwiki-pages as base, NOT FactHarbor)
python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar

# With dated output for archiving
python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output Docs/xwiki-export/FactHarbor_08.Feb.26.xar
```

**Important:** Always pass `Docs/xwiki-pages` (the parent of `FactHarbor/`) as the base directory so page IDs get the correct `FactHarbor.` prefix.

**Output:**
```
FactHarbor.xar (ready to import: xWiki → Administration → Import)
```

---

## File Format

### .xwiki Files

**Pure xWiki 2.1 syntax - copy-paste ready for xWiki editor.**

**Example:** `FactHarbor/Product Development/Specification/WebHome.xwiki`
```xwiki
= Specification =

This is the **specification** for FactHarbor.

== Architecture ==

The system architecture consists of:

* Frontend (Next.js)
* Backend (Node.js/Express)
* Database (SQLite)

{{mermaid}}
graph TD
  A[Frontend] --> B[API]
  B --> C[Database]
{{/mermaid}}
```

**No metadata headers!** PageId, parent, title derived from file path.

### Metadata Derivation

| File Path | PageId | Parent | Title |
|-----------|--------|--------|-------|
| `FactHarbor/WebHome.xwiki` | `FactHarbor.WebHome` | `None` (root) | `FactHarbor` (dir name) |
| `FactHarbor/Product Development/Specification/WebHome.xwiki` | `FactHarbor.Product Development.Specification.WebHome` | `FactHarbor.WebHome` | `Specification` (dir name) |
| `FactHarbor/Product Development/Specification/Architecture.xwiki` | `FactHarbor.Product Development.Specification.Architecture` | `FactHarbor.Product Development.Specification.WebHome` | From first heading |

**Parent derivation:**
- **WebHome pages**: Go up two levels (skip self + space name), append `.WebHome`
  - `FactHarbor.Product Development.Specification.WebHome` → parent: `FactHarbor.WebHome`
  - `FactHarbor.WebHome` → parent: `None` (root)
- **Non-WebHome pages**: Remove last component, append `.WebHome`
  - `FactHarbor.Product Development.Specification.Architecture` → parent: `FactHarbor.Product Development.Specification.WebHome`

**Title derivation:**
- **WebHome pages**: Title = parent directory name (space name in xWiki)
  - `FactHarbor/Product Development/Specification/WebHome.xwiki` → title: "Specification"
- **Non-WebHome pages**: First xWiki heading (`= Title =`), fallback to filename
- Escaped dots in directory names are unescaped: `Architecture Analysis 1.Jan.26` → title as-is

---

## xWiki 2.1 Syntax Reference

### Headers

```xwiki
= Header 1 =
== Header 2 ==
=== Header 3 ===
==== Header 4 ====
===== Header 5 =====
====== Header 6 ======
```

### Text Formatting

```xwiki
**bold**
//italic//
__underline__
--strike--
##code##
```

### Links

```xwiki
[[Page Name>>Space.Page]]          Internal link
[[http://example.com>>Link Text]]  External link
[[image.png>>attach:image.png]]    Attachment link
```

### Lists

```xwiki
* Bullet item
** Nested item
*** Deep nested item

1. Numbered item
11. Nested numbered
111. Deep nested
```

### Code Blocks

```xwiki
{{{
Code block
Multi-line code
}}}

{{{javascript}}}
const x = 42;
console.log(x);
{{{/javascript}}}
```

### Mermaid Diagrams

```xwiki
{{mermaid}}
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action 1]
  B -->|No| D[Action 2]
{{/mermaid}}
```

**Important:** Mermaid diagrams must have empty lines before and after in the .xwiki file.

### Tables

```xwiki
|= Header 1 |= Header 2 |= Header 3
| Cell 1    | Cell 2    | Cell 3
| Cell 4    | Cell 5    | Cell 6
```

### Macros

```xwiki
{{info}}
This is an info box.
{{/info}}

{{warning}}
This is a warning box.
{{/warning}}

{{error}}
This is an error box.
{{/error}}
```

---

## Complete Workflow Examples

### Scenario 1: Initial Import from xWiki

**You have:** xWiki instance with documentation
**You want:** Git-tracked `.xwiki` files

```bash
# 1. Export from xWiki (Web UI)
# xWiki → Administration → Export → Select all pages → Download XAR

# 2. Convert to .xwiki tree (from repo root)
python Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py ~/Downloads/FactHarbor_Export.xar --output Docs/xwiki-pages

# 3. Review and commit
git add Docs/xwiki-pages/
git commit -m "docs: initial import from xWiki"
```

### Scenario 2: AI Agent Updates Documentation

**You have:** `.xwiki` files in `Docs/xwiki-pages/`
**You want:** Edit documentation directly

```bash
# 1. Open and edit files
code Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture.xwiki

# 2. Make changes (pure xWiki syntax)
# = Architecture =
#
# Updated content here...

# 3. Commit changes
git add Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture.xwiki
git commit -m "docs: update architecture documentation"

# 4. Export to XAR (optional - for xWiki sync, from repo root)
python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output FactHarbor_Updated.xar

# 5. Import to xWiki (Web UI)
# xWiki → Administration → Import → Select FactHarbor_Updated.xar
```

### Scenario 3: Human Views Documentation

**Option A: Local WYSIWYG viewer**
```bash
# Double-click or run from project root:
Docs\xwiki-pages\View.cmd
```

**Option B: View in xWiki**
```bash
# 1. Generate XAR (from repo root)
python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar

# 2. Import to local xWiki instance
# xWiki → Administration → Import

# 3. Browse with full WYSIWYG rendering
```

**Option C: View as plain text**
```bash
# Open in VS Code
code Docs/xwiki-pages/FactHarbor/Product Development/Specification/WebHome.xwiki
```

### Scenario 4: Consolidate Documentation

**You have:** Scattered docs in `Docs/WIP/`, `Docs/STATUS/`, etc.
**You want:** Everything in `.xwiki` format

```bash
# 1. Create/edit .xwiki files directly
cd Docs/xwiki-pages/FactHarbor

# 2. Add new page
mkdir -p "Implementation/Status Reports"
cat > "Implementation/Status Reports/2026-02-06.xwiki" <<'EOF'
= Status Report 2026-02-06 =

== Progress ==

* Completed XAR workflow implementation
* Created .xwiki master source system

== Next Steps ==

* Documentation consolidation
* Testing with AI agents
EOF

# 3. Move old content to archive
mv Docs/WIP/old-status.md Docs/ARCHIVE/

# 4. Commit consolidated structure
git add Docs/xwiki-pages/
git add Docs/ARCHIVE/
git commit -m "docs: consolidate status reports into xWiki structure"
```

---

## Best Practices

### For AI Agents

✅ **Edit .xwiki files directly** - No conversion needed
✅ **Use pure xWiki 2.1 syntax** - Check reference above
✅ **Test Mermaid diagrams** - Ensure empty lines before/after
✅ **Commit frequently** - Version control is active
✅ **Generate XAR when done** - For project lead to import to xWiki

### For Project Lead

✅ **Import changes to xWiki regularly** - Keep web UI in sync
✅ **Export from xWiki occasionally** - Capture any manual edits in xWiki
✅ **Review git diffs** - .xwiki files are plain text and diffable
✅ **Archive old XAR snapshots** - Keep dated XAR files for rollback

### Version Control

✅ **Track all .xwiki files** - Full history in git
✅ **Track dated XAR snapshots** - Major milestones only
✅ **Ignore intermediate files** - Already in .gitignore
✅ **Use descriptive commit messages** - "docs: update X" not "changes"

---

## Troubleshooting

### Empty .xwiki files created

**Problem:** Some pages have no content
**Cause:** Original xWiki pages were empty
**Solution:** Delete empty .xwiki files or add content

### XAR import fails in xWiki

**Problem:** Import shows errors
**Cause:** Invalid xWiki syntax or missing parent pages
**Solution:** Check .xwiki files for syntax errors, ensure parent pages exist

### Title not extracted correctly

**Problem:** Page title doesn't match expectation
**Cause:** No heading in .xwiki file
**Solution:** Add first heading: `= Page Title =`

### Mermaid diagram doesn't render

**Problem:** Diagram shows as text in xWiki
**Cause:** Missing empty lines or syntax error
**Solution:** Ensure empty lines before/after `{{mermaid}}` block

---

## Migration from Old Workflow

**Old workflow (4 scripts):**
```bash
python xar_to_json.py input.xar
python json_to_md_tree.py input_fulltree.json
python md_tree_to_json.py input_md/
python json_to_xar.py input_fulltree_updated.json
```

**New workflow (2 scripts, run from repo root):**
```bash
python Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py input.xar --output Docs/xwiki-pages
python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar
```

**Benefits:**
- ✅ Simpler (2 commands vs 4)
- ✅ Faster (no Markdown conversion)
- ✅ Direct editing (agents work with native format)
- ✅ Copy-paste ready (can paste directly into xWiki editor)

---

**Last Updated:** 2026-02-08
**Version:** 2.1 (Updated paths, title derivation for WebHome pages)
