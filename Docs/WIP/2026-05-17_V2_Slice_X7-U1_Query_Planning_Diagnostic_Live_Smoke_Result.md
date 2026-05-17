# V2 Slice X7-U1 Query Planning Diagnostic Live-Smoke Result

**Date:** 2026-05-17
**Status:** PASS_X7_U1_DIAGNOSTIC_CAPTURED
**Owner:** Lead Developer / Captain Deputy
**Execution package:** `Docs/WIP/2026-05-17_V2_Slice_X7-U1_Query_Planning_Diagnostic_Live_Smoke_Package.md`
**Runtime commit:** `6ca35b35eb3a202c966fea504069a7abcdf071fd`
**Live job:** `83c76b93bea746e9b4848c020c8f34a1`

## 1. Purpose

X7-U1 ran the single authorized German direct-text diagnostic canary after X7-U0 added bounded admin-only Query Planning adapter diagnostics. The run was not a report-quality, truth, source-execution, public-readiness, or prompt-repair gate.

## 2. Authorized Input

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

No substitute, paraphrase, translation, retry, English canary, validation batch, or replacement job was run inside X7-U1.

## 3. Runtime And Preflight

- Package/runtime commit: `6ca35b35eb3a202c966fea504069a7abcdf071fd`.
- Worktree was clean before runtime refresh and after inspection.
- Runtime was refreshed from the committed revision.
- Exact serving-process gate proof passed:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
  - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
- `FH_API_BASE_URL` was verified without a trailing-space launcher defect.
- Hidden artifact route preflight passed:
  - unauthenticated requests rejected;
  - wrong-key requests rejected;
  - authenticated responses used `Cache-Control: no-store`.
- 60-second idle checkpoint stayed clean.

## 4. Job Result

- Job id: `83c76b93bea746e9b4848c020c8f34a1`.
- Terminal status: `SUCCEEDED`.
- First preparation event: `Preparing input (pipeline: claimboundary-v2)`.
- Created/executed web git hash: `6ca35b35eb3a202c966fea504069a7abcdf071fd`.
- Public result remained pre-cutover blocked:
  - `_schemaVersion`: `4.0.0-cb-precutover`
  - `meta.publicCutoverStatus`: `blocked_precutover`
  - analysis issue: `report_damaged`
- Public non-admin inspection found no hidden artifact markers.

## 5. Hidden Artifact Summary

Ledger id:

```text
83c76b93bea746e9b4848c020c8f34a1:precutover-observability
```

Observed internal artifacts:

| Artifact | Count | Status |
|---|---:|---|
| Claim Understanding runtime | 1 | `completed`, schema accepted |
| X7-J Evidence Lifecycle intake | 1 | `intake_ready` |
| X7-O Query Planning pre-execution observation | 1 | `structural_prerequisites_observed_not_executed_precutover` |
| X7-S Query Planning runtime | 1 | `completed`, result damaged |

Forbidden downstream/product flags remained off: source/search/fetch/parser/Source Reliability/cache/EvidenceCorpus/report/verdict/confidence/public exposure.

## 6. Adapter Diagnostics

X7-S Query Planning runtime artifact:

- runtime status: `completed`
- result status: `damaged`
- damaged reason: `schema_validation_failed`
- query entries: `0`
- source-language policy present: `false`
- source-acquisition handoff: `blocked`
- prompt content hash: `6ad2e3146bd545f280730c2391f9364e61a202f3be71bc98acf6fc466427cc2b`
- rendered prompt hash: `34d158bb9d08661bf0bdd55127e607fb303ec585f69605fb00506f7de47a3e45`
- provider/model: `anthropic` / `claude-haiku-4-5-20251001`
- token usage: 1973 input, 159 output, 2132 total
- provider duration: 1927 ms

Captured structural issues:

| Path | Code | Message |
|---|---|---|
| `integrityEvents.0.type` | `invalid_type` | `Required` |
| `integrityEvents.0.references` | `invalid_type` | `Required` |
| `integrityEvents.0` | `unrecognized_keys` | `Unrecognized key(s) in object: 'eventType'` |

## 7. Classification

Classification: `PASS_X7_U1_DIAGNOSTIC_CAPTURED`.

Reason: the live job reached product V2, Claim Understanding, X7-J, X7-O, and hidden Query Planning runtime/model invocation; public output remained blocked/pre-cutover and non-leaking; X7-U0 diagnostics captured a precise schema-output failure path without forbidden downstream execution.

## 8. Repair Recommendation

The diagnostic points to Query Planning prompt/schema contract drift:

- the strict V2 Evidence Lifecycle task-event schema requires `type`, `severity`, `message`, and `references`;
- the executable `V2_EVIDENCE_QUERY_PLANNING` prompt only describes `integrityEvents` as task events and does not spell out the event object shape;
- the provider emitted `eventType` and omitted `references`.

Recommended next slice: X7-U2 Query Planning task-event prompt contract repair. Amend the existing prompt section and focused prompt/schema/adapter tests. Do not relax the schema, normalize `eventType` in the adapter, change the model, or add a retry/repair path unless a post-prompt live validation still fails with the same class of strict-contract drift.
