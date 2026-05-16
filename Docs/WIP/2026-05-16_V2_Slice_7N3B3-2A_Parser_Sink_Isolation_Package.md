# V2 Slice 7N-3B3-2A Parser/Sink Isolation Package

**Date:** 2026-05-16
**Status:** approved docs-only boundary; source implementation blocked pending 7N-3B3-2B source-package review
**Owner role:** Lead Architect / Captain deputy
**Parent gate:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-1_Post_Implementation_Consolidation.md`
**Implementation baseline:** `267bfb9e` (`feat: add v2 content dereference boundary`)

## 1. Purpose

Define the safe next parser/sink boundary after 7N-3B3-1.

7N-3B3-2A is not implementation approval. It exists to prevent two unsafe shortcuts:

- treating parser/sink source files as if they can materialize real fetched bytes without an approved owner-only handoff from the 7N-3B3-1 transport;
- turning structural content parsing into evidence extraction, source reliability, warning materiality, or report content.

## 1.1 Review Result

Deputy review converged after one security hardening pass:

- LLM / Evidence Lifecycle reviewer: `APPROVE`.
- Security reviewer initial pass: `MODIFY`.
- Security re-review after hardening: `APPROVE`.
- Senior Developer implementation-envelope review: `APPROVE` to draft a separate 7N-3B3-2B source package; not approval to implement source.

Security hardening applied before approval:

- future real-byte handoff must be HMAC/provenance-bound to content authority, target hash, budget hash, fetch attempt id, packet sink authority, byte count, byte digest, and parent provider-network/content-authority chain;
- parser/sink must reject stale authority, wrong target/budget hash, wrong fetch attempt id, wrong byte digest/count, wrong sink authority, copied objects, JSON round-trips, and replay after disposal;
- real transport-byte parsing requires a reviewed worker, process, or container isolation boundary;
- in-process parsing is allowed only for fixture/control-only work with no real transport-byte handoff;
- sink disposal must run on every terminal path, and disposed references must not resurrect bytes, parsed material, diagnostics, parser output, or packet metadata beyond structural disposal status.

Consolidated decision: 7N-3B3-2B may be drafted as a source package for review only. It must be fixture/control-only unless a later 7N-3B3-2C package explicitly approves a transport-owner real-byte handoff through `source-acquisition-content-transport.ts`.

## 2. Non-Negotiable Scope

Allowed in this docs package:

- define a hidden, non-durable content-packet sink boundary;
- define owner-only in-memory byte handoff requirements;
- define parser isolation and sandbox requirements;
- define parser input/output/disposal protocol;
- define opaque packet/sink reference rules;
- define exact candidate source/test file envelopes for a later source package;
- define no-public-leak and no-semantic-leak verifier requirements;
- define rollback, kill switch, hidden artifact inspection, and runtime refresh prerequisites for a later implementation;
- define reviewer prompts and stop conditions.

Still forbidden:

- source edits implementing parser execution or packet sink behavior;
- live jobs or Captain canaries;
- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- raw URL, domain, title, snippet, raw body, extracted text, parser text, or provider JSON in returned objects or diagnostics;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- evidence corpus population;
- evidence items, source records, warnings, verdicts, confidence, or report prose;
- prompt/config/model/schema changes;
- deterministic relevance/applicability/extraction/probative/sufficiency classification;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

## 3. Review Premise

7N-3B3-1 intentionally returns only structural hidden outcomes. The transport currently keeps raw response bytes inside `source-acquisition-content-transport.ts` and exposes no byte-bearing public or hidden result.

Therefore a parser/sink implementation that only edits:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`

cannot safely parse real fetched bytes. It would have to fake byte sources, bypass the transport owner, or add an unreviewed raw-byte path. All three are blocked.

