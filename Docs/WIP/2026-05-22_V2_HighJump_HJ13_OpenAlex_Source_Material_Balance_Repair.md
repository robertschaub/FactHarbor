# V2 HighJump HJ13 OpenAlex Source Material Balance Repair

Date: 2026-05-22
Owner: Captain Deputy / Lead Developer lane
Status: implemented locally; verifier-clean; canary pending commit/runtime refresh

## Context

HJ12 repaired the W5 event-contract failure and produced a hidden internal Alpha
draft, but the draft remains `UNVERIFIED`. The active gap is source quality:
the hidden source portfolio still lacks sufficiently direct hydrogen-car versus
electric-vehicle efficiency comparison evidence under equivalent measurement
boundaries.

HJ12 evidence:

- W2 completed candidate-provider networking.
- W3-A materialized `9` source-candidate previews.
- W4-A admitted `9` Source Material records: `1` OpenAlex and `8` Wikimedia.
- W5 extracted `6` hidden EvidenceItems with `schemaDiagnostics = null`.
- W8-G created an internal Alpha draft, but it remains `UNVERIFIED`.

The artifact audit found that the current OpenAlex source-material path is an
existing mechanism but is too narrow: it stops after the first valid OpenAlex
record and the W3-B merge keeps only one OpenAlex record before filling the rest
of the nine-record budget with Wikimedia.

## Steer-Co Result

Steer-Co consented to a source-material balance repair before a new provider or
another prompt patch:

- Query Planning already produced plausible comparative and measurement-frame
  queries.
- W5 extraction is healthy after HJ12.
- The visible bottleneck is source portfolio composition and OpenAlex
  materialization breadth.
- Endpoint/provider expansion remains a follow-up only if this bounded repair
  does not improve source portfolio quality.

## Scope

Implement a bounded amendment to existing Source Material mechanisms:

- let the OpenAlex Source Material collector carry a small run-bounded set of
  valid OpenAlex abstracts instead of stopping after the first valid record;
- preserve one-valid-record-per-query diversity;
- preserve existing endpoint, transport, allowlist, timeout, byte, no-cache,
  no-storage, no-SR, no-public, and no-raw-leak controls;
- merge the bounded OpenAlex set ahead of Wikimedia fill records inside the
  existing nine-record Source Material cap.

