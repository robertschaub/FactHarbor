# V2 Slice W6-D Retrieval Refinement Source-Material Fan-In Review Package

**Date:** 2026-05-21
**Status:** W6-D1 and W6-D2 locally implemented/verifier-clean; W6-D canary not run
**Author:** Captain Deputy
**Trigger:** W6-C5 corrected canary `305176cf9cd34829b08dc826cf850b64`
**Predecessor:** `Docs/WIP/2026-05-21_V2_Slice_W6-C5_Sufficiency_Decision_Gate_Canary_Result.md`
**Steer-Co result:** MODIFY, amendments incorporated

## Decision Requested

Approve W6-D as a two-step implementation sequence that addresses the W6-C5
`refine_retrieval` stop by increasing bounded source-material fan-in from the
already approved Wikimedia candidate path, without lowering the W6-C sufficiency
bar and without relaxing W7 gates.

W6-C5 proved:

- W2 produced hidden candidates;
- W3-B fetched one bounded page-summary Source Material record;
- W5 produced one accepted EvidenceItem;
- W6-C accepted the evidence but recommended `refine_retrieval`;
- W8-B remained blocked at `boundary_verdict_candidate_not_ready`.

The most direct next step is not another W6-C prompt retry. It is to give W6-C a
small, better-balanced evidence set from the existing provider path.

## Steer-Co Amendments

The review team consented to the direction with these required amendments:

- split W6-D into W6-D1 contract widening and W6-D2 runtime fan-in;
- list the existing single-record invariants that must be relaxed deliberately;
- keep the hard caps at `3` page-summary records and `4096` aggregate extraction
  input bytes;
- clarify that this is same-provider page fan-in, not true provider diversity;
- make selection structural only: existing candidate order, provider id equality,
  and hash/locator dedupe;
- keep drop reasons structural only;
- require canary evidence that fan-in actually fired when candidates were
  available;
- record which W6-C rubric dimensions changed in the next canary;
- do not run a second canary as a victory lap.

## Proposed Scope

### W6-D1 Contract Widening

W6-D1 may relax the current single-record contracts while preserving the
single-record path as a valid case. It must not add new fetch behavior, provider
behavior, live jobs, parser behavior, prompt/model/schema changes, or public
surface behavior.

Known single-record constraints to update or deliberately preserve:

| Site | Current invariant | W6-D target invariant |
| --- | --- | --- |
| `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.ts` | `sourceMaterialRecordCount !== 1` blocks | `1 <= sourceMaterialRecordCount <= 3`, structural drops recorded |
| `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.ts` | readiness `sourceMaterialRecordCount !== 1` blocks | same fan-in count invariant, admitted/rejected counts consistent |
| `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.ts` readiness lineage | `sourceMaterialRecordCount !== 1` blocks | same fan-in count invariant |
| `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.ts` admission lineage | `sourceMaterialRecordCount !== 1`, `admittedCorpusAdmissionInputCount !== 1`, `rejectedCorpusAdmissionInputCount !== 0` blocks | admitted count may be `1..3`, rejected count may be structural, total consistent |
| `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.ts` | page-summary `sourceMaterialRecordCount !== 1` blocks | same fan-in count invariant and aggregate cap |
| `apps/web/src/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.ts` | `boundedTextSidecarCount !== 1` blocks | `1 <= boundedTextSidecarCount <= 3`, aggregate extraction input bytes <= `4096` |
| `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.ts` packet observation | `packetCount !== 1` blocks | one aggregate packet is still preferred; if packet fan-in changes, all text remains aggregate-capped |
| `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.ts` input frame shape | one packet assumption | preserve one aggregate input frame unless W6-D1 tests prove a smaller multi-frame change is safer |

W6-D1 pass condition is verifier-clean backward-compatible contract widening.
The one-record W6-C5 path must remain accepted.

### W6-D2 Runtime Fan-In

W6-D2 may implement bounded fan-in over the existing W2/W3/W4/W5 path:

1. Select a small set of provider-owned Wikimedia source locators from the
   existing W2/W3-A candidate/preview materialization output.
2. Fetch bounded Wikimedia page summaries for up to `3` distinct locators using
   the already approved page-summary Source Material path.
3. Admit the resulting bounded source-material records into linked hidden/admin
   EvidenceCorpus text sidecars and extraction-input packets.
4. Execute the existing approved W5 bounded evidence extraction task over the
   aggregate bounded input packet.
5. Preserve W6-C and W8-B behavior unchanged, so the next canary can tell
   whether retrieval refinement moved the stop from `refine_retrieval` toward
   `caveat_report` or `continue_to_boundary_formation`.

This is a retrieval-quality step, not a report-generation step.

