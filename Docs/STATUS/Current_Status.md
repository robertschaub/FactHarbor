# FactHarbor Current Status

**Version**: Pre-release (targeting v1.0)
**Last Updated**: 2026-02-13
**Status**: POC Complete — Alpha Transition (UCM Integration + Prompt Externalization v2.8.2 + LLM Tiering Enabled + Phase 2a Refactoring + Report Quality Hardening + Cost Optimization)

---

## Quick Status

### ✅ What Works

**Core Analysis Pipeline:**
- **Pipeline Variants**:
  - Orchestrated Pipeline (default, production quality)
  - Monolithic Dynamic (experimental, flexible output)
  - ~~Monolithic Canonical~~ (removed in v2.10.x)
- Multi-context detection and analysis
- **Heuristic Context Pre-Detection**: Code-level pattern detection for comparison, legal, and environmental claims
- **Context Overlap Detection**: LLM-driven merge heuristics with defensive validation (v2.6.38)
- **UI Reliability Signals**: Multi-context verdict reliability indicators (v2.6.38)
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

**API Cost Optimization (2026-02-13):**
- ✅ **Budget defaults reduced**: `maxIterationsPerContext` 5→3, `maxTotalIterations` 20→10, `maxTotalTokens` 750K→500K
- ✅ **Context detection tightened**: `contextDetectionMaxContexts` 5→3, `contextDedupThreshold` 0.85→0.70
- ✅ **Expensive tests excluded from `npm test`**: 4 LLM integration tests now require explicit `test:expensive` script
- ✅ **Cost reduction strategy documented**: Batch API, prompt caching, NPO/OSS programs researched
- See: [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md)

**Report Quality Hardening (2026-02-13):**
- ✅ **Zero-Source Warning Coverage**: Added `no_successful_sources` and `source_acquisition_collapse` for source-acquisition failures
- ✅ **Direction Semantics Prompt Hardening**: Added qualifier-preservation and semantic-interpretation guardrails in orchestrated prompts
- ✅ **Direction Validation Tier Update**: Direction validation now routes through verdict-tier model selection

**Phase 2 Quality Improvements (v2.6.41):**
- **Evidence Quality Filtering**: Two-layer enforcement (prompts + deterministic filter) for probative value
  - See: [Evidence Quality Filtering Architecture](../ARCHITECTURE/Evidence_Quality_Filtering.md)
- **probativeValue Field**: Quality assessment (high/medium/low) with admin-configurable weights
- **SourceType Classification**: 9 source types with reliability calibration factors
- **Schema Backward Compatibility**: Optional fields + deprecated aliases for smooth migration
  - See: [Schema Migration Strategy](../xwiki-pages/FactHarbor/Product Development/Specification/Implementation/Schema%20Migration%20Strategy/WebHome.xwiki)
- **Provider-Specific Prompts**: Optimized formatting for Anthropic, OpenAI, Google, Mistral
  - See: [Provider Prompt Formatting](../xwiki-pages/FactHarbor/Product Development/Specification/Reference/Prompt%20Engineering/Provider-Specific%20Formatting/WebHome.xwiki)

**LLM Text Analysis Pipeline (v2.9+):**
- **Four Analysis Points**: Input Classification, Evidence Quality, Context Similarity, Verdict Validation
- **LLM-Only Contract**: All analysis points are always LLM-driven (no hybrid/heuristic fallback)
- **Multi-Pipeline Support**: Works across Orchestrated and Monolithic Dynamic pipelines
- **Telemetry**: Built-in metrics for success rates, latency
- **Bug Fix (v2.8.1)**: Counter-claim detection removed from verdict prompt (was overriding better understand-phase detection)
- **Prompt Files**: Located in `apps/web/prompts/text-analysis/` with README documentation
- See: [LLM Text Analysis Pipeline Deep Analysis](../ARCHIVE/REVIEWS/LLM_Text_Analysis_Pipeline_Deep_Analysis.md)

**Shared Module Architecture:**
- `scopes.ts`: Context detection (`detectScopes()`, `formatDetectedScopesHint()`)
- `aggregation.ts`: Verdict weighting (`validateContestation()`, `detectClaimContestation()`, `detectHarmPotential()`)
- `claim-decomposition.ts`: Claim parsing utilities
- Consistent behavior across orchestrated and dynamic pipelines

**Code Quality & Refactoring (Phase 2a Complete - 2026-02-12):**
- ✅ **Evidence Processor Module Extraction**: 3 new modules created (705 lines)
  - `evidence-normalization.ts`: ID migration, classification validation
  - `evidence-recency.ts`: Temporal analysis, date extraction, staleness scoring
  - `evidence-context-utils.ts`: Context metadata utilities
