# FactHarbor Backlog

**Purpose**: Single canonical task list for FactHarbor. Keep this list current; keep `Docs/STATUS/Current_Status.md` high-level and link here.

**Last Updated**: February 19, 2026

**Ordering**: Sorted by **Urgency** (high → med → low), then **Importance** (high → med → low).

**Phase note**: FactHarbor is transitioning from POC to Alpha. During POC/Alpha, **security/cost-control items are tracked as low urgency** (but often **high importance**). Reclassify to **high urgency** before any production/public exposure.

**See Also**: `Docs/STATUS/Improvement_Recommendations.md` for detailed analysis and implementation guidance.

---

## ClaimAssessmentBoundary Pipeline — Remaining Work

The ClaimAssessmentBoundary pipeline v1.0 is **production-ready**. All 5 stages implemented, 853 tests passing.

**Architecture document:** [ClaimBoundary_Pipeline_Architecture_2026-02-15.md](../WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md)
**Execution tracking:** [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md)

| Step | Description | Domain | Urgency | Status | Notes |
|------|-------------|--------|---------|--------|-------|
| **Phase 5i** | **Final cleanup**: V-01 (contextId in AnalysisWarning), V-09 (8 skipped budget tests) | Cleanup | high | NOT STARTED | [CB_Implementation_Prompts.md](../ARCHIVE/CB_Implementation_Prompts.md) |
| **Phase 5k** | **UI adaptations**: Admin config panel (24 CB params), coverage matrix + verdictNarrative + qualityGates components, xWiki diagrams | Web UI | high | NOT STARTED | [CB_Implementation_Prompts.md](../ARCHIVE/CB_Implementation_Prompts.md) |
| **Phase 5h** | **Test coverage**: Neutrality, performance, adversarial tests for CB pipeline | Testing | med | NOT STARTED | Optional but recommended |
| **Step 10** | **Define LLM call optimization targets for CB**: Cost/latency/quality targets based on CB's call pattern | Cost / Analyzer | med | NOT STARTED | |

**Deferred to v1.1:**

| Item | Description | Source |
|------|-------------|--------|
| Gate 1 retry loop | Re-extract claims when >50% fail specificity check | Architecture §8.1.5 |
| CLAIM_GROUPING | Haiku call to group claims for UI display when ≥4 claims | Architecture §18 Q1 |
| Advanced triangulation | Cross-boundary correlation analysis | Architecture §8.5.2 |
| Contestation weight reduction | Requires `factualBasis` field on CBClaimVerdict | Legacy getClaimWeight() incompatibility |
| Derivative detection improvements | Enhanced derivative source identification | Architecture §8.5.3 |

---

