---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | V2 Clean-Room Boundary Enforcement
**Task:** Enforce the Captain rule that Analyzer V2 must not reuse, clone, import, or load V1 pipeline analysis code, V1 prompt assets, or V1 pipeline-owned types.
**Files touched:** `apps/web/src/lib/analyzer-v2/pipeline-input.ts`; `apps/web/src/lib/analyzer-v2/runner-ingress.ts`; `apps/web/src/lib/analyzer-v2/orchestrator.ts`; `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`; `apps/web/src/lib/analyzer-v2/run-context.ts`; `apps/web/src/lib/analyzer-v2/claim-understanding/prepared-snapshot.ts`; `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`; related analyzer-v2 tests; V2 target spec and xWiki V2 architecture pages.
**Key decisions:** Analyzer V2 now owns a minimal `ClaimBoundaryV2Ingress` contract derived from V2 needs. Current runner/job shape is translated only in `runner-ingress.ts`, a one-way seam that accepts `unknown` and emits the V2 DTO. A static Vitest guard parses imports via TypeScript AST, dynamically discovers legacy prompt files/profiles, blocks V1 analyzer imports, blocks legacy prompt reuse in prompt-loading contexts, blocks key V1 contract identifiers, and keeps analyzer-v2 fixtures data-only.
**Open items:** The forbidden V1 contract identifier set currently covers the V1 types relevant to this slice (`AnalysisInput`, `PreparedStage1Snapshot`, `CBClaimUnderstanding`). Later evidence/verdict/aggregation slices should extend the guard when new V2 contracts approach additional V1 type families.
**Warnings:** The guard intentionally permits V1 runtime/compatibility markers such as the `claimboundary` pipeline variant where they are not prompt-loading contexts. Do not weaken that distinction: V1 compatibility markers are allowed; V1 prompt/profile/code/type reuse is not.
**For next agent:** Before Slice 6B prompt/model execution, keep `npm -w apps/web test -- test/unit/lib/analyzer-v2` in the verifier set. Use deployed historical reports and Captain expectations as quality references; master V1 remains a frozen compatibility/fallback path, not the report-quality oracle.
**Learnings:** Not appended; this is task-specific guardrail context.

```text
DEBT-GUARD RESULT
Classification: introduced-regression during failed-attempt recovery; the first boundary guard overmatched the runtime string "claimboundary" as prompt reuse.
Chosen option: amend the existing guard in place.
Rejected path and why: revert would lose the new clean-room enforcement; adding an exception list would be weaker and more brittle.
What was removed/simplified: removed the V2 type-only dependency on V1 `AnalysisInput`; renamed V1-shaped ACS migration helper names to ACS/V2 terminology.
What was added: V2-owned ingress DTO, named runner ingress adapter, AST/static boundary guard tests, and documentation of the clean-room rule.
Net mechanism count: increases by one contained guard/test mechanism, justified as missing enforcement capability with no runtime behavior path.
Budget reconciliation: stayed within analyzer-v2 boundary/source docs; no prompt/config/API/UI/live-job behavior changed.
Verification: `npm -w apps/web test -- test/unit/lib/analyzer-v2`; `npm -w apps/web test -- test/unit/lib/internal-runner-v2-routing.test.ts`; combined targeted test command passed after narrowing prompt-context detection; `npm -w apps/web run build`; `git diff --check`.
Debt accepted and removal trigger: guard identifier set must grow in later slices when new V2 contract families approach additional V1 type families.
Residual debt: none for current Slice 6A/V2 shell boundary.
```
