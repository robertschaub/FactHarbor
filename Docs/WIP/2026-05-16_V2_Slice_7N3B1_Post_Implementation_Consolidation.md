# V2 Slice 7N-3B1 Post-Implementation Consolidation

**Date:** 2026-05-16
**Status:** consolidated; next package may be drafted, implementation still blocked
**Owner role:** Lead Architect / Captain deputy
**Implementation baseline:** `878ba6ba` (`feat: add v2 candidate acquisition runtime shell`)
**Hardening baseline:** `3d05583e` (`fix: harden v2 candidate acquisition runtime shell`)
**Documentation baseline:** `3d8573ea` (`docs: record v2 candidate runtime hardening`)

## 1. Outcome

7N-3B1 is complete as a hidden/runtime-only candidate acquisition shell.

It provides:

- a package-scoped 7N-3B1 candidate-runtime authority derived from valid 7N-3A provenance;
- structural provider allowlist and budget validation;
- an injected provider boundary only;
- hidden opaque candidate records;
- exact per-query outcome accounting;
- provider timeout outcomes;
- no module-level candidate cache;
- boundary guards against V1 reuse, provider SDK/direct network imports, cache/SR imports, and product/public reachability.

It does not provide:

- concrete provider SDK imports;
- direct `fetch(...)` or provider HTTP callback construction;
- credentials or endpoint URL construction;
- arbitrary URL dereference;
- content packet fetching;
- parser execution;
- cache IO;
- Source Reliability integration;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, or helper reuse;
- V1 cleanup.

## 2. Review Findings And Resolution

Post-implementation code review found four containment issues:

1. Child 7N-3B1 authority hashes were not bound to the parent 7N-3A snapshot hashes.
2. `providerAttemptId` could carry raw URL or secret-like text into internal decisions.
3. Non-success provider outcomes could still carry candidates.
4. Provider timeout was advisory rather than enforced by the runtime shell.

`3d05583e` resolved these by:

- requiring 7N-3B1 authority hashes to match parent 7N-3A `configSnapshot` hashes at creation and validation time;
- requiring opaque `ATT_<digits>` provider attempt ids;
- rejecting candidates on non-success provider outcomes;
- racing injected provider calls against the configured provider timeout.

The fix amended the existing shell and validators. It did not add a second mechanism, new flag, retry path, provider IO, product path, or public exposure.

## 3. Verification

Verification after hardening:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts` -> 2 files / 15 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` -> 11 files / 72 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 45 files / 335 tests passed.
- `npm -w apps/web run build` -> passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` and `git diff --cached --check` -> passed.

Independent read-only next-step review also reran the focused candidate runtime plus boundary guard suite and reported 3 files / 66 tests passed.

## 4. Consolidated Deputy Decision

The next step is not implementation of source IO and not live smoke.

Consolidated reviewer recommendation:

1. Record this post-7N-3B1 state.
2. Draft a separate reviewed source package for 7N-3B2 candidate-provider network implementation.
3. Keep 7N-3B2 scoped to candidate-provider network calls only.
4. Do not combine 7N-3B2 with content dereference/parser execution, hidden live smoke, cache/SR integration, or product wiring.

## 5. Next Package Boundary

7N-3B2 may be drafted for review as a candidate-provider network source package.

It may propose one narrow capability:

- fixed, allowlisted candidate-provider API calls;
- hidden candidate records only;
- no arbitrary URL dereference;
- no content packets;
- no parser;
- no live jobs;
- no product/orchestrator wiring.

The package must decide whether it can safely use any provider SDK. If SDK behavior hides redirects, DNS, proxies, final connected addresses, response limits, or cancellation, it is not acceptable for 7N-3B2.

## 6. Stop Conditions

Stop and request review or Captain escalation before any of these:

- provider SDK import;
- direct `fetch(...)`;
- HTTP callback construction;
- credential read;
- endpoint URL construction;
- arbitrary URL dereference;
- content packet creation;
- parser execution;
- cache read/write/key construction;
- Source Reliability import/call/score;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup;
- live job or Captain canary run.

Captain-approved canaries remain reserved for a later reviewed 7N-3C live-smoke gate:

- `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

## 7. Debt And Follow-Up

Bounded duplication in the 7N-3B1 shell is acceptable for now because it keeps the authority boundary independent and reviewable.

Before concrete provider-network implementation, 7N-3B2 reviewers must either:

- consolidate duplicated structural validators into a V2-owned helper, or
- explicitly accept continued duplication with a maintenance reason and tests.

No live validation is meaningful until there is a reviewed implementation package, committed source, runtime refresh, hidden artifact inspection proof, no-public-leak verifier, and rollback path.
