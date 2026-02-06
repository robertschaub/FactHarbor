#!/usr/bin/env python3
"""
xwiki_to_html_viewer.py - Convert .xwiki file to HTML with WYSIWYG preview

Converts xWiki 2.1 syntax to HTML and opens in browser.
Includes Mermaid.js for diagram rendering.

Usage:
    python xwiki_to_html_viewer.py path/to/file.xwiki
    python xwiki_to_html_viewer.py path/to/file.xwiki --output custom.html
    python xwiki_to_html_viewer.py path/to/file.xwiki --no-open
"""

import argparse
import os
import re
import sys
import tempfile
import webbrowser
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def xwiki_to_html(xwiki_content: str, title: str = "xWiki Preview") -> str:
    """
    Convert xWiki 2.1 syntax to HTML.
    Supports: headers, bold, italic, lists, links, code, Mermaid diagrams.
    """
    html = xwiki_content

    # Headers: = H1 = → <h1>H1</h1>
    for level in range(6, 0, -1):
        equals = "=" * level
        pattern = rf'^{equals}\s+(.+?)\s+{equals}\s*$'
        replacement = f'<h{level}>\\1</h{level}>'
        html = re.sub(pattern, replacement, html, flags=re.MULTILINE)

    # Bold: **text** → <strong>text</strong>
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)

    # Italic: //text// → <em>text</em>
    html = re.sub(r'//(.+?)//', r'<em>\1</em>', html)

    # Underline: __text__ → <u>text</u>
    html = re.sub(r'__(.+?)__', r'<u>\1</u>', html)

    # Strikethrough: --text-- → <del>text</del>
    html = re.sub(r'--(.+?)--', r'<del>\1</del>', html)

    # Code inline: ##code## → <code>code</code>
    html = re.sub(r'##(.+?)##', r'<code>\1</code>', html)

    # Links: [[url>>text]] → <a href="url">text</a>
    html = re.sub(r'\[\[(.+?)>>(.+?)\]\]', r'<a href="\1" target="_blank">\2</a>', html)

    # Links: [[text]] → <a href="text">text</a>
    html = re.sub(r'\[\[(.+?)\]\]', r'<a href="\1" target="_blank">\1</a>', html)

    # Mermaid diagrams: {{mermaid}} ... {{/mermaid}} → <pre class="mermaid">...</pre>
    def replace_mermaid(match):
        diagram_content = match.group(1).strip()
        return f'<div class="mermaid">\n{diagram_content}\n</div>'

    html = re.sub(
        r'\{\{mermaid\}\}(.+?)\{\{/mermaid\}\}',
        replace_mermaid,
        html,
        flags=re.DOTALL
    )

    # Code blocks: {{{ ... }}} → <pre><code>...</code></pre>
    def replace_code_block(match):
        code_content = match.group(1).strip()
        # Escape HTML in code blocks
        code_content = code_content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        return f'<pre><code>{code_content}</code></pre>'

    html = re.sub(
        r'\{\{\{(.+?)\}\}\}',
        replace_code_block,
        html,
        flags=re.DOTALL
    )

    # Unordered lists: * item → <ul><li>item</li></ul>
    # This is simplified - proper implementation would handle nesting
    lines = html.split('\n')
    in_list = False
    processed_lines = []

    for line in lines:
        if re.match(r'^\* ', line):
            if not in_list:
                processed_lines.append('<ul>')
                in_list = True
            item = re.sub(r'^\* ', '', line)
            processed_lines.append(f'  <li>{item}</li>')
        else:
            if in_list:
                processed_lines.append('</ul>')
                in_list = False
            processed_lines.append(line)

    if in_list:
        processed_lines.append('</ul>')

    html = '\n'.join(processed_lines)

    # Paragraphs: double newline → <p>
    # Split by double newlines, but preserve existing HTML tags
    paragraphs = re.split(r'\n\n+', html)
    processed_paragraphs = []

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        # Don't wrap if already has block-level tags
        if re.match(r'^<(h\d|ul|ol|pre|div|table)', para):
            processed_paragraphs.append(para)
        else:
            processed_paragraphs.append(f'<p>{para}</p>')

    html = '\n\n'.join(processed_paragraphs)

    # Info/Warning/Error boxes
    html = re.sub(
        r'\{\{info\}\}(.+?)\{\{/info\}\}',
        r'<div class="box info">\1</div>',
        html,
        flags=re.DOTALL
    )
    html = re.sub(
        r'\{\{warning\}\}(.+?)\{\{/warning\}\}',
        r'<div class="box warning">\1</div>',
        html,
        flags=re.DOTALL
    )
    html = re.sub(
        r'\{\{error\}\}(.+?)\{\{/error\}\}',
        r'<div class="box error">\1</div>',
        html,
        flags=re.DOTALL
    )

    return html

