# Scope/Context Terminology & Architecture Analysis (Pre-v2.7.0)

**Date**: 2026-01-18
**Author**: AI Assistant (Lead Developer & LLM Expert Role)
**Status**: Archived Reference - v2.7.0 Implemented

---

## Executive Summary

This document provides a comprehensive audit of FactHarbor's **Scope/Context** terminology system across three critical layers: code objects, code-to-prompt mappings, and LLM-to-schema mappings. It reflects the **pre-v2.7.0 state** and documents inconsistencies that have since been addressed. For current terminology, see `Docs/REFERENCE/TERMINOLOGY.md` and `Docs/REFERENCE/LLM_Schema_Mapping.md`.

### Critical Findings

1. **HIGH RISK**: The term "Scope" is overloaded across three distinct concepts with no clear disambiguation rules
2. **CRITICAL**: JSON field names directly contradict TypeScript type names, creating maintainability debt
3. **MEDIUM RISK**: Prompt terminology varies across pipeline variants, risking LLM confusion
4. **LOW RISK**: Missing runtime validation allows ID mismatches to fail silently
5. **RESOLVED (2026-01-18)**: "Framework" terminology confusion in `dynamic-analysis-base.ts` - replaced with "context" to align with `AnalysisContext`

### Recommendations

**Immediate (Week 1-2)**: Documentation-only fixes with explicit glossaries
**Short-term (Month 1-2)**: Parallel field introduction using Soft Migration pattern
**Long-term (Month 3-6)**: Full deprecation and database migration

---

## 1. Code Layer Analysis: Object Definitions

### 1.1 `AnalysisContext` Interface (Primary Entity)

**Location**: [apps/web/src/lib/analyzer/types.ts](../apps/web/src/lib/analyzer/types.ts) lines 147-180

**Current Definition**:
```typescript
export interface AnalysisContext {
  id: string;
  name: string;
  shortName: string;
  subject: string;
  temporal: string;
  status: "concluded" | "ongoing" | "pending" | "unknown";
  outcome: string;
  metadata: { ... };
}
```

**Actual Usage**:
- **Stored as**: `distinctProceedings` (JSON field)
- **Referenced by**: `relatedProceedingId` (not `analysisContextId`)
- **Displayed as**: "Contexts" in UI (page.tsx line 531)
- **Called in prompts**: "AnalysisContext" OR "Scope" OR "distinctProceedings"

**Confusion Points**:
1. TypeScript name (`AnalysisContext`) ≠ JSON name (`distinctProceedings`)
2. Type alias exists: `export type DistinctProceeding = AnalysisContext` (backwards compat)
3. Comments say "Formerly called 'Proceeding'" but field names haven't changed

**Semantic Clarity Score**: **4/10** (Critical - Three different names for same concept)

**Proposed Improvements**:
- **Option A** (Breaking): Rename JSON field to `analysisContexts`
- **Option B** (Soft): Add `analysisContexts` alongside `distinctProceedings`, deprecate old field
- **Option C** (Doc-only): Add prominent glossary mapping table in types.ts

---

### 1.2 `EvidenceScope` Interface (Per-Fact Metadata)

**Location**: [apps/web/src/lib/analyzer/types.ts](../apps/web/src/lib/analyzer/types.ts) lines 195-201

**Current Definition**:
```typescript
export interface EvidenceScope {
  name: string;
  methodology?: string;
  boundaries?: string;
  geographic?: string;
  temporal?: string;
}
```

**Actual Usage**:
- **Attached to**: `ExtractedFact.evidenceScope` (per-fact field)
- **Purpose**: Captures source document's methodology/boundaries (e.g., WTW vs TTW)
- **Distinction**: NOT an AnalysisContext! This is source-level scope, not analysis-level scope

**Confusion Points**:
1. Both `AnalysisContext` and `EvidenceScope` use the word "Scope"
2. Prompts say "EvidenceScope" but also use "Scope" for AnalysisContext
3. No runtime check that `evidenceScope.name` doesn't conflict with `AnalysisContext.id`

