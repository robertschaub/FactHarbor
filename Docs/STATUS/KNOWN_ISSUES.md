# FactHarbor Known Issues

**Last Updated**: February 5, 2026
**Current Version**: 2.10.2
**Schema Version**: 2.7.0

This document tracks all known bugs, limitations, and technical debt in FactHarbor POC1.

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

### 1. v2.8 Prompt Optimizations Never Validated

**Status**: ❌ UNVALIDATED  
**Discovered**: January 2026  
**Severity**: CRITICAL

**Description**:
Large prompt optimization work (v2.8) was deployed without A/B testing:
- Provider-specific formatting (Claude XML, GPT few-shot, Gemini format, Mistral step-by-step)
- Claims ~40% token reduction for fast-tier models
- 83 tests added but only validate syntax, not actual LLM behavior

**Impact**:
- Unknown whether optimizations actually improve or degrade quality
- May be contributing to quality regression observed Jan 13-19
- No empirical data on token reduction or quality impact

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
- Schema docs: `Docs/REFERENCE/METRICS_SCHEMA.md`

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

**Status**: ⚠️ PARTIALLY RESOLVED  
**Severity**: HIGH

**Description**:
Question vs statement phrasing can still yield different context counts in some cases:
- EV Lifecycle: ✅ PASSED (identical contexts)
- Bolsonaro: ⚠️ HIGH VARIANCE (2 vs 3 contexts)

**Impact**:
- Violates "Question ≈ Statement" requirement
- Different context detection → different analysis depth
- Inconsistent user experience

**Root Cause**:
LLM context detection is probabilistic even with temperature=0. Normalized input doesn't fully eliminate semantic interpretation differences.

**Workaround**:
Use statement format for consistent results.

**Possible Solutions**:
- Strengthen input normalization
- Add deterministic context seeding based on normalized keywords
- Implement context merging heuristics for near-duplicate contexts
- Reduce context detection temperature further

**Status**: Under investigation. See `Docs/INVESTIGATION/Input_Neutrality_Scope_Variance.md` (legacy filename)

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

### 6. Budget Constraints May Be Too Strict

**Status**: ⚠️ MAY CAUSE QUALITY ISSUES  
**Severity**: MEDIUM

**Description**:
Current budget limits may be too restrictive:
- Quick mode: 4 iterations max (was 2, increased in v2.8.2)
- Per-context limit: 3 iterations
- For 2-context analysis: 3 × 2 = 6 iterations max

January regression showed 16 searches → 9 searches when budgets were enforced.

**Impact**:
- May terminate research prematurely
- May miss important evidence
- Lower confidence scores

**Workaround**:
- Use deep mode: set `pipeline.analysisMode=deep` in UCM
- Increase limits: set `pipeline.maxTotalIterations` in UCM
- Disable hard enforcement: set `pipeline.enforceBudgets=false` in UCM

**Solution**:
Run baseline tests with different budget configurations to find optimal balance between cost and quality.

**Files to Review**:
- `apps/web/src/lib/analyzer/budgets.ts`
- `apps/web/src/lib/analyzer/config.ts`

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

**Status**: Planned feature, not implemented in POC1

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

### P2. Tiered LLM Routing Not Enabled

**Status**: ✅ BUILT BUT NOT INTEGRATED  
**Potential Savings**: 50-70% cost reduction

**Description**:
Model tiering system exists (fast-tier models for extraction, premium for reasoning) but is not enabled.

**Solution**:
1. Enable tiering in the pipeline config (UCM)
2. Use `getModelForTask()` to select appropriate model per task:
   - Budget models: Haiku ($0.25/M), Mini ($0.15/M), Flash ($0.075/M)
   - Premium models: Sonnet-4 ($3/M) for verdicts

**Files**:
- Implementation: `apps/web/src/lib/analyzer/model-tiering.ts`
- Integration: `apps/web/src/lib/analyzer.ts`

---

## Summary Statistics

**Total Issues**: 20 (1 resolved in v2.10.2)
- Critical: 2
- High: 4 (1 resolved)
- Medium: 5
- Low: 3
- Security: 3 (LOW for POC, HIGH for production)
- Performance: 2 (ready to deploy)

**Resolved in v2.10.2**:
- ✅ Issue #3: Quality Gate Decisions Not Displayed in UI

**By Category**:
- Quality/Validation: 4 issues (1 resolved)
- Performance/Cost: 5 issues
- Security: 3 issues
- UX/Display: 3 issues (1 resolved)
- Architecture: 2 issues
- Observability: 2 issues

---

## References

- [Development History](HISTORY.md) - Full version history and investigations
- [Current Status](Current_Status.md) - Overall system status
- [Backlog](Backlog.md) - Prioritized task list
- [Improvement Recommendations](Improvement_Recommendations.md) - Detailed enhancement analysis

---

**Document Status**: Consolidated from investigation reports, bug fixes, and code analysis  
**Next Review**: After baseline test execution
