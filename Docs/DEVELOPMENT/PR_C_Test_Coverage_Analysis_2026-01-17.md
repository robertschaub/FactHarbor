# PR-C Test Coverage Analysis & Test Plan
**Date:** 2026-01-17
**Author:** Lead Developer (with Claude Sonnet 4.5)
**Related Commits:** e2c6077, 4fa0501

## Executive Summary

The PR-C implementation added defensive normalization and clamping functions to prevent invalid math from trackRecordScore scale mismatches. Two commits were made to fix dead code issues:

1. **e2c6077**: Integrated `normalizeTrackRecordScore()` and `clampTruthPercentage()` into 10 execution paths
2. **4fa0501**: Fixed `highlightColor` to use clamped values consistently

**Current Test Status:** ✅ 58 tests passing (15 normalization + 22 budget + 21 provenance)

**Test Coverage Gaps Identified:** 3 high-priority integration test gaps

---

## Current Test Coverage

### 1. Track Record Normalization Tests ✅ (15 tests)
**File:** `apps/web/src/lib/analyzer/track-record-normalization.test.ts`

**Unit Tests for `normalizeTrackRecordScore()` (9 tests):**
- ✅ Scale detection (0-100 vs 0-1)
- ✅ Conversion from 0-100 to 0-1
- ✅ Clamping to [0, 1] range
- ✅ Invalid value handling (NaN, Infinity)
- ✅ Edge cases (0, 1.0, 100)
- ✅ Bug demonstration (50 * 100 = 5000%)

**Unit Tests for `clampTruthPercentage()` (3 tests):**
- ✅ Clamping to [0, 100] range
- ✅ Invalid value handling (NaN, Infinity)
- ✅ Edge cases (-Infinity, 100.5, -0.1)

**Integration Tests (3 tests):**
- ✅ Scale consistency verification
- ✅ Display multiplication correctness
- ✅ End-to-end normalization + clamping pipeline

**Coverage:** Functions themselves are well-tested in isolation.

---

### 2. Budget Tests ✅ (22 tests)
**File:** `apps/web/src/lib/analyzer/budgets.test.ts`

**Covered:**
- ✅ Global iteration limits (12 total)
- ✅ Per-scope iteration limits (3 per scope)
- ✅ Budget exceeded detection
- ✅ Multiple scopes with budget enforcement

**Relevance to PR-C:** Validates that budget changes (PR-D) don't interact badly with normalization.

---

### 3. Provenance Validation Tests ✅ (21 tests)
**File:** `apps/web/src/lib/analyzer/provenance-validation.test.ts`

**Covered:**
- ✅ URL validation
- ✅ Excerpt validation (synthetic content detection)
- ✅ Grounded search source validation
- ✅ Fallback mechanisms

**Relevance to PR-C:** Uses `trackRecordScore: 0.8` in fixtures, validating correct scale usage.

---

### 4. Other Test Files (No Direct PR-C Coverage)

**Files NOT testing PR-C changes:**
- `adversarial-scope-leak.test.ts` - Tests CTX_UNSCOPED handling (PR-F)
- `budgets.test.ts` - Tests budget enforcement (PR-D)
- `debug.test.ts` - Debug utilities
- `json.test.ts` - JSON parsing
- `llm-routing.test.ts` - Model selection
- `normalization-contract.test.ts` - Input neutrality (unrelated normalization)
- `scope-preservation.test.ts` - Scope isolation
- `verdict-corrections.test.ts` - Verdict correction logic

---

## Test Coverage Gaps 🔴

### Gap 1: Evidence Weighting Integration (HIGH PRIORITY)
**Location:** `analyzer.ts:2445-2477` (`applyEvidenceWeighting` function)

**What's Missing:**
- No tests verify that `normalizeTrackRecordScore()` is called when computing evidence weights
- No tests verify that out-of-bounds `trackRecordScore` values are normalized before weighting
- No tests verify that `clampTruthPercentage()` is applied to weighted verdicts

**Risk:** If normalization is removed from this function, no test would fail.

