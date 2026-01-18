# Terminology Refactoring v2.7.0 - Implementation Entry Guide

**Date**: 2026-01-18  
**Status**: ✅ APPROVED - Ready for Implementation  
**Team**: Lead Developer, LLM Expert, QA Lead, Tech Writer

---

## Quick Start

**You are here**: All architecture review cycles complete. Ready to begin Phase 1.

**Next action**: Create feature branch `feature/terminology-refactoring-v2.7` and begin Day 1 tasks.

---

## Reading Order for Implementation Team

### 1. MUST READ (Before Starting)

Read these in order to understand the approved plan:

#### a) **Decision Document** (5 min read)
📄 `Docs/ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md`
- **Why**: Explains the business rationale for breaking changes
- **Key sections**: Decision rationale, alternatives considered, consequences
- **Takeaway**: This is an aggressive refactoring with full breaking changes approved

#### b) **Glossary Reference** (10 min read)
📄 `Docs/REFERENCE/TERMINOLOGY.md`
- **Why**: Single source of truth for all terminology
- **Key sections**: Field Mapping Table (lines 20-26), Core Concepts, Decision Trees
- **Keep open**: Reference this during all implementation phases
- **Takeaway**: Understand AnalysisContext vs EvidenceScope vs ArticleFrame

#### c) **Implementation Roadmap** (15 min read)
📄 `Docs/DEVELOPMENT/Scope_Terminology_Implementation_Roadmap.md`
- **Why**: Your day-by-day execution plan
- **Key sections**: Timeline (3.5 weeks), all 6 phases, success criteria
- **Bookmark**: Check daily tasks each morning
- **Takeaway**: Know what you're doing today and tomorrow

#### d) **Database Migration Script** (10 min read)
📄 `Docs/ARCHITECTURE/Database_Schema_Migration_v2.7.md`
- **Why**: Critical for Phase 3 (Database Migration)
- **Key sections**: Migration script (lines 144-262), validation queries, rollback plan
- **Warning**: BACKUP database before running (see Pre-Migration Checklist)
- **Takeaway**: Understand the 4 JSON transformations

---

### 2. REFERENCE AS NEEDED

Keep these handy for specific phases:

#### Phase 2 (Code Layer) - Days 3-7
📄 `Docs/REFERENCE/LLM_Schema_Mapping.md`
- LLM prompt field mappings
- Use when updating Zod schemas

📄 `Docs/DEVELOPMENT/Terminology_Verification_Report.md`
- Current state baseline
- Use for grep verification

#### Phase 4 (Prompts) - Days 10-12
📄 `Docs/DEVELOPMENT/LLM_Prompt_Improvements.md`
- Prompt engineering standards
- 12 rules of FactHarbor prompts
- Use when updating prompt text

📄 All base prompt files in `apps/web/src/lib/analyzer/prompts/base/`
- Already updated with TERMINOLOGY glossaries
- Update field names during Phase 4

#### Phase 5 (Testing) - Days 13-17
📄 `apps/web/src/lib/analyzer/multi-jurisdiction.test.ts`
- Multi-scope regression test
- Update field names in test assertions

---

### 3. ARCHITECTURE REVIEW HISTORY (Optional)

For context on how we got here (not required for implementation):

📄 `Docs/ARCHITECTURE/Architect_Review_Terminology_v2.7.md` (Original review)
📄 `Docs/ARCHITECTURE/Architect_Re-Review_Terminology_v2.7.md` (Final approval)
📄 `Docs/DEVELOPMENT/Architect_Re-Review_Response_2026-01-18.md` (Final response)

---

## Critical Reminders

### ⚠️ Before You Start

1. **Backup Database**
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
   Copy-Item apps\api\factharbor.db "apps\api\factharbor-pre-v2.7-$timestamp.db"
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/terminology-refactoring-v2.7
   ```

3. **Stop Services**
   ```powershell
   .\scripts\stop-services.ps1
   ```

### ⚠️ Key Transformations (Memorize These)

| Old Name | New Name | Where |
|----------|----------|-------|
| `distinctProceedings` | `analysisContexts` | JSON top-level |
| `relatedProceedingId` | `contextId` | Facts, claims |
| `proceedingId` | `contextId` | Verdicts |
| `understanding.proceedingContext` | `understanding.analysisContext` | Understanding object |
| `ProceedingAnswer` | `ContextAnswer` | TypeScript types |

### ⚠️ Special Requirements

1. **Add `_schemaVersion: "2.7.0"` field** to all result builders (Day 4-5)
2. **Add runtime validation** for `contextId` references (Day 4)
3. **Grep verification** required before declaring phase complete (Days 6, 12)
4. **Manual testing** of 10+ jobs required (Day 16)

---

## Daily Checklist Template

Copy this for each day:

```
Date: _______________
Phase: _______________
Day: _______________

