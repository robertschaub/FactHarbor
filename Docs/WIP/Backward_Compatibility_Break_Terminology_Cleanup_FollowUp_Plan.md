# Backward Compatibility Break - Follow-Up Opportunities

**Status:** PENDING REVIEW
**Created:** 2026-02-04
**Author Role:** Lead Developer
**Related:** [Backward_Compatibility_Break_Terminology_Cleanup_Plan.md](Backward_Compatibility_Break_Terminology_Cleanup_Plan.md)

---

## Context

With the approved breaking change underway (Phase 1 complete), we have identified additional cleanup opportunities that could be addressed during this same breaking change window.

This document captures items **not included in the original plan** that may warrant inclusion.

---

## Additional Breaking Change Opportunities

### A. Legacy Type Aliases to Remove

These aliases were kept for backward compatibility but can now be removed entirely:

| Current Alias | Points To | Action |
|---------------|-----------|--------|
| `ExtractedFact` | `EvidenceItem` | Remove alias entirely |
| `DistinctProceeding` | `AnalysisContext` | Remove alias entirely |
| `ContextAnswer` | `AnalysisContextAnswer` | Remove old name |

**Impact:** Any code still using these aliases will get compile errors, forcing updates.

---

### B. ID Prefix Convention

Evidence items currently use "F" prefix (for Fact):

| Current | Proposed | Rationale |
|---------|----------|-----------|
| `F1, F2, F3...` | `E1, E2, E3...` | "E" for Evidence instead of "F" for Fact |
| `SC1, SC2...` | Keep as-is | Still "Sub-Claim" |

**Impact:**
- Prompt output schemas
- ID parsing/validation logic
- Test fixtures
- Any ID-based lookups (e.g., `supportingEvidenceIds: ["F1", "F2"]` → `["E1", "E2"]`)

**Risk:** Medium - requires coordinated update across prompts and parsing.

---

### C. Config Schema Field Names (scope → context)

From TERMINOLOGY.md deferred list - these fields use "scope" when referring to AnalysisContext:

| Legacy Field | New Field |
|--------------|-----------|
| `scopeDetectionMethod` | `contextDetectionMethod` |
| `scopeDetectionEnabled` | `contextDetectionEnabled` |
| `scopeDetectionMinConfidence` | `contextDetectionMinConfidence` |
| `scopeDedupThreshold` | `contextDedupThreshold` |

**Location:** `PipelineConfigSchema` in `config-schemas.ts`

**Impact:**
- Schema definition
- DEFAULT_PIPELINE_CONFIG
- pipeline.default.json
- Any code reading these config values

---

### D. Component/File Naming

UI components still use "ArticleFrame" terminology:

| Current | Proposed |
|---------|----------|
| `ArticleFrameBanner.tsx` | `BackgroundBanner.tsx` |
| `ArticleFrameBanner.module.css` | `BackgroundBanner.module.css` |
| `articleFrame` (prop name) | `backgroundDetails` |

**Also in monolithic-dynamic:**

| Current | Proposed |
|---------|----------|
| `rawJson.articleFrame` | `rawJson.backgroundDetails` |

**Impact:**
- File renames (git history consideration)
- Import statements
- Component usage in page.tsx

---

### E. Prompt Task Names

Internal task identifiers still use "facts" terminology:

| Current | Proposed |
|---------|----------|
| `extract_facts` | `extract_evidence` |
| `scope_refinement` | `context_refinement` (already in plan) |

**Impact:**
- Pipeline task routing
- Logging/metrics that reference task names
- Any task-name-based conditionals

---

### F. Function Parameter Names

Internal variable/parameter names throughout the codebase:

| Pattern | New Pattern |
|---------|-------------|
| `facts: ExtractedFact[]` | `evidenceItems: EvidenceItem[]` |
| `seedScopes` | `seedContexts` |
| `preDetectedScopes` | `preDetectedContexts` |
| `detectScopes()` | `detectContexts()` |
| `formatDetectedScopesHint()` | `formatDetectedContextsHint()` |

