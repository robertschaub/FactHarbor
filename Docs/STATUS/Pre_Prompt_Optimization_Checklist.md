# Pre-Prompt Optimization Checklist

**Purpose**: Document open items and recommendations before proceeding to major LLM prompt improvements  
**Date**: 2026-01-18  
**Status**: 🟡 Some items resolved, some pending migration  

---

## ✅ Resolved Items

### 1. Framework Terminology Confusion ✅ FIXED (2026-01-18)

**Issue**: The term "framework" was used architecturally when it should have been "context"  
**Resolution**: Changed "vary by jurisdiction or framework" → "vary by jurisdiction or context" in `dynamic-analysis-base.ts`  
**Impact**: Eliminates confusion between `AnalysisContext` (architectural concept) and "regulatory frameworks" (descriptive phrase)  

### 2. AnalysisContext vs EvidenceScope Distinction ✅ CLARIFIED

**Issue**: Weak definition, unclear why both entities needed  
**Resolution**:  
- **AnalysisContext**: Top-level uncomparable verdict space (e.g., TSE vs SCOTUS - cannot combine verdicts)
- **EvidenceScope**: Per-fact source methodology metadata (e.g., WTW vs TTW - tracks how source computed data)

**Impact**: Clear separation of concerns, no overlap

### 3. Overall Verdict Display Strategy ✅ DECIDED

**Issue**: Showing overall verdict when multiple AnalysisContexts might be misleading  
**Decision**:  
- **Multiple contexts**: Replace overall verdict with summary of individual context verdicts
- **Single context**: Show that context's verdict as the overall verdict

**Impact**: UI accurately reflects analytical separation

---

## ⏳ Pending Items (Blocked by Migration)

### 4. Field Name Consistency ⏳ PENDING v2.7.0

**Issue**: `distinctProceedings` ≠ `AnalysisContext`, `relatedProceedingId` ≠ `contextId`  
**Status**: Migration approved, implementation roadmap created  
**Blocker**: Awaiting Lead Architect sign-off  
**Impact**: Once resolved, LLM prompts can use consistent terminology everywhere

### 5. Schema Version Tracking ⏳ RECOMMENDED

**Issue**: No explicit version field in `ResultJson`  
**Recommendation**: Add `_schemaVersion: "2.7.0"` to all new job results  
**Benefit**: Easier to handle future schema changes, clearer migration paths  
**Priority**: MEDIUM (not blocking)

### 6. Runtime Validation for Context References ⏳ RECOMMENDED

**Issue**: No validation that `contextId` references actually exist in `analysisContexts` array  
**Recommendation**: Add runtime check in verdict generation:
```typescript
if (!contexts.some(c => c.id === fact.contextId)) {
  throw new Error(`Invalid contextId reference: ${fact.contextId}`);
}
```
**Benefit**: Catch schema violations early  
**Priority**: MEDIUM (nice-to-have)

---

## 🔴 Open Questions for Decision

### 7. UI Terminology for End Users 🤔 UNDECIDED

**Question**: Should we expose "AnalysisContext" in the UI, or use simpler language?

**Options**:
- **Option A**: Use technical term "AnalysisContext" (consistent with docs)
- **Option B**: Use user-friendly term like "Context" or "Case"
- **Option C**: Domain-specific terms (e.g., "Proceeding" for legal, "Analysis Frame" for scientific)

**Considerations**:
- Users aren't developers - technical terms may confuse
- But simpler terms may lose precision
- Different domains may need different labels

**Recommendation**: Option B ("Context") for v2.7, evaluate Option C post-launch

---

### 8. Historical Job Migration Strategy 🤔 PARTIALLY DECIDED

**Question**: How should we handle jobs created before v2.7.0?

**Current Plan**: Migrate all jobs during v2.7.0 deployment