## Recently Completed (February 17-19, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Documentation cleanup**: Archived Orchestrated Pipeline xwiki page, pre-Feb-13 changelog, stale `Documentation_Updates_2026-02-03.md`. Updated Pipeline Variants + Deep Dive Index xwiki pages for CB as current default. | Docs | 2026-02-19 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **Dynamic Pipeline schema fix**: Fixed `AI_NoObjectGeneratedError` in Monolithic Dynamic pipeline — `searchQueries` and `additionalInsights` relaxed to optional, retry wired, graceful degradation fallback added. | Analyzer / Quality | 2026-02-19 | [Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md](../AGENTS/Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md) |
| ✅ **Claim Fidelity Fix Phases 1-3**: Gate 1 `passedFidelity` check, Pass 2 prompt anchoring to user input, safety-net rescue, evidence payload compression. Phase 4 (baseline validation) pending. | Analyzer / Quality | 2026-02-18 | [Handoffs/2026-02-18_Lead_Architect_Fidelity_Metrics.md](../AGENTS/Handoffs/2026-02-18_Lead_Architect_Fidelity_Metrics.md) |
| ✅ **Code Review Sprint (5 phases, 45 findings)**: New shared `auth.ts` (timingSafeEqual), `job-abort.ts` (globalThis), search hardening (cache + multi-provider + circuit breaker). Residuals: 10 test failures + auth migration sweep (see active backlog). | Architecture / Quality | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **AtomicClaim extraction Phases 1+2**: Prompt improvements + Gate 1 active filtering + dynamic max claims. Target ~40% reduction in LLM calls. Phase 3 validation with real LLM calls pending. | Analyzer / Cost | 2026-02-18 | [WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md](../WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md) |
| ✅ **Job cancel/delete**: Users can cancel running jobs and delete completed/failed jobs from the UI and API. | Web UI | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **JSON tree view**: Interactive expand/collapse + copy-to-clipboard for JSON tab on job detail page (`react-json-view-lite`). | Web UI | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **Architecture docs + ERD rework**: Data model ERDs verified against `types.ts` (10 entities, 28 mismatches fixed). Specification/Data Model updated as compatible future target with CB terminology throughout. | Docs | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **CB Pipeline v1.0 COMPLETE**: All 5 stages implemented (extractClaims, researchEvidence, clusterBoundaries, generateVerdicts, aggregateAssessment). 853 tests passing. Production-ready. | Analyzer / Pipeline | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5a: Stage 1**: Two-pass evidence-grounded claim extraction with Gate 1 validation. 24 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5b: Stage 2**: Claim-driven research with contradiction search, EvidenceScope validation, derivative tracking. 28 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5c: Stage 3**: LLM-driven boundary clustering with coherence assessment and cap enforcement. 21 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5d: Stage 4**: Production LLM wiring for verdict-stage module. 11 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5e: Stage 5**: Triangulation scoring, weighted aggregation, VerdictNarrative, quality gates. 17 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5f: Integration test**: 3 end-to-end scenarios with schema validation. | Testing | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5f2: Rename**: ClaimBoundary → ClaimAssessmentBoundary (partial: types/docs/UI, internal IDs unchanged). 18 files. | Refactoring | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5g: Documentation**: Status, governance, and architecture docs updated for v1.0 completion. | Docs | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **UCM Config for CB**: All 24 CB parameters added to UCM schemas with defaults. | Config | 2026-02-17 | [UCM Audit](../WIP/UCM_Configuration_Audit_2026-02-17.md) |

### Previously Completed (February 16, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **CB Step 0: Rules Audit**: Updated all governance docs for ClaimBoundary terminology. | Architecture / Governance | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 1: Infrastructure**: Types, verdict-stage module, 8 UCM prompts, pipeline skeleton. 50 tests. | Analyzer / Pipeline | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 2: Cutover**: ClaimBoundary wired as default route. Schema 3.0.0-cb. | Analyzer / Pipeline | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 2a: Delete Orchestrated**: ~18,400 lines removed. | Analyzer / Cleanup | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 3: UI**: BoundaryFindings component, page.tsx updated. | Web UI | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 3b: MD Cleanup**: Dead prompt infrastructure removed (~3,300 lines). | Analyzer / Cleanup | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 4: Final AC Sweep**: Zero AnalysisContext references in active code. | Cleanup | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Architecture Design**: 9/9 decisions closed, 2 review rounds, 13 v1 features. | Architecture | 2026-02-16 | [Architecture Doc](../WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md) |
| ✅ **WIP Consolidation**: Archived 11 files. WIP reduced from 19 to 7 active files. | Docs / Cleanup | 2026-02-16 | [WIP README](../WIP/README.md) |

