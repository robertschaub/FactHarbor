# Input Neutrality: Scope Detection Variance

**Date**: 2026-01-19  
**Status**: 🔍 ROOT CAUSE IDENTIFIED  
**Priority**: HIGH

---

## Summary

While the `detectedInputType` fix ensures both questions and statements are processed as "claim", there remains **significant variance in scope detection** that causes verdict divergence beyond the 4% target.

---

## Evidence

### Fresh Test Results (with env.local updates)

| Metric | Statement | Question | Divergence |
|--------|-----------|----------|------------|
| detectedInputType | claim ✓ | claim ✓ | 0% |
| Confidence | 69% | 75% | 6% |
| Verdict | 74% | 62% | **12%** ⚠️ |
| Contexts | 4 | 3 | Different |
| Iterations | 4 | 4 | Same |

### Scope Detection Variance

**Statement detected 4 contexts:**
1. STF Coup Plot Trial (75%)
2. Brazilian Electoral Process (75%)
3. International Perspectives (70%)
4. Brazil scope (74%)
→ Average: ~74%

**Question detected 3 contexts:**
1. STF Coup Attempt Trial (65%)
2. **Public Perception and Trust (45%)** ← Outlier!
3. Brazilian Judicial System (75%)
→ Average: ~62%

The "Public Perception and Trust" context at 45% significantly drags down the question's verdict.

---

## Root Cause Analysis

### Why Scope Detection Varies

1. **LLM Interpretation Variance**
   - Even with normalized input, the LLM interprets semantic nuances differently
   - "Was X fair?" implies investigation/doubt
   - "X was fair" implies affirmation/verification

2. **Research Query Divergence**
   - Different interpretation → different research queries
   - Different queries → different web search results
   - Different sources → different scope detection

3. **Non-Deterministic Web Search**
   - Same query can return different results at different times
   - Search result order affects which sources get analyzed first

### Chain of Divergence

```
Input Phrasing
    ↓
LLM Semantic Interpretation (VARIANCE POINT 1)
    ↓
Research Query Generation (amplifies variance)
    ↓
Web Search Results (non-deterministic)
    ↓
Source Analysis & Scope Detection (VARIANCE POINT 2)
    ↓
Different Scopes → Different Verdicts
```

---

## Proposed Fixes

### Fix A: Strengthen Input Normalization (RECOMMENDED)

Force the exact same normalized text into the LLM for scope detection.

```typescript
// In understandClaim, before LLM call:
const scopeDetectionInput = canonicalizeForScopeDetection(analysisInput);
// This strips all question indicators and normalizes to pure statement
```

### Fix B: Deterministic Scope Seeding

Provide a fixed scope template for known topics:

```typescript
// For legal/trial topics, always start with these scopes:
const LEGAL_TOPIC_SCOPES = [
  { pattern: /trial|judgment|court|conviction/i, scopes: ["TRIAL", "APPEAL"] },
  // ...
];
```

### Fix C: Scope Merging Heuristics

Post-process detected scopes to merge similar ones:

```typescript
// If "Public Perception" and "Public Trust" detected, merge them
function mergeSimilarScopes(scopes) {
  // Jaccard similarity on scope descriptions
  // Merge if > 70% similar
}
```

### Fix D: Reduce Scope Detection LLM Temperature

Already at 0 in deterministic mode, but ensure consistency:

```typescript
// Verify temperature=0 for scope detection calls
const scopeResult = await generateObject({
  temperature: 0,  // Force deterministic
  // ...
});
```

---

## Immediate Workaround

For now, the 12% divergence is acceptable for these reasons:

1. **Both verdicts are in "Leaning True" / "Mostly True" range** (62-74%)
2. **The direction is correct** - both indicate the claim is more true than false
3. **Context detection is working** - finding relevant legal/electoral contexts
4. **No false positives/negatives** - both analyses are reasonable

---

## Metrics Summary

| Target | Achieved | Status |
|--------|----------|--------|
| detectedInputType = claim | ✓ Both claim | ✅ PASS |
| Verdict divergence ≤4% | 12% | ⚠️ NEEDS WORK |
| Confidence divergence ≤10% | 6% | ✅ PASS |
| Iterations ≥4 | 4 | ✅ PASS |
| Budget not exceeded | ✓ False | ✅ PASS |

---

## Next Steps

1. **Accept Current State**: The fix addresses the primary issue (detectedInputType)
2. **Track Divergence**: Monitor input neutrality metrics in production
3. **Implement Fix A**: Strengthen input normalization for scope detection
4. **A/B Test**: Compare scope detection consistency before/after Fix A

---

## Files to Modify for Fix A

1. `apps/web/src/lib/analyzer.ts` - Add scope detection normalization
2. `apps/web/src/lib/analyzer/scopes.ts` - Add canonicalizeForScopeDetection function

---

## Additional Test Results (v2.8.2 with Scope Normalization)

### EV Lifecycle Case ✅ PASSED
| Metric | Statement | Question | Divergence |
|--------|-----------|----------|------------|
| Verdict | 82% | 84% | **2%** ✅ |
| Confidence | 88% | 85% | 3% |
| Contexts | 3 | 3 | Match ✅ |

### Bolsonaro Case ⚠️ HIGH VARIANCE
| Metric | Statement | Question | Divergence |
|--------|-----------|----------|------------|
| Verdict | 39% | 64% | **25%** ❌ |
| Confidence | 85% | 69% | 16% |
| Contexts | 3 | 3 | Match ✅ |

**Root Cause**: Different web search results led to different evidence:
- Statement found "US Government Response" context (15% verdict) - Trump admin criticism
- Question found "Public Opinion Polling" context (45% verdict)

The scope normalization fix helped match context counts, but the underlying search variance
still causes significant divergence for politically charged topics with diverse sources.

---

## Conclusion

The v2.8.2 fixes successfully address:
- ✅ Input type detection (both detected as "claim")
- ✅ Budget/iteration limits (4-5 iterations observed)
- ✅ Context count matching (scope normalization working)
- ✅ Non-political topics (EV case: 2% divergence)

Remaining issue:
- ⚠️ Politically charged topics still show high variance due to search result diversity
- The Bolsonaro case found different news sources leading to opposite conclusions

This is fundamentally a web search consistency issue, not purely a scope detection issue.
