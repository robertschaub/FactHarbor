# V2 HighJump HJ72 - Source Material Serper Ordinal Fallback Repair

Status: canary complete; stopped on repeated source-material quality gap

## Objective

HJ71 improved the current-stock query contract enough to produce one partial
direct stock snapshot, but the internal report still missed the decisive
comprehensive current asylum-domain aggregate for the Captain-defined
`asylum-235000-de` input.

HJ72 repairs a concrete no-live attribution finding in the existing Source
Material path: Serper-provided Source Material records are balanced by provider
attempt only when their `candidatePreviewId` is present in the capped
`sourceCandidatePreview` map. When other provider projections consume the
preview ledger cap, valid Serper-provided records can lose attempt/rank ordering
and fall back to a late `Number.MAX_SAFE_INTEGER` bucket. That weakens the HJ50
provider-attempt balancing without any report-quality benefit.

The repair must use only structural provenance encoded in the existing
`SOURCE_CANDIDATE_PREVIEW_<attempt>_<rank>` id. It must not inspect, rank, or
classify source text.

## Authority

Captain authorized HighJump continuation, prompt edits, schema changes when
naturally needed, and the current live-job tranche. HJ72 uses an in-place
existing-mechanism source-material repair and does not add a provider, parser,
retry, cache, storage, Source Reliability, public surface, or V1 scope.

The final live job in the tranche must be preserved until implementation is
committed, runtime is refreshed, and the verifier set passes.

## Team Review

Post-HJ71 sidecar review converged:

- Noether: HJ72 owner is Source Acquisition / Source Material selection and
  fetching, not W5/report writer or another query prompt nudge.
- Russell: preserve the final live job and require no-live attribution before
  coding or live spend.
- Sagan: inspect/replay the Serper Source Material path around provider-attempt
  balancing, linked-page allocation, XLSX discovery, and preview fallback.

Consolidated direction: amend the existing Source Material selector only if a
concrete structural failure is found. Local inspection found one: current code
falls back to `Number.MAX_SAFE_INTEGER` when a Serper-provided record is not in
the capped preview map, even though the record's `candidatePreviewId` already
contains structural attempt/rank ordinals.

## Scope

Allowed:

- amend
  `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts`;
- add/update focused tests in
  `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`;
- update this package, `Docs/STATUS/V2_Current_Lane.md`, `Docs/STATUS/Backlog.md`,
  `Docs/AGENTS/Agent_Outputs.md`, the live-job ledger/result artifact after
  validation, and generated indexes as required.

Closed:

- semantic or keyword ranking in code;
- asylum/Switzerland/SEM/source-specific logic;
- prompt/model/config/schema edits;
- provider expansion, endpoint migration, cap increases, retries, parser
  execution, cache/SR/storage, direct URL/ACS, V1 work;
- new observability route/sink, public/API/UI/export behavior, report writer,
  W5/W6/W7/W8 changes.

## Debt-Guard

DEBT-GUARD INVENTORY

- Symptom: HJ71 produced only partial direct stock evidence; decisive aggregate
  current-stock material remained absent.
- Local attribution: Source Material selection depends on preview-map lookup
  for Serper attempt/rank ordering; records omitted by the capped preview map
  are treated as late unknown records despite having structural ids.
- Existing mechanisms: HJ50 provider-attempt balanced Source Material selection,
  Serper bounded preview/linked-page records, W5 strict extraction, W8 report
  writer.
- Constraints: no deterministic semantic text-analysis logic; no source/topic
  hardcoding; no caps/retries/provider changes; public containment must hold.
- Unknowns: whether this structural repair is enough for the live provider to
  surface the official aggregate on the final rerun.

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing Source Material selector to recover
attempt/rank ordinals from the structural candidate preview id only when the
preview map lacks the record.

Rejected options:

- another query prompt nudge: HJ71 already tested this class and yielded only
  partial improvement;
