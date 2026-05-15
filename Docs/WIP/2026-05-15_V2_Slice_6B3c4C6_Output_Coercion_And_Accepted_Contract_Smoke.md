# V2 Slice 6B.3c-4C6 Output Coercion And Accepted Contract Smoke

**Date:** 2026-05-15
**Status:** source implemented at `57dc2308`
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `9250a970` (`docs: record v2 hidden diagnostics gate`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Trigger

The first committed/refreshed 4C5 diagnostic smoke used Captain-defined input `Plastic recycling is pointless`.

Result:

- job `e0f82a245f7b4a00a84e73c5e53d53a1`;
- commit/runtime hash `9250a9709a3819b76ceb1a625b1887f28453f267+f9d5dc0e`;
- hidden artifact count `1`;
- gateway task `claim_understanding_gate1` was executable;
- provider/model `anthropic` / `claude-haiku-4-5-20251001`;
- cache decision remained `canRead: false`, `canWrite: false`;
- public job detail returned `404` without admin key;
- internal artifact route returned `401` without admin key;
- `adapterAttemptDiagnostics` showed two attempts, both `parse_failure`;
- failure message: `JSON parse error: Unexpected token '\`', "```json\n{\n"... is not valid JSON`.

The provider produced a whole-response Markdown JSON fence even though the prompt asks for only one JSON object. The problem was therefore an output-channel/structural parsing failure, not yet evidence for a prompt, schema, model, or Evidence Lifecycle change.

## 2. Review Consolidation

Three focused reviewers debated the next fix:

- Runtime architecture reviewer: prefer a narrow adapter-owned whole-response fence parser; defer structured SDK output because it changes provider-boundary ownership.
- TypeScript/test reviewer: prefer the same strict adapter parser; `generateObject` is deprecated in AI SDK 6 and provider-side schema validation would move retry/classification out of the adapter.
- LLM output-contract reviewer: prefer AI SDK 6 structured output via `generateText` plus `Output.object(...)` to prevent off-contract Markdown output at generation time.

Consolidated decision:

Use the strict adapter parser for 4C6 because it is the lowest-net-complexity correction inside the existing adapter-owned parse/validate/retry mechanism. Do not change prompt text, model policy, schema, provider SDK mode, UCM defaults, public result shape, cache IO, ACS/direct URL execution, approval state, or V1 code.

Structured SDK output remains a future provider-boundary revision candidate if strict parsing does not produce accepted contracts reliably or if adapter-owned structural retry proves insufficient.

## 3. Source Result

Implementation commit: `57dc2308` (`fix: accept fenced v2 claim understanding json`).

Changed source:

- `apps/web/src/lib/analyzer-v2/claim-understanding/model-adapter.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts`

Behavior:

- direct `JSON.parse(...)` remains the first path;
- if direct parse fails, the adapter accepts exactly one whole-response Markdown code fence with optional `json` label;
- the adapter rejects prose plus a fenced object, multiple fenced objects, unterminated fences, and malformed inner JSON as `parse_failure`;
- Zod schema validation remains unchanged after structural parsing;
- adapter attempt diagnostics remain bounded and internal-only.

This is structural unwrapping only. It is not semantic repair, prompt mutation, model escalation, broad JSON extraction, or compatibility with arbitrary malformed output.

## 4. Verification

Local verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts` - passed, 12 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-factory.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 55 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 26 files / 217 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

Runtime refresh:

- committed source before live jobs;
- reseeded prompts/configs;
- restarted API and Web;
- enabled only the approved hidden V2 gates: stored variant `claimboundary-v2`, V2 shell gate, and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.

## 5. Live Smoke Results

### 5.1 Plastic Recycling Smoke

Captain-defined input: `Plastic recycling is pointless`.

Job: `df29d295c4cc47cda021c9e57f559a50`.

Result:

- status `SUCCEEDED`;
- hidden immediately;
- pipeline variant `claimboundary-v2`;
- executed hash `57dc23084dba1ab772f0cd41002af63adcf7cd4b+f9d5dc0e`;
- public result remained `_schemaVersion: 4.0.0-cb-precutover`, pipeline `claimboundary-v2`, `UNVERIFIED`, truth `50`, confidence `0`, issue `report_damaged`;
- hidden artifact count `1`;
- `executionStatus: completed`;
- `gatewayTaskStatus: executable`;
- provider/model `anthropic` / `claude-haiku-4-5-20251001`;
- token usage `1688` input, `154` output, `1842` total;
- duration `1737ms`;
- `schemaOutcome.status: blocked`;
- `blockedReason: no_valid_claim`;
- adapter attempt diagnostics: one attempt, `accepted`;
- cache decision `canRead: false`, `canWrite: false`;
- public job detail without admin key returned `404`;
- internal artifact route without admin key returned `401`.

Interpretation:

The parser defect is fixed for this path: there is no repeated `parse_failure`, no second provider call, and no public leakage. The input was classified as `blocked/no_valid_claim`, which is a Claim Understanding quality/policy observation for a later prompt/schema/model review gate, not an output parsing defect.

### 5.2 Hydrogen Cars Smoke

Captain-defined input: `Using hydrogen for cars is more efficient than using electricity`.

Job: `591d39d68c3e4483bc6bd353ba21071a`.

Result:

- status `SUCCEEDED`;
- hidden immediately;
- pipeline variant `claimboundary-v2`;
- executed hash `57dc23084dba1ab772f0cd41002af63adcf7cd4b+f9d5dc0e`;
- public result remained `_schemaVersion: 4.0.0-cb-precutover`, pipeline `claimboundary-v2`, `UNVERIFIED`, truth `50`, confidence `0`, issue `report_damaged`;
- hidden artifact count `1`;
- `executionStatus: completed`;
- `gatewayTaskStatus: executable`;
- provider/model `anthropic` / `claude-haiku-4-5-20251001`;
- token usage `1697` input, `527` output, `2224` total;
- duration `3208ms`;
- `schemaOutcome.status: accepted`;
- adapter attempt diagnostics: one attempt, `accepted`;
- cache decision `canRead: false`, `canWrite: false`;
- public job detail without admin key returned `404`;
- internal artifact route without admin key returned `401`.

Interpretation:

The direct-text Claim Understanding runtime can now produce an accepted internal `ClaimContract` under the hidden gate while the public V2 result remains the damaged pre-cutover envelope.

## 6. Guardrails Preserved

- No V1 analyzer/prompt/type reuse.
- No prompt text change.
- No schema change.
- No model-policy or provider-model change.
- No provider SDK/factory behavior change.
- No cache IO.
- No ACS or direct URL runtime dispatch.
- No public API/UI/report/export/compatibility exposure of Claim Understanding internals.
- No approval flips in shipped policy.
- No V1 cleanup or cutover action.

## 7. Next Gate

The next implementation gate can move from "prove direct-text Claim Understanding can produce an accepted internal contract" to an Evidence Lifecycle contract/source gate, but only with the existing pre-cutover constraints:

- consume only an accepted internal `ClaimContract`;
- keep blocked/damaged Claim Understanding states from starting downstream work;
- keep public output damaged/pre-cutover;
- keep cache IO, public exposure, ACS/direct URL dispatch, and approval flips blocked until later gates;
- define evidence-stage task policy/config snapshot ownership before adding live provider work.

Before broad benchmark use, separately review the `Plastic recycling is pointless` `blocked/no_valid_claim` outcome. That review is prompt/model/schema policy work and needs a separate LLM Expert/Captain-approved gate before changing prompt text or model behavior.
