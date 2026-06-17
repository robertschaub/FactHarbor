# Pipeline Rebuild Phase 2 Source Inventory

**Date:** 2026-05-12
**Status:** Phase 2 inventory checkpoint, read-only
**Owner role:** Lead Architect
**Worktree:** `C:\DEV\FactHarbor-pipeline-rebuild-spec`
**Branch:** `codex/pipeline-rebuild-spec`

---

## 1. Purpose

This document records the source surfaces that must be reverse-engineered before designing the replacement pipeline. It is an inventory and boundary document, not the final current-pipeline baseline specification and not a target architecture.

No analyzer source, prompt, config, API, UI, test, or validation behavior was changed for this inventory. No tests, live jobs, or expensive validations were run.

## 2. Inputs Used

Primary governing inputs:

- `Docs/ARCHIVE/WIP/2026-05-12_Pipeline_Rebuild_Specification_Plan.md`
- `Docs/ARCHIVE/WIP/2026-05-12_Pipeline_Rebuild_Plan_Review_Consolidation.md`
- `Docs/ARCHIVE/WIP/2026-05-12_Pipeline_Rebuild_Phase1_Context_Summary.md`
- `Docs/AGENTS/Captain_Quality_Expectations.md`
- `Docs/AGENTS/benchmark-expectations.json`
- `Docs/AGENTS/report-quality-expectations.json`

Read-only specialist inventories:

- Orchestration and analyzer hot path: `019e1e0b-22b1-7461-8581-777fd0765fce`
- Prompt, config, model, and LLM surfaces: `019e1e0b-41f2-7891-9fb6-397db36c29e0`
- API, runner, ACS, reports, warnings, and events: `019e1e0b-621f-7dc0-b8a2-eee9d6c7ab60`
- Tests, benchmark expectations, and quality gates: `019e1e0b-7b58-7fe0-8d60-5756448682da`

## 3. Inventory Result

Gate 0.1 source-inventory scope is covered for Phase 2 entry: analyzer files, prompt/config/model surfaces, runner/API/persistence, ACS, report/export, warnings/events, and relevant tests are all included in the reverse-engineering scope.

Intentionally excluded source surfaces: **none yet**.

Important limitation: this document does not prove that every listed mechanism is still required. It only prevents the rebuild specification from accidentally omitting a surface. Later Phase 2 work must trace contracts and dependencies before Phase 3 classifies complexity as essential, accidental, stale, or risk-bearing.

## 4. Active Runtime Shape

Primary analyzer entry point:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- Main call: `runClaimBoundaryAnalysis(input)`
- Prepared ACS path: `prepareStage1Snapshot`, then rerun with prepared Stage 1 state and selected claims.

Current high-level sequence to reverse-engineer:

1. Config, provenance, metrics, input, and URL setup.
2. Stage 1 Understand: extraction passes, salience commitment, preliminary search, contract validation and repair, Gate 1, atomicity checks.
3. Early damaged-report exit if claim contract preservation fails.
4. Stage 2 Research: preliminary evidence seeding, targeted research, contradiction loop, search/acquisition/fetch/extraction, source reliability prefetch/backfill.
5. Applicability and evidence-balance pass, including contrarian retrieval when skewed.
6. Stage 3 ClaimAssessmentBoundary formation: scope normalization, LLM clustering, fallback/orphan handling, coverage matrix.
7. Evidence sufficiency gate: insufficient claims get `UNVERIFIED` fallbacks and skip Stage 4.
8. Stage 4 Verdict: LLM preflight, debate, grounding/direction validation, citation integrity, Gate 4 confidence.
9. Stage 4.5 source reliability calibration or legacy weighting.
10. Stage 5 Aggregation/report: weighted aggregation, article adjudication where applicable, narrative, quality gates, result JSON, markdown.

## 5. Analyzer Source Scope

### 5.1 Active Stage Files

These files are in the current analyzer hot path and require full contract tracing:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/research-query-stage.ts`
- `apps/web/src/lib/analyzer/research-acquisition-stage.ts`
- `apps/web/src/lib/analyzer/research-extraction-stage.ts`
- `apps/web/src/lib/analyzer/boundary-clustering-stage.ts`
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`

### 5.2 Active Shared And Cross-Cutting Files

