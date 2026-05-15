# Lead Architect Handoff - V2 4C3c Hidden Artifact Ledger Fix

Date: 2026-05-15
Role: Lead Architect / Captain deputy
Branch: main

## Summary

During the first 4C3c direct-text smoke, job `85ceff71ee274f80a8bbddd56b58f64b` completed through the V2 hidden direct-text runtime path and returned the expected damaged pre-cutover public envelope. The internal inspection route, however, returned `artifactCount: 0` for ledger `85ceff71ee274f80a8bbddd56b58f64b:precutover-observability`.

Root cause: the hidden artifact sink used a module-scoped `Map`. Under the web runtime's route/module reload boundaries, the execution path and inspection route can see different module instances, so the route may miss artifacts written by runtime execution.

## Change

- `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.ts`
  - moved the bounded internal ledger store from module-local scope to a process-global `globalThis` property;
  - preserved the same bounded in-memory, non-public, non-durable sink behavior.
- `apps/web/test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts`
  - added a verifier that recorded artifacts remain readable after module reload.
- `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3_Product_Activation_Approval_Package.md`
  - clarified that the 4C3c inspection ledger is process-global within the web runtime.

## DEBT-GUARD RESULT

Task classification: bugfix guard / failed smoke verifier recovery, Full Path.

Symptom: 4C3c smoke job reached `runtime_dispatch_completed`, but authenticated hidden-artifact inspection returned zero records.

Verifier: live job `85ceff71ee274f80a8bbddd56b58f64b` plus GET `/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=85ceff71ee274f80a8bbddd56b58f64b%3Aprecutover-observability`.

Causal classification: incomplete-existing-mechanism.

Options considered:
- Revert inspection route: rejected because the route is still required for 4C3c acceptance.
- Add durable/file/DB persistence: rejected because it would broaden the approved sink and violate the temporary non-durable scope.
- Amend existing sink: chosen, because the current sink contract is correct but storage scope was too narrow.

Complexity budget: one existing file amended, one focused test added, one documentation clarification. No new public route, no new persistence mechanism, no cache IO, no result/report/export/UI exposure.

Residual risk: this remains same-process only. It is adequate for the local 4C3c smoke but must be replaced by a reviewed durable/admin-owned observability store before multi-process production evaluation.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run build`

All passed before commit.

## Next

Commit this fix, restart web/API from the new commit, then re-run one Captain-defined direct-text smoke. Do not expand to additional live jobs until the hidden artifact is inspectable and public-output isolation is verified.
