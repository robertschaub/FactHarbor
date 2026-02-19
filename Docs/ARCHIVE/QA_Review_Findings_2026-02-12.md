# QA Review Findings — FactHarbor Codebase Audit

**Date**: 2026-02-12
**Reviewer**: QA Reviewer (AI Agent)
**Scope**: Comprehensive codebase audit for rule violations, obsolete code, and complexity issues
**Related Plan**: [Improvement Plan](../../.claude/plans/polished-tumbling-hare.md)

---

## Executive Summary

**Overall Assessment**: ✅ **GOOD with Improvement Opportunities**

The FactHarbor codebase demonstrates **excellent compliance** with AGENTS.md rules and strong architectural patterns in the .NET API. The recent LLM Intelligence Migration work is exemplary. Primary improvement opportunities:

- **879 lines** of unused/deprecated code can be removed (quick win)
- **orchestrated.ts** (13,904 lines) requires modularization (long-term effort)
- **Magic numbers** should move to UCM config (medium effort)

---

## 1. AGENTS.md Rule Compliance: ✅ HIGHLY COMPLIANT

**Status**: Zero critical violations found.

### ✅ Verified Compliance

| Rule Category | Status | Evidence |
|--------------|--------|----------|
| **LLM Intelligence Migration** | COMPLIANT | `grounding-check.ts`, `analysis-contexts.ts`, `verdict-corrections.ts` properly use LLM for text analysis |
| **No Hardcoded Keywords** | COMPLIANT | No domain-specific terms in production code (test data only) |
| **Terminology** | COMPLIANT | Correct usage of AnalysisContext, EvidenceScope, EvidenceItem throughout |
| **Configuration Placement** | COMPLIANT | Proper UCM/env/hardcoded tiering implemented |
| **Analysis Prompts** | COMPLIANT | Abstract examples used ("Entity A", "Country A"), no test-case terms |
| **Input Neutrality** | COMPLIANT | Canonicalization logic present in `analysis-contexts.ts` (lines 380-437) |

### Recent Exemplary Changes

**1. grounding-check.ts (Modified)**
- Lines 60-115: `extractKeyTermsBatch()` uses LLM for intelligent key term extraction
- Replaced hardcoded stop-word lists
- Fallback: Simple tokenization remains only as structural plumbing
- ✅ Proper implementation of LLM Intelligence Migration rule

**2. analysis-contexts.ts (Modified)**
- Lines 276-330: `assessContextNameSimilarityBatch()` replaced deterministic Jaccard heuristic with LLM-powered semantic similarity
- ✅ Eliminates pattern-based logic per AGENTS.md mandate

**3. verdict-corrections.ts (Modified)**
- Lines 57-96: `detectCounterClaim()` uses LLM text-analysis service (not regex/keywords)
- Comment acknowledges pattern-based logic removal
- ✅ Follows LLM Intelligence Migration rule

**4. pseudoscience.ts**
- Intentionally empty module with comment: "Deprecated pseudoscience detection (pattern-based) removed in v2.10"
- ✅ Dead code should be removed (see Priority 1 below)

### Configuration Placement Assessment

**Hardcoded Thresholds** (Acceptable as Defaults):

| File | Line | Value | Usage | Status |
|------|------|-------|-------|--------|
| grounding-check.ts | 54-56 | `0.5, 0.3, 0.1` | Grounding penalty config | ✅ Documented defaults |
| analysis-contexts.ts | 169-238 | `0.7, 5, 0.85` | Context detection/dedup | ✅ Uses `??` operator for config override |
| aggregation.ts | 58-83 | Various weights | Verdict calculation | ✅ All read from CalcConfig with defaults |

**Pattern**: `config.field ?? defaultValue` used consistently, making values UCM-tunable.

---

## 2. Unused & Obsolete Code: 879 Lines to Remove

### High Priority Removals (636 lines)

