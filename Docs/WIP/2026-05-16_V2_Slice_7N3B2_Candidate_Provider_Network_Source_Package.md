# V2 Slice 7N-3B2 Candidate Provider Network Source Package

**Date:** 2026-05-16
**Status:** draft for deputy review; implementation blocked until approved
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
- IDNA/punycode host normalization is explicit and test-covered;
- redirects are disabled, or each redirect target is revalidated with the same rules before connection;
- the final connected host/address/protocol/port are captured as internal structural diagnostics only.

Do not reuse V1 `retrieval.ts` or V1 network helpers. Backlog still records DNS TOCTOU as a residual V1 retrieval risk; V2 must not inherit it.

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
2. Can the implementation safely avoid provider SDKs, or is an SDK needed and auditable?
3. If an SDK is proposed, can it prove connection-time final-address validation, redirect policy, proxy behavior, response caps, cancellation, and no hidden retries?
4. Should duplicated 7N-3B1 structural validators be consolidated before implementation?
5. Are hidden artifact fields sufficient for diagnosis without public leakage?
6. Are cost and timeout controls sufficient before live smoke?

If any answer is uncertain, return `modify` or `reject`; do not implement.

## 9. Verification Required Before Implementation Commit

A future implementation package must include tests for:

- endpoint allowlist acceptance/rejection;
- DNS rebinding/final-address rejection;
- IPv4/IPv6/private/loopback/link-local/reserved range blocking;
- redirect disabled or revalidated;
- proxy env bypass prevention;
- content-type and sniff mismatch rejection;
- byte cap and decompressed cap enforcement;
- timeout and cancellation outcomes;
- provider thrown errors without stack/cause leakage;
- raw URL/source/snippet/title/cache/SR/evidence/warning/verdict/report leakage rejection;
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

The package must define:

- kill switch or authority state required for provider network activation;
- activation proof;
- rollback target commit;
- runtime refresh/reseed checklist when relevant;
- no-public-leak verifier before and after activation;
- hidden artifact inspection proof.

If activation cannot be made default-closed and observable, reject the implementation package.

## 11. Reviewer Prompt

Use this prompt for deputy review:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B2_Candidate_Provider_Network_Source_Package.md` as a V2 source-IO package draft. Return `approve`, `modify`, or `reject`. Check whether it is safe to proceed to implementation of candidate-provider network calls only. Verify it does not combine content dereference, parser execution, live jobs, product/public wiring, cache IO, Source Reliability, prompt/config/model/schema changes, ACS/direct URL execution, V1 reuse, or V1 cleanup. Pay special attention to SSRF/DNS/final-address controls, redirect/proxy bypasses, response type/byte/decompression limits, timeout/cancellation semantics, hidden artifact leakage, cost controls, rollback, and whether provider SDK use is acceptable.

## 12. Current Recommendation

Current deputy recommendation before package-specific review:

- draft 7N-3B2 now;
- do not implement yet;
- do not run live canaries;
- keep 7N-3B2 candidate-provider network only;
- reserve content packet/parser for 7N-3B3;
- reserve live smoke for 7N-3C.