**Semantic Clarity Score**: **6/10** (Medium - Clear purpose, but naming collision)

**Proposed Improvements**:
- Rename to `SourceMethodologyMetadata` (more explicit)
- OR: Keep name but add prefix in prompts: "Per-Fact EvidenceScope" vs "Top-Level Scope"
- Add validation that `evidenceScope.name` format differs from `AnalysisContext.id` format

---

### 1.3 `proceedingContext` Field (Misleading Name)

**Location**: [apps/web/src/lib/analyzer/types.ts](../apps/web/src/lib/analyzer/types.ts) line 299

**Current Definition**:
```typescript
proceedingContext: string;
```

**Actual Meaning**: Narrative/background framing of the article. NOT a scope. NOT a reason to split.

**Confusion Points**:
1. Name suggests it's related to "proceedings" (AnalysisContexts)
2. Actually stores "ArticleFrame" concept (per comments)
3. Field name gives ZERO hint that it's NOT an analysis context

**Semantic Clarity Score**: **2/10** (CRITICAL - Completely misleading name)

**Proposed Improvements**:
- **Option A** (Breaking): Rename to `articleFrameNarrative`
- **Option B** (Soft): Add `articleFrame` field, mark `proceedingContext` as deprecated
- **Option C** (Doc-only): Add BIG WARNING comment explaining this is NOT a scope

---

### 1.4 `relatedProceedingId` Field (Inconsistent Naming)

**Location**: Multiple files - used in `ExtractedFact`, `subClaims`, `ContextAnswer`

**Current Usage**:
- Facts: `fact.relatedProceedingId` → references `AnalysisContext.id`
- Claims: `claim.relatedProceedingId` → references `AnalysisContext.id`
- Prompts: Sometimes "relatedProceedingId", sometimes "scopeId"

**Confusion Points**:
1. "Proceeding" terminology conflicts with "AnalysisContext" rebranding
2. Prompts use "scopeId" but schema uses "relatedProceedingId"
3. No runtime validation that ID exists in `distinctProceedings` array

**Semantic Clarity Score**: **5/10** (Medium - Functional but inconsistent)

**Proposed Improvements**:
- Add `analysisContextId` field as alias
- Add runtime validation: `assert(contextIds.includes(fact.relatedProceedingId))`
- Prompts should use consistent "proceedingId" or switch to "contextId"

---

### 1.5 `ContextAnswer` vs `ProceedingAnswer` (Dual Aliases)

**Location**: [apps/web/src/lib/analyzer/types.ts](../apps/web/src/lib/analyzer/types.ts) lines 233-249

**Current Definition**:
```typescript
export interface ContextAnswer {
  proceedingId: string;
  proceedingName: string;
  answer: number;
  // ...
}
export type ProceedingAnswer = ContextAnswer;
```

**Confusion Points**:
1. Type is called `ContextAnswer` but fields are `proceedingId`/`proceedingName`
2. Type alias `ProceedingAnswer` exists for "backward compatibility" but adds confusion
3. No indication which name is "preferred" for new code

**Semantic Clarity Score**: **5/10** (Medium - Dual naming without clear guidance)

**Proposed Improvements**:
- Pick ONE name and deprecate the other
- If keeping `ContextAnswer`, add field aliases: `contextId` → `proceedingId`
- Add JSDoc: `@preferred Use ContextAnswer in new code`

---

### 1.6 `UNSCOPED_ID` Constant (Special Case Handling)

**Location**: [apps/web/src/lib/analyzer/scopes.ts](../apps/web/src/lib/analyzer/scopes.ts) line 25

**Current Usage**:
```typescript
export const UNSCOPED_ID = "CTX_UNSCOPED";
```

**Purpose**: Facts that don't map to any detected scope get this ID

