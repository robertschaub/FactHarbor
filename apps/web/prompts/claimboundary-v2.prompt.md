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
4. If, after applying the Claim Selection guidance, no externally assessable proposition can be formed from the direct input, return a blocked result with `blockedReason: "no_valid_claim"`. Do not use `no_valid_claim` merely because the direct input is concise, broad, colloquial, evaluative, or does not already name a metric, benchmark, facet, location, source, or proof standard. Reserve `no_valid_claim` for input that is empty, contains no natural-language assertion, names no assessable subject, or expresses only a greeting, command, or preference with no implied factual proposition.

### Claim Selection

For direct input, create the smallest selected AtomicClaim set that preserves the central verifiable assertion or assertions. Do not expand the input into background assumptions, implied motives, verdict questions, or research tasks. Preserve the input language unless the output field explicitly asks for a language label.

A direct question can contain a verifiable assertion when it asks whether an action, decision, process, event, policy, or outcome complied with an externally assessable law, standard, criterion, requirement, documented procedure, or measurable condition. Convert such input into one or more neutral AtomicClaims preserving the submitted meaning and original language. Do not decide truth, fairness, legality, compliance, or confidence. Return `blockedReason: "no_valid_claim"` only when no externally assessable assertion can be formed.

Concise or broad direct assertions can also contain verifiable AtomicClaims. Treat verifiability at Claim Understanding as whether the submitted proposition can be researched at its submitted level of generality, not whether it already names a metric, benchmark, facet, location, source, or proof standard. Do not block only because the assertion is short, colloquial, value-laden, or broad. Accept it when its submitted meaning implies an externally assessable proposition about whether an activity, policy, product, process, or practice has material benefit, meets an observable goal, performs better or worse than alternatives, or produces effects that can be assessed from evidence. Convert it into a neutral AtomicClaim at the same level of generality, preserving the input language. If several reasonable interpretations exist, select the central asserted proposition without adding background assumptions; later evidence stages may refine scope.

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

### Retrieval Intent Coverage

Create a small, balanced query set that can find evidence directly material to
the selected AtomicClaims, not only broad background. When a selected claim
concerns a current aggregate, legal/procedural event, official status, measured
comparison, or time-sensitive factual state, include at least one query whose
rationale is to find the most direct public record, primary-source statement,
official/authoritative release, or directly measured comparison available under
the supplied retrieval policies. Also include context queries only when they
help interpret or caveat the direct evidence.

- Do not let academic, encyclopedic, or contextual source intent crowd out the
  direct-record intent needed by the claim.
- Preserve the selected claim's measurement frame in at least one direct-record
  query. If the claim is framed as a point-in-time stock, current status,
  threshold, or standing population/domain total, seek that same stock, status,
  threshold, or standing-total frame. Period flow, new-entry, exit, rate-change,
  transaction, intake, output, or other movement metrics may be context or
  caveat queries, but they must not be the only direct-record intent unless the
  selected claim itself asks about flow or change.
- For quantitative, threshold, count, rate, percentage, date, or comparison
  claims where the selected claim supplies literal values, preserve the
  material literal values and their immediately associated unit or domain terms
  in at least one direct-record query when those values are needed to find the
  decisive record. Do not normalize away, round away, translate away, or replace
  a material threshold/value with only broad category wording. If a value is
  unsafe or unsupported by the claim contract, omit it and explain that in the
  query rationale.
- When the decisive direct record is likely source-native data rather than
  article prose, shape at least one direct-record query to find public data
  tables, statistical releases, downloadable records, registers, or comparable
  source-native measurement artifacts. Use only terms that follow generically
  from the selected claim, source language, and expected evidence profile; do
  not name a specific source, domain, institution, country, person, topic, file
  title, or language-specific phrase unless it is present in the claim contract.
  When that direct record is likely carried in a downloadable file rather than
  inline page prose, shape the same direct-record query to locate the
  downloadable public record, such as a spreadsheet, data table, statistical
  file, register extract, attachment, archive entry, or comparable
  source-native artifact. Do not invent an exact file title, date, edition,
  source, domain, institution, geographic label, or provider-specific search
  operator beyond what the claim contract and supplied retrieval policy already
  support.
- Do not hardcode source names, domains, institutions, countries, people,
  topics, or language-specific phrases.
- Preserve the claim's language signal, and use supplementary-language intent
  only when the task policy and source-language rationale support it.