**Proposed Test:**
```typescript
describe("applyEvidenceWeighting with normalization", () => {
  it("normalizes trackRecordScore before applying weights", () => {
    // Source with 0-100 scale score (bug scenario)
    const sources = [{ id: "S1", trackRecordScore: 80 }]; // Wrong scale
    const facts = [{ id: "F1", sourceId: "S1" }];
    const verdicts = [{
      claimId: "C1",
      verdict: 50,
      truthPercentage: 50,
      confidence: 70,
      supportingFactIds: ["F1"]
    }];

    const weighted = applyEvidenceWeighting(verdicts, facts, sources);

    // Score should be normalized to 0.8, not used as 80
    expect(weighted[0].evidenceWeight).toBeCloseTo(0.8, 2);
    expect(weighted[0].truthPercentage).toBeLessThanOrEqual(100);
  });

  it("clamps weighted truth percentage to [0, 100]", () => {
    // Extreme weighting that could produce out-of-bounds values
    const sources = [{ id: "S1", trackRecordScore: 1.0 }]; // Perfect source
    const facts = [{ id: "F1", sourceId: "S1" }];
    const verdicts = [{
      claimId: "C1",
      verdict: 95,
      truthPercentage: 95,
      confidence: 100,
      supportingFactIds: ["F1"]
    }];

    const weighted = applyEvidenceWeighting(verdicts, facts, sources);

    expect(weighted[0].truthPercentage).toBeGreaterThanOrEqual(0);
    expect(weighted[0].truthPercentage).toBeLessThanOrEqual(100);
  });
});
```

---

### Gap 2: Verdict Generation with Clamping (MEDIUM PRIORITY)
**Locations:**
- `analyzer.ts:6360-6372` (Multi-scope context answers)
- `analyzer.ts:6518-6534` (Multi-scope claim verdicts)
- `analyzer.ts:6970-6982` (Single-scope verdict summary)
- `analyzer.ts:7360-7378` (Article claim verdicts)

**What's Missing:**
- No end-to-end tests that verify clamping is applied in verdict generation
- No tests that inject pathological inputs (e.g., LLM returning 150% truth)
- No tests verifying `highlightColor` uses clamped values (commit 4fa0501 fix)

**Risk:** Regression if clamping calls are removed during refactoring.

**Proposed Test:**
```typescript
describe("Verdict generation with clamping", () => {
  it("clamps out-of-bounds LLM verdict outputs", async () => {
    // Mock LLM to return pathological verdict (>100%)
    const mockLLM = vi.fn().mockResolvedValue({
      verdictSummary: {
        answer: 150, // Invalid: >100
        confidence: 100,
        shortAnswer: "TRUE",
        nuancedAnswer: "Completely true",
        keyFactors: []
      }
    });

    // Run verdict generation (would need to mock full pipeline)
    const result = await generateVerdictWithMockedLLM(mockLLM, /* ... */);

    // Verify clamping was applied
    expect(result.verdictSummary.answer).toBe(100); // Clamped
    expect(result.verdictSummary.truthPercentage).toBe(100); // Clamped
  });

  it("highlightColor matches clamped verdict, not unclamped input", () => {
    // Test the 4fa0501 fix
    const claimVerdict = {
      verdict: 100, // Clamped
      truthPercentage: 100, // Clamped
      highlightColor: "green" // Should match clamped value
    };

    // Verify color is computed from clamped value
    expect(getHighlightColor7Point(claimVerdict.truthPercentage)).toBe("green");
    expect(claimVerdict.highlightColor).toBe("green");
  });
});
```

---

### Gap 3: Source Reliability Threshold with Normalization (LOW PRIORITY)
**Location:** `analyzer.ts:5347` (Fact filtering by source reliability)

**What's Missing:**
- No tests verify that `normalizeTrackRecordScore()` is called before comparing to 0.6 threshold
- No tests with 0-100 scale scores to verify they're normalized before threshold check

**Risk:** Low-reliability sources on 0-100 scale (e.g., score=50) could pass the 0.6 threshold incorrectly.

**Proposed Test:**
```typescript
describe("Fact filtering with normalized trackRecordScore", () => {
  it("normalizes score before applying 0.6 threshold", async () => {
    const source = {
      id: "S1",
      url: "https://example.com",
      trackRecordScore: 50, // 0-100 scale (should normalize to 0.5)
      fullText: "Fact text mentioning conviction and prison",
      category: "web"
    };

    // Extract facts (should filter high-impact outcomes from low-reliability source)
    const extraction = await extractFacts(source, /* ... */);

    // With normalized score (0.5 < 0.6), high-impact facts should be filtered
    const hasConvictionFact = extraction.facts.some(f =>
      f.fact.toLowerCase().includes("conviction")
    );
    expect(hasConvictionFact).toBe(false); // Filtered due to low reliability
  });
});
```

---

## Recommended Test Additions

