# V2 HighJump HJ71 - Query Planning Current-Stock Direct-Record Repair

Status: local implementation in progress

## Objective

Address the HJ70 report-quality gap for the Captain-defined current-asylum
input by amending the existing Query Planning prompt contract so current
quantitative stock, threshold, status, or standing-total claims receive direct
record queries before flow/context queries.

HJ70 proved that W5 output-shape repair worked: W5 completed with three
EvidenceItems, W8 reached `firstIncompleteStage = none`, and the internal
report writer created a draft. The report remained `UNVERIFIED` because the
source chain supplied annual application-flow/context material and source
availability context, but not a source-native current stock metric.

## Authority

Captain authorized HighJump continuation, prompt edits, schema changes when
naturally needed, and live jobs inside the current tranche. HJ71 uses one
generic prompt/test amendment and does not add provider, parser, retry, cache,
storage, Source Reliability, public-surface, or V1 scope.

## Team Review

Post-reboot sidecar review was restored:

- Noether: W5/report writer are not current owners; the gap is source-material
  or candidate selection. Preserve caps and use one focused rerun after a
  narrow repair.
- Russell: consented that W5/report writer are unlikely owners because HJ70
  downstream behavior correctly reported the missing decisive metric. Suggested
  query/source-material coverage attribution and a narrow generic repair.

Consolidated direction: amend the existing Query Planning direct-record
obligation first. This is the lowest-net-complexity way to influence source
coverage without deterministic semantic filtering or another source mechanism.

## Scope

Allowed:

- amend `## V2_EVIDENCE_QUERY_PLANNING` in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- add focused prompt-contract assertions;
- update this package, status, ledger, Agent Outputs, and indexes after
  validation.

Closed:

- source-specific, country-specific, institution-specific, or canary-term
  wording;
- deterministic semantic filtering or ranking;
- source/provider expansion, parser execution, cache/SR/storage, retries, cap
  increases, direct URL/ACS, V1 work;
- W5, W6, W7, W8, report writer, public/API/UI/export behavior.

## Debt-Guard

DEBT-GUARD INVENTORY

- Symptom: HJ70 produced a complete internal report but remained
  `UNVERIFIED` because the source chain did not provide the decisive current
  stock metric.
- Verifier: HJ70 job `5bce26affa5146d8bce4f65e13a2e9c9`, result artifact
  `Docs/WIP/canary-evidence-hj70-w5-output-contract-repair.json`, and admin
  report markdown.
- Likely recent change surface: existing Query Planning prompt contract that
  already carries generic current aggregate/source-native guidance.
- Existing mechanisms: Query Planning prompt, Source Material Serper linked
  page/XLSX/materialization seam, W5 strict extraction, W8 report writer.
- Debt signals: V2 has substantial hidden-source machinery; adding another
  source mechanism would increase debt while the query contract can be amended
  in place.
- Constraints: no hardcoded topic/source strings; no deterministic semantic
  text-analysis rules; Captain-defined input only for live validation; public
  containment must hold.
- Unknowns: whether the live provider will produce better direct-record queries
  from prompt hardening alone.

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing Query Planning prompt contract and focused
contract test.

Rejected options:

- source/provider widening or parser work: higher complexity and not justified
  before the existing query owner is tightened;
- deterministic candidate filtering: violates LLM-intelligence rules;
- W5/report-writer edits: downstream correctly reported missing decisive
  source material;
- cap increase/retries: would add mechanism without addressing source intent.

COMPLEXITY BUDGET

- Chosen option: amend.
- Files expected to change: prompt, prompt-contract test, this WIP package,
  status/ledger/output docs after validation.
- Small-change plan: single patch.
- Net mechanisms: unchanged.
- New branches/fallbacks/flags/helpers: none.
- Code expected to remove: none.
- Tests/verifier to add or update: focused prompt-contract assertions.
- Why this is not workaround stacking: strengthens an existing LLM planning
  contract instead of adding a downstream workaround or duplicate source path.
