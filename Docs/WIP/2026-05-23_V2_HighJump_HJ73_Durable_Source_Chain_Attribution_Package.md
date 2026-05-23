# V2 HighJump HJ73 - Durable Source-Chain Attribution Package

Status: Steer-Co pass-with-concerns; package amended for implementation review

## Objective

HJ71 and HJ72 both produced admin-only internal Alpha reports for the
Captain-defined current-asylum input, but both missed the decisive comprehensive
current asylum-domain aggregate for the `235000` threshold. HJ72 also repeated
the HJ71 observability gap: authenticated process-local hidden artifact routes
returned `404`, so the closeout could not prove whether the missing aggregate
was never found, found but not materialized, materialized but dropped, reached
W5 and was not extracted, or reached the report writer and was not used.

HJ73 is a no-live attribution repair. It must make the next source-quality step
evidence-based by attaching a bounded, redacted, admin-only source-chain
attribution snapshot to the existing V2 job result envelope. It must not create
another analysis stage, report layer, provider strategy, route family, or live
canary.

## Authority

Captain has authorized HighJump continuation and instructed the team not to
artificially block internal V2 report creation. The active live-job tranche is
exhausted after HJ72, so HJ73 may not run a live job. Steer-Co sidecars and the
Claude Opus challenge converged that the next step should be durable attribution
before another source strategy or query/provider repair.

This package treats HJ73 as an amendment to existing V2 admin diagnostics and
result-envelope persistence, not as new cache/SR/storage infrastructure. If the
implementation requires a new database table, new retention policy, new public
API projection, raw source text, raw URLs, titles, snippets, raw query text,
provider payloads, or hidden route expansion, stop and reconvene Steer-Co before
coding further.

## Steer-Co Outcome

Consolidated reviewer result:

- Sagan: use durable attribution to identify whether the loss point is query,
  provider candidate, Source Material, W4 handoff, W5 extraction, or reporting;
  prefer amending existing admin result/stop-summary mechanisms over adding a
  route family.
- Noether: HJ73 is justified as a convergence aid only if it retires reliance
  on process-local hidden routes for HighJump diagnosis and remains a redacted
  projection over existing decisions.
- Russell: first prove existing persisted job metadata is insufficient, then
  package the smallest durable attribution repair; do not let it become a
  general hidden observability platform.
- Claude Opus: attribution-first is the balanced path; it restores the ability
  to evaluate HighJump results and should remain separate from a later source
  strategy package.

Consent: proceed with a no-live package for durable redacted source-chain
attribution after the concerns below are enforced. Do not spend live budget,
widen providers, or change source strategy inside HJ73.

Concerns now incorporated:

- prove existing persisted job metadata is insufficient before adding the
  durable snapshot;
- treat HJ73 as an amendment/merge of existing admin result diagnostics, not a
  new hidden artifact/route/sink family;
- keep the attribution contract allowlisted and redacted;
- make public/default omission a verifier, not an assumption;
- do not let HJ73 become a new prerequisite proof layer before report-quality
  work.

## Existing Evidence

Existing persisted job evidence after HJ72 includes only:

- job status, pipeline variant, git commit hashes, event history, and admin
  report markdown;
- a public/default blocked V2 projection limited to `_schemaVersion`, `meta`,
  `input`, and `warnings`;
- admin raw `resultJson`, which currently lacks durable source-chain
  attribution beyond the structural damaged envelope.

Process-local hidden artifact routes contain richer stage artifacts, but they
are not durable across the runtime/process boundary that mattered in HJ71 and
HJ72. The repeated `404` is enough evidence that another live job without
durable attribution has low information yield.

## Persisted-Data Insufficiency Proof

HJ72 persisted data can prove:

- the default manual route selected `claimboundary-v2`;
- the job succeeded on runtime/source commit
  `30e70b6d721b53d513e24a52322c7be59db39186`;
- public/default V2 stayed blocked/precutover and did not expose report fields;
- admin report markdown was produced and remained `UNVERIFIED`;
- process-local hidden route probing returned `404`.

HJ72 persisted data cannot prove:

- which query entries were generated or whether they requested source-native
  current aggregate records;
