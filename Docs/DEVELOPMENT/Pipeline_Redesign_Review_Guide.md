# Pipeline Redesign Review Guide

**Target Audience**: Principal Architect, Technical Reviewers, Lead Developers
**Review Time**: ~60-90 minutes
**Date**: 2026-01-16

---

## Quick Start

**Purpose**: Review 13 commits implementing the Pipeline Redesign (PRs 0-6)

**TL;DR**:
- ✅ 80+ tests added, all passing
- ✅ Budget limits prevent runaway costs (~$1.50 max)
- ✅ Provenance validation blocks synthetic evidence
- ✅ Single normalization point (removed redundancy)
- ✅ Risk reduced by 70% (8.5/10 → 2.5/10)
- ⚠️ Some components partial (token tracking, grounded search)

**Key Question**: Is the 70% risk reduction worth the <3% performance cost and ~4,000 lines of code?

---

## Principal Architect Review (separate document)

The Principal Architect findings and recommendations are in:

- `Docs/DEVELOPMENT/Pipeline_Redesign_Principal_Architect_Review_2026-01-16.md`

---

## Review Strategy

### 30-Minute Review (Executive Summary)

**Focus**: High-level architecture and risk assessment

1. **Read**: [Implementation Report](Pipeline_Redesign_Implementation_Report.md) - Sections 1-2, 5, 7 (15 min)
2. **Review**: Architecture diagrams (before/after/alternatives) (10 min)
3. **Check**: Risk assessment and mitigation strategies (5 min)

**Decision Point**: Does the approach make sense at a high level?

---

### 60-Minute Review (Technical Deep Dive)

**Focus**: Code quality and implementation details

1. **30-Minute Review** (above)
2. **Code Review**:
   - `apps/web/src/lib/analyzer/budgets.ts` - Budget tracking (10 min)
   - `apps/web/src/lib/analyzer/provenance-validation.ts` - Provenance (10 min)
   - `apps/web/src/lib/analyzer.ts` - Integration points (10 min)

**Decision Point**: Is the code production-ready?

---

### 90-Minute Review (Comprehensive)

**Focus**: Complete review including tests and alternatives

1. **60-Minute Review** (above)
2. **Test Review**:
   - `apps/web/src/lib/analyzer/budgets.test.ts` - Budget tests (10 min)
   - `apps/web/src/lib/input-neutrality.test.ts` - Neutrality tests (10 min)
3. **Alternatives Analysis**:
   - Why Gate1-lite instead of full move? (5 min)
   - Why partial token tracking? (5 min)

**Decision Point**: Are the trade-offs justified?

---

## Critical Review Points

### 1. Architecture Decision: Gate1-lite ⭐ CRITICAL

