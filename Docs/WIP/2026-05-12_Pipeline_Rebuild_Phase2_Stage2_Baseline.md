# Pipeline Rebuild Phase 2 Stage 2 Baseline

**Date:** 2026-05-12  
**Status:** Phase 2 factual baseline checkpoint, read-only  
**Owner role:** Lead Architect  
**Worktree:** `C:\DEV\FactHarbor-pipeline-rebuild-spec`  
**Branch:** `codex/pipeline-rebuild-spec`

---

## 1. Purpose

This document reverse-engineers the current Stage 2 evidence lifecycle of the ClaimAssessmentBoundary pipeline. It is factual baseline material for the later redesign. It is not a target architecture and does not approve implementation cleanup.

No analyzer source, prompt, config, API, UI, tests, live jobs, or validation behavior was changed or run for this baseline.

## 2. Source Scope

Primary files:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/research-query-stage.ts`
- `apps/web/src/lib/analyzer/research-acquisition-stage.ts`
- `apps/web/src/lib/analyzer/research-extraction-stage.ts`
- `apps/web/src/lib/analyzer/evidence-filter.ts`
- `apps/web/src/lib/analyzer/source-reliability.ts`
- `apps/web/src/lib/analyzer/acquisition-trace.ts`
- `apps/web/src/lib/analyzer/acs-research-observability.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/src/lib/report/generateHtmlReport.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/configs/pipeline.default.json`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/src/lib/analyzer/model-resolver.ts`

Relevant tests:

- `apps/web/test/unit/lib/analyzer/research-orchestrator.test.ts`
- `apps/web/test/unit/lib/analyzer/research-orchestrator-progress.test.ts`
- `apps/web/test/unit/lib/analyzer/research-query-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts`
- `apps/web/test/unit/lib/analyzer/source-acquisition-warnings.test.ts`
- `apps/web/test/unit/lib/analyzer/warning-display.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts`
- `apps/web/test/unit/lib/failure-mode-metrics.test.ts`

Specialist read-only baselines used:

- Stage 2 orchestration: `019e1e22-c62c-7972-b603-a3bb27ee2488`
- Stage 2 prompt/model/schema: `019e1e22-c685-71e2-8b8b-0c076a9dcfcf`
- Stage 2 compatibility/observability: `019e1e22-c6e2-7182-a302-20105f746556`

## 3. Current Stage 2 Boundary

The primary Stage 2 entry point is `researchEvidence(state, input.jobId)` from `runClaimBoundaryAnalysis`.

The current Stage 2 boundary is wider than the function name implies. It covers:

1. Remapping unresolved preliminary evidence to final AtomicClaim IDs.
2. Seeding retained preliminary evidence into the research evidence pool.
3. Iterative claim-driven search, relevance classification, source fetch, extraction, evidence filtering, and provenance tracking.
4. Reserved contradiction search.
5. Primary-source refinement.
6. Optional supplementary English retrieval lane for non-English inputs with evidence scarcity.
7. Batched source reliability lookup/backfill for evidence-linked sources.
8. Post-research warnings for budget, source collapse, and low evidence/source counts.
9. Post-research evidence balance checks and contrarian retrieval in `claimboundary-pipeline.ts`.
10. LLM applicability assessment before boundary clustering.
11. D5 evidence sufficiency gating before verdict generation.

For V2 planning, Stage 2 should be treated as the evidence acquisition and evidence admission subsystem, with post-research applicability and sufficiency as explicit boundary decisions.

## 4. State And Data Contracts

Core state is `CBResearchState` in `types.ts`. Stage 2 mutates or emits:

- `evidenceItems`
- `sources`
- `searchQueries`
- `queryBudget`
- `researchedIterationsByClaim`
- `contradictionIterationsByClaim`
- `claimAcquisitionLedger`
- `acquisitionTrace`
- `analysisWarnings`
- `llmCallCount`
- `languageIntent`

Important contracts:

- `EvidenceItem` carries `statement`, `category`, `claimDirection`, `directionBasis`, `evidenceScope`, `probativeValue`, `sourceType`, `sourceId`, `sourceUrl`, `sourceTitle`, `sourceExcerpt`, `searchStrategy`, `relevantClaimIds`, and later `claimBoundaryId`.
- `FetchedSource` carries source identity, full text, category, fetch status, search query, relevance score, and source-reliability fields.
- `SearchQuery` uses `searchProvider`, not `provider`.
- `ClaimAcquisitionLedgerEntry` records seeded counts, iteration entries, final evidence counts, direction counts, removals, and boundary concentration.
- `ClaimAcquisitionIterationEntry` records iteration type/lane, generated queries, search/fetch counts, evidence counts, losses, direction counts, and incomplete state.
- `AcquisitionTraceObservability` has bounded `sourceTrace` and `evidenceTrace`; trace helpers cap entry counts and text length and mark truncation.

