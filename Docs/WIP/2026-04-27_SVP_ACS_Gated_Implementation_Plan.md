# SVP ACS Gated Implementation Plan

**Date:** 2026-04-27
**Status:** Active implementation plan
**Owner role:** Lead Architect
**Source records:**

- `Docs/AGENTS/Handoffs/2026-04-27_Lead_Architect_SVP_ACS_Research_Waste_Investigation.md`
- `Docs/AGENTS/Handoffs/2026-04-27_Lead_Architect_SVP_ACS_Debate_Consolidation.md`

## 1. Purpose

Reduce broad-input AtomicClaim selection waste and avoid budget-exhausted `UNVERIFIED` outcomes where final selected claims do not receive enough contradiction research.

The motivating SVP PDF case showed:

- draft preparation can produce many candidate claims before selection;
- draft-backed final jobs already filter to selected claims before Stage 2;
- Stage 1 preliminary evidence work and fetched source state are not currently measured by selected-vs-dropped outcome;
- final Stage 2 can exhaust its time budget before contradiction work runs;
- source reuse is plausible but not yet proven safe or valuable.

Known baseline for sanity checks, not for hardcoding:

- SVP job `b8def4575c0749288a76c138838934d9`;
- `18` prepared candidates and `5` selected claims;
- `38` LLM calls;
- `4` main research iterations;
- `0` contradiction iterations and `0` contradiction sources;
- `41` evidence items, `0` contradicting evidence items;
- `budget_exceeded`;
- final result `UNVERIFIED`.

## 2. Consolidated Decision

Proceed with a gated plan.

Implementation-ready now:

1. shadow instrumentation for selected-vs-dropped preliminary work and Stage 1 -> Stage 2 source overlap;
2. UCM-configurable contradiction admission/reservation so main research cannot consume the entire budget before contradiction research.

Not implementation-ready yet:

1. persisted source artifact reuse from draft preparation into final jobs;
2. budget-aware ACS prompt/config behavior that recommends fewer than 5 claims;
3. two-lane Stage 1 redesign.

Those later items require metrics, safety design, and the reviews described below.

## 3. Non-Goals

- Do not restore a blind cap for article-like, contract-preserving inputs.
- Do not add deterministic text-analysis rules, keyword filters, language-specific heuristics, or topic-specific handling.
- Do not silently drop selected claims during final research.
- Do not enable source artifact reuse before overlap metrics and provenance/invalidation design exist.
- Do not change ACS prompt/config behavior without LLM Expert review.
- Do not submit live validation jobs until the relevant implementation has been committed and runtime/config state has been refreshed.

## 4. Implementation Slices

### Slice 1 - Shadow Instrumentation

Add metrics without changing analysis behavior.

Metrics are observability only. No Slice 1 metric may influence analysis behavior, claim selection, search behavior, evidence extraction, aggregation, or verdict generation.

Required measurements:

- prepared candidate count;
- selected claim count;
- dropped candidate count;
- preliminary query count, fetch attempt count, successful fetch count, evidence count, source URL count, and source text byte count;
- split preliminary work by selected claims, dropped claims, and unresolved/unmapped preliminary evidence;
- exact normalized URL overlap between Stage 1 preliminary sources and final Stage 2 fetched sources;
- overlap split by document/data source vs HTML source;
- per-selected-claim research cost: iterations, queries, fetch attempts, evidence items, elapsed time, and sufficiency state;
- contradiction reachability: whether contradiction research started, remaining time when main research ended, contradiction iterations used, contradiction sources found, and reason if contradiction work did not run.

Metric definitions:

- `preparedCandidateCount`: count of `AtomicClaim` candidates emitted for draft preparation before admin/user selection.
- `selectedClaimCount`: count of prepared candidate IDs selected for the final job.
- `droppedCandidateCount`: prepared candidates absent from the final selected claim set.
- `preliminaryWorkBySelectionState`: work attributed by stable candidate or `AtomicClaim` IDs only. If evidence or fetch work cannot be tied to a candidate ID structurally, classify it as `unmapped`. Do not infer attribution by text similarity, title similarity, domain, topic, or semantic matching.
- `sourceUrlCount`: distinct normalized URLs.
- `sourceTextByteCount`: UTF-8 byte length of extracted source text available to the pipeline, excluding metadata. Do not persist the text itself.
- `stage1ToStage2UrlOverlap`: exact string match on normalized URL only. No semantic, title, domain-family, same-family, or fuzzy matching in Slice 1.
- `sourceFamily`: structural classification from content type, URL/file extension, and fetch/extraction metadata only. Allowed values are `document`, `data`, `html`, and `unknown`.

