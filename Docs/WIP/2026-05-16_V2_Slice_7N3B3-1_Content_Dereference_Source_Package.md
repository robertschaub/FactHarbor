# V2 Slice 7N-3B3-1 Content Dereference Source Package

**Date:** 2026-05-16
**Status:** draft for deputy review; implementation blocked until approved
**Owner role:** Lead Architect / Captain deputy
**Parent gate:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3_Content_Packet_Parser_Package.md`
**Baseline:** `ba096ead` (`docs: draft v2 content packet boundary`)

## 1. Purpose

Define the first source implementation package after the approved docs-only 7N-3B3 boundary.

7N-3B3-1 may propose only:

- content-dereference authority;
- raw-URL-free content target envelope;
- content transport that fetches bytes into a hidden structural outcome;
- no parser execution;
- no content packet sink;
- no product/orchestrator/runner/API/UI/report/export wiring;
- no live jobs.

This package is a source package draft. It is not implementation approval until deputy review explicitly approves it.

## 1.1 Draft Review Result

Initial deputy review returned:

- Pipeline/LLM-quality reviewer: `APPROVE`.
- Security reviewer: `MODIFY`.
- Test/Ops/Cost reviewer: `MODIFY`.

Required modifications applied:

- transport tests must be hermetic with fake DNS/socket/HTTPS fixtures or an approved local harness; no external internet, provider, or ambient DNS dependency;
- package ceilings now bound target count, attempts, concurrency, byte caps, and timeouts;
- implementation must define commit-first provenance, exact rollback target, refresh/reseed criteria, kill-switch verification, hidden artifact samples, and static public-route reachability proof before activation;
- connection must pin to a prevalidated safe address or equivalent custom lookup, screen all A/AAAA answers, reject all-unsafe answers, and reject final-address mismatch before request headers/body bytes are sent;
- host/path/query/locator values must use non-reversible opaque policy ids or keyed HMAC values; bare deterministic hashes are forbidden.

This package remains unapproved for implementation until re-review returns `approve`.

## 2. Non-Negotiable Scope

Allowed only if approved by review:

- a V2-owned content-dereference authority owner;
- a V2-owned structural content target envelope;
- a V2-owned content transport boundary;
- hidden structural fetch outcomes and sanitized diagnostics;
- exact tests and boundary guards for the above.

Still forbidden:

- parser imports or parser execution;
- content packet sink implementation;
- extracted text, parsed text, source records, evidence items, EvidenceCorpus, warnings, verdicts, confidence, or report prose;
- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- live jobs or Captain canaries;
- cache read/write/key construction;
- durable raw-content storage;
- Source Reliability import/call/score;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- arbitrary user-provided URL fetching;
- provider-returned raw URL execution outside structural target conversion;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

## 3. Exact File Envelope

No source edits are allowed outside this envelope unless deputy review amends the list before implementation.

Allowed new production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-authority.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`

Allowed existing production files:

- none.

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-authority.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Forbidden edits:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`;
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`;
- product/orchestrator/runner/API/UI/report/export files;
- public result schemas and compatibility views;
- cache or Source Reliability files;
- V1 analyzer files under `apps/web/src/lib/analyzer/`;
- prompt files;
- config defaults or config schemas;
- database, API project, or UI public surfaces.

## 4. Exact Export Intent

`source-acquisition-content-authority.ts` should export only:

- `SOURCE_ACQUISITION_CONTENT_AUTHORITY_VERSION`;
- `type SourceAcquisitionContentAuthoritySnapshot`;
- `type SourceAcquisitionContentDereferenceAuthority`;
- `createSourceAcquisitionContentDereferenceAuthority`;
- `isSourceAcquisitionContentDereferenceAuthority`;
- `readSourceAcquisitionContentAuthoritySnapshot`.

`source-acquisition-content-envelope.ts` should export only:

- package/runtime version constants;
- content target envelope types and validators;
- content budget snapshot types and validators;
- hidden fetch diagnostic types;
- structural transport request/outcome types;
- sanitized diagnostic builder helpers.

`source-acquisition-content-transport.ts` should export only:

- low-level transport types;
- address classification/hostname normalization helpers if needed;
- one execution function for a single approved content target request.

No barrel export is approved.

## 5. Authority Model

7N-3B3-1 must define a new content-dereference authority.

