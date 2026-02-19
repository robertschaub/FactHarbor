# Current Status — Historical Changelog Archive

**Archived**: 2026-02-19 (documentation cleanup)
**Source**: Extracted from `Docs/STATUS/Current_Status.md` — changelog entries from v2.10.2 and earlier (prior to 2026-02-13).
**Why archived**: These entries document completed work and historical implementation details. The active current-state sections remain in `Current_Status.md`. For the full version history, see `Docs/STATUS/HISTORY.md`.

---

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
- [Prompt_Optimization_Code_Review.md](../REVIEWS/Prompt_Optimization_Code_Review.md)
- [Prompt_Optimization_Architecture_Review.md](../REVIEWS/Prompt_Optimization_Architecture_Review.md)

See: [Prompt Optimization Summary](../Prompt_Optimization_Investigation.md)

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
- UCM Enhancement Recommendations - Sprint completion documented
- Unified Config Management User Guide - New Section 7 added

**🎯 Next Step:** Proceed to Phase 0 Validation with complete operational toolkit.

---

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

---

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

See: [Implementation Review](../REVIEWS/Unified_Configuration_Management_Implementation_Review.md)

---

### v2.8.0 LLM Text Analysis Pipeline (January 29-30, 2026)
- **LLM Text Analysis Pipeline**: Approved for implementation after senior architect review
  - 4 analysis points: Input Classification, Evidence Quality, Context Similarity, Verdict Validation
  - ITextAnalysisService interface with HeuristicTextAnalysisService, LLMTextAnalysisService, HybridTextAnalysisService
  - Per-analysis-point feature flags for gradual rollout
  - Multi-pipeline support (Orchestrated, Dynamic) — Canonical was later removed in v2.10.x
  - Cost estimate: $0.007-0.028/job (~5.3% increase with Haiku)
- **Search Provider Documentation**: Clarified that all pipelines require search credentials
  - Added Section 8 to Pipeline Architecture doc
  - Added troubleshooting for "No sources fetched" issue

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