### Previously Completed (February 13, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **API Cost Optimization (Quick Wins)**: Reduced budget defaults (iterations 5→3, total 20→10, tokens 750K→500K), tightened context detection (maxContexts 5→3, dedupThreshold 0.85→0.70), excluded 4 expensive LLM tests from `npm test`, documented full cost reduction strategy. | Cost / Testing | 2026-02-13 | [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md) |
| ✅ **Report Quality Hardening (Phase 1)**: Added explicit zero-source warnings (`no_successful_sources`, `source_acquisition_collapse`) plus threshold guards and unit coverage (7 tests). | Analyzer / Quality | 2026-02-13 | [Analysis Quality Issues](../ARCHIVE/Analysis_Quality_Issues_2026-02-13.md) |
| ✅ **Report Quality Hardening (Phase 2)**: Improved qualifier preservation and direction-semantics guidance in orchestrated prompts; direction-validation routing updated to verdict-tier model selection. | Analyzer / Prompts | 2026-02-13 | [Report Issues Plan](../ARCHIVE/Report_Issues_Review_and_Fix_Plan_2026-02-13.md) |
| ✅ **Phase 2a Evidence Processor Extraction**: Extracted 3 new modules from orchestrated.ts (705 lines): evidence-normalization.ts, evidence-recency.ts, evidence-context-utils.ts. Reduced orchestrated.ts by 493 lines. | Architecture / Refactoring | 2026-02-12 | [Current Status](Current_Status.md) |
| ✅ **Normalization Removal**: Deleted all heuristic normalization code (~500 lines). LLM-first input handling for question/statement equivalence. | Analyzer / AGENTS Compliance | 2026-02-12 | [Normalization Plan](../ARCHIVE/Normalization_Issues_and_Plan.md) |
| ✅ **Defensive Clamping Replacement**: Replaced `clampTruthPercentage` with `assertValidTruthPercentage` (fail-fast validation). 10 call sites updated with context strings. | Analyzer / Quality | 2026-02-12 | [Current Status](Current_Status.md) |
| ✅ **Canonical Pipeline Removal**: Removed Monolithic Canonical variant (~2,281 lines). Twin-Path architecture (Orchestrated + Monolithic Dynamic). | Architecture / Refactoring | 2026-02-10 | [Removal Plan](../ARCHIVE/Canonical_Pipeline_Removal_Plan.md) |
| ✅ **UCM Phase 1: Analyzer Integration**: Analyzer now loads pipeline/search/calc from UCM (hot-reloadable). Env-based analysis settings removed. `LLM_PROVIDER` deprecated. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 2: Save-to-File Functionality**: Bidirectional sync allows saving DB configs back to default JSON files (dev mode only). Atomic writes with backup. | Architecture / Config | 2026-02-02 | [UCM User Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/Unified%20Config%20Management/WebHome.xwiki) |
| ✅ **UCM Phase 2: Job Config Snapshots**: `job_config_snapshots` capture pipeline/search + SR summary per job for auditability. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 3: SR Modularity Interface**: SR config is separate UCM domain; SR service config wired and isolated from pipeline config. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 4: Admin UI Polish**: Split routes to `/admin/quality/*` (FactHarbor) and `/admin/sr/*` (SR standalone). Added validation warnings for dangerous config combos and snapshot viewer. | Web UI / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **Drift Detection & Health Validation**: New endpoint `GET /api/admin/config/:type/drift`. Health check includes config validation. | Architecture / Config | 2026-02-02 | [UCM User Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/Unified%20Config%20Management/WebHome.xwiki) |
| ✅ **Terminology cleanup**: Context vs EvidenceScope naming cleanup in admin UI + schema (legacy keys supported). | Analyzer / Docs | 2026-02-02 | [Terminology Migration Summary](../ARCHIVE/REVIEWS/Terminology_Migration_SUMMARY.md) |
| ✅ **UCM Pre-Validation Sprint (v2.10.0)**: Toast notifications, Export All Configs, Active Config Dashboard, Config Diff View, Default Value Indicators, Config Search by Hash. | Web UI / Config | 2026-01-31 | [CHANGELOG](../CHANGELOG.md) |
| ✅ **Unified Configuration Management Foundation (v2.9.0)**: Extended config system to all core types (prompt, search, calculation, pipeline, sr) plus lexicons. Added prompt import/export/reseed APIs. 158 unit tests. Admin UI complete. | Architecture / Testing | 2026-01-30 | [Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **LLM Text Analysis Pipeline**: Implemented 4 analysis points with hybrid LLM/heuristic architecture. Bug fix in v2.8.1 removed counter-claim detection from verdict prompt. | Analyzer / LLM | 2026-01-30 | [Deep Analysis](../ARCHIVE/REVIEWS/LLM_Text_Analysis_Pipeline_Deep_Analysis.md) |
| ✅ **Promptfoo Test Coverage for Text Analysis**: Created 26 test cases covering all 4 text-analysis prompts (input classification, evidence quality, context similarity, verdict validation). Total promptfoo coverage now 38 test cases across 6 prompts. | Testing / LLM | 2026-01-30 | [Promptfoo Testing Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki) |

---

## Core Functionality & Quality

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Claim Fidelity Phase 4 — Validation**: Run baseline validation scenarios with real LLM calls to confirm Phases 1-3 fix eliminates claim drift. Requires Captain approval before running (real LLM cost). | Analyzer / Quality | high | high | [WIP/Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md](../WIP/Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md) Phase 4 |
| **Schema Validation — Gate 1 rebuild + telemetry + Pass 2 split**: Items #4 (Gate 1 rebuild with proper schema constraints), #5 (telemetry for pass/fail rates), #6 (Pass 2 schema split). Items #1-3 (dead code) covered by "Dead Code Removal" below. | Analyzer / Quality | high | high | [WIP/Schema_Validation_Implementation_Status_2026-02-18.md](../WIP/Schema_Validation_Implementation_Status_2026-02-18.md) |
| **Code review test fixes**: Fix 10 failing search tests. (1) `search-cache.ts`: add `dbPromise = null` in `closeSearchCacheDb()` to reset module state between tests. (2) `search-brave.test.ts`: replace `instanceof SearchProviderError` with duck-typing `err.name === "SearchProviderError"`. ~1h. | Testing | high | med | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) (Code Review entry) |
| **Dead Code Removal**: Remove 879 lines of unused code (7 files: `parallel-verdicts.ts`, `ab-testing.ts`, `pseudoscience.ts`, `normalization-heuristics.ts`, `classification-fallbacks.ts`, `format-fallback-report.ts`, `loadSourceBundle()`). Cleanup: remove from exports, remove npm scripts (`test:ab`, `test:ab:quick`), verify `p-limit` dependency. ~2-4h. | Architecture / Cleanup | high | med | [QA Review](../WIP/QA_Review_Findings_2026-02-12.md) Priority 1 |
| **UCM AutoForm code review**: Schema-driven config UI implementation complete on `feature/ucm-autoform`. Net −462 lines, 100% field coverage vs ~50%. Awaiting code review before merge to main. | Web UI | med | med | [WIP/UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md](../WIP/UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md) |
| **AtomicClaim extraction validation**: Validate Phases 1+2 improvements with real LLM calls (target: 3-5 claims vs 6-8 baseline, ~40% cost reduction). Captain approval needed before running. | Analyzer / Quality | med | high | [WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md](../WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md) |
| ~~**Fix stale "Triple-Path" doc references**~~: SUPERSEDED — replaced by CB documentation. | Docs / Cleanup | ~~med~~ n/a | low | Superseded |
| ~~**Config Migration to UCM**~~: COMPLETE — All 24 CB parameters in UCM. | ~~Analyzer / Config~~ | ~~med~~ done | ~~high~~ | UCM Audit 2026-02-17 |
| **LLM Text Analysis A/B Testing**: Run promptfoo text-analysis tests and compare heuristic vs LLM modes to validate quality improvements. Test infrastructure ready (26 cases). | Analyzer / Testing | med | high | [Promptfoo Testing](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki) |
| **Edge case test coverage**: 15+ tests for ambiguous harm, circular contestation, opinion vs evidence, mixed quality, missing fields. Create `llm-classification-edge-cases.test.ts`. ~4-6h. | Analyzer / Testing | med | high | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #2 |
| ~~Inverse-input symmetry hardening~~: SUPERSEDED — CB pipeline has no pre-detection context symmetry to test. Input neutrality tested via Phase 5h. | ~~Analyzer~~ | ~~med~~ n/a | ~~high~~ | Superseded by CB |
| ~~Evidence-driven context refinement guardrails~~: SUPERSEDED — CB pipeline has no context refinement step; boundaries emerge from evidence clustering. | ~~Analyzer~~ | ~~med~~ n/a | ~~high~~ | Superseded by CB |
| ~~Central-claim evidence coverage pass~~: SUPERSEDED — CB Stage 2 already targets claims with fewest evidence items (claim-driven research loop). | ~~Analyzer / Search~~ | ~~med~~ n/a | ~~high~~ | Implemented in CB Stage 2 |
| **Parallel verdict generation**: Process claim verdicts in parallel (with concurrency limit). **Note:** CB pipeline will implement this from the start in `verdict-stage.ts`. | Analyzer / Performance | med | high | Improvements #5; CB architecture §8.4 |
| **Tiered LLM model routing**: Use cheaper models (Haiku) for extraction tasks, premium models (Sonnet) for reasoning. 50-70% cost savings on LLM calls. ✅ **Enabled** (v2.9.0: Haiku 3.5 for extract/understand, Sonnet 4 for verdict/context refinement). | Analyzer / Cost | ~~med~~ done | high | Improvements #3 |
| **Claim-level caching**: Cache normalized claim verdicts to reuse across analyses. 30-50% cost savings on repeat claims. Requires normalized DB schema. | Analyzer / Cost | med | high | Improvements #4 |
| **Quality Gate UI display**: Show Gate 1 and Gate 4 statistics and per-item failure reasons in the results UI. Core transparency requirement. | Web UI | med | high | Improvements #6 |
| ~~Context guidelines note~~: SUPERSEDED — CB uses ClaimAssessmentBoundary terminology; boundaries emerge from evidence, not pre-defined. | ~~Analyzer / Docs~~ | ~~med~~ n/a | ~~med~~ | Superseded by CB |
| **Classification confidence scoring**: Add `factualBasisConfidence`, `harmPotentialConfidence`, `classificationConfidence` (0-100) to types. Reduce weights for low-confidence; flag high-harm + low-confidence for review. ~3-4h. | Analyzer / Quality | low | med | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #4 |
| ~~**Anti-hallucination strategy review**~~: SUPERSEDED — Principles implemented in CB pipeline (LLM debate pattern, self-consistency checks, grounding quality in Gate 1). | Analyzer / Quality | ~~low~~ n/a | med | [Anti-Hallucination Strategies](../ARCHIVE/Anti_Hallucination_Strategies.md) |
| **Doc Audit Phase 2: `opposingEvidenceIds` + `biasIndicator`**: Add `opposingEvidenceIds` to ClaimVerdict (split from misleading `supportingEvidenceIds`). Surface `biasIndicator` from SR cache to FetchedSource + report UI. Update Core Data Model ERD after code changes. | Analyzer / Types | med | med | Phase 2 of prior doc audit initiative |
| ~~**Doc Audit Phase 3: Target data model alignment**~~: ✅ DONE (2026-02-18) — Replaced "Scenario" with AnalysisContext throughout Specification/Data Model, aligned `likelihood_range` to 7-point scale, corrected source scoring to LLM+Cache. | ~~Docs~~ | ~~low~~ done | ~~low~~ | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) (Architecture Rework entry) |

