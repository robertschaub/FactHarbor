# FactHarbor POC1 — Quick Reference: Key Changes

## Files Changed

```
apps/web/src/lib/
├── analyzer.ts      ← Major rewrite (prompting, quality gates, validation)
└── source-bundle.ts ← Performance + contradiction search
```

---

## Top 5 Changes Summary

### 1. Parallel Source Fetching
**File**: `source-bundle.ts`  
**Impact**: ~38s → ~8-12s

```typescript
// BEFORE (sequential)
for (const source of trimmed) {
  const text = await extractTextFromUrl(source.url);
}

// AFTER (parallel with timeout)
const fetchPromises = trimmed.map(async (source) => {
  return Promise.race([
    extractTextFromUrl(source.url),
    timeout(8000)
  ]);
});
await Promise.allSettled(fetchPromises);
```

### 2. Mandatory Contradiction Search
**File**: `source-bundle.ts`  
**Impact**: Balanced evidence gathering

```typescript
// NEW: After primary search, search for opposing views
const contradictionQueries = [
  `${keyTerms} criticism problems controversy`,
  `${keyTerms} false misleading debunked`,
  `${keyTerms} fact-check disputed`
];
```

### 3. Quality Gates (Gate 1 + Gate 4)
**File**: `analyzer.ts`  
**Impact**: POC1 spec compliance

```typescript
// Gate 1: Claim must have scenarios
if (claim.scenarios.length === 0) failures.push('No scenarios');

// Gate 4: Minimum 2 sources, 50% confidence
if (knownSources.length < 2) failures.push('< 2 sources');
if (scenario.verdict.confidence < 0.5) failures.push('Below MEDIUM threshold');
```

### 4. Minimum Confidence Enforcement
**File**: `analyzer.ts`  
**Impact**: No more 0% confidence

```typescript
// BEFORE
confidence: z.number().min(0).max(1)

// AFTER  
confidence: z.number().min(0.1).max(1)

export function clampConfidence(value: number): number {
  return Math.max(0.1, Math.min(1, value));  // Never 0
}
```

### 5. Improved System Prompt
**File**: `analyzer.ts`  
**Impact**: Methodology enforcement

Key additions:
- "NEVER classify complex input as single 'opinion'"
- "Every scenario MUST have counter_evidence"
- "Confidence MUST be 0.1-1.0, NEVER 0"
- Source reliability scoring guidance
- Decomposition examples

---

## New Environment Variables

```env
# Add to .env.local
FH_MINIMUM_CONFIDENCE=0.1
FH_REQUIRE_CONTRADICTION_SEARCH=true
FH_QUALITY_GATES_ENABLED=true
FH_SOURCE_BUNDLE_MAX_SOURCES=10
FH_SEARCH_MAX_RESULTS=8
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Source fetch time | ~38s | ~8-12s |
| Total analysis | ~56s | ~25-35s |
| Empty scenarios | Common | Blocked |
| Zero confidence | Common | Impossible |
| Contradiction search | None | Mandatory |
| Quality gates | None | Enforced |

---

## Testing After Implementation

```bash
# Test with Bolsonaro case
curl -X POST http://localhost:3000/api/fh/analyze \
  -H "Content-Type: application/json" \
  -d '{"inputType":"text","inputValue":"Bolsonaro judgment was fair and based on Brazil law"}'

# Check:
# 1. Claims are decomposed (not single "opinion")
# 2. Scenarios have counter_evidence
# 3. Confidence > 0.1
# 4. Quality gates in response
# 5. Timing < 35s
```