**Impact:** Internal code clarity. No external API impact.

---

## Recommendation Summary

| Item | Priority | Effort | Recommend |
|------|----------|--------|-----------|
| A. Remove type aliases | High | Low | **YES** - clean break |
| B. ID prefix F→E | Medium | Medium | **MAYBE** - coordinate with prompts |
| C. Config scope→context | High | Medium | **YES** - eliminates confusion |
| D. Component renames | Low | Low | **YES** - aligns terminology |
| E. Task name changes | Low | Low | **DEFER** - internal only |
| F. Parameter names | Low | Medium | **YES** - during file edits |

---

## Questions for Principal Architect

1. Which items (A-F) should be included in this breaking change?
2. Are there OTHER terminology issues or technical debt to address now?
3. Is major version bump (2.x → 3.0.0) sufficient for schema versioning?
4. Any concerns about clear DB + re-seed migration approach?
5. Should we document a "v3.0 Breaking Changes" summary?

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| 2026-02-04 | Lead Developer | PROPOSED | Awaiting Principal Architect review |
| 2026-02-04 | Lead Architect | **APPROVED WITH CONDITIONS** | See detailed architectural review below |

---

## Lead Architect Review (2026-02-04)

### Overall Assessment: ✅ APPROVED

**Decision:** Include A, C, D, F, G, H in current breaking change. Conditional approval for B and E pending technical assessment.

**Principle:** Since we're breaking compatibility, break once and break completely. Incremental breaks create migration fatigue.

---

### Decision Matrix

| Item | Decision | Rationale | Risk Level |
|------|----------|-----------|------------|
| **A. Remove type aliases** | ✅ **YES** | No reason to keep backward compat aliases when breaking compatibility | LOW |
| **B. ID prefix F→E** | ⚠️ **YES, with coordination** | Consistent with Evidence terminology, but needs prompt/parsing sync | MEDIUM |
| **C. Config scope→context** | ✅ **YES** | Already spirit of original plan, eliminates confusion | LOW-MEDIUM |
| **D. Component renames** | ✅ **YES** | Low effort, high clarity gain | LOW |
| **E. Task names extract_facts→extract_evidence** | ⚠️ **YES, if logging/metrics okay** | Internal consistency, assess debug/logging impact | LOW-MEDIUM |
| **F. Parameter names** | ✅ **YES** | While editing files anyway, improve internal clarity | LOW |
| **G. Prompt file rename** | ✅ **YES** | Already approved in original plan | LOW |
| **H. Function alias cleanup** | ✅ **YES** | Already approved in original plan | LOW |

---

### Detailed Decisions

#### A. Remove Legacy Type Aliases ✅ APPROVED

**Action:** Remove entirely from types.ts
- `ExtractedFact` → Use `EvidenceItem`
- `DistinctProceeding` → Use `AnalysisContext`
- `ContextAnswer` → Use `AnalysisContextAnswer`

**Rationale:** These aliases were **only** kept for backward compatibility. We're breaking compatibility, so keeping them serves no purpose.

**Implementation:** Phase 4 (after types already migrated in Phase 1)

---

#### B. ID Prefix Convention F→E ⚠️ CONDITIONAL APPROVAL

**Change:** `F1, F2, F3` → `E1, E2, E3`

**CONDITIONS for approval:**
1. ✅ Update ALL prompts to output E-prefix IDs
2. ✅ Update parsing logic to expect E-prefix
3. ✅ Update test fixtures
4. ⚠️ Consider dual-parsing temporarily (accept both F/E, log warnings for F)
5. ✅ Verify no hardcoded ID patterns in validators

**Implementation Order:**
1. Update prompts first (output schema examples)
2. Update parser to accept BOTH F and E (log warnings for F)
3. Test with new prompts
4. Remove F-prefix support after validation

**Decision:** **APPROVE** if prompt + parsing coordination is feasible. **DEFER to v3.1** if uncertain.

