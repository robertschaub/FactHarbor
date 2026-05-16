# V2 Slice 7N-3B2 Candidate Provider Network Source Package

**Date:** 2026-05-16
**Status:** draft for deputy review; `modify` returned; implementation blocked until approved
**Owner role:** Lead Architect / Captain deputy
**Prerequisite:** `Docs/WIP/2026-05-16_V2_Slice_7N3B1_Post_Implementation_Consolidation.md`
**Baseline:** `3d8573ea` plus 7N-3B1 hardening commit `3d05583e`

## 1. Purpose

Define the next candidate source-acquisition package after 7N-3B1.

7N-3B2 is intended to add one narrow capability only:

- fixed, allowlisted candidate-provider network calls;
- hidden candidate records returned to the existing 7N-3B1 candidate runtime shell;
- no arbitrary URL dereference;
- no content packet fetching;
- no parser execution;
- no product/orchestrator/runner/API/UI/report/export wiring;
- no live jobs.

This document is a source package draft. It is not implementation approval until deputy review explicitly approves it.

## 2. Non-Negotiable Scope

Allowed only if approved by review:

- a V2-owned candidate-provider factory and transport boundary;
- fixed endpoint allowlist snapshots;
- runtime provider calls through the existing 7N-3B1 injected boundary contract;
- hidden candidate records with opaque candidate ids and hidden non-dereferenceable locators;
- structural provider telemetry with raw payloads, secrets, stack traces, and public pointers redacted.

Still forbidden:

- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- live jobs or Captain canaries;
- arbitrary user-provided URL fetching;
- content dereference beyond candidate-provider API responses;
- HTML/PDF/article parser execution;
- cache read/write/key construction;
- Source Reliability import/call/score;
- evidence item, source record, warning, verdict, confidence, or report generation;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, or helper reuse;
- V1 cleanup.

## 2.1 Review Result

Deputy review result:

- Architecture/source-IO reviewer: `MODIFY`.
- Security/code reviewer: `MODIFY`.

Required modifications recorded here:

- exact implementation file envelope is mandatory before code;
- provider SDK use is rejected for 7N-3B2;
- transport must be Node-runtime-only and SDK-free;
- endpoint allowlist snapshot schema must be structural and raw-URL-free;
- 7N-3B2 needs a concrete default-closed provider-network authority;
- redirects are denied for this slice, not revalidated;
- exact pre-code test names and leakage assertions are required.

This package remains unapproved for implementation until a subsequent review returns `approve`.

## 2.2 Exact File Envelope

No source edits are allowed outside this envelope unless deputy review amends this list before implementation.