- Verifier to run: focused prompt-contract test, boundary guard, build,
  debt sensors, index, diff checks; then one focused live rerun after commit,
  runtime refresh, and UCM prompt activation.
- Verifier tier: build + live-job because safe local tests cannot prove live
  retrieval/source coverage.
- Cost class: one live job from the active tranche if local verifiers pass.
- Runtime provenance: commit required; runtime refresh and prompt activation
  required.
- Debt accepted: none.

## V2 Scorecard Impact

Advances real report-quality value by targeting the observed evidence-coverage
defect that keeps a complete internal report from reaching the Captain-expected
true-side band.

## V2 Retirement Ledger Impact

No mechanism is retired in HJ71. The slice avoids new hidden machinery and
therefore preserves the path to later consolidation rather than expanding the
surface.

## Consolidation Gate

Net mechanisms remain unchanged. If the live rerun repeats the same
flow/context-only source packet, stop and choose between source-material
selection and source acquisition strategy by Steer-Co consent before spending
another job.

## Verifier Plan

Before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `npm run index`
- `git diff --check`
- `git diff --cached --check`

After commit and runtime refresh, import/activate the amended
`claimboundary-v2` prompt and run exactly one focused live rerun:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

## Pass / Stop Criteria

Pass:

- focused tests/build/diff checks pass;
- live rerun stays on `claimboundary-v2`;
- public/default containment holds;
- Query/source chain surfaces direct current stock, standing-total, or
  threshold-crossing source material, and W5 extracts at least one EvidenceItem
  tied to that metric; report moves true-side or records a materially improved,
  evidence-grounded caveat.

Stop:

- stale runtime/source or stale prompt hash;
- V1 routing;
- public/default/log/error leak;
- same flow/context-only source packet repeats without new useful evidence;
- source-native stock material appears in W5 input but W5 omits it;
- any pressure to add provider/parser/cache/SR/storage/retry/cap/public/V1
  scope inside HJ71.

## Local Implementation Result

Implemented as a prompt/test amendment only:

- strengthened the existing Query Planning direct-record obligation for
  point-in-time stock, current-status, threshold, and standing-total claims;
- required direct-record queries before flow/context queries when budget
  permits;
- required two non-duplicate direct-record query intents when budget permits:
  one preserving the literal threshold/value with unit/domain/current-stock
  frame, and one preserving the measurement frame while seeking source-native,
  official, public-record, or directly measured aggregate material;
- stated that applications, inflow, outflow, activity volume, source
  availability, and broad context queries do not satisfy the direct-record
  obligation unless the selected claim itself asks for those metrics;
- added focused prompt-contract assertions.

Verifier results before implementation commit:

- Initial focused prompt-contract test failed only because one assertion crossed
  a markdown line wrap. Failed-attempt recovery classified the prompt patch as
  `keep` and amended the assertion without changing prompt behavior.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
  passed: 1 file, 10 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  passed: 1 file, 96 tests.
- `npm -w apps/web run build` passed. Postbuild reseed reported no prompt DB
  change, so the live step must explicitly import/activate the intended
  `claimboundary-v2` prompt hash before submission.
- `npm run debt:sensors` returned `advisory_warn` only for known V2 footprint,
  boundary guard size, docs footprint, net mechanism telemetry, and
  consolidation-marker warnings.
- `npm run index` passed.
- `git diff --check` passed.

DEBT-GUARD RESULT

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend existing Query Planning prompt contract and focused
  prompt-contract test.
- Rejected path and why: source/provider widening, parser work, deterministic
  semantic candidate filtering, W5/report-writer edits, cap increases, and
  retries would add mechanisms or change the wrong owner before the existing
  query contract is tightened.
- What was removed/simplified: none.
- What was added: stronger generic wording inside the existing Query Planning
  prompt section and assertions for that wording.
- Net mechanism count: unchanged.
- Budget reconciliation: actual diff stayed in prompt, prompt-contract test,
  WIP package, and lane-status pointer.
- Verification: focused test, boundary guard, build, debt sensors, index, and
  diff check.
- Debt accepted and removal trigger: no accepted mechanism debt.
