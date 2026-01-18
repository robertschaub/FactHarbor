# 📋 Implementation Entry Points - Terminology Refactoring v2.7.0

**Status**: ✅ APPROVED - Ready for Implementation  
**Date**: 2026-01-18

---

## 🎯 START HERE: Implementation Entry Guide

**Primary Document**: `Docs/DEVELOPMENT/IMPLEMENTATION_ENTRY_GUIDE.md`

This is your **main entry point**. It provides:
- Reading order for all documentation (with time estimates)
- Daily checklist template
- Phase-by-phase entry points
- Critical reminders and grep verification commands
- Rollback procedures

**First action**: Read this guide from top to bottom (30 minutes)

---

## 📚 Required Reading (Before Day 1)

Read in this order:

### 1. **Business Decision** (5 min)
📄 `Docs/ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md`
- Why we're doing breaking changes
- What alternatives were considered
- What the consequences are

### 2. **Terminology Reference** (10 min)
📄 `Docs/REFERENCE/TERMINOLOGY.md`
- Single source of truth for all field names
- Keep this open during ALL implementation phases
- Decision trees for when to use each term

### 3. **Execution Plan** (15 min)
📄 `Docs/DEVELOPMENT/Scope_Terminology_Implementation_Roadmap.md`
- Day-by-day tasks for 3.5 weeks
- Check daily tasks each morning
- Update checkboxes as you complete tasks

### 4. **Database Migration** (10 min)
📄 `Docs/ARCHITECTURE/Database_Schema_Migration_v2.7.md`
- Critical for Phase 3 (Days 8-9)
- Includes complete TypeScript migration script
- Pre-migration checklist and validation queries

---

## 🗂️ Reference Documents (Use as Needed)

### For Phase 2 (Code Layer - Days 3-7)
- `Docs/REFERENCE/LLM_Schema_Mapping.md` - LLM field mappings for Zod schemas
- `Docs/DEVELOPMENT/Terminology_Verification_Report.md` - Baseline for grep verification

### For Phase 4 (Prompts - Days 10-12)
- `Docs/DEVELOPMENT/LLM_Prompt_Improvements.md` - 12 Rules of FactHarbor Prompt Engineering
- All files in `apps/web/src/lib/analyzer/prompts/base/` - Already have TERMINOLOGY glossaries

### For Phase 5 (Testing - Days 13-17)
- `apps/web/src/lib/analyzer/multi-jurisdiction.test.ts` - Multi-scope regression test

---

## 📋 Quick Reference: The 5 Key Transformations

Memorize these - you'll use them constantly:

| Old Field Name | New Field Name | Location |
|----------------|----------------|----------|
| `distinctProceedings` | `analysisContexts` | JSON top-level |
| `relatedProceedingId` | `contextId` | Facts, claims |
| `proceedingId` | `contextId` | Verdicts |
| `understanding.proceedingContext` | `understanding.analysisContext` | Understanding object |
| `ProceedingAnswer` | `ContextAnswer` | TypeScript types |

---

## 🎬 Phase Entry Points

Quick links to start each phase:

| Phase | Days | Start Task | Primary Document Section |
|-------|------|------------|-------------------------|
| **Phase 1**: Preparation | 1-2 | Create feature branch & backup | Roadmap lines 20-53 |
| **Phase 2**: Code Layer | 3-7 | Update types.ts | Roadmap lines 55-116 |
| **Phase 3**: Database | 8-9 | Run migration script | Migration Script + Roadmap 118-160 |
| **Phase 4**: Prompts | 10-12 | Update base prompts | Roadmap lines 162-220 |
| **Phase 5**: Testing | 13-17 | Update test files | Roadmap lines 222-248 |
| **Phase 6**: Documentation | 18-22 | Update README | Roadmap lines 250-317 |

---

## ✅ Pre-Implementation Checklist

Before starting Day 1:

- [ ] Read `IMPLEMENTATION_ENTRY_GUIDE.md` (this gives you everything)
- [ ] Read `ADR_001` (understand why we're doing this)
- [ ] Read `TERMINOLOGY.md` (know the terms)
- [ ] Read `Scope_Terminology_Implementation_Roadmap.md` (know the plan)
- [ ] Bookmark `Database_Schema_Migration_v2.7.md` (for Phase 3)
- [ ] Team availability confirmed for 3.5 weeks
- [ ] Feature freeze confirmed (no other work during migration)

---

## 🔴 Critical First Day Actions

**Day 1 Morning** (2 hours):
1. Create feature branch: `git checkout -b feature/terminology-refactoring-v2.7`
2. Backup database:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
   Copy-Item apps\api\factharbor.db "apps\api\factharbor-pre-v2.7-$timestamp.db"
   ```
3. Copy database for testing: `factharbor-test.db`
4. Review all documentation (ADR, mappings, roadmap)

**Day 1 Afternoon** (4 hours):
5. Set up parallel test instance (different port)
6. Install migration dependencies: `npm install sqlite sqlite3`
7. Create test data set (10 representative jobs)
8. Document baseline metrics (job count, DB size)

---

## 📊 Architecture Review History (Optional)

If you want to understand how we got approval:

📄 `Docs/ARCHITECTURE/Architecture_Review_Cycle_Summary.md`
- Summary of 2 review cycles
- All conditions met
- Key decisions documented
- Risk assessment evolution

**Review Originals** (for historical reference):
- `Docs/ARCHITECTURE/Architect_Review_Terminology_v2.7.md`
- `Docs/ARCHITECTURE/Architect_Re-Review_Terminology_v2.7.md`

---

## 🗑️ Obsolete Documents (Deleted)

These interim response documents have been consolidated into `Architecture_Review_Cycle_Summary.md`:
- ~~Architect_Review_Response_v2.7.md~~ (deleted)
- ~~Architect_Re-Review_Response_2026-01-18.md~~ (deleted)
- ~~Review_Response_Summary_2026-01-18.md~~ (deleted)
- ~~Terminology_Documentation_Package_Summary.md~~ (deleted)
- ~~Architect_Review_Guide_Terminology.md~~ (deleted)

---

## 📁 Final Documentation Structure

```
Docs/
├── ARCHITECTURE/
│   ├── ADR_001_Scope_Context_Terminology_Refactoring.md ⭐ READ FIRST
│   ├── Database_Schema_Migration_v2.7.md ⭐ CRITICAL
│   ├── Architecture_Review_Cycle_Summary.md (optional)
│   ├── Architect_Review_Terminology_v2.7.md (historical)
│   └── Architect_Re-Review_Terminology_v2.7.md (historical)
│
├── REFERENCE/
│   ├── TERMINOLOGY.md ⭐ KEEP OPEN
│   └── LLM_Schema_Mapping.md (use in Phase 2 & 4)
│
└── DEVELOPMENT/
    ├── IMPLEMENTATION_ENTRY_GUIDE.md ⭐ START HERE
    ├── Scope_Terminology_Implementation_Roadmap.md ⭐ DAILY USE
    ├── LLM_Prompt_Improvements.md (use in Phase 4)
    └── Terminology_Verification_Report.md (use for grep)
```

**⭐ = Must read before starting**

---

## 🚀 Quick Start Command

```bash
# Option 1: Conservative start (recommended)
# Read all documentation first, then start Day 1

# Option 2: Jump straight to Day 1 (if already familiar)
git checkout -b feature/terminology-refactoring-v2.7
# Then follow Roadmap Day 1 tasks
```

---

## ⚠️ Critical Warnings

1. **DO NOT** skip phases or reorder tasks
2. **DO NOT** skip grep verification steps
3. **DO NOT** skip database backup
4. **DO NOT** accumulate failing tests
5. **DO** escalate blockers immediately

---

## 📞 Support

- **Blocker**: Escalate to Lead Architect immediately
- **Data Issue**: STOP, restore backup, escalate
- **Timeline Slip**: Report at daily standup
- **Test Failure**: Debug before next phase

---

## ✅ Success Definition

You're done when:
- ✅ All 6 phases complete
- ✅ All tests passing
- ✅ Zero grep matches for old field names
- ✅ Database migrated with 100% success rate
- ✅ Performance within ±2% baseline
- ✅ Documentation updated
- ✅ Release notes written

---

**Created**: 2026-01-18  
**Status**: ✅ Ready for Implementation  
**Next Action**: Open `IMPLEMENTATION_ENTRY_GUIDE.md` and start reading
