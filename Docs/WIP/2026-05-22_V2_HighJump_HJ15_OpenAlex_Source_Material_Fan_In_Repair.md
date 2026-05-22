# V2 HighJump HJ15 - OpenAlex Source Material Fan-In Repair

## Context

HJ14 canary job `959c0246501c44558cbf8f484f9b6e3b` proved the hidden V2
W5 -> W8-G report chain still works, but it did not measurably deepen
Wikimedia Source Material. Public V2 remained blocked/precutover/damaged, W5
accepted `5` hidden EvidenceItems, and W8-G created a `7908` byte internal
Alpha draft. The source portfolio stayed unchanged from HJ13: `1` OpenAlex
record plus `8` Wikimedia records.

The HJ14 draft and W5 projections show the current evidence quality problem:
the report candidate is over-dependent on one OpenAlex abstract plus Wikimedia
definition/context material. The missing value is not another readiness layer;
it is a better bounded source portfolio for direct comparator evidence.

## Steer-Co Result

Steer-Co consented to a narrow HJ15 repair after artifact triage:

- classify this as `incomplete-existing-mechanism`;
- amend the existing OpenAlex Source Material collector, not Wikimedia, not a
  new provider, and not a report-prompt patch;
- collect unique valid OpenAlex abstract Source Material records up to the
  existing cap from already returned OpenAlex candidates;
- use structural de-duplication only;
- do not add semantic ranking, hardcoded comparator keywords, endpoint
  expansion, prompt/model/config/schema edits, parser/full source/html fetch,
  public behavior, cache/SR/storage, retries, ACS/direct URL, V1 work, or V1
  cleanup;
- run at most one post-repair canary after verifier-clean commit, runtime
  refresh, and explicit budget reconciliation.

Claude Opus review was attempted twice through `scripts/agents/invoke-claude.cjs`
but Anthropic returned `529 Overloaded`; reviewer coverage is therefore
degraded for this package. The internal Steer-Co lanes reached consent.

## V2 Scorecard Impact

- Directly advances report-quality value by trying to provide more than one
  bounded scholarly Source Material record to W5/W8.
- Keeps the current W5/W8 report path moving instead of blocking on broader
  architecture work.
- Preserves public cutover safety: public V2 must remain
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.

## V2 Retirement Ledger Impact

- No new stage, route, provider, parser, prompt, schema, public surface, cache,
  SR, storage, or retry mechanism is added.
- This narrows an existing OpenAlex under-materialization mechanism. It should
  reduce pressure for a new provider if it succeeds.
- W3-B naming drift remains accepted debt: current "page-summary" labels cover
  both Wikimedia extracts and OpenAlex abstract Source Material. Removal/merge
  trigger: after the HighJump report-quality path stabilizes, rename or merge
  W3-B summary/extract/source-material terminology without changing behavior.

## V2 Consolidation Gate

Allowed:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- focused `source-acquisition-network-factory` tests;
- status/backlog/Agent_Outputs/handoff/index/ledger docs required by protocol.

Not allowed:

- prompt/model/config/schema edits;
- new provider or endpoint expansion;
- parser/full page/source/html fetch;
- deterministic semantic source ranking or comparator keyword logic;
- report synthesis changes;
- public API/UI/report/export/compatibility behavior;
- cache/SR/storage behavior;
- ACS/direct URL support;
- V1 reuse, cleanup, or removal.

## Debt-Guard

Latest debt sensor: `advisory_warn` on `2026-05-22T04:19:25.349Z` with known
V2 footprint, boundary-guard size, docs-volume, net-mechanism, and
consolidation-marker warnings.

DEBT-GUARD INVENTORY:

- Symptom: HJ14 produced an internal Alpha draft, but the source portfolio still
  carried only one OpenAlex Source Material record.
- Evidence: W5 extracted `3` EvidenceItems from the same OpenAlex source plus
  `2` Wikimedia definition/context items.
- Candidate root cause: `collectOpenAlexSourceMaterialRecordsFromNetwork(...)`
  stops after the first created OpenAlex record per query response and has no
  local structural de-duplication before returning records to W3-B.
- Existing mechanism to amend: OpenAlex candidate projection and Source Material
  record construction.
- Rejected alternatives: new provider, endpoint migration, parser/full text
  fetch, prompt repair, report-prose repair, retry/fallback stack, semantic
  source ranking.

COMPLEXITY BUDGET:

- Net mechanisms: unchanged.
- Expected source change: one existing collector function.
- Expected tests: focused multi-record fan-in, duplicate collapse, invalid
  candidate skip, cap enforcement, raw-leak protection.
- Stop if the fix requires increasing query/provider/candidate caps or adding
  semantic selection.

## Implementation Scope

Amend the existing OpenAlex collector so it:

- keeps existing endpoint, provider, query, byte, timeout, retry, and candidate
  caps unchanged;
- iterates projected candidates in existing provider order;
- emits candidate preview projections as today;
- creates Source Material records for valid abstracts;
- structurally de-duplicates records by stable source/text identity;
- keeps collecting until the existing `maxCandidatesPerQuery` cap is reached or
  existing query entries are exhausted;
- does not let invalid/no-abstract candidates consume record slots;
- strips raw provider payload and poison metadata as today.

## Pass Criteria

Local:

- fixture proves multiple valid OpenAlex candidates in one response can become
  multiple Source Material records up to the existing cap;
