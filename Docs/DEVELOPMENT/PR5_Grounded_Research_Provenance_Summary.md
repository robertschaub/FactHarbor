# PR 5: Grounded Research Provenance (Phase 0 Ground Realism) - Implementation Summary

**Date**: 2026-01-16
**Status**: ⏳ Partially Complete (validation layer ready, integration pending)
**Prerequisite**: PR 3 (Deterministic Scope IDs) ✅ Complete
**Reference**: [Handover_Pipeline_Redesign_Implementation.md](Handover_Pipeline_Redesign_Implementation.md)

---

## Executive Summary

Created provenance validation layer to enforce the "Ground Realism" gate: facts used for verdicts **must** come from real fetched sources with proper URLs and excerpts, not LLM-synthesized content.

**Status**:
- ✅ Validation module created (`provenance-validation.ts`)
- ✅ Comprehensive tests (21 tests, all passing)
- ⏳ Integration into analyzer pending
- ⏳ Fallback to external search pending

---

## Changes Overview

### Files Created (2)

| File | Purpose | Lines |
|------|---------|-------|
| `apps/web/src/lib/analyzer/provenance-validation.ts` | Provenance validation logic | 336 |
| `apps/web/src/lib/analyzer/provenance-validation.test.ts` | Test suite | 541 |

**Total**: 877 lines added

---

## Implementation Details

### 1. Provenance Validation Module

**File**: `apps/web/src/lib/analyzer/provenance-validation.ts`

**Core Function**: `validateFactProvenance(fact: ExtractedFact)`

Validates facts against Ground Realism criteria:

1. **sourceUrl must exist and be valid**
   - Not empty
   - Valid HTTP(S) URL
   - Not localhost/internal/synthetic URLs

2. **sourceExcerpt must exist and be substantial**
   - Minimum 20 characters
   - Not empty or trivial

3. **sourceExcerpt must not be LLM-synthesized**
   - Rejects patterns like:
     - "Based on my/the analysis..."
     - "According to the/my findings..."
     - "The source indicates..."
     - "I found that..."
   - Accepts legitimate quotes: "According to the court documents..." ✅

**Pass Criteria**:
```typescript
{
  isValid: true,
  severity: "ok"
}
```

**Failure Example**:
```typescript
{
  isValid: false,
  failureReason: "sourceExcerpt appears to be LLM-generated synthesis",
  severity: "error"
}
```

---

### 2. Fact Filtering Function

**Function**: `filterFactsByProvenance(facts: ExtractedFact[])`

Enforcement point for Ground Realism gate. Returns:

```typescript
{
  validFacts: ExtractedFact[],        // Only facts with valid provenance
  invalidFacts: ExtractedFact[],      // Rejected facts with reasons
  stats: {
    total: number,
    valid: number,
    invalid: number
  }
}
```

**Console Logging**:
```
[Provenance] Rejected fact S1-F2: Missing sourceUrl
[Provenance] Validation: 5/7 facts have valid provenance, 2 rejected
```

---

### 3. Source Provenance Validation

**Function**: `validateSourceProvenance(source: FetchedSource)`

Validates that sources (especially grounded search sources) have real provenance:

**For Grounded Search Sources** (`category: "grounded_search"`):
- ✅ URL must be present and real
- ✅ fullText must not be LLM synthesis
- ✅ Must have grounding metadata

**Returns**:
```typescript
{
  hasProvenance: boolean,
  hasGroundingMetadata: boolean,
  failureReason?: string
}
```

---

### 4. Grounded Search Fallback Detection

**Function**: `validateGroundedSearchProvenance(sources: FetchedSource[])`

Determines if grounded search sources have valid provenance, and if fallback to external search is needed.

**Returns**:
```typescript
{
  isValid: boolean,
  groundedSources: number,
  validGroundedSources: number,
  invalidGroundedSources: number,
  shouldFallbackToExternalSearch: boolean  // TRUE if invalid grounded sources found
}
```

**Fallback Trigger**:
- If any grounded source lacks provenance → fallback required
- Logs: `[Provenance] Grounded search sources lack valid provenance. Fallback to external search required.`

---

## Test Coverage

**File**: `apps/web/src/lib/analyzer/provenance-validation.test.ts`

**21 tests, 4 test suites**:

### Suite 1: validateFactProvenance (11 tests)
- ✅ Accepts valid facts with real URLs and excerpts
- ✅ Rejects missing/empty sourceUrl
- ✅ Rejects invalid URL patterns (localhost, chrome://, etc.)
- ✅ Rejects malformed URLs
- ✅ Rejects missing/too-short sourceExcerpt
- ✅ Rejects synthetic LLM-generated excerpts (multiple patterns)
- ✅ Accepts legitimate quoted excerpts

### Suite 2: filterFactsByProvenance (2 tests)
- ✅ Filters out invalid facts while keeping valid ones
- ✅ Returns all facts when all are valid

### Suite 3: validateSourceProvenance (5 tests)
- ✅ Validates grounded search sources with real URLs
- ✅ Rejects grounded sources without URLs
- ✅ Rejects grounded sources with invalid URLs
- ✅ Rejects grounded sources with synthetic fullText
- ✅ Validates non-grounded sources correctly

### Suite 4: validateGroundedSearchProvenance (3 tests)
- ✅ Passes when all grounded sources have valid provenance
- ✅ Fails and requires fallback when provenance is missing
- ✅ Ignores non-grounded sources in validation

**All tests passing**: 21/21 ✅

---

## Validation Rules

### Valid Source URL Patterns

✅ **ACCEPT**:
- `https://example.com/article`
- `http://news.site.org/story`

❌ **REJECT**:
- Empty string
- `localhost`
- `127.0.0.1`
- `chrome://settings`
- `javascript:void(0)`
- `about:blank`
- `#anchor`

### Valid Source Excerpt Patterns

✅ **ACCEPT**:
- "According to the court documents filed on March 15, the judge ruled..."
- "\"Revenue increased by 25%,\" stated the CFO in the earnings call."
- Direct quotes with ≥20 characters

❌ **REJECT**:
- "Based on my analysis..."
- "According to the findings..."
- "The source indicates that..."
- "I found that..."
- Excerpts <20 characters

---

## Integration Plan (TODO)

### Phase 1: Add Provenance Validation to Fact Extraction

**File**: `apps/web/src/lib/analyzer.ts` (around line 5318)

**Before** (current):
```typescript
return filteredFacts.map((f, i) => ({
  id: `${source.id}-F${i + 1}`,
  fact: f.fact,
  category: f.category,
  // ... rest of fact object
}));
```

**After** (with provenance validation):
```typescript
import { filterFactsByProvenance } from "./analyzer/provenance-validation";

// ... inside extractFacts function

const factsWithProvenance = filteredFacts.map((f, i) => ({
  id: `${source.id}-F${i + 1}`,
  fact: f.fact,
  category: f.category,
  sourceId: source.id,
  sourceUrl: source.url,
  sourceTitle: source.title,
  sourceExcerpt: f.sourceExcerpt,
  // ... rest of fact object
}));

// Apply provenance validation (Ground Realism gate)
const { validFacts, invalidFacts, stats } = filterFactsByProvenance(factsWithProvenance);

console.log(`[Analyzer] Provenance validation: ${stats.valid}/${stats.total} facts have valid provenance`);

return validFacts;
```

---

### Phase 2: Add Fallback to External Search

**File**: `apps/web/src/lib/analyzer.ts` (research loop section)

**Logic**:
1. Check if grounded search is enabled
2. If yes, run grounded search
3. Validate grounded sources with `validateGroundedSearchProvenance()`
4. If `shouldFallbackToExternalSearch === true`:
   - Log warning
   - Fall back to standard search (Brave/Google)
5. Continue with fact extraction

**Pseudocode**:
```typescript
import { validateGroundedSearchProvenance } from "./analyzer/provenance-validation";

// In research loop
if (FH_USE_GROUNDED_SEARCH && isGroundedSearchAvailable()) {
  const groundedResult = await searchWithGrounding({ prompt: query });
  const sources = convertToFetchedSources(groundedResult);

  // Validate provenance
  const validation = validateGroundedSearchProvenance(sources);

  if (validation.shouldFallbackToExternalSearch) {
    console.warn("[Analyzer] Grounded search lacks provenance, falling back to external search");
    // Run external search instead
    const externalSources = await searchWithBrave({ query });
    sources = externalSources;
  }

  // Continue with sources
}
```

---

### Phase 3: Add Environment Flag

**File**: `.env.local`

```env
# Provenance validation (Ground Realism gate)
FH_PROVENANCE_VALIDATION_ENABLED=true

# Force external search (override grounded search)
FH_FORCE_EXTERNAL_SEARCH=false
```

**Usage**:
- `FH_PROVENANCE_VALIDATION_ENABLED=true`: Enable provenance validation (default in production)
- `FH_FORCE_EXTERNAL_SEARCH=true`: Skip grounded search, always use external (safety override)

---

## Verification

### Unit Tests ✅
```bash
npm test -- provenance-validation.test.ts --run
```

**Result**: 21/21 tests passing

---

### Integration Test (TODO)

**Test**: Create integration test that verifies end-to-end provenance enforcement

**Steps**:
1. Run analysis with grounded search enabled
2. Inject sources with invalid provenance
3. Verify facts are rejected
4. Verify fallback to external search occurs

**File**: `apps/web/src/lib/analyzer/provenance-integration.test.ts` (to be created)

---

## Benefits

### 1. Prevents Synthetic Evidence ✅
- Facts without real source URLs cannot enter verdict pipeline
- LLM-synthesized content is detected and rejected
- "Ground Realism" invariant is enforced

### 2. Enables Safe Grounded Search ✅
- Grounded search sources are validated for provenance metadata
- Automatic fallback to external search if provenance is missing
- No "faith-based" acceptance of LLM responses as evidence

### 3. Transparent Rejection Logging ✅
- All rejected facts are logged with reasons
- Stats tracked: `X/Y facts have valid provenance, Z rejected`
- Debuggable: Can see exactly why a fact was rejected

### 4. Fail-Closed Design ✅
- Invalid facts are **blocked**, not warned
- Severity: "error" (cannot use) vs "warning" (can use but flagged)
- Conservative: Better to reject borderline cases than accept synthetic evidence

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Over-filtering valid facts** | Low | Medium | Patterns tested extensively, allow "According to X" when X is specific |
| **Under-filtering synthetic content** | Low | High | Conservative patterns, can tighten if needed |
| **Performance impact** | Very Low | Low | Simple regex checks, <1ms per fact |
| **Grounded search always fails** | Medium | Medium | Fallback to external search ensures continuity |

---

## Known Limitations

### 1. Pattern-Based Detection
- **Issue**: Uses regex patterns to detect synthetic content
- **Limitation**: Sophisticated LLM synthesis might evade patterns
- **Mitigation**: Patterns cover common LLM phrases; can expand if needed

### 2. No Semantic Validation
- **Issue**: Doesn't verify excerpt actually came from source URL
- **Why**: Would require fetching and comparing content (expensive)
- **Acceptable**: URL + excerpt validation is sufficient for "Ground Realism" gate

### 3. URL Validation Only
- **Issue**: Doesn't verify URL is currently reachable
- **Why**: Sources may become unavailable over time (normal)
- **Acceptable**: Historical URLs are valid provenance

---

## Future Enhancements

### 1. Excerpt-to-URL Verification

Add optional deep validation:
```typescript
async function verifyExcerptMatchesSource(fact: ExtractedFact): Promise<boolean> {
  const fetched = await fetchURL(fact.sourceUrl);
  return fetched.text.includes(fact.sourceExcerpt);
}
```

Use case: Paranoid mode for high-stakes claims

### 2. Source Domain Allowlist/Blocklist

```typescript
const TRUSTED_DOMAINS = ["nytimes.com", "gov", "edu"];
const BLOCKED_DOMAINS = ["fakennews.com"];
```

Use case: Domain-based reliability scoring

### 3. Provenance Confidence Score

Instead of binary valid/invalid:
```typescript
{
  provenanceScore: 0.95,  // 0-1 scale
  factors: {
    validURL: true,
    excerptLength: 150,
    domainReputation: 0.9
  }
}
```

Use case: Soft filtering with thresholds

---

## Commit Message (Suggested)

```
feat(provenance): add Ground Realism validation (PR 5)

- Add provenance validation module for facts and sources
- Enforce real URLs + excerpts, reject LLM-synthesized content
- Add grounded search fallback detection
- 21 comprehensive tests (all passing)

Validation rules:
- Facts must have valid HTTP(S) sourceUrl (not localhost/synthetic)
- Facts must have substantial sourceExcerpt (≥20 chars, not LLM synthesis)
- Grounded search sources must have provenance metadata
- Automatic fallback to external search if provenance missing

Patterns rejected:
- "Based on my/the analysis..."
- "According to the/my findings..."
- "The source indicates..."
- Empty/invalid URLs

Phase 0 Ground Realism gate: Facts without real sources cannot enter verdicts.

Integration pending: validation layer ready, needs integration into analyzer.

Part of Pipeline Redesign PR 5
Ref: Docs/DEVELOPMENT/Handover_Pipeline_Redesign_Implementation.md
```

---

## Next Steps

### Immediate (PR 5 completion)
1. ⏳ Integrate `filterFactsByProvenance()` into `extractFacts()` function
2. ⏳ Implement grounded search fallback logic
3. ⏳ Add environment flags (`FH_PROVENANCE_VALIDATION_ENABLED`, `FH_FORCE_EXTERNAL_SEARCH`)
4. ⏳ Create integration test for end-to-end provenance enforcement
5. ⏳ Run full test suite with integration
6. ⏳ Commit PR 5 changes

### Follow-up (PR 6)
- Add budgets/caps for multi-scope research
- Add semantic validation for Structured Fact Buffer
- Implement shadow-mode run for baseline comparison

---

## References

- [Handover Document](Handover_Pipeline_Redesign_Implementation.md) - PR 5 requirements
- [Pipeline Redesign Plan](Pipeline_Redesign_Plan_2026-01-16.md) - Phase 0 Ground Realism
- [Day 0 Audit Report](Day_0_Scope_ID_Audit_Report.md) - PR 3 prerequisite

---

**Implementation started**: 2026-01-16
**Status**: ⏳ Validation layer complete, integration pending
**Next PR**: Complete PR 5 integration, then PR 6 (p95 hardening)
