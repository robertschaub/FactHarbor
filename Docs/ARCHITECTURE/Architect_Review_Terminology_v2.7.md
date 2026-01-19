# Lead Architect Review - Terminology Refactoring v2.7.0

**Reviewed By**: Principal Software Architect  
**Date**: 2026-01-18  
**Document Package Version**: 1.0  
**Status**: ⚠️ APPROVED WITH CONDITIONS (historical)  
**Implementation Status**: ✅ Implemented (v2.7.0)

---

## Executive Summary

This review covers the terminology refactoring proposal for FactHarbor v2.7.0, which aims to align field names across TypeScript, JSON schema, database storage, and LLM prompts. The core architecture is sound and the migration approach is appropriate for the pre-production state.

**Verdict**: APPROVED WITH CONDITIONS - One blocking bug must be fixed before migration execution.

---

## Documents Reviewed

| Document | Path | Status |
|----------|------|--------|
| ADR_001 | `Docs/ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md` | ✅ Reviewed |
| TERMINOLOGY.md | `Docs/REFERENCE/TERMINOLOGY.md` | ✅ Reviewed |
| LLM_Schema_Mapping.md | `Docs/REFERENCE/LLM_Schema_Mapping.md` | ✅ Reviewed |
| Database Migration | `Docs/ARCHITECTURE/Database_Schema_Migration_v2.7.md` | ✅ Reviewed |
| Implementation Roadmap | `Docs/DEVELOPMENT/Scope_Terminology_Implementation_Roadmap.md` | ✅ Reviewed |
| Verification Report | `Docs/DEVELOPMENT/Terminology_Verification_Report.md` | ✅ Reviewed |
| Pre-Optimization Checklist | `Docs/STATUS/Pre_Prompt_Optimization_Checklist.md` | ✅ Reviewed |

**Code Verification Performed**:
- `apps/web/src/lib/analyzer/types.ts` - Interface definitions verified
- `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts` - Glossary presence verified
- Grep searches for `distinctProceedings` (114 matches), `relatedProceedingId` (118 matches), `proceedingContext` (9 matches)

---

## Section A: Decision Validation

### A1. Breaking Changes Approval

**Context**: This refactoring requires breaking changes to JSON schema stored in database.

**User Decision**: ✅ Breaking changes approved (2026-01-18)

**Architect Review**: ✅ **AGREE** - Breaking changes are acceptable

**Notes**:
Breaking changes are appropriate given:
1. No production data at risk (per ADR_001, line 65)
2. Clear backup strategy documented (Database_Schema_Migration_v2.7.md §Pre-Migration Checklist)
3. One-time technical debt elimination vs. perpetual dual-terminology maintenance

**Issue Found**: TERMINOLOGY.md (line 456) references "§5.2 parallel fields" for gradual migration, but ADR_001 explicitly rejects soft migration (lines 73-80).

**Required Action**: Update TERMINOLOGY.md line 456 to reflect the approved aggressive migration strategy.

---

### A2. Field Naming Conventions

**Proposed Changes**:

| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `distinctProceedings` | `analysisContexts` | Matches TypeScript type name |
| `relatedProceedingId` | `contextId` | Clearer, shorter, consistent |
| `proceedingId` | `contextId` | Unified terminology |
| `proceedingContext` | `analysisContext` | Matches concept name |

**Architect Review**: ✅ **APPROVE** all naming changes

**Issue Found**: The migration script (Database_Schema_Migration_v2.7.md, lines 213-217) includes a 4th transformation (`proceedingContext` → `analysisContext`) that is NOT listed in:
- ADR_001 "Key Changes" table (lines 52-58)
- TERMINOLOGY.md field mapping table (lines 20-26)

**Required Action**: Update ADR_001 and TERMINOLOGY.md to include:

| `proceedingContext` | `analysisContext` | JSON Schema (understanding object) |

---

### A3. Migration Timeline

**Proposed**: 3 weeks (15 working days)