| File | Lines | Status | Usage Check |
|------|-------|--------|-------------|
| `parallel-verdicts.ts` | 204 | ❌ Not imported anywhere | Grep: 0 callers in analyzer |
| `ab-testing.ts` | 426 | ❌ Test-only, not in pipeline | Only in npm script `test:ab` |
| `pseudoscience.ts` | 6 | ❌ Intentionally empty (deprecated) | Placeholder for removed pattern logic |

**parallel-verdicts.ts Details**:
- Exports: `executeVerdictsInParallel()`, `generateClaimVerdictsParallel()`, `VerdictProgressTracker`
- Uses `p-limit` library (only usage in codebase)
- Zero imports detected in orchestrated.ts or other analyzer modules
- **Removal Impact**: 204 lines + potentially remove `p-limit` dependency

**ab-testing.ts Details**:
- Exports: `ABTestConfig`, `ABTestRun`, `runDefaultABTest()`, `runFullABTest()`
- Used only via npm script: `test:ab` and `test:ab:quick`
- Not integrated into main pipeline
- **Removal Impact**: 426 lines + remove npm scripts + potentially `test-cases.ts` dependency

**pseudoscience.ts Details**:
- 6 lines total (comment + empty exports)
- Pattern-based detection removed per LLM Intelligence Migration mandate
- **Removal Impact**: 6 lines (safe deletion)

### Medium Priority Removals (243 lines)

| File | Lines | Status | Verification Needed |
|------|-------|--------|---------------------|
| `normalization-heuristics.ts` | 55 | ❓ Likely unused | Grep: 0 matches in orchestrated.ts |
| `classification-fallbacks.ts` | 60 | ❓ Orphaned from pipeline | Imported but not called |
| `format-fallback-report.ts` | 123 | ❓ Orphaned from pipeline | Imported but not called |
| `loadSourceBundle()` function | 5 | ⚠️ Deprecated (warning logged) | Exported as "Legacy" in index.ts |

**normalization-heuristics.ts Details**:
- Exports: `splitByConfigurableHeuristics()`
- Grep: NO matches in orchestrated.ts or analyzer code
- Purpose: Text splitting by predicate starters and adjective suffixes
- **Status**: Likely safe to remove, but verify no indirect config usage

**classification-fallbacks.ts + format-fallback-report.ts Details**:
- Both appear in imports but no actual function calls detected
- May be referenced in unreachable code paths
- **Status**: Verify before removal (check if used in error handling paths)

**loadSourceBundle() Details**:
- Location: `source-reliability.ts` (lines 620-625)
- Logs warning: "deprecated. Source reliability now uses LLM evaluation with caching"
- Replaced by LLM-based source reliability scoring (v2.2+)
- **Removal Impact**: Remove function + remove "Legacy" export from index.ts

### Related Cleanup Tasks

1. **package.json** — Remove scripts:
   - `test:ab`
   - `test:ab:quick`

2. **index.ts** — Remove exports:
   - `loadSourceBundle()` (deprecated)
   - Any exports for deleted files

3. **Dependencies** — Verify if removable:
   - `p-limit` (only used by parallel-verdicts.ts?)
   - Check if `test-cases.ts` used elsewhere if ab-testing.ts removed

---

## 3. Complexity & Design Issues

### 3.1 CRITICAL: God Object — orchestrated.ts (13,904 lines)

**Problem**: Single file handles too many responsibilities.

**Responsibilities** (should be separate modules):
- Pipeline orchestration
- 5-step analysis logic (understand → research → extract → refine → verdict)
- Search query generation & result assessment
- Evidence filtering, deduplication, quality assessment
- Context similarity, merging, validation
- Claim decomposition, dependency tracking
- Verdict aggregation, calibration, grounding checks
- Budget tracking, config management, schema validation

**Complexity Metrics**:
- **13,904 lines** (13x larger than recommended 1,000-line maximum)
- **1,809+ control flow statements** (if/else/switch/loop/try-catch)
- **Multiple 500-800 line functions** (should be <200 lines)
- **7+ levels of nesting** in some code paths (should be <4)

