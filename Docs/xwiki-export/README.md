# XWiki Export - XAR Archive

This folder contains dated XAR snapshots for import into xWiki.

## Current XAR Package

| File | Size | Contents |
|------|------|----------|
| `FactHarbor_19.Feb.26_00.00.xar` | 690 KB | Full FactHarbor tree (202 pages) |

**Changes since last XAR (08.Feb.26):**
- Fixed MIXED confidence threshold in Calculations and Verdicts page: `>= 60%` → `>= 40%`, `< 60%` → `< 40%`
- Verified against `apps/web/src/lib/analyzer/truth-scale.ts` and `apps/web/src/lib/config-schemas.ts` (UCM default: 40)

## Previous XAR Package

| File | Size | Contents |
|------|------|----------|
| `FactHarbor_08.Feb.26_22.19.xar` | 581 KB | Full FactHarbor tree (150 pages) |

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