These are active or likely active support surfaces and must be included in the baseline:

- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/pipeline-utils.ts`
- `apps/web/src/lib/analyzer/evidence-filter.ts`
- `apps/web/src/lib/analyzer/evidence-recency.ts`
- `apps/web/src/lib/analyzer/evidence-normalization.ts`
- `apps/web/src/lib/analyzer/evidence-deduplication.ts`
- `apps/web/src/lib/analyzer/source-reliability.ts`
- `apps/web/src/lib/analyzer/source-reliability-calibration.ts`
- `apps/web/src/lib/analyzer/sr-service-interface.ts`
- `apps/web/src/lib/analyzer/sr-service-impl.ts`
- `apps/web/src/lib/analyzer/scope-normalization.ts`
- `apps/web/src/lib/analyzer/jurisdiction-context.ts`
- `apps/web/src/lib/analyzer/acquisition-trace.ts`
- `apps/web/src/lib/analyzer/acs-research-observability.ts`
- `apps/web/src/lib/analyzer/confidence-calibration.ts`
- `apps/web/src/lib/analyzer/truth-scale.ts`
- `apps/web/src/lib/analyzer/json.ts`
- `apps/web/src/lib/analyzer/debug.ts`
- `apps/web/src/lib/analyzer/metrics.ts`
- `apps/web/src/lib/analyzer/metrics-integration.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/src/lib/analyzer/llm-provider-guard.ts`
- `apps/web/src/lib/analyzer/index.ts`
- `apps/web/src/lib/web-search.ts`

### 5.3 Prompt, Model, Config, And LLM Files

These surfaces define semantic-task behavior and must be traced with LLM Expert review:

- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/prompt-loader.ts`
- `apps/web/src/lib/analyzer/prompts/prompt-builder.ts`
- `apps/web/src/lib/analyzer/prompts/config-adaptations/structured-output.ts`
- `apps/web/src/lib/analyzer/llm.ts`
- `apps/web/src/lib/analyzer/model-resolver.ts`
- `apps/web/src/lib/analyzer/model-tiering.ts`
- `apps/web/src/lib/analyzer/config.ts`
- `apps/web/src/lib/config-loader.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/src/lib/config-storage.ts`
- `apps/web/configs/*.default.json`

Prompt inventory notes:

- `claimboundary.prompt.md` is UCM-seeded, version `1.0.9`, and currently has 32 required sections across Stage 1, Stage 2, Stage 3, Stage 4, Stage 5, source reliability, TIGER, narrative, grouping, and validation/adjudication tasks.
- Because the prompt is over 100KB, later reverse-engineering must use the AGENTS.md large-file exception: map section headers first, then read only target sections plus surrounding context.
- Runtime prompt path is stage code -> `loadAndRenderSection("claimboundary", section, vars)` -> `prompt-loader` -> `config-loader.loadPromptConfig("claimboundary")` -> SQLite `config_active/config_blobs`.
- Job startup records `promptContentHash` when `jobId` exists. Baseline work must capture both prompt key/section contracts and runtime provenance behavior.

LLM/model/config inventory notes:

- Current routing is mainly `llm.ts` plus `model-resolver.ts`; `model-tiering.ts` appears duplicate or legacy-adjacent but still imported by some surfaces.
- Most non-verdict LLM stages use AI SDK structured output with Zod schemas distributed across stage files.
- Stage 4 debate differs: it uses text generation, manual JSON parsing, recovery paths, and looser verdict parsers.
- UCM config types include `prompt`, `search`, `calculation`, `pipeline`, and `sr`; file-backed defaults in `apps/web/configs/*.default.json` remain authoritative for initial defaults.

### 5.4 Legacy-Adjacent Or Test-Only Candidates Requiring Verification

These files are not safe to remove now. They require dependency checks and contract tracing before classification:

- `apps/web/src/lib/analyzer/aggregation.ts`
- `apps/web/src/lib/analyzer/quality-gates.ts`
- `apps/web/src/lib/analyzer/budgets.ts`
- `apps/web/src/lib/analyzer/grounding-check.ts`
- `apps/web/src/lib/analyzer/format-fallback-report.ts`
- `apps/web/src/lib/analyzer/prompts/prompt-builder.ts`
- `apps/web/src/lib/analyzer/model-tiering.ts`
- `apps/web/src/lib/analyzer/test-cases.ts`
- `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`
- `apps/web/src/lib/analyzer/classification-fallbacks.ts`