- whether the candidate provider network returned candidates that could have
  contained the aggregate;
- whether a relevant candidate was previewed but not materialized as Source
  Material;
- whether bounded Source Material reached W4-H/W5 with enough text bytes;
- whether W5 omitted extractable evidence from useful bounded text;
- whether the report writer ignored an EvidenceItem that actually existed.

That gap is the HJ73 justification. HJ73 must fill only this structural
attribution gap; it must not attempt to repair the underlying source strategy in
the same slice.

## Scope

Allowed implementation envelope:

- add a small V2 source-chain attribution projection helper under
  `apps/web/src/lib/analyzer-v2/` or `apps/web/src/lib/analyzer-v2-runtime/`;
- amend `apps/web/src/lib/analyzer-v2/orchestrator.ts` to populate the helper
  from already-owned in-memory decisions that the orchestrator already creates;
- amend `apps/web/src/lib/analyzer-v2/result-envelope.ts` to accept and attach
  a redacted admin-only attribution snapshot outside `meta`, `input`, and
  `warnings`;
- update focused V2 unit tests for the result envelope/orchestrator projection;
- update `apps/api.Tests/Services/ResultCompatibilityTests.cs` only to assert
  that blocked public V2 projections omit the admin-only attribution while
  admin raw output keeps it;
- update this package, active status/backlog/current-lane docs, Agent Outputs,
  handoff/index files as required by protocol.

Closed:

- live jobs/canaries or tranche reset;
- prompt/model/config/schema/UCM/gateway edits or approval flips;
- source/provider expansion, endpoint migration, cap increases, retries,
  parser execution, cache/SR/storage infrastructure, ACS/direct URL, V1 work;
- new public API/UI/report/export/compatibility behavior;
- new authenticated route family or hidden artifact sink;
- raw source text, source excerpts, URLs, titles, page keys, provider payloads,
  raw query text, prompt text, hidden ledger ids, or internal process-local
  route data in public/default-admin/log/error surfaces;
- deterministic semantic source ranking or topic/source-specific logic.

## Attribution Snapshot Contract

The snapshot must be structural and redacted. It may include:

- `version`: `v2.highjump.source-chain-attribution.hj73`;
- `visibility`: `internal_admin_only`;
- `defaultProjection`: `redacted_hash_length_provenance_only`;
- `runId`, `createdUtc`, and public cutover status;
- source-chain stage statuses:
  - Claim Understanding accepted/rejected;
  - Query Planning status and query count;
  - candidate provider network status, provider attempt count, candidate count,
    total candidate count, and byte count category/number if already present in
    existing telemetry;
  - source candidate preview count;
  - Source Material status, record count, materialized-preview count, attempted
    fetch count, fetch diagnostic count, source-material kind counts, provider
    id counts, total bounded text bytes, and truncation count;
  - W4-G sidecar count/status, W4-H packet count/status, W4-I readiness status;
  - W5 execution status, extraction status, EvidenceItem count, source-content
    packet count, and parent packet byte length;
  - downstream report writer status when available;
- bounded refs/hashes:
  - source material refs may be represented only by short opaque stable refs or
    hashes already present in V2 structural records;
  - source text hashes and byte/char lengths are allowed;
  - query and candidate ordinals are allowed when structural and non-semantic;
  - query text is not allowed; use query count, query ids, or query hashes only
    if they already exist as structural non-secret metadata;
- `lossPointCandidate`: one structural enum such as
  `query_planning`, `candidate_provider_network`, `source_material`,
  `extraction_input`, `w5_extraction`, `internal_report_writer`, or
  `unknown`.

It must not include:

- input text beyond what already exists in the V2 envelope input section;
- source text, snippets, summaries, titles, URLs, page keys, provider raw JSON,
  raw query text, stack traces, prompt text, model raw output, or hidden ledger
  ids;
- semantic labels such as "SEM", "asylum", "Swiss", "official", "aggregate",
  or topic-specific ranking reasons.

## Debt-Guard

DEBT-GUARD INVENTORY

- Symptom: HJ72 repeated the HJ71 quality gap and process-local hidden artifact
  `404`, producing no new useful information about the missing source-chain
  owner.
