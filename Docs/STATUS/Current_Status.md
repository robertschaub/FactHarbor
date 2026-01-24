# FactHarbor Current Status

**Version**: 2.6.37 (Code) | 2.7.0 (Schema Output)  
**Last Updated**: 2026-01-24  
**Status**: POC1 Operational

---

## Quick Status

### ✅ What Works

**Core Analysis Pipeline:**
- **Triple-Path Architecture**:
  - Orchestrated Pipeline (default, highest quality)
  - Monolithic Canonical (faster, lower cost)
  - Monolithic Dynamic (experimental, flexible output)
- Multi-scope detection and analysis
- **Heuristic Scope Pre-Detection**: Code-level pattern detection for comparison, legal, and environmental claims
- Input neutrality (question ≈ statement within ±5%)
- Claim extraction with dependency tracking
- Temporal reasoning with current date awareness
- Web search integration (Google CSE, SerpAPI)
- Evidence extraction from multiple sources
- 7-point verdict scale (TRUE to FALSE)
- MIXED vs UNVERIFIED distinction (confidence-based)
- Pseudoscience detection and escalation
- KeyFactors discovery and aggregation
- **Doubted vs Contested Distinction**: Proper handling of evidence-based vs opinion-based contestation
- Quality Gates (Gate 1: Claim Validation, Gate 4: Verdict Confidence)
- LLM Tiering for cost optimization
- Provenance validation (Ground Realism enforcement)
- **Harm Potential Detection**: Shared heuristic for death/injury/fraud claims

**Shared Module Architecture:**
- `scopes.ts`: Scope detection (`detectScopes()`, `formatDetectedScopesHint()`)
- `aggregation.ts`: Verdict weighting (`validateContestation()`, `detectClaimContestation()`, `detectHarmPotential()`)
- `claim-decomposition.ts`: Claim parsing utilities
- Consistent behavior across canonical and orchestrated pipelines

**Infrastructure:**
- Job lifecycle management (QUEUED → RUNNING → SUCCEEDED/FAILED)
- Real-time progress updates via Server-Sent Events (SSE)
- PDF and HTML content extraction
- Multi-provider LLM support (Anthropic, OpenAI, Google, Mistral)
- Multi-provider search support (Google CSE, SerpAPI, Gemini Grounded)
- SQLite database for local development
- Automated retry with exponential backoff

**Metrics & Testing (BUILT BUT NOT INTEGRATED)**:
- ⚠️ **Metrics Collection System**: Built but not connected to analyzer.ts
- ⚠️ **Observability Dashboard**: Built at `/admin/metrics` but no data collection yet
- ⚠️ **Baseline Test Suite**: Ready (30 diverse test cases) but not executed (requires $20-50)
- ⚠️ **A/B Testing Framework**: Built but not executed (requires $100-200)
- ⚠️ **Schema Retry Logic**: Implemented in separate module, not integrated
- ⚠️ **Parallel Verdict Generation**: Built (50-80% speed improvement) but not integrated
- ⚠️ **Tiered LLM Routing**: Built (50-70% cost reduction) but not integrated

**UI/UX:**
- Analysis submission interface
- Job history and status tracking
- Report display (Summary, JSON, Report tabs)
- Two-panel summary format
- Multi-scope result display
- Admin metrics dashboard (NEW)

### ⚠️ Known Issues

**CRITICAL**:
1. **Prompt Optimizations Never Validated**: Large optimization work deployed without A/B testing. Unknown quality impact.
2. **Metrics Infrastructure Not Integrated**: Built but not connected to analyzer.ts. No observability.

**HIGH**:
3. **Quality Gate Display**: Gate stats exist in JSON but not shown in UI with per-item reasons
4. **Input Neutrality Scope Variance**: Question vs statement can yield different scope counts in some cases
5. **Model Knowledge Toggle**: `FH_ALLOW_MODEL_KNOWLEDGE=false` not fully respected in Understanding phase