Current working assumption: some of these are legacy-adjacent, exported through barrels, or used by ACS/tests rather than the core analyzer path. Phase 3 may classify them as stale or accidental only after Phase 2 proves their current consumers and compatibility value.

### 5.5 Complete Analyzer File List At Inventory Time

- `apps/web/src/lib/analyzer/acquisition-trace.ts`
- `apps/web/src/lib/analyzer/acs-research-observability.ts`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`
- `apps/web/src/lib/analyzer/aggregation.ts`
- `apps/web/src/lib/analyzer/boundary-clustering-stage.ts`
- `apps/web/src/lib/analyzer/budgets.ts`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/classification-fallbacks.ts`
- `apps/web/src/lib/analyzer/confidence-calibration.ts`
- `apps/web/src/lib/analyzer/config.ts`
- `apps/web/src/lib/analyzer/debug.ts`
- `apps/web/src/lib/analyzer/evidence-deduplication.ts`
- `apps/web/src/lib/analyzer/evidence-filter.ts`
- `apps/web/src/lib/analyzer/evidence-normalization.ts`
- `apps/web/src/lib/analyzer/evidence-recency.ts`
- `apps/web/src/lib/analyzer/format-fallback-report.ts`
- `apps/web/src/lib/analyzer/grounding-check.ts`
- `apps/web/src/lib/analyzer/index.ts`
- `apps/web/src/lib/analyzer/json.ts`
- `apps/web/src/lib/analyzer/jurisdiction-context.ts`
- `apps/web/src/lib/analyzer/llm-provider-guard.ts`
- `apps/web/src/lib/analyzer/llm.ts`
- `apps/web/src/lib/analyzer/metrics-integration.ts`
- `apps/web/src/lib/analyzer/metrics.ts`
- `apps/web/src/lib/analyzer/model-resolver.ts`
- `apps/web/src/lib/analyzer/model-tiering.ts`
- `apps/web/src/lib/analyzer/pipeline-utils.ts`
- `apps/web/src/lib/analyzer/prompt-loader.ts`
- `apps/web/src/lib/analyzer/prompts/config-adaptations/structured-output.ts`
- `apps/web/src/lib/analyzer/prompts/prompt-builder.ts`
- `apps/web/src/lib/analyzer/quality-gates.ts`
- `apps/web/src/lib/analyzer/research-acquisition-stage.ts`
- `apps/web/src/lib/analyzer/research-extraction-stage.ts`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/research-query-stage.ts`
- `apps/web/src/lib/analyzer/scope-normalization.ts`
- `apps/web/src/lib/analyzer/source-reliability-calibration.ts`
- `apps/web/src/lib/analyzer/source-reliability.ts`
- `apps/web/src/lib/analyzer/sr-service-impl.ts`
- `apps/web/src/lib/analyzer/sr-service-interface.ts`
- `apps/web/src/lib/analyzer/test-cases.ts`
- `apps/web/src/lib/analyzer/truth-scale.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`

## 6. External Contract And Compatibility Scope

### 6.1 API And Persistence

Reverse-engineering must include:

- `apps/api/Controllers/AnalyzeController.cs`
- `apps/api/Controllers/JobsController.cs`
- `apps/api/Data/Entities.cs`
- `apps/api/Services/JobService.cs`
- `apps/api/Services/RunnerClient.cs`

Contract notes:

- Public job creation is `POST /v1/analyze` with `inputType`, `inputValue`, optional `pipelineVariant`, and `inviteCode`, returning job status.
- Job detail/list exposes status, progress, input, result, and report; admin surfaces include commit hashes, prompt hash, prepared ACS JSON, and claim-selection JSON.
- `JobEntity` persists `ResultJson`, `ReportMarkdown`, verdict summary columns, ACS linkage, commit hashes, retry metadata, and hidden state.
- `JobService.StoreResultAsync` supports CB and historical shapes, including `verdictSummary`, `articleAnalysis`, and `twoPanelSummary`. Historical report support is an active compatibility requirement.

### 6.2 Runner Lifecycle

Reverse-engineering must include:

- `apps/web/src/app/api/internal/run-job/route.ts`
- `apps/web/src/app/api/internal/run-claim-selection-draft/route.ts`
- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/api/Program.cs`

