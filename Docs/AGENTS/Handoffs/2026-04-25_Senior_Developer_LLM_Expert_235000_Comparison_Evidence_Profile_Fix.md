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

## Update 2026-04-25 - C35 Causality and Stage 1 Contract Fix

**Follow-up question:** Captain suspected `claimboundary.prompt.md` change `c35ff588b3892fa724a16fbf1c5a8fcffdf084ce` as the culprit for repeated `UNVERIFIED` reports on `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

**Conclusion:** `c35ff588` is a plausible contributor to the separate ACS selection/preparation issue family, but it is not the direct root cause of the later recurring `UNVERIFIED` sequence for this direct input.

### C35 Assessment

- `c35ff588` added the `CLAIM_SELECTION_RECOMMENDATION` prompt section and wired claim-selection recommendation into prepared draft flow.
- That can change which already-extracted candidates are recommended or auto-selected.
- It does not directly change claim extraction, contract validation, query generation, evidence extraction, applicability, or verdict prompts.
- The earliest bad job `322d3d80b3c04ee6b0d2a7a2916c5a6f` already had only one candidate claim. A selection recommender cannot create the missing second candidate after extraction has already produced one.
- Later recurring `UNVERIFIED` reports used two-claim structures and failed through citation-integrity or Stage 1 contract-preservation paths, not through the recommendation section added by `c35ff588`.
- Do not revert `c35ff588` prompt text alone. The runtime now expects the recommendation section; a removal would risk breaking prepared-session recommendation behavior.

### Additional Root Cause Found

After commit `8842be9809cfbc326b187dfd182ff2bdcc087d22`, live rerun `c3c516e435564f7abc6f15a098e7e3fb` still failed before research with `report_damaged`. The failure was Stage 1 contract validation, not verdict evidence handling:

- Stage 1 extracted `AC_01` for the current number and `AC_02` for the historical comparison.
- The contract validator rejected the comparison because `AC_02` necessarily referenced both sides of the relation.
- For a two-sided approximate quantitative comparison, some overlap is required to preserve the relation. Treating that overlap as semantic subsumption caused an unjustified damaged fallback.

First forward fix `0fc59a8072c772a4293da2ba6fcca234c2ff43dd` relaxed the comparison reference contract, but live validation `c642fbb4e2884c30b1c07a4b85c346c0` still returned `UNVERIFIED` with `report_damaged`. Failed-attempt recovery classification: **keep but insufficient**. The run showed Pass 2 produced a bad side-plus-relation triplet: one current-side claim, one standalone reference-side value claim, and one full relation claim.

Final forward fix `d76dd8b3515d299e69d38dc7f67001b1daba8c33` added generic prompt guidance against that triplet shape:

- For approximate two-sided quantitative comparisons, do not return side A, standalone side B, and a third A-vs-B relation claim.
- Return side A plus a companion claim that carries the reference-side relation to side A.
- If repair sees the triplet shape, fold the relation and approximation strength into the comparator/reference-side claim and remove the redundant whole-comparison claim.

### Validation

Focused tests passed after the final prompt fix:

- `npm -w apps/web test -- test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- Result: 79 passed.

Prompt reseed completed. Active prompt hash after reseed:

- `f8df3fe20f4ca76151d176879a9b0d5bfb4dd16e2e70a1e8193231465e7f89aa`

Clean live rerun:

- Job `15a12c3f114c455e95b667032594f968`
- Runtime commit `d76dd8b3515d299e69d38dc7f67001b1daba8c33+b24d10f8`
- Result: `SUCCEEDED`, verdict `MIXED`, truth `50.4`, confidence `62`
- `claimCount: 2`
- `evidenceItems: 26`
- No `report_damaged`
- No `verdict_integrity_failure`
- Warnings were info-level only: limited fetch failures, per-source cap, and evidence partition stats.

Final AtomicClaims:

- `AC_01`: `235000 Flüchtlinge leben in der Schweiz.`
- `AC_02`: `Am Ende des Zweiten Weltkrieges lebten in der Schweiz fast so viel Flüchtlinge wie heute (235000).`

The run is not a perfect report-quality endpoint, but it closes the observed unjustified `UNVERIFIED`/damaged-fallback path for this input.

### Debate / Review Disposition

- **Reviewer 1:** `c35ff588` is unlikely to be the direct root culprit. It changed prepared-session recommendation, not extraction or verdict integrity. The same prompt hash also produced non-`UNVERIFIED` outcomes later, which argues against a consistent direct prompt-section cause.
- **Reviewer 2:** The damaged rerun `c3c516e...` points to Stage 1 contract validation over-applying decomposition/subsumption rules to a quantitative comparison. The minimal forward fix should be generic comparison-overlap allowance and triplet prevention, not a rollback of `c35ff588`.
- **Reconciled decision:** Keep the prior evidence-handling and citation-integrity fixes. Keep `c35ff588`. Keep `0fc59a80` as a necessary contract relaxation. Keep `d76dd8b3` as the validated final prompt correction for the triplet extraction failure.

