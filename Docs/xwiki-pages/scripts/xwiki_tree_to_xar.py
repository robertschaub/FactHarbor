#!/usr/bin/env python3
"""
xwiki_tree_to_xar.py - Convert .xwiki file tree to XAR (one-step)

Reads .xwiki files and creates importable XAR package.
Derives metadata (pageId, parent, title) from file structure.

Usage (from repo root - pass xwiki-pages as base, NOT FactHarbor):
    python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages
    python Docs/xwiki-pages/scripts/xwiki_tree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar

Input:
    Docs/xwiki-pages/  (parent of FactHarbor/ tree, so pageIds get FactHarbor. prefix)

Output:
    FactHarbor_updated.xar (ready for import to xWiki)
"""

import argparse
import base64
import json
import mimetypes
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def extract_title_from_content(content: str, fallback: str) -> str:
    """Extract title from first heading, or use fallback."""
    # Look for first heading: = Title =
    match = re.search(r'^=+\s+(.+?)\s+=+\s*$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return fallback

def path_to_page_id(file_path: Path, base_dir: Path) -> str:
    r"""
    Convert file path to pageId.
    Docs/xwiki-pages/FactHarbor/Specification/WebHome.xwiki
    → FactHarbor.Specification.WebHome
    Architecture Analysis 1.Jan.26 → Architecture Analysis 1\.Jan\.26
    """
    relative = file_path.relative_to(base_dir)
    parts = list(relative.parts)
    # Remove .xwiki extension from last part
    if parts[-1].endswith('.xwiki'):
        parts[-1] = parts[-1][:-6]  # Remove '.xwiki'
    # Escape dots within path component names (dots are hierarchy separators in pageId)
    escaped_parts = [part.replace('.', '\\.') for part in parts]
    return ".".join(escaped_parts)

def split_page_id(page_id: str) -> List[str]:
    """Split pageId on unescaped dots (escaped dots \\. are part of the name)."""
    return re.split(r'(?<!\\)\.', page_id)

def derive_parent(page_id: str) -> Optional[str]:
    r"""
    Derive parent from pageId (handles escaped dots in names).
    FactHarbor.Specification.WebHome → FactHarbor.WebHome
    FactHarbor.WebHome → None (root)
    FactHarbor.Planning.Architecture Analysis 1\.Jan\.26.WebHome → FactHarbor.Planning.WebHome
    FactHarbor.Specification.SomePage → FactHarbor.Specification.WebHome
    """
    parts = split_page_id(page_id)
    if parts[-1] == "WebHome":
        # WebHome's parent is the WebHome of the grandparent space
        if len(parts) <= 2:
            return None
        return ".".join(parts[:-2]) + ".WebHome"
    else:
        # Non-WebHome pages: parent is the WebHome of the same space
        if len(parts) <= 1:
            return None
        return ".".join(parts[:-1]) + ".WebHome"

def scan_xwiki_tree(base_dir: Path) -> List[Dict]:
    """Scan directory tree and create node structures."""
    nodes = []

    xwiki_files = sorted(base_dir.rglob("*.xwiki"))

    if not xwiki_files:
        print(f"Warning: No .xwiki files found in {base_dir}", file=sys.stderr)
        return nodes

    for idx, xwiki_file in enumerate(xwiki_files, 1):
        # Read content
        try:
            content_body = xwiki_file.read_text(encoding='utf-8')
        except Exception as e:
            print(f"Warning: Could not read {xwiki_file}: {e}", file=sys.stderr)
            continue

        # Derive metadata from path
        page_id = path_to_page_id(xwiki_file, base_dir)
        parent_id = derive_parent(page_id)
        page_id_parts = split_page_id(page_id)
        filename = page_id_parts[-1]

        # For WebHome pages, title = parent directory name (space name in xWiki)
        # e.g. FactHarbor/Specification/WebHome.xwiki → title "Specification"
        if filename == "WebHome" and len(page_id_parts) >= 2:
            title = page_id_parts[-2].replace('\\.', '.')
        else:
            title = extract_title_from_content(content_body, filename.replace('\\.', '.'))

        # Collect attachments from _attachments/ directory alongside the .xwiki file
        attachments = []
        attachments_dir = xwiki_file.parent / "_attachments"
        if attachments_dir.is_dir():
            for att_file in sorted(attachments_dir.iterdir()):
                if att_file.is_file():
                    try:
                        raw = att_file.read_bytes()
                        attachments.append({
                            "filename": att_file.name,
                            "content_base64": base64.b64encode(raw).decode("ascii"),
                            "filesize": len(raw),
                        })
                    except Exception as e:
                        print(f"  Warning: Could not read attachment {att_file}: {e}", file=sys.stderr)

        # Create node structure (matching fulltree format)
        node = {
            "pageId": page_id,
            "id": page_id,
            "title": title,
            "parentId": parent_id,
            "content": {
                "body": content_body,
                "syntax": "xwiki/2.1"
            },
            "xobjects": []
        }
        if attachments:
            node["attachments"] = attachments

        nodes.append(node)
        att_info = f" (+{len(attachments)} attachments)" if attachments else ""
        print(f"  [{idx:3d}/{len(xwiki_files)}] {page_id}{att_info}")

    return nodes

def main():
    parser = argparse.ArgumentParser(
        description="Convert .xwiki file tree to XAR (one-step)"
    )
    parser.add_argument(
        "xwiki_dir",
        help="Input directory containing .xwiki files"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output XAR file (default: <dirname>_updated.xar)"
    )

    args = parser.parse_args()

    xwiki_dir = Path(args.xwiki_dir)
    if not xwiki_dir.exists() or not xwiki_dir.is_dir():
        print(f"Error: Directory not found: {xwiki_dir}", file=sys.stderr)
        return 1

    # Determine output path
    if args.output:
        output_xar = Path(args.output)
    else:
        # Default: <dirname>_updated.xar
        dir_name = xwiki_dir.name
        output_xar = xwiki_dir.parent / f"{dir_name}_updated.xar"

    # Get script directory
    script_dir = Path(__file__).parent
    json_to_xar_script = script_dir / "fulltree_to_xar.py"

    if not json_to_xar_script.exists():
        print(f"Error: Converter not found: {json_to_xar_script}", file=sys.stderr)
        return 1

    print(f"Converting .xwiki tree to XAR...")
    print(f"Input: {xwiki_dir}/")
    print(f"Output: {output_xar}")

    # Step 1: Scan .xwiki files and create fulltree structure
    print(f"\nStep 1/2: Scanning .xwiki files...")
    nodes = scan_xwiki_tree(xwiki_dir)

    if not nodes:
        print("Error: No .xwiki files found", file=sys.stderr)
        return 1

    # Create fulltree JSON structure
    fulltree = {
        "xwiki": "13.10.11",
        "syntax": "xwiki/2.1",
        "nodes": nodes
    }

    # Step 2: Convert JSON to XAR (via temp file)
    print(f"\nStep 2/2: Creating XAR package...")

    with tempfile.NamedTemporaryFile(mode='w', suffix='_fulltree.json', delete=False, encoding='utf-8') as tmp:
        json.dump(fulltree, tmp, ensure_ascii=False, indent=2)
        json_path = Path(tmp.name)

    try:
        cmd = [
            sys.executable,
            str(json_to_xar_script),
            str(json_path),
            str(output_xar)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"Error creating XAR:", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
            return 1

        print(f"\n[SUCCESS] Created XAR: {output_xar}")
        print(f"  Size: {output_xar.stat().st_size / 1024:.1f} KB")
        print(f"  Pages: {len(nodes)}")
        print(f"\nReady to import to xWiki:")
        print(f"  xWiki → Administration → Import → Select file")

        return 0

    finally:
        # Clean up temp JSON file
        if json_path.exists():
            json_path.unlink()

if __name__ == "__main__":
    sys.exit(main())
