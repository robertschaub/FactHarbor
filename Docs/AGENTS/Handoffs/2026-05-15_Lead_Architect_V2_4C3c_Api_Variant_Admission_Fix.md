---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 4C3c API Variant Admission Fix

**Task:** Fix 4C3c smoke-readiness after the API rejected `pipelineVariant: "claimboundary-v2"` before job creation.

**Files touched:** `apps/api/Helpers/AnalyzeInputValidator.cs`, `apps/api.Tests/Helpers/AnalyzeInputValidatorTests.cs`, and `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3_Product_Activation_Approval_Package.md`.

**Key decisions:** Amended the existing API structural validator to admit the stored `claimboundary-v2` variant. Did not add a bypass, alternate submission route, new feature flag, or runner-side fallback. Web runner selection remains the authority that decides whether V2 shell actually executes or falls back closed.

**Warnings:** This only permits job creation with the V2 variant string. It does not approve public result exposure, cache IO, ACS/direct URL dispatch, prompt/config changes, broader live-job expansion, or V1 cleanup.

**For next agent:** Commit and refresh the API before retrying the single 4C3c smoke. The failed submission did not create a job; it only proved API admission was incomplete.

**Learnings:** 4C3c product reachability requires API stored-variant admission as well as web runner selection; both must be checked in smoke-readiness.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism.
Chosen option: amend the existing API structural pipeline-variant validator.
Rejected path and why: bypassing API validation or creating a smoke-only endpoint would add a parallel mechanism and weaken normal product ingress.
What was removed/simplified: none.
What was added: `claimboundary-v2` in the existing allowed-variant list plus focused validator tests.
Net mechanism count: unchanged.
Budget reconciliation: patch stayed within API validation, focused API tests, and gate documentation.
Verification: focused API validator tests and API build passed after stopping the running API process that had locked the executable.
Debt accepted and removal trigger: none.
Residual debt: API and web still maintain separate allowed/handled variant lists; acceptable for this gate, but future cutover should consolidate ownership.
