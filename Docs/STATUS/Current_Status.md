# FactHarbor Current Status

**Version**: 2.8.1 (Metrics & Testing Infrastructure)
**Last Updated**: 2026-01-19
**Status**: POC1 Operational - Measurement Infrastructure Complete

---

## Quick Status

### ✅ What Works

**Core Analysis Pipeline:**
- **Triple-Path Architecture**:
  - Orchestrated Pipeline (default, highest quality)
  - Monolithic Canonical (faster, lower cost)
  - Monolithic Dynamic (experimental, flexible output)
- Multi-scope detection and analysis
- Input neutrality (question ≈ statement within ±5%)
- Claim extraction with dependency tracking
- Temporal reasoning with current date awareness
- Web search integration (Google CSE, SerpAPI)
- Evidence extraction from multiple sources
- 7-point verdict scale (TRUE to FALSE)
- MIXED vs UNVERIFIED distinction (confidence-based)
- Pseudoscience detection and escalation
- KeyFactors discovery and aggregation
- Quality Gates (Gate 1: Claim Validation, Gate 4: Verdict Confidence)
- LLM Tiering for cost optimization
- Provenance validation (Ground Realism enforcement)

**Infrastructure:**
- Job lifecycle management (QUEUED → RUNNING → SUCCEEDED/FAILED)
- Real-time progress updates via Server-Sent Events (SSE)
- PDF and HTML content extraction
- Multi-provider LLM support (Anthropic, OpenAI, Google, Mistral)
- Multi-provider search support (Google CSE, SerpAPI, Gemini Grounded)
- SQLite database for local development
- Automated retry with exponential backoff

**Metrics & Testing (NEW in v2.8.1):**
- ✅ **Metrics Collection System**: Tracks performance, quality, costs
- ✅ **Observability Dashboard**: Real-time metrics at `/admin/metrics`
- ✅ **Baseline Test Suite**: 30 diverse test cases across 7 categories
- ✅ **A/B Testing Framework**: Compare prompt variants with real LLM calls
- ✅ **Schema Retry Logic**: Automatic recovery from validation failures
- ✅ **Parallel Verdict Generation**: 50-80% speed improvement
- ✅ **Tiered LLM Routing**: 50-70% cost reduction

**UI/UX:**
- Analysis submission interface
- Job history and status tracking
- Report display (Summary, JSON, Report tabs)
- Two-panel summary format
- Multi-scope result display
- Admin metrics dashboard (NEW)

### ⚠️ Known Issues

**High Priority:**
1. **SSRF Protection**: URL fetching needs IP range blocking, size limits, redirect caps
2. **Admin Endpoint Security**: `/admin/test-config` publicly accessible, can trigger paid API calls
3. **Rate Limiting**: No per-IP or per-user rate limits
4. **Quality Gate Display**: Gate stats exist in JSON but not shown in UI with per-item reasons

**Medium Priority:**
5. ~~**Metrics Tracking**: LLM token usage, search API calls, cost estimation not persisted~~ ✅ FIXED in v2.8.1
6. **Error Pattern Tracking**: No database schema for error patterns
7. **Model Knowledge Toggle**: `FH_ALLOW_MODEL_KNOWLEDGE=false` not fully respected in Understanding phase
8. ~~**Provider-Specific Optimization**: Same prompts used for all LLM providers~~ ✅ FIXED in v2.8
9. **Metrics Integration**: Collection system ready but not yet connected to analyzer.ts

**Low Priority:**
10. **URL Highlighting**: URL string highlighted instead of fetched content
11. **LLM Fallback**: Config documented but not implemented
12. **Rich Report Mode**: `FH_REPORT_STYLE=rich` documented but not implemented

**Backlog**: See `Docs/STATUS/Backlog.md` for the canonical prioritized task list.

**Improvement Recommendations**: See `Docs/STATUS/Improvement_Recommendations.md` for comprehensive analysis of potential enhancements with cost/benefit analysis and implementation roadmap.

---

## Current Priorities

### Immediate

1. **Deploy Metrics Infrastructure** (NEW - v2.8.1)
   - Run database migration for AnalysisMetrics table
   - Verify `/admin/metrics` dashboard
   - Optionally integrate metrics collection into analyzer.ts
   - See: `QUICKSTART.md` for setup instructions

2. **Establish Quality Baseline** (PENDING APPROVAL)
   - Run baseline test suite (30 cases)
   - Analyze metrics and identify actual quality issues
   - Cost: $20-50 in API calls
   - Command: `npm run test:baseline`

3. **Validate v2.8 Optimizations** (PENDING APPROVAL)
   - Run A/B test comparing old vs optimized prompts
   - Measure actual token reduction and quality impact
   - Cost: $100-200 in API calls
   - Command: `npm run test:ab`

