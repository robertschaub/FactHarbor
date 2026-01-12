# Fix Plan: Tasks in Progress (v2.6.25)

**Date**: January 12, 2026  
**Version**: v2.6.25  
**Status**: Deep Analysis Complete

---

## Executive Summary

This document provides a detailed fix plan for the "Tasks in Progress" from `Docs/Coding Agent Prompts.md`. The analysis reveals interconnected issues around input neutrality, ArticleSummary handling, and UI consistency.

---

## Issue 1: Question-to-Statement Handling

### Current State
The code in `analyzer.ts` already has early normalization (lines 2511-2535):
```typescript
const normalizedInput = looksLikeQuestionEarly
  ? normalizeYesNoQuestionToStatement(trimmedInputRaw)
  : trimmedInputRaw;
```

However:
- The original question is stored in `questionBeingAsked` and `originalQuestionInput`
- The `isQuestion` flag remains true (line 3169: `wasOriginallyQuestion`)
- UI components still display "Question Asked" and "Implied claim" based on these flags

### Problem Statement
Per requirement: *"The statement shall be used for analysis, not the question, the question shall not be used further on for anything else than for display!"*

But the current implementation:
1. Still shows "📝 Question Asked" in UI (user sees input as question)
2. Still shows "Implied claim" box (should never show)
3. Uses different verdict labels ("Answer" vs "Verdict") based on `isQuestion`

### Fix Plan

#### Step 1: Backend - Simplify Question Flag Usage
In `analyzer.ts`, the `wasOriginallyQuestion` flag should ONLY be used for:
- Debug logging
- Analytics/metrics

It should NOT affect:
- Analysis logic (already fixed in v2.6.23)
- UI presentation (needs fix)
- Scope detection (already uses `analysisInput`)

**File**: `apps/web/src/lib/analyzer.ts`
**Action**: No changes needed - backend is correct.

#### Step 2: Frontend - Remove Question-Specific Display
**File**: `apps/web/src/app/jobs/[id]/page.tsx`

**Changes**:
1. Remove "Question Asked" header display
2. Remove "Implied claim" display everywhere
3. Treat questions same as statements in UI

---

## Issue 2: ArticleSummary Data

### Current State
`generateTwoPanelSummary()` (line 6279) creates:
```typescript
const articleSummary = {
  title,
  source: state.inputType === "url" ? state.originalInput : "User-provided text",
  mainArgument: isValidDisplaySummary
    ? displaySummary
    : (understanding.subClaims[0]?.text || "Analysis of provided content"),
  ...
};
```

### Problem Statement
Per requirement:
- If input is URL → summarize article at URL into ArticleSummary
- If input text < 300 chars → ArticleSummary = copy of input
- Else → ArticleSummary = summarized input

Currently `displaySummary` comes from `articleThesis || impliedClaim`, which may not follow these rules.

### Fix Plan

#### Step 1: Create Explicit ArticleSummary Logic
**File**: `apps/web/src/lib/analyzer.ts`

Add new function:
```typescript
function generateArticleSummary(
  inputType: "url" | "text" | "claim" | "question",
  originalInput: string,
  originalText: string, // Fetched/extracted text if URL
  llmSummary: string | undefined // articleThesis from LLM
): string {
  // If URL: use LLM summary of fetched content (already extracted)
  if (inputType === "url" && llmSummary && llmSummary.length > 10) {
    return llmSummary;
  }
  
  // If short text (< 300 chars): use input directly
  if (originalInput.length < 300) {
    return originalInput;
  }
  
  // Longer text: use LLM summary if available, else truncate
  if (llmSummary && llmSummary.length > 10) {
    return llmSummary;
  }
  
  // Fallback: first 300 chars + ellipsis
  return originalInput.substring(0, 300) + "...";
}
```

#### Step 2: Update `generateTwoPanelSummary()`
**File**: `apps/web/src/lib/analyzer.ts` (line ~6279)

```typescript
const articleSummaryText = generateArticleSummary(
  state.inputType,
  state.originalInput,
  state.originalText,
  understanding.articleThesis
);

const articleSummary = {
  title,
  source: state.inputType === "url" ? state.originalInput : "User-provided text",
  mainArgument: articleSummaryText,
  ...
};
```

---

## Issue 3: Question vs Statement Reports Differ

### Root Cause
Differences occur due to:
1. Different UI paths for `isQuestion` vs non-question
2. `impliedClaim` shown for questions but not statements
3. Different verdict label styles

### Fix Plan
With Issues 1 and 4 fixed, question and statement reports should converge because:
- Same normalized input used for analysis (already done)
- Same UI presentation (Issue 4 fix)
- No more "Question Asked" or "Implied claim" display