**Confusion Points**:
1. No documentation on when to use vs when to use `"CTX_GENERAL"`
2. UI treatment of `CTX_UNSCOPED` facts is undefined
3. Memory note says "CTX_UNSCOPED/General is intended to be display-only" but no code enforces this

**Semantic Clarity Score**: **7/10** (Good - Clear constant, but missing usage rules)

**Proposed Improvements**:
- Add JSDoc explaining difference: `UNSCOPED` vs `GENERAL` vs fallback scope
- Add UI test verifying that `CTX_UNSCOPED` facts are grouped correctly
- Consider renaming to `UNMAPPED_SCOPE_ID` (more explicit)

---

## 2. Code-to-Prompt Mapping Analysis

### 2.1 Terminology Mapping Table

| Code Entity | TypeScript Name | JSON Field Name | Prompt Term 1 | Prompt Term 2 | Prompt Term 3 | Consistency Score |
|-------------|-----------------|-----------------|---------------|---------------|---------------|-------------------|
| Top-level analysis frame | `AnalysisContext` | `distinctProceedings` | "AnalysisContext" | "Scope" | "distinctProceedings" | 3/10 (CRITICAL) |
| Per-fact source metadata | `EvidenceScope` | `evidenceScope` | "EvidenceScope" | - | - | 10/10 (Good) |
| Narrative background | (no type) | `proceedingContext` | "ArticleFrame" | - | - | 5/10 (Misleading field name) |
| Reference to top-level | - | `relatedProceedingId` | "proceedingId" | "scopeId" | - | 5/10 (Dual terminology) |

### 2.2 Prompt File Analysis (11 Files Audited)

**Base Prompts** (6 files):
- `understand-base.ts`: Uses "scope" (generic), "detectedScopes" (output field)
- `extract-facts-base.ts`: Uses "relatedProceedingId", "evidenceScope" (both!)
- `verdict-base.ts`: Uses "proceedingId", "scopesList" variable
- `scope-refinement-base.ts`: **Explicitly defines all three terms** (lines 14-18) ✓ GOOD
- `dynamic-plan-base.ts`: No scope terminology (N/A)
- `dynamic-analysis-base.ts`: Generic "scope" mention, no specific fields

**Provider Variants** (4 files):
- `anthropic.ts`: "AnalysisContext", "ArticleFrame", "evidenceScope" - consistent ✓
- `openai.ts`: "proceedingId", "scopesList" - uses legacy naming
- `google.ts`: "distinctProceedings", "relatedProceedingId" - uses JSON field names directly
- `mistral.ts`: "proceedingId", "scopes" - mixed terminology

**Config Adaptations** (1 file):
- `tiering.ts`: No scope-specific terminology (N/A)

### 2.3 Inconsistency Analysis

**Critical Issues**:
1. **Understand Phase**: Outputs `detectedScopes` but TypeScript expects `distinctProceedings`
2. **Extract Facts Phase**: Mixes "relatedProceedingId" (field name) with conceptual "scope" talk
3. **Verdict Phase**: Uses `proceedingId` in prompts but `AnalysisContext` in comments
4. **Provider Drift**: Each LLM gets slightly different terminology

**Impact on LLM Performance**:
- LLMs see "AnalysisContext" in one prompt, "Scope" in another, "proceeding" in schema
- Potential for field name invention (LLM creates `scopeId` when schema expects `proceedingId`)
- No examples showing ALL THREE concepts in use together (AnalysisContext + EvidenceScope + ArticleFrame)

### 2.4 Gap Analysis vs External Best Practices

**Best Practice 1** ([MIT TACL 2024](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00670/121540)): "Scope should be unambiguous"
- **FactHarbor Status**: FAILS - "Scope" means AnalysisContext OR EvidenceScope depending on context