---

## Security & Cost Control
*(All items LOW urgency during POC/Alpha phase; HIGH urgency before production)*

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Batch API integration**: Switch LLM calls to Anthropic Batch API for 50% flat discount. Analyses are background jobs — async latency is acceptable. | Cost / Analyzer | high | high | [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md) §4.A1 |
| **Prompt caching**: Add `cacheControl: { type: 'ephemeral' }` to system prompts for 90% discount on cache hits. Same system prompts reused 40-60x per analysis. Requires AI SDK v0.39+. | Cost / Analyzer | high | high | [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md) §4.A2 |
| **NPO/OSS credit applications**: Apply for Claude for Nonprofits (75% off), AWS TechSoup ($1K/year), Google for Nonprofits ($10K/year), Anthropic AI for Science ($20K). | Cost / Admin | high | high | [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md) §5 |
| **SSRF protections for URL fetching**: Block private IP ranges, cap redirects, cap response size, enforce timeouts. *(POC: low urgency)* | Security | low | high | Improvements #1 |
| **Secure admin endpoints**: Protect `/admin/test-config` and any endpoints that can trigger paid API calls with FH_ADMIN_KEY authentication. *(POC: low urgency)* | Security / Cost-Control | low | high | Improvements #1 |
| **Rate limiting / quotas**: Per-IP and/or per-key throttling; protect search + LLM calls. Prevent runaway costs. *(POC: low urgency)* | Security / Cost-Control | low | high | Improvements #2 |
| **Cost quotas and estimates**: Track per-job and per-day LLM/search quotas. Reject jobs exceeding limits. Show cost estimates before running. *(POC: low urgency)* | Cost-Control | low | high | Improvements #2 |