Persisted report JSON currently exposes Stage 2 fields at top level, including `evidenceItems`, `sources`, `citedSources`, `searchQueries`, `claimAcquisitionLedger`, `analysisObservability`, `qualityGates`, and `analysisWarnings`. External/UI/report consumers therefore cannot be changed casually.

## 5. Current Stage 2 Sequence

`researchEvidence` currently runs this sequence:

1. Load pipeline, search, calculation, and source-reliability configs.
2. Emit config fallback warnings when fallback config was used.
3. Stop early when there are no AtomicClaims.
4. Run `remapUnresolvedSeededEvidence` for unresolved multi-claim preliminary evidence when enabled.
5. Run `seedEvidenceFromPreliminarySearch`.
6. Run the main research loop until abort, time budget, sufficiency, per-claim query budget exhaustion, zero-yield exhaustion, or no target claim.
7. Run the reserved contradiction loop.
8. Emit `selected_claim_zero_acquisition` when selected claims reached the verdict path but had no provider search attempts.
9. Batch source-reliability prefetch for evidence-linked URLs and backfill source/evidence reliability fields.
10. Emit post-research quality warnings for no sources, source acquisition collapse, low evidence count, and low source count.

After `researchEvidence`, `claimboundary-pipeline.ts` continues with Stage 2-adjacent evidence work:

1. Assess evidence balance.
2. Optionally run contrarian retrieval if the evidence pool is imbalanced.
3. Run `assessEvidenceApplicability`.
4. Recompute evidence balance after applicability can rewrite/filter evidence.
5. Proceed to boundary clustering.
6. Apply D5 sufficiency checks before verdict generation.

## 6. Query Generation

`generateResearchQueries` renders `GENERATE_QUERIES` from `claimboundary.prompt.md` and uses the `understand` model task.

Inputs include:

- `claim`
- `iterationType`
- `detectedLanguage`
- `inferredGeography`
- `relevantGeographies`
- `currentDate`
- `existingEvidenceSummary`
- `expectedEvidenceProfile`
- `freshnessRequirement`
- `distinctEvents`
- `queryStrategyMode`

The prompt returns 2-4 structured query plans with query text, rationale, retrieval lane, freshness window, and related metadata. Runtime then enforces freshness contract defaults and optionally sorts pro/con query order.

Current behavior to preserve or consciously replace:

- Query generation is LLM-semantic, not keyword-based.
- The runtime has deterministic fallback metadata when the LLM omits freshness fields.
- When detected language is missing, code falls back to `"en"`, which is a multilingual-risk hotspot.
- Query text carries language/geography intent; provider calls are not separately geo/language filtered.

## 7. Search, Relevance, And Acquisition

`runResearchIteration` executes generated queries and records every provider attempt in `state.searchQueries`.

Per query, Stage 2 currently:

1. Checks and consumes per-claim query budget.
2. Calls `searchWebWithProvider`.
3. Records search provider, result counts, claim ID, iteration, focus, retrieval lane, language lane, and freshness metadata.
4. Upserts search-provider warnings on provider errors.
5. Uses `classifyRelevanceWithJobCache` and `RELEVANCE_CLASSIFICATION` to select semantically relevant results.
6. Applies selection caps, including a first-pass breadth cap for main research.
7. Fetches selected sources through `fetchSources`.
8. Re-gates discovered follow-up sources with relevance classification.
9. Reuses already fetched/document sources where possible.
10. Deduplicates, throttles same-domain work, retries fetch failures, and records fetch warnings.

Primary-source refinement is a separate focus path after main iteration when current evidence suggests primary-source scarcity. It can generate additional refinement queries and now uses normal relevance fetch breadth rather than the main first-pass cap.

Supplementary English lane can run for non-English inputs when enabled, allowed for the current iteration type, and evidence scarcity conditions are met. Its evidence is visible through search/source fields but not fully represented in acquisition trace entries.

## 8. Extraction, Applicability, And Filtering

Extraction stages:

- `classifyRelevance` renders `RELEVANCE_CLASSIFICATION` and uses the `understand` model task.
- `extractResearchEvidence` renders `EXTRACT_EVIDENCE` and uses the `extract_evidence` model task.
- `assessEvidenceApplicability` renders `APPLICABILITY_ASSESSMENT` and uses the `extract_evidence` model task after research and contrarian retrieval.
- `assessScopeQuality`, `assessEvidenceBalance`, and `applyPerSourceCap` provide structural checks and caps.

Evidence admission flow inside research iteration:

1. Extract raw evidence from fetched sources.
2. Record raw source/evidence trace.
3. Assess scope quality.
4. Validate derivative-source metadata.
5. Filter by `probativeValue`.
6. Tag contradiction/contrarian search strategy where relevant.
7. Apply per-source evidence cap.
8. Admit kept evidence into `state.evidenceItems`.
9. Record admitted evidence trace and direction counts.

Applicability assessment then revisits the full evidence pool and assigns direct/contextual/foreign-reaction applicability, relevant claim IDs, and claim-local direction. If the applicability LLM call fails, current behavior keeps all evidence rather than failing closed.

Important direction boundary:

- Stage 2 `claimDirection` is authoritative for Stage 4 directional citation arrays.
- `directionBasis` is diagnostic/advisory.
- `EXTRACT_EVIDENCE` can use `contextual`; persisted evidence maps that to neutral behavior downstream.

## 9. Budgets And Sufficiency

Main controls come from pipeline/search/calc config:

- `maxTotalIterations`
- reserved contradiction iterations
- `claimSufficiencyThreshold`
- minimum main iterations
- minimum researched iterations per claim
- research time budget
- zero-yield break threshold
- contradiction reserved queries
- max sources per iteration
- relevance/fetch caps
- diversity-aware sufficiency settings

Claim target selection:

- `findLeastResearchedClaim` selects the next main research claim, optionally using diversity-aware sufficiency.
- `findLeastContradictedClaim` selects contradiction-loop targets.

`allClaimsSufficient` checks:

- minimum main iteration floor
- per-claim researched iteration floor
- evidence count threshold
- scoped evidence requirement
- optional diversity thresholds
- direct directional evidence
- seeded-evidence constraints

This is one of the densest complexity clusters in the current pipeline. V2 should preserve the quality intent, but not necessarily the current spread of counters, floors, and loop exits.

## 10. Source Reliability

Stage 2 does not run final source-reliability calibration. It does prefetch and backfill source reliability for evidence-linked URLs after search/extraction.

Current behavior:

- Collect only URLs linked to evidence items.
- Prefetch source reliability with cache, live-eval caps, runtime budget, root-domain fallback, and sync lookup.
- Emit `source_reliability_budget_limited` as info when live evaluation is skipped due to cap/budget.
- Emit `source_reliability_error` as info for infrastructure/API errors during prefetch.
- Backfill `trackRecordScore`, confidence, consensus, and evidence `sourceId` consistency.

Stage 4.5 `SR_CALIBRATION` is related but not Stage 2 proper. It should be baselined with the Stage 4/Gate 4 work.

## 11. Warnings And Failure Behavior

Stage 2 warning surfaces include:

- `search_provider_failure`
- `source_fetch_failure`
- `source_fetch_degradation`
- `budget_exceeded`
- `query_budget_exhausted`
- `selected_claim_zero_acquisition`
- `source_reliability_budget_limited`
- `source_reliability_error`
- `no_successful_sources`
- `source_acquisition_collapse`
- `low_evidence_count`
- `low_source_count`
- `insufficient_evidence`
- `per_source_evidence_cap`

Current severity behavior:

- Provider and source-reliability infrastructure issues are generally info unless they collapse quality.
- `query_budget_exhausted` is warning.
- `selected_claim_zero_acquisition` is error.
- Searches with no acquired evidence can emit `source_acquisition_collapse` as error plus `report_damaged`.
- Display classification is centralized in `warning-display.ts`.
- UI separates degrading quality warnings from operational/admin warnings.

V2 must preserve the repository rule that user-visible warning severity is based on verdict impact, not internal drama.

## 12. Prompt, Model, And Schema Baseline

Stage 2 prompt sections:

| Section | Runtime | Model task | Purpose |
|---|---|---|---|
| `GENERATE_QUERIES` | `research-query-stage.ts` | `understand` | Generate structured search query plans. |
| `RELEVANCE_CLASSIFICATION` | `research-extraction-stage.ts` | `understand` | Classify search results by relevance and jurisdiction fit. |
| `EXTRACT_EVIDENCE` | `research-extraction-stage.ts` | `extract_evidence` | Extract structured evidence items from source content. |
| `APPLICABILITY_ASSESSMENT` | `research-extraction-stage.ts` | `extract_evidence` | Reassess full-pool applicability and claim-local direction. |
| `REMAP_SEEDED_EVIDENCE` | `research-orchestrator.ts` | `understand` | Map preliminary evidence IDs to final AtomicClaim IDs. |
| `SCOPE_NORMALIZATION` | `scope-normalization.ts` | `understand` | Stage 2.5/Stage 3-adjacent scope equivalence grouping. |
| `SR_CALIBRATION` | `source-reliability-calibration.ts` | configurable strength | Stage 4.5 source-reliability confidence calibration. |

Default config:

- `modelUnderstand: "budget"`
- `modelExtractEvidence: "standard"`
- With default Anthropic provider, these resolve through `model-resolver.ts`.

Governance risks:

- Prompt frontmatter required sections include Stage 2 sections, but the frontmatter variable list omits several live Stage 2 placeholders.
- Prompt-loader behavior warns on unresolved/unknown variables rather than making all prompt-variable drift fatal.
- Prompt contract tests cover the main Stage 2 sections better than auxiliary sections.
- `extractEvidenceLlmTimeoutMs` is documented, but extraction itself does not pass that timeout; applicability does.

## 13. Multilingual And Input Neutrality

Current mechanisms:

- Query generation receives detected language and instructs the LLM not to default to English for non-English claims.
- Relevance, extraction, applicability, and remap prompts instruct the LLM not to assume English or require translation through English.
- Search provider calls rely on generated query text for language/geography intent.
- Supplementary English lane is optional and scarcity-triggered, not the default for non-English claims.

Current gaps:

- Missing detected language falls back to `"en"`.
- Stage 2 tests are mostly structural and English-shaped.
- No Stage 2-specific multilingual neutrality verifier exists in the safe unit-test surface.

## 14. Deterministic Semantic Hotspots To Review

These are not design decisions yet. They are baseline risks for Phase 3/4:

- Source-type/category mapping uses regex/string bucketing in shared pipeline utilities.
- Primary-source refinement need includes token overlap and metric text normalization.
- `directionBasis` hard-coded non-directional values can demote LLM-assigned claim direction.
- Scope-quality assessment uses deterministic vague-string checks.
- Preliminary evidence remap has deterministic single-claim and `claim_01` to `AC_01` style paths alongside LLM remap.
- Source-reliability importance filtering uses platform/TLD config plus digit/length heuristics.
- Runtime caps and sufficiency thresholds deterministically select from LLM-assigned fields; some are likely structural, but each needs semantic-leakage review.

Under the repository rules, V2 should not create new deterministic text-analysis decision logic. Any retained deterministic mechanism must be justified as structural plumbing or replaced by LLM intelligence.

## 15. Compatibility And Observability Constraints

Compatibility constraints:

- Report JSON schema currently emits `3.2.0-cb`.
- Job UI detects CB reports via `_schemaVersion`, `meta.schemaVersion`, or `meta.pipeline`.
- Static HTML report renders Stage 2 evidence, sources, quality gates, and search queries.
- Metrics readers still fall back from `analysisWarnings` to legacy `warnings`.
- `analysisObservability.acsResearchWaste` preserves modern and legacy selected-claim research fields.
- Prepared Stage 1 snapshots can carry acquisition trace and preliminary evidence into Stage 2.

Observed mismatch to carry forward:

- Static HTML search-query rendering reads `q.provider`, while the `SearchQuery` contract uses `searchProvider`.

Observability constraints:

- Acquisition trace is bounded and cloneable.
- Claim acquisition ledger is a key diagnostic surface for ACS/research waste.
- Supplementary English lane trace is incomplete compared with ordinary research search.
- Source/evidence trace truncation currently lacks focused standalone unit coverage.

## 16. Test Coverage

Covered:

- Orchestrator telemetry, cache behavior, source-reliability URL selection, progress, and first-pass breadth.
- Query generation freshness metadata and prompt rendering.
- Acquisition fetch behavior, domain short-circuiting, reuse/deduplication, HTML refetching, PDF parse failure, and source warnings.
- Relevance classification, extraction profile threading, applicability direction mapping, per-source cap, and extraction prompt variables.
- Warning display classification and severity normalization.
- Prompt contract checks for main Stage 2 sections.
- Legacy monolithic pipeline coverage for seed/remap, sufficiency, query variants, run iteration, and research budget.