If a later source implementation must parse real transport bytes, its reviewed file envelope must include a narrow, owner-only edit to:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`

That edit may only define a byte handoff/callback into the packet sink while preserving byte-free public transport outcomes.

## 4. Required Package Split

Do not combine these gates:

1. **7N-3B3-2A:** docs/review package for parser/sink isolation and owner-only byte handoff design.
2. **7N-3B3-2B:** later source package for hidden packet sink and parser boundary, if approved.
3. **7N-3B3-2C:** later source package for real transport-byte handoff, only if 7N-3B3-2B cannot remain fixture/control-only and only if reviewers approve editing the transport owner.
4. **7N-3C:** later hidden live smoke after committed source, runtime refresh, no-public-leak proof, rollback, and Captain-approved canaries.

If reviewers conclude parser/sink and transport-byte handoff cannot be safely separated, stop and return to architecture review before source implementation.

## 5. Packet Sink Boundary

The packet sink is hidden raw material storage for one runtime only.

Required properties:

- non-durable;
- no database write;
- no filesystem write;
- no cache write;
- no Source Reliability write;
- no product/public pointer;
- bounded retained packet count;
- bounded retained byte count;
- explicit disposal status;
- opaque sink reference ids;
- no id embedding of URLs, domains, source names, query text, claim text, language labels, or semantic labels;
- no raw payload in returned objects, diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, or `console.*`.

Disposal requirements:

- disposal must run on every terminal path: success, parser failure, timeout, cancellation, byte cap overrun, memory cap overrun, sink cap overrun, kill switch, rollback, and implementation-defined abort;
- disposed sink references are permanently invalid;
- disposed sink references must not resurrect bytes, parsed material, diagnostics, parser output, or packet metadata beyond the allowed structural disposal status;
- disposal failure is a structural failure outcome and cannot be treated as successful packet materialization.

Allowed structural packet envelope fields:

- opaque content packet id;
- parent candidate id;
- query id;
- provider/fetch attempt id;
- parser attempt id;
- content type policy id;
- observed byte count;
- decompressed byte count;
- parser policy id;
- parser structural status;
- packet lifecycle status;
- disposal status;
- hidden sink reference id.

Forbidden packet envelope fields:

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

## 6. Owner-Only Byte Handoff

A later implementation must use a non-serializable owner-only handoff for bytes.

Required behavior:

- handoff object is created only by the content transport owner;
- handoff is private-branded or equivalent and rejects copied/plain/JSON-round-tripped objects;
- handoff is HMAC/provenance-bound to content authority, target envelope hash, budget hash, fetch attempt id, packet sink authority, byte counts, byte digest, and the parent provider-network/content-authority chain;
- parser/sink must reject handoffs unless they were created by the transport owner and verified against that HMAC/provenance binding;
- handoff exposes bytes only to the approved packet sink/parser owner;
- handoff cannot be logged, stringified, serialized, or returned;
- handoff disposal is observable only as structural status;
- handoff cannot authorize network, cache, Source Reliability, product, public, prompt/model, ACS/direct URL, or V1 access.

The byte handoff is not a source record and not evidence. It is hidden input material for later LLM-owned gates.

## 7. Parser Isolation

Parser code receives bytes only. It must not receive network authority.

Parser isolation requirements:

- no network access;
- no env or credential access;
- no arbitrary filesystem reads;
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

Real transport-byte parsing requires a reviewed worker, process, or container isolation boundary. In-process parsing is allowed only for fixture/control-only work with no real transport-byte handoff.

If implementation proposes a worker, process, or container boundary, the package must name:

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

## 8. Semantic Boundary

7N-3B3-2A must not decide or emit:

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

Parser success, content type, byte count, content length, source language provenance, and packet status must not become relevance, quality, sufficiency, warning, or verdict signals.

Later LLM-owned Evidence Lifecycle gates may consume hidden packet/sink references to decide applicability, extraction, probative value, source-language strategy, sufficiency, and warning materiality under separately approved prompt/model/UCM gates.

## 9. Multilingual Boundary

7N-3B3-2A must preserve upstream source-language policy as provenance only.

It must not:

- default to English unless upstream policy explicitly says English;
- translate content;
- classify language by regex, keywords, URL paths, hostnames, TLDs, content snippets, parser text, or bytes;
- infer relevance from language;
- repair missing language states;
- create supplementary language lanes.

Non-English content must receive the same structural parser/sink behavior except for unchanged pass-through provenance and parser policy selection explicitly approved by UCM or later LLM-owned policy.

## 10. Candidate File Envelope For Later Source

This document does not approve source implementation.

Expected candidate production files for **7N-3B3-2B parser isolation and packet sink**:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`

