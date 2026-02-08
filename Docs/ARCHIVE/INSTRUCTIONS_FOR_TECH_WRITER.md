# Documentation Consolidation & Cleanup - Tech Writer Instructions

## 🔑 Access & Setup (AI Agent in VS Code)

**You are an AI agent working in VS Code with access to:**

### Your Access (What You Can Do)

- **Git Repository:** Full read/write access to local repository
  - Working directory: `c:\DEV\FactHarbor`
  - You can read, edit, create, and delete files
  - You can use git commands (add, commit, status, diff)
  - Project lead handles git push to remote

- **Local File System:** Direct access to all documentation files
  - `Docs/` directory and all subdirectories
  - `Docs/WIP/`, `Docs/ARCHIVE/`, `Docs/STATUS/`
  - All `.md`, `.xar`, and other documentation files

- **Conversion Tools:** Python scripts for XAR ↔ .xwiki tree
  - Located in `Docs/xwiki-export/`
  - You can run these scripts directly
  - Python environment is already set up

### What You CANNOT Access

- **❌ xWiki:** You don't have access to the xWiki web interface
  - **Project lead handles all xWiki imports/exports**
  - You work only with local files (XAR and .xwiki)

### Your Workflow (AI Agent)

**You work with files the project lead provides:**

```
Project Lead                          You (AI Agent)
═══════════════════════════════════   ══════════════════════════════════

1. Exports XAR from xWiki       →     2. Convert XAR to .xwiki tree:
   (provides .xar file)                  python scripts/xar_to_xwiki_tree.py in.xar

3. [You work offline]                 4. Edit .xwiki files DIRECTLY:
                                         (No conversion needed!)
                                         - Consolidate content
                                         - Fix formatting
                                         - Reorganize structure
                                         - Update documentation

5. [You work offline]                 6. Convert back to XAR:
                                         python scripts/xwiki_tree_to_xar.py ../xwiki-pages

7. Reviews XAR                    ←   8. Deliver updated XAR file
8. Imports to xWiki                      (notify project lead it's ready)
```

### Initial Setup

**You should already have:**
- ✅ Access to `c:\DEV\FactHarbor` directory
- ✅ Python 3.8+ installed and working
- ✅ Git access (can run git commands)
- ✅ Conversion scripts in `Docs/xwiki-pages/scripts/`

**Read these files first:**
- `Docs/xwiki-pages/scripts/WORKFLOW.md` - How to use conversion tools
- `Docs/ROLES_AND_RESPONSIBILITIES.md` - Division of labor
- `Docs/xwiki-pages/README.md` - Single-tree documentation structure

### What You ARE Authorized To Do:
- ✅ Read all files in `Docs/`
- ✅ Edit .xwiki files directly (pure xWiki 2.1 syntax)
- ✅ Run conversion scripts (xar_to_xwiki_tree.py, xwiki_tree_to_xar.py)
- ✅ Create inventory of documentation
- ✅ Consolidate and reorganize .xwiki content
- ✅ Archive outdated files (move to `Docs/ARCHIVE/`)
- ✅ Create new .xwiki files
- ✅ Delete duplicate/obsolete files
- ✅ Commit changes to git (local)

### Ask Project Lead Before:
- ⚠️ Deleting content that seems important but unclear
- ⚠️ Making decisions about technical accuracy
- ⚠️ Changing official terminology
- ⚠️ Any operation involving xWiki (you can't access it anyway)

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

### You Receive: XAR file from Project Lead

**Project lead exports from xWiki and gives you the .xar file**

### You Convert: XAR to Markdown
```bash
cd Docs/xwiki-export

# 1. Convert XAR to JSON
python xar_to_json.py FactHarbor_Export.xar

# 2. Convert JSON to Markdown tree
python json_to_md_tree.py FactHarbor_Export_fulltree.json

# Result: FactHarbor_Export_md/ directory with all pages as .md files
```

### You Edit: Markdown Files

Work directly with the Markdown files:
- Consolidate duplicates
- Update outdated content
- Reorganize structure
- Fix formatting

### You Convert: Markdown Back to XAR

```bash
# 1. Merge Markdown changes to JSON
python md_tree_to_json.py FactHarbor_Export_md/

# 2. Convert JSON to XAR
python json_to_xar.py FactHarbor_Export_fulltree_updated.json

# Result: FactHarbor_Export_updated.xar
```

### You Deliver: Updated XAR to Project Lead

**Notify project lead that the updated .xar file is ready for import**

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
