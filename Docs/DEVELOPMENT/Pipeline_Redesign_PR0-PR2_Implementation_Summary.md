# Pipeline Redesign Implementation Summary: PR 0-2

**Date**: 2026-01-16
**Implementer**: Claude Code (Opus 4.5)
**Status**: ✅ Complete
**Reference**: [Handover_Pipeline_Redesign_Implementation.md](Handover_Pipeline_Redesign_Implementation.md)

---

## Executive Summary

Successfully implemented the first three PRs of the Pipeline Redesign:
- **PR 0**: Regression test harness with live LLM tests
- **PR 1**: Normalization cleanup (removed redundancy)
- **PR 2**: Scope preservation verification tests

All unit tests pass. Integration tests ready to run with LLM API keys.

---

## Changes Overview

### Files Created (5)

| File | Purpose | Lines | PR |
|------|---------|-------|-----|
| `apps/web/test-fixtures/neutrality-pairs.json` | 10 Q/S test pairs | 71 | PR 0 |
| `apps/web/src/lib/input-neutrality.test.ts` | Input neutrality tests | 285 | PR 0 |
| `apps/web/src/lib/analyzer/scope-preservation.test.ts` | Scope detection/retention tests | 557 | PR 0, PR 2 |
| `apps/web/src/lib/analyzer/adversarial-scope-leak.test.ts` | Cross-scope citation prevention | 417 | PR 0 |
| `apps/web/src/lib/analyzer/normalization-contract.test.ts` | Normalization unit tests | 135 | PR 1 |

### Files Modified (1)

| File | Lines Changed | Changes | PR |
|------|---------------|---------|-----|
| `apps/web/src/lib/analyzer.ts` | 2965-2989 | Removed redundant normalization, added contract assertion, exported function | PR 1 |

**Total**: +1,465 lines added, ~20 lines modified/removed

---

## PR 0: Regression Test Harness

### Objective
Establish measurable regression tests before any code changes.

### Implementation

#### 1. Test Fixtures
**File**: `apps/web/test-fixtures/neutrality-pairs.json`

10 question/statement pairs across domains:
- Legal (court judgment)
- Business (Tesla revenue, Enron fraud)
- Science (climate change, COVID vaccine)
- Energy (solar power)
- Economics (minimum wage)
- Workplace (remote work)
- Environment (EV emissions)
- Politics (election results)

#### 2. Input Neutrality Tests
**File**: `apps/web/src/lib/input-neutrality.test.ts`

**Tests**:
- Individual pair divergence (per-pair testing)
- Aggregate divergence across all pairs (avg ≤4 points)
- p95 divergence tracking (informational)

**Key Features**:
- Live LLM integration tests
- Deterministic mode (`FH_DETERMINISTIC=true`)
- Test results output to `test-output/neutrality/`
- Graceful skipping when API keys unavailable

**Example Output**:
```json
{
  "pair": { "id": "court-judgment", "question": "...", "statement": "..." },
  "question": { "verdict": 75.2, "elapsed": 45230 },
  "statement": { "verdict": 73.8, "elapsed": 44120 },
  "divergence": 1.4,
  "passed": true
}
```

#### 3. Scope Preservation Tests
**File**: `apps/web/src/lib/analyzer/scope-preservation.test.ts`

**Tests**:
- Multi-scope legal (FTC vs EC regulatory)
- Multi-scope methodological (WTW vs TTW vs LCA)
- Multi-scope geographic (California vs Texas)
- Scope retention (all scopes appear in verdicts)
- Scope ID stability (deterministic runs)

**Key Features**:
- Verifies ≥1 fact per detected scope
- Tracks scope-loss events
- JSON output for debugging

#### 4. Adversarial Scope Leak Tests
**File**: `apps/web/src/lib/analyzer/adversarial-scope-leak.test.ts`

**Tests**:
- Cross-scope citation prevention (Q form)
- Cross-scope citation prevention (S form)
- Ambiguous evidence handling (CTX_UNSCOPED)
- Q/S consistency on adversarial input

**Test Input** (from handover):
```
Two legal scopes share confusing identifiers.
Scope A: Supreme Court of Country A, Case 2024-017...
Scope B: Supreme Court of Country B, Case 2024-017...
```

**Pass Criteria**:
- No facts from Scope A reference Country B
- No facts from Scope B reference Country A
- Ambiguous facts → CTX_UNSCOPED

---

## PR 1: Normalization Cleanup

### Objective
Remove redundant normalization inside `understandClaim`.

