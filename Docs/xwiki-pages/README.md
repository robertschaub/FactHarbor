# xWiki Pages - Master Documentation Source

**This directory contains the MASTER source for all FactHarbor documentation in two separate trees.**

> **TL;DR:** All docs live here as `.xwiki` files in two trees (`FactHarbor_Spec_and_Impl/` and `FactHarbor_Org/`). Edit files directly, commit to git. To preview locally with full WYSIWYG rendering, run:
> ```
> Docs\xwiki-pages\View.cmd
> ```
> To sync with xWiki, export/import XARs via `Docs/xwiki-export/` scripts.

## Overview

- **Format:** `.xwiki` files containing pure xWiki 2.1 syntax
- **Version Control:** All files are tracked in git
- **Editing:** AI agents edit these files directly
- **Structure:** Two separate folder trees for different documentation domains

## Directory Structure

```
xwiki-pages/
├── FactHarbor_Spec_and_Impl/      (75 pages)
│   └── FactHarbor/
│       ├── Specification/          (Requirements, Architecture, Diagrams, etc.)
│       ├── Roadmap/                (Implementation plans, guidance)
│       ├── FH Analysis Reports/    (Analysis results)
│       └── License and Disclaimer/
│
└── FactHarbor_Org/                 (38 pages)
    └── FactHarbor/
        ├── Organisation/           (Governance, processes, policies)
        └── License and Disclaimer/
```

## Two-Tree Workflow

### Why Two Trees?

**FactHarbor_Spec_and_Impl:** Technical documentation
- Product specifications
- Implementation roadmap
- Architecture and design
- Analysis reports

**FactHarbor_Org:** Organizational documentation
- Governance structure
- Policies and procedures
- Legal framework
- Team processes

### Working with Two Trees

**Convert both XARs to .xwiki trees:**
```bash
cd Docs/xwiki-export

# Spec and Implementation
python xar_to_xwiki_tree.py FactHarbor_Spec_and_Impl_06.Feb.26.xar \
    --output ../xwiki-pages/FactHarbor_Spec_and_Impl

# Organization
python xar_to_xwiki_tree.py FactHarbor_Org_06.Feb.26.xar \
    --output ../xwiki-pages/FactHarbor_Org
```

**Edit files directly (no conversion!):**
```bash
# Edit technical docs
code ../xwiki-pages/FactHarbor_Spec_and_Impl/FactHarbor/Specification/Architecture/WebHome.xwiki

# Edit organizational docs
code ../xwiki-pages/FactHarbor_Org/FactHarbor/Organisation/Governance/WebHome.xwiki

# Commit changes
git add ../xwiki-pages/
git commit -m "docs: update specification and governance"
```

**Export back to XARs:**
```bash
# Export Spec and Implementation
python xwiki_tree_to_xar.py ../xwiki-pages/FactHarbor_Spec_and_Impl/ \
    --output FactHarbor_Spec_and_Impl_updated.xar

# Export Organization
python xwiki_tree_to_xar.py ../xwiki-pages/FactHarbor_Org/ \
    --output FactHarbor_Org_updated.xar
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
| **File:** `FactHarbor_Spec_and_Impl/FactHarbor/Specification/WebHome.xwiki` | |
| - pageId: | `FactHarbor.Specification.WebHome` |
| - parent: | `FactHarbor.WebHome` |
| - title: | Extracted from first heading |
| - syntax: | `xwiki/2.1` |
| **File:** `FactHarbor_Org/FactHarbor/Organisation/Governance/WebHome.xwiki` | |
| - pageId: | `FactHarbor.Organisation.Governance.WebHome` |
| - parent: | `FactHarbor.Organisation.WebHome` |
| - title: | Extracted from first heading |
| - syntax: | `xwiki/2.1` |

## Workflow

### For AI Agents (Direct Editing)

**Edit .xwiki files directly:**
```bash
# Navigate to tree
cd Docs/xwiki-pages/FactHarbor_Spec_and_Impl/FactHarbor/Specification

# Open and edit
code Architecture/WebHome.xwiki

# Commit changes
cd ../../../..
git add xwiki-pages/
git commit -m "docs: update architecture"
```

**Export to XAR (for xWiki import):**
```bash
cd Docs/xwiki-export

# Export one tree
python xwiki_tree_to_xar.py ../xwiki-pages/FactHarbor_Spec_and_Impl/

# Or export both trees
python xwiki_tree_to_xar.py ../xwiki-pages/FactHarbor_Spec_and_Impl/ --output Spec_updated.xar
python xwiki_tree_to_xar.py ../xwiki-pages/FactHarbor_Org/ --output Org_updated.xar
```

### For Project Lead (xWiki Sync)

**Import from xWiki:**
```bash
# 1. Export XAR from xWiki (Administration → Export)
# 2. Convert to .xwiki tree:
cd Docs/xwiki-export
python xar_to_xwiki_tree.py FactHarbor_Spec_Export.xar --output ../xwiki-pages/FactHarbor_Spec_and_Impl
python xar_to_xwiki_tree.py FactHarbor_Org_Export.xar --output ../xwiki-pages/FactHarbor_Org
```

**Export to xWiki:**
```bash
# 1. Convert .xwiki trees to XARs:
cd Docs/xwiki-export
python xwiki_tree_to_xar.py ../xwiki-pages/FactHarbor_Spec_and_Impl/
python xwiki_tree_to_xar.py ../xwiki-pages/FactHarbor_Org/