Allowed new production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-authority.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`

Allowed existing production files:

- none.

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Forbidden edits:

- product/orchestrator/runner/API/UI/report/export files;
- cache or Source Reliability files;
- V1 analyzer files under `apps/web/src/lib/analyzer/`;
- prompt files;
- config defaults or config schemas;
- database, API, or UI public surfaces.

Required boundary-guard updates:

- exact export list for every new 7N-3B2 production file;
- exact import allowlist for every new 7N-3B2 production file;
- no barrel re-export of 7N-3B2 runtime files;
- no product/public transitive reachability;
- no V1 analyzer/prompt/type/helper imports;
- no cache/SR imports;
- no provider SDK, `fetch`, `undici`, axios, got, ky, node-fetch, proxy-agent, browser/network abstraction imports;
- Node-core network imports allowed only in `source-acquisition-network-transport.ts`.

## 2.3 Exact Export Intent

The implementation package must define exact exported names before code. Minimum expected export groups:

`source-acquisition-network-authority.ts`:

- `SOURCE_ACQUISITION_NETWORK_AUTHORITY_VERSION`;
- `type SourceAcquisitionNetworkAuthoritySnapshot`;
- `type SourceAcquisitionNetworkAuthority`;
- `createSourceAcquisitionNetworkAuthority`;
- `isSourceAcquisitionNetworkAuthority`;
- `readSourceAcquisitionNetworkAuthoritySnapshot`.

`source-acquisition-network-envelope.ts`:

- endpoint allowlist snapshot types and validators;
- network budget snapshot types and validators;
- structural request/response envelope types;
- hidden network diagnostic types;
- no raw URL or raw payload fields.

`source-acquisition-network-transport.ts`:

- Node-core HTTPS transport types;
- one factory or function for executing a single approved endpoint request;
- structural transport outcome types.

`source-acquisition-network-factory.ts`:

- provider-boundary factory that returns the existing 7N-3B1 `SourceAcquisitionCandidateProviderBoundary`;
- no product/runtime/orchestrator wiring.

## 3. Package Split

Do not combine these gates:

1. **7N-3B2:** candidate-provider network calls only.
2. **7N-3B3:** content packet fetch and parser boundary, if separately approved.
3. **7N-3C:** hidden live smoke after committed source, runtime refresh, no-public-leak verifier, rollback, and Captain-approved canaries.

If reviewers believe candidate-provider network and content dereference cannot be safely separated, stop and request a new architecture debate before implementation.

## 4. Required Security Controls

7N-3B2 must prove the following before implementation approval.

### Endpoint And SSRF

- endpoints are fixed in an approved provider allowlist snapshot;
- no arbitrary endpoint URL string is accepted from user input, provider output, query text, or runtime request;
- no `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, process env proxy behavior, or hidden SDK proxy behavior can bypass the allowlist;
- DNS and final connected address are validated at connection time, not only before request creation;
- IPv4, IPv6, IPv4-mapped IPv6, localhost, private, link-local, multicast, loopback, and reserved ranges are blocked;
- metadata service addresses, including `169.254.169.254`, IPv6 link-local equivalents, and cloud metadata host aliases, are explicitly blocked;
- IDNA/punycode host normalization is explicit and test-covered;
- redirects are denied for 7N-3B2;
- the final connected host/address/protocol/port are captured as internal structural diagnostics only.

Do not reuse V1 `retrieval.ts` or V1 network helpers. Backlog still records DNS TOCTOU as a residual V1 retrieval risk; V2 must not inherit it.

### Transport Shape

7N-3B2 must be SDK-free.

Forbidden transport dependencies:

- provider SDKs;
- `fetch`;
- `globalThis.fetch`;
- `undici`;
- axios;
- got;
- ky;
- node-fetch;
- proxy-agent packages;
- browser network APIs.

Allowed transport implementation:

- Node runtime only;
- dedicated Node-core HTTPS transport in `source-acquisition-network-transport.ts`;
- explicit DNS lookup owned by the transport;
- explicit IDNA normalization before lookup;
- explicit proxy bypass, ignoring uppercase and lowercase proxy env vars;
- redirect denial;
- socket final-address validation against the validated DNS answer and blocked ranges;
- streaming response read with byte caps;
- controlled decompression only when allowed by endpoint snapshot;
- `AbortSignal` cancellation.

If this shape cannot be implemented safely in the current Next/Node runtime, reject 7N-3B2 implementation and return to design.

### Endpoint Snapshot Schema

The endpoint allowlist snapshot must be structural and raw-URL-free.

Required fields:

- snapshot version;
- approval status, approver, package path, package commit/hash;
- endpoint id, structural and opaque;
- provider id, structural and canonical;
- canonical ASCII hostname only;
- protocol exactly `https`;
- fixed port;
- fixed path;
- fixed method;
- allowed request parameters by structural key, not arbitrary strings;
- allowed request headers by structural key, with no secret values;
- credentials state without secret values;
- redirect policy exactly `deny`;
- proxy policy exactly `none`;
- response content type policy;
- response sniff policy;
- compressed byte cap;
- decompressed byte cap;
- total byte cap;
- timeout cap;
- no-cache/no-SR/no-product/no-public flags.

Forbidden endpoint snapshot fields:

- raw URL;
- endpoint URL;
- query string template;
- secret value;
- bearer token;
- API key;
- provider-specific opaque endpoint object;
- raw request body.

