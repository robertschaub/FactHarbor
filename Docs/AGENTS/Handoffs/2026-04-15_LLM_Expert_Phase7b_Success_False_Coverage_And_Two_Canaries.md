### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Phase 7b Success-False Coverage And Two Canaries

**Task:** Execute option 2 from the rebased Phase 7b charter in the smallest acceptable form: add a narrow `success=false` coverage packet, reseed prompts, and run only two Captain-approved canaries.

**Files touched:** `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`; `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`; `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7b_Success_False_Coverage_And_Two_Canaries.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Kept the change strictly verification-focused. Added one prompt-contract assertion for `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` to lock the `success=false` fallback wording and one runtime-plumbing test to prove Pass 2 receives `salienceBindingContextJson` with `"success": false` in binding mode. Verified with focused Stage 1 tests (`390 passed | 1 skipped`), ran `npm -w apps/web run reseed:prompts`, and ran `npm -w apps/web run build` which also triggered postbuild reseeding. Per Captain direction, the live spot-check packet was narrowed from the charter's broader suggestion to exactly two approved Bundesrat canaries.

**Open items:** If broader confidence is still wanted later, the remaining optional work is unchanged: add a validator-side dedicated `success=false` behavioral test and/or run an additional non-anchor control family. Neither was required for this Captain-directed execution slice.

**Warnings:** The public `POST /v1/analyze` route now requires either an invite code or admin bypass; local canary submissions needed the dev admin header. Also, the two canaries did not finish simultaneously, so spot-check collection required repeated finite status queries against `GET /v1/jobs/{id}` rather than assuming identical timing.

**For next agent:** The new coverage lives at `claim-extraction-prompt-contract.test.ts:129` and `claimboundary-pipeline.test.ts:1135`. Local verification artifacts from this run: `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/claimboundary-pipeline.test.ts` passed (`390 passed | 1 skipped`), `npm -w apps/web run reseed:prompts` reported all prompts unchanged/skipped, and `npm -w apps/web run build` passed with clean postbuild reseed. Live canary outcomes on commit `bf45f8bcadadcbaf131b1fb2caf912714763ee95+47b7522e`: anchored Bundesrat job `74da3149e29b48cb868e8f799afaa38f` succeeded with `LEANING-TRUE`, truth `68`, confidence `74`; chronology-only Bundesrat job `bc18f4b096fe4587a8fa5ea936982a17` succeeded with `MOSTLY-TRUE`, truth `82`, confidence `78`.

**Learnings:** no