# 2. Import XARs to xWiki (Administration → Import)
```

## Benefits of This Approach

✅ **Git-native:** All documentation version controlled as plain text
✅ **Direct editing:** No conversion needed for editing
✅ **Copy-paste ready:** Content can be pasted directly into xWiki editor
✅ **AI-friendly:** Agents can read and edit without conversion overhead
✅ **Human-readable:** Plain xWiki 2.1 syntax with Markdown-like simplicity
✅ **Lossless sync:** Full round-trip to/from xWiki with all metadata preserved
✅ **Separation of concerns:** Technical docs separate from organizational docs

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

**Full reference:** See [Docs/xwiki-export/WORKFLOW_NEW.md](../xwiki-export/WORKFLOW_NEW.md)

## XWiki Viewer (Local WYSIWYG Preview)

A standalone HTML viewer that renders `.xwiki` files with full WYSIWYG preview, directly from your local folder - no xWiki server needed.

### Quick Start

```
# From the project root - just double-click or run:
Docs\xwiki-pages\View.cmd
```

This starts a local HTTP server and opens the viewer in Chrome (or Edge). The browser's folder picker will open automatically - select one of the wiki trees (e.g. `FactHarbor_Spec_and_Impl` or `FactHarbor_Org`).

### Launcher Options

The underlying PowerShell script (`viewer-impl/Open-XWikiViewer.ps1`) supports options:

```powershell
# Default: Chrome, port 8471, auto-open folder picker
powershell -ExecutionPolicy Bypass -File "Docs\xwiki-pages\viewer-impl\Open-XWikiViewer.ps1"

# Use Edge instead of Chrome
powershell -ExecutionPolicy Bypass -File "Docs\xwiki-pages\viewer-impl\Open-XWikiViewer.ps1" -Browser edge

# Use a custom port
powershell -ExecutionPolicy Bypass -File "Docs\xwiki-pages\viewer-impl\Open-XWikiViewer.ps1" -Port 9000

# Don't auto-trigger the folder picker
powershell -ExecutionPolicy Bypass -File "Docs\xwiki-pages\viewer-impl\Open-XWikiViewer.ps1" -NoAutoOpen
```

Press `Ctrl+C` in the terminal to stop the server. The script automatically cleans up any previous server processes on startup.

### Viewer Features

| Feature | Description |
|---------|-------------|
| **Split View** | Side-by-side source editor and rendered preview |
| **File Tree** | Sidebar with all pages; click folders to open their WebHome |
| **Page Search** | Filter pages by name in the sidebar search box |
| **Wiki Links** | `[[label>>Page]]` links resolve to local pages; click to navigate |
| **Include** | `{{include reference="..."}}` renders the included page inline |
| **Navigation** | Back/forward buttons, breadcrumbs, click-through between pages |
| **File Watching** | Live-reload when a file changes on disk (requires File System Access API) |
| **View Modes** | Toggle between Source, Split, and Preview |

### Supported XWiki 2.1 Syntax

| Syntax | Renders as |
|--------|------------|
| `= Heading =` ... `====== H6 ======` | Headings (levels 1-6) |
| `**bold**` | **bold** |
| `//italic//` | *italic* |
| `--strikethrough--` | ~~strikethrough~~ |
| `##code##` or `` `code` `` | `inline code` |
| `[[label>>PageRef]]` | Wiki link (resolved against folder tree) |
| `[[label>>https://...]]` | External link |
| `* item` / `1. item` | Bullet / numbered lists |
| `1. ((( rich content )))` | Rich list items (multi-paragraph) |
| `(% class="box infomessage" %)` | Parameter blocks (CSS class/style) |
| `((( ... )))` | Groups / div containers |
| `{{{ verbatim }}}` | Preformatted text (no formatting) |
| `{{code language="js"}}...{{/code}}` | Code blocks with language label |
| `{{mermaid}}...{{/mermaid}}` | Mermaid diagrams |
| `{{info}}...{{/info}}` | Info / warning / error / success boxes |
| `{{include reference="..."}}` | Include another page inline |
| `{{toc/}}` | Table of contents |
| `\|=Header\|...\|` | Tables |
| `> quote` | Blockquotes |
| `----` | Horizontal rule |

### How It Works

The viewer is a single self-contained HTML file (`xwiki-viewer.html`) with no build step:

1. **Open a folder** via the browser's File System Access API (Chrome/Edge) or the `webkitdirectory` fallback (Firefox)
2. **Scans recursively** for `.xwiki`, `.wiki`, `.txt`, `.md` files
3. **Builds a page index** using the folder structure as the XWiki space hierarchy
4. **Resolves wiki links** with fuzzy matching (handles case differences, path variations)
5. **Renders includes** by fetching and parsing referenced pages inline (with circular reference detection)

### VS Code Integration

The project's `.vscode/tasks.json` includes three XWiki Viewer tasks. Use **Terminal → Run Task** and select:

- **XWiki Viewer: Open** — starts server + opens Chrome
- **XWiki Viewer: Open (Edge)** — starts server + opens Edge
- **XWiki Viewer: Quick Open (no server)** — opens via `file://` directly

### Viewer Options (Other)

1. **xWiki itself** - Import XAR to xWiki instance for full server-side rendering
2. **VS Code** - Edit plain text with syntax highlighting
3. **GitHub** - View in repository (limited formatting)

## Maintenance

**These directories are the MASTER:**
- All documentation changes should be made here
- Changes are committed to git for version control
- XAR files are generated from this source for xWiki import
- xWiki is synchronized periodically via XAR import/export

**Two separate trees maintained independently:**
- `FactHarbor_Spec_and_Impl/` for technical documentation
- `FactHarbor_Org/` for organizational documentation

---

**Last Updated:** 2026-02-06
**Total Pages:** 113 (75 Spec/Impl + 38 Org)
**Format:** xWiki 2.1
