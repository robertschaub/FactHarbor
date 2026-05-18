# V2 Slice X7-W3 Source Material Steering Review Package

**Date:** 2026-05-18
**Status:** Steering Board review package only; implementation and live jobs blocked
**Owner:** Lead Developer / Captain Deputy
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1-A_Bounded_Core_Search_Limit_Live_Result.md`
**Live-job tranche:** 6 jobs available after W2; this package proposes at most one post-implementation canary, counted against that tranche, but only after Steering Board approval and a later implementation package.

## 1. Purpose

W2 is closed. PIV1-A proved that the product V2 route can reach the approved Wikimedia Core page-search endpoint, record bounded hidden provider-network diagnostics, and produce nonzero hidden structural candidates.

The next downstream stage is Source Material. This package is not implementation approval. It defines the review target for how V2 may move from hidden W2 candidate records to hidden/admin-only source-material records without opening parser execution, EvidenceCorpus, EvidenceItems, report/verdict/warning/confidence behavior, public exposure, cache/Source Reliability/storage, ACS/direct URL, provider expansion, retries, or V1 work.

## 2. Current Facts

- W2 live canary job `c4ed36f4ce634860b906c74ea1557cc6` completed with `candidate_provider_network_completed`, `9` total hidden structural candidates, and `13982` total bytes.
- W2 public output stayed `4.0.0-cb-precutover` / `blocked_precutover`.
- W2 artifacts expose sanitized structural counts, hashes, byte/timing telemetry, and opaque query references only.
- Current W2 hidden candidate records contain opaque `candidateId` and `hiddenLocatorId` placeholders. They do not carry dereferenceable URLs, page keys, titles, snippets, domains, source text, or parsed content in artifacts.
- `source-acquisition-network-transport.ts` currently reads the candidate array only to count entries. It does not expose candidate-array fields for downstream source-material use.
- Existing X7-A/X7-B source-material code intentionally proves absence: candidates are not source material, hidden locators are not dereferenceable, and candidate counts are not evidence.

Conclusion: Source Material must not consume W2 artifacts alone. A safe locator-materialization contract is required before any source-material fetch can be implemented.

## 3. Steering Decision Requested

Approve, modify, or reject the following direction:

1. Treat X7-W3 as the Source Material gate family after W2.
2. Require an explicit safe locator-materialization contract before any source-material fetch.
3. Keep W3 hidden/admin-only and process-local/no-store.
4. Do not add a second provider in W3.
5. Do not add retries in W3.
6. Do not open parser execution, EvidenceCorpus, EvidenceItems, report/verdict/warning/confidence, public exposure, cache/SR/storage, ACS/direct URL, or V1 work.
7. Prefer a split implementation sequence unless reviewers deliberately approve a combined package:
   - **W3-A:** safe locator materialization contract and artifact surface, no source-material fetch.
   - **W3-B:** bounded source-material fetch from approved materialized locators, no parser or EvidenceCorpus.

The default Lead Developer recommendation is split W3-A/W3-B. Combining locator materialization and fetch into one source package is possible but broader and should require explicit Steering Board acceptance.

## 4. Accepted Inputs From W2

Source Material may accept only an internal product-route W2 decision plus a new safe locator-materialization output. It must not accept public result JSON or the admin artifact route as execution input.

### Required W2 Preconditions

The W2 input must prove:

- `candidateProviderNetwork.status: candidate_provider_network_completed`;
- `candidateProviderNetwork.downstreamGate: candidate_to_source_material_gate_closed` before W3 opens;
- `publicCutoverStatus: blocked_precutover`;
- `providerId: wikimedia_core`;
- `endpointId: ep_wikimedia_core_page_search`;
- nonzero `candidateCount`;
- bounded `queryEntryCount` and `providerAttemptCount`;
- `contentDereferenceCalled: false`;
- `parserExecuted: false`;
- `cacheRead: false`;
- `cacheWrite: false`;
- `storageWrite: false`;
- `sourceReliabilityCalled: false`;
- `sourceMaterialCreated: false`;
- `evidenceCorpusCreated: false`;
- `evidenceItemGenerated: false`;
- `warningGenerated: false`;
- `reportGenerated: false`;
- `verdictGenerated: false`;
- `publicSurfaceWritten: false`.

If any of these are missing, stale, mismatched, copied from public output, or inconsistent with the current run context, W3 must block before locator materialization or fetch.

### Safe Locator-Materialization Requirement

W3 must introduce a separate locator-materialization contract because current W2 candidates are opaque and not dereferenceable.

The materialization contract may consume only the provider-owned candidate array while the W2 provider-network owner still has access to it. It must not recover locators from raw artifacts, logs, public output, or provider response JSON serialized elsewhere.

For Wikimedia, the materializer may accept a bounded provider page identifier only if:

- it comes from the approved Wikimedia search response candidate object;
- it is needed to build the approved Source Material fetch request;
- it passes exact structural validation;
- it is never exposed in public output;
- it is not written to durable storage;
- it is not emitted in admin artifacts as raw title, raw page key, raw URL, or raw path;
- the admin artifact receives only an opaque locator ref, provider id, endpoint id, materialization status, bounded counts, hashes, and failure categories.

The materializer must reject:

- raw URLs;
- `html_url` or provider-returned fetch URLs;
- strings containing a URI scheme, backslash, query, fragment, control character, credential marker, or slash-like path traversal;
- blank, placeholder, overlong, or non-normalized identifiers;
- candidate objects containing unexpected source/content/evidence/report fields when those fields would be carried forward;
- candidate arrays from any provider other than the approved W3 provider.

The fetch request must be built from an allowlisted endpoint template and the validated locator value, not from a provider-returned URL.

## 5. Source Material Output Contract

W3 may produce hidden/admin-only source-material records only after the locator-materialization gate passes.

A source-material record is not an EvidenceItem, not an EvidenceCorpus entry, not a verdict input, and not public content. It is a bounded source acquisition artifact that may be inspected by admins only and consumed by a later reviewed parser/EvidenceCorpus gate.

Allowed source-material record fields:

- record version;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- ledger id and run id;
- opaque source material id;
- opaque W2 candidate ref;
- opaque locator ref;
- provider id and source-material endpoint id;
- materialization status;
- fetch status;
- content type category;
- byte counts after caps;
- duration and timeout values;
- source material kind, for example `provider_page_source_text` or `provider_page_html_unparsed`;
- bounded source material body only if the endpoint contract explicitly marks that field as source material and the body is capped, non-durable, admin-only, and not parsed;
- source material body hash and byte length;
- truncation state;
- license/provenance category if available as bounded structural metadata;
- all downstream flags false: parser, EvidenceCorpus, EvidenceItems, warnings, report, verdict, confidence, public write.

Forbidden in source-material records and diagnostics:

- full raw provider JSON payload;
- response headers;
- cookies;
- request headers;
- raw request URL;
- provider-returned URL;
- unbounded title, snippet, excerpt, domain, page key, page id, path, query string, or HTML URL;
- raw error message, stack, cause, or low-level exception text;
- cache key;
- Source Reliability fields;
- extracted claims or EvidenceItems;
- report prose, warning prose, verdict labels, truth percentages, confidence values;
- public compatibility fields.

If a source body is recorded, it must be the explicitly selected source-material body, not the raw network payload. For example, a JSON response may yield only a bounded `source` or approved content field as source material; the full JSON body remains forbidden.

## 6. Fetch Diagnostics Contract

W3 may produce bounded fetch diagnostics separate from source-material records.

Allowed diagnostic fields:

- diagnostic version;
- visibility `internal_admin_only`;
- provider id;
- endpoint id;
- opaque source material id or locator ref;
- attempt ordinal;
- structural status:
  - `source_material_fetch_completed`;
  - `blocked_pre_source_material_fetch`;
  - `source_material_fetch_failed_structural`;
  - `source_material_fetch_timed_out`;
  - `source_material_fetch_cancelled`;
- stop reason enum;
- duration ms;
- timeout ms;
- DNS address count;
- selected address family;
- final address validation category;
- response status code category;
- content type category;
- compressed/decompressed/total byte counts;
- byte count state;
- truncation state;
- raw payload included false;
- secret included false;
- public payload included false;
- error trace included false;
- cache/SR/storage touched false.

Diagnostics must not include raw locator values, URLs, source text, source body, snippets, titles, page keys, raw payloads, headers, secrets, stack traces, or public result fields.

## 7. Endpoint Strategy For Review

This package does not choose a final endpoint. It defines the decision.

Options:

| Option | Shape | Pros | Risks |
|---|---|---|---|
| A: Wikimedia Core page endpoint | Continue `api.wikimedia.org/core/v1/...` for the first source-material fetch | Same host family as W2, simpler continuity | Core API deprecation starts July 2026; weaker long-term durability |
| B: Wikimedia project-local REST endpoint | Use the documented project-local equivalent under the wiki domain, for example `/w/rest.php/v1/page/...` | Better aligned with Wikimedia deprecation guidance | New host allowlist and endpoint review required |
| C: Add second provider first | Add a broader source provider before Source Material | Better coverage strategy | Too broad for first post-W2 Source Material gate; new provider security and cost review needed |

Lead Developer recommendation: do not add a second provider in W3. Decide between A and B during Steering Board review. If endpoint durability is the dominant concern, prefer B as a same-provider-family endpoint change rather than adding a second provider.

Official references checked for review context:

- `https://api.wikimedia.org/wiki/API_reference/Core/Search/Search_content`
- `https://api.wikimedia.org/wiki/Core_REST_API/Reference/Pages/Page_object`
- `https://api.wikimedia.org/wiki/Core_REST_API/Reference/Pages/Get_page_source`
- `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`

