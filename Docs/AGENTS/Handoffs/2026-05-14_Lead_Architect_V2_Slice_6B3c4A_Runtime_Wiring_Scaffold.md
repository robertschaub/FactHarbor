---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-4A Runtime Wiring Scaffold
**Task:** Implement the Captain-approved internal direct-text Analyzer V2 Claim Understanding runtime wiring scaffold.
**Files touched:** `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts`, `apps/web/src/lib/analyzer-v2/orchestrator.ts`, `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`, `apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts`, `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`, `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`, `Docs/WIP/2026-05-14_V2_Slice_6B3c4A_Product_Runtime_Wiring_Captain_Confirmation_Package.md`, `Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md`, `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`, `Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4A_Runtime_Wiring_Scaffold.md`, `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** `runtime-stage.ts` is now the only product-stage bridge to `executeClaimUnderstandingRuntimeDispatch(...)`. Direct text can execute only when scaffold options explicitly enable runtime dispatch and supply an injected provider boundary. ACS/prepared input remains on migration/defer behavior; direct URL, missing provider boundary, and readiness failures stop before prompt/cache/adapter/provider work. `orchestrator.ts` awaits the internal runtime state but still returns the damaged pre-cutover envelope; `pipeline-shell.ts` only passes internal options. Public API/UI/report/export surfaces and V1 routing are unchanged.
**Open items:** Real provider factory ownership, public result/report exposure, ACS/direct URL runtime execution, cache read/write, approval/status flips, live jobs, and V1 cleanup remain separate gated work. V1 remains default until V2 cutover and stabilization.
**Warnings:** The scaffold can call the prompt/model adapter path in tests or controlled callers with an injected provider callback, but no production provider SDK/factory was added. Do not wire this to live jobs or public results without a new review gate. Normal shell calls still produce the damaged pre-cutover report.
**For next agent:** Start from `runClaimUnderstandingRuntimeStage(...)` in `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts`. Boundary guards forbid production callers outside the approved owner files from referencing scaffold option keys, so adding a real caller requires a new reviewed provider-boundary gate. The safe next implementation step should either keep hardening the scaffold or design that next gate; do not add API/UI/report/export exposure or V1 cleanup in the same slice.
**Learnings:** No new role learning added.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> 3 files, 40 tests passed before final naming cleanup.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> 2 files, 36 tests passed after final naming cleanup.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 18 files, 146 tests passed after final changes.
- `npm -w apps/web run test -- test/unit/lib/internal-runner-v2-routing.test.ts` -> 4 tests passed after final changes.
- `npm -w apps/web run build` -> passed; postbuild reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- Clean-room scans reported no V1 analyzer import matches, no V1 prompt reuse in touched runtime paths, no provider SDK imports, no cache storage IO, no public runtime leak terms, no production `executionApproved: true`.
- `git diff --check` -> clean.

```text
DEBT-GUARD RESULT
Classification: introduced-regression in the first implementation attempt, limited to a TypeScript helper type after `next build`.
Chosen option: amend the existing `directRuntimeState(...)` helper type in place.
Rejected path and why: changing the state union shape or adding another helper would have increased complexity for a type-only mismatch.
What was removed/simplified: narrowed the helper status parameter to the new scaffold-state branch; then clarified the provenance helper parameter from readiness to dispatch frame.
What was added: no new behavior during the fix; the main slice added the approved internal direct-text runtime scaffold and focused tests.
Net mechanism count: unchanged for the fix; planned temporary increase for the approved scaffold, bounded by explicit options and public-result isolation.
Budget reconciliation: actual implementation stayed within the approved source/docs/test envelope; no runner-ingress, API, UI, report/export schema, prompt/config, provider SDK/factory, cache storage, live-job, or V1 cleanup files were touched.
Verification: focused runtime/boundary tests, full Analyzer V2 unit slice, V2 runner routing, build, clean-room scans, and diff checks passed after the final amendment.
Debt accepted and removal trigger: scaffold options remain temporary until the reviewed provider-boundary and public-result/cutover gates replace or remove them.
Residual debt: real provider factory ownership, ACS/direct URL runtime execution, public V2 report exposure, live validation, and V1 removal remain intentionally deferred.
```