Attribution rules:

- A prepared candidate is `selected` only if its ID is present in the final selected claim set for the job.
- A prepared candidate is `dropped` if it was generated during preparation but is absent from the final selected claim set.
- Preliminary evidence or source work with no stable candidate/claim ID goes into `unmapped`.
- If one preliminary source or evidence item is linked to both selected and dropped candidates, count it once in global totals and once in each linked bucket. Bucket counts are non-exclusive; global totals are deduplicated.

URL overlap rules:

- An existing URL normalization helper exists in `EvidenceDeduplicator.normalizeUrl()` (`evidence-deduplication.ts`). Extract it into a shared `normalizeUrl()` utility so both deduplication and overlap can use it.
- Extend the shared helper to also remove a trailing slash from the path (except bare `/`). Retain its existing tracking-param removal (`utm_*`, `ref`, `source`); the "preserve query parameters" clause means non-tracking params survive normalization.
- Do not add semantic URL matching, domain-specific rules, keyword rules, or same-family inference in this slice.
- `exact normalized URL overlap` means string equality after structural normalization.

`researchWasteMetrics` is the canonical location for cross-phase waste analysis. Existing `ClaimSelectionStage1Observability.candidateClaimCount` remains the Stage 1 preparation field. `researchWasteMetrics.preparedCandidateCount` may copy or derive that same value for final-job waste analysis, but the implementation must keep them in sync when both are present. Do not add a third candidate-count field.

Minimum `researchWasteMetrics` schema:

- `preparedCandidateCount`
- `selectedClaimCount`
- `droppedCandidateCount`
- `preliminaryTotals`: `{ queryCount, fetchAttemptCount, successfulFetchCount, evidenceItemCount, sourceUrlCount, sourceTextByteCount }`
- `preliminaryByOutcome`: `{ selected, dropped, unmapped }`, each with the same counter shape as `preliminaryTotals`
- `stage1ToStage2UrlOverlap`: `{ stage1UrlCount, stage2UrlCount, exactOverlapCount, documentOverlapCount, dataOverlapCount, htmlOverlapCount, unknownOverlapCount, normalizedOverlapUrls }`
- `selectedClaimResearch`: array keyed by selected claim ID with `{ claimId, iterations, queryCount, fetchAttemptCount, evidenceItemCount, elapsedMs, sufficiencyState }`
- `contradictionReachability`: `{ started, remainingMsWhenMainResearchEnded, iterationsUsed, sourcesFound, notRunReason }`

