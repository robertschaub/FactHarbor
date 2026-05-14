---
date: 2026-05-14
role: Lead Architect
agent: Codex (GPT-5)
task: V2 Slice 6B.3c-4C2a Provider Runtime Config Contract
status: complete
open_items: yes
topics:
  - v2
  - slice
  - 6b3c4c2a
  - provider-runtime-config
  - provenance
  - clean-room
files_touched:
  - apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract.ts
  - apps/web/test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract.test.ts
  - apps/web/test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.test.ts
  - apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
  - Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md
  - Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md
  - Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md
  - Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md
  - Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4C2a_Runtime_Config_Contract.md
---

# V2 Slice 6B.3c-4C2a Provider Runtime Config Contract

## Summary

Implemented the approved 4C2a inert provider runtime config/provenance contract. The new contract validates a supplied V2 task-policy/config snapshot for Claim Understanding provider runtime use, but it does not read config, import SDKs, create callbacks, render prompts, call adapters, wire product paths, flip approvals, enable cache IO, expose public fields, run live jobs, or clean V1.

## Approval Pointer

- Package: `Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md`, Section 4.
- Checklist: `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`.
- Approval body/date: deputy-team review of the 4C2 package in the current Codex thread on 2026-05-14.
- Approval outcome: LLM/runtime reviewer `APPROVE for 4C2a only`, clean-room/security challenger `APPROVE`, implementation architect `APPROVE for 4C2a only`.
- Implementing commit: pending until source commit is created; record with a follow-up traceability update.

## Changes

- Added `claim-understanding-provider-runtime-config.contract.ts` under `apps/web/src/lib/analyzer-v2-runtime/`.
- Added validation for V2 task-policy/config snapshot authority, provider/model/config identity, retry/call budgets, execution-authority separation, provider construction state, structural-only retry semantics, direct-text-only scope, no cache IO, internal-only posture, and complete telemetry contract.
- Updated provider-boundary tests to prove the ownership contract and runtime config contract agree on policy inputs.
- Updated boundary guards to keep the new runtime config contract imports inert and limited.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed 3 files / 45 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed 20 files / 164 tests.
- `npm -w apps/web run build` passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged`.
- Production static scans found no provider SDK imports, no V1 analyzer/`llm.ts` imports, no cache/config IO, no executable status construction, no `executionApproved: true`, and no scaffold option pass-through in product callers.
- `git diff --check` passed.

## Open Items

- 4C2b provider factory remains unapproved and requires a separate deputy review before source.
- The authoritative runtime config retrieval/storage source remains open for later factory/product wiring. 4C2a validates a supplied snapshot shape only.
- Live jobs remain not meaningful until a later 4C3 hidden direct-text runtime artifact gate.

## Warnings

- Do not import this contract from product callers or public surfaces before a later product-hidden wiring gate.
- Do not treat `approval.status: "approved"` inside the snapshot as execution approval. Execution still requires real gateway task executable state with approved prompt/model/cache policy.

## For Next Agent

If continuing, prepare or review 4C2b as a separate clean-room provider factory gate. Do not add SDK imports, factory construction, product injection, approval flips, cache IO, public exposure, or live jobs under the 4C2a approval.

## Learnings

Separating config provenance from provider construction keeps the authority boundary testable: we can validate the future provider snapshot shape before any SDK code exists.
