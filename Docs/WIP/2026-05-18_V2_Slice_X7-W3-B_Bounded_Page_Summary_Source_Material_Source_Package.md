# V2 Slice X7-W3-B Bounded Page-Summary Source Material Source Package

**Date:** 2026-05-18
**Status:** Implementation complete; one approved live canary passed
**Owner:** Lead Developer / Captain Deputy
**Parent steering package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W3_Source_Material_Steering_Review_Package.md`
**Parent implementation package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W3-A_Safe_Locator_Materialization_Preview_Source_Package.md`
**Parent live result:** `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3-A_Live_Canary_Result.md`
**Parent commits:** `b72cda94` W3-A implementation, `84dc1051` W3-A canary-result documentation
**Live-job tranche:** 4 jobs remain after the W3-B canary. No second W3-B canary is authorized without another reviewed package.

## 1. Purpose

W3-A proved that V2 can safely materialize hidden/admin-only preview diagnostics and opaque locator references from provider-owned Wikimedia W2 search candidates without extra HTTP, Source Material records, raw provider payload leakage, or public exposure.

W3-B is the proposed Tier 1 package: the first real Source Material fetch. It should fetch a bounded Wikimedia page summary for exactly one approved runtime-owned materialized locator and produce one or more hidden/admin-only Source Material records from a single explicitly approved plain-text response field.

This package was the review target for whether W3-B was narrow enough, valuable enough, and sufficiently contained to implement next. Implementation closeout is recorded in `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3-B_Implementation.md`; live canary result is recorded in `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3-B_Live_Canary_Result.md`.

## 2. Debate Result

A compact expert debate was run before drafting this package:

- Claude Opus 4.6 senior architect / LLM expert: `approve with modifications`.
- Security/containment reviewer: `modify and approve W3-B as next package`.
- Product/quality/cost reviewer: `approve W3-B as next package, modified narrowly`.

Consolidated recommendation:

1. W3-B is the right next package because W2/W3-A proved candidates and materialization but not bounded source material.
2. Do not do broad endpoint/client durability review first; include the endpoint durability decision inside W3-B.
3. Do not add a second provider first.
4. Do not do broad guard/test debt cleanup first unless W3-B drafting reveals a specific blocker.
5. Keep W3-B to one provider family, one endpoint shape, one runtime-owned materialized locator, one post-implementation canary maximum.

This debate was a pre-draft structuring exercise. It is not a substitute for the formal Steering Board and Security review of this package.

## 3. Current Facts

- W3-A canary job `316e938072dc44a2a24d8e0862642c6b` ran on committed/refreshed runtime `b72cda946225f4a46f131853c18fdd2d590bc28c`.
- The job reached `SUCCEEDED`.
- Public V2 remained `_schemaVersion: 4.0.0-cb-precutover` and `publicCutoverStatus: blocked_precutover`.
- W2 recorded `candidate_provider_network_completed` with `9` hidden candidates.
- W3-A recorded `source_candidate_preview_partial` with `9` preview records, `8` materialized, `1` partial, and `0` blocked.
- W3-A made no extra HTTP call and created no Source Material.
- W3-A hidden raw-leak scan found no provider request/response, candidate URL, headers, API-key markers, source text, evidence text, or report markdown leakage.
- The W3-A artifact route is not durable and was not available during this package drafting, so the exact live partial preview record is not recoverable from durable docs.

Code-level interpretation of the W3-A partial result:

- `blockedPreviewRecordCount: 0` means the partial record was not a blocked invalid locator record.
- In current W3-A code, `source_candidate_preview_partial` on a projection means the locator was accepted, but one or more preview fields were rejected/truncated, or all preview fields were missing.
- For first W3-B implementation, partial preview records must not be fetched. W3-B may fetch only records whose W3-A projection is `source_candidate_preview_materialized`.
- If implementers want to fetch a partial record later, that needs a separate reviewed rule proving that the locator is valid and the partial preview state is irrelevant to source-material fetch safety.

## 4. Endpoint Decision

W3-B should use the Wikimedia Page Content Service page-summary endpoint:

```text
https://{language}.wikipedia.org/api/rest_v1/page/summary/{encodedTitle}
```

This is a host-family shift from W2:

- W2 used `https://api.wikimedia.org/core/v1/{project}/{language}/search/page`.
- W3-B would use project-local hosts such as `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`.

The shift remains within the Wikimedia provider family, but it crosses the exact host boundary. Steering Board review must approve that boundary explicitly before implementation.

W3-B reduces additional Core API dependency by using the project-local Page Content Service summary endpoint, but it does not resolve the existing W2 Core search endpoint durability risk. W2 endpoint migration remains a separate later workstream.

Endpoint references checked on 2026-05-18:

- Wikimedia Page Content Service documents `/page/summary/{title}` as a stable JSON endpoint and describes its summary metadata/extract role: `https://www.mediawiki.org/wiki/Page_Content_Service`.
- Wikimedia REST API reference lists search-page result fields and endpoint shapes: `https://www.mediawiki.org/wiki/API:REST_API/Reference`.
- Wikimedia Core API deprecation starts gradually in July 2026, with replacements to be announced later: `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`.
- The existing W2 Core search endpoint remains a time-bound candidate-provider proof dependency: `https://api.wikimedia.org/wiki/API_reference/Core/Search/Search_content`.

Recommended endpoint posture:

- approve the project-local Page Content Service summary endpoint for W3-B only;
- do not add Core page fetch, full page source, full page HTML, `with_html`, `bare`, media-list, or mobile-html endpoints;
- do not add second provider endpoints;
- treat any future Wikimedia endpoint migration as a later source package, not a compatibility shim inside W3-B.

## 5. Fetch Count And Budget Posture

W3-B should fetch at most one page summary per run in the first implementation.

Rationale:

- it is the first real Source Material fetch;
- it proves the contract without broadening blast radius;
- W3-A already produced 8 materialized locators, so one fetch is enough to test the path;
- broader coverage can wait until the first Source Material record is proven safe.

Recommended W3-B caps:

| Bound | Value | Notes |
|---|---:|---|
| Max source-material fetches per run | `1` | First implementation only |
| Per-fetch timeout | `1500ms` | Align with W2 per-query timeout posture |
| Redirects | `deny` | Any redirect fails closed |
| Retries | `0` | No retries in W3-B |
| Credentials | forbidden | No API key, cookies, bearer, auth header |
| Proxy | forbidden | Same no-proxy posture as W2 |
| Compressed response cap | `8192` bytes | Lower than W2 byte cap |
| Decompressed response cap | `16384` bytes | Lower than W2 byte cap |
| Source-material text cap | `4096` UTF-8 bytes | Applies to selected `extract` field only |
| Artifact serialized cap | `24576` bytes | Same general W3-A artifact posture unless implementation proves tighter cap |

If the endpoint needs higher caps, redirects, credentials, proxy behavior, retries, or full page/source/html content, W3-B must stop.

## 6. Accepted Inputs

W3-B may accept only process-local runtime-owned W3-A output from the same current V2 product-route execution.

Required preconditions:

- public V2 is `blocked_precutover`;
- W2 status is `candidate_provider_network_completed`;
- W3-A status is `source_candidate_preview_materialized` or `source_candidate_preview_partial` with nonzero preview records;
- at least one W3-A preview record has `materializationStatus: source_candidate_preview_materialized`;
- W3-A product execution has `extraHttpCallMade: false`;
- W3-A source material flags are false;
- all parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public flags are false.

W3-B must not accept:

- public result JSON;
- admin W2 or W3-A artifact JSON;
- copied W3-A records from logs or durable files;
- raw provider JSON serialized elsewhere;
- provider-returned URLs;
- raw request URLs;
- partial preview records in the first W3-B implementation;
- any candidate from a provider other than the approved Wikimedia search path.

## 7. Runtime-Owned Fetch Locator Contract

W3-A artifacts deliberately do not expose raw page keys or titles. W3-B therefore cannot consume W3-A admin artifacts as fetch input.

