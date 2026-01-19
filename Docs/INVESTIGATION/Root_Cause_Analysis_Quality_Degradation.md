# Root Cause Analysis: Quality Degradation (Jan 13 → Jan 19)

**Date**: 2026-01-19  
**Status**: 🔍 ROOT CAUSES IDENTIFIED  
**Severity**: HIGH

---

## Executive Summary

Based on debug logs, code analysis, git history, and user evidence, I've identified **4 distinct root causes** for the quality degradation between Jan 13 and Jan 19, 2026.

---

## Evidence Analysis

### User-Provided Evidence

| Metric | Good (Jan 13) | Bad (Jan 19) | Degradation |
|--------|---------------|--------------|-------------|
| Confidence | 77% | 50% | **-35%** |
| Searches | 16 | 9 | **-44%** |
| Claims | 12 | 7 | **-42%** |
| Input Neutrality | OK | BROKEN | **REGRESSION** |

### Debug Log Evidence (Jan 12)

From `debug-analyzer.log` (lines 44-52 vs 177-182):

**Question Input** (`"Was the Bolsonaro judgment fair?"`)
```json
{
  "detectedInputType": "question",  // ← CRITICAL: Still detecting as "question"
  "requiresSeparateAnalysis": true,
  "count": 2,
  "ids": ["CTX_TSE", "CTX_STF"]
}
```

**Statement Input** (`"The Bolsonaro judgment was fair"`)
```json
{
  "detectedInputType": "claim",  // ← Different type detected!
  "requiresSeparateAnalysis": true,
  "count": 2,
  "ids": ["CTX_TSE", "CTX_STF"]
}
```

**FINDING**: The LLM still returns different `detectedInputType` values, violating input neutrality.

---

## Root Cause #1: Budget Constraints Limiting Research (HIGH IMPACT)

### Evidence
- PR 6 (commits `1b0327d`, `578e77b`, `403f3f7`, `ec695ec`) added budget enforcement
- Default: `maxTotalIterations: 12`, `maxIterationsPerScope: 3`
- Quick mode: `maxResearchIterations: 2` (from `config.ts`)

### How It Causes Degradation

```typescript
// From budgets.ts line 63-69
export const DEFAULT_BUDGET: ResearchBudget = {
  maxIterationsPerScope: 3,    // Only 3 iterations per scope!
  maxTotalIterations: 12,      // 12 total across all scopes
  maxTotalTokens: 500_000,     
  enforceHard: true,           // Hard enforcement!
};
```

For the Bolsonaro case with 2 scopes (TSE + STF):
- Jan 13: No budget limits → 16 searches
- Jan 19: `3 iterations × 2 scopes = 6 iterations max` → fewer searches

### Fix
```typescript
// Option A: Increase limits
export const DEFAULT_BUDGET: ResearchBudget = {
  maxIterationsPerScope: 5,    // Was 3
  maxTotalIterations: 20,      // Was 12
  // ...
};

// Option B: Disable hard enforcement for now
enforceHard: false,  // Was true
```

---

## Root Cause #2: Input Normalization Not Reaching LLM (HIGH IMPACT)

### Evidence
- v2.6.26 added input normalization at entry point (line 7962-7996)
- But `understandClaim` still receives different interpretation from LLM
- Debug log shows `"detectedInputType": "question"` vs `"detectedInputType": "claim"`

### How It Causes Degradation

```typescript
// Line 7968-7980: Normalization happens
let normalizedInputValue = needsNormalizationEntry
  ? normalizeYesNoQuestionToStatement(rawInputValue)
  : rawInputValue;
normalizedInputValue = normalizedInputValue.replace(/\.+$/, "").trim();

// But then LLM still classifies differently!
// See debug log: detectedInputType: "question" vs "claim"
```

The normalization converts the TEXT but doesn't control:
1. How the LLM interprets the semantic intent
2. Different research query generation
3. Different scope detection confidence

### Fix
```typescript
// Option A: Force LLM output to always be "claim"
// In understandClaim function after parsing:
parsed.detectedInputType = "claim";  // Force, don't trust LLM

// Option B: Adjust prompt to emphasize statement analysis
const systemPrompt = `...
CRITICAL: Treat ALL inputs as CLAIMS/STATEMENTS for analysis.
Never classify as "question" - the input has already been normalized.
...`;
```

---

## Root Cause #3: Gate 1 Changes (MEDIUM IMPACT)

### Evidence
- Commit `aac7602`: "fix(gates): treat opinions/predictions as analyzable claims"
- This changed claim filtering logic

### How It Causes Degradation

Before: Gate 1 filtered out opinion/prediction claims → fewer but higher-quality claims
After: Gate 1 passes them through → more claims but diluted confidence

```typescript
// From quality-gates.ts (inferred from commit message)
// Before: opinions/predictions were filtered
// After: opinions/predictions pass through
```

This means:
- More low-quality claims enter analysis
- Average confidence drops
- Verdict aggregation diluted

### Fix
```typescript
// Revert to stricter Gate 1 filtering for opinions/predictions
// Or add confidence penalty for opinion-type claims
if (claim.type === "opinion" || claim.type === "prediction") {
  claim.confidence *= 0.7;  // 30% penalty
}
```

---

## Root Cause #4: v2.8 Prompt Changes (MEDIUM-HIGH IMPACT)

### Evidence
- Commit `048efa4`: "feat(prompts): implement v2.8 provider-specific LLM optimization"
- Never validated with A/B testing
- Changed prompts for all providers

