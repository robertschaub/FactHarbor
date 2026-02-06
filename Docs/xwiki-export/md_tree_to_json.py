#!/usr/bin/env python3
"""
md_tree_to_json.py - Merge Markdown tree changes back into JSON fulltree

Converts Markdown back to xWiki 2.1 markup following GLOBAL-R-037 rules.
Handles new pages and updates existing ones.

Usage:
    python md_tree_to_json.py markdown_dir/
    python md_tree_to_json.py markdown_dir/ --output updated_fulltree.json
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Set

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def markdown_to_xwiki(md_content: str) -> str:
    """
    Convert standard Markdown to xWiki 2.1 markup.
    Based on GLOBAL-R-037 conversion rules.
    """
    content = md_content

    # Headers: # H1 → = H1 =
    # Must handle from H6 to H1
    for level in range(6, 0, -1):
        hashes = "#" * level
        equals = "=" * level
        # Match: ###### Text (with optional trailing spaces/hashes)
        pattern = rf'^{hashes}\s+(.+?)(?:\s*{hashes}*)?\s*$'
        replacement = f"{equals} \\1 {equals}"
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

    # Mermaid diagrams FIRST (before code blocks): ```mermaid ... ``` → {{mermaid}}...{{/mermaid}}
    # Add required empty lines around {{mermaid}}
    def replace_mermaid(match):
        diagram_content = match.group(1).strip()
        return f"\n{{{{mermaid}}}}\n{diagram_content}\n{{{{/mermaid}}}}\n"

    content = re.sub(
        r'```mermaid\s*\n(.*?)\n```',
        replace_mermaid,
        content,
        flags=re.DOTALL
    )

    # Code blocks: ```lang ... ``` → {{code language="lang"}}...{{/code}}
    def replace_code_block(match):
        lang = match.group(1) or ""
        code_content = match.group(2).strip()
        if lang:
            return f'{{{{code language="{lang}"}}}}\n{code_content}\n{{{{/code}}}}'
        else:
            return f'{{{{code}}}}\n{code_content}\n{{{{/code}}}}'

    content = re.sub(
        r'```(\w*)\s*\n(.*?)\n```',
        replace_code_block,
        content,
        flags=re.DOTALL
    )

    # Code inline: `code` → ##code##
    content = re.sub(r'`([^`]+)`', r'##\1##', content)

    # Bold: **text** → **text** (same in both)

    # Italic: *text* or _text_ → //text//
    content = re.sub(r'\*([^\*]+)\*', r'//\1//', content)
    content = re.sub(r'_([^_]+)_', r'//\1//', content)

    # Links: [text](url) → [[url||text]]
    content = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'[[\2||\1]]', content)

    # Images: ![alt](url) → [[image:url||alt="alt"]]
    def replace_image(match):
        alt = match.group(1)
        url = match.group(2)
        if alt:
            return f'[[image:{url}||alt="{alt}"]]'
        else:
            return f'[[image:{url}]]'

    content = re.sub(r'!\[([^\]]*)\]\(([^\)]+)\)', replace_image, content)

    return content

def merge_md_tree_to_json(md_dir: Path, output_json_path: Path) -> int:
    """
    Merge Markdown tree changes back into JSON fulltree.
    Returns 0 on success, 1 on error.
    """
    # Load manifest
    manifest_file = md_dir / "_metadata.json"
    if not manifest_file.exists():
        print(f"Error: Manifest not found: {manifest_file}", file=sys.stderr)
        print("The manifest is required to preserve page metadata.", file=sys.stderr)
        return 1

    try:
        with open(manifest_file, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
    except Exception as e:
        print(f"Error reading manifest: {e}", file=sys.stderr)
        return 1

    # Load original JSON fulltree
    original_json = md_dir.parent / manifest["source"]["jsonFile"]
    if not original_json.exists():
        print(f"Error: Original JSON not found: {original_json}", file=sys.stderr)
        print(f"Expected location based on manifest: {original_json}", file=sys.stderr)
        return 1

    try:
        with open(original_json, 'r', encoding='utf-8') as f:
            fulltree = json.load(f)
    except Exception as e:
        print(f"Error reading original JSON: {e}", file=sys.stderr)
        return 1

    # Build pageId → node index map
    page_map = {}
    for idx, node in enumerate(fulltree["nodes"]):
        page_id = node.get("pageId") or node.get("id")
        if page_id:
            page_map[page_id] = idx

    # Track processed files
    processed_pages: Set[str] = set()

    print(f"Updating pages from Markdown...")

    # Update existing pages
    for page_meta in manifest["pages"]:
        page_id = page_meta["pageId"]
        md_file_path = md_dir / page_meta["mdFile"]

        if not md_file_path.exists():
            print(f"  ⚠ Skipped (file deleted): {page_id}")
            # Remove from JSON if file was deleted
            if page_id in page_map:
                node_idx = page_map[page_id]
                fulltree["nodes"][node_idx] = None  # Mark for removal
            continue

        # Read MD content
        try:
            with open(md_file_path, 'r', encoding='utf-8') as f:
                md_content = f.read()
        except Exception as e:
            print(f"  ✗ Error reading {md_file_path}: {e}", file=sys.stderr)
            continue

        # Convert MD → xWiki
        xwiki_content = markdown_to_xwiki(md_content)

        # Update node in fulltree
        if page_id in page_map:
            node_idx = page_map[page_id]
            fulltree["nodes"][node_idx]["content"]["body"] = xwiki_content
            print(f"  ✓ Updated: {page_id}")
        else:
            print(f"  ⚠ Warning: Page not found in original JSON: {page_id}", file=sys.stderr)

        processed_pages.add(str(md_file_path))

    # Find new .md files (not in manifest)
    all_md_files = list(md_dir.rglob("*.md"))
    new_files = [f for f in all_md_files if str(f) not in processed_pages and f.name != "_metadata.json"]

    # Add new pages
    if new_files:
        print(f"\nAdding {len(new_files)} new pages...")

        for md_file in new_files:
            # Derive pageId from file path: pages/FactHarbor/NewPage.md → FactHarbor.NewPage
            rel_path = md_file.relative_to(md_dir)
            page_id = str(rel_path.with_suffix('')).replace('\\', '.').replace('/', '.')

            # Determine parentId (parent directory's pageId)
            parent_parts = page_id.split('.')[:-1]
            parent_id = '.'.join(parent_parts) if parent_parts else ""

            # Read MD content
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    md_content = f.read()
            except Exception as e:
                print(f"  ✗ Error reading {md_file}: {e}", file=sys.stderr)
                continue

            # Convert MD → xWiki
            xwiki_content = markdown_to_xwiki(md_content)

            # Extract title from first heading or use page name
            title_match = re.search(r'^=\s+(.+?)\s+=\s*$', xwiki_content, re.MULTILINE)
            title = title_match.group(1) if title_match else page_id.split('.')[-1]

            # Create new node
            new_node = {
                "id": page_id,
                "pageId": page_id,
                "parentId": parent_id,
                "title": title,
                "syntax": "xwiki/2.1",
                "content": {
                    "body": xwiki_content
                },
                "meta": {
                    "web": '.'.join(page_id.split('.')[:-1]),
                    "name": page_id.split('.')[-1]
                }
            }

            fulltree["nodes"].append(new_node)
            print(f"  + Added: {page_id} (parent: {parent_id or 'root'})")

    # Remove nodes marked as None (deleted pages)
    original_count = len(fulltree["nodes"])
    fulltree["nodes"] = [n for n in fulltree["nodes"] if n is not None]
    deleted_count = original_count - len(fulltree["nodes"])

    if deleted_count > 0:
        print(f"\nRemoved {deleted_count} deleted page(s)")

    # Update snapshot metadata
    fulltree["snapshotLabel"] = fulltree.get("snapshotLabel", "") + " (MD edited)"

    # Write updated JSON
    try:
        with open(output_json_path, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(fulltree, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error writing output JSON: {e}", file=sys.stderr)
        return 1

    print(f"\n✓ Success!")
    print(f"  Updated JSON: {output_json_path}")
    print(f"  Total pages: {len(fulltree['nodes'])}")
    print(f"\nNext step:")
    print(f"  python json_to_xar.py {output_json_path}")

    return 0

def main():
    parser = argparse.ArgumentParser(description="Merge Markdown tree changes back into JSON fulltree")
    parser.add_argument("md_dir", help="Markdown directory (with _metadata.json)")
    parser.add_argument("--output", "-o", help="Output JSON file (default: <original>_updated.json)")

    args = parser.parse_args()

    md_dir = Path(args.md_dir)
    if not md_dir.is_dir():
        print(f"Error: Not a directory: {md_dir}", file=sys.stderr)
        return 1

    # Determine output path
    if args.output:
        output_json = Path(args.output)
    else:
        # Read manifest to get original filename
        manifest_file = md_dir / "_metadata.json"
        if manifest_file.exists():
            with open(manifest_file, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            orig_name = Path(manifest["source"]["jsonFile"]).stem
            output_json = md_dir.parent / f"{orig_name}_updated.json"
        else:
            output_json = md_dir.parent / "updated_fulltree.json"

    return merge_md_tree_to_json(md_dir, output_json)

if __name__ == "__main__":
    sys.exit(main())