---

## Issue 4: Layout Improvements

### Current Problems
1. "Implied Claim" shown in multiple places
2. "Question asked" label appears
3. Inconsistent verdict labels: "Overall Verdict", "Article Verdict", "Overall Answer"
4. "Scope-by-Scope Analysis" should be "Contexts"
5. Confidence format inconsistent

### Fix Plan

#### Step 1: Remove Implied Claim Display
**File**: `apps/web/src/app/jobs/[id]/page.tsx`

**Lines to modify**:
- Lines 521-527: Remove `impliedClaimBox` for non-question
- Lines 760-765: Remove `impliedClaimRow` in `MultiScopeAnswerBanner`
- Lines 1090-1095: Remove `impliedClaimRow` in `QuestionAnswerBanner`

#### Step 2: Remove "Question Asked" Display
**File**: `apps/web/src/app/jobs/[id]/page.tsx`

**Lines to modify**:
- Lines 753-758: Remove `questionHeader` with "📝 Question Asked" in `MultiScopeAnswerBanner`
- Lines 1087-1089: Remove "📝 Question" label in `QuestionAnswerBanner`

**Instead**: Show Article Summary box for questions too.

#### Step 3: Unify Verdict Labels
Replace all instances of:
- "Overall Answer" → "Verdict"
- "Overall Verdict" → "Verdict"  
- "Article Verdict" → "Verdict"

**Locations**:
- Line 780: `answerLabel` "Overall Answer"
- Line 869: `answerLabel` "Overall Verdict"
- Line 1157: `articleVerdictLabel` "Article Verdict"

#### Step 4: Rename Scope Headers
Change:
- "🔀 Scope-by-Scope Analysis" → "📑 Contexts"

**Locations**:
- Line 807: `proceedingsHeader`
- Line 898: `proceedingsHeader` (in `MultiScopeStatementBanner`)

#### Step 5: Unify Confidence Format
Target format: `✓ Mostly True 82% (80% confidence)`

Current format is already close but check:
- Line 784: `{overallTruth}% ({questionAnswer.confidence}% confidence)` ✓
- Line 873: `{overallTruth}% ({overallConfidence}% confidence)` ✓
- Line 1103: Similar ✓
- Line 1163-1166: Article verdict has different format

#### Step 6: Unify Article Box Structure
The Article box should contain:
1. **Summary** - The ArticleSummary text
2. **Verdict** - The verdict with confidence
3. **Key Factors** - List of key factors
4. **Assessment** - Short assessment/reasoning

**Current**: 
- `ArticleSummaryBox` shows Summary
- `ArticleVerdictBanner` shows Verdict + Key Factors + Reason

**Action**: Merge these into a single unified "Article" box.

---

## Implementation Order

1. **Issue 2** - ArticleSummary logic (backend first)
2. **Issue 4, Step 1** - Remove Implied Claim display  
3. **Issue 4, Step 2** - Remove Question Asked display
4. **Issue 4, Step 3** - Unify verdict labels
5. **Issue 4, Step 4** - Rename scope headers to "Contexts"
6. **Issue 4, Step 5** - Verify confidence format
7. **Issue 4, Step 6** - Unify Article box structure
8. **Issue 1** - Verify question-statement neutrality
9. **Issue 3** - Test question vs statement reports match

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/lib/analyzer.ts` | Add `generateArticleSummary()`, update `generateTwoPanelSummary()` |
| `apps/web/src/app/jobs/[id]/page.tsx` | Multiple UI changes (see Issue 4) |

---

## Testing Plan

After fixes, test with these inputs:
1. **Bolsonaro Question**: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
2. **Bolsonaro Statement**: "The Bolsonaro judgment (trial) was fair and based on Brazil's law"
3. **Hydrogen Article**: Long text about hydrogen vs electric cars
4. **PDF Article**: URL to PDF
5. **Short text** (< 300 chars): "COVID vaccines are safe and effective"

**Validation Criteria**:
- Question and statement versions should produce nearly identical reports
- ArticleSummary should follow the < 300 / >= 300 char rules
- No "Implied Claim" or "Question asked" visible anywhere
- All verdict labels say just "Verdict"
- Scope sections say "Contexts"

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing reports | Keep `wasOriginallyQuestion` for debug, don't remove |
| Losing question context | Original question stored in `understanding.questionBeingAsked` |
| UI regression | Incremental changes with testing after each step |

---

## Version Notes

- **v2.6.23**: Fixed input neutrality for analysis (backend)
- **v2.6.24**: Current version with UI issues
- **v2.6.25**: This fix addresses UI consistency and ArticleSummary
