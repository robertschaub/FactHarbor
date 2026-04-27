# 2026-04-27 - Lead Architect - SVP ACS Research Waste Investigation

**Role:** Lead Architect
**Agent:** Codex (GPT-5)
**Status:** Investigation complete; implementation not started
**Task:** Investigate whether large `AtomicClaim` candidate sets waste evidence-search time and money before/after claim selection, using the SVP PDF input as the motivating case.

## Executive Finding

The suspected waste is real, but the main mechanism is more specific than "Stage 2 researches unselected claims after ACS."

For draft-backed jobs, the runner validates `ClaimSelectionJson.selectedClaimIds`, passes them into `runClaimBoundaryAnalysis(...)`, and `buildPreparedResearchState(...)` filters `preparedUnderstanding.atomicClaims`, `preFilterAtomicClaims`, `gate1Reasoning`, `preliminaryEvidence`, and contract anchors before `researchEvidence(...)` runs. In other words, selected draft-backed final jobs do not appear to spend Stage 2 iterations directly on unselected candidate claims.

The waste and quality loss happen around selection:

1. Stage 1 preparation can produce very large candidate sets because article-like, contract-preserving inputs bypass the centrality cap in `selectClaimsForGate1(...)`.
2. Stage 1 preliminary evidence search/fetch/extraction runs before ACS and may support candidates later dropped by selection.
3. The draft persists only `PreparedStage1Snapshot.preparedUnderstanding` and metadata, not the fetched `state.sources` or full extracted source text from preparation. Final Stage 2 can seed selected preliminary evidence, but it cannot reuse the actual source records/full text fetched during preparation.
4. Final Stage 2 still has to research up to 5 selected claims inside a fixed research time budget. In the current SVP job, that budget expired before contradiction research ran, leaving an `UNVERIFIED` result with no contradiction iterations/sources.

## Concrete Evidence

SVP PDF final job inspected: `b8def4575c0749288a76c138838934d9`.

SQLite job/draft facts:

- Final job: `UNVERIFIED`, truth `48`, confidence `24`.
- Final job meta: `claimCount=5`, `llmCalls=38`, `mainIterationsUsed=4`, `contradictionIterationsUsed=0`, `contradictionSourcesFound=0`, `evidenceBalance.total=41`, `evidenceBalance.contradicting=0`.
- Draft: `1226a041334644eb8d641af78d0594cb`, `COMPLETED`, `candidateClaimCount=18`, `rankedClaimIds=18`, `selectedClaimIds=5`.
- Draft preparation time: `totalPrepMs=339159`, `stage1Ms=298938`, `recommendationMs=40205`.
- Other SVP drafts for the same URL prepared `34`, `50`, `38`, `18`, and current awaiting draft `25` candidates, always selecting/recommending `5`.

Relevant code anchors:

- `apps/web/src/lib/internal-runner-queue.ts:407-454` validates prepared snapshots and selected claim IDs before calling `runClaimBoundaryAnalysis(...)`.
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:764-865` filters prepared understanding to selected claim IDs before research.
- `apps/web/src/lib/analyzer/research-orchestrator.ts:588-624` starts research from `state.understanding.atomicClaims`, seeds preliminary evidence, then runs the main loop with fixed iteration/time/query budgets.
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts:1858-1868` sets preliminary search to `preliminarySearchQueriesPerClaim` and `preliminaryMaxSources`.
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts:3040-3064` returns all claims for article-like contract-preserving inputs instead of applying the centrality cap.
- `apps/web/src/lib/analyzer/types.ts:722-727` shows `PreparedStage1Snapshot` contains only resolved text, prepared understanding, and provenance; no source cache.
- `apps/web/src/lib/analyzer/types.ts:802-817` shows draft state persists the prepared snapshot and selection metadata, again without fetched sources.
- `apps/web/configs/pipeline.default.json:134`, `:165`, `:167` set current defaults: preliminary queries per claim `2`, contradiction reserved iterations `1`, research time budget `600000`.

## Recommended Architecture Path

### 1. Instrument Before Changing Semantics

Add run metadata that makes waste measurable:

- prepared candidate count, selected count, dropped count
- preliminary queries/fetches/evidence split by later-selected vs dropped claims
- preliminary source URL overlap with Stage 2 fetched URLs
- count/bytes of fetched preparation sources discarded before final job
- per-selected-claim research time, query count, evidence count, and sufficiency status
- whether contradiction loop was reached and whether time, query, or iteration budget prevented it

This is low-risk and should be added before any prompt or pipeline behavior change.

### 2. Persist And Reuse A Selected Preliminary Source Bundle

Extend the draft/final-job handoff with a bounded source bundle for preliminary evidence that survives selected-claim filtering. Suggested payload per source:

- URL, normalized URL, title, content type
- fetched-at timestamp, content hash, extraction method/provenance
- bounded extracted text/full text within existing source extraction limits
- linked preliminary evidence IDs and selected claim IDs

On final job start, reconstruct `state.sources` from this bundle before `seedEvidenceFromPreliminarySearch(...)`. Reuse should be conservative:

- Safe by default for exact URL document/data/PDF sources.
- HTML reuse should follow the same-family discovery/source-reuse boundary from the 2026-04-23 safe source reuse handoff.
- Stale or provenance-drifted bundles should fail closed or be ignored, consistent with prepared Stage 1 provenance validation.

This recovers real cost without changing the meaning of selected claims.

### 3. Reserve Time For Contradiction Research, Not Only Queries

Current code reserves contradiction iterations and queries, but the inspected job used all time in the main loop and ran `0` contradiction iterations. Add a time-reservation gate so main research cannot consume the entire budget before contradiction search. If the loop still cannot perform minimum contradiction work, emit a degrading `unverified_research_incomplete`/research-incomplete signal rather than treating the result as ordinary evidence scarcity.

### 4. Make ACS Recommendation Budget-Aware

The recommendation prompt already ranks candidates and recommends up to the cap. It should be allowed, and explicitly instructed/configured, to recommend fewer than `5` when the selected set cannot be responsibly researched within the active budget. This must remain LLM-powered and UCM-configurable. Do not implement deterministic topic/keyword heuristics.

Potential shape:

- `recommendedClaimIds` remains bounded by `maxRecommendedClaims`.
- Add/derive a budget risk assessment based on candidate count, evidence-yield assessment, source complexity, and available research budget.
- If risk is high, recommend the smallest set that preserves the central thesis and distinct dimensions.

This is a prompt/config behavior change and should go through LLM Expert review before landing.

### 5. Consider A Larger Two-Lane Stage 1 Redesign

Longer term, split Stage 1 evidence handling:

- Pre-ACS lane: minimal coverage/anchor search only, enough to preserve the input claim contract and avoid proxy drift.
- Post-ACS lane: claim-specific evidence search for selected claims only.

This is the larger fix for "research before selection" waste, but it touches the Stage 1 contract and Pass 2 evidence-grounded extraction design. It should not be the first implementation step.

## Proposed Priority

P0/P1:

- Add instrumentation for selected vs dropped preliminary work.
- Persist/reuse selected preliminary source bundles.
- Reserve contradiction time in the research budget.

P1/P2:

- Make ACS recommendation budget-aware and permit fewer than 5 selected claims when justified.
- Surface a clear research-incomplete warning if selected claims cannot receive minimum main plus contradiction coverage.

P2:

- Redesign Stage 1 into pre-ACS anchor extraction plus post-ACS selected-claim evidence research.

## Warnings

- No code changes were made in this investigation.
- No live rerun or expensive LLM validation was submitted. Live Job Submission Discipline would require commit plus runtime/config refresh before any new validation batch.
- Do not blindly restore a hard cap on article-like candidate extraction. The current bypass exists to preserve broad input contract coverage. The safer path is selection plus budget-aware scheduling/reuse.
- Do not add deterministic semantic filters or keyword-based claim dropping. Any selection, relevance, or meaning-based decision must remain LLM-powered and UCM-managed.

## Learnings

- For draft-backed ACS jobs, first check `PreparedStage1Json` and `ClaimSelectionJson` before assuming unselected claims reached Stage 2. The current selected-claim filter is already in place.
- The SVP `UNVERIFIED` case is better explained as preparation cost plus lost source reuse plus final research budget exhaustion than as direct Stage 2 research on unselected claims.
- Candidate-count variance for the same broad URL remains an adjacent open quality issue; it should be measured and stabilized separately from the source-reuse/budget issue.

## Suggested Next Agent

Lead Developer or Senior Developer should implement P0/P1 in small steps, with `/debt-guard` loaded before editing because this is a bugfix/performance-quality fix. LLM Expert should review any prompt/config change that makes ACS recommendation budget-aware.