Required behavior:

- default closed;
- module-private brand or `WeakSet` membership;
- derived from a valid 7N-3B2 provider-network authority;
- bound to content target snapshot hash;
- bound to content budget snapshot hash;
- bound to parent 7N-3B2 authority hashes;
- records parser, cache, SR, product, public, live, ACS, and direct-URL capabilities as disabled;
- rejects copied objects, JSON round-trips, plain objects, request fields, handoff fields, fixture objects, and serializable flags;
- rejects 7N-2 controlled-harness authority;
- rejects 7N-3A source-IO authority alone;
- rejects 7N-3B1 candidate authority alone;
- rejects 7N-3B2 provider-network authority alone.

No hidden locator id, provider-returned raw URL, query text, user input, ACS snapshot, direct URL, public API call, or product route may authorize content dereference by itself.

## 6. Content Target Envelope

The content target envelope must be structural and raw-URL-free.

Required fields:

- target envelope version;
- approval pointer;
- parent candidate id;
- provider-network authority snapshot hash;
- content-dereference authority snapshot hash;
- provider id;
- endpoint/content policy id;
- opaque runtime locator id;
- canonical scheme policy id;
- canonical hostname policy id or keyed HMAC when host-based dereference is approved;
- fixed or approved path policy id or keyed HMAC;
- redirect policy;
- content type policy;
- byte and timeout policy ids;
- no-parser/no-cache/no-storage/no-SR/no-product/no-public flags.

Forbidden fields:

- raw URL;
- endpoint URL;
- provider-returned URL string;
- query string template;
- source name;
- page title;
- snippet;
- domain as public display data;
- raw request headers;
- secret value;
- bearer token;
- API key;
- raw provider JSON;
- raw content body.

Content target envelopes must carry non-reversible opaque policy ids or keyed HMAC values only. Bare deterministic hashes of host, path, query, or locator values are forbidden because they are dictionary-attackable. Concrete normalized host, path, query, and locator values may exist only inside the transport owner's ephemeral execution state. They must not appear in serialized envelopes, authority snapshots, hidden diagnostics, telemetry, test snapshots, returned objects, thrown errors, `JSON.stringify(...)`, or `console.*`.

If a provider supplies a URL-like locator, the runtime owner must convert it into an approved structural target or block. The raw locator must not cross into Analyzer V2 core, public surfaces, hidden diagnostics, serialized return objects, or test snapshots.

## 7. Transport Shape

7N-3B3-1 must be SDK-free unless a later security review explicitly changes this package.

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
- browser network APIs;
- parser libraries;
- browser automation.

Allowed transport implementation:

- Node runtime only;
- dedicated Node-core HTTPS transport in `source-acquisition-content-transport.ts`;
- explicit DNS lookup owned by the transport;
- all A/AAAA answers screened before connection;
- unsafe answers rejected and all-unsafe answer sets blocked;
- connection pinned to a selected prevalidated safe address or equivalent custom lookup;
- no request headers or body bytes written before the final connected `remoteAddress` is validated;
- final `remoteAddress` mismatch rejected before request emission;
- DNS rebinding and unvalidated-final-address cases blocked;
- explicit IDNA normalization before lookup;
- explicit proxy bypass, ignoring uppercase and lowercase proxy env vars;
- redirect denial by default;
- socket final-address validation against the validated DNS answer and blocked ranges;
- streaming response read with byte caps;
- controlled decompression only when allowed by content target snapshot;
- `AbortSignal` cancellation;
- no parser invocation.

If redirects are allowed in a later package, every hop must be re-authorized through the content target policy and all DNS/final-address/byte checks must repeat. Redirects are not approved by this draft.

## 8. Response Type And Byte Controls

7N-3B3-1 may fetch bytes only into structural hidden transport outcomes. It must not parse or extract text.

Required controls:

- max content targets per run <= 3;
- max content targets per candidate <= 1;
- max fetch attempts per target = 1;
- max concurrent content fetches = 1;
- declared content type policy;
- sniffed content type policy;
- mismatch rejection;
- declared byte cap <= 1 MiB;
- streaming byte cap <= 1 MiB;
- compressed byte cap <= 1 MiB;
- decompressed byte cap <= 2 MiB and enforced during decompression;
- total byte cap per run <= 3 MiB;
- per-fetch timeout <= 5000 ms;
- total content-dereference timeout <= 15000 ms;
- cancellation state;
- retry policy `none` unless a later reviewed budget explicitly allows retry.

