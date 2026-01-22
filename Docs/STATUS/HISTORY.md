# FactHarbor Development History

**Last Updated**: January 21, 2026  
**Current Version**: 2.6.34  
**Schema Version**: 2.7.0

---

## Table of Contents

- [Project Genesis](#project-genesis)
- [Version History](#version-history)
- [Architectural Decisions](#architectural-decisions)
- [Major Investigations & Fixes](#major-investigations--fixes)
- [Technical Debt & Known Issues](#technical-debt--known-issues)

---

## Project Genesis

### Vision

A world where decisions and public debate are grounded in evidence, so people can move forward with clarity and confidence.

### Mission

FactHarbor brings clarity and transparency to a world full of unclear, contested, and misleading information by shedding light on the context, assumptions, and evidence behind claims.

### Initial Architecture Decisions

**Separated Services Architecture**:
- **.NET API** (ASP.NET Core 8.0): Job persistence, status tracking, SSE events
- **Next.js Web App**: UI and analysis engine

**Core Principles** (from AGENTS.md):
1. **Generic by Design**: No domain-specific hardcoding
2. **Input Neutrality**: Question ≈ Statement (within ±5%)
3. **Pipeline Integrity**: No stage skipping (Understand → Research → Verdict)
4. **Evidence Transparency**: Every verdict cites supporting facts
5. **Scope Detection**: Identify and analyze distinct bounded analytical frames

---

## Version History

### v2.6.34 (January 21, 2026)

**Focus**: Source Reliability Service Implementation

**Major Changes**:

1. **Source Reliability Service**: Full implementation of LLM-powered source evaluation
   - Multi-model consensus (Claude + GPT-4) for hallucination reduction
   - SQLite cache with 90-day TTL
   - Batch prefetch + sync lookup pattern (no async in analyzer hot path)
   - Importance filter skips blogs and spam TLDs (~60% cost savings)
   - Rate limiting for cost control

2. **Evidence Weighting**: Source reliability now affects verdict calculations
   - **Effective Weight Formula** (amplified deviation):
     ```
     effectiveWeight = 0.5 + (score - 0.5) × spreadMultiplier × confidence × consensusFactor
     ```
   - Configurable: `FH_SR_SPREAD_MULTIPLIER` (default 1.5), `FH_SR_CONSENSUS_SPREAD_MULTIPLIER` (default 1.15)
   - **Symmetric 5-band scale** (20 points each, centered at 0.5):
     - 0.80-1.00: very_high | 0.60-0.80: high | 0.40-0.60: mixed (neutral center)
     - 0.20-0.40: low | 0.00-0.20: very_low
   - Unknown sources default to 0.5 (truly neutral, no verdict bias)

3. **Admin Interface**: New admin page for cache management
   - View cache statistics
   - Browse cached scores with pagination/sorting
   - Cleanup expired entries

4. **Test Coverage**: 90 tests for Source Reliability
   - `source-reliability.test.ts`: 42 tests (domain extraction, filter, weighting)
   - `source-reliability-cache.test.ts`: 16 tests (SQLite operations)
   - `source-reliability.integration.test.ts`: 13 tests (end-to-end pipeline flow)
   - `evaluate-source.test.ts`: 19 tests (rate limiting, consensus calculation)

**Key Files Created/Modified**:
- `apps/web/src/lib/analyzer/source-reliability.ts` (enhanced with evidence weighting)
- `apps/web/src/lib/source-reliability-cache.ts` (new)
- `apps/web/src/app/api/internal/evaluate-source/route.ts` (new)
- `apps/web/src/app/admin/source-reliability/page.tsx` (new)
- `apps/web/src/app/api/admin/source-reliability/route.ts` (new)
- `apps/web/src/lib/analyzer/orchestrated.ts` (prefetch integration)

**Documentation**:
- `Docs/ARCHITECTURE/Source_Reliability.md` (comprehensive user guide)
- `Docs/ARCHIVE/Source_Reliability_Service_Proposal.md` (archived proposal)

**Configuration** (environment variables):
- `FH_SR_ENABLED`, `FH_SR_MULTI_MODEL`, `FH_SR_CONFIDENCE_THRESHOLD`
- `FH_SR_CONSENSUS_THRESHOLD`, `FH_SR_CACHE_TTL_DAYS`, `FH_SR_FILTER_ENABLED`
- `FH_SR_SKIP_PLATFORMS`, `FH_SR_SKIP_TLDS`, `FH_SR_RATE_LIMIT_PER_IP`
- `FH_SR_SPREAD_MULTIPLIER`, `FH_SR_CONSENSUS_SPREAD_MULTIPLIER`, `FH_SR_DEFAULT_SCORE`

---

### v2.8.0 (January 2026)

**Focus**: Shared Module Architecture & Contestation Logic

**Major Changes**:

1. **Shared Module Architecture**: Consolidated duplicate code across pipelines
   - `scopes.ts`: Scope detection and formatting (`detectScopes()`, `formatDetectedScopesHint()`)
   - `aggregation.ts`: Verdict weighting functions (`validateContestation()`, `detectClaimContestation()`, `detectHarmPotential()`)

2. **Heuristic Scope Pre-Detection**: Code-level pattern detection before LLM analysis
   - Comparison claims (efficiency, performance) → Production/Usage phase scopes
   - Legal/trial fairness claims → Legal/International/Outcomes scopes
   - Environmental/health comparisons → Direct/Lifecycle scopes

3. **Doubted vs Contested Distinction**: Proper handling of evidence-based vs opinion-based contestation
   - **DOUBTED** (factualBasis: "opinion"): Political criticism without documented evidence → FULL weight (1.0x)
   - **CONTESTED** (factualBasis: "established"/"disputed"): Has documented counter-evidence → REDUCED weight (0.3x/0.5x)
   - `validateContestation()` (orchestrated): KeyFactor-level validation
   - `detectClaimContestation()` (canonical): Claim-level heuristic detection

4. **Harm Potential Detection**: Shared `detectHarmPotential()` function
   - Detects death/injury/safety/fraud claims
   - Applied as fallback when LLM doesn't detect high harm
   - Ensures severe claims get proper weight (1.5x multiplier)

5. **Prompt Enhancements**: Improved `factualBasis` classification guidance
   - Clear examples of opinion vs established counter-evidence
   - Explicit instructions for political criticism classification

**Pipeline Consistency**:
| Feature | Canonical | Orchestrated |
|---------|-----------|--------------|
| Scope pre-detection | ✅ `detectScopes()` | ✅ `detectScopes()` |
| Harm potential | ✅ `detectHarmPotential()` | ✅ `detectHarmPotential()` |
| Contestation | ✅ `detectClaimContestation()` | ✅ `validateContestation()` |
| Weight calculation | ✅ `calculateWeightedVerdictAverage()` | ✅ `calculateWeightedVerdictAverage()` |

**Files Modified**:
- `apps/web/src/lib/analyzer/aggregation.ts` (new exports)
- `apps/web/src/lib/analyzer/scopes.ts` (new exports)
- `apps/web/src/lib/analyzer/monolithic-canonical.ts` (use shared modules)
- `apps/web/src/lib/analyzer/orchestrated.ts` (use shared modules)
- `apps/web/src/lib/analyzer/prompts/base/understand-base.ts` (prompt improvements)

---

### v2.6.33 (January 2026)

**Focus**: Counter-claim detection improvements

**Changes**:
- Fixed counter-claim detection - thesis-aligned claims no longer flagged as counter
- Auto-detect foreign response claims as tangential for legal proceeding theses
- Contested claims WITH factual counter-evidence get reduced weight in aggregation

**Files Modified**:
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/lib/analyzer/verdict-corrections.ts`

---

### v2.6.32 (January 2026)

**Focus**: Verdict structured-output resilience

**Critical Fixes**:
- **🔥 Multi-context verdict fallback fixed**: Deep multi-context analyses could degrade to Unverified 50% when AI SDK raised `NoObjectGeneratedError`
- Added recovery from `NoObjectGeneratedError` by salvaging JSON from error payloads
- Added last-ditch "JSON text" retry (no `Output.object`) and Zod-parse recovery
- Added richer debug logging for finishReason/text/cause

**Diagnostics**:
- Debug log path now resolves to repo root even when Next.js server runs with `cwd=apps/web`

**Terminology**:
- Prompts/docs/types now consistently use **ArticleFrame** (narrative background), **AnalysisContext** (top-level bounded frame), and **EvidenceScope** (per-fact source scope metadata)

**Files Modified**:
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/lib/analyzer/config.ts`
- `apps/web/src/lib/analyzer/debug.ts`
- `apps/web/src/lib/analyzer/json.ts`
- `apps/web/src/lib/analyzer/json.test.ts`

---

### v2.6.31 (January 2026)

**Focus**: Modularization

**Changes**:
- Extracted debug module (`analyzer/debug.ts`)
- Extracted config module (`analyzer/config.ts`)
- Improved code organization and maintainability

---

### v2.6.30 (January 2026)

**Focus**: Complete input neutrality

**Changes**:
- Removed `detectedInputType` override
- Inputs now follow IDENTICAL analysis paths regardless of phrasing
- Question vs statement divergence eliminated at pipeline level

---

### v2.6.26 (January 2026)

**Focus**: Input normalization

**Changes**:
- Force `impliedClaim` to normalized statement unconditionally
- Show article summary for all input styles
- Improved consistency between question and statement handling

---

### v2.6.25 (January 2026)

**Focus**: Question-to-statement handling improvements

**Changes**:
- Removed `originalInputDisplay` from analysis pipeline
- `resolveAnalysisPromptInput` no longer falls back to yes/no format
- `isRecencySensitive` uses `impliedClaim` (normalized) for consistency
- ArticleSummary data generation logic enhanced
- UI layout improvements for summary page

**Files Modified**:
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/app/jobs/[id]/page.tsx`

---

### v2.6.24 (January 10, 2026)

**Critical Fixes**:
- **🔥 Rating Inversion Fixed**: Verdicts now rate the ORIGINAL user claim AS STATED (not the analysis conclusion)
- **🔥 Centrality Over-Marking Fixed**: Methodology validation claims excluded from central marking
- **🔥 Critical Bug Fixed**: `isValidImpliedClaim is not defined` error

**Enhancements**:
- Article Summary Display uses LLM-synthesized `articleThesis` instead of raw input verbatim
- Question label fix: Only shown for actual questions (not statements ending with "?")

**Files Modified**:
- `apps/web/src/lib/analyzer.ts`

**Schema Changes**:
- Schema version: 2.6.24
- Added `wasOriginallyQuestion` to `ClaimUnderstanding` interface

---

### v2.6.23 (January 10, 2026)

**Critical Fixes**:
- **🔥 Input Neutrality Fixed**: Question vs statement divergence reduced from 4% to 1%
- Fixed `canonicalizeScopes()` to use `analysisInput` instead of original input
- Fixed supplemental scope detection to use normalized input consistently

**Enhancements**:
- Centrality logic enhanced with explicit NON-central examples
- Generic recency detection (removed domain-specific person names: 'bolsonaro', 'putin', 'trump')

**Test Results**:
- ✅ Bolsonaro trial: 1% divergence (statement: 76%, question: 72%)
- ✅ Centrality reduction validated

**Files Modified**:
- `apps/web/src/lib/analyzer.ts`

**Schema Changes**:
- Schema version: 2.6.23

---

### v2.6.22 (January 10, 2026)

**Features**:
- Enhanced recency detection with news-related keywords (trial, verdict, sentence, election, investigation, court, ruling)
- Date-aware query variants for ALL search types when recency matters
- Gemini Grounded Search mode (experimental)

**Files Modified**:
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/lib/search-gemini-grounded.ts` (new)
- `apps/web/src/lib/analyzer/config.ts`

**Schema Changes**:
- Schema version: 2.6.22
- Added `recencyMatters` to `ResearchDecision` interface

---

### v2.6.21 (January 10, 2026)

**Features**:
- **Generic AnalysisContext**: Replaced legal-specific `DistinctProceeding` with domain-agnostic `AnalysisContext`
- **EvidenceScope**: Renamed `sourceScope` to `EvidenceScope` for clarity

**Enhancements**:
- UI improvements: contested badge, factor summary counts
- Centrality logic: "If only ONE claim could be investigated, which would readers most want verified?"
- Quality Gates review: Confirmed appropriate thresholds

**Files Modified**:
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/lib/analyzer/types.ts`

**Schema Changes**:
- Replaced `DistinctProceeding` with `AnalysisContext` (kept alias for compatibility)
- Renamed `sourceScope` to `evidenceScope`

---

### v2.6.18-v2.6.20 (January 6-9, 2026)

**Critical Fixes**:
- **KeyFactors Aggregation Fixed** (January 6): Added `keyFactorId` preservation in all 3 verdict creation paths
- **Evidence Agreement Bug Fixed** (January 6): Gate 4 now only counts claim-specific criticism
- **PDF Fetch Errors Fixed**: Enhanced buffer validation, increased timeout, added redirect following

**Features**:
- KeyFactors display added to article mode reports
- Temporal error sanitization
- Input neutrality foundation with standardized verdict prompts

**Infrastructure**:
- Runner resilience with exponential backoff retry
- Job lifecycle tests added
- Analyzer modularization started

**Schema Fixes**:
- FALSE verdict prompt/schema mismatch fixed
- Highlight colors normalized to 3-color UI system
- Source reliability scale bug fixed

**Files Modified**:
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/lib/analyzer/quality-gates.ts`
- `apps/web/src/lib/retrieval.ts`
- `apps/api/Services/RunnerClient.cs`

---

### v2.7.0 (January 2026)

**Terminology Refactor**:
- **Schema field alignment**: `analysisContexts`, `contextId`, `analysisContext` are now primary field names
- **Runtime validation**: Context reference checks added
- **Result metadata**: `_schemaVersion: "2.7.0"` added to result builders

**Prompt and UI Alignment**:
- Base prompts and provider variants updated to emit `analysisContexts`/`contextId`
- Jobs UI reads v2.7 fields with legacy fallbacks

**Tooling**:
- Migration script hardened (collision-safe key renames)

---

### v2.2.0 (December 30, 2025)

**Major Features**: Article Verdict Problem Implementation

**Implements**:
1. **Article Verdict Problem**: Article credibility ≠ simple average of claim verdicts
2. **UN-3**: Two-Panel Summary (Input Summary + FactHarbor Analysis)
3. **UN-17**: In-Article Claim Highlighting with color-coded verdicts

**Key Changes**:
- Central vs Supporting Claims classification
- Logical Fallacy Detection (6 types)
- Two-panel summary structure
- Claim positions for highlighting (startOffset/endOffset)

**New Fallacies Detected**:
- Correlation→Causation
- Cherry-picking
- False equivalence
- Hasty generalization
- Appeal to authority
- Straw man

**Schema Changes**:
- Added `isCentral` to claims
- Added `startOffset/endOffset` for claim positions
- Added `twoPanelSummary` structure
- Added `articleAnalysis` with fallacy detection

---

### Earlier Versions (Pre-v2.2.0)

**Initial POC1 Implementation** included:
- AKEL pipeline (Understand → Research → Verdict)
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

---

## Architectural Decisions

### ADR-001: Scope/Context Terminology Refactoring (v2.7.0)

**Context**: The codebase used multiple overlapping terms: "context", "proceeding", "scope", "event", creating confusion.

**Decision**: Unified terminology around three concepts:
1. **ArticleFrame**: Narrative background/overview (article-level context)
2. **AnalysisContext**: Top-level bounded analytical frame with defined boundaries, methodology, temporal period, subject
3. **EvidenceScope**: Per-fact source scope metadata (methodology/boundaries of individual sources)

**Rationale**:
- Clear separation of concerns
- Distinct scopes = different legal cases, methodologies, temporal periods, regulatory frameworks
- NOT distinct = different perspectives on same event

**Impact**: Major refactor of schema, prompts, and UI. Legacy field names kept for backward compatibility.

---

### Triple-Path Pipeline Architecture (v2.6.33)

**Context**: Different use cases require different trade-offs between quality, speed, and cost.

**Decision**: Implemented three user-selectable analysis modes:

1. **Orchestrated Pipeline** (default, PR 1 & 2):
   - TypeScript-orchestrated staged pipeline (Understand → Research → Verdict)
   - Highest quality, explicit multi-scope detection
   - Produces canonical result schema
   - Full budget control

2. **Monolithic Canonical** (PR 3):
   - LLM tool-loop with search/fetch tools
   - Faster, lower cost
   - LLM-inferred multi-scope detection
   - Produces canonical schema (same UI as orchestrated)
   - Strict budgets with fail-closed behavior

3. **Monolithic Dynamic** (PR 4):
   - Experimental LLM tool-loop
   - Flexible, LLM-defined output structure
   - Separate dynamic result viewer
   - Minimum safety contract (citations required)

**Architecture Principles**:
- Shared primitives: Normalization, budgets, search/fetch, provenance validation
- Isolated orchestration: Each pipeline has separate logic to prevent cross-contamination
- Result envelope: Common metadata (variant, budgets, warnings, providerInfo)
- Per-job variant persistence: Reproducible results

**Risk Mitigations**:
- Budget caps (maxSteps, maxSources, maxTokens)
- Provenance validation (Ground Realism enforcement)
- Fallback behavior on validation failures
- Contract tests to prevent regressions

**Status**: Implemented and operational. Pipeline variant selector available on analyze page.

**Files**:
- Architecture: `Docs/ARCHITECTURE/Pipeline_TriplePath_Architecture.md`
- Implementation: `apps/web/src/lib/analyzer.ts` (dispatcher + orchestrated)
- Monolithic: Separate modules for canonical/dynamic paths

**Git Commits**:
- `0481272` - Triple-Path Pipeline Architecture
- `19e2fd8` - Migration plan and lead-dev review guide
- `1494d25` - Senior Architect Review
- `958e80a` - Variant selection (PR 1 & 2)
- `c0f4350` - Monolithic dynamic pipeline (PR 4)
- `7e39cb8` - Hardening improvements and UI enhancements

---

### Configuration Tuning for Better Analysis (v2.8.2)

**Context**: January quality regression showed budget constraints were limiting research quality.

**Changes Implemented**:

**Quick Mode Enhancements** (v2.8.2):
- `maxResearchIterations`: 2 → 4 (100% increase)
- `maxSourcesPerIteration`: 3 → 4 (33% increase)  
- `maxTotalSources`: 8 → 12 (50% increase)
- `articleMaxChars`: Kept at 4000
- `minFactsRequired`: Kept at 6

**Deep Mode** (existing):
- `maxResearchIterations`: 5
- `maxSourcesPerIteration`: 4
- `maxTotalSources`: 20
- `articleMaxChars`: 8000
- `minFactsRequired`: 12

**Budget System** (PR 6):
- Per-scope iteration limits
- Total iteration caps
- Token budget tracking
- Hard enforcement mode (configurable)
- Budget stats in result envelope

**Environment Variables**:
- `FH_ANALYSIS_MODE`: `"quick"` (default) | `"deep"`
- `FH_MAX_TOTAL_ITERATIONS`: Override total cap
- `FH_MAX_ITERATIONS_PER_SCOPE`: Override per-scope cap
- `FH_ENFORCE_BUDGETS`: `true` | `false`

**Rationale**: Balance between cost control and research thoroughness. Quality regression showed that too-strict limits harm evidence collection.

**Impact**: Improved research depth without excessive cost. Quick mode now provides better quality while remaining cost-effective.

**Status**: Active configuration in `apps/web/src/lib/analyzer/config.ts` and `budgets.ts`

**Git Commits**:
- `1b0327d` - Add p95 hardening budget tracking (PR 6 foundation)
- `8c41e56` - Update web .env.example defaults

---

### LLM Prompting Improvements (Multiple Phases)

**v2.8.0 - Provider-Specific Optimization** (January 19, 2026):

**Decision**: Optimize prompts per LLM provider instead of one-size-fits-all.

**Provider-Specific Adaptations**:

1. **Claude (Anthropic)**:
   - XML structure tags (`<claude_optimization>`)
   - Thinking blocks for reasoning
   - Prefill hints for reliable JSON start
   - Example: `getClaudePrefill()` returns `"{\n  \""`

2. **GPT (OpenAI)**:
   - Comprehensive few-shot examples
   - Calibration tables for confidence
   - Explicit field lists
   - JSON mode hints

3. **Gemini (Google)**:
   - Strict length limits (word/character tables)
   - Numbered processes (1., 2., 3.)
   - Schema checklists
   - Concise formatting

4. **Mistral**:
   - Step-by-step numbered instructions
   - Validation checklists
   - Field templates
   - Explicit output format

**Budget Model Optimization**:
- Simplified prompts for budget models (Haiku, Flash, Mini)
- ~40% claimed token reduction (unvalidated)
- Ultra-compact when `FH_LLM_TIERING=on`
- Minimal provider hints

**Structured Output Hardening**:
- Schema retry prompts with error-specific fixes
- `NoObjectGeneratedError` recovery
- JSON extraction from error payloads
- Error-to-fix mapping

**Task-Specific Prompts**:
- `orchestrated-understand.ts`: Main analysis prompts
- `orchestrated-supplemental.ts`: Claims/scopes generation
- Task types: `orchestrated_understand`, `supplemental_claims`, `supplemental_scopes`
- Exported via `prompt-builder.ts`

**Testing**:
- 83 new prompt optimization tests
- All 4 providers validated
- Budget model detection tests
- Token estimation utilities
- **⚠️ CRITICAL**: Tests only validate syntax, not actual LLM behavior

**Status**: ❌ NEVER VALIDATED - No A/B testing performed, no real API calls to measure actual token reduction or quality impact.

**Files**:
- `apps/web/src/lib/analyzer/prompts/providers/*.ts`
- `apps/web/src/lib/analyzer/prompts/base/orchestrated-*.ts`
- `apps/web/src/lib/analyzer/prompts/config-adaptations/*.ts`
- `Docs/REFERENCE/Provider_Prompt_Guidelines.md`

**Git Commits**:
- `048efa4` - Implement v2.8 provider-specific LLM optimization
- `05de7aa` - Prompting improvements and Metrics
- `5837ebb` - Budget models respect FH_ALLOW_MODEL_KNOWLEDGE

**Earlier Prompting Improvements**:

**v2.6.x - Orchestrated Pipeline Prompts**:
- Explicit pipeline stage instructions
- Verdict rating direction clarification (rate original claim, not analysis)
- Centrality heuristic improvements (0-2 central claims expected)
- Input neutrality enforcement in prompts

**v2.2.0 - Article Verdict Problem** (December 2025):
- Two-panel summary structure (UN-3)
- Central vs supporting claim classification
- Logical fallacy detection (6 types)
- Article-level verdict vs claim aggregation

**Legacy - Initial AKEL Prompts**:
- Understand → Research → Verdict pipeline
- Quality gate instructions (Gate 1, Gate 4)
- Evidence extraction with excerpts
- Pseudoscience detection patterns

**Key Prompt Principles** (from Provider Guidelines):
- Evidence-based analysis (no model knowledge when `FH_ALLOW_MODEL_KNOWLEDGE=false`)
- Provenance validation (URL + excerpt required)
- Scope detection with generic terminology
- Input neutrality (question ≈ statement)
- Fail closed on ambiguity

---

### Quality Gates Design (v2.6.18+)

**Decision**: Implemented two mandatory quality gates:
- **Gate 1** (Claim Validation): Filters opinions, predictions, low-specificity claims before research
- **Gate 4** (Verdict Confidence): Requires minimum sources, quality, and agreement

**Rationale**: Prevent wasted research on unanalyzable claims, ensure minimum evidence standards for verdicts.

**Thresholds**:
- Gate 1: Opinion ≤30%, Specificity ≥30%
- Gate 4: MEDIUM requires ≥2 sources, ≥60% quality/agreement

**Status**: Implemented, stats tracked in JSON, but per-item reasons not displayed in UI yet.

---

### KeyFactors Implementation (v2.6.18+)

**Decision**: Implement emergent, optional KeyFactors discovered during Understanding phase.

**Structure**:
- KeyFactors are decomposition questions (e.g., "Was due process followed?")
- Claims map to KeyFactors via `keyFactorId`
- KeyFactor verdicts aggregate from mapped claim verdicts
- Scope answers aggregate from KeyFactor verdicts

**Rationale**: Provides structured breakdown of complex topics without prescriptive templates.

**Status**: Implemented, aggregation fixed (v2.6.18), displayed in reports.

---

## Major Investigations & Fixes

### Quality Regression (January 13-19, 2026)

**Problem Identified**: Reports from January 19 showed significant quality degradation compared to January 13:
- Confidence: 77% → 50% (-37%)
- Searches: 16 → 9 (-44%)
- Claims: 12 → 7 (-42%)
- Input neutrality broken (28% divergence between question and statement)

**Root Causes Identified**:

1. **Budget Constraints Limiting Research** (HIGH IMPACT)
   - PR 6 added budget enforcement with `maxTotalIterations: 12`, `maxIterationsPerScope: 3`
   - For 2-scope analysis: 3 × 2 = 6 iterations max vs 16 searches before
   - **Fix**: Increased limits in v2.8.2

2. **Input Normalization Not Reaching LLM** (HIGH IMPACT)
   - Normalization converted text but LLM still classified differently (`detectedInputType: "question"` vs `"claim"`)
   - Different classification led to different research paths
   - **Fix**: Forced `detectedInputType` to always be "claim" (v2.6.30)

3. **Quick vs Deep Mode** (CONFIGURATION)
   - Quick mode: Only 2 research iterations (later increased to 4 in v2.8.2)
   - Deep mode: 5 research iterations
   - **Fix**: Enhanced quick mode limits

4. **Gate 1 Changes** (MEDIUM IMPACT)
   - Commit `aac7602` changed Gate 1 to pass opinions/predictions through
   - More low-quality claims → diluted confidence
   - **Fix**: Stricter Gate 1 filtering restored

5. **v2.8 Prompt Changes** (UNVALIDATED)
   - Large prompt optimization work deployed without A/B testing
   - Impact unknown - may have degraded quality
   - **Status**: Testing infrastructure built but not executed

**Fixes Applied**:
- Input neutrality enforcement (v2.6.30)
- Increased budget limits (v2.8.2: quick mode 2→4 iterations, 8→12 total sources)
- Enhanced quick mode configuration
- Forced `detectedInputType` to "claim" unconditionally

**Validation Results**:
- Input neutrality restored (within acceptable variance)
- Search counts improved
- Confidence scores stabilized

**Lessons Learned**:
1. Never deploy unvalidated optimizations
2. Measure everything before and after changes
3. Input neutrality is fragile and requires continuous validation
4. Budget constraints have non-obvious quality impacts

---

### Input Neutrality Issues (v2.6.23 - v2.6.30)

**Problem**: Question vs statement phrasing yielded different verdicts, violating core requirement.

**Investigation Timeline**:
- v2.6.23: Fixed canonicalization to use normalized input (4% → 1% divergence)
- v2.6.26: Forced `impliedClaim` to normalized statement
- v2.6.30: Removed `detectedInputType` override, enforced identical paths

**Technical Issues Fixed**:
- Scope canonicalization using wrong input variable
- LLM still classifying normalized input differently
- Different classification triggering different research patterns

**Status**: ✅ RESOLVED. Current implementation forces identical pipeline paths.

---

### Scope Detection Hardcoded Names (January 19, 2026)

**Problem**: Recency detection used hardcoded political figure names (`['bolsonaro', 'putin', 'trump']`), violating "Generic by Design" principle.

**Impact**: 
- Recency detection only worked for hardcoded names
- Failed for other newsworthy figures (Einstein, Merkel, etc.)

**Fix**: Replaced with generic temporal and news indicators:
- Removed: Person name lists
- Added: Generic keywords (trial, verdict, sentence, election, investigation, ruling)
- Added: Proper noun detection using word capitalization

**Status**: ✅ FIXED in v2.6.23

**Files Modified**:
- `apps/web/src/lib/analyzer.ts`

---

### Prompt Optimization Validation (Pending)

**Background**: v2.8 included extensive prompt optimization work:
- Provider-specific formatting (Claude XML, GPT few-shot, Gemini format, Mistral step-by-step)
- Budget model optimization (~40% claimed token reduction)
- 83 new tests added

**Problem**: 
- All tests validate syntax only, not LLM behavior
- No A/B testing performed
- No real API calls to validate claims
- Optimizations deployed without proof of effectiveness

**Status**: ❌ NEVER VALIDATED

**Impact**: Unknown whether v2.8 improvements actually work or degrade quality

**Infrastructure Built**:
- ✅ Baseline test suite (30 test cases)
- ✅ A/B testing framework
- ✅ Metrics collection system
- ⏸️ Tests not executed (awaiting budget approval: $20-50 baseline, $100-200 A/B)

**Next Steps**: Run baseline test, then A/B test to validate v2.8 optimizations.

---

## Measurements & Testing Infrastructure (v2.8.1)

**Note**: Documentation incorrectly labeled current version as v2.8.1. Actual code version is v2.6.33, schema version 2.7.0.

**Built But Not Integrated**:
1. **Metrics Collection System**: `apps/web/src/lib/analyzer/metrics.ts` (400 lines)
2. **Observability Dashboard**: `/admin/metrics` route (built, deployable)
3. **Baseline Test Suite**: 30 diverse test cases across 7 categories
4. **A/B Testing Framework**: Compare old vs optimized prompts
5. **Schema Retry Logic**: Automatic recovery from validation failures
6. **Parallel Verdict Generation**: 50-80% speed improvement (not integrated)
7. **Tiered LLM Routing**: 50-70% cost reduction (not integrated)

**Status**: Infrastructure complete, database migration ready, but:
- Metrics not integrated into analyzer.ts
- Tests not executed (require $20-200 API budget)
- Optimizations not deployed to production code

---

## Technical Debt & Known Issues

### Critical Issues

**1. v2.8 Prompts Never Validated** (CRITICAL)
- **Impact**: Unknown quality impact of large optimization work
- **Solution**: Run baseline + A/B tests
- **Cost**: $120-250 in API calls
- **Status**: Infrastructure ready, awaiting execution

**2. Metrics Not Integrated** (HIGH)
- **Impact**: No observability into analysis quality/performance
- **Solution**: Add metrics hooks to analyzer.ts (15-30 minutes)
- **Status**: Integration helpers provided but not used

**3. SSRF Protection Missing** (SECURITY)
- **Impact**: URL fetching vulnerable to attacks
- **Solution**: IP range blocking, size limits, redirect caps
- **Priority**: LOW for local POC, HIGH before public deployment

**4. Admin Endpoint Security** (SECURITY)
- **Impact**: `/admin/test-config` publicly accessible, can trigger paid API calls
- **Solution**: Implement authentication
- **Priority**: LOW for local POC, HIGH before public deployment

**5. Rate Limiting Missing** (SECURITY)
- **Impact**: No per-IP or per-user quotas
- **Solution**: Implement rate limiting middleware
- **Priority**: LOW for local POC, HIGH before public deployment

---

### High Priority

**6. Quality Gate Display** (UX)
- **Impact**: Gate decisions exist in JSON but not shown in UI with reasons
- **Solution**: Display gate stats with per-item explanations
- **Status**: Data exists, UI implementation needed

**7. Model Knowledge Toggle** (QUALITY)
- **Impact**: `FH_ALLOW_MODEL_KNOWLEDGE=false` not fully respected in Understanding phase
- **Solution**: Enforce evidence-only analysis throughout pipeline
- **Status**: Partially implemented

---

### Medium Priority

**8. Claim Caching** (PERFORMANCE)
- **Impact**: Recomputes every analysis, wastes API calls on duplicate claims
- **Solution**: Implement claim-level caching (documented but not implemented)
- **Savings**: 30-50% on repeat claims
- **Status**: Architecture designed, not implemented

**9. Normalized Data Model** (ARCHITECTURE)
- **Impact**: All data stored as JSON blobs, no relational queries possible
- **Solution**: Create normalized tables for claims/evidence/sources/verdicts
- **Status**: Documented but not implemented

**10. Error Pattern Tracking** (OBSERVABILITY)
- **Impact**: No systematic tracking of error types/frequencies
- **Solution**: Add error pattern database schema
- **Status**: Not implemented

---

### Low Priority

**11. URL Highlighting** (UX)
- **Impact**: URL string highlighted instead of fetched content
- **Solution**: Highlight extracted text instead of URL
- **Status**: Minor UX issue

**12. LLM Fallback** (RESILIENCE)
- **Impact**: No automatic fallback to secondary LLM if primary fails
- **Solution**: Implement fallback chain
- **Status**: Config documented but not implemented

**13. Rich Report Mode** (UX)
- **Impact**: `FH_REPORT_STYLE=rich` documented but not implemented
- **Solution**: Implement rich formatting
- **Status**: Not implemented

---

### Unimplemented Planned Features

**Documented but Not Built**:
- Claim-level caching architecture (extensive documentation in `Docs/ARCHITECTURE/`)
- Separated architecture for claim reuse
- Historical source track record
- Provenance chain tracking
- Multi-language support
- Interactive refinement
- Comparative analysis mode
- Analysis templates

**Status**: Moved to backlog. Documentation exists but should be marked as "PLANNED" not "IMPLEMENTED".

---

## Breaking Changes

### v2.6.21
- `DistinctProceeding` → `AnalysisContext` (deprecated alias kept)
- `sourceScope` → `evidenceScope` (field renamed)

### v2.6.23
- Scope canonicalization uses `analysisInput` instead of original input

### v2.6.24
- Rating direction: Verdicts rate original claim direction (may change comparative claim values)

### v2.7.0
- Schema version bump to 2.7.0
- Primary field names changed to `analysisContexts`/`contextId` (legacy fields supported)

---

## Contributors

This history reflects work by the FactHarbor development team and AI coding assistants following AGENTS.md guidelines.

---

**Document Status**: Comprehensive history compiled from 45+ source documents  
**Consolidation Date**: January 19, 2026  
**Source Documents**: CHANGELOG.md, EVOLUTION.md, investigation reports, bug fix reports, implementation summaries, architecture reviews