**MEDIUM**:
6. **Budget Constraints**: May be too strict, could limit research quality
7. **No Claim Caching**: Recomputes every analysis, wastes API calls on duplicates
8. **No Normalized Data Model**: All data stored as JSON blobs, no relational queries
9. **Error Pattern Tracking**: No systematic tracking of error types/frequencies

**SECURITY** (LOW for POC, HIGH before public deployment):
10. **SSRF Protection**: URL fetching needs IP blocking, size limits, redirect caps
11. **Admin Endpoint Security**: `/admin/test-config` publicly accessible
12. **Rate Limiting**: No per-IP or per-user rate limits

**See**: [Complete issue list with workarounds](KNOWN_ISSUES.md)

---

## Current Priorities

### Immediate (USER ACTION REQUIRED)

1. **Validate Prompt Optimizations**
   - ⏸️ Run baseline test suite (30 cases, $20-50)
   - ⏸️ Run A/B test comparing old vs optimized prompts ($100-200)
   - ⏸️ Measure actual token reduction and quality impact
   - **Status**: Infrastructure ready, awaiting budget approval

2. **Integrate Metrics Collection**
   - ⏸️ Add metrics hooks to analyzer.ts (15-30 minute task)
   - ⏸️ Verify dashboard shows data
   - **Status**: Integration helpers provided, needs implementation
   - **See**: `apps/web/src/lib/analyzer/metrics-integration.ts`

### Short-Term (PERFORMANCE & QUALITY)

3. **Deploy Performance Optimizations**
   - ⏸️ Enable parallel verdict generation (50-80% faster)
   - ⏸️ Enable tiered LLM routing (50-70% cost savings)
   - **Status**: Code ready, needs integration into analyzer.ts

4. **Fix Quality Regression Issues**
   - ⏸️ Review and adjust budget constraints
   - ⏸️ Validate input neutrality with more test cases
   - ⏸️ Display quality gate decisions in UI
   - **Status**: Root causes identified, fixes planned

### Medium-Term (BEFORE PUBLIC DEPLOYMENT)

5. **Security Hardening**
   - SSRF protections (IP blocking, size limits)
   - Admin endpoint authentication
   - Rate limiting implementation
   - **Priority**: LOW for local POC, HIGH before public release

6. **UI Enhancements**
   - Display Quality Gate decisions with reasons
   - Show metrics dashboard with real data
   - Improve error messaging

### Open Topics / Task List (Jan 2026)

- [ ] **Inverse-input symmetry hardening**: Keep `scripts/inverse-scope-regression.ps1` green; add 2-3 more inverse pairs and explicitly define which pairs require *strict* scope symmetry vs *best-effort* symmetry (to avoid overfitting to a single example).
- [ ] **Evidence-driven scope refinement guardrails**: Add lightweight metrics/logging so we can tell how often scope refinement is applied vs rejected, and why (avoid over-splitting into “dimensions” that are not bounded scopes).
- [ ] **Central-claim evidence coverage**: When a central claim has zero supporting/counter facts, do a bounded “missing-evidence” retrieval pass per claim (best-effort; must respect search limits and avoid infinite loops).
- [ ] **Scope guidelines**: Document (in a short developer note) what qualifies as a distinct “Scope” vs a “dimension” so future prompt tweaks remain consistent with `AGENTS.md`.
- [ ] **Analyzer modularization (defer unless needed)**: `apps/web/src/lib/analyzer.ts` is still monolithic; any split should be planned and done incrementally to minimize risk.

---

## Architecture Status

### Component Health