- ✅ **orchestrated.ts Reduction**: 13,905 → 13,412 lines (493 lines removed)
- ✅ **Benefits**: Improved testability, reduced complexity, focused modules
- See: [QA Review & Code Quality Plan](../../.claude/plans/polished-tumbling-hare.md)

**Phase 1 QA Cleanup (2026-02-12):**
- ✅ **Normalization Removal**: All heuristic normalization code deleted (~500 lines)
  - `normalizeYesNoQuestionToStatement()` removed from pipeline
  - Test file deleted (330 lines, 22 tests)
  - Config parameters removed (143 lines)
  - LLM-first input handling (question/statement equivalence)
- ✅ **Defensive Clamping Replacement**: `clampTruthPercentage` → `assertValidTruthPercentage`
  - Replaced silent bug masking with fail-fast validation
  - 10 call sites updated with context strings for better diagnostics
  - Two duplicate implementations removed
- ✅ **Canonical Pipeline Removal**: Monolithic Canonical variant removed (~2,281 lines)
  - Twin-Path architecture (Orchestrated + Monolithic Dynamic)
  - Graceful backward compatibility for historical job records
  - Documentation updated across codebase

**Infrastructure:**
- Job lifecycle management (QUEUED → RUNNING → SUCCEEDED/FAILED)
- Real-time progress updates via Server-Sent Events (SSE)
- PDF and HTML content extraction
- Multi-provider LLM support (Anthropic, OpenAI, Google, Mistral)
- Multi-provider search support (Google CSE, SerpAPI, Gemini Grounded)
- SQLite database for local development
- Automated retry with exponential backoff
- **Unified Configuration Management** (v2.9.0 ✅ Complete): Database-backed config system for prompt/search/calculation/pipeline/sr/lexicons, validation, history, rollback, import/export. Analysis settings (including LLM provider selection) now load from UCM with hot-reload. **All phases complete** - job config snapshots + SR modularity interface + admin UI with snapshot tools.

**Metrics & Testing (BUILT BUT NOT INTEGRATED)**:
- ⚠️ **Metrics Collection System**: Built but not connected to analyzer.ts
- ⚠️ **Observability Dashboard**: Built at `/admin/metrics` but no data collection yet
- ⚠️ **Baseline Test Suite**: Ready (30 diverse test cases) but not executed (requires $20-50)
- ⚠️ **A/B Testing Framework**: Built but not executed (requires $100-200)
- ⚠️ **Schema Retry Logic**: Implemented in separate module, not integrated
- ⚠️ **Parallel Verdict Generation**: Built (50-80% speed improvement) but not integrated
- ✅ **Tiered LLM Routing**: Enabled (Haiku 4.5 for extract/understand, Sonnet 4.5 for verdict/context refinement)

**Promptfoo Testing Infrastructure (v2.8.2 - OPERATIONAL)**:
- ✅ **38 Total Test Cases** across 3 configurations
- ✅ **Source Reliability Tests**: 7 test cases (score caps, ratings, evidence citation)
- ✅ **Verdict Generation Tests**: 5 test cases (rating direction, accuracy bands)
- ✅ **Text Analysis Pipeline Tests**: 26 test cases covering all 4 analysis points
  - Input Classification (8 tests): Comparative, compound, claim types, decomposition
  - Evidence Quality (5 tests): Quality levels, expert attribution, filtering
  - Context Similarity (5 tests): Duplicate detection, phase buckets, merge logic
  - Verdict Validation (8 tests): Inversion, harm potential, contestation
- See: [Promptfoo Testing Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki)

**UI/UX:**
- Analysis submission interface
- Job history and status tracking
- Report display (Summary, JSON, Report tabs)
- Two-panel summary format
- Multi-context result display
- Admin metrics dashboard (NEW)

### ⚠️ Known Issues

**CRITICAL**:
1. ~~**Prompt Optimizations Never Validated**~~: ✅ **RESOLVED** (v2.10.2) - Lead Dev code review complete, format-only principle verified, backward compatibility confirmed.
2. **Metrics Infrastructure Not Integrated**: Built but not connected to analyzer.ts. No observability.

**HIGH**:
3. **Source Acquisition Recovery Branch**: Phase 1 warning coverage is complete, but Phase 4 stall-recovery behavior is still pending
4. **Input Neutrality Context Variance**: Question vs statement can yield different context counts in some cases
5. **Model Knowledge Toggle**: `pipeline.allowModelKnowledge=false` not fully respected in Understanding phase

**MEDIUM**:
6. **Budget Constraints**: Reduced from v2.8.2 highs for cost optimization (3 iter/context, 10 total, 500K tokens). May need tuning per UCM if quality is insufficient for complex analyses
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

