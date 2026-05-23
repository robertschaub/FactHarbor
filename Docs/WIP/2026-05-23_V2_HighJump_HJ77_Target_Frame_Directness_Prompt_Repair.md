# V2 HighJump HJ77 Target-Frame Directness Prompt Repair

**Status:** approved for implementation under Captain Deputy HighJump authority
**Date:** 2026-05-23
**Package owner:** Captain Deputy / Lead Developer
**Implementation type:** prompt-only amendment to existing `claimboundary-v2` W5/W7 sections
**Live-job tranche:** active 12-job tranche, 8 jobs remaining before HJ77

## Decision

HJ76 Wave 1 produced four complete product-route V2 jobs with public/default
containment intact, but report quality stopped:

- hydrogen and plastic produced confident wrong-side internal reports;
- Bolsonaro EN and asylum-WWII produced cautious but under-evidenced
  `UNVERIFIED` / `MIXED` reports;
- persisted HJ76 query plans showed plausible direct intent;
- persisted source material showed that the wrong-direction families had
  source packets with adjacent, one-sided, inverse, or same-side-heavy evidence
  that the extraction/verdict stages treated too strongly.

The lowest-net-complexity repair is to amend the existing W5 and W7 prompt
mechanisms, not add deterministic semantic filters, source quotas, new hidden
routes, broad Source Acquisition rewrites, or report writer post-processing.

## Scope

HJ77 may edit only:

- `apps/web/prompts/claimboundary-v2.prompt.md`;
- minimal status/package/ledger/handoff/index documentation required by the
  exchange protocol.

HJ77 must not add or change:

- source/provider/endpoints/caps/retries;
- parser/cache/Source Reliability/storage behavior;
- prompt examples using concrete benchmark topics;
- schema/model/config/UCM defaults;
- deterministic semantic classification code;
- public API/UI/report/export/compatibility behavior;
- V1 code, V1 prompts, or V1 cleanup.

Expected `claimboundary-v2` prompt content hash after this repair:
`d37a3110880aab898a346b8264e741f20ae607e4199071d33545280fa1003e3d`.

## Prompt Repair Shape

The repair amends existing prompt instructions:

- W5 evidence extraction now has an explicit target-frame and direction
  checkpoint before selecting EvidenceItems. It asks the model to compare the
  selected AtomicClaim target relation against each supplied source point:
  subject/actor, asserted property/outcome, comparator/baseline, measurement
  frame, time/status posture, category/threshold, and polarity.
- W5 must treat adjacent comparators, one-sided comparison material, broad
  topic material, generic benefits/limitations, or inverse-claim material as
  contextual or partial unless the supplied content bridges the same claim
  relation.
- W5 should include a bounded balanced set when materially aligned source
  packets contain both limitation evidence and countervailing value, benefit,
  compliance, effectiveness, support, or usefulness evidence.
- W7 boundary/verdict execution now has a pre-verdict target-frame checkpoint
  before assigning true-side or false-side labels. It must not convert
  adjacent, one-sided, inverse, generic, or partially bridged evidence into a
  confident truth direction for the selected AtomicClaim.
- W7 must treat W5 `claimDirection` labels as metadata, not automatic verdict
  commands, and recalibrate from visible statement/scope/limitation/rationale
  mismatches.

The wording is topic-neutral and does not include benchmark terms.

## Owner Classification

HJ77 is primarily a W5/W7 prompt calibration package:

- Mode A owner: confident wrong-direction reports caused by insufficient
  target-frame/directness calibration in W5 extraction and W7 verdict
  assignment.
- Mode B owner: under-evidenced Bolsonaro/asylum-WWII reports may still require
  later source-acquisition/material selection work if HJ77 improves Mode A but
  does not produce enough direct evidence for Mode B.

## V2 Scorecard Impact

Directly advances report-quality value:

- improves claim-direct evidence selection and verdict calibration;
- reduces confident wrong-side report risk;
- preserves multilingual and topic-neutral behavior by placing semantic
  judgment in the LLM prompt, not code.

