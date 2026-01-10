# Input Neutrality Fix - v2.6.23

**Date**: January 10, 2026
**Schema Version**: 2.6.23
**Status**: FIXED - Testing required

---

## Summary

Fixed the critical input neutrality bug where questions and statements yielded different verdicts (4% divergence). The root cause was `canonicalizeScopes()` receiving the original user input instead of the normalized statement form, causing different pattern matching behavior for questions vs statements.

---

## Changes Made

### Fix 1: Canonicalize Scopes with Normalized Input

**File**: `apps/web/src/lib/analyzer.ts` line 3176

**Root Cause**: Pattern matching in `canonicalizeScopes()` (year detection, keyword matching) used the original input, which differs between "Was X fair?" and "X was fair"

**Fix Applied**:
```typescript
// BEFORE (v2.6.22 and earlier):
parsed = canonicalizeScopes(input, parsed);

// AFTER (v2.6.23):
// Use analysisInput (normalized statement) for consistent scope canonicalization
// This ensures questions and statements yield identical scope detection and research queries
parsed = canonicalizeScopes(analysisInput, parsed);
```

**Impact**: Pattern matching now sees the same normalized statement regardless of whether user input was phrased as a question or statement.

### Fix 2: Supplemental Scope Detection

**File**: `apps/web/src/lib/analyzer.ts` lines 3195, 3203

**Fix Applied**:
```typescript
// BEFORE (v2.6.22):
const supplementalInput = parsed.impliedClaim || trimmedInput;  // BUG: fallback to original
...
parsed = canonicalizeScopes(input, parsed);  // BUG: uses original

// AFTER (v2.6.23):
const supplementalInput = parsed.impliedClaim || analysisInput;  // Uses normalized
...
parsed = canonicalizeScopes(analysisInput, parsed);  // Uses normalized
```

**Impact**: Supplemental scope detection now uses the same normalized input throughout, maintaining input neutrality even in the retry path.

### Enhancement 1: Strengthened Centrality Heuristic

**File**: `apps/web/src/lib/analyzer.ts` lines 2624-2660

**Problem**: Almost all claims were being marked as `isCentral: true` (excessive marking)

**Fix Applied**: Enhanced prompt with:
1. **Rule**: "EXPECT 0-2 CENTRAL CLAIMS MAXIMUM" in most analyses
2. **Explicit NON-central examples**:
   - ❌ "Source X stated Y" (attribution - NOT central)
   - ❌ "Event happened on date Z" (timing - NOT central)
   - ❌ "Document was published by W" (source verification - NOT central)
   - ❌ Supporting evidence (NOT central, only thesis is central)
3. **Positive examples**: Only PRIMARY evaluative/factual/legal thesis claims
4. **Rule of thumb**: In "Was X fair?" only the fairness conclusion is central

**Expected Impact**: Reduce central claim marking from ~80% to ~20% of claims (1-2 per analysis).

### Enhancement 2: Generic Recency Detection

**File**: `apps/web/src/lib/analyzer.ts` lines 520-578

**Problem**: Domain-specific person names (bolsonaro, putin, trump) violated "Generic by Design" principle

**Fix Applied**: Removed hardcoded person names while keeping generic indicators:
- ✓ Kept: "trial", "verdict", "sentence", "election", "investigation"
- ✓ Kept: "announced", "reported", "released"
- ❌ Removed: "bolsonaro", "putin", "trump"

**Impact**: Maintains recency detection effectiveness via generic news/event keywords. Bolsonaro queries still trigger recency via "trial", "sentence", "verdict" keywords.

---

## Data Flow (Fixed)

```
User Input: "Was X fair?" or "X was fair"
    ↓
[lines 2507-2528] Early Normalization
    ↓
originalQuestionInput: "Was X fair?" (for UI display)
analysisInput: "X was fair" (normalized statement)
    ↓
[line 2957] LLM Call with analysisInput
    ↓
[lines 3148-3162] Post-processing
    parsed.impliedClaim = analysisInput (ensures statement form)
    ↓
[line 3176] canonicalizeScopes(analysisInput, parsed)  ← FIXED
    ↓
Pattern matching uses "X was fair" for BOTH inputs
    ↓
[lines 3191-3203] Supplemental scope detection (if needed)
    supplementalInput = analysisInput  ← FIXED
    canonicalizeScopes(analysisInput, parsed)  ← FIXED
    ↓
Research queries use normalized form
    ↓
RESULT: Identical analysis for question and statement
```

