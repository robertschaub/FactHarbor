# XWiki Export - XAR Archive

This folder contains dated XAR snapshots for import into xWiki.

## Current XAR Package

| File | Size | Contents |
|------|------|----------|
| `FactHarbor_08.Feb.26_22.19.xar` | 581 KB | Full FactHarbor tree (150 pages) |

**Changes since last XAR (16:55):**
- Terminology audit — aligned xWiki docs with source code
- Diagram fixes — updated to match current implementation
- Navigation improvements — cross-references and breadcrumbs
- Large pages split into subpages (Architecture Overview, Source Reliability, API-and-Schemas)
- All cross-links validated (566 references, 0 broken)
- Conversion scripts renamed for consistency

**Naming convention:** `FactHarbor_DD.Mon.YY_HH.MM.xar` (date + time of build)

## Master Source

The master documentation source is at: **`Docs/xwiki-pages/FactHarbor/`**

Conversion scripts are at: **`Docs/xwiki-pages/scripts/`**

See [Docs/xwiki-pages/README.md](../xwiki-pages/README.md) for full workflow.

## Import to xWiki

1. Open xWiki Administration -> Import
2. Upload the `.xar` file
3. Select import mode (add version to existing or import all)
4. Click Import
