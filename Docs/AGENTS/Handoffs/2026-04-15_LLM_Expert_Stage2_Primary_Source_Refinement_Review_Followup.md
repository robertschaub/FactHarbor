### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Review Follow-up

**Task:** Address the code-review notes on the Stage 2 primary-source refinement slice, with focus on prompt guidance, silent metadata omission, lightweight refinement telemetry, and missing guard-case tests.

**Files touched:**
- apps/web/prompts/claimboundary.prompt.md
- apps/web/src/lib/analyzer/research-query-stage.ts
- apps/web/src/lib/analyzer/research-orchestrator.ts
- apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts
- apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts
- Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Review_Followup.md
- Docs/AGENTS/Agent_Outputs.md

**Done:**
- Strengthened `GENERATE_QUERIES` in `apps/web/prompts/claimboundary.prompt.md` so refinement explicitly maps `expectedSourceTypes` to `primary_direct` vs `navigational`, and so historical or archival evidence defaults to `freshnessWindow: none` unless recency is itself part of the verification target.
- Added a refinement-only runtime warning in `apps/web/src/lib/analyzer/research-query-stage.ts` when the LLM omits `retrievalLane` or `freshnessWindow`, instead of letting that omission stay silent.
- Added a second runtime warning in `apps/web/src/lib/analyzer/research-orchestrator.ts` when a claim appears to need primary-source refinement but the main query batch lacks retrieval metadata, which is the live failure mode seen in the earlier asylum regression.
- Split refinement accounting from the main Stage 2 iteration telemetry in `apps/web/src/lib/analyzer/research-orchestrator.ts`. Refinement now records its own `claimAcquisitionLedger` entry with `laneReason` indicating whether non-seeded primary coverage was recovered.
- Expanded `apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts` to cover the review-requested guard cases: no repeat on later main iterations, no activation when main metadata is absent, no activation when refinement budget is exhausted, and soft fallback when all refinement queries are `secondary_context`.
- Added a focused query-stage warning test in `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` proving refinement metadata omission logs a warning without reintroducing synthetic metadata.
- Validated the change with `npm -w apps/web exec vitest run test/unit/lib/analyzer/primary-source-refinement.test.ts test/unit/lib/analyzer/claimboundary-pipeline.test.ts` (`353 tests: 352 passed, 1 skipped`) and `npm -w apps/web run build`.
- Fixed one build-only TypeScript regression discovered during validation: `QUERY_LANE_PRIORITY` in `research-orchestrator.ts` now keys on `NonNullable<GeneratedResearchQuery["retrievalLane"]>` so optional metadata does not widen the `Record` key to include `undefined`.

**Key decisions:**
- Kept freshness behavior LLM-driven, consistent with repo policy against deterministic semantic-routing logic. The mitigation is stronger prompt guidance, not new heuristic code.
- Added lightweight persisted telemetry using the existing claim-acquisition ledger instead of introducing a new warning type or schema family. This keeps the change small while making refinement trigger/outcome inspectable in stored results.
- Treated the build-only `Record<optional-union>` failure as part of the review follow-up, because this slice already had a history of build-time-only typing regressions.

**Open items:**
- No new live regression was run in this follow-up. The earlier measured issue remains open: real runs for the approved asylum input still showed weak metadata adherence and zero stored `refinement` queries.
- The new telemetry makes future live runs easier to inspect, but it does not by itself force the LLM to emit stronger retrieval metadata.

**Warnings:**
- Focused tests now intentionally emit the new console warning when metadata is absent in the mocked path. That output is expected and verifies the new visibility behavior.
- The current telemetry uses `laneReason` on a separate claim-acquisition iteration entry rather than a new dedicated refinement schema. It is sufficient for inspection, but not a full analytics redesign.

**For next agent:**
- If you re-run the approved asylum measurement, inspect `claimAcquisitionLedger[claimId].iterations` for the new `primary_source_refinement:*` `laneReason` values alongside `searchQueries.focus === "refinement"`.
- If live metadata emission is still weak, the next bounded step is prompt-adherence tightening or output validation around `retrievalLane` / `freshnessWindow`, not more deterministic routing logic.

**Learnings:**
- Yes. Optional LLM metadata fields need both visibility and build-safe typing. Without runtime warnings, the refinement path can disappear silently; without `NonNullable` on downstream lookup tables, the optional path can still fail only at full build time.

**Next:**
1. Re-run the approved asylum input after this prompt/warning follow-up and inspect whether the new refinement telemetry appears in stored results.
2. If metadata is still absent in live runs, tighten the prompt or add structured-output enforcement at the query-generation boundary.
3. Keep the change bounded to Stage 2 retrieval behavior; do not add deterministic semantic heuristics.
