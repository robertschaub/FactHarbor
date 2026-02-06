#!/usr/bin/env python3
"""
json_to_md_tree.py - Convert JSON fulltree to Markdown file tree

Converts xWiki 2.1 markup to standard Markdown following GLOBAL-R-038 rules.
Creates a directory structure with MD files + metadata manifest.

Usage:
    python json_to_md_tree.py input_fulltree.json
    python json_to_md_tree.py input_fulltree.json --output-dir ./markdown_pages
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def sanitize_path_component(name: str) -> str:
    """
    Sanitize a path component for Windows/Unix filesystems.
    Replaces invalid characters with safe alternatives.
    """
    # Windows invalid chars: < > : " / \ | ? *
    replacements = {
        '<': '(lt)',
        '>': '(gt)',
        ':': '-',
        '"': "'",
        '/': '-',
        '\\': '-',
        '|': '-',
        '?': '',
        '*': ''
    }

    result = name
    for char, replacement in replacements.items():
        result = result.replace(char, replacement)

    # Remove trailing dots/spaces (Windows issue)
    result = result.rstrip('. ')

    return result

def xwiki_to_markdown(xwiki_content: str) -> str:
    """
    Convert xWiki 2.1 markup to standard Markdown.
    Based on GLOBAL-R-038 conversion rules.
    """
    content = xwiki_content

    # Headers: = H1 = → # H1
    # Must handle from H6 to H1 (to avoid replacing inner = signs)
    for level in range(6, 0, -1):
        equals = "=" * level
        # Match: ====== Text ====== (with optional whitespace)
        pattern = rf'^{equals}\s*(.+?)\s*{equals}\s*$'
        replacement = f"{'#' * level} \\1"
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

    # Italic: //text// → *text*
    content = re.sub(r'//(.+?)//', r'*\1*', content)

    # Bold: **text** → **text** (same, but ensure it's not confused with list markers)
    # XWiki uses ** for bold, MD also uses ** for bold - no change needed

    # Code inline: ##code## → `code`
    content = re.sub(r'##(.+?)##', r'`\1`', content)

    # Code blocks: {{code language="lang"}}...{{/code}} → ```lang ... ```
    def replace_code_block(match):
        lang = match.group(1) or ""
        code_content = match.group(2)
        return f"```{lang}\n{code_content}\n```"

    content = re.sub(
        r'\{\{code\s+language="([^"]*)"[^}]*\}\}(.*?)\{\{/code\}\}',
        replace_code_block,
        content,
        flags=re.DOTALL
    )

    # Code blocks without language: {{code}}...{{/code}} → ``` ... ```
    content = re.sub(
        r'\{\{code\}\}(.*?)\{\{/code\}\}',
        r'```\n\1\n```',
        content,
        flags=re.DOTALL
    )

    # Mermaid diagrams: {{mermaid}}...{{/mermaid}} → ```mermaid ... ```
    # Remove extra empty lines that xWiki requires
    def replace_mermaid(match):
        diagram_content = match.group(1).strip()
        return f"```mermaid\n{diagram_content}\n```"

    content = re.sub(
        r'\{\{mermaid\}\}(.*?)\{\{/mermaid\}\}',
        replace_mermaid,
        content,
        flags=re.DOTALL
    )

    # Links: [[url||text]] → [text](url)
    # Also handle [[url]] → [url](url)
    content = re.sub(r'\[\[([^\]|]+)\|\|([^\]]+)\]\]', r'[\2](\1)', content)
    content = re.sub(r'\[\[([^\]]+)\]\]', r'[\1](\1)', content)

    # Images: [[image:url||alt="alt text"]] → ![alt text](url)
    def replace_image(match):
        url = match.group(1)
        alt = match.group(2) if match.group(2) else ""
        return f"![{alt}]({url})"

    content = re.sub(r'\[\[image:([^\]|]+)\|\|alt="([^"]*)"\]\]', replace_image, content)
    content = re.sub(r'\[\[image:([^\]]+)\]\]', r'![](\1)', content)

    # Lists: XWiki uses * and 1. similar to Markdown, but handle numbered lists
    # XWiki: 1. item → MD: 1. item (mostly compatible)

    return content

def create_md_tree(json_path: Path, output_dir: Path) -> int:
    """
    Convert JSON fulltree to Markdown file tree.
    Returns 0 on success, 1 on error.
    """
    # Load JSON
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}", file=sys.stderr)
        return 1

    nodes = data.get("nodes", [])
    if not nodes:
        print("Warning: No nodes found in JSON", file=sys.stderr)
        return 1

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create manifest to preserve metadata
    manifest = {
        "schema": "xwiki-md-tree@1",
        "source": {
            "jsonFile": json_path.name,
            "snapshotLabel": data.get("snapshotLabel", ""),
            "snapshotVersion": data.get("snapshotVersion", ""),
        },
        "pages": []
    }

    print(f"Converting {len(nodes)} pages to Markdown...")

    # Process each page
    for idx, node in enumerate(nodes, 1):
        page_id = node.get("pageId") or node.get("id", f"Unknown_{idx}")

        # Convert pageId to file path: FactHarbor.Specification.WebHome → FactHarbor/Specification/WebHome.md
        # Sanitize each path component for filesystem safety
        path_parts = page_id.split(".")
        safe_parts = [sanitize_path_component(part) for part in path_parts]
        file_path = "/".join(safe_parts) + ".md"
        md_file = output_dir / file_path

        # Create parent directories
        md_file.parent.mkdir(parents=True, exist_ok=True)

        # Get page content
        content_body = node.get("content", {}).get("body", "")

        # Convert xWiki → Markdown
        md_content = xwiki_to_markdown(content_body)

        # Write MD file
        try:
            with open(md_file, 'w', encoding='utf-8', newline='\n') as f:
                f.write(md_content)
        except Exception as e:
            print(f"Error writing {md_file}: {e}", file=sys.stderr)
            continue

        # Add to manifest
        manifest["pages"].append({
            "pageId": page_id,
            "mdFile": file_path,
            "parentId": node.get("parentId", ""),
            "title": node.get("title", ""),
            "syntax": node.get("syntax", "xwiki/2.1"),
            "xobjects": node.get("xobjects", [])
        })

        print(f"  [{idx}/{len(nodes)}] {page_id} → {file_path}")

    # Write manifest
    manifest_file = output_dir / "_metadata.json"
    with open(manifest_file, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Success!")
    print(f"  Converted: {len(manifest['pages'])} pages")
    print(f"  Output: {output_dir}/")
    print(f"  Metadata: {manifest_file}")
    print(f"\nNext steps:")
    print(f"  1. Edit MD files in {output_dir}/")
    print(f"  2. Add new .md files following the pageId.format → path/to/page.md pattern")
    print(f"  3. Run: python md_tree_to_json.py {output_dir}")

    return 0

def main():
    parser = argparse.ArgumentParser(description="Convert JSON fulltree to Markdown tree")
    parser.add_argument("json_file", help="Input JSON fulltree file")
    parser.add_argument("--output-dir", "-o", help="Output directory (default: <json_basename>_md)")

    args = parser.parse_args()

    json_path = Path(args.json_file)
    if not json_path.exists():
        print(f"Error: JSON file not found: {json_path}", file=sys.stderr)
        return 1

    # Determine output directory
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        stem = json_path.stem
        if stem.endswith("_fulltree"):
            stem = stem[:-9]
        output_dir = json_path.parent / f"{stem}_md"

    return create_md_tree(json_path, output_dir)

if __name__ == "__main__":
    sys.exit(main())
