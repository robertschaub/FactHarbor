---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n-a, live-smoke, runner-routing, fail-closed, debt-guard]
files_touched:
  - apps/web/src/lib/analyzer-v2/execution-selection.ts
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/web/test/unit/lib/analyzer-v2/execution-selection.test.ts
  - apps/web/test/unit/lib/internal-runner-v2-routing.test.ts
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N-A Route-Selection Hard-Fail Repair

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N-A Route-Selection Hard-Fail Repair

**Task:** Close out the X7-N-A clean-provenance rerun attempt and repair the unsafe V2-to-V1 fallback found by that live smoke.
**Files touched:** `apps/web/src/lib/analyzer-v2/execution-selection.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/test/unit/lib/analyzer-v2/execution-selection.test.ts`, `apps/web/test/unit/lib/internal-runner-v2-routing.test.ts`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-N-A is classified as `HARD_FAIL_ROUTE_SELECTION_V1_FALLBACK`, not pass. Explicit `claimboundary-v2` jobs now fail closed when the V2 shell gate is closed; unsupported stored variants also fail closed. Normal `claimboundary` jobs still run V1.
**Open items:** Do not rerun under spent X7-N-A. If clean post-X7M live evidence is still needed, create a separate reviewed follow-up rerun package after this repair is committed and the runtime is refreshed from the committed hash.
**Warnings:** The failed job `29b8f95866964b3c805e7df243f004ea` reached V1 search/fetch/XLSX parsing/Source Reliability/verdict work before cancellation. Treat it only as hard-fail evidence. It produced no accepted V2 artifacts, no report, and no result JSON. No Query Planning execution, source execution, parser execution, public cutover, cache/SR/storage, ACS/direct URL, B3/2D-C, V1 cleanup, or additional live jobs are authorized by this repair.
**For next agent:** Before any new live smoke, commit this repair, refresh web/API runtime from that commit, prove the V2 shell and hidden direct-text runtime env gates are effective, and use a new reviewed execution package. A V2-labelled job must never silently downgrade to V1; any desired V1 retry must be a visible new V1 job.
**Learnings:** A stored experimental pipeline variant must fail closed when its runtime gate is closed. Silent fallback is unsafe even if intended as compatibility.

## Live Failure Evidence

- X7-N-A input used exactly: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`.
- Job id: `29b8f95866964b3c805e7df243f004ea`.
- Stored variant: `claimboundary-v2`.
- Created/executed hash: `e7d0834619b7a8d947bb75723c6a18e03632b2ff`.
- Status after intervention: `CANCELLED` at 70%.
- First runner event after start: `Preparing input (pipeline: claimboundary)`.
- Unauthorized work observed: V1 claim extraction, preliminary web search, external search providers, URL retrieval, XLSX processing, Source Reliability access, clustering, and verdict debate events.
- Hidden Claim Understanding route for `<jobId>:precutover-observability`: `200` with `artifactCount: 0`.
- X7-J intake artifact route for the same ledger: `404`.
- Result/report: not stored.

## Review And Debate

- Architect reviewer: APPROVE fail-closed amendment; reject docs-only and X7-N-only guard.
- Security/runtime reviewer: APPROVE fail-closed amendment; explicit `claimboundary-v2` and unsupported non-V1 variants must never silently execute V1.
- Code/package self-review: patch amends the existing selector and runner branch, updates existing tests, and removes the obsolete fallback metadata write caught by TypeScript.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/execution-selection.test.ts test/unit/lib/internal-runner-v2-routing.test.ts`: passed, 2 files / 13 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: passed, 74 files / 523 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: passed, 35 files / 208 tests.
- `npm -w apps/web run build`: passed after deleting the obsolete fallback metadata branch; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `npm run validate:v2-gates`: passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`: passed.

## Debt-Guard Result

```text
DEBT-GUARD RESULT
Classification: obsolete-parallel-mechanism / incomplete-existing-mechanism
Chosen option: amend the existing execution selector and runner decision point
Rejected path and why: docs-only leaves unsafe runtime fallback; X7-N-only guard creates a special-case mechanism; broad preflight cannot protect persisted jobs.
What was removed/simplified: automatic V1 fallback for explicit V2-disabled and unsupported stored variants; obsolete fallback metadata write.
What was added: typed `blocked` selection branch and tests proving no V1/V2 analysis call occurs when blocked.
Net mechanism count: unchanged
Budget reconciliation: actual touched files matched expected source/test/status/handoff envelope; no new flags, retries, provider calls, cache paths, or product/public exposure.
Verification: focused routing tests, Analyzer V2 suite, Analyzer V2 runtime suite, build, V2 gate validators.
Debt accepted and removal trigger: none
Residual debt: a new reviewed rerun package is needed to recover clean live evidence after the repair commit/runtime refresh.
```
