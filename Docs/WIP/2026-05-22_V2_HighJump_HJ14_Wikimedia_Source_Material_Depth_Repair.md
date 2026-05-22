# V2 HighJump HJ14 Wikimedia Source Material Depth Repair

Date: 2026-05-22
Owner: Captain Deputy / Lead Developer lane
Status: implementation package accepted by Steer-Co consensus; local implementation in progress

## Context

HJ13 reached W8-G and created an internal Alpha draft, but the draft remained
too weak for the Captain's hydrogen-car efficiency expectation. The live hidden
chain showed a source-material quality gap, not a new report-readiness gap:

- Query Planning produced comparator and well-to-wheel oriented queries.
- W3-A materialized relevant Wikimedia previews, including vehicle-efficiency,
  electric-car, hydrogen-vehicle, fuel-cell-vehicle, and transport-efficiency
  pages.
- W3-B carried short Wikimedia summaries plus one OpenAlex record.
- W5 extracted hidden EvidenceItems and W8-G created an internal draft, but the
  source portfolio still did not contain enough direct comparator material.

## Steer-Co Result

Steer-Co consented to HJ14 as the smallest balanced next repair:

- deepen existing Wikimedia Source Material first;
- do not add another provider yet;
- do not patch report or extraction prompts before improving the source
  substrate;
- do not add parser/full page/source/html fetch;
- run at most one post-repair canary after commit, runtime refresh, and local
  verifier pass.

Claude Opus review agreed with the same direction: HJ14 should be a
within-provider source-material deepening, not more hidden scaffolding and not a
new provider expansion.

## External API Reference Check

The existing W2 search path uses Wikimedia Core REST search. Wikimedia states
that `api.wikimedia.org` Core API deprecation starts gradually in July 2026 and
points equivalent routes to project-local endpoints. HJ14 does not expand that
Core search dependency.

For source material, HJ14 uses the project-local MediaWiki Action API
TextExtracts module through `en.wikipedia.org/w/api.php`, not the
`api.wikimedia.org` Core gateway. The official TextExtracts API returns
plain-text extracts with `action=query&prop=extracts&explaintext=1`; `exchars`
is a query parameter with an allowed maximum of 1200 characters.

Consequence: HJ14 can safely replace short REST summary bodies with bounded
plain-text extracts from the same materialized title, but it cannot use
TextExtracts as a full-page fetch. If HJ14 still leaves the draft unsupported,
the next package should decide between a second provider or a separately
reviewed page-content/source endpoint. Do not smuggle that widening into HJ14.

References:

- https://www.mediawiki.org/wiki/Extension:TextExtracts#API
- https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation

## Scope

Implement a bounded amendment to the existing W3-B Wikimedia Source Material
transport:

- keep the current W3-B page-summary owner, artifact, and downstream contract
  labels stable for this slice;
- change only the transport request so it uses project-local Action API
  TextExtracts for the already materialized title;
- request a bounded plain-text extract with query-string parameters only;
- normalize the provider response to the existing `{ extract }` shape before
  Source Material record creation, stripping provider title/page metadata from
  the transport outcome;
- preserve the existing 4096-byte Source Material text cap, byte/time caps,
  DNS/public-address validation, final remote-address validation, endpoint
  allowlist, redirect denial, no credentials, no cache, no storage, no Source
  Reliability, hidden/admin-only artifacts, and public pre-cutover block.

