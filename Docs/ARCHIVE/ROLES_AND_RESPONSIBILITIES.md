# Documentation Consolidation - Roles & Responsibilities

## Overview

This document clarifies who does what in the documentation consolidation project.

**Important:** The "Tech Writer" is an AI agent working in VS Code with access to local files only. The project lead handles all xWiki operations.

**Goal:** Consolidate all FactHarbor documentation into xWiki (master) with synchronized local Markdown files (version control).

**Total Effort Estimate:**
- **AI Agent (Tech Writer):** ~14-27 hours (hands-on Markdown work)
- **Project Lead (You):** ~10-14 hours (xWiki operations, review, decisions, approval)

---

## 👔 Project Lead (You) - Strategic Oversight

### Phase 1: Setup & Kickoff (~2-3 hours)

**Your Responsibilities:**

- [ ] **Export current xWiki content**
  - Go to xWiki → Administration → Export
  - Export all documentation as XAR file
  - Place XAR in `Docs/xwiki-export/`
  - Notify AI agent that XAR is ready

- [ ] **Provide access** (AI agent already has local file access)
  - No xWiki access needed (AI agent can't access web UI anyway)
  - No git credentials needed (AI agent works locally)
  - AI agent has access to `c:\DEV\FactHarbor` directory

- [ ] **Brief tech writer**
  - Share `INSTRUCTIONS_FOR_TECH_WRITER.md`
  - Quick overview call (~30 min) explaining FactHarbor's goals
  - Clarify what documentation is most important
  - Set timeline expectations

- [ ] **Identify subject matter experts**
  - Point tech writer to who can answer technical questions if you're unavailable

**Tech Writer Does:** Read instructions, familiarize with xWiki and repo structure

---

### Phase 2: Planning & Structure (~2-3 hours)

**Your Responsibilities:**

- [ ] **Review inventory** (1-2 hours)
  - Tech writer sends you categorized list of all documentation
  - You approve what to keep/merge/archive/delete
  - Flag anything sensitive or critical

- [ ] **Approve xWiki structure** (~1 hour)
  - Tech writer proposes page hierarchy
  - You review and approve (or request changes)
  - Ensure it matches your vision for documentation organization

**Tech Writer Does:**
- Create complete inventory of all docs
- Categorize as current/outdated/duplicate/archive
- Propose xWiki page hierarchy
- Send to you for approval

**Deliverable from Tech Writer:** Inventory spreadsheet + proposed structure

---

### Phase 3: Content Consolidation (~3-5 hours)

**Your Responsibilities:**

- [ ] **Answer questions** (ongoing, ~1-2 hours total)
  - Clarify technical content accuracy
  - Confirm terminology preferences
  - Decide on borderline keep/delete cases

- [ ] **Review key pages** (~1-2 hours)
  - AI agent shares consolidated Markdown files
  - You spot-check for accuracy (NOT grammar/formatting)
  - Flag any technical errors or outdated info

- [ ] **Import interim updates to xWiki** (~1 hour, optional)
  - If you want to preview changes in xWiki
  - Convert Markdown → XAR (AI agent does this)
  - Import XAR to xWiki test space
  - Review in xWiki interface
  - Provide feedback to AI agent

**AI Agent (Tech Writer) Does:**
- Merge duplicate content
- Update outdated information (with your input)
- Standardize formatting and terminology
- Fix broken links
- Archive old versions (move files in `Docs/`)
- Convert Markdown ↔ XAR (using provided scripts)

**Deliverable from Tech Writer:** Draft xWiki pages for your review

---

### Phase 4: Finalization & Handoff (~3-4 hours)

**Your Responsibilities:**

- [ ] **Import final XAR to xWiki** (~1 hour)
  - AI agent provides final updated XAR file
  - You import to xWiki → Administration → Import
  - Select all pages and import
  - Verify import succeeded

- [ ] **Final review in xWiki** (~1 hour)
  - Browse the cleaned-up xWiki
  - Verify critical pages are correct
  - Test links and navigation
  - Check diagrams render properly

- [ ] **Export final xWiki to Markdown** (~30 min)
  - Export complete xWiki as XAR (final version)
  - Use conversion tools to create Markdown files
  - This becomes the "clean" version for git

- [ ] **Git commit** (~1 hour)
  - Review the final Markdown files
  - Commit to git with detailed message
  - Push to remote
  - Clean up intermediate files

**AI Agent (Tech Writer) Does:**
- Provide final updated XAR file
- Assist with any final Markdown conversions if needed
- Prepare handoff documentation
- Summarize what was changed

**Deliverable from Tech Writer:**
- Clean xWiki instance
- Markdown files ready to commit
- Maintenance documentation

---

## ✍️ Tech Writer - Hands-On Execution

### Phase 1: Research & Planning (~4-6 hours)

**Tech Writer Responsibilities:**

- [ ] **Inventory all documentation**
  - Scan all of `Docs/` directory
  - Check what's in xWiki currently
  - Check `Docs/WIP/`, `Docs/ARCHIVE/`, `Docs/STATUS/`
  - List all documents with location and status

- [ ] **Categorize content**
  - Mark each doc as: Current / Outdated / Duplicate / Archive
  - Identify gaps in documentation
  - Note which docs need merging

- [ ] **Propose xWiki structure**
  - Design page hierarchy (see INSTRUCTIONS_FOR_TECH_WRITER.md for suggested structure)
  - Map current docs to proposed structure
  - Create consolidation plan

- [ ] **Get approval**
  - Send inventory + structure to project lead
  - Incorporate feedback

**Project Lead Does:** Review and approve

---

### Phase 2: Content Consolidation (~8-16 hours)

**Tech Writer Responsibilities:**

- [ ] **Merge duplicates**
  - Identify all duplicate content
  - Create single canonical version
  - Ask project lead if unsure which version to keep

- [ ] **Update outdated content**
  - Revise content to match current state
  - Flag technical questions for project lead
  - Update dates, status, version numbers

- [ ] **Standardize formatting**
  - Consistent heading levels
  - Consistent terminology (use glossary)
  - Clean up tables, lists, code blocks
  - Fix Mermaid diagram syntax if needed

- [ ] **Fix all links**
  - Update internal cross-references
  - Fix broken links
  - Ensure links point to new xWiki structure

- [ ] **Archive old content**
  - Move superseded docs to Archive space
  - Add "Archived on [date]" notices
  - Link to current version where applicable

**Project Lead Does:** Answer questions, review key pages

---

### Phase 3: Import & Export (~2-4 hours)

**Tech Writer Responsibilities:**

- [ ] **Import to xWiki**
  - Create/update xWiki pages manually OR
  - Use Markdown → xWiki conversion tools (see WORKFLOW.md)
  - Verify all pages imported correctly
  - Check that diagrams render properly

- [ ] **Export to Markdown**
  - Export complete xWiki as XAR
  - Use conversion tools to create Markdown files:
    ```bash
    cd Docs/xwiki-export
    python xar_to_json.py FactHarbor_Complete_<date>.xar
    python json_to_md_tree.py FactHarbor_Complete_<date>_fulltree.json
    ```
  - Verify Markdown files look correct

- [ ] **Clean up local files**
  - Move old `Docs/WIP/` content to `Docs/ARCHIVE/`
  - Add README files to directories
  - Document the new workflow

**Project Lead Does:** Final review, git commit

---

### Phase 4: Documentation & Handoff (~1-2 hours)

**Tech Writer Responsibilities:**

- [ ] **Write maintenance guide**
  - Document the xWiki → Markdown sync workflow
  - Explain when to edit in xWiki vs Markdown
  - Note any special considerations

- [ ] **Create final report**
  - Summary of what was consolidated
  - List of archived content
  - Any recommendations for ongoing maintenance

- [ ] **Knowledge transfer**
  - Brief session with project lead on new structure
  - Answer any questions about maintenance

**Project Lead Does:** Review, approve, commit to git

---

## 🚫 What You (Project Lead) Should NOT Do

- ❌ Manually merge documents yourself
- ❌ Import files to xWiki one by one
- ❌ Rewrite or copy-paste content
- ❌ Fix formatting or grammar
- ❌ Do the inventory grunt work
- ❌ Learn the conversion tools in detail (tech writer uses them)

## ✅ What You (Project Lead) SHOULD Do

- ✅ Make strategic decisions (keep/delete, structure)
- ✅ Answer technical accuracy questions
- ✅ Review at key checkpoints
- ✅ Final approval before git commit
- ✅ Provide timely feedback (don't block the tech writer)

---

## 🚫 What Tech Writer Should NOT Do

- ❌ Make decisions about technical accuracy (ask you)
- ❌ Delete content without approval
- ❌ Change terminology without checking
- ❌ Ignore feedback or skip review steps
- ❌ Commit to git (that's your job)

## ✅ What Tech Writer SHOULD Do

- ✅ All hands-on editing, merging, formatting
- ✅ Use the conversion tools (WORKFLOW.md)
- ✅ Ask questions when unsure
- ✅ Follow the instructions document
- ✅ Keep you informed of progress
- ✅ Flag issues early

---

## 📋 Checkpoint Schedule

| Checkpoint | Tech Writer Delivers | You Review | Est. Time |
|------------|---------------------|------------|-----------|
| **1. Inventory** | Categorized doc list | Approve keep/delete decisions | 1-2 hours |
| **2. Structure** | Proposed xWiki hierarchy | Approve structure | 1 hour |
| **3. Draft Pages** | Key consolidated pages | Spot-check accuracy | 1-2 hours |
| **4. Final Review** | Complete xWiki + Markdown | Final approval | 1-2 hours |
| **5. Handoff** | Maintenance guide | Git commit | 30 min |

**Total:** ~7-11 hours spread over project duration

---

## 🔄 Communication

**Tech Writer Should:**
- Send checkpoint deliverables via email with clear subject lines
- Flag blockers immediately (don't wait days for a decision)
- Provide status updates if work takes longer than estimated
- Ask questions in batches (not one at a time)

**Project Lead Should:**
- Respond to review requests within 1-2 business days
- Be available for quick questions via email/chat
- Provide clear yes/no decisions (avoid "maybe")
- Give constructive feedback, not just "redo this"

---

## 📊 Success Criteria

**Project is complete when:**

- ✅ All documentation is in xWiki with clear organization
- ✅ No duplicate or contradictory content
- ✅ Markdown files exported and committed to git
- ✅ Maintenance workflow documented
- ✅ Tech writer has handed off to project lead
- ✅ Project lead can independently maintain docs going forward

---

## 📞 Questions?

**Tech Writer:** If you're unclear about roles or need clarification, ask the project lead before starting work.

**Project Lead:** If the tech writer isn't following this division of labor, reference this document and clarify expectations.

---

**Last Updated:** 2026-02-06
**Version:** 1.0
