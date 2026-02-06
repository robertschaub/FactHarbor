#!/usr/bin/env python3
"""
xar_to_json.py - Convert XAR to JSON fulltree

Simple wrapper around xwiki_xar_to_fulltree_generic.py
Preserves all xWiki metadata for round-trip conversion.

Usage:
    python xar_to_json.py input.xar
    python xar_to_json.py input.xar --output custom.json
"""

import argparse
import os
import sys
import subprocess
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Convert XWiki XAR to JSON fulltree")
    parser.add_argument("xar_file", help="Input XAR file path")
    parser.add_argument("--output", "-o", help="Output JSON file (default: <xar_basename>_fulltree.json)")
    parser.add_argument("--sort", action="store_true", help="Sort pages by pageId")

    args = parser.parse_args()

    xar_path = Path(args.xar_file)
    if not xar_path.exists():
        print(f"Error: XAR file not found: {xar_path}", file=sys.stderr)
        return 1

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = xar_path.parent / f"{xar_path.stem}_fulltree.json"

    # Get the converter script path (same directory as this script)
    script_dir = Path(__file__).parent
    converter = script_dir / "xwiki_xar_to_fulltree_generic.py"

    if not converter.exists():
        print(f"Error: Converter script not found: {converter}", file=sys.stderr)
        return 1

    # Build command
    cmd = [
        sys.executable,
        str(converter),
        str(xar_path),
        "--output", str(output_path)
    ]

    if args.sort:
        cmd.append("--sort")

    # Run conversion
    print(f"Converting: {xar_path.name}")
    print(f"Output: {output_path}")

    result = subprocess.run(cmd)

    if result.returncode == 0:
        print(f"\n[SUCCESS] Created: {output_path}")
        print(f"  Size: {output_path.stat().st_size / 1024:.1f} KB")
    else:
        print(f"\n[ERROR] Conversion failed with code {result.returncode}", file=sys.stderr)
        return result.returncode

    return 0

if __name__ == "__main__":
    sys.exit(main())