- duplicate candidates collapse structurally;
- invalid/no-abstract candidates are skipped without consuming slots;
- request parameters, endpoint, timeout, no-retry, no-cache/SR/storage, and
  hidden-only posture remain unchanged;
- raw provider URL/secret fragments do not appear in returned records,
  telemetry, or previews;
- W4/W5 redaction and lineage tests continue to pass.

Canary, if run:

- W4-A contains more than one valid OpenAlex Source Material record if the live
  OpenAlex response provides multiple valid abstracts;
- W5 completes with accepted EvidenceItems and `schemaDiagnostics = null`;
- W8-G creates an internal Alpha draft or gives a clearer source-quality stop;
- public V2 remains blocked/precutover/damaged with no hidden text leak.

## Stop Criteria

Stop and reconvene Steer-Co if:

- local fixtures cannot reproduce OpenAlex under-materialization;
- implementation needs a new provider, endpoint, prompt/schema/model/config
  edit, parser/full source/html fetch, cache/SR/storage, public behavior, or
  semantic source ranking;
- containment or default-admin redaction regresses;
- a live canary would run without a clean commit, runtime refresh, runtime hash
  match, and explicit budget reconciliation.

## Implementation Result

Implementation amended only
`apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`.

Behavior change:

- the OpenAlex collector now keeps a structural set of Source Material identity
  keys for each returned record;
- it continues through projected OpenAlex candidates instead of stopping after
  the first valid record in a response;
- it skips structurally duplicate records without consuming cap space;
- it skips invalid/no-abstract candidates without consuming cap space;
- it stops at the existing `maxCandidatesPerQuery` cap and does not increase
  endpoint, query, provider, retry, timeout, or byte scope.

Focused test coverage added:

- multiple valid OpenAlex candidates in one response can produce multiple
  Source Material records;
- duplicate abstracts collapse structurally;
- invalid/no-abstract candidates do not consume slots;
- raw provider URL/secret fragments remain absent from returned records,
  telemetry, and previews.

DEBT-GUARD RESULT:

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend existing OpenAlex Source Material fan-in.
- Rejected path: provider expansion, Wikimedia re-tweak, prompt/report repair,
  parser/full source fetch, cache/SR/storage, retry/fallback stack, semantic
  source ranking.
- Net mechanism count: unchanged.
- Accepted debt: no rename of W3-B summary/extract terminology in this slice;
  the retirement trigger above remains.

## Local Verification

Passed before implementation commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
  - `1` file / `8` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts`
  - `3` files / `19` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - `74` files / `353` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - `142` files / `861` tests
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
  - `advisory_warn`, generated `2026-05-22T04:32:29.364Z`; warnings are the
    known V2 footprint, boundary-guard size, docs volume, net-mechanism, and
    consolidation-marker warnings.
- `npm -w apps/web run build`
- `git diff --check`

## Canary Plan

If local verifiers pass and the implementation is committed/refreshed, run
exactly one HJ15 canary under Steer-Co budget reconciliation. The HighJump
tranche is exhausted, so this must be recorded as exception overrun `5` if run.

Use the Captain-defined input:
`Using hydrogen for cars is more efficient than using electricity`.

Do not run a second HJ15 canary without a new reviewed package.

## Canary Result

Canary job: `42e9c2a6ce2a4bb5bd551900db230249`.

Runtime commit: `c1bfba1d57dc36b15a1200288246a45faea31fdc`.

Classification:
`PARTIAL_X7_HJ15_OPENALEX_FAN_IN_IMPROVED_W4G_AGGREGATE_CAP_STOP`.

Result:

- public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- W4-A Source Material improved from the HJ14 `1` OpenAlex record to `3`
  OpenAlex records, plus `6` Wikimedia records;
- W4-A total bounded Source Material bytes were `12736`:
  - OpenAlex: `3` records / `5512` bytes total;
  - Wikimedia: `6` records / `7224` bytes total;
- W4-G blocked with `blocked_pre_bounded_corpus_text_oversized` /
  `source_material_text_oversized` because the existing aggregate bounded-text
  cap is `12288` bytes and the richer HJ15 material set was `12736` bytes;
- W4-H therefore recorded `blocked_pre_extraction_input_w4g_not_positive`;
- W5 recorded `blocked_pre_execution` / `w4h_packet_invalid`;
- W8-B and W8-G artifacts were not created for this run;
- default hidden/admin routes stayed `no-store`;
- no public Source Material, EvidenceItem, source text, or draft text leak was
  found. Search hits were limited to expected public user-input fields,
  internal/admin query/preview artifacts, and hash/length/provenance fields.

The standalone W3-B Source Material route again returned `404` for this ledger
while W4-A/W4-F carried W3-B state downstream. Keep this as an
inspection-coverage caveat, not as source-material failure evidence.

Debt-guard result after canary:

- Classification: `incomplete-existing-mechanism`.
- HJ15 implementation itself worked: OpenAlex fan-in now materializes multiple
  unique valid OpenAlex abstract records.
- The next blocking mechanism is downstream bounded-text aggregate handling,
  not OpenAlex collection.
- Lowest-complexity next direction should amend the existing aggregate cap or
  aggregate selection path in W4-G/W4-H, with Steer-Co consent, rather than
  adding another provider, source route, readiness layer, or report-prose patch.

Budget:

- HJ15 consumed the single Steer-Co budget-reconciliation exception job.
- HighJump tranche remains exhausted.
- Exception overrun count is now `5`.
- No second HJ15 canary is authorized.
