# Documentation Consolidation & Cleanup - Tech Writer Instructions

## 🔑 Access & Setup

**You have direct access to all files and systems:**

### Required Access (Project Lead will provide)

- **Git Repository:** Full read/write access to the FactHarbor repository
  - Clone URL: [Project lead will provide]
  - Branch to work on: `main` (or as directed)
  - You can commit, push, create branches as needed

- **xWiki:** Admin or edit access to the xWiki instance
  - URL: [Project lead will provide]
  - Login credentials: [Project lead will provide]
  - You can create, edit, delete, and reorganize pages

- **Local File System:** Direct access to all documentation files
  - `Docs/` directory in the git repository
  - `Docs/WIP/`, `Docs/ARCHIVE/`, `Docs/STATUS/` subdirectories
  - All `.md`, `.xar`, and other documentation files

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone [repo-url]
   cd FactHarbor
   ```

2. **Verify Python is installed** (for conversion tools):
   ```bash
   python --version  # Should be 3.8 or higher
   ```

3. **Navigate to conversion scripts:**
   ```bash
   cd Docs/xwiki-export
   ls *.py  # Should see 6 Python scripts
   ```

4. **Test access to xWiki:**
   - Open the xWiki URL
   - Log in with provided credentials
   - Verify you can edit pages

5. **Read the workflow documentation:**
   - `Docs/xwiki-export/WORKFLOW.md` - How to use conversion tools
   - `Docs/ROLES_AND_RESPONSIBILITIES.md` - Your role vs project lead's role

**You are authorized to:**
- ✅ Read, edit, create, and delete files in `Docs/`
- ✅ Create, edit, delete, and reorganize xWiki pages
- ✅ Run all conversion scripts
- ✅ Commit changes to git (though final push may require project lead approval)
- ✅ Archive outdated content
- ✅ Reorganize directory structures

**Consult with project lead before:**
- ⚠️ Deleting content that seems important but unclear
- ⚠️ Making decisions about technical accuracy
- ⚠️ Changing official terminology or glossary terms
- ⚠️ Pushing commits to remote (coordinate with project lead)

---

## Objective

Consolidate and clean up all FactHarbor documentation so that:
1. **xWiki is the single source of truth** for all project documentation
2. **Local Markdown files are available** for offline work and version control
3. **No duplicate or scattered documentation** across multiple locations

## Current State

Documentation is currently scattered across:
- xWiki (some content)
- `Docs/WIP/` (work-in-progress markdown files)
- `Docs/ARCHIVE/` (old documentation)
- `Docs/STATUS/` (status reports)
- Various other locations

## Goal State

**Single workflow:**
```
xWiki (master) ↔ Local Markdown files (for editing/version control)
```

All documentation should be:
- ✅ In xWiki as the authoritative source
- ✅ Available as .md files in `Docs/xwiki-export/<name>_md/` for local editing
- ✅ Version controlled in git (the .md files)
- ✅ Organized with clear structure and no duplication

## Available Tools

We have a complete XAR ↔ Markdown conversion workflow:

### Extract from xWiki to Markdown
```bash
cd Docs/xwiki-export

# 1. Export current xWiki content as XAR (from xWiki admin UI)
# 2. Convert XAR to Markdown
python xar_to_json.py YourExport.xar
python json_to_md_tree.py YourExport_fulltree.json

# Result: YourExport_md/ directory with all pages as .md files
```

### Edit Markdown and Import Back to xWiki
```bash
# 1. Edit .md files in YourExport_md/
# 2. Convert back to XAR
python md_tree_to_json.py YourExport_md/
python json_to_xar.py YourExport_fulltree_updated.json

# 3. Import updated XAR into xWiki
# Result: YourExport_updated.xar ready for import
```

**Full documentation:** See [`Docs/xwiki-export/WORKFLOW.md`](xwiki-export/WORKFLOW.md)

## Tasks

### 1. Inventory Current Documentation

**Review and categorize all documentation:**

- [ ] List all content currently in xWiki
- [ ] List all markdown files in `Docs/WIP/`
- [ ] List all content in `Docs/ARCHIVE/`
- [ ] List all content in `Docs/STATUS/`
- [ ] Identify duplicates, outdated content, and gaps

**Deliverable:** Inventory spreadsheet or markdown table with:
- Document name
- Current location
- Status (current/outdated/duplicate)
- Proposed action (keep/merge/archive/delete)

### 2. Define xWiki Structure

**Design the target xWiki page hierarchy:**

```
FactHarbor/
├── Overview & Mission
├── Specification/
│   ├── Requirements/
│   ├── Architecture/
│   ├── Data Model/
│   ├── Workflows/
│   └── Diagrams/
├── Implementation/
│   ├── Roadmap/
│   ├── Development Guidance/
│   └── Status Reports/
├── Analysis Reports/
│   └── (Individual analysis reports)
├── Organisation/
│   ├── Team & Governance/
│   └── License & Legal/
└── Archive/
    └── (Historical documentation)