---

## User Experience Enhancements

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Config admin: auto-save drafts to localStorage**: Protect against accidental page refresh. Recover unsaved drafts on reload. *(Skipped: medium risk of stale draft confusion)* | Web UI / UX | low | low | UCM UX Review |
| **Analysis templates/presets**: Domain-specific templates (health, legal, political) with curated search whitelists and KeyFactor hints. | Web UI / UX | low | med | Improvements #8 |
| **Interactive analysis refinement**: Allow users to add sources, challenge claims, refine searches, or add contexts as child jobs extending existing analysis. | Web UI / UX | low | med | Improvements #7 |
| **Comparative analysis mode**: Side-by-side comparison of two articles/claims. Show shared claims, unique claims, contradictions, consensus areas. | Analyzer / UX | low | med | Improvements #9 |
| **Real-time source quality feedback**: Extend current LLM+Cache source reliability with additional signals (MBFC, NewsGuard, Wikipedia citations, HTTPS, domain age). | Analyzer / Quality | low | med | Improvements #10 |
| **PDF report export**: Generate professional PDF reports with charts, graphs, confidence bars, optional branding. | Reporting | low | low | Improvements #12 |
| **Browser extension**: Right-click extension for "Analyze with FactHarbor", floating button on news sites. | Web UI / UX | low | low | Improvements #13 |
| **Multi-language support**: Support ES, DE, FR, PT with language-specific search and extraction. | Analyzer / i18n | low | med | Improvements #11 |

