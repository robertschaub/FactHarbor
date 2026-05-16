# V2 Slice 7N-3B3 Content Packet And Parser Boundary Package

**Date:** 2026-05-16
**Status:** approved docs-only boundary; source implementation blocked until a separate reviewed source package
**Owner role:** Lead Architect / Captain deputy
**Parent gate:** `Docs/WIP/2026-05-16_V2_Slice_7N3B2_Post_Implementation_Consolidation.md`
**Implementation baseline:** `54b8af1a` (`feat: add v2 provider network boundary`)
**Documentation baseline:** `b3df3190` (`docs: record v2 provider network boundary`)

## 1. Purpose

Define the next reviewable boundary after 7N-3B2.

7N-3B3 is intended to define content packet and parser constraints only. It is not implementation approval.

The package exists because content dereference and parser execution are higher risk than candidate-provider API calls. They introduce raw content, active content, parser libraries, larger byte budgets, disposal requirements, and a much higher risk of semantic leakage into the structural source-acquisition layer.

## 2. Non-Negotiable Scope

Allowed in this docs package:

- define a proposed content-dereference authority model;
- define raw-URL-free content target envelopes;
- define hidden content packet envelope shape;
- define parser isolation and sandbox requirements;
- define byte/time/memory/output/disposal limits;
- define no-public-leak and no-semantic-leak verifier requirements;
- define rollback, kill switch, and runtime refresh prerequisites for a later implementation;
- define reviewer prompts and stop conditions.

Still forbidden:

- source edits implementing content fetch or parser execution;
- live jobs or Captain canaries;
- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- arbitrary user-provided URL fetching;
- provider-returned raw URL execution;
- ACS/direct URL execution;
- parser imports, browser automation, subprocesses, workers, or binary execution;
- cache read/write/key construction;
- durable raw-content storage;
- Source Reliability import/call/score;
- evidence corpus population;
- evidence items, source records, warnings, verdicts, confidence, or report prose;
- prompt/config/model/schema changes;
- deterministic relevance/applicability/extraction/probative/sufficiency classification;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

## 2.1 Review Result

Initial read-only deputy review of this docs package returned:

- Pipeline/LLM-quality reviewer: `APPROVE`.
- Security reviewer: `MODIFY`.

Security modifications applied before commit:

- separated the later content-dereference implementation envelope (`7N-3B3-1`) from the later parser/sink implementation envelope (`7N-3B3-2`);
- required the parser package to depend on a committed and reviewed dereference package;
- blocked parser filesystem reads except loading the reviewed parser module and explicitly approved immutable test fixtures;
- required read-path policy, inherited descriptor policy, and sentinel file/secret leakage proof for any parser worker/process model;
- sharpened raw-URL-free target envelope wording so host/path/query/locator values remain opaque policy ids or hashes in serialized state and may exist only in ephemeral transport-owner execution state.

This package remains docs-only. It does not approve source implementation.

Post-fix deputy review at `ba096ead` returned:

- Security reviewer: `APPROVE`.
- Pipeline/LLM-quality reviewer: `APPROVE`.
- Test/Ops/Cost reviewer: `APPROVE`.

Consolidated verdict: approved as a docs-only boundary package. The next low-risk step is a separate `7N-3B3-1` source package for content-dereference authority, content target envelope, and content transport only. Parser/sink remains `7N-3B3-2`; live smoke remains `7N-3C`.

## 3. Required Package Split

Do not combine these gates:

1. **7N-3B3:** docs-only content packet and parser boundary package.
2. **7N-3B3-1:** later source implementation package for content target envelope and content-dereference authority, if approved.
3. **7N-3B3-2:** later source implementation package for parser isolation and hidden packet sink, if approved.
4. **7N-3C:** later hidden live smoke after committed source, runtime refresh, no-public-leak proof, rollback, and Captain-approved canaries.

If reviewers conclude content dereference and parser isolation cannot be safely separated, stop and return to architecture review before source implementation.

## 4. Content-Dereference Authority

7N-3B2 provider-network authority is insufficient for content dereference.

A future implementation must define a new content-dereference authority with these properties:

- default closed;
- module-private membership such as `WeakSet` or equivalent private brand;
- derived from a valid 7N-3B2 provider-network authority;
- bound to content target snapshot hash;
- bound to parser policy snapshot hash;
- bound to content budget snapshot hash;
- rejects copied objects, JSON round-trips, request fields, handoff fields, fixture objects, and serializable flags;
- rejects 7N-2 controlled-harness authority;
- rejects 7N-3A source-IO authority alone;
- rejects 7N-3B1 candidate runtime authority alone;
- rejects 7N-3B2 provider-network authority alone;
- records public/cache/SR/product/live/ACS/direct-URL capabilities as disabled.