Likely anchors:

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/research-acquisition-stage.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/internal-runner-queue.ts`

Output location:

- Persist Slice 1 metrics under a single structured observability object in final job result metadata, preferably `analysisObservability.acsResearchWaste` if that naming fits existing metadata patterns.
- Draft observability may mirror preparation-only counters, but cross-phase metrics such as Stage 1 -> Stage 2 overlap must live on the final job because they require both phases.
- If no existing draft observability path can carry preparation-only counters cleanly, do not introduce new draft persistence in this slice.
- Persist only structural counters, claim IDs, normalized URLs, source-family labels, content byte counts, elapsed durations, and reason codes.
- Do not persist source text, source excerpts, fetched HTML, parsed document text, LLM prompt text, or LLM response payloads.

Acceptance checks:

- unit test metrics aggregation with selected, dropped, unmapped, and shared-source cases;
- unit test URL overlap with fragment removal, trailing slash normalization, query preservation, document source, data source, HTML source, and unknown source;
- unit test or snapshot-test that no source text/excerpts are persisted in `researchWasteMetrics`;
- `npm -w apps/web run build`;
- `git diff --check`.

### Slice 2 - Contradiction Admission

Make contradiction work protected rather than best-effort after main research.

Required behavior:

- add UCM-configurable contradiction admission settings in the pipeline config defaults and TypeScript schema, with JSON defaults kept in sync;
- settings must include concrete UCM fields for `contradictionAdmissionEnabled` (boolean), `contradictionProtectedTimeMs` (number, default 120000), minimum contradiction iterations or attempts, and warning behavior thresholds;
- all tunables must be visible in UCM and must not be environment variables;
- before starting another main-research iteration, check: `if (elapsedMs + contradictionProtectedTimeMs > researchTimeBudgetMs)`, transition from main research to contradiction research instead of starting that main iteration. Use the existing Stage 2 `researchTimeBudgetMs` as the budget value. This is a wall-clock check using a fixed configurable protected-time value; do not estimate iteration durations or derive the protected budget from observed averages. The existing query-budget reservation (`contradictionReservedQueries`) remains as a complementary count-based guard;
- `minimum contradiction opportunity` means the contradiction phase is entered and given at least the configured structural opportunity to issue contradiction-oriented research work for selected claims. It does not require finding contradicting evidence;
- if contradiction research cannot be attempted for selected claims because the remaining budget is already below the protected minimum, emit a degrading research-incomplete signal using the registered warning mechanism;
- the logic must not use deterministic semantic rules to decide whether a claim needs contradiction research;
- do not drop the selected claim. Return the best available evidence state plus the degradation signal;
- when enough budget remains, preserve existing main-research and contradiction behavior;
- preserve the warning policy: only surface user-visible degradation when report quality could materially differ.

Research-incomplete signal:

- Prefer the existing `unverified_research_incomplete` warning path if it already represents missed contradiction opportunity.
- If that warning does not fit, add a new registered warning type in `warning-display.ts`; do not emit inline UI text or classify warnings inside UI components.
- The warning payload must include selected claim ID when claim-specific, whether contradiction started, remaining time at main-research stop, and `notRunReason`.
- User-visible severity must follow the existing warning policy; admin-only metadata may still record the missed opportunity.

Acceptance checks:

- unit test where main research would consume the full budget; contradiction must either start for at least one configured opportunity or emit the registered research-incomplete signal;
- unit test where sufficient budget remains; existing behavior and warning output are unchanged;
- unit test where contradiction admission is disabled through UCM; existing behavior is unchanged;
- config drift test coverage must pass if UCM defaults are added;
- `npm -w apps/web run build`;
- `git diff --check`.

### Slice 3 - Metrics Review Gate

After Slices 1 and 2 land, review the metrics before enabling any source artifact reuse.

Review questions:

- How much preliminary work is spent on claims that are later dropped?
- How often do Stage 1 preliminary URLs overlap final Stage 2 URLs?
- Is overlap concentrated in document/data sources or HTML sources?
- Does contradiction admission reduce `UNVERIFIED`/research-incomplete outcomes without starving main evidence?
- Is same-URL candidate-count variance still a separate dominant issue?

Promotion rule:

- Slice 3 has three allowed outcomes: `stop source reuse`, `proceed to Slice 4 design only`, or `collect more metrics`.
- `stop source reuse` if exact URL overlap is low enough that saved fetch/extraction work would not materially reduce final-job budget pressure, or if most reusable overlap is HTML.
- `proceed to Slice 4 design only` if overlap is meaningful, repeatable across inspected jobs, and primarily document/data sources.
- `collect more metrics` if evidence comes from only one job, is dominated by run variance, or does not include the motivating SVP same-input case.
- Slice 3 must not approve implementation. It can only approve writing the Slice 4 source-reuse design.
- The review must record numerator/denominator values for URL overlap, source-family split, selected-vs-dropped preliminary work, contradiction reachability, and `UNVERIFIED`/research-incomplete outcomes.

### Slice 4 - Source Reuse Design Gate

Design only; do not enable broad reuse until the gate passes.

Minimum design requirements:

- source bundle schema with version, URL, normalized URL, source family, title, content type, fetched-at timestamp, content hash, extraction method, byte limits, and linked selected claim IDs;
- provenance validation consistent with prepared Stage 1 provenance;
- stale/invalidation behavior, including at minimum time-based invalidation and content-hash mismatch rejection;
- strict size limits;
- exact document/data source reuse first;
- HTML reuse disabled unless same-family discovery semantics are preserved or replaced;
- UCM feature flag/default behavior;
- focused tests for stale bundle rejection, hash mismatch, and document/data-only reuse.

Promotion rule:

- Passing Slice 4 authorizes implementation of document/data exact-URL source bundle reuse only, behind a UCM feature flag defaulting to disabled.
- Passing Slice 4 does not authorize HTML artifact reuse.
- Passing Slice 4 does not authorize semantic source matching, same-domain reuse, same-family HTML reuse, source discovery suppression, or claim-selection changes.
- HTML reuse requires a separate design review proving same-family discovery semantics are preserved or replaced.

### Slice 5 - Budget-Aware ACS Review

ACS may recommend fewer than the configured cap only after LLM Expert review.

Required semantics:

- no deterministic semantic filtering;
- no hidden claim dropping;
- explicit LLM-generated budget-fit rationale;
- explicit deferred-claim state for claims not selected due to budget pressure. Deferred claims remain visible as deferred, not failed, dropped, unimportant, or disproven;
- UCM-managed budget inputs and thresholds;
- UI/API behavior must make the reduced selection understandable to admins/users as appropriate.

Promotion rule:

- LLM Expert review is required before implementation, but review alone is not approval.
- Implementation may start only after the review explicitly approves the prompt/config/schema behavior and records allowed behavior, rejected behavior, required UCM fields, and required UI/API disclosure.
- Slice 5 must not reduce the broad-input claim contract. It may recommend fewer selected claims only through LLM-generated budget-fit rationale plus explicit deferred-claim state.
- No deterministic budget rule may silently cap, drop, rank, or filter claims based on claim text.

### Slice 6 - Stage 1 Two-Lane Redesign Fallback

Keep this as a fallback, not the next implementation slice.

Trigger conditions:

- metrics show pre-ACS preliminary evidence search is the dominant waste source; or
- same-URL candidate-count variance remains high enough to undermine ACS stability; or
- source reuse and contradiction admission do not materially improve budget-exhausted `UNVERIFIED` outcomes.

Potential direction:

- pre-ACS lane: text-first contract extraction and minimal anchor validation;
- post-ACS lane: evidence-assisted validation/research only for selected or LLM-prioritized claims.

This crosses Stage 1 semantics and requires Lead Architect plus LLM Expert review before implementation.

## 5. Risk Controls

| Risk | Control |
| --- | --- |
| Wrong root cause | Shadow instrumentation comes first; no source reuse or Stage 1 redesign before metrics. |
| Telemetry becomes expensive or bloated | Persist compact counters, hashes, URLs, and byte counts only; no full source text in Slice 1. |
| Contradiction protection starves main evidence | Make admission settings UCM-configurable and test unchanged behavior when sufficient budget remains. |
| Warning fatigue | Use existing warning-display policy; user-visible warnings only when report quality could materially differ. |
| Source reuse causes stale/provenance errors | Do not enable artifact reuse until schema, hashes, provenance, invalidation, and tests exist. |
| HTML reuse suppresses same-family discovery | Keep HTML artifact reuse disabled until discovery semantics are preserved or replaced. |
| Budget-aware ACS drops important claims | Require LLM Expert review, explicit rationale, and deferred-claim state; no silent dropping. |
| Article-like candidate explosion persists | Do not hard-cap blindly; use metrics, ACS, budget admission, and later Stage 1 redesign only if justified. |
| Main iteration duration variance | Protected contradiction time budget is a fixed configurable value, not derived from average iteration duration, so operators can tune for their deployment's fetch-latency profile. |
| Live validation runs stale code/config | Commit first, refresh runtime/config state, then submit live jobs. |

## 6. First Developer Handoff

Start with Slices 1 and 2 only.

Before editing:

- load and apply `/debt-guard`;
- read the two source handoffs linked above;
- inspect the listed code anchors;
- keep the implementation small and self-contained.

Do not implement source artifact reuse, ACS prompt/config changes, or Stage 1 redesign in the first branch.

## 7. Validation Plan

Local verification for Slices 1 and 2:

- focused Vitest for metrics attribution and overlap;
- focused Vitest for contradiction admission behavior;
- `npm -w apps/web run build`;
- `git diff --check`.

Live validation is not part of the initial local branch. If a live SVP rerun is needed later:

1. commit the implementation;
2. refresh runtime/config state;
3. submit the live job;
4. compare against stored SVP same-input history and the new instrumentation metrics.

## 8. Slice 3 Metrics Review - 2026-04-27 Live SVP Run

Live run:

- Draft `b041b493b1294bba8253ef807de88720`
- Final job `73fb6650d4674540bb91354e3705423f`
- Commit `b43f6b53a03222b293f6614e732bf080a3ae3d88`
- Input `https://www.svp.ch/wp-content/uploads/260324_Argumentarium-ohne-Q-A-DE.pdf`
- Result `LEANING-TRUE`, truth `58`, confidence `40`