## V2 Retirement Ledger Impact

No new hidden mechanism is introduced. HJ77 amends existing prompt mechanisms,
so there is no new route, sink, diagnostic layer, proof layer, or denial layer
to retire. If HJ77 moves at least two HJ76 families toward expected direction,
later HighJump source-plumbing work can be narrowed to remaining source-yield
defects instead of accumulating more report-quality guard machinery.

## V2 Consolidation Gate

This package is an in-place prompt amendment. It adds no new code mechanism and
does not change public behavior. Because it touches report-quality prompting, it
requires:

- focused prompt contract tests;
- boundary guard;
- build;
- debt sensors;
- package/docs/index checks;
- commit before any live job;
- runtime refresh to the commit before canary submission.

## Debt-Guard Result

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend existing W5/W7 prompt guidance in place
Rejected path and why: new deterministic target-frame classifier, source quota, new diagnostics, report-writer post-processing, provider expansion, parser/cache/SR/storage work, public behavior, ACS/direct URL, and V1 work all add mechanisms or touch the wrong owner before the inspected prompt gap is exhausted
What was removed/simplified: none
What was added: topic-neutral prompt calibration inside existing W5/W7 sections
Net mechanism count: unchanged
Budget reconciliation: one prompt file plus minimal governance/status docs; no source code, schema, route, model, config, provider, or public-surface change
Verification: prompt contract tests, boundary guard, build, debt sensors, index, and diff checks before commit; one post-commit four-job HJ77 wave only after clean runtime refresh
Debt accepted and removal trigger: none
```

## Reviewer Signal

Claude Opus reviewer consented to the prompt-first path: repair W5/W7
target-frame/directness before spending more jobs or rewriting source
acquisition. Sidecar consensus available at the time of this package supports
the same ordering: use the existing HJ76 artifacts, repair the smallest prompt
owner, then spend one bounded wave.

## Verifier Plan

Before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `npm run index`
- `git diff --check`

Before canary:

- clean `git status --short --untracked-files=all`;
- runtime refreshed to the HJ77 commit;
- API and Web version endpoints match the HJ77 commit;
- runner-key preflight proves `/api/internal/run-job` auth passes;
- admin-key preflight succeeds;
- manual/default pipeline remains `claimboundary-v2`.

## HJ77 Live Wave

Run exactly the HJ76 Wave 1 inputs after the implementation commit and runtime
refresh:

1. `Using hydrogen for cars is more efficient than using electricity`
2. `Plastic recycling is pointless`
3. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
4. `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

This spends 4 jobs from the active tranche if submitted. No HJ76 Wave 2 or
second HJ77 wave is authorized without a new stop/pass classification.

## Pass / Stop Criteria

Pass / advance if:

- all jobs stay on `claimboundary-v2`, reach terminal state, and retain valid
  source/runtime provenance;
- public/default containment holds;
- at least two of four HJ76 Wave 1 families move toward expected report
  direction or clearer calibrated uncertainty;
- hydrogen and plastic are no longer confident wrong-side reports.

Stop and classify before more jobs if:

- any job runs V1 or an unexpected pipeline;
- runtime/source provenance is stale or missing;
- public/default leak appears;
- prompt/schema/runtime failure appears with unclear owner;
- hydrogen or plastic remains confidently wrong-side;
- fewer than two families improve direction/calibration;
- Bolsonaro/asylum-WWII remain under-evidenced after hydrogen/plastic improve,
  which points to a separate source-yield owner rather than another broad prompt
  tweak.

## Debt-Sensor Status

Latest `npm run debt:sensors`: `advisory_warn`
(`2026-05-23T17:57:23.993Z`).

Salient warnings: V2 source/test footprint, oversized boundary guard, docs
volume, net mechanism telemetry, and historical consolidation markers. HJ77
does not add mechanism count, so the warnings are steering context, not a
blocker.