---

## Monitoring & Operations

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Classification monitoring**: Track fallback rates/distributions per field (harmPotential, factualBasis, etc.). Admin endpoint `GET /api/admin/classification-metrics`. Alert on fallback rate >5%. ~3-4h. | Observability / Analyzer | med | med | [Classification Monitoring Spec](../ARCHIVE/P2_Classification_Monitoring_Backlog.md) |
| **Observability dashboard**: Real-time metrics dashboard showing performance (p50/p95/p99), costs (LLM/search), quality (gate pass rates), usage (success rate), and errors. | Observability | low | high | Improvements #17 |
| **Error pattern detection & auto-recovery**: Automatically categorize errors, suggest fixes, apply recovery actions (retry with shorter prompt, skip source, fallback model). | Observability / Reliability | low | med | Improvements #18 |
| Persist metrics and cost estimates: tokens/search calls/cost estimation stored per job; basic admin view. | Observability | low | med | Existing |
| Error pattern tracking: persist structured error categories and frequency to inform prompt/code fixes. | Observability | low | med | Existing |

---

## Technical Debt & Architecture

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Config storage seeding race condition**: `saveConfigBlob()` uses check-then-insert without transaction. Use `INSERT OR IGNORE` for multi-instance safety. *(POC: low urgency; HIGH before multi-worker deployment)* | Architecture / Reliability | low | high | UCM Review |
| **Cross-profile content hash policy**: Document or change behavior where identical content cannot exist across different profiles (may block copy/paste workflows). | Architecture / UX | low | med | UCM Review |
| **Remove dead API prompt tracking columns**: `PromptContentHash` and `PromptLoadedUtc` in `Jobs` table are never populated (web uses `config_usage` instead). Remove columns and migration 002, or decide to populate them. | Architecture / Cleanup | low | low | UCM Review |
| **Normalized database schema**: Create proper tables for Claims, Verdicts, Sources, Facts, ClaimFactSupport. Enables cross-analysis queries, trend analysis, citation networks. | Architecture / Data | low | med | Improvements #15 |
| **Comprehensive testing**: Unit tests (80% coverage), integration tests, E2E tests (Playwright), API tests (xUnit). | Testing / Quality | low | high | Improvements #16 |
| ~~Analyzer modularization plan~~: COMPLETE — CB pipeline built as separate modules (`claimboundary-pipeline.ts`, `verdict-stage.ts`). | Architecture | ~~low~~ done | low | Implemented in CB |
| **Auth migration sweep**: 14 admin config routes + 4 others use inline `===` for admin key comparison instead of shared `checkAdminKey` from `auth.ts`. Functionally equivalent for now; timing-unsafe. LOW urgency for POC; HIGH before production exposure. | Security / Architecture | low | high | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) (Code Review entry) |
| **LLM classification system docs**: Update Analyzer_Pipeline.md (remove pattern-based refs), create LLM_Classification_System.md, update Testing_Guide.md with edge case test examples. ~2-3h. | Docs / Architecture | low | low | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #5 |