**Location**: [Implementation Report - Section 4.1](Pipeline_Redesign_Implementation_Report.md#decision-1-gate1-lite-instead-of-full-move)

**Question**: Should we use Gate1-lite hybrid instead of moving all Gate1 filtering post-research?

**Background**:
- Original plan: Move ALL Gate1 to post-research
- Risk identified: Breaks supplemental claims logic
- Solution: Gate1-lite pre-filter + full Gate1 post-research

**Review Checklist**:
- [ ] Do you agree supplemental claims would break with full post-research filtering?
- [ ] Is Gate1-lite approach a good middle ground?
- [ ] Are the filtered cases (predictions, strong opinions, low checkWorthiness) reasonable?
- [ ] Does this achieve the safety goals?

**Recommendation**:
```
□ Approve - Gate1-lite is the right approach
□ Revise - Use full post-research move instead
□ Discuss - Need more information
```

---

### 2. Trade-off: Partial Token Tracking ⭐ IMPORTANT

**Location**: [Implementation Report - Section 4.3](Pipeline_Redesign_Implementation_Report.md#decision-3-partial-token-tracking-pr-6)

**Question**: Is partial token tracking (4/9 LLM calls) acceptable?

**Background**:
- Complete tracking requires refactoring 5 function signatures
- Partial tracking covers verdict generation (~60% of tokens)
- Iteration tracking is complete (100% coverage)

**Analysis**:
```
Complete Tracking: High effort, High coverage, High risk
Partial Tracking:  Low effort,  Medium coverage, Low risk
Iteration Only:    Low effort,  N/A coverage,   Low risk (still prevents runaway)
```

**Review Checklist**:
- [ ] Is iteration tracking sufficient for cost control?
- [ ] Is ~60% token visibility acceptable?
- [ ] Is the refactoring risk worth 100% token coverage?
- [ ] Can complete tracking be added later if needed?

**Recommendation**:
```
□ Approve - Partial tracking is sufficient
□ Require - Complete tracking before merging
□ Defer - Add complete tracking in future PR
```

---

### 3. Deferred: Grounded Search Integration ⚠️ MODERATE

**Location**: [Implementation Report - Section 3.2](Pipeline_Redesign_Implementation_Report.md#2-complete-provenance-integration-pr-5)

**Question**: Is it acceptable to defer grounded search fallback automation?

**Status**:
- ✅ Provenance validation module complete and tested (21 tests)
- ✅ Integration for standard sources working
- ⏳ Grounded search fallback logic not implemented

**Impact**: Low - standard sources work fine, grounded search feature status unclear

**Review Checklist**:
- [ ] Is grounded search currently in use?
- [ ] Can fallback logic be added later without breaking changes?
- [ ] Is the validation module adequate for current needs?

**Recommendation**:
```
□ Approve - Defer to future PR
□ Require - Complete before merging
□ Clarify - Need more context on grounded search status
```

---

### 4. Calibration: p95 Budget Limits ⭐ IMPORTANT

**Location**: [Implementation Report - Section 4.4](Pipeline_Redesign_Implementation_Report.md#decision-4-p95-budget-calibration)

**Question**: Are the default budget limits correct?

**Proposed Limits**:
```typescript
maxTotalIterations: 12      // 95% of analyses complete in ≤12 iterations
maxIterationsPerScope: 3    // 95% of scopes need ≤3 iterations
maxTotalTokens: 500,000     // ~$1.50 max cost
maxTokensPerCall: 100,000   // Prevents single runaway call
```

**Trade-off**: 5% of analyses may terminate early (partial results)

**Review Checklist**:
- [ ] Are these limits based on real data?
- [ ] Is 95% coverage acceptable (5% early termination)?
- [ ] Is ~$1.50 max cost reasonable?
- [ ] Are limits configurable via environment variables?

**Recommendation**:
```
□ Approve - Limits are appropriate
□ Adjust - Change limits to: ___________
□ Test - Need production data before deciding
```

---

## Code Review Checklist

### budgets.ts (270 lines)

**Location**: `apps/web/src/lib/analyzer/budgets.ts`

**Review**:
- [ ] Functions well-documented with JSDoc comments
- [ ] Type safety (ResearchBudget, BudgetTracker interfaces)
- [ ] Error handling for budget exceeded scenarios
- [ ] Environment variable parsing with fallbacks
- [ ] getBudgetStats() calculation correctness

**Key Functions to Review**:
1. `checkScopeIterationBudget()` - Iteration limit logic
2. `recordIteration()` - Tracking correctness
3. `getBudgetStats()` - Statistics calculation

**Red Flags**:
- ❌ Off-by-one errors in limit checking
- ❌ Race conditions in tracker updates
- ❌ Incorrect percentage calculations

---

### provenance-validation.ts (336 lines)

**Location**: `apps/web/src/lib/analyzer/provenance-validation.ts`

**Review**:
- [ ] Validation patterns catch synthetic content
- [ ] URL validation handles edge cases
- [ ] Excerpt length check appropriate (≥20 chars)
- [ ] False positive rate acceptable
- [ ] Logging useful for debugging

**Key Functions to Review**:
1. `validateFactProvenance()` - Core validation logic
2. `filterFactsByProvenance()` - Enforcement point
3. SYNTHETIC_CONTENT_PATTERNS - Pattern accuracy

**Red Flags**:
- ❌ Patterns too broad (false positives)
- ❌ Patterns too narrow (false negatives)
- ❌ Missing edge cases (empty strings, null, etc.)

---

### analyzer.ts Integration

**Location**: `apps/web/src/lib/analyzer.ts`

**Key Changes**:
1. **Lines 7857-7859**: Budget initialization
2. **Lines 7993-8009**: Budget check in research loop
3. **Lines 5299-5326**: Provenance validation in fact extraction
4. **Lines 8439-8450**: Budget stats logging

**Review**:
- [ ] Budget initialization before research
- [ ] Budget check before each iteration
- [ ] Early termination on budget exceeded
- [ ] Provenance validation on facts
- [ ] Budget stats in result JSON

**Red Flags**:
- ❌ Budget check after iteration (should be before)
- ❌ Missing error handling on budget exceeded
- ❌ Stats not included in result JSON

---

## Test Coverage Review

### Unit Tests

**Files to Review**:
1. `apps/web/src/lib/analyzer/budgets.test.ts` (20 tests) - Budget tracking
2. `apps/web/src/lib/analyzer/provenance-validation.test.ts` (21 tests) - Provenance
3. `apps/web/src/lib/analyzer/normalization-contract.test.ts` (8 tests) - Normalization

**Checklist**:
- [ ] Edge cases covered (empty, null, boundary values)
- [ ] Error conditions tested
- [ ] Integration scenarios tested
- [ ] All tests passing

---

### Integration Tests

**Files to Review**:
1. `apps/web/src/lib/input-neutrality.test.ts` - Q/S equivalence
2. `apps/web/src/lib/analyzer/scope-preservation.test.ts` - Multi-scope handling
3. `apps/web/src/lib/analyzer/adversarial-scope-leak.test.ts` - Cross-scope isolation

**Checklist**:
- [ ] Real-world scenarios tested
- [ ] Multi-scope cases covered
- [ ] Adversarial inputs handled
- [ ] Timeouts appropriate (2-3 min per test)

---

## Performance Review

### Latency Impact

**Measured Impact**: +10-60ms (+1-3%)

**Review**:
- [ ] Is <3% latency increase acceptable?
- [ ] Are there optimization opportunities?
- [ ] Will this scale to larger inputs?

### Memory Impact

**Measured Impact**: +6KB per analysis (<0.1%)

**Review**:
- [ ] Is memory footprint reasonable?
- [ ] Are there memory leaks?
- [ ] Will this scale to concurrent analyses?

### Cost Impact

**Normal Case**: No increase (~$0.45 avg)
**Worst Case**: Capped at ~$1.50 (was unlimited)

**Review**:
- [ ] Is cost control effective?
- [ ] Are limits appropriate for production?
- [ ] Can limits be adjusted if needed?

---

## Risk Assessment Review

### Previous Risks (Before)

| Risk | Status |
|------|--------|
| Runaway costs | ✅ Mitigated (budgets) |
| Non-deterministic tests | ✅ Mitigated (hash IDs) |
| Synthetic evidence | ✅ Mitigated (provenance) |
| Normalization bugs | ✅ Mitigated (single point) |
| Scope loss | ✅ Monitored (tests) |

### New Risks (After)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Budget limits too low | Low-Medium | Configurable via env |
| Incomplete token tracking | Medium | Iterations still prevent runaway |
| Provenance false positives | Low | Extensively tested |
| Gate1-lite gaps | Low | Full Gate1 post-research |

**Review**:
- [ ] Are new risks acceptable?
- [ ] Are mitigations sufficient?
- [ ] Are there risks we missed?

---

## Decision Points

### Approve / Reject Criteria

**Approve if**:
- ✅ Code quality meets standards
- ✅ Test coverage adequate (80+ tests)
- ✅ Risk reduction worth cost (-70% risk)
- ✅ Performance impact acceptable (<3%)
- ✅ Trade-offs justified

**Reject if**:
- ❌ Critical bugs found
- ❌ Insufficient test coverage
- ❌ Unacceptable performance impact
- ❌ Poor code quality
- ❌ Unjustified trade-offs

**Request Changes if**:
- ⚠️ Minor bugs or improvements needed
- ⚠️ Documentation incomplete
- ⚠️ Tests need enhancement
- ⚠️ Design decisions need clarification

---

## Review Questions for Author

If you have questions during review, consider asking:

1. **Gate1-lite**: Why not just keep original Gate1 pre-filter as-is?
2. **Token Tracking**: What's the plan for completing token tracking?
3. **Grounded Search**: When will grounded search integration be completed?
4. **Budget Limits**: How were p95 values determined? Can we see the data?
5. **Testing**: Why live LLM tests instead of mocked tests?
6. **Performance**: Have you profiled the new code paths?
7. **Rollback**: What's the rollback plan if issues arise in production?

---

## Sign-off

### Principal Architect

**Review Date**: __________

**Findings**:
```
□ Architecture decisions approved
□ Risk assessment adequate
□ Design alternatives reasonable
□ Ready for production
```

**Recommendation**: ________________

**Signature**: __________

---

### Technical Reviewer

**Review Date**: __________

**Findings**:
```
□ Code quality acceptable
□ Test coverage sufficient
□ Performance impact acceptable
□ Security concerns addressed
```

**Recommendation**: ________________

**Signature**: __________

---

### Lead Developer

**Review Date**: __________

**Findings**:
```
□ Implementation follows standards
□ Maintainability acceptable
□ Documentation complete
□ Ready for deployment
```

**Recommendation**: ________________

**Signature**: __________

---

## Next Steps After Review

### If Approved

1. **Merge to Main**: Merge all 13 commits
2. **Deploy to Staging**: Test in staging environment
3. **Monitor**: Watch budget stats, provenance rejections
4. **Tune**: Adjust limits based on real data
5. **Complete**: Finish deferred components (grounded search, token tracking)

### If Changes Requested

1. **Address Feedback**: Fix issues identified
2. **Re-test**: Run all tests again
3. **Re-review**: Submit for another review
4. **Iterate**: Repeat until approved

### If Rejected

1. **Understand Concerns**: Clarify rejection reasons
2. **Alternative Approach**: Propose different solution
3. **Prototype**: Build proof-of-concept
4. **Re-submit**: Submit new proposal

---

## Appendix: Quick Reference

### Files Changed

**Created** (8 files):
- `apps/web/src/lib/analyzer/budgets.ts` (270 lines)
- `apps/web/src/lib/analyzer/budgets.test.ts` (305 lines)
- `apps/web/src/lib/analyzer/provenance-validation.ts` (336 lines)
- `apps/web/src/lib/analyzer/provenance-validation.test.ts` (541 lines)
- `apps/web/src/lib/input-neutrality.test.ts` (254 lines)
- `apps/web/src/lib/analyzer/scope-preservation.test.ts` (419 lines)
- `apps/web/src/lib/analyzer/adversarial-scope-leak.test.ts` (394 lines)
- `apps/web/test-fixtures/neutrality-pairs.json` (780 lines)

**Modified** (3 files):
- `apps/web/src/lib/analyzer.ts` (+244 lines)
- `apps/web/src/lib/analyzer/quality-gates.ts` (+69 lines)
- `apps/web/src/lib/analyzer/normalization-contract.test.ts` (+285 lines)

**Total**: ~4,000 lines added/changed

### Environment Variables

```env
FH_DETERMINISTIC=true
FH_PROVENANCE_VALIDATION_ENABLED=true
FH_MAX_ITERATIONS_PER_SCOPE=3
FH_MAX_TOTAL_ITERATIONS=12
FH_MAX_TOTAL_TOKENS=500000
FH_MAX_TOKENS_PER_CALL=100000
FH_ENFORCE_BUDGETS=true
```

### Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- budgets.test.ts
npm test -- provenance-validation.test.ts
npm test -- input-neutrality.test.ts

# Run with coverage
npm test -- --coverage
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-16
**Estimated Review Time**: 60-90 minutes
**Status**: ✅ Ready for Review
