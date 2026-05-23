# V2 HighJump HJ51 - UI Direct V2 Submission

**Status:** local implementation verifier-clean; live UI/direct-submission validation pending
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ50 report `2d7402c4dc8947438b2f0ff74e5c8ce6`

## Why This Slice Exists

The Captain asked to see V2 reports in the UI and to manually submit V2 jobs,
with V2 as the default pipeline configured through UCM and reseeding. The
existing Analyze page still created a claim-selection draft first, which can
leave the user on a "Preparing Analysis" page where no report job exists yet.

HJ51 makes the default V2 manual path direct: the Analyze page posts to the
UCM-backed `/api/fh/analyze` route and navigates to `/jobs/{jobId}`. The route
already resolves `defaultPipelineVariant` from UCM, and the default config is
`claimboundary-v2`.

## Scope

Allowed:

- make the manual Analyze page create a job directly through `/api/fh/analyze`;
- preserve invite-code/admin-key forwarding;
- rely on the existing UCM default pipeline variant;
- keep existing draft/session pages available for older sessions and explicit
  routes.

Closed:

- public cutover approval, non-admin V2 report exposure, V1 cleanup, prompt
  edits, provider expansion, parser/cache/SR/storage behavior, report schema
  changes, and broad UI redesign.

## V2 Scorecard Impact

Positive:

- V2-Q1 Usable report path: users land on a real job page instead of a draft
  holding page.
- V2-Q6 Report quality feedback: makes internal V2 reports easier to inspect
  immediately after submission.
- V2-Q10 Complexity convergence: removes a V2 detour through the V1-era
  claim-selection preparation UI for default manual submissions.

## V2 Retirement Ledger Impact

This does not delete the claim-selection draft machinery, but it reduces its
role in the default V2 path. Retirement pressure remains: once V2 has its own
stable claim-understanding/selection UX, obsolete V1-era preparation surfaces
should be merged or removed.

## V2 Consolidation Gate

Allowed because it reduces friction and hidden workflow burden without adding a
new mechanism. It uses the existing direct analyze route and existing job page.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the Analyze page to use the existing direct job-creation
route for manual submissions.

Rejected paths:

- adding a second V2-specific submission route, because `/api/fh/analyze`
  already resolves the UCM default pipeline and creates jobs;
- changing public V2 result compatibility or non-admin report exposure, because
  report visibility should remain controlled until a reviewed cutover/exposure
  package;
- extending the claim-selection draft UI, because the Captain's immediate pain
  is the draft detour itself.

Net mechanisms: unchanged. Existing direct analyze route replaces the default
manual UI path for new submissions.

Residual risk: old draft sessions remain visible in the active-sessions list.
That is acceptable for continuity and should be cleaned up in a later UX
consolidation pass, not inside this slice.

## Verification Plan

- focused Analyze route tests;
- focused claim-selection route tests to ensure the older draft routes still
  work;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- commit;
- refresh runtime and verify Web/API/proxy commit match;
- one UI/direct-submission live job may be used as a stronger functional
  validation step, consuming one job from the 17 remaining budget.

Local verifier result, 2026-05-23:

- `npm -w apps/web run test -- test/unit/app/api/fh/analyze-route.test.ts test/unit/app/api/fh/claim-selection-drafts-routes.test.ts`
  passed: 2 files, 18 tests.
- `npm run validate:v2-gates` passed.
- `npm run debt:sensors` returned `advisory_warn` with the known V2
  source/test footprint, boundary-guard size, docs footprint, and
  consolidation-marker warnings.
- `npm -w apps/web run build` passed.
- `git diff --check` passed.

## Stop Conditions

Stop if this requires public V2 cutover, non-admin report exposure, a new route,
prompt/model/schema/config edits, V1 cleanup, broad claim-selection refactor,
cache/SR/storage behavior, parser/provider widening, or raw text leakage into
public/default-admin/log/error surfaces.
