# FactHarbor Backlog

**Purpose**: Single canonical task list for FactHarbor. Keep this list current; keep `Docs/STATUS/Current_Status.md` high-level and link here.

**Last Updated**: February 22, 2026 (POC declared complete `v1.0.0-poc`; all remaining work is Alpha scope)

**Ordering**: Sorted by **Urgency** (high → med → low), then **Importance** (high → med → low).

**Phase note**: **POC is complete** (tagged `v1.0.0-poc`). FactHarbor is now in **Alpha phase**. Security/cost-control items remain **low urgency** during Alpha but are **high importance**. Reclassify to **high urgency** before any production/public exposure.

**See Also**: `Docs/STATUS/Improvement_Recommendations.md` for detailed analysis and implementation guidance.

---

## ClaimAssessmentBoundary Pipeline — Alpha Remaining Work

The ClaimAssessmentBoundary pipeline v1.0 is **production-ready** (POC complete, tagged `v1.0.0-poc`). All 5 stages implemented, 853 tests passing.

**Architecture document:** [ClaimBoundary_Pipeline_Architecture_2026-02-15.md](../WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md)
**Execution tracking:** [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md)

| Step | Description | Domain | Urgency | Status | Notes |
|------|-------------|--------|---------|--------|-------|
| **Phase 5i** | **Final cleanup**: V-01 (contextId in AnalysisWarning), V-09 (8 skipped budget tests) | Cleanup | med | NOT STARTED | Alpha polish |
| **Phase 5k** | **UI adaptations**: Admin config panel (24 CB params), coverage matrix + verdictNarrative + qualityGates components, xWiki diagrams | Web UI | med | NOT STARTED | Alpha polish |
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

## Recently Completed (February 21, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Calibration review hardening (2026-02-22b + carried fixes)**: `runIntent` metadata made legacy-safe (optional type), lane scripts now explicitly stamp run intent (`FH_CALIBRATION_RUN_INTENT` via smoke/gate runner), provider-attribution denominator cleanup, and legacy report refresh guard for missing `failureModes`. | Calibration / Reliability | 2026-02-22 | [Code_Review_2026-02-22b.md](../WIP/Code_Review_2026-02-22b.md), [Plan_Pause_Status_2026-02-22.md](../WIP/Plan_Pause_Status_2026-02-22.md) |
| ✅ **Calibration gate/smoke lane policy + wiring**: Added canonical run policy, consolidated significance tiers, and implemented `runIntent` metadata (`gate`/`smoke`) with lane-specific artifact prefixes. | Calibration / Governance | 2026-02-22 | [Calibration_Run_Policy.md](Calibration_Run_Policy.md) |
| ✅ **Calibration report model & search transparency**: Reports now show LLM provider, tiering, pipeline models, debate profile with per-role tier/provider/model, and search provider config. Backfilled all 5 existing reports. Pipeline `meta.modelsUsed` populated. Per-side search providers in pair cards. | Calibration / Observability | 2026-02-21 | Plan: `gentle-snuggling-quokka.md` |

## Recently Completed (February 20, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **C10 baseline complete + threshold ratified**: Quick + full calibration runs (10 pairs, 3 languages), Option C threshold policy ratified (C18 hard gate, skew diagnostic). Baseline v1 locked. | Calibration / Governance | 2026-02-20 | [Calibration_Baseline_v1.md](Calibration_Baseline_v1.md) |
| ✅ **Action #6: Verdict range + baseless challenge guard**: `truthPercentageRange` (consistency spread + boundary variance), `enforceBaselessChallengePolicy` (hybrid enforcement with deterministic revert), `baselessAdjustmentRate` metric. 943 tests passing. | Analyzer / Quality | 2026-02-20 | [Stammbach §5.1](../Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md) Action #6 |
| ✅ **Cross-provider debate routing**: `debateProfile` presets (baseline, tier-split, cross-provider, max-diversity), provider-level separation, fallback warnings in `analysisWarnings`. | Analyzer / Config | 2026-02-20 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |

## Recently Completed (February 17-19, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Documentation cleanup**: Archived Orchestrated Pipeline xwiki page, pre-Feb-13 changelog, stale `Documentation_Updates_2026-02-03.md`. Updated Pipeline Variants + Deep Dive Index xwiki pages for CB as current default. | Docs | 2026-02-19 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **Dynamic Pipeline schema fix**: Fixed `AI_NoObjectGeneratedError` in Monolithic Dynamic pipeline — `searchQueries` and `additionalInsights` relaxed to optional, retry wired, graceful degradation fallback added. | Analyzer / Quality | 2026-02-19 | [Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md](../AGENTS/Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md) |
| ✅ **Claim Fidelity Fix Phases 1+2**: Gate 1 `passedFidelity` check, Pass 2 prompt anchoring to user input, safety-net rescue. Phase 3 (evidence payload compression) and Phase 4 (baseline validation) still pending. | Analyzer / Quality | 2026-02-18 | [Handoffs/2026-02-18_Lead_Architect_Fidelity_Metrics.md](../AGENTS/Handoffs/2026-02-18_Lead_Architect_Fidelity_Metrics.md) |
| ✅ **Code Review Sprint (5 phases, 45 findings)**: New shared `auth.ts` (timingSafeEqual), `job-abort.ts` (globalThis), search hardening (cache + multi-provider + circuit breaker). Residuals: 10 test failures + auth migration sweep (see active backlog). | Architecture / Quality | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **AtomicClaim extraction Phases 1+2**: Prompt improvements + Gate 1 active filtering + dynamic max claims. Target ~40% reduction in LLM calls. Phase 3 validation with real LLM calls pending. | Analyzer / Cost | 2026-02-18 | [WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md](../ARCHIVE/AtomicClaim_Extraction_Improvements_2026-02-17.md) |
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
| ✅ **UCM Config for CB**: All 24 CB parameters added to UCM schemas with defaults. | Config | 2026-02-17 | [UCM Audit](../ARCHIVE/UCM_Configuration_Audit_2026-02-17.md) |

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
| **D1-D5 execution pause checkpoint**: Broader analysis/discussion hold is active. Resume implementation only from stable checkpoint after decision sync; avoid advancing B-* while pause is active. | Governance / Execution | high | high | [Plan_Pause_Status_2026-02-22.md](../WIP/Plan_Pause_Status_2026-02-22.md), [Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md](../WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md) |
| **Per-stage model tracking in pipeline**: `meta.modelsUsed` now captures understand/extractEvidence/verdict model names. Still missing: per-debate-role actual model tracking (advocate, challenger, etc.) and per-LLM-call cost attribution. Current implementation resolves models at config snapshot time; runtime tracking would detect fallback scenarios. Partial fix landed 2026-02-21 (Steps 1-7 of calibration model transparency). | Analyzer / Observability | high | high | Plan: `gentle-snuggling-quokka.md` |
| **C13 active rebalancing**: Implement evidence-pool rebalancing loop (beyond current detection). A/B target: ≥30% reduction in `meanAbsoluteSkew` vs Baseline v1 without quality regression. | Analyzer / Quality | high | high | [Stammbach §5.3 item 3](../Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md), [Calibration_Baseline_v1.md §6](Calibration_Baseline_v1.md) |
| **Cross-provider A/B calibration run**: Run `bias-pairs-v1` under `cross-provider` debate profile and diff against Baseline v1 to isolate provider-diversity impact on skew. | Calibration / Experiment | med | high | [Stammbach §5.3 item 4](../Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md) |
| **C17 adversarial benchmark + fail policy**: Build dedicated prompt-injection benchmark (≥10 scenarios, ≥2 languages) with ≥90% pass target and explicit fail-open/fail-closed policy. | Security / Quality | med | high | [Stammbach §5.3 item 5](../Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md), [Calibration_Baseline_v1.md §6](Calibration_Baseline_v1.md) |
| **Claim Fidelity Phase 4 — Validation**: Run baseline validation scenarios with real LLM calls to confirm Phases 1-3 fix eliminates claim drift. | Analyzer / Quality | med | high | [WIP/Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md](../WIP/Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md) Phase 4 |
| **Schema Validation — Gate 1 rebuild + telemetry + Pass 2 split**: Items #4-6. | Analyzer / Quality | med | high | [WIP/Schema_Validation_Implementation_Status_2026-02-18.md](../ARCHIVE/Schema_Validation_Implementation_Status_2026-02-18.md) |
| **xWiki Architecture Data Model rewrite**: Last Orchestrated holdout. Needs full rewrite to CB entities. | Docs | med | high | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) (Phase 3E entry) |
| **Code review test fixes**: Fix 10 failing search tests (~1h). | Testing | med | med | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) (Code Review entry) |
| **Dead Code Removal**: 879 lines across 7 files (~2-4h). | Cleanup | med | med | [QA Review](../ARCHIVE/QA_Review_Findings_2026-02-12.md) Priority 1 |
| **UCM AutoForm code review**: On `feature/ucm-autoform`, awaiting review before merge. | Web UI | low | med | [WIP/UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md](../ARCHIVE/UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md) |
| **AtomicClaim extraction validation**: Validate with real LLM calls (target ~40% cost reduction). | Analyzer / Quality | low | high | [WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md](../ARCHIVE/AtomicClaim_Extraction_Improvements_2026-02-17.md) |
| **LLM Text Analysis A/B Testing**: Run promptfoo tests (26 cases ready). | Analyzer / Testing | low | med | [Promptfoo Testing](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki) |
| **Parallel verdict generation**: Process claim verdicts in parallel in `verdict-stage.ts`. | Analyzer / Performance | low | high | CB architecture §8.4 |
| **Quality Gate UI display**: Show Gate 1/4 stats and failure reasons in results UI. | Web UI | low | high | Improvements #6 |
| **Claim-level caching**: Cache verdicts for reuse. Requires normalized DB schema. | Analyzer / Cost | low | med | Improvements #4 |
| **Doc Audit Phase 2: `opposingEvidenceIds` + `biasIndicator`**: Split from `supportingEvidenceIds`, surface `biasIndicator` in report. | Analyzer / Types | low | med | Prior doc audit initiative |
| **Classification confidence scoring**: Add confidence fields to types. | Analyzer / Quality | low | low | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #4 |
| **Edge case test coverage**: 15+ tests for ambiguous scenarios (~4-6h). | Analyzer / Testing | low | med | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #2 |
| **Baseline comparison dashboard row**: Show latest-vs-canonical deltas per calibration metric in Admin UI or report. | Observability / Calibration | low | med | [Calibration_Baseline_v1.md §9](Calibration_Baseline_v1.md) |
| **Provider/API incident flags per run**: Tag calibration runs with infra outage context so interpretation accounts for transient failures. | Observability / Calibration | low | med | Architect recommendation |
| **Calibration repeatability cadence**: Periodic re-run of full baseline to detect drift and infra regressions early. | Calibration / Operations | low | med | [Calibration_Baseline_v1.md §9](Calibration_Baseline_v1.md) |

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
| **Calibration report “run health” block**: Add infra health KPIs to calibration output (`infraFailureRate`, `fetchFailureRate`, `srEvalFailureRate`) and surface in JSON + HTML report header panel. | Observability / Calibration | low | med | Post-baseline telemetry hardening follow-up |
| **Calibration replay diagnostics**: Persist/report top failed URLs (top 20) with reason histogram in calibration JSON/HTML to speed incident triage. | Observability / Calibration | low | med | Post-baseline telemetry hardening follow-up |
| **Synthetic failure-injection calibration fixture**: Add a small intentionally broken URL/doc fixture set to continuously verify error bubbling + warning structure regressions. | Testing / Reliability | low | med | Post-baseline telemetry hardening follow-up |
| Persist metrics and cost estimates: tokens/search calls/cost estimation stored per job; basic admin view. | Observability | low | med | Existing |
| Error pattern tracking: persist structured error categories and frequency to inform prompt/code fixes. | Observability | low | med | Existing |

