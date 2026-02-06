#!/usr/bin/env python3
"""
xar_to_xwiki_tree.py - Convert XAR to .xwiki file tree (one-step)

Extracts xWiki pages from XAR and saves as .xwiki files in folder tree.
Files contain pure xWiki 2.1 syntax - ready to paste into xWiki editor.

Usage:
    python xar_to_xwiki_tree.py input.xar
    python xar_to_xwiki_tree.py input.xar --output custom_directory/

Output:
    Docs/xwiki-pages/FactHarbor/Specification/WebHome.xwiki
    (pageId: FactHarbor.Specification.WebHome)
"""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def sanitize_path_component(name: str) -> str:
    """Sanitize a path component for Windows/Unix filesystems."""
    replacements = {
        '<': '(lt)', '>': '(gt)', ':': '-', '"': "'",
        '/': '-', '\\': '-', '|': '-', '?': '', '*': ''
    }
    result = name
    for char, replacement in replacements.items():
        result = result.replace(char, replacement)
    return result.rstrip('. ')

def should_skip_page(page_id: str) -> bool:
    """Determine if a page should be skipped (system pages, preferences, etc.)."""
    # System spaces to skip
    system_spaces = ['CKEditor', 'Mail', 'Panels', 'XWiki']

    # Check if page is in a system space
    for space in system_spaces:
        if page_id.startswith(f"{space}."):
            return True

    # Skip WebPreferences pages (configuration pages, usually empty)
    if page_id.endswith('.WebPreferences'):
        return True

    return False

def main():
    parser = argparse.ArgumentParser(
        description="Convert XAR to .xwiki file tree (one-step)"
    )
    parser.add_argument("xar_file", help="Input XAR file path")
    parser.add_argument(
        "--output", "-o",
        default="Docs/xwiki-pages",
        help="Output directory (default: Docs/xwiki-pages)"
    )

    args = parser.parse_args()

    xar_path = Path(args.xar_file)
    if not xar_path.exists():
        print(f"Error: XAR file not found: {xar_path}", file=sys.stderr)
        return 1

    output_dir = Path(args.output)

    # Get script directory
    script_dir = Path(__file__).parent
    xar_to_json_script = script_dir / "xwiki_xar_to_fulltree_generic.py"

    if not xar_to_json_script.exists():
        print(f"Error: Converter not found: {xar_to_json_script}", file=sys.stderr)
        return 1

    print(f"Converting XAR to .xwiki tree...")
    print(f"Input: {xar_path}")
    print(f"Output: {output_dir}/")

    # Step 1: Convert XAR to JSON fulltree (in temp file)
    with tempfile.NamedTemporaryFile(mode='w', suffix='_fulltree.json', delete=False) as tmp:
        json_path = Path(tmp.name)

    try:
        print(f"\nStep 1/2: Extracting XAR to JSON...")
        cmd = [
            sys.executable,
            str(xar_to_json_script),
            str(xar_path),
            "--output", str(json_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"Error extracting XAR:", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
            return 1

        # Step 2: Convert JSON to .xwiki files
        print(f"Step 2/2: Creating .xwiki files...")

        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        nodes = data.get("nodes", [])
        if not nodes:
            print("Warning: No pages found in XAR", file=sys.stderr)
            return 1

        created_count = 0
        skipped_count = 0
        for node in nodes:
            page_id = node.get("pageId") or node.get("id")
            if not page_id:
                continue

            # Skip system pages and preferences
            if should_skip_page(page_id):
                skipped_count += 1
                continue

            # Get content body (pure xWiki syntax)
            content_body = node.get("content", {}).get("body", "")

            # Convert pageId to file path: FactHarbor.Specification.WebHome → FactHarbor/Specification/WebHome.xwiki
            path_parts = page_id.split(".")
            safe_parts = [sanitize_path_component(part) for part in path_parts]
            file_path = "/".join(safe_parts) + ".xwiki"
            xwiki_file = output_dir / file_path

            # Create parent directories
            xwiki_file.parent.mkdir(parents=True, exist_ok=True)

            # Write .xwiki file (pure content, no metadata)
            xwiki_file.write_text(content_body, encoding='utf-8')
            created_count += 1

            print(f"  [{created_count:3d}/{len(nodes)}] {page_id}")

        print(f"\n[SUCCESS] Created {created_count} .xwiki files")
        if skipped_count > 0:
            print(f"Skipped {skipped_count} system pages (WebPreferences, CKEditor, Mail, Panels, XWiki)")
        print(f"Location: {output_dir.absolute()}/")
        print(f"\nFiles are ready for:")
        print(f"  - Direct editing by AI agents")
        print(f"  - Copy-paste to xWiki editor")
        print(f"  - Git version control")

        return 0

    finally:
        # Clean up temp JSON file
        if json_path.exists():
            json_path.unlink()

if __name__ == "__main__":
    sys.exit(main())
