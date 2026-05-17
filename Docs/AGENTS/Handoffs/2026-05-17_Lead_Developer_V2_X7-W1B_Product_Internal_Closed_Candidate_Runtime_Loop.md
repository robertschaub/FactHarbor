---
role: Lead Developer
date: 2026-05-17
topic: V2 X7-W1B product-internal closed Source Acquisition candidate-runtime loop
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-W1B_Product_Internal_Closed_Candidate_Runtime_Loop_Source_Package.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-W1B_Source_Package.md
  - Docs/AGENTS/V2_Gate_Register.json
  - Docs/STATUS/Backlog.md
  - Docs/STATUS/Current_Status.md
---

# Lead Developer Handoff: V2 X7-W1B Product-Internal Closed Candidate-Runtime Loop

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W1B Product-Internal Closed Candidate-Runtime Loop

**Task:** Continue V2 implementation from the reviewer-approved X7-W1B source package. Implement a hidden, product-internal Source Acquisition candidate-runtime loop after X7-W1A that exercises the existing candidate runtime only through a product-owned closed local no-IO provider boundary.

**Source package:** `Docs/WIP/2026-05-17_V2_Slice_X7-W1B_Product_Internal_Closed_Candidate_Runtime_Loop_Source_Package.md`. Approved source-package commit at start of implementation: `a0783c0b`.

**Files touched:** `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop.ts`; `apps/web/src/lib/analyzer-v2/orchestrator.ts`; `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink.ts`; `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts/route.ts`; focused tests for those paths; `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`; `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`; `Docs/AGENTS/V2_Gate_Register.json`; `scripts/validate-v2-gate-register.mjs`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; generated handoff index after closeout.

**Behavior implemented:** X7-W1B builds a product-owned closed-loop authority after accepted Query Planning, X7-V intake, and X7-W1A admission. It creates the approved nested 7N-3A/7N-3B1 runtime authority snapshots, then calls `executeSourceAcquisitionCandidateRuntime(...)` with a local provider boundary that deterministically returns `provider_failure`, zero candidates, sanitized telemetry, and no source bytes. Successful closed-loop completion returns `closed_loop_completed_no_source_candidates`; precondition failures return `blocked_pre_closed_candidate_runtime_loop`; unexpected runtime shape returns `closed_loop_damaged_structural`.

**Artifact and route behavior:** Product V2 records a bounded, process-local, admin-only, ledger-scoped closed-loop artifact. The artifact contains only sanitized structural state: candidate-runtime exercised flag, closed-provider-boundary invoked flag, provider-attempt count, zero candidate/byte counts, blocked public cutover, and opaque `CLQ_###` per-query summaries. The admin route is key-protected, `no-store`, ledger-id scoped, and non-enumerating.

**Scope guard:** X7-W1B does not authorize real provider/network/source IO, source material, EvidenceCorpus, parser/cache/SR/storage, evidence/report/verdict/warning/confidence generation, public API/UI/report/export behavior, live jobs, ACS/direct URL execution, X6/X7-D forward-path reuse, V1 work, or V1 cleanup. Raw `queryId`, `queryText`, source-language policy rationale, provider attempt ids, provider requests, raw payloads, source material, and evidence/report data are not exposed through the closed-loop decision or artifacts.

**Debt-guard recovery:** First focused verifier failure was boundary-guard posture only; it was kept and amended by removing broad provider/content reachability exceptions and retaining only the narrow W1B candidate-runtime reachability exception. The later build failure was a TypeScript-only narrowing issue in `runtimeDecisionIsClosedNoCandidateCompletion(...)`; the lowest-complexity fix was to amend the existing guard from a type predicate to a boolean guard, because the false branch intentionally inspects completed-but-invalid runtime decisions. No new mechanism, fallback, retry, or scope expansion was introduced.

**Verification:**
- Focused X7-W1B verifier passed: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed after recovery: 5 files, 90 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed on final code: 86 files, 607 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` passed on final code: 42 files, 249 tests.
- `npm -w apps/web run build` passed on final code.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `git diff --check` passed.

**DEBT-GUARD RESULT**
Classification: incomplete-existing-mechanism / failed-validation recovery.
Chosen option: amend the existing W1B owner and boundary guard.
Rejected path and why: adding a second validation branch or fallback would stack mechanisms; reverting W1B was not warranted because focused behavior and source-package direction were correct.
What was removed/simplified: removed two unnecessary broad provider/content transitive guard exceptions; simplified the runtime completion guard to boolean narrowing.
What was added: no new recovery mechanism; only the approved X7-W1B closed-loop implementation and tests.
Net mechanism count: unchanged relative to approved package.
Budget reconciliation: stayed inside the approved W1B envelope plus required status/register/handoff/index files.
Verification: all commands above passed.
Debt accepted and removal trigger: none.
Residual debt: X7-W1B remains closed/no-IO and product-internal only; any real provider/network/source IO or live smoke requires a separate reviewed source package.

**Open items:** Source Acquisition still has no real source execution, no source material, no EvidenceCorpus, and no public result. The next slice should not start 2D-C/parser work or source IO by implication; it needs a reviewed package defining the next safe Source Acquisition handoff or execution boundary.

**Learnings:** The productive next step after admission was a closed runtime loop, not external IO. The package is easier to review when the only approved provider boundary is local/no-IO and its outputs are deliberately boring: zero candidates, zero bytes, and opaque per-query structure.
