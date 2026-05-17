---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n-d, live-smoke, legal-question, claim-understanding, pass]
files_touched:
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-D_Live_Smoke_Result.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N-D Live-Smoke Result

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N-D Live-Smoke Result

**Task:** Execute and record the reviewer-approved X7-N-D clean-provenance legal-question direct-text live smoke.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-D_Live_Smoke_Result.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-N-D is `PASS_X7_N_D` for its narrow objective: one clean-provenance legal-question direct-text job reached the product V2 route, produced accepted internal Claim Understanding and X7-J intake artifacts, and kept public output pre-cutover blocked.
**Open items:** Continue V2 implementation only under a fresh reviewed source/package gate. X7-N-D does not approve Query Planning execution, source/provider/parser execution, EvidenceCorpus/report/verdict behavior, public cutover, ACS/direct URL, 2D-C, V1 work, or V1 cleanup.
**Warnings:** Public output is still a damaged/pre-cutover V2 shell result, not a valid analysis answer. The run makes no truth/legal/fairness/evidence/report/verdict-quality claim.
**For next agent:** Treat job `fbccbbc9dc234991bb74c0990664e8ba` as the clean legal-question smoke evidence. Do not rerun X7-N-D. The next implementation step needs a separate reviewed package.
**Learnings:** The clean/idle checkpoint and explicit gate command-line proof avoided the X7-N-C provenance ambiguity; preserve that pattern for future local live-smoke packages.

## Package And Runtime

- Execution package: `Docs/WIP/2026-05-17_V2_Slice_X7-N-D_Legal_Question_Clean_Provenance_Rerun_Package.md`.
- Package commit/runtime revision: `92c9fff60e0d5f745667d793bbe149d7ef844e1f`.
- Prompt file hash: `62DC58AAF364029F5F6E655E7A93E21E571F33765E7D8B8A83C45B2255498F8C`.
- Build reseed state: `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- Web runtime was restarted with explicit process command-line gates:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
- API Swagger and web health responded before job submission.
- Admin route preflight passed after web restart.
- 60-second pre-submission clean/idle checkpoint passed.

## Verifiers

Pre-live verifier set passed:

- Focused X7-N-D verifier set: 12 files / 150 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: 35 files / 208 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: 74 files / 523 tests passed.
- `npm -w apps/web run build`: passed; prompt/config reseed unchanged.
- `npm run validate:v2-gates`: passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`: passed.
- `git diff --check`: passed.
- Worktree clean before submission, after idle checkpoint, and after artifact inspection.

## Live Job

- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Job id: `fbccbbc9dc234991bb74c0990664e8ba`.
- Ledger id: `fbccbbc9dc234991bb74c0990664e8ba:precutover-observability`.
- Job status: `SUCCEEDED`.
- Stored variant: `claimboundary-v2`.
- Result meta executed hash: `92c9fff60e0d5f745667d793bbe149d7ef844e1f`.
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

## Public Result Checks

- Public result stayed `_schemaVersion: 4.0.0-cb-precutover`.
- Public result stayed `meta.publicCutoverStatus: blocked_precutover`.
- Public result carried a blocking `report_damaged` warning explaining that V2 is still only a structural pre-cutover envelope.
- Non-admin public response hidden marker and non-null hidden-field scan passed.
- The public result is not a valid V2 analysis answer and must not be used for truth/legal/fairness/report/verdict-quality assessment.

## Hidden Artifact Checks

Claim Understanding artifact route:

- Unauthenticated real-ledger read returned `401`.
- Authenticated real-ledger read returned `200`, `artifactCount: 1`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`.
- Latest artifact: `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, `schemaOutcome.status: accepted`.
- No `blockedReason` and no `damagedReason`.
- Runtime cache posture stayed no-store/no-read/no-write: `reason: no_store_runtime_dispatch_safety`, `canRead: false`, `canWrite: false`.
- The route still lacks `Cache-Control: no-store`; this remains accepted only for this local one-job CLI/admin inspection exception.

X7-J intake artifact route:

- Unauthenticated real-ledger read returned `401`.
- Authenticated real-ledger read returned `200`, `artifactCount: 1`, `Cache-Control: no-store`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`.
- Latest artifact: `claimUnderstanding.handoffStatus: accepted`, `selectedAtomicClaimCount: 2`.
- `evidenceLifecycleIntake.status: intake_ready`.
- `evidenceLifecycleIntake.observationStatus: contract_observed_preexecution`.
- `evidenceLifecycleIntake.claimContractPresent: true`.
- `evidenceLifecycleIntake.executionScope: contract_only_no_provider_execution`.
- `evidenceLifecycleIntake.executionEligibility: not_executable_precutover`.
- Downstream execution flags stayed false: Query Planning, Source Acquisition, provider network, parser, EvidenceCorpus, report, and verdict generation.

## Classification

`PASS_X7_N_D`.

This pass proves only the X7-N-D objective: the legal-question direct-text route can produce accepted hidden Claim Understanding and X7-J intake artifacts through the product V2 route with clean provenance while public output remains pre-cutover blocked.

It does not unlock Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, or V1 cleanup.
