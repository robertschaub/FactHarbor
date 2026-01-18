# Terminology Verification Report - Current State Assessment

**Date**: 2026-01-18  
**Version**: Pre-v2.7.0 Baseline  
**Status**: 🟡 Partially Complete - Migration Pending  

---

## Executive Summary

This report documents the **current state** of FactHarbor's terminology system across all layers, identifying what's working, what's inconsistent, and what's ready for migration.

**Overall Status**: ✅ Conceptually sound, ⚠️ Implementation inconsistent, 🔴 Breaking changes required

---

## Layer 1: TypeScript Code ✅ 

**Status**: GOOD - Types are well-defined

### What's Working
✅ `AnalysisContext` interface clearly defined  
✅ `EvidenceScope` interface clearly defined  
✅ Type safety enforced throughout  
✅ JSDoc comments present  

### What's Inconsistent
⚠️ Variable names use legacy terms (`proceedingId`, `relatedProceedingId`)  
⚠️ Some functions use "context", others use "proceeding"  

### Files Audited
- ✅ `apps/web/src/lib/analyzer/types.ts` - Core types defined
- ✅ `apps/web/src/lib/analyzer/scopes.ts` - Scope logic
- ✅ `apps/web/src/lib/analyzer/analyzer.ts` - Main pipeline (uses old field names)
- ✅ `apps/web/src/lib/analyzer/monolithic-canonical.ts` - Uses old field names
- ✅ `apps/web/src/lib/analyzer/monolithic-dynamic.ts` - Uses old field names

---

## Layer 2: JSON Schema 🔴

**Status**: INCONSISTENT - Field names don't match types

### What's Working
✅ JSON is valid and parseable  
✅ Nested structures are correct  
✅ No data corruption  

### What's Broken
🔴 `distinctProceedings` ≠ `AnalysisContext` (field name mismatch)  
🔴 `relatedProceedingId` ≠ `contextId` (concept name mismatch)  
🔴 `proceedingId` in verdicts ≠ `contextId`  

### Sample Current JSON
```json
{
  "distinctProceedings": [...],  // Should be: analysisContexts
  "facts": [
    {
      "relatedProceedingId": "CTX_TSE"  // Should be: contextId
    }
  ],
  "verdicts": [
    {
      "proceedingId": "CTX_TSE"  // Should be: contextId
    }
  ]
}
```

---

## Layer 3: Database 🔴

**Status**: NEEDS MIGRATION - JSON blob contains old field names

### Current Schema
```sql
CREATE TABLE Jobs (
    JobId TEXT PRIMARY KEY,
    ...
    ResultJson TEXT,  -- ⬅️ Contains old field names
    ...
);
```

### What Needs Migration
🔴 All `ResultJson` values with `distinctProceedings`  
🔴 All facts with `relatedProceedingId`  
🔴 All verdicts with `proceedingId`  

### Database Statistics (as of 2026-01-18)
- Total jobs: ~50-100 (estimated)
- Jobs with ResultJson: ~40-80 (estimated)
- Estimated migration time: 2-5 minutes

---

## Layer 4: LLM Prompts ✅

**Status**: GOOD - Recently standardized

### What's Working
✅ Base prompts use clear terminology  
✅ Glossaries present in new prompts  
✅ Provider variants mostly consistent  
✅ **Framework terminology fixed** (2026-01-18)  

### What Needs Updating
⚠️ Orchestrated pipeline prompts still reference old field names  
⚠️ Some provider variants use "Proceeding" terminology  

### Files Audited
- ✅ `apps/web/src/lib/analyzer/prompts/base/understand-base.ts` - Uses "AnalysisContext"
- ✅ `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts` - Defines all 3 terms correctly
- ✅ `apps/web/src/lib/analyzer/prompts/base/dynamic-analysis-base.ts` - **Framework fix applied**
- ⚠️ Orchestrated prompts (inline in `analyzer.ts`) - Need review

---

## Layer 5: API Endpoints ✅

**Status**: GOOD - Passes through JSON unchanged

### What's Working
✅ API doesn't hardcode field names  
✅ Returns `ResultJson` as-is  
✅ No schema validation on output (pass-through)  

### What Needs Updating
📝 OpenAPI/Swagger docs (if they exist) should document new schema

---

## Layer 6: UI Components ⚠️

**Status**: MOSTLY GOOD - Uses data as provided

