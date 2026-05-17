---
role: Lead Developer
date: 2026-05-17
topic: V2 X7-V product-internal Source Acquisition intake boundary
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md
  - Docs/AGENTS/V2_Gate_Register.json
  - Docs/STATUS/Backlog.md
  - Docs/STATUS/Current_Status.md
---

# Lead Developer Handoff: V2 X7-V Source Acquisition Intake Boundary

### 2026-05-17 | Lead Developer | Codex (GPT-5.5) | V2 X7-V Source Acquisition Intake Boundary

**Task:** Continue V2 implementation after X7-U4. Review/debate consensus selected the lower-risk Source Acquisition intake boundary before any structural executor/inert-port work. Implement X7-V exactly as a product-internal, hidden, no-IO Source Acquisition intake observation.

**Source package:** `Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md`.

**Files touched:** `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary.ts`; `apps/web/src/lib/analyzer-v2/orchestrator.ts`; `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink.ts`; `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route.ts`; focused tests for those paths; `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`; `Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md`; `Docs/AGENTS/V2_Gate_Register.json`; `scripts/validate-v2-gate-register.mjs`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; generated handoff index.

**Behavior implemented:** Accepted Query Planning handoff plus the existing Source Acquisition request now produces `intake_ready_not_executable` with selected-claim/query counts and source-language posture only. Blocked or malformed handoff/request produces `blocked_pre_source_acquisition`. Product V2 records a bounded process-local, admin-only, no-store X7-V artifact after hidden Query Planning; the route is authenticated, ledger-id scoped, non-enumerating, and exposes no query text, source material, evidence, report, or verdict data. Public V2 output remains damaged/precutover.

**Warnings:** X7-V does not authorize live jobs, Source Acquisition structural executor invocation, source/search/fetch/provider/parser/SR/cache IO, source material, EvidenceCorpus/evidence/report/verdict/warning/confidence behavior, public exposure, prompt/config/schema/model/provider edits, ACS/direct URL, V1 reuse, or V1 cleanup. `gate.research_acquisition` remains audit-only and grants no runtime execution. The X7-V package ran no live job; 5 of the current max-8 live-job budget remain unused.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed: 5 files, 93 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed: 82 files, 586 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` passed: 40 files, 237 tests.
- `npm -w apps/web run build` passed.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `git diff --check` passed.

**Open items:** Next source-acquisition progress should be a separately reviewed package. The likely next low-risk step is to decide whether to add a product-internal structural executor/inert-port proof or to consolidate/retire older proof artifacts first. Do not start source execution, live smoke, parser 2D-C, Source Reliability/cache IO, or EvidenceCorpus creation from this handoff alone.

**Learnings:** The Source Acquisition boundary can now consume real hidden Query Planning handoff structure in the product V2 route without opening execution. Future slices should keep unlock/retire criteria explicit so guard artifacts do not accumulate without advancing toward source material and EvidenceCorpus readiness.