Allowed files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts`
- focused tests for those files
- `Docs/WIP/2026-05-22_V2_HighJump_HJ13_OpenAlex_Source_Material_Balance_Repair.md`
- status/backlog/Agent_Outputs/handoff/index/ledger updates required by protocol

Out of scope:

- new provider or endpoint;
- prompt/model/config/schema edits;
- deterministic semantic source ranking or comparator heuristics;
- parser execution;
- retries;
- cache/SR/storage behavior;
- public API/UI/report/export/compatibility exposure;
- report/verdict/warning/confidence publication;
- ACS/direct URL support;
- V1 reuse, cleanup, or removal.

## V2 Scorecard Impact

- Advances report-quality value by improving the source portfolio available to
  W5/W6/W7/W8.
- Does not claim report-quality success until a canary demonstrates improved
  direct-comparison evidence or a clearer retrieval gap.
- Preserves public-precutover containment.

## V2 Retirement Ledger Impact

- No new hidden stage or route is added.
- This amends existing Source Material and OpenAlex mechanisms, so net mechanism
  count should remain unchanged.
- If HJ13 succeeds, it strengthens the case to avoid broader provider expansion.
- If HJ13 fails, it becomes evidence for a later HJ14 provider/endpoint package.

## V2 Consolidation Gate

This package is allowed because it directly advances report value and amends an
existing too-narrow mechanism instead of adding another readiness layer.

## Debt-Guard

DEBT-GUARD INVENTORY

- Symptom: HJ12 generated an internal Alpha draft but remained `UNVERIFIED`
  because direct comparative evidence was not present in the portfolio.
- Verifier: HJ12 canary `4dfbcd7627414738b0216d200df550c4`.
- Likely recent change surface:
  `source-acquisition-network-factory.ts` and
  `evidence-lifecycle-source-material-page-summary-owner.ts`.
- Existing mechanisms: OpenAlex collection, W3-B Source Material merge, nine
  record Source Material cap.
- Debt signals: V2 footprint and boundary guard are already large; do not add
  another diagnostic or provider path for this slice.
- Constraints: no deterministic semantic filtering; no public/raw leak; no new
  provider; no prompt/config/schema edit.

Classification: `incomplete-existing-mechanism`.

COMPLEXITY BUDGET

- Chosen option: amend existing OpenAlex collection and W3-B merge.
- Files expected to change: two source files and two focused test files.
- Net mechanisms: unchanged.
- New branches/fallbacks/flags/helpers: only small helper extraction if needed
  for bounded OpenAlex selection.
- Code expected to remove/narrow: first-record-only OpenAlex stop behavior.
- Why not workaround stacking: no new provider, route, retry, prompt patch, or
  diagnostic is introduced.
- Verifier tier: safe-local/build plus one live canary after commit/runtime
  refresh if local verifiers pass and budget reconciliation is recorded.

Latest debt sensor: `advisory_warn` on 2026-05-22 with known V2 footprint,
boundary-guard, docs-volume, net-mechanism, and consolidation-marker warnings.

## Pass Criteria

Local:

- OpenAlex collector can return more than one valid abstract, bounded by the
  existing per-query candidate budget and with at most one record per query.
- W3-B merge admits the bounded OpenAlex set before Wikimedia fill records while
  preserving the existing nine-record Source Material cap.
- Invalid/oversize/unsafe OpenAlex records remain rejected.
- Default/admin redaction behavior is unchanged.

Canary, if run:

- Source Material contains more than one OpenAlex record when available.
- W5 completes with accepted EvidenceItems and no schema diagnostics.
- W8-G produces an internal Alpha draft without public/default-admin leak.
- The draft either improves toward direct-comparison evidence or produces a
  clearer provider-coverage failure signal for HJ14.

## Stop Criteria

Stop and reconvene Steer-Co if:

- implementation needs a new provider/endpoint, prompt edit, schema edit, retry
  path, route, or public behavior;
- OpenAlex balancing requires deterministic semantic ranking;
- focused tests or build fail with unclear root cause;
- the canary would run without clean commit/runtime provenance or budget
  reconciliation;
- the repair degrades containment or leak checks.

## Proposed Verifiers

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
- `npm -w apps/web run build`
- `npm run index`
- `git diff --check`

One post-implementation canary is justified if all verifiers pass. Because the
HighJump tranche is exhausted, the canary must be recorded as a Steer-Co
budget-reconciliation exception under the Captain's latest no-artificial-block
directive.

## Implementation Result

Implementation amended the existing mechanisms only:

- `collectOpenAlexSourceMaterialRecordsFromNetwork` now keeps one valid
  OpenAlex abstract per query until the existing per-query candidate budget is
  reached, instead of stopping after the first valid record.
- W3-B Source Material merge now admits the bounded OpenAlex set before
  Wikimedia fill records inside the existing `9` record Source Material cap.
- No provider, endpoint, prompt, schema, retry, public surface, parser,
  cache/SR/storage, or V1 behavior was added.

Failed-attempt recovery during focused tests:

- First failure: synthetic test budget invalid because total timeout was too low
  for the configured query count. Classified `keep`; fixed the test fixture.
- Second failure: test asserted the literal word `secret`, conflicting with the
  existing structural field `secretIncluded: false`. Classified `keep`; narrowed
  the assertion to actual forbidden secret values and raw URL fragments.

DEBT-GUARD RESULT

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend existing OpenAlex collection and W3-B merge.
- Rejected path: new provider/endpoint or query prompt patch before proving the
  existing OpenAlex path can carry a bounded scholarly set.
- What was removed/simplified: first-OpenAlex-only behavior.
- What was added: focused tests for bounded multi-OpenAlex collection and
  budgeted merge.
- Net mechanism count: unchanged.
- Verification: focused tests, full `analyzer-v2-runtime`, full `analyzer-v2`,
  V2 gate validation, gate-register self-test, debt sensors, build, index, JSON
  ledger parse, and whitespace checks passed locally.
- Debt accepted: none beyond the already-recorded HighJump canary budget
  exception requirement.