Known gaps:

- No safe unit-level multilingual Stage 2 behavior test.
- No live/LLM validation was run for this baseline.
- No prompt-render contract for `REMAP_SEEDED_EVIDENCE`, `SCOPE_NORMALIZATION`, or `SR_CALIBRATION`.
- Source acquisition warning tests appear stale in places, including old implementation comments and threshold expectations.
- Backward compatibility tests cover `EvidenceItem` and config schema but not `analysisObservability`, `acquisitionTrace`, `claimAcquisitionLedger`, or `SearchQuery.searchProvider`.
- Failure-mode metrics tests cover degradation when source fetch severity is warning, while runtime source fetch warnings are currently emitted as info.
- Preliminary-evidence sufficiency coverage is partly delegated to expensive CB integration.

## 17. Current Protective Mechanism Registry

| Mechanism | Current purpose | Downstream dependency | Replacement verifier placeholder |
|---|---|---|---|
| Preliminary evidence remap | Preserve useful Stage 1 retained evidence after final claim IDs settle | Seeded evidence pool, ACS/prepared reuse | Remap contract tests and prepared-stage tests |
| Preliminary evidence seeding | Avoid redundant extraction and preserve early grounding | Research sufficiency, source/evidence trace | Seeded evidence lifecycle tests |
| Query generation | Create targeted retrieval plan | Search/acquisition quality | Query prompt contracts and benchmark retrieval checks |
| Relevance classification | Filter provider results semantically | Fetch breadth, evidence quality | Relevance tests and live comparator checks |
| Source acquisition | Fetch and reuse source content | Evidence extraction, report sources | Acquisition tests and source trace checks |
| Follow-up source discovery | Pull related same-family evidence | Source coverage | Acquisition follow-up tests |
| Evidence extraction | Convert source text into structured evidence | Verdict evidence pool | Extraction tests and report comparators |
| Scope quality assessment | Reject or mark vague evidence scopes | Boundary clustering and applicability | Scope/evidence tests |
| Probative filtering | Remove low-value evidence from admission | Verdict quality and confidence | Evidence filter tests |
| Per-source cap | Prevent one source from dominating evidence pool | Balance, report readability | Per-source cap tests |
| Main-loop sufficiency | Stop research once claims are adequately covered | Cost/runtime, evidence completeness | Sufficiency tests and benchmark stability |
| Contradiction loop | Reserve budget for contrary evidence | Evidence-weighted contestation | Contradiction query tests and report comparators |
| Primary-source refinement | Recover official/primary metric evidence when secondary evidence dominates | Report quality on current/statistical claims | Refinement tests and targeted canaries |
| Supplementary English lane | Recover evidence for non-English claims when local-language evidence is scarce | Multilingual robustness | Multilingual retrieval tests |
| Source-reliability prefetch | Populate source reliability before verdict use | Aggregation/calibration/report source trust | SR cache/prefetch tests |
| Applicability assessment | Reconcile full evidence pool to claim-local direction/directness | Boundary clustering, verdict citations | Applicability tests and direction consistency checks |
| D5 sufficiency | Gate unsupported claims before verdict generation | Gate 4/verdict quality | Sufficiency gate tests |
| Warning classification | Surface verdict-impacting degradation without noisy internals | UI/report trust | Warning-display tests and failure metrics |
| Acquisition trace/ledger | Preserve provenance and research-waste diagnostics | ACS, report QA, debugging | Trace/ledger compatibility tests |

## 18. Open Questions For Later Phases

These should not be decided inside the baseline:

- Should V2 expose Stage 2 as one evidence-acquisition service, or split search planning, source acquisition, evidence extraction, applicability, and sufficiency into separate ports/use cases?
- Should post-research applicability remain Stage 2, become Stage 2.5, or move into boundary formation?
- Which loop/budget controls are essential quality gates, and which are historical accretion?
- How should V2 preserve source/evidence provenance while reducing trace/ledger complexity?
- Should supplementary English retrieval become a clearer retrieval policy abstraction instead of an in-orchestrator branch?
- Should seeded evidence be a first-class evidence source type with explicit lifecycle states?
- Which deterministic hotspots need LLM replacement versus structural justification?
- What V1 report/JSON compatibility layer is required if internal V2 contracts are simplified?
- What is the migration policy for old reports and prepared Stage 1 snapshots carrying V1 Stage 2 shapes?

Deputy-team escalation is not needed for this baseline because no product/API/UI/report compatibility exception, validation spend, or target architecture decision was made.