1. ~~**Validate Prompt Optimizations**~~ ✅ **COMPLETED (v2.10.2)**
   - ✅ Format-only principle verified for Anthropic variant
   - ✅ Generic examples policy enforced
   - ✅ Lead Dev code review passed
   - ✅ Backward compatibility confirmed
   - **Status**: Complete - See [Prompt Optimization Summary](../ARCHIVE/Prompt_Optimization_Investigation.md)

2. **Integrate Metrics Collection**
   - ⏸️ Add metrics hooks to analyzer.ts (15-30 minute task)
   - ⏸️ Verify dashboard shows data
   - **Status**: Integration helpers provided, needs implementation
   - **See**: `apps/web/src/lib/analyzer/metrics-integration.ts`

### Short-Term (PERFORMANCE & QUALITY)

3. **Deploy Performance Optimizations**
   - ⏸️ Enable parallel verdict generation (50-80% faster)
   - ⏸️ Extend regression coverage for source-acquisition and direction-semantics hardening paths
   - **Status**: Code ready, needs integration into analyzer.ts

4. **Fix Quality Regression Issues**
   - ⏸️ Review and adjust budget constraints
   - ⏸️ Validate input neutrality with more test cases
   - ⏸️ Investigate remaining high-variance context-splitting cases
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

- [ ] **Inverse-input symmetry hardening**: Keep `scripts/inverse-scope-regression.ps1` green; add 2-3 more inverse pairs and explicitly define which pairs require *strict* context symmetry vs *best-effort* symmetry (to avoid overfitting to a single example).
- [ ] **Evidence-driven context refinement guardrails**: Add lightweight metrics/logging so we can tell how often context refinement is applied vs rejected, and why (avoid over-splitting into “dimensions” that are not bounded contexts).
- [ ] **Central-claim evidence coverage**: When a central claim has zero supporting/counter facts, do a bounded “missing-evidence” retrieval pass per claim (best-effort; must respect search limits and avoid infinite loops).
- [ ] **Context guidelines**: Document (in a short developer note) what qualifies as a distinct “Context” vs a “dimension” so future prompt tweaks remain consistent with `AGENTS.md`.
- [ ] **Analyzer modularization (defer unless needed)**: `apps/web/src/lib/analyzer.ts` is still monolithic; any split should be planned and done incrementally to minimize risk.

---

## Architecture Status

### Component Health

| Component | Status | Notes |
|-----------|--------|-------|
| **Next.js Web App** | ✅ Operational | Pipeline variants operational |
| **.NET API** | ✅ Operational | SQLite for local, PostgreSQL for production |
| **Job Orchestration** | ✅ Working | SSE events, exponential backoff retry |
| **Pipeline Variants** | ✅ Operational | Orchestrated (default) + Monolithic Dynamic (Twin-Path) |
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

**Unit Tests** (`npm test` — safe, no API calls):
- Analyzer core functions (partial)
- Quality gates (partial)
- Truth scale calculations (partial)
- Job lifecycle (basic)
- 46 test files, all mocked (no real LLM calls)

**Expensive Integration Tests** (explicit scripts only, $1-5+ per run):
- `npm run test:llm` — Multi-provider LLM integration
- `npm run test:neutrality` — Input neutrality (full analysis x2 per pair)
- `npm run test:contexts` — Context preservation (full analysis)
- `npm run test:adversarial` — Adversarial context leak (full analysis)
- `npm run test:expensive` — All 4 expensive tests combined

**Missing Tests:**
- API controller tests
- Database layer tests
- Frontend component tests
- E2E automated tests

---

## Environment Configuration

### Required Variables

```bash
# LLM Provider API keys (provider selected in UCM pipeline config)
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...
# MISTRAL_API_KEY=...

# Search Provider keys (provider selected in UCM search config)
SERPAPI_API_KEY=...
# Or: GOOGLE_CSE_API_KEY=... and GOOGLE_CSE_ID=...
# NOTE: Without search credentials, all pipelines run without web sources

# Internal Keys (must match between web and API)
FH_ADMIN_KEY=your-secure-admin-key
FH_INTERNAL_RUNNER_KEY=your-secure-runner-key

# API Configuration (apps/api/appsettings.Development.json)
# Admin:Key = FH_ADMIN_KEY
# Runner:RunnerKey = FH_INTERNAL_RUNNER_KEY
```

### Optional Variables

```bash
# Job execution controls
FH_RUNNER_MAX_CONCURRENCY=3  # Max parallel analysis jobs
```

---

## Recent Changes

### 2026-02-13 Prompt Externalization to UCM (v2.8.2)
**Status: ✅ Complete**

All runtime LLM prompts now load from UCM-managed `.prompt.md` files, compliant with AGENTS.md String Usage Boundary ("All text that goes into LLM prompts must be managed in UCM, not hardcoded inline in code").

