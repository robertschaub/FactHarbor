# Quality Regression Investigation - Bolsonaro Reports

**Date**: 2026-01-19  
**Status**: ✅ CONFIRMED - Real quality degradation between Jan 13-19  
**Severity**: HIGH

---

## Evidence of Regression

### Report Comparison

| Metric | Good (Jan 13) | Bad (Jan 19) | Change |
|--------|---------------|--------------|--------|
| **Job ID** | 077b5b24e2424c139a68c1b11e6dd153 | 1a88dbcd47914abcbb4cd78c01e41872 | - |
| **Confidence** | 77% | 50% | **-37% ⚠️** |
| **Searches** | 16 | 9 | **-44% ⚠️** |
| **Claims** | 12 | 7 | **-42% ⚠️** |
| **Verdict** | Mostly True 73% | Mostly True 73% | Same |
| **Detail Quality** | Rich, nuanced | Sparse | Degraded |

### Input Neutrality Failure

| Input Type | Job ID | Contexts | Verdict | Confidence |
|------------|--------|----------|---------|------------|
| Question | b9c9b19f50ff47ada888c8d65f528c11 | 3 | Leaning True 71% | 78% |
| Statement | 1a88dbcd47914abcbb4cd78c01e41872 | 2 | Mostly True 73% | 50% |
| Difference | - | **+1 context** | **-2% verdict** | **+28% confidence** |

**This violates v2.6.23 input neutrality requirement** (should be within ±4%)

---

## Root Cause Analysis

### Suspected Commits (Jan 13-19)

1. **`aac7602` - fix(gates): treat opinions/predictions as analyzable claims**
   - Changed Gate 1 filtering behavior
   - May have allowed more low-quality claims through
   - Could explain confidence drop

2. **`5837ebb` - fix(prompts): budget models respect FH_ALLOW_MODEL_KNOWLEDGE**
   - Changed how budget models work
   - May have reduced search effectiveness
   - Could explain 44% search reduction

3. **`048efa4` - feat(prompts): implement v2.8 provider-specific optimization**
   - **This is the main v2.8 change**
   - Never validated with real LLM calls
   - May have degraded quality despite good intentions

4. **`937c765` - fix(canonical): align verdictSummary fields + evidence-only grounding**
   - Changed grounding requirements
   - May have reduced analysis depth

---

## Specific Issues Identified

### Issue 1: Confidence Collapse (77% → 50%)
**Impact**: CRITICAL

The 37-point confidence drop indicates the system is fundamentally uncertain about its analysis. This suggests:
- Evidence gathering is weaker (fewer searches)
- Evidence quality is lower
- Analysis is less thorough (fewer claims)

**Possible Causes**:
- Budget model changes reducing search depth
- Gate 1 changes allowing weaker claims
- v2.8 prompt changes reducing clarity

### Issue 2: Search Reduction (16 → 9, -44%)
**Impact**: HIGH

Nearly half as many searches means:
- Less evidence collected
- Lower confidence in conclusions
- Missing key facts

**Possible Causes**:
- Budget constraints kicking in too early
- Search query generation weakened
- v2.8 prompts generating fewer queries

### Issue 3: Analysis Depth Loss (12 → 7 claims, -42%)
**Impact**: HIGH

Fewer claims means:
- Less thorough examination
- Missing important aspects
- Reduced coverage

**Possible Causes**:
- Gate 1 being too aggressive
- Claim extraction weakened
- Scope detection issues

### Issue 4: Input Neutrality Broken
**Impact**: HIGH

Question vs statement yielding different results violates core requirement:
- Different context counts (2 vs 3)
- Different verdicts (Leaning True vs Mostly True)
- Inconsistent confidence (50% vs 78%)

**This was supposedly fixed in v2.6.23** but is clearly broken again.

---

## Recommended Investigation Steps

### Step 1: Identify Breaking Change (URGENT)
```bash
# Bisect between Jan 13-19 commits
git bisect start
git bisect bad HEAD  # Current state is bad
git bisect good 077b5b24e2424c139a68c1b11e6dd153  # Jan 13 was good

# Test each commit with same input
# Find which commit broke it
```

### Step 2: Compare Prompt Behavior
Run same input with:
- Old prompts (inline, pre-v2.8)
- New prompts (v2.8 optimized)

**This is exactly what the A/B testing framework would reveal!**

### Step 3: Analyze Search Query Generation
Compare search queries generated for:
- Good report (077b5b24, 16 searches)
- Bad report (1a88dbcd, 9 searches)

Why are fewer queries being generated?

