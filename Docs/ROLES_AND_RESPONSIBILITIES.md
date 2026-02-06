# Documentation Consolidation - Roles & Responsibilities

## Overview

This document clarifies who does what in the documentation consolidation project.

**Goal:** Consolidate all FactHarbor documentation into xWiki (master) with synchronized local Markdown files (version control).

**Total Effort Estimate:**
- **Tech Writer:** ~14-27 hours (hands-on work)
- **Project Lead:** ~7-11 hours (review, decisions, approval)

---

## 👔 Project Lead (You) - Strategic Oversight

### Phase 1: Setup & Kickoff (~1-2 hours)

**Your Responsibilities:**

- [ ] **Provide access**
  - Grant tech writer access to xWiki (admin or edit permissions)
  - Grant access to git repository (read/write)
  - Provide login credentials if needed

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

### Phase 3: Content Consolidation (~2-4 hours)

**Your Responsibilities:**

- [ ] **Answer questions** (ongoing, ~1-2 hours total)
  - Clarify technical content accuracy
  - Confirm terminology preferences
  - Decide on borderline keep/delete cases

- [ ] **Review key pages** (~1-2 hours)
  - Tech writer shares consolidated versions of critical pages
  - You spot-check for accuracy (NOT grammar/formatting)
  - Flag any technical errors or outdated info

**Tech Writer Does:**
- Merge duplicate content
- Update outdated information (with your input)
- Standardize formatting and terminology
- Fix broken links
- Archive old versions
- Import content to xWiki
- Export to Markdown

**Deliverable from Tech Writer:** Draft xWiki pages for your review

---

### Phase 4: Finalization & Handoff (~2 hours)

**Your Responsibilities:**

- [ ] **Final review** (~1 hour)
  - Browse the cleaned-up xWiki
  - Verify critical pages are correct
  - Test a few links

- [ ] **Test export workflow** (~30 min)
  - Verify tech writer exported to Markdown correctly
  - Ensure conversion tools work

- [ ] **Git commit** (~30 min)
  - Review the Markdown files
  - Commit to git with appropriate message
  - Push to remote

**Tech Writer Does:**
- Final import to xWiki
- Export complete xWiki to Markdown using tools
- Prepare final deliverables
- Write maintenance guide

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
