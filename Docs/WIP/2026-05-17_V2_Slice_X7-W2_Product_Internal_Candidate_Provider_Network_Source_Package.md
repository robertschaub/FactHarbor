# V2 Slice X7-W2 Product-Internal Candidate-Provider Network Source Package

**Date:** 2026-05-17
**Status:** source package for review; implementation blocked until reviewer acceptance
**Owner:** Lead Developer / Captain Deputy
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-W1C_Source_Acquisition_Path_Consolidation_And_Pre_IO_Fence_Package.md`
**Baseline:** `0e6a8b37` (`fix: align v2 provider network provenance`)

## 1. Purpose

X7-W1B proved that the product V2 route can exercise the existing candidate runtime through a product-owned closed local no-IO provider boundary.

X7-W1C then consolidated the active Source Acquisition path and established the pre-IO fence:

```text
accepted Claim Understanding
  -> accepted hidden Query Planning
  -> X7-V intake_ready_not_executable
  -> X7-W1A admission_ready_no_runtime_execution
  -> X7-W1B closed_loop_completed_no_source_candidates
  -> X7-W1C pre_io_fence_documented_no_execution
```

X7-W2 should open the next narrow, hidden-only capability: product-internal candidate-provider network execution through the already implemented 7N-3B2 SDK-free provider-network boundary.

X7-W2 must not open source material, content dereference, parser execution, EvidenceCorpus, evidence extraction, warnings, verdicts, report generation, public output, live jobs, cache, Source Reliability, ACS/direct URL, V1 reuse, or V1 cleanup.

## 2. Debate Result And Approved Direction Requested

A short Architect/Security/Code debate on 2026-05-17 converged on:

- W2 should not be another docs-only/passive marker package.
- W2 should be one active product-internal candidate-provider-network package.
- W2 should use the existing 7N-3B1 candidate runtime plus existing 7N-3B2 network provider boundary.
- W2 must have one product-owned runtime owner and one sanitized admin-only artifact surface.
- Product/orchestrator may import only the W2 owner and W2 artifact sink.
- Product/orchestrator must not import `source-acquisition-network-transport` directly.
- Existing `source-acquisition-network-*` files are not part of W2. They must not be edited for type friction, test convenience, helper exposure, or broad cleanup. A concrete verifier-backed defect in those files requires stopping and either amending this package through review or splitting a separate repair package.
- No live jobs are part of W2 implementation.

Steering Board direction is incorporated as follows:

- Lead Developer/Captain Deputy must decide whether W2 is ready after review; the board direction is advisory, not automatic implementation authority.
- W2 must produce first limited hidden provider-network candidate-provider structural records if implemented; it must not be another no-IO marker.
- W2 must not jump to broad source execution: exactly one provider, hidden-only, no live jobs, and no public output.
- W2 must include cost, timing, outcome, and leakage-control telemetry.
- W2 must address guard/test debt, especially `boundary-guard.test.ts`, instead of adding unbounded guard complexity.

Two debate blockers are addressed in this package:

1. 7N-3B2 provenance mismatch is repaired at baseline `0e6a8b37`: runtime approval now points to implementation commit `54b8af1a`.
2. W2 names a concrete first provider endpoint and credential posture before implementation.

## 3. First Provider Endpoint

W2 uses Wikimedia Core REST Search as the first narrow candidate provider because it fits the existing 7N-3B2 endpoint model without credential handling or endpoint-schema expansion:

- host: `api.wikimedia.org`;
- path: `/core/v1/wikipedia/en/search/page`;
- method: `GET`;
- required query parameter: `q`, sourced from Query Planning query text;
- fixed query parameter: `limit=3`, aligned with the W2 candidate cap to avoid fetching avoidable provider payload;
- response candidate array field: `pages`;
- network endpoint credential posture: `not_required`;
- candidate-provider credential posture: `not_required_for_approved_network_provider`;
- headers: `accept: application/json` and the existing non-secret internal user-agent header;
- redirect policy: exactly `deny`;
- proxy policy: exactly `none`.

Primary documentation checked on 2026-05-17:

- `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation` states that `api.wikimedia.org` API endpoints are currently working normally, but that gradual deprecation of `api.wikimedia.org` endpoints begins in July 2026.
- `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation` identifies the Core API URL format as `https://api.wikimedia.org/core/v1/{project}/{language}/{endpoint}` and lists `GET /core/v1/{project}/{language}/search/page` under Core Search.
- `https://www.mediawiki.org/wiki/API:REST_API/Reference/en` documents the equivalent MediaWiki REST search page endpoint, including `q`, JSON response content, and the `pages` result array.
- `https://api.wikimedia.org/wiki/Core_REST_API/Reference/Search/Search_content` is deprecated documentation and must not be treated as an independent stability promise.

