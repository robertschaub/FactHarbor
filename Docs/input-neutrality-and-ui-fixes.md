# Input Neutrality and UI Fixes - Implementation Notes

**Date**: January 10, 2026
**Schema Version**: 2.6.23
**Status**: Partially tested

---

## Overview

This document captures findings from investigating multiple issues in the FactHarbor analyzer, including input neutrality divergence and UI duplication problems.

---

# SECTION A: CONFIRMED WORKING (UI-level changes)

These are simple conditional rendering changes in page.tsx that work as expected:

## A1. Hide Duplicate Implied Claim (page.tsx line ~520)

**Status: CONFIRMED WORKING**

Hide implied claim box when it matches article summary:
```typescript
{impliedClaim &&
 impliedClaim.trim().toLowerCase() !== twoPanelSummary.articleSummary?.mainArgument?.trim()?.toLowerCase() && (
  <div className={styles.impliedClaimBox}>...
)}
```

## A2. Case-Insensitive Question Duplication Check (page.tsx)

**Status: CONFIRMED WORKING**

In `QuestionAnswerBanner` (line ~977) and `MultiScopeAnswerBanner` (line ~723):
```typescript
const showImpliedClaim =
  !!impliedClaim &&
  impliedClaim.trim().length > 0 &&
  String(questionAnswer?.question || "").trim().toLowerCase() !== impliedClaim.trim().toLowerCase();
```

## A3. ArticleSummaryBox Truncation (page.tsx line ~1137)

**Status: CONFIRMED WORKING**

```typescript
const MAX_DISPLAY_LENGTH = 500;
const displayText = rawText.length > MAX_DISPLAY_LENGTH
  ? rawText.slice(0, MAX_DISPLAY_LENGTH - 3) + "..."
  : rawText;
```

---

# SECTION B: UNVERIFIED / DID NOT FIX THE ISSUE

These changes were attempted but did NOT resolve the underlying issues:

## Issue 1: Input Neutrality Divergence (CRITICAL)

**Status: ATTEMPTED FIX DID NOT WORK**

The fix to pass `analysisInput` to `canonicalizeScopes()` was implemented but did NOT resolve the 4% divergence. Root cause may be elsewhere.

### Symptoms
- Statement: "The Bolsonaro judgment (trial) was fair and based on Brazils law" → 76%
- Question: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?" → 72%
- 4% divergence despite input normalization (question→statement conversion)

### Root Cause

The `canonicalizeScopes()` function receives the **original input** instead of the **normalized `analysisInput`**:

```typescript
// analyzer.ts line ~3397
parsed = canonicalizeScopes(input, parsed);  // BUG: uses original

// analyzer.ts line ~3424
parsed = canonicalizeScopes(input, parsed);  // BUG: uses original
```

Inside `canonicalizeScopes()`, pattern matching uses the original input:
```typescript
const hasExplicitYear = /\b(19|20)\d{2}\b/.test(input);  // Line ~387
const inputLower = input.toLowerCase();  // Line ~388
```

This causes different scope canonicalization for questions vs statements, which cascades to different research queries and evidence retrieval.

Additionally, line ~3416 uses `trimmedInput` (original) as fallback:
```typescript
const supplementalInput = parsed.impliedClaim || trimmedInput;  // BUG
```

### Fix

**File: `apps/web/src/lib/analyzer.ts`**

1. Line ~3397: Change `canonicalizeScopes(input, parsed)` → `canonicalizeScopes(analysisInput, parsed)`
2. Line ~3424: Change `canonicalizeScopes(input, parsed)` → `canonicalizeScopes(analysisInput, parsed)`
3. Line ~3416: Change `trimmedInput` → `analysisInput` in supplemental fallback

### Key Insight

The `analysisInput` variable contains the normalized statement form (after question→statement conversion). All downstream processing that affects research queries or scope detection must use `analysisInput`, not the original `input` or `trimmedInput`.

---

## Issue 2: "Question" Label on Statements

**Status: UNVERIFIED - needs testing**

### Symptom
Statements ending with "?" incorrectly show "Question:" prefix in title.

### Root Cause

Lines ~3329-3331 aggressively override `detectedInputType` to "question" if input ends with "?" or starts with question words, even if LLM classified it as a claim/article.

The title generation at line ~6448 then uses this flag:
```typescript
let title = isQuestion
  ? `Question: ${understanding.questionBeingAsked || state.originalInput}`
  : state.originalText.split("\n")[0]?.trim().slice(0, 100) || "Analyzed Content";
```

### Fix

**File: `apps/web/src/lib/analyzer.ts`** (line ~6448)

Only use "Question:" prefix when there's actual question intent:
```typescript
let title = isQuestion && understanding.questionIntent !== "none"
  ? `Question: ${understanding.questionBeingAsked || state.originalInput}`
  : state.originalText.split("\n")[0]?.trim().slice(0, 100) || "Analyzed Content";
```

