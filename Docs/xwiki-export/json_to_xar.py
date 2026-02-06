#!/usr/bin/env python3
"""
json_to_xar.py - Convert JSON fulltree to XAR

Simple wrapper around xwiki_fulltree_to_xar_ROBUST.py
Generates importable XWiki XAR from JSON fulltree.

Usage:
    python json_to_xar.py input_fulltree.json
    python json_to_xar.py input_fulltree.json --output custom.xar
"""

import argparse
import os
import sys
import subprocess
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Convert JSON fulltree to XWiki XAR")
    parser.add_argument("json_file", help="Input JSON fulltree file path")
    parser.add_argument("--output", "-o", help="Output XAR file (default: <json_basename>.xar)")

    args = parser.parse_args()

    json_path = Path(args.json_file)
    if not json_path.exists():
        print(f"Error: JSON file not found: {json_path}", file=sys.stderr)
        return 1

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        # Remove _fulltree suffix if present
        stem = json_path.stem
        if stem.endswith("_fulltree"):
            stem = stem[:-9]  # Remove "_fulltree"
        output_path = json_path.parent / f"{stem}.xar"

    # Get the converter script path (same directory as this script)
    script_dir = Path(__file__).parent
    converter = script_dir / "xwiki_fulltree_to_xar_ROBUST.py"

    if not converter.exists():
        print(f"Error: Converter script not found: {converter}", file=sys.stderr)
        return 1

    # Build command (script uses positional args: input.json output.xar)
    cmd = [
        sys.executable,
        str(converter),
        str(json_path),
        str(output_path)
    ]

    # Run conversion
    print(f"Converting: {json_path.name}")
    print(f"Output: {output_path}")

    result = subprocess.run(cmd)

    if result.returncode == 0:
        print(f"\n✓ Success! Created: {output_path}")
        print(f"  Size: {output_path.stat().st_size / 1024:.1f} KB")
    else:
        print(f"\n✗ Conversion failed with code {result.returncode}", file=sys.stderr)
        return result.returncode

    return 0

if __name__ == "__main__":
    sys.exit(main())