## Exact Boundaries

W6-D may:

- reuse only the existing Wikimedia Core search/page-summary provider path;
- increase bounded page-summary fetches from one record to at most `3` records;
- introduce a total aggregate extraction-input text cap of `4096` bytes;
- keep per-record text bounded by existing W3-B/W4-G limits;
- deduplicate by provider id plus locator/source-material hash;
- preserve provider id as `wikimedia_core`;
- use only structural selection: existing provider candidate order, provider id
  equality, locator/hash uniqueness, byte limits, and fetch availability;
- project text by hash/length/provenance by default;
- extend existing tests and boundary guards for multi-record fan-in.

W6-D must not:

- add semantic ranking, keyword filtering, topic-specific heuristics, or
  deterministic meaning-based source selection;
- add a second provider or endpoint family;
- fetch full page/source/html content;
- execute parser code;
- use cache, Source Reliability, durable storage, retries, or credentials;
- change W6-C prompt/schema/model policy, W7 prompt/schema/model policy, or
  gateway approval state;
- lower the W6-C sufficiency bar;
- relax W7-A/W7-B fail-closed gates;
- publish report/verdict/warning/confidence or public compatibility output;
- add ACS/direct URL support or V1 work.

## What W6-D Unlocks

W6-D unlocks a fairer sufficiency test by replacing the current one-page /
one-EvidenceItem bottleneck with a small bounded same-provider page fan-in. This
is not true source diversity. If W6-C still recommends `refine_retrieval` after
this slice, the next improvement likely belongs in query planning, provider
coverage, or source diversity rather than W6-C prompt wording.

## What W6-D Retires Or Merges

W6-D does not retire W6-C. It should retire the current implicit assumption that
one fetched page-summary record is enough for W6 sufficiency evaluation.

Retirement pressure:

- mark the single-record W3-B/W4-G/W4-H path as a compatibility baseline, not
  the preferred sufficiency canary path;
- if W6-D canary passes with multiple records, future W6/W7 canaries should use
  W6-D fan-in rather than the one-record path.

## Cap Rationale

The fan-in cap is `3` because:

- `2` records may only prove that the pipeline can repeat a single fetch path,
  while still leaving W6-C with an obviously narrow evidence base;
- `3` records is enough to test bounded aggregation, dedupe, cap handling, and
  W6-C sufficiency movement without widening provider or endpoint scope;
- `5` records increases source-acquisition and token cost before W6-C has shown
  that same-provider page fan-in is the right next retrieval improvement.

The aggregate extraction-input cap remains `4096` bytes. Cap hits must be
recorded as structural drops. W6-D must not raise caps opportunistically during
implementation or after a canary.

## Artifact Shape

Default admin artifacts/routes must remain hash/length/provenance-only.

Recommended additions:

- `sourceMaterialRecordCount`
- `aggregateSourceMaterialTextByteLength`
- `aggregateExtractionInputByteLength`
- `sourceMaterialRecordHashes`
- `providerIds`
- `deduplicatedRecordCount`
- `droppedRecordCount`
- `dropReasons`
- `fanInCap`
- `fanInStatus`
- `w6cRubricDimensionDeltas` for canary/result documentation

Allowed structural `dropReasons`:

- `duplicate_locator_or_hash`
- `aggregate_text_cap_exceeded`
- `record_text_cap_exceeded`
- `source_material_unavailable`
- `source_material_fetch_failed`
- `invalid_source_material_shape`
- `provider_id_mismatch`

Forbidden in default admin/public/log/error output:

- source text;
- source snippets/summaries/extracts;
- raw provider payloads;
- raw URLs/titles/page keys;
- EvidenceItem statement text;
- input text;
- prompt/rendered prompt text.

## Balanced Risk Mitigation Record

| Field | Decision |
| --- | --- |
| Named risk | W6-D could add broad hidden machinery without proving report-value movement. |
| Decision result | Split into W6-D1 contract widening and W6-D2 runtime fan-in; canary only after both are verifier-clean. |
| Rejected alternatives | W6 prompt retry, provider expansion, larger cap, parser/full-page fetch, semantic source ranking. |
| Owner | Captain Deputy coordinates; Lead Developer implements inside approved package; Steer-Co reviews boundary pressure. |
| Verifier | Focused W3/W4/W5 tests, boundary guard, V2 gate validation, gate-register self-test, debt sensors, build, diff check. |
| Net-complexity impact | Limited contract widening plus bounded reuse of existing Source Material owners; no new public route unless existing artifacts cannot safely represent fan-in. |
| Residual risk | Same-provider page fan-in may still leave W6-C at `refine_retrieval`; that becomes evidence for query/source diversity, not for prompt weakening. |
| Removal / merge trigger | If W6-D canary succeeds, make W6-D fan-in the preferred W6/W7 canary path and downgrade one-record path to compatibility baseline. |