The `questionIntent` field can be: `"verification" | "exploration" | "comparison" | "none"`

---

## Issue 3 & 4: UI Duplication

**See Section A above** - these UI fixes are confirmed working.

---

## Issue 5: "Contested" vs "Doubted" Terminology

**Status: EXISTING LOGIC - no code changes needed**

### Current Logic (Already Correct)

The code at page.tsx lines ~911-925 already distinguishes:
- **"CONTESTED"**: `isContested: true` AND `factualBasis: "established" || "disputed"`
- **"Doubted"**: `isContested: true` AND `factualBasis: "opinion" || "alleged" || "unknown"`

### Potential Issue

LLM may be setting `factualBasis` incorrectly. The prompt instructions exist but may need reinforcement to emphasize:
- `"established"` = actual documented counter-evidence (documents, data, audits)
- `"opinion"` = rhetorical opposition without evidence

---

## Files Summary

| File | Status | Changes |
|------|--------|---------|
| `apps/web/src/app/jobs/[id]/page.tsx` | **CONFIRMED WORKING** | Hide duplicate implied claim (A1), case-insensitive comparison (A2), truncation (A3) |
| `apps/web/src/lib/analyzer.ts` | **DID NOT WORK** | `canonicalizeScopes()` fix did not resolve input neutrality divergence |

---

## Verification Tests

### Input Neutrality Test
1. Analyze: "The Bolsonaro judgment (trial) was fair and based on Brazils law"
2. Analyze: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
3. Verdicts should converge (difference < 2%)

### UI Duplication Test
1. Analyze a PDF article
2. Verify implied claim box is hidden when it matches Article Summary
3. Verify no redundant "Question Asked" section for statements

### "Question" Label Test
1. Analyze: "The X was fair?" (statement with "?")
2. Verify title does NOT show "Question:" prefix

---

## Lessons Learned

1. **Input normalization must be consistent**: Any function that processes the input for scope detection, query generation, or pattern matching must use the normalized `analysisInput`, not the original input.

2. **Case sensitivity matters for deduplication**: UI deduplication logic should use case-insensitive comparison to catch more duplicates.

3. **Question detection is multi-layered**: The `isQuestion` flag alone is insufficient; `questionIntent` provides semantic understanding of whether content is truly interrogative.

4. **Fallback chains need careful review**: When code has fallback logic like `A || B`, ensure both `A` and `B` come from the same normalized source.

---

# SECTION C: LEARNINGS FROM FIRST CHAT SESSION (Claude Opus 4.5)

This section documents the approach and findings from the **first** chat session that initiated these changes.

## What I Attempted

I identified three locations where `input` or `trimmedInput` was used instead of `analysisInput`:

1. **Line ~3397**: `canonicalizeScopes(input, parsed)` → `canonicalizeScopes(analysisInput, parsed)`
2. **Line ~3424**: Same fix in the supplemental scopes branch
3. **Line ~3416**: `parsed.impliedClaim || trimmedInput` → `parsed.impliedClaim || analysisInput`

The logic was sound: `analysisInput` contains the normalized statement form (question→statement conversion happens earlier around line ~3088-3106), so all downstream processing that affects scope detection and research queries should use this normalized form.

## What I'm Confident Was Correct

1. **The root cause diagnosis was accurate**: The `canonicalizeScopes()` function was indeed using the original `input` for pattern matching (regex for years, `inputLower` for keyword detection), which would cause different scope canonicalization for questions vs statements.

2. **The fix locations were correct**: Lines ~3397, ~3424, and ~3416 are the right places where `analysisInput` should be used.

3. **The fix was necessary but insufficient**: Passing `analysisInput` to `canonicalizeScopes()` is the correct approach, but alone it did not resolve the 4% divergence.

## Why the Fix Didn't Resolve the Divergence

Possible reasons the divergence persisted:

1. **Additional usage points**: There may be other code paths where `input`, `trimmedInput`, or `state.originalInput` is used for downstream processing that affects research queries or scope detection.

2. **LLM non-determinism**: Even with the same input, the LLM may produce slightly different interpretations. The `deterministic` mode reduces but doesn't eliminate this.

3. **Query generation variability**: The research queries generated for grounded search may still vary based on subtle input differences not addressed by these fixes.

4. **Caching/timing effects**: The grounded search API responses may vary based on time or previous queries.

## Recommendations for Future Investigation

1. **Trace the full data flow**: Add comprehensive logging to trace exactly how the input flows from entry point through to the final research queries.

2. **Compare intermediate states**: Run the two input forms (statement vs question) with logging at each major step to identify where divergence first appears.

3. **Check `buildResearchQuery()`**: This function (if it exists) may use the original input rather than the normalized form.

4. **Review Gemini grounded search calls**: The actual API calls may incorporate input in ways not covered by the `canonicalizeScopes()` fix.

---
