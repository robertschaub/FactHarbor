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
code Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/WebHome.xwiki
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

- **WebHome pages**: Title = parent directory name (e.g., `FactHarbor/Product Development/Specification/WebHome.xwiki` → title "Specification")
- **Non-WebHome pages**: Title = first xWiki heading (`= Title =`)
- **Escaped dots**: Directory names with dots (e.g., `Architecture Analysis 1.Jan.26`) are escaped in pageIds as `\.`

See [Docs/xwiki-pages/README.md](../xwiki-pages/README.md) for full derivation table.

---

## xWiki Viewer (`viewer-impl/xwiki-viewer.html`)

The viewer is a ~2000-line standalone HTML file that renders xWiki 2.1 markup in the browser. It is **shared identically** with the BestWorkplace repository (`C:\DEV\BestWorkplace`). Any changes to the viewer must be copied to both repos.

### Rendering Pipeline

1. `extractBlockMacros(source)` — replaces block macros (`{{code}}`, `{{mermaid}}`, `{{info}}`, `{{children/}}`, etc.) with numbered placeholders
2. `parse(source)` — line-by-line parsing: headings, lists, tables, `(((` groups, `(% ... %)` params, paragraphs
3. `resolvePlaceholders(html)` — replaces placeholders with rendered HTML
4. `resolveIncludes(html)` — async: fetches and inlines `{{include}}` content
5. `resolveChildren` (in `renderPreview()`) — populates `{{children/}}` from the page tree

### Supported Macros

| Macro | Rendered as |
|-------|-----------|
| `{{code language="..."}}...{{/code}}` | `<pre><code>` with language label |
| `{{mermaid}}...{{/mermaid}}` | Mermaid diagram (rendered via mermaid.js) |
| `{{info}}`, `{{warning}}`, `{{error}}`, `{{success}}` | Colored message boxes |
| `{{toc/}}` | Auto-generated table of contents |
| `{{include reference="..."}}` | Transcluded page content |
| `{{children/}}` | Clickable list of child pages |
| `{{{verbatim}}}` | Pre-formatted code block |

### Key Gotchas

- **`(% ... %)` parameter lines**: A standalone line `(% class="x" %)` sets `pendingParams` for the NEXT element. A prefix `(% class="x" %)|(((` is stripped and the remainder (`|(((`) is re-processed. Table-level pendingParams are passed to `<table>` via `renderTable(rows, tblAttrs)`.
- **External links**: Use `[[label>>https://url]]` — the viewer auto-adds `target="_blank" rel="noopener"` for all `https://` links. Do NOT use `url:` prefix or `||target="_blank"` parameter — the viewer doesn't parse those xWiki-specific prefixes.
- **Image rendering in `inl()`**: The wiki-link regex has a negative lookahead for `image:` so `[[image:...]]` patterns aren't consumed as wiki links. Image regex runs after wiki-link regex.
- **`colspan`/`rowspan`**: Supported via `(% colspan="2" %)` in table cells — parsed by `buildAttrs()`.

---

## GitHub Pages Pipeline (`build_ghpages.py`)

The build script generates a static deployment from the xWiki content tree:

1. `scan_tree()` → builds page hierarchy + reads content into `pages` dict
2. `inject_titles()` → adds H1 headings for pages lacking them (derives title from directory name)
3. Outputs `pages.json` (bundled content) + `index.html` (patched viewer) + `.nojekyll`
4. `collect_attachments()` → copies `_attachments/` files to `attachments/` in build output

### How `generate_viewer_html()` Works

The build script applies **exact string replacements** to the viewer HTML. If you modify the viewer, verify that all patch target strings still exist. Current patches:

| # | What it patches | Purpose |
|---|----------------|---------|
| 1 | `<title>` | Branding |
| 2 | Logo text | Branding |
| 4 | Welcome `<h1>` | Branding |
| 5 | `loadPage()` | Adds hash-based deep linking |
| 8 | Init block | Replaces `loadFromServer()` with `loadBundle()` |
| 9 | `</style>` | Injects CSS to hide interactive controls |
| 10 | Watch badge | Adds bundle metadata element |
| 11 | Main area div | Removes `hidden` class |

**BestWorkplace's build script** has additional patches:
- **#12**: Adds `|image:` to wiki-link regex negative lookahead
- **#13**: Replaces image regex to prefix `attachments/` for local files and preserve width/height params

### Auto-Deploy

GitHub Actions workflow (`.github/workflows/deploy-docs.yml`) triggers on push to `main` when content/scripts/viewer files change. Uses `peaceiris/actions-gh-pages@v4` with `force_orphan: true`.

---

**Last Updated:** 2026-02-15