**Changes:**
- Monolithic-dynamic system prompts externalized from `buildPrompt()` to `loadAndRenderSection()` (branch: `feat/monolithic-dynamic-prompt-externalization`)
- Orchestrated search relevance mode instructions moved from inline code to prompt file sections (commit ef2def6)
- 4 provider-specific structured output sections added to `monolithic-dynamic.prompt.md`
- Bug fix: changed `## JSON OUTPUT REQUIREMENTS` sub-headings to `###` (level-2 headers were being parsed as separate sections)
- TypeScript prompt modules under `apps/web/src/lib/analyzer/prompts/` retained for `prompt-testing.ts` harness only
- 27 new CI-safe tests validating prompt file structure and content
- Documentation updated: `Docs/ARCHITECTURE/Prompt_Architecture.md`, xWiki Prompt Architecture, Pipeline Variants

**Impact:**
- Both orchestrated and monolithic-dynamic pipelines now load all prompts from UCM
- Prompts are admin-configurable via Admin UI without code changes
- `buildPrompt()` and related TS modules are no longer called from any production pipeline

### 2026-02-13 Report Quality Hardening (Phase 1 + Phase 2)
**Status: ✅ Implemented**

**Completed:**
- Added explicit zero-source warnings for source acquisition collapse patterns:
  - `no_successful_sources`
  - `source_acquisition_collapse` (when searches are high and successful sources remain zero)
- Added prompt hardening for qualifier preservation and direction-semantic interpretation:
  - `UNDERSTAND` and `SUPPLEMENTAL_CLAIMS`: preserve thesis-critical qualifiers
  - `VERDICT_DIRECTION_VALIDATION_BATCH_USER`: semantic interpretation rules + abstract examples
- Updated direction-validation model routing to verdict-tier selection for stronger entailment handling.

### v2.10.2 Prompt Optimization v2.8.0-2.8.1 Complete (February 4, 2026)
**Status: ✅ APPROVED** - All phases complete, Lead Dev review passed

**Goal**: Make prompts leaner and more precise without losing effectiveness (~30% token reduction).

**✅ Key Achievements:**

1. **Format-Only Provider Variants**
   - Anthropic variant reduced by ~52% (220 → 84 lines)
   - Removed concept re-explanations, kept only formatting guidance
   - Rating direction guidance retained (explicitly exempted)

2. **Generic Examples Policy**
   - All domain-specific examples replaced with abstract placeholders
   - Uses "Institution A/B", "Technology A/B", "Region X" patterns
   - No test-case terms in prompts

3. **Terminology Clarity**
   - AnalysisContext vs EvidenceScope clearly distinguished
   - Backward compatibility maintained

4. **Multi-Phase Implementation**
   - Phase 1: Low-risk token reduction (15-20%)
   - Phase 2: Validated changes (+5-10%)
   - Phase 3: Provider variant pilot (~10-15%)

**📝 Files Modified:**
- `apps/web/src/lib/analyzer/prompts/base/*.ts` - Base prompts
- `apps/web/src/lib/analyzer/prompts/providers/*.ts` - Provider variants
- Documentation updated

**🗂️ Archived Review Documents:**
- [Prompt_Optimization_Code_Review.md](../ARCHIVE/REVIEWS/Prompt_Optimization_Code_Review.md)
- [Prompt_Optimization_Architecture_Review.md](../ARCHIVE/REVIEWS/Prompt_Optimization_Architecture_Review.md)

See: [Prompt Optimization Summary](../ARCHIVE/Prompt_Optimization_Investigation.md)

---

### v2.10.0 UCM Pre-Validation Sprint Complete (January 31, 2026)
**Status: ✅ 100% Complete** - All 6 Low-Hanging Fruits implemented

**Goal**: Ship professional UX and operational tools BEFORE validation period to enable better debugging and system understanding.

**✅ New Admin Features:**

1. **Toast Notifications** (Day 1.1)
   - Replaced all 22 `alert()` calls with professional `react-hot-toast` notifications
   - Non-blocking, auto-dismiss, color-coded by type (success/error/info)
   - Files: `layout.tsx`, `admin/config/page.tsx`, `admin/source-reliability/page.tsx`

2. **Export All Configs** (Day 1.2)
   - New API: `GET /api/admin/config/export-all`
   - Complete backup of all active configurations as JSON
   - UI button on admin dashboard with loading state
   - Timestamped filename: `factharbor-config-backup-YYYY-MM-DD.json`

3. **Active Config Dashboard** (Day 2)
   - New API: `GET /api/admin/config/active-summary`
   - Visual overview on `/admin/config` showing all active configs
   - Color-coded cards by config type with version labels and timestamps
   - Immediate system state visibility

4. **Config Diff View** (Day 3-4)
   - New API: `GET /api/admin/config/diff?hash1=&hash2=`
   - Checkbox selection in history tab to compare any 2 versions
   - JSON configs: Field-by-field diff with color-coded changes
   - Prompts: Side-by-side text comparison
   - Helps understand impact of config changes