### Remaining Opportunities

- Stage 1 still needed retry/repair in job `15a12c3f...`, which cost about 1.5 minutes. Quality is fixed first; a future optimization should tune Pass 2 so this input shape lands in the repaired two-claim form on the first attempt.
- The clean rerun took about 12 minutes total. Most time was research, clustering, and verdict generation. If repeated, investigate clustering latency around large evidence-scope sets before lowering model quality.
- The `AC_01` evidence profile remains semantically narrow in this run: it focuses on recognized refugees with residence/settlement status while the user wording can imply a broader asylum-area population. That did not damage the report, but it can influence truth percentages and should be reviewed as a separate generic evidence-profile calibration task.
- Browser control remained unavailable in the resumed Codex context; live monitoring was performed via jobs/API/database inspection rather than the shared in-app browser.

## Update 2026-04-26 - SEM Current-Side Evidence and Failed Attempt Recovery

**Follow-up question:** Captain observed that two newer reports for the exact input still contain errors or fail to find/cite the official SEM evidence with the 235000+ `Personen aus dem Asylbereich` figure for the current side of the comparison.

### Validation Results

- Commit `393a8987` passed `expectedEvidenceProfile` into relevance/contract validation. Live job `55fdfa6d8d7149138c33d78354a92d9c` succeeded but still did not cite current-side SEM evidence in `AC_02`.
- Commit `f5219085` preserved current-side comparison evidence in more prompt paths. Live job `a04cfca20f414b9bb473586922c10f2e` succeeded with 2 claims, 51 evidence items, and no grounding/integrity warning.
- `a04cfca...` found and cited official SEM 2025/early-2026 current-side evidence for `AC_01`, including `Total Personen aus dem Asylbereich (inkl. Rückkehrunterstützung): 235.057 Personen (Ende 2025)` from `sem.admin.ch` / `cms.news.admin.ch`.
- `a04cfca...` still did **not** cite SEM/current-side evidence in `AC_02`; `AC_02` cited only historical/reference-side evidence. The claim contract had accepted a whole-comparison claim whose `freshnessRequirement` and `expectedEvidenceProfile` were historical-only.
- Commit `d7632d78` attempted to reject that whole-plus-side comparison split more strongly. Live job `a19ee1a1067a4e1db26a9b53569531ea` regressed to `UNVERIFIED`, confidence `0`, `report_damaged`, 0 boundaries, and no research after 16 LLM calls.

### Failed-Attempt Recovery Classification

- `f5219085`: **keep but insufficient**. It improved current-side evidence acquisition and made `AC_01` cite the SEM 235057 figure, but it did not force the comparison claim to carry current-side evidence obligations.
- `d7632d78`: **revert**. Its first focused live validation failed before research and worsened report quality relative to `f5219085`.
- Revert commit `14a6e015` removed only `d7632d78`'s prompt/test tightening. The active prompt hash after build/postbuild reseed returned to `e71861261405...`.

### Verification After Revert

- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
  - Passed: 171 tests.
- `npm -w apps/web run build`
  - Passed.
  - Postbuild prompt reseed changed claimboundary prompt back to hash prefix `e71861261405...`.

### Current State

The system is no longer left on the known-worse `report_damaged` prompt attempt. However, the exact SEM/current-side citation issue is **not fully closed**:

- The pipeline can find the official SEM `235057 Personen aus dem Asylbereich` evidence for the current-side claim.
- The comparison claim can still be accepted with a historical-only evidence contract, so its own citation arrays may omit the SEM/current-side evidence even when the evidence exists elsewhere in the same report.

### Recommended Next Step

Do not stack another broad prompt edit without live-run allowance. The safer next design is a narrower Stage 1 repair strategy for quantitative comparisons:

- Either produce a clean 2-claim shape where the companion comparison claim carries both-side evidence profile and freshest-side freshness, or produce a 3-claim shape with explicit current-side, historical-side, and relation claims.
- In either shape, the relation/comparison claim must be able to cite evidence for both comparison sides when both are present in the claim-local evidence pool.
- The validator should reject bad whole-plus-side shapes, but the repair path must reliably transform them instead of escalating to `report_damaged`.

No additional live job was submitted after `a19ee...` because the approved rerun budget for this phase was exhausted.
