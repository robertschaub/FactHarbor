# V2 HighJump HJ19 - Report Writer Output-Budget Repair

## Context

HJ18 canary job `c75322fad1e74218b8ee51a54f2307cd` reached the hidden/internal
`aggregation_narrative` report writer, but failed closed:

- `status = internal_report_writer_damaged`
- `damagedReason = parse_failure`
- `aggregationNarrativeResultStatus = damaged`
- `outputParseStatus = parse_failure`
- `failureCategory = parse_failure`
- schema issue code `json_parse_error`
- token usage `5179` input / `4000` output / `9179` total
- report markdown byte length `0`

Containment held. Public V2 remained `4.0.0-cb-precutover` /
`blocked_precutover` / `report_damaged`, and the default admin projection
remained hash/length/provenance-only.

## Steer-Co Direction

Steer-Co reduced-quorum decision: proceed with the smallest in-place amendment
to the existing HJ18 report-writer path.

Reviewer note:

- Claude Opus 4.6 was asked to review the HJ19 direction but timed out. Timeout
  is not approval.
- Captain Deputy proceeded under reduced quorum because the repair is bounded,
  reversible, directly amends the failed existing mechanism, and does not change
  public behavior or add a new mechanism.

Decision:

- Amend existing `aggregation_narrative` prompt/model policy in place.
- Raise only the report-writer output ceiling from `4000` to `8000` tokens.
- Add topic-neutral compactness guidance so the report writer produces one
  concise internal report instead of duplicating long prose across structured
  fields and markdown.
- Do not add retries, a second report stage, schema relaxation, source/provider
  changes, public projection, cache/SR/storage, ACS/direct URL, V1 work, or V1
  cleanup.

## V2 Scorecard Impact

V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q5 Verdict quality: unblocks the first LLM-written internal report prose
  path from accepted W8-B/W7-B verdict data.
- V2-Q9 Cost/latency discipline: increases only the report-writer output
  ceiling while adding compactness guidance to avoid needless token growth.
- V2-Q10 Complexity convergence: amends the existing report writer instead of
  adding another hidden layer.

Direct user/report value:

- Enables a parseable internal report candidate for report review.

Hidden-only value:

- Acceptable because the hidden artifact is the first report-writing path and
  directly serves report-quality evaluation.

Cost/latency impact:

- Potentially increases the HJ18 report-writer output ceiling from `4000` to
  `8000` tokens for successful W8-B paths only. Prompt compactness guidance is
  added to keep actual output lower where possible.

Retirement or simplification unlocked:

- If HJ19 produces a usable report, W8-G can remain on its merge/quarantine
  track instead of becoming the stable report writer.

Scorecard risk:

- Larger output ceilings can increase cost. Compactness guidance and one
  canary limit contain this risk.

## V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings.
- V2-RL-023 W8-G internal Alpha report draft projection route/sink.

Status changes:

- none.

New mechanism owner:

- none. HJ19 amends the existing `aggregation_narrative` owner.

Removal / merge trigger:

- Merge/quarantine W8-G after a parseable HJ19 report-writer draft is reviewed
  and fail-closed parity remains intact.

Debt accepted:

- Output-token ceiling increase is accepted as HighJump temporary bar-lowering
  and must be revisited after report-review evidence.

## V2 Consolidation Gate

HJ19 passes the consolidation gate because it does not add a new hidden
mechanism. It amends the existing report-writer mechanism to clear the observed
parse/truncation stop and directly advances internal report generation.

## Debt-Guard

DEBT-GUARD INVENTORY

Symptom:

- HJ18 report writer produced no report markdown because provider output hit
  `4000` output tokens and failed JSON parse.

Verifier:

- Canary job `c75322fad1e74218b8ee51a54f2307cd` hidden artifact telemetry.

Likely recent change surface:

- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.ts`
- `apps/web/prompts/claimboundary-v2.prompt.md`
- policy/prompt tests and gate register metadata.

Existing mechanisms:

- HJ18 `aggregation_narrative` report-writer owner.
- HJ18 strict output contract and preservation checks.
- No-store/no-read cache contract and hidden/admin-only route.

Debt signals:

- Existing output budget was copied from earlier execution stages and proved too
  low for the structured report-writer response.
- W8-G remains temporary deterministic fallback/comparison.

Constraints:

- Public V2 remains blocked/precutover/damaged.
- Preserve verdict labels, truth percentages, confidence values, boundary ids,
  and cited EvidenceItem ids exactly.
- No raw text leak in public/default-admin/log/error surfaces.
- No topic-specific prompt terms.

Unknowns:

- Whether `8000` output tokens plus compactness guidance is sufficient on the
  next canary.

Causal classification:

- `incomplete-existing-mechanism`: the existing report writer is correct in
  direction but its output budget and compactness instruction are too narrow.

COMPLEXITY BUDGET

Chosen option:

- amend.

Files expected to change:

- HJ19 WIP package.
- `apps/web/src/lib/analyzer-v2/gateway/approval-records.ts`
- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/cache-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.ts`
- `apps/web/prompts/claimboundary-v2.prompt.md`
- focused policy/prompt/report-writer/route/sink/boundary tests as needed.
- `Docs/AGENTS/V2_Gate_Register.json`
- status/handoff/index docs at closeout.

Small-change plan:

- single patch.

Net mechanisms:

- unchanged.

New branches/fallbacks/flags/helpers:

- none.

Code expected to remove:

- none.

Tests/verifier to add or update:

- policy model/cache approval expectations;
- report-writer policy validation expectation;
- prompt-contract compactness expectation;
- existing route/sink focused tests if approval pointer changes.

Why this is not workaround stacking:

- It amends the failed existing report-writer task instead of adding a parallel
  report stage, retry path, fallback, or schema relaxation.

Why rejected paths are worse:

- Retrying would repeat a truncation-prone output shape and increase cost.
- Schema relaxation would hide malformed output instead of producing a complete
  contract.
- Source/provider expansion does not address report-writer truncation.
- Another readiness/proof layer would not produce report value.

Verifier to run:

- focused HJ19 verifier set;
- `npm run validate:v2-gates`;
- gate-register self-test;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`.

Verifier tier:

- safe-local plus build before commit; one live-job canary after commit/runtime
  refresh if clean.

Cost class:

- one hidden report-writer LLM call for the later canary.

Runtime provenance:

- commit required; runtime refresh required before canary.

Debt accepted:

- planned-temporary HighJump output-budget increase with report-review
  recalibration trigger.

## Scope

Allowed:

- add HJ19 approval pointer for the report-writer repair;
- update `aggregation_narrative` model/cache policy provenance to HJ19;
- raise only `aggregation_narrative` `maxOutputTokens` to `8000`;
- update report-writer approval validation accordingly;
- add topic-neutral compactness guidance to `V2_AGGREGATION_NARRATIVE`;
- update focused tests, gate register, and closeout docs.

Not allowed:

- retries;
- schema relaxation;
- new report stage or route;
- source acquisition, source material, W4/W5/W6/W7 behavioral changes;
- provider expansion;
- parser/cache/SR/storage;
- public API/UI/report/export/compatibility behavior;
- ACS/direct URL;
- V1 work or cleanup.

## Pass Criteria

Local:

- `aggregation_narrative` still executes only with approved prompt/model/cache
  policy.
- The active model policy is `v2.model.aggregation_narrative.hj19` with
  `maxOutputTokens = 8000`.
- The active cache policy is `v2.semantic.aggregation-narrative.hj19`.
- The report writer accepts the HJ19 model policy and rejects stale policy
  metadata.
- The prompt contains topic-neutral compactness guidance and no Captain canary
  terms.
- Public projection and default admin projection remain unchanged.

Canary, if run:

- exactly one canary from the current tranche;
- HJ18/HJ19 path produces either `internal_report_writer_draft_created` or a new
  concrete bounded stop;
- if created, report markdown is present only through explicit authenticated
  inspection and default projection stays hash/length/provenance-only;
- public V2 remains blocked/precutover/damaged.

## Stop Criteria

Stop and reconvene Steer-Co if:

- focused tests show the repair needs source/provider/W4/W5/W6/W7/public
  changes;
- HJ19 still fails parse/schema with unclear cause after the next canary;
- default-admin or public surfaces leak report text, source text, prompt text,
  provider payload, hidden ids, or public verdict/truth/confidence;
- the patch starts adding retries, fallback branches, schema relaxation, or a
  second report path.

## Implementation Result

Status: locally implemented and verifier-clean. No HJ19 live canary has run yet.

Implementation summary:

- Added HJ19 approval provenance for the existing `aggregation_narrative`
  report-writer path.
- Updated the existing prompt/model/cache approval records to HJ19 provenance.
- Raised only the `aggregation_narrative` output ceiling from `4000` to `8000`
  tokens.
- Added topic-neutral compactness guidance to `V2_AGGREGATION_NARRATIVE`.
- Updated focused policy, prompt-contract, route/sink, boundary-guard, and gate
  register validation expectations.

Debt-guard result:

- Classification: `incomplete-existing-mechanism`.
- Chosen path: amend the existing report-writer mechanism in place.
- Net mechanisms: unchanged.
- Rejected paths: retries, schema relaxation, new report stage, provider/source
  expansion, and additional readiness/proof layers.

Reviewer coverage:

- Claude Opus 4.6 was invoked through `scripts/agents/invoke-claude.cjs` for a
  HJ19 direction review but timed out. This is recorded as degraded reviewer
  coverage, not approval.
- Captain Deputy proceeded under reduced quorum because the repair is bounded,
  reversible, directly addresses the observed HJ18 truncation/parse stop, and
  does not add public behavior or a new mechanism.

Verifiers:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.test.ts`
  - passed: `3` files / `25` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-report-writer-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts/route.test.ts`
  - passed: `2` files / `7` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - passed: `1` file / `96` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - passed: `75` files / `356` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - passed: `144` files / `871` tests.
- `npm run validate:v2-gates`
  - passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`
  - passed.
- `npm run debt:sensors`
  - `advisory_warn` at `2026-05-22T08:22:49.113Z`; warnings are the known V2
    footprint, boundary-guard size, docs-volume, net-mechanism, and
    consolidation-marker pressure.
- `npm -w apps/web run build`
  - passed.
- `git diff --check`
  - passed.

Canary readiness:

- One HJ19 canary is worth spending from the active 8-job HighJump continuation
  tranche after commit, runtime refresh, clean git status, route/runtime
  preflight, API/Web runtime commit match, and artifact capture discipline.
- Current budget before the HJ19 canary remains `7`.
- No second HJ19 canary is authorized by this implementation result.

## Canary Result

Result document:

`Docs/WIP/2026-05-22_V2_HighJump_HJ19_Canary_Result.md`

Classification:

`STOP_X7_HJ19_PRE_REPORT_WRITER_W5_EVIDENCE_ITEMS_TOO_BIG`

Job id:

`7522df8a2f1647adb80d230efcfafe40`

The canary ran on runtime
`4e2ed0982d0eecfb8cd5e0098bca0c8342611e77` with explicit
`claimboundary-v2` and the Captain-defined hydrogen input. Public V2 stayed
blocked/precutover/damaged and containment held.

HJ19 was not validated by this canary because the run stopped earlier at W5.
Hidden artifacts reached Claim Understanding, Query Planning, W2, and W5, but
W5 stopped as `damaged_execution` / `schema_validation_failed`; schema
diagnostics included path `evidenceItems`, code `too_big`. W8-B, W8-G, and the
HJ19 report-writer artifact were not created.

Budget after the canary is `6`. No second HJ19 canary is authorized from this
result.