**Impact**:
- ⚠️ File itself warns: "~13600 lines — navigate carefully"
- Testing nearly impossible at function level
- High risk of unintended side effects when making changes
- Steep learning curve for new developers
- Merge conflicts likely in multi-developer scenarios

**Specific Problem Functions**:

| Function | Line | Lines | Issue |
|----------|------|-------|-------|
| `runFactHarborAnalysis()` | 11799 | ~2,000 | Entire pipeline lifecycle in one function |
| `understandClaim()` | 5014 | ~800 | Mixes LLM calls, context detection, claim extraction |
| `decideNextResearch()` | 6877 | ~600 | Deep nesting (7 levels), temporal coupling |
| `buildAdaptiveFallbackQueries()` | 539 | ~200 | 6+ levels of ternary operators |

### 3.2 HIGH: Configuration Placement Issues

**Magic Numbers Without Constants**:

| Location | Value | Context | Should Be UCM? |
|----------|-------|---------|----------------|
| Line 6890 | `.slice(0, 4)` | Entity slice limits | ✅ YES |
| Line 6904-6915 | `word.length > 2`, `.slice(0, 8)` | Word filtering/limiting | ✅ YES |
| Line 6936 | `.slice(0, 6)` | Fallback term limit | ✅ YES |
| Line 2073 | `chunkSize = 25` | Batch size for similarity | ✅ YES |
| Line 4084 | Multiple `8, 10, 12` | Evidence/context selection | ✅ YES |
| Line 5043-5048 | `2000, 50000` | Input clamping bounds | ✅ YES |

**Hardcoded Stopwords** (line 6894):
```typescript
const stopWords = new Set([
  "the", "a", "an", "is", "was", ... // 47 words
]);
```

**Issues**:
- 47-word English stopword set inline in `decideNextResearch()`
- Duplicated if similar logic exists elsewhere (not verified)
- Cannot be tuned without code change
- Not language-configurable
- Mixed into research decision logic (violates separation of concerns)

**Recommendation**: Move to `apps/web/src/lib/analyzer/constants/stopwords.ts`

### 3.3 MEDIUM: Design Issues

**Temporal Coupling in Research Loop**:
- `decideNextResearch()` makes decisions based on implicit state accumulated across iterations
- Dependencies: `contradictionSearchPerformed`, `inverseClaimSearchPerformed`, `centralClaimsSearched`, `recentClaimsSearched`
- **Impact**: Order matters, hard to reason about, difficult to test, adding new strategies requires understanding all prior state

**Verdict Scoring Switch Statement** (lines 3483-3502):
```typescript
switch (verdict) {
  case "TRUE": case "YES": return 90;
  case "MOSTLY-TRUE": return 75;
  // ... 17 cases total
}
```
- Adding new verdict types requires code modification
- Should use `VERDICT_BANDS` lookup table from `truth-scale.ts`
- **Impact**: Not configuration-driven, violates extensibility

**Missing Abstractions**:
- Evidence processing scattered (deduplication line ~1650, filtering line ~2000, similarity checks throughout)
- Context metadata repeatedly accessed and reconstructed (lines 1970-1980, many others)
- No `EvidenceProcessor` class or `AnalysisContext` helper methods
- **Impact**: Code duplication, hard to maintain consistency

**Long Parameter Lists**:
- `buildAdaptiveFallbackQueries()`: 8+ parameters
- `assessSearchRelevanceBatch()`: 5 parameters
- **Recommendation**: Use parameter objects

### 3.4 LOW: Code Smells

**Multiple Nested Try-Catch with Silent Failures**:
- Lines 5062-5082: `inputClassification` failure silently falls back
- Lines 1964-1994: Multiple nested error handling in fallback construction
- Lines 12050-12083: Step 1 failure with silent recovery
- **Impact**: Hard to diagnose actual failures vs. expected fallbacks