---

## Testing Requirements

### Test 1: Input Neutrality Convergence ⏳ PENDING

**Input A (Question)**: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
**Input B (Statement)**: "The Bolsonaro judgment (trial) was fair and based on Brazils law"

**Expected Results**:
- Same `impliedClaim` value (statement form)
- Same scope IDs and names (if multi-scope)
- Same research queries
- Verdict difference < 2% (down from 4%)

**Validation Steps**:
1. Run both analyses with `FH_DETERMINISTIC=true`
2. Check log for: `impliedClaim set to normalized statement`
3. Compare `distinctProceedings` arrays (should be identical)
4. Compare final truth percentages

### Test 2: Centrality Reduction ⏳ PENDING

**Goal**: Verify ≤ 2 claims marked as `isCentral: true` per analysis

**Test Case**: Run analysis on Bolsonaro trial fairness

**Expected Results**:
- 1-2 central claims maximum (e.g., "trial was fair", "based on law")
- NOT central: attribution, dates, background context, source verification
- Central claim percentage: ~20% (down from ~80%)

**Validation**: Count `isCentral: true` in subClaims array

### Test 3: Recent Information Retrieval ⏳ PENDING

**Goal**: Verify 27-year Bolsonaro sentence is found via generic keywords

**Test Case**: "What was the Bolsonaro trial sentence?"

**Expected Results**:
- Log shows: `Recency-sensitive topic detected` (triggered by "trial" or "sentence")
- Search queries include date-specific terms
- Facts extracted include 27-year sentence
- Source dates from late 2025 / early 2026

**Note**: Recency should still work despite removing "bolsonaro" from keywords, because "trial" and "sentence" are generic indicators.

### Test 4: Multi-Scope Consistency ⏳ PENDING

**Goal**: Verify multi-scope detection works consistently for both forms

**Test Case A**: "Was the Bolsonaro judgment fair?"
**Test Case B**: "The Bolsonaro judgment was fair"

**Expected Results**:
- Both detect same number of scopes
- Same scope names/IDs
- `requiresSeparateAnalysis` consistent

---

## Success Criteria

| Metric | Target | Previous | Status |
|--------|--------|----------|--------|
| Input Neutrality | < 2% divergence | 4% divergence | ⏳ Testing required |
| Centrality Marking | ≤ 2 claims per analysis | ~5-8 claims (excessive) | ⏳ Testing required |
| Recent Info Retrieval | 27-year sentence found | Missing | ⏳ Testing required |
| Generic Design | No person names | bolsonaro/putin/trump hardcoded | ✅ Fixed |
| Scope Consistency | Same scopes for Q and S | Different scopes | ⏳ Testing required |

---

## Known Limitations

1. **LLM Non-Determinism**: Even with `temperature: 0`, LLMs may produce slight variations. The 2% threshold accounts for this inherent variability.

2. **Caching Effects**: Search API responses may vary based on time or previous queries, introducing minor variability.

3. **Centrality Marking**: LLM adherence to the strengthened heuristic requires validation. May need further prompt tuning if over-marking persists.

---

## Rollback Plan

If fixes cause regressions:

1. Revert commit `e8af86a` (v2.6.23)
2. Document failure mode in this file
3. Re-investigate with additional logging at:
   - Line 3176: Log input parameter to `canonicalizeScopes()`
   - Line 383-384 in `canonicalizeScopes()`: Log pattern matching results
   - Line 3195: Log supplementalInput value

---

## Related Documentation

- [`Docs/input-neutrality-and-ui-fixes.md`](input-neutrality-and-ui-fixes.md) - Previous attempt (did not work)
- [`Docs/StatusAndNext.md`](StatusAndNext.md) - Project status
- [`Docs/Calculations.md`](Calculations.md) - Verdict calculation documentation

---

## Version History

- **v2.6.21**: First attempt at input neutrality (incomplete - only fixed supplemental branch)
- **v2.6.22**: Enhanced recency detection (did not address input neutrality)
- **v2.6.23**: Complete input neutrality fix + centrality enhancement + generic recency

---

**Next Steps**: Run autonomous tests to validate fixes, then update StatusAndNext.md with results.
