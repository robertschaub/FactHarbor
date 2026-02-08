# XWiki ↔ Markdown Conversion Workflow

Complete workflow for editing xWiki content using Markdown files.

## Quick Start

```bash
# 1. Convert XAR to JSON
python xar_to_json.py FactHarbor_Spec_and_Impl_06.Feb.26.xar

# 2. Convert JSON to Markdown tree
python json_to_md_tree.py FactHarbor_Spec_and_Impl_06.Feb.26_fulltree.json

# 3. Edit Markdown files in: FactHarbor_Spec_and_Impl_06.Feb.26_md/
#    - Edit existing .md files
#    - Add new .md files following the pageId format

# 4. Merge Markdown changes back to JSON
python md_tree_to_json.py FactHarbor_Spec_and_Impl_06.Feb.26_md/

# 5. Convert updated JSON to XAR
python json_to_xar.py FactHarbor_Spec_and_Impl_06.Feb.26_fulltree_updated.json

# 6. Import the new XAR into xWiki
```

## Script Details

### 1. `xar_to_json.py` - XAR → JSON

Converts xWiki XAR export to JSON fulltree format.

**Usage:**
```bash
python xar_to_json.py input.xar
python xar_to_json.py input.xar --output custom.json
python xar_to_json.py input.xar --sort  # Sort pages by pageId
```

**Output:**
- JSON file with all pages, metadata, and structure
- Preserves: pageId, parentId, title, syntax, xobjects, content

---

### 2. `json_to_md_tree.py` - JSON → Markdown Tree

Converts JSON fulltree to Markdown files.

**Usage:**
```bash
python json_to_md_tree.py input_fulltree.json
python json_to_md_tree.py input_fulltree.json --output-dir ./my_pages
```

**Output:**
- Directory tree with `.md` files
- `_metadata.json` - Preserves page metadata for round-trip
- File structure: `FactHarbor/Specification/WebHome.md`

**Conversion (xWiki → Markdown):**
- Headers: `= H1 =` → `# H1`
- Italic: `//text//` → `*text*`
- Bold: `**text**` → `**text**`
- Code: `##code##` → `` `code` ``
- Code blocks: `{{code language="py"}}` → ` ```py `
- Mermaid: `{{mermaid}}` → ` ```mermaid `
- Links: `[[url||text]]` → `[text](url)`
- Images: `[[image:url||alt="text"]]` → `![text](url)`

---

### 3. Edit Markdown Files

**Edit existing files:**
- Open any `.md` file in your editor
- Make changes using standard Markdown syntax
- Mermaid diagrams work as ` ```mermaid ` blocks

**Add new pages:**
- Create new `.md` file following the path pattern
- Example: `FactHarbor/NewFeature/Overview.md`
  - Will become pageId: `FactHarbor.NewFeature.Overview`
  - Parent will be: `FactHarbor.NewFeature`

**Delete pages:**
- Simply delete the `.md` file
- Will be removed from JSON on merge

---

### 4. `md_tree_to_json.py` - Markdown → JSON

Merges Markdown changes back into JSON fulltree.

**Usage:**
```bash
python md_tree_to_json.py markdown_dir/
python md_tree_to_json.py markdown_dir/ --output custom_updated.json
```

**Output:**
- Updated JSON fulltree with your Markdown changes
- New pages added with proper pageId and parentId
- Deleted pages removed

**Conversion (Markdown → xWiki):**
- Headers: `# H1` → `= H1 =`
- Italic: `*text*` → `//text//`
- Bold: `**text**` → `**text**`
- Code: `` `code` `` → `##code##`
- Code blocks: ` ```py ` → `{{code language="py"}}`
- Mermaid: ` ```mermaid ` → `{{mermaid}}` (with empty lines)
- Links: `[text](url)` → `[[url||text]]`
- Images: `![text](url)` → `[[image:url||alt="text"]]`

---

### 5. `json_to_xar.py` - JSON → XAR

Converts JSON fulltree back to importable XAR.

**Usage:**
```bash
python json_to_xar.py updated_fulltree.json
python json_to_xar.py updated_fulltree.json --output my_export.xar
```