## Pass / Stop Criteria

Local implementation passes only if:

- W6-D1 and W6-D2 each close verifier-clean before any canary;
- focused W3/W4/W5 fan-in tests pass;
- the one-record W6-C5 path remains accepted;
- default route projections prove no text/raw payload leakage;
- W5 can consume the aggregate packet and still produce hash/length/provenance
  default projections;
- boundary guard confirms no provider expansion, parser, cache/SR/storage, V1,
  or public-surface import drift;
- `npm run debt:sensors` remains advisory-only.

One later canary may be proposed only after W6-D1 and W6-D2 implementation
commits are clean, runtime is refreshed, routes are preflighted, and the live
ledger is updated. No second W6-D canary is authorized as a victory lap.

Canary success signals:

- W2/W3/W4/W5 hidden chain reaches W5 with more than one bounded source-material
  record when candidates are available;
- W5 produces one or more accepted EvidenceItems without schema diagnostics;
- W6-C reaches `sufficiency_assessment_completed` with `schemaDiagnostics =
  null`;
- result documentation records which W6-C rubric dimensions changed compared
  with W6-C5, not only the final enum;
- W6-C recommendation is either `caveat_report` or
  `continue_to_boundary_formation`, or it remains `refine_retrieval` with clear
  missing dimensions for the next retrieval stage;
- public V2 remains damaged/precutover and default admin routes remain text-free.

Stop / pivot conditions:

- if aggregate text caps are exceeded, fail closed and reduce fan-in or record
  capped drops; do not raise caps opportunistically;
- if W5 schema diagnostics reappear, stop and diagnose W5 before another live
  job;
- if W6-C still returns `refine_retrieval`, stop and prepare a query/source
  diversity package rather than W6 prompt retries;
- if W6-C returns `damage_report`, stop and diagnose source/evidence quality;
- if any public/default-admin/log/error text leak appears, hard stop.

## Verifier Plan

Required before implementation closeout:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
npm run index
git diff --check
git status --short --untracked-files=all
```

No expensive benchmark suite is required for the implementation package.

## V2 SCORECARD IMPACT

Directly advances report-value prerequisites:

- more balanced evidence intake before sufficiency;
- better chance of moving from infrastructure-only progress to internal Alpha
  report content;
- preserves quality by keeping W6-C responsible for saying more retrieval is
  needed.

Cost posture:

- at most two additional small Wikimedia page-summary HTTP calls in the canary
  path;
- no added model task beyond existing W5/W6 chain;
- aggregate text cap prevents token blow-up.

## V2 RETIREMENT LEDGER IMPACT

New row recommended after implementation:

- retire or downgrade the one-record source-material canary path as the main W6
  sufficiency proof path once W6-D fan-in is verifier-clean and canary-tested.

No existing owner should be deleted in W6-D.

## V2 CONSOLIDATION GATE

W6-D is allowed only because it advances real report-quality value and does not
add another denial/proof-only mechanism. It must reuse existing W2/W3/W4/W5
owners where possible and avoid a new route unless an existing route cannot
represent multi-record fan-in safely.

Latest debt sensor:

- `npm run debt:sensors` at `2026-05-21T03:10:17Z` returned
  `advisory_warn`;
- salient warnings remain V2/test/boundary-guard/docs footprint and existing
  consolidation-marker warnings.

## Approval Boundaries

This package is review-only until Captain Deputy closes the amended Steer-Co
review as accepted.

Implementation must proceed as W6-D1 then W6-D2. A live canary requires both
implementation commits clean, runtime refresh, route preflight, clean status, and
explicit Steer-Co/Captain Deputy canary authorization under the active live-job
ledger.

## Implementation Closeout Addendum

W6-D1 is committed at `1abfacf9` and W6-D2 is locally implemented/verifier-clean pending its focused commit.

W6-D2 implemented only the approved runtime same-provider page-summary fan-in path:

- up to `3` structurally eligible W3-A materialized Wikimedia locators;
- existing candidate order;
- provider/locator/page-key hash dedupe;
- existing W3-B page-summary transport and Source Material record construction;
- no retries, provider expansion, parser, public behavior, prompt/model/config/schema edit, cache/SR/storage, report/verdict/warning/confidence behavior, ACS/direct URL, V1 work, or V1 cleanup.

No W6-D canary has run. A later W6-D canary still requires focused commit, clean status, runtime refresh, route preflight, live-job ledger update, and exactly one authorized product-route submission.
