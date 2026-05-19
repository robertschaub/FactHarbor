# V2 Slice X7-W4-H Bounded Input Packet Live Result

**Date:** 2026-05-19
**Role:** Lead Developer / Captain Deputy
**Classification:** `PASS_X7_W4_H_BOUNDED_EXTRACTION_INPUT_CANARY`
**Implementation commit:** `a652fd70d7a3053ee6f57ca32659cf0e4cc5e901`
**Canary job:** `df8402362bee46daba2fe83000156b0d`
**Input:** `Using hydrogen for cars is more efficient than using electricity`
**Live-job budget:** reset/increased tranche `6`; W4-H consumed `1`; remaining `5`

## Runtime And Submission

The W4-H canary ran after clean provenance and runtime refresh from the implementation commit.

```json
{
  "git_status_clean": true,
  "head": "a652fd70d7a3053ee6f57ca32659cf0e4cc5e901",
  "api_git_sha": "a652fd70d7a3053ee6f57ca32659cf0e4cc5e901",
  "web_git_sha": "a652fd70d7a3053ee6f57ca32659cf0e4cc5e901",
  "proxy_api_git_sha": "a652fd70d7a3053ee6f57ca32659cf0e4cc5e901"
}
```

The canary was submitted once through the product API with `pipelineVariant: "claimboundary-v2"`.

```json
{
  "jobId": "df8402362bee46daba2fe83000156b0d",
  "status": "SUCCEEDED",
  "progress": 100,
  "pipelineVariant": "claimboundary-v2",
  "createdGitCommitHash": "a652fd70d7a3053ee6f57ca32659cf0e4cc5e901",
  "executedWebGitCommitHash": "a652fd70d7a3053ee6f57ca32659cf0e4cc5e901",
  "gitCommitHash": "a652fd70d7a3053ee6f57ca32659cf0e4cc5e901",
  "firstPreparationEvent": "Preparing input (pipeline: claimboundary-v2)",
  "eventCount": 9,
  "resultSchema": "4.0.0-cb-precutover",
  "publicCutoverStatus": "blocked_precutover",
  "primaryIssue": "report_damaged"
}
```

No second W4-H canary was run.

## Route Preflight

Before the canary, the W4-H internal route was checked for authenticated no-store behavior and default redaction posture.

```json
{
  "unauth_status": 401,
  "unauth_no_store": ["no-store"],
  "unknown_status": 404,
  "unknown_no_store": ["no-store"],
  "unknown_internal_only": true,
  "unknown_forbidden": true,
  "malformed_status": 400,
  "malformed_no_store": ["no-store"],
  "include_text_status": 400,
  "include_text_no_store": ["no-store"],
  "bodies_contain_inputText": false
}
```

## Hidden Chain Evidence

Ledger inspected:

```text
df8402362bee46daba2fe83000156b0d:precutover-observability
```

The hidden chain repeated the known W2/W3-B/W4-G path and added exactly one W4-H input packet.

```json
{
  "w2Status": "candidate_provider_network_completed",
  "w2RuntimeStatus": "completed_structural",
  "w2CandidateCount": 9,
  "w2TotalBytes": 14086,
  "w3bStatus": "source_material_page_summary_completed",
  "w3bRecordCount": 1,
  "w3bTextHash": "e3b89fdd919c7c7f052eb54f8f0f5b4a733215bace040882d278682584efa6bb",
  "w3bTextBytes": 613,
  "w3bProviderId": "wikimedia_core",
  "w4gStatus": "bounded_corpus_text_sidecar_created_extraction_gate_closed",
  "w4gSidecarCount": 1,
  "w4gHash": "e3b89fdd919c7c7f052eb54f8f0f5b4a733215bace040882d278682584efa6bb",
  "w4gBytes": 613,
  "w4gProviderId": "wikimedia_core",
  "w4gTextReturned": false,
  "w4hStatus": "bounded_extraction_input_packet_created_extraction_execution_closed",
  "w4hPacketCount": 1,
  "packetKind": "bounded_text_extraction_input_packet",
  "packetHash": "e3b89fdd919c7c7f052eb54f8f0f5b4a733215bace040882d278682584efa6bb",
  "packetBytes": 613,
  "packetMaxBytes": 4096,
  "packetProviderId": "wikimedia_core",
  "packetInputTextReturned": false,
  "packetTextAccess": "redacted_default_hash_length_provenance_only",
  "hashesAllEqual": true,
  "providerLineageEqual": true
}
```

Pass criteria confirmed:

- W4-H recorded exactly one `bounded_text_extraction_input_packet`.
- Packet bytes were `613`, satisfying `> 0` and `<= 4096`.
- Packet hash equaled the W4-G sidecar hash and W3-B Source Material text hash.
- Packet `providerId` equaled the W4-G sidecar `providerId`: `wikimedia_core`.
- Default W4-H route stayed hash/length/provenance-only with `inputTextReturned: false`.

## Leak And Closure Checks

The refined public leak check found no exact hidden text keys and no hidden W3/W4 status markers in public API or Web proxy responses.

```json
{
  "apiExactKeyHits": null,
  "webExactKeyHits": null,
  "apiHiddenStatusHits": null,
  "webHiddenStatusHits": null,
  "apiLength": 2240,
  "webLength": 2240
}
```

The hidden artifact checks also confirmed:

```json
{
  "packetHasExactInputTextKey": false,
  "w4hRouteHasExactInputTextKey": false,
  "w4hRouteContainsSourceTextValue": false,
  "publicSchema": "4.0.0-cb-precutover",
  "publicCutover": "blocked_precutover",
  "publicContainsSourceText": false,
  "logsContainSourceText": false,
  "extractionExecutionAuthorized": false,
  "llmExtractionCallAuthorized": false,
  "evidenceItemExtractionAuthorized": false,
  "evidenceItemCount": 0,
  "parserExecuted": false,
  "cacheRead": false,
  "cacheWrite": false,
  "storageWrite": false,
  "sourceReliabilityCalled": false,
  "reportGenerated": false,
  "verdictGenerated": false,
  "warningGenerated": false,
  "confidenceGenerated": false,
  "publicSurfaceWritten": false
}
```

## Decision

W4-H is closed as `PASS_X7_W4_H_BOUNDED_EXTRACTION_INPUT_CANARY`.

The result proves the first bounded input-packet boundary through the product route while keeping extraction execution and downstream analytical/public behavior closed.

## Still Closed

W4-H does not authorize:

- a second W4-H canary;
- extraction execution;
- EvidenceItems;
- parser execution;
- LLM extraction calls;
- report, verdict, warning, or confidence behavior;
- public behavior;
- cache, Source Reliability, or durable storage;
- retries;
- provider expansion;
- W2/W3 widening;
- ACS/direct URL behavior;
- prompt/config/model/schema edits;
- V1 work or V1 cleanup.
