---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-4A Scaffold Review Hardening
**Task:** Address code-review concern that the 6B.3c-4A scaffold override could become a future gateway-policy bypass if production callers start passing runtime scaffold options.
**Files touched:** `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`, `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`, `Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md`, `Docs/WIP/2026-05-14_V2_Slice_6B3c4A_Product_Runtime_Wiring_Captain_Confirmation_Package.md`, `Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4A_Runtime_Wiring_Scaffold.md`, `Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4A_Scaffold_Review_Hardening.md`, `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** Kept runtime behavior unchanged because current production callers do not pass `claimUnderstandingRuntime` options. Added a boundary guard that scans production source and forbids scaffold option keys such as `claimUnderstandingRuntime`, `directTextRuntimeDispatch`, and `providerBoundary` outside the approved owner files. This confines the executable override to tests/controlled harnesses until a later reviewed provider-boundary gate.
**Open items:** Real provider factory ownership, public result/report exposure, ACS/direct URL execution, cache read/write, approval/status flips, live jobs, and V1 cleanup remain separate gated work.
**Warnings:** The new guard intentionally allows the owner files (`orchestrator.ts`, `pipeline-shell.ts`, `runtime-stage.ts`, `runtime-dispatch.ts`) to reference scaffold terms. Any future production caller that tries to pass these options will fail the boundary guard and must go through a new review gate.
**For next agent:** If implementing the next runtime step, start by deciding whether the provider-boundary gate should make the real gateway task executable or replace the test-only scaffold option path. Do not bypass this guard by adding a caller exception without a reviewed source package.
**Learnings:** No new role learning added.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> 28 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 18 files, 147 tests passed.
- `git diff --check` -> clean.

```text
DEBT-GUARD RESULT
Classification: planned-temporary-debt hardening for the approved scaffold.
Chosen option: amend the existing boundary guard to confine scaffold option use instead of changing runtime behavior.
Rejected path and why: requiring the real gateway task to be executable now would contradict the approved test/control scaffold; adding a new runtime flag would increase mechanism count.
What was removed/simplified: none.
What was added: one static production-source guard for scaffold option keys plus documentation notes.
Net mechanism count: unchanged for production behavior; guard coverage increased.
Budget reconciliation: actual changes stayed within guard/docs/handoff files; no runtime behavior, API/UI/report/export, prompt/config, provider SDK/factory, cache IO, live-job, or V1 cleanup changes.
Verification: focused boundary guard, full Analyzer V2 unit slice, and diff check passed.
Debt accepted and removal trigger: scaffold option path remains temporary until a reviewed provider-boundary/cutover gate replaces or removes it.
Residual debt: repo-wide `npm test` flake in `drain-runner-pause.integration.test.ts` remains unattributed to this V2 slice per the reviewer note.
```
