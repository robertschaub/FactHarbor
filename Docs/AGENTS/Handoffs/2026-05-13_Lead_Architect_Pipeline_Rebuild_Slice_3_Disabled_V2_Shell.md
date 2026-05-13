---
roles: [Lead Architect]
topics: [pipeline-rebuild, analyzer-v2, runner-routing, disabled-shell, live-jobs]
files_touched:
  - apps/web/src/lib/analyzer-v2/execution-selection.ts
  - apps/web/src/lib/analyzer-v2/pipeline-shell.ts
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/web/test/unit/lib/analyzer-v2/execution-selection.test.ts
  - apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts
  - apps/web/test/unit/lib/internal-runner-v2-routing.test.ts
---

### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 3 Disabled V2 Shell

**Task:** Add the first disabled-by-default V2 execution seam after Slice 2 compatibility closure, while keeping V1 default behavior, public API/UI, prompts, and config unchanged.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/execution-selection.ts`
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`
- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/web/test/unit/lib/analyzer-v2/execution-selection.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/internal-runner-v2-routing.test.ts`

**Done:**
- Added a pure structural execution resolver at `apps/web/src/lib/analyzer-v2/execution-selection.ts:28`. It routes to V1 by default, falls back to V1 for disabled or unsupported stored variants, and selects the V2 shell only when `job.pipelineVariant === "claimboundary-v2"` plus `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-shadow`.
- Added a fail-fast V2 shell at `apps/web/src/lib/analyzer-v2/pipeline-shell.ts:3` with stable typed error `ANALYZER_V2_SHELL_NOT_IMPLEMENTED`. It emits one event and refuses to produce placeholder analysis.
- Wired the runner at `apps/web/src/lib/internal-runner-queue.ts:417`: V1 remains default; only the double-gated V2 stored variant calls `runClaimBoundaryV2Shell`. Fallback metadata is recorded as `pipelineVariantRequested` and `pipelineVariantFallbackReason` when V1 executes a requested non-V1 job.
- Added resolver matrix tests at `apps/web/test/unit/lib/analyzer-v2/execution-selection.test.ts:8`, fail-fast shell tests at `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts:7`, and mocked runner dispatch tests at `apps/web/test/unit/lib/internal-runner-v2-routing.test.ts:152`.

**Key decisions:**
- Public API validation remains unchanged; normal submissions still accept only `claimboundary`.
- `pipeline-variant.ts`, UI pages, API validators/controllers, prompts, UCM/config defaults, and analyzer stage files were not changed.
- The V2 shell does not return a fake V2 result. If prematurely enabled, jobs fail clearly instead of storing partial analytical output.
- Live jobs were not used. The approved live-job budget remains 8 and should be saved for the first runtime-relevant V2 artifact/parity gate.
- Deputy agents Franklin/Lorentz and two Claude Opus advisory reviews approved this boundary. Required guardrails were included: flag alone never upgrades V1, exact stored variant is required, shell failure is typed, and tests cover V1/default, env-only, request-only fallback, env+request V2, and fail-fast behavior.

**Verification:**
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/execution-selection.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/internal-runner-v2-routing.test.ts`
- `npx tsc --noEmit --pretty false --project apps/web/tsconfig.json`
- `npm -w apps/web run build`
- `npm test`
- `git diff --check`
- Scope guard: zero diff lines under `apps/web/prompts`, `apps/api`, `apps/web/src/app`, `apps/web/src/lib/pipeline-variant.ts`, and the V1 analyzer stage/orchestrator files.

**Open items:** Slice 4 should replace the fail-fast shell with the first real V2 implementation slice, likely a minimal V2 orchestration/result-envelope skeleton that still avoids prompt/config changes until the contract is ready for review.

**Warnings:**
- `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-shadow` must be set in the web runner process, not only the API process.
- There is still no public/internal writer for persisted `claimboundary-v2` jobs. This is deliberate for Slice 3; the branch is reachable only by tests/manual DB state until a controlled internal writer is designed.
- Do not add V2 to public `pipeline-variant.ts` or `AnalyzeInputValidator` until the Captain/deputy team explicitly approves exposing a runnable V2 path.
- The fail-fast shell is planned temporary debt. Removal trigger: replace `runClaimBoundaryV2Shell` with a real V2 orchestrator that produces the canonical V2 result contract and has a review-approved validation plan.

**For next agent:** Start Slice 4 from `apps/web/src/lib/analyzer-v2/pipeline-shell.ts` and `apps/web/src/lib/analyzer-v2/execution-selection.ts`. Preserve the double gate and V1 default, do not expose V2 publicly yet, and spend live jobs only after a real V2 artifact exists to compare or smoke.

**Learnings:** No Role_Learnings entry appended. Main reusable lesson remains the Slice 3 guardrail: double gating plus fail-fast is safer than a placeholder V2 report.

```text
DEBT-GUARD RESULT
Classification: introduced-regression for the TypeScript failure; the new `analysisInput` object lost contextual typing for `onEvent`.
Chosen option: amend the existing Slice 3 mechanism in place.
Rejected path and why: reverting Slice 3 was disproportionate because focused behavior tests passed; adding a helper would have increased complexity for a two-parameter type gap.
What was removed/simplified: no code removed; one stale queue comment was updated after verification.
What was added: explicit `onEvent` parameter types only for the fix; the slice itself added the planned temporary V2 shell seam.
Net mechanism count: unchanged for the fix; planned temporary increase for the disabled V2 shell with removal trigger above.
Budget reconciliation: actual fix stayed inside the one-file amendment budget and did not broaden analyzer/API/UI/prompt/config scope.
Verification: failed `tsc` rerun passed; focused tests, build, full safe suite, and diff checks passed.
Debt accepted and removal trigger: fail-fast V2 shell remains until replaced by real V2 orchestrator in a later slice.
Residual debt: no live validation yet because the shell intentionally has no analytical output.
```
