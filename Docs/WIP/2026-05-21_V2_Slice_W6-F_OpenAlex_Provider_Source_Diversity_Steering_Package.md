# V2 Slice W6-F OpenAlex Provider/Source Diversity Steering Package

**Status:** Steer-Co reviewed direction package
**Date:** 2026-05-21
**Author:** Captain Deputy
**Package type:** provider/source diversity phase-transition package
**Current runtime evidence:** W6-E canary job `6a09d149d5d046cb95d0cdd67e02c095`
**Live-job budget:** `1` remaining in `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`

## Decision

W6-F should prepare the first V2 provider/source diversity implementation
package before W6-C, with **OpenAlex Works** as the first additional provider
candidate.

This is a phase transition. This package does not implement provider expansion,
does not authorize a live job, and does not relax W6-C or W7 gates. It records
the Steer-Co direction and the exact constraints for the next Lead Developer
package.

## Why W6-F Is Needed

W6-E proved that same-provider Wikimedia retrieval refinement is now exhausted:

- W3-B selected three distinct provider-attempt/query groups:
  `SOURCE_CANDIDATE_PREVIEW_1_1`, `SOURCE_CANDIDATE_PREVIEW_2_1`,
  `SOURCE_CANDIDATE_PREVIEW_3_1`.
- W5 accepted `3` EvidenceItems with `schemaDiagnostics = null`.
- default-admin containment held after the W6-D leak repair.
- W6-C still returned `reportStopRecommendation = refine_retrieval`.

The next report-value move is therefore source/provider diversity, not another
same-provider selection variant, W6 prompt weakening, or W7 readiness relaxation.

## Steer-Co Outcome

**Committee:** Captain Deputy / Steer-Co Leader plus Claude Opus 4.6 senior
architect/LLM-quality reviewer. Gemini-style independent review was not
available in this session because the subagent thread limit was already reached;
the decision is bounded to a review package and remains reversible before code.

**Consent result:** Proceed with an OpenAlex-first provider/source diversity
package.

**Claude Opus position:** `support`, with OpenAlex preferred over Semantic
Scholar because the V2 source-acquisition code already names `openalex` as the
disabled provider seam, while Semantic Scholar would increase clean-room
contamination risk due the older V1 provider implementation. Claude also judged
OpenAlex `abstract_inverted_index` reconstruction as a deterministic structured
JSON transform, not parser execution over hostile unstructured content.

**Leader synthesis:** Accept the OpenAlex direction, but require an explicit
credential/no-key posture gate because current local environment has no
`OPENALEX_API_KEY` and the current OpenAlex developer reference lists `api_key`
as required even though a no-key endpoint probe returned `200` locally. Do not
spend the last live-job slot until that posture is documented in the
implementation package.

## External Reference Check

Primary-source checks performed before this package:

- OpenAlex developer reference says the API base URL is
  `https://api.openalex.org`, `GET /works` supports list/search operations, and
  list responses return `meta` plus `results`.
- OpenAlex list-works reference documents `search`, `per_page`, `select`,
  `sort`, and `api_key` query parameters, and currently marks `api_key` as
  required.
- OpenAlex Works schema includes `display_name`, `publication_year`,
  `language`, `cited_by_count`, `primary_location`, `open_access`, and
  `abstract_inverted_index`.
- A local endpoint posture check against
  `https://api.openalex.org/works?search=dna&per_page=1&select=id,display_name,abstract_inverted_index`
  returned `200` without a key on 2026-05-21. This is useful evidence but not
  sufficient by itself to authorize a production canary against no-key posture.
- Semantic Scholar official docs confirm a useful academic alternative:
  `GET /graph/v1/paper/search`, `limit` as query parameter, `fields` to reduce
  response size, optional API key but recommended, and 1 RPS introductory rate
  with a key. It is deferred for now because V2 already contains an `openalex`
  seam and the older V1 Semantic Scholar provider must not be reused or cloned.

## Recommended Next Implementation Package

