---
date: 2026-05-15
role: Lead Architect
agent: Codex (GPT-5)
task: V2 Slice 6B.3c-4C2b Provider Factory Source
status: complete
open_items: yes
topics:
  - v2
  - slice
  - 6b3c4c2b
  - provider-factory
  - source
  - clean-room
files_touched:
  - apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts
  - apps/web/test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-factory.test.ts
  - apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
  - Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md
  - Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md
  - Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md
  - Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_6B3c4C2b_ReReview_Consolidation.md
  - Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_6B3c4C2b_Provider_Factory_Source.md
---

# V2 Slice 6B.3c-4C2b Provider Factory Source

## Summary

4C2b provider factory source is complete at `7f6f310a` under `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1`. The slice adds one clean-room provider factory outside Analyzer V2, one focused test file, and a boundary-guard update that allows provider SDK imports only in the factory file.

The factory is intentionally not product-wired. It creates an injected provider callback compatible with the V2 Claim Understanding model adapter, but no product caller, runtime stage, public surface, approval state, cache path, ACS/direct URL path, or live job can reach it.

## Approval Traceability

- Source baseline: `8a33e38c` (`docs: define v2 provider factory gate contract`).
- Approval package: `Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md` Sections 5.1 and 5.1.1.
- Checklist: `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`.
- Approval body/date: deputy-team source review in the current Codex thread on 2026-05-15.
- Approval outcome: three deputy reviewers returned `APPROVE` for the narrow factory-only source envelope.
- Captain policy context: continue if clear and low risk; use the deputy team for decision points unless there is no consent or a high-risk Captain decision is required.
- Implementing commit: `7f6f310a` (`feat: add v2 provider factory source`).

## Implemented Behavior

- `buildClaimUnderstandingProviderFactory(snapshot, options)` validates a supplied `ClaimUnderstandingProviderRuntimeConfigSnapshot`.
- The snapshot must be `executionState: "factory_only_not_product_wired"` and `providerId: "anthropic"`.
- The factory imports only `ai` and `@ai-sdk/anthropic`, only in `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts`.
- The factory returns a `ClaimUnderstandingProviderCall` for the existing V2 model adapter.
- Each adapter attempt maps to one `generateText` call with `maxRetries: 0`; structural retry remains owned by the model adapter.
- The provider request must match the validated snapshot for model policy, schema version, and call budget before SDK dispatch.
- Token usage and duration telemetry must be real provider/runtime values; missing usage is rejected rather than fabricated.
- Provider errors are sanitized before entering the adapter failure path.

## Still Forbidden

- product/orchestrator/runtime-stage/runtime-dispatch wiring;
- prompt/model/cache approval flips or executable gateway construction;
- public API/UI/report/export exposure;
- cache read/write/storage IO;
- ACS/direct URL execution;
- live jobs;
- V1 analyzer, prompt, helper, model resolver, or provider helper reuse;
- V1 cleanup/removal.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-factory.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed 4 files / 55 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts` passed 1 file / 7 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime` passed 21 files / 176 tests.
- `npm -w apps/web run build` passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged`.
- Static scans confirmed provider SDK imports exist only in `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts`.
- Static scans confirmed no V1 analyzer import, V1 prompt reuse, config/cache IO, runtime-dispatch import, prompt-loader import, `process.env`, or executable gateway construction in the factory source.
- `git diff --check` passed.

## DEBT-GUARD RESULT

Classification: missing capability for the approved source; failed-verifier amendments were incomplete existing mechanism issues in the boundary guard and TypeScript narrowing.

Chosen option: add the approved factory source, then amend the existing boundary guard and token-count type guard for the failed verifiers.

Rejected path and why: no product wiring, config/cache IO, retry/fallback/semantic repair, or V1 helper reuse. Existing V1 provider helpers remain rejected by the clean-room boundary.

What was removed/simplified: the factory-absence guard was replaced by an exact one-file SDK import allowlist.

What was added: one provider factory, one focused test file, and one guard allowlist.

Net mechanism count: increases by one bounded provider factory, intentionally not product-wired.

Budget reconciliation: actual source diff stayed inside the approved envelope; documentation and handoff updates only record the completed boundary.

Verification: focused 4C2b tests, model-adapter regression test, full Analyzer V2/runtime unit slice, web build, static scans, and `git diff --check` passed.

Debt accepted and removal trigger: the factory-only state and path naming remain until 4C3 product activation and later cutover normalize runtime naming. The factory is not product-wired.

Residual debt: authoritative runtime config snapshot storage/retrieval and the 4C3 activation UI/admin gate remain unresolved for product wiring.

## For Next Agent

The next low-risk step is a 4C3 approval package, not direct source wiring. A 4C3 proposal must decide product-owned activation authority, hidden direct-text artifact routing, public leak guards, rollback behavior, runtime refresh discipline, and the first live-smoke plan before any product caller can use the factory.

Do not run live jobs until 4C3 is reviewed, committed, and runtime refreshed. Do not clean V1 as part of 4C3 unless a separate cutover/cleanup gate explicitly approves it.
