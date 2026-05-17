# V2 Slice X7-U2 Query Planning Task-Event Prompt Contract Live Result

**Date:** 2026-05-17
**Status:** PASS_X7_U2_SCHEMA_REPAIR_VERIFIED
**Owner:** Lead Developer / Captain Deputy
**Repair commit:** `606e776240443104f33e30a609a4a6c5098ce93c`
**Live job:** `3f75f309c9a8484381fb6c596589296c`
**Prompt hash:** `2a78ce4f36869f6099dbd1af0b4626fd08f8b4a15f6a57fdb20df256f4049478`

## 1. Purpose

This live result validates the X7-U2 prompt-contract repair after X7-U1 diagnosed Query Planning schema drift around `integrityEvents`.

The run was not a public-readiness, source-execution, report-quality, evidence-quality, truth, verdict, or confidence gate.

## 2. Runtime Preconditions

- Runtime was refreshed from commit `606e776240443104f33e30a609a4a6c5098ce93c`.
- Worktree was clean before live submission.
- Prompt/config reseed was executed before service refresh.
- Actual port-3000 process ancestry contained:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
  - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
- `FH_API_BASE_URL` launcher assignment was verified without the previous trailing-space defect.
- Hidden-route auth preflight showed unauthenticated and wrong-key requests rejected. Empty authenticated ledgers were route-reachable.
- A 60-second idle checkpoint stayed clean.

## 3. Job Summary

- Job id: `3f75f309c9a8484381fb6c596589296c`.
- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`.
- Terminal status: `SUCCEEDED`.
- First preparation event: `Preparing input (pipeline: claimboundary-v2)`.
- Created/executed web git hash: `606e776240443104f33e30a609a4a6c5098ce93c`.
- Public result remained:
  - `_schemaVersion`: `4.0.0-cb-precutover`
  - `meta.publicCutoverStatus`: `blocked_precutover`
  - analysis issue: `report_damaged`
- Public non-admin hidden-marker scan found zero hidden markers.

## 4. Hidden Artifact Summary

Ledger id:

```text
3f75f309c9a8484381fb6c596589296c:precutover-observability
```

Observed artifacts:

| Artifact | Count | Status |
|---|---:|---|
| Claim Understanding runtime | 1 | `completed`, schema accepted |
| X7-J Evidence Lifecycle intake | 1 | `intake_ready` |
| X7-O Query Planning pre-execution observation | 1 | `structural_prerequisites_observed_not_executed_precutover`, source language present |
| X7-S Query Planning runtime | 1 | `completed`, result blocked |

Query Planning runtime artifact:

- runtime status: `completed`
- result status: `blocked`
- blocked reason: `source_acquisition_not_executable`
- damaged reason: `null`
- source-acquisition handoff: `blocked` / `query_planning_not_accepted`
- query entries: `0`
- source-language policy: `null`
- prompt content hash: `2a78ce4f36869f6099dbd1af0b4626fd08f8b4a15f6a57fdb20df256f4049478`
- rendered prompt hash: `63e904d3e3b48cd04fc1dbf4c91d7cb1eac31b79aba5f08be64af6758b8afff2`
- provider/model: `anthropic` / `claude-haiku-4-5-20251001`
- token usage: 2165 input, 201 output, 2366 total
- duration: 1924 ms

Adapter attempt diagnostics:

| Attempt | Status | Failure category | Issue count |
|---:|---|---|---:|
| 1 | `accepted` | `none` | 0 |

Forbidden downstream/product flags remained off: source/search/fetch/parser/Source Reliability/cache/EvidenceCorpus/report/verdict/confidence/public exposure.

## 5. Classification

Classification: `PASS_X7_U2_SCHEMA_REPAIR_VERIFIED`.

Reason: the live provider attempt accepted the repaired Query Planning schema contract on the new prompt hash, with no `eventType`/`references` schema failure and no adapter issues. The remaining `blocked` result is a separate design/gating posture: the prompt currently treats non-executable source acquisition as a reason to return a valid blocked envelope.

## 6. Follow-Up

Open design question for the next slice: should hidden Query Planning produce accepted bounded query plans while source acquisition remains non-executable, allowing the source-acquisition handoff to become `ready_not_executable`, or should it continue returning `blocked/source_acquisition_not_executable` until source acquisition execution opens?

This is separate from PI-005. Do not change that posture without a reviewed package because it affects stage-boundary semantics and the source-acquisition handoff path.
