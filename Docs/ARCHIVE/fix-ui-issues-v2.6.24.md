# FactHarbor v2.6.24 - UI Display and Analysis Quality Fixes

**Date**: January 10, 2026
**Status**: Implemented, awaiting testing
**Previous Version**: 2.6.23 (input neutrality fix - 1% deviation SUCCESS!)

---

## Summary

Fixed 7 critical and medium-priority issues discovered during v2.6.23 testing, focusing on rating accuracy, UI clarity, and centrality logic.

---

## Fixes Implemented

### Issue 1 & 2 & 3: Article Summary and Implied Claim Display (HIGH PRIORITY)

**Problem**: 
- Article Summary showed input text verbatim instead of synthesized summary
- Implied Claim duplicated input text
- Long inputs (6000+ chars) were displayed in full, making UI unreadable

**Root Cause**:
- Line 3178: `parsed.impliedClaim = analysisInput` (for input neutrality)
- Line 6248-6259: `mainArgument` used `impliedClaim` (which was now the raw input)

**Fix**:
```typescript
// apps/web/src/lib/analyzer.ts:6247-6260
// v2.6.24: Use articleThesis for display (LLM-extracted summary)
// impliedClaim is now the normalized input (for analysis consistency), not for display
const displaySummary = understanding.articleThesis || understanding.impliedClaim;
const isValidDisplaySummary = displaySummary &&
  !displaySummary.toLowerCase().includes("unknown") &&
  displaySummary !== "<UNKNOWN>" &&
  displaySummary.length > 10;

const articleSummary = {
  title,
  source: state.inputType === "url" ? state.originalInput : "User-provided text",
  mainArgument: isValidDisplaySummary
    ? displaySummary
    : (understanding.subClaims[0]?.text || "Analysis of provided content"),
```

**Impact**: Users now see LLM-synthesized summary instead of their own input echoed back

---

### Issue 4: Question Label Misapplication (MEDIUM PRIORITY)

**Problem**: Statements ending with "?" or long articles incorrectly showed "📝 Question" label

**Root Cause**:
- Line 4803/5375: `isQuestionLike = analysisInputType === "question" || analysisInputType === "claim"`
- LLM's `detectedInputType` was used instead of actual user input type

**Fix**:
```typescript
// apps/web/src/lib/analyzer.ts:1847 - Added field
interface ClaimUnderstanding {
  wasOriginallyQuestion: boolean; // v2.6.24: Track if input was actually a question
  // ... other fields
}

// apps/web/src/lib/analyzer.ts:3157 - Set during understanding
(parsed as any).wasOriginallyQuestion = !!originalQuestionInput;

// apps/web/src/lib/analyzer.ts:4803 - Use for determination
const isQuestionLike = (understanding as any).wasOriginallyQuestion ||
  (analysisInputType === "question" && understanding.questionIntent !== "none");
```

**Impact**: "Question" label only shown for actual questions, not statements with "?"

---

### Issue 5: Methodology Claims Marked as Central (CRITICAL)

**Problem**: Claims about methodology validation (e.g., "The study followed ISO standards") were marked as central instead of the actual subject claims

**Example**: SC4, SC5, SC6 in hydrogen/electricity analysis - all about TTW/WTW methodology validity, NOT about efficiency comparison

**Root Cause**: LLM prompt lacked explicit guidance that methodology validation claims are meta-claims, not central

**Fix**:
```typescript
// apps/web/src/lib/analyzer.ts:2660-2668
**CRITICAL: Source/Attribution claims are NEVER centrality HIGH**
Claims with claimRole "source", "attribution", or "timing" should ALWAYS have centrality: LOW
- "An internal email exists" → centrality: LOW (source claim)
- "Dr. X is director of Y" → centrality: LOW (attribution)
- "The statement was made in November" → centrality: LOW (timing)
- "The methodology used is scientifically valid" → centrality: LOW (meta-claim about analysis)
- "The study followed ISO standards" → centrality: LOW (methodology validation)
- "The data collection methods were appropriate" → centrality: LOW (methodological, not substantive)
```

**Impact**: ≤2 central claims per analysis, focusing on actual subject matter, not methodology

---

### Issue 6: Rating Inversion (CRITICAL)

**Problem**: Verdicts rated the LLM's analysis conclusion instead of the original user claim

