---
### 2026-04-29 | Senior Developer | Codex (GPT-5) | Remaining Unification Implementation
**Task:** Implement the remaining ACS/check-worthiness unification roadmap beyond Phase 1a, with reviews/debate where needed, commits, verification, docs, and service refresh.

**Files touched:** `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/research-waste-metrics.ts`, `apps/web/src/lib/analyzer/metrics.ts`, `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`, `apps/web/src/lib/prompt-surface-registry.ts`, `apps/web/scripts/automatic-claim-selection.js`, `scripts/validation/extract-validation-summary.js`, `scripts/validation/compare-batches.js`, `apps/api/Data/Entities.cs`, `apps/api/Data/FhDbContext.cs`, `apps/api/Program.cs`, `apps/api/Services/JobService.cs`, `apps/api/Controllers/JobsController.cs`, `apps/api/migrations/007_add_job_submission_path.sql`, focused tests, ACS/prompt xWiki pages, and `Docs/WIP/2026-04-29_Remaining_Unification_Implementation_Status.md`.

**Key decisions:** Kept the contract-first architecture. Stage 1 remains the `AtomicClaim` validity authority; ACS-CW remains the post-Gate-1 recommendation authority. Implemented selected-claim research coverage, validation budget/coverage summaries, `claim_selection` task attribution, `SubmissionPath`, `analysisRunProvenance`, and a prompt-surface registry. No prompt wording, UCM defaults, selector behavior, Stage 2 scheduling, or warning severity changed. Reviewer-requested fixes were applied: draft-backed jobs now distinguish `acs-interactive-draft` and `acs-automatic-draft`; prompt registry covers inline prompt exceptions; batch comparison reads `promptContentHash`.

**Open items:** Selected claims can still receive zero targeted Stage 2 main research; this is now visible but not fixed. Prompt-governance exceptions remain for SR core, grounding-check legacy sections, Stage 1 inline framing, SR evidence-pack inline helpers, and inverse calibration. Direct endpoint policy enforcement remains deferred. Shared/generated DTO work remains deferred until the observability/provenance contracts stabilize.

**Warnings:** Local services were restarted after the final commits, and API/Web health checks returned `200`. Plain `dotnet build` against the normal API output path was previously blocked by the running service lock; `dotnet build -p:UseAppHost=false -o ..\..\test-output\api-build` passed. Live verification jobs used: 0 of 8.

**For next agent:** Start from commits `59e1c806`, `ba234200`, `78013460`, `423a49fd`, `5e5272ab`, and `fc8052e3`. The detailed status is in `Docs/WIP/2026-04-29_Remaining_Unification_Implementation_Status.md`. For Stage 2 behavior follow-up, use `analysisObservability.acsResearchWaste.selectedClaimResearchCoverage` and validation fields `zeroTargetedSelectedClaimCount` / `zeroTargetedSelectedClaimIds`; do not infer a selector bug from those fields alone.

**Learnings:** Not appended to `Role_Learnings.md`; the practical lesson is captured here: prompt-governance inventories must include inline model-facing fragments, not only `.prompt.md` files.

```text
DEBT-GUARD RESULT
Scope: Remaining ACS/check-worthiness contract/provenance/observability implementation.
Starting budget: contract-first edge cleanup; no new analysis authority, selector, prompt wording, UCM default, or Stage 2 behavior change.
Failed/contested attempts: initial test invocations used workspace-relative paths under the web package; classified as verifier-command issue and kept. Normal API output build was blocked by the running service lock; classified as environment/output lock and verified with alternate output build. Final reviewer REQUEST_CHANGES was kept as valid and fixed narrowly.
Complexity decision: amended existing contracts and summaries rather than adding a parallel selector or metrics subsystem.
Final diff shape: additive telemetry/provenance/registry fields, focused tests, docs, and one API column/migration.
Verification: focused Vitest suite, `npm -w apps/web run build`, API alternate-output build, `git diff --check`, service restart plus health checks, and final reviewer re-review APPROVE.
```
