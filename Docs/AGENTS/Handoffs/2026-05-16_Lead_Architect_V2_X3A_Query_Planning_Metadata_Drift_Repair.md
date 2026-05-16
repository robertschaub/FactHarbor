# Lead Architect Handoff: V2-X3-A Query-Planning Metadata Drift Repair

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2-X3-A Query-Planning Metadata Drift Repair
**Task:** Repair the non-prompt V2 query-planning policy drift exposed by the X2 Gate Register.

**Files touched:**
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/execution-readiness/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/execution-readiness/static-contract.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract.ts`
- focused V2 evidence-lifecycle tests.

**Implementation commit:** `3db89dee` (`fix: align v2 query planning gate metadata`)

**Key decisions:**
- X3-A repaired only code/docs metadata drift. It did not edit `apps/web/prompts/claimboundary-v2.prompt.md`.
- `evidence_query_planning` is now represented as the only hidden/internal executable Evidence Lifecycle task in the task-policy snapshot and execution-readiness contract.
- Future Evidence Lifecycle tasks remain `symbolic_not_executable`, with missing prompt approval, unapproved model policy, and `not_executable` authority.
- Query-planning input envelopes now carry `query_planning_hidden_internal_prompt_model_only_no_search_fetch` as non-behavioral execution-scope metadata. This remains hidden/internal and does not authorize source search/fetch or product exposure.
- Source acquisition remains non-executable; its port contract only acknowledges that a hidden upstream query plan can exist.
- The Gate Register keeps only the remaining prompt metadata drift marker: `prompt_frontmatter_required_sections_lag`. The repaired `static_task_policy_symbolic_not_executable` marker is now rejected by the validator.

**Reviewer result:**
- Architecture reviewer: PASS.
- Runtime/governance reviewer: PASS.
- Code reviewer: MODIFY until the changed query-planning batch-envelope `executionScope` was directly asserted in `input-envelope.test.ts`; then accepted by implementation.

**Open items:**
- X3-B prompt frontmatter/text alignment remains blocked until explicit Captain/LLM Expert prompt approval.
- If prompt approval is not granted immediately, the next low-risk code gate is X4 public cutover guard, with short expert review because it touches public/API compatibility guard behavior.
- The Gate Register remains audit-only and must not become runtime authority.

**Warnings:**
- Do not treat X3-A as prompt approval. Prompt frontmatter still lists only `V2_CLAIM_UNDERSTANDING_GATE1`, and prompt text still contains legacy non-executable loader wording.
- Do not use the new metadata as source-acquisition execution authority. Search/fetch/provider source execution, real-byte parser consumption, cache IO, Source Reliability, public output, live jobs, and V1 cleanup remain blocked.
- `Docs/AGENTS/Agent_Outputs.md` and `Docs/AGENTS/index/handoff-index.json` already contained unrelated local modifications, so this handoff was created as a dedicated file and those pre-existing changes were not owned by this slice.

**For next agent:**
- Before changing the V2 Gate Register or gateway state, run `npm run validate:v2-gates` and `node scripts/validate-v2-gate-register.mjs --self-test`.
- Before editing any V2 prompt frontmatter or text, obtain explicit Captain/LLM Expert prompt approval and keep wording topic-neutral.
- If starting X4, inspect `apps/web/src/lib/analyzer-v2/result-envelope.ts`, `apps/web/src/lib/analyzer-v2/compatibility-view.ts`, and `apps/api/Services/ResultCompatibility.cs` first, then debate the exact public-cutover guard shape before editing.

## Verification
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/execution-readiness/static-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts`
  - Passed: 6 files, 26 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle test/unit/lib/analyzer-v2/gateway test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - Passed after the failed-attempt amendment: 19 files, 152 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - Passed: 55 files, 398 tests.
- `npm run validate:v2-gates`
  - Passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`
  - Passed.
- `npm -w apps/web run build`
  - Passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check`
  - Passed.

## Debt-Guard Result
```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend
Rejected path and why: adding a new authority layer or editing prompts would either duplicate runtime authority or violate the explicit prompt-approval gate; reverting query-planning approval would contradict the approved 7L-1 state.
What was removed/simplified: the X2 register no longer carries the repaired static-task drift marker; stale all-non-executable metadata was replaced with a per-task hidden query-planning state.
What was added: task/readiness metadata states for hidden/internal query planning, a source-acquisition-port upstream availability label, validator self-tests for repaired/remaining drift markers, and direct test coverage for the query-planning batch-envelope scope.
Net mechanism count: unchanged
Budget reconciliation: actual patch stayed within metadata contracts, tests, gate register, validator, status docs, and handoff; no product/runtime/public/source-fetch/prompt behavior was added.
Verification: focused, evidence/gateway/boundary, full analyzer-v2, gate-register validator/self-test, build, and diff check passed.
Debt accepted and removal trigger: prompt frontmatter/text drift remains planned blocked debt until explicit Captain/LLM Expert prompt approval for X3-B.
Residual debt: task-policy/readiness metadata is still a static mirror; X2 register validation guards the mirror, but it is not generated from source.
```
