# xWiki Pages - Master Documentation Source

**This directory contains the MASTER source for all FactHarbor documentation as a single tree matching xWiki.**

> **TL;DR:** All docs live here as `.xwiki` files in `FactHarbor/`. Edit files directly, commit to git. To preview locally with full WYSIWYG rendering, run:
> ```
> Docs\xwiki-pages\View.cmd
> ```
> To sync with xWiki, use scripts in `scripts/`.

## Overview

- **Format:** `.xwiki` files containing pure xWiki 2.1 syntax
- **Version Control:** All files are tracked in git
- **Editing:** AI agents edit these files directly (no conversion needed)
- **Structure:** Single folder tree matching xWiki page hierarchy exactly

## Directory Structure

```
xwiki-pages/
├── FactHarbor/                        (137+ pages - single combined tree)
│   ├── Organisation/                  (Governance, processes, policies)
│   ├── Product Development/           (All product-related documentation)
│   │   ├── Requirements/              (Functional requirements, user needs, roles)
│   │   ├── Specification/             (Architecture, data model, diagrams, etc.)
│   │   ├── Planning/                  (Phases, status, roadmap)
│   │   └── DevOps/                    (Guidelines, tooling, deployment, subsystems)
│   ├── License and Disclaimer/
│   └── WebHome.xwiki                  (FactHarbor root page)
│
├── scripts/                           (Conversion tools)
│   ├── xar_to_xwiki_tree.py          (XAR → .xwiki tree)
│   ├── xwiki_tree_to_xar.py          (.xwiki tree → XAR)
│   ├── xar_to_fulltree.py               (dependency: XAR → JSON)
│   ├── fulltree_to_xar.py               (dependency: JSON → XAR)
│   └── WORKFLOW.md                    (Detailed workflow reference)
│
├── View.cmd                           (Local WYSIWYG viewer launcher)
├── viewer-impl/                       (Viewer implementation)
└── README.md                          (This file)
```

## Workflow

### For AI Agents (Direct Editing)

**Edit .xwiki files directly - no conversion needed:**
```bash
# Edit any page
code Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/WebHome.xwiki
code Docs/xwiki-pages/FactHarbor/Organisation/Governance/WebHome.xwiki

# Commit changes
git add Docs/xwiki-pages/
git commit -m "docs: update architecture and governance"
```

### For Project Lead (xWiki Sync)

**Import from xWiki → git:**
```bash
# 1. Export XAR from xWiki (Administration → Export)
# 2. Convert to .xwiki tree:
python Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py exported.xar --output Docs/xwiki-pages
```

**Export from git → xWiki:**
```bash
# 1. Convert tree to XAR (pass xwiki-pages as base, NOT FactHarbor):
python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar

# 2. Import XAR to xWiki (Administration → Import)
```

## File Format

Each `.xwiki` file contains **pure xWiki 2.1 syntax** - exactly what you would paste into the xWiki page editor.

**Example:** `FactHarbor/Product Development/Specification/WebHome.xwiki`
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
| **File:** `FactHarbor/WebHome.xwiki` | |
| - pageId: | `FactHarbor.WebHome` |
| - parent: | `None` (root) |
| - title: | `FactHarbor` (from directory name) |
| - syntax: | `xwiki/2.1` |
| **File:** `FactHarbor/Product Development/Specification/WebHome.xwiki` | |
| - pageId: | `FactHarbor.Product Development.Specification.WebHome` |
| - parent: | `FactHarbor.WebHome` |
| - title: | `Specification` (from directory name) |
| - syntax: | `xwiki/2.1` |
| **File:** `FactHarbor/Organisation/Governance/WebHome.xwiki` | |
| - pageId: | `FactHarbor.Organisation.Governance.WebHome` |
| - parent: | `FactHarbor.Organisation.WebHome` |
| - title: | `Governance` (from directory name) |
| - syntax: | `xwiki/2.1` |

**Title derivation rules:**
- **WebHome pages**: Title = parent directory name (the space name in xWiki)
- **Non-WebHome pages**: Title = first xWiki heading (`= Title =`), fallback to filename

## Benefits

- **Git-native:** All documentation version controlled as plain text
- **Direct editing:** No conversion needed for editing
- **1:1 xWiki match:** Tree structure matches xWiki page hierarchy exactly
- **Clean round-trip:** Export XAR → convert → edit → convert back → import
- **Copy-paste ready:** Content can be pasted directly into xWiki editor
- **AI-friendly:** Agents can read and edit without conversion overhead
- **No duplication:** Single tree = no conflicting copies of shared pages

## xWiki 2.1 Syntax Reference

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

**Full reference:** See [scripts/WORKFLOW.md](scripts/WORKFLOW.md)

## XWiki Viewer (Local WYSIWYG Preview)

A standalone HTML viewer that renders `.xwiki` files with full WYSIWYG preview, directly from your local folder - no xWiki server needed.

### Quick Start

```
# From the project root - just double-click or run:
Docs\xwiki-pages\View.cmd
```

This starts a local HTTP server and opens the viewer in Chrome (or Edge). The browser's folder picker will open automatically - select the `FactHarbor` folder.

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

### VS Code Integration

The project's `.vscode/tasks.json` includes three XWiki Viewer tasks. Use **Terminal > Run Task** and select:

- **XWiki Viewer: Open** - starts server + opens Chrome
- **XWiki Viewer: Open (Edge)** - starts server + opens Edge
- **XWiki Viewer: Quick Open (no server)** - opens via `file://` directly

## Maintenance

**`FactHarbor/` is the MASTER source:**
- All documentation changes should be made here
- Changes are committed to git for version control
- XAR files are generated from this source for xWiki import
- xWiki is synchronized periodically via XAR import/export

**What stays as .md files (NOT in xWiki):**
- `Docs/WIP/` - Work in progress (frequently edited)
- `Docs/STATUS/` - Status tracking
- `Docs/BACKLOG.md` - Task backlog
- Short/mid-term planning documents

---

**Last Updated:** 2026-02-08
**Total Pages:** 137
**Format:** xWiki 2.1
