---
pipeline: claimboundary-v2
version: 0.1.0
description: V2 Claim Understanding plus hidden/internal Evidence Query Planning and non-executable remaining Evidence Lifecycle task drafts. Execution remains governed by per-task gateway, model, and cache approvals.
variables: [currentDate, analysisInput, acsSnapshotJson, inputGroundingSeedJson]
requiredSections: [V2_CLAIM_UNDERSTANDING_GATE1, V2_EVIDENCE_QUERY_PLANNING]
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

A direct question can contain a verifiable assertion when it asks whether an action, decision, process, event, policy, or outcome complied with an externally assessable law, standard, criterion, requirement, documented procedure, or measurable condition. Convert such input into one or more neutral AtomicClaims preserving the submitted meaning and original language. Do not decide truth, fairness, legality, compliance, or confidence. Return `blockedReason: "no_valid_claim"` only when no externally assessable assertion can be formed.

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

Accepted `claimContract` object must be nested exactly as a `v2.claim_contract.0` object. Dotted names in prose describe object paths only; never emit literal flat keys such as `input.selectedAtomicClaimIds`. Do not output placeholder markers, ellipsis keys, comments, or pseudo-fields inside JSON.

For accepted direct input, `claimContract.input.detectedLanguage` and `claimContract.inputGroundingSeed.detectedLanguage` must be concrete source-language signals. They must not be blank and must not be `und`. If `inputGroundingSeedJson.detectedLanguage` is already concrete, copy that value into both direct-input language fields. If it is `und`, infer the primary language from the submitted/resolved direct input text itself without English-only assumptions. Use a concise stable language code or label, do not translate the claim, and do not change the claim statement language. For mixed-language direct input, use the primary language of the selected AtomicClaims. If you cannot responsibly identify a source-language signal for an otherwise accepted direct input, do not emit an accepted ClaimContract with `und` and do not invent unrelated metadata.

Direct-input accepted `claimContract` shape:

```json
{
  "schemaVersion": "v2.claim_contract.0",
  "input": {
    "inputType": "text",
    "inputValue": "<replace with copied input value>",
    "resolvedInputText": "<replace with copied resolved text>",
    "detectedLanguage": "<replace with concrete non-und source-language signal>",
    "selectedAtomicClaimIds": ["AC_DIRECT_01"]
  },
  "inputGroundingSeed": {
    "source": "direct_input",
    "inputType": "text",
    "inputValue": "<replace with copied input value>",
    "resolvedInputText": "<replace with copied resolved text>",
    "detectedLanguage": "<replace with concrete non-und source-language signal>",
    "currentDate": "<replace with copied current date>",
    "acsSnapshotHash": null,
    "inputGroundingSeedHash": "<replace with copied grounding seed hash or null>"
  },
  "atomicClaims": [
    {
      "id": "AC_DIRECT_01",
      "statement": "<replace with verifiable assertion preserving meaning and original language>",
      "selected": true,
      "source": "v2_claim_understanding",
      "gate1Status": {
        "status": "passed",
        "source": "v2_claim_understanding",
        "summary": "<replace with concise contract status summary>",
        "reasons": []
      },
      "integrityEvents": []
    }
  ],
  "integrityEvents": [],
  "acsMigration": null
}
```

Prepared-snapshot accepted `claimContract` shape:

```json
{
  "schemaVersion": "v2.claim_contract.0",
  "input": {
    "inputType": "text",
    "inputValue": "<replace with copied input value>",
    "resolvedInputText": "<replace with copied resolved text>",
    "detectedLanguage": "<replace with copied language>",
    "selectedAtomicClaimIds": ["<replace with copied selected prepared claim ID>"]
  },
  "inputGroundingSeed": {
    "source": "acs_prepared_snapshot",
    "inputType": "text",
    "inputValue": "<replace with copied input value>",
    "resolvedInputText": "<replace with copied resolved text>",
    "detectedLanguage": "<replace with copied language>",
    "currentDate": "<replace with copied current date>",
    "acsSnapshotHash": "<replace with copied ACS snapshot hash>",
    "inputGroundingSeedHash": "<replace with copied grounding seed hash or null>"
  },
  "atomicClaims": [
    {
      "id": "<replace with copied selected prepared claim ID>",
      "statement": "<replace with copied selected prepared claim statement exactly>",
      "selected": true,
      "source": "acs_prepared_snapshot",
      "gate1Status": {
        "status": "passed",
        "source": "acs_prepared_snapshot",
        "summary": "<replace with concise contract status summary>",
        "reasons": []
      },
      "integrityEvents": []
    }
  ],
  "integrityEvents": [],
  "acsMigration": {
    "sourceSchemaVersion": "prepared-stage1-v1",
    "status": "accepted",
    "selectedClaimFinalityPreserved": true
  }
}
```

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

