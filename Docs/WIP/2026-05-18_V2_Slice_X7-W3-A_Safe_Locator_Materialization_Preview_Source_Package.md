# V2 Slice X7-W3-A Safe Locator Materialization Preview Source Package

**Date:** 2026-05-18
**Status:** Steering Board review package only; implementation and live jobs blocked
**Owner:** Lead Developer / Captain Deputy
**Parent steering package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W3_Source_Material_Steering_Review_Package.md`
**Parent commit:** `a2baeb71` (`docs: amend v2 source material tier strategy`)
**Live-job tranche:** 6 jobs available after W2. This package proposes at most one optional post-implementation W3-A canary, counted against that tranche, only after Steering Board approval, implementation, clean verifiers, focused commit, runtime refresh, and clean route preflight.

## 1. Purpose

W3-A is the Tier 0 implementation package proposed by the amended W3 steering direction.

The purpose is narrow: safely materialize locator and preview diagnostics from provider-owned Wikimedia search candidates that are already present during the approved W2 candidate-provider network response handling. W3-A must not make an extra HTTP call and must not create Source Material.

W3-A is a materialization and containment proof, not a source acquisition expansion. It should answer one question:

Can V2 derive bounded, admin-only candidate preview diagnostics and opaque locator references from the provider-owned search candidate without leaking raw provider payloads, raw page keys, URLs, or source-like text into public output or durable state?

## 2. Explicit Non-Goals

W3-A does not authorize:

- an extra HTTP request;
- Source Material records;
- parser execution;
- EvidenceCorpus;
- EvidenceItems;
- report, verdict, warning, confidence, or truth-percentage generation;
- public result changes or public compatibility fields;
- cache IO;
- Source Reliability;
- durable storage;
- retries;
- second provider;
- Tier 1 page-summary fetch;
- Tier 2 full page, page source, or page HTML fetch;
- ACS or direct URL execution;
- prompt, config, model, schema, gateway-policy, or cache-policy changes;
- V1 reuse, V1 work, or V1 cleanup.

## 3. Current Baseline

W2/PIV1-A is closed and produced hidden W2 `candidate_provider_network_completed` with `9` hidden structural candidates and nonzero bytes in job `c4ed36f4ce634860b906c74ea1557cc6`.

Current W2 artifacts remain deliberately sanitized. They expose counts, telemetry, hashes, and opaque references only. They do not expose usable titles, URLs, excerpts, descriptions, page keys, domains, source text, or parsed content.

The current W2 transport path reads the provider candidate array only to count entries. W3-A must therefore introduce a reviewed materialization seam inside the provider-owned response handling path. It must not recover title/key/excerpt/description data from W2 artifacts, public output, logs, or serialized raw provider JSON.

Official review context:

- Wikimedia Core page search is documented as `GET /core/v1/{project}/{language}/search/page` with `q` and optional `limit` as query parameters.
- Wikimedia search result examples include candidate fields such as `id`, `key`, `title`, `excerpt`, and `description`.
- Wikimedia Core API deprecation begins gradually in July 2026, so W3-A must not deepen long-term endpoint dependency beyond the already-approved W2 search response.

References:

- `https://api.wikimedia.org/wiki/API_reference/Core/Search/Search_content`
- `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`

## 4. Recommended Direction

Approve W3-A as a hidden/admin-only diagnostic package with these constraints:

1. Materialize only from provider-owned candidate objects during the already-approved W2 search response handling.
2. Do not return or store raw candidate objects.
3. Produce only bounded `source_candidate_preview` diagnostics and opaque locator refs.
4. Treat the diagnostics as not Source Material.
5. Keep the downstream gate to Source Material closed.
6. Run no live job until after implementation review, focused verifiers, focused commit, runtime refresh, and clean route preflight.

Lead Developer recommendation: approve W3-A with a projection-hook architecture that lets the transport/factory path project bounded preview records while it still has the provider-owned candidate objects, but carries only the bounded projection beyond that point.

## 5. Accepted Inputs

