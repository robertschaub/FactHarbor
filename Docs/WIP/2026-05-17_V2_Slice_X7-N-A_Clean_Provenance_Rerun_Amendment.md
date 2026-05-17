# V2 Slice X7-N-A Clean-Provenance Rerun Amendment

**Date:** 2026-05-17
**Status:** draft amendment; docs-only; live job allowed only after reviewer acceptance, package commit, clean worktree, runtime refresh, and pre-run verifiers
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `ea0e04ab` (`docs: record v2 x7n contaminated smoke result`)
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-N_Post_X7M_Direct_Text_Live_Smoke_Execution_Package.md`
**Parent result:** `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N_Live_Smoke_Provenance_Contaminated_Result.md`
**Gate type:** one-job clean-provenance recovery amendment.
**Review result:** Architect APPROVE, LLM/semantic APPROVE, Security/runtime MODIFY then accepted after provider-boundary and no-public-leak clarifications, Code/package MODIFY then accepted after staging-order, prompt/config-state, and parent-section-reference clarifications.

## 1. Purpose

X7-N's first live job functionally showed that the repaired X7-M German direct-text Claim Understanding path can produce accepted hidden `ClaimContract` output and X7-J intake readiness. It cannot be accepted as a passing gate because unrelated docs churn dirtied the worktree during execution and the job recorded a dirty execution hash:

```text
a6f6a43ca4ce814af849914a6cbd5c3a24e7b5c7+0a06eb2f
```

X7-N-A exists only to recover clean provenance for that one observation. It does not expand X7-N. It does not run the second X7-N canary. It does not authorize any new pipeline capability.

## 2. Approval Requested

Approve one clean live rerun of this exact Captain-approved input:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

This amendment authorizes at most one live job after:

1. this package is accepted by Architect, Security/runtime, Code/package, and LLM/semantic review;
2. this package is committed;
3. unrelated cleanup/documentation stashes remain isolated;
4. the worktree is clean immediately before runtime refresh;
5. the runtime is refreshed from the committed package revision;
6. the required pre-run verifiers and admin-route preflight pass;
7. the worktree is clean immediately before submission.

The run is invalid unless the post-run worktree is also clean immediately after artifact inspection.

The only allowed model/provider activity is the existing, already-approved hidden direct-text Claim Understanding LLM/model-provider call required by the 4C3b/X7-N runtime path. Query Planning model/provider execution, source-provider/search/fetch/content-dereference/provider-network/parser execution, and all other provider behavior remain forbidden.

## 3. Non-Authorization

X7-N-A does not authorize:

- the second X7-N canary;
- new prompt/frontmatter/config/model/schema edits;
- Query Planning execution or X3-B implementation;
- X5 hidden integration harness execution;
- X6/X7 source-acquisition harness execution;
- source-provider/search/fetch/content-dereference/provider-network/parser execution;
- packet/frame/byte consumption, parsed material, source material, EvidenceCorpus, EvidenceItems, warnings, report generation, verdicts, confidence, or user-facing quality behavior;
- product/public/API/UI/report/export wiring or public V2 cutover;
- cache IO, durable runtime artifact storage, Source Reliability, ACS/direct URL execution;
- B3 proof execution, 2D-C, V1 reuse, V1 work, or V1 cleanup.

## 4. File Envelope

This amendment is docs-only. The allowed package/commit envelope is limited to:

- `Docs/WIP/2026-05-17_V2_Slice_X7-N-A_Clean_Provenance_Rerun_Amendment.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-N-A package handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, model, schema, test, API/UI, `package.json`, `package-lock.json`, or script files may be changed. If any verifier fix or runtime fix is needed, stop and create a separate reviewed package.

## 5. Required Verification Before Package Commit

Run before committing this amendment. First stage only the exact section 4 envelope. The expected staged file list is:

- `Docs/WIP/2026-05-17_V2_Slice_X7-N-A_Clean_Provenance_Rerun_Amendment.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-N-A package handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

Then run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

## 6. Required Verification Before Live Rerun

Run after package commit and before job submission:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all
```

Do not run expensive validation suites.

## 7. Runtime Refresh And Clean-Provenance Proof

Before submission:

