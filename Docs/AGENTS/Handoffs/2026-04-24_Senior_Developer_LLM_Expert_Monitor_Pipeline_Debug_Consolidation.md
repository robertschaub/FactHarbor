---
roles: [Senior Developer, LLM Expert]
topics: [monitor, pipeline-debug, selection-readiness, verdict-citations, runner]
files_touched:
  - Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_LLM_Expert_Monitor_Pipeline_Debug_Consolidation.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md
  - Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_Runner_Diagnostics_Pipeline_Improvements.md
  - Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md
  - Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_LLM_Expert_Pipeline_Integrity_Fixes.md
  - Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Verdict_Citation_Guard_Live_Validation.md
  - Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_LLM_Expert_Stage1_Distinct_Events_Validator_Context.md
---

### 2026-04-24 | Senior Developer / LLM Expert | Codex | Monitor Pipeline Debug Consolidation

**Task:** Consolidate all issues, findings, opportunities, imperfections, analysis, solution options, proposals, and important operational facts seen during the monitor/pipeline-debug session.

**Files touched:** This handoff, `Docs/AGENTS/Agent_Outputs.md`, `Docs/STATUS/Current_Status.md`, and `Docs/STATUS/Backlog.md`.

**Key decisions:** Treat the session as partially successful, not closed. Several root causes were fixed and validated, but the session also produced open work that must remain visible: Stage 1 time-to-selection, broad-input Stage 1 quality, Stage 2 evidence lifecycle/provenance invariants, runtime provenance drift, `SUCCEEDED` plus progress `99`, long clustering/reconciler heartbeat gaps, warning materiality, and browser-control tooling fragility.

**Open items:** See "Current Open Items" and "Implementation Order" below. The strongest next engineering slice is still observability plus evidence/citation integrity, followed by Stage 1 latency and targeted broad-input quality work.

**Warnings:** Do not claim "all root causes are fixed." Do not optimize by adding deterministic semantic heuristics. Do not rerun live validation against stale source, prompt, config, or dirty runtime state. Older jobs remain useful for diagnosis but not as clean validation of later commits.

**For next agent:** Start from `Docs/STATUS/Backlog.md` section "Immediate Priorities (2026-04-24 Monitor Session)" and this handoff. The highest-priority implementation path is `MON-EVID-1` / `MON-VCI-1` / `MON-STG1-LAT`, with prompt edits requiring Captain approval.

**Learnings:** Not appended to `Role_Learnings.md`; the durable session learning is captured here: API-side runner slot claiming is required because process-local Next.js state is not a reliable concurrency boundary.

## Session Scope

The session covered:

- live monitor review of analysis jobs and claim-selection drafts
- Stage 1 preparation failures and retries
- manual Atomic Claim Selection behavior, including SVP PDF selection
- runner queue behavior and concurrency
- report markdown and warning display behavior
- verdict citation integrity and stale diagnostic warnings
- live validation jobs on Captain-approved inputs
- current pipeline improvement planning for quality, speed, and cost
- branch/current-worktree sanity: work remained on `main`; no pull or push was performed

## Fixed Or Closed During The Session

1. **Branch/current branch confusion**
   - Work was kept on `main`.
   - No destructive git operation, pull, or push was performed.
   - The branch is ahead of `origin/main`; that is a local state fact, not evidence of a remote branch dependency.

2. **Report markdown stub and warning display**
   - The prior markdown stub was replaced with a real ClaimAssessmentBoundary markdown formatter.
   - User-facing report markdown now hides `info` diagnostics from `Quality Signals` and records them as admin diagnostics.
   - A clean post-commit job `d1689dfbd8ff46d98e76730bfd16fafb` validated that the stub was gone and no user-visible warnings were emitted for admin-only diagnostics.

3. **Stale verdict direction diagnostics**
   - Stale pre-repair `verdict_direction_issue` warnings are no longer emitted after successful repair.
   - Remaining direction/citation diagnostics need to be evaluated under the warning materiality rule.

4. **Runner concurrency and queue behavior**
   - Runner execution now claims work through an API-side SQLite transaction before starting analysis.
   - This prevents process-local Next.js state from violating `FH_RUNNER_MAX_CONCURRENCY`.
   - Local `FH_RUNNER_MAX_CONCURRENCY=1` explains some queue latency; it is expected, not a bug, unless the Captain wants higher local concurrency.

5. **Prepared Stage 1 retry diagnosis**
   - Prepared Stage 1 failures now preserve failure history for retry diagnosis.
   - Retry paths can be inspected instead of losing the first-failure context.

6. **Stage 2 relevance reuse and budget signal**
   - Exact same-run relevance classifications are reused.
   - Contradiction research time-budget exhaustion now emits explicit `budget_exceeded` / query-budget warning signals rather than silently disappearing.

7. **Claim-selection stale seed problem**
   - `resolveInitialClaimSelection` now prefers current recommendations until there is evidence of real user interaction.
   - This prevents stale `selectedClaimIds` from masking recommended claims.

