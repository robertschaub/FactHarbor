# V2 Slice 7N-3B1 Candidate Acquisition Runtime Source Package

**Date:** 2026-05-16
**Status:** reviewed/approved source approval package; implementation not started by this document
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `d5e66124` (`docs: record v2 source io preflight status`)
**Parent gate:** `Docs/WIP/2026-05-16_V2_Slice_7N3B_Source_IO_Preflight_Package.md`
**Approval trace:** Captain continuation approval in the current implementation thread on 2026-05-16 after the 7N-3B preflight handoff. Deputy review must approve this exact source package before code edits.

## 1. Purpose

Define the first post-7N-3B source implementation slice.

7N-3B1 may implement a hidden runtime-only **candidate acquisition shell** that consumes the existing 7M-1 query-plan-to-source-acquisition handoff, the 7C source-acquisition request, and a package-scoped 7N-3B1 candidate-runtime authority. That authority must be non-serializable, created by the runtime owner, and derived from a valid 7N-3A authority snapshot as provenance only.

The existing 7N-3A contract-only authority must never authorize provider-boundary execution by itself. 7N-3B1 may call only an injected candidate-provider boundary supplied by tests or a future separately reviewed runtime owner, and only after the 7N-3B1 candidate-runtime authority plus frozen snapshots validate.

7N-3B1 does **not** authorize concrete provider SDK imports, direct `fetch(...)`, provider HTTP callbacks, URL dereference, content packet fetching, parser execution, product/orchestrator/runner/API/UI/report/export wiring, public exposure, live jobs, cache IO, Source Reliability, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup.

The goal is to establish the runtime-owned candidate acquisition contract and verifier before a later 7N-3B2/7N-3B3 concrete provider-network package decides credentials, endpoint construction, HTTP behavior, and live smoke.

## 1.1 Review Result

Deputy review result:

- Source-IO Runtime Architect: `MODIFY`.
- Security/Code Gatekeeper: `MODIFY`.
- Pipeline Quality / LLM Expert / Cost reviewer: `MODIFY`.
- Reconciliation reviewer after modifications: `MODIFY`.

Required modifications were applied:

- 7N-3A authority is now provenance only; 7N-3B1 requires a separate package-scoped candidate-runtime authority.
- Per-query accounting is mandatory so source diversity cannot be silently dropped.
- Provider allowlist and result provider ids must be canonical structural ids and reject unsafe, duplicate, placeholder, secret-looking, URL-like, path-like, or arbitrary-endpoint-looking values.
- Budget snapshots now require version/source/approval/query-accounting provenance.
- Boundary guards must enforce exact imports/exports, no barrel re-export, transitive product/public reachability, no direct network primitives, no V1 helper references, no cache/store, no raw payload/secret leakage, and clean-room/no-clone review.
- Bounded duplication versus 7N-2 is explicitly accepted only for this shell and must be revisited before 7N-3B2.

Consolidated verdict: approved to implement 7N-3B1 exactly under this package. Concrete provider network, content fetch/parser, product/public wiring, live jobs, cache/SR, and V1 cleanup remain blocked.

## 2. Requested Deputy Decision

Requested approval:

> Approved to implement V2 Slice 7N-3B1 under `Docs/WIP/2026-05-16_V2_Slice_7N3B1_Candidate_Acquisition_Runtime_Source_Package.md`, limited to a hidden/runtime-only candidate acquisition shell and candidate envelope under `apps/web/src/lib/analyzer-v2-runtime/`, plus focused tests and boundary guards. The implementation may validate a package-scoped non-serializable 7N-3B1 candidate-runtime authority, frozen provider allowlist snapshot, frozen budget snapshot, no-cache/no-SR/no-public flags, and query-plan/source-request identity; the existing 7N-3A contract-only authority is provenance only and must fail if passed directly as execution authority. It may call only an injected candidate-provider boundary that returns hidden opaque candidate records. It must not add concrete provider SDK imports, direct fetch, provider HTTP callbacks, content dereference, parser execution, product/public wiring, live jobs, cache IO, Source Reliability, semantic relevance/source-quality logic, prompt/config/model/schema edits, ACS/direct URL execution, V1 analyzer/prompt/type/helper reuse, or V1 cleanup.

