# V2 HighJump HJ74 - HJ73 Attribution Canary Package

Status: Steer-Co consent; Captain approved 12-job tranche; one HJ74 canary authorized after preflight

## Objective

HJ72 produced an internal Pipeline V2 Alpha report for the Captain-defined
current-asylum input, but the report still missed the decisive comprehensive
current asylum-domain aggregate for the `235000` threshold. HJ73 then added
durable redacted `adminDiagnostics.sourceChainAttribution` to the existing V2
raw/admin result envelope so the next run can identify where the source chain
lost the needed material.

HJ74 is not a repair package. It is a one-job attribution canary request. Its
purpose is to run the same Captain-defined input once on committed HJ73 source
and use the persisted HJ73 attribution snapshot to choose the next single owner:
Query Planning, candidate provider network, Source Material, extraction input,
W5 extraction, or internal report writer.

## Authority

Captain authorized HighJump continuation and approved a fresh 12-job live
tranche after HJ73. Steer-Co consents that the next direction should be an
HJ73-attribution canary package rather than speculative source-strategy work.

This package authorizes exactly one HJ74 canary after clean provenance, runtime
refresh, and containment preflight. It does not authorize a second HJ74 canary
or any repair before the attribution result is reviewed.

## Steer-Co Outcome

Consensus:

- Sagan: use one HJ73-instrumented run before source strategy; otherwise the
  next source package still guesses the loss owner.
- Noether: proceed only as a Captain-gated package because budget is `0`; do
  not add provider/source/cap/retry/prompt/report changes inside the canary.
- Russell: HJ73's value is realized only by a fresh run that persists
  `adminDiagnostics.sourceChainAttribution`; the result should select exactly
  one HJ75 owner.
- Avicenna: one gated job is the most direct report-quality move; if Captain
  declines live budget, prepare only a no-live source-strategy design review.

Decision: prepare HJ74 as a Captain-gated one-job canary over the exact HJ72
input. Do not implement source strategy, prompt, provider, cap, retry, parser,
or report-writer changes before HJ74 attribution evidence exists.

## Scope

Allowed:

- refresh Web/API runtime to committed HJ73 source;
- verify runtime/source commit is `9267685f` or a committed successor that
  contains HJ73 and no unreviewed pipeline changes;
