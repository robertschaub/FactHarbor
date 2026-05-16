# Lead Architect Handoff: V2 7N-3B3-2D-A Fixture/Control Parser Runner Implementation

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2D-A Fixture/Control Parser Runner Implementation
**Task:** Implement the approved 2D-A source package for a hidden fixture/control-only parser runner protocol harness.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner.worker.cjs`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

**Key decisions:**
- Implemented only the approved 2D-A envelope from `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-A_Fixture_Control_Parser_Runner_Source_Package.md`.
- Replaced the in-process successful fixture parse path with a checked-in CommonJS child-process runner over committed fixture/control material only.
- Kept real fetched-byte parser execution blocked: the parent and worker both reject any request not matching the committed fixture id, byte count, digest, and base64 binding.
- Resolved reviewer blockers by anchoring the worker entrypoint to `import.meta.url` instead of caller CWD and by passing runtime-immutable frozen byte material into the callback.
- Preserved all non-negotiables: no product/public/API/UI/report/export wiring, no live jobs, no cache IO, no Source Reliability touch, no prompt/model/provider calls, no evidence/report/verdict semantics, no ACS/direct URL, no V1 reuse.

**Open items:**
- Real fetched-byte parser execution remains blocked until a later reviewed OS-level denial boundary package.
- Transport-owned packet/frame input remains blocked for the parser.
- Product/public/live source acquisition wiring remains blocked by later gates.
- `Docs/AGENTS/Agent_Outputs.md` already contained unrelated local modifications, so this handoff was created without adding a new index row in that file.

**Warnings:**
- The worker is a fixture/control protocol harness, not a malicious-code sandbox. Do not extend it to real fetched bytes without the later isolation gate.
- The protocol intentionally duplicates fixture/control byte bindings in parent and worker to reject arbitrary caller-supplied bytes from either entrypoint.
- The checked-in worker is intentionally dependency-free CommonJS. Do not add imports, env/cwd/argv reads, dynamic execution, transport access, or V1 references.

**For next agent:**
- Treat 2D-A as implemented and reviewer-cleared if the commit containing this handoff is present.
- The next safe work is a docs/contract gate such as the machine-readable V2 gate register or the next reviewed source-acquisition package. Do not start real fetched-byte parser execution, product wiring, or live jobs from this slice.
- Preserve the focused verifier set when touching 2D-A: parser, packet sink, protocol, boundary guard, analyzer-v2-runtime, source-acquisition, analyzer-v2, build, `git diff --check`, and source scans.

**Learnings:** Not appended to `Role_Learnings.md`; the durable takeaway is in this handoff.

## Verification
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - Passed: 4 files, 79 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - Passed: 21 files, 131 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port`
  - Passed: 4 files, 31 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - Passed: 55 files, 398 tests.
- `npm -w apps/web run build`
  - Passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check`
  - Passed.
- Production V2 source scans for V1 analyzer imports, V1 prompt reuse, seeded prompt profiles, model execution APIs, `as any`, and worker forbidden text:
  - Passed.

## Reviewer Clearance
- Security reviewer: `PASS` after the worker path was changed from caller CWD to module-sibling `import.meta.url` resolution and a forged-CWD worker regression test was added.
- Architecture reviewer: `PASS` after fixture-runner material was changed to a frozen plain byte array with a mutation-failure test.
- Runtime reviewer: `PASS` before the last amendment; no remaining runtime findings after the broader local verifier suite.

## Debt-Guard Result
```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend
Rejected path and why: adding a configurable worker path or parallel callback convention would increase mechanism count and risk; the existing runner and packet-sink mechanisms could carry the fix.
What was removed/simplified: CWD-based worker resolution and compile-time-only byte immutability.
What was added: module-sibling worker resolution, frozen callback byte material, and focused regression tests for forged CWD and mutation failure.
Net mechanism count: unchanged
Budget reconciliation: stayed within protocol source/test, packet sink/test, parser/test, and boundary-guard scope; no new product path, flags, fallbacks, prompts, providers, cache IO, or live behavior.
Verification: focused 2D-A tests, analyzer-v2-runtime, source-acquisition slice, analyzer-v2 suite, build, diff check, and source scans all passed.
Debt accepted and removal trigger: none for the reviewer blockers.
Residual debt: fixture/control runner must not be extended to real fetched bytes until a later reviewed OS-level denial boundary package exists.
```
