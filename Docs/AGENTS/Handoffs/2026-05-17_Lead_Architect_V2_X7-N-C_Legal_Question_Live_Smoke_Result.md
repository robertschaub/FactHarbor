---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n-c, live-smoke, legal-question, claim-understanding, provenance]
files_touched:
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-C_Legal_Question_Live_Smoke_Result.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N-C Legal-Question Live-Smoke Result

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N-C Legal-Question Live-Smoke Result

**Task:** Record the outcome of the reviewed one-job X7-N-C legal-question direct-text live smoke.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-C_Legal_Question_Live_Smoke_Result.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-N-C is classified as `PROVENANCE_CONTAMINATED_FUNCTIONAL_OBSERVATION`, not pass. The hidden Claim Understanding path accepted the legal/fair-trial direct question and X7-J observed intake readiness, but the post-inspection clean-worktree checkpoint failed after unrelated PipelineV1 archive cleanup reappeared.
**Open items:** Do not submit a second X7-N-C job. If clean legal-question evidence is still needed, isolate unrelated docs churn first and use a new reviewed package, not X7-N-C.
**Warnings:** X7-N-C does not approve truth/legal/fairness conclusions, Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, or V1 cleanup.
**For next agent:** Treat job `d441e8d3e5fe4fbda40c8b31ce3e6830` as useful functional evidence only. It cannot be used as a passing gate because one required provenance checkpoint failed; do not rerun under X7-N-C.
**Learnings:** Live-smoke pass/fail criteria need a hard distinction between runtime source revision evidence and package checkpoint hygiene. A clean executed hash is not sufficient when the package requires post-inspection clean status.

## Source Package And Runtime

- Execution package: `Docs/WIP/2026-05-17_V2_Slice_X7-N-C_Legal_Question_Direct_Text_Live_Smoke_Package.md`.
- Package commit/runtime revision: `c432bd21a5ca3e2ebc36dc29d0ba148f399b4f0b`.
- Prompt file hash observed before execution: `62DC58AAF364029F5F6E655E7A93E21E571F33765E7D8B8A83C45B2255498F8C`.
- Config/prompt reseed during build: `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- API health and web health passed before submission.
- Runtime was refreshed locally with `FH_ANALYZER_V2_SHELL=enabled` and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text` in the actual web process command line.

## Pre-Run Verification

The pre-run verifier set passed before the live job:

- Focused X7-N-C verifier set: 12 files / 150 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: 35 files / 208 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: 74 files / 523 tests passed.
- `npm -w apps/web run build`: passed.
- `npm run validate:v2-gates`: passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`: passed.
- `git diff --check`: passed.

Admin route preflight passed before submission:

- Claim Understanding artifact route unauthenticated: `401`.
- X7-J intake artifact route unauthenticated: `401`.
- Claim Understanding route unknown ledger with admin key: `200`, `artifactCount: 0`, internal-only visibility.
- X7-J intake route unknown ledger with admin key: `404`, `Cache-Control: no-store`, internal-only visibility.

## Live Job Observation

Only the one X7-N-C canary was submitted:

- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Job id: `d441e8d3e5fe4fbda40c8b31ce3e6830`.
- Ledger id: `d441e8d3e5fe4fbda40c8b31ce3e6830:precutover-observability`.
- Job status: `SUCCEEDED`.
- Stored variant: `claimboundary-v2`.
- Result meta executed hash: `c432bd21a5ca3e2ebc36dc29d0ba148f399b4f0b`.
- First preparation event: `Preparing input (pipeline: claimboundary-v2)`.

Event history:

- `Job created`
- `Triggering runner`
- `Runner started`
- `Preparing input (pipeline: claimboundary-v2)`
- `Analyzer V2 orchestrator initialized.`
- `Analyzer V2 damaged structural envelope generated.`
- `Storing result`
- `Result stored`
- `Done`

Functional observations:

- Public result stayed `_schemaVersion: 4.0.0-cb-precutover`.
- Public result stayed `meta.publicCutoverStatus: blocked_precutover`.
- Public result carried `analysisIssueCode: report_damaged`.
- Non-admin public response hidden marker scan found zero literal or pattern leaks.
- Claim Understanding artifact route returned one internal-only artifact with `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, `schemaOutcome.status: accepted`, no blocked reason, and no damaged reason.
- Claim Understanding artifact showed no-store/no-read/no-write runtime cache posture: `cacheDecision.reason: no_store_runtime_dispatch_safety`, `canRead: false`, `canWrite: false`.
- X7-J intake artifact route returned one internal-only artifact with `Cache-Control: no-store`, `claimUnderstanding.handoffStatus: accepted`, `claimUnderstanding.selectedAtomicClaimCount: 2`, `evidenceLifecycleIntake.status: intake_ready`, `observationStatus: contract_observed_preexecution`, `claimContractPresent: true`, and `executionScope: contract_only_no_provider_execution`.
- X7-J intake artifact showed `executionEligibility: not_executable_precutover`.
- Downstream execution flags remained false for Query Planning, Source Acquisition, provider network, parser, EvidenceCorpus, report, and verdict generation.
- The direct question no longer returned hidden Claim Understanding `blockedReason: no_valid_claim`.

## Provenance / Package Checkpoint Failure

The job cannot be accepted as a passing X7-N-C gate because the package required clean worktree status immediately before submission and immediately after artifact inspection. The pre-submission clean checkpoint passed; the post-inspection checkpoint failed when unrelated PipelineV1 archive-cleanup docs reappeared in the working tree.

Deputy review disposition from the running session:

- Architect reviewer: classify as package checkpoint failure, not runtime revision failure; do not submit a second X7-N-C job.
- Code/package reviewer: classify as `PROVENANCE_CONTAMINATED_FUNCTIONAL_OBSERVATION`.
- Security/runtime reviewer: hidden/public behavior looked fail-closed; package pass still fails on checkpoint hygiene.

## Classification

`PROVENANCE_CONTAMINATED_FUNCTIONAL_OBSERVATION`.

This is not `PASS_X7_N_C`. It is narrow functional evidence that the X7-M direct-question repair can produce accepted hidden Claim Understanding output for the legal/fair-trial canary through the product V2 route while public output remains pre-cutover blocked. It does not unlock any downstream execution, live-job expansion, public V2 behavior, parser work, or V1 cleanup.

## Next Safe Step

Do not rerun X7-N-C. If clean legal-question smoke evidence is still needed, first isolate the unrelated PipelineV1 archive cleanup in its own docs/governance package or stash, then draft a new reviewed X7-N-D package for exactly one clean legal-question rerun. Otherwise continue the V2 implementation plan only under a fresh reviewed source/package gate.