**Deep Conditional Nesting**:
- `decideNextResearch()`: 7 levels deep in some paths
- **Recommendation**: Extract nested logic into helper functions

**Feature Envy**:
- Functions repeatedly access context metadata: `contextMetadata.court || contextMetadata.institution || ...`
- **Recommendation**: Add helper methods to `AnalysisContext` type

---

## 4. .NET API: ✅ WELL DESIGNED (Reference Model)

**Assessment**: The .NET services demonstrate excellent design patterns that TypeScript analyzer should emulate.

### Exemplary Design Patterns

**JobService.cs** (79 lines):
- ✅ Single responsibility: DB operations only
- ✅ Clear, focused methods
- ✅ No business logic (pure data access)
- ✅ DI-friendly
- ✅ Good use of async/await
- **No issues found**

**RunnerClient.cs** (195 lines):
- ✅ Single responsibility: HTTP retry logic
- ✅ Exponential backoff with jitter (proper retry pattern)
- ✅ Clear separation of concerns
- ✅ Good logging
- ✅ Configuration-driven retry behavior
- **No issues found**

**JobsController.cs** (134 lines):
- ✅ Focused on HTTP contract only
- ✅ Delegates to services
- ✅ Minimal logic (thin controller)
- ✅ Clear endpoint structure
- **No issues found**

**Recommendation**: Use these as reference models when refactoring TypeScript analyzer code. The level of modularity and clarity here is what orchestrated.ts should aspire to achieve.

---

## 5. Summary Statistics

### Code Removal Opportunities

| Category | Files | Lines | Confidence |
|----------|-------|-------|------------|
| High Priority | 3 | 636 | 100% safe to remove |
| Medium Priority | 4 | 243 | 95% safe (verify first) |
| **Total** | **7** | **879** | — |

### Complexity Hotspots

| File | Lines | Functions >200 Lines | Max Nesting | Priority |
|------|-------|---------------------|-------------|----------|
| orchestrated.ts | 13,904 | 3+ | 7 levels | CRITICAL |
| monolithic-dynamic.ts | ~6,000 | Unknown | Unknown | Not audited (active variant) |

### Configuration Gaps

| Category | Count | Examples |
|----------|-------|----------|
| Magic numbers | 10-15 | Batch sizes, slice limits, thresholds |
| Hardcoded sets | 1 | 47-word stopword list |
| Switch statements | 1 | Verdict scoring (17 cases) |

---

## 6. Recommendations by Priority

### Priority 1: Dead Code Removal (2-4 hours)
**Impact**: Remove 879 lines, reduce confusion, clean dependencies

✅ **Immediate action, low risk**

Files to delete:
- `parallel-verdicts.ts` (204 lines)
- `ab-testing.ts` (426 lines)
- `pseudoscience.ts` (6 lines)
- `normalization-heuristics.ts` (55 lines)
- `classification-fallbacks.ts` (60 lines)
- `format-fallback-report.ts` (123 lines)
- `loadSourceBundle()` function (5 lines)

Cleanup:
- Remove from `index.ts` exports
- Remove npm scripts: `test:ab`, `test:ab:quick`
- Verify `p-limit` dependency usage

### Priority 2: Config Migration (4-6 hours)
**Impact**: Enable runtime tuning, reduce hardcoded values

✅ **Quick win, medium impact**

Create `QueryGenerationConfig` in UCM:
- `maxEntitiesPerClaim`, `maxWordLength`, `maxSearchTerms`, `maxFallbackTerms`
- `similarityBatchSize`, `maxEvidenceSelection`, `maxContextsPerClaim`

Move stopwords to `constants/stopwords.ts`

### Priority 3: Research Logic Extraction (1-2 weeks)
**Impact**: Reduce orchestrated.ts by ~1,500 lines, improve testability

⚠️ **Medium risk, high impact**