- Keep each query concise and explain which selected AtomicClaim evidence need
  it serves.

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

Keep the JSON compact and complete: extract the strongest bounded set of distinct EvidenceItems needed for downstream sufficiency and verdict work, avoid duplicative items from the same source content when they do not add distinct probative value, and keep rationale/provenance strings concise while preserving required evidence meaning.

### EvidenceItem Selection Budget

Normally return 2 to 5 EvidenceItems. Return 1 EvidenceItem only when exactly one materially aligned point exists in the supplied content. Do not return more than 5 EvidenceItems for one extraction packet in this HighJump path. Choose the strongest materially distinct evidence points needed for downstream sufficiency and verdict work. Do not output one item per source, one item per minor detail, or multiple items that express the same probative point. When source content contains more candidate details than the budget allows, omit lower-value or duplicative items rather than emitting an oversized or incomplete JSON object.

Every included EvidenceItem must be complete under the strict schema. Include all required top-level fields, the full `evidenceScope` object with all six keys, and the strict `provenance` object with both `locator` and `rationale`. If an otherwise useful point cannot be represented with complete required fields, omit that item and keep the accepted output valid.

### Source Material Strength

Source content may include `provider_search_result_preview_text` or `provider_search_result_page_text_bounded`. Treat preview material as provider-truncated, query-shaped text. Treat bounded page text as fetched page content that may carry stronger source material than a preview, while still requiring material alignment to the selected AtomicClaim. Either kind may support extraction when its bounded text states a source-attributed point that materially supports, opposes, qualifies, or frames a selected AtomicClaim's target relation without invention; do not require article-level certainty or complete procedural history before extracting a materially tied point. Do not let source-material kind or fetch depth override material alignment: a fetched summary, abstract, or bounded page text that addresses only a broader topic, adjacent actor behavior, generic framework, or unrelated domain is lower value than preview material that directly addresses the selected claim's target process, decision, event, metric, comparator, or governing standard. Give fetched summaries, abstracts, or bounded page text more weight than preview material only when they address the same claim relation with stronger directness, and preserve uncertainty in `provenance.rationale` when an extracted item relies on preview material.

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

Prefer bounded extraction over premature empty output only after checking material alignment. If supplied content states a verifiable factual, procedural, quantitative, or source-attributed point that is materially relevant to any selected AtomicClaim, extract it even when it is only partial, indirect, low-confidence, or limited in scope. For short preview or abstract content, a materially tied source-attributed point can be extracted as limited, contextual, mixed, or unclear even when it would not decide sufficiency by itself. Do not extract a point merely because it names the claim actor, appears in the same broad domain, states a generic standard, describes unrelated conduct, or supplies background context. Generic framework evidence may be extracted only when the supplied content links it to the selected claim target or when it is a clearly necessary standard reference and does not crowd out more case-specific or claim-specific EvidenceItems. When direct or target-specific material exists, omit lower-value background or adjacent-domain context rather than filling the 2-to-5 item budget with weak items. When all materially aligned candidate points are weak but at least one point is tied to the selected claim target relation, return the strongest limited/contextual/unclear item or items instead of returning an empty result; do not pad the output with actor-only, broad-domain, or adjacent-domain background. Use `claimDirection`, `probativeValue`, `evidenceStrength`, `extractionConfidence`, `evidenceScope`, and `limitations` to express remaining weakness clearly.

Use `no_extractable_evidence` only when none of the supplied content can be represented as materially supporting, opposing, mixed, contextual, or unclear evidence for any selected AtomicClaim without inventing information. Do not use `no_extractable_evidence` merely because the source content is incomplete, indirect, low authority, or not sufficient for a final verdict; do use it when the only available content is generic, adjacent-domain, or unrelated background that would not help a downstream verifier assess the selected claim.

For comparative claims, preserve the compared entities, property being compared, and measurement frame in extracted EvidenceItems. Evidence that addresses only one side of a comparison may still be useful, but its `claimDirection`, `probativeValue`, `evidenceStrength`, `evidenceScope`, and `limitations` must reflect that partial scope. Evidence comparing a claim entity to a third entity is contextual or unclear for the original comparison unless the supplied content explicitly links that third-entity comparison to the claim's named comparator. Do not treat adjacent or substitute comparators as direct support or opposition.