If reviewers do not approve this exact boundary, do not implement 7N-3B1.

## 3. Why This Split

7N-3B identified concrete provider/search/fetch/network behavior as a high-risk gate. Implementing provider HTTP, credentials, SSRF controls, content sniffing, parser sandboxing, hidden inspection, and live smoke in one slice would make review too broad.

This package splits the work:

1. **7N-3B1:** hidden runtime candidate acquisition shell; injected provider boundary only; no concrete network.
2. **7N-3B2:** concrete candidate-provider factory/network implementation, if separately approved.
3. **7N-3B3:** content packet fetch/parser boundary, if separately approved.
4. **7N-3C:** hidden live smoke after committed source, runtime refresh, no-public-leak verifier, rollback, and Captain-approved canaries.

This is progress toward real source acquisition without allowing accidental public or product source IO.

## 4. Allowed Production Files

New files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.ts`

Existing files:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - update exact runtime owner allowlists;
  - keep product/public reachability guards;
  - add direct-fetch/provider-SDK/V1/SR/cache/import guards for the new files.

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts`

No other production or test files are approved unless deputy review explicitly adds them.

## 4.1 Exact Production Export And Import Allowlist

`source-acquisition-candidate-envelope.ts` may export only:

- `SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION`;
- `SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH`;
- `SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT`;
- `type SourceAcquisitionCandidateRuntimeApproval`;
- `type SourceAcquisitionCandidateProviderId`;
- `type SourceAcquisitionCandidateProviderEndpointKind`;
- `type SourceAcquisitionCandidateProviderAllowlistSnapshot`;
- `type SourceAcquisitionCandidateBudgetSnapshot`;
- `type SourceAcquisitionCandidateRunRequest`;
- `type SourceAcquisitionCandidateProviderBoundary`;
- `type SourceAcquisitionCandidateProviderAttemptRequest`;
- `type SourceAcquisitionCandidateProviderAttemptResult`;
- `type SourceAcquisitionHiddenCandidateRecord`;
- `type SourceAcquisitionCandidateQueryOutcome`;
- `type SourceAcquisitionCandidateRuntimeDecision`;
- `type SourceAcquisitionCandidateRuntimeStopReason`;
- `type SourceAcquisitionCandidateValidationResult`;
- `validateSourceAcquisitionCandidateProviderAllowlistSnapshot`;
- `validateSourceAcquisitionCandidateBudgetSnapshot`;
- `validateSourceAcquisitionCandidateProviderAttemptResult`;
- `sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage`.

`source-acquisition-candidate-envelope.ts` may have no production imports.

`source-acquisition-candidate-runtime.ts` may export only:

- `SOURCE_ACQUISITION_CANDIDATE_RUNTIME_AUTHORITY_VERSION`;
- `type SourceAcquisitionCandidateRuntimeAuthoritySnapshot`;
- `type SourceAcquisitionCandidateRuntimeAuthority`;
- `createSourceAcquisitionCandidateRuntimeAuthority`;
- `isSourceAcquisitionCandidateRuntimeAuthority`;
- `readSourceAcquisitionCandidateRuntimeAuthoritySnapshot`;
- `executeSourceAcquisitionCandidateRuntime`.

`source-acquisition-candidate-runtime.ts` may import only these production specifiers:

- from `@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority`: `isSourceAcquisitionRuntimeAuthority`, `readSourceAcquisitionRuntimeAuthoritySnapshot`, `type SourceAcquisitionRuntimeAuthority`, `type SourceAcquisitionRuntimeAuthoritySnapshot`;
- from `@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff`: `QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION`, `type QueryPlanSourceAcquisitionHandoff`, `type QueryPlanSourceAcquisitionHandoffDecision`, `type QueryPlanSourceAcquisitionHandoffQueryEntry`;
- from `@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types`: `SOURCE_ACQUISITION_REQUEST_VERSION`, `type SourceAcquisitionRequest`, `type SourceAcquisitionStartDecision`;
- from `./source-acquisition-candidate-envelope`: only the exports listed above that are needed by the runtime.

