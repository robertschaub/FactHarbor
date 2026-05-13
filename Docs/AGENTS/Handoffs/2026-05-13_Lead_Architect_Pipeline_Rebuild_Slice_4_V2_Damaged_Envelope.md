---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 4 V2 Damaged Envelope
**Task:** Continue the pipeline rebuild in the new worktree by choosing and implementing the next safe slice after the disabled V2 shell.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/run-context.ts`
- `apps/web/src/lib/analyzer-v2/result-envelope.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2/index.ts`
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`
- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/result-contract.test.ts`
- `apps/web/test/unit/lib/internal-runner-v2-routing.test.ts`

**Key decisions:**
- Deputy agents Franklin and Lorentz both recommended inserting a V2 result-envelope/orchestrator skeleton before the prompt/config/model gateway.
- Claude Opus 4.6 senior architect/LLM reviewer agreed: the target-spec gateway slice implicitly needs a result sink, so this is an ordering refinement, not a scope change.
- `runClaimBoundaryV2Shell` now delegates to `runClaimBoundaryPipelineV2`, which returns a schema-valid `4.0.0-cb-shadow` damaged envelope.
- The envelope is deliberately non-analytical: `UNVERIFIED`, `truthPercentage: 50`, `confidence: 0`, `confidenceTier: "none"`, `qualityGates.damagedReport: true`, `narrative.reportQualityStatus: "damaged"`, and a primary `report_damaged` warning.
- The runner now avoids V1-only `meta.pipelineVariant*` fields on V2 results and only patches the schema-allowed `meta.executedWebGitCommitHash` for V2.
- No prompts, UCM/config, model routing, cache policy, API validators, UI, or V1 analyzer stages were changed. No live jobs were used; live budget remains 8.

**Open items:**
- Next slice should return to the target-spec Slice 4 intent as Slice 4B/5: prompt/config/model gateway skeleton, cache governance, and dead-knob detection.
- V2 is still not publicly creatable through API/UI validators and still has no real analysis stages.
- The damaged envelope intentionally stores through the explicit V2 runner path only; do not treat it as analytical validation.

**Warnings:**
- The V2 envelope includes structural placeholder AtomicClaim rows only to satisfy the V2 result schema. They are not Gate-1 outputs and must not be used as report-quality evidence.
- `detectedLanguage` is set to structural `"und"` until an LLM-powered V2 understanding stage exists; do not add deterministic language detection.
- Keep `report_damaged` as the blocking primary issue until real stages can produce a publishable result.
- Do not spend live-job budget on this shell; the first useful live spend belongs after a real V2 stage or a normal-path routing change.

**For next agent:**
- Start from `runClaimBoundaryPipelineV2` in `apps/web/src/lib/analyzer-v2/orchestrator.ts`; it is the seam the prompt/config/model gateway should call into or wrap.
- Preserve the double gate in `execution-selection.ts`: V2 only for stored/requested `claimboundary-v2` plus `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-shadow`.
- For gateway work, do not edit prompt text without explicit Captain approval and LLM Expert review; prefer static contracts and tests first.

**Verification:**
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/result-contract.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/internal-runner-v2-routing.test.ts`
- `npx tsc --noEmit --pretty false --project apps/web/tsconfig.json`
- `npm -w apps/web run build`
- `npm test`
- `git diff --check`
- Scope guard: no diffs under `apps/web/prompts`, `apps/api`, `apps/web/src/app`, `apps/web/src/lib/pipeline-variant.ts`, or V1 analyzer stage/orchestrator files.

**Learnings:** Not appended to `Role_Learnings.md`; the main learning is slice-local: prove the result sink before gateway plumbing.