W2 treats the Wikimedia endpoint as a time-bound hidden proof dependency, not as a stable long-term source strategy. Immediately before W2 implementation, re-check the Wikimedia deprecation/status page and MediaWiki REST search reference. Stop and draft a revised provider package if the endpoint is deprecated beyond normal operation, replaced with a different route, redirected, credential-gated, rate-gated beyond the W2 budget, or if the response shape no longer matches the package.

Rejected first-provider option:

- OpenAlex was not selected for W2 because current OpenAlex developer documentation requires an API key for API usage. That would require credential/header handling beyond this package.

W2's Wikimedia endpoint is a first source-acquisition network proof, not the final source portfolio. It is intentionally not sufficient for public report quality or broad evidence coverage. Additional general web/news/scholarly providers require later packages and Source Acquisition quality review.

## 4. Implementation Objective

If reviewers approve implementation, X7-W2 may:

1. Add one product-owned W2 owner after X7-W1B.
2. Require X7-V, X7-W1A, and X7-W1B to be ready/completed before running.
3. Build a product-owned W2 authority snapshot.
4. Build W2 candidate-provider allowlist and exact candidate-runtime budget snapshots with non-zero candidate cap.
5. Build 7N-3B2 endpoint and network budget snapshots for the approved Wikimedia Core REST Search endpoint.
6. Construct the 7N-3B2 provider-network authority from the existing 7N-3B1 candidate-runtime authority.
7. Invoke `executeSourceAcquisitionCandidateRuntime(...)` through `buildSourceAcquisitionCandidateNetworkProviderBoundary(...)`.
8. Use only the existing 7N-3B2 SDK-free Node-core transport path.
9. Record one bounded admin-only W2 artifact on the same `precutover-observability` ledger, including timing, attempt count, byte-count, candidate-count, and fixed zero-dollar-cost telemetry.
10. Keep public V2 unchanged: damaged/precutover and no hidden marker leakage.

Expected successful hidden posture:

- candidate runtime exercised: true;
- provider-network boundary invoked: true;
- network transport may execute to the single approved endpoint only;
- provider SDK: false;
- redirects: denied;
- proxy env: ignored;
- content dereference: false;
- parser: false;
- cache/SR/storage: false;
- source material: false;
- EvidenceCorpus/evidence/report/verdict/warning/confidence/public output: false.

## 5. Proposed Source Envelope

Implementation must stay inside this envelope unless reviewers modify this package.

Allowed new production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.ts`

Allowed existing production files:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.ts`

The only approved reason to edit `source-acquisition-candidate-envelope.ts` is to represent a real approved no-credential network provider in `CandidateProviderCredentialsState` by adding the exact literal `not_required_for_approved_network_provider`. Do not change runtime semantics there beyond validation of that credential-state literal.