---

## Future Research

| Description | Domain | Status | Reference |
|---|---|---|---|
| **Shadow Mode: Self-learning prompt optimization**: Observe LLM behavior across thousands of cases, detect inconsistencies, propose prompt improvements, A/B test variations. Requires 3+ months production data. | Analyzer / LLM | Design complete | [Shadow Mode Architecture](../WIP/Shadow_Mode_Architecture.md) |
| **Vector database integration**: Optional embeddings store for similarity detection and clustering beyond text-hash matches. Deferred pending evidence of need. | Architecture / Data | Assessment complete | [Vector DB Assessment](../WIP/Vector_DB_Assessment.md) |

---

## Notes

- **Quick wins** (combined):
  1. Parallel verdict generation → 50-80% faster
  2. Quality Gate UI display → transparency
  3. Cost quotas → financial safety *(low urgency for POC)*
  4. Admin authentication → security *(low urgency for POC)*

- **Cost optimization** (combined 70-85% reduction):
  - ✅ Budget defaults reduced: 25-40% savings (implemented 2026-02-13)
  - Batch API: 50% flat discount (next priority)
  - Prompt caching: 10-15% additional (stacks with Batch API)
  - NPO/OSS credits: $11K+/year potential
  - Claim caching: 30-50% savings on repeat claims
  - See: [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md)

- **Security items**: All marked LOW urgency while local POC, but HIGH importance. Must be HIGH urgency before any public deployment.

---

## References

- **Detailed Analysis**: `Docs/STATUS/Improvement_Recommendations.md`
- **Current Status**: `Docs/STATUS/Current_Status.md`
- **Architecture**: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/System%20Design/WebHome.xwiki`
- **Coding Guidelines**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Coding Guidelines/WebHome.xwiki`
