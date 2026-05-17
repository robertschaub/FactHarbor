---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n, live-smoke, claim-understanding, provenance]
files_touched:
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N Live-Smoke Provenance-Contaminated Result

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N Live-Smoke Provenance-Contaminated Result

**Task:** Record the outcome of the X7-N post-X7M direct-text live-smoke attempt.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decision:** X7-N is classified as `PROVENANCE_CONTAMINATED_PARTIAL_OBSERVATION`, not pass. The first job functionally demonstrated the repaired German direct-text Claim Understanding path, but dirty worktree provenance invalidates it as gate evidence.
**Open items:** If clean evidence is still required, draft and review a tiny X7-N-A amendment for exactly one German canary rerun after unrelated docs churn is isolated and clean status is proven immediately before and after submission.
**Warnings:** Do not run the second X7-N canary under the original package. Do not treat this result as downstream gate approval. Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, and V1 cleanup remain blocked.
**For next agent:** Preserve unrelated stashes. Do not pop archive/instruction-cleanup stashes into the X7-N result branch state before committing or rerunning live jobs; that would reintroduce dirty provenance.
**Learnings:** Live-smoke gates need clean-worktree proof both immediately before job submission and immediately after artifact inspection, not only before runtime refresh.

## Source Package And Runtime

- Execution package: `Docs/WIP/2026-05-17_V2_Slice_X7-N_Post_X7M_Direct_Text_Live_Smoke_Execution_Package.md`.
- Package commit: `a6f6a43c docs: approve v2 x7n post-repair live smoke`.
- Prompt file hash observed before execution: `C812FF5B52A1BE45EBC77765D3CD27D9186DACCE6AC9ADE5FC2927C4101C793A`.
- Runtime was refreshed locally with the V2 shell and hidden direct-text Claim Understanding runtime enabled.

## Pre-Run Verification

The pre-run verifier set passed before the live job:

- Focused X7-N verifier: 10 files / 137 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: 35 files / 208 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: 74 files / 523 tests passed.
- `npm -w apps/web run build`: passed.
- `npm run validate:v2-gates`: passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`: passed.
- `git diff --check`: passed.

Admin route preflight passed:

- Claim Understanding artifact route unauthenticated: 401.
- X7-J intake artifact route unauthenticated: 401.
- Claim Understanding route unknown ledger with admin key: 200 with zero artifacts and internal-only visibility.
- X7-J intake route unknown ledger with admin key: 404 with `Cache-Control: no-store`.

## Live Job Observation

Only the first X7-N canary was submitted:

- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- Job id: `515865dd08c64fd7be501ba8d5ba0dc9`
- Ledger id: `515865dd08c64fd7be501ba8d5ba0dc9:precutover-observability`
- Job status: `SUCCEEDED`
- Pipeline variant: `claimboundary-v2`
- Recorded execution hash: `a6f6a43ca4ce814af849914a6cbd5c3a24e7b5c7+0a06eb2f`

Functional observations:

- Public result stayed `_schemaVersion: 4.0.0-cb-precutover`.
- Public result stayed `meta.publicCutoverStatus: blocked_precutover`.
- Public result carried `analysisIssueCode: report_damaged`.
- Public scan found no runtime/X7-J artifact markers.
- Claim Understanding artifact route returned one internal-only artifact with `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, and `schemaOutcome.status: accepted`.
- X7-J intake artifact route returned one internal-only artifact with `Cache-Control: no-store`, `claimUnderstanding.handoffStatus: accepted`, `claimUnderstanding.selectedAtomicClaimCount >= 1`, `evidenceLifecycleIntake.status: intake_ready`, `observationStatus: contract_observed_preexecution`, `claimContractPresent: true`, and `executionScope: contract_only_no_provider_execution`.
- Downstream execution flags remained false.

## Provenance Failure

The job cannot be accepted as a passing gate because unrelated docs changes reappeared during or immediately after execution. The job recorded a dirty suffix in the execution hash:

`a6f6a43ca4ce814af849914a6cbd5c3a24e7b5c7+0a06eb2f`

Deputy review disposition from the running session:

- Code/package reviewer: classify as `PROVENANCE_CONTAMINATED_PARTIAL_OBSERVATION`; do not run the second canary under X7-N.
- Architect reviewer: same.
- Security/runtime reviewer: same.

The second X7-N canary was not run.

## Preserved Unrelated Work

Unrelated concurrent docs/instruction/archive work was preserved in named stashes. The newest relevant preservation stashes are:

- `pre-x7n-result-preserve-reappeared-v1-cost-doc-cleanup`
- `pre-x7n-result-preserve-reappeared-agent-instruction-cleanup-tail`
- `pre-x7n-result-preserve-reappeared-archive-cleanup-with-result-attempt`
- `pre-x7n-result-preserve-unrelated-active-docs-cleanup`
- `pre-x7n-closeout-preserve-unrelated-agent-output-handoff-cleanup`
- `pre-x7n-closeout-preserve-unrelated-docs-drift`
- `pre-x7n-preserve-unrelated-agent-instruction-cleanup`
- `pre-x7n-preserve-unrelated-pipelinev1-archive-moves`
- `pre-x7n-preserve-unrelated-agent-outputs-amendment`

Use stash names rather than stash ordinals because ordinals move.

## Next Safe Step

If clean X7-M live evidence is still needed, create a tiny X7-N-A package with these limits:

- one rerun only, using the same German Captain-approved input;
- no second canary unless a later package explicitly approves it;
- clean worktree proof immediately before submission;
- clean worktree proof immediately after artifact inspection;
- runtime refresh from the committed state;
- same admin-only artifact and public fail-closed checks as X7-N;
- no additional pipeline capability.

No downstream implementation or cutover gate is unlocked by this partial observation.