### Response Type And Sniffing

- provider responses are JSON-only unless a later package says otherwise;
- declared content type and sniffed first bytes must agree with the allowed type;
- HTML, PDF, binary, executable, unknown, or mismatched content types become structural provider failures;
- response body text must not be forwarded into public or analytical outputs.

### Size And Decompression

- declared byte caps and streaming byte caps are both enforced;
- decompressed byte caps are enforced independently of compressed size;
- `Content-Length` absence or understatement cannot bypass limits;
- compression bombs and chunked streaming overrun cases are tests.

### Timeout And Cancellation

- per-query timeout, per-provider timeout, and total candidate acquisition timeout are frozen in the budget snapshot;
- provider network calls receive an `AbortSignal`;
- cancellation creates structural outcomes and must not leak stack/cause/raw provider details;
- retries remain disabled unless a later reviewed budget explicitly allows them.

### Parser Isolation

No parser is allowed in 7N-3B2.

Any future 7N-3B3 parser package must define:

- no network access from parser code;
- no filesystem writes;
- no env/credential access;
- bounded CPU, memory, subprocess, and wall-clock time;
- structural parser failure outcomes only;
- hidden artifact inspection without public leakage.

## 5. Required Runtime Controls

The provider network implementation must integrate with the 7N-3B1 shell without weakening it:

- preserve 7N-3B1 authority and parent-hash binding;
- preserve opaque `ATT_<digits>` provider attempt ids;
- preserve exact per-query outcome accounting;
- preserve zero candidates on non-success provider outcomes;
- preserve provider timeout outcomes;
- preserve no-cache/no-SR/no-product/no-public flags;
- preserve hidden candidate record shape;
- preserve no module candidate cache.

Provider output must be validated before it reaches 7N-3B1 decisions.

## 5.1 Provider-Network Authority

7N-3B2 must define a new non-serializable provider-network authority.

Required behavior:

- default closed;
- module-private WeakSet or equivalent private-brand membership;
- derived from a valid 7N-3B1 candidate-runtime authority;
- bound to endpoint allowlist snapshot hash;
- bound to network budget snapshot hash;
- bound to 7N-3B1 candidate authority hashes;
- records all public/cache/SR/product/live/ACS/direct-URL capabilities as disabled;
- existing 7N-3B1 authority alone is insufficient to authorize network;
- copied/plain/JSON-round-tripped/stale authority blocks before network;
- controlled-harness-only authority blocks before network.

The activation state must be concrete in the implementation package. A prose statement that activation is "default closed" is insufficient.

## 6. Hidden Artifact Rules

7N-3B2 may define hidden internal inspection artifacts only.

Allowed hidden diagnostics:

- provider id;
- structural endpoint id, not raw endpoint URL;
- query id;
- retrieval policy key;
- provider attempt id;
- duration;
- byte counts;
- status and stop reason;
- snapshot hashes;
- final-address validation summary without public URL;
- redacted provider telemetry.

Forbidden diagnostics:

- raw provider payload;
- query text in public/exportable data;
- raw URL;
- source name;
- snippet;
- page title;
- fetched content;
- cache key;
- Source Reliability score;
- evidence item;
- warning;
- verdict;
- confidence;
- report prose;
- secret, header, token, stack, or cause.

Required leakage tests:

- returned candidate decisions;
- hidden diagnostics;
- thrown errors;
- provider telemetry;
- `JSON.stringify(...)` of every public and hidden return object;
- `console.debug`, `console.info`, `console.warn`, and `console.error` spies.

These tests must prove no raw provider payload, raw URL, source name, title, snippet, cache key, Source Reliability field, secret, stack, or cause leaks.

## 7. Cost Controls

7N-3B2 must be budget-fail-closed:

- max providers per run;
- max queries per provider;
- max attempts per query;
- max candidates per query;
- max bytes per provider response;
- max decompressed bytes;
- per-query timeout;
- total acquisition timeout;
- no retries by default;
- no silent query diversity loss.