| Component | Status | Notes |
|-----------|--------|-------|
| **Next.js Web App** | ✅ Operational | Triple-Path Pipeline complete |
| **.NET API** | ✅ Operational | SQLite for local, PostgreSQL for production |
| **Job Orchestration** | ✅ Working | SSE events, exponential backoff retry |
| **Triple-Path Pipeline** | ✅ Complete | Orchestrated, Monolithic Canonical, Monolithic Dynamic |
| **LLM Integration** | ✅ Multi-provider | Anthropic (recommended), OpenAI, Google, Mistral |
| **LLM Tiering** | ✅ Implemented | Per-task model selection for cost optimization |
| **Search Integration** | ✅ Multi-provider | Google CSE, SerpAPI, Gemini Grounded |
| **Provenance Validation** | ✅ Implemented | All paths validate URL provenance |
| **PDF/HTML Extraction** | ✅ Working | Timeout handling, redirect following |
| **Quality Gates** | ⚠️ Partial | Applied, but not displayed in UI |
| **Source Reliability** | ✅ Implemented | LLM evaluation with cache, multi-model consensus, evidence weighting |
| **Claim Caching** | ❌ Not implemented | Recomputes per job |
| **Normalized Data Model** | ❌ Not implemented | Job blobs only, no claim/evidence tables |
| **AuthN/AuthZ** | ❌ Not implemented | Open endpoints (except internal runner) |
| **Rate Limiting** | ❌ Not implemented | No quota enforcement |

### Data Model

**Implemented:**
- Analysis result with claims, verdicts, sources, facts
- Article verdict with aggregation
- Claim verdicts with dependency tracking
- KeyFactors with claim mapping
- Quality gate statistics

**Missing:**
- Normalized database tables (claims, evidence, sources, verdicts)
- Quality metrics persistence
- Error pattern tracking
- Historical source track record

---

## Test Status

### Recent Test Results

**Input Neutrality (v2.6.23)**:
- Bolsonaro trial: 1% divergence ✅ (down from 4%)
- Question: 72% truth, Statement: 76% truth
- Within acceptable LLM variance (<5%)

**Rating Direction (v2.6.24)**:
- Fixed: Verdicts now rate original claim (not analysis conclusion)
- Pending: Re-test with hydrogen/electricity comparative claim

**Centrality (v2.6.24)**:
- Fixed: Methodology validation claims excluded
- Expected: ≤2 central claims per analysis
- Pending: Validate with diverse topics

### Test Coverage

**Unit Tests:**
- Analyzer core functions (partial)
- Quality gates (partial)
- Truth scale calculations (partial)
- Job lifecycle (basic)

**Integration Tests:**
- Complete analysis flow (manual)
- LLM provider switching (manual)
- Search provider switching (manual)

**Missing Tests:**
- API controller tests
- Database layer tests
- Frontend component tests
- E2E automated tests

---

## Environment Configuration

### Required Variables

```bash
# LLM Provider (choose one)
LLM_PROVIDER=anthropic  # anthropic | openai | google | mistral
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...
# MISTRAL_API_KEY=...

# Search Provider
FH_SEARCH_ENABLED=true
FH_SEARCH_PROVIDER=auto  # auto | serpapi | google-cse
SERPAPI_API_KEY=...
# Or: GOOGLE_CSE_API_KEY=... and GOOGLE_CSE_ID=...

# Internal Keys (must match between web and API)
FH_ADMIN_KEY=your-secure-admin-key
FH_INTERNAL_RUNNER_KEY=your-secure-runner-key

# API Configuration (apps/api/appsettings.Development.json)
# Admin:Key = FH_ADMIN_KEY
# Runner:RunnerKey = FH_INTERNAL_RUNNER_KEY
```

### Optional Variables

```bash
# Analysis Configuration
FH_DETERMINISTIC=true  # Use temperature=0 for reproducibility
FH_ALLOW_MODEL_KNOWLEDGE=false  # Require evidence-based analysis only
FH_RUNNER_MAX_CONCURRENCY=3  # Max parallel analysis jobs

# Optional Features
FH_SEARCH_MODE=standard  # standard | grounded (Gemini only)
FH_SEARCH_DATE_RESTRICT=  # y (year) | m (month) | w (week)
FH_SEARCH_DOMAIN_WHITELIST=  # Comma-separated trusted domains
```

---

## Recent Changes

### v2.6.37 (January 24, 2026)
- **Entity-Level Source Evaluation**: Prioritize organization reputation (e.g., SRF, BBC) over domain-only metrics
  - **Entity-Level Evaluation**: New rule to evaluate the WHOLE ORGANIZATION if the domain is its primary outlet
  - **Consensus Confidence Boost**: +15% confidence when independent models (Claude + GPT-5 mini) agree
  - **Fallback Logic**: Always return a result (more confident model) even if consensus fails
  - **Adaptive Evidence Pack**: Added entity-focused queries and better abbreviation detection
  - **UI Updates**: Display `identifiedEntity` name and fallback reasons in Admin UI