Observed preparation and selection:

- Stage 1 prepared `28` candidate claims.
- ACS recommended and selected `5` claims: `AC_19`, `AC_23`, `AC_09`, `AC_04`, `AC_14`.
- Preparation took about `464s`: Stage 1 about `414s`, recommendation generation about `50s`.
- Preliminary Stage 1 work was `6` queries, `6` fetch attempts, `5` successful fetches, `15` evidence items, `5` source URLs, and `52,104` source-text bytes.

Observed waste and overlap:

- Final `researchWasteMetrics` correctly resolved `preparedCandidateCount=28`, `selectedClaimCount=5`, `droppedCandidateCount=23`.
- Preliminary evidence attributed to selected claims: `0` items.
- Preliminary evidence attributed to dropped claims: `11` items across `2` source URLs.
- Preliminary evidence unmapped: `4` items across `2` source URLs.
- Exact normalized Stage 1 to Stage 2 URL overlap: `0/5` Stage 1 URLs and `0/31` Stage 2 URLs.
- Source-family overlap was `0` for document, data, HTML, and unknown.

Observed Stage 2 budget behavior:

- Stage 2 produced `43` evidence items from `31` sources and `14` search queries.
- Research budget was exhausted after about `722s` against a configured `600s` budget.
- Only `3` of `5` selected claims received research iterations:
  - `AC_19`: `1` iteration, `4` queries, `12` fetch attempts, `17` evidence items, about `225s`, sufficient.
  - `AC_23`: `2` iterations, `5` queries, `19` fetch attempts, `11` evidence items, about `233s`, sufficient.
  - `AC_09`: `2` iterations, `5` queries, `14` fetch attempts, `15` evidence items, about `253s`, sufficient.
  - `AC_04`: `0` iterations, `0` evidence items, insufficient.
  - `AC_14`: `0` iterations, `0` evidence items, insufficient.
