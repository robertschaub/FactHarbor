# ACS Observability Contracts Lane 2 Status

Date: 2026-05-03
Branch: `codex/integrate-acs-observability-contracts`
Base: `main` / `dc402b86`

This document is re-authored from the reviewed `codex/main-regression-snapshot-2026-05-01` worktree as current-branch implementation status. It does not imply the snapshot's held scheduling, budget-admission, prepared-routing, prompt, or Stage 4 verdict-repair code is present here.

## Implemented In This Lane

- `AtomicClaim.checkWorthiness` is contract-aligned to `high | medium | low` and labeled as a Stage 1 extraction hint in admin/developer report surfaces.
- ACS recommendation LLM calls are attributed to the dedicated `claim_selection` metrics task type.
- Selected-claim research coverage is serialized under `analysisObservability.acsResearchWaste` for diagnostics only. It records targeted main iterations, total iterations, query/fetch counts, admitted-vs-final evidence counts, elapsed iteration time, sufficiency state, and zero-targeted selected claim IDs.
- Job submission provenance is persisted as nullable `Jobs.SubmissionPath` with structural values `direct-api`, `retry`, `acs-interactive-draft`, and `acs-automatic-draft`.
- Admin job list/detail responses expose submission provenance plus created/executed git and prompt hashes.
- `prompt-surface-registry.ts` inventories runtime prompt surfaces and intentional exceptions without changing prompt wording or routing.
- Validation summaries and batch comparisons can now show ACS zero-targeted coverage and mixed git/prompt hashes.

## Explicitly Not Implemented Here

- No selected-claim budget cap or admission enforcement.
- No Stage 2 scheduling change, protected-window change, zero-yield exhaustion change, or warning severity change.
- No prompt wording change, UCM default mutation, reseed, service restart, or live-job submission.
- No Stage 1 or Stage 4 quality-repair lane from the regression snapshot.

## Expected Result

This lane makes future canaries interpretable. It does not improve the three bad live reports observed on the admin-preparation branch, because those failures require held quality-fix lanes that are still outside this rollout.

## Residual Risks

- Existing historical jobs have `SubmissionPath = NULL`.
- `analysisObservability.acsResearchWaste` is additive and may be absent on older reports or early damaged reports.
- The prompt-surface registry is an inventory, not a build-time exhaustiveness enforcer.
- Current `main` still lacks the selected-claim admission/coverage fixes and the held Stage 4 verdict-repair substrate.
