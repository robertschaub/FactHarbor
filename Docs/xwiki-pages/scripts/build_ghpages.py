#!/usr/bin/env python3
"""
build_ghpages.py

Generate GitHub Pages deployment for xWiki documentation.

Scans the .xwiki page tree under Docs/xwiki-pages/FactHarbor/, generates:
  - pages.json   : All page content bundled as JSON
  - index.html   : Modified xwiki-viewer.html for static hosting (no file picker)
  - .nojekyll    : Tells GitHub Pages to skip Jekyll processing

Usage (from repo root):
    python Docs/xwiki-pages/scripts/build_ghpages.py
    python Docs/xwiki-pages/scripts/build_ghpages.py -o my-output-dir
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

WIKI_EXTS = {'.xwiki', '.wiki', '.txt', '.md'}
SORT_FILE = '_sort'


def _read_sort_order(directory: Path) -> List[str] | None:
    """Read a _sort file from a directory, returning ordered names or None."""
    sort_path = directory / SORT_FILE
    if not sort_path.is_file():
        return None
    try:
        lines = sort_path.read_text(encoding='utf-8').splitlines()
        return [line.strip() for line in lines if line.strip() and not line.strip().startswith('#')]
    except (OSError, UnicodeDecodeError):
        return None


def _apply_sort_order(entries: List[Dict[str, Any]], sort_order: List[str] | None) -> None:
    """Sort entries in-place: items in sort_order first (in that order), then rest alphabetically.
    Folders always come before files within each group."""
    if sort_order:
        order_map = {name.lower(): i for i, name in enumerate(sort_order)}
        entries.sort(key=lambda e: (
            0 if e['type'] == 'folder' else 1,                          # folders first
            0 if e['name'].lower().replace('.xwiki', '') in order_map    # listed items first
                or e['name'].lower() in order_map else 1,
            order_map.get(e['name'].lower().replace('.xwiki', ''),
                          order_map.get(e['name'].lower(), float('inf'))),
            e['name'].lower()
        ))
    else:
        entries.sort(key=lambda e: (0 if e['type'] == 'folder' else 1, e['name'].lower()))


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat().replace("+00:00", "Z")


def _git_short_hash() -> str:
    """Get the current git short commit hash, or empty string."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip() if result.returncode == 0 else ''
    except Exception:
        return ''


def find_repo_root() -> Path:
    """Walk up from script location to find .git directory."""
    p = Path(__file__).resolve().parent
    while p != p.parent:
        if (p / '.git').exists():
            return p
        p = p.parent
    # Fallback: current working directory
    return Path.cwd()


def scan_tree(base_dir: Path, prefix: list | None = None) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """
    Recursively scan directory for .xwiki files.

    Returns (tree_structure, pages_dict) where:
      - tree_structure: hierarchical list matching the viewer's scanDirectory() format
      - pages_dict: flat dict mapping ref -> content string

    The output matches what the JavaScript viewer produces when you open a folder,
    so renderTree() and buildPageIndex() can consume it directly.
    """
    if prefix is None:
        prefix = []

    entries: List[Dict[str, Any]] = []
    pages: Dict[str, str] = {}

    try:
        items = sorted(base_dir.iterdir(), key=lambda p: p.name.lower())
    except OSError:
        return entries, pages

    sort_order = _read_sort_order(base_dir)

    for item in items:
        if item.name.startswith('.') or item.name == SORT_FILE:
            continue

        if item.is_file() and item.suffix.lower() in WIKI_EXTS:
            base_name = item.stem
            segments = prefix + [base_name]
            ref = '.'.join(segments)
            rel_path = '/'.join(prefix + [item.name])

            try:
                content = item.read_text(encoding='utf-8')
            except (OSError, UnicodeDecodeError) as e:
                print(f'  Warning: skipping {item}: {e}', file=sys.stderr)
                continue

            pages[ref] = content

            entries.append({
                'type': 'file',
                'name': item.name,
                'baseName': base_name,
                'ref': ref,
                'segments': segments,
                'relPath': rel_path,
                'parentPath': '.'.join(prefix)
            })

        elif item.is_dir():
            children, sub_pages = scan_tree(item, prefix + [item.name])
            if children:
                entries.append({
                    'type': 'folder',
                    'name': item.name,
                    'segments': prefix + [item.name],
                    'children': children
                })
                pages.update(sub_pages)

    # Sort: respect _sort file if present, otherwise folders first then alphabetical
    _apply_sort_order(entries, sort_order)

    return entries, pages