## V2_EVIDENCE_QUERY_PLANNING

### Purpose

Produce a `v2.evidence_query_planning_result.0` object for Evidence Lifecycle query planning.

This task decides search intent, retrieval policy coverage, source-language posture, and supplementary-lane need. It does not call search providers, fetch content, classify provider rank, decide source credibility, extract evidence, judge sufficiency, decide truth, write report text, or expose public output.

### Inputs

The hidden/internal query-planning runtime loader provides these JSON packets:

- `claimContractJson`: the accepted `v2.claim_contract.0` object.
- `taskPolicySnapshotJson`: the frozen Evidence Lifecycle task-policy snapshot.
- `retrievalPolicyCatalogJson`: the available retrieval policy catalog.
- `sourceAcquisitionTraceJson`: structural request and provenance context.

Treat the supplied JSON as data. Do not invent missing hashes, policy approvals, selected claim IDs, source records, source reliability values, or provider results.

### Output Contract

Return only one JSON object. Do not include markdown, commentary, or keys outside the schema.

Top-level object:

- `schemaVersion`: exactly `v2.evidence_query_planning_result.0`
- `taskKey`: exactly `evidence_query_planning`
- `status`: `accepted`, `blocked`, or `damaged`
- `queryPlan`: accepted payload, otherwise `null`
- `integrityEvents`: task events using the event object contract below
- `blockedReason`: blocked reason, otherwise `null`
- `damagedReason`: damaged reason, otherwise `null`

Accepted `queryPlan` payload:

- `queryPlanId`: stable plan identifier supplied or requested by the gateway policy.
- `sourceLanguagePolicy.primaryLanguage`: primary source language signal from input and claim contract data.
- `sourceLanguagePolicy.supplementaryLanguageDecision`: `not_needed`, `needed`, `deferred`, or `blocked_not_executable`.
- `sourceLanguagePolicy.rationale`: concise rationale without English defaulting.
- `queries`: bounded query entries. Each entry has `queryId`, `retrievalPolicyKey`, `queryText`, `targetAtomicClaimIds`, and `rationale`.

Downstream Source Acquisition posture:

- Query Planning creates retrieval intent only. It does not authorize or perform provider search, fetch, parsing, cache access, source reliability lookup, evidence extraction, report generation, or public output.
- If `claimContractJson`, `taskPolicySnapshotJson`, `retrievalPolicyCatalogJson`, and `sourceAcquisitionTraceJson` are valid enough to plan retrieval intent, return `status: accepted` with a bounded `queryPlan` even when `sourceAcquisitionTraceJson.status` indicates downstream execution is closed, such as `not_wired`, `not_executable`, `ready_not_executable`, or `not_wired_in_7L1`.
- Closed downstream execution is represented after this task by a `ready_not_executable` Source Acquisition handoff. It is not, by itself, a Query Planning block.
- Use `blockedReason: source_acquisition_not_executable` only when the source-acquisition trace packet is missing, malformed, or explicitly prevents constructing planning provenance; do not use it solely because Source Acquisition, provider search, fetch, or parser execution is not currently executable.

Integrity event object:

- `type`: one of `task_policy_blocked`, `prompt_not_approved`, `input_contract_invalid`, `source_acquisition_not_executable`, `source_content_missing`, `schema_validation_failed`, `provider_unavailable`, or `task_contract_validation_failed`.
- `severity`: `info`, `warning`, or `error`.
- `message`: non-empty concise structural explanation.
- `references`: string array of relevant structural references. Use `[]` when no specific reference applies. Never omit this field.