- submit exactly one normal product-route V2 job with the Captain-defined input:
  `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- inspect admin raw result for `adminDiagnostics.sourceChainAttribution`;
- verify public/default projections omit `adminDiagnostics` and leak no report,
  verdict, truth, confidence, source, prompt, provider, hidden ids, or raw text;
- classify the next implementation owner from the attribution snapshot;
- document the result, information yield, remaining budget, and next owner.

Closed:

- a second HJ74 canary;
- source/provider expansion, endpoint migration, cap increases, retries,
  parser execution, cache/SR/storage infrastructure, ACS/direct URL, V1 work;
- prompt/model/config/schema/UCM/gateway edits or approval flips;
- report-writer, verdict, warning, confidence, public API/UI/report/export/
  compatibility changes;
- new hidden route/sink/table or new durable storage;
- raw source text, excerpts, URLs, titles, snippets, raw query text, provider
  payloads, prompt text, model raw output, hidden ledger ids, stack traces, or
  internal process-local route data in public/default-admin/log/error surfaces.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q2 evidence acquisition, V2-Q3 EvidenceItem
quality, and V2-Q10 complexity convergence.

Direct user/report value: HJ74 should turn the repeated current-asylum source
gap from an unattributed report defect into an owner-specific next repair.

Hidden-only value: verifies whether HJ73's durable attribution is sufficient to
replace process-local hidden route probing for HighJump diagnosis.

Cost/latency impact: exactly one live job if Captain approves. No extra retries,
providers, parser work, or prompt/model/config changes.

Scorecard risk: if the run repeats HJ72 and the attribution snapshot is missing
or unhelpful, stop rather than spending more live jobs.

## V2 Retirement Ledger Impact

Rows touched:

- V2-RL-004 V2 hidden observability ledger and admin-only artifact routes:
  HJ74 tests whether HJ73 can reduce reliance on process-local route probes.
- V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings: keep; HJ74
  should identify the next single bar to raise or repair.
- V2-RL-024 HJ37 bounded Serper linked-page Source Material: keep/merge pending
  attribution evidence.

No status changes are made by this package. A pass should produce an HJ75 owner
decision and may support merging/retiring process-local HighJump diagnostics
later.

## Consolidation Gate

HJ74 is allowed only as a validation of the HJ73 diagnostic consolidation. It
must not add another hidden mechanism or another repair layer. If the canary
does not produce useful attribution, reconvene Steer-Co before any further live
spend or source-strategy implementation.

## Debt-Sensor Status

Latest `npm run debt:sensors` before this package returned `advisory_warn`
with known warnings:

- V2 source/test footprint exceeds advisory thresholds;
- boundary guard exceeds advisory threshold;
- Docs/WIP and handoff counts exceed advisory thresholds;
- debt-guard telemetry includes net mechanism increases;
- some V2 Source Acquisition/EvidenceCorpus docs lack consolidation markers.

These warnings do not block HJ74, but they support the package constraint that
HJ74 must use the existing result envelope and must not add new route/sink/
storage/provider machinery.

## Preconditions Before Submission

1. Captain live-job approval is recorded in the tranche ledger.
2. Git provenance is clean or unrelated dirt is isolated and documented.
3. Runtime is refreshed to `9267685f` or a committed successor containing HJ73.
4. Web/API runtime commit hashes match the committed source under test.
5. Public/default projection checks prove `adminDiagnostics` remains omitted.
6. Admin raw result path is available for post-run inspection.
7. No prompt/model/config/schema/UCM/gateway/source/provider/cap/retry/parser/
   cache/SR/storage/public/V1 changes are included.

## Canary

Input:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Expected result posture:

- job uses `claimboundary-v2`;
- job reaches `SUCCEEDED` or a documented internal V2 stop;
- public/default containment holds;
- admin raw result includes
  `adminDiagnostics.sourceChainAttribution.version =
  v2.highjump.source-chain-attribution.hj73`;
- `lossPointCandidate` and structural counts are sufficient to select the next
  owner, or the result is classified as unhelpful and no second job is run.

## Pass / Stop Criteria

Pass:

- exactly one job is run from the fresh 12-job tranche;
- runtime/source freshness is verified;
- public/default projection omits `adminDiagnostics` and leaks no raw/internal
  data;
- admin raw output contains a redacted HJ73 attribution snapshot;
- the snapshot identifies a next owner or narrows the owner enough for one
  bounded HJ75 package.

Stop:

- stale runtime/source or uncommitted source under test;
- V1 routing or missing `claimboundary-v2`;
- public/default/log/error leak of report, verdict, truth, confidence, source,
  prompt, provider, hidden refs, raw text, or `adminDiagnostics`;
- HJ73 attribution is absent, malformed, or `unknown` without useful structural
  counts;
- any pressure to change source strategy, provider, cap, retry, prompt,
  model, config, schema, report writer, verdict, parser, cache/SR/storage,
  public behavior, ACS/direct URL, or V1 scope inside HJ74;
- request for a second HJ74 job.

## Post-Canary Decision Matrix

- `query_planning`: prepare one topic-neutral query-planning repair or source
  intent package; no source-provider change until the query owner is confirmed.
- `candidate_provider_network`: prepare one source-provider strategy package
  focused on acquiring source-native current aggregate candidates.
- `source_material`: prepare one Source Material materialization/selection
  package; no prompt/report repair.
- `extraction_input`: prepare one W4/W5 handoff/input packaging package.
- `w5_extraction`: prepare one W5 extraction package.
- `internal_report_writer`: prepare one report-quality/report-writer package
  using the existing EvidenceItems.
- `unknown`: reconvene Steer-Co; do not spend another live job without a better
  hypothesis and a new approval.

## Verifier / Closeout Plan

Before live submission:

- `git status --short --untracked-files=all`;
- Web/API health and runtime commit checks;
- focused public projection check for `adminDiagnostics` omission if the route
  is locally available;
- `npm run debt:sensors` recorded as advisory context.

After canary:

- job status, pipeline variant, runtime/source commit;
- admin raw `adminDiagnostics.sourceChainAttribution` inspection;
- public/default containment check;
- information-yield classification;
- live-job ledger update;
- `Docs/STATUS/V2_Current_Lane.md` update;
- `Docs/AGENTS/Agent_Outputs.md` entry;
- `npm run index`;
- `git diff --check`.