No hidden locator id, provider-returned raw URL, query text, user input, ACS snapshot, direct URL, public API call, or product route may authorize content dereference by itself.

## 5. Content Target Envelope

A future content target envelope must be structural and raw-URL-free.

Required fields:

- target envelope version;
- approval pointer;
- parent candidate id;
- candidate authority snapshot hash;
- content-dereference authority snapshot hash;
- provider id;
- endpoint/content policy id;
- opaque runtime locator id;
- canonical scheme policy id;
- canonical hostname policy id or hash, if host-based dereference is approved;
- fixed or approved path policy id or hash;
- redirect policy;
- content type policy;
- parser policy id;
- byte and timeout policy ids;
- no-cache/no-storage/no-SR/no-product/no-public flags.

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

Content target envelopes must carry opaque policy ids or hashes only. Concrete normalized host, path, query, and locator values may exist only inside the transport owner's ephemeral execution state. They must not appear in serialized envelopes, authority snapshots, hidden diagnostics, telemetry, test snapshots, returned objects, thrown errors, `JSON.stringify(...)`, or `console.*`.

If a provider supplies a URL-like locator, the runtime owner must convert it into an approved structural target or block. The raw locator must not cross into Analyzer V2 core, public surfaces, hidden diagnostics, serialized return objects, or test snapshots.

## 6. Fetch And SSRF Controls

A future implementation must use the 7N-3B2 threat model as the minimum bar.

Required controls:

- scheme allowlist;
- IDNA/punycode/trailing-dot normalization;
- explicit DNS lookup;
- DNS lookup timeout and cancellation;
- loopback, private, link-local, multicast, reserved, IPv4-mapped IPv6, and metadata-service address blocking;
- socket final-address validation;
- proxy and environment bypass;
- no provider SDK or browser network abstraction unless a later security review explicitly approves it;
- redirect denial by default.

If redirects are allowed in a later package:

- every hop must be re-authorized through the content target policy;
- every hop must repeat DNS, final-address, scheme, content-target, and byte-budget checks;
- redirect count must be capped;
- redirect history must stay hidden/internal and sanitized;
- redirect target raw URLs must not serialize or reach public surfaces.

## 7. Byte, Time, And Resource Budgets

A future implementation must define a frozen content budget snapshot.

Required budget fields:

- max content targets per run;
- max content targets per candidate;
- max fetch attempts per target;
- compressed byte cap;
- decompressed byte cap;
- total byte cap;
- parser input byte cap;
- parser output byte cap;
- per-fetch timeout;
- per-parser timeout;
- total content-acquisition timeout;
- cancellation state;
- retry policy;
- partial-execution policy;
- raw-buffer disposal policy.

Budget enforcement requirements:

- `Content-Length` is advisory only;
- streaming byte counters are mandatory;
- chunked overrun must block structurally;
- decompression cap must be enforced during decompression;
- slowloris/stall cases must timeout;
- parser hang cases must timeout;
- cancellation must create structural outcomes and stop new work;
- over-budget results must not be silently truncated into success.

Quality remains first. Cost controls may bound waste but must not silently drop source diversity and report success.

## 8. Parser Isolation

Parser code must receive bytes only. It must not receive network authority.

Parser isolation requirements:

- no network access;
- no env or credential access;
- no filesystem reads except loading the reviewed parser module and explicitly approved immutable test fixtures;
- no filesystem writes;
- no cache/storage access;
- no Source Reliability calls;
- no product/public imports;
- no prompt/model calls;
- no browser automation unless a later package names and reviews the browser isolation model;
- no script execution or subresource loading for HTML;
- no embedded link following;
- no active content execution;
- no unbounded subprocess behavior;
- bounded parser input, output, CPU, memory, and wall-clock time;
- structural failure outcomes only;
- sanitized errors with no stack/cause/raw payload leakage.

Node `vm` is not sufficient as a parser sandbox.

If implementation proposes a worker or process boundary, the package must name:

- launch owner;
- env stripping behavior;
- inherited descriptor policy;
- read-path policy;
- writable path policy;
- memory and wall-clock limits;
- parser input/output protocol;
- process termination behavior;
- sanitized failure mapping;
- verifier for no env, network, secret, cache, arbitrary filesystem read, or filesystem write access;
- sentinel file/secret proof that the parser cannot read or leak unapproved local files.

## 9. Content Packet Envelope