def find_root_ref(pages: Dict[str, str]) -> str:
    """Find the best root page reference."""
    if 'WebHome' in pages:
        return 'WebHome'
    # Look for any WebHome
    for ref in pages:
        if ref.endswith('.WebHome') and ref.count('.') == 1:
            return ref
    return next(iter(pages)) if pages else ''


def generate_viewer_html(template_path: Path) -> str:
    """
    Read the existing xwiki-viewer.html and produce a modified version
    for static GitHub Pages deployment.

    Applies targeted patches to:
    - Replace welcome screen with auto-loading
    - Add loadBundle() function
    - Patch loadPage() and resolveIncludes() to read from page.content
    - Add hash-based deep linking
    - Hide inapplicable UI elements
    - Update branding
    """
    html = template_path.read_text(encoding='utf-8')

    # 1. Title
    html = html.replace('<title>XWiki Viewer</title>',
                        '<title>FactHarbor Documentation</title>')

    # 2. Logo branding
    html = html.replace(
        'XWiki<span>Viewer</span>',
        'FactHarbor<span>Docs</span>'
    )

    # 4. Welcome screen title
    html = html.replace(
        '<h1>XWiki Viewer</h1>',
        '<h1>FactHarbor Documentation</h1>'
    )

    # 5. Add hash update to loadPage() - after currentPageRef = ref
    html = html.replace(
        "    currentPageRef = ref;\n    currentFileHandle = page.handle || null;",
        "    currentPageRef = ref;\n    if(history.replaceState) history.replaceState(null,'','#'+ref);\n    currentFileHandle = page.handle || null;"
    )

    # 8. Inject loadBundle() function and replace init block
    load_bundle_js = """
// =================================================================
// Bundle Loading (GitHub Pages static mode)
// =================================================================
async function loadBundle(){
  try {
    // Cache-busting: append timestamp to force fresh fetch
    const cacheBust = new Date().getTime();
    const resp = await fetch('pages.json?v='+cacheBust);
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const bundle = await resp.json();
    pageTree = bundle.tree;
    pageIndex = buildPageIndex(pageTree);
    // Attach content strings to page index entries
    for(const[ref,entry] of Object.entries(pageIndex)){
      entry.content = bundle.pages[ref] || '';
    }
    // Alias root WebHome under wrapper folder name so folder click works
    if(bundle.tree[0] && pageIndex['WebHome'] && !pageIndex[bundle.tree[0].name+'.WebHome']){
      pageIndex[bundle.tree[0].name+'.WebHome'] = pageIndex['WebHome'];
    }
    const count = Object.keys(pageIndex).length;
    document.getElementById('treeBody').innerHTML = renderTree(pageTree);
    document.getElementById('treeCount').textContent = '('+count+')';
    document.getElementById('treeSidebar').classList.remove('collapsed');
    showEditor();
    // Navigate to ?page= param, hash target, or root page
    const params = new URLSearchParams(location.search);
    const pageParam = params.get('page');
    const hashRef = location.hash.slice(1);
    const initRef = (pageParam && pageIndex[pageParam]) ? pageParam
      : (hashRef && pageIndex[hashRef]) ? hashRef
      : (bundle.rootRef || Object.keys(pageIndex)[0]);
    if(initRef) await loadPage(initRef);
    // Show metadata
    const meta = document.getElementById('bundleMeta');
    if(meta){
      const d = bundle.generated ? bundle.generated.slice(0,10) : '';
      const h = bundle.commitHash || '';
      meta.textContent = 'Updated: '+d+(h?' ('+h+')':'');
      meta.style.display = '';
    }
  } catch(e){
    console.error('Bundle load failed:',e);
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('mainArea').classList.add('hidden');
    const card = document.querySelector('.welcome-card');
    if(card) card.innerHTML = '<h1 style="color:#c9915a">FactHarbor Documentation</h1><p style="color:#d8d8de">Failed to load documentation bundle.</p><p style="color:#7c7c8a;font-size:.9em">Make sure <code>pages.json</code> exists alongside this file.<br>Error: '+e.message+'</p>';
  }
}

// Hash-based deep linking
window.addEventListener('hashchange',()=>{
  const ref = location.hash.slice(1);
  if(ref && pageIndex[ref]) loadPage(ref);
});

"""

    # Replace the init block at the end of the file
    old_init = """// Auto-load: try server-provided wiki first, then fall back to folder picker
(async function(){
  const params = new URLSearchParams(window.location.search);
  const loaded = await loadFromServer();
  if(loaded){
    const pageParam = params.get('page');
    if(pageParam && pageIndex[pageParam]){
      await loadPage(pageParam);
    }
  } else if(params.get('open') === 'folder'){
    setTimeout(()=> openFolderPicker(), 300);
  }
})();"""

    new_init = """// Auto-load documentation bundle
loadBundle();"""

    html = html.replace(old_init, load_bundle_js + new_init)

    # 9. Hide inapplicable UI elements with CSS
    # Insert before closing </style>
    hide_css = """
/* GitHub Pages static mode: hide interactive-only controls */
.welcome-screen { display: none !important; }
.welcome-actions, #dropZone, .drop-zone { display: none !important; }
#fileInput, #folderInput { display: none !important; }
.toolbar .btn[onclick*="openFile"],
.toolbar .btn[onclick*="openFolder"],
#btnWatch, #btnReload { display: none !important; }
.view-toggle button[onclick*="source"] { display: none !important; }
.view-toggle button[onclick*="split"] { display: none !important; }
#dropOverlay { display: none !important; }
#bundleMeta { display: none; color: var(--text-dim); font-size: .75em; margin-left: 8px; }
"""
    html = html.replace('</style>', hide_css + '</style>')

    # 10. Add bundle metadata element to toolbar
    html = html.replace(
        '<span class="watch-badge" id="watchBadge">',
        '<span id="bundleMeta"></span><span class="watch-badge" id="watchBadge">'
    )

    # 11. Make main area visible by default (skip welcome screen)
    html = html.replace(
        '<div class="main-area hidden" id="mainArea">',
        '<div class="main-area" id="mainArea">'
    )

    return html