**Architect Review**: ⚠️ **TIMELINE IS AGGRESSIVE**

**Concerns**:
1. **Phase 2 (Days 3-7)**: 5 days for code layer seems tight given:
   - 114 occurrences of `distinctProceedings` (verified via grep)
   - 118 occurrences of `relatedProceedingId` (verified via grep)
   - 9 occurrences of `proceedingContext` (verified via grep)
   - Plus test file updates and UI changes

2. **Phase 4 (Days 10-12)**: Prompt standardization shows only `scope-refinement-base.ts` has a TERMINOLOGY section (verified via grep). Other base prompts need glossaries added.

3. No contingency buffer documented for discovery of hidden dependencies

**Recommendation**: 
- Add 2-3 days buffer → **3.5 weeks total**
- OR accept 3 weeks but document explicit "feature freeze" during migration

---

## Section B: Architecture Review

### B1. AnalysisContext Design

**Definition**: A bounded analytical frame representing an **uncomparable verdict space** that requires separate, independent analysis.

**Architect Review**: ✅ **DEFINITION IS CLEAR AND CORRECT**

**Verification**: The `types.ts` file (lines 147-180) demonstrates excellent domain-agnostic design with:
- Generic fields (`subject`, `temporal`, `status`, `outcome`) for all domains
- Flexible metadata object with optional domain-specific fields
- Clear JSDoc documentation distinguishing from EvidenceScope

**Enhancement Suggestion** (non-blocking): The decision tree in TERMINOLOGY.md (lines 273-290) could be extracted into code as a validation helper for LLM output, ensuring programmatic enforcement of split rules.

---

### B2. EvidenceScope Design

**Definition**: Per-fact source methodology metadata describing how **the source document** computed its data.

**Architect Review**: ✅ **DISTINCTION IS CLEAR**

**Verification**: The `EvidenceScope` interface (`types.ts` lines 195-201) is well-designed:
- Captures methodology, boundaries, geographic, temporal at fact level
- Clear JSDoc (lines 182-194) explains relationship to AnalysisContext
- Nullable by design (not all facts have source methodology)

**Recommendation**: The TERMINOLOGY.md decision tree (lines 297-310) "Is this EvidenceScope or AnalysisContext?" should be included in all base prompts, not just `scope-refinement-base.ts`.

---

### B3. Separation of Concerns

**Architect Review**: ✅ **SEPARATION IS CORRECT**