### v2.6.36 (January 24, 2026)
- **Source Reliability Evaluation Hardening**: Major improvements for propaganda/misinformation scoring
  - **SOURCE TYPE SCORE CAPS**: Deterministic enforcement (`propaganda_outlet` → ≤14%, `state_controlled_media` → ≤42%)
  - **Adaptive Evidence Queries**: Negative-signal queries (`propaganda`, `disinformation`) added when results sparse
  - **Brand Variant Matching**: Handles `anti-spiegel` ↔ `antispiegel`, suffix stripping (`foxnews` → `fox news`)
  - **Asymmetric Confidence Gating**: High scores require higher confidence (skeptical default)
  - **Unified Thresholds**: Admin + pipeline + evaluator share same defaults (0.8 confidence)
  - **AGENTS.md Compliance**: Abstract examples only (no real domain names in prompts)
- **New Shared Config**: `apps/web/src/lib/source-reliability-config.ts` centralizes SR settings
- **46+ new tests** for scoring calibration, brand variants, and caps enforcement

### v2.6.35 (January 24, 2026)
- **Source Reliability Prompt Improvements**: Comprehensive LLM prompt enhancements
  - Quantified thresholds for insufficient data, confidence scoring, and negative evidence caps
  - Mechanistic confidence formula (base 0.40 + additive factors)
  - Evidence quality hierarchy and recency weighting
  - Expected: ~25% improvement in insufficient data detection, 50% reduction in confidence variance
- **Schema Cleanup**: Removed unused `dimensionScores` field (YAGNI - never integrated)
- **Documentation**: New `Source_Reliability_Prompt_Improvements.md`, updated main SR docs to v1.1

### v2.6.34 (January 2026)
- **Source Reliability Service Implemented**: Full LLM-powered source evaluation with multi-model consensus
  - Batch prefetch + sync lookup pattern for pipeline integration
  - SQLite cache with 90-day TTL
  - Evidence weighting affects verdict calculations
  - Admin interface for cache management
  - 90 tests covering all functionality (42 unit + 16 cache + 13 integration + 19 API logic)
- Documentation updates: Merged proposal into main docs, archived historical documents

### v2.6.33 (January 2026)
- Fixed counter-claim detection - thesis-aligned claims no longer flagged as counter
- Auto-detect foreign response claims as tangential for legal proceeding theses
- Contested claims WITH factual counter-evidence get reduced weight in aggregation

### v2.6.32 (January 2026)
- **Multi-context verdict fallback fixed**: Recovery from NoObjectGeneratedError
- Debug log path resolution fixed
- Terminology consistency: ArticleFrame, AnalysisContext, EvidenceScope

### v2.6.30-31 (January 2026)
- Complete input neutrality implementation
- Removed detectedInputType override
- Modularized debug and config modules

**See**: [Complete version history with technical details](HISTORY.md)

---

## Performance Characteristics

**Typical Analysis Time:**
- Short text (1-2 claims): 30-60 seconds
- Medium article (5-10 claims): 2-5 minutes
- Long article (20+ claims): 5-15 minutes

**LLM API Calls:**
- Understanding: 1 call
- Research: 2-6 calls (per source, typically 4-8 sources)
- Verdict: 1-3 calls (depending on claim count)
- **Total**: Typically 10-20 calls per analysis

**Search Queries:**
- Typically 3-6 queries per analysis
- Fetches 4-8 sources total
- Parallel source fetching with 5-second timeout per source

**Cost Estimates** (varies by provider and model):
- Short analysis: $0.10 - $0.50
- Medium analysis: $0.50 - $2.00
- Long analysis: $2.00 - $10.00

---

## Compliance Status

### AGENTS.md Rules

**Generic by Design**: ✅ Compliant
- Removed hardcoded domain-specific keywords
- Generic scope detection and analysis
- Parameterized prompts