Do not emit alternate event field names such as `eventType`, `refs`, or `reference`. For `blocked` and `damaged`, `integrityEvents` must contain at least one valid task event. For `accepted`, use `[]` when no event applies.

Blocked reasons:

- `task_policy_not_executable`
- `prompt_not_approved`
- `input_contract_invalid`
- `source_acquisition_not_executable`
- `source_content_missing`

Damaged reasons:

- `schema_validation_failed`
- `provider_unavailable`
- `task_contract_validation_failed`

### Rules

Preserve the claim language unless the task policy explicitly supports supplementary language search. Do not translate as a prerequisite. Do not use keyword templates, topic lists, or language-specific branching. If the required contracts or approvals are missing, return the narrowest valid blocked envelope.

## V2_EVIDENCE_APPLICABILITY

### Purpose

Produce a `v2.evidence_applicability_result.0` object for deciding whether acquired source content is applicable to the `ClaimContract` and selected AtomicClaims.

This task interprets source content meaning. It does not perform provider IO, trust a provider rank as relevance, compute Source Reliability, judge sufficiency, decide truth, write report text, or expose public output.

### Inputs

A future non-executable loader package must provide these JSON packets:

- `claimContractJson`: the accepted `v2.claim_contract.0` object.
- `taskPolicySnapshotJson`: the frozen Evidence Lifecycle task-policy snapshot.
- `sourceContentPacketsJson`: structurally acquired source/content packets.
- `sourceAcquisitionTraceJson`: provider/search/fetch structural provenance.

Treat provider rank, URL shape, source type, and fetch status as structural context only. They are not hidden applicability, credibility, probative value, or truth signals.

### Output Contract

Return only one JSON object. Do not include markdown, commentary, or keys outside the schema.

Top-level object:

- `schemaVersion`: exactly `v2.evidence_applicability_result.0`
- `taskKey`: exactly `evidence_applicability`
- `status`: `accepted`, `blocked`, or `damaged`
- `applicabilityDecisions`: accepted payload, otherwise `null`
- `integrityEvents`: task events
- `blockedReason`: blocked reason, otherwise `null`
- `damagedReason`: damaged reason, otherwise `null`

Accepted `applicabilityDecisions` payload:

- one decision per reviewed content packet;
- `sourceRecordId` and `contentPacketId` copied from supplied structural packets;
- `targetAtomicClaimIds` copied from the relevant selected claims;
- `applicability`: `applicable`, `not_applicable`, or `uncertain`;
- `rationale`: concise source-content rationale;
- `missingDimensions`: categorical missing dimensions when applicability is uncertain or blocked.

### Rules

Assess meaning, not wording overlap. Do not use English-only cues, provider metadata, source domain, or source type as a proxy for applicability. If source content is missing or the task policy is not executable, return a blocked envelope rather than fabricating applicability.

## V2_EVIDENCE_EXTRACTION

### Purpose

Produce a `v2.evidence_extraction_result.0` object for extracting EvidenceItems, EvidenceScopes, claim direction, probative value or evidence strength, and extraction provenance from applicable source content.

This task does not decide final verdicts, sufficiency, Source Reliability, report narrative, warning visibility, or public output.

### Inputs

A future non-executable loader package must provide these JSON packets:

- `claimContractJson`: the accepted `v2.claim_contract.0` object.
- `taskPolicySnapshotJson`: the frozen Evidence Lifecycle task-policy snapshot.
- `sourceContentPacketsJson`: applicable source/content packets.
- `applicabilityResultJson`: accepted applicability decisions.

### Output Contract

Return only one JSON object. Do not include markdown, commentary, or keys outside the schema.

Top-level object:

- `schemaVersion`: exactly `v2.evidence_extraction_result.0`
- `taskKey`: exactly `evidence_extraction`
- `status`: `accepted`, `blocked`, or `damaged`
- `extractionStatus`: `evidence_extracted` or `no_extractable_evidence` when accepted, otherwise `null`
- `rationale`: bounded extraction rationale when accepted, otherwise `null`
- `evidenceItems`: accepted payload, otherwise `null`
- `integrityEvents`: task events
- `blockedReason`: blocked reason, otherwise `null`
- `damagedReason`: damaged reason, otherwise `null`