Existing `source-acquisition-network-*` files are not in the W2 source envelope. If implementation reveals a concrete verifier-backed defect in those files, stop, classify with `/debt-guard`, and either amend this package through review or split a separate repair package. Type friction, missing convenience exports, test-helper needs, or broad cleanup do not qualify as W2 edits.

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts`

Allowed governance/status files:

- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-W2_Source_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

Forbidden edits:

- prompt files;
- model policy files;
- cache policy files;
- UCM/default config files;
- provider SDK/package/lockfile files;
- content transport or parser files;
- Source Reliability files;
- public compatibility/API/UI/report/export files;
- V1 analyzer/prompt/type/helper files;
- API persistence/database files.

## 6. W2 Authority And Snapshot Rules

The W2 owner must expose a product-owned authority snapshot with:

- W2 version;
- source package path;
- implementation package commit after implementation;
- approval status `approved_x7w2_product_candidate_provider_network`;
- `approvedBy: "captain_deputy_review_team"`;
- `visibility: "internal_only"`;
- provider endpoint id and endpoint snapshot hash;
- network budget snapshot hash;
- candidate runtime provider allowlist hash;
- candidate runtime budget hash;
- 7N-3B2 implementation commit `54b8af1a`;
- capability scope:
  - candidate provider network: approved for one fixed endpoint;
  - provider SDK: false;
  - arbitrary URL dereference: false;
  - content dereference: false;
  - parser: false;
  - cache read/write: false;
  - durable storage: false;
  - Source Reliability: false;
  - source material: false;
  - EvidenceCorpus: false;
  - public exposure: false;
  - live jobs: false.

The existing 7N-3B1 and 7N-3B2 authorities are runtime-contract tokens only. Product-route approval must come from the W2 authority.

Fail closed if:

- X7-W1B did not complete as `closed_loop_completed_no_source_candidates`;
- X7-V or X7-W1A prerequisites are missing or stale;
- W2 authority is missing, copied, stale, placeholder, or mismatched;
- candidate provider allowlist, candidate budget, endpoint snapshot, or network budget is invalid;
- 7N-3B2 network authority cannot be constructed;
- endpoint snapshot is not the exact approved Wikimedia snapshot;
- candidate-provider allowlist is not the exact approved W2 allowlist;
- candidate-provider credentials state is anything other than `not_required_for_approved_network_provider`;
- network endpoint credentials state is anything other than `not_required`;
- redirect policy is not `deny`;
- proxy policy is not `none`;
- runtime returns damaged output;
- any source material, parser, cache, SR, storage, public, warning, report, verdict, confidence, or live-job flag is not false.

## 7. Endpoint Snapshot Contract

The W2 endpoint snapshot must be exact:

```text
providerId: wikimedia_core
endpointId: ep_wikimedia_core_page_search
canonicalAsciiHostname: api.wikimedia.org
protocol: https
port: 443
path: /core/v1/wikipedia/en/search/page
method: GET
allowedRequestParameters:
  - key: q
    valueSource: query_text
  - key: limit
    value: 3
allowedRequestHeaders:
  - accept: application_json
  - user-agent: factharbor_internal_agent
credentialsState: not_required
redirectPolicy: deny
proxyPolicy: none
responseContentTypePolicy: application/json only
responseSniffPolicy: json_object_or_array
responseCandidatePointer: object_array_field pages
decompressionPolicy: identity_only
```

The package intentionally does not approve:

- Authorization headers;
- API keys;
- cookies;
- query string templates beyond exact `q` and fixed `limit=3`;
- raw URLs;
- provider-returned URLs as dereference targets;
- redirect following;
- proxy/env proxy behavior;
- multiple providers;
- non-English endpoint routing;
- dynamic host/path construction.

Multilingual note: fixed English Wikimedia search is acceptable only as a hidden W2 network proof. It is not acceptable as final V2 source strategy or report-quality gate. A later provider portfolio package must address multilingual provider routing and coverage before public cutover.

## 8. Candidate Provider Allowlist Contract

The W2 candidate-provider allowlist snapshot must be exact:

```text
version: v2.source-acquisition.candidate-runtime.7n3b1
providerAllowlistSnapshotHash: sha256 of the canonical W2 candidate-provider allowlist snapshot
configSnapshotHash: sha256 of the canonical W2 authority, endpoint, provider, and budget tuple
allowedProviders:
  - providerId: wikimedia_core
    endpointKind: candidate_search_api_future
    maxQueries: 2
    timeoutMs: 1500
    credentialsState: not_required_for_approved_network_provider
disabledProviders:
  - providerId: openalex
    disabledReason: credentials_missing