---

#### C. Config Field Names scope→context ✅ APPROVED

**Changes:**
```typescript
scopeDetectionMethod → contextDetectionMethod
scopeDetectionEnabled → contextDetectionEnabled
scopeDetectionMinConfidence → contextDetectionMinConfidence
scopeDedupThreshold → contextDedupThreshold
```

**Rationale:** **This should have been in the original plan** - config fields using "scope" for AnalysisContext perpetuates confusion.

**Impact:**
- `config-schemas.ts` - Schema definitions
- `DEFAULT_PIPELINE_CONFIG` - Default values
- `pipeline.default.json` - File-backed defaults
- Any code reading these config values

**Implementation:** Phase 2 (pipeline logic updates)

---

#### D. Component/File Naming ✅ APPROVED

**Changes:**
- `ArticleFrameBanner.tsx` → `BackgroundBanner.tsx`
- `ArticleFrameBanner.module.css` → `BackgroundBanner.module.css`
- `articleFrame` prop → `backgroundDetails`
- `rawJson.articleFrame` → `rawJson.backgroundDetails`

**Rationale:** Aligns UI with new `backgroundDetails` terminology. Low effort, high clarity gain.

**Implementation:** Phase 3 (UI + API alignment)

---

#### E. Task Name Changes ⚠️ CONDITIONAL APPROVAL

**Changes:**
- `extract_facts` → `extract_evidence`
- `scope_refinement` → `context_refinement` (already in plan)

**CRITICAL QUESTIONS to assess:**
1. Are task names logged anywhere for debugging? (Check logging statements)
2. Do any monitoring/metrics systems reference task names?
3. Are task names exposed in any API responses?

**Decision:** **APPROVE IF** logging/metrics won't break. **DEFER to v3.1 IF** uncertain about impact.

**Implementation:** Phase 2 (if approved)

---

#### F. Parameter Names ✅ APPROVED

**Pattern Changes:**
```typescript
facts: ExtractedFact[] → evidenceItems: EvidenceItem[]
seedScopes → seedContexts
preDetectedScopes → preDetectedContexts
detectScopes() → detectContexts()
formatDetectedScopesHint() → formatDetectedContextsHint()
```

**Rationale:** While editing files for A-E, fix parameter names too. No external API impact.

**Implementation:** Phase 2 (during pipeline logic updates)

---

#### G. Prompt File Naming ✅ APPROVED (from original plan)

**Change:**
```
apps/web/src/lib/analyzer/prompts/base/
  scope-refinement-base.ts → context-refinement-base.ts
```

**Status:** Already approved in original plan - include it.

**Implementation:** Phase 2

---

#### H. Function Alias Cleanup ✅ APPROVED (from original plan)

**From Lead Developer review of original plan:**
> "The `getXxxScopeRefinementVariant` functions already have `getXxxContextRefinementVariant` aliases. After migration, remove the `Scope` versions entirely."

**Action:**
```typescript
// In providers/anthropic.ts (and others)
export const getAnthropicScopeRefinementVariant = ...  // ❌ DELETE
export const getAnthropicContextRefinementVariant = ...  // ✅ KEEP
```

**Implementation:** Phase 4 (cleanup)

---

### Additional Architectural Guidance

#### 1. Version Numbering

**Current:** v2.x → **Proposed:** v3.0.0

**Schema Versions:**
```typescript
PipelineConfigSchema: 2.1.0 → 3.0.0
SearchConfigSchema: 2.0.0 → 3.0.0
CalculationConfigSchema: 2.0.0 → 3.0.0
```

**Validation Required:**
```typescript
// On config load:
if (config.version !== CURRENT_SCHEMA_VERSION) {
  throw new SchemaVersionMismatchError(
    `Config version ${config.version} incompatible with ${CURRENT_SCHEMA_VERSION}`
  );
}
```

---

#### 2. Migration Documentation

**Required:** Create `Docs/MIGRATION/v2-to-v3-migration-guide.md`

