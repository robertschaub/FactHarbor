---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 Slice 7N-3B3-2C-A Hidden Real-Byte Handoff Source
**Task:** Implement approved V2 Slice 7N-3B3-2C-A: hidden transport-owner real bytes into the packet sink, with public transport outcomes still byte-free and parser consumption still blocked.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C-A_Real_Byte_Handoff_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

**Key decisions:**
- Implementation commit: `09c66527` (`feat: add v2 hidden content byte handoff`).
- The public `executeSourceAcquisitionContentTransport(...)` contract stays byte-free.
- The positive hidden handoff path is `executeSourceAcquisitionContentTransportPacketHandoff(...)`, default-closed unless `transportPacketHandoffMode` is explicitly `enabled_hidden_transport_to_sink_7n3b3_2c_a`.
- A distinct 2C-A transport packet sink authority was added with `realTransportBytes: true` and product/public/cache/storage/SR/semantic capabilities false.
- Real bytes are sealed into HMAC/provenance-bound transport-owned frames and immediately materialized plus disposed on the accepted 2C-A terminal path; no parser receives real fetched bytes.
- Review-driven amendment: the first P1 review found that a hidden byte-state factory attached to the exported seal function could be reached by importers. That path was removed. Direct `sealSourceAcquisitionContentTransportOwnedByteFrame(...)` now remains a negative boundary entrypoint that rejects caller-created byte states; the positive path is explicit and guard-listed as `sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess(...)` from transport only.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - 3 files / 74 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` - 20 files / 121 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition` - 4 files / 31 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` - 54 files / 388 tests passed.
- `npm -w apps/web run build` passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` passed before implementation commit.
- Independent narrow re-review after the P1 fix: PASS. It confirmed direct seal rejects caller-created byte states, the hidden factory property is gone, the positive path is explicit and guard-listed, and no product/public/parser/cache/SR/V1 scope creep was found.

**Open items:**
- Post-2C-A review/consolidation is the next safe step.
- Parser consumption of real fetched bytes remains blocked until a later reviewed parser-isolation package.
- Live jobs, product/public wiring, cache/SR/storage, evidence/report generation, prompt/model/config/schema changes, ACS/direct URL execution, and V1 cleanup remain blocked by later gates.

**Warnings:**
- Do not treat 2C-A as source acquisition execution from the product pipeline. It is hidden/internal runtime plumbing only.
- Do not import or re-export 2C-A packet-sink symbols from product/public/barrel surfaces. The boundary guard owns this constraint.
- `Docs/AGENTS/Agent_Outputs.md` was already dirty before this handoff with unrelated review-output entries; this task did not stage those unrelated edits.

**For next agent:** Start with `Docs/STATUS/Backlog.md`, this handoff, and the 2C-A source package. The next package should be review/consolidation first, not parser execution or live jobs. If parser consumption is proposed, make the parser isolation boundary the primary architecture question before source edits.

**Learnings:** no Role_Learnings update. The practical learning is already captured here: avoid hidden runtime properties as capability channels; use explicit guard-listed symbols so static boundary tests can review them.

```
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism introduced by the first attempted P1 fix.
Chosen option: amend the existing transport/sink handoff mechanism.
Rejected path and why: rejected stack/callsite checks and hidden function properties because they are brittle and bypass static review; rejected widening parser/product scope because 2C-A forbids it.
What was removed/simplified: removed the hidden `createTransportSuccessByteState` property/factory path and the WeakSet-backed caller-mintable byte-state mechanism.
What was added: explicit guard-listed `sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess(...)` positive path used by transport, plus tests proving the old hidden factory is absent and direct caller-created byte states reject.
Net mechanism count: unchanged in intent, simpler in authority model because the hidden capability was replaced by an explicit reviewed import.
Budget reconciliation: stayed within the approved two production files plus focused tests/guard/docs; no parser/product/public/cache/SR/V1 changes.
Verification: focused 2C-A tests, runtime slice, source-acquisition slice, full analyzer-v2 slice, build, diff check, and independent narrow re-review all passed.
Debt accepted and removal trigger: none for the P1 fix. The 2C-A hidden handoff itself remains gated infrastructure; remove or replace it only when a later reviewed parser-isolation/source-acquisition package supersedes it.
Residual debt: next gate must still define parser isolation before real fetched bytes can be parsed.
```
