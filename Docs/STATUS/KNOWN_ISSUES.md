# FactHarbor Known Issues

**Last Updated**: February 17, 2026
**Current Version**: 2.11.0
**Schema Version**: 3.0.0-cb

This document tracks all known bugs, limitations, and technical debt in FactHarbor (ClaimAssessmentBoundary Pipeline v1.0).

---

## Table of Contents

- [Critical Issues](#critical-issues)
- [High Priority](#high-priority)
- [Medium Priority](#medium-priority)
- [Low Priority](#low-priority)
- [Security Concerns](#security-concerns)
- [Performance Opportunities](#performance-opportunities)

---

## Critical Issues

### 1. Historical: v2.8 Prompt Optimizations Never Validated

**Status**: ✅ RESOLVED (v2.10.2 review)  
**Discovered**: January 2026  
**Severity**: Resolved / Historical

**Description**:
Large prompt optimization work (v2.8) was originally deployed without A/B testing:
- Provider-specific formatting (Claude XML, GPT few-shot, Gemini format, Mistral step-by-step)
- Claims ~40% token reduction for fast-tier models
- 83 tests added but only validate syntax, not actual LLM behavior

**Impact**:
- Historical risk was documented and tracked.
- Lead-dev review in v2.10.2 confirmed format-only/provider-variant safety and backward compatibility.
- Empirical A/B benchmarking remains optional follow-up work (not a blocking defect).

**Workaround**:
None. Optimizations are in production code.

**Solution**:
1. Run baseline test suite (30 cases, $20-50)
2. Run A/B test comparing old vs optimized prompts ($100-200)
3. Measure actual token usage, quality metrics, cost savings
4. Keep what works, revert what doesn't

**Files Affected**:
- `apps/web/src/lib/analyzer/prompts/*`
- All v2.8 prompt optimization code

---

### 2. Metrics Infrastructure Not Integrated

**Status**: ⚠️ BUILT BUT NOT CONNECTED  
**Discovered**: January 2026  
**Severity**: HIGH

**Description**:
Complete metrics collection system exists but is not integrated into analyzer.ts:
- `MetricsCollector` class ready (400 lines)
- Dashboard built (`/admin/metrics`)
- Database schema created
- Integration helpers provided

**Impact**:
- No observability into analysis quality, performance, or costs
- Cannot track trends or detect regressions
- Cannot validate optimizations empirically

**Workaround**:
Manual analysis review, no systematic tracking.

**Solution**:
Add integration hooks to analyzer.ts (estimated 15-30 minutes):

```typescript
// At top of analyzer.ts
import {
  initializeMetrics,
  startPhase,
  endPhase,
  recordGate1Stats,
  recordGate4Stats,
  finalizeMetrics,
} from './analyzer/metrics-integration';

// At start of runAnalysis()
initializeMetrics(jobId, 'orchestrated');

// Around major phases
startPhase('understand');
// ... work ...
endPhase('understand');

// Record gate stats
recordGate1Stats({ totalClaims, passedClaims, filteredReasons });
recordGate4Stats(claimVerdicts);

// In finally block
await finalizeMetrics();
```

**Files to Modify**:
- `apps/web/src/lib/analyzer.ts`

**References**:
- Integration guide: `apps/web/src/lib/analyzer/metrics-integration.ts`
- Schema docs: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Data Models and Schemas/Metrics Schema/WebHome.xwiki`

---

## High Priority

### 3. Quality Gate Decisions Not Displayed in UI

**Status**: ✅ RESOLVED (February 5, 2026)
**Severity**: HIGH (UX)

**Description**:
Quality gates are applied (Gate 1 and Gate 4) and stats are tracked in result JSON, but per-item gate decisions with reasons are not shown in UI or reports.

**Resolution**:
Implemented `QualityGatesPanel` component (v2.10.2) that displays:
- Overall pass/fail status with visual indicators
- Summary stats: evidence items, sources, searches, counter-search status
- Gate 4 confidence distribution (HIGH/MEDIUM/LOW/INSUFFICIENT) with progress bars
- Gate 1 claim validation stats (passed/filtered/central kept)
- Collapsible panel for detailed view

**Files Created**:
- `apps/web/src/components/QualityGatesPanel.tsx`
- `apps/web/src/components/QualityGatesPanel.module.css`

**Files Modified**:
- `apps/web/src/app/jobs/[id]/page.tsx` (integration)

---

### 4. Input Neutrality Context Variance

**Status**: ✅ SUPERSEDED by ClaimAssessmentBoundary pipeline
**Severity**: RESOLVED (Historical)

**Description**:
Question vs statement phrasing could yield different context counts in the old Orchestrated pipeline.

**Resolution**:
The ClaimAssessmentBoundary pipeline eliminates pre-detection of AnalysisContexts entirely. Boundaries emerge from evidence clustering (Stage 3), which is input-phrasing agnostic. Input neutrality for CB pipeline needs validation via Phase 5h neutrality tests (deferred).

**Status**: Superseded. CB neutrality tests planned for Phase 5h.

---

### 5. Model Knowledge Toggle Not Fully Enforced

**Status**: ⚠️ PARTIAL IMPLEMENTATION  
**Severity**: MEDIUM-HIGH

**Description**:
`pipeline.allowModelKnowledge=false` is not fully respected in Understanding phase. LLM may still use internal knowledge instead of requiring evidence.

**Impact**:
- Cannot guarantee evidence-only analysis
- May generate verdicts without proper citation
- Reduces transparency

**Workaround**:
Manual review of verdicts to ensure evidence citation.

**Solution**:
- Strengthen prompts in Understanding phase to require evidence
- Add validation to reject verdicts without evidence citations
- Test thoroughly with various topics

**Files to Modify**:
- `apps/web/src/lib/analyzer.ts` (Understanding phase prompts)
- Verdict validation logic

---

## Medium Priority

### 6. Budget Constraints May Need Tuning for CB Pipeline

**Status**: ⚠️ NEEDS VALIDATION
**Severity**: MEDIUM

**Description**:
The ClaimAssessmentBoundary pipeline has its own budget parameters (UCM-configurable):
- `maxTotalIterations` (default via UCM)
- `contradictionReservedIterations` (default 2)
- `claimSufficiencyThreshold` (default 3 evidence items per claim)

These defaults have not been validated with real-world usage yet.

**Impact**:
- May terminate research prematurely or over-research
- Budget parameters may need tuning after initial production runs

**Workaround**:
Adjust via UCM Admin UI (pipeline config section).

**Solution**:
Run performance benchmarks (Phase 5h) and tune based on results.

**Files to Review**:
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (research loop)
- `apps/web/src/lib/config-schemas.ts` (UCM defaults)

---

### 6b. Skipped Budget Tests (V-09)

**Status**: ⚠️ 8 TESTS SKIPPED
**Severity**: LOW

**Description**:
8 tests in `budgets.test.ts` are skipped because they test deleted functions (`checkContextIterationBudget`, `recordIteration`) from the removed Orchestrated pipeline.

**Impact**:
- No functional impact (tested functions no longer exist)
- Minor test hygiene issue

**Solution**:
Delete or update the 8 skipped tests in Phase 5i cleanup.

**Files**:
- `apps/web/test/unit/lib/analyzer/budgets.test.ts`

---

### 7. No Claim Caching

**Status**: ❌ NOT IMPLEMENTED (documented)  
**Severity**: MEDIUM (Performance/Cost)

**Description**:
Every analysis recomputes all claim verdicts from scratch. No caching of normalized claim verdicts for reuse across analyses.

**Impact**:
- Wasted API calls on duplicate claims
- Higher cost per analysis
- Slower analysis time

**Potential Savings**: 30-50% on analyses with repeat claims

**Solution**:
Implement claim-level caching architecture (extensively documented in `Docs/ARCHITECTURE/Claim_Caching_*.md` but not implemented).

**Status**: Planned feature, not yet implemented

---

### 8. No Normalized Database Schema

**Status**: ❌ NOT IMPLEMENTED  
**Severity**: MEDIUM (Architecture)

**Description**:
All analysis data stored as JSON blobs in Jobs table. No relational tables for claims, evidence, sources, or verdicts.

**Impact**:
- Cannot query claims across analyses
- Cannot track source reliability over time
- Cannot build claim networks or evidence graphs
- No historical analysis

**Solution**:
Create normalized schema with tables for:
- Claims (with claim_text, normalized_text)
- Evidence/Facts
- Sources (with historical track record)
- Verdicts
- Relationships (claim_dependencies, claim_evidence)

**Status**: Planned architectural improvement

---

### 9. Error Pattern Tracking Missing

**Status**: ❌ NOT IMPLEMENTED  
**Severity**: MEDIUM (Observability)

**Description**:
No systematic tracking of:
- Schema validation failures
- LLM timeout/errors
- Source fetch failures
- Pattern analysis across errors

**Impact**:
- Cannot identify systematic issues
- Cannot prioritize fixes
- No error trend analysis

**Solution**:
Add error pattern tracking to metrics system or separate logging system.

---

## Low Priority

### 10. URL Highlighting Shows URL Not Content

**Status**: ⚠️ MINOR UX ISSUE  
**Severity**: LOW

**Description**:
When URL is submitted, reports highlight the URL string instead of extracted content.

**Impact**:
Minor UX confusion.

**Solution**:
Highlight extracted article text instead of URL string.

---

### 11. LLM Provider Fallback Not Implemented

**Status**: ❌ DOCUMENTED BUT NOT IMPLEMENTED  
**Severity**: LOW (Resilience)

**Description**:
Provider fallback configuration is documented but fallback logic is not implemented. If the primary LLM fails, analysis fails.

**Impact**:
Lower resilience to LLM provider outages.

**Solution**:
Implement automatic fallback to secondary LLM provider via pipeline config (UCM).

---

### 12. Rich Report Mode Not Implemented

**Status**: ❌ DOCUMENTED BUT NOT IMPLEMENTED  
**Severity**: LOW (UX)

**Description**:
`FH_REPORT_STYLE=rich` is documented but rich formatting is not implemented.

**Impact**:
Only standard markdown reports available.

**Solution**:
Implement rich HTML formatting for reports (if desired).

---

## Security Concerns

**Note**: These are LOW priority for local POC, but HIGH priority before public deployment.

### S1. SSRF Protection Missing

**Status**: ❌ NOT IMPLEMENTED  
**Severity**: LOW (POC), HIGH (Production)

**Description**:
URL fetching has no SSRF protections:
- No IP range blocking (internal IPs, localhost)
- No size limits
- No redirect count caps
- Could be exploited to scan internal networks or fetch large files

**Impact** (Production):
- Security vulnerability
- Potential for abuse
- Resource exhaustion

**Solution**:
Implement before public deployment:
- Block private IP ranges
- Limit response size
- Cap redirect count
- Add user-agent restrictions

**Files to Modify**:
- `apps/web/src/lib/retrieval.ts`

---

### S2. Admin Endpoint Security Missing

**Status**: ❌ NOT IMPLEMENTED  
**Severity**: LOW (POC), HIGH (Production)

**Description**:
`/admin/test-config` and other admin endpoints are publicly accessible and can trigger paid LLM API calls.

**Impact** (Production):
- Unauthorized API usage
- Cost abuse
- Configuration exposure

**Solution**:
Implement authentication for admin endpoints before public deployment.

**Files to Modify**:
- Admin page components
- API middleware

---

### S3. Rate Limiting Missing

**Status**: ❌ NOT IMPLEMENTED  
**Severity**: LOW (POC), HIGH (Production)

**Description**:
No per-IP or per-user rate limits on analysis requests or admin endpoints.

**Impact** (Production):
- Cost abuse
- Resource exhaustion
- DDoS vulnerability

**Solution**:
Implement rate limiting middleware before public deployment.

---

## Performance Opportunities

### P1. Parallel Verdict Generation Not Enabled

**Status**: ✅ BUILT BUT NOT INTEGRATED  
**Potential Improvement**: 50-80% faster

**Description**:
Parallel verdict generation code exists but is not integrated into main analyzer pipeline.

**Solution**:
Replace sequential verdict loop with parallel implementation:

```typescript
import { generateClaimVerdictsParallel } from './analyzer/parallel-verdicts';
const verdicts = await generateClaimVerdictsParallel(
  claims, facts, sources, model, { maxConcurrency: 5 }
);
```

**Files**:
- Implementation: `apps/web/src/lib/analyzer/parallel-verdicts.ts`
- Integration point: `apps/web/src/lib/analyzer.ts`

---

### P2. Tiered LLM Routing (Enabled)

**Status**: ✅ ENABLED  
**Potential Savings**: 50-70% cost reduction

**Description**:
Model tiering is active in production paths (Haiku-tier for extract/understand and Sonnet-tier for verdict/context refinement).

**Solution**:
1. Keep model/task mapping under UCM governance.
2. Continue using `getModelForTask()` to select appropriate model per task:
   - Budget models: Haiku ($0.25/M), Mini ($0.15/M), Flash ($0.075/M)
   - Premium models: Sonnet-4 ($3/M) for verdicts

**Files**:
- Implementation: `apps/web/src/lib/analyzer/model-tiering.ts`
- Integration: `apps/web/src/lib/analyzer.ts`

---

## Summary Statistics

**Total Tracked Items**: 21 (historical + active)
- Resolved: 5
- Active: 16
- Critical: 1 (metrics not integrated)
- High: 2 (1 resolved)
- Medium: 6 (1 new: budget tuning, 1 new: skipped tests)
- Low: 3
- Security: 3 (LOW for POC, HIGH for production)
- Performance: 2 (ready to deploy)

**Resolved items**:
- ✅ Issue #1: Prompt optimization validation risk (resolved by review in v2.10.2)
- ✅ Issue #3: Quality Gate Decisions Not Displayed in UI
- ✅ Issue #4: Input Neutrality Context Variance (superseded by CB pipeline)
- ✅ Issue #5: Model Knowledge Toggle (superseded by CB pipeline design)
- ✅ P2: Tiered LLM Routing enabled

**By Category**:
- Quality/Validation: 3 issues (2 resolved/superseded)
- Performance/Cost: 5 issues
- Security: 3 issues
- UX/Display: 2 issues (1 resolved)
- Architecture: 2 issues
- Observability: 2 issues
- Test hygiene: 1 issue (skipped budget tests)

---

## References

- [Development History](HISTORY.md) - Full version history and investigations
- [Current Status](Current_Status.md) - Overall system status
- [Backlog](Backlog.md) - Prioritized task list
- [Improvement Recommendations](Improvement_Recommendations.md) - Detailed enhancement analysis

---

**Document Status**: Consolidated from investigation reports, bug fixes, and code analysis  
**Next Review**: After baseline test execution