Expected candidate production file for **7N-3B3-2C real transport-byte handoff**, only if approved:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`

Expected candidate test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts` only if the transport handoff is amended;
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`.

No source package may edit outside its exact reviewed file envelope.

## 11. Required Tests For Later Implementation

A later implementation package must include tests for:

- parser package depends on committed and reviewed 7N-3B3-1 content dereference work;
- parser receives bytes only through approved owner-only handoff or approved immutable fixtures;
- arbitrary byte source objects are rejected;
- copied/plain/JSON-round-tripped byte handoffs are rejected;
- HMAC/provenance mismatch rejects stale authority, wrong target hash, wrong budget hash, wrong fetch attempt id, wrong byte digest, wrong byte count, wrong sink authority, wrong parent provider-network authority chain, wrong content authority chain, copied object, JSON round-trip, and replay after disposal;
- parser cannot access network, env, secrets, cache, Source Reliability, product imports, arbitrary filesystem reads, or filesystem writes;
- parser cannot read or leak an unapproved sentinel file/secret;
- parser timeout/hang and parser failure produce structural outcomes only;
- packet ids and sink refs are opaque and non-dereferenceable;
- disposal clears retained bytes and parsed material;
- disposal runs on success, parser failure, timeout, cancellation, byte cap overrun, memory cap overrun, sink cap overrun, kill switch, rollback, and implementation-defined abort;
- disposed sink references are invalid and cannot resurrect bytes or parsed material;
- sink caps bound retained packet count and retained byte count;
- serialized return objects, hidden diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, and `console.*` leak no forbidden payload;
- output contains no evidence items, source records, applicability, extraction, probative values, Source Reliability scores, scarcity/sufficiency, warnings, verdicts, confidence, report fields, or public prose;
- non-English content and source-language policy produce the same structural behavior except unchanged pass-through provenance;
- product/orchestrator/runner/API/UI/report/export surfaces cannot reach parser/sink owner files.

## 12. Required Boundary Guards

`boundary-guard.test.ts` must prove:

- exact allowed production files and test files for the approved source package;
- exact export list for every new production file;
- exact import allowlist for every new production file;
- no barrel re-export of parser/sink files;
- no product/public transitive reachability;
- no V1 analyzer/prompt/type/helper imports;
- no V1 retrieval/search/parser helper reuse;
- no cache/storage/config IO imports;
- no Source Reliability imports;
- no provider SDK, network, browser automation, or prompt/model imports in parser/sink files;
- no direct `fetch(...)`;
- no transport handoff edit unless the source package explicitly includes `source-acquisition-content-transport.ts`;
- no public result/report/export route can reach content packet or parser owner files.

## 13. Minimum Verifiers For Later Implementation

No source verifier is approved by this docs package. A later source package must include at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

If real transport-byte handoff is amended, add:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts
```

No expensive tests and no live jobs are approved by 7N-3B3-2A.

## 14. Runtime Refresh, Rollback, And Kill Switch

A future implementation package must define:

- default-closed activation state;
- kill switch behavior that fails closed to 7N-3B3-1 byte-free structural transport posture;
- exact rollback target commit;
- runtime refresh/reseed checklist if source code or runtime config changes;
- hidden artifact inspection proof;
- no-public-leak verification before and after activation;
- disable criteria for parser failures, timeouts, cancellation, memory/byte overrun, sink cap overrun, or disposal failure.

## 15. Review Questions

Deputy reviewers must answer:

1. Is 7N-3B3-2A narrow enough as docs-only parser/sink isolation design?
2. Is the hard blocker around real transport-byte materialization explicit enough?
3. Should later source implementation split parser/sink from transport-byte handoff into 7N-3B3-2B and 7N-3B3-2C?
4. Are packet sink lifetime, disposal, and no-public-leak rules strong enough?
5. Are parser isolation requirements strong enough without over-designing implementation?
6. Are no-semantic-leak, multilingual, no-cache, no-SR, no-public, and no-V1 boundaries explicit enough?
7. Is the verifier strong enough before implementation?

If any answer is uncertain, return `modify` or `reject`; do not implement.

## 16. Reviewer Prompt

Use this prompt for deputy review:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2A_Parser_Sink_Isolation_Package.md` as a V2 docs-only parser/sink isolation package. Return `approve`, `modify`, or `reject`. Check that it does not authorize source implementation, live jobs, product/public wiring, cache IO, Source Reliability, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup. Pay special attention to the hard blocker that real fetched-byte materialization requires a reviewed owner-only handoff from `source-acquisition-content-transport.ts`; parser/sink files alone cannot safely parse real transport bytes. Verify packet sink lifetime/disposal, parser isolation, sentinel secret/file leakage tests, no semantic relevance/applicability/probative/sufficiency decisions, multilingual neutrality, rollback/kill switch, and verifier scope.

## 17. Stop Conditions

Stop and return to Captain/deputy review if the next step would require:

- source implementation before deputy approval;
- parser execution;
- content packet sink implementation;
- raw-byte handoff from transport;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs;
- cache IO or durable raw-content storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic text-analysis code;
- ACS/direct URL execution;
- V1 cleanup or reuse.

Concrete parser execution, byte handoff, public/product wiring, and live jobs remain high-risk gates and require separate explicit approval.