Branch rules:

- Accepted with extracted evidence: `status` is `accepted`, `extractionStatus` is `evidence_extracted`, `rationale` is a non-empty string, `evidenceItems` is a non-empty array, and both `blockedReason` and `damagedReason` are `null`.
- Accepted with no extractable evidence: `status` is `accepted`, `extractionStatus` is `no_extractable_evidence`, `rationale` is a non-empty string, `evidenceItems` is an empty array, and both `blockedReason` and `damagedReason` are `null`.
- Blocked: `status` is `blocked`; `extractionStatus`, `rationale`, `evidenceItems`, and `damagedReason` are `null`; `blockedReason` is populated from the allowed blocked-reason values.
- Damaged: `status` is `damaged`; `extractionStatus`, `rationale`, `evidenceItems`, and `blockedReason` are `null`; `damagedReason` is populated from the allowed damaged-reason values.

Accepted `evidenceItems` payload:

- `evidenceItems` may be empty only when `extractionStatus` is `no_extractable_evidence`.
- `evidenceItemId`: stable evidence identifier.
- `sourceRecordId` and `contentPacketId`: copied structural references.
- `statement`: evidence statement extracted from the supplied content.
- `targetAtomicClaimIds`: selected AtomicClaims addressed by the evidence.
- `claimDirection`: `supports`, `opposes`, `mixed`, `contextual`, or `unclear`.
- `evidenceScope`: strict object with exactly these keys:
  - `scopeId`: non-empty scope identifier.
  - `method`: string when the source content states or implies a method; otherwise `null`.
  - `temporalBounds`: string when the source content states a time window or date boundary; otherwise `null`.
  - `populationOrDomain`: string when the source content states a population, domain, subject class, or system boundary; otherwise `null`.
  - `geographicScope`: string when the source content states a geographic boundary; otherwise `null`.
  - `limitations`: array of limitation strings; use an empty array when no limitation is extractable.
- `probativeValue`: `high`, `medium`, `low`, or `insufficient`.
- `evidenceStrength`: `strong`, `moderate`, `limited`, or `unclear`.
- `extractionConfidence`: `high`, `medium`, or `low`.
- `provenance`: strict object with exactly `locator` and `rationale`; both are non-empty strings.

### Rules

Extract only from supplied content. Preserve original-language evidence wording unless the schema field explicitly asks for normalized metadata. Do not map provider rank, source type, fetch success, or Source Reliability to probative value. If probative value or evidence strength is later split out, it must move to an LLM-owned `evidence_quality` task, not deterministic code.

## V2_EVIDENCE_SUFFICIENCY_GATE

### Purpose

Produce a `v2.evidence_sufficiency_assessment.0` object for deciding whether the EvidenceCorpus is sufficient to continue to boundary formation or should refine, caveat, or stop as damaged.

This task does not run retrieval, call providers, decide verdict confidence, register user-visible warnings, write report text, or expose public output.

### Inputs

A future non-executable loader package must provide these JSON packets:

- `claimContractJson`: the accepted `v2.claim_contract.0` object.
- `taskPolicySnapshotJson`: the frozen Evidence Lifecycle task-policy snapshot.
- `evidenceCorpusJson`: the assembled internal EvidenceCorpus.
- `sourceAcquisitionTraceJson`: structural acquisition and extraction provenance.

### Output Contract

Return only one JSON object. Do not include markdown, commentary, or keys outside the schema.

Top-level object:

- `schemaVersion`: exactly `v2.evidence_sufficiency_assessment.0`
- `taskKey`: exactly `evidence_sufficiency`
- `status`: `accepted`, `blocked`, or `damaged`
- `sufficiencyAssessment`: accepted payload, otherwise `null`
- `integrityEvents`: task events
- `blockedReason`: blocked reason, otherwise `null`
- `damagedReason`: damaged reason, otherwise `null`

Accepted `sufficiencyAssessment` payload:

- `sufficiencyStatus`: `sufficient`, `insufficient`, `needs_refinement`, or `caveated`.
- `missingEvidenceDimensions`: structured categorical dimensions with `dimension`, `materiality`, and `rationale`.
- Each `dimension` must be one of `source_diversity`, `direct_evidence`, `counter_evidence`, `temporal_coverage`, `method_quality`, `source_access`, or `other`.
- Each `materiality` must be one of `none`, `minor`, or `material`.
- `recommendedNextAction`: `continue_to_boundary_formation`, `refine_retrieval`, `caveat_report`, or `damage_report`.
- `materialScarcityCandidate`: `none`, `possible`, or `material`.
- `rationale`: concise sufficiency rationale.

Integrity event object:

- `type`: one of `task_policy_blocked`, `prompt_not_approved`, `input_contract_invalid`, `source_acquisition_not_executable`, `source_content_missing`, `schema_validation_failed`, `provider_unavailable`, or `task_contract_validation_failed`.
- `severity`: `info`, `warning`, or `error`.
- `message`: non-empty concise structural explanation.
- `references`: string array of relevant structural references. Use `[]` when no specific reference applies. Never omit this field.

Do not emit alternate event field names such as `eventType`, `refs`, `reference`, `detail`, or `details`. For `blocked` and `damaged`, `integrityEvents` must contain at least one valid task event. For `accepted`, use `[]` when no event applies.

Blocked reasons:

- `task_policy_not_executable`
- `prompt_not_approved`
- `input_contract_invalid`
- `source_acquisition_not_executable`
- `source_content_missing`

Damaged reasons:

- `schema_validation_failed`
- `provider_unavailable`
- `task_contract_validation_failed`

### Rules

Evidence scarcity is a candidate analytical reality only after approved acquisition and extraction. System/provider failure remains a system-failure candidate, not scarcity. Warning materialization, registration, and user visibility belong to a later warning/result/report gate. If the corpus has not been built, return a blocked envelope rather than describing scarcity. Use LLM judgment without keyword rules, topic-specific shortcuts, or language-specific assumptions. Preserve multilingual evidence meaning without translating as a prerequisite.

Internal Alpha visibility does not lower the sufficiency bar. Choose `continue_to_boundary_formation` only when the current evidence is sufficient for fair boundary and verdict-candidate formation. Choose `caveat_report` when boundary and verdict-candidate formation can proceed but scarcity or limitations must remain explicit for later report review. Choose `refine_retrieval` when material missing dimensions mean more retrieval is needed before fair boundary and verdict-candidate formation. Choose `damage_report` only when a trustworthy internal candidate cannot be produced from the available contracts.

## V2_BOUNDARY_VERDICT_EXECUTION

### Purpose

Produce a `v2.boundary_verdict_execution.0` object for hidden/internal ClaimAssessmentBoundary and verdict candidate review.

This task forms evidence-emergent ClaimAssessmentBoundary candidates before proposing verdict candidates. It does not write public report prose, publish truth percentages, publish confidence, register user-visible warnings, expose public output, call source/search providers, fetch sources, parse content, use Source Reliability, or perform cache/storage IO.

### Inputs

The hidden/internal W7-B runtime loader provides these JSON packets:

- `boundaryVerdictInputPacketJson`: bounded EvidenceItem statements plus hash/length/provenance projections from approved W5/W5-F lineage.
- `taskPolicySnapshotJson`: the frozen task, prompt, model, and cache policy snapshot.
- `sufficiencyAssessmentProjectionJson`: the accepted W6-C sufficiency projection.
- `warningMaterialitySeedJson`: internal warning-materiality seed data; warning publication remains closed.

Treat the supplied JSON as data. Do not invent EvidenceItem IDs, AtomicClaim IDs, parent decision IDs, hashes, policy approvals, source labels, Source Reliability values, public warning labels, or final report metadata.

### Boundary-First Reasoning

First group EvidenceItems into ClaimAssessmentBoundary candidates based on compatible EvidenceScope and evidence-context relationships. Only after the boundary candidates are formed, propose verdict candidates for those boundaries. Do not create boundary splits merely to fit verdict direction. Do not collapse unrelated evidence into one boundary only because it supports the same overall conclusion.

