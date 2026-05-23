# V2 HighJump HJ52 - Stronger Internal Report Validation Gauntlet

**Status:** live validated; mixed pass with two reports and two useful stops
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ51 job `a8df993eb4804d0ba9310979e3e4b0a9`

## Why This Slice Exists

HJ51 proved that manual Analyze submissions now create real default V2 jobs and
that authenticated admins can see internal V2 reports on the job page while
public/default V2 remains blocked/precutover/damaged.

The Captain asked for stronger validation than single "nibbling" canaries.
HJ52 therefore spends a bounded batch of live jobs to test whether the current
V2 internal-report path works across diverse Captain-defined inputs, and to
surface concrete report-quality defects for the next HighJump bar raise.

## Scope

Allowed:

- submit a small batch of direct default V2 jobs through the existing
  `/api/fh/analyze` route with no explicit `pipelineVariant`;
- use only Captain-defined analysis inputs;
- capture job status, hidden-chain stage reachability, admin report presence,
  public/default containment, and high-level report-quality observations;
- classify each result as report produced, new stage reached, new failure, same
  stop with new evidence, or same stop without useful new information.

Closed:

- source code changes, prompt/model/config/schema edits, provider expansion,
  parser/cache/SR/storage behavior, retries, ACS/direct URL, V1 work, V1
  cleanup, public cutover, non-admin report exposure, and report/verdict
  semantics changes.

## Inputs

Run exactly these four Captain-defined inputs unless a hard stop appears:

1. `Using hydrogen for cars is more efficient than using electricity`
2. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
3. `Plastic recycling is pointless`
4. `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

The HJ51 German asylum aggregate job remains the control evidence for the
current-stock family; HJ52 intentionally spends its budget on broader
generalization rather than rerunning the same input.

## V2 Scorecard Impact

Positive:

- V2-Q1 Usable report path: validates the default V2 route across multiple
  real inputs.
- V2-Q3 Source usefulness and V2-Q6 Report quality: produces observed report
  defects across topic families.
- V2-Q9 Operational feedback: replaces isolated canary evidence with a compact
  validation set and information-yield classification.

## V2 Retirement Ledger Impact

No new machinery is added. HJ52 is evidence-gathering for convergence: if the
batch shows repeatable report production, future work can retire or merge some
single-canary scaffolding in favor of compact report-quality gauntlets.

## V2 Consolidation Gate

Allowed because it adds no mechanism and directly advances report-quality
evidence. The batch is bounded to four jobs and preserves all containment.

## Budget

Captain reset the live-job tranche to `18` before HJ51. HJ51 consumed one job.
HJ52 may consume at most four jobs, reducing the remaining budget from `17` to
`13` if all four are submitted.

## Preconditions

- clean git status;
- package committed before job submission;
- runtime refreshed to the package commit;
- Web `/api/version`, API `/version`, and Web proxy `/api/fh/version` all match
  the package commit;
- UCM effective `defaultPipelineVariant = claimboundary-v2`;
- active `claimboundary-v2` prompt hash recorded;
- no explicit `pipelineVariant` in submitted request bodies.

## Pass / Stop Criteria

Pass for the gauntlet if:

- all submitted jobs run `claimboundary-v2`;
- no job routes through `/analyze/select` or creates a claim-selection draft;
- public/default API and UI surfaces remain `4.0.0-cb-precutover`,
  `blocked_precutover`, `report_damaged` with no public/default report
  markdown, verdict, truth percentage, or confidence;
- hidden/admin artifacts remain internal-only and unauthenticated internal
  artifact routes return `401`;
- at least two non-control inputs produce internal report-writer drafts, or any
  failures are classified with useful next-defect evidence.

Stop immediately if:

- runtime/source provenance is stale or dirty;
- a submitted job unexpectedly runs V1;
- public/default or unauthenticated surfaces leak internal report text, source
  text, prompt text, provider payload, hidden ids, verdict, truth, or
  confidence;
- two consecutive jobs repeat the same stop without useful new information;
- a run requires prompt/model/config/schema/source/provider/parser/cache/SR/
  storage/public/V1 changes before evidence can be interpreted.

## Verification Plan

Before submission:

- `git status --short --untracked-files=all`;
- runtime version checks for Web/API/Web proxy;
- UCM default pipeline check;
- active V2 prompt hash check.

After completion:

- capture sanitized canary evidence JSON;
- update this package, the live-job ledger, current-lane projection, and
  `Agent_Outputs.md`;
- `npm run index`;
- `git diff --check`;
- commit result docs.

## Live Result

HJ52 ran four jobs on runtime `937e65a7ff2b8de4f689236ae5b5b50a06305276`.
All four jobs resolved to `claimboundary-v2` through the UCM default and all
public/default surfaces remained `4.0.0-cb-precutover`,
`blocked_precutover`, `report_damaged` with no public report markdown, verdict,
truth percentage, or confidence.

Classification:
`MIXED_PASS_X7_HJ52_STRONGER_INTERNAL_REPORT_VALIDATION_GAUNTLET`.

Results:

- Hydrogen job `7a36772a9f8b42f8ad510ad7d483bc88` produced an authenticated
  admin internal report writer draft (`8284` admin markdown characters,
  `3` EvidenceItems, `3` boundary candidates, `3` verdict candidates). The
  observed report direction contradicted the claim, consistent with prior
  hydrogen-family expectations.
- Bolsonaro job `39a9ab83d52741c282ecf337037bc97a` produced an authenticated
  admin internal report writer draft (`8447` admin markdown characters,
  `3` EvidenceItems, `3` boundary candidates, `3` verdict candidates). The
  observed report stayed mostly `UNVERIFIED`/`MIXED` because evidence still
  documents process/background more than direct compliance with legal and
  international fair-trial standards.
- Plastic recycling job `b89acb3e1d1745a9835d0125fd4b48c9` repeated the useful
  early stop: Claim Understanding blocked, selected `0` AtomicClaims, and Query
  Planning did not run. This is now a clear CU bar-calibration defect for short
  broad but analyzable claims.
- German asylum/WW2 comparison job `7321d207499f416193e12d6c2e854bc3` reached
  Query Planning and Source Material (`6` records) but stopped before
  extraction because W4-G blocked with `source_material_text_oversized`, leaving
  W4-H invalid and W5 `blocked_pre_execution`.

Budget: HJ52 consumed four jobs from the Captain-reset tranche. `13` remain.

Detailed canary evidence:
`Docs/WIP/canary-evidence-hj52-stronger-internal-report-validation-gauntlet.json`.

## Next Direction

The next HighJump bar should not add report plumbing. Two distinct report
defects are now visible:

1. Claim Understanding is too strict for short broad claims such as
   `Plastic recycling is pointless`.
2. The multi-part German comparison family needs bounded source-text
   selection/trimming before W4-H/W5, not more public/report output.

Recommended next repair: first address the Claim Understanding bar for short
broad but analyzable claims because it blocks the whole pipeline before source
work. Keep the repair topic-neutral and prompt/UCM-owned; do not add
deterministic semantic code-side exceptions.