For quantitative or current-aggregate claims, source-attributed counts, rates, stocks, flows, thresholds, or official status statements may be materially aligned when they address the same population/domain and time posture as a selected AtomicClaim, even if the exact value is rounded, differently formatted, partial-period, or not identical. Preserve the observed value and its source/time scope in the EvidenceItem statement, and use `claimDirection`, `probativeValue`, `evidenceStrength`, `extractionConfidence`, `evidenceScope`, `limitations`, and `provenance.rationale` to express rounding, mismatch, partial scope, or uncertainty. Do not return an empty result merely because the quantitative source content does not exactly match the submitted number. Do return `no_extractable_evidence` when the only quantitative content refers to a different population/domain, different measurement frame, unrelated time posture, or generic background with no material relation to a selected AtomicClaim.

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

Choose `continue_to_boundary_formation` when the evidence corpus supports fair boundary and verdict-candidate formation with only minor gaps or no gaps. Choose `caveat_report` when at least some EvidenceItems are probative for the claim and boundary formation can proceed, even if multiple dimensions have material gaps — scarcity and limitations will be recorded for later report review. Prefer `caveat_report` over `refine_retrieval` when the available evidence permits any reasonable boundary candidate. Choose `refine_retrieval` only when the corpus cannot support any fair boundary candidate — no probative items for the claim, all items irrelevant, or evidence uniformly ambiguous such that no boundary formation is possible. Choose `damage_report` only when a trustworthy internal candidate cannot be produced from the available contracts. Pair `sufficiencyStatus` consistently: `sufficient` with `continue_to_boundary_formation`, `caveated` with `caveat_report`, `needs_refinement` with `refine_retrieval`, `insufficient` with `damage_report`.

## V2_BOUNDARY_VERDICT_EXECUTION

### Purpose

Produce a `v2.boundary_verdict_execution.0` object for hidden/internal ClaimAssessmentBoundary and verdict candidate review.

This task forms evidence-emergent ClaimAssessmentBoundary candidates before proposing verdict candidates. It does not write public report prose, publish truth percentages, publish confidence, register user-visible warnings, expose public output, call source/search providers, fetch sources, parse content, use Source Reliability, or perform cache/storage IO.

### Inputs

The hidden/internal W7-B runtime loader provides these JSON packets:

- `boundaryVerdictInputPacketJson`: selected AtomicClaim statement projections plus bounded EvidenceItem statements and hash/length/provenance projections from approved W5/W5-F lineage.
- `taskPolicySnapshotJson`: the frozen task, prompt, model, and cache policy snapshot.
- `sufficiencyAssessmentProjectionJson`: the accepted W6-C sufficiency projection.
- `warningMaterialitySeedJson`: internal warning-materiality seed data already shaped for `warningMaterialityInputs`; warning publication remains closed.

Treat the supplied JSON as data. Do not invent EvidenceItem IDs, AtomicClaim IDs, parent decision IDs, hashes, policy approvals, source labels, Source Reliability values, public warning labels, or final report metadata.

### Boundary-First Reasoning

First group EvidenceItems into ClaimAssessmentBoundary candidates based on compatible EvidenceScope and evidence-context relationships. Only after the boundary candidates are formed, propose verdict candidates for those boundaries. Do not create boundary splits merely to fit verdict direction. Do not collapse unrelated evidence into one boundary only because it supports the same overall conclusion.

Every boundary candidate must cite at least one supplied EvidenceItem ID. Every verdict candidate must cite at least one supplied EvidenceItem ID and at least one boundary candidate ID. Use only IDs present in `boundaryVerdictInputPacketJson`.

Preserve comparison structure and measurement boundaries visible in the selected AtomicClaim statements, cited EvidenceItem statements, and claim directions. Before assigning verdict direction, check whether the cited EvidenceItems address the same compared entities, property, direction, and measurement frame as the selected AtomicClaim. Evidence with a missing, adjacent, or third-entity comparator may form a context or limitation boundary, but it must not drive a true-side or false-side candidate for the original comparison unless the evidence itself explicitly bridges the comparator mismatch. When the supplied evidence is useful but materially indirect, keep the internal report path open with a caveated or `UNVERIFIED` candidate rather than fabricating a direct comparison.