5. **Default Value Indicators** (Day 5.1)
   - New API: `GET /api/admin/config/default-comparison?type=&profile=`
   - Shows which fields are customized vs using defaults
   - Green banner = defaults, Yellow banner = customized (with count/percentage)
   - Expandable list of customized field paths

6. **Config Search by Hash** (Day 5.2)
   - New API: `GET /api/admin/config/search-hash?q=`
   - Search input at top of config page
   - Find configs by full or partial hash (min 4 chars)
   - Click-to-navigate to any found version
   - Essential for debugging job reports

**✅ Technical Details:**
- 5 new API endpoints (all read-only GET)
- TypeScript compilation clean
- No changes to core analysis/report logic
- All changes isolated to admin UI

**📝 Documentation Updated:**
- [UCM Enhancement Recommendations](../RECOMMENDATIONS/UCM_Enhancement_Recommendations.md) - Sprint completion documented
- [Unified Config Management User Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/Unified%20Config%20Management/WebHome.xwiki) - New Section 7 added

**🎯 Next Step:** Proceed to Phase 0 Validation with complete operational toolkit.

See: [UCM Enhancement Recommendations](../RECOMMENDATIONS/UCM_Enhancement_Recommendations.md)

### 2026-02-02: UCM Terminology Cleanup + Phase 2 Complete

**Major Implementation:** Unified Config Management terminology and save-to-file functionality

- ✅ File-backed defaults for all 6 config types (pipeline, search, calc, SR, lexicons)
- ✅ Schema versioning with validation and fallback
- ✅ Concurrency warnings with updatedBy tracking (from earlier Alpha work)
- ✅ Bidirectional sync (Save-to-file) with environment gating
- ✅ Drift detection endpoint (GET /api/admin/config/:type/drift)
- ✅ Health check config validation (status: degraded on invalid config)
- ✅ Terminology cleanup (Context vs EvidenceScope) complete throughout codebase
- ✅ Monolithic pipeline timeouts now configurable via UCM
- 🐛 Fixed: Aggregation-lexicon keywords refined (completed in previous work)

**Breaking Changes:**
- `LLM_PROVIDER` env variable deprecated (use UCM `pipeline.llmProvider`)
- `.env.example` updated to remove deprecated vars

**Recent Commits (2026-01-30 to 2026-02-02):**
1. `ucm: make monolithic pipeline timeouts configurable`
2. `ucm: add drift detection and health config validation`
3. `docs: update UCM response plan status`
4. `ucm: implement save-to-file functionality (Phase 2)`
5. `docs: add Phase 2 save-to-file implementation guide`

**Implementation Time:** ~4 days (Terminology + Phase 2)

**Deferred to Beta:**
- Optimistic locking (full solution)
- Detailed diff views in admin UI
- Automatic schema migration
- Audit logging with full history

See: [Knowledge_Transfer_UCM_Terminology.md](../Knowledge_Transfer_UCM_Terminology.md)

### v2.9.0 Unified Configuration Management - Phase 1 In Progress (January 30, 2026)
**Status: ✅ 100% Complete** - All 4 phases complete (settings + snapshots + SR modularity + admin UI)

**✅ What's Complete:**
- **Extended Config Types**: Added Pipeline and Source Reliability (SR) config types to unified config system
  - `pipeline` config: Model selection, LLM tiering, analysis behavior, budget controls
  - `sr` config: Source reliability settings with modularity for future standalone extraction
  - Admin UI forms for both config types with full CRUD support
- **Prompt Import/Export/Reseed APIs**: Complete workflow for prompt management
  - `POST /api/admin/config/prompt/:profile/import` - Upload .prompt.md files with validation
  - `GET /api/admin/config/prompt/:profile/export` - Download prompts with metadata
  - `POST /api/admin/config/prompt/:profile/reseed` - Re-seed from disk for dev workflow
  - Text-analysis profiles now supported: `text-analysis-input`, `text-analysis-evidence`, `text-analysis-context`, `text-analysis-verdict`
- **Comprehensive Test Coverage**: 158 unit tests for config system (A+ grade)
  - `config-schemas.test.ts`: 50 tests for validation, parsing, canonicalization
  - `config-storage.test.ts`: 26 tests for CRUD, caching, env overrides
  - `source-reliability-config.test.ts`: 32 tests for SR scoring and caps
  - `budgets.test.ts`: 22 tests for iteration and token budget tracking
  - `evaluator-logic.test.ts`: 28 tests for source evaluation logic
- **Bug Fixes**:
  - Fixed `SOURCE_TYPE_EXPECTED_CAPS` constant naming (was `SOURCE_TYPE_CAPS`)
  - Fixed `getBudgetConfig()` to respect `DEFAULT_BUDGET.enforceHard` when env var unset
  - Fixed budget test to use explicit values since defaults changed in v2.8.2