The package must state expected cost before any live smoke. Safe local tests remain the default verifier.

## 8. Review Questions

Deputy reviewers must answer:

1. Is the provider-network scope narrow enough, or should another docs-only design pass happen first?
2. Does the SDK-free Node-core transport shape provide enough control for implementation?
3. Is the endpoint snapshot schema precise enough to avoid raw URLs, hidden endpoints, proxy bypasses, and credential leakage?
4. Should duplicated 7N-3B1 structural validators be consolidated before implementation?
5. Is the provider-network authority concrete enough to keep 7N-3B1 authority insufficient by itself?
6. Are hidden artifact fields and leakage tests sufficient for diagnosis without public leakage?
7. Are cost and timeout controls sufficient before live smoke?

If any answer is uncertain, return `modify` or `reject`; do not implement.

## 9. Verification Required Before Implementation Commit

A future implementation package must include tests for:

- endpoint allowlist acceptance/rejection;
- DNS rebinding/final-address rejection;
- IPv4/IPv6/private/loopback/link-local/reserved range blocking;
- IPv4-mapped IPv6 blocking;
- metadata-service address blocking;
- IDNA/punycode/trailing-dot host normalization;
- final socket `remoteAddress` mismatch rejection;
- redirect rejection;
- proxy env bypass prevention;
- uppercase and lowercase Windows proxy env var bypass prevention;
- content-type and sniff mismatch rejection;
- non-JSON/executable/unknown response rejection;
- chunked response overrun;
- byte cap and decompressed cap enforcement;
- compression bomb rejection;
- timeout and cancellation outcomes;
- provider thrown errors without stack/cause leakage;
- raw URL/source/snippet/title/cache/SR/evidence/warning/verdict/report leakage rejection;
- no raw body/secret/error stack leakage through returned objects, hidden diagnostics, telemetry, `JSON.stringify(...)`, or `console.*`;
- exact query coverage and no silent query loss;
- no cache key construction;
- no product/public transitive reachability;
- no V1 imports or helper reuse.

Required safe verifier after implementation:

- focused 7N-3B2 tests;
- 7N-3B1 candidate runtime tests;
- `test/unit/lib/analyzer-v2-runtime`;
- `test/unit/lib/analyzer-v2/boundary-guard.test.ts`;
- `npm -w apps/web run build`;
- `git diff --check`;
- `git diff --cached --check`.

No live jobs are part of 7N-3B2 verification.

## 10. Rollback And Activation

7N-3B2 must default closed.

The implementation package must define:

- concrete provider-network authority or kill switch state required for provider network activation;
- activation proof;
- rollback target commit;
- runtime refresh/reseed checklist when relevant;
- no-public-leak verifier before and after activation;
- hidden artifact inspection proof.

If activation cannot be made default-closed and observable, reject the implementation package.

## 11. Reviewer Prompt

Use this prompt for deputy review:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B2_Candidate_Provider_Network_Source_Package.md` as a V2 source-IO package draft. Return `approve`, `modify`, or `reject`. Check whether it is safe to proceed to implementation of candidate-provider network calls only. Verify it does not combine content dereference, parser execution, live jobs, product/public wiring, cache IO, Source Reliability, prompt/config/model/schema changes, ACS/direct URL execution, V1 reuse, or V1 cleanup. Pay special attention to the exact file envelope, SDK-free Node-core transport, SSRF/DNS/final-address controls, redirect denial, proxy bypass prevention, endpoint snapshot schema, response type/byte/decompression limits, timeout/cancellation semantics, concrete provider-network authority, hidden artifact leakage tests, cost controls, and rollback.

## 12. Current Recommendation

Current deputy recommendation before package-specific review:

- draft 7N-3B2 now;
- do not implement yet;
- do not run live canaries;
- keep 7N-3B2 candidate-provider network only;
- keep 7N-3B2 SDK-free unless a later package explicitly changes this after security review;
- reserve content packet/parser for 7N-3B3;
- reserve live smoke for 7N-3C.
