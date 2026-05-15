---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 4C3b Hidden Direct-Text Wiring
**Task:** Implement approved 4C3b source wiring exactly under `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3b_Hidden_Direct_Text_Wiring_Approval_Package.md`.

**Files touched:** `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-runtime-activation.ts`, `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.ts`, `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract.ts`, `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts`, `apps/web/src/lib/analyzer-v2/run-context.ts`, `apps/web/src/lib/analyzer-v2/orchestrator.ts`, `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts`, focused V2/runtime tests, boundary guards, and 4C3 documentation.

**Key decisions:** Captain confirmation was received on 2026-05-15 with the approval wording from the 4C3b package. The source wiring keeps activation product-owned and default-closed. `claim-understanding-runtime-activation.ts` is the only owner that can construct executable gateway state and create a provider boundary. The hidden artifact sink is V2-owned in-memory `v2_observability_ledger`; existing job events/history remain rejected for hidden artifacts.

**Open items:** 4C3c live smoke is still blocked until this source state is committed, runtime is refreshed, and the hidden artifact can be inspected without public leakage. Cache IO, public API/UI/report/export/compatibility exposure, ACS/direct URL execution, shipped approval flips, prompt/config changes, broad product activation, and V1 cleanup remain blocked by later gates.

**Warnings:** Default activation remains `kill_switch_closed`; an enabled snapshot must be intentionally supplied through the product-owned activation snapshot path. Do not add public pointers to hidden artifacts. Do not treat the in-memory sink as durable product persistence. The next live smoke must commit first and refresh runtime before job submission.

**For next agent:** Continue with 4C3c only if the task is specifically a committed/runtime-refreshed live smoke gate. Re-read the 4C3b package, `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1`, `claim-understanding-runtime-activation.ts`, `runtime-stage.ts`, and `boundary-guard.test.ts` before widening activation. Preserve direct-text-only scope unless a later gate explicitly names ACS or direct URL execution.

**Learnings:** no new durable role learning appended.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/lib/internal-runner-v2-routing.test.ts` passed 25 files / 201 tests.
- `npm -w apps/web run build` passed; postbuild prompt/config reseed reported no changes.
- `git diff --check` passed.
- Static scans found provider SDK imports only in `claim-understanding-provider-factory.ts`, no forbidden cache/config/job-history IO in the activation path, and no public-surface activation/hidden-artifact leakage.
- No live jobs were submitted in 4C3b.

DEBT-GUARD COMPACT RESULT
Chosen option: amend the existing `directRuntimeState` helper return type after build found a TypeScript union narrowing issue.
Net mechanism count: unchanged.
Verification: focused runtime-stage test passed; full V2/runtime/routing test slice passed; web build passed.
Residual debt: none from the fix; 4C3c remains the live-smoke gate.