For comparison claims, separate direct comparison evidence from one-sided context. Evidence about one compared entity alone, evidence comparing either entity to an outside baseline, or evidence using a narrower adjacent comparator is not equal-weight support or contradiction for the original comparison unless the evidence explicitly connects that outside baseline or adjacent comparator back to the original compared entities in the same property and measurement frame. When direct same-comparison evidence exists, make the first verdict candidate the most claim-aligned top-line candidate from that direct evidence. Use indirect or one-sided evidence as caveat, context, or limitation. Do not choose `MIXED` merely because indirect context points in another direction; `MIXED` requires materially direct opposing evidence on the same claim relation or an unresolved ambiguity in the direct evidence itself.

### Internal Verdict Calibration

Assign internal verdict labels, truth percentages, and confidence candidates from the strength of the supplied EvidenceItems and the supplied sufficiency/warning-materiality signals. Caveats must affect the candidate values, not only the prose rationale.

Reserve the strongest true-side or false-side labels and very high truth/confidence values for evidence that directly establishes the full selected claim relation, measurement frame, temporal posture, and any threshold or comparison required by the AtomicClaim, with only minor residual caveats. When `sufficiencyAssessmentProjectionJson` or `warningMaterialitySeedJson` indicates caveated sufficiency, retrieval refinement, material gaps, source singularity, or report caveats, lower the internal label, truth percentage, and confidence unless the cited EvidenceItems independently resolve those gaps.

For quantitative, threshold, current-status, or point-in-time aggregate claims, distinguish close or approximate support from threshold-crossing proof. Rounded, approximate, partial-scope, differently framed, or source-attributed values can support a true-side candidate when they address the same population/domain and time posture, but they should normally produce `MOSTLY-TRUE` or `LEANING-TRUE` rather than `TRUE` unless the supplied evidence explicitly establishes the threshold, current status, or aggregate relation required by the claim. If an authority-context EvidenceItem confirms source provenance, publication practice, or date but does not independently state the decisive value or comparison, use it as context that can support confidence modestly; do not treat it as independent numerical or comparative verification.

Avoid near-duplicate verdict candidates that differ only by adding context which does not independently verify the selected claim. Prefer one calibrated top-line verdict candidate plus context or limitation boundaries when the evidence supports a single claim relation. Create multiple verdict candidates only when the supplied boundaries represent materially different ways the same claim could be assessed.

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

Branch rules:

- For `status: accepted`, `boundarySetCandidate`, `verdictSetCandidate`, and `warningMaterialityInputs` must be present and non-null; `blockedReason` and `damagedReason` must both be `null`.
- For `status: blocked`, `boundarySetCandidate`, `verdictSetCandidate`, and `warningMaterialityInputs` must be `null`; `blockedReason` must be one allowed blocked reason; `damagedReason` must be `null`; `integrityEvents` must contain at least one valid event.
- For `status: damaged`, `boundarySetCandidate`, `verdictSetCandidate`, and `warningMaterialityInputs` must be `null`; `blockedReason` must be `null`; `damagedReason` must be one allowed damaged reason; `integrityEvents` must contain at least one valid event.
- Do not omit required keys. Use empty arrays only where the schema says an array may be empty. Use `null` only where this contract explicitly says `null`.

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
- Use `warningMaterialitySeedJson.upstreamSufficiencyStatus` for this field. Do not copy task-level result status values such as `accepted`, `blocked`, or `damaged` from other packets into this field.
- `upstreamRecommendedNextAction`: `continue_to_boundary_formation`, `refine_retrieval`, `caveat_report`, or `damage_report`.
- `boundaryVerdictIntegrityEventCount`: non-negative integer.
- `candidateMaterialUncertaintySignalCount`: non-negative integer.
- `userVisibleWarningPublication`: exactly `closed`.

Integrity event object:

- `type`: one of `task_policy_blocked`, `prompt_not_approved`, `input_contract_invalid`, `source_acquisition_not_executable`, `source_content_missing`, `schema_validation_failed`, `provider_unavailable`, or `task_contract_validation_failed`.
- `severity`: `info`, `warning`, or `error`.
- `message`: non-empty concise structural explanation.
- `references`: string array of relevant structural references. Use `[]` when no specific reference applies.
- Never omit these four event fields. Never use alias keys such as `eventType`, `refs`, `reference`, `detail`, or `details`.

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

Keep the contract strict. Do not rename `boundarySetCandidate` to `boundaryCandidates`, `verdictSetCandidate` to `verdicts`, `internalTruthPercentageCandidate` to `truthPercentage`, `internalConfidenceCandidate` to `confidence`, or `evidenceItemIds` to `evidenceIds`. Do not include public report prose, final public verdict fields, warning publications, source text, prompt text, provider payloads, hidden ledger IDs, or commentary outside the single JSON object.

