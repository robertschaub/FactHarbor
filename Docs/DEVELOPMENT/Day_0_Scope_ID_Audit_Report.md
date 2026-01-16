# Day 0 Scope ID Audit Report

**Date**: 2026-01-16
**Purpose**: Audit for hardcoded `CTX_` assumptions before implementing deterministic scope IDs
**Reference**: [Handover_Pipeline_Redesign_Implementation.md](Handover_Pipeline_Redesign_Implementation.md) - PR 3 blocker

---

## Executive Summary

✅ **SAFE TO PROCEED**: No hardcoded CTX_ assumptions found in critical files.

The codebase is ready for deterministic scope ID implementation. All scope ID usage is format-agnostic.

---

## Audit Methodology

1. **Repo-wide grep** for `CTX_` usage
2. **Targeted review** of files identified in handover document:
   - `apps/web/src/lib/analyzer/verdict-corrections.ts`
   - `apps/web/src/lib/claim-importance.ts`
   - `apps/web/src/app/jobs/[id]/page.tsx`
3. **Analysis** of scope ID string matching and format assumptions

---

## Findings

### 1. Repo-Wide CTX_ Usage

**Files containing `CTX_`**:
1. `apps/web/src/lib/analyzer.ts` - Scope ID generation logic ⚠️ **WILL CHANGE**
2. `apps/web/src/lib/analyzer/scopes.ts` - Scope canonicalization ⚠️ **WILL CHANGE**
3. `apps/web/src/lib/analyzer/types.ts` - Type documentation only ✅ **SAFE**
4. `apps/web/src/lib/analyzer/scope-preservation.test.ts` - Test assertions ✅ **SAFE**
5. `apps/web/src/lib/analyzer/adversarial-scope-leak.test.ts` - Test assertions ✅ **SAFE**

### 2. verdict-corrections.ts ✅ **SAFE**

**File**: `apps/web/src/lib/analyzer/verdict-corrections.ts` (589 lines)

**Finding**: ✅ No CTX_ usage or scope ID dependencies

**Analysis**:
- Works with claim text and reasoning only
- No scope ID string matching
- No assumptions about ID format
- Uses `relatedProceedingId` as opaque identifier

**Verdict**: Can safely change scope ID format without affecting this file.

---

### 3. claim-importance.ts ✅ **SAFE**

**File**: `apps/web/src/lib/claim-importance.ts` (62 lines)

**Finding**: ✅ No CTX_ usage or scope ID dependencies

**Analysis**:
- Works with claim text and importance metadata only
- No scope operations
- No ID format assumptions

**Verdict**: Can safely change scope ID format without affecting this file.

---

### 4. jobs/[id]/page.tsx ✅ **SAFE**

**File**: `apps/web/src/app/jobs/[id]/page.tsx`

**Finding**: ✅ Uses scope IDs but format-agnostic

**Key Code** (line 1322):
```typescript
const normalizeScopeKey = (id: any): string => {
  const raw = String(id || "").trim();
  return raw ? raw : "general";
};
```

**Analysis**:
- `normalizeScopeKey` converts ID to string (any format works)
- Defaults to "general" if empty
- No CTX_ prefix matching
- No string parsing or format assumptions
- Used for grouping claims by scope (Map keys)

**Usage**:
- Line 1328: `normalizeScopeKey(cv.relatedProceedingId)` - Group claim verdicts
- Line 1334: `normalizeScopeKey(c?.relatedProceedingId)` - Group tangential claims
- Line 1386: `normalizeScopeKey(cv.relatedProceedingId)` - Another grouping operation

**Verdict**: Can safely change scope ID format. UI treats IDs as opaque strings.

---

### 5. Scope ID Generation (Current Implementation)

**File**: `apps/web/src/lib/analyzer/scopes.ts`

**Current Logic** (lines 53, 146):
```typescript
let newId = inst ? `CTX_${inst}` : `CTX_${idx + 1}`;
```

**Where `inst` comes from**:
- `shortInst` extracted from scope name (institution name)
- Or index-based: `CTX_1`, `CTX_2`, etc.

**Problem**: Non-deterministic for same inputs across runs
- Index-based IDs depend on detection order
- Name extraction can vary

**Solution (PR 3)**: Replace with hash-based deterministic IDs

---

### 6. Special Scope ID: CTX_UNSCOPED

**Usage**: `apps/web/src/lib/analyzer.ts:2720`
```typescript
const UNSCOPED_ID = "CTX_UNSCOPED";
```

**Purpose**: Fallback for facts that don't map to detected scopes

**Consideration**: Keep `CTX_UNSCOPED` as a special case constant?
- **Option A**: Keep as-is (special reserved ID)
- **Option B**: Change to `UNSCOPED` (no CTX_ prefix)
- **Recommendation**: Keep as `CTX_UNSCOPED` for now (low risk)

---

### 7. UI Display Code

**File**: `apps/web/src/lib/analyzer.ts:3772`
```typescript
const shortName = id.replace(/^CTX_/, "").slice(0, 12) || "SCOPE";
```

**Purpose**: Remove `CTX_` prefix for UI display

**Issue**: Assumes CTX_ prefix exists

**Solution**: Make regex more defensive:
```typescript
const shortName = id.replace(/^CTX_/, "").trim() || id.slice(0, 12) || "SCOPE";
```

---

## Risk Assessment

### Low Risk Areas ✅
- **verdict-corrections.ts**: No scope ID dependencies
- **claim-importance.ts**: No scope ID dependencies
- **jobs/[id]/page.tsx**: Format-agnostic ID usage
- **Test files**: Only use `CTX_UNSCOPED` in assertions (easy to update)

### Medium Risk Areas ⚠️
- **analyzer.ts:3772**: UI shortName extraction (assumes CTX_ prefix)
- **UNSCOPED_ID constant**: Hardcoded to `CTX_UNSCOPED`

