# V2 Slice 6B.3c-4A Product Runtime Wiring Captain Confirmation Package

**Date:** 2026-05-14
**Status:** Captain approved; implemented as an internal direct-text runtime scaffold
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `48472b69` (`refactor: split v2 cache policy metadata`)

---

## 1. Purpose

This package asks whether to proceed with the first risky product-runtime wiring source slice after 3B3.

Captain clarification: risky but meaningful progress should be escalated for confirmation, not postponed indefinitely. The deputy team did not reach consent on source wiring, so Captain confirmation is required before code changes.

## 2. Proposed Source Slice

Name: **6B.3c-4A internal direct-text runtime wiring scaffold**.

Goal: allow the env-gated V2 shell path to invoke the existing internal direct-text Claim Understanding runtime owner in a controlled, fail-closed way, without making V2 public or complete.

This is not a cutover, not live validation, not public API/UI enablement, and not V1 cleanup.

## 3. Exact Source Envelope

Allowed source files:

- `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`
- `apps/web/src/lib/analyzer-v2/runner-ingress.ts` only if direct-text gating requires it
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `apps/web/test/unit/lib/internal-runner-v2-routing.test.ts`
- optional new focused orchestrator test

Forbidden source files:

- public API validators/controllers;
- UI components/pages;
- report/export/compatibility public schemas;
- prompt files and prompt config defaults;
- provider SDK callsites or provider factories;
- cache IO/storage;
- V1 analyzer code or prompts;
- V1 cleanup/removal files.

## 4. Behavioral Contract

Allowed behavior:

- V1 remains default.
- V2 shell remains hidden and env-gated by the existing double gate.
- Direct text only may attempt runtime dispatch.
- Runtime stage/orchestrator must build readiness internally; no caller-supplied approval snapshot.
- Missing approved provider callback must fail closed before provider work.
- Test-only injected provider callback may be used to prove the path.
- Public result remains the existing damaged pre-cutover envelope unless a separate report/result package is approved.
- Internal Claim Understanding state must not leak into persisted/public `resultJson`.

Forbidden behavior:

- no direct URL execution;
- no ACS execution;
- no public partial Claim Understanding result;
- no provider SDK import in Analyzer V2;
- no cache read/write;
- no shipped gateway policy/status mutation;
- no prompt/config source changes;
- no live jobs;
- no V1 removal.

## 5. Known Risks

| Risk | Mitigation in 4A |
|---|---|
| Product path starts real LLM work without provider ownership | No provider factory in 4A; missing provider callback fails closed. |
| Partial Claim Understanding looks like a finished report | Keep public result as damaged pre-cutover envelope; no public state exposure. |
| Direct URL is misread as body text | Direct URL must block before prompt/cache/adapter/provider work. |
| ACS snapshot ownership is still undefined | ACS remains deferred/blocked. |
| Gateway approvals are bypassed | Runtime readiness is built inside product code from a reviewed approval source; if not defined in this slice, dispatch must fail closed. |
| V1/V2 confusion increases | No UI/API public mode change and no V1 cleanup in this slice. |
| Cache is accidentally enabled | Runtime no-store only; `canRead=false`, `canWrite=false`, no cache IO. |

## 6. Required Verifiers

Minimum tests and scans before commit:

- focused runtime-stage/orchestrator/pipeline-shell tests;
- direct-text test using a Captain-defined input with injected mock provider;
- direct URL blocks before prompt/cache/adapter/provider work;
- ACS blocks/defer before prompt/cache/adapter/provider work;
- missing provider callback fails closed;
- provider failure, invalid telemetry, invalid schema, and prompt-render failure fail closed;
- public result leak guard proves no `ownerContract`, `sideEffects`, `providerTelemetry`, `cacheDecision`, `renderedPrompt`, cache key material, or adapter telemetry leaks;
- boundary guard remains green with only reviewed reachability changes;
- full Analyzer V2 unit slice;
- V2 runner routing test;
- `npm -w apps/web run build`;
- clean-room scans for V1 analyzer imports, V1 prompt/profile reuse, provider SDK imports, cache IO, public dispatch leakage, and production `executionApproved: true`;
- `git diff --check`.

No live jobs are part of 4A.

## 7. Confirmation Request

Recommended confirmation wording:

> Captain confirms that 6B.3c-4A may proceed despite deputy split review, under the exact source envelope and behavioral contract in this package. The implementation must remain env-gated, direct-text-only, fail-closed without provider callback, public-result-safe, no cache IO, no provider SDK, no ACS/direct URL execution, no live jobs, and no V1 cleanup.

If not confirmed, continue only with guard/test hardening and source-package refinement.

## 8. Implementation Record

Approval pointer:

- Checklist version/hash: `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96` in `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`.
- Source package: this file, Section 7, "Confirmation Request".
- Captain confirmation: current Codex thread, 2026-05-14, Captain reply `Ok approved as reccomended` to the recommended 6B.3c-4A proposal.
- Implementing handoff: `Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4A_Runtime_Wiring_Scaffold.md`.
- Implementing commit: `1b0ff9c2` (`feat: wire v2 direct-text runtime scaffold`); follow-up guard hardening: `531a0ff6`.

Captain approved the recommended wording on 2026-05-14. The implemented 6B.3c-4A source slice stays inside the reviewed scaffold envelope:

- `runtime-stage.ts` is the only product stage that imports the dispatch owner path.
- `orchestrator.ts` awaits the runtime stage and keeps Claim Understanding state internal.
- `pipeline-shell.ts` accepts internal scaffold options for tests and controlled callers, while normal shell calls remain unchanged.
- Direct text can run only when the scaffold option is explicitly enabled and an injected provider boundary is present.
- Missing provider boundary, direct URL, and ACS/prepared input fail or defer before prompt/cache/adapter/provider work.
- Public `resultJson`, report markdown, API/UI/report/export schemas, and V1 default routing remain unchanged.
- No provider SDK, cache storage IO, prompt/config source change, live job, direct URL execution, ACS execution, or V1 cleanup was introduced.
- A review follow-up added a boundary guard that forbids production callers outside the approved owner files from referencing scaffold option keys such as `claimUnderstandingRuntime`, keeping the executable override confined to tests/controlled harnesses until a later provider-boundary gate.

Verification completed for this package:

- focused runtime-stage, pipeline-shell, and boundary guard tests;
- full Analyzer V2 unit slice;
- V2 runner routing test;
- `npm -w apps/web run build`;
- clean-room scans for V1 analyzer imports, V1 prompt reuse in touched runtime paths, provider SDK imports, cache storage IO, public runtime leakage, and production `executionApproved: true`;
- `git diff --check`.
