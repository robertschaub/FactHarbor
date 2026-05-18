# Lead Developer Handoff - V2 X7-W4-F Product-Route Observability Live Canary Result

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Model:** Codex (GPT-5.5)
**Status:** `PASS_X7_W4_F_PRODUCT_ROUTE_OBSERVABILITY_CANARY`
**Implementation commit:** `3c1a6a2cbd31a3c33206b18b6731389fbfb05297`
**Source package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-F_Product_Route_Observability_Canary_Package.md`

## Task

Run exactly one approved W4-F product-route observability canary after restoring clean provenance, refreshing runtime from the accepted W4-F implementation commit, and passing route/runtime preflight.

## Provenance And Preflight

- Worktree was clean before runtime refresh and submission.
- API runtime reported git `3c1a6a2cbd31a3c33206b18b6731389fbfb05297`.
- Web runtime reported git `3c1a6a2cbd31a3c33206b18b6731389fbfb05297`.
- Runner route preflight returned `400 Missing jobId` with the runner key.
- W4-F artifact route preflight passed:
  - unauthenticated existing/missing ledger request: `401`, `Cache-Control: no-store`;
  - authenticated missing ledger request: `404`, `Cache-Control: no-store`, `internal_admin_only` / `forbidden`;
  - authenticated malformed ledger request: `400`, `Cache-Control: no-store`;
  - authenticated success after canary: `200`, `Cache-Control: no-store`.

## Canary Result

- Result classification: `PASS_X7_W4_F_PRODUCT_ROUTE_OBSERVABILITY_CANARY`
- Job id: `cd9963e27a62444e80ee1305fa4f6f94`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline variant: `claimboundary-v2`
- First preparation event: `Preparing input (pipeline: claimboundary-v2)`
- Status: `SUCCEEDED`
- Created git: `3c1a6a2cbd31a3c33206b18b6731389fbfb05297`
- Executed git: `3c1a6a2cbd31a3c33206b18b6731389fbfb05297`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public issue: `report_damaged`
- Public hidden-marker leak check: passed for W4-C/W4-D/W4-E/W4-F markers.

## Hidden Artifact Evidence

All artifacts were present on ledger `cd9963e27a62444e80ee1305fa4f6f94:precutover-observability`.

- W2: `candidate_provider_network_completed`, `completed_structural`, `3` provider attempts, `3` network attempts, `9` total hidden candidates, `14082` total bytes.
- W3-A: `source_candidate_preview_materialized`, `9` previews, `9` materialized, `0` partial.
- W3-B: `source_material_page_summary_completed`, `not_stopped`, `1` attempted fetch, `1` bounded hidden Source Material record.
- W4-A: `source_material_structurally_admissible_evidence_corpus_gate_closed`, `not_stopped`, `1` admitted Source Material record, `evidenceCorpusBuildAuthorized: false`, `extractionInput: null`, `evidenceItems: []`.
- W4-F/W4-C: `source_material_admitted_to_corpus_input_gate_closed`, `not_stopped`, `evidenceCorpus: null`, `extractionInput: null`, `evidenceItems: []`.
- W4-F/W4-D: `evidence_corpus_shell_created_extraction_gate_closed`, `not_stopped`, `EvidenceCorpus.kind: "shell_only"`, `corpusTextAccess: "closed"`, `semanticExtractionAuthorized: false`, `evidenceItemExtractionAuthorized: false`.
- W4-F/W4-E: `extraction_denied_shell_only`, `shell_only_corpus`, `extractionInput: null`, `evidenceItems: []`.

Closed W4-F execution flags were all false:

- `sourceTextAuthorized`
- `extractionInputCreated`
- `evidenceItemGenerated`
- `parserExecuted`
- `cacheRead`
- `cacheWrite`
- `storageWrite`
- `sourceReliabilityCalled`
- `reportGenerated`
- `verdictGenerated`
- `warningGenerated`
- `confidenceGenerated`
- `publicSurfaceWritten`

## Budget

The W4-F canary consumed 1 job from the 4-job tranche. Remaining live-job budget: `3`.

## Warnings

No second W4-F canary is authorized. This pass proves product-route observability of the hidden W3-B -> W4-A -> W4-C -> W4-D -> W4-E chain only. It does not authorize source text authorization, extraction input, EvidenceItems, parser execution, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2 endpoint migration, ACS/direct URL, V1 work, or V1 cleanup.

## For Next Agent

Treat W4-F as closed for the approved observability gate. The next step should be a reviewed Steering decision before any positive source-text authorization, extraction input, EvidenceItems, parser work, report/verdict behavior, public behavior, provider expansion, or V1 cleanup.

## Learnings

The combined W4-F artifact is enough to prove product-route reachability across W4-C/W4-D/W4-E without multiplying route families or opening source-text/extraction semantics.
