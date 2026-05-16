# Lead Architect Handoff: V2 C0-S2 Parser Admission Provenance Implementation

### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S2 Parser Admission Provenance Implementation
**Task:** Implement C0-S2 under the reviewed parser-admission provenance source package.

**For next agent:** C0-S2 is implementation-complete. It adds `source-acquisition-parser-worker-admission-provenance.ts` as a process-local runtime-owned sidecar and updates C0-S1 admission decisions so the C0-S1 owner marks every admitted/blocked decision. Readers accept only the exact runtime-owned object while its mark-time integrity snapshot still matches. Spread copies, JSON round trips, `structuredClone`, exact reconstructed objects, malformed marker attempts, and post-mark mutation fail closed without preserving caller-provided positive admission status.

**Approval/source context:**
- Source package: `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S2_Parser_Admission_Provenance_Source_Package.md`
- Baseline: `03f41370` (`docs: approve v2 parser admission provenance package`)
- Review status: C0-S2 package approved by Architecture, Security/runtime, and Code/package reviewers after mutation-integrity and import-direction tightening.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S2_Parser_Admission_Provenance_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S2_Parser_Admission_Provenance_Implementation.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Implementation summary:**
- Added a no-import provenance sidecar with a module-private `WeakMap<object, string>` integrity snapshot.
- C0-S1 admission now imports only the owner-only marker and marks all C0-S1 admitted/blocked decisions at creation.
- The sidecar has no runtime import back to C0-S1 and no product/public/source IO imports.
- Reader returns the exact runtime-owned decision or `null`; inspection returns either the exact owned decision or fixed `blocked_not_runtime_owned` with `admission_not_runtime_owned`, without copying caller-provided admission status.
- Marking malformed/execution-like objects does not make them readable.
- Tests prove post-mark mutation fails closed permanently for status, blocked reason, P0 identity, approval flags, no-execution fields, and null-output fields.
- Boundary guards prove owner-only marker imports are limited to the C0-S1 owner, the sidecar is not transitively reachable from product/public surfaces, and parser/source/product/Evidence/cache/SR/V1 imports remain blocked.

**Review closeout:**
- Architecture reviewer: APPROVE. Residual note: integrity snapshot validates the approved contract fields, not symbol/non-enumerable additions; acceptable for C0-S2 because consumers are constrained to the C0-S1 decision contract.
- Security/runtime reviewer: APPROVE. Confirmed process-local-only provenance, no execution approval, no parser/byte/source/product/public/live/cache/SR/storage/Evidence/prompt/config/model/schema/V1/2D-C behavior.
- Code/package reviewer: initial BLOCK because post-mark mutation tests covered only one field. Fixed inside the approved envelope by amending the existing test to cover the required mutation categories; re-review APPROVE.

**Verification passed:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm -w apps/web run build
git diff --check
```

Focused suite: 3 files, 75 tests passed. Runtime slice: 30 files, 182 tests passed. Analyzer V2 slice: 68 files, 480 tests passed. Gate validator, gate self-test, build, and diff hygiene passed.

**DEBT-GUARD COMPACT RESULT:**
- Chosen option: amend the existing provenance test in place.
- Net mechanism count: unchanged; runtime source behavior was kept.
- Verification: focused C0-S2/boundary suite and `git diff --check` passed after the review fix.
- Residual debt: none for the review blocker. The process-local/durable-authority limitation remains intentional C0-S2 scope.

**Warnings:**
- C0-S2 provenance is process-local anti-forgery only. It is not durable authority, not storage/IPC authority, not a security boundary, and not execution approval.
- Parser execution, worker spawn, byte consumption, packet/frame consumption, parsed material, source material, Evidence Lifecycle behavior, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse/cleanup, and 2D-C remain blocked.

**Learnings:** Runtime-owned provenance should combine identity with an integrity snapshot; identity alone is not enough when future gates might consume the object after mutation.
