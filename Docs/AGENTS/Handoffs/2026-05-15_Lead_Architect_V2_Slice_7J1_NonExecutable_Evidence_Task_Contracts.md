---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7J-1 Non-Executable Evidence Task Contracts
**Task:** Implement the Captain-approved 7J non-executable source package for V2 Evidence Lifecycle prompt sections, structured output schemas, task-policy metadata, and inert verifier tests.

**Files touched:**
- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-contracts/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

**Key decisions:** Implemented only non-executable V2-owned artifacts under the approved 7J package. `claimboundary-v2.prompt.md` now carries inert Evidence Lifecycle sections for query planning, applicability, extraction, and sufficiency, but frontmatter remains unchanged and the new sections are not loader-required or file-seeded. Added strict task-result schemas for `accepted`, `blocked`, and `damaged` branches, categorical missing-evidence dimensions, and task-policy metadata linking task keys to prompt sections/schema versions while preserving `not_executable`, no-store/no-read, provider-not-wired, model-not-approved, public-forbidden posture. Boundary guards cover no V1 analyzer/prompt reuse, no provider SDK imports, no cache IO, no Source Reliability imports/calls, no search/fetch/network/parser execution, no public/product/orchestrator imports, and no direct `fetch`.

**Verification:** Passed focused verifier:
`npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`.
Passed full Analyzer V2 slice: `npm -w apps/web run test -- test/unit/lib/analyzer-v2` (32 files, 254 tests). Passed `npm -w apps/web run build`; postbuild reseed reported `Prompts: 0 changed, 3 unchanged`, confirming no prompt file seeding. Passed `git diff --check` and `git diff --cached --check`.

**Open items:** Evidence Lifecycle execution is still not authorized. Next work needs a reviewed post-7J-1 gate before any prompt/model execution, provider/search/fetch implementation, cache IO, Source Reliability thin-port integration, product/orchestrator wiring, public exposure, live jobs, direct-text canary execution, ACS/direct URL execution, or V1 cleanup.

**Warnings:** `claimboundary-v2` now has more prompt source text but runtime exposure is still intentionally constrained by unchanged frontmatter and tests. Do not interpret the new task schemas as approval to execute or materialize evidence/scarcity/warnings. Captain-approved direct-text canaries remain future-gate inputs only; do not run or paraphrase them before an executable gate.

**For next agent:** Start from commit `1a874b8d` (`feat: add v2 evidence task contracts`). If continuing V2 Evidence Lifecycle, decide the next gate explicitly: either another inert contract/handoff package or a source-execution design package. Source execution is not a low-risk continuation from this commit.

**Learnings:** Not appended to `Role_Learnings.md`; no durable role learning beyond the handoff content.