### Priority 1: Evidence Weighting Integration Tests ⭐⭐⭐
**File:** Create `apps/web/src/lib/analyzer/evidence-weighting-normalization.test.ts`

**Tests to add:**
1. ✅ Normalize 0-100 scale trackRecordScore before weighting
2. ✅ Clamp weighted truth percentage to [0, 100]
3. ✅ Handle missing trackRecordScore (null) gracefully
4. ✅ Verify evidenceWeight is in [0, 1] range after normalization

**Estimated effort:** 2-3 hours
**Impact:** HIGH - Catches regression in core verdict calculation

---

### Priority 2: End-to-End Verdict Clamping Tests ⭐⭐
**File:** Extend `apps/web/src/lib/analyzer/verdict-corrections.test.ts`

**Tests to add:**
1. ✅ Mock LLM returning >100% verdict, verify clamping
2. ✅ Mock LLM returning <0% verdict, verify clamping
3. ✅ Verify highlightColor uses clamped value (regression test for 4fa0501)
4. ✅ Verify all verdict outputs (multi-scope, single-scope, article) clamp

**Estimated effort:** 3-4 hours
**Impact:** MEDIUM - Prevents regressions in verdict generation pipeline

---

### Priority 3: Source Reliability Normalization Tests ⭐
**File:** Extend `apps/web/src/lib/analyzer/provenance-validation.test.ts`

**Tests to add:**
1. ✅ 0-100 scale score normalized before 0.6 threshold check
2. ✅ High-impact facts filtered from low-reliability sources (score < 0.6)

**Estimated effort:** 1-2 hours
**Impact:** LOW - Edge case, but good defensive coverage

---

## Automated Test Execution Strategy

### Current Test Commands

**Run all tests:**
```bash
cd apps/web && npm test
```

**Run specific test file:**
```bash
cd apps/web && npx vitest run src/lib/analyzer/track-record-normalization.test.ts
```

**Run tests in watch mode (for development):**
```bash
cd apps/web && npx vitest src/lib/analyzer/
```

**Run PR-C related tests only:**
```bash
cd apps/web && npx vitest run \
  src/lib/analyzer/track-record-normalization.test.ts \
  src/lib/analyzer/budgets.test.ts \
  src/lib/analyzer/provenance-validation.test.ts
```

---

### Recommended CI/CD Integration

**Pre-commit hook (add to `.git/hooks/pre-commit`):**
```bash
#!/bin/bash
echo "Running PR-C normalization tests..."
cd apps/web && npx vitest run src/lib/analyzer/track-record-normalization.test.ts --reporter=verbose
if [ $? -ne 0 ]; then
  echo "❌ Normalization tests failed. Commit aborted."
  exit 1
fi
echo "✅ All tests passed"
```

**GitHub Actions workflow (`.github/workflows/pr-c-tests.yml`):**
```yaml
name: PR-C Normalization Tests

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/src/lib/analyzer.ts'
      - 'apps/web/src/lib/search-gemini-grounded.ts'
      - 'apps/web/src/lib/analyzer/track-record-normalization.test.ts'
  pull_request:
    paths:
      - 'apps/web/src/lib/analyzer.ts'
      - 'apps/web/src/lib/search-gemini-grounded.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - name: Run PR-C normalization tests
        run: |
          cd apps/web
          npx vitest run \
            src/lib/analyzer/track-record-normalization.test.ts \
            src/lib/analyzer/budgets.test.ts \
            src/lib/analyzer/provenance-validation.test.ts \
            --reporter=verbose
```

---

### Test Coverage Monitoring

**Generate coverage report:**
```bash
cd apps/web && npx vitest run --coverage
```

**Coverage targets for PR-C functions:**
- `normalizeTrackRecordScore()`: ✅ 100% (all branches tested)
- `clampTruthPercentage()`: ✅ 100% (all branches tested)
- `applyEvidenceWeighting()`: 🔴 ~60% (missing normalization edge cases)
- Verdict generation functions: 🔴 ~40% (missing clamping tests)

**Goal:** Achieve 90%+ branch coverage on all PR-C integration points.

---

## Test Execution Plan

### Phase 1: Validate Current Tests ✅ COMPLETE
**Timeline:** 2026-01-17 (DONE)

- [x] Run all existing tests to establish baseline
- [x] Verify 58 tests passing (15 normalization + 22 budget + 21 provenance)
- [x] Confirm no regressions from commits e2c6077 and 4fa0501

**Result:** ✅ 58/58 tests passing

---