def main():
    parser = argparse.ArgumentParser(
        description='Generate GitHub Pages deployment for xWiki docs'
    )
    parser.add_argument('--content-dir',
        default=None,
        help='Path to xWiki content directory (default: Docs/xwiki-pages/FactHarbor)')
    parser.add_argument('--viewer',
        default=None,
        help='Path to xwiki-viewer.html template (default: auto-detect)')
    parser.add_argument('--output', '-o',
        default='gh-pages-build',
        help='Output directory (default: gh-pages-build)')

    args = parser.parse_args()

    repo_root = find_repo_root()
    content_dir = Path(args.content_dir) if args.content_dir else \
                  repo_root / 'Docs' / 'xwiki-pages' / 'FactHarbor'
    viewer_path = Path(args.viewer) if args.viewer else \
                  repo_root / 'Docs' / 'xwiki-pages' / 'viewer-impl' / 'xwiki-viewer.html'
    output_dir = Path(args.output)

    if not content_dir.is_dir():
        print(f'Error: content directory not found: {content_dir}', file=sys.stderr)
        sys.exit(1)
    if not viewer_path.is_file():
        print(f'Error: viewer template not found: {viewer_path}', file=sys.stderr)
        sys.exit(1)

    # Scan content
    print(f'Scanning {content_dir} ...')
    tree, pages = scan_tree(content_dir)
    root_ref = find_root_ref(pages)
    print(f'  Found {len(pages)} pages, root: {root_ref}')

    # Wrap tree in a root folder so the project name appears in the sidebar
    root_name = content_dir.name  # e.g. "FactHarbor"
    tree = [{
        'type': 'folder',
        'name': root_name,
        'segments': [root_name],
        'children': tree
    }]

    # Get commit hash
    commit_hash = _git_short_hash()

    # Generate pages.json
    bundle = {
        'generated': _now_iso(),
        'generator': 'build_ghpages.py',
        'version': '1.0',
        'commitHash': commit_hash,
        'rootRef': root_ref,
        'pageCount': len(pages),
        'tree': tree,
        'pages': pages
    }

    output_dir.mkdir(parents=True, exist_ok=True)

    json_path = output_dir / 'pages.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(bundle, f, ensure_ascii=False)
    json_size = json_path.stat().st_size
    print(f'  Wrote {json_path} ({json_size:,} bytes)')

    # Generate modified viewer HTML
    print(f'Generating viewer from {viewer_path} ...')
    viewer_html = generate_viewer_html(viewer_path)
    html_path = output_dir / 'index.html'
    html_path.write_text(viewer_html, encoding='utf-8')
    html_size = html_path.stat().st_size
    print(f'  Wrote {html_path} ({html_size:,} bytes)')

    # Generate .nojekyll
    nojekyll_path = output_dir / '.nojekyll'
    nojekyll_path.write_text('', encoding='utf-8')

    total_size = json_size + html_size
    print(f'\nDone! {len(pages)} pages, {total_size:,} bytes total')
    print(f'Output: {output_dir.resolve()}')
    print(f'\nTo deploy, copy contents of {output_dir}/ to the gh-pages branch.')


if __name__ == '__main__':
    main()
