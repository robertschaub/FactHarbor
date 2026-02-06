# Tech Writer Start Here - Documentation Consolidation

**👋 Welcome! You are the AI agent tech writer for FactHarbor documentation consolidation.**

This is your single entry point. Read this document completely, then begin Phase 1.

---

## 🎯 Mission

Consolidate all FactHarbor documentation into:
1. **xWiki** (single source of truth)
2. **Local .xwiki files** (version control, direct editing by AI agents)

**Eliminate:** Duplicates, scattered docs, outdated content

---

## 🔑 Your Access & Capabilities

**You ARE an AI agent in VS Code with:**
- ✅ Full access to `c:\DEV\FactHarbor` directory
- ✅ Can read, edit, create, delete local files
- ✅ Can run Python scripts and git commands
- ✅ Can work with Markdown, XAR files, conversion tools

**You CANNOT:**
- ❌ Access xWiki web interface (project lead handles all imports/exports)

---

## 🔄 Your Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Project Lead          →  You (AI Agent)                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Exports XAR        →  2. Convert to .xwiki tree           │
│                          python xar_to_xwiki_tree.py in.xar  │
│                                                              │
│ 3. [Waits]            →  4. Edit .xwiki files DIRECTLY       │
│                          - No conversion needed!             │
│                          - Consolidate content               │
│                          - Fix formatting                    │
│                          - Reorganize structure              │
│                                                              │
│ 5. [Waits]            →  6. Convert back to XAR              │
│                          python xwiki_tree_to_xar.py tree/   │
│                                                              │
│ 7. Imports to xWiki   ←  8. Notify: XAR ready                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Essential Knowledge

### Division of Labor

| Task | Who | Time |
|------|-----|------|
| Export XAR from xWiki | Project Lead | - |
| Convert XAR → .xwiki tree | **You** | ~15 min |
| Inventory all documentation | **You** | 2-4 hours |
| Propose xWiki structure | **You** | 2-3 hours |
| Consolidate content | **You** | 8-16 hours |
| Convert .xwiki tree → XAR | **You** | ~15 min |
| Import XAR to xWiki | Project Lead | - |
| Review in xWiki | Project Lead | - |
| Git commit | Project Lead | - |

**Total Your Time:** ~12-24 hours

### What You're Authorized To Do

✅ Read all files in `Docs/`
✅ Edit, create, delete .xwiki files
✅ Run conversion scripts
✅ Move files to `Docs/ARCHIVE/`
✅ Create documentation inventory
✅ Consolidate and reorganize content
✅ Fix formatting, links, terminology
✅ Commit changes to git (local only)

### Ask Project Lead Before

⚠️ Deleting content that seems important
⚠️ Decisions about technical accuracy
⚠️ Changing official terminology
⚠️ Anything involving xWiki

---

## 🛠️ Tools You'll Use

**Conversion Scripts** (located in `Docs/xwiki-export/`):

1. **xar_to_xwiki_tree.py** - One-step: XAR → .xwiki file tree
2. **xwiki_tree_to_xar.py** - One-step: .xwiki file tree → XAR

**Full Reference:** See [WORKFLOW.md](xwiki-export/WORKFLOW.md)

**File Format:**

`.xwiki` files contain **pure xWiki 2.1 syntax** - exactly what you'd paste into the xWiki editor:

```xwiki
= Heading 1 =

This is **bold** and //italic// text.

== Heading 2 ==

Code: ##inline code##

{{mermaid}}
graph TD
  A --> B
{{/mermaid}}
```

**No metadata headers** - pageId, parent, title are derived from file paths.

---

## 📋 Your 6 Tasks (Phases)

### Phase 1: Inventory Current Documentation (2-4 hours)

**Input:** `FactHarbor_Spec_and_Impl_06.Feb.26.xar` (already provided in `Docs/xwiki-export/`)

**Your Actions:**
1. Convert XAR to Markdown
2. Scan all of `Docs/` directory
3. Check `Docs/WIP/`, `Docs/ARCHIVE/`, `Docs/STATUS/`
4. Categorize each doc as: Current / Outdated / Duplicate / Archive
5. Create inventory table

**Deliverable:** Inventory document with proposed actions (keep/merge/archive/delete)

**Submit to:** Project lead for approval

---

### Phase 2: Propose xWiki Structure (2-3 hours)

**Your Actions:**
1. Design target page hierarchy
2. Map current docs to proposed structure
3. Identify merge opportunities
4. Plan consolidation approach

**Suggested Structure:**
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

**Deliverable:** Proposed xWiki structure + consolidation plan

**Submit to:** Project lead for approval

---

