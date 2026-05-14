---
date: 2026-05-14
role: Lead Architect
agent: Codex (GPT-5)
task: V2 Slice 6B.3c-4C1 Approval-Authority Cleanup
status: complete
open_items: yes
topics:
  - v2
  - slice
  - 6b3c4c1
  - approval-authority
  - runtime-gate
  - clean-room
files_touched:
  - apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts
  - apps/web/src/lib/analyzer-v2/claim-understanding/runtime-dispatch.ts
  - apps/web/src/lib/analyzer-v2/orchestrator.ts
  - apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts
  - apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-dispatch.test.ts
  - apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts
  - apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
  - Docs/WIP/2026-05-14_V2_Slice_6B3c4C_Provider_Source_Wiring_Approval_Package.md
  - Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md
  - Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md
  - Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md
  - Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4C1_Approval_Authority_Cleanup.md
---

# V2 Slice 6B.3c-4C1 Approval-Authority Cleanup

## Summary

Implemented the 4C1 cleanup that prevents the 4A scaffold from becoming product/live approval authority. Product/orchestrator callers can no longer pass `claimUnderstandingRuntime` scaffold options, `runtime-dispatch.ts` no longer creates a private executable gateway-task clone, and runtime dispatch fails closed unless the real shipped `claim_understanding_gate1` task is executable through real prompt/model/cache policy.

This did not add provider factory code, provider SDK imports, public API/UI/report/export exposure, cache IO, ACS/direct URL runtime execution, approval/status flips, prompt/config edits, live jobs, or V1 cleanup.

## Approval Pointer

- Package: `Docs/WIP/2026-05-14_V2_Slice_6B3c4C_Provider_Source_Wiring_Approval_Package.md`, Section 4.
- Checklist: `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`.
- Approval body/date: deputy-team review in the current Codex thread on 2026-05-14.
- Approval outcome: LLM/runtime reviewer `APPROVE`, clean-room/security challenger `APPROVE`, implementation architect `MODIFY`; consolidated approval allowed 4C1 after expanding the source envelope to include `orchestrator.ts`, `pipeline-shell.ts`, and `pipeline-shell.test.ts` and requiring executable-clone removal/neutralization.
- Captain policy context: continue if clear and low risk; use the deputy team at decision points unless high risk or no consent.
- Implementing commit: `0aa31d4`.

## Changes

- `runtime-stage.ts` now builds a runtime approval snapshot only from the real gateway task when prompt/model/cache approvals are all real approved policy metadata.
- `runtime-dispatch.ts` checks `canExecuteAnalyzerV2GatewayTask(getAnalyzerV2GatewayTask("claim_understanding_gate1"))` before prompt rendering, cache-decision construction, adapter invocation, or provider callback use.
- Removed the private executable gateway-task clone helper from `runtime-dispatch.ts`.
- `orchestrator.ts` now passes only run-context options into Claim Understanding runtime stage; it does not pass scaffold provider options.
- Tests now prove scaffold options cannot bypass the shipped blocked gateway, and boundary guards reject product caller scaffold option references plus any production executable gateway-task state construction.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts test/unit/lib/analyzer-v2/claim-understanding/runtime-dispatch.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed 4 files / 55 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed 19 files / 156 tests.
- `npm -w apps/web run build` passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged`.
- Static scans found no scaffold approval id, no private executable clone helper, no `status: "executable"` construction in runtime dispatch/stage, and no scaffold option pass-through in product callers.
- `git diff --check` passed.

## Open Items

- 4C2 provider factory wiring remains unapproved and requires a separate reviewed gate.
- Live jobs are still not meaningful for 4C1 because the slice intentionally keeps the real shipped gateway task blocked and adds no provider factory.
- V1 cleanup remains blocked until V2 owns the equivalent public path and the cleanup ledger/cutover gates pass.

## Warnings

- Future agents must not treat the internal owner tests as product runtime approval. The only product/live authorization path after 4C1 is real gateway policy executable state.

## For Next Agent

Use 4C1 as a safety cleanup baseline. If proposing 4C2, start from a docs/review package for a clean-room provider factory outside `apps/web/src/lib/analyzer-v2/`; keep provider SDK imports outside Analyzer V2 and keep public exposure, cache IO, ACS/direct URL execution, live jobs, approval flips, and V1 cleanup out unless the new package explicitly approves them.

## Learnings

Approval traces need to name both the package section and the deputy-team decision that changed a slice from proposed to implemented. Otherwise later reviewers can mistake a safety cleanup for a gate bypass.