---

## Technical Debt & Architecture

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Config storage seeding race condition**: `saveConfigBlob()` uses check-then-insert without transaction. Use `INSERT OR IGNORE` for multi-instance safety. *(POC: low urgency; HIGH before multi-worker deployment)* | Architecture / Reliability | low | high | UCM Review |
| **Debate role config unification (post-baseline)**: Add a unified role-set config where each debate role is configured as a single `{ provider, model }` entry (instead of split provider/tier fields). Keep `debateProfile` + explicit override fields backward-compatible for at least one release, with migration mapping and Admin UI support. C10 baseline captured (2026-02-20). Safe to proceed. | Architecture / Config | med | med | Stammbach/Ash follow-up (post-baseline ergonomics) |
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
| **Shadow Mode: Self-learning prompt optimization**: Observe LLM behavior across thousands of cases, detect inconsistencies, propose prompt improvements, A/B test variations. Requires 3+ months production data. | Analyzer / LLM | Design complete | [Shadow Mode Architecture](../ARCHIVE/Shadow_Mode_Architecture.md) |
| **Vector database integration**: Optional embeddings store for similarity detection and clustering beyond text-hash matches. Deferred pending evidence of need. | Architecture / Data | Assessment complete | [Vector DB Assessment](../ARCHIVE/Vector_DB_Assessment.md) |

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
