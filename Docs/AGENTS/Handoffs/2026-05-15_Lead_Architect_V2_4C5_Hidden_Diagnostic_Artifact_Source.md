# Lead Architect Handoff - V2 4C5 Hidden Diagnostic Artifact Source

**Date:** 2026-05-15
**Role:** Lead Architect / Captain deputy
**Task:** Implement V2 6B.3c-4C5 hidden adapter-attempt diagnostics for Claim Understanding
**Implementation commit:** `4b36aab5` (`feat: add v2 hidden attempt diagnostics`)
**Approval source:** Deputy-team debate after 4C4; reviewers unanimously recommended hidden diagnostics before prompt/schema/model fixes or Evidence Lifecycle.
**Gate document:** `Docs/WIP/2026-05-15_V2_Slice_6B3c4C5_Hidden_Diagnostic_Artifact_Gate.md`
**Checklist:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## Summary

The hidden runtime artifact now preserves bounded adapter attempt diagnostics so the 4C3c `claim_contract_validation_failed` result can be diagnosed without changing public behavior.

The artifact sink version is now `v2.claim-understanding.runtime-artifact-sink.1`. Hidden artifacts include `adapterAttemptDiagnostics`, populated from `dispatchResult.adapterOutcome.attempts` inside `runtime-stage.ts`.

The diagnostic payload is internal-admin-only and bounded:

- attempt number;
- attempt status;
- prompt content hash;
- provider telemetry;
- failure message truncated at 500 characters.

It does not include raw provider output, rendered prompt text, full provider request, input text, secrets, cache contents, or public pointers.

## Files Changed

- `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.ts`
- `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-15_V2_Slice_6B3c4C5_Hidden_Diagnostic_Artifact_Gate.md`
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

Related reviewer artifact:

- `Docs/AGENTS/Handoffs/2026-05-15_LLM_Expert_V2_4C3c_Claim_Understanding_Diagnostics_Gate_Review.md`

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 56 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 26 files / 212 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

## Debt-Guard Result

Classification: incomplete-existing-mechanism.

Chosen option: amend the existing hidden artifact mechanism; no prompt/schema/model fix and no new public diagnostic path.

Rejected path and why: direct prompt/schema/model edits were rejected because current evidence is too coarse; Evidence Lifecycle was rejected because no accepted direct-text `ClaimContract` exists yet.

What was removed/simplified: nothing removed; no parallel path added.

What was added: one bounded internal artifact field plus focused tests and boundary guard coverage.

Net mechanism count: unchanged for execution behavior; hidden artifact schema gains one diagnostic field.

Budget reconciliation: patch stayed within the approved 4C5 source/docs envelope.

Verification: focused tests, full V2/runtime tests, build, and whitespace check passed.

Debt accepted and removal trigger: the in-memory hidden artifact remains temporary pre-cutover smoke diagnostics until real observability/UCM task-policy storage replaces it.

Residual debt: one committed/refreshed live diagnostic smoke is still needed to collect attempt diagnostics from the real provider path.

## Next Step

Commit this slice, refresh the runtime, then run at most one Captain-defined hidden direct-text diagnostic smoke if the environment is ready. Use `Plastic recycling is pointless` unless Captain chooses another approved input.

Do not edit prompts, schemas, model policy, provider behavior, UCM defaults, or Evidence Lifecycle until the enriched artifact identifies the failure class.

## Warnings

- `adapterAttemptDiagnostics` must remain out of public result/report/UI/export/compatibility surfaces.
- The hidden artifact route is admin-only and diagnostic; it is not durable production observability.
- Prompt/config/model/schema changes still need separate review and Captain approval.

## Learnings

- Coarse `damagedReason` values are enough for public safety but not enough for pre-cutover quality diagnosis.
- Internal diagnostic enrichment should preserve the smallest useful schema-attempt summary rather than raw model outputs.
