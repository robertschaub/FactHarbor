# Quality Degradation Fixes Applied - v2.8.2

**Date**: 2026-01-19  
**Status**: ✅ FIXES APPLIED  
**Next Step**: Restart services and validate

---

## Summary of Fixes

### Fix 1: Input Neutrality Enforcement (HIGH IMPACT)
**File**: `apps/web/src/lib/analyzer.ts` (line ~3914)

**Problem**: LLM was returning `detectedInputType: "question"` even after input normalization, causing different analysis paths for questions vs statements.

**Solution**: Force `detectedInputType` to "claim" after canonicalization.

```typescript
// v2.8.2: Force detectedInputType to "claim" for input neutrality
if (parsed.detectedInputType !== "claim" && parsed.detectedInputType !== "article") {
  console.warn(`[INPUT NEUTRALITY FIX] Forcing detectedInputType from "${parsed.detectedInputType}" to "claim"`);
  parsed.detectedInputType = "claim";
}
```

**Expected Impact**: Questions and statements will now follow identical analysis paths.

---

### Fix 2: Increased Budget Limits (HIGH IMPACT)
**File**: `apps/web/src/lib/analyzer/budgets.ts`

**Problem**: Budget limits (`maxIterationsPerScope: 3`, `maxTotalIterations: 12`) were causing premature termination, resulting in fewer searches and lower quality.

**Solution**: Increased limits and disabled hard enforcement.

| Setting | Before | After | Change |
|---------|--------|-------|--------|
| maxIterationsPerScope | 3 | 5 | +67% |
| maxTotalIterations | 12 | 20 | +67% |
| maxTotalTokens | 500,000 | 750,000 | +50% |
| enforceHard | true | false | Warning only |

**Expected Impact**: More thorough research with more searches and sources.

---

### Fix 3: Quick Mode Enhancements (MEDIUM IMPACT)
**File**: `apps/web/src/lib/analyzer/config.ts`

**Problem**: Quick mode had very restrictive limits (`maxResearchIterations: 2`), limiting research depth.

**Solution**: Increased quick mode limits.

| Setting | Before | After | Change |
|---------|--------|-------|--------|
| maxResearchIterations | 2 | 4 | +100% |
| maxSourcesPerIteration | 3 | 4 | +33% |
| maxTotalSources | 8 | 12 | +50% |

**Expected Impact**: Quick mode now provides better quality while maintaining reasonable cost.

---

## Expected Results After Fixes

### Bolsonaro Analysis (Predicted)

| Metric | Before Fix | After Fix (Expected) | Target |
|--------|------------|---------------------|--------|
| Confidence | 50% | 70-80% | ≥75% |
| Searches | 9 | 14-18 | ≥15 |
| Claims | 7 | 10-13 | ≥10 |
| Input Neutrality | BROKEN | FIXED | <4% divergence |

### Input Neutrality (Predicted)

| Input Style | Before Fix | After Fix (Expected) |
|-------------|------------|---------------------|
| Question: "Was X fair?" | 71%, Leaning True | ~73%, Mostly True |
| Statement: "X was fair" | 73%, Mostly True | ~73%, Mostly True |
| Divergence | 2-7% | <2% |

---

## Validation Steps

### Step 1: Restart Services
```bash
# Stop services
.\scripts\stop-services.ps1

# Restart clean
.\scripts\restart-clean.ps1
```

### Step 2: Run Test Analysis
Submit Bolsonaro statement via UI:
```
The Bolsonaro judgment (trial) was fair and based on Brazil's law
```

### Step 3: Check Metrics
Look for:
- Confidence ≥70%
- Search count ≥14
- Claims count ≥10
- Console log: `[INPUT NEUTRALITY FIX]` message if forcing occurred

### Step 4: Input Neutrality Test
Run both:
1. Statement: "The Bolsonaro judgment (trial) was fair and based on Brazil's law"
2. Question: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"

Compare results - divergence should be <4%.

---

## Files Modified

1. `apps/web/src/lib/analyzer.ts`
   - Added input neutrality enforcement (lines 3914-3924)

2. `apps/web/src/lib/analyzer/budgets.ts`
   - Increased budget limits
   - Changed enforceHard to false

3. `apps/web/src/lib/analyzer/config.ts`
   - Increased quick mode limits

---

## Rollback Plan

If issues occur, revert changes:

```bash
git checkout HEAD -- apps/web/src/lib/analyzer.ts
git checkout HEAD -- apps/web/src/lib/analyzer/budgets.ts
git checkout HEAD -- apps/web/src/lib/analyzer/config.ts
```

Or set environment variables to override:
```bash
FH_MAX_ITERATIONS_PER_SCOPE=3
FH_MAX_TOTAL_ITERATIONS=12
FH_ENFORCE_BUDGETS=true
```

---

## Technical Details

### Root Causes Addressed

| Root Cause | Fix Applied | Confidence |
|------------|-------------|------------|
| Budget constraints limiting research | ✅ Increased limits | 90% |
| LLM returning "question" type | ✅ Force to "claim" | 95% |
| Quick mode too restrictive | ✅ Increased iterations | 85% |

### Root Causes NOT Addressed (Lower Priority)

| Root Cause | Status | Reason |
|------------|--------|--------|
| Gate 1 opinion filtering | ⏸️ Monitor | May not be causing issues |
| v2.8 prompt changes | ⏸️ A/B test later | Need baseline first |

---

## Version

**Schema Version**: 2.6.32 → 2.6.33 (recommended bump)

**Changes**:
- v2.8.2/2.6.33: Input neutrality enforcement
- v2.8.2/2.6.33: Increased budget limits for better quality
- v2.8.2/2.6.33: Enhanced quick mode configuration

---

## Next Steps

1. ✅ Fixes applied
2. 🔄 Restart services
3. ⏸️ Run validation test (Bolsonaro)
4. ⏸️ Run input neutrality test
5. ⏸️ Run full baseline suite if validation passes
6. ⏸️ Update schema version if successful

**Ready for validation!**