Prepare **W6-F1 OpenAlex bounded academic Source Material diversity** as a
separate Lead Developer implementation package.

W6-F1 should target a small positive value path:

1. Use a clean-room OpenAlex endpoint contract, not `apps/web/src/lib/search-*`
   V1 provider code.
2. Add one approved OpenAlex Works endpoint:
   - provider id: `openalex`
   - endpoint id: `ep_openalex_works_search`
   - host: `api.openalex.org`
   - path: `/works`
   - method: `GET`
   - request params: `search` from query text, `per_page` from max candidate
     records, `select` from a fixed structural field allowlist, and optionally
     `api_key` only through a secret-preserving credential boundary.
3. Preserve W2 containment controls:
   - DNS/public-address validation and final remote-address validation;
   - redirect deny;
   - proxy none;
   - bounded byte/time caps;
   - no raw provider payload in artifacts/logs/errors;
   - no cache, durable storage, Source Reliability, parser, public surface, or
     V1 code reuse.
4. Project OpenAlex candidates from `results[]` into hidden candidate previews.
5. Materialize at most one bounded OpenAlex Source Material record into the
   existing W3/W4/W5/W6 path, while keeping the total downstream Source Material
   cap at `3`.
6. Use `abstract_inverted_index` only as a structured JSON field transform:
   validate shape, reconstruct bounded text by numeric positions, cap at the
   existing W3-B/W4-G text bounds, and fail closed on gaps, overrun, or invalid
   structure.
7. Preserve lineage equality checks instead of hardcoding downstream to
   `wikimedia_core`. Any widened provider field must remain a closed approved
   provider set and must fail closed on provider-id drift.
8. Keep default admin routes hash/length/provenance-only; source text may not
   appear in public JSON, UI, reports, exports, compatibility projections, logs,
   errors, or default admin responses.

## Provider Choice

**Recommended first:** OpenAlex.

Reasoning:

- It matches the existing V2 disabled-provider seam (`openalex`) and therefore
  amends the intended V2 source-acquisition shape instead of opening a wholly
  unrelated provider path.
- It gives academic/source-type diversity that is directly relevant to the
  current hydrogen efficiency canary family.
- Its response can be bounded through structural fields and `select`, without
  full page/source/html fetches.
- It avoids clean-room pressure from the existing V1 Semantic Scholar code.

**Deferred but valid later:** Semantic Scholar.

Reasoning:

- It is strong for academic discovery and direct abstracts, but V1 already has a
  provider implementation. A future Semantic Scholar package must be explicitly
  clean-room and should start from official API docs, not from V1 code.

## Credential / No-Key Gate

Before any W6-F live canary:

- prefer an `OPENALEX_API_KEY` if available and approved for local/dev use;
- if no key is available, the package must explicitly approve no-key OpenAlex
  use based on current OpenAlex terms/reference plus a fresh endpoint posture
  check;
- if neither key nor no-key approval exists, W6-F implementation may run
  synthetic verifiers only and live canary remains blocked.

Do not spend the final live-job slot on a provider whose authority posture is
unresolved.

## Accepted Inputs For W6-F1

W6-F1 may use only:

- accepted Query Planning handoff query entries;
- existing W2 request/intake/runtime authority inputs;
- OpenAlex structured JSON response fields from the approved endpoint;
- existing W3/W4/W5/W6 runtime-owned parent artifacts required for same-ledger
  closure.

W6-F1 must not use:

- raw public result data;
- raw provider payload outside bounded in-memory parsing of the approved JSON
  response;
- source text from Wikimedia/OpenAlex in public/default-admin/log/error
  surfaces;
- Semantic Scholar V1 implementation code;
- hardcoded topic keywords, domain-specific hydrogen logic, or semantic
  deterministic ranking.

## Output Shape

W6-F1 may produce hidden/admin-only:

- OpenAlex candidate-provider attempt telemetry;
- OpenAlex candidate preview records with bounded title/provenance hashes and
  structural metadata;
