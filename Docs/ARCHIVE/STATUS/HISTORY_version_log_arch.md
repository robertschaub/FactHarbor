# FactHarbor Version History Log (Archived)

**Extracted from**: `Docs/STATUS/HISTORY.md` on 2026-02-08
**Reason**: Detailed version-by-version changelog is historical reference. See `Docs/STATUS/HISTORY.md` for architectural decisions, technical debt, and current issues.

---

## Version History

### v2.10.2 Analysis Quality Review + Pipeline Phase 1 (February 5, 2026)

**Focus**: Quality visibility improvements, prompt clarity, and pipeline efficiency

**Status**: COMPLETE

**Major Changes**:

1. **Analysis Quality Review (Complete)**
   - **P0: Verdict Direction Validation** - `validateVerdictDirections()` with autoCorrect detects and fixes rating inversions
   - **P1: Structured Output Failure Tracking** - `analysisWarnings` array in resultJson captures all degradations
   - **P1: Quality Gates UI** - New `QualityGatesPanel` component displays gate pass/fail, evidence counts, confidence distribution
   - **P2: Incomplete Analysis Flag** - `budget_exceeded` warning type for budget exhaustion visibility
   - **P3: Evidence Filter Degradation** - `evidence_filter_degradation` warning type when LLM->heuristic fallback occurs

2. **Prompt Clarity Improvements**
   - **EvidenceScope Decision Tree** - 3-step explicit criteria replacing vague "0-1 boundary patterns" in `extract-evidence-base.ts`
   - **Centralized Schema Reference** - New `OUTPUT_SCHEMAS.md` with TypeScript interfaces for all LLM phases
   - **Fast-tier Terminology Cleanup** - "Budget mode/model" -> "fast-tier model" throughout codebase

3. **Pipeline Improvement Plan Phase 1 (Complete)**
   - **Gap-Driven Research** - `analyzeEvidenceGaps()` + `continueResearchForGaps()` with bounded iterations
   - **Counter-Evidence Enforcement** - Mandatory counter-evidence search for HIGH centrality claims
   - **Parallel Evidence Extraction** - Bounded concurrency with budget reservation and throttling backoff
   - **URL Deduplication** - `processedUrls` tracking reduces re-fetch rate to <5%
   - **Enhanced Recency Detection** - `TemporalContext` schema with LLM hybrid approach
   - **Research Metrics Output** - Coverage metrics and gap reporting in `researchMetrics`

4. **Code Review Fixes**
   - Raised `CLAIM_EVIDENCE_SIMILARITY_THRESHOLD` from 0.3 to 0.4
   - Raised `TEMPORAL_CONTEXT_CONFIDENCE_THRESHOLD` from 0.5 to 0.6
   - Added `parallelExtractionLimit` to PipelineConfig (1-10, default: 3)
   - Added `llmCallCount` to telemetry for accurate budget tracking
   - Added comprehensive gap research budget documentation

5. **Phase 2 Quick Win: Configurable Thresholds (P2)**
   - Made `evidenceSimilarityThreshold` configurable (0.2-0.8, default: 0.4)
   - Made `temporalConfidenceThreshold` configurable (0.3-0.9, default: 0.6)
   - Added gap research config to UCM: `gapResearchEnabled`, `gapResearchMaxIterations`, `gapResearchMaxQueries`
   - Updated `pipeline.default.json` with all new fields for DB seeding
   - Wired configurable values into orchestrated.ts (replaces hardcoded constants)

6. **QualityGatesPanel Refinements**
   - Moved shared types (`QualityGates`, `Gate1Stats`, `Gate4Stats`) to `types.ts`
   - Added CSS semantic variables (`.panel` scoped: `--color-success`, `--color-warning`, etc.)
   - Replaced inline `color` prop with `level` CSS classes for confidence bars
   - Added type re-export for backwards compatibility

**Files Created**:
- `apps/web/src/components/QualityGatesPanel.tsx`
- `apps/web/src/components/QualityGatesPanel.module.css`
- `apps/web/src/lib/analyzer/prompts/OUTPUT_SCHEMAS.md`