W3-A may accept only process-local state from the current product V2 route execution. It must not accept public result JSON, admin artifact JSON, logs, copied W2 artifacts, or durable files as execution input.

The W2 state must prove:

- `candidateProviderNetwork.status: candidate_provider_network_completed`;
- `publicCutoverStatus: blocked_precutover`;
- `providerId: wikimedia_core`;
- `endpointId: ep_wikimedia_core_page_search`;
- nonzero hidden candidate count;
- bounded query entry count;
- bounded provider attempt count;
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

The candidate object must be the provider-owned search result object from the approved Wikimedia page-search response. Candidate objects copied out of admin artifacts, logs, fixture payloads, public output, or arbitrary caller input must be rejected.

## 6. Materialized Fields

W3-A may produce one bounded preview record per accepted provider candidate, up to the W2 hidden max candidate cap.

Allowed materialized fields:

| Field | Source | Output posture |
|---|---|---|
| `candidatePreviewId` | generated by W3-A owner | opaque id only |
| `sourceCandidateRef` | W2 hidden candidate ordinal/reference | opaque ref only |
| `locatorRef` | generated from accepted page key hash and provider context | opaque ref only |
| `providerId` | W2 provider context | enum/string constant `wikimedia_core` |
| `endpointId` | W2 endpoint context | enum/string constant `ep_wikimedia_core_page_search` |
| `providerAttemptOrdinal` | W2 attempt context | bounded integer |
| `providerRank` | provider candidate index | bounded integer |
| `candidateOrdinal` | W3-A accepted preview ordinal | bounded integer |
| `pageKeyHash` | candidate `key` | SHA-256 only; raw key forbidden |
| `pageIdHash` | candidate `id`, if structurally accepted | SHA-256 only; raw id optional but not required |
| `titlePreviewText` | candidate `title`, if accepted | bounded sanitized admin-only preview |
| `excerptPreviewText` | candidate `excerpt`, if accepted | bounded sanitized admin-only preview |
| `descriptionPreviewText` | candidate `description`, if accepted | bounded sanitized admin-only preview |
| `fieldStates` | materializer | enum status per field |
| `fieldHashes` | accepted field values | SHA-256 hashes for accepted values |
| `fieldByteLengths` | accepted/truncated values | bounded integer counts |
| `fieldCharLengths` | accepted/truncated values | bounded integer counts |
| `truncation` | materializer | enum/boolean per field |
| `markupStripped` | excerpt sanitization | boolean |
| `materializationStatus` | materializer | enum |
| `stopReason` | materializer | enum or null |

Forbidden materialized fields:

- raw page key;
- raw request URL;
- provider-returned URL;
- `html_url`;
- thumbnail URL;
- content URL;
- canonical URL;
- raw provider candidate object;
- raw provider JSON;
- response headers;
- request headers;
- cookies;
- secrets;
- raw exception text or stack trace;
- source body;
- full page text;
- HTML;
- parsed text;
- evidence/report/verdict/confidence fields.

## 7. Structural Validation Rules

W3-A validation must be structural only. It must not interpret the semantic meaning or relevance of title, excerpt, description, or query text.

Candidate object validation:

- candidate must be a plain record;
- provider id must be `wikimedia_core`;
- endpoint id must be `ep_wikimedia_core_page_search`;
- candidate must be observed during the current W2 transport/factory execution;
- candidate must not be supplied by public/admin artifact input;
- candidate must not contain carried-forward source material, evidence, report, verdict, warning, confidence, cache, Source Reliability, parser, or public-output fields;
- candidate must not be serialized into logs or artifacts as raw object.

Page key validation:

- `key` is required to create a locator;
- `key` must be a nonblank string;
- UTF-8 byte length must be `1..256`;
- no leading or trailing whitespace;
- no control characters;
- no URI scheme pattern;
- no slash, backslash, query marker, fragment marker, or path traversal segment;
- no credential marker such as `@`;
- no secret-like field name or token marker;
- no placeholder values such as `placeholder`, `todo`, `unknown`, or `not_collected`;
- value is never emitted raw.

Preview text validation:

- `title`, `excerpt`, and `description` are optional;
- each accepted value must be a string after structural coercion;
- control characters must be rejected or stripped according to a single documented sanitizer;
- provider search-highlight markup in excerpts must be stripped before display;
- no HTML tags may remain in preview text;
- no URI-scheme or credential-like substring may remain in preview text;
- safe truncation is allowed only at bounded character boundaries;
- accepted preview text remains hidden/admin-only;
- if safe sanitization cannot be proven, the field state must be `rejected_structural`.

Allowed field states:

- `accepted_bounded`;
- `missing`;
- `rejected_structural`;
- `truncated_bounded`;
- `not_materialized_by_policy`.

Allowed materialization statuses:

- `source_candidate_preview_materialized`;
- `source_candidate_preview_partial`;
- `blocked_invalid_locator`;
- `blocked_provider_mismatch`;
- `blocked_public_or_artifact_input`;
- `blocked_pre_source_candidate_preview`;
- `source_candidate_preview_damaged_structural`.

## 8. Projection-Hook Architecture

W3-A should not make the runtime transport return raw provider candidates to broader pipeline code.

Recommended architecture:

1. Add a narrow candidate projection hook to the existing W2 transport/factory execution path.
2. Invoke the hook immediately after the approved response candidate array has been located and structurally bounded.
3. Pass each provider-owned candidate object to the W3-A materializer inside the same call stack.
4. Return only bounded `SourceCandidatePreviewProjection` records from the hook.
5. Drop raw candidate objects before the transport/factory outcome crosses module boundaries.
6. Persist only bounded W3-A artifacts, never raw candidates.

This architecture is intentionally narrower than adding `candidateObjects` to the transport outcome. If reviewers prefer raw in-memory candidate arrays, the package must be amended before implementation because that would increase leakage risk.

## 9. Artifact Shape

W3-A may create a hidden/admin-only artifact separate from W2 artifacts.

Artifact version:

```text
v2.evidence-lifecycle.source-candidate-preview-artifact.x7w3a
```

Top-level artifact fields:

- `version`;
- `ledgerId`;
- `runId`;
- `createdUtc`;
- `visibility: internal_admin_only`;
- `publicPointerExposure: forbidden`;
- `source: product_v2_orchestrator_after_source_candidate_preview_materialization`;
- `parentSlice: X7-W3-A`;
- `parentW2Status`;
- `providerId`;
- `endpointId`;
- `previewStatus`;
- `previewRecordCount`;
- `rejectedCandidateCount`;
- `truncatedFieldCount`;
- `artifactSerializationBytes`;
- `bounds`;
- `previewRecords`;
- `productExecution`;
- `rawLeakGuards`.

Preview record fields:

- `recordVersion`;
- `candidatePreviewId`;
- `sourceCandidateRef`;
- `locatorRef`;
- `providerId`;
- `endpointId`;
- `providerAttemptOrdinal`;
- `providerRank`;
- `candidateOrdinal`;
- `materializationStatus`;
- `stopReason`;
- `pageKeyHash`;
- `pageIdHash`;
- `titlePreviewText`;
- `excerptPreviewText`;
- `descriptionPreviewText`;
- `fieldStates`;
- `fieldHashes`;
- `fieldByteLengths`;
- `fieldCharLengths`;
- `truncation`;
- `markupStripped`;
- `sourceMaterialRecordCreated: false`;
- `contentDereferenceCalled: false`;
- `parserExecuted: false`;
- `evidenceCorpusCreated: false`;
- `evidenceItemGenerated: false`;
- `warningGenerated: false`;
- `reportGenerated: false`;
- `verdictGenerated: false`;
- `confidenceGenerated: false`;
- `publicSurfaceWritten: false`;
- `cacheRead: false`;
- `cacheWrite: false`;
- `storageWrite: false`;
- `sourceReliabilityCalled: false`.

Product execution fields:

- `w2CandidateProviderNetworkObserved: true`;
- `w3aMaterializationInvoked: true`;
- `extraHttpCall: false`;
- `sourceMaterialCreated: false`;
- `downstreamGate: source_candidate_preview_to_source_material_gate_closed`;
- all downstream flags false.

