# Lead Architect Handoff - V2 4C6 Output Coercion And Accepted Contract Smoke

**Date:** 2026-05-15
**Role:** Lead Architect / Captain deputy
**Task:** Diagnose 4C5 hidden attempt diagnostics, fix strict structural parsing for fenced JSON, and verify accepted Claim Understanding contract path
**Implementation commit:** `57dc2308` (`fix: accept fenced v2 claim understanding json`)
**Gate document:** `Docs/WIP/2026-05-15_V2_Slice_6B3c4C6_Output_Coercion_And_Accepted_Contract_Smoke.md`
**Checklist:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## Summary

4C5 diagnostics showed the first post-4C5 smoke failed because the provider returned whole-response Markdown-fenced JSON twice. The adapter treated that as malformed JSON, spent the structural retry, and returned a damaged Claim Understanding result.

4C6 amends the existing adapter parse mechanism only. It accepts direct JSON first, then accepts exactly one whole-response Markdown code fence with optional `json` label, then hands the parsed value to the unchanged production Zod schema. It rejects prose-wrapped JSON, multiple fences, and malformed fenced JSON as `parse_failure`.

No prompt, schema, model policy, provider factory, UCM, cache, public surface, ACS/direct URL runtime path, V1 code, or approval state changed.

## Review Consolidation

Three focused reviewers debated the fix:

- Runtime architecture reviewer: strict adapter parser.
- TypeScript/test reviewer: strict adapter parser.
- LLM output-contract reviewer: AI SDK 6 structured output via `generateText` plus `Output.object(...)`.

Consolidated decision: choose strict adapter parsing for 4C6 because adapter-owned parse/schema/retry is the current approved boundary. Structured output remains a future provider-boundary revision candidate if needed.

## Files Changed

- `apps/web/src/lib/analyzer-v2/claim-understanding/model-adapter.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts`
- `Docs/WIP/2026-05-15_V2_Slice_6B3c4C6_Output_Coercion_And_Accepted_Contract_Smoke.md`
- `Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_4C6_Output_Coercion_Accepted_Contract.md`
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts` - passed, 12 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-factory.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 55 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 26 files / 217 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

## Live Smokes

All live smokes were committed first, runtime-refreshed, hidden immediately, and used Captain-defined inputs.

- Diagnostic trigger before fix: `e0f82a245f7b4a00a84e73c5e53d53a1` on `9250a970...+f9d5dc0e`, input `Plastic recycling is pointless`, two attempts, both `parse_failure`, no public leakage.
- Post-fix parser smoke: `df29d295c4cc47cda021c9e57f559a50` on `57dc2308...+f9d5dc0e`, input `Plastic recycling is pointless`, one accepted adapter attempt, `schemaOutcome.status: blocked`, `blockedReason: no_valid_claim`, no public leakage.
- Post-fix accepted-contract smoke: `591d39d68c3e4483bc6bd353ba21071a` on `57dc2308...+f9d5dc0e`, input `Using hydrogen for cars is more efficient than using electricity`, one accepted adapter attempt, `schemaOutcome.status: accepted`, no public leakage.

## Debt-Guard Result

Classification: incomplete-existing-mechanism.

Chosen option: amend the existing adapter structural coercion function.

Rejected path and why: provider-factory structured output was deferred because it moves schema handling across the current provider/adapter boundary; prompt/model/schema edits were rejected because they need a separate review/Captain-approved gate.

What was removed/simplified: no code removed; repeated parse-failure retry is avoided for exact whole-response fenced JSON.

What was added: one strict helper and focused parser-boundary tests.

Net mechanism count: unchanged for execution architecture; the existing parse mechanism is widened narrowly to a whole-response structural envelope.

Budget reconciliation: actual diff stayed within the two expected source/test files before docs.

Verification: focused tests, V2/runtime tests, build, whitespace check, and two post-fix hidden live smokes passed.

Debt accepted and removal trigger: structured SDK output remains a future provider-boundary candidate if strict adapter parsing does not remain reliable.

Residual debt: `Plastic recycling is pointless` was classified as `blocked/no_valid_claim`; treat that as a later Claim Understanding prompt/model/schema policy review, not as an output-parser defect.

## Next Step

Start the next gate as an Evidence Lifecycle contract/source package only if it consumes accepted internal `ClaimContract` handoff state and keeps public output damaged/pre-cutover.

Do not change prompt text, model policy, schemas, public exposure, cache IO, ACS/direct URL dispatch, approval flips, or V1 cleanup without a separate reviewed gate.

## Warnings

- Hidden runtime remains a pre-cutover diagnostic path, not public V2 analysis.
- The accepted Claim Understanding contract is internal only until later cutover gates.
- The `Plastic recycling is pointless` blocked outcome should not be ignored before broader benchmark claims are treated as quality evidence.

## Learnings

- Attempt diagnostics made the failure actionable without raw model output.
- A strict whole-response fence parser can remove duplicate structural retries while preserving adapter-owned schema validation.
- Accepted-contract proof should use a clearly verifiable Captain-defined input; a broad evaluative benchmark can expose separate Gate 1 policy questions.