## 8. Containment Boundaries

W3 must preserve W2 containment:

- hidden/admin-only artifacts;
- no public pointer exposure;
- bounded byte limits;
- bounded timeouts;
- one provider family unless a separate provider package is approved;
- no retries;
- redirect deny;
- proxy none;
- no credentials;
- no raw payload leakage;
- no durable storage;
- no cache IO;
- no Source Reliability;
- no parser execution;
- no EvidenceCorpus;
- no EvidenceItems;
- no report, verdict, warning, confidence, or truth percentage;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`;
- no ACS/direct URL;
- no V1 reuse, V1 work, or V1 cleanup.

## 9. Failure Boundaries

W3 must fail closed with no source-material record when:

- W2 is missing, damaged, blocked, stale, or not from the current run context;
- W2 candidate count is zero;
- W2 public cutover status is not blocked;
- W2 artifact or public JSON is provided as execution input instead of internal product-route state;
- locator materialization is missing or invalid;
- materialized locator value is raw URL-like, path-like, secret-like, overlong, blank, placeholder, or provider-mismatched;
- endpoint authority, allowlist, byte budget, timeout budget, or final-address validation is missing or mismatched;
- DNS/final-address validation fails;
- redirect is observed;
- proxy behavior is required;
- credentials are required;
- response status/content type/sniffing is rejected;
- byte/time caps are exceeded;
- source body is missing, unbounded, or not in an approved source-material field;
- artifact serialization would exceed its cap;
- any parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public flag becomes true.

Failure output may include only bounded enum diagnostics and counts. It must not include raw exception details, raw provider payload, raw locator values, source text, URLs, headers, or secrets.

## 10. Proposed Implementation Envelope For Later Review

No implementation is approved by this package. If the Steering Board approves W3, the later source package should stay close to this envelope.

Likely new or changed files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/source-material-record.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-artifacts/route.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- focused unit tests for the new files and route;
- a targeted `boundary-guard.test.ts` section;
- status, backlog, handoff, Agent_Outputs, and index docs.

Likely forbidden files:

- public API/UI/report/export/compatibility files;
- V1 analyzer/prompt/type/helper files;
- prompt files;
- UCM/default config files;
- model/cache/source-reliability policy files;
- package and lock files;
- parser/OCI files;
- API persistence/database files;
- runner queue except if a reviewed product-route call site genuinely requires it.

The later implementation package must explicitly decide whether W3 is split:

- W3-A locator materialization only; or
- W3-A plus W3-B bounded source-material fetch in one package.

Default recommendation: split.

## 11. Test And Guard Expectations For Later Implementation

The later implementation package should require focused tests for:

- W2 completed input admitted;
- W2 blocked/damaged/stale input rejected;
- public result JSON and admin W2 artifact rejected as execution input;
- safe locator materialization succeeds only from approved provider candidate objects;
- raw URL/provider URL/title/snippet/page-key leakage rejected from artifacts;
- endpoint authority exactness;
- final-address validation;
- redirect denial;
- proxy none;
- no credentials;
- byte/time cap failure mapping;
- no raw payload leakage;
- source-material record body cap/truncation;
- artifact oversize skip;
- admin route auth/no-store/error sanitization;
- public V2 output remains damaged/precutover;
- parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public flags remain false.

Boundary guards should prove:

- product/orchestrator imports only the W3 owner and W3 artifact sink;
- public files do not import W3;
- W3 owner does not import parser/cache/SR/storage/report/verdict/public/V1 modules;
- W3 cannot use provider-returned URLs as request URLs;
- W3 cannot call parser or EvidenceCorpus builders.

## 12. Proposed Post-Implementation Canary

This package may propose, but does not authorize, one post-implementation canary after Steering Board approval, implementation, focused verifiers, runtime refresh, route preflight, and clean worktree checkpoint.

Proposed canary input:

```text
Using hydrogen for cars is more efficient than using electricity
```

Budget impact:

- consumes 1 of the 6-job tranche;
- no second W3 canary without another reviewed package.

Pass criteria:

- job reaches `SUCCEEDED`;
- first preparation event shows `pipeline: claimboundary-v2`;
- public output remains `4.0.0-cb-precutover` / `blocked_precutover`;
- no hidden markers leak publicly;
- W2 still records completed hidden candidates;
- W3 records locator-materialization success;
- if W3-B fetch is approved, W3 records at least one hidden/admin-only source-material record and bounded fetch diagnostics;
- parser, cache, SR, storage, EvidenceCorpus, EvidenceItems, report, verdict, warning, confidence, public write, ACS/direct URL, and V1 flags remain false.

Stop criteria:

- zero source-material records after an approved W3-B fetch package;
- locator materialization requires raw URL or provider-returned URL use;
- endpoint requires credentials, redirects, proxy behavior, raised byte caps, retries, or provider expansion;
- any raw payload/source/public leak is observed;
- any downstream parser/EvidenceCorpus/report/verdict behavior appears.

## 13. Review Questions

1. Is safe locator materialization mandatory before Source Material? Lead Developer recommendation: yes.
2. Should W3 be split into W3-A materialization and W3-B fetch? Lead Developer recommendation: yes.
3. Should Source Material use Wikimedia Core pages or project-local REST pages for the first fetch endpoint?
4. Is one provider family sufficient for first Source Material, or should a second provider be required before fetch?
5. Are hidden/admin-only source-material records allowed to contain bounded source body text, or should W3 first record diagnostics only?
6. Are the no-storage/no-cache/no-SR constraints compatible with the desired live inspection workflow?
7. Is one post-implementation canary enough for W3?
8. Should boundary-guard/gate-register debt be trimmed before W3 implementation?

## 14. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W3_Source_Material_Steering_Review_Package.md` as the proposed FactHarbor V2 Source Material direction after W2/PIV1-A.

Return `approve`, `modify`, or `reject`.

Check whether:

- W3 correctly requires safe locator materialization before source-material fetch;
- the accepted W2 inputs are precise enough and do not rely on public/admin artifacts as execution input;
- the proposed source-material record contract is hidden/admin-only and bounded;
- raw payload, URL, title/snippet/page-key, header, error, secret, parser, EvidenceCorpus, evidence, report/verdict/warning/confidence, cache/SR/storage, public, ACS/direct URL, and V1 paths remain closed;
- endpoint strategy should use Wikimedia Core pages, project-local REST pages, or a different provider decision;
- W3 should be split into W3-A and W3-B;
- one post-implementation canary is appropriate and correctly counted against the 6-job tranche;
- any decision should escalate to Captain before a source package is drafted.
