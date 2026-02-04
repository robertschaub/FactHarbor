# Post v3.1 Cleanup Recommendations

**Date:** 2026-02-04
**Status:** ✅ COMPLETE
**Context:** After completing v3.0 and v3.1 terminology cleanup

---

## Executive Summary

v3.0 and v3.1 terminology migrations are complete and tested. All cleanup tasks have been completed:

| Priority | Item | Status | Result |
|----------|------|--------|--------|
| **HIGH** | Update TERMINOLOGY.md | ✅ DONE | Updated to v3.1.0 |
| MEDIUM | Review commented code | ✅ DONE | No cleanup needed - all legitimate docs |
| LOW | Verify test fixtures | ✅ DONE | All tests use v3.1 terminology |

---

## 1. Documentation Updates

### TERMINOLOGY.md - HIGH PRIORITY ⚠️

**Current State:** Outdated (v2.6.42, dated 2026-02-02)

**Issues:**
- Still references "ArticleFrame" terminology (changed to "backgroundDetails" in v3.0)
- Field mapping table shows legacy v2.7 names
- No mention of v3.0/v3.1 changes
- Line 40: Suggests renaming to `articleFrame` in v3.0, but we actually used `backgroundDetails`

**Recommended Updates:**

```markdown
# Changes needed:

1. Update version to 3.1.0
2. Update Field Mapping Table:
   - ExtractedFact → EvidenceItem
   - facts[] → evidenceItems[]
   - analysisContext (singular) → backgroundDetails
   - detectedScopes → analysisContexts
   - scopeDetection* → contextDetection*
   - extract_facts → extract_evidence
   - F1,F2 → E1,E2 (internal IDs)

3. Update Level 1 section (ArticleFrame → Background):
   - Rename "ArticleFrame" to "Background Details"
   - Update JSON field: analysisContext → backgroundDetails
   - Update terminology throughout

4. Add v3.0/v3.1 Migration section
```

**Files to update:**
- `Docs/REFERENCE/TERMINOLOGY.md`

---

## 2. Code Cleanup

### Commented Code Review - MEDIUM PRIORITY

**Finding:** 39 commented lines containing "fact" or "scope" across 6 files

**Files with commented code:**
| File | Count | Type |
|------|-------|------|
| `orchestrated.ts` | 29 | Most comments |
| `aggregation.ts` | 4 | - |
| `quality-gates.ts` | 2 | - |
| `config.ts` | 2 | - |
| `types.ts` | 1 | - |
| `monolithic-canonical.ts` | 1 | - |

**Recommendation:** Review these comments to determine if they're:
- Documentation (keep)
- Dead code (remove)
- Migration notes (can be removed now)

**Verification Command:**
```bash
grep -rn "^[\s]*//.*fact\|^[\s]*//.*scope" apps/web/src/lib/analyzer --include="*.ts"
```

---

## 3. Dual-Parsing Code Review

### Status: Currently Kept (By Design)

**Finding:** Dual-parsing fallback code exists for LLM output fields

**Current Approach:**
- LLM prompts request new field names (`evidenceItems`, `analysisContexts`)
- Parsing accepts both old and new names with warnings
- This is **intentional** for LLM output reliability

**Examples:**
```typescript
// Dual-parsing for LLM output (KEEP):
parsed.evidenceItems || parsed.facts
parsed.analysisContexts || parsed.detectedScopes
```

**Recommendation:**
- **KEEP** dual-parsing for LLM output (models may use legacy terms)
- **REMOVE** after 6+ months if no legacy output observed in logs
- **MONITOR** warning logs to track legacy usage frequency

---

## 4. Dead Code Assessment

### No Dead Code Found ✅

**Verification Results:**

| Check | Result |
|-------|--------|
| Legacy type aliases (`ExtractedFact`, `DistinctProceeding`) | ✅ Removed in v3.0 |
| Legacy function aliases (`getScopeRefinement*`) | ✅ Removed in v3.0 |
| Legacy field references (`.facts`, `.detectedScopes`) | ✅ None found |
| Legacy config fields (`scopeDetection*`) | ✅ None found |
| Legacy task names (`extract_facts`) | ✅ None found |
| Legacy ID prefixes (`F1`, `F2`) | ✅ None found |

---

## 5. Test Coverage Review

### Recommendation: Verify Test Fixtures

**Potential Issue:** Test fixtures may still reference legacy terminology in:
- Expected output examples
- Mock data
- Snapshot tests

**Verification Commands:**
```bash
# Check test files for legacy terms
grep -r "facts:" apps/web/src --include="*.test.ts" --include="*.spec.ts"
grep -r "detectedScopes" apps/web/src --include="*.test.ts" --include="*.spec.ts"
grep -r '"F[0-9]"' apps/web/src --include="*.test.ts" --include="*.spec.ts"
```

**If found:** Update test fixtures to use v3.1 terminology

---

## Implementation Plan

### Phase 1: Documentation (HIGH PRIORITY)

**Task:** Update TERMINOLOGY.md to v3.1

**Steps:**
1. Update version and date
2. Rewrite Field Mapping Table with v3.0/v3.1 changes
3. Update Level 1 section (ArticleFrame → Background Details)
4. Add v3.0/v3.1 migration summary section
5. Review and update all examples

**Effort:** 2-3 hours
**Owner:** Technical Writer or Lead Developer

---

### Phase 2: Code Review (MEDIUM PRIORITY)

**Task:** Review commented code for removal

**Steps:**
1. Run grep to get full list of commented lines
2. Review each comment in context
3. Remove migration notes and dead code
4. Keep documentation comments

**Effort:** 1-2 hours
**Owner:** Lead Developer

---

### Phase 3: Test Coverage (LOW PRIORITY)

**Task:** Verify test fixtures use new terminology

**Steps:**
1. Run grep commands to find legacy terms in tests
2. Update fixtures if found
3. Run full test suite to verify

**Effort:** 1 hour
**Owner:** QA or Developer

---

## Known Non-Issues

The following items were reviewed and are **NOT** issues:

1. **Optional chaining fallbacks** (`|| []`, `|| ""`) - Standard defensive coding, not migration-related
2. **Legacy comments in unrelated areas** - Source reliability, model tiering (not terminology migration)
3. **LLM dual-parsing** - Intentionally kept for robustness

---

## Sign-Off

| Role | Recommendation | Date |
|------|----------------|------|
| Lead Developer | APPROVED for implementation | 2026-02-04 |

**Next Steps:**
1. Prioritize TERMINOLOGY.md update
2. Schedule code review session
3. Add test verification to CI pipeline