def create_html_page(body_html: str, title: str = "xWiki Preview") -> str:
    """Create complete HTML page with Mermaid.js and styling."""

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>

    <!-- Mermaid.js for diagram rendering -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({{ startOnLoad: true, theme: 'default' }});
    </script>

    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }}

        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}

        h1, h2, h3, h4, h5, h6 {{
            margin: 1.5em 0 0.5em 0;
            line-height: 1.3;
            color: #2c3e50;
        }}

        h1 {{ font-size: 2.5em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }}
        h2 {{ font-size: 2em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3em; }}
        h3 {{ font-size: 1.75em; }}
        h4 {{ font-size: 1.5em; }}
        h5 {{ font-size: 1.25em; }}
        h6 {{ font-size: 1em; }}

        p {{
            margin: 1em 0;
        }}

        strong {{
            font-weight: 600;
            color: #2c3e50;
        }}

        em {{
            font-style: italic;
            color: #555;
        }}

        code {{
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: "Courier New", Courier, monospace;
            font-size: 0.9em;
            color: #e74c3c;
        }}

        pre {{
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 1.5em 0;
        }}

        pre code {{
            background: none;
            color: inherit;
            padding: 0;
            font-size: 0.9em;
        }}

        ul, ol {{
            margin: 1em 0;
            padding-left: 2em;
        }}

        li {{
            margin: 0.5em 0;
        }}

        a {{
            color: #3498db;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
        }}

        a:hover {{
            border-bottom-color: #3498db;
        }}

        .box {{
            padding: 15px;
            margin: 1.5em 0;
            border-radius: 5px;
            border-left: 4px solid;
        }}

        .box.info {{
            background: #e8f4f8;
            border-color: #3498db;
            color: #2c3e50;
        }}

        .box.warning {{
            background: #fff4e6;
            border-color: #f39c12;
            color: #2c3e50;
        }}

        .box.error {{
            background: #fdeaea;
            border-color: #e74c3c;
            color: #2c3e50;
        }}

        .mermaid {{
            margin: 2em 0;
            text-align: center;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            border: 1px solid #e0e0e0;
        }}

        /* Print styles */
        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            .container {{
                box-shadow: none;
                padding: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        {body_html}
    </div>
</body>
</html>"""

    return html_template

def main():
    parser = argparse.ArgumentParser(
        description="Convert xWiki file to HTML with WYSIWYG preview"
    )
    parser.add_argument("xwiki_file", help="Input .xwiki file path")
    parser.add_argument(
        "--output", "-o",
        help="Output HTML file (default: temp file)"
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Don't open browser automatically"
    )
    parser.add_argument(
        "--title", "-t",
        help="Page title (default: derived from filename)"
    )

    args = parser.parse_args()

    xwiki_path = Path(args.xwiki_file)
    if not xwiki_path.exists():
        print(f"Error: File not found: {xwiki_path}", file=sys.stderr)
        return 1

    # Read xWiki content
    try:
        xwiki_content = xwiki_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        return 1

    # Determine title
    if args.title:
        title = args.title
    else:
        title = xwiki_path.stem.replace('_', ' ')

    print(f"Converting: {xwiki_path.name}")
    print(f"Title: {title}")

    # Convert to HTML
    body_html = xwiki_to_html(xwiki_content, title)
    full_html = create_html_page(body_html, title)

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        # Create temp file
        temp_fd, temp_path = tempfile.mkstemp(suffix='.html', prefix='xwiki_preview_')
        os.close(temp_fd)
        output_path = Path(temp_path)

    # Write HTML file
    try:
        output_path.write_text(full_html, encoding='utf-8')
        print(f"Created: {output_path}")
    except Exception as e:
        print(f"Error writing HTML: {e}", file=sys.stderr)
        return 1

    # Open in browser
    if not args.no_open:
        print("Opening in browser...")
        file_url = output_path.absolute().as_uri()
        webbrowser.open(file_url)

    print(f"\n✓ Preview ready!")
    if not args.output:
        print(f"  (Temp file: {output_path})")

    return 0

if __name__ == "__main__":
    sys.exit(main())
