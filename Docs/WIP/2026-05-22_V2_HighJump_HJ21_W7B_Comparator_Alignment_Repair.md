# V2 HighJump HJ21 - W7-B Comparator Alignment Repair

## Context

HJ20 rerun job `53f22512b9aa41b5ab23b774e2ddf10f` produced the first useful
hidden/internal report-writer draft after the W5 output-shaping repair.

Quality review against the `hydrogen-en` expectation found a concrete defect:

- expected family direction: `FALSE` / `MOSTLY-FALSE`, truth `5..25`,
  confidence `65..85`;
- HJ20 internal report lead verdict: `MIXED`, truth `45`, confidence `62`;
- HJ20 alternative verdict: `FALSE`, truth `25`, confidence `71`.

The lead narrative treated one-sided or third-comparator context as support
strong enough to balance direct same-claim opposing evidence. The report writer
faithfully preserved W7-B's supplied verdict candidates, so the smallest repair
is W7-B comparator alignment rather than aggregation prose, schema, source
acquisition, or code heuristics.

## Direction

Amend only `V2_BOUNDARY_VERDICT_EXECUTION` with topic-neutral comparator
alignment guidance.

The prompt should require:

- direct comparator evidence to control the lead verdict candidate when it
  exists;
- one-sided, adjacent, or third-comparator evidence to remain context/caveat
  unless it explicitly bridges the original comparison;
- `MIXED` to require materially direct opposing evidence on the same claim
  relation, not merely indirect context pointing another way;
- the first verdict candidate to be the most claim-aligned top-line candidate,
  with alternative frame-specific candidates allowed after it.

## V2 Scorecard Impact

V2 SCORECARD IMPACT

- V2-Q5 Verdict quality: raises the first observed report defect after HJ20.
- V2-Q4 Evidence quality: improves evidence-to-verdict relevance without
  changing Source Material or EvidenceItem generation.
- V2-Q10 Complexity convergence: amends an existing prompt mechanism; no new
  hidden route, schema, retry, or proof layer.

## V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

- touches V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings;
- adds no new mechanism;
- removal/recalibration trigger: revisit after internal report review shows
  comparator alignment is stable across at least one more Captain-defined
  control input.

## Debt-Guard

DEBT-GUARD INVENTORY

Symptom:

- HJ20 hidden report lead verdict is `MIXED` while the report itself contains a
  stronger false-side alternative; this misses the Captain expectation for the
  canonical `hydrogen-en` family.

Verifier:

- hidden report-writer draft from job
  `53f22512b9aa41b5ab23b774e2ddf10f`;
- Captain quality expectations for `hydrogen-en`;
- HJ20 hidden W8-B/W7-B evidence showing W7-B supplied the lead mixed candidate.

Likely recent change surface:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`

Existing mechanisms:

- W7-B `V2_BOUNDARY_VERDICT_EXECUTION` already has comparison structure and
  measurement-boundary guidance.

Debt signals:

- guidance exists but did not prevent indirect context from inflating the lead
  verdict to `MIXED`.

Constraints:

- no deterministic semantic logic;
- no topic-specific prompt terms;
- no schema relaxation;
- no source/provider changes;
- public V2 remains blocked/precutover.

Causal classification:

- `incomplete-existing-mechanism`.

COMPLEXITY BUDGET

Chosen option:

- amend.

Files expected to change:

- this WIP package;
- `apps/web/prompts/claimboundary-v2.prompt.md`;
- focused prompt-contract test;
- closeout/status/index docs.

Net mechanisms:

- unchanged.

New branches/fallbacks/flags/helpers:

- none.

Verifier to run:

- focused prompt-contract/W7-B tests;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`;
- `npm run validate:v2-gates`;
- gate-register self-test;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`.

Live verifier:

- one HJ21 canary is justified after commit/runtime refresh because this is a
  quality-affecting prompt repair and local tests cannot prove LLM judgment.

## Scope

Allowed:

- topic-neutral W7-B comparator-alignment prompt guidance;
- focused prompt-contract tests;
- one later HJ21 canary after commit/runtime refresh/preflight.

Not allowed:

- code heuristics or deterministic comparator matching;
- schema changes;
- adapter normalization;
- retries or fallbacks;
- source/provider/model changes;
- public API/UI/report/export/compatibility behavior;
- parser/cache/SR/storage;
- ACS/direct URL;
- V1 work or cleanup.

## Pass Criteria

Local:

- prompt section contains the comparator-alignment guidance;
- tests prove the guidance is present and contains no Captain canary-domain
  terms;
- no code, schema, route, model, source, public, or storage behavior changes.

Canary:

- W5 remains accepted with a bounded EvidenceItem set;
- W7-B lead/top verdict candidate is claim-aligned and does not treat indirect
  context as equal direct contradiction/support;
- internal report writer produces a hidden draft;
- public V2 remains blocked/precutover/damaged;
- default admin projections remain redacted/no-store.

## Stop Criteria

Stop and reconvene Steer-Co if:

- the next fix would require schema/code heuristics, source expansion, retries,
  or public behavior;
- the canary still produces a mixed lead verdict for the same indirect-context
  reason;
- hidden/default/public/log/error surfaces leak report text, source text,
  prompt text, provider payloads, hidden ledger ids, verdict/truth/confidence,
  or warnings.

## Local Implementation Status

Status:

- locally implemented;
- verifier-clean;
- no live canary has been run from this package yet.

Implemented files:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`

Local verifier results:

- focused W7-B prompt/runtime tests: PASS, 3 files / 32 tests;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: PASS,
  75 files / 356 tests;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: PASS,
  144 files / 871 tests after increasing the command timeout for the large
  boundary-guard slice;
- `npm run validate:v2-gates`: PASS;
- `node scripts/validate-v2-gate-register.mjs --self-test`: PASS;
- `npm run debt:sensors`: `advisory_warn` on existing V2/doc footprint and
  consolidation-marker debt only;
- `npm -w apps/web run build`: PASS.

Failed-attempt recovery:

- an earlier analyzer-v2-runtime run timed out in the parser-runner protocol
  test; the focused HJ21 patch was classified `keep`;
- the failed file passed in isolation, and the full analyzer-v2-runtime slice
  passed on rerun;
- an earlier analyzer-v2 broad run exceeded a 120s shell timeout without a test
  failure report; the full slice passed with a longer timeout.
