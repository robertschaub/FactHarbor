# XWiki Export - XAR Archive

This folder contains dated XAR snapshots exported from xWiki.

## Current XAR Packages

| File | Size | Contents |
|------|------|----------|
| `FactHarbor_08.Feb.26_16.55.xar` | 581 KB | Full FactHarbor tree (137 pages) — cross-links fixed |
| `FactHarbor_Spec_and_Impl_06.Feb.26.xar` | 429 KB | Spec/Impl only (legacy, pre-merge) |
| `FactHarbor_Org_06.Feb.26.xar` | 212 KB | Organisation only (legacy, pre-merge) |

**Naming convention:** `FactHarbor_DD.Mon.YY_HH.MM.xar` (date + time of build)

## Master Source

The master documentation source is now at: **`Docs/xwiki-pages/FactHarbor/`**

Conversion scripts are at: **`Docs/xwiki-pages/scripts/`**

See [Docs/xwiki-pages/README.md](../xwiki-pages/README.md) for full workflow.

## Import to xWiki

1. Open xWiki Administration -> Import
2. Upload the `.xar` file
3. Select import mode (add version to existing or import all)
4. Click Import

---

**Note:** The Feb 6 XARs are legacy snapshots from before the two-tree merge.
Going forward, a single combined XAR covers all FactHarbor documentation.
