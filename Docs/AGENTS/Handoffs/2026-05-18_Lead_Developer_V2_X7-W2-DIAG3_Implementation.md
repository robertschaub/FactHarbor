### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-DIAG3 Sanitized Transport Phase Diagnostics Implementation

**Task:** Implement the Opus-approved DIAG3 package from `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG3_Sanitized_Transport_Phase_Diagnostics_Source_Package.md`.

**Files touched:** `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`; `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`; `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`; `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`; focused source-acquisition network tests; `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`; `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG3_Sanitized_Transport_Phase_Diagnostics_Source_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/index/handoff-index.json`.

**Implementation summary:** Added hidden enum-only `transportFailurePhase`, `transportErrorShape`, and `nodeErrorCodeCategory` fields to W2 source-acquisition network diagnostics. The fields propagate through transport diagnostics, provider attempt telemetry, and W2 product-internal artifacts. Synthetic tests use injected low-level transports only. W2 completion semantics are unchanged.

**Review:** Claude Opus 4.6 reviewed the implementation diff and returned `PASS`.

**Verifier results:**

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - PASS, 8 files / 110 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` - PASS, 43 files / 256 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` - PASS, 88 files / 621 tests.
- `npm -w apps/web run build` - PASS.
- `npm run validate:v2-gates` - PASS.
- `node scripts/validate-v2-gate-register.mjs --self-test` - PASS.
- `git diff --check` - PASS.

**Warnings:** DIAG3 ran no live jobs and does not authorize source execution. It does not add live provider calls, loopback listeners, response-body expansion, parser/cache/SR/storage, source material, EvidenceCorpus/evidence/report/verdict/warning/confidence, public output, prompt/config/model/schema changes, ACS/direct URL, or V1 work/cleanup. A later LS4-style package is required before using live evidence to observe these new fields in the product route.

**DEBT-GUARD RESULT**

Classification: `missing-capability`.
Chosen option: add bounded hidden diagnostic fields to the existing W2 diagnostic path.
Rejected path and why: changing W2 completion semantics or rerunning live jobs would not identify the structural transport phase.
What was removed/simplified: no runtime behavior removed; boundary guard was amended after the first focused verifier exposed the expected export list drift.
What was added: three enum-only hidden diagnostic fields plus tests and boundary guard contract updates.
Net mechanism count: increases, but only as non-executing hidden diagnostics inside the approved package.
Budget reconciliation: actual source/test files matched the approved DIAG3 envelope; no new retries, flags, provider paths, loopback listeners, public surfaces, or live jobs appeared.
Verification: focused tests, runtime/analyzer slices, build, V2 gate validation, gate-register self-test, and whitespace check all passed.
Debt accepted and removal trigger: rare pre-existing `transportFailureClass` union values `network_unreachable`, `host_unreachable`, and `address_family_failure` are no longer emitted by the DIAG3 enum mapping; expand only through a later reviewed enum contract if these categories become operationally important.
Residual debt: no live product-route observation yet after DIAG3; use a separate reviewed LS4 package if needed.

**For next agent:** If the next step is live confirmation, prepare a narrow LS4 package first. It should commit DIAG3, refresh runtime, run at most one Captain-defined direct-text job, and inspect only hidden artifacts/public leakage for the new enum fields. Do not change W2 success/coverage semantics in the same package.

**Learnings:** DIAG3 can increase root-cause visibility without broadening source execution. Keep status semantics and transport diagnosis separate until the hidden product-route evidence identifies the phase/category actually seen in live runtime.