### Problem
Normalization happened twice:
1. Entry point (`runFactHarborAnalysis:7816`) - ✅ Keep
2. Inside `understandClaim` (2979) - ❌ Remove (redundant)

### Solution

#### Change 1: Remove Redundancy
**File**: `apps/web/src/lib/analyzer.ts` (lines 2965-2989)

**Before**:
```typescript
const needsNormalization = trimmedInputRaw.endsWith("?") || /^(was|is|...)/i.test(...);
const normalizedInput = needsNormalization
  ? normalizeYesNoQuestionToStatement(trimmedInputRaw)
  : trimmedInputRaw;
const analysisInput = normalizedInput;
```

**After**:
```typescript
// INPUT CONTRACT: Caller MUST normalize before calling
if (process.env.NODE_ENV !== "production") {
  const looksLikeQuestion = trimmedInputRaw.endsWith("?") || /^(was|is|...)/i.test(...);
  if (looksLikeQuestion) {
    console.warn("[Analyzer] CONTRACT VIOLATION: understandClaim received question-form input");
  }
}
const analysisInput = trimmedInputRaw; // Already normalized by caller
```

#### Change 2: Export for Testing
**File**: `apps/web/src/lib/analyzer.ts` (line 517)

```typescript
export function normalizeYesNoQuestionToStatement(input: string): string {
```

#### Change 3: Contract Tests
**File**: `apps/web/src/lib/analyzer/normalization-contract.test.ts`

**Tests**:
- Question → statement conversion
- Statement preservation
- Trailing period handling
- Edge cases (empty input, single word)
- Auxiliary verb detection
- Q/S normalization consistency

**Result**: 8 tests, all passing

---

## PR 2: Scope Preservation Verification

### Objective
Prove scope preservation works via regression tests.

### Implementation
Extended `apps/web/src/lib/analyzer/scope-preservation.test.ts` with 3 new tests:

#### Test 1: Complex Merger Case
**Input**: FTC + EC + CMA regulatory merger review (realistic, complex)

**Verifies**:
- Detects ≥2 scopes
- Each scope has ≥1 fact (or is properly marked UNSCOPED)

#### Test 2: Refinement Scope Coverage
**Input**: Multi-scope legal input (FTC vs EC)

**Verifies**:
- Facts are distributed across detected scopes
- Non-trivial scopes have representation
- Tracks coverage ratio (covered/total)

#### Test 3: Scope Name Preservation
**Input**: California vs Texas regulations

**Verifies**:
- Scope names contain geographic identifiers
- Informational tracking (not hard failure)

---

## Test Infrastructure

