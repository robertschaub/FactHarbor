# Terminology Refactoring Implementation Roadmap v2.7.0

**Start Date**: TBD (Post-Architecture Review)  
**Target Completion**: 3.5 weeks (17-18 working days) from start  
**Status**: 📋 Planning Phase - Awaiting Approval  

---

## Timeline Overview

Since **breaking changes are approved**, we use an aggressive single-branch strategy with no parallel field maintenance.

```
Week 1: Preparation + Code Layer (Days 1-7)
Week 2: Database + Prompts (Days 8-12)
Week 3: Testing + Documentation (Days 13-17)
Week 3.5: Buffer + Final Review (Days 18-19)
```

**Timeline Adjustment**: Extended from 3 weeks to 3.5 weeks based on Lead Architect recommendation to account for unknown dependencies and analyzer.ts inline prompt coverage.

---

## Phase 1: Preparation & Planning (Days 1-2)

### Objectives
✅ Create migration branch  
✅ Backup production database  
✅ Set up test environment  

### Tasks

**Day 1 Morning**:
- [ ] Create feature branch: `feature/terminology-refactoring-v2.7`
- [ ] Backup database: `factharbor-pre-v2.7-$(date).db`
- [ ] Copy database for testing: `factharbor-test.db`
- [ ] Review all documentation (ADR, mappings, this roadmap)

**Day 1 Afternoon**:
- [ ] Set up parallel test instance (different port)
- [ ] Install migration dependencies (`sqlite`, `sqlite3` npm packages)
- [ ] Create test data set (10 representative jobs)
- [ ] Document baseline metrics (current job count, DB size)

**Day 2**:
- [ ] Write unit tests for migration script
- [ ] Dry-run migration on test database
- [ ] Validate test results manually
- [ ] Get team sign-off to proceed

**Deliverables**:
- ✅ Feature branch created
- ✅ Database backed up
- ✅ Migration script tested
- ✅ Baseline metrics documented

---

## Phase 2: TypeScript Code Layer (Days 3-7)

### Objectives
🔧 Update all code references  
🔧 Rename interfaces and types  
🔧 Update Zod schemas  

### Tasks

**Day 3: Core Types**
- [ ] Update `apps/web/src/lib/analyzer/types.ts`:
  - Keep `AnalysisContext` interface (no change needed)
  - Update `ContextAnswer` field references
  - Add deprecation warnings to old type aliases
- [ ] Update `apps/web/src/lib/analyzer/scopes.ts`:
  - Update function parameter names
  - Update return type references
- [ ] Run TypeScript compiler, fix errors

**Day 4: Analyzer Core**
- [ ] Update `apps/web/src/lib/analyzer/analyzer.ts`:
  - Replace all `distinctProceedings` → `analysisContexts`
  - Replace all `relatedProceedingId` → `contextId`
  - Replace all `proceedingId` → `contextId` in verdicts
  - **Add `_schemaVersion: "2.7.0"` to result builder** (Architect recommendation D1)
- [ ] Update Zod schemas:
  - `ScopeRefinementSchema`
  - `VerdictSchema`
  - `ExtractedFactSchema`
- [ ] **Add runtime validation for contextId references** (Architect recommendation D2):
  ```typescript
  const validContextIds = new Set(contexts.map(c => c.id));
  if (fact.contextId && !validContextIds.has(fact.contextId)) {
    agentLog("WARN", `Invalid contextId reference: ${fact.contextId}`);
  }
  ```
- [ ] Test schema validation with sample data

**Day 5: Monolithic Pipelines**
- [ ] Update `apps/web/src/lib/analyzer/monolithic-canonical.ts`
- [ ] Update `apps/web/src/lib/analyzer/monolithic-dynamic.ts`
- [ ] Update result builders in both files
- [ ] **Add `_schemaVersion` field** (Architect recommendation D1):
  ```typescript
  {
    "_schemaVersion": "2.7.0",
    "analysisContexts": [...],
    ...
  }
  ```