Raw leak guard fields:

- `rawProviderObjectIncluded: false`;
- `rawProviderJsonIncluded: false`;
- `rawPageKeyIncluded: false`;
- `rawUrlIncluded: false`;
- `headersIncluded: false`;
- `secretIncluded: false`;
- `errorTraceIncluded: false`;
- `publicPayloadIncluded: false`.

## 10. Bounds And Redaction Posture

Recommended bounds:

- max preview records per run: `9`;
- max records per in-memory ledger: `4`;
- max ledger count: `256`;
- max serialized artifact bytes: `24576`;
- max aggregate preview-text bytes: `8192`;
- max page-key input bytes: `256`, raw output forbidden;
- max title preview: `160` chars and `320` UTF-8 bytes;
- max description preview: `280` chars and `560` UTF-8 bytes;
- max excerpt preview: `512` chars and `1024` UTF-8 bytes;
- max raw materializer error detail: none, enum only.

Hash posture:

- hash accepted raw field values before truncation where the value is structurally safe to hash;
- hash normalized bounded preview text after sanitization for display correlation;
- hash algorithm: SHA-256;
- hashes are internal diagnostics only and must not be used as public locators;
- raw page keys remain forbidden in artifacts and public output.

Text preview posture:

- preview text is admin-only, bounded, sanitized, non-durable, and not Source Material;
- title/excerpt/description previews are allowed only to support W3-A human inspection;
- excerpt markup must be stripped before display;
- if a preview contains a URL-like or credential-like substring after sanitization, reject that field rather than emit it;
- preview text must not be promoted to EvidenceCorpus, EvidenceItems, report, verdict, warning, or confidence.

## 11. Proposed Implementation Envelope

No implementation is approved by this package. If approved, W3-A should stay inside this envelope.

Allowed production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-candidate-preview-artifacts/route.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-candidate-preview-artifacts/route.test.ts`
- focused amendments to existing W2 transport/factory/provider-network/orchestrator tests;
- focused amendments to `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`.

Allowed docs:

- this source package;
- status/backlog addenda;
- completion handoff;
- Agent_Outputs;
- generated handoff index.

Forbidden files:

- public API/UI/report/export/compatibility files;
- V1 analyzer/prompt/type/helper files;
- prompt files;
- UCM/default config files;
- model/cache/source-reliability policy files;
- package files;
- parser/OCI execution files;
- API persistence/database files;
- runner queue unless a separate reviewed package proves it is required.

## 12. Boundary Guards

W3-A implementation should add or extend guards proving:

- public files do not import W3-A owner, materializer, artifact sink, or route internals;
- W3-A owner does not import parser, cache, Source Reliability, storage, report, verdict, public, ACS/direct URL, or V1 modules;
- only the W3-A materializer may inspect candidate field names `id`, `key`, `title`, `excerpt`, or `description`;
- W3-A cannot import `http`, `https`, `undici`, provider SDKs, or fetch-capable modules;
- W3-A cannot use provider-returned URLs as request URLs;
- W3-A cannot create Source Material records;
- W3-A cannot call parser or EvidenceCorpus builders;
- W3-A cannot emit warnings, reports, verdicts, or confidence fields;
- W3-A cannot write cache/SR/storage;
- W3-A artifact routes require admin auth and no-store responses;
- W3-A cannot serialize raw provider candidate objects into artifacts.

## 13. Test Expectations

Focused tests must cover:

- W2 completed state admitted;
- W2 blocked/damaged/stale state rejected;
- public result JSON rejected as execution input;
- admin W2 artifact JSON rejected as execution input;
- provider mismatch rejected;
- endpoint mismatch rejected;
- safe page key creates only a hash and locator ref;
- raw page key never appears in artifact JSON;
- provider URL fields are ignored or rejected and never emitted;
- title preview bounded and sanitized;
- excerpt preview strips search-highlight markup and remains bounded;
- description preview bounded and sanitized;
- URL-like or credential-like preview strings rejected;
- placeholder values rejected;
- overlong field values rejected or safely truncated according to policy;
- aggregate artifact cap enforced;
- projection hook returns bounded projections only, not raw candidate objects;
- no extra HTTP call is made;
- zero Source Material records created;
- downstream gate remains `source_candidate_preview_to_source_material_gate_closed`;
- parser/cache/SR/storage/evidence/report/verdict/warning/confidence/public flags remain false;
- admin route requires admin key, returns no-store, and sanitizes not-found/error responses;
- artifact sink rejects poison markers for raw query, raw provider JSON, raw page key, URL, headers, secret, stack, source text, evidence text, report text, verdict, and confidence.

## 14. Required Verifier Set For Later Implementation

Before any W3-A canary, the later implementation must run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-candidate-preview-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
git status --short --untracked-files=all
```