Protective runner mechanisms to preserve or replace with reviewed equivalents:

- Authenticated internal runner calls.
- Queue and draft lanes.
- Background drain and immediate `202 accepted`.
- Process-global queue state.
- Watchdog, heartbeat, queue timeout, stale `RUNNING` failure, orphan `RUNNING` requeue, and `INTERRUPTED` recovery.
- Provider-health pause/resume.
- DB slot claim as authoritative `QUEUED -> RUNNING` transition.
- Terminal overwrite guard and best-effort cancellation/abort.

### 6.3 ACS And Prepared Stage 1

Reverse-engineering must include:

- `apps/api/Controllers/ClaimSelectionDraftsController.cs`
- `apps/api/Controllers/InternalClaimSelectionDraftsController.cs`
- `apps/api/Services/ClaimSelectionDraftService.cs`
- `apps/web/src/lib/claim-selection-client.ts`
- `apps/web/src/lib/claim-selection-draft-proxy.ts`
- `apps/web/src/lib/claim-selection-flow.ts`
- `apps/web/src/app/analyze/ActiveClaimSelectionSessions.tsx`
- `apps/web/src/app/analyze/select/[draftId]/page.tsx`
- `apps/web/src/app/analyze/select/[draftId]/ClaimSelectionPanel.tsx`
- `apps/web/src/app/api/fh/claim-selection-drafts/**`
- `apps/web/src/app/api/internal/run-claim-selection-draft/route.ts`

Compatibility notes:

- Durable draft state is `ClaimSelectionDraftState.version = 1`, including `preparedStage1`, caps, idle timeout, ranked/recommended/selected IDs, interaction timestamps, rationale, assessments, observability, and failure history.
- Confirmed draft jobs copy `preparedStage1` into `PreparedStage1Json` and compact metadata into `ClaimSelectionJson`.
- V2 must decide whether it can consume V1 prepared snapshots, migrate them, or explicitly invalidate them. This is a compatibility decision, not an implementation detail.

### 6.4 Reports, Exports, Warnings, And Events

Reverse-engineering must include:

- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`
- `apps/web/src/app/jobs/[id]/lib/event-display.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/src/components/FallbackReport.tsx`

Contract notes:

- Job page rendering probes multiple eras of result shape, including CB, legacy dynamic, and older multi-context structures.
- Export behavior includes rich CB HTML, historical fallback HTML, raw JSON export, and raw markdown export.
- `warning-display.ts` is the canonical display registry for `AnalysisWarningType`, but UI label/hint maps are not fully compile-exhaustive.
- Event timeline classification currently depends on string-prefix mapping of machine-generated messages. V2 must either preserve event strings or update the mapper deliberately.
- `generateHtmlReport` has weaker obvious test coverage than ACS/runner surfaces and has at least one drift risk: an export verdict mapping threshold differs from `truth-scale` / `JobService` documentation.

## 7. Quality Baseline And Test Scope

Quality baseline documents to preserve:

- `Docs/AGENTS/Captain_Quality_Expectations.md`
- `Docs/AGENTS/benchmark-expectations.json`
- `Docs/AGENTS/report-quality-expectations.json`

Current benchmark posture to preserve:

- 8 canonical families.
- Noise tolerance recorded as `8` percentage points.
- Active watch lanes include `asylum-235000-de`, `asylum-wwii-de`, and `bolsonaro-en`.
- Pending Q-code activation surfaces include `anchorTokens`, `minDistinctEvents`, `trueButMisleading`, and `crossLanguageVariantOf`.

Test surfaces to map into contract-level coverage:

- Orchestrator and stage integration: `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `claimboundary-prepared-stage1.test.ts`, `apps/web/test/integration/claimboundary-integration.test.ts`.
- Stage 1: claim contract validation, prompt contract, multi-event extraction, anchor override, repair anchor selection, contract revalidation fallback, classification fallbacks, preliminary-search dedupe.
- ACS: recommendation, flow, client, proxy, routes, page helpers, active sessions.
- Stage 2: query, acquisition, extraction, orchestrator, primary-source refinement, supplementary lane, warnings, recency.
- Evidence/SR/provenance: evidence filter, source reliability, backward compatibility, scope normalization, evidence quality assessment, SR evals.
- Stage 3: mostly embedded in `claimboundary-pipeline.test.ts`; no obvious direct `boundary-clustering-stage.test.ts`.
- Stage 4: verdict stage, verdict prompt contract, citation sanitization, parse artifacts, preflight, config, grounding, confidence calibration.
- Stage 5/report/aggregation: aggregation, job-page/report UI tests, fallback report, quality-health metrics, failure-mode metrics.
- Config/model/prompt: config drift, schemas, storage, loader, file loading, prompt frontmatter drift, prompt surface registry, LLM routing, provider guard.
- Runner/job lifecycle: internal runner queue, drain-runner pause, runner concurrency split, job lifecycle, jobs routes, system health.