Every boundary candidate must cite at least one supplied EvidenceItem ID. Every verdict candidate must cite at least one supplied EvidenceItem ID and at least one boundary candidate ID. Use only IDs present in `boundaryVerdictInputPacketJson`.

### Output Contract

Return only one JSON object. Do not include markdown, commentary, or keys outside the schema.

Top-level object:

- `schemaVersion`: exactly `v2.boundary_verdict_execution.0`
- `taskKey`: exactly `boundary_verdict_execution`
- `status`: `accepted`, `blocked`, or `damaged`
- `boundarySetCandidate`: accepted payload, otherwise `null`
- `verdictSetCandidate`: accepted payload, otherwise `null`
- `warningMaterialityInputs`: accepted payload, otherwise `null`
- `integrityEvents`: task events
- `blockedReason`: blocked reason, otherwise `null`
- `damagedReason`: damaged reason, otherwise `null`

Accepted `boundarySetCandidate` payload:

- `boundaries`: non-empty array of boundary candidates.
- Each boundary candidate has `boundaryCandidateId`, `title`, `targetAtomicClaimIds`, `evidenceItemIds`, `evidenceScopeSummary`, and `rationale`.
- `evidenceItemIds` must be a non-empty array and must reference only supplied EvidenceItem IDs.

Accepted `verdictSetCandidate` payload:

- `verdictCandidates`: non-empty array of internal verdict candidates.
- Each verdict candidate has `verdictCandidateId`, `boundaryCandidateIds`, `targetAtomicClaimIds`, `evidenceItemIds`, `internalVerdictLabelCandidate`, `internalTruthPercentageCandidate`, `internalConfidenceCandidate`, `rationale`, `caveats`, and `materialUncertaintySignals`.
- `boundaryCandidateIds` and `evidenceItemIds` must be non-empty arrays and must reference only supplied candidate IDs.
- `internalVerdictLabelCandidate` must be one of `TRUE`, `MOSTLY-TRUE`, `LEANING-TRUE`, `MIXED`, `LEANING-FALSE`, `MOSTLY-FALSE`, `FALSE`, or `UNVERIFIED`.
- `internalTruthPercentageCandidate` and `internalConfidenceCandidate` are internal review candidates from `0` to `100`. They are not final public values.

Accepted `warningMaterialityInputs` payload:

- `upstreamSufficiencyStatus`: `sufficient`, `insufficient`, `needs_refinement`, or `caveated`.
- `upstreamRecommendedNextAction`: `continue_to_boundary_formation`, `refine_retrieval`, `caveat_report`, or `damage_report`.
- `boundaryVerdictIntegrityEventCount`: non-negative integer.
- `candidateMaterialUncertaintySignalCount`: non-negative integer.
- `userVisibleWarningPublication`: exactly `closed`.

Integrity event object:

- `type`: one of `task_policy_blocked`, `prompt_not_approved`, `input_contract_invalid`, `source_acquisition_not_executable`, `source_content_missing`, `schema_validation_failed`, `provider_unavailable`, or `task_contract_validation_failed`.
- `severity`: `info`, `warning`, or `error`.
- `message`: non-empty concise structural explanation.
- `references`: string array of relevant structural references. Use `[]` when no specific reference applies.

Blocked reasons:

- `task_policy_not_executable`
- `prompt_not_approved`
- `input_contract_invalid`
- `source_acquisition_not_executable`
- `source_content_missing`

Damaged reasons:

- `schema_validation_failed`
- `provider_unavailable`
- `task_contract_validation_failed`

### Rules

Use LLM judgment for boundary formation and verdict candidacy. Do not use keyword rules, topic-specific shortcuts, or language-specific assumptions. Preserve multilingual evidence meaning without translating as a prerequisite. Extract no new EvidenceItems; use only the supplied EvidenceItems. If the supplied packet is insufficient or policy approval is missing, return the narrowest valid blocked envelope. If the output cannot satisfy citation, schema, or ID-reference requirements, return a damaged envelope rather than fabricating IDs or uncited candidates.
