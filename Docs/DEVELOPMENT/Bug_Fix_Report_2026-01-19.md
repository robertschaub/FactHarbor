# Bug Verification and Fix Report

**Date:** January 19, 2026  
**Version:** v2.8.1 (post v2.8.0)

---

## Bug 1: Debug Fetch Calls in analyzer.ts

### Status: ✅ ALREADY FIXED (No action needed)

### Description
Seven `fetch` calls to `http://127.0.0.1:7242/ingest/...` were reportedly added throughout `analyzer.ts`, sending internal analysis state to a hardcoded debug endpoint.

### Verification
Searched all 7 reported locations in `analyzer.ts`:
- Line ~5152 (fetchSource success)
- Line ~5168 (fetchSource failure)
- Line ~8058 (Step 1 complete)
- Line ~8378 (Search results)
- Line ~8473 (Facts extracted)
- Line ~8548 (Pre-verdict)
- Line ~8562 (Post-verdict)

**Result:** Zero instances found. All debug fetch calls were already removed in commit `313226f` (v2.6.27: "Input neutrality fix + remove debug instrumentation").

### Conclusion
This bug was already fixed in v2.6.27. The codebase is clean.

---

## Bug 2: Budget Models Bypass Model Knowledge Configuration

### Status: ✅ FIXED in v2.8.1

### Description
When `FH_LLM_TIERING=on` and budget models are used, the `buildPrompt()` function returned early from `getBudgetPrompt()` without calling `getConfigAdaptations()`. This bypassed the model knowledge adaptation logic that's applied for verdict tasks based on `config.allowModelKnowledge`.

### Impact
- Users setting `FH_ALLOW_MODEL_KNOWLEDGE=false` expected strict evidence-only analysis
- Budget models (Haiku, Flash, Mini) silently ignored this setting
- Could incorporate LLM training knowledge inappropriately
- Inconsistent behavior between budget and non-budget models

### Root Cause

**Before Fix:**
```typescript
// prompt-builder.ts
function getBudgetPrompt(context: PromptContext): string {
  const { task, provider, variables } = context; // ❌ Missing config
  // ...
  case 'verdict':
    basePrompt = getBudgetVerdictPrompt(currentDate, variables.originalClaim || '');
    // ❌ Not passing allowModelKnowledge
}

// tiering.ts
export function getBudgetVerdictPrompt(currentDate: string, originalClaim: string): string {
  // ❌ No knowledge mode parameter or guidance
}
```

### Fix Applied

**Changes Made:**

1. **prompt-builder.ts:**
   - Extracted `config` from context in `getBudgetPrompt()`
   - Passed `config.allowModelKnowledge` to `getBudgetVerdictPrompt()`

2. **tiering.ts:**
   - Added `allowModelKnowledge: boolean` parameter to `getBudgetVerdictPrompt()`
   - Added conditional knowledge mode guidance:
     - `allowModelKnowledge=true`: "Use your training data"
     - `allowModelKnowledge=false`: "EVIDENCE-ONLY MODE: Use ONLY provided facts"

**After Fix:**
```typescript
// prompt-builder.ts
function getBudgetPrompt(context: PromptContext): string {
  const { task, provider, variables, config } = context; // ✅ Added config
  // ...
  case 'verdict':
    basePrompt = getBudgetVerdictPrompt(currentDate, variables.originalClaim || '', config.allowModelKnowledge);
    // ✅ Passing allowModelKnowledge
}

// tiering.ts
export function getBudgetVerdictPrompt(currentDate: string, originalClaim: string, allowModelKnowledge: boolean): string {
  const knowledgeMode = allowModelKnowledge
    ? `## KNOWLEDGE MODE: Use your training data...`
    : `## EVIDENCE-ONLY MODE: Use ONLY provided facts...`;
  // ✅ Adds appropriate guidance
}
```

### Test Coverage

Created `budget-model-knowledge.test.ts` with 4 comprehensive tests:

1. ✅ **Evidence-only mode**: Verifies `EVIDENCE-ONLY` guidance when `allowModelKnowledge=false`
2. ✅ **Model knowledge mode**: Verifies training data usage when `allowModelKnowledge=true`
3. ✅ **Non-budget consistency**: Verifies non-budget models also respect the setting
4. ✅ **Budget vs non-budget consistency**: Ensures both paths have identical behavior

**Test Results:**
- All 87 tests passing (83 existing + 4 new)
- 100% test coverage for the bug fix

### Verification Steps

1. ✅ Ran all 83 existing prompt optimization tests → All passing
2. ✅ Ran 4 new budget model knowledge tests → All passing
3. ✅ Checked for linter errors → None found
4. ✅ Verified commit created successfully

### Files Modified

1. `apps/web/src/lib/analyzer/prompts/prompt-builder.ts`
   - Updated `getBudgetPrompt()` to pass `config.allowModelKnowledge`

2. `apps/web/src/lib/analyzer/prompts/config-adaptations/tiering.ts`
   - Updated `getBudgetVerdictPrompt()` signature
   - Added conditional knowledge mode guidance

3. `apps/web/src/lib/analyzer/prompts/budget-model-knowledge.test.ts` (NEW)
   - Added 4 comprehensive tests

### Commit Details

**SHA:** `5837ebb3d10b68446f46a558be7a19901fe9dac0`  
**Message:** "fix(prompts): budget models now respect FH_ALLOW_MODEL_KNOWLEDGE setting"

**Stats:**
- 3 files changed
- +145 lines, -3 lines
- 1 new test file

---

## Summary

| Bug | Status | Action Taken | Commit |
|-----|--------|--------------|--------|
| Debug Fetch Calls | Already Fixed | None (fixed in v2.6.27) | `313226f` |
| Budget Model Knowledge | Fixed | Code + Tests | `5837ebb` |

**Overall Result:** ✅ Both issues resolved

- Bug 1 was already fixed in a previous release
- Bug 2 is now fixed with comprehensive test coverage
- All 87 tests passing
- No linter errors
- Clean commit history
