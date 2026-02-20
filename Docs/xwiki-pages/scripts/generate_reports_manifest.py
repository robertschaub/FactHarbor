#!/usr/bin/env python3
"""
generate_reports_manifest.py

Scan Docs/TESTREPORTS/*.html and generate reports-manifest.json
with structured metadata extracted from each HTML report.

Extraction priority:
  1. <meta name="fh:*"> tags (new reports with embedded metadata)
  2. DOM fallback: parse <title>, .verdict-badge, .meter-value, etc.

Usage (from repo root):
    python Docs/xwiki-pages/scripts/generate_reports_manifest.py
    python Docs/xwiki-pages/scripts/generate_reports_manifest.py --reports-dir path/to/reports
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


def find_repo_root() -> Path:
    """Walk up from script location to find .git directory."""
    p = Path(__file__).resolve().parent
    while p != p.parent:
        if (p / '.git').exists():
            return p
        p = p.parent
    return Path.cwd()


def _extract_meta_tag(html: str, name: str) -> Optional[str]:
    """Extract content from <meta name="fh:xxx" content="...">."""
    pattern = rf'<meta\s+name="{re.escape(name)}"\s+content="([^"]*)"'
    m = re.search(pattern, html, re.IGNORECASE)
    return m.group(1) if m else None


def _extract_title_claim(html: str) -> Optional[str]:
    """Extract claim from <title>FactHarbor Report — CLAIM</title>."""
    m = re.search(r'<title>[^<]*?\s*[—–-]\s*(.+?)</title>', html, re.IGNORECASE)
    return m.group(1).strip() if m else None


def _extract_input_claim(html: str) -> Optional[str]:
    """Extract claim from <div class="input-claim">CLAIM</div>."""
    m = re.search(r'class="input-claim"[^>]*>([^<]+)<', html)
    return m.group(1).strip() if m else None


def _extract_verdict_badge(html: str) -> Optional[str]:
    """Extract verdict from <div class="verdict-badge ...">VERDICT</div>."""
    m = re.search(r'class="verdict-badge[^"]*"[^>]*>([^<]+)<', html)
    return m.group(1).strip() if m else None


def _extract_meter_values(html: str) -> tuple[Optional[int], Optional[int]]:
    """Extract truth% and confidence% from meter-value divs.
    First meter-value in .meter (not .meter-conf) = truth.
    meter-value in .meter-conf = confidence.
    """
    truth = None
    confidence = None

    # All meter-value occurrences (skip CSS definitions by looking for > before the value)
    meter_vals = re.findall(r'class="meter-value[^"]*"[^>]*>(\d+)%<', html)
    if len(meter_vals) >= 1:
        truth = int(meter_vals[0])
    if len(meter_vals) >= 2:
        confidence = int(meter_vals[1])

    return truth, confidence


def _extract_model(html: str) -> Optional[str]:
    """Extract LLM model from chip containing robot emoji + model name."""
    # &#129302; is 🤖 (robot face emoji)
    m = re.search(r'class="chip chip-gray"[^>]*>(?:&#129302;|🤖)\s*([^<]+)<', html)
    return m.group(1).strip() if m else None


def _extract_date(html: str) -> Optional[str]:
    """Extract created date from header metadata."""
    m = re.search(r'Created:\s*(\d{4}-\d{2}-\d{2})', html)
    return m.group(1) if m else None


def _unescape_html(s: str) -> str:
    """Unescape basic HTML entities."""
    s = s.replace('&amp;', '&')
    s = s.replace('&lt;', '<')
    s = s.replace('&gt;', '>')
    s = s.replace('&quot;', '"')
    s = s.replace('&#39;', "'")
    return s


def extract_metadata(filepath: Path) -> Dict[str, Any]:
    """Extract report metadata from an HTML file."""
    html = filepath.read_text(encoding='utf-8')

    # Meta tags are in <head> (first ~5KB), but verdict/meters are after
    # the inlined CSS which can be 10KB+. Read first 20KB to cover both.
    head_section = html[:5000]
    body_section = html[:20000]

    result: Dict[str, Any] = {}

    # Priority 1: <meta name="fh:*"> tags
    claim = _extract_meta_tag(head_section, 'fh:claim')
    verdict = _extract_meta_tag(head_section, 'fh:verdict')
    truth = _extract_meta_tag(head_section, 'fh:truth')
    confidence = _extract_meta_tag(head_section, 'fh:confidence')
    date = _extract_meta_tag(head_section, 'fh:date')
    model = _extract_meta_tag(head_section, 'fh:model')

    # Priority 2: DOM fallback for fields not found via meta tags
    if not claim:
        claim = _extract_input_claim(body_section) or _extract_title_claim(head_section)
    if not verdict:
        verdict = _extract_verdict_badge(body_section)
    if truth is None and confidence is None:
        t, c = _extract_meter_values(body_section)
        if truth is None:
            truth = str(t) if t is not None else None
        if confidence is None:
            confidence = str(c) if c is not None else None
    if not model:
        model = _extract_model(body_section)
    if not date:
        date = _extract_date(body_section)

    if claim:
        result['claim'] = _unescape_html(claim)
    if verdict:
        result['verdict'] = verdict
    if truth is not None:
        result['truth'] = int(truth)
    if confidence is not None:
        result['confidence'] = int(confidence)
    if date:
        result['date'] = date
    if model:
        result['model'] = model

    return result


def generate_manifest(reports_dir: Path) -> Dict[str, Any]:
    """Scan HTML files in reports_dir and build the manifest."""
    reports: Dict[str, Any] = {}

    html_files = sorted(reports_dir.glob('*.html'), key=lambda p: p.name.lower())
    for filepath in html_files:
        print(f'  Parsing {filepath.name} ...', end='')
        try:
            meta = extract_metadata(filepath)
            reports[filepath.name] = meta
            claim_preview = meta.get('claim', '?')
            if len(claim_preview) > 50:
                claim_preview = claim_preview[:47] + '...'
            print(f' "{claim_preview}" -> {meta.get("verdict", "?")}')
        except Exception as e:
            print(f' ERROR: {e}', file=sys.stderr)
            reports[filepath.name] = {}

    manifest = {
        'generated': datetime.now(tz=timezone.utc).isoformat().replace('+00:00', 'Z'),
        'reports': reports
    }
    return manifest


def main():
    parser = argparse.ArgumentParser(
        description='Generate reports-manifest.json from HTML test reports'
    )
    parser.add_argument('--reports-dir',
        default=None,
        help='Path to reports directory (default: Docs/TESTREPORTS)')
    parser.add_argument('--output', '-o',
        default=None,
        help='Output file path (default: <reports-dir>/reports-manifest.json)')

    args = parser.parse_args()

    repo_root = find_repo_root()
    reports_dir = Path(args.reports_dir) if args.reports_dir else \
                  repo_root / 'Docs' / 'TESTREPORTS'
    output_path = Path(args.output) if args.output else \
                  reports_dir / 'reports-manifest.json'

    if not reports_dir.is_dir():
        print(f'Error: reports directory not found: {reports_dir}', file=sys.stderr)
        sys.exit(1)

    print(f'Scanning {reports_dir} for HTML reports ...')
    manifest = generate_manifest(reports_dir)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    count = len(manifest['reports'])
    size = output_path.stat().st_size
    print(f'\nDone! {count} reports -> {output_path} ({size:,} bytes)')


if __name__ == '__main__':
    main()