No barrel export may re-export the two new runtime files in 7N-3B1.

## 5. Forbidden Files And Surfaces

7N-3B1 must not edit:

- `apps/web/src/lib/internal-runner-queue.ts`;
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`;
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/**`, except type-only imports from existing contracts if needed;
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/**`;
- public app/API/UI/report/export/compatibility files;
- `apps/web/src/lib/web-search.ts`;
- `apps/web/src/lib/search-provider-utils.ts`;
- `apps/web/src/lib/search-*.ts`;
- `apps/web/src/lib/retrieval.ts`;
- `apps/web/src/lib/analyzer/**`;
- `apps/web/prompts/**`;
- `apps/web/configs/**`;
- Source Reliability files;
- API project files.

If implementation needs any forbidden file, stop and return to deputy review.

## 6. Required Candidate Envelope

`source-acquisition-candidate-envelope.ts` should define and validate only hidden structural candidate acquisition data.

Allowed contract concepts:

- `SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION`;
- `SourceAcquisitionCandidateProviderAllowlistSnapshot`;
- `SourceAcquisitionCandidateBudgetSnapshot`;
- `SourceAcquisitionCandidateRunRequest`;
- `SourceAcquisitionCandidateProviderAttemptRequest`;
- `SourceAcquisitionCandidateProviderAttemptResult`;
- `SourceAcquisitionCandidateRuntimeAuthority`;
- `SourceAcquisitionHiddenCandidateRecord`;
- `SourceAcquisitionCandidateQueryOutcome`;
- `SourceAcquisitionCandidateRuntimeDecision`;
- structural stop/reason types.

Provider allowlist snapshot must include:

- snapshot version;
- approval pointer for this package;
- config snapshot hash;
- allowed provider ids as structural ids only;
- provider endpoint kind, not arbitrary URL;
- per-provider query cap;
- per-provider timeout cap;
- credentials state without secret values;
- disabled provider reasons as structural-only diagnostics;
- no-cache/no-storage flag;
- no-Source-Reliability flag;
- no-product/no-public flag.

An empty allowlist must block structurally before provider-boundary calls. Returned provider ids must be present in the frozen allowlist snapshot. The runtime must not fall back to V1 search helpers, legacy search auto mode, broad provider discovery, or unapproved providers.

Provider ids in both the allowlist and provider results must be canonical structural ids only. A valid provider id is non-empty, trimmed, unique inside the snapshot, and limited to stable lowercase ASCII letters, digits, and underscores. Provider ids must reject URL-like strings, schemes, hostnames, path separators, `?`, `#`, whitespace or control characters, credential/secret-looking material, arbitrary endpoint values, duplicate ids, and placeholder values such as `placeholder`, `todo`, or `unknown`.

Budget snapshot must include:

- snapshot version;
- source `v2_7n3b1_candidate_runtime`;
- approval pointer for this package;
- handoff identity hash or frozen handoff identity snapshot;
- source-acquisition request identity hash;
- query entry count;
- per-query attempt limit;
- candidate cap per query;
- provider timeout;
- total candidate acquisition timeout;
- cancellation state;
- retry policy;
- partial-execution semantics.

The runtime decision must contain exactly one structural query outcome for every upstream handoff query entry. Allowed per-query outcome states are `attempted`, `blocked`, `failed`, `timed_out`, `cancelled`, and `skipped_with_structural_reason`. A completed/success decision is invalid if any handoff query id is missing, duplicated, or extra. Cost controls must not silently drop query diversity.

Candidate records may include only:

- opaque candidate id;
- query id;
- retrieval policy key as opaque upstream key;
- provider id as allowed structural id;
- provider attempt id;
- provider rank as structural ordering only;
- hidden locator id that is not a URL and not dereferenceable by Analyzer V2 core;
- optional hidden title/snippet/domain/language metadata only if explicitly tagged `not_semantic_evidence`;
- candidate structural status;
- sanitized provider telemetry.

Candidate records must not contain raw provider payloads, secrets, raw URLs, dereferenceable locators, public source names, source quality labels, Source Reliability scores, evidence items, applicability, probative value, evidence scarcity, sufficiency, warnings, verdicts, confidence, report prose, or cache keys.

## 7. Required Candidate Runtime Behavior

`source-acquisition-candidate-runtime.ts` should export a single runtime execution function such as `executeSourceAcquisitionCandidateRuntime(...)`.

Required behavior:

- fail closed before any provider-boundary call when source-IO runtime authority is missing, stale, copied, JSON-round-tripped, plain-object, controlled-harness-only, or malformed;
- fail closed before any provider-boundary call when only the existing 7N-3A contract-only authority is supplied;
- require a package-scoped 7N-3B1 candidate-runtime authority using module-private WeakSet or private-brand membership;
- use the 7N-3A authority snapshot only as immutable provenance for creating the 7N-3B1 authority;
- preserve the existing 7N-3A authority contract and do not mutate approval metadata;
- fail closed when provider allowlist snapshot is missing, stale, source-unapproved, not frozen, or allows cache/SR/product/public exposure;
- fail closed when provider allowlist is empty, when a provider is disabled, or when a provider result references a provider id outside the frozen allowlist;
- fail closed when budget snapshot is missing, malformed, stale, not tied to the current 7M-1 handoff and 7C request, below query count, cancelled, or has unapproved retry behavior;
- fail closed when 7M-1 handoff or 7C source-acquisition request is blocked, malformed, not hidden/internal, not ready, or identity-mismatched;
- call the injected candidate-provider boundary at most once per query entry unless a future package approves retry;
- return exactly one structural query outcome per upstream query entry and reject missing, duplicate, or extra query ids;
- pass query text, retrieval policy key, target AtomicClaim IDs, and source-language policy through unchanged as upstream provenance;
- validate provider results before returning them;
- reject provider results that contain non-opaque candidate ids, raw URLs, dereferenceable locators, raw snippets without hidden/non-semantic marking, raw provider payload, public fields, cache keys, SR fields, semantic evidence fields, or over-budget counts;
- record all provider failures, timeout, cancellation, partial execution, and over-cap results as structural runtime states only;
- never create `EvidenceCorpus`, source records, evidence items, content packets, applicability decisions, source-quality decisions, warnings, verdicts, confidence, report fields, or public prose.

The runtime may compare exact ids, hashes, counts, and static enum-like structural status fields. It must not parse or interpret query text, retrieval-policy wording, title/snippet/domain/language metadata, source names, or content meaning.

## 8. Provider Boundary

7N-3B1 may define an injected candidate-provider boundary type. It must remain a callback supplied by tests or a future separately reviewed runtime owner.

The implementation must not create:

- provider SDK clients;
- direct `fetch(...)` calls;
- provider HTTP request builders;
- credential readers;
- arbitrary endpoint URL builders;
- parser/fetch/content-packet workers;
- product-injected provider factories.

Avoiding SDK imports is not sufficient if the implementation still constructs concrete network behavior. Any concrete provider factory or HTTP callback belongs to a later package.

## 9. Runtime Authority Preservation

7N-3B1 must preserve the 7N-3A authority model while adding a separate package-scoped candidate authority:

- only module-private membership can authorize runtime execution;
- copied objects and JSON round-trips fail validation;
- `SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY` is not a runtime source-IO authority;
- no request field, handoff field, serializable marker, or test fixture can authorize runtime source IO;
- authority snapshots must record public/cache/SR/product/live/ACS/direct-URL capabilities as disabled unless a later package explicitly changes a single capability.

7N-3B1 must create a candidate-specific authority capability inside `source-acquisition-candidate-runtime.ts` or another file explicitly approved by deputy review. It must use the same WeakSet/private-brand pattern, must be created only from a valid 7N-3A authority snapshot plus this package's approval/snapshot data, and must explicitly remain not product-wired, not public, no-cache, no-SR, no-live-jobs, no-ACS, and no-direct-URL. The existing 7N-3A contract-only authority must not be silently reinterpreted as full source-IO approval.

## 9.1 Duplication Boundary Versus 7N-2

7N-3B1 must not call or broaden the 7N-2 controlled-harness structural executor.

Bounded duplication of handoff/source-request/budget validation is acceptable inside this two-file runtime shell only if it is needed to keep the 7N-3B1 authority boundary independent and reviewable. The implementation should keep duplicated validators small, structural, and test-covered. Before 7N-3B2 concrete provider-network implementation, reviewers must either reconcile duplicated structural validators into a V2-owned shared helper or explicitly accept continued duplication with a maintenance reason.

## 10. Semantic Boundary

Candidate acquisition remains structural IO preparation only.

7N-3B1 must not decide or emit:

- relevance;
- applicability;
- evidence extraction;
- claim direction;
- probative value;
- source credibility meaning;
- Source Reliability score;
- evidence scarcity;
- sufficiency;
- warning materiality;
- verdict;
- confidence;
- report narrative or public prose.

Provider rank, title, snippet, domain, URL shape, language metadata, and content length must not become source-quality, relevance, warning, or verdict signals. They may be retained only as hidden raw provenance with `not_semantic_evidence` tagging and only inside the approved hidden candidate envelope.

## 11. Multilingual Boundary

7N-3B1 must preserve upstream source-language policy as provenance only.

It must not:

- default to English unless the upstream query plan explicitly says so;
- translate query text;
- infer language from query text, URL, provider metadata, domain, or snippet;
- repair missing language states;
- create supplementary language lanes;
- route providers based on hardcoded language keywords.

Provider locale parameters remain deferred to the concrete provider-network package. If a provider boundary receives source-language policy in 7N-3B1 tests, it receives the upstream object unchanged.

## 12. Cache, Storage, Source Reliability, And Public Surface

7N-3B1 must keep:

- cache read: forbidden;
- cache write: forbidden;
- durable storage: forbidden;
- Source Reliability import/call/cache/score: forbidden;
- public API/UI/report/export/compatibility exposure: forbidden;
- hidden artifacts: internal-only and non-durable;
- raw provider payloads: forbidden;
- content packets: not created.

Candidate acquisition failures are internal structural diagnostics. They are not user-visible warnings until a later warning-materiality gate evaluates verdict impact.

## 13. Required Tests

Add focused tests proving:

- valid hidden runtime request with test-injected provider returns hidden/internal candidate runtime decision only;
- blocked or malformed 7M-1 handoff creates no provider calls;
- blocked or malformed 7C source-acquisition request creates no provider calls;
- missing/copy/JSON/plain-object/controlled-harness authority creates no provider calls;
- direct use of the existing 7N-3A contract-only authority creates no provider calls;
- only the package-scoped 7N-3B1 candidate-runtime authority can pass execution authority checks;
- stale/plain 7N-3A authority provenance blocks before provider call;
- missing/stale/unsafe/empty provider allowlist creates no provider calls;
- returned provider ids outside the frozen allowlist are rejected;
- empty, duplicated, URL-like, path-like, query/hash-containing, whitespace/control-character-containing, placeholder, secret-looking, or arbitrary-endpoint-looking provider ids are rejected in allowlists and provider results;
- missing/stale/cancelled/overly narrow budget creates no provider calls;
- provider is called at most once per query entry;
- every upstream query entry is represented by exactly one structural query outcome;
- missing, duplicated, or extra query ids in runtime decisions or provider results are rejected;
- provider failure, cancellation, or timeout for one query cannot silently drop later query entries;
- query text, retrieval-policy key, selected AtomicClaim IDs, and source-language policy are passed through unchanged;
- non-English query text behaves structurally the same except unchanged pass-through values;
- returned candidates must use opaque ids and hidden non-dereferenceable locators;
- raw URLs, raw provider payloads, cache keys, SR fields, evidence fields, public fields, warning/verdict/report fields, and semantic labels are rejected;
- over-cap candidate counts, provider timeout, provider failure, and thrown provider exceptions become structural runtime outcomes;
- serialization of the runtime decision contains no raw content, public URL, source name, evidence item, Source Reliability score, warning, verdict, confidence, report prose, cache key, or secret.
- provider results, telemetry, and thrown errors containing sentinel raw URL, source name/domain/title/snippet, raw provider payload, cache key, SR field, stack/cause, and fake secret values are rejected or structurally redacted from returned decisions, `JSON.stringify(...)`, errors, and telemetry;
- runtime error handling does not copy `error.message`, `stack`, `cause`, request objects, response objects, or raw provider objects into returned decisions;
- identical consecutive valid runs call the injected provider each time;
- no module-level candidate cache/store exists except private authority branding;
- no cache key is constructed or serialized.

Update `boundary-guard.test.ts` to prove:

- exact approved runtime source files are the only new source files for this slice;
- exact approved imports and exported symbols for the two new runtime files are enforced;
- the exact export/import allowlist in §4.1 is enforced and no barrel export re-exports the new runtime files;
- public/product surfaces cannot directly or transitively import the candidate runtime owner files;
- transitive graph checks resolve `@/` aliases, relative imports, barrel exports, and literal dynamic imports from public/product/API/UI/report/export/compatibility roots;
- Analyzer V2 core does not import candidate runtime owners except where a later reviewed package allows it;
- new runtime files do not import V1 analyzer/search/retrieval helpers;
- new runtime files do not import provider SDKs, network/parser modules, cache/storage/config IO, Source Reliability, public/product route modules, prompts, model adapters, or test fixtures;
- new runtime files do not reference forbidden V1 helper identifiers or string references from `web-search.ts`, `search-*`, `retrieval.ts`, `research-acquisition-stage.ts`, V1 prompts, V1 analyzer types, or V1 helper names;
- implementation review includes a clean-room/no-clone check against V1 search/retrieval helpers and V1 prompts/types;
- new runtime files contain no `fetch(...)`, `globalThis.fetch`, `Request`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `node:http`, `node:https`, `node:http2`, `node:dns`, `node:net`, `node:tls`, `undici`, or dynamic nonliteral imports;
- no public route/report/export/UI/compatibility file references candidate acquisition hidden artifacts.

## 14. Verification

Minimum verifier after implementation:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7N-3B1.

## 15. Reviewer Prompt

Use this prompt for Senior Developer, Code Reviewer, LLM Expert, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B1_Candidate_Acquisition_Runtime_Source_Package.md` as a V2 source package. Return `approve`, `modify`, or `reject`. Check whether the slice is safe and useful as a hidden runtime-only candidate acquisition shell with injected provider boundary only. Verify it does not authorize concrete provider SDK imports, direct fetch, HTTP callback construction, content dereference, parser execution, product/orchestrator/runner/API/UI/report/export wiring, public exposure, live jobs, cache IO, Source Reliability, prompt/config/model/schema edits, ACS/direct URL execution, semantic relevance/source-quality logic, V1 analyzer/prompt/type/helper reuse, or V1 cleanup. Check whether the exact file envelope, authority preservation, provider allowlist snapshot, budget snapshot, no-public/no-cache/no-SR guards, and tests are sufficient before implementation.

## 16. Stop Conditions

Stop and return to Captain/deputy review if implementation would require:

- concrete provider/search/fetch/parser/network behavior;
- provider SDK imports;
- direct `fetch(...)`;
- provider HTTP callback/factory construction;
- credential reads or endpoint URL construction;
- URL dereference or content packet fetch;
- parser modules or parser execution;
- product/orchestrator/runner/API/UI/report/export/compatibility wiring;
- public exposure;
- live jobs or canaries;
- cache IO, durable storage, or cache key construction;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic source relevance, quality, sufficiency, warning, verdict, or report logic;
- ACS/direct URL execution;
- V1 analyzer/prompt/type/helper reuse;
- V1 cleanup.

## 17. Later Gates Not Approved Here

This package intentionally leaves the following gates blocked:

- concrete candidate-provider factory/network implementation;
- credentials ownership and provider endpoint construction;
- SSRF/DNS/redirect/final-address protections for dereference;
- content-type sniffing and parser sandboxing;
- content packet retention/disposal proof;
- hidden live source smoke;
- product/orchestrator/runner source acquisition wiring;
- public result/report/export exposure;
- cache/SR integration;
- V1 cleanup.
