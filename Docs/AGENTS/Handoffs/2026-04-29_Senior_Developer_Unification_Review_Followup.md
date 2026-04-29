---
### 2026-04-29 | Senior Developer | Codex (GPT-5) | Unification Review Follow-Up
**Task:** Consolidate four architecture/code reviews of the remaining ACS/check-worthiness unification implementation and address the low-risk follow-up comments.

**Files touched:** `apps/api/Controllers/AnalyzeController.cs`, `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/research-waste-metrics.ts`, `scripts/validation/compare-batches.js`, `apps/web/test/unit/scripts/validation-historical-references.test.ts`, `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Prompt Architecture/WebHome.xwiki`, `Docs/WIP/2026-04-29_Remaining_Unification_Implementation_Status.md`.

**Key decisions:** Amended existing mechanisms only. Added an explicit named `submissionPath: "direct-api"` argument for the direct analyze controller, clarified admitted vs final evidence counts, restored a condensed ClaimBoundary section-to-stage/model-task map in Prompt Architecture, and hardened `compare-batches.js` so mixed git/prompt hashes in a batch header are surfaced as `mixed:N [...]` instead of using only the first matched summary.

**Open items:** No C# `SubmissionPath` contract test was added because `apps/api` currently has no test project or test framework package. Add service/controller tests or shared constants if `SubmissionPath` becomes release-gating.

**Warnings:** No runtime behavior, prompt wording, UCM default, selector behavior, Stage 2 scheduling, or warning severity changed. Services were not restarted because the explicit named API argument is behavior-equivalent to the existing default.

**For next agent:** Review follow-up commit is `1ed5744f`. If continuing provenance hardening, start with an API test harness or shared `SubmissionPath` constants; do not add another string contract in a separate layer.

**Learnings:** Not appended to `Role_Learnings.md`; focused reviewer comments can often be handled by amending existing contracts/docs without adding mechanisms.

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism / documentation drift from review findings.
Chosen option: amend existing mechanisms.
Rejected path and why: adding a new API test project was deferred because the API has no current test harness and the review classified it as non-blocking residual debt.
What was removed/simplified: none.
What was added: named direct submission argument, count comments, mixed-hash header summarization, one focused comparator test, and a condensed prompt section map.
Net mechanism count: unchanged.
Budget reconciliation: actual files matched the planned small follow-up scope; no new runtime branch, flag, selector, fallback, or analysis mechanism was added.
Verification: `npm -w apps/web test -- --run test/unit/scripts/validation-historical-references.test.ts`; `dotnet build -p:UseAppHost=false -o ..\..\test-output\api-build`; `npx next build`; `npm -w apps/web run build`; `git diff --check`.
Debt accepted and removal trigger: C# `SubmissionPath` test coverage remains deferred until an API test harness exists or provenance becomes release-gating.
Residual debt: selected-claim Stage 2 distribution remains observable but unfixed from the prior slice.
```