W3-B must introduce or reuse a runtime-only, non-public, non-durable fetch locator that is created while the provider-owned W2 candidate object is still available in the current call stack. The fetch locator is an execution handle, not an artifact contract.

Allowed fetch-locator fields:

- `locatorVersion`;
- provider-family id `wikimedia_core`;
- search endpoint id `ep_wikimedia_core_page_search`;
- source-material endpoint id `ep_wikimedia_project_page_summary`;
- opaque `locatorRef`;
- opaque W3-A `candidatePreviewId`;
- structural project id, initially `wikipedia`;
- structural language code used to form the project-local host;
- encoded title/path segment for request construction;
- hash of the raw candidate page key/title value;
- materialization status;
- structural eligibility `eligible_for_w3b_fetch` or blocked enum.

For W3-B, `wikimedia_core` remains the provider-family id inherited from W2 candidate discovery, while `ep_wikimedia_project_page_summary` is the distinct source-material endpoint id. Reviewers must reject implementation if this distinction becomes ambiguous in code or artifacts.

Forbidden fetch-locator exposure:

- raw page key in artifacts;
- raw title in artifacts;
- raw URL in artifacts;
- provider-returned URLs;
- raw provider JSON;
- headers, cookies, secrets, exception text, stack traces;
- durable storage.

Request construction rule:

- Build the URL only from the fixed endpoint template plus structurally validated project/language/title components.
- Do not use any provider-returned URL as authority.
- Do not recover the locator from admin artifacts.
- Do not add a fallback path that derives title/page key from the W3-A bounded preview text.

If this runtime-owned locator cannot be built without raw artifact recovery, W3-B must stop before implementation.

## 8. Host And Path Validation

Allowed authority:

- scheme: `https`;
- port: default `443` only;
- host: exactly `{language}.wikipedia.org` for the structurally accepted language code;
- path prefix: exactly `/api/rest_v1/page/summary/`;
- query string: none;
- fragment: none.

Structural language-code validation:

- lower-case structural code;
- host-label-safe pattern only: ASCII lower-case letters, digits, and hyphen;
- no whitespace;
- no dot, slash, backslash, query, fragment, colon, at sign, underscore, or control character;
- no leading or trailing hyphen;
- bounded length;
- must come from the W2 endpoint/source-language context, not from public output or preview text.

Structural title/path validation:

- source is the provider-owned candidate page key/title field accepted by the W3-A/W3-B materializer;
- no URI scheme, slash, backslash, query, fragment, control character, credential marker, or path traversal segment before encoding;
- encode with path-segment encoding;
- reject if encoding would produce an empty path segment or exceed cap;
- never emit the raw title/key in public or admin artifacts.

Network containment:

- DNS pre-resolution and public-address validation are required before the request;
- final remote-address validation is required after connection;
- redirect is a hard fail;
- proxy and credentials are forbidden;
- raw network error details are replaced by bounded enum diagnostics.
- compressed and decompressed byte caps are counted while streaming; implementations must abort the request as soon as a cap is exceeded and must not rely only on `Content-Length`, `response.text()`, or any full-response buffering path.

## 9. Source Material Body Field

W3-B should treat only the JSON `extract` field from the page-summary response as Source Material.

Accepted body field:

- `extract`: bounded plain text summary/extract.

Allowed structural metadata, if bounded:

- `lang`;
- `dir`;
- namespace/content category if implemented as enum-only;
- response content type category;
- response status category;
- source-material body hash and byte length;
- truncation state.

Forbidden body fields and payloads:

- `extract_html`;
- full raw JSON payload;
- `content_urls`;
- `thumbnail`;
- original image/source URLs;
- full page/source/html;
- page media;
- response headers;
- request headers;
- cookies;
- raw URL;
- raw exception details;
- provider-returned URLs;
- title/page key as raw artifact output.

If `extract` is missing, blank, oversized, structurally unsafe, or only available after using HTML/full-page/source fields, W3-B must produce zero Source Material records and fail closed.

## 10. Output Contract

W3-B may create hidden/admin-only Source Material records.

Allowed top-level decision fields:

- version `v2.evidence-lifecycle.source-material.page-summary.x7w3b`;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- run id and ledger id;
- status:
  - `source_material_page_summary_completed`;
  - `blocked_pre_source_material_page_summary`;
  - `source_material_page_summary_failed_structural`;
  - `source_material_page_summary_timed_out`;
  - `source_material_page_summary_cancelled`;
  - `source_material_page_summary_damaged_structural`;
- stop reason enum;
- source-material record count;
- fetch diagnostic count;
- all downstream flags.

Allowed Source Material record fields:

- record version;
- opaque source material id;
- opaque locator ref;
- opaque W3-A candidate preview ref;
- provider id;
- source-material endpoint id;
- language code structural metadata;
- source material kind `wikimedia_page_summary_extract_text`;
- bounded `sourceMaterialText` from `extract`;
- `sourceMaterialTextHash`;
- byte and char lengths;
- truncation state;
- response status category;
- content type category;
- compressed/decompressed byte counts;
- duration and timeout values;
- public pointer exposure `forbidden`;
- parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public flags false.

Forbidden Source Material output:

- EvidenceCorpus;
- EvidenceItems;
- parser packets or parsed material;
- extraction input;
- report prose;
- verdict labels;
- truth percentage;
- confidence;
- warnings;
- public compatibility fields;
- durable writes;
- cache/SR data.

## 11. Fetch Diagnostics Contract

Allowed bounded diagnostics:

- diagnostic version;
- visibility `internal_admin_only`;
- attempt ordinal;
- opaque locator/source material ref;
- provider id;
- endpoint id;
- status enum;
- stop reason enum;
- duration ms;
- timeout ms;
- DNS address count;
- selected address family;
- final-address validation category;
- response status category;
- content type category;
- byte counts;
- byte cap state;
- truncation state;
- raw payload included false;
- secret included false;
- public payload included false;
- error trace included false;
- cache/SR/storage touched false.

Forbidden diagnostics:

- raw locator values;
- raw URLs;
- raw title/page key;
- response body;
- source text;
- headers;
- cookies;
- secrets;
- stack traces;
- low-level exception text;
- query text;
- public result fields.

## 12. Implementation Envelope For Later Review

This package authorizes no implementation. If approved, the later implementation should stay inside this envelope.

Allowed production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.ts`
- focused amendments to `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization.ts`
- focused amendments to `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route.ts`
- focused amendments to `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`
- focused amendments to `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- focused amendments to `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`
- focused amendments to `apps/web/src/lib/analyzer-v2/orchestrator.ts`

Allowed test files:

- corresponding focused unit tests for new W3-B source-material modules;
- focused amendments to existing W3-A/source-acquisition/orchestrator tests;
- focused amendments to `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`;
- route auth/no-store tests for the W3-B admin-only artifact route.

Allowed docs:

- this package;
- minimal pointer-style status/backlog update if needed;
- completion handoff;
- Agent_Outputs;
- generated handoff index.

Forbidden files:

- public API/UI/report/export/compatibility files;
- V1 analyzer/prompt/type/helper files;
- prompt files;
- UCM/default config files;
- model/cache/source-reliability policy files;
- package and lock files;
- parser/OCI execution files;
- API persistence/database files;
- runner queue unless a separate reviewed package proves it is required.

## 13. Boundary Guards

W3-B implementation should prove:

- public files do not import W3-B owner, transport, artifact sink, or route internals;
- W3-B owner does not import parser, cache, Source Reliability, durable storage, report, verdict, public, ACS/direct URL, or V1 modules;
- only the W3-B fetch locator module may handle the raw candidate page key/title for request construction;
- no artifact route can emit raw page key/title/URL/provider JSON/header/error/source/evidence/report/verdict data;
- only the W3-B transport module may import Node HTTPS/fetch-capable transport for page-summary fetch;
- W3-B transport cannot follow redirects;
- W3-B cannot call parser or EvidenceCorpus builders;
- W3-B cannot emit warnings, reports, verdicts, confidence, or public compatibility fields;
- W3-B cannot write cache/SR/storage;
- W3-B cannot use provider-returned URLs as request URLs;
- W3-B cannot fetch Tier 2 full page/source/html endpoints.