Allowed files:

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport.ts`
- focused W3-B Source Material tests
- `Docs/WIP/2026-05-22_V2_HighJump_HJ14_Wikimedia_Source_Material_Depth_Repair.md`
- status/backlog/Agent_Outputs/handoff/index/ledger updates required by
  protocol

Out of scope:

- new provider;
- broad endpoint migration;
- full page/source/html fetch;
- parser execution;
- prompt/model/config/schema/UCM/gateway edits;
- deterministic semantic source ranking or comparator keyword logic;
- retries or fallback stacks;
- cache/SR/storage behavior;
- public API/UI/report/export/compatibility projection;
- report/verdict/warning/confidence publication;
- ACS/direct URL support;
- V1 reuse, cleanup, or removal.

## V2 Scorecard Impact

- Advances report-quality value by carrying richer source text into the
  existing W3-B/W4/W5/W6/W7/W8 chain.
- Preserves evidence transparency because downstream EvidenceItems still come
  from hidden Source Material records with hashes, lengths, and provenance.
- Preserves public cutover safety: public V2 must remain
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.
- Improves cost/latency only if it avoids broader provider expansion; one live
  canary is the maximum evidence spend for this package.

## V2 Retirement Ledger Impact

- No new hidden route or stage is added.
- The current page-summary contract label is intentionally retained for
  downstream stability; if HJ14 proves useful, a later consolidation package can
  rename or merge the W3-B "summary/extract" terminology without broadening
  behavior.
- If HJ14 succeeds, it reduces pressure to add a second provider immediately.
- If HJ14 fails, it creates concrete evidence for a provider/endpoint expansion
  package instead of another same-provider tweak.

## V2 Consolidation Gate

This package is allowed because it directly advances report value by amending
an existing too-shallow Source Material mechanism. It adds no new readiness,
denial, proof, artifact route, or public surface.

## Debt-Guard

DEBT-GUARD INVENTORY

- Symptom: HJ13 produced an internal Alpha draft, but the source material still
  lacked enough direct comparator substance for a useful hydrogen-car versus
  electric-vehicle efficiency report.
- Verifier: HJ13 canary `1d85ff88bf6945cb8f7caefcbabc7d9c`.
- Likely recent change surface:
  `evidence-lifecycle-source-material-page-summary-transport.ts` and focused
  W3-B Source Material tests.
- Existing mechanisms: W3-B Wikimedia fetch locator, source-material transport,
  source-material record builder, artifact redaction, downstream W4/W5/W8
  hidden chain.
- Debt signals: V2 footprint and boundary guard are large; avoid adding another
  provider, route, retry, prompt patch, or diagnostic.
- Constraints: no deterministic semantic filtering; no raw/public/default-admin
  leak; no parser/full page/source/html fetch; no prompt/config/schema edit.

Classification: `incomplete-existing-mechanism`.

COMPLEXITY BUDGET

- Chosen option: amend existing W3-B Wikimedia transport in place.
- Files expected to change: one source file, focused W3-B tests, package/status
  docs.
- Net mechanisms: unchanged.
- New branches/fallbacks/flags/helpers: one structural response-normalization
  helper inside the existing transport.
- Code expected to remove/narrow: short REST summary request path.
- Why not workaround stacking: no new provider, route, retry, prompt patch,
  semantic ranking, or parser path is introduced.
- Verifier tier: safe-local/build plus one live canary after commit/runtime
  refresh if verifiers pass and budget reconciliation is recorded.

Latest debt sensor: `advisory_warn` on 2026-05-22T04:00:17.065Z with known V2
footprint, boundary-guard, docs-volume, net-mechanism, and consolidation-marker
warnings.

## Pass Criteria

Local:

- W3-B transport sends `limit`-free GET query-string parameters for
  `action=query&prop=extracts&exchars=1200&explaintext=1`.
- The request uses the project-local `/{language}.wikipedia.org/w/api.php`
  Action API path and no request body.
- Transport success normalizes nested Action API response JSON to the existing
  `{ extract }` shape and does not expose provider titles, URLs, headers,
  secrets, or raw payload fragments in the outcome diagnostic.
- Existing byte caps, timeout, redirect denial, DNS/final-address validation,
  no-cache/no-storage/no-SR, and public-precutover containment remain covered.
- Source Material record building still enforces the 4096-byte text cap and
  unsafe-fragment rejection.

Canary, if run:

- W3-B Source Material records remain hidden/admin-only.
- W3-B Wikimedia text byte lengths are larger or at least materially more
  source-bearing than the previous short summaries where TextExtracts returns
  longer lead material.
- W5 completes with accepted EvidenceItems and no schema diagnostics.
- W8-G creates an internal Alpha draft or gives a clearer source-depth stop.
- Public V2 and default admin projections leak no source/evidence/report text.

## Stop Criteria

Stop and reconvene Steer-Co if:

- the implementation needs full page/source/html fetch, parser execution, a new
  provider, retries, prompt/config/schema edits, or public behavior;
- source selection starts to depend on deterministic semantic keywords;
- focused tests or build fail twice with unclear root cause;
- the canary would run without clean commit/runtime provenance or budget
  reconciliation;
- TextExtracts returns insufficient source depth and another same-provider tweak
  would be speculative.

## Proposed Verifiers

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
- `npm -w apps/web run build`
- `npm run index`
- `git diff --check`

One post-implementation canary is justified only after those verifiers pass and
runtime is refreshed to the implementation commit. Because the HighJump ledger
is exhausted, this canary must be recorded as a Steer-Co budget-reconciliation
exception under the Captain's latest no-artificial-block directive.

## Implementation Result

Implementation amended the existing W3-B Wikimedia Source Material transport
only:

- the request path now uses project-local MediaWiki Action API TextExtracts via
  `/w/api.php?action=query&prop=extracts&exchars=1200&explaintext=1`;
- the request is still GET/query-string only, with no request body,
  credentials, cache, storage, Source Reliability, retry, parser, public
  projection, or provider expansion;
- the transport normalizes both top-level and nested Action API extract
  responses into the existing `{ extract }` body shape before record creation;
- provider page metadata such as titles/page ids/keys are stripped from the
  transport success outcome so downstream W3-B code sees only bounded extract
  text plus diagnostics;
- the existing 4096-byte Source Material record cap and unsafe-fragment
  rejection remain unchanged;
- existing W3-B contract labels are intentionally retained for downstream
  stability during this HighJump slice.

Failed-attempt recovery during focused tests:

- First focused verifier failure was an old owner-test expectation for the REST
  summary path. Classified `keep`; the source repair was correct and the test
  expectation was amended to the Action API TextExtracts path.

DEBT-GUARD RESULT

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend existing W3-B Wikimedia transport in place.
- Rejected path: provider expansion, prompt repair, report/extraction prompt
  changes, semantic source ranking, full page/source/html fetch, parser path,
  retry/fallback stack, or new hidden route.
- What was removed/simplified: short REST summary request path as the active
  W3-B Wikimedia source-material fetch.
- What was added: one structural response-normalization helper inside the
  existing transport and focused tests for Action API path/normalization/raw
  provider metadata stripping.
- Net mechanism count: unchanged.
- Budget reconciliation: actual diff stayed within the package envelope; no
  new stage, route, provider, parser, prompt, schema, cache, SR, storage, public
  surface, or retry mechanism was added.
- Debt accepted: current "page-summary" contract label now covers bounded
  Wikimedia text extracts for compatibility. Removal/merge trigger: if HJ14
  proves useful, a later consolidation package may rename or merge W3-B
  summary/extract terminology without changing behavior.

## Local Verification

Passed locally before implementation commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
  - `3` files / `14` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - `74` files / `352` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - `142` files / `860` tests
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
  - `advisory_warn`, generated `2026-05-22T04:06:17.696Z`; warnings are the
    known V2 footprint, boundary-guard size, docs volume, net-mechanism, and
    consolidation-marker warnings.
- `npm -w apps/web run build`
- `git diff --check`

Pending next action after commit:

- refresh API/Web runtime to the implementation commit;
- verify runtime commit hashes;
- preflight public pre-cutover behavior and W3-B/W8-G internal route
  containment as applicable;
- run exactly one HJ14 canary on the Captain-defined input
  `Using hydrogen for cars is more efficient than using electricity`;
- document the job id, source-material byte lengths, W5/W8 hidden chain, public
  leak check, and remaining/exception budget state.

## Canary Result

Canary job `959c0246501c44558cbf8f484f9b6e3b` ran on API/Web runtime
`92cbc14fd53665e07a80e239b2e1ec6e190be3df` with explicit
`claimboundary-v2` and the Captain-defined input
`Using hydrogen for cars is more efficient than using electricity`.

Classification:
`STOP_X7_HJ14_WIKIMEDIA_TEXTEXTRACTS_NO_MEASURABLE_DEPTH_GAIN_INTERNAL_ALPHA_DRAFT_CREATED`.

Observed hidden chain:

- public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- W4-A carried `9` hidden Source Material records into corpus readiness:
  `1` OpenAlex record (`2027` bytes) and `8` Wikimedia records (`148` to
  `960` bytes, `3577` total Wikimedia bytes);
- W5 completed with `hidden_evidence_item_extraction_completed`,
  `extractionResultStatus = accepted`, `evidenceItemCount = 5`,
  `admittedEvidenceItemCount = 5`, and `schemaDiagnostics = null`;
- W8-B created an internal Alpha report result with `firstIncompleteStage =
  none`, `4` boundary candidates, `3` verdict candidates, and `5` cited
  EvidenceItem refs;
- W8-G created an internal Alpha draft with `7908` bytes, `4` boundary drafts,
  `3` verdict drafts, and `5` cited EvidenceItem refs.

Containment:

- W5 default admin projection returned `inputTextReturned = false`,
  `evidenceItemTextReturned = false`, and `sourceTextReturned = false`;
- W8-G default admin projection stayed hash/length/provenance-only with
  `draftMarkdownReturned = false`;
- explicit authenticated W8-G inspection returned the internal draft for review;
- public job output remained the damaged pre-cutover envelope and did not expose
  hidden Source Material, EvidenceItem, or draft text.

Important negative evidence:

- The HJ14 source-depth hypothesis did not pass. Compared with HJ13, the
  W4-A Source Material byte distribution was unchanged: `1` OpenAlex record and
  `8` Wikimedia records with the same byte lengths (`2027` OpenAlex bytes and
  `3577` total Wikimedia bytes).
- The W8-G draft changed and W5 admitted one more EvidenceItem than HJ13
  (`5` vs `4`), but this is not reliable evidence that the TextExtracts repair
  materially deepened Wikimedia Source Material.
- The standalone W3-B Source Material route returned `404` for this ledger
  while W4-A/W4-F carried the W3-B state downstream. This was not a text leak,
  but it is an inspection-coverage caveat to keep visible in the next review.

Decision:

Do not spend another same-provider Wikimedia depth tweak. The hidden chain can
create internal Alpha drafts, but HJ14 did not produce a measurable source-depth
gain. The next step should be Steer-Co review of a report-quality path that
directly addresses comparator evidence quality. Candidate directions include a
targeted source/provider-quality package, a prompt/report-review package, or a
source-selection package, but not another unreviewed Wikimedia-only depth tweak.