**✅ Phase 1: High-Value Settings Migration (Complete)**
- **Updated Analyzer Modules** to accept `PipelineConfig`:
  - `budgets.ts`: `getBudgetConfig()` - budget limits (4 settings)
  - `config.ts`: `getAnalyzerConfigValues()` - analysis behavior (4 settings)
  - `llm.ts`: `getModelForTask()` - model selection (3 settings)
  - `model-tiering.ts`: Updated tiering check (1 setting)
  - `metrics-integration.ts`: `initializeMetrics()` - metrics config (reuses settings)
  - `text-analysis-service.ts`: Feature flag configuration
- **Main Pipeline Integration**: `orchestrated.ts` fully threaded with config hot-reload
  - Calls `getAnalyzerConfig()` to load DB → defaults (UCM is source of truth)
  - Passes `pipelineConfig` through entire call chain (11 functions updated)
  - TypeScript compilation: ✅ No errors
- **Migration Complete for High-Value Settings**: 13 unique settings now hot-reloadable
  - Model: `llmTiering`, `modelUnderstand`, `modelExtractEvidence`, `modelVerdict`
  - LLM Flags: `llmInputClassification`, `llmEvidenceQuality`, `llmContextSimilarity` (legacy: `llmScopeSimilarity`), `llmVerdictValidation`
  - Budgets: `maxIterationsPerContext` (legacy: `maxIterationsPerScope`), `maxTotalIterations`, `maxTotalTokens`, `enforceBudgets`
  - Analysis: `analysisMode`, `deterministic`, `allowModelKnowledge`, `contextDedupThreshold` (legacy: `scopeDedupThreshold`)
- **Code Review & Regression Fixes**:
  - Preserved legacy key aliases for backward compatibility (`scope*` → `context*`)
  - Reverted default value changes to maintain backwards compatibility
  - Fixed missing report model fallback in `llm.ts`
  - Added schema documentation for `maxTokensPerCall` exclusion
- **Migration Pattern**: Functions accept optional config param; env fallbacks removed for analysis settings