- one bounded OpenAlex abstract Source Material record if the structured
  abstract transform succeeds;
- merged source-material selection provenance showing how the total cap of `3`
  was filled across Wikimedia/OpenAlex;
- downstream W4/W5/W6 decisions using existing contracts where possible.

Default admin artifacts must be hash/length/provenance-only for source text.

## V2 SCORECARD IMPACT

Quality dimension advanced: V2-Q2 evidence acquisition and V2-Q3 evidence
extraction quality.

Direct user/report value: higher chance that W6-C sees sufficiently diverse
evidence before boundary/verdict/report execution, without lowering sufficiency
quality.

Hidden-only value: OpenAlex remains hidden/admin-only until public cutover; the
value is justified because W6-E proved same-provider refinement insufficient.

Cost/latency impact: bounded one-provider addition, max total Source Material
records remains `3`, no retries, no parser, no cache/SR/storage. One later
canary would consume the final current live-job slot only after implementation
commit and credential/no-key gate.

Retirement or simplification unlocked: same-provider Wikimedia refinement is
retired as the active next path; W3-B can start converging from a
Wikimedia-specific owner to a general bounded Source Material owner.

Scorecard risk: provider expansion can increase source-acquisition machinery.
The implementation package must reject generic provider frameworks and build
only the OpenAlex path needed to test the diversity hypothesis.

## V2 RETIREMENT LEDGER IMPACT

Rows touched:

- `V2-RL-005`: W2 transport diagnostics remain `retire`; W6-F must not add new
  transport diagnostics unless it retires older probe/taxonomy material.
- `V2-RL-008`: W3-B bounded page-summary Source Material remains `keep`, but
  begins transition toward a general bounded Source Material owner.
- New row to add in the implementation package:
  `V2-RL-019` OpenAlex bounded academic Source Material diversity, status
  `keep` until W6-F canary either proves value or is quarantined.

Status changes: none in this steering package.

New mechanism owner: Lead Developer for W6-F1, Captain Deputy for steering and
budget discipline.

Removal / merge trigger: if W6-F canary still leaves W6-C at
`refine_retrieval`, quarantine OpenAlex as a failed first diversity hypothesis
or escalate to a sufficiency/retrieval strategy review before adding another
provider.

Debt accepted: planned temporary provider-specific path, bounded by one
implementation package and one canary decision.

## V2 CONSOLIDATION GATE

Pass with explicit Steer-Co exception.

W6-F increases source-acquisition/provider machinery, but the increase is tied
to a concrete report-value blocker: W6-C still requests retrieval refinement
after same-provider query-balanced selection. Existing same-provider machinery
cannot answer whether academic/source-type diversity resolves the stop. The
package must remain one-provider, one-source-material-path, hidden-only, and
must define a quarantine trigger if the canary does not move W6-C.

Latest `npm run debt:sensors` status before this package:

- status: `advisory_warn`;
- V2 source/tests/boundary guard/docs remain above advisory thresholds;
- net mechanism increases remain present and require removal triggers.

## Balanced Risk Mitigation

Named risk: W6-C remains blocked by insufficient retrieval diversity, causing
the team to either weaken sufficiency quality or keep iterating same-provider
mechanisms.

Decision result: add one bounded OpenAlex provider/source-material path.

Rejected alternatives:

- W6 prompt weakening: rejected because W6-C is already schema-clean and is
  asking for retrieval refinement.
- W7 gate relaxation: rejected because it would convert known insufficiency into
  report risk.
- More Wikimedia variants: rejected because W6-E already selected distinct
  Wikimedia provider-attempt groups.
- Semantic Scholar first: deferred because of V1 clean-room contamination risk
  and no existing V2 seam.

Owner: Captain Deputy for direction; Lead Developer for W6-F1 implementation.

Verifier: focused W6-F1 tests, boundary guard, V2 gate validation, build,
debt sensors, and one later canary only if credential/no-key posture is settled.

Net-complexity impact: increases, justified as missing capability with a
quarantine trigger.

