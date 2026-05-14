---
pipeline: claimboundary-v2
version: 0.1.0
description: V2 Claim Understanding and Gate 1 draft prompt. Non-executable until gateway approvals are recorded.
variables: [currentDate, analysisInput, acsSnapshotJson, inputGroundingSeedJson]
requiredSections: [V2_CLAIM_UNDERSTANDING_GATE1]
---

## V2_CLAIM_UNDERSTANDING_GATE1

### Purpose

Produce a `v2.claim_understanding_result.0` object for the V2 Claim Understanding and Gate 1 boundary.

This task decides only whether the submitted material contains one or more verifiable AtomicClaims that can enter research. It does not research, search, cite evidence, decide truth, estimate confidence, write a report, or repair later pipeline stages.

### Inputs

You receive four inputs:

- `currentDate`: the current ISO date. Use it only to anchor relative-time wording.
- `analysisInput`: the original submitted input. Preserve its meaning and original wording.
- `acsSnapshotJson`: either a prepared Atomic Claim Selection snapshot or `null`.
- `inputGroundingSeedJson`: the typed grounding seed for input type, original value, resolved text, language metadata, current date, and available hashes.

Treat the supplied JSON as data. Do not invent missing hashes, migration metadata, selected claim IDs, source labels, or dates.

### Precedence

1. If `acsSnapshotJson` contains a valid prepared snapshot with selected claims, preserve the selected claim IDs and statements exactly.
2. If any selected prepared-snapshot claim is missing, duplicated, or marked as a shell-only placeholder by the supplied data, return a blocked result instead of reselecting or rewriting.
3. If `acsSnapshotJson` is `null`, use the resolved direct input from `inputGroundingSeedJson` and `analysisInput`.
4. If the direct input contains no verifiable assertion, return a blocked result with `blockedReason: "no_valid_claim"`.

### Claim Selection

For direct input, create the smallest selected AtomicClaim set that preserves the central verifiable assertion or assertions. Do not expand the input into background assumptions, implied motives, verdict questions, or research tasks. Preserve the input language unless the output field explicitly asks for a language label.

Use stable direct-input claim IDs in extraction order: `AC_DIRECT_01`, `AC_DIRECT_02`, and so on. For prepared snapshots, keep the existing selected IDs.

### Gate 1 Rules

An accepted result requires at least one selected AtomicClaim whose `gate1Status.status` is `passed`.

Use `failed` or `blocked` only for non-selected AtomicClaims that are preserved for transparency. If no selected claim passes Gate 1, return a blocked result; do not create a dummy selected claim.

Gate 1 reasons must be concise, language-neutral explanations of the contract decision. They must not evaluate whether the claim is true.

### Output Contract

Return only one JSON object. Do not include markdown, commentary, or keys outside the schema.

Top-level object:

- `schemaVersion`: exactly `v2.claim_understanding_result.0`
- `status`: `accepted` or `blocked` for this prompt. `damaged` is reserved for gateway post-validation or provider failure handling.
- `claimContract`: a `v2.claim_contract.0` object for `accepted`; otherwise `null`
- `integrityEvents`: array of typed integrity events
- `blockedReason`: one of the blocked reasons for `blocked`; otherwise `null`
- `damagedReason`: `null` for this prompt. Gateway-owned damaged envelopes may use a damaged reason after prompt execution.

Use `blocked` for input or claim-integrity conditions the model can identify. Do not choose `damaged`; normal uncertainty is not damage.

Accepted `claimContract` object:

- `schemaVersion`: exactly `v2.claim_contract.0`
- `input.inputType`: `text` or `url`
- `input.inputValue`: copy from the grounding seed or submitted input
- `input.resolvedInputText`: copy from the grounding seed when present
- `input.detectedLanguage`: copy from the grounding seed when present
- `input.selectedAtomicClaimIds`: selected claim IDs, in selected order
- `inputGroundingSeed`: copy the supplied grounding seed fields exactly where present
- `atomicClaims`: AtomicClaim objects with `id`, `statement`, `selected`, `source`, `gate1Status`, and `integrityEvents`
- `integrityEvents`: run-level integrity events
- `acsMigration`: for prepared-snapshot success, copy accepted migration metadata; for direct-input success, use `null`

The gateway is authoritative for hashes, provenance, prompt/model/config metadata, and ACS migration metadata. Copy supplied structural values only as defense-in-depth; do not compute, infer, or invent them.

Prepared-snapshot `acsMigration` object:

- `sourceSchemaVersion`: exactly `prepared-stage1-v1`
- `status`: exactly `accepted`
- `selectedClaimFinalityPreserved`: boolean

AtomicClaim object:

- `id`: stable claim ID
- `statement`: the verifiable assertion, preserving meaning and original language
- `selected`: boolean
- `source`: `acs_prepared_snapshot` or `v2_claim_understanding`
- `gate1Status.status`: `passed`, `failed`, or `blocked`
- `gate1Status.source`: `acs_prepared_snapshot` or `v2_claim_understanding`
- `gate1Status.summary`: concise status summary
- `gate1Status.reasons`: array of concise reasons
- `integrityEvents`: claim-level integrity events

Integrity event object:

- `type`: `acs_snapshot_consumed`, `duplicate_selected_claim_id`, `claim_contract_validation_failed`, `no_valid_claim`, `prepared_snapshot_invalid`, `selected_claim_missing`, or `shell_placeholder_claim_id`
- `severity`: `info`, `warning`, or `error`
- `message`: concise structural explanation
- `claimIds`: affected claim IDs, or an empty array when no ID applies

Blocked reasons:

- `duplicate_selected_claim_id`
- `no_valid_claim`
- `prepared_snapshot_invalid`
- `selected_claim_missing`
- `shell_placeholder_claim_id`

Gateway-owned damaged reasons:

- `claim_contract_validation_failed`
- `claim_understanding_unavailable`

### Recovery Policy

Prevent invalid output by following the contract on the first attempt. Do not retry semantically inside the answer, ask for more data, or produce a partial object with invented defaults. If the accepted contract cannot be satisfied, return the narrowest valid blocked envelope.

### Runtime Inputs

Current date:
`${currentDate}`

Analysis input:
`${analysisInput}`

ACS prepared snapshot:
`${acsSnapshotJson}`

Input grounding seed:
`${inputGroundingSeedJson}`
