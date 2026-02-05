# Tangential Context Creation Fix - Deep Investigation

**Status:** IMPLEMENTED
**Date:** 2026-02-05
**Issue:** "US Government Response to Brazilian Trial" context created without evidence, tangential to user's question

---

## Problem Statement

When user asked: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"

System incorrectly created a context:
- **Name:** "US Government Response to Brazilian Trial"
- **AssessedStatement:** "The US government's characterization and response to the Bolsonaro trial reflects legitimate concerns about fairness"
- **Result:** 15% (Mostly False) with 0 positive, 3 negative factors

**Why this is wrong:**
1. The USER'S QUESTION is about the TRIAL'S FAIRNESS under Brazilian law
2. The US RESPONSE is a REACTION to the trial, not an evaluation of its fairness
3. "Was the US response appropriate?" is a DIFFERENT QUESTION than "Was the trial fair?"
4. This context has no evidence about the trial's actual fairness - it's noise

---

## Root Cause Analysis

### What Was There Before
The prompts had scattered guidance about "reactions ≠ evaluations" but:
1. Focused on CLAIMS being tangential, not preventing CONTEXT creation
2. No explicit "DO NOT CREATE AnalysisContexts for third-party reactions"
3. The assessedStatement guidance allowed LLMs to create contexts answering DIFFERENT questions

### The Gap
The prompts emphasized analytical DISTINCTIVENESS (different institutions = different contexts) without emphasizing that ALL contexts must DIRECTLY ANSWER THE USER'S QUESTION.

The LLM saw:
- Evidence about US government sanctions/responses
- This is a "distinct analytical frame" (different institution, different process)
- Created a context for it

But failed the fundamental test: **Does this context answer the user's question?** NO.

---

## The Fix

### Core Principle Added
**"SAME QUESTION RULE"**: ALL AnalysisContexts must answer the SAME analytical question the user asked.

### Files Modified

#### 1. `orchestrated-understand.ts` (lines 56-83)
Added prominent ANALYSISCONTEXT RELEVANCE REQUIREMENT section with:
- THE FUNDAMENTAL TEST: "Would evaluating this AnalysisContext tell us whether the user's thesis is true?"
- SAME QUESTION RULE with concrete examples
- THIRD-PARTY REACTIONS ARE NEVER VALID ANALYSISCONTEXTS (explicit prohibition)
- CONCRETE EXAMPLE using the exact Bolsonaro pattern

#### 2. `context-refinement-base.ts` (lines 96-125)
Added same guidance to context refinement phase:
- THE FUNDAMENTAL TEST
- SAME QUESTION RULE with WRONG/RIGHT examples
- THIRD-PARTY REACTIONS ARE NEVER VALID (with concrete Bolsonaro-like example)
- Clear guidance: "US Government Response" is NOISE

#### 3. `understand-base.ts` (lines 63-70)
Added brief reference to same rules:
- THIRD-PARTY REACTIONS in "Do NOT Split For" list
- SAME QUESTION RULE with valid/invalid example

---

## Specific Changes

### Before (context-refinement-base.ts)
```
**SAME SUBJECT/ENTITY RULE**:
- AnalysisContexts MUST be about the SAME SUBJECT as the thesis
- If thesis is about "Person A's trial", do NOT include AnalysisContexts about Person B, C, etc.
- **THIRD-PARTY REACTIONS WITH LOW PROBATIVE VALUE ARE NOISE**...
```

### After (context-refinement-base.ts)
```
**THE FUNDAMENTAL TEST**: Every AnalysisContext must DIRECTLY ANSWER the user's original question.
- Ask: "Would evaluating this AnalysisContext tell us whether the user's thesis is true?"
- If NO → Do NOT create this AnalysisContext

**SAME QUESTION RULE (MANDATORY)**:
- ALL AnalysisContexts must answer the SAME analytical question the user asked
- WRONG: User asks "Was X fair?" → AnalysisContext assesses "Was the response to X justified?"
- RIGHT: User asks "Was X fair?" → AnalysisContext assesses "Was X fair under framework A?"

**THIRD-PARTY REACTIONS ARE NEVER VALID ANALYSISCONTEXTS** (MANDATORY):
- ❌ NEVER create AnalysisContexts for: reactions to X, responses to X, criticism of X, sanctions...
- ❌ Even if evidence exists about these reactions, they answer a DIFFERENT QUESTION
- ✅ ONLY create AnalysisContexts for: different aspects/proceedings of X itself

**ABSTRACT EXAMPLE**:
- User thesis: "Was process X fair/valid?"
- Evidence includes: proceedings data, third-party reactions
- ✅ CREATE: "X under framework A" (directly evaluates X)
- ❌ DO NOT CREATE: "Entity Y's Response to X" (evaluates Y's reaction)
```

---

## Validation

- TypeScript compilation: ✅ No errors in prompt files
- Build check: ✅ (pre-existing unrelated API route issue, not from this change)

---

## Expected Behavior After Fix

For input: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"

**Before (broken):**
- Context 1: Brazilian Supreme Federal Court Criminal Trial ✅
- Context 2: US Government Response to Brazilian Trial ❌ (SHOULD NOT EXIST)
- Context 3: TSE Electoral Proceedings ✅

**After (fixed):**
- Context 1: Brazilian Supreme Federal Court Criminal Trial ✅
- Context 2: TSE Electoral Proceedings ✅
- NO context for US/foreign government reactions

---

## Why Previous Attempts Failed

Previous attempts likely:
1. Added guidance about "reactions" but didn't make it prominent enough
2. Focused on claim-level filtering (thesisRelevance) instead of context-level prevention
3. Didn't include concrete examples that match the exact failure pattern
4. Didn't introduce the "SAME QUESTION RULE" concept

This fix addresses all of these by:
1. Making the guidance PROMINENT (first thing in relevance section)
2. Adding CONTEXT-LEVEL prohibition (not just claim-level)
3. Including CONCRETE EXAMPLE matching the Bolsonaro pattern exactly
4. Introducing explicit "SAME QUESTION RULE" as a mandatory test

---

## Testing Recommendation

Re-run the Bolsonaro analysis to verify:
1. No "US Government Response" or similar tangential contexts created
2. Only contexts directly evaluating the trial's fairness under Brazilian law
3. Foreign government reactions filtered as noise, not given their own context