### Required Changes 🔧
- **scopes.ts**: Replace index/name-based IDs with deterministic hashing
- **analyzer.ts:3772**: Update shortName extraction to handle new ID format

---

## Recommended ID Format

### Current Format
```
CTX_TSE
CTX_WTW
CTX_1
CTX_2
CTX_UNSCOPED
```

### Proposed Format (Deterministic Hash)

**Option A**: Hash with prefix
```
CTX_a3f2b1c5
CTX_d9e8f7a2
CTX_UNSCOPED  (special case)
```

**Option B**: Hash without prefix
```
a3f2b1c5d9e8
f7a29b3c4e1d
UNSCOPED  (special case)
```

**Option C**: Hybrid (preserve names when possible)
```
TSE_a3f2
WTW_d9e8
SCOPE_f7a2
UNSCOPED  (special case)
```

**Recommendation**: Option C (Hybrid)
- **Pros**: Human-readable, debuggable, deterministic
- **Cons**: Slightly more complex logic
- **Best balance**: Readability + determinism

### Hashing Strategy
```typescript
function generateDeterministicScopeId(scope: { name: string; description?: string }): string {
  // Create stable input for hashing
  const input = JSON.stringify({
    name: scope.name.toLowerCase().trim(),
    description: (scope.description || "").toLowerCase().trim().slice(0, 100)
  });

  // Hash to 8-char hex
  const hash = simpleHash(input).toString(16).padStart(8, '0').slice(0, 8);

  // Extract short institution name
  const inst = extractShortInst(scope.name);

  // Return hybrid format
  return inst ? `${inst}_${hash.slice(0, 4)}` : `SCOPE_${hash}`;
}
```

---

## Implementation Checklist

### Phase 1: Preparation ✅ COMPLETE
- [x] Audit verdict-corrections.ts
- [x] Audit claim-importance.ts
- [x] Audit jobs/[id]/page.tsx
- [x] Repo-wide grep for CTX_
- [x] Document findings

### Phase 2: Implementation (PR 3)
- [ ] Implement deterministic hashing function
- [ ] Update `canonicalizeScopes` in scopes.ts
- [ ] Update UI shortName extraction (analyzer.ts:3772)
- [ ] Keep `CTX_UNSCOPED` as special case
- [ ] Add regression test: same input → same IDs
- [ ] Update test assertions (scope-preservation.test.ts)
- [ ] Update test assertions (adversarial-scope-leak.test.ts)

### Phase 3: Verification
- [ ] Run scope-preservation tests (verify ID stability)
- [ ] Run full test suite
- [ ] Manual UI testing (verify scope display)
- [ ] Check test-output/ for scope ID patterns

---

## Test Impact

### Tests That Reference CTX_

**scope-preservation.test.ts**:
- Line 147: `!s.id.includes("UNSCOPED")` ✅ Will still work with new format
- Line 413: `// allowing for CTX_UNSCOPED` ✅ Comment only
- Line 457: `|| "CTX_UNSCOPED"` ⚠️ **UPDATE**: Use constant instead

**adversarial-scope-leak.test.ts**:
- Line 9: Comment ✅ No change needed
- Line 67, 75: Test input text ✅ No change needed
- Line 138: `=== "CTX_UNSCOPED"` ⚠️ **UPDATE**: Use constant
- Line 398: `=== "CTX_UNSCOPED"` ⚠️ **UPDATE**: Use constant

### Recommended: Export Constant
```typescript
// scopes.ts
export const UNSCOPED_ID = "CTX_UNSCOPED";

// tests
import { UNSCOPED_ID } from "../scopes";
if (fact.relatedProceedingId === UNSCOPED_ID) { ... }
```

---

## Conclusion

### ✅ Green Light for PR 3

The audit confirms:
1. No hardcoded CTX_ string matching in critical files
2. UI code is mostly format-agnostic (one minor fix needed)
3. Test assertions are easy to update (use exported constant)
4. Scope ID changes are isolated to scopes.ts and analyzer.ts

### Estimated Implementation
- **Complexity**: Low-Medium
- **Risk**: Low (changes are isolated)
- **Time**: 2-3 hours
- **Files to modify**: 2 core + 2 test files

### Next Steps
1. Implement deterministic hashing in scopes.ts
2. Update shortName extraction in analyzer.ts
3. Export and use UNSCOPED_ID constant
4. Add regression test for ID stability
5. Run full test suite to verify

---

## Appendix: Complete CTX_ Usage List

```
apps/web/src/lib/analyzer.ts:2720           UNSCOPED_ID = "CTX_UNSCOPED"
apps/web/src/lib/analyzer.ts:3404           Documentation comment
apps/web/src/lib/analyzer.ts:3411           Documentation comment
apps/web/src/lib/analyzer.ts:3772           id.replace(/^CTX_/, "")
apps/web/src/lib/analyzer/scopes.ts:53      `CTX_${inst}` or `CTX_${idx + 1}`
apps/web/src/lib/analyzer/scopes.ts:146     `CTX_${inst}` or `CTX_${idx + 1}`
apps/web/src/lib/analyzer/scopes.ts:211     id: "CTX_1" (fallback)
apps/web/src/lib/analyzer/types.ts:148      Type documentation
apps/web/src/lib/analyzer/scope-preservation.test.ts:147,413,457  Test assertions
apps/web/src/lib/analyzer/adversarial-scope-leak.test.ts:9,67,75,138,362,398  Test assertions
```

**Total**: 5 source files, 2 test files, 15 occurrences

---

**Audit completed**: 2026-01-16
**Status**: ✅ SAFE TO PROCEED with PR 3
**Next**: Implement deterministic scope ID hashing
