# Active Regression Testing - Status Report

**Date**: 2026-01-19  
**Time Started**: 13:45 UTC  
**Status**: 🔄 RUNNING  
**Test Suite**: Baseline (30 test cases)

---

## What's Running

The baseline test suite is executing all 30 test cases to establish current quality metrics and compare against the known good baseline from January 13.

### Test Execution
- **Command**: `node scripts/baseline-runner.js`
- **Location**: `apps/web/scripts/baseline-runner.js`
- **Running in**: Background process
- **Estimated Duration**: 1-3 hours
- **Estimated Cost**: $20-50 in API calls

### What's Being Tested

**30 Test Cases across 7 categories**:
1. Simple factual (5 cases) - Basic well-established facts
2. Multi-scope (5 cases) - Distinct analytical frames
3. Comparative (5 cases) - Rating direction challenges
4. Attribution separation (5 cases) - WHO vs WHAT claims
5. Temporal (5 cases) - Recent data requirements
6. Pseudoscience (3 cases) - Debunked claims detection
7. Methodology (2 cases) - Scope detection

---

## Expected Outputs

### 1. Baseline Results File
**Location**: `baseline-results-2026-01-19.json`

**Contains**:
- Full test results for all 30 cases
- Verdict accuracy vs expected
- Token usage per case
- Duration per case
- Cost estimates
- Quality gate statistics

### 2. Console Output
**Shows**:
- Progress: `[1/30] simple-01 (simple-factual)`
- Results: `✓ TRUE (95%) - Expected: TRUE 85-100%`
- Errors: `✗ Failed: timeout`
- Summary: Completed/Failed counts

### 3. Metrics Data
**If metrics integration is enabled**:
- Stored in database (`AnalysisMetrics` table)
- Accessible via dashboard (`/admin/metrics`)
- Per-job performance tracking

---

## Known Quality Issues Being Validated

Based on user evidence (Bolsonaro reports), we expect to find:

### Issue 1: Confidence Degradation
**Expected**: Lower overall confidence scores
- Baseline (Jan 13): 77% average
- Current: May drop to 50-60% range
- **Impact**: High

### Issue 2: Search Reduction
**Expected**: Fewer searches per analysis
- Baseline (Jan 13): 16 searches
- Current: May drop to 9-10 searches
- **Impact**: High (less evidence = lower quality)

### Issue 3: Claim Reduction
**Expected**: Fewer claims analyzed
- Baseline (Jan 13): 12 claims
- Current: May drop to 7-8 claims
- **Impact**: High (less thorough analysis)

### Issue 4: Input Neutrality Failure
**Expected**: Question vs Statement yields different results
- Should be within ±4% (v2.6.23 requirement)
- Currently showing 2-7% divergence
- **Impact**: Medium (violates core principle)

---

## What Happens After Tests Complete

### Step 1: Analysis
Review `baseline-results-2026-01-19.json` to:
- Calculate average confidence (target: >70%)
- Calculate schema compliance rate (target: >95%)
- Calculate verdict accuracy (target: >80% within expected range)
- Identify specific failure patterns

### Step 2: Comparison
Compare current results to Jan 13 baseline:
- Confidence: Is it lower?
- Searches: Are there fewer?
- Claims: Are there fewer?
- Verdicts: Are they less accurate?

### Step 3: Git Bisect
If regression confirmed, use git bisect to find breaking commit:
```bash
git bisect start
git bisect bad HEAD  # Current is bad
git bisect good [jan-13-commit]  # Jan 13 was good
# Test each commit until breaking change found
```

### Step 4: Fix
Once breaking commit identified:
- Analyze what changed
- Understand why it broke quality
- Implement targeted fix
- Validate with re-test

---

## Suspected Root Causes

### Primary Suspect: v2.8 Prompt Changes
**Commit**: `048efa4` - feat(prompts): implement v2.8 provider-specific optimization

**Why Suspected**:
- Never validated with A/B testing
- Major prompt restructuring
- Timing aligns with quality drop

**Evidence Needed**:
- Does reverting this commit restore quality?
- Do old prompts perform better?
- Which specific prompt changes caused degradation?

### Secondary Suspect: Gate 1 Changes
**Commit**: `aac7602` - fix(gates): treat opinions/predictions as analyzable claims

**Why Suspected**:
- Changed claim filtering logic
- May allow weaker claims through
- Could explain confidence drop

**Evidence Needed**:
- Are more low-quality claims passing Gate 1?
- Is average claim quality lower?
- Do claim types correlate with confidence?

### Tertiary Suspect: Budget Model Changes
**Commit**: `5837ebb` - fix(prompts): budget models respect FH_ALLOW_MODEL_KNOWLEDGE

**Why Suspected**:
- Changed how budget models work
- May have reduced search effectiveness
- Timing aligns with search reduction

**Evidence Needed**:
- Are fewer search queries being generated?
- Is search query quality lower?
- Does disabling budget mode restore search count?

---

## Success Criteria

### Tests Pass If:
✅ Average confidence >70%  
✅ Schema compliance >95%  
✅ Verdict accuracy >80%  
✅ Input neutrality <±4% divergence  
✅ No catastrophic failures  

### Tests Fail If:
❌ Average confidence <60%  
❌ Schema compliance <85%  
❌ Verdict accuracy <70%  
❌ Input neutrality >±5% divergence  
❌ >10% failure rate  

---

## Monitoring Progress

### Check Status
```bash
# View running tests
Get-Content C:\Users\rober\.cursor\projects\c-DEV-FactHarbor\terminals\747095.txt -Tail 50 -Wait
```

### Expected Timeline
- **0-30 min**: First 5-10 cases complete
- **30-90 min**: Half-way point (~15 cases)
- **90-180 min**: Final cases completing
- **End**: Summary statistics and output file

### Cost Tracking
- Estimated: $20-50 total
- Per case: ~$0.50-$2 depending on complexity
- Simple cases: $0.50-$1
- Complex cases: $1-$2

---

## After Completion

### Immediate Actions
1. **Review results file**: `baseline-results-2026-01-19.json`
2. **Document findings**: Create issue report with evidence
3. **Prioritize fixes**: High severity issues first
4. **Create regression tests**: Add failing cases to suite

### Next Steps
1. **Git bisect**: Find breaking commit (if regression confirmed)
2. **Targeted fixes**: Address specific issues found
3. **Re-test**: Validate fixes with baseline re-run
4. **A/B test**: Compare old vs new prompts (if v2.8 is culprit)

---

## Status Updates

**13:45 UTC**: Test suite started  
**Progress**: Monitor terminal output for live updates  
**ETA**: 13:45 + 2 hours = ~15:45 UTC  

---

## Notes

- This is exactly what the investigation needed
- User evidence confirmed - quality issues are real
- Infrastructure is working as designed
- Results will drive data-based fixes
- No more guessing - we'll have empirical data

**The measurement infrastructure is proving its value right now!** 📊