[ ] Read today's tasks from roadmap
[ ] Update todos in progress
[ ] Complete assigned tasks
[ ] Run relevant tests
[ ] Commit with descriptive message
[ ] Update roadmap checkboxes
[ ] Brief standup update to architect
[ ] Any blockers? (escalate immediately)
```

---

## Success Criteria (Must Meet All)

Before declaring "DONE":

### Code Quality
- ✅ TypeScript compiles with zero errors
- ✅ No linter warnings
- ✅ Test coverage maintained
- ✅ No `TODO`/`FIXME` related to migration

### Data Integrity
- ✅ 100% of jobs migrated successfully
- ✅ Zero data corruption
- ✅ All validation queries pass
- ✅ Backup tested and restorable

### Performance
- ✅ Job execution time within ±2% of baseline
- ✅ Database query performance unchanged
- ✅ UI responsiveness unchanged

### Documentation
- ✅ All docs reflect new terminology
- ✅ Migration guide complete
- ✅ Release notes written

---

## Emergency Contacts

| Role | Action |
|------|--------|
| **Critical Blocker** | Escalate to Lead Architect immediately |
| **Data Corruption** | STOP - restore backup - escalate |
| **Timeline Slip** | Report at daily standup |
| **Test Failures** | Debug before proceeding to next phase |

---

## Grep Verification Commands (Bookmark This)

Use these at checkpoints:

```bash
# Code layer verification (Day 6)
grep -rn "distinctProceedings" apps/web/src/lib/analyzer/ | grep -v "test" | grep -v ".md"
grep -rn "relatedProceedingId" apps/web/src/lib/analyzer/ | grep -v "test" | grep -v ".md"

# Prompt layer verification (Day 12)
grep -rn "distinctProceedings" apps/web/src/lib/analyzer/prompts/
grep -rn "relatedProceedingId" apps/web/src/lib/analyzer/prompts/

# Expected result: Zero occurrences (or only in comments explaining legacy)
```

---

## Rollback Plan (If Things Go Wrong)

### Scenario 1: Migration Script Fails
```powershell
# Stop services
.\scripts\stop-services.ps1

# Restore backup
Copy-Item "apps\api\factharbor-pre-v2.7-TIMESTAMP.db" apps\api\factharbor.db -Force

# Restart services
.\scripts\restart-clean.ps1
```

### Scenario 2: Post-Merge Critical Bug
1. Revert git commit
2. Restore database backup
3. Redeploy previous version
4. Investigate offline

---

## Timeline at a Glance

```
Week 1 (Days 1-7): Prep + Code Layer
├─ Day 1-2: Preparation & backups
├─ Day 3-4: Core types + analyzer.ts
├─ Day 5: Monolithic pipelines
├─ Day 6: UI components
└─ Day 7: API layer

Week 2 (Days 8-12): Database + Prompts
├─ Day 8-9: Database migration
├─ Day 10: Base prompts
├─ Day 11: analyzer.ts inline prompts
└─ Day 12: Provider variants + verification

Week 3 (Days 13-17): Testing
├─ Day 13-14: Unit + integration tests
├─ Day 15: Regression testing
├─ Day 16: User acceptance testing
└─ Day 17: Bug fixes

Week 3.5 (Days 18-22): Buffer + Release
├─ Day 18: Buffer for issues
├─ Day 19-20: Documentation
├─ Day 21: Release prep
└─ Day 22: Final review & merge
```

---

## Phase Entry Points (Direct Links)

| Phase | Start Day | Entry Document Section |
|-------|-----------|----------------------|
| **Phase 1** | Day 1 | Roadmap lines 20-53 |
| **Phase 2** | Day 3 | Roadmap lines 55-116 |
| **Phase 3** | Day 8 | Roadmap lines 118-160 + Migration Script |
| **Phase 4** | Day 10 | Roadmap lines 162-220 |
| **Phase 5** | Day 13 | Roadmap lines 222-248 |
| **Phase 6** | Day 18 | Roadmap lines 250-317 |

---

## FAQ for Implementation Team

**Q: Can I rename fields in a different order than the roadmap?**
A: No. Follow the phase order strictly to avoid dependency issues.

**Q: What if I find an unlisted occurrence of old field names?**
A: Add it to the current day's checklist, fix it, document it in commit message.

**Q: Should I update inline comments that mention old field names?**
A: Yes, for consistency. But mark as "legacy field name" if referencing database schema.

**Q: Can I skip the grep verification steps?**
A: No. These catch hidden references that manual review misses.

**Q: What if tests fail after my changes?**
A: Fix before moving to next task. Don't accumulate broken tests.

---

## Sign-Off

**Prepared By**: Lead Developer  
**Reviewed By**: Lead Architect  
**Date**: 2026-01-18  
**Status**: ✅ Ready for Implementation

**First Day Action**: Read this guide, read ADR_001, read TERMINOLOGY.md, then start Roadmap Day 1 tasks.

---

**Document Version**: 1.0  
**Created**: 2026-01-18  
**Classification**: Internal - Implementation Guide
