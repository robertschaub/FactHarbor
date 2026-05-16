# V2 Slice 7N-3B2 Post-Implementation Consolidation

**Date:** 2026-05-16
**Status:** consolidated; next package may be drafted, implementation still blocked
**Owner role:** Lead Architect / Captain deputy
**Implementation baseline:** `54b8af1a` (`feat: add v2 provider network boundary`)
**Documentation baseline:** `b3df3190` (`docs: record v2 provider network boundary`)

## 1. Outcome

7N-3B2 is complete as a hidden/internal candidate-provider network boundary.

It provides:

- a private provider-network authority derived from valid 7N-3B1 candidate-runtime authority;
- structural raw-URL-free endpoint and budget snapshots;
- SDK-free Node-core HTTPS transport;
- DNS/final-address SSRF checks, redirect denial, IDNA normalization, proxy-bypass posture, and socket-address validation;
- declared, streaming, decompressed, per-call, and total budget limits;
- timeout and `AbortSignal` handling for DNS and provider calls;
- sanitized hidden diagnostics;
- an adapter back into the existing 7N-3B1 injected provider boundary.

It does not provide:

- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs or Captain canaries;
- public V2 result exposure;
- cache read/write/key construction;
- Source Reliability import/call/score;
- content packet dereference;
- parser execution;
- evidence corpus, evidence item, source record, warning, verdict, confidence, or report generation;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, or helper reuse;
- V1 cleanup.

## 2. Review Findings And Resolution

The first package review returned `MODIFY`. The package was tightened before implementation to require exact source/test files, exact import/export guards, SDK-free Node-core transport, structural raw-URL-free endpoint snapshots, a concrete default-closed provider-network authority, redirect denial, and leakage/security tests.

Post-implementation deputy review then returned `MODIFY` on four implementation issues:

1. Transport success outcomes carried raw parsed provider JSON.
2. Gzip decompression was capped only after full decompression.
3. DNS resolution was not timeout/abort bounded.
4. The factory accepted budget fields but did not enforce provider/query/total limits before dispatch.

`54b8af1a` resolved these by:

- removing raw parsed provider JSON from returned transport outcomes;
- returning only sanitized structural outcome data and `candidateCount`;
- enforcing decompression caps during streaming inflate;
- wrapping DNS resolution with timeout/abort handling;
- passing an `AbortSignal` into provider transport calls;
- enforcing provider count, per-provider query count, per-query timeout, and total-network budget before dispatch.

The fix amended the existing 7N-3B2 mechanism. It did not add a fallback transport, retries, cache IO, Source Reliability, product wiring, public exposure, live jobs, parser execution, V1 reuse, or V1 cleanup.

## 3. Verification

Verification after hardening:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> 16 files / 141 tests passed.
- `npm -w apps/web run build` -> passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` -> passed.
- `git diff --cached --check` -> passed before the implementation and documentation commits.

Read-only deputy review after consolidation agreed that 7N-3B2 is cleanly network-only and stable enough to draft a separate 7N-3B3 docs package.

## 4. Consolidated Deputy Decision

The next step is not source implementation, product wiring, public exposure, or live smoke.

Consolidated reviewer recommendation:

1. Record this post-7N-3B2 state.
2. Draft a separate reviewed 7N-3B3 package for content packet and parser boundary design.
3. Keep 7N-3B3 docs-only until deputy review approves a concrete source package.
4. Do not combine 7N-3B3 with live smoke, product/public wiring, cache/SR integration, evidence extraction, or V1 cleanup.

## 5. Next Package Boundary

7N-3B3 may be drafted for review as a content packet and parser boundary package.

It may define, for review only:

- a new content-dereference authority separate from the 7N-3B2 provider-network authority;
- raw-URL-free content target envelopes;
- hidden content packet envelope shape;
- parser isolation requirements;
- byte/time/memory/disposal limits;
- no-public-leak verifier requirements;
- rollback and kill-switch requirements.

It must not authorize implementation until the package is reviewed and approved.

## 6. Stop Conditions

Stop and request review or Captain escalation before any of these:

- source edits implementing content fetch or parser execution;
- reusing the 7N-3B2 provider-network authority as content-dereference authority;
- arbitrary URL dereference;
- provider-returned raw URL execution;
- parser package imports or subprocess/browser/worker execution;
- cache read/write/key construction or durable raw content storage;
- Source Reliability import/call/score;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- prompt/config/model/schema changes;
- semantic relevance/applicability/extraction/probative/sufficiency/warning/verdict/report behavior;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup;
- live job or Captain canary run.

Captain-approved canaries remain reserved for a later reviewed 7N-3C live-smoke gate:

- `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

## 7. Debt And Follow-Up

7N-3B2 intentionally keeps provider-network code hidden/internal and candidate-only. This is acceptable because it prevents content/parser scope from entering through a network-only gate.

7N-3B3 must explicitly prevent:

- semantic leakage from title, snippet, provider rank, URL/domain, language metadata, or content length;
- deterministic applicability, relevance, probative-value, sufficiency, or warning decisions;
- raw payload leakage through hidden diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, or `console.*`;
- parser/network/cache/SR/product/public authority creep.

No live validation is meaningful until there is a reviewed implementation package, committed source, runtime refresh, hidden artifact inspection proof, no-public-leak verifier, rollback path, and Captain-approved canaries in scope.