These ceilings are package maxima. Implementation may choose lower values. Any higher value requires a new reviewed budget snapshot before implementation. `Content-Length` absence or understatement must not bypass limits. Chunked overrun, compression bombs, slowloris/stall, timeout, and cancellation cases must be tested.

## 9. Structural Outcome Shape

Allowed structural fields:

- content target id;
- parent candidate id;
- provider id;
- fetch attempt id;
- content type;
- declared byte count;
- observed byte count;
- decompressed byte count;
- duration;
- structural status;
- stop reason;
- authority and snapshot hashes;
- sanitized final-address validation summary.

Forbidden fields:

- raw URL;
- source domain as public display data;
- source name;
- title;
- snippet;
- raw content;
- extracted text;
- parser payload;
- evidence item;
- source record;
- Source Reliability score;
- cache key;
- warning;
- verdict;
- confidence;
- report prose.

The transport outcome must not carry raw fetched bytes to callers outside the approved owner boundary unless a later parser/sink package explicitly defines the transfer mechanism. Returned objects must stay structural and sanitized.

## 10. Semantic Boundary

7N-3B3-1 must not decide or emit:

- relevance;
- applicability;
- evidence extraction;
- claim direction;
- probative value;
- evidence strength;
- source credibility meaning;
- Source Reliability score;
- evidence scarcity;
- sufficiency;
- warning materiality;
- verdict;
- confidence;
- report narrative or public prose.

Provider rank, title, snippet, URL/domain, language metadata, content type, content length, and fetch success must not become relevance, quality, sufficiency, warning, or verdict signals.

## 11. Multilingual Boundary

7N-3B3-1 must preserve upstream source-language policy as provenance only.

It must not:

- default to English unless upstream policy explicitly says English;
- translate query text or content;
- classify language by regex, keywords, URL paths, hostnames, TLDs, content snippets, or bytes;
- infer relevance from language;
- repair missing language states;
- create supplementary language lanes.

## 12. Hidden Artifact And Leakage Rules

Allowed hidden diagnostics:

- run id;
- authority snapshot hashes;
- target envelope id;
- parent candidate id;
- provider/fetch attempt id;
- content type;
- byte counts;
- duration;
- structural status and stop reason;
- sanitized final-address validation summary.

Forbidden in returned objects, hidden diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, and `console.*`:

- raw URL;
- redirect target URL;
- source name;
- domain as public display data;
- title;
- snippet;
- raw content;
- extracted text;
- parser payload;
- provider JSON;
- secret;
- header value;
- token;
- stack;
- cause;
- cache key;
- Source Reliability field;
- evidence item;
- warning;
- verdict;
- confidence;
- report prose.

## 13. Required Tests

Implementation must include tests for:

- content authority creation, validation, copy rejection, JSON-round-trip rejection, stale authority rejection, and parent authority mismatch rejection;
- 7N-3B2 provider-network authority alone cannot dereference content;
- raw URL, provider URL, user URL, ACS/direct URL, query text, and public route input cannot authorize dereference;
- content target envelope validates structural fields and rejects raw URL/source/title/snippet/secret fields;
- content target envelope fields carry non-reversible opaque policy ids or keyed HMAC values only, while concrete host/path/query/locator values remain ephemeral and leak-forbidden;
- bare deterministic hashes of host/path/query/locator values are rejected;
- scheme, DNS, IDNA, final-address, proxy bypass, metadata address, IPv4/IPv6/private/loopback/link-local/reserved range, and IPv4-mapped IPv6 blocking;
- all A/AAAA answers are screened and all-unsafe answer sets are rejected;
- DNS lookup timeout and cancellation are enforced;
- connection uses a selected prevalidated safe address or equivalent custom lookup;
- final `remoteAddress` mismatch is rejected before request headers/body bytes are sent;
- DNS-rebinding and unvalidated-final-address cases block structurally;
- redirect denial;
- declared byte cap, streaming byte cap, decompression cap, chunked overrun, compression bomb, slowloris/stall, timeout, and cancellation cases;
- package ceilings for targets, attempts, concurrency, byte caps, and timeouts are enforced;
- no parser is imported or invoked;
- unit tests are hermetic: they must use fake DNS/socket/HTTPS fixtures or an approved local harness, with no external internet, real provider, or ambient DNS dependency;
- serialized return objects, hidden diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, and `console.*` leak no forbidden target, host, path, query, locator, or payload data;
- hidden artifact samples prove sanitized structural diagnostics without raw payload leakage;
- static route/reachability proof shows public/product/API/UI/report/export surfaces cannot reach content authority/envelope/transport owner files;
- output contains no evidence items, source records, applicability, extraction, probative values, Source Reliability scores, scarcity/sufficiency, warnings, verdicts, confidence, report fields, or public prose.