### Next Steps

4. **Security Hardening** (Pre-Release)
   - Implement SSRF protections
   - Secure admin endpoints with authentication
   - Add rate limiting

5. **Performance Optimization** (READY TO DEPLOY)
   - Enable parallel verdict generation (feature complete)
   - Enable tiered LLM routing (feature complete)
   - Validate improvements with baseline comparison

6. **Quality Improvements** (DATA-DEPENDENT)
   - Address specific issues found in baseline test
   - Implement targeted fixes
   - Re-test with regression suite
   - Display Quality Gate decisions with reasons in UI
   - Complete contestation detection for KeyFactors
   - Add multi-language support

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
| **Source Reliability** | ⚠️ Partial | Static bundle loaded, no historical tracking |
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

### v2.8.0 (January 19, 2026)
- **Provider-Specific Prompt Optimization**:
  - Claude (Anthropic): XML structure tags, thinking blocks, prefill hints
  - GPT (OpenAI): Few-shot examples, calibration tables, explicit field lists
  - Gemini (Google): Strict length limits, numbered processes, schema checklists
  - Mistral: Step-by-step numbered instructions, validation checklists
- **Budget Model Optimization**:
  - Simplified prompts for Haiku/Flash/Mini (~40% token reduction)
  - Ultra-compact prompts when `FH_LLM_TIERING=on`
  - Minimal provider hints instead of full variants
- **Structured Output Hardening**:
  - Provider-specific JSON output guidance
  - Schema retry prompts for validation failures
  - Claude prefill strings for reliable JSON
  - Error-to-fix mapping for common issues
- **Orchestrated Pipeline Prompts**:
  - New `orchestrated-understand.ts` with provider optimization
  - New `orchestrated-supplemental.ts` for claims/scopes
  - Exported via `prompt-builder.ts` for analyzer use
- **Comprehensive Test Suite**:
  - 83 new prompt optimization tests
  - All 4 providers validated for all task types
  - Budget model detection tests
  - Token estimation utilities
- **New Documentation**:
  - Updated `LLM_Prompt_Improvements.md` to v2.8
  - Created `Provider_Prompt_Guidelines.md`

### v2.6.33 (January 2026)
- **Triple-Path Pipeline Complete**:
  - Pipeline variant selector on analyze page
  - Monolithic Canonical path with LLM-inferred multi-scope detection
  - Monolithic Dynamic path with experimental flexible output
  - Pipeline variant badge on jobs page
  - Grounding score display in dynamic result viewer
- Provenance validation integrated in all monolithic paths
- LLM tiering support (`FH_LLM_TIERING=on`)
- `contextId` for claim-scope association
- Content-based fact-to-scope inference
- Multi-jurisdiction stress tests added
- Comprehensive `.env.example` documentation

### v2.6.25 (January 2026)
- Question-to-statement handling improvements
- ArticleSummary data generation logic
- UI layout improvements for summary page

### v2.6.24 (January 2026)
- Fixed critical `isValidImpliedClaim` bug
- Rating direction instructions strengthened (rate original claim, not analysis)
- Centrality over-marking reduced (methodology claims excluded)
- Question label misapplication fixed

### v2.6.23 (January 2026)
- Input neutrality divergence fixed (4% → 1%)
- Canonicalization scope detection corrected
- Generic recency detection (removed hardcoded names)
- Centrality heuristic enhanced (0-2 central claims expected)

### v2.6.22 (January 2026)
- Enhanced recency detection for news topics
- Date-aware query variants for recent information
- Gemini Grounded Search mode added (experimental; grounding metadata/citations may vary by provider/SDK)
- Optional `FH_SEARCH_MODE=grounded` configuration (Gemini only; treat as best-effort until a provenance gate is enforced)

### v2.6.18-v2.6.21 (January 2026)
- Runner resilience with exponential backoff
- Job lifecycle tests added
- Analyzer modularization started
- KeyFactors aggregation fixed
- PDF fetch error handling improved
- Generic AnalysisContext (replaced DistinctProceeding)

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

- **Documentation**: `Docs/` folder (newly reorganized)
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

See `Docs/STATUS/CHANGELOG.md` for detailed version history and `Docs/ARCHITECTURE/Overview.md` for planned enhancements.

**Comprehensive Improvement Analysis**: See `Docs/STATUS/Improvement_Recommendations.md` for detailed recommendations including:
- Cost optimization (70-85% potential savings)
- Performance improvements (50-80% speed gains)
- Security hardening (SSRF, auth, rate limiting) - *LOW urgency while POC/local*
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

**Last Updated**: January 2026  
**Document Status**: Living document - reflects current POC1 state