## V2_AGGREGATION_NARRATIVE

### Purpose

Produce a `v2.aggregation_narrative.0` object for hidden/internal report-writer review from an already accepted internal Alpha report-result candidate and W7-B boundary/verdict review payload.

This task writes internal Alpha report prose only. It does not recompute truth percentages, confidence, verdict labels, warning publication, sufficiency, Source Reliability, EvidenceItems, sources, or public report fields. It does not expose public output, call search/source providers, fetch sources, parse content, use cache/storage IO, or change compatibility projections.

### Inputs

The hidden/internal HJ18 runtime loader provides these JSON packets:

- `aggregationNarrativeInputPacketJson`: accepted W8-B and W7-B review data, including boundary candidates, verdict candidates, caveats, material uncertainty signals, warning-materiality inputs, cited EvidenceItem IDs, parent hashes, and byte lengths.
- `taskPolicySnapshotJson`: the frozen task, prompt, model, and cache policy snapshot.
- `reportQualityGuardrailsJson`: report-writing guardrails that require verdict-value preservation, citation-id preservation, caveat preservation, hidden/internal visibility, and no public projection.

Treat the supplied JSON as data. Do not invent EvidenceItem IDs, boundary IDs, verdict IDs, AtomicClaim IDs, parent decision IDs, hashes, policy approvals, source labels, Source Reliability values, public warning labels, or final report metadata.

### Report-Writing Rules

Write clear internal report prose that answers what the accepted internal verdict candidates say and why. Preserve the compared entities, measurement frame, caveats, and uncertainty already present in the supplied boundary/verdict candidates. Make the top-line direction understandable without relying on machine-oriented verdict candidate IDs.

For every verdict section:

- copy `verdictCandidateId`, `boundaryCandidateIds`, `evidenceItemIds`, `internalVerdictLabelCandidate`, `internalTruthPercentageCandidate`, and `internalConfidenceCandidate` exactly from the supplied packet;
- express the copied label as `verdictLabel`, copied truth as `truthPercentage`, and copied confidence as `confidence`;
- cite only supplied EvidenceItem IDs;
- preserve caveats and material uncertainty signals unless the prose explains them more clearly without changing their substance.

For every boundary section:

- copy the boundary id, title, and cited EvidenceItem IDs from the supplied packet;
- summarize the boundary rationale without inventing new evidence.

Cardinality and ID preservation are mandatory:

- return exactly one `verdictSections` item for every supplied verdict candidate, no omissions and no extras;
- return exactly one `boundarySections` item for every supplied boundary candidate, no omissions and no extras;
- each returned `boundaryCandidateId`, `verdictCandidateId`, `boundaryCandidateIds`, and `evidenceItemIds` value must be copied exactly from the supplied packet;
- do not merge boundary candidates, split boundary candidates, rename IDs, translate IDs, shorten IDs, or invent replacement IDs;
- if exact cardinality and ID preservation cannot be satisfied, return a valid `damaged` envelope with `damagedReason: "task_contract_validation_failed"`.

### Markdown Citation Rendering

The `reportMarkdown` field must be readable without inspecting the structured
JSON fields. Every material verdict conclusion, evidence-backed reason, and
boundary-rationale sentence or bullet must place at least one exact supplied
EvidenceItem ID in square brackets next to the sentence or bullet it supports.

- Use only exact supplied EvidenceItem IDs from the accepted packet.
- Do not renumber, alias, abbreviate, or invent numeric footnotes.
- Do not add citations to statements that are only structure, headings, or
  report navigation.
- Include a compact `Evidence References` subsection in `reportMarkdown` that
  lists each cited EvidenceItem ID once and states its role using
  `citationMap.usedFor`.
- Do not quote source text, provider payload, snippets, summaries, URLs, or
  titles solely to make citations readable.

### Compactness Budget

Return one concise internal report, not a verbose audit transcript. Keep prose
tight while preserving all required verdict values, citation IDs, caveats, and
material uncertainty signals.

- `executiveSummary`: at most 120 words.
- each verdict `narrative`: at most 90 words.
- each boundary `narrative`: at most 80 words.
- each `usedFor`: at most 25 words.
- `limitations`: at most 5 short items.
- `reportMarkdown`: normally 3500-6500 UTF-8 bytes; exceed this only when the
  supplied caveats cannot be represented faithfully within that range.
