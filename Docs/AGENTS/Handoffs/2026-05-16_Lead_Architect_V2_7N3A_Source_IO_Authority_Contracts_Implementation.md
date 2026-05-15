---
### 2026-05-16 | Lead Architect | Codex | V2 7N-3A Source-IO Authority Contracts Implementation

**Task:** Implement the approved V2 Slice 7N-3A source-IO authority/runtime-owner boundary under `Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md`, without adding concrete source IO, product wiring, public exposure, live jobs, cache IO, Source Reliability, ACS/direct URL execution, or V1 reuse.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-runtime-authority.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-runtime-config.contract.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-provider-boundary.contract.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-runtime-authority.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-runtime-config.contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-provider-boundary.contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

**Key decisions:**
- Implemented 7N-3A as runtime contracts/authority only at `18f0fa02`; no Analyzer V2 core executor import of `analyzer-v2-runtime` was opened.
- Added a module-private `WeakSet<object>` authority owner. Runtime authority validation requires owner-created membership, so plain objects, JSON round-trips, and the 7N-2 controlled-harness marker cannot authorize runtime source IO.
- Kept runtime config and provider-boundary contracts fail-closed: concrete provider IO, provider SDK/search/fetch/parser/network, cache read/write, durable storage, Source Reliability, product runtime, public exposure, live jobs, ACS/direct URL, semantic interpretation, and evidence corpus population remain forbidden.
- Added boundary guards for source-acquisition runtime owner files and direct product/public reachability.

**Open items:**
- 7N-3B+ must be a separate reviewed package before any concrete provider/search/fetch/parser/network behavior or source live smoke.
- The future 7N-3B package still needs source fetch security rules, hidden artifact inspection proof, runtime refresh/rollback checklist, and no-public-leak verification before live jobs become meaningful.
- `Docs/AGENTS/Agent_Outputs.md` was already dirty before this slice and was not modified or staged by this implementation; append the index row later when that file is clean or deliberately reconciled.

**Warnings:**
- Do not treat `SourceAcquisitionRuntimeAuthority` as permission to execute IO. In 7N-3A it is only a non-serializable boundary capability with all execution flags closed.
- Do not import `source-acquisition-runtime-authority.ts` from product/public surfaces or Analyzer V2 core source-acquisition code without a later reviewed gate.
- Do not reuse `apps/web/src/lib/web-search.ts`, retrieval helpers, Source Reliability, V1 prompts, V1 analyzer types, or cache storage for 7N-3B without explicit review.

**For next agent:** Start from `Docs/STATUS/Backlog.md` and `Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md`. The next implementation gate is not live jobs; it is a reviewed 7N-3B+ concrete source-IO package that must preserve the 7N-3A non-public/no-cache/no-SR/no-product boundary.

**Validation:**
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2-runtime/source-acquisition-runtime-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-runtime-config.contract.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-provider-boundary.contract.test.ts`
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts`
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2-runtime`
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition`
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port`
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2`
- `npm -w apps/web run build`
- `git diff --check`

**Learnings:** Not appended. No durable new role learning beyond the committed guardrails and handoff content.