- Verifier: HJ72 live job `e2730cb5795e441cbf10831edd18047c`, result package
  `Docs/WIP/canary-evidence-hj72-serper-ordinal-fallback.json`, public
  containment checks, and authenticated artifact route `404`.
- Existing mechanisms: admin report markdown stop summaries, V2 result envelope,
  process-local hidden artifact sinks/routes, Source Material/W4/W5 structural
  decisions, API blocked public projection.
- Debt signals: V2 hidden artifact/routes are numerous; process-local routes
  are insufficient for post-run HighJump diagnosis; boundary guard and V2
  footprint are above advisory thresholds.
- Constraints: no live budget, no public/default leak, no raw text/URL/query/
  provider payload, no provider/cap/retry/parser/cache/SR/storage expansion, no
  deterministic semantic text logic.
- Unknowns: exact implementation helper shape and whether existing tests can
  cover orchestrator projection without broad mocks.

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing result-envelope/admin diagnostic mechanism
with a redacted source-chain attribution snapshot.

Rejected options:

- another live canary: budget is exhausted and HJ72 repeated the same stop;
- another query prompt or Source Material nudge: owner is no longer provable
  from durable evidence;
- new hidden route family: repeats the process-local route weakness and adds
  debt;
- provider/cap/retry/parser/source strategy: broader than the attribution gap;
- raw admin artifact dump: violates leak and maintainability constraints.

COMPLEXITY BUDGET

- Chosen option: amend.
- Files expected to change: one helper, orchestrator, result envelope, focused
  tests, API compatibility test, docs/index/handoff.
- Net mechanisms: small increase in redacted admin diagnostics, offset by a
  retirement/merge trigger for reliance on process-local hidden route diagnosis.
- New public surface: none.
- New route: none.
- Tests/verifiers: focused unit tests, API compatibility projection test,
  boundary guard if imports/contracts change, build, debt sensors, index,
  diff checks.
- Why this is not workaround stacking: it does not attempt another report
  repair; it makes the next repair owner falsifiable and merges HighJump
  diagnosis into existing durable job result data.
- Debt accepted: planned temporary diagnostic debt with retirement trigger below.

## Balanced Risk Mitigation

Named risk: repeated live HighJump jobs cannot identify the source-chain loss
point because process-local hidden artifact routes are unavailable after
completed runs.

Decision result: amend.

Rejected alternatives:

- Add a route/sink family: stronger immediate inspection but higher debt and
  still process-local.
- Add source strategy/provider work now: may improve or fail without knowing
  the loss point.
- Do nothing: causes more low-yield live jobs after a tranche reset.

Owner: Lead Developer for implementation, Captain Deputy for closeout and lane
discipline.

Verifier: local redaction/projection tests plus API blocked-public projection
test; no live job in HJ73.

Net-complexity impact: bounded increase in result-envelope admin diagnostics;
no new route, provider, cache, storage system, parser, or report stage.

Residual risk: adding an admin-only result field still increases persisted
payload shape. Public projection tests must make this safe.

Removal / merge trigger: after a stable persisted run-ledger/report-result
diagnostic contract exists or after source-chain ownership becomes directly
visible in accepted internal reports, merge HJ73 fields into the stable report
quality diagnostics or retire them.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q2 evidence acquisition, V2-Q3 EvidenceItem
quality, V2-Q10 complexity convergence.

Direct user/report value: indirect but necessary; it prevents another
low-yield source repair by making the next report-quality owner observable.

Hidden-only value: provides redacted durable source-chain attribution for
internal Alpha report diagnosis.

Cost/latency impact: no provider calls, no model calls, no retries, no live job;
small serialization overhead only.

Retirement or simplification unlocked: reduces reliance on process-local hidden
artifact route probing for HighJump closeout and enables later route-family
consolidation.

Scorecard risk: if it grows into a general observability platform, it delays
report value. Keep HJ73 to the minimum source-chain fields needed to choose the
next source/report owner.

## V2 Retirement Ledger Impact

Rows touched:

- V2-RL-004 V2 hidden observability ledger and admin-only artifact routes:
  merge pressure increases; HJ73 should reduce reliance on process-local route
  probes for HighJump diagnosis.
- V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings: keep; HJ73
  helps decide which lowered bar or source repair should be raised/merged next.
- V2-RL-024 HJ37 bounded Serper linked-page Source Material: keep/merge; HJ73
  should expose whether current Source Material is the active loss point.

Status changes: none in this package.

New mechanism owner: Lead Developer, as a bounded result-envelope admin
diagnostic until merged or retired.

Removal / merge trigger: see Balanced Risk Mitigation.

Debt accepted: small temporary persisted diagnostic shape; no new route or
source mechanism.

## Consolidation Gate

HJ73 is allowed only because it consolidates repeated live closeout diagnosis
into an existing durable job result surface. It must not be used to add another
gate, denial, proof layer, or route family. If implementation cannot stay in
the result-envelope/admin diagnostics path, stop and reconvene Steer-Co.

## Implementation Plan

1. Add a small projection helper that accepts existing orchestrator-owned
   decisions and returns a redacted `SourceChainAttributionSnapshot`.
2. In the orchestrator, initialize the snapshot as `unknown` and update it as
   Query Planning, candidate network, Source Material, W4, W5, and report
   writer decisions become available.
3. Pass the final snapshot into `buildDamagedClaimBoundaryV2Envelope`.
4. Add the snapshot under a new top-level admin-only result field outside
   `meta`, `input`, and `warnings`, for example:
   `adminDiagnostics.sourceChainAttribution`.
5. Keep the public narrative and public blocked projection unchanged.
6. Add tests proving:
   - the helper includes structural counts/statuses/hashes/lengths;
  - it excludes source text, snippets, summaries, titles, URLs, raw query text,
    provider payloads, prompt text, model output, and hidden ledger ids;
   - blocked public V2 projection omits `adminDiagnostics`;
   - admin raw V2 result keeps `adminDiagnostics`;
   - existing damaged warning and quick-field behavior stay unchanged.

## Verifier Plan

No live job is authorized for HJ73.

Required before commit:

- focused helper/result-envelope tests to be defined during implementation;
- `dotnet test apps/api.Tests --filter ResultCompatibilityTests`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/orchestrator-w8b-product-chain.test.ts`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` if the implementation adds imports/contracts that boundary guard owns;
- `npm -w apps/web run build`;
- `npm run debt:sensors`;
- `npm run index`;
- `git diff --check`;
- `git diff --cached --check` before commit.

## Pass / Stop Criteria

Pass:

- HJ73 produces a redacted admin-only source-chain attribution snapshot in the
  existing V2 result envelope;
- blocked public V2 projection omits the snapshot;
- default/admin route projections do not expose raw source text, URLs, titles,
  snippets, raw query text, provider payloads, prompts, hidden ledger ids, or
  stack traces;
- no new route, provider, cap, retry, parser, cache/SR/storage infrastructure,
  public behavior, prompt/model/config/schema edit, ACS/direct URL, or V1 work;
- local verifiers pass.

Stop:

- implementation needs a new database table, retention policy, route family, or
  public/API/compatibility projection change;
- implementation needs raw source text, URLs, titles, snippets, provider
  payloads, raw query text, prompt text, or hidden ledger ids;
- tests show `adminDiagnostics` leaks into blocked public projection;
- helper starts making semantic/source-quality judgments in code;
- a live job or new tranche is requested.

## After HJ73

After HJ73 is committed and verifier-clean, reconvene Steer-Co with the
attribution evidence before spending a new live tranche. The next technical
package should choose exactly one owner:

- Source Material/source acquisition if the missing aggregate never becomes
  bounded Source Material;
- W4/W5 handoff or W5 extraction if useful bounded material reaches the
  extraction input but no EvidenceItem is produced;
- report writer/verdict/report-quality review if EvidenceItems exist but the
  report ignores or misuses them.

The next live package after a new tranche, if one is later approved, must name
the exact Captain-defined input, expected evidence-shape improvement, public
containment checks, and a stop condition that prevents repeating HJ72's
`same_stop_repeated_without_useful_new_information` result.