- [ ] Verify output matches new schema

**Day 6: UI Components**
- [ ] Update `apps/web/src/app/jobs/[id]/page.tsx`:
  - Update data access paths (`result.analysisContexts`)
  - Update variable names
- [ ] Search entire codebase for remaining references:
  ```bash
  grep -r "distinctProceedings" apps/web/src
  grep -r "relatedProceedingId" apps/web/src
  grep -r "proceedingId" apps/web/src
  ```
- [ ] Fix all findings

**Day 7: API Layer**
- [ ] Review `apps/api` for any hardcoded field names
- [ ] Update API response serialization if needed
- [ ] Update OpenAPI/Swagger docs (if applicable)
- [ ] Test API endpoints

**Deliverables**:
- ✅ All TypeScript compiles without errors
- ✅ Zod schemas updated
- ✅ No references to old field names in code
- ✅ API endpoints validated

---

## Phase 3: Database Migration (Days 8-9)

### Objectives
🗄️ Migrate existing job records  
🗄️ Validate data integrity  

### Tasks

**Day 8 Morning: Pre-Migration**
- [ ] Final backup of production database
- [ ] Stop all services (`.\scripts\stop-services.ps1`)
- [ ] Run validation queries (count jobs, check for null ResultJson)
- [ ] Document pre-migration state

**Day 8 Afternoon: Execute Migration**
- [ ] Run migration script on production database:
  ```bash
  ts-node apps/api/scripts/migrate-terminology-v2.7.ts
  ```
- [ ] Monitor output for errors
- [ ] Capture migration logs

**Day 9 Morning: Validation**
- [ ] Run post-migration validation queries
- [ ] Sample 20 random jobs manually
- [ ] Check for:
  - `analysisContexts` present
  - `distinctProceedings` absent
  - `contextId` in verdicts
  - No broken JSON

**Day 9 Afternoon: Integration Testing**
- [ ] Restart services (`.\scripts\restart-clean.ps1`)
- [ ] Load existing jobs in UI
- [ ] Run new analysis jobs
- [ ] Verify both old (migrated) and new jobs display correctly

**Deliverables**:
- ✅ Database migrated successfully
- ✅ All validation queries pass
- ✅ No data corruption detected
- ✅ Services restart cleanly

---

## Phase 4: Prompt Standardization (Days 10-12)

### Objectives
📝 Update all LLM prompts  
📝 Add mandatory glossaries  
📝 Ensure provider consistency  

### Tasks

**Day 10: Base Prompts**
- [ ] Update `apps/web/src/lib/analyzer/prompts/base/understand-base.ts`
- [ ] Update `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts`
- [ ] Update `apps/web/src/lib/analyzer/prompts/base/extract-facts-base.ts`
- [ ] Update `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts`
- [ ] Replace all `distinctProceedings` → `analysisContexts` in prompt text
- [ ] Replace all `relatedProceedingId` → `contextId`

**Day 11: Orchestrated Pipeline Inline Prompts**
- [ ] Update `apps/web/src/lib/analyzer/analyzer.ts` (inline prompts)
  - [ ] Replace all `distinctProceedings` → `analysisContexts` in prompt strings
  - [ ] Replace all `relatedProceedingId` → `contextId` in prompt strings
  - [ ] Replace all `proceedingId` → `contextId` in prompt strings
- [ ] Run grep verification:
  ```bash
  grep -n "distinctProceedings" apps/web/src/lib/analyzer/analyzer.ts
  grep -n "relatedProceedingId" apps/web/src/lib/analyzer/analyzer.ts
  grep -n "proceedingId" apps/web/src/lib/analyzer/analyzer.ts
  ```
- [ ] Verify: Zero occurrences of old terms in prompt strings