- semantic source ranking: violates the LLM-intelligence boundary and would be
  topic fragile;
- observability route repair first: useful for diagnosis, but not report-value
  owner and would add hidden machinery;
- provider/cap/retry/parser/source-strategy expansion: broader than the local
  failure and inappropriate before spending the final job.

COMPLEXITY BUDGET

- Chosen option: amend.
- Files expected to change: one runtime owner file, one focused test file, docs
  and generated indexes.
- Net mechanisms: unchanged.
- New public surface: none.
- New helper: one structural id parser local to Source Material owner, or an
  equivalent small helper if tests need it.
- Verifier tier: local focused tests + build before the final live canary.
- Debt accepted: none.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q2 evidence acquisition and V2-Q3 EvidenceItem
quality.

Direct user/report value: improves the chance that bounded Source Material
contains the source-native current aggregate needed for a useful internal
report.

Hidden-only value: keeps the internal Source Material chain more faithful to
query/provider diversity without adding new hidden proof machinery.

Cost/latency impact: no new provider call, no retry, no cap increase; selection
order only.

Retirement or simplification unlocked: avoids a new source-selection mechanism
and preserves HJ50 balancing as the single Source Material ordering owner.

Scorecard risk: the final live job may still miss the aggregate if the provider
does not return a usable record; that would shift the next decision to source
strategy or model/config, not more ordinal repair.

## V2 Retirement Ledger Impact

Rows touched:

- V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings: keep.
- V2-RL-024 HJ37 bounded Serper linked-page Source Material: keep/merge.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: this repair remains part of the existing Source
Material owner; no separate mechanism is created.

Debt accepted: none.

## Consolidation Gate

This is not a new hidden mechanism. It preserves an existing balancing rule when
source-material provenance is structurally recoverable from the record id. If
the final canary still lacks useful direct aggregate evidence, stop and choose
between source strategy, model/config, or retrieval provider authority by
Steer-Co consent; do not add another source-material heuristic.

## Implementation Plan

1. Add a structural fallback that parses only ids matching
   `SOURCE_CANDIDATE_PREVIEW_<positive integer>_<positive integer>`.
2. In `selectedProvidedSerperRecords`, keep preview-map metadata as primary.
3. If preview-map metadata is missing, use the parsed structural attempt/rank
   ordinals.
4. If parsing fails, preserve the current late-unknown fallback behavior.
5. Add focused tests proving:
   - missing preview-map entries with structural ids still retain attempt/rank
     order;
   - malformed ids remain late unknown records;
   - existing preview-map metadata still wins;
   - caps, dedupe, byte limits, provider filters, and public/text containment
     behavior are unchanged.

## Verifier Plan

Before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `npm run index`
- `git diff --check`
- `git diff --cached --check`

After commit and runtime refresh, the package may spend exactly one live job
from the remaining tranche:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

## Pass / Stop Criteria

Pass:

- focused tests/build/diff checks pass;
- live rerun stays on `claimboundary-v2`;
- public/default containment holds;
- report evidence improves by surfacing comprehensive current aggregate
  asylum-domain stock material, or at least materially clearer source-native
  aggregate evidence than HJ71.

Stop:

- stale runtime/source or stale prompt/config state;
- V1 routing;
- public/default/log/error leak;
- same partial/direct-but-not-aggregate evidence repeats without new useful
  source material;
- the aggregate appears in W5 input but W5 omits it, shifting ownership to W5;
- any pressure to add semantic source ranking, provider expansion, cap
  increases, retries, parser/cache/SR/storage, public behavior, direct URL/ACS,
  or V1 scope inside HJ72.

## Local Implementation Result

Implemented inside the approved envelope:

- implementation commit:
  `bcefe3bf9976f11dd1860e23885acbb23893eb88`;
- added a local structural parser for
  `SOURCE_CANDIDATE_PREVIEW_<attempt>_<rank>`;