The separation is architecturally sound:
- **AnalysisContext**: verdict-space partitioning (can't combine TSE + SCOTUS verdicts)
- **EvidenceScope**: fact-level metadata (can compare WTW facts within same context)
- **ArticleFrame**: narrative descriptor (doesn't affect analysis logic)

**Verified in code**:
- `fact.relatedProceedingId` → points to `AnalysisContext.id` (which context)
- `fact.evidenceScope` → describes source methodology (how source calculated)
- These are orthogonal as documented in TERMINOLOGY.md FAQ (lines 486-488)

**Minor Gap**: A relationship diagram showing `Fact → AnalysisContext` (via contextId) AND `Fact → EvidenceScope` (via evidenceScope) would improve LLM_Schema_Mapping.md

---

### B4. JSON Schema Evolution Strategy

**Current Approach**: Direct field renames via migration script, no parallel fields.

**Architect Review**: ✅ **AGGRESSIVE MIGRATION IS APPROPRIATE** (with critical fix)

**🔴 CRITICAL BUG FOUND**:

Database_Schema_Migration_v2.7.md (lines 213-217) shows Transform 4:
```typescript
if (result.proceedingContext) {
  result.analysisContext = result.proceedingContext;
  delete result.proceedingContext;
}
```

This transforms a **TOP-LEVEL** field, but per TERMINOLOGY.md (line 185), the actual location is:
```
ResultJson.understanding.proceedingContext
```

**REQUIRED FIX**: Update migration script lines 213-217 to:
```typescript
if (result.understanding?.proceedingContext) {
  result.understanding.analysisContext = result.understanding.proceedingContext;
  delete result.understanding.proceedingContext;
}
```

**This is a BLOCKING issue for migration approval.**

---

## Section C: Risk Assessment

### C1. Database Corruption Risk

**Assessment**: LOW  

**Architect Review**: ⚠️ **NEED ADDITIONAL SAFEGUARDS**

Existing mitigations are good (backup, test run, validation queries, rollback).

**Additional Recommendations**:
1. Add transaction wrapping to migration script (currently missing)
2. Add record-level success/failure logging for audit trail
3. Add integrity check: count jobs before/after must match
4. Consider SQLite VACUUM after migration to reclaim space

The migration script (lines 173-235) processes sequentially without transaction boundaries - a partial failure leaves database in inconsistent state.

---

### C2. Performance Regression Risk

**Assessment**: LOW (< 1% expected impact)  

**Architect Review**: ✅ **PERFORMANCE IMPACT ACCEPTABLE**

Assessment is correct - field name changes don't affect JSON size or parsing complexity.

**Recommendation**: Document baseline metrics before migration:
- Average job execution time (by pipeline variant)
- Database query latency for job retrieval
- UI page load time for `/jobs/[id]`

---

### C3. LLM Confusion Risk

**Assessment**: LOW  

**Architect Review**: ⚠️ **NEED PROMPT TESTING**

**Important Finding**: The Verification Report (line 117) states "Orchestrated pipeline prompts still reference old field names" and these are "inline in `analyzer.ts`".

**Verified**: `analyzer.ts` has 83 occurrences of `distinctProceedings`.

The prompt standardization phase (Roadmap Days 10-12) lists:
- understand-base.ts
- scope-refinement-base.ts  
- extract-facts-base.ts
- verdict-base.ts

**BUT DOES NOT LIST** `analyzer.ts` inline prompts. This is a gap.

**Required Actions**:
1. Extract inline prompts from `analyzer.ts` to separate files, OR
2. Explicitly add `analyzer.ts` to Phase 4 task list
3. Add grep verification step: "Zero occurrences of old terms in prompt text"

---

### C4. API Breaking Change Impact

**Assessment**: LOW (no known external consumers)  

**Architect Review**: ✅ **API IMPACT ACCEPTABLE**

The Pre_Prompt_Optimization_Checklist (lines 105-123) correctly identifies this as "UNDECIDED" and recommends Option A (no versioning for now).

**Concur**: API versioning overhead is not justified without known consumers.

**Document for Record**: If external consumers emerge post-v2.7, they will need to handle new field names. Add note to release notes that schema changed.

---

## Section D: Open Questions - Architect Decisions

### D1. Schema Versioning

**Question**: Should we add explicit `_schemaVersion` field to ResultJson?

**Decision**: ✅ **ADD `_schemaVersion: "2.7.0"` FIELD**

**Reasoning**:
1. Future migrations can detect schema version without pattern matching
2. Debugging is easier ("why does this job look different?" → check version)
3. Minimal overhead (single string field)

**Implementation**: Add to result builder in `monolithic-canonical.ts`, `monolithic-dynamic.ts`, and `analyzer.ts` for orchestrated pipeline.

```json
{
  "_schemaVersion": "2.7.0",
  "analysisContexts": [...],
  ...
}
```

---

### D2. Runtime Validation

**Question**: Should we add runtime validation for `contextId` references?

**Decision**: ✅ **ADD VALIDATION**

**Reasoning**: TERMINOLOGY.md (lines 352-366) already documents this as a common pitfall with a recommended solution.

**Implementation**:
```typescript
const validContextIds = new Set(contexts.map(c => c.id));
if (fact.contextId && !validContextIds.has(fact.contextId)) {
  agentLog("WARN", `Invalid contextId reference: ${fact.contextId}`);
}
```

Add validation in verdict generation phase. Log warnings (not errors) for `CTX_UNSCOPED` and `CTX_GENERAL` special cases.

**Priority**: Implement during Phase 2 (code layer) - not a separate phase.

---

### D3. UI Terminology

**Question**: Should UI expose "AnalysisContext" term to end users?

**Decision**: **OPTION B - Use "Context"**

**Reasoning**:
1. Technical users understand it
2. Non-technical users won't be confused
3. Shorter = better for UI real estate
4. Can evolve to domain-specific labels in future release

**Do NOT use "AnalysisContext"** in user-facing UI - it's implementation terminology.

**UI Labels**:
- Multiple contexts → "This analysis covers 2 contexts"
- Context selector → "View by Context"
- Single context → Just show the context name, no label needed

---

### D4. Timeline Extension

**Question**: Should timeline be extended from 3 weeks to 4 weeks?

**Decision**: **3.5 WEEKS (17-18 working days)**

**Reasoning**:
3 weeks is achievable if:
1. The migration script bug is fixed (Section B4)
2. `analyzer.ts` inline prompts are explicitly scoped
3. Team has no other commitments during this period

Adding 2-3 days buffer accounts for:
- Unknown dependencies discovered during grep searches
- Test failures requiring investigation
- Documentation updates taking longer than estimated

NOT extending to 4 weeks because:
- Most risk is front-loaded (Phase 1-3)
- Phase 5-6 can compress if earlier phases go smoothly

---

## Section E: Final Sign-Off Checklist

### E1. Documentation Quality
- [x] All core concepts clearly defined
- [x] Field mappings complete and correct
- [ ] Migration script documented and tested *(BUG: proceedingContext path incorrect)*
- [x] Rollback plan documented
- [x] Implementation roadmap realistic

### E2. Risk Mitigation
- [x] All HIGH/CRITICAL risks have mitigation strategies
- [x] Backup strategy documented
- [ ] Validation plan comprehensive *(MISSING: analyzer.ts prompt coverage)*
- [x] Rollback tested

### E3. Team Readiness
- [x] Implementation team understands scope
- [ ] Timeline has team buy-in *(RECOMMEND: confirm 3.5 week adjustment)*
- [x] Test environment available
- [x] Stakeholders informed

### E4. Technical Soundness
- [x] Architecture principles maintained
- [x] No circular dependencies introduced
- [x] Performance impact assessed
- [x] Backward compatibility plan (if needed)

---

## Final Decision

### Overall Approval Status

## ⚠️ APPROVED WITH CONDITIONS

---

### Conditions for Approval (MUST complete before migration execution)

#### Condition 1: FIX MIGRATION SCRIPT (🔴 BLOCKING)

**File**: `Docs/ARCHITECTURE/Database_Schema_Migration_v2.7.md`  
**Lines**: 213-217

**Current (INCORRECT)**:
```typescript
if (result.proceedingContext) {
  result.analysisContext = result.proceedingContext;
  delete result.proceedingContext;
}
```

**Required (CORRECT)**:
```typescript
if (result.understanding?.proceedingContext) {
  result.understanding.analysisContext = result.understanding.proceedingContext;
  delete result.understanding.proceedingContext;
}
```

**Reason**: This is a data integrity issue that would leave `proceedingContext` unmigrated.

---

#### Condition 2: UPDATE ADR_001 (Required)

**File**: `Docs/ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md`  
**Location**: "Key Changes" table (lines 52-58)

**Action**: Add missing row:
```
| `proceedingContext` | `analysisContext` | JSON Schema |
```

---

#### Condition 3: UPDATE TERMINOLOGY.md (Required)

**File**: `Docs/REFERENCE/TERMINOLOGY.md`

**Actions**:
1. Remove reference to "§5.2 parallel fields" (line 456) which contradicts approved strategy
2. Add `proceedingContext` mapping to field mapping table (lines 20-26)

---

#### Condition 4: ADD PROMPT COVERAGE (Required before Phase 4)

**Actions**:
1. Add TERMINOLOGY glossary section to ALL base prompts (currently only in `scope-refinement-base.ts`)
2. Add `analyzer.ts` inline prompts to Phase 4 task list in roadmap
3. Add grep verification step: zero occurrences of old terms in any prompt text

**Files requiring glossary addition**:
- `apps/web/src/lib/analyzer/prompts/base/understand-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/extract-facts-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/dynamic-plan-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/dynamic-analysis-base.ts`

---

#### Condition 5: TIMELINE ADJUSTMENT (Recommended)

**Options** (choose one):
- Update roadmap to 3.5 weeks (17-18 working days), OR
- Document explicit "feature freeze" for the team during 3-week period

---

## Architect Notes & Recommendations

### Overall Assessment

This is a well-documented, architecturally sound refactoring effort. The terminology model (AnalysisContext vs EvidenceScope vs ArticleFrame) is correctly designed and the migration approach is appropriate for the pre-production state.

### Strengths

| Area | Assessment |
|------|------------|
| Documentation | Comprehensive 7-document package, well-cross-referenced |
| Decision Rationale | Clear reasoning in ADR_001 |
| Migration Plan | Detailed script with rollback capability |
| Type Design | Good separation of concerns, domain-agnostic |

### Weaknesses

| Issue | Severity | Status |
|-------|----------|--------|
| Migration script proceedingContext path bug | 🔴 CRITICAL | Blocking |
| TERMINOLOGY.md mentions soft migration | 🟠 MEDIUM | Inconsistency |
| Glossary only in 1 of ~5 base prompts | 🟠 MEDIUM | Gap |
| analyzer.ts inline prompts not in roadmap | 🟠 MEDIUM | Gap |

### Improvements Proposed

1. **Critical**: Fix migration script `proceedingContext` path
2. **Recommended**: Add `_schemaVersion` field for future-proofing
3. **Recommended**: Add runtime validation for `contextId` references
4. **Suggested**: Extract inline prompts from `analyzer.ts` (tech debt reduction)
5. **Suggested**: Create visual diagram showing Fact → AnalysisContext + EvidenceScope relationships

### Post-Migration Recommendations

1. Archive v2.6.x documentation clearly marked as legacy
2. Update AGENTS.md with any new field names used in examples
3. Consider adding schema validation to API layer (currently pass-through)

---

## Summary of Findings

| Category | Status | Count |
|----------|--------|-------|
| Blocking Issues | 🔴 | 1 |
| Required Updates | 🟠 | 3 |
| Recommendations | 🟢 | 5 |
| Architecture | ✅ | Sound |
| Documentation | ✅ | Comprehensive |

---

## Sign-Off

**Reviewed By**: Principal Software Architect  
**Date**: 2026-01-18  
**Status**: ⚠️ APPROVED WITH CONDITIONS

---

## Next Steps After Conditions Addressed

1. ⚠️ Fix migration script bug (Condition #1) - **BEFORE ANY CODE WORK**
2. Lead Developer creates migration branch
3. Phase 1 (Preparation) begins after conditions addressed
4. Daily standup updates to architect
5. Critical decisions escalated immediately

---

## References

- [ADR_001_Scope_Context_Terminology_Refactoring.md](./ADR_001_Scope_Context_Terminology_Refactoring.md)
- [Database_Schema_Migration_v2.7.md](./Database_Schema_Migration_v2.7.md)
- [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md)
- [LLM_Schema_Mapping.md](../REFERENCE/LLM_Schema_Mapping.md)
- [Scope_Terminology_Implementation_Roadmap.md](../DEVELOPMENT/Scope_Terminology_Implementation_Roadmap.md)
- [Terminology_Verification_Report.md](../DEVELOPMENT/Terminology_Verification_Report.md)
- [Pre_Prompt_Optimization_Checklist.md](../STATUS/Pre_Prompt_Optimization_Checklist.md)

---

**Document Version**: 1.0  
**Created**: 2026-01-18  
**Classification**: Internal - Architecture Review
