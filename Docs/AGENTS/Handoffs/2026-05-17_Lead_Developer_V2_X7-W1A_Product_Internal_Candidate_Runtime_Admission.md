---
role: Lead Developer
date: 2026-05-17
topic: V2 X7-W1A product-internal Source Acquisition candidate-runtime admission
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-W1A_Product_Internal_Candidate_Runtime_Admission_Source_Package.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-W1A_Source_Package.md
  - Docs/AGENTS/V2_Gate_Register.json
  - Docs/STATUS/Backlog.md
  - Docs/STATUS/Current_Status.md
---

# Lead Developer Handoff: V2 X7-W1A Product-Internal Candidate-Runtime Admission

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W1A Product-Internal Candidate-Runtime Admission

**Task:** Continue V2 implementation from the reviewer-approved X7-W1A source package. Implement Position A only: a hidden, product-internal Source Acquisition candidate-runtime admission decision after X7-V, with no executable runtime/provider invocation and no source IO.

**Source package:** `Docs/WIP/2026-05-17_V2_Slice_X7-W1A_Product_Internal_Candidate_Runtime_Admission_Source_Package.md`. Base approval commit at start of implementation: `14b930f6`.

**Files touched:** `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission.ts`; `apps/web/src/lib/analyzer-v2/orchestrator.ts`; `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink.ts`; `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts/route.ts`; focused tests for those paths; `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`; `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`; `Docs/AGENTS/V2_Gate_Register.json`; `scripts/validate-v2-gate-register.mjs`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; generated handoff index after closeout.

**Behavior implemented:** X7-W1A now builds a product-owned candidate-runtime admission decision from the accepted X7-S Query Planning handoff, the X7-V Source Acquisition intake, and structurally validated candidate allowlist/budget snapshots. The ready state is `admission_ready_no_runtime_execution`; blocked cases return `blocked_pre_candidate_runtime_admission`. Product V2 records a bounded, process-local, admin-only, ledger-scoped artifact with sanitized hashes/counts and explicit zero-execution telemetry: zero provider attempts, zero candidates, zero bytes, and all runtime/provider/network/source-material flags false. The internal route is admin-key protected, `no-store`, ledger-id scoped, and non-enumerating. Public V2 output remains damaged/precutover.

**Scope guard:** X7-W1A does not call `executeSourceAcquisitionCandidateRuntime(...)`, provider boundaries, X6 harnesses, provider/network/search/fetch/content/parser/cache/SR/storage paths, source material, EvidenceCorpus, report/verdict/warning/confidence behavior, public surfaces, live jobs, ACS/direct URL runtime, V1 reuse, V1 work, or V1 cleanup. The only candidate-envelope reuse is the approved structural allowlist/budget snapshot types and validators.

**Failed-attempt recovery:** The first focused verifier failed only on boundary-guard posture: the new names reused the old `providerBoundary` substring, the guard still treated `source-acquisition-candidate-envelope.ts` as a forbidden executable transitive dependency, and the source-acquisition file inventory did not list the new admission owner. Applied `/debt-guard` recovery as `keep + amend`: retained the implementation, renamed the new telemetry/fields to `candidateProvider*`, and narrowed guard exemptions to the approved X7-W1A candidate-envelope symbol subset. No new capability was added.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed after recovery: 5 files, 93 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed: 84 files, 598 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` passed: 41 files, 244 tests.
- `npm -w apps/web run build` passed.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `git diff --check` passed.

**Open items:** X7-W1A is admission-only. Any executable Source Acquisition candidate runtime, provider boundary, provider-network execution, source-material production, EvidenceCorpus creation, live smoke, or public/product output change still needs a separate reviewed package. X7-W1B or another next slice should explicitly define which older proof/guard artifacts it retires or supersedes to avoid accumulating parallel scaffolding.

**Learnings:** The useful forward step after X7-V was not another passive marker and not broad IO; it was a product-route admission authority that makes the next execution gate inspectable while keeping every execution flag closed. Boundary guards should treat old-runtime naming tokens as risk signals, so new V2 admission vocabulary should avoid them unless the slice really opens that capability.
