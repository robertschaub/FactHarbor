---
roles: [Senior Developer, LLM Expert]
topics: [report-review, prompt-diagnosis, pipeline-debug, comparison-evidence, verdict-citations]
files_touched:
  - apps/web/prompts/claimboundary.prompt.md
  - apps/web/src/lib/analyzer/verdict-stage.ts
  - apps/web/src/lib/analyzer/claimboundary-pipeline.ts
  - apps/web/src/app/jobs/[id]/page.tsx
  - apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts
  - apps/web/src/lib/analyzer/research-extraction-stage.ts
  - apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts
  - apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts
  - apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts
  - apps/web/test/unit/lib/analyzer/verdict-stage.test.ts
---

### 2026-04-25 | Senior Developer / LLM Expert | Codex | 235000 Comparison Evidence Profile Fix

**Task:** Investigate and fix report degradation for the Captain-defined input `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` and related live jobs.

**Status:** Code and prompt fixes are committed on `main`. Clean live validation is still pending because two user-submitted jobs were running/queued when the fix landed; do not reseed/restart over them.

## Jobs Investigated

- `af9beb6e97b74ba8b7dffd70d64841ef` — `UNVERIFIED`, 51/24.
- `c1be8585ca434fa6bfc66f310d883d0b` — `LEANING-TRUE`, 59/24.
- `e55ebae59e924cdf9a961ad08a182384` — `UNVERIFIED`, 51/24.
- `04d7c59c4d7f45428fa3525d25f1e089` — `UNVERIFIED`, 55/24.

All four used older prompt hashes than the final fix and should be treated as diagnostic evidence, not validation of the final state.

## Root Causes

1. **Historical comparator evidence was extracted as neutral/contextual.**
   - The input has a current count and an approximate historical comparison.
   - Stage 2 often found relevant historical/reference figures but labeled them non-directional or contextual.
   - The verdict citation guard then correctly removed non-direct/neutral citations from decisive citation buckets.
   - This produced safe `UNVERIFIED` outputs and low confidence, but also exposed that decisive comparator evidence was not being preserved strongly enough.

2. **Expected evidence profile did not reach extraction/applicability.**
   - Stage 1 can derive `expectedEvidenceProfile`, including intended metric route and comparator class.
   - Before the fix, Stage 2 `EXTRACT_EVIDENCE` did not receive that profile.
   - `APPLICABILITY_ASSESSMENT` also did not see claim evidence profiles or evidence-side `claimDirection` / `evidenceScope`, so it could blur source-native comparator routes.

3. **Metric dimension was accepted but dropped.**
   - `Stage2EvidenceItemSchema` accepted `evidenceScope.analyticalDimension`.
   - The mapper into runtime `EvidenceItem.evidenceScope` did not copy it, so downstream applicability/clustering could lose the metric class.

4. **Full source inventory was overwritten by cited-only source inventory.**
   - A prior issue in the same report-review thread made reports understate fetched sources once cited sources were selected.
   - That is now fixed by preserving `sources` and introducing `citedSources` for UI/export citation panels.

## Fixes Landed

### Commit `338218cd` — `fix(pipeline): repair comparison verdict evidence handling`

- Added prompt guidance for approximate numeric comparisons so source-native reference totals can remain direct comparator evidence when the relationship is clear.
- Passed evidence items into verdict reconciliation so reconciliation cannot reason about citation buckets without the evidence pool.
- Preserved full fetched `sources` and added separate `citedSources` for display/export.
- Added clustering/verdict completion events for better monitor progress.

### Commit `672693e0` — `fix(pipeline): carry evidence profiles through extraction`

- `extractResearchEvidence()` now passes `expectedEvidenceProfile` into `EXTRACT_EVIDENCE`.
- `assessEvidenceApplicability()` now passes claim `expectedEvidenceProfile` plus evidence `claimDirection` and `evidenceScope` into `APPLICABILITY_ASSESSMENT`.
- Runtime mapping now preserves `evidenceScope.analyticalDimension`.
- Prompt contract tests cover the new prompt variable and applicability context.

## Debate / Review Disposition

- **Advocate:** The fix is generic, LLM-centered, and consistent with AGENTS.md. It reuses existing LLM-derived claim metadata instead of adding deterministic German/topic-specific logic.
- **Challenger:** Prompt plumbing alone does not prove the issue is closed; the exact Captain input still needs a clean post-restart live rerun. The profile must guide extraction but not substitute for evidence.
- **Reconciler:** Keep the fix, preserve `analyticalDimension`, and validate with a clean rerun after commit, reseed, and restart. Success means no citation-integrity collapse on the comparison claim; the final verdict may still be `UNVERIFIED` if evidence is genuinely insufficient, but it should not be caused by dropped comparator metadata.

## Verification Completed

- `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/claimboundary-pipeline.test.ts test/unit/lib/analyzer/verdict-stage.test.ts`
  - Passed: 677 tests, 1 skipped.
- `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
  - Passed: 84 tests.

## Pending Clean Validation

1. Wait until user jobs `b633678632104d6288f89cf0a6e80831` and `d18a9099d7eb423492047220913a1bd4` are no longer running/queued.
2. Run `npm -w apps/web run build` or reseed prompts explicitly.
3. Restart services only after the queue is idle.
4. Submit one clean rerun of the exact Captain input.
5. Inspect AC_02 for:
   - preserved historical comparison AtomicClaim,
   - direct comparator evidence with valid citations,
   - no `verdict_integrity_failure` / `verdict_citation_integrity_guard` collapse caused by neutral/contextual citation buckets.

## Warnings

- Do not claim all root causes are closed until the clean live rerun is inspected.
- Local queue delay is currently explained by `FH_RUNNER_MAX_CONCURRENCY=1`; this is an ops/config setting, not a pipeline bug.
- Older live jobs with `gitCommitHash: null` or dirty runtime state remain useful for diagnosis but not as clean validation evidence.