**✅ Phase 2: Job Config Snapshots (Complete)**
- **Database Schema**: `job_config_snapshots` table stores full resolved configs per job
  - Migration: `003_add_job_config_snapshots.sql`
  - Stores PipelineConfig and SearchConfig as JSON blobs
  - Stores SR summary fields (maintains modularity per review Rec #22)
  - Indexed by job_id for fast lookups
- **Config Snapshots Module**: `config-snapshots.ts` with capture/retrieval API
  - `captureConfigSnapshot()`: Persist complete config for a job
  - `captureConfigSnapshotAsync()`: Non-blocking background capture
  - `getConfigSnapshot()`: Retrieve snapshot by job_id
  - `formatSnapshotForDisplay()`: Format for admin UI display
- **Analyzer Integration**: Snapshots captured at analysis start
  - Loads both PipelineConfig and SearchConfig
  - Captures SR summary (enabled/score/threshold)
  - Async capture (non-blocking), awaited before return
  - Handles optional jobId gracefully (no-op if undefined)
- **Success Metric Achieved**: ✅ Can view complete config that produced any job

**✅ Phase 3: SR Modularity Interface (Complete)**
- **SR Service Interface**: Clean contract between analyzer and SR system
  - `ISRService` interface with 6 core methods
  - `SRConfigReadOnly` for read-only config access
  - `SREvaluation`, `SRPrefetchResult` types
- **Default Implementation**: `SRServiceImpl` wraps existing SR module
  - Factory function: `createSRService(options?)`
  - Singleton: `getDefaultSRService()`, `setDefaultSRService()`
  - DI support for testing: `resetDefaultSRService()`
- **Analyzer Integration**: Uses SR service for prefetch operations
  - `orchestrated.ts` updated to use `srService.prefetch(urls)`
  - Backwards compatible: `getTrackRecordScore()` still works
  - Clear separation enables future SR extraction
- **Success Metric Achieved**: ✅ SR can be extracted without breaking FactHarbor

**✅ Phase 4: Admin UI Polish (Complete)**
- **Job Config Snapshot Viewer**: `/admin/quality/job/[jobId]`
  - Displays complete resolved config (pipeline + search + SR summary)
  - Shows metadata (captured time, analyzer version, schema version)
  - Markdown export for documentation
  - API: `GET /api/admin/quality/job/[jobId]/config`
- **Config Validation Warnings**: Detects dangerous config combinations
  - 7 pipeline warnings (deep mode budget, tiering, context dedup, etc.)
  - 5 search warnings (disabled search, low limits, timeouts, etc.)
  - 2 cross-config warnings (deep mode with few results, etc.)
  - API: `GET /api/admin/config/warnings`
  - Severity levels: danger/warning/info
- **Admin Page Reorganization**: Separated FactHarbor Quality vs SR sections
  - Clear visual hierarchy for admin tasks
  - Job Audit & Debugging section with snapshot viewer
- **Success Metric Achieved**: ✅ Can view complete config via admin UI + dangerous configs warned

**🟡 Remaining Env Vars (65 reads):**
- **26 refs**: Already migrated settings (env fallbacks for backwards compatibility)
- **11 refs**: SR config now behind interface (extractable)
- **14 refs**: Low-level tuning parameters (timeouts, thresholds) - should remain env vars
- **8 refs**: Debug/AB testing - low priority
- **6 refs**: Legacy monolithic pipelines - low priority

**🎯 All Phase Success Metrics Achieved:**
1. ✅ Settings change without restart (Phase 1)
2. ✅ Can view complete config for any job (Phase 2)
3. ✅ SR extractable without breaking FactHarbor (Phase 3)
4. ✅ Admin UI with snapshot viewer and validation warnings (Phase 4)

**📝 Optional Future Enhancements:**
- Integration test demonstrating end-to-end hot-reload (~1 day)
- Additional admin UI features (config comparison, rollback UI, etc.)

See: [Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md)

### v2.8.0 LLM Text Analysis Pipeline (January 29-30, 2026)
- **LLM Text Analysis Pipeline**: Approved for implementation after senior architect review
  - 4 analysis points: Input Classification, Evidence Quality, Context Similarity, Verdict Validation
  - ITextAnalysisService interface with HeuristicTextAnalysisService, LLMTextAnalysisService, HybridTextAnalysisService
  - Per-analysis-point feature flags for gradual rollout
  - Multi-pipeline support (Orchestrated, Dynamic) — Canonical was later removed in v2.10.x
  - Cost estimate: $0.007-0.028/job (~5.3% increase with Haiku)
  - See: [LLM Text Analysis Pipeline Deep Analysis](../ARCHIVE/REVIEWS/LLM_Text_Analysis_Pipeline_Deep_Analysis.md)
- **Search Provider Documentation**: Clarified that all pipelines require search credentials
  - Added Section 8 to Pipeline Architecture doc
  - Added troubleshooting for "No sources fetched" issue
  - See: [Pipeline Architecture](../xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep%20Dive/Pipeline%20Variants/WebHome.xwiki)

### v2.8.3 LLM-Only Text Analysis (January 30, 2026)
- **Contract Updated**: Text analysis is LLM-only for all 4 analysis points (no heuristic fallback)
- **Prompt-Code Alignment Complete**: All prompts now contain exact patterns from heuristic code
  - `text-analysis-evidence.prompt.md` v1.2.0: Complete vague phrases list
  - `text-analysis-verdict.prompt.md` v1.2.0: Inversion patterns, extended evidence keywords
- **Database Reseeded**: Updated prompts active for analysis

### v2.8.1 Bug Fix & File Reorganization (January 30, 2026)
- **Critical Bug Fix**: Counter-claim detection removed from verdict validation
  - **Issue**: LLM text analysis produced worse results than heuristics alone
  - **Root Cause**: Verdict prompt detected counter-claims with insufficient context, overriding better understand-phase detection
  - **Impact**: False counter-claim detection caused incorrect verdict inversions (85% → 15%)
  - **Fix**: Removed `isCounterClaim` and `polarity` from verdict prompt (v1.0.0 → v1.1.0)
- **Prompt File Reorganization**
  - Moved text-analysis prompts to `prompts/text-analysis/` subfolder
  - Added `getPromptFilePath()` helper to `config-storage.ts`
  - Created `prompts/text-analysis/README.md` documentation
- **Database Reseeded**: All 4 text-analysis prompts reseeded with new file locations

### v2.6.41 (January 27-28, 2026)
- **Unified Configuration Management**: Complete config system with database-backed version control
  - Three-table design: `config_blobs` (immutable versions), `config_active` (activation pointers), `config_usage` (per-job tracking)
  - Configuration types: search, calculation, prompt
  - Admin UI at `/admin/config` with edit, history, effective, and export tabs
  - Schema validation with Zod, version history, one-click rollback
  - Export/import with deep linking from job reports
- **Prompt Unification**: Migrated prompts from file-based system to Unified Config Management
  - Prompts now stored in `config_blobs` with `type='prompt'`
  - Deleted legacy `/admin/prompts` page and `/api/admin/prompts/*` routes
  - Deleted `prompt-storage.ts` and associated database tables
  - Updated analyzers to use `recordConfigUsage()` instead of legacy functions
- **Bug Fixes**:
  - Fixed race condition when switching config types on edit tab
  - Fixed import validation to check JSON structure matches config type

### v2.6.40 (January 26, 2026)
- **Context/EvidenceScope Terminology Fix**: Fixed inline prompts using wrong terminology
  - `assessedStatement` now passed correctly to verdict phase
  - Renamed "SCOPE" to "CONTEXT" in ~10 inline prompt locations

### v2.6.39 (January 26, 2026)
- **Assessed Statement Feature**: Added `assessedStatement` field to AnalysisContext
  - Displays what specific statement is being evaluated in each context card
  - Improves clarity for multi-context analyses

### v2.6.38 (January 26, 2026)
- **Context Overlap Detection Improvements**: Refined LLM-driven context detection
  - **Temporal Guidance Clarification**: Fixed contradiction between "incidental temporal mentions" (don't split) vs "time period as primary subject" (do split)
  - **Context Count Warning**: Added logging when 5+ contexts detected (may indicate over-splitting)
  - **Claim Assignment Validation**: Catches claims assigned to non-existent contexts (orphaned claims unassigned for fallback handling)
  - **UI Reliability Field**: Added `articleVerdictReliability` ("high" | "low") to signal when overall average is meaningful
  - **UI Improvements**: 
    - De-emphasize overall average when reliability is low (60% opacity, "(avg)" label)
    - Explanatory note: "ℹ️ This average may not be meaningful because contexts answer different questions"
    - Emphasize individual context verdicts section (⭐ header, increased font weight)
  - **Documentation**: Updated `Calculations.md` with "When is the Overall Average Meaningful?" section
  - **Architecture Decision**: Simple averaging + transparency approved (see Opus review in agent transcripts)

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

**Cost Estimates** (varies by provider and model, standard API pricing):
- Short analysis: $0.10 - $0.50
- Medium analysis: $0.50 - $1.50
- Long analysis: $1.50 - $5.00
- Budget ceiling: ~$1.50/analysis (500K token cap)
- **With Batch API (50% off)**: Halve all estimates above
- See: [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md)

---

## Compliance Status

### AGENTS.md Rules

**Generic by Design**: ✅ Compliant
- Removed hardcoded domain-specific keywords
- Generic context detection and analysis
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

**Context Detection**: ✅ Compliant
- Multi-context detection working
- Distinct contexts analyzed independently
- Generic context terminology

---

## Getting Help

### Resources

- **Complete Issue List**: `Docs/STATUS/KNOWN_ISSUES.md` - All known bugs with workarounds
- **Development History**: `Docs/STATUS/HISTORY.md` - Full version history and architectural decisions
- **Documentation**: `Docs/` folder (organized by category)
- **Architecture**: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/System%20Design/WebHome.xwiki`
- **Calculations**: `Docs/ARCHITECTURE/Calculations.md`
- **Getting Started**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Getting Started/WebHome.xwiki`
- **LLM Configuration**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Subsystems and Components/LLM Configuration/WebHome.xwiki`
- **Coding Guidelines**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Coding Guidelines/WebHome.xwiki`

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
| Search not working | Verify Web Search config is enabled in UCM (Admin → Config → Web Search) and the search API key is set |
| No sources fetched | Configure `SERPAPI_API_KEY` or `GOOGLE_CSE_API_KEY`+`GOOGLE_CSE_ID`. See [LLM Configuration](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/LLM%20Configuration/WebHome.xwiki) |

---

## What's Next

**Immediate Actions** (User decisions required):
1. **Implement Batch API** — 50% flat discount on all LLM calls (no pipeline logic changes)
2. **Implement prompt caching** — 90% off repeated system prompts (AI SDK code change)
3. **Apply for NPO/OSS credit programs** — Up to $20K Anthropic, $10K/year Google, $1K/year AWS
4. Run baseline test to establish quality metrics ($20-50)
5. Integrate metrics collection into analyzer.ts (15-30 min)
6. Deploy performance optimizations (parallel verdicts + tiered routing)

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
1. **Cost Optimization** (in progress):
   - ✅ Budget defaults reduced (25-40% savings)
   - ✅ Expensive tests excluded from `npm test`
   - Batch API integration (50% discount — next priority)
   - Prompt caching (90% off repeated inputs)
   - NPO/OSS credit applications ($11K+/year potential)
   - See: [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md)

2. **Quick Wins**:
   - Parallel verdict generation (50-80% faster)
   - Quality Gate UI display (transparency)
   - Cost quotas (financial safety) - *LOW urgency for POC*
   - Admin authentication - *LOW urgency for POC*

3. **High-Value Performance**:
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

**Last Updated**: February 13, 2026
**Actual Version**: 2.10.2 (Code) | 2.7.0 (Schema)
**Document Status**: Reflects UCM Integration + Prompt Externalization v2.8.2 + Report Quality Hardening (Phase 1/2) + Cost Optimization