## 14. Test Expectations

Focused tests must cover:

- completed W2 plus materialized W3-A record admitted;
- W2 blocked/damaged/stale rejected;
- W3-A absent rejected;
- W3-A partial record rejected for first W3-B implementation;
- public/admin artifacts rejected as execution input;
- fetch locator cannot be recovered from raw artifacts;
- language host construction is exact and allowlisted;
- title path segment encoding is bounded and safe;
- raw provider URL is ignored/rejected;
- redirect denied;
- private/reserved DNS and final remote address rejected;
- proxy/credential attempts rejected;
- byte caps fail closed;
- timeout maps to bounded enum;
- non-JSON or malformed JSON fails closed;
- missing/blank `extract` yields zero Source Material records;
- `extract_html`, content URLs, thumbnails, images, and raw JSON are not used as body;
- bounded `extract` creates hidden Source Material record;
- source-material text cap/truncation works;
- raw payload/title/key/URL/header/error/secret leak scans pass;
- public V2 output remains `4.0.0-cb-precutover` / `blocked_precutover`;
- parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public flags remain false;
- admin artifact route requires admin key, returns no-store, and sanitizes not-found/error responses.

## 15. Required Verifier Set For Later Implementation

Before any W3-B canary, the later implementation must run at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
git status --short --untracked-files=all
```

Do not run expensive tests as package verification.

## 16. Optional Post-Implementation Canary

This package proposes exactly one optional W3-B canary after Steering Board approval, implementation, focused commit, runtime refresh, route preflight, and clean worktree checkpoint.

Proposed input:

```text
Using hydrogen for cars is more efficient than using electricity
```

Budget impact:

- consumes 1 of the 5 remaining jobs in the current tranche;
- no second W3-B canary without another reviewed package.

Pass criteria:

- job reaches `SUCCEEDED`;
- first preparation event shows `pipeline: claimboundary-v2`;
- public output remains `4.0.0-cb-precutover` / `blocked_precutover`;
- no hidden markers leak publicly;
- W2 records completed hidden candidates;
- W3-A records nonzero preview records with at least one materialized record;
- W3-B records exactly one attempted page-summary fetch or one bounded stop before fetch;
- W3-B records at least one hidden/admin-only Source Material record from bounded `extract` if the fetch succeeds;
- W3-B raw leak scans pass;
- parser/cache/SR/storage/EvidenceCorpus/EvidenceItems/report/verdict/warning/confidence/public/ACS/direct URL/V1 flags remain false.

Stop/pivot criteria:

- no materialized W3-A record is available;
- runtime-owned fetch locator cannot be built without reading admin/public artifacts;
- project-local host allowlist cannot be made exact;
- endpoint requires redirect, proxy, credentials, retries, raised byte caps, or full page/source/html fields;
- one approved W3-B canary returns zero Source Material records after a successful W2/W3-A path;
- any raw payload/title/key/URL/header/error/source/evidence/report/verdict data leaks;
- any parser/EvidenceCorpus/report/verdict/public behavior appears.

## 17. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W3-B_Bounded_Page_Summary_Source_Material_Source_Package.md` as the proposed W3-B / Tier 1 Source Material package for FactHarbor V2.

Return `approve`, `modify`, or `reject`.

Check whether:

- W3-B is the right next package after W3-A canary success;
- the package correctly treats the W3-A partial record as ineligible for first W3-B fetch;
- the project-local `{language}.wikipedia.org` host shift is explicit enough for Steering approval;
- `extract` is the right and only Source Material body field;
- fetch count `1`, byte caps, timeout, redirect-deny, no-proxy, no-credentials, and no-retry posture are strict enough;
- the runtime-owned fetch locator contract prevents raw artifact recovery and provider-returned URL dereference;
- hidden/admin-only Source Material records may contain bounded `extract` text without opening EvidenceCorpus or public output;
- tests and boundary guards are sufficient;
- any decision should escalate to Captain before implementation.
