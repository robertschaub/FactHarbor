---
date: 2026-05-14
role: Lead Architect
agent: Codex (GPT-5)
task: V2 Slice 6B.3c-4B Provider Boundary Ownership Contract
status: complete
open_items: yes
topics:
  - v2
  - slice
  - 6b3c4b
  - provider-boundary
  - clean-room
files_touched:
  - apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.ts
  - apps/web/test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.test.ts
  - apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
  - Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md
  - Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md
  - Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md
  - Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4B_Provider_Boundary_Ownership_Contract.md
  - Docs/AGENTS/Agent_Outputs.md
---

# V2 Slice 6B.3c-4B Provider Boundary Ownership Contract

## Summary

After a diverse provider-boundary debate, the reconciled verdict was `MODIFY`: provider ownership is the next architectural problem, but real product-owned provider callback construction is still one step too early. The stronger risk argument was that the current runtime path still uses scaffolded approval/executable state, and the existing provider/model construction surfaces are V1-contaminated or scattered.

Implemented only an inert ownership contract under `apps/web/src/lib/analyzer-v2-runtime/`. This makes the future provider factory reviewable without wiring any runtime path.

Governance pointer: this slice follows `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96` in `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`. It did not require Captain approval because it was contract-only and added no runtime activation, public exposure, provider factory, cache IO, live jobs, approval flips, or V1 cleanup. The deputy-team decision source is the debate consolidation recorded in this handoff.

## Key Decisions

- 6B.3c-4B is not provider wiring.
- The contract records the future provider factory's owner identity, policy input shape, V2 config snapshot requirements, direct-text-only scope, raw-output-plus-telemetry output contract, and forbidden states.
- The contract blocks product reachability, activation approval, SDK import, callback creation, V1/legacy provider reuse, non-direct-text execution, cache IO, public exposure, wrong gateway task, invalid retry budgets, and incomplete telemetry ownership.
- Boundary guards now prove `analyzer-v2-runtime` is not imported by production callers, does not import provider SDKs/V1 analyzer/cache IO/prompt-loader/runtime-dispatch, and does not reference the 6B.3c-4A scaffold option keys.
- Live jobs were not run because this slice intentionally adds no runtime behavior.

## Debate Consolidation

| Role | Verdict | Reason |
|---|---|---|
| Implementation advocate | FOR real provider source slice | Correctly identified provider ownership as the next useful seam. |
| Clean-room challenger | AGAINST source wiring now | Existing provider helpers are V1-adjacent, and approval authority is still unresolved. |
| LLM/cost reviewer | CONTRACT FIRST | Live jobs now would test harness plumbing, not quality or cost. |
| Reconciler | MODIFY | Implement inert provider-boundary ownership contract first. |

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.test.ts` -> 2 files, 37 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 19 files, 156 tests passed.
- `npm -w apps/web run build` -> passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged`.
- `git diff --check` -> clean.

## Open Items

- Real provider factory construction remains blocked.
- The next source-wiring gate must resolve executable approval source, V2 config snapshot ownership, SDK import location, direct-text-only runtime entry, rollback/failure behavior, and live-job smoke plan.
- No public API/UI/report/export exposure, cache IO, ACS/direct URL runtime dispatch, approval/status flips, prompt/config changes, live jobs, or V1 cleanup is approved by this slice.

## For Next Agent

If continuing implementation, start with a reviewed source-wiring package for the real provider factory and reference `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` or its successor. Do not bypass this contract by adding a product caller exception or reusing `apps/web/src/lib/analyzer/llm.ts`; that would violate the clean-room boundary. Live jobs become meaningful only after a committed/refreshed source-wiring slice produces a real hidden V2 direct-text artifact without scaffold-only injection.

## Learnings

No new role learning added.