Do not run expensive tests and do not run live jobs as part of implementation verification.

## 15. Optional Post-Implementation Canary

This package proposes one optional canary only after review, implementation, verifiers, focused commit, runtime refresh, route preflight, and clean worktree checkpoint.

Proposed input:

```text
Using hydrogen for cars is more efficient than using electricity
```

Budget impact:

- consumes 1 of the 6-job tranche;
- no second W3-A canary without another reviewed package.

Pass criteria:

- job reaches `SUCCEEDED`;
- first preparation event shows `pipeline: claimboundary-v2`;
- public output remains `4.0.0-cb-precutover` / `blocked_precutover`;
- no hidden markers leak publicly;
- W2 still records `candidate_provider_network_completed`;
- W3-A records `source_candidate_preview_materialized` or `source_candidate_preview_partial` with nonzero preview records;
- W3-A creates zero Source Material records;
- `extraHttpCall: false`;
- `sourceMaterialCreated: false`;
- parser/cache/SR/storage/EvidenceCorpus/EvidenceItems/report/verdict/warning/confidence/public/ACS/direct URL/V1 flags remain false.

Stop criteria:

- W3-A produces zero preview records from a W2 completed run;
- W3-A consumes title/key/excerpt/description from W2 artifacts, logs, or public output rather than provider-owned candidates;
- W3-A creates Source Material records;
- any extra HTTP call appears;
- any raw page key, URL, provider JSON, headers, secret, source text, evidence text, report text, verdict, or confidence leaks into hidden artifacts or public output;
- any parser/cache/SR/storage/public downstream flag becomes true.

## 16. Steering Board Review Questions

1. Is the projection-hook architecture the right containment shape, or should W3-A use another mechanism to avoid raw candidate propagation?
2. Are bounded admin-only `title`, `excerpt`, and `description` previews acceptable, or should W3-A emit hashes and field states only?
3. Is raw page-key output fully forbidden, with only hash/ref output allowed?
4. Are the proposed caps strict enough for hidden preview diagnostics?
5. Should W3-A be allowed to touch `source-acquisition-network-transport.ts` and `source-acquisition-network-factory.ts`, or should projection be implemented higher in the provider-network owner?
6. Is one canary enough after implementation?
7. Should W3-B page-summary fetch remain blocked until W3-A has positive canary evidence?

## 17. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W3-A_Safe_Locator_Materialization_Preview_Source_Package.md` as the proposed W3-A / Tier 0 implementation package for FactHarbor V2.

Return `approve`, `modify`, or `reject`.

Check whether:

- W3-A stays limited to provider-owned Wikimedia search candidates already present during W2 response handling;
- W3-A makes no extra HTTP call;
- W3-A creates no Source Material record;
- exact materialized fields are bounded and hidden/admin-only;
- raw page keys, URLs, provider JSON, headers, secrets, source text, evidence text, report/verdict/warning/confidence, and public fields remain forbidden;
- the projection-hook architecture adequately prevents raw provider candidate propagation;
- validation rules are structural and do not introduce semantic text-analysis heuristics;
- artifact shape and caps are strict enough;
- boundary guards and tests are sufficient;
- the optional one-job canary is appropriate and correctly counted against the 6-job tranche;
- implementation should wait for Steering Board acceptance.