**Files Modified**:
- `apps/web/src/app/jobs/[id]/page.tsx` (QualityGatesPanel integration)
- `apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts` (EvidenceScope decision tree)
- `apps/web/src/lib/analyzer/prompts/config-adaptations/tiering.ts` (terminology)
- `apps/web/src/lib/analyzer/prompts/prompt-builder.ts` (terminology)
- `apps/web/src/lib/analyzer/orchestrated.ts` (pipeline improvements + threshold wiring)
- `apps/web/src/lib/analyzer/types.ts` (QualityGates shared types)
- `apps/web/src/lib/config-schemas.ts` (new threshold + gap research fields)
- `apps/web/configs/pipeline.default.json` (UCM default with new fields)
- Multiple Docs/* files (terminology sweep)

**Docs Updated**:
- Analysis Quality Review plan archived
- Pipeline_Improvement_Plan.md Phase 1 marked complete
- Pipeline_Phase2_Plan.md P2 configurable thresholds marked complete

---

### v2.10.1 UCM Integration + Terminology Cleanup (February 2, 2026)

**Focus**: Finalizing UCM integration, file-backed defaults, and terminology correctness

**Status**: COMPLETE

**Major Changes**:

1. **UCM Analyzer Integration (Phase 1)**
   - Pipeline/search/calculation configs now loaded from UCM for all pipelines
   - LLM provider selection moved into pipeline config (`pipeline.llmProvider`)
   - Health/test-config endpoints now reference UCM provider
   - `LLM_PROVIDER` environment variable deprecated

2. **Save-to-File Functionality (Phase 2)**
   - Bidirectional sync: DB configs can be saved back to default JSON files
   - Development mode only (`NODE_ENV=development` or `FH_ALLOW_CONFIG_FILE_WRITE=true`)
   - Atomic writes with `.bak` backups and `.tmp` -> rename pattern
   - Preview functionality before committing changes

3. **Drift Detection & Health Validation**
   - New endpoint: `GET /api/admin/config/:type/drift` for detecting DB vs file differences
   - Health check now includes config validation (`GET /api/health` returns `configValidation`)
   - Concurrency warnings with `updatedBy` tracking

4. **Job Config Snapshots**
   - Snapshot capture stores pipeline/search configs + SR summary per job
   - Ensures auditability and reproducibility

5. **SR Modularity (Phase 3)**
   - SR config remains separate UCM domain (schemaVersion `3.0.0`)
   - SR evaluator search settings controlled by SR config (no env overrides)

6. **Terminology Cleanup**
   - Context vs EvidenceScope naming corrected in UI/docs/schema
   - Legacy `scope*` config keys mapped to `context*` equivalents

7. **Pipeline Configuration**
   - Monolithic pipeline timeouts now configurable via UCM
   - Aggregation-lexicon keywords refined to prevent false evidence classification

**Breaking Changes**:
- `LLM_PROVIDER` environment variable deprecated (use UCM `pipeline.llmProvider`)

---

### v2.10.0 UCM Pre-Validation Sprint (January 31, 2026)

**Focus**: Professional Admin UX and Operational Tools

**Status**: COMPLETE - All 6 Low-Hanging Fruits implemented

**Major Changes**:

1. **Toast Notifications** - Replaced 22 `alert()` calls with `react-hot-toast`
2. **Export All Configs** - Complete backup of all active configs as timestamped JSON
3. **Active Config Dashboard** - Visual overview panel with color-coded cards
4. **Config Diff View** - Field-by-field diff with added/removed/modified indicators
5. **Default Value Indicators** - Shows customization status vs defaults
6. **Config Search by Hash** - Search by full or partial hash (min 4 chars)

---

### v2.8.0 LLM Text Analysis Pipeline (January 29-30, 2026)

**Focus**: LLM-Powered Text Analysis Delegation

**Major Changes**:
1. **LLM Text Analysis Pipeline Architecture** - 4 strategic analysis points for LLM delegation
2. **Multi-Pipeline Support** - Works across all three pipelines with graceful degradation
3. **Feature Flag System** - Per-analysis-point enablement for gradual rollout
4. **Cost Analysis** - ~5.3% increase on typical $0.50 analysis job with Claude Haiku

---

### v2.8.3 LLM Enabled by Default & Prompt-Code Alignment (January 30, 2026)

**Focus**: Enable LLM text analysis by default after completing prompt-code alignment

---

### v2.8.1 LLM Text Analysis Bug Fix & Reorganization (January 30, 2026)

**Focus**: Critical Bug Fix for Counter-Claim Detection & File Reorganization

**Key Lesson**: Counter-claim detection requires full context (available only in understand phase). Verdict phase has insufficient context and should NOT attempt re-detection.

---

### v2.8.2 Promptfoo Testing Infrastructure for Text Analysis (January 30, 2026)

**Focus**: Comprehensive Promptfoo Test Coverage for LLM Text Analysis Pipeline (26 new test cases)

---

### v2.6.41 (January 27-28, 2026)

**Focus**: Unified Configuration Management & Prompt Unification

**Major Changes**:
1. **Unified Configuration Management System** - Three-table database design
2. **Prompt Unification** (Phase 4 Complete) - Migrated prompts from file-based to UCM
3. **Admin UI Consolidation** - New `/admin/config` page with tabs

---

### v2.6.40 (January 26, 2026)

**Focus**: Context/Scope Terminology Fix in inline prompts

---

### v2.6.39 (January 26, 2026)

**Focus**: Assessed Statement Feature - Added explicit `assessedStatement` field to AnalysisContext

---

### v2.6.38 (January 26, 2026)

**Focus**: Test Infrastructure Reorganization & Promptfoo Integration

---

### v2.6.37 (January 24, 2026)

**Focus**: Entity-Level Source Evaluation & Consensus Tuning

---

### v2.6.36 (January 24, 2026)

**Focus**: Source Reliability Evaluation Hardening (SOURCE TYPE CAPS, asymmetric confidence gating, brand variant matching)

---

### v2.6.35 (January 24, 2026)

**Focus**: Source Reliability Prompt Improvements & Cleanup

---

### v2.6.34 (January 21, 2026)

**Focus**: Source Reliability Service Implementation (full LLM-powered evaluation, multi-model consensus, SQLite cache, evidence weighting)

---

### v2.8.0 (January 2026)

**Focus**: Shared Module Architecture & Contestation Logic

---

### v2.6.33 (January 2026)

**Focus**: Counter-claim detection improvements

---

### v2.6.32 (January 2026)

**Focus**: Verdict structured-output resilience (NoObjectGeneratedError recovery)

---

### v2.6.31 (January 2026)

**Focus**: Modularization (debug + config modules)

---

### v2.6.30 (January 2026)

**Focus**: Complete input neutrality (identical analysis paths regardless of phrasing)

---

### v2.6.26 (January 2026)

**Focus**: Input normalization

---

### v2.6.25 (January 2026)

**Focus**: Question-to-statement handling improvements

---

### v2.6.24 (January 10, 2026)

**Critical Fixes**: Rating Inversion Fixed, Centrality Over-Marking Fixed

---

### v2.6.23 (January 10, 2026)

**Critical Fixes**: Input Neutrality Fixed (4% -> 1% divergence)

---

### v2.6.22 (January 10, 2026)

**Features**: Enhanced recency detection, Gemini Grounded Search (experimental)

---

### v2.6.21 (January 10, 2026)

**Features**: Generic AnalysisContext (replaced legal-specific DistinctProceeding), EvidenceScope rename

---

### v2.6.18-v2.6.20 (January 6-9, 2026)

**Critical Fixes**: KeyFactors Aggregation, Evidence Agreement Bug, PDF Fetch Errors

---

### v2.7.0 (January 2026)

**Terminology Refactor**: Schema field alignment to `analysisContexts`/`contextId`

---

### v2.2.0 (December 30, 2025)

**Major Features**: Article Verdict Problem Implementation (Two-Panel Summary, Claim Highlighting, Fallacy Detection)

---

### Earlier Versions (Pre-v2.2.0)

**Initial POC1 Implementation** included:
- AKEL pipeline (Understand -> Research -> Verdict)
- Multi-LLM provider support (Anthropic, OpenAI, Google, Mistral)
- Multi-search provider support (Google CSE, SerpAPI)
- 7-point verdict scale (TRUE to FALSE)
- Dependency tracking between claims
- Pseudoscience detection and escalation
- Quality Gates (Gate 1: Claim Validation, Gate 4: Verdict Confidence)
- Source reliability scoring (static bundle)
- Job lifecycle management
- Server-Sent Events (SSE) for real-time progress
- PDF and HTML content extraction
- Markdown report generation
- Two-panel summary format
