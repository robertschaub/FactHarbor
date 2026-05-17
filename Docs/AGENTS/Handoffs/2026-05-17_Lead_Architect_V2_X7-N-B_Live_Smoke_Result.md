---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n-b, live-smoke, result, route-repair]
files_touched:
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N-B Live-Smoke Result

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N-B Post-Route-Repair Live-Smoke Result

**Task:** Execute the reviewed one-job X7-N-B live smoke and record the result.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-N-B passed its exact route-repair smoke objective. It proves only that one committed/refreshed German direct-text `claimboundary-v2` job reached hidden Claim Understanding and X7-J intake without V1 fallback while public output stayed fail-closed.
**Open items:** Do not rerun X7-N, X7-N-A, or X7-N-B. Any second-canary smoke or downstream implementation needs a separate reviewed package. `Plastic recycling is pointless` remains a separate Claim Understanding policy-quality review item.
**Warnings:** X7-N-B does not approve the Bolsonaro canary, live-job expansion, Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, or V1 cleanup.
**For next agent:** Treat job `585dcad36a3044928f6c29edab0d3b86` as clean one-job route-smoke evidence only. Use a new reviewed package for any further live job or implementation slice.
**Learnings:** Not appended to `Role_Learnings.md`; this is slice-specific execution evidence.

## Runtime Refresh

- Package commit/runtime revision: `7f104139932afccfef49a3ef4ba3d97780dbfaaa`.
- Prompt hash recorded before refresh: `62DC58AAF364029F5F6E655E7A93E21E571F33765E7D8B8A83C45B2255498F8C`.
- Config/prompt reseed: `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- API health: `200`.
- Web health: `200`.
- Actual web process command line included `FH_ANALYZER_V2_SHELL='enabled'` and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME='enabled_hidden_direct_text'`.
- Worktree was clean immediately before submission and immediately after artifact inspection.

## Pre-Run Verification

- Focused X7-N-B verifier set: PASS, 12 files / 150 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: PASS, 35 files / 208 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: PASS, 74 files / 523 tests.
- `npm -w apps/web run build`: PASS; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `npm run validate:v2-gates`: PASS.
- `node scripts/validate-v2-gate-register.mjs --self-test`: PASS.
- `git diff --check`: PASS.
- `git status --short --untracked-files=all`: clean.

Admin route preflight:

- Claim Understanding artifact route unauthenticated: `401`.
- X7-J intake artifact route unauthenticated: `401`.
- Claim Understanding route unknown ledger with admin key: `200`, `artifactCount: 0`, internal-only visibility.
- X7-J intake route unknown ledger with admin key: `404`, `Cache-Control: no-store`, internal-only visibility.

## Live Job

- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`.
- Job id: `585dcad36a3044928f6c29edab0d3b86`.
- Ledger id: `585dcad36a3044928f6c29edab0d3b86:precutover-observability`.
- First preparation event: `Preparing input (pipeline: claimboundary-v2)`.
- Final status: `SUCCEEDED`, progress `100`.
- Stored variant: `claimboundary-v2`.
- Created hash: `7f104139932afccfef49a3ef4ba3d97780dbfaaa`.
- Executed hash: `7f104139932afccfef49a3ef4ba3d97780dbfaaa`.

## Artifact And Public Checks

- Public job read without admin key returned `200`.
- Public result stayed `_schemaVersion: 4.0.0-cb-precutover`.
- Public result stayed `meta.publicCutoverStatus: blocked_precutover`.
- Public `analysisIssueCode`: `report_damaged`.
- Non-admin public response hidden marker scan: 0 markers found.
- Claim Understanding artifact route: `200`, `artifactCount: 1`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`.
- Latest Claim Understanding artifact: `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, `schemaOutcome.status: accepted`, no blocked/damaged schema reason.
- X7-J intake artifact route: `200`, `artifactCount: 1`, `Cache-Control: no-store`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`.
- X7-J artifact: `claimUnderstanding.handoffStatus: accepted`, `selectedAtomicClaimCount: 1`, `evidenceLifecycleIntake.status: intake_ready`, `observationStatus: contract_observed_preexecution`, `claimContractPresent: true`, `executionScope: contract_only_no_provider_execution`, `executionEligibility: not_executable_precutover`.
- Downstream execution flags: `queryPlanningExecuted=false`, `sourceAcquisitionExecuted=false`, `providerNetworkExecuted=false`, `parserExecuted=false`, `evidenceCorpusCreated=false`, `reportGenerated=false`, `verdictGenerated=false`.

## Classification

`PASS_X7_N_B_ROUTE_REPAIR_SMOKE`.

This is narrow evidence that the route-selection hard-fail repair works for one committed/refreshed direct-text V2 job. It does not unlock public V2, Evidence Lifecycle execution, source acquisition, parser work, report/verdict behavior, or V1 cleanup.
