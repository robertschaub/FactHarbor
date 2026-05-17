---
### 2026-05-17 | Lead Developer | Codex (GPT-5.5) | V2 X7-S Hidden Query Planning Execution Implementation
**Task:** Implement the approved X7-S package for product-internal hidden Query Planning execution without live jobs, source IO, public exposure, prompt/config/schema edits, or V1 work.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/execution-selection.ts`
- `apps/web/src/lib/analyzer-v2/run-context.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.ts`
- focused X7-S tests, `boundary-guard.test.ts`, `Docs/AGENTS/V2_Gate_Register.json`, `scripts/validate-v2-gate-register.mjs`, `Docs/STATUS/Current_Status.md`, and `Docs/STATUS/Backlog.md`

**Key decisions:**
- Added a separate `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text` gate. It is independent from Claim Understanding and defaults closed.
- Froze the X7-S activation/provider snapshot into `PipelineRunContext`; product execution can open only when accepted Claim Understanding, X7-O observation, the X7-S package pointer, and the activation snapshot all line up.
- Built the provider callback only from the validated X7-S runtime config snapshot. The factory imports only `ai` and `@ai-sdk/anthropic`, uses one call with `maxRetries: 0`, and returns sanitized provider failures.
- Addressed the Security/runtime implementation review finding: the provider config snapshot builder now returns `null` when X7-S activation is closed, and the config/factory validation path rejects closed executable/factory snapshots before SDK dispatch.
- Recorded hidden runtime artifacts in a bounded process-local admin-only ledger with a no-store internal route. Error responses do not echo lookup keys; public result output remains damaged/precutover.
- Updated the V2 gate register validator so `gate.evidence_query_planning` cannot silently drop the X7-S source package, hidden artifact route, blocked cache/source/public/live constraints, or default-closed activation note.

**Open items:**
- X7-S does not run live jobs. A later X7-T package is still required before any live product-route Query Planning smoke.
- `implementationCommit` in `Docs/AGENTS/V2_Gate_Register.json` remains `null` because the register is committed in the same implementation package; the handoff and git commit provide the concrete implementation pointer.
- Source/search/fetch/parser/SR/cache IO, evidence/report/verdict/warning/confidence behavior, public exposure, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked.

**Warnings:**
- The orchestrator catches X7-S runtime failures so the public damaged/precutover envelope remains unchanged. Use the admin-only runtime artifact route for hidden diagnostics after a reviewed live-smoke package.
- X7-S product wiring is internal runtime invocation only; do not treat it as public result readiness or source-acquisition readiness.

**Verification:**
- Architecture/scope implementation review -> approved, no findings.
- Security/runtime implementation review -> rejected once for provider-config activation-boundary bypass; fix applied and re-review approved.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/execution-selection.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/run-context.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract.test.ts test/unit/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> passed, 9 files / 110 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts` -> passed, 6 files / 23 tests.
- `npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2` -> passed, 4 files / 19 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` -> passed, 39 files / 227 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> passed, 80 files / 567 tests.
- `npm run validate:v2-gates` -> passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` -> passed.
- `npm -w apps/web run build` -> passed.

**DEBT-GUARD RESULT**
Classification: failed-attempt recovery for stale boundary-guard assertion after X7-S added approved Query Planning runtime import.
Chosen option: amend the existing guard assertion.
Rejected path and why: revert/disable X7-S runtime import would contradict the approved X7-S package; adding a parallel exception mechanism was unnecessary.
What was removed/simplified: the stale X7-J-specific ban on orchestrator importing the Query Planning runtime after X7-S approval.
What was added: explicit X7-S guard coverage for the provider config, provider factory, runtime artifact sink, internal route, orchestrator imports, and gate-register audit state.
Net mechanism count: unchanged for runtime behavior; guard coverage increased.
Budget reconciliation: scope stayed inside the X7-S source/test/status/handoff/register envelope.
Verification: boundary guard rerun passed 71/71, then the full verifier set above passed.
Debt accepted and removal trigger: temporary activation authority remains until UCM/task-policy-derived activation authority exists.
Residual debt: X7-T live-smoke package needed before live Query Planning validation.

**For next agent:** Start from this handoff and the X7-S package. If continuing low-risk, draft/review X7-T as a separate live-smoke package after this commit and runtime refresh; do not submit live jobs under X7-S itself.

**Learnings:** Appended to `Docs/AGENTS/Role_Learnings.md`: X7-J/X7-O guards that protected earlier non-execution states must be updated when a later approved package intentionally opens the next hidden step; keep the old artifact path guarded, but move the new execution allowance into a slice-specific guard.
