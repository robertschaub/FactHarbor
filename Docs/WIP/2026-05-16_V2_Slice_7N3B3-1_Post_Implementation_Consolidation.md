# V2 Slice 7N-3B3-1 Post-Implementation Consolidation

**Date:** 2026-05-16
**Status:** consolidated; next package may be reviewed, parser/sink source implementation still blocked
**Owner role:** Lead Architect / Captain deputy
**Implementation baseline:** `267bfb9e` (`feat: add v2 content dereference boundary`)
**Package baseline:** `fc2b4c6c` (`docs: approve v2 content dereference package`)

## 1. Outcome

7N-3B3-1 is complete as a hidden/internal content-dereference boundary.

It provides:

- a private content-dereference authority derived from valid 7N-3B2 provider-network authority;
- parent provider-network authority snapshot hash binding;
- raw-URL-free content target and budget envelopes;
- owner-created, HMAC-bound, ephemeral execution targets;
- SDK-free Node-core HTTPS content transport;
- DNS/final-address SSRF checks;
- IPv4-mapped IPv6 blocking;
- redirect denial;
- declared-vs-sniffed content-type mismatch rejection;
- streaming, compressed, and decompressed byte caps;
- timeout and abort handling;
- sanitized hidden structural diagnostics;
- exact boundary guards for the approved production and test file envelope.

It does not provide:

- parser imports or parser execution;
- content packet sink implementation;
- returned raw bytes, parsed text, extracted text, evidence items, source records, EvidenceCorpus, warnings, verdicts, confidence, or report prose;
- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- live jobs or Captain canaries;
- cache read/write/key construction;
- durable raw-content storage;
- Source Reliability import/call/score;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

## 2. Review Findings And Resolution

Initial deputy review of the implementation returned `MODIFY`. Blocking issues were resolved before commit:

1. Raw execution targets were accepted without enough owner/provenance proof.
2. The content authority was not bound tightly enough to the parent 7N-3B2 provider-network authority hash.
3. IPv4-mapped IPv6 addresses could reach the public-address path.
4. Declared content type could pass without structural sniff mismatch rejection.
5. Diagnostics could copy caller-supplied invalid ids that looked like forbidden payload or secret material.
6. The exact file envelope and public/product reachability guards needed stronger static proof.

`267bfb9e` resolved these by:

- deriving and checking the parent 7N-3B2 authority snapshot hash;
- requiring owner-branded HMAC-bound ephemeral targets before network execution;
- rejecting IPv4-mapped IPv6 addresses;
- rejecting declared/sniffed content-type mismatches;
- validating diagnostic hash-like fields with positive 64-lowercase-hex rules before copying;
- redacting invalid target, budget, and fetch identifiers in hidden diagnostics;
- tightening boundary guards around production files, tests, exports, imports, parser/sink absence, and product/public reachability.

The fix amended the existing 7N-3B3-1 mechanism. It did not add a fallback transport, retries, cache IO, Source Reliability, product wiring, public exposure, live jobs, parser/sink execution, V1 reuse, or V1 cleanup.

## 3. Verification

Verification after final fixes:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> 4 files / 70 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` -> 18 files / 103 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition` -> 4 files / 31 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 52 files / 370 tests passed.
- `npm -w apps/web run build` -> passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` -> passed.
- `git diff --cached --check` -> passed before commit.

## 4. Consolidated Deputy Decision

The next step is not parser/sink source implementation, product wiring, public exposure, or live smoke.

Read-only security and maintainability review after `267bfb9e` converged on this decision:

1. Record this post-7N-3B3-1 state.
2. Treat 7N-3B3-2 as a separate parser/sink package, not as continuation of the dereference transport.
3. First draft/review a narrower `7N-3B3-2A` parser/sink isolation and packet-sink boundary package.
4. Do not implement parser/sink source from only `source-acquisition-content-parser.ts` and `source-acquisition-content-packet-sink.ts` if real transport bytes are required.
5. If the parser/sink package must materialize bytes from the real 7N-3B3-1 transport, the approved source envelope must explicitly include a narrow edit to `source-acquisition-content-transport.ts` for an owner-only raw-byte handoff/callback while keeping public transport outcomes byte-free.

## 5. Next Package Boundary

7N-3B3-2A may be drafted for review as a docs-only parser/sink isolation package.

It may define, for review only:

- hidden, non-durable packet sink ownership;
- owner-only in-memory byte handoff rules;
- parser isolation and sandbox requirements;
- parser input/output/disposal protocol;
- exact source/test file envelopes for a later implementation;
- hidden artifact inspection proof;
- sentinel secret/file leakage tests;
- static product/public reachability guards.

It must not authorize source implementation until deputy review approves the exact package.

## 6. Stop Conditions

Stop and request review or Captain escalation before any of these:

- parser execution;
- content packet sink implementation;
- raw-byte handoff from transport to sink;
- source edits outside an exact reviewed parser/sink envelope;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs or Captain canary runs;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- evidence item, source record, EvidenceCorpus, warning, verdict, confidence, or report generation;
- prompt/config/model/schema changes;
- semantic relevance/applicability/extraction/probative/sufficiency/warning decisions;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup.

Captain-approved canaries remain reserved for a later reviewed live-smoke gate:

- `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

## 7. Debt And Follow-Up

The content transport currently exposes only sanitized structural outcomes to callers. Raw bytes remain inside the transport owner and are not available to parser/sink files.

That is the correct default for 7N-3B3-1. It also means 7N-3B3-2 cannot safely materialize real fetched bytes without a reviewed owner-only handoff design. A parser/sink implementation that fakes byte sources, bypasses transport ownership, or serializes raw bytes into hidden diagnostics would violate this consolidation.

No live validation is meaningful until there is a reviewed implementation package, committed source, runtime refresh, hidden artifact inspection proof, no-public-leak verifier, rollback path, and Captain-approved canaries in scope.
