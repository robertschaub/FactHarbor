# gh-pages Viewer & Deploy Alignment — 2026-02-21

**Status:** Completed
**Agent:** Claude Code (Opus) from BestWorkplace session
**Commits:** `9ef9a78`, `86913cc`, `66e1db0`, `da84394`

---

## Context

While working on BestWorkplace's gh-pages viewer (German translation support, title fixes, analytics), we discovered that agents had been running `deploy-ghpages.ps1` and force-pushing to `gh-pages` — overwriting the CI build and breaking analytics (the `DOCS_ANALYTICS_URL` secret is only available in CI). The same risks existed in FactHarbor. A cross-project audit was done to align both repos.

---

## Changes Made to FactHarbor

### 1. Agent Instructions (`9ef9a78`)

**Files:** `CLAUDE.md`, `AGENTS.md`, `.github/workflows/deploy-docs.yml`

- Added "Publishing (gh-pages)" section to `CLAUDE.md` with explicit rule: **CI owns gh-pages, agents must never push directly**
- Added publish row + warning blockquote to `AGENTS.md` Commands table
- Added `workflow_dispatch:` trigger to CI workflow so it can be re-triggered without a content commit: `gh workflow run "Deploy Docs to GitHub Pages" --ref main`

### 2. Viewer & Local Server Alignment (`86913cc`)

**Files:** `deploy-ghpages.ps1`, `Open-XWikiViewer.ps1`, `xwiki-viewer.html`

**deploy-ghpages.ps1** — Removed `git push origin gh-pages` (line 82). Script now builds locally only, with clear warning that CI handles deployment. This was the root cause of analytics breaking in BestWorkplace; FactHarbor had the same vulnerability.

**Open-XWikiViewer.ps1** — Two bugs fixed:
- `$wikiRoot` pointed to `'The Best Workplace'` instead of `'FactHarbor'` (copy-paste from BW). Local preview would fail to find any content.
- Manifest `root` field was `'The Best Workplace'` instead of `'FactHarbor'`
- Added `_meta.json` collection for translation metadata support (aligned with BW)

**xwiki-viewer.html** — Ported 4 fixes from BestWorkplace:
- `derivePageTitle()`: Added WebHome.LANG suffix cleanup (`ref.replace(/\.WebHome\.[a-z]{2}$/i, '.WebHome')`) + `displayTitle` check. Without this, a page like `How.to.Use.This.Blueprint.WebHome.de` would show "de" as the page title.
- `renderPreview()`: Uses `page.displayTitle` before falling back to `derivePageTitle()`
- `updateBreadcrumb()`: Uses `page.displayTitle` for the last breadcrumb segment
- `renderTree()`: Added `isTranslationWebHome()` filter to hide `WebHome.XX` entries from the sidebar tree (still accessible via language links)

### 3. Deep-Link Alignment (`66e1db0`)

**Files:** `build_ghpages.py`, `_redirects.json` (new at project level)

BestWorkplace had HTML redirect pages (`/guide/` clean URLs) but no bundle aliases. FactHarbor had bundle aliases (`#TestReports`) but no HTML redirect pages. Now both projects support **both mechanisms** for every redirect entry.

**build_ghpages.py changes:**
- Replaced `load_aliases()` with unified version that supports both BW object format (`{ "slug": "#ref" }`) and FH legacy array format (`[{ "alias", "ref" }]`)
- Added `generate_redirects()` — generates HTML redirect pages (`TestReports/index.html` → `../#Product%20Development.TestReports.WebHome`)
- Fixed `loadBundle()` hash handling: added `decodeURIComponent()` so URL-encoded refs resolve correctly (aligned with BW)
- `_redirects.json` lookup: checks `Docs/xwiki-pages/_redirects.json` (standard) first, falls back to `viewer-impl/_redirects.json` (legacy)

**New file:** `Docs/xwiki-pages/_redirects.json` in BW standard format:
```json
{ "TestReports": "#Product%20Development.TestReports.WebHome" }
```

### 4. Links Inventory (`da84394`)

**File:** `Docs/Links_Inventory.md`

Complete inventory documenting all redirect aliases, internal cross-links (657 across 117 files), cross-project links, deep-link URL patterns, CI/CD settings, and external dependencies.

---

## What This Means for FactHarbor Agents

1. **Never push to gh-pages.** Push to `main` and CI deploys automatically with analytics.
2. **`deploy-ghpages.ps1` is local preview only.** It builds but does not push.
3. **To re-trigger CI:** `gh workflow run "Deploy Docs to GitHub Pages" --ref main`
4. **Deep links:** Both `/TestReports/` (clean URL) and `#TestReports` (hash) now work.
5. **Viewer changes** should be made in `xwiki-viewer.html` — the build script patches it for gh-pages. Keep both repos' viewers aligned.

---

## Files Touched

| File | Change |
|------|--------|
| `CLAUDE.md` | Added gh-pages publishing rules |
| `AGENTS.md` | Added publish command + warning |
| `.github/workflows/deploy-docs.yml` | Added `workflow_dispatch` |
| `Docs/xwiki-pages/scripts/deploy-ghpages.ps1` | Removed push, local preview only |
| `Docs/xwiki-pages/viewer-impl/Open-XWikiViewer.ps1` | Fixed root name, added metas |
| `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html` | Ported 4 viewer fixes from BW |
| `Docs/xwiki-pages/scripts/build_ghpages.py` | Unified redirects, added HTML pages, fixed hash decoding |
| `Docs/xwiki-pages/_redirects.json` | New file (BW standard format) |
| `Docs/Links_Inventory.md` | New file (complete links inventory) |
