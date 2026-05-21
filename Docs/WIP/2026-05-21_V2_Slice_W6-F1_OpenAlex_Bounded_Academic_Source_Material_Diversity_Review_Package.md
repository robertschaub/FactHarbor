# V2 Slice W6-F1 OpenAlex Bounded Academic Source Material Diversity Review Package

**Status:** Implemented; first live canary stopped, focused authority repair verifier-clean
**Date:** 2026-05-21
**Author:** Captain Deputy
**Intended implementer:** Lead Developer
**Reviewer:** Steer-Co, with Claude Opus 4.6 senior architect/LLM-quality review
**Canary runner:** Captain Deputy after separate canary authorization only
**Parent steering package:** `Docs/WIP/2026-05-21_V2_Slice_W6-F_OpenAlex_Provider_Source_Diversity_Steering_Package.md`
**Current stop evidence:** W6-F1 canary job `3ec1c0c48ff84dd88484580967380320`
**Live-job budget:** `7` remaining after Captain 2026-05-21 reset and W6-F1 canary consumption
**Latest debt sensor:** `advisory_warn` at 2026-05-21T06:14:20.200Z

## Decision

Implement W6-F1 as the first bounded OpenAlex academic Source Material
diversity path.

Steer-Co review returned `APPROVE_WITH_AMENDMENTS`. Required amendments were
applied in this package:

- explicitly scope the two-endpoint budget/authority hash widening required by
  the current single-endpoint hash contract;
- define the merge preference rule that includes one OpenAlex record when
  OpenAlex is eligible;
- sharpen the credential/no-key gate to acknowledge the OpenAlex docs-vs-probe
  asymmetry.

This package is intentionally narrower than "multi-provider search" and broader
than a marker-only diagnostic. It should add the smallest source-acquisition and
source-material contract widening needed for W6-C to receive one OpenAlex
abstract-derived bounded Source Material record alongside the existing Wikimedia
records.

## Why This Is The Next Step

W6-E already selected three distinct Wikimedia provider-attempt/query groups and
W5 accepted `3` EvidenceItems, but W6-C still returned
`reportStopRecommendation = refine_retrieval`. More same-provider selection
variants are now low-value. W6-F1 tests whether academic/source-type diversity
can satisfy W6-C without weakening sufficiency quality or relaxing W7.

## What This Gate Unlocks

W6-F1 unlocks one hidden/internal OpenAlex Source Material path for the existing
W3/W4/W5/W6 chain:

- OpenAlex Works can be queried through the existing bounded network transport
  controls.
- At most one eligible OpenAlex abstract can become a bounded Source Material
  record.
- Existing downstream fan-in may include the OpenAlex record within the total
  cap of `3`.
- A later single product-route canary may evaluate whether W6-C moves off
  `refine_retrieval`.

It does not unlock public report output, W7 relaxation, additional providers, or
general provider-framework work.

## What Older Guard Or Artifact It Retires / Merges

W6-F1 does not delete W2/W3-B yet. It starts merging the current
Wikimedia-specific Source Material path into a bounded Source Material owner
that can admit a closed set of provider-owned source-material kinds.

Retirement pressure:

- W6-E query-balanced same-provider selection becomes closed as the active
  refinement path.
- The W3-B "Wikimedia-only is the active source-material shape" assumption must
  be narrowed to "Wikimedia remains a supported source-material kind, not the
  only possible bounded Source Material kind."
- W2 transport diagnostics remain retired; do not add more transport probes.

## Stop Condition

Stop W6-F1 and reconvene Steer-Co if:

- OpenAlex credential/no-key posture cannot be made explicit before live use;
- implementation requires a generic provider framework rather than one bounded
  OpenAlex path;
- downstream contracts cannot admit OpenAlex without broad public/report/schema
  widening;
- total Source Material records would need to exceed `3`;
- W6-F1 would need deterministic semantic ranking or topic-specific logic;
- source text would appear in public/default-admin/log/error surfaces;
- verifiers fail with unclear root cause;
- a later OpenAlex-admitted canary still leaves W6-C at `refine_retrieval`.

