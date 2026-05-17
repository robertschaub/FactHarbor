# Lead Architect Handoff: V2 X7-I Live Smoke Result

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-I Direct-Text Route B Live Smoke Result

**Package:** `Docs/WIP/2026-05-17_V2_Slice_X7-I_Direct_Text_Route_B_Live_Smoke_Execution_Package.md`
**Package commit:** `cc249312ca62b07f446b2c0e90da1be72056ccf8`
**Result:** PASS for Route B hidden runtime/fail-closed smoke only

## Summary

Executed X7-I exactly under the approved Route B package.

The smoke used two Captain-approved direct-text inputs as opaque runtime payloads. Both jobs:

- executed `claimboundary-v2`;
- ran on committed web/API revision `cc249312ca62b07f446b2c0e90da1be72056ccf8`;
- stayed on public `_schemaVersion: 4.0.0-cb-precutover`;
- kept `publicCutoverStatus: blocked_precutover`;
- returned public `UNVERIFIED` / `50` / `0` damaged V2 output;
- wrote one internal-only Claim Understanding runtime artifact in `v2_observability_ledger`;
- kept cache decision no-store with `canRead: false` and `canWrite: false`;
- exposed no hidden runtime values publicly.

This proves only hidden Claim Understanding runtime continuity and fail-closed public behavior. It does not prove report quality, verdict correctness, evidence sufficiency, source reliability, public readiness, parser readiness, or downstream Evidence Lifecycle readiness.

## Pre-Run Verification

Passed before live jobs:

- Focused X7-I verifier: 15 files / 136 tests.
- Analyzer V2 runtime slice: 34 files / 201 tests.
- Analyzer V2 slice: 73 files / 510 tests.
- `npm -w apps/web run build`.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `git diff --check`.
- `git status --short --untracked-files=all` clean.

Runtime refresh:

- stopped local services with `scripts/stop-services.ps1`;
- started API and web from `C:\DEV\FactHarbor`;
- web runtime env included `FH_ANALYZER_V2_SHELL=enabled` and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`;
- API `/version` and web `/api/version` both reported `cc249312ca62b07f446b2c0e90da1be72056ccf8`.

Admin-only artifact route verifier:

- unauthenticated request returned `401`;
- authenticated request returned `visibility: internal_admin_only` and `publicPointerExposure: forbidden`.

## Job Results

### Job 1

- Job id: `8af2b1970bf14e0a8e316f15a299e51f`
- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- Status: `SUCCEEDED`
- Pipeline variant: `claimboundary-v2`
- Creation/runner commit: `cc249312ca62b07f446b2c0e90da1be72056ccf8`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public verdict-like output: `UNVERIFIED`, truth `50`, confidence `0`
- Public warnings: `report_damaged` blocking/error and `claim_preparation_integrity_event` admin-only/info

Hidden artifact:

- Ledger id: `8af2b1970bf14e0a8e316f15a299e51f:precutover-observability`
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
- Tokens: `3502` input, `1250` output, `4752` total
- Duration: `7993 ms`

### Job 2

- Job id: `c44eb9273946488897e26eb7643d2406`
- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Status: `SUCCEEDED`
- Pipeline variant: `claimboundary-v2`
- Creation/runner commit: `cc249312ca62b07f446b2c0e90da1be72056ccf8`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public verdict-like output: `UNVERIFIED`, truth `50`, confidence `0`
- Public warnings: `report_damaged` blocking/error and `claim_preparation_integrity_event` admin-only/info

Hidden artifact:

- Ledger id: `c44eb9273946488897e26eb7643d2406:precutover-observability`
- Artifact count: `1`
- Visibility: `internal_admin_only`
- Public pointer exposure: `forbidden`
- Execution status: `completed`
- Input source: `direct_input`
- Gateway task: `claim_understanding_gate1`
- Gateway task status: `executable`
- Schema status: `blocked`
- Damaged reason: `null`
- Cache: `no_store_runtime_dispatch_safety`, `canRead: false`, `canWrite: false`
- Provider/model: `anthropic` / `claude-haiku-4-5-20251001`
- Tokens: `1764` input, `172` output, `1936` total
- Duration: `2058 ms`

## Public-Leak Check

The simple public serialization scan found only existing public-schema null placeholders:

- `$.reportGeneration.configSnapshotHash = null`
- `$.meta.promptContentHash = null`

No hidden runtime values were exposed: no artifact id, ledger id value, activation snapshot hash, runtime config hash value, prompt hash value, rendered prompt hash, cache-decision reason, provider telemetry object, or artifact sink marker.

## Constraints Still Active

- X3-B prompt edits remain explicitly Captain-gated.
- X5-X7 hidden harnesses are still not product-runner live-path stages.
- Source-provider/search/fetch/content-dereference/provider-network/parser execution remains blocked.
- EvidenceCorpus, EvidenceItems, report generation, meaningful V2 verdicts, confidence, cache/SR/storage, ACS/direct URL, B3 proof, 2D-C, V1 work, and V1 cleanup remain blocked.
- No broader live-job expansion is authorized by X7-I.

## Next

Commit this result handoff/status update as a focused docs package. Then select the next V2 step through deputy review. Likely candidates are either:

- a package to make the next hidden downstream stage product-observable without public exposure; or
- a non-live implementation package for the next Evidence Lifecycle stage that preserves the no-source/no-public gates.