**Day 12: Provider Variants & Dynamic Pipeline**
- [ ] Update `apps/web/src/lib/analyzer/prompts/providers/anthropic.ts`
- [ ] Update `apps/web/src/lib/analyzer/prompts/providers/google.ts`
- [ ] Update `apps/web/src/lib/analyzer/prompts/providers/openai.ts`
- [ ] Update `apps/web/src/lib/analyzer/prompts/providers/mistral.ts`
- [ ] Verify glossary sections present in all
- [ ] Update `apps/web/src/lib/analyzer/prompts/base/dynamic-plan-base.ts`
- [ ] Update `apps/web/src/lib/analyzer/prompts/base/dynamic-analysis-base.ts`
- [ ] Test dynamic pipeline with new prompts
- [ ] Verify output schema compliance
- [ ] **Final verification**: Run grep across all prompt files
  ```bash
  grep -r "distinctProceedings" apps/web/src/lib/analyzer/prompts/
  grep -r "relatedProceedingId" apps/web/src/lib/analyzer/prompts/
  grep -r "proceedingId" apps/web/src/lib/analyzer/prompts/
  ```
- [ ] Document: Zero occurrences expected (or only in comments explaining legacy)

**Deliverables**:
- ✅ All prompts use new terminology
- ✅ Glossaries present in all base prompts
- ✅ Provider variants consistent
- ✅ LLM outputs validate successfully

---

## Phase 5: Testing & Validation (Days 13-17)

### Objectives
✅ Run full regression suite  
✅ Validate multi-scope handling  
✅ Performance benchmarks  

### Tasks

**Day 13-14: Unit & Integration Tests**
- [ ] Update existing test files:
  - `apps/web/src/lib/analyzer/multi-jurisdiction.test.ts`
  - Any other test files referencing old field names
- [ ] Run full test suite: `npm test`
- [ ] Fix any failing tests
- [ ] Add new tests for migration edge cases

**Day 15: Regression Testing**
- [ ] Run regression test suite (`.\scripts\run-regression.ps1`)
- [ ] Test with multi-jurisdiction inputs
- [ ] Test with single-context inputs
- [ ] Test with dynamic pipeline
- [ ] Document any regressions

**Day 16: User Acceptance Testing**
- [ ] Manual testing checklist:
  - [ ] Submit new analysis (all 3 pipeline variants)
  - [ ] View existing job results
  - [ ] Check verdict displays
  - [ ] Verify scope separation
  - [ ] Test admin interface
- [ ] Performance benchmarks:
  - [ ] Measure job execution time (baseline vs new)
  - [ ] Measure database query performance
  - [ ] Compare results (should be < 1% difference)

**Day 17: Bug Fixes**
- [ ] Address any issues found in testing
- [ ] Rerun affected tests
- [ ] Final validation pass

**Deliverables**:
- ✅ 100% test pass rate
- ✅ No performance regressions (< 1%)
- ✅ All known bugs fixed
- ✅ Regression test results documented

---

## Phase 6: Documentation & Release (Days 18-21)

### Objectives
📚 Update all documentation  
📚 Prepare release notes  
📚 Create migration guide  
📚 Buffer time for discovered issues

### Tasks

**Day 18: Buffer & Issue Resolution**
- [ ] Address any remaining issues from Phase 5
- [ ] Re-run affected tests
- [ ] Performance verification
- [ ] Code review fixes

**Day 19: Core Documentation**
- [ ] Update [README.md](../../README.md) if needed
- [ ] Update [AGENTS.md](../../AGENTS.md) with new terminology
- [ ] Update [Calculations.md](../../Docs/ARCHITECTURE/Calculations.md) if field names mentioned
- [ ] Update [Getting_Started.md](../../Docs/USER_GUIDES/Getting_Started.md)