Content packets are hidden raw material for later LLM-owned tasks. They are not EvidenceCorpus, not source records, not evidence items, and not report content.

Allowed structural packet fields:

- opaque content packet id;
- parent candidate id;
- query id;
- provider/fetch attempt id;
- content type;
- declared byte count;
- observed byte count;
- decompressed byte count;
- parser policy id;
- parser structural status;
- packet lifecycle status;
- disposal status;
- hidden sink reference id, if a later package approves a non-durable sink.

Forbidden packet fields:

- raw URL;
- source domain as public display data;
- source name;
- page title;
- snippet;
- raw content body;
- extracted text;
- parser output text;
- evidence item;
- source record;
- Source Reliability score;
- cache key;
- warning;
- verdict;
- confidence;
- report prose.

Packet ids and sink references must be opaque and non-dereferenceable outside the runtime owner. They must not embed URLs, domains, source names, claim text, or semantic labels.

## 10. Hidden Artifact And Leakage Rules

Allowed hidden diagnostics:

- run id;
- authority snapshot hashes;
- target envelope id;
- parent candidate id;
- query id;
- provider/fetch/parser attempt ids;
- content type;
- byte counts;
- duration;
- structural status and stop reason;
- sanitized final-address validation summary;
- disposal status.

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

## 11. Semantic Boundary

7N-3B3 must not decide or emit:

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

Provider rank, title, snippet, URL/domain, language metadata, content type, content length, and parser success must not become relevance, quality, sufficiency, warning, or verdict signals.

Later LLM-owned Evidence Lifecycle gates may consume content packets to decide applicability, extraction, probative value, source-language strategy, sufficiency, and warning materiality under separately approved prompt/model/UCM gates.

## 12. Multilingual Boundary

7N-3B3 must preserve upstream source-language policy as provenance only.

It must not:

- default to English unless upstream policy explicitly says English;
- translate query text or content;
- classify language by regex, keywords, URL paths, hostnames, TLDs, content snippets, or parser text;
- infer relevance from language;
- repair missing language states;
- create supplementary language lanes.

If parser selection needs language-dependent behavior, block until a later LLM-owned or UCM-owned policy defines it. Do not implement deterministic language semantics in source acquisition.

## 13. Cache, Storage, And Source Reliability Boundary

Default remains no-store/no-read.

7N-3B3 must not:

- read cache;
- write cache;
- construct durable cache keys;
- persist raw content;
- persist parser text;
- write content packets to database or filesystem;
- call Source Reliability;
- carry Source Reliability scores;
- infer source reliability from provider, domain, rank, title, snippet, or content.

Any real retention, cache IO, freshness policy, or Source Reliability integration requires a separate reviewed package with privacy, identity, invalidation, rollback, and quality validation.

## 14. Public And Product Boundary

7N-3B3 must remain hidden/internal.

It must not edit:

- product/orchestrator/runner/API/UI/report/export files;
- public result schemas;
- compatibility views;
- admin pages;
- job pages;
- API project files;
- V1 analyzer files;
- prompt files;
- config defaults or config schemas.

No public API/UI/report/export field may expose content packets, parser status, raw content, source identity, source URL, hidden locator, or artifact pointers until a later public-surface gate approves it.

## 15. Candidate File Envelopes For Later Implementation

This document does not approve source implementation.

If reviewers later approve source packages, 7N-3B3-1 and 7N-3B3-2 must remain separate unless a later security review explicitly approves combining them. The parser package depends on a committed and reviewed dereference package.

Expected candidate production files for **7N-3B3-1 content dereference authority and transport**:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-authority.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`

Expected candidate test files for **7N-3B3-1**:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-authority.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Expected candidate production files for **7N-3B3-2 parser isolation and packet sink**:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`

Expected candidate test files for **7N-3B3-2**:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

No implementation package may edit outside its exact reviewed file envelope.

## 16. Required Tests For Later Implementation Packages

A future **7N-3B3-1** implementation package must include tests for:

- content authority creation, validation, copy rejection, JSON-round-trip rejection, stale authority rejection, and parent authority mismatch rejection;
- 7N-3B2 provider-network authority alone cannot dereference content;
- raw URL, provider URL, user URL, ACS/direct URL, query text, and public route input cannot authorize dereference;
- content target envelope validates structural fields and rejects raw URL/source/title/snippet/secret fields;
- content target envelope fields carry opaque policy ids/hashes only, while concrete host/path/query/locator values remain ephemeral and leak-forbidden;
- scheme, DNS, IDNA, final-address, proxy bypass, metadata address, IPv4/IPv6/private/loopback/link-local/reserved range, and IPv4-mapped IPv6 blocking;
- redirect denial, or if later approved, hop-by-hop redirect revalidation;
- declared byte cap, streaming byte cap, decompression cap, chunked overrun, compression bomb, slowloris/stall, timeout, and cancellation cases;
- serialized return objects, hidden diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, and `console.*` leak no forbidden target, host, path, query, locator, or payload data;
- output contains no evidence items, source records, applicability, extraction, probative values, Source Reliability scores, scarcity/sufficiency, warnings, verdicts, confidence, report fields, or public prose.

