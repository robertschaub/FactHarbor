# V2 Slice 7A Evidence Lifecycle Intake Contract

**Date:** 2026-05-15
**Status:** source implemented at `08c7ddae`
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `4a2176fe` (`docs: record v2 output coercion smoke`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Trigger

After 4C6, the hidden direct-text Claim Understanding runtime had one accepted internal `ClaimContract` smoke and one separate `blocked/no_valid_claim` observation for `Plastic recycling is pointless`.

Three reviewers converged on the next safe step:

- continue Evidence Lifecycle only as an accepted-`ClaimContract` contract boundary;
- do not block the contract boundary on the plastic-policy observation;
- do not start provider/search/fetch/LLM evidence work yet;
- keep prompt/model/schema policy review separate.

## 2. Source Result

Implementation commit: `08c7ddae` (`feat: add v2 evidence lifecycle intake`).

Changed source:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/intake.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Behavior:

- `buildEvidenceLifecycleIntake(...)` accepts only `ClaimUnderstandingStageHandoff.status === "accepted"` with a non-null `ClaimContract`;
- accepted handoffs produce an internal-only `EvidenceLifecycleIntake` carrying the exact `ClaimContract`;
- blocked and damaged handoffs return a blocked start decision and no fabricated intake;
- malformed accepted handoffs with a missing `ClaimContract` fail closed;
- the new Evidence Lifecycle folder is guarded as contract-only.

No orchestrator wiring was added. The public V2 result remains the damaged pre-cutover envelope.

## 3. Guardrails Preserved

- No V1 analyzer/prompt/type reuse.
- No prompt text change.
- No model policy, UCM, provider factory, provider SDK, or schema change.
- No source acquisition, fetch, search, cache IO, or runtime dispatch.
- No public API/UI/report/export/compatibility exposure.
- No ACS/direct URL runtime path.
- No approval flips in shipped policy.
- No V1 cleanup or cutover action.

## 4. Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2/claim-understanding/stage-handoff.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 3 files / 47 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 27 files / 222 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

No live jobs were needed for this contract-only slice.

## 5. Next Gate

The next Evidence Lifecycle gate should be a reviewed source-acquisition/task-policy contract package before source work. It should define:

- how an `EvidenceLifecycleIntake` becomes a source-acquisition request;
- exact provider/search/fetch ownership boundaries;
- evidence task policy and config snapshot ownership;
- source reliability integration as a thin unchanged service boundary;
- no-cache/no-public/no-provider-execution defaults until approved;
- verifier requirements for accepted-intake-only behavior.

The `Plastic recycling is pointless` `blocked/no_valid_claim` outcome remains a separate Claim Understanding policy-quality review item before broad benchmark use or cutover.