**Day 20: Technical Documentation**
- [ ] Finalize [LLM_Schema_Mapping.md](../../Docs/REFERENCE/LLM_Schema_Mapping.md)
- [ ] Update [Prompt_Engineering_Standards.md](../../Docs/REFERENCE/Prompt_Engineering_Standards.md)
- [ ] Update [TERMINOLOGY.md](../../Docs/REFERENCE/TERMINOLOGY.md) (mark as "MIGRATED")
- [ ] Archive old diagrams/docs in `Docs/ARCHIVE/`

**Day 21: Release Preparation**
- [ ] Write [CHANGELOG.md](../../Docs/STATUS/CHANGELOG.md) entry for v2.7.0
- [ ] Create release notes highlighting breaking changes
- [ ] Update version numbers in package.json, csproj files
- [ ] Tag git commit: `v2.7.0-terminology-refactoring`

**Day 22: Final Review & Merge**
- [ ] Code review by Lead Architect
- [ ] Final PR review
- [ ] Merge to main branch
- [ ] Deploy to test environment
- [ ] Monitor for issues (24hr watch period)

**Deliverables**:
- ✅ All documentation current
- ✅ Release notes published
- ✅ Version tagged (v2.7.0)
- ✅ Merged to main

---

## Success Criteria

Before declaring Phase complete:

### Code Quality
- ✅ TypeScript compiles with zero errors
- ✅ No linter warnings
- ✅ Test coverage maintained or improved
- ✅ No `TODO` or `FIXME` comments related to migration

### Data Integrity
- ✅ 100% of jobs migrated successfully
- ✅ Zero data corruption
- ✅ All validation queries pass
- ✅ Backup available and tested

### Performance
- ✅ Job execution time within ±2% of baseline
- ✅ Database query performance unchanged
- ✅ UI responsiveness unchanged
- ✅ No memory leaks detected

### Documentation
- ✅ All docs reflect new terminology
- ✅ No references to old field names (except in "legacy" sections)
- ✅ Migration guide complete
- ✅ ADR finalized

---

## Risk Management

### Risk 1: Migration Script Fails Partway
**Mitigation**: Transaction-based updates + checkpoint logging + rollback script ready

### Risk 2: Breaking Change Impacts External API Consumer
**Likelihood**: LOW (no known external consumers)  
**Mitigation**: Version API endpoints, document breaking changes prominently

### Risk 3: LLM Outputs Don't Match New Schema
**Mitigation**: Extensive prompt testing pre-deployment + fallback handling

### Risk 4: Performance Regression
**Mitigation**: Benchmark before/after, optimize if needed, rollback if > 5% regression

---

## Rollback Strategy

If critical issues discovered post-merge:

### Immediate Rollback (< 24 hours)
1. Revert git commit
2. Restore database backup
3. Redeploy previous version
4. Investigate issue offline

### Delayed Rollback (> 24 hours)
1. Create hotfix branch from v2.6.x
2. Cherry-pick critical fixes
3. Forward-migrate any new data
4. Plan re-attempt of v2.7 migration

---

## Team Assignments

| Phase | Primary | Backup | Reviewer |
|-------|---------|--------|----------|
| Phase 1-2 | Lead Developer | - | Lead Architect |
| Phase 3 | Lead Developer | - | Database Admin |
| Phase 4 | LLM Expert | Lead Developer | Lead Architect |
| Phase 5 | QA Lead | Lead Developer | - |
| Phase 6 | Tech Writer | Lead Developer | Lead Architect |

---

## Daily Standup Questions

1. What did you complete yesterday toward the migration?
2. What will you work on today?
3. Any blockers or risks?
4. Are we on track for 3-week timeline?

---

## References

- [ADR_001](../ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md)
- [Database_Schema_Migration_v2.7.md](../ARCHITECTURE/Database_Schema_Migration_v2.7.md)
- [LLM_Schema_Mapping.md](../REFERENCE/LLM_Schema_Mapping.md)

---

**Created By**: Lead Developer  
**Reviewed By**: (Pending Lead Architect)  
**Approved By**: (Pending)  
**Status**: Draft - Awaiting Architecture Review
