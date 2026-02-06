# xWiki HTML Viewer - WYSIWYG Preview Tool

**Simple offline viewer for `.xwiki` files with Mermaid diagram support.**

## Quick Start

```bash
# View any .xwiki file in browser
python xwiki_to_html_viewer.py ../xwiki-pages/FactHarbor/WebHome.xwiki

# Save HTML without opening browser
python xwiki_to_html_viewer.py ../xwiki-pages/FactHarbor/WebHome.xwiki --no-open --output preview.html

# Custom title
python xwiki_to_html_viewer.py file.xwiki --title "My Custom Title"
```

## Features

✅ **xWiki 2.1 Syntax Support:**
- Headers (= H1 =, == H2 ==, etc.)
- Text formatting (**bold**, //italic//, __underline__, --strike--)
- Inline code (##code##)
- Code blocks ({{{ }}})
- Links ([[url>>text]])
- Lists (* item)
- Info/Warning/Error boxes

✅ **Mermaid Diagram Rendering:**
- Flowcharts
- Sequence diagrams
- Gantt charts
- ERD diagrams
- All Mermaid diagram types

✅ **Clean, Readable Output:**
- Responsive design
- Syntax highlighting for code
- Professional styling
- Print-friendly

## Usage Examples

### View a single page

```bash
cd Docs/xwiki-export
python xwiki_to_html_viewer.py ../xwiki-pages/FactHarbor/Specification/WebHome.xwiki
```

**Result:** Opens in browser with WYSIWYG rendering

### Generate HTML for sharing

```bash
python xwiki_to_html_viewer.py ../xwiki-pages/FactHarbor/WebHome.xwiki \
    --output FactHarbor_Homepage.html \
    --title "FactHarbor Documentation" \
    --no-open
```

**Result:** Creates standalone HTML file you can share

### Preview all pages in a directory

```bash
# Bash script to preview all pages
for file in ../xwiki-pages/FactHarbor/**/*.xwiki; do
    python xwiki_to_html_viewer.py "$file" --no-open --output "previews/$(basename $file .xwiki).html"
done
```

## Command-Line Options

| Option | Description |
|--------|-------------|
| `xwiki_file` | Input `.xwiki` file path (required) |
| `--output`, `-o` | Output HTML file path (default: temp file) |
| `--no-open` | Don't open browser automatically |
| `--title`, `-t` | Custom page title (default: filename) |

## How It Works

1. **Parse xWiki Syntax:** Converts xWiki 2.1 markup to HTML
2. **Include Mermaid.js:** Adds Mermaid library from CDN
3. **Apply Styling:** Professional CSS for readability
4. **Open in Browser:** Displays WYSIWYG preview

## Supported xWiki Syntax

### Headers

```xwiki
= Header 1 =
== Header 2 ==
=== Header 3 ===
```

### Text Formatting

```xwiki
**bold**
//italic//
__underline__
--strikethrough--
##inline code##
```

### Links

```xwiki
[[https://example.com>>Link Text]]
[[Page Name]]
```

### Lists

```xwiki
* Item 1
* Item 2
** Nested item
```

### Code Blocks

```xwiki
{{{
code block
multiple lines
}}}
```

### Mermaid Diagrams

```xwiki
{{mermaid}}
graph TD
  A[Start] --> B[Process]
  B --> C[End]
{{/mermaid}}
```

### Info Boxes

```xwiki
{{info}}
This is an info message.
{{/info}}

{{warning}}
This is a warning.
{{/warning}}

{{error}}
This is an error message.
{{/error}}
```

## Limitations

**Not yet supported:**
- Tables (xWiki table syntax)
- Advanced macros
- Nested lists (limited)
- TOC generation
- Image attachments

**For full xWiki rendering:**
Use xWiki itself (import XAR and view in browser)

## Integration with Workflow

### As part of documentation editing

```bash
# 1. Edit .xwiki file
code ../xwiki-pages/FactHarbor/Specification/Architecture.xwiki

# 2. Preview changes
python xwiki_to_html_viewer.py ../xwiki-pages/FactHarbor/Specification/Architecture.xwiki

# 3. Commit when satisfied
git add ../xwiki-pages/
git commit -m "docs: update architecture"
```

### For reviewing changes

```bash
# Preview before committing
python xwiki_to_html_viewer.py ../xwiki-pages/FactHarbor/WebHome.xwiki

# Generate HTML for review
python xwiki_to_html_viewer.py ../xwiki-pages/FactHarbor/WebHome.xwiki \
    --output review.html --no-open

# Share review.html with team
```

## Troubleshooting

### Browser doesn't open

**Solution:** Use `--output` to save HTML, then open manually:
```bash
python xwiki_to_html_viewer.py file.xwiki --output preview.html
# Then open preview.html in your browser
```

### Mermaid diagrams don't render

**Issue:** Internet connection required for Mermaid CDN

**Solution:** Diagrams will show as text if offline. For offline viewing, download Mermaid.js locally and update script.

### Syntax not rendering correctly

**Issue:** Advanced xWiki syntax may not be fully supported

**Solution:** For complex pages, use xWiki itself (import XAR) for full fidelity

## Alternative Viewers

**For full xWiki compatibility:**
1. Generate XAR: `python xwiki_tree_to_xar.py ../xwiki-pages/`
2. Import to xWiki: xWiki → Administration → Import
3. View in browser with full WYSIWYG

**For Markdown fans:**
Convert to Markdown and use any MD viewer (Typora, Obsidian, VS Code)

---

## Technical Details

**Dependencies:**
- Python 3.8+
- Web browser
- Internet (for Mermaid.js CDN)

**Output:**
- Standalone HTML file
- No external dependencies (except Mermaid CDN)
- Works offline (except diagrams)

**Performance:**
- Fast conversion (<1 second for most pages)
- Instant browser preview
- No server required

---

**Created:** 2026-02-06
**Version:** 1.0
**License:** Same as FactHarbor project