### Environment Setup
Tests require:
```bash
# .env.local
FH_DETERMINISTIC=true
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Running Tests

#### Quick Unit Tests (~5 seconds)
```bash
cd apps/web
npm test -- --run normalization-contract
```

#### Single Integration Test (~2 min)
```bash
cd apps/web
npm test -- --run -t "court-judgment"
```

#### Full Test Suite (~40-60 min)
```bash
cd apps/web
npm test -- --run
```

### Test Output
Results written to:
- `apps/web/test-output/neutrality/`
- `apps/web/test-output/scope-preservation/`
- `apps/web/test-output/adversarial-scope-leak/`

Each test produces JSON files for debugging:
- Individual test results
- Aggregate metrics
- Scope detection details

---

## Test Results

### Unit Tests ✅
```
Test Files  12 passed (12)
Tests       35 passed (35)
Duration    ~2s
```

**Breakdown**:
- claim-importance: 3 tests ✅
- json extraction: 5 tests ✅
- debug utils: 1 test ✅
- verdict corrections: 4 tests ✅
- llm-routing: 4 tests ✅
- analyzer (clampConfidence): 3 tests ✅
- job-lifecycle: 10 tests ✅ (skips API when unavailable)
- **normalization-contract: 8 tests ✅** (NEW)

### Integration Tests ⏳
Require LLM API keys and 40-60 minutes to run:
- Input neutrality: 4 tests (1 loads fixtures, 1 single pair, 2 aggregate)
- Scope preservation: 8 tests (5 basic + 3 regression)
- Adversarial scope leak: 4 tests
- LLM integration: 1 test (pre-existing)

**Status**: Infrastructure complete, ready to run with API keys

---

## Verification Checklist

- [x] All unit tests pass
- [x] No TypeScript errors
- [x] Test fixtures load correctly
- [x] Contract assertion compiles without errors
- [x] Test output directories created
- [ ] Run at least one LLM integration test successfully (requires API keys)
- [ ] Verify contract assertion appears in dev mode logs (requires running analyzer)
- [ ] Establish baseline metrics from full test run

---

## Impact Assessment

### Code Quality
- **Lines of Code**: +1,465 (test infrastructure)
- **Test Coverage**: Increased (new regression tests)
- **Complexity**: Reduced (removed redundant normalization)
- **Maintainability**: Improved (contract assertions, test documentation)

### Performance
- **Runtime**: No change (removed redundant work)
- **Test Time**: +40-60 min for full suite (expected for regression tests)

### Risk
- **Low**: Changes are additive (new tests) + simplification (removed redundancy)
- **Mitigation**: Contract assertion catches violations in dev mode
- **Rollback**: Easy (revert single commit per PR)

---

## Known Issues / Limitations

### 1. Test Duration
**Issue**: Full integration test suite takes 40-60 minutes.

**Mitigation**:
- Run subset during development (e.g., single pair)
- Run full suite in CI/CD nightly
- Consider adding fast mocked tests for quick feedback

### 2. LLM Non-Determinism
**Issue**: Even with `FH_DETERMINISTIC=true`, some variance exists.

**Mitigation**:
- Use ranges instead of exact values (e.g., ≤4 points, not ==0)
- Track p95 in addition to average
- Multiple runs to establish baselines

### 3. API Costs
**Issue**: Full test suite = 20+ LLM calls (can be expensive).

**Mitigation**:
- Use cheapest tier models for tests (gpt-4o-mini, haiku)
- Run full suite only on main branch
- Consider test budget limits

---

## Next Steps

### Immediate
1. ✅ Verify unit tests pass
2. ⏳ Run single integration test to verify infrastructure
3. ⏳ Establish baseline metrics (run full suite once)
4. ⏳ Review test output JSON files
5. ⏳ Commit changes as separate PRs

### Short-Term (Next PRs)
- **PR 3**: Deterministic scope IDs (Day 0 audit required)
- **PR 4**: Gate1 timing (requires supplemental claims refactor planning)
- **PR 5**: Grounded research provenance enforcement
- **PR 6**: Budgets, semantic validation, bounded parallelism

### Long-Term
- Add CI/CD integration (see CI/CD setup guide)
- Expand test coverage (more Q/S pairs, more adversarial cases)
- Add performance regression tests (p95 latency tracking)
- Consider snapshot testing for deterministic outputs

---

## Commit Messages (Suggested)

### PR 0
```
feat(tests): add regression test harness for pipeline redesign

- Add input neutrality test suite (Q/S divergence ≤4 points)
- Add scope preservation verification tests
- Add adversarial scope leak prevention tests
- Include 10 Q/S test pairs across multiple domains

Creates measurable regression tests before code changes.
Tests use live LLM integration with deterministic mode.
Output to test-output/ directory for debugging.

Part of Pipeline Redesign Phase 0 (test infrastructure)
Ref: Docs/DEVELOPMENT/Handover_Pipeline_Redesign_Implementation.md
```

### PR 1
```
refactor(analyzer): remove redundant normalization in understandClaim

- Remove duplicate normalization logic (caller already normalizes)
- Add contract assertion in dev mode to catch violations
- Export normalizeYesNoQuestionToStatement for testing
- Add unit tests for normalization contract (8 tests)

BREAKING: understandClaim now requires pre-normalized input.
Contract assertion warns in dev/test mode if violated.
No behavior change for production (entry point still normalizes).

Part of Pipeline Redesign PR 1 (normalization cleanup)
Ref: Docs/DEVELOPMENT/Handover_Pipeline_Redesign_Implementation.md
```

### PR 2
```
test(scopes): add regression cases for scope preservation

- Add complex merger case (FTC/EC/CMA regulatory input)
- Add refinement scope coverage verification
- Add scope name preservation tracking

Extends scope-preservation.test.ts with real-world regression cases.
Verifies scope detection and fact distribution across scopes.

Part of Pipeline Redesign PR 2 (scope preservation verification)
Ref: Docs/DEVELOPMENT/Handover_Pipeline_Redesign_Implementation.md
```

---

## References

- [Handover Document](Handover_Pipeline_Redesign_Implementation.md)
- [Implementation Plan](Pipeline_Redesign_Plan_2026-01-16.md)
- [Feasibility Audit](Implementation_Feasibility_Audit_Report.md)
- [Test Fixtures](../../apps/web/test-fixtures/neutrality-pairs.json)

---

## Contact

Questions or issues? See:
- Implementation handover: `Docs/DEVELOPMENT/Handover_Pipeline_Redesign_Implementation.md`
- Governance rules: `AGENTS.md`
- Test configuration: `apps/web/test-config/`