**Contents:**
- Summary of all breaking changes
- Field name mappings (old → new)
- Migration steps for users
- Common issues and solutions

---

#### 3. Additional Review Items

**During implementation, also review and update:**

**Error Messages:**
```bash
grep -r "fact" apps/web/src --include="*.ts" --include="*.tsx" | grep -i "error\|throw\|log"
grep -r "scope" apps/web/src --include="*.ts" --include="*.tsx" | grep -i "error\|throw\|log"
```

**API Endpoint Naming:**
- Review if any routes use "facts" or "scopes"
- Rename for consistency if found

**Logging Statements:**
- Update terminology while editing files
- Ensure debug output uses new terms

---

### Updated Implementation Plan

#### Phase 1 (DONE)
- ✅ Types updated

#### Phase 2 (ADD approved items)
- Original: Pipeline logic + prompts
- **ADD:** Config field renames (C)
- **ADD:** Parameter name updates (F)
- **ADD:** Prompt file rename (G)
- **ADD:** Task name changes (E) - if approved after assessment
- **ADD:** ID prefix changes (B) - if approved after assessment

#### Phase 3 (ADD approved items)
- Original: UI + API
- **ADD:** Component renames (D)
- **ADD:** API endpoint review

#### Phase 4 (ADD approved items)
- Original: Tests + docs
- **ADD:** Type alias removal (A)
- **ADD:** Function alias cleanup (H)

#### Phase 5 (ADD checks)
- Original: Verification
- **ADD:** Error message terminology check
- **ADD:** Logging statement review
- **ADD:** API endpoint terminology review

---

### Risk Assessment

**Overall Risk:** MEDIUM (manageable)

| Risk Factor | Level | Mitigation |
|-------------|-------|------------|
| Scope creep | MEDIUM | Clear approved list prevents drift |
| Coordination complexity | MEDIUM | Sequential phases, clear dependencies |
| Testing coverage | MEDIUM | Update tests as you go |
| Rollback difficulty | LOW | Snapshot branch exists |
| User migration burden | LOW | Already breaking, DB already cleared |

---

### Architectural Principle Applied

**"If you're breaking, break completely"**

**Rationale:**
- Breaking changes have high user cost (migration effort)
- Better to break **once completely** than **many times incrementally**
- Users tolerate one big migration better than death by a thousand cuts
- Python 2→3 precedent: Painful, but cleaned up decades of debt in one go

---

### Final Recommendations

#### Include NOW (in current breaking change):

| Item | Priority | Effort | Phase |
|------|----------|--------|-------|
| **A. Remove type aliases** | HIGH | Low | 4 |
| **C. Config scope→context** | HIGH | Medium | 2 |
| **D. Component renames** | MEDIUM | Low | 3 |
| **F. Parameter names** | MEDIUM | Medium | 2 |
| **G. Prompt file rename** | HIGH | Low | 2 |
| **H. Function alias cleanup** | MEDIUM | Low | 4 |

#### Conditional (assess and decide):

| Item | Assessment Needed | Fallback |
|------|-------------------|----------|
| **B. ID prefix F→E** | Prompt + parsing coordination feasible? | Defer to v3.1 |
| **E. Task name changes** | Logging/metrics impact acceptable? | Defer to v3.1 |

#### Review Items (not blockers):

- **API endpoint naming** - Review and fix if needed
- **Error message terminology** - Update while editing files
- **Logging statement terminology** - Update while editing files

---

### Sign-Off

| Reviewer | Role | Decision | Date |
|----------|------|----------|------|
| Claude | Lead Architect | **APPROVED** | 2026-02-04 |

**Conditions:**
1. Assess B and E before implementing (approve or defer)
2. Update Phase 2-5 implementation with approved items
3. Create v2-to-v3 migration guide
4. Review error messages, API endpoints, logging during implementation

**Next Step:** Senior Developer to assess B and E, then proceed with updated Phase 2 implementation.