## 14. Boundary Guard Updates

`boundary-guard.test.ts` must prove:

- exact allowed production files and test files;
- exact export list for every new production file;
- exact import allowlist for every new production file;
- no barrel re-export of content-dereference runtime files;
- no product/public transitive reachability;
- no parser/sink imports or files in this package;
- no V1 analyzer/prompt/type/helper imports;
- no V1 retrieval/search/parser helper reuse;
- no cache/storage/config IO imports;
- no Source Reliability imports;
- no provider SDK, `fetch`, `undici`, axios, got, ky, node-fetch, proxy-agent, browser automation, or parser imports;
- Node-core network imports allowed only in `source-acquisition-content-transport.ts`;
- no prompt/model adapter imports;
- no public result/report/export route can reach content authority/envelope/transport owner files.

## 15. Required Verification

Minimum verifier after implementation:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7N-3B3-1.

## 16. Runtime Refresh, Rollback, And Kill Switch

Implementation must define before activation:

- commit-first provenance: source must be committed before any hidden activation or validation run;
- exact rollback target commit, normally the last commit before 7N-3B3-1 implementation;
- default-closed activation state;
- kill switch behavior that fails closed to 7N-3B2 candidate-only posture;
- runtime refresh/reseed criteria for source, config, or environment changes;
- hidden artifact inspection proof with implemented sample artifacts;
- no-public-leak verification before and after activation;
- static public-route reachability proof before activation;
- disable criteria for provider failures, fetch failures, timeouts, cancellation, memory/byte overrun, or disposal failure.

## 17. Review Questions

Deputy reviewers must answer:

1. Is 7N-3B3-1 narrow enough, or should content authority/envelope and transport be split further?
2. Is content dereference authority sufficiently distinct from 7N-3B2 provider-network authority?
3. Is the raw-URL-free target envelope precise enough?
4. Are SSRF/DNS/final-address/redirect-denial controls sufficient?
5. Are byte/time/decompression/cancellation controls sufficient?
6. Are no-parser, no-cache, no-SR, no-public, no-semantic-leak, multilingual, and no-V1 boundaries explicit enough?
7. Is the verifier strong enough before implementation?

If any answer is uncertain, return `modify` or `reject`; do not implement.

## 18. Reviewer Prompt

Use this prompt for deputy review:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-1_Content_Dereference_Source_Package.md` as a V2 content-dereference source package draft. Return `approve`, `modify`, or `reject`. Check whether it is safe to proceed to implementation of content-dereference authority, raw-URL-free target envelope, and content transport only. Verify it does not combine parser/sink implementation, live jobs, product/public wiring, cache IO, Source Reliability, prompt/config/model/schema changes, ACS/direct URL execution, V1 reuse, or V1 cleanup. Pay special attention to the separate authority, raw-URL-free target envelope, SSRF/DNS/final-address/redirect-denial controls, byte/decompression/timeout/cancellation limits, payload leakage, no semantic relevance/applicability/probative/sufficiency decisions, multilingual neutrality, rollback/kill switch, and verifier scope.

## 19. Stop Conditions

Stop and return to Captain/deputy review if the next step would require:

- source implementation before deputy approval;
- parser execution;
- content packet sink implementation;
- provider SDK or browser automation imports;
- redirects;
- arbitrary URL dereference;
- provider-returned raw URL execution outside structural target conversion;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs;
- cache IO or durable raw-content storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic text-analysis code;
- ACS/direct URL execution;
- V1 cleanup or reuse.

Concrete content dereference, public/product wiring, and live jobs remain high-risk gates and require separate explicit approval.