**Example**:
- User Input: "Using hydrogen for cars is more efficient than using electricity"
- Evidence: Hydrogen is LESS efficient (3x more energy intensive)
- Current Rating: ✓ Mostly True 75% (rating the analysis "hydrogen is less efficient" = TRUE)
- **Expected**: FALSE or MOSTLY FALSE (rating the user's claim "hydrogen is MORE efficient" = FALSE)

**Root Cause**: Verdict prompts didn't explicitly instruct LLM to rate the original claim direction

**Fix**:
```typescript
// apps/web/src/lib/analyzer.ts:4820-4834 (multi-scope)
## CRITICAL: RATING DIRECTION

**ORIGINAL ${inputLabel} TO RATE**:
"${analysisInput}"

**YOUR TASK**: Rate the ORIGINAL ${inputLabel} above AS STATED by the user.
- If the user claims "X is better than Y" and evidence shows Y is better, rate as FALSE/LOW percentage
- If the user claims "X increased" and evidence shows X decreased, rate as FALSE/LOW percentage
- Preserve the directional/comparative aspect of the original claim
- DO NOT rate your analysis conclusion - rate whether the USER'S CLAIM matches the evidence

// apps/web/src/lib/analyzer.ts:5376-5382 (single-scope)
## CRITICAL: RATING DIRECTION

**YOUR TASK**: Rate the ORIGINAL ${inputLabel} AS STATED by the user (shown below in the user prompt).
- If the user claims "X is better than Y" and evidence shows Y is better, rate as FALSE/LOW percentage
- Preserve the directional/comparative aspect of the original claim
- DO NOT rate your analysis conclusion - rate whether the USER'S CLAIM matches the evidence
```

**Impact**: Verdicts correctly reflect whether the USER'S claim is true, not whether the analysis is correct

---

### Issue 7: Temporal Awareness (MEDIUM PRIORITY - Already Fixed in v2.6.22)

**Status**: ✅ Already implemented at lines 4806-4816

Current date is provided with explicit reasoning rules:
```typescript
## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- A date like "November 2025" is in the PAST if the current date is January 2026 or later
```

**No changes needed** - already working correctly.

---

## Files Modified

- **[`apps/web/src/lib/analyzer.ts`](apps/web/src/lib/analyzer.ts)**:
  - Line 121: Version updated to 2.6.24
  - Line 1851: Added `wasOriginallyQuestion` field to `ClaimUnderstanding`
  - Line 2660-2668: Enhanced centrality guidance with methodology examples
  - Line 3157: Set `wasOriginallyQuestion` flag
  - Lines 4820-4834, 5376-5382: Added CRITICAL rating direction instructions
  - Lines 4803, 5375: Updated `isQuestionLike` logic to use `wasOriginallyQuestion`
  - Lines 6247-6260: Use `articleThesis` for display summary instead of `impliedClaim`

---

## Testing Validation (Pending)

### Test 1: Hydrogen/Electricity (Issues 5 & 6)
```
Input: "Using hydrogen for cars is more efficient than using electricity"
Expected Results:
✅ Rating: FALSE or MOSTLY FALSE (0-28%) - hydrogen is LESS efficient
✅ Centrality: SC1, SC3 marked as central (efficiency comparison)
✅ Centrality: SC4, SC5, SC6 NOT marked as central (methodology validation)
```

### Test 2: Venezuela Oil (Issues 1, 2, 3, 4)
```
Input: Long statement about oil industry (6071 chars)
Expected Results:
✅ Article Summary: Concise LLM-generated synthesis (not verbatim input)
✅ Implied Claim: LLM-extracted core claim (not duplicate of input)
✅ Question Label: NOT shown (input is a statement)
✅ Display: Text truncated appropriately, readable
```

### Test 3: Bolsonaro Trial (Input Neutrality Regression)
```
Input Question: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
Input Statement: "The Bolsonaro judgment (trial) was fair and based on Brazils law"
Expected Results:
✅ Divergence: <2% (maintain v2.6.23 success)
✅ Question Label: Shown for question form, NOT shown for statement form
✅ Recent Info: Finds 27-year sentence from November 2025
```

---

## Success Criteria

- ✅ Article Summary shows LLM-synthesized core thesis (not input verbatim)
- ✅ Implied Claim shows LLM-extracted claim (not duplicate input)
- ✅ Long texts handled gracefully (display uses summary, not full input)
- ✅ "Question" label only shown for actual questions
- ✅ Methodology claims have LOW centrality (≤2 central claims per analysis)
- ✅ Ratings match original claim direction (comparative/superlative preserved)
- ✅ Temporal reasoning uses current date (already working in v2.6.22+)

---

## Related Documentation

- [`Docs/input-neutrality-fix-v2.6.23.md`](./input-neutrality-fix-v2.6.23.md) - Previous fix (1% deviation success)
- [`Docs/StatusAndNext.md`](./StatusAndNext.md) - Overall project status
- [`Docs/Calculations.md`](./Calculations.md) - Verdict calculation methodology

---

## Upgrade Notes

### Breaking Changes
None - all changes are backward compatible.

### Schema Version
- Updated from 2.6.23 to 2.6.24
- Added internal field `wasOriginallyQuestion` (not exposed in JSON output)

### Migration
No migration needed - existing analyses remain valid.

---

## Next Steps

1. **Run automated tests** (test plan available in `Docs/test-plan-v2.6.23.md`)
2. **Validate hydrogen/electricity example** - verify rating inversion is fixed
3. **Verify centrality logic** - confirm ≤2 central claims per analysis
4. **Check question label** - test with statements ending in "?"
5. **Update `StatusAndNext.md`** with test results
6. **Commit to main** with message: "v2.6.24: Fix rating inversion, centrality logic, and UI display issues"

---

## Commit Message Template

```
v2.6.24: Fix rating inversion, centrality logic, and UI display issues

Critical fixes:
- Rating direction: Verdicts now rate ORIGINAL claim (not analysis conclusion)
- Centrality logic: Methodology validation claims excluded from central marking
- Display summary: Use LLM-synthesized articleThesis instead of raw input
- Question label: Only shown for actual questions (not statements with "?")

Issues fixed:
1. ✅ Article Summary no longer shows input verbatim
2. ✅ Implied Claim no longer duplicates input
3. ✅ Long inputs handled gracefully (display uses summary)
4. ✅ Question label correctly applied
5. ✅ Methodology claims marked as LOW centrality
6. ✅ Ratings preserve claim direction (comparative/superlative)
7. ✅ Temporal awareness already working (v2.6.22+)

Files modified:
- apps/web/src/lib/analyzer.ts (rating prompts, centrality guidance, display logic)

Testing: Pending validation with hydrogen/electricity and Venezuela oil examples
```