8. **Verdict citation integrity guard**
   - `enforceVerdictCitationIntegrity` removes structurally invalid, non-direct, and bucket-mismatched citations.
   - Decisive-side citation collapse now downgrades directional verdicts safely to `UNVERIFIED`, limited to 7-band directional ranges.
   - Do not broaden this back to any `truthPercentage > 50` / `< 50` condition; that failed focused validation.

9. **Live validation after citation guard**
   - Four Captain-approved live jobs were monitored.
   - `d29fd298` Bolsonaro EN: `LEANING-TRUE` 63/55, no `verdict_citation_integrity_guard`.
   - `6c23a1bd` hydrogen: `FALSE` 9/75, no guard warning.
   - `e16ed62f` plastic: `MIXED` 48/67, no guard warning.
   - `322d3d80` Swiss comparison: `UNVERIFIED` 50/0, warning-level evidence scarcity signals; ran under later dirty runtime and is operational evidence only.

10. **SerpApi starter sufficiency**
    - SerpApi is not active in local/deployed primary search ordering.
    - Starter tier is enough as fallback for one regular user, not enough as primary search for frequent daily full analyses.

## Current Open Items

1. **Stage 1 time-to-selection remains open**
   - Heavy URL/PDF/article inputs still spend about 60-122s in Stage 1 preparation before selection.
   - The root cause is the full evidence-seeded Stage 1 path, not just the recommendation call.
   - Continue same-semantics latency work only: exact same-job successful fetch/relevance reuse, better diagnostics, and fail-fast accounting.

2. **Broad-input Stage 1 quality remains open**
   - Broad political/article inputs can still omit thesis branches, bundle consequences, or fail contract preservation.
   - Fix only from concrete failing packets. Do not weaken contract validation to reduce failures.

3. **Stage 2 evidence lifecycle/provenance invariants remain open**
   - Live jobs showed category normalization/fallbacks, per-source cap drops, source reconciliation deltas, and directness/applicability label inconsistencies.
   - These are verdict-safety issues because evidence can silently pass downstream.

4. **Stage 3 concentration and long clustering plateaus remain open**
   - Large evidence pools showed long clustering plateaus.
   - Boundary concentration metrics remain needed before semantic clustering fixes.

5. **Runtime provenance drift remains open**
   - Some live validation jobs executed under dirty or later runtime commits than their prepared-stage provenance.
   - Future live validation must commit first, restart/reseed as needed, submit after refresh, and record exact `executedWebGitCommitHash`.

6. **`SUCCEEDED` with progress `99` remains open**
   - Job `e16ed62f` completed with terminal status but progress `99`.
   - This is likely a persistence/progress-finalization issue, not an analysis-quality signal, but it harms monitor trust.

7. **Heartbeat/progress gaps remain open**
   - Clustering and reconciler stages can sit visibly idle for minutes.
   - Add stage heartbeats or sub-stage progress so the browser monitor does not look hung.

8. **Warning materiality cleanup remains open**
   - Any warning must pass the AGENTS materiality test.
   - Admin-only diagnostics should not appear as user-facing quality signals.
   - Material degradation must not be hidden as `info`.

9. **Deterministic semantic hotspot remains open**
   - `claimNeedsPrimarySourceRefinement()` still uses token-overlap text-meaning logic.
   - Do not extend it. Replace with batched LLM coverage assessment in a separate, quality-affecting change.

10. **Cross-session prepared snapshot reuse remains deferred**
    - Provenance-only groundwork is acceptable.
    - Live reuse remains deferred until exact prompt/config/commit/input identity and freshness rules are approved.

11. **Browser-control tooling remains imperfect**
    - The in-app browser could be navigated and DOM-snapshotted earlier, but CDP screenshot capture timed out after service restart.
    - In the resumed context, Browser Use was restored through the Node REPL `iab` backend and the app was opened at `http://localhost:3000/jobs`.
    - This remains a tooling/session monitoring item, not a FactHarbor app root cause.

12. **API-side test harness gap remains**
    - Some claim-selection draft/service state-machine behaviors still lack direct API-side tests because the repo does not yet have a dedicated API test project.

## Solution Options And Proposals Captured

### Adopted / Implemented

- API/SQLite runner slot claim instead of process-local concurrency state.
- Real report markdown formatter plus warning-display separation.
- Citation sanitation plus safe downgrade for collapsed decisive citation sides.
- Current recommendation preference over stale seeded selection until real interaction.
- Same-run exact relevance reuse and explicit budget exhaustion warning.
- Prepared Stage 1 failure-history retention for retry diagnosis.

### Recommended Next Slice

1. Add Stage 2 evidence lifecycle invariants: source identity, evidence item provenance, category/schema normalization counts, per-source cap-drop accounting, reconciliation deltas, and explicit admission/drop reasons.
2. Extend verdict citation-integrity validation for missing, invalid, non-direct, challenge-invalid, and bucket-mismatched IDs before storage/reporting.
3. Add relevance/applicability failure counters and warning materiality plumbing so classifier failures cannot silently admit evidence.
4. Add Stage 1 retry/repair diagnostics: failed contract field, retry branch, repair time, final branch attribution, and fail-fast accounting.
5. Add Stage 3 concentration metrics and long-stage heartbeats without changing clustering semantics yet.
6. Add per-stage cost/timing fields where still missing.