- kept the preview-map metadata as primary source of ordering;
- used structural id ordinals only when the preview map lacks the Serper record;
- preserved the previous late-unknown behavior when the id is malformed;
- added focused tests for missing preview-map records and malformed ids.

No prompt/model/config/schema, provider, cap, retry, parser, cache/SR/storage,
public/API/UI/report/export, direct URL/ACS, W5/W6/W7/W8, or V1 behavior was
changed.

Verifier results before implementation commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
  passed: 1 file, 19 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts`
  passed: 1 file, 10 tests.
- Initial `boundary-guard.test.ts` run timed out at the shell timeout. Failed
  validation recovery classified the patch as `keep` because the timeout was not
  a verifier assertion and the focused tests passed. Rerun with a longer timeout
  passed: 1 file, 96 tests.
- `npm -w apps/web run build` passed.
- `npm run debt:sensors` returned `advisory_warn` only for known V2 source/test
  footprint, boundary guard size, docs footprint, net-mechanism telemetry, and
  consolidation-marker warnings.
- `npm run index` passed.
- `git diff --check` passed.

DEBT-GUARD RESULT

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend the existing Source Material selector in place.
- Rejected path and why: prompt stacking, semantic source ranking, observability
  repair, provider expansion, cap increases, retries, parser/cache/SR/storage,
  and W5/report-writer changes would either add mechanisms or touch the wrong
  owner before preserving the existing HJ50 balancing rule.
- What was removed/simplified: none.
- What was added: one small structural id parser plus focused tests.
- Net mechanism count: unchanged.
- Budget reconciliation: actual diff stayed in the expected owner/test/package
  files and did not add public routes, flags, caps, providers, retries, or
  semantic text-analysis logic.
- Verification: focused owner test, Serper preview test, boundary guard, build,
  debt sensors, index, and diff check.
- Debt accepted and removal trigger: none.

## Canary Readiness

After the implementation commit, runtime refresh, and clean provenance check,
this package may spend exactly one final live job from the current tranche on
the Captain-defined input:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Do not run a second HJ72 canary without a new tranche or Captain-approved
follow-up package.

## Live Canary Result

Result artifact:
`Docs/WIP/canary-evidence-hj72-serper-ordinal-fallback.json`

Live job:

- job id: `e2730cb5795e441cbf10831edd18047c`;
- input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- runtime/source commit: `30e70b6d721b53d513e24a52322c7be59db39186`;
- pipeline variant: `claimboundary-v2`;
- status: `SUCCEEDED`;
- classification:
  `STOP_X7_HJ72_SOURCE_MATERIAL_ORDINAL_FALLBACK_NO_AGGREGATE_EVIDENCE_INTERNAL_REPORT_UNVERIFIED`;
- information yield: `same_stop_repeated_without_useful_new_information`.

Outcome:

- public/default containment held: public report markdown, verdict label, truth
  percentage, and confidence remained absent; public schema stayed
  `4.0.0-cb-precutover`; public cutover stayed `blocked_precutover`;
- unauthenticated hidden route probe returned `401`;
- authenticated process-local artifact routes returned `404` for the expected
  ledger id, repeating the HJ71 observability gap;
- the admin-only internal report was produced (`6129` characters) but stayed
  `UNVERIFIED` and still did not surface the decisive comprehensive current
  asylum-domain aggregate for the `235000` threshold;
- the report used official SEM current-statistics authority context and 2024
  application-flow context, but still did not include the current population
  stock count required by the claim.

Budget:

- remaining before HJ72 canary: `1`;
- consumed: `1`;
- remaining after HJ72 canary: `0`.

Stop decision:

The structural Serper ordinal fallback repair is kept because it preserves an
existing generic Source Material balancing invariant, but it did not improve
the live current-asylum report enough to pass HJ72. With the live tranche
exhausted and process-local artifact routes still unavailable, the next step
must be Steer-Co-guided source strategy or durable attribution. Do not run
another live job until a new tranche/approval exists.