**Open Questions**:
- Should we keep pre-migration database accessible via separate branch?
- Should UI indicate job was created pre-v2.7.0?
- Should we archive very old jobs (> 6 months) instead of migrating?

**Recommendation**: 
- ✅ Keep backup accessible
- ✅ No need to indicate pre/post migration in UI (data identical post-transform)
- ❌ Don't archive - migrate all jobs

---

### 9. API Versioning Strategy 🤔 UNDECIDED

**Question**: Should API endpoints be versioned for breaking changes?

**Current**: No versioning (all endpoints at `/api/*`)

**Options**:
- **Option A**: No versioning (current approach)
- **Option B**: Add `/api/v2.7/*` endpoints
- **Option C**: Add `Accept-Version` header

**Considerations**:
- No known external consumers currently
- Future-proofing for public API launch
- Adds complexity if not needed

**Recommendation**: Option A for now (no versioning), revisit if external consumers emerge

---

## 🎯 Recommended Next Steps

### Before LLM Prompt Optimization

1. **Complete v2.7.0 Migration** ✅ CRITICAL
   - Get Lead Architect sign-off
   - Execute implementation roadmap
   - Validate all tests pass

2. **Implement Schema Versioning** ⭐ RECOMMENDED
   - Add `_schemaVersion` field to ResultJson
   - Update result builders
   - Document version history

3. **Add Runtime Validation** ⭐ RECOMMENDED
   - Validate `contextId` references
   - Validate fact assignments
   - Log validation failures for debugging

4. **Decide UI Terminology** ⭐ RECOMMENDED
   - User testing with "AnalysisContext" vs "Context"
   - Document decision in ADR
   - Update UI components

### After v2.7.0 Migration

5. **LLM Prompt Optimization Phase** 🚀 READY AFTER MIGRATION
   - All terminology consistent
   - Clear mappings documented
   - Safe to optimize prompts without confusion

6. **Performance Benchmarking**
   - Baseline performance established
   - Compare orchestrated vs canonical vs dynamic
   - Optimize slowest variant

7. **Provider-Specific Tuning**
   - Test prompt variants with each LLM provider
   - Measure quality differences
   - Document best practices per provider

---

## Known Risks Pre-Prompt-Optimization

### Risk 1: Terminology Drift During Optimization
**Scenario**: New prompts introduce inconsistent terms  
**Mitigation**: Mandatory glossary header in all prompts (enforced by review checklist)

### Risk 2: LLM Confusion from Mixed Terminology
**Scenario**: Orchestrated pipeline uses old terms, monolithic uses new  
**Mitigation**: Complete v2.7.0 migration before optimization (ensures consistency)

### Risk 3: Over-Optimization Reducing Robustness
**Scenario**: Highly tuned prompts work great for Claude, fail for Gemini  
**Mitigation**: Test all changes across all supported providers

---

## Success Metrics

Before declaring "Ready for Prompt Optimization":

- [ ] ✅ All terminology consistent (code, prompts, docs)
- [ ] ✅ No references to legacy field names
- [ ] ✅ Framework terminology confusion resolved
- [ ] ✅ AnalysisContext vs EvidenceScope clearly defined
- [ ] ✅ Overall verdict display strategy implemented
- [ ] ⏳ Schema versioning implemented (recommended)
- [ ] ⏳ Runtime validation added (recommended)
- [ ] ⏳ UI terminology decided (recommended)

**Current Status**: 3/8 complete, 5/8 pending v2.7.0 migration

---

## References

- [ADR_001](../ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md)
- [Terminology_Verification_Report.md](./Terminology_Verification_Report.md)
- [LLM_Prompt_Improvements.md](./LLM_Prompt_Improvements.md)
- [Scope_Terminology_Implementation_Roadmap.md](./Scope_Terminology_Implementation_Roadmap.md)

---

**Prepared By**: Lead Developer, LLM Expert  
**Last Updated**: 2026-01-18  
**Next Review**: Post-v2.7.0 migration