```

**Deliverable:** Proposed xWiki structure (as text or diagram)

### 3. Consolidate Content

**For each document:**

1. **Merge duplicates** - If the same content exists in multiple places, create one canonical version
2. **Update outdated content** - Revise to match current state (check with project lead if unsure)
3. **Archive old versions** - Move superseded content to Archive space with clear labels
4. **Fix broken links** - Update all internal cross-references
5. **Standardize formatting** - Use consistent heading levels, terminology, structure

**Guidelines:**
- When in doubt, ask the project lead before deleting anything
- Mark WIP content clearly as "Draft" or "Work in Progress"
- Add dates to status reports and analysis documents
- Use consistent terminology from the glossary

### 4. Import to xWiki

**Process:**

1. Create new xWiki pages or update existing ones
2. Use the xWiki editor or import via XAR
3. For bulk imports, use the Markdown → xWiki workflow:
   - Convert your consolidated .md files to xWiki format
   - Use `md_tree_to_json.py` and `json_to_xar.py`
   - Import the generated XAR

### 5. Export to Local Markdown

**After xWiki is updated:**

1. Export complete xWiki content as XAR
2. Convert to Markdown using the workflow:
   ```bash
   python xar_to_json.py FactHarbor_Complete_<date>.xar
   python json_to_md_tree.py FactHarbor_Complete_<date>_fulltree.json
   ```
3. Result: Clean Markdown files in `Docs/xwiki-export/FactHarbor_Complete_<date>_md/`

These Markdown files should be:
- Committed to git (for version control)
- Available for offline reading/editing
- Synchronized with xWiki when changes are made

### 6. Cleanup Local Files

**After successful xWiki consolidation:**

- [ ] Move superseded content from `Docs/WIP/` to `Docs/ARCHIVE/`
- [ ] Add README files explaining what's in each directory
- [ ] Update `.gitignore` if needed
- [ ] Document the new workflow in a README

## Best Practices

### When Editing Content

- **Preserve Mermaid diagrams** - They convert automatically (` ```mermaid ` in Markdown = `{{mermaid}}` in xWiki)
- **Use standard Markdown** - Headings (#), lists (*), code blocks (```), links ([text](url))
- **Avoid xWiki-specific macros** when possible (unless needed for functionality)
- **Test imports** - Do a test export/import cycle with a small change before bulk operations

### Version Control

- Commit Markdown files to git after major xWiki updates
- Use descriptive commit messages: "docs: update architecture diagrams to v2.0"
- Keep the .xar files in git as release snapshots

### Maintenance Workflow

Going forward, the workflow should be:

**For small edits:**
- Edit directly in xWiki
- Periodically export to Markdown and commit to git

**For large changes or refactoring:**
- Export xWiki to Markdown
- Edit Markdown files locally
- Convert back and import to xWiki
- Commit Markdown changes to git

## Questions?

If you have questions about:
- **xWiki structure** - Ask the project lead
- **Content decisions** (keep/delete/merge) - Ask the project lead
- **Conversion tool issues** - Check `Docs/xwiki-export/WORKFLOW.md` or ask for help
- **Technical content accuracy** - Ask the project lead or development team

## Deliverables

1. **Inventory document** - All documentation catalogued
2. **Consolidation plan** - Proposed xWiki structure and merge plan
3. **Clean xWiki instance** - All content properly organized
4. **Local Markdown export** - Clean .md files committed to git
5. **Documentation README** - Guide for maintaining docs going forward

## Timeline Estimate

- Inventory: ~2-4 hours
- Planning: ~2-3 hours
- Consolidation: ~8-16 hours (depends on volume and complexity)
- Testing & cleanup: ~2-4 hours

**Total: ~14-27 hours**

---

**Note:** This is a one-time consolidation effort. Once complete, ongoing maintenance should be straightforward using the established workflow.