## Implementation Scope

W6-F1 may implement:

1. A clean-room OpenAlex Works endpoint snapshot and authority path.
2. The minimal network budget/authority hash widening required to validate a
   closed endpoint set of exactly:
   - `ep_wikimedia_core_page_search`;
   - `ep_openalex_works_search`.
   The widening may use an ordered endpoint snapshot hash set or equivalent
   per-endpoint hash validation. It must not create arbitrary endpoint
   registration, wildcard provider ids, or a generic provider framework.
3. Request construction for `GET https://api.openalex.org/works` with bounded
   query parameters:
   - `search`: Query Planning text.
   - `per_page`: hard bounded to the existing W2 max candidate count (`3`).
   - `select`: fixed structural allowlist sufficient for candidate/source
     material projection.
   - `api_key`: optional only through an approved secret-preserving credential
     boundary; must not be logged or included in artifacts.
4. Existing containment controls:
   - DNS/public-address validation and final remote-address validation.
   - redirect deny.
   - proxy none.
   - no credentials in artifacts/logs/errors.
   - byte and timeout caps not raised above W2/W3 posture without explicit
     reason.
   - no raw provider payload leakage.
5. A clean-room OpenAlex candidate projection from `results[]`.
6. A bounded `abstract_inverted_index` reconstruction transform:
   - validate record shape;
   - accept only numeric non-negative positions;
   - reconstruct text by position order;
   - normalize structurally, not semantically;
   - cap to existing Source Material text byte limit (`4096`);
   - fail closed on invalid, gapped, duplicate, over-cap, or suspicious
     structure.
7. A new OpenAlex Source Material record kind:
   - recommended `openalex_work_abstract_text`;
   - hidden/admin-only;
   - hash/length/provenance default projection.
8. Downstream contract widening only where required to carry the new kind:
   - Source Material readiness/admission;
   - EvidenceCorpus shell/source-material kind lists;
   - bounded text sidecar;
   - extraction-input packet;
   - EvidenceItem extraction handoff;
   - W6 sufficiency intake and W6-C parent projections if currently literal.
9. Selection merge behavior:
   - keep total Source Material records `<= 3`;
   - if at least one OpenAlex record is structurally eligible, include exactly
     one OpenAlex record before filling remaining slots with existing
     Wikimedia records;
   - if OpenAlex is unavailable or ineligible, preserve the current
     Wikimedia-only path.
10. Tests and boundary guards proving no V1 provider code reuse, no public leak,
   no parser/cache/SR/storage, and no public behavior.

## Explicit Non-Scope

W6-F1 must not implement:

- Semantic Scholar or any second new provider.
- A generic provider plugin framework.
- full page/source/html/PDF fetch.
- parser execution.
- Source Reliability, cache, or durable storage.
- public/API/UI/report/export/compatibility exposure.
- report/verdict/warning/confidence behavior.
- W6 prompt weakening or W7 gate relaxation.
- retries.
- ACS/direct URL support.
- V1 code reuse, V1 work, V1 cleanup, or V1 removal.
- deterministic semantic ranking, topic-specific keywords, or hydrogen-specific
  logic.

## Current Code Constraints To Respect

The current implementation has several Wikimedia-literal contracts:

- `source-candidate-preview.ts` exports `SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID =
  "wikimedia_core"` and `SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID =
  "ep_wikimedia_core_page_search"`.
- `page-summary-source-material.ts` defines only
  `wikimedia_page_summary_extract_text`.
- W4/W5/W6 contracts and tests contain literal
  `wikimedia_page_summary_extract_text` checks.
- W2 network budget currently ties one `endpointSnapshotHash` to one endpoint
  snapshot; `source-acquisition-network-factory.ts` rejects endpoint lists whose
  hashes do not match the budget.

W6-F1 may adjust those contracts only enough to carry a closed source-material
kind union:

- `wikimedia_page_summary_extract_text`;
- `openalex_work_abstract_text`.

Do not generalize to arbitrary provider ids or arbitrary source-material kinds.

## Proposed File Envelope