### Phase 3: Consolidate Content (8-16 hours)

**Your Actions:**
1. **Merge duplicates** - Create single canonical version
2. **Update outdated content** - Revise to match current state (ask if unsure)
3. **Standardize formatting** - Consistent headings, terminology, structure
4. **Fix broken links** - Update all internal cross-references
5. **Archive old content** - Move superseded docs to Archive space

**Guidelines:**
- When in doubt, ask project lead before deleting
- Mark WIP content as "Draft" or "Work in Progress"
- Add dates to status reports
- Use consistent terminology
- Preserve Mermaid diagrams (they convert automatically)

**Deliverable:** Consolidated Markdown files

**Submit to:** Project lead for review

---

### Phase 4: Convert to XAR (1 hour)

**Your Actions:**
1. Run `python md_tree_to_json.py <markdown_dir>/`
2. Run `python json_to_xar.py <updated_json>`
3. Verify output XAR file created successfully

**Deliverable:** Updated XAR file ready for import

**Notify:** Project lead that XAR is ready

---

### Phase 5: Project Lead Reviews & Imports

**Project Lead Actions:**
- Import XAR to xWiki
- Review in xWiki interface
- Test links and diagrams
- Export final version

**Your Role:** Wait for feedback, address any issues

---

### Phase 6: Final Cleanup & Documentation (1-2 hours)

**Your Actions:**
1. Move superseded content from `Docs/WIP/` to `Docs/ARCHIVE/`
2. Add README files to directories
3. Write maintenance guide (how to keep docs synchronized)
4. Create final report:
   - Summary of what was consolidated
   - List of archived content
   - Recommendations for ongoing maintenance

**Deliverable:** Maintenance documentation + final report

**Submit to:** Project lead for git commit

---

## 🚀 Start Now: Phase 1

The XAR files are ready in `Docs/xwiki-export/`:
- `FactHarbor_Spec_and_Impl_06.Feb.26.xar` (already converted)
- `FactHarbor_Org_06.Feb.26.xar` (already converted)

**Current structure:**
```bash
Docs/xwiki-pages/
├── FactHarbor_Spec_and_Impl/  (75 pages - Specification, Roadmap, Analysis Reports)
└── FactHarbor_Org/             (38 pages - Organisation, governance, policies)
```

**Your next steps:**

1. **Explore the .xwiki files:**
   - Open `Docs/xwiki-pages/FactHarbor_Spec_and_Impl/`
   - Open `Docs/xwiki-pages/FactHarbor_Org/`
   - Browse the page hierarchy
   - Understand what content exists

3. **Scan local documentation:**
   - List all files in `Docs/WIP/`
   - List all files in `Docs/ARCHIVE/`
   - List all files in `Docs/STATUS/`
   - Note any other documentation locations

4. **Create inventory:**
   - Document all found content
   - Categorize each item
   - Propose keep/merge/archive/delete actions

5. **Submit inventory to project lead for approval**

---

## 📖 Reference Documents

If you need more detail, these documents are available:

- **[WORKFLOW.md](xwiki-export/WORKFLOW.md)** - Complete conversion tool reference
- **[ROLES_AND_RESPONSIBILITIES.md](ROLES_AND_RESPONSIBILITIES.md)** - Detailed role breakdown
- **[INSTRUCTIONS_FOR_TECH_WRITER.md](INSTRUCTIONS_FOR_TECH_WRITER.md)** - Extended task descriptions

**But you don't need to read them right now.** Everything essential is in this document.

---

## ❓ Quick Reference

**Q: How do I know if content is outdated?**
A: Check dates, version numbers, status markers. If unsure, flag for project lead.

**Q: What if I find technical errors?**
A: Flag for project lead to review. Don't guess on technical accuracy.

**Q: Can I change the proposed xWiki structure?**
A: Yes! Bring your expertise. Project lead will review and approve.

**Q: What if this takes longer than estimated?**
A: Communicate early. Let project lead know if timeline needs adjustment.

**Q: How do I handle content that might be sensitive?**
A: Flag for project lead review before making decisions.

---

## ✅ Success Criteria

Project is complete when:
- ✅ All documentation is in xWiki with clear organization
- ✅ No duplicate or contradictory content
- ✅ Markdown files exported and committed to git
- ✅ Maintenance workflow documented
- ✅ Project lead can independently maintain docs going forward

---

**Ready? Begin Phase 1 now!**

**Current Status:** XAR file is ready at `Docs/xwiki-export/FactHarbor_Spec_and_Impl_06.Feb.26.xar`

Run the conversion commands above and start your inventory.

---

**Last Updated:** 2026-02-06
**Version:** 1.0