### Step 4: Check Gate 1 Behavior
The `aac7602` commit specifically changed Gate 1 to "treat opinions/predictions as analyzable claims". This may have:
- Allowed weaker claims through
- Reduced overall confidence
- Degraded analysis quality

### Step 5: Validate Input Neutrality
The question vs statement difference is a regression. Need to:
- Check normalization logic
- Verify canonicalization
- Test with multiple phrasings

---

## Immediate Actions Required

### Action 1: Enable Metrics Collection (URGENT)
**Why**: We need to see what's happening inside the analysis

Add metrics collection to analyzer.ts to track:
- How many search queries generated
- Which claims passed Gate 1
- Confidence scores per phase
- LLM call patterns

**This would have caught the regression immediately!**

### Action 2: Run Regression Test (URGENT)
**Why**: Validate the degradation is systematic

Use the baseline test suite to:
- Re-run the Bolsonaro question with current code
- Compare to Jan 13 results
- Document all differences

### Action 3: Git Bisect (HIGH PRIORITY)
**Why**: Find the exact breaking commit

Binary search through commits to find which one caused:
- Confidence drop
- Search reduction
- Input neutrality failure

### Action 4: Rollback or Fix (HIGH PRIORITY)
Once breaking commit identified:
- Either revert it
- Or fix the regression
- Then validate with baseline test

---

## Why This Wasn't Caught

### 1. No Metrics Collection
- Can't see search count in real-time
- Can't track confidence trends
- Can't alert on degradation

**Solution**: Metrics infrastructure (now built)

### 2. No Baseline Tests
- Can't compare current vs previous
- Can't detect regressions automatically
- Can't validate fixes

**Solution**: Baseline test suite (now built)

### 3. No A/B Testing
- v2.8 prompts never validated
- Changes deployed without proof
- Degradation went unnoticed

**Solution**: A/B testing framework (now built)

### 4. Testing Theater
- 143 tests pass but only check syntax
- No tests actually run analyses
- No tests compare quality

**Solution**: Real behavior testing (now available)

---

## Validation of Original Investigation

### My Original Assessment: WRONG ❌
> "The 'bad quality' problem was actually a measurement problem"

### User's Assessment: CORRECT ✅
> "I completely disagree... quality is still relatively bad"

### Evidence:
- 37% confidence drop
- 44% search reduction
- 42% fewer claims
- Input neutrality broken

**The user was right. Quality DID degrade between Jan 13-19.**

---

## Revised Root Cause

### Primary Cause: Unvalidated v2.8 Changes
The v2.8 prompt optimization (`048efa4`) was deployed without A/B testing and appears to have degraded quality despite good intentions.

### Secondary Causes:
1. Gate 1 changes (`aac7602`) may have weakened filtering
2. Budget model changes (`5837ebb`) may have reduced search depth
3. Grounding changes (`937c765`) may have limited analysis scope

### Underlying Cause: Lack of Measurement
Without metrics, baseline tests, and A/B validation:
- Changes deployed blindly
- Regressions went undetected
- No way to validate fixes

**The measurement problem WAS real, but it masked a quality problem.**

---

## Next Steps (Revised Priority)

### URGENT: Identify Breaking Change
1. Run git bisect to find exact breaking commit
2. Analyze what changed in that commit
3. Understand why it broke quality

### URGENT: Enable Metrics
1. Add metrics collection to analyzer.ts
2. Re-run Bolsonaro analysis
3. Compare metrics to Jan 13 report
4. Document what's different

### HIGH: Run Baseline Test
1. Execute baseline suite with current code
2. Document all quality issues
3. Prioritize fixes based on severity

### HIGH: Fix Regressions
1. Address confidence collapse
2. Fix search reduction
3. Restore input neutrality
4. Validate with tests

### MEDIUM: A/B Test v2.8
1. Compare pre-v2.8 vs v2.8 prompts
2. Measure actual impact (not assumptions)
3. Keep what works, revert what doesn't

---

## Lessons Learned

1. **Users are right until proven wrong** - The user's evidence was solid
2. **Measure everything** - Metrics would have caught this immediately
3. **Test real behavior** - 143 passing tests meant nothing
4. **Never deploy unvalidated optimizations** - v2.8 needed A/B testing
5. **Input neutrality is fragile** - Broke despite v2.6.23 "fix"

---

## Status

**Investigation**: ✅ CONFIRMED  
**Root Cause**: 🔍 SUSPECTED (v2.8 + Gate 1 + budget changes)  
**Fix**: ⏸️ PENDING (needs git bisect + targeted fixes)  
**Validation**: ⏸️ READY (metrics + baseline tests now available)

**The infrastructure to fix this is now in place. The question is: which specific commit broke it?**
