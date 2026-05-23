# V2 HighJump HJ55 - Query Planning Breadth Repair

**Status:** local implementation verifier-clean; pending commit, UCM activation,
runtime refresh, and one focused live rerun
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ54 job `c3718a3e383442c29361e058ef4f16ad`

## Why This Slice Exists

HJ54 cleared the Claim Understanding admission blocker for
`Plastic recycling is pointless` and produced a complete internal Alpha report.
The report is now reachable, but it is thin compared with the accepted plastic
comparator: HJ54 used one selected AtomicClaim, three queries, three
EvidenceItems, and two internal boundaries, while the accepted current-stack
plastic comparator has much richer evidence and boundary breadth.

The next balanced HighJump bar is to use the existing query-planning headroom
before changing verdict aggregation, source providers, parser behavior, or
public surfaces.

## Review Synthesis

- Claude Opus 4.6 recommended a prompt-only query-planning breadth repair:
  broad/evaluative but assessable claims should use distinct investigative
  angles within the existing six-query cap.
- The V2 quality reviewer noted that HJ54 is not yet mechanically comparable to
  full public bands because public/default verdict fields remain intentionally
  null, but the internal report did create reviewable candidate verdict text.
- The architecture/debt reviewer recommended review-only first; HighJump
  rejects that as too passive now that the defect is concrete and the repair is
  narrow.

## Scope

Allowed:

- amend only `V2_EVIDENCE_QUERY_PLANNING` in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- strengthen the existing Evidence Lifecycle prompt-contract test;
- import and activate the updated `claimboundary-v2` prompt profile through
  UCM after commit;
- run one focused live rerun for `Plastic recycling is pointless` after
  verifiers, UCM activation, runtime refresh, and clean provenance.

Closed:

- Claim Understanding admission work for this input;
- verdict aggregation or report-writer changes;
- schema relaxation, model/provider changes, source/provider expansion,
  parser/cache/SR/storage behavior, public/default V2 behavior, direct URL/ACS,
  V1 work, V1 cleanup, and deterministic semantic query construction.

## V2 Scorecard Impact

Positive:

- V2-Q1 usable report path: improves the evidence breadth feeding internal
  report generation for a now-reachable Captain-defined input.
- V2-Q4 evidence usefulness: asks the LLM-owned query planner to cover distinct
  investigative angles instead of underusing the existing query budget.
- V2-Q6 report quality: targets report evidence breadth before changing
  verdict roll-up or public output.

## V2 Retirement Ledger Impact

No new mechanism. This amends the existing query-planning prompt contract and
keeps the existing six-query cap, source-acquisition path, hidden artifacts, and
public precutover envelope unchanged.

## V2 Consolidation Gate

Allowed because the slice changes one existing prompt section and one existing
prompt-contract test. It does not add hidden machinery. If the next run improves
evidence breadth but still produces competing verdict candidates, the next bar
should be verdict roll-up/calibration, not more query breadth.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing Query Planning prompt contract.

Rejected paths:

- review-only, because HJ54 already exposed a concrete low-breadth defect;
- source/provider/parser expansion, because HJ54 succeeded through existing
  provider/source material paths;
- verdict aggregation repair first, because the two candidate verdicts may be
  an honest result of thin evidence;
- query-count code changes, because the existing cap is already six and the
  issue is underuse by the LLM-owned planner.

Net mechanisms: unchanged.

## Verification Plan

Before live job:

- focused Evidence Lifecycle prompt-contract test;
- query-planning prompt-loader test;
- focused query-planning model/runtime tests;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- commit;
- import/activate the prompt in UCM with a new version label;
- refresh runtime and verify Web/API/proxy commit match;
- verify active `claimboundary-v2` prompt hash changed to the committed prompt.

Live validation:

- exactly one rerun for `Plastic recycling is pointless`;
- pass if the run remains on V2, public/default containment holds, Claim
  Understanding remains accepted, Query Planning produces at least four
  distinct queries, W5 extracts at least five EvidenceItems or otherwise shows
  materially improved evidence breadth, and the internal report remains
  created;
- if query count remains three or less, stop and classify the prompt repair as
  insufficient rather than stacking another query-planning tweak;
- if evidence breadth improves but the report still has competing verdict
  candidates, move the next bar to verdict roll-up/calibration;
- if a new downstream stop appears, record the new stage and stop this slice.

## Local Verification

Completed before commit on 2026-05-23:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts`
  - passed, 13 tests across 2 files
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts`
  - passed, 12 tests across 3 files
- `npm run validate:v2-gates`
  - passed
- `npm run debt:sensors`
  - `advisory_warn`; warnings are the known V2 footprint/docs/boundary-guard
    and consolidation-marker advisories, not blockers for this narrow prompt
    repair
- `npm -w apps/web run build`
  - passed
- `npm run index`
  - passed
- `git diff --check`
  - passed