Residual risk: OpenAlex may not move W6-C; endpoint authority may require API
key; abstract availability may be sparse for some claims.

Removal / merge trigger: W6-F canary failure to improve W6-C stops provider
iteration and sends the issue to sufficiency/retrieval strategy review.

## Verifier Plan For W6-F1

Required local verifiers should include:

- OpenAlex endpoint snapshot / allowlist / budget exactness tests;
- no-key vs key posture tests without exposing secrets;
- synthetic OpenAlex success with `results[]`, bounded `select`, and
  `per_page=3`;
- synthetic byte-cap fail-closed behavior with no raw payload leak;
- `abstract_inverted_index` structural transform tests:
  - accepted bounded reconstruction;
  - missing/invalid/gapped positions fail closed;
  - over-cap truncation/failure behavior;
  - no control characters or raw locator leakage;
- merged provider/source selection tests:
  - at most `3` total Source Material records;
  - at least one OpenAlex record preferred when eligible;
  - Wikimedia-only path preserved when OpenAlex is unavailable;
  - provider-id drift fails closed;
- default-admin route leak-key scan tests for OpenAlex source text;
- no imports from `@/lib/search-semanticscholar`, `@/lib/web-search`, V1
  analyzer, parser/cache/SR/storage modules, or public route surfaces;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`;
- `npm run validate:v2-gates`;
- `node scripts/validate-v2-gate-register.mjs --self-test`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `git diff --check`;
- clean `git status --short --untracked-files=all`.

## Canary Proposal

Do not run a canary from this package.

After W6-F1 implementation is committed, runtime is refreshed, route preflight
passes, and credential/no-key posture is approved, one product-route canary may
be proposed. It would consume the remaining `1` live job.

Canary pass criteria:

- public result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- W2/W3/W4/W5 hidden chain records both Wikimedia and OpenAlex provenance when
  OpenAlex is available;
- total Source Material records remain `<= 3`;
- W5 remains accepted with schema diagnostics `null`;
- default admin route leaks no source text/provider payload/prompt/internal
  hidden text;
- W6-C moves off `refine_retrieval`, or at minimum records a different
  actionable stop that is not retrieval diversity.

Stop classification:

- if OpenAlex is unavailable or credential/no-key posture is unresolved:
  `BLOCKED_X7_W6_F_OPENALEX_AUTHORITY_UNAVAILABLE`;
- if OpenAlex has zero eligible abstract material but containment holds:
  `INCONCLUSIVE_X7_W6_F_OPENALEX_NO_ELIGIBLE_SOURCE_MATERIAL`;
- if W6-C still returns `refine_retrieval` with OpenAlex material admitted:
  `STOP_X7_W6_F_PROVIDER_DIVERSITY_INSUFFICIENT`;
- if containment fails: stop immediately and repair containment before any
  further source work.

## Approval Boundaries

This package authorizes no code by itself. It prepares the next W6-F1
implementation package.

Still closed:

- live job/canary;
- public/API/UI/report/export/compatibility exposure;
- parser execution;
- full page/source/html/PDF fetch;
- cache/SR/storage behavior;
- report/verdict/warning/confidence behavior;
- W6 prompt weakening or W7 relaxation;
- Semantic Scholar implementation;
- provider expansion beyond OpenAlex;
- retries;
- ACS/direct URL support;
- V1 code reuse, V1 work, or V1 cleanup.

## Stop / Escalation Triggers

Stop and reconvene Steer-Co if W6-F1 requires:

- changing Query Planning prompts/models/config/schema to target OpenAlex;
- importing or cloning V1 provider code;
- adding a generic provider framework instead of one bounded OpenAlex path;
- raising total Source Material cap above `3`;
- using semantic deterministic topic ranking;
- exposing source text in public/default-admin/log/error surfaces;
- spending the final live-job slot before credential/no-key posture is settled;
- a failed verifier with unclear root cause;
- W6-C still requesting `refine_retrieval` after an OpenAlex-admitted canary.