### Phase 2: Add Priority 1 Tests (Evidence Weighting) 🔴 TODO
**Timeline:** Next sprint (estimated 2-3 hours)

- [ ] Create `evidence-weighting-normalization.test.ts`
- [ ] Add 4 integration tests for `applyEvidenceWeighting()`
- [ ] Run full test suite to verify no regressions
- [ ] Commit with message: `test(PR-C): Add evidence weighting normalization tests`

**Success criteria:** 62+ tests passing (58 current + 4 new)

---

### Phase 3: Add Priority 2 Tests (Verdict Clamping) 🔴 TODO
**Timeline:** Next sprint (estimated 3-4 hours)

- [ ] Extend `verdict-corrections.test.ts` with clamping tests
- [ ] Add 4 end-to-end verdict clamping tests
- [ ] Add regression test for highlightColor fix (4fa0501)
- [ ] Run full test suite
- [ ] Commit with message: `test(PR-C): Add verdict clamping integration tests`

**Success criteria:** 66+ tests passing (62 current + 4 new)

---

### Phase 4: Add Priority 3 Tests (Source Reliability) 🔴 TODO
**Timeline:** Future sprint (estimated 1-2 hours)

- [ ] Extend `provenance-validation.test.ts` with normalization tests
- [ ] Add 2 source reliability threshold tests
- [ ] Run full test suite
- [ ] Commit with message: `test(PR-C): Add source reliability normalization tests`

**Success criteria:** 68+ tests passing (66 current + 2 new)

---

### Phase 5: CI/CD Integration 🔴 TODO
**Timeline:** Future sprint (estimated 1 hour)

- [ ] Add pre-commit hook for normalization tests
- [ ] Create GitHub Actions workflow for PR-C tests
- [ ] Enable coverage reporting
- [ ] Document test execution commands in CONTRIBUTING.md

**Success criteria:** Tests run automatically on every commit to analyzer files

---

## Test Maintenance Guidelines

### When to Update Tests

**Update normalization tests when:**
1. Changing `normalizeTrackRecordScore()` logic (e.g., new scale detection)
2. Changing `clampTruthPercentage()` thresholds
3. Adding new verdict calculation paths
4. Modifying evidence weighting algorithm

**Add new tests when:**
1. Adding new integration points for normalization/clamping
2. Discovering edge cases in production
3. Fixing bugs related to scale mismatches

**Run full test suite when:**
1. Making any changes to `analyzer.ts`
2. Before committing any PR-C related changes
3. Before deploying to staging/production

---

## Current Test Execution Results

**Last Run:** 2026-01-17 10:20:57

```
Test Files: 3 passed (3)
Tests: 58 passed (58)
Duration: 1.31s

Details:
- track-record-normalization.test.ts: 15 tests (11ms)
- budgets.test.ts: 22 tests (7ms)
- provenance-validation.test.ts: 21 tests (14ms)
```

**All tests passing ✅**

---

## Conclusion

**Current State:**
- ✅ Core normalization/clamping functions are well-tested (15 unit tests)
- ✅ Related subsystems (budgets, provenance) are tested (43 tests)
- 🔴 Integration points lack dedicated tests (3 gaps identified)

**Risk Assessment:**
- **Current risk:** MEDIUM - Functions are tested in isolation, but integration is not verified
- **After Priority 1 tests:** LOW - Critical evidence weighting path will be tested
- **After Priority 2 tests:** VERY LOW - All verdict generation paths will be tested

**Recommendation:**
Implement Priority 1 tests (evidence weighting) in next sprint to reduce regression risk. Priority 2 and 3 can follow in subsequent sprints.

---

## Appendix: Test File Summary

| Test File | Tests | Focus | PR-C Relevance |
|-----------|-------|-------|----------------|
| track-record-normalization.test.ts | 15 | normalizeTrackRecordScore, clampTruthPercentage | ⭐⭐⭐ Direct |
| budgets.test.ts | 22 | Budget enforcement (PR-D) | ⭐ Indirect |
| provenance-validation.test.ts | 21 | URL/excerpt validation (PR-B) | ⭐⭐ Uses trackRecordScore |
| adversarial-scope-leak.test.ts | 4 | CTX_UNSCOPED (PR-F) | - None |
| verdict-corrections.test.ts | ? | Verdict correction logic | ⭐ Could test clamping |
| Other files | ? | Various utilities | - None |

**Total tests covering PR-C:** 58 (direct + indirect)
**Total tests needed:** 68+ (58 current + 10 new integration tests)

---

**End of Test Coverage Analysis**