**Input Neutrality**: ✅ Compliant
- Question-to-statement normalization at entry
- <5% verdict divergence between formats
- Original format preserved for display only

**Pipeline Integrity**: ✅ Compliant
- All stages execute (Understand → Research → Verdict)
- Quality gates applied consistently
- No stage skipping

**Evidence Transparency**: ✅ Compliant
- All verdicts cite supporting facts
- Counter-evidence tracked and counted
- Source excerpts included

**Scope Detection**: ✅ Compliant
- Multi-scope detection working
- Distinct scopes analyzed independently
- Generic scope terminology

---

## Getting Help

### Resources

- **Complete Issue List**: `Docs/STATUS/KNOWN_ISSUES.md` - All known bugs with workarounds
- **Development History**: `Docs/STATUS/HISTORY.md` - Full version history and architectural decisions
- **Documentation**: `Docs/` folder (organized by category)
- **Architecture**: `Docs/ARCHITECTURE/Overview.md`
- **Calculations**: `Docs/ARCHITECTURE/Calculations.md`
- **Getting Started**: `Docs/USER_GUIDES/Getting_Started.md`
- **LLM Configuration**: `Docs/USER_GUIDES/LLM_Configuration.md`
- **Coding Guidelines**: `Docs/DEVELOPMENT/Coding_Guidelines.md`

### Debugging

**Check Logs:**
- `apps/web/debug-analyzer.log` - Detailed analysis logs
- API console output - Job lifecycle events
- Browser DevTools - Frontend errors

**Test Configuration:**
- http://localhost:3000/admin/test-config - Validate API keys
- http://localhost:5000/swagger - Test API endpoints directly

### Common Issues

| Issue | Solution |
|-------|----------|
| Job stuck in QUEUED | Check `FH_INTERNAL_RUNNER_KEY` matches `Runner:RunnerKey` |
| Job fails immediately | Check LLM API key is valid |
| No progress updates | Check `FH_ADMIN_KEY` matches `Admin:Key` |
| API not starting | DB is auto-created on startup; check API console for DB errors, and (local dev) delete `apps/api/factharbor.db` to recreate |
| Search not working | Verify `FH_SEARCH_ENABLED=true` and search API key |

---

## What's Next

**Immediate Actions** (User decisions required):
1. Run baseline test to establish quality metrics ($20-50)
2. Integrate metrics collection into analyzer.ts (15-30 min)
3. Deploy performance optimizations (parallel verdicts + tiered routing)

**See**: 
- [Known Issues](KNOWN_ISSUES.md) for complete bug list
- [Development History](HISTORY.md) for architectural decisions
- [Backlog](Backlog.md) for prioritized task list
- [Improvement Recommendations](Improvement_Recommendations.md) for detailed enhancement analysis

**Comprehensive Improvement Analysis**: `Docs/STATUS/Improvement_Recommendations.md` includes:
- Cost optimization (70-85% potential savings)
- Performance improvements (50-80% speed gains)
- Security hardening (SSRF, auth, rate limiting) - *LOW urgency for POC*
- User experience enhancements
- Technical debt reduction

**Priority Order:**
1. **Quick Wins** (6-9 days):
   - Parallel verdict generation (50-80% faster)
   - Quality Gate UI display (transparency)
   - Cost quotas (financial safety) - *LOW urgency for POC*
   - Admin authentication - *LOW urgency for POC*

2. **High-Value Performance** (7-13 days):
   - Tiered LLM routing (50-70% cost savings)
   - Claim-level caching (30-50% savings on repeats)
   - Observability dashboard

3. **Security Hardening** (before production):
   - SSRF protections
   - Rate limiting
   - Admin endpoint security
   - *Note: LOW urgency while local POC, HIGH urgency before public deployment*

4. **Feature Enhancements** (ongoing):
   - Analysis templates
   - Interactive refinement
   - Comparative analysis mode

---

**Last Updated**: January 24, 2026  
**Actual Version**: 2.6.35 (Code) | 2.7.0 (Schema)  
**Document Status**: Corrected to reflect actual implementation state
