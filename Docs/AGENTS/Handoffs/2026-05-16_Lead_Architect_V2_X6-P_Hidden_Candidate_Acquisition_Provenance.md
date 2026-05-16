# Lead Architect Handoff: V2-X6-P Hidden Candidate-Acquisition Provenance

### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X6-P Hidden Candidate-Acquisition Provenance
**Task:** Continue the V2 rebuild after X7-D by closing X7-D's documented copied-X6 provenance limitation without changing X6 execution behavior or crossing into source execution.

**For next agent:** X6-P adds a provenance-only sidecar for X6 hidden candidate-acquisition harness results. `runHiddenDirectTextCandidateAcquisitionHarness(...)` now marks every returned completed or blocked result in a module-private `WeakSet`; spread copies, JSON round trips, and structured clones are not owned. This is in-process provenance only, not durable provenance. X6-P does not update X7-D to consume the reader yet and does not authorize provider-network execution, real source IO, product/public/live wiring, source material, evidence, warnings, verdicts, confidence, reports, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup.

**Approval/source context:**
- Source package: `Docs/WIP/2026-05-16_V2_Slice_X6-P_Hidden_Candidate_Acquisition_Provenance_Source_Package.md`
- Baseline: `4fd26c0f` (`feat: add v2 source acquisition readiness composition`)
- Review result: three-agent deputy debate approved the hardening only as a sidecar split. Architect reviewer required no X7-D source edit in this slice to avoid importing the X6 harness/candidate-runtime dependency into X7-D.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_X6-P_Hidden_Candidate_Acquisition_Provenance_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X6-P_Hidden_Candidate_Acquisition_Provenance.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Implementation summary:**
- Added `hidden-direct-text-candidate-acquisition-harness-provenance.ts` with module-private `WeakSet<object>`.
- Exported a runtime-owned result type, owner-only mark function, `is...` predicate, and `read...` reader.
- X6 harness marks completed and blocked results before returning them.
- The sidecar reader checks WeakSet ownership plus exact result shape/current-state basics.
- Boundary guard proves only X6 imports the mark function and the sidecar imports no candidate runtime, network/content/parser, provider SDK, cache/SR/storage, product/public, prompt/config/model/schema, or V1 modules.

**Verification passed:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
```

Result:
- Focused X6-P/X7-D/boundary suite: 3 files, 72 tests passed.
- Analyzer V2 runtime unit slice: 27 files, 164 tests passed.
- Analyzer V2 unit slice: 65 files, 459 tests passed.
- Web build passed; reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.

**Next step recommendation:**
- Draft a tiny follow-up package for X7-D to import only the provenance sidecar reader and reject non-runtime-owned X6 inputs as `x6_not_runtime_owned`.
- Do not combine that with source execution, provider-network transport/factory calls, live jobs, source material, evidence corpus, or product/public wiring.

**Warnings:**
- WeakSet provenance is process-local only. JSON/storage/IPC/process-reload copies must fail closed and must not be treated as durable authority.
- The owner-only mark function is exported for module ownership but must remain imported only by the X6 harness.

**Learnings:** Keep provenance sidecars dependency-light. A reader placed in the X6 harness would have pulled candidate-runtime coupling into downstream consumers; a sidecar preserves the clean boundary.
