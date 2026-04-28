# 2026-04-28 - Lead Developer + LLM Expert - Prompt Runtime Split Execution

## Task

Execute `Docs/WIP/2026-04-28_Prompt_Split_Runtime_Efficiency_Execution_Plan.md` independently after the other live verification job completed, with max live-job budget 8.

## Outcome

Implemented and committed the prompt-runtime efficiency track through Phase 4 without prompt wording changes:

- `58b1235c` - Prompt runtime telemetry slice.
- `0bf5ae49` - Prompt split manifest source layer.
- `d9635da9` - Stage 2 `EXTRACT_EVIDENCE` static/dynamic prompt split.
- `6209cdd3` - `CLAIM_CONTRACT_VALIDATION` static/dynamic prompt split.
- `09cfbe27` - Stage 4 verdict prompt static/dynamic split.
- `55ef87bf` - Physical `claimboundary` split source layout.

The active runtime prompt remains one UCM composite `prompt|claimboundary` blob. The new manifest source layout is active for reseeding, and `claimboundary.prompt.md` is retained as a byte-equivalence reference during migration.

## Live Verification

Live job budget used before Captain reset: 2 of 8. Captain later reset the next-track budget to 8 available live jobs.

- `3c411d86be024e288133332b279c570e`: `Using hydrogen for cars is more efficient than using electricity`; result `FALSE`, confidence `77`. Functional direction good, but run happened before full service refresh, so prompt-runtime telemetry was treated as inconclusive.
- `bf3d4dd99862436d9de9345588215f43`: same Captain-approved input after web+API refresh; result `FALSE`, confidence `80`. Persisted prompt-runtime telemetry for `CLAIM_EXTRACTION_PASS2`, `CLAIM_CONTRACT_VALIDATION`, `EXTRACT_EVIDENCE`, and Stage 4 verdict sections. `EXTRACT_EVIDENCE` showed cache creation on the first comparable call and cache reads on subsequent calls.

## Verification

Passed:

- `npm -w apps/web test -- test/unit/lib/prompt-source.test.ts test/unit/lib/config-loader.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- `npm -w apps/web test -- test/unit/lib/prompt-source.test.ts test/unit/lib/config-loader.test.ts test/unit/lib/config-storage.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `npm -w apps/web run build`
- `npm test`
- `npm -w apps/web run reseed:prompts -- --quiet` reported `Prompts: 0 changed, 3 unchanged, 0 errors`.
- Direct DB check: active `prompt|claimboundary` UCM hash equals the canonical manifest composite hash `21bfbc004d1284bc5b9e43521f25dec981acb511e67c6703e616e46677d4048a`.

## Reviewer Result

Reviewer `Zeno` approved Phase 4 from current workspace after two issues:

- P1: split artifacts were uncommitted. Resolved by commit `55ef87bf`.
- P2: README contract drift. Resolved by updating `apps/web/prompts/README.md`.

## Decisions

- Keep UCM/admin/job provenance on one composite prompt blob and content hash.
- Do not introduce section-level UCM editing yet.
- Let manifest file order define composite order; validate frontmatter `requiredSections` as an inventory set. This preserves the existing prompt because `CLAIM_CONTRACT_REPAIR` was listed earlier in frontmatter than it appeared in the monolith body.
- Do not proceed to prompt wording or retry-policy changes under Phase 5 without explicit approval. Live telemetry did not show preventable Stage 2 or Stage 4 parse/contract retries in the refreshed hydrogen run.
- Plan prompt-hygiene/redundancy cleanup as a separate Phase 6 behavior-change track after the no-wording infrastructure baseline, grounded in the April 19 consolidated prompt audit and current runtime telemetry.

## Warnings

- Runtime version is `+dirty` because unrelated local changes remain: NPO docs and `apps/web/src/lib/internal-runner-queue.ts` from another agent. These were not staged or committed by this work.
- `CLAIM_EXTRACTION_PASS2` still has large static system content and dynamic payload telemetry. A deeper split may require prompt layout changes, which would be prompt behavior work.
- The monolith reference can drift from split files if edited incorrectly, but `prompt-source.test.ts` now fails if the manifest composite and reference differ.

## Learnings

- Prompt file split and runtime efficiency are separate levers. The file split improves maintainability; static/dynamic message separation produced the actual cache-read signal.
- Service refresh matters for telemetry validation. The first live job succeeded but did not expose new fields; the refreshed job did.
- UCM canonicalizes prompt content before hashing, so raw SHA-256 of the manifest composite is not the active UCM hash. Use canonical markdown hashing when comparing source layout to UCM.

## Next Steps

- Optional admin visibility: show `sourceKind=manifest`, manifest source files, and section list in admin diagnostics. Do not add section-level editing yet.
- If Captain approves Phase 5 prompt/retry work, use persisted prompt-runtime telemetry first; target only retry branches with evidence of repeated structural waste.
- For Phase 6 prompt hygiene, start read-only with `/prompt-audit` over the split `claimboundary` section files, `inverse-claim-verification.prompt.md`, and the source-reliability prompt surface. Implement wording changes only in small approved slices with focused tests and live jobs from the refreshed 8-job budget.
- When unrelated dirty work is committed or cleared, future live jobs will lose the `+dirty` provenance suffix.