**Best Practice 2** ([r/PromptEngineering](https://reddit.com/r/PromptEngineering/comments/1mai2a1)): "Separate concerns modularly"
- **FactHarbor Status**: PARTIAL PASS - Modular prompts exist, but terminology inconsistent

**Best Practice 3** ([Springer 2025](https://link.springer.com/article/10.1007/s10111-025-00817-6)): "Avoid redundant context"
- **FactHarbor Status**: PASS - Token-efficient, no obvious bloat

**Best Practice 4**: "Use provider-specific optimizations but keep core semantics identical"
- **FactHarbor Status**: FAILS - Provider variants use different field name terminology

---

## 3. LLM-to-Schema Mapping Analysis

### 3.1 Schema Validation Status

**Current State**:
- Zod schemas exist for structured output (ClaimExtractionSchema, FactExtractionSchema, VerdictSchema)
- Schemas use JSON field names (`distinctProceedings`, `relatedProceedingId`)
- No runtime check that LLM-generated IDs match expected structure

**Validation Gaps**:
1. **No ID existence check**: LLM can output `relatedProceedingId: "CTX_FAKE"` and it's accepted
2. **Silent fallbacks**: `monolithic-canonical.ts` line 672 falls back to empty array if `detectedScopes` missing
3. **Type coercion**: `(s: any) =>` casts bypass type safety

### 3.2 Response Parsing Issues

**Example from** [monolithic-canonical.ts](../apps/web/src/lib/analyzer/monolithic-canonical.ts) **lines 670-694**:
```typescript
const finalScopes =
  params.verdictData?.detectedScopes && params.verdictData.detectedScopes.length > 0
    ? params.verdictData.detectedScopes.map((s: any) => ({
        id: s.id,
        name: s.name,
        // ... stored as distinctProceedings
      }))
    : [{ id: "CTX_MAIN", ... }];
```

**Issues**:
1. LLM outputs `detectedScopes` (prompt term) → Code maps to `distinctProceedings` (JSON field)
2. Fallback to `CTX_MAIN` happens silently (no warning logged)
3. No validation that `s.id` follows expected format (`CTX_*` or `SCOPE_*`)

### 3.3 Field Name Mismatch Matrix

| LLM Output Field | Expected Schema Field | Mapping Function | Silent Failure Risk |
|------------------|----------------------|------------------|---------------------|
| `detectedScopes` | `distinctProceedings` | Manual map | HIGH (if LLM uses wrong name) |
| `scopeId` | `relatedProceedingId` | Direct assign | HIGH (no validation) |
| `contextId` | `proceedingId` | None (unsupported) | CRITICAL (data loss) |
| `evidenceScope` | `evidenceScope` | Direct | LOW (consistent naming) |

### 3.4 Proposed Validation Enhancements

**Phase 1: Schema Strictness**
```typescript
const ScopeIdSchema = z.string().regex(/^(CTX|SCOPE)_[A-Z0-9_]+$/);
const AnalysisContextSchema = z.object({
  id: ScopeIdSchema,
  name: z.string().min(5).max(120),
  // ... enforce constraints
});
```

**Phase 2: Runtime Assertion**
```typescript
function validateScopeReferences(facts: ExtractedFact[], contexts: AnalysisContext[]) {
  const validIds = new Set(contexts.map(c => c.id));
  for (const fact of facts) {
    if (fact.relatedProceedingId && !validIds.has(fact.relatedProceedingId)) {
      throw new ValidationError(`Fact ${fact.id} references unknown context: ${fact.relatedProceedingId}`);
    }
  }
}
```

**Phase 3: Logging**
```typescript
if (!params.verdictData?.detectedScopes) {
  agentLog("WARN", "LLM did not return detectedScopes, using fallback CTX_MAIN");
}
```

---

## 4. Architectural Weaknesses

### 4.1 Backward Compatibility Trap

**Problem**: Field names like `distinctProceedings` and `proceedingContext` are kept "for backward compatibility with persisted data" (types.ts line 106), but this creates semantic debt.

**Impact**:
- New developers see `AnalysisContext` type but write to `distinctProceedings` field
- Refactoring is blocked by fear of breaking existing database records
- Documentation must constantly explain "this is called X but stored as Y"

**Evidence**:
- 70 usages of `distinctProceedings` across 13 files
- 10 usages of `relatedProceedingId` in types.ts alone
- Comments like "field name kept for backward compat" appear 6 times

### 4.2 Overloaded "Scope" Terminology

**Three Distinct Meanings**:
1. **AnalysisContext** (top-level): "Scope" = bounded analytical frame for separate verdicts
2. **EvidenceScope** (per-fact): "Scope" = source methodology/boundaries metadata
3. **AGENTS.md** (unified term): "Scope replaces and unifies Context, Proceeding, Event"

**No Disambiguation Rule**:
- Prompts use "scope" generically without specifying which concept
- Example: "Identify which scope each fact belongs to" - does this mean AnalysisContext or EvidenceScope?

**Evidence from Prompts**:
- `understand-base.ts` line 26: "DISTINCT SCOPES" (refers to AnalysisContext)
- `extract-facts-base.ts` line 40: "evidenceScope" (refers to per-fact metadata)
- Same word, completely different concepts, no qualifier

### 4.3 Prompt Drift Across Pipeline Variants

**Orchestrated Pipeline** (`analyzer.ts` line 3050):
- Uses "AnalysisContext" and "distinctProceedings" explicitly
- 3046-line system prompt with detailed terminology section

**Monolithic Canonical** (`monolithic-canonical.ts` lines 162-175):
- Uses `buildPrompt()` system with modular prompts
- Terminology controlled by `prompt-builder.ts` composition

**Monolithic Dynamic** (`monolithic-dynamic.ts` lines 203-214):
- Minimal scope handling, generic "scope" mentions only
- No explicit multi-scope detection logic

**Risk**: LLMs trained on one pipeline variant may perform poorly on another due to terminology shifts.

### 4.4 Missing Runtime Validation

**No Checks For**:
1. `relatedProceedingId` exists in `distinctProceedings` array
2. `evidenceScope.name` doesn't collide with `AnalysisContext.id`
3. All claims have valid `relatedProceedingId` when multi-scope detected
4. `CTX_UNSCOPED` facts are intentionally unscoped (vs missing assignment)

**Current Behavior**: Silent failures cascade into incorrect verdict aggregation

**Example Failure Mode**:
```
1. LLM outputs fact with relatedProceedingId: "CTX_FAKE"
2. Schema validation accepts (no ID format check)
3. Verdict generation loops over scopes, skips fact (ID mismatch)
4. Result: Lower confidence verdict due to "missing evidence"
5. User sees 43% UNVERIFIED when should be 85% TRUE
```

---

## 5. Improvement Proposals

### 5.1 Option A: Aggressive Refactoring (Breaking Change)

**Changes**:
- Rename ALL JSON fields to match TypeScript types
  - `distinctProceedings` → `analysisContexts`
  - `proceedingContext` → `articleFrameNarrative`
  - `relatedProceedingId` → `analysisContextId`
  - `proceedingId` → `contextId` (in ContextAnswer)
- Update all prompts to use new terminology
- Migrate existing database records (1022 jobs analyzed)

**Pros**:
- Complete semantic clarity
- No more "this is called X but stored as Y" explanations
- Future-proof: No legacy debt

**Cons**:
- **BREAKS** all existing database records (requires migration script)
- Risk of data loss if migration fails
- Requires coordinated update of API, Web, and Database
- Estimated effort: 2-3 weeks

**Risk Level**: **HIGH** - Not recommended without extensive testing

---

### 5.2 Option B: Soft Migration (Additive Change)

**Changes**:
- Add NEW fields alongside old ones
  - Keep `distinctProceedings`, ADD `analysisContexts` (mirror data)
  - Keep `proceedingContext`, ADD `articleFrame`
  - Keep `relatedProceedingId`, ADD `analysisContextId`
- Readers check new field first, fall back to old
- Writers populate both fields during migration period
- Deprecation warnings when old fields used
- After 3-6 months, old fields can be removed

**Implementation Timeline**:
- **Month 1**: Add parallel fields, update code to write to both
- **Month 2**: Update prompts to use new terminology
- **Month 3**: Migrate UI to read from new fields
- **Month 4-6**: Monitor usage, deprecate old fields
- **Month 7+**: Remove old fields from schema

**Pros**:
- Zero risk of data loss
- Gradual migration allows testing at each step
- Backward compatible (old code still works)
- Can roll back at any stage

**Cons**:
- Dual maintenance burden (write to 2 fields)
- Schema bloat during migration period
- Increased cognitive load ("which field to use?")
- Estimated effort: 1-2 weeks initial, ongoing maintenance

**Risk Level**: **MEDIUM** - Recommended for production systems

---

### 5.3 Option C: Documentation-Only Fix (No Code Change)

**Changes**:
- Add comprehensive glossary to all prompt base files
- Explicit mapping table at top of `types.ts`
- Runtime warnings when deprecated patterns detected
- JSDoc comments on every interface explaining field name discrepancy

**Example Glossary** (add to each prompt):
```
TERMINOLOGY REFERENCE:
- "AnalysisContext" (conceptual) = "distinctProceedings" (JSON field)
- "EvidenceScope" (per-fact) ≠ "AnalysisContext" (top-level)
- "ArticleFrame" (narrative) = "proceedingContext" (JSON field, legacy name)
- "analysisContextId" (logical) = "relatedProceedingId" (field name, legacy)
```

**Pros**:
- Zero implementation risk
- Can be done immediately
- No database migration needed
- Forces explicit awareness of terminology issues

**Cons**:
- Confusion persists at code level
- New developers still confused
- Doesn't fix prompt drift
- LLMs may still invent field names

**Risk Level**: **LOW** - Can be done alongside Option B

---

### 5.4 Recommended Hybrid Approach

**Phase 1 (Week 1-2): Documentation + Validation**
- Implement Option C (glossaries everywhere)
- Add runtime validation (§3.4)
- Add logging for silent fallbacks
- Create `TERMINOLOGY.md` reference doc

**Phase 2 (Month 1-2): Soft Migration**
- Implement Option B for new code paths
- Monolithic pipelines use new field names
- Orchestrated pipeline stays on legacy (low-risk)
- UI reads from new fields with fallback

**Phase 3 (Month 3-6): Deprecation**
- Log warnings when old fields accessed
- Add UI banner: "This result uses legacy schema"
- Migrate historical jobs on-demand (lazy migration)

**Phase 4 (Month 7+): Cleanup**
- Remove old field names from TypeScript
- Database migration script for remaining records
- Remove fallback logic

**Total Estimated Effort**: 8-12 weeks (part-time)
**Risk**: LOW (gradual, reversible at each stage)

---

## 6. Implementation Roadmap

### Week 1-2: Immediate Actions (ZERO RISK)

**Deliverable 1**: `TERMINOLOGY.md` Glossary
- Central reference for all terminology
- Maps code → JSON → prompt names
- Include mermaid diagram of relationships

**Deliverable 2**: Prompt Glossary Headers
- Add to top of each base prompt file
- Consistent format across all 6 base prompts
- Example:

```typescript
## TERMINOLOGY (FactHarbor Standard)

**AnalysisContext**: Top-level bounded analytical frame (stored as `distinctProceedings`)
**EvidenceScope**: Per-fact source methodology metadata (stored as `fact.evidenceScope`)
**ArticleFrame**: Narrative background (stored as `proceedingContext`)

When you see:
- "Scope" in task description → refers to AnalysisContext
- "scopeId" or "proceedingId" → ID of an AnalysisContext
- "evidenceScope" → per-fact metadata (DIFFERENT concept!)
```

**Deliverable 3**: Validation Functions
```typescript
// apps/web/src/lib/analyzer/validation.ts
export function validateContextReferences(facts, contexts) {
  // Throws if fact.relatedProceedingId not in contexts
}
export function validateContextId(id: string) {
  // Returns false if doesn't match pattern
}
```

**Success Criteria**:
- All 6 base prompts have glossary headers
- Runtime errors logged (not silent failures)
- `TERMINOLOGY.md` reviewed and approved

---

### Month 1-2: Soft Migration (MEDIUM RISK)

**Deliverable 4**: Parallel Fields in `types.ts`
```typescript
export interface ClaimUnderstanding {
  // Legacy (keep for backward compat)
  distinctProceedings: AnalysisContext[];
  proceedingContext: string;

  // Modern (preferred)
  analysisContexts?: AnalysisContext[]; // Mirror of distinctProceedings
  articleFrame?: string; // Mirror of proceedingContext

  // ...
}
```

**Deliverable 5**: Smart Readers
```typescript
function getAnalysisContexts(understanding: any): AnalysisContext[] {
  return understanding.analysisContexts 
    || understanding.distinctProceedings 
    || [];
}
```

**Deliverable 6**: Dual Writers (Monolithic Pipelines)
- Update `monolithic-canonical.ts` to write both fields
- Update `monolithic-dynamic.ts` to write both fields
- Leave `analyzer.ts` (orchestrated) on legacy for now

**Success Criteria**:
- New analyses populate both old and new fields
- Old analyses still render correctly
- No breaking changes to API responses

---

### Month 3-6: Deprecation & Migration (LOW RISK)

**Deliverable 7**: Deprecation Warnings
```typescript
function getDistinctProceedings(understanding: any) {
  if (understanding.distinctProceedings && !understanding.analysisContexts) {
    agentLog("WARN", "Using legacy distinctProceedings field. Please migrate to analysisContexts.");
  }
  return understanding.analysisContexts || understanding.distinctProceedings;
}
```

**Deliverable 8**: UI Migration
- Update `page.tsx` to read from new fields first
- Add badge: "Legacy Schema" for old results
- Migrate display logic incrementally

**Deliverable 9**: Lazy Database Migration
- On job retrieval, check if old schema
- If yes, transform and re-save
- Track migration progress

**Success Criteria**:
- 80%+ of recent jobs use new schema
- Zero user-facing errors
- Deprecation warnings logged (not displayed)

---

### Month 7+: Final Cleanup (MEDIUM RISK)

**Deliverable 10**: Remove Legacy Fields
- Delete `distinctProceedings` from TypeScript
- Delete `proceedingContext` from TypeScript
- Update all references

**Deliverable 11**: Database Schema Update
- Run migration script on remaining old jobs
- Verify integrity
- Remove fallback logic

**Success Criteria**:
- 100% of jobs use new schema
- All TypeScript strict mode enabled
- Zero "any" casts in scope-related code

---

## 7. Success Metrics

### Clarity Metrics

**Target**: Any developer can understand the difference between AnalysisContext and EvidenceScope in < 2 minutes

**Measurement**:
- Onboarding quiz: "What's the difference between AnalysisContext and EvidenceScope?"
- Target: 90% correct answers after reading TERMINOLOGY.md

### Consistency Metrics

**Target**: All 11 prompt files use identical core terminology

**Measurement**:
- Automated check: `grep "AnalysisContext|EvidenceScope|ArticleFrame" prompts/*.ts`
- Target: 100% of files use glossary format

### Validation Metrics

**Target**: Schema mismatches are caught and logged (not silently corrected)

**Measurement**:
- Log analysis: Count "validation failed" vs "silent fallback" events
- Target: Zero silent fallbacks after Phase 1

### Backward Compatibility Metrics

**Target**: Existing database records remain readable

**Measurement**:
- Load test: Retrieve and render 100 random old jobs
- Target: 100% success rate (may use legacy code paths)

### LLM Performance Metrics

**Target**: Prompt improvements reduce scope detection errors by 20%+

**Measurement**:
- Run multi-jurisdiction test suite (3 tests in `multi-jurisdiction.test.ts`)
- Baseline: Current error rate ~15% (TSE/SCOTUS conflation)
- Target: < 12% after glossary implementation

---

## 8. Risk Assessment

### Risk 1: Breaking Existing Database Records (Option A)

**Severity**: CRITICAL
**Probability**: HIGH if Option A chosen
**Mitigation**: Don't choose Option A. Use Option B (Soft Migration).

### Risk 2: Prompt Drift During Migration (Option B)

**Severity**: MEDIUM
**Probability**: MEDIUM (developers forget to update all prompts)
**Mitigation**: Automated linting rule to enforce glossary presence

### Risk 3: Performance Regression from Dual Writes (Option B)

**Severity**: LOW
**Probability**: LOW (writes are not on hot path)
**Mitigation**: Benchmark before/after, expect < 1% latency increase

### Risk 4: LLM Confusion from Terminology Change

**Severity**: MEDIUM
**Probability**: MEDIUM (LLMs may have been "trained" on old prompts)
**Mitigation**: A/B test prompts with old vs new terminology before full rollout

### Risk 5: Documentation Becomes Stale (Option C)

**Severity**: MEDIUM
**Probability**: HIGH (docs lag behind code)
**Mitigation**: Automated check that types.ts glossary matches prompt glossaries

---

## 9. Open Questions for Stakeholders

1. **Migration Timeline**: Is a 3-6 month migration acceptable, or must changes be immediate?

2. **Breaking Changes**: Is there any scenario where Option A (breaking changes) would be preferred?

3. **Database Size**: How many historical jobs MUST remain accessible? Can we archive pre-migration jobs?

4. **Provider Variants**: Should provider-specific prompts use identical terminology, or is variation acceptable?

5. **Testing Resources**: Can we allocate QA time for 100+ regression tests during migration?

6. **Rollback Plan**: If new prompts fail in production, is there a fast rollback mechanism?

7. **External API**: Do any external consumers depend on JSON field names (e.g., `distinctProceedings`)?

---

## 10. Conclusion

FactHarbor's scope/context terminology architecture suffers from **systematic inconsistency** rooted in a "backward compatibility trap." The core issue is that **conceptual clarity** (TypeScript types: `AnalysisContext`, `EvidenceScope`) **diverges from implementation reality** (JSON fields: `distinctProceedings`, `proceedingContext`).

### Top Priorities

1. **Immediate**: Add glossaries to all prompts (Week 1-2)
2. **Short-term**: Implement soft migration with parallel fields (Month 1-2)
3. **Long-term**: Deprecate legacy field names (Month 3-6)

### Recent Fixes (2026-01-18)

- **Framework Terminology**: Replaced "framework" with "context" in `apps/web/src/lib/analyzer/prompts/base/dynamic-analysis-base.ts` to eliminate architectural terminology confusion. The term "framework" now only appears in descriptive English phrases (e.g., "regulatory frameworks", "procedural framework") and never as a reference to the `AnalysisContext` architectural concept.

### Key Insight

The current system **works functionally** but imposes **high cognitive load** on developers and **risks confusing LLMs**. A gradual, reversible migration (Option B + Option C hybrid) offers the best balance of risk and clarity.

### Next Steps

1. Stakeholder review of this document
2. Decision on migration approach (recommended: Hybrid)
3. Approval of implementation roadmap
4. Creation of `TERMINOLOGY.md` glossary (immediate action)

---

**Document Version**: 1.1
**Last Updated**: 2026-01-18
**Status**: Awaiting Stakeholder Decision