noCache: true
noStorage: true
noSourceReliability: true
noProduct: true
noPublic: true
```

The candidate-provider credential state belongs only to this allowlist and the W2 authority, not to the 7N-3B2 network endpoint snapshot. The network endpoint snapshot must remain compatible with the existing exact-key 7N-3B2 validator.

The implementation may update the candidate envelope validator only to admit `not_required_for_approved_network_provider` for W2. It must continue to reject any copied closed/local/test-only provider state, any secret-bearing state, any unknown literal, and any provider entry with a different provider id, endpoint kind, query cap, timeout, or boundary flag.

The allowlist hash input must include:

- W2 source package path;
- W2 authority status;
- 7N-3B1 approval tuple;
- provider id;
- endpoint kind;
- `maxQueries`;
- `timeoutMs`;
- candidate-provider credentials state;
- disabled-provider list;
- no-cache/no-storage/no-SR/no-product/no-public flags.

## 9. Budget And Cost Telemetry Contract

W2 budget snapshots must be exact and deliberately small:

```text
W2_MAX_QUERY_ENTRIES: 2
maxProvidersPerRun: 1
maxQueriesPerProvider: 2
maxAttemptsPerQuery: 1
maxCandidatesPerQuery: 3
candidateRuntimeMaxCandidateRecordsPerQuery: 3
providerTimeoutMs: 1500
perQueryTimeoutMs: 1500
totalCandidateAcquisitionTimeoutMs: 3000
totalNetworkTimeoutMs: 3000
compressedByteCap: 32768
decompressedByteCap: 32768
totalByteCap: 32768
retryPolicy: none
decompressionPolicy: identity_only
dollarCostPolicy: fixed_zero_for_no_paid_api
```

W2 must fail closed before network execution if the hidden Query Planning handoff contains more than two query entries. It must not silently truncate while presenting a completed status.

The W2 artifact must include sanitized timing/cost telemetry:

- provider attempt count;
- per-query and total duration bucket or bounded millisecond value;
- compressed/decompressed/total byte counts after caps;
- candidate count and structurally dropped-record count;
- fixed dollar cost `0` with reason `no_paid_api_no_credentials`.

Candidate-quality observation in W2 is structural only: candidate records may be counted as shape-valid or shape-dropped. W2 must not score semantic source quality, relevance, authority, probative value, or report suitability.

## 10. Artifact Contract

The W2 artifact and route may expose only sanitized structural data:

- W2 version;
- ledger id;
- run id hash or bounded run id if already exposed in prior hidden artifacts;
- status:
  - `candidate_provider_network_completed`;
  - `blocked_pre_candidate_provider_network`;
  - `candidate_provider_network_damaged_structural`;
- selected AtomicClaim count;
- query entry count;
- retrieval policy count;
- provider id `wikimedia_core`;
- endpoint id `ep_wikimedia_core_page_search`;
- endpoint snapshot hash;
- network budget hash;
- candidate runtime status;
- candidate count;
- per-query ordinal and opaque query ref;
- per-query structural status and candidate count;
- provider attempt count;
- byte counts, duration aggregates, and fixed zero-dollar cost;
- structural candidate validity/dropped counts only, with no semantic candidate scoring;
- downstream blocker: `candidate_to_source_material_gate_closed`;
- all no-public/no-cache/no-SR/no-source-material/no-parser/no-report flags.

Forbidden in decision, artifact, route JSON, logs, thrown errors, and `JSON.stringify(...)`:

- raw query text;
- raw query id unless the W2 owner first proves it is opaque and independent of query text/source/provider input;
- source-language rationale text;
- raw provider payload;
- page title;
- page excerpt/snippet;
- page URL;
- Wikimedia page key;
- request path with query;
- request headers;
- raw URL;
- body;
- header;
- secret;
- source text;
- source material;
- parsed material;
- EvidenceItem;
- EvidenceCorpus;
- warning;
- verdict;
- confidence;
- report prose;
- cache key;
- Source Reliability field;
- stack;
- cause;
- raw exception text.

If W2 cannot prove query ids are opaque, artifacts must use only ordinal `W2Q_001`-style references.

Hidden artifact route contract:

- the route must use the existing admin-key authorization pattern via `checkAdminKey`;
- production requests with a missing admin key must return `401`;
- production requests with a wrong admin key must return `401`;
- every response, including authorization failures and errors, must include `Cache-Control: no-store`;
- the route may read only the single bounded `precutover-observability` ledger id used by W2;
- the route must not support listing, enumeration, wildcard ledger reads, cross-ledger reads, or query-by-provider/search functionality;
- route errors must be generic and must not include stack, cause, raw exception text, raw provider payload, raw query text, headers, URLs, or source material.

## 11. Test Requirements

Focused W2 tests must cover:

- happy path with hermetic fake DNS/socket/HTTPS transport returning Wikimedia-shaped JSON `{ "pages": [...] }`;
- no ambient DNS or provider internet in unit tests;
- exact endpoint snapshot and credential posture;
- exact candidate-provider allowlist snapshot, disabled-provider shape, and allowlist hash inputs;
- W2 blocks if the endpoint host/path/provider id changes;
- W2 blocks if candidate-provider credentials state is not `not_required_for_approved_network_provider`;
- W2 blocks if network endpoint credentials state is not `not_required`;
- W2 blocks if redirect policy is not `deny`;
- W2 blocks if proxy policy is not `none`;
- W2 blocks if X7-W1B prerequisite is missing or damaged;
- W2 blocks if W2 authority is copied or stale;
- W2 blocks if candidate/runtime/network snapshot hashes are stale;
- W2 blocks if Query Planning hands off more than two query entries;
- exact W2 budget snapshots and fixed zero-dollar-cost telemetry;
- W2 maps transport DNS/SSRF/final-address/redirect/content-type/sniff/byte/decompression/timeout/cancel failures to structural outcomes only;
- successful provider result creates hidden candidates but no source material;
- downstream source-material gate remains closed;
- hidden artifact route requires admin auth, returns production `401` for missing/wrong admin key, sets `Cache-Control: no-store` on every response, rejects malformed/duplicate ledger identifiers, blocks listing/enumeration/cross-ledger reads, does not echo requested ledger ids on not-found/error paths, and returns generic errors;
- poison values do not leak through decisions, artifacts, route JSON, `JSON.stringify(...)`, logs, generic error paths, or thrown errors.

Poison test values must include:

- query text with URL-like and secret-like content;
- source-language rationale with URL-like and secret-like content;
- provider payload title/snippet/url/key/excerpt values;
- header/body-like values;
- raw error stack/cause values;
- cache/SR markers.

Inherited 7N-3B2 tests must still pass:

- endpoint allowlist acceptance/rejection;
- DNS rebinding/final-address rejection;
- IPv4/IPv6 private/loopback/link-local/reserved/metadata blocking;
- IDNA/trailing-dot normalization;
- redirect denial;
- proxy env bypass;
- content-type/sniff rejection;
- byte/decompression caps;
- timeout/cancellation sanitization;
- no raw payload/URL/secret/stack leakage.

## 12. Boundary Guard Requirements

Boundary guards must prove:

- product/orchestrator imports only the W2 owner and W2 artifact sink;
- only the W2 owner imports `buildSourceAcquisitionCandidateNetworkProviderBoundary(...)`;
- only the W2 owner imports 7N-3B2 network authority/envelope/factory types/functions needed for W2;
- no product/public file imports `source-acquisition-network-transport`;
- no public API/UI/report/export/compatibility file imports W2 or `source-acquisition-network-*`;
- no provider SDK, `fetch`, `undici`, axios, got, ky, node-fetch, proxy-agent, browser network API, child process, filesystem, database, cache, SR, parser, content transport, V1 analyzer/prompt/type/helper import appears in the W2 owner, sink, or route;
- no barrel re-export makes W2 or 7N-3B2 network modules broadly reachable;
- old X6/X7-D/X7-E/X7-F/X7-G1/X7-G2 paths remain regression/historical context and are not product-route imports;
- any allowance for provider-network execution is scoped to W2 only.

Boundary guard debt control:

- W2 must add a small named W2-specific section in `boundary-guard.test.ts` for W2 assertions.
- W2 may add targeted `boundary-guard.test.ts` assertions only where they prove a W2-specific safety property.
- W2 may reorganize local `boundary-guard.test.ts` helper structure if it reduces duplication or makes the W2 allowance easier to audit, but it must not perform broad guard-suite refactoring.
- If W2 cannot fit inside a small named W2-specific guard section, or if it requires broad new glob scans, complex negative-match cascades, or cross-suite guard cleanup to pass, stop and split a guard/test debt package before W2 implementation proceeds.
- The W2 completion handoff must state whether boundary-guard complexity increased, decreased, or stayed flat, and list any remaining guard/test debt.

## 13. Gate Register And Status Rules

If implementation succeeds:

- update `gate.research_acquisition` to `X7-W2`;
- state/status should be `implemented_product_internal_candidate_provider_network_hidden_no_source_material`;
- source package should be this W2 package;
- preserve X7-W1B as prerequisite and X7-W1C as the pre-IO fence that W2 satisfies;
- preserve explicit blockers for source material, content dereference, parser/2D-C, cache/SR/storage, EvidenceCorpus, evidence/report/verdict/warning/confidence, public cutover, ACS/direct URL, V1 reuse, V1 cleanup, and live jobs;
- keep `research_acquisition` gateway policy `notImplemented` unless a later package explicitly changes it;
- keep live jobs blocked;
- self-test that broad globs, content files, parser files, source-material files, EvidenceCorpus files, report/verdict/public files, cache/SR/storage files, live-job unlocks, redirect-follow posture, provider SDKs, missing W1B/W1C provenance, missing W2 endpoint provenance, and alternate provider endpoint strings cannot enter the active row.

The gate register remains audit-only and grants no runtime authority.

## 14. Explicitly Not Authorized

- live jobs or Captain canaries;
- public API/UI/report/export/compatibility view changes;
- source material creation;
- content dereference or document fetching beyond candidate-provider JSON response;
- parser execution;
- packet/frame/byte handoff to parser;
- EvidenceCorpus or EvidenceItem generation;
- warnings, verdicts, confidence, truth percentage, report prose, or public answer generation;
- cache IO, durable storage, Source Reliability, DB writes;
- provider SDKs or package/lockfile changes;
- OpenAlex or credentialed providers;
- Authorization headers, API keys, cookies, or secrets;
- redirects;
- proxies;
- retries;
- arbitrary/provider-returned URL dereference;
- prompt/config/schema/model/provider policy changes;
- ACS/direct URL execution;
- deleting old harnesses without explicit deletion/retirement package;
- V1 reuse, V1 work, or V1 cleanup.

## 15. Required Verifier Set

Before completion, run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

Do not run live jobs or expensive LLM tests for W2 implementation.

## 16. Review Questions

1. Is Wikimedia Core REST Search an acceptable first no-credential candidate provider for hidden W2 network proof, given that it is not final source-portfolio coverage?
2. Is the fixed English endpoint acceptable for W2 proof only, with multilingual provider routing blocked for a later package?
3. Is the exact `not_required_for_approved_network_provider` candidate-provider literal acceptable as the lowest-complexity way to express no-auth real-provider posture?
4. Are the exact W2 budget values strict enough for hidden proof execution without compromising later quality goals?
5. Are the artifact leakage rules strict enough given Wikimedia responses include page titles, excerpts, keys, and URLs?
6. Is the stop rule for Wikimedia endpoint deprecation/status re-check sufficient before implementation?

## 17. Reviewer Prompt

Review `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md` as the W2 source package after X7-W1C and provenance repair `0e6a8b37`.

Return `approve`, `modify`, or `reject`.

Check whether implementation may proceed inside the exact envelope. Pay special attention to:

- using Wikimedia Core REST Search as the first no-credential hidden candidate provider;
- treating Wikimedia as a time-bound hidden proof dependency with a required pre-implementation deprecation/status re-check;
- avoiding OpenAlex because current docs require an API key;
- preserving redirect `deny`, proxy `none`, SDK-free transport, SSRF/final-address controls, byte/decompression caps, timeout/cancel behavior, and no ambient internet in tests;
- preventing raw query text, provider payload, titles, excerpts, URLs, page keys, headers, secrets, source material, EvidenceCorpus, warnings, verdicts, confidence, report prose, cache/SR fields, stack, and causes from leaking;
- keeping content dereference/parser/source-material/EvidenceCorpus/report/public/live jobs blocked;
- ensuring W2 improves or contains guard/test complexity, especially in `boundary-guard.test.ts`;
- whether the candidate-envelope credential-state literal addition is the lowest-complexity way to express no-auth real provider posture;
- whether the source envelope is too broad, too narrow, or missing a required verifier.