Known test coverage gaps:

- Several modular files have no obvious direct tests and are covered only through monolithic pipeline tests or indirect consumers.
- The Stage 2 test for preliminary evidence not satisfying sufficiency before main research is skipped and delegated to expensive CB integration.
- Stage 1 intentionally trusts LLM semantic relevance for some quote-preservation checks; runtime checks provenance/self-consistency rather than semantic anchor relevance.
- Some Q-code checks are dormant until benchmark annotations are added.
- `generateHtmlReport` has no obvious dedicated contract test.

Expensive/live tests remain out of scope unless Captain explicitly approves them: `test:llm`, `test:neutrality`, `test:cb-integration`, `test:smoke`, `test:expensive`, calibration tests, validation batches, and promptfoo suites.

## 8. Immediate Phase 2 Risks

These risks should drive the next reverse-engineering passes:

- Stage 1 is very large and mechanism-heavy. Contract repair, Gate 1, salience, atomicity, and reprompt paths need a dedicated mechanism registry.
- Stage 4 has weaker structured-output enforcement than other stages and uses manual JSON recovery/parsing.
- Structured-output schemas are distributed across stage files, not centrally registered.
- Prompt monolith has section-level contracts but whole-prompt hashes dominate provenance.
- Model routing truth is split across `llm.ts`, `model-resolver.ts`, and `model-tiering.ts`.
- Some deterministic semantic-adjacent logic exists, especially in `config.ts` acronym extraction, context-type ranking, and short-answer phrase replacements. These must be reviewed against the LLM-intelligence rule.
- Warning/report compatibility crosses analyzer, UI, API, and persisted report boundaries.
- Runner lifecycle complexity is protective; it should not be removed without replacement verifiers.
- ACS prepared snapshots are durable compatibility inputs and cannot be ignored by a clean rebuild.
- Public `ResultJson` needs an explicit V2 adapter/version decision before implementation.
- Current tests are broad but coupled to V1 function names; V2 needs contract-level tests that survive a clean architecture.

## 9. Next Phase 2 Work

Next reverse-engineering outputs should be created in this order:

1. Stage 1 contract and mechanism registry: inputs, outputs, Gate 1, repair loops, ACS prepared snapshot contract, and test coverage.
2. Stage 2 evidence lifecycle baseline: search, acquisition, extraction, applicability, filtering, source reliability, provenance, warnings, and cost/latency surfaces.
3. Stage 3 boundary baseline: EvidenceScope normalization, ClaimAssessmentBoundary formation, coverage matrix, fallback behavior, and compatibility fields.
4. Stage 4/Gate 4 baseline: verdict task contracts, debate roles, citation integrity, confidence, repair, structured-output failure behavior, and source reliability calibration.
5. Stage 5/report compatibility baseline: aggregation, report JSON, markdown, HTML export, warnings/events, historical rendering, and persisted job compatibility.
6. Prompt/config/model baseline: prompt section map, structured schemas, UCM defaults, migration surfaces, provider/model routing, caching, retries, outage behavior, and multilingual mechanisms.
7. Test and quality baseline: contract-test translation plan, Q-code coverage map, comparator mapping, and later validation gates.

Deputy-team escalation is not needed for this inventory because no product/API/UI/report compatibility exception, validation spend, or high-risk design decision was made.
