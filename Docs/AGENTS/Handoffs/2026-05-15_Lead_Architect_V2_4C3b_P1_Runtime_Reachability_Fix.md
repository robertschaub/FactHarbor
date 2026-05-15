---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 4C3b P1 Runtime Reachability Fix
**Task:** Address code-review P1 that 4C3b hidden direct-text runtime was dead code outside tests.

**Files touched:** `apps/web/src/lib/analyzer-v2/execution-selection.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/lib/analyzer-v2/run-context.ts`, focused routing/context/boundary tests, and 4C3 documentation.

**Key decisions:** Accepted reviewer finding. Kept default `kill_switch_closed`, but added a product-owned activation selector so hidden direct-text runtime opens only when stored variant is `claimboundary-v2`, the V2 shell gate is enabled, and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`. The env value is a kill-switch selector only; approval/model/provider/config authority remains the deputy-approved temporary profile frozen in `PipelineRunContext`.

**Open items:** 4C3c live smoke still requires committed/refreshed runtime state and hidden-artifact inspection proof. Static `CAPTAIN_APPROVAL` remains planned temporary debt until UCM/task-policy activation authority exists.

**Warnings:** Do not read the runtime kill-switch env in `run-context`, runtime activation owner, runtime stage, provider factory, or public surfaces. Do not add env-supplied model/provider/prompt/cache values.

**For next agent:** The product reachability path is `resolveAnalyzerExecutionSelection(...)` -> `runJobBackground(...)` -> `runClaimBoundaryV2Shell(..., { runtimeActivationStatus })` -> `buildClaimBoundaryV2RunContext(...)` -> `buildClaimUnderstandingRuntimeActivation(...)`. Keep the public envelope damaged/pre-cutover until a later result/report/API/UI gate.

**Learnings:** no new durable role learning appended.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend the existing product activation path with a narrow product-owned kill-switch selector.
Rejected path and why: auto-enabling violates default-closed; durable UCM authority is a larger later gate; leaving as-is keeps 4C3b dead code.
What was removed/simplified: no separate override path was added; test mutation remains only for owner-unit tests.
What was added: selection status plumbing from execution selection to runner, shell/orchestrator/run-context, plus boundary and routing tests.
Net mechanism count: unchanged runtime mechanism; missing selector added to existing activation snapshot path.
Budget reconciliation: touched the planned product-selection and context plumbing files only; no provider/runtime dispatch logic changed.
Verification: focused routing/context/boundary tests, full V2/runtime/routing slice, build, static scans, and `git diff --check` passed.
Debt accepted and removal trigger: static `CAPTAIN_APPROVAL` remains until UCM/task-policy-derived activation authority exists.
Residual debt: 4C3c live smoke is still pending; no live jobs were submitted for this fix.