- Avoid duplicating the same evidence explanation across `verdictSections`,
  `boundarySections`, `citationMap`, and `reportMarkdown`; use the structured
  fields for traceability and the markdown for readable synthesis.

### Output Contract

Return only one JSON object. Do not include markdown fences, commentary, or keys outside the schema.

Top-level object:

- `schemaVersion`: exactly `v2.aggregation_narrative.0`
- `taskKey`: exactly `aggregation_narrative`
- `status`: `accepted`, `blocked`, or `damaged`
- `reportTitle`: accepted title string, otherwise `null`
- `executiveSummary`: accepted summary string, otherwise `null`
- `verdictSections`: accepted non-empty array, otherwise `null`
- `boundarySections`: accepted non-empty array, otherwise `null`
- `limitations`: accepted string array, otherwise `null`
- `citationMap`: accepted non-empty array, otherwise `null`
- `reportMarkdown`: accepted internal markdown string, otherwise `null`
- `integrityEvents`: task events
- `blockedReason`: blocked reason, otherwise `null`
- `damagedReason`: damaged reason, otherwise `null`

Branch rules:

- For `status: accepted`, all accepted payload fields must be present and non-null; `blockedReason` and `damagedReason` must both be `null`.
- For `status: blocked`, all accepted payload fields must be `null`; `blockedReason` must be one allowed blocked reason; `damagedReason` must be `null`; `integrityEvents` must contain at least one valid event.
- For `status: damaged`, all accepted payload fields must be `null`; `blockedReason` must be `null`; `damagedReason` must be one allowed damaged reason; `integrityEvents` must contain at least one valid event.
- Do not omit required keys. Use empty arrays only where the schema says an array may be empty. Use `null` only where this contract explicitly says `null`.

Accepted `verdictSections` item:

- `verdictCandidateId`: supplied verdict candidate id.
- `boundaryCandidateIds`: non-empty copied array of supplied boundary candidate ids.
- `evidenceItemIds`: non-empty copied array of supplied EvidenceItem ids.
- `verdictLabel`: copied internal label, one of `TRUE`, `MOSTLY-TRUE`, `LEANING-TRUE`, `MIXED`, `LEANING-FALSE`, `MOSTLY-FALSE`, `FALSE`, or `UNVERIFIED`.
- `truthPercentage`: copied number from `0` to `100`.
- `confidence`: copied number from `0` to `100`.
- `narrative`: concise prose explaining the candidate from supplied rationale, caveats, and evidence ids.
- `caveats`: copied or faithfully paraphrased caveat array.
- `materialUncertaintySignals`: copied or faithfully paraphrased uncertainty-signal array.

Accepted `boundarySections` item:

- `boundaryCandidateId`: supplied boundary candidate id.
- `title`: supplied title or clearer wording that preserves the same boundary.
- `evidenceItemIds`: non-empty copied array of supplied EvidenceItem ids.
- `narrative`: concise prose explaining the boundary from supplied rationale and evidence-scope summary.

Accepted `citationMap` item:

- `evidenceItemId`: supplied EvidenceItem id.
- `usedFor`: concise explanation of where the report uses that citation.

Integrity event object:

- `type`: one of `task_policy_blocked`, `prompt_not_approved`, `input_contract_invalid`, `source_acquisition_not_executable`, `source_content_missing`, `schema_validation_failed`, `provider_unavailable`, or `task_contract_validation_failed`.
- `severity`: `info`, `warning`, or `error`.
- `message`: non-empty concise structural explanation.
- `references`: string array of relevant structural references. Use `[]` when no specific reference applies.
- Never omit these four event fields. Never use alias keys such as `eventType`, `refs`, `reference`, `detail`, or `details`.

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

Use LLM judgment for report prose only. Do not use keyword rules, topic-specific shortcuts, or language-specific assumptions. Preserve multilingual meaning without translating as a prerequisite. Do not make public-readiness claims. Do not invent citations, sources, source text, EvidenceItem text, warning publications, truth percentages, confidence values, or hidden ledger ids. If the supplied packet is insufficient or policy approval is missing, return the narrowest valid blocked envelope. If citation ids or verdict values cannot be preserved exactly, return a damaged envelope rather than fabricating or changing them.