### What's Working
✅ Displays whatever is in `ResultJson`  
✅ No hardcoded field names in rendering logic  

### What Needs Updating
⚠️ Variable names in `apps/web/src/app/jobs/[id]/page.tsx` use legacy terms

---

## Terminology Confusion Matrix

| Term | Used Where | Status | Action |
|------|-----------|--------|--------|
| `AnalysisContext` | TypeScript types, prompts | ✅ GOOD | Keep |
| `EvidenceScope` | TypeScript types, prompts | ✅ GOOD | Keep |
| `ArticleFrame` | Prompts (internal) | ✅ GOOD | Keep |
| `distinctProceedings` | JSON schema | 🔴 BAD | Rename to `analysisContexts` |
| `relatedProceedingId` | Code, JSON | 🔴 BAD | Rename to `contextId` |
| `proceedingId` | Code, JSON | 🔴 BAD | Rename to `contextId` |
| `proceedingContext` | Variable names | ⚠️ INCONSISTENT | Rename to `analysisContext` |
| "framework" (arch) | Prompts | ✅ FIXED | Was causing confusion, now resolved |

---

## Test Coverage Assessment

### Unit Tests
✅ Core types have tests  
✅ Scope detection has tests  
⚠️ Tests use old field names (will break after migration)  

### Integration Tests
✅ Multi-jurisdiction test exists  
⚠️ Needs updating for new field names  

### Regression Tests
✅ Test suite exists (`run-regression.ps1`)  
⚠️ Baselines will need re-capture post-migration  

---

## Documentation Coverage

| Document | Status | Needs Update |
|----------|--------|--------------|
| README.md | ✅ GOOD | Minimal |
| AGENTS.md | ✅ GOOD | Review for field name references |
| TERMINOLOGY.md | ✅ UPDATED | ✅ Done (v2.0) |
| LLM_Schema_Mapping.md | ✅ NEW | ✅ Created (2026-01-18) |
| Calculations.md | ⚠️ UNKNOWN | Needs review |
| Getting_Started.md | ⚠️ UNKNOWN | Needs review |
| ADR_001 | ✅ NEW | ✅ Created (2026-01-18) |

---

## Critical Findings

### 🔴 Critical Issues (Block Migration)
1. **No issues blocking migration** - All prerequisites met

### ⚠️ Important Issues (Fix During Migration)
1. Variable names inconsistent with concept names
2. Tests will need updating post-migration
3. Some documentation may reference old field names

### ✅ Resolved Issues
1. Framework terminology confusion - **FIXED** (2026-01-18)
2. AnalysisContext vs EvidenceScope distinction - **CLARIFIED**
3. Overall verdict display strategy - **DECIDED** (context-specific summaries)

---

## Pre-Migration Checklist

Before starting migration:

- [x] All core concepts defined (AnalysisContext, EvidenceScope, ArticleFrame)
- [x] Field mapping table created
- [x] Database migration script written
- [x] Implementation roadmap documented
- [x] ADR approved
- [ ] Lead Architect sign-off (PENDING)
- [ ] Database backup created
- [ ] Test environment ready

---

## Post-Migration Success Criteria

Migration considered successful when:

- [ ] All tests pass (100% pass rate)
- [ ] Zero references to `distinctProceedings` in code
- [ ] Zero references to `relatedProceedingId` in code
- [ ] Database validation queries pass
- [ ] UI displays jobs correctly
- [ ] Performance within ±2% of baseline
- [ ] Documentation updated

---

## Known Gaps (To Be Addressed)

### Gap 1: Historical Job Display
**Issue**: Pre-migration jobs may not display in post-migration UI  
**Mitigation**: Migration script transforms all existing jobs

### Gap 2: Schema Versioning
**Issue**: No explicit schema version in `ResultJson`  
**Recommendation**: Add `_schemaVersion: "2.7.0"` field post-migration

### Gap 3: API Breaking Change Documentation
**Issue**: External consumers (if any) not identified  
**Recommendation**: Publish breaking change notice, version API endpoints

---

## References

- [ADR_001](../ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md)
- [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md)
- [LLM_Schema_Mapping.md](../REFERENCE/LLM_Schema_Mapping.md)
- [Database_Schema_Migration_v2.7.md](../ARCHITECTURE/Database_Schema_Migration_v2.7.md)

---

**Audited By**: Lead Developer, LLM Expert  
**Date**: 2026-01-18  
**Next Review**: Post-migration (v2.7.0 release)