1. stop stale local web/API processes if they are still running;
2. start API and web from the committed X7-N-A revision;
3. enable only the existing V2 shell and hidden direct-text Claim Understanding runtime gates:
   - `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-precutover`;
   - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`;
4. record prompt/config reseed state or prompt hash state, including `apps/web/prompts/claimboundary-v2.prompt.md` SHA-256 if no reseed was required;
5. record health checks for web and API;
6. run the exact admin-route preflight from `Docs/WIP/2026-05-17_V2_Slice_X7-N_Post_X7M_Direct_Text_Live_Smoke_Execution_Package.md` section 8;
7. record `git status --short --untracked-files=all` immediately before submission.

After artifact inspection:

1. record `git status --short --untracked-files=all` immediately after inspection;
2. reject the run as gate evidence if the worktree is dirty;
3. reject the run as gate evidence if the job execution hash has a dirty suffix.

## 8. Pass Criteria

The one rerun passes X7-N-A only if all of these hold:

- the job input exactly matches section 2;
- job status reaches `SUCCEEDED`;
- stored variant is `claimboundary-v2`;
- job execution hash is exactly a committed hash without dirty suffix;
- pre-submission and post-inspection worktree status are clean;
- public result remains `_schemaVersion: 4.0.0-cb-precutover`;
- public result remains `meta.publicCutoverStatus: blocked_precutover`;
- public compatibility output remains damaged/blocked and is not interpreted as a valid V2 answer;
- unauthenticated access to both artifact routes returns `401`;
- authenticated artifact route responses show `visibility: internal_admin_only` and `publicPointerExposure: forbidden`;
- authenticated X7-J Evidence Lifecycle intake artifact route success response includes `Cache-Control: no-store`;
- public result serialization does not expose artifact id, ledger id, artifact body, artifact sink marker, activation snapshot hash, runtime config hash, prompt hashes, rendered prompt hash, cache-decision reason, provider telemetry object, X7-J status markers, or intake artifact fields;
- authenticated Claim Understanding artifact route returns at least one artifact for `<jobId>:precutover-observability`;
- authenticated X7-J Evidence Lifecycle intake artifact route returns at least one artifact for the same ledger id;
- artifact route responses remain internal-only and no-store where applicable;
- latest Claim Understanding artifact has `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, and `schemaOutcome.status: accepted`;
- latest Claim Understanding artifact has no blocked or damaged schema reason;
- X7-J artifact shows `claimUnderstanding.handoffStatus: accepted`, `claimUnderstanding.selectedAtomicClaimCount >= 1`, `evidenceLifecycleIntake.status: intake_ready`, `observationStatus: contract_observed_preexecution`, `claimContractPresent: true`, and `executionScope: contract_only_no_provider_execution`;
- all X7-J downstream execution flags are false;
- the German direct-text job does not fail with `claim_contract_validation_failed` caused by flat `input.selectedAtomicClaimIds`;
- no non-authorized behavior from section 3 appears.

## 9. Hard Fail Criteria

Stop and record failure if any of these occur:

- package or runtime worktree is dirty at any required clean checkpoint;
- any input other than section 2 is submitted;
- a second live job is submitted under X7-N-A;
- runtime is stale or not refreshed from the committed package revision;
- job execution hash has a dirty suffix;
- hidden artifact routes are unavailable or publicly accessible without admin key;
- public output exposes hidden artifacts or presents V2 as valid;
- any section 3 non-authorization is violated.

## 10. Completion Requirements

Before live execution, create and commit:

- this reviewed amendment package;
- status pointers in `Current_Status.md` and `Backlog.md`;
- an `Agent_Outputs.md` entry;
- a package handoff;
- rebuilt `handoff-index.json`.

After live execution, create a separate result closeout that records:

- package commit;
- runtime refresh method;
- prompt/config reseed state or prompt hash state;
- exact clean-status checkpoints;
- exact input;
- job id and ledger id;
- public result checks;
- Claim Understanding artifact checks;
- X7-J intake artifact checks;
- pass/fail classification;
- residual blockers.

## 11. Review Questions

Architect:

- Is X7-N-A narrow enough to recover clean provenance without reopening X7-N broadly?
- Does it preserve all downstream blockers?

Security/runtime:

- Are the clean-worktree checkpoints and dirty-hash rejection sufficient?
- Are the admin-route and no-public-leak criteria still adequate?

Code/package:

- Is the file envelope enforceable and free of source/test/config drift?
- Are the verifier and runtime commands concrete enough?

LLM/semantic:

- Does the amendment avoid treating the runtime payload as report-quality or truth evidence?
- Does it avoid introducing prompt examples or topic-specific prompt pressure?