**Output:**
- XAR file ready for xWiki import
- Preserves all metadata, structure, and xobjects

---

## Complete Example

```bash
# Starting with: FactHarbor_Spec_and_Impl_06.Feb.26.xar

# Step 1: XAR to JSON
python xar_to_json.py FactHarbor_Spec_and_Impl_06.Feb.26.xar
# Creates: FactHarbor_Spec_and_Impl_06.Feb.26_fulltree.json

# Step 2: JSON to Markdown
python json_to_md_tree.py FactHarbor_Spec_and_Impl_06.Feb.26_fulltree.json
# Creates: FactHarbor_Spec_and_Impl_06.Feb.26_md/
#   ├── _metadata.json
#   ├── FactHarbor/
#   │   ├── Specification/
#   │   │   └── WebHome.md
#   │   ├── Implementation_Roadmap/
#   │   │   └── WebHome.md
#   │   └── ...

# Step 3: Edit files
# - Edit FactHarbor/Specification/WebHome.md
# - Add FactHarbor/NewPage.md
# - Delete FactHarbor/OldPage.md

# Step 4: Markdown back to JSON
python md_tree_to_json.py FactHarbor_Spec_and_Impl_06.Feb.26_md/
# Creates: FactHarbor_Spec_and_Impl_06.Feb.26_fulltree_updated.json

# Step 5: JSON to XAR
python json_to_xar.py FactHarbor_Spec_and_Impl_06.Feb.26_fulltree_updated.json
# Creates: FactHarbor_Spec_and_Impl_06.Feb.26_updated.xar

# Step 6: Import to xWiki
# - Open xWiki → Administration → Import
# - Upload: FactHarbor_Spec_and_Impl_06.Feb.26_updated.xar
# - Select pages and import
```

## Important Notes

### Metadata Preservation

The `_metadata.json` file is **critical** for round-trip conversion:
- Preserves pageId, parentId, syntax, xobjects
- Tracks which pages existed originally
- Handles page hierarchy

**Do not delete `_metadata.json`!**

### Page Hierarchy

Pages follow the dot-separated pageId pattern:
- `FactHarbor.Specification.Requirements.WebHome`
- Becomes file: `FactHarbor/Specification/Requirements/WebHome.md`
- Parent is: `FactHarbor.Specification.Requirements`

### Mermaid Diagrams

Mermaid diagrams convert automatically:
- In Markdown: ` ```mermaid ... ``` `
- In xWiki: `{{mermaid}}...{{/mermaid}}` with empty lines

### New Pages

When you create a new `.md` file:
1. Place it in the correct directory for its parent
2. Use proper file path → pageId mapping
3. The script auto-assigns pageId and parentId based on path

Example:
- Create: `FactHarbor/NewSection/Introduction.md`
- Auto-assigned pageId: `FactHarbor.NewSection.Introduction`
- Auto-assigned parentId: `FactHarbor.NewSection`

## Troubleshooting

### Missing metadata.json

**Error:** `Manifest not found: _metadata.json`

**Solution:** You must run `json_to_md_tree.py` first to create the metadata file.

### Original JSON not found

**Error:** `Original JSON not found`

**Solution:** Keep the original `_fulltree.json` file in the same directory as the `_md/` folder.

### Conversion issues

If Markdown doesn't convert correctly:
1. Check the xWiki syntax in original pages
2. Complex macros may need manual adjustment
3. File an issue with example content

## Files Overview

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `xar_to_json.py` | Extract XAR | .xar | .json |
| `json_to_md_tree.py` | Export to Markdown | .json | .md tree |
| `md_tree_to_json.py` | Import from Markdown | .md tree | .json |
| `json_to_xar.py` | Package XAR | .json | .xar |

## See Also

- [README.md](README.md) - Current XAR exports
- [GlobalMasterKnowledge_for_xWiki.md](../AGENTS/GlobalMasterKnowledge_for_xWiki.md) - Full xWiki rules

---

**Questions?** Check the script help:
```bash
python xar_to_json.py --help
python json_to_md_tree.py --help
python md_tree_to_json.py --help
python json_to_xar.py --help
```
