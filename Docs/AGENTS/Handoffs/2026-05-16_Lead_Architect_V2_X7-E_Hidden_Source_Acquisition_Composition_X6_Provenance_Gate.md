# Lead Architect Handoff: V2-X7-E Hidden Source-Acquisition Composition X6 Provenance Gate

### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-E Hidden Source-Acquisition Composition X6 Provenance Gate
**Task:** Continue the V2 rebuild after X6-P by updating X7-D to consume the X6 provenance sidecar and reject copied/non-runtime-owned X6 inputs without opening source execution.

**For next agent:** X7-E is a narrow hidden hardening slice. `buildHiddenDirectTextSourceAcquisitionReadinessComposition(...)` now imports only `readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(...)` from the X6-P sidecar and fails closed as `x6_not_runtime_owned` for spread copies, JSON round trips, structured clones, and exact-shape reconstructed X6 objects. Runtime-owned blocked X6 still fails as `x6_not_completed`; malformed X6 still fails as `x6_malformed`. The composition remains no-IO, summary-only, non-executable, and non-public.

**Approval/source context:**
- Source package: `Docs/WIP/2026-05-16_V2_Slice_X7-E_Hidden_Source_Acquisition_Composition_X6_Provenance_Gate_Source_Package.md`
- Baseline: `3aec48b8` (`feat: add v2 x6 provenance guard`)
- Review context: X6-P deputy debate required this as a separate tiny follow-up so X7-D could import the provenance sidecar reader without importing the X6 harness or candidate-runtime owner.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_X7-E_Hidden_Source_Acquisition_Composition_X6_Provenance_Gate_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-E_Hidden_Source_Acquisition_Composition_X6_Provenance_Gate.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Implementation summary:**
- Added `x6_not_runtime_owned` to the X7-D blocked reason set.
- X7-D now validates X6 inputs through the X6-P sidecar reader after exact-shape/version/visibility checks and before continuing to completed/public-cutover/source-material/provider-network readiness checks.
- Focused tests now prove spread, JSON, and structured-clone copies of an otherwise valid X6 result fail closed before downstream readiness evaluation.
- Boundary guard now permits only the X6-P reader import for X7-D production source and continues to block runner/candidate-runtime/transport/factory/product/public/import drift.

**Verification passed:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
```

Result:
- Focused X7-E/X6-P/boundary suite: 3 files, 73 tests passed.
- Analyzer V2 runtime unit slice: 27 files, 165 tests passed.
- Analyzer V2 unit slice: 65 files, 460 tests passed.
- Web build passed; reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.

**DEBT-GUARD RESULT**
Classification: `incomplete-existing-mechanism`.
Chosen option: amend X7-D's existing classifier and tests.
Rejected path and why: adding another ownership/provenance mechanism would duplicate X6-P; refactoring X6 test helpers into a shared fixture would broaden the slice without changing production safety.
What was removed/simplified: no obsolete production path existed; the X7-D copied-X6 limitation is removed.
What was added: one blocked reason, one sidecar reader import, focused copied-X6 rejection tests, and boundary import allowance.
Net mechanism count: unchanged.
Budget reconciliation: actual source/test/docs scope matched the small-change plan; no flags, retries, live jobs, product wiring, or new execution path were added.
Verification: focused suite, runtime slice, analyzer-v2 slice, and build passed.
Debt accepted and removal trigger: X7-D unit fixtures use the exported owner marker to build an owned object; this remains acceptable while production guards prove only X6 imports the marker. Remove or replace with shared real-harness test fixtures if test support for runtime-owned artifacts is later standardized.
Residual debt: X6-P provenance is process-local only and must not be treated as durable authority across JSON/storage/IPC/process restart.

**Next step recommendation:**
- Keep source execution blocked. The next low-risk direct-text path should either continue with another hidden no-IO readiness/contract package or return to the reviewed parser-isolation proof lane. Any provider-network transport/factory call, real source IO, source-material population, extraction, evidence-corpus building, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup needs a separate reviewed gate.

**Warnings:**
- X7-E does not authorize live jobs. The hidden composition still has no product runner path and no source material.
- Do not treat X6-P/X7-E process-local ownership as a persisted approval mechanism.

**Learnings:** For hidden V2 handoff chains, provenance readers should be consumed at the next composition boundary as soon as the upstream owner exists; otherwise documentation can overstate copy/forge rejection.
