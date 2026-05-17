# Lead Architect Handoff: V2 X7-K Live Smoke Result

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-K Direct-Text X7-J Intake Artifact Live Smoke Result

**Package:** `Docs/WIP/2026-05-17_V2_Slice_X7-K_Direct_Text_X7J_Intake_Artifact_Live_Smoke_Execution_Package.md`
**Package commit:** `6a728471dfcd2d99d74c0c9f26a1ec8ee6dad483`
**Result:** PASS for X7-J product-internal artifact reachability and fail-closed public behavior only

## Summary

Executed X7-K exactly under the approved Route B package.

The smoke used the two Captain-approved direct-text inputs as opaque runtime payloads. Both jobs:

- executed `claimboundary-v2`;
- ran on committed web revision `6a728471dfcd2d99d74c0c9f26a1ec8ee6dad483`;
- stayed on public `_schemaVersion: 4.0.0-cb-precutover`;
- kept `publicCutoverStatus: blocked_precutover`;
- returned public `UNVERIFIED` / `50` / `0` damaged V2 output;
- wrote one internal-only Claim Understanding runtime artifact;
- wrote one internal-only X7-J Evidence Lifecycle intake artifact;
- kept X7-J intake artifacts at `executionEligibility: not_executable_precutover`;
- kept all X7-J downstream execution flags false;
- exposed no hidden runtime or X7-J artifact values publicly.

This proves only hidden direct-text runtime plumbing plus X7-J product-internal observer reachability. It does not prove report quality, verdict correctness, evidence sufficiency, source reliability, public readiness, parser readiness, Query Planning readiness, or downstream Evidence Lifecycle readiness.

## Pre-Run Verification

Passed before live jobs:

- Focused X7-K verifier: 7 files / 97 tests.
- Analyzer V2 runtime slice: 35 files / 208 tests.
- Analyzer V2 slice: 74 files / 520 tests.
- `npm -w apps/web run build`.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `git diff --check`.
- `git status --short --untracked-files=all` clean.

Runtime refresh:

- local API and web services restarted from `C:\DEV\FactHarbor`;
- web runtime env included `FH_ANALYZER_V2_SHELL=enabled` and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`;
- web `/api/version` reported `6a728471dfcd2d99d74c0c9f26a1ec8ee6dad483`;
- prompt/config reseed during build reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.

Admin route preflight:

- Claim Understanding route unauthenticated request returned `401`;
- X7-J intake route unauthenticated request returned `401`;
- Claim Understanding authenticated unknown ledger returned `200` with `artifactCount: 0`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`;
- X7-J intake authenticated unknown ledger returned `404` with `Cache-Control: no-store`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`.

## Job Results

### Job 1

- Job id: `0e3901f2c5e74af8bbde2383297d1b5e`
- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- Status: `SUCCEEDED`
- Pipeline variant: `claimboundary-v2`
- Executed web commit: `6a728471dfcd2d99d74c0c9f26a1ec8ee6dad483`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public verdict-like output: `UNVERIFIED`, truth `50`, confidence `0`
- Public warnings: `report_damaged`, `claim_preparation_integrity_event`

Claim Understanding artifact:

- Ledger id: `0e3901f2c5e74af8bbde2383297d1b5e:precutover-observability`
- Artifact count: `1`
- Visibility: `internal_admin_only`
- Public pointer exposure: `forbidden`
- Execution status: `completed`
- Input source: `direct_input`
- Gateway task: `claim_understanding_gate1`
- Gateway task status: `executable`
- Schema status: `damaged`
- Damaged reason: `claim_contract_validation_failed`
- Cache: `no_store_runtime_dispatch_safety`, `canRead: false`, `canWrite: false`
- Provider/model: `anthropic` / `claude-haiku-4-5-20251001`
- Tokens: `3502` input, `1256` output, `4758` total
- Duration: `11339 ms`
- Adapter attempts: `2`

X7-J intake artifact:

- Artifact count: `1`
- Artifact version: `v2.evidence-lifecycle.intake-artifact.x7j`
- Source: `product_v2_orchestrator_after_claim_understanding`
- Handoff status: `damaged`
- Damaged reason: `claim_contract_validation_failed`
- Intake status: `blocked`
- Intake blocked reason: `claim_understanding_damaged`
- Observation status: `blocked_preexecution`
- Execution eligibility: `not_executable_precutover`
- Downstream execution flags: all false.

### Job 2

- Job id: `7da66e060e104e88a958c858533f22c2`
- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Status: `SUCCEEDED`
- Pipeline variant: `claimboundary-v2`
- Executed web commit: `6a728471dfcd2d99d74c0c9f26a1ec8ee6dad483`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public verdict-like output: `UNVERIFIED`, truth `50`, confidence `0`
- Public warnings: `report_damaged`, `claim_preparation_integrity_event`

Claim Understanding artifact:

- Ledger id: `7da66e060e104e88a958c858533f22c2:precutover-observability`
- Artifact count: `1`
- Visibility: `internal_admin_only`
- Public pointer exposure: `forbidden`
- Execution status: `completed`
- Input source: `direct_input`
- Gateway task: `claim_understanding_gate1`
- Gateway task status: `executable`
- Schema status: `blocked`
- Blocked reason: `no_valid_claim`
- Cache: `no_store_runtime_dispatch_safety`, `canRead: false`, `canWrite: false`
- Provider/model: `anthropic` / `claude-haiku-4-5-20251001`
- Tokens: `1764` input, `145` output, `1909` total
- Duration: `1778 ms`
- Adapter attempts: `1`

X7-J intake artifact:

- Artifact count: `1`
- Artifact version: `v2.evidence-lifecycle.intake-artifact.x7j`
- Source: `product_v2_orchestrator_after_claim_understanding`
- Handoff status: `blocked`
- Blocked reason: `no_valid_claim`
- Intake status: `blocked`
- Intake blocked reason: `claim_understanding_blocked`
- Observation status: `blocked_preexecution`
- Execution eligibility: `not_executable_precutover`
- Downstream execution flags: all false.

## Public-Leak Check

The public serialization scan found no hidden runtime or X7-J artifact leakage:

- no X7-J artifact version string;
- no X7-J source string;
- no `not_executable_precutover`;
- no `contract_observed_preexecution`;
- no X7-J sink kind;
- no `:precutover-observability` ledger id marker;
- no artifact sink marker;
- no activation snapshot hash;
- no rendered prompt hash;
- no provider telemetry object.

## Interpretation

X7-K passes its narrow package goal: X7-J is product-reachable, admin-inspectable, and public-fail-closed under live direct-text jobs.

The smoke also shows a real downstream blocker: Claim Understanding still did not produce an accepted ClaimContract for either canary. Job 1 produced a damaged Claim Understanding schema outcome, and Job 2 produced a blocked `no_valid_claim` outcome. This is not an X7-K failure because X7-K did not require accepted claims, but it means deeper Evidence Lifecycle execution, Query Planning claims, and quality claims remain premature.

## Constraints Still Active

- X3-B prompt edits remain explicitly Captain-gated.
- Query Planning execution remains blocked.
- X5-X7 hidden harnesses are still not product-runner live-path stages.
- Source-provider/search/fetch/content-dereference/provider-network/parser execution remains blocked.
- EvidenceCorpus, EvidenceItems, report generation, meaningful V2 verdicts, confidence, cache/SR/storage, ACS/direct URL, B3 proof, 2D-C, V1 work, and V1 cleanup remain blocked.
- No broader live-job expansion is authorized by X7-K.

## Next

Commit this result handoff/status update as a focused docs package. Then select the next V2 step through deputy review. Recommended next decision: whether to address Claim Understanding contract quality under the existing explicit prompt-approval rules, or to continue with non-prompt structural/product observability that does not require accepted ClaimContracts.