A future **7N-3B3-2** implementation package must include tests for:

- parser package depends on a committed and reviewed 7N-3B3-1 dereference package;
- parser receives bytes only and no network authority;
- parser cannot access env, secrets, cache, Source Reliability, product imports, arbitrary filesystem reads, or filesystem writes;
- parser cannot read or leak an unapproved sentinel file/secret;
- parser timeout/hang and parser failure produce structural outcomes only;
- content packet ids and sink refs are opaque and non-dereferenceable;
- serialized return objects, hidden diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, and `console.*` leak no forbidden payload;
- output contains no evidence items, source records, applicability, extraction, probative values, Source Reliability scores, scarcity/sufficiency, warnings, verdicts, confidence, report fields, or public prose;
- non-English content and source-language policy produce the same structural behavior except unchanged pass-through provenance.

## 17. Required Boundary Guards

`boundary-guard.test.ts` must prove:

- exact allowed production files and test files;
- exact export list for every new production file;
- exact import allowlist for every new production file;
- no barrel re-export of content/parser runtime files;
- no product/public transitive reachability;
- no V1 analyzer/prompt/type/helper imports;
- no V1 retrieval/search/parser helper reuse;
- no cache/storage/config IO imports;
- no Source Reliability imports;
- no provider SDK or browser automation imports unless a later reviewed package explicitly allows one with isolation;
- no direct `fetch(...)` outside the reviewed owner file, if source transport is approved;
- no parser/network imports outside the reviewed owner files;
- no prompt/model adapter imports;
- no public result/report/export route can reach content packet or parser owner files.

## 18. Minimum Verifiers For Later Implementation Packages

No source verifier is approved by this docs package. A later **7N-3B3-1** implementation package must include at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

A later **7N-3B3-2** implementation package must include at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7N-3B3.

## 19. Runtime Refresh, Rollback, And Kill Switch

A future implementation package must define:

- default-closed activation state;
- kill switch behavior that fails closed to 7N-3B2 candidate-only posture;
- rollback target commit;
- runtime refresh/reseed checklist if source code or runtime config changes;
- hidden artifact inspection proof;
- no-public-leak verification before and after activation;
- disable criteria for provider failures, parser failures, timeouts, cancellation, memory/byte overrun, or disposal failure.

## 20. Review Questions

Deputy reviewers must answer:

1. Is 7N-3B3 narrow enough as docs-only content packet/parser boundary design?
2. Is a separate content-dereference authority required before source implementation?
3. Are content target envelopes sufficiently raw-URL-free?
4. Are parser isolation requirements strong enough without over-designing implementation?
5. Are byte/time/memory/disposal controls sufficient before implementation?
6. Are no-semantic-leak, multilingual, no-cache, no-SR, no-public, and no-V1 boundaries explicit enough?
7. Should content target transport and parser execution be split into separate implementation packages?

If any answer is uncertain, return `modify` or `reject`; do not implement.

## 21. Reviewer Prompt

Use this prompt for deputy review:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3_Content_Packet_Parser_Package.md` as a V2 docs-only content packet/parser boundary package. Return `approve`, `modify`, or `reject`. Check that it does not authorize source implementation, live jobs, product/public wiring, cache IO, Source Reliability, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup. Pay special attention to the separate content-dereference authority, raw-URL-free target envelope, SSRF/DNS/final-address/redirect controls, parser isolation and sandboxing, byte/time/memory/disposal caps, payload leakage, no semantic relevance/applicability/probative/sufficiency decisions, multilingual neutrality, rollback/kill switch, and verifier scope.

## 22. Stop Conditions

Stop and return to Captain/deputy review if the next step would require:

- source implementation before deputy approval;
- content fetch execution;
- parser execution;
- provider SDK or browser automation imports;
- arbitrary URL dereference;
- provider-returned raw URL execution;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs;
- cache IO or durable raw-content storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic text-analysis code;
- ACS/direct URL execution;
- V1 cleanup or reuse.

Concrete content dereference, parser execution, public/product wiring, and live jobs remain high-risk gates and require separate explicit approval.