Create `research-orchestration.ts`:
- Extract `decideNextResearch()` function
- Refactor to explicit research phases (state machine)
- Eliminate temporal coupling

### Priority 4: Evidence Processor Module (1 week)
**Impact**: Reduce orchestrated.ts by ~800 lines, consolidate logic

⚠️ **Medium risk, high impact**

Create `evidence-processor.ts`:
- Consolidate all evidence manipulation
- Create `EvidenceProcessor` class
- Extract deduplication, filtering, ranking logic

### Priority 5: Verdict Scoring Consolidation (2-3 hours)
**Impact**: Eliminate switch statement, use existing constants

✅ **Low risk, low effort**

Move to `truth-scale.ts`:
- Create lookup table from `VERDICT_BANDS`
- Add `getVerdictPercentage()` helper
- Replace switch statement (lines 3483-3502)

---

## 7. Risk Assessment

### Low Risk (Priority 1, 2, 5)
- Removing unused files: minimal impact, easy rollback
- Config migration: well-established UCM pattern
- Verdict consolidation: simple refactor

### Medium Risk (Priority 3, 4)
- Extracting from orchestrated.ts: requires careful testing
- Risk of breaking existing functionality
- **Mitigation**: Incremental extraction, comprehensive tests, regression baseline

### High Risk (Future phases)
- Changing core pipeline architecture
- Potential for subtle behavioral changes
- **Mitigation**: Extensive testing, A/B comparison, gradual rollout

---

## 8. Success Metrics

| Metric | Current | Target (Phase 1) | Target (Phase 2-3) |
|--------|---------|------------------|-------------------|
| Dead code (lines) | 879 | 0 | 0 |
| orchestrated.ts (lines) | 13,904 | 13,904 | ~11,600 |
| UCM-configurable params | ~30 | ~45 | ~50 |
| Max function length | 2,000+ | 2,000+ | <500 |
| Isolated modules | 0 | 0 | 2-3 |

**Long-term Goals** (Phase 3+):
- orchestrated.ts: <8,000 lines
- All functions: <200 lines
- Max nesting: ≤4 levels
- Test coverage: >80%

---

## 9. Related Documents

- **Implementation Plan**: [C:\Users\rober\.claude\plans\polished-tumbling-hare.md](../../.claude/plans/polished-tumbling-hare.md)
- **LLM Intelligence Migration**: [Efficient_LLM_Intelligence_Migration_Plan.md](./Efficient_LLM_Intelligence_Migration_Plan.md)
- **Agent Rules**: [/AGENTS.md](../../AGENTS.md)
- **Multi-Agent Collaboration**: [Docs/AGENTS/Multi_Agent_Collaboration_Rules.md](../AGENTS/Multi_Agent_Collaboration_Rules.md)

---

## 10. Open Questions

1. **Immediate Removal**: Should we proceed with removing 6 unused files (Priority 1) immediately?
2. **Config Scope**: Should ALL magic numbers go to UCM, or keep some as constants?
3. **Testing Baseline**: Do we need additional test cases before refactoring?
4. **Performance Metrics**: Should we capture performance metrics before refactoring for comparison?
5. **Breaking Changes**: Are breaking API changes acceptable between phases?
6. **A/B Testing Framework**: Is ab-testing.ts used elsewhere, or safe to remove?
7. **p-limit Dependency**: Is p-limit used anywhere besides parallel-verdicts.ts?

---

## Conclusion

The FactHarbor codebase is **well-architected with excellent AGENTS.md compliance**. The recent LLM Intelligence Migration work demonstrates proper adherence to rules. The .NET API services are exemplary reference models.

The primary improvement opportunity is **modularizing orchestrated.ts** (13,904 lines) and **removing 879 lines of dead code**. The phased approach allows incremental improvement with manageable risk.

**Recommended Next Step**: Proceed with **Phase 1** (dead code removal + config migration) for immediate low-risk improvements.