### Deferred / Rejected For Now

- Do not redesign Stage 1 into text-first extraction for the current ACS path.
- Do not disable ACS recommendation; it is not the main latency driver and supports idle auto-continue.
- Do not enable cross-session prepared snapshot reuse until the exact reuse contract is approved.
- Do not start broad prompt expansion without a failing packet and Captain-approved topic-neutral prompt delta.
- Do not add deterministic keyword, regex, Jaccard, or token-overlap semantic logic to stabilize analysis.
- Do not downgrade models, reduce debate roles, prune search, or make EN supplementary default-on without a fresh baseline and approval.

## Important Job And Commit Anchors

- Key implementation commits in this monitor sequence: `7dc497ca`, `9b2d726d`, `ef9a3b05`, `ba39b52e`, `b25c3c74`.
- Clean post-runner-claim validation: `d1689dfbd8ff46d98e76730bfd16fafb` on `ba39b52eef22336235aa6acafc8a0cb6c4191241+1586b2ba`, `LEANING-TRUE` 68/70.
- Guard live-validation jobs: `d29fd298`, `6c23a1bd`, `e16ed62f`, `322d3d80`.
- SVP/PDF older job remains pre-fix evidence for diagnosis, not clean validation of the final guard.

## Follow-Up Findings From Newest Monitor Jobs

These were added after the Captain pointed to jobs `3328ed201dd744148678efc015d7c33a`, `d1689dfbd8ff46d98e76730bfd16fafb`, and `466c86c0a399466fb8800c9134edf86e`.

1. **Bundesrat `rechtskräftig` one-claim regression identified**
   - Jobs `d1689df...` and `466c86...` both returned one near-verbatim AtomicClaim for the Captain-defined input.
   - Both jobs classified the input as `single_atomic_claim` and recorded `contractValidationSummary.preservesContract=true`.
   - Both ran single-claim atomicity validation and a binding contract challenge, but those validators did not receive the Pass 2 `distinctEvents` inventory that later triggered MT-5(C).
   - MT-5(C) did trigger; `d1689df...` generated a 3-claim retry candidate, but because the retry did not revalidate cleanly, the code kept the original contract-approved one-claim set.
   - Root cause class: downstream LLM validators lacked upstream input-derived structural context, so a near-verbatim one-claim approval overruled a later collapse signal.

2. **Bundesrat fix implemented**
   - `validateClaimContract()` and `validateSingleClaimAtomicity()` now receive `distinctEventsContextJson`.
   - `CLAIM_CONTRACT_VALIDATION` and `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION` now include topic-neutral detected distinct-events reconciliation rules.
   - MT-5(C) reprompt guidance now names generic direct branch/proceeding/comparison-side/decision-gate splits and requires priority-anchor preservation in split claims where in scope.
   - This is LLM-powered validation context, not deterministic semantic branch detection.

3. **SVP PDF UNVERIFIED remains a separate broad-input quality packet**
   - Job `3328ed...` correctly failed closed as `UNVERIFIED` / damaged rather than shipping a misleading report.
   - Stage 1 extracted five claims from the PDF but omitted major thesis branches and the priority anchor around continuing approximately 40,000 annual immigration/fachkräfte flow.
   - It also classified the broad PDF/article input as `single_atomic_claim`, which is suspicious and should remain under `MON-STG1-QUAL`.
   - The current distinct-events validator-context patch may improve auditing of broad-input structure, but it does not fully solve broad article/PDF extraction.

4. **Verification for this follow-up**
   - Focused prompt-contract tests passed.
   - Focused claim-contract validation tests passed.
   - Focused MT-5 routing tests passed.
   - Full `npm test` passed.
   - `npm -w apps/web run build` passed and reseeded `claimboundary` prompt hash `28d09dc0d2c0...`.

## Documentation Map

- Current session backlog/status anchor: `Docs/STATUS/Backlog.md`, section "Immediate Priorities (2026-04-24 Monitor Session)".
- Current status addendum: `Docs/STATUS/Current_Status.md`, sections "Current Focus (2026-04-24 Monitor Session)" and "Open Monitor Findings (2026-04-24)".
- Selection readiness plan: `Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md`.
- Runner/report diagnostics handoff: `Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_Runner_Diagnostics_Pipeline_Improvements.md`.
- Pipeline quality/speed/cost plan: `Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md`.
- Pipeline integrity fixes: `Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_LLM_Expert_Pipeline_Integrity_Fixes.md`.
- Citation guard live validation: `Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Verdict_Citation_Guard_Live_Validation.md`.

## Final Session Assessment

The session produced meaningful fixes and better evidence, but it did not close every root cause. The correct state is:

- fixed: multiple concrete product/runtime defects
- documented: all major observed issues and solution options from the session
- still active: Stage 1 latency, broad-input quality, Stage 2 evidence/provenance invariants, monitor/provenance gaps, and warning materiality discipline