Source files may include only:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.ts`
- new `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/openalex-source-candidate-preview.ts`
- new `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/openalex-abstract-source-material.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.ts`
- downstream W4/W5/W6 type/owner files that currently hardcode the Wikimedia
  source-material kind, only for the closed two-kind union above
- existing V2 runtime artifact sink/route files only if projection redaction
  must learn the new kind
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Test files may be added or amended under:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/`
- `apps/web/test/unit/lib/analyzer-v2-runtime/`

Docs/status/handoff/index files may be updated as required by protocol.

Any edit outside this envelope requires Steer-Co review before implementation
continues.

## Credential / No-Key Posture

Local environment currently has no confirmed `OPENALEX_API_KEY`. W6-F1 local
implementation and synthetic tests may proceed without a key. A live canary is
blocked until one of these is true:

- `OPENALEX_API_KEY` is present and approved for local/dev use; or
- Steer-Co records explicit no-key use approval based on current OpenAlex
  reference/terms and a fresh endpoint posture check. That approval must
  explicitly acknowledge the current asymmetry that the OpenAlex reference marks
  `api_key` as required while the local no-key endpoint posture probe returned
  HTTP `200`.

If neither condition is met, W6-F1 may be committed as verifier-clean but live
canary remains blocked as
`BLOCKED_X7_W6_F1_OPENALEX_AUTHORITY_UNAVAILABLE`.

## Provider Contract

OpenAlex endpoint:

- provider id: `openalex`
- endpoint id: `ep_openalex_works_search`
- host: `api.openalex.org`
- path: `/works`
- method: `GET`
- response candidate pointer: `results[]`
- content type: JSON only
- compression: keep the existing W2 accepted posture unless verifiers prove a
  smaller/larger cap is required
- selected fields:
  - `id`
  - `display_name`
  - `publication_year`
  - `language`
  - `abstract_inverted_index`

No raw URL/title/abstract/provider payload may be returned by default admin
routes or public surfaces.

## Output Shape

W6-F1 may produce hidden/admin-only:

- OpenAlex network attempt telemetry;
- OpenAlex candidate preview projection with structural metadata, hashes, and
  byte lengths;
- at most one `openalex_work_abstract_text` Source Material record;
- merged Source Material selection provenance showing total record count `<= 3`;
- downstream W4/W5/W6 parent summaries using hash/ref/length/provenance only by
  default.

The source text may exist internally only as bounded Source Material text and
the existing bounded corpus/extraction path requires it. It must not appear in
public JSON, UI, reports, exports, compatibility projections, logs, errors, or
default admin responses.

## Pass Criteria

Local pass:

- OpenAlex endpoint snapshot validates.
- OpenAlex request construction sends `search`, `per_page`, and `select` as GET
  query parameters; `api_key` is absent unless explicitly supplied by the
  credential boundary.
- Synthetic `results[]` response yields bounded OpenAlex candidate previews.
- Synthetic `abstract_inverted_index` yields one bounded
  `openalex_work_abstract_text` Source Material record.
- Invalid/gapped/duplicate/over-cap OpenAlex abstract structures fail closed.
- Wikimedia-only path remains valid.
- Total Source Material cap remains `3`.
- When OpenAlex is eligible, merged Source Material selection includes exactly
  one OpenAlex record before filling remaining slots.
- Downstream W4/W5/W6 contracts accept the closed two-kind union and reject any
  other kind.
- Default admin projections return hash/length/provenance-only data and no text.
- Boundary guard rejects V1 provider imports and forbidden modules.

Canary pass, if later authorized:

- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- hidden chain records both Wikimedia and OpenAlex provenance when OpenAlex is
  available;
- W3-B/Source Material total record count remains `<= 3`;
- W5 accepts EvidenceItems with schema diagnostics `null`;
- W6-C moves off `refine_retrieval`, or records a new actionable non-retrieval
  stop;
- no public/default-admin/log/error text leak.

## Fail / Stop Criteria

Fail closed if:

- OpenAlex endpoint authority or credential posture is unresolved for live use;
- OpenAlex result shape is invalid;
- `abstract_inverted_index` cannot be reconstructed structurally;
- source material text is blank, over cap, contains forbidden raw-leak markers,
  or hash/length mismatch occurs;
- provider id or source-material kind drifts from the closed allowlist;
- downstream lineage does not match the source-material parent;
- any public/default-admin/log/error surface contains source text, raw provider
  payload, prompt text, hidden ledger ids, or secrets.

## Verifier Plan

Required before implementation closeout:

- focused OpenAlex endpoint/request/snapshot tests;
- focused OpenAlex projection/source-material tests;
- focused downstream closed two-kind union tests;
- focused default-admin route/projection leak tests;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`;
- `npm run validate:v2-gates`;
- `node scripts/validate-v2-gate-register.mjs --self-test`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- `git status --short --untracked-files=all`.

Do not run live jobs from this implementation package.

## V2 SCORECARD IMPACT

Primary impact: evidence acquisition quality and first real source-type
diversity before sufficiency assessment. This is direct report-quality progress
because W6-C is currently asking for retrieval refinement after W5 has accepted
EvidenceItems.

No report-quality claim should be made until a later canary proves W6-C movement
and report candidate progress.

## V2 RETIREMENT LEDGER IMPACT

Update `Docs/AGENTS/V2_Retirement_Ledger.md` during implementation:

- add `V2-RL-019` for OpenAlex bounded academic Source Material diversity;
- status `keep` until W6-F1 canary;
- removal/quarantine trigger: W6-F1 canary still leaves W6-C at
  `refine_retrieval`, or OpenAlex live authority is unavailable.

No existing row is closed by this review package.

## V2 CONSOLIDATION GATE

Pass condition: W6-F1 is a missing-capability increase tied to the proven W6-C
retrieval-diversity blocker. It is allowed only because it has:

- one provider;
- one bounded endpoint;
- one bounded source-material kind;
- no public behavior;
- no report/verdict/warning/confidence behavior;
- a canary-based quarantine trigger.

If implementation starts to become a general provider framework, stop and split.

## Approval Boundaries

This package authorized local implementation after Steer-Co review and
amendment closure. W6-F1 is now implemented as one bounded OpenAlex Works
search/abstract Source Material path plus the closed two-endpoint/two-kind
contract widening.

The first W6-F1 canary job `3ec1c0c48ff84dd88484580967380320` ran on runtime
`731ef0e595c59f678e4d50f461c1ce6ca8cb9715` and is classified
`STOP_X7_W6_F1_OPENALEX_NOT_MATERIALIZED_REFINEMENT_REMAINS`: public V2 stayed
precutover/damaged with no leak, but hidden Source Material stayed
Wikimedia-only and W6-C still recommended `refine_retrieval`.

Debt-guard repair classification is `incomplete-existing-mechanism`. The
focused amendment keeps the W6-F1 mechanism and narrows it to a correct
OpenAlex-owned authority path: the OpenAlex Source Material leg now builds an
OpenAlex-specific provider allowlist and candidate-runtime authority instead of
reusing the Wikimedia allowlist where OpenAlex is disabled. The product
orchestrator remains wired to pass the OpenAlex Source Material sink.

Still separately approval-gated:

- live job/canary;
- prompt/model/config/schema/UCM/gateway changes beyond the closed TypeScript
  type/contract widening described here;
- public/API/UI/report/export/compatibility behavior;
- extraction/report/verdict/warning/confidence behavior changes;
- provider expansion beyond OpenAlex;
- V1 cleanup/removal.

## Proposed Later Canary

One W6-F1 repair product-route canary is worth spending if and only if:

- repair implementation is committed and verifier-clean;
- runtime is refreshed from the repair commit;
- route/default-admin leak preflight passes;
- credential/no-key posture is explicitly settled.

The canary would use the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

It would consume one of the remaining `7` live-job slots.

## Implementation Closeout

W6-F1 implementation stayed inside the approved package envelope:

- OpenAlex Works request construction uses `search`, `per_page`, and `select`
  with `select = id,display_name,abstract_inverted_index,language,publication_year`.
- OpenAlex raw provider candidates are consumed only in-process by the runtime
  factory projection hook and are not serialized on transport outcomes or
  default-admin/public surfaces.
- `abstract_inverted_index` reconstruction is structural only and fails closed
  for blank, invalid, duplicate/gapped, over-cap, or raw-leak fragments.
- Source Material merging includes one eligible OpenAlex record first, then
  fills with Wikimedia records while preserving the existing total cap of `3`.
- No public behavior, parser, cache/SR/storage, report/verdict/warning/confidence
  behavior, prompt/model/config/UCM/gateway change, provider framework, ACS/direct
  URL behavior, V1 work, or V1 cleanup was added.

Focused repair closeout after first canary stop:

- Amended the OpenAlex Source Material leg to use an OpenAlex-specific
  provider allowlist and candidate-runtime authority instead of the Wikimedia
  allowlist where OpenAlex is explicitly disabled.
- Preserved the product orchestrator OpenAlex Source Material sink and added
  focused tests that fail if the sink is removed before the repair canary.
- Added focused telemetry assertions proving the OpenAlex network attempt is
  observed and sanitized in the candidate-provider loop.
- Verifiers passed after repair: focused W6-F1/orchestrator/boundary suite
  (`6` files / `120` tests), full V2 local suite (`140` files / `836` tests),
  `npm run validate:v2-gates`, gate-register self-test, `npm run debt:sensors`
  (`advisory_warn`), `npm -w apps/web run build`, and `git diff --check`.

Verifier state is recorded in
`Docs/AGENTS/Handoffs/2026-05-21_Lead_Developer_V2_W6-F1_OpenAlex_Source_Material_Implementation.md`.

## Repair Canary And Lineage Amendment Addendum - 2026-05-21

The focused OpenAlex authority repair was committed as
`7e3dafe8ce674765e77737e3b3aa007be02a7a06` and ran exactly one repair canary:

- job: `130bfc4c8be94fffadf780e7a0dd3f3f`;
- runtime commit: `7e3dafe8ce674765e77737e3b3aa007be02a7a06`;
- classification:
  `PARTIAL_X7_W6_F1_OPENALEX_SOURCE_MATERIAL_MATERIALIZED_W4H_LINEAGE_BLOCKED`.

Observed result:

- public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- candidate provider network included OpenAlex and Wikimedia;
- Source Material included one `openalex_work_abstract_text` record and two
  `wikimedia_page_summary_extract_text` records;
- W4-G produced bounded text sidecars for OpenAlex and Wikimedia with default
  admin projection remaining hash/length/provenance-only;
- W4-H observed the OpenAlex parent sidecar but blocked with
  `blocked_pre_extraction_input_lineage_missing_or_invalid`, so no W4-H packet,
  W4-I eligibility, W5 execution, W6-C reassessment, or W8 internal Alpha result
  was reached.

Debt-guard classification: `incomplete-existing-mechanism`. The OpenAlex
source-material path is now working; the remaining blocker is that W4-H/W4-I/W5
still carry the older single-provider/Wikimedia-only extraction-input packet
assumption while W4-G already owns multi-source sidecars.

Claude Opus 4.6 reviewed the repair decision and recommended a narrowed
multi-provider packet amendment rather than dropping non-primary sidecars. The
accepted direction:

- preserve the existing W4-H packet owner instead of adding a new route or
  parallel packet type;
- add explicit provider/source-kind/source-content-packet arrays to the W4-H
  packet while keeping scalar first-sidecar fields as compatibility projections;
- keep default admin artifacts text-free by redacting both aggregate `inputText`
  and per-source `contentText`;
- update W4-I and W5 lineage checks to validate approved source-content packet
  identities instead of a single source-record/content-packet pair.

This amendment does not authorize public behavior, report/verdict/warning/
confidence behavior, parser execution, cache/SR/storage, provider expansion
beyond OpenAlex, ACS/direct URL, V1 work, or V1 cleanup. One later W6-F1
lineage-repair canary is worth spending only after commit, runtime refresh,
route/default-admin preflight, and clean verifiers.