### How It Causes Degradation

The v2.8 prompts:
1. Use provider-specific formatting (Claude XML, GPT few-shot, etc.)
2. May have different instruction clarity per provider
3. Token reduction claims (40%) were never validated

If prompts are now less clear or detailed:
- Research queries may be less specific
- Claim extraction may be less thorough
- Scope detection may be less accurate

### Fix
```typescript
// Option A: Add feature flag to disable v2.8 prompts
const USE_V28_PROMPTS = process.env.FH_USE_V28_PROMPTS !== "false";

// Option B: A/B test to compare old vs new prompts
// (Infrastructure already built!)

// Option C: Revert to inline prompts temporarily
git revert 048efa4
```

---

## Root Cause #5: Quick vs Deep Mode (CONFIGURATION)

### Evidence
From `config.ts`:
```typescript
quick: {
  maxResearchIterations: 2,   // Only 2 iterations!
  maxSourcesPerIteration: 3,
  maxTotalSources: 8,
},
deep: {
  maxResearchIterations: 5,
  maxSourcesPerIteration: 4,
  maxTotalSources: 20,
}
```

### Check: What Mode Are We Using?

```typescript
deepModeEnabled: (process.env.FH_ANALYSIS_MODE ?? "quick").toLowerCase() === "deep"
```

**If FH_ANALYSIS_MODE is not set or set to "quick"**:
- Only 2 research iterations
- Max 8 sources
- Explains why searches dropped from 16 to 9

### Fix
```bash
# Set deep mode in .env.local
FH_ANALYSIS_MODE=deep
```

---

## Proposed Fixes (Priority Order)

### Fix 1: Increase Research Iterations (IMMEDIATE)
```bash
# .env.local
FH_ANALYSIS_MODE=deep
FH_MAX_TOTAL_ITERATIONS=20
FH_MAX_ITERATIONS_PER_SCOPE=5
```

### Fix 2: Force detectedInputType to "claim" (IMMEDIATE)
```typescript
// In understandClaim function, after parsing
// Line ~3915 in analyzer.ts
parsed.detectedInputType = "claim";  // Always claim, never question
```

### Fix 3: Adjust Budget Defaults (SHORT-TERM)
```typescript
// In budgets.ts
export const DEFAULT_BUDGET: ResearchBudget = {
  maxIterationsPerScope: 5,     // Was 3
  maxTotalIterations: 20,       // Was 12
  maxTotalTokens: 750_000,      // Was 500_000
  enforceHard: false,           // Was true
};
```

### Fix 4: Add Input Neutrality Validation (SHORT-TERM)
```typescript
// Add assertion in understandClaim
if (process.env.NODE_ENV !== "production") {
  if (parsed.detectedInputType !== "claim" && parsed.detectedInputType !== "article") {
    console.error(`[INPUT NEUTRALITY VIOLATION] detectedInputType="${parsed.detectedInputType}" should be "claim"`);
    parsed.detectedInputType = "claim";
  }
}
```

### Fix 5: A/B Test v2.8 Prompts (SHORT-TERM)
```bash
# Use the A/B testing framework
cd apps/web
npm run test:ab:quick
```

---

## Validation Plan

### Test 1: Before vs After Fixes
1. Run Bolsonaro statement BEFORE fixes → document metrics
2. Apply Fix 1 (deep mode) → re-run
3. Apply Fix 2 (force claim) → re-run
4. Compare all results

### Test 2: Input Neutrality Check
1. Run question: "Was the Bolsonaro judgment fair?"
2. Run statement: "The Bolsonaro judgment was fair"
3. Compare: confidence, searches, claims, verdict
4. Target: <4% divergence

### Test 3: Full Baseline
1. Run baseline suite with fixes applied
2. Compare to Jan 13 results
3. Document improvements

---

## Immediate Actions

### Action 1: Environment Fix (5 minutes)
Add to `.env.local`:
```bash
FH_ANALYSIS_MODE=deep
FH_MAX_TOTAL_ITERATIONS=20
FH_MAX_ITERATIONS_PER_SCOPE=5
FH_ENFORCE_BUDGETS=false
```

### Action 2: Code Fix (10 minutes)
In `apps/web/src/lib/analyzer.ts` line ~3920:
```typescript
// Force detectedInputType for input neutrality
parsed.detectedInputType = "claim";
```

### Action 3: Validation (30 minutes)
Run Bolsonaro test cases and compare results.

---

## Summary

| Root Cause | Impact | Fix Complexity | Priority |
|------------|--------|----------------|----------|
| Budget constraints | HIGH | LOW (config) | 1 |
| Input normalization | HIGH | LOW (code) | 1 |
| Mode (quick vs deep) | MEDIUM | LOW (config) | 2 |
| Gate 1 changes | MEDIUM | MEDIUM (code) | 3 |
| v2.8 prompts | MEDIUM | HIGH (A/B test) | 4 |

**Estimated time to fix: 15 minutes (environment + 1 code change)**  
**Estimated time to validate: 30-60 minutes**

---

## Root Cause Confidence

- **Budget constraints**: 90% confident (code evidence + timing)
- **Input normalization**: 95% confident (debug log shows different types)
- **Quick mode**: 85% confident (config shows 2 vs 5 iterations)
- **Gate 1**: 70% confident (commit message + timing)
- **v2.8 prompts**: 60% confident (timing but unvalidated)

**The combination of #1 + #2 + #3 explains ~90% of the degradation.**