- Contradiction research did not start: `notRunReason=time_budget_exhausted`, `remainingMsWhenMainResearchEnded=0`.
- The run emitted both `budget_exceeded` and `unverified_research_incomplete`.

Slice 3 decision:

- Source artifact reuse is not justified by this live run. Exact overlap was zero, so document/data reuse would not have reduced the final-job budget pressure for this case.
- Proceed to Slice 4 source-reuse design is not warranted from this evidence.
- The next improvement should target budget fit, not source reuse. The live run shows that ACS selected more claims than the current Stage 2 time budget can research with contradiction opportunity.

Recommended next gate:

- Move to Slice 5 budget-aware ACS review/design before implementation.
- Review whether ACS should expose a budget-fit rationale and deferred-claim state, or whether operators should tune UCM values such as `claimSelectionCap`, `researchTimeBudgetMs`, and `contradictionProtectedTimeMs`.
- For unattended validation runs, temporarily setting `claimSelectionDefaultMode=automatic` is operationally useful, but it does not solve the budget mismatch by itself.
- Do not lower the broad-input claim contract or silently drop selected claims.

## 9. Slice 5 Review Outcome - 2026-04-27

Detailed design record:

- `Docs/WIP/2026-04-27_Budget_Aware_ACS_Slice5_Review_Design.md`

Reviewers:

- LLM Expert: `MODIFY before implementation`
- Senior Developer: approve design direction, not implementation yet

Consolidated outcome:

- Proceed with budget-aware ACS design as the next lever.
- Keep source artifact reuse stopped for now; the live SVP run had zero exact URL overlap, so reuse would not have reduced final-job budget pressure.
- Extend the existing ACS recommendation path instead of adding a second selector.
- Keep `claimSelectionCap` as an upper bound, not a target.
- Permit fewer-than-cap recommendations only when the batched ACS LLM reasons over the full final Stage 1 candidate set and returns explicit `budgetFitRationale` plus deferred-claim state.
- Persist deferred claims through draft state, final job metadata, and admin/debug surfaces. Deferred means budget-limited, not dropped, failed, disproven, unimportant, or hidden.
- Manual users may override by selecting deferred claims within the existing cap.
- Automatic mode may auto-confirm recommended IDs only if it also preserves budget-fit/deferred metadata.

Required implementation contract:

- Add budget-awareness behavior behind UCM, default guarded.
- Add optional schema fields such as `budgetFitRationale`, `deferredClaimIds`, and per-assessment `budgetTreatment`.
- Keep all semantic select/defer/rank decisions inside the batched ACS LLM output.
- Use structural budget arithmetic only as exposed context, never as an enforced semantic post-filter.
- Show reduced-selection reasoning in the UI/API, especially when automatic mode is active.

Required approval:

- Prompt/config behavior changes still need explicit Captain approval before direct code edits to `apps/web/prompts/claimboundary.prompt.md` or default-on behavior.

Operational mitigation before product implementation:

- For unattended validation runs, use a scoped UCM profile: set `claimSelectionDefaultMode=automatic`, then either lower `claimSelectionCap` to reduce breadth/cost or raise `researchTimeBudgetMs` and `contradictionProtectedTimeMs` to preserve breadth.
- Measure the profile with `analysisObservability.acsResearchWaste.selectedClaimResearch` and `contradictionReachability`.
- Treat this as reversible validation setup, not a product fix.
